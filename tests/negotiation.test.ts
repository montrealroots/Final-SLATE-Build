// Stage 5 of the gameplay-depth package: asking a backer for better terms, and offers that lapse (SLATE-08-03.02, .03).
import { describe, expect, it } from 'vitest';
import {
  COUNTER_DAYS, DAY, OFFER_OPEN_DAYS, acceptDeal, backerOptions, betterTerms, leverage, processUntil,
} from '../src/engine';
import { deserialize, serialize } from '../src/engine/save';
import { openOffer } from '../src/engine/negotiation';
import { askForBetterTerms, askRefusal } from '../src/engine/negotiation-actions';
import { stream } from '../src/engine/rng';
import type { FinanceDeal, GameState, Project } from '../src/engine/types';
import { approve, buildProject, startLife, writePitch } from './helpers';

function backed(tag: string): { s: GameState; p: Project } {
  const s = startLife(tag);
  const p = buildProject(s, { title: 'Night Ferry', format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ines', patch: { roleSize: 'lead' } }], [{ place: 'Dock', chars: ['Ines'], minutes: 3 }]);
  writePitch(p);
  approve(s, p);
  return { s, p };
}
/** An investor's offer as decide() makes one: labelled fixture, so the test doesn't depend on whether they say yes. */
function investorOffer(s: GameState, p: Project, id = 'fd-inv'): FinanceDeal {
  const d: FinanceDeal = { id, kind: 'investor', backer: 'Private Investor', amount: 100_000, status: 'offered', askedAt: s.now, reason: '', received: 0, repaid: 0,
    terms: { recoup: 120_000, incomeShare: 0.3, approvalRights: [], credit: 'Executive Producer', onDelivery: 0, deliverBy: null } };
  (p.finance ??= { estimate: 1, target: 400_000, deals: [] }).deals.push(d);
  openOffer(s, p, d);
  return d;
}
const wait = (s: GameState, days: number) => processUntil(s, s.now + days * DAY, 'tick', 100_000);

describe('what can be asked for', () => {
  it('each backer offers the terms it has; a grant and the starting backing have none to negotiate', () => {
    const { s, p } = backed('neg-terms');
    const inv = investorOffer(s, p);
    expect(betterTerms(inv).map((x) => [x.term, x.change])).toEqual([
      ['share', '30% of income becomes 20%.'],
      ['recoup', 'They are repaid $100,000, what they put in, instead of $120,000.'],
    ]);
    const commissioner = { ...inv, kind: 'commissioner' as const, terms: { ...inv.terms, recoup: 0, incomeShare: 0.85, onDelivery: 20_000, approvalRights: ['Casting Approval', 'Picture Approval'] } };
    expect(betterTerms(commissioner).map((x) => x.term)).toEqual(['share', 'signing', 'approval']);
    const grant = { ...inv, kind: 'grant' as const };
    expect(betterTerms(grant)).toEqual([]);
    expect(askRefusal(s, grant)).toBe("A grant's terms are the fund's rules; they aren't negotiated.");
  });
});

describe('asking for better terms', () => {
  it('holds the offer while they consider; then they agree, keep their terms or take it back, by your leverage', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const { s, p } = backed(`neg-ask-${i}`);
      const d = investorOffer(s, p);
      askForBetterTerms(s, p, d.id, 'recoup');
      expect(() => acceptDeal(s, p, d.id)).toThrow('They are considering the better terms you asked for.');
      expect(askRefusal(s, d)).toBe('They are considering what you asked.');
      const lev = leverage(s, p, d);
      const roll = stream(s.seed, 'finance-counter', p.id, d.id)();
      wait(s, COUNTER_DAYS + 1);
      const outcome = d.counter!.outcome!;
      seen.add(outcome);
      // The rule, not just the sentence: below the leverage they agree; far above it they withdraw; between, they hold.
      expect(outcome).toBe(roll < lev ? 'agreed' : roll > lev + 0.5 ? 'withdrawn' : 'held');
      if (outcome === 'agreed') expect(d.terms.recoup).toBe(100_000);
      if (outcome === 'held') expect(d.terms.recoup).toBe(120_000);
      if (outcome === 'withdrawn') { expect(d.status).toBe('withdrawn'); expect(() => acceptDeal(s, p, d.id)).toThrow('That offer is no longer open.'); }
      else { expect(askRefusal(s, d)).toBe('You have asked them once already.'); const before = p.funding.fund; acceptDeal(s, p, d.id); expect(p.funding.fund - before).toBe(100_000); }
    }
    expect([...seen].sort()).toEqual(['agreed', 'held', 'withdrawn']);
  });

  it('leverage rises with another offer open and with delivered work, and falls with open notes on the script', () => {
    const { s, p } = backed('neg-leverage');
    const d = investorOffer(s, p);
    const alone = leverage(s, p, d);
    investorOffer(s, p, 'fd-other').kind = 'co-producer';
    expect(leverage(s, p, d)).toBeCloseTo(alone + 0.2, 5);
    s.projects.push({ ...JSON.parse(JSON.stringify(p)), id: 'done-1', delivered: { at: 0, runtimeMin: 10 } }); // labelled fixture: delivered work
    expect(leverage(s, p, d)).toBeCloseTo(alone + 0.3, 5);
  });

  it("can't be asked when the answer would come after the offer lapses", () => {
    const { s, p } = backed('neg-late');
    const d = investorOffer(s, p);
    wait(s, OFFER_OPEN_DAYS - COUNTER_DAYS + 1);
    expect(askRefusal(s, d)).toBe(`There isn't time: they take ${COUNTER_DAYS} days to answer, and the offer lapses first.`);
    expect(() => askForBetterTerms(s, p, d.id, 'share')).toThrow("There isn't time");
  });
});

describe('an offer lapses unanswered', () => {
  it("after its open days it can't be accepted, and the backer isn't asked again for this project", () => {
    const { s, p } = backed('neg-lapse');
    p.finance = { estimate: 1, target: 400_000, deals: [] };
    const d = investorOffer(s, p);
    wait(s, OFFER_OPEN_DAYS - 1);
    expect(d.status).toBe('offered');
    wait(s, 2);
    expect(d.status).toBe('lapsed');
    expect(() => acceptDeal(s, p, d.id)).toThrow('That offer is no longer open.');
    expect(backerOptions(s, p).find((o) => o.kind === 'investor')!.needs).toBe('Already approached for this project.');
  });

  it('an offer from before lapsing existed stays open; a pending ask and the lapse date survive a save', () => {
    const { s, p } = backed('neg-save');
    const old = investorOffer(s, p, 'fd-old');
    delete old.expiresAt; // labelled fixture: an offer made before November 8, 2026
    wait(s, OFFER_OPEN_DAYS + 2);
    expect(old.status).toBe('offered');
    const d = investorOffer(s, p, 'fd-new');
    askForBetterTerms(s, p, d.id, 'share');
    const back = deserialize(serialize(s));
    const q = back.projects.find((x) => x.id === p.id)!.finance!.deals.find((x) => x.id === 'fd-new')!;
    expect(q.expiresAt).toBe(d.expiresAt);
    expect(q.counter).toEqual(d.counter);
    expect(back.events.some((e) => e.kind === 'finance-counter' && e.payload.dealId === 'fd-new')).toBe(true);
  });
});

