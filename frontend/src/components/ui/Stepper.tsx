// ============================================================================
// Stepper — Form section navigator for handover form
// Horizontal scrollable stepper with completion indicators
// ============================================================================

import React, { useRef, useEffect, useCallback } from 'react';
import type { TemaComputed } from '../../pages/types';

export interface StepperStep {
  id: string;
  label: string;
  icon?: string;
  completed?: boolean;
  hasError?: boolean;
}

interface StepperProps {
  steps: StepperStep[];
  activeStep: string;
  onStepClick: (stepId: string) => void;
  tema: TemaComputed;
}

function StepperBase({ steps, activeStep, onStepClick, tema }: StepperProps): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeIdx = steps.findIndex(s => s.id === activeStep);

  // Scroll active step into view
  useEffect(() => {
    if (!scrollRef.current) return;
    const activeEl = scrollRef.current.children[activeIdx] as HTMLElement | undefined;
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeIdx]);

  const getStepStyle = useCallback((step: StepperStep, idx: number): React.CSSProperties => {
    const isActive = step.id === activeStep;
    const isPast = idx < activeIdx;

    return {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      padding: '10px 16px',
      borderRadius: 10,
      cursor: 'pointer',
      border: 'none',
      outline: 'none',
      background: isActive
        ? `${tema.primaria}14`
        : 'transparent',
      transition: 'all 200ms ease',
      minWidth: 80,
      flexShrink: 0,
      opacity: isPast || isActive ? 1 : 0.6,
    };
  }, [activeStep, activeIdx, tema]);

  return (
    <div
      ref={scrollRef}
      className="efvm360-scroll-hide"
      role="tablist"
      style={{
        display: 'flex',
        gap: 2,
        overflowX: 'auto',
        padding: '8px 4px',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {steps.map((step, idx) => {
        const isActive = step.id === activeStep;
        const isPast = idx < activeIdx;

        return (
          <button
            key={step.id}
            role="tab"
            aria-selected={isActive}
            aria-label={`${step.label}${step.completed ? ' (concluido)' : ''}`}
            style={getStepStyle(step, idx)}
            onClick={() => onStepClick(step.id)}
          >
            {/* Step number / status circle */}
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                transition: 'all 200ms ease',
                ...(step.hasError
                  ? { background: `${tema.perigo}18`, color: tema.perigo, border: `2px solid ${tema.perigo}` }
                  : step.completed
                    ? { background: tema.primaria, color: '#fff', border: `2px solid ${tema.primaria}` }
                    : isActive
                      ? { background: `${tema.primaria}18`, color: tema.primaria, border: `2px solid ${tema.primaria}` }
                      : isPast
                        ? { background: `${tema.primaria}12`, color: tema.primaria, border: `2px solid ${tema.primaria}40` }
                        : { background: 'transparent', color: tema.textoSecundario, border: `2px solid ${tema.cardBorda}` }
                ),
              }}
            >
              {step.hasError ? '!' : step.completed ? '\u2713' : step.icon || (idx + 1)}
            </div>

            {/* Label */}
            <span
              style={{
                fontSize: 10,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? tema.primaria : tema.textoSecundario,
                letterSpacing: 0.3,
                textAlign: 'center',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                maxWidth: 80,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {step.label}
            </span>

            {/* Active indicator bar */}
            {isActive && (
              <div
                style={{
                  width: 20,
                  height: 3,
                  borderRadius: 2,
                  background: tema.primaria,
                  transition: 'width 200ms ease',
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export const Stepper = React.memo(StepperBase);
