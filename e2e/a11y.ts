import type { Page } from '@playwright/test';

/** Visible controls without an accessible name, duplicate ids, not exactly one visible h1, unlabelled images. */
export async function audit(page: Page, where: string): Promise<string[]> {
  return page.evaluate((w) => {
    const out: string[] = [];
    const nameOf = (el: Element) => {
      const aria = el.getAttribute('aria-label') || (el.getAttribute('aria-labelledby') || '').split(' ').map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
      const label = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent : '';
      return (aria || label || (el as HTMLElement).innerText || el.getAttribute('title') || '').trim();
    };
    for (const el of document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=button]')) {
      if (!(el as HTMLElement).offsetParent && getComputedStyle(el).position !== 'fixed') continue;
      // A closed drawer is visibility: hidden, so neither seen nor read out.
      if (getComputedStyle(el).visibility === 'hidden') continue;
      if (!nameOf(el)) out.push(`${w}: a ${el.tagName.toLowerCase()} has no accessible name`);
    }
    const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dup.length) out.push(`${w}: duplicate ids ${[...new Set(dup)].join(', ')}`);
    const h1 = [...document.querySelectorAll('h1')].filter((h) => (h as HTMLElement).offsetParent);
    if (h1.length !== 1) out.push(`${w}: ${h1.length} visible h1 headings`);
    for (const svg of document.querySelectorAll('svg[role=img]')) if (!svg.getAttribute('aria-label')) out.push(`${w}: an image has no label`);
    return out;
  }, where);
}
