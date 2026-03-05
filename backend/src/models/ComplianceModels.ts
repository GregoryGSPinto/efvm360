// ============================================================================
// EFVM360 Backend — Compliance Models (NR Compliance + Alerts + Training)
// ============================================================================

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// ── COMPLIANCE CHECK ─────────────────────────────────────────────────────

interface ComplianceCheckAttributes {
  id: number;
  uuid: string;
  site_id: string;
  nr: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'annual';
  last_checked: Date | null;
  next_due: Date | null;
  status: 'compliant' | 'non_compliant' | 'pending' | 'overdue';
  responsible_matricula: string | null;
  evidence_required: boolean;
  evidence_url: string | null;
  notes: string | null;
}

export class ComplianceCheck extends Model<
  ComplianceCheckAttributes,
  Optional<ComplianceCheckAttributes, 'id' | 'uuid' | 'last_checked' | 'next_due' | 'status' | 'responsible_matricula' | 'evidence_url' | 'notes'>
> implements ComplianceCheckAttributes {
  declare id: number;
  declare uuid: string;
  declare site_id: string;
  declare nr: string;
  declare description: string;
  declare frequency: 'daily' | 'weekly' | 'monthly' | 'annual';
  declare last_checked: Date | null;
  declare next_due: Date | null;
  declare status: 'compliant' | 'non_compliant' | 'pending' | 'overdue';
  declare responsible_matricula: string | null;
  declare evidence_required: boolean;
  declare evidence_url: string | null;
  declare notes: string | null;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

ComplianceCheck.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  uuid: { type: DataTypes.CHAR(36), allowNull: false, unique: true, defaultValue: DataTypes.UUIDV4 },
  site_id: { type: DataTypes.STRING(10), allowNull: false },
  nr: { type: DataTypes.STRING(10), allowNull: false },
  description: { type: DataTypes.STRING(300), allowNull: false },
  frequency: { type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'annual'), allowNull: false },
  last_checked: { type: DataTypes.DATE, allowNull: true },
  next_due: { type: DataTypes.DATE, allowNull: true },
  status: { type: DataTypes.ENUM('compliant', 'non_compliant', 'pending', 'overdue'), allowNull: false, defaultValue: 'pending' },
  responsible_matricula: { type: DataTypes.STRING(20), allowNull: true },
  evidence_required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  evidence_url: { type: DataTypes.STRING(500), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { sequelize, tableName: 'compliance_checks', modelName: 'ComplianceCheck' });

// ── COMPLIANCE ALERT ─────────────────────────────────────────────────────

interface ComplianceAlertAttributes {
  id: number;
  uuid: string;
  site_id: string;
  check_id: number | null;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string | null;
  nr_reference: string | null;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: Date | null;
}

export class ComplianceAlert extends Model<
  ComplianceAlertAttributes,
  Optional<ComplianceAlertAttributes, 'id' | 'uuid' | 'check_id' | 'description' | 'nr_reference' | 'acknowledged' | 'acknowledged_by' | 'acknowledged_at'>
> implements ComplianceAlertAttributes {
  declare id: number;
  declare uuid: string;
  declare site_id: string;
  declare check_id: number | null;
  declare type: string;
  declare severity: 'info' | 'warning' | 'critical';
  declare title: string;
  declare description: string | null;
  declare nr_reference: string | null;
  declare acknowledged: boolean;
  declare acknowledged_by: string | null;
  declare acknowledged_at: Date | null;
  declare readonly created_at: Date;
}

ComplianceAlert.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  uuid: { type: DataTypes.CHAR(36), allowNull: false, unique: true, defaultValue: DataTypes.UUIDV4 },
  site_id: { type: DataTypes.STRING(10), allowNull: false },
  check_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  type: { type: DataTypes.STRING(50), allowNull: false },
  severity: { type: DataTypes.ENUM('info', 'warning', 'critical'), allowNull: false, defaultValue: 'warning' },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  nr_reference: { type: DataTypes.STRING(10), allowNull: true },
  acknowledged: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  acknowledged_by: { type: DataTypes.STRING(20), allowNull: true },
  acknowledged_at: { type: DataTypes.DATE, allowNull: true },
}, { sequelize, tableName: 'compliance_alerts', modelName: 'ComplianceAlert', updatedAt: false });

// ── TRAINING RECORD ──────────────────────────────────────────────────────

interface TrainingRecordAttributes {
  id: number;
  uuid: string;
  site_id: string;
  user_matricula: string;
  training_type: string;
  nr_reference: string | null;
  completed_at: Date;
  expires_at: Date | null;
  certificate_url: string | null;
  status: 'valid' | 'expiring' | 'expired';
}

export class TrainingRecord extends Model<
  TrainingRecordAttributes,
  Optional<TrainingRecordAttributes, 'id' | 'uuid' | 'nr_reference' | 'expires_at' | 'certificate_url' | 'status'>
> implements TrainingRecordAttributes {
  declare id: number;
  declare uuid: string;
  declare site_id: string;
  declare user_matricula: string;
  declare training_type: string;
  declare nr_reference: string | null;
  declare completed_at: Date;
  declare expires_at: Date | null;
  declare certificate_url: string | null;
  declare status: 'valid' | 'expiring' | 'expired';
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

TrainingRecord.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  uuid: { type: DataTypes.CHAR(36), allowNull: false, unique: true, defaultValue: DataTypes.UUIDV4 },
  site_id: { type: DataTypes.STRING(10), allowNull: false },
  user_matricula: { type: DataTypes.STRING(20), allowNull: false },
  training_type: { type: DataTypes.STRING(100), allowNull: false },
  nr_reference: { type: DataTypes.STRING(10), allowNull: true },
  completed_at: { type: DataTypes.DATE, allowNull: false },
  expires_at: { type: DataTypes.DATE, allowNull: true },
  certificate_url: { type: DataTypes.STRING(500), allowNull: true },
  status: { type: DataTypes.ENUM('valid', 'expiring', 'expired'), allowNull: false, defaultValue: 'valid' },
}, { sequelize, tableName: 'training_records', modelName: 'TrainingRecord' });
