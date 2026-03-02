import { mkdirSync, writeFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';

const API_URL = 'http://localhost:3001/api/v1';
const AUTH_DIR = join(__dirname, '.auth');
const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes — reuse if fresh

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    uuid: string;
    nome: string;
    matricula: string;
    funcao: string;
    turno: string | null;
    horarioTurno: string | null;
    primaryYard: string;
    ativo: boolean;
  };
}

async function login(matricula: string, senha: string): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matricula, senha }),
  });
  if (!res.ok) throw new Error(`Login failed for ${matricula}: ${res.status} ${await res.text()}`);
  return res.json();
}

function isRecent(file: string): boolean {
  try {
    const stat = statSync(file);
    return Date.now() - stat.mtimeMs < MAX_AGE_MS;
  } catch {
    return false;
  }
}

export default async function globalSetup() {
  mkdirSync(AUTH_DIR, { recursive: true });

  const users = [
    { matricula: 'ADM9001', file: 'admin.json' },
    { matricula: 'VFZ1001', file: 'operador.json' },
    { matricula: 'VFZ2001', file: 'inspetor.json' },
  ];

  let loggedIn = 0;
  for (const u of users) {
    const filePath = join(AUTH_DIR, u.file);
    if (isRecent(filePath)) {
      continue; // Reuse existing auth
    }

    const data = await login(u.matricula, '123456');
    const session = {
      usuario: {
        nome: data.user.nome,
        matricula: data.user.matricula,
        funcao: data.user.funcao,
        turno: data.user.turno,
        horarioTurno: data.user.horarioTurno,
        primaryYard: data.user.primaryYard || 'VFZ',
        allowedYards: ['VFZ', 'VBR', 'VCS', 'P6', 'VTO'],
        status: data.user.ativo ? 'active' : 'inactive',
      },
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };
    writeFileSync(filePath, JSON.stringify(session, null, 2));
    loggedIn++;
  }

  if (loggedIn > 0) {
    console.log(`[global-setup] Logged in ${loggedIn} user(s), reused ${users.length - loggedIn}`);
  } else {
    console.log(`[global-setup] Reusing all ${users.length} cached sessions`);
  }
}
