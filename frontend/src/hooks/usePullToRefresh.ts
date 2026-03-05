// ============================================================================
// EFVM360 — usePullToRefresh (touch-based pull-to-refresh for mobile PWA)
// Works on touch devices; no-op on desktop. Native-like UX.
// ============================================================================

import { useRef, useCallback, useEffect, useState } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  /** Minimum pull distance in px to trigger refresh (default: 80) */
  threshold?: number;
  /** Max visual pull distance in px (default: 120) */
  maxPull?: number;
  /** Disable the hook (default: false) */
  disabled?: boolean;
}

interface UsePullToRefreshReturn {
  /** Ref to attach to the scrollable container */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Whether refresh is in progress */
  isRefreshing: boolean;
  /** Current pull distance (0 when not pulling) */
  pullDistance: number;
  /** Props to spread on the container div */
  pullIndicatorStyle: React.CSSProperties;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
  disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startY = useRef(0);
  const pulling = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) return;

    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling.current || disabled || isRefreshing) return;

    const deltaY = e.touches[0].clientY - startY.current;
    if (deltaY <= 0) {
      setPullDistance(0);
      return;
    }

    // Rubber-band effect: diminishing returns past threshold
    const dampened = deltaY > threshold
      ? threshold + (deltaY - threshold) * 0.3
      : deltaY;

    setPullDistance(Math.min(dampened, maxPull));

    // Prevent page scroll while pulling
    if (deltaY > 10) {
      e.preventDefault();
    }
  }, [disabled, isRefreshing, threshold, maxPull]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold * 0.5); // Hold at half threshold during refresh
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || disabled) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, disabled]);

  const pullIndicatorStyle: React.CSSProperties = {
    transform: `translateY(${pullDistance}px)`,
    transition: pulling.current ? 'none' : 'transform 0.3s ease-out',
  };

  return {
    containerRef,
    isRefreshing,
    pullDistance,
    pullIndicatorStyle,
  };
}

export default usePullToRefresh;
