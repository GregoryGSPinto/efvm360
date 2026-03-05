// ============================================================================
// VFZ Backend — Serviço de Autenticação
// bcrypt + JWT + Refresh Token rotation
// ============================================================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Usuario } from '../models';
import { generateSecureToken, hashToken } from '../utils/crypto';
import sequelize from '../config/database';
import type { JWTPayload } from '../middleware/auth';

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET é obrigatório — defina no .env ou Azure Key Vault');
if (!process.env.JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET é obrigatório — defina no .env ou Azure Key Vault');

const JWT_SECRET: string = process.env.JWT_SECRET;
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '8h';
const JWT_REFRESH_EXPIRES_IN: string = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
const LOGIN_MAX_ATTEMPTS = parseInt(process.env.LOGIN_MAX_ATTEMPTS || '5', 10);
const LOGIN_LOCKOUT_MINUTES = parseInt(process.env.LOGIN_LOCKOUT_MINUTES || '15', 10);

interface LoginResult {
  success: boolean;
  error?: string;
  code?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: ReturnType<Usuario['toSafeJSON']>;
  expiresIn?: string;
}

interface RefreshResult {
  success: boolean;
  error?: string;
  code?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: string;
}

/**
 * Realiza login com matrícula e senha
 * Inclui rate limiting por usuário, bcrypt verification, JWT generation
 */
export const login = async (
  matricula: string,
  senha: string,
  ipAddress?: string,
  userAgent?: string
): Promise<LoginResult> => {
  // Busca usuário
  const usuario = await Usuario.findOne({ where: { matricula, ativo: true } });

  // Mensagem genérica (não revela se matrícula existe)
  const ERRO_GENERICO = 'Matrícula ou senha incorretos';

  if (!usuario) {
    return { success: false, error: ERRO_GENERICO, code: 'AUTH_INVALID_CREDENTIALS' };
  }

  // Verifica lockout
  if (usuario.bloqueado_ate && new Date(usuario.bloqueado_ate) > new Date()) {
    const minutosRestantes = Math.ceil(
      (new Date(usuario.bloqueado_ate).getTime() - Date.now()) / 60000
    );
    return {
      success: false,
      error: `Conta bloqueada. Tente novamente em ${minutosRestantes} minutos.`,
      code: 'AUTH_ACCOUNT_LOCKED',
    };
  }

  // Verifica senha com bcrypt (timing-safe por design)
  const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

  if (!senhaValida) {
    // Incrementa tentativas
    const tentativas = usuario.tentativas_login + 1;
    const updates: Record<string, unknown> = { tentativas_login: tentativas };

    if (tentativas >= LOGIN_MAX_ATTEMPTS) {
      updates.bloqueado_ate = new Date(Date.now() + LOGIN_LOCKOUT_MINUTES * 60000);
      updates.tentativas_login = 0;
    }

    await usuario.update(updates);
    return { success: false, error: ERRO_GENERICO, code: 'AUTH_INVALID_CREDENTIALS' };
  }

  // Login bem-sucedido — reset tentativas
  await usuario.update({
    tentativas_login: 0,
    bloqueado_ate: null,
    ultimo_login: new Date(),
  });

  // Gera tokens
  const payload: Omit<JWTPayload, 'type'> = {
    userId: usuario.id,
    uuid: usuario.uuid,
    matricula: usuario.matricula,
    funcao: usuario.funcao,
    primaryYard: usuario.primary_yard,
  };

  const accessToken = jwt.sign(
    { ...payload, type: 'access' } as JWTPayload,
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  );

  const refreshTokenRaw = generateSecureToken();
  const refreshTokenHash = hashToken(refreshTokenRaw);

  // Calcula expiração do refresh token
  const refreshExpiry = new Date();
  const days = parseInt(JWT_REFRESH_EXPIRES_IN.replace('d', ''), 10) || 7;
  refreshExpiry.setDate(refreshExpiry.getDate() + days);

  // Salva refresh token no DB
  await sequelize.query(
    `INSERT INTO refresh_tokens (usuario_id, token_hash, device_info, ip_address, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    { replacements: [usuario.id, refreshTokenHash, userAgent || null, ipAddress || null, refreshExpiry] }
  );

  return {
    success: true,
    accessToken,
    refreshToken: refreshTokenRaw,
    user: usuario.toSafeJSON(),
    expiresIn: JWT_EXPIRES_IN,
  };
};

/**
 * Renova access token usando refresh token
 * Implementa rotation: refresh token antigo é invalidado e novo é emitido
 */
export const refreshAccessToken = async (
  refreshTokenRaw: string,
  ipAddress?: string
): Promise<RefreshResult> => {
  const tokenHash = hashToken(refreshTokenRaw);

  // Busca refresh token válido
  const [rows] = await sequelize.query(
    `SELECT rt.*, u.uuid, u.matricula, u.funcao, u.primary_yard, u.ativo, u.id as user_id
     FROM refresh_tokens rt
     JOIN usuarios u ON rt.usuario_id = u.id
     WHERE rt.token_hash = ? AND rt.revoked = 0 AND rt.expires_at > CURRENT_TIMESTAMP
     LIMIT 1`,
    { replacements: [tokenHash] }
  ) as [Array<Record<string, unknown>>, unknown];

  if (!rows || rows.length === 0) {
    return { success: false, error: 'Refresh token inválido ou expirado', code: 'AUTH_REFRESH_INVALID' };
  }

  const row = rows[0];
  if (!row.ativo) {
    return { success: false, error: 'Conta desativada', code: 'AUTH_ACCOUNT_DISABLED' };
  }

  // Revoga token atual (rotation)
  await sequelize.query(
    'UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?',
    { replacements: [tokenHash] }
  );

  // Gera novos tokens
  const payload: JWTPayload = {
    userId: row.user_id as number,
    uuid: row.uuid as string,
    matricula: row.matricula as string,
    funcao: row.funcao as string,
    primaryYard: (row.primary_yard as string) || 'VFZ',
    type: 'access',
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
  const newRefreshRaw = generateSecureToken();
  const newRefreshHash = hashToken(newRefreshRaw);

  const refreshExpiry = new Date();
  const days = parseInt(JWT_REFRESH_EXPIRES_IN.replace('d', ''), 10) || 7;
  refreshExpiry.setDate(refreshExpiry.getDate() + days);

  await sequelize.query(
    `INSERT INTO refresh_tokens (usuario_id, token_hash, ip_address, expires_at, created_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    { replacements: [row.user_id, newRefreshHash, ipAddress || null, refreshExpiry] }
  );

  return {
    success: true,
    accessToken,
    refreshToken: newRefreshRaw,
    expiresIn: JWT_EXPIRES_IN,
  };
};

/**
 * Logout — revoga todos os refresh tokens do usuário
 */
export const logout = async (userId: number): Promise<void> => {
  await sequelize.query(
    'UPDATE refresh_tokens SET revoked = 1 WHERE usuario_id = ? AND revoked = 0',
    { replacements: [userId] }
  );
};

/**
 * Alterar senha (requer senha atual)
 */
export const alterarSenha = async (
  userId: number,
  senhaAtual: string,
  novaSenha: string
): Promise<{ success: boolean; error?: string }> => {
  const usuario = await Usuario.findByPk(userId);
  if (!usuario) return { success: false, error: 'Usuário não encontrado' };

  const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha_hash);
  if (!senhaValida) return { success: false, error: 'Senha atual incorreta' };

  if (novaSenha.length < 8) return { success: false, error: 'Nova senha deve ter mínimo 8 caracteres' };

  const novoHash = await bcrypt.hash(novaSenha, BCRYPT_ROUNDS);
  await usuario.update({ senha_hash: novoHash });

  // Revoga todos os refresh tokens (força re-login em todos os dispositivos)
  await logout(userId);

  return { success: true };
};

/**
 * Cleanup: remove refresh tokens expirados (cron job)
 */
export const cleanupExpiredTokens = async (): Promise<number> => {
  const [, meta] = await sequelize.query(
    'DELETE FROM refresh_tokens WHERE expires_at < CURRENT_TIMESTAMP OR revoked = 1'
  );
  return (meta as { affectedRows?: number })?.affectedRows || 0;
};
