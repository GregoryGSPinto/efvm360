// ============================================================================
// VFZ Backend — Middleware de Segurança
// Rate Limiting, CORS, Helmet, CSP Headers
// ============================================================================

import rateLimit from 'express-rate-limit';
import cors from 'cors';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

// ── Rate Limiting Global ─────────────────────────────────────────────────
export const globalRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  message: {
    error: 'Muitas requisições — tente novamente em 15 minutos',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Rate Limiting para Login (mais restritivo) ───────────────────────────
export const loginRateLimit = rateLimit({
  windowMs: parseInt(process.env.LOGIN_LOCKOUT_MINUTES || '15', 10) * 60 * 1000,
  max: parseInt(process.env.LOGIN_MAX_ATTEMPTS || '5', 10),
  message: {
    error: 'Muitas tentativas de login — conta temporariamente bloqueada',
    code: 'LOGIN_RATE_LIMIT',
  },
  keyGenerator: (req: Request): string => {
    // Rate limit por IP + matrícula (se disponível)
    const matricula = req.body?.matricula || 'unknown';
    return `${req.ip}-${matricula}`;
  },
  standardHeaders: true,
});

// ── CORS ─────────────────────────────────────────────────────────────────
const DEFAULT_ORIGINS = [
  'http://localhost:3000',   // Vite dev (configured port)
  'http://localhost:5173',   // Vite dev (default port)
  'http://localhost:4173',   // Vite preview
  'https://efvm360.vercel.app', // Produção Vercel
];

export const corsConfig = cors({
  origin: (origin, callback) => {
    const envOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : [];
    const allowed = [...DEFAULT_ORIGINS, ...envOrigins];
    // Permitir requests sem origin (mobile apps, Postman, curl)
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} não permitida pelo CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Railway-Id', 'X-Active-Yard'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining'],
  maxAge: 86400, // 24h preflight cache
});

// ── Helmet (Security Headers) ────────────────────────────────────────────
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

// ── Request ID (rastreabilidade) ─────────────────────────────────────────
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const id = req.headers['x-request-id'] as string || 
    `vfz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.headers['x-request-id'] = id;
  res.setHeader('X-Request-ID', id);
  next();
};

// ── Sanitização básica de body ───────────────────────────────────────────
export const sanitizeBody = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    sanitizeObj(req.body);
  }
  next();
};

function sanitizeObj(obj: Record<string, unknown>): void {
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string') {
      // Remove null bytes e trim
      obj[key] = val.replace(/\0/g, '').trim();
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      sanitizeObj(val as Record<string, unknown>);
    }
  }
}
