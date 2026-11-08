import { defineConfig, devices } from '@playwright/test';

/**
 * Cấu hình kiểm thử tự động E2E cho Frontend Web PharmaChain (WDP301/SEP490)
 * Sử dụng Playwright kiểm thử các luồng giao diện người dùng
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: process.env.VITE_APP_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

