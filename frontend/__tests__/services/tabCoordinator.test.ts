// ============================================================================
// EFVM360 Frontend — Tests: TabCoordinator Service
// Multi-tab coordination with BroadcastChannel + localStorage fallback
// ============================================================================
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TabCoordinator } from '../../src/services/tabCoordinator';
import type { TabMessage, TabMessageType } from '../../src/services/tabCoordinator';

// ── Mock BroadcastChannel ───────────────────────────────────────────────

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];

  name: string;
  onmessage: ((event: MessageEvent<TabMessage>) => void) | null = null;
  closed = false;

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }

  postMessage(data: TabMessage): void {
    // Deliver to all other instances on the same channel
    MockBroadcastChannel.instances
      .filter((ch) => ch !== this && ch.name === this.name && !ch.closed)
      .forEach((ch) => {
        if (ch.onmessage) {
          ch.onmessage(new MessageEvent('message', { data }));
        }
      });
  }

  close(): void {
    this.closed = true;
    const idx = MockBroadcastChannel.instances.indexOf(this);
    if (idx >= 0) MockBroadcastChannel.instances.splice(idx, 1);
  }

  static reset(): void {
    MockBroadcastChannel.instances = [];
  }
}

// ── Setup / Teardown ────────────────────────────────────────────────────

let coordinators: TabCoordinator[] = [];

function createCoordinator(): TabCoordinator {
  const c = new TabCoordinator();
  coordinators.push(c);
  return c;
}

beforeEach(() => {
  MockBroadcastChannel.reset();
  (globalThis as Record<string, unknown>).BroadcastChannel = MockBroadcastChannel;
  localStorage.clear();
  coordinators = [];
});

afterEach(() => {
  coordinators.forEach((c) => c.destroy());
  coordinators = [];
  MockBroadcastChannel.reset();
});

// ── Tests ───────────────────────────────────────────────────────────────

describe('TabCoordinator', () => {
  describe('Initialization', () => {
    it('deve gerar tabId unico', () => {
      const c1 = createCoordinator();
      const c2 = createCoordinator();
      expect(c1.tabId).toBeTruthy();
      expect(c2.tabId).toBeTruthy();
      expect(c1.tabId).not.toBe(c2.tabId);
    });

    it('deve se registrar na tab registry ao criar', () => {
      const c = createCoordinator();
      const raw = localStorage.getItem('efvm360-tabs-registry');
      expect(raw).toBeTruthy();
      const registry = JSON.parse(raw!);
      expect(registry[c.tabId]).toBeDefined();
    });

    it('deve contar 1 tab quando apenas uma instancia existe', () => {
      const c = createCoordinator();
      expect(c.getTabCount()).toBe(1);
    });

    it('deve contar multiplas tabs', () => {
      createCoordinator();
      const c2 = createCoordinator();
      expect(c2.getTabCount()).toBe(2);
    });
  });

  describe('Leader Election', () => {
    it('primeira tab deve ser leader', () => {
      const c = createCoordinator();
      expect(c.isLeader()).toBe(true);
    });

    it('tab com menor ID deve ser leader', () => {
      const c1 = createCoordinator();
      const c2 = createCoordinator();

      // Determine which has the lower tabId
      const sorted = [c1.tabId, c2.tabId].sort((a, b) => a.localeCompare(b));
      const leader = sorted[0] === c1.tabId ? c1 : c2;
      const follower = leader === c1 ? c2 : c1;

      expect(leader.isLeader()).toBe(true);
      expect(follower.isLeader()).toBe(false);
    });

    it('lideranca muda quando leader e destruido', () => {
      const c1 = createCoordinator();
      const c2 = createCoordinator();

      // Find who is leader
      const sorted = [c1.tabId, c2.tabId].sort((a, b) => a.localeCompare(b));
      const leader = sorted[0] === c1.tabId ? c1 : c2;
      const follower = leader === c1 ? c2 : c1;

      expect(follower.isLeader()).toBe(false);

      // Destroy leader
      leader.destroy();
      // Remove from our tracking so afterEach doesn't double-destroy
      coordinators = coordinators.filter((c) => c !== leader);

      // Follower should now be leader
      expect(follower.isLeader()).toBe(true);
    });

    it('tab unica e sempre leader', () => {
      const c = createCoordinator();
      expect(c.isLeader()).toBe(true);
      expect(c.getTabCount()).toBe(1);
    });
  });

  describe('Message Broadcast/Receive', () => {
    it('deve entregar mensagem para outra tab', () => {
      const c1 = createCoordinator();
      const c2 = createCoordinator();

      const received: TabMessage[] = [];
      c2.onMessage((msg) => received.push(msg));

      c1.broadcast('DATA_CHANGED', { entity: 'passagem' });

      expect(received).toHaveLength(1);
      expect(received[0].type).toBe('DATA_CHANGED');
      expect(received[0].tabId).toBe(c1.tabId);
      expect(received[0].payload).toEqual({ entity: 'passagem' });
    });

    it('nao deve receber mensagem propria (BroadcastChannel mode)', () => {
      const c1 = createCoordinator();

      const received: TabMessage[] = [];
      c1.onMessage((msg) => received.push(msg));

      c1.broadcast('SYNC_STARTED');

      // BroadcastChannel mock delivers to OTHER instances only
      // and notifyHandlers ignores messages from self
      expect(received).toHaveLength(0);
    });

    it('deve broadcast SYNC_STARTED e SYNC_COMPLETED', () => {
      const c1 = createCoordinator();
      const c2 = createCoordinator();

      const received: TabMessageType[] = [];
      c2.onMessage((msg) => received.push(msg.type));

      c1.broadcast('SYNC_STARTED');
      c1.broadcast('SYNC_COMPLETED');

      expect(received).toEqual(['SYNC_STARTED', 'SYNC_COMPLETED']);
    });

    it('deve suportar multiplos handlers', () => {
      const c1 = createCoordinator();
      const c2 = createCoordinator();

      let count1 = 0;
      let count2 = 0;
      c2.onMessage(() => { count1++; });
      c2.onMessage(() => { count2++; });

      c1.broadcast('DATA_CHANGED');

      expect(count1).toBe(1);
      expect(count2).toBe(1);
    });

    it('deve suportar unsubscribe de handler', () => {
      const c1 = createCoordinator();
      const c2 = createCoordinator();

      let count = 0;
      const unsub = c2.onMessage(() => { count++; });

      c1.broadcast('DATA_CHANGED');
      expect(count).toBe(1);

      unsub();
      c1.broadcast('DATA_CHANGED');
      expect(count).toBe(1); // Still 1, handler was removed
    });

    it('deve incluir timestamp na mensagem', () => {
      const c1 = createCoordinator();
      const c2 = createCoordinator();

      const received: TabMessage[] = [];
      c2.onMessage((msg) => received.push(msg));

      const before = Date.now();
      c1.broadcast('SYNC_COMPLETED');
      const after = Date.now();

      expect(received[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(received[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('handler com erro nao deve impedir outros handlers', () => {
      const c1 = createCoordinator();
      const c2 = createCoordinator();

      let reached = false;
      c2.onMessage(() => { throw new Error('Handler crash'); });
      c2.onMessage(() => { reached = true; });

      c1.broadcast('DATA_CHANGED');

      expect(reached).toBe(true);
    });
  });

  describe('Tab Cleanup on Destroy', () => {
    it('deve remover tab do registry ao destruir', () => {
      const c = createCoordinator();
      const tabId = c.tabId;

      c.destroy();
      coordinators = coordinators.filter((co) => co !== c);

      const raw = localStorage.getItem('efvm360-tabs-registry');
      const registry = raw ? JSON.parse(raw) : {};
      expect(registry[tabId]).toBeUndefined();
    });

    it('deve fechar BroadcastChannel ao destruir', () => {
      const c = createCoordinator();
      c.destroy();
      coordinators = coordinators.filter((co) => co !== c);

      // All channels for this coordinator should be closed
      const openChannels = MockBroadcastChannel.instances.filter(
        (ch) => !ch.closed,
      );
      // Only channels from remaining coordinators should be open
      expect(openChannels.length).toBe(coordinators.length);
    });

    it('nao deve enviar mensagens apos destruir', () => {
      const c1 = createCoordinator();
      const c2 = createCoordinator();

      const received: TabMessage[] = [];
      c2.onMessage((msg) => received.push(msg));

      c1.destroy();
      coordinators = coordinators.filter((c) => c !== c1);

      // This should be a no-op
      c1.broadcast('DATA_CHANGED');

      // Only TAB_CLOSED from destroy, no DATA_CHANGED
      const dataChangedMsgs = received.filter((m) => m.type === 'DATA_CHANGED');
      expect(dataChangedMsgs).toHaveLength(0);
    });

    it('destroy duplo nao deve causar erro', () => {
      const c = createCoordinator();
      coordinators = coordinators.filter((co) => co !== c);

      expect(() => {
        c.destroy();
        c.destroy();
      }).not.toThrow();
    });

    it('deve broadcast TAB_CLOSED ao destruir', () => {
      const c1 = createCoordinator();
      const c2 = createCoordinator();

      const received: TabMessageType[] = [];
      c2.onMessage((msg) => received.push(msg.type));

      c1.destroy();
      coordinators = coordinators.filter((c) => c !== c1);

      expect(received).toContain('TAB_CLOSED');
    });
  });

  describe('Fallback — localStorage (sem BroadcastChannel)', () => {
    beforeEach(() => {
      // Remove BroadcastChannel to trigger fallback
      delete (globalThis as Record<string, unknown>).BroadcastChannel;
    });

    afterEach(() => {
      // Restore BroadcastChannel for other tests
      (globalThis as Record<string, unknown>).BroadcastChannel = MockBroadcastChannel;
    });

    it('deve criar coordinator sem BroadcastChannel', () => {
      const c = createCoordinator();
      expect(c.tabId).toBeTruthy();
      expect(c.isLeader()).toBe(true);
    });

    it('deve registrar tab no registry via fallback', () => {
      const c = createCoordinator();
      const raw = localStorage.getItem('efvm360-tabs-registry');
      expect(raw).toBeTruthy();
      const registry = JSON.parse(raw!);
      expect(registry[c.tabId]).toBeDefined();
    });

    it('deve broadcast via localStorage no fallback', () => {
      const c = createCoordinator();

      // In fallback mode, broadcast writes to localStorage
      c.broadcast('DATA_CHANGED', { test: true });

      const raw = localStorage.getItem('efvm360-tab-message');
      expect(raw).toBeTruthy();
      const msg = JSON.parse(raw!);
      expect(msg.type).toBe('DATA_CHANGED');
      expect(msg.tabId).toBe(c.tabId);
      expect(msg.payload).toEqual({ test: true });
    });

    it('deve receber mensagem via storage event no fallback', () => {
      const c = createCoordinator();

      const received: TabMessage[] = [];
      c.onMessage((msg) => received.push(msg));

      // Simulate storage event from another tab
      const message: TabMessage = {
        type: 'SYNC_COMPLETED',
        tabId: 'other-tab-id',
        timestamp: Date.now(),
        payload: { count: 5 },
      };

      // Dispatch storage event (simulating another tab writing)
      const event = new StorageEvent('storage', {
        key: 'efvm360-tab-message',
        newValue: JSON.stringify(message),
      });
      window.dispatchEvent(event);

      expect(received).toHaveLength(1);
      expect(received[0].type).toBe('SYNC_COMPLETED');
      expect(received[0].tabId).toBe('other-tab-id');
    });

    it('deve ignorar storage events de outras keys no fallback', () => {
      const c = createCoordinator();

      const received: TabMessage[] = [];
      c.onMessage((msg) => received.push(msg));

      const event = new StorageEvent('storage', {
        key: 'some-other-key',
        newValue: '{"type":"DATA_CHANGED"}',
      });
      window.dispatchEvent(event);

      expect(received).toHaveLength(0);
    });

    it('deve limpar ao destruir no fallback', () => {
      const c = createCoordinator();
      const tabId = c.tabId;

      c.destroy();
      coordinators = coordinators.filter((co) => co !== c);

      const raw = localStorage.getItem('efvm360-tabs-registry');
      const registry = raw ? JSON.parse(raw) : {};
      expect(registry[tabId]).toBeUndefined();
    });

    it('deve tolerar storage event com JSON malformado no fallback', () => {
      const c = createCoordinator();

      const received: TabMessage[] = [];
      c.onMessage((msg) => received.push(msg));

      const event = new StorageEvent('storage', {
        key: 'efvm360-tab-message',
        newValue: '{not valid json',
      });

      expect(() => window.dispatchEvent(event)).not.toThrow();
      expect(received).toHaveLength(0);
    });

    it('deve tolerar storage event com newValue null no fallback', () => {
      const c = createCoordinator();

      const received: TabMessage[] = [];
      c.onMessage((msg) => received.push(msg));

      const event = new StorageEvent('storage', {
        key: 'efvm360-tab-message',
        newValue: null,
      });

      expect(() => window.dispatchEvent(event)).not.toThrow();
      expect(received).toHaveLength(0);
    });
  });

  describe('TAB_ACTIVE broadcast', () => {
    it('deve broadcast TAB_ACTIVE ao registrar', () => {
      const c1 = createCoordinator();

      const received: TabMessageType[] = [];
      c1.onMessage((msg) => received.push(msg.type));

      // Creating c2 should broadcast TAB_ACTIVE
      createCoordinator();

      expect(received).toContain('TAB_ACTIVE');
    });
  });
});
