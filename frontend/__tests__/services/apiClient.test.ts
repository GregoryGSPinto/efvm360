// ============================================================================
// EFVM360 — apiClient tests
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to mock import.meta.env before importing the module
vi.stubEnv('VITE_API_URL', 'http://localhost:3001/api/v1');

// Mock getAccessToken from the api module
vi.mock('../../src/api', () => ({
  api: {},
  ApiError: class ApiError extends Error {
    status: number;
    code: string;
    constructor(status: number, code: string) {
      super(`API Error ${status}: ${code}`);
      this.status = status;
      this.code = code;
    }
  },
  getAccessToken: vi.fn(() => 'test-jwt-token'),
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
}));

import { apiClient } from '../../src/services/apiClient';
import { getAccessToken } from '../../src/api';

describe('apiClient', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  const originalSessionStorage = globalThis.sessionStorage;

  beforeEach(() => {
    fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    // Mock sessionStorage
    const store: Record<string, string> = {
      active_railway: 'EFVM',
      active_yard: 'VFZ',
    };
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, val: string) => { store[key] = val; },
        removeItem: (key: string) => { delete store[key]; },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: originalSessionStorage,
      writable: true,
      configurable: true,
    });
  });

  it('mounts URL correctly with base URL', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: 'test' }),
    });

    await apiClient.get('/health');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url] = fetchSpy.mock.calls[0];
    // BASE_URL resolves from VITE_API_URL or falls back to '/api/v1'
    expect(url).toMatch(/\/api\/v1\/health$/);
  });

  it('injects Authorization header', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiClient.get('/test');

    const [, opts] = fetchSpy.mock.calls[0];
    expect(opts.headers['Authorization']).toBe('Bearer test-jwt-token');
  });

  it('injects X-Railway-Id from sessionStorage', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiClient.get('/test');

    const [, opts] = fetchSpy.mock.calls[0];
    expect(opts.headers['X-Railway-Id']).toBe('EFVM');
  });

  it('injects X-Active-Yard from sessionStorage', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiClient.get('/test');

    const [, opts] = fetchSpy.mock.calls[0];
    expect(opts.headers['X-Active-Yard']).toBe('VFZ');
  });

  it('returns null on network error (does not throw)', async () => {
    fetchSpy.mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await apiClient.get('/test');

    expect(result).toBeNull();
  });

  it('returns null on non-2xx response', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Internal' }),
    });

    const result = await apiClient.get('/test');

    expect(result).toBeNull();
  });

  it('redirects to /login on 401', async () => {
    // Mock window.location
    const originalLocation = window.location;
    const mockLocation = { href: '' } as Location;
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
      configurable: true,
    });

    fetchSpy.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    });

    await apiClient.get('/test');

    expect(mockLocation.href).toBe('/login');

    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it('sends POST body correctly', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: '123' }),
    });

    const body = { compositionCode: 'COMP-001', originYard: 'VFZ' };
    const result = await apiClient.post('/inter-yard', body);

    const [, opts] = fetchSpy.mock.calls[0];
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual(body);
    expect(result).toEqual({ id: '123' });
  });

  it('sends PATCH body correctly', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ updated: true }),
    });

    await apiClient.patch('/inter-yard/1/dispatch', { checklist: [] });

    const [, opts] = fetchSpy.mock.calls[0];
    expect(opts.method).toBe('PATCH');
  });

  it('omits Authorization when no token available', async () => {
    vi.mocked(getAccessToken).mockReturnValue(null);

    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    // Need to re-import to pick up the null token — just check the fetch call
    await apiClient.get('/test');

    const [, opts] = fetchSpy.mock.calls[0];
    // getAccessToken returned null so no Authorization header
    expect(opts.headers['Authorization']).toBeUndefined();
  });
});
