// Representation (the v3 package, 02; requirement V3-L03): the search, the mandate, submissions, negotiation,
// commission on the ledger, conflicts, renewal and ending it.
import { describe, expect, it } from 'vitest';
import { DAY, acceptDeal, approachBacker, backerOptions, leverage, processUntil } from '../src/engine';
import { ledgerTotals } from '../src/engine/budget';
import { onProjectDelivered } from '../src/engine/finance';
import {
  AGENTS, AGENT_ANSWER_DAYS, MANDATE_DAYS, MANDATE_OPEN_DAYS, NOTICE_DAYS, RENEWAL_WARNING_DAYS, agentById, agentRead, agentWeight, approachAgent, approachRefusal,
  commissionStatement, commissionTotal, declineMandate, giveNotice, mandateTerms, renewMandate, renewRefusal, renewalRead, representedBy, signWith, submissions, submitRefusal, submitThrough,
} from '../src/engine/representation';
import { deserialize, serialize } from '../src/engine/save';
import type { FinanceDeal, GameState, Project } from '../src/engine/types';
import { approve, buildProject, startLife, writePitch } from './helpers';

function world(tag: string, title = 'Night Ferry'): { s: GameState; p: Project } {
  const s = startLife(tag);
  const p = project(s, title);
  return { s, p };
}
function project(s: GameState, title: string): Project {
  const p = buildProject(s, { title, format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ines', patch: { roleSize: 'lead' } }], [{ place: 'Dock', chars: ['Ines'], minutes: 3 }]);
  writePitch(p);
  Object.assign(p.story, { synopsis: 'A test synopsis.', statement: 'A test statement.' });
  // The helper's project comes with its money already agreed (a fixture); here the money is still to raise, as in play.
  p.finance!.deals = [];
  p.funding.fund = 0;
  approve(s, p);
  return p;
}
const wait = (s: GameState, days: number) => processUntil(s, s.now + days * DAY, 'tick', 100_000);
/** A delivered project with a reception: a labelled fixture, the assessment made at delivery set here. */
function deliveredWork(s: GameState, title: string, reception: number): Project {
  const p = project(s, title);
  p.delivered = { at: s.now, runtimeMin: 10 };
  p.quality = { overall: reception, reception };
  return p;
}
/** Represented by this agent, through the game's own approach, answer and signature. */
function sign(s: GameState, id: string): void {
  approachAgent(s, id);
  wait(s, AGENT_ANSWER_DAYS + 1);
  signWith(s, id);
}
/** What a backer decided is the game's own draw; a test that needs an offer sets the answer here (a labelled fixture), as negotiation.test.ts does. */
function offered(d: FinanceDeal, amount: number, onDelivery = 0): FinanceDeal {
  Object.assign(d, { status: 'offered', amount, expiresAt: undefined });
  d.terms = { ...d.terms, recoup: amount, incomeShare: 0.3, onDelivery };
  return d;
}

describe('finding an agent', () => {
  it('each agent reads the same record differently, and says why', () => {
    const { s } = world('rep-read');
    const read = () => Object.fromEntries(AGENTS.map((a) => [a.id, agentRead(s, a)]));
    expect(read()).toEqual({
      vale: { takes: true, reason: 'You have an approved script for them to read, which is what they look for.' },
      montoya: { takes: false, reason: 'They take on filmmakers with a delivered project; you have none.' },
      adeyemi: { takes: false, reason: 'They take on filmmakers with a delivered project; you have none.' },
      brandt: { takes: false, reason: 'They take on filmmakers with 2 delivered projects or a prize; you have none and no prize.' },
    });
    deliveredWork(s, 'First', 52);
    expect(read().montoya).toEqual({ takes: true, reason: 'You have one delivered project, which is what they look for.' });
    expect(read().adeyemi).toEqual({ takes: false, reason: 'They want a delivered project that was well received. Your best so far was received at 52 of 100; they look for 60.' });
    expect(read().brandt.takes).toBe(false);
    deliveredWork(s, 'Second', 71);
    expect(read().adeyemi).toEqual({ takes: true, reason: 'Your delivered work was received at 71 of 100, which is what they look for.' });
    expect(read().brandt).toEqual({ takes: true, reason: 'You have 2 delivered projects, which is what they look for.' });
  });

  it('with no approved script, even the agent for newcomers says no', () => {
    const s = startLife('rep-nothing');
    expect(agentRead(s, agentById('vale'))).toEqual({ takes: false, reason: 'They want to read an approved script first, and you have none yet.' });
  });

  it('an approach is answered in three days from the record as it stands then; a no is not asked again until the record changes', () => {
    const { s } = world('rep-approach');
    approachAgent(s, 'montoya');
    expect(approachRefusal(s, 'montoya')).toBe("Rafael Montoya hasn't answered yet.");
    expect(approachRefusal(s, 'vale')).toBe('You are waiting on Rafael Montoya. One approach at a time.');
    wait(s, AGENT_ANSWER_DAYS + 1);
    expect(s.representation!.approaches[0]).toMatchObject({ status: 'declined', reason: 'They take on filmmakers with a delivered project; you have none.' });
    expect(s.log.some((l) => l.text === "Rafael Montoya won't represent you yet. They take on filmmakers with a delivered project; you have none.")).toBe(true);
    expect(approachRefusal(s, 'montoya')).toBe('Rafael Montoya said no, and your record is as it was then. They take on filmmakers with a delivered project; you have none.');
    // The record changes between asking and the answer: the answer reads it as it stands on the day.
    deliveredWork(s, 'First', 50);
    expect(approachRefusal(s, 'montoya')).toBeNull();
    approachAgent(s, 'montoya');
    wait(s, AGENT_ANSWER_DAYS + 1);
    expect(s.representation!.approaches[1]).toMatchObject({ status: 'offered' });
    expect(deserialize(serialize(s)).representation).toEqual(s.representation);
  });

  it('an offer of representation lapses unanswered, can be declined, and is signed only while open', () => {
    const { s } = world('rep-offer');
    approachAgent(s, 'vale');
    wait(s, AGENT_ANSWER_DAYS + 1);
    expect(approachRefusal(s, 'vale')).toBe('Imogen Vale has offered to represent you. Sign or decline first.');
    declineMandate(s, 'vale');
    expect(() => signWith(s, 'vale')).toThrow('That offer is no longer open.');
    expect(representedBy(s)).toBeNull();
    // Declined by the player, so it can be asked for again; left alone this time, it lapses.
    approachAgent(s, 'vale');
    wait(s, AGENT_ANSWER_DAYS + MANDATE_OPEN_DAYS + 2);
    expect(s.representation!.approaches[1].status).toBe('lapsed');
    expect(() => signWith(s, 'vale')).toThrow('That offer is no longer open.');
  });
});

describe('the mandate', () => {
  it('says its commission, what it covers, where the agent stands aside, the term and the notice before it is signed', () => {
    expect(mandateTerms(agentById('vale'))).toEqual([
      'Commission: 15% of the money a backer pays into a project on a deal Imogen Vale submitted, taken as each payment arrives.',
      'No commission on money you raise yourself: grants, your own money, a studio you pitched, or any backer you approached without them.',
      'They submit to: private investors and commissioners. A commissioner reads a submission from an agent before you have delivered a project.',
      "They stand aside from co-production partners. Her agency also represents co-production companies, so she doesn't bring her own clients' projects to them. You approach those yourself, and no commission is due.",
      'One agent at a time: while they represent you, no other agent will.',
      'Twelve months. A month before it ends they say whether they would renew; renewing is yours to choose.',
      "Either of you can end it with 30 days' notice. They make no new submissions in that time. Deals they already submitted stay theirs, and their commission on those is due whenever the money arrives.",
    ]);
    expect(mandateTerms(agentById('adeyemi'))[2]).toBe('They submit to: private investors, co-production partners and commissioners. A commissioner reads a submission from an agent before you have delivered a project.');
    expect(mandateTerms(agentById('adeyemi'))[3]).toBe('They declare no conflict with any backer.');
    expect(mandateTerms(agentById('brandt'))[0]).toContain('Commission: 12% of');
  });

  it('is one agent at a time', () => {
    const { s } = world('rep-one');
    sign(s, 'vale');
    expect(representedBy(s)).toMatchObject({ agent: { id: 'vale' }, until: s.representation!.current!.signedAt + MANDATE_DAYS * DAY });
    expect(approachRefusal(s, 'vale')).toBe('Imogen Vale represents you already.');
    expect(approachRefusal(s, 'montoya')).toBe("Imogen Vale represents you, and an agent takes on nobody who has one. End that first, with 30 days' notice.");
    expect(() => approachAgent(s, 'montoya')).toThrow('Imogen Vale represents you');
  });
});

describe('submissions', () => {
  it('an agent opens the commissioner\'s door before anything is delivered; the same approach otherwise, with the same documents', () => {
    const { s, p } = world('rep-door');
    expect(backerOptions(s, p).find((o) => o.kind === 'commissioner')).toMatchObject({ ready: false, needs: 'Deliver a project first.' });
    expect(submitRefusal(s, p, 'commissioner')).toBe('Nobody represents you. Find an agent from your profile.');
    sign(s, 'vale');
    expect(submitRefusal(s, p, 'commissioner')).toBeNull();
    // The player's own approach is as it was: the door is the agent's, not the player's.
    expect(() => approachBacker(s, p, 'commissioner')).toThrow('Deliver a project first.');
    const d = submitThrough(s, p, 'commissioner');
    expect(d).toMatchObject({ kind: 'commissioner', status: 'considering', via: { agentId: 'vale', name: 'Imogen Vale', rate: 0.15 } });
    expect(d.sent?.length).toBeGreaterThan(0);
    expect(s.log[0].text).toMatch(/^Imogen Vale submitted Night Ferry to the commissioner, sending the approved script and your /);
    expect(submissions(s, 'vale').map((x) => x.d.id)).toEqual([d.id]);
    // One approach per backer per project, whoever made it.
    expect(submitRefusal(s, p, 'commissioner')).toBe('Already approached for this project.');
    // Documents still have to be written: an agent submits what exists.
    const q = buildProject(s, { title: 'Unwritten', format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ines', patch: { roleSize: 'lead' } }], [{ place: 'Dock', chars: ['Ines'], minutes: 3 }]);
    q.finance!.deals = []; q.funding.fund = 0; // as in project(): its money is still to raise
    approve(s, q);
    q.story.logline = '';
    expect(submitRefusal(s, q, 'investor')).toMatch(/Still to write/);
  });

  it('the agent stands aside where they declared a conflict, and the player can still go there alone, with no commission', () => {
    const { s, p } = world('rep-conflict');
    sign(s, 'vale');
    expect(submitRefusal(s, p, 'co-producer')).toBe("Imogen Vale stands aside from co-production partners. Her agency also represents co-production companies, so she doesn't bring her own clients' projects to them. You can approach one yourself, and no commission is due.");
    expect(() => submitThrough(s, p, 'co-producer')).toThrow('stands aside');
    const own = approachBacker(s, p, 'investor');
    expect(own.via).toBeUndefined();
    offered(own, 20_000);
    const before = p.obligations.length;
    acceptDeal(s, p, own.id);
    expect(p.obligations.length).toBe(before);
    expect(commissionStatement(s)).toEqual([]);
  });
});

describe('commission', () => {
  it('is the agent\'s rate of each payment as it arrives, on the project\'s ledger, and the statement is those postings', () => {
    const { s, p } = world('rep-commission');
    sign(s, 'vale');
    const d = offered(submitThrough(s, p, 'commissioner'), 40_000, 8_000);
    const before = ledgerTotals(p);
    acceptDeal(s, p, d.id);
    // 32,000 arrives on signing; 15% of it is theirs now.
    const after = ledgerTotals(p);
    expect(after.fund - before.fund).toBe(32_000);
    expect(after.settled - before.settled).toBe(4_800);
    expect(after.available - before.available).toBe(32_000 - 4_800);
    const line = p.obligations.find((o) => o.ref === `commission:vale:${d.id}`)!;
    expect(line).toMatchObject({ label: "Imogen Vale's Commission: 15% Of $32,000 From The Commissioner", category: 'finance', amount: 4_800, settled: 4_800, state: 'settled' });
    expect(commissionStatement(s, 'vale')).toEqual([{ at: s.now, projectId: p.id, title: 'Night Ferry', dealId: d.id, backer: 'Commissioner', amount: 4_800 }]);
    expect(s.log[0].text).toBe('Imogen Vale took $4,800 commission on the $32,000 the commissioner paid into Night Ferry.');
    // The rest arrives on delivery, and so does the rest of the commission.
    wait(s, 5);
    p.delivered = { at: s.now, runtimeMin: 10 }; // labelled fixture: delivered
    onProjectDelivered(s, p);
    expect(commissionStatement(s, 'vale').map((x) => x.amount)).toEqual([1_200, 4_800]);
    expect(commissionTotal(s, 'vale')).toBe(6_000);
    expect(commissionTotal(s, 'montoya')).toBe(0);
    // The total is the ledger's: change a posting and it changes.
    line.postings[0].amount = 1;
    expect(commissionTotal(s, 'vale')).toBe(1_201);
  });

  it('is still due on a deal they submitted after they have gone', () => {
    const { s, p } = world('rep-tail');
    sign(s, 'vale');
    const d = offered(submitThrough(s, p, 'investor'), 10_000);
    giveNotice(s);
    wait(s, NOTICE_DAYS + 1);
    expect(representedBy(s)).toBeNull();
    expect(s.log.find((l) => l.text.startsWith('Imogen Vale no longer represents you'))!.text).toBe('Imogen Vale no longer represents you. One deal they submitted is still theirs: commission is due as its money arrives.');
    acceptDeal(s, p, d.id);
    expect(commissionStatement(s, 'vale').map((x) => x.amount)).toEqual([1_500]);
  });
});

describe('negotiation', () => {
  it('their weight counts on an offer they brought, while they represent you, and on nothing else', () => {
    const { s, p } = world('rep-weight');
    sign(s, 'vale');
    const theirs = offered(submitThrough(s, p, 'commissioner'), 40_000);
    const q = project(s, 'Other');
    const mine = offered(approachBacker(s, q, 'investor'), 10_000);
    expect(agentWeight(s, theirs)).toBe(0.1);
    expect(agentWeight(s, mine)).toBe(0);
    const withAgent = leverage(s, p, theirs);
    delete theirs.via;
    expect(withAgent - leverage(s, p, theirs)).toBeCloseTo(0.1, 10);
    theirs.via = { agentId: 'vale', name: 'Imogen Vale', rate: 0.15 };
    giveNotice(s);
    expect(agentWeight(s, theirs)).toBe(0.1); // still theirs to negotiate while they work out their notice
    wait(s, NOTICE_DAYS + 1);
    expect(agentWeight(s, theirs)).toBe(0);
  });
});

describe('renewal and ending', () => {
  it('a month before the term ends they say whether they would renew, from what the term brought; unrenewed, it runs out', () => {
    const { s } = world('rep-lapse');
    sign(s, 'vale');
    expect(renewRefusal(s)).toBe('They say whether they would renew 30 days before the term ends.');
    wait(s, MANDATE_DAYS - RENEWAL_WARNING_DAYS + 1);
    expect(s.representation!.current!.renewal).toMatchObject({ willing: false, reason: "Imogen Vale won't renew: nothing they submitted was signed this term, and you delivered nothing in it." });
    expect(renewRefusal(s)).toBe("Imogen Vale won't renew: nothing they submitted was signed this term, and you delivered nothing in it.");
    expect(() => renewMandate(s)).toThrow("won't renew");
    wait(s, RENEWAL_WARNING_DAYS + 1);
    expect(representedBy(s)).toBeNull();
    expect(s.representation!.past).toMatchObject([{ agentId: 'vale', how: 'lapsed' }]);
    expect(s.log.some((l) => l.text === 'Imogen Vale no longer represents you: the twelve months ran out and were not renewed.')).toBe(true);
    // Free to look again.
    expect(approachRefusal(s, 'vale')).toBeNull();
  });

  it('commission in the term makes them willing; renewed, the term runs twelve months more and the old end passes quietly', () => {
    const { s, p } = world('rep-renew');
    sign(s, 'vale');
    const until = s.representation!.current!.until;
    acceptDeal(s, p, offered(submitThrough(s, p, 'investor'), 10_000).id);
    expect(renewalRead(s)).toEqual({ willing: true, reason: 'Imogen Vale would renew: this term brought them $1,500 in commission.' });
    wait(s, MANDATE_DAYS - RENEWAL_WARNING_DAYS + 1);
    expect(renewRefusal(s)).toBeNull();
    renewMandate(s);
    expect(s.representation!.current).toMatchObject({ until: until + MANDATE_DAYS * DAY, renewed: 1 });
    wait(s, RENEWAL_WARNING_DAYS + 5);
    expect(representedBy(s)?.agent.id).toBe('vale');
    // The second term brought nothing and nothing was delivered in it: this time they won't.
    wait(s, MANDATE_DAYS - RENEWAL_WARNING_DAYS);
    expect(s.representation!.current!.renewal).toMatchObject({ willing: false });
  });

  it('a delivered project in the term is enough for them to renew', () => {
    const { s } = world('rep-renew-work');
    sign(s, 'vale');
    wait(s, 30);
    deliveredWork(s, 'Made This Year', 40);
    expect(renewalRead(s)).toEqual({ willing: true, reason: 'Imogen Vale would renew: nothing they submitted was signed this term, but you delivered a project in it.' });
  });

  it('notice ends it in thirty days, stops new submissions at once, and is given once', () => {
    const { s, p } = world('rep-notice');
    sign(s, 'vale');
    giveNotice(s);
    expect(s.log[0].text).toBe('You gave Imogen Vale notice. They represent you for 30 more days and make no new submissions.');
    expect(submitRefusal(s, p, 'investor')).toBe('Imogen Vale is working out their notice and makes no new submissions.');
    expect(() => giveNotice(s)).toThrow('Notice has been given already.');
    expect(renewRefusal(s)).toBe('Notice has been given, so there is nothing to renew.');
    expect(approachRefusal(s, 'montoya')).toContain('End that first');
    wait(s, NOTICE_DAYS + 1);
    expect(representedBy(s)).toBeNull();
    expect(s.representation!.past).toMatchObject([{ agentId: 'vale', how: 'notice' }]);
    expect(approachRefusal(s, 'montoya')).toBeNull();
  });
});
