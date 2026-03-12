// ============================================================================
// EFVM360 Backend — Middleware: Captura erros de validação (express-validator)
// Retorna 422 com array de { campo, mensagem }
// Loga tentativas de input malicioso no audit trail
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as auditService from '../../services/auditService';

// Padrões que indicam tentativa de ataque
const MALICIOUS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /UNION\s+SELECT/i,
  /;\s*DROP\s+/i,
  /--\s*$/,
  /\/\*.*\*\//,
  /'\s*OR\s+'1/i,
  /'\s*OR\s+1\s*=\s*1/i,
  /EXEC\s*\(/i,
  /xp_cmdshell/i,
];

function detectMaliciousInput(body: Record<string, unknown>): string[] {
  const threats: string[] = [];
  const check = (obj: Record<string, unknown>, path: string) => {
    for (const [key, val] of Object.entries(obj)) {
      const fullPath = path ? `${path}.${key}` : key;
      if (typeof val === 'string') {
        for (const pattern of MALICIOUS_PATTERNS) {
          if (pattern.test(val)) {
            threats.push(`${fullPath}: ${pattern.source}`);
            break;
          }
        }
      } else if (val && typeof val === 'object' && !Array.isArray(val)) {
        check(val as Record<string, unknown>, fullPath);
      }
    }
  };
  check(body, '');
  return threats;
}

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Detecta input malicioso para audit
    const threats = detectMaliciousInput(req.body || {});

    if (threats.length > 0) {
      // Log assíncrono — nunca bloqueia a resposta
      try {
        auditService.registrar({
          matricula: req.user?.matricula || 'anonimo',
          acao: 'INPUT_MALICIOSO',
          recurso: `${req.method} ${req.originalUrl}`,
          detalhes: `Padrões detectados: ${threats.join('; ')}`,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }).catch(() => { /* silencioso */ });
      } catch {
        // auditService pode não estar disponível em testes
      }
    }

    const formatted = errors.array().map((err) => ({
      campo: 'path' in err ? err.path : 'desconhecido',
      mensagem: err.msg,
    }));

    res.status(422).json({
      error: 'Erro de validação',
      code: 'VALIDATION_ERROR',
      detalhes: formatted,
    });
    return;
  }

  next();
};
