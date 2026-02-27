// ============================================================================
// EFVM360 v3.2 — Hook: Gerenciamento de Pátios (offline-first)
// localStorage é a fonte primária; backend é target de sync
// ============================================================================

import { useState, useCallback, useMemo } from 'react';
import type { PatioInfo } from '../types';
import { STORAGE_KEYS, PATIOS_PADRAO } from '../utils/constants';

// ── Helpers ─────────────────────────────────────────────────────────────

function carregarPatios(): PatioInfo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PATIOS);
    if (!raw) return [...PATIOS_PADRAO];
    const saved: PatioInfo[] = JSON.parse(raw);
    // Merge: defaults sempre presentes (atualizados pelo saved), custom adicionados
    const map = new Map<string, PatioInfo>();
    for (const p of PATIOS_PADRAO) map.set(p.codigo, { ...p });
    for (const p of saved) {
      if (map.has(p.codigo)) {
        // Atualizar status (ativo/nome) mas manter padrao=true para defaults
        const base = map.get(p.codigo)!;
        map.set(p.codigo, { ...base, ativo: p.ativo, nome: p.nome, atualizadoEm: p.atualizadoEm });
      } else {
        map.set(p.codigo, { ...p, padrao: false });
      }
    }
    return Array.from(map.values());
  } catch {
    return [...PATIOS_PADRAO];
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

  const criarPatio = useCallback((codigo: string, nome: string, criadoPor?: string): { ok: boolean; erro?: string } => {
    const codigoUp = codigo.trim().toUpperCase();
    const nomeClean = nome.trim();

    const erroCodigo = validarCodigo(codigoUp);
    if (erroCodigo) return { ok: false, erro: erroCodigo };
    if (!nomeClean) return { ok: false, erro: 'Nome é obrigatório' };

    const atuais = carregarPatios();
    if (atuais.some(p => p.codigo === codigoUp)) {
      return { ok: false, erro: `Código "${codigoUp}" já existe` };
    }

    const novo: PatioInfo = {
      codigo: codigoUp,
      nome: nomeClean,
      ativo: true,
      padrao: false,
      criadoEm: new Date().toISOString(),
      criadoPor,
    };
    const novaLista = [...atuais, novo];
    persistirPatios(novaLista);
    setPatios(novaLista);
    return { ok: true };
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

  return {
    patios,
    patiosAtivos,
    criarPatio,
    editarPatio,
    desativarPatio,
    ativarPatio,
    getPatioNome,
  };
}
