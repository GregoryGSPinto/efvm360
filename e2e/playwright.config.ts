import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  timeout: 30000,
  retries: 1,
  use: { baseURL: 'http://localhost:5173', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'cd ../vfz && npm run dev', port: 5173, reuseExistingServer: true },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
});
