// ============================================================================
// EFVM360 Backend — Organizational Controller
// ============================================================================

import { Request, Response } from 'express';
import * as orgService from '../services/orgService';

export const getTree = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

  const { matricula } = req.params;
  const subordinates = await orgService.getSubordinates(matricula);
  res.json({ matricula, subordinates });
};

export const getSuperiors = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

  const { matricula } = req.params;
  const chain = await orgService.getSuperiors(matricula);
  res.json({ matricula, superiors: chain });
};

export const assignSubordinate = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

  const { subordinateMatricula, superiorMatricula, relationshipType } = req.body;
  if (!subordinateMatricula || !superiorMatricula) {
    res.status(400).json({ error: 'subordinateMatricula e superiorMatricula são obrigatórios' });
    return;
  }

  const relation = await orgService.assignSubordinate(
    subordinateMatricula, superiorMatricula, relationshipType || 'direto',
  );
  res.status(201).json(relation);
};

export const removeRelationship = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

  const id = parseInt(req.params.id, 10);
  const result = await orgService.removeRelationship(id);
  if (!result) { res.status(404).json({ error: 'Relação não encontrada' }); return; }
  res.json({ message: 'Relação encerrada', id });
};

export const getUserYards = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

  const { matricula } = req.params;
  const yards = await orgService.getUserYards(matricula);
  res.json({ matricula, yards });
};

export const assignYard = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

  const { matricula } = req.params;
  const { yardCode, isPrimary } = req.body;
  if (!yardCode) { res.status(400).json({ error: 'yardCode é obrigatório' }); return; }

  const result = await orgService.assignYard(matricula, yardCode, isPrimary || false);
  res.status(result.created ? 201 : 200).json(result.record);
};

export const removeYard = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

  const { matricula, yard } = req.params;
  const removed = await orgService.removeYard(matricula, yard);
  if (!removed) { res.status(404).json({ error: 'Vínculo não encontrado' }); return; }
  res.json({ message: 'Pátio removido', matricula, yard });
};
