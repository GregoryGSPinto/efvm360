// ============================================================================
// EFVM360 Backend — Migração MySQL Completa
// Cria todas as tabelas do sistema de gestão de troca de turno ferroviário
// Compatível com MySQL 8.0+ e Azure Database for MySQL
// ============================================================================

import { QueryInterface, DataTypes } from 'sequelize';
import sequelize from '../config/database';

export async function runMigrations(): Promise<void> {
  const qi: QueryInterface = sequelize.getQueryInterface();
  console.log('[EFVM360-MIGRATE] Iniciando migração...');

  // ── 1. USUÁRIOS ────────────────────────────────────────────────────────
  await qi.createTable('usuarios', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    uuid: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      unique: true,
      defaultValue: DataTypes.UUIDV4,
    },
    nome: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    matricula: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    funcao: {
      type: DataTypes.ENUM(
        'maquinista', 'operador', 'oficial', 'oficial_operacao',
        'inspetor', 'gestor', 'supervisor', 'coordenador',
        'administrador', 'outra'
      ),
      allowNull: false,
      defaultValue: 'operador',
    },
    turno: {
      type: DataTypes.ENUM('A', 'B', 'C', 'D'),
      allowNull: true,
    },
    horario_turno: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Formato: 07:00-19:00 ou 07-19',
    },
    senha_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'bcrypt hash (cost 12)',
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    ultimo_login: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    tentativas_login: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    bloqueado_ate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    azure_ad_oid: {
      type: DataTypes.STRING(36),
      allowNull: true,
      unique: true,
      comment: 'Object ID do Azure AD/Entra ID para SSO futuro',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await qi.addIndex('usuarios', ['matricula'], { unique: true, name: 'idx_usuarios_matricula' });
  await qi.addIndex('usuarios', ['funcao'], { name: 'idx_usuarios_funcao' });
  await qi.addIndex('usuarios', ['ativo'], { name: 'idx_usuarios_ativo' });

  console.log('[EFVM360-MIGRATE] ✅ Tabela: usuarios');

  // ── 2. REFRESH TOKENS ──────────────────────────────────────────────────
  await qi.createTable('refresh_tokens', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    usuario_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'usuarios', key: 'id' },
      onDelete: 'CASCADE',
    },
    token_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    device_info: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    revoked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await qi.addIndex('refresh_tokens', ['usuario_id'], { name: 'idx_rt_usuario' });
  await qi.addIndex('refresh_tokens', ['token_hash'], { name: 'idx_rt_hash' });
  await qi.addIndex('refresh_tokens', ['expires_at'], { name: 'idx_rt_expires' });

  console.log('[EFVM360-MIGRATE] ✅ Tabela: refresh_tokens');

  // ── 3. PASSAGENS DE SERVIÇO ────────────────────────────────────────────
  await qi.createTable('passagens', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    uuid: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      unique: true,
      defaultValue: DataTypes.UUIDV4,
    },
    // Cabeçalho
    data_passagem: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    dss: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    turno: {
      type: DataTypes.ENUM('A', 'B', 'C', 'D'),
      allowNull: false,
    },
    horario_turno: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    // Referência aos operadores
    operador_sai_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'usuarios', key: 'id' },
      onDelete: 'SET NULL',
    },
    operador_entra_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'usuarios', key: 'id' },
      onDelete: 'SET NULL',
    },
    // Dados do formulário (JSON completo)
    dados_patio_cima: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Array de linhas do pátio de cima',
    },
    dados_patio_baixo: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Array de linhas do pátio de baixo',
    },
    dados_equipamentos: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    dados_seguranca_manobras: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    dados_pontos_atencao: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    dados_intervencoes: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    dados_sala_5s: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    // Assinaturas
    assinatura_sai_confirmado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    assinatura_sai_hash: {
      type: DataTypes.STRING(128),
      allowNull: true,
      comment: 'SHA-256 do formulário no momento da assinatura de saída',
    },
    assinatura_sai_timestamp: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    assinatura_entra_confirmado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    assinatura_entra_hash: {
      type: DataTypes.STRING(128),
      allowNull: true,
      comment: 'SHA-256 do formulário no momento da assinatura de entrada',
    },
    assinatura_entra_timestamp: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Status
    status: {
      type: DataTypes.ENUM('rascunho', 'assinado_parcial', 'assinado_completo', 'arquivado'),
      allowNull: false,
      defaultValue: 'rascunho',
    },
    // Hash de integridade total
    hash_integridade: {
      type: DataTypes.STRING(128),
      allowNull: true,
      comment: 'SHA-256 de todo o formulário para verificação de integridade',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await qi.addIndex('passagens', ['data_passagem'], { name: 'idx_pass_data' });
  await qi.addIndex('passagens', ['turno'], { name: 'idx_pass_turno' });
  await qi.addIndex('passagens', ['status'], { name: 'idx_pass_status' });
  await qi.addIndex('passagens', ['operador_sai_id'], { name: 'idx_pass_op_sai' });
  await qi.addIndex('passagens', ['operador_entra_id'], { name: 'idx_pass_op_entra' });
  await qi.addIndex('passagens', ['data_passagem', 'turno'], { name: 'idx_pass_data_turno' });

  console.log('[EFVM360-MIGRATE] ✅ Tabela: passagens');

  // ── 4. AUDIT TRAIL (append-only) ──────────────────────────────────────
  await qi.createTable('audit_trail', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    uuid: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      unique: true,
      defaultValue: DataTypes.UUIDV4,
    },
    usuario_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'usuarios', key: 'id' },
      onDelete: 'SET NULL',
    },
    matricula: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    acao: {
      type: DataTypes.ENUM(
        'LOGIN', 'LOGOUT', 'LOGIN_FALHA', 'PASSAGEM_CRIADA',
        'PASSAGEM_ASSINADA', 'PASSAGEM_EXPORTADA', 'SENHA_ALTERADA',
        'USUARIO_CRIADO', 'USUARIO_EDITADO', 'TAMPERING_DETECTADO',
        'SESSAO_EXPIRADA', 'INTEGRIDADE_VERIFICADA'
      ),
      allowNull: false,
    },
    recurso: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    detalhes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    // Chain integrity (blockchain-like)
    hash_anterior: {
      type: DataTypes.STRING(128),
      allowNull: true,
      comment: 'SHA-256 do registro anterior — garante integridade da cadeia',
    },
    hash_registro: {
      type: DataTypes.STRING(128),
      allowNull: false,
      comment: 'SHA-256 deste registro',
    },
    created_at: {
      type: DataTypes.DATE(3), // Precisão de milissegundos
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await qi.addIndex('audit_trail', ['usuario_id'], { name: 'idx_audit_usuario' });
  await qi.addIndex('audit_trail', ['matricula'], { name: 'idx_audit_matricula' });
  await qi.addIndex('audit_trail', ['acao'], { name: 'idx_audit_acao' });
  await qi.addIndex('audit_trail', ['created_at'], { name: 'idx_audit_data' });
  await qi.addIndex('audit_trail', ['recurso'], { name: 'idx_audit_recurso' });

  // TRIGGER: Impedir UPDATE e DELETE na audit_trail (append-only)
  // MySQL não suporta FOR EACH STATEMENT, então usamos trigger por linha
  await sequelize.query(`
    CREATE TRIGGER trg_audit_no_update
    BEFORE UPDATE ON audit_trail
    FOR EACH ROW
    BEGIN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'AUDIT_TRAIL: UPDATE não permitido — registros são imutáveis';
    END
  `);

  await sequelize.query(`
    CREATE TRIGGER trg_audit_no_delete
    BEFORE DELETE ON audit_trail
    FOR EACH ROW
    BEGIN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'AUDIT_TRAIL: DELETE não permitido — registros são imutáveis';
    END
  `);

  console.log('[EFVM360-MIGRATE] ✅ Tabela: audit_trail (append-only com triggers)');

  // ── 5. ALERTAS OPERACIONAIS ────────────────────────────────────────────
  await qi.createTable('alertas_operacionais', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    passagem_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'passagens', key: 'id' },
      onDelete: 'SET NULL',
    },
    criado_por_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'usuarios', key: 'id' },
      onDelete: 'CASCADE',
    },
    tipo: {
      type: DataTypes.ENUM('critico', 'atencao', 'informativo'),
      allowNull: false,
    },
    categoria: {
      type: DataTypes.ENUM(
        'linha_interditada', 'equipamento_defeito', 'manobra_pendente',
        'seguranca', 'manutencao', 'operacional', 'outro'
      ),
      allowNull: false,
    },
    titulo: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    resolvido_por_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'usuarios', key: 'id' },
      onDelete: 'SET NULL',
    },
    resolvido_em: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await qi.addIndex('alertas_operacionais', ['ativo'], { name: 'idx_alertas_ativo' });
  await qi.addIndex('alertas_operacionais', ['tipo'], { name: 'idx_alertas_tipo' });
  await qi.addIndex('alertas_operacionais', ['passagem_id'], { name: 'idx_alertas_passagem' });

  console.log('[EFVM360-MIGRATE] ✅ Tabela: alertas_operacionais');

  // ── 6. HISTÓRICO 5S ───────────────────────────────────────────────────
  await qi.createTable('avaliacoes_5s', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    passagem_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'passagens', key: 'id' },
      onDelete: 'CASCADE',
    },
    avaliador_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: 'usuarios', key: 'id' },
      onDelete: 'CASCADE',
    },
    dados_avaliacao: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'JSON com todas as notas e observações 5S',
    },
    pontuacao_geral: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await qi.addIndex('avaliacoes_5s', ['passagem_id'], { name: 'idx_5s_passagem' });
  await qi.addIndex('avaliacoes_5s', ['avaliador_id'], { name: 'idx_5s_avaliador' });

  console.log('[EFVM360-MIGRATE] ✅ Tabela: avaliacoes_5s');

  console.log('[EFVM360-MIGRATE] ══════════════════════════════════════════');
  console.log('[EFVM360-MIGRATE] ✅ MIGRAÇÃO COMPLETA — 6 tabelas criadas');
  console.log('[EFVM360-MIGRATE] ══════════════════════════════════════════');
}
