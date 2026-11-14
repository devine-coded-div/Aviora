import { defineConfig, devices } from '@playwright/test'

/**
 * Full-stack e2e: the production frontend build talking to the real API server, a fresh
 * Postgres database and a local fake of Razorpay (test keys only). Needs PostgreSQL —
 * set E2E_DATABASE_ADMIN_URL (defaults to the local dev socket) — and the server's
 * dependencies installed with a generated Prisma client.
 */
const executablePath = process.env['PW_CHROME_PATH']
const WEB = 4174
const API = 4180

export default defineConfig({
  testDir: './e2e/full-stack',
  workers: 1,
  forbidOnly: !!process.env['CI'],
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${WEB}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: executablePath ? { executablePath } : {},
  },
  webServer: [
    {
      command: 'node e2e/full-stack/stack.mjs',
      url: `http://127.0.0.1:${API}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npx vite build --outDir dist-fullstack && npx vite preview --outDir dist-fullstack --port ${WEB} --strictPort`,
      url: `http://localhost:${WEB}`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: { BASE_PATH: '/', VITE_API_BASE_URL: `http://localhost:${API}` },
    },
  ],
})
