// ============================================================================
// VFZ Backend — Validators: Sync (Offline-First)
// ============================================================================

import { body } from 'express-validator';

const SYNC_TYPES_VALIDOS = ['passagem', 'assinatura', 'dss', 'audit'];

export const sincronizarBatchValidator = [
  body('items')
    .isArray({ min: 1, max: 50 }).withMessage('Items deve ser um array com 1 a 50 elementos'),
  body('items.*.id')
    .trim()
    .notEmpty().withMessage('ID é obrigatório em cada item')
    .isUUID(4).withMessage('ID deve ser UUID v4 válido'),
  body('items.*.type')
    .trim()
    .notEmpty().withMessage('Type é obrigatório em cada item')
    .isIn(SYNC_TYPES_VALIDOS).withMessage(`Type deve ser um dos: ${SYNC_TYPES_VALIDOS.join(', ')}`),
  body('items.*.payload')
    .notEmpty().withMessage('Payload é obrigatório em cada item')
    .isObject().withMessage('Payload deve ser um objeto'),
  body('items.*.hmac')
    .trim()
    .notEmpty().withMessage('HMAC é obrigatório em cada item')
    .isLength({ min: 16, max: 256 }).withMessage('HMAC deve ter entre 16 e 256 caracteres'),
  body('items.*.createdAt')
    .trim()
    .notEmpty().withMessage('createdAt é obrigatório em cada item')
    .isISO8601().withMessage('createdAt deve estar no formato ISO 8601'),
  body('items.*.turno')
    .optional()
    .trim()
    .isIn(['A', 'B', 'C', 'D']).withMessage('Turno deve ser A, B, C ou D'),
  body('items.*.data')
    .optional()
    .isISO8601().withMessage('Data deve estar no formato ISO 8601'),
  body('items.*.deviceId')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('deviceId deve ter no máximo 100 caracteres')
    .escape(),
  body().custom((_, { req }) => {
    const allowed = ['items'];
    const extra = Object.keys(req.body || {}).filter(k => !allowed.includes(k));
    if (extra.length > 0) {
      throw new Error(`Campos não permitidos: ${extra.join(', ')}`);
    }
    return true;
  }),
];
