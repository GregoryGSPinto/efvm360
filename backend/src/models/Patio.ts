// ============================================================================
// VFZ Backend — Model: Patio (Sequelize/MySQL)
// ============================================================================

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface PatioAttributes {
  id: number;
  uuid: string;
  codigo: string;
  nome: string;
  ativo: boolean;
  padrao: boolean;
  criado_por: string | null;
}

type PatioCreationAttributes = Optional<PatioAttributes, 'id' | 'uuid' | 'ativo' | 'padrao' | 'criado_por'>;

export class Patio extends Model<PatioAttributes, PatioCreationAttributes> implements PatioAttributes {
  declare id: number;
  declare uuid: string;
  declare codigo: string;
  declare nome: string;
  declare ativo: boolean;
  declare padrao: boolean;
  declare criado_por: string | null;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;

  toJSON() {
    return {
      uuid: this.uuid,
      codigo: this.codigo,
      nome: this.nome,
      ativo: this.ativo,
      padrao: this.padrao,
      criadoPor: this.criado_por,
      criadoEm: this.created_at?.toISOString(),
      atualizadoEm: this.updated_at?.toISOString(),
    };
  }
}

Patio.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  uuid: { type: DataTypes.CHAR(36), allowNull: false, unique: true, defaultValue: DataTypes.UUIDV4 },
  codigo: { type: DataTypes.STRING(5), allowNull: false, unique: true, validate: { notEmpty: true, len: [1, 5] as [number, number] } },
  nome: { type: DataTypes.STRING(120), allowNull: false, validate: { notEmpty: true, len: [2, 120] as [number, number] } },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  padrao: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  criado_por: { type: DataTypes.STRING(20), allowNull: true },
}, { sequelize, tableName: 'patios', modelName: 'Patio' });
