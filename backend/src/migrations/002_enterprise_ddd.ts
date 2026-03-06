// ============================================================================
// EFVM360 Backend — Migration 002: Enterprise DDD Tables
// EFVM Pátio 360 — Event Sourcing, Yard Configuration, Inspections
// ============================================================================

import { QueryInterface, DataTypes } from 'sequelize';
import sequelize from '../config/database';

export async function runMigration002(): Promise<void> {
  const qi: QueryInterface = sequelize.getQueryInterface();
  console.log('[EFVM360-MIGRATE-002] Iniciando migração Enterprise DDD...');

  // ── 1. EVENT STORE (Source of Truth) ──────────────────────────────────
  await qi.createTable('event_store', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    event_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      unique: true,
      comment: 'UUID v4 — idempotency key',
    },
    aggregate_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
    },
    aggregate_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'ServicePass, YardConfiguration, LocomotiveInspection',
    },
    event_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'ServicePassCreated, WeighingExcessDetected, etc.',
    },
    version: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'deviceId, ip, operatorMatricula, yardId',
    },
    created_at: {
      type: DataTypes.DATE(3),
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await qi.addIndex('event_store', ['aggregate_id', 'version'], {
    unique: true,
    name: 'uk_es_aggregate_version',
  });
  await qi.addIndex('event_store', ['event_type'], { name: 'idx_es_event_type' });
  await qi.addIndex('event_store', ['aggregate_type'], { name: 'idx_es_aggregate_type' });
  await qi.addIndex('event_store', ['created_at'], { name: 'idx_es_created_at' });

  // Immutability triggers
  await sequelize.query(`
    CREATE TRIGGER trg_event_store_no_update
    BEFORE UPDATE ON event_store
    FOR EACH ROW
    BEGIN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'EVENT_STORE: UPDATE proibido — eventos são imutáveis';
    END
  `);

  await sequelize.query(`
    CREATE TRIGGER trg_event_store_no_delete
    BEFORE DELETE ON event_store
    FOR EACH ROW
    BEGIN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'EVENT_STORE: DELETE proibido — eventos são imutáveis';
    END
  `);

  console.log('[EFVM360-MIGRATE-002] ✅ event_store (append-only com triggers)');

  // ── 2. SNAPSHOT STORE ─────────────────────────────────────────────────
  await qi.createTable('snapshot_store', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    aggregate_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
    },
    aggregate_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    version: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    state: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Estado completo do aggregate serializado',
    },
    snapshot_at: {
      type: DataTypes.DATE(3),
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await qi.addIndex('snapshot_store', ['aggregate_id', 'aggregate_type'], {
    unique: true,
    name: 'uk_ss_aggregate',
  });

  console.log('[EFVM360-MIGRATE-002] ✅ snapshot_store');

  // ── 3. YARD CONFIGURATIONS (Parametrização por Pátio) ─────────────────
  await qi.createTable('yard_configurations', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    yard_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
    },
    yard_code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      comment: 'Código curto: FZ, TO, BR, CS, P6',
    },
    yard_name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    yard_type: {
      type: DataTypes.ENUM('patio', 'pera', 'terminal'),
      allowNull: false,
    },
    railway: {
      type: DataTypes.ENUM('EFVM', 'EFC'),
      allowNull: false,
      defaultValue: 'EFVM',
    },
    normative_ref: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'PRO-004985 Anexo XX, PRO-040960, etc.',
    },
    config: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'YardConfiguration completa serializada',
    },
    version: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
    },
    valid_from: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    valid_until: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'NULL = configuração vigente',
    },
    updated_by: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Matrícula do responsável pela alteração',
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

  await qi.addIndex('yard_configurations', ['yard_code'], { name: 'idx_yc_code' });
  await qi.addIndex('yard_configurations', ['yard_code', 'version'], {
    unique: true,
    name: 'uk_yc_code_version',
  });

  console.log('[EFVM360-MIGRATE-002] ✅ yard_configurations');

  // ── 4. ANOMALY HISTORY ────────────────────────────────────────────────
  await qi.createTable('anomaly_history', {
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
    service_pass_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
    },
    yard_id: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    anomaly_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    severity: {
      type: DataTypes.ENUM('baixa', 'media', 'alta', 'critica'),
      allowNull: false,
    },
    equipment_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    normative_ref: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    reported_by: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Matrícula do operador',
    },
    created_at: {
      type: DataTypes.DATE(3),
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await qi.addIndex('anomaly_history', ['yard_id'], { name: 'idx_ah_yard' });
  await qi.addIndex('anomaly_history', ['severity'], { name: 'idx_ah_severity' });
  await qi.addIndex('anomaly_history', ['created_at'], { name: 'idx_ah_date' });

  console.log('[EFVM360-MIGRATE-002] ✅ anomaly_history');

  // ── 5. WEIGHING RECORDS ───────────────────────────────────────────────
  await qi.createTable('weighing_records', {
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
    service_pass_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
    },
    yard_id: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    total_weight: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Peso total em toneladas brutas',
    },
    heaviest_wagon_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    heaviest_wagon_weight: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
    },
    lightest_wagon_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    lightest_wagon_weight: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
    },
    wagon_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    excess_detected: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    excess_details: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array de vagões com excesso: [{wagonId, weight, excess}]',
    },
    weighed_by: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE(3),
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await qi.addIndex('weighing_records', ['yard_id'], { name: 'idx_wr_yard' });
  await qi.addIndex('weighing_records', ['excess_detected'], { name: 'idx_wr_excess' });
  await qi.addIndex('weighing_records', ['created_at'], { name: 'idx_wr_date' });

  console.log('[EFVM360-MIGRATE-002] ✅ weighing_records');

  // ── 6. LOCOMOTIVE INSPECTIONS ─────────────────────────────────────────
  await qi.createTable('locomotive_inspections', {
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
    service_pass_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
    },
    yard_id: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    locomotive_model: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    locomotive_ids: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Array de IDs das locomotivas inspecionadas',
    },
    trigger_reason: {
      type: DataTypes.ENUM('origin', 'model', 'hours_stopped', 'shift_change', 'manual'),
      allowNull: false,
    },
    header_data: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'BoaJornadaHeader completo',
    },
    items: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Array de 26 InspectionItems com status e observações',
    },
    overall_result: {
      type: DataTypes.ENUM('approved', 'conditional', 'rejected'),
      allowNull: false,
    },
    safety_violations: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'IDs dos itens de segurança com NOK',
    },
    help_desk_called: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    intervention_required: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    inspected_by: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    started_at: {
      type: DataTypes.DATE(3),
      allowNull: false,
    },
    completed_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
    },
  });

  await qi.addIndex('locomotive_inspections', ['yard_id'], { name: 'idx_li_yard' });
  await qi.addIndex('locomotive_inspections', ['overall_result'], { name: 'idx_li_result' });
  await qi.addIndex('locomotive_inspections', ['started_at'], { name: 'idx_li_date' });

  console.log('[EFVM360-MIGRATE-002] ✅ locomotive_inspections');

  // ── 7. BI PROJECTIONS (CQRS Read Models) ──────────────────────────────
  await qi.createTable('bi_daily_yard_summary', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    yard_id: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    summary_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    total_passes: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    sealed_passes: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    total_alerts: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    critical_alerts: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    avg_risk_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    weighing_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    excess_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    inspection_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    intervention_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    anomaly_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await qi.addIndex('bi_daily_yard_summary', ['yard_id', 'summary_date'], {
    unique: true,
    name: 'uk_bi_dys_yard_date',
  });

  console.log('[EFVM360-MIGRATE-002] ✅ bi_daily_yard_summary (CQRS projection)');

  // ── 8. ALTER passagens — Add yard_id ──────────────────────────────────
  await qi.addColumn('passagens', 'yard_id', {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Código do pátio (FK lógica para yard_configurations)',
  });

  await qi.addColumn('passagens', 'train_status', {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Situação do trem: LINK, ATC, peso, aspersão, PSI',
  });

  await qi.addColumn('passagens', 'weighing_record_id', {
    type: DataTypes.CHAR(36),
    allowNull: true,
    comment: 'UUID do registro de pesagem vinculado',
  });

  await qi.addColumn('passagens', 'inspection_id', {
    type: DataTypes.CHAR(36),
    allowNull: true,
    comment: 'UUID da inspeção de locomotiva vinculada',
  });

  await qi.addIndex('passagens', ['yard_id'], { name: 'idx_pass_yard' });

  console.log('[EFVM360-MIGRATE-002] ✅ passagens (colunas adicionadas: yard_id, train_status, weighing_record_id, inspection_id)');

  console.log('[EFVM360-MIGRATE-002] ══════════════════════════════════════════');
  console.log('[EFVM360-MIGRATE-002] ✅ MIGRAÇÃO 002 COMPLETA — 8 tabelas criadas/alteradas');
  console.log('[EFVM360-MIGRATE-002] ══════════════════════════════════════════');
}
