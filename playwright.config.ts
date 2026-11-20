import { existsSync } from 'fs';
import { defineConfig, devices } from '@playwright/test';

// This cloud environment ships a newer WebKit build than the pinned Playwright expects; use it when present.
// Override with SLATE_WEBKIT_PATH, or remove to use Playwright's own download elsewhere.
const webkitPath = process.env.SLATE_WEBKIT_PATH ?? '/opt/pw-browsers/webkit-2386/pw_run.sh';
const webkitLaunch = existsSync(webkitPath) ? { launchOptions: { executablePath: webkitPath } } : {};

const IOS_27 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1';
const IPHONE_18_PRO_MAX = { ...devices['iPhone 17 Pro Max'], userAgent: IOS_27 };
const IPHONE_18_PRO_MAX_LANDSCAPE = { ...devices['iPhone 17 Pro Max landscape'], userAgent: IOS_27 };

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
    // The iPhone 18 Pro Max is the game's one phone (the owner, November 20, 2026: "the mobile device it should only fit
    // and be perfected for ... the base gameplay device"). Until then the phone projects were the iPhone 15 Plus and 15 Pro
    // Max, and a generic 390-pixel phone. Its screen is Apple's (support.apple.com/en-us/148591: 6.9 inches, 2868 by 1320
    // pixels at 460 ppi, so 440 by 956 at 3x), the same panel as the 17 Pro Max, whose Safari viewport this keeps; the
    // user agent names iOS 27, which Apple's page names. Emulation only: not a physical iPhone 18 Pro Max or real Safari.
    { name: 'phone', use: { ...devices['Desktop Chrome'], viewport: IPHONE_18_PRO_MAX.viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } },
    { name: 'iphone-18-pro-max', testMatch: /(ui-coverage|live-action|devices|creation|focus|phone-layout|connected|title-input|journey-e|decisions|catalog|children|foundation|data-packs|creative-ideas|real-people|craft|destinations|layout|stories|characters|picture-library|sources|studio-pitch|casting-director|line-producer|representation|v5-first-look|v5-release-plan|v5-music-catalog|v5-money-equipment|v6-history|v6-first-look-tv|v9-bank|v9-project-money|v9-papers|season|career|awards|readers)\.spec\.ts/, use: { ...IPHONE_18_PRO_MAX, ...webkitLaunch } },
    { name: 'iphone-18-pro-max-landscape', testMatch: /(devices|phone-layout)\.spec\.ts/, use: { ...IPHONE_18_PRO_MAX_LANDSCAPE, ...webkitLaunch } },
    // Every journey on WebKit on the iPhone 18 Pro Max, with no list of files: SLATE_E2E_WEBKIT_ALL=1 adds it (from
    // November 20, 2026; e2e/helpers.ts onlyOn lets a desktop-only journey run here too). Opt-in, as a whole run takes
    // hours.
    ...(process.env.SLATE_E2E_WEBKIT_ALL === '1' ? [{ name: 'iphone-webkit-all', use: { ...IPHONE_18_PRO_MAX, ...webkitLaunch } }] : []),
  ],
});
