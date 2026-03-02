// ============================================================================
// VFZ Backend — Migration 006: Add primary_yard to usuarios
// P0 Auth migration — frontend needs primaryYard in JWT payload + user profile
// ============================================================================

import { QueryInterface, DataTypes } from 'sequelize';
import sequelize from '../config/database';

export async function runMigration006(): Promise<void> {
  const qi: QueryInterface = sequelize.getQueryInterface();
  console.log('[VFZ-MIGRATE-006] Adicionando primary_yard à tabela usuarios...');

  // ── 1. Add primary_yard column ──────────────────────────────────────────
  try {
    await qi.addColumn('usuarios', 'primary_yard', {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'VFZ',
      comment: 'Código do pátio principal do usuário',
    });
    console.log('[VFZ-MIGRATE-006] ✅ Coluna primary_yard adicionada');
  } catch (error) {
    // Column may already exist (idempotent)
    if ((error as Error).message?.includes('Duplicate column')) {
      console.log('[VFZ-MIGRATE-006] ⏭️  Coluna primary_yard já existe');
    } else {
      throw error;
    }
  }

  // ── 2. Add index ────────────────────────────────────────────────────────
  try {
    await qi.addIndex('usuarios', ['primary_yard'], { name: 'idx_usuarios_yard' });
    console.log('[VFZ-MIGRATE-006] ✅ Index idx_usuarios_yard criado');
  } catch {
    console.log('[VFZ-MIGRATE-006] ⏭️  Index idx_usuarios_yard já existe');
  }

  // ── 3. Update primary_yard based on matricula prefix ────────────────────
  const yardMappings = [
    { prefix: 'VFZ', yard: 'VFZ' },
    { prefix: 'VBR', yard: 'VBR' },
    { prefix: 'VCS', yard: 'VCS' },
    { prefix: 'P6',  yard: 'P6'  },
    { prefix: 'VTO', yard: 'VTO' },
    { prefix: 'ADM', yard: 'VFZ' }, // Admin global → VFZ
    { prefix: 'SUP', yard: 'VFZ' }, // Suporte → VFZ
  ];

  for (const { prefix, yard } of yardMappings) {
    await sequelize.query(
      `UPDATE usuarios SET primary_yard = ? WHERE matricula LIKE ? AND primary_yard = 'VFZ'`,
      { replacements: [yard, `${prefix}%`] }
    );
  }

  console.log('[VFZ-MIGRATE-006] ✅ primary_yard atualizado baseado em prefixo da matrícula');

  // ── 4. Add 'suporte' to funcao if it's ENUM (may fail if already STRING) ──
  try {
    await sequelize.query(
      `ALTER TABLE usuarios MODIFY COLUMN funcao VARCHAR(30) NOT NULL DEFAULT 'operador'`
    );
    console.log('[VFZ-MIGRATE-006] ✅ funcao alterado para VARCHAR(30)');
  } catch {
    console.log('[VFZ-MIGRATE-006] ⏭️  funcao já é VARCHAR ou erro ao alterar');
  }

  console.log('[VFZ-MIGRATE-006] ══════════════════════════════════════════');
  console.log('[VFZ-MIGRATE-006] ✅ MIGRAÇÃO 006 COMPLETA');
  console.log('[VFZ-MIGRATE-006] ══════════════════════════════════════════');
}
