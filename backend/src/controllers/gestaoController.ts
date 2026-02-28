// ============================================================================
// VFZ Backend — Gestão Controller (Aprovações + Pendências)
// ============================================================================

import { Request, Response } from 'express';
import { CadastroPendente, SenhaReset, Usuario } from '../models';
import bcrypt from 'bcryptjs';
import * as auditService from '../services/auditService';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

// ── Cadastros Pendentes ──────────────────────────────────────────────────

export const listarCadastros = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status = 'pendente', patio } = req.query;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (patio) where.patio_codigo = patio;

    const registros = await CadastroPendente.findAll({
      where, order: [['created_at', 'DESC']],
    });
    res.json({ registros });
  } catch (error) {
    console.error('[GESTAO] Erro listar cadastros:', error);
    res.status(500).json({ error: 'Erro ao listar cadastros pendentes' });
  }
};

export const aprovarCadastro = async (req: Request, res: Response): Promise<void> => {
  try {
    const { uuid } = req.params;
    const user = req.user as { matricula: string; userId: number };

    const registro = await CadastroPendente.findOne({ where: { uuid } });
    if (!registro) { res.status(404).json({ error: 'Cadastro não encontrado' }); return; }
    if (registro.status !== 'pendente') { res.status(400).json({ error: 'Cadastro já processado' }); return; }

    // Create user in usuarios table
    const existing = await Usuario.findOne({ where: { matricula: registro.matricula } });
    if (existing) { res.status(409).json({ error: 'Matrícula já cadastrada' }); return; }

    await Usuario.create({
      nome: registro.nome,
      matricula: registro.matricula,
      funcao: registro.funcao || 'operador',
      turno: registro.turno || null,
      horario_turno: registro.horario_turno || null,
      senha_hash: registro.senha_hash,
    });

    await registro.update({ status: 'aprovado', aprovado_por: user.matricula });

    await auditService.registrar({
      matricula: user.matricula, usuarioId: user.userId,
      acao: 'USUARIO_CRIADO', recurso: 'gestao/cadastros',
      detalhes: `Cadastro aprovado: ${registro.matricula} (${registro.nome})`,
    });

    res.json({ message: 'Cadastro aprovado com sucesso' });
  } catch (error) {
    console.error('[GESTAO] Erro aprovar cadastro:', error);
    res.status(500).json({ error: 'Erro ao aprovar cadastro' });
  }
};

export const rejeitarCadastro = async (req: Request, res: Response): Promise<void> => {
  try {
    const { uuid } = req.params;
    const { motivo } = req.body;
    const user = req.user as { matricula: string };

    const registro = await CadastroPendente.findOne({ where: { uuid } });
    if (!registro) { res.status(404).json({ error: 'Cadastro não encontrado' }); return; }

    await registro.update({ status: 'rejeitado', aprovado_por: user.matricula, motivo_rejeicao: motivo || null });
    res.json({ message: 'Cadastro rejeitado' });
  } catch (error) {
    console.error('[GESTAO] Erro rejeitar cadastro:', error);
    res.status(500).json({ error: 'Erro ao rejeitar cadastro' });
  }
};

// ── Senha Resets ─────────────────────────────────────────────────────────

export const listarSenhaResets = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status = 'pendente' } = req.query;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const registros = await SenhaReset.findAll({
      where, order: [['created_at', 'DESC']],
    });
    res.json({ registros });
  } catch (error) {
    console.error('[GESTAO] Erro listar senha resets:', error);
    res.status(500).json({ error: 'Erro ao listar pedidos de reset' });
  }
};

export const aprovarSenhaReset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { uuid } = req.params;
    const { novaSenha = '123456' } = req.body;
    const user = req.user as { matricula: string; userId: number };

    const registro = await SenhaReset.findOne({ where: { uuid } });
    if (!registro) { res.status(404).json({ error: 'Pedido não encontrado' }); return; }
    if (registro.status !== 'pendente') { res.status(400).json({ error: 'Pedido já processado' }); return; }

    const novaHash = await bcrypt.hash(novaSenha, BCRYPT_ROUNDS);

    // Update user password
    const usuario = await Usuario.findOne({ where: { matricula: registro.matricula } });
    if (usuario) {
      await usuario.update({ senha_hash: novaHash, tentativas_login: 0, bloqueado_ate: null });
    }

    await registro.update({ status: 'aprovado', aprovado_por: user.matricula, nova_senha_hash: novaHash });

    await auditService.registrar({
      matricula: user.matricula, usuarioId: user.userId,
      acao: 'SENHA_ALTERADA', recurso: 'gestao/senha-resets',
      detalhes: `Senha resetada para: ${registro.matricula}`,
    });

    res.json({ message: 'Senha resetada com sucesso' });
  } catch (error) {
    console.error('[GESTAO] Erro aprovar senha reset:', error);
    res.status(500).json({ error: 'Erro ao resetar senha' });
  }
};
