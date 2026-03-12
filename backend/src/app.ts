import express from 'express';
import compression from 'compression';
import morgan from 'morgan';
import {
  corsConfig,
  securityHeaders,
  globalRateLimit,
  requestId,
  sanitizeBody,
} from './middleware/security';
import routes from './routes';
import { setupSwagger } from './config/swagger';
import { telemetryMiddleware } from './middleware/telemetry';

export const DEFAULT_API_PREFIX = process.env.API_PREFIX || '/api/v1';

export const createApp = (apiPrefix = DEFAULT_API_PREFIX): express.Express => {
  const app = express();

  app.use(securityHeaders);
  app.use(corsConfig);
  app.use(globalRateLimit);
  app.use(requestId);
  app.use(compression());
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));
  app.use(sanitizeBody);

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  app.use(telemetryMiddleware);
  app.use(apiPrefix, routes);

  setupSwagger(app);

  app.get('/', (_req, res) => {
    res.json({
      service: 'EFVM360 — Gestão de Troca de Turno Ferroviária API',
      version: '1.0.0',
      documentation: `${apiPrefix}/docs`,
      health: `${apiPrefix}/health`,
      endpoints: {
        auth: {
          login: `POST ${apiPrefix}/auth/login`,
          refresh: `POST ${apiPrefix}/auth/refresh`,
          logout: `POST ${apiPrefix}/auth/logout`,
          me: `GET ${apiPrefix}/auth/me`,
          alterarSenha: `POST ${apiPrefix}/auth/alterar-senha`,
        },
        passagens: {
          listar: `GET ${apiPrefix}/passagens`,
          obter: `GET ${apiPrefix}/passagens/:uuid`,
          salvar: `POST ${apiPrefix}/passagens`,
          assinar: `POST ${apiPrefix}/passagens/:uuid/assinar`,
        },
        audit: {
          listar: `GET ${apiPrefix}/audit`,
          integridade: `GET ${apiPrefix}/audit/integridade`,
          sincronizar: `POST ${apiPrefix}/audit/sync`,
        },
        usuarios: {
          listar: `GET ${apiPrefix}/usuarios`,
          criar: `POST ${apiPrefix}/usuarios`,
          atualizar: `PATCH ${apiPrefix}/usuarios/:uuid`,
        },
      },
    });
  });

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[EFVM360-ERROR]', err.message);

    if (err.message.includes('CORS')) {
      res.status(403).json({ error: 'Origem não permitida pelo CORS', code: 'CORS_ERROR' });
      return;
    }

    res.status(500).json({
      error: process.env.NODE_ENV === 'production'
        ? 'Erro interno do servidor'
        : err.message,
      code: 'INTERNAL_ERROR',
    });
  });

  return app;
};
