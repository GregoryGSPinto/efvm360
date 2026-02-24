import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Navegação', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('página inicial carrega após login', async ({ page }) => {
    await expect(page.locator('text=Visão Geral')).toBeVisible({ timeout: 5000 });
  });

  test('navegar para Passagem de Serviço', async ({ page }) => {
    await page.click('text=Passagem');
    await expect(page.locator('text=Cabeçalho')).toBeVisible({ timeout: 5000 });
  });

  test('navegar para Configurações', async ({ page }) => {
    await page.click('text=Configurações');
    await expect(page.locator('text=Perfil')).toBeVisible({ timeout: 5000 });
  });

  test('navegar para Histórico', async ({ page }) => {
    await page.click('text=Histórico');
    await expect(page.locator('text=Resumo')).toBeVisible({ timeout: 5000 });
  });

  test('navegar para BI+', async ({ page }) => {
    await page.click('text=BI+');
    await expect(page.locator('body')).toBeVisible();
  });
});
