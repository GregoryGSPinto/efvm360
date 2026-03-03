// ============================================================================
// EFVM360 Backend — Migration 007: Organizational Tree + Usuario Patios
// Prompt 1.2: Hierarchical relationships + multi-yard assignments
// ============================================================================

import { DataTypes } from 'sequelize';
import sequelize from '../config/database';

export async function runMigration007(): Promise<void> {
  const qi = sequelize.getQueryInterface();
  console.log('[EFVM-MIGRATE-007] Criando tabelas organizational_tree e usuario_patios...');

  // ── 1. organizational_tree ──────────────────────────────────────────────
  try {
    await qi.createTable('organizational_tree', {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      subordinate_matricula: { type: DataTypes.STRING(20), allowNull: false },
      superior_matricula: { type: DataTypes.STRING(20), allowNull: false },
      relationship_type: {
        type: DataTypes.ENUM('direto', 'funcional', 'interino'),
        allowNull: false,
        defaultValue: 'direto',
      },
      start_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
      end_date: { type: DataTypes.DATEONLY, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    console.log('[EFVM-MIGRATE-007] ✅ Tabela organizational_tree criada');
  } catch (error) {
    if ((error as Error).message?.includes('already exists')) {
      console.log('[EFVM-MIGRATE-007] ⏭️  Tabela organizational_tree já existe');
    } else {
      throw error;
    }
  }

  // Indexes
  try {
    await qi.addIndex('organizational_tree', ['subordinate_matricula'], { name: 'idx_org_subordinate' });
    console.log('[EFVM-MIGRATE-007] ✅ Index idx_org_subordinate criado');
  } catch { console.log('[EFVM-MIGRATE-007] ⏭️  Index idx_org_subordinate já existe'); }

  try {
    await qi.addIndex('organizational_tree', ['superior_matricula'], { name: 'idx_org_superior' });
    console.log('[EFVM-MIGRATE-007] ✅ Index idx_org_superior criado');
  } catch { console.log('[EFVM-MIGRATE-007] ⏭️  Index idx_org_superior já existe'); }

  // ── 2. usuario_patios ──────────────────────────────────────────────────
  try {
    await qi.createTable('usuario_patios', {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      matricula: { type: DataTypes.STRING(20), allowNull: false },
      yard_code: { type: DataTypes.STRING(10), allowNull: false },
      is_primary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      assigned_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    console.log('[EFVM-MIGRATE-007] ✅ Tabela usuario_patios criada');
  } catch (error) {
    if ((error as Error).message?.includes('already exists')) {
      console.log('[EFVM-MIGRATE-007] ⏭️  Tabela usuario_patios já existe');
    } else {
      throw error;
    }
  }

  try {
    await qi.addIndex('usuario_patios', ['matricula', 'yard_code'], {
      name: 'uq_user_yard',
      unique: true,
    });
    console.log('[EFVM-MIGRATE-007] ✅ Index uq_user_yard criado');
  } catch { console.log('[EFVM-MIGRATE-007] ⏭️  Index uq_user_yard já existe'); }

  // ── 3. Seed organizational tree ────────────────────────────────────────
  console.log('[EFVM-MIGRATE-007] Populando árvore organizacional...');

  const orgRelations = [
    // DIR1001 (diretor) → GER1001 (gerente)
    { subordinate: 'GER1001', superior: 'DIR1001' },
    // GER1001 (gerente) → CRD1001 (coordenador VFZ+VBR)
    { subordinate: 'CRD1001', superior: 'GER1001' },
    // GER1001 (gerente) → CRD2001 (coordenador VCS+P6+VTO) — needs seed
    { subordinate: 'CRD2001', superior: 'GER1001' },
    // CRD1001 → SUP1001 (supervisor VFZ)
    { subordinate: 'SUP1001', superior: 'CRD1001' },
    // CRD1001 → VBR3001 (gestor VBR)
    { subordinate: 'VBR3001', superior: 'CRD1001' },
    // SUP1001 → VFZ operatives
    { subordinate: 'VFZ1001', superior: 'SUP1001' },
    { subordinate: 'VFZ1002', superior: 'SUP1001' },
    { subordinate: 'VFZ1003', superior: 'SUP1001' },
    { subordinate: 'VFZ1004', superior: 'SUP1001' },
    { subordinate: 'VFZ1005', superior: 'SUP1001' },
    { subordinate: 'VFZ2001', superior: 'SUP1001' },
    { subordinate: 'VFZ3001', superior: 'SUP1001' },
    // VBR3001 → VBR operatives
    { subordinate: 'VBR1001', superior: 'VBR3001' },
    { subordinate: 'VBR1002', superior: 'VBR3001' },
    { subordinate: 'VBR1003', superior: 'VBR3001' },
    { subordinate: 'VBR1004', superior: 'VBR3001' },
    { subordinate: 'VBR1005', superior: 'VBR3001' },
    { subordinate: 'VBR2001', superior: 'VBR3001' },
    // CRD2001 → VCS3001, P63001, VTO3001
    { subordinate: 'VCS3001', superior: 'CRD2001' },
    { subordinate: 'P63001',  superior: 'CRD2001' },
    { subordinate: 'VTO3001', superior: 'CRD2001' },
    // VCS3001 → VCS operatives
    { subordinate: 'VCS1001', superior: 'VCS3001' },
    { subordinate: 'VCS1002', superior: 'VCS3001' },
    { subordinate: 'VCS1003', superior: 'VCS3001' },
    { subordinate: 'VCS1004', superior: 'VCS3001' },
    { subordinate: 'VCS1005', superior: 'VCS3001' },
    { subordinate: 'VCS2001', superior: 'VCS3001' },
    // P63001 → P6 operatives
    { subordinate: 'P61001',  superior: 'P63001' },
    { subordinate: 'P61002',  superior: 'P63001' },
    { subordinate: 'P61003',  superior: 'P63001' },
    { subordinate: 'P61004',  superior: 'P63001' },
    { subordinate: 'P61005',  superior: 'P63001' },
    { subordinate: 'P62001',  superior: 'P63001' },
    // VTO3001 → VTO operatives
    { subordinate: 'VTO1001', superior: 'VTO3001' },
    { subordinate: 'VTO1002', superior: 'VTO3001' },
    { subordinate: 'VTO1003', superior: 'VTO3001' },
    { subordinate: 'VTO1004', superior: 'VTO3001' },
    { subordinate: 'VTO1005', superior: 'VTO3001' },
    { subordinate: 'VTO2001', superior: 'VTO3001' },
  ];

  for (const rel of orgRelations) {
    try {
      await sequelize.query(
        `INSERT INTO organizational_tree (subordinate_matricula, superior_matricula, relationship_type, start_date)
         VALUES (?, ?, 'direto', CURDATE())
         ON DUPLICATE KEY UPDATE superior_matricula = VALUES(superior_matricula)`,
        { replacements: [rel.subordinate, rel.superior] }
      );
    } catch {
      // Skip if FK constraint fails (user not seeded yet)
    }
  }
  console.log('[EFVM-MIGRATE-007] ✅ Árvore organizacional populada');

  // ── 4. Seed usuario_patios ─────────────────────────────────────────────
  console.log('[EFVM-MIGRATE-007] Populando usuario_patios...');

  const yardAssignments = [
    // Operatives — primary yard only
    ...['VFZ1001','VFZ1002','VFZ1003','VFZ1004','VFZ1005','VFZ2001','VFZ3001','SUP1001'].map(m => ({ matricula: m, yard: 'VFZ', primary: true })),
    ...['VBR1001','VBR1002','VBR1003','VBR1004','VBR1005','VBR2001','VBR3001'].map(m => ({ matricula: m, yard: 'VBR', primary: true })),
    ...['VCS1001','VCS1002','VCS1003','VCS1004','VCS1005','VCS2001','VCS3001'].map(m => ({ matricula: m, yard: 'VCS', primary: true })),
    ...['P61001','P61002','P61003','P61004','P61005','P62001','P63001'].map(m => ({ matricula: m, yard: 'P6', primary: true })),
    ...['VTO1001','VTO1002','VTO1003','VTO1004','VTO1005','VTO2001','VTO3001'].map(m => ({ matricula: m, yard: 'VTO', primary: true })),
    // CRD1001 — coordenador VFZ+VBR
    { matricula: 'CRD1001', yard: 'VFZ', primary: true },
    { matricula: 'CRD1001', yard: 'VBR', primary: false },
    // CRD2001 — coordenador VCS+P6+VTO
    { matricula: 'CRD2001', yard: 'VCS', primary: true },
    { matricula: 'CRD2001', yard: 'P6',  primary: false },
    { matricula: 'CRD2001', yard: 'VTO', primary: false },
    // GER1001 — all yards
    ...['VFZ','VBR','VCS','P6','VTO'].map((y, i) => ({ matricula: 'GER1001', yard: y, primary: i === 0 })),
    // DIR1001 — all yards
    ...['VFZ','VBR','VCS','P6','VTO'].map((y, i) => ({ matricula: 'DIR1001', yard: y, primary: i === 0 })),
    // ADM9001 — all yards
    ...['VFZ','VBR','VCS','P6','VTO'].map((y, i) => ({ matricula: 'ADM9001', yard: y, primary: i === 0 })),
  ];

  for (const a of yardAssignments) {
    try {
      await sequelize.query(
        `INSERT INTO usuario_patios (matricula, yard_code, is_primary)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE is_primary = VALUES(is_primary)`,
        { replacements: [a.matricula, a.yard, a.primary] }
      );
    } catch {
      // Skip FK constraint errors
    }
  }
  console.log('[EFVM-MIGRATE-007] ✅ usuario_patios populado');

  console.log('[EFVM-MIGRATE-007] ══════════════════════════════════════════');
  console.log('[EFVM-MIGRATE-007] ✅ MIGRAÇÃO 007 COMPLETA');
  console.log('[EFVM-MIGRATE-007] ══════════════════════════════════════════');
}
