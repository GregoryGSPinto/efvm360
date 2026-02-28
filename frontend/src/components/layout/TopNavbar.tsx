// ============================================================================
// EFVM360 — TopNavbar — Enterprise Flat Navigation (Desktop/Tablet)
// Left: Logo | Center: Flat nav links | Right: Avatar dropdown
// No submenus. Single-click access to all modules.
// Uses React Router for navigation and active state detection.
// ============================================================================
import { memo, useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { TemaEstilos, ConfiguracaoSistema, Usuario } from '../../types';
import { OnlineStatusInline } from './OnlineIndicator';
import { NAV_ID_TO_PATH, PATH_TO_NAV_ID, ROUTES } from '../../router/routes';
import { useI18n } from '../../hooks/useI18n';

import { getHierarchyLevelForRole } from '../../domain/aggregates/UserAggregate';
import { HierarchyLevel } from '../../domain/contracts';

// ── Navigation Definition ──────────────────────────────────────────────
const NAV_LABEL_KEYS: Record<string, string> = {
  passagem: 'nav.boaJornada',
  dss: 'nav.dss',
  analytics: 'nav.biPlus',
  historico: 'nav.historico',
  layout: 'nav.layout',
  gestao: 'nav.gestao',
};

const BASE_NAV_ITEMS = [
  { id: 'passagem', label: 'Boa Jornada' },
  { id: 'dss',       label: 'DSS' },
  { id: 'analytics', label: 'BI+' },
  { id: 'historico', label: 'Historico' },
  { id: 'layout',    label: 'Layout' },
];

// ── Props ──────────────────────────────────────────────────────────────
interface TopNavbarProps {
  tema: TemaEstilos;
  config: ConfiguracaoSistema;
  onNavigate: (id: string) => void;
  usuarioLogado: Usuario | null;
  funcaoLabel: string;
  onLogout: () => void;
  pendingCount?: number;
  onlineStatus?: 'online' | 'offline' | 'syncing';
}

// ── Component ──────────────────────────────────────────────────────────
export const TopNavbar = memo<TopNavbarProps>(({
  tema: _tema, config, onNavigate,
  usuarioLogado, funcaoLabel, onLogout, pendingCount = 0,
  onlineStatus = 'online',
}) => {
  const location = useLocation();
  const { t } = useI18n();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Build nav items — add "Gestao" if user has inspection level or higher
  const hierarchyLevel = getHierarchyLevelForRole(usuarioLogado?.funcao || '');
  const NAV_ITEMS = [
    ...BASE_NAV_ITEMS,
    ...(hierarchyLevel >= HierarchyLevel.INSPECTION
      ? [{ id: 'gestao', label: 'Gestao' }]
      : []),
    ...(usuarioLogado?.funcao === 'suporte'
      ? [{ id: 'suporte', label: 'Suporte' }]
      : []),
  ];

  const dk = config.tema === 'escuro' ||
    (config.tema === 'automatico' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);

  // Close avatar dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Theme tokens ──
  const bg     = dk ? '#1a1a1a' : '#ffffff';
  const bd     = dk ? '#2a2a2a' : '#e8e8e8';
  const txt    = dk ? '#e0e0e0' : '#1a1a1a';
  const txt2   = dk ? '#888' : '#666';
  const hover  = dk ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)';
  const activeColor = '#007e7a';
  const activeBg    = dk ? 'rgba(0,126,122,0.15)' : 'rgba(0,126,122,0.08)';

  // ── Active state logic (derived from URL) ──
  const currentPath = location.pathname;
  const isActive = (id: string): boolean => {
    const targetPath = NAV_ID_TO_PATH[id];
    if (id === 'dss') return currentPath === ROUTES.DSS;
    if (id === 'passagem') return currentPath === ROUTES.PASSAGEM || currentPath === ROUTES.HOME;
    return currentPath === targetPath;
  };

  // Derive active page for avatar dropdown highlight
  const currentPageId = PATH_TO_NAV_ID[currentPath] || 'inicial';

  return (
    <header className="efvm360-topnav" data-tour="nav-principal" role="navigation" aria-label="Navegação principal" style={{
      position: 'fixed', top: 23, left: 0, right: 0, height: 56,
      background: bg, borderBottom: `1px solid ${bd}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', zIndex: 1000,
      boxShadow: dk ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.05)',
    }}>

      {/* ── LEFT: Logo ── */}
      <div
        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}
        onClick={() => onNavigate('inicial')}
      >
        <div style={{ fontSize: 20, fontWeight: 800, color: activeColor, letterSpacing: 2 }}>
          EFVM<span style={{ color: '#69be28' }}>360</span>
        </div>
      </div>

      {/* ── CENTER: Flat Navigation — All items single-click ── */}
      <nav className="efvm360-topnav-links" style={{
        display: 'flex', alignItems: 'center', gap: 2,
      }}>
        {NAV_ITEMS.map(({ id, label }) => {
          const active = isActive(id);
          const showBadge = id === 'gestao' && pendingCount > 0;
          const translatedLabel = NAV_LABEL_KEYS[id] ? t(NAV_LABEL_KEYS[id]) : label;
          return (
            <button
              key={id}
              data-tour={`nav-${id}`}
              onClick={() => onNavigate(id)}
              style={{
                padding: '8px 18px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                background: active ? activeBg : 'transparent',
                color: active ? activeColor : txt2,
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                letterSpacing: 0.3,
                transition: 'all 120ms ease',
                whiteSpace: 'nowrap',
                borderBottom: active ? `2.5px solid ${activeColor}` : '2.5px solid transparent',
                position: 'relative',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = hover; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              {translatedLabel}
              {showBadge && (
                <span style={{
                  position: 'absolute', top: 2, right: 4,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px',
                  background: '#dc2626', color: '#fff', fontSize: 9, fontWeight: 700,
                }}>{pendingCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── RIGHT: Avatar (only dropdown in the system) ── */}
      <div ref={avatarRef} data-tour="user-menu" style={{ position: 'relative', flexShrink: 0 }}>
        {usuarioLogado && (
          <>
            <button
              onClick={() => setAvatarOpen(p => !p)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '4px 10px 4px 4px',
                borderRadius: 10, border: `1px solid ${bd}`,
                background: 'transparent', cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = hover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {(() => {
                const avatarSrc = (() => { try { return localStorage.getItem(`efvm360-avatar-${usuarioLogado.matricula}`) || ''; } catch { return ''; } })();
                return avatarSrc ? (
                  <div style={{
                    width: 34, height: 34, borderRadius: 8, overflow: 'hidden',
                  }}>
                    <img src={avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{
                    width: 34, height: 34, borderRadius: 8,
                    background: dk ? 'rgba(0,126,122,0.25)' : 'rgba(0,126,122,0.10)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: activeColor,
                  }}>
                    {usuarioLogado.nome.charAt(0).toUpperCase()}
                  </div>
                );
              })()}
              <div className="efvm360-avatar-text" style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: txt, lineHeight: 1.3 }}>
                  {usuarioLogado.nome.split(' ')[0]}
                </div>
                <div style={{ fontSize: 10, color: txt2, lineHeight: 1.2 }}>
                  {funcaoLabel}
                </div>
              </div>
              {/* Online status — visible on mobile only (avatar-text hidden there) */}
              <OnlineStatusInline status={onlineStatus} pendingCount={0} isDark={dk} />
              <svg width="10" height="10" viewBox="0 0 10 10" style={{
                transform: avatarOpen ? 'rotate(180deg)' : 'rotate(0)',
                transition: 'transform 120ms ease', marginLeft: 2,
              }}>
                <path d="M2 4 L5 7 L8 4" fill="none" stroke={txt2} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>

            {avatarOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 'min(210px, 80vw)',
                background: bg, border: `1px solid ${bd}`, borderRadius: 10,
                boxShadow: dk ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.10)',
                overflow: 'hidden', zIndex: 2000,
                animation: 'efvm360FadeIn 120ms ease',
              }}>
                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${bd}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: txt }}>{usuarioLogado.nome}</div>
                  <div style={{ fontSize: 11, color: txt2, marginTop: 2 }}>
                    {funcaoLabel} · Turno {usuarioLogado.turno}
                  </div>
                </div>
                <button
                  onClick={() => { onNavigate('perfil'); setAvatarOpen(false); }}
                  style={{
                    display: 'block', width: '100%', padding: '10px 16px', border: 'none',
                    background: currentPageId === 'perfil' ? activeBg : 'transparent',
                    color: currentPageId === 'perfil' ? activeColor : txt,
                    fontSize: 13, fontWeight: 500, textAlign: 'left', cursor: 'pointer',
                    transition: 'background 100ms ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = hover}
                  onMouseLeave={e => e.currentTarget.style.background =
                    currentPageId === 'perfil' ? activeBg : 'transparent'}
                >
                  {t('nav.meuPerfil')}
                </button>
                <button
                  onClick={() => { onNavigate('configuracoes'); setAvatarOpen(false); }}
                  style={{
                    display: 'block', width: '100%', padding: '10px 16px', border: 'none',
                    background: currentPageId === 'configuracoes' ? activeBg : 'transparent',
                    color: currentPageId === 'configuracoes' ? activeColor : txt,
                    fontSize: 13, fontWeight: 500, textAlign: 'left', cursor: 'pointer',
                    transition: 'background 100ms ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = hover}
                  onMouseLeave={e => e.currentTarget.style.background =
                    currentPageId === 'configuracoes' ? activeBg : 'transparent'}
                >
                  {t('nav.configuracoes')}
                </button>
                <div style={{ borderTop: `1px solid ${bd}` }}>
                  <button
                    onClick={() => { setAvatarOpen(false); onLogout(); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '10px 16px', border: 'none', background: 'transparent',
                      color: '#dc2626', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      textAlign: 'left', transition: 'background 100ms ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background =
                      dk ? 'rgba(220,38,38,0.10)' : 'rgba(220,38,38,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {t('nav.sairSistema')}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`@keyframes efvm360FadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </header>
  );
});

TopNavbar.displayName = 'TopNavbar';
export default TopNavbar;
