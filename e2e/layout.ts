import type { Page } from '@playwright/test';

/**
 * A measure of the page as it is laid out, added November 11, 2026 after the Script page was found with buttons sitting
 * on the next row's labels and boxes in one row starting at different heights. It reads boxes, not styles:
 *
 * - `controls`, `labels`, `actions`: in one row of a form grid, the boxes, their labels or the buttons under them start
 *   at different heights;
 * - `level`: a box and the button beside it in one form row are not the same height, or not level;
 * - `touching`: a button or a box has less than 4 pixels between it and what is above or below it;
 * - `overlap`: a button or a box lies over something else.
 *
 * It says nothing about taste. A finding names the card it is in and the two things concerned.
 */
export interface Finding { kind: 'controls' | 'labels' | 'actions' | 'level' | 'touching' | 'overlap'; where: string; a: string; b: string; by: number }

/** Runs in the page, so it uses nothing from outside itself. */
export function findMisalignments(): Finding[] {
  const out: Finding[] = [];
  const BOX = 'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=hidden]):not([type=file]), select, textarea';
  const seen = (el: Element): boolean => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const h = el as HTMLElement;
    if (typeof h.checkVisibility === 'function' && !h.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    if (el.closest('.sr-only, [hidden], [aria-hidden="true"]')) return false;
    // Scrolled out of a list that scrolls: not on the page, whatever its box says.
    for (let up = el.parentElement; up; up = up.parentElement) {
      if (getComputedStyle(up).overflowY === 'visible') continue;
      const c = up.getBoundingClientRect();
      if (r.bottom <= c.top + 1 || r.top >= c.bottom - 1) return false;
    }
    return true;
  };
  /** Rows of one list, the options under a search box, or the days of a calendar sit against each other by design. */
  const LIST = '.picklist, .picker-results, [role="listbox"], [role="menu"], .list, .cal-grid';
  const listed = (a: Element, b: Element): boolean => { const l = a.closest(LIST) ?? b.closest(LIST); return !!l && (l.contains(a) || l.previousElementSibling === a) && (l.contains(b) || l.previousElementSibling === b); };
  const words = (el: Element): string => {
    const own = el.getAttribute('aria-label') ?? (el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent : null) ?? el.textContent ?? '';
    const cls = typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : '';
    return `${el.tagName.toLowerCase()}${cls} "${own.trim().replace(/\s+/g, ' ').slice(0, 48)}"`;
  };
  const where = (el: Element): string => {
    const card = el.closest('section, dialog, [role="dialog"], form, fieldset, .card');
    const head = card?.getAttribute('aria-label') ?? card?.querySelector('h1, h2, h3, legend')?.textContent ?? '';
    const page = document.querySelector('h1')?.textContent ?? '';
    return `${page.trim().slice(0, 40)} / ${head.trim().slice(0, 48)}`;
  };
  /** The part of an element that shows: its box, cut to every list or pane that scrolls around it. */
  const box = (el: Element): { top: number; bottom: number; left: number; right: number; height: number } => {
    const r = el.getBoundingClientRect();
    let top = r.top, bottom = r.bottom, left = r.left, right = r.right;
    for (let up = el.parentElement; up; up = up.parentElement) {
      const st = getComputedStyle(up);
      if (st.overflowY === 'visible' && st.overflowX === 'visible') continue;
      const c = up.getBoundingClientRect();
      if (st.overflowY !== 'visible') { top = Math.max(top, c.top); bottom = Math.min(bottom, c.bottom); }
      if (st.overflowX !== 'visible') { left = Math.max(left, c.left); right = Math.min(right, c.right); }
    }
    return { top, bottom, left, right, height: bottom - top };
  };
  /** What an element is laid out in: a dialog, or something pinned or placed over the page, or the page. Two things in different ones lie over each other by design. */
  const layer = (el: Element): Element => {
    for (let up: Element | null = el; up; up = up.parentElement) {
      if (up.matches('dialog, [role="dialog"], [role="alertdialog"], .modal, .overlay')) return up;
      const pos = getComputedStyle(up).position;
      if (pos === 'fixed' || pos === 'sticky' || pos === 'absolute') return up;
    }
    return document.documentElement;
  };
  const add = (kind: Finding['kind'], a: Element, b: Element, by: number) => out.push({ kind, where: where(a), a: words(a), b: words(b), by: Math.round(by * 10) / 10 });
  const spread = (kind: Finding['kind'], els: Element[]) => {
    if (els.length < 2) return;
    const tops = els.map((e) => e.getBoundingClientRect().top);
    const lo = tops.indexOf(Math.min(...tops)), hi = tops.indexOf(Math.max(...tops));
    if (tops[hi] - tops[lo] > 1) add(kind, els[lo], els[hi], tops[hi] - tops[lo]);
  };

  // Rows of a form: what each cell starts with should start level with its neighbours.
  for (const grid of document.querySelectorAll('.grid.form, .field-row')) {
    const rows = new Map<number, Element[]>();
    for (const cell of grid.children) if (seen(cell)) { const t = Math.round(cell.getBoundingClientRect().top); rows.set(t, [...(rows.get(t) ?? []), cell]); }
    for (const cells of rows.values()) {
      const first = (q: string) => cells.map((c) => (c.matches(q) ? c : c.querySelector(q))).filter((e): e is Element => !!e && seen(e));
      spread('controls', first(BOX));
      spread('labels', first('label:not(.check)'));
      spread('actions', first('.ideas-row'));
    }
  }

  // A box and the button beside it: the same height, on the same line. A small button is centred on the box.
  const ROW = '.inline-form, .field-act, .field-row, .row, .row-between, .row-wrap, .grid';
  for (const row of document.querySelectorAll(ROW)) {
    const parts = [...row.querySelectorAll(`${BOX}, .btn`)].filter((e) => e.closest(ROW) === row || e.parentElement?.closest(ROW) === row).filter(seen);
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
      if (parts[i].matches('.btn') && parts[j].matches('.btn')) continue;
      const a = parts[i].getBoundingClientRect(), b = parts[j].getBoundingClientRect();
      const together = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > Math.min(a.height, b.height) / 2;
      if (!together || parts[i].tagName === 'TEXTAREA' || parts[j].tagName === 'TEXTAREA') continue;
      // Not one scrolled partly under a pinned bar, or two in different panes.
      if (layer(parts[i]) !== layer(parts[j]) || box(parts[i]).height < a.height - 1 || box(parts[j]).height < b.height - 1) continue;
      const small = parts[i].matches('.btn-sm') || parts[j].matches('.btn-sm');
      const off = small ? Math.abs((a.top + a.bottom) / 2 - (b.top + b.bottom) / 2) : Math.max(Math.abs(a.top - b.top), Math.abs(a.bottom - b.bottom));
      if (off > 1) add('level', parts[i], parts[j], off);
    }
  }

  // A button or a box and what is above or below it.
  const controls = [...document.querySelectorAll(`button, a.btn, ${BOX}`)].filter(seen);
  const rest = [...document.querySelectorAll('label, .hint, p, legend, h2, h3, h4, summary, table')].filter(seen);
  const all = [...new Set([...controls, ...rest])].map((el) => ({ el, r: box(el), in: layer(el) })).filter((x) => x.r.height >= 4);
  const done = new Set<string>();
  for (const a of all) {
    if (!controls.includes(a.el) || a.el.closest('nav, [role="tablist"], [role="toolbar"], [role="radiogroup"], .rail, .topbar, table')) continue;
    for (const b of all) {
      if (a.el === b.el || a.in !== b.in || a.el.contains(b.el) || b.el.contains(a.el) || listed(a.el, b.el)) continue;
      if (b.el.closest('nav, [role="tablist"], [role="toolbar"], .rail, .topbar')) continue;
      if (Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left) < 8) continue;
      const gap = b.r.top >= a.r.top ? b.r.top - a.r.bottom : a.r.top - b.r.bottom;
      if (gap >= 3.5) continue;
      const key = [a.el, b.el].map(words).sort().join('|');
      if (done.has(key)) continue;
      done.add(key);
      add(gap <= -2 ? 'overlap' : 'touching', a.el, b.el, gap);
    }
  }
  return out;
}

export const layoutFindings = (page: Page): Promise<Finding[]> => page.evaluate(findMisalignments);
