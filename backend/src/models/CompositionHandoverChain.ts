// ============================================================================
// EFVM360 Backend — CompositionHandoverChain Model
// ============================================================================

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface CompositionHandoverChainAttributes {
  id: number;
  composition_id: number;
  inter_yard_handover_id: string;
  sequence_number: number;
  from_yard: string;
  to_yard: string;
}

export class CompositionHandoverChain extends Model<
  CompositionHandoverChainAttributes,
  Optional<CompositionHandoverChainAttributes, 'id'>
> implements CompositionHandoverChainAttributes {
  declare id: number;
  declare composition_id: number;
  declare inter_yard_handover_id: string;
  declare sequence_number: number;
  declare from_yard: string;
  declare to_yard: string;
}

CompositionHandoverChain.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  composition_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  inter_yard_handover_id: { type: DataTypes.CHAR(36), allowNull: false },
  sequence_number: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  from_yard: { type: DataTypes.STRING(10), allowNull: false },
  to_yard: { type: DataTypes.STRING(10), allowNull: false },
}, {
  sequelize,
  tableName: 'composition_handover_chain',
  modelName: 'CompositionHandoverChain',
  updatedAt: false,
});
