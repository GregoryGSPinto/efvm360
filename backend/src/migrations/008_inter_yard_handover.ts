// ============================================================================
// EFVM360 Backend — Migration 008: Inter-Yard Handover
// Prompt 2.1: Handover between different yards
// ============================================================================

import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

export async function runMigration008(): Promise<void> {
  const qi = sequelize.getQueryInterface();
  console.log('[EFVM-MIGRATE-008] Criando tabela inter_yard_handovers...');

  try {
    await qi.createTable('inter_yard_handovers', {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      uuid: { type: DataTypes.CHAR(36), allowNull: false, unique: true, defaultValue: DataTypes.UUIDV4 },
      composition_code: { type: DataTypes.STRING(30), allowNull: false },
      origin_yard: { type: DataTypes.STRING(10), allowNull: false },
      destination_yard: { type: DataTypes.STRING(10), allowNull: false },
      dispatcher_matricula: { type: DataTypes.STRING(20), allowNull: false },
      receiver_matricula: { type: DataTypes.STRING(20), allowNull: true },
      status: {
        type: DataTypes.ENUM('draft', 'dispatched', 'received', 'divergence', 'resolved', 'sealed'),
        allowNull: false,
        defaultValue: 'draft',
      },
      dispatch_checklist: { type: DataTypes.JSON, allowNull: true },
      reception_checklist: { type: DataTypes.JSON, allowNull: true },
      divergences: { type: DataTypes.JSON, allowNull: true },
      dispatched_at: { type: DataTypes.DATE, allowNull: true },
      received_at: { type: DataTypes.DATE, allowNull: true },
      sealed_at: { type: DataTypes.DATE, allowNull: true },
      integrity_hash: { type: DataTypes.STRING(128), allowNull: true },
      previous_hash: { type: DataTypes.STRING(128), allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    console.log('[EFVM-MIGRATE-008] ✅ Tabela inter_yard_handovers criada');
  } catch (error) {
    if ((error as Error).message?.includes('already exists')) {
      console.log('[EFVM-MIGRATE-008] ⏭️  Tabela inter_yard_handovers já existe');
    } else {
      throw error;
    }
  }

  try {
    await qi.addIndex('inter_yard_handovers', ['origin_yard'], { name: 'idx_iyh_origin' });
    await qi.addIndex('inter_yard_handovers', ['destination_yard'], { name: 'idx_iyh_dest' });
    await qi.addIndex('inter_yard_handovers', ['status'], { name: 'idx_iyh_status' });
    console.log('[EFVM-MIGRATE-008] ✅ Indexes criados');
  } catch { console.log('[EFVM-MIGRATE-008] ⏭️  Indexes já existem'); }

  console.log('[EFVM-MIGRATE-008] ✅ MIGRAÇÃO 008 COMPLETA');
}
