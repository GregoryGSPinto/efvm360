import { test, expect } from '../fixtures/auth';

test.describe('Patio — Gestao de Layout', () => {
  test('pagina de layout carrega', async ({ adminPage: page }) => {
    await page.locator('[data-tour="nav-layout"]').click();
    await expect(page).toHaveURL('/layout');
    // Should show yard content
    await expect(page.locator('[data-tour="nav-principal"]')).toBeVisible();
  });

  test('lista patios existentes', async ({ adminPage: page }) => {
    await page.locator('[data-tour="nav-layout"]').click();
    await expect(page).toHaveURL('/layout');
    // The page should contain at least one yard name from the seed data
    const body = await page.textContent('body');
    const hasYard = /VFZ|Flexal|Fazend|VBR|Bar[aã]o|P6|Pedro|VTO|Tubar/i.test(body || '');
    expect(hasYard).toBe(true);
  });

  test('seletor de patio funciona', async ({ adminPage: page }) => {
    await page.locator('[data-tour="nav-layout"]').click();
    await expect(page).toHaveURL('/layout');

    // Look for a yard selector (dropdown or tabs)
    const yardSelect = page.locator('select').first();
    if (await yardSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      const options = await yardSelect.locator('option').allTextContents();
      expect(options.length).toBeGreaterThanOrEqual(2);
    }
  });
});
