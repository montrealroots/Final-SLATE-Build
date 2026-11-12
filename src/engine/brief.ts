// Ideas the player can choose instead of typing, and the one way any of them is applied (November 11, 2026; the
// Creative Depth package, milestone B, docs/creative-depth/package/01-MASTER-BUILD-SPEC.md section 3).
//
// An idea is a record: a label, a sentence, and a patch. A patch is a list of commands from the fixed set below, each of
// which sets a field the game already has by calling the function the page's own controls call. Nothing in an idea is
// code, and nothing an idea sets is hidden: what a pick changed is what the fields now say.
//
// Two kinds of thing an idea can set, never confused:
// - words (a premise, a conflict, what a character wants). The game keeps them and never reads them for meaning. They are
//   the player's to edit; an edited field is the player's own again.
// - choices the game's engines read (a makeup method, where a costume comes from, a crowd made partly in post, a shot
//   plan, a genre, the year the story is set in). Each names the code that reads it (`consumers`).
//
// A pick is recorded on the project with the idea's ID and version, never its text: `p.brief.picks`.
//
// The ideas themselves are in src/ideas/, loaded when the picker opens. This module is small and holds no catalog.
import { money } from './budget';
import { LIGHTS, RIGS, SCORES, SOUNDS, soundsOf, type Light, type Rig, type Score, type SoundChoice } from './craft';
import { MAKEUP, WARDROBE, costumeCopies, makeup, makeupShare, physicalCrowd, statesOf, wardrobe, wardrobeMismatch, MAX_STATES, type MakeupId, type WardrobeId } from './looks';
import { addCharacter, addScene, assertEditable, setGenres, updateCharacter, updateScene } from './projects';
import { newId } from './state';
import type { Format, GameState, IntExt, Medium, Project, Scene, StoryCharacter, Technique, TimeOfDay } from './types';

export type StoryField = 'logline' | 'premise' | 'stakes' | 'conflict' | 'viewpoint' | 'theme' | 'ending' | 'intendedExperience' | 'question';
export type CharacterField = 'wants' | 'fears' | 'description' | 'entityNote';
/** A scene's own words: what it is for, what happens, what turns. Kept, never read for meaning. */
export type SceneField = 'objective' | 'action' | 'turningPoint' | 'tone';
export const SCENE_LABEL: Record<SceneField, string> = { objective: 'Objective', action: 'Action', turningPoint: 'Turning Point', tone: 'Tonal Intention' };
/** What a scene needs on the day, as lists the breakdown reads: each entry is work, crew or money. */
export type NeedKind = 'props' | 'animals' | 'vehicles' | 'vfx';
export const NEED_LABEL: Record<NeedKind, string> = { props: 'Props', animals: 'Animals', vehicles: 'Vehicles', vfx: 'Visual Effects' };
const NEED_WORK: Record<NeedKind, string> = {
  props: 'Each prop is found or made by the art department before the shoot.',
  animals: 'An animal wrangler is required for every scene with an animal in it.',
  vehicles: 'A vehicle coordinator is required for every scene with a picture vehicle in it.',
  vfx: 'Each effect is four days of visual effects work after the picture is locked, which the colour grade waits for, and its scene needs inserts.',
};

/** A scene an idea offers. The player chooses which to add; none is added without being ticked. */
export interface Beat {
  place: string;
  intExt: IntExt;
  time: TimeOfDay;
  /** What the scene is for, in a sentence, with {slots}. */
  objective: string;
  minutes: number;
  crowd?: number;
  crowdLook?: MakeupId;
  stunts?: string;
  water?: boolean;
  /** Who is in it, by the slot names the idea's characters use. */
  with?: string[];
}

export type Command =
  | { op: 'story'; field: StoryField; text: string }
  | { op: 'tone'; text: string }
  | { op: 'setting'; text: string }
  | { op: 'style'; era: string | null }
  | { op: 'year'; year: number | null }
  | { op: 'genre'; id: string; emphasis: 'primary' | 'secondary' }
  | { op: 'medium'; medium: Medium; technique: Technique }
  | { op: 'rule'; rule: string; limit: string }
  | { op: 'character'; field: CharacterField; text: string }
  | { op: 'look'; makeup?: MakeupId | null; wardrobe?: WardrobeId | null; states?: number }
  | { op: 'narrator' }
  | { op: 'crowd'; method?: 'digital' | 'practical'; look?: MakeupId | null }
  | { op: 'stunt'; text: string }
  | { op: 'scene'; field: SceneField; text: string }
  | { op: 'season'; text: string }
  | { op: 'needs'; kind: NeedKind; items: string[] }
  | { op: 'shot'; coverage?: 'master' | 'standard' | 'full'; takes?: 'one' | 'few' | 'many'; emphasis?: 'scene' | 'performances' | 'detail' | 'one-shot'; rig?: Rig }
  | { op: 'light'; light: Light }
  | { op: 'sound'; add: SoundChoice }
  | { op: 'score'; score: Score }
  | { op: 'beats'; beats: Beat[] }
  | { op: 'cast'; parts: { slot: string; name: string; size: StoryCharacter['roleSize']; entity?: StoryCharacter['entity']; wants?: string }[] };

/** Where an idea is offered: the field its picker hangs on. */
export type IdeaField =
  | 'premise' | 'logline' | 'conflict' | 'stakes' | 'theme' | 'ending' | 'tone' | 'experience' | 'world-rule' | 'period' | 'style' | 'genre-blend' | 'medium'
  | 'character-goal' | 'character-fear' | 'makeup' | 'wardrobe' | 'crowd' | 'camera' | 'light' | 'sound' | 'score' | 'location' | 'physical-comedy'
  | 'genre-route' | 'season-arc' | 'scene-tone' | 'character-being' | 'viewpoint' | 'question' | 'setting' | 'character-description' | 'scene-objective' | 'scene-action' | 'scene-turn' | 'props' | 'animals' | 'vehicles' | 'effects';

/** What an idea's choices apply to: the project, the characters the player picks, or the scenes they pick. */
export type IdeaScope = 'project' | 'character' | 'scene';

/**
 * - mechanical: sets something an engine reads; `consumers` names the readers and `tests` the comparisons.
 * - brief: words the player keeps and edits, read by no engine; its consumer is the document it is part of.
 * - reference: a note for the departments, by design changing nothing.
 */
export type IdeaKind = 'mechanical' | 'brief' | 'reference';

export interface Idea {
  id: string;
  /** Raised when the idea's patch changes. A pick keeps the version it was applied at. */
  v: number;
  field: IdeaField;
  label: string;
  /** One sentence the card shows. Original writing; never a real work's plot. */
  text: string;
  kind: IdeaKind;
  scope: IdeaScope;
  tags: string[];
  /** Where it suits: shown as why it is recommended, never used to hide the rest. */
  fits?: { genres?: string[]; formats?: Format[]; media?: Medium[] };
  /** Ideas that can't be held together with it on the same target. */
  excludes?: string[];
  /** It adds to a set (a sound choice): choosing it leaves the field's other choices in place. */
  adds?: true;
  patch: Command[];
  /** The code that reads what the patch sets: file and function, or the document it belongs to. */
  consumers: string[];
  /** Test names that compare outcomes with and without it (for a mechanical idea), or that check its application. */
  tests: string[];
  /** Words the player fills in: a town's name, a lead's. Each has a suggestion the player can change. */
  slots?: { key: string; label: string; suggest: string }[];
}

/** What the player chose to apply an idea to, and how. */
export interface Target {
  characterIds?: string[];
  sceneIds?: string[];
  /** Which offered scenes to add, by index. */
  beats?: number[];
  /** The player's words for each slot. */
  slots?: Record<string, string>;
  /** Fields with words already in them that the player chose to keep: the idea leaves those alone. */
  keep?: string[];
}

export interface IdeaPick { id: string; v: number; field: IdeaField; at: number; characterIds?: string[]; sceneIds?: string[]; /** It adds to a set (a sound choice): a later pick for the same field leaves it in place. */ adds?: true }
export interface Brief {
  picks: IdeaPick[];
  /** Ideas the player marked to come back to, by ID. */
  saved?: string[];
}

// ---------------- Words ----------------

/** Fill an idea's {slots} with the player's words, or its suggestions. Never returns a brace. */
export function fill(text: string, idea: Pick<Idea, 'slots'>, slots: Record<string, string> = {}): string {
  const out = text.replace(/\{(\w+)\}/g, (_m, k: string) => (slots[k]?.trim() || idea.slots?.find((x) => x.key === k)?.suggest || '').trim());
  return out.replace(/[{}]/g, '').replace(/\s{2,}/g, ' ').replace(/\s+([,.;:])/g, '$1').trim();
}

const STORY_LABEL: Record<StoryField, string> = { logline: 'Logline', premise: 'Premise', stakes: 'Stakes', conflict: 'Central Conflict', viewpoint: 'Point Of View', theme: 'Theme', ending: 'Intended Ending', intendedExperience: 'Intended Experience', question: 'Central Question' };
const CHARACTER_LABEL: Record<CharacterField, string> = { wants: 'What They Want', fears: 'What They Fear', description: 'Description', entityNote: 'What Kind Of Being' };

const names = (xs: string[]): string => (xs.length <= 1 ? xs[0] ?? '' : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
const hours = (min: number): string => { const h = Math.floor(min / 60); const m = Math.round(min % 60); return h ? `${h} ${h === 1 ? 'hour' : 'hours'}${m ? ` ${m} minutes` : ''}` : `${m} minutes`; };
const usd = (n: number): string => `$${Math.round(n).toLocaleString('en-US')}`;

// ---------------- Preview ----------------

export interface IdeaPreview {
  /** What would be written or set, field by field. */
  changes: string[];
  /** Words already in a field the idea would write: the player chooses to replace or keep each. */
  overwrites: { key: string; label: string; current: string }[];
  /** What the choice makes: work, people, days, money. Empty for words alone. */
  work: string[];
  /** Things to know before choosing. */
  warnings: string[];
  /** Why it can't be applied as asked, or null. */
  refusal: string | null;
}

const targetChars = (p: Project, t: Target) => p.characters.filter((c) => t.characterIds?.includes(c.id));
const targetScenes = (p: Project, t: Target) => p.scenes.filter((s) => t.sceneIds?.includes(s.id));

/**
 * What applying an idea would do, without doing it. Pure: nothing is changed, and calling it twice says the same thing.
 * The work lines are read from the same registries the engines read (looks.ts), so they can't promise something the
 * schedule won't do.
 */
export function previewIdea(p: Project, idea: Idea, t: Target = {}): IdeaPreview {
  const out: IdeaPreview = { changes: [], overwrites: [], work: [], warnings: [], refusal: null };
  if (p.delivered) out.refusal = 'This project has been delivered. Its script is locked.';
  else if (p.shelved) out.refusal = 'This project is shelved. Take it up again to make changes.';
  const chars = targetChars(p, t);
  const scenes = targetScenes(p, t);
  if (!out.refusal && idea.scope === 'character' && !chars.length) out.refusal = p.characters.length ? 'Choose who this is for.' : 'Add a character first: this applies to a character.';
  if (!out.refusal && idea.scope === 'scene' && !scenes.length) out.refusal = p.scenes.length ? 'Choose the scenes this is for.' : 'Add a scene first: this applies to scenes.';
  const live = p.axes.medium !== 'animation';
  const overwrite = (key: string, label: string, current: string, next: string) => {
    if (current.trim() && current.trim() !== next.trim()) out.overwrites.push({ key, label, current });
  };
  for (const c of idea.patch) {
    switch (c.op) {
      case 'story': { const next = fill(c.text, idea, t.slots); out.changes.push(`${STORY_LABEL[c.field]}: ${next}`); overwrite(`story.${c.field}`, STORY_LABEL[c.field], p.story[c.field], next); break; }
      case 'tone': { const next = fill(c.text, idea, t.slots); out.changes.push(`Tone: ${next}`); overwrite('tone', 'Tone', p.axes.tone, next); break; }
      case 'setting': { const next = fill(c.text, idea, t.slots); out.changes.push(`Story Setting: ${next}`); overwrite('setting', 'Story Setting', p.axes.storySetting, next); break; }
      case 'style': out.changes.push(c.era ? `The Look It Borrows: ${fill(c.era, idea, t.slots)}. A reference for the departments; it changes no work and no date.` : 'The Look It Borrows: none.'); break;
      case 'year':
        out.changes.push(c.year === null ? 'The Year It Is Set In: not declared.' : `The Year It Is Set In: ${c.year}.`);
        break;
      case 'genre': out.changes.push(`Genre: adds a ${c.emphasis} genre.`); break;
      case 'medium':
        out.changes.push(`How It Is Made: ${c.medium === 'live-action' ? 'live action' : c.medium === 'hybrid' ? 'live action with animation' : `animation (${c.technique.replace('-', ' ')})`}.`);
        if (p.approvedDraft !== null) out.refusal ??= 'How a project is made is settled once a draft is approved: its people and its schedule are built on it.';
        if (c.medium === 'animation' && p.axes.medium !== 'animation' && p.characters.some((ch) => ch.methods.includes('on-camera'))) out.changes.push('Parts played on camera become voice parts.');
        if (c.medium !== 'animation' && p.axes.medium === 'animation' && p.characters.some((ch) => ch.methods.includes('voice'))) out.changes.push('Voice parts become parts played on camera.');
        break;
      case 'rule': out.changes.push(`Story World Rule: ${fill(c.rule, idea, t.slots)}${c.limit ? ` (${fill(c.limit, idea, t.slots)})` : ''}`); break;
      case 'character':
        for (const ch of chars) { const next = fill(c.text, idea, t.slots); out.changes.push(`${ch.name}, ${CHARACTER_LABEL[c.field]}: ${next}`); overwrite(`character.${ch.id}.${c.field}`, `${ch.name}: ${CHARACTER_LABEL[c.field]}`, ch[c.field], next); }
        break;
      case 'narrator': for (const ch of chars) out.changes.push(`${ch.name} narrates.`); if (chars.length) out.work.push('A narration recording session after the picture is locked, which every final mix waits for.'); break;
      case 'look': {
        const m = c.makeup ? makeup(c.makeup) : undefined;
        const w = c.wardrobe ? wardrobe(c.wardrobe) : undefined;
        for (const ch of chars) {
          const next: StoryCharacter = { ...ch, look: { ...ch.look, ...(c.makeup !== undefined ? { makeup: c.makeup ?? undefined } : {}), ...(c.wardrobe !== undefined ? { wardrobe: c.wardrobe ?? undefined } : {}), ...(c.states !== undefined ? { states: c.states } : {}) } };
          if (m) out.changes.push(`${ch.name}, Makeup: ${m.label}.`);
          if (c.makeup === null) out.changes.push(`${ch.name}, Makeup: no method.`);
          if (w) out.changes.push(`${ch.name}, Costume: ${w.label}.`);
          if (c.wardrobe === null) out.changes.push(`${ch.name}, Costume: with the others.`);
          if (c.states !== undefined) out.changes.push(`${ch.name}, Appearance States: ${statesOf(next)}.`);
          const mm = makeup(next.look?.makeup);
          if (mm && (m || c.states !== undefined)) {
            if (!live) out.warnings.push(`${p.title} is animated: ${ch.name} is drawn or built, so no performer sits in a makeup chair and this adds no work.`);
            else {
              out.work.push(`${ch.name}: ${hours(mm.chairMin)} in the chair before shooting and ${hours(mm.removeMin)} to take off, each day they work.${mm.chairMin > 120 ? ' More than the pre-call holds: their days shoot less, unless more people apply it.' : ''}`);
              if (mm.buildDays) out.work.push(`${ch.name}: ${mm.buildDays * statesOf(next)} build days${statesOf(next) > 1 ? `, ${mm.buildDays} for each of ${statesOf(next)} appearance states,` : ''} and ${usd(mm.buildCost * mm.buildDays * statesOf(next))} in materials, by the ${mm.specialist === 'prosthetics' ? 'prosthetics designer' : 'hair and makeup artist'}.`);
              if (mm.testDays) out.work.push(`${ch.name}: ${mm.testDays} ${mm.testDays === 1 ? 'day' : 'days'} of camera tests before the shoot.`);
              if (mm.dayCost) out.work.push(`${ch.name}: ${usd(mm.dayCost)} in materials each day it is worn.`);
              if (mm.vfxDays) out.work.push(`${ch.name}: ${mm.vfxDays} ${mm.vfxDays === 1 ? 'day' : 'days'} of effects work for each scene they are in.`);
              if (ch.entity !== 'human' && ch.realization !== 'performer') out.work.push(`${ch.name}'s look is made this way and no other: it replaces the creature build the script would otherwise ask for.`);
            }
          }
          const ww = wardrobe(next.look?.wardrobe);
          if (ww && (w || c.states !== undefined) && live) {
            const copies = costumeCopies(next, p.scenes);
            out.work.push(`${ch.name}: ${copies} ${copies === 1 ? 'copy' : 'copies'} of the costume, ${ww.days * copies} ${ww.days * copies === 1 ? 'day' : 'days'} of the costume designer's time, about ${usd(ww.cost * copies)}, and ${ww.fittings} ${ww.fittings === 1 ? 'fitting' : 'fittings'}.`);
            if (copies > statesOf(next)) out.warnings.push(`${ch.name} is in a scene with a stunt or water, so each costume is made twice.`);
            const mis = wardrobeMismatch(p, next);
            if (mis) out.warnings.push(mis);
          }
        }
        break;
      }
      case 'crowd':
        for (const s of scenes) {
          const next: Scene = { ...s, ...(c.method ? { crowdMethod: c.method === 'digital' ? 'digital' as const : undefined } : {}), ...(c.look !== undefined ? { crowdLook: c.look ?? undefined } : {}) };
          const where = s.heading.place || 'this scene';
          if (!s.crowd) { out.warnings.push(`${where} has no crowd yet. Give it one on its scene card, and this applies to them.`); continue; }
          if (c.method) out.changes.push(`${where}, Crowd: ${c.method === 'digital' ? `${physicalCrowd(next)} of ${s.crowd} on set, the rest added in post` : `all ${s.crowd} on set`}.`);
          if (c.method === 'digital' && physicalCrowd(next) < s.crowd) out.work.push(`${where}: clean plates and tracking passes on the day, which make it about 15% longer to shoot, and 3 days of effects work after the picture is locked.`);
          if (c.method === 'digital' && physicalCrowd(next) >= s.crowd) out.warnings.push(`${where}: ${s.crowd} people are few enough to all be there, so nothing is added in post.`);
          const m = makeup(next.crowdLook);
          if (c.look !== undefined) out.changes.push(`${where}, Crowd Makeup: ${m ? m.label : 'none'}.`);
          if (m && live) {
            const share = makeupShare([next], p.characters, 1);
            out.work.push(`${where}: ${physicalCrowd(next)} background performers made up, ${hours(physicalCrowd(next) * m.chairMin * m.crowdShare)} of chair time in all and ${usd(physicalCrowd(next) * m.dayCost * m.crowdShare)} in materials for the day.${share < 1 ? ` With one person applying it, ${Math.round((1 - share) * 100)}% of that day goes to makeup: more makeup artists shorten it.` : ''}`);
          }
        }
        break;
      case 'stunt': for (const s of scenes) { out.changes.push(`${s.heading.place || 'A scene'}, Stunts: ${fill(c.text, idea, t.slots)}.`); overwrite(`scene.${s.id}.stunts`, `${s.heading.place || 'Scene'}: Stunts`, s.stunts, fill(c.text, idea, t.slots)); }
        if (scenes.length && live) out.work.push('A stunt coordinator, a rehearsal day, and a scene that shoots more slowly. A costume worn in it is made twice.');
        break;
      case 'season': { const next = fill(c.text, idea, t.slots); out.changes.push(`Season Arc: ${next}`); overwrite('seasonArc', 'Season Arc', p.seasonArc ?? '', next); if (p.episodes.length < 2) out.warnings.push('A season arc is for a series. On a single film it is kept as words.'); break; }
      case 'scene':
        for (const s of scenes) { const next = fill(c.text, idea, t.slots); out.changes.push(`${s.heading.place || 'A scene'}, ${SCENE_LABEL[c.field]}: ${next}`); overwrite(`scene.${s.id}.${c.field}`, `${s.heading.place || 'Scene'}: ${SCENE_LABEL[c.field]}`, s[c.field] ?? '', next); }
        break;
      case 'needs': {
        const items = c.items.map((x) => fill(x, idea, t.slots));
        for (const s of scenes) {
          const fresh = items.filter((x) => !s[c.kind].some((y) => y.toLowerCase() === x.toLowerCase()));
          out.changes.push(fresh.length ? `${s.heading.place || 'A scene'}, ${NEED_LABEL[c.kind]}: adds ${fresh.join(', ')}. What is listed already stays.` : `${s.heading.place || 'A scene'}, ${NEED_LABEL[c.kind]}: already listed.`);
        }
        if (scenes.length && (live || c.kind === 'vfx' || c.kind === 'props')) out.work.push(NEED_WORK[c.kind]);
        break;
      }
      case 'shot':
        for (const s of scenes) out.changes.push(`${s.heading.place || 'A scene'}, Shot Plan: ${[c.rig && RIGS[c.rig].label.toLowerCase(), c.coverage && `${c.coverage} coverage`, c.takes && `${c.takes === 'one' ? 'one take' : c.takes === 'few' ? 'a few takes' : 'many takes'}`, c.emphasis && `for ${c.emphasis === 'one-shot' ? 'one continuous shot' : c.emphasis}`].filter(Boolean).join(', ')}.`);
        if (scenes.length && !p.takesModel) out.warnings.push('This project was started before shot plans: the choice is kept as a note and changes no shoot day.');
        else if (scenes.length) out.work.push('The time each scene takes to shoot follows its coverage and takes; the Schedule shows the days.');
        if (scenes.length && c.rig && p.takesModel) {
          const d = RIGS[c.rig];
          const days = Math.ceil(scenes.length * d.rehearsal);
          out.work.push(`${d.label}: ${d.hint}`);
          if (d.role) out.work.push(`${d.why} Without one, every setup on it is slower than on a tripod.`);
          if (d.dayCost) out.work.push(`Rented kit, about ${money(d.dayCost)} for each shoot day with one of these scenes.`);
          if (days) out.work.push(`${days} rehearsal ${days === 1 ? 'day' : 'days'} with the cast before the shoot.`);
        }
        break;
      case 'light': {
        const d = LIGHTS[c.light];
        out.changes.push(`The Light It Is Shot In: ${d.label}.`);
        if (c.light === 'macro' && p.axes.technique !== 'stop-motion' && !p.scenes.some((s) => s.technique === 'stop-motion')) out.warnings.push('Macro lenses on miniatures are for stop motion. On this project it is kept as a choice and asks nothing.');
        else if (c.light !== 'standard') out.work.push(d.hint);
        break;
      }
      case 'sound': {
        const d = SOUNDS[c.add];
        out.changes.push(soundsOf(p).includes(c.add) ? `Sound: ${d.label} is chosen already.` : `Sound: adds ${d.label}. Your other sound choices stay.`);
        out.work.push(d.hint);
        if (c.add === 'creature' && !p.characters.some((ch) => ch.entity !== 'human')) out.warnings.push('No creature is in the script yet, so there is nothing to record until one is.');
        if (c.add === 'crowd' && !p.scenes.some((s) => s.crowd > 0)) out.warnings.push('No scene has a crowd yet, so no loop group is booked until one does.');
        break;
      }
      case 'score': {
        const d = SCORES[c.score];
        out.changes.push(`The Score: ${d.label}.`);
        out.work.push(d.hint);
        break;
      }
      case 'beats': {
        const chosen = (t.beats ?? []).map((i) => c.beats[i]).filter(Boolean);
        for (const b of chosen) out.changes.push(`New scene: ${b.intExt}. ${fill(b.place, idea, t.slots)}, ${b.time.toLowerCase()}. ${fill(b.objective, idea, t.slots)}`);
        if (c.beats.length && !chosen.length) out.changes.push(`${c.beats.length} scenes are offered. None is added unless you tick it.`);
        if (chosen.some((b) => !b.with?.length)) out.warnings.push('A new scene needs someone in it, or its action written, before a draft can be approved.');
        const crowd = chosen.filter((b) => b.crowd);
        if (crowd.length && live) out.work.push(`${crowd.length === 1 ? 'One of these scenes has' : `${crowd.length} of these scenes have`} background performers (${names(crowd.map((b) => String(b.crowd)))}), paid for each day they shoot.`);
        if (chosen.some((b) => b.time === 'NIGHT' && b.intExt === 'EXT') && live) out.work.push('A night exterior shoots after dark where the production is based, needs lighting, and can be lost to rain.');
        break;
      }
      case 'cast': {
        const fresh = c.parts.filter((x) => !p.characters.some((ch) => ch.name.toLowerCase() === fill(x.name, idea, t.slots).toLowerCase()));
        if (fresh.length) out.changes.push(`New ${fresh.length === 1 ? 'character' : 'characters'}: ${names(fresh.map((x) => fill(x.name, idea, t.slots)))}.`);
        break;
      }
    }
  }
  if (!out.refusal && idea.excludes?.length) {
    const clash = (p.brief?.picks ?? []).find((k) => idea.excludes!.includes(k.id) && (idea.scope === 'project' || k.characterIds?.some((x) => t.characterIds?.includes(x)) || k.sceneIds?.some((x) => t.sceneIds?.includes(x))));
    if (clash) out.warnings.push('This replaces an earlier choice of the same kind for the same target.');
  }
  return out;
}

// ---------------- Apply ----------------

/**
 * Apply an idea. Every command goes through the function the page's own control calls, so a picked value and a typed one
 * are the same thing afterwards. Words already in a field are replaced unless the player kept them (`t.keep`). Returns
 * what was done, in the preview's words. Throws the refusal when it can't be applied.
 */
export function applyIdea(state: GameState, p: Project, idea: Idea, t: Target = {}): string[] {
  assertEditable(p);
  const pre = previewIdea(p, idea, t);
  if (pre.refusal) throw new Error(pre.refusal);
  const keep = new Set(t.keep ?? []);
  const chars = targetChars(p, t);
  const scenes = targetScenes(p, t);
  const bySlot = new Map<string, string>();
  for (const c of idea.patch) {
    switch (c.op) {
      case 'story': if (!keep.has(`story.${c.field}`)) p.story[c.field] = fill(c.text, idea, t.slots); break;
      case 'tone': if (!keep.has('tone')) p.axes.tone = fill(c.text, idea, t.slots).slice(0, 80); break;
      case 'setting': if (!keep.has('setting')) p.axes.storySetting = fill(c.text, idea, t.slots).slice(0, 120); break;
      case 'style': { const era = c.era ? fill(c.era, idea, t.slots).slice(0, 40) : ''; if (era) p.axes.styleEra = era; else delete p.axes.styleEra; break; }
      case 'year': if (c.year === null) delete p.axes.storyYear; else p.axes.storyYear = c.year; break;
      case 'genre': setGenres(p, [...p.axes.genres.filter((g) => g.id !== c.id), { id: c.id, emphasis: c.emphasis }]); break;
      case 'medium':
        // A part played on camera becomes a voice when the work is animated, and a voice a part on camera when it is
        // shot: who plays it is cast afresh either way, and this keeps the part castable.
        if (c.medium === 'animation' && p.axes.medium !== 'animation') for (const ch of p.characters) updateCharacter(p, ch.id, { methods: [...new Set(ch.methods.map((m) => (m === 'on-camera' ? 'voice' as const : m)))] });
        if (c.medium !== 'animation' && p.axes.medium === 'animation') for (const ch of p.characters) updateCharacter(p, ch.id, { methods: [...new Set(ch.methods.map((m) => (m === 'voice' ? 'on-camera' as const : m)))] });
        p.axes.medium = c.medium;
        p.axes.technique = c.technique;
        break;
      case 'rule': p.worldRules.push({ id: newId(state, 'wr'), rule: fill(c.rule, idea, t.slots), limit: fill(c.limit, idea, t.slots) }); break;
      case 'character': for (const ch of chars) if (!keep.has(`character.${ch.id}.${c.field}`)) updateCharacter(p, ch.id, { [c.field]: fill(c.text, idea, t.slots) }); break;
      case 'narrator': for (const ch of chars) if (!ch.functions.includes('narrator')) updateCharacter(p, ch.id, { functions: [...ch.functions.filter((f) => f !== 'none'), 'narrator'] }); break;
      case 'look':
        for (const ch of chars) {
          const look = { ...ch.look };
          if (c.makeup !== undefined) { if (c.makeup === null) delete look.makeup; else look.makeup = c.makeup; }
          if (c.wardrobe !== undefined) { if (c.wardrobe === null) delete look.wardrobe; else look.wardrobe = c.wardrobe; }
          if (c.states !== undefined) look.states = Math.max(1, Math.min(MAX_STATES, Math.round(c.states)));
          setLook(p, ch.id, look);
        }
        break;
      case 'crowd':
        for (const s of scenes) {
          if (!s.crowd) continue;
          const patch: Partial<Scene> = {};
          if (c.method) patch.crowdMethod = c.method === 'digital' ? 'digital' : undefined;
          if (c.look !== undefined) patch.crowdLook = c.look ?? undefined;
          updateScene(p, s.id, patch);
        }
        break;
      case 'stunt': for (const s of scenes) if (!keep.has(`scene.${s.id}.stunts`)) updateScene(p, s.id, { stunts: fill(c.text, idea, t.slots) }); break;
      case 'scene': for (const s of scenes) if (!keep.has(`scene.${s.id}.${c.field}`)) updateScene(p, s.id, { [c.field]: fill(c.text, idea, t.slots) }); break;
      case 'season': if (!keep.has('seasonArc')) p.seasonArc = fill(c.text, idea, t.slots).slice(0, 2000); break;
      case 'needs':
        // Added to what the scene lists already, never replacing it, and never twice.
        for (const s of scenes) updateScene(p, s.id, { [c.kind]: [...s[c.kind], ...c.items.map((x) => fill(x, idea, t.slots)).filter((x) => !s[c.kind].some((y) => y.toLowerCase() === x.toLowerCase()))] });
        break;
      case 'shot':
        for (const s of scenes) { const cur = (p.shotPlans ??= {})[s.id] ?? {}; p.shotPlans[s.id] = { ...cur, ...(c.coverage ? { coverage: c.coverage } : {}), ...(c.takes ? { takes: c.takes } : {}), ...(c.emphasis ? { emphasis: c.emphasis } : {}), ...(c.rig ? { rig: c.rig } : {}) }; }
        break;
      case 'light': p.axes.light = c.light; break;
      case 'sound': p.axes.sound = [...new Set([...soundsOf(p), c.add])]; break;
      case 'score': p.axes.score = c.score; break;
      case 'cast':
        for (const part of c.parts) {
          const name = fill(part.name, idea, t.slots);
          const have = p.characters.find((ch) => ch.name.toLowerCase() === name.toLowerCase());
          const ch = have ?? addCharacter(state, p, name);
          if (!have) updateCharacter(p, ch.id, { roleSize: part.size, ...(part.entity ? { entity: part.entity, ...(part.entity !== 'human' ? { realization: 'prosthetics' as const } : {}) } : {}), ...(part.wants ? { wants: fill(part.wants, idea, t.slots) } : {}) });
          bySlot.set(part.slot, ch.id);
        }
        break;
      case 'beats':
        for (const i of t.beats ?? []) {
          const b = c.beats[i];
          if (!b) continue;
          const s = addScene(state, p, 1);
          updateScene(p, s.id, {
            heading: { intExt: b.intExt, place: fill(b.place, idea, t.slots), time: b.time }, storyLocation: fill(b.place, idea, t.slots), objective: fill(b.objective, idea, t.slots), estMinutes: b.minutes,
            crowd: b.crowd ?? 0, ...(b.crowdLook ? { crowdLook: b.crowdLook } : {}), stunts: b.stunts ?? '', water: !!b.water,
            participants: (b.with ?? []).map((slot) => bySlot.get(slot)).filter((x): x is string => !!x),
          });
        }
        break;
    }
  }
  const brief = (p.brief ??= { picks: [] });
  // One pick of a kind for a target: a later one for the same field and target replaces the earlier.
  const sameTarget = (k: IdeaPick) => k.field === idea.field && (idea.scope === 'project'
    || (idea.scope === 'character' && !!k.characterIds?.some((x) => t.characterIds?.includes(x)))
    || (idea.scope === 'scene' && !!k.sceneIds?.some((x) => t.sceneIds?.includes(x))));
  if (idea.adds) brief.picks = brief.picks.filter((k) => k.id !== idea.id);
  else if (idea.field !== 'world-rule' && idea.field !== 'location') {
    // A choice that replaces the field's leaves the ones that add to it (a narrator beside the sound choices).
    const adding = new Set(brief.picks.filter((k) => k.adds).map((k) => k.id));
    for (const k of brief.picks.filter((x) => sameTarget(x) && !adding.has(x.id))) {
      if (idea.scope === 'character') k.characterIds = k.characterIds!.filter((x) => !t.characterIds!.includes(x));
      if (idea.scope === 'scene') k.sceneIds = k.sceneIds!.filter((x) => !t.sceneIds!.includes(x));
    }
    brief.picks = brief.picks.filter((k) => adding.has(k.id) || !(k.field === idea.field && (idea.scope === 'project' ? true : idea.scope === 'character' ? !k.characterIds?.length : !k.sceneIds?.length)));
  }
  brief.picks.push({ id: idea.id, v: idea.v, field: idea.field, at: state.now, ...(idea.adds ? { adds: true as const } : {}), ...(idea.scope === 'character' ? { characterIds: chars.map((c) => c.id) } : {}), ...(idea.scope === 'scene' ? { sceneIds: scenes.map((s) => s.id) } : {}) });
  return pre.changes;
}

/**
 * Set a character's look (looks.ts): the control on the character's card and an applied idea both call this. A change
 * of makeup method or costume source is a design change, so work already built for the old one is sent back
 * (production.ts reads designVersion).
 */
export function setLook(p: Project, characterId: string, look: NonNullable<StoryCharacter['look']>): void {
  assertEditable(p);
  const c = p.characters.find((x) => x.id === characterId);
  if (!c) throw new Error('That character is no longer in the script.');
  const clean: NonNullable<StoryCharacter['look']> = {};
  if (look.makeup && MAKEUP.some((m) => m.id === look.makeup)) clean.makeup = look.makeup;
  if (look.wardrobe && WARDROBE.some((w) => w.id === look.wardrobe)) clean.wardrobe = look.wardrobe;
  if (look.states && look.states > 1) clean.states = Math.max(1, Math.min(MAX_STATES, Math.round(look.states)));
  // Names for the states, in order, in the player's own words: as many states as names, up to the most there can be.
  const named = (look.named ?? []).map((x) => x.trim().slice(0, 40)).filter(Boolean).slice(0, MAX_STATES);
  if (named.length > 1) { clean.named = named; clean.states = named.length; }
  // A scene's state that no longer exists falls back to the first.
  const count = clean.named?.length ?? clean.states ?? 1;
  for (const s of p.scenes) if (s.states?.[characterId] !== undefined && s.states[characterId] >= count) { const rest = { ...s.states }; delete rest[characterId]; s.states = Object.keys(rest).length ? rest : undefined; }
  if (Object.keys(clean).length) c.look = clean; else delete c.look;
}

/** Mark an idea to come back to, or unmark it. */
export function saveIdea(p: Project, id: string, on: boolean): void {
  const brief = (p.brief ??= { picks: [] });
  const set = new Set(brief.saved ?? []);
  if (on) set.add(id); else set.delete(id);
  if (set.size) brief.saved = [...set]; else delete brief.saved;
}

/** The latest pick for a field and target, for the row that says what was chosen. */
export function pickFor(p: Project, field: IdeaField, target?: { characterId?: string; sceneId?: string }): IdeaPick | undefined {
  return [...(p.brief?.picks ?? [])].reverse().find((k) => k.field === field && (!target?.characterId || k.characterIds?.includes(target.characterId)) && (!target?.sceneId || k.sceneIds?.includes(target.sceneId)));
}
