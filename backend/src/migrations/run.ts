// ============================================================================
// VFZ Backend — Executar Migrações
// Uso: npx ts-node src/migrations/run.ts
// ============================================================================

import dotenv from 'dotenv';
dotenv.config();

import { testConnection } from '../config/database';
import { runMigrations } from './001_initial';
import { runMigration004 } from './004_patios';
import { runMigration005 } from './005_missing_tables';

(async () => {
  try {
    await testConnection();
    await runMigrations();        // 001 + 002 + 003 (initial + DDD + seed)
    await runMigration004();      // 004 (patios)
    await runMigration005();      // 005 (DSS, gestão, adamboot, config, notificações, error reports, user seed)
    console.log('\n✅ Todas as migrações executadas com sucesso.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro na migração:', error);
    process.exit(1);
  }
})();
