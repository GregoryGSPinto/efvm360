// ============================================================================
// EFVM360 Backend — Servidor Express
// MySQL + JWT + Azure-Ready
// ============================================================================

import dotenv from 'dotenv';
import { createServer } from 'http';
import { createApp, DEFAULT_API_PREFIX } from './app';
import { testConnection } from './config/database';
import { initScheduler } from './jobs/scheduler';
import { initializeWebSocket } from './services/websocket';

dotenv.config();

const app = createApp();
const httpServer = createServer(app);
const PORT = parseInt(process.env.PORT || '3001', 10);
const API_PREFIX = DEFAULT_API_PREFIX;

const initializeApplicationInsights = async (): Promise<void> => {
  if (!process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    return;
  }

  try {
    const importAppInsights = new Function('return import("applicationinsights")') as () => Promise<{
      setup(): { setSendLiveMetrics(enabled: boolean): { start(): void } };
    }>;
    const appInsights = await importAppInsights();
    appInsights.setup().setSendLiveMetrics(true).start();
    console.info('[EFVM360] Azure Application Insights ativo');
  } catch (error) {
    console.warn('[EFVM360] Falha ao inicializar Application Insights:', error);
  }
};

// ── STARTUP ──────────────────────────────────────────────────────────────

export const startServer = async (): Promise<void> => {
  try {
    await initializeApplicationInsights();
    // Testa conexão com MySQL
    await testConnection();

    // Inicializa jobs agendados (após conexão com DB)
    initScheduler();

    // Inicializa WebSocket (Socket.IO)
    initializeWebSocket(httpServer);

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

const isDirectExecution = (() => {
  const entry = process.argv[1] || '';
  return entry.endsWith('/src/server.ts') || entry.endsWith('/dist/server.js');
})();

if (isDirectExecution) {
  void startServer();
}

export default app;
