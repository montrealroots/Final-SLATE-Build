import { appendFileSync, writeFileSync } from 'node:fs';
import { test as base, expect } from '@playwright/test';
import { findMisalignments, type Finding } from './layout';
import { auditPage } from './ui-audit';

/**
 * Every journey records console errors, uncaught page errors and failed requests, attaches them to the report, and
 * fails on any. A test that injects failures on purpose says so with expectErrors(), and its errors are only attached.
 */
export const test = base.extend<{ diagnostics: void }>({
  diagnostics: [async ({ page, browserName }, use, info) => {
    const seen: string[] = [];
    // WebKit only: a working title has twice been lost in CI and never here (QA-REPORT.md, Open). The page keeps a
    // bounded log of focus and input events, with who called focus(), and a failing test attaches it.
    if (browserName === 'webkit') await page.addInitScript(() => {
      const w = window as unknown as { __inputLog: string[] };
      w.__inputLog = [];
      const t0 = performance.now();
      const log = (x: string) => { w.__inputLog.push(`${(performance.now() - t0).toFixed(0)}ms ${x}`); if (w.__inputLog.length > 400) w.__inputLog.shift(); };
      const name = (e: EventTarget | null) => { const el = e as HTMLElement | null; return el?.tagName ? `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}` : String(e); };
      for (const k of ['focusin', 'focusout', 'beforeinput', 'input']) {
        document.addEventListener(k, (e) => log(`${k} ${name(e.target)} value=${JSON.stringify((e.target as HTMLInputElement).value ?? null)} active=${name(document.activeElement)}`), true);
      }
      const focus = HTMLElement.prototype.focus;
      HTMLElement.prototype.focus = function (this: HTMLElement, o?: FocusOptions) {
        log(`focus() on ${name(this)} from ${(new Error().stack ?? '').split('\n').slice(1, 3).join(' | ')}`);
        return focus.call(this, o);
      };
    });
    // SLATE_LAYOUT_SWEEP=<file>: every screen a journey reaches is measured as it changes, at most every 400 ms (e2e/layout.ts; the game's clock changes the page all the time, so waiting for it to settle never measured anything), and what is
    // found is appended to the file, one finding a line. A measure to read, not a check: it never fails a journey.
    const sweep = process.env.SLATE_LAYOUT_SWEEP;
    if (sweep) {
      const told = new Set<string>();
      await page.exposeFunction('__layoutFound', (xs: Finding[]) => {
        for (const x of xs) { const k = JSON.stringify([x.kind, x.where, x.a, x.b]); if (!told.has(k)) { told.add(k); appendFileSync(sweep, `${JSON.stringify({ ...x, project: info.project.name, test: info.title })}\n`); } }
      });
      await page.addInitScript(`(() => { const find = ${findMisalignments.toString()}; let due = false; const run = () => { due = false; try { Promise.resolve(window.__layoutFound(find())).catch(() => {}); } catch { /* the page is going */ } };
        new MutationObserver(() => { if (!due) { due = true; setTimeout(run, 400); } }).observe(document, { childList: true, subtree: true, attributes: true }); })();`);
    }
    // SLATE_UI_SWEEP=<file>: the whole audit (e2e/ui-audit.ts), on every screen and dialog a journey reaches, at the
    // size the journey runs at. A line for each screen seen and for each defect on it; nothing is measured while
    // something is sliding or fading, so a drawer half way in isn't one. tools/v3/ui-coverage.mjs reads the file.
    const ui = process.env.SLATE_UI_SWEEP;
    if (ui) {
      const told = new Set<string>();
      await page.exposeFunction('__uiFound', (lines: Record<string, unknown>[]) => {
        for (const x of lines) {
          if (x.t === 'sig') { const fresh = (x.items as string[]).filter((i) => { const k = `${x.screen}|${x.dialog}|${i}`; if (told.has(k)) return false; told.add(k); return true; }); if (!fresh.length) continue; x.items = fresh; }
          const k = JSON.stringify(x); if (x.t !== 'sig' && told.has(k)) continue; told.add(k);
          appendFileSync(ui, `${JSON.stringify({ ...x, project: info.project.name, spec: info.file.split('/').at(-1), test: info.title.slice(0, 60) })}\n`);
        }
      });
      await page.addInitScript(`(() => { const audit = ${auditPage.toString()}; const find = ${findMisalignments.toString()};
        let due = false;
        const measure = () => {
          const main = document.querySelector('main[data-view]'), dlg = [...document.querySelectorAll('[role="dialog"]')].at(-1), step = document.querySelector('.creation-step[aria-current="step"]');
          const screen = main ? main.dataset.view + (main.dataset.tab ? ':' + main.dataset.tab : '') : step ? 'creation:' + step.textContent.split(/[ \\u00a0]+/).join(' ').trim() : document.querySelector('.start-page') ? 'start:' + ([...document.querySelectorAll('h1, h2')].map((x) => x.textContent.trim()).find((x) => /^(Opening Your Game|Couldn.t Open This Save|Choose Missing Places|Saved Games)$/.test(x)) ?? '') : 'other';
          const dialog = dlg ? (dlg.dataset.dialog ? '@' + dlg.dataset.dialog : (dlg.querySelector('.modal-head h2, h2, h3')?.textContent ?? 'dialog').trim()) : '';
          const a = audit();
          const defects = [...a.defects, ...find().map((f) => ({ kind: f.kind, what: f.a + ' | ' + f.b, by: f.by, where: f.where.split(' / ').at(-1) ?? '' }))];
          return { key: screen + '|' + dialog + '|' + innerWidth + 'x' + innerHeight, screen, dialog, size: innerWidth + 'x' + innerHeight, a, defects };
        };
        const tell = (m, defects) => {
          const { screen, dialog, size, a } = m;
          const out = [{ t: 'seen', screen, dialog, size, coarse: matchMedia('(pointer: coarse)').matches }];
          for (const d of defects) out.push({ t: 'defect', screen, dialog, size, kind: d.kind, what: d.what, where: d.where, by: Math.round(d.by) });
          for (const x of a.accepted) out.push({ t: 'accepted', screen, dialog, size, what: x });
          for (const x of a.scrollers) out.push({ t: 'scroller', screen, dialog, size, what: x });
          // What the screen offers, for a desktop run and a phone run of the same journey to be compared.
          const sig = [...a.signature.headings.map((x) => 'heading: ' + x), ...a.signature.actions.map((x) => 'press: ' + x), ...a.signature.fields.map((x) => 'field: ' + x)];
          if (sig.length) out.push({ t: 'sig', screen, dialog, items: sig.map((x) => x.replace(/[0-9]+/g, '#').slice(0, 70)) });
          Promise.resolve(window.__uiFound(out)).catch(() => {});
        };
        const run = () => { due = false; try {
          // Not while something is sliding or fading: a drawer half way in is not where anything is.
          if (document.getAnimations().some((x) => x.playState === 'running' && x.effect?.getComputedTiming().iterations !== Infinity)) { due = true; setTimeout(run, 250); return; }
          const first = measure();
          if (!first.defects.length) { tell(first, []); return; }
          // A defect counts if it is still there a fifth of a second on, on the same screen at the same size: a window
          // being resized, or a list arriving, passes through states nobody sees.
          setTimeout(() => { try { const again = measure(); if (again.key !== first.key) return; const still = new Set(again.defects.map((d) => d.kind + '|' + d.what)); tell(again, first.defects.filter((d) => still.has(d.kind + '|' + d.what))); } catch { /* the page is going */ } }, 200);
        } catch { /* the page is going */ } };
        new MutationObserver(() => { if (!due) { due = true; setTimeout(run, 400); } }).observe(document, { childList: true, subtree: true, attributes: true }); })();`);
    }
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
    if (browserName === 'webkit' && info.status !== info.expectedStatus) {
      const events = await page.evaluate(() => (window as unknown as { __inputLog?: string[] }).__inputLog ?? []).catch(() => ['(the page was gone)']);
      // A file, not a body: the list reporter prints only the start of a long text attachment.
      const path = info.outputPath('focus-and-input.txt');
      writeFileSync(path, events.join('\n'));
      await info.attach('focus-and-input', { path, contentType: 'text/plain' });
    }
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
