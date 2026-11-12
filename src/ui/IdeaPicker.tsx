// The picker every "Choose Ideas" button opens (November 11, 2026; the Creative Depth package, milestone B,
// 01-MASTER-BUILD-SPEC.md section 6). One dialog, the same on a phone and a desktop: a list to browse and search, the
// idea opened with what it would set and what it would make, and Apply. Nothing changes until Apply; closing it leaves
// whatever was typed in the field exactly as it was.
//
// It loads with the idea library (src/ideas/), the first time a picker is opened, and never at startup.
import { useMemo, useState } from 'react';
import { applyIdea, previewIdea, saveIdea, type Idea, type IdeaField, type Target } from '../engine/brief';
import type { Project } from '../engine/types';
import { ideasFor, whyItFits, wrongMedium } from '../ideas';
import { COST, MUST, WHEN, WHO, compose, type LoglineParts } from '../ideas/loglines';
import { Check, Modal, SectionNav, SelectField, TextField, plural } from './components';
import { store } from './store';

type Tab = 'recommended' | 'all' | 'saved' | 'build';
const KIND_CHIP: Record<Idea['kind'], [string, string]> = { mechanical: ['Changes The Work', 'chip-accent'], brief: ['Words You Can Edit', ''], reference: ['A Note', 'chip-info'] };
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export interface PickerProps {
  p: Project;
  /** The fields whose ideas it offers. */
  fields: IdeaField[];
  title: string;
  /** Who or what the button was on: chosen already when the idea opens. */
  characterId?: string;
  sceneId?: string;
  /** Runs the change the way the page's own controls do (with Undo), and returns an error to show. */
  run: (fn: () => void) => string | null;
  onClose: () => void;
  onApplied: (label: string) => void;
}

export function IdeaPicker({ p, fields, title, characterId, sceneId, run, onClose, onApplied }: PickerProps) {
  const all = useMemo(() => ideasFor(fields), [fields.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const suited = useMemo(() => all.filter((x) => !wrongMedium(p, x) && whyItFits(p, x) !== null), [all, p]);
  const builder = fields.includes('logline');
  const [tab, setTab] = useState<Tab>(suited.length ? 'recommended' : builder && !all.length ? 'build' : 'all');
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');
  const [open, setOpen] = useState<Idea | null>(null);
  const saved = new Set(p.brief?.saved ?? []);
  const pool = tab === 'recommended' ? suited : tab === 'saved' ? all.filter((x) => saved.has(x.id)) : all;
  const q = norm(query.trim());
  const shown = pool.filter((x) => (!q || norm(`${x.label} ${x.text} ${x.tags.join(' ')}`).includes(q)) && (!tag || x.tags.includes(tag)));
  // Facets count ideas that are really there, in this tab and matching the search: never a product of options.
  const tags = useMemo(() => {
    const n = new Map<string, number>();
    for (const x of pool) if (!q || norm(`${x.label} ${x.text} ${x.tags.join(' ')}`).includes(q)) for (const t of x.tags) n.set(t, (n.get(t) ?? 0) + 1);
    return [...n.entries()].filter(([, c]) => c > 1 && c < pool.length).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10);
  }, [pool, q]);
  const tabs: { id: Tab; label: string }[] = [
    ...(suited.length ? [{ id: 'recommended' as const, label: 'Recommended For This Project' }] : []),
    ...(all.length ? [{ id: 'all' as const, label: 'Browse All' }] : []),
    ...(builder ? [{ id: 'build' as const, label: 'Build A Logline' }] : []),
    ...(all.length ? [{ id: 'saved' as const, label: 'Saved Choices' }] : []),
  ];
  if (open) return <OpenIdea p={p} idea={open} characterId={characterId} sceneId={sceneId} run={run} back={() => setOpen(null)} onClose={onClose} onApplied={onApplied} />;
  return (
    <Modal title={title} onClose={onClose} sheet footer={<button className="btn" onClick={onClose}>Keep My Current Choices</button>}>
      {tabs.length > 1 && <SectionNav label="Ideas" items={tabs} current={tab} onChange={(t) => { setTab(t); setTag(''); }} />}
      {tab === 'build' ? <LoglineBuilder p={p} run={run} onApplied={onApplied} /> : (
        <>
          <TextField label="Search Ideas" value={query} onChange={setQuery} />
          {tags.length > 0 && (
            <div className="chip-row" role="group" aria-label="Narrow By">
              {tags.map(([t, n]) => <button key={t} type="button" className={`chip chip-button ${tag === t ? 'chip-accent' : ''}`} aria-pressed={tag === t} onClick={() => setTag(tag === t ? '' : t)}>{t.replace(/-/g, ' ')} ({n})</button>)}
            </div>
          )}
          <p className="dim small" role="status">{shown.length === pool.length ? plural(pool.length, 'idea') : `${shown.length} of ${plural(pool.length, 'idea')}`}{tab === 'recommended' ? '. Browse All has the rest.' : ''}</p>
          {shown.length === 0 ? (
            <p className="muted">{tab === 'saved' && !pool.length ? 'Nothing saved yet. Open an idea and press Save For Later to keep it here.' : 'No idea matches that. Clear the search, or write your own in the field.'}</p>
          ) : (
            <ul className="idea-list" aria-label="Ideas">
              {shown.map((x) => {
                const why = whyItFits(p, x);
                return (
                  <li key={x.id}>
                    <button type="button" className="idea-card" onClick={() => setOpen(x)}>
                      <span className="idea-label">{x.label}</span>
                      <span className="idea-text">{x.text}</span>
                      <span className="chip-row">
                        <span className={`chip ${KIND_CHIP[x.kind][1]}`}>{KIND_CHIP[x.kind][0]}</span>
                        {wrongMedium(p, x) ? <span className="chip chip-warning">{x.fits!.media!.includes('animation') ? 'For Animation' : 'For Live Action'}</span> : why && <span className="chip chip-positive">{why.charAt(0).toUpperCase() + why.slice(1)}</span>}
                        {saved.has(x.id) && <span className="chip">Saved</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </Modal>
  );
}

function OpenIdea({ p, idea, characterId, sceneId, run, back, onClose, onApplied }: { p: Project; idea: Idea; characterId?: string; sceneId?: string; run: PickerProps['run']; back: () => void; onClose: () => void; onApplied: (label: string) => void }) {
  const beatCount = idea.patch.reduce((a, c) => a + (c.op === 'beats' ? c.beats.length : 0), 0);
  const [chars, setChars] = useState<string[]>(characterId ? [characterId] : idea.scope === 'character' && p.characters.length === 1 ? [p.characters[0].id] : []);
  const [scenes, setScenes] = useState<string[]>(sceneId ? [sceneId] : []);
  // A single offered scene is what the idea is for, so it starts ticked; several are the player's to choose among.
  const [beats, setBeats] = useState<number[]>(beatCount === 1 ? [0] : []);
  const [slots, setSlots] = useState<Record<string, string>>({});
  const [keep, setKeep] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const t: Target = { characterIds: chars, sceneIds: scenes, beats, slots, keep };
  const pre = previewIdea(p, idea, t);
  const saved = !!p.brief?.saved?.includes(idea.id);
  const toggle = (list: string[], set: (v: string[]) => void, id: string, on: boolean) => set(on ? [...list, id] : list.filter((x) => x !== id));
  const apply = () => {
    const e = run(() => { applyIdea(store.state!, p, idea, t); });
    if (e) { setErr(e); return; }
    onApplied(idea.label);
    onClose();
  };
  const offered = idea.patch.flatMap((c) => (c.op === 'beats' ? c.beats : []));
  return (
    <Modal title={idea.label} kind="idea-open" onClose={onClose} sheet footer={
      <>
        <button className="btn" onClick={back}>Back To Ideas</button>
        <button className="btn" onClick={() => void store.act(() => saveIdea(p, idea.id, !saved))}>{saved ? 'Remove From Saved' : 'Save For Later'}</button>
        <button className="btn btn-primary" onClick={apply}>Apply</button>
      </>
    }>
      <p>{idea.text}</p>
      {wrongMedium(p, idea) && <p className="callout callout-info">This is for {idea.fits!.media!.includes('animation') ? 'animation' : 'live action'}, and this project is {p.axes.medium === 'animation' ? 'animated' : p.axes.medium === 'hybrid' ? 'live action with animation' : 'live action'}. You can still apply it; read what it says it will do.</p>}
      {idea.slots && idea.slots.length > 0 && (
        <fieldset className="idea-block">
          <legend>Make It Your Own</legend>
          <div className="grid grid-2 form">
            {idea.slots.map((s) => <TextField key={s.key} label={s.label} value={slots[s.key] ?? s.suggest} maxLength={60} onChange={(v) => setSlots({ ...slots, [s.key]: v })} />)}
          </div>
        </fieldset>
      )}
      {idea.scope === 'character' && p.characters.length > 0 && (
        <fieldset className="idea-block">
          <legend>Who Is This For</legend>
          <div className="chip-row">{p.characters.map((c) => <Check key={c.id} label={c.name} checked={chars.includes(c.id)} onChange={(on) => toggle(chars, setChars, c.id, on)} />)}</div>
        </fieldset>
      )}
      {idea.scope === 'scene' && p.scenes.length > 0 && (
        <fieldset className="idea-block">
          <legend>Apply To These Scenes</legend>
          <div className="col gap-1">{p.scenes.map((s, i) => <Check key={s.id} label={`Scene ${i + 1}: ${s.heading.place || 'No place yet'}${s.crowd ? `, ${s.crowd} in the background` : ''}`} checked={scenes.includes(s.id)} onChange={(on) => toggle(scenes, setScenes, s.id, on)} />)}</div>
        </fieldset>
      )}
      {offered.length > 0 && (
        <fieldset className="idea-block">
          <legend>{offered.length === 1 ? 'The Scene It Adds' : 'Scenes It Offers'}</legend>
          {offered.length > 1 && <p className="dim small">Tick the ones you want. Each is added to your script as a scene you can change; the ones you leave are not added.</p>}
          <div className="col gap-1">
            {offered.map((b, i) => <Check key={i} label={`${b.intExt === 'EXT' ? 'Exterior' : 'Interior'}, ${b.time.toLowerCase()}: ${b.place.replace(/\{(\w+)\}/g, (_m, k: string) => slots[k]?.trim() || idea.slots?.find((s) => s.key === k)?.suggest || '')}${b.crowd ? `, ${b.crowd} in the background` : ''}`} checked={beats.includes(i)} onChange={(on) => setBeats(on ? [...beats, i].sort((a, z) => a - z) : beats.filter((x) => x !== i))} />)}
          </div>
        </fieldset>
      )}
      <section className="idea-block" aria-label="What It Sets">
        <h3>What It Sets</h3>
        {pre.changes.length ? <ul>{pre.changes.map((c, i) => <li key={i}>{c}</li>)}</ul> : <p className="muted">{idea.patch.length ? 'Choose above, and what it sets is listed here.' : 'Nothing in your project. It is kept in your Creative Brief as a note.'}</p>}
      </section>
      {pre.overwrites.length > 0 && (
        <fieldset className="idea-block">
          <legend>You Have Already Written</legend>
          <p className="dim small">Applying replaces these with the idea's words unless you keep yours. Undo Last Change brings them back.</p>
          <div className="col gap-1">{pre.overwrites.map((o) => <Check key={o.key} label={`Keep My ${o.label}`} hint={o.current.length > 140 ? `${o.current.slice(0, 140)}…` : o.current} checked={keep.includes(o.key)} onChange={(on) => toggle(keep, setKeep, o.key, on)} />)}</div>
        </fieldset>
      )}
      {pre.work.length > 0 && (
        <section className="idea-block" aria-label="This Changes The Shoot">
          <h3>This Changes The Shoot</h3>
          <ul>{pre.work.map((c, i) => <li key={i}>{c}</li>)}</ul>
          <p className="dim small">These are the figures the schedule and the budget use. It takes effect in production when you approve a draft.</p>
        </section>
      )}
      {pre.warnings.length > 0 && <div className="callout callout-info"><ul>{pre.warnings.map((c, i) => <li key={i}>{c}</li>)}</ul></div>}
      {idea.kind !== 'mechanical' && idea.patch.length > 0 && <p className="dim small">These are words for you to change as you like. The game keeps them and never reads them for meaning, so they earn and cost nothing.</p>}
      {(pre.refusal || err) && <p role="alert" className="error">{err ?? pre.refusal}</p>}
    </Modal>
  );
}

/** Four chosen parts, read as one sentence before it is applied to the Logline field. */
function LoglineBuilder({ p, run, onApplied }: { p: Project; run: PickerProps['run']; onApplied: (label: string) => void }) {
  const [parts, setParts] = useState<LoglineParts>({ when: WHEN[0].id, who: WHO[0].id, must: MUST[0].id, cost: COST[0].id });
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const sentence = compose(parts);
  const set = (k: keyof LoglineParts) => (v: string) => { setParts({ ...parts, [k]: v }); setDone(false); };
  const options = (list: { id: string; text: string }[]) => list.map((x) => ({ value: x.id, label: x.text.charAt(0).toUpperCase() + x.text.slice(1) }));
  const apply = () => {
    if (!sentence) return;
    const idea: Idea = { id: `logline.${[parts.when, parts.who, parts.must, parts.cost].map((x) => x.split('.')[1]).join('-')}`, v: 1, field: 'logline', label: 'A Built Logline', text: sentence, kind: 'brief', scope: 'project', tags: [],
      patch: [{ op: 'story', field: 'logline', text: sentence }], consumers: [], tests: [] };
    const e = run(() => { applyIdea(store.state!, p, idea); });
    setErr(e);
    if (!e) { setDone(true); onApplied('A Built Logline'); }
  };
  return (
    <>
      <p className="dim">Choose each part and read the sentence. Apply puts it in your Logline, where you can rewrite any of it.</p>
      <div className="grid grid-2 form">
        <SelectField label="When It Starts" value={parts.when} options={options(WHEN)} onChange={set('when')} />
        <SelectField label="Who It Happens To" value={parts.who} options={options(WHO)} onChange={set('who')} />
        <SelectField label="What They Must Do" value={parts.must} options={options(MUST)} onChange={set('must')} />
        <SelectField label="What It Costs" value={parts.cost} options={options(COST)} onChange={set('cost')} />
      </div>
      <section className="idea-block" aria-label="Your Logline">
        <h3>Your Logline</h3>
        {sentence ? <p className="idea-sentence">{sentence}</p> : <p className="muted">Those parts don't go together. Change one of them.</p>}
        {p.story.logline.trim() && p.story.logline.trim() !== sentence && !done && <p className="dim small">Applying replaces the logline you have now: "{p.story.logline.length > 120 ? `${p.story.logline.slice(0, 120)}…` : p.story.logline}" Undo Last Change brings it back.</p>}
      </section>
      <button className="btn btn-primary" disabled={!sentence} onClick={apply}>Apply To My Logline</button>
      {done && <p role="status" className="muted">Applied. It is in your Logline now.</p>}
      {err && <p role="alert" className="error">{err}</p>}
    </>
  );
}
