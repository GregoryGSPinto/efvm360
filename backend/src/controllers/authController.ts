// ============================================================================
// VFZ Backend — Controller de Autenticação
// ============================================================================

import { Request, Response } from 'express';
import * as authService from '../services/authService';
import * as auditService from '../services/auditService';

export const login = async (req: Request, res: Response): Promise<void> => {
  const { matricula, senha } = req.body;

  if (!matricula || !senha) {
    res.status(400).json({ error: 'Matrícula e senha são obrigatórios', code: 'VALIDATION_ERROR' });
    return;
  }

  const result = await authService.login(
    matricula.trim(),
    senha,
    req.ip,
    req.headers['user-agent']
  );

  if (!result.success) {
    await auditService.registrar({
      matricula: matricula.trim(),
      acao: 'LOGIN_FALHA',
      recurso: 'autenticacao',
      detalhes: result.code,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.status(401).json({ error: result.error, code: result.code });
    return;
  }

  await auditService.registrar({
    matricula: matricula.trim(),
    acao: 'LOGIN',
    recurso: 'autenticacao',
    detalhes: `Login bem-sucedido | IP: ${req.ip}`,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    user: result.user,
    expiresIn: result.expiresIn,
  });
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token é obrigatório', code: 'VALIDATION_ERROR' });
    return;
  }

  const result = await authService.refreshAccessToken(refreshToken, req.ip);

  if (!result.success) {
    res.status(401).json({ error: result.error, code: result.code });
    return;
  }

  res.json({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresIn: result.expiresIn,
  });
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  await authService.logout(req.user.userId);

  await auditService.registrar({
    matricula: req.user.matricula,
    acao: 'LOGOUT',
    recurso: 'autenticacao',
    usuarioId: req.user.userId,
    ipAddress: req.ip,
  });

  res.json({ message: 'Logout realizado com sucesso' });
};

export const alterarSenha = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  const { senhaAtual, novaSenha } = req.body;

  if (!senhaAtual || !novaSenha) {
    res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    return;
  }

  const result = await authService.alterarSenha(req.user.userId, senhaAtual, novaSenha);

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  await auditService.registrar({
    matricula: req.user.matricula,
    acao: 'SENHA_ALTERADA',
    recurso: 'configuracoes',
    usuarioId: req.user.userId,
    ipAddress: req.ip,
  });

  res.json({ message: 'Senha alterada com sucesso. Realize login novamente.' });
};

export const me = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  const { Usuario } = require('../models');
  const usuario = await Usuario.findByPk(req.user.userId);
  if (!usuario) {
    res.status(404).json({ error: 'Usuário não encontrado' });
    return;
  }

  res.json({ user: usuario.toSafeJSON() });
};
