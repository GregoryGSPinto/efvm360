// ============================================================================
// EFVM360 — PullToRefresh wrapper component
// Wraps children with pull-to-refresh touch behavior + spinner indicator
// ============================================================================

import { type ReactNode } from 'react';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';

interface Props {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  disabled?: boolean;
  accentColor?: string;
}

export function PullToRefresh({ onRefresh, children, disabled, accentColor = '#0A7F5A' }: Props) {
  const { containerRef, isRefreshing, pullDistance, pullIndicatorStyle } = usePullToRefresh({
    onRefresh,
    disabled,
  });

  const indicatorOpacity = Math.min(pullDistance / 80, 1);
  const rotation = (pullDistance / 80) * 360;

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      style={{
        position: 'relative',
        overflow: 'auto',
        height: '100%',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Pull indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: `translate(-50%, ${Math.max(pullDistance - 40, 0)}px)`,
          transition: pullDistance > 0 && !isRefreshing ? 'none' : 'transform 0.3s ease-out',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.95)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          opacity: indicatorOpacity,
        }}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            style={{
              transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
              animation: isRefreshing ? 'efvm360Spin 0.8s linear infinite' : 'none',
              transition: isRefreshing ? 'none' : 'transform 0.1s linear',
            }}
          >
            <path
              d="M21 12a9 9 0 1 1-2.636-6.364"
              stroke={accentColor}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}

      {/* Content with pull transform */}
      <div style={pullIndicatorStyle}>
        {children}
      </div>

      <style>{`
        @keyframes efvm360Spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default PullToRefresh;
