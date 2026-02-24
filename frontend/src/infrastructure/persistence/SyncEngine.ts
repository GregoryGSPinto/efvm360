// ============================================================================
// EFVM PÁTIO 360 — Sync Engine
// Motor de sincronização: batch push, retry, conflict detection
// ============================================================================

import { getSyncQueue, getEventStore } from './IndexedDBEventStore';
import type { DomainEvent } from '../../domain/events/ServicePassEvents';
import type { UUID } from '../../domain/contracts';
import { secureLog } from '../../services/security';

// ── Config ──────────────────────────────────────────────────────────────

const SYNC_BATCH_SIZE = 50;
const SYNC_INTERVAL_MS = 30_000;       // 30 segundos
const API_ENDPOINT = '/api/v1/sync/events';

// ── Types ───────────────────────────────────────────────────────────────

interface SyncResult {
  synced: UUID[];
  conflicts: UUID[];
  failed: UUID[];
  errors: Record<UUID, string>;
}

type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';
type SyncListener = (status: SyncStatus, pending: number) => void;

// ── Sync Engine ─────────────────────────────────────────────────────────

class EventSyncEngine {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private status: SyncStatus = 'idle';
  private listeners: Set<SyncListener> = new Set();

  /** Registra listener para mudanças de status */
  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Inicia sync automático por intervalo */
  start(): void {
    if (this.intervalId) return;

    // Sync imediato
    this.syncNow();

    // Sync periódico
    this.intervalId = setInterval(() => {
      if (navigator.onLine) {
        this.syncNow();
      } else {
        this.setStatus('offline');
      }
    }, SYNC_INTERVAL_MS);

    // Sync quando voltar online
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // [DEBUG] console.log('[SyncEngine] ✅ Iniciado — intervalo:', SYNC_INTERVAL_MS, 'ms');
  }

  /** Para sync automático */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    // [DEBUG] console.log('[SyncEngine] ⏹️ Parado');
  }

  /** Executa sync manual imediato */
  async syncNow(): Promise<SyncResult> {
    if (!navigator.onLine) {
      this.setStatus('offline');
      return { synced: [], conflicts: [], failed: [], errors: {} };
    }

    if (this.status === 'syncing') {
      return { synced: [], conflicts: [], failed: [], errors: {} };
    }

    const syncQueue = getSyncQueue();
    const pendingEvents = await syncQueue.getPending(SYNC_BATCH_SIZE);

    if (pendingEvents.length === 0) {
      this.setStatus('idle');
      return { synced: [], conflicts: [], failed: [], errors: {} };
    }

    this.setStatus('syncing');
    // [DEBUG] console.log(`[SyncEngine] 📤 Sincronizando ${pendingEvents.length} eventos...`);

    try {
      // Marcar como syncing
      const eventIds = pendingEvents.map(e => e.eventId);
      await syncQueue.markSyncing(eventIds);

      // Enviar batch para servidor
      const result = await this.pushBatch(pendingEvents);

      // Processar resultados
      for (const id of result.synced) {
        await syncQueue.markSynced(id);
      }

      for (const id of result.conflicts) {
        await syncQueue.markConflict(id, result.errors[id] || 'Conflict detected');
      }

      // Cleanup entradas antigas
      await syncQueue.cleanup();

      this.setStatus(result.conflicts.length > 0 ? 'error' : 'idle');
      // [DEBUG] console.log(`[SyncEngine] ✅ Sync completo: ${result.synced.length} OK, ${result.conflicts.length} conflitos, ${result.failed.length} falhas`);

      return result;
    } catch (error) {
      secureLog.error('[SyncEngine] Erro no sync:', error);
      this.setStatus('error');
      return {
        synced: [],
        conflicts: [],
        failed: pendingEvents.map(e => e.eventId),
        errors: {},
      };
    }
  }

  /** Enfileira evento para sync */
  async enqueueEvent(event: DomainEvent): Promise<void> {
    const eventStore = getEventStore();
    const syncQueue = getSyncQueue();

    // Persistir no EventStore local (source of truth)
    await eventStore.append(event);

    // Enfileirar para sync
    await syncQueue.enqueue(event);

    // Notificar listeners
    const pending = await syncQueue.countPending();
    this.notifyListeners(pending);

    // Tentar sync imediato se online
    if (navigator.onLine) {
      // Debounce: aguardar 2s antes de sync
      setTimeout(() => this.syncNow(), 2000);
    }
  }

  /** Status atual */
  getStatus(): SyncStatus {
    return this.status;
  }

  /** Conta eventos pendentes */
  async getPendingCount(): Promise<number> {
    return getSyncQueue().countPending();
  }

  // ── Private ─────────────────────────────────────────────────────────

  private async pushBatch(events: DomainEvent[]): Promise<SyncResult> {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': this.getDeviceId(),
      },
      body: JSON.stringify({
        events: events.map(e => ({
          eventId: e.eventId,
          aggregateId: e.aggregateId,
          aggregateType: e.aggregateType,
          eventType: e.eventType,
          version: e.version,
          payload: e.payload,
          metadata: {
            timestamp: e.timestamp,
            operatorMatricula: e.operatorMatricula,
            deviceId: e.deviceId,
            yardId: e.yardId,
          },
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      synced: data.synced || [],
      conflicts: data.conflicts || [],
      failed: data.failed || [],
      errors: data.errors || {},
    };
  }

  private getDeviceId(): string {
    let deviceId = localStorage.getItem('efvm360_device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('efvm360_device_id', deviceId);
    }
    return deviceId;
  }

  private handleOnline = (): void => {
    // [DEBUG] console.log('[SyncEngine] 🌐 Online — sincronizando...');
    this.syncNow();
  };

  private handleOffline = (): void => {
    // [DEBUG] console.log('[SyncEngine] 📴 Offline');
    this.setStatus('offline');
  };

  private setStatus(status: SyncStatus): void {
    this.status = status;
    this.notifyListeners();
  }

  private async notifyListeners(pendingOverride?: number): Promise<void> {
    const pending = pendingOverride ?? await this.getPendingCount();
    this.listeners.forEach(fn => fn(this.status, pending));
  }
}

// ── Singleton ───────────────────────────────────────────────────────────

let _engine: EventSyncEngine | null = null;

export function getSyncEngine(): EventSyncEngine {
  if (!_engine) _engine = new EventSyncEngine();
  return _engine;
}
