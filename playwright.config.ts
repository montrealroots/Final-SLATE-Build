import { existsSync } from 'fs';
import { defineConfig, devices } from '@playwright/test';

// This cloud environment ships a newer WebKit build than the pinned Playwright expects; use it when present.
// Override with SLATE_WEBKIT_PATH, or remove to use Playwright's own download elsewhere.
const webkitPath = process.env.SLATE_WEBKIT_PATH ?? '/opt/pw-browsers/webkit-2386/pw_run.sh';
const webkitLaunch = existsSync(webkitPath) ? { launchOptions: { executablePath: webkitPath } } : {};

const prod = process.env.SLATE_E2E_PROD === '1';
// SLATE_E2E_PORT lets a second checkout run its journeys beside another run.
const port = Number(process.env.SLATE_E2E_PORT) || (prod ? 4175 : 5174);

export default defineConfig({
  testDir: 'e2e',
  timeout: 240_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: 'test-results',
  use: { baseURL: `http://localhost:${port}`, trace: 'off', screenshot: 'only-on-failure' },
  // SLATE_E2E_PROD=1 runs every journey against the production build served by the production server (server/serve.mjs),
  // with no Vite in the path; until November 11, 2026 it was vite preview, whose middleware supplied the catalog. It also
  // serves the made-up catalog through that server on 4176, and an expired one on 4177 (e2e/serve-prod.ts).
  webServer: prod
    ? { command: `npx vite build && node e2e/serve-prod.ts`, url: `http://localhost:${port}`, reuseExistingServer: false, timeout: 180_000 }
    : { command: `npx vite --port ${port} --strictPort`, url: `http://localhost:${port}`, reuseExistingServer: true, timeout: 60_000 },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    { name: 'phone', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } },
    // WebKit emulation of the user's target phones. Emulation only: not physical-device or real Safari verification.
    { name: 'iphone-15-plus', testMatch: /(live-action|devices|creation|focus|season|career|awards|readers|title-input)\.spec\.ts/, use: { ...devices['iPhone 15 Plus'], ...webkitLaunch } },
    { name: 'iphone-15-pro-max', testMatch: /(live-action|devices|creation|focus|connected|title-input|journey-e|decisions|catalog|children|foundation|data-packs|creative-ideas|real-people|craft|destinations)\.spec\.ts/, use: { ...devices['iPhone 15 Pro Max'], ...webkitLaunch } },
    { name: 'iphone-15-pro-max-landscape', testMatch: /devices\.spec\.ts/, use: { ...devices['iPhone 15 Pro Max landscape'], ...webkitLaunch } },
  ],
});
