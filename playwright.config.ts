import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests run against a production build served by `vite preview`, using the
 * on-device mock provider (no API). Set PW_CHROME_PATH to use an installed Chrome instead of
 * Playwright's bundled Chromium.
 */
const PORT = 4173
const executablePath = process.env['PW_CHROME_PATH']

const chromium = {
  launchOptions: {
    ...(executablePath ? { executablePath } : {}),
    // A synthetic camera, so getUserMedia works headless. Permission is still per-test.
    args: ['--use-fake-device-for-media-stream'],
  },
}

export default defineConfig({
  testDir: './e2e',
  testIgnore: 'full-stack/**', // needs the API stack: playwright.fullstack.config.ts
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], ...chromium } },
    { name: 'mobile', use: { ...devices['Pixel 7'], ...chromium } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
    env: { BASE_PATH: '/', VITE_API_BASE_URL: '' },
  },
})
