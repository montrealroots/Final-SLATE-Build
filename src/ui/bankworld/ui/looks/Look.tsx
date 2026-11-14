/**
 * SLATE — looking at a thing, in the place where it is named.
 *
 * `<Open>` is the noun. It renders the world’s own word for a thing as a
 * pressable word — `button.link`, which the stylesheet has defined since it
 * was written, and commented "a name that is also a way in", and never once
 * used. Pressing it opens the thing.
 *
 * The trigger is inline and the body is a block, so the two cannot be the same
 * element: a paragraph cannot hold a card inside a sentence. `<LookRegion>` is
 * the block that hosts them. Every `<Open>` opens into the nearest region
 * above it, so a noun in the middle of a sentence expands beneath the
 * paragraph that sentence is in rather than tearing it in half.
 *
 * A look body opens its own region, so a noun inside a look expands inside
 * that look. That is the whole of how depth works here — no stack, no router,
 * no modal over a modal. Closing a level unmounts everything under it, which
 * is what makes getting out of four levels one press rather than four.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useWorld } from '../../app/game-context';
import { resolveLook, lookExists, type Facet, type Looked, type Way } from './registry';
import { sameSubject, subjectKey, type Subject } from './subject';

interface RegionValue {
  open: Subject | null;
  setOpen: (subject: Subject | null) => void;
  /** Names of every look this region sits inside, outermost first. */
  ancestry: readonly string[];
  depth: number;
}

const RegionContext = createContext<RegionValue | null>(null);

/**
 * A block that things can open into.
 *
 * Put one around any group of prose or stats whose nouns should be openable.
 * A screen needs no other machinery: no state, no handler, no modal.
 */
export function LookRegion({
  children, ancestry = [], className,
}: {
  children: ReactNode;
  ancestry?: readonly string[];
  className?: string;
}) {
  const [open, setOpen] = useState<Subject | null>(null);
  const outer = useContext(RegionContext);
  const value = useMemo<RegionValue>(() => ({
    open,
    setOpen,
    ancestry: ancestry.length ? ancestry : (outer?.ancestry ?? []),
    depth: (outer?.depth ?? -1) + 1,
  }), [open, ancestry, outer]);

  return (
    <RegionContext.Provider value={value}>
      <div className={className}>
        {children}
        {open && <LookPanel subject={open} onClose={() => setOpen(null)} />}
      </div>
    </RegionContext.Provider>
  );
}

/**
 * The world’s word for a thing, as the way into it.
 *
 * Renders plain text — not a dead control — when the thing is not there to be
 * looked at, or when nothing has declared what its kind opens into. A name is
 * never painted as a way in unless it is one.
 */
export function Open({
  subject, children, plain,
}: {
  subject: Subject;
  children: ReactNode;
  /** Render as text even if it would open. For places a control would be wrong. */
  plain?: boolean;
}) {
  const region = useContext(RegionContext);
  const exists = useWorld((sim) => lookExists(sim, subject), [subject.kind, subject.id]);
  // SLATE: 1221 kept this plain text until the guide's chapter for it was read; tutorial gating is excluded.
  const guideOpen = true;

  if (plain || !region || !exists || !guideOpen) return <>{children}</>;

  const isOpen = sameSubject(region.open, subject);
  return (
    <button
      type="button"
      className={`link${isOpen ? ' is-open' : ''}`}
      aria-expanded={isOpen}
      onClick={() => region.setOpen(isOpen ? null : subject)}
    >
      {children}
    </button>
  );
}

/** What a resolved look renders as. */
function LookPanel({ subject, onClose }: { subject: Subject; onClose: () => void }) {
  const region = useContext(RegionContext);
  const found = useWorld((s) => resolveLook(s, subject), [subject.kind, subject.id]);

  if (!found) return null;

  if ('gone' in found) {
    return (
      <div className="look look-gone">
        <p className="small muted" style={{ margin: 0 }}>{found.gone}</p>
        <button type="button" className="link look-close" onClick={onClose}>Close</button>
      </div>
    );
  }

  const ancestry = [...(region?.ancestry ?? []), found.name];
  return (
    <div className="look" data-depth={region?.depth ?? 0}>
      <LookHeader look={found} ancestry={ancestry} onClose={onClose} />
      <LookRegion ancestry={ancestry} className="look-inner">
        <p className="look-summary">{found.summary}</p>
        {found.body}
        {found.facets && found.facets.length > 0 && <Facets facets={found.facets} />}
        {found.ways && found.ways.length > 0 && <Ways ways={found.ways} as={found.waysAs} />}
        {found.provenance && <p className="look-provenance">{found.provenance}</p>}
      </LookRegion>
    </div>
  );
}

function LookHeader({
  look, ancestry, onClose,
}: {
  look: Looked;
  ancestry: readonly string[];
  onClose: () => void;
}) {
  return (
    <div className="look-head">
      <div style={{ minWidth: 0 }}>
        {ancestry.length > 1 && (
          <div className="look-trail">{ancestry.slice(0, -1).join(' · ')}</div>
        )}
        <div className="eyebrow">{look.kind}</div>
        <h3 className="look-name">{look.name}</h3>
      </div>
      <button type="button" className="link look-close" onClick={onClose} aria-label={`Close ${look.name}`}>
        Close
      </button>
    </div>
  );
}

/** Another face of the same thing. Costs no depth and has no address. */
function Facets({ facets }: { facets: readonly Facet[] }) {
  const [current, setCurrent] = useState(facets[0]?.id ?? '');
  const shown = facets.find((f) => f.id === current) ?? facets[0];
  if (!shown) return null;
  return (
    <div className="look-facets">
      <div className="tabs" role="tablist">
        {facets.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            className="tab"
            aria-selected={f.id === shown.id}
            onClick={() => setCurrent(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="look-facet-body">
        {shown.body}
        {shown.ways && shown.ways.length > 0 && <Ways ways={shown.ways} />}
      </div>
    </div>
  );
}

/**
 * The ways further in.
 *
 * Each says what is behind it before you take it, so the shape of the graph
 * can be read without walking it. A way onto nothing is not painted — the
 * thing it points at may have left the world since the view was written.
 */
function Ways({ ways, as = 'list' }: { ways: readonly Way[]; as?: 'list' | 'strip' }) {
  const live = useWorld((s) => ways.filter((w) => lookExists(s, w.to)), [ways]);
  if (live.length === 0) return null;

  // A strip: the same edges, drawn across instead of down. The whole cell is
  // the control, so its accessible name reads "Wednesday, Overcast, 3° / -1°"
  // — the detail line, said rather than printed twice.
  if (as === 'strip') {
    return (
      <div className="look-strip">
        {live.map((way) => (
          <div key={subjectKey(way.to)} className={`look-cell${way.glance?.marked ? ' is-here' : ''}`}>
            <Open subject={way.to}>
              <span className="look-cell-name">{way.label}</span>
              {way.glance?.marked && <span className="sr-only">, where you are</span>}
              {way.glance?.icon && <span aria-hidden="true" className="look-cell-icon">{way.glance.icon}</span>}
              {(way.glance?.lines ?? []).map((line) => (
                <span key={line} className="look-cell-line">{line}</span>
              ))}
            </Open>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="look-ways">
      {live.map((way) => (
        <div key={subjectKey(way.to)} className="look-way">
          <Open subject={way.to}>{way.label}</Open>
          <span className="look-way-detail">{way.detail}</span>
        </div>
      ))}
    </div>
  );
}
