// ============================================================================
// VFZ Backend — Migration 013: Operational Tables
// Equipment, Risk Grades, Shift Crews, Five-S Inspections
// ============================================================================

import { QueryInterface, DataTypes } from 'sequelize';
import sequelize from '../config/database';

export async function runMigration013(): Promise<void> {
  const qi: QueryInterface = sequelize.getQueryInterface();
  console.log('[VFZ-MIGRATE-013] Iniciando migração de tabelas operacionais...');

  // ── 1. EQUIPMENT ────────────────────────────────────────────────────────
  await qi.createTable('equipment', {
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
    category: {
      type: DataTypes.ENUM('comunicacao', 'sinalizacao', 'seguranca', 'medicao', 'ferramentas', 'epi'),
      allowNull: false,
    },
    criticality: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'medium',
    },
    min_quantity_per_shift: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
    },
    current_quantity: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('operational', 'maintenance', 'decommissioned'),
      allowNull: false,
      defaultValue: 'operational',
    },
    yard_code: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Pátio onde o equipamento está alocado',
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

  await qi.addIndex('equipment', ['category'], { name: 'idx_equip_category' });
  await qi.addIndex('equipment', ['status'], { name: 'idx_equip_status' });
  await qi.addIndex('equipment', ['yard_code'], { name: 'idx_equip_yard' });

  console.log('[VFZ-MIGRATE-013] ✅ Tabela: equipment');

  // ── 2. RISK GRADES ─────────────────────────────────────────────────────
  await qi.createTable('risk_grades', {
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
    description: {
      type: DataTypes.STRING(300),
      allowNull: false,
    },
    probability: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: '1-5 scale',
    },
    impact: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: '1-5 scale',
    },
    grade: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
    },
    mitigation: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    nr_reference: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Norma regulamentadora (NR-01, NR-11, NR-12, etc.)',
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

  await qi.addIndex('risk_grades', ['grade'], { name: 'idx_rg_grade' });
  await qi.addIndex('risk_grades', ['active'], { name: 'idx_rg_active' });

  console.log('[VFZ-MIGRATE-013] ✅ Tabela: risk_grades');

  // ── 3. SHIFT CREWS ─────────────────────────────────────────────────────
  await qi.createTable('shift_crews', {
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
    turno: {
      type: DataTypes.ENUM('A', 'B', 'C', 'D'),
      allowNull: false,
    },
    data: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    yard_code: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    lider_matricula: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    membros: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      comment: 'Array de matrículas dos membros da equipe',
    },
    observacoes: {
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

  await qi.addIndex('shift_crews', ['turno', 'data', 'yard_code'], {
    unique: true,
    name: 'uk_sc_turno_data_yard',
  });
  await qi.addIndex('shift_crews', ['yard_code'], { name: 'idx_sc_yard' });

  console.log('[VFZ-MIGRATE-013] ✅ Tabela: shift_crews');

  // ── 4. FIVE-S INSPECTIONS ─────────────────────────────────────────────
  await qi.createTable('five_s_inspections', {
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
    data: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    turno: {
      type: DataTypes.ENUM('A', 'B', 'C', 'D'),
      allowNull: false,
    },
    yard_code: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    inspector_matricula: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    passagem_uuid: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      comment: 'UUID da passagem de serviço vinculada',
    },
    seiri_score: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: false,
      comment: 'Utilização (0-10)',
    },
    seiton_score: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: false,
      comment: 'Organização (0-10)',
    },
    seiso_score: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: false,
      comment: 'Limpeza (0-10)',
    },
    seiketsu_score: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: false,
      comment: 'Padronização (0-10)',
    },
    shitsuke_score: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: false,
      comment: 'Disciplina (0-10)',
    },
    overall_score: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: false,
      comment: 'Média dos 5 sensos (0-10)',
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    fotos: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array de URLs de fotos da inspeção',
    },
    status: {
      type: DataTypes.ENUM('rascunho', 'concluido'),
      allowNull: false,
      defaultValue: 'rascunho',
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

  await qi.addIndex('five_s_inspections', ['data', 'turno', 'yard_code'], { name: 'idx_5s_data_turno_yard' });
  await qi.addIndex('five_s_inspections', ['yard_code'], { name: 'idx_5s_yard' });
  await qi.addIndex('five_s_inspections', ['status'], { name: 'idx_5s_status' });

  console.log('[VFZ-MIGRATE-013] ✅ Tabela: five_s_inspections');

  console.log('[VFZ-MIGRATE-013] ══════════════════════════════════════════');
  console.log('[VFZ-MIGRATE-013] ✅ MIGRAÇÃO 013 COMPLETA — 4 tabelas operacionais');
  console.log('[VFZ-MIGRATE-013] ══════════════════════════════════════════');
}
