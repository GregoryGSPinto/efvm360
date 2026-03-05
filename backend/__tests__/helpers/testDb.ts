// ============================================================================
// Test Helper — SQLite In-Memory Database for Integration Tests
// ============================================================================

import { Sequelize, DataTypes, Model, Optional } from 'sequelize';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// Create an in-memory SQLite instance
export const testSequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true,
  },
});

// ── RE-DEFINE MODELS ON TEST SEQUELIZE ──────────────────────────────────

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

export class TestUsuario extends Model<UsuarioAttributes, Optional<UsuarioAttributes, 'id' | 'uuid' | 'ativo' | 'ultimo_login' | 'tentativas_login' | 'bloqueado_ate' | 'azure_ad_oid' | 'primary_yard'>> implements UsuarioAttributes {
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

TestUsuario.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true, defaultValue: DataTypes.UUIDV4 },
  nome: { type: DataTypes.STRING(120), allowNull: false },
  matricula: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  funcao: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'operador' },
  turno: { type: DataTypes.STRING(1), allowNull: true },
  horario_turno: { type: DataTypes.STRING(10), allowNull: true },
  primary_yard: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'VFZ' },
  senha_hash: { type: DataTypes.STRING(255), allowNull: false },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  ultimo_login: { type: DataTypes.DATE, allowNull: true },
  tentativas_login: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  bloqueado_ate: { type: DataTypes.DATE, allowNull: true },
  azure_ad_oid: { type: DataTypes.STRING(36), allowNull: true, unique: true },
}, { sequelize: testSequelize, tableName: 'usuarios', modelName: 'Usuario' });

export class TestPassagem extends Model<PassagemAttributes, Optional<PassagemAttributes, 'id' | 'uuid' | 'status' | 'hash_integridade'>> implements PassagemAttributes {
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

TestPassagem.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true, defaultValue: DataTypes.UUIDV4 },
  data_passagem: { type: DataTypes.DATEONLY, allowNull: false },
  dss: { type: DataTypes.STRING(50), allowNull: true },
  turno: { type: DataTypes.STRING(1), allowNull: false },
  horario_turno: { type: DataTypes.STRING(10), allowNull: false },
  operador_sai_id: { type: DataTypes.INTEGER, allowNull: true },
  operador_entra_id: { type: DataTypes.INTEGER, allowNull: true },
  dados_patio_cima: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
  dados_patio_baixo: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
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
}, { sequelize: testSequelize, tableName: 'passagens', modelName: 'Passagem' });

export class TestAuditTrail extends Model<AuditTrailAttributes, Optional<AuditTrailAttributes, 'id' | 'uuid' | 'usuario_id' | 'detalhes' | 'ip_address' | 'user_agent' | 'hash_anterior'>> implements AuditTrailAttributes {
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

TestAuditTrail.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true, defaultValue: DataTypes.UUIDV4 },
  usuario_id: { type: DataTypes.INTEGER, allowNull: true },
  matricula: { type: DataTypes.STRING(20), allowNull: false },
  acao: { type: DataTypes.STRING(50), allowNull: false },
  recurso: { type: DataTypes.STRING(100), allowNull: false },
  detalhes: { type: DataTypes.TEXT, allowNull: true },
  ip_address: { type: DataTypes.STRING(45), allowNull: true },
  user_agent: { type: DataTypes.STRING(500), allowNull: true },
  hash_anterior: { type: DataTypes.STRING(128), allowNull: true },
  hash_registro: { type: DataTypes.STRING(128), allowNull: false },
}, { sequelize: testSequelize, tableName: 'audit_trail', modelName: 'AuditTrail', updatedAt: false });

// Relationships
TestPassagem.belongsTo(TestUsuario, { as: 'operadorSai', foreignKey: 'operador_sai_id' });
TestPassagem.belongsTo(TestUsuario, { as: 'operadorEntra', foreignKey: 'operador_entra_id' });
TestAuditTrail.belongsTo(TestUsuario, { as: 'usuario', foreignKey: 'usuario_id' });

// Also create the refresh_tokens table (used in raw queries)
export const createRefreshTokensTable = async () => {
  await testSequelize.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      token_hash VARCHAR(128) NOT NULL,
      device_info VARCHAR(500),
      ip_address VARCHAR(45),
      revoked BOOLEAN DEFAULT 0,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `);
};

// ── DB LIFECYCLE HELPERS ────────────────────────────────────────────────

export const setupTestDb = async () => {
  await testSequelize.sync({ force: true });
  await createRefreshTokensTable();
};

export const teardownTestDb = async () => {
  await testSequelize.close();
};

export const clearTestDb = async () => {
  await testSequelize.query('DELETE FROM refresh_tokens');
  await TestAuditTrail.destroy({ where: {}, force: true });
  await TestPassagem.destroy({ where: {}, force: true });
  await TestUsuario.destroy({ where: {}, force: true });
};

// ── SEED HELPERS ────────────────────────────────────────────────────────

const BCRYPT_ROUNDS_TEST = 4; // Fast rounds for tests

export const createTestUser = async (overrides: Partial<UsuarioAttributes> = {}) => {
  const uuid = overrides.uuid || uuidv4();
  const senha = overrides.senha_hash || await bcrypt.hash('Vale@2024', BCRYPT_ROUNDS_TEST);
  return TestUsuario.create({
    uuid,
    nome: overrides.nome || 'Operador Teste',
    matricula: overrides.matricula || 'VFZ1001',
    funcao: overrides.funcao || 'operador',
    turno: overrides.turno || 'A',
    horario_turno: overrides.horario_turno || '07:00-15:00',
    senha_hash: senha,
    ativo: overrides.ativo ?? true,
    tentativas_login: overrides.tentativas_login ?? 0,
    bloqueado_ate: overrides.bloqueado_ate || null,
    azure_ad_oid: overrides.azure_ad_oid || null,
    ultimo_login: overrides.ultimo_login || null,
  });
};

export const createTestAdmin = async (overrides: Partial<UsuarioAttributes> = {}) => {
  return createTestUser({
    nome: 'Admin Teste',
    matricula: 'ADM9001',
    funcao: 'administrador',
    ...overrides,
  });
};
