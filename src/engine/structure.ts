// Acts and story threads (SLATE-04-02.02 and .03, November 8, 2026). Scenes had turning points and setups but no larger
// shape. Now a writer can group scenes into acts or sequences and follow threads: a story line through chosen scenes
// and characters that resolves in a named scene, or is left open on purpose. These are the writer's structure. They
// never score anything (a thread left open is as valid as one resolved); what they do is make links visible, so that a
// cut, a combined scene or a deleted one says which thread it leaves without its resolution, by scene.
import { newId } from './state';
import { assertEditable, sceneLabel } from './projects';
import type { GameState, Project, StoryThread } from './types';

const trimmed = (name: string, what: string) => {
  const n = name.trim();
  if (!n) throw new Error(`Give the ${what} a name.`);
  return n.slice(0, 80);
};

export function addAct(state: GameState, p: Project, name: string): { id: string; name: string } {
  assertEditable(p);
  const act = { id: newId(state, 'act'), name: trimmed(name, 'act') };
  (p.acts ??= []).push(act);
  return act;
}

export function renameAct(p: Project, id: string, name: string): void {
  assertEditable(p);
  const a = p.acts?.find((x) => x.id === id);
  if (!a) throw new Error('That act no longer exists.');
  a.name = trimmed(name, 'act');
}

/** Removing an act leaves its scenes where they are, in no act. */
export function removeAct(p: Project, id: string): void {
  assertEditable(p);
  p.acts = (p.acts ?? []).filter((x) => x.id !== id);
  for (const s of p.scenes) if (s.act === id) delete s.act;
}

export function setSceneAct(p: Project, sceneId: string, actId: string | null): void {
  assertEditable(p);
  const s = p.scenes.find((x) => x.id === sceneId);
  if (!s) throw new Error('That scene no longer exists.');
  if (actId === null) delete s.act;
  else {
    if (!p.acts?.some((a) => a.id === actId)) throw new Error('That act no longer exists.');
    s.act = actId;
  }
}

export function addThread(state: GameState, p: Project, name: string): StoryThread {
  assertEditable(p);
  const t: StoryThread = { id: newId(state, 'th'), name: trimmed(name, 'thread'), characterIds: [], sceneIds: [], resolution: 'resolves', resolvedIn: null };
  (p.threads ??= []).push(t);
  return t;
}

export function updateThread(p: Project, id: string, patch: Partial<Omit<StoryThread, 'id'>>): StoryThread {
  assertEditable(p);
  const t = p.threads?.find((x) => x.id === id);
  if (!t) throw new Error('That thread no longer exists.');
  if (patch.name !== undefined) patch.name = trimmed(patch.name, 'thread');
  if (patch.resolvedIn && !p.scenes.some((s) => s.id === patch.resolvedIn)) throw new Error('That scene no longer exists.');
  Object.assign(t, patch);
  if (t.resolution === 'open') t.resolvedIn = null;
  if (t.resolvedIn && !t.sceneIds.includes(t.resolvedIn)) t.sceneIds.push(t.resolvedIn);
  return t;
}

export function removeThread(p: Project, id: string): void {
  assertEditable(p);
  p.threads = (p.threads ?? []).filter((x) => x.id !== id);
}

/** Keep threads, world rules and arc beats pointing at real scenes when a scene goes (deleted) or is folded into another (combined). */
export function remapThreads(p: Project, goneId: string, intoId: string | null): void {
  for (const t of p.threads ?? []) {
    t.sceneIds = [...new Set(t.sceneIds.map((x) => (x === goneId ? intoId : x)).filter((x): x is string => !!x))];
    if (t.resolvedIn === goneId) t.resolvedIn = intoId;
  }
  for (const r of p.worldRules) if (r.sceneIds) r.sceneIds = [...new Set(r.sceneIds.map((x) => (x === goneId ? intoId : x)).filter((x): x is string => !!x))];
  for (const c of p.characters) {
    if (!c.beats) continue;
    c.beats = c.beats.flatMap((b) => (b.sceneId !== goneId ? [b] : intoId ? [{ ...b, sceneId: intoId }] : []));
  }
}

// ---------------- Arc beats (SLATE-05-04.02) ----------------

/** A change in a character, placed in the scene where it happens. */
export function addBeat(state: GameState, p: Project, characterId: string, sceneId: string, change: string): { id: string; sceneId: string; change: string } {
  assertEditable(p);
  const c = p.characters.find((x) => x.id === characterId);
  if (!c) throw new Error('That character no longer exists.');
  const s = p.scenes.find((x) => x.id === sceneId);
  if (!s) throw new Error('That scene no longer exists.');
  if (!s.participants.includes(characterId)) throw new Error(`${c.name} isn't in ${sceneLabel(p, s)}. Add them to the scene first.`);
  const text = change.trim();
  if (!text) throw new Error('Say what changes.');
  const beat = { id: newId(state, 'bt'), sceneId, change: text.slice(0, 200) };
  (c.beats ??= []).push(beat);
  c.beats.sort((a, b) => p.scenes.findIndex((x) => x.id === a.sceneId) - p.scenes.findIndex((x) => x.id === b.sceneId));
  return beat;
}

export function removeBeat(p: Project, characterId: string, beatId: string): void {
  assertEditable(p);
  const c = p.characters.find((x) => x.id === characterId);
  if (c?.beats) c.beats = c.beats.filter((b) => b.id !== beatId);
}

/** The arc beats that happen in a scene, by character name. */
export function beatsIn(p: Project, sceneId: string): { character: string; change: string }[] {
  return p.characters.flatMap((c) => (c.beats ?? []).filter((b) => b.sceneId === sceneId).map((b) => ({ character: c.name, change: b.change })));
}

/** Notes about the structure, by scene where there is one. Advice only: nothing here blocks approval or scores. */
export function structureNotes(p: Project): { text: string; sceneId?: string }[] {
  const out: { text: string; sceneId?: string }[] = [];
  const present = new Set(p.scenes.map((s) => s.id));
  for (const t of p.threads ?? []) {
    if (!t.sceneIds.length) out.push({ text: `The thread "${t.name}" isn't in any scene yet.` });
    for (const id of t.sceneIds.filter((x) => !present.has(x))) out.push({ text: `The thread "${t.name}" lists a scene that is no longer in the script.`, sceneId: id });
    if (t.resolution === 'resolves' && !t.resolvedIn) out.push({ text: `The thread "${t.name}" has no resolving scene yet. Choose one, or mark it left open on purpose.` });
  }
  for (const a of p.acts ?? []) if (!p.scenes.some((s) => s.act === a.id)) out.push({ text: `${a.name} has no scenes yet.` });
  return out;
}

/** What cutting a scene does to the threads it resolves, for the edit's cut warnings. */
export function threadCutConsequences(p: Project, sceneId: string): string[] {
  return [
    ...(p.threads ?? []).filter((t) => t.resolvedIn === sceneId).map((t) => `It resolves the thread "${t.name}": cut, that thread is left without its resolution.`),
    ...beatsIn(p, sceneId).map((b) => `${b.character} changes here (${b.change}): cut, the audience doesn't see it.`),
  ];
}

/** The threads a scene belongs to, for its card. */
export function threadsOf(p: Project, sceneId: string): StoryThread[] {
  return (p.threads ?? []).filter((t) => t.sceneIds.includes(sceneId));
}

export const resolutionLabel = (p: Project, t: StoryThread): string => {
  if (t.resolution === 'open') return 'Left open on purpose';
  const s = p.scenes.find((x) => x.id === t.resolvedIn);
  return s ? `Resolves in ${sceneLabel(p, s)}` : 'No resolving scene yet';
};
