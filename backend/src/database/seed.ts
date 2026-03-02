// ============================================================================
// EFVM360 Backend — Seed de Usuários MySQL
// Standalone: npx ts-node src/database/seed.ts
// Insere 37 usuários demo + admin + suporte com bcrypt hash
// Idempotente: ON DUPLICATE KEY UPDATE
// ============================================================================

import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import sequelize from '../config/database';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
const DEFAULT_PASSWORD = '123456';
const SUPORTE_PASSWORD = 'suporte360';

interface SeedUser {
  matricula: string;
  nome: string;
  funcao: string;
  turno: string | null;
  horario_turno: string | null;
  primary_yard: string;
  senha: string;
}

const SEED_USERS: SeedUser[] = [
  // ═══ VFZ — Pátio de Fazendão (Flexal) ═══
  { matricula: 'VFZ1001', nome: 'Carlos Eduardo Silva',     funcao: 'maquinista', turno: 'A', horario_turno: '07-19', primary_yard: 'VFZ', senha: DEFAULT_PASSWORD },
  { matricula: 'VFZ1002', nome: 'Roberto Almeida Santos',   funcao: 'maquinista', turno: 'A', horario_turno: '07-19', primary_yard: 'VFZ', senha: DEFAULT_PASSWORD },
  { matricula: 'VFZ1003', nome: 'Marcos Vinícius Souza',    funcao: 'maquinista', turno: 'B', horario_turno: '19-07', primary_yard: 'VFZ', senha: DEFAULT_PASSWORD },
  { matricula: 'VFZ1004', nome: 'Anderson Pereira Lima',    funcao: 'maquinista', turno: 'B', horario_turno: '19-07', primary_yard: 'VFZ', senha: DEFAULT_PASSWORD },
  { matricula: 'VFZ1005', nome: 'Diego Ferreira Gomes',     funcao: 'oficial',    turno: 'A', horario_turno: '07-19', primary_yard: 'VFZ', senha: DEFAULT_PASSWORD },
  { matricula: 'VFZ2001', nome: 'Ricardo Mendes Ferreira',  funcao: 'inspetor',   turno: null, horario_turno: null,   primary_yard: 'VFZ', senha: DEFAULT_PASSWORD },
  { matricula: 'VFZ3001', nome: 'Paulo Henrique Barbosa',   funcao: 'gestor',     turno: null, horario_turno: null,   primary_yard: 'VFZ', senha: DEFAULT_PASSWORD },

  // ═══ VBR — Pátio de Barão de Cocais ═══
  { matricula: 'VBR1001', nome: 'Thiago Oliveira Costa',    funcao: 'maquinista', turno: 'A', horario_turno: '07-19', primary_yard: 'VBR', senha: DEFAULT_PASSWORD },
  { matricula: 'VBR1002', nome: 'Lucas Martins Rocha',      funcao: 'maquinista', turno: 'A', horario_turno: '07-19', primary_yard: 'VBR', senha: DEFAULT_PASSWORD },
  { matricula: 'VBR1003', nome: 'Gustavo Henrique Dias',    funcao: 'maquinista', turno: 'B', horario_turno: '19-07', primary_yard: 'VBR', senha: DEFAULT_PASSWORD },
  { matricula: 'VBR1004', nome: 'Rafael Souza Nascimento',  funcao: 'maquinista', turno: 'B', horario_turno: '19-07', primary_yard: 'VBR', senha: DEFAULT_PASSWORD },
  { matricula: 'VBR1005', nome: 'Bruno Carvalho Mendes',    funcao: 'oficial',    turno: 'A', horario_turno: '07-19', primary_yard: 'VBR', senha: DEFAULT_PASSWORD },
  { matricula: 'VBR2001', nome: 'Alexandre Ribeiro Pinto',  funcao: 'inspetor',   turno: null, horario_turno: null,   primary_yard: 'VBR', senha: DEFAULT_PASSWORD },
  { matricula: 'VBR3001', nome: 'Marcelo Augusto Reis',     funcao: 'gestor',     turno: null, horario_turno: null,   primary_yard: 'VBR', senha: DEFAULT_PASSWORD },

  // ═══ VCS — Pátio de Costa Lacerda ═══
  { matricula: 'VCS1001', nome: 'Wellington Santos Lima',    funcao: 'maquinista', turno: 'A', horario_turno: '07-19', primary_yard: 'VCS', senha: DEFAULT_PASSWORD },
  { matricula: 'VCS1002', nome: 'Rodrigo Alves Moreira',    funcao: 'maquinista', turno: 'A', horario_turno: '07-19', primary_yard: 'VCS', senha: DEFAULT_PASSWORD },
  { matricula: 'VCS1003', nome: 'Fábio Henrique Cruz',      funcao: 'maquinista', turno: 'B', horario_turno: '19-07', primary_yard: 'VCS', senha: DEFAULT_PASSWORD },
  { matricula: 'VCS1004', nome: 'Leandro Souza Ramos',      funcao: 'maquinista', turno: 'B', horario_turno: '19-07', primary_yard: 'VCS', senha: DEFAULT_PASSWORD },
  { matricula: 'VCS1005', nome: 'Eduardo Martins Prado',    funcao: 'oficial',    turno: 'A', horario_turno: '07-19', primary_yard: 'VCS', senha: DEFAULT_PASSWORD },
  { matricula: 'VCS2001', nome: 'Fernando Costa Oliveira',  funcao: 'inspetor',   turno: null, horario_turno: null,   primary_yard: 'VCS', senha: DEFAULT_PASSWORD },
  { matricula: 'VCS3001', nome: 'Sérgio Magalhães Junior',  funcao: 'gestor',     turno: null, horario_turno: null,   primary_yard: 'VCS', senha: DEFAULT_PASSWORD },

  // ═══ P6 — Pátio Pedro Nolasco ═══
  { matricula: 'P61001',  nome: 'Adriano Pereira Nunes',    funcao: 'maquinista', turno: 'A', horario_turno: '07-19', primary_yard: 'P6',  senha: DEFAULT_PASSWORD },
  { matricula: 'P61002',  nome: 'Vinícius Campos Batista',  funcao: 'maquinista', turno: 'A', horario_turno: '07-19', primary_yard: 'P6',  senha: DEFAULT_PASSWORD },
  { matricula: 'P61003',  nome: 'Renato Gonçalves Duarte',  funcao: 'maquinista', turno: 'B', horario_turno: '19-07', primary_yard: 'P6',  senha: DEFAULT_PASSWORD },
  { matricula: 'P61004',  nome: 'Cláudio Azevedo Freitas',  funcao: 'maquinista', turno: 'B', horario_turno: '19-07', primary_yard: 'P6',  senha: DEFAULT_PASSWORD },
  { matricula: 'P61005',  nome: 'Márcio Tavares Borges',    funcao: 'oficial',    turno: 'A', horario_turno: '07-19', primary_yard: 'P6',  senha: DEFAULT_PASSWORD },
  { matricula: 'P62001',  nome: 'José Ricardo Andrade',     funcao: 'inspetor',   turno: null, horario_turno: null,   primary_yard: 'P6',  senha: DEFAULT_PASSWORD },
  { matricula: 'P63001',  nome: 'Antonio Marcos Cardoso',   funcao: 'gestor',     turno: null, horario_turno: null,   primary_yard: 'P6',  senha: DEFAULT_PASSWORD },

  // ═══ VTO — Pátio de Tubarão Outbound ═══
  { matricula: 'VTO1001', nome: 'Daniel Fonseca Araújo',    funcao: 'maquinista', turno: 'A', horario_turno: '07-19', primary_yard: 'VTO', senha: DEFAULT_PASSWORD },
  { matricula: 'VTO1002', nome: 'Michel Barbosa Lopes',     funcao: 'maquinista', turno: 'A', horario_turno: '07-19', primary_yard: 'VTO', senha: DEFAULT_PASSWORD },
  { matricula: 'VTO1003', nome: 'Felipe Correia Monteiro',  funcao: 'maquinista', turno: 'B', horario_turno: '19-07', primary_yard: 'VTO', senha: DEFAULT_PASSWORD },
  { matricula: 'VTO1004', nome: 'Henrique Pires Machado',   funcao: 'maquinista', turno: 'B', horario_turno: '19-07', primary_yard: 'VTO', senha: DEFAULT_PASSWORD },
  { matricula: 'VTO1005', nome: 'Rogério Damasceno Viana',  funcao: 'oficial',    turno: 'A', horario_turno: '07-19', primary_yard: 'VTO', senha: DEFAULT_PASSWORD },
  { matricula: 'VTO2001', nome: 'Gilberto Souza Braga',     funcao: 'inspetor',   turno: null, horario_turno: null,   primary_yard: 'VTO', senha: DEFAULT_PASSWORD },
  { matricula: 'VTO3001', nome: 'Osvaldo Ramos Teixeira',   funcao: 'gestor',     turno: null, horario_turno: null,   primary_yard: 'VTO', senha: DEFAULT_PASSWORD },

  // ═══ ADMIN GLOBAL + SUPORTE ═══
  { matricula: 'ADM9001', nome: 'Gregory Administrador',    funcao: 'gestor',     turno: null, horario_turno: null,   primary_yard: 'VFZ', senha: DEFAULT_PASSWORD },
  { matricula: 'SUP0001', nome: 'Suporte Tecnico',          funcao: 'suporte',    turno: null, horario_turno: null,   primary_yard: 'VFZ', senha: SUPORTE_PASSWORD },
];

async function seed(): Promise<void> {
  console.log('[EFVM360-SEED] Conectando ao MySQL...');
  await sequelize.authenticate();
  console.log('[EFVM360-SEED] Conexão OK');

  // Ensure primary_yard column exists (migration 006 may not have run)
  try {
    await sequelize.query('SELECT primary_yard FROM usuarios LIMIT 1');
  } catch {
    console.log('[EFVM360-SEED] Adicionando coluna primary_yard...');
    await sequelize.query('ALTER TABLE usuarios ADD COLUMN primary_yard VARCHAR(10) NOT NULL DEFAULT \'VFZ\' AFTER horario_turno');
    await sequelize.query('CREATE INDEX idx_usuarios_yard ON usuarios (primary_yard)');
  }

  // Ensure funcao is VARCHAR (not ENUM) to support 'suporte'
  try {
    await sequelize.query('ALTER TABLE usuarios MODIFY COLUMN funcao VARCHAR(30) NOT NULL DEFAULT \'operador\'');
  } catch {
    // Already VARCHAR — ignore
  }

  let created = 0;
  let updated = 0;

  for (const user of SEED_USERS) {
    const senhaHash = await bcrypt.hash(user.senha, BCRYPT_ROUNDS);

    const [results] = await sequelize.query(
      'SELECT id FROM usuarios WHERE matricula = ? LIMIT 1',
      { replacements: [user.matricula] }
    ) as [Array<{ id: number }>, unknown];

    if (results.length === 0) {
      await sequelize.query(
        `INSERT INTO usuarios (uuid, nome, matricula, funcao, turno, horario_turno, primary_yard, senha_hash, ativo, tentativas_login, created_at, updated_at)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, 1, 0, NOW(), NOW())`,
        { replacements: [user.nome, user.matricula, user.funcao, user.turno, user.horario_turno, user.primary_yard, senhaHash] }
      );
      created++;
    } else {
      await sequelize.query(
        `UPDATE usuarios SET nome=?, funcao=?, turno=?, horario_turno=?, primary_yard=?, senha_hash=?, ativo=1, updated_at=NOW()
         WHERE matricula=?`,
        { replacements: [user.nome, user.funcao, user.turno, user.horario_turno, user.primary_yard, senhaHash, user.matricula] }
      );
      updated++;
    }
  }

  console.log(`[EFVM360-SEED] Concluído: ${created} criados, ${updated} atualizados (${SEED_USERS.length} total)`);
  await sequelize.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[EFVM360-SEED] Falhou:', err);
  process.exit(1);
});
