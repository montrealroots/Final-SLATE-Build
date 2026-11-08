// Scope-driven production estimates (November 8, 2026): the estimate follows the work the script needs, by the same rules
// the production pays by, and a change of scope says what it does before it is made.
import { describe, expect, it } from 'vitest';
import { buildTasks, costBreakdown, generatePlan, groupShootDays, ledgerTotals, makeOffer, roleCandidates, scriptEstimate, CROWD_DAY_RATE, addDaysToKey, dateKey } from './engine-api';
import { approvalScope, costCuts, estimateAgainstSpending, scopeChange } from '../src/engine/cost-cuts';
import { setShotPlan } from '../src/engine/takes-actions';
import type { GameState, Project } from '../src/engine/types';
import { approve, buildProject, castAll, manage, runDays, staffAll, startLife, startProduction } from './helpers';

type Spec = Parameters<typeof buildProject>[3];
const SEEDS = ['est-a', 'est-b', 'est-c'];
const oneRoom: Spec = [1, 2, 3].map(() => ({ place: 'Kitchen', chars: ['Ada', 'Bo'], minutes: 4 }));
const spread: Spec = [
  { place: 'Pier', intExt: 'EXT', time: 'NIGHT', chars: ['Ada', 'Bo'], minutes: 4, extra: { crowd: 30 } },
  { place: 'Kitchen', chars: ['Ada', 'Bo'], minutes: 4 },
  { place: 'Roof', intExt: 'EXT', chars: ['Ada', 'Bo'], minutes: 4, extra: { stunts: 'A fall from the roof.' } },
];
function make(s: GameState, title: string, scenes: Spec, medium: 'live-action' | 'animation' = 'live-action'): Project {
  const p = buildProject(s, { title, format: 'short', medium, ...(medium === 'animation' ? { technique: '3d-cg', quality: 'limited' } : {}), runtime: 12 },
    [{ name: 'Ada', patch: { roleSize: 'lead' } }, { name: 'Bo', patch: { roleSize: 'supporting' } }], scenes);
  approve(s, p);
  return p;
}
const area = (s: GameState, p: Project, a: string) => costBreakdown(s, p).toCome.filter((x) => x.area === a).reduce((t, x) => t + x.amount, 0);

describe('the estimate follows the work', () => {
  it('same runtime, different production complexity: places, night, crowd and stunts cost the days and people they need', () => {
    for (const seed of SEEDS) {
      const s = startLife(seed);
      const a = make(s, 'One Room', oneRoom);
      const b = make(s, 'Spread Out', spread);
      const ba = costBreakdown(s, a);
      const bb = costBreakdown(s, b);
      // Twelve minutes in one place, no exchange of dialogue: a master each, two takes planned, half the standard time,
      // so two days at four minutes of standard work a day (production/schedule.ts, takes.ts setupTime).
      expect(ba.shootDays).toBe(2);
      expect(bb.shootDays).toBeGreaterThan(ba.shootDays); // a day-or-night and inside-or-out split each needs its own day; the stunt and the crowd are slower
      expect(bb.total).toBeGreaterThan(ba.total);
      expect(bb.toCome.map((x) => x.label)).toEqual(expect.arrayContaining(['Pier, exterior, night', 'Roof, exterior', 'Stunt Coordinator', 'Background performers: Pier, exterior, night']));
      expect(bb.toCome.find((x) => x.label === 'Background performers: Pier, exterior, night')!.amount % (30 * CROWD_DAY_RATE)).toBe(0);
      expect(ba.risks).toEqual([]); // nothing outside: no day can be lost to rain
      expect(bb.risks[0].item).toMatch(/^\d exterior shoot days can be lost to rain or short daylight/);
    }
  });

  it('the estimate counts the shoot days the schedule then plans, coverage included', () => {
    for (const seed of SEEDS) {
      const s = startLife(seed);
      for (const p of [make(s, 'One Room', oneRoom), make(s, 'Spread Out', spread)]) {
        for (const sc of p.scenes) setShotPlan(p, sc.id, { coverage: 'full', takes: 'many' }); // the richest plan takes most of the day
        const estimated = costBreakdown(s, p).shootDays;
        expect(estimated).toBe(groupShootDays(p).length);
        generatePlan(s, p, addDaysToKey(dateKey(s.now, 'Europe/London'), 30));
        expect(p.schedule.days.length).toBe(estimated);
      }
    }
  });

  it('richer coverage costs more shoot days in the estimate, as it does on the day', () => {
    const s = startLife('est-coverage');
    const p = make(s, 'One Room', oneRoom);
    const plain = costBreakdown(s, p).shootDays;
    for (const sc of p.scenes) setShotPlan(p, sc.id, { coverage: 'full', takes: 'many' });
    expect(costBreakdown(s, p).shootDays).toBeGreaterThan(plain);
  });

  it('same script, different production method: animation has no shoot days but studio and render time', () => {
    const s = startLife('est-method');
    const live = make(s, 'Live', oneRoom);
    const anim = make(s, 'Drawn', oneRoom, 'animation');
    expect(area(s, live, 'shoot')).toBeGreaterThan(0);
    expect(area(s, anim, 'shoot')).toBe(0);
    expect(costBreakdown(s, anim).toCome.map((x) => x.label)).toEqual(expect.arrayContaining(['Recording studio', 'Render time']));
    expect(area(s, live, 'facilities')).toBe(0);
  });

  it('an unavailable required role is priced at its lowest rate and named as uncertain, not counted at nothing', () => {
    const s = startLife('est-unavailable');
    const p = make(s, 'One Room', oneRoom);
    const before = costBreakdown(s, p).toCome.find((x) => x.label === 'Editor')!.amount;
    for (const x of roleCandidates(s, p, 'editor')) x.busy.push({ from: '2026-01-01', to: '2030-12-31' }); // labelled fixture: every editor booked elsewhere
    const b = costBreakdown(s, p);
    const editor = b.toCome.find((x) => x.label === 'Editor')!;
    expect(editor.amount).toBeGreaterThan(0);
    expect(editor.amount).toBeLessThanOrEqual(before);
    expect(b.uncertain.find((u) => u.item.startsWith('Editor:'))!.resolve).toBe('Move the start date, or change the script so the role is no longer needed.');
  });

  it('reused work is not priced again: a finished build drops out, at the design it was built to', () => {
    const s = startLife('est-reuse');
    const p = buildProject(s, { title: 'Clay', format: 'short', medium: 'animation', technique: 'stop-motion', quality: 'limited', runtime: 3 }, [{ name: 'Pip', patch: { roleSize: 'lead' } }], [{ place: 'Drawer', chars: ['Pip'], minutes: 1 }]);
    approve(s, p);
    const fresh = area(s, p, 'builds');
    const puppet = costBreakdown(s, p).toCome.find((x) => x.label.startsWith('Puppet Fabrication'))!;
    p.tasks = buildTasks(p).filter((t) => t.id === `sm:puppet:${p.characters[0].id}`).map((t) => ({ ...t, status: 'done' as const, done: t.units })); // labelled fixture: a puppet carried over from earlier work
    expect(area(s, p, 'builds')).toBe(fresh - puppet.amount);
  });

  it('money is counted once: an offer out holds its money and is not priced again as work to come', () => {
    const s = startLife('est-once');
    const p = make(s, 'One Room', oneRoom);
    p.funding.fund += 1_000_000; // labelled fixture: money for the offer
    const total = costBreakdown(s, p).total;
    const ada = p.characters.find((c) => c.name === 'Ada')!;
    const actor = roleCandidates(s, p, 'actor').filter((x) => x.experience >= 2).sort((x, y) => x.dayRate - y.dayRate)[0];
    makeOffer(s, p, { personId: actor.id, roleId: 'actor', dayRate: actor.dayRate, characterId: ada.id, method: 'on-camera' });
    const b = costBreakdown(s, p);
    expect(b.toCome.some((x) => x.label === 'Ada (on camera)')).toBe(false);
    expect(b.reserved).toBe(ledgerTotals(p).reserved);
    expect(Math.abs(b.total - total)).toBeLessThan(actor.dayRate * 3); // the same part, held instead of estimated
  });
});

describe('changing scope', () => {
  it('a cut says what it saves in money and shoot days before it is made', () => {
    const s = startLife('scope-cuts');
    const p = make(s, 'Spread Out', spread);
    const cuts = costCuts(s, p, 10);
    const pier = cuts.find((c) => c.label.startsWith('Cut Pier'))!;
    expect(pier.saving).toBeGreaterThan(0);
    expect(pier.days).toBeLessThan(0);
    const night = cuts.find((c) => c.label === 'Shoot Pier by day');
    if (night) expect(night.saving).toBeGreaterThanOrEqual(0); // offered with its effect; never a fabricated saving
  });

  it('before commitments, approving a smaller draft lowers the estimate and the days; after, the contracts stay and are named', () => {
    const s = startLife('scope-commit');
    const p = make(s, 'Spread Out', spread);
    // Draft 2 drops the pier scene.
    p.scenes = p.scenes.filter((x) => x.heading.place !== 'Pier');
    p.drafts.push({ ...JSON.parse(JSON.stringify(p.drafts[0])), number: 2, approved: false, scenes: JSON.parse(JSON.stringify(p.scenes)) });
    const early = approvalScope(s, p, 2);
    expect(early.after.shootDays).toBeLessThan(early.before.shootDays);
    expect(early.after.total).toBeLessThan(early.before.total);
    expect(early.commitments).toEqual([]);
    // After hiring a stunt coordinator (needed only for the roof, which stays) and a crowd casting coordinator (needed
    // only for the pier crowd, which goes), the second is named as a commitment that outlasts the change.
    p.funding.fund += 1_000_000;
    const coord = roleCandidates(s, p, 'extras-casting')[0];
    const h = makeOffer(s, p, { personId: coord.id, roleId: 'extras-casting', dayRate: coord.dayRate * 2 });
    for (let i = 0; i < 5 && h.status === 'offered'; i++) manage(s, p), runDays(s, p, 1);
    expect(h.status).toBe('accepted');
    const late = approvalScope(s, p, 2);
    expect(late.commitments.some((c) => c.startsWith('Background Casting Coordinator: $') && c.includes('the contract stays until you release them'))).toBe(true);
  });

  it('a change after filming keeps the footage of unchanged scenes and estimates only what is left to shoot', () => {
    const s = startLife('scope-after');
    const p = make(s, 'One Room', oneRoom);
    p.captures.push({ sceneId: p.scenes[0].id, captured: 1, quality: 60, version: p.approvedDraft!, weatherCompromised: false }); // labelled fixture: scene 1 filmed
    const c = scopeChange(s, p, () => {});
    expect(costBreakdown(s, { ...p, captures: [] }).shootDays).toBe(2); // all three scenes
    expect(c.before.shootDays).toBe(1); // the two left: filmed footage isn't shot again
    expect(c.after.shootDays).toBe(1);
  });
});

describe('estimate against spending', () => {
  it('after shooting, spending is compared by area with the estimate made at approval, and the differences explained', () => {
    const s = startLife('vs-actual', 'gb-london', { startDate: '2026-10-05', startTime: '09:00' });
    const p = buildProject(s, { title: 'Wet Streets', format: 'short', medium: 'live-action', scenario: 'micro', runtime: 6 }, [{ name: 'Ada', patch: { roleSize: 'lead' } }],
      [1, 2, 3].map((i) => ({ place: `Street ${i}`, intExt: 'EXT' as const, time: 'DAY' as const, chars: ['Ada'], minutes: 2 })));
    approve(s, p);
    const snap = p.finance!.estimateAtApproval!;
    expect(snap.shootDays).toBe(3);
    expect(scriptEstimate(s, p)).toBe(p.finance!.estimate);
    castAll(s, p); staffAll(s, p);
    for (let i = 0; i < 8; i++) { manage(s, p); runDays(s, p, 1); }
    startProduction(s, p, 3);
    runDays(s, p, 40);
    const vs = estimateAgainstSpending(p)!;
    expect(vs.rows.map((r) => r.label)).toEqual(expect.arrayContaining(['Crew', 'Cast', 'Shoot Days']));
    // This world's October rains on one exterior day: it is lost and shot again, so shoot days cost more than estimated.
    expect(p.schedule.days.filter((d) => d.status === 'lost').length).toBe(1);
    expect(vs.reasons).toContain('1 shoot day was lost and paid again.');
    const shoot = vs.rows.find((r) => r.area === 'shoot')!;
    expect(shoot.actual).toBeGreaterThan(shoot.estimated);
    // Builds were reserved exactly as estimated: same rule, same figure.
    const builds = vs.rows.find((r) => r.area === 'builds')!;
    expect(builds.actual).toBe(builds.estimated);
  }, 60000);
});
