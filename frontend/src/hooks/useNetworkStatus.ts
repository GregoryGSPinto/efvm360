// ============================================================================
// EFVM360 — useNetworkStatus (Capacitor Network + browser fallback)
// Provides native-like network detection on Android/iOS via @capacitor/network
// Falls back to navigator.onLine + window events on web
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ───────────────────────────────────────────────────────────────────

export type ConnectionType = 'wifi' | 'cellular' | 'none' | 'unknown';

export interface NetworkState {
  connected: boolean;
  connectionType: ConnectionType;
  /** Timestamp of last status change */
  since: Date;
}

export interface UseNetworkStatusReturn extends NetworkState {
  /** True when connection was just restored (stays true for TOAST_DURATION_MS) */
  justReconnected: boolean;
  /** True when connection was just lost (stays true for TOAST_DURATION_MS) */
  justDisconnected: boolean;
}

// ── Constants ───────────────────────────────────────────────────────────────

const TOAST_DURATION_MS = 4000;

// ── Capacitor detection ─────────────────────────────────────────────────────

function isCapacitorNative(): boolean {
  return typeof window !== 'undefined' &&
    window.Capacitor !== undefined &&
    window.Capacitor.isNativePlatform?.() === true;
}

// Extend Window for Capacitor global
declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
    };
  }
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useNetworkStatus(): UseNetworkStatusReturn {
  const [state, setState] = useState<NetworkState>({
    connected: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connectionType: 'unknown',
    since: new Date(),
  });

  const [justReconnected, setJustReconnected] = useState(false);
  const [justDisconnected, setJustDisconnected] = useState(false);

  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevConnected = useRef(state.connected);

  // Flash a transient flag for TOAST_DURATION_MS
  const flashReconnected = useCallback(() => {
    setJustReconnected(true);
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    reconnectTimer.current = setTimeout(() => setJustReconnected(false), TOAST_DURATION_MS);
  }, []);

  const flashDisconnected = useCallback(() => {
    setJustDisconnected(true);
    if (disconnectTimer.current) clearTimeout(disconnectTimer.current);
    disconnectTimer.current = setTimeout(() => setJustDisconnected(false), TOAST_DURATION_MS);
  }, []);

  // Handle any status change (from Capacitor or browser)
  const handleChange = useCallback((connected: boolean, connectionType: ConnectionType) => {
    setState({ connected, connectionType, since: new Date() });

    if (connected && !prevConnected.current) {
      flashReconnected();
    } else if (!connected && prevConnected.current) {
      flashDisconnected();
    }
    prevConnected.current = connected;
  }, [flashReconnected, flashDisconnected]);

  useEffect(() => {
    let cleanupCapacitor: (() => void) | null = null;

    if (isCapacitorNative()) {
      // ── Capacitor native path ──
      import('@capacitor/network').then(({ Network }) => {
        // Get initial status
        Network.getStatus().then((status) => {
          const type = mapCapacitorType(status.connectionType);
          handleChange(status.connected, type);
        });

        // Listen for changes
        const listenerHandle = Network.addListener('networkStatusChange', (status) => {
          const type = mapCapacitorType(status.connectionType);
          handleChange(status.connected, type);
        });

        cleanupCapacitor = () => {
          listenerHandle.then(h => h.remove());
        };
      });
    } else {
      // ── Browser fallback ──
      const onOnline = () => handleChange(true, 'unknown');
      const onOffline = () => handleChange(false, 'none');

      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);

      // Try to detect connection type from Network Information API
      const nav = navigator as Navigator & { connection?: { type?: string } };
      if (nav.connection?.type) {
        const mapped = mapBrowserConnectionType(nav.connection.type);
        handleChange(navigator.onLine, mapped);
      }

      cleanupCapacitor = () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      };
    }

    return () => {
      cleanupCapacitor?.();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (disconnectTimer.current) clearTimeout(disconnectTimer.current);
    };
  }, [handleChange]);

  return {
    ...state,
    justReconnected,
    justDisconnected,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function mapCapacitorType(type: string): ConnectionType {
  switch (type) {
    case 'wifi': return 'wifi';
    case 'cellular': return 'cellular';
    case 'none': return 'none';
    default: return 'unknown';
  }
}

function mapBrowserConnectionType(type: string): ConnectionType {
  if (type === 'wifi') return 'wifi';
  if (type === 'cellular') return 'cellular';
  if (type === 'none') return 'none';
  return 'unknown';
}

export default useNetworkStatus;
