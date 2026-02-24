import { test, expect } from '@playwright/test';

test.describe('Responsividade', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 },
  ];

  for (const vp of viewports) {
    test(`login renderiza corretamente em ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      await expect(page.locator('[data-testid="btn-login"]')).toBeVisible();
      // Login button should be clickable
      await expect(page.locator('[data-testid="btn-login"]')).toBeEnabled();
    });
  }
});
