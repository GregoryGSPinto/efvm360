// ============================================================================
// EFVM360 Backend — Organizational Scope Middleware
// Resolves the yards a user has access to based on hierarchy level
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import * as orgService from '../services/orgService';

/**
 * Middleware that resolves organizational scope for the current user.
 * Sets req.orgScope.yards with the list of yard codes the user can access.
 */
export const resolveOrganizationalScope = async (
  req: Request, res: Response, next: NextFunction,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado', code: 'AUTH_REQUIRED' });
    return;
  }

  try {
    const yards = await orgService.resolveScope(req.user.matricula, req.user.funcao);
    req.orgScope = {
      yards,
      level: req.user.funcao,
    };
    next();
  } catch (error) {
    // Fallback to primary yard on error
    req.orgScope = {
      yards: req.user.primaryYard ? [req.user.primaryYard] : [],
      level: req.user.funcao,
    };
    next();
  }
};
