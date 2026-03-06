// ============================================================================
// EFVM360 Backend — Validators: Pátios
// ============================================================================

import { body, param } from 'express-validator';

// Código de pátio: letras maiúsculas, números, hífens. Ex: "CIMA", "BAIXO", "PT-01"
const CODIGO_PATIO_REGEX = /^[A-Z0-9][A-Z0-9\-]{1,19}$/;

export const criarPatioValidator = [
  body('codigo')
    .trim()
    .notEmpty().withMessage('Código do pátio é obrigatório')
    .matches(CODIGO_PATIO_REGEX).withMessage('Código deve conter apenas letras maiúsculas, números e hífens (2-20 caracteres)')
    .escape(),
  body('nome')
    .trim()
    .notEmpty().withMessage('Nome do pátio é obrigatório')
    .isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres')
    .escape(),
  body().custom((_, { req }) => {
    const allowed = ['codigo', 'nome'];
    const extra = Object.keys(req.body || {}).filter(k => !allowed.includes(k));
    if (extra.length > 0) {
      throw new Error(`Campos não permitidos: ${extra.join(', ')}`);
    }
    return true;
  }),
];

export const atualizarPatioValidator = [
  param('codigo')
    .trim()
    .matches(CODIGO_PATIO_REGEX).withMessage('Código do pátio inválido'),
  body('nome')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Nome deve ter entre 2 e 100 caracteres')
    .escape(),
  body('ativo')
    .optional()
    .isBoolean().withMessage('Campo ativo deve ser verdadeiro ou falso'),
  body().custom((_, { req }) => {
    const allowed = ['nome', 'ativo'];
    const extra = Object.keys(req.body || {}).filter(k => !allowed.includes(k));
    if (extra.length > 0) {
      throw new Error(`Campos não permitidos: ${extra.join(', ')}`);
    }
    return true;
  }),
];
