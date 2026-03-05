// ============================================================================
// EFVM360 Backend — Workflow Models
// ============================================================================

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// ── ApprovalWorkflow ────────────────────────────────────────────────────

interface ApprovalWorkflowAttributes {
  id: number;
  uuid: string;
  reference_type: string;
  reference_id: string;
  yard_code: string;
  status: string;
  current_level: string;
  assigned_to: string;
  reason: string;
  severity: string;
  sla_deadline: Date;
  escalated_from: number | null;
}

export class ApprovalWorkflow extends Model<
  ApprovalWorkflowAttributes,
  Optional<ApprovalWorkflowAttributes, 'id' | 'uuid' | 'status' | 'severity' | 'escalated_from'>
> implements ApprovalWorkflowAttributes {
  declare id: number;
  declare uuid: string;
  declare reference_type: string;
  declare reference_id: string;
  declare yard_code: string;
  declare status: string;
  declare current_level: string;
  declare assigned_to: string;
  declare reason: string;
  declare severity: string;
  declare sla_deadline: Date;
  declare escalated_from: number | null;
}

ApprovalWorkflow.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  uuid: { type: DataTypes.CHAR(36), allowNull: false, unique: true, defaultValue: DataTypes.UUIDV4 },
  reference_type: { type: DataTypes.STRING(20), allowNull: false, validate: { isIn: [['passagem', 'inter_yard', 'cadastro']] } },
  reference_id: { type: DataTypes.STRING(36), allowNull: false, validate: { notEmpty: true } },
  yard_code: { type: DataTypes.STRING(10), allowNull: false, validate: { notEmpty: true } },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending', validate: { isIn: [['pending', 'approved', 'rejected', 'escalated', 'expired']] } },
  current_level: { type: DataTypes.STRING(20), allowNull: false, validate: { isIn: [['supervisor', 'coordenador', 'gerente', 'diretor']] } },
  assigned_to: { type: DataTypes.STRING(20), allowNull: false, validate: { notEmpty: true } },
  reason: { type: DataTypes.TEXT, allowNull: false, validate: { notEmpty: true } },
  severity: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'medium', validate: { isIn: [['low', 'medium', 'high', 'critical']] } },
  sla_deadline: { type: DataTypes.DATE, allowNull: false },
  escalated_from: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
}, {
  sequelize,
  tableName: 'approval_workflows',
  modelName: 'ApprovalWorkflow',
});

// ── WorkflowAction ──────────────────────────────────────────────────────

interface WorkflowActionAttributes {
  id: number;
  workflow_id: number;
  action: string;
  actor_matricula: string;
  comment: string | null;
  integrity_hash: string;
  previous_hash: string;
}

export class WorkflowAction extends Model<
  WorkflowActionAttributes,
  Optional<WorkflowActionAttributes, 'id' | 'comment'>
> implements WorkflowActionAttributes {
  declare id: number;
  declare workflow_id: number;
  declare action: string;
  declare actor_matricula: string;
  declare comment: string | null;
  declare integrity_hash: string;
  declare previous_hash: string;
}

WorkflowAction.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  workflow_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  action: { type: DataTypes.STRING(20), allowNull: false, validate: { isIn: [['approve', 'reject', 'escalate', 'comment', 'auto_escalate']] } },
  actor_matricula: { type: DataTypes.STRING(20), allowNull: false, validate: { notEmpty: true } },
  comment: { type: DataTypes.TEXT, allowNull: true },
  integrity_hash: { type: DataTypes.STRING(64), allowNull: false },
  previous_hash: { type: DataTypes.STRING(64), allowNull: false },
}, {
  sequelize,
  tableName: 'workflow_actions',
  modelName: 'WorkflowAction',
  updatedAt: false,
});
