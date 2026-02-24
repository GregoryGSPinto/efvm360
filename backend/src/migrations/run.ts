// ============================================================================
// VFZ Backend — Executar Migrações
// Uso: npx ts-node src/migrations/run.ts
// ============================================================================

import dotenv from 'dotenv';
dotenv.config();

import { testConnection } from '../config/database';
import { runMigrations } from './001_initial';

(async () => {
  try {
    await testConnection();
    await runMigrations();
    console.log('\n✅ Todas as migrações executadas com sucesso.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro na migração:', error);
    process.exit(1);
  }
})();
