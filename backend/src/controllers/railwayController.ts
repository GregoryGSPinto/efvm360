// ============================================================================
// EFVM360 Backend — Railway Controller
// ============================================================================

import { Request, Response } from 'express';
import { Railway } from '../models/Railway';

export const list = async (_req: Request, res: Response): Promise<void> => {
  try {
    const railways = await Railway.findAll();
    res.json({ railways });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao listar ferrovias' });
  }
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const railway = await Railway.findByPk(req.params.id);
    if (!railway) { res.status(404).json({ error: 'Ferrovia não encontrada' }); return; }
    res.json(railway);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao obter ferrovia' });
  }
};
