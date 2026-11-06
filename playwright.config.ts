import { existsSync } from 'fs';
import { defineConfig, devices } from '@playwright/test';

// This cloud environment ships a newer WebKit build than the pinned Playwright expects; use it when present.
// Override with SLATE_WEBKIT_PATH, or remove to use Playwright's own download elsewhere.
const webkitPath = process.env.SLATE_WEBKIT_PATH ?? '/opt/pw-browsers/webkit-2386/pw_run.sh';
const webkitLaunch = existsSync(webkitPath) ? { launchOptions: { executablePath: webkitPath } } : {};

const prod = process.env.SLATE_E2E_PROD === '1';
const port = prod ? 4175 : 5174;

export default defineConfig({
  testDir: 'e2e',
  timeout: 240_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: 'test-results',
  use: { baseURL: `http://localhost:${port}`, trace: 'off', screenshot: 'only-on-failure' },
  // SLATE_E2E_PROD=1 runs every journey against the production build (vite build, then vite preview) instead of the dev server.
  webServer: prod
    ? { command: `npx vite build && npx vite preview --port ${port} --strictPort`, url: `http://localhost:${port}`, reuseExistingServer: false, timeout: 180_000 }
    : { command: `npx vite --port ${port} --strictPort`, url: `http://localhost:${port}`, reuseExistingServer: true, timeout: 60_000 },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    { name: 'phone', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } },
    // WebKit emulation of the user's target phones. Emulation only: not physical-device or real Safari verification.
    { name: 'iphone-15-plus', testMatch: /(live-action|devices|creation)\.spec\.ts/, use: { ...devices['iPhone 15 Plus'], ...webkitLaunch } },
    { name: 'iphone-15-pro-max', testMatch: /(live-action|devices|creation)\.spec\.ts/, use: { ...devices['iPhone 15 Pro Max'], ...webkitLaunch } },
    { name: 'iphone-15-pro-max-landscape', testMatch: /devices\.spec\.ts/, use: { ...devices['iPhone 15 Pro Max landscape'], ...webkitLaunch } },
  ],
});
