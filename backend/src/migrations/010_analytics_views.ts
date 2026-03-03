// ============================================================================
// EFVM360 Backend — Migration 010: Analytics Materialized Views
// Prompt 3.1: Materialized views for dashboard analytics
// ============================================================================

import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

export async function runMigration010(): Promise<void> {
  const qi = sequelize.getQueryInterface();
  console.log('[EFVM-MIGRATE-010] Criando tabelas de analytics...');

  // ── mv_daily_handover_stats ─────────────────────────────────────────
  try {
    await qi.createTable('mv_daily_handover_stats', {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      stat_date: { type: DataTypes.DATEONLY, allowNull: false },
      yard_code: { type: DataTypes.STRING(10), allowNull: false },
      total_handovers: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      avg_duration_minutes: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      compliance_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      five_s_avg_score: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      anomalies_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      inter_yard_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    console.log('[EFVM-MIGRATE-010] ✅ mv_daily_handover_stats criada');
  } catch (error) {
    if ((error as Error).message?.includes('already exists')) {
      console.log('[EFVM-MIGRATE-010] ⏭️  mv_daily_handover_stats já existe');
    } else { throw error; }
  }

  // ── mv_operator_performance ─────────────────────────────────────────
  try {
    await qi.createTable('mv_operator_performance', {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      period_month: { type: DataTypes.DATEONLY, allowNull: false },
      matricula: { type: DataTypes.STRING(20), allowNull: false },
      yard_code: { type: DataTypes.STRING(10), allowNull: false },
      handovers_completed: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      avg_five_s_score: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      anomalies_reported: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      escalations_received: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      avg_handover_minutes: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    console.log('[EFVM-MIGRATE-010] ✅ mv_operator_performance criada');
  } catch (error) {
    if ((error as Error).message?.includes('already exists')) {
      console.log('[EFVM-MIGRATE-010] ⏭️  mv_operator_performance já existe');
    } else { throw error; }
  }

  // ── mv_yard_compliance ──────────────────────────────────────────────
  try {
    await qi.createTable('mv_yard_compliance', {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      yard_code: { type: DataTypes.STRING(10), allowNull: false, unique: true },
      compliance_30d: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      trend: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'stable' },
      handovers_30d: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      anomalies_30d: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      avg_resolution_hours: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      last_incident_date: { type: DataTypes.DATEONLY, allowNull: true },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    console.log('[EFVM-MIGRATE-010] ✅ mv_yard_compliance criada');
  } catch (error) {
    if ((error as Error).message?.includes('already exists')) {
      console.log('[EFVM-MIGRATE-010] ⏭️  mv_yard_compliance já existe');
    } else { throw error; }
  }

  // ── Indexes ─────────────────────────────────────────────────────────
  try {
    await qi.addIndex('mv_daily_handover_stats', ['stat_date', 'yard_code'], {
      name: 'uq_dhs_date_yard', unique: true,
    });
    await qi.addIndex('mv_daily_handover_stats', ['stat_date'], { name: 'idx_dhs_date' });
    await qi.addIndex('mv_operator_performance', ['period_month', 'matricula'], {
      name: 'uq_op_period_mat', unique: true,
    });
    console.log('[EFVM-MIGRATE-010] ✅ Indexes criados');
  } catch { console.log('[EFVM-MIGRATE-010] ⏭️  Indexes já existem'); }

  console.log('[EFVM-MIGRATE-010] ✅ MIGRAÇÃO 010 COMPLETA');
}
