// ============================================================================
// EFVM360 Backend — Service: Pátios
// Regras de negócio para gerenciamento de pátios
// ============================================================================

import { Patio } from '../models/Patio';

export async function listarTodos() {
  return Patio.findAll({ order: [['codigo', 'ASC']] });
}

export async function listarAtivos() {
  return Patio.findAll({ where: { ativo: true }, order: [['codigo', 'ASC']] });
}

export async function criar(dados: { codigo: string; nome: string; criadoPor?: string }) {
  const { codigo, nome, criadoPor } = dados;
  const codigoUp = codigo.trim().toUpperCase();

  if (!codigoUp || codigoUp.length > 5) {
    throw Object.assign(new Error('Código deve ter entre 1 e 5 caracteres'), { status: 400 });
  }
  if (!/^[A-Z0-9]+$/.test(codigoUp)) {
    throw Object.assign(new Error('Código deve ser alfanumérico'), { status: 400 });
  }
  if (!nome?.trim()) {
    throw Object.assign(new Error('Nome é obrigatório'), { status: 400 });
  }

  const existente = await Patio.findOne({ where: { codigo: codigoUp } });
  if (existente) {
    throw Object.assign(new Error(`Código "${codigoUp}" já existe`), { status: 409 });
  }

  return Patio.create({
    codigo: codigoUp,
    nome: nome.trim(),
    ativo: true,
    padrao: false,
    criado_por: criadoPor || null,
  });
}

export async function atualizar(codigo: string, dados: { nome?: string; ativo?: boolean }) {
  const patio = await Patio.findOne({ where: { codigo: codigo.toUpperCase() } });
  if (!patio) {
    throw Object.assign(new Error('Pátio não encontrado'), { status: 404 });
  }

  if (dados.nome !== undefined) {
    if (!dados.nome.trim()) {
      throw Object.assign(new Error('Nome é obrigatório'), { status: 400 });
    }
    patio.nome = dados.nome.trim();
  }

  if (dados.ativo !== undefined) {
    patio.ativo = dados.ativo;
  }

  await patio.save();
  return patio;
}
