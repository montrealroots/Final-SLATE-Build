import { test as base, expect } from '@playwright/test';

/**
 * Every journey records console errors, uncaught page errors and failed requests, attaches them to the report, and
 * fails on any. A test that injects failures on purpose says so with expectErrors(), and its errors are only attached.
 */
export const test = base.extend<{ diagnostics: void }>({
  diagnostics: [async ({ page }, use, info) => {
    const seen: string[] = [];
    page.on('pageerror', (e) => seen.push(`page error: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') seen.push(`console error: ${m.text()}`); });
    page.on('requestfailed', (r) => {
      const why = r.failure()?.errorText ?? 'unknown';
      // A request the browser cancels because the page reloads or navigates is not a failure (route.abort() reports
      // net::ERR_FAILED, so injected failures are still caught).
      if (/^(net::ERR_ABORTED|Load request cancelled|NS_BINDING_ABORTED)$/.test(why)) return;
      seen.push(`request failed: ${r.method()} ${new URL(r.url()).pathname} (${why})`);
    });
    await use();
    if (seen.length) await info.attach('diagnostics', { body: seen.join('\n'), contentType: 'text/plain' });
    const expected = info.annotations.some((a) => a.type === 'expected-errors');
    if (!expected && info.status === 'passed') expect(seen, 'console errors, page errors or failed requests').toEqual([]);
  }, { auto: true }],
});

/** Marks the running test as one that causes errors on purpose (failure injection). */
export function expectErrors(reason: string): void {
  test.info().annotations.push({ type: 'expected-errors', description: reason });
}

export { expect };
export type { Page } from '@playwright/test';
