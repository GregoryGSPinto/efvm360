// ============================================================================
// EFVM360 v3.2 — Sync Engine
// ============================================================================
//
// ADR-007: Estratégia de Sincronização — Offline-First
//
//   Problema: Pátio ferroviário tem conectividade intermitente.
//   Operador não pode esperar rede para registrar passagem de turno.
//
//   Estratégia: Store-and-Forward
//   1. Passagem é salva LOCALMENTE primeiro (IndexedDB) com UUID e HMAC
//   2. Engine tenta sincronizar quando há rede
//   3. Se falha → exponential backoff (2s, 4s, 8s, 16s... max 5min)
//   4. Se conflito → marca para revisão do supervisor
//   5. Nunca perde dados — passagem local persiste até sync confirmado
//
//   Alternativas descartadas:
//   - Sync síncrono: bloqueia UI, falha se sem rede
//   - CRDT: passagem é write-once após assinatura, não precisa merge
//   - WebSocket: complexidade desnecessária para ~50 passagens/dia
//   - Background Sync API: suporte limitado, não funciona em iOS
//
//   Trade-off aceito:
//   - Possível ver passagem no dispositivo A que não aparece no B
//     por alguns minutos → aceitável porque troca de turno é 1x a cada 12h
//
// ============================================================================

import { syncStore } from './syncStore';
import type { SyncQueueItem, SyncItemType, SyncConflict } from './syncStore';
import { gerarHMAC, gerarUUID } from './security';

// ── Configuration ───────────────────────────────────────────────────────

const CONFIG = {
  // Backoff: 2s, 4s, 8s, 16s, 32s, 60s, 120s, 300s (cap)
  INITIAL_BACKOFF_MS: 2_000,
  MAX_BACKOFF_MS: 5 * 60_000,        // 5 minutos
  BACKOFF_MULTIPLIER: 2,

  // Retry
  MAX_RETRIES: 20,                     // ~4h com backoff máximo

  // Batch
  BATCH_SIZE: 10,                      // Passagens por request

  // Polling
  POLL_INTERVAL_MS: 30_000,           // Checa fila a cada 30s quando online
  HEALTH_CHECK_INTERVAL_MS: 60_000,   // Checa server a cada 60s

  // Cleanup
  KEEP_SYNCED_FOR_MS: 24 * 60 * 60_000, // Mantém synced items por 24h
} as const;

// ── Types ───────────────────────────────────────────────────────────────

export interface SyncResult {
  synced: string[];          // UUIDs sincronizados com sucesso
  conflicts: string[];       // UUIDs com conflito detectado
  failed: string[];          // UUIDs que falharam (retry later)
  errors: Record<string, string>; // UUID → mensagem de erro
}

export interface SyncEngineState {
  isRunning: boolean;
  isSyncing: boolean;
  isOnline: boolean;
  pendingCount: number;
  conflictCount: number;
  lastSync: string | null;
  lastError: string | null;
}

type SyncEventType =
  | 'state-change'
  | 'sync-start'
  | 'sync-complete'
  | 'sync-error'
  | 'conflict-detected'
  | 'item-enqueued'
  | 'item-synced';

type SyncEventListener = (event: SyncEventType, data?: unknown) => void;

// ── API Interface ───────────────────────────────────────────────────────
// Abstracted so we can swap between real HTTP and mock for testing

export interface SyncApiAdapter {
  isServerReachable(): Promise<boolean>;
  sendBatch(items: SyncQueueItem[]): Promise<{
    results: Array<{
      id: string;
      status: 'ok' | 'conflict' | 'error';
      serverVersion?: unknown;
      error?: string;
    }>;
  }>;
}

// ── Default HTTP Adapter ────────────────────────────────────────────────

class HttpSyncAdapter implements SyncApiAdapter {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || import.meta.env?.VITE_API_URL || '/api/v1';
  }

  async isServerReachable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch(`${this.baseUrl}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      return resp.ok;
    } catch {
      return false;
    }
  }

  async sendBatch(items: SyncQueueItem[]): Promise<{
    results: Array<{
      id: string;
      status: 'ok' | 'conflict' | 'error';
      serverVersion?: unknown;
      error?: string;
    }>;
  }> {
    const token = localStorage.getItem('efvm360_access_token');
    const resp = await fetch(`${this.baseUrl}/sync/passagens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        items: items.map((i) => ({
          id: i.id,
          type: i.type,
          payload: i.payload,
          hmac: i.hmac,
          createdAt: i.createdAt,
          turno: i.turno,
          data: i.data,
          deviceId: i.deviceId,
        })),
      }),
    });

    if (!resp.ok) {
      throw new Error(`Sync API error: ${resp.status} ${resp.statusText}`);
    }

    return await resp.json();
  }
}

// ── Sync Engine ─────────────────────────────────────────────────────────

class SyncEngine {
  private api: SyncApiAdapter;
  private listeners: Set<SyncEventListener> = new Set();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private healthTimer: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;
  private isRunning = false;
  private isOnline = navigator.onLine;

  constructor(api?: SyncApiAdapter) {
    this.api = api || new HttpSyncAdapter();

    // Listen for network changes
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  // ── Lifecycle ───────────────────────────────────────────────────────

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Poll for pending items
    this.pollTimer = setInterval(() => this.processQueue(), CONFIG.POLL_INTERVAL_MS);

    // Health check
    this.healthTimer = setInterval(() => this.checkHealth(), CONFIG.HEALTH_CHECK_INTERVAL_MS);

    // Initial sync attempt
    this.processQueue();
    this.emit('state-change');
  }

  stop(): void {
    this.isRunning = false;
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
    if (this.healthTimer) { clearInterval(this.healthTimer); this.healthTimer = null; }
    this.emit('state-change');
  }

  // ── Enqueue ─────────────────────────────────────────────────────────
  //
  // Chamado por useFormulario.salvarPassagem()
  // Gera UUID e HMAC no momento da criação — imutável depois disso
  //

  async enqueue(
    type: SyncItemType,
    payload: unknown,
    meta?: { turno?: string; data?: string },
  ): Promise<string> {
    const id = gerarUUID();
    const payloadStr = JSON.stringify(payload);
    const hmac = await gerarHMAC(payloadStr);

    const item: SyncQueueItem = {
      id,
      type,
      status: 'pending',
      payload,
      hmac,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0,
      turno: meta?.turno,
      data: meta?.data,
      deviceId: await this.getDeviceId(),
    };

    await syncStore.enqueue(item);
    this.emit('item-enqueued', { id, type });

    // Trigger immediate sync if online
    if (this.isOnline && !this.isSyncing) {
      this.processQueue();
    }

    return id;
  }

  // ── Process Queue ───────────────────────────────────────────────────
  //
  // ADR-008: Exponential Backoff com Jitter
  //
  //   Por que backoff? Evita thundering herd quando rede volta.
  //   20 dispositivos reconectando ao mesmo tempo = DDoS no próprio server.
  //
  //   Por que jitter? Items com mesmo retryCount teriam mesmo delay.
  //   Jitter de ±25% espalha as requests.
  //
  //   Sequência: 2s → 4s → 8s → 16s → 32s → 60s → 120s → 300s (cap)
  //

  async processQueue(): Promise<SyncResult | null> {
    if (this.isSyncing || !this.isOnline || !this.isRunning) return null;

    const pending = await syncStore.getPending();
    if (pending.length === 0) return null;

    // Filter items ready for retry (respect backoff)
    const now = Date.now();
    const ready = pending.filter((item) => {
      if (item.retryCount === 0) return true;
      const backoff = this.calculateBackoff(item.retryCount);
      const lastAttempt = new Date(item.updatedAt).getTime();
      return now - lastAttempt >= backoff;
    });

    if (ready.length === 0) return null;

    // Take batch
    const batch = ready.slice(0, CONFIG.BATCH_SIZE);

    this.isSyncing = true;
    this.emit('sync-start', { count: batch.length });

    const result: SyncResult = {
      synced: [], conflicts: [], failed: [], errors: {},
    };

    try {
      // Mark as syncing
      for (const item of batch) {
        await syncStore.updateStatus(item.id, 'syncing');
      }

      // Check server reachability first
      const reachable = await this.api.isServerReachable();
      if (!reachable) {
        // Revert to pending
        for (const item of batch) {
          await syncStore.updateStatus(item.id, 'pending');
        }
        this.emit('sync-error', { error: 'Server unreachable' });
        return null;
      }

      // Send batch
      const response = await this.api.sendBatch(batch);

      // Process results
      for (const r of response.results) {
        switch (r.status) {
          case 'ok':
            await syncStore.updateStatus(r.id, 'synced');
            result.synced.push(r.id);
            this.emit('item-synced', { id: r.id });
            break;

          case 'conflict':
            await syncStore.updateStatus(r.id, 'conflict');
            result.conflicts.push(r.id);

            // Store conflict details
            const localItem = batch.find((i) => i.id === r.id);
            if (localItem) {
              const conflict: SyncConflict = {
                id: gerarUUID(),
                localItem,
                serverItem: r.serverVersion,
                detectedAt: new Date().toISOString(),
              };
              await syncStore.addConflict(conflict);
              this.emit('conflict-detected', { conflictId: conflict.id, itemId: r.id });
            }
            break;

          case 'error':
            if (batch.find((i) => i.id === r.id)!.retryCount >= CONFIG.MAX_RETRIES) {
              await syncStore.updateStatus(r.id, 'failed', r.error);
            } else {
              await syncStore.updateStatus(r.id, 'pending', r.error);
            }
            result.failed.push(r.id);
            result.errors[r.id] = r.error || 'Unknown error';
            break;
        }
      }

      // Update last sync timestamp
      await syncStore.setMeta('lastSuccessfulSync', new Date().toISOString());
      this.emit('sync-complete', result);

    } catch (err) {
      // Network error — revert all to pending
      for (const item of batch) {
        await syncStore.updateStatus(item.id, 'pending',
          err instanceof Error ? err.message : 'Sync failed');
      }
      result.failed = batch.map((i) => i.id);
      this.emit('sync-error', { error: err instanceof Error ? err.message : 'Unknown' });

    } finally {
      this.isSyncing = false;
      this.emit('state-change');
    }

    // Cleanup old synced items
    await this.cleanup();

    return result;
  }

  // ── Force Sync ──────────────────────────────────────────────────────

  async forceSync(): Promise<SyncResult | null> {
    // Reset all failed items to pending
    const failed = await syncStore.getByStatus('failed');
    for (const item of failed) {
      await syncStore.updateStatus(item.id, 'pending');
    }
    return this.processQueue();
  }

  // ── Conflict Resolution ─────────────────────────────────────────────
  //
  // ADR-009: Resolução de Conflitos — Manual por Supervisor
  //
  //   Problema: Dois dispositivos registram passagem para mesmo turno/data.
  //   Isso é RARO (1 operador por turno) mas pode acontecer se:
  //   - Operador troca de dispositivo durante turno
  //   - Dispositivo A ficou offline, operador usou dispositivo B
  //
  //   Por que não merge automático?
  //   Troca de turno é documento legal com assinatura.
  //   Merge criaria documento que ninguém assinou = inválido.
  //
  //   Estratégia:
  //   1. Server detecta: mesmo pátio + mesmo turno + mesma data
  //   2. Ambas versões são preservadas (nunca perder dados)
  //   3. Supervisor visualiza as duas e escolhe a oficial
  //   4. A outra fica no audit trail como "versão descartada"
  //

  async resolveConflict(
    conflictId: string,
    resolution: 'local' | 'server',
    resolvedBy: string,
  ): Promise<void> {
    await syncStore.resolveConflict(conflictId, resolution, resolvedBy);

    const conflicts = await syncStore.getUnresolvedConflicts();
    const conflict = conflicts.find((c) => c.id === conflictId);

    if (conflict && resolution === 'local') {
      // Re-enqueue local version with force flag
      const item = conflict.localItem;
      item.status = 'pending';
      item.retryCount = 0;
      (item.payload as Record<string, unknown>).__conflictResolution = 'local_wins';
      await syncStore.enqueue(item);
    }

    this.emit('state-change');
  }

  // ── State ───────────────────────────────────────────────────────────

  async getState(): Promise<SyncEngineState> {
    const counts = await syncStore.countByStatus();
    const conflicts = await syncStore.getUnresolvedConflicts();
    const lastSync = await syncStore.getMeta('lastSuccessfulSync');
    const lastError = await syncStore.getMeta('lastError');

    return {
      isRunning: this.isRunning,
      isSyncing: this.isSyncing,
      isOnline: this.isOnline,
      pendingCount: counts.pending + counts.syncing,
      conflictCount: conflicts.length,
      lastSync,
      lastError,
    };
  }

  // ── Events ──────────────────────────────────────────────────────────

  on(listener: SyncEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: SyncEventType, data?: unknown): void {
    this.listeners.forEach((fn) => {
      try { fn(event, data); } catch { /* listener error, ignore */ }
    });
  }

  // ── Private ─────────────────────────────────────────────────────────

  private calculateBackoff(retryCount: number): number {
    const base = CONFIG.INITIAL_BACKOFF_MS * Math.pow(CONFIG.BACKOFF_MULTIPLIER, retryCount - 1);
    const capped = Math.min(base, CONFIG.MAX_BACKOFF_MS);
    // Jitter ±25%
    const jitter = capped * (0.75 + Math.random() * 0.5);
    return Math.floor(jitter);
  }

  private async checkHealth(): Promise<void> {
    try {
      const wasOnline = this.isOnline;
      const reachable = await this.api.isServerReachable();

      if (!wasOnline && reachable) {
        this.isOnline = true;
        this.emit('state-change');
        this.processQueue(); // Trigger sync when server comes back
      } else if (wasOnline && !reachable) {
        this.isOnline = false;
        this.emit('state-change');
      }
    } catch {
      // Health check failed silently
    }
  }

  private handleOnline(): void {
    this.isOnline = true;
    this.emit('state-change');
    // Immediate sync attempt when network returns
    setTimeout(() => this.processQueue(), 1000);
  }

  private handleOffline(): void {
    this.isOnline = false;
    this.emit('state-change');
  }

  private async cleanup(): Promise<void> {
    try {
      // Remove items synced > 24h ago
      const synced = await syncStore.getByStatus('synced');
      const cutoff = Date.now() - CONFIG.KEEP_SYNCED_FOR_MS;

      for (const item of synced) {
        if (new Date(item.updatedAt).getTime() < cutoff) {
          await syncStore.updateStatus(item.id, 'synced'); // no-op for status
          // Actually delete via store
        }
      }
      await syncStore.removeSynced();
    } catch {
      // Cleanup is best-effort
    }
  }

  private async getDeviceId(): Promise<string> {
    let deviceId = await syncStore.getMeta('deviceId');
    if (!deviceId) {
      deviceId = gerarUUID();
      await syncStore.setMeta('deviceId', deviceId);
    }
    return deviceId;
  }

  // ── Testing / Adapter swap ──────────────────────────────────────────

  setAdapter(api: SyncApiAdapter): void {
    this.api = api;
  }
}

// ── Singleton ───────────────────────────────────────────────────────────
// Single engine instance per app lifetime

export const syncEngine = new SyncEngine();
export default syncEngine;
