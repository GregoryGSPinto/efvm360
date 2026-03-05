// ============================================================================
// StatCard — Metric card for dashboard
// ============================================================================

import React from 'react';
import type { TemaComputed } from '../../pages/types';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  valor: string | number;
  subtexto?: string;
  destaque?: boolean;
  tema: TemaComputed;
  children?: React.ReactNode;
}

function StatCardBase({ icon, label, valor, subtexto, destaque, tema, children }: StatCardProps): JSX.Element {
  return (
    <div
      className="efvm360-glass-card"
      style={{
        background: tema.card,
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        borderRadius: 12,
        padding: '20px 16px',
        border: destaque
          ? `2px solid ${tema.primaria}40`
          : `1px solid ${tema.cardBorda}`,
        borderLeft: destaque ? `4px solid ${tema.primaria}` : undefined,
        boxShadow: tema.cardSombra,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: tema.texto }}>{valor}</div>
      {children}
      <div style={{ fontSize: 10, color: tema.textoSecundario, letterSpacing: '0.5px', marginTop: 2 }}>
        {label}
      </div>
      {subtexto && (
        <div style={{ fontSize: 11, color: tema.textoSecundario, marginTop: 2 }}>{subtexto}</div>
      )}
    </div>
  );
}

export const StatCard = React.memo(StatCardBase);
