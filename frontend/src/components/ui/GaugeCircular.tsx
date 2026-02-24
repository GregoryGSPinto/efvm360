// ============================================================================
// GaugeCircular — SVG circular gauge for risk score
// ============================================================================

import React from 'react';
import type { TemaComputed } from '../../pages/types';

interface GaugeCircularProps {
  valor: number;
  tema: TemaComputed;
  tamanho?: number;
}

function getCorRisco(valor: number, tema: TemaComputed): string {
  if (valor <= 25) return tema.sucesso;
  if (valor <= 50) return tema.aviso;
  if (valor <= 75) return '#f97316';
  return tema.perigo;
}

function GaugeCircularBase({ valor, tema, tamanho = 80 }: GaugeCircularProps): JSX.Element {
  const raio = (tamanho - 8) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const offset = circunferencia - (Math.min(100, Math.max(0, valor)) / 100) * circunferencia;
  const cor = getCorRisco(valor, tema);
  const centro = tamanho / 2;

  return (
    <svg width={tamanho} height={tamanho} style={{ display: 'block', margin: '0 auto' }}>
      {/* Background circle */}
      <circle
        cx={centro}
        cy={centro}
        r={raio}
        fill="none"
        stroke={tema.cardBorda}
        strokeWidth={6}
      />
      {/* Value arc */}
      <circle
        cx={centro}
        cy={centro}
        r={raio}
        fill="none"
        stroke={cor}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={circunferencia}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${centro} ${centro})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
      />
      {/* Center text */}
      <text
        x={centro}
        y={centro}
        textAnchor="middle"
        dominantBaseline="central"
        fill={cor}
        fontSize={tamanho * 0.22}
        fontWeight={700}
      >
        {valor}%
      </text>
    </svg>
  );
}

export const GaugeCircular = React.memo(GaugeCircularBase);
