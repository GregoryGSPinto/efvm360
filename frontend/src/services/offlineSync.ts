// ============================================================================
// EFVM360 v3.2 — Offline Sync Service
// Queues form submissions when offline, syncs when connection returns
// ============================================================================

const SYNC_QUEUE_KEY = 'vfz_sync_queue';
const SYNC_STATUS_KEY = 'vfz_sync_status';

export interface SyncItem {
  id: string;
  type: 'passagem' | 'assinatura' | 'dss';
  payload: unknown;
  timestamp: string;
  retries: number;
  status: 'pending' | 'syncing' | 'failed';
}

export interface SyncStatus {
  pendingCount: number;
  lastSync: string | null;
  lastError: string | null;
  isOnline: boolean;
}

// ── Queue Management ───────────────────────────────────────────────────

export function getQueue(): SyncItem[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: SyncItem[]): void {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  updateStatus();
}

export function addToQueue(type: SyncItem['type'], payload: unknown): string {
  const id = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const item: SyncItem = {
    id,
    type,
    payload,
    timestamp: new Date().toISOString(),
    retries: 0,
    status: 'pending',
  };

  const queue = getQueue();
  queue.push(item);
  saveQueue(queue);

  // Try immediate sync if online
  if (navigator.onLine) {
    processQueue().catch(() => {});
  }

  return id;
}

export function removeFromQueue(id: string): void {
  const queue = getQueue().filter(item => item.id !== id);
  saveQueue(queue);
}

// ── Sync Processing ────────────────────────────────────────────────────

const API_BASE = import.meta.env?.VITE_API_URL || 'http://localhost:3001';
const MAX_RETRIES = 3;

async function syncItem(item: SyncItem, token: string): Promise<boolean> {
  const endpoints: Record<string, string> = {
    passagem: '/api/v1/passagens',
    assinatura: '/api/v1/passagens/assinar',
    dss: '/api/v1/dss',
  };

  const url = `${API_BASE}${endpoints[item.type]}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(item.payload),
    });

    return res.ok;
  } catch {
    return false;
  }
}

export async function processQueue(): Promise<number> {
  const queue = getQueue();
  const pending = queue.filter(i => i.status === 'pending' || i.status === 'failed');

  if (pending.length === 0) return 0;

  const token = localStorage.getItem('vfz_token');
  if (!token) return 0;

  let synced = 0;

  for (const item of pending) {
    if (item.retries >= MAX_RETRIES) {
      item.status = 'failed';
      continue;
    }

    item.status = 'syncing';
    item.retries++;
    saveQueue(queue);

    const success = await syncItem(item, token);

    if (success) {
      removeFromQueue(item.id);
      synced++;
    } else {
      item.status = 'failed';
      saveQueue(queue);
    }
  }

  updateStatus(synced > 0 ? new Date().toISOString() : undefined);
  return synced;
}

// ── Status ─────────────────────────────────────────────────────────────

function updateStatus(lastSync?: string): void {
  const queue = getQueue();
  const status: SyncStatus = {
    pendingCount: queue.filter(i => i.status !== 'failed').length,
    lastSync: lastSync || getSyncStatus().lastSync,
    lastError: queue.find(i => i.status === 'failed') ? 'Falha na sincronização' : null,
    isOnline: navigator.onLine,
  };
  localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status));
}

export function getSyncStatus(): SyncStatus {
  try {
    const raw = localStorage.getItem(SYNC_STATUS_KEY);
    return raw ? JSON.parse(raw) : { pendingCount: 0, lastSync: null, lastError: null, isOnline: true };
  } catch {
    return { pendingCount: 0, lastSync: null, lastError: null, isOnline: true };
  }
}

// ── Auto-sync on connection restore ────────────────────────────────────

export function initOfflineSync(): () => void {
  const handler = () => {
    if (navigator.onLine) {
      // [DEBUG] console.log('[OfflineSync] Connection restored — syncing...');
      processQueue().then(count => {
        if (count > 0) { /* [DEBUG] console.log(`[OfflineSync] Synced ${count} items`); */ }
      });
    }
    updateStatus();
  };

  window.addEventListener('online', handler);
  window.addEventListener('offline', () => updateStatus());

  // Initial status
  updateStatus();

  return () => {
    window.removeEventListener('online', handler);
    window.removeEventListener('offline', () => updateStatus());
  };
}
