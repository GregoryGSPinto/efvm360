// ============================================================================
// EFVM360 Backend — Servidor Express
// MySQL + JWT + Azure-Ready
// ============================================================================

import dotenv from 'dotenv';
dotenv.config();

// Azure Application Insights (inicializar ANTES de tudo)
if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const appInsights = require('applicationinsights');
  appInsights.setup().setSendLiveMetrics(true).start();
  console.info('[EFVM360] Azure Application Insights ativo');
}

import express from 'express';
import { createServer } from 'http';
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
import { testConnection } from './config/database';
import { initScheduler } from './jobs/scheduler';
import { setupSwagger } from './config/swagger';
import { telemetryMiddleware } from './middleware/telemetry';
import { initializeWebSocket, getConnectionMetrics } from './services/websocket';

const app = express();
const httpServer = createServer(app);
const PORT = parseInt(process.env.PORT || '3001', 10);
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

// ── MIDDLEWARE GLOBAL ────────────────────────────────────────────────────

// 1. Security headers (Helmet)
app.use(securityHeaders);

// 2. CORS
app.use(corsConfig);

// 3. Rate limiting global
app.use(globalRateLimit);

// 4. Request ID (rastreabilidade)
app.use(requestId);

// 5. Compression (gzip)
app.use(compression());

// 6. Body parsing
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// 7. Sanitização de body
app.use(sanitizeBody);

// 8. Logging (Morgan)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// 9. Telemetry (request metrics)
app.use(telemetryMiddleware);

// ── ROTAS ────────────────────────────────────────────────────────────────

app.use(API_PREFIX, routes);

// ── SWAGGER / OPENAPI DOCS ──────────────────────────────────────────────
setupSwagger(app);

// ── ROTA ROOT (informacoes da API) ──────────────────────────────────────

app.get('/', (_req, res) => {
  res.json({
    service: 'EFVM360 — Gestão de Troca de Turno Ferroviária API',
    version: '1.0.0',
    documentation: `${API_PREFIX}/docs`,
    health: `${API_PREFIX}/health`,
    endpoints: {
      auth: {
        login: `POST ${API_PREFIX}/auth/login`,
        refresh: `POST ${API_PREFIX}/auth/refresh`,
        logout: `POST ${API_PREFIX}/auth/logout`,
        me: `GET ${API_PREFIX}/auth/me`,
        alterarSenha: `POST ${API_PREFIX}/auth/alterar-senha`,
      },
      passagens: {
        listar: `GET ${API_PREFIX}/passagens`,
        obter: `GET ${API_PREFIX}/passagens/:uuid`,
        salvar: `POST ${API_PREFIX}/passagens`,
        assinar: `POST ${API_PREFIX}/passagens/:uuid/assinar`,
      },
      audit: {
        listar: `GET ${API_PREFIX}/audit`,
        integridade: `GET ${API_PREFIX}/audit/integridade`,
        sincronizar: `POST ${API_PREFIX}/audit/sync`,
      },
      usuarios: {
        listar: `GET ${API_PREFIX}/usuarios`,
        criar: `POST ${API_PREFIX}/usuarios`,
        atualizar: `PATCH ${API_PREFIX}/usuarios/:uuid`,
      },
    },
  });
});

// ── ERROR HANDLER GLOBAL ─────────────────────────────────────────────────

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

// ── STARTUP ──────────────────────────────────────────────────────────────

const startServer = async (): Promise<void> => {
  try {
    // Testa conexão com MySQL
    await testConnection();

    // Inicializa jobs agendados (após conexão com DB)
    initScheduler();

    // Inicializa WebSocket (Socket.IO)
    const io = initializeWebSocket(httpServer);

    // Inicia servidor HTTP (Express + WebSocket compartilham a mesma porta)
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.info('');
      console.info('══════════════════════════════════════════════════════════');
      console.info('  EFVM360 Backend — Gestão de Troca de Turno Ferroviária');
      console.info('══════════════════════════════════════════════════════════');
      console.info(`  🚀 Servidor:    http://localhost:${PORT}`);
      console.info(`  📡 API:         http://localhost:${PORT}${API_PREFIX}`);
      console.info(`  🔌 WebSocket:   ws://localhost:${PORT}`);
      console.info(`  💊 Health:      http://localhost:${PORT}${API_PREFIX}/health`);
      console.info(`  🔐 Ambiente:    ${process.env.NODE_ENV || 'development'}`);
      console.info(`  🗄️  MySQL:      ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '3306'}`);
      console.info('══════════════════════════════════════════════════════════');
      console.info('');
    });
  } catch (error) {
    console.error('[EFVM360] Falha na inicialização:', error);
    process.exit(1);
  }
};

startServer();

export default app;
