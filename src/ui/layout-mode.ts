// Phones show the desktop's layout, shrunk to fit the screen (the owner, November 13, 2026: "make the phone screen the
// same as the desktop so if you have to shrink it for it to fit screen do so"). Until then a phone got its own layout:
// the rail as a drawer, the bar in two rows, every grid in one column, so a Budget page ran 53,000 pixels tall.
//
// How: on a screen where the rail would fold into a drawer (under 901 CSS pixels wide, or under 501 tall), the page is
// laid out DESKTOP_WIDTH wide, as a desktop is, and the browser scales it down to the screen. Pinch zoom still works.
// The touch screen's larger controls (app.css, pointer: coarse) and the browser's text enlargement are off in this
// layout, so what is drawn is the desktop's, only smaller. Settings can bring the phone layout back, per device. A desktop
// browser ignores the viewport tag, so a narrow window there keeps the layout it always had.
const KEY = 'slate.v1.layout';
const DEVICE = 'width=device-width, initial-scale=1, viewport-fit=cover';
/**
 * The layout width on a phone: the desktop's own, 1280, the width the desktop journeys and captures run at. 960 for the
 * first hours of November 13, 2026, the least that kept the rail: larger text, but not the desktop's screen (the owner:
 * "I want it to be a carbon copy of the desktop screen").
 */
export const DESKTOP_WIDTH = 1280;
/** The least height the desktop's rail needs beside the page is 501 pixels; this leaves room. */
const DESKTOP_HEIGHT = 520;

export type LayoutMode = 'desktop' | 'phone';

export function layoutMode(): LayoutMode {
  try { return localStorage.getItem(KEY) === 'phone' ? 'phone' : 'desktop'; } catch { return 'desktop'; }
}

/** The screen's width and height in CSS pixels as it is held now (iOS reports its portrait size whichever way it is held). */
function screenNow(): [number, number] {
  const a = window.screen.width, b = window.screen.height;
  return matchMedia('(orientation: landscape)').matches ? [Math.max(a, b), Math.min(a, b)] : [Math.min(a, b), Math.max(a, b)];
}

/** Whether this screen is one the desktop's layout has to be shrunk for. */
export function smallScreen(): boolean {
  const [w, h] = screenNow();
  return w < 901 || h < 501;
}

/** The viewport for this screen and mode: the device's own, or the desktop's width, shrunk to fit. */
export function viewportFor(mode: LayoutMode, w: number, h: number): string {
  if (mode === 'phone' || (w >= 901 && h >= 501)) return DEVICE;
  return `width=${Math.max(DESKTOP_WIDTH, Math.ceil((DESKTOP_HEIGHT * w) / h))}, viewport-fit=cover`;
}

export function applyLayout(mode: LayoutMode = layoutMode()): void {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta) return;
  const [w, h] = screenNow();
  meta.content = viewportFor(mode, w, h);
  document.documentElement.dataset.layout = meta.content === DEVICE ? '' : 'scaled';
}

export function setLayoutMode(mode: LayoutMode): void {
  try { if (mode === 'phone') localStorage.setItem(KEY, 'phone'); else localStorage.removeItem(KEY); } catch { /* a device that keeps nothing shows the desktop's */ }
  applyLayout(mode);
}

/** Set the viewport now and whenever the phone is turned. */
export function watchLayout(): void {
  applyLayout();
  matchMedia('(orientation: landscape)').addEventListener('change', () => applyLayout());
}
