// ============================================================================
// EFVM360 Backend — Site Context Middleware (Multi-Site Support)
// Resolves active site from header/JWT and injects into req.siteId
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import sequelize from '../config/database';

declare global {
  namespace Express {
    interface Request {
      siteId?: string;
      userSites?: string[];
    }
  }
}

/**
 * Resolves the site context for the current request.
 * Priority: X-Site-Id header > user's default site > 'TUB' fallback
 */
export const siteContext = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const headerSiteId = req.headers['x-site-id'] as string | undefined;

    // Load user's assigned sites if authenticated
    let userSites: string[] = [];
    let defaultSite = 'TUB';

    if (req.user) {
      try {
        const [rows] = await sequelize.query(
          `SELECT site_code, is_default FROM user_sites WHERE user_id = ? ORDER BY is_default DESC`,
          { replacements: [req.user.userId] }
        ) as [Array<{ site_code: string; is_default: boolean }>, unknown];

        userSites = rows.map(r => r.site_code);
        const defaultRow = rows.find(r => r.is_default);
        if (defaultRow) defaultSite = defaultRow.site_code;
      } catch {
        // Table may not exist yet; fall through to default
      }
    }

    const siteId = headerSiteId || defaultSite;

    // If user has site assignments, verify access (admins bypass)
    if (userSites.length > 0 && !userSites.includes(siteId)) {
      const isAdmin = req.user?.funcao === 'administrador' || req.user?.funcao === 'suporte';
      if (!isAdmin) {
        res.status(403).json({
          error: 'Acesso negado para este site',
          code: 'SITE_ACCESS_DENIED',
        });
        return;
      }
    }

    req.siteId = siteId;
    req.userSites = userSites.length > 0 ? userSites : [siteId];
    next();
  } catch {
    // If site resolution fails, use fallback
    req.siteId = 'TUB';
    req.userSites = ['TUB'];
    next();
  }
};

/**
 * Lightweight version — just reads header, no DB lookup.
 * Use for public/non-critical endpoints.
 */
export const siteContextLite = (req: Request, _res: Response, next: NextFunction): void => {
  req.siteId = (req.headers['x-site-id'] as string) || 'TUB';
  next();
};
