import { existsSync } from 'fs';
import { defineConfig, devices } from '@playwright/test';

// This cloud environment ships a newer WebKit build than the pinned Playwright expects; use it when present.
// Override with SLATE_WEBKIT_PATH, or remove to use Playwright's own download elsewhere.
const webkitPath = process.env.SLATE_WEBKIT_PATH ?? '/opt/pw-browsers/webkit-2386/pw_run.sh';
const webkitLaunch = existsSync(webkitPath) ? { launchOptions: { executablePath: webkitPath } } : {};

export default defineConfig({
  testDir: 'e2e',
  timeout: 240_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: 'test-results',
  use: { baseURL: 'http://localhost:5174', trace: 'off', screenshot: 'only-on-failure' },
  webServer: { command: 'npx vite --port 5174 --strictPort', url: 'http://localhost:5174', reuseExistingServer: true, timeout: 60_000 },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    { name: 'phone', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } },
    // WebKit emulation of the user's target phones. Emulation only: not physical-device or real Safari verification.
    { name: 'iphone-15-plus', testMatch: /(live-action|devices)\.spec\.ts/, use: { ...devices['iPhone 15 Plus'], ...webkitLaunch } },
    { name: 'iphone-15-pro-max', testMatch: /(live-action|devices)\.spec\.ts/, use: { ...devices['iPhone 15 Pro Max'], ...webkitLaunch } },
    { name: 'iphone-15-pro-max-landscape', testMatch: /devices\.spec\.ts/, use: { ...devices['iPhone 15 Pro Max landscape'], ...webkitLaunch } },
  ],
});
