// ============================================================================
// EFVM360 Backend — Railway Controller
// ============================================================================

import { Request, Response } from 'express';
import { Railway } from '../models/Railway';

export const list = async (_req: Request, res: Response): Promise<void> => {
  const railways = await Railway.findAll();
  res.json({ railways });
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  const railway = await Railway.findByPk(req.params.id);
  if (!railway) { res.status(404).json({ error: 'Ferrovia não encontrada' }); return; }
  res.json(railway);
};
