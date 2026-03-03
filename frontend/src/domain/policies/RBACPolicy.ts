// ============================================================================
// EFVM PÁTIO 360 — RBAC Policy
// Controle de acesso por papel + pátio
// v3.2 — Admin removido, Gestor herda todas as permissões
// ============================================================================

import { SystemAction, HierarchyLevel } from '../contracts';
import type { UserProfile } from '../aggregates/UserAggregate';
import { canManageUser } from '../aggregates/UserAggregate';
import type { YardCode } from '../aggregates/YardRegistry';

// ── Permission Matrix (v3.3 — 8 levels with inheritance) ─────────────

const OPERATIVE_ACTIONS: SystemAction[] = [
  SystemAction.CREATE_HANDOVER,
  SystemAction.EDIT_HANDOVER,
  SystemAction.SIGN_HANDOVER,
  SystemAction.EXPORT_HANDOVER,
  SystemAction.VIEW_HANDOVER_HISTORY,
  SystemAction.SUBMIT_DSS,
  SystemAction.VIEW_DSS_HISTORY,
  SystemAction.VIEW_DASHBOARD,
  SystemAction.VIEW_ANALYTICS,
  SystemAction.EDIT_OWN_PROFILE,
];

const INSPECTION_ACTIONS: SystemAction[] = [
  ...OPERATIVE_ACTIONS,
  SystemAction.APPROVE_DSS,
  SystemAction.VIEW_TEAM,
  SystemAction.EXPORT_REPORTS,
  SystemAction.APPROVE_PASSWORD_RESET,
];

const SUPERVISION_ACTIONS: SystemAction[] = [
  ...INSPECTION_ACTIONS,
  SystemAction.MANAGE_TEAM,
  SystemAction.APPROVE_REGISTRATION,
  SystemAction.TRANSFER_USER,
  SystemAction.SUSPEND_USER,
  SystemAction.VIEW_AUDIT_TRAIL,
];

const COORDINATION_ACTIONS: SystemAction[] = [
  ...SUPERVISION_ACTIONS,
  SystemAction.EXPORT_AUDIT_TRAIL,
];

const MANAGEMENT_ACTIONS: SystemAction[] = [
  ...COORDINATION_ACTIONS,
];

const DIRECTION_ACTIONS: SystemAction[] = [
  ...MANAGEMENT_ACTIONS,
  SystemAction.EDIT_SYSTEM_CONFIG,
];

const ADMINISTRATION_ACTIONS: SystemAction[] = [
  ...DIRECTION_ACTIONS,
];

const TECHNICAL_ACTIONS: SystemAction[] = [
  ...ADMINISTRATION_ACTIONS,
];

const PERMISSION_MAP: Record<number, SystemAction[]> = {
  [HierarchyLevel.OPERATIVE]: OPERATIVE_ACTIONS,
  [HierarchyLevel.INSPECTION]: INSPECTION_ACTIONS,
  [HierarchyLevel.SUPERVISION]: SUPERVISION_ACTIONS,
  [HierarchyLevel.COORDINATION]: COORDINATION_ACTIONS,
  [HierarchyLevel.MANAGEMENT]: MANAGEMENT_ACTIONS,
  [HierarchyLevel.DIRECTION]: DIRECTION_ACTIONS,
  [HierarchyLevel.ADMINISTRATION]: ADMINISTRATION_ACTIONS,
  [HierarchyLevel.TECHNICAL]: TECHNICAL_ACTIONS,
};

// ── Context for yard-scoped actions ────────────────────────────────────

interface PermissionContext {
  yardCode?: YardCode;
  targetUser?: UserProfile;
}

// Actions that require same-yard check
const YARD_SCOPED_ACTIONS = new Set<SystemAction>([
  SystemAction.MANAGE_TEAM,
  SystemAction.APPROVE_REGISTRATION,
  SystemAction.APPROVE_PASSWORD_RESET,
  SystemAction.TRANSFER_USER,
  SystemAction.SUSPEND_USER,
]);

// ── Main Permission Check ──────────────────────────────────────────────

export function hasPermission(
  user: UserProfile,
  action: SystemAction,
  context?: PermissionContext
): boolean {
  // Get allowed actions for this hierarchy level
  const allowed = PERMISSION_MAP[user.hierarchyLevel] || OPERATIVE_ACTIONS;

  // Check if action is in the allowed list
  if (!allowed.includes(action)) return false;

  // Technical support bypasses yard checks for password reset
  if (user.hierarchyLevel >= HierarchyLevel.TECHNICAL && action === SystemAction.APPROVE_PASSWORD_RESET) {
    return true;
  }

  // Yard-scoped actions require same yard
  if (YARD_SCOPED_ACTIONS.has(action) && context) {
    if (context.targetUser) {
      return canManageUser(user, context.targetUser);
    }
    if (context.yardCode) {
      return user.primaryYard === context.yardCode;
    }
  }

  return true;
}

// ── Convenience functions ──────────────────────────────────────────────

export function getActionsForUser(user: UserProfile): SystemAction[] {
  return PERMISSION_MAP[user.hierarchyLevel] || OPERATIVE_ACTIONS;
}

export function canViewTeamPage(user: UserProfile): boolean {
  return hasPermission(user, SystemAction.VIEW_TEAM);
}

export function canManageTeam(user: UserProfile, yardCode: YardCode): boolean {
  return hasPermission(user, SystemAction.MANAGE_TEAM, { yardCode });
}
