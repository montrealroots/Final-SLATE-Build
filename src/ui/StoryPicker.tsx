// Choose A Full Story (the v3 package, 01-STORIES-AND-CHARACTERS.md section 1). One dialog, the same on a phone and a
// desktop: the stories written for a genre, each shown with its title, genres, format, tone, era, setting, premise and
// where it is from; one opened in full with everything it would write; and Apply. Nothing changes until Apply, a field
// with the player's own words is kept unless they say otherwise, a locked field is never written, and Undo Last Change
// takes the whole story back.
//
// It loads with the story files (src/blueprints/), a genre at a time, the first time it is opened.
import { useEffect, useMemo, useState } from 'react';
import { FIELD_LABELS, STRUCTURES, applyBlueprint, formatClass, named, previewBlueprint, setLock, type Blueprint } from '../engine/blueprints';
import { genreCatalogLoaded, genreName, loadGenreCatalog } from '../engine/genres';
import { FORMAT_LABELS, isEpisodic, isNonfiction } from '../engine/projects';
import type { Project } from '../engine/types';
import { STORY_COUNTS, filesFor, loadStories } from '../blueprints';
import { Check, Modal, SelectField, TextField, plural } from './components';
import { store } from './store';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const name = (id: string) => (genreCatalogLoaded() ? genreName(id) : id.replace(/-/g, ' '));
const fileLabel = (f: string) => f.split('+').map(name).join(' And ');
const era = (b: Blueprint) => (b.year !== null ? String(b.year) : b.time === 'period' ? 'The Past' : b.time === 'future' ? 'The Future Or An Invented World' : 'The Present Day');
export const originLine = (b: { id: string; title: string }) => `An original story written for this game: ${b.title} (${b.id}).`;

export interface StoryPickerProps {
  p: Project;
  /** Runs the change the way the page's own controls do (with Undo), and returns an error to show. */
  run: (fn: () => void) => string | null;
  onClose: () => void;
  onApplied: (title: string) => void;
}

export function StoryPicker({ p, run, onClose, onApplied }: StoryPickerProps) {
  const want = isEpisodic(p.axes.format) ? 'tv' : 'film';
  const nonfiction = isNonfiction(p.axes.format);
  // Files with a story this project could take, the project's own genres first.
  const files = useMemo(() => {
    const has = Object.keys(STORY_COUNTS).filter((f) => STORY_COUNTS[f][want] > 0);
    const mine = p.axes.genres.flatMap((g) => filesFor(g.id)).filter((f) => has.includes(f));
    return [...new Set([...mine, ...has.sort((a, b) => fileLabel(a).localeCompare(fileLabel(b)))])];
  }, [p.axes.genres, want]);
  const [file, setFile] = useState(files[0] ?? '');
  const [stories, setStories] = useState<Blueprint[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Blueprint | null>(null);
  const [, setNames] = useState(0);
  useEffect(() => { if (!genreCatalogLoaded()) void loadGenreCatalog().then(() => setNames((n) => n + 1)).catch(() => {}); }, []);
  useEffect(() => {
    if (!file) return;
    let live = true;
    setStories(null); setFailed(false);
    loadStories(file).then((xs) => { if (live) setStories(xs.filter((b) => formatClass(b.format) === want && isNonfiction(b.format) === nonfiction)); }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [file, want, nonfiction]);
  if (open) return <OpenStory p={p} b={open} run={run} back={() => setOpen(null)} onClose={onClose} onApplied={onApplied} />;
  const q = norm(query.trim());
  const shown = (stories ?? []).filter((b) => !q || norm(`${b.title} ${b.logline} ${b.premise} ${b.tone} ${b.setting.name} ${b.themes.join(' ')}`).includes(q));
  return (
    <Modal title="Choose A Full Story" onClose={onClose} sheet footer={<button className="btn" onClick={onClose}>Keep My Script As It Is</button>}>
      <p className="dim">Each is a whole original story to develop: its people, what is between them, and an outline{want === 'tv' ? ', with a first season episode by episode' : ''}. Open one to read it and see everything it would write. Or close this and write your own.</p>
      {!files.length ? (
        <p className="muted">No {want === 'tv' ? 'series' : 'film'} stories{nonfiction ? ' for a documentary' : ''} are written yet. You can still choose ideas field by field, or write your own.</p>
      ) : (
        <>
          <div className="grid grid-2 form">
            <SelectField label="Genre" value={file} options={files.map((f) => ({ value: f, label: `${fileLabel(f)} (${STORY_COUNTS[f][want]})` }))} onChange={setFile} />
            <TextField label="Search These Stories" value={query} onChange={setQuery} />
          </div>
          {failed ? (
            <div className="callout callout-negative" role="alert"><p>These stories couldn't be loaded.</p><button className="btn btn-sm" onClick={() => setFile((f) => `${f}`)}>Try Again</button></div>
          ) : stories === null ? <p role="status" className="muted">Loading stories…</p> : (
            <>
              <p className="dim small" role="status">{shown.length === stories.length ? plural(stories.length, 'story', 'stories') : `${shown.length} of ${plural(stories.length, 'story', 'stories')}`}</p>
              {shown.length === 0 ? <p className="muted">{stories.length ? 'No story matches that. Clear the search.' : `No ${want === 'tv' ? 'series' : 'film'} stories are written for this genre yet.`}</p> : (
                <ul className="idea-list" aria-label="Stories">
                  {shown.map((b) => (
                    <li key={b.id}>
                      <button type="button" className="idea-card" onClick={() => setOpen(b)}>
                        <span className="idea-label">{b.title}</span>
                        <span className="idea-text">{named(b.premise, b)}</span>
                        <span className="dim small">{[name(b.genre), ...b.secondary.map(name)].join(', ')} · {FORMAT_LABELS[b.format]} · {era(b)} · {b.setting.name}{b.setting.kind === 'fictional' ? ' (made up)' : ''}</span>
                        <span className="dim small">{b.tone}</span>
                        <span className="chip-row"><span className="chip chip-info">Original Story</span>{b.tv && <span className="chip">{b.tv.episodes} Episodes</span>}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      )}
    </Modal>
  );
}

function OpenStory({ p, b, run, back, onClose, onApplied }: { p: Project; b: Blueprint; run: StoryPickerProps['run']; back: () => void; onClose: () => void; onApplied: (title: string) => void }) {
  const [names, setNames] = useState<Record<string, string>>({});
  const [keep, setKeep] = useState<string[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const o = { names, keep: keep ?? [] };
  const pre = previewBlueprint(p, b, o);
  // The player's own words are kept unless they say otherwise: every field with something in it starts ticked.
  const kept = keep ?? pre.overwrites.map((x) => x.key);
  const say = (t: string) => named(t, b, o);
  const who = (k: string) => names[k]?.trim() || b.characters.find((c) => c.key === k)?.name || k;
  const apply = () => {
    const e = run(() => { applyBlueprint(store.state!, p, b, { names, keep: kept }); });
    if (e) { setErr(e); return; }
    onApplied(b.title);
    onClose();
  };
  const acts = [...new Set(b.scenes.map((s) => s.act))];
  const locks = new Set(p.locks ?? []);
  return (
    <Modal title={b.title} onClose={onClose} sheet footer={
      <>
        <button className="btn" onClick={back}>Back To Stories</button>
        <button className="btn btn-primary" disabled={!!pre.refusal} onClick={apply}>Apply This Story</button>
      </>
    }>
      <p className="idea-sentence">{say(b.logline)}</p>
      <p className="dim small">{[name(b.genre), ...b.secondary.map(name)].join(', ')} · {FORMAT_LABELS[b.format]}{b.tv ? ` · ${b.tv.episodes} episodes of ${b.tv.minutes} minutes` : ''} · {STRUCTURES[b.structure]} · {era(b)} · {b.setting.name}{b.setting.kind === 'fictional' ? ' (a made-up place)' : ''}</p>
      <details className="spaced">
        <summary>Where It Is From</summary>
        <p>{originLine(b)} It is not taken from a real film, series, book or game, and nobody's rights are needed to use it here. Version {b.v}.</p>
      </details>
      {pre.refusal && <div className="callout callout-negative" role="alert"><p>{pre.refusal}</p></div>}
      {err && <div className="callout callout-negative" role="alert"><p>{err}</p></div>}

      <section className="idea-block" aria-label="The Story">
        <h3>The Story</h3>
        <p>{say(b.synopsis)}</p>
        <dl className="kv">
          <dt>Central Question</dt><dd>{say(b.question)}</dd>
          <dt>Stakes</dt><dd>{say(b.stakes)}</dd>
          <dt>Central Conflict</dt><dd>{say(b.conflict)}</dd>
          <dt>Ending</dt><dd>{say(b.ending)}</dd>
          <dt>Themes</dt><dd>{b.themes.join('; ')}</dd>
          <dt>Tone</dt><dd>{b.tone}</dd>
          <dt>Who It Is For</dt><dd>{b.audience}</dd>
        </dl>
      </section>

      {b.characters.length > 0 && (
        <fieldset className="idea-block">
          <legend>Its People</legend>
          <p className="dim small">Change any name now, or later: a name is used everywhere the story names them.</p>
          <ul className="list">
            {b.characters.map((c) => (
              <li key={c.key} className="list-item">
                <div className="grow">
                  <TextField label={`Name For ${c.name}`} value={names[c.key] ?? c.name} maxLength={60} onChange={(v) => setNames({ ...names, [c.key]: v })} />
                  <p className="small">{c.size.replace(/-/g, ' ')}{c.functions.filter((f) => f !== 'none').length ? `, ${c.functions.filter((f) => f !== 'none').join(' and ').replace(/-/g, ' ')}` : ''}{c.age !== '-' ? `, ${c.age}` : ''}. Wants: {say(c.wants)}. In the way: {say(c.obstacle)}. {say(c.arc)}.</p>
                </div>
              </li>
            ))}
          </ul>
          {b.relationships.length > 0 && <ul className="small">{b.relationships.map((r, i) => <li key={i}>{who(r.a)} and {who(r.b)}: {r.kind}. {say(r.start)}; by the end, {say(r.end)}.</li>)}</ul>}
        </fieldset>
      )}

      <section className="idea-block" aria-label="The Outline">
        <h3>{b.tv ? 'The First Episode' : 'The Outline'}</h3>
        {acts.map((a) => (
          <div key={a}>
            <h4>{a}</h4>
            <ol className="small">{b.scenes.filter((s) => s.act === a).map((s, i) => <li key={i}><strong>{s.intExt}. {s.place}, {s.time.toLowerCase()}.</strong> {say(s.action)}{s.turn ? ` ${say(s.turn)}.` : ''}</li>)}</ol>
          </div>
        ))}
      </section>

      {b.tv && (
        <section className="idea-block" aria-label="The Season">
          <h3>The Season</h3>
          <p>{say(b.tv.engine)}.</p>
          <p>{say(b.tv.arc)}.</p>
          <ol className="small">{b.tv.eps.map((e) => <li key={e.n}><strong>{e.title}.</strong> {say(e.moves)}.</li>)}</ol>
          <p className="small">{say(b.tv.changes)}.</p>
          <p className="small"><strong>How It Goes On Or Ends:</strong> {say(b.tv.continuation)}</p>
        </section>
      )}

      {b.doc && (
        <section className="idea-block" aria-label="The Plan">
          <h3>Who It Would Follow, And What It Asks</h3>
          <p className="dim small">A plan to try. Nobody here has agreed to take part, and nothing has been found.</p>
          <ul className="small">{b.doc.subjects.map((s, i) => <li key={i}><strong>{s.name}</strong>, {s.role}. To reach them: {s.access}.</li>)}</ul>
          <ul className="small">{b.doc.asks.map((a, i) => <li key={i}>{a.question}</li>)}</ul>
        </section>
      )}

      <section className="idea-block" aria-label="Look And Sound">
        <h3>Look And Sound</h3>
        <p className="dim small">Suggestions for the departments, kept as notes. They choose nothing for you: light, score, makeup and the rest are each still yours to set.</p>
        <p className="small"><strong>Look:</strong> {b.look}</p>
        <p className="small"><strong>Sound:</strong> {b.sound}</p>
      </section>

      <fieldset className="idea-block" role="region" aria-label="What It Would Write">
        <legend>What It Would Write</legend>
        {pre.overwrites.length > 0 && <p className="dim small">Some fields already have your words. Each is kept unless you untick it.</p>}
        <ul className="list">
          {pre.changes.map((c) => {
            const mine = pre.overwrites.find((x) => x.key === c.key);
            const locked = locks.has(c.key);
            return (
              <li key={c.key} className="list-item">
                <div className="grow">
                  <strong>{c.label}</strong>{locked && <span className="chip chip-warning">Locked</span>}
                  <p className="small dim">{c.text.length > 160 ? `${c.text.slice(0, 160)}…` : c.text}</p>
                  {mine && !locked && <Check label={`Keep My ${c.label}`} hint={`Yours: ${mine.current.length > 100 ? `${mine.current.slice(0, 100)}…` : mine.current}`} checked={kept.includes(c.key)} onChange={(v) => setKeep(v ? [...kept, c.key] : kept.filter((k) => k !== c.key))} />}
                </div>
                <button type="button" className="btn btn-sm" aria-pressed={locked} aria-label={`${locked ? 'Unlock' : 'Lock'} ${c.label}`} onClick={() => void store.act(() => setLock(p, c.key, !locked))}>{locked ? 'Unlock' : 'Lock'}</button>
              </li>
            );
          })}
        </ul>
        {pre.locked.length > 0 && <p className="small">Locked and left alone: {pre.locked.map((k) => FIELD_LABELS[k]).join(', ')}.</p>}
        {pre.warnings.map((w, i) => <p key={i} className="callout small">{w}</p>)}
      </fieldset>
    </Modal>
  );
}
