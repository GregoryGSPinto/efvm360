// ============================================================================
// EFVM360 Backend — Inter-Yard Handover Controller
// ============================================================================

import { Request, Response } from 'express';
import { InterYardHandover } from '../models/InterYardHandover';
import { Op } from 'sequelize';

export const create = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

  const { compositionCode, originYard, destinationYard } = req.body;
  if (!compositionCode || !originYard || !destinationYard) {
    res.status(400).json({ error: 'compositionCode, originYard e destinationYard são obrigatórios' });
    return;
  }

  const handover = await InterYardHandover.create({
    composition_code: compositionCode,
    origin_yard: originYard,
    destination_yard: destinationYard,
    dispatcher_matricula: req.user.matricula,
  });

  res.status(201).json(handover);
};

export const dispatch = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

  const handover = await InterYardHandover.findOne({ where: { uuid: req.params.id } });
  if (!handover) { res.status(404).json({ error: 'Handover não encontrado' }); return; }
  if (handover.status !== 'draft') { res.status(400).json({ error: 'Handover não está em rascunho' }); return; }

  await handover.update({
    status: 'dispatched',
    dispatch_checklist: req.body.checklist || [],
    dispatched_at: new Date(),
  });

  res.json(handover);
};

export const receive = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

  const handover = await InterYardHandover.findOne({ where: { uuid: req.params.id } });
  if (!handover) { res.status(404).json({ error: 'Handover não encontrado' }); return; }
  if (handover.status !== 'dispatched') { res.status(400).json({ error: 'Handover não está despachado' }); return; }

  const receptionChecklist = req.body.checklist || [];
  const dispatchChecklist = (handover.dispatch_checklist as Array<{ id: string; value: string }>) || [];

  // Detect divergences
  const divergences: Array<{ itemId: string; dispatcherValue: string; receiverValue: string; resolution: string }> = [];
  for (const item of receptionChecklist) {
    const dispatched = dispatchChecklist.find((d: { id: string }) => d.id === item.id);
    if (dispatched && dispatched.value !== item.value) {
      divergences.push({
        itemId: item.id,
        dispatcherValue: dispatched.value,
        receiverValue: item.value,
        resolution: 'pending',
      });
    }
  }

  const newStatus = divergences.length > 0 ? 'divergence' : 'received';

  await handover.update({
    status: newStatus,
    receiver_matricula: req.user.matricula,
    reception_checklist: receptionChecklist,
    divergences: divergences.length > 0 ? divergences : null,
    received_at: new Date(),
  });

  res.json(handover);
};

export const addDivergence = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

  const handover = await InterYardHandover.findOne({ where: { uuid: req.params.id } });
  if (!handover) { res.status(404).json({ error: 'Handover não encontrado' }); return; }

  const existing = (handover.divergences as Array<Record<string, unknown>>) || [];
  existing.push({ ...req.body, resolution: 'pending', resolvedBy: null, resolvedAt: null });

  await handover.update({ divergences: existing, status: 'divergence' });
  res.json(handover);
};

export const resolve = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

  const handover = await InterYardHandover.findOne({ where: { uuid: req.params.id } });
  if (!handover) { res.status(404).json({ error: 'Handover não encontrado' }); return; }

  const { itemId, resolution } = req.body;
  const divs = (handover.divergences as Array<{ itemId: string; resolution: string; resolvedBy: string | null; resolvedAt: string | null }>) || [];
  const updated = divs.map(d =>
    d.itemId === itemId ? { ...d, resolution, resolvedBy: req.user!.matricula, resolvedAt: new Date().toISOString() } : d,
  );
  const allResolved = updated.every(d => d.resolution !== 'pending');

  await handover.update({ divergences: updated, status: allResolved ? 'resolved' : 'divergence' });
  res.json(handover);
};

export const seal = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

  const handover = await InterYardHandover.findOne({ where: { uuid: req.params.id } });
  if (!handover) { res.status(404).json({ error: 'Handover não encontrado' }); return; }
  if (handover.status !== 'received' && handover.status !== 'resolved') {
    res.status(400).json({ error: 'Handover não pode ser selado neste status' }); return;
  }

  const { integrityHash, previousHash } = req.body;

  await handover.update({
    status: 'sealed',
    integrity_hash: integrityHash || '',
    previous_hash: previousHash || null,
    sealed_at: new Date(),
  });

  res.json(handover);
};

export const list = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

  const yardFilter = req.query.yard as string;
  const where: Record<string, unknown> = {};

  if (yardFilter) {
    where[Op.or as unknown as string] = [
      { origin_yard: yardFilter },
      { destination_yard: yardFilter },
    ];
  }

  const handovers = await InterYardHandover.findAll({
    where,
    order: [['created_at', 'DESC']],
    limit: 50,
  });

  res.json({ handovers });
};
