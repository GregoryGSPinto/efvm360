// ============================================================================
// EFVM360 — SPLASH SCREEN — Mesma paleta do Login
// Theme-aware | Indicador circular único | Continuidade visual total
// ============================================================================
import { useState, useEffect, memo } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  duration?: number;
  onComplete: () => void;
  isDark?: boolean;
}

export const SplashScreenPremium = memo<Props>(({ duration = 4000, onComplete, isDark }) => {
  const { t } = useTranslation();

  const MSGS = [
    t('splash.loadingSystem'),
    t('splash.verifyingData'),
    t('splash.preparingEnv'),
    t('splash.loadingSecurity'),
    t('splash.establishingConn'),
  ];
  const [p, setP] = useState(0);
  const [m, setM] = useState(0);
  const [exit, setExit] = useState(false);

  const dk = isDark ?? (() => {
    try {
      const cfg = JSON.parse(localStorage.getItem('efvm360-config') || '{}');
      if (cfg.tema === 'escuro') return true;
      if (cfg.tema === 'claro') return false;
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    } catch { return false; }
  })();

  useEffect(() => {
    const pi = setInterval(() => setP(v => v >= 100 ? 100 : v + 1), duration / 100);
    const mi = setInterval(() => setM(v => (v + 1) % MSGS.length), duration / MSGS.length);
    const ct = setTimeout(() => { setExit(true); setTimeout(onComplete, 500); }, duration);
    return () => { clearInterval(pi); clearInterval(mi); clearTimeout(ct); };
  }, [duration, onComplete]);

  const R = 32, C = 2 * Math.PI * R;

  // Mesma paleta do LoginScreenPremium
  const bg     = dk ? '#121212' : '#f5f5f5';
  const cardBg = dk ? '#1e1e1e' : '#ffffff';
  const bd     = dk ? '#333333' : '#e5e5e5';
  const txt    = dk ? '#e0e0e0' : '#222222';
  const txt2   = dk ? '#a0a0a0' : '#555555';
  const trackBg = dk ? 'rgba(255,255,255,0.06)' : 'rgba(0,126,122,0.08)';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: bg,
      opacity: exit ? 0 : 1, transition: 'opacity 500ms ease-out',
    }}>
      <style>{`@keyframes efvmPulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
      <div style={{
        width: 400, maxWidth: '90%', padding: '44px 32px',
        background: cardBg, borderRadius: 16,
        border: `1px solid ${bd}`,
        boxShadow: dk ? '0 16px 48px rgba(0,0,0,0.4)' : '0 16px 48px rgba(0,0,0,0.06)',
        textAlign: 'center' as const,
      }}>
        {/* Brand — idêntico ao Login */}
        <div style={{ fontSize: 28, fontWeight: 800, color: '#007e7a', letterSpacing: 4, marginBottom: 4 }}>
          EFVM<span style={{ color: '#69be28' }}>360</span>
        </div>
        <div style={{ width: 44, height: 3, margin: '0 auto 8px', background: '#69be28', borderRadius: 2 }} />
        <div style={{ fontSize: 17, fontWeight: 600, color: txt, letterSpacing: 0.8, marginBottom: 4 }}>
          {t('splash.shiftManagement')}
        </div>
        <div style={{ fontSize: 13, color: txt2, marginBottom: 32 }}>
          {t('splash.missionCritical')}
        </div>

        {/* Circular progress */}
        <div style={{ position: 'relative', width: 72, height: 72, margin: '0 auto 20px' }}>
          <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="36" cy="36" r={R} fill="none" stroke={trackBg} strokeWidth="3" />
            <circle cx="36" cy="36" r={R} fill="none" stroke="#007e7a" strokeWidth="3"
              strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C - (p / 100) * C}
              style={{ transition: 'stroke-dashoffset 80ms linear' }} />
          </svg>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            fontSize: 15, fontWeight: 600, color: txt }}>{p}%</div>
        </div>

        {/* Status */}
        <div style={{ fontSize: 12, color: txt2, minHeight: 18 }}>{MSGS[m]}</div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 32, paddingTop: 16, borderTop: `1px solid ${bd}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: txt2 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#69be28',
              boxShadow: '0 0 6px #69be28', animation: 'efvmPulse 2s infinite' }} />
            {t('common.systemOnline')}
          </div>
          <span style={{ fontSize: 10, color: txt2 }}>v3.2</span>
        </div>
      </div>
    </div>
  );
});
SplashScreenPremium.displayName = 'SplashScreenPremium';
export default SplashScreenPremium;
