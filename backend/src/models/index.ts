// ============================================================================
// VFZ Backend — Modelos Sequelize (MySQL)
// ============================================================================

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// ── INTERFACES ───────────────────────────────────────────────────────────

interface UsuarioAttributes {
  id: number;
  uuid: string;
  nome: string;
  matricula: string;
  funcao: string;
  turno: string | null;
  horario_turno: string | null;
  senha_hash: string;
  ativo: boolean;
  ultimo_login: Date | null;
  tentativas_login: number;
  bloqueado_ate: Date | null;
  azure_ad_oid: string | null;
}

interface PassagemAttributes {
  id: number;
  uuid: string;
  data_passagem: string;
  dss: string | null;
  turno: string;
  horario_turno: string;
  operador_sai_id: number | null;
  operador_entra_id: number | null;
  dados_patio_cima: object;
  dados_patio_baixo: object;
  dados_equipamentos: object | null;
  dados_seguranca_manobras: object | null;
  dados_pontos_atencao: object | null;
  dados_intervencoes: object | null;
  dados_sala_5s: object | null;
  assinatura_sai_confirmado: boolean;
  assinatura_sai_hash: string | null;
  assinatura_sai_timestamp: Date | null;
  assinatura_entra_confirmado: boolean;
  assinatura_entra_hash: string | null;
  assinatura_entra_timestamp: Date | null;
  status: string;
  hash_integridade: string | null;
}

interface AuditTrailAttributes {
  id: number;
  uuid: string;
  usuario_id: number | null;
  matricula: string;
  acao: string;
  recurso: string;
  detalhes: string | null;
  ip_address: string | null;
  user_agent: string | null;
  hash_anterior: string | null;
  hash_registro: string;
}

// ── MODELOS ──────────────────────────────────────────────────────────────

export class Usuario extends Model<UsuarioAttributes, Optional<UsuarioAttributes, 'id' | 'uuid' | 'ativo' | 'ultimo_login' | 'tentativas_login' | 'bloqueado_ate' | 'azure_ad_oid'>> implements UsuarioAttributes {
  declare id: number;
  declare uuid: string;
  declare nome: string;
  declare matricula: string;
  declare funcao: string;
  declare turno: string | null;
  declare horario_turno: string | null;
  declare senha_hash: string;
  declare ativo: boolean;
  declare ultimo_login: Date | null;
  declare tentativas_login: number;
  declare bloqueado_ate: Date | null;
  declare azure_ad_oid: string | null;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;

  // Retorna dados seguros (sem senha)
  toSafeJSON() {
    return {
      uuid: this.uuid,
      nome: this.nome,
      matricula: this.matricula,
      funcao: this.funcao,
      turno: this.turno,
      horarioTurno: this.horario_turno,
      ativo: this.ativo,
      ultimoLogin: this.ultimo_login,
    };
  }
}

Usuario.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  uuid: { type: DataTypes.CHAR(36), allowNull: false, unique: true, defaultValue: DataTypes.UUIDV4 },
  nome: { type: DataTypes.STRING(120), allowNull: false },
  matricula: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  funcao: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'operador' },
  turno: { type: DataTypes.STRING(1), allowNull: true },
  horario_turno: { type: DataTypes.STRING(10), allowNull: true },
  senha_hash: { type: DataTypes.STRING(255), allowNull: false },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  ultimo_login: { type: DataTypes.DATE, allowNull: true },
  tentativas_login: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
  bloqueado_ate: { type: DataTypes.DATE, allowNull: true },
  azure_ad_oid: { type: DataTypes.STRING(36), allowNull: true, unique: true },
}, { sequelize, tableName: 'usuarios', modelName: 'Usuario' });

export class Passagem extends Model<PassagemAttributes, Optional<PassagemAttributes, 'id' | 'uuid' | 'status' | 'hash_integridade'>> implements PassagemAttributes {
  declare id: number;
  declare uuid: string;
  declare data_passagem: string;
  declare dss: string | null;
  declare turno: string;
  declare horario_turno: string;
  declare operador_sai_id: number | null;
  declare operador_entra_id: number | null;
  declare dados_patio_cima: object;
  declare dados_patio_baixo: object;
  declare dados_equipamentos: object | null;
  declare dados_seguranca_manobras: object | null;
  declare dados_pontos_atencao: object | null;
  declare dados_intervencoes: object | null;
  declare dados_sala_5s: object | null;
  declare assinatura_sai_confirmado: boolean;
  declare assinatura_sai_hash: string | null;
  declare assinatura_sai_timestamp: Date | null;
  declare assinatura_entra_confirmado: boolean;
  declare assinatura_entra_hash: string | null;
  declare assinatura_entra_timestamp: Date | null;
  declare status: string;
  declare hash_integridade: string | null;
}

Passagem.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  uuid: { type: DataTypes.CHAR(36), allowNull: false, unique: true, defaultValue: DataTypes.UUIDV4 },
  data_passagem: { type: DataTypes.DATEONLY, allowNull: false },
  dss: { type: DataTypes.STRING(50), allowNull: true },
  turno: { type: DataTypes.STRING(1), allowNull: false },
  horario_turno: { type: DataTypes.STRING(10), allowNull: false },
  operador_sai_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  operador_entra_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  dados_patio_cima: { type: DataTypes.JSON, allowNull: false },
  dados_patio_baixo: { type: DataTypes.JSON, allowNull: false },
  dados_equipamentos: { type: DataTypes.JSON, allowNull: true },
  dados_seguranca_manobras: { type: DataTypes.JSON, allowNull: true },
  dados_pontos_atencao: { type: DataTypes.JSON, allowNull: true },
  dados_intervencoes: { type: DataTypes.JSON, allowNull: true },
  dados_sala_5s: { type: DataTypes.JSON, allowNull: true },
  assinatura_sai_confirmado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  assinatura_sai_hash: { type: DataTypes.STRING(128), allowNull: true },
  assinatura_sai_timestamp: { type: DataTypes.DATE, allowNull: true },
  assinatura_entra_confirmado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  assinatura_entra_hash: { type: DataTypes.STRING(128), allowNull: true },
  assinatura_entra_timestamp: { type: DataTypes.DATE, allowNull: true },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'rascunho' },
  hash_integridade: { type: DataTypes.STRING(128), allowNull: true },
}, { sequelize, tableName: 'passagens', modelName: 'Passagem' });

export class AuditTrail extends Model<AuditTrailAttributes, Optional<AuditTrailAttributes, 'id' | 'uuid' | 'usuario_id' | 'detalhes' | 'ip_address' | 'user_agent' | 'hash_anterior'>> implements AuditTrailAttributes {
  declare id: number;
  declare uuid: string;
  declare usuario_id: number | null;
  declare matricula: string;
  declare acao: string;
  declare recurso: string;
  declare detalhes: string | null;
  declare ip_address: string | null;
  declare user_agent: string | null;
  declare hash_anterior: string | null;
  declare hash_registro: string;
}

AuditTrail.init({
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  uuid: { type: DataTypes.CHAR(36), allowNull: false, unique: true, defaultValue: DataTypes.UUIDV4 },
  usuario_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  matricula: { type: DataTypes.STRING(20), allowNull: false },
  acao: { type: DataTypes.STRING(50), allowNull: false },
  recurso: { type: DataTypes.STRING(100), allowNull: false },
  detalhes: { type: DataTypes.TEXT, allowNull: true },
  ip_address: { type: DataTypes.STRING(45), allowNull: true },
  user_agent: { type: DataTypes.STRING(500), allowNull: true },
  hash_anterior: { type: DataTypes.STRING(128), allowNull: true },
  hash_registro: { type: DataTypes.STRING(128), allowNull: false },
}, { sequelize, tableName: 'audit_trail', modelName: 'AuditTrail', updatedAt: false });

// ── RELACIONAMENTOS ──────────────────────────────────────────────────────

Passagem.belongsTo(Usuario, { as: 'operadorSai', foreignKey: 'operador_sai_id' });
Passagem.belongsTo(Usuario, { as: 'operadorEntra', foreignKey: 'operador_entra_id' });
AuditTrail.belongsTo(Usuario, { as: 'usuario', foreignKey: 'usuario_id' });

export default { Usuario, Passagem, AuditTrail };
