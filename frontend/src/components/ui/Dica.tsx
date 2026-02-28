// ============================================================================
// EFVM360 — Dica (Contextual Tip) Component
// ============================================================================

import { useState, memo } from 'react';

interface DicaProps {
  texto: string;
  visivel?: boolean;
}

export const Dica = memo<DicaProps>(({ texto, visivel = true }) => {
  const [aberta, setAberta] = useState(false);

  if (!visivel) return null;

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 4 }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: 'rgba(0,126,122,0.12)',
          color: '#007e7a',
          fontSize: 11,
          fontWeight: 700,
          cursor: 'pointer',
          userSelect: 'none',
          lineHeight: 1,
        }}
        onClick={() => setAberta(p => !p)}
        onMouseEnter={() => setAberta(true)}
        onMouseLeave={() => setAberta(false)}
        title={texto}
      >
        ?
      </span>
      {aberta && (
        <span style={{
          position: 'absolute',
          bottom: 'calc(100% + 6px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1a1a1a',
          color: '#fff',
          padding: '8px 12px',
          borderRadius: 8,
          fontSize: 12,
          lineHeight: 1.4,
          whiteSpace: 'normal',
          width: 220,
          maxWidth: '80vw',
          zIndex: 9000,
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
        }}>
          {texto}
          <span style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #1a1a1a',
          }} />
        </span>
      )}
    </span>
  );
});

Dica.displayName = 'Dica';
export default Dica;
