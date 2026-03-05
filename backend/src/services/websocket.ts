// ============================================================================
// VFZ Backend — WebSocket Service (Socket.IO)
// Real-time dashboard updates with JWT authentication & room-based routing
// ============================================================================

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import type { JWTPayload } from '../middleware/auth';

// ── WebSocket Event Constants ────────────────────────────────────────────

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

// ── Socket Data Extension ────────────────────────────────────────────────

interface SocketData {
  user: JWTPayload;
}

// ── Connection Metrics ───────────────────────────────────────────────────

interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  connectionsByYard: Record<string, number>;
  connectionsByRole: Record<string, number>;
}

// ── Singleton IO Reference ───────────────────────────────────────────────

let ioInstance: SocketIOServer | null = null;

/**
 * Returns the active Socket.IO server instance.
 * Used by controllers/services to emit events after mutations.
 */
export function getIO(): SocketIOServer | null {
  return ioInstance;
}

// ── JWT Verification for WebSocket ───────────────────────────────────────

function verifyWSToken(token: string): JWTPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');

  const decoded = jwt.verify(token, secret) as JWTPayload;
  if (decoded.type !== 'access') {
    throw new Error('Invalid token type for WebSocket');
  }
  return decoded;
}

// ── Initialize WebSocket Server ──────────────────────────────────────────

export function initializeWebSocket(httpServer: Server): SocketIOServer {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : [];

  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4173',
    frontendUrl,
    ...corsOrigins,
  ];

  const io = new SocketIOServer<Record<string, never>, Record<string, never>, Record<string, never>, SocketData>(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 60000,
    transports: ['websocket', 'polling'],
  });

  // ── Auth Middleware ─────────────────────────────────────────────────────

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const user = verifyWSToken(token);
      (socket as Socket & { data: SocketData }).data = { user };
      next();
    } catch (err) {
      const message = err instanceof jwt.TokenExpiredError
        ? 'Token expired'
        : 'Authentication failed';
      next(new Error(message));
    }
  });

  // ── Connection Handler ─────────────────────────────────────────────────

  io.on('connection', (socket: Socket) => {
    const user = (socket as Socket & { data: SocketData }).data.user;
    const yard = user.primaryYard || 'tubarao';

    console.log(`[WS] Connected: ${user.matricula} (${user.funcao}) — yard: ${yard}`);

    // Join patio-based room
    socket.join(`patio:${yard}`);

    // Join role-based room
    socket.join(`role:${user.funcao}`);

    // Join personal room (for targeted notifications)
    socket.join(`user:${user.uuid}`);

    // ── Client-side room subscription ────────────────────────────────

    socket.on('yard:subscribe', (yardId: string) => {
      if (typeof yardId === 'string' && yardId.length <= 20) {
        socket.join(`patio:${yardId}`);
        console.log(`[WS] ${user.matricula} subscribed to patio:${yardId}`);
      }
    });

    socket.on('yard:unsubscribe', (yardId: string) => {
      if (typeof yardId === 'string') {
        socket.leave(`patio:${yardId}`);
      }
    });

    // ── Disconnect ───────────────────────────────────────────────────

    socket.on('disconnect', (reason) => {
      console.log(`[WS] Disconnected: ${user.matricula} — reason: ${reason}`);
    });
  });

  ioInstance = io;
  return io;
}

// ── Emit Helpers (used by controllers/services) ──────────────────────────

/**
 * Emit a yard status update to all clients subscribed to a specific yard.
 */
export function emitYardUpdate(yardId: string, data: Record<string, unknown>): void {
  if (!ioInstance) return;
  ioInstance.to(`patio:${yardId}`).emit(WS_EVENTS.YARD_STATUS_UPDATE, {
    yardId,
    timestamp: new Date().toISOString(),
    ...data,
  });
}

/**
 * Emit a line status change.
 */
export function emitLineChange(yardId: string, lineId: string, status: string): void {
  if (!ioInstance) return;
  ioInstance.to(`patio:${yardId}`).emit(WS_EVENTS.LINE_STATUS_CHANGE, {
    yardId,
    lineId,
    status,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit an AMV position change.
 */
export function emitAMVChange(yardId: string, amvId: string, position: 'normal' | 'reversa'): void {
  if (!ioInstance) return;
  ioInstance.to(`patio:${yardId}`).emit(WS_EVENTS.AMV_POSITION_CHANGE, {
    yardId,
    amvId,
    position,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit a new handover event.
 */
export function emitNewHandover(yardId: string, handover: Record<string, unknown>): void {
  if (!ioInstance) return;
  ioInstance.to(`patio:${yardId}`).emit(WS_EVENTS.NEW_HANDOVER, {
    yardId,
    handover,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit a handover signed event.
 */
export function emitHandoverSigned(yardId: string, handoverId: string): void {
  if (!ioInstance) return;
  ioInstance.to(`patio:${yardId}`).emit(WS_EVENTS.HANDOVER_SIGNED, {
    yardId,
    handoverId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit an equipment alert to a specific role group.
 */
export function emitEquipmentAlert(yardId: string, alert: Record<string, unknown>): void {
  if (!ioInstance) return;
  // Broadcast to yard AND supervisors
  ioInstance.to(`patio:${yardId}`).emit(WS_EVENTS.EQUIPMENT_ALERT, {
    yardId,
    ...alert,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit a risk alert (broadcast to supervisors and above).
 */
export function emitRiskAlert(yardId: string, alert: Record<string, unknown>): void {
  if (!ioInstance) return;
  ioInstance.to(`patio:${yardId}`).emit(WS_EVENTS.RISK_ALERT, {
    yardId,
    ...alert,
    timestamp: new Date().toISOString(),
  });
  // Also notify supervisors across all yards
  ioInstance.to('role:supervisor').to('role:gestor').to('role:coordenador').to('role:gerente').to('role:administrador')
    .emit(WS_EVENTS.RISK_ALERT, { yardId, ...alert, timestamp: new Date().toISOString() });
}

/**
 * Get current connection metrics.
 */
export function getConnectionMetrics(): ConnectionMetrics {
  if (!ioInstance) {
    return { totalConnections: 0, activeConnections: 0, connectionsByYard: {}, connectionsByRole: {} };
  }

  const sockets = ioInstance.sockets.sockets;
  const metrics: ConnectionMetrics = {
    totalConnections: sockets.size,
    activeConnections: sockets.size,
    connectionsByYard: {},
    connectionsByRole: {},
  };

  for (const [, socket] of sockets) {
    const user = (socket as Socket & { data: SocketData }).data?.user;
    if (user) {
      const yard = user.primaryYard || 'unknown';
      metrics.connectionsByYard[yard] = (metrics.connectionsByYard[yard] || 0) + 1;
      metrics.connectionsByRole[user.funcao] = (metrics.connectionsByRole[user.funcao] || 0) + 1;
    }
  }

  return metrics;
}
