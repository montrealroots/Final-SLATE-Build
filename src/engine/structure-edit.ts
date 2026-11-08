// Editing acts, threads and arc beats (structure.ts says what they are and why). Loaded with the Script page, not at
// startup.
import { assertEditable, sceneLabel } from './projects';
import { newId } from './state';
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
