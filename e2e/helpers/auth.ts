import { Page } from '@playwright/test';

export async function login(page: Page, matricula = 'Vale001', senha = 'Vale@2024') {
  await page.goto('/');
  await page.fill('[data-testid="matricula"]', matricula);
  await page.fill('[data-testid="senha"]', senha);
  await page.click('[data-testid="btn-login"]');
  await page.waitForSelector('[data-testid="sistema-principal"]', { timeout: 15000 });
}
