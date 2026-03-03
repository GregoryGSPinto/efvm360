// ============================================================================
// EFVM360 Backend — Production Seed
// Minimal seed for first-time deployment on Vale's server.
// Creates: EFVM railway, admin user, one supervisor.
// Does NOT create the 35+ test users — those are dev-only.
//
// Usage: npm run seed:production
// ============================================================================

import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import sequelize from '../config/database';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

// Only the minimum users needed for the system to function
const PRODUCTION_USERS = [
  {
    matricula: 'ADM9001',
    nome: 'Administrador EFVM360',
    funcao: 'administrador',
    turno: null,
    horario_turno: null,
    primary_yard: 'VFZ',
    senha: 'EFVM360@Admin!', // Must be changed on first login
    must_change_password: true,
  },
  {
    matricula: 'SUP1001',
    nome: 'Supervisor Flexal',
    funcao: 'supervisor',
    turno: null,
    horario_turno: null,
    primary_yard: 'VFZ',
    senha: 'EFVM360@Sup!', // Must be changed on first login
    must_change_password: true,
  },
];

async function runMigrations(): Promise<void> {
  console.log('[SEED-PROD] Running migrations...');
  const { runMigrations: run001 } = await import('../migrations/001_initial');
  const { runMigration004 } = await import('../migrations/004_patios');
  const { runMigration005 } = await import('../migrations/005_missing_tables');
  const { runMigration006 } = await import('../migrations/006_add_primary_yard');
  const { runMigration007 } = await import('../migrations/007_organizational_tree');
  const { runMigration008 } = await import('../migrations/008_inter_yard_handover');
  const { runMigration009 } = await import('../migrations/009_train_compositions');
  const { runMigration010 } = await import('../migrations/010_analytics_views');
  const { runMigration011 } = await import('../migrations/011_approval_workflows');
  const { runMigration012 } = await import('../migrations/012_multi_tenancy');

  await run001();
  await runMigration004();
  await runMigration005();
  await runMigration006();
  await runMigration007();
  await runMigration008();
  await runMigration009();
  await runMigration010();
  await runMigration011();
  await runMigration012();
  console.log('[SEED-PROD] Migrations complete');
}

async function ensureRailway(): Promise<void> {
  console.log('[SEED-PROD] Ensuring EFVM railway exists...');
  try {
    const [rows] = await sequelize.query(
      'SELECT id FROM railways WHERE code = ? LIMIT 1',
      { replacements: ['EFVM'] },
    ) as [Array<{ id: number }>, unknown];

    if (rows.length === 0) {
      await sequelize.query(
        `INSERT INTO railways (code, name, region, active, created_at, updated_at)
         VALUES ('EFVM', 'Estrada de Ferro Vitória-Minas', 'Sudeste', 1, NOW(), NOW())`,
      );
      console.log('[SEED-PROD] Railway EFVM created');
    } else {
      console.log('[SEED-PROD] Railway EFVM already exists');
    }
  } catch {
    // Table may not exist yet if migrations didn't create it
    console.log('[SEED-PROD] Railways table not found — skipping railway seed');
  }
}

async function seedUsers(): Promise<void> {
  console.log('[SEED-PROD] Seeding production users...');

  // Ensure primary_yard column exists
  try {
    await sequelize.query('SELECT primary_yard FROM usuarios LIMIT 1');
  } catch {
    await sequelize.query(
      "ALTER TABLE usuarios ADD COLUMN primary_yard VARCHAR(10) NOT NULL DEFAULT 'VFZ' AFTER horario_turno",
    );
  }

  // Ensure funcao supports all roles
  try {
    await sequelize.query(
      "ALTER TABLE usuarios MODIFY COLUMN funcao VARCHAR(30) NOT NULL DEFAULT 'operador'",
    );
  } catch { /* already VARCHAR */ }

  let created = 0;

  for (const user of PRODUCTION_USERS) {
    const senhaHash = await bcrypt.hash(user.senha, BCRYPT_ROUNDS);

    const [existing] = await sequelize.query(
      'SELECT id FROM usuarios WHERE matricula = ? LIMIT 1',
      { replacements: [user.matricula] },
    ) as [Array<{ id: number }>, unknown];

    if (existing.length === 0) {
      await sequelize.query(
        `INSERT INTO usuarios (uuid, nome, matricula, funcao, turno, horario_turno, primary_yard, senha_hash, ativo, tentativas_login, created_at, updated_at)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, 1, 0, NOW(), NOW())`,
        {
          replacements: [
            user.nome, user.matricula, user.funcao,
            user.turno, user.horario_turno, user.primary_yard,
            senhaHash,
          ],
        },
      );
      created++;
      console.log(`[SEED-PROD] Created user: ${user.matricula} (${user.funcao})`);
    } else {
      console.log(`[SEED-PROD] User ${user.matricula} already exists — skipping`);
    }
  }

  console.log(`[SEED-PROD] Users seeded: ${created} created`);
}

async function ensurePatios(): Promise<void> {
  console.log('[SEED-PROD] Ensuring organizational structure...');
  const patios = [
    { codigo: 'VFZ', nome: 'Patio Flexal (Tubarao)', regiao: 'ES' },
    { codigo: 'VBR', nome: 'Patio Barao de Cocais', regiao: 'MG' },
    { codigo: 'VCS', nome: 'Patio Costa Lacerda', regiao: 'MG' },
    { codigo: 'P6', nome: 'Patio Pedro Nolasco', regiao: 'ES' },
    { codigo: 'VTO', nome: 'Patio Tubarao Outbound', regiao: 'ES' },
  ];

  for (const patio of patios) {
    try {
      const [rows] = await sequelize.query(
        'SELECT id FROM patios WHERE codigo = ? LIMIT 1',
        { replacements: [patio.codigo] },
      ) as [Array<{ id: number }>, unknown];

      if (rows.length === 0) {
        await sequelize.query(
          `INSERT INTO patios (codigo, nome, regiao, ativo, created_at, updated_at)
           VALUES (?, ?, ?, 1, NOW(), NOW())`,
          { replacements: [patio.codigo, patio.nome, patio.regiao] },
        );
      }
    } catch {
      // Table may not exist
    }
  }
  console.log('[SEED-PROD] Organizational structure ensured');
}

async function main(): Promise<void> {
  console.log('');
  console.log('══════════════════════════════════════════════════════════');
  console.log('  EFVM360 — Production Seed');
  console.log('══════════════════════════════════════════════════════════');
  console.log('');

  await sequelize.authenticate();
  console.log('[SEED-PROD] Database connection OK');

  await runMigrations();
  await ensureRailway();
  await seedUsers();
  await ensurePatios();

  console.log('');
  console.log('[SEED-PROD] Production seed complete!');
  console.log('[SEED-PROD] Default credentials:');
  console.log('[SEED-PROD]   ADM9001 / EFVM360@Admin! (must change on first login)');
  console.log('[SEED-PROD]   SUP1001 / EFVM360@Sup!   (must change on first login)');
  console.log('');

  await sequelize.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('[SEED-PROD] Failed:', err);
  process.exit(1);
});
