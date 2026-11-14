/**
 * SLATE — shared presentation pieces.
 *
 * Kept small and unopinionated. Anything that encodes a rule belongs in the
 * engine, not here.
 */

import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { formatMoney, formatMoneyCompact, type Money } from '../../../../engine/bankworld/core/money';
import { clamp } from '../../../../engine/bankworld/core/rng';
import { LookRegion, Open } from '../looks/Look';
import type { Subject } from '../looks/subject';
import { HowItWorks } from '../guide/HowItWorks';

/**
 * Sources and estimates, folded behind a line: there to read, out of the way
 * of playing. Until 2026-09-28 each panel ended in them in full.
 */
/**
 * Why a row's controls can't be used now, said under them (acceptance pass, 2026-10-11): until then the engine's reason
 * was only a button's tooltip, which a phone never shows and a desktop player had to hover to find, so a row of grayed
 * buttons said nothing. One line where every reason is the same; each labeled where they differ.
 *
 * Two or more labeled reasons are a list, one to a line (from 2026-10-20, brief 16, section 8). Until then they ran on in
 * one paragraph, and a piece's six steps under Coursework read as six sentences in a row: "Read The Scene: You’re at
 * Classes until 3:00 PM. Learn Lines: Read the scene first: …". The words of each are unchanged.
 */
export function WhyNot({ reasons }: { reasons: readonly (readonly [label: string, why: string | undefined])[] }) {
  const shut = reasons.filter((r): r is readonly [string, string] => Boolean(r[1]));
  if (!shut.length) return null;
  const distinct = [...new Set(shut.map(([, why]) => why))];
  const all = shut.length === reasons.length;
  if (distinct.length === 1 && all) return <p className="xs dim why-not" style={{ margin: 0 }}>{`Not now: ${distinct[0]}`}</p>;
  if (shut.length === 1) return <p className="xs dim why-not" style={{ margin: 0 }}>{`${shut[0]![0]}: ${shut[0]![1]}`}</p>;
  return (
    <ul className="xs dim why-not" style={{ margin: 0, paddingLeft: '1.1rem' }}>
      {shut.map(([label, why], i) => <li key={`${i}:${label}`}>{`${label}: ${why}`}</li>)}
    </ul>
  );
}

export function Fine({ children }: { children: ReactNode }) {
  return (
    <details className="fine">
      <summary className="xs dim">Sources And Estimates</summary>
      <p className="xs dim" style={{ margin: 'var(--s2) 0 0' }}>{children}</p>
    </details>
  );
}

export function Panel({
  title, subtitle, actions, children, flush, tight, look, help, id,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  flush?: boolean;
  tight?: boolean;
  /**
   * What the panel is about. A heading is the world's word for what is under
   * it — "Weather", "The Land", "Standing" — so given a subject it becomes
   * the way into it, and the panel hosts its own region so the look opens
   * beneath the whole panel rather than inside one of its rows.
   */
  look?: Subject;
  /**
   * The guide's entry for what the panel holds (from 2026-10-12; `content/guide/`), by its id or a feature it covers:
   * How This Works in the panel's head opens it over the screen.
   */
  help?: string;
  /** Where a page's index (`PageIndex`) takes you: the panel scrolls to the top and takes the focus. */
  id?: string;
}) {
  const head = (title || actions || help) && (
    <div className="panel-head" style={flush ? { padding: 'var(--s4) var(--s4) 0' } : undefined}>
      <div>
        {title && <h2>{look ? <Open subject={look}>{title}</Open> : title}</h2>}
        {subtitle && <p className="muted small" style={{ margin: 0 }}>{subtitle}</p>}
      </div>
      {(actions || help) && <div className="row gap-2 panel-actions">{actions}{help && <HowItWorks help={help} />}</div>}
    </div>
  );
  return (
    <section id={id} tabIndex={id ? -1 : undefined} className={`card${flush ? ' card-flush' : ''}${tight ? ' card-tight' : ''}`}>
      {look
        ? <LookRegion className="panel-body">{head}{children}</LookRegion>
        : <>{head}{children}</>}
    </section>
  );
}

/**
 * A section's head inside a panel: its label, and How This Works for it at the right on the label's baseline, or under
 * the label where the two don't fit (from 2026-10-23, the owner's brief 24). Until then each such head was a
 * `row-between` of its own, its help's words 13 pixels in from the edge and 3 above the label's line.
 */
export function SectionHead({ title, help, label, heading }: { title: ReactNode; help?: string; label?: string; heading?: boolean }) {
  return (
    <div className="section-head">
      {heading ? <h4 className="eyebrow" style={{ margin: 0 }}>{title}</h4> : <div className="eyebrow">{title}</div>}
      {help && <HowItWorks help={help} label={label} />}
    </div>
  );
}

/**
 * A long page's sections, each a press away (from 2026-10-23, the owner's brief 23: "summary to detail"): pressed, the
 * section scrolls to the top of the page and takes the focus, so the keyboard carries on from there. Nothing is folded
 * away to make the page shorter. The routes are in the address's hash, so these are buttons, not links to an anchor.
 */
export function PageIndex({ sections }: { sections: readonly { id: string; label: string }[] }) {
  const go = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ block: 'start' });
    el.focus({ preventScroll: true });
  };
  return (
    <nav className="page-index" aria-label="On This Page">
      <span className="eyebrow">On This Page</span>
      <div className="page-index-list">
        {sections.map((s) => <button key={s.id} type="button" className="btn btn-sm btn-ghost" onClick={() => go(s.id)}>{s.label}</button>)}
      </div>
    </nav>
  );
}

export function Stat({
  label, value, note, tone, look,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: 'positive' | 'negative' | 'warning';
  /**
   * The thing this figure is about. Given one, the label becomes the way in —
   * the name is the control, so there is no button to add beside it.
   */
  look?: Subject;
}) {
  // The whole tile is one control, not three. A player's hand goes to the
  // figure as readily as to the word above it, and a number that does nothing
  // under a word that does something is the exact inconsistency depth exists
  // to remove. The label keeps the underline, so there is still one clear
  // affordance rather than three.
  const inner = (
    <>
      <span className="stat-label">{label}</span>
      <span className={`stat-value${tone ? ` ${tone}` : ''}`}>{value}</span>
      {note && <span className="stat-note">{note}</span>}
    </>
  );
  return (
    <div className="stat">
      {look ? <Open subject={look}>{inner}</Open> : inner}
    </div>
  );
}

/**
 * A meter always shows its number. Color alone is never the signal, because
 * color alone is not accessible.
 */
export function Meter({
  label, value, max = 100, tone, hint, invert, look, line,
}: {
  label: string;
  value: number;
  max?: number;
  tone?: 'positive' | 'negative' | 'warning';
  hint?: string;
  invert?: boolean;
  /** The dial this bar is drawing. Its label becomes the way in. */
  look?: Subject;
  /**
   * Where the engine starts to charge for it, on the value's own scale: red past
   * it, and amber the fifteen before. Without one, the bar's own quarters.
   * Until 2026-09-27 every bar turned at its own lines, energy red at 25 where
   * running on empty starts at 15 and stress at 70 where it costs at 75.
   */
  line?: number;
}) {
  const pct = clamp((value / max) * 100, 0, 100);
  const derived = tone ?? (line !== undefined
    ? (invert
      ? (value > line ? 'negative' : value > line - 15 ? 'warning' : 'positive')
      : (value < line ? 'negative' : value < line + 15 ? 'warning' : 'positive'))
    : invert
      ? (pct > 70 ? 'negative' : pct > 40 ? 'warning' : 'positive')
      : (pct < 25 ? 'negative' : pct < 50 ? 'warning' : 'positive'));
  return (
    <div>
      <div className="row-between xs" style={{ marginBottom: 3 }}>
        <span className="muted">{look ? <Open subject={look}>{label}</Open> : label}</span>
        <span className="mono">
          {look
            ? <Open subject={look}>{Math.round(value)}{max === 100 ? '' : ` / ${max}`}</Open>
            : <>{Math.round(value)}{max === 100 ? '' : ` / ${max}`}</>}
        </span>
      </div>
      <div
        className={`meter meter-${derived}`}
        role="meter"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <span style={{ width: `${pct}%` }} />
      </div>
      {hint && <div className="xs dim" style={{ marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

export function MoneyText({ amount, currency, compact, signed }: { amount: Money; currency: string; compact?: boolean; signed?: boolean }) {
  const text = compact ? formatMoneyCompact(amount, currency) : formatMoney(amount, currency);
  const cls = amount > 0 ? 'positive' : amount < 0 ? 'negative' : 'muted';
  return (
    <span className={`mono ${signed ? cls : ''}`}>
      {signed && amount > 0 ? '+' : ''}{text}
    </span>
  );
}

/**
 * Nothing to show, said. `compact` (from 2026-10-23, the owner's brief 24) is a line under the panel's head rather than
 * a block in the middle of the panel, for a state that leaves a panel short: What Needs You's All Clear, which until then
 * took a card the height of Up Next beside it, mostly empty.
 */
export function Empty({ title, body, action, compact }: { title: string; body: string; action?: ReactNode; compact?: boolean }) {
  return (
    <div className={compact ? 'empty empty-compact' : 'empty'}>
      <h3>{title}</h3>
      <p className="small" style={compact ? undefined : { maxWidth: 420, margin: '0 auto var(--s4)' }}>{body}</p>
      {action}
    </div>
  );
}

/** The dialogs open, oldest first: only the one on top answers Escape and keeps focus. */
const OPEN_DIALOGS: number[] = [];
let dialogCount = 0;
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Whether any dialog is open: the keyboard's shortcuts don't act behind one. */
export const dialogOpen = (): boolean => OPEN_DIALOGS.length > 0;

/**
 * A dialog over the screen, which stays mounted under it with whatever was typed there.
 *
 * From 2026-10-12 it takes focus when it opens (its `data-autofocus` element, else its first control), keeps Tab and
 * Shift-Tab inside it, and gives focus back to whatever opened it when it closes; Escape closes only the dialog on top,
 * where until then one Escape closed every dialog stacked open, a plan's form under the guide with it. `keepOnOutside`
 * keeps it open when the shade outside it is pressed, for a dialog with a form a stray press would lose.
 */
export function Modal({
  title, children, footer, onClose, wide, keepOnOutside,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  wide?: boolean;
  keepOnOutside?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const id = useMemo(() => ++dialogCount, []);
  const close = useRef(onClose);
  close.current = onClose;
  // Escape closes it, the way every dialog on every platform closes. Without
  // this a modal could only be left by finding its button, and anything
  // underneath it stayed unreachable until then.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    OPEN_DIALOGS.push(id);
    const node = box.current;
    const first = node?.querySelector<HTMLElement>('[data-autofocus]') ?? node?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (OPEN_DIALOGS[OPEN_DIALOGS.length - 1] !== id) return;
      if (event.key === 'Escape') { event.stopPropagation(); close.current(); return; }
      if (event.key !== 'Tab' || !node) return;
      const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.offsetParent !== null || x === document.activeElement);
      if (!items.length) { event.preventDefault(); node.focus(); return; }
      const [head, tail] = [items[0]!, items[items.length - 1]!];
      if (event.shiftKey && (document.activeElement === head || document.activeElement === node)) { event.preventDefault(); tail.focus(); }
      else if (!event.shiftKey && document.activeElement === tail) { event.preventDefault(); head.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      OPEN_DIALOGS.splice(OPEN_DIALOGS.indexOf(id), 1);
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [id]);
  return (
    <div className="overlay" onClick={keepOnOutside ? undefined : onClose}>
      <div
        ref={box}
        tabIndex={-1}
        className="modal"
        style={wide ? { width: 'min(880px, 100%)' } : undefined}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <div className="row-between">
            <h2>{title}</h2>
            <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Term({ children, explain }: { children: ReactNode; explain: string }) {
  return <span className="tooltip-term" title={explain}>{children}</span>;
}
