// ============================================================================
// EFVM PÁTIO 360 — IndexedDB Event Store
// Infraestrutura offline-first: Event Store, Snapshot Store, Sync Queue
// Implementa IEventStore, ISnapshotStore, ISyncQueue do domain/ports
// ============================================================================

import type { IEventStore, ISnapshotStore, ISyncQueue } from '../../domain/ports/IEventStore';
import type { DomainEvent } from '../../domain/events/ServicePassEvents';
import type { UUID } from '../../domain/contracts';

// ── Constants ───────────────────────────────────────────────────────────

const DB_NAME = 'efvm_patio360';
const DB_VERSION = 2;

// Store names
const EVENTS_STORE = 'events';
const SNAPSHOTS_STORE = 'snapshots';
const SYNC_QUEUE_STORE = 'sync_queue';
const YARD_CONFIG_STORE = 'yard_configs';

// ── Database Initialization ─────────────────────────────────────────────

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // ── Events Store (append-only) ────────────────────────────
      if (!db.objectStoreNames.contains(EVENTS_STORE)) {
        const eventStore = db.createObjectStore(EVENTS_STORE, { keyPath: 'eventId' });
        eventStore.createIndex('by_aggregate', 'aggregateId', { unique: false });
        eventStore.createIndex('by_aggregate_version', ['aggregateId', 'version'], { unique: true });
        eventStore.createIndex('by_type', 'eventType', { unique: false });
        eventStore.createIndex('by_timestamp', 'timestamp', { unique: false });
        eventStore.createIndex('by_yard', 'yardId', { unique: false });
      }

      // ── Snapshots Store ───────────────────────────────────────
      if (!db.objectStoreNames.contains(SNAPSHOTS_STORE)) {
        const snapshotStore = db.createObjectStore(SNAPSHOTS_STORE, { keyPath: 'aggregateId' });
        snapshotStore.createIndex('by_type', 'aggregateType', { unique: false });
      }

      // ── Sync Queue Store ──────────────────────────────────────
      if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        const syncStore = db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'eventId' });
        syncStore.createIndex('by_status', 'syncStatus', { unique: false });
        syncStore.createIndex('by_enqueued', 'enqueuedAt', { unique: false });
      }

      // ── Yard Config Cache ─────────────────────────────────────
      if (!db.objectStoreNames.contains(YARD_CONFIG_STORE)) {
        const yardStore = db.createObjectStore(YARD_CONFIG_STORE, { keyPath: 'yardCode' });
        yardStore.createIndex('by_type', 'yardType', { unique: false });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => reject(request.error);
  });
}

// ── Helper: Transaction wrapper ─────────────────────────────────────────

async function withTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = fn(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withTransactionAll<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T[]>,
): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = fn(store);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// ═══════════════════════════════════════════════════════════════════════
// EVENT STORE — Source of Truth (append-only)
// ═══════════════════════════════════════════════════════════════════════

export class IndexedDBEventStore implements IEventStore {

  async append(event: DomainEvent): Promise<void> {
    // Idempotência: verificar se evento já existe
    const exists = await this.eventExists(event.eventId);
    if (exists) return;

    await withTransaction(EVENTS_STORE, 'readwrite', (store) =>
      store.add(event)
    );
  }

  async appendBatch(events: DomainEvent[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(EVENTS_STORE, 'readwrite');
      const store = tx.objectStore(EVENTS_STORE);

      for (const event of events) {
        store.put(event); // put = upsert (idempotente)
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getEventsForAggregate(aggregateId: UUID): Promise<DomainEvent[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(EVENTS_STORE, 'readonly');
      const store = tx.objectStore(EVENTS_STORE);
      const index = store.index('by_aggregate');
      const request = index.getAll(aggregateId);
      request.onsuccess = () => {
        const events = (request.result || []) as DomainEvent[];
        // Ordenar por version
        events.sort((a, b) => a.version - b.version);
        resolve(events);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getEventsFromVersion(aggregateId: UUID, fromVersion: number): Promise<DomainEvent[]> {
    const allEvents = await this.getEventsForAggregate(aggregateId);
    return allEvents.filter(e => e.version >= fromVersion);
  }

  async getEventsByType(eventType: string, limit = 100): Promise<DomainEvent[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(EVENTS_STORE, 'readonly');
      const index = tx.objectStore(EVENTS_STORE).index('by_type');
      const request = index.getAll(eventType, limit);
      request.onsuccess = () => resolve((request.result || []) as DomainEvent[]);
      request.onerror = () => reject(request.error);
    });
  }

  async eventExists(eventId: UUID): Promise<boolean> {
    try {
      const result = await withTransaction(EVENTS_STORE, 'readonly', (store) =>
        store.get(eventId)
      );
      return result !== undefined;
    } catch {
      return false;
    }
  }

  async countEvents(aggregateId: UUID): Promise<number> {
    const events = await this.getEventsForAggregate(aggregateId);
    return events.length;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SNAPSHOT STORE — Performance (rebuilt every N events)
// ═══════════════════════════════════════════════════════════════════════

const SNAPSHOT_INTERVAL = 10; // Criar snapshot a cada 10 eventos

export class IndexedDBSnapshotStore implements ISnapshotStore {

  async save(
    aggregateId: UUID,
    aggregateType: string,
    version: number,
    state: unknown,
  ): Promise<void> {
    await withTransaction(SNAPSHOTS_STORE, 'readwrite', (store) =>
      store.put({
        aggregateId,
        aggregateType,
        version,
        state,
        snapshotAt: new Date().toISOString(),
      })
    );
  }

  async getLatest(aggregateId: UUID): Promise<{ version: number; state: unknown } | null> {
    try {
      const result = await withTransaction(SNAPSHOTS_STORE, 'readonly', (store) =>
        store.get(aggregateId)
      );
      if (!result) return null;
      return { version: (result as any).version, state: (result as any).state };
    } catch {
      return null;
    }
  }

  /** Verifica se é hora de criar novo snapshot */
  shouldSnapshot(eventCount: number): boolean {
    return eventCount > 0 && eventCount % SNAPSHOT_INTERVAL === 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SYNC QUEUE — Fila de eventos pendentes de sincronização
// ═══════════════════════════════════════════════════════════════════════

interface SyncQueueEntry {
  eventId: UUID;
  event: DomainEvent;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';
  enqueuedAt: string;
  lastAttemptAt: string | null;
  retryCount: number;
  lastError: string | null;
}

export class IndexedDBSyncQueue implements ISyncQueue {

  async enqueue(event: DomainEvent): Promise<void> {
    const entry: SyncQueueEntry = {
      eventId: event.eventId,
      event,
      syncStatus: 'pending',
      enqueuedAt: new Date().toISOString(),
      lastAttemptAt: null,
      retryCount: 0,
      lastError: null,
    };

    await withTransaction(SYNC_QUEUE_STORE, 'readwrite', (store) =>
      store.put(entry)
    );
  }

  async getPending(limit = 50): Promise<DomainEvent[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SYNC_QUEUE_STORE, 'readonly');
      const index = tx.objectStore(SYNC_QUEUE_STORE).index('by_status');
      const request = index.getAll('pending', limit);
      request.onsuccess = () => {
        const entries = (request.result || []) as SyncQueueEntry[];
        resolve(entries.map(e => e.event));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async markSynced(eventId: UUID): Promise<void> {
    await this.updateStatus(eventId, 'synced');
  }

  async markConflict(eventId: UUID, reason: string): Promise<void> {
    await this.updateStatus(eventId, 'conflict', reason);
  }

  async countPending(): Promise<number> {
    const pending = await this.getPending(9999);
    return pending.length;
  }

  /** Marca eventos como syncing antes de enviar batch */
  async markSyncing(eventIds: UUID[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(SYNC_QUEUE_STORE);

      for (const id of eventIds) {
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          if (getReq.result) {
            const entry = getReq.result as SyncQueueEntry;
            entry.syncStatus = 'syncing';
            entry.lastAttemptAt = new Date().toISOString();
            entry.retryCount++;
            store.put(entry);
          }
        };
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /** Remove entradas sincronizadas com mais de 24h */
  async cleanup(): Promise<number> {
    const db = await openDB();
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let removed = 0;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(SYNC_QUEUE_STORE);
      const request = store.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const entry = cursor.value as SyncQueueEntry;
          if (entry.syncStatus === 'synced' && entry.enqueuedAt < cutoff) {
            cursor.delete();
            removed++;
          }
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve(removed);
      tx.onerror = () => reject(tx.error);
    });
  }

  private async updateStatus(eventId: UUID, status: SyncQueueEntry['syncStatus'], error?: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(SYNC_QUEUE_STORE);
      const getReq = store.get(eventId);

      getReq.onsuccess = () => {
        if (getReq.result) {
          const entry = getReq.result as SyncQueueEntry;
          entry.syncStatus = status;
          entry.lastAttemptAt = new Date().toISOString();
          if (error) entry.lastError = error;
          store.put(entry);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// YARD CONFIG CACHE — Cache local de configurações de pátio
// ═══════════════════════════════════════════════════════════════════════

export class YardConfigCache {

  async save(config: unknown): Promise<void> {
    await withTransaction(YARD_CONFIG_STORE, 'readwrite', (store) =>
      store.put(config)
    );
  }

  async saveBatch(configs: unknown[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(YARD_CONFIG_STORE, 'readwrite');
      const store = tx.objectStore(YARD_CONFIG_STORE);
      for (const config of configs) {
        store.put(config);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getByCode(yardCode: string): Promise<unknown | null> {
    try {
      const result = await withTransaction(YARD_CONFIG_STORE, 'readonly', (store) =>
        store.get(yardCode)
      );
      return result || null;
    } catch {
      return null;
    }
  }

  async getAll(): Promise<unknown[]> {
    return withTransactionAll(YARD_CONFIG_STORE, 'readonly', (store) =>
      store.getAll()
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCES
// ═══════════════════════════════════════════════════════════════════════

let _eventStore: IndexedDBEventStore | null = null;
let _snapshotStore: IndexedDBSnapshotStore | null = null;
let _syncQueue: IndexedDBSyncQueue | null = null;
let _yardConfigCache: YardConfigCache | null = null;

export function getEventStore(): IndexedDBEventStore {
  if (!_eventStore) _eventStore = new IndexedDBEventStore();
  return _eventStore;
}

export function getSnapshotStore(): IndexedDBSnapshotStore {
  if (!_snapshotStore) _snapshotStore = new IndexedDBSnapshotStore();
  return _snapshotStore;
}

export function getSyncQueue(): IndexedDBSyncQueue {
  if (!_syncQueue) _syncQueue = new IndexedDBSyncQueue();
  return _syncQueue;
}

export function getYardConfigCache(): YardConfigCache {
  if (!_yardConfigCache) _yardConfigCache = new YardConfigCache();
  return _yardConfigCache;
}

/** Inicializa todos os stores — chamar no boot do app */
export async function initializeOfflineStores(): Promise<void> {
  await openDB();
  // [DEBUG] console.log('[EFVM360] ✅ Offline stores inicializados (IndexedDB)');
}
