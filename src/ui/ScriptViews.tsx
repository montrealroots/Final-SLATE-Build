import { useState } from 'react';
import { languageName, searchEthnicities } from '../data/identity';
import { NATIONALITIES } from '../engine/identity';
import { countryName } from '../world/gazetteer/gazetteer';
import {
  MODULE_LABELS, TECHNIQUE_LABELS, addCharacter, addNote, addScene, noteFromIssue, applyDesignChange, approveDraft, composeGenres, deleteScene, describeImpact,
  designChangeImpact, diffDrafts, formatDuration, isEpisodic, isNonfiction, moveScene, newId, ordinal, projectModules, removeCharacter,
  removeCharacterImpact, renameDraft, restoreDraft, revisionDurationHours, saveDraft, sceneDeleteImpact, sceneLabel, scriptIssues, setNoteStatus,
  startRevision, updateCharacter, updateScene, workingCopyDiffersFromLatestDraft, requestConsent, approvedScenes, type ModuleId,
  requirementRemovalImpact, addResearch, removeResearch, updateResearch, resolutionLabel,
  approvalImpact, combineScenes, combineScenesImpact, duplicateScene, splitScene, splitSceneImpact, FAMILIES, setFamily, setupCompetition, unscriptedOf, withdrawRelease, type UnscriptedFamily,
} from '../engine';
import { addAct, addBeat, addThread, removeAct, removeBeat, removeThread, setSceneAct, updateThread } from '../engine/structure-edit';
// Loaded with this page, not at startup (the startup budget): the engine index leaves season.ts out.
import { moveEpisode, removeRelationship, removeWorldRule, reorderRefusal, setEpisodeArc, setEpisodeTitle, setSeasonArc, sharedFactImpact, sharedFactPreview, updateRelationship, updateWorldRule, type SharedFact } from '../engine/season';
import { RESTRICTION_WORDS } from '../engine/documentary';
import { CONTENT_ISSUES, audienceContentNote, characterPronouns, contentSuggestions, contentSummary, placementExplained, spokenMinutes } from '../engine/script-explain';
import type { ContentIssue, ContentLevel, Entity, NarrativeFunction, PerformanceMethod, Project, Realization, RevisionNote, RoleSize, Scene, StoryCharacter, Technique } from '../engine/types';
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
  const [approving, setApproving] = useState<{ number: number; impact: string[] } | null>(null);
  const [compare, setCompare] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Scene | null>(null);
  const [renaming, setRenaming] = useState<{ number: number; label: string } | null>(null);
  const [renameErr, setRenameErr] = useState<string | null>(null);
  const mods = projectModules(p);
  const nonfiction = isNonfiction(p.axes.format);
  const issues = scriptIssues(p);
  const blocking = issues.filter((i) => i.severity === 'blocking');
  const notes = issues.filter((i) => i.severity === 'note' && !i.advisory);
  const prompts = issues.filter((i) => i.severity === 'note' && i.advisory);
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
      {locked && <div className="callout callout-info"><p>This project has been delivered. The script is locked.</p></div>}
      {err && <div className="callout callout-negative" role="alert"><p>{err}</p></div>}
      <div className="row gap-2 wrap" style={{ marginBottom: 16 }}>
        <button className="btn" disabled={!undoStack.get(p.id)?.length || locked} onClick={undo}>Undo Last Change</button>
      </div>
      <section className="card">
        <h2>{nonfiction ? 'Subject And Approach' : 'Story'}</h2>
        <p className="dim">Your own words for the project. SLATE never reads them for meaning, and they never change the script's quality or how fast anyone answers. They are also the documents some people ask for by name, and an approach that includes one can't be sent until its fields are written: the Pitch (logline and premise) for backers, festival entry forms and distribution contracts; the Treatment (central conflict, point of view and intended ending) for a commissioner or a grant; the Statement Of Intent (theme and stakes{nonfiction ? ', and the central question' : ''}) for a grant. What they decide doesn't depend on what you wrote.</p>
        <div className="grid grid-2 form">
          {nonfiction && <TextField label="Central Question" multiline value={p.story.question} onChange={(v) => edit(p, () => (p.story.question = v))} />}
          <TextField label="Logline" multiline value={p.story.logline} maxLength={300} onChange={(v) => edit(p, () => (p.story.logline = v))} />
          <TextField label="Premise" multiline value={p.story.premise} onChange={(v) => edit(p, () => (p.story.premise = v))} />
          <TextField label="Stakes" multiline value={p.story.stakes} onChange={(v) => edit(p, () => (p.story.stakes = v))} />
          <TextField label="Central Conflict" multiline value={p.story.conflict} onChange={(v) => edit(p, () => (p.story.conflict = v))} />
          <TextField label="Point Of View" value={p.story.viewpoint} onChange={(v) => edit(p, () => (p.story.viewpoint = v))} />
          <TextField label="Theme" value={p.story.theme} onChange={(v) => edit(p, () => (p.story.theme = v))} />
          <TextField label="Intended Ending" multiline value={p.story.ending} onChange={(v) => edit(p, () => (p.story.ending = v))} />
          <TextField label="Intended Experience" multiline value={p.story.intendedExperience} onChange={(v) => edit(p, () => (p.story.intendedExperience = v))} />
          <TextField label="Tone" value={p.axes.tone} maxLength={80} onChange={(v) => edit(p, () => (p.axes.tone = v))} />
          <TextField label="Story Setting" maxLength={120} value={p.axes.storySetting} onChange={(v) => edit(p, () => (p.axes.storySetting = v))} />
          <SelectField label="Competes As" value={p.axes.register ?? ''} hint="Where awards that split drama from comedy enter it, as you declare it. Left to its genres, comedy and musical genres compete as comedy."
            options={[{ value: '', label: 'By Its Genres' }, { value: 'drama', label: 'Drama' }, { value: 'comedy', label: 'Comedy Or Musical' }]}
            onChange={(v) => edit(p, () => { if (v) p.axes.register = v as 'comedy' | 'drama'; else delete p.axes.register; })} />
        </div>
      </section>

      <ContentCard p={p} locked={locked} />

      {(questions.length > 0 || mods.size > 0) && (
        <section className="card">
          <h2>Genre Conventions</h2>
          {mods.size > 0 && (
            <ul className="list">{[...mods].map((m) => <li key={m}><strong>{MODULE_LABELS[m]}</strong>: <span className="muted">{MODULE_HELP[m]}</span></li>)}</ul>
          )}
          <div className="grid grid-2 form spaced">
            {questions.map((q) => (
              <TextField key={q.key} label={q.label} multiline hint={`For ${q.genres.join(' and ')}. Optional; you can subvert it.`} value={p.genreNotes[q.key] ?? ''} onChange={(v) => edit(p, () => (p.genreNotes[q.key] = v))} />
            ))}
          </div>
        </section>
      )}

      {p.axes.format === 'unscripted-series' && <ShowFormat p={p} />}
      {isEpisodic(p.axes.format) && p.episodes.length > 1 && <Season p={p} />}
      {(mods.has('world-rules') || p.axes.format === 'unscripted-series') && <WorldRules p={p} title={p.axes.format === 'unscripted-series' ? 'Format Rules' : 'Story World Rules'} />}
      {/* Every scripted story can declare its setups and payoffs: the edit plan reads them (finish.ts cutConsequences). */}
      {!nonfiction && <Structure p={p} />}
      {!nonfiction && <Research p={p} />}
      {(!nonfiction || mods.has('clues') || mods.has('setups') || mods.has('threat') || p.setups.length > 0) && <Setups p={p} />}
      {(mods.has('relationships') || p.relationships.length > 0) && <Relationships p={p} />}
      {(nonfiction || mods.has('factual')) && <Facts p={p} />}

      <section className="card">
        <div className="row-between wrap"><h2 style={{ margin: 0 }}>Scenes</h2><span className="muted">{plural(p.scenes.length, 'scene')}, about {Math.round(p.scenes.reduce((a, s) => a + s.estMinutes, 0))} minutes</span></div>
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

      <section className="card">
        <h2>Readiness</h2>
        <p className="dim">Readiness checks follow the script's structure: scenes, who is in them, setups and their payoffs. Notes count in the game's assessment of the script and with backers. Prompts only check that a text field is filled, so they never count either way.</p>
        {blocking.length ? (
          <>
            <p>These must be fixed before a draft can be approved:</p>
            <ul>{blocking.map((i, k) => <li key={k} style={{ color: 'var(--negative)' }}>{i.text}</li>)}</ul>
          </>
        ) : <p>Nothing blocks approval.</p>}
        {notes.length > 0 && (
          <details>
            <summary>{plural(notes.length, 'note')} to consider</summary>
            <ul>{notes.map((i, k) => {
              const added = p.notes.some((n) => n.source === 'readiness' && n.text === i.text && n.status !== 'addressed');
              return (
                <li key={k}>
                  {i.text}{' '}
                  {added ? <span className="chip">In Revision Notes</span> : <button className="btn btn-sm" onClick={() => setErr(store.act((s) => void noteFromIssue(s, s.projects.find((x) => x.id === p.id)!, i.text)))}>Add To Revision Notes</button>}
                </li>
              );
            })}</ul>
          </details>
        )}
        {prompts.length > 0 && (
          <details>
            <summary>{plural(prompts.length, 'prompt')} for your own writing</summary>
            <ul>{prompts.map((i, k) => <li key={k}>{i.text}</li>)}</ul>
          </details>
        )}
      </section>

      {approving && (
        <Modal title="Approve This Draft?" onClose={() => setApproving(null)} footer={
          <>
            <button className="btn" onClick={() => setApproving(null)}>Keep The Current Draft</button>
            <button className="btn btn-primary" onClick={() => { setErr(store.act((s) => { approveDraft(s, p, approving.number); })); setApproving(null); }}>Approve And Redo This Work</button>
          </>
        }>
          <p>Some scenes changed since the approved draft. Work on unchanged scenes is kept. This work starts over:</p>
          <ul>{approving.impact.map((t) => <li key={t}>{t}</li>)}</ul>
        </Modal>
      )}
      <section className="card">
        <h2>Drafts</h2>
        {changed && p.drafts.length > 0 && <p className="muted">You have changes since your last saved draft.</p>}
        <div className="inline-form">
          <TextField label="Draft Name" value={draftLabel} maxLength={60} hint="Optional." onChange={setDraftLabel} />
          <button className="btn btn-primary" disabled={locked || (!changed && p.drafts.length > 0)} onClick={() => { setErr(edit(p, () => { saveDraft(store.state!, p, draftLabel); })); setDraftLabel(''); }}>Save Draft</button>
        </div>
        <ul className="list spaced">
          {[...p.drafts].reverse().map((d) => (
            <li key={d.number}>
              <div className="row-wrap">
                <div className="grow">
                  <strong>{d.label}</strong> {d.approved && <span className="chip chip-positive">Approved</span>}
                  <div className="dim">{d.summary || 'First draft.'}</div>
                </div>
                <div className="row gap-2 wrap">
                  <button className="btn btn-sm" onClick={() => setCompare(d.number)}>Compare With Working Copy</button>
                  <button className="btn btn-sm" disabled={locked} onClick={() => setErr(edit(p, () => restoreDraft(p, d.number)))}>Restore This Draft</button>
                  <button className="btn btn-sm" disabled={locked} onClick={() => setRenaming({ number: d.number, label: d.label })}>Rename Draft</button>
                  {!d.approved && <button className="btn btn-sm btn-primary" disabled={locked} onClick={() => {
                    const impact = [...approvalImpact(p, d.number), ...requirementRemovalImpact(store.state!, p, d.number)];
                    if (impact.length) setApproving({ number: d.number, impact });
                    else setErr(store.act((s) => { approveDraft(s, p, d.number); }));
                  }}>Approve This Draft</button>}
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
  // Split and combine say what they will do before they do it (SLATE-06-04.02).
  const [confirm, setConfirm] = useState<{ title: string; lines: string[]; act: () => void } | null>(null);
  const next = p.scenes[p.scenes.indexOf(s) + 1];
  const nextInEpisode = next && next.episode === s.episode ? next : null;
  return (
    <article className="scene-card" aria-label={label}>
      {confirm && (
        <Modal title={confirm.title} onClose={() => setConfirm(null)} footer={<><button className="btn" onClick={() => setConfirm(null)}>Cancel</button><button className="btn btn-primary" onClick={() => { setErr(edit(p, confirm.act)); setConfirm(null); }}>{confirm.title}</button></>}>
          <ul>{confirm.lines.map((x, i) => <li key={i}>{x}</li>)}</ul>
          <p className="dim">Your approved draft and anything filmed stay as they are until you approve a new draft.</p>
        </Modal>
      )}
      <div className="row-wrap">
        <div className="grow">
          <h3>{label}</h3>
          <p className="dim" style={{ margin: 0 }}>{s.heading.intExt}. {s.heading.place || 'No place yet'} – {s.heading.time} · {s.estMinutes} min{s.participants.length ? ` · ${s.participants.map((c) => p.characters.find((x) => x.id === c)?.name).filter(Boolean).join(', ')}` : ''}</p>
        </div>
        <div className="row gap-2 wrap">
          <button className="btn btn-sm" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Close Scene' : 'Edit Scene'}</button>
          <button className="btn btn-sm" disabled={locked} aria-label={`Move ${label} Up`} onClick={() => edit(p, () => moveScene(p, s.id, -1))}>Move Up</button>
          <button className="btn btn-sm" disabled={locked} aria-label={`Move ${label} Down`} onClick={() => edit(p, () => moveScene(p, s.id, 1))}>Move Down</button>
          <button className="btn btn-sm" disabled={locked} aria-label={`Duplicate ${label}`} onClick={() => setErr(edit(p, () => { duplicateScene(store.state!, p, s.id); }))}>Duplicate</button>
          <button className="btn btn-sm btn-danger" disabled={locked} aria-label={`Delete ${label}`} onClick={onDelete}>Delete</button>
        </div>
      </div>
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      {open && (
        <fieldset disabled={locked} style={{ border: 0, padding: 0, margin: '12px 0 0' }}>
          <div className="grid grid-3 form">
            <SelectField label="Interior Or Exterior" value={s.heading.intExt} options={[{ value: 'INT', label: 'Interior' }, { value: 'EXT', label: 'Exterior' }, { value: 'INT/EXT', label: 'Interior And Exterior' }]} onChange={(v) => up({ heading: { ...s.heading, intExt: v } })} />
            <TextField label="Place" value={s.heading.place} maxLength={80} onChange={(v) => up({ heading: { ...s.heading, place: v }, storyLocation: s.storyLocation && s.storyLocation !== s.heading.place ? s.storyLocation : v })} />
            <SelectField label="Time Of Day" value={s.heading.time} options={(['DAY', 'NIGHT', 'DAWN', 'DUSK'] as const).map((t) => ({ value: t, label: t.charAt(0) + t.slice(1).toLowerCase() }))} onChange={(v) => up({ heading: { ...s.heading, time: v } })} />
            <NumberField label="Estimated Minutes" value={s.estMinutes} min={0.5} max={60} step={0.5} onChange={(v) => up({ estMinutes: v })} />
            {nonfiction && <SelectField label="Kind" value={s.kind} options={[{ value: 'interview', label: 'Interview' }, { value: 'actuality', label: 'Actuality' }, { value: 'archival', label: 'Archive' }, { value: 'narration', label: 'Narration' }, { value: 'reconstruction', label: 'Reconstruction' }, { value: 'segment', label: 'Segment' }]} onChange={(v) => up({ kind: v })} />}
            {nonfiction && <SelectField label="Basis" value={s.basis} options={[{ value: 'sourced', label: 'Sourced Fact' }, { value: 'dramatized', label: 'Dramatized' }, { value: 'invented', label: 'Invented' }]} onChange={(v) => up({ basis: v })} />}
            {(p.axes.medium === 'hybrid' || p.axes.technique === 'mixed') && (
              <SelectField label="Technique For This Scene" value={(s.technique ?? 'none') as Technique} options={[{ value: 'none' as Technique, label: p.axes.medium === 'hybrid' ? 'Live Action' : 'Project Default' }, ...(['2d-drawn', '2d-rigged', '3d-cg', 'stop-motion', 'rotoscope'] as Technique[]).map((t) => ({ value: t, label: TECHNIQUE_LABELS[t] }))]} onChange={(v) => up({ technique: v })} />
            )}
            {(p.acts ?? []).length > 0 && <SelectField label="Act" value={s.act ?? ''} options={[{ value: '', label: 'No Act' }, ...(p.acts ?? []).map((a) => ({ value: a.id, label: a.name }))]} onChange={(v) => setErr(edit(p, () => setSceneAct(p, s.id, v || null)))} />}
            {mods.has('tonal') && <TextField label="Tonal Intention" value={s.tone ?? ''} onChange={(v) => up({ tone: v })} />}
            {p.axes.genres.some((g) => g.id === 'found-footage') && <TextField label="Who Is Recording" value={s.operator ?? ''} onChange={(v) => up({ operator: v })} />}
          </div>
          {!nonfiction || s.kind === 'reconstruction' ? (
            <fieldset style={{ border: 0, padding: 0 }}>
              <legend style={{ fontWeight: 600 }}>Characters In The Scene</legend>
              <div className="chip-row">
                {p.characters.map((c) => <Check key={c.id} label={c.name} checked={s.participants.includes(c.id)} onChange={(v) => up({ participants: v ? [...s.participants, c.id] : s.participants.filter((x) => x !== c.id) })} />)}
                {!p.characters.length && <p className="muted">Add characters in the Characters section.</p>}
              </div>
            </fieldset>
          ) : (
            <fieldset style={{ border: 0, padding: 0 }}>
              <legend style={{ fontWeight: 600 }}>Contributors</legend>
              <div className="chip-row">
                {p.contributors.map((c) => <Check key={c.id} label={c.name} checked={s.contributorIds.includes(c.id)} onChange={(v) => up({ contributorIds: v ? [...s.contributorIds, c.id] : s.contributorIds.filter((x) => x !== c.id) })} />)}
                {!p.contributors.length && <p className="muted">Add contributors under Facts And Contributors.</p>}
              </div>
              {p.evidence.length > 0 && (
                <>
                  <legend style={{ fontWeight: 600 }}>Facts Shown</legend>
                  <div className="chip-row">{p.evidence.map((e) => <Check key={e.id} label={e.claim.slice(0, 50)} checked={s.evidenceIds.includes(e.id)} onChange={(v) => up({ evidenceIds: v ? [...s.evidenceIds, e.id] : s.evidenceIds.filter((x) => x !== e.id) })} />)}</div>
                </>
              )}
            </fieldset>
          )}
          <div className="grid grid-2 form">
            <TextField label="Objective" multiline value={s.objective} onChange={(v) => up({ objective: v })} />
            <TextField label={nonfiction ? 'What Happens' : 'Action'} multiline value={s.action} onChange={(v) => up({ action: v })} />
            <TextField label="Turning Point" multiline value={s.turningPoint} hint="Your note on what turns here. Kept with the script; SLATE doesn't read it." onChange={(v) => up({ turningPoint: v })} />
          </div>
          <Check label="Essential To The Story" checked={!!s.essential} hint="The story doesn't work without this scene. If it isn't shot, the edit offers a pickup or cutting around it, and cutting an essential scene leaves a gap." onChange={(v) => up({ essential: v || undefined })} />
          {!nonfiction && <Dialogue p={p} s={s} up={up} onSplit={(at) => setConfirm({ title: 'Split The Scene', lines: splitSceneImpact(p, s.id, at), act: () => { splitScene(store.state!, p, s.id, at); } })} />}
          {nextInEpisode && (
            <button className="btn btn-sm" aria-label={`Combine ${label} With ${sceneLabel(p, nextInEpisode)}`} onClick={() => setConfirm({ title: 'Combine The Scenes', lines: combineScenesImpact(p, s.id, nextInEpisode.id), act: () => combineScenes(p, s.id, nextInEpisode.id) })}>Combine With The Next Scene</button>
          )}
          {!nonfiction && s.dialogue.length > 0 && <p className="dim">The written dialogue takes about {Math.max(1, Math.round(spokenMinutes(s)))} {Math.round(spokenMinutes(s)) > 1 ? 'minutes' : 'minute'} to say at a typical pace (about 150 words a minute); the scene is estimated at {s.estMinutes}. A guide only: pace and pauses vary, and nothing checks it.</p>}
          <h4>Production Needs</h4>
          <p className="dim">These drive the breakdown. Nothing is guessed from the text above.</p>
          <div className="grid grid-3 form">
            <TextField label="Props" hint="Separate with commas." value={listText(s.props)} onChange={(v) => up({ props: parseList(v) })} />
            <TextField label="Animals" hint="Separate with commas." value={listText(s.animals)} onChange={(v) => up({ animals: parseList(v) })} />
            <TextField label="Vehicles" hint="Separate with commas." value={listText(s.vehicles)} onChange={(v) => up({ vehicles: parseList(v) })} />
            <TextField label="Stunts" hint="Describe the stunt, or leave blank." value={s.stunts} onChange={(v) => up({ stunts: v })} />
            <NumberField label="Crowd Size" value={s.crowd} min={0} max={5000} onChange={(v) => up({ crowd: Number.isFinite(v) ? Math.round(v) : 0 })} />
            <TextField label="Visual Effects" hint="Separate with commas." value={listText(s.vfx)} onChange={(v) => up({ vfx: parseList(v) })} />
            <TextField label="Songs" hint="Separate with commas. Mark licensed songs below." value={listText(s.songs.map((x) => x.title))} onChange={(v) => up({ songs: parseList(v).map((t) => ({ title: t, licensed: s.songs.find((x) => x.title === t)?.licensed ?? false })) })} />
          </div>
          <div className="chip-row">
            {s.songs.map((song) => <Check key={song.title} label={`${song.title} Is Licensed`} checked={song.licensed} onChange={(v) => up({ songs: s.songs.map((x) => (x.title === song.title ? { ...x, licensed: v } : x)) })} />)}
            <Check label="Dance" checked={s.dance} onChange={(v) => up({ dance: v })} />
            <Check label="Intimate Scene" checked={s.intimacy} onChange={(v) => up({ intimacy: v })} />
            <Check label="Water Work" checked={s.water} onChange={(v) => up({ water: v })} />
            <Check label="Intentional Discontinuity" hint="Continuity checks treat breaks here as deliberate, such as a payoff shown before its setup in a nonlinear story." checked={s.intentionalDiscontinuity} onChange={(v) => up({ intentionalDiscontinuity: v })} />
          </div>
        </fieldset>
      )}
    </article>
  );
}

function Dialogue({ p, s, up, onSplit }: { p: Project; s: Scene; up: (patch: Partial<Scene>) => void; onSplit: (at: number) => void }) {
  const [who, setWho] = useState(s.participants[0] ?? '');
  const [text, setText] = useState('');
  return (
    <div>
      <h4>Dialogue</h4>
      <ul className="list">
        {s.dialogue.map((d, i) => (
          <li key={d.id} className="row-wrap">
            {i > 0 && <button className="btn btn-sm" aria-label={`Split Before Line ${i + 1}`} onClick={() => onSplit(i)}>Split Here</button>}
            <span className="grow"><strong>{p.characters.find((c) => c.id === d.characterId)?.name ?? 'Unknown'}</strong>{p.axes.dialogueLanguages.length > 1 ? ` (${languageName(d.language)})` : ''}: {d.text}</span>
            <button className="btn btn-sm" onClick={() => up({ dialogue: s.dialogue.filter((x) => x.id !== d.id) })}>Remove Line</button>
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

/** What changing or removing a shared fact touches, listed before it is done (season.ts). */
function FactPreview({ p, fact }: { p: Project; fact: SharedFact }) {
  return (
    <div>
      <p><strong>What This Touches</strong></p>
      <ul className="list">{sharedFactPreview(p, fact).map((l) => <li key={l}>{l}</li>)}</ul>
    </div>
  );
}

function WorldRules({ p, title }: { p: Project; title: string }) {
  const [rule, setRule] = useState('');
  const [limit, setLimit] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [changing, setChanging] = useState<{ id: string; rule: string; limit: string } | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const sceneOpts = p.scenes.map((s) => ({ value: s.id, label: sceneLabel(p, s) }));
  return (
    <section className="card">
      <h2>{title}</h2>
      <p className="dim">SLATE records these rules and checks that some are written down. It can't tell whether a scene breaks one: that is yours to keep track of. Mark the scenes that rely on a rule, and changing it lists them first.</p>
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      <ul className="list">{p.worldRules.map((r) => (
        <li key={r.id}>
          <div className="row-wrap">
            <span className="grow"><strong>{r.rule}</strong>{r.limit ? <span className="muted"> Limit or cost: {r.limit}</span> : null}</span>
            <button className="btn btn-sm" aria-label={`Change The Rule ${r.rule}`} onClick={() => setChanging({ id: r.id, rule: r.rule, limit: r.limit })}>Change</button>
            <button className="btn btn-sm" aria-label={`Remove The Rule ${r.rule}`} onClick={() => (sharedFactImpact(p, { kind: 'rule', id: r.id }).length ? setRemoving(r.id) : setErr(edit(p, () => removeWorldRule(p, r.id))))}>Remove</button>
          </div>
          {sceneOpts.length > 0 && (
            <fieldset style={{ border: 0, padding: 0 }}>
              <legend className="small">Scenes That Rely On It</legend>
              <div className="chip-row">{sceneOpts.map((o) => <Check key={o.value} label={o.label} checked={(r.sceneIds ?? []).includes(o.value)} onChange={(v) => setErr(edit(p, () => { updateWorldRule(p, r.id, { sceneIds: v ? [...(r.sceneIds ?? []), o.value] : (r.sceneIds ?? []).filter((x) => x !== o.value) }); }))} />)}</div>
            </fieldset>
          )}
        </li>
      ))}</ul>
      <div className="inline-form">
        <TextField label="Rule" value={rule} onChange={setRule} />
        <TextField label="Limit Or Cost" value={limit} onChange={setLimit} />
        <button className="btn" disabled={!rule.trim()} onClick={() => { edit(p, () => p.worldRules.push({ id: newId(store.state!, 'wr'), rule: rule.trim(), limit: limit.trim() })); setRule(''); setLimit(''); }}>Add Rule</button>
      </div>
      {changing && (
        <Modal title="Change The Rule" onClose={() => setChanging(null)} footer={<>
          <button className="btn" onClick={() => setChanging(null)}>Keep It As It Is</button>
          <button className="btn btn-primary" disabled={!changing.rule.trim()} onClick={() => { const e = edit(p, () => { updateWorldRule(p, changing.id, { rule: changing.rule, limit: changing.limit }); }); setErr(e); if (!e) setChanging(null); }}>Save The Change</button>
        </>}>
          <TextField label="Rule" value={changing.rule} onChange={(v) => setChanging({ ...changing, rule: v })} />
          <TextField label="Limit Or Cost" value={changing.limit} onChange={(v) => setChanging({ ...changing, limit: v })} />
          <FactPreview p={p} fact={{ kind: 'rule', id: changing.id }} />
        </Modal>
      )}
      {removing && (
        <Modal title="Remove The Rule" onClose={() => setRemoving(null)} footer={<>
          <button className="btn" onClick={() => setRemoving(null)}>Keep It</button>
          <button className="btn btn-danger" onClick={() => { setErr(edit(p, () => removeWorldRule(p, removing))); setRemoving(null); }}>Remove The Rule</button>
        </>}>
          <FactPreview p={p} fact={{ kind: 'rule', id: removing }} />
        </Modal>
      )}
    </section>
  );
}

/** The season's arc, each episode's title and part in it, and their order (season.ts). The writer's plan; never scored.
 * A reorder renumbers every draft's scenes, which Undo's snapshot of the working copy can't follow, so it clears Undo. */
function Season({ p }: { p: Project }) {
  const [err, setErr] = useState<string | null>(null);
  const refusal = reorderRefusal(p);
  return (
    <section className="card" aria-labelledby="season-h">
      <h2 id="season-h">Season</h2>
      <p className="dim">The season's arc and what each episode moves in it. Your plan: SLATE doesn't score it, and a next season starts from it.</p>
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      {p.continues?.previousArc && <p className="muted">Last season: {p.continues.previousArc}</p>}
      <TextField label="Season Arc" multiline maxLength={2000} value={p.seasonArc ?? ''} onChange={(v) => setErr(edit(p, () => setSeasonArc(p, v)))} />
      <ol className="list">{p.episodes.map((e, i) => (
        <EpisodePlan key={`${e.number}-${e.title}`} p={p} n={e.number} first={i === 0} last={i === p.episodes.length - 1} refusal={refusal} onError={setErr} />
      ))}</ol>
      {refusal && <p className="muted">{refusal}</p>}
    </section>
  );
}

function EpisodePlan({ p, n, first, last, refusal, onError }: { p: Project; n: number; first: boolean; last: boolean; refusal: string | null; onError: (e: string | null) => void }) {
  const e = p.episodes.find((x) => x.number === n)!;
  const [title, setTitle] = useState(e.title);
  const scenes = p.scenes.filter((s) => s.episode === n);
  return (
    <li>
      <div className="row-wrap">
        <strong className="grow">Episode {n}: {e.title}</strong>
        <span className="dim">{plural(scenes.length, 'scene')}, about {Math.round(scenes.reduce((a, s) => a + s.estMinutes, 0))} minutes</span>
        <button className="btn btn-sm" aria-label={`Move ${e.title} Earlier`} disabled={first || !!refusal} onClick={() => { const r = store.act(() => moveEpisode(p, n, -1)); if (!r) undoStack.delete(p.id); onError(r); }}>Move Earlier</button>
        <button className="btn btn-sm" aria-label={`Move ${e.title} Later`} disabled={last || !!refusal} onClick={() => { const r = store.act(() => moveEpisode(p, n, 1)); if (!r) undoStack.delete(p.id); onError(r); }}>Move Later</button>
      </div>
      <div className="inline-form">
        <TextField label={`Title Of Episode ${n}`} value={title} maxLength={120} onChange={setTitle} />
        <button className="btn btn-sm" disabled={!title.trim() || title.trim() === e.title} onClick={() => onError(edit(p, () => setEpisodeTitle(p, n, title)))}>Rename</button>
      </div>
      <TextField label={`What Episode ${n} Moves`} maxLength={400} value={e.arc ?? ''} onChange={(v) => onError(edit(p, () => setEpisodeArc(p, n, v)))} />
    </li>
  );
}

/** Acts and story threads: the writer's structure, shown and linked by scene, never scored (structure.ts). */
function Structure({ p }: { p: Project }) {
  const [act, setAct] = useState('');
  const [thread, setThread] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const sceneOpts = p.scenes.map((s) => ({ value: s.id, label: sceneLabel(p, s) }));
  return (
    <section className="card" aria-labelledby="structure-h">
      <h2 id="structure-h">Acts And Threads</h2>
      <p className="dim">Your structure. Acts group scenes; a thread follows a story line to the scene that resolves it, or is left open on purpose. Cuts and changes say which thread they touch. SLATE doesn't score either.</p>
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      <h3>Acts</h3>
      {(p.acts ?? []).length ? (
        <ul className="list">{(p.acts ?? []).map((a) => (
          <li key={a.id} className="row-wrap">
            <span className="grow">{a.name} <span className="dim">· {plural(p.scenes.filter((s) => s.act === a.id).length, 'scene')}</span></span>
            <button className="btn btn-sm" aria-label={`Remove ${a.name}`} onClick={() => setErr(edit(p, () => removeAct(p, a.id)))}>Remove</button>
          </li>
        ))}</ul>
      ) : <p className="muted">No acts yet. Choose a scene's act in the scene itself once you add some.</p>}
      <div className="inline-form">
        <TextField label="New Act Or Sequence" value={act} maxLength={80} onChange={setAct} />
        <button className="btn" disabled={!act.trim()} onClick={() => { setErr(edit(p, () => { addAct(store.state!, p, act); })); setAct(''); }}>Add Act</button>
      </div>
      <h3>Threads</h3>
      <ul className="list">{(p.threads ?? []).map((t) => (
        <li key={t.id}>
          <div className="row-wrap"><strong className="grow">{t.name}</strong><span className="dim">{resolutionLabel(p, t)}</span><button className="btn btn-sm" aria-label={`Remove The Thread ${t.name}`} onClick={() => setErr(edit(p, () => removeThread(p, t.id)))}>Remove</button></div>
          <fieldset style={{ border: 0, padding: 0 }}>
            <legend className="small">Scenes In {t.name}</legend>
            <div className="chip-row">{sceneOpts.map((o) => <Check key={o.value} label={o.label} checked={t.sceneIds.includes(o.value)} onChange={(v) => setErr(edit(p, () => { updateThread(p, t.id, { sceneIds: v ? [...t.sceneIds, o.value] : t.sceneIds.filter((x) => x !== o.value) }); }))} />)}</div>
          </fieldset>
          <fieldset style={{ border: 0, padding: 0 }}>
            <legend className="small">Characters In {t.name}</legend>
            <div className="chip-row">{p.characters.map((c) => <Check key={c.id} label={c.name} checked={t.characterIds.includes(c.id)} onChange={(v) => setErr(edit(p, () => { updateThread(p, t.id, { characterIds: v ? [...t.characterIds, c.id] : t.characterIds.filter((x) => x !== c.id) }); }))} />)}</div>
          </fieldset>
          <SelectField label={`How ${t.name} Ends`} value={t.resolution === 'open' ? 'open' : t.resolvedIn ?? ''}
            options={[{ value: '', label: 'Not Decided Yet' }, { value: 'open', label: 'Left Open On Purpose' }, ...sceneOpts.map((o) => ({ value: o.value, label: `Resolves In ${o.label}` }))]}
            onChange={(v) => setErr(edit(p, () => { updateThread(p, t.id, v === 'open' ? { resolution: 'open' } : { resolution: 'resolves', resolvedIn: v || null }); }))} />
        </li>
      ))}</ul>
      <div className="inline-form">
        <TextField label="New Thread" value={thread} maxLength={80} onChange={setThread} />
        <button className="btn" disabled={!thread.trim()} onClick={() => { setErr(edit(p, () => { addThread(store.state!, p, thread); })); setThread(''); }}>Add Thread</button>
      </div>
    </section>
  );
}

/** Research questions behind the script: a record, never verified or scored by the game (research.ts). */
function Research({ p }: { p: Project }) {
  const [q, setQ] = useState('');
  const [err, setErr] = useState<string | null>(null);
  return (
    <section className="card" aria-labelledby="research-h">
      <h2 id="research-h">Research</h2>
      <p className="dim">Questions your story rests on, what you checked them against, and the scenes they inform. SLATE doesn't verify them; an open or uncertain one is noted on its scenes until you mark it reviewed.</p>
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      <ul className="list">{(p.research ?? []).map((n) => (
        <li key={n.id}>
          <div className="row-wrap"><strong className="grow">{n.question}</strong><button className="btn btn-sm" aria-label={`Remove The Question ${n.question}`} onClick={() => setErr(edit(p, () => removeResearch(p, n.id)))}>Remove</button></div>
          <div className="grid grid-2 form">
            <TextField label="Reference" hint="A book, archive, expert or source you checked." value={n.reference} maxLength={200} onChange={(v) => setErr(edit(p, () => { updateResearch(p, n.id, { reference: v }); }))} />
            <SelectField label="Status" value={n.status} options={[{ value: 'open', label: 'Open' }, { value: 'uncertain', label: 'Uncertain' }, { value: 'reviewed', label: 'Reviewed' }]} onChange={(v) => setErr(edit(p, () => { updateResearch(p, n.id, { status: v }); }))} />
          </div>
          <div className="chip-row">{p.scenes.map((s) => <Check key={s.id} label={sceneLabel(p, s)} checked={n.sceneIds.includes(s.id)} onChange={(v) => setErr(edit(p, () => { updateResearch(p, n.id, { sceneIds: v ? [...n.sceneIds, s.id] : n.sceneIds.filter((x) => x !== s.id) }); }))} />)}</div>
        </li>
      ))}</ul>
      <div className="inline-form">
        <TextField label="New Question" value={q} maxLength={200} onChange={setQ} />
        <button className="btn" disabled={!q.trim()} onClick={() => { setErr(edit(p, () => { addResearch(store.state!, p, q); })); setQ(''); }}>Add Question</button>
      </div>
    </section>
  );
}

function Setups({ p }: { p: Project }) {
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<'clue' | 'setup' | 'foreshadowing' | 'gag' | 'reveal'>('setup');
  const sceneOpts = [{ value: '', label: 'Not Yet' }, ...p.scenes.map((s) => ({ value: s.id, label: sceneLabel(p, s) }))];
  return (
    <section className="card">
      <h2>Setups, Clues And Reveals</h2>
      <ul className="list">
        {p.setups.map((sp) => (
          <li key={sp.id}>
            <div className="row-wrap"><strong className="grow">{sp.label} <span className="chip">{sp.kind.charAt(0).toUpperCase() + sp.kind.slice(1)}</span></strong><button className="btn btn-sm" onClick={() => edit(p, () => (p.setups = p.setups.filter((x) => x.id !== sp.id)))}>Remove</button></div>
            <div className="grid grid-2 form">
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
  const [err, setErr] = useState<string | null>(null);
  const [changing, setChanging] = useState<{ id: string; kind: string; start: string; end: string } | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const opts = [{ value: '', label: 'Choose A Character' }, ...p.characters.map((c) => ({ value: c.id, label: c.name }))];
  const pair = (r: { a: string; b: string }) => `${p.characters.find((c) => c.id === r.a)?.name} and ${p.characters.find((c) => c.id === r.b)?.name}`;
  return (
    <section className="card">
      <h2>Relationships</h2>
      <p className="dim">A relationship touches every scene its two characters share. Changing or removing one lists those scenes first.</p>
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      <ul className="list">{p.relationships.map((r) => <li key={r.id} className="row-wrap"><span className="grow">{pair(r)}: {r.kind}. {r.start ? `Starts: ${r.start}. ` : ''}{r.end ? `Ends: ${r.end}.` : ''}</span>
        <button className="btn btn-sm" aria-label={`Change The Relationship Of ${pair(r)}`} onClick={() => setChanging({ id: r.id, kind: r.kind, start: r.start, end: r.end })}>Change</button>
        <button className="btn btn-sm" aria-label={`Remove The Relationship Of ${pair(r)}`} onClick={() => (sharedFactImpact(p, { kind: 'relationship', id: r.id }).length ? setRemoving(r.id) : setErr(edit(p, () => removeRelationship(p, r.id))))}>Remove</button></li>)}</ul>
      <div className="grid grid-3 form">
        <SelectField label="First Character" value={a} options={opts} onChange={setA} />
        <SelectField label="Second Character" value={b} options={opts} onChange={setB} />
        <TextField label="Relationship" value={kind} onChange={setKind} />
        <TextField label="Where It Starts" value={start} onChange={setStart} />
        <TextField label="Where It Ends" value={end} onChange={setEnd} />
      </div>
      <button className="btn" disabled={!a || !b || a === b || !kind.trim()} onClick={() => { edit(p, () => p.relationships.push({ id: newId(store.state!, 'rel'), a, b, kind: kind.trim(), start, end })); setKind(''); setStart(''); setEnd(''); }}>Add Relationship</button>
      {changing && (
        <Modal title="Change The Relationship" onClose={() => setChanging(null)} footer={<>
          <button className="btn" onClick={() => setChanging(null)}>Keep It As It Is</button>
          <button className="btn btn-primary" disabled={!changing.kind.trim()} onClick={() => { const e = edit(p, () => { updateRelationship(p, changing.id, { kind: changing.kind, start: changing.start, end: changing.end }); }); setErr(e); if (!e) setChanging(null); }}>Save The Change</button>
        </>}>
          <TextField label="Relationship" value={changing.kind} onChange={(v) => setChanging({ ...changing, kind: v })} />
          <TextField label="Where It Starts" value={changing.start} onChange={(v) => setChanging({ ...changing, start: v })} />
          <TextField label="Where It Ends" value={changing.end} onChange={(v) => setChanging({ ...changing, end: v })} />
          <FactPreview p={p} fact={{ kind: 'relationship', id: changing.id }} />
        </Modal>
      )}
      {removing && (
        <Modal title="Remove The Relationship" onClose={() => setRemoving(null)} footer={<>
          <button className="btn" onClick={() => setRemoving(null)}>Keep It</button>
          <button className="btn btn-danger" onClick={() => { setErr(edit(p, () => removeRelationship(p, removing))); setRemoving(null); }}>Remove The Relationship</button>
        </>}>
          <FactPreview p={p} fact={{ kind: 'relationship', id: removing }} />
        </Modal>
      )}
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
    <section className="card">
      <h2>Facts And Contributors</h2>
      <h3>Facts</h3>
      {p.evidence.some((e) => !e.verified && e.status !== 'dramatized') && !p.tasks.some((t) => (t.kind === 'doc:factcheck' || t.kind === 'doc:research') && t.status === 'done') && <p className="dim">A fact can be marked checked once the research or a fact check is done in production.</p>}
      <ul className="list">
        {p.evidence.map((e) => (
          <li key={e.id} className="row-wrap">
            <span className="grow">{e.claim} <span className="chip">{e.status.charAt(0).toUpperCase() + e.status.slice(1)}</span> {e.verified ? <span className="chip chip-positive">Checked</span> : e.status !== 'dramatized' ? <span className="chip chip-warning">Not Checked</span> : null}<span className="dim"> {e.sourceNote}</span></span>
            <div className="row gap-2 wrap">
              {!e.verified && e.status !== 'dramatized' && <button className="btn btn-sm" disabled={!p.tasks.some((t) => t.kind === 'doc:factcheck' && t.status === 'done') && !p.tasks.some((t) => t.kind === 'doc:research' && t.status === 'done')} title="Available once research or fact checking is done." onClick={() => edit(p, () => (e.verified = true))}>Mark As Checked</button>}
              <button className="btn btn-sm" onClick={() => edit(p, () => (p.evidence = p.evidence.filter((x) => x.id !== e.id)))}>Remove</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="grid grid-3 form">
        <TextField label="Claim" value={claim} onChange={setClaim} />
        <SelectField label="Status" value={status} options={[{ value: 'established', label: 'Established' }, { value: 'alleged', label: 'Alleged' }, { value: 'unverified', label: 'Unverified' }, { value: 'dramatized', label: 'Dramatized' }]} onChange={setStatus} />
        <TextField label="Source Note" value={source} onChange={setSource} />
      </div>
      <button className="btn" disabled={!claim.trim()} onClick={() => { edit(p, () => p.evidence.push({ id: newId(store.state!, 'ev'), claim: claim.trim(), status, sourceNote: source.trim(), verified: false })); setClaim(''); setSource(''); }}>Add Fact</button>
      <h3 className="spaced">Contributors</h3>
      <ul className="list">
        {p.contributors.map((c) => (
          <li key={c.id} className="row-wrap">
            <span className="grow">{c.name}{c.role ? `, ${c.role}` : ''} <span className={`chip ${c.consent === 'given' ? 'chip-positive' : c.consent === 'declined' || c.consent === 'withdrawn' ? 'chip-negative' : 'chip-warning'}`}>{{ 'not-asked': 'Consent Not Requested', requested: 'Consent Requested', given: 'Consent Given', declined: 'Consent Declined', withdrawn: 'Withdrew' }[c.consent]}</span>{c.restrictions?.length ? <span className="dim"> On condition: {c.restrictions.map((k) => RESTRICTION_WORDS[k]).join('; ')}.</span> : null}</span>
            <div className="row gap-2 wrap">
              {c.consent === 'not-asked' && <button className="btn btn-sm" onClick={() => store.act((s) => requestConsent(s, p, c.id))}>Request Consent</button>}
              {c.consent === 'given' && !p.delivered && <WithdrawButton p={p} contributorId={c.id} name={c.name} />}
              <button className="btn btn-sm" onClick={() => edit(p, () => (p.contributors = p.contributors.filter((x) => x.id !== c.id)))}>Remove</button>
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
    <section className="card">
      <h2>Revision Notes</h2>
      <p className="muted">Accept notes you want to work on, then start a revision pass. Revisions take time.</p>
      <p className="dim">Notes raised by the readiness checks count toward the script's modeled quality once a revision addresses them. Notes you add yourself are for your own process and don't change it.</p>
      {p.revision && <p className="callout callout-info">Revision pass underway. It finishes in {formatDuration(p.revision.endsAt - g.now)}.</p>}
      <ul className="list">
        {p.notes.map((n) => (
          <li key={n.id} className="row-wrap">
            <span className="grow">{n.text} <span className="chip">{n.area.charAt(0).toUpperCase() + n.area.slice(1)}</span> <span className={`chip ${n.status === 'addressed' ? 'chip-positive' : n.status === 'rejected' ? 'chip-negative' : ''}`}>{n.status.charAt(0).toUpperCase() + n.status.slice(1)}</span></span>
            {n.status !== 'addressed' && (
              <div className="row gap-2 wrap">
                {n.status !== 'accepted' && <button className="btn btn-sm" onClick={() => store.act(() => setNoteStatus(p, n.id, 'accepted'))}>Accept Note</button>}
                {n.status !== 'rejected' && <button className="btn btn-sm" onClick={() => store.act(() => setNoteStatus(p, n.id, 'rejected'))}>Reject Note</button>}
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
      {err && <div className="callout callout-negative" role="alert"><p>{err}</p></div>}
      {impact && (
        <div className="callout callout-warning">
          <p>{describeImpact(designChangeImpact(p, impact))}</p>
          <div className="row gap-2 wrap">
            <button className="btn btn-sm" onClick={() => { setErr(store.act((s) => applyDesignChange(s, p, impact, false))); setImpact(null); }}>Keep Finished Shots</button>
            <button className="btn btn-sm" onClick={() => { setErr(store.act((s) => applyDesignChange(s, p, impact, true))); setImpact(null); }}>Redo Finished Shots</button>
          </div>
        </div>
      )}
      <section className="card">
        <div className="inline-form">
          <TextField label="Character Name" value={name} maxLength={80} onChange={setName} />
          <button className="btn btn-primary" disabled={locked} onClick={() => { const e = edit(p, () => void addCharacter(store.state!, p, name)); setErr(e); if (!e) setName(''); }}>Add Character</button>
        </div>
      </section>
      {p.characters.map((c) => <CharacterCard key={c.id} p={p} c={c} onRemove={() => { const imp = removeCharacterImpact(p, c.id); if (imp.length) setRemoving(c); else edit(p, () => removeCharacter(p, c.id)); }} onDesignChange={() => p.tasks.length > 0 && setImpact(c.id)} />)}
      {!p.characters.length && <div className="card"><p>No characters yet.</p></div>}
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

/** How the character changes, beat by beat, each in a scene they are in (structure.ts addBeat). Never scored. */
function ArcBeats({ p, c }: { p: Project; c: StoryCharacter }) {
  const scenes = p.scenes.filter((s) => s.participants.includes(c.id));
  const [scene, setScene] = useState(scenes[0]?.id ?? '');
  const [change, setChange] = useState('');
  const [err, setErr] = useState<string | null>(null);
  return (
    <fieldset style={{ border: 0, padding: 0 }}>
      <legend style={{ fontWeight: 600 }}>Arc</legend>
      <p className="dim">Where {c.name || 'this character'} changes. Cutting one of these scenes says what the audience no longer sees; nothing is scored.</p>
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      <ul className="list">{(c.beats ?? []).map((b) => { const s = p.scenes.find((x) => x.id === b.sceneId); return (
        <li key={b.id} className="row-wrap"><span className="grow">{s ? sceneLabel(p, s) : 'A removed scene'}: {b.change}</span><button className="btn btn-sm" aria-label={`Remove The Beat ${b.change}`} onClick={() => setErr(edit(p, () => removeBeat(p, c.id, b.id)))}>Remove</button></li>
      ); })}</ul>
      {scenes.length ? (
        <div className="inline-form">
          <SelectField label="Scene" value={scene || scenes[0].id} options={scenes.map((s) => ({ value: s.id, label: sceneLabel(p, s) }))} onChange={setScene} />
          <TextField label="What Changes" value={change} maxLength={200} onChange={setChange} />
          <button className="btn" disabled={!change.trim()} onClick={() => { setErr(edit(p, () => { addBeat(store.state!, p, c.id, scene || scenes[0].id, change); })); setChange(''); }}>Add Beat</button>
        </div>
      ) : <p className="muted">Put {c.name || 'them'} in a scene to mark where they change.</p>}
    </fieldset>
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
    <article className="card" aria-label={c.name}>
      <div className="row-wrap">
        <div className="grow">
          <h2 style={{ marginBottom: 4 }}>{c.name}</h2>
          <p className="dim" style={{ margin: 0 }}>{title(c.roleSize)}{c.functions.length ? ` · ${c.functions.map(title).join(', ')}` : ''} · {title(c.entity)} · {c.methods.map(title).join(', ')} · {plural(scenes, 'scene')}</p>
        </div>
        <div className="row gap-2 wrap">
          <button className="btn btn-sm" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Close' : 'Edit Character'}</button>
          <button className="btn btn-sm btn-danger" disabled={!!p.delivered} onClick={onRemove}>Remove</button>
        </div>
      </div>
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      {open && (
        <fieldset disabled={!!p.delivered} style={{ border: 0, padding: 0, marginTop: 12 }}>
          <div className="grid grid-3 form">
            <TextField label="Name" value={c.name} onChange={(v) => up({ name: v })} />
            <SelectField label="Role Size" value={c.roleSize} options={ROLE_SIZES.map((r) => ({ value: r, label: title(r) }))} onChange={(v) => up({ roleSize: v })} />
            <SelectField label="Entity" value={c.entity} options={ENTITIES.map((r) => ({ value: r, label: title(r) }))} onChange={(v) => up({ entity: v })} />
            <SelectField label="Realized As" value={c.realization} options={REALIZATIONS.map((r) => ({ value: r, label: REAL_LABEL[r] }))} onChange={(v) => up({ realization: v })} />
            <TextField label="Age In Story" value={c.ageInStory} onChange={(v) => up({ ageInStory: v })} />
            <TextField label="Also Called" hint="Other names they go by, separated with commas. Shown with the part in casting; the character stays one character." value={(c.aliases ?? []).join(', ')} onChange={(v) => up({ aliases: parseList(v).length ? [...new Set(parseList(v))] : undefined })} />
            <SelectField label="Pronouns" value={characterPronouns(c) ?? ''} hint="Casting marks performers who match, and can list them first." options={[{ value: '', label: 'Open To Anyone' }, { value: 'he', label: 'He/Him' }, { value: 'she', label: 'She/Her' }, { value: 'they', label: 'They/Them' }]} onChange={(v) => up({ pronouns: v })} />
            <SelectField label="Speaks" value={c.languages[0] ?? p.axes.dialogueLanguages[0]} options={p.axes.dialogueLanguages.map((l) => ({ value: l, label: languageName(l) }))} onChange={(v) => up({ languages: [v] })} />
            <SelectField label="Awards Placement" value={c.awardPlacement ?? ''} hint={placementExplained(c)}
              options={[{ value: '', label: 'By Role Size' }, { value: 'lead', label: 'Leading' }, { value: 'supporting', label: 'Supporting' }, { value: 'none', label: 'Not Entered' }]}
              onChange={(v) => up({ awardPlacement: (v || undefined) as StoryCharacter['awardPlacement'] })} />
            {isEpisodic(p.axes.format) && <SelectField label="Series Involvement" value={c.seriesInvolvement} hint="A regular is contracted for every episode: booked at least a day in each and credited in all. Others are booked and credited for the episodes they appear in." options={[{ value: 'regular', label: 'Regular' }, { value: 'recurring', label: 'Recurring' }, { value: 'guest', label: 'Guest' }, { value: 'single', label: 'One Episode' }]} onChange={(v) => up({ seriesInvolvement: v })} />}
          </div>
          <fieldset style={{ border: 0, padding: 0 }}>
            <legend style={{ fontWeight: 600 }}>Story Functions</legend>
            <p className="dim">What the part does in the story, independent of its size: a supporting antagonist stays supporting. They don't decide award placement (Awards Placement does). A narrator records narration in post-production, before the mix, and is booked a day for it.</p>
            <div className="chip-row">{FUNCTIONS.map((f) => <Check key={f} label={title(f)} checked={c.functions.includes(f)} onChange={(v) => up({ functions: v ? [...c.functions, f] : c.functions.filter((x) => x !== f) })} />)}</div>
          </fieldset>
          <fieldset style={{ border: 0, padding: 0 }}>
            <legend style={{ fontWeight: 600 }}>Performance Methods</legend>
            <div className="chip-row">{METHODS.map((m) => <Check key={m} label={title(m)} checked={c.methods.includes(m)} onChange={(v) => up({ methods: v ? [...c.methods, m] : c.methods.filter((x) => x !== m) })} />)}</div>
          </fieldset>
          <CharacterBackgrounds name={c.name} ethnicities={c.heritages ?? []} nationalities={c.nationalities ?? []} onChange={(patch) => up(patch)} />
          <ArcBeats p={p} c={c} />
          <div className="grid grid-2 form">
            {c.entity !== 'human' && <TextField label="What Kind Of Being" multiline value={c.entityNote} hint="Your description for design and casting. Kept with the script; SLATE doesn't read it." onChange={(v) => up({ entityNote: v })} />}
            <TextField label="Description" multiline value={c.description} hint="With Wants and Fears, this is the casting breakdown sent with offers. It doesn't change who accepts or how fast." onChange={(v) => up({ description: v })} />
            <TextField label="Wants" multiline value={c.wants} onChange={(v) => up({ wants: v })} />
            <TextField label="Fears" multiline value={c.fears} onChange={(v) => up({ fears: v })} />
          </div>
        </fieldset>
      )}
    </article>
  );
}

export { ordinal };

// ---------------- Unscripted format ----------------

function ShowFormat({ p }: { p: Project }) {
  const u = unscriptedOf(p);
  const [error, setError] = useState<string | null>(null);
  const comp = u.competition;
  const locked = !!comp?.results.length;
  const nameOf = (id: string) => p.contributors.find((c) => c.id === id)?.name ?? 'A participant';
  return (
    <section className="card" aria-labelledby="fmt-h">
      <h2 id="fmt-h">Show Format</h2>
      <SelectField label="Format Family" value={u.family} options={(Object.keys(FAMILIES) as UnscriptedFamily[]).map((f) => ({ value: f, label: FAMILIES[f].label }))}
        hint={FAMILIES[u.family].description} onChange={(v) => setError(edit(p, () => setFamily(p, v)))} />
      {u.family === 'competition' && (
        <>
          <fieldset style={{ border: 0, padding: 0 }} disabled={locked}>
            <legend style={{ fontWeight: 600, marginBottom: 8 }}>Contestants</legend>
            {p.contributors.length === 0 && <p className="muted">Add participants below, then choose who competes.</p>}
            {p.contributors.map((c) => (
              <Check key={c.id} label={c.name} checked={!!comp?.contestants.includes(c.id)} onChange={(on) => setError(edit(p, () => {
                const list = new Set(comp?.contestants ?? []);
                if (on) list.add(c.id); else list.delete(c.id);
                setupCompetition(p, [...list], comp?.eliminatePerEpisode ?? 1);
              }))} />
            ))}
            <NumberField label="Leave Each Episode" min={1} max={5} value={comp?.eliminatePerEpisode ?? 1} onChange={(n) => setError(edit(p, () => setupCompetition(p, comp?.contestants ?? [], n)))} />
          </fieldset>
          {locked && <p className="dim">Results are in, so the contestants and rules are fixed for this season.</p>}
          {comp && comp.results.length > 0 && (
            <>
              <h3>Results</h3>
              <ul className="list">
                {comp.results.map((r) => (
                  <li key={r.episode}>
                    Episode {r.episode}: {r.episode === p.axes.episodeCount ? `${nameOf(r.advancing[0])} wins.` : `${r.eliminated.map(nameOf).join(' and ')} ${r.eliminated.length === 1 ? 'leaves' : 'leave'}; ${r.advancing.map(nameOf).join(', ')} ${r.advancing.length === 1 ? 'advances' : 'advance'}.`}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
      {error && <p role="alert" className="error">{error}</p>}
    </section>
  );
}

function WithdrawButton({ p, contributorId, name }: { p: Project; contributorId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button className="btn btn-sm btn-danger" onClick={() => setOpen(true)}>Record Withdrawal</button>
      {open && (
        <Modal title={`${name} Withdraws?`} onClose={() => setOpen(false)} footer={
          <>
            <button className="btn" onClick={() => setOpen(false)}>{p.axes.format === 'unscripted-series' ? 'Keep Them In The Show' : 'Keep Them In The Film'}</button>
            <button className="btn btn-danger" onClick={() => { const e = store.act((s) => { withdrawRelease(s, s.projects.find((x) => x.id === p.id)!, contributorId); }); setError(e); if (!e) setOpen(false); }}>Record Withdrawal</button>
          </>
        }>
          <p>{name} no longer agrees to appear. {p.tasks.some((t) => t.id.startsWith('unscripted:logging:')) || approvedScenes(p).some((s) => s.contributorIds.includes(contributorId) && (p.captures.find((x) => x.sceneId === s.id)?.captured ?? 0) > 0)
            ? `Footage already recorded with them will be redacted by your editor before ${p.episodes.length > 1 ? 'those episodes' : 'the film'} can be delivered.`
            : "Nothing has been filmed with them yet. Scenes with them can't be filmed now, so take them out of those scenes or find someone else."}</p>
          {error && <p role="alert" className="error">{error}</p>}
        </Modal>
      )}
    </>
  );
}

/**
 * A character's ethnicity and nationality as written, asked apart as the player's are (November 8, 2026). Casting shows
 * who shares one, as information for the producer's choice. Until the review of November 7, 2026 a shared background
 * added 6 to the performance score; ability isn't inferred from ethnicity, so it scores nothing now.
 */
function CharacterBackgrounds({ name, ethnicities, nationalities, onChange }: { name: string; ethnicities: string[]; nationalities: string[]; onChange: (patch: { heritages?: string[]; nationalities?: string[] }) => void }) {
  const [q, setQ] = useState('');
  const [nq, setNq] = useState('');
  const who = name || 'This Character';
  const results = q.trim() ? searchEthnicities(q, 6).filter((h) => !ethnicities.includes(h)) : [];
  const nf = nq.trim().toLowerCase();
  const countries = nf ? NATIONALITIES.filter((n) => n.name.toLowerCase().includes(nf) && !nationalities.includes(n.code))
    .sort((a, b) => Number(!a.name.toLowerCase().startsWith(nf)) - Number(!b.name.toLowerCase().startsWith(nf))).slice(0, 6) : [];
  return (
    <fieldset style={{ border: 0, padding: 0 }}>
      <legend style={{ fontWeight: 600 }}>Ethnicity And Nationality</legend>
      <p className="dim">Optional. Casting shows which performers share {name || 'this character'}’s ethnicity or nationality, as information for your choice. It never changes how a performance is judged, and no one is turned away for not sharing it.</p>
      {(ethnicities.length > 0 || nationalities.length > 0) && (
        <div className="chip-row" style={{ marginBottom: 'var(--s2)' }}>
          {ethnicities.map((h) => <button key={h} type="button" className="btn btn-sm" aria-label={`Remove Ethnicity: ${h}`} onClick={() => onChange({ heritages: ethnicities.filter((x) => x !== h) })}>{h} ✕</button>)}
          {nationalities.map((c) => <button key={c} type="button" className="btn btn-sm" aria-label={`Remove Nationality: ${countryName(c)}`} onClick={() => onChange({ nationalities: nationalities.filter((x) => x !== c) })}>{countryName(c)} ✕</button>)}
        </div>
      )}
      <div className="grid grid-2 form">
        <div>
          <TextField label={`Add Ethnicity For ${who}`} type="search" value={q} onChange={setQ} />
          {results.length > 0 && (
            <div className="picklist" role="group" aria-label="Character Ethnicity Results">
              {results.map((h) => <button key={h} type="button" onClick={() => { onChange({ heritages: [...ethnicities, h].sort((a, b) => a.localeCompare(b, 'en')) }); setQ(''); }}>{h}</button>)}
            </div>
          )}
        </div>
        <div>
          <TextField label={`Add Nationality For ${who}`} type="search" value={nq} onChange={setNq} />
          {countries.length > 0 && (
            <div className="picklist" role="group" aria-label="Character Nationality Results">
              {countries.map((n) => <button key={n.code} type="button" onClick={() => { onChange({ nationalities: [...nationalities, n.code].sort((a, b) => countryName(a).localeCompare(countryName(b), 'en')) }); setNq(''); }}>{n.name}</button>)}
            </div>
          )}
        </div>
      </div>
    </fieldset>
  );
}

/**
 * What the finished work shows, declared as for a classification body. Declaring is the player's call: scene flags only
 * suggest. It sets what outlets ask of the release (finish.ts offerNeeds and broadcast slots), never a rating, and it is
 * fixed once the project is delivered.
 */
function ContentCard({ p, locked }: { p: Project; locked: boolean }) {
  const label = (id: string) => { const sc = p.scenes.find((x) => x.id === id); return sc ? sceneLabel(p, sc) : 'A scene'; };
  const tips = contentSuggestions(p, label);
  const advice = audienceContentNote(p);
  const set = (k: ContentIssue, v: string) => edit(p, () => {
    const c = { ...(p.axes.content ?? {}) };
    if (v) c[k] = v as ContentLevel; else delete c[k];
    p.axes.content = c;
  });
  return (
    <section className="card" aria-labelledby="content-h">
      <h2 id="content-h">Content</h2>
      <p className="dim">Declare what the finished work shows, as you would describe it to a classification body. Only a classification body gives a rating; SLATE uses your declaration for what outlets ask of the release, such as a broadcast slot, and for streaming's content advisories. It is fixed once the project is delivered.</p>
      <p><strong>Declared:</strong> {contentSummary(p)}.</p>
      <div className="grid grid-3 form">
        {CONTENT_ISSUES.map((i) => (
          <SelectField key={i.id} label={i.label} value={p.axes.content?.[i.id] ?? ''} disabled={locked}
            options={[{ value: '', label: 'None' }, { value: 'mild', label: 'Mild' }, { value: 'moderate', label: 'Moderate' }, { value: 'strong', label: 'Strong' }]}
            onChange={(v) => set(i.id, v)} />
        ))}
      </div>
      {!p.axes.content && !locked && <button className="btn btn-sm spaced" onClick={() => edit(p, () => { p.axes.content = {}; })}>Declare None Of These</button>}
      {tips.map((t) => <p key={t} className="dim">{t}</p>)}
      {advice && <p className="dim">{advice}</p>}
    </section>
  );
}
