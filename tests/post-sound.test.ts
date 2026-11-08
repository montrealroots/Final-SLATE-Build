// SLATE-15-04.02: dialogue edit, Foley and effects as their own work; dialogue replacement when the sound was lost.
import { describe, expect, it } from 'vitest';
import { buildTasks } from '../src/engine/production/tasks';
import { needsDialogueReplacement } from '../src/engine/production/shoot';
import { approve, buildProject, startLife } from './helpers';

function short(tag: string) {
  const s = startLife(tag, 'gb-london');
  const p = buildProject(s, { title: 'Weathered', format: 'short', medium: 'live-action', runtime: 12 }, [{ name: 'Ada', patch: { roleSize: 'lead' } }],
    [{ place: 'Cliff', intExt: 'EXT', chars: ['Ada'], minutes: 6, extra: { dialogue: [{ characterId: '', text: 'Hold on.' }] } }]);
  p.scenes[0].dialogue = [{ id: 'dl1', characterId: p.characters[0].id, text: 'Hold on.', parenthetical: '' } as never];
  approve(s, p);
  return { s, p };
}

describe('sound finishing', () => {
  it('a new project edits dialogue, records Foley and cuts effects as separate work, and the mix waits for all three', () => {
    const { p } = short('sound-split');
    const tasks = buildTasks(p);
    expect(tasks.filter((t) => ['post:dialogue', 'post:foley', 'post:sound'].includes(t.kind)).map((t) => t.label)).toEqual(['Dialogue Edit', 'Foley', 'Sound Effects Editing']);
    expect(tasks.find((t) => t.kind === 'post:mix')!.dependsOn).toEqual(expect.arrayContaining(['post:sound:1', 'post:dialogue:1', 'post:foley:1']));
    // A project from before keeps the single sound pass.
    const old = { ...p, takesModel: undefined };
    expect(buildTasks(old).filter((t) => t.kind.startsWith('post:') && /sound|foley|dialogue/.test(t.kind)).map((t) => t.label)).toEqual(['Sound Editing']);
  });

  it('dialogue is replaced when there was no sound mixer or, on a new project, when the weather spoiled the sound', () => {
    const { p } = short('sound-adr');
    const sc = p.scenes[0];
    p.hires.push({ id: 'h', personId: 'x', roleId: 'sound-mixer', kind: 'crew', episodes: 'all', dayRate: 1, estDays: 1, status: 'accepted', offeredAt: 0, responseAt: 0, obligationId: null, daysWorked: 1 } as never);
    expect(needsDialogueReplacement(p, sc, false)).toBe(false);
    expect(needsDialogueReplacement(p, sc, true)).toBe(true);
    expect(needsDialogueReplacement({ ...p, takesModel: undefined }, sc, true)).toBe(false);
    expect(needsDialogueReplacement({ ...p, hires: [] }, sc, false)).toBe(true);
    expect(needsDialogueReplacement(p, { ...sc, dialogue: [] }, true)).toBe(false);
  });
});
