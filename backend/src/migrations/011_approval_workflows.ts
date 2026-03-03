// ============================================================================
// EFVM360 Backend — Migration 011: Approval Workflows
// Prompt 4.1: Approval engine with auto-escalation
// ============================================================================

import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

export async function runMigration011(): Promise<void> {
  const qi = sequelize.getQueryInterface();
  console.log('[EFVM-MIGRATE-011] Criando tabelas de workflows...');

  try {
    await qi.createTable('approval_workflows', {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      uuid: { type: DataTypes.CHAR(36), allowNull: false, unique: true, defaultValue: DataTypes.UUIDV4 },
      reference_type: {
        type: DataTypes.ENUM('passagem', 'inter_yard', 'cadastro'),
        allowNull: false,
      },
      reference_id: { type: DataTypes.STRING(36), allowNull: false },
      yard_code: { type: DataTypes.STRING(10), allowNull: false },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'escalated', 'expired'),
        allowNull: false,
        defaultValue: 'pending',
      },
      current_level: {
        type: DataTypes.ENUM('supervisor', 'coordenador', 'gerente', 'diretor'),
        allowNull: false,
      },
      assigned_to: { type: DataTypes.STRING(20), allowNull: false },
      reason: { type: DataTypes.TEXT, allowNull: false },
      severity: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'medium',
      },
      sla_deadline: { type: DataTypes.DATE, allowNull: false },
      escalated_from: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    console.log('[EFVM-MIGRATE-011] ✅ Tabela approval_workflows criada');
  } catch (error) {
    if ((error as Error).message?.includes('already exists')) {
      console.log('[EFVM-MIGRATE-011] ⏭️  Tabela approval_workflows já existe');
    } else { throw error; }
  }

  try {
    await qi.createTable('workflow_actions', {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      workflow_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      action: {
        type: DataTypes.ENUM('approve', 'reject', 'escalate', 'comment', 'auto_escalate'),
        allowNull: false,
      },
      actor_matricula: { type: DataTypes.STRING(20), allowNull: false },
      comment: { type: DataTypes.TEXT, allowNull: true },
      integrity_hash: { type: DataTypes.STRING(64), allowNull: false },
      previous_hash: { type: DataTypes.STRING(64), allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    console.log('[EFVM-MIGRATE-011] ✅ Tabela workflow_actions criada');
  } catch (error) {
    if ((error as Error).message?.includes('already exists')) {
      console.log('[EFVM-MIGRATE-011] ⏭️  Tabela workflow_actions já existe');
    } else { throw error; }
  }

  try {
    await qi.addIndex('approval_workflows', ['assigned_to', 'status'], { name: 'idx_wf_assigned' });
    await qi.addIndex('approval_workflows', ['sla_deadline', 'status'], { name: 'idx_wf_deadline' });
    await qi.addIndex('workflow_actions', ['workflow_id'], { name: 'idx_wa_workflow' });
    console.log('[EFVM-MIGRATE-011] ✅ Indexes criados');
  } catch { console.log('[EFVM-MIGRATE-011] ⏭️  Indexes já existem'); }

  console.log('[EFVM-MIGRATE-011] ✅ MIGRAÇÃO 011 COMPLETA');
}
