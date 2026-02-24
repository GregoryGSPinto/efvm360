// ============================================================================
// EFVM360 v3.2 — Accessibility Utilities
// WCAG 2.1 AA compliance helpers
// ============================================================================

import { useEffect, useRef, useCallback } from 'react';

// ── Focus Trap (for modals) ────────────────────────────────────────────

export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusable = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    first.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return containerRef;
}

// ── Escape Key Handler ─────────────────────────────────────────────────

export function useEscapeKey(callback: () => void, isActive: boolean) {
  useEffect(() => {
    if (!isActive) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') callback();
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [callback, isActive]);
}

// ── Live Region Announcer ──────────────────────────────────────────────

export function useAnnouncer() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const el = document.getElementById(`sr-announcer-${priority}`);
    if (el) {
      el.textContent = '';
      requestAnimationFrame(() => {
        el.textContent = message;
      });
    }
  }, []);

  return { announce };
}

// ── Skip to Content ────────────────────────────────────────────────────

export function SkipToContent({ targetId = 'main-content' }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      style={{
        position: 'absolute',
        left: '-10000px',
        top: 'auto',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
      onFocus={(e) => {
        const target = e.currentTarget;
        target.style.position = 'fixed';
        target.style.left = '16px';
        target.style.top = '16px';
        target.style.width = 'auto';
        target.style.height = 'auto';
        target.style.overflow = 'visible';
        target.style.zIndex = '99999';
        target.style.padding = '12px 24px';
        target.style.background = '#00843D';
        target.style.color = '#FFFFFF';
        target.style.borderRadius = '8px';
        target.style.fontWeight = '600';
        target.style.fontSize = '14px';
        target.style.textDecoration = 'none';
      }}
      onBlur={(e) => {
        const target = e.currentTarget;
        target.style.position = 'absolute';
        target.style.left = '-10000px';
        target.style.width = '1px';
        target.style.height = '1px';
      }}
    >
      Pular para o conteúdo principal
    </a>
  );
}

// ── SR-only Announcer Regions ──────────────────────────────────────────

export function LiveRegions() {
  return (
    <>
      <div id="sr-announcer-polite" aria-live="polite" aria-atomic="true"
        style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }} />
      <div id="sr-announcer-assertive" aria-live="assertive" aria-atomic="true"
        style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }} />
    </>
  );
}

// ── ARIA Helpers ───────────────────────────────────────────────────────

export const ariaProps = {
  expandable: (expanded: boolean, controls: string) => ({
    'aria-expanded': expanded,
    'aria-controls': controls,
  }),
  required: (required: boolean) => ({
    'aria-required': required,
  }),
  invalid: (invalid: boolean, errorId?: string) => ({
    'aria-invalid': invalid,
    ...(errorId && invalid ? { 'aria-describedby': errorId } : {}),
  }),
  modal: (label: string) => ({
    role: 'dialog' as const,
    'aria-modal': true,
    'aria-label': label,
  }),
};
