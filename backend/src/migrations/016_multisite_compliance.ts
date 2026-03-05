// ============================================================================
// VFZ Backend — Migration 016: Multi-Site Support & Compliance Automation
// Phase 3F (Multi-Site) + Phase 3G (Compliance)
// ============================================================================

import { QueryInterface, DataTypes } from 'sequelize';
import sequelize from '../config/database';

export async function runMigration016(): Promise<void> {
  const qi: QueryInterface = sequelize.getQueryInterface();
  console.log('[VFZ-MIGRATE-016] Iniciando migração multi-site + compliance...');

  // ── 1. SITES TABLE ──────────────────────────────────────────────────────
  await qi.createTable('sites', {
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
    code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
      comment: 'Short site code (TUB, CLR, ITB, etc.)',
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    railway: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'EFVM',
    },
    region: {
      type: DataTypes.STRING(5),
      allowNull: false,
      comment: 'State code (ES, MG, etc.)',
    },
    timezone: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'America/Sao_Paulo',
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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

  await qi.addIndex('sites', ['code'], { unique: true, name: 'uk_sites_code' });
  await qi.addIndex('sites', ['railway'], { name: 'idx_sites_railway' });
  await qi.addIndex('sites', ['active'], { name: 'idx_sites_active' });

  console.log('[VFZ-MIGRATE-016] Tabela: sites');

  // ── 2. USER-SITE ASSIGNMENTS ────────────────────────────────────────────
  await qi.createTable('user_sites', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    site_code: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    is_default: {
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

  await qi.addIndex('user_sites', ['user_id', 'site_code'], {
    unique: true,
    name: 'uk_user_sites',
  });
  await qi.addIndex('user_sites', ['site_code'], { name: 'idx_us_site' });

  console.log('[VFZ-MIGRATE-016] Tabela: user_sites');

  // ── 3. ADD site_id TO CORE TABLES ───────────────────────────────────────
  const tablesForSiteId = [
    'passagens',
    'dss',
    'equipment',
    'risk_grades',
    'shift_crews',
    'five_s_inspections',
    'webhooks',
  ];

  for (const table of tablesForSiteId) {
    try {
      const [cols] = await sequelize.query(
        `SHOW COLUMNS FROM \`${table}\` LIKE 'site_id'`
      ) as [Array<unknown>, unknown];

      if (cols.length === 0) {
        await qi.addColumn(table, 'site_id', {
          type: DataTypes.STRING(10),
          allowNull: true,
          comment: 'Site code for multi-site filtering',
        });
        await qi.addIndex(table, ['site_id'], { name: `idx_${table}_site_id` });
      }
    } catch (e) {
      console.log(`[VFZ-MIGRATE-016] Skipping site_id on ${table}: ${(e as Error).message}`);
    }
  }

  console.log('[VFZ-MIGRATE-016] site_id adicionado a tabelas core');

  // ── 4. COMPLIANCE CHECKS TABLE ──────────────────────────────────────────
  await qi.createTable('compliance_checks', {
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
    site_id: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    nr: {
      type: DataTypes.STRING(10),
      allowNull: false,
      comment: 'NR code (NR-01, NR-11, NR-12, NR-13, NR-35)',
    },
    description: {
      type: DataTypes.STRING(300),
      allowNull: false,
    },
    frequency: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'annual'),
      allowNull: false,
    },
    last_checked: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    next_due: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('compliant', 'non_compliant', 'pending', 'overdue'),
      allowNull: false,
      defaultValue: 'pending',
    },
    responsible_matricula: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    evidence_required: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    evidence_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
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

  await qi.addIndex('compliance_checks', ['site_id'], { name: 'idx_cc_site' });
  await qi.addIndex('compliance_checks', ['nr'], { name: 'idx_cc_nr' });
  await qi.addIndex('compliance_checks', ['status'], { name: 'idx_cc_status' });
  await qi.addIndex('compliance_checks', ['next_due'], { name: 'idx_cc_next_due' });

  console.log('[VFZ-MIGRATE-016] Tabela: compliance_checks');

  // ── 5. COMPLIANCE ALERTS TABLE ──────────────────────────────────────────
  await qi.createTable('compliance_alerts', {
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
    site_id: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    check_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: 'FK to compliance_checks',
    },
    type: {
      type: DataTypes.ENUM(
        'overdue_inspection',
        'expired_training',
        'equipment_maintenance',
        'risk_matrix_outdated',
        'five_s_overdue'
      ),
      allowNull: false,
    },
    severity: {
      type: DataTypes.ENUM('info', 'warning', 'critical'),
      allowNull: false,
      defaultValue: 'warning',
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    nr_reference: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    acknowledged: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    acknowledged_by: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    acknowledged_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await qi.addIndex('compliance_alerts', ['site_id'], { name: 'idx_ca_site' });
  await qi.addIndex('compliance_alerts', ['type'], { name: 'idx_ca_type' });
  await qi.addIndex('compliance_alerts', ['severity'], { name: 'idx_ca_severity' });
  await qi.addIndex('compliance_alerts', ['acknowledged'], { name: 'idx_ca_ack' });

  console.log('[VFZ-MIGRATE-016] Tabela: compliance_alerts');

  // ── 6. TRAINING RECORDS TABLE ───────────────────────────────────────────
  await qi.createTable('training_records', {
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
    site_id: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    user_matricula: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    training_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'e.g. NR-35 Trabalho em Altura',
    },
    nr_reference: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    certificate_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('valid', 'expiring', 'expired'),
      allowNull: false,
      defaultValue: 'valid',
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

  await qi.addIndex('training_records', ['site_id'], { name: 'idx_tr_site' });
  await qi.addIndex('training_records', ['user_matricula'], { name: 'idx_tr_user' });
  await qi.addIndex('training_records', ['expires_at'], { name: 'idx_tr_expires' });
  await qi.addIndex('training_records', ['status'], { name: 'idx_tr_status' });

  console.log('[VFZ-MIGRATE-016] Tabela: training_records');

  console.log('[VFZ-MIGRATE-016] ══════════════════════════════════════════');
  console.log('[VFZ-MIGRATE-016] MIGRACAO 016 COMPLETA — multi-site + compliance');
  console.log('[VFZ-MIGRATE-016] ══════════════════════════════════════════');
}
