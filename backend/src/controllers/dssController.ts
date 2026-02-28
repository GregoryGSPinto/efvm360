// ============================================================================
// VFZ Backend — DSS Controller (Diálogo de Segurança)
// ============================================================================

import { Request, Response } from 'express';
import { DSS, Usuario } from '../models';
import * as auditService from '../services/auditService';

export const salvar = async (req: Request, res: Response): Promise<void> => {
  try {
    const { uuid, data, turno, tema, observacoes, experiencias, topicos, participantes, passagemUuid, status } = req.body;
    const user = req.user as { userId: number; matricula: string };

    if (uuid) {
      const existing = await DSS.findOne({ where: { uuid } });
      if (existing) {
        await existing.update({
          data, turno, tema, observacoes,
          experiencias_compartilhadas: experiencias || null,
          topicos: topicos || null,
          participantes: participantes || null,
          passagem_uuid: passagemUuid || null,
          status: status || 'rascunho',
        });
        res.json({ uuid: existing.uuid, message: 'DSS atualizado' });
        return;
      }
    }

    const dss = await DSS.create({
      data, turno, tema,
      facilitador_id: user.userId,
      facilitador_matricula: user.matricula,
      observacoes: observacoes || null,
      experiencias_compartilhadas: experiencias || null,
      topicos: topicos || null,
      participantes: participantes || null,
      passagem_uuid: passagemUuid || null,
      status: status || 'rascunho',
    });

    await auditService.registrar({
      matricula: user.matricula, usuarioId: user.userId,
      acao: 'PASSAGEM_CRIADA', recurso: 'dss',
      detalhes: `DSS criado: tema="${tema}", turno=${turno}`,
    });

    res.status(201).json({ uuid: dss.uuid, message: 'DSS criado' });
  } catch (error) {
    console.error('[DSS] Erro ao salvar:', error);
    res.status(500).json({ error: 'Erro ao salvar DSS' });
  }
};

export const listar = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, turno, status, limit = '20', offset = '0' } = req.query;
    const where: Record<string, unknown> = {};

    if (data) where.data = data;
    if (turno) where.turno = turno;
    if (status) where.status = status;

    const { count, rows } = await DSS.findAndCountAll({
      where,
      include: [{ model: Usuario, as: 'facilitador', attributes: ['uuid', 'nome', 'matricula', 'funcao'] }],
      order: [['created_at', 'DESC']],
      limit: Math.min(parseInt(limit as string, 10) || 20, 100),
      offset: parseInt(offset as string, 10) || 0,
    });

    res.json({ dss: rows, total: count });
  } catch (error) {
    console.error('[DSS] Erro ao listar:', error);
    res.status(500).json({ error: 'Erro ao listar DSS' });
  }
};

export const obter = async (req: Request, res: Response): Promise<void> => {
  try {
    const dss = await DSS.findOne({
      where: { uuid: req.params.uuid },
      include: [{ model: Usuario, as: 'facilitador', attributes: ['uuid', 'nome', 'matricula', 'funcao'] }],
    });

    if (!dss) { res.status(404).json({ error: 'DSS não encontrado' }); return; }
    res.json({ dss });
  } catch (error) {
    console.error('[DSS] Erro ao obter:', error);
    res.status(500).json({ error: 'Erro ao obter DSS' });
  }
};
