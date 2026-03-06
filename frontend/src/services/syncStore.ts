// ============================================================================
// EFVM360 v3.2 — IndexedDB Sync Store
// ============================================================================
//
// ADR-006: Por que IndexedDB e não localStorage?
//
//   localStorage: 5MB limit, synchronous (bloqueia UI), sem transações
//   IndexedDB:    centenas de MB, async, transações ACID, índices
//
//   Para sync queue de infraestrutura crítica, precisamos:
//   1. Capacidade: uma passagem com fotos/anexos pode ter 500KB+
//   2. Confiabilidade: transação falha → rollback, não corrompe fila
//   3. Performance: escrita async não trava UI durante troca de turno
//   4. Consulta: buscar por status, data, turno sem deserializar tudo
//
//   Trade-off: IndexedDB API é complexa → encapsulamos completamente
//   aqui, consumers usam interface limpa via SyncEngine
//
// ============================================================================

const DB_NAME = 'efvm360_sync';
const DB_VERSION = 1;

// ── Stores ──────────────────────────────────────────────────────────────

const STORES = {
  QUEUE: 'sync_queue',       // Passagens pendentes de sync
  CONFLICTS: 'sync_conflicts', // Conflitos detectados pelo server
  META: 'sync_meta',          // Metadata (last sync, device fingerprint)
} as const;

// ── Types ───────────────────────────────────────────────────────────────

export type SyncItemStatus = 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';
export type SyncItemType = 'passagem' | 'assinatura' | 'dss' | 'audit';

export interface SyncQueueItem {
  id: string;                  // UUID v4 (gerado no client no momento da criação)
  type: SyncItemType;
  status: SyncItemStatus;
  payload: unknown;            // Dados da passagem/assinatura/DSS
  hmac: string;                // HMAC-SHA256 do payload para integridade
  createdAt: string;           // ISO timestamp (device clock)
  updatedAt: string;           // Última tentativa de sync
  retryCount: number;          // Tentativas de envio
  lastError?: string;          // Último erro do server
  turno?: string;              // Para detecção de conflito (turno+data+patio)
  data?: string;               // Data da passagem (YYYY-MM-DD)
  deviceId?: string;           // Fingerprint do dispositivo
}

export interface SyncConflict {
  id: string;
  localItem: SyncQueueItem;
  serverItem: unknown;         // Versão do server
  detectedAt: string;
  resolvedAt?: string;
  resolution?: 'local' | 'server' | 'manual';
  resolvedBy?: string;         // Matrícula de quem resolveu
}

export interface SyncMeta {
  key: string;
  value: string;
}

// ── Database Connection ─────────────────────────────────────────────────

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Queue store — indexed by status and type for fast queries
      if (!db.objectStoreNames.contains(STORES.QUEUE)) {
        const queueStore = db.createObjectStore(STORES.QUEUE, { keyPath: 'id' });
        queueStore.createIndex('by_status', 'status', { unique: false });
        queueStore.createIndex('by_type', 'type', { unique: false });
        queueStore.createIndex('by_turno_data', ['turno', 'data'], { unique: false });
        queueStore.createIndex('by_createdAt', 'createdAt', { unique: false });
      }

      // Conflicts store
      if (!db.objectStoreNames.contains(STORES.CONFLICTS)) {
        const conflictStore = db.createObjectStore(STORES.CONFLICTS, { keyPath: 'id' });
        conflictStore.createIndex('by_resolved', 'resolvedAt', { unique: false });
      }

      // Meta store (key-value)
      if (!db.objectStoreNames.contains(STORES.META)) {
        db.createObjectStore(STORES.META, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;

      // Handle connection loss (e.g. storage pressure)
      dbInstance.onclose = () => { dbInstance = null; };
      dbInstance.onversionchange = () => { dbInstance?.close(); dbInstance = null; };

      resolve(dbInstance);
    };

    request.onerror = () => reject(new Error(`IndexedDB open failed: ${request.error?.message}`));
  });
}

// ── Generic Transaction Helper ──────────────────────────────────────────

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = callback(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(`IndexedDB error: ${request.error?.message}`));
    tx.onerror = () => reject(new Error(`Transaction error: ${tx.error?.message}`));
  });
}

async function withStoreAll<T>(
  storeName: string,
  callback: (store: IDBObjectStore) => IDBRequest<T[]>,
): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = callback(store);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(new Error(`IndexedDB error: ${request.error?.message}`));
  });
}

// ── Queue Operations ────────────────────────────────────────────────────

export const syncStore = {

  // ── Enqueue ─────────────────────────────────────────────────────────
  async enqueue(item: SyncQueueItem): Promise<void> {
    await withStore(STORES.QUEUE, 'readwrite', (store) => store.put(item));
  },

  // ── Get by ID ───────────────────────────────────────────────────────
  async getById(id: string): Promise<SyncQueueItem | undefined> {
    return await withStore<SyncQueueItem | undefined>(
      STORES.QUEUE, 'readonly', (store) => store.get(id),
    );
  },

  // ── Get all pending ─────────────────────────────────────────────────
  async getPending(): Promise<SyncQueueItem[]> {
    return await withStoreAll<SyncQueueItem>(
      STORES.QUEUE,
      (store) => store.index('by_status').getAll('pending'),
    );
  },

  // ── Get all by status ───────────────────────────────────────────────
  async getByStatus(status: SyncItemStatus): Promise<SyncQueueItem[]> {
    return await withStoreAll<SyncQueueItem>(
      STORES.QUEUE,
      (store) => store.index('by_status').getAll(status),
    );
  },

  // ── Get all items ───────────────────────────────────────────────────
  async getAll(): Promise<SyncQueueItem[]> {
    return await withStoreAll<SyncQueueItem>(
      STORES.QUEUE,
      (store) => store.getAll(),
    );
  },

  // ── Update status ───────────────────────────────────────────────────
  async updateStatus(id: string, status: SyncItemStatus, error?: string): Promise<void> {
    const item = await this.getById(id);
    if (!item) return;

    item.status = status;
    item.updatedAt = new Date().toISOString();
    if (status === 'syncing') item.retryCount += 1;
    if (error) item.lastError = error;

    await this.enqueue(item);
  },

  // ── Remove synced ───────────────────────────────────────────────────
  async removeSynced(): Promise<number> {
    const synced = await this.getByStatus('synced');
    let count = 0;
    for (const item of synced) {
      await withStore(STORES.QUEUE, 'readwrite', (store) => store.delete(item.id));
      count++;
    }
    return count;
  },

  // ── Count by status ─────────────────────────────────────────────────
  async countByStatus(): Promise<Record<SyncItemStatus, number>> {
    const all = await this.getAll();
    const counts: Record<SyncItemStatus, number> = {
      pending: 0, syncing: 0, synced: 0, conflict: 0, failed: 0,
    };
    for (const item of all) {
      counts[item.status] = (counts[item.status] || 0) + 1;
    }
    return counts;
  },

  // ── Check for conflict (same turno + data) ──────────────────────────
  async findConflictCandidates(turno: string, data: string): Promise<SyncQueueItem[]> {
    return await withStoreAll<SyncQueueItem>(
      STORES.QUEUE,
      (store) => store.index('by_turno_data').getAll([turno, data]),
    );
  },

  // ── Conflicts ───────────────────────────────────────────────────────
  async addConflict(conflict: SyncConflict): Promise<void> {
    await withStore(STORES.CONFLICTS, 'readwrite', (store) => store.put(conflict));
  },

  async getUnresolvedConflicts(): Promise<SyncConflict[]> {
    const all = await withStoreAll<SyncConflict>(
      STORES.CONFLICTS,
      (store) => store.getAll(),
    );
    return all.filter((c) => !c.resolvedAt);
  },

  async resolveConflict(id: string, resolution: SyncConflict['resolution'], resolvedBy: string): Promise<void> {
    const conflict = await withStore<SyncConflict | undefined>(
      STORES.CONFLICTS, 'readonly', (store) => store.get(id),
    );
    if (!conflict) return;

    conflict.resolvedAt = new Date().toISOString();
    conflict.resolution = resolution;
    conflict.resolvedBy = resolvedBy;

    await withStore(STORES.CONFLICTS, 'readwrite', (store) => store.put(conflict));
  },

  // ── Meta ────────────────────────────────────────────────────────────
  async getMeta(key: string): Promise<string | null> {
    const result = await withStore<SyncMeta | undefined>(
      STORES.META, 'readonly', (store) => store.get(key),
    );
    return result?.value ?? null;
  },

  async setMeta(key: string, value: string): Promise<void> {
    await withStore(STORES.META, 'readwrite', (store) => store.put({ key, value }));
  },

  // ── Diagnostics ─────────────────────────────────────────────────────
  async getDiagnostics(): Promise<{
    queueSize: number;
    counts: Record<SyncItemStatus, number>;
    unresolvedConflicts: number;
    lastSync: string | null;
    oldestPending: string | null;
  }> {
    const all = await this.getAll();
    const counts = await this.countByStatus();
    const conflicts = await this.getUnresolvedConflicts();
    const lastSync = await this.getMeta('lastSuccessfulSync');

    const pending = all.filter((i) => i.status === 'pending');
    const oldestPending = pending.length > 0
      ? pending.sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0].createdAt
      : null;

    return {
      queueSize: all.length,
      counts,
      unresolvedConflicts: conflicts.length,
      lastSync,
      oldestPending,
    };
  },

  // ── Clear all (for dev/testing) ─────────────────────────────────────
  async clearAll(): Promise<void> {
    const db = await openDB();
    const tx = db.transaction([STORES.QUEUE, STORES.CONFLICTS, STORES.META], 'readwrite');
    tx.objectStore(STORES.QUEUE).clear();
    tx.objectStore(STORES.CONFLICTS).clear();
    tx.objectStore(STORES.META).clear();
  },
};

export default syncStore;
