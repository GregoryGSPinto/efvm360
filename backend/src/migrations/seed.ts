// ============================================================================
// EFVM360 Backend — Seed: Usuários do Sistema
// Uso: npx ts-node src/migrations/seed.ts
// ============================================================================

import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { testConnection } from '../config/database';
import sequelize from '../config/database';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

const USUARIOS_SEED = [
  // ── Operadores Turno A (Diurno 07-19) ──
  { nome: 'Carlos Eduardo Silva',   matricula: 'VFZ-1001', funcao: 'maquinista',     turno: 'A', horario: '07-19', senha: 'OpA@Efvm1001' },
  { nome: 'Roberto Almeida Santos', matricula: 'VFZ-1002', funcao: 'maquinista',     turno: 'A', horario: '07-19', senha: 'OpA@Efvm1002' },
  // ── Operadores Turno B (Noturno 19-07) ──
  { nome: 'Marcos Vinícius Souza',  matricula: 'VFZ-1003', funcao: 'maquinista',     turno: 'B', horario: '19-07', senha: 'OpB@Efvm1003' },
  { nome: 'Anderson Pereira Lima',  matricula: 'VFZ-1004', funcao: 'maquinista',     turno: 'B', horario: '19-07', senha: 'OpB@Efvm1004' },
  // ── Supervisor ──
  { nome: 'Fernando Costa Oliveira',matricula: 'VFZ-2001', funcao: 'supervisor',     turno: 'A', horario: '07-19', senha: 'Sup@Efvm2001' },
  // ── Inspetor de Segurança ──
  { nome: 'Ricardo Mendes Ferreira',matricula: 'VFZ-3001', funcao: 'inspetor',       turno: 'A', horario: '07-19', senha: 'Insp@Efvm3001' },
  // ── Gestor Operacional ──
  { nome: 'Paulo Henrique Barbosa', matricula: 'VFZ-4001', funcao: 'gestor',         turno: 'A', horario: '07-19', senha: 'Gest@Efvm4001' },
  // ── Administrador TI ──
  { nome: 'Gregory Administrador',  matricula: 'VFZ-9001', funcao: 'administrador',  turno: 'A', horario: '07-19', senha: 'Adm@Efvm9001' },
];

(async () => {
  try {
    await testConnection();
    console.log('\n🔧 Criando usuários EFVM360...\n');

    for (const u of USUARIOS_SEED) {
      const hash = await bcrypt.hash(u.senha, BCRYPT_ROUNDS);
      await sequelize.query(
        `INSERT INTO usuarios (uuid, nome, matricula, funcao, turno, horario_turno, senha_hash, ativo, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, true, NOW(), NOW())
         ON DUPLICATE KEY UPDATE nome = VALUES(nome), senha_hash = VALUES(senha_hash), updated_at = NOW()`,
        { replacements: [uuidv4(), u.nome, u.matricula, u.funcao, u.turno, u.horario, hash] }
      );
      console.log(`  ✅ ${u.matricula} — ${u.nome} (${u.funcao})`);
    }

    console.log(`\n✅ Seed completo: ${USUARIOS_SEED.length} usuários criados.`);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro no seed:', error);
    process.exit(1);
  }
})();
