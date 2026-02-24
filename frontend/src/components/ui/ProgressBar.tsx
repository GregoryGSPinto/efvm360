// ============================================================================
// ProgressBar — Horizontal progress bar
// ============================================================================

import React from 'react';
import type { TemaComputed } from '../../pages/types';

interface ProgressBarProps {
  valor: number;
  maximo: number;
  tema: TemaComputed;
}

function ProgressBarBase({ valor, maximo, tema }: ProgressBarProps): JSX.Element {
  const pct = maximo > 0 ? Math.min(100, (valor / maximo) * 100) : 0;
  const cor = pct > 80 ? tema.perigo : tema.sucesso;

  return (
    <div
      style={{
        width: '100%',
        height: 6,
        background: tema.cardBorda,
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: cor,
          borderRadius: 3,
          transition: 'width 0.4s ease, background 0.3s ease',
        }}
      />
    </div>
  );
}

export const ProgressBar = React.memo(ProgressBarBase);
