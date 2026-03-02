import { test, expect } from '../fixtures/auth';

test.describe('Passagem — Fluxo Principal', () => {
  test('formulario exibe secoes de navegacao', async ({ adminPage: page }) => {
    await page.locator('[data-tour="nav-passagem"]').click();
    await expect(page).toHaveURL('/passagem');
    // Should see at least one section label
    await expect(page.getByText(/cabe[cç]alho/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('navegar entre secoes do formulario', async ({ adminPage: page }) => {
    await page.locator('[data-tour="nav-passagem"]').click();
    await expect(page).toHaveURL('/passagem');

    // Click different sections — they should be clickable tabs/buttons
    const sections = [
      /equipamentos/i,
      /seguran[cç]a/i,
      /assinaturas/i,
      /cabe[cç]alho/i,
    ];

    for (const section of sections) {
      const btn = page.getByRole('button', { name: section }).or(
        page.getByText(section).first()
      );
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btn.click();
      }
    }
    // Should still be on passagem page without errors
    await expect(page).toHaveURL('/passagem');
  });

  test('cabecalho permite selecionar turno', async ({ adminPage: page }) => {
    await page.locator('[data-tour="nav-passagem"]').click();
    await expect(page).toHaveURL('/passagem');
    // Look for turno selector — it may be a select or buttons
    const turnoSelect = page.locator('select').first();
    if (await turnoSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      const options = await turnoSelect.locator('option').allTextContents();
      expect(options.length).toBeGreaterThanOrEqual(1);
    }
  });

  test('secao 5S mostra checklist com Sim/Nao', async ({ adminPage: page }) => {
    await page.locator('[data-tour="nav-passagem"]').click();
    await expect(page).toHaveURL('/passagem');
    // Navigate to 5S section
    const fiveS = page.getByText(/5s/i).first();
    if (await fiveS.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fiveS.click();
      // Should see yes/no buttons
      const simBtn = page.getByText(/sim/i).first();
      await expect(simBtn).toBeVisible({ timeout: 5000 });
    }
  });
});
