// Revise From The Work (the v4 package, 01: "Preview all changes; preserve field locks and custom writing; support
// apply/undo and selective revision"). For a project made from a real work: the game proposes the brief again for the
// project as it now stands (its format, its length, its approach), and shows every field it would write. A field with the
// player's own words is kept unless they untick it, a locked field is never written, and the people and the outline the
// project already has are kept unless the player chooses to add the proposal's beside them. Nothing changes until Apply,
// and Undo Last Change takes the whole revision back. It replaced the full-story picker on November 12, 2026.
import { useEffect, useMemo, useState } from 'react';
import { FIELD_LABELS, applyBlueprint, previewBlueprint, setLock } from '../engine/blueprints';
import { GENRES } from '../engine/genres';
import { isEpisodic } from '../engine/projects';
import { ORIGIN_LABELS, proposeFromSource } from '../engine/proposal';
import { loadPlots } from '../engine/sources';
import type { Project } from '../engine/types';
import { Check, Modal } from './components';
import { useSourceCatalog } from './SourcePicker';
import { store, useGame } from './store';

const GENRE_IDS = new Set(GENRES.map((g) => g.id));
/** What a project already has is not added again unless the player asks: these are added beside, not replaced. */
const ADDED = ['characters', 'relationships', 'scenes', 'rules'];

export function ReviseBrief({ p, run, onClose, onApplied }: { p: Project; run: (fn: () => void) => string | null; onClose: () => void; onApplied: (title: string) => void }) {
  const g = useGame();
  const { catalog, failed, retry } = useSourceCatalog();
  // The work's story is read before anything is proposed from it (sources.ts loadPlots), so a revision tells it too.
  const [stories, setStories] = useState(false);
  useEffect(() => { let live = true; void loadPlots().catch(() => {}).finally(() => { if (live) setStories(true); }); return () => { live = false; }; }, []);
  const work = stories ? catalog?.records.find((w) => w.id === p.proposal?.workId) ?? null : null;
  const prop = useMemo(() => (work ? proposeFromSource({ work, format: p.axes.format, approach: p.proposal!.approach, gameYear: new Date(g.now).getUTCFullYear(), episodes: isEpisodic(p.axes.format) ? p.episodes.length : undefined, minutes: p.axes.targetRuntimeMin, genres: GENRE_IDS }) : null), [work, stories, p.axes.format, p.proposal, g.now, p.episodes.length, p.axes.targetRuntimeMin]);
  const [keep, setKeep] = useState<string[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (failed) return <Modal title="Revise From The Work" kind="revise-brief" onClose={onClose} footer={<button className="btn" onClick={onClose}>Close</button>}><div className="callout callout-negative" role="alert"><p>The works couldn't be loaded.</p><button className="btn btn-sm" onClick={retry}>Try Again</button></div></Modal>;
  if (!catalog) return <Modal title="Revise From The Work" kind="revise-brief" onClose={onClose} footer={<button className="btn" onClick={onClose}>Close</button>}><p role="status" className="muted">Loading the work…</p></Modal>;
  if (!work || !prop) return <Modal title="Revise From The Work" kind="revise-brief" onClose={onClose} footer={<button className="btn" onClick={onClose}>Close</button>}><p>{p.proposal?.title ?? 'The work'} is no longer in the source catalog, so nothing can be proposed from it again. What it gave this project is kept.</p></Modal>;
  const b = prop.blueprint;
  const pre = previewBlueprint(p, b);
  const has = (k: string) => (k === 'characters' ? p.characters.length > 0 : k === 'relationships' ? p.relationships.length > 0 : k === 'scenes' ? p.scenes.length > 0 : k === 'rules' && p.worldRules.length > 0);
  // The player's own words are kept unless they say otherwise; so are the people and the outline the project has.
  const kept = keep ?? [...pre.overwrites.map((x) => x.key), ...ADDED.filter(has)];
  const locks = new Set(p.locks ?? []);
  const apply = () => {
    const e = run(() => { applyBlueprint(store.state!, p, b, { keep: kept }, prop); });
    if (e) { setErr(e); return; }
    onApplied(work.title);
    onClose();
  };
  return (
    <Modal title="Revise From The Work" kind="revise-brief" onClose={onClose} sheet footer={
      <>
        <button className="btn" onClick={onClose}>Keep My Script As It Is</button>
        <button className="btn btn-primary" disabled={!!pre.refusal} onClick={apply}>Apply The Fields Left Open</button>
      </>
    }>
      <p className="dim">The brief proposed again from {work.title} for this project as it now stands. Tick what to keep; lock what nothing should ever write. Nothing changes until you apply, and Undo Last Change takes it all back.</p>
      {pre.refusal && <div className="callout callout-negative" role="alert"><p>{pre.refusal}</p></div>}
      {err && <div className="callout callout-negative" role="alert"><p>{err}</p></div>}
      <ul className="list" aria-label="What It Would Write">
        {pre.changes.map((c) => {
          const mine = pre.overwrites.find((x) => x.key === c.key);
          const locked = locks.has(c.key);
          const added = ADDED.includes(c.key) && has(c.key);
          const o = prop.origin[c.key] ?? 'proposed';
          return (
            <li key={c.key} className="list-item">
              <div className="grow">
                <strong>{c.label}</strong> <span className="chip">{ORIGIN_LABELS[o]}</span>{locked && <span className="chip chip-warning">Locked</span>}
                <p className="small dim">{c.text.length > 160 ? `${c.text.slice(0, 160)}…` : c.text}</p>
                {mine && !locked && <Check label={`Keep My ${c.label}`} hint={`Yours: ${mine.current.length > 100 ? `${mine.current.slice(0, 100)}…` : mine.current}`} checked={kept.includes(c.key)} onChange={(v) => setKeep(v ? [...kept, c.key] : kept.filter((k) => k !== c.key))} />}
                {added && !locked && <Check label={`Keep My ${c.label} And Add None`} hint="Untick to add the proposal's beside yours. Nobody and nothing you have is removed." checked={kept.includes(c.key)} onChange={(v) => setKeep(v ? [...kept, c.key] : kept.filter((k) => k !== c.key))} />}
              </div>
              <button type="button" className="btn btn-sm" aria-pressed={locked} aria-label={`${locked ? 'Unlock' : 'Lock'} ${c.label}`} onClick={() => void store.act(() => setLock(p, c.key, !locked))}>{locked ? 'Unlock' : 'Lock'}</button>
            </li>
          );
        })}
      </ul>
      {pre.locked.length > 0 && <p className="small">Locked and left alone: {pre.locked.map((k) => FIELD_LABELS[k]).join(', ')}.</p>}
      {pre.warnings.filter((w) => !/already has/.test(w) || !kept.some((k) => ADDED.includes(k))).map((w, i) => <p key={i} className="callout small">{w}</p>)}
    </Modal>
  );
}
