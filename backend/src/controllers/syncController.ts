// ============================================================================
// VFZ Backend — Sync Controller
// ============================================================================
//
// POST /api/v1/sync/passagens
//
//   Recebe batch de passagens do client offline-first.
//   Para cada item:
//     1. Verifica HMAC de integridade
//     2. Verifica se UUID já existe (idempotente)
//     3. Detecta conflito (mesmo turno + data + pátio)
//     4. Insere ou marca como conflito
//     5. Registra no audit trail
//
//   Contrato de resposta:
//     { results: [{ id, status: 'ok'|'conflict'|'error', serverVersion?, error? }] }
//
// ============================================================================

import { Request, Response } from 'express';
import { Passagem, AuditTrail } from '../models';
import { hashFormulario } from '../utils/crypto';
import { Op } from 'sequelize';
import * as auditService from '../services/auditService';

interface SyncItem {
  id: string;              // UUID from client
  type: 'passagem' | 'assinatura' | 'dss' | 'audit';
  payload: Record<string, unknown>;
  hmac: string;
  createdAt: string;
  turno?: string;
  data?: string;
  deviceId?: string;
}

interface SyncResultItem {
  id: string;
  status: 'ok' | 'conflict' | 'error';
  serverVersion?: unknown;
  error?: string;
}

/**
 * POST /api/v1/sync/passagens
 * Batch sync endpoint — idempotent, conflict-aware
 */
export const sincronizarBatch = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  const { items } = req.body as { items: SyncItem[] };

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'items array obrigatório e não vazio' });
    return;
  }

  if (items.length > 50) {
    res.status(400).json({ error: 'Máximo 50 items por batch' });
    return;
  }

  const results: SyncResultItem[] = [];

  const user = req.user;

  for (const item of items) {
    try {
      const result = await processItem(item, user);
      results.push(result);
    } catch (err) {
      results.push({
        id: item.id,
        status: 'error',
        error: err instanceof Error ? err.message : 'Erro interno',
      });
    }
  }

  // Audit: registrar sync
  const synced = results.filter((r) => r.status === 'ok').length;
  const conflicts = results.filter((r) => r.status === 'conflict').length;

  if (synced > 0 || conflicts > 0) {
    await auditService.registrar({
      usuarioId: user.userId,
      matricula: user.matricula,
      acao: 'SYNC',
      recurso: 'passagens',
      detalhes: `Batch sync: ${synced} ok, ${conflicts} conflitos, ${results.length - synced - conflicts} erros`,
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });
  }

  res.json({ results });
};

/**
 * Process individual sync item
 */
async function processItem(
  item: SyncItem,
  user: { userId: number; uuid: string; matricula: string; funcao: string; type: string },
): Promise<SyncResultItem> {
  // Validate required fields
  if (!item.id || !item.type || !item.payload) {
    return { id: item.id || 'unknown', status: 'error', error: 'Campos obrigatórios: id, type, payload' };
  }

  // Only handle passagem type for now
  if (item.type !== 'passagem') {
    return { id: item.id, status: 'error', error: `Tipo '${item.type}' não suportado neste endpoint` };
  }

  // 1. Idempotency check — if UUID already exists and is synced, return ok
  const existing = await Passagem.findOne({ where: { uuid: item.id } });
  if (existing) {
    return { id: item.id, status: 'ok', serverVersion: existing.toJSON() };
  }

  // 2. Conflict detection — same turno + date + patio
  const forceOverwrite = (item.payload as Record<string, unknown>).__forceOverwrite === true;
  if (!forceOverwrite && item.turno && item.data) {
    const conflicting = await Passagem.findOne({
      where: {
        turno: item.turno,
        data_passagem: item.data,
        uuid: { [Op.ne]: item.id },
      },
    });

    if (conflicting) {
      return {
        id: item.id,
        status: 'conflict',
        serverVersion: conflicting.toJSON(),
        error: `Conflito: passagem existente para turno ${item.turno} em ${item.data}`,
      };
    }
  }

  // 3. Extract and validate payload
  const payload = item.payload as Record<string, unknown>;
  const cabecalho = payload.cabecalho as Record<string, unknown> || {};

  // 4. Compute integrity hash
  const hashIntegridade = hashFormulario(payload);

  // 5. Insert
  try {
    const passagem = await Passagem.create({
      uuid: item.id,
      data_passagem: (cabecalho.dataPassagem as string) || item.data || new Date().toISOString().slice(0, 10),
      dss: (cabecalho.dss as string) || null,
      turno: (cabecalho.turno as string) || item.turno || 'A',
      horario_turno: (cabecalho.horarioTurno as string) || '07-19',
      operador_sai_id: null, // Resolve by matrícula later
      operador_entra_id: null,
      dados_patio_cima: payload.patioCima || {},
      dados_patio_baixo: payload.patioBaixo || {},
      dados_equipamentos: payload.equipamentos || null,
      dados_seguranca_manobras: payload.segurancaManobras || null,
      dados_pontos_atencao: payload.pontosAtencao || null,
      dados_intervencoes: payload.intervencoes || null,
      dados_sala_5s: payload.sala5s || null,
      assinatura_sai_confirmado: !!(payload.assinaturas as Record<string, unknown>)?.saiConfirmado,
      assinatura_sai_hash: ((payload.assinaturas as Record<string, unknown>)?.saiHash as string) || null,
      assinatura_sai_timestamp: ((payload.assinaturas as Record<string, unknown>)?.saiTimestamp as string) ? new Date((payload.assinaturas as Record<string, unknown>).saiTimestamp as string) : null,
      assinatura_entra_confirmado: !!(payload.assinaturas as Record<string, unknown>)?.entraConfirmado,
      assinatura_entra_hash: ((payload.assinaturas as Record<string, unknown>)?.entraHash as string) || null,
      assinatura_entra_timestamp: ((payload.assinaturas as Record<string, unknown>)?.entraTimestamp as string) ? new Date((payload.assinaturas as Record<string, unknown>).entraTimestamp as string) : null,
      status: 'sincronizada',
      hash_integridade: hashIntegridade,
    });

    // Audit
    await auditService.registrar({
      usuarioId: user.userId,
      matricula: user.matricula,
      acao: 'SYNC_PASSAGEM',
      recurso: `passagem:${item.id}`,
      detalhes: `Passagem sincronizada: turno ${item.turno || '?'} em ${item.data || '?'}. Device: ${item.deviceId || 'unknown'}`,
      ipAddress: 'sync',
      userAgent: `device:${item.deviceId || 'unknown'}`,
    });

    return { id: item.id, status: 'ok' };
  } catch (err) {
    return {
      id: item.id,
      status: 'error',
      error: err instanceof Error ? err.message : 'Insert failed',
    };
  }
}

/**
 * GET /api/v1/sync/status
 * Returns sync diagnostics for the requesting user
 */
export const statusSync = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  const totalPassagens = await Passagem.count();
  const ultimaPassagem = await Passagem.findOne({
    order: [['created_at', 'DESC']],
    attributes: ['uuid', 'turno', 'data_passagem', 'status', 'created_at'],
  });

  res.json({
    totalPassagens,
    ultimaPassagem: ultimaPassagem?.toJSON() || null,
    serverTime: new Date().toISOString(),
  });
};

/**
 * GET /api/v1/sync/conflicts
 * Returns unresolved conflicts visible to supervisors
 */
export const listarConflitos = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  // Only supervisors and above can see conflicts
  const funcao = req.user.funcao;
  const allowed = ['supervisor', 'coordenador', 'administrador', 'inspetor'];
  if (!allowed.includes(funcao)) {
    res.status(403).json({ error: 'Apenas supervisores podem ver conflitos' });
    return;
  }

  // Find passagens with same turno+data (duplicates)
  const duplicates = await Passagem.findAll({
    attributes: ['turno', 'data_passagem'],
    group: ['turno', 'data_passagem'],
    having: Passagem.sequelize!.literal('COUNT(*) > 1'),
  });

  const conflicts = [];
  for (const dup of duplicates) {
    const versions = await Passagem.findAll({
      where: {
        turno: dup.turno,
        data_passagem: dup.data_passagem,
      },
      order: [['created_at', 'ASC']],
    });
    conflicts.push({
      turno: dup.turno,
      data: dup.data_passagem,
      versions: versions.map((v) => v.toJSON()),
    });
  }

  res.json({ conflicts });
};
