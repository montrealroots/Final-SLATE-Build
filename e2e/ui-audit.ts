import type { Page } from '@playwright/test';
import { findMisalignments, type Finding } from './layout';

/**
 * What one screen shows and what is wrong with how it is laid out, read from the page (the owner's UI brief of
 * November 12, 2026, docs/v3/UI-BRIEF.md, parts 3 and 5). It adds to e2e/layout.ts, which measures form rows, the
 * things a phone breaks:
 *
 * - `sideways`: the page, or its scrolling pane, scrolls sideways;
 * - `outside`: something is past the left or right edge of the screen, and isn't in a pane meant to scroll sideways;
 * - `bleed`: something is wider than the card, row, cell or button it is in;
 * - `clipped`: words are cut off by their own box, across or down, or a chooser is too narrow for the choice it shows;
 * - `target`: on a touch screen, something to tap is under 44 pixels in either direction;
 * - `dialog`: an open dialog is not wholly on the screen, or its buttons are not;
 * - `covered` (coveredWhenFocused): a field or button, brought into view by focusing it, is under a bar that stays put;
 * - `shift` (watchShifts, Chromium only): the page moved by itself after it was drawn, more than a tenth of the
 *   screen (the layout-shift score browsers report), as it does when a picture or a list arrives late with no room kept.
 *
 * `accepted` lists what is under a rule's line for a reason the rule itself allows, said each time rather than
 * skipped quietly: a map's markers are small because the list beside the map opens the same places.
 *
 * `scrollers` lists the panes that scroll sideways on purpose, so each can be looked at: a wide table is a reason,
 * a form is not. The signature is what parity compares between a desktop and a phone: the same headings in the same
 * order, the same things to press, the same fields.
 */
export interface Defect { kind: Finding['kind'] | 'sideways' | 'outside' | 'bleed' | 'clipped' | 'target' | 'dialog' | 'covered' | 'shift'; what: string; by: number; where: string }
export interface Audit { signature: { headings: string[]; actions: string[]; fields: string[] }; defects: Defect[]; scrollers: string[]; accepted: string[] }

/** Runs in the page, so it uses nothing from outside itself. */
export function auditPage(): Audit {
  const vw = document.documentElement.clientWidth, vh = window.innerHeight;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const defects: Defect[] = [];
  // What is on top: an open dialog hides the page behind it from the audit, as it does from the player.
  const dialogs = [...document.querySelectorAll('dialog[open], [role="dialog"], [role="alertdialog"]')].filter((d) => (d as HTMLElement).offsetParent !== null || getComputedStyle(d).position === 'fixed');
  const top = dialogs.at(-1) ?? null;
  const root: Element = top ?? document.body;
  const seen = (el: Element): boolean => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const h = el as HTMLElement;
    if (typeof h.checkVisibility === 'function' && !h.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    if (el.closest('.sr-only, [hidden], [aria-hidden="true"], [inert]')) return false;
    for (let up = el.parentElement; up; up = up.parentElement) {
      const st = getComputedStyle(up);
      if (st.overflowY === 'visible' && st.overflowX === 'visible') continue;
      const c = up.getBoundingClientRect();
      if (r.bottom <= c.top + 1 || r.top >= c.bottom - 1 || r.right <= c.left + 1 || r.left >= c.right - 1) return false;
    }
    return true;
  };
  const words = (el: Element): string => {
    const own = el.getAttribute('aria-label') ?? (el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent : null) ?? el.textContent ?? '';
    const cls = typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : '';
    return `${el.tagName.toLowerCase()}${cls} "${own.trim().replace(/\s+/g, ' ').replace(/\d+/g, '#').slice(0, 44)}"`;
  };
  const where = (el: Element): string => {
    const card = el.closest('section, dialog, [role="dialog"], form, fieldset, .card, article, nav, header');
    const head = card?.getAttribute('aria-label') ?? card?.querySelector('h1, h2, h3, legend')?.textContent ?? card?.tagName.toLowerCase() ?? '';
    return head.trim().replace(/\d+/g, '#').slice(0, 40);
  };
  const add = (kind: Defect['kind'], el: Element, by: number, more = '') => defects.push({ kind, what: `${words(el)}${more}`, by: Math.round(by * 10) / 10, where: where(el) });
  /** In a pane that scrolls sideways on purpose: its contents are allowed past the edge. */
  const scroller = (el: Element): Element | null => { for (let up: Element | null = el; up; up = up.parentElement) { const o = getComputedStyle(up).overflowX; if ((o === 'auto' || o === 'scroll') && up.scrollWidth > up.clientWidth + 1) return up; } return null; };

  // The page itself, and the pane the app scrolls in.
  if (document.documentElement.scrollWidth - vw > 1) defects.push({ kind: 'sideways', what: 'the page', by: document.documentElement.scrollWidth - vw, where: '' });
  const scrollers = new Set<string>();
  const accepted = new Set<string>();
  for (const el of root.querySelectorAll('*')) {
    const st = getComputedStyle(el);
    if ((st.overflowX === 'auto' || st.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 1 && seen(el)) {
      if (el.matches('main, .content, .shell-main, .page, body, #root > *') || el.clientWidth >= vw - 2 && el.clientHeight > vh / 2) {
        // What pushes it: the innermost thing that reaches furthest past the pane's right edge.
        const edge = el.getBoundingClientRect().left + el.clientWidth;
        let worst: Element | null = null, far = edge + 1;
        for (const x of el.querySelectorAll('*')) { const r = x.getBoundingClientRect(); if (r.width > 0 && r.right >= far) { worst = x; far = r.right; } }
        add('sideways', el, el.scrollWidth - el.clientWidth, worst ? `, pushed by ${words(worst)} in ${where(worst)}` : '');
      } else scrollers.add(`${words(el)} in ${where(el)}`);
    }
  }

  const LEAF = 'p, li, dt, dd, label, legend, summary, h1, h2, h3, h4, input, select, textarea, button, a, img, .chip, .hint, th, td';
  const BOXES = '.card, .modal, .callout, .list-item, .scene-card, .idea-card, td, th, .stat, .chip, .btn, li, dialog, [role="dialog"]';
  const leaves = [...root.querySelectorAll(LEAF)].filter(seen);
  for (const el of leaves) {
    const r = el.getBoundingClientRect();
    if (scroller(el)) continue;
    if (getComputedStyle(el).position === 'fixed' && !el.closest('dialog, [role="dialog"]')) continue;
    const over = Math.max(r.right - vw, -r.left);
    if (over > 1) add('outside', el, over);
    const boxEl = el.parentElement?.closest(BOXES);
    if (boxEl) { const b = boxEl.getBoundingClientRect(); const out = Math.max(r.right - b.right, b.left - r.left); if (out > 1.5 && b.width > 0) add('bleed', el, out, ` out of ${words(boxEl)}`); }
  }
  // Words cut off by their own box.
  for (const el of root.querySelectorAll('p, span, strong, label, button, a, h1, h2, h3, h4, li, dt, dd, td, th, summary, legend, .chip, .btn, option')) {
    if (!seen(el) || !el.textContent?.trim() || el.children.length > 3) continue;
    const st = getComputedStyle(el);
    const cutX = (st.overflowX === 'hidden' || st.overflowX === 'clip') && el.scrollWidth > el.clientWidth + 1;
    const cutY = (st.overflowY === 'hidden' || st.overflowY === 'clip') && el.scrollHeight > el.clientHeight + 2 && st.display !== 'inline';
    // One line of a longer thing, ending in an ellipsis, inside something that opens the whole of it when pressed.
    if (cutX && st.textOverflow === 'ellipsis' && el.closest('button, a[href]')) { accepted.add(`${where(el)}: ${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} keeps to one line and ends in an ellipsis; pressing it shows the whole`); continue; }
    if (cutX || cutY) add('clipped', el, cutX ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight, st.textOverflow === 'ellipsis' ? ' (ends in an ellipsis)' : '');
  }
  // A chooser too narrow to show the choice it holds.
  const pen = document.createElement('canvas').getContext('2d');
  if (pen) for (const el of root.querySelectorAll('select')) {
    if (!seen(el)) continue;
    const st = getComputedStyle(el);
    pen.font = `${st.fontStyle} ${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
    const need = pen.measureText(el.selectedOptions[0]?.textContent ?? '').width;
    const room = el.clientWidth - parseFloat(st.paddingLeft) - parseFloat(st.paddingRight);
    if (need <= room + 1) continue;
    // A choice longer than any phone is wide, where the screen says the whole of it beside the chooser.
    const shown = el.closest('[data-value-shown]');
    if (shown) accepted.add(`${where(el)}: a chooser's long choice is cut short in its box; "${shown.getAttribute('data-value-shown')}" beside it shows the whole`);
    else add('clipped', el, need - room, ' (the chosen value is cut short)');
  }
  // Things to tap.
  if (coarse) for (const el of root.querySelectorAll('button, a[href], input, select, textarea, summary, [role="tab"], [role="button"]')) {
    if (!seen(el) || el.matches('.visually-hidden, .sr-only')) continue;
    // A tick box or radio is tapped by its label; a link inside a sentence is as tall as its line.
    const t = (el as HTMLInputElement).type;
    const target = t === 'checkbox' || t === 'radio' ? el.closest('label') ?? el : el;
    if (el.tagName === 'A' && el.closest('p, li, dd, td') && !el.classList.contains('btn')) continue;
    // A link in a sentence: words beside it in its own line of text, looking out through any inline wrapper.
    const inSentence = (x: Element): boolean => {
      const up = x.parentElement;
      if (!up) return false;
      const flow = !/flex|grid/.test(getComputedStyle(up).display);
      if (flow && [...up.childNodes].some((n) => n !== x && (n.textContent ?? '').trim().length > 1 && (n.nodeType === 3 || (n.nodeType === 1 && getComputedStyle(n as Element).display === 'inline')))) return true;
      return getComputedStyle(up).display === 'inline' && inSentence(up);
    };
    if (el.classList.contains('link') && inSentence(el)) continue;
    if (el.closest('svg')) { accepted.add(`${where(el)}: the map's markers are under 44 pixels; the list of places beside the map opens the same places`); continue; }
    const r = target.getBoundingClientRect();
    const small = Math.min(r.width, r.height);
    if (small < 43.5) add('target', el, small);
  }
  for (const d of dialogs) {
    const box = d.querySelector('.modal') ?? d;
    const r = box.getBoundingClientRect();
    if (r.left < -1 || r.right > vw + 1 || r.top < -1 || r.bottom > vh + 1) add('dialog', box, Math.max(-r.left, r.right - vw, -r.top, r.bottom - vh), ' is not wholly on the screen');
    for (const b of box.querySelectorAll('.modal-foot button')) { const x = b.getBoundingClientRect(); if (x.width && (x.bottom > vh + 1 || x.top < -1 || x.right > vw + 1 || x.left < -1)) add('dialog', b, Math.max(x.bottom - vh, -x.top, x.right - vw, -x.left), ' is off the screen'); }
  }

  const text = (el: Element) => (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().replace(/\s+/g, ' ');
  const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))];
  // Everything the screen has, wherever it is scrolled to: parity is about what is offered, not what is in view.
  const rendered = (el: Element): boolean => {
    const r = el.getBoundingClientRect();
    const h = el as HTMLElement;
    return r.width >= 1 && r.height >= 1 && !(typeof h.checkVisibility === 'function' && !h.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) && !el.closest('.sr-only, [hidden], [aria-hidden="true"], [inert]');
  };
  const inPage = (sel: string) => [...root.querySelectorAll(sel)].filter(rendered);
  const signature = {
    headings: inPage('h1, h2, h3, legend').map(text),
    actions: uniq(inPage('button, a[href], [role="tab"], summary').map(text)),
    fields: uniq(inPage('input:not([type=hidden]), select, textarea').map((el) => el.getAttribute('aria-label') ?? (el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent : '') ?? el.closest('label')?.textContent ?? '').map((s) => s.trim().replace(/\s+/g, ' '))),
  };
  return { signature, defects, scrollers: [...scrollers], accepted: [...accepted] };
}

export async function audit(page: Page): Promise<Audit> {
  const [a, rows] = await Promise.all([page.evaluate(auditPage), page.evaluate(findMisalignments)]);
  return { ...a, defects: [...a.defects, ...rows.map((f) => ({ kind: f.kind, what: `${f.a} | ${f.b}`, by: f.by, where: f.where.split(' / ').at(-1) ?? '' }))] };
}

/**
 * Runs in the page. Focuses each field and button in turn, as Tab or a tap would, and reports any whose middle is then
 * under something else: a bar stuck to the top or bottom, or a dialog's own head or foot. Puts focus and scroll back.
 */
export function coveredWhenFocused(): Defect[] {
  const out: Defect[] = [];
  const dialogs = [...document.querySelectorAll('[role="dialog"]')];
  // The open drawer is the screen while it is open; the page behind it takes no focus.
  const root = dialogs.at(-1) ?? document.querySelector('main:not([inert])') ?? document.querySelector('.rail[data-open="true"]') ?? document.body;
  const was = document.activeElement as HTMLElement | null;
  const scroller = document.querySelector('main') ?? document.scrollingElement;
  const top = scroller?.scrollTop ?? 0;
  const words = (el: Element) => `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? (el as HTMLInputElement).labels?.[0]?.textContent ?? el.textContent ?? '').trim().replace(/\s+/g, ' ').replace(/\d+/g, '#').slice(0, 50)}"`;
  const all = [...root.querySelectorAll<HTMLElement>('input:not([type="hidden"]), select, textarea, button, a[href], summary')].filter((el) => !el.matches(':disabled, .visually-hidden, .sr-only, [tabindex="-1"]') && el.getClientRects().length > 0 && (typeof el.checkVisibility !== 'function' || el.checkVisibility({ checkVisibilityCSS: true })));
  // Every field, and enough of the buttons to cross the page: a long list's hundredth button says what its first did.
  const step = Math.max(1, Math.floor(all.length / 60));
  for (const el of all.filter((e, i) => e.matches('input, select, textarea') || i % step === 0)) {
    el.focus({ preventScroll: true });
    // Where focus would bring it, at once: the page scrolls smoothly, and its end is what counts.
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const x = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1), y = Math.min(Math.max(r.top + Math.min(r.height / 2, 20), 1), innerHeight - 1);
    const hit = document.elementFromPoint(x, y);
    if (!hit || hit === el || el.contains(hit) || hit.contains(el) || hit.closest('label')?.contains(el) || (el.id && hit.closest(`label[for="${el.id}"]`))) continue;
    if (r.top < 0 || r.bottom > innerHeight) { out.push({ kind: 'covered', what: `${words(el)} is not brought onto the screen when focused`, by: Math.round(Math.max(-r.top, r.bottom - innerHeight)), where: '' }); continue; }
    out.push({ kind: 'covered', what: `${words(el)} is under ${hit.tagName.toLowerCase()}.${String(hit.className).split(' ')[0]}`, by: Math.round(r.height), where: '' });
  }
  (was ?? document.body).focus?.({ preventScroll: true });
  if (scroller) scroller.scrollTop = top;
  return out;
}

/** Before the page loads: keeps the browser's own count of how far the page moved by itself (not after a press). */
export async function watchShifts(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __shift: number; __shifted: string[] };
    w.__shift = 0; w.__shifted = [];
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean; sources?: { node?: Node }[] }[]) {
          if (e.hadRecentInput) continue;
          w.__shift += e.value;
          for (const s of e.sources ?? []) { const n = s.node as Element | undefined; if (n?.tagName) w.__shifted.push(`${n.tagName.toLowerCase()}.${String(n.className).split(' ')[0]}`); }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch { /* WebKit has no layout-shift entries */ }
  });
}

/** What moved since the last call, as a defect when it is more than a tenth of the screen; and starts counting again. */
export async function shiftSince(page: Page): Promise<Defect[]> {
  const { value, nodes } = await page.evaluate(() => { const w = window as unknown as { __shift?: number; __shifted?: string[] }; const out = { value: w.__shift ?? 0, nodes: [...new Set(w.__shifted ?? [])].slice(0, 4) }; w.__shift = 0; w.__shifted = []; return out; });
  return value > 0.1 ? [{ kind: 'shift', what: `the page moved by itself (score ${value.toFixed(2)}): ${nodes.join(', ')}`, by: Math.round(value * 100), where: '' }] : [];
}
