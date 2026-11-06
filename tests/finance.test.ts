import { describe, expect, it } from 'vitest';
import {
  BACKERS, DAY, FundsError, acceptDeal, approachBacker, approvalRights, backerOptions, computeCredits, createProject, dealTerms, deals, financeSummary,
  ledgerTotals, processUntil, receiveIncome, refuseDeal, reserve,
} from '../src/engine';
import { migrateV4toV5, onProjectDelivered } from '../src/engine/finance';
import { deserialize } from '../src/engine/save';
import { hashString } from '../src/engine/rng';
import type { GameState, Project } from '../src/engine/types';
import { approve, buildProject, startLife } from './helpers';

/** A project made the way the game makes it: no money until a backer's deal is accepted. */
function unfunded(s: GameState, scenarioId = 'low', title = 'Night Ferry'): Project {
  const p = createProject(s, { title, scenarioId, axes: { format: 'short', medium: 'live-action', targetRuntimeMin: 10 } });
  return p;
}
/** Give it an approvable script. */
function withScript(s: GameState, p: Project): Project {
  const q = buildProject(s, { title: 'tmp', format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ines', patch: { roleSize: 'lead' } }], [{ place: 'Dock', chars: ['Ines'], minutes: 3 }]);
  p.characters = q.characters;
  p.scenes = q.scenes;
  s.projects = s.projects.filter((x) => x.id !== q.id);
  approve(s, p);
  return p;
}
const wait = (s: GameState, days: number) => processUntil(s, s.now + days * DAY, 'tick', 100_000);

describe('a budget size is an estimate, not money', () => {
  it('a new project has an estimate and a target, but nothing to spend until a backer pays in', () => {
    const s = startLife('fin-none');
    const p = unfunded(s, 'low');
    expect(p.funding.fund).toBe(0);
    expect(financeSummary(p)).toMatchObject({ estimate: 400_000, target: 400_000, promised: 0, received: 0, stillToRaise: 400_000 });
    expect(ledgerTotals(p).available).toBe(0);
    expect(() => reserve(s, p, 'Camera', 'equipment', 1000)).toThrow(FundsError);
  });

  it('each backer says what it needs before it can be asked', () => {
    const s = startLife('fin-needs');
    const p = unfunded(s);
    const needs = Object.fromEntries(backerOptions(s, p).map((o) => [o.kind, o.needs]));
    expect(needs).toEqual({
      starting: 'Approve a script first.', grant: 'Approve a script first.', investor: 'Approve a script first.',
      'co-producer': 'Get some funding promised first; they only match other backers.', commissioner: 'Deliver a project first.',
    });
    expect(() => approachBacker(s, p, 'grant')).toThrow('Approve a script first.');
  });
});

describe('the starting backing: the agreed starting scenario', () => {
  it('backs a first project once its script is approved, up to the low-budget size, repaid from income first', () => {
    const s = startLife('fin-start');
    const p = withScript(s, unfunded(s, 'mid'));
    const d = approachBacker(s, p, 'starting');
    expect(d.status).toBe('offered'); // agreed when the story began: no waiting, no refusal
    expect(d.amount).toBe(400_000); // capped at the low-budget size, though the target is 4,000,000
    expect(BACKERS.starting.why).toMatch(/Agreed when your story began/);
    expect(dealTerms(d)).toEqual(['$400,000 when you sign.', "They are repaid $400,000 from the project's income before the project keeps any.", 'They are credited: "With Thanks To Starting Backing".']);
    expect(p.funding.fund).toBe(0); // nothing until accepted
    acceptDeal(s, p, d.id);
    expect(p.funding.fund).toBe(400_000);
    expect(financeSummary(p)).toMatchObject({ promised: 400_000, received: 400_000, stillToRaise: 3_600_000 });
    // Only once per career.
    const second = withScript(s, unfunded(s, 'micro', 'Second Film'));
    expect(backerOptions(s, second).some((o) => o.kind === 'starting')).toBe(false);
  });
});

describe('backers decide, and some say no', () => {
  it('a grant and an investor answer after some days, each with an offer and terms or a reason, the same for the same world', () => {
    const outcomes: string[] = [];
    for (const tag of ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8']) {
      const s = startLife(`fin-grant-${tag}`);
      const p = withScript(s, unfunded(s, 'micro'));
      const d = approachBacker(s, p, 'grant');
      expect(d.status).toBe('considering');
      wait(s, BACKERS.grant.decideDays - 1);
      expect(d.status).toBe('considering');
      wait(s, 2);
      expect(['offered', 'declined']).toContain(d.status);
      expect(d.reason.length).toBeGreaterThan(10);
      if (d.status === 'offered') {
        expect(d.amount).toBe(40_000); // the micro target
        expect(dealTerms(d).join(' ')).toMatch(/Deliver by \d{4}-\d{2}-\d{2}, or the grant must be repaid/);
      } else expect(d.reason).toMatch(/chose other projects/);
      outcomes.push(d.status);
      // The same world gives the same answer.
      const again = startLife(`fin-grant-${tag}`);
      const q = withScript(again, unfunded(again, 'micro'));
      const e = approachBacker(again, q, 'grant');
      wait(again, BACKERS.grant.decideDays + 1);
      expect(e.status).toBe(d.status);
    }
    expect(outcomes).toContain('offered');
    expect(outcomes).toContain('declined');
  }, 60_000);

  it('a first-time investor offers at most a modest stake, repaid with a premium and then a share; turning it down is final', () => {
    const s = startLife('fin-inv');
    let offered: { p: Project; id: string } | null = null;
    for (let i = 0; i < 8 && !offered; i++) {
      const p = withScript(s, unfunded(s, 'low', `Try ${i}`));
      const d = approachBacker(s, p, 'investor');
      wait(s, BACKERS.investor.decideDays + 1);
      if (d.status === 'offered') offered = { p, id: d.id };
      else expect(d.reason).toBe('They want to see a finished project from you first.');
    }
    expect(offered).not.toBeNull();
    const { p, id } = offered!;
    const d = deals(p).find((x) => x.id === id)!;
    expect(d.amount).toBe(150_000);
    expect(dealTerms(d)).toContain("They are repaid $180,000 from the project's income before the project keeps any.");
    expect(dealTerms(d)).toContain("After that, they take 30% of the project's income.");
    refuseDeal(s, p, id);
    expect(() => acceptDeal(s, p, id)).toThrow('That offer is no longer open.');
    expect(backerOptions(s, p).find((o) => o.kind === 'investor')!.needs).toBe('Already approached for this project.');
    expect(p.funding.fund).toBe(0);
  }, 60_000);
});

describe('terms are enforced after acceptance', () => {
  it('income repays backers first, then pays their share, and the project keeps the rest', () => {
    const s = startLife('fin-income');
    const p = withScript(s, unfunded(s, 'low'));
    const d = approachBacker(s, p, 'starting');
    acceptDeal(s, p, d.id);
    expect(receiveIncome(s, p, 300_000, 'A Distributor')).toBe(0); // all of it repays the backing
    expect(d.repaid).toBe(300_000);
    expect(receiveIncome(s, p, 250_000, 'A Distributor')).toBe(150_000); // 100,000 left to repay, then no share
    expect(d.repaid).toBe(400_000);
    expect(s.log.some((l) => /repaid to the starting backing/.test(l.text))).toBe(true);
  });

  it('a co-producer only joins a backed project, holds casting approval and is credited; another world says no', () => {
    // World tags chosen so one says yes and one says no (the answer is drawn from the seed, as in play).
    const run = (tag: string) => {
      const s = startLife(tag);
      const p = withScript(s, unfunded(s, 'mid')); // the starting backing covers 400,000 of a 4,000,000 target
      acceptDeal(s, p, approachBacker(s, p, 'starting').id);
      expect(approvalRights(p)).toEqual([]);
      const d = approachBacker(s, p, 'co-producer');
      wait(s, BACKERS['co-producer'].decideDays + 1);
      return { s, p, d };
    };
    const no = run('fin-cop');
    expect(no.d).toMatchObject({ status: 'declined', reason: 'Their slate is full this year.' });
    expect(approvalRights(no.p)).toEqual([]);
    const { s, p, d } = run('fin-cop-2');
    expect(d.status).toBe('offered');
    expect(d.amount).toBe(200_000); // half of the 400,000 already promised
    acceptDeal(s, p, d.id);
    expect(approvalRights(p)).toEqual(['Casting Approval']);
    expect(computeCredits(s, p).some((c) => c.contribution === 'Co-Production Partner' && c.personName === 'Co-Production Partner')).toBe(true);
  }, 60_000);

  it('a commissioner pays most on signing and the rest on delivery, and holds casting and picture approval', () => {
    for (const tag of ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']) {
      const s = startLife(`fin-comm-${tag}`);
      const first = buildProject(s, { title: 'Earlier Work', format: 'short', medium: 'live-action', runtime: 5 }, [], []);
      first.delivered = { at: s.now, runtimeMin: 5 }; // labelled fixture: a project already delivered
      const p = withScript(s, unfunded(s, 'mid'));
      const d = approachBacker(s, p, 'commissioner');
      wait(s, BACKERS.commissioner.decideDays + 1);
      if (d.status !== 'offered') continue;
      expect(dealTerms(d)).toContain('$3,200,000 when you sign, and $800,000 when you deliver the project.');
      acceptDeal(s, p, d.id);
      expect(p.funding.fund).toBe(3_200_000);
      expect(approvalRights(p)).toEqual(['Casting Approval', 'Picture Approval']);
      onProjectDelivered(s, p);
      expect(p.funding.fund).toBe(4_000_000);
      expect(d.received).toBe(4_000_000);
      onProjectDelivered(s, p); // paid once
      expect(p.funding.fund).toBe(4_000_000);
      return;
    }
    throw new Error('No commission in eight worlds');
  }, 60_000);

  it('a grant not delivered by its deadline becomes a repayment owed by the project', () => {
    for (const tag of ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9']) {
      const s = startLife(`fin-deadline-${tag}`);
      const p = withScript(s, unfunded(s, 'micro'));
      const d = approachBacker(s, p, 'grant');
      wait(s, BACKERS.grant.decideDays + 1);
      if (d.status !== 'offered') continue;
      acceptDeal(s, p, d.id);
      expect(p.funding.fund).toBe(40_000);
      processUntil(s, d.terms.deliverBy! + DAY, 'tick', 1_000_000);
      expect(d.status).toBe('breached');
      const repay = p.obligations.find((o) => o.ref === `finance:${d.id}`)!;
      expect(repay).toMatchObject({ category: 'finance', amount: 40_000, state: 'committed' });
      expect(ledgerTotals(p).available).toBeLessThanOrEqual(0);
      return;
    }
    throw new Error('No grant offer in nine worlds');
  }, 120_000);
});

describe('saves from before financing', () => {
  it('keep their money, recorded as funding agreed before financing existed, with the old approval rights', () => {
    const s = startLife('fin-mig');
    const raw = JSON.parse(JSON.stringify(s));
    raw.version = 4;
    raw.projects = [{ ...JSON.parse(JSON.stringify(unfunded(s, 'mid'))), funding: { scenarioId: 'mid', fund: 4_000_000, extra: [] } }];
    delete raw.projects[0].finance;
    raw.projects[0].phase = 'development';
    const once = migrateV4toV5(raw);
    expect(migrateV4toV5(once)).toEqual(once); // idempotent
    const data = JSON.stringify(raw);
    const back = deserialize(JSON.stringify({ format: 'slate-save', version: 4, checksum: hashString(data), data }));
    const p = back.projects[0];
    expect(p.funding.fund).toBe(4_000_000);
    expect(financeSummary(p)).toMatchObject({ estimate: 4_000_000, target: 4_000_000, promised: 4_000_000, received: 4_000_000, stillToRaise: 0 });
    expect(deals(p)[0]).toMatchObject({ kind: 'agreed', status: 'accepted', backer: 'Funding agreed before financing was added' });
    expect(approvalRights(p)).toEqual(['Casting Approval']);
  });
});
