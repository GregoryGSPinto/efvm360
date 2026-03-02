import { test as base, expect, type Page } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

const AUTH_DIR = join(__dirname, '..', '.auth');

interface SessionData {
  usuario: Record<string, unknown>;
  accessToken: string;
  refreshToken: string;
}

function loadSession(file: string): SessionData {
  return JSON.parse(readFileSync(join(AUTH_DIR, file), 'utf-8'));
}

// ── Inject session into browser (no API call — reads from disk) ────────
async function injectSession(page: Page, session: SessionData) {
  await page.goto('/login');
  await page.evaluate(({ usuario, accessToken, refreshToken }) => {
    localStorage.setItem('efvm360-usuario', JSON.stringify(usuario));
    localStorage.setItem('efvm360-jwt', accessToken);
    localStorage.setItem('efvm360-jwt-refresh', refreshToken);
    sessionStorage.setItem('efvm360-session-auth', JSON.stringify(usuario));
  }, session);
  await page.goto('/');
  await page.locator('[data-tour="nav-principal"]').waitFor({ state: 'visible', timeout: 15_000 });
}

// ── UI login (for auth.spec.ts only — uses VFZ3001 to avoid rate limit on ADM9001) ──
export async function uiLogin(page: Page, matricula: string, senha = '123456') {
  await page.goto('/login');
  const matriculaInput = page.getByPlaceholder(/matr[ií]cula/i);
  await matriculaInput.waitFor({ state: 'visible', timeout: 15_000 });
  await matriculaInput.fill(matricula);
  await page.getByPlaceholder(/senha/i).fill(senha);
  await page.getByRole('button', { name: /acessar/i }).click();
  await page.locator('[data-tour="nav-principal"]').waitFor({ state: 'visible', timeout: 15_000 });
}

// ── Fixtures ──────────────────────────────────────────────────────────
type AuthFixtures = {
  adminPage: Page;
  operadorPage: Page;
};

export const test = base.extend<AuthFixtures>({
  adminPage: async ({ page }, use) => {
    await injectSession(page, loadSession('admin.json'));
    await use(page);
  },
  operadorPage: async ({ page }, use) => {
    await injectSession(page, loadSession('operador.json'));
    await use(page);
  },
});

export { expect };
