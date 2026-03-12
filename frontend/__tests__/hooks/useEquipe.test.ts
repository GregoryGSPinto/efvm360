// ============================================================================
// EFVM360 — Tests: useEquipe Hook
// Team loading, grouping by function, yard filtering
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { _carregarUsuarios, _montarEquipe, isAdminGlobal, type MembroEquipe } from '../../src/hooks/useEquipe';
import type { FuncaoUsuario } from '../../src/types';

type StorageMock = Pick<Storage, 'clear' | 'getItem'>;

// ── Mock users matching seed structure ──────────────────────────────────

function criarUsuario(overrides: Partial<MembroEquipe> & { matricula: string }): MembroEquipe {
  return {
    nome: 'Teste Usuario',
    funcao: 'maquinista',
    turno: 'A',
    horarioTurno: '07-19',
    primaryYard: 'VFZ',
    status: 'active',
    ...overrides,
  };
}

const SEED_VFZ = [
  criarUsuario({ matricula: 'VFZ1001', nome: 'Carlos Eduardo Silva', funcao: 'maquinista', turno: 'A', primaryYard: 'VFZ' }),
  criarUsuario({ matricula: 'VFZ1002', nome: 'Roberto Almeida Santos', funcao: 'maquinista', turno: 'A', primaryYard: 'VFZ' }),
  criarUsuario({ matricula: 'VFZ1003', nome: 'Marcos Vinícius Souza', funcao: 'maquinista', turno: 'B', primaryYard: 'VFZ' }),
  criarUsuario({ matricula: 'VFZ1004', nome: 'Anderson Pereira Lima', funcao: 'maquinista', turno: 'B', primaryYard: 'VFZ' }),
  criarUsuario({ matricula: 'VFZ1005', nome: 'Diego Ferreira Gomes', funcao: 'oficial', turno: 'A', primaryYard: 'VFZ' }),
  criarUsuario({ matricula: 'VFZ2001', nome: 'Ricardo Mendes Ferreira', funcao: 'inspetor', primaryYard: 'VFZ' }),
  criarUsuario({ matricula: 'VFZ3001', nome: 'Paulo Henrique Barbosa', funcao: 'gestor', primaryYard: 'VFZ' }),
];

const SEED_VBR = [
  criarUsuario({ matricula: 'VBR1001', nome: 'Thiago Oliveira Costa', funcao: 'maquinista', turno: 'A', primaryYard: 'VBR' }),
  criarUsuario({ matricula: 'VBR3001', nome: 'Marcelo Augusto Reis', funcao: 'gestor', primaryYard: 'VBR' }),
];

const ADMIN = criarUsuario({ matricula: 'ADM9001', nome: 'Gregory Administrador', funcao: 'gestor', primaryYard: 'VFZ' });
const SUPORTE = criarUsuario({ matricula: 'SUP0001', nome: 'Suporte Tecnico', funcao: 'suporte' as FuncaoUsuario, primaryYard: 'VFZ' });

function mockUsuarios(usuarios: MembroEquipe[]) {
  (localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
    if (key === 'efvm360-usuarios') return JSON.stringify(usuarios);
    return null;
  });
}

// ── Tests ───────────────────────────────────────────────────────────────

beforeEach(() => {
  (localStorage as StorageMock).clear();
  (localStorage.getItem as ReturnType<typeof vi.fn>).mockReset();
  vi.clearAllMocks();
});

describe('_carregarUsuarios', () => {
  it('retorna array vazio sem dados no localStorage', () => {
    expect(_carregarUsuarios()).toEqual([]);
  });

  it('carrega e mapeia usuários corretamente', () => {
    mockUsuarios(SEED_VFZ);
    const result = _carregarUsuarios();
    expect(result).toHaveLength(7);
    expect(result[0].matricula).toBe('VFZ1001');
    expect(result[0].funcao).toBe('maquinista');
    expect(result[0].primaryYard).toBe('VFZ');
  });

  it('retorna array vazio se JSON inválido', () => {
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('invalid json{');
    expect(_carregarUsuarios()).toEqual([]);
  });
});

describe('_montarEquipe', () => {
  it('agrupa equipe VFZ: 1 gestor, 1 inspetor, 4 maquinistas, 1 oficial', () => {
    const equipe = _montarEquipe(SEED_VFZ, 'VFZ');
    expect(equipe.codigoPatio).toBe('VFZ');
    expect(equipe.gestor?.matricula).toBe('VFZ3001');
    expect(equipe.inspetores).toHaveLength(1);
    expect(equipe.inspetores[0].matricula).toBe('VFZ2001');
    expect(equipe.maquinistas).toHaveLength(4);
    expect(equipe.oficiais).toHaveLength(1);
    expect(equipe.totalMembros).toBe(7);
  });

  it('retorna equipe vazia para pátio inexistente', () => {
    const equipe = _montarEquipe(SEED_VFZ, 'XXX');
    expect(equipe.totalMembros).toBe(0);
    expect(equipe.gestor).toBeNull();
    expect(equipe.maquinistas).toHaveLength(0);
  });

  it('não inclui admin (ADM*) na equipe de nenhum pátio', () => {
    const todos = [...SEED_VFZ, ADMIN];
    const equipe = _montarEquipe(todos, 'VFZ');
    expect(equipe.totalMembros).toBe(7); // Sem o admin
    expect(equipe.gestor?.matricula).toBe('VFZ3001');
  });

  it('não inclui suporte (SUP*) na equipe', () => {
    const todos = [...SEED_VFZ, SUPORTE];
    const equipe = _montarEquipe(todos, 'VFZ');
    expect(equipe.totalMembros).toBe(7);
  });

  it('filtra corretamente por pátio quando há múltiplos pátios', () => {
    const todos = [...SEED_VFZ, ...SEED_VBR];
    const equipeVFZ = _montarEquipe(todos, 'VFZ');
    const equipeVBR = _montarEquipe(todos, 'VBR');
    expect(equipeVFZ.totalMembros).toBe(7);
    expect(equipeVBR.totalMembros).toBe(2);
    expect(equipeVBR.gestor?.nome).toBe('Marcelo Augusto Reis');
  });

  it('nomePatio retorna nome legível do registro de pátios', () => {
    const equipe = _montarEquipe(SEED_VFZ, 'VFZ');
    expect(equipe.nomePatio).toContain('Fazend');
  });
});

describe('isAdminGlobal', () => {
  it('retorna true para matrícula ADM*', () => {
    expect(isAdminGlobal('ADM9001')).toBe(true);
    expect(isAdminGlobal('ADM0001')).toBe(true);
  });

  it('retorna false para matrícula normal', () => {
    expect(isAdminGlobal('VFZ1001')).toBe(false);
    expect(isAdminGlobal('P61001')).toBe(false);
  });

  it('retorna false para undefined', () => {
    expect(isAdminGlobal(undefined)).toBe(false);
    expect(isAdminGlobal()).toBe(false);
  });
});
