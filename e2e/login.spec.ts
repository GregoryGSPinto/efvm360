import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Autenticação', () => {
  test('login com credenciais válidas', async ({ page }) => {
    await login(page);
    await expect(page.locator('[data-testid="sistema-principal"]')).toBeVisible();
  });

  test('login com senha incorreta mostra erro', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="matricula"]', 'Vale001');
    await page.fill('[data-testid="senha"]', 'SenhaErrada');
    await page.click('[data-testid="btn-login"]');
    await expect(page.locator('text=incorretos')).toBeVisible({ timeout: 5000 });
  });

  test('login com matrícula vazia não submete', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="senha"]', 'Vale@2024');
    await page.click('[data-testid="btn-login"]');
    // Should stay on login screen
    await expect(page.locator('[data-testid="btn-login"]')).toBeVisible();
  });

  test('logout retorna à tela de login', async ({ page }) => {
    await login(page);
    await page.click('[data-testid="btn-logout"]');
    await expect(page.locator('[data-testid="btn-login"]')).toBeVisible();
  });

  test('campo senha é do tipo password (mascarado)', async ({ page }) => {
    await page.goto('/');
    const senhaInput = page.locator('[data-testid="senha"]');
    await expect(senhaInput).toHaveAttribute('type', 'password');
  });

  test('senha não aparece em texto visível após login', async ({ page }) => {
    await login(page);
    const pageText = await page.textContent('body');
    expect(pageText).not.toContain('Vale@2024');
  });
});
