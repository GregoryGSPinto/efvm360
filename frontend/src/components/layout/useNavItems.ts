// ============================================================================
// EFVM360 — Hook de Itens de Navegação
// Fonte única de lógica: filtragem por permissão + badges dinâmicos
// ============================================================================
import { useMemo } from 'react';
import { MENU_SIDEBAR_ITEMS } from '../../styles/themes';
import type { SidebarItem } from '../../styles/themes';

const ROTA_MAP: Record<string, string> = {
  inicial: 'inicial',
  analytics: 'bi',
  passagem: 'passagem',
  layout: 'layout',
  historico: 'historico',
  configuracoes: 'configuracoes',
  dss: 'dss',
  dashboard: 'dashboard',
  composicoes: 'composicoes',
  'passagem-interpatio': 'passagem-interpatio',
  aprovacoes: 'aprovacoes',
};

export interface NavItem extends SidebarItem {
  badgeDyn?: number;
  badgeTypeDyn?: 'danger' | 'warning' | 'info';
}

/**
 * Retorna itens de navegação filtrados por permissão e com badges atualizados.
 */
export function useNavItems(
  podeAcessarRota: (rota: string) => boolean,
  alertasCriticosCount: number,
): NavItem[] {
  return useMemo(() => {
    return MENU_SIDEBAR_ITEMS
      .filter(item => {
        if (item.id === 'inicial') return true;
        const rota = ROTA_MAP[item.id] || item.id;
        return podeAcessarRota(rota);
      })
      .map(item => {
        let badgeDyn = item.badge;
        let badgeTypeDyn = item.badgeType;
        if (item.id === 'inicial' && alertasCriticosCount > 0) {
          badgeDyn = alertasCriticosCount;
          badgeTypeDyn = 'danger';
        }
        return { ...item, badgeDyn, badgeTypeDyn };
      });
  }, [podeAcessarRota, alertasCriticosCount]);
}
