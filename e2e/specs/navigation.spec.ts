import { test, expect } from '../fixtures/auth';

test.describe('Navegacao', () => {
  test('pagina inicial carrega apos login', async ({ adminPage: page }) => {
    await expect(page.locator('[data-tour="nav-principal"]')).toBeVisible();
  });

  const routes = [
    { nav: 'nav-passagem', label: /boa jornada/i, url: '/passagem' },
    { nav: 'nav-dss', label: /dss/i, url: '/dss' },
    { nav: 'nav-analytics', label: /bi\+/i, url: '/analytics' },
    { nav: 'nav-historico', label: /hist[oó]rico/i, url: '/historico' },
    { nav: 'nav-layout', label: /layout/i, url: '/layout' },
  ];

  for (const route of routes) {
    test(`navegar para ${route.url}`, async ({ adminPage: page }) => {
      await page.locator(`[data-tour="${route.nav}"]`).click();
      await expect(page).toHaveURL(route.url);
    });
  }

  test('navegar para /configuracoes via user menu', async ({ adminPage: page }) => {
    await page.locator('[data-tour="user-menu"]').click();
    await page.getByText(/configura[cç][oõ]es/i).click();
    await expect(page).toHaveURL('/configuracoes');
  });

  test('navegar para /perfil via user menu', async ({ adminPage: page }) => {
    await page.locator('[data-tour="user-menu"]').click();
    await page.getByText(/meu perfil/i).click();
    await expect(page).toHaveURL('/perfil');
  });

  test('deep link funciona — navegar direto para /analytics', async ({ adminPage: page }) => {
    await page.goto('/analytics');
    await expect(page).toHaveURL('/analytics');
    await expect(page.locator('[data-tour="nav-principal"]')).toBeVisible();
  });

  test('browser back funciona', async ({ adminPage: page }) => {
    // Navigate using page.goto to ensure proper history entries
    await page.goto('/passagem');
    await expect(page).toHaveURL('/passagem');
    await page.goto('/dss');
    await expect(page).toHaveURL('/dss');
    await page.goBack();
    await expect(page).toHaveURL('/passagem');
  });
});
