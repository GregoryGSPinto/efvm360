// ============================================================================
// StatusIndicator — Status badge with colored dot
// ============================================================================

import React from 'react';
import type { TemaComputed } from '../../pages/types';

type StatusType = 'online' | 'offline' | 'warning' | 'maintenance';

interface StatusIndicatorProps {
  status: StatusType;
  label: string;
  tema: TemaComputed;
}

const COR_STATUS: Record<StatusType, string> = {
  online: '#22c55e',
  offline: '#ef4444',
  warning: '#f59e0b',
  maintenance: '#8b5cf6',
};

function StatusIndicatorBase({ status, label, tema }: StatusIndicatorProps): JSX.Element {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 12px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 500,
        color: tema.textoSecundario,
        background: `${COR_STATUS[status]}12`,
      }}
    >
      <span
        className={status === 'online' ? 'efvm360-status-live' : status === 'offline' ? 'efvm360-status-danger' : undefined}
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: COR_STATUS[status],
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}

export const StatusIndicator = React.memo(StatusIndicatorBase);
