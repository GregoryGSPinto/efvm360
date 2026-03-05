// ============================================================================
// EFVM360 Backend — Model: Site (Multi-Site Support)
// ============================================================================

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface SiteAttributes {
  id: number;
  uuid: string;
  code: string;
  name: string;
  railway: string;
  region: string;
  timezone: string;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
}

type SiteCreationAttributes = Optional<SiteAttributes, 'id' | 'uuid' | 'active' | 'latitude' | 'longitude'>;

export class Site extends Model<SiteAttributes, SiteCreationAttributes> implements SiteAttributes {
  declare id: number;
  declare uuid: string;
  declare code: string;
  declare name: string;
  declare railway: string;
  declare region: string;
  declare timezone: string;
  declare latitude: number | null;
  declare longitude: number | null;
  declare active: boolean;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;

  toJSON() {
    return {
      uuid: this.uuid,
      code: this.code,
      name: this.name,
      railway: this.railway,
      region: this.region,
      timezone: this.timezone,
      coordinates: this.latitude && this.longitude
        ? { lat: this.latitude, lng: this.longitude }
        : null,
      active: this.active,
    };
  }
}

Site.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  uuid: { type: DataTypes.CHAR(36), allowNull: false, unique: true, defaultValue: DataTypes.UUIDV4 },
  code: { type: DataTypes.STRING(10), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  railway: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'EFVM' },
  region: { type: DataTypes.STRING(5), allowNull: false },
  timezone: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'America/Sao_Paulo' },
  latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
  longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
  active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { sequelize, tableName: 'sites', modelName: 'Site' });
