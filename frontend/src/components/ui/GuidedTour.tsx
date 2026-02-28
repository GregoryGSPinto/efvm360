// ============================================================================
// EFVM360 v3.2 — GuidedTour Component
// Interactive tutorial with spotlight overlay and floating tooltips
// ============================================================================

import { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────

export interface TourStep {
  id: string;
  target: string;              // CSS selector
  title: string;
  content: string;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  page?: string;               // Navigate before showing
  spotlightPadding?: number;
  onBeforeShow?: () => void;
}

interface GuidedTourProps {
  steps: TourStep[];
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onNavigate: (page: string) => void;
  isDark: boolean;
}

// ── Tour Steps Definition ─────────────────────────────────────────────────

export const TOUR_STEPS: TourStep[] = [
  // ── Bloco 1: Orientação Inicial ──
  {
    id: 'welcome',
    target: '',
    title: 'Bem-vindo ao EFVM360!',
    content: 'Vamos conhecer o sistema de Passagem de Servico digital da EFVM. Este tour guiado mostrara os principais recursos e como navegar pelo sistema.',
    placement: 'center',
  },
  {
    id: 'demo-banner',
    target: '[data-tour="demo-banner"]',
    title: 'Ambiente de Demonstracao',
    content: 'Este e um ambiente de demonstracao. Seus dados sao salvos localmente no navegador e nao sao enviados a nenhum servidor.',
    placement: 'bottom',
    spotlightPadding: 2,
  },
  {
    id: 'nav-principal',
    target: '[data-tour="nav-principal"]',
    title: 'Navegacao Principal',
    content: 'Use o menu superior para navegar entre os modulos do sistema. Cada modulo tem funcionalidades especificas para o dia a dia operacional.',
    placement: 'bottom',
    spotlightPadding: 4,
  },

  // ── Bloco 2: Boa Jornada / Passagem ──
  {
    id: 'nav-passagem',
    target: '[data-tour="nav-passagem"]',
    title: 'Boa Jornada — Passagem de Servico',
    content: 'A Passagem de Servico e o coracao do sistema. Aqui voce registra todas as informacoes do turno: equipe, locomotiva, condicoes operacionais e muito mais.',
    placement: 'bottom',
    page: 'passagem',
    spotlightPadding: 6,
  },
  {
    id: 'secao-nav',
    target: '[data-tour="secao-nav"]',
    title: 'Secoes da Passagem',
    content: 'A passagem e dividida em secoes: Cabecalho, Postos, Patio, Atencao, Intervencoes, Equipamentos, Seguranca em Manobras, 5S e Assinatura. Navegue entre elas aqui.',
    placement: 'bottom',
    page: 'passagem',
    spotlightPadding: 6,
  },
  {
    id: 'risco-operacional',
    target: '[data-tour="risco-operacional"]',
    title: 'Risco Operacional',
    content: 'O indicador de Risco Operacional e calculado automaticamente com base nos dados preenchidos. Ele ajuda a identificar condicoes criticas antes da passagem.',
    placement: 'bottom',
    page: 'passagem',
    spotlightPadding: 8,
  },

  // ── Bloco 3: DSS ──
  {
    id: 'nav-dss',
    target: '[data-tour="nav-dss"]',
    title: 'DSS — Dialogo de Seguranca',
    content: 'O DSS (Dialogo Semanal de Seguranca) segue a norma PRO-041945 da Vale. Registre temas, topicos e experiencias de seguranca.',
    placement: 'bottom',
    page: 'dss',
    spotlightPadding: 6,
  },

  // ── Bloco 4: BI+ ──
  {
    id: 'nav-analytics',
    target: '[data-tour="nav-analytics"]',
    title: 'BI+ — Dashboard Analitico',
    content: 'O BI+ apresenta indicadores operacionais e analises em tempo real. Acompanhe KPIs, graficos de tendencias e exporte relatorios profissionais.',
    placement: 'bottom',
    page: 'analytics',
    spotlightPadding: 6,
  },

  // ── Bloco 5: Historico ──
  {
    id: 'nav-historico',
    target: '[data-tour="nav-historico"]',
    title: 'Historico de Registros',
    content: 'Acesse o historico completo de passagens de servico e DSS. Filtre por periodo, tema e visualize rankings de equipe.',
    placement: 'bottom',
    page: 'historico',
    spotlightPadding: 6,
  },

  // ── Bloco 6: Layout ──
  {
    id: 'nav-layout',
    target: '[data-tour="nav-layout"]',
    title: 'Layout do Patio',
    content: 'Visualize o mapa interativo do patio com as linhas, locomotivas e vagoes. Acompanhe a ocupacao e o status em tempo real.',
    placement: 'bottom',
    page: 'layout',
    spotlightPadding: 6,
  },

  // ── Bloco 7: Perfil e Configurações ──
  {
    id: 'user-menu',
    target: '[data-tour="user-menu"]',
    title: 'Menu do Usuario',
    content: 'Clique no seu avatar para acessar Meu Perfil, Configuracoes ou sair do sistema. Aqui voce tambem ve seu nome e funcao.',
    placement: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'perfil',
    target: '[data-tour="nav-principal"]',
    title: 'Meu Perfil',
    content: 'Em Meu Perfil voce pode alterar sua foto, definir metas pessoais, ver seus badges de conquista e acompanhar seu historico de desempenho.',
    placement: 'bottom',
    page: 'perfil',
    spotlightPadding: 4,
  },
  {
    id: 'configuracoes',
    target: '[data-tour="nav-principal"]',
    title: 'Configuracoes',
    content: 'Personalize tema (claro/escuro/automatico), idioma, acessibilidade, notificacoes e configuracoes do assistente AdamBoot.',
    placement: 'bottom',
    page: 'configuracoes',
    spotlightPadding: 4,
  },

  // ── Bloco 8: AdamBoot + Finalização ──
  {
    id: 'adamboot-btn',
    target: '[data-tour="adamboot-btn"]',
    title: 'AdamBoot — Assistente IA',
    content: 'O AdamBoot e seu assistente inteligente. Pergunte sobre qualquer funcionalidade do sistema, peca dicas operacionais ou ajuda com formularios!',
    placement: 'top',
    spotlightPadding: 10,
  },
  {
    id: 'tour-botao',
    target: '[data-tour="tour-btn"]',
    title: 'Reiniciar o Tutorial',
    content: 'Voce pode reiniciar este tutorial a qualquer momento clicando no icone de graduacao no menu superior.',
    placement: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'conclusao',
    target: '',
    title: 'Pronto! Boa Jornada!',
    content: 'Agora voce conhece o EFVM360. Explore cada modulo e conte com o AdamBoot para tirar duvidas. Boa jornada! 🚂',
    placement: 'center',
  },
];

// ── Tooltip position calculator ───────────────────────────────────────────

interface TooltipPos {
  top: number;
  left: number;
  arrowSide: 'top' | 'bottom' | 'left' | 'right';
}

const TOOLTIP_W = 360;
const TOOLTIP_MAX_H = 260;
const ARROW_SIZE = 10;
const GAP = 14;

function calcTooltipPos(
  rect: DOMRect,
  placement: TourStep['placement'],
  isMobile: boolean,
): TooltipPos {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const effectivePlacement = isMobile && (placement === 'left' || placement === 'right')
    ? 'bottom'
    : placement;

  const tooltipW = Math.min(TOOLTIP_W, vw - 32);

  let top = 0;
  let left = 0;
  let arrowSide: TooltipPos['arrowSide'] = 'top';

  switch (effectivePlacement) {
    case 'bottom':
      top = rect.bottom + GAP;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      arrowSide = 'top';
      break;
    case 'top':
      top = rect.top - TOOLTIP_MAX_H - GAP;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      arrowSide = 'bottom';
      break;
    case 'left':
      top = rect.top + rect.height / 2 - TOOLTIP_MAX_H / 2;
      left = rect.left - tooltipW - GAP;
      arrowSide = 'right';
      break;
    case 'right':
      top = rect.top + rect.height / 2 - TOOLTIP_MAX_H / 2;
      left = rect.right + GAP;
      arrowSide = 'left';
      break;
  }

  // Clamp to viewport
  if (left < 16) left = 16;
  if (left + tooltipW > vw - 16) left = vw - tooltipW - 16;
  if (top < 16) top = 16;
  if (top + TOOLTIP_MAX_H > vh - 16) top = vh - TOOLTIP_MAX_H - 16;

  return { top, left, arrowSide };
}

// ── Arrow CSS ─────────────────────────────────────────────────────────────

function getArrowStyle(side: TooltipPos['arrowSide'], isDark: boolean): CSSProperties {
  const color = isDark ? '#1e1e1e' : '#ffffff';
  const base: CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
    borderStyle: 'solid',
  };
  switch (side) {
    case 'top':
      return {
        ...base,
        top: -ARROW_SIZE,
        left: '50%',
        marginLeft: -ARROW_SIZE,
        borderWidth: `0 ${ARROW_SIZE}px ${ARROW_SIZE}px ${ARROW_SIZE}px`,
        borderColor: `transparent transparent ${color} transparent`,
      };
    case 'bottom':
      return {
        ...base,
        bottom: -ARROW_SIZE,
        left: '50%',
        marginLeft: -ARROW_SIZE,
        borderWidth: `${ARROW_SIZE}px ${ARROW_SIZE}px 0 ${ARROW_SIZE}px`,
        borderColor: `${color} transparent transparent transparent`,
      };
    case 'left':
      return {
        ...base,
        left: -ARROW_SIZE,
        top: '50%',
        marginTop: -ARROW_SIZE,
        borderWidth: `${ARROW_SIZE}px ${ARROW_SIZE}px ${ARROW_SIZE}px 0`,
        borderColor: `transparent ${color} transparent transparent`,
      };
    case 'right':
      return {
        ...base,
        right: -ARROW_SIZE,
        top: '50%',
        marginTop: -ARROW_SIZE,
        borderWidth: `${ARROW_SIZE}px 0 ${ARROW_SIZE}px ${ARROW_SIZE}px`,
        borderColor: `transparent transparent transparent ${color}`,
      };
  }
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
  const [tooltipPos, setTooltipPos] = useState<TooltipPos | null>(null);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const observerRef = useRef<MutationObserver | null>(null);
  const rafRef = useRef<number>(0);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const isCenter = !step?.target || step.placement === 'center';
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const progress = steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0;

  // ── Position target element ──
  const positionTooltip = useCallback(() => {
    if (!step) return;
    if (isCenter) {
      setSpotlightRect(null);
      setTooltipPos(null);
      setVisible(true);
      return;
    }

    const el = document.querySelector(step.target);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const pad = step.spotlightPadding ?? 8;
    const paddedRect = new DOMRect(
      rect.x - pad,
      rect.y - pad,
      rect.width + pad * 2,
      rect.height + pad * 2,
    );

    setSpotlightRect(paddedRect);
    setTooltipPos(calcTooltipPos(rect, step.placement, isMobile));
    setVisible(true);
  }, [step, isCenter, isMobile]);

  // ── Wait for element to appear in DOM ──
  const waitForElement = useCallback((selector: string, callback: () => void) => {
    if (!selector) {
      callback();
      return;
    }

    const el = document.querySelector(selector);
    if (el) {
      callback();
      return;
    }

    // Use MutationObserver to wait for element
    if (observerRef.current) observerRef.current.disconnect();

    let attempts = 0;
    const maxAttempts = 50; // ~2.5s

    const check = () => {
      attempts++;
      const found = document.querySelector(selector);
      if (found) {
        if (observerRef.current) observerRef.current.disconnect();
        callback();
      } else if (attempts < maxAttempts) {
        rafRef.current = requestAnimationFrame(check);
      }
    };

    observerRef.current = new MutationObserver(() => {
      const found = document.querySelector(selector);
      if (found) {
        observerRef.current?.disconnect();
        cancelAnimationFrame(rafRef.current);
        callback();
      }
    });

    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
    });

    rafRef.current = requestAnimationFrame(check);
  }, []);

  // ── Show step ──
  const showStep = useCallback((index: number) => {
    const s = steps[index];
    if (!s) return;

    setAnimating(true);
    setVisible(false);

    // Navigate if needed
    if (s.page) {
      onNavigate(s.page);
    }

    // Run before-show callback
    if (s.onBeforeShow) {
      s.onBeforeShow();
    }

    // Wait for element then position
    const doPosition = () => {
      const target = s.target ? document.querySelector(s.target) : null;
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      // Delay to let scroll finish
      setTimeout(() => {
        setCurrentStep(index);
        setAnimating(false);
      }, 300);
    };

    if (s.target && s.placement !== 'center') {
      waitForElement(s.target, doPosition);
    } else {
      setTimeout(() => {
        setCurrentStep(index);
        setAnimating(false);
      }, 200);
    }
  }, [steps, onNavigate, waitForElement]);

  // ── Navigation ──
  const goNext = useCallback(() => {
    if (currentStep >= steps.length - 1) {
      onComplete();
    } else {
      showStep(currentStep + 1);
    }
  }, [currentStep, steps.length, onComplete, showStep]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      showStep(currentStep - 1);
    }
  }, [currentStep, showStep]);

  // ── Effects ──

  // Position tooltip when step changes
  useEffect(() => {
    if (!isActive) return;
    positionTooltip();
  }, [isActive, currentStep, positionTooltip]);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!isActive) return;
    const handler = () => positionTooltip();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [isActive, positionTooltip]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isActive, onSkip, goNext, goPrev]);

  // Reset on activation
  useEffect(() => {
    if (isActive) {
      setCurrentStep(0);
      showStep(0);
    }
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [isActive]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Theme tokens ──
  const bg = isDark ? '#1e1e1e' : '#ffffff';
  const txt = isDark ? '#e0e0e0' : '#1a1a1a';
  const txt2 = isDark ? '#a0a0a0' : '#555555';
  const border = isDark ? '#333' : '#e5e5e5';
  const primary = '#007e7a';
  const primaryLight = isDark ? 'rgba(0,126,122,0.25)' : 'rgba(0,126,122,0.10)';

  if (!isActive || !step) return null;

  // ── Spotlight overlay style ──
  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 10000,
    pointerEvents: 'auto',
  };

  // Build clip-path for spotlight hole
  let clipPath = 'none';
  if (spotlightRect && !isCenter) {
    const { x, y, width, height } = spotlightRect;
    const r = 12; // border-radius
    clipPath = `polygon(
      0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
      ${x}px ${y + r}px,
      ${x + r}px ${y}px,
      ${x + width - r}px ${y}px,
      ${x + width}px ${y + r}px,
      ${x + width}px ${y + height - r}px,
      ${x + width - r}px ${y + height}px,
      ${x + r}px ${y + height}px,
      ${x}px ${y + height - r}px,
      ${x}px ${y + r}px
    )`;
  }

  const overlayBg: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 10000,
    background: 'rgba(0,0,0,0.5)',
    transition: 'opacity 200ms ease',
    opacity: visible && !animating ? 1 : 0,
    clipPath: isCenter ? 'none' : clipPath,
  };

  // ── Tooltip styles ──
  const tooltipW = Math.min(TOOLTIP_W, (typeof window !== 'undefined' ? window.innerWidth : 400) - 32);

  const tooltipStyle: CSSProperties = isCenter
    ? {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) translateY(${visible && !animating ? '0' : '12px'})`,
        width: tooltipW,
        maxWidth: 'calc(100vw - 32px)',
        zIndex: 10001,
        background: bg,
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        border: `1px solid ${border}`,
        padding: 0,
        opacity: visible && !animating ? 1 : 0,
        transition: 'opacity 200ms ease, transform 200ms ease',
      }
    : {
        position: 'fixed',
        top: tooltipPos?.top ?? 0,
        left: tooltipPos?.left ?? 0,
        width: tooltipW,
        maxWidth: 'calc(100vw - 32px)',
        zIndex: 10001,
        background: bg,
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        border: `1px solid ${border}`,
        padding: 0,
        opacity: visible && !animating ? 1 : 0,
        transform: `translateY(${visible && !animating ? '0' : '8px'})`,
        transition: 'opacity 200ms ease, transform 200ms ease',
      };

  // ── Button base style ──
  const btnBase: CSSProperties = {
    padding: '8px 18px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    transition: 'all 120ms ease',
  };

  return (
    <>
      {/* Overlay background */}
      <div style={overlayBg} />

      {/* Click-blocker overlay (transparent) — allows clicking "skip" but blocks page interaction */}
      <div
        style={overlayStyle}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      />

      {/* Spotlight ring (visible border around target) */}
      {spotlightRect && !isCenter && visible && (
        <div style={{
          position: 'fixed',
          top: spotlightRect.y,
          left: spotlightRect.x,
          width: spotlightRect.width,
          height: spotlightRect.height,
          borderRadius: 12,
          border: `2px solid ${primary}`,
          boxShadow: `0 0 0 2px ${primaryLight}, 0 0 20px rgba(0,126,122,0.2)`,
          zIndex: 10001,
          pointerEvents: 'none',
          transition: 'all 200ms ease',
        }} />
      )}

      {/* Tooltip */}
      <div ref={tooltipRef} style={tooltipStyle} role="dialog" aria-label={step.title}>
        {/* Arrow */}
        {!isCenter && tooltipPos && (
          <div style={getArrowStyle(tooltipPos.arrowSide, isDark)} />
        )}

        {/* Header */}
        <div style={{
          padding: '18px 20px 12px',
          borderBottom: `1px solid ${border}`,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ fontSize: 18 }}>🎓</span>
            <h3 style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 700,
              color: primary,
              lineHeight: 1.3,
            }}>
              {step.title}
            </h3>
          </div>
        </div>

        {/* Body */}
        <div style={{
          padding: '14px 20px 16px',
          fontSize: 13,
          lineHeight: 1.6,
          color: txt,
        }}>
          {step.content}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px 16px',
          borderTop: `1px solid ${border}`,
        }}>
          {/* Progress */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 12,
          }}>
            <span style={{ fontSize: 11, color: txt2, whiteSpace: 'nowrap' }}>
              Passo {currentStep + 1} de {steps.length}
            </span>
            <div style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: isDark ? '#333' : '#e8e8e8',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                borderRadius: 2,
                background: `linear-gradient(90deg, ${primary}, #69be28)`,
                transition: 'width 300ms ease',
              }} />
            </div>
          </div>

          {/* Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}>
            <button
              onClick={goPrev}
              disabled={currentStep === 0}
              style={{
                ...btnBase,
                background: 'transparent',
                color: currentStep === 0 ? (isDark ? '#555' : '#ccc') : txt,
                border: `1px solid ${currentStep === 0 ? (isDark ? '#333' : '#ddd') : border}`,
                cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                opacity: currentStep === 0 ? 0.5 : 1,
              }}
            >
              ← Anterior
            </button>

            <button
              onClick={onSkip}
              style={{
                ...btnBase,
                background: 'transparent',
                color: txt2,
                border: 'none',
                fontSize: 12,
                fontWeight: 500,
                padding: '8px 12px',
              }}
            >
              Pular Tour ✕
            </button>

            <button
              onClick={goNext}
              style={{
                ...btnBase,
                background: primary,
                color: '#fff',
              }}
            >
              {currentStep >= steps.length - 1 ? 'Concluir ✓' : 'Proximo →'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default GuidedTour;
