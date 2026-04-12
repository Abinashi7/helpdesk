import { defineConfig, devices } from '@playwright/test';

const BACKEND_URL = 'http://localhost:3002';
const FRONTEND_URL = 'http://localhost:5174';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',

  globalSetup: './global-setup.ts',

  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      name: 'backend',
      // Starts the Express server using the test env file (port 3002, test DB)
      command: 'bun --env-file ../.env.test src/index.ts',
      url: `${BACKEND_URL}/api/health`,
      cwd: '../backend',
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      name: 'frontend',
      // Starts Vite on port 5174, pointing VITE_API_URL at the test backend
      command: 'bun run dev -- --port 5174',
      url: FRONTEND_URL,
      cwd: '../frontend',
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        VITE_API_URL: BACKEND_URL,
      },
    },
  ],
});
