// ============================================================================
// VFZ Backend — Validators: LGPD (Direitos do Titular)
// Rate limit específico para /lgpd/exportar: 3 req/hora por usuário
// ============================================================================

import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// Rate limit: 3 exportações por hora por usuário
export const lgpdExportRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3,
  message: {
    error: 'Limite de exportações excedido — máximo 3 por hora',
    code: 'LGPD_EXPORT_RATE_LIMIT',
  },
  keyGenerator: (req: Request): string => {
    // Rate limit por usuário autenticado (matrícula) ou IP
    return req.user?.matricula || req.ip || 'unknown';
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const anonimizarValidator = [
  body('matriculaAlvo')
    .trim()
    .notEmpty().withMessage('Matrícula do usuário a anonimizar é obrigatória')
    .isLength({ min: 4, max: 20 }).withMessage('Matrícula deve ter entre 4 e 20 caracteres')
    .escape(),
  body().custom((_, { req }) => {
    const allowed = ['matriculaAlvo'];
    const extra = Object.keys(req.body || {}).filter(k => !allowed.includes(k));
    if (extra.length > 0) {
      throw new Error(`Campos não permitidos: ${extra.join(', ')}`);
    }
    return true;
  }),
];
