// ============================================================================
// AlertaCard — Alert card with severity indicator
// ============================================================================

import React from 'react';
import type { TemaComputed } from '../../pages/types';

type Severidade = 'critico' | 'aviso' | 'info';

interface AlertaCardProps {
  mensagem: string;
  severidade: Severidade;
  timestamp?: string;
  tema: TemaComputed;
}

const COR_SEVERIDADE: Record<Severidade, string> = {
  critico: '#dc2626',
  aviso: '#f59e0b',
  info: '#3b82f6',
};

const BG_SEVERIDADE: Record<Severidade, string> = {
  critico: 'rgba(220, 38, 38, 0.08)',
  aviso: 'rgba(245, 158, 11, 0.08)',
  info: 'rgba(59, 130, 246, 0.08)',
};

function AlertaCardBase({ mensagem, severidade, timestamp, tema }: AlertaCardProps): JSX.Element {
  const cor = COR_SEVERIDADE[severidade];

  return (
    <div
      style={{
        background: BG_SEVERIDADE[severidade],
        borderLeft: `4px solid ${cor}`,
        borderRadius: 8,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      <span
        className={
          severidade === 'critico' ? 'efvm-pulse-dot efvm360-status-danger' :
          severidade === 'aviso' ? 'efvm360-status-warning' : undefined
        }
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: cor,
          flexShrink: 0,
          marginTop: 5,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: tema.texto, fontWeight: 500, lineHeight: 1.4 }}>
          {mensagem}
        </div>
        {timestamp && (
          <div style={{ fontSize: 11, color: tema.textoSecundario, marginTop: 2 }}>{timestamp}</div>
        )}
      </div>
    </div>
  );
}

export const AlertaCard = React.memo(AlertaCardBase);
