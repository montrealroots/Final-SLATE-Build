import { describe, expect, it } from 'vitest';
import {
  LOST_TURNING_POINT_COST, ageRating, approachBacker, approvedScenes, assessQuality, backerOptions, buildTasks, castPlacement,
  competesAs, computeCredits, estimateDays, makeOffer, scriptIssues, subtitlingCost,
} from '../src/engine';
import type { GameState, Project } from '../src/engine/types';
import { approve, buildProject, startLife } from './helpers';

function film(tag: string, chars: { name: string; patch?: Record<string, unknown> }[] = [{ name: 'Ines', patch: { roleSize: 'lead' } }], extra: Record<string, unknown> = {}) {
  const s = startLife(tag);
  const p = buildProject(s, { title: 'Harbour', format: 'feature', medium: 'live-action', runtime: 90 }, chars, [{ place: 'Harbour', chars: chars.map((c) => c.name), minutes: 6, extra }]);
  approve(s, p);
  return { s, p };
}
const notes = (p: Project) => scriptIssues(p).map((i) => i.text);

describe('structured script choices drive engines', () => {
  it('story functions place a part in the leading or supporting acting categories', () => {
    expect(castPlacement({ roleSize: 'supporting', functions: [] })).toBe('supporting');
    expect(castPlacement({ roleSize: 'supporting', functions: ['antagonist'] })).toBe('lead');
    expect(castPlacement({ roleSize: 'lead', functions: [] })).toBe('lead');
    expect(castPlacement({ roleSize: 'cameo', functions: ['mentor'] })).toBeNull();
    expect(castPlacement({ roleSize: 'background', functions: ['protagonist'] })).toBeNull();
  });

  it('a narrator records narration before the mix, and is booked a day for it', () => {
    const plain = film('fx-narr-a', [{ name: 'Ines', patch: { roleSize: 'lead' } }]);
    const narr = film('fx-narr-b', [{ name: 'Ines', patch: { roleSize: 'lead', functions: ['narrator'] } }]);
    const tasks = buildTasks(narr.p);
    const rec = tasks.find((t) => t.kind === 'post:narration')!;
    expect(rec.label).toBe("Record Ines's Narration");
    expect(tasks.filter((t) => t.kind === 'post:mix').every((m) => m.dependsOn.includes(rec.id))).toBe(true);
    expect(buildTasks(plain.p).some((t) => t.kind === 'post:narration')).toBe(false);
    const id = (p: Project) => p.characters[0].id;
    expect(estimateDays(narr.p, 'actor', id(narr.p), 'on-camera')).toBe(estimateDays(plain.p, 'actor', id(plain.p), 'on-camera') + 1);
  });

  it('series involvement: regulars are booked for every episode and credited in each; a guest written into two episodes gets a note', () => {
    const s = startLife('fx-series');
    const p = buildProject(s, { title: 'Ward', format: 'series', medium: 'live-action', runtime: 30, episodes: 4 },
      [{ name: 'Ines', patch: { roleSize: 'lead', seriesInvolvement: 'regular' } }, { name: 'Marcus', patch: { seriesInvolvement: 'guest' } }],
      [1, 2, 3, 4].map((e) => ({ place: 'Ward', chars: e <= 2 ? ['Ines', 'Marcus'] : ['Ines'], minutes: 3, extra: { episode: e } })));
    approve(s, p);
    const ines = p.characters[0].id;
    expect(estimateDays(p, 'actor', ines, 'on-camera')).toBeGreaterThanOrEqual(4);
    expect(notes(p)).toContain('Marcus is written as a guest part but appears in 2 episodes. Make them recurring, or keep them to one episode.');
    p.cast = [{ characterId: ines, performer: 'player', method: 'on-camera', note: '' }];
    expect(computeCredits(s, p).find((c) => c.characterName === 'Ines')!.episodes).toBe('all');
  });

  it('where it competes: chosen comedy or drama, else its genres', () => {
    const { p } = film('fx-register');
    expect(competesAs(p)).toBe('drama');
    p.axes.genres = [{ id: 'satire', emphasis: 'primary' }];
    expect(competesAs(p)).toBe('comedy');
    p.axes.register = 'drama';
    expect(competesAs(p)).toBe('drama');
  });

  it('the intended audience and the scenes set an age rating; a family audience blocks intimate scenes', () => {
    const { p } = film('fx-rating');
    expect(ageRating(p, approvedScenes(p))).toBe('All Ages');
    p.scenes[0].stunts = 'A fall';
    expect(ageRating(p, p.scenes)).toBe('12+');
    p.scenes[0].intimacy = true;
    expect(ageRating(p, p.scenes)).toBe('15+');
    p.axes.audience = 'Adult';
    expect(ageRating(p, p.scenes)).toBe('18+');
    p.axes.audience = 'Family';
    expect(scriptIssues(p).some((i) => i.severity === 'blocking' && /intimate scene/.test(i.text))).toBe(true);
  });

  it('a story set elsewhere adds a scouting trip there before the shoot, longer abroad', () => {
    const { p } = film('fx-scout');
    expect(buildTasks(p).some((t) => t.kind === 'prep:scout')).toBe(false);
    p.axes.settingPlaceId = 'gb-edinburgh';
    expect(buildTasks(p).find((t) => t.kind === 'prep:scout')).toMatchObject({ label: 'Scouting Trip To Edinburgh', units: 2 });
    p.axes.settingPlaceId = 'fr-paris';
    expect(buildTasks(p).find((t) => t.kind === 'prep:scout')).toMatchObject({ label: 'Scouting Trip To Paris', units: 4 });
  });

  it('a turning point the shoot never captured costs the edit; captured, it costs nothing', () => {
    const plain = film('fx-tp');
    const marked = film('fx-tp', undefined, { turningPoint: 'She learns the truth.' });
    const edit = (s: GameState, p: Project) => assessQuality(s, p).editing;
    expect(edit(marked.s, marked.p)).toBe(Math.max(0, edit(plain.s, plain.p) - LOST_TURNING_POINT_COST));
    marked.p.captures.push({ sceneId: marked.p.scenes[0].id, quality: 60 } as Project['captures'][number]);
    plain.p.captures.push({ sceneId: plain.p.scenes[0].id, quality: 60 } as Project['captures'][number]);
    expect(edit(marked.s, marked.p)).toBe(edit(plain.s, plain.p));
  });
});

describe('prose counts by presence and length, never by meaning', () => {
  it('backers read a pitch; a grant asks for the stakes and theme too', () => {
    const { s, p } = film('fx-pitch');
    p.finance!.deals = []; // nothing promised yet, so every backer is still open
    p.funding.fund = 0;
    Object.assign(p.story, { logline: '', premise: '', stakes: '', theme: '' });
    const needs = () => Object.fromEntries(backerOptions(s, p).map((o) => [o.kind, o.needs]));
    expect(needs().investor).toBe('Write a logline and a premise in the Story panel first: they read a pitch.');
    expect(() => approachBacker(s, p, 'investor')).toThrow('they read a pitch');
    p.story.logline = 'x';
    p.story.premise = 'y';
    expect(needs().investor).toBe('');
    expect(needs().grant).toBe('Write the stakes and the theme in the Story panel first: a grant application asks for them.');
    p.story.stakes = 'z';
    p.story.theme = 'w';
    expect(needs().grant).toBe('');
  });

  it('dialogue longer than its scene, and a script far longer than its runtime, are flagged', () => {
    const { p } = film('fx-length');
    const line = (n: number) => ({ id: `d${n}`, characterId: p.characters[0].id, text: Array.from({ length: 300 }, () => 'word').join(' '), language: 'en' });
    p.scenes[0].estMinutes = 1;
    p.scenes[0].dialogue = [line(1)];
    expect(notes(p).some((t) => /about 2 minutes of dialogue in a scene estimated at 1/.test(t))).toBe(true);
    p.axes.targetRuntimeMin = 2;
    p.scenes[0].dialogue = Array.from({ length: 4 }, (_, i) => line(i)); // 1,200 words, about 7 pages
    expect(notes(p).some((t) => /The script runs about 7 pages for 2 minutes/.test(t))).toBe(true);
  });

  it('subtitling for a territory is priced by the dialogue words not in its language', () => {
    const { p } = film('fx-subs');
    p.scenes[0].dialogue = [{ id: 'd1', characterId: p.characters[0].id, text: Array.from({ length: 1500 }, () => 'palabra').join(' '), language: 'es' }];
    approve(startLife('fx-subs'), p);
    expect(subtitlingCost(p, ['ES'])).toBe(0);
    expect(subtitlingCost(p, ['GB'])).toBe(500); // two thousand-word blocks
  });

  it('an offer for a part without a casting breakdown is answered a day later', () => {
    const run = (patch: Record<string, unknown>) => {
      const { s, p } = film('fx-breakdown', [{ name: 'Ines', patch: { roleSize: 'lead', ...patch } }]);
      return makeOffer(s, p, { personId: 'np_actor_GB_0', roleId: 'actor', dayRate: 500, characterId: p.characters[0].id, method: 'on-camera' }).responseAt - s.now;
    };
    expect(run({}) - run({ description: 'A nurse.', wants: 'To leave.', fears: 'Staying.' })).toBe(24 * 3600 * 1000);
  });

  it('a non-human character with nothing written about what it is gets a note', () => {
    const { p } = film('fx-entity', [{ name: 'Golem', patch: { entity: 'creature' } }]);
    expect(notes(p)).toContain('Describe what kind of being Golem is, so design and casting can start.');
    p.characters[0].entityNote = 'Clay, ten feet tall.';
    expect(notes(p)).not.toContain('Describe what kind of being Golem is, so design and casting can start.');
  });
});
