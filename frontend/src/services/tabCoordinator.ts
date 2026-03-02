// ============================================================================
// EFVM360 v3.2 — Tab Coordinator Service
// Prevents race conditions when multiple tabs access IndexedDB sync
// Uses BroadcastChannel with localStorage fallback
// ============================================================================

// ── Types ───────────────────────────────────────────────────────────────

export type TabMessageType =
  | 'SYNC_STARTED'
  | 'SYNC_COMPLETED'
  | 'DATA_CHANGED'
  | 'TAB_ACTIVE'
  | 'TAB_CLOSED';

export interface TabMessage {
  type: TabMessageType;
  tabId: string;
  timestamp: number;
  payload?: unknown;
}

type MessageHandler = (message: TabMessage) => void;

// ── Constants ───────────────────────────────────────────────────────────

const CHANNEL_NAME = 'efvm360-sync';
const TABS_REGISTRY_KEY = 'efvm360-tabs-registry';
const LS_MESSAGE_KEY = 'efvm360-tab-message';
const HEARTBEAT_MS = 5_000;
const STALE_TAB_MS = 15_000;

// ── Tab Coordinator ─────────────────────────────────────────────────────

export class TabCoordinator {
  readonly tabId: string;
  private channel: BroadcastChannel | null = null;
  private useFallback: boolean;
  private handlers: Set<MessageHandler> = new Set();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;

  constructor() {
    this.tabId = this.generateTabId();
    this.useFallback = typeof BroadcastChannel === 'undefined';

    if (!this.useFallback) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event: MessageEvent<TabMessage>) => {
        this.notifyHandlers(event.data);
      };
    } else {
      this.setupLocalStorageFallback();
    }

    this.registerTab();
    this.startHeartbeat();
  }

  // ── Public API ──────────────────────────────────────────────────────

  /**
   * Returns true if this tab is the elected leader (lowest tabId among active tabs).
   * Only the leader should execute sync operations.
   */
  isLeader(): boolean {
    const tabs = this.getActiveTabs();
    if (tabs.length === 0) return true;
    const sorted = tabs.sort((a, b) => a.localeCompare(b));
    return sorted[0] === this.tabId;
  }

  /**
   * Broadcast a message to all other tabs.
   */
  broadcast(type: TabMessageType, payload?: unknown): void {
    if (this.destroyed) return;

    const message: TabMessage = {
      type,
      tabId: this.tabId,
      timestamp: Date.now(),
      payload,
    };

    if (this.channel) {
      this.channel.postMessage(message);
    } else {
      // localStorage fallback: write message so 'storage' event fires in other tabs
      try {
        localStorage.setItem(LS_MESSAGE_KEY, JSON.stringify(message));
      } catch {
        // Storage full or unavailable — silently fail
      }
    }
  }

  /**
   * Register a handler for messages from other tabs.
   * Returns an unsubscribe function.
   */
  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  /**
   * Returns the number of currently active tabs (including this one).
   */
  getTabCount(): number {
    return this.getActiveTabs().length;
  }

  /**
   * Cleanup: unregister tab, close channel, stop heartbeat.
   */
  destroy(): void {
    if (this.destroyed) return;

    this.broadcast('TAB_CLOSED');
    this.destroyed = true;
    this.unregisterTab();

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.channel) {
      this.channel.onmessage = null;
      this.channel.close();
      this.channel = null;
    }

    if (this.useFallback && typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageHandler);
    }

    this.handlers.clear();
  }

  // ── Private ─────────────────────────────────────────────────────────

  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private registerTab(): void {
    const tabs = this.getTabRegistry();
    tabs[this.tabId] = Date.now();
    this.saveTabRegistry(tabs);
    this.broadcast('TAB_ACTIVE');
  }

  private unregisterTab(): void {
    const tabs = this.getTabRegistry();
    delete tabs[this.tabId];
    this.saveTabRegistry(tabs);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.destroyed) return;
      const tabs = this.getTabRegistry();
      tabs[this.tabId] = Date.now();

      // Prune stale tabs
      const now = Date.now();
      for (const id of Object.keys(tabs)) {
        if (now - tabs[id] > STALE_TAB_MS) {
          delete tabs[id];
        }
      }

      this.saveTabRegistry(tabs);
    }, HEARTBEAT_MS);
  }

  private getTabRegistry(): Record<string, number> {
    try {
      const raw = localStorage.getItem(TABS_REGISTRY_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private saveTabRegistry(tabs: Record<string, number>): void {
    try {
      localStorage.setItem(TABS_REGISTRY_KEY, JSON.stringify(tabs));
    } catch {
      // Storage full or unavailable
    }
  }

  private getActiveTabs(): string[] {
    const tabs = this.getTabRegistry();
    const now = Date.now();
    return Object.entries(tabs)
      .filter(([, ts]) => now - ts < STALE_TAB_MS)
      .map(([id]) => id);
  }

  private notifyHandlers(message: TabMessage): void {
    // Ignore messages from self
    if (message.tabId === this.tabId) return;
    this.handlers.forEach((handler) => {
      try {
        handler(message);
      } catch {
        // Handler error — ignore to protect other handlers
      }
    });
  }

  // ── localStorage fallback ───────────────────────────────────────────

  private storageHandler = (event: StorageEvent): void => {
    if (event.key !== LS_MESSAGE_KEY || !event.newValue) return;
    try {
      const message: TabMessage = JSON.parse(event.newValue);
      this.notifyHandlers(message);
    } catch {
      // Malformed message — ignore
    }
  };

  private setupLocalStorageFallback(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.storageHandler);
    }
  }
}
