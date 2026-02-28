// ============================================================================
// EFVM360 v3.2 — GuidedTour Component (Rewrite)
// Simplified spotlight overlay + tooltip — auto-start after login
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
    title: 'Pronto! Boa Jornada! 🚂',
    content: 'Agora voce conhece o EFVM360. Se precisar rever o tutorial, acesse Configuracoes → Geral → Reiniciar Tutorial. Bom trabalho!',
  },
];

// ── Position helpers ──────────────────────────────────────────────────────

function calcPosition(rect: DOMRect, placement?: string): Record<string, string | number> {
  const gap = 16;
  const halfTooltip = 190; // half of maxWidth 380
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

function centerPosition(): Record<string, string | number> {
  return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
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
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const step = steps[currentStep];
  const isCenter = !step?.target;
  const progress = steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0;

  // ── Find target and update rect ──
  const findTarget = useCallback(() => {
    if (!step?.target) {
      setRect(null);
      setReady(true);
      return;
    }
    const el = document.querySelector(step.target);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        const r = el.getBoundingClientRect();
        setRect(r);
        setReady(true);
      }, 150);
    } else {
      // Fallback: show centered if target not found
      setRect(null);
      setReady(true);
    }
  }, [step]);

  // ── Go to step ──
  const goToStep = useCallback((index: number) => {
    const s = steps[index];
    if (!s) return;

    setReady(false);
    setRect(null);
    setCurrentStep(index);

    // Navigate if needed
    if (s.page) {
      onNavigate(s.page);
      // Wait for page to render
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const el = s.target ? document.querySelector(s.target) : null;
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => {
            const r = el.getBoundingClientRect();
            setRect(r);
            setReady(true);
          }, 150);
        } else {
          // Second attempt after more time
          setTimeout(() => {
            const el2 = s.target ? document.querySelector(s.target) : null;
            if (el2) {
              const r = el2.getBoundingClientRect();
              setRect(r);
            } else {
              setRect(null); // Fallback: centered
            }
            setReady(true);
          }, 500);
        }
      }, 500);
    } else if (s.target) {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const el = document.querySelector(s.target!);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => {
            const r = el.getBoundingClientRect();
            setRect(r);
            setReady(true);
          }, 150);
        } else {
          setRect(null);
          setReady(true);
        }
      }, 100);
    } else {
      // Center step — no target
      setReady(true);
    }
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
      setCurrentStep(0);
      setRect(null);
      setReady(false);
      // Initial delay for UI to settle
      const t = setTimeout(() => findTarget(), 300);
      return () => clearTimeout(t);
    }
    return () => clearTimeout(timerRef.current);
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reposition on resize
  useEffect(() => {
    if (!isActive || isCenter) return;
    const handler = () => findTarget();
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

  const hasTarget = rect !== null;
  const tooltipPos = hasTarget ? calcPosition(rect, step.placement) : centerPosition();

  return (
    <>
      {/* OVERLAY — dark backdrop, always visible */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.6)',
        opacity: ready ? 1 : 0,
        transition: 'opacity 200ms ease',
        pointerEvents: 'auto',
      }} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} />

      {/* SPOTLIGHT — cut-out hole around target */}
      {hasTarget && ready && (
        <div style={{
          position: 'fixed',
          top: rect.top - 8,
          left: rect.left - 8,
          width: rect.width + 16,
          height: rect.height + 16,
          borderRadius: 12,
          zIndex: 10001,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
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
          padding: 24,
          maxWidth: 380,
          width: 'calc(100vw - 32px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          border: `1px solid ${border}`,
          opacity: ready ? 1 : 0,
          transition: 'opacity 200ms ease',
        }}
      >
        {/* Title */}
        <div style={{
          fontSize: 18, fontWeight: 700, color: '#007e7a',
          marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>🎓</span> {step.title}
        </div>

        {/* Content */}
        <div style={{
          fontSize: 13, lineHeight: 1.6, color: txt, marginBottom: 16,
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          {currentStep > 0 ? (
            <button onClick={prev} style={{
              padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
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
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: '#007e7a', color: '#fff', fontSize: 13,
            fontWeight: 600, cursor: 'pointer',
          }}>
            {currentStep >= steps.length - 1 ? '✓ Concluir' : 'Proximo →'}
          </button>
        </div>
      </div>
    </>
  );
}

export default GuidedTour;
