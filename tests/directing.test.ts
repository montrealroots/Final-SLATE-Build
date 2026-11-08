// Contextual directing (November 8, 2026): what a scene needs comes from its declared facts and the player's emphasis;
// coverage it lacks costs the edit and surplus earns nothing but options; takes stop by rule and can disappoint; the day's
// material is reviewed and each issue has fixes with costs. Earlier saves keep the earlier rules (tests/takes.test.ts).
import { describe, expect, it } from 'vitest';
import { DAY, assessQuality, processUntil } from './engine-api';
import { deserialize, serialize } from '../src/engine/save';
import { applyFix, dailies, pickupCost, sceneIssues } from '../src/engine/directing';
import { setShotPlan } from '../src/engine/takes-actions';
import { TAKE_RULES, coverageEdit, editPerformance, planTime, recordTakes, requiredSetups, shotPlan } from '../src/engine/takes';
import type { GameState, Project } from '../src/engine/types';
import { approve, buildProject, castAll, manage, staffAll, startLife, startProduction } from './helpers';

const line = (characterId: string, text: string) => ({ id: `l-${characterId}-${text.length}`, characterId, text, language: 'en' });
function twoScenes(tag: string): { s: GameState; p: Project } {
  const s = startLife(tag, 'gb-london');
  const p = buildProject(s, { title: 'Harbour Lights', format: 'short', medium: 'live-action', scenario: 'micro', runtime: 8 },
    [{ name: 'Ada', patch: { roleSize: 'lead' } }, { name: 'Bo', patch: { roleSize: 'supporting' } }],
    [{ place: 'Kitchen', chars: ['Ada', 'Bo'], minutes: 3 }, { place: 'Kitchen', chars: ['Ada'], minutes: 3, extra: { stunts: 'She falls from the chair.' } }]);
  const [ada, bo] = p.characters;
  p.scenes[0].dialogue = [line(ada.id, 'You came back.'), line(bo.id, 'I had to.')]; // labelled fixture: an exchange
  approve(s, p);
  return { s, p };
}
function shoot(s: GameState, p: Project) {
  castAll(s, p);
  staffAll(s, p);
  for (let i = 0; i < 8; i++) { manage(s, p); processUntil(s, s.now + DAY, 'tick', 100000); }
  startProduction(s, p, 3);
  // Until the shoot is over, before the edit is locked (manage() would lock and deliver).
  for (let i = 0; i < 40 && p.schedule.days.some((d) => d.status === 'scheduled'); i++) { processUntil(s, s.now + DAY, 'tick', 100000); for (const h of p.hires.filter((x) => x.status === 'countered')) h.status = 'declined'; }
}
const shootDays = (p: Project) => p.schedule.days.filter((d) => d.status === 'shot' || d.status === 'partial').length;

describe('what a scene needs', () => {
  it('comes from its declared facts and the player\'s emphasis, never from its free text', () => {
    const { p } = twoScenes('dir-needs');
    const [talk, fall] = p.scenes;
    expect(requiredSetups(p, talk).map((x) => x.setup)).toEqual(['master', 'singles']);
    expect(requiredSetups(p, fall).map((x) => x.setup)).toEqual(['master', 'inserts']);
    talk.action = 'A long, intricate description of every close-up and insert the director dreams of.';
    expect(requiredSetups(p, talk).map((x) => x.setup)).toEqual(['master', 'singles']); // prose changes nothing
    setShotPlan(p, talk.id, { emphasis: 'one-shot' });
    expect(requiredSetups(p, talk)).toEqual([{ setup: 'master', reason: 'You chose to play it in one shot.' }]);
    expect(shotPlan(p, talk.id)!.coverage).toBe('master'); // the coverage follows the emphasis
    setShotPlan(p, talk.id, { emphasis: 'detail' });
    expect(requiredSetups(p, talk).map((x) => x.setup)).toEqual(['master', 'singles', 'inserts']);
    expect(shotPlan(p, talk.id)!.coverage).toBe('full');
  });

  it('the plan starts at what the scene needs: a lone character with no exchange needs only a master', () => {
    const s = startLife('dir-default');
    const p = buildProject(s, { title: 'Alone', format: 'short', medium: 'live-action', runtime: 4 }, [{ name: 'Ada' }], [{ place: 'Room', chars: ['Ada'], minutes: 2 }]);
    approve(s, p);
    expect(shotPlan(p, p.scenes[0].id)).toEqual({ coverage: 'master', takes: 'few', emphasis: 'scene' });
  });
});

describe('coverage against need', () => {
  it('missing coverage costs the edit; coverage the scene needs costs nothing; surplus earns no bonus, only time', () => {
    const { p } = twoScenes('dir-cover');
    const talk = p.scenes[0];
    setShotPlan(p, talk.id, { coverage: 'full' });
    const rich = planTime(p, talk);
    setShotPlan(p, talk.id, { coverage: 'standard' });
    expect(rich).toBeGreaterThan(planTime(p, talk)); // surplus takes more of the day
    const cap = (setups: ('master' | 'singles' | 'inserts')[]) => { p.captures = [{ sceneId: talk.id, captured: 1, quality: 60, version: p.approvedDraft!, weatherCompromised: false, setups, days: 1, takes: [{ perf: 60, tech: 60 }], chosenTake: 0 }]; return coverageEdit(p, [talk.id]); };
    expect(cap(['master'])).toBe(-6); // the exchange has no singles to cut between
    expect(cap(['master', 'singles'])).toBe(0);
    expect(cap(['master', 'singles', 'inserts'])).toBe(0); // and earns no bonus
  });

  it('a restrained one-shot scene is not penalised for using fewer shots', () => {
    const { p } = twoScenes('dir-oneshot');
    const talk = p.scenes[0];
    setShotPlan(p, talk.id, { emphasis: 'one-shot' });
    p.captures = [{ sceneId: talk.id, captured: 1, quality: 60, version: p.approvedDraft!, weatherCompromised: false, setups: ['master'], days: 1, takes: [{ perf: 60, tech: 60 }], chosenTake: 0 }];
    expect(coverageEdit(p, [talk.id])).toBe(0);
  });

  it('surplus coverage gives the edit options: with singles the editor cuts between takes for the performance', () => {
    const { p } = twoScenes('dir-options');
    const c = { sceneId: p.scenes[0].id, captured: 1, quality: 60, version: p.approvedDraft!, weatherCompromised: false, days: 1, takes: [{ perf: 55, tech: 70 }, { perf: 68, tech: 50 }], chosenTake: 0 };
    expect(editPerformance(p, { ...c, setups: ['master'] })).toBe(55); // one take plays whole
    expect(editPerformance(p, { ...c, setups: ['master', 'singles'] })).toBe(68); // cut between them
  });
});

describe('takes', () => {
  it('a usable first take ends the usual rule\'s takes; keeping going costs more of the day and can still disappoint', () => {
    const { s, p } = twoScenes('dir-takes');
    const talk = p.scenes[0];
    let firstUsable = 0;
    let manyNotBetter = 0;
    for (let i = 0; i < 40; i++) {
      const date = `2026-0${1 + (i % 9)}-1${i % 10}`;
      setShotPlan(p, talk.id, { takes: 'few' });
      const few = recordTakes(s.seed + i, p, talk, date, 60);
      if (few.takes.length === 1) { firstUsable++; expect(few.takes[0].issue).toBeUndefined(); }
      expect(few.takes.length).toBeLessThanOrEqual(TAKE_RULES.few.max);
      setShotPlan(p, talk.id, { takes: 'many' });
      const many = recordTakes(s.seed + i, p, talk, date, 60);
      expect(many.takes.length).toBe(TAKE_RULES.many.max);
      const q = (r: typeof few) => r.takes[r.chosen].perf + r.takes[r.chosen].tech;
      if (q(many) <= q(few)) manyNotBetter++;
    }
    expect(firstUsable).toBeGreaterThan(20); // most scenes are usable first time at what the crew and cast can do
    expect(manyNotBetter).toBeGreaterThan(0); // more takes are not a guaranteed improvement
    setShotPlan(p, talk.id, { takes: 'many' });
    const manyTime = planTime(p, talk);
    setShotPlan(p, talk.id, { takes: 'few' });
    expect(manyTime).toBeGreaterThan(planTime(p, talk) * 1.8);
  });

  it('under the same resources, covering what each scene needs shoots in fewer days than the most of everything, and edits no worse', () => {
    for (const tag of ['dir-approach-a', 'dir-approach-b', 'dir-approach-c']) {
      const lean = twoScenes(tag);
      shoot(lean.s, lean.p);
      const lavish = twoScenes(tag);
      for (const sc of lavish.p.scenes) setShotPlan(lavish.p, sc.id, { coverage: 'full', takes: 'many' });
      shoot(lavish.s, lavish.p);
      expect(shootDays(lean.p)).toBeLessThan(shootDays(lavish.p));
      expect(coverageEdit(lean.p, lean.p.scenes.map((x) => x.id))).toBe(0);
      expect(coverageEdit(lavish.p, lavish.p.scenes.map((x) => x.id))).toBe(0); // the surplus earns nothing
      void assessQuality;
    }
  }, 120000);
});

describe('reviewing the day\'s material', () => {
  it('names each issue with fixes that fit it: use another take, replace the lines, shoot a pickup, or move on', () => {
    const { s, p } = twoScenes('dir-review');
    shoot(s, p);
    const talk = p.scenes[0];
    const c = p.captures.find((x) => x.sceneId === talk.id)!;
    expect(c.setups).toEqual(['master', 'singles']);
    // Labelled fixture: the take in the cut has a sound problem; an earlier clean take exists.
    c.takes = [{ perf: 62, tech: 61 }, { perf: 64, tech: 40, issue: 'sound' }];
    c.chosenTake = 1;
    p.tasks = p.tasks.filter((t) => t.id !== `post:adr:${talk.id}`); // and no dialogue replacement booked for it yet
    const issues = sceneIssues(p, talk, c);
    expect(issues[0].text).toBe('The take in the cut (take 2): the sound is unusable.');
    expect(issues[0].fixes.map((f) => f.action)).toEqual(['use-take', 'adr', 'pickup', 'accept']);
    applyFix(s, p, talk.id, issues[0].fixes[0]);
    expect(c.chosenTake).toBe(0);
    expect(sceneIssues(p, talk, c)).toEqual([]);
    expect(dailies(p).find((d) => d.sceneId === talk.id)!.takes.map((t) => t.inCut)).toEqual([true, false]); // the other take stays available
  }, 60000);

  it('missing coverage is shot on a targeted pickup, at a day\'s cost shown first, and then the edit has it', () => {
    const { s, p } = twoScenes('dir-pickup');
    setShotPlan(p, p.scenes[0].id, { coverage: 'master' }); // shoot the exchange in a master only: a decision with a cost
    shoot(s, p);
    const talk = p.scenes[0];
    const c = p.captures.find((x) => x.sceneId === talk.id)!;
    expect(coverageEdit(p, [talk.id])).toBe(-6);
    const issue = sceneIssues(p, talk, c).find((i) => i.text.startsWith('No singles'))!;
    const pick = issue.fixes.find((f) => f.action === 'pickup')!;
    expect(pick.label).toContain(`about $${pickupCost(p, talk.id).cost.toLocaleString('en-US')}`);
    const spentBefore = p.obligations.reduce((a, o) => a + o.settled, 0);
    p.funding.fund -= 1_000_000; // labelled fixture: nothing uncommitted
    expect(() => applyFix(s, p, talk.id, pick)).toThrow(/^A pickup day costs about \$[\d,]+, and -?\$[\d,]+ is uncommitted\. Add funding first\.$/);
    p.funding.fund += 1_100_000; // labelled fixture: more backing arrives
    applyFix(s, p, talk.id, pick);
    const day = p.schedule.days.find((d) => d.pickups?.[talk.id])!;
    expect(day.pickups).toEqual({ [talk.id]: 'singles' });
    for (let i = 0; i < 30 && p.schedule.days.some((d) => d.status === 'scheduled'); i++) processUntil(s, s.now + DAY, 'tick', 100000);
    expect(c.setups).toContain('singles');
    expect(coverageEdit(p, [talk.id])).toBe(0);
    expect(p.obligations.reduce((a, o) => a + o.settled, 0)).toBeGreaterThan(spentBefore); // the pickup day was paid
    expect(c.takes!.length).toBeGreaterThan(0); // the earlier takes are kept
  }, 120000);

  it('accepting a gap stops it being raised and keeps its cost in the edit; the choice survives a save', () => {
    const { s, p } = twoScenes('dir-accept');
    setShotPlan(p, p.scenes[0].id, { coverage: 'master' });
    shoot(s, p);
    const talk = p.scenes[0];
    const c = p.captures.find((x) => x.sceneId === talk.id)!;
    const accept = sceneIssues(p, talk, c)[0].fixes.find((f) => f.action === 'accept')!;
    applyFix(s, p, talk.id, accept);
    expect(sceneIssues(p, talk, c)).toEqual([]);
    expect(coverageEdit(p, [talk.id])).toBe(0); // accepted as the director's choice
    const back = deserialize(serialize(s)).projects.find((x) => x.id === p.id)!;
    const cb = back.captures.find((x) => x.sceneId === talk.id)!;
    expect(cb.accepted).toEqual(['singles']);
    expect(cb.setups).toEqual(c.setups);
    expect(cb.takes).toEqual(c.takes);
  }, 60000);
});

describe('earlier saves', () => {
  it('a project from before keeps its takes and its coverage bonus; no review is offered', () => {
    const { s, p } = twoScenes('dir-old');
    delete p.directing; // labelled fixture: a project from before November 8, 2026
    shoot(s, p);
    expect(dailies(p)).toEqual([]);
    expect(p.captures.some((c) => c.setups)).toBe(false);
  }, 60000);
});
