// ============================================================================
// EFVM360 — YardSelector — Post-login yard selection for coordinator+ users
// Shows when user has multiple assigned yards (via usuario_patios)
// ============================================================================

import { memo, useState, useMemo } from 'react';
import { ALL_YARD_CODES, getYardName, type YardCode } from '../domain/aggregates/YardRegistry';
import type { Usuario } from '../types';

interface YardSelectorProps {
  user: Usuario;
  onSelect: (yardCode: string) => void;
  isDark?: boolean;
}

export const YardSelector = memo<YardSelectorProps>(({ user, onSelect, isDark = false }) => {
  const [selected, setSelected] = useState(user.primaryYard || 'VFZ');

  const yards = useMemo(() => {
    const allowed = user.allowedYards || ALL_YARD_CODES;
    return allowed.map(code => ({
      code,
      name: getYardName(code as YardCode),
      isPrimary: code === user.primaryYard,
    }));
  }, [user]);

  const bg = isDark ? '#121212' : '#f5f5f5';
  const cardBg = isDark ? '#1e1e1e' : '#ffffff';
  const bd = isDark ? '#333' : '#e5e5e5';
  const txt = isDark ? '#e0e0e0' : '#222';
  const txt2 = isDark ? '#a0a0a0' : '#666';

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: bg, zIndex: 9999,
    }}>
      <div style={{
        width: 400, maxWidth: '92%', background: cardBg, borderRadius: 16,
        border: `1px solid ${bd}`, padding: '32px',
        boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.4)' : '0 16px 48px rgba(0,0,0,0.06)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#007e7a', letterSpacing: 3, marginBottom: 4 }}>
            EFVM<span style={{ color: '#69be28' }}>360</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: txt, marginBottom: 4 }}>
            Selecionar Patio de Operacao
          </div>
          <div style={{ fontSize: 12, color: txt2 }}>
            {user.nome} — {user.funcao}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {yards.map(yard => (
            <button
              key={yard.code}
              onClick={() => setSelected(yard.code)}
              style={{
                padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                border: selected === yard.code ? '2px solid #007e7a' : `1px solid ${bd}`,
                background: selected === yard.code
                  ? (isDark ? 'rgba(0,126,122,0.15)' : 'rgba(0,126,122,0.06)')
                  : 'transparent',
                color: selected === yard.code ? '#007e7a' : txt,
                fontWeight: selected === yard.code ? 700 : 400,
                fontSize: 14, textAlign: 'left',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'all 120ms ease',
              }}
            >
              <span>{yard.code} — {yard.name}</span>
              {yard.isPrimary && (
                <span style={{ fontSize: 10, color: txt2, fontWeight: 500 }}>Principal</span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => onSelect(selected)}
          style={{
            width: '100%', padding: '14px', borderRadius: 10, border: 'none',
            background: '#007e7a', color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', letterSpacing: 0.8,
            boxShadow: '0 2px 10px rgba(0,126,122,0.2)',
          }}
        >
          ENTRAR NO PATIO {selected}
        </button>
      </div>
    </div>
  );
});

YardSelector.displayName = 'YardSelector';
export default YardSelector;
