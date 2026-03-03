// ============================================================================
// EFVM360 Backend — UsuarioPatio Model (N:N user ↔ yard)
// ============================================================================

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface UsuarioPatioAttributes {
  id: number;
  matricula: string;
  yard_code: string;
  is_primary: boolean;
  assigned_at: Date;
}

export class UsuarioPatio extends Model<
  UsuarioPatioAttributes,
  Optional<UsuarioPatioAttributes, 'id' | 'is_primary' | 'assigned_at'>
> implements UsuarioPatioAttributes {
  declare id: number;
  declare matricula: string;
  declare yard_code: string;
  declare is_primary: boolean;
  declare assigned_at: Date;
}

UsuarioPatio.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  matricula: { type: DataTypes.STRING(20), allowNull: false },
  yard_code: { type: DataTypes.STRING(10), allowNull: false },
  is_primary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  assigned_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  tableName: 'usuario_patios',
  modelName: 'UsuarioPatio',
  timestamps: false,
});
