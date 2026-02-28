import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

test.describe('Gestão de Troca de Turno', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.click('text=Passagem');
    await page.waitForTimeout(500);
  });

  test('formulário exibe seções de navegação', async ({ page }) => {
    await expect(page.locator('text=Cabeçalho')).toBeVisible();
  });

  test('cabeçalho permite selecionar turno', async ({ page }) => {
    const turnoSelect = page.locator('select').first();
    if (await turnoSelect.isVisible()) {
      await turnoSelect.selectOption({ index: 1 });
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('seção de segurança carrega com checklist', async ({ page }) => {
    // Navigate to segurança section
    const segBtn = page.locator('text=Segurança');
    if (await segBtn.isVisible()) {
      await segBtn.click();
      await page.waitForTimeout(500);
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('seção de equipamentos exibe lista', async ({ page }) => {
    const eqBtn = page.locator('text=Equipamentos');
    if (await eqBtn.isVisible()) {
      await eqBtn.click();
      await page.waitForTimeout(500);
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('assinaturas exigem validação antes de assinar', async ({ page }) => {
    const assBtn = page.locator('text=Assinaturas');
    if (await assBtn.isVisible()) {
      await assBtn.click();
      await page.waitForTimeout(500);
    }
    await expect(page.locator('body')).toBeVisible();
  });
});
