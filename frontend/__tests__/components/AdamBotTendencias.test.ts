// ============================================================================
// EFVM360 — Tests: AdamBotTendencias (analisarTendencias)
// Pure function tests — mock localStorage for historico
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analisarTendencias, carregarHistorico } from '../../src/components/AdamBot/AdamBotTendencias';

// ── Helper: create a passagem entry ─────────────────────────────────────

function criarPassagem(overrides: Record<string, any> = {}) {
  return {
    cabecalho: { data: '2026-03-01', turno: 'Turno A', horario: '07:00', dss: 'DSS-001' },
    patioCima: [],
    patioBaixo: [],
    equipamentos: [],
    layoutPatio: { amvs: [] },
    intervencoes: { temIntervencao: null, descricao: '', local: '' },
    pontosAtencao: [],
    ...overrides,
  };
}

function mockHistorico(passagens: any[], key = 'efvm360-historico-turnos') {
  // The setup file creates localStorage as a custom mock object with vi.fn getItem.
  // Use the mock's mockImplementation to control what getItem returns.
  (localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation((k: string) => {
    if (k === key) return JSON.stringify(passagens);
    return null;
  });
}

// ── Tests ───────────────────────────────────────────────────────────────

beforeEach(() => {
  (localStorage as any).clear();
  // mockReset clears call history AND resets mockImplementation (so getItem returns undefined by default)
  (localStorage.getItem as ReturnType<typeof vi.fn>).mockReset();
  vi.clearAllMocks();
});

describe('carregarHistorico', () => {
  it('retorna array vazio se nenhuma chave tem dados', () => {
    expect(carregarHistorico()).toEqual([]);
  });

  it('carrega de efvm360-historico-turnos (primária)', () => {
    const data = [criarPassagem()];
    mockHistorico(data, 'efvm360-historico-turnos');
    expect(carregarHistorico()).toHaveLength(1);
  });

  it('carrega de efvm360-historico (fallback)', () => {
    const data = [criarPassagem()];
    mockHistorico(data, 'efvm360-historico');
    expect(carregarHistorico()).toHaveLength(1);
  });
});

describe('analisarTendencias', () => {
  it('retorna 0 alertas sem histórico', () => {
    const result = analisarTendencias();
    expect(result.alertas).toHaveLength(0);
    expect(result.totalPassagensAnalisadas).toBe(0);
    expect(result.periodoAnalisado).toBe('sem histórico');
  });

  it('retorna 0 alertas com apenas 1 passagem', () => {
    mockHistorico([criarPassagem()]);
    const result = analisarTendencias();
    expect(result.alertas).toHaveLength(0);
    expect(result.periodoAnalisado).toBe('1 passagem');
  });

  it('detecta interdição recorrente (3/5 passagens)', () => {
    const passagens = Array.from({ length: 5 }, (_, i) => criarPassagem({
      patioCima: i < 3
        ? [{ linha: 'L3', prefixo: '', vagoes: '', descricao: 'manutenção', status: 'interditada' }]
        : [{ linha: 'L3', prefixo: '', vagoes: '', descricao: '', status: 'livre' }],
    }));
    mockHistorico(passagens);
    const result = analisarTendencias();
    const alerta = result.alertas.find(a => a.titulo.includes('L3'));
    expect(alerta).toBeDefined();
    expect(alerta!.tipo).toBe('recorrencia');
    expect(alerta!.dados.ocorrencias).toBe(3);
  });

  it('severidade critica quando pct >= 70%', () => {
    const passagens = Array.from({ length: 5 }, (_, i) => criarPassagem({
      patioCima: i < 4
        ? [{ linha: 'L1', prefixo: '', vagoes: '', descricao: '', status: 'interditada' }]
        : [{ linha: 'L1', prefixo: '', vagoes: '', descricao: '', status: 'livre' }],
    }));
    mockHistorico(passagens);
    const result = analisarTendencias();
    const alerta = result.alertas.find(a => a.titulo.includes('L1'));
    expect(alerta).toBeDefined();
    expect(alerta!.severidade).toBe('critico');
  });

  it('detecta equipamento avariado consecutivo (persistencia)', () => {
    const passagens = Array.from({ length: 5 }, (_, i) => criarPassagem({
      equipamentos: i >= 3
        ? [{ nome: 'Rádio VHF', quantidade: 1, emCondicoes: false, observacao: 'com defeito' }]
        : [{ nome: 'Rádio VHF', quantidade: 1, emCondicoes: true, observacao: '' }],
    }));
    mockHistorico(passagens);
    const result = analisarTendencias();
    const alerta = result.alertas.find(a => a.titulo.includes('Rádio VHF'));
    expect(alerta).toBeDefined();
    expect(alerta!.tipo).toBe('persistencia');
  });

  it('detecta AMV persistente em reversa (3+ turnos)', () => {
    const passagens = Array.from({ length: 5 }, (_, i) => criarPassagem({
      layoutPatio: {
        amvs: i < 3
          ? [{ id: 'AMV-04', posicao: 'reversa', observacao: '' }]
          : [{ id: 'AMV-04', posicao: 'normal', observacao: '' }],
      },
    }));
    mockHistorico(passagens);
    const result = analisarTendencias();
    const alerta = result.alertas.find(a => a.titulo.includes('AMV-04'));
    expect(alerta).toBeDefined();
    expect(alerta!.tipo).toBe('persistencia');
  });

  it('detecta escalação de interdições (+40%)', () => {
    // First 2: 1 interdicao each, last 2: 3 interdicoes each → 200% increase
    const passagens = [
      criarPassagem({ patioCima: [
        { linha: 'L1', prefixo: '', vagoes: '', descricao: '', status: 'interditada' },
      ] }),
      criarPassagem({ patioCima: [
        { linha: 'L2', prefixo: '', vagoes: '', descricao: '', status: 'interditada' },
      ] }),
      criarPassagem({ patioCima: [
        { linha: 'L1', prefixo: '', vagoes: '', descricao: '', status: 'interditada' },
        { linha: 'L2', prefixo: '', vagoes: '', descricao: '', status: 'interditada' },
        { linha: 'L3', prefixo: '', vagoes: '', descricao: '', status: 'interditada' },
      ] }),
      criarPassagem({ patioCima: [
        { linha: 'L1', prefixo: '', vagoes: '', descricao: '', status: 'interditada' },
        { linha: 'L2', prefixo: '', vagoes: '', descricao: '', status: 'interditada' },
        { linha: 'L3', prefixo: '', vagoes: '', descricao: '', status: 'interditada' },
      ] }),
    ];
    mockHistorico(passagens);
    const result = analisarTendencias();
    const alerta = result.alertas.find(a => a.tipo === 'escalacao');
    expect(alerta).toBeDefined();
    expect(alerta!.titulo).toContain('+');
  });

  it('detecta melhoria de interdições', () => {
    // First 3: 2 interdições each, last 3: 1 interdição each → -50%
    const passagens = [
      criarPassagem({ patioCima: [
        { linha: 'LA', prefixo: '', vagoes: '', descricao: '', status: 'interditada' },
        { linha: 'LB', prefixo: '', vagoes: '', descricao: '', status: 'interditada' },
      ] }),
      criarPassagem({ patioCima: [
        { linha: 'LA', prefixo: '', vagoes: '', descricao: '', status: 'interditada' },
        { linha: 'LB', prefixo: '', vagoes: '', descricao: '', status: 'interditada' },
      ] }),
      criarPassagem({ patioCima: [
        { linha: 'LA', prefixo: '', vagoes: '', descricao: '', status: 'interditada' },
        { linha: 'LB', prefixo: '', vagoes: '', descricao: '', status: 'interditada' },
      ] }),
      criarPassagem({ patioCima: [
        { linha: 'LC', prefixo: '', vagoes: '', descricao: '', status: 'interditada' },
      ] }),
      criarPassagem({ patioCima: [
        { linha: 'LC', prefixo: '', vagoes: '', descricao: '', status: 'interditada' },
      ] }),
      criarPassagem({ patioCima: [
        { linha: 'LC', prefixo: '', vagoes: '', descricao: '', status: 'interditada' },
      ] }),
    ];
    mockHistorico(passagens);
    const result = analisarTendencias();
    const alerta = result.alertas.find(a => a.tipo === 'melhoria');
    expect(alerta).toBeDefined();
    expect(alerta!.severidade).toBe('info');
  });

  it('detecta intervenções VP frequentes (3/5)', () => {
    const passagens = Array.from({ length: 5 }, (_, i) => criarPassagem({
      intervencoes: { temIntervencao: i < 3 ? true : false, descricao: 'obra', local: 'km 12' },
    }));
    mockHistorico(passagens);
    const result = analisarTendencias();
    const alerta = result.alertas.find(a => a.titulo.includes('VP'));
    expect(alerta).toBeDefined();
    expect(alerta!.tipo).toBe('recorrencia');
  });

  it('ordena alertas por severidade (critico > aviso > info)', () => {
    const passagens = Array.from({ length: 5 }, () => criarPassagem({
      patioCima: [
        { linha: 'L1', prefixo: '', vagoes: '', descricao: '', status: 'interditada' },
      ],
      layoutPatio: { amvs: [{ id: 'AMV-01', posicao: 'reversa', observacao: '' }] },
    }));
    mockHistorico(passagens);
    const result = analisarTendencias();
    if (result.alertas.length >= 2) {
      const ordem: Record<string, number> = { critico: 0, aviso: 1, info: 2 };
      for (let i = 1; i < result.alertas.length; i++) {
        expect(ordem[result.alertas[i].severidade]).toBeGreaterThanOrEqual(
          ordem[result.alertas[i - 1].severidade]
        );
      }
    }
  });

  it('timestamp é ISO válido', () => {
    const result = analisarTendencias();
    expect(() => new Date(result.timestamp)).not.toThrow();
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it('respeita maxPassagens', () => {
    const passagens = Array.from({ length: 20 }, () => criarPassagem({
      patioCima: [{ linha: 'L9', prefixo: '', vagoes: '', descricao: '', status: 'interditada' }],
    }));
    mockHistorico(passagens);
    const result = analisarTendencias(5);
    expect(result.totalPassagensAnalisadas).toBe(5);
  });
});
