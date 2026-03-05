// ============================================================================
// VFZ Backend — Migration 015: Webhooks & Webhook Deliveries
// Integration APIs — Phase 3D
// ============================================================================

import { QueryInterface, DataTypes } from 'sequelize';
import sequelize from '../config/database';

export async function runMigration015(): Promise<void> {
  const qi: QueryInterface = sequelize.getQueryInterface();
  console.log('[VFZ-MIGRATE-015] Iniciando migração de webhooks...');

  // ── 1. WEBHOOKS ──────────────────────────────────────────────────────────
  await qi.createTable('webhooks', {
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
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING(2048),
      allowNull: false,
    },
    events: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Array of event names this webhook subscribes to',
    },
    secret: {
      type: DataTypes.STRING(64),
      allowNull: false,
      comment: 'HMAC signing secret (hex)',
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    max_retries: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 3,
    },
    backoff_ms: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1000,
    },
    created_by: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Matricula of the user who created the webhook',
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

  await qi.addIndex('webhooks', ['active'], { name: 'idx_wh_active' });
  await qi.addIndex('webhooks', ['created_by'], { name: 'idx_wh_created_by' });

  console.log('[VFZ-MIGRATE-015] Tabela: webhooks');

  // ── 2. WEBHOOK DELIVERIES ────────────────────────────────────────────────
  await qi.createTable('webhook_deliveries', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    uuid: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      unique: true,
    },
    webhook_uuid: {
      type: DataTypes.CHAR(36),
      allowNull: false,
    },
    event: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'success', 'failed'),
      allowNull: false,
    },
    attempts: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    last_status_code: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    last_error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await qi.addIndex('webhook_deliveries', ['webhook_uuid'], { name: 'idx_whd_webhook' });
  await qi.addIndex('webhook_deliveries', ['event'], { name: 'idx_whd_event' });
  await qi.addIndex('webhook_deliveries', ['status'], { name: 'idx_whd_status' });

  console.log('[VFZ-MIGRATE-015] Tabela: webhook_deliveries');

  console.log('[VFZ-MIGRATE-015] ══════════════════════════════════════════');
  console.log('[VFZ-MIGRATE-015] MIGRACAO 015 COMPLETA — webhooks + deliveries');
  console.log('[VFZ-MIGRATE-015] ══════════════════════════════════════════');
}
