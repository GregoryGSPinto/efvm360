// ============================================================================
// EFVM360 — AdamBot FAB (Floating Action Button) + Panel
// Main entry point: renders the FAB and the Panel overlay
// ============================================================================

import { memo } from 'react';
import { useAdamBotContext } from './AdamBotContext';
import { AdamBotPanel } from './AdamBotPanel';
import type { TemaEstilos } from '../../types';

interface AdamBotProps {
  tema: TemaEstilos;
}

const AdamBotInner = ({ tema }: AdamBotProps) => {
  const { isOpen, toggle, unreadCount } = useAdamBotContext();

  return (
    <>
      {/* Pulse keyframes */}
      <style>{`
        @keyframes adam-pulse {
          0% { box-shadow: 0 0 0 0 rgba(0,126,122,0.5); }
          70% { box-shadow: 0 0 0 12px rgba(0,126,122,0); }
          100% { box-shadow: 0 0 0 0 rgba(0,126,122,0); }
        }
      `}</style>

      {/* Panel */}
      <AdamBotPanel tema={tema} />

      {/* FAB */}
      <button
        type="button"
        data-tour="adamboot-btn"
        onClick={toggle}
        aria-label={isOpen ? 'Fechar assistente Adam' : 'Abrir assistente Adam'}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #007e7a, #005c59)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '26px',
          color: '#fff',
          boxShadow: '0 4px 16px rgba(0,126,122,0.4)',
          transition: 'transform 200ms ease, box-shadow 200ms ease',
          zIndex: 9998,
          animation: unreadCount > 0 && !isOpen ? 'adam-pulse 2s infinite' : 'none',
        }}
        onMouseEnter={e => { (e.target as HTMLElement).style.transform = 'scale(1.08)'; }}
        onMouseLeave={e => { (e.target as HTMLElement).style.transform = 'scale(1)'; }}
      >
        {isOpen ? '✕' : '🤖'}
        {/* Badge */}
        {unreadCount > 0 && !isOpen && (
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: '#e53935',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #fff',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </>
  );
};

export const AdamBot = memo(AdamBotInner);
AdamBot.displayName = 'AdamBot';
