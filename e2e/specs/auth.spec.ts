import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

const authData = JSON.parse(
  readFileSync(join(__dirname, '..', '.auth', 'admin.json'), 'utf-8')
);

// Helper: inject session without UI login (avoids rate limiter)
async function injectAndGo(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.evaluate(({ usuario, accessToken, refreshToken }) => {
    localStorage.setItem('efvm360-usuario', JSON.stringify(usuario));
    localStorage.setItem('efvm360-jwt', accessToken);
    localStorage.setItem('efvm360-jwt-refresh', refreshToken);
    sessionStorage.setItem('efvm360-session-auth', JSON.stringify(usuario));
  }, authData);
  await page.goto('/');
  await page.locator('[data-tour="nav-principal"]').waitFor({ state: 'visible', timeout: 15_000 });
}

test.describe('Autenticacao', () => {
  test('tela de login renderiza com campos e botao', async ({ page }) => {
    await page.goto('/login');
    const matriculaInput = page.getByPlaceholder(/matr[ií]cula/i);
    await matriculaInput.waitFor({ state: 'visible', timeout: 15_000 });
    await expect(matriculaInput).toBeVisible();
    await expect(page.getByPlaceholder(/senha/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /acessar/i })).toBeVisible();
  });

  test('login via session injection carrega sistema', async ({ page }) => {
    await injectAndGo(page);
    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-tour="nav-principal"]')).toBeVisible();
  });

  test('login com credenciais invalidas mostra erro', async ({ page }) => {
    await page.goto('/login');
    const matriculaInput = page.getByPlaceholder(/matr[ií]cula/i);
    await matriculaInput.waitFor({ state: 'visible', timeout: 15_000 });
    await matriculaInput.fill('VFZ9999');
    await page.getByPlaceholder(/senha/i).fill('senhaerrada');
    await page.getByRole('button', { name: /acessar/i }).click();
    await expect(page.getByText(/inv[aá]lid|incorret|erro/i)).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL('/login');
  });

  test('logout redireciona para /login', async ({ page }) => {
    await injectAndGo(page);
    await page.locator('[data-tour="user-menu"]').click();
    await page.getByText(/sair/i).click();
    await expect(page).toHaveURL('/login');
  });

  test('acesso a rota protegida sem auth redireciona para /login', async ({ page }) => {
    await page.goto('/passagem');
    await expect(page).toHaveURL('/login');
  });

  test('campo senha e mascarado (type=password)', async ({ page }) => {
    await page.goto('/login');
    const senhaInput = page.getByPlaceholder(/senha/i);
    await senhaInput.waitFor({ state: 'visible', timeout: 15_000 });
    await expect(senhaInput).toHaveAttribute('type', 'password');
  });
});
