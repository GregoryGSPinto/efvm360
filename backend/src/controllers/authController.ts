// ============================================================================
// VFZ Backend — Controller de Autenticacao
// ============================================================================

import { Request, Response } from 'express';
import * as authService from '../services/authService';
import * as auditService from '../services/auditService';
import { metrics } from '../services/metricsService';

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Autenticar usuario
 *     description: |
 *       Realiza login com matricula e senha. Retorna JWT access token,
 *       refresh token e dados do usuario. Rate-limited a 5 tentativas/minuto.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login bem-sucedido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Dados de entrada invalidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Credenciais invalidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Muitas tentativas de login (rate limit)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { matricula, senha } = req.body;

    if (!matricula || !senha) {
      res.status(400).json({ error: 'Matricula e senha sao obrigatorios', code: 'VALIDATION_ERROR' });
      return;
    }

    const result = await authService.login(
      matricula.trim(),
      senha,
      req.ip,
      req.headers['user-agent']
    );

    if (!result.success) {
      metrics.incrementar('logins_falha', 1, { matricula: matricula.trim() });
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

    metrics.incrementar('logins_sucesso', 1, { matricula: matricula.trim() });

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
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao processar login' });
  }
};

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Renovar access token
 *     description: Gera um novo par de access/refresh tokens a partir de um refresh token valido.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token obtido no login
 *                 minLength: 32
 *                 maxLength: 256
 *     responses:
 *       200:
 *         description: Tokens renovados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 expiresIn:
 *                   type: number
 *       400:
 *         description: Refresh token ausente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Refresh token invalido ou expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token e obrigatorio', code: 'VALIDATION_ERROR' });
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
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao renovar token' });
  }
};

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Encerrar sessao
 *     description: Invalida o refresh token do usuario autenticado e registra a acao na auditoria.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logout realizado com sucesso
 *       401:
 *         description: Nao autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nao autenticado' });
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
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao processar logout' });
  }
};

/**
 * @openapi
 * /auth/alterar-senha:
 *   post:
 *     tags: [Auth]
 *     summary: Alterar senha do usuario autenticado
 *     description: |
 *       Altera a senha do usuario logado. Exige senha atual para confirmacao.
 *       A nova senha deve ter no minimo 8 caracteres e ser diferente da atual.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [senhaAtual, novaSenha]
 *             properties:
 *               senhaAtual:
 *                 type: string
 *                 description: Senha atual do usuario
 *               novaSenha:
 *                 type: string
 *                 description: Nova senha (min 8 caracteres)
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Senha alterada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Senha alterada com sucesso. Realize login novamente.
 *       400:
 *         description: Dados invalidos ou senha atual incorreta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Nao autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const alterarSenha = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nao autenticado' });
      return;
    }

    const { senhaAtual, novaSenha } = req.body;

    if (!senhaAtual || !novaSenha) {
      res.status(400).json({ error: 'Senha atual e nova senha sao obrigatorias' });
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
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao alterar senha' });
  }
};

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Obter dados do usuario autenticado
 *     description: Retorna os dados do perfil do usuario logado (sem informacoes sensiveis como senha).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Nao autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Usuario nao encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Nao autenticado' });
      return;
    }

    const { Usuario } = require('../models');
    const usuario = await Usuario.findByPk(req.user.userId);
    if (!usuario) {
      res.status(404).json({ error: 'Usuario nao encontrado' });
      return;
    }

    res.json({ user: usuario.toSafeJSON() });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao obter perfil' });
  }
};
