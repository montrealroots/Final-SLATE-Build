// SLATE: the holiday files' addresses, loaded when a country's holidays are first asked for (from November 20, 2026).
// Until then holidays.ts held this list itself, so every game's start requested one module per file (206 in the dev
// server) beside everything else, which ran Chromium out of request capacity on a loaded machine.
export const HOLIDAY_URLS = import.meta.glob('../data/holidays/*.tsv', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
