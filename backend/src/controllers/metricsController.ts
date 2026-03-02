// ============================================================================
// VFZ Backend — Metrics Controller
// Exposes business metrics and request telemetry via REST endpoints
// ============================================================================

import { Request, Response } from 'express';
import { metrics } from '../services/metricsService';
import { getRequestMetrics } from '../middleware/telemetry';

/**
 * GET /metrics/resumo
 * Returns business metrics summary.
 * Requires: authenticate + authorize('inspetor')
 */
export const resumo = (_req: Request, res: Response): void => {
  const resumo = metrics.obterResumo();
  res.json(resumo);
};

/**
 * GET /metrics/requests
 * Returns request telemetry (rolling window).
 * Requires: authenticate + authorize('administrador')
 */
export const requests = (_req: Request, res: Response): void => {
  const metricsData = getRequestMetrics();
  res.json(metricsData);
};
