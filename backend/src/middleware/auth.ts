// ============================================================================
// VFZ Backend — Middleware de Autenticação JWT
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JWTPayload {
  userId: number;
  uuid: string;
  matricula: string;
  funcao: string;
  primaryYard: string;
  type: 'access' | 'refresh';
}

// Estende Request do Express com dados do usuário autenticado
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || '';

/**
 * Middleware de autenticação — verifica JWT no header Authorization
 * Formato: Authorization: Bearer <token>
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Token de autenticação não fornecido',
      code: 'AUTH_MISSING_TOKEN',
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    if (decoded.type !== 'access') {
      res.status(401).json({
        error: 'Token inválido para esta operação',
        code: 'AUTH_INVALID_TOKEN_TYPE',
      });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: 'Token expirado — use refresh token',
        code: 'AUTH_TOKEN_EXPIRED',
      });
      return;
    }
    res.status(401).json({
      error: 'Token inválido',
      code: 'AUTH_INVALID_TOKEN',
    });
  }
};

/**
 * Middleware de autorização por perfil
 * Uso: authorize('administrador', 'gestor')
 */
export const authorize = (...funcoes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado', code: 'AUTH_REQUIRED' });
      return;
    }

    // Mapeamento funcao → perfil (mesma lógica do frontend v3.3 — 8 níveis)
    const mapeamento: Record<string, string> = {
      maquinista: 'operador', operador: 'operador',
      oficial: 'oficial', oficial_operacao: 'oficial',
      inspetor: 'inspetor',
      supervisor: 'supervisor', gestor: 'supervisor',
      coordenador: 'coordenador',
      gerente: 'gerente',
      diretor: 'diretor',
      admin: 'administrador', administrador: 'administrador',
      suporte: 'suporte',
    };

    const perfil = mapeamento[req.user.funcao] || 'operador';
    const perfilHierarquia: Record<string, number> = {
      operador: 1, oficial: 1, inspetor: 2, supervisor: 3, coordenador: 4,
      gerente: 5, diretor: 6, administrador: 7, suporte: 8,
    };

    // Verifica se o perfil do usuário tem nível suficiente
    const nivelUsuario = perfilHierarquia[perfil] || 0;
    const nivelMinimo = Math.min(
      ...funcoes.map(f => perfilHierarquia[mapeamento[f] || f] || 0)
    );

    if (nivelUsuario < nivelMinimo) {
      res.status(403).json({
        error: 'Permissão insuficiente',
        code: 'AUTH_FORBIDDEN',
      });
      return;
    }

    next();
  };
};
