import { songStatus, songUses } from './songs';
import { costumeCopies, digitalCrowd, makeup, physicalCrowd, projectBand, statesOf, wardrobe } from './looks';
import { financeRights } from './finance';
import { composeGenres, genreName, type ModuleId } from './genres';
import { findPlace } from '../data/places';
import { addLog, adoptPlace, newId, registerHandler, schedule } from './state';
import { unscriptedIssues } from './unscripted';
import { remapThreads, seasonNotes, structureNotes } from './structure';
import { researchNotes } from './research';
import { personById, roleLabel } from './people';
import type {
  DialogueLine,
  Draft, Format, GameState, GenrePick, Medium, Project, ProjectAxes, Requirement, RevisionNote, Scene, StoryCharacter, Technique,
} from './types';

// ---------------- Catalog labels ----------------

export const FORMAT_LABELS: Record<Format, string> = {
  short: 'Short Film',
  'mid-length': 'Mid-Length Film',
  feature: 'Feature Film',
  'tv-film': 'TV Film',
  series: 'Series',
  'limited-series': 'Limited Series',
  'anthology-series': 'Anthology Series',
  'documentary-feature': 'Documentary Feature',
  'documentary-short': 'Documentary Short',
  'documentary-series': 'Documentary Series',
  'unscripted-series': 'Unscripted Series',
  'web-series': 'Web Series',
  'music-video': 'Music Video',
};

export const MEDIUM_LABELS: Record<Medium, string> = { 'live-action': 'Live Action', animation: 'Animation', hybrid: 'Hybrid' };
export const TECHNIQUE_LABELS: Record<Technique, string> = {
  none: 'None',
  '2d-drawn': 'Drawn 2D',
  '2d-rigged': 'Rigged 2D',
  '3d-cg': '3D CG',
  'stop-motion': 'Stop Motion',
  rotoscope: 'Rotoscope',
  mixed: 'Mixed Technique',
};

export const EPISODIC: Format[] = ['series', 'limited-series', 'anthology-series', 'documentary-series', 'unscripted-series', 'web-series'];
export const NONFICTION: Format[] = ['documentary-feature', 'documentary-short', 'documentary-series', 'unscripted-series'];

export function isEpisodic(f: Format): boolean {
  return EPISODIC.includes(f);
}
export function isNonfiction(f: Format): boolean {
  return NONFICTION.includes(f);
}

/**
 * Budget sizes: the scale of a production. Each sets the least a budget estimate can be (fund), scales day costs and,
 * on a micro budget, has one person combine roles. An approved script's estimate is what it needs at that scale
 * (estimate.ts), so a size names a way of working, not a sum: on November 8, 2026 the picker's "about $40,000" became
 * "from $40,000", and the names were kept because "micro-budget" is the industry's word for this scale. None puts money in a
 * project; backers do (finance.ts). Amounts are game calibration inputs, not industry prices. `rights` are the approval
 * rights saves from before financing existed carried for this size (migrateV4toV5).
 */
export const FUNDING_SCENARIOS = [
  { id: 'micro', label: 'Micro Budget', fund: 40_000, description: 'A tiny crew where people cover more than one job, with borrowed gear and free locations. A live-action short often fits the minimum; animation usually needs more.', needsTrackRecord: false, rights: [] as string[] },
  { id: 'low', label: 'Low Budget', fund: 400_000, description: 'An independent production with a full crew.', needsTrackRecord: false, rights: [] as string[] },
  { id: 'mid', label: 'Mid Budget', fund: 4_000_000, description: 'Usually needs several backers, such as a co-production partner.', needsTrackRecord: false, rights: ['Casting Approval'] },
  {
    id: 'commissioned', label: 'Commissioned', fund: 15_000_000,
    description: 'Sized for a commissioner, who pays the full target and approves lead casting and the final cut.', needsTrackRecord: true, rights: ['Casting Approval', 'Picture Approval'],
  },
] as const;

export function fundingScenario(id: string) {
  const s = FUNDING_SCENARIOS.find((f) => f.id === id);
  if (!s) throw new Error('Unknown funding scenario');
  return s;
}

export function hasTrackRecord(state: GameState): boolean {
  return state.projects.some((p) => p.delivered !== null);
}

/** Approval rights the project's backers hold (finance.ts), and co-production partners from before financing existed. */
export function approvalRights(p: Project): string[] {
  return [...new Set([...financeRights(p), ...p.funding.extra.flatMap((e) => e.approvalRights)])];
}

// ---------------- Creation ----------------

export interface NewProjectInput {
  title: string;
  axes: Partial<ProjectAxes> & { format: Format; medium: Medium };
  scenarioId: string;
}

export function validateAxes(a: ProjectAxes): string[] {
  const out: string[] = [];
  if (a.medium === 'live-action' && a.technique !== 'none') out.push('Live-action projects have no animation technique.');
  if (a.medium !== 'live-action' && a.technique === 'none') out.push('Choose an animation technique.');
  if (!(a.targetRuntimeMin >= 1 && a.targetRuntimeMin <= 600)) out.push('Choose a runtime between 1 and 600 minutes.');
  if (a.format === 'short' && a.targetRuntimeMin > 40) out.push('A short film runs 40 minutes or less in this game.');
  if (a.format === 'feature' && a.targetRuntimeMin < 40) out.push('A feature runs more than 40 minutes in this game.');
  if (isEpisodic(a.format) && !(a.episodeCount >= 2 && a.episodeCount <= 13)) out.push('Choose between 2 and 13 episodes.');
  if (!a.dialogueLanguages.length) out.push('Choose at least one dialogue language.');
  return out;
}

export function createProject(state: GameState, input: NewProjectInput): Project {
  const title = input.title.trim();
  if (!title) throw new Error('Enter a working title.');
  const scenario = fundingScenario(input.scenarioId);
  if (scenario.needsTrackRecord && !hasTrackRecord(state)) throw new Error('A commissioner needs to see a finished project from you first.');
  const episodic = isEpisodic(input.axes.format);
  const axes: ProjectAxes = {
    technique: input.axes.medium === 'live-action' ? 'none' : '3d-cg',
    genres: [],
    tone: '',
    audience: 'General',
    storyEra: 'Contemporary',
    storySetting: '',
    dialogueLanguages: [state.character.mainLanguage],
    targetRuntimeMin: input.axes.format === 'short' || input.axes.format === 'documentary-short' ? 12 : episodic ? 30 : 95,
    episodeCount: episodic ? 4 : 1,
    animationQuality: 'tv',
    basePlaceId: state.locationId,
    ...input.axes,
  };
  const problems = validateAxes(axes);
  if (problems.length) throw new Error(problems[0]);
  const base = findPlace(axes.basePlaceId);
  if (!base) throw new Error('Choose a production base.');
  adoptPlace(state, base); // a world place used as a base is kept in the save
  const setting = axes.settingPlaceId ? findPlace(axes.settingPlaceId) : undefined;
  if (setting) adoptPlace(state, setting); // and one where the story is set
  const p: Project = {
    id: newId(state, 'pr'),
    title,
    createdAt: state.now,
    phase: 'development',
    axes,
    // The budget size is an estimate and a target; money comes only from backers' deals (finance.ts).
    funding: { scenarioId: scenario.id, fund: 0, extra: [] },
    finance: { estimate: scenario.fund, target: scenario.fund, deals: [] },
    story: { logline: '', premise: '', stakes: '', conflict: '', viewpoint: '', theme: '', ending: '', intendedExperience: '', question: '' },
    genreNotes: {},
    worldRules: [],
    relationships: [],
    designReview: true,
    takesModel: true,
    directing: 2,
    characters: [],
    scenes: [],
    episodes: Array.from({ length: axes.episodeCount }, (_, i) => ({ number: i + 1, title: episodic ? `Episode ${i + 1}` : title, writer: 'player', director: 'player' })),
    setups: [],
    evidence: [],
    contributors: [],
    drafts: [],
    approvedDraft: null,
    notes: [],
    writing: [],
    revision: null,
    revisionPasses: 0,
    requirements: [],
    changeOrders: [],
    cast: [],
    hires: [],
    obligations: [],
    schedule: { startDate: null, rehearsalDays: 3, sixDayWeeks: false, workHolidays: false, observances: [...(state.character.observances ?? [])], stages: 2, renderNodes: 20, puppetCopies: {}, days: [] },
    tasks: [],
    assets: [],
    captures: [],
    edit: { assembly: false, cutPasses: 0, pickupsNeeded: [], pictureLocked: false, versions: [] },
    delivered: null,
    credits: [],
    releases: [],
    offers: [],
    premiere: null,
    revenue: 0,
    quality: null,
    history: [{ at: state.now, text: 'Project started.' }],
    noticeKeys: [],
  };
  state.projects.push(p);
  addLog(state, `You started ${title}.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'overview' } });
  return p;
}

export function getProject(state: GameState, id: string): Project {
  const p = state.projects.find((x) => x.id === id);
  if (!p) throw new Error('That project no longer exists.');
  return p;
}

export function projectModules(p: Project): Set<ModuleId> {
  const { modules } = composeGenres(p.axes.genres.map((g) => g.id));
  if (isNonfiction(p.axes.format)) modules.add('documentary').add('factual');
  if (isEpisodic(p.axes.format) && p.axes.format === 'anthology-series') modules.add('anthology');
  return modules;
}

export function setGenres(p: Project, picks: GenrePick[]): void {
  const seen = new Set<string>();
  const clean = picks.filter((g) => (seen.has(g.id) ? false : (seen.add(g.id), true)));
  if (clean.length && !clean.some((g) => g.emphasis === 'primary')) clean[0] = { ...clean[0], emphasis: 'primary' };
  p.axes.genres = clean;
}

export function assertEditable(p: Project): void {
  if (p.delivered) throw new Error('This project has been delivered. Its script is locked.');
  if (p.shelved) throw new Error('This project is shelved. Take it up again to make changes.');
}

// ---------------- Characters ----------------

export function blankCharacter(state: GameState, name: string): StoryCharacter {
  return {
    id: newId(state, 'c'), name: name.trim(), roleSize: 'supporting', functions: [], entity: 'human', entityNote: '', methods: ['on-camera'],
    realization: 'performer', ageInStory: '', pronouns: '', languages: [], description: '', wants: '', fears: '', seriesInvolvement: 'recurring',
    designVersion: 1,
  };
}

/**
 * Hands an episode's writing or directing to someone else (you, or a hired episode writer or director). Whoever is replaced
 * keeps their credit for work already in the episode: a writer whose approved draft has scenes in it, a director with a
 * day of it shot. Until November 8, 2026 the select simply overwrote the name, and the credit went with it.
 */
export function assignEpisodeRole(p: Project, episode: number, role: 'writer' | 'director', who: 'player' | string): void {
  assertEditable(p);
  if (p.delivered) throw new Error('This project has been delivered.');
  const e = p.episodes.find((x) => x.number === episode);
  if (!e) throw new Error('That episode no longer exists.');
  const roleId = role === 'writer' ? 'episode-writer' : 'episode-director';
  if (who !== 'player' && !p.hires.some((h) => h.personId === who && h.roleId === roleId && h.status === 'accepted')) {
    throw new Error(`Hire them as ${p.episodes.length > 1 ? `an episode ${role}` : `the ${role}`} first.`);
  }
  // A writer earns the credit with work the player accepted (writing-jobs.ts), on projects made under that rule.
  if (role === 'writer' && who !== 'player' && p.writing && !p.writing.some((j) => j.personId === who && j.episode === episode && j.status === 'accepted' && j.scope !== 'polish')) {
    throw new Error("They haven't delivered a draft or a rewrite of it that you accepted. Commission one from them under Writing Work.");
  }
  const current = e[role];
  if (current === who) return;
  const contributed = role === 'writer'
    ? p.approvedDraft !== null && approvedScenes(p).some((s) => s.episode === episode)
    : p.schedule.days.some((d) => (d.episode === episode || d.episodes?.includes(episode)) && (d.status === 'shot' || d.status === 'partial'));
  const key = role === 'writer' ? 'formerWriters' : 'formerDirectors';
  const former = (e[key] ?? []).filter((x) => x !== who);
  if (contributed && !former.includes(current)) former.push(current);
  e[key] = former.length ? former : undefined;
  if (!e[key]) delete e[key];
  e[role] = who;
}

export function addCharacter(state: GameState, p: Project, name: string): StoryCharacter {
  assertEditable(p);
  if (!name.trim()) throw new Error('Give the character a name.');
  const c = blankCharacter(state, name);
  if (p.axes.medium === 'animation') {
    c.methods = ['voice'];
    c.realization = p.axes.technique === 'stop-motion' ? 'puppet' : p.axes.technique.startsWith('2d') ? 'drawn' : 'cg';
  }
  c.languages = [p.axes.dialogueLanguages[0]];
  p.characters.push(c);
  return c;
}

/** Fields whose change alters a character's physical/visual design. */
const DESIGN_FIELDS: (keyof StoryCharacter)[] = ['entity', 'realization', 'entityNote', 'description'];

export function updateCharacter(p: Project, id: string, patch: Partial<StoryCharacter>): { designChanged: boolean } {
  assertEditable(p);
  const c = p.characters.find((x) => x.id === id);
  if (!c) throw new Error('That character no longer exists.');
  if (patch.name !== undefined && !patch.name.trim()) throw new Error('A character needs a name.');
  const designChanged = DESIGN_FIELDS.some((f) => patch[f] !== undefined && patch[f] !== c[f]);
  Object.assign(c, patch);
  if (designChanged) c.designVersion += 1;
  return { designChanged };
}

/** A character's name wherever they now are: the working script, the approved draft, set aside, or an older draft. Contracts and credits outlive the script's current cast list. */
export function characterName(p: Project, id: string): string {
  return p.characters.find((c) => c.id === id)?.name ?? approvedCharacters(p).find((c) => c.id === id)?.name ?? p.archived?.find((a) => a.c.id === id)?.c.name
    ?? p.drafts.flatMap((d) => d.characters).find((c) => c.id === id)?.name ?? 'a part no longer in the script';
}

/** Everything that refers to a character, so nothing is removed unseen (the v3 package, 01 section 4). */
export function characterReferences(p: Project, id: string) {
  const live = ['offered', 'countered', 'accepted'];
  return {
    scenes: p.scenes.filter((s) => s.participants.includes(id)),
    lines: p.scenes.reduce((n, s) => n + s.dialogue.filter((d) => d.characterId === id).length, 0),
    relationships: p.relationships.filter((r) => r.a === id || r.b === id),
    threads: (p.threads ?? []).filter((t) => t.characterIds.includes(id)),
    states: p.scenes.filter((s) => s.states?.[id] !== undefined).length,
    offers: p.hires.filter((h) => h.characterId === id && (h.status === 'offered' || h.status === 'countered')),
    contracts: p.hires.filter((h) => h.characterId === id && h.status === 'accepted'),
    everHired: p.hires.filter((h) => h.characterId === id && !live.includes(h.status)).length,
    cast: p.cast.filter((c) => c.characterId === id),
    auditions: (p.auditions ?? []).filter((a) => a.characterId === id).length,
    shot: p.schedule.days.filter((d) => (d.status === 'shot' || d.status === 'partial') && approvedScenes(p).some((s) => d.sceneIds.includes(s.id) && s.participants.includes(id))).length,
  };
}

/** What setting a character aside or removing them touches, in sentences. Nothing here is done by reading it. */
export function removeCharacterImpact(p: Project, id: string): string[] {
  const r = characterReferences(p, id);
  const c = p.characters.find((x) => x.id === id);
  const out: string[] = [];
  const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
  if (r.scenes.length) out.push(`They are in ${n(r.scenes.length, 'scene', 'scenes')}: ${r.scenes.slice(0, 6).map((s) => `Scene ${sceneNumber(p, s.id)} (${s.heading.place || 'untitled'})`).join(', ')}${r.scenes.length > 6 ? ' and more' : ''}.`);
  if (r.lines) out.push(`They have ${n(r.lines, 'line', 'lines')} of dialogue.`);
  if (r.relationships.length) out.push(`${n(r.relationships.length, 'relationship names', 'relationships name')} them.`);
  if (r.threads.length) out.push(`${n(r.threads.length, 'story thread follows', 'story threads follow')} them.`);
  if (c?.look || r.states) out.push(`Their look${r.states ? `, and which state they are in for ${n(r.states, 'scene', 'scenes')},` : ''} goes with them.`);
  if (c?.beats?.length) out.push(`Their arc has ${n(c.beats.length, 'beat', 'beats')}.`);
  if (r.auditions) out.push(`${n(r.auditions, 'audition was', 'auditions were')} held for the part. The record of them stays.`);
  if (r.offers.length) out.push(`${n(r.offers.length, 'offer is', 'offers are')} out for the part and still open. ${r.offers.length === 1 ? 'It stays' : 'They stay'} open until answered or withdrawn in Cast.`);
  if (r.contracts.length) out.push(`${n(r.contracts.length, 'performer is', 'performers are')} contracted for the part. The ${r.contracts.length === 1 ? 'contract stays' : 'contracts stay'} as agreed until you release ${r.contracts.length === 1 ? 'it' : 'them'} in Cast; what was paid stays paid.`);
  if (r.cast.some((x) => x.performer === 'player')) out.push('You cast yourself in the part.');
  if (r.shot) out.push(`${n(r.shot, 'shoot day', 'shoot days')} with them in it ${r.shot === 1 ? 'is' : 'are'} already shot. That work and its credits stay.`);
  return out;
}

/** Why a character can't be removed outright, or null. Anything with money or filmed work behind it is set aside instead, so the history stays. */
export function removeCharacterRefusal(p: Project, id: string): string | null {
  const r = characterReferences(p, id);
  if (r.contracts.length || r.offers.length) return 'Someone is contracted or has an offer for this part. Set the character aside instead: that keeps the contract and everything paid, and you can release the performer in Cast.';
  if (r.everHired || r.shot) return 'This part has contracts or filmed work in its history. Set the character aside instead, so that history stays.';
  return null;
}

/** Take a character out of the script for good. Refused where money or filmed work is behind the part (archive it instead). */
export function removeCharacter(p: Project, id: string): void {
  assertEditable(p);
  const why = removeCharacterRefusal(p, id);
  if (why) throw new Error(why);
  detach(p, id);
  p.characters = p.characters.filter((c) => c.id !== id);
  p.cast = p.cast.filter((c) => c.characterId !== id);
}

/** Take a character out of every scene, line, relationship and thread, and say what was taken. */
function detach(p: Project, id: string): Pick<NonNullable<Project['archived']>[number], 'sceneIds' | 'lines' | 'relationships' | 'threadIds'> {
  const out = { sceneIds: [] as string[], lines: [] as { sceneId: string; index: number; line: DialogueLine }[], relationships: p.relationships.filter((r) => r.a === id || r.b === id), threadIds: [] as string[] };
  for (const s of p.scenes) {
    if (s.participants.includes(id)) { out.sceneIds.push(s.id); s.participants = s.participants.filter((x) => x !== id); }
    s.dialogue.forEach((d, index) => { if (d.characterId === id) out.lines.push({ sceneId: s.id, index, line: d }); });
    s.dialogue = s.dialogue.filter((d) => d.characterId !== id);
    if (s.states?.[id] !== undefined) { delete s.states[id]; if (!Object.keys(s.states).length) delete s.states; }
  }
  p.relationships = p.relationships.filter((r) => r.a !== id && r.b !== id);
  for (const t of p.threads ?? []) if (t.characterIds.includes(id)) { out.threadIds.push(t.id); t.characterIds = t.characterIds.filter((x) => x !== id); }
  return out;
}

/**
 * Set a character aside: out of the script, with everything about them kept so Restore puts them back. Their scenes,
 * lines, relationships and threads can be given to another character at the same time. No contract, offer, payment or
 * credit is changed: those stay in Cast until the player deals with each.
 */
export function archiveCharacter(state: GameState, p: Project, id: string, reassignTo?: string): void {
  assertEditable(p);
  const c = p.characters.find((x) => x.id === id);
  if (!c) throw new Error('That character is no longer in the script.');
  const to = reassignTo ? p.characters.find((x) => x.id === reassignTo && x.id !== id) : undefined;
  if (reassignTo && !to) throw new Error('Choose another character in the script to take their scenes.');
  const taken = detach(p, id);
  if (to) {
    for (const s of p.scenes) if (taken.sceneIds.includes(s.id) && !s.participants.includes(to.id)) s.participants.push(to.id);
    for (const l of taken.lines) { const s = p.scenes.find((x) => x.id === l.sceneId); if (s) s.dialogue.splice(Math.min(l.index, s.dialogue.length), 0, { ...l.line, id: newId(state, 'd'), characterId: to.id }); }
    for (const r of taken.relationships) {
      const a = r.a === id ? to.id : r.a, b = r.b === id ? to.id : r.b;
      // Never a bond with oneself, and never a second copy of one the two already have.
      if (a !== b && !p.relationships.some((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a))) p.relationships.push({ ...r, id: newId(state, 'r'), a, b });
    }
    for (const t of p.threads ?? []) if (taken.threadIds.includes(t.id) && !t.characterIds.includes(to.id)) t.characterIds.push(to.id);
  }
  p.characters = p.characters.filter((x) => x.id !== id);
  (p.archived ??= []).push({ c: { ...c, archived: true }, at: state.now, ...taken, ...(to ? { reassignedTo: to.id } : {}) });
}

/** Bring a set-aside character back as they were. What was given to someone else stays theirs; the rest returns to the scenes that still exist. */
export function restoreCharacter(p: Project, id: string): void {
  assertEditable(p);
  const i = (p.archived ?? []).findIndex((a) => a.c.id === id);
  if (i < 0) throw new Error('That character is not set aside.');
  const a = p.archived![i];
  const { archived: _gone, ...c } = a.c;
  p.characters.push(c);
  if (!a.reassignedTo) {
    for (const s of p.scenes) if (a.sceneIds.includes(s.id) && !s.participants.includes(id)) s.participants.push(id);
    for (const l of a.lines) { const s = p.scenes.find((x) => x.id === l.sceneId); if (s && !s.dialogue.some((d) => d.id === l.line.id)) s.dialogue.splice(Math.min(l.index, s.dialogue.length), 0, l.line); }
    for (const r of a.relationships) { const other = r.a === id ? r.b : r.a; if (p.characters.some((x) => x.id === other) && !p.relationships.some((x) => x.id === r.id)) p.relationships.push(r); }
    for (const t of p.threads ?? []) if (a.threadIds.includes(t.id) && !t.characterIds.includes(id)) t.characterIds.push(id);
  }
  p.archived!.splice(i, 1);
  if (!p.archived!.length) delete p.archived;
}

/** A copy to change: the same person on the page under a new name and a new ID, in no scene, with nothing between them and anyone, and nobody cast. */
export function duplicateCharacter(state: GameState, p: Project, id: string): StoryCharacter {
  assertEditable(p);
  const c = p.characters.find((x) => x.id === id);
  if (!c) throw new Error('That character is no longer in the script.');
  let name = `${c.name} (Copy)`;
  for (let n = 2; p.characters.some((x) => x.name === name); n++) name = `${c.name} (Copy ${n})`;
  const { beats: _beats, awardPlacement: _placement, ...rest } = c;
  const copy: StoryCharacter = { ...JSON.parse(JSON.stringify(rest)), id: newId(state, 'c'), name, designVersion: 1 };
  p.characters.splice(p.characters.indexOf(c) + 1, 0, copy);
  return copy;
}

/** Move a character up or down the list. The order is the writer's: billing is each character's own Role Size. */
export function moveCharacter(p: Project, id: string, delta: -1 | 1): void {
  assertEditable(p);
  const i = p.characters.findIndex((c) => c.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= p.characters.length) return;
  [p.characters[i], p.characters[j]] = [p.characters[j], p.characters[i]];
}

// ---------------- Scenes ----------------

export function blankScene(state: GameState, p: Project, episode = 1): Scene {
  const nonfiction = isNonfiction(p.axes.format);
  return {
    id: newId(state, 's'), episode, heading: { intExt: 'INT', place: '', time: 'DAY' }, storyLocation: '', participants: [], objective: '', action: '',
    dialogue: [], turningPoint: '', estMinutes: 2, props: [], animals: [], vehicles: [], stunts: '', crowd: 0, intimacy: false, water: false, vfx: [],
    dance: false, kind: p.axes.format === 'unscripted-series' ? 'segment' : nonfiction ? 'interview' : 'scripted', basis: nonfiction ? 'sourced' : 'invented', contributorIds: [], evidenceIds: [],
    intentionalDiscontinuity: false,
  };
}

export function addScene(state: GameState, p: Project, episode = 1, afterId?: string): Scene {
  assertEditable(p);
  if (episode < 1 || episode > p.axes.episodeCount) throw new Error('That episode does not exist.');
  const s = blankScene(state, p, episode);
  const i = afterId ? p.scenes.findIndex((x) => x.id === afterId) : -1;
  if (i >= 0) p.scenes.splice(i + 1, 0, s);
  else p.scenes.push(s);
  return s;
}

export function updateScene(p: Project, id: string, patch: Partial<Scene>): Scene {
  assertEditable(p);
  const s = p.scenes.find((x) => x.id === id);
  if (!s) throw new Error('That scene no longer exists.');
  if (patch.estMinutes !== undefined && !(patch.estMinutes > 0 && patch.estMinutes <= 60)) throw new Error('Estimate between 1 and 60 minutes.');
  if (patch.crowd !== undefined && !(Number.isInteger(patch.crowd) && patch.crowd >= 0 && patch.crowd <= 5000)) throw new Error('Crowd size must be between 0 and 5,000.');
  Object.assign(s, patch);
  return s;
}

export function moveScene(p: Project, id: string, delta: -1 | 1): void {
  assertEditable(p);
  const i = p.scenes.findIndex((x) => x.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= p.scenes.length) return;
  [p.scenes[i], p.scenes[j]] = [p.scenes[j], p.scenes[i]];
}

export function sceneDeleteImpact(p: Project, id: string): string[] {
  const out: string[] = [];
  const cap = p.captures.find((c) => c.sceneId === id && c.captured > 0);
  if (cap) out.push('Footage or animation for this scene already exists. It will be kept but left out of the cut.');
  const days = p.schedule.days.filter((d) => d.sceneIds.includes(id) && d.status === 'scheduled');
  if (days.length) out.push(`It is scheduled on ${days.length} shoot ${days.length === 1 ? 'day' : 'days'}.`);
  const sp = p.setups.filter((x) => x.plantedIn === id || x.paidIn === id);
  if (sp.length) out.push(`${sp.length} ${sp.length === 1 ? 'setup or clue is' : 'setups or clues are'} linked to it.`);
  const tasks = p.tasks.filter((t) => t.sceneIds.includes(id) && t.status !== 'done');
  if (tasks.length) out.push(`${tasks.length} unfinished production ${tasks.length === 1 ? 'task uses' : 'tasks use'} it.`);
  return out;
}

export function deleteScene(p: Project, id: string): void {
  assertEditable(p);
  p.scenes = p.scenes.filter((s) => s.id !== id);
  remapThreads(p, id, null);
  for (const sp of p.setups) {
    if (sp.plantedIn === id) sp.plantedIn = null;
    if (sp.paidIn === id) sp.paidIn = null;
  }
}

// ---------------- Duplicate, split, combine (SLATE-06-04.02, November 8, 2026) ----------------
// Each works on the working copy, so nothing filmed changes until a draft is approved again, when approval's own preview
// says which footage the changes affect. Copies get new IDs; links (setups, payoffs) are never guessed: they stay where
// they were or move with the scene that absorbs theirs, and the notes returned say which.

function copyLines(state: GameState, lines: Scene['dialogue']): Scene['dialogue'] {
  return lines.map((l) => ({ ...l, id: newId(state, 'l') }));
}

const half = (m: number) => Math.max(0.5, Math.round(m * 2) / 2);

/** A copy of the scene right after it, with a new ID and new line IDs. The original keeps its setups and payoffs. */
export function duplicateScene(state: GameState, p: Project, id: string): Scene {
  assertEditable(p);
  const s = p.scenes.find((x) => x.id === id);
  if (!s) throw new Error('That scene no longer exists.');
  const copy: Scene = JSON.parse(JSON.stringify(s));
  copy.id = newId(state, 's');
  copy.dialogue = copyLines(state, s.dialogue);
  delete copy.essential;
  p.scenes.splice(p.scenes.indexOf(s) + 1, 0, copy);
  return copy;
}

/** What splitting a scene before a line will do, said before it is done. */
export function splitSceneImpact(p: Project, id: string, atLine: number): string[] {
  const s = p.scenes.find((x) => x.id === id);
  if (!s) return ['That scene no longer exists.'];
  const out = [`Lines ${atLine + 1} onward move to a new scene right after this one, ${s.dialogue.length - atLine} of ${s.dialogue.length}.`];
  out.push('Both scenes keep everyone in this scene; take out whoever is not in each part.');
  if (s.props.length || s.animals.length || s.vehicles.length || s.stunts || s.crowd || s.vfx.length || (p.songs ?? []).some((x) => x.uses.some((u) => u.sceneId === id))) out.push('The production needs (props, stunts, crowd and the rest) stay with the first part. Move any the second part needs.');
  const links = p.setups.filter((x) => x.plantedIn === id || x.paidIn === id);
  if (links.length) out.push(`${links.map((x) => x.label || 'A setup').join(', ')} stay${links.length === 1 ? 's' : ''} linked to the first part. Relink any that happen in the second.`);
  if (s.essential) out.push('The first part stays essential; mark the second part too if the story needs it.');
  return out;
}

/** Split a scene before a dialogue line: the scene keeps its ID and the lines before; a new scene takes the rest. */
export function splitScene(state: GameState, p: Project, id: string, atLine: number): Scene {
  assertEditable(p);
  const s = p.scenes.find((x) => x.id === id);
  if (!s) throw new Error('That scene no longer exists.');
  if (!Number.isInteger(atLine) || atLine < 1 || atLine >= s.dialogue.length) throw new Error('Split between two lines of dialogue.');
  const second = blankScene(state, p, s.episode);
  Object.assign(second, {
    heading: { ...s.heading }, storyLocation: s.storyLocation, participants: [...s.participants], technique: s.technique, tone: s.tone,
    kind: s.kind, basis: s.basis, dialogue: s.dialogue.slice(atLine),
  });
  const share = (s.dialogue.length - atLine) / s.dialogue.length;
  second.estMinutes = half(s.estMinutes * share);
  s.estMinutes = half(s.estMinutes * (1 - share));
  s.dialogue = s.dialogue.slice(0, atLine);
  p.scenes.splice(p.scenes.indexOf(s) + 1, 0, second);
  return second;
}

/** What combining two scenes of an episode will do, said before it is done. */
export function combineScenesImpact(p: Project, keepId: string, mergeId: string): string[] {
  const keep = p.scenes.find((x) => x.id === keepId);
  const merge = p.scenes.find((x) => x.id === mergeId);
  if (!keep || !merge) return ['That scene no longer exists.'];
  const out = [`${sceneLabel(p, merge)} joins ${sceneLabel(p, keep)}: its action, lines, people and production needs are added, and it is removed from the script.`];
  const links = [...p.setups.filter((x) => x.plantedIn === mergeId || x.paidIn === mergeId).map((x) => x.label || 'A setup'), ...(p.threads ?? []).filter((t) => t.sceneIds.includes(mergeId)).map((t) => `the thread "${t.name}"`)];
  if (links.length) out.push(`${links.join(', ').replace(/^t/, 'T')} move${links.length === 1 ? 's' : ''} to ${sceneLabel(p, keep)}.`);
  if (p.captures.some((c) => c.sceneId === mergeId && c.captured > 0)) out.push(`Footage of ${sceneLabel(p, merge)} is kept, but the combined scene is new writing: approving it shows what needs shooting again.`);
  if (keep.heading.place !== merge.heading.place || keep.heading.intExt !== merge.heading.intExt || keep.heading.time !== merge.heading.time) out.push(`The combined scene keeps ${sceneLabel(p, keep)}'s heading (${keep.heading.intExt}. ${keep.heading.place || 'No place'} – ${keep.heading.time}).`);
  return out;
}

/** Combine a scene into another of the same episode. The kept scene keeps its ID; the other's links move to it. */
export function combineScenes(p: Project, keepId: string, mergeId: string): void {
  assertEditable(p);
  const keep = p.scenes.find((x) => x.id === keepId);
  const merge = p.scenes.find((x) => x.id === mergeId);
  if (!keep || !merge) throw new Error('That scene no longer exists.');
  if (keepId === mergeId) throw new Error('Choose two different scenes.');
  if (keep.episode !== merge.episode) throw new Error('Only scenes of the same episode can be combined.');
  const union = <T,>(a: T[], b: T[]) => [...new Set([...a, ...b])];
  keep.action = [keep.action, merge.action].filter((x) => x.trim()).join('\n\n');
  keep.objective = [keep.objective, merge.objective].filter((x) => x.trim()).join(' ');
  keep.turningPoint = [keep.turningPoint, merge.turningPoint].filter((x) => x.trim()).join(' ');
  keep.dialogue = [...keep.dialogue, ...merge.dialogue];
  keep.participants = union(keep.participants, merge.participants);
  keep.props = union(keep.props, merge.props);
  keep.animals = union(keep.animals, merge.animals);
  keep.vehicles = union(keep.vehicles, merge.vehicles);
  keep.vfx = union(keep.vfx, merge.vfx);
  // The songs heard in the merged scene are heard in the one kept (songs.ts).
  for (const song of p.songs ?? []) {
    for (const u of song.uses) if (u.sceneId === merge.id) u.sceneId = keep.id;
    song.uses = song.uses.filter((u, i) => song.uses.findIndex((x) => x.sceneId === u.sceneId && x.placement === u.placement) === i);
  }
  keep.stunts = [keep.stunts, merge.stunts].filter((x) => x.trim()).join('; ');
  keep.crowd = Math.max(keep.crowd, merge.crowd);
  keep.intimacy ||= merge.intimacy;
  keep.water ||= merge.water;
  keep.dance ||= merge.dance;
  keep.contributorIds = union(keep.contributorIds, merge.contributorIds);
  keep.evidenceIds = union(keep.evidenceIds, merge.evidenceIds);
  if (merge.essential) keep.essential = true;
  keep.estMinutes = Math.min(60, keep.estMinutes + merge.estMinutes);
  for (const sp of p.setups) {
    if (sp.plantedIn === mergeId) sp.plantedIn = keepId;
    if (sp.paidIn === mergeId) sp.paidIn = keepId;
  }
  remapThreads(p, mergeId, keepId);
  p.scenes = p.scenes.filter((x) => x.id !== mergeId);
}

export function sceneNumber(p: Project, id: string): number {
  const s = p.scenes.find((x) => x.id === id);
  if (!s) return 0;
  return p.scenes.filter((x) => x.episode === s.episode).findIndex((x) => x.id === id) + 1;
}

export function sceneLabel(p: Project, s: Scene): string {
  const ep = isEpisodic(p.axes.format) ? `Episode ${s.episode}, ` : '';
  return `${ep}Scene ${sceneNumber(p, s.id)}${s.heading.place ? ` (${s.heading.place})` : ''}`;
}

// ---------------- Readiness ----------------

export interface Issue {
  severity: 'blocking' | 'note';
  area: RevisionNote['area'] | 'production' | 'genre';
  text: string;
  sceneId?: string;
  module?: ModuleId;
  /**
   * Advice, not a fault: a prompt that only checks a text field is filled, or a suggestion about fit. Shown to help the
   * writer, but it never counts against the script's assessment or with backers, and resolving it earns nothing:
   * meaningless text could satisfy it (review, November 7, 2026).
   */
  advisory?: true;
}

/** Inspectable structural facts about the script. Blocking issues prevent approval. */
export function scriptIssues(p: Project): Issue[] {
  const out: Issue[] = [];
  const mods = projectModules(p);
  const nonfiction = isNonfiction(p.axes.format);
  if (!p.scenes.length) out.push({ severity: 'blocking', area: 'structure', text: 'Add at least one scene.' });
  if (p.axes.format === 'unscripted-series') {
    out.push(...unscriptedIssues(p));
    if (!p.worldRules.length) out.push({ severity: 'blocking', area: 'structure', text: 'Write the format rules for your show.' });
    for (const s of p.scenes.filter((x) => x.kind === 'segment' && !x.contributorIds.length)) {
      out.push({ severity: 'blocking', area: 'structure', text: `${sceneLabel(p, s)} has no host or participants.`, sceneId: s.id });
    }
  }
  for (let e = 1; e <= p.axes.episodeCount; e++) {
    if (isEpisodic(p.axes.format) && !p.scenes.some((s) => s.episode === e)) out.push({ severity: 'blocking', area: 'structure', text: `Episode ${e} has no scenes yet.` });
  }
  const order = new Map(p.scenes.map((s, i) => [s.id, i]));
  for (const s of p.scenes) {
    const label = sceneLabel(p, s);
    if (!s.heading.place.trim()) out.push({ severity: 'blocking', area: 'continuity', text: `${label} needs a place in its heading.`, sceneId: s.id });
    if (s.kind === 'scripted' && !s.participants.length && !s.action.trim()) {
      out.push({ severity: 'blocking', area: 'structure', text: `${label} has no characters and no action.`, sceneId: s.id });
    }
    if (s.kind === 'interview' && !s.contributorIds.length) out.push({ severity: 'blocking', area: 'structure', text: `${label} is an interview with no contributor.`, sceneId: s.id });
    if (!s.objective.trim() && s.kind === 'scripted') out.push({ severity: 'note', area: 'causality', text: `${label} has no stated objective.`, sceneId: s.id, advisory: true });
    for (const d of s.dialogue) {
      if (!s.participants.includes(d.characterId) && !s.intentionalDiscontinuity) {
        out.push({ severity: 'blocking', area: 'continuity', text: `${label} has dialogue for a character who isn't in the scene.`, sceneId: s.id });
        break;
      }
    }
    if (s.basis === 'sourced' && nonfiction && !s.evidenceIds.length && s.kind !== 'interview') {
      out.push({ severity: 'note', area: 'continuity', text: `${label} presents sourced material without a linked fact.`, sceneId: s.id });
    }
    if (mods.has('presentation') && p.axes.genres.some((g) => g.id === 'found-footage') && !s.operator?.trim()) {
      out.push({ severity: 'note', area: 'visual', text: `${label} needs an in-story camera operator.`, sceneId: s.id, module: 'presentation', advisory: true });
    }
    if (mods.has('tonal') && !s.tone?.trim()) out.push({ severity: 'note', area: 'pacing', text: `${label} has no tonal intention.`, sceneId: s.id, module: 'tonal', advisory: true });
    // An intimate scene in a project aimed at children or families is the genre's own convention check (the audience
    // module); for other projects the audience and the declared content are advice (audienceContentNote), never a block.
    // Until the review of November 7, 2026 every project's intimate scene blocked approval under a family audience.
    if (mods.has('audience') && s.intimacy && /child|famil|preschool/i.test(p.axes.audience)) {
      out.push({ severity: 'note', area: 'structure', text: `${label} is marked as an intimate scene in a project aimed at a ${p.axes.audience.toLowerCase()} audience. Check it suits them.`, sceneId: s.id, module: 'audience', advisory: true });
    }
  }
  const total = p.scenes.reduce((a, s) => a + s.estMinutes, 0);
  if (p.scenes.length && (p.axes.format === 'feature' || p.axes.format === 'documentary-feature') && total <= 40) {
    out.push({ severity: 'note', area: 'pacing', text: `Your scenes add up to ${Math.round(total)} minutes. A feature needs more than 40 to be treated as one.` });
  }
  if (p.scenes.length && (p.axes.format === 'short' || p.axes.format === 'documentary-short') && total > 40) {
    out.push({ severity: 'note', area: 'pacing', text: `Your scenes add up to ${Math.round(total)} minutes, which is longer than a short.` });
  }
  // Setups, clues and reveals: planted before paid, unless declared deliberately discontinuous.
  for (const sp of p.setups) {
    const kindWord = sp.kind === 'clue' ? 'clue' : sp.kind === 'reveal' ? 'reveal' : 'setup';
    if (!sp.plantedIn) out.push({ severity: 'note', area: 'continuity', text: `The ${kindWord} "${sp.label}" isn't planted in any scene.` });
    if (!sp.paidIn) out.push({ severity: 'note', area: 'continuity', text: `The ${kindWord} "${sp.label}" never pays off.` });
    if (sp.plantedIn && sp.paidIn && (order.get(sp.paidIn) ?? 0) < (order.get(sp.plantedIn) ?? 0)) {
      const pay = p.scenes.find((s) => s.id === sp.paidIn);
      if (!pay?.intentionalDiscontinuity) {
        out.push({ severity: 'blocking', area: 'continuity', text: `The ${kindWord} "${sp.label}" pays off before it's planted.`, sceneId: sp.paidIn });
      }
    }
  }
  const needLedger = (m: ModuleId, kinds: string[], text: string) => {
    if (mods.has(m) && !p.setups.some((x) => kinds.includes(x.kind))) out.push({ severity: 'note', area: 'structure', text, module: m });
  };
  needLedger('clues', ['clue'], 'Add the clues your audience can follow.');
  needLedger('setups', ['setup', 'gag', 'foreshadowing'], 'Add the setups your payoffs depend on.');
  needLedger('threat', ['reveal', 'foreshadowing'], 'Plan how the threat is revealed.');
  if (mods.has('world-rules') && !p.worldRules.length) out.push({ severity: 'note', area: 'continuity', text: 'Record the rules of your story world.', module: 'world-rules', advisory: true });
  if (mods.has('relationships') && !p.relationships.length) out.push({ severity: 'note', area: 'characterization', text: 'Record how the central relationships change.', module: 'relationships', advisory: true });
  if (mods.has('journey') && new Set(p.scenes.map((s) => s.storyLocation || s.heading.place)).size < 2) {
    out.push({ severity: 'note', area: 'structure', text: 'A journey story needs more than one place.', module: 'journey' });
  }
  if (mods.has('music') && !p.scenes.some((s) => s.dance || (p.songs ?? []).some((x) => x.uses.some((u) => u.sceneId === s.id)))) out.push({ severity: 'note', area: 'structure', text: 'No scene has a song or dance yet.', module: 'music' });
  if (mods.has('factual') && p.evidence.some((e) => !e.verified && e.status !== 'dramatized')) {
    out.push({ severity: 'note', area: 'continuity', text: 'Some claims haven\'t been checked yet.', module: 'factual' });
  }
  if (mods.has('creature')) {
    for (const c of p.characters) {
      if (c.entity !== 'human' && c.realization === 'performer' && p.axes.medium !== 'animation') {
        out.push({ severity: 'note', area: 'visual', text: `Choose how ${c.name} will be realized on screen.`, module: 'creature' });
      }
    }
  }
  if (mods.has('anthology')) {
    for (const c of p.characters) {
      const eps = new Set(p.scenes.filter((s) => s.participants.includes(c.id)).map((s) => s.episode));
      if (eps.size > 1 && !(p.genreNotes['shared-link-between-stories'] ?? '').trim()) {
        out.push({ severity: 'note', area: 'continuity', text: `${c.name} appears in more than one story. Describe the shared link if that's intended.`, module: 'anthology', advisory: true });
      }
    }
  }
  // Word-count notes on dialogue minutes and page counts were removed in the review of November 7, 2026: a rule of thumb
  // isn't a fault, and each open note cost quality. The scene editor shows the spoken length instead. So was a note on a
  // guest part written into several episodes: recurring guest parts are common.
  for (const c of p.characters) {
    if (c.entity !== 'human' && !c.entityNote.trim()) out.push({ severity: 'note', area: 'visual', text: `Describe what kind of being ${c.name} is, for design and casting.`, advisory: true });
  }
  if (p.axes.genres.some((g) => g.id === 'animated' || g.id === 'anime') && p.axes.medium === 'live-action') {
    out.push({ severity: 'blocking', area: 'structure', text: 'This project is tagged as animated, but its medium is live action. Change the medium or the tag.', module: 'animation-medium' });
  }
  // Open convention questions are advice, never a quota.
  const { questions } = composeGenres(p.axes.genres.map((g) => g.id));
  for (const q of questions) {
    if (!(p.genreNotes[q.key] ?? '').trim()) out.push({ severity: 'note', area: 'structure', text: `Open question for ${q.genres.join(' and ')}: ${q.label}.`, module: undefined, advisory: true });
  }
  // Acts and threads: advice by scene, never a block and never a score (structure.ts).
  for (const n of researchNotes(p)) out.push({ severity: 'note', area: 'continuity', text: n.text, sceneId: n.sceneId, advisory: true });
  for (const n of seasonNotes(p)) out.push({ severity: 'note', area: 'structure', text: n.text, advisory: true });
  for (const n of structureNotes(p)) out.push({ severity: 'note', area: 'structure', text: n.text, ...(n.sceneId ? { sceneId: n.sceneId } : {}), advisory: true });
  return out;
}

// ---------------- Drafts ----------------

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
export function ordinal(n: number): string {
  return ORDINALS[n - 1] ?? `${n}th`;
}

export function diffDrafts(before: { scenes: Scene[]; characters: StoryCharacter[] } | null, after: { scenes: Scene[]; characters: StoryCharacter[] }): string[] {
  if (!before) return [];
  const out: string[] = [];
  const b = new Map(before.scenes.map((s) => [s.id, s]));
  const a = new Map(after.scenes.map((s) => [s.id, s]));
  const added = after.scenes.filter((s) => !b.has(s.id));
  const removed = before.scenes.filter((s) => !a.has(s.id));
  const changed = after.scenes.filter((s) => b.has(s.id) && JSON.stringify(b.get(s.id)) !== JSON.stringify(s));
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const lastBefore = before.scenes[before.scenes.length - 1]?.id;
  const lastAfter = after.scenes[after.scenes.length - 1]?.id;
  if (lastBefore !== lastAfter || (lastAfter && b.has(lastAfter) && JSON.stringify(b.get(lastAfter)) !== JSON.stringify(a.get(lastAfter)))) {
    out.push(added.length ? `The new ending adds ${plural(added.length, 'scene')}.` : 'The ending has changed.');
  } else if (added.length) out.push(`It adds ${plural(added.length, 'scene')}.`);
  if (removed.length) out.push(`It cuts ${plural(removed.length, 'scene')}.`);
  if (changed.length) out.push(`${plural(changed.length, 'scene')} changed.`);
  const newChars = after.characters.filter((c) => !before.characters.some((x) => x.id === c.id));
  if (newChars.length) out.push(`It introduces ${newChars.map((c) => c.name).join(' and ')}.`);
  if (!out.length) out.push('Nothing changed since the last draft.');
  return out;
}

export function saveDraft(state: GameState, p: Project, label = ''): Draft {
  assertEditable(p);
  const prev = p.drafts[p.drafts.length - 1] ?? null;
  const number = (prev?.number ?? 0) + 1;
  const diff = diffDrafts(prev, { scenes: p.scenes, characters: p.characters });
  const draft: Draft = {
    number, savedAt: state.now, label: label.trim() || `Draft ${number}`, summary: diff.join(' '), scenes: clone(p.scenes), characters: clone(p.characters), approved: false,
  };
  p.drafts.push(draft);
  const lead = `Your ${ordinal(number)} draft is saved.`;
  addLog(state, prev ? `${lead} ${draft.summary}` : lead, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'script' } });
  return draft;
}

export function restoreDraft(p: Project, number: number): void {
  assertEditable(p);
  const d = p.drafts.find((x) => x.number === number);
  if (!d) throw new Error('That draft no longer exists.');
  p.scenes = clone(d.scenes);
  p.characters = clone(d.characters);
}

export function renameDraft(p: Project, number: number, label: string): void {
  const d = p.drafts.find((x) => x.number === number);
  if (!d) throw new Error('That draft no longer exists.');
  if (!label.trim()) throw new Error('Enter a name.');
  d.label = label.trim();
}

export function workingCopyDiffersFromLatestDraft(p: Project): boolean {
  const d = p.drafts[p.drafts.length - 1];
  if (!d) return p.scenes.length > 0 || p.characters.length > 0;
  return JSON.stringify(d.scenes) !== JSON.stringify(p.scenes) || JSON.stringify(d.characters) !== JSON.stringify(p.characters);
}

// ---------------- Revision passes (take scheduled time) ----------------

export function addNote(state: GameState, p: Project, text: string, area: RevisionNote['area'], sceneId: string | null): RevisionNote {
  if (!text.trim()) throw new Error('Write the note first.');
  const n: RevisionNote = { id: newId(state, 'n'), text: text.trim(), area, sceneId, status: 'open', source: 'player' };
  p.notes.push(n);
  return n;
}

/**
 * Turn a readiness check into a revision note (source 'readiness'). Only a check the script really has now can be
 * added, once; its quality credit comes later, only when a revision has addressed it and the check no longer appears.
 */
export function noteFromIssue(state: GameState, p: Project, text: string): RevisionNote {
  const issue = scriptIssues(p).find((i) => i.text === text && i.severity === 'note');
  if (!issue) throw new Error('That readiness check no longer applies.');
  if (p.notes.some((n) => n.source === 'readiness' && n.text === text && n.status !== 'addressed')) throw new Error('That check is already in your revision notes.');
  const n: RevisionNote = { id: newId(state, 'n'), text, area: issue.area === 'production' ? 'continuity' : issue.area === 'genre' ? 'structure' : issue.area, sceneId: issue.sceneId ?? null, status: 'open', source: 'readiness', ...(issue.advisory ? { advisory: true } : {}) };
  p.notes.push(n);
  return n;
}

export function setNoteStatus(p: Project, id: string, status: 'accepted' | 'rejected' | 'open'): void {
  const n = p.notes.find((x) => x.id === id);
  if (!n) throw new Error('That note no longer exists.');
  if (n.status === 'addressed') throw new Error('That note has already been addressed.');
  n.status = status;
}

/** Working default: each accepted note takes two working hours of rewriting, minimum four hours. */
export function revisionDurationHours(noteCount: number): number {
  return Math.max(4, noteCount * 2);
}

/** A revision pass takes scheduled time; clicking repeatedly cannot raise quality instantly. */
export function startRevision(state: GameState, p: Project): { endsAt: number } {
  assertEditable(p);
  if (p.revision) throw new Error('A revision pass is already underway.');
  const accepted = p.notes.filter((n) => n.status === 'accepted');
  if (!accepted.length) throw new Error('Accept at least one note to revise.');
  const endsAt = state.now + revisionDurationHours(accepted.length) * 3600_000;
  p.revision = { endsAt, noteIds: accepted.map((n) => n.id) };
  schedule(state, endsAt, 'revision-done', { projectId: p.id }, { attention: 'notify', priority: 40 });
  return { endsAt };
}

registerHandler('revision-done', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  if (!p || !p.revision) return { suppressInterrupt: true };
  const ids = p.revision.noteIds;
  for (const n of p.notes) if (ids.includes(n.id) && n.status === 'accepted') n.status = 'addressed';
  p.revision = null;
  p.revisionPasses += 1;
  const text = `Your revision pass on ${p.title} is finished. ${ids.length} ${ids.length === 1 ? 'note was' : 'notes were'} addressed.`;
  addLog(state, text, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'script' } });
  return { message: text };
});

// ---------------- Breakdown ----------------

function slug(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
}

export function sceneTechnique(p: Project, s: Scene): Technique | 'live' {
  if (p.axes.medium === 'live-action') return 'live';
  if (p.axes.medium === 'animation') return s.technique && s.technique !== 'none' ? s.technique : p.axes.technique;
  return s.technique && s.technique !== 'none' ? s.technique : 'live';
}

/** Derive production requirements from the approved draft. Every item links back to scenes. */
export function deriveRequirements(p: Project, scenes: Scene[], characters: StoryCharacter[]): Requirement[] {
  const mods = projectModules(p);
  const reqs = new Map<string, Requirement>();
  const add = (kind: Requirement['kind'], label: string, sceneId: string | null, qty = 1, note = '') => {
    const key = `${kind}:${slug(label)}`;
    const r = reqs.get(key) ?? { key, kind, label, sceneIds: [], qty: 0, status: 'needed' as const, note };
    if (sceneId && !r.sceneIds.includes(sceneId)) r.sceneIds.push(sceneId);
    r.qty = Math.max(r.qty, qty);
    reqs.set(key, r);
  };
  const charById = new Map(characters.map((c) => [c.id, c]));
  for (const s of scenes) {
    const tech = sceneTechnique(p, s);
    const live = tech === 'live';
    for (const cid of s.participants) {
      const c = charById.get(cid);
      if (!c) continue;
      if (c.roleSize !== 'background') add('performer', c.name, s.id);
      if (!live) {
        if (tech === 'stop-motion') add('puppet', c.name, s.id);
        else if (tech === '3d-cg') {
          add('model', c.name, s.id);
          add('rig', c.name, s.id);
        } else add('character-design', c.name, s.id);
      } else if (makeup(c.look?.makeup)) {
        // A makeup method owns the character's look (looks.ts): it is tested, built and applied as that method says, and
        // isn't also charged as a creature effect.
        if (c.roleSize !== 'background') add('makeup', c.name, s.id, statesOf(c), makeup(c.look?.makeup)!.label);
      } else if (c.entity !== 'human' && c.realization !== 'performer') {
        add('creature', c.name, s.id, 1, c.realization);
      }
      if (live && c.roleSize !== 'background' && wardrobe(c.look?.wardrobe)) add('costume', c.name, s.id, costumeCopies(c, scenes), wardrobe(c.look?.wardrobe)!.label);
    }
    const place = s.storyLocation || s.heading.place;
    if (place) {
      if (live) add('location', place, s.id, 1, s.heading.intExt === 'EXT' ? 'Exterior' : 'Interior');
      else if (tech === 'stop-motion') add('set', place, s.id, 1, 'Miniature set');
      else if (tech === '3d-cg') add('model', `${place} Environment`, s.id);
      else add('background-art', place, s.id);
    }
    s.props.forEach((x) => add('prop', x, s.id));
    if (live) {
      s.animals.forEach((x) => add('animal', x, s.id));
      s.vehicles.forEach((x) => add('vehicle', x, s.id));
      if (s.stunts.trim()) add('stunt', s.stunts.trim(), s.id);
      if (s.crowd > 0) add('crowd', place || 'Crowd', s.id, physicalCrowd(s), digitalCrowd(s) ? `${s.crowd} on screen, the rest added in post` : '');
      if (s.crowd > 0 && makeup(s.crowdLook)) add('makeup', `Background: ${place || 'Crowd'}`, s.id, physicalCrowd(s), makeup(s.crowdLook)!.label);
      if (s.intimacy) add('intimacy', sceneLabel(p, s), s.id);
      if (s.water) add('water', place || 'Water Work', s.id);
    } else if (s.crowd > 0) add('crowd', place || 'Crowd', s.id, s.crowd, 'Animated crowd');
    s.vfx.forEach((x) => add('vfx', x, s.id));
    for (const { song } of songUses(p, [s])) add('song', song.title, s.id, 1, songStatus(song));
    if (s.dance) add('choreography', place || 'Dance', s.id);
    if (s.kind === 'archival') add('archival', place || 'Archive Material', s.id);
    if (s.kind === 'interview') s.contributorIds.forEach((cid) => add('interview', p.contributors.find((c) => c.id === cid)?.name ?? 'Contributor', s.id));
    if (mods.has('combat') && s.stunts.trim() && live) add('stunt', `Fight Choreography: ${s.stunts.trim()}`, s.id);
  }
  for (const c of p.contributors) add('consent', c.name, null);
  for (const e of p.evidence) if (e.status !== 'dramatized') add('fact-check', e.claim.slice(0, 60), null);
  // A declared story year decides it (looks.ts periodBand), whatever the genres; without one, the older rule reads the genre.
  const band = projectBand(p);
  if (band ? band !== 'present' : mods.has('period') && !/contemporary|present/i.test(p.axes.storyEra)) add('period-research', band ? String(p.axes.storyYear) : p.axes.storyEra || 'Period', null);
  // A story set in another country than the production base: the designers research it, as they do a period.
  const setting = p.axes.settingPlaceId ? findPlace(p.axes.settingPlaceId) : undefined;
  if (setting && setting.country !== findPlace(p.axes.basePlaceId)?.country) add('setting-research', `${setting.name}, ${setting.countryName}`, null);
  if (mods.has('clues')) {
    for (const sp of p.setups.filter((x) => x.kind === 'clue')) add('clue-prop', sp.label, sp.plantedIn);
  }
  return [...reqs.values()].map((r) => {
    const prev = p.requirements.find((x) => x.key === r.key);
    return prev?.status === 'waived' ? { ...r, status: 'waived' as const, note: prev.note } : r;
  });
}

/** Roles that exist only for one kind of requirement: with none of it left, the person is booked for nothing. */
const ROLE_FOR_KIND: Partial<Record<Requirement['kind'], string[]>> = {
  stunt: ['stunt-coordinator', 'fight-choreographer'], animal: ['animal-wrangler'], water: ['marine-coordinator'],
  intimacy: ['intimacy-coordinator'], choreography: ['choreographer'],
};

/**
 * What approving a draft strands when it no longer needs something (SLATE-06-03.02, November 8, 2026): the requirement
 * itself, anyone booked only for that kind of work, and anything already made for it. Said before approving; nothing is
 * released or thrown away by approval itself, so the player decides.
 */
export function requirementRemovalImpact(state: GameState, p: Project, number: number): string[] {
  const d = p.drafts.find((x) => x.number === number);
  if (!d || p.approvedDraft === null) return [];
  const next = deriveRequirements(p, d.scenes, d.characters);
  const nextKeys = new Set(next.map((r) => r.key));
  const removed = p.requirements.filter((r) => !nextKeys.has(r.key));
  const out: string[] = [];
  for (const r of removed) {
    out.push(`No longer needs ${r.label} (${requirementKindLabel(r.kind)}).`);
    const made = p.assets.filter((a) => (a.version > 1 || a.ready) && (a.label.toLowerCase().includes(r.label.toLowerCase()) || (a.characterId && r.key.endsWith(a.characterId))));
    for (const a of made) out.push(`${a.label} was already made for it. It is kept, unused.`);
  }
  for (const [kind, roles] of Object.entries(ROLE_FOR_KIND) as [Requirement['kind'], string[]][]) {
    if (!removed.some((r) => r.kind === kind) || next.some((r) => r.kind === kind)) continue;
    for (const h of p.hires.filter((x) => x.status === 'accepted' && roles.includes(x.roleId))) {
      out.push(`${personById(state, h.personId).name} (${roleLabel(h.roleId)}) is still booked with nothing of that kind left to do. Release them in Crew if you don't need them; work done stays paid.`);
    }
  }
  // A part that left the script takes nobody's contract with it (the v3 package, 01 section 4): each is named, and stays until the player ends it.
  const still = new Set(d.characters.map((c) => c.id));
  for (const h of p.hires) {
    if (!h.characterId || still.has(h.characterId) || !['accepted', 'offered', 'countered'].includes(h.status)) continue;
    out.push(`${personById(state, h.personId).name} ${h.status === 'accepted' ? 'is contracted' : 'has an offer'} to play ${characterName(p, h.characterId)}, who is not in this draft. The ${h.status === 'accepted' ? 'contract' : 'offer'} stays as agreed until you ${h.status === 'accepted' ? 'release' : 'withdraw'} it in Cast; what was paid stays paid.`);
  }
  return out;
}

export function approveDraft(state: GameState, p: Project, number: number): { requirementChanges: string[] } {
  assertEditable(p);
  const d = p.drafts.find((x) => x.number === number);
  if (!d) throw new Error('That draft no longer exists.');
  const current = { ...p, scenes: d.scenes, characters: d.characters } as Project;
  const blocking = scriptIssues(current).filter((i) => i.severity === 'blocking');
  if (blocking.length) throw new Error(`This draft can't be approved yet. ${blocking[0].text}`);
  const before = p.requirements;
  const prevApproved = p.drafts.find((x) => x.number === p.approvedDraft) ?? null;
  // A delivered episode's script is final (episode-delivery.ts): a draft may change only the episodes still being made.
  const done = p.delivered ? [] : Object.keys(p.episodeDeliveries ?? {}).map(Number);
  const changed = done.find((n) => JSON.stringify((prevApproved?.scenes ?? []).filter((s) => s.episode === n)) !== JSON.stringify(d.scenes.filter((s) => s.episode === n)));
  if (changed) throw new Error(`Episode ${changed} is delivered, so its scenes can't change. Change only episodes still being made.`);
  const next = deriveRequirements(p, d.scenes, d.characters);
  p.drafts.forEach((x) => (x.approved = x.number === number));
  p.approvedDraft = number;
  p.requirements = next;
  if (p.phase === 'development') p.phase = 'pre-production';
  const changes: string[] = [];
  const beforeKeys = new Set(before.map((r) => r.key));
  const nextKeys = new Set(next.map((r) => r.key));
  for (const r of next) if (!beforeKeys.has(r.key)) changes.push(`Needs ${r.label} (${requirementKindLabel(r.kind)}).`);
  for (const r of before) if (!nextKeys.has(r.key)) changes.push(`No longer needs ${r.label} (${requirementKindLabel(r.kind)}).`);
  p.history.push({ at: state.now, text: `Approved draft ${number}.` });
  for (const fn of approvalHooks) fn(state, p, d, prevApproved);
  addLog(state, `You approved the ${ordinal(number)} draft of ${p.title}.${changes.length && before.length ? ` ${changes.length} production ${changes.length === 1 ? 'requirement changed' : 'requirements changed'}.` : ''}`, 'project', {
    projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'overview' },
  });
  return { requirementChanges: changes };
}

const approvalHooks: ((s: GameState, p: Project, d: Draft, prev: Draft | null) => void)[] = [];
export function onDraftApproved(fn: (s: GameState, p: Project, d: Draft, prev: Draft | null) => void): void {
  approvalHooks.push(fn);
}

export function approvedScenes(p: Project): Scene[] {
  const d = p.drafts.find((x) => x.number === p.approvedDraft);
  return d ? d.scenes : [];
}
export function approvedCharacters(p: Project): StoryCharacter[] {
  const d = p.drafts.find((x) => x.number === p.approvedDraft);
  return d ? d.characters : [];
}

export const REQUIREMENT_LABELS: Record<Requirement['kind'], string> = {
  'character-design': 'Character Design', performer: 'Performer', location: 'Location', set: 'Set', prop: 'Prop', costume: 'Costume',
  animal: 'Animal', vehicle: 'Vehicle', stunt: 'Stunt', crowd: 'Crowd', intimacy: 'Intimacy Coordination', water: 'Water Work', vfx: 'Visual Effect',
  song: 'Song', choreography: 'Choreography', creature: 'Creature Effect', archival: 'Archive Material', interview: 'Interview',
  'language-coach': 'Language Coaching', 'period-research': 'Period Research', 'setting-research': 'Setting Research', 'clue-prop': 'Hero Prop', puppet: 'Puppet', model: '3D Model',
  rig: 'Rig', 'background-art': 'Background Art', consent: 'Contributor Consent', 'fact-check': 'Fact Check', makeup: 'Makeup And Hair',
};

export function requirementKindLabel(k: Requirement['kind']): string {
  return REQUIREMENT_LABELS[k];
}

export function projectGenreLabel(p: Project): string {
  return p.axes.genres.map((g) => genreName(g.id)).join(', ');
}

/** Scenes of a draft that differ from (or are new since) the approved draft. */
export function changedSince(prev: { scenes: Scene[] } | null, next: { scenes: Scene[] }): Set<string> {
  const before = new Map((prev?.scenes ?? []).map((sc) => [sc.id, JSON.stringify(sc)]));
  return new Set(next.scenes.filter((sc) => before.get(sc.id) !== JSON.stringify(sc)).map((sc) => sc.id));
}
