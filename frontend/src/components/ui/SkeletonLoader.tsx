// ============================================================================
// SkeletonLoader — Shimmer loading placeholders for async data
// ============================================================================

import React from 'react';
import type { TemaComputed } from '../../pages/types';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

function SkeletonBase({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps): JSX.Element {
  return (
    <div
      className="efvm360-skeleton"
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
}

export const Skeleton = React.memo(SkeletonBase);

// ── Preset layouts ─────────────────────────────────────────────────────

interface SkeletonCardProps {
  tema: TemaComputed;
  lines?: number;
}

function SkeletonCardBase({ tema, lines = 3 }: SkeletonCardProps): JSX.Element {
  return (
    <div
      style={{
        background: tema.card,
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        borderRadius: 12,
        border: `1px solid ${tema.cardBorda}`,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <Skeleton width="40%" height={20} />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '60%' : '100%'} height={14} />
      ))}
    </div>
  );
}

export const SkeletonCard = React.memo(SkeletonCardBase);

interface SkeletonTableProps {
  tema: TemaComputed;
  rows?: number;
  cols?: number;
}

function SkeletonTableBase({ tema, rows = 5, cols = 4 }: SkeletonTableProps): JSX.Element {
  return (
    <div
      style={{
        background: tema.card,
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        borderRadius: 12,
        border: `1px solid ${tema.cardBorda}`,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 8 }}>
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} height={14} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} height={12} />
          ))}
        </div>
      ))}
    </div>
  );
}

export const SkeletonTable = React.memo(SkeletonTableBase);

interface SkeletonDashboardProps {
  tema: TemaComputed;
}

function SkeletonDashboardBase({ tema }: SkeletonDashboardProps): JSX.Element {
  return (
    <div className="efvm360-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} tema={tema} lines={2} />
        ))}
      </div>
      {/* Chart area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <SkeletonCard tema={tema} lines={6} />
        <SkeletonCard tema={tema} lines={6} />
      </div>
    </div>
  );
}

export const SkeletonDashboard = React.memo(SkeletonDashboardBase);
