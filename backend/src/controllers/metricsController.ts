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
  try {
    const resumo = metrics.obterResumo();
    res.json(resumo);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao obter métricas' });
  }
};

/**
 * GET /metrics/requests
 * Returns request telemetry (rolling window).
 * Requires: authenticate + authorize('administrador')
 */
export const requests = (_req: Request, res: Response): void => {
  try {
    const metricsData = getRequestMetrics();
    res.json(metricsData);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao obter telemetria' });
  }
};
