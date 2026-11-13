// Guide Me (engine/mandates.ts; the v4 package, 01; ledger V4-006): a crew department staffed on the player's behalf
// inside an approved ceiling, by ordinary in-game actions that take their time, with anything outside it returned once.
import { describe, expect, it } from 'vitest';
import { DAY, ledgerTotals, processUntil } from './engine-api';
import { CAST, GUIDE_ME_LOOK_DAYS, WRITING, WRITING_STANDARD, activeMandate, approveGuideMe, endGuideMe, guideMePlan, guideMeRefusal, mandateCommitted, runMandate } from '../src/engine/mandates';
import { withdrawOffer } from '../src/engine/hiring';
import { personById } from '../src/engine/people';
import { requiredCrewPlan } from '../src/engine/hiring';
import { deserialize, serialize } from '../src/engine/save';
import type { GameState, Project } from '../src/engine/types';
import { agreedFunding, approve, buildProject, startLife } from './helpers';

const DEPT = 'Post Production'; // five required jobs on this short: enough for a ceiling to leave some out
function film(tag: string, money = 400_000): { s: GameState; p: Project } {
  const s = startLife(tag);
  const p = buildProject(s, { title: 'Harbour Lights', format: 'short', medium: 'live-action', runtime: 12, scenario: 'low' }, [{ name: 'Mara', patch: { roleSize: 'lead' } }],
    [{ place: 'Pier', chars: ['Mara'], minutes: 4 }, { place: 'Kitchen', intExt: 'INT', chars: ['Mara'], minutes: 4 }]);
  approve(s, p);
  agreedFunding(p, money); // labelled fixture: the project's money is raised
  p.finance!.deals.at(-1)!.id = 'fd1'; // the helper's id is not one a save accepts
  return { s, p };
}
const open = (s: GameState, p: Project) => requiredCrewPlan(s, p).filter((x) => x.nr.dept === DEPT).length;
const days = (s: GameState, n: number) => processUntil(s, s.now + n * DAY, 'tick', 400000);

describe('Guide Me', () => {
  it('plans before it is approved, then sends offers at asking rates and waits for answers; nothing is done instantly', () => {
    const { s, p } = film('gm-plan');
    const plan = guideMePlan(s, p, DEPT);
    expect(plan.picks.length).toBeGreaterThan(0);
    expect(p.hires).toEqual([]); // reading the plan does nothing
    const m = approveGuideMe(s, p, DEPT, plan.total);
    const offered = p.hires.filter((h) => h.guided === m.id);
    expect(offered.map((h) => [h.roleId, h.status, h.dayRate])).toEqual(plan.picks.map((x) => [x.roleId, 'offered', x.dayRate]));
    // The money is reserved on the ledger under a line that says Guide Me, and the mandate's committed sum is those lines.
    for (const h of offered) expect(p.obligations.find((o) => o.id === h.obligationId)!.label).toMatch(/\(Guide Me\)$/);
    // The plan prices each job before any offer; with others hired, some jobs need fewer days, so it costs that or less.
    expect(mandateCommitted(p, m)).toBe(offered.reduce((a, h) => a + h.dayRate * h.estDays, 0));
    expect(mandateCommitted(p, m)).toBeLessThanOrEqual(plan.total);
    expect(s.log.some((l) => /^Guide Me is staffing Post Production on Harbour Lights within \$[\d,]+\./.test(l.text))).toBe(true);
    // Answers take days.
    days(s, 6);
    expect(offered.every((h) => h.status !== 'offered')).toBe(true);
  });

  it('follows up within the ceiling: someone else after a no, never the same person, and finishes when the department is staffed', () => {
    const { s, p } = film('gm-follow');
    const m = approveGuideMe(s, p, DEPT, guideMePlan(s, p, DEPT).total * 3);
    for (let i = 0; i < 20 && activeMandate(p, DEPT); i++) days(s, GUIDE_ME_LOOK_DAYS);
    const mine = p.hires.filter((h) => h.guided === m.id);
    const people = mine.map((h) => `${h.roleId}:${h.personId}`);
    expect(new Set(people).size).toBe(people.length); // nobody asked twice for the same job
    expect(open(s, p)).toBe(0);
    expect(m.ended).toBe('done');
    expect(mandateCommitted(p, m)).toBeLessThanOrEqual(m.ceiling);
    expect(s.log.some((l) => /^Guide Me finished staffing Post Production on Harbour Lights: \$[\d,]+ of the \$[\d,]+ ceiling committed\.$/.test(l.text))).toBe(true);
  });

  it('never goes past the ceiling: what does not fit is returned to the player once, and the rest is done', () => {
    const { s, p } = film('gm-ceiling');
    const plan = guideMePlan(s, p, DEPT);
    const cheapest = Math.min(...plan.picks.map((x) => x.total));
    const m = approveGuideMe(s, p, DEPT, cheapest); // room for one role only
    days(s, 3);
    expect(mandateCommitted(p, m)).toBeLessThanOrEqual(m.ceiling);
    expect(m.told.some((t) => /nobody free fits within what remains of the \$[\d,]+ ceiling\./.test(t))).toBe(true);
    const told = s.log.filter((l) => l.text.startsWith('Guide Me, Post Production on Harbour Lights:')).length;
    days(s, 3);
    expect(s.log.filter((l) => l.text.startsWith('Guide Me, Post Production on Harbour Lights:')).length).toBe(told); // said once
  });

  it('is refused above the money there is, and while one is already running; back to manual stops it and keeps what was sent', () => {
    const { s, p } = film('gm-manual');
    expect(guideMeRefusal(p, DEPT, ledgerTotals(p).available + 1)).toMatch(/^A ceiling of \$[\d,]+ is more than the \$[\d,]+ uncommitted\./);
    expect(guideMeRefusal(p, DEPT, 0)).toBe('Set a spending ceiling above zero.');
    approveGuideMe(s, p, DEPT, guideMePlan(s, p, DEPT).total);
    expect(guideMeRefusal(p, DEPT, 1000)).toMatch(/^Guide Me is already staffing this department\./);
    const sent = p.hires.length;
    endGuideMe(s, p, DEPT);
    expect(activeMandate(p, DEPT)).toBeUndefined();
    days(s, 10);
    expect(p.hires.length).toBe(sent); // it sends nothing more
    expect(p.hires.some((h) => h.status === 'accepted' || h.status === 'declined')).toBe(true); // what it sent was answered as usual
  });

  it('after a no, offers the job to someone else, never to the same person again', () => {
    const { s, p } = film('gm-no');
    const m = approveGuideMe(s, p, DEPT, guideMePlan(s, p, DEPT).total * 3);
    const first = p.hires.find((h) => h.guided === m.id && h.roleId === 'editor')!;
    withdrawOffer(s, p, first.id); // labelled fixture: the editor said no (the offer is closed as declined)
    runMandate(s, p, m);
    const next = p.hires.filter((h) => h.guided === m.id && h.roleId === 'editor' && h.status === 'offered');
    expect(next).toHaveLength(1);
    expect(next[0].personId).not.toBe(first.personId);
  });

  it('accepts a counteroffer that still fits under the ceiling, and returns one that does not', () => {
    const { s, p } = film('gm-counter');
    const m = approveGuideMe(s, p, DEPT, guideMePlan(s, p, DEPT).total);
    m.ceiling = mandateCommitted(p, m) + 400; // labelled fixture: $400 of room left under the ceiling, whatever the plan's slack
    const [a, b] = p.hires.filter((h) => h.guided === m.id);
    // Labelled fixtures: two of them answered with a counteroffer, one a little above the offer and one far above it.
    Object.assign(a, { status: 'countered', counterRate: a.dayRate + Math.floor(300 / a.estDays), counterUntil: s.now + 7 * DAY });
    Object.assign(b, { status: 'countered', counterRate: b.dayRate * 2, counterUntil: s.now + 7 * DAY });
    runMandate(s, p, m);
    expect(a.status).toBe('accepted');
    expect(b.status).toBe('countered');
    expect(m.told.some((t) => t.includes('the counteroffer of') && t.includes('beyond the ceiling'))).toBe(true);
    expect(mandateCommitted(p, m)).toBeLessThanOrEqual(m.ceiling);
  });

  it('carries on after saving and loading, without sending anything twice', () => {
    const { s, p } = film('gm-save');
    const m = approveGuideMe(s, p, DEPT, guideMePlan(s, p, DEPT).total * 3);
    const back = deserialize(serialize(s));
    const q = back.projects[0];
    for (let i = 0; i < 20 && activeMandate(q, DEPT); i++) processUntil(back, back.now + DAY, 'tick', 400000);
    const mine = q.hires.filter((h) => h.guided === m.id).map((h) => `${h.roleId}:${h.personId}`);
    expect(new Set(mine).size).toBe(mine.length);
    expect(q.mandates![0].ended).toBe('done');
    expect(p).toBeTruthy();
  });
});

describe('Guide Me for casting', () => {
  it('offers each open part to the approved performer of its age, one person a part, and nobody else after a no', () => {
    const { s, p } = film('gm-cast');
    p.characters.push({ ...p.characters[0], id: 'kid', name: 'Young Mara', ageInStory: '9' }); // labelled fixture: a child's part
    p.drafts.at(-1)!.characters.push({ ...p.drafts.at(-1)!.characters[0], id: 'kid', name: 'Young Mara', ageInStory: '9' });
    p.drafts.at(-1)!.scenes[1].participants.push('kid');
    const plan = guideMePlan(s, p, CAST);
    expect(plan.picks.map((x) => x.part).sort()).toEqual(['Mara', 'Young Mara']);
    expect(new Set(plan.picks.map((x) => x.personId)).size).toBe(2);
    const kid = plan.picks.find((x) => x.part === 'Young Mara')!;
    expect(s.people[kid.personId]).toBeUndefined(); // reading the plan books nobody
    const m = approveGuideMe(s, p, CAST, plan.total);
    expect(m.picks!.map((x) => x.personId).sort()).toEqual(plan.picks.map((x) => x.personId).sort());
    const offered = p.hires.filter((h) => h.guided === m.id);
    expect(offered.map((h) => h.personId).sort()).toEqual(plan.picks.map((x) => x.personId).sort());
    // A no comes back to you; Guide Me doesn't choose anyone else for the part.
    const first = offered[0];
    withdrawOffer(s, p, first.id); // labelled fixture: as a decline, the offer is answered no
    runMandate(s, p, m);
    expect(p.hires.filter((h) => h.guided === m.id && h.characterId === first.characterId)).toHaveLength(1);
    expect(m.told.some((t) => t.endsWith('they declined. Choose someone on the Cast page.'))).toBe(true);
  });
});


// Guide Me for writing (the owner's v5 brief, 1: "commission/delegate development, drafts and revisions within an
// approved mandate, with actual work, time, costs, review and delivery"). From November 13, 2026.
describe('Guide Me for writing', () => {
  it('a film: hires a co-writer for a rewrite and a script editor for a polish, each pass worked, reviewed and accepted in turn', () => {
    const { s, p } = film('gm-write');
    const plan = guideMePlan(s, p, WRITING);
    expect(plan.picks.map((x) => [x.roleId, x.scope])).toEqual([['co-writer', 'rewrite'], ['script-editor', 'polish']]);
    expect(p.hires).toEqual([]); // reading the plan does nothing
    const m = approveGuideMe(s, p, WRITING, plan.total * 2);
    expect(p.hires.filter((h) => h.guided === m.id).map((h) => [h.roleId, h.status])).toEqual([['co-writer', 'offered'], ['script-editor', 'offered']]);
    // The work takes its days: the rewrite is commissioned once they accept, and the polish only once the rewrite is accepted.
    for (let i = 0; i < 60 && activeMandate(p, WRITING); i++) {
      days(s, 1);
      const rewrite = (p.writing ?? []).find((j) => j.scope === 'rewrite');
      const polish = (p.writing ?? []).find((j) => j.scope === 'polish');
      if (polish) expect(rewrite?.status).toBe('accepted');
    }
    expect(activeMandate(p, WRITING)).toBeUndefined();
    const jobs = p.writing ?? [];
    // Each pass was delivered, read, and accepted at the standard, or came back to the player.
    for (const j of jobs.filter((x) => x.status === 'accepted')) expect(j.passes.at(-1)!.read!).toBeGreaterThanOrEqual(WRITING_STANDARD);
    expect(jobs.filter((x) => x.status === 'accepted').length + p.mandates!.at(-1)!.told.length).toBeGreaterThanOrEqual(2);
    // Every day of it was paid, and never past the ceiling.
    expect(mandateCommitted(p, m)).toBeLessThanOrEqual(m.ceiling);
    for (const j of jobs) expect(j.passes.reduce((a, x) => a + x.done, 0)).toBeGreaterThan(0);
  });

  it('revises a pass that reads below the standard while the contract allows, then brings it to the player', () => {
    const { s, p } = film('gm-write-low');
    const m = approveGuideMe(s, p, WRITING, guideMePlan(s, p, WRITING).total * 3);
    // Labelled fixture: the co-writer is at the bottom of the craft scale, so their passes read low.
    for (let i = 0; i < 10 && !p.hires.some((h) => h.guided === m.id && h.status === 'accepted'); i++) days(s, 1);
    const writer = p.hires.find((h) => h.guided === m.id && h.roleId === 'co-writer')!;
    personById(s, writer.personId, 'co-writer').capability = 5; // the generated person, as the game reads them
    for (let i = 0; i < 80 && activeMandate(p, WRITING); i++) days(s, 1);
    const rewrite = (p.writing ?? []).find((j) => j.scope === 'rewrite')!;
    expect(rewrite.passes.length).toBe(3); // the pass and its two revisions
    expect(rewrite.passes.slice(1).every((x) => x.focus === 'Structure')).toBe(true);
    expect(rewrite.status).toBe('delivered'); // not accepted for the player
    expect(m.told.some((t) => /^Co-Writer: the pass reads \d+, below the 55 Guide Me accepts, and its revisions are used\./.test(t))).toBe(true);
    // The polish waited on that rewrite, so it comes back too, and the mandate finishes rather than waiting for ever.
    expect(m.told).toContain('Script Editor: the polish waits on the rewrite that came back to you. Commission it under Writing Work once you accept the rewrite.');
    expect([m.ended, (p.writing ?? []).some((j) => j.scope === 'polish')]).toEqual(['done', false]);
  });

  it('a series: an episode writer for each episode, each writing its own draft', () => {
    const s = startLife('gm-write-series');
    const p = buildProject(s, { title: 'Low Water', format: 'series', medium: 'live-action', episodes: 2, runtime: 20, scenario: 'low' }, [{ name: 'Ada', patch: { roleSize: 'lead' } }],
      [{ place: 'Pier', chars: ['Ada'], minutes: 10, extra: { episode: 1 } }, { place: 'Pier', chars: ['Ada'], minutes: 10, extra: { episode: 2 } }]);
    approve(s, p);
    agreedFunding(p, 400_000); // labelled fixture: the money is raised
    p.finance!.deals.at(-1)!.id = 'fd1';
    const plan = guideMePlan(s, p, WRITING);
    expect(plan.picks.map((x) => [x.roleId, x.scope, x.episodes])).toEqual([['episode-writer', 'draft', [1]], ['episode-writer', 'draft', [2]]]);
    expect(new Set(plan.picks.map((x) => x.personId)).size).toBe(2);
  });

  it('carries on after saving and loading, without commissioning anything twice', () => {
    const { s, p } = film('gm-write-save');
    approveGuideMe(s, p, WRITING, guideMePlan(s, p, WRITING).total * 2);
    days(s, 6);
    const s2 = deserialize(serialize(s));
    const p2 = s2.projects[0];
    const before = (p2.writing ?? []).length;
    days(s2, 1);
    expect((p2.writing ?? []).filter((j) => j.scope === 'rewrite').length).toBeLessThanOrEqual(1);
    expect((p2.writing ?? []).length).toBeGreaterThanOrEqual(before);
  });
});
