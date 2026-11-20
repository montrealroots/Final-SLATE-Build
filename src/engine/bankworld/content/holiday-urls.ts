// SLATE: the holiday files' addresses, loaded when a country's holidays are first asked for (from November 20, 2026).
// Until then holidays.ts held this list itself, so every game's start requested one module per file (206 in the dev
// server) beside everything else. That was believed to run Chromium out of request capacity; the crash it was meant to
// stop turned out to be shared memory on a nearly full /tmp (playwright.config.ts chromiumLaunch).
export const HOLIDAY_URLS = import.meta.glob('../data/holidays/*.tsv', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
