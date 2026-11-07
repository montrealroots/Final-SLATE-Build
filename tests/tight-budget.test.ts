// What a production does when money runs short partway (November 7, 2026). Work that can't be paid for stops with the
// reason; it never fails the day, which would roll the whole day back and stop time.
import { describe, expect, it } from 'vitest';
import { CONTINGENCY, addDaysToKey, dateKey, generatePlan, ledgerTotals, neededRoles, projectedCost, proposeStaffing, reserve, runWorkDay, sendStaffingOffers, setFinanceTarget } from './engine-api';
import { agreedFunding, approve, buildProject, castAll, startLife } from './helpers';

describe('a production short of money', () => {
  it('a voice session it can no longer pay the studio for waits, with the reason', () => {
    const s = startLife('tight-voice');
    const p = buildProject(s, { title: 'Moth Lamp', format: 'short', medium: 'animation', technique: '2d-drawn', runtime: 2, quality: 'limited', scenario: 'micro' },
      [{ name: 'Moth', patch: { roleSize: 'lead' } }], [{ place: 'Porch', chars: ['Moth'], minutes: 2 }]);
    approve(s, p);
    castAll(s, p, [{ character: 'Moth', method: 'voice' }]); // the player voices the part: no fee, but the studio is still paid
    const today = dateKey(s.now, 'Europe/London');
    generatePlan(s, p, today);
    const voice = p.tasks.find((t) => t.kind === 'anim:voice')!;
    for (const t of p.tasks) if (voice.dependsOn.includes(t.id)) { t.status = 'done'; t.done = t.units; }
    reserve(s, p, 'Everything Else', 'contingency', ledgerTotals(p).available - 100);
    let day = today;
    for (let i = 0; i < 7 && voice.status !== 'blocked'; i++) { runWorkDay(s, p, day); day = addDaysToKey(day, 1); }
    expect(voice.status).toBe('blocked');
    expect(voice.done).toBe(0);
    expect(voice.blockedReason).toBe("There isn't enough money left for recording studio time. Add funding or cut scope.");
  });
});

describe('staffing proposals on a small budget', () => {
  const stopMotion = (tag: string) => {
    const s = startLife(tag);
    const p = buildProject(s, { title: 'Pip', format: 'short', medium: 'animation', technique: 'stop-motion', runtime: 2, quality: 'limited', scenario: 'micro' },
      [{ name: 'Pip', patch: { roleSize: 'lead' } }, { name: 'Crow', patch: {} }], [{ place: 'Drawer', chars: ['Pip'], minutes: 1 }, { place: 'Sill', chars: ['Pip', 'Crow'], minutes: 1 }]);
    approve(s, p);
    return { s, p };
  };

  it('on a micro budget, one person takes the roles they can combine instead of each being hired separately', () => {
    const { s, p } = stopMotion('combine');
    agreedFunding(p, 200_000); // enough for everyone, so only combining decides who is proposed
    const post = proposeStaffing(s, p, 'Post Production').proposals.map((x) => x.roleId);
    expect(post).toContain('editor');
    expect(post).toContain('sound-designer');
    for (const covered of ['colorist', 'qc-technician', 'subtitler', 're-recording-mixer']) expect(post).not.toContain(covered);
    const sm = proposeStaffing(s, p, 'Stop Motion').proposals.map((x) => x.roleId);
    expect(sm).toContain('puppet-fabricator');
    expect(sm).not.toContain('armature-fabricator');
  });

  it('staffing hires a required crew the money can pay, or no one: never the composer without the animator', () => {
    const { s, p } = stopMotion('reserve');
    // Staffing department by department, in the order the Crew page lists them, still reaches the animator.
    const depts = [...new Set(neededRoles(p, s).map((r) => r.dept))];
    for (const d of depts) sendStaffingOffers(s, p, proposeStaffing(s, p, d).proposals);
    const animator = p.hires.some((h) => h.roleId === 'stopmo-animator');
    const skippedAnywhere = depts.flatMap((d) => proposeStaffing(s, p, d).skipped);
    // Either the whole required crew fitted, animator included, or no one was hired and the shortfall was named.
    if (!animator) expect(skippedAnywhere.join(' ')).toMatch(/The required crew still to hire costs about \$[\d,]+ at the lowest rates, and \$[\d,]+ is uncommitted\./);
    expect(animator || !p.hires.some((h) => h.roleId === 'composer')).toBe(true);
  });
});

describe("an approved script's budget estimate", () => {
  const short = (tag: string, technique: 'stop-motion' | 'none', minutes: number) => {
    const s = startLife(tag);
    const anim = technique !== 'none';
    const p = buildProject(s, { title: 'Est', format: 'short', medium: anim ? 'animation' : 'live-action', ...(anim ? { technique } : {}), runtime: minutes, quality: 'limited', scenario: 'micro' },
      [{ name: 'Pip', patch: { roleSize: 'lead' } }], [{ place: 'Drawer', chars: ['Pip'], minutes }]);
    return { s, p };
  };

  it('follows what the script needs: a longer stop-motion short is estimated higher, and the target follows', () => {
    const one = short('est-1', 'stop-motion', 1);
    const two = short('est-1', 'stop-motion', 2);
    expect(one.p.finance!.estimate).toBe(40_000); // before approval: the size's amount
    approve(one.s, one.p);
    approve(two.s, two.p);
    expect(one.p.finance!.estimate).toBeGreaterThan(40_000);
    expect(two.p.finance!.estimate).toBeGreaterThan(one.p.finance!.estimate);
    expect(two.p.finance!.target).toBe(two.p.finance!.estimate);
    // It covers its own parts with the contingency.
    expect(two.p.finance!.estimate).toBeGreaterThanOrEqual(projectedCost(two.s, two.p).total * (1 + CONTINGENCY) - 1000);
  });

  it('a script that fits its budget size keeps the size amount', () => {
    const { s, p } = short('est-live', 'none', 3);
    approve(s, p);
    expect(p.finance!.estimate).toBe(40_000);
  });

  it('a target the player set is left alone', () => {
    const { s, p } = short('est-own', 'stop-motion', 2);
    setFinanceTarget(p, 55_000);
    approve(s, p);
    expect(p.finance!.estimate).toBeGreaterThan(55_000);
    expect(p.finance!.target).toBe(55_000);
  });
});
