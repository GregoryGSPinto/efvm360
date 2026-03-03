// ============================================================================
// EFVM360 — usePermissions Hook — RBAC React Integration
// ============================================================================

import { useMemo, useCallback } from 'react';
import { SystemAction, HierarchyLevel, UserStatus } from '../domain/contracts';
import type { UserProfile } from '../domain/aggregates/UserAggregate';
import { getHierarchyLevelForRole } from '../domain/aggregates/UserAggregate';
import { hasPermission, canViewTeamPage } from '../domain/policies/RBACPolicy';
import type { YardCode } from '../domain/aggregates/YardRegistry';
import { ALL_YARD_CODES } from '../domain/aggregates/YardRegistry';

interface UsePermissionsReturn {
  pode: (action: SystemAction, context?: { yardCode?: YardCode; targetUser?: UserProfile }) => boolean;
  podeEditar: (modulo: string) => boolean;
  podeExportar: (modulo: string) => boolean;
  podeVisualizar: (modulo: string) => boolean;
  podeGerenciar: (yardCode?: YardCode) => boolean;
  podeVerEquipe: boolean;
  isAdmin: boolean;
  isGestor: boolean;
  isInspetor: boolean;
  isSupervisor: boolean;
  isCoordenador: boolean;
  isGerente: boolean;
  isDiretor: boolean;
  isSuporte: boolean;
}

// Map legacy module names to SystemActions
const MODULE_EDIT_MAP: Record<string, SystemAction> = {
  passagem: SystemAction.EDIT_HANDOVER,
  dss: SystemAction.SUBMIT_DSS,
  dashboard: SystemAction.VIEW_DASHBOARD,
  configuracoes: SystemAction.EDIT_OWN_PROFILE,
};

const MODULE_EXPORT_MAP: Record<string, SystemAction> = {
  passagem: SystemAction.EXPORT_HANDOVER,
  historico: SystemAction.EXPORT_REPORTS,
  audit: SystemAction.EXPORT_AUDIT_TRAIL,
};

const MODULE_VIEW_MAP: Record<string, SystemAction> = {
  passagem: SystemAction.VIEW_HANDOVER_HISTORY,
  dss: SystemAction.VIEW_DSS_HISTORY,
  dashboard: SystemAction.VIEW_DASHBOARD,
  historico: SystemAction.VIEW_ANALYTICS,
  equipe: SystemAction.VIEW_TEAM,
  audit: SystemAction.VIEW_AUDIT_TRAIL,
};

export function usePermissions(usuarioLogado?: { funcao?: string; matricula?: string; primaryYard?: string } | null): UsePermissionsReturn {
  // Build UserProfile-like object from whatever user data we have
  const userProfile = useMemo<UserProfile | null>(() => {
    if (!usuarioLogado?.funcao) return null;
    return {
      id: usuarioLogado.matricula || '',
      matricula: usuarioLogado.matricula || '',
      nome: '',
      funcao: usuarioLogado.funcao,
      primaryYard: (usuarioLogado.primaryYard || 'VFZ') as YardCode,
      allowedYards: [...ALL_YARD_CODES],
      hierarchyLevel: getHierarchyLevelForRole(usuarioLogado.funcao),
      status: UserStatus.ACTIVE,
      createdAt: '',
    };
  }, [usuarioLogado?.funcao, usuarioLogado?.matricula, usuarioLogado?.primaryYard]);

  const pode = useCallback((action: SystemAction, context?: { yardCode?: YardCode; targetUser?: UserProfile }) => {
    if (!userProfile) return false;
    return hasPermission(userProfile, action, context);
  }, [userProfile]);

  const podeEditar = useCallback((modulo: string) => {
    if (!userProfile) return false;
    const action = MODULE_EDIT_MAP[modulo];
    if (!action) return true; // Unknown module → allow (backward compat)
    return hasPermission(userProfile, action);
  }, [userProfile]);

  const podeExportar = useCallback((modulo: string) => {
    if (!userProfile) return false;
    const action = MODULE_EXPORT_MAP[modulo];
    if (!action) return true;
    return hasPermission(userProfile, action);
  }, [userProfile]);

  const podeVisualizar = useCallback((modulo: string) => {
    if (!userProfile) return false;
    const action = MODULE_VIEW_MAP[modulo];
    if (!action) return true;
    return hasPermission(userProfile, action);
  }, [userProfile]);

  const podeGerenciar = useCallback((yardCode?: YardCode) => {
    if (!userProfile) return false;
    return hasPermission(userProfile, SystemAction.MANAGE_TEAM, { yardCode });
  }, [userProfile]);

  return {
    pode,
    podeEditar,
    podeExportar,
    podeVisualizar,
    podeGerenciar,
    podeVerEquipe: userProfile ? canViewTeamPage(userProfile) : false,
    isAdmin: (userProfile?.hierarchyLevel || 0) >= HierarchyLevel.ADMINISTRATION,
    isGestor: (userProfile?.hierarchyLevel || 0) >= HierarchyLevel.SUPERVISION,
    isInspetor: (userProfile?.hierarchyLevel || 0) >= HierarchyLevel.INSPECTION,
    isSupervisor: (userProfile?.hierarchyLevel || 0) >= HierarchyLevel.SUPERVISION,
    isCoordenador: (userProfile?.hierarchyLevel || 0) >= HierarchyLevel.COORDINATION,
    isGerente: (userProfile?.hierarchyLevel || 0) >= HierarchyLevel.MANAGEMENT,
    isDiretor: (userProfile?.hierarchyLevel || 0) >= HierarchyLevel.DIRECTION,
    isSuporte: usuarioLogado?.funcao === 'suporte',
  };
}
