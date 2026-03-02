import { test as base, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

const authData = JSON.parse(
  readFileSync(join(__dirname, '..', '.auth', 'inspetor.json'), 'utf-8')
);

async function mobileInject(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.evaluate(({ usuario, accessToken, refreshToken }) => {
    localStorage.setItem('efvm360-usuario', JSON.stringify(usuario));
    localStorage.setItem('efvm360-jwt', accessToken);
    localStorage.setItem('efvm360-jwt-refresh', refreshToken);
    sessionStorage.setItem('efvm360-session-auth', JSON.stringify(usuario));
  }, authData);
  await page.goto('/');
}

base.describe('Responsividade — Mobile', () => {
  base.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  base('login funciona em mobile', async ({ page }) => {
    await mobileInject(page);
    await expect(page).toHaveURL('/');
    const body = await page.textContent('body');
    expect(body?.length).toBeGreaterThan(50);
  });

  base('tela de login renderiza sem overflow horizontal', async ({ page }) => {
    await page.goto('/login');
    const matriculaInput = page.getByPlaceholder(/matr[ií]cula/i);
    await matriculaInput.waitFor({ state: 'visible', timeout: 15_000 });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  base('dashboard renderiza sem overflow em mobile', async ({ page }) => {
    await mobileInject(page);
    await expect(page).toHaveURL('/');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  base('passagem carrega em mobile', async ({ page }) => {
    await mobileInject(page);
    await page.goto('/passagem');
    await expect(page).toHaveURL('/passagem');
    const body = await page.textContent('body');
    expect(body?.length).toBeGreaterThan(50);
  });
});
