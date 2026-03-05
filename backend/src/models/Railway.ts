// ============================================================================
// EFVM360 Backend — Railway Model (Multi-Tenancy)
// ============================================================================

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

interface RailwayAttributes {
  id: string;
  name: string;
  region: string | null;
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
}

export class Railway extends Model<RailwayAttributes> implements RailwayAttributes {
  declare id: string;
  declare name: string;
  declare region: string | null;
  declare primary_color: string;
  declare secondary_color: string;
  declare logo_url: string | null;
}

Railway.init({
  id: { type: DataTypes.STRING(10), primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false, validate: { notEmpty: true } },
  region: { type: DataTypes.STRING(50), allowNull: true },
  primary_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: '#007e7a', validate: { is: /^#[0-9a-fA-F]{6}$/ } },
  secondary_color: { type: DataTypes.STRING(7), allowNull: false, defaultValue: '#d4a017', validate: { is: /^#[0-9a-fA-F]{6}$/ } },
  logo_url: { type: DataTypes.STRING(255), allowNull: true, validate: { isUrl: true } },
}, {
  sequelize,
  tableName: 'railways',
  modelName: 'Railway',
  updatedAt: false,
});
