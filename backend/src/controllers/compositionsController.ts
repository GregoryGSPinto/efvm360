// ============================================================================
// EFVM360 Backend — Train Compositions Controller
// ============================================================================

import { Request, Response } from 'express';
import { TrainComposition } from '../models/TrainComposition';
import { CompositionHandoverChain } from '../models/CompositionHandoverChain';
import { InterYardHandover } from '../models/InterYardHandover';
import { Op } from 'sequelize';

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const { compositionCode, originYard, destinationYard, cargoType, wagonCount } = req.body;
    if (!compositionCode || !originYard || !destinationYard) {
      res.status(400).json({ error: 'compositionCode, originYard e destinationYard são obrigatórios' });
      return;
    }

    const composition = await TrainComposition.create({
      composition_code: compositionCode,
      origin_yard: originYard,
      destination_yard: destinationYard,
      current_yard: originYard,
      cargo_type: cargoType || null,
      wagon_count: wagonCount || null,
    });

    res.status(201).json(composition);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao criar composição' });
  }
};

export const list = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const where: Record<string, unknown> = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.yard) {
      where[Op.or as unknown as string] = [
        { current_yard: req.query.yard },
        { origin_yard: req.query.yard },
        { destination_yard: req.query.yard },
      ];
    }

    const compositions = await TrainComposition.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: 50,
    });

    res.json({ compositions });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao listar composições' });
  }
};

export const getByCode = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const composition = await TrainComposition.findOne({
      where: { composition_code: req.params.code },
    });
    if (!composition) { res.status(404).json({ error: 'Composição não encontrada' }); return; }

    const chain = await CompositionHandoverChain.findAll({
      where: { composition_id: composition.id },
      order: [['sequence_number', 'ASC']],
    });

    res.json({ composition, chain });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao obter composição' });
  }
};

export const depart = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const composition = await TrainComposition.findOne({
      where: { composition_code: req.params.code },
    });
    if (!composition) { res.status(404).json({ error: 'Composição não encontrada' }); return; }
    if (composition.status !== 'loading' && composition.status !== 'arrived') {
      res.status(400).json({ error: 'Composição não pode partir neste status' }); return;
    }

    if (req.body.handoverUuid) {
      const existingChain = await CompositionHandoverChain.findAll({
        where: { composition_id: composition.id },
      });
      await CompositionHandoverChain.create({
        composition_id: composition.id,
        inter_yard_handover_id: req.body.handoverUuid,
        sequence_number: existingChain.length + 1,
        from_yard: composition.current_yard,
        to_yard: req.body.toYard || composition.destination_yard,
      });
    }

    await composition.update({
      status: 'in_transit',
      departed_at: new Date(),
    });

    res.json(composition);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao registrar partida' });
  }
};

export const arrive = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const composition = await TrainComposition.findOne({
      where: { composition_code: req.params.code },
    });
    if (!composition) { res.status(404).json({ error: 'Composição não encontrada' }); return; }
    if (composition.status !== 'in_transit') {
      res.status(400).json({ error: 'Composição não está em trânsito' }); return;
    }

    const arrivalYard = req.body.yard || composition.destination_yard;

    await composition.update({
      status: 'arrived',
      current_yard: arrivalYard,
      arrived_at: new Date(),
    });

    res.json(composition);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao registrar chegada' });
  }
};

export const journey = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const composition = await TrainComposition.findOne({
      where: { composition_code: req.params.code },
    });
    if (!composition) { res.status(404).json({ error: 'Composição não encontrada' }); return; }

    const chain = await CompositionHandoverChain.findAll({
      where: { composition_id: composition.id },
      order: [['sequence_number', 'ASC']],
    });

    const handoverIds = chain.map(c => c.inter_yard_handover_id);
    const handovers = handoverIds.length > 0
      ? await InterYardHandover.findAll({ where: { uuid: { [Op.in]: handoverIds } } })
      : [];

    const timeline = chain.map(link => {
      const handover = handovers.find(h => h.uuid === link.inter_yard_handover_id);
      return {
        sequence: link.sequence_number,
        fromYard: link.from_yard,
        toYard: link.to_yard,
        handoverUuid: link.inter_yard_handover_id,
        handoverStatus: handover?.status || 'unknown',
        dispatchedAt: handover?.dispatched_at || null,
        receivedAt: handover?.received_at || null,
        sealedAt: handover?.sealed_at || null,
      };
    });

    res.json({
      composition,
      timeline,
      currentStatus: composition.status,
      progress: {
        origin: composition.origin_yard,
        destination: composition.destination_yard,
        current: composition.current_yard,
        completionPercentage: composition.status === 'completed' ? 100 :
          composition.status === 'arrived' && composition.current_yard === composition.destination_yard ? 90 :
          composition.status === 'in_transit' ? 50 :
          composition.status === 'loading' ? 10 : 0,
      },
    });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao obter jornada' });
  }
};
