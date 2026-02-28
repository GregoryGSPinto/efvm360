// ============================================================================
// VFZ Backend — Validators: Passagens de Serviço
// ============================================================================

import { body, param, query } from 'express-validator';

const TURNOS_VALIDOS = ['A', 'B', 'C', 'D'];
const STATUS_VALIDOS = ['rascunho', 'assinado_parcial', 'assinado_completo', 'sincronizada'];

export const salvarPassagemValidator = [
  body('uuid')
    .optional()
    .trim()
    .isUUID(4).withMessage('UUID da passagem deve ser UUID v4 válido'),
  body('cabecalho')
    .notEmpty().withMessage('Cabeçalho é obrigatório')
    .isObject().withMessage('Cabeçalho deve ser um objeto'),
  body('cabecalho.data')
    .notEmpty().withMessage('Data é obrigatória')
    .isISO8601({ strict: true, strictSeparator: true }).withMessage('Data deve estar no formato ISO 8601 (YYYY-MM-DD)')
    .toDate(),
  body('cabecalho.turno')
    .trim()
    .notEmpty().withMessage('Turno é obrigatório')
    .isIn(TURNOS_VALIDOS).withMessage(`Turno deve ser um dos: ${TURNOS_VALIDOS.join(', ')}`),
  body('cabecalho.dss')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 50 }).withMessage('DSS deve ter no máximo 50 caracteres')
    .escape(),
  body('cabecalho.horario')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('Horário deve ter no máximo 20 caracteres')
    .escape(),
  body('patioCima')
    .optional(),
  body('patioBaixo')
    .optional(),
  body('equipamentos')
    .optional(),
  body('segurancaManobras')
    .optional(),
  body('pontosAtencao')
    .optional(),
  body('intervencoes')
    .optional(),
  body('sala5s')
    .optional(),
  body('assinaturas')
    .optional()
    .isObject().withMessage('Assinaturas deve ser um objeto'),
  body('assinaturas.sai.matricula')
    .optional()
    .trim()
    .escape(),
  body('assinaturas.entra.matricula')
    .optional()
    .trim()
    .escape(),
  // Whitelist: bloqueia campos inesperados no nível raiz
  body().custom((_, { req }) => {
    const allowed = [
      'uuid', 'cabecalho', 'patioCima', 'patioBaixo', 'equipamentos',
      'segurancaManobras', 'pontosAtencao', 'intervencoes', 'sala5s', 'assinaturas',
    ];
    const extra = Object.keys(req.body || {}).filter(k => !allowed.includes(k));
    if (extra.length > 0) {
      throw new Error(`Campos não permitidos: ${extra.join(', ')}`);
    }
    return true;
  }),
];

export const uuidParamValidator = [
  param('uuid')
    .trim()
    .isUUID(4).withMessage('UUID deve ser UUID v4 válido'),
];

export const assinarPassagemValidator = [
  param('uuid')
    .trim()
    .isUUID(4).withMessage('UUID deve ser UUID v4 válido'),
  body('tipo')
    .trim()
    .notEmpty().withMessage('Tipo de assinatura é obrigatório')
    .isIn(['entrada', 'saida']).withMessage('Tipo deve ser "entrada" ou "saida"'),
  body('senha')
    .notEmpty().withMessage('Senha é obrigatória para assinar'),
  body().custom((_, { req }) => {
    const allowed = ['tipo', 'senha'];
    const extra = Object.keys(req.body || {}).filter(k => !allowed.includes(k));
    if (extra.length > 0) {
      throw new Error(`Campos não permitidos: ${extra.join(', ')}`);
    }
    return true;
  }),
];

export const listarPassagensValidator = [
  query('data')
    .optional()
    .isISO8601().withMessage('Data deve estar no formato ISO 8601'),
  query('turno')
    .optional()
    .trim()
    .isIn(TURNOS_VALIDOS).withMessage(`Turno deve ser um dos: ${TURNOS_VALIDOS.join(', ')}`),
  query('status')
    .optional()
    .trim()
    .isIn(STATUS_VALIDOS).withMessage(`Status deve ser um dos: ${STATUS_VALIDOS.join(', ')}`),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit deve ser um número entre 1 e 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 }).withMessage('Offset deve ser um número positivo'),
];
