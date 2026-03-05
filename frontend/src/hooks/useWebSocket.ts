// ============================================================================
// EFVM360 — WebSocket Hook (Socket.IO Client)
// Real-time connection with JWT auth, auto-reconnect, and room management
// ============================================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '../api/client';

// ── WebSocket Event Constants (mirror backend) ──────────────────────────

export const WS_EVENTS = {
  YARD_STATUS_UPDATE: 'yard:status:update',
  LINE_STATUS_CHANGE: 'yard:line:change',
  AMV_POSITION_CHANGE: 'yard:amv:change',
  NEW_HANDOVER: 'handover:new',
  HANDOVER_SIGNED: 'handover:signed',
  EQUIPMENT_ALERT: 'equipment:alert',
  RISK_ALERT: 'risk:alert',
  SYNC_COMPLETE: 'sync:complete',
} as const;

export type WSEventName = typeof WS_EVENTS[keyof typeof WS_EVENTS];

// ── Connection State ─────────────────────────────────────────────────────

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface UseWebSocketReturn {
  socket: Socket | null;
  connected: boolean;
  connectionState: ConnectionState;
  reconnectAttempt: number;
  subscribe: (yardId: string) => void;
  unsubscribe: (yardId: string) => void;
  on: <T = unknown>(event: string, handler: (data: T) => void) => () => void;
}

// ── Configuration ────────────────────────────────────────────────────────

const WS_URL = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL?.replace('/api/v1', '') || '';
const BACKEND_AVAILABLE = !!import.meta.env.VITE_API_URL;

// ── Hook ─────────────────────────────────────────────────────────────────

export function useWebSocket(): UseWebSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const handlersRef = useRef<Map<string, Set<(data: unknown) => void>>>(new Map());

  useEffect(() => {
    // Skip WebSocket in offline mode
    if (!BACKEND_AVAILABLE) return;

    const token = getAccessToken();
    if (!token) return;

    setConnectionState('connecting');

    const socket = io(WS_URL, {
      auth: { token },
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setConnected(true);
      setConnectionState('connected');
      setReconnectAttempt(0);
    });

    socket.on('disconnect', () => {
      setConnected(false);
      setConnectionState('disconnected');
    });

    socket.on('connect_error', (err) => {
      setConnectionState('error');
      if (import.meta.env?.DEV) console.warn('[WS] Connection error:', err.message);
    });

    socket.io.on('reconnect_attempt', (attempt) => {
      setReconnectAttempt(attempt);
      setConnectionState('connecting');
    });

    socket.io.on('reconnect', () => {
      setReconnectAttempt(0);
    });

    // Re-attach handlers from ref on reconnect
    socket.on('connect', () => {
      for (const [event, handlers] of handlersRef.current) {
        for (const handler of handlers) {
          socket.off(event, handler as (...args: unknown[]) => void);
          socket.on(event, handler as (...args: unknown[]) => void);
        }
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
      setConnectionState('disconnected');
    };
  }, []);

  const subscribe = useCallback((yardId: string) => {
    socketRef.current?.emit('yard:subscribe', yardId);
  }, []);

  const unsubscribe = useCallback((yardId: string) => {
    socketRef.current?.emit('yard:unsubscribe', yardId);
  }, []);

  const on = useCallback(<T = unknown>(event: string, handler: (data: T) => void): (() => void) => {
    const wrappedHandler = handler as (data: unknown) => void;

    // Track handler in ref
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set());
    }
    handlersRef.current.get(event)!.add(wrappedHandler);

    // Attach to current socket if available
    socketRef.current?.on(event, wrappedHandler as (...args: unknown[]) => void);

    // Return cleanup function
    return () => {
      handlersRef.current.get(event)?.delete(wrappedHandler);
      socketRef.current?.off(event, wrappedHandler as (...args: unknown[]) => void);
    };
  }, []);

  return {
    socket: socketRef.current,
    connected,
    connectionState,
    reconnectAttempt,
    subscribe,
    unsubscribe,
    on,
  };
}
