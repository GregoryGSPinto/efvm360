// ============================================================================
// EFVM360 — useEquipe Hook
// Carrega e agrupa membros da equipe por pátio (primaryYard)
// ============================================================================

import { useMemo } from 'react';
import { STORAGE_KEYS } from '../utils/constants';
import type { FuncaoUsuario, TurnoLetra, TurnoHorario } from '../types';
import { getYardName, type YardCode, ALL_YARD_CODES } from '../domain/aggregates/YardRegistry';

// ── Types ──────────────────────────────────────────────────────────────

export interface MembroEquipe {
  matricula: string;
  nome: string;
  funcao: FuncaoUsuario;
  turno?: TurnoLetra;
  horarioTurno?: TurnoHorario;
  primaryYard: string;
  status: string;
}

export interface EquipePatio {
  codigoPatio: string;
  nomePatio: string;
  gestor: MembroEquipe | null;
  inspetores: MembroEquipe[];
  maquinistas: MembroEquipe[];
  oficiais: MembroEquipe[];
  totalMembros: number;
}

// ── Helpers ────────────────────────────────────────────────────────────

function carregarUsuarios(): MembroEquipe[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USUARIOS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((u: Record<string, unknown>) => ({
      matricula: String(u.matricula || ''),
      nome: String(u.nome || ''),
      funcao: (u.funcao || 'maquinista') as FuncaoUsuario,
      turno: u.turno as TurnoLetra | undefined,
      horarioTurno: u.horarioTurno as TurnoHorario | undefined,
      primaryYard: String(u.primaryYard || ''),
      status: String(u.status || 'active'),
    }));
  } catch {
    return [];
  }
}

function montarEquipe(membros: MembroEquipe[], codigoPatio: string): EquipePatio {
  // Exclude admin (ADM*) and suporte (SUP*) from yard-specific teams
  const dosPatio = membros.filter(m =>
    m.primaryYard === codigoPatio &&
    !m.matricula.startsWith('ADM') &&
    !m.matricula.startsWith('SUP')
  );

  return {
    codigoPatio,
    nomePatio: getYardName(codigoPatio as YardCode),
    gestor: dosPatio.find(m => m.funcao === 'gestor') || null,
    inspetores: dosPatio.filter(m => m.funcao === 'inspetor'),
    maquinistas: dosPatio.filter(m => m.funcao === 'maquinista'),
    oficiais: dosPatio.filter(m => m.funcao === 'oficial'),
    totalMembros: dosPatio.length,
  };
}

// ── Hooks ──────────────────────────────────────────────────────────────

/**
 * Retorna a equipe de um pátio específico.
 */
export function useEquipe(codigoPatio: string): EquipePatio {
  return useMemo(() => {
    if (!codigoPatio) {
      return { codigoPatio: '', nomePatio: '', gestor: null, inspetores: [], maquinistas: [], oficiais: [], totalMembros: 0 };
    }
    const todos = carregarUsuarios();
    return montarEquipe(todos, codigoPatio);
  }, [codigoPatio]);
}

/**
 * Retorna a equipe do pátio do usuário logado.
 * Se admin (ADM*), retorna null — usar useTodasEquipes para admin.
 */
export function useMinhaEquipe(usuarioLogado: { matricula?: string; primaryYard?: string } | null): EquipePatio | null {
  const patio = usuarioLogado?.primaryYard || '';
  const isAdmin = usuarioLogado?.matricula?.startsWith('ADM') || false;
  return useMemo(() => {
    if (!patio || isAdmin) return null;
    const todos = carregarUsuarios();
    return montarEquipe(todos, patio);
  }, [patio, isAdmin]);
}

/**
 * Retorna as equipes de TODOS os pátios (para admin).
 */
export function useTodasEquipes(): EquipePatio[] {
  return useMemo(() => {
    const todos = carregarUsuarios();
    return ALL_YARD_CODES.map(code => montarEquipe(todos, code));
  }, []);
}

/**
 * Verifica se o usuário é admin global (ADM*).
 */
export function isAdminGlobal(matricula?: string): boolean {
  return matricula?.startsWith('ADM') || false;
}

// Export for testing
export { carregarUsuarios as _carregarUsuarios, montarEquipe as _montarEquipe };
