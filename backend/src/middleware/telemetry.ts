// ============================================================================
// EFVM360 Backend — Telemetry Middleware
// Tracks request duration, status codes, and endpoint hit counts
// Rolling window of last 1000 requests
// ============================================================================

import { Request, Response, NextFunction } from 'express';

// ── Types ──────────────────────────────────────────────────────────────

export interface RequestRecord {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  timestamp: string;
}

export interface RequestMetrics {
  totalRequests: number;
  windowSize: number;
  requests: RequestRecord[];
  statusBreakdown: Record<string, number>;
  endpointHits: Record<string, number>;
  avgDurationMs: number;
  p95DurationMs: number;
}

// ── Rolling Window ─────────────────────────────────────────────────────

const MAX_WINDOW = 1000;
const requestWindow: RequestRecord[] = [];

// ── Middleware ──────────────────────────────────────────────────────────

export const telemetryMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime.bigint();

  // Hook into response finish to capture status code + duration
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;

    const record: RequestRecord = {
      method: req.method,
      path: req.route?.path || req.path,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      timestamp: new Date().toISOString(),
    };

    requestWindow.push(record);

    // Trim to rolling window size
    if (requestWindow.length > MAX_WINDOW) {
      requestWindow.splice(0, requestWindow.length - MAX_WINDOW);
    }
  });

  next();
};

// ── Metrics Accessor ───────────────────────────────────────────────────

export function getRequestMetrics(): RequestMetrics {
  const requests = [...requestWindow];
  const total = requests.length;

  // Status breakdown
  const statusBreakdown: Record<string, number> = {};
  for (const r of requests) {
    const group = `${Math.floor(r.statusCode / 100)}xx`;
    statusBreakdown[group] = (statusBreakdown[group] || 0) + 1;
  }

  // Endpoint hits
  const endpointHits: Record<string, number> = {};
  for (const r of requests) {
    const key = `${r.method} ${r.path}`;
    endpointHits[key] = (endpointHits[key] || 0) + 1;
  }

  // Duration stats
  const durations = requests.map(r => r.durationMs).sort((a, b) => a - b);
  const avgDurationMs =
    total > 0
      ? Math.round((durations.reduce((sum, d) => sum + d, 0) / total) * 100) / 100
      : 0;
  const p95DurationMs =
    total > 0
      ? durations[Math.floor(total * 0.95)] || durations[total - 1]
      : 0;

  return {
    totalRequests: total,
    windowSize: MAX_WINDOW,
    requests,
    statusBreakdown,
    endpointHits,
    avgDurationMs,
    p95DurationMs,
  };
}
