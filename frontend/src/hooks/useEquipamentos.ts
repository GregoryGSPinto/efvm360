// ============================================================================
// EFVM360 v3.2 — Hook: Gestão de Equipamentos Operacionais (offline-first)
// localStorage é a fonte primária; backend é target de sync
// ============================================================================

import { useState, useCallback, useMemo } from 'react';
import type { EquipamentoConfig, CategoriaEquipamento } from '../types';
import { STORAGE_KEYS } from '../utils/constants';

// ── Seed Data ───────────────────────────────────────────────────────────

const EQUIPAMENTOS_DEFAULT: EquipamentoConfig[] = [
  {
    id: 'eq-001', nome: 'Rádio VHF', descricao: 'Rádio comunicação VHF para contato com CCO e equipes de pátio',
    categoria: 'comunicacao', criticidade: 'essencial', quantidadeMinima: 2,
    unidade: 'unidade', ativo: true, patiosAfetados: [],
    criadoPor: 'ADM9001', criadoEm: '2024-01-01T00:00:00Z',
  },
  {
    id: 'eq-002', nome: 'Lanterna ferroviária', descricao: 'Lanterna de sinalização para manobras noturnas e túneis',
    categoria: 'sinalizacao', criticidade: 'essencial', quantidadeMinima: 2,
    unidade: 'unidade', ativo: true, patiosAfetados: [],
    criadoPor: 'ADM9001', criadoEm: '2024-01-01T00:00:00Z',
  },
  {
    id: 'eq-003', nome: 'Calço de via', descricao: 'Calço metálico para imobilização de vagões em linha',
    categoria: 'seguranca', criticidade: 'essencial', quantidadeMinima: 4,
    unidade: 'unidade', ativo: true, patiosAfetados: [],
    criadoPor: 'ADM9001', criadoEm: '2024-01-01T00:00:00Z',
  },
  {
    id: 'eq-004', nome: 'Manômetro', descricao: 'Manômetro para verificação de pressão do sistema de freios',
    categoria: 'medicao', criticidade: 'essencial', quantidadeMinima: 1,
    unidade: 'unidade', ativo: true, patiosAfetados: [],
    criadoPor: 'ADM9001', criadoEm: '2024-01-01T00:00:00Z',
  },
  {
    id: 'eq-005', nome: 'Bandeirola vermelha', descricao: 'Bandeirola de sinalização para interdição de via e manobras',
    categoria: 'sinalizacao', criticidade: 'importante', quantidadeMinima: 2,
    unidade: 'unidade', ativo: true, patiosAfetados: [],
    criadoPor: 'ADM9001', criadoEm: '2024-01-01T00:00:00Z',
  },
  {
    id: 'eq-006', nome: 'Bandeirola verde', descricao: 'Bandeirola de sinalização para liberação de via',
    categoria: 'sinalizacao', criticidade: 'importante', quantidadeMinima: 2,
    unidade: 'unidade', ativo: true, patiosAfetados: [],
    criadoPor: 'ADM9001', criadoEm: '2024-01-01T00:00:00Z',
  },
  {
    id: 'eq-007', nome: 'Colete refletivo', descricao: 'Colete de alta visibilidade para circulação em área operacional',
    categoria: 'epi', criticidade: 'essencial', quantidadeMinima: 1,
    unidade: 'unidade', ativo: true, patiosAfetados: [],
    criadoPor: 'ADM9001', criadoEm: '2024-01-01T00:00:00Z',
  },
  {
    id: 'eq-008', nome: 'Protetor auricular', descricao: 'Protetor auricular tipo concha ou plug para áreas de manobra',
    categoria: 'epi', criticidade: 'essencial', quantidadeMinima: 1,
    unidade: 'par', ativo: true, patiosAfetados: [],
    criadoPor: 'ADM9001', criadoEm: '2024-01-01T00:00:00Z',
  },
  {
    id: 'eq-009', nome: 'Chave de AMV', descricao: 'Chave manual para operação de Aparelho de Mudança de Via',
    categoria: 'ferramental', criticidade: 'essencial', quantidadeMinima: 1,
    unidade: 'unidade', ativo: true, patiosAfetados: [],
    criadoPor: 'ADM9001', criadoEm: '2024-01-01T00:00:00Z',
  },
  {
    id: 'eq-010', nome: 'Kit primeiros socorros', descricao: 'Kit de primeiros socorros para atendimento emergencial em campo',
    categoria: 'seguranca', criticidade: 'importante', quantidadeMinima: 1,
    unidade: 'kit', ativo: true, patiosAfetados: [],
    criadoPor: 'ADM9001', criadoEm: '2024-01-01T00:00:00Z',
  },
  {
    id: 'eq-011', nome: 'Óculos de proteção', descricao: 'Óculos de segurança para proteção contra partículas e poeira de minério',
    categoria: 'epi', criticidade: 'importante', quantidadeMinima: 1,
    unidade: 'unidade', ativo: true, patiosAfetados: [],
    criadoPor: 'ADM9001', criadoEm: '2024-01-01T00:00:00Z',
  },
  {
    id: 'eq-012', nome: 'Trena métrica (5m)', descricao: 'Trena para verificação de distâncias de calço e posicionamento',
    categoria: 'medicao', criticidade: 'complementar', quantidadeMinima: 1,
    unidade: 'unidade', ativo: true, patiosAfetados: [],
    criadoPor: 'ADM9001', criadoEm: '2024-01-01T00:00:00Z',
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────

function gerarId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `eq-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function carregarEquipamentos(): EquipamentoConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EQUIPAMENTOS_CONFIG);
    if (!raw) return EQUIPAMENTOS_DEFAULT;
    const saved: EquipamentoConfig[] = JSON.parse(raw);
    return saved.length > 0 ? saved : EQUIPAMENTOS_DEFAULT;
  } catch {
    return EQUIPAMENTOS_DEFAULT;
  }
}

function persistirEquipamentos(equipamentos: EquipamentoConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EQUIPAMENTOS_CONFIG, JSON.stringify(equipamentos));
  } catch { /* storage full — fail silently */ }
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useEquipamentos() {
  const [equipamentos, setEquipamentos] = useState<EquipamentoConfig[]>(carregarEquipamentos);

  const criarEquipamento = useCallback((dados: Omit<EquipamentoConfig, 'id' | 'criadoEm'>): { ok: boolean; erro?: string } => {
    if (!dados.nome.trim()) return { ok: false, erro: 'Nome é obrigatório' };

    const atuais = carregarEquipamentos();
    if (atuais.some(e => e.nome.toLowerCase() === dados.nome.trim().toLowerCase())) {
      return { ok: false, erro: `Equipamento "${dados.nome}" já existe` };
    }

    const novo: EquipamentoConfig = {
      ...dados,
      id: gerarId(),
      nome: dados.nome.trim(),
      descricao: dados.descricao.trim(),
      criadoEm: new Date().toISOString(),
    };
    const novaLista = [...atuais, novo];
    persistirEquipamentos(novaLista);
    setEquipamentos(novaLista);
    return { ok: true };
  }, []);

  const editarEquipamento = useCallback((id: string, dados: Partial<EquipamentoConfig>): { ok: boolean; erro?: string } => {
    const atuais = carregarEquipamentos();
    const idx = atuais.findIndex(e => e.id === id);
    if (idx === -1) return { ok: false, erro: 'Equipamento não encontrado' };

    if (dados.nome) {
      const nomeLower = dados.nome.trim().toLowerCase();
      if (atuais.some((e, i) => i !== idx && e.nome.toLowerCase() === nomeLower)) {
        return { ok: false, erro: `Equipamento "${dados.nome}" já existe` };
      }
    }

    atuais[idx] = { ...atuais[idx], ...dados, atualizadoEm: new Date().toISOString() };
    persistirEquipamentos(atuais);
    setEquipamentos([...atuais]);
    return { ok: true };
  }, []);

  const excluirEquipamento = useCallback((id: string): { ok: boolean; erro?: string } => {
    const atuais = carregarEquipamentos();
    const idx = atuais.findIndex(e => e.id === id);
    if (idx === -1) return { ok: false, erro: 'Equipamento não encontrado' };
    atuais.splice(idx, 1);
    persistirEquipamentos(atuais);
    setEquipamentos([...atuais]);
    return { ok: true };
  }, []);

  const toggleAtivoEquipamento = useCallback((id: string): { ok: boolean } => {
    const atuais = carregarEquipamentos();
    const idx = atuais.findIndex(e => e.id === id);
    if (idx === -1) return { ok: false };
    atuais[idx] = { ...atuais[idx], ativo: !atuais[idx].ativo, atualizadoEm: new Date().toISOString() };
    persistirEquipamentos(atuais);
    setEquipamentos([...atuais]);
    return { ok: true };
  }, []);

  // ── Derivados ──

  const equipamentosAtivos = useMemo(() => equipamentos.filter(e => e.ativo), [equipamentos]);

  const porCategoria = useMemo(() => {
    const map: Record<CategoriaEquipamento, EquipamentoConfig[]> = {
      comunicacao: [], sinalizacao: [], seguranca: [],
      medicao: [], ferramental: [], epi: [], outro: [],
    };
    equipamentos.forEach(e => map[e.categoria].push(e));
    return map;
  }, [equipamentos]);

  const categoriasComItens = useMemo(() => {
    return (Object.keys(porCategoria) as CategoriaEquipamento[]).filter(cat => porCategoria[cat].length > 0);
  }, [porCategoria]);

  const estatisticas = useMemo(() => ({
    total: equipamentos.length,
    ativos: equipamentos.filter(e => e.ativo).length,
    essenciais: equipamentos.filter(e => e.criticidade === 'essencial').length,
    categoriasCobertas: categoriasComItens.length,
  }), [equipamentos, categoriasComItens]);

  return {
    equipamentos, equipamentosAtivos, porCategoria, categoriasComItens, estatisticas,
    criarEquipamento, editarEquipamento, excluirEquipamento, toggleAtivoEquipamento,
  };
}
