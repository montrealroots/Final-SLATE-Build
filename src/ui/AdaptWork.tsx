// Adapt A Work (the v4 package, 01): the main way to start a project. Choose a real work, read what is recorded about it,
// choose the format, method and how closely to follow it, read the whole brief the game proposes, field by field with
// where each came from, name its people, and create the project. Nothing exists until Create Project, so going back or
// cancelling at any step leaves no project and costs nothing. Loaded with this page, not at startup.
import { useMemo, useState } from 'react';
import { APPROACHES, APPROACH_ORDER } from '../engine/adaptation';
import { FIELD_LABELS, STRUCTURES, named } from '../engine/blueprints';
import { GENRES } from '../engine/genres';
import { FORMAT_LABELS, FUNDING_SCENARIOS, MEDIUM_LABELS, TECHNIQUE_LABELS, hasTrackRecord, isEpisodic, isNonfiction, money } from '../engine';
import { ORIGIN_LABELS, createFromSource, proposeFromSource, type FieldOrigin } from '../engine/proposal';
import { rightsStanding, type SourceWork } from '../engine/sources';
import { projectStages } from '../engine/stages';
import type { AdaptationApproach, Format, Medium, Technique } from '../engine/types';
import { NumberField, PageHead, SelectField, TextField } from './components';
import { Breadcrumbs } from './Shell';
import { WorkBrowser, WorkFacts, genreName } from './SourcePicker';
import { store, useGame } from './store';

const SCRIPTED = (Object.keys(FORMAT_LABELS) as Format[]).filter((f) => !isNonfiction(f));
const GENRE_IDS = new Set(GENRES.map((g) => g.id));
const CHIP: Record<FieldOrigin | 'edited', string> = { sourced: 'chip chip-positive', proposed: 'chip chip-info', unknown: 'chip chip-warning', edited: 'chip' };

export function AdaptWork() {
  const g = useGame();
  const [open, setOpen] = useState<SourceWork | null>(null);
  const [work, setWork] = useState<SourceWork | null>(null);
  const [shaped, setShaped] = useState(false);
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState<Format>('feature');
  const [medium, setMedium] = useState<Medium>('live-action');
  const [technique, setTechnique] = useState<Technique>('3d-cg');
  const [episodes, setEpisodes] = useState(6);
  const [runtime, setRuntime] = useState(95);
  const [approach, setApproach] = useState<AdaptationApproach>('faithful');
  const [scenario, setScenario] = useState('low');
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const episodic = isEpisodic(format);
  const tech: Technique = medium === 'live-action' ? 'none' : technique;
  const gameYear = new Date(g.now).getUTCFullYear();
  const proposal = useMemo(() => (work && shaped ? proposeFromSource({ work, format, approach, gameYear, episodes: episodic ? episodes : undefined, minutes: runtime, genres: GENRE_IDS }) : null), [work, shaped, format, approach, gameYear, episodic, episodes, runtime]);

  const create = () => {
    let id = '';
    const err = store.act((s) => {
      id = createFromSource(s, { work: work!, title, approach, scenarioId: scenario, genres: GENRE_IDS, names, axes: { format, medium, technique: tech, episodeCount: episodic ? episodes : 1, targetRuntimeMin: runtime } }).id;
    });
    if (err) setError(err);
    else store.go({ view: 'project', projectId: id, tab: 'script' });
  };
  const crumbs = <Breadcrumbs items={[{ label: 'Projects', route: { view: 'projects' } }, { label: 'New Project', route: { view: 'new-project' } }, { label: 'Adapt A Work' }]} />;

  // ---- 1. The work.
  if (!work) {
    return (
      <>
        {crumbs}
        <PageHead eyebrow="New Project" title={open ? open.title : 'Adapt A Work'} lede={open ? 'What is recorded about it. Adapt it, or go back to the works.' : 'Choose the novel, story, play, comic, game or online fiction to make it from. Nothing is made until you create the project.'} />
        {open ? (
          <section className="card" aria-label={`About ${open.title}`}>
            <WorkFacts w={open} />
            <div className="row gap-2 wrap spaced">
              <button className="btn" onClick={() => setOpen(null)}>Back To Works</button>
              <button className="btn btn-primary" onClick={() => { setWork(open); setTitle(open.title); setNames({}); }}>Adapt This Work</button>
            </div>
          </section>
        ) : (
          <section className="card"><WorkBrowser onOpen={setOpen} /></section>
        )}
        <div className="row gap-2 wrap"><button className="btn" onClick={() => store.back()}>Cancel</button></div>
      </>
    );
  }

  // ---- 2. Its shape.
  if (!proposal) {
    return (
      <>
        {crumbs}
        <PageHead eyebrow="Adapt A Work" title={work.title} lede="Choose what you will make of it. The next step shows the whole brief this proposes, before anything is made." />
        <section className="card">
          <h2>Format And Method</h2>
          <TextField label="Working Title" value={title} maxLength={120} onChange={setTitle} hint="The work's own title to start with. Yours to change." />
          <div className="grid grid-2 form">
            <SelectField label="Format" value={format} options={SCRIPTED.map((f) => ({ value: f, label: FORMAT_LABELS[f] }))} onChange={(v) => { setFormat(v); setRuntime(v === 'short' ? 12 : isEpisodic(v) ? 30 : 95); }} />
            <SelectField label="Medium" value={medium} options={(Object.keys(MEDIUM_LABELS) as Medium[]).map((m) => ({ value: m, label: MEDIUM_LABELS[m] }))} onChange={setMedium} />
            {medium !== 'live-action' && <SelectField label={medium === 'hybrid' ? 'Animation Technique For Animated Scenes' : 'Animation Technique'} value={technique} options={(Object.keys(TECHNIQUE_LABELS) as Technique[]).filter((t) => t !== 'none').map((t) => ({ value: t, label: TECHNIQUE_LABELS[t] }))} onChange={setTechnique} />}
            {episodic && <NumberField label="Episodes" value={episodes} min={2} max={13} onChange={setEpisodes} />}
            <NumberField label={episodic ? 'Target Minutes Per Episode' : 'Target Runtime In Minutes'} value={runtime} min={1} max={600} onChange={setRuntime} />
          </div>
        </section>
        <section className="card" aria-labelledby="approach-h">
          <h2 id="approach-h">How Closely It Follows The Work</h2>
          <p className="dim">This shapes the brief: moved to another time, the story is set now; freely adapted, the ending is your own.</p>
          {APPROACH_ORDER.map((a) => (
            <label key={a} className="check" style={{ alignItems: 'flex-start', marginBottom: 'var(--s2)' }}>
              <input type="radio" name="approach" value={a} checked={approach === a} onChange={() => setApproach(a)} />
              <span><strong>{APPROACHES[a].label}</strong><br /><span className="muted">{APPROACHES[a].says}</span></span>
            </label>
          ))}
        </section>
        <section className="card" aria-labelledby="stages-h">
          <h2 id="stages-h">What This Project Goes Through</h2>
          <ol className="list">{projectStages({ format, medium, technique: tech, episodes }).map((st) => <li key={st.name}><strong>{st.name}</strong>: {st.needs}</li>)}</ol>
        </section>
        <section className="card">
          <fieldset style={{ border: 0, padding: 0 }}>
            <legend style={{ fontWeight: 600, marginBottom: 'var(--s2)' }}>Budget Size</legend>
            {FUNDING_SCENARIOS.map((f) => {
              const locked = f.needsTrackRecord && !hasTrackRecord(g);
              return (
                <label key={f.id} className="check" style={{ alignItems: 'flex-start', marginBottom: 'var(--s2)' }}>
                  <input type="radio" name="funding" value={f.id} checked={scenario === f.id} disabled={locked} onChange={() => setScenario(f.id)} />
                  <span><strong>{f.label}: from {money(f.fund)}</strong><br /><span className="muted">{f.description}{locked ? ' Available after you deliver a project.' : ''}</span></span>
                </label>
              );
            })}
          </fieldset>
        </section>
        <div className="row gap-2 wrap">
          <button className="btn" onClick={() => setWork(null)}>Back To The Work</button>
          <button className="btn" onClick={() => store.back()}>Cancel</button>
          <button className="btn btn-primary" onClick={() => setShaped(true)}>Preview The Brief</button>
        </div>
      </>
    );
  }

  // ---- 3. The whole brief, before anything is made.
  const b = proposal.blueprint;
  const say = (t: string) => named(t, b, { names });
  const field = (k: string, text: string) => {
    const o = proposal.origin[k] ?? 'proposed';
    return (
      <li key={k} className="list-item">
        <div className="grow">
          <strong>{FIELD_LABELS[k]}</strong> <span className={CHIP[o]}>{ORIGIN_LABELS[o]}</span>
          <p className="small">{text}</p>
          {proposal.why[k] && <p className="dim small">{proposal.why[k]}</p>}
        </div>
      </li>
    );
  };
  const acts = [...new Set(b.scenes.map((s) => s.act))];
  return (
    <>
      {crumbs}
      <PageHead eyebrow="Adapt A Work" title={title || work.title} lede={`The brief proposed from ${work.title}. Each field says whether it is from the work, proposed by the game, or not recorded. Everything is yours to change once the project exists.`} />
      {proposal.notes.length > 0 && (
        <section className="card" aria-labelledby="fit-h">
          <h2 id="fit-h">Fitting It To {FORMAT_LABELS[format]}</h2>
          <ul className="small">{proposal.notes.map((n) => <li key={n}>{n}</li>)}</ul>
        </section>
      )}
      <section className="card" aria-labelledby="brief-h">
        <h2 id="brief-h">The Brief</h2>
        <ul className="list" aria-label="Brief Fields">
          {field('genres', [b.genre, ...b.secondary].map(genreName).join(', '))}
          {field('year', b.year === null ? (b.time === 'future' ? 'No year: the future or an invented world' : b.time === 'period' ? 'No year: the past' : 'No year: the present day') : String(b.year))}
          {field('setting', `${b.setting.name}${b.setting.kind === 'fictional' ? ' (a made-up place, or not recorded)' : ''}`)}
          {field('tone', b.tone)}
          {field('story.logline', say(b.logline))}
          {field('story.premise', say(b.premise))}
          {field('story.synopsis', say(b.synopsis))}
          {field('story.question', say(b.question))}
          {field('story.conflict', say(b.conflict))}
          {field('story.stakes', say(b.stakes))}
          {field('story.theme', b.themes.join('; '))}
          {field('story.ending', say(b.ending))}
          {field('story.structure', STRUCTURES[b.structure] ?? b.structure)}
          {field('story.audience', b.audience)}
        </ul>
      </section>
      <section className="card" aria-labelledby="people-h">
        <h2 id="people-h">Its People <span className={CHIP[proposal.origin.characters]}>{ORIGIN_LABELS[proposal.origin.characters]}</span></h2>
        <p className="dim small">{proposal.why.characters} Rename anyone now or later; a name is used everywhere the brief names them.</p>
        <ul className="list">
          {b.characters.map((c) => (
            <li key={c.key} className="list-item">
              <div className="grow">
                <TextField label={`Name For ${c.name}`} value={names[c.key] ?? c.name} maxLength={60} onChange={(v) => setNames({ ...names, [c.key]: v })} />
                <p className="small">{c.functions.filter((f) => f !== 'none').join(', ').replace(/-/g, ' ') || 'supporting'}; {c.pronouns}{c.age === '-' ? '; age not recorded' : `; ${c.age}`}. Wants {say(c.wants)}. In the way: {say(c.obstacle)}.</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="card" aria-labelledby="outline-h">
        <h2 id="outline-h">{b.tv ? 'The First Episode' : 'The Outline'} <span className={CHIP.proposed}>{ORIGIN_LABELS.proposed}</span></h2>
        {acts.map((a) => (
          <div key={a}>
            <h3>{a}</h3>
            <ol className="small">{b.scenes.filter((s) => s.act === a).map((s, i) => <li key={i}><strong>{s.intExt}. {s.place}, {s.time.toLowerCase()}.</strong> {say(s.action)}{s.turn ? ` ${say(s.turn)}` : ''}</li>)}</ol>
          </div>
        ))}
      </section>
      {b.tv && (
        <section className="card" aria-labelledby="season-h">
          <h2 id="season-h">The Season</h2>
          <p>{say(b.tv.arc)}.</p>
          <ol className="small">{b.tv.eps.map((e) => <li key={e.n}><strong>{e.title}.</strong> {say(e.moves)}.</li>)}</ol>
          <p className="small"><strong>How It Goes On Or Ends:</strong> {b.tv.continuation} <span className={CHIP[proposal.origin['series.continuation']]}>{ORIGIN_LABELS[proposal.origin['series.continuation']]}</span></p>
        </section>
      )}
      <section className="card" aria-labelledby="after-h">
        <h2 id="after-h">What Comes After</h2>
        <p className="small">This is a brief and an outline, not a screenplay: the writing, the rights, the money, the casting and the production are all still to do. The project is adapted from {work.title}, declared {APPROACHES[approach].label.toLowerCase()}, and its credits say what it is based on{rightsStanding(work) === 'copyrighted-recorded' ? ', and that it is recorded as copyrighted' : ''}. Cancel now and nothing is made.</p>
      </section>
      {error && <p role="alert" style={{ color: 'var(--negative)' }}>{error}</p>}
      <div className="row gap-2 wrap">
        <button className="btn" onClick={() => setShaped(false)}>Back To Format And Method</button>
        <button className="btn" onClick={() => store.back()}>Cancel</button>
        <button className="btn btn-primary" onClick={create}>Create Project</button>
      </div>
    </>
  );
}
