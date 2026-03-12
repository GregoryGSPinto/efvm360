// ============================================================================
// EFVM360 — Tests: AdamBotBriefing (gerarBriefing + detectarTurnoAtual)
// Pure function tests — mock Date directly (vi.useFakeTimers breaks in jsdom)
// ============================================================================

import { describe, it, expect, afterEach } from 'vitest';
import { gerarBriefing, detectarTurnoAtual, type DadosBriefing } from '../../src/components/AdamBot/AdamBotBriefing';

// ── Date mock helper ─────────────────────────────────────────────────────

const RealDate = globalThis.Date;

function setMockHour(hour: number, minute = 0) {
  const fakeMs = new RealDate(2026, 2, 1, hour, minute, 0).getTime();
  const MockDate = function (this: Date, ...args: unknown[]) {
    if (args.length === 0) return new RealDate(fakeMs);
    return Reflect.construct(RealDate, args);
  } as unknown as DateConstructor;
  Object.defineProperty(MockDate, 'prototype', { value: RealDate.prototype });
  MockDate.now = () => fakeMs;
  MockDate.parse = RealDate.parse;
  MockDate.UTC = RealDate.UTC;
  globalThis.Date = MockDate;
}

afterEach(() => { globalThis.Date = RealDate; });

// ── Helper: base dados sem problemas ────────────────────────────────────

function dadosBase(): DadosBriefing {
  return {
    totalLinhas: 12,
    linhasOcupadas: 3,
    linhasInterditadas: 0,
    linhasLivres: 9,
    interdicoes: [],
    amvsReversa: [],
    equipamentosComDefeito: [],
    equipamentosFaltantes: [],
    riscosCriticos: [],
    riscosAltos: [],
    scoreMaximo: 0,
    scoreMedio: 0,
    ultimaPassagem: undefined,
    turnoAtual: 'Manhã (06:00-14:00)',
  };
}

// ── detectarTurnoAtual ─────────────────────────────────────────────────

describe('detectarTurnoAtual', () => {
  it('retorna Manhã entre 06:00-13:59', () => {
    setMockHour(8);
    expect(detectarTurnoAtual()).toContain('Manhã');
  });

  it('retorna Manhã no limite inferior (06:00)', () => {
    setMockHour(6);
    expect(detectarTurnoAtual()).toContain('Manhã');
  });

  it('retorna Tarde entre 14:00-21:59', () => {
    setMockHour(16);
    expect(detectarTurnoAtual()).toContain('Tarde');
  });

  it('retorna Tarde no limite inferior (14:00)', () => {
    setMockHour(14);
    expect(detectarTurnoAtual()).toContain('Tarde');
  });

  it('retorna Noite entre 22:00-05:59', () => {
    setMockHour(23);
    expect(detectarTurnoAtual()).toContain('Noite');
  });

  it('retorna Noite na madrugada (03:00)', () => {
    setMockHour(3);
    expect(detectarTurnoAtual()).toContain('Noite');
  });

  it('retorna Noite no limite inferior (22:00)', () => {
    setMockHour(22);
    expect(detectarTurnoAtual()).toContain('Noite');
  });
});

// ── gerarBriefing ──────────────────────────────────────────────────────

describe('gerarBriefing', () => {
  describe('situação normal', () => {
    it('retorna severidade normal quando tudo OK', () => {
      setMockHour(10);
      const resultado = gerarBriefing(dadosBase());
      expect(resultado.severidade).toBe('normal');
      expect(resultado.texto).toContain('Briefing operacional');
      expect(resultado.itensDestaque.length).toBeGreaterThan(0);
      expect(resultado.timestamp).toBeTruthy();
    });

    it('textoResumido contém Estável', () => {
      setMockHour(10);
      const resultado = gerarBriefing(dadosBase());
      expect(resultado.textoResumido).toContain('Estável');
    });

    it('inclui dados de ocupação', () => {
      setMockHour(10);
      const resultado = gerarBriefing(dadosBase());
      expect(resultado.texto).toContain('3');
      expect(resultado.texto).toContain('12');
      expect(resultado.itensDestaque.some(i => i.includes('Ocupação'))).toBe(true);
    });

    it('sem riscos mostra mensagem positiva', () => {
      setMockHour(10);
      const resultado = gerarBriefing(dadosBase());
      expect(resultado.texto).toContain('Nenhum risco crítico');
      expect(resultado.itensDestaque.some(i => i.includes('Sem riscos'))).toBe(true);
    });

    it('texto termina com mensagem de boa jornada', () => {
      setMockHour(10);
      const resultado = gerarBriefing(dadosBase());
      expect(resultado.texto).toContain('Boa jornada');
    });
  });

  describe('sem dados', () => {
    it('retorna briefing mínimo quando totalLinhas=0 e sem passagem', () => {
      setMockHour(10);
      const dados = { ...dadosBase(), totalLinhas: 0, linhasLivres: 0, linhasOcupadas: 0 };
      const resultado = gerarBriefing(dados);
      expect(resultado.severidade).toBe('normal');
      expect(resultado.texto).toContain('Sem dados');
      expect(resultado.textoResumido).toContain('Sem dados');
    });
  });

  describe('interdições → severidade atencao', () => {
    it('retorna atencao com interdições', () => {
      setMockHour(10);
      const dados = {
        ...dadosBase(),
        linhasInterditadas: 2,
        linhasLivres: 7,
        interdicoes: [{ linha: 'L3', motivo: 'manutenção' }, { linha: 'L7' }],
      };
      const resultado = gerarBriefing(dados);
      expect(resultado.severidade).toBe('atencao');
      expect(resultado.texto).toContain('L3');
      expect(resultado.texto).toContain('manutenção');
      expect(resultado.texto).toContain('L7');
      expect(resultado.itensDestaque.some(i => i.includes('interdição'))).toBe(true);
    });

    it('textoResumido menciona interdição em severidade atencao', () => {
      setMockHour(10);
      const dados = {
        ...dadosBase(),
        linhasInterditadas: 1,
        interdicoes: [{ linha: 'L1' }],
      };
      const resultado = gerarBriefing(dados);
      expect(resultado.textoResumido).toContain('interdição');
    });
  });

  describe('riscos críticos → severidade critico', () => {
    it('retorna critico com riscos críticos', () => {
      setMockHour(10);
      const dados = {
        ...dadosBase(),
        riscosCriticos: [{ codigo: 'GR-006', nome: 'Defeito via', score: 15 }],
        scoreMaximo: 15,
      };
      const resultado = gerarBriefing(dados);
      expect(resultado.severidade).toBe('critico');
      expect(resultado.texto).toContain('GR-006');
      expect(resultado.texto).toContain('Defeito via');
      expect(resultado.texto).toContain('15/25');
    });

    it('textoResumido menciona riscos críticos', () => {
      setMockHour(10);
      const dados = {
        ...dadosBase(),
        riscosCriticos: [{ codigo: 'X', nome: 'Y', score: 10 }],
        scoreMaximo: 10,
      };
      expect(gerarBriefing(dados).textoResumido).toContain('crítico');
    });

    it('critico sobrepõe atencao', () => {
      setMockHour(10);
      const dados = {
        ...dadosBase(),
        linhasInterditadas: 1,
        interdicoes: [{ linha: 'L3' }],
        riscosCriticos: [{ codigo: 'GR-001', nome: 'Risco', score: 20 }],
        scoreMaximo: 20,
      };
      const resultado = gerarBriefing(dados);
      expect(resultado.severidade).toBe('critico');
    });

    it('texto termina com aviso de atenção redobrada', () => {
      setMockHour(10);
      const dados = {
        ...dadosBase(),
        riscosCriticos: [{ codigo: 'GR-001', nome: 'Teste', score: 10 }],
        scoreMaximo: 10,
      };
      const resultado = gerarBriefing(dados);
      expect(resultado.texto).toContain('Atenção redobrada');
    });
  });

  describe('riscos altos (sem críticos)', () => {
    it('menciona riscos altos', () => {
      setMockHour(10);
      const dados = {
        ...dadosBase(),
        riscosAltos: [{ codigo: 'GR-010', nome: 'Risco alto', score: 8 }],
      };
      const resultado = gerarBriefing(dados);
      expect(resultado.texto).toContain('nível alto');
      expect(resultado.itensDestaque.some(i => i.includes('Riscos altos'))).toBe(true);
    });
  });

  describe('equipamentos', () => {
    it('inclui equipamentos com defeito e seta atencao', () => {
      setMockHour(10);
      const dados = { ...dadosBase(), equipamentosComDefeito: [{ nome: 'Rádio VHF' }] };
      const resultado = gerarBriefing(dados);
      expect(resultado.severidade).toBe('atencao');
      expect(resultado.texto).toContain('Rádio VHF');
      expect(resultado.itensDestaque.some(i => i.includes('Defeito'))).toBe(true);
    });

    it('inclui equipamentos faltantes com contagem', () => {
      setMockHour(10);
      const dados = {
        ...dadosBase(),
        equipamentosFaltantes: [{ nome: 'Lanterna', minimo: 2, atual: 0 }],
      };
      const resultado = gerarBriefing(dados);
      expect(resultado.texto).toContain('Lanterna');
      expect(resultado.texto).toContain('0/2');
      expect(resultado.itensDestaque.some(i => i.includes('Abaixo do mínimo'))).toBe(true);
    });
  });

  describe('AMVs em reversa', () => {
    it('inclui AMVs em posição reversa', () => {
      setMockHour(10);
      const dados = { ...dadosBase(), amvsReversa: [{ codigo: 'AMV-04' }] };
      const resultado = gerarBriefing(dados);
      expect(resultado.texto).toContain('AMV-04');
      expect(resultado.texto).toContain('reversa');
      expect(resultado.itensDestaque.some(i => i.includes('AMV'))).toBe(true);
    });

    it('pluraliza AMVs quando múltiplos', () => {
      setMockHour(10);
      const dados = {
        ...dadosBase(),
        amvsReversa: [{ codigo: 'AMV-01' }, { codigo: 'AMV-03' }],
      };
      const resultado = gerarBriefing(dados);
      expect(resultado.texto).toContain('2 AMVs');
    });
  });

  describe('última passagem', () => {
    it('inclui dados da última passagem', () => {
      setMockHour(10);
      const dados = {
        ...dadosBase(),
        ultimaPassagem: {
          data: '2026-03-01', turno: 'Noite', operador: 'João Silva',
          observacoes: 'Atenção AMV-04',
        },
      };
      const resultado = gerarBriefing(dados);
      expect(resultado.texto).toContain('João Silva');
      expect(resultado.texto).toContain('Noite');
      expect(resultado.texto).toContain('AMV-04');
      expect(resultado.itensDestaque.some(i => i.includes('AMV-04'))).toBe(true);
    });

    it('funciona sem observações na última passagem', () => {
      setMockHour(10);
      const dados = {
        ...dadosBase(),
        ultimaPassagem: { data: '2026-03-01', turno: 'Tarde', operador: 'Maria' },
      };
      const resultado = gerarBriefing(dados);
      expect(resultado.texto).toContain('Maria');
    });
  });

  describe('saudação por horário', () => {
    it('Bom dia antes das 12h', () => {
      setMockHour(9);
      expect(gerarBriefing(dadosBase()).texto).toContain('Bom dia');
    });

    it('Boa tarde entre 12h-17h', () => {
      setMockHour(15);
      expect(gerarBriefing(dadosBase()).texto).toContain('Boa tarde');
    });

    it('Boa noite a partir das 18h', () => {
      setMockHour(20);
      expect(gerarBriefing(dadosBase()).texto).toContain('Boa noite');
    });
  });

  describe('timestamp', () => {
    it('timestamp é string ISO válida', () => {
      setMockHour(10);
      const resultado = gerarBriefing(dadosBase());
      expect(() => new RealDate(resultado.timestamp)).not.toThrow();
      expect(new RealDate(resultado.timestamp).toISOString()).toBe(resultado.timestamp);
    });
  });
});
