// ============================================================================
// EFVM360 Backend — Organizational Tree Model
// ============================================================================

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface OrganizationalTreeAttributes {
  id: number;
  subordinate_matricula: string;
  superior_matricula: string;
  relationship_type: 'direto' | 'funcional' | 'interino';
  start_date: string;
  end_date: string | null;
}

export class OrganizationalTree extends Model<
  OrganizationalTreeAttributes,
  Optional<OrganizationalTreeAttributes, 'id' | 'relationship_type' | 'end_date'>
> implements OrganizationalTreeAttributes {
  declare id: number;
  declare subordinate_matricula: string;
  declare superior_matricula: string;
  declare relationship_type: 'direto' | 'funcional' | 'interino';
  declare start_date: string;
  declare end_date: string | null;
}

OrganizationalTree.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  subordinate_matricula: { type: DataTypes.STRING(20), allowNull: false },
  superior_matricula: { type: DataTypes.STRING(20), allowNull: false },
  relationship_type: {
    type: DataTypes.ENUM('direto', 'funcional', 'interino'),
    allowNull: false,
    defaultValue: 'direto',
  },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY, allowNull: true },
}, {
  sequelize,
  tableName: 'organizational_tree',
  modelName: 'OrganizationalTree',
});
