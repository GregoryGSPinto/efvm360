// ============================================================================
// EFVM360 Backend — Analytics Models (Materialized Views)
// ============================================================================

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// ── DailyHandoverStats ──────────────────────────────────────────────────

interface DailyHandoverStatsAttributes {
  id: number;
  stat_date: string;
  yard_code: string;
  total_handovers: number;
  avg_duration_minutes: number;
  compliance_rate: number;
  five_s_avg_score: number;
  anomalies_count: number;
  inter_yard_count: number;
}

export class DailyHandoverStats extends Model<
  DailyHandoverStatsAttributes,
  Optional<DailyHandoverStatsAttributes, 'id' | 'total_handovers' | 'avg_duration_minutes' | 'compliance_rate' | 'five_s_avg_score' | 'anomalies_count' | 'inter_yard_count'>
> implements DailyHandoverStatsAttributes {
  declare id: number;
  declare stat_date: string;
  declare yard_code: string;
  declare total_handovers: number;
  declare avg_duration_minutes: number;
  declare compliance_rate: number;
  declare five_s_avg_score: number;
  declare anomalies_count: number;
  declare inter_yard_count: number;
}

DailyHandoverStats.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  stat_date: { type: DataTypes.DATEONLY, allowNull: false },
  yard_code: { type: DataTypes.STRING(10), allowNull: false },
  total_handovers: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  avg_duration_minutes: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  compliance_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
  five_s_avg_score: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
  anomalies_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  inter_yard_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
}, {
  sequelize,
  tableName: 'mv_daily_handover_stats',
  modelName: 'DailyHandoverStats',
  createdAt: false,
});

// ── OperatorPerformance ─────────────────────────────────────────────────

interface OperatorPerformanceAttributes {
  id: number;
  period_month: string;
  matricula: string;
  yard_code: string;
  handovers_completed: number;
  avg_five_s_score: number;
  anomalies_reported: number;
  escalations_received: number;
  avg_handover_minutes: number;
}

export class OperatorPerformance extends Model<
  OperatorPerformanceAttributes,
  Optional<OperatorPerformanceAttributes, 'id' | 'handovers_completed' | 'avg_five_s_score' | 'anomalies_reported' | 'escalations_received' | 'avg_handover_minutes'>
> implements OperatorPerformanceAttributes {
  declare id: number;
  declare period_month: string;
  declare matricula: string;
  declare yard_code: string;
  declare handovers_completed: number;
  declare avg_five_s_score: number;
  declare anomalies_reported: number;
  declare escalations_received: number;
  declare avg_handover_minutes: number;
}

OperatorPerformance.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  period_month: { type: DataTypes.DATEONLY, allowNull: false },
  matricula: { type: DataTypes.STRING(20), allowNull: false },
  yard_code: { type: DataTypes.STRING(10), allowNull: false },
  handovers_completed: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  avg_five_s_score: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
  anomalies_reported: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  escalations_received: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  avg_handover_minutes: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
}, {
  sequelize,
  tableName: 'mv_operator_performance',
  modelName: 'OperatorPerformance',
  createdAt: false,
});

// ── YardCompliance ──────────────────────────────────────────────────────

interface YardComplianceAttributes {
  id: number;
  yard_code: string;
  compliance_30d: number;
  trend: string;
  handovers_30d: number;
  anomalies_30d: number;
  avg_resolution_hours: number;
  last_incident_date: string | null;
}

export class YardCompliance extends Model<
  YardComplianceAttributes,
  Optional<YardComplianceAttributes, 'id' | 'compliance_30d' | 'trend' | 'handovers_30d' | 'anomalies_30d' | 'avg_resolution_hours' | 'last_incident_date'>
> implements YardComplianceAttributes {
  declare id: number;
  declare yard_code: string;
  declare compliance_30d: number;
  declare trend: string;
  declare handovers_30d: number;
  declare anomalies_30d: number;
  declare avg_resolution_hours: number;
  declare last_incident_date: string | null;
}

YardCompliance.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  yard_code: { type: DataTypes.STRING(10), allowNull: false, unique: true },
  compliance_30d: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
  trend: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'stable' },
  handovers_30d: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  anomalies_30d: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  avg_resolution_hours: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  last_incident_date: { type: DataTypes.DATEONLY, allowNull: true },
}, {
  sequelize,
  tableName: 'mv_yard_compliance',
  modelName: 'YardCompliance',
  createdAt: false,
});
