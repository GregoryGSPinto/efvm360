// ============================================================================
// EFVM360 — Componentes de Layout Reutilizáveis
// ============================================================================

import React, { memo } from 'react';
import type { TemaEstilos } from '../../types';
import type { StylesObject } from '../../hooks/useStyles';

// ============================================================================
// CARD
// ============================================================================

interface CardProps {
  children: React.ReactNode;
  title?: string;
  icon?: string;
  borderColor?: string;
  styles: StylesObject;
}

export const Card = memo<CardProps>(({
  children,
  title,
  icon,
  borderColor,
  styles,
}) => (
  <div
    style={{
      ...styles.card,
      ...(borderColor ? { borderLeft: `4px solid ${borderColor}` } : {}),
    }}
  >
    {title && (
      <h3 style={styles.cardTitle}>
        {icon && <span>{icon}</span>} {title}
      </h3>
    )}
    {children}
  </div>
));

Card.displayName = 'Card';

// ============================================================================
// STATUS BADGE
// ============================================================================

interface StatusBadgeProps {
  status: 'livre' | 'ocupada' | 'interditada';
  tema: TemaEstilos;
}

export const StatusBadge = memo<StatusBadgeProps>(({ status, tema }) => {
  const config = {
    livre: { bg: tema.sucesso, text: '✓ LIVRE' },
    ocupada: { bg: tema.aviso, text: '● OCUPADA' },
    interditada: { bg: tema.perigo, text: '⛔ INTERDITADA' },
  };

  const { bg, text } = config[status];

  return (
    <span
      style={{
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        background: bg,
        color: '#fff',
      }}
    >
      {text}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';

// ============================================================================
// SECTION HEADER
// ============================================================================

interface SectionHeaderProps {
  title: string;
  tema: TemaEstilos;
}

export const SectionHeader = memo<SectionHeaderProps>(({ title, tema }) => (
  <h2
    style={{
      fontSize: '20px',
      fontWeight: 700,
      marginBottom: '24px',
      color: tema.texto,
    }}
  >
    {title}
  </h2>
));

SectionHeader.displayName = 'SectionHeader';
