import { useEffect, useId, useRef, type ReactNode } from 'react';
import { getPlace } from '../data/places';
import { formatClock, localParts, monthName, weekdayName } from '../engine';

export function Wordmark({ as = 'div' }: { as?: 'div' | 'h1' }) {
  const Tag = as;
  return (
    <Tag className="wordmark" aria-label="SLATE">
      <span className="clap" aria-hidden="true" />
      <span aria-hidden="true">SLATE</span>
    </Tag>
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

export function TextField(props: { label: string; value: string; onChange: (v: string) => void; error?: string | null; hint?: string; type?: string; multiline?: boolean; maxLength?: number; autoComplete?: string; inputMode?: 'numeric' | 'text' | 'decimal' }) {
  return (
    <Field label={props.label} error={props.error} hint={props.hint}>
      {(id, db) =>
        props.multiline ? (
          <textarea id={id} value={props.value} aria-invalid={!!props.error} aria-describedby={db} maxLength={props.maxLength} onChange={(e) => props.onChange(e.target.value)} />
        ) : (
          <input id={id} type={props.type ?? 'text'} value={props.value} aria-invalid={!!props.error} aria-describedby={db} maxLength={props.maxLength} autoComplete={props.autoComplete ?? 'off'} inputMode={props.inputMode} onChange={(e) => props.onChange(e.target.value)} />
        )
      }
    </Field>
  );
}

export function SelectField<T extends string>(props: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; error?: string | null; hint?: string }) {
  return (
    <Field label={props.label} error={props.error} hint={props.hint}>
      {(id, db) => (
        <select id={id} value={props.value} aria-invalid={!!props.error} aria-describedby={db} onChange={(e) => props.onChange(e.target.value as T)}>
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

export function Modal(props: { title: string; onClose: () => void; children: ReactNode; footer: ReactNode; labelledBy?: string }) {
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
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && props.onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
        <header><h2 id={titleId}>{props.title}</h2></header>
        <div className="modal-body">{props.children}</div>
        <footer>{props.footer}</footer>
      </div>
    </div>
  );
}

export function SectionNav<T extends string>(props: { label: string; items: { id: T; label: string }[]; current: T; onChange: (id: T) => void }) {
  const selId = useId();
  return (
    <>
      <div className="tabs" role="tablist" aria-label={props.label}>
        {props.items.map((it) => (
          <button key={it.id} role="tab" aria-selected={it.id === props.current} onClick={() => props.onChange(it.id)}>{it.label}</button>
        ))}
      </div>
      <div className="section-select field">
        <label htmlFor={selId}>{props.label}</label>
        <select id={selId} value={props.current} onChange={(e) => props.onChange(e.target.value as T)}>
          {props.items.map((it) => <option key={it.id} value={it.id}>{it.label}</option>)}
        </select>
      </div>
    </>
  );
}

export function ErrorText({ error }: { error: string | null | undefined }) {
  return error ? <p className="error" role="alert" style={{ color: 'var(--negative)' }}>{error}</p> : null;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="panel">
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

export function plural(n: number, word: string, pluralWord?: string): string {
  return `${n} ${n === 1 ? word : pluralWord ?? `${word}s`}`;
}

export function realTimestamp(ms: number): string {
  return new Date(ms).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}
