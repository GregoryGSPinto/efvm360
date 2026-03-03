// ============================================================================
// EFVM360 Backend — Migration 009: Train Compositions
// Prompt 2.2: Train composition tracking between yards
// ============================================================================

import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

export async function runMigration009(): Promise<void> {
  const qi = sequelize.getQueryInterface();
  console.log('[EFVM-MIGRATE-009] Criando tabelas train_compositions e composition_handover_chain...');

  try {
    await qi.createTable('train_compositions', {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      composition_code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      origin_yard: { type: DataTypes.STRING(10), allowNull: false },
      destination_yard: { type: DataTypes.STRING(10), allowNull: false },
      current_yard: { type: DataTypes.STRING(10), allowNull: false },
      status: {
        type: DataTypes.ENUM('loading', 'in_transit', 'arrived', 'unloading', 'completed'),
        allowNull: false,
        defaultValue: 'loading',
      },
      cargo_type: { type: DataTypes.STRING(100), allowNull: true },
      wagon_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      departed_at: { type: DataTypes.DATE, allowNull: true },
      arrived_at: { type: DataTypes.DATE, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    console.log('[EFVM-MIGRATE-009] ✅ Tabela train_compositions criada');
  } catch (error) {
    if ((error as Error).message?.includes('already exists')) {
      console.log('[EFVM-MIGRATE-009] ⏭️  Tabela train_compositions já existe');
    } else {
      throw error;
    }
  }

  try {
    await qi.createTable('composition_handover_chain', {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      composition_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      inter_yard_handover_id: { type: DataTypes.CHAR(36), allowNull: false },
      sequence_number: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      from_yard: { type: DataTypes.STRING(10), allowNull: false },
      to_yard: { type: DataTypes.STRING(10), allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    console.log('[EFVM-MIGRATE-009] ✅ Tabela composition_handover_chain criada');
  } catch (error) {
    if ((error as Error).message?.includes('already exists')) {
      console.log('[EFVM-MIGRATE-009] ⏭️  Tabela composition_handover_chain já existe');
    } else {
      throw error;
    }
  }

  try {
    await qi.addIndex('train_compositions', ['status'], { name: 'idx_tc_status' });
    await qi.addIndex('train_compositions', ['current_yard'], { name: 'idx_tc_current_yard' });
    await qi.addIndex('composition_handover_chain', ['composition_id', 'sequence_number'], {
      name: 'uq_chain',
      unique: true,
    });
    console.log('[EFVM-MIGRATE-009] ✅ Indexes criados');
  } catch { console.log('[EFVM-MIGRATE-009] ⏭️  Indexes já existem'); }

  console.log('[EFVM-MIGRATE-009] ✅ MIGRAÇÃO 009 COMPLETA');
}
