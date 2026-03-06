// ============================================================================
// EFVM360 Backend — Webhook Controller
// CRUD endpoints for webhook registration
// ============================================================================

import { Request, Response } from 'express';
import {
  createWebhook,
  listWebhooks,
  getWebhook,
  updateWebhook,
  deleteWebhook,
  WEBHOOK_EVENTS,
} from '../services/webhooks';

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, url, events, max_retries, backoff_ms } = req.body;

    // Validate events
    const invalidEvents = (events as string[]).filter(
      (e) => e !== '*' && !WEBHOOK_EVENTS.includes(e as typeof WEBHOOK_EVENTS[number]),
    );
    if (invalidEvents.length > 0) {
      res.status(400).json({
        error: `Invalid events: ${invalidEvents.join(', ')}`,
        valid_events: WEBHOOK_EVENTS,
      });
      return;
    }

    const created_by = req.user?.matricula || 'system';
    const result = await createWebhook({ name, url, events, created_by, max_retries, backoff_ms });

    res.status(201).json({
      uuid: result.uuid,
      secret: result.secret,
      message: 'Webhook created. Store the secret securely — it will not be shown again.',
    });
  } catch (err: unknown) {
    console.error('[WEBHOOK] Create error:', err);
    res.status(500).json({ error: 'Erro ao criar webhook' });
  }
};

export const list = async (req: Request, res: Response): Promise<void> => {
  try {
    const webhooks = await listWebhooks();
    res.json({ webhooks, available_events: WEBHOOK_EVENTS });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro ao listar webhooks' });
  }
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const webhook = await getWebhook(req.params.uuid);
    if (!webhook) {
      res.status(404).json({ error: 'Webhook not found' });
      return;
    }
    res.json(webhook);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro ao obter webhook' });
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    const { uuid } = req.params;
    const { name, url, events, active, max_retries, backoff_ms } = req.body;

    if (events) {
      const invalidEvents = (events as string[]).filter(
        (e) => e !== '*' && !WEBHOOK_EVENTS.includes(e as typeof WEBHOOK_EVENTS[number]),
      );
      if (invalidEvents.length > 0) {
        res.status(400).json({
          error: `Invalid events: ${invalidEvents.join(', ')}`,
          valid_events: WEBHOOK_EVENTS,
        });
        return;
      }
    }

    const updated = await updateWebhook(uuid, { name, url, events, active, max_retries, backoff_ms });
    if (!updated) {
      res.status(404).json({ error: 'Webhook not found' });
      return;
    }
    res.json({ message: 'Webhook updated' });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro ao atualizar webhook' });
  }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await deleteWebhook(req.params.uuid);
    if (!deleted) {
      res.status(404).json({ error: 'Webhook not found' });
      return;
    }
    res.json({ message: 'Webhook deleted' });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro ao deletar webhook' });
  }
};
