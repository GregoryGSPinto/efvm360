// ============================================================================
// EFVM360 Backend — TrainComposition Model
// ============================================================================

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface TrainCompositionAttributes {
  id: number;
  composition_code: string;
  origin_yard: string;
  destination_yard: string;
  current_yard: string;
  status: string;
  cargo_type: string | null;
  wagon_count: number | null;
  departed_at: Date | null;
  arrived_at: Date | null;
}

export class TrainComposition extends Model<
  TrainCompositionAttributes,
  Optional<TrainCompositionAttributes, 'id' | 'status' | 'cargo_type' | 'wagon_count' | 'departed_at' | 'arrived_at'>
> implements TrainCompositionAttributes {
  declare id: number;
  declare composition_code: string;
  declare origin_yard: string;
  declare destination_yard: string;
  declare current_yard: string;
  declare status: string;
  declare cargo_type: string | null;
  declare wagon_count: number | null;
  declare departed_at: Date | null;
  declare arrived_at: Date | null;
}

TrainComposition.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  composition_code: { type: DataTypes.STRING(30), allowNull: false, unique: true, validate: { notEmpty: true, len: [1, 30] as [number, number] } },
  origin_yard: { type: DataTypes.STRING(10), allowNull: false, validate: { notEmpty: true } },
  destination_yard: { type: DataTypes.STRING(10), allowNull: false, validate: { notEmpty: true } },
  current_yard: { type: DataTypes.STRING(10), allowNull: false, validate: { notEmpty: true } },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'loading', validate: { isIn: [['loading', 'in_transit', 'arrived', 'unloading', 'completed']] } },
  cargo_type: { type: DataTypes.STRING(100), allowNull: true },
  wagon_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, validate: { min: 1 } },
  departed_at: { type: DataTypes.DATE, allowNull: true },
  arrived_at: { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize,
  tableName: 'train_compositions',
  modelName: 'TrainComposition',
});
