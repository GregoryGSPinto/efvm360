// ============================================================================
// EFVM360 — MobileBottomNav — Fixed Bottom Navigation Bar
// Mobile-native pattern: icon + label, 44px touch targets, no submenus
// Uses React Router for active state detection.
// ============================================================================
import { memo, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import type { TemaEstilos, ConfiguracaoSistema } from '../../types';
import { getHierarchyLevelForRole } from '../../domain/aggregates/UserAggregate';
import { HierarchyLevel } from '../../domain/contracts';
import { NAV_ID_TO_PATH, ROUTES } from '../../router/routes';

// Nav items are now built dynamically per role in useMemo below

// ── Props ──────────────────────────────────────────────────────────────
interface MobileBottomNavProps {
  tema: TemaEstilos;
  config: ConfiguracaoSistema;
  onNavigate: (id: string) => void;
  userRole?: string;
  pendingCount?: number;
}

// ── Component ──────────────────────────────────────────────────────────
export const MobileBottomNav = memo<MobileBottomNavProps>(({
  tema: _tema, config, onNavigate,
  userRole = '', pendingCount = 0,
}) => {
  const location = useLocation();
  const dk = config.tema === 'escuro' ||
    (config.tema === 'automatico' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);

  const hierarchyLevel = getHierarchyLevelForRole(userRole);
  const NAV_ITEMS = useMemo(() => {
    if (userRole === 'suporte') return [{ id: 'suporte', label: 'Suporte', icon: '\uD83D\uDEE0\uFE0F' }];
    const items: Array<{ id: string; label: string; icon: string }> = [];
    items.push({ id: 'passagem', label: 'Boa Jornada', icon: '\uD83D\uDE82' });
    if (hierarchyLevel >= HierarchyLevel.INSPECTION) {
      items.push({ id: 'dss', label: 'DSS', icon: '\uD83D\uDEE1\uFE0F' });
      items.push({ id: 'analytics', label: 'BI+', icon: '\uD83D\uDCCA' });
    }
    items.push({ id: 'historico', label: 'Historico', icon: '\uD83D\uDCCB' });
    if (hierarchyLevel >= HierarchyLevel.SUPERVISION) {
      items.push({ id: 'dashboard', label: 'Dashboard', icon: '\uD83D\uDCCA' });
      items.push({ id: 'composicoes', label: 'Composicoes', icon: '\uD83D\uDE83' });
      items.push({ id: 'passagem-interpatio', label: 'Inter-Patio', icon: '\uD83D\uDD04' });
      items.push({ id: 'layout', label: 'Layout', icon: '\uD83D\uDDFA\uFE0F' });
      items.push({ id: 'graus-risco', label: 'Grau Risco', icon: '\u26A0\uFE0F' });
      items.push({ id: 'gestao', label: 'Gestao', icon: '\uD83D\uDC65' });
    }
    if (hierarchyLevel >= HierarchyLevel.COORDINATION) {
      items.push({ id: 'aprovacoes', label: 'Aprovacoes', icon: '\u2705' });
    }
    return items;
  }, [hierarchyLevel, userRole]);

  const bg = dk ? '#1a1a1a' : '#ffffff';
  const bd = dk ? '#2a2a2a' : '#e8e8e8';
  const txt2 = dk ? '#777' : '#999';
  const activeColor = '#007e7a';

  // Active state derived from URL path
  const currentPath = location.pathname;
  const isActive = (id: string): boolean => {
    if (id === 'dss') return currentPath === ROUTES.DSS;
    if (id === 'passagem') return currentPath === ROUTES.PASSAGEM || currentPath === ROUTES.HOME;
    if (id === 'dashboard') return currentPath.startsWith('/dashboard');
    return currentPath === (NAV_ID_TO_PATH[id] || `/${id}`);
  };

  return (
    <nav className="efvm360-mobilenav" aria-label="Navegação mobile" style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 64,
      background: bg,
      borderTop: `1px solid ${bd}`,
      display: 'none', // Hidden by default, shown via CSS on mobile
      alignItems: 'stretch',
      justifyContent: 'space-around',
      zIndex: 1000,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      boxShadow: dk ? '0 -2px 8px rgba(0,0,0,0.3)' : '0 -2px 8px rgba(0,0,0,0.05)',
    }}>
      {NAV_ITEMS.map(({ id, label, icon }) => {
        const active = isActive(id);
        return (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              minHeight: 44, // WCAG touch target
              padding: '6px 4px',
              border: 'none',
              background: active
                ? (dk ? 'rgba(0,126,122,0.12)' : 'rgba(0,126,122,0.06)')
                : 'transparent',
              cursor: 'pointer',
              transition: 'all 100ms ease',
              position: 'relative',
              borderTop: active ? `2.5px solid ${activeColor}` : '2.5px solid transparent',
            }}
          >
            <span style={{
              fontSize: 20,
              lineHeight: 1,
              filter: active ? 'none' : 'grayscale(0.4)',
              transition: 'filter 100ms ease',
              position: 'relative',
            }}>
              {icon}
              {(id === 'gestao' || id === 'aprovacoes') && pendingCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -8,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 14, height: 14, borderRadius: 7, padding: '0 3px',
                  background: '#dc2626', color: '#fff', fontSize: 8, fontWeight: 700,
                }}>{pendingCount}</span>
              )}
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: active ? 700 : 500,
              color: active ? activeColor : txt2,
              letterSpacing: 0.2,
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
});

MobileBottomNav.displayName = 'MobileBottomNav';
export default MobileBottomNav;
