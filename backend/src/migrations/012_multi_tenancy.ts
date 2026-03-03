// ============================================================================
// EFVM360 Backend — Migration 012: Multi-Tenancy
// Prompt 5.1: Railway discriminator column + railways table
// ============================================================================

import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

export async function runMigration012(): Promise<void> {
  const qi = sequelize.getQueryInterface();
  console.log('[EFVM-MIGRATE-012] Implementando multi-tenancy...');

  // ── Railways table ──────────────────────────────────────────────────
  try {
    await qi.createTable('railways', {
      id: { type: DataTypes.STRING(10), primaryKey: true },
      name: { type: DataTypes.STRING(100), allowNull: false },
      region: { type: DataTypes.STRING(50), allowNull: true },
      primary_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: '#007e7a' },
      secondary_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: '#d4a017' },
      logo_url: { type: DataTypes.STRING(255), allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    console.log('[EFVM-MIGRATE-012] ✅ Tabela railways criada');
  } catch (error) {
    if ((error as Error).message?.includes('already exists')) {
      console.log('[EFVM-MIGRATE-012] ⏭️  Tabela railways já existe');
    } else { throw error; }
  }

  // Seed railways
  try {
    await qi.bulkInsert('railways', [
      { id: 'EFVM', name: 'Estrada de Ferro Vitória-Minas', region: 'ES/MG', primary_color: '#007e7a', secondary_color: '#d4a017', logo_url: null, created_at: new Date() },
      { id: 'EFC', name: 'Estrada de Ferro Carajás', region: 'MA/PA', primary_color: '#1a5276', secondary_color: '#f39c12', logo_url: null, created_at: new Date() },
      { id: 'FCA', name: 'Ferrovia Centro-Atlântica', region: 'MG/GO/BA', primary_color: '#2e86c1', secondary_color: '#e74c3c', logo_url: null, created_at: new Date() },
    ]);
    console.log('[EFVM-MIGRATE-012] ✅ Railways seed inserido');
  } catch { console.log('[EFVM-MIGRATE-012] ⏭️  Railways seed já existe'); }

  // ── Add railway_id to major tables ──────────────────────────────────
  const tables = [
    'usuarios',
    'passagens',
    'organizational_tree',
    'usuario_patios',
    'train_compositions',
    'approval_workflows',
  ];

  for (const table of tables) {
    try {
      await qi.addColumn(table, 'railway_id', {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'EFVM',
      });
      console.log(`[EFVM-MIGRATE-012] ✅ railway_id adicionado a ${table}`);
    } catch (error) {
      if ((error as Error).message?.includes('Duplicate column') || (error as Error).message?.includes('already exists')) {
        console.log(`[EFVM-MIGRATE-012] ⏭️  railway_id já existe em ${table}`);
      } else { throw error; }
    }
  }

  // ── Indexes ─────────────────────────────────────────────────────────
  try {
    for (const table of tables) {
      await qi.addIndex(table, ['railway_id'], { name: `idx_${table}_railway` });
    }
    console.log('[EFVM-MIGRATE-012] ✅ Indexes railway_id criados');
  } catch { console.log('[EFVM-MIGRATE-012] ⏭️  Indexes railway_id já existem'); }

  console.log('[EFVM-MIGRATE-012] ✅ MIGRAÇÃO 012 COMPLETA');
}
