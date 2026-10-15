import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3333',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  webServer: {
    // In CI, Next.js is already built by the CI workflow step, so we start the pre-built server directly
    command: process.env.CI ? 'next start -p 3333' : 'npm run build && next start -p 3333',
    url: 'http://localhost:3333',
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,
    env: {
      E2E_DETERMINISTIC: '1',
    },
  },
});
