// ============================================================================
// VFZ Backend — Webhook Engine
// Dispatches events to registered webhook endpoints with HMAC signing & retry
// ============================================================================

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database';

// ── Types ───────────────────────────────────────────────────────────────────

export interface WebhookRecord {
  id: number;
  uuid: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  max_retries: number;
  backoff_ms: number;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface WebhookDelivery {
  webhook_uuid: string;
  event: string;
  payload: unknown;
  status: 'pending' | 'success' | 'failed';
  attempts: number;
  last_status_code: number | null;
  last_error: string | null;
}

// ── Supported events ────────────────────────────────────────────────────────

export const WEBHOOK_EVENTS = [
  'handover.created',
  'handover.signed',
  'equipment.alert',
  'risk.alert',
  'yard.status.update',
  'composition.departed',
  'composition.arrived',
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

// ── HMAC Signature ──────────────────────────────────────────────────────────

export function signPayload(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
}

export function verifySignature(
  payload: string,
  secret: string,
  signature: string,
): boolean {
  const expected = signPayload(payload, secret);
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signature, 'hex'),
  );
}

// ── CRUD ────────────────────────────────────────────────────────────────────

export async function createWebhook(data: {
  name: string;
  url: string;
  events: string[];
  created_by: string;
  max_retries?: number;
  backoff_ms?: number;
}): Promise<{ uuid: string; secret: string }> {
  const uuid = uuidv4();
  const secret = crypto.randomBytes(32).toString('hex');
  const now = new Date();

  await sequelize.query(
    `INSERT INTO webhooks (uuid, name, url, events, secret, active, max_retries, backoff_ms, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, true, ?, ?, ?, ?, ?)`,
    {
      replacements: [
        uuid,
        data.name,
        data.url,
        JSON.stringify(data.events),
        secret,
        data.max_retries ?? 3,
        data.backoff_ms ?? 1000,
        data.created_by,
        now,
        now,
      ],
    },
  );

  return { uuid, secret };
}

export async function listWebhooks(createdBy?: string): Promise<WebhookRecord[]> {
  let query = 'SELECT id, uuid, name, url, events, active, max_retries, backoff_ms, created_by, created_at, updated_at FROM webhooks';
  const replacements: string[] = [];

  if (createdBy) {
    query += ' WHERE created_by = ?';
    replacements.push(createdBy);
  }

  query += ' ORDER BY created_at DESC';

  const [rows] = await sequelize.query(query, { replacements });
  return (rows as WebhookRecord[]).map((r) => ({
    ...r,
    events: typeof r.events === 'string' ? JSON.parse(r.events as string) : r.events,
  }));
}

export async function getWebhook(uuid: string): Promise<WebhookRecord | null> {
  const [rows] = await sequelize.query(
    'SELECT id, uuid, name, url, events, active, max_retries, backoff_ms, created_by, created_at, updated_at FROM webhooks WHERE uuid = ? LIMIT 1',
    { replacements: [uuid] },
  );
  const row = (rows as WebhookRecord[])[0];
  if (!row) return null;
  return {
    ...row,
    events: typeof row.events === 'string' ? JSON.parse(row.events as string) : row.events,
  };
}

export async function updateWebhook(
  uuid: string,
  data: Partial<{ name: string; url: string; events: string[]; active: boolean; max_retries: number; backoff_ms: number }>,
): Promise<boolean> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.url !== undefined) { fields.push('url = ?'); values.push(data.url); }
  if (data.events !== undefined) { fields.push('events = ?'); values.push(JSON.stringify(data.events)); }
  if (data.active !== undefined) { fields.push('active = ?'); values.push(data.active); }
  if (data.max_retries !== undefined) { fields.push('max_retries = ?'); values.push(data.max_retries); }
  if (data.backoff_ms !== undefined) { fields.push('backoff_ms = ?'); values.push(data.backoff_ms); }

  if (fields.length === 0) return false;

  fields.push('updated_at = ?');
  values.push(new Date());
  values.push(uuid);

  const [, meta] = await sequelize.query(
    `UPDATE webhooks SET ${fields.join(', ')} WHERE uuid = ?`,
    { replacements: values },
  );

  return (meta as { affectedRows?: number }).affectedRows !== 0;
}

export async function deleteWebhook(uuid: string): Promise<boolean> {
  const [, meta] = await sequelize.query(
    'DELETE FROM webhooks WHERE uuid = ?',
    { replacements: [uuid] },
  );
  return (meta as { affectedRows?: number }).affectedRows !== 0;
}

// ── Dispatch ────────────────────────────────────────────────────────────────

export async function dispatchWebhook(
  event: string,
  payload: unknown,
): Promise<void> {
  // Find all active webhooks subscribed to this event
  const [rows] = await sequelize.query(
    'SELECT uuid, url, secret, max_retries, backoff_ms FROM webhooks WHERE active = true',
  );

  const hooks = (rows as Array<{
    uuid: string; url: string; secret: string;
    max_retries: number; backoff_ms: number; events?: string;
  }>);

  for (const hook of hooks) {
    // Check if webhook is subscribed to this event (JSON column)
    const events: string[] = typeof hook.events === 'string'
      ? JSON.parse(hook.events)
      : (hook.events ?? []);

    if (!events.includes(event) && !events.includes('*')) continue;

    // Fire and forget — delivery runs in background
    deliverWebhook(hook, event, payload).catch((err) => {
      console.error(`[WEBHOOK] Delivery failed for ${hook.uuid}:`, err);
    });
  }
}

async function deliverWebhook(
  hook: { uuid: string; url: string; secret: string; max_retries: number; backoff_ms: number },
  event: string,
  payload: unknown,
): Promise<void> {
  const body = JSON.stringify({
    event,
    payload,
    timestamp: new Date().toISOString(),
    webhook_id: hook.uuid,
  });

  const signature = signPayload(body, hook.secret);

  let lastError = '';
  let lastStatus = 0;

  for (let attempt = 0; attempt <= hook.max_retries; attempt++) {
    if (attempt > 0) {
      // Exponential backoff
      const delay = hook.backoff_ms * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
      const response = await fetch(hook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-EFVM360-Signature': `sha256=${signature}`,
          'X-EFVM360-Event': event,
          'X-EFVM360-Delivery': uuidv4(),
          'User-Agent': 'EFVM360-Webhook/1.0',
        },
        body,
        signal: AbortSignal.timeout(10000),
      });

      lastStatus = response.status;

      if (response.ok) {
        await logDelivery(hook.uuid, event, 'success', attempt + 1, lastStatus, null);
        return;
      }

      lastError = `HTTP ${response.status}`;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : 'Unknown error';
      lastStatus = 0;
    }
  }

  // All retries exhausted
  await logDelivery(hook.uuid, event, 'failed', hook.max_retries + 1, lastStatus, lastError);
  console.warn(`[WEBHOOK] All retries exhausted for ${hook.uuid} event=${event}: ${lastError}`);
}

async function logDelivery(
  webhookUuid: string,
  event: string,
  status: string,
  attempts: number,
  statusCode: number,
  error: string | null,
): Promise<void> {
  try {
    await sequelize.query(
      `INSERT INTO webhook_deliveries (uuid, webhook_uuid, event, status, attempts, last_status_code, last_error, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [uuidv4(), webhookUuid, event, status, attempts, statusCode, error, new Date()],
      },
    );
  } catch (err) {
    console.error('[WEBHOOK] Failed to log delivery:', err);
  }
}
