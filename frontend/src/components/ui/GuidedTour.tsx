// ============================================================================
// EFVM360 v3.2 — GuidedTour Component
// Spotlight overlay + tooltip — responsive desktop/mobile
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────

export interface TourStep {
  id: string;
  target?: string;           // CSS selector — undefined = centered
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  page?: string;             // Navigate before showing
}

interface GuidedTourProps {
  steps: TourStep[];
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onNavigate: (page: string) => void;
  isDark: boolean;
}

// ── Tour Steps (strategic, 9 steps) ───────────────────────────────────────

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao EFVM360!',
    content: 'Este e o sistema digital de Passagem de Servico da EFVM. Vamos fazer um tour rapido pelas principais funcionalidades. Voce pode pular a qualquer momento.',
  },
  {
    id: 'nav',
    target: '[data-tour="nav-principal"]',
    title: 'Navegacao Principal',
    content: 'Use o menu superior para acessar os modulos: Boa Jornada (passagem de servico), DSS (dialogo de seguranca), BI+ (indicadores) e Gestao.',
    placement: 'bottom',
  },
  {
    id: 'passagem',
    target: '[data-tour="nav-passagem"]',
    title: 'Passagem de Servico',
    content: 'A Boa Jornada e o coracao do sistema. Aqui voce preenche todos os dados da passagem de turno: cabecalho, equipamentos, seguranca e assinatura.',
    placement: 'bottom',
    page: 'passagem',
  },
  {
    id: 'dss',
    target: '[data-tour="nav-dss"]',
    title: 'DSS — Dialogo de Seguranca',
    content: 'Registre os Dialogos de Seguranca conforme a norma PRO-041945 da Vale. Inclua tema, participantes e observacoes.',
    placement: 'bottom',
    page: 'dss',
  },
  {
    id: 'bi',
    target: '[data-tour="nav-analytics"]',
    title: 'BI+ Dashboard',
    content: 'Acompanhe indicadores operacionais em tempo real: score do turno, passagens realizadas, DSS e exportacao de relatorios profissionais.',
    placement: 'bottom',
    page: 'analytics',
  },
  {
    id: 'gestao',
    target: '[data-tour="nav-gestao"]',
    title: 'Gestao de Equipe',
    content: 'Area para lideres e gestores: dashboard executivo, aprovacao de cadastros, ranking da equipe e auditoria de alteracoes.',
    placement: 'bottom',
    page: 'gestao',
  },
  {
    id: 'user-menu',
    target: '[data-tour="user-menu"]',
    title: 'Seu Perfil',
    content: 'Clique no seu avatar para acessar Meu Perfil, alterar foto, ajustar configuracoes ou sair do sistema.',
    placement: 'bottom',
  },
  {
    id: 'adamboot',
    target: '[data-tour="adamboot-btn"]',
    title: 'AdamBoot — Assistente',
    content: 'O AdamBoot e seu assistente inteligente. Clique nele para tirar duvidas sobre qualquer funcionalidade do sistema.',
    placement: 'left',
  },
  {
    id: 'conclusion',
    title: '🎉 Parabens! Tutorial Concluido!',
    content: 'Voce completou o tour do EFVM360! Lembre-se: seguranca e prioridade absoluta em cada passagem de servico. Preencha todos os campos com atencao, comunique pendencias a equipe e registre qualquer anomalia. Boa jornada e trabalho seguro! 🚂🛡️',
  },
];

// ── Position helpers ──────────────────────────────────────────────────────

function calcDesktopPosition(rect: DOMRect, placement?: string): Record<string, string | number> {
  const gap = 16;
  const halfTooltip = 190;
  const safeLeft = (cx: number) => Math.max(16, Math.min(cx - halfTooltip, window.innerWidth - 380 - 16));

  switch (placement) {
    case 'top':
      return { top: rect.top - gap, left: safeLeft(rect.left + rect.width / 2), transform: 'translateY(-100%)' };
    case 'left':
      return { top: Math.max(16, rect.top + rect.height / 2 - 100), left: rect.left - gap, transform: 'translateX(-100%)' };
    case 'right':
      return { top: Math.max(16, rect.top + rect.height / 2 - 100), left: rect.right + gap };
    case 'bottom':
    default:
      return { top: rect.bottom + gap, left: safeLeft(rect.left + rect.width / 2) };
  }
}

function calcMobilePosition(rect: DOMRect): Record<string, string | number> {
  const vh = window.innerHeight;
  const targetCenter = rect.top + rect.height / 2;
  const targetInUpperHalf = targetCenter < vh / 2;

  // Fixed positions: upper target → balloon at bottom; lower target → balloon at top
  if (targetInUpperHalf) {
    return { bottom: 16, left: 16, right: 16, top: 'auto' };
  }
  return { top: 80, left: 16, right: 16 };
}

function centerPosition(): Record<string, string | number> {
  return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
}

// ── Helpers ───────────────────────────────────────────────────────────────

function getIsMobile(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 768;
}

// ── Component ─────────────────────────────────────────────────────────────

export function GuidedTour({
  steps,
  isActive,
  onComplete,
  onSkip,
  onNavigate,
  isDark,
}: GuidedTourProps): JSX.Element | null {
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [ready, setReady] = useState(false);
  const [isMobile, setIsMobile] = useState(getIsMobile);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const timer2Ref = useRef<ReturnType<typeof setTimeout>>();

  const step = steps[currentStep];
  const isCenter = !step?.target;
  const progress = steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0;

  // ── Scroll to target, then measure ──
  const scrollAndMeasure = useCallback((el: Element) => {
    const scrollDelay = isMobile ? 400 : 150;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    clearTimeout(timer2Ref.current);
    timer2Ref.current = setTimeout(() => {
      const r = el.getBoundingClientRect();
      setRect(r);
      setReady(true);
    }, scrollDelay);
  }, [isMobile]);

  // ── Find target ──
  const findTarget = useCallback(() => {
    if (!step?.target) {
      setRect(null);
      setReady(true);
      return;
    }
    const el = document.querySelector(step.target);
    if (el) {
      scrollAndMeasure(el);
    } else {
      setRect(null);
      setReady(true);
    }
  }, [step, scrollAndMeasure]);

  // ── Go to step ──
  const goToStep = useCallback((index: number) => {
    const s = steps[index];
    if (!s) return;

    setReady(false);
    setRect(null);
    setCurrentStep(index);

    const mobile = getIsMobile();
    const navDelay = s.page ? (mobile ? 800 : 500) : (mobile ? 200 : 100);

    if (s.page) {
      onNavigate(s.page);
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!s.target) {
        setReady(true);
        return;
      }
      const el = document.querySelector(s.target);
      if (el) {
        const scrollDelay = mobile ? 400 : 150;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        clearTimeout(timer2Ref.current);
        timer2Ref.current = setTimeout(() => {
          const r = el.getBoundingClientRect();
          setRect(r);
          setReady(true);
        }, scrollDelay);
      } else {
        // Retry once after extra delay
        clearTimeout(timer2Ref.current);
        timer2Ref.current = setTimeout(() => {
          const el2 = s.target ? document.querySelector(s.target) : null;
          if (el2) {
            const r = el2.getBoundingClientRect();
            setRect(r);
          } else {
            setRect(null);
          }
          setReady(true);
        }, 500);
      }
    }, navDelay);
  }, [steps, onNavigate]);

  // Navigation
  const next = useCallback(() => {
    if (currentStep >= steps.length - 1) {
      onComplete();
    } else {
      goToStep(currentStep + 1);
    }
  }, [currentStep, steps.length, onComplete, goToStep]);

  const prev = useCallback(() => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, goToStep]);

  // Reset when tour starts
  useEffect(() => {
    if (isActive) {
      setIsMobile(getIsMobile());
      setCurrentStep(0);
      setRect(null);
      setReady(false);
      const t = setTimeout(() => findTarget(), 300);
      return () => clearTimeout(t);
    }
    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(timer2Ref.current);
    };
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reposition on resize + track mobile breakpoint
  useEffect(() => {
    if (!isActive) return;
    const handler = () => {
      setIsMobile(getIsMobile());
      if (!isCenter) findTarget();
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [isActive, isCenter, findTarget]);

  // Keyboard
  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isActive, onSkip, next, prev]);

  // ── Theme ──
  const bg = isDark ? '#1e1e1e' : '#ffffff';
  const txt = isDark ? '#ccc' : '#444';
  const border = isDark ? '#333' : '#e5e5e5';

  if (!isActive || !step) return null;

  // ── Position calculation ──
  const hasTarget = rect !== null;
  let tooltipPos: Record<string, string | number>;
  if (!hasTarget) {
    tooltipPos = centerPosition();
  } else if (isMobile) {
    tooltipPos = calcMobilePosition(rect);
  } else {
    tooltipPos = calcDesktopPosition(rect, step.placement);
  }

  // ── Button padding (bigger on mobile for touch targets) ──
  const btnPad = isMobile ? '12px 16px' : '8px 16px';

  const isLast = currentStep >= steps.length - 1;

  return (
    <>
      {/* OVERLAY */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.6)',
        opacity: ready ? 1 : 0,
        transition: 'opacity 200ms ease',
        pointerEvents: 'auto',
      }} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} />

      {/* SPOTLIGHT */}
      {hasTarget && ready && (
        <div style={{
          position: 'fixed',
          top: rect.top - (isMobile ? 12 : 8),
          left: rect.left - (isMobile ? 12 : 8),
          width: rect.width + (isMobile ? 24 : 16),
          height: rect.height + (isMobile ? 24 : 16),
          borderRadius: 12,
          zIndex: 10001,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
          border: isMobile ? '2px solid #007e7a' : 'none',
          pointerEvents: 'none',
          transition: 'all 200ms ease',
        }} />
      )}

      {/* TOOLTIP */}
      <div
        role="dialog"
        aria-label={step.title}
        style={{
          position: 'fixed',
          zIndex: 10002,
          ...tooltipPos,
          background: bg,
          borderRadius: 16,
          padding: isMobile ? 20 : 24,
          maxWidth: isMobile ? 'none' : 380,
          width: isMobile ? 'calc(100vw - 32px)' : 'calc(100vw - 32px)',
          ...(isMobile ? { maxHeight: 220, overflowY: 'auto' as const } : {}),
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          border: `1px solid ${border}`,
          opacity: ready ? 1 : 0,
          transition: 'opacity 200ms ease',
          boxSizing: 'border-box',
        }}
      >
        {/* Title */}
        <div style={{
          fontSize: isMobile ? 16 : 18, fontWeight: 700, color: '#007e7a',
          marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>🎓</span> {step.title}
        </div>

        {/* Content */}
        <div style={{
          fontSize: 13, lineHeight: isMobile ? 1.5 : 1.6, color: txt, marginBottom: 16,
        }}>
          {step.content}
        </div>

        {/* Progress */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
            Passo {currentStep + 1} de {steps.length}
          </div>
          <div style={{
            height: 4, background: isDark ? '#333' : '#e0e0e0',
            borderRadius: 2, overflow: 'hidden',
          }}>
            <div style={{
              width: `${progress}%`, height: '100%',
              background: 'linear-gradient(90deg, #007e7a, #69be28)',
              borderRadius: 2, transition: 'width 300ms ease',
            }} />
          </div>
        </div>

        {/* Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
        }}>
          {isMobile ? (
            <>
              <button onClick={onSkip} style={{
                padding: '10px 12px', borderRadius: 8, border: 'none',
                background: 'transparent', color: '#888', fontSize: 12,
                fontWeight: 500, cursor: 'pointer', minHeight: 44,
              }}>
                Pular
              </button>
              {currentStep > 0 && (
                <button onClick={prev} style={{
                  padding: '10px 16px', borderRadius: 8, cursor: 'pointer',
                  border: '1px solid #007e7a', background: 'transparent',
                  color: isDark ? '#e0e0e0' : '#333', fontSize: 13, fontWeight: 600,
                  minHeight: 44,
                }}>
                  ← Anterior
                </button>
              )}
              <button onClick={next} style={{
                padding: '10px 20px', borderRadius: 8, border: 'none',
                background: '#007e7a', color: '#fff', fontSize: 13,
                fontWeight: 600, cursor: 'pointer', minHeight: 44,
              }}>
                {isLast ? '✓ Concluir' : 'Proximo →'}
              </button>
            </>
          ) : (
            <>
              {currentStep > 0 ? (
                <button onClick={prev} style={{
                  padding: btnPad, borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${border}`, background: 'transparent',
                  color: isDark ? '#e0e0e0' : '#333', fontSize: 13, fontWeight: 600,
                }}>
                  ← Anterior
                </button>
              ) : <div />}

              <button onClick={onSkip} style={{
                padding: '8px 12px', borderRadius: 8, border: 'none',
                background: 'transparent', color: '#888', fontSize: 12,
                fontWeight: 500, cursor: 'pointer',
              }}>
                Pular Tutorial
              </button>

              <button onClick={next} style={{
                padding: btnPad, borderRadius: 8, border: 'none',
                background: '#007e7a', color: '#fff', fontSize: 13,
                fontWeight: 600, cursor: 'pointer',
              }}>
                {isLast ? '✓ Concluir e Ir para Inicio' : 'Proximo →'}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default GuidedTour;
