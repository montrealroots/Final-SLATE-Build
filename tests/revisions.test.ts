// SLATE-15-03.02: effects revisions and re-recorded lines as paid, timed additional work the assessment reads once done.
import { describe, expect, it } from 'vitest';
import { assessQuality, castPlayer, ledgerTotals } from './engine-api';
import { buildTasks } from '../src/engine/production/tasks';
import { EFFECTS_REVISION_GAIN, REVOICE_GAIN, reviseEffects, rerecordLines } from '../src/engine/revisions';
import { approve, buildProject, startLife } from './helpers';

function planned(tag: string) {
  const s = startLife(tag, 'gb-london');
  const p = buildProject(s, { title: 'Glass', format: 'short', medium: 'live-action', runtime: 8 }, [{ name: 'Ada', patch: { roleSize: 'lead' } }],
    [{ place: 'Lab', chars: ['Ada'], minutes: 4, extra: { vfx: ['portal'] } }]);
  p.scenes[0].dialogue = [{ id: 'd1', characterId: p.characters[0].id, text: 'Now.', parenthetical: '' } as never];
  approve(s, p);
  castPlayer(s, p, p.characters[0].id, 'on-camera');
  p.tasks = buildTasks(p);
  p.captures.push({ sceneId: p.scenes[0].id, captured: 1, quality: 60, version: p.approvedDraft!, weatherCompromised: false }); // labelled fixture: shot
  return { s, p };
}

describe('additional post work', () => {
  it('an effects revision is the effects artist\'s work the grade waits for, and counts once it is done', () => {
    const { s, p } = planned('rev-fx');
    const sc = p.scenes[0];
    reviseEffects(p, sc.id);
    const task = p.tasks.find((x) => x.id === `post:vfx-rev:${sc.id}`)!;
    expect([task.roleId, task.units, task.dependsOn]).toEqual(['vfx-artist', 2, ['post:vfx:1']]);
    expect(p.tasks.find((x) => x.id === 'post:color:1')!.dependsOn).toContain(task.id);
    expect(() => reviseEffects(p, sc.id)).toThrow('Its effects are being revised already.');
    const before = assessQuality(s, p).direction;
    task.status = 'done'; // labelled fixture: the revision was worked
    const after = assessQuality(s, p).direction;
    expect(after - before).toBeGreaterThan(0);
    expect(after - before).toBeLessThanOrEqual(Math.ceil(EFFECTS_REVISION_GAIN * 0.7));
    p.edit.pictureLocked = true;
    expect(() => reviseEffects(p, sc.id)).toThrow('Unlock picture to send effects back.');
  });

  it('re-recorded lines are a dialogue session the sound waits for, paid at the performer\'s rate, and count once done', () => {
    const { s, p } = planned('rev-voice');
    const ada = p.characters[0];
    rerecordLines(s, p, ada.id);
    const task = p.tasks.find((x) => x.id === `post:revoice:${ada.id}`)!;
    expect(task.roleId).toBe('sound-designer');
    expect(p.tasks.find((x) => x.id === 'post:dialogue:1')!.dependsOn).toContain(task.id);
    expect(ledgerTotals(p).settled).toBe(0); // the player performs: no day rate
    const key = `performance:${ada.id}:player`;
    const before = assessQuality(s, p)[key];
    task.status = 'done';
    expect(assessQuality(s, p)[key] - before).toBe(REVOICE_GAIN);
    expect(() => rerecordLines(s, p, ada.id)).toThrow("Ada's lines are being re-recorded already.");
  });
});
