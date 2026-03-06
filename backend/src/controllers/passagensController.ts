// ============================================================================
// EFVM360 Backend — Controller de Passagens de Servico
// ============================================================================

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Passagem, Usuario } from '../models';
import { hashFormulario } from '../utils/crypto';
import * as auditService from '../services/auditService';
import { metrics } from '../services/metricsService';
import { emitNewHandover, emitHandoverSigned } from '../services/websocket';

/**
 * POST /api/v1/passagens — Salvar passagem (nova ou atualizacao)
 */
export const salvar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const {
      uuid: passagemUuid,
      cabecalho,
      patioCima,
      patioBaixo,
      equipamentos,
      segurancaManobras,
      pontosAtencao,
      intervencoes,
      sala5s,
      assinaturas,
    } = req.body;

    // Valida dados minimos
    if (!cabecalho?.data || !cabecalho?.turno) {
      res.status(400).json({ error: 'Data e turno são obrigatórios', code: 'VALIDATION_ERROR' });
      return;
    }

    // Busca IDs dos operadores por matricula
    let opSaiId: number | null = null;
    let opEntraId: number | null = null;

    if (assinaturas?.sai?.matricula) {
      const opSai = await Usuario.findOne({ where: { matricula: assinaturas.sai.matricula } });
      opSaiId = opSai?.id || null;
    }
    if (assinaturas?.entra?.matricula) {
      const opEntra = await Usuario.findOne({ where: { matricula: assinaturas.entra.matricula } });
      opEntraId = opEntra?.id || null;
    }

    // Determina status
    let status = 'rascunho';
    if (assinaturas?.sai?.confirmado && assinaturas?.entra?.confirmado) {
      status = 'assinado_completo';
    } else if (assinaturas?.sai?.confirmado || assinaturas?.entra?.confirmado) {
      status = 'assinado_parcial';
    }

    // Calcula hash de integridade total
    const hashIntegridade = hashFormulario({
      cabecalho,
      patioCima,
      patioBaixo,
      equipamentos,
      segurancaManobras,
      pontosAtencao,
      intervencoes,
      assinaturas,
    });

    const dados = {
      data_passagem: cabecalho.data,
      dss: cabecalho.dss || null,
      turno: cabecalho.turno,
      horario_turno: cabecalho.horario || '',
      operador_sai_id: opSaiId,
      operador_entra_id: opEntraId,
      dados_patio_cima: patioCima || [],
      dados_patio_baixo: patioBaixo || [],
      dados_equipamentos: equipamentos || null,
      dados_seguranca_manobras: segurancaManobras || null,
      dados_pontos_atencao: pontosAtencao || null,
      dados_intervencoes: intervencoes || null,
      dados_sala_5s: sala5s || null,
      assinatura_sai_confirmado: assinaturas?.sai?.confirmado || false,
      assinatura_sai_hash: assinaturas?.sai?.hashIntegridade || null,
      assinatura_sai_timestamp: assinaturas?.sai?.confirmado ? new Date() : null,
      assinatura_entra_confirmado: assinaturas?.entra?.confirmado || false,
      assinatura_entra_hash: assinaturas?.entra?.hashIntegridade || null,
      assinatura_entra_timestamp: assinaturas?.entra?.confirmado ? new Date() : null,
      status,
      hash_integridade: hashIntegridade,
    };

    let passagem: Passagem;

    if (passagemUuid) {
      // Atualizacao
      const existing = await Passagem.findOne({ where: { uuid: passagemUuid } });
      if (!existing) {
        res.status(404).json({ error: 'Passagem não encontrada' });
        return;
      }
      await existing.update(dados);
      passagem = existing;
    } else {
      // Nova passagem
      passagem = await Passagem.create({ ...dados, uuid: uuidv4() });
    }

    metrics.incrementar('passagens_criadas', 1, { turno: cabecalho.turno, status });

    await auditService.registrar({
      matricula: req.user.matricula,
      acao: passagemUuid ? 'PASSAGEM_ATUALIZADA' : 'PASSAGEM_CRIADA',
      recurso: 'passagem',
      detalhes: `UUID: ${passagem.uuid} | Status: ${status} | Hash: ${hashIntegridade.substring(0, 12)}`,
      usuarioId: req.user.userId,
      ipAddress: req.ip,
    });

    // Emit WebSocket event for real-time dashboard updates
    const yardId = req.user.primaryYard || 'VFZ';
    emitNewHandover(yardId, {
      uuid: passagem.uuid,
      status: passagem.status,
      turno: cabecalho.turno,
      data: cabecalho.data,
    });

    res.status(passagemUuid ? 200 : 201).json({
      uuid: passagem.uuid,
      status: passagem.status,
      hashIntegridade,
      message: 'Passagem salva com sucesso',
    });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao salvar passagem' });
  }
};

/**
 * GET /api/v1/passagens — Lista passagens com filtros
 */
export const listar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const {
      data,
      turno,
      status: statusFilter,
      limit = '20',
      offset = '0',
    } = req.query;

    const where: Record<string, unknown> = {};
    if (data) where.data_passagem = data;
    if (turno) where.turno = turno;
    if (statusFilter) where.status = statusFilter;

    const { count, rows } = await Passagem.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: Math.min(parseInt(limit as string, 10) || 20, 100),
      offset: parseInt(offset as string, 10) || 0,
      include: [
        { model: Usuario, as: 'operadorSai', attributes: ['uuid', 'nome', 'matricula', 'funcao'] },
        { model: Usuario, as: 'operadorEntra', attributes: ['uuid', 'nome', 'matricula', 'funcao'] },
      ],
    });

    res.json({ passagens: rows, total: count });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao listar passagens' });
  }
};

/**
 * GET /api/v1/passagens/:uuid — Detalhe de uma passagem
 */
export const obter = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const passagem = await Passagem.findOne({
      where: { uuid: req.params.uuid },
      include: [
        { model: Usuario, as: 'operadorSai', attributes: ['uuid', 'nome', 'matricula', 'funcao'] },
        { model: Usuario, as: 'operadorEntra', attributes: ['uuid', 'nome', 'matricula', 'funcao'] },
      ],
    });

    if (!passagem) {
      res.status(404).json({ error: 'Passagem não encontrada' });
      return;
    }

    res.json({ passagem });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao obter passagem' });
  }
};

/**
 * POST /api/v1/passagens/:uuid/assinar — Assinar passagem com verificacao de senha server-side
 */
export const assinar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const { tipo, senha } = req.body; // tipo: 'entrada' | 'saida'

    if (!tipo || !senha || !['entrada', 'saida'].includes(tipo)) {
      res.status(400).json({ error: 'Tipo (entrada/saida) e senha são obrigatórios' });
      return;
    }

    const passagem = await Passagem.findOne({ where: { uuid: req.params.uuid } });
    if (!passagem) {
      res.status(404).json({ error: 'Passagem não encontrada' });
      return;
    }

    // Verifica senha do usuario logado
    const bcrypt = require('bcryptjs');
    const usuario = await Usuario.findByPk(req.user.userId);
    if (!usuario) { res.status(404).json({ error: 'Usuário não encontrado' }); return; }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      res.status(403).json({ error: 'Senha incorreta', code: 'AUTH_INVALID_PASSWORD' });
      return;
    }

    // Gera hash de integridade no momento da assinatura (server-side)
    const snapshotHash = hashFormulario({
      patioCima: passagem.dados_patio_cima,
      patioBaixo: passagem.dados_patio_baixo,
      turno: passagem.turno,
      data: passagem.data_passagem,
      tipo,
      matricula: req.user.matricula,
      timestamp: new Date().toISOString(),
    });

    if (tipo === 'saida') {
      await passagem.update({
        assinatura_sai_confirmado: true,
        assinatura_sai_hash: snapshotHash,
        assinatura_sai_timestamp: new Date(),
        operador_sai_id: req.user.userId,
        status: passagem.assinatura_entra_confirmado ? 'assinado_completo' : 'assinado_parcial',
      });
    } else {
      await passagem.update({
        assinatura_entra_confirmado: true,
        assinatura_entra_hash: snapshotHash,
        assinatura_entra_timestamp: new Date(),
        operador_entra_id: req.user.userId,
        status: passagem.assinatura_sai_confirmado ? 'assinado_completo' : 'assinado_parcial',
      });
    }

    metrics.incrementar('passagens_assinadas', 1, { tipo });

    await auditService.registrar({
      matricula: req.user.matricula,
      acao: 'PASSAGEM_ASSINADA',
      recurso: `assinatura-${tipo}`,
      detalhes: `Passagem: ${passagem.uuid} | Hash: ${snapshotHash.substring(0, 12)}`,
      usuarioId: req.user.userId,
      ipAddress: req.ip,
    });

    // Emit WebSocket event for signed handover
    emitHandoverSigned(req.user.primaryYard || 'VFZ', passagem.uuid);

    res.json({
      message: `Assinatura de ${tipo} registrada com sucesso`,
      hash: snapshotHash,
      status: passagem.status,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao assinar passagem' });
  }
};
