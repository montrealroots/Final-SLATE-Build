// Additional post work: effects revisions and re-recorded lines (SLATE-15-03.02, November 8, 2026). Pickups were the
// only additional work; now, before picture is locked, the producer can send a scene's visual effects back for a revision
// pass, or bring a performer back for a dialogue session to re-record a part's lines. Each is real work with a cost and
// time: the effects artist's days (and the colour grade waits for them), or a sound designer's day plus the performer's
// day rate, paid when booked. Once the work is done, the assessment reads it (finish.ts): a revised scene's capture and a
// re-recorded part's performance each count a little higher, once. The bonus sizes are game calibration.
import { spend } from './budget';
import { editScenes } from './finish';
import { personById } from './people';
import { assertEditable, sceneLabel } from './projects';
import { t } from './production/tasks';
import type { GameState, Project } from './types';

export const EFFECTS_REVISION_GAIN = 5;
export const REVOICE_GAIN = 4;

export function reviseEffects(p: Project, sceneId: string): void {
  assertEditable(p);
  if (p.edit.pictureLocked) throw new Error('Unlock picture to send effects back.');
  const s = editScenes(p).find((x) => x.id === sceneId);
  if (!s || !s.vfx.length) throw new Error('That scene has no visual effects.');
  const vfx = `post:vfx:${s.episode}`;
  if (!p.tasks.some((x) => x.id === vfx)) throw new Error('The effects aren\'t planned yet. Build the schedule first.');
  const id = `post:vfx-rev:${s.id}`;
  if (p.tasks.some((x) => x.id === id)) throw new Error('Its effects are being revised already.');
  p.tasks.push(t('post:vfx-rev', s.id, `Effects Revision: ${sceneLabel(p, s)}`, 'Post Production', 'vfx-artist', s.vfx.length * 2, 'days', [vfx], { sceneIds: [s.id], episode: s.episode }));
  const color = p.tasks.find((x) => x.id === `post:color:${s.episode}`);
  if (color && !color.dependsOn.includes(id)) color.dependsOn.push(id);
}

export function rerecordLines(state: GameState, p: Project, characterId: string): void {
  assertEditable(p);
  if (p.edit.pictureLocked) throw new Error('Unlock picture to re-record lines.');
  const a = p.cast.find((x) => x.characterId === characterId);
  const c = p.characters.find((x) => x.id === characterId);
  if (!a || !c) throw new Error('That part isn\'t cast.');
  if (!editScenes(p).some((s) => s.participants.includes(characterId) && s.dialogue.length)) throw new Error(`${c.name} has no lines in the cut.`);
  const id = `post:revoice:${characterId}`;
  if (p.tasks.some((x) => x.id === id)) throw new Error(`${c.name}'s lines are being re-recorded already.`);
  const rate = a.performer === 'player' ? 0 : p.hires.find((h) => h.id === a.hireId)?.dayRate ?? personById(state, a.performer).dayRate;
  if (rate) spend(state, p, `Dialogue Session: ${c.name}`, 'cast', rate, `revoice:${p.id}:${characterId}`);
  p.tasks.push(t('post:revoice', characterId, `Re-Record ${c.name}'s Lines`, 'Post Production', 'sound-designer', 1, 'days', [], { assetRef: characterId }));
  for (const d of p.tasks.filter((x) => x.kind === 'post:dialogue' || x.kind === 'post:sound')) if (!d.dependsOn.includes(id)) d.dependsOn.push(id);
}
