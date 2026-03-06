// ============================================================================
// EFVM360 Backend — Migration 005: Tabelas faltantes para alinhamento completo
// DSS, Cadastros Pendentes, Senha Resets, Config Usuário, AdamBoot,
// Notificações, Error Reports, Seed de Usuários Demo
// ============================================================================

import { QueryInterface, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

export async function runMigration005(): Promise<void> {
  const qi: QueryInterface = sequelize.getQueryInterface();
  console.log('[EFVM360-MIGRATE-005] Iniciando migração de tabelas faltantes...');

  // ── 1. DSS (Diálogo de Segurança) ──────────────────────────────────────
  await qi.createTable('dss', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.CHAR(36), allowNull: false, unique: true, defaultValue: DataTypes.UUIDV4 },
    data: { type: DataTypes.DATEONLY, allowNull: false },
    turno: { type: DataTypes.ENUM('A', 'B', 'C', 'D'), allowNull: false },
    tema: { type: DataTypes.STRING(200), allowNull: false, comment: 'Tema principal do DSS' },
    facilitador_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, references: { model: 'usuarios', key: 'id' }, onDelete: 'SET NULL' },
    facilitador_matricula: { type: DataTypes.STRING(20), allowNull: false },
    patio_codigo: { type: DataTypes.STRING(5), allowNull: true, comment: 'Código do pátio onde foi realizado' },
    observacoes: { type: DataTypes.TEXT, allowNull: true },
    experiencias_compartilhadas: { type: DataTypes.JSON, allowNull: true, comment: 'Array de experiências dos participantes' },
    topicos: { type: DataTypes.JSON, allowNull: true, comment: 'Array de tópicos abordados [{titulo, descricao, tipo}]' },
    participantes: { type: DataTypes.JSON, allowNull: true, comment: 'Array de participantes [{matricula, nome, presente}]' },
    passagem_uuid: { type: DataTypes.CHAR(36), allowNull: true, comment: 'UUID da passagem vinculada (se houver)' },
    status: { type: DataTypes.ENUM('rascunho', 'concluido'), allowNull: false, defaultValue: 'rascunho' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });

  await qi.addIndex('dss', ['data'], { name: 'idx_dss_data' });
  await qi.addIndex('dss', ['turno'], { name: 'idx_dss_turno' });
  await qi.addIndex('dss', ['facilitador_id'], { name: 'idx_dss_facilitador' });
  await qi.addIndex('dss', ['patio_codigo'], { name: 'idx_dss_patio' });
  await qi.addIndex('dss', ['status'], { name: 'idx_dss_status' });
  await qi.addIndex('dss', ['data', 'turno'], { name: 'idx_dss_data_turno' });

  console.log('[EFVM360-MIGRATE-005] ✅ Tabela: dss');

  // ── 2. CADASTROS PENDENTES ─────────────────────────────────────────────
  await qi.createTable('cadastros_pendentes', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.CHAR(36), allowNull: false, unique: true, defaultValue: DataTypes.UUIDV4 },
    nome: { type: DataTypes.STRING(120), allowNull: false },
    matricula: { type: DataTypes.STRING(20), allowNull: false },
    funcao: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'operador' },
    turno: { type: DataTypes.STRING(1), allowNull: true },
    horario_turno: { type: DataTypes.STRING(20), allowNull: true },
    patio_codigo: { type: DataTypes.STRING(5), allowNull: true },
    senha_hash: { type: DataTypes.STRING(255), allowNull: false },
    status: { type: DataTypes.ENUM('pendente', 'aprovado', 'rejeitado'), allowNull: false, defaultValue: 'pendente' },
    aprovado_por: { type: DataTypes.STRING(20), allowNull: true, comment: 'Matrícula do aprovador' },
    motivo_rejeicao: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });

  await qi.addIndex('cadastros_pendentes', ['status'], { name: 'idx_cad_pend_status' });
  await qi.addIndex('cadastros_pendentes', ['matricula'], { name: 'idx_cad_pend_mat' });
  await qi.addIndex('cadastros_pendentes', ['patio_codigo'], { name: 'idx_cad_pend_patio' });

  console.log('[EFVM360-MIGRATE-005] ✅ Tabela: cadastros_pendentes');

  // ── 3. SENHA RESETS ────────────────────────────────────────────────────
  await qi.createTable('senha_resets', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.CHAR(36), allowNull: false, unique: true, defaultValue: DataTypes.UUIDV4 },
    usuario_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, references: { model: 'usuarios', key: 'id' }, onDelete: 'SET NULL' },
    matricula: { type: DataTypes.STRING(20), allowNull: false },
    status: { type: DataTypes.ENUM('pendente', 'aprovado', 'rejeitado'), allowNull: false, defaultValue: 'pendente' },
    aprovado_por: { type: DataTypes.STRING(20), allowNull: true },
    nova_senha_hash: { type: DataTypes.STRING(255), allowNull: true, comment: 'Hash da nova senha (gerada na aprovação)' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });

  await qi.addIndex('senha_resets', ['status'], { name: 'idx_sr_status' });
  await qi.addIndex('senha_resets', ['matricula'], { name: 'idx_sr_mat' });

  console.log('[EFVM360-MIGRATE-005] ✅ Tabela: senha_resets');

  // ── 4. CONFIGURAÇÕES DO USUÁRIO ────────────────────────────────────────
  await qi.createTable('usuario_config', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    usuario_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, references: { model: 'usuarios', key: 'id' }, onDelete: 'CASCADE' },
    tema: { type: DataTypes.ENUM('claro', 'escuro', 'automatico'), allowNull: false, defaultValue: 'automatico' },
    idioma: { type: DataTypes.STRING(5), allowNull: false, defaultValue: 'pt-BR' },
    preferencias_operacionais: { type: DataTypes.JSON, allowNull: true, comment: 'patio_padrao, turno_padrao, etc.' },
    preferencias_notificacao: { type: DataTypes.JSON, allowNull: true, comment: 'alertas_criticos, alertas_gerais, dss_lembretes, etc.' },
    preferencias_acessibilidade: { type: DataTypes.JSON, allowNull: true, comment: 'alto_contraste, reducao_animacoes, tamanho_fonte' },
    adamboot_config: { type: DataTypes.JSON, allowNull: true, comment: 'nivel_detalhe, sugestoes_ativas, etc.' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });

  console.log('[EFVM360-MIGRATE-005] ✅ Tabela: usuario_config');

  // ── 5. ADAMBOOT PERFIS ─────────────────────────────────────────────────
  await qi.createTable('adamboot_perfis', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    usuario_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, references: { model: 'usuarios', key: 'id' }, onDelete: 'CASCADE' },
    matricula: { type: DataTypes.STRING(20), allowNull: false },
    total_sessoes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    paginas_visitadas: { type: DataTypes.JSON, allowNull: true, comment: 'Record<string, number> de acessos por página' },
    acoes_realizadas: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    nivel_proficiencia: { type: DataTypes.ENUM('iniciante', 'intermediario', 'avancado'), allowNull: false, defaultValue: 'iniciante' },
    ultimo_acesso: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });

  await qi.addIndex('adamboot_perfis', ['matricula'], { unique: true, name: 'uk_adamboot_mat' });

  console.log('[EFVM360-MIGRATE-005] ✅ Tabela: adamboot_perfis');

  // ── 6. ADAMBOOT CONVERSAS ──────────────────────────────────────────────
  await qi.createTable('adamboot_conversas', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    usuario_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, references: { model: 'usuarios', key: 'id' }, onDelete: 'CASCADE' },
    pagina: { type: DataTypes.STRING(50), allowNull: true, comment: 'Página onde a conversa ocorreu' },
    remetente: { type: DataTypes.ENUM('usuario', 'adamboot'), allowNull: false },
    mensagem: { type: DataTypes.TEXT, allowNull: false },
    created_at: { type: DataTypes.DATE(3), allowNull: false, defaultValue: DataTypes.NOW },
  });

  await qi.addIndex('adamboot_conversas', ['usuario_id'], { name: 'idx_adam_conv_user' });
  await qi.addIndex('adamboot_conversas', ['created_at'], { name: 'idx_adam_conv_date' });

  console.log('[EFVM360-MIGRATE-005] ✅ Tabela: adamboot_conversas');

  // ── 7. NOTIFICAÇÕES ────────────────────────────────────────────────────
  await qi.createTable('notificacoes', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.CHAR(36), allowNull: false, unique: true, defaultValue: DataTypes.UUIDV4 },
    usuario_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, references: { model: 'usuarios', key: 'id' }, onDelete: 'CASCADE' },
    tipo: { type: DataTypes.ENUM('info', 'aviso', 'critico', 'sistema'), allowNull: false, defaultValue: 'info' },
    titulo: { type: DataTypes.STRING(200), allowNull: false },
    mensagem: { type: DataTypes.TEXT, allowNull: true },
    lida: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    link: { type: DataTypes.STRING(500), allowNull: true, comment: 'URL interna para navegação' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });

  await qi.addIndex('notificacoes', ['usuario_id', 'lida'], { name: 'idx_notif_user_lida' });
  await qi.addIndex('notificacoes', ['created_at'], { name: 'idx_notif_data' });

  console.log('[EFVM360-MIGRATE-005] ✅ Tabela: notificacoes');

  // ── 8. ERROR REPORTS ───────────────────────────────────────────────────
  await qi.createTable('error_reports', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.CHAR(36), allowNull: false, unique: true, defaultValue: DataTypes.UUIDV4 },
    usuario_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, references: { model: 'usuarios', key: 'id' }, onDelete: 'SET NULL' },
    tipo: { type: DataTypes.STRING(50), allowNull: false, comment: 'javascript_error, api_error, render_error, etc.' },
    mensagem: { type: DataTypes.TEXT, allowNull: false },
    stack: { type: DataTypes.TEXT, allowNull: true },
    pagina: { type: DataTypes.STRING(200), allowNull: true },
    dispositivo: { type: DataTypes.STRING(500), allowNull: true, comment: 'User-Agent do browser' },
    status: { type: DataTypes.ENUM('novo', 'investigando', 'resolvido', 'ignorado'), allowNull: false, defaultValue: 'novo' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });

  await qi.addIndex('error_reports', ['status'], { name: 'idx_err_status' });
  await qi.addIndex('error_reports', ['created_at'], { name: 'idx_err_data' });

  console.log('[EFVM360-MIGRATE-005] ✅ Tabela: error_reports');

  // ── 9. SEED: Usuários Demo (36 operadores + admin + suporte) ───────────
  console.log('[EFVM360-MIGRATE-005] Gerando hashes bcrypt para seed (pode levar alguns segundos)...');

  const defaultHash = await bcrypt.hash('123456', BCRYPT_ROUNDS);
  const suporteHash = await bcrypt.hash('suporte360', BCRYPT_ROUNDS);
  const now = new Date();

  const seedUsers = [
    // EFVM360 — Pátio de Fazendão
    { nome: 'Carlos Eduardo Silva',      matricula: 'VFZ1001', funcao: 'maquinista', turno: 'A', horario_turno: '07-19', senha_hash: defaultHash },
    { nome: 'Roberto Almeida Santos',     matricula: 'VFZ1002', funcao: 'maquinista', turno: 'A', horario_turno: '07-19', senha_hash: defaultHash },
    { nome: 'Marcos Vinicius Souza',      matricula: 'VFZ1003', funcao: 'maquinista', turno: 'B', horario_turno: '19-07', senha_hash: defaultHash },
    { nome: 'Anderson Pereira Lima',      matricula: 'VFZ1004', funcao: 'maquinista', turno: 'B', horario_turno: '19-07', senha_hash: defaultHash },
    { nome: 'Diego Ferreira Gomes',       matricula: 'VFZ1005', funcao: 'oficial',    turno: 'A', horario_turno: '07-19', senha_hash: defaultHash },
    { nome: 'Ricardo Mendes Ferreira',    matricula: 'VFZ2001', funcao: 'inspetor',   turno: null, horario_turno: null,    senha_hash: defaultHash },
    { nome: 'Paulo Henrique Barbosa',     matricula: 'VFZ3001', funcao: 'gestor',     turno: null, horario_turno: null,    senha_hash: defaultHash },
    // VBR — Barão de Cocais
    { nome: 'Thiago Oliveira Costa',      matricula: 'VBR1001', funcao: 'maquinista', turno: 'A', horario_turno: '07-19', senha_hash: defaultHash },
    { nome: 'Lucas Martins Rocha',        matricula: 'VBR1002', funcao: 'maquinista', turno: 'A', horario_turno: '07-19', senha_hash: defaultHash },
    { nome: 'Gustavo Henrique Dias',      matricula: 'VBR1003', funcao: 'maquinista', turno: 'B', horario_turno: '19-07', senha_hash: defaultHash },
    { nome: 'Rafael Souza Nascimento',    matricula: 'VBR1004', funcao: 'maquinista', turno: 'B', horario_turno: '19-07', senha_hash: defaultHash },
    { nome: 'Bruno Carvalho Mendes',      matricula: 'VBR1005', funcao: 'oficial',    turno: 'A', horario_turno: '07-19', senha_hash: defaultHash },
    { nome: 'Alexandre Ribeiro Pinto',    matricula: 'VBR2001', funcao: 'inspetor',   turno: null, horario_turno: null,    senha_hash: defaultHash },
    { nome: 'Marcelo Augusto Reis',       matricula: 'VBR3001', funcao: 'gestor',     turno: null, horario_turno: null,    senha_hash: defaultHash },
    // VCS — Costa Lacerda
    { nome: 'Wellington Silva Moreira',   matricula: 'VCS1001', funcao: 'maquinista', turno: 'A', horario_turno: '07-19', senha_hash: defaultHash },
    { nome: 'Rodrigo Alves Pereira',      matricula: 'VCS1002', funcao: 'maquinista', turno: 'A', horario_turno: '07-19', senha_hash: defaultHash },
    { nome: 'Fabio Nogueira Santos',      matricula: 'VCS1003', funcao: 'maquinista', turno: 'B', horario_turno: '19-07', senha_hash: defaultHash },
    { nome: 'Leandro Costa Vieira',       matricula: 'VCS1004', funcao: 'maquinista', turno: 'B', horario_turno: '19-07', senha_hash: defaultHash },
    { nome: 'Eduardo Teixeira Lima',      matricula: 'VCS1005', funcao: 'oficial',    turno: 'A', horario_turno: '07-19', senha_hash: defaultHash },
    { nome: 'Fernando Costa Oliveira',    matricula: 'VCS2001', funcao: 'inspetor',   turno: null, horario_turno: null,    senha_hash: defaultHash },
    { nome: 'Sergio Magalhaes Junior',    matricula: 'VCS3001', funcao: 'gestor',     turno: null, horario_turno: null,    senha_hash: defaultHash },
    // P6 — Pedro Nolasco
    { nome: 'Adriano Batista Correia',    matricula: 'P61001',  funcao: 'maquinista', turno: 'A', horario_turno: '07-19', senha_hash: defaultHash },
    { nome: 'Vinicius Araujo Moura',      matricula: 'P61002',  funcao: 'maquinista', turno: 'A', horario_turno: '07-19', senha_hash: defaultHash },
    { nome: 'Renato Ferreira Lopes',      matricula: 'P61003',  funcao: 'maquinista', turno: 'B', horario_turno: '19-07', senha_hash: defaultHash },
    { nome: 'Claudio Pereira Duarte',     matricula: 'P61004',  funcao: 'maquinista', turno: 'B', horario_turno: '19-07', senha_hash: defaultHash },
    { nome: 'Marcio Ramos Fonseca',       matricula: 'P61005',  funcao: 'oficial',    turno: 'A', horario_turno: '07-19', senha_hash: defaultHash },
    { nome: 'Jose Ricardo Andrade',       matricula: 'P62001',  funcao: 'inspetor',   turno: null, horario_turno: null,    senha_hash: defaultHash },
    { nome: 'Antonio Marcos Cardoso',     matricula: 'P63001',  funcao: 'gestor',     turno: null, horario_turno: null,    senha_hash: defaultHash },
    // VTO — Tubarão Outbound
    { nome: 'Daniel Gomes Freitas',       matricula: 'VTO1001', funcao: 'maquinista', turno: 'A', horario_turno: '07-19', senha_hash: defaultHash },
    { nome: 'Michel Santos Prado',        matricula: 'VTO1002', funcao: 'maquinista', turno: 'A', horario_turno: '07-19', senha_hash: defaultHash },
    { nome: 'Felipe Nunes Barros',        matricula: 'VTO1003', funcao: 'maquinista', turno: 'B', horario_turno: '19-07', senha_hash: defaultHash },
    { nome: 'Henrique Campos Melo',       matricula: 'VTO1004', funcao: 'maquinista', turno: 'B', horario_turno: '19-07', senha_hash: defaultHash },
    { nome: 'Rogerio Almeida Cunha',      matricula: 'VTO1005', funcao: 'oficial',    turno: 'A', horario_turno: '07-19', senha_hash: defaultHash },
    { nome: 'Gilberto Souza Braga',       matricula: 'VTO2001', funcao: 'inspetor',   turno: null, horario_turno: null,    senha_hash: defaultHash },
    { nome: 'Osvaldo Ramos Teixeira',     matricula: 'VTO3001', funcao: 'gestor',     turno: null, horario_turno: null,    senha_hash: defaultHash },
    // Admin + Suporte
    { nome: 'Gregory Administrador',      matricula: 'ADM9001', funcao: 'administrador', turno: null, horario_turno: null, senha_hash: defaultHash },
    { nome: 'Suporte Tecnico',            matricula: 'SUP0001', funcao: 'suporte',       turno: null, horario_turno: null, senha_hash: suporteHash },
  ];

  for (const user of seedUsers) {
    const [existing] = await sequelize.query(
      `SELECT id FROM usuarios WHERE matricula = '${user.matricula}' LIMIT 1`
    ) as [Array<{ id: number }>, unknown];

    if (existing.length === 0) {
      await qi.bulkInsert('usuarios', [{
        uuid: crypto.randomUUID(),
        nome: user.nome,
        matricula: user.matricula,
        funcao: user.funcao,
        turno: user.turno,
        horario_turno: user.horario_turno,
        senha_hash: user.senha_hash,
        ativo: true,
        tentativas_login: 0,
        created_at: now,
        updated_at: now,
      }]);
    }
  }

  console.log('[EFVM360-MIGRATE-005] ✅ Seed: 37 usuários demo (idempotente)');

  console.log('[EFVM360-MIGRATE-005] ══════════════════════════════════════════');
  console.log('[EFVM360-MIGRATE-005] ✅ MIGRAÇÃO 005 COMPLETA — 8 tabelas + seed');
  console.log('[EFVM360-MIGRATE-005] ══════════════════════════════════════════');
}
