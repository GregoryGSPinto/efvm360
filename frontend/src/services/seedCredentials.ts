// ============================================================================
// EFVM PÁTIO 360 — Seed de Credenciais v8
// 41 operadores: 7 por pátio × 5 pátios + 1 supervisor + 1 coordenador
//   + 1 gerente + 1 diretor + 1 admin global + 1 suporte
// Senha padrão: 123456
// ============================================================================

import type { UsuarioCadastro, FuncaoUsuario, TurnoLetra, TurnoHorario } from '../types';
import { secureLog } from './security';
import { verificarPatiosOrfaos } from './patioProvisioning';

const STORAGE_KEY = 'efvm360-usuarios';
const SEED_MARKER = 'efvm360-seed-applied';
const SEED_VERSION = 'efvm360-seed-v8';
// REVIEW [SECURITY]: Hardcoded dev/test password. Must be replaced with Azure AD
// SSO or hashed credentials before production deployment.
const DEFAULT_PASSWORD = '123456';

interface SeedUser {
  nome: string;
  matricula: string;
  funcao: FuncaoUsuario;
  turno?: TurnoLetra;
  horarioTurno?: TurnoHorario;
  primaryYard: string;
  senha?: string;
}

// ── Credenciais Multi-Pátio ────────────────────────────────────────────

const EFVM360_USERS: SeedUser[] = [
  // ═══ VFZ — Pátio de Fazendão (Flexal) ═══
  { nome: 'Carlos Eduardo Silva',      matricula: 'VFZ1001', funcao: 'maquinista', turno: 'A', horarioTurno: '07-19', primaryYard: 'VFZ' },
  { nome: 'Roberto Almeida Santos',     matricula: 'VFZ1002', funcao: 'maquinista', turno: 'A', horarioTurno: '07-19', primaryYard: 'VFZ' },
  { nome: 'Marcos Vinícius Souza',      matricula: 'VFZ1003', funcao: 'maquinista', turno: 'B', horarioTurno: '19-07', primaryYard: 'VFZ' },
  { nome: 'Anderson Pereira Lima',      matricula: 'VFZ1004', funcao: 'maquinista', turno: 'B', horarioTurno: '19-07', primaryYard: 'VFZ' },
  { nome: 'Diego Ferreira Gomes',       matricula: 'VFZ1005', funcao: 'oficial',    turno: 'A', horarioTurno: '07-19', primaryYard: 'VFZ' },
  { nome: 'Ricardo Mendes Ferreira',    matricula: 'VFZ2001', funcao: 'inspetor',                                       primaryYard: 'VFZ' },
  { nome: 'Paulo Henrique Barbosa',     matricula: 'VFZ3001', funcao: 'gestor',                                         primaryYard: 'VFZ' },

  // ═══ VBR — Pátio de Barão de Cocais ═══
  { nome: 'Thiago Oliveira Costa',      matricula: 'VBR1001', funcao: 'maquinista', turno: 'A', horarioTurno: '07-19', primaryYard: 'VBR' },
  { nome: 'Lucas Martins Rocha',        matricula: 'VBR1002', funcao: 'maquinista', turno: 'A', horarioTurno: '07-19', primaryYard: 'VBR' },
  { nome: 'Gustavo Henrique Dias',      matricula: 'VBR1003', funcao: 'maquinista', turno: 'B', horarioTurno: '19-07', primaryYard: 'VBR' },
  { nome: 'Rafael Souza Nascimento',    matricula: 'VBR1004', funcao: 'maquinista', turno: 'B', horarioTurno: '19-07', primaryYard: 'VBR' },
  { nome: 'Bruno Carvalho Mendes',      matricula: 'VBR1005', funcao: 'oficial',    turno: 'A', horarioTurno: '07-19', primaryYard: 'VBR' },
  { nome: 'Alexandre Ribeiro Pinto',    matricula: 'VBR2001', funcao: 'inspetor',                                       primaryYard: 'VBR' },
  { nome: 'Marcelo Augusto Reis',       matricula: 'VBR3001', funcao: 'gestor',                                         primaryYard: 'VBR' },

  // ═══ VCS — Pátio de Costa Lacerda ═══
  { nome: 'Wellington Santos Lima',      matricula: 'VCS1001', funcao: 'maquinista', turno: 'A', horarioTurno: '07-19', primaryYard: 'VCS' },
  { nome: 'Rodrigo Alves Moreira',      matricula: 'VCS1002', funcao: 'maquinista', turno: 'A', horarioTurno: '07-19', primaryYard: 'VCS' },
  { nome: 'Fábio Henrique Cruz',        matricula: 'VCS1003', funcao: 'maquinista', turno: 'B', horarioTurno: '19-07', primaryYard: 'VCS' },
  { nome: 'Leandro Souza Ramos',        matricula: 'VCS1004', funcao: 'maquinista', turno: 'B', horarioTurno: '19-07', primaryYard: 'VCS' },
  { nome: 'Eduardo Martins Prado',      matricula: 'VCS1005', funcao: 'oficial',    turno: 'A', horarioTurno: '07-19', primaryYard: 'VCS' },
  { nome: 'Fernando Costa Oliveira',    matricula: 'VCS2001', funcao: 'inspetor',                                       primaryYard: 'VCS' },
  { nome: 'Sérgio Magalhães Junior',    matricula: 'VCS3001', funcao: 'gestor',                                         primaryYard: 'VCS' },

  // ═══ P6 — Pátio Pedro Nolasco ═══
  { nome: 'Adriano Pereira Nunes',      matricula: 'P61001',  funcao: 'maquinista', turno: 'A', horarioTurno: '07-19', primaryYard: 'P6' },
  { nome: 'Vinícius Campos Batista',    matricula: 'P61002',  funcao: 'maquinista', turno: 'A', horarioTurno: '07-19', primaryYard: 'P6' },
  { nome: 'Renato Gonçalves Duarte',    matricula: 'P61003',  funcao: 'maquinista', turno: 'B', horarioTurno: '19-07', primaryYard: 'P6' },
  { nome: 'Cláudio Azevedo Freitas',    matricula: 'P61004',  funcao: 'maquinista', turno: 'B', horarioTurno: '19-07', primaryYard: 'P6' },
  { nome: 'Márcio Tavares Borges',      matricula: 'P61005',  funcao: 'oficial',    turno: 'A', horarioTurno: '07-19', primaryYard: 'P6' },
  { nome: 'José Ricardo Andrade',       matricula: 'P62001',  funcao: 'inspetor',                                       primaryYard: 'P6' },
  { nome: 'Antonio Marcos Cardoso',     matricula: 'P63001',  funcao: 'gestor',                                         primaryYard: 'P6' },

  // ═══ VTO — Pátio de Tubarão ═══
  { nome: 'Daniel Fonseca Araújo',      matricula: 'VTO1001', funcao: 'maquinista', turno: 'A', horarioTurno: '07-19', primaryYard: 'VTO' },
  { nome: 'Michel Barbosa Lopes',       matricula: 'VTO1002', funcao: 'maquinista', turno: 'A', horarioTurno: '07-19', primaryYard: 'VTO' },
  { nome: 'Felipe Correia Monteiro',    matricula: 'VTO1003', funcao: 'maquinista', turno: 'B', horarioTurno: '19-07', primaryYard: 'VTO' },
  { nome: 'Henrique Pires Machado',     matricula: 'VTO1004', funcao: 'maquinista', turno: 'B', horarioTurno: '19-07', primaryYard: 'VTO' },
  { nome: 'Rogério Damasceno Viana',    matricula: 'VTO1005', funcao: 'oficial',    turno: 'A', horarioTurno: '07-19', primaryYard: 'VTO' },
  { nome: 'Gilberto Souza Braga',       matricula: 'VTO2001', funcao: 'inspetor',                                       primaryYard: 'VTO' },
  { nome: 'Osvaldo Ramos Teixeira',     matricula: 'VTO3001', funcao: 'gestor',                                         primaryYard: 'VTO' },

  // ═══ SUPERVISOR (pátio VFZ) ═══
  { nome: 'Lucas Supervisor Ferreira',   matricula: 'SUP1001', funcao: 'supervisor',                                    primaryYard: 'VFZ' },

  // ═══ COORDENADOR (multi-pátio VFZ+VBR) ═══
  { nome: 'Ricardo Coordenador Silva',   matricula: 'CRD1001', funcao: 'coordenador',                                   primaryYard: 'VFZ' },

  // ═══ GERENTE (regional EFVM) ═══
  { nome: 'Fernando Gerente Almeida',    matricula: 'GER1001', funcao: 'gerente',                                       primaryYard: 'VFZ' },

  // ═══ DIRETOR (estratégico EFVM) ═══
  { nome: 'Alberto Diretor Campos',      matricula: 'DIR1001', funcao: 'diretor',                                       primaryYard: 'VFZ' },

  // ═══ ADMIN GLOBAL (sistema) ═══
  { nome: 'Gregory Administrador',       matricula: 'ADM9001', funcao: 'admin',                                         primaryYard: 'VFZ' },

  // ═══ SUPORTE TÉCNICO ═══
  { nome: 'Suporte Tecnico',             matricula: 'SUP0001', funcao: 'suporte',                                       primaryYard: 'VFZ', senha: 'suporte360' },
];

// ── Seed Function ───────────────────────────────────────────────────────

export function seedCredentials(): { seeded: boolean; count: number } {
  try {
    const existing: UsuarioCadastro[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const seedVersion = localStorage.getItem(SEED_VERSION);
    let modified = false;
    let count = 0;

    // Force re-seed on version upgrade
    if (!seedVersion) {
      // Remove old seed users (VFZ pattern from v5)
      const manualUsers = existing.filter(u =>
        !u.matricula.match(/^(VFZ|VBR|VCS|P6|VTO|ADM|SUP|CRD|GER|DIR)\d+$/)
      );
      existing.length = 0;
      existing.push(...manualUsers);
      modified = true;
    }

    for (const seedUser of EFVM360_USERS) {
      const exists = existing.find(u => u.matricula === seedUser.matricula);
      if (!exists) {
        const newUser: UsuarioCadastro = {
          nome: seedUser.nome,
          matricula: seedUser.matricula,
          funcao: seedUser.funcao,
          turno: seedUser.turno,
          horarioTurno: seedUser.horarioTurno,
          senha: seedUser.senha || DEFAULT_PASSWORD,
          primaryYard: seedUser.primaryYard,
          allowedYards: ['VFZ', 'VBR', 'VCS', 'P6', 'VTO'],
          status: 'active',
          dataCadastro: new Date().toISOString(),
          aceiteTermos: {
            aceito: true,
            dataAceite: new Date().toISOString(),
            versaoTermo: '1.0.0',
          },
        };
        existing.push(newUser);
        modified = true;
        count++;
      } else {
        // Ensure fields are synced on existing seed users (fixes stale funcao from older seeds)
        if (exists.funcao !== seedUser.funcao) { exists.funcao = seedUser.funcao; modified = true; }
        if (!exists.primaryYard) { exists.primaryYard = seedUser.primaryYard; modified = true; }
        if (!exists.allowedYards) { exists.allowedYards = ['VFZ', 'VBR', 'VCS', 'P6', 'VTO']; modified = true; }
        if (!exists.status) { exists.status = 'active'; modified = true; }
        if (!exists.senha && !exists.senhaHash) { exists.senha = DEFAULT_PASSWORD; modified = true; count++; }
      }
    }

    if (modified) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      localStorage.setItem(SEED_MARKER, new Date().toISOString());
      localStorage.setItem(SEED_VERSION, 'true');
      // [DEBUG] console.log(`[EFVM360] ✅ Seed v6: ${count} usuário(s) criado(s)/atualizado(s) — 5 pátios`);
    } else if (!seedVersion) {
      localStorage.setItem(SEED_VERSION, 'true');
    }

    // Check for orphaned patios (active patios with no users) and provision them
    verificarPatiosOrfaos();

    return { seeded: modified, count };
  } catch (error) {
    secureLog.error('[EFVM360] Erro no seed v6:', error);
    return { seeded: false, count: 0 };
  }
}

export function resetAllPasswords(): number {
  try {
    const usuarios: UsuarioCadastro[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    let count = 0;
    for (const user of usuarios) {
      user.senha = DEFAULT_PASSWORD;
      delete user.senhaHash;
      count++;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usuarios));
    return count;
  } catch { return 0; }
}

export function listUsers(): Array<{ matricula: string; nome: string; funcao: string; turno?: string; primaryYard?: string }> {
  try {
    const usuarios: UsuarioCadastro[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return usuarios.map(u => ({
      matricula: u.matricula,
      nome: u.nome,
      funcao: u.funcao,
      turno: u.turno,
      primaryYard: u.primaryYard,
    }));
  } catch { return []; }
}
