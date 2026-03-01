// ============================================================================
// EFVM360 v3.2 — Hook: Gestão de Graus de Risco Operacional (offline-first)
// localStorage é a fonte primária; backend é target de sync
// ============================================================================

import { useState, useCallback, useMemo } from 'react';
import type { GrauRisco, CategoriaRisco } from '../types';
import { STORAGE_KEYS } from '../utils/constants';

// ── Seed Data ───────────────────────────────────────────────────────────

const GRAUS_DEFAULT: GrauRisco[] = [
  {
    id: 'gr-001', codigo: 'GR-001', nome: 'Descarrilamento em AMV',
    descricao: 'Risco de descarrilamento ao passar por Aparelho de Mudança de Via em posição incorreta ou com defeito mecânico.',
    categoria: 'operacional', severidade: 'critico',
    probabilidade: 2, impacto: 5, scoreRisco: 10,
    medidasMitigacao: [
      { id: 'm1', descricao: 'Verificação visual do AMV antes de autorizar passagem', obrigatoria: true },
      { id: 'm2', descricao: 'Redução de velocidade para 10km/h na área de AMV', obrigatoria: true },
      { id: 'm3', descricao: 'Comunicação via rádio confirmando posição do AMV', obrigatoria: true },
    ],
    ativo: true, patiosAfetados: [], criadoPor: 'ADM9001', criadoEm: '2024-01-15T10:00:00Z',
  },
  {
    id: 'gr-002', codigo: 'GR-002', nome: 'Abalroamento em manobra',
    descricao: 'Colisão entre composições durante manobra de formação ou desmembramento de trens no pátio.',
    categoria: 'operacional', severidade: 'alto',
    probabilidade: 3, impacto: 4, scoreRisco: 12,
    medidasMitigacao: [
      { id: 'm4', descricao: 'Sinalização com bandeirola antes de iniciar manobra', obrigatoria: true },
      { id: 'm5', descricao: 'Velocidade máxima de 5km/h em área de manobra', obrigatoria: true },
    ],
    ativo: true, patiosAfetados: [], criadoPor: 'ADM9001', criadoEm: '2024-01-15T10:00:00Z',
  },
  {
    id: 'gr-003', codigo: 'GR-003', nome: 'Atropelamento em via',
    descricao: 'Risco de atropelamento de colaborador ou terceiro em área de circulação ferroviária.',
    categoria: 'seguranca', severidade: 'critico',
    probabilidade: 2, impacto: 5, scoreRisco: 10,
    medidasMitigacao: [
      { id: 'm6', descricao: 'Uso obrigatório de colete refletivo', obrigatoria: true },
      { id: 'm7', descricao: 'Travessia apenas em passagens de nível sinalizadas', obrigatoria: true },
      { id: 'm8', descricao: 'Alerta sonoro (buzina) antes de movimentar composição', obrigatoria: true },
    ],
    ativo: true, patiosAfetados: [], criadoPor: 'ADM9001', criadoEm: '2024-01-15T10:00:00Z',
  },
  {
    id: 'gr-004', codigo: 'GR-004', nome: 'Vazamento de produto perigoso',
    descricao: 'Derramamento ou vazamento de carga classificada como produto perigoso (minério com contaminantes, combustível, etc).',
    categoria: 'ambiental', severidade: 'alto',
    probabilidade: 2, impacto: 4, scoreRisco: 8,
    medidasMitigacao: [
      { id: 'm9', descricao: 'Inspeção visual dos vagões antes de movimentação', obrigatoria: true },
      { id: 'm10', descricao: 'Kit de contenção disponível no pátio', obrigatoria: true },
    ],
    ativo: true, patiosAfetados: [], criadoPor: 'ADM9001', criadoEm: '2024-01-15T10:00:00Z',
  },
  {
    id: 'gr-005', codigo: 'GR-005', nome: 'Falha de freio em composição',
    descricao: 'Perda parcial ou total do sistema de frenagem em composição carregada ou vazia.',
    categoria: 'equipamento', severidade: 'critico',
    probabilidade: 2, impacto: 5, scoreRisco: 10,
    medidasMitigacao: [
      { id: 'm11', descricao: 'Teste de freio completo antes de liberar composição', obrigatoria: true },
      { id: 'm12', descricao: 'Calço de segurança em linhas com declive', obrigatoria: true },
    ],
    ativo: true, patiosAfetados: [], criadoPor: 'ADM9001', criadoEm: '2024-01-15T10:00:00Z',
  },
  {
    id: 'gr-006', codigo: 'GR-006', nome: 'Defeito em via permanente',
    descricao: 'Quebra de trilho, desalinhamento, afundamento de lastro ou dormente comprometido na área do pátio.',
    categoria: 'via_permanente', severidade: 'alto',
    probabilidade: 3, impacto: 4, scoreRisco: 12,
    medidasMitigacao: [
      { id: 'm13', descricao: 'Inspeção semanal de via no perímetro do pátio', obrigatoria: true },
      { id: 'm14', descricao: 'Interdição imediata da linha afetada', obrigatoria: true },
      { id: 'm15', descricao: 'Sinalização com bandeirola vermelha', obrigatoria: false },
    ],
    ativo: true, patiosAfetados: ['VFZ'], criadoPor: 'ADM9001', criadoEm: '2024-01-15T10:00:00Z',
  },
  {
    id: 'gr-007', codigo: 'GR-007', nome: 'Movimentação não autorizada',
    descricao: 'Composição movimentada sem autorização do CCO ou inspetor de pátio.',
    categoria: 'operacional', severidade: 'alto',
    probabilidade: 2, impacto: 4, scoreRisco: 8,
    medidasMitigacao: [
      { id: 'm16', descricao: 'Confirmação via rádio com CCO antes de qualquer movimentação', obrigatoria: true },
      { id: 'm17', descricao: 'Registro em livro de ocorrências', obrigatoria: true },
    ],
    ativo: true, patiosAfetados: [], criadoPor: 'ADM9001', criadoEm: '2024-01-15T10:00:00Z',
  },
  {
    id: 'gr-008', codigo: 'GR-008', nome: 'Queda de material da composição',
    descricao: 'Desprendimento de carga (minério, vergalhão, container) durante movimentação no pátio.',
    categoria: 'seguranca', severidade: 'moderado',
    probabilidade: 3, impacto: 3, scoreRisco: 9,
    medidasMitigacao: [
      { id: 'm18', descricao: 'Verificação de amarração e contenção antes de liberar', obrigatoria: true },
      { id: 'm19', descricao: 'Área de exclusão durante carga/descarga', obrigatoria: false },
    ],
    ativo: true, patiosAfetados: [], criadoPor: 'ADM9001', criadoEm: '2024-01-15T10:00:00Z',
  },
  {
    id: 'gr-009', codigo: 'GR-009', nome: 'Exposição a ruído excessivo',
    descricao: 'Exposição prolongada a níveis de ruído acima de 85dB durante operações de manobra e formação.',
    categoria: 'seguranca', severidade: 'baixo',
    probabilidade: 4, impacto: 2, scoreRisco: 8,
    medidasMitigacao: [
      { id: 'm20', descricao: 'Uso obrigatório de protetor auricular', obrigatoria: true },
    ],
    ativo: true, patiosAfetados: [], criadoPor: 'ADM9001', criadoEm: '2024-01-15T10:00:00Z',
  },
  {
    id: 'gr-010', codigo: 'GR-010', nome: 'Incêndio em vagão ou área adjacente',
    descricao: 'Fogo em vagão, locomotiva, depósito ou vegetação na faixa de domínio do pátio.',
    categoria: 'ambiental', severidade: 'critico',
    probabilidade: 1, impacto: 5, scoreRisco: 5,
    medidasMitigacao: [
      { id: 'm21', descricao: 'Extintores posicionados a cada 100m no pátio', obrigatoria: true },
      { id: 'm22', descricao: 'Brigada de emergência acionável em até 5 minutos', obrigatoria: true },
      { id: 'm23', descricao: 'Roçagem periódica da faixa de domínio', obrigatoria: false },
    ],
    ativo: true, patiosAfetados: [], criadoPor: 'ADM9001', criadoEm: '2024-01-15T10:00:00Z',
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────

function gerarId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `gr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function carregarGraus(): GrauRisco[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GRAUS_RISCO);
    if (!raw) return GRAUS_DEFAULT;
    const saved: GrauRisco[] = JSON.parse(raw);
    return saved.length > 0 ? saved : GRAUS_DEFAULT;
  } catch {
    return GRAUS_DEFAULT;
  }
}

function persistirGraus(graus: GrauRisco[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.GRAUS_RISCO, JSON.stringify(graus));
  } catch { /* storage full — fail silently */ }
}

function calcularScore(probabilidade: number, impacto: number): number {
  return probabilidade * impacto;
}

function derivarSeveridade(score: number): GrauRisco['severidade'] {
  if (score >= 17) return 'critico';
  if (score >= 10) return 'alto';
  if (score >= 5) return 'moderado';
  return 'baixo';
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useGrausRisco() {
  const [graus, setGraus] = useState<GrauRisco[]>(carregarGraus);

  const criarGrau = useCallback((dados: Omit<GrauRisco, 'id' | 'criadoEm' | 'scoreRisco'>): { ok: boolean; erro?: string } => {
    if (!dados.nome.trim()) return { ok: false, erro: 'Nome é obrigatório' };
    if (!dados.codigo.trim()) return { ok: false, erro: 'Código é obrigatório' };

    const atuais = carregarGraus();
    if (atuais.some(g => g.codigo === dados.codigo.trim().toUpperCase())) {
      return { ok: false, erro: `Código "${dados.codigo}" já existe` };
    }

    const score = calcularScore(dados.probabilidade, dados.impacto);
    const novo: GrauRisco = {
      ...dados,
      id: gerarId(),
      codigo: dados.codigo.trim().toUpperCase(),
      nome: dados.nome.trim(),
      descricao: dados.descricao.trim(),
      scoreRisco: score,
      severidade: dados.severidade || derivarSeveridade(score),
      criadoEm: new Date().toISOString(),
    };
    const novaLista = [...atuais, novo];
    persistirGraus(novaLista);
    setGraus(novaLista);
    return { ok: true };
  }, []);

  const editarGrau = useCallback((id: string, dados: Partial<GrauRisco>): { ok: boolean; erro?: string } => {
    const atuais = carregarGraus();
    const idx = atuais.findIndex(g => g.id === id);
    if (idx === -1) return { ok: false, erro: 'Grau de risco não encontrado' };

    if (dados.codigo) {
      const codigoUp = dados.codigo.trim().toUpperCase();
      if (atuais.some((g, i) => i !== idx && g.codigo === codigoUp)) {
        return { ok: false, erro: `Código "${codigoUp}" já existe` };
      }
      dados.codigo = codigoUp;
    }

    const merged = { ...atuais[idx], ...dados, atualizadoEm: new Date().toISOString() };
    const prob = merged.probabilidade;
    const imp = merged.impacto;
    merged.scoreRisco = calcularScore(prob, imp);

    atuais[idx] = merged;
    persistirGraus(atuais);
    setGraus(atuais);
    return { ok: true };
  }, []);

  const excluirGrau = useCallback((id: string): { ok: boolean; erro?: string } => {
    const atuais = carregarGraus();
    const idx = atuais.findIndex(g => g.id === id);
    if (idx === -1) return { ok: false, erro: 'Grau de risco não encontrado' };
    atuais.splice(idx, 1);
    persistirGraus(atuais);
    setGraus([...atuais]);
    return { ok: true };
  }, []);

  const toggleAtivoGrau = useCallback((id: string): { ok: boolean } => {
    const atuais = carregarGraus();
    const idx = atuais.findIndex(g => g.id === id);
    if (idx === -1) return { ok: false };
    atuais[idx] = { ...atuais[idx], ativo: !atuais[idx].ativo, atualizadoEm: new Date().toISOString() };
    persistirGraus(atuais);
    setGraus(atuais);
    return { ok: true };
  }, []);

  // ── Derivados ──

  const grausAtivos = useMemo(() => graus.filter(g => g.ativo), [graus]);

  const grausPorCategoria = useMemo(() => {
    const map: Record<CategoriaRisco, GrauRisco[]> = {
      operacional: [], seguranca: [], ambiental: [],
      equipamento: [], via_permanente: [], custom: [],
    };
    graus.forEach(g => map[g.categoria].push(g));
    return map;
  }, [graus]);

  const estatisticas = useMemo(() => {
    const scores = graus.map(g => g.scoreRisco || 0);
    return {
      total: graus.length,
      ativos: graus.filter(g => g.ativo).length,
      criticos: graus.filter(g => g.severidade === 'critico').length,
      altos: graus.filter(g => g.severidade === 'alto').length,
      moderados: graus.filter(g => g.severidade === 'moderado').length,
      baixos: graus.filter(g => g.severidade === 'baixo').length,
      scoreMaximo: scores.length > 0 ? Math.max(...scores) : 0,
      scoreMedio: graus.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / graus.length * 10) / 10 : 0,
    };
  }, [graus]);

  return {
    graus, grausAtivos, grausPorCategoria, estatisticas,
    criarGrau, editarGrau, excluirGrau, toggleAtivoGrau,
    derivarSeveridade,
  };
}
