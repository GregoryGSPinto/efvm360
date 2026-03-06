// ============================================================================
// EFVM360 Backend — Controller de Usuarios
// ============================================================================

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Usuario } from '../models';
import * as auditService from '../services/auditService';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

export const listar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const usuarios = await Usuario.findAll({
      attributes: ['uuid', 'nome', 'matricula', 'funcao', 'turno', 'horario_turno', 'ativo', 'ultimo_login', 'created_at'],
      order: [['nome', 'ASC']],
    });

    res.json({ usuarios });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao listar usuarios' });
  }
};

export const criar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const { nome, matricula, funcao, turno, horarioTurno, senha } = req.body;

    if (!nome || !matricula || !senha) {
      res.status(400).json({ error: 'Nome, matrícula e senha são obrigatórios' });
      return;
    }
    if (senha.length < 8) {
      res.status(400).json({ error: 'Senha deve ter mínimo 8 caracteres' });
      return;
    }

    const existente = await Usuario.findOne({ where: { matricula: matricula.trim() } });
    if (existente) {
      res.status(409).json({ error: 'Matrícula já cadastrada', code: 'DUPLICATE_MATRICULA' });
      return;
    }

    const hash = await bcrypt.hash(senha, BCRYPT_ROUNDS);

    const usuario = await Usuario.create({
      uuid: uuidv4(),
      nome: nome.trim(),
      matricula: matricula.trim(),
      funcao: funcao || 'operador',
      turno: turno || null,
      horario_turno: horarioTurno || null,
      senha_hash: hash,
    });

    await auditService.registrar({
      matricula: req.user.matricula,
      acao: 'USUARIO_CRIADO',
      recurso: 'usuarios',
      detalhes: `Novo: ${matricula.trim()} (${funcao || 'operador'})`,
      usuarioId: req.user.userId,
      ipAddress: req.ip,
    });

    res.status(201).json({ usuario: usuario.toSafeJSON() });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao criar usuario' });
  }
};

export const atualizar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const usuario = await Usuario.findOne({ where: { uuid: req.params.uuid } });
    if (!usuario) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    const { nome, funcao, turno, horarioTurno, ativo } = req.body;
    const updates: Record<string, unknown> = {};

    if (nome !== undefined) updates.nome = nome.trim();
    if (funcao !== undefined) updates.funcao = funcao;
    if (turno !== undefined) updates.turno = turno;
    if (horarioTurno !== undefined) updates.horario_turno = horarioTurno;
    if (ativo !== undefined) updates.ativo = ativo;

    await usuario.update(updates);

    await auditService.registrar({
      matricula: req.user.matricula,
      acao: 'USUARIO_EDITADO',
      recurso: 'usuarios',
      detalhes: `Editado: ${usuario.matricula} | Campos: ${Object.keys(updates).join(', ')}`,
      usuarioId: req.user.userId,
      ipAddress: req.ip,
    });

    res.json({ usuario: usuario.toSafeJSON() });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao atualizar usuario' });
  }
};
