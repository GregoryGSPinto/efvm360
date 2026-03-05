// ============================================================================
// EFVM PÁTIO 360 — User Aggregate
// Perfil completo com hierarquia, pátio principal, equipe
// ============================================================================

import type { UUID, ISODateTime, Matricula } from '../contracts';
import { HierarchyLevel, UserStatus } from '../contracts';
import type { YardCode } from './YardRegistry';
import { ALL_YARD_CODES } from './YardRegistry';

// ── Types ──────────────────────────────────────────────────────────────

export interface UserProfile {
  id: UUID;
  matricula: Matricula;
  nome: string;
  nomeSocial?: string;
  funcao: string;             // Maps to OperatorRole values
  primaryYard: YardCode;
  allowedYards: YardCode[];   // Default: all yards
  teamId?: UUID;
  hierarchyLevel: HierarchyLevel;
  status: UserStatus;
  turno?: string;
  horarioTurno?: string;
  avatar?: string;
  createdAt: ISODateTime;
  approvedBy?: Matricula;
  approvedAt?: ISODateTime;
}

// ── Hierarchy Mapping ──────────────────────────────────────────────────

const ROLE_HIERARCHY_MAP: Record<string, HierarchyLevel> = {
  maquinista: HierarchyLevel.OPERATIVE,
  operador: HierarchyLevel.OPERATIVE,
  oficial: HierarchyLevel.OPERATIVE,
  oficial_operacao: HierarchyLevel.OPERATIVE,
  inspetor: HierarchyLevel.INSPECTION,
  supervisor: HierarchyLevel.SUPERVISION,
  gestor: HierarchyLevel.SUPERVISION,         // legacy patio-level manager
  coordenador: HierarchyLevel.COORDINATION,
  gerente: HierarchyLevel.MANAGEMENT,
  diretor: HierarchyLevel.DIRECTION,
  admin: HierarchyLevel.ADMINISTRATION,
  suporte: HierarchyLevel.TECHNICAL,
};

export function getHierarchyLevelForRole(role: string): HierarchyLevel {
  return ROLE_HIERARCHY_MAP[role] || HierarchyLevel.OPERATIVE;
}

// ── Factory ────────────────────────────────────────────────────────────

export function createUserProfile(data: {
  matricula: Matricula;
  nome: string;
  funcao: string;
  primaryYard: YardCode;
  turno?: string;
  horarioTurno?: string;
  teamId?: UUID;
  status?: UserStatus;
  approvedBy?: Matricula;
  id?: UUID;
  now?: ISODateTime;
}): UserProfile {
  const id = data.id ?? (crypto.randomUUID?.() || `user-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const now = data.now ?? new Date().toISOString();
  return {
    id,
    matricula: data.matricula,
    nome: data.nome,
    funcao: data.funcao,
    primaryYard: data.primaryYard,
    allowedYards: [...ALL_YARD_CODES],
    teamId: data.teamId,
    hierarchyLevel: getHierarchyLevelForRole(data.funcao),
    status: data.status || UserStatus.ACTIVE,
    turno: data.turno,
    horarioTurno: data.horarioTurno,
    createdAt: now,
    approvedBy: data.approvedBy,
    approvedAt: data.approvedBy ? now : undefined,
  };
}

// ── Hierarchy Service ──────────────────────────────────────────────────

export function canManageUser(manager: UserProfile, target: UserProfile): boolean {
  // Supervisor+ can manage anyone in same yard
  if (manager.hierarchyLevel >= HierarchyLevel.SUPERVISION) {
    // Coordination+ can manage across yards
    if (manager.hierarchyLevel < HierarchyLevel.COORDINATION && manager.primaryYard !== target.primaryYard) return false;
    return manager.hierarchyLevel >= target.hierarchyLevel;
  }
  return false;
}

export function canOperateInYard(user: UserProfile, yard: YardCode): boolean {
  return user.allowedYards.includes(yard);
}

export function canApproveRegistration(approver: UserProfile, requestedYard: YardCode): boolean {
  // Coordination+ can approve any yard; Supervisor can approve own yard
  if (approver.hierarchyLevel >= HierarchyLevel.COORDINATION) return true;
  if (approver.hierarchyLevel >= HierarchyLevel.SUPERVISION) {
    return approver.primaryYard === requestedYard;
  }
  return false;
}

export function canApprovePasswordReset(approver: UserProfile, targetYard: YardCode): boolean {
  // Technical support can approve any yard
  if (approver.hierarchyLevel >= HierarchyLevel.TECHNICAL) return true;
  // Coordination+ can approve any yard
  if (approver.hierarchyLevel >= HierarchyLevel.COORDINATION) return true;
  // Supervisor and Inspetor can approve own yard
  if (approver.hierarchyLevel >= HierarchyLevel.INSPECTION) {
    return approver.primaryYard === targetYard;
  }
  return false;
}
