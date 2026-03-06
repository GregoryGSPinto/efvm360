// ============================================================================
// EFVM360 Frontend — Test Setup (Vitest + jsdom)
// Mocks: localStorage, sessionStorage, crypto.subtle, navigator
// ============================================================================

import { vi, beforeEach } from 'vitest';

// ── Mock localStorage & sessionStorage ──────────────────────────────────
const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
};

Object.defineProperty(globalThis, 'localStorage', { value: createStorageMock() });
Object.defineProperty(globalThis, 'sessionStorage', { value: createStorageMock() });

// ── Mock crypto.subtle ─────────────────────────────────────────────────
const mockSubtle = {
  digest: vi.fn(async (_algo: string, data: Uint8Array) => {
    // Deterministic mock hash: simple XOR-based folding into 32 bytes
    const result = new Uint8Array(32);
    for (let i = 0; i < data.length; i++) {
      result[i % 32] ^= data[i];
    }
    return result.buffer;
  }),
};

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: { subtle: mockSubtle, randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2, 10) },
  });
} else if (!globalThis.crypto.subtle) {
  Object.defineProperty(globalThis.crypto, 'subtle', { value: mockSubtle });
}

// ── Mock import.meta.env ──────────────────────────────────────────────
// @ts-ignore
if (!import.meta.env) {
  // @ts-ignore
  import.meta.env = { DEV: true, PROD: false, MODE: 'test' };
}

// ── Mock navigator ──────────────────────────────────────────────────────
Object.defineProperty(globalThis, 'navigator', {
  value: {
    ...globalThis.navigator,
    language: 'pt-BR',
    hardwareConcurrency: 4,
    userAgent: 'vitest-mock-ua',
  },
  writable: true,
});

// ── Mock screen ──────────────────────────────────────────────────────────
Object.defineProperty(globalThis, 'screen', {
  value: { width: 1920, height: 1080, colorDepth: 24 },
  writable: true,
});

// ── Mock window extras ──────────────────────────────────────────────────
Object.defineProperty(globalThis, 'Intl', {
  value: {
    ...globalThis.Intl,
    DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: 'America/Sao_Paulo' }) }),
  },
});

// ── Reset storage between tests ─────────────────────────────────────────
beforeEach(() => {
  (localStorage as any).clear();
  (sessionStorage as any).clear();
  vi.clearAllMocks();
});
