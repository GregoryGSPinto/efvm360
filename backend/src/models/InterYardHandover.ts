// ============================================================================
// EFVM360 Backend — InterYardHandover Model
// ============================================================================

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface InterYardHandoverAttributes {
  id: number;
  uuid: string;
  composition_code: string;
  origin_yard: string;
  destination_yard: string;
  dispatcher_matricula: string;
  receiver_matricula: string | null;
  status: string;
  dispatch_checklist: object | null;
  reception_checklist: object | null;
  divergences: object | null;
  dispatched_at: Date | null;
  received_at: Date | null;
  sealed_at: Date | null;
  integrity_hash: string | null;
  previous_hash: string | null;
}

export class InterYardHandover extends Model<
  InterYardHandoverAttributes,
  Optional<InterYardHandoverAttributes, 'id' | 'uuid' | 'receiver_matricula' | 'status' | 'dispatch_checklist' | 'reception_checklist' | 'divergences' | 'dispatched_at' | 'received_at' | 'sealed_at' | 'integrity_hash' | 'previous_hash'>
> implements InterYardHandoverAttributes {
  declare id: number;
  declare uuid: string;
  declare composition_code: string;
  declare origin_yard: string;
  declare destination_yard: string;
  declare dispatcher_matricula: string;
  declare receiver_matricula: string | null;
  declare status: string;
  declare dispatch_checklist: object | null;
  declare reception_checklist: object | null;
  declare divergences: object | null;
  declare dispatched_at: Date | null;
  declare received_at: Date | null;
  declare sealed_at: Date | null;
  declare integrity_hash: string | null;
  declare previous_hash: string | null;
}

InterYardHandover.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  uuid: { type: DataTypes.CHAR(36), allowNull: false, unique: true, defaultValue: DataTypes.UUIDV4 },
  composition_code: { type: DataTypes.STRING(30), allowNull: false, validate: { notEmpty: true, len: [1, 30] as [number, number] } },
  origin_yard: { type: DataTypes.STRING(10), allowNull: false, validate: { notEmpty: true, len: [1, 10] as [number, number] } },
  destination_yard: { type: DataTypes.STRING(10), allowNull: false, validate: { notEmpty: true, len: [1, 10] as [number, number] } },
  dispatcher_matricula: { type: DataTypes.STRING(20), allowNull: false, validate: { notEmpty: true } },
  receiver_matricula: { type: DataTypes.STRING(20), allowNull: true },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft', validate: { isIn: [['draft', 'dispatched', 'received', 'divergence', 'resolved', 'sealed']] } },
  dispatch_checklist: { type: DataTypes.JSON, allowNull: true },
  reception_checklist: { type: DataTypes.JSON, allowNull: true },
  divergences: { type: DataTypes.JSON, allowNull: true },
  dispatched_at: { type: DataTypes.DATE, allowNull: true },
  received_at: { type: DataTypes.DATE, allowNull: true },
  sealed_at: { type: DataTypes.DATE, allowNull: true },
  integrity_hash: { type: DataTypes.STRING(128), allowNull: true },
  previous_hash: { type: DataTypes.STRING(128), allowNull: true },
}, {
  sequelize,
  tableName: 'inter_yard_handovers',
  modelName: 'InterYardHandover',
});
