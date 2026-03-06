// ============================================================================
// EFVM360 Backend — Modelos Sequelize (MySQL)
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
  primary_yard: string;
  senha_hash: string;
  ativo: boolean;
  ultimo_login: Date | null;
  tentativas_login: number;
  bloqueado_ate: Date | null;
  azure_ad_oid: string | null;
  created_at?: Date;
  updated_at?: Date;
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
  created_at?: Date;
}

// ── MODELOS ──────────────────────────────────────────────────────────────

export class Usuario extends Model<UsuarioAttributes, Optional<UsuarioAttributes, 'id' | 'uuid' | 'ativo' | 'ultimo_login' | 'tentativas_login' | 'bloqueado_ate' | 'azure_ad_oid' | 'primary_yard'>> implements UsuarioAttributes {
  declare id: number;
  declare uuid: string;
  declare nome: string;
  declare matricula: string;
  declare funcao: string;
  declare turno: string | null;
  declare horario_turno: string | null;
  declare primary_yard: string;
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
      primaryYard: this.primary_yard,
      ativo: this.ativo,
      ultimoLogin: this.ultimo_login,
    };
  }
}

Usuario.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  uuid: { type: DataTypes.CHAR(36), allowNull: false, unique: true, defaultValue: DataTypes.UUIDV4 },
  nome: { type: DataTypes.STRING(120), allowNull: false, validate: { notEmpty: true, len: [2, 120] as [number, number] } },
  matricula: { type: DataTypes.STRING(20), allowNull: false, unique: true, validate: { notEmpty: true, len: [3, 20] as [number, number] } },
  funcao: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'operador', validate: { isIn: [['operador', 'maquinista', 'inspetor', 'supervisor', 'coordenador', 'gestor', 'gerente', 'diretor', 'administrador', 'suporte']] } },
  turno: { type: DataTypes.STRING(1), allowNull: true },
  horario_turno: { type: DataTypes.STRING(20), allowNull: true },
  primary_yard: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'VFZ' },
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
  turno: { type: DataTypes.STRING(1), allowNull: false, validate: { isIn: [['A', 'B', 'C', 'D', 'M', 'V', 'N']] } },
  horario_turno: { type: DataTypes.STRING(20), allowNull: false },
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
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'rascunho', validate: { isIn: [['rascunho', 'assinado_parcial', 'assinado_completo', 'sincronizada', 'finalizada']] } },
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
  declare readonly created_at: Date;
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

// ── PÁTIOS ──────────────────────────────────────────────────────────────

export { Patio } from './Patio';

// ── DSS ─────────────────────────────────────────────────────────────────

interface DSSAttributes {
  id: number;
  uuid: string;
  data: string;
  turno: string;
  tema: string;
  facilitador_id: number | null;
  facilitador_matricula: string;
  patio_codigo: string | null;
  observacoes: string | null;
  experiencias_compartilhadas: object | null;
  topicos: object | null;
  participantes: object | null;
  passagem_uuid: string | null;
  status: string;
}

export class DSS extends Model<DSSAttributes, Optional<DSSAttributes, 'id' | 'uuid' | 'status' | 'facilitador_id' | 'patio_codigo' | 'observacoes' | 'experiencias_compartilhadas' | 'topicos' | 'participantes' | 'passagem_uuid'>> implements DSSAttributes {
  declare id: number; declare uuid: string; declare data: string; declare turno: string;
  declare tema: string; declare facilitador_id: number | null; declare facilitador_matricula: string;
  declare patio_codigo: string | null; declare observacoes: string | null;
  declare experiencias_compartilhadas: object | null; declare topicos: object | null;
  declare participantes: object | null; declare passagem_uuid: string | null; declare status: string;
}

DSS.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  uuid: { type: DataTypes.CHAR(36), allowNull: false, unique: true, defaultValue: DataTypes.UUIDV4 },
  data: { type: DataTypes.DATEONLY, allowNull: false },
  turno: { type: DataTypes.STRING(1), allowNull: false },
  tema: { type: DataTypes.STRING(200), allowNull: false },
  facilitador_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  facilitador_matricula: { type: DataTypes.STRING(20), allowNull: false },
  patio_codigo: { type: DataTypes.STRING(5), allowNull: true },
  observacoes: { type: DataTypes.TEXT, allowNull: true },
  experiencias_compartilhadas: { type: DataTypes.JSON, allowNull: true },
  topicos: { type: DataTypes.JSON, allowNull: true },
  participantes: { type: DataTypes.JSON, allowNull: true },
  passagem_uuid: { type: DataTypes.CHAR(36), allowNull: true },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'rascunho', validate: { isIn: [['rascunho', 'realizado', 'cancelado']] } },
}, { sequelize, tableName: 'dss', modelName: 'DSS' });

// ── CADASTROS PENDENTES ─────────────────────────────────────────────────

interface CadastroPendenteAttributes {
  id: number; uuid: string; nome: string; matricula: string; funcao: string;
  turno: string | null; horario_turno: string | null; patio_codigo: string | null;
  senha_hash: string; status: string; aprovado_por: string | null; motivo_rejeicao: string | null;
}

export class CadastroPendente extends Model<CadastroPendenteAttributes, Optional<CadastroPendenteAttributes, 'id' | 'uuid' | 'status' | 'turno' | 'horario_turno' | 'patio_codigo' | 'aprovado_por' | 'motivo_rejeicao'>> implements CadastroPendenteAttributes {
  declare id: number; declare uuid: string; declare nome: string; declare matricula: string;
  declare funcao: string; declare turno: string | null; declare horario_turno: string | null;
  declare patio_codigo: string | null; declare senha_hash: string; declare status: string;
  declare aprovado_por: string | null; declare motivo_rejeicao: string | null;
}

CadastroPendente.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  uuid: { type: DataTypes.CHAR(36), allowNull: false, unique: true, defaultValue: DataTypes.UUIDV4 },
  nome: { type: DataTypes.STRING(120), allowNull: false },
  matricula: { type: DataTypes.STRING(20), allowNull: false },
  funcao: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'operador' },
  turno: { type: DataTypes.STRING(1), allowNull: true },
  horario_turno: { type: DataTypes.STRING(20), allowNull: true },
  patio_codigo: { type: DataTypes.STRING(5), allowNull: true },
  senha_hash: { type: DataTypes.STRING(255), allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pendente', validate: { isIn: [['pendente', 'aprovado', 'rejeitado']] } },
  aprovado_por: { type: DataTypes.STRING(20), allowNull: true },
  motivo_rejeicao: { type: DataTypes.TEXT, allowNull: true },
}, { sequelize, tableName: 'cadastros_pendentes', modelName: 'CadastroPendente' });

// ── SENHA RESETS ────────────────────────────────────────────────────────

interface SenhaResetAttributes {
  id: number; uuid: string; usuario_id: number | null; matricula: string;
  status: string; aprovado_por: string | null; nova_senha_hash: string | null;
}

export class SenhaReset extends Model<SenhaResetAttributes, Optional<SenhaResetAttributes, 'id' | 'uuid' | 'usuario_id' | 'status' | 'aprovado_por' | 'nova_senha_hash'>> implements SenhaResetAttributes {
  declare id: number; declare uuid: string; declare usuario_id: number | null;
  declare matricula: string; declare status: string; declare aprovado_por: string | null;
  declare nova_senha_hash: string | null;
}

SenhaReset.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  uuid: { type: DataTypes.CHAR(36), allowNull: false, unique: true, defaultValue: DataTypes.UUIDV4 },
  usuario_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  matricula: { type: DataTypes.STRING(20), allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pendente', validate: { isIn: [['pendente', 'aprovado', 'rejeitado']] } },
  aprovado_por: { type: DataTypes.STRING(20), allowNull: true },
  nova_senha_hash: { type: DataTypes.STRING(255), allowNull: true },
}, { sequelize, tableName: 'senha_resets', modelName: 'SenhaReset' });

// ── USUARIO CONFIG ──────────────────────────────────────────────────────

interface UsuarioConfigAttributes {
  id: number; usuario_id: number; tema: string; idioma: string;
  preferencias_operacionais: object | null; preferencias_notificacao: object | null;
  preferencias_acessibilidade: object | null; adamboot_config: object | null;
}

export class UsuarioConfig extends Model<UsuarioConfigAttributes, Optional<UsuarioConfigAttributes, 'id' | 'tema' | 'idioma' | 'preferencias_operacionais' | 'preferencias_notificacao' | 'preferencias_acessibilidade' | 'adamboot_config'>> implements UsuarioConfigAttributes {
  declare id: number; declare usuario_id: number; declare tema: string; declare idioma: string;
  declare preferencias_operacionais: object | null; declare preferencias_notificacao: object | null;
  declare preferencias_acessibilidade: object | null; declare adamboot_config: object | null;
}

UsuarioConfig.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  usuario_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
  tema: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'automatico' },
  idioma: { type: DataTypes.STRING(5), allowNull: false, defaultValue: 'pt-BR' },
  preferencias_operacionais: { type: DataTypes.JSON, allowNull: true },
  preferencias_notificacao: { type: DataTypes.JSON, allowNull: true },
  preferencias_acessibilidade: { type: DataTypes.JSON, allowNull: true },
  adamboot_config: { type: DataTypes.JSON, allowNull: true },
}, { sequelize, tableName: 'usuario_config', modelName: 'UsuarioConfig' });

// ── ADAMBOOT PERFIS ─────────────────────────────────────────────────────

interface AdamBootPerfilAttributes {
  id: number; usuario_id: number; matricula: string; total_sessoes: number;
  paginas_visitadas: object | null; acoes_realizadas: number;
  nivel_proficiencia: string; ultimo_acesso: Date | null;
}

export class AdamBootPerfil extends Model<AdamBootPerfilAttributes, Optional<AdamBootPerfilAttributes, 'id' | 'total_sessoes' | 'paginas_visitadas' | 'acoes_realizadas' | 'nivel_proficiencia' | 'ultimo_acesso'>> implements AdamBootPerfilAttributes {
  declare id: number; declare usuario_id: number; declare matricula: string;
  declare total_sessoes: number; declare paginas_visitadas: object | null;
  declare acoes_realizadas: number; declare nivel_proficiencia: string;
  declare ultimo_acesso: Date | null;
}

AdamBootPerfil.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  usuario_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
  matricula: { type: DataTypes.STRING(20), allowNull: false },
  total_sessoes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  paginas_visitadas: { type: DataTypes.JSON, allowNull: true },
  acoes_realizadas: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  nivel_proficiencia: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'iniciante', validate: { isIn: [['iniciante', 'basico', 'intermediario', 'avancado', 'especialista']] } },
  ultimo_acesso: { type: DataTypes.DATE, allowNull: true },
}, { sequelize, tableName: 'adamboot_perfis', modelName: 'AdamBootPerfil' });

// ── RELACIONAMENTOS ──────────────────────────────────────────────────────

Passagem.belongsTo(Usuario, { as: 'operadorSai', foreignKey: 'operador_sai_id' });
Passagem.belongsTo(Usuario, { as: 'operadorEntra', foreignKey: 'operador_entra_id' });
AuditTrail.belongsTo(Usuario, { as: 'usuario', foreignKey: 'usuario_id' });
DSS.belongsTo(Usuario, { as: 'facilitador', foreignKey: 'facilitador_id' });
SenhaReset.belongsTo(Usuario, { as: 'usuario', foreignKey: 'usuario_id' });
UsuarioConfig.belongsTo(Usuario, { as: 'usuario', foreignKey: 'usuario_id' });
AdamBootPerfil.belongsTo(Usuario, { as: 'usuario', foreignKey: 'usuario_id' });

import { Patio as PatioModel } from './Patio';
export { OrganizationalTree } from './OrganizationalTree';
export { UsuarioPatio } from './UsuarioPatio';
export { InterYardHandover } from './InterYardHandover';
export { TrainComposition } from './TrainComposition';
export { CompositionHandoverChain } from './CompositionHandoverChain';
export { DailyHandoverStats, OperatorPerformance, YardCompliance } from './AnalyticsModels';
export { ApprovalWorkflow, WorkflowAction } from './WorkflowModels';
export { Railway } from './Railway';
export default { Usuario, Passagem, AuditTrail, Patio: PatioModel, DSS, CadastroPendente, SenhaReset, UsuarioConfig, AdamBootPerfil };
