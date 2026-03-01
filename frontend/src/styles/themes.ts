// ============================================================================
// EFVM360 — Navegação: Itens do Menu
// ============================================================================

export interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
  badgeType?: 'danger' | 'warning' | 'info';
}

export const MENU_SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'inicial',       label: 'Dashboard',            icon: '🏠' },
  { id: 'passagem',      label: 'Gestão de Troca de Turno',  icon: '📋' },
  { id: 'dss',           label: 'DSS',                  icon: '🛡️' },
  { id: 'analytics',     label: 'BI+',                  icon: '📊' },
  { id: 'historico',     label: 'Histórico',            icon: '📁' },
  { id: 'layout',        label: 'Layout do Pátio',      icon: '🗺️' },
  { id: 'graus-risco',   label: 'Graus de Risco',       icon: '⚠️' },
  { id: 'configuracoes', label: 'Configurações',        icon: '⚙️' },
];
