// ============================================================================
// VFZ Backend — Validators: Auditoria
// ============================================================================

import { body, query } from 'express-validator';

const ACOES_VALIDAS = [
  'LOGIN', 'LOGIN_FALHA', 'LOGOUT', 'SENHA_ALTERADA',
  'USUARIO_CRIADO', 'USUARIO_EDITADO',
  'PASSAGEM_CRIADA', 'PASSAGEM_ASSINADA',
  'SYNC', 'SYNC_PASSAGEM',
  'INTEGRIDADE_VERIFICADA', 'INPUT_MALICIOSO',
];

export const listarAuditValidator = [
  query('matricula')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 }).withMessage('Matrícula deve ter entre 1 e 20 caracteres'),
  query('acao')
    .optional()
    .trim()
    .isIn(ACOES_VALIDAS).withMessage(`Ação deve ser uma das: ${ACOES_VALIDAS.join(', ')}`),
  query('recurso')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Recurso deve ter entre 1 e 100 caracteres'),
  query('dataInicio')
    .optional()
    .isISO8601().withMessage('Data início deve estar no formato ISO 8601 (ex: 2024-01-01)'),
  query('dataFim')
    .optional()
    .isISO8601().withMessage('Data fim deve estar no formato ISO 8601 (ex: 2024-12-31)'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 500 }).withMessage('Limit deve ser um número entre 1 e 500'),
  query('offset')
    .optional()
    .isInt({ min: 0 }).withMessage('Offset deve ser um número positivo'),
];

export const sincronizarAuditValidator = [
  body('registros')
    .isArray({ min: 1, max: 200 }).withMessage('Registros deve ser um array com 1 a 200 itens'),
  body('registros.*.matricula')
    .trim()
    .notEmpty().withMessage('Matrícula é obrigatória em cada registro')
    .isLength({ max: 20 }).withMessage('Matrícula deve ter no máximo 20 caracteres')
    .escape(),
  body('registros.*.acao')
    .trim()
    .notEmpty().withMessage('Ação é obrigatória em cada registro')
    .isLength({ max: 50 }).withMessage('Ação deve ter no máximo 50 caracteres')
    .escape(),
  body('registros.*.recurso')
    .trim()
    .notEmpty().withMessage('Recurso é obrigatório em cada registro')
    .isLength({ max: 100 }).withMessage('Recurso deve ter no máximo 100 caracteres')
    .escape(),
  body('registros.*.detalhes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Detalhes deve ter no máximo 1000 caracteres')
    .escape(),
  body('registros.*.timestamp')
    .trim()
    .notEmpty().withMessage('Timestamp é obrigatório em cada registro')
    .isISO8601().withMessage('Timestamp deve estar no formato ISO 8601'),
  body().custom((_, { req }) => {
    const allowed = ['registros'];
    const extra = Object.keys(req.body || {}).filter(k => !allowed.includes(k));
    if (extra.length > 0) {
      throw new Error(`Campos não permitidos: ${extra.join(', ')}`);
    }
    return true;
  }),
];
