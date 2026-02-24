// ============================================================================
// EFVM360 — BottomNavigation — Navegação Inferior Mobile (< 768px)
// ============================================================================
import { memo } from 'react';
import type { TemaEstilos, ConfiguracaoSistema } from '../../types';
import type { NavItem } from './useNavItems';

interface BottomNavigationProps {
  tema: TemaEstilos;
  config: ConfiguracaoSistema;
  navItems: NavItem[];
  paginaAtiva: string;
  mostrarPaginaDSS: boolean;
  onNavigate: (id: string) => void;
}

export const BottomNavigation = memo<BottomNavigationProps>(({
  tema, config, navItems, paginaAtiva, mostrarPaginaDSS, onNavigate,
}) => {
  const isDark = config.tema === 'escuro';

  return (
    <nav
      className="efvm360-bottom-nav efvm360-scroll-hide"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '68px',
        background: isDark ? tema.card : tema.background,
        borderTop: `1px solid ${tema.cardBorda}`,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '2px',
        padding: '0 8px',
        boxShadow: isDark ? '0 -2px 12px rgba(0,0,0,0.3)' : '0 -2px 12px rgba(0,0,0,0.06)',
        zIndex: 1000,
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {navItems.map(item => {
        const isActive = paginaAtiva === item.id || (item.id === 'dss' && mostrarPaginaDSS);
        return (
          <button
            key={`bnav-${item.id}`}
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              padding: '6px 10px',
              minWidth: '44px',
              borderRadius: '10px',
              border: 'none',
              outline: 'none',
              cursor: 'pointer',
              background: isActive ? `${tema.primaria}12` : 'transparent',
              transition: 'all 0.15s ease',
            }}
            onClick={() => onNavigate(item.id)}
          >
            <span style={{
              fontSize: '20px',
              transform: isActive ? 'scale(1.1)' : 'scale(1)',
              transition: 'transform 0.15s ease',
            }}>
              {item.icon}
            </span>
            <span style={{
              fontSize: '9px',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? tema.primaria : tema.textoSecundario,
              letterSpacing: '0.3px',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}>
              {item.label.length > 10 ? item.label.slice(0, 8) + '…' : item.label}
            </span>
            {item.badgeDyn && item.badgeDyn > 0 && (
              <span style={{
                position: 'absolute',
                top: '2px',
                right: '4px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: item.badgeTypeDyn === 'danger' ? tema.perigo
                  : item.badgeTypeDyn === 'warning' ? tema.aviso : tema.info,
                color: '#fff',
                fontSize: '9px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {item.badgeDyn > 9 ? '9+' : item.badgeDyn}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
});

BottomNavigation.displayName = 'BottomNavigation';
export default BottomNavigation;
