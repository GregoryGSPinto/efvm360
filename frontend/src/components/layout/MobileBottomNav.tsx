// ============================================================================
// EFVM360 — MobileBottomNav — Fixed Bottom Navigation Bar
// Mobile-native pattern: icon + label, 44px touch targets, no submenus
// ============================================================================
import { memo, useMemo } from 'react';
import type { TemaEstilos, ConfiguracaoSistema } from '../../types';
import { getHierarchyLevelForRole } from '../../domain/aggregates/UserAggregate';
import { HierarchyLevel } from '../../domain/contracts';

// ── Navigation Items ───────────────────────────────────────────────────
const BASE_NAV_ITEMS = [
  { id: 'passagem', label: 'Boa Jornada', icon: '🚂' },
  { id: 'dss',       label: 'DSS',         icon: '🛡️' },
  { id: 'analytics', label: 'BI+',         icon: '📊' },
  { id: 'historico', label: 'Histórico',    icon: '📋' },
  { id: 'layout',    label: 'Layout',       icon: '🗺️' },
];

// ── Props ──────────────────────────────────────────────────────────────
interface MobileBottomNavProps {
  tema: TemaEstilos;
  config: ConfiguracaoSistema;
  paginaAtiva: string;
  mostrarPaginaDSS: boolean;
  onNavigate: (id: string) => void;
  userRole?: string;
  pendingCount?: number;
}

// ── Component ──────────────────────────────────────────────────────────
export const MobileBottomNav = memo<MobileBottomNavProps>(({
  tema: _tema, config, paginaAtiva, mostrarPaginaDSS, onNavigate,
  userRole = '', pendingCount = 0,
}) => {
  const dk = config.tema === 'escuro' ||
    (config.tema === 'automatico' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);

  const hierarchyLevel = getHierarchyLevelForRole(userRole);
  const NAV_ITEMS = useMemo(() => [
    ...BASE_NAV_ITEMS,
    ...(hierarchyLevel >= HierarchyLevel.INSPECTION
      ? [{ id: 'gestao', label: 'Gestão', icon: '👥' }]
      : []),
  ], [hierarchyLevel]);

  const bg = dk ? '#1a1a1a' : '#ffffff';
  const bd = dk ? '#2a2a2a' : '#e8e8e8';
  const txt2 = dk ? '#777' : '#999';
  const activeColor = '#007e7a';

  const isActive = (id: string): boolean => {
    if (id === 'dss') return mostrarPaginaDSS;
    if (id === 'passagem') return (paginaAtiva === 'passagem' || paginaAtiva === 'inicial') && !mostrarPaginaDSS;
    if (id === 'gestao') return paginaAtiva === 'gestao' && !mostrarPaginaDSS;
    return paginaAtiva === id && !mostrarPaginaDSS;
  };

  return (
    <nav className="efvm360-mobilenav" style={{
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
              {id === 'gestao' && pendingCount > 0 && (
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
