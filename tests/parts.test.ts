// A part played by more than one performer (engine/parts.ts; the v4 package, 01; ledger V4-007.03, V4-007.04): an age
// stage and a recast from an episode. Each comparison changes one input and reads what the production does with it.
import { describe, expect, it } from 'vitest';
import { addStage, castIn, partScenes, removeStage, stageRefusal, stagesOf } from '../src/engine/parts';
import { castPlayer, estimateDays, makeOffer, resolveOffer, roleCandidates } from '../src/engine/hiring';
import { computeCredits, assessQuality } from '../src/engine/finish';
import { minorsInScenes } from '../src/engine/production/schedule';
import { callSheet } from '../src/engine/callsheet';
import { approvedScenes } from '../src/engine/projects';
import { deserialize, serialize } from '../src/engine/save';
import type { GameState, Project } from '../src/engine/types';
import { approve, buildProject, castAll, runDays, staffAll, startLife, startProduction } from './helpers';

/** Mara grown up on the pier and in the kitchen, and as a child at school and in the yard. Ben on the pier. */
function film(tag: string, schoolAt = 'School'): { s: GameState; p: Project } {
  const s = startLife(tag);
  const p = buildProject(s, { title: 'Two Tides', format: 'short', medium: 'live-action', runtime: 14 }, [{ name: 'Mara', patch: { ageInStory: '30' } }, { name: 'Ben' }],
    [{ place: 'Pier', chars: ['Mara', 'Ben'], minutes: 3 }, { place: 'Kitchen', chars: ['Mara'], minutes: 3 }, { place: schoolAt, chars: ['Mara'], minutes: 3, extra: { action: 'School.' } }, { place: 'Yard', chars: ['Mara'], minutes: 3 }]);
  approve(s, p);
  return { s, p };
}
const mara = (p: Project) => p.characters.find((c) => c.name === 'Mara')!.id;
const scene = (p: Project, place: string) => (place === 'School' ? approvedScenes(p).find((x) => x.action === 'School.') : approvedScenes(p).find((x) => x.heading.place === place && x.action !== 'School.'))!;
const young = (s: GameState, p: Project) => addStage(s, p, { characterId: mara(p), label: 'Age 10', age: 10, sceneIds: [scene(p, 'School').id, scene(p, 'Yard').id], episodes: [] });

describe('a stage of a part', () => {
  it('takes its scenes from the main performer, and their days with them', () => {
    const { s, p } = film('parts-days');
    const before = estimateDays(p, 'actor', mara(p), 'on-camera', s);
    const st = young(s, p);
    expect(partScenes(p, mara(p)).map((x) => x.heading.place)).toEqual(['Pier', 'Kitchen']);
    expect(partScenes(p, mara(p), st.id).map((x) => x.heading.place)).toEqual(['School', 'Yard']);
    expect(estimateDays(p, 'actor', mara(p), 'on-camera', s)).toBeLessThan(before);
    expect(estimateDays(p, 'actor', mara(p), 'on-camera', s, st.id)).toBeGreaterThanOrEqual(1);
    // Taken away, the scenes go back.
    removeStage(p, st.id);
    expect(partScenes(p, mara(p))).toHaveLength(4);
    expect(estimateDays(p, 'actor', mara(p), 'on-camera', s)).toBe(before);
  });

  it('is refused without a name, for every scene, twice by the same name, or for a scene already shot', () => {
    const { s, p } = film('parts-refuse');
    const all = approvedScenes(p).filter((x) => x.participants.includes(mara(p))).map((x) => x.id);
    expect(stageRefusal(p, { characterId: mara(p), label: ' ', sceneIds: [all[2]], episodes: [] })).toBe('Name the stage, such as Age 10 or Episodes 4 To 6.');
    expect(stageRefusal(p, { characterId: mara(p), label: 'Older', sceneIds: all, episodes: [] })).toBe('That is every scene the main performer plays. Cast Mara again instead.');
    expect(stageRefusal(p, { characterId: mara(p), label: 'Older', sceneIds: [], episodes: [] })).toMatch(/^Choose scenes or episodes Mara is in/);
    young(s, p);
    expect(stageRefusal(p, { characterId: mara(p), label: 'age 10', sceneIds: [all[1]], episodes: [] })).toBe('Mara already has a stage called age 10.');
    p.captures.push({ sceneId: all[1], captured: 0.5, quality: 60, version: p.approvedDraft!, weatherCompromised: false });
    expect(stageRefusal(p, { characterId: mara(p), label: 'Later', sceneIds: [all[1]], episodes: [] })).toMatch(/is already shot with the main performer: a stage can't take it\.$/);
  });

  it('is cast on its own: each scene is played by whoever plays its stage, on the call sheet and in the credits', () => {
    const { s, p } = film('parts-cast');
    const st = young(s, p);
    castPlayer(s, p, mara(p), 'on-camera'); // you play Mara grown up
    // Labelled fixture: offered to children in turn until one accepts (their answers are the world seed's).
    let h: ReturnType<typeof makeOffer> | undefined;
    for (const k of roleCandidates(s, p, 'actor').filter((x) => x.born && x.born > '2013-01-01')) {
      h = makeOffer(s, p, { personId: k.id, roleId: 'actor', dayRate: k.dayRate * 2, characterId: mara(p), method: 'on-camera', stage: st.id });
      expect(h.stage).toBe(st.id);
      expect(() => makeOffer(s, p, { personId: k.id, roleId: 'actor', dayRate: k.dayRate * 2, characterId: mara(p), method: 'on-camera', stage: st.id })).toThrow();
      resolveOffer(s, p, h);
      if (h.status === 'countered') { h.status = 'offered'; h.dayRate = h.counterRate!; resolveOffer(s, p, h); } // labelled fixture: take their rate
      if (h.status === 'accepted') break;
    }
    h = h!;
    const kid = { id: h.personId };
    expect(h.status).toBe('accepted');
    expect(castIn(p, mara(p), scene(p, 'Pier'))?.performer).toBe('player');
    expect(castIn(p, mara(p), scene(p, 'School'))?.performer).toBe(kid.id);
    // The stage can't be taken away while it is cast.
    expect(() => removeStage(p, st.id)).toThrow('Release or withdraw whoever plays Mara (Age 10) first.');
    p.delivered = { at: s.now, runtimeMin: 12 }; // labelled fixture: credits as on delivery
    const credits = computeCredits(s, p).filter((c) => c.characterName === 'Mara');
    expect(credits.map((c) => [c.person === kid.id, c.stage ?? null])).toEqual(expect.arrayContaining([[false, null], [true, 'Age 10']]));
  });

  it('with an age of its own, is a child\'s part in its scenes only, before anyone is cast', () => {
    const { s, p } = film('parts-child');
    const on = '2026-02-02';
    expect(minorsInScenes(p, approvedScenes(p), on, s).size).toBe(0);
    young(s, p);
    expect(minorsInScenes(p, [scene(p, 'School')], on, s).get(mara(p))?.personId).toBeNull();
    expect(minorsInScenes(p, [scene(p, 'Pier'), scene(p, 'Kitchen')], on, s).size).toBe(0);
  });

  it('a whole episode from on: a recast from episode 2 plays every scene of it', () => {
    const s = startLife('parts-episode');
    const p = buildProject(s, { title: 'Harbour', format: 'series', medium: 'live-action', episodes: 2, runtime: 20 }, [{ name: 'Mara' }],
      [{ place: 'Pier', chars: ['Mara'] }, { place: 'Kitchen', chars: ['Mara'], extra: { episode: 2 } }, { place: 'Yard', chars: ['Mara'], extra: { episode: 2 } }]);
    approve(s, p);
    const st = addStage(s, p, { characterId: mara(p), label: 'From Episode 2', sceneIds: [], episodes: [2] });
    expect(partScenes(p, mara(p), st.id).map((x) => x.episode)).toEqual([2, 2]);
    expect(partScenes(p, mara(p)).map((x) => x.episode)).toEqual([1]);
    expect(stagesOf(p, mara(p))).toHaveLength(1);
    const back = deserialize(serialize(s));
    expect(back.projects[0].stages).toEqual(p.stages);
  });
});

describe('a production with a stage', () => {
  it('shoots each scene with whoever plays it, pays a performer with two parts once a day, and judges each on their own scenes', () => {
    const { s, p } = film('parts-shoot', 'Pier'); // the school scene shot at the pier, on the day Ben's scene is
    const st = young(s, p);
    // One performer plays Ben and the young Mara: no scene has both, so it isn't a clash.
    const both = roleCandidates(s, p, 'actor').find((x) => x.experience >= 3 && x.born && x.born < '1990-01-01')!;
    for (const [characterId, stage] of [[p.characters.find((c) => c.name === 'Ben')!.id, undefined], [mara(p), st.id]] as const) {
      const h = makeOffer(s, p, { personId: both.id, roleId: 'actor', dayRate: both.dayRate * 2, characterId, method: 'on-camera', ...(stage ? { stage } : {}) });
      resolveOffer(s, p, h);
      if (h.status === 'countered') { h.status = 'offered'; h.dayRate = h.counterRate!; resolveOffer(s, p, h); }
    }
    castAll(s, p);
    staffAll(s, p);
    runDays(s, p, 3);
    startProduction(s, p);
    runDays(s, p, 40);
    const theirs = p.hires.filter((h) => h.personId === both.id && h.status === 'accepted');
    expect(theirs).toHaveLength(2);
    // A day's pay is posted under the hire and the date (shoot.ts): one performer's dates, across both parts, never repeat.
    const paidDays = theirs.flatMap((h) => p.obligations.find((o) => o.id === h.obligationId)!.postings.map((x) => x.key.split(':')[1]).filter((k) => /^\d{4}-\d\d-\d\d$/.test(k)));
    expect(paidDays.length).toBeGreaterThan(0);
    expect(new Set(paidDays).size).toBe(paidDays.length); // never two payments for one day
    // And a day did call both their parts: Ben's scene and the young Mara's, both at the pier.
    expect(p.schedule.days.some((d) => d.sceneIds.includes(scene(p, 'Pier').id) && d.sceneIds.includes(scene(p, 'School').id))).toBe(true);
    // The captures name who played each scene.
    expect(p.captures.find((c) => c.sceneId === scene(p, 'School').id)?.performers).toContain(both.id);
    expect(p.captures.find((c) => c.sceneId === scene(p, 'Kitchen').id)?.performers ?? []).not.toContain(both.id);
    const day = p.schedule.days.find((d) => d.sceneIds.includes(scene(p, 'School').id))!;
    expect(callSheet(s, p, day.id).cast.some((x) => x.part === 'Mara (Age 10)')).toBe(true);
    const q = assessQuality(s, p);
    expect(Object.keys(q).filter((k) => k.startsWith(`performance:${mara(p)}:`)).length).toBe(2);
  });
});
