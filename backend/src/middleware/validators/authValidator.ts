// ============================================================================
// VFZ Backend — Validators: Autenticação
// ============================================================================

import { body } from 'express-validator';

// Matrícula: VALE seguido de 3-6 dígitos (ex: VALE001, VALE123456)
// Também aceita ADMIN, ANON_ prefixed (para anonimizados)
const MATRICULA_REGEX = /^(VALE\d{3,6}|ADMIN\d{3,6}|ANON_[a-f0-9]{12})$/;

const FUNCOES_VALIDAS = [
  'operador', 'maquinista', 'oficial', 'oficial_operacao',
  'inspetor', 'gestor', 'supervisor', 'coordenador',
  'administrador', 'admin',
];

const TURNOS_VALIDOS = ['A', 'B', 'C', 'D'];

export const loginValidator = [
  body('matricula')
    .trim()
    .notEmpty().withMessage('Matrícula é obrigatória')
    .matches(MATRICULA_REGEX).withMessage('Matrícula deve seguir o formato VALE seguido de 3-6 dígitos (ex: VALE001)')
    .escape(),
  body('senha')
    .notEmpty().withMessage('Senha é obrigatória')
    .isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres'),
  // Bloqueia campos não permitidos
  body().custom((_, { req }) => {
    const allowed = ['matricula', 'senha'];
    const extra = Object.keys(req.body || {}).filter(k => !allowed.includes(k));
    if (extra.length > 0) {
      throw new Error(`Campos não permitidos: ${extra.join(', ')}`);
    }
    return true;
  }),
];

export const refreshValidator = [
  body('refreshToken')
    .trim()
    .notEmpty().withMessage('Refresh token é obrigatório')
    .isLength({ min: 32, max: 256 }).withMessage('Formato de refresh token inválido'),
  body().custom((_, { req }) => {
    const allowed = ['refreshToken'];
    const extra = Object.keys(req.body || {}).filter(k => !allowed.includes(k));
    if (extra.length > 0) {
      throw new Error(`Campos não permitidos: ${extra.join(', ')}`);
    }
    return true;
  }),
];

export const alterarSenhaValidator = [
  body('senhaAtual')
    .notEmpty().withMessage('Senha atual é obrigatória'),
  body('novaSenha')
    .notEmpty().withMessage('Nova senha é obrigatória')
    .isLength({ min: 8 }).withMessage('Nova senha deve ter no mínimo 8 caracteres')
    .custom((value, { req }) => {
      if (value === req.body.senhaAtual) {
        throw new Error('Nova senha deve ser diferente da senha atual');
      }
      return true;
    }),
  body().custom((_, { req }) => {
    const allowed = ['senhaAtual', 'novaSenha'];
    const extra = Object.keys(req.body || {}).filter(k => !allowed.includes(k));
    if (extra.length > 0) {
      throw new Error(`Campos não permitidos: ${extra.join(', ')}`);
    }
    return true;
  }),
];

export const criarUsuarioValidator = [
  body('nome')
    .trim()
    .notEmpty().withMessage('Nome é obrigatório')
    .isLength({ min: 3, max: 120 }).withMessage('Nome deve ter entre 3 e 120 caracteres')
    .escape(),
  body('matricula')
    .trim()
    .notEmpty().withMessage('Matrícula é obrigatória')
    .matches(MATRICULA_REGEX).withMessage('Matrícula deve seguir o formato VALE seguido de 3-6 dígitos (ex: VALE001)')
    .escape(),
  body('senha')
    .notEmpty().withMessage('Senha é obrigatória')
    .isLength({ min: 8 }).withMessage('Senha deve ter no mínimo 8 caracteres'),
  body('funcao')
    .optional()
    .trim()
    .isIn(FUNCOES_VALIDAS).withMessage(`Função deve ser uma das: ${FUNCOES_VALIDAS.join(', ')}`),
  body('turno')
    .optional({ values: 'null' })
    .trim()
    .isIn(TURNOS_VALIDOS).withMessage(`Turno deve ser um dos: ${TURNOS_VALIDOS.join(', ')}`),
  body('horarioTurno')
    .optional({ values: 'null' })
    .trim()
    .matches(/^\d{2}:\d{2}-\d{2}:\d{2}$/).withMessage('Horário deve seguir formato HH:MM-HH:MM')
    .escape(),
  body().custom((_, { req }) => {
    const allowed = ['nome', 'matricula', 'senha', 'funcao', 'turno', 'horarioTurno'];
    const extra = Object.keys(req.body || {}).filter(k => !allowed.includes(k));
    if (extra.length > 0) {
      throw new Error(`Campos não permitidos: ${extra.join(', ')}`);
    }
    return true;
  }),
];

export const atualizarUsuarioValidator = [
  body('nome')
    .optional()
    .trim()
    .isLength({ min: 3, max: 120 }).withMessage('Nome deve ter entre 3 e 120 caracteres')
    .escape(),
  body('funcao')
    .optional()
    .trim()
    .isIn(FUNCOES_VALIDAS).withMessage(`Função deve ser uma das: ${FUNCOES_VALIDAS.join(', ')}`),
  body('turno')
    .optional({ values: 'null' })
    .trim()
    .isIn(TURNOS_VALIDOS).withMessage(`Turno deve ser um dos: ${TURNOS_VALIDOS.join(', ')}`),
  body('horarioTurno')
    .optional({ values: 'null' })
    .trim()
    .matches(/^\d{2}:\d{2}-\d{2}:\d{2}$/).withMessage('Horário deve seguir formato HH:MM-HH:MM')
    .escape(),
  body('ativo')
    .optional()
    .isBoolean().withMessage('Campo ativo deve ser verdadeiro ou falso'),
  body().custom((_, { req }) => {
    const allowed = ['nome', 'funcao', 'turno', 'horarioTurno', 'ativo'];
    const extra = Object.keys(req.body || {}).filter(k => !allowed.includes(k));
    if (extra.length > 0) {
      throw new Error(`Campos não permitidos: ${extra.join(', ')}`);
    }
    return true;
  }),
];

export { FUNCOES_VALIDAS, TURNOS_VALIDOS, MATRICULA_REGEX };
