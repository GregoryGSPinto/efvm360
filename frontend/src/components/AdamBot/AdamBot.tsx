// ============================================================================
// EFVM360 — AdamBot FAB (Floating Action Button) + Panel
// Draggable photo avatar (from old AdamBootChat) + new engine
// ============================================================================

import { memo, useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdamBotContext } from './AdamBotContext';
import { AdamBotPanel } from './AdamBotPanel';
import { IMAGENS } from '../../assets/images';
import type { TemaEstilos } from '../../types';

interface AdamBotProps {
  tema: TemaEstilos;
}

interface WidgetPosition {
  x: number;
  y: number;
}

const STORAGE_KEY_POSITION = 'adambot-position';
const DEFAULT_POSITION: WidgetPosition = { x: -1, y: -1 }; // -1 = default corner

const AdamBotInner = ({ tema }: AdamBotProps) => {
  const { t } = useTranslation();
  const { isOpen, toggle, unreadCount } = useAdamBotContext();

  // ── Drag state ──────────────────────────────────────────────────────
  const [position, setPosition] = useState<WidgetPosition>(DEFAULT_POSITION);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);

  // Load saved position
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_POSITION);
      if (saved) setPosition(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // Persist position
  useEffect(() => {
    if (position.x !== -1 && position.y !== -1) {
      localStorage.setItem(STORAGE_KEY_POSITION, JSON.stringify(position));
    }
  }, [position]);

  // ── Pointer handlers (works for mouse + touch) ─────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (widgetRef.current) {
      const rect = widgetRef.current.getBoundingClientRect();
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    const isMobile = window.innerWidth < 768;
    const topSafe = 60;
    const bottomSafe = isMobile ? 80 : 10;
    const maxX = window.innerWidth - 70;
    const maxY = window.innerHeight - 70 - bottomSafe;

    setPosition({
      x: Math.max(10, Math.min(newX, maxX)),
      y: Math.max(topSafe, Math.min(newY, maxY)),
    });
  }, [isDragging, dragOffset]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  // ── Compute FAB style ──────────────────────────────────────────────
  const getWidgetStyle = (): React.CSSProperties => {
    const isMobile = window.innerWidth < 768;
    const base: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9998,
      touchAction: 'none',
      cursor: isDragging ? 'grabbing' : 'grab',
    };

    if (position.x === -1 && position.y === -1) {
      return {
        ...base,
        bottom: isMobile ? '88px' : '24px',
        right: isMobile ? '16px' : '24px',
      };
    }

    return { ...base, left: `${position.x}px`, top: `${position.y}px` };
  };

  return (
    <>
      {/* Keyframes */}
      <style>{`
        @keyframes adam-pulse {
          0% { box-shadow: 0 0 0 0 rgba(0,126,122,0.5); }
          70% { box-shadow: 0 0 0 12px rgba(0,126,122,0); }
          100% { box-shadow: 0 0 0 0 rgba(0,126,122,0); }
        }
        @keyframes adambot-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>

      {/* Panel — receives FAB position */}
      <AdamBotPanel tema={tema} fabPosition={position} />

      {/* Draggable FAB */}
      <div
        ref={widgetRef}
        data-tour="adamboot-btn"
        style={getWidgetStyle()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <button
          type="button"
          aria-label={isOpen ? t('adambot.closeAssistant') : t('adambot.openAssistant')}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'transparent',
            border: `3px solid ${tema.primaria}`,
            cursor: isDragging ? 'grabbing' : 'pointer',
            padding: '2px',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25), 0 0 0 2px rgba(255,255,255,0.1)',
            animation: isDragging
              ? 'none'
              : unreadCount > 0 && !isOpen
                ? 'adam-pulse 2s infinite'
                : 'adambot-float 3s ease-in-out infinite',
            transition: 'box-shadow 0.3s ease',
          }}
          onClick={(e) => {
            if (!isDragging) toggle();
            e.stopPropagation();
          }}
          title={t('adambot.dragToMove')}
        >
          <img
            src={IMAGENS.adamboot}
            alt="AdamBot"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '50%',
              objectPosition: 'center top',
              pointerEvents: 'none',
            }}
          />
        </button>

        {/* Badge — unread notifications */}
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
            pointerEvents: 'none',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        {/* Online indicator (when no unread) */}
        {unreadCount === 0 && !isOpen && (
          <div style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: '#22c55e',
            border: '2px solid #fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '9px',
            color: '#fff',
            fontWeight: 700,
            pointerEvents: 'none',
          }}>
            ✓
          </div>
        )}
      </div>
    </>
  );
};

export const AdamBot = memo(AdamBotInner);
AdamBot.displayName = 'AdamBot';
