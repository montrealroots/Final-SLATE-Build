import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { getPlace } from '../data/places';
import { formatClock, localParts, monthName, weekdayName } from '../engine/time';

/** The start screen's mark, as 1221 draws it: the clapper, then SLATE spaced wide. */
export function Wordmark({ as = 'div' }: { as?: 'div' | 'h1' }) {
  const Tag = as;
  return (
    <>
      <span className="clapper" aria-hidden="true">🎬</span>
      <Tag className="wordmark" aria-label="SLATE"><span aria-hidden="true">SLATE</span></Tag>
    </>
  );
}

/** A screen's head, as 1221's: where it sits, its name, and a line on what it's for. */
export function PageHead({ eyebrow, title, lede, actions, children }: { eyebrow?: ReactNode; title: ReactNode; lede?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="page-head">
      <div className="row-between wrap" style={{ alignItems: 'flex-start' }}>
        <div className="grow">
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h1>{title}</h1>
          {lede && <p className="muted" style={{ fontSize: 'var(--size-md)' }}>{lede}</p>}
        </div>
        {actions && <div className="row gap-2 wrap">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function Field(props: { label: string; error?: string | null; hint?: string; children: (id: string, describedBy: string | undefined) => ReactNode }) {
  const id = useId();
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  const describedBy = [props.error ? errId : '', props.hint ? hintId : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{props.label}</label>
      {props.hint && <span className="hint" id={hintId}>{props.hint}</span>}
      {props.children(id, describedBy)}
      {props.error && <span className="error" id={errId} role="alert">{props.error}</span>}
    </div>
  );
}

export function TextField(props: { label: string; value: string; onChange: (v: string) => void; error?: string | null; hint?: string; type?: string; multiline?: boolean; maxLength?: number; autoComplete?: string; inputMode?: 'numeric' | 'text' | 'decimal'; min?: string; max?: string }) {
  return (
    <Field label={props.label} error={props.error} hint={props.hint}>
      {(id, db) =>
        props.multiline ? (
          <textarea id={id} value={props.value} aria-invalid={!!props.error} aria-describedby={db} maxLength={props.maxLength} onChange={(e) => props.onChange(e.target.value)} />
        ) : (
          <input id={id} type={props.type ?? 'text'} value={props.value} aria-invalid={!!props.error} aria-describedby={db} maxLength={props.maxLength} min={props.min} max={props.max} autoComplete={props.autoComplete ?? 'off'} inputMode={props.inputMode} onChange={(e) => props.onChange(e.target.value)} />
        )
      }
    </Field>
  );
}

export function SelectField<T extends string>(props: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; error?: string | null; hint?: string; disabled?: boolean }) {
  return (
    <Field label={props.label} error={props.error} hint={props.hint}>
      {(id, db) => (
        <select id={id} value={props.value} disabled={props.disabled} aria-invalid={!!props.error} aria-describedby={db} onChange={(e) => props.onChange(e.target.value as T)}>
          {props.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function NumberField(props: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; error?: string | null; hint?: string }) {
  return (
    <Field label={props.label} error={props.error} hint={props.hint}>
      {(id, db) => (
        <input id={id} type="number" inputMode="decimal" value={Number.isFinite(props.value) ? props.value : ''} min={props.min} max={props.max} step={props.step ?? 1} aria-invalid={!!props.error} aria-describedby={db}
          onChange={(e) => props.onChange(e.target.value === '' ? Number.NaN : Number(e.target.value))} />
      )}
    </Field>
  );
}

export function Check(props: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const id = useId();
  return (
    <div className="field">
      <label className="check" htmlFor={id}>
        <input id={id} type="checkbox" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} />
        <span>{props.label}</span>
      </label>
      {props.hint && <span className="hint">{props.hint}</span>}
    </div>
  );
}

/** `sheet`: on a phone it fills the screen's width and height, with its actions above the home indicator (the idea picker). */
export function Modal(props: { title: string; onClose: () => void; children: ReactNode; footer: ReactNode; labelledBy?: string; sheet?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>('input, select, textarea, button:not(.modal-close)');
    (first ?? el)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        props.onClose();
      }
      if (e.key === 'Tab' && el) {
        const items = [...el.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input, select, textarea, [tabindex="0"]')];
        if (!items.length) return;
        const firstEl = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className={props.sheet ? 'overlay overlay-sheet' : 'overlay'} onMouseDown={(e) => e.target === e.currentTarget && props.onClose()}>
      <div className={props.sheet ? 'modal modal-sheet' : 'modal'} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
        <div className="modal-head">
          <div className="row-between">
            <h2 id={titleId}>{props.title}</h2>
            <button className="btn btn-ghost btn-sm modal-close" onClick={props.onClose} aria-label="Close This Dialog">✕</button>
          </div>
        </div>
        <div className="modal-body">{props.children}</div>
        <div className="modal-foot">{props.footer}</div>
      </div>
    </div>
  );
}

/**
 * 1221's tab bar (`ui/components/TabBar.tsx`): one row under the screen's head, scrolling sideways with a fade at the
 * edge that has more, and the arrow keys moving through the tabs.
 */
export function SectionNav<T extends string>(props: { label: string; items: { id: T; label: string }[]; current: T; onChange: (id: T) => void }) {
  const prefix = useId();
  const list = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState<'none' | 'start' | 'end' | 'both'>('none');
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const read = () => {
      const start = el.scrollLeft > 2;
      const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
      setOverflow(start && end ? 'both' : start ? 'start' : end ? 'end' : 'none');
    };
    read();
    el.addEventListener('scroll', read, { passive: true });
    const sized = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(read);
    sized?.observe(el);
    return () => { el.removeEventListener('scroll', read); sized?.disconnect(); };
  }, [props.items.length]);
  useEffect(() => {
    list.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [props.current]);
  const go = (i: number) => {
    const next = props.items[(i + props.items.length) % props.items.length];
    props.onChange(next.id);
    document.getElementById(`${prefix}-tab-${next.id}`)?.focus();
  };
  const scroll = (way: 1 | -1) => list.current?.scrollBy?.({ left: way * list.current.clientWidth * 0.7, behavior: 'smooth' });
  return (
    <div className="tabs-wrap" data-overflow={overflow}>
      <button type="button" className="tabs-more" data-side="start" tabIndex={-1} aria-hidden="true" onClick={() => scroll(-1)}>‹</button>
      <div className="tabs" role="tablist" aria-label={props.label} ref={list}>
        {props.items.map((it, i) => (
          <button key={it.id} id={`${prefix}-tab-${it.id}`} type="button" role="tab" className="tab" aria-selected={it.id === props.current} tabIndex={it.id === props.current ? 0 : -1}
            onClick={() => props.onChange(it.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); }
              else if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
              else if (e.key === 'Home') { e.preventDefault(); go(0); }
              else if (e.key === 'End') { e.preventDefault(); go(props.items.length - 1); }
            }}>{it.label}</button>
        ))}
      </div>
      <button type="button" className="tabs-more" data-side="end" tabIndex={-1} aria-hidden="true" onClick={() => scroll(1)}>›</button>
    </div>
  );
}

/** A card with its head, as 1221's `Panel`: the title and a line under it on the left, its actions on the right. */
export function Panel({ title, subtitle, actions, children, flush, id }: { title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; flush?: boolean; id?: string }) {
  return (
    <section id={id} className={`card${flush ? ' card-flush' : ''}`}>
      {(title || actions) && (
        <div className="panel-head" style={flush ? { padding: 'var(--s4) var(--s4) 0' } : undefined}>
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p className="muted small" style={{ margin: 0 }}>{subtitle}</p>}
          </div>
          {actions && <div className="row gap-2 panel-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function ErrorText({ error }: { error: string | null | undefined }) {
  return error ? <p className="error" role="alert" style={{ color: 'var(--negative)' }}>{error}</p> : null;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card empty">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

// ---------- formatting in a place's zone ----------

export function placeTime(instant: number, placeId: string): string {
  const p = localParts(instant, getPlace(placeId).zone);
  return formatClock(p.hour, p.minute);
}

export function longLocal(instant: number, zone: string): { time: string; weekday: string; date: string } {
  const p = localParts(instant, zone);
  return { time: formatClock(p.hour, p.minute), weekday: weekdayName(p.weekday), date: `${monthName(p.month)} ${p.day}, ${p.year}` };
}

/**
 * When another project has the same title, the date this one was started tells them apart (SLATE-03-04, November 8,
 * 2026). Until then two projects called the same showed identically in every list.
 */
export function startedNote(projects: { id: string; title: string; createdAt: number }[], p: { id: string; title: string; createdAt: number }, zone: string): string {
  const key = p.title.trim().toLowerCase();
  const twins = projects.filter((q) => q.title.trim().toLowerCase() === key);
  if (twins.length < 2) return '';
  const date = longLocal(p.createdAt, zone).date;
  // Started the same day as another of that title: which one it is, in the order they were started.
  const sameDay = twins.filter((q) => longLocal(q.createdAt, zone).date === date);
  const n = sameDay.indexOf(sameDay.find((q) => q.id === p.id)!) + 1;
  return `started ${date}${sameDay.length > 1 ? `, ${ORDINALS[n - 1] ?? `number ${n}`} of that title` : ''}`;
}
const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth'];

export function plural(n: number, word: string, pluralWord?: string): string {
  return `${n} ${n === 1 ? word : pluralWord ?? `${word}s`}`;
}

export function realTimestamp(ms: number): string {
  return new Date(ms).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

/** The four professions every character has, in the 1221 order; the acting title is the player's choice. */
export function Professions({ actingTitle }: { actingTitle: string }) {
  const all = ['Screenwriter', 'Producer', 'Director', actingTitle || 'Actor'];
  return (
    <p className="chip-row" aria-label={all.join(', ')}>
      {all.map((t, i) => <span key={t} aria-hidden="true">{i > 0 && <span className="dot"> · </span>}<span className="chip chip-accent">{t}</span></span>)}
    </p>
  );
}
