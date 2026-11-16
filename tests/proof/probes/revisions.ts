// Revisions in post (revisions.ts): effects sent back for another pass, a performer's lines re-recorded, and the
// animatic revised. Each is asked once the work it revises is done and before the picture is locked.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { reviseEffects, rerecordLines, reviseAnimatic } from '../../../src/engine/revisions';
import { editScenes } from '../../../src/engine/finish';
import { unlockPicture } from '../../../src/engine/edit-actions';
import { short } from './script';
import { unfunded } from '../career';
import { buildProject } from '../../helpers';

const live = (s: GameState) => s.projects.filter((p) => !p.delivered && !p.edit.pictureLocked);
/** Effects are made after the picture is locked: once they are done, before delivery, the picture is opened again
 *  (as the game asks: "Unlock picture to send effects back") and each scene with an effect is sent back once. */
// Kept for each career (each state), not across them: from November 16, 2026 every career's ids are alike (`pr_1`, `s_1`),
// as each kind counts on its own, and one set shared by all of them marked the second career's work done already.
const reviseAll = () => { const sets = new WeakMap<GameState, Set<string>>(); return (s: GameState, p: Project) => {
  const done = sets.get(s) ?? sets.set(s, new Set()).get(s)!;
  if (p.delivered) return;
  {
    if (p.tasks.find((t) => t.kind === 'post:vfx')?.status !== 'done' || editScenes(p).every((x) => !x.vfx.length || done.has(`${p.id}:${x.id}`))) return;
    if (p.edit.pictureLocked) try { unlockPicture(s, p); } catch { return; }
    for (const sc of editScenes(p).filter((x) => x.vfx.length && !done.has(`${p.id}:${x.id}`))) { try { reviseEffects(p, sc.id); } catch { /* not now */ } done.add(`${p.id}:${sc.id}`); }
  }
}; };
/** A five-minute 3D CG short whose two characters speak in every scene, voiced by the cast the career hires. */
const voiced = (s: GameState, year: number): Project => {
  const p = unfunded(buildProject(s, { title: `Year ${year + 1}`, format: 'short', medium: 'animation', technique: '3d-cg', quality: 'tv', scenario: 'micro', genres: ['drama'], runtime: 5 },
    [{ name: 'Lead', patch: { roleSize: 'lead' } }, { name: 'Friend', patch: { roleSize: 'supporting' } }],
    [{ place: 'Flat', chars: ['Lead', 'Friend'], minutes: 2 }, { place: 'Cafe', chars: ['Lead', 'Friend'], minutes: 3 }]));
  for (const sc of p.scenes) sc.dialogue = sc.participants.map((c, i) => ({ id: `${sc.id}-l${i}`, characterId: c, text: 'A line.', language: 'en' }));
  return p;
};
/** The lead's lines re-recorded once, after the voice recording and before the dialogue edit. */
const revoiceLead = () => { const done = new WeakSet<Project>(); return (s: GameState) => {
  for (const p of live(s)) {
    if (done.has(p) || !p.tasks.some((t) => t.kind.includes('voice') && t.status === 'done')) continue;
    const lead = p.characters.find((c) => c.name === 'Lead');
    if (lead) try { rerecordLines(s, p, lead.id); done.add(p); } catch { /* not cast yet */ }
  }
}; };
/** The animatic revised once, after it is finished. */
const reviseBoards = () => { const done = new WeakSet<Project>(); return (s: GameState) => {
  for (const p of live(s)) if (!done.has(p) && p.tasks.find((t) => t.kind === 'anim:animatic' || t.kind === 'anim:boards')?.status === 'done') { try { reviseAnimatic(p); } catch { /* nothing to revise */ } done.add(p); }
}; };

const measure = (_s: GameState, projects: Project[]) => ({
  effectsRevised: projects.reduce((a, p) => a + p.tasks.filter((t) => t.kind === 'post:vfx-rev' && t.status === 'done').length, 0),
  linesRerecorded: projects.reduce((a, p) => a + p.tasks.filter((t) => t.kind === 'post:revoice' && t.status === 'done').length, 0),
});

export const PROBES: Probe[] = [
  {
    id: 'revise-effects', features: ['action:revisions.reviseEffects'], decision: "Send every scene's effects back for another pass",
    reads: ['src/engine/revisions.ts#reviseEffects', 'src/engine/finish.ts#assessQuality'],
    base: { project: short({ scene: { vfx: ['sky replacement'] } }) }, variant: { project: short({ scene: { vfx: ['sky replacement'] } }), beforeManage: reviseAll() }, measure,
    bites: ['effectsRevised'], downstream: ['quality.direction', 'spent', 'overall'],
  },
  {
    id: 'rerecord-lines', features: ['action:revisions.rerecordLines'], decision: "Re-record the lead's lines after the voice sessions",
    reads: ['src/engine/revisions.ts#rerecordLines', 'src/engine/finish.ts#assessQuality'],
    seeds: 20, base: { project: voiced }, variant: { project: voiced, daily: revoiceLead() }, measure,
    bites: ['linesRerecorded'], downstream: ['overall', 'spent'],
  },
  {
    id: 'revise-animatic', features: ['action:revisions.reviseAnimatic'], decision: 'Revise the animatic once it is finished',
    reads: ['src/engine/revisions.ts#reviseAnimatic'],
    seeds: 20, base: { project: voiced }, variant: { project: voiced, daily: reviseBoards() }, measure,
    // The animatic's redo is paid for, and isn't on the critical path of a short this size: its cost reaches the money.
    bites: ['spent'], downstream: ['money'],
  },
];
