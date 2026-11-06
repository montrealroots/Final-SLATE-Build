import { useState } from 'react';
import { languageName } from '../data/identity';
import {
  MODULE_LABELS, TECHNIQUE_LABELS, addCharacter, addNote, addScene, applyDesignChange, approveDraft, composeGenres, deleteScene, describeImpact,
  designChangeImpact, diffDrafts, formatDuration, isEpisodic, isNonfiction, moveScene, newId, ordinal, projectModules, removeCharacter,
  removeCharacterImpact, renameDraft, restoreDraft, revisionDurationHours, saveDraft, sceneDeleteImpact, sceneLabel, scriptIssues, setNoteStatus,
  startRevision, updateCharacter, updateScene, workingCopyDiffersFromLatestDraft, requestConsent, type ModuleId,
} from '../engine';
import type { Entity, NarrativeFunction, PerformanceMethod, Project, Realization, RevisionNote, RoleSize, Scene, StoryCharacter, Technique } from '../engine/types';
import { Check, Modal, NumberField, SelectField, TextField, plural } from './components';
import { store, useGame } from './store';

const undoStack = new Map<string, string[]>();
function snapshot(p: Project) {
  const st = undoStack.get(p.id) ?? [];
  st.push(JSON.stringify({ scenes: p.scenes, characters: p.characters, story: p.story, setups: p.setups, worldRules: p.worldRules, relationships: p.relationships, evidence: p.evidence, contributors: p.contributors, genreNotes: p.genreNotes }));
  if (st.length > 30) st.shift();
  undoStack.set(p.id, st);
}
function edit(p: Project, fn: () => void): string | null {
  return store.act(() => {
    snapshot(p);
    fn();
  });
}

const MODULE_HELP: Partial<Record<ModuleId, string>> = {
  'world-rules': 'Rules you set are checked for continuity across scenes.',
  clues: 'Clues become hero props and must be planted before they pay off.',
  setups: 'Setups and payoffs are checked for order and resolution.',
  action: 'Stunt scenes get rehearsal days and need a stunt coordinator.',
  creature: 'Nonhuman characters need a realization method, which creates build work.',
  music: 'Songs create recording work, and licensed songs need clearances.',
  period: 'A period setting adds research and more wardrobe work.',
  factual: 'Claims need sources and checking before delivery.',
  relationships: 'Record how central relationships change.',
  threat: 'Plan reveals so the threat lands in the right order.',
  journey: 'More places mean more company moves on the schedule.',
  scale: 'Crowds need background casting on set or crowd effects in animation.',
  tonal: 'Each scene records its tonal intention.',
  formal: 'Deliberate discontinuities are allowed where you mark them.',
  combat: 'Fights need a fight choreographer as well as stunt safety.',
  vehicles: 'Picture vehicles need a vehicle coordinator.',
  audience: 'The audience decides which festival and award categories fit.',
  anthology: 'Each episode is its own story with its own characters.',
  concert: 'Performances need multi-camera coverage and recorded sound.',
  documentary: 'Interviews, actuality and archive replace scripted dialogue.',
  presentation: 'The presentation rules apply to every scene.',
  competition: 'Competitions need event coverage and crowds.',
  'animation-medium': 'This label routes the project to animation production.',
};

export function ScriptTab({ p }: { p: Project }) {
  useGame();
  const [err, setErr] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState('');
  const [compare, setCompare] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Scene | null>(null);
  const [renaming, setRenaming] = useState<{ number: number; label: string } | null>(null);
  const [renameErr, setRenameErr] = useState<string | null>(null);
  const mods = projectModules(p);
  const nonfiction = isNonfiction(p.axes.format);
  const issues = scriptIssues(p);
  const blocking = issues.filter((i) => i.severity === 'blocking');
  const notes = issues.filter((i) => i.severity === 'note');
  const { questions } = composeGenres(p.axes.genres.map((x) => x.id));
  const locked = !!p.delivered;
  const changed = workingCopyDiffersFromLatestDraft(p);
  const undo = () => {
    const st = undoStack.get(p.id);
    const last = st?.pop();
    if (!last) return;
    store.act(() => Object.assign(p, JSON.parse(last)));
  };
  return (
    <>
      {locked && <div className="alert info"><p>This project has been delivered. The script is locked.</p></div>}
      {err && <div className="alert bad" role="alert"><p>{err}</p></div>}
      <div className="btn-row" style={{ marginBottom: 16 }}>
        <button className="btn" disabled={!undoStack.get(p.id)?.length || locked} onClick={undo}>Undo Last Change</button>
      </div>
      <section className="panel">
        <h2>{nonfiction ? 'Subject And Approach' : 'Story'}</h2>
        <div className="grid2">
          {nonfiction && <TextField label="Central Question" multiline value={p.story.question} onChange={(v) => edit(p, () => (p.story.question = v))} />}
          <TextField label="Logline" multiline value={p.story.logline} maxLength={300} onChange={(v) => edit(p, () => (p.story.logline = v))} />
          <TextField label="Premise" multiline value={p.story.premise} onChange={(v) => edit(p, () => (p.story.premise = v))} />
          <TextField label="Stakes" multiline value={p.story.stakes} onChange={(v) => edit(p, () => (p.story.stakes = v))} />
          <TextField label="Central Conflict" multiline value={p.story.conflict} onChange={(v) => edit(p, () => (p.story.conflict = v))} />
          <TextField label="Point Of View" value={p.story.viewpoint} onChange={(v) => edit(p, () => (p.story.viewpoint = v))} />
          <TextField label="Theme" value={p.story.theme} onChange={(v) => edit(p, () => (p.story.theme = v))} />
          <TextField label="Intended Ending" multiline value={p.story.ending} onChange={(v) => edit(p, () => (p.story.ending = v))} />
          <TextField label="Intended Experience" multiline value={p.story.intendedExperience} onChange={(v) => edit(p, () => (p.story.intendedExperience = v))} />
        </div>
      </section>

      {(questions.length > 0 || mods.size > 0) && (
        <section className="panel">
          <h2>Genre Conventions</h2>
          {mods.size > 0 && (
            <ul className="list">{[...mods].map((m) => <li key={m}><strong>{MODULE_LABELS[m]}</strong>: <span className="muted">{MODULE_HELP[m]}</span></li>)}</ul>
          )}
          <div className="grid2 spaced">
            {questions.map((q) => (
              <TextField key={q.key} label={q.label} multiline hint={`For ${q.genres.join(' and ')}. Optional; you can subvert it.`} value={p.genreNotes[q.key] ?? ''} onChange={(v) => edit(p, () => (p.genreNotes[q.key] = v))} />
            ))}
          </div>
        </section>
      )}

      {(mods.has('world-rules') || p.axes.format === 'unscripted-series') && <WorldRules p={p} title={p.axes.format === 'unscripted-series' ? 'Format Rules' : 'Story World Rules'} />}
      {(mods.has('clues') || mods.has('setups') || mods.has('threat') || p.setups.length > 0) && <Setups p={p} />}
      {(mods.has('relationships') || p.relationships.length > 0) && <Relationships p={p} />}
      {(nonfiction || mods.has('factual')) && <Facts p={p} />}

      <section className="panel">
        <div className="btn-row spread"><h2 style={{ margin: 0 }}>Scenes</h2><span className="muted">{plural(p.scenes.length, 'scene')}, about {Math.round(p.scenes.reduce((a, s) => a + s.estMinutes, 0))} minutes</span></div>
        {Array.from({ length: p.axes.episodeCount }, (_, i) => i + 1).map((ep) => (
          <div key={ep} className="spaced">
            {isEpisodic(p.axes.format) && <h3>{p.episodes[ep - 1]?.title ?? `Episode ${ep}`}</h3>}
            {p.scenes.filter((s) => s.episode === ep).map((s) => (
              <SceneCard key={s.id} p={p} s={s} onDelete={() => { const imp = sceneDeleteImpact(p, s.id); if (imp.length) setDeleting(s); else setErr(edit(p, () => deleteScene(p, s.id))); }} />
            ))}
            <button className="btn" disabled={locked} onClick={() => setErr(edit(p, () => { addScene(store.state!, p, ep); }))}>{nonfiction ? 'Add Sequence' : 'Add Scene'}{isEpisodic(p.axes.format) ? ` To Episode ${ep}` : ''}</button>
          </div>
        ))}
      </section>

      <section className="panel">
        <h2>Readiness</h2>
        {blocking.length ? (
          <>
            <p>These must be fixed before a draft can be approved:</p>
            <ul>{blocking.map((i, k) => <li key={k} style={{ color: 'var(--negative)' }}>{i.text}</li>)}</ul>
          </>
        ) : <p>Nothing blocks approval.</p>}
        {notes.length > 0 && (
          <details>
            <summary>{plural(notes.length, 'note')} to consider</summary>
            <ul>{notes.map((i, k) => <li key={k}>{i.text}</li>)}</ul>
          </details>
        )}
      </section>

      <section className="panel">
        <h2>Drafts</h2>
        {changed && p.drafts.length > 0 && <p className="muted">You have changes since your last saved draft.</p>}
        <div className="inline-form">
          <TextField label="Draft Name" value={draftLabel} maxLength={60} hint="Optional." onChange={setDraftLabel} />
          <button className="btn btn-primary" disabled={locked || (!changed && p.drafts.length > 0)} onClick={() => { setErr(edit(p, () => { saveDraft(store.state!, p, draftLabel); })); setDraftLabel(''); }}>Save Draft</button>
        </div>
        <ul className="list spaced">
          {[...p.drafts].reverse().map((d) => (
            <li key={d.number}>
              <div className="row">
                <div className="grow">
                  <strong>{d.label}</strong> {d.approved && <span className="chip good">Approved</span>}
                  <div className="dim">{d.summary || 'First draft.'}</div>
                </div>
                <div className="btn-row">
                  <button className="btn btn-small" onClick={() => setCompare(d.number)}>Compare With Working Copy</button>
                  <button className="btn btn-small" disabled={locked} onClick={() => setErr(edit(p, () => restoreDraft(p, d.number)))}>Restore This Draft</button>
                  <button className="btn btn-small" disabled={locked} onClick={() => setRenaming({ number: d.number, label: d.label })}>Rename Draft</button>
                  {!d.approved && <button className="btn btn-small btn-primary" disabled={locked} onClick={() => setErr(store.act((s) => { approveDraft(s, p, d.number); }))}>Approve This Draft</button>}
                </div>
              </div>
            </li>
          ))}
        </ul>
        {!p.drafts.length && <p className="muted">No drafts saved yet. Approving a draft turns it into a production plan.</p>}
        {p.approvedDraft !== null && changed && <p className="dim">Changes after approval take effect when you save and approve a new draft. Finished production work is kept.</p>}
      </section>

      <Notes p={p} />

      {compare !== null && (
        <Modal title={`Compare Draft ${compare}`} onClose={() => setCompare(null)} footer={<button className="btn btn-primary" onClick={() => setCompare(null)}>Close</button>}>
          {(() => {
            const d = p.drafts.find((x) => x.number === compare)!;
            const diff = diffDrafts(d, { scenes: p.scenes, characters: p.characters });
            return <ul>{diff.map((x, i) => <li key={i}>{x}</li>)}</ul>;
          })()}
        </Modal>
      )}
      {renaming && (
        <Modal title="Rename Draft" onClose={() => setRenaming(null)} footer={<>
          <button className="btn" onClick={() => setRenaming(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { const e = store.act(() => renameDraft(p, renaming.number, renaming.label)); setRenameErr(e); if (!e) setRenaming(null); }}>Rename Draft</button>
        </>}>
          <TextField label="Draft Name" value={renaming.label} maxLength={60} error={renameErr} onChange={(v) => setRenaming({ ...renaming, label: v })} />
        </Modal>
      )}
      {deleting && (
        <Modal title="Delete This Scene?" onClose={() => setDeleting(null)} footer={<>
          <button className="btn btn-danger" onClick={() => { setErr(edit(p, () => deleteScene(p, deleting.id))); setDeleting(null); }}>Delete Scene</button>
          <button className="btn btn-primary" onClick={() => setDeleting(null)}>Keep Scene</button>
        </>}>
          <ul>{sceneDeleteImpact(p, deleting.id).map((x, i) => <li key={i}>{x}</li>)}</ul>
          <p>You can undo this until you leave the game.</p>
        </Modal>
      )}
    </>
  );
}

function listText(xs: string[]): string {
  return xs.join(', ');
}
function parseList(v: string): string[] {
  return v.split(',').map((x) => x.trim()).filter(Boolean);
}

function SceneCard({ p, s, onDelete }: { p: Project; s: Scene; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const mods = projectModules(p);
  const nonfiction = isNonfiction(p.axes.format);
  const locked = !!p.delivered;
  const up = (patch: Partial<Scene>) => setErr(edit(p, () => { updateScene(p, s.id, patch); }));
  const label = sceneLabel(p, s);
  return (
    <article className="scene-card" aria-label={label}>
      <div className="row">
        <div className="grow">
          <h3>{label}</h3>
          <p className="dim" style={{ margin: 0 }}>{s.heading.intExt}. {s.heading.place || 'No place yet'} – {s.heading.time} · {s.estMinutes} min{s.participants.length ? ` · ${s.participants.map((c) => p.characters.find((x) => x.id === c)?.name).filter(Boolean).join(', ')}` : ''}</p>
        </div>
        <div className="btn-row">
          <button className="btn btn-small" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Close Scene' : 'Edit Scene'}</button>
          <button className="btn btn-small" disabled={locked} aria-label={`Move ${label} Up`} onClick={() => edit(p, () => moveScene(p, s.id, -1))}>Move Up</button>
          <button className="btn btn-small" disabled={locked} aria-label={`Move ${label} Down`} onClick={() => edit(p, () => moveScene(p, s.id, 1))}>Move Down</button>
          <button className="btn btn-small btn-danger" disabled={locked} aria-label={`Delete ${label}`} onClick={onDelete}>Delete</button>
        </div>
      </div>
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      {open && (
        <fieldset disabled={locked} style={{ border: 0, padding: 0, margin: '12px 0 0' }}>
          <div className="grid3">
            <SelectField label="Interior Or Exterior" value={s.heading.intExt} options={[{ value: 'INT', label: 'Interior' }, { value: 'EXT', label: 'Exterior' }, { value: 'INT/EXT', label: 'Interior And Exterior' }]} onChange={(v) => up({ heading: { ...s.heading, intExt: v } })} />
            <TextField label="Place" value={s.heading.place} maxLength={80} onChange={(v) => up({ heading: { ...s.heading, place: v }, storyLocation: s.storyLocation && s.storyLocation !== s.heading.place ? s.storyLocation : v })} />
            <SelectField label="Time Of Day" value={s.heading.time} options={(['DAY', 'NIGHT', 'DAWN', 'DUSK'] as const).map((t) => ({ value: t, label: t.charAt(0) + t.slice(1).toLowerCase() }))} onChange={(v) => up({ heading: { ...s.heading, time: v } })} />
            <NumberField label="Estimated Minutes" value={s.estMinutes} min={0.5} max={60} step={0.5} onChange={(v) => up({ estMinutes: v })} />
            {nonfiction && <SelectField label="Kind" value={s.kind} options={[{ value: 'interview', label: 'Interview' }, { value: 'actuality', label: 'Actuality' }, { value: 'archival', label: 'Archive' }, { value: 'narration', label: 'Narration' }, { value: 'reconstruction', label: 'Reconstruction' }, { value: 'segment', label: 'Segment' }]} onChange={(v) => up({ kind: v })} />}
            {nonfiction && <SelectField label="Basis" value={s.basis} options={[{ value: 'sourced', label: 'Sourced Fact' }, { value: 'dramatized', label: 'Dramatized' }, { value: 'invented', label: 'Invented' }]} onChange={(v) => up({ basis: v })} />}
            {(p.axes.medium === 'hybrid' || p.axes.technique === 'mixed') && (
              <SelectField label="Technique For This Scene" value={(s.technique ?? 'none') as Technique} options={[{ value: 'none' as Technique, label: p.axes.medium === 'hybrid' ? 'Live Action' : 'Project Default' }, ...(['2d-drawn', '2d-rigged', '3d-cg', 'stop-motion', 'rotoscope'] as Technique[]).map((t) => ({ value: t, label: TECHNIQUE_LABELS[t] }))]} onChange={(v) => up({ technique: v })} />
            )}
            {mods.has('tonal') && <TextField label="Tonal Intention" value={s.tone ?? ''} onChange={(v) => up({ tone: v })} />}
            {p.axes.genres.some((g) => g.id === 'found-footage') && <TextField label="Who Is Recording" value={s.operator ?? ''} onChange={(v) => up({ operator: v })} />}
          </div>
          {!nonfiction || s.kind === 'reconstruction' ? (
            <fieldset style={{ border: 0, padding: 0 }}>
              <legend style={{ fontWeight: 600 }}>Characters In The Scene</legend>
              <div className="chips">
                {p.characters.map((c) => <Check key={c.id} label={c.name} checked={s.participants.includes(c.id)} onChange={(v) => up({ participants: v ? [...s.participants, c.id] : s.participants.filter((x) => x !== c.id) })} />)}
                {!p.characters.length && <p className="muted">Add characters in the Characters section.</p>}
              </div>
            </fieldset>
          ) : (
            <fieldset style={{ border: 0, padding: 0 }}>
              <legend style={{ fontWeight: 600 }}>Contributors</legend>
              <div className="chips">
                {p.contributors.map((c) => <Check key={c.id} label={c.name} checked={s.contributorIds.includes(c.id)} onChange={(v) => up({ contributorIds: v ? [...s.contributorIds, c.id] : s.contributorIds.filter((x) => x !== c.id) })} />)}
                {!p.contributors.length && <p className="muted">Add contributors under Facts And Contributors.</p>}
              </div>
              {p.evidence.length > 0 && (
                <>
                  <legend style={{ fontWeight: 600 }}>Facts Shown</legend>
                  <div className="chips">{p.evidence.map((e) => <Check key={e.id} label={e.claim.slice(0, 50)} checked={s.evidenceIds.includes(e.id)} onChange={(v) => up({ evidenceIds: v ? [...s.evidenceIds, e.id] : s.evidenceIds.filter((x) => x !== e.id) })} />)}</div>
                </>
              )}
            </fieldset>
          )}
          <div className="grid2">
            <TextField label="Objective" multiline value={s.objective} onChange={(v) => up({ objective: v })} />
            <TextField label={nonfiction ? 'What Happens' : 'Action'} multiline value={s.action} onChange={(v) => up({ action: v })} />
            <TextField label="Turning Point" multiline value={s.turningPoint} onChange={(v) => up({ turningPoint: v })} />
          </div>
          {!nonfiction && <Dialogue p={p} s={s} up={up} />}
          <h4>Production Needs</h4>
          <p className="dim">These drive the breakdown. Nothing is guessed from the text above.</p>
          <div className="grid3">
            <TextField label="Props" hint="Separate with commas." value={listText(s.props)} onChange={(v) => up({ props: parseList(v) })} />
            <TextField label="Animals" hint="Separate with commas." value={listText(s.animals)} onChange={(v) => up({ animals: parseList(v) })} />
            <TextField label="Vehicles" hint="Separate with commas." value={listText(s.vehicles)} onChange={(v) => up({ vehicles: parseList(v) })} />
            <TextField label="Stunts" hint="Describe the stunt, or leave blank." value={s.stunts} onChange={(v) => up({ stunts: v })} />
            <NumberField label="Crowd Size" value={s.crowd} min={0} max={5000} onChange={(v) => up({ crowd: Number.isFinite(v) ? Math.round(v) : 0 })} />
            <TextField label="Visual Effects" hint="Separate with commas." value={listText(s.vfx)} onChange={(v) => up({ vfx: parseList(v) })} />
            <TextField label="Songs" hint="Separate with commas. Mark licensed songs below." value={listText(s.songs.map((x) => x.title))} onChange={(v) => up({ songs: parseList(v).map((t) => ({ title: t, licensed: s.songs.find((x) => x.title === t)?.licensed ?? false })) })} />
          </div>
          <div className="chips">
            {s.songs.map((song) => <Check key={song.title} label={`${song.title} Is Licensed`} checked={song.licensed} onChange={(v) => up({ songs: s.songs.map((x) => (x.title === song.title ? { ...x, licensed: v } : x)) })} />)}
            <Check label="Dance" checked={s.dance} onChange={(v) => up({ dance: v })} />
            <Check label="Intimate Scene" checked={s.intimacy} onChange={(v) => up({ intimacy: v })} />
            <Check label="Water Work" checked={s.water} onChange={(v) => up({ water: v })} />
            {mods.has('formal') && <Check label="Intentional Discontinuity" hint="Continuity checks treat breaks here as deliberate." checked={s.intentionalDiscontinuity} onChange={(v) => up({ intentionalDiscontinuity: v })} />}
          </div>
        </fieldset>
      )}
    </article>
  );
}

function Dialogue({ p, s, up }: { p: Project; s: Scene; up: (patch: Partial<Scene>) => void }) {
  const [who, setWho] = useState(s.participants[0] ?? '');
  const [text, setText] = useState('');
  return (
    <div>
      <h4>Dialogue</h4>
      <ul className="list">
        {s.dialogue.map((d) => (
          <li key={d.id} className="row">
            <span className="grow"><strong>{p.characters.find((c) => c.id === d.characterId)?.name ?? 'Unknown'}</strong>{p.axes.dialogueLanguages.length > 1 ? ` (${languageName(d.language)})` : ''}: {d.text}</span>
            <button className="btn btn-small" onClick={() => up({ dialogue: s.dialogue.filter((x) => x.id !== d.id) })}>Remove Line</button>
          </li>
        ))}
      </ul>
      {s.participants.length > 0 ? (
        <div className="inline-form">
          <SelectField label="Speaker" value={who || s.participants[0]} options={s.participants.map((c) => ({ value: c, label: p.characters.find((x) => x.id === c)?.name ?? c }))} onChange={setWho} />
          <TextField label="Line" value={text} onChange={setText} />
          <button className="btn" disabled={!text.trim()} onClick={() => {
            up({ dialogue: [...s.dialogue, { id: newId(store.state!, 'dl'), characterId: who || s.participants[0], text: text.trim(), language: p.characters.find((c) => c.id === (who || s.participants[0]))?.languages[0] ?? p.axes.dialogueLanguages[0] }] });
            setText('');
          }}>Add Line</button>
        </div>
      ) : <p className="muted">Add characters to the scene to write dialogue.</p>}
    </div>
  );
}

function WorldRules({ p, title }: { p: Project; title: string }) {
  const [rule, setRule] = useState('');
  const [limit, setLimit] = useState('');
  return (
    <section className="panel">
      <h2>{title}</h2>
      <ul className="list">{p.worldRules.map((r) => <li key={r.id} className="row"><span className="grow"><strong>{r.rule}</strong>{r.limit ? <span className="muted"> Limit or cost: {r.limit}</span> : null}</span><button className="btn btn-small" onClick={() => edit(p, () => (p.worldRules = p.worldRules.filter((x) => x.id !== r.id)))}>Remove</button></li>)}</ul>
      <div className="inline-form">
        <TextField label="Rule" value={rule} onChange={setRule} />
        <TextField label="Limit Or Cost" value={limit} onChange={setLimit} />
        <button className="btn" disabled={!rule.trim()} onClick={() => { edit(p, () => p.worldRules.push({ id: newId(store.state!, 'wr'), rule: rule.trim(), limit: limit.trim() })); setRule(''); setLimit(''); }}>Add Rule</button>
      </div>
    </section>
  );
}

function Setups({ p }: { p: Project }) {
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<'clue' | 'setup' | 'foreshadowing' | 'gag' | 'reveal'>('setup');
  const sceneOpts = [{ value: '', label: 'Not Yet' }, ...p.scenes.map((s) => ({ value: s.id, label: sceneLabel(p, s) }))];
  return (
    <section className="panel">
      <h2>Setups, Clues And Reveals</h2>
      <ul className="list">
        {p.setups.map((sp) => (
          <li key={sp.id}>
            <div className="row"><strong className="grow">{sp.label} <span className="chip">{sp.kind.charAt(0).toUpperCase() + sp.kind.slice(1)}</span></strong><button className="btn btn-small" onClick={() => edit(p, () => (p.setups = p.setups.filter((x) => x.id !== sp.id)))}>Remove</button></div>
            <div className="grid2">
              <SelectField label="Planted In" value={sp.plantedIn ?? ''} options={sceneOpts} onChange={(v) => edit(p, () => (sp.plantedIn = v || null))} />
              <SelectField label="Pays Off In" value={sp.paidIn ?? ''} options={sceneOpts} onChange={(v) => edit(p, () => (sp.paidIn = v || null))} />
            </div>
          </li>
        ))}
      </ul>
      <div className="inline-form">
        <TextField label="What Is Set Up" value={label} onChange={setLabel} />
        <SelectField label="Kind" value={kind} options={[{ value: 'setup', label: 'Setup' }, { value: 'clue', label: 'Clue' }, { value: 'foreshadowing', label: 'Foreshadowing' }, { value: 'gag', label: 'Gag' }, { value: 'reveal', label: 'Reveal' }]} onChange={setKind} />
        <button className="btn" disabled={!label.trim()} onClick={() => { edit(p, () => p.setups.push({ id: newId(store.state!, 'sp'), kind, label: label.trim(), plantedIn: null, paidIn: null })); setLabel(''); }}>Add Setup</button>
      </div>
    </section>
  );
}

function Relationships({ p }: { p: Project }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [kind, setKind] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const opts = [{ value: '', label: 'Choose A Character' }, ...p.characters.map((c) => ({ value: c.id, label: c.name }))];
  return (
    <section className="panel">
      <h2>Relationships</h2>
      <ul className="list">{p.relationships.map((r) => <li key={r.id} className="row"><span className="grow">{p.characters.find((c) => c.id === r.a)?.name} and {p.characters.find((c) => c.id === r.b)?.name}: {r.kind}. {r.start ? `Starts: ${r.start}. ` : ''}{r.end ? `Ends: ${r.end}.` : ''}</span><button className="btn btn-small" onClick={() => edit(p, () => (p.relationships = p.relationships.filter((x) => x.id !== r.id)))}>Remove</button></li>)}</ul>
      <div className="grid3">
        <SelectField label="First Character" value={a} options={opts} onChange={setA} />
        <SelectField label="Second Character" value={b} options={opts} onChange={setB} />
        <TextField label="Relationship" value={kind} onChange={setKind} />
        <TextField label="Where It Starts" value={start} onChange={setStart} />
        <TextField label="Where It Ends" value={end} onChange={setEnd} />
      </div>
      <button className="btn" disabled={!a || !b || a === b || !kind.trim()} onClick={() => { edit(p, () => p.relationships.push({ id: newId(store.state!, 'rel'), a, b, kind: kind.trim(), start, end })); setKind(''); setStart(''); setEnd(''); }}>Add Relationship</button>
    </section>
  );
}

function Facts({ p }: { p: Project }) {
  const [claim, setClaim] = useState('');
  const [status, setStatus] = useState<'established' | 'alleged' | 'dramatized' | 'unverified'>('unverified');
  const [source, setSource] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  return (
    <section className="panel">
      <h2>Facts And Contributors</h2>
      <h3>Facts</h3>
      <ul className="list">
        {p.evidence.map((e) => (
          <li key={e.id} className="row">
            <span className="grow">{e.claim} <span className="chip">{e.status.charAt(0).toUpperCase() + e.status.slice(1)}</span> {e.verified ? <span className="chip good">Checked</span> : e.status !== 'dramatized' ? <span className="chip warn">Not Checked</span> : null}<span className="dim"> {e.sourceNote}</span></span>
            <div className="btn-row">
              {!e.verified && e.status !== 'dramatized' && <button className="btn btn-small" disabled={!p.tasks.some((t) => t.kind === 'doc:factcheck' && t.status === 'done') && !p.tasks.some((t) => t.kind === 'doc:research' && t.status === 'done')} title="Available once research or fact checking is done." onClick={() => edit(p, () => (e.verified = true))}>Mark As Checked</button>}
              <button className="btn btn-small" onClick={() => edit(p, () => (p.evidence = p.evidence.filter((x) => x.id !== e.id)))}>Remove</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="grid3">
        <TextField label="Claim" value={claim} onChange={setClaim} />
        <SelectField label="Status" value={status} options={[{ value: 'established', label: 'Established' }, { value: 'alleged', label: 'Alleged' }, { value: 'unverified', label: 'Unverified' }, { value: 'dramatized', label: 'Dramatized' }]} onChange={setStatus} />
        <TextField label="Source Note" value={source} onChange={setSource} />
      </div>
      <button className="btn" disabled={!claim.trim()} onClick={() => { edit(p, () => p.evidence.push({ id: newId(store.state!, 'ev'), claim: claim.trim(), status, sourceNote: source.trim(), verified: false })); setClaim(''); setSource(''); }}>Add Fact</button>
      <h3 className="spaced">Contributors</h3>
      <ul className="list">
        {p.contributors.map((c) => (
          <li key={c.id} className="row">
            <span className="grow">{c.name}{c.role ? `, ${c.role}` : ''} <span className={`chip ${c.consent === 'given' ? 'good' : c.consent === 'declined' ? 'bad' : 'warn'}`}>{{ 'not-asked': 'Consent Not Requested', requested: 'Consent Requested', given: 'Consent Given', declined: 'Consent Declined' }[c.consent]}</span></span>
            <div className="btn-row">
              {c.consent === 'not-asked' && <button className="btn btn-small" onClick={() => store.act((s) => requestConsent(s, p, c.id))}>Request Consent</button>}
              <button className="btn btn-small" onClick={() => edit(p, () => (p.contributors = p.contributors.filter((x) => x.id !== c.id)))}>Remove</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="inline-form">
        <TextField label="Contributor Name" value={name} onChange={setName} />
        <TextField label="Who They Are" value={role} onChange={setRole} />
        <button className="btn" disabled={!name.trim()} onClick={() => { edit(p, () => p.contributors.push({ id: newId(store.state!, 'ct'), name: name.trim(), role: role.trim(), consent: 'not-asked' })); setName(''); setRole(''); }}>Add Contributor</button>
      </div>
    </section>
  );
}


function Notes({ p }: { p: Project }) {
  const g = useGame();
  const [text, setText] = useState('');
  const [area, setArea] = useState<RevisionNote['area']>('dialogue');
  const [err, setErr] = useState<string | null>(null);
  const accepted = p.notes.filter((n) => n.status === 'accepted');
  return (
    <section className="panel">
      <h2>Revision Notes</h2>
      <p className="muted">Accept notes you want to work on, then start a revision pass. Revisions take time.</p>
      {p.revision && <p className="alert info">Revision pass underway. It finishes in {formatDuration(p.revision.endsAt - g.now)}.</p>}
      <ul className="list">
        {p.notes.map((n) => (
          <li key={n.id} className="row">
            <span className="grow">{n.text} <span className="chip">{n.area.charAt(0).toUpperCase() + n.area.slice(1)}</span> <span className={`chip ${n.status === 'addressed' ? 'good' : n.status === 'rejected' ? 'bad' : ''}`}>{n.status.charAt(0).toUpperCase() + n.status.slice(1)}</span></span>
            {n.status !== 'addressed' && (
              <div className="btn-row">
                {n.status !== 'accepted' && <button className="btn btn-small" onClick={() => store.act(() => setNoteStatus(p, n.id, 'accepted'))}>Accept Note</button>}
                {n.status !== 'rejected' && <button className="btn btn-small" onClick={() => store.act(() => setNoteStatus(p, n.id, 'rejected'))}>Reject Note</button>}
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="inline-form">
        <TextField label="Note" value={text} onChange={setText} />
        <SelectField label="Area" value={area} options={(['characterization', 'causality', 'structure', 'pacing', 'dialogue', 'visual', 'continuity'] as const).map((a) => ({ value: a, label: a.charAt(0).toUpperCase() + a.slice(1) }))} onChange={setArea} />
        <button className="btn" disabled={!text.trim()} onClick={() => { setErr(store.act((s) => void addNote(s, p, text, area, null))); setText(''); }}>Add Note</button>
      </div>
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      <button className="btn btn-primary spaced" disabled={!accepted.length || !!p.revision || !!p.delivered} onClick={() => setErr(store.act((s) => void startRevision(s, p)))}>
        Start Revision Pass{accepted.length ? ` (${plural(accepted.length, 'note')}, about ${revisionDurationHours(accepted.length)} hours)` : ''}
      </button>
    </section>
  );
}

// ---------------- Characters ----------------

const ROLE_SIZES: RoleSize[] = ['lead', 'co-lead', 'ensemble-lead', 'supporting', 'featured', 'background', 'cameo'];
const FUNCTIONS: NarrativeFunction[] = ['protagonist', 'antagonist', 'deuteragonist', 'ally', 'mentor', 'foil', 'rival', 'love-interest', 'narrator'];
const ENTITIES: Entity[] = ['human', 'animal', 'alien', 'robot', 'supernatural', 'monster', 'undead', 'anthropomorphic-object', 'custom'];
const METHODS: PerformanceMethod[] = ['on-camera', 'voice', 'motion-capture', 'suit', 'puppetry', 'animation', 'stunt'];
const REALIZATIONS: Realization[] = ['performer', 'prosthetics', 'suit', 'animatronic', 'cg', 'puppet', 'drawn'];
const title = (s: string) => s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const REAL_LABEL: Record<Realization, string> = { performer: 'Performer As They Are', prosthetics: 'Prosthetics And Makeup', suit: 'Creature Suit', animatronic: 'Animatronic', cg: 'Computer Generated', puppet: 'Puppet', drawn: 'Drawn Animation' };

export function CharactersTab({ p }: { p: Project }) {
  useGame();
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [removing, setRemoving] = useState<StoryCharacter | null>(null);
  const [impact, setImpact] = useState<string | null>(null);
  const locked = !!p.delivered;
  return (
    <>
      {err && <div className="alert bad" role="alert"><p>{err}</p></div>}
      {impact && (
        <div className="alert">
          <p>{describeImpact(designChangeImpact(p, impact))}</p>
          <div className="btn-row">
            <button className="btn btn-small" onClick={() => { setErr(store.act((s) => applyDesignChange(s, p, impact, false))); setImpact(null); }}>Keep Finished Shots</button>
            <button className="btn btn-small" onClick={() => { setErr(store.act((s) => applyDesignChange(s, p, impact, true))); setImpact(null); }}>Redo Finished Shots</button>
          </div>
        </div>
      )}
      <section className="panel">
        <div className="inline-form">
          <TextField label="Character Name" value={name} maxLength={80} onChange={setName} />
          <button className="btn btn-primary" disabled={locked} onClick={() => { const e = edit(p, () => void addCharacter(store.state!, p, name)); setErr(e); if (!e) setName(''); }}>Add Character</button>
        </div>
      </section>
      {p.characters.map((c) => <CharacterCard key={c.id} p={p} c={c} onRemove={() => { const imp = removeCharacterImpact(p, c.id); if (imp.length) setRemoving(c); else edit(p, () => removeCharacter(p, c.id)); }} onDesignChange={() => p.tasks.length > 0 && setImpact(c.id)} />)}
      {!p.characters.length && <div className="panel"><p>No characters yet.</p></div>}
      {removing && (
        <Modal title="Remove This Character?" onClose={() => setRemoving(null)} footer={<>
          <button className="btn btn-danger" onClick={() => { edit(p, () => removeCharacter(p, removing.id)); setRemoving(null); }}>Remove Character</button>
          <button className="btn btn-primary" onClick={() => setRemoving(null)}>Keep Character</button>
        </>}>
          <ul>{removeCharacterImpact(p, removing.id).map((x, i) => <li key={i}>{x}</li>)}</ul>
        </Modal>
      )}
    </>
  );
}

function CharacterCard({ p, c, onRemove, onDesignChange }: { p: Project; c: StoryCharacter; onRemove: () => void; onDesignChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const up = (patch: Partial<StoryCharacter>) => {
    let changed = false;
    const e = edit(p, () => { changed = updateCharacter(p, c.id, patch).designChanged; });
    setErr(e);
    if (!e && changed) onDesignChange();
  };
  const scenes = p.scenes.filter((s) => s.participants.includes(c.id)).length;
  return (
    <article className="panel" aria-label={c.name}>
      <div className="row">
        <div className="grow">
          <h2 style={{ marginBottom: 4 }}>{c.name}</h2>
          <p className="dim" style={{ margin: 0 }}>{title(c.roleSize)}{c.functions.length ? ` · ${c.functions.map(title).join(', ')}` : ''} · {title(c.entity)} · {c.methods.map(title).join(', ')} · {plural(scenes, 'scene')}</p>
        </div>
        <div className="btn-row">
          <button className="btn btn-small" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Close' : 'Edit Character'}</button>
          <button className="btn btn-small btn-danger" disabled={!!p.delivered} onClick={onRemove}>Remove</button>
        </div>
      </div>
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      {open && (
        <fieldset disabled={!!p.delivered} style={{ border: 0, padding: 0, marginTop: 12 }}>
          <div className="grid3">
            <TextField label="Name" value={c.name} onChange={(v) => up({ name: v })} />
            <SelectField label="Role Size" value={c.roleSize} options={ROLE_SIZES.map((r) => ({ value: r, label: title(r) }))} onChange={(v) => up({ roleSize: v })} />
            <SelectField label="Entity" value={c.entity} options={ENTITIES.map((r) => ({ value: r, label: title(r) }))} onChange={(v) => up({ entity: v })} />
            <SelectField label="Realized As" value={c.realization} options={REALIZATIONS.map((r) => ({ value: r, label: REAL_LABEL[r] }))} onChange={(v) => up({ realization: v })} />
            <TextField label="Age In Story" value={c.ageInStory} onChange={(v) => up({ ageInStory: v })} />
            <TextField label="Pronouns" value={c.pronouns} onChange={(v) => up({ pronouns: v })} />
            <SelectField label="Speaks" value={c.languages[0] ?? p.axes.dialogueLanguages[0]} options={p.axes.dialogueLanguages.map((l) => ({ value: l, label: languageName(l) }))} onChange={(v) => up({ languages: [v] })} />
            {isEpisodic(p.axes.format) && <SelectField label="Series Involvement" value={c.seriesInvolvement} options={[{ value: 'regular', label: 'Regular' }, { value: 'recurring', label: 'Recurring' }, { value: 'guest', label: 'Guest' }, { value: 'single', label: 'One Episode' }]} onChange={(v) => up({ seriesInvolvement: v })} />}
          </div>
          <fieldset style={{ border: 0, padding: 0 }}>
            <legend style={{ fontWeight: 600 }}>Story Functions</legend>
            <p className="dim">Independent of role size. A lead doesn't have to be the protagonist.</p>
            <div className="chips">{FUNCTIONS.map((f) => <Check key={f} label={title(f)} checked={c.functions.includes(f)} onChange={(v) => up({ functions: v ? [...c.functions, f] : c.functions.filter((x) => x !== f) })} />)}</div>
          </fieldset>
          <fieldset style={{ border: 0, padding: 0 }}>
            <legend style={{ fontWeight: 600 }}>Performance Methods</legend>
            <div className="chips">{METHODS.map((m) => <Check key={m} label={title(m)} checked={c.methods.includes(m)} onChange={(v) => up({ methods: v ? [...c.methods, m] : c.methods.filter((x) => x !== m) })} />)}</div>
          </fieldset>
          <div className="grid2">
            {c.entity !== 'human' && <TextField label="What Kind Of Being" multiline value={c.entityNote} onChange={(v) => up({ entityNote: v })} />}
            <TextField label="Description" multiline value={c.description} onChange={(v) => up({ description: v })} />
            <TextField label="Wants" multiline value={c.wants} onChange={(v) => up({ wants: v })} />
            <TextField label="Fears" multiline value={c.fears} onChange={(v) => up({ fears: v })} />
          </div>
        </fieldset>
      )}
    </article>
  );
}

export { ordinal };
