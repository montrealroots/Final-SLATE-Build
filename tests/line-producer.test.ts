// The line producer's mandate (the v3 package, 02; requirement V3-L02): one negotiation of one counteroffer, paid for,
// with what it brought back recorded, and the answer to the counteroffer still the player's.
import { describe, expect, it } from 'vitest';
import { acceptCounter, declineCounter, makeOffer, personById, releaseHire, roleCandidates } from '../src/engine';
import { ledgerTotals, obligation } from '../src/engine/budget';
import { computeCredits } from '../src/engine/finish';
import { neededRoles } from '../src/engine/hiring';
import { gapClosed, lineProducer, movesChance, negotiate, negotiationFee, negotiationLine, negotiationPreview, negotiationRefusal, producerAccount, producerAccountLine } from '../src/engine/line-producer';
import { deserialize, serialize } from '../src/engine/save';
import type { GameState, Hire, Project } from '../src/engine/types';
import { approve, buildProject, startLife } from './helpers';

function film(tag: string): { s: GameState; p: Project } {
  const s = startLife(tag);
  const p = buildProject(s, { title: 'Night Ferry', format: 'short', medium: 'live-action', runtime: 10 },
    [{ name: 'Ines', patch: { roleSize: 'lead' } }], [{ place: 'Dock', chars: ['Ines'], minutes: 3 }]);
  approve(s, p);
  return { s, p };
}
/** A line producer on the production. The offer is the game's own; its answer is set here (a labelled fixture: hired). */
function hire(s: GameState, p: Project, pick = 0): Hire {
  const c = roleCandidates(s, p, 'line-producer')[pick];
  const h = makeOffer(s, p, { personId: c.id, roleId: 'line-producer', dayRate: c.dayRate });
  h.status = 'accepted';
  return h;
}
/** Someone who has answered an offer with a counteroffer: offered four fifths of their rate, and asking all of it (a labelled fixture: the answer is set here, as resolveOffer sets it). */
function countered(s: GameState, p: Project, roleId = 'dop', pick = 0): Hire {
  const c = roleCandidates(s, p, roleId)[pick];
  const h = makeOffer(s, p, { personId: c.id, roleId, dayRate: Math.round(c.dayRate * 0.8) });
  h.status = 'countered'; h.counterRate = c.dayRate; h.counterUntil = s.now + 7 * 86_400_000;
  return h;
}
/** The first seed tag, of a few, whose negotiation comes out the way asked: the draw is the game's own, read not set. */
function filmWhere(moves: boolean): { s: GameState; p: Project; lp: Hire; h: Hire; text: string } {
  for (let i = 0; i < 40; i++) {
    const { s, p } = film(`lp-${moves ? 'moves' : 'holds'}-${i}`);
    const lp = hire(s, p);
    const h = countered(s, p);
    const from = h.counterRate!;
    const text = negotiate(s, p, h.id);
    if ((h.counterRate! < from) === moves) return { s, p, lp, h, text };
  }
  throw new Error('no seed found');
}

describe("a line producer's negotiation", () => {
  it('is an optional job on any production, and is refused with no line producer, with no counteroffer, and a second time, each with its reason', () => {
    const { s, p } = film('lp-refusals');
    expect(neededRoles(p, s).find((r) => r.roleId === 'line-producer')).toMatchObject({ required: false, dept: 'Producing' });
    const h = countered(s, p);
    expect(negotiationRefusal(p, h.id)).toBe('Hire a line producer first (Crew, Producing).');
    expect(negotiationPreview(s, p, h.id)).toBeNull();
    hire(s, p);
    expect(negotiationRefusal(p, 'nobody')).toBe('There is no counteroffer to negotiate.');
    expect(negotiationRefusal(p, lineProducer(p)!.id)).toBe('There is no counteroffer to negotiate.');
    expect(negotiationRefusal(p, h.id)).toBeNull();
    negotiate(s, p, h.id);
    expect(negotiationRefusal(p, h.id)).toBe(`${personById(s, lineProducer(p)!.personId).name} has already negotiated this counteroffer. It is yours to accept or decline.`);
    expect(() => negotiate(s, p, h.id)).toThrow('has already negotiated this counteroffer');
  });

  it('says first who negotiates, what it costs and how much is in question; then costs exactly that on their own line', () => {
    const { s, p } = film('lp-cost');
    const lp = hire(s, p);
    const h = countered(s, p);
    const pre = negotiationPreview(s, p, h.id)!;
    expect(pre).toEqual({ by: personById(s, lp.personId).name, fee: lp.dayRate, asks: h.counterRate, offered: h.dayRate, days: h.estDays, inQuestion: (h.counterRate! - h.dayRate) * h.estDays });
    // Their agreement reserved one day when they were hired, so the first negotiation moves no uncommitted money.
    const line = obligation(p, lp.obligationId!);
    expect(line).toMatchObject({ amount: negotiationFee(lp), settled: 0 });
    const before = ledgerTotals(p).available;
    negotiate(s, p, h.id);
    expect(line.settled).toBe(negotiationFee(lp));
    expect(ledgerTotals(p).available).toBe(before);
    expect(lp.daysWorked).toBe(1);
    // A second one, with someone else, adds a day to their line.
    const h2 = countered(s, p, 'sound-mixer');
    const before2 = ledgerTotals(p).available;
    negotiate(s, p, h2.id);
    expect(ledgerTotals(p).available).toBe(before2 - negotiationFee(lp));
    expect(line).toMatchObject({ amount: 2 * negotiationFee(lp), settled: 2 * negotiationFee(lp) });
    expect(lp.daysWorked).toBe(2);
    // It is in the save.
    expect(deserialize(serialize(s)).projects[0].hires.find((x) => x.id === h.id)!.negotiated).toEqual(h.negotiated);
  });

  it('brings the rate down part of the way when they move, by the share the line producer\'s experience closes, and never below the offer', () => {
    const { s, p, lp, h, text } = filmWhere(true);
    const who = personById(s, lp.personId);
    const n = h.negotiated!;
    expect(n).toMatchObject({ by: lp.personId, byName: who.name, fee: lp.dayRate });
    expect(n.from - n.to).toBe(Math.max(5, Math.round(((n.from - h.dayRate) * gapClosed(who.experience)) / 5) * 5));
    expect(n.to).toBeGreaterThanOrEqual(h.dayRate);
    expect(h.counterRate).toBe(n.to);
    // Still a counteroffer: nobody is hired until the player says so.
    expect(h.status).toBe('countered');
    expect(text).toBe(`${who.name} negotiated with ${personById(s, h.personId).name} over the director of photography job: $${n.to.toLocaleString('en-US')} a day instead of $${n.from.toLocaleString('en-US')}, which is $${((n.from - n.to) * h.estDays).toLocaleString('en-US')} less over about ${h.estDays} ${h.estDays === 1 ? 'day' : 'days'}. Accepting it is yours.`);
    expect(negotiationLine(h, () => 'that day')).toBe(`${who.name} negotiated this on that day for $${lp.dayRate.toLocaleString('en-US')}: down from $${n.from.toLocaleString('en-US')} to $${n.to.toLocaleString('en-US')} a day.`);
    // Nothing is saved until it is accepted; accepted, the saving is the difference over their days.
    expect(producerAccount(p, lp)).toEqual({ negotiated: 1, cameDown: 1, cost: lp.dayRate, saved: 0 });
    acceptCounter(s, p, h.id);
    expect(h).toMatchObject({ status: 'accepted', dayRate: n.to });
    expect(obligation(p, h.obligationId!).amount).toBe(n.to * h.estDays);
    expect(producerAccount(p, lp)).toEqual({ negotiated: 1, cameDown: 1, cost: lp.dayRate, saved: (n.from - n.to) * h.estDays });
    expect(producerAccountLine(p, lp)).toBe(`Negotiated 1 counteroffer for $${lp.dayRate.toLocaleString('en-US')}: 1 came down, and those you accepted save $${((n.from - n.to) * h.estDays).toLocaleString('en-US')} over their days.`);
  });

  it('is not certain: when they hold, the day is still paid, the rate is as it was, and declining saves nothing', () => {
    const { s, p, lp, h, text } = filmWhere(false);
    const n = h.negotiated!;
    expect(n.to).toBe(n.from);
    expect(h.counterRate).toBe(n.from);
    expect(obligation(p, lp.obligationId!).settled).toBe(lp.dayRate);
    expect(text).toContain(`held at $${n.from.toLocaleString('en-US')} a day. Accepting it is yours.`);
    expect(negotiationLine(h, () => 'that day')).toContain(`they held at $${n.from.toLocaleString('en-US')} a day.`);
    declineCounter(s, p, h.id);
    expect(producerAccount(p, lp)).toEqual({ negotiated: 1, cameDown: 0, cost: lp.dayRate, saved: 0 });
    expect(producerAccountLine(p, lp)).toBe(`Negotiated 1 counteroffer for $${lp.dayRate.toLocaleString('en-US')}: 0 came down.`);
  });

  it('moves more often and closes more for experience, within its limits', () => {
    expect([1, 3, 5, 9].map(movesChance)).toEqual([0.45, 0.65, 0.85, 0.85]);
    expect([0, 1, 2, 4, 9].map(gapClosed)).toEqual([0.15, 0.15, 0.3, 0.6, 0.6]);
  });

  it('ends with them: released, what they negotiated stands, what they were paid stays paid, and a day worked credits them', () => {
    const { s, p } = film('lp-left');
    const lp = hire(s, p);
    expect(computeCredits(s, p).some((c) => c.roleId === 'line-producer')).toBe(false);
    const h = countered(s, p);
    negotiate(s, p, h.id);
    const rate = h.counterRate;
    releaseHire(s, p, lp.id);
    expect(obligation(p, lp.obligationId!)).toMatchObject({ settled: lp.dayRate, amount: lp.dayRate, state: 'settled' });
    expect(computeCredits(s, p).filter((c) => c.roleId === 'line-producer').map((c) => c.contribution)).toEqual(['Line Producer']);
    expect(h).toMatchObject({ status: 'countered', counterRate: rate });
    const h2 = countered(s, p, 'sound-mixer');
    expect(negotiationRefusal(p, h2.id)).toBe('Hire a line producer first (Crew, Producing).');
  });

  it('is refused when the production cannot pay for the day, before anything changes', () => {
    const { s, p } = film('lp-broke');
    const lp = hire(s, p);
    const a = countered(s, p);
    negotiate(s, p, a.id);
    const b = countered(s, p, 'sound-mixer');
    const left = ledgerTotals(p).available;
    p.obligations.push({ id: 'fixture', label: 'Fixture: everything else is committed', category: 'contingency', amount: left, state: 'reserved', settled: 0, postings: [] });
    expect(() => negotiate(s, p, b.id)).toThrow(/^This negotiation needs \$[\d,]+ more than .+'s agreement holds, but only \$0 is uncommitted\./);
    expect(b.negotiated).toBeUndefined();
    expect(lp.daysWorked).toBe(1);
  });
});
