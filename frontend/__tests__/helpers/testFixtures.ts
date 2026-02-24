// ============================================================================
// VFZ Frontend — Test Fixtures Factory
// Gera dados de teste consistentes para todos os módulos
// ============================================================================

import type { LinhaPatio, Equipamento, DadosFormulario, RegistroHistorico } from '../../src/types';

// ── Linhas do Pátio ────────────────────────────────────────────────────

export const criarLinhaPatio = (overrides: Partial<LinhaPatio> = {}): LinhaPatio => ({
  linha: 'L1C',
  prefixo: '',
  vagoes: '',
  descricao: '',
  status: 'livre',
  ...overrides,
});

export const criarLinhasPatioCompleto = (): { cima: LinhaPatio[]; baixo: LinhaPatio[] } => ({
  cima: [
    criarLinhaPatio({ linha: 'L1C', status: 'livre' }),
    criarLinhaPatio({ linha: 'L2C', status: 'ocupada', prefixo: 'T-001', vagoes: '80' }),
    criarLinhaPatio({ linha: 'L3C', status: 'interditada', descricao: 'Manutenção AMV' }),
  ],
  baixo: [
    criarLinhaPatio({ linha: 'L1B', status: 'livre' }),
    criarLinhaPatio({ linha: 'L2B', status: 'ocupada', prefixo: 'T-002', vagoes: '60' }),
  ],
});

// ── Equipamentos ───────────────────────────────────────────────────────

export const criarEquipamento = (overrides: Partial<Equipamento> = {}): Equipamento => ({
  nome: 'Rádio',
  quantidade: 1,
  emCondicoes: true,
  observacao: '',
  ...overrides,
});

// ── SegurancaManobras (ItemSeguranca structure matching validacao.ts) ──
// validacao.ts acessa seg.houveManobras.resposta, seg.linhaLimpa?.resposta, etc.
// Os campos booleanos são do tipo ItemSeguranca: { resposta: boolean|null, observacao: string }
// Este helper aceita valores flat (boolean/string) e converte para ItemSeguranca.

const toItemSeguranca = (val: unknown): { resposta: boolean | null; observacao: string } => {
  if (val != null && typeof val === 'object' && 'resposta' in (val as Record<string, unknown>)) {
    return val as { resposta: boolean | null; observacao: string };
  }
  if (typeof val === 'boolean') return { resposta: val, observacao: '' };
  return { resposta: null, observacao: '' };
};

const toLinhaLimpa = (val: unknown): { resposta: boolean | null; observacao: string } | undefined => {
  if (val === undefined) return undefined;
  if (val != null && typeof val === 'object' && 'resposta' in (val as Record<string, unknown>)) {
    return val as { resposta: boolean | null; observacao: string };
  }
  if (val === 'sim') return { resposta: true, observacao: '' };
  if (val === 'nao') return { resposta: false, observacao: '' };
  if (val === 'parcial') return { resposta: null, observacao: 'parcial' };
  if (val === null) return { resposta: null, observacao: '' };
  return { resposta: null, observacao: '' };
};

const toPontoCritico = (val: unknown): { resposta: boolean | null; observacao: string } | undefined => {
  if (val === undefined) return undefined;
  if (val != null && typeof val === 'object' && 'resposta' in (val as Record<string, unknown>)) {
    return val as { resposta: boolean | null; observacao: string };
  }
  if (typeof val === 'string') {
    if (val.trim() === '') return { resposta: false, observacao: '' };
    return { resposta: true, observacao: val };
  }
  return { resposta: null, observacao: '' };
};

export const criarSegurancaFlat = (overrides: Record<string, unknown> = {}): Record<string, unknown> => {
  const defaults: Record<string, unknown> = {
    houveManobras: null,
    tipoManobra: '',
    localManobra: '',
    freiosVerificados: null,
    freios: {
      automatico: false,
      independente: false,
      manuaisCalcos: false,
      naoAplicavel: false,
    },
    pontoCriticoProximoTurno: '',
    linhaLimpa: null,
    linhaLimpaDescricao: '',
    comunicacao: {
      ccoCpt: false,
      oof: false,
      operadorSilo: false,
    },
    restricaoAtiva: null,
    restricaoLocal: '',
    restricaoTipo: '',
  };

  const merged = { ...defaults, ...overrides };

  return {
    ...merged,
    houveManobras: toItemSeguranca(merged.houveManobras),
    freiosVerificados: toItemSeguranca(merged.freiosVerificados),
    restricaoAtiva: toItemSeguranca(merged.restricaoAtiva),
    linhaLimpa: toLinhaLimpa(merged.linhaLimpa),
    pontoCriticoProximoTurno: toPontoCritico(merged.pontoCriticoProximoTurno),
  };
};

// ── DadosFormulario (usando flat SegurancaManobras) ────────────────────

export const criarDadosFormulario = (overrides: Partial<Record<string, unknown>> = {}): DadosFormulario => {
  const linhas = criarLinhasPatioCompleto();
  return {
    cabecalho: { data: '2024-03-15', dss: 'DSS-001', turno: 'Turno A (07:00-19:00)', horario: '07-19' },
    postos: {
      postoCima: { dono: { nome: 'Op1', matricula: 'V001' }, pessoas: [] },
      postoMeio: { dono: { nome: '', matricula: '' }, pessoas: [] },
      postoBaixo: { dono: { nome: 'Op2', matricula: 'V002' }, pessoas: [] },
    },
    patioCima: linhas.cima,
    patioBaixo: linhas.baixo,
    conferenciaCima: { tipo: 'confirmada', observacao: '' },
    conferenciaBaixo: { tipo: 'confirmada', observacao: '' },
    layoutPatio: { amvs: [{ id: 'AMV-01', posicao: 'normal', observacao: '' }] },
    pontosAtencao: ['Atenção na L3C'],
    intervencoes: { temIntervencao: false, descricao: '', local: '' },
    equipamentos: [
      criarEquipamento({ nome: 'Rádio' }),
      criarEquipamento({ nome: 'Manômetro' }),
      criarEquipamento({ nome: 'Lanterna' }),
    ],
    sala5s: 'Sala em ordem',
    maturidade5S: 3,
    confirmacoesConferencia: { patioCima: true, patioBaixo: true },
    segurancaManobras: criarSegurancaFlat() as any,
    assinaturas: {
      sai: { nome: 'Op Saindo', matricula: 'V001', confirmado: false },
      entra: { nome: 'Op Entrando', matricula: 'V002', confirmado: false },
    },
    ...overrides,
  } as DadosFormulario;
};

// ── RegistroHistorico ──────────────────────────────────────────────────

export const criarRegistroHistorico = (
  overrides: Partial<Record<string, unknown>> = {}
): RegistroHistorico => ({
  ...criarDadosFormulario(),
  timestamp: '2024-03-14T19:00:00Z',
  id: 1,
  statusValidacao: 'valido',
  ...overrides,
} as RegistroHistorico);

// ── DadosFormulario vazio (sem preenchimento) ──────────────────────────

export const criarDadosFormularioVazio = (): DadosFormulario => criarDadosFormulario({
  cabecalho: { data: '', dss: '', turno: '', horario: '' },
  patioCima: [criarLinhaPatio({ linha: 'L1C', status: 'livre' })],
  patioBaixo: [criarLinhaPatio({ linha: 'L1B', status: 'livre' })],
  intervencoes: { temIntervencao: null, descricao: '', local: '' },
  segurancaManobras: criarSegurancaFlat() as any,
  equipamentos: [],
});

// ── DadosFormulario com alto risco ─────────────────────────────────────

export const criarDadosAltoRisco = (): DadosFormulario => criarDadosFormulario({
  patioCima: [
    criarLinhaPatio({ linha: 'L1C', status: 'interditada', descricao: '' }),
    criarLinhaPatio({ linha: 'L2C', status: 'interditada', descricao: 'Defeito' }),
  ],
  patioBaixo: [
    criarLinhaPatio({ linha: 'L1B', status: 'ocupada', prefixo: '' }),
  ],
  intervencoes: { temIntervencao: true, descricao: '', local: '' },
  equipamentos: [
    criarEquipamento({ nome: 'Rádio', emCondicoes: false, observacao: '' }),
  ],
  segurancaManobras: criarSegurancaFlat({
    houveManobras: true,
    tipoManobra: 'engate',
    localManobra: '',
    restricaoAtiva: true,
    restricaoTipo: '',
    restricaoLocal: '',
    linhaLimpa: 'nao',
    comunicacao: { ccoCpt: false, oof: false, operadorSilo: false },
    pontoCriticoProximoTurno: '',
    freios: { automatico: false, independente: false, manuaisCalcos: false, naoAplicavel: false },
  }) as any,
});
