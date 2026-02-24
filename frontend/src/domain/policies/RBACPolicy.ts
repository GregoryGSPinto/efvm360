// ============================================================================
// EFVM PÁTIO 360 — RBAC Policy
// Controle de acesso por papel + pátio
// ============================================================================

import { SystemAction, HierarchyLevel } from '../contracts';
import type { UserProfile } from '../aggregates/UserAggregate';
import { canManageUser } from '../aggregates/UserAggregate';
import type { YardCode } from '../aggregates/YardRegistry';

// ── Permission Matrix ──────────────────────────────────────────────────

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
];

const MANAGEMENT_ACTIONS: SystemAction[] = [
  ...INSPECTION_ACTIONS,
  SystemAction.MANAGE_TEAM,
  SystemAction.APPROVE_REGISTRATION,
  SystemAction.APPROVE_PASSWORD_RESET,
  SystemAction.TRANSFER_USER,
  SystemAction.SUSPEND_USER,
  SystemAction.VIEW_AUDIT_TRAIL,
];

const TECHNICAL_ACTIONS: SystemAction[] = [
  ...MANAGEMENT_ACTIONS,
  SystemAction.EXPORT_AUDIT_TRAIL,
];

const ADMIN_ACTIONS: SystemAction[] = [
  ...TECHNICAL_ACTIONS,
  SystemAction.EDIT_SYSTEM_CONFIG,
];

const PERMISSION_MAP: Record<number, SystemAction[]> = {
  [HierarchyLevel.OPERATIVE]: OPERATIVE_ACTIONS,
  [HierarchyLevel.INSPECTION]: INSPECTION_ACTIONS,
  [HierarchyLevel.MANAGEMENT]: MANAGEMENT_ACTIONS,
  [HierarchyLevel.TECHNICAL]: TECHNICAL_ACTIONS,
  [HierarchyLevel.ADMIN]: ADMIN_ACTIONS,
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

  // Admin bypasses all context checks
  if (user.hierarchyLevel >= HierarchyLevel.ADMIN) return true;

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
      return user.primaryYard === context.yardCode || user.hierarchyLevel >= HierarchyLevel.ADMIN;
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
