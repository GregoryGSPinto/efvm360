// ============================================================================
// EFVM360 — WebSocket Context Provider
// App-wide real-time connection state and event bus
// ============================================================================

import { createContext, useContext, useEffect, useCallback, useState, useRef, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '../api/client';
import { WS_EVENTS, type WSEventName, type ConnectionState } from '../hooks/useWebSocket';

// ── Context Interface ────────────────────────────────────────────────────

interface WebSocketContextValue {
  connected: boolean;
  connectionState: ConnectionState;
  reconnectAttempt: number;
  subscribe: (yardId: string) => void;
  unsubscribe: (yardId: string) => void;
  on: <T = unknown>(event: string, handler: (data: T) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextValue>({
  connected: false,
  connectionState: 'disconnected',
  reconnectAttempt: 0,
  subscribe: () => {},
  unsubscribe: () => {},
  on: () => () => {},
});

// ── Configuration ────────────────────────────────────────────────────────

const WS_URL = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL?.replace('/api/v1', '') || '';
const BACKEND_AVAILABLE = !!import.meta.env.VITE_API_URL;

// ── Provider ─────────────────────────────────────────────────────────────

interface WebSocketProviderProps {
  children: ReactNode;
  enabled?: boolean;
}

export function WebSocketProvider({ children, enabled = true }: WebSocketProviderProps) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const handlersRef = useRef<Map<string, Set<(data: unknown) => void>>>(new Map());

  useEffect(() => {
    if (!BACKEND_AVAILABLE || !enabled) return;

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

    socket.on('connect_error', () => {
      setConnectionState('error');
    });

    socket.io.on('reconnect_attempt', (attempt) => {
      setReconnectAttempt(attempt);
      setConnectionState('connecting');
    });

    socket.io.on('reconnect', () => {
      setReconnectAttempt(0);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
      setConnectionState('disconnected');
    };
  }, [enabled]);

  const subscribe = useCallback((yardId: string) => {
    socketRef.current?.emit('yard:subscribe', yardId);
  }, []);

  const unsubscribe = useCallback((yardId: string) => {
    socketRef.current?.emit('yard:unsubscribe', yardId);
  }, []);

  const on = useCallback(<T = unknown>(event: string, handler: (data: T) => void): (() => void) => {
    const wrappedHandler = handler as (data: unknown) => void;

    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set());
    }
    handlersRef.current.get(event)!.add(wrappedHandler);

    socketRef.current?.on(event, wrappedHandler as (...args: unknown[]) => void);

    return () => {
      handlersRef.current.get(event)?.delete(wrappedHandler);
      socketRef.current?.off(event, wrappedHandler as (...args: unknown[]) => void);
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ connected, connectionState, reconnectAttempt, subscribe, unsubscribe, on }}>
      {children}
    </WebSocketContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components -- context hook is intentionally colocated with its provider
export function useWebSocketContext(): WebSocketContextValue {
  return useContext(WebSocketContext);
}

export { WS_EVENTS, type WSEventName };
