// ============================================================================
// EFVM360 Backend — Migration 004: Tabela de Pátios
// Gerenciamento dinâmico de pátios com seed dos padrão
// ============================================================================

import { QueryInterface, DataTypes } from 'sequelize';
import sequelize from '../config/database';

export async function runMigration004(): Promise<void> {
  const qi: QueryInterface = sequelize.getQueryInterface();
  console.log('[EFVM360-MIGRATE-004] Iniciando migração de Pátios...');

  // ── Tabela patios ─────────────────────────────────────────────────────
  await qi.createTable('patios', {
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
    codigo: {
      type: DataTypes.STRING(5),
      allowNull: false,
      unique: true,
      comment: 'Código curto do pátio (max 5 chars, alfanumérico)',
    },
    nome: {
      type: DataTypes.STRING(120),
      allowNull: false,
      comment: 'Nome completo do pátio',
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    padrao: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'true = pátio padrão do sistema, false = custom',
    },
    criado_por: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Matrícula do criador (null para pátios padrão)',
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

  await qi.addIndex('patios', ['codigo'], { unique: true, name: 'uk_patios_codigo' });
  await qi.addIndex('patios', ['ativo'], { name: 'idx_patios_ativo' });

  console.log('[EFVM360-MIGRATE-004] ✅ Tabela patios criada');

  // ── Seed: Pátios padrão ───────────────────────────────────────────────
  const now = new Date();
  await qi.bulkInsert('patios', [
    { uuid: crypto.randomUUID(), codigo: 'VFZ', nome: 'Pátio do Fazendão (Flexal)', ativo: true, padrao: true, criado_por: null, created_at: now, updated_at: now },
    { uuid: crypto.randomUUID(), codigo: 'VBR', nome: 'Barão de Cocais', ativo: true, padrao: true, criado_por: null, created_at: now, updated_at: now },
    { uuid: crypto.randomUUID(), codigo: 'VCS', nome: 'Costa Lacerda', ativo: false, padrao: true, criado_por: null, created_at: now, updated_at: now },
    { uuid: crypto.randomUUID(), codigo: 'P6', nome: 'Pedro Nolasco', ativo: true, padrao: true, criado_por: null, created_at: now, updated_at: now },
    { uuid: crypto.randomUUID(), codigo: 'VTO', nome: 'Tubarão Outbound', ativo: true, padrao: true, criado_por: null, created_at: now, updated_at: now },
  ]);

  console.log('[EFVM360-MIGRATE-004] ✅ Seed de 5 pátios padrão (VCS inativo)');
  console.log('[EFVM360-MIGRATE-004] ══════════════════════════════════════════');
  console.log('[EFVM360-MIGRATE-004] ✅ MIGRAÇÃO 004 COMPLETA');
  console.log('[EFVM360-MIGRATE-004] ══════════════════════════════════════════');
}
