import { Suspense, lazy, useState, type ReactNode } from 'react';
import { LIGHTS, SCORES, SOUNDS, lightOf, scoreOf, soundsOf, type Light, type Score, type SoundChoice } from '../engine/craft';
import { languageName, searchEthnicities } from '../data/identity';
import { NATIONALITIES } from '../engine/identity';
import { countryName } from '../world/gazetteer/gazetteer';
import {
  MODULE_LABELS, TECHNIQUE_LABELS, sceneTechnique, addCharacter, addNote, addScene, noteFromIssue, applyDesignChange, approveDraft, composeGenres, deleteScene, describeImpact,
  designChangeImpact, diffDrafts, formatDuration, isEpisodic, isNonfiction, moveScene, newId, ordinal, projectModules, removeCharacter, archiveCharacter, restoreCharacter, duplicateCharacter, splitCharacter, moveCharacter, removeCharacterRefusal,
  removeCharacterImpact, renameDraft, restoreDraft, revisionDurationHours, saveDraft, sceneDeleteImpact, sceneLabel, scriptIssues, setNoteStatus,
  startRevision, updateCharacter, updateScene, workingCopyDiffersFromLatestDraft, requestConsent, approvedScenes, type ModuleId,
  requirementRemovalImpact, addResearch, removeResearch, updateResearch, resolutionLabel,
  approvalImpact, combineScenes, combineScenesImpact, duplicateScene, splitScene, splitSceneImpact, FAMILIES, setFamily, setupCompetition, unscriptedOf, withdrawRelease, redactionWords, type UnscriptedFamily,
} from '../engine';
import { addAct, addBeat, addThread, removeAct, removeBeat, removeThread, setSceneAct, updateThread } from '../engine/structure-edit';
// Loaded with this page, not at startup (the startup budget): the engine index leaves season.ts out.
import { moveEpisode, addRelationship, removeRelationship, removeWorldRule, reorderRefusal, setEpisodeArc, setEpisodeTitle, setSeasonArc, setSeriesPlan, sharedFactImpact, sharedFactPreview, updateRelationship, updateWorldRule, type SharedFact } from '../engine/season';
import { FACE_METHODS } from '../engine/production/rates';
import { CONSENT_PLAN, DOC_SUBJECTS, RESTRICTION_WORDS, proposeDocumentaryPlan, type DocSubjectKind } from '../engine/documentary';
import { PROJECT_SUBJECTS } from '../engine/awards-rules';
import { money } from '../engine/budget';
import { approvalScope, type ScopeChange } from '../engine/cost-cuts';
import { CONTENT_ISSUES, audienceContentNote, characterPronouns, contentSuggestions, contentSummary, placementExplained, spokenMinutes } from '../engine/script-explain';
import type { ContentIssue, ContentLevel, Entity, NarrativeFunction, PerformanceMethod, Project, Realization, RevisionNote, RoleSize, Scene, StoryCharacter, Technique } from '../engine/types';
import { Check, Modal, NumberField, SelectField, TextField, longLocal, plural } from './components';
import { FIELD_LABELS, setLock } from '../engine/blueprints';
import { formatStoryAge, storyAge } from '../engine/story-age';
import { PLACEMENT_LABELS, attachSong, detachSong } from '../engine/song-actions';
import { store, useGame } from './store';
import { PlacePicker } from './Creation';
import { adoptPlace } from '../engine/state';
import { findPlace, getPlace } from '../data/places';
import { setLook, type IdeaField } from '../engine/brief';
import { MAKEUP, MAX_STATES, PERIOD_LABEL, WARDROBE, costumeCopies, madeIn, makeup, physicalCrowd, projectBand, stateIn, stateNames, statesOf, wardrobe, wardrobeMismatch, type MakeupId, type WardrobeId } from '../engine/looks';

// The idea picker and its library load the first time a picker is opened (IdeaPicker.tsx), never with the page.
const IdeaPicker = lazy(() => import('./IdeaPicker').then((m) => ({ default: m.IdeaPicker })));
import { APPROACHES, STANDING_SAYS, forgetSourceWork } from '../engine/adaptation';
import { ORIGIN_LABELS, fieldOrigin } from '../engine/proposal';
import { MEDIUM_LABELS, type SourceMedium } from '../engine/sources';
const ReviseBrief = lazy(() => import('./ReviseBrief').then((m) => ({ default: m.ReviseBrief })));
const SourcePicker = lazy(() => import('./SourcePicker').then((m) => ({ default: m.SourcePicker })));
const ideaLabel = (id: string) => import('../ideas').then((m) => m.ideaById(id)?.label ?? null);

const undoStack = new Map<string, string[]>();
// Everything the Script and Characters pages can change, so Undo takes back all of one change. Until November 12, 2026
// the snapshot held the scenes, the characters, the story's words and four lists; an idea that set the tone, the year
// or the genres, or a full story that set the title and the season, was only partly undone.
const UNDO_TOP = ['title', 'scenes', 'characters', 'story', 'setups', 'worldRules', 'relationships', 'evidence', 'contributors', 'genreNotes', 'acts', 'threads', 'research', 'seasonArc', 'series', 'brief', 'blueprint', 'locks', 'archived', 'storyTime', 'source', 'subjects'] as const;
const UNDO_AXES = ['tone', 'storyYear', 'styleEra', 'storySetting', 'settingPlaceId', 'genres', 'register', 'light', 'score', 'sound'] as const;
function snapshot(p: Project) {
  const st = undoStack.get(p.id) ?? [];
  const pick = (o: object, keys: readonly string[]) => Object.fromEntries(keys.map((k) => [k, (o as Record<string, unknown>)[k] ?? null]));
  st.push(JSON.stringify({ top: pick(p, UNDO_TOP), axes: pick(p.axes, UNDO_AXES), episodes: p.episodes.map((e) => ({ number: e.number, title: e.title, arc: e.arc ?? null })) }));
  if (st.length > 30) st.shift();
  undoStack.set(p.id, st);
}
/** Put a snapshot back: each field as it was, and a field that wasn't there removed. Episodes get back their titles and what they move; who writes and directs them is not the Script page's to undo. */
function restore(p: Project, text: string) {
  const snap = JSON.parse(text) as { top: Record<string, unknown>; axes: Record<string, unknown>; episodes: { number: number; title: string; arc: string | null }[] };
  const put = (o: object, from: Record<string, unknown>) => { for (const [k, v] of Object.entries(from)) { if (v === null) delete (o as Record<string, unknown>)[k]; else (o as Record<string, unknown>)[k] = v; } };
  put(p, snap.top); put(p.axes, snap.axes);
  for (const e of snap.episodes) { const ep = p.episodes.find((x) => x.number === e.number); if (ep) { ep.title = e.title; if (e.arc === null) delete ep.arc; else ep.arc = e.arc; } }
}
/** Where the story is set, and what that asks of the designers (projects.ts deriveRequirements, production/tasks.ts). */
function settingNote(p: Project): string {
  const set = p.axes.settingPlaceId ? findPlace(p.axes.settingPlaceId) : undefined;
  if (!set) return 'Optional. You shoot at your production base wherever the story is set.';
  const base = findPlace(p.axes.basePlaceId);
  return set.country === base?.country
    ? `Set in ${set.name}. It's in the same country as your base, so your designers work from what they know.`
    : `Set in ${set.name}, ${set.countryName}. Your designers research it before design and costumes start (Setting Research, from the next approved draft). You still shoot at your base.`;
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

/** What the declared year means for the work, in a sentence (looks.ts periodBand). */
function yearNote(p: Project): string {
  const band = projectBand(p);
  const made = madeIn(p);
  if (!band) return `Optional. With a year, costume and design work follow how far it is from ${made}, the year this is made; without one, they follow the genres as before.`;
  if (band === 'present') return `${p.axes.storyYear} counts as the present day for a project made in ${made}: no period research, and clothes from shops will do.`;
  return `${p.axes.storyYear} is ${PERIOD_LABEL[band]} for a project made in ${made}: the period is researched before costumes and design start, and they take ${band === 'recent' ? 'a quarter' : band === 'distant' ? 'twice' : 'half'} as much work${band === 'distant' ? '' : ' again'}.`;
}

/**
 * The button beside a field that opens the idea picker for it. Whatever is typed in the field stays as it is unless an
 * idea is applied, and after that it is the player's to change again. Says what was applied, so the change is seen.
 */
function Ideas({ p, fields, title, label = 'Choose Ideas', characterId, sceneId }: { p: Project; fields: IdeaField[]; title: string; label?: string; characterId?: string; sceneId?: string }) {
  const [open, setOpen] = useState(false);
  const [applied, setApplied] = useState<string | null>(null);
  return (
    <span className="ideas-row">
      <button type="button" className="btn btn-sm" disabled={!!p.delivered} onClick={() => { setApplied(null); setOpen(true); }}>{label}</button>
      {applied && <span role="status" className="dim small">Applied: {applied}.</span>}
      {open && <Suspense fallback={null}><IdeaPicker p={p} fields={fields} title={title} characterId={characterId} sceneId={sceneId} run={(fn) => edit(p, fn)} onClose={() => setOpen(false)} onApplied={setApplied} /></Suspense>}
    </span>
  );
}

/**
 * For a project made from a real work: propose its brief again and take only the fields chosen (ReviseBrief.tsx). Until
 * November 12, 2026 this place held Choose A Full Story, the library of stories written for this game, which the owner
 * retired with its quota.
 */
function ReviseFromWork({ p }: { p: Project }) {
  const [open, setOpen] = useState(false);
  const [applied, setApplied] = useState<string | null>(null);
  if (!p.proposal) return null;
  return (
    <span className="ideas-row">
      <button type="button" className="btn btn-sm" disabled={!!p.delivered} onClick={() => { setApplied(null); setOpen(true); }}>Revise From The Work</button>
      {applied && <span role="status" className="dim small">Revised from {applied}. Undo Last Change takes it back.</span>}
      {open && <Suspense fallback={null}><ReviseBrief p={p} run={(fn) => edit(p, fn)} onClose={() => setOpen(false)} onApplied={setApplied} /></Suspense>}
    </span>
  );
}

/** Opens the source-material catalog (SourcePicker.tsx), and says what was chosen. */
function AdaptWork({ p }: { p: Project }) {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  if (p.delivered) return null;
  return (
    <span className="ideas-row">
      <button type="button" className="btn btn-sm" onClick={() => { setChosen(null); setOpen(true); }}>Choose A Work To Adapt</button>
      {chosen && <span role="status" className="dim small">Adapted from: {chosen}. Undo Last Change takes it back.</span>}
      {open && <Suspense fallback={null}><SourcePicker p={p} run={(fn) => edit(p, fn)} onClose={() => setOpen(false)} onChosen={setChosen} /></Suspense>}
    </span>
  );
}

/** The catalog work a script is adapted from, as it was recorded the day it was chosen, with what that does and doesn't mean. */
function TheWorkItAdapts({ p }: { p: Project }) {
  const ref = p.source?.ref;
  if (!ref) return null;
  const place = getPlace(p.axes.basePlaceId);
  return (
    <section className="callout" style={{ gridColumn: '1 / -1' }} aria-label="The Work It Adapts">
      <h3 style={{ marginTop: 0 }}>The Work It Adapts</h3>
      <dl className="kv">
        <dt>Work</dt><dd>{ref.title}{ref.creators.length ? `, by ${ref.creators.join(', ')}` : ''}</dd>
        <dt>Medium And Year</dt><dd>{MEDIUM_LABELS[ref.medium as SourceMedium] ?? ref.medium}, {ref.year === null ? 'no year recorded' : ref.year < 0 ? `${-ref.year} BC` : ref.year}</dd>
        <dt>Its Rights, As Recorded</dt><dd>{ref.recorded}</dd>
        <dt>Chosen</dt><dd>{longLocal(ref.at, place.zone).date}, from the record as it stood then.</dd>
      </dl>
      <p className="dim small">{STANDING_SAYS[ref.standing]} Choosing it declares what your script is based on; it is not permission to use a real work, and nothing agreed in the game is one. <a href={`https://www.wikidata.org/wiki/${ref.id.slice(3)}`} target="_blank" rel="noreferrer noopener">Its Wikidata Record</a></p>
      {!p.delivered && <button type="button" className="btn btn-sm" onClick={() => edit(p, () => forgetSourceWork(store.state!, p))}>Let This Work Go</button>}
    </section>
  );
}

/** A story field with its Choose Ideas button under it: the field is Write My Own, as it always was. */
/**
 * The light the film is shot in, its score and its sound choices (craft.ts): each one asks something of the work, and
 * says what under it. None is better than another. How the camera moves is chosen scene by scene, with the shot plan on
 * the Schedule page.
 */
function CameraLightSound({ p }: { p: Project }) {
  const light = lightOf(p);
  const score = scoreOf(p);
  const sounds = soundsOf(p);
  const toggle = (x: SoundChoice, on: boolean) => edit(p, () => { p.axes.sound = on ? [...new Set([...soundsOf(p), x])] : soundsOf(p).filter((y) => y !== x); });
  return (
    <fieldset className="spaced" style={{ border: 0, padding: 0 }}>
      <legend style={{ fontWeight: 600 }}>Light, Sound And Score</legend>
      <p className="dim">Choices for the whole film. Each one changes the work: time on the day, crew, tests before the shoot, or days in post. None makes the film better by being chosen. How the camera moves is set scene by scene, with each scene's shot plan on the Schedule page.</p>
      <div className="grid grid-2 form">
        <IdeaField p={p} fields={['light']} title="Choose The Light It Is Shot In">
          <SelectField label="The Light It Is Shot In" value={light} options={(Object.keys(LIGHTS) as Light[]).map((k) => ({ value: k, label: LIGHTS[k].label }))} hint={LIGHTS[light].hint}
            onChange={(v) => edit(p, () => { p.axes.light = v as Light; })} />
        </IdeaField>
        <IdeaField p={p} fields={['score']} title="Choose Its Score">
          <SelectField label="The Score" value={score} options={(Object.keys(SCORES) as Score[]).map((k) => ({ value: k, label: SCORES[k].label }))} hint={SCORES[score].hint}
            onChange={(v) => edit(p, () => { p.axes.score = v as Score; })} />
        </IdeaField>
      </div>
      <div className="col gap-1">
        {(Object.keys(SOUNDS) as SoundChoice[]).map((k) => <Check key={k} label={SOUNDS[k].label} hint={SOUNDS[k].hint} checked={sounds.includes(k)} onChange={(on) => toggle(k, on)} />)}
      </div>
    </fieldset>
  );
}

function IdeaField({ p, fields, title, children }: { p: Project; fields: IdeaField[]; title: string; children: ReactNode }) {
  return <div className="idea-field">{children}<Ideas p={p} fields={fields} title={title} /></div>;
}

/**
 * What was chosen from the picker, in one place (brief.ts `p.brief.picks`): each idea by name, who or what it was for,
 * and whether it changes the work or is words or a note. This is where a note with no other effect is kept and read.
 */
/** Where each field of a brief proposed from a real work came from, as it stands now: a field changed since reads as the player's. */
function ProposalOrigins({ p }: { p: Project }) {
  const pr = p.proposal!;
  const keys = Object.keys(pr.origin).filter((k) => FIELD_LABELS[k]);
  const now = keys.map((k) => [k, fieldOrigin(p, k)] as const);
  const count = (o: string) => now.filter(([, x]) => x === o).length;
  return (
    <div>
      <p><strong>Adapted From:</strong> {pr.title}, proposed {longLocal(pr.at, 'UTC').date} in the game, {APPROACHES[pr.approach].label.toLowerCase()}. {count('sourced')} {count('sourced') === 1 ? 'field is' : 'fields are'} from the work, {count('proposed')} proposed by the game, {count('unknown')} not recorded, and {count('edited')} now your own words.</p>
      <details>
        <summary>Where Each Field Came From</summary>
        <ul className="list small" aria-label="Where Each Field Came From">
          {now.map(([k, o]) => <li key={k} className="list-item"><span className="grow"><strong>{FIELD_LABELS[k]}</strong>: {ORIGIN_LABELS[o ?? 'proposed']}{o !== 'edited' && pr.why[k] ? `. ${pr.why[k]}` : ''}</span></li>)}
        </ul>
      </details>
    </div>
  );
}

function CreativeBrief({ p }: { p: Project }) {
  const picks = p.brief?.picks ?? [];
  const [labels, setLabels] = useState<Record<string, string>>({});
  const missing = picks.map((k) => k.id).filter((id) => !(id in labels)).join();
  if (missing) void Promise.all(missing.split(',').map(async (id) => [id, (await ideaLabel(id)) ?? (id.startsWith('logline.') ? 'A Built Logline' : 'An Idea No Longer In The Library')] as const)).then((xs) => setLabels((old) => ({ ...old, ...Object.fromEntries(xs) })));
  const locks = p.locks ?? [];
  const sug = p.brief?.suggestions;
  if (!picks.length && !p.axes.styleEra && !p.blueprint && !p.proposal && !locks.length && !sug) return null;
  const who = (k: (typeof picks)[number]) => {
    const names = [...(k.characterIds ?? []).map((id) => p.characters.find((c) => c.id === id)?.name), ...(k.sceneIds ?? []).map((id) => { const sc = p.scenes.find((x) => x.id === id); return sc ? sceneLabel(p, sc) : undefined; })].filter(Boolean);
    return names.length ? ` For ${names.join(', ')}.` : '';
  };
  return (
    <section className="card" aria-label="Creative Brief">
      <h2>Creative Brief</h2>
      <p className="dim">What you chose from the idea pickers. Each set the fields it said it would; from then on the fields are what count, and you can change any of them. A note is kept here for the departments and changes nothing else.</p>
      {p.proposal && <ProposalOrigins p={p} />}
      {p.blueprint && (
        <>
          <p><strong>Which Story It Is From:</strong> {p.blueprint.title}, an original story written for this game.</p>
          <details>
            <summary>More About Where It Is From</summary>
            <p className="small">Story {p.blueprint.id}, version {p.blueprint.v}, applied on {longLocal(p.blueprint.at, 'UTC').date} in the game. It is not taken from a real film, series, book or game. {Object.keys(p.blueprint.names).length > 0 ? `It added ${Object.values(p.blueprint.names).map((id) => p.characters.find((c) => c.id === id)?.name).filter(Boolean).join(', ') || 'characters since removed'}.` : ''} Everything it wrote is yours to change.</p>
          </details>
        </>
      )}
      {sug && (sug.look || sug.sound) && (
        <div>
          <p><strong>Look And Sound Suggestions:</strong> notes for the departments, not choices. Each production choice is still made on its own.</p>
          {sug.look && <p className="small">Look: {sug.look}</p>}
          {sug.sound && <p className="small">Sound: {sug.sound}</p>}
        </div>
      )}
      {locks.length > 0 && (
        <div>
          <p><strong>Locked Fields:</strong> a full story leaves these alone.</p>
          <ul className="list" aria-label="Locked Fields">{locks.map((k) => <li key={k} className="list-item"><span className="grow">{FIELD_LABELS[k] ?? k}</span><button className="btn btn-sm" aria-label={`Unlock ${FIELD_LABELS[k] ?? k}`} onClick={() => void store.act(() => setLock(p, k, false))}>Unlock</button></li>)}</ul>
        </div>
      )}
      {p.axes.styleEra && <p><strong>The Look It Borrows:</strong> {p.axes.styleEra}. A reference for the departments, whatever year the story is set in.</p>}
      {picks.length > 0 && <ul className="list">{picks.map((k, i) => <li key={`${k.id}-${i}`} className="list-item"><span className="grow">{labels[k.id] ?? '…'}<span className="dim small">{who(k)}</span></span></li>)}</ul>}
    </section>
  );
}

export function ScriptTab({ p }: { p: Project }) {
  useGame();
  const [err, setErr] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState('');
  const [approving, setApproving] = useState<{ number: number; impact: string[]; scope: ScopeChange | null } | null>(null);
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
    store.act(() => restore(p, last));
  };
  return (
    <>
      {locked && <div className="callout callout-info"><p>This project has been delivered. The script is locked.</p></div>}
      {err && <div className="callout callout-negative" role="alert"><p>{err}</p></div>}
      <div className="row gap-2 wrap" style={{ marginBottom: 'var(--s4)' }}>
        <button className="btn" disabled={!undoStack.get(p.id)?.length || locked} onClick={undo}>Undo Last Change</button>
      </div>
      <section className="card">
        <h2>{nonfiction ? 'Subject And Approach' : 'Story'}</h2>
        <p className="dim">Your own words for the project. The game never reads them for meaning, and they never change the script's quality or how fast anyone answers. They are also the documents some people ask for by name, and an approach that includes one can't be sent until its fields are written: the Pitch (logline and premise) for backers, festival entry forms and distribution contracts; the Treatment (central conflict, point of view and intended ending) for a commissioner or a grant; the Statement Of Intent (theme and stakes{nonfiction ? ', and the central question' : ''}) for a grant. What they decide doesn't depend on what you wrote.</p>
        {nonfiction && (
          <div className="callout">
            <p style={{ margin: 0 }}>Not sure where to begin? A full story is a whole plan to develop: who to approach, what to ask and what it would have to show. Or write your own in any field below.</p>
            <div className="row gap-2 wrap" style={{ marginTop: 'var(--s2)' }}><ReviseFromWork p={p} /></div>
          </div>
        )}
        {!nonfiction && (
          <div className="callout">
            <p style={{ margin: 0 }}>Not sure where to begin? Choose a full story, or one idea at a time, make it yours, and change anything afterwards. Or write your own in any field below: what you type is never replaced unless you say so.</p>
            <div className="row gap-2 wrap" style={{ marginTop: 'var(--s2)' }}>
              <ReviseFromWork p={p} />
              <AdaptWork p={p} />
              <Ideas p={p} fields={['premise']} title="Choose A Starting Idea" label="Choose A Starting Idea" />
              <Ideas p={p} fields={['genre-blend']} title="Choose A Blend Of Genres" label="Blend Genres" />
              <Ideas p={p} fields={['genre-route']} title="Choose A Route Through Its Genre" label="Routes Through Its Genre" />
              <Ideas p={p} fields={['medium']} title="Choose How It Is Made" label="How It Is Made" />
              <Ideas p={p} fields={['sound']} title="Choose Its Sound And Music" label="Sound And Music" />
            </div>
          </div>
        )}
        <div className="grid grid-2 form">
          {nonfiction ? <IdeaField p={p} fields={['question']} title="Choose The Question It Asks"><TextField label="Central Question" multiline value={p.story.question} onChange={(v) => edit(p, () => (p.story.question = v))} /></IdeaField>
            : <TextField label="Central Question" multiline value={p.story.question} hint="What the audience waits to find out." onChange={(v) => edit(p, () => (p.story.question = v))} />}
          <TextField label="Synopsis" multiline maxLength={3000} value={p.story.synopsis ?? ''} hint="The whole story in a paragraph, ending included. Part of the Treatment." onChange={(v) => edit(p, () => { if (v) p.story.synopsis = v; else delete p.story.synopsis; })} />
          <IdeaField p={p} fields={['logline']} title="Build A Logline"><TextField label="Logline" multiline value={p.story.logline} maxLength={300} onChange={(v) => edit(p, () => (p.story.logline = v))} /></IdeaField>
          <IdeaField p={p} fields={['premise']} title="Choose A Premise"><TextField label="Premise" multiline value={p.story.premise} onChange={(v) => edit(p, () => (p.story.premise = v))} /></IdeaField>
          <IdeaField p={p} fields={['stakes']} title="Choose What Is At Stake"><TextField label="Stakes" multiline value={p.story.stakes} onChange={(v) => edit(p, () => (p.story.stakes = v))} /></IdeaField>
          <IdeaField p={p} fields={['conflict']} title="Choose A Central Conflict"><TextField label="Central Conflict" multiline value={p.story.conflict} onChange={(v) => edit(p, () => (p.story.conflict = v))} /></IdeaField>
          <IdeaField p={p} fields={['viewpoint']} title="Choose A Point Of View"><TextField label="Point Of View" value={p.story.viewpoint} onChange={(v) => edit(p, () => (p.story.viewpoint = v))} /></IdeaField>
          <IdeaField p={p} fields={['theme']} title="Choose A Theme"><TextField label="Theme" value={p.story.theme} onChange={(v) => edit(p, () => (p.story.theme = v))} /></IdeaField>
          <IdeaField p={p} fields={['ending']} title="Choose An Ending"><TextField label="Intended Ending" multiline value={p.story.ending} onChange={(v) => edit(p, () => (p.story.ending = v))} /></IdeaField>
          <IdeaField p={p} fields={['experience']} title="Choose What It Should Feel Like"><TextField label="Intended Experience" multiline value={p.story.intendedExperience} onChange={(v) => edit(p, () => (p.story.intendedExperience = v))} /></IdeaField>
          <TextField label="Who It Is For" maxLength={200} value={p.story.audience ?? ''} hint="Who you are making it for, in your words. The audience's age range is chosen on the Overview page." onChange={(v) => edit(p, () => { if (v) p.story.audience = v; else delete p.story.audience; })} />
          <TextField label="How It Is Built" maxLength={60} value={p.story.structure ?? ''} hint="Three acts, five, a circle, chapters. The acts themselves are under Acts And Threads." onChange={(v) => edit(p, () => { if (v) p.story.structure = v; else delete p.story.structure; })} />
          <IdeaField p={p} fields={['tone']} title="Choose A Tone"><TextField label="Tone" value={p.axes.tone} maxLength={80} onChange={(v) => edit(p, () => (p.axes.tone = v))} /></IdeaField>
          <IdeaField p={p} fields={['setting']} title="Choose Where It Is Set"><TextField label="Story Setting" maxLength={120} value={p.axes.storySetting} onChange={(v) => edit(p, () => (p.axes.storySetting = v))} /></IdeaField>
          <SelectField label="Competes As" value={p.axes.register ?? ''} hint="Where awards that split drama from comedy enter it, as you declare it. Left to its genres, it competes as comedy when a primary genre is comedy or musical; a secondary one doesn't change it."
            options={[{ value: '', label: 'By Its Genres' }, { value: 'drama', label: 'Drama' }, { value: 'comedy', label: 'Comedy Or Musical' }]}
            onChange={(v) => edit(p, () => { if (v) p.axes.register = v as 'comedy' | 'drama'; else delete p.axes.register; })} />
          {!nonfiction && <SelectField label="Source Material" value={p.source?.kind ?? 'original'} hint="Awards with separate original and adapted screenplay categories enter it by what you declare here."
            options={[{ value: 'original', label: 'Original' }, { value: 'adapted', label: 'Adapted From Another Work' }]}
            onChange={(v) => edit(p, () => { if (v === 'adapted') p.source = { ...p.source, kind: 'adapted', work: p.source?.work ?? '' }; else delete p.source; })} />}
          {p.source?.kind === 'adapted' && <TextField label="Adapted From" maxLength={120} value={p.source.work ?? ''} hint="The novel, play, article or film it adapts. Your own words; a work chosen from the catalog stays below until you let it go." onChange={(v) => edit(p, () => (p.source = { ...p.source, kind: 'adapted', work: v }))} />}
          <TheWorkItAdapts p={p} />
          <SelectField label="When It Is Set" value={p.storyTime ?? 'contemporary'} hint="Categories for period, fantasy or contemporary work read this."
            options={[{ value: 'contemporary', label: 'The Present Day' }, { value: 'period', label: 'The Past' }, { value: 'future', label: 'The Future Or An Invented World' }]}
            onChange={(v) => edit(p, () => { if (v === 'contemporary') delete p.storyTime; else p.storyTime = v as 'period' | 'future'; })} />
          <IdeaField p={p} fields={['period']} title="Choose When It Is Set">
            <TextField label="Year It Is Set In" inputMode="numeric" maxLength={4} value={p.axes.storyYear === undefined ? '' : String(p.axes.storyYear)}
              hint={yearNote(p)}
              onChange={(v) => edit(p, () => { const y = Number(v); if (/^\d{4}$/.test(v.trim()) && y >= 1000 && y <= 2200) p.axes.storyYear = y; else if (!v.trim()) delete p.axes.storyYear; })} />
          </IdeaField>
          <IdeaField p={p} fields={['style']} title="Choose A Look To Borrow">
            <TextField label="The Look It Borrows" maxLength={40} value={p.axes.styleEra ?? ''} hint="A period whose look it borrows, whatever year it is set in or made in. A note for the departments: it changes no work and no date."
              onChange={(v) => edit(p, () => { if (v.trim()) p.axes.styleEra = v; else delete p.axes.styleEra; })} />
          </IdeaField>
          {/* A country, a search box and a list of places: a row of its own, not a cell beside one-line boxes, which it stretched to its own height until November 11, 2026. */}
          <div className="cell-wide place-cell">
            <PlacePicker label="Story Setting Place" value={p.axes.settingPlaceId ?? ''} onChange={(id, place) => setErr(store.act((s) => { snapshot(p); adoptPlace(s, place); p.axes.settingPlaceId = id; }))} />
            <p className="dim small">{settingNote(p)}</p>
            {p.axes.settingPlaceId && <button className="btn btn-sm" onClick={() => setErr(edit(p, () => { delete p.axes.settingPlaceId; }))}>No Setting Place</button>}
          </div>
        </div>
        {!nonfiction && <CameraLightSound p={p} />}
        <fieldset className="spaced" style={{ border: 0, padding: 0 }}>
          <legend style={{ fontWeight: 600 }}>What It's About</legend>
          <p className="dim">Some awards are for work about a subject. Declare the ones that are true of the story; nothing else reads them.</p>
          <div className="chip-row">{PROJECT_SUBJECTS.map((x) => (
            <Check key={x.id} label={x.label} checked={!!p.subjects?.includes(x.id)}
              onChange={(on) => edit(p, () => { const set = new Set(p.subjects ?? []); if (on) set.add(x.id); else set.delete(x.id); p.subjects = [...set]; if (!p.subjects.length) delete p.subjects; })} />
          ))}</div>
        </fieldset>
      </section>

      <CreativeBrief p={p} />
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
      {/* A documentary's questions live here too, from November 12, 2026: its plan proposes them (DocPlanBlock). */}
      {(!nonfiction || (p.research?.length ?? 0) > 0) && <Research p={p} />}
      {(!nonfiction || mods.has('clues') || mods.has('setups') || mods.has('threat') || p.setups.length > 0) && <Setups p={p} />}
      {/* Any two characters can have something between them (the v3 package): until November 12, 2026 the card appeared only for genres that asked for it. */}
      {(mods.has('relationships') || p.relationships.length > 0 || p.characters.length >= 2) && <Relationships p={p} />}
      {(nonfiction || mods.has('factual')) && <Facts p={p} />}

      <section className="card">
        <div className="row-between wrap"><h2 style={{ margin: 0 }}>Scenes</h2><span className="muted">{plural(p.scenes.length, 'scene')}, about {Math.round(p.scenes.reduce((a, s) => a + s.estMinutes, 0))} minutes</span></div>
        {!nonfiction && <Ideas p={p} fields={['location']} title="Add A Scene At A Kind Of Place" label="Add A Scene From An Idea" />}
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
            <button className="btn btn-primary" onClick={() => { setErr(store.act((s) => { approveDraft(s, p, approving.number); })); setApproving(null); }}>{approving.impact.length ? 'Approve And Redo This Work' : 'Approve The Change'}</button>
          </>
        }>
          {approving.scope && <ScopeSummary scope={approving.scope} />}
          {approving.impact.length > 0 && <>
            <p>Some scenes changed since the approved draft. Work on unchanged scenes is kept. This work starts over:</p>
            <ul>{approving.impact.map((t) => <li key={t}>{t}</li>)}</ul>
          </>}
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
                  <div className="dim">{d.summary || 'First draft.'} Saved {longLocal(d.savedAt, getPlace(p.axes.basePlaceId).zone).date}.</div>
                </div>
                <div className="row gap-2 wrap">
                  <button className="btn btn-sm" onClick={() => setCompare(d.number)}>Compare With Working Copy</button>
                  <button className="btn btn-sm" disabled={locked} onClick={() => setErr(edit(p, () => restoreDraft(p, d.number)))}>Restore This Draft</button>
                  <button className="btn btn-sm" disabled={locked} onClick={() => setRenaming({ number: d.number, label: d.label })}>Rename Draft</button>
                  {!d.approved && <button className="btn btn-sm btn-primary" disabled={locked} onClick={() => {
                    const impact = [...approvalImpact(p, d.number), ...requirementRemovalImpact(store.state!, p, d.number)];
                    // A change to an approved script is a change of scope: its cost and schedule are shown first.
                    let scope: ScopeChange | null = null;
                    if (p.approvedDraft !== null) { try { scope = approvalScope(store.state!, p, d.number); } catch { scope = null; } }
                    const moves = !!scope && (Math.abs(scope.before.total - scope.after.total) >= 1 || scope.before.shootDays !== scope.after.shootDays || scope.commitments.length > 0);
                    if (impact.length || moves) setApproving({ number: d.number, impact, scope });
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

/** The project's songs heard in this scene (songs.ts): use one here or take it out; songs are made under Production. */
function SceneSongs({ p, sceneId }: { p: Project; sceneId: string }) {
  const [err, setErr] = useState<string | null>(null);
  const songs = p.songs ?? [];
  const act = (fn: (q: Project) => void) => setErr(store.act((st) => fn(st.projects.find((x) => x.id === p.id)!)));
  return (
    <fieldset className="spaced" style={{ border: 0, padding: 0 }}>
      <legend className="small">Songs In This Scene</legend>
      {err && <p className="callout callout-negative" role="alert">{err}</p>}
      {songs.length ? (
        <div className="chip-row">{songs.map((x) => {
          const use = x.uses.find((u) => u.sceneId === sceneId);
          return <Check key={x.id} label={`"${x.title}" In This Scene`} hint={use ? PLACEMENT_LABELS[use.placement] : undefined} checked={!!use} onChange={(v) => act((q) => (v ? attachSong(q, x.id, sceneId, 'background') : detachSong(q, x.id, sceneId)))} />;
        })}</div>
      ) : null}
      <p className="dim small">Make songs, credit who writes and performs them, and choose how each plays (performed on screen, in the background, over titles or credits) under Songs in the Production tab.</p>
    </fieldset>
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
        <Modal title={confirm.title} kind="script-confirm" onClose={() => setConfirm(null)} footer={<><button className="btn" onClick={() => setConfirm(null)}>Cancel</button><button className="btn btn-primary" onClick={() => { setErr(edit(p, confirm.act)); setConfirm(null); }}>{confirm.title}</button></>}>
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
        <fieldset disabled={locked} style={{ border: 0, padding: 0, margin: 'var(--s3) 0 0' }}>
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
              {/* Which look each character is in here (looks.ts), for those with more than one. */}
              {p.characters.filter((c) => s.participants.includes(c.id) && statesOf(c) > 1).map((c) => (
                <SelectField key={c.id} label={`${c.name}'s Look In This Scene`} value={String(stateIn(s, c))} options={stateNames(c).map((n, i) => ({ value: String(i), label: n }))}
                  hint="Scenes shot on one day with them in different looks lose time to the change."
                  onChange={(v) => up({ states: { ...s.states, [c.id]: Number(v) } })} />
              ))}
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
            <TextField label="Turning Point" multiline value={s.turningPoint} hint="Your note on what turns here. Kept with the script; the game doesn't read it." onChange={(v) => up({ turningPoint: v })} />
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
            {s.crowd > 0 && p.axes.medium !== 'animation' && <>
              <SelectField label="Crowd Makeup" value={s.crowdLook ?? ''} hint={s.crowdLook ? `${makeup(s.crowdLook)!.summary} Each background performer takes ${Math.round(makeup(s.crowdLook)!.chairMin * makeup(s.crowdLook)!.crowdShare)} minutes in the chair.` : 'The background as themselves.'}
                options={[{ value: '', label: 'None: As They Come' }, ...MAKEUP.map((m) => ({ value: m.id, label: m.label }))]} onChange={(v) => up({ crowdLook: (v || undefined) as MakeupId | undefined })} />
              <Check label="Extend The Crowd In Post" checked={s.crowdMethod === 'digital'} hint={s.crowdMethod === 'digital' ? `${physicalCrowd(s)} of ${s.crowd} are on set; the rest are added after the picture is locked, and the scene shoots clean plates too.` : `All ${s.crowd} are on set and paid for the day.`}
                onChange={(v) => up({ crowdMethod: v ? 'digital' : undefined })} />
            </>}
            <TextField label="Visual Effects" hint="Separate with commas." value={listText(s.vfx)} onChange={(v) => up({ vfx: parseList(v) })} />
"          </div>
          <SceneSongs p={p} sceneId={s.id} />
          <div className="chip-row">
            <Check label="Dance" checked={s.dance} onChange={(v) => up({ dance: v })} />
            <Check label="Intimate Scene" checked={s.intimacy} onChange={(v) => up({ intimacy: v })} />
            <Check label="Water Work" checked={s.water} onChange={(v) => up({ water: v })} />
            <Ideas p={p} fields={['scene-objective', 'scene-action', 'scene-turn', 'scene-tone', 'props', 'animals', 'vehicles', 'effects', 'crowd', 'camera', 'physical-comedy']} title={`Ideas For ${label}`} label="Ideas For This Scene" sceneId={s.id} />
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
      <div className="row-between wrap"><h2 style={{ margin: 0 }}>{title}</h2>{p.axes.format !== 'unscripted-series' && <Ideas p={p} fields={['world-rule']} title="Choose A Rule For Your Story's World" />}</div>
      <p className="dim">The game records these rules and checks that some are written down. It can't tell whether a scene breaks one: that is yours to keep track of. Mark the scenes that rely on a rule, and changing it lists them first.</p>
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
      <p className="dim">The season's arc and what each episode moves in it. Your plan: the game doesn't score it, and a next season starts from it.</p>
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      {p.continues?.previousArc && <p className="muted">Last season: {p.continues.previousArc}</p>}
      <IdeaField p={p} fields={['season-arc']} title="Choose A Season Arc"><TextField label="Season Arc" multiline maxLength={2000} value={p.seasonArc ?? ''} onChange={(v) => setErr(edit(p, () => setSeasonArc(p, v)))} /></IdeaField>
      <div className="grid grid-2 form">
        <TextField label="What An Episode Does" multiline maxLength={600} value={p.series?.engine ?? ''} hint="What happens every episode that makes it this show." onChange={(v) => setErr(edit(p, () => setSeriesPlan(p, { engine: v })))} />
        <TextField label="How Its People Change" multiline maxLength={800} value={p.series?.changes ?? ''} hint="Who is different by the end of the season, and how." onChange={(v) => setErr(edit(p, () => setSeriesPlan(p, { changes: v })))} />
        <TextField label="Places It Returns To" maxLength={400} value={(p.series?.recurring ?? []).join('; ')} hint="Separated by semicolons. Your record of the sets and places the season keeps." onChange={(v) => setErr(edit(p, () => setSeriesPlan(p, { recurring: v.split(';').map((x) => x.trim()).filter(Boolean) })))} />
        <TextField label="How It Goes On Or Ends" multiline maxLength={600} value={p.series?.continuation ?? ''} hint={p.axes.format === 'limited-series' ? 'A limited series ends. Say how.' : 'What a next season would be about, or that this is the last.'} onChange={(v) => setErr(edit(p, () => setSeriesPlan(p, { continuation: v })))} />
      </div>
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
      <p className="dim">Your structure. Acts group scenes; a thread follows a story line to the scene that resolves it, or is left open on purpose. Cuts and changes say which thread they touch. The game doesn't score either.</p>
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
      <p className="dim">Questions your story rests on, what you checked them against, and the scenes they inform. The game doesn't verify them; an open or uncertain one is noted on its scenes until you mark it reviewed.</p>
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
      <button className="btn" disabled={!a || !b || a === b || !kind.trim()} onClick={() => { const e = edit(p, () => void addRelationship(store.state!, p, a, b, kind, start, end)); setErr(e); if (!e) { setKind(''); setStart(''); setEnd(''); } }}>Add Relationship</button>
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
      <DocPlanBlock p={p} onApproach={setRole} />
      <h3 className="spaced">Contributors</h3>
      {p.contributors.some((c) => c.consent === 'not-asked') && <p className="dim">Someone asked for consent answers within two to six days.</p>}
      <ul className="list">
        {p.contributors.map((c) => (
          <li key={c.id} className="row-wrap">
            <span className="grow">{c.name}{c.role ? `, ${c.role}` : ''} <span className={`chip ${c.consent === 'given' ? 'chip-positive' : c.consent === 'declined' || c.consent === 'withdrawn' ? 'chip-negative' : 'chip-warning'}`}>{{ 'not-asked': 'Consent Not Requested', requested: 'Consent Requested', given: 'Consent Given', declined: 'Consent Declined', withdrawn: 'Withdrew' }[c.consent]}</span>{c.restrictions?.length ? <span className="dim"> On condition: {c.restrictions.map((k) => RESTRICTION_WORDS[k]).join('; ')}.</span> : null}{c.consent === 'withdrawn' && redactionWords(p, c.id).map((w) => <div key={w} className="dim small">{w}</div>)}</span>
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


/** A documentary's plan from its subject (documentary.ts proposeDocumentaryPlan): questions to answer and kinds of people
 *  to approach. Nothing is found and nobody is named by it; choosing a kind of person only fills Who They Are below. */
function DocPlanBlock({ p, onApproach }: { p: Project; onApproach: (role: string) => void }) {
  const [subject, setSubject] = useState('');
  const [kind, setKind] = useState<DocSubjectKind>('event');
  const [err, setErr] = useState<string | null>(null);
  const plan = p.docPlan;
  return (
    <div role="region" aria-label="The Plan">
      <h3 className="spaced">The Plan</h3>
      {!plan ? (
        <>
          <p className="dim">Say what the film is about, and the game proposes the questions to answer and the kinds of people to approach. It finds nothing and names nobody.</p>
          <div className="inline-form">
            <TextField label="What It Is About" value={subject} maxLength={120} onChange={setSubject} />
            <SelectField label="Kind Of Subject" value={kind} options={(Object.keys(DOC_SUBJECTS) as DocSubjectKind[]).map((k) => ({ value: k, label: DOC_SUBJECTS[k].label }))} onChange={setKind} />
            <button className="btn" disabled={!subject.trim() || !!p.delivered} onClick={() => setErr(edit(p, () => void proposeDocumentaryPlan(store.state!, p, subject, kind)))}>Propose A Plan</button>
          </div>
        </>
      ) : (
        <>
          <p><strong>About:</strong> {plan.subject} ({DOC_SUBJECTS[plan.kind].label}). Its questions are in Research, open: nothing is answered until you note what you checked.</p>
          <p className="small"><strong>Access:</strong> {DOC_SUBJECTS[plan.kind].access}</p>
          <p className="small"><strong>Consent:</strong> {CONSENT_PLAN}</p>
          <ul className="list" aria-label="People To Approach">
            {plan.approach.map((r) => <li key={r} className="list-item" style={{ flexWrap: 'wrap', gap: 'var(--s2)' }}><span className="grow">{r}</span><button className="btn btn-sm" aria-label={`Approach ${r}`} onClick={() => onApproach(r)}>Approach Someone</button></li>)}
          </ul>
          <p className="dim small">Approach Someone fills in Who They Are below; their name is yours to add, a real person you find.</p>
        </>
      )}
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
    </div>
  );
}

/** The scene a note is about, by its label; a scene since removed says so. */
const noteScene = (p: Project, id: string) => { const s = p.scenes.find((x) => x.id === id); return s ? sceneLabel(p, s) : 'a scene no longer in the script'; };

function Notes({ p }: { p: Project }) {
  const g = useGame();
  const [text, setText] = useState('');
  const [area, setArea] = useState<RevisionNote['area']>('dialogue');
  const [scene, setScene] = useState('');
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
            <span className="grow">{n.text}{n.sceneId && <span className="dim"> ({noteScene(p, n.sceneId)})</span>} <span className="chip">{n.area.charAt(0).toUpperCase() + n.area.slice(1)}</span> <span className={`chip ${n.status === 'addressed' ? 'chip-positive' : n.status === 'rejected' ? 'chip-negative' : ''}`}>{n.status.charAt(0).toUpperCase() + n.status.slice(1)}</span></span>
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
        <SelectField label="About" value={scene} options={[{ value: '', label: 'The Whole Script' }, ...p.scenes.map((x) => ({ value: x.id, label: sceneLabel(p, x) }))]} onChange={setScene} />
        <button className="btn" disabled={!text.trim()} onClick={() => { setErr(store.act((s) => void addNote(s, p, text, area, scene || null))); setText(''); }}>Add Note</button>
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
  const [giveTo, setGiveTo] = useState('');
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
      {p.characters.map((c, i) => <CharacterCard key={c.id} p={p} c={c} first={i === 0} last={i === p.characters.length - 1} onRemove={() => { setGiveTo(''); setRemoving(c); }} onDesignChange={() => p.tasks.length > 0 && setImpact(c.id)} />)}
      {!p.characters.length && <div className="card"><p>No characters yet. Add one above, or choose a full story on the Script page: either way they are yours to change.</p></div>}
      {(p.archived?.length ?? 0) > 0 && (
        <section className="card" aria-label="Set Aside">
          <h2>Set Aside</h2>
          <p className="dim">Out of the script, with everything about them kept. Any contract or payment for the part is in Cast, unchanged.</p>
          <ul className="list">{p.archived!.map((a) => (
            <li key={a.c.id} className="list-item">
              <span className="grow">{a.c.name} <span className="dim small">· {title(a.c.roleSize)} · set aside on {longLocal(a.at, 'UTC').date}{a.reassignedTo ? ` · their scenes went to ${p.characters.find((c) => c.id === a.reassignedTo)?.name ?? 'someone since removed'}` : a.sceneIds.length ? ` · was in ${plural(a.sceneIds.length, 'scene')}` : ''}</span></span>
              <button className="btn btn-sm" disabled={locked} aria-label={`Restore ${a.c.name}`} onClick={() => setErr(edit(p, () => restoreCharacter(p, a.c.id)))}>Restore</button>
            </li>
          ))}</ul>
        </section>
      )}
      {removing && (() => {
        const lines = removeCharacterImpact(p, removing.id);
        const refusal = removeCharacterRefusal(p, removing.id);
        const others = p.characters.filter((c) => c.id !== removing.id);
        const close = () => setRemoving(null);
        return (
          <Modal title={`Take ${removing.name} Out Of The Script?`} onClose={close} footer={<>
            <button className="btn" onClick={close}>Keep Character</button>
            <button className="btn btn-danger" disabled={!!refusal} onClick={() => { setErr(edit(p, () => removeCharacter(p, removing.id))); close(); }}>Remove For Good</button>
            <button className="btn btn-primary" onClick={() => { setErr(edit(p, () => archiveCharacter(store.state!, p, removing.id, giveTo || undefined))); close(); }}>Set Aside</button>
          </>}>
            {lines.length > 0 ? <ul>{lines.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p>Nothing else in the script refers to them.</p>}
            <p><strong>Set Aside</strong> takes them out of the script and keeps everything about them, so Restore brings them back. <strong>Remove For Good</strong> deletes them.</p>
            {refusal && <p className="callout callout-warning">{refusal}</p>}
            {others.length > 0 && lines.length > 0 && (
              <SelectField label="Give Their Scenes, Lines And Relationships To" value={giveTo} hint="Only when setting aside. Left with nobody, their scenes simply lose them." options={[{ value: '', label: 'Nobody' }, ...others.map((c) => ({ value: c.id, label: c.name }))]} onChange={setGiveTo} />
            )}
          </Modal>
        );
      })()}
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

/** Split a character in two: a new one, named here, takes the scenes ticked (projects.ts splitCharacter). */
function SplitCharacter({ p, c, onClose }: { p: Project; c: StoryCharacter; onClose: () => void }) {
  const theirs = p.scenes.filter((s) => s.participants.includes(c.id));
  const [take, setTake] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const why = !take.length ? 'Tick the scenes the new character takes.' : take.length === theirs.length ? `Leave ${c.name} at least one scene.` : !name.trim() ? 'Name the new character.' : null;
  return (
    <Modal title={`Split ${c.name}`} kind="split-character" onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Keep As One</button>
      <button className="btn btn-primary" disabled={!!why} onClick={() => { const e = edit(p, () => void splitCharacter(store.state!, p, c.id, take, name)); setErr(e); if (!e) onClose(); }}>Split</button>
    </>}>
      <p>A new character takes the scenes you tick, the lines spoken in them and the arc beats set there. {c.name} keeps the rest, and everything else: relationships, look, cast and contracts.</p>
      <TextField label="New Character's Name" value={name} maxLength={80} onChange={setName} />
      <fieldset style={{ border: 0, padding: 0 }}>
        <legend style={{ fontWeight: 600 }}>Scenes The New Character Takes</legend>
        {theirs.map((s) => <Check key={s.id} label={sceneLabel(p, s)} checked={take.includes(s.id)} onChange={(on) => setTake(on ? [...take, s.id] : take.filter((x) => x !== s.id))} />)}
      </fieldset>
      {why && <p className="dim small">{why}</p>}
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
    </Modal>
  );
}

const FACE_HINT = `Replacement faces are a set made after the puppet, ${FACE_METHODS.replacement.faceDays} build days and half a day for each scene, and quicker to animate; a mechanical head adds ${FACE_METHODS.mechanical.armatureDays} armature days for each copy and is slower to animate. Game calibration.`;
const usesStopMotion = (p: Project) => p.scenes.some((s) => sceneTechnique(p, s) === 'stop-motion') || p.axes.technique === 'stop-motion';

function CharacterCard({ p, c, first, last, onRemove, onDesignChange }: { p: Project; c: StoryCharacter; first: boolean; last: boolean; onRemove: () => void; onDesignChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [splitting, setSplitting] = useState(false);
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
          <h2 style={{ marginBottom: 'var(--s1)' }}>{c.name}</h2>
          <p className="dim" style={{ margin: 0 }}>{title(c.roleSize)}{c.functions.length ? ` · ${c.functions.map(title).join(', ')}` : ''} · {title(c.entity)} · {c.methods.map(title).join(', ')} · {plural(scenes, 'scene')}</p>
        </div>
        <div className="row gap-2 wrap">
          <button className="btn btn-sm" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Close' : 'Edit Character'}</button>
          <button className="btn btn-sm" disabled={!!p.delivered || first} aria-label={`Move ${c.name} Up`} onClick={() => setErr(edit(p, () => moveCharacter(p, c.id, -1)))}>Move Up</button>
          <button className="btn btn-sm" disabled={!!p.delivered || last} aria-label={`Move ${c.name} Down`} onClick={() => setErr(edit(p, () => moveCharacter(p, c.id, 1)))}>Move Down</button>
          <button className="btn btn-sm" disabled={!!p.delivered} aria-label={`Duplicate ${c.name}`} onClick={() => setErr(edit(p, () => void duplicateCharacter(store.state!, p, c.id)))}>Duplicate</button>
          <button className="btn btn-sm" disabled={!!p.delivered || scenes < 2} aria-label={`Split ${c.name}`} onClick={() => setSplitting(true)}>Split</button>
          <button className="btn btn-sm btn-danger" disabled={!!p.delivered} aria-label={`Set Aside Or Remove ${c.name}`} onClick={onRemove}>Set Aside Or Remove</button>
        </div>
      </div>
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      {splitting && <SplitCharacter p={p} c={c} onClose={() => setSplitting(false)} />}
      {open && (
        <fieldset disabled={!!p.delivered} style={{ border: 0, padding: 0, marginTop: 'var(--s3)' }}>
          <div className="grid grid-3 form">
            <TextField label="Name" value={c.name} onChange={(v) => up({ name: v })} />
            <SelectField label="Role Size" value={c.roleSize} options={ROLE_SIZES.map((r) => ({ value: r, label: title(r) }))} onChange={(v) => up({ roleSize: v })} />
            <SelectField label="Entity" value={c.entity} options={ENTITIES.map((r) => ({ value: r, label: title(r) }))} onChange={(v) => up({ entity: v })} />
            <SelectField label="Realized As" value={c.realization} options={REALIZATIONS.map((r) => ({ value: r, label: REAL_LABEL[r] }))} onChange={(v) => up({ realization: v })} />
            {usesStopMotion(p) && <SelectField label="Puppet Face" value={c.faceMethod ?? ''} hint={FACE_HINT} options={[{ value: '', label: 'Sculpted, Moved By Hand' }, { value: 'replacement', label: FACE_METHODS.replacement.label }, { value: 'mechanical', label: FACE_METHODS.mechanical.label }]} onChange={(v) => up({ faceMethod: (v || undefined) as StoryCharacter['faceMethod'] })} />}
            <AgeFields c={c} up={up} />
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
          <HowTheyLook p={p} c={c} onError={setErr} />
          <ArcBeats p={p} c={c} />
          <div className="grid grid-2 form">
            {c.entity !== 'human' && <div className="idea-field"><TextField label="What Kind Of Being" multiline value={c.entityNote} hint="Your description for design and casting. Kept with the script; the game doesn't read it." onChange={(v) => up({ entityNote: v })} /><Ideas p={p} fields={['character-being']} title={`What Kind Of Being ${c.name} Is`} characterId={c.id} /></div>}
            <div className="idea-field"><TextField label="Description" multiline value={c.description} hint="With Wants and Fears, this is the casting breakdown sent with offers. It doesn't change who accepts or how fast." onChange={(v) => up({ description: v })} /><Ideas p={p} fields={['character-description']} title={`How ${c.name} Comes Across`} characterId={c.id} /></div>
            <div className="idea-field"><TextField label="Wants" multiline value={c.wants} onChange={(v) => up({ wants: v })} /><Ideas p={p} fields={['character-goal']} title={`What ${c.name} Wants`} characterId={c.id} /></div>
            <div className="idea-field"><TextField label="Fears" multiline value={c.fears} onChange={(v) => up({ fears: v })} /><Ideas p={p} fields={['character-fear']} title={`What ${c.name} Fears`} characterId={c.id} /></div>
            <TextField label="Why They Want It" multiline maxLength={400} value={c.motivation ?? ''} onChange={(v) => up({ motivation: v || undefined })} />
            <TextField label="What Stands In The Way" multiline maxLength={400} value={c.obstacle ?? ''} onChange={(v) => up({ obstacle: v || undefined })} />
            <TextField label="What In Them Pulls Against It" multiline maxLength={400} value={c.contradiction ?? ''} hint="A contradiction: generous and unforgiving, careful hands and a careless life." onChange={(v) => up({ contradiction: v || undefined })} />
            <TextField label="How They Change" multiline maxLength={400} value={c.arc ?? ''} hint="Their arc in a sentence. The beats above place it scene by scene." onChange={(v) => up({ arc: v || undefined })} />
            <TextField label="How They Speak" multiline maxLength={400} value={c.voice ?? ''} hint="A brief for dialogue and for the performer. Kept with the part; the game doesn't read it." onChange={(v) => up({ voice: v || undefined })} />
          </div>
        </fieldset>
      )}
    </article>
  );
}

/**
 * A character's look and what it takes (looks.ts): the makeup method, where the costume comes from, and how many
 * appearance states they go through. Each control says what it makes, in the figures the schedule and the budget use.
 * Unset, the older rules apply: one shared costume task, and a creature build for a nonhuman part.
 */
function HowTheyLook({ p, c, onError }: { p: Project; c: StoryCharacter; onError: (e: string | null) => void }) {
  const set = (patch: NonNullable<StoryCharacter['look']>) => onError(edit(p, () => setLook(p, c.id, { ...c.look, ...patch })));
  // The names as typed, so a name half written (or a trailing comma) stays in the field; the save keeps the finished ones.
  const [names, setNames] = useState((c.look?.named ?? []).join(', '));
  const m = makeup(c.look?.makeup);
  const w = wardrobe(c.look?.wardrobe);
  const animated = p.axes.medium === 'animation';
  const copies = costumeCopies(c, p.scenes);
  const mismatch = wardrobeMismatch(p, c);
  const time = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} ${min >= 120 ? 'hours' : 'hour'}${min % 60 ? ` ${min % 60} minutes` : ''}` : `${min} minutes`);
  return (
    <fieldset style={{ border: 0, padding: 0 }}>
      <legend style={{ fontWeight: 600 }}>How They Look</legend>
      <p className="dim">{animated
        ? `${p.title} is animated, so ${c.name} is drawn or built: nobody sits in a makeup chair or is fitted for a costume, and these choices add no work here.`
        : 'How a look is made is work: time in the chair each shooting day, tests and builds before the shoot, fittings, and materials. A demanding look makes no film better by itself; it has to be staffed, scheduled and paid for.'}</p>
      <div className="grid grid-3 form">
        <SelectField label="Makeup" value={c.look?.makeup ?? ''} options={[{ value: '', label: 'No Method Chosen' }, ...MAKEUP.map((x) => ({ value: x.id, label: x.label }))]}
          hint={m ? `${m.summary} ${time(m.chairMin)} in the chair and ${time(m.removeMin)} to take off, each day they work${m.buildDays ? `; ${m.buildDays * statesOf(c)} build days` : ''}${m.testDays ? `; ${plural(m.testDays, 'test day')}` : ''}.` : 'Left to the hair and makeup artist, with nothing built or tested.'}
          onChange={(v) => set({ makeup: (v || undefined) as MakeupId | undefined })} />
        <SelectField label="Costume From" value={c.look?.wardrobe ?? ''} options={[{ value: '', label: 'With The Others' }, ...WARDROBE.map((x) => ({ value: x.id, label: x.label }))]}
          hint={w ? `${w.summary} ${plural(copies, 'copy', 'copies')}, ${plural(w.fittings, 'fitting')}.` : "One of the costume designer's shared costumes."}
          onChange={(v) => set({ wardrobe: (v || undefined) as WardrobeId | undefined })} />
        <NumberField label="Appearance States" value={statesOf(c)} min={1} max={MAX_STATES} step={1} hint="How many looks they go through: clean, then bloodied, then turned is three. Each is matched from scene to scene, and built where appliances are."
          onChange={(v) => set({ states: Number.isFinite(v) ? v : 1, named: undefined })} />
      </div>
      {statesOf(c) > 1 && (
        <TextField label={`Names Of ${c.name}'s Looks`} value={names} maxLength={260}
          hint={`In order, with a comma between them: Clean, Bloodied, Turned. As many looks as names, up to ${MAX_STATES}. Each scene then says which look they are in, on the Script page: only the looks that appear are made, and changing from one to another inside a shooting day takes time out of it.`}
          onChange={(v) => { setNames(v); set({ named: v.split(',') }); }} />
      )}
      {mismatch && <p className="callout callout-info">{mismatch}</p>}
      <Ideas p={p} fields={['makeup', 'wardrobe']} title={`How ${c.name} Looks`} characterId={c.id} />
    </fieldset>
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
            <legend style={{ fontWeight: 600, marginBottom: 'var(--s2)' }}>Contestants</legend>
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
                    <div className="dim small">Judges' scores out of 100: {Object.entries(r.scores).sort((a, b) => b[1] - a[1]).map(([id, n]) => `${nameOf(id)} ${n}`).join(', ')}.</div>
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
      <p className="dim">Declare what the finished work shows, as you would describe it to a classification body. Only a classification body gives a rating; the game uses your declaration for what outlets ask of the release, such as a broadcast slot, and for streaming's content advisories. It is fixed once the project is delivered.</p>
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

/** A change of scope before it is made: the estimate and shoot days before and after, and commitments that stay. */
export function ScopeSummary({ scope }: { scope: ScopeChange }) {
  const d = scope.after.estimate - scope.before.estimate;
  const days = scope.after.shootDays - scope.before.shootDays;
  return (
    <div className="spaced" aria-label="What The Change Does">
      <p><strong>Budget estimate:</strong> {money(scope.before.estimate)} now, {money(scope.after.estimate)} after{d ? ` (${d > 0 ? 'up' : 'down'} ${money(Math.abs(d))})` : ', no change'}.
        {' '}<strong>Shoot days still to come:</strong> {scope.before.shootDays} now, {scope.after.shootDays} after{days ? ` (${days > 0 ? `${days} more` : `${-days} fewer`})` : ''}.</p>
      {scope.before.estimate === scope.after.estimate && scope.before.total !== scope.after.total && <p className="dim">The work changes by {money(Math.abs(scope.after.total - scope.before.total))}, but the estimate stays at the budget size's amount.</p>}
      {scope.commitments.length > 0 && <><p>These agreements stay after the change:</p><ul>{scope.commitments.map((c) => <li key={c}>{c}</li>)}</ul></>}
    </div>
  );
}

/**
 * A character's age: one age, or a range up to an oldest (story-age.ts). Casting compares it with the ages each performer
 * plays, and a part under 16 is reckoned as a child's until it's cast (minors.ts). Until November 11, 2026 this was
 * free text read only for a leading number; text written then that gives no age is shown so it can be put in numbers.
 */
function AgeFields({ c, up }: { c: StoryCharacter; up: (patch: Partial<StoryCharacter>) => void }) {
  const a = storyAge(c.ageInStory);
  const legacy = !a && c.ageInStory.trim() ? c.ageInStory.trim() : null;
  const set = (min: number, max: number) => up({ ageInStory: Number.isFinite(min) ? formatStoryAge({ min, max: Number.isFinite(max) && max > min ? max : min }) : '' });
  const range = a && a.max !== a.min ? a.max : Number.NaN;
  return (
    <>
      <NumberField label="Age In Story" min={0} max={120} value={a?.min ?? Number.NaN}
        hint={legacy ? `Written as "${legacy}", which gives no age. Enter one so casting and the schedule can use it.` : 'Under 16, the part is played by a child, with the rules that bring.'}
        onChange={(v) => set(v, range)} />
      <NumberField label="Up To" min={0} max={120} value={range} hint="Optional: the oldest the character could be, for an age range." onChange={(v) => { if (a) set(a.min, v); }} />
    </>
  );
}

