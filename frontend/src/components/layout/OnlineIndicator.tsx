// ============================================================================
// EFVM360 — OnlineIndicator (enhanced with native-like toast banners)
// Desktop: floating bottom-right badge (hidden on mobile)
// Mobile: inline component rendered in TopNavbar
// Toast: slide-down banner on connectivity changes
// ============================================================================
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  status: 'online' | 'offline' | 'syncing';
  pendingCount: number;
  isDark: boolean;
}

interface ToastProps extends Props {
  justReconnected: boolean;
  justDisconnected: boolean;
  connectionType?: string;
}

// ── Desktop Floating Badge (hidden on mobile) ──
export const OnlineIndicator = memo<Props>(({ status, pendingCount, isDark }) => {
  const { t } = useTranslation();
  const color = status === 'online' ? '#0A7F5A' : status === 'offline' ? '#dc2626' : '#d9a010';
  const label = status === 'online' ? t('onlineIndicator.online') : status === 'offline' ? t('onlineIndicator.offline') : t('onlineIndicator.syncing');

  return (
    <div className="efvm360-online-desktop" style={{
      position: 'fixed', bottom: 16, right: 16, zIndex: 900,
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', borderRadius: 20,
      background: isDark ? 'rgba(30,30,30,0.92)' : 'rgba(255,255,255,0.92)',
      border: `1px solid ${isDark ? '#333' : '#e5e5e5'}`,
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
      fontSize: 11, color: isDark ? '#aaa' : '#666',
      pointerEvents: 'none', userSelect: 'none',
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%', background: color,
        boxShadow: `0 0 6px ${color}`,
        animation: status === 'syncing' ? 'efvm360Pulse 1.5s infinite' : 'none',
      }} />
      {label}
      {pendingCount > 0 && (
        <span style={{
          padding: '0 5px', borderRadius: 6, fontSize: 9, fontWeight: 700,
          background: '#d9a010', color: '#fff',
        }}>{pendingCount}</span>
      )}
      <style>{`
        @keyframes efvm360Pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @media(max-width:767px){.efvm360-online-desktop{display:none !important;}}
      `}</style>
    </div>
  );
});
OnlineIndicator.displayName = 'OnlineIndicator';

// ── Mobile Inline Badge (for TopNavbar) ──
// v3.2: On mobile, show ONLY the green dot (no text label)
export const OnlineStatusInline = memo<Props>(({ status }) => {
  const { t } = useTranslation();
  const color = status === 'online' ? '#0A7F5A' : status === 'offline' ? '#dc2626' : '#d9a010';
  const label = status === 'online' ? t('onlineIndicator.online') : status === 'offline' ? t('onlineIndicator.offline') : t('onlineIndicator.syncShort');

  return (
    <span className="efvm360-online-mobile" style={{
      display: 'none', // Shown only on mobile via CSS
      alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 10,
      fontSize: 10, fontWeight: 600, color,
      whiteSpace: 'nowrap', flexShrink: 0,
      letterSpacing: 0.2,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: color,
        display: 'inline-block',
        boxShadow: `0 0 4px ${color}`,
        animation: status === 'syncing' ? 'efvm360Pulse 1.5s infinite' : 'none',
      }} />
      <span className="efvm360-online-label">{label}</span>
      <style>{`
        @media(max-width:767px){
          .efvm360-online-mobile{display:inline-flex !important;}
          .efvm360-online-label{display:none !important;}
        }
      `}</style>
    </span>
  );
});
OnlineStatusInline.displayName = 'OnlineStatusInline';

// ── Native-like Toast Banner (slides down from top on connectivity change) ──
export const NetworkToast = memo<ToastProps>(({
  justReconnected,
  justDisconnected,
  connectionType,
  isDark,
}) => {
  const { t } = useTranslation();
  const visible = justReconnected || justDisconnected;
  if (!visible) return null;

  const isBack = justReconnected;
  const bg = isBack ? '#0A7F5A' : '#dc2626';
  const message = isBack
    ? t('onlineIndicator.connectionRestored', 'Connection restored')
    : t('onlineIndicator.connectionLost', 'No internet connection');
  const subMessage = isBack && connectionType && connectionType !== 'unknown'
    ? connectionType === 'wifi' ? 'Wi-Fi' : connectionType === 'cellular' ? t('onlineIndicator.cellular', 'Cellular') : ''
    : !isBack ? t('onlineIndicator.offlineMode', 'Offline mode active') : '';

  return (
    <div
      className="efvm360-network-toast"
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '10px 16px',
        background: bg,
        color: '#fff',
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: 0.2,
        animation: 'efvm360ToastSlide 0.3s ease-out',
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        // Safe area inset for notched phones
        paddingTop: 'max(10px, env(safe-area-inset-top))',
      }}
    >
      <span style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: '#fff',
        opacity: 0.9,
        flexShrink: 0,
      }} />
      <span>{message}</span>
      {subMessage && (
        <span style={{ opacity: 0.8, fontWeight: 400, fontSize: 11 }}>
          ({subMessage})
        </span>
      )}
      <style>{`
        @keyframes efvm360ToastSlide {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .efvm360-network-toast {
          ${isDark ? '' : ''}
        }
      `}</style>
    </div>
  );
});
NetworkToast.displayName = 'NetworkToast';

export default OnlineIndicator;
