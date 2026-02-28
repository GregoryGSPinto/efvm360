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
  supervisor: HierarchyLevel.TECHNICAL,
  gestor: HierarchyLevel.MANAGEMENT,
  coordenador: HierarchyLevel.MANAGEMENT,
  administrador: HierarchyLevel.ADMIN,
  suporte: HierarchyLevel.ADMIN,
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
}): UserProfile {
  return {
    id: crypto.randomUUID?.() || `user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
    createdAt: new Date().toISOString(),
    approvedBy: data.approvedBy,
    approvedAt: data.approvedBy ? new Date().toISOString() : undefined,
  };
}

// ── Hierarchy Service ──────────────────────────────────────────────────

export function canManageUser(manager: UserProfile, target: UserProfile): boolean {
  // Admin can manage anyone
  if (manager.hierarchyLevel >= HierarchyLevel.ADMIN) return true;
  // Must be in same primary yard
  if (manager.primaryYard !== target.primaryYard) return false;
  // Must be strictly higher hierarchy
  return manager.hierarchyLevel > target.hierarchyLevel;
}

export function canOperateInYard(user: UserProfile, yard: YardCode): boolean {
  return user.allowedYards.includes(yard);
}

export function canApproveRegistration(approver: UserProfile, requestedYard: YardCode): boolean {
  // Admin can approve any yard
  if (approver.hierarchyLevel >= HierarchyLevel.ADMIN) return true;
  // Gestor/Technical can approve their own yard
  if (approver.hierarchyLevel >= HierarchyLevel.MANAGEMENT) {
    return approver.primaryYard === requestedYard;
  }
  return false;
}

export function canApprovePasswordReset(approver: UserProfile, targetYard: YardCode): boolean {
  // Technical support can approve any yard
  if (approver.hierarchyLevel >= HierarchyLevel.TECHNICAL) return true;
  // Gestor can approve own yard
  if (approver.hierarchyLevel >= HierarchyLevel.MANAGEMENT) {
    return approver.primaryYard === targetYard;
  }
  return false;
}
