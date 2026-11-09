import { useState } from 'react';
import { LANGUAGES, languageName } from '../data/identity';
import { getPlace, placeLabel } from '../data/places';
import {
  FORMAT_LABELS, FUNDING_SCENARIOS, dateKey, deals, financeSummary, formatDateKey, GENRES, MEDIUM_LABELS, MODULE_LABELS, TECHNIQUE_LABELS, approvalRights, composeGenres, createProject, genre,
  genreCategory, hasTrackRecord, isEpisodic, isNonfiction, ledgerTotals, money, projectGenreLabel, projectModules, qualityWords, scriptIssues,
  canContinue, currentZone, searchGenres, type ModuleId,
} from '../engine';
import { continueProject } from '../engine/sequel';
import { projectStages } from '../engine/stages';
import { resumeProject, shelveImpact, shelveProject } from '../engine/shelve';
import type { Format, Medium, Project, Technique } from '../engine/types';
import { Check, Field, Modal, NumberField, PageHead, SectionNav, SelectField, TextField, longLocal, plural, startedNote } from './components';
import { PlacePicker } from './Creation';
import { Breadcrumbs } from './Shell';
import { store, useGame } from './store';
import { CastTab, CrewTab, ScheduleTab, BudgetTab } from './PlanViews';
import { ScriptTab, CharactersTab } from './ScriptViews';
import { ProductionTab, EditTab, ReleaseTab, FestivalsTab } from './FinishViews';

export const PHASES: Record<Project['phase'], string> = {
  development: 'In Development', 'pre-production': 'In Pre-Production', production: 'In Production', 'post-production': 'In Post-Production', delivered: 'Delivered', released: 'Released',
};

export function ProjectsList() {
  const g = useGame();
  return (
    <>
      <PageHead eyebrow="Your Work" title="Projects" lede="Your scripts and productions, from the first draft to release."
        actions={<button className="btn btn-primary" onClick={() => store.go({ view: 'new-project' })}>New Script</button>} />
      <div>
        {g.projects.length ? (
          <div className="card-grid">
            {g.projects.map((p) => { const started = startedNote(g.projects, p, currentZone(g)); return (
              <section key={p.id} className="card">
                <h2><button className="btn btn-ghost" style={{ fontSize: 'inherit', padding: 0 }} aria-label={started ? `${p.title}, ${started}` : undefined} onClick={() => store.go({ view: 'project', projectId: p.id, tab: 'overview' })}>{p.title}</button></h2>
                <p className="muted">{FORMAT_LABELS[p.axes.format]} · {MEDIUM_LABELS[p.axes.medium]}{p.axes.technique !== 'none' ? ` · ${TECHNIQUE_LABELS[p.axes.technique]}` : ''}{started ? ` · ${started}` : ''}</p>
                <p><span className="chip">{PHASES[p.phase]}</span>{p.shelved ? <> <span className="chip">Shelved</span></> : null}</p>
                {p.axes.genres.length > 0 && <p className="dim">{projectGenreLabel(p)}</p>}
              </section>
            ); })}
          </div>
        ) : (
          <div className="card"><p>You haven't started a project yet.</p><button className="btn btn-primary" onClick={() => store.go({ view: 'new-project' })}>New Script</button></div>
        )}
      </div>
    </>
  );
}

const FORMATS = Object.entries(FORMAT_LABELS).map(([value, label]) => ({ value: value as Format, label }));
const AUDIENCES = ['General', 'Adult', 'Young Adult', 'Family', 'Children (6 To 11)', 'Preschool'];

export function NewProject() {
  const g = useGame();
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState<Format>('feature');
  const [medium, setMedium] = useState<Medium>('live-action');
  const [technique, setTechnique] = useState<Technique>('none');
  const [episodes, setEpisodes] = useState(4);
  const [runtime, setRuntime] = useState(95);
  const [scenario, setScenario] = useState('low');
  const [base, setBase] = useState(g.locationId);
  const [audience, setAudience] = useState('General');
  const [tone, setTone] = useState('');
  const [era, setEra] = useState('Contemporary');
  const [setting, setSetting] = useState('');
  const [settingPlace, setSettingPlace] = useState('');
  const [register, setRegister] = useState<'' | 'comedy' | 'drama'>('');
  const [quality, setQuality] = useState<'limited' | 'tv' | 'feature'>('tv');
  const [langs, setLangs] = useState<string[]>([g.character.mainLanguage]);
  const [genres, setGenres] = useState<{ id: string; emphasis: 'primary' | 'secondary' }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const episodic = isEpisodic(format);
  const suggestAnimation = genres.some((x) => x.id === 'animated' || x.id === 'anime') && medium === 'live-action';
  const create = () => {
    let id = '';
    const err = store.act((s) => {
      const p = createProject(s, {
        title, scenarioId: scenario,
        axes: { format, medium, technique: medium === 'live-action' ? 'none' : technique === 'none' ? '3d-cg' : technique, episodeCount: episodic ? episodes : 1, targetRuntimeMin: runtime, basePlaceId: base, audience, tone, storyEra: era, storySetting: setting, dialogueLanguages: langs, animationQuality: quality, genres,
          ...(settingPlace ? { settingPlaceId: settingPlace } : {}), ...(register ? { register } : {}) },
      });
      id = p.id;
    });
    if (err) setError(err);
    else store.go({ view: 'project', projectId: id, tab: 'script' });
  };
  return (
    <>
      <Breadcrumbs items={[{ label: 'Projects', route: { view: 'projects' } }, { label: 'New Script' }]} />
      <PageHead eyebrow="Your Work" title="New Script" lede="Set up the project. You can change most of this later." />
      <section className="card">
        <h2>Basics</h2>
        <TextField label="Working Title" value={title} maxLength={120} onChange={setTitle} error={error && /title/i.test(error) ? error : null} />
        <div className="grid grid-2 form">
          <SelectField label="Format" value={format} options={FORMATS} onChange={(v) => { setFormat(v); if (v === 'short' || v === 'documentary-short') setRuntime(12); else if (isEpisodic(v)) setRuntime(30); else setRuntime(95); }} />
          <SelectField label="Medium" value={medium} options={(Object.keys(MEDIUM_LABELS) as Medium[]).map((m) => ({ value: m, label: MEDIUM_LABELS[m] }))} onChange={(v) => { setMedium(v); if (v !== 'live-action' && technique === 'none') setTechnique('3d-cg'); if (v === 'live-action') setTechnique('none'); }} />
          {medium !== 'live-action' && (
            <SelectField label={medium === 'hybrid' ? 'Animation Technique For Animated Scenes' : 'Animation Technique'} value={technique === 'none' ? '3d-cg' : technique}
              options={(Object.keys(TECHNIQUE_LABELS) as Technique[]).filter((t) => t !== 'none').map((t) => ({ value: t, label: TECHNIQUE_LABELS[t] }))} onChange={setTechnique} />
          )}
          {medium !== 'live-action' && (
            <SelectField label="Animation Finish" value={quality} hint="Feature finish takes far longer per second of screen time." options={[{ value: 'limited', label: 'Limited Animation' }, { value: 'tv', label: 'Television Standard' }, { value: 'feature', label: 'Feature Standard' }]} onChange={setQuality} />
          )}
          {episodic && <NumberField label="Episodes" value={episodes} min={2} max={13} onChange={setEpisodes} />}
          <NumberField label={episodic ? 'Target Minutes Per Episode' : 'Target Runtime In Minutes'} value={runtime} min={1} max={600} onChange={setRuntime} error={error && /runtime|minutes/i.test(error) ? error : null} />
        </div>
      </section>
      <section className="card" aria-labelledby="stages-h">
        <h2 id="stages-h">What This Project Goes Through</h2>
        <ol className="list">
          {projectStages({ format, medium, technique, episodes }).map((st) => <li key={st.name}><strong>{st.name}</strong>: {st.needs}</li>)}
        </ol>
      </section>
      <section className="card">
        <h2>Genres And Labels</h2>
        <GenrePicker picks={genres} onChange={setGenres} />
        {suggestAnimation && (
          <div className="callout callout-warning">
            <p>You chose an animation label, but the medium is live action.</p>
            <button className="btn btn-sm" onClick={() => { setMedium('animation'); setTechnique(genres.some((x) => x.id === 'anime') ? '2d-drawn' : '3d-cg'); }}>Change Medium To Animation</button>
          </div>
        )}
      </section>
      <section className="card">
        <h2>Story And Audience</h2>
        <div className="grid grid-2 form">
          <SelectField label="Intended Audience" value={audience} options={AUDIENCES.map((a) => ({ value: a, label: a }))} onChange={setAudience} />
          <TextField label="Tone" value={tone} maxLength={80} hint="For example: dry and tense, warm and absurd. Your own words, kept with the script; you can change it in the Story panel." onChange={setTone} />
          <SelectField label="Competes As" value={register} hint="Where awards that split drama from comedy enter it. By its genres, a primary comedy or musical genre makes it a comedy. You can change it in the Story panel." options={[{ value: '', label: 'By Its Genres' }, { value: 'drama', label: 'Drama' }, { value: 'comedy', label: 'Comedy Or Musical' }]} onChange={setRegister} />
          <TextField label="Story Era" value={era} maxLength={60} hint="When the story takes place. Period settings add research and wardrobe work." onChange={setEra} />
          <TextField label="Story Setting" value={setting} maxLength={120} hint="Where the story takes place, in your words, separate from where you shoot." onChange={setSetting} />
        </div>
        <LanguagePicker value={langs} onChange={setLangs} />
        <details className="section-fold">
          <summary>Where The Story Is Set (Optional)</summary>
          <p className="dim">You shoot at your production base. A setting in another country than your base is researched by your designers before design and costumes start; you can change it in the Story panel.</p>
          <PlacePicker label="Story Setting Place" value={settingPlace} onChange={setSettingPlace} />
        </details>
      </section>
      <section className="card">
        <h2>Production</h2>
        <PlacePicker label="Production Base" value={base} onChange={setBase} />
        <fieldset style={{ border: 0, padding: 0 }}>
          <legend style={{ fontWeight: 600, marginBottom: 8 }}>Budget Size</legend>
          <p className="dim">This sets the scale you work at and the least your budget estimate can be. Once your script is approved, the estimate becomes what that script needs at this scale, and that's what you aim to raise (Budget). It doesn't put money in the project: backers do. Amounts are game calibration, not real industry prices.</p>
          {FUNDING_SCENARIOS.map((f) => {
            const locked = f.needsTrackRecord && !hasTrackRecord(g);
            return (
              <label key={f.id} className="check" style={{ alignItems: 'flex-start', marginBottom: 8 }}>
                <input type="radio" name="funding" value={f.id} checked={scenario === f.id} disabled={locked} onChange={() => setScenario(f.id)} />
                <span><strong>{f.label}: from {money(f.fund)}</strong><br /><span className="muted">{f.description}{locked ? ' Available after you deliver a project.' : ''}</span></span>
              </label>
            );
          })}
        </fieldset>
      </section>
      {error && <p role="alert" style={{ color: 'var(--negative)' }}>{error}</p>}
      <div className="row gap-2 wrap">
        <button className="btn" onClick={() => store.back()}>Cancel</button>
        <button className="btn btn-primary" onClick={create}>Create Project</button>
      </div>
    </>
  );
}

export function LanguagePicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [add, setAdd] = useState('');
  return (
    <Field label="Dialogue Languages" hint="The first is the main language.">
      {(id) => (
        <>
          <div className="chip-row">
            {value.map((l) => (
              <span key={l} className="chip">{languageName(l)}{value.length > 1 && <button className="btn btn-ghost btn-sm" aria-label={`Remove ${languageName(l)}`} onClick={() => onChange(value.filter((x) => x !== l))}>Remove</button>}</span>
            ))}
          </div>
          <div className="inline-form">
            <select id={id} value={add} onChange={(e) => setAdd(e.target.value)} aria-label="Add A Dialogue Language">
              <option value="">Choose A Language</option>
              {LANGUAGES.filter((l) => !value.includes(l.code)).map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
            <button className="btn" disabled={!add} onClick={() => { onChange([...value, add]); setAdd(''); }}>Add Language</button>
          </div>
        </>
      )}
    </Field>
  );
}

export function GenrePicker({ picks, onChange }: { picks: { id: string; emphasis: 'primary' | 'secondary' }[]; onChange: (v: { id: string; emphasis: 'primary' | 'secondary' }[]) => void }) {
  const [q, setQ] = useState('');
  const results = searchGenres(q).filter((x) => !picks.some((p) => p.id === x.id)).slice(0, q ? 30 : 12);
  const { modules } = composeGenres(picks.map((p) => p.id));
  return (
    <>
      <TextField label="Search Genres" type="search" value={q} onChange={setQ} hint={`All ${GENRES.length} catalog entries are searchable. Choose as many as fit.`} />
      <div className="picklist" role="group" aria-label="Genre Results">
        {results.map((x) => (
          <button key={x.id} type="button" onClick={() => onChange([...picks, { id: x.id, emphasis: picks.length ? 'secondary' : 'primary' }])} aria-label={`Add ${x.name}`}>
            <span>{x.name} <span className="dim">· {genreCategory(x)}</span></span>
            <span className="dim">{x.definition}</span>
          </button>
        ))}
      </div>
      <h3 className="spaced">Chosen</h3>
      {picks.length ? (
        <ul className="list">
          {picks.map((p) => (
            <li key={p.id} className="row-wrap">
              <span className="grow">{genre(p.id).name} <span className="chip">{p.emphasis === 'primary' ? 'Primary' : 'Secondary'}</span></span>
              <div className="row gap-2 wrap">
                {p.emphasis === 'secondary' && <button className="btn btn-sm" onClick={() => onChange(picks.map((x) => ({ ...x, emphasis: x.id === p.id ? 'primary' : 'secondary' })))}>Make Primary</button>}
                <button className="btn btn-sm" onClick={() => { const rest = picks.filter((x) => x.id !== p.id); if (rest.length && !rest.some((x) => x.emphasis === 'primary')) rest[0] = { ...rest[0], emphasis: 'primary' }; onChange(rest); }} aria-label={`Remove ${genre(p.id).name}`}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="muted">No genres chosen yet. Genres are optional.</p>}
      {modules.size > 0 && (
        <>
          <h3>What These Add To Your Project</h3>
          <ul className="chip-row" style={{ listStyle: 'none', padding: 0 }}>{[...modules].map((m) => <li key={m} className="chip chip-accent">{MODULE_LABELS[m]}</li>)}</ul>
          <p className="dim">Each tool appears once, however many genres use it. They suggest conventions you can follow or subvert.</p>
        </>
      )}
    </>
  );
}

// ---------------- Workspace ----------------

type Tab = 'overview' | 'script' | 'characters' | 'cast' | 'crew' | 'schedule' | 'budget' | 'production' | 'edit' | 'release' | 'festivals';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' }, { id: 'script', label: 'Script' }, { id: 'characters', label: 'Characters' }, { id: 'cast', label: 'Cast' }, { id: 'crew', label: 'Crew' },
  { id: 'schedule', label: 'Schedule' }, { id: 'budget', label: 'Budget' }, { id: 'production', label: 'Production' }, { id: 'edit', label: 'Edit' }, { id: 'release', label: 'Release' },
  { id: 'festivals', label: 'Festivals And Awards' },
];

export function ProjectWorkspace() {
  const g = useGame();
  const route = store.route;
  const p = g.projects.find((x) => x.id === route.projectId);
  if (!p) return <div className="card"><h1>Project Not Found</h1><p>This project no longer exists.</p><button className="btn" onClick={() => store.go({ view: 'projects' })}>Back To Projects</button></div>;
  const tab = (route.tab as Tab) ?? 'overview';
  const label = TABS.find((t) => t.id === tab)?.label ?? 'Overview';
  return (
    <>
      <Breadcrumbs items={[{ label: 'Projects', route: { view: 'projects' } }, { label: p.title, route: { view: 'project', projectId: p.id, tab: 'overview' } }, { label }]} />
      <PageHead eyebrow="Your Work" title={p.title}
        lede={<>{FORMAT_LABELS[p.axes.format]}{isEpisodic(p.axes.format) ? `, ${plural(p.axes.episodeCount, 'episode')}` : ''} · {MEDIUM_LABELS[p.axes.medium]}{p.axes.technique !== 'none' ? ` · ${TECHNIQUE_LABELS[p.axes.technique]}` : ''} · {PHASES[p.phase]}</>} />
      <SectionNav label="Project Sections" items={TABS} current={tab} onChange={(t) => { store.route = { ...store.route, tab: t }; store.emit(); }} />
      {tab === 'overview' && <Overview p={p} />}
      {tab === 'script' && <ScriptTab p={p} />}
      {tab === 'characters' && <CharactersTab p={p} />}
      {tab === 'cast' && <CastTab p={p} />}
      {tab === 'crew' && <CrewTab p={p} />}
      {tab === 'schedule' && <ScheduleTab p={p} />}
      {tab === 'budget' && <BudgetTab p={p} />}
      {tab === 'production' && <ProductionTab p={p} />}
      {tab === 'edit' && <EditTab p={p} />}
      {tab === 'release' && <ReleaseTab p={p} />}
      {tab === 'festivals' && <FestivalsTab p={p} />}
    </>
  );
}

function nextStep(p: Project): { text: string; tab: Tab } {
  if (!p.scenes.length) return { text: 'Write your first scene.', tab: 'script' };
  if (p.approvedDraft === null) return { text: 'Save a draft and approve it to start planning production. Backers read an approved script before they fund it.', tab: 'script' };
  const fin = financeSummary(p);
  const offer = deals(p).find((d) => d.status === 'offered');
  if (offer) return { text: `The ${offer.backer.toLowerCase()} offered ${money(offer.amount)}. Read the terms before you accept.`, tab: 'budget' };
  const waiting = deals(p).find((d) => d.status === 'considering');
  if (fin.received <= 0 && waiting) return { text: `The ${waiting.backer.toLowerCase()} is considering your project. Their answer is due ${formatDateKey(dateKey(waiting.decideAt ?? 0, getPlace(p.axes.basePlaceId).zone))}.`, tab: 'budget' };
  if (fin.received <= 0 && !p.delivered) return { text: `Raise money: no backer has paid in yet, and hiring needs money. Your target is ${money(fin.target)}.`, tab: 'budget' };
  const uncast = p.requirements.filter((r) => r.kind === 'performer' && r.status === 'needed').length - new Set(p.cast.map((c) => c.characterId)).size;
  if (uncast > 0) return { text: `${plural(uncast, 'role')} still ${uncast === 1 ? 'needs' : 'need'} casting.`, tab: 'cast' };
  if (!p.schedule.startDate) return { text: 'Hire your crew and build a schedule.', tab: 'crew' };
  if (!p.delivered && p.tasks.some((t) => t.status === 'blocked')) return { text: 'Some work is blocked. Check what it needs.', tab: 'production' };
  if (!p.edit.pictureLocked) return { text: 'Production is underway. Follow progress and the edit.', tab: p.edit.assembly ? 'edit' : 'production' };
  if (!p.delivered) return { text: 'Finish post-production and deliver.', tab: 'edit' };
  if (!p.releases.length) return { text: 'Plan a release or enter festivals.', tab: 'release' };
  return { text: 'Follow your release, festivals and awards.', tab: 'festivals' };
}

function Overview({ p }: { p: Project }) {
  const g = useGame();
  const t = ledgerTotals(p);
  const mods = [...projectModules(p)] as ModuleId[];
  const issues = scriptIssues(p);
  const ns = nextStep(p);
  const [shelving, setShelving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="card-grid">
      {shelving && (
        <Modal title="Shelve The Project" onClose={() => setShelving(false)} footer={<><button className="btn" onClick={() => setShelving(false)}>Keep Working On It</button><button className="btn btn-danger" onClick={() => { setErr(store.act((s) => shelveProject(s, p))); setShelving(false); }}>Shelve The Project</button></>}>
          <ul>{shelveImpact(g, p).map((x) => <li key={x}>{x}</li>)}</ul>
        </Modal>
      )}
      {p.shelved ? (
        <section className="card">
          <h2>Shelved</h2>
          <p>You shelved this project on {longLocal(p.shelved.at, getPlace(g.locationId).zone).date}. Its people were released and its shoot days cancelled; what you agreed with backers still stands.</p>
          <button className="btn btn-primary" onClick={() => setErr(store.act((s) => resumeProject(s, p)))}>Take It Up Again</button>
          {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
        </section>
      ) : (
      <section className="card">
        <h2>Next Step</h2>
        <p>{ns.text}</p>
        <button className="btn btn-primary" onClick={() => { store.route = { ...store.route, tab: ns.tab }; store.emit(); }}>Open {TABS.find((x) => x.id === ns.tab)?.label}</button>
        {!p.delivered && <p style={{ marginTop: 'var(--s3)' }}><button className="btn btn-sm" onClick={() => setShelving(true)}>Shelve The Project</button></p>}
        {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      </section>
      )}
      {p.delivered && (
        <section className="card" aria-labelledby="continue-h">
          <h2 id="continue-h">{p.episodes.length > 1 ? 'Another Season' : 'A Sequel'}</h2>
          {p.renewal && <p>{p.renewal.reason} <span className="dim">Decided {longLocal(p.renewal.decidedAt, getPlace(g.locationId).zone).date}.</span></p>}
          {p.continuedBy ? (
            <p>Continued in <button className="btn btn-ghost" style={{ padding: 0 }} onClick={() => store.go({ view: 'project', projectId: p.continuedBy!, tab: 'overview' })}>{g.projects.find((x) => x.id === p.continuedBy)?.title ?? 'its continuation'}</button>.</p>
          ) : (
            <>
              <p className="dim">The characters, their designs, the world and any threads left open carry over, with finished puppets, models and rigs. Nobody returns automatically: you ask people back and pay them again, and raise the money again{p.renewal?.outcome === 'renewed' ? ', starting with the commissioner\'s offer' : ''}.</p>
              {canContinue(p) && <p className="dim">{canContinue(p)}</p>}
              <button className="btn btn-primary" disabled={!!canContinue(p)} onClick={() => setErr(store.act((s) => { const next = continueProject(s, p); store.go({ view: 'project', projectId: next.id, tab: 'overview' }); }))}>{p.episodes.length > 1 ? 'Start The Next Season' : 'Start A Sequel'}</button>
            </>
          )}
        </section>
      )}
      <section className="card">
        <h2>Project</h2>
        <dl className="kv">
          <dt>Started</dt><dd>{longLocal(p.createdAt, getPlace(g.locationId).zone).date}</dd>
          {(() => {
            // A project made from a proposal says whose, and which earlier work earned it (opportunities.ts).
            const o = (g.opportunities ?? []).find((x) => x.projectId === p.id);
            return o ? <><dt>Proposed By</dt><dd>{o.commissioner}, after {g.projects.find((x) => x.id === o.fromProjectId)?.title ?? 'your earlier work'}</dd></> : null;
          })()}
          <dt>Genres</dt><dd>{projectGenreLabel(p) || 'None chosen'}</dd>
          <dt>Audience</dt><dd>{p.axes.audience}</dd>
          <dt>Story Era</dt><dd>{p.axes.storyEra}</dd>
          <dt>Dialogue</dt><dd>{p.axes.dialogueLanguages.map(languageName).join(', ')}</dd>
          <dt>Based In</dt><dd>{placeLabel(getPlace(p.axes.basePlaceId))}</dd>
          {p.axes.settingPlaceId && <><dt>Set In</dt><dd>{placeLabel(getPlace(p.axes.settingPlaceId))}</dd></>}
          <dt>Approvals</dt><dd>{approvalRights(p).length ? approvalRights(p).join(', ') : 'You have full creative approval.'}</dd>
        </dl>
      </section>
      <section className="card">
        <h2>Money</h2>
        <dl className="kv">
          <dt>Budget Estimate</dt><dd>{money(financeSummary(p).estimate)}</dd>
          <dt>Promised By Backers</dt><dd>{money(financeSummary(p).promised)}</dd>
          <dt>Received</dt><dd>{money(t.fund)}</dd>
          <dt>Spent</dt><dd>{money(t.settled)}</dd>
          <dt>Committed</dt><dd>{money(t.committedOutstanding + t.reserved)}</dd>
          <dt>Uncommitted</dt><dd>{money(t.available)}</dd>
        </dl>
      </section>
      <section className="card">
        <h2>Script</h2>
        <p>{plural(p.scenes.length, 'scene')}, {plural(p.characters.length, 'character')}, {plural(p.drafts.length, 'saved draft')}.{p.approvedDraft ? ` Draft ${p.approvedDraft} is approved.` : ''}{p.revisionPasses ? ` ${plural(p.revisionPasses, 'revision pass', 'revision passes')} finished.` : ''}</p>
        <p className="muted">{issues.filter((i) => i.severity === 'blocking').length ? `${plural(issues.filter((i) => i.severity === 'blocking').length, 'issue')} must be fixed before approval.` : 'Nothing blocks approval.'} {plural(issues.filter((i) => i.severity === 'note').length, 'note')} to consider.</p>
        {mods.length > 0 && <p className="chip-row">{mods.map((m) => <span key={m} className="chip chip-accent">{MODULE_LABELS[m]}</span>)}</p>}
      </section>
      {p.quality && (
        <section className="card">
          <h2>How It Turned Out</h2>
          <p>Overall: {qualityWords(p.quality.overall)}. Script: {qualityWords(p.quality.script)}. Direction: {qualityWords(p.quality.direction)}. Craft: {qualityWords(p.quality.craft)}.</p>
          <p className="dim">These are the game's assessments of what you made and how it was made, not a measure of artistic merit.</p>
        </section>
      )}
      <section className="card">
        <h2>History</h2>
        <ul className="list">{[...p.history].reverse().slice(0, 8).map((h, i) => <li key={i}>{h.text} <span className="dim">{longLocal(h.at, getPlace(g.locationId).zone).date}</span></li>)}</ul>
      </section>
      {g.log.some((l) => l.projectId === p.id) && (
        <section className="card">
          <h2>Recent Updates</h2>
          <ul className="list">{g.log.filter((l) => l.projectId === p.id).slice(0, 6).map((l) => <li key={l.id}>{l.text} <span className="dim">{longLocal(l.at, getPlace(g.locationId).zone).date}</span></li>)}</ul>
        </section>
      )}
      {isNonfiction(p.axes.format) && <p className="dim">Documentary projects use research, contributors and facts instead of scripted dialogue.</p>}
      {g.projects.length > 1 && <p className="dim">Other projects can conflict with this one's shoot days.</p>}
    </div>
  );
}

export { Check };
