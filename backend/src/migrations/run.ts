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
import { runMigration006 } from './006_add_primary_yard';
import { runMigration007 } from './007_organizational_tree';
import { runMigration008 } from './008_inter_yard_handover';
import { runMigration009 } from './009_train_compositions';
import { runMigration010 } from './010_analytics_views';
import { runMigration011 } from './011_approval_workflows';
import { runMigration012 } from './012_multi_tenancy';
import { runMigration013 } from './013_operational_tables';
import { runMigration014 } from './014_seed_operational';

(async () => {
  try {
    await testConnection();
    await runMigrations();        // 001 + 002 + 003 (initial + DDD + seed)
    await runMigration004();      // 004 (patios)
    await runMigration005();      // 005 (DSS, gestão, adamboot, config, notificações, error reports, user seed)
    await runMigration006();      // 006 (primary_yard + funcao VARCHAR)
    await runMigration007();      // 007 (organizational_tree + usuario_patios)
    await runMigration008();      // 008 (inter_yard_handovers)
    await runMigration009();      // 009 (train_compositions + handover_chain)
    await runMigration010();      // 010 (analytics materialized views)
    await runMigration011();      // 011 (approval_workflows + workflow_actions)
    await runMigration012();      // 012 (multi-tenancy: railways + railway_id)
    await runMigration013();      // 013 (equipment, risk_grades, shift_crews, five_s_inspections)
    await runMigration014();      // 014 (seed: equipment, risk grades, patios)
    console.log('\n✅ Todas as migrações executadas com sucesso.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro na migração:', error);
    process.exit(1);
  }
})();
