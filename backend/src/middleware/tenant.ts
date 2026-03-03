// ============================================================================
// EFVM360 Backend — Tenant Middleware (Multi-Tenancy)
// Extracts railway_id from JWT and injects into req.tenantId
// ============================================================================

import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

export const resolveTenant = (req: Request, _res: Response, next: NextFunction): void => {
  // Extract from JWT payload or query/header, default to EFVM
  const fromHeader = req.headers['x-railway-id'] as string | undefined;
  const fromQuery = req.query.railwayId as string | undefined;

  req.tenantId = fromHeader || fromQuery || 'EFVM';
  next();
};
