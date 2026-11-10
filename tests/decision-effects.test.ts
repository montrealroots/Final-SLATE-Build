// Controlled comparisons for player decisions (the owner's gameplay-connectivity pass, November 10, 2026): the same world
// from the same seed, one decision changed, the intended difference seen, and outcomes the decision shouldn't touch left
// exactly as they were. docs/INPUT-AUDIT.md lists every control and cites these with the older comparisons it relies on.
import { describe, expect, it } from 'vitest';
import {
  DAY, approachBacker, buildTasks, competesAs, financeSummary, generatePlan, processUntil, scriptIssues, setFinanceTarget, setGenres,
} from './engine-api';
import { requirementProblems } from '../src/engine/awards-rules';
import { addThread, updateThread } from '../src/engine/structure-edit';
import { findPlace } from '../src/data/places';
import type { GameState, Project } from '../src/engine/types';
import { costBreakdown } from '../src/engine/estimate';
import { neededRoles } from '../src/engine/hiring';
import { coachingNeeded } from '../src/engine/production';
import { agreedFunding, approve, buildProject, castAll, startLife, writePitch } from './helpers';

/** A short with two characters and three scenes, approved: the starting point every comparison here shares. */
function world(tag: string, change?: (s: GameState, p: Project) => void, before?: (s: GameState, p: Project) => void) {
  const s = startLife(tag);
  const p = buildProject(s, { title: 'Harbour', format: 'short', medium: 'live-action', runtime: 12 },
    [{ name: 'Ines' }, { name: 'Tomas' }],
    [{ place: 'Quay', chars: ['Ines', 'Tomas'], minutes: 4 }, { place: 'Boathouse', chars: ['Tomas'], minutes: 4, intExt: 'EXT' }, { place: 'Lighthouse', chars: ['Ines'], minutes: 4 }]);
  before?.(s, p);
  change?.(s, p);
  approve(s, p);
  return { s, p };
}
const taskUnits = (p: Project) => buildTasks(p).map((t) => `${t.id}:${t.units}:${[...t.dependsOn].sort().join('+')}`).sort();
const issues = (p: Project) => scriptIssues(p).map((i) => `${i.severity}:${i.text}`).sort();

describe('primary and secondary genres', () => {
  it('which genre is primary decides comedy or drama in the awards that split them, and nothing in production', () => {
    const genres = (primary: 'drama' | 'satire') => (_: GameState, p: Project) => setGenres(p, [
      { id: 'courtroom-drama', emphasis: primary === 'drama' ? 'primary' : 'secondary' },
      { id: 'satire', emphasis: primary === 'satire' ? 'primary' : 'secondary' },
    ]);
    const a = world('dx-genre', genres('drama'));
    const b = world('dx-genre', genres('satire'));
    expect([competesAs(a.p), competesAs(b.p)]).toEqual(['drama', 'comedy']);
    const comedy = { class: 'comedy' } as Parameters<typeof requirementProblems>[2];
    expect(requirementProblems(a.s, a.p, comedy)).toContain('This category is for comedy and musical work; this project competes as drama.');
    expect(requirementProblems(b.s, b.p, comedy)).toEqual([]);
    // Same genres, so the same modules, checks and work: emphasis is not a production choice.
    expect(taskUnits(b.p)).toEqual(taskUnits(a.p));
    expect(issues(b.p)).toEqual(issues(a.p));
  });
});

describe('where the story is set', () => {
  it('a setting abroad adds research before design and costumes; the shoot, the cast and the checks stay the same', () => {
    const home = world('dx-setting', (_, p) => { p.axes.settingPlaceId = findPlace(p.axes.basePlaceId)!.id; });
    const abroad = world('dx-setting', (_, p) => { p.axes.settingPlaceId = 'jp-tokyo'; });
    const t = (p: Project) => buildTasks(p);
    expect(t(home.p).some((x) => x.id === 'prep:research:setting')).toBe(false);
    expect(t(abroad.p).find((x) => x.id === 'prep:research:setting')?.units).toBe(3);
    for (const id of ['prep:design:all', 'prep:costume:all']) expect(t(abroad.p).find((x) => x.id === id)!.dependsOn).toContain('prep:research:setting');
    // Everything outside preparation is identical: shoot, edit, delivery, and who must be cast.
    const notPrep = (p: Project) => taskUnits(p).filter((x) => !x.startsWith('prep:'));
    expect(notPrep(abroad.p)).toEqual(notPrep(home.p));
    expect(abroad.p.requirements.filter((r) => r.kind !== 'setting-research').map((r) => r.key)).toEqual(home.p.requirements.map((r) => r.key));
    expect(issues(abroad.p)).toEqual(issues(home.p));
  });
});

describe("a thread's characters", () => {
  it('raise a structure note when one is in none of its scenes, and change no work, score or backer decision', () => {
    const thread = (characters: 'tomas' | 'ines') => (s: GameState, p: Project) => {
      const t = addThread(s, p, 'The missing boat');
      const who = p.characters.find((c) => c.name === (characters === 'ines' ? 'Ines' : 'Tomas'))!.id;
      updateThread(p, t.id, { sceneIds: [p.scenes[1].id], resolution: 'open', characterIds: [who] }); // the Boathouse: Tomas alone
    };
    const fits = world('dx-thread', thread('tomas'));
    const misses = world('dx-thread', thread('ines'));
    const note = 'note:The thread "The missing boat" follows Ines, who isn\'t in any of its scenes.';
    expect(issues(fits.p)).not.toContain(note);
    expect(issues(misses.p)).toContain(note);
    // Advisory: it isn't counted where notes weigh on a backer's reading (finance.ts scriptScore), and no work changes.
    expect(scriptIssues(misses.p).find((i) => `${i.severity}:${i.text}` === note)?.advisory).toBe(true);
    expect(taskUnits(misses.p)).toEqual(taskUnits(fits.p));
  });
});

describe('when the story is set', () => {
  it('a period story enters period categories and not present-day ones; the work and the checks stay the same', () => {
    const now = world('dx-time', (_, p) => { p.storyTime = 'contemporary'; });
    const past = world('dx-time', (_, p) => { p.storyTime = 'period'; });
    const period = { need: ['period'] } as Parameters<typeof requirementProblems>[2];
    const today = { need: ['contemporary'] } as Parameters<typeof requirementProblems>[2];
    expect(requirementProblems(now.s, now.p, period)).toEqual(['This category is for stories set in the past.']);
    expect(requirementProblems(past.s, past.p, period)).toEqual([]);
    expect(requirementProblems(now.s, now.p, today)).toEqual([]);
    expect(requirementProblems(past.s, past.p, today)).toEqual(['This category is for stories set in the present day.']);
    // Research for a period comes from the era written (axes.storyEra), not this choice: the work is the same.
    expect(taskUnits(past.p)).toEqual(taskUnits(now.p));
    expect(issues(past.p)).toEqual(issues(now.p));
  });
});

describe('the animation finish', () => {
  it('a finish of feature quality renders longer and takes more animation; the frames, the other work and the other costs stay the same', () => {
    const run = (quality: 'tv' | 'feature') => {
      const s = startLife('dx-finish');
      const p = buildProject(s, { title: 'Orbit Garden', format: 'short', medium: 'animation', technique: '3d-cg', runtime: 5, quality },
        [{ name: 'Ada' }], [{ place: 'Greenhouse', chars: ['Ada'], minutes: 5 }]);
      approve(s, p);
      return { s, p };
    };
    const tv = run('tv');
    const feature = run('feature');
    const lines = (w: { s: GameState; p: Project }) => costBreakdown(w.s, w.p).toCome;
    const render = (w: { s: GameState; p: Project }) => lines(w).find((l) => l.label === 'Render time')!;
    // 1.5 hours a frame against 0.5 (production/rates.ts): three times the node-days for the same frames.
    expect(render(feature).amount).toBeGreaterThan(render(tv).amount * 2.9);
    expect(render(feature).driver.split(',')[0]).toBe(render(tv).driver.split(',')[0]);
    const anim = (p: Project) => buildTasks(p).filter((x) => x.kind === 'anim:animation').reduce((a, x) => a + x.units, 0);
    expect(anim(feature.p)).toBeGreaterThan(anim(tv.p));
    const notAnimated = (p: Project) => taskUnits(p).filter((x) => !x.startsWith('anim:animation:'));
    expect(notAnimated(feature.p)).toEqual(notAnimated(tv.p));
    // Every cost not driven by animation or rendering is the same.
    const others = (w: { s: GameState; p: Project }) => lines(w).filter((l) => l.label !== 'Render time' && !/anim/i.test(`${l.label} ${l.driver}`)).map((l) => `${l.label}:${l.amount}`);
    expect(others(feature)).toEqual(others(tv));
    expect(others(tv).length).toBeGreaterThan(3);
  });
});

describe('languages: what you speak and what a part speaks', () => {
  it('playing a part in a language you speak only a little needs a dialect coach; the same part in English, or with French fluent, does not', () => {
    const run = (french: 'Fluent' | 'Basic', speaks: 'fr' | 'en') => {
      const s = startLife('dx-lang', 'gb-london', { languages: [{ code: 'fr', proficiency: french }] });
      const p = buildProject(s, { title: 'Harbour', format: 'short', medium: 'live-action', runtime: 12 },
        [{ name: 'Ines', patch: { languages: [speaks] } }, { name: 'Tomas' }],
        [{ place: 'Quay', chars: ['Ines', 'Tomas'], minutes: 6 }, { place: 'Lighthouse', chars: ['Ines'], minutes: 6 }]);
      p.axes.dialogueLanguages = ['en', 'fr'];
      approve(s, p);
      castAll(s, p, [{ character: 'Ines', method: 'on-camera' }]);
      return { s, p };
    };
    const coach = (w: { s: GameState; p: Project }) => neededRoles(w.p, w.s).some((r) => r.roleId === 'dialect-coach');
    const basicFrench = run('Basic', 'fr');
    expect(coachingNeeded(basicFrench.s, basicFrench.p)).toEqual(['Ines']);
    expect(coach(basicFrench)).toBe(true);
    for (const w of [run('Fluent', 'fr'), run('Basic', 'en')]) {
      expect(coachingNeeded(w.s, w.p)).toEqual([]);
      expect(coach(w)).toBe(false);
      // Only the coach differs: the rest of the crew and the work are the same.
      expect(neededRoles(w.p, w.s).map((r) => r.roleId)).toEqual(neededRoles(basicFrench.p, basicFrench.s).map((r) => r.roleId).filter((r) => r !== 'dialect-coach'));
      expect(taskUnits(w.p)).toEqual(taskUnits(basicFrench.p));
    }
  });
});

describe('six-day weeks', () => {
  it('the same shoot days fit into fewer weeks, with Saturdays worked; the days, their scenes and the crew needed stay the same', () => {
    // Its own, longer script: ten places, so the shoot runs past a week and the choice has a Saturday to use.
    const run = (six: boolean) => {
      const s = startLife('dx-six');
      const p = buildProject(s, { title: 'Ten Places', format: 'feature', medium: 'live-action', runtime: 90 }, [{ name: 'Ines' }, { name: 'Tomas' }],
        Array.from({ length: 10 }, (_, i) => ({ place: `Place ${i + 1}`, chars: ['Ines', 'Tomas'], minutes: 9 })));
      p.schedule.sixDayWeeks = six;
      approve(s, p);
      agreedFunding(p, 5_000_000); // labelled fixture: money isn't what's compared here
      castAll(s, p);
      generatePlan(s, p, '2026-03-02'); // a Monday
      return p.schedule.days;
    };
    const five = run(false);
    const six = run(true);
    const weekday = (k: string) => new Date(`${k}T12:00:00Z`).getUTCDay();
    expect(five.some((d) => weekday(d.date) === 6)).toBe(false);
    expect(six.map((d) => d.sceneIds.join('+'))).toEqual(five.map((d) => d.sceneIds.join('+')));
    expect(six.length).toBe(five.length);
    expect(five.length).toBeGreaterThan(5); // more days than a week holds
    expect(six.some((d) => weekday(d.date) === 6)).toBe(true);
    expect(six[six.length - 1].date < five[five.length - 1].date).toBe(true); // it ends sooner
  });
});

describe('the financing target', () => {
  it('sets what is still to raise and what a backer is asked for; the estimate and the script are untouched', () => {
    const at = (target: number | null) => {
      const w = world('dx-target');
      writePitch(w.p);
      if (target !== null) setFinanceTarget(w.p, target);
      return w;
    };
    const base = at(null);
    const higher = at(financeSummary(base.p).estimate + 50_000);
    expect(financeSummary(higher.p).stillToRaise - financeSummary(base.p).stillToRaise).toBe(50_000);
    expect(financeSummary(higher.p).estimate).toBe(financeSummary(base.p).estimate);
    expect(taskUnits(higher.p)).toEqual(taskUnits(base.p));
    // With the target met, approaches are closed; raising it reopens them, and the backer answers with an offer.
    expect(financeSummary(base.p).stillToRaise).toBe(0);
    expect(() => approachBacker(base.s, base.p, 'starting')).toThrow('Your target is fully promised.');
    const d = approachBacker(higher.s, higher.p, 'starting');
    processUntil(higher.s, higher.s.now + 30 * DAY, 'tick', 100000);
    expect(d.status).toBe('offered');
    expect(d.amount).toBeGreaterThan(0);
    expect(d.amount).toBeLessThanOrEqual(50_000);
  });
});
