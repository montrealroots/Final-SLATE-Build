// A part played by more than one performer (the v4 package, 01: "Support age stages, voice/body/stunt/motion-capture
// assignments and different performers per episode without duplicate bookings or accidental double pay"; ledger
// V4-007.03, V4-007.04). Built November 13, 2026. Until then a part had one performer for each way it is performed
// (on camera, voice, capture), in every scene.
//
// A stage takes some of the part's scenes: chosen scenes (the part as a child, in the flashbacks), or whole episodes (a
// recast from episode 4). The main performer plays every scene no stage takes. Each stage is cast on its own, and its
// performer's days, call sheets, pay, child rules, performance and credit follow its scenes alone. Who plays a
// character in a scene is asked here (castIn), never by finding the first performer of the part.
import { approvedCharacters, approvedScenes, sceneLabel } from './projects';
import { newId } from './state';
import type { CastAssignment, GameState, PartStage, Project, Scene } from './types';

export const stagesOf = (p: Project, characterId: string): PartStage[] => (p.stages ?? []).filter((s) => s.characterId === characterId);
export const stageById = (p: Project, id: string | undefined): PartStage | undefined => (id ? (p.stages ?? []).find((s) => s.id === id) : undefined);

/** The stage that plays the character in this scene; undefined is the part's main performer. */
export function stageIn(p: Project, characterId: string, scene: Pick<Scene, 'id' | 'episode'>): string | undefined {
  return stagesOf(p, characterId).find((s) => s.sceneIds.includes(scene.id) || s.episodes.includes(scene.episode))?.id;
}

/** Who plays the character in this scene, among the assignments `which` accepts (by default any but a voice). */
export function castIn(p: Project, characterId: string, scene: Pick<Scene, 'id' | 'episode'>, which: (a: CastAssignment) => boolean = (a) => a.method !== 'voice'): CastAssignment | undefined {
  const stage = stageIn(p, characterId, scene);
  return p.cast.find((a) => a.characterId === characterId && a.stage === stage && which(a));
}

/** The approved scenes a stage of the part plays (undefined: the main performer's). */
export const partScenes = (p: Project, characterId: string, stage?: string): Scene[] =>
  approvedScenes(p).filter((s) => s.participants.includes(characterId) && stageIn(p, characterId, s) === stage);

/** The part's name with its stage: "Mara (Age 10)". */
export function partName(p: Project, characterId: string, stage?: string): string {
  const c = approvedCharacters(p).find((x) => x.id === characterId) ?? p.characters.find((x) => x.id === characterId);
  const st = stageById(p, stage);
  return `${c?.name ?? 'A character'}${st ? ` (${st.label})` : ''}`;
}

/** Whether an assignment or offer is for this part and stage. */
export const samePart = (x: { characterId?: string; method?: string; stage?: string }, characterId: string, method: string, stage?: string): boolean =>
  x.characterId === characterId && x.method === method && x.stage === stage;

export interface StageInput { characterId: string; label: string; age?: number; sceneIds: string[]; episodes: number[] }

/** Why this stage can't be added, or null. */
export function stageRefusal(p: Project, input: StageInput): string | null {
  if (p.delivered) return 'This project has been delivered.';
  if (p.approvedDraft === null) return 'Approve a draft before casting.';
  const c = approvedCharacters(p).find((x) => x.id === input.characterId);
  if (!c) return 'That character is not in the approved draft.';
  const label = input.label.trim();
  if (!label) return 'Name the stage, such as Age 10 or Episodes 4 To 6.';
  if (stagesOf(p, c.id).some((s) => s.label.toLowerCase() === label.toLowerCase())) return `${c.name} already has a stage called ${label}.`;
  if (input.age !== undefined && !(Number.isInteger(input.age) && input.age >= 0 && input.age <= 120)) return 'An age is a whole number of years.';
  const theirs = partScenes(p, c.id);
  const takes = theirs.filter((s) => input.sceneIds.includes(s.id) || input.episodes.includes(s.episode));
  if (!takes.length) return `Choose scenes or episodes ${c.name} is in that the main performer plays now.`;
  if (takes.length === theirs.length) return `That is every scene the main performer plays. Cast ${c.name} again instead.`;
  const shot = takes.find((s) => (p.captures.find((x) => x.sceneId === s.id)?.captured ?? 0) > 0);
  if (shot) return `${sceneLabel(p, shot)} is already shot with the main performer: a stage can't take it.`;
  return null;
}

/** Add a stage: the scenes it takes leave the main performer's part, and their days with them. */
export function addStage(state: GameState, p: Project, input: StageInput): PartStage {
  const no = stageRefusal(p, input);
  if (no) throw new Error(no);
  const theirs = partScenes(p, input.characterId);
  const st: PartStage = {
    id: newId(state, 'stage'), characterId: input.characterId, label: input.label.trim(), ...(input.age !== undefined ? { age: input.age } : {}),
    sceneIds: theirs.filter((s) => input.sceneIds.includes(s.id)).map((s) => s.id), episodes: [...new Set(input.episodes)].sort((a, b) => a - b),
  };
  (p.stages ??= []).push(st);
  return st;
}

/** Take a stage away: its scenes go back to the main performer. Only while nobody is cast or offered it. */
export function removeStage(p: Project, id: string): void {
  if (p.delivered) throw new Error('This project has been delivered.');
  const st = stageById(p, id);
  if (!st) throw new Error('That stage no longer exists.');
  if (p.cast.some((a) => a.stage === id) || p.hires.some((h) => h.stage === id && ['offered', 'countered', 'accepted'].includes(h.status))) throw new Error(`Release or withdraw whoever plays ${partName(p, st.characterId, id)} first.`);
  p.stages = (p.stages ?? []).filter((s) => s.id !== id);
}
