// ============================================================================
// EFVM360 Backend — Controller de Auditoria
// ============================================================================

import { Request, Response } from 'express';
import * as auditService from '../services/auditService';

export const listar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const resultado = await auditService.buscar({
      matricula: req.query.matricula as string,
      acao: req.query.acao as string,
      recurso: req.query.recurso as string,
      dataInicio: req.query.dataInicio as string,
      dataFim: req.query.dataFim as string,
      limit: parseInt(req.query.limit as string || '50', 10),
      offset: parseInt(req.query.offset as string || '0', 10),
    });

    res.json(resultado);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao listar auditoria' });
  }
};

export const verificarIntegridade = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const resultado = await auditService.verificarIntegridade();
    res.json(resultado);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao verificar integridade' });
  }
};

export const sincronizar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const { registros } = req.body;
    if (!Array.isArray(registros)) {
      res.status(400).json({ error: 'Campo registros deve ser um array' });
      return;
    }

    const resultado = await auditService.sincronizar(registros);

    await auditService.registrar({
      matricula: req.user.matricula,
      acao: 'INTEGRIDADE_VERIFICADA',
      recurso: 'audit-sync',
      detalhes: `Sincronizados: ${resultado.importados} | Duplicados: ${resultado.duplicados}`,
      usuarioId: req.user.userId,
      ipAddress: req.ip,
    });

    res.json(resultado);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao sincronizar auditoria' });
  }
};
