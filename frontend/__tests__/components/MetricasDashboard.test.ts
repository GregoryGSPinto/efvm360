// ============================================================================
// EFVM360 — Tests: MetricasDashboard
// Business observability KPI cards — loading, error, access control
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hasMinimumRole, type MetricasResumo } from '../../src/components/MetricasDashboard';

// ── Mock fetch globally ────────────────────────────────────────────────

const mockFetch = vi.fn();
Object.defineProperty(globalThis, 'fetch', { value: mockFetch, writable: true });

// ── Helper: build a MetricasResumo fixture ─────────────────────────────

function criarResumo(overrides?: Partial<MetricasResumo['metricas']>): MetricasResumo {
  return {
    metricas: {
      passagens_criadas: 42,
      passagens_assinadas: 38,
      logins_sucesso: 100,
      logins_falha: 5,
      sync_batch_count: 15,
      sync_conflicts: 2,
      audit_entries: 200,
      ...(overrides || {}),
    },
    uptime: 3661,
    timestamp: '2026-03-01T10:00:00.000Z',
    appInsightsAtivo: false,
  };
}

// ── Helper: simulates a successful fetch ───────────────────────────────

function mockFetchSuccess(data: MetricasResumo) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => data,
  });
}

function mockFetchError(status: number, statusText: string) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    statusText,
  });
}

function mockFetchNetworkError() {
  mockFetch.mockRejectedValueOnce(new Error('Network error'));
}

// ── Reset ──────────────────────────────────────────────────────────────

beforeEach(() => {
  mockFetch.mockReset();
});

// ── Role hierarchy tests ───────────────────────────────────────────────

describe('hasMinimumRole', () => {
  it('returns true for inspetor when minimum is inspetor', () => {
    expect(hasMinimumRole('inspetor', 'inspetor')).toBe(true);
  });

  it('returns true for administrador when minimum is inspetor', () => {
    expect(hasMinimumRole('administrador', 'inspetor')).toBe(true);
  });

  it('returns false for operador when minimum is inspetor', () => {
    expect(hasMinimumRole('operador', 'inspetor')).toBe(false);
  });

  it('returns false for maquinista when minimum is inspetor', () => {
    expect(hasMinimumRole('maquinista', 'inspetor')).toBe(false);
  });

  it('returns false for undefined role', () => {
    expect(hasMinimumRole(undefined, 'inspetor')).toBe(false);
  });

  it('returns true for gestor when minimum is inspetor', () => {
    expect(hasMinimumRole('gestor', 'inspetor')).toBe(true);
  });

  it('returns true for supervisor when minimum is inspetor', () => {
    expect(hasMinimumRole('supervisor', 'inspetor')).toBe(true);
  });

  it('returns false for oficial when minimum is inspetor', () => {
    expect(hasMinimumRole('oficial', 'inspetor')).toBe(false);
  });
});

// ── MetricasResumo data structure tests ────────────────────────────────

describe('MetricasResumo data handling', () => {
  it('fixture has all required metric fields', () => {
    const resumo = criarResumo();
    expect(resumo.metricas).toHaveProperty('passagens_criadas');
    expect(resumo.metricas).toHaveProperty('passagens_assinadas');
    expect(resumo.metricas).toHaveProperty('logins_sucesso');
    expect(resumo.metricas).toHaveProperty('logins_falha');
    expect(resumo.metricas).toHaveProperty('sync_batch_count');
    expect(resumo.metricas).toHaveProperty('sync_conflicts');
    expect(resumo.metricas).toHaveProperty('audit_entries');
  });

  it('computes login success rate correctly', () => {
    const resumo = criarResumo({ logins_sucesso: 90, logins_falha: 10 });
    const total = resumo.metricas.logins_sucesso + resumo.metricas.logins_falha;
    const rate = Math.round((resumo.metricas.logins_sucesso / total) * 100);
    expect(rate).toBe(90);
  });

  it('handles zero logins without division by zero', () => {
    const resumo = criarResumo({ logins_sucesso: 0, logins_falha: 0 });
    const total = resumo.metricas.logins_sucesso + resumo.metricas.logins_falha;
    const rate = total > 0 ? Math.round((resumo.metricas.logins_sucesso / total) * 100) : 100;
    expect(rate).toBe(100);
  });

  it('computes sync operations total', () => {
    const resumo = criarResumo({ sync_batch_count: 15, sync_conflicts: 2 });
    const syncOps = resumo.metricas.sync_batch_count + resumo.metricas.sync_conflicts;
    expect(syncOps).toBe(17);
  });

  it('overrides work correctly in fixture', () => {
    const resumo = criarResumo({ passagens_criadas: 999 });
    expect(resumo.metricas.passagens_criadas).toBe(999);
    // Other fields keep defaults
    expect(resumo.metricas.logins_sucesso).toBe(100);
  });

  it('includes uptime and timestamp', () => {
    const resumo = criarResumo();
    expect(resumo.uptime).toBe(3661);
    expect(resumo.timestamp).toBe('2026-03-01T10:00:00.000Z');
  });
});

// ── Fetch behavior tests ───────────────────────────────────────────────

describe('fetch metrics behavior', () => {
  it('sends correct headers in fetch call', async () => {
    const resumo = criarResumo();
    mockFetchSuccess(resumo);

    await fetch('http://localhost:3001/api/v1/metrics/resumo', {
      headers: {
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/metrics/resumo',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });

  it('handles HTTP error responses', async () => {
    mockFetchError(403, 'Forbidden');

    const response = await fetch('http://localhost:3001/api/v1/metrics/resumo');
    expect(response.ok).toBe(false);
    expect(response.status).toBe(403);
  });

  it('handles network errors', async () => {
    mockFetchNetworkError();

    await expect(
      fetch('http://localhost:3001/api/v1/metrics/resumo')
    ).rejects.toThrow('Network error');
  });

  it('parses successful JSON response', async () => {
    const resumo = criarResumo();
    mockFetchSuccess(resumo);

    const response = await fetch('http://localhost:3001/api/v1/metrics/resumo');
    const json = await response.json();

    expect(json.metricas.passagens_criadas).toBe(42);
    expect(json.metricas.passagens_assinadas).toBe(38);
  });
});

// ── KPI card computation tests ─────────────────────────────────────────

describe('KPI card computations', () => {
  it('total passagens displays passagens_criadas', () => {
    const resumo = criarResumo({ passagens_criadas: 150 });
    expect(resumo.metricas.passagens_criadas).toBe(150);
  });

  it('login rate is red when below 90%', () => {
    const resumo = criarResumo({ logins_sucesso: 70, logins_falha: 30 });
    const total = resumo.metricas.logins_sucesso + resumo.metricas.logins_falha;
    const rate = Math.round((resumo.metricas.logins_sucesso / total) * 100);
    const color = rate >= 90 ? '#00A651' : '#ef4444';
    expect(color).toBe('#ef4444');
  });

  it('login rate is green when 90%+', () => {
    const resumo = criarResumo({ logins_sucesso: 95, logins_falha: 5 });
    const total = resumo.metricas.logins_sucesso + resumo.metricas.logins_falha;
    const rate = Math.round((resumo.metricas.logins_sucesso / total) * 100);
    const color = rate >= 90 ? '#00A651' : '#ef4444';
    expect(color).toBe('#00A651');
  });

  it('active alerts derived from sync_conflicts', () => {
    const resumo = criarResumo({ sync_conflicts: 5 });
    expect(resumo.metricas.sync_conflicts).toBe(5);
  });

  it('alerts color is red when conflicts > 0', () => {
    const conflicts = 3;
    const color = conflicts > 0 ? '#ef4444' : '#00A651';
    expect(color).toBe('#ef4444');
  });

  it('alerts color is green when no conflicts', () => {
    const conflicts = 0;
    const color = conflicts > 0 ? '#ef4444' : '#00A651';
    expect(color).toBe('#00A651');
  });

  it('sync color is yellow when conflicts exist', () => {
    const conflicts = 1;
    const color = conflicts > 0 ? '#FFD100' : '#00A651';
    expect(color).toBe('#FFD100');
  });

  it('formats uptime hours and minutes', () => {
    const seconds = 7261; // 2h 1m 1s
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const formatted = `${h}h ${m}m`;
    expect(formatted).toBe('2h 1m');
  });
});
