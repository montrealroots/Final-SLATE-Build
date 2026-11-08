// SLATE-15-05.03: festival and distribution versions with their own runtime and credits.
import { describe, expect, it } from 'vitest';
import { castPlayer, checkEligibility, computeCredits, edition, institution } from './engine-api';
import { addVersion, removeVersion, versionCredits, versionRuntime } from '../src/engine/versions';
import { approve, buildProject, startLife } from './helpers';

function locked(tag: string) {
  const s = startLife(tag, 'gb-london');
  const p = buildProject(s, { title: 'Long Short', format: 'short', medium: 'live-action', runtime: 40 },
    [{ name: 'Ada', patch: { roleSize: 'lead' } }, { name: 'Ben', patch: { roleSize: 'supporting' } }],
    [{ place: 'Cliff', chars: ['Ada'], minutes: 30 }, { place: 'Kitchen', chars: ['Ben'], minutes: 14 }]);
  approve(s, p);
  castPlayer(s, p, p.characters[0].id, 'on-camera');
  castPlayer(s, p, p.characters[1].id, 'on-camera');
  p.edit.pictureLocked = true; // labelled fixture: the cut is locked
  return { s, p };
}

describe('versions', () => {
  it('a version is conformed from the locked cut as a day of editing, with its own runtime and credits', () => {
    const { s, p } = locked('versions');
    const kitchen = p.scenes.find((x) => x.heading.place === 'Kitchen')!;
    expect(() => addVersion(s, p, 'Festival Cut', p.scenes.map((x) => x.id))).toThrow('A version has to keep at least one scene.');
    const v = addVersion(s, p, 'Festival Cut', [kitchen.id]);
    expect(() => addVersion(s, p, 'Festival Cut', [])).toThrow('There is already a Festival Cut.');
    expect(p.tasks.find((x) => x.id === `post:version:${v.id}`)!.roleId).toBe('editor');
    expect(versionRuntime(p, v)).toBe(30);
    // Ben appears only in the scene it leaves out, so he isn't credited on it.
    const all = computeCredits(s, p).filter((c) => c.characterName).map((c) => c.characterName);
    expect(all).toEqual(['Ada', 'Ben']);
    expect(versionCredits(s, p, v).filter((c) => c.characterName).map((c) => c.characterName)).toEqual(['Ada']);
    removeVersion(p, v.id);
    expect(p.versions).toEqual([]);
    expect(p.tasks.some((x) => x.kind === 'post:version')).toBe(false);
    p.edit.pictureLocked = false;
    expect(() => addVersion(s, p, 'Festival Cut', [])).toThrow('Lock picture first');
  });

  it("a festival's runtime rules read the version entered: a 44-minute short can't enter a shorts category, its 30-minute cut can", () => {
    const { s, p } = locked('versions-elig');
    const v = addVersion(s, p, 'Festival Cut', [p.scenes.find((x) => x.heading.place === 'Kitchen')!.id]);
    p.delivered = { at: s.now, runtimeMin: 44 }; // labelled fixture: delivered at the main cut's length
    const ed = s.editions.find((e) => e.institutionId === 'sundance')!;
    const shorts = institution('sundance').categories.find((c) => c.id === 'shorts')!;
    const main = checkEligibility(s, p, edition(s, ed.id), shorts);
    expect(main.reasons).toContain('It runs 44 minutes. Short categories need 40 or fewer.');
    const cut = checkEligibility(s, p, edition(s, ed.id), shorts, undefined, v.id);
    expect(cut.reasons.some((r) => r.includes('minutes'))).toBe(false);
  });
});
