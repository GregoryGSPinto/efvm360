// ============================================================================
// VFZ Backend — Controller: Pátios
// ============================================================================

import { Request, Response } from 'express';
import * as patioService from '../services/patioService';

export const listar = async (_req: Request, res: Response): Promise<void> => {
  try {
    const patios = await patioService.listarTodos();
    res.json({ patios });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro ao listar pátios' });
  }
};

export const listarAtivos = async (_req: Request, res: Response): Promise<void> => {
  try {
    const patios = await patioService.listarAtivos();
    res.json({ patios });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro ao listar pátios ativos' });
  }
};

export const criar = async (req: Request, res: Response): Promise<void> => {
  try {
    const { codigo, nome } = req.body;
    const criadoPor = req.user?.matricula;
    const patio = await patioService.criar({ codigo, nome, criadoPor });
    res.status(201).json({ patio });
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Erro ao criar pátio' });
  }
};

export const atualizar = async (req: Request, res: Response): Promise<void> => {
  try {
    const { codigo } = req.params;
    const { nome, ativo } = req.body;
    const patio = await patioService.atualizar(codigo, { nome, ativo });
    res.json({ patio });
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Erro ao atualizar pátio' });
  }
};
