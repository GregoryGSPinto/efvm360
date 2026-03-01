// ============================================================================
// EFVM360 v3.2 — Hook: Gerenciamento de Pátios (offline-first)
// localStorage é a fonte primária; backend é target de sync
// ============================================================================

import { useState, useCallback, useMemo } from 'react';
import type { PatioInfo, LinhaPatioInfo, CategoriaPatio } from '../types';
import { STORAGE_KEYS, PATIOS_PADRAO } from '../utils/constants';
import { provisionarUsuariosPatio } from '../services/patioProvisioning';

// ── Helpers ─────────────────────────────────────────────────────────────

function normalizarPatio(patio: PatioInfo): PatioInfo {
  // Already has categories → keep, sync flat linhas
  if (patio.categorias && patio.categorias.length > 0) {
    const linhasFlat = patio.categorias.flatMap(c => c.linhas);
    return { ...patio, linhas: linhasFlat };
  }
  // Only flat linhas (legacy) → migrate to single "Geral" category
  if (patio.linhas && patio.linhas.length > 0) {
    return {
      ...patio,
      categorias: [{ id: `${patio.codigo}-geral`, nome: 'Geral', linhas: patio.linhas }],
    };
  }
  // Nothing → create default structure
  return {
    ...patio,
    categorias: [
      { id: `${patio.codigo}-cima`, nome: 'Pátio de Cima', linhas: [] },
      { id: `${patio.codigo}-baixo`, nome: 'Pátio de Baixo', linhas: [] },
    ],
    linhas: [],
  };
}

function carregarPatios(): PatioInfo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PATIOS);
    if (!raw) return PATIOS_PADRAO.map(normalizarPatio);
    const saved: PatioInfo[] = JSON.parse(raw);
    const map = new Map<string, PatioInfo>();
    for (const p of PATIOS_PADRAO) map.set(p.codigo, { ...p });
    for (const p of saved) {
      if (map.has(p.codigo)) {
        const base = map.get(p.codigo)!;
        map.set(p.codigo, {
          ...base,
          ativo: p.ativo,
          nome: p.nome,
          atualizadoEm: p.atualizadoEm,
          linhas: p.linhas,
          categorias: p.categorias,
        });
      } else {
        map.set(p.codigo, { ...p, padrao: false });
      }
    }
    return Array.from(map.values()).map(normalizarPatio);
  } catch {
    return PATIOS_PADRAO.map(normalizarPatio);
  }
}

function persistirPatios(patios: PatioInfo[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PATIOS, JSON.stringify(patios));
  } catch { /* storage full — fail silently */ }
}

function validarCodigo(codigo: string): string | null {
  if (!codigo) return 'Codigo é obrigatório';
  if (codigo.length > 5) return 'Código deve ter no máximo 5 caracteres';
  if (!/^[A-Z0-9]+$/i.test(codigo)) return 'Código deve ser alfanumérico';
  return null;
}

// ── Hook ────────────────────────────────────────────────────────────────

export function usePatio() {
  const [patios, setPatios] = useState<PatioInfo[]>(carregarPatios);

  const patiosAtivos = useMemo(() => patios.filter(p => p.ativo), [patios]);

  const criarPatio = useCallback((codigo: string, nome: string, criadoPor?: string): { ok: boolean; erro?: string; usuariosCriados?: Array<{ matricula: string; funcao: string }> } => {
    const codigoUp = codigo.trim().toUpperCase();
    const nomeClean = nome.trim();

    const erroCodigo = validarCodigo(codigoUp);
    if (erroCodigo) return { ok: false, erro: erroCodigo };
    if (!nomeClean) return { ok: false, erro: 'Nome é obrigatório' };

    const atuais = carregarPatios();
    if (atuais.some(p => p.codigo === codigoUp)) {
      return { ok: false, erro: `Código "${codigoUp}" já existe` };
    }

    const novo: PatioInfo = normalizarPatio({
      codigo: codigoUp,
      nome: nomeClean,
      ativo: true,
      padrao: false,
      criadoEm: new Date().toISOString(),
      criadoPor,
    });
    const novaLista = [...atuais, novo];
    persistirPatios(novaLista);
    setPatios(novaLista);

    const usuariosCriados = provisionarUsuariosPatio(codigoUp, nomeClean);
    return { ok: true, usuariosCriados };
  }, []);

  const editarPatio = useCallback((codigo: string, nome: string): { ok: boolean; erro?: string } => {
    const nomeClean = nome.trim();
    if (!nomeClean) return { ok: false, erro: 'Nome é obrigatório' };
    const atuais = carregarPatios();
    const idx = atuais.findIndex(p => p.codigo === codigo);
    if (idx === -1) return { ok: false, erro: 'Pátio não encontrado' };
    atuais[idx] = { ...atuais[idx], nome: nomeClean, atualizadoEm: new Date().toISOString() };
    persistirPatios(atuais);
    setPatios(atuais);
    return { ok: true };
  }, []);

  const desativarPatio = useCallback((codigo: string): { ok: boolean; erro?: string } => {
    const atuais = carregarPatios();
    const idx = atuais.findIndex(p => p.codigo === codigo);
    if (idx === -1) return { ok: false, erro: 'Pátio não encontrado' };
    atuais[idx] = { ...atuais[idx], ativo: false, atualizadoEm: new Date().toISOString() };
    persistirPatios(atuais);
    setPatios(atuais);
    return { ok: true };
  }, []);

  const ativarPatio = useCallback((codigo: string): { ok: boolean; erro?: string } => {
    const atuais = carregarPatios();
    const idx = atuais.findIndex(p => p.codigo === codigo);
    if (idx === -1) return { ok: false, erro: 'Pátio não encontrado' };
    atuais[idx] = { ...atuais[idx], ativo: true, atualizadoEm: new Date().toISOString() };
    persistirPatios(atuais);
    setPatios(atuais);
    return { ok: true };
  }, []);

  const getPatioNome = useCallback((codigo: string): string => {
    const p = patios.find(p => p.codigo === codigo);
    return p?.nome || codigo;
  }, [patios]);

  const adicionarLinha = useCallback((codigoPatio: string, linha: LinhaPatioInfo): { ok: boolean; erro?: string } => {
    const atuais = carregarPatios();
    const idx = atuais.findIndex(p => p.codigo === codigoPatio);
    if (idx === -1) return { ok: false, erro: 'Pátio não encontrado' };
    const linhas = atuais[idx].linhas || [];
    if (linhas.some(l => l.nome === linha.nome)) return { ok: false, erro: 'Linha já existe neste pátio' };
    atuais[idx] = { ...atuais[idx], linhas: [...linhas, linha], atualizadoEm: new Date().toISOString() };
    persistirPatios(atuais);
    setPatios(atuais);
    return { ok: true };
  }, []);

  const editarLinha = useCallback((codigoPatio: string, indexLinha: number, dados: Partial<LinhaPatioInfo>): { ok: boolean } => {
    const atuais = carregarPatios();
    const idx = atuais.findIndex(p => p.codigo === codigoPatio);
    if (idx === -1) return { ok: false };
    const linhas = [...(atuais[idx].linhas || [])];
    if (indexLinha < 0 || indexLinha >= linhas.length) return { ok: false };
    linhas[indexLinha] = { ...linhas[indexLinha], ...dados };
    atuais[idx] = { ...atuais[idx], linhas, atualizadoEm: new Date().toISOString() };
    persistirPatios(atuais);
    setPatios(atuais);
    return { ok: true };
  }, []);

  const editarLinhasPatio = useCallback((codigo: string, linhas: LinhaPatioInfo[]): { ok: boolean; erro?: string } => {
    if (linhas.length === 0) return { ok: false, erro: 'O pátio deve ter pelo menos 1 linha' };
    const atuais = carregarPatios();
    const idx = atuais.findIndex(p => p.codigo === codigo);
    if (idx === -1) return { ok: false, erro: 'Pátio não encontrado' };
    atuais[idx] = { ...atuais[idx], linhas, atualizadoEm: new Date().toISOString() };
    persistirPatios(atuais);
    setPatios(atuais);
    return { ok: true };
  }, []);

  const editarCategoriasPatio = useCallback((codigo: string, categorias: CategoriaPatio[], linhasFlat: LinhaPatioInfo[]): { ok: boolean; erro?: string } => {
    if (categorias.length === 0) return { ok: false, erro: 'Pelo menos 1 categoria é necessária' };
    const atuais = carregarPatios();
    const idx = atuais.findIndex(p => p.codigo === codigo);
    if (idx === -1) return { ok: false, erro: 'Pátio não encontrado' };
    atuais[idx] = { ...atuais[idx], categorias, linhas: linhasFlat, atualizadoEm: new Date().toISOString() };
    persistirPatios(atuais);
    setPatios(atuais);
    return { ok: true };
  }, []);

  const removerLinha = useCallback((codigoPatio: string, indexLinha: number): { ok: boolean } => {
    const atuais = carregarPatios();
    const idx = atuais.findIndex(p => p.codigo === codigoPatio);
    if (idx === -1) return { ok: false };
    const linhas = [...(atuais[idx].linhas || [])];
    if (indexLinha < 0 || indexLinha >= linhas.length) return { ok: false };
    linhas.splice(indexLinha, 1);
    atuais[idx] = { ...atuais[idx], linhas, atualizadoEm: new Date().toISOString() };
    persistirPatios(atuais);
    setPatios(atuais);
    return { ok: true };
  }, []);

  return {
    patios,
    patiosAtivos,
    criarPatio,
    editarPatio,
    desativarPatio,
    ativarPatio,
    getPatioNome,
    adicionarLinha,
    editarLinha,
    editarLinhasPatio,
    editarCategoriasPatio,
    removerLinha,
  };
}
