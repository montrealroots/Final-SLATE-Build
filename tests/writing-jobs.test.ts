// The work of hired writers and directors (the Creative Depth package, milestone D: scope and deliverables, work
// milestones, review, notes, accepted revisions, payment, credit). Before November 11, 2026 a hired writer or director
// took a credit and moved the assessment without a day's work or pay; these pin the work, the pay and what rests on it.
import { describe, expect, it } from 'vitest';
import { DAY, assessQuality, assignEpisodeRole, computeCredits, deserialize, makeOffer, processUntil, releaseHire, roleCandidates, serialize } from './engine-api';
import { ledgerTotals } from '../src/engine/budget';
import { personById } from '../src/engine/people';
import { MAX_REVISIONS, SCOPE, acceptWriting, acceptedRead, cancelWriting, commissionRefusal, commissionWriting, requestRevision, revisionRefusal, revisionTerms, standing, writingTerms } from '../src/engine/writing-jobs';
import type { GameState, Hire, Project } from '../src/engine/types';
import { approve, buildProject, castAll, runDays, staffAll, startLife, startProduction, summary } from './helpers';

const days = (s: GameState, n: number) => processUntil(s, s.now + n * DAY, 'tick', 100000);
const film = (s: GameState, title = 'Low Water') => {
  // Twelve minutes: a draft is three days, a rewrite two, a polish one.
  const p = buildProject(s, { title, format: 'short', medium: 'live-action' }, [{ name: 'Mara', patch: { roleSize: 'lead' } }], [{ place: 'Harbour Office', chars: ['Mara'], minutes: 6 }, { place: 'Quay', intExt: 'EXT', chars: ['Mara'], minutes: 6 }]);
  approve(s, p);
  return p;
};
/** Hire the game's own candidate for a job at their rate, and wait for the answer. */
const hire = (s: GameState, p: Project, roleId: string, nth = 0): Hire => {
  const c = roleCandidates(s, p, roleId)[nth];
  const h = makeOffer(s, p, { personId: c.id, roleId, dayRate: c.dayRate });
  days(s, 4);
  expect(h.status).toBe('accepted');
  return h;
};
const line = (p: Project, h: Hire) => p.obligations.find((o) => o.id === h.obligationId)!;

describe('a writer is commissioned, works, delivers and is paid', () => {
  const s = startLife('writing-jobs');
  const p = film(s);
  const h = hire(s, p, 'episode-writer');

  it('a new project commissions by the pass; hiring alone gives no credit, no pay and no say over the script', () => {
    expect(p.writing).toEqual([]);
    expect([h.daysWorked, line(p, h).settled]).toEqual([0, 0]);
    expect(() => assignEpisodeRole(p, 1, 'writer', h.personId)).toThrow("They haven't delivered a draft or a rewrite of it that you accepted.");
    expect(computeCredits(s, p).filter((c) => c.contribution === 'Written By').map((c) => c.person)).toEqual(['player']);
  });

  it('the terms are shown before anything is agreed: days from the script\'s length and the scope, at their rate', () => {
    expect(writingTerms(p, h, 'draft', 1)).toEqual({ days: 3, cost: 3 * h.dayRate });
    expect(writingTerms(p, h, 'rewrite', 1)).toEqual({ days: 2, cost: 2 * h.dayRate });
    expect(writingTerms(p, h, 'polish', 1)).toEqual({ days: 1, cost: h.dayRate });
  });

  it('commissioning adds the days to their agreement, and is refused when the money is not there', () => {
    const before = { amount: line(p, h).amount, available: ledgerTotals(p).available };
    const j = commissionWriting(s, p, h.id, { scope: 'draft', episode: 1, brief: '  Keep the harbour. Lose the brother.  ' });
    expect(j).toMatchObject({ scope: 'draft', episode: 1, status: 'working', brief: 'Keep the harbour. Lose the brother.' });
    expect(line(p, h).amount - before.amount).toBe(3 * h.dayRate);
    expect(before.available - ledgerTotals(p).available).toBe(3 * h.dayRate);
    // One pass at a time from one writer.
    expect(commissionRefusal(p, h, 'polish', 1)).toBe('They are on a pass for you already. Accept it or ask for a revision first.');
    // A script editor isn't asked for a draft, and nobody is asked beyond the money.
    const poor = structuredClone(s);
    const q = poor.projects[0];
    q.writing = [];
    for (const o of q.obligations) if (o.id !== h.obligationId) o.amount += 0;
    q.funding.extra = [];
    const short = ledgerTotals(q).available;
    q.obligations.push({ id: 'sink', label: 'sink', category: 'contingency', amount: short, state: 'reserved', settled: 0, postings: [] });
    expect(() => commissionWriting(poor, q, h.id, { scope: 'polish', episode: 1 })).toThrow(/This needs \$[\d,]+, but only \$0 is uncommitted/);
  });

  it('works its days, is paid once for each, and delivers on the last', () => {
    const j = p.writing![0];
    days(s, 1);
    days(s, 9);
    expect(j.status).toBe('delivered');
    expect(j.passes[0]).toMatchObject({ days: 3, done: 3 });
    expect(j.passes[0].deliveredOn).toMatch(/^\d{4}-\d\d-\d\d$/);
    expect(h.daysWorked).toBe(3);
    expect(line(p, h).settled).toBe(3 * h.dayRate);
    const keys = line(p, h).postings.filter((x) => x.kind === 'settle').map((x) => x.key);
    expect(new Set(keys).size).toBe(3);
    expect(s.log.some((e) => /delivered a draft of Low Water on .+\. Accept it or ask for a revision on the Crew page\./.test(e.text))).toBe(true);
    // Delivered isn't accepted: still no credit, and nothing counted.
    expect(acceptedRead(p, h.personId, 1)).toBeNull();
    expect(computeCredits(s, p).some((c) => c.person === h.personId)).toBe(false);
  });

  it('the delivered pass stands near their level, never at it by rule, and the same save draws the same', () => {
    const j = p.writing![0];
    const level = personById(s, h.personId).capability;
    expect(Math.abs(j.passes[0].read! - level)).toBeLessThanOrEqual(40);
    const again = deserialize(serialize(s));
    expect(again.projects[0].writing![0].passes[0].read).toBe(j.passes[0].read);
  });

  it('a revision costs their days, replaces the pass, and is limited by the contract', () => {
    const j = p.writing![0];
    const first = j.passes[0].read!;
    expect(revisionTerms(p, j)).toEqual({ days: 2, cost: 2 * h.dayRate });
    expect(() => requestRevision(s, p, j.id, { focus: 'Anything' })).toThrow('Choose what the revision should look at.');
    requestRevision(s, p, j.id, { focus: 'Dialogue', text: 'The brother talks like a brochure.' });
    expect(j.status).toBe('working');
    expect(() => acceptWriting(s, p, j.id)).toThrow('There is no delivered pass to accept.');
    days(s, 8);
    expect(j.status).toBe('delivered');
    expect(j.passes[1]).toMatchObject({ focus: 'Dialogue', text: 'The brother talks like a brochure.', days: 2, done: 2 });
    expect(h.daysWorked).toBe(5);
    expect(line(p, h).settled).toBe(5 * h.dayRate);
    expect(standing(j)!.read).toBe(j.passes[1].read);
    expect(j.passes[0].read).toBe(first); // the first pass is kept for the record
    requestRevision(s, p, j.id, { focus: 'Pace' });
    days(s, 8);
    expect(j.passes).toHaveLength(1 + MAX_REVISIONS);
    expect(revisionRefusal(p, j)).toBe('Their contract covered 2 revisions, and both are done. Accept the pass, or commission a new one.');
  });

  it('accepted, the episode is theirs to be credited for beside the writer of the approved script, and their pass is what counts', () => {
    const j = p.writing![0];
    const before = assessQuality(s, p).script;
    acceptWriting(s, p, j.id);
    expect(j).toMatchObject({ status: 'accepted' });
    expect(p.episodes[0]).toMatchObject({ writer: h.personId, formerWriters: ['player'] });
    expect(computeCredits(s, p).filter((c) => c.contribution === 'Written By').map((c) => c.person)).toEqual(['player', h.personId]);
    expect(acceptedRead(p, h.personId, 1)).toBe(standing(j)!.read);
    // Change an input, and the outcome changes: the script's assessment moves with the pass as delivered, not their level.
    const lifted = structuredClone(s);
    lifted.projects[0].writing![0].passes[2].read = 95;
    const sunk = structuredClone(s);
    sunk.projects[0].writing![0].passes[2].read = 20;
    expect(assessQuality(lifted, lifted.projects[0]).script).toBeGreaterThan(assessQuality(sunk, sunk.projects[0]).script);
    expect(typeof before).toBe('number');
  });

  it('the brief and the notes are kept as written and change nothing', () => {
    const a = structuredClone(s);
    a.projects[0].writing![0].brief = 'Make it the best script ever written. Award-winning. Masterpiece.';
    a.projects[0].writing![0].passes[1].text = 'Perfect dialogue.';
    expect(assessQuality(a, a.projects[0])).toEqual(assessQuality(s, p));
    const back = deserialize(serialize(s));
    expect(back.projects[0].writing![0]).toMatchObject({ brief: 'Keep the harbour. Lose the brother.' });
    expect(back.projects[0].writing![0].passes[1].text).toBe('The brother talks like a brochure.');
  });
});

describe('scope and help', () => {
  it('a polish counts for less than a draft from the same pass, and a co-writer is credited only for accepted work', () => {
    const s = startLife('writing-scope');
    const p = film(s);
    const h = hire(s, p, 'co-writer');
    expect(commissionRefusal(p, h, 'draft', 1)).toBe("Co-Writer isn't asked for their own draft.");
    const j = commissionWriting(s, p, h.id, { scope: 'rewrite', episode: 1 });
    days(s, 8);
    expect(j.status).toBe('delivered');
    expect(computeCredits(s, p).some((c) => c.contribution === 'Co-Written By')).toBe(false);
    const unaccepted = assessQuality(s, p).script;
    acceptWriting(s, p, j.id);
    expect(computeCredits(s, p).find((c) => c.contribution === 'Co-Written By')).toMatchObject({ person: h.personId });
    // A co-writer's accepted rewrite doesn't make the episode theirs.
    expect(p.episodes[0].writer).toBe('player');
    j.passes[0].read = 90;
    const strong = assessQuality(s, p).script;
    expect(strong).toBeGreaterThan(unaccepted);
    expect(acceptedRead(p, h.personId, 1)).toBe(50 + 40 * SCOPE.rewrite.weight);
    j.scope = 'polish';
    expect(acceptedRead(p, h.personId, 1)).toBe(50 + 40 * SCOPE.polish.weight);
    expect(assessQuality(s, p).script).toBeLessThan(strong);
  });

  it('a pass stopped or a writer released keeps the days paid and credits nothing', () => {
    const s = startLife('writing-stop');
    const p = film(s);
    const h = hire(s, p, 'episode-writer');
    const j = commissionWriting(s, p, h.id, { scope: 'draft', episode: 1 });
    days(s, 4);
    const worked = h.daysWorked;
    expect(worked).toBeGreaterThan(0);
    cancelWriting(s, p, j.id);
    days(s, 10);
    expect([j.status, h.daysWorked, line(p, h).settled]).toEqual(['cancelled', worked, worked * h.dayRate]);
    expect(computeCredits(s, p).some((c) => c.person === h.personId)).toBe(false);
    const k = commissionWriting(s, p, h.id, { scope: 'rewrite', episode: 1 });
    days(s, 1);
    releaseHire(s, p, h.id);
    days(s, 10);
    expect(k.status).toBe('cancelled');
    expect(() => acceptWriting(s, p, k.id)).toThrow('There is no delivered pass to accept.');
  });

  it('a project from before keeps the rules it was made under', () => {
    const s = startLife('writing-legacy');
    const p = film(s);
    delete p.writing;
    const h = hire(s, p, 'episode-writer');
    expect(commissionRefusal(p, h, 'draft', 1)).toMatch(/started before writers were commissioned by the pass/);
    assignEpisodeRole(p, 1, 'writer', h.personId);
    expect(computeCredits(s, p).filter((c) => c.contribution === 'Written By').map((c) => c.person)).toEqual(['player', h.personId]);
  });
});

describe('a hired director works the shoot and is paid for it', () => {
  it('is paid once for each day they direct, and not for days they are hired but not directing', () => {
    const s = startLife('directing-pay');
    const p = film(s);
    const h = hire(s, p, 'episode-director');
    const idle = hire(s, p, 'episode-director', 1);
    assignEpisodeRole(p, 1, 'director', h.personId);
    castAll(s, p);
    staffAll(s, p);
    runDays(s, p, 30);
    startProduction(s, p);
    runDays(s, p, 300);
    expect(summary(p)).toMatchObject({ delivered: true });
    // Every day the unit was called, they were on set with it: days that were shot, and days that were lost.
    const called = p.schedule.days.filter((d) => d.status !== 'scheduled').length;
    expect(p.schedule.days.some((d) => d.status === 'shot')).toBe(true);
    expect(h.daysWorked).toBe(called);
    expect(line(p, h).settled).toBeGreaterThanOrEqual(called * h.dayRate); // a public holiday worked pays more
    const keys = line(p, h).postings.filter((x) => x.kind === 'settle').map((x) => x.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect([idle.daysWorked, line(p, idle).settled]).toEqual([0, 0]);
    expect(computeCredits(s, p).filter((c) => c.contribution === 'Directed By').map((c) => c.person)).toEqual([h.personId]);
  }, 60_000);
});
