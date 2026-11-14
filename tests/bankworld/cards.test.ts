// @ts-nocheck: 1221's test, ported (docs/v9/PARITY.md). Its skipped cases name 1221 fields and exports SLATE doesn't carry.
/**
 * The card is the bank's (`content/cards.ts`, `cardTerms` in
 * `systems/credit.ts`). Until 2026-09-26 every card ran on one set of
 * American terms under its bank's name. Each rule is held here with a card
 * put on the table for the test and taken off after, so it holds whatever
 * the research found.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { migrate, quickSave } from '../../src/engine/bankworld';
import type { Simulation } from '../../src/engine/bankworld/core/simulation';
import { CARDS, CARD_LAW, type CardLaw, type CardProduct } from '../../src/engine/bankworld/content/cards';
import { aprFor, cardOf, cardTerms, DUE_KIND, minimumDue, priceWithin, STATEMENT_KIND } from '../../src/engine/bankworld/systems/credit';
import { BANKING, bankById } from '../../src/engine/bankworld/content/banks';
import { LATE_FEE_RULES, lateFeeByRule } from '../../src/engine/bankworld/content/latefees';
import { instantFromZoned, zonedParts, MS_DAY } from '../../src/engine/bankworld/core/time';

const cards = CARDS as Record<string, CardProduct | { none: true; source: string }>;
const laws = CARD_LAW as Record<string, CardLaw>;
const put: string[] = [];
const lawPut: string[] = [];
const kept = new Map<string, unknown>();
function withCard(bankId: string, product: CardProduct): void {
  if (!kept.has(bankId)) kept.set(bankId, cards[bankId]);
  cards[bankId] = product;
  put.push(bankId);
}
function withLaw(iso: string, rule: CardLaw): void {
  if (!kept.has(`law:${iso}`)) kept.set(`law:${iso}`, laws[iso]);
  laws[iso] = rule;
  lawPut.push(iso);
}
afterEach(() => {
  for (const id of put.splice(0)) { const was = kept.get(id); if (was) cards[id] = was as CardProduct; else delete cards[id]; kept.delete(id); }
  for (const iso of lawPut.splice(0)) { const was = kept.get(`law:${iso}`); if (was) laws[iso] = was as CardLaw; else delete laws[iso]; kept.delete(`law:${iso}`); }
});

const life = (seed: string, extra: Record<string, unknown> = {}) => quickSave({ wealth: 'scraping', ...extra }, seed);
const cardIn = (sim: Simulation) => cardOf(sim, sim.player)!;
const base: CardProduct = { name: 'Test Card', kind: 'revolving', apr: 0.18, annualFee: 0, minimumShare: 0.03, minimumFloor: 5_000_00, lateFee: 3_000_00, returnedPaymentFee: 3_000_00, cashFeeShare: 0.05, cashApr: 0.25, source: 'test', asOf: '2026-09-26' };
/** The next statement, and the clock moved just past it. */
function toStatement(sim: Simulation): number {
  const at = sim.timeline.pending().find((i) => i.kind === STATEMENT_KIND)!.at;
  sim.advanceTo(at + 1000);
  return at;
}

describe('a new life’s card', () => {
  it('is its bank’s, under the card’s own name, and tied to the bank by id', () => {
    const plain = life('card-tie');
    const bankId = cardIn(plain).bankId!;
    expect(bankById(bankId)?.name).toBe(cardIn(plain).institution);
    withCard(bankId, { ...base, name: 'Landsbankinn Test Card' });
    const named = life('card-named');
    expect(cardIn(named).name).toBe('Landsbankinn Test Card');
    expect(cardIn(named).bankId).toBe(bankId);
  });
});

describe('the rate', () => {
  it('is the bank’s flat rate where it has one', () => {
    const sim = life('card-flat');
    withCard(cardIn(sim).bankId!, base);
    const terms = cardTerms(sim, cardIn(sim), 500);
    expect(terms.priced).toBe(0.18);
    expect(terms.estimated).toEqual([]);
  });

  it('is priced within the bank’s range by the record when the card opens, and held there after', () => {
    expect(priceWithin(0.1, 0.3, 800)).toBe(0.1);
    expect(priceWithin(0.1, 0.3, 850)).toBe(0.1);
    expect(priceWithin(0.1, 0.3, 580)).toBe(0.3);
    expect(priceWithin(0.1, 0.3, 690)).toBe(0.2);
    const sim = life('card-range');
    const bankId = cardIn(sim).bankId!;
    withCard(bankId, { ...base, apr: undefined, aprFrom: 0.1, aprTo: 0.3 });
    // A new card, opened on a record of 690: the middle of the range.
    const old = cardIn(sim);
    if (old.balance < 0) sim.post({ memo: 'test', category: 'test', postings: [{ accountId: old.id, amount: -old.balance }, { accountId: sim.nominalAccount('income', 'Test').id, amount: old.balance }] });
    expect(sim.execute({ kind: 'card.close', payload: {} }).ok).toBe(true);
    sim.player.credit!.score = 695;
    expect(sim.execute({ kind: 'card.apply', payload: {} }).ok).toBe(true);
    sim.advanceBy(8 * MS_DAY);
    expect(cardIn(sim).apr).toBe(0.2);
    // A better record later doesn't reprice it (Reg Z §1026.55 holds a US rate; SLATE holds every card's).
    sim.player.credit!.score = 820;
    toStatement(sim);
    expect(cardIn(sim).apr).toBe(0.2);
    expect(cardTerms(sim, cardIn(sim), 820).priced).toBe(0.1);
  });

  it('is held to the country’s cap', () => {
    const sim = life('card-cap');
    const bank = bankById(cardIn(sim).bankId!)!;
    withCard(bank.id, { ...base, apr: 0.4 });
    withLaw(bank.iso, { aprCap: 0.25, law: 'A Test Act', source: 'test' });
    cardIn(sim).apr = 0.4;
    const terms = cardTerms(sim, cardIn(sim), 650);
    expect(terms.apr).toBe(0.25);
    expect(terms.priced).toBe(0.25);
    expect(terms.capped?.law).toBe('A Test Act');
  });

  it('is SLATE’s estimate, by the record, where the bank’s card isn’t on record, and says so', () => {
    const sim = life('card-none');
    const bankId = cardIn(sim).bankId!;
    const was = cards[bankId];
    delete cards[bankId];
    try {
      const terms = cardTerms(sim, cardIn(sim), 600);
      expect(terms.priced).toBe(aprFor(600));
      expect(terms.estimated).toEqual(expect.arrayContaining(['card', 'rate', 'minimum', 'lateFee']));
    } finally { if (was) cards[bankId] = was; }
  });
});

describe('the minimum, the late fee and the due date', () => {
  it('asks the bank’s share, plus the month’s interest where the bank adds it, never under its floor', () => {
    const sim = life('card-minimum');
    withCard(cardIn(sim).bankId!, { ...base, minimumShare: 0.01, minimumPlusInterest: true, minimumFloor: 1_000_00 });
    const terms = cardTerms(sim, cardIn(sim), 650);
    expect(minimumDue(sim, 500_000_00, terms, 7_000_00)).toBe(5_000_00 + 7_000_00);
    expect(minimumDue(sim, 20_000_00, terms, 0)).toBe(1_000_00);
    expect(minimumDue(sim, 500_00, terms, 0)).toBe(500_00);
  });

  it('charges a late fee set as a share, with its floor and cap, where the bank sets one that way', () => {
    const maybank = LATE_FEE_RULES['my-maybank']!;
    // 1% of the balance, RM10 to RM100.
    expect(lateFeeByRule(maybank, 50_00, 0, 500_00)).toBe(10_00);
    expect(lateFeeByRule(maybank, 500_00, 0, 5_000_00)).toBe(50_00);
    expect(lateFeeByRule(maybank, 5_000_00, 0, 50_000_00)).toBe(100_00);
    // What went unpaid, and never over the minimum where the bank says so.
    expect(lateFeeByRule(LATE_FEE_RULES['vn-agribank']!, 10_000_000_00, 4_000_000_00, 0)).toBe(180_000_00);
    expect(lateFeeByRule(LATE_FEE_RULES['hk-standard-chartered']!, 100_00, 0, 10_000_00)).toBe(100_00);
    expect(lateFeeByRule(LATE_FEE_RULES['om-sohar-international']!, 100_00, 0, 0)).toBe(3_00 + 3_00);
    // Charged on a missed minimum, in Kuala Lumpur, at Maybank.
    const sim = quickSave({ startLocationId: 'my-14-kualalumpur', homeRegionId: 'my-14-kualalumpur', livesWhereBorn: true, wealth: 'scraping', bankId: 'my-maybank' }, 'card-my-late');
    const card = cardOf(sim, sim.player)!;
    expect(card.bankId).toBe('my-maybank');
    expect(cardTerms(sim, card, 650).lateRule).toBeDefined();
    sim.post({ memo: 'test', category: 'test', postings: [{ accountId: card.id, amount: -3_000_00 }, { accountId: sim.nominalAccount('income', 'Test').id, amount: 3_000_00 }] });
    sim.player.credit!.autopay = 'minimum';
    let due = sim.timeline.pending().find((i) => i.kind === DUE_KIND)?.at;
    while (due === undefined) { sim.advanceTo(sim.timeline.pending().find((i) => i.kind === STATEMENT_KIND)!.at + 1000); due = sim.timeline.pending().find((i) => i.kind === DUE_KIND)?.at; }
    const statement = sim.player.credit!.statementBalance;
    for (const a of Object.values(sim.universe.accounts)) if (a.ownerId === sim.player.id && (a.kind === 'checking' || a.kind === 'savings') && !a.closedAt && a.balance > 0) sim.post({ memo: 'test', category: 'test', postings: [{ accountId: a.id, amount: -a.balance }, { accountId: sim.nominalAccount('income', 'Test').id, amount: a.balance }] });
    sim.advanceTo(due + 1000);
    const fee = sim.universe.transactions.find((t) => t.memo === 'Late fee')!;
    const expected = Math.min(Math.max(Math.round(statement * 0.01), 10_00), 100_00);
    expect(fee.postings.find((q) => q.accountId === card.id)!.amount).toBe(-expected);
  });

  it('in Mexico, never asks under 1.25% of the limit, and never more than is owed', () => {
    const sim = quickSave({ startLocationId: 'mx-cmx-mexicocity', homeRegionId: 'mx-cmx-mexicocity', livesWhereBorn: true, wealth: 'comfortable' }, 'card-mx');
    const card = cardOf(sim, sim.player)!;
    card.creditLimit = 100_000_00;
    const terms = cardTerms(sim, card, 650);
    expect(terms.minimumOfLimit).toBe(1_250_00);
    // 1.5% of 20,000 is 300: the limit's 1,250 is asked instead.
    expect(minimumDue(sim, 20_000_00, terms, 0)).toBe(1_250_00);
    expect(minimumDue(sim, 1_000_00, terms, 0)).toBe(1_000_00);
    // Past it, the share of the balance and the interest.
    expect(minimumDue(sim, 100_000_00, terms, 2_000_00)).toBe(Math.max(1_250_00, Math.round(100_000_00 * terms.minimumShare) + 2_000_00));
  });

  it('charges the bank’s late fee, held to the law’s cap', () => {
    const sim = life('card-late');
    const bank = bankById(cardIn(sim).bankId!)!;
    withCard(bank.id, { ...base, lateFee: 9_000_00 });
    // With no cap: the country's own law caps it too, and is put aside for this.
    withLaw(bank.iso, { law: 'No Cap', source: 'test' });
    expect(cardTerms(sim, cardIn(sim), 650).lateFee).toBe(9_000_00);
    withLaw(bank.iso, { lateFeeCap: 2_500_00, law: 'A Test Act', source: 'test' });
    expect(cardTerms(sim, cardIn(sim), 650).lateFee).toBe(2_500_00);
  });

  it('falls due so many days after the statement where the bank says, and on the 15th where it doesn’t', () => {
    const sim = life('card-grace');
    withCard(cardIn(sim).bankId!, { ...base, graceDays: 25 });
    const at = toStatement(sim);
    const due = sim.timeline.pending().find((i) => i.kind === DUE_KIND)!.at;
    const s = zonedParts(at, sim.zone);
    // At noon on the real date 25 days on: until the third round of 2026-10-13 this asked `instantFromZoned` for the 45th
    // of the month as the engine did, which came back a minute late, at 12:01 (defect 48 of that round).
    const on = new Date(Date.UTC(s.year, s.month - 1, s.day + 25));
    expect(due).toBe(instantFromZoned({ year: on.getUTCFullYear(), month: on.getUTCMonth() + 1, day: on.getUTCDate(), hour: 12 }, sim.zone));
    expect(zonedParts(due, sim.zone)).toMatchObject({ hour: 12, minute: 0 });
    const plain = life('card-grace-plain');
    withCard(cardIn(plain).bankId!, { ...base });
    toStatement(plain);
    expect(zonedParts(plain.timeline.pending().find((i) => i.kind === DUE_KIND)!.at, plain.zone).day).toBe(15);
  });
});

describe('a charge card', () => {
  it('takes the whole statement whatever the autopay, won’t be set to the minimum, and asks all of it', () => {
    const sim = life('card-charge', { personality: { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, emotionalStability: 50, ambition: 50, riskTolerance: 90 } });
    withCard(cardIn(sim).bankId!, { ...base, kind: 'charge' });
    sim.player.credit!.autopay = 'minimum';
    const refused = sim.execute({ kind: 'finance.set_autopay', payload: { mode: 'minimum' } });
    expect(refused.ok).toBe(false);
    expect(refused.error).toMatch(/whole statement/);
    const terms = cardTerms(sim, cardIn(sim), 650);
    expect(minimumDue(sim, 40_000_00, terms, 0)).toBe(40_000_00);
    toStatement(sim);
    const statement = sim.player.credit!.statementBalance;
    expect(statement).toBeGreaterThan(0);
    // Enough in the bank to cover it, after the rent.
    sim.post({ memo: 'test', category: 'test', postings: [{ accountId: sim.player.primaryAccountId!, amount: 5_000_000_00 }, { accountId: sim.nominalAccount('income', 'Test').id, amount: -5_000_000_00 }] });
    sim.advanceTo(sim.timeline.pending().find((i) => i.kind === DUE_KIND)!.at + 1000);
    expect(sim.player.credit!.paidSinceStatement).toBe(statement);
  });
});

describe('the yearly fee', () => {
  it('is charged on the statement in the month the card was opened, once a year', () => {
    // Money behind it, so a year of statements comes and nothing is charged off.
    const sim = life('card-fee', { wealth: 'inherited' });
    withCard(cardIn(sim).bankId!, { ...base, annualFee: 4_900_00 });
    const opened = zonedParts(cardIn(sim).openedAt, sim.zone).month;
    const fees = () => sim.universe.transactions.filter((t) => t.memo.startsWith('Yearly fee'));
    for (let i = 0; i < 13; i += 1) toStatement(sim);
    expect(fees()).toHaveLength(1);
    expect(zonedParts(fees()[0]!.at, sim.zone).month).toBe(opened);
    expect(fees()[0]!.postings.find((p) => p.accountId === cardIn(sim).id)!.amount).toBe(-4_900_00);
    expect(sim.ledger.audit()).toEqual([]);
  });
});

describe('switching banks', () => {
  it('leaves the card with the bank that issued it', () => {
    const sim = life('card-switch', { startLocationId: 'is-39-mosfellsbr' });
    const issuer = cardIn(sim).bankId!;
    const other = bankById(issuer)!;
    const to = ['is-arion', 'is-islandsbanki', 'is-landsbankinn'].find((id) => id !== issuer && bankById(id));
    if (!to) throw new Error(`no other Icelandic bank beside ${other.name}`);
    const answer = sim.execute({ kind: 'bank.switch', payload: { bankId: to } });
    expect(answer.ok, answer.error).toBe(true);
    sim.advanceBy(10 * MS_DAY);
    expect(cardIn(sim).bankId).toBe(issuer);
  });
});

describe('a save from before', () => {
  // Not ported: 1221's own old-save migrations aren't ported: no SLATE save was ever a 1221 save.
  it.skip('ties its card to the bank its current account is at, under the bank’s card name', () => {
    const sim = life('card-old');
    const card = cardIn(sim);
    const bankId = card.bankId!;
    withCard(bankId, { ...base, name: 'The Real Card' });
    delete card.bankId;
    card.name = `${card.institution} Credit Card`;
    const result = migrate(sim.universe);
    expect(card.bankId).toBe(bankId);
    expect(card.name).toBe('The Real Card');
    expect(result.steps.join(' ')).toContain('Made 1 card the bank’s own.');
    expect(migrate(sim.universe).steps.join(' ')).not.toContain('the bank’s own');
  });
});

describe('the screens', () => {
  // Renamed on 2026-10-23 (brief 23): until then “…, and keep Home to a line of money (from 2026-10-10)”.
  // Not ported: 1221's Home screen isn't SLATE's; SLATE's Home has its own Your Bank panel (tests/v9-bank-home.test.ts).
  it.skip('run the card from the bank’s screen, and keep Home to what needs putting right (from 2026-10-10)', async () => {
    const { readFileSync } = await import('node:fs');
    const bank = readFileSync('src/ui/bankworld/ui/bank/BankCard.tsx', 'utf8');
    const home = readFileSync('src/ui/screens/Home.tsx', 'utf8');
    expect(bank).toContain('feature="finance.pay_card"');
    expect(bank).toContain('feature="finance.set_autopay"');
    expect(home).not.toContain('finance.pay_card');
    // Until 2026-10-10 Home showed the card and the credit record at a glance; the owner's brief of that day moved the
    // detail to Money, leaving Home a line of it, and a card's trouble in What Needs You (`troubles`). The line went to
    // Money's head on 2026-10-23 (brief 23, `components/Glance.tsx`), and the trouble stayed.
    expect(home).not.toContain('<CardSummary');
    expect(home).not.toContain('title="Money"');
    expect(home).toContain('troubles(s, person)');
  });
});

describe('the table itself', () => {
  it('holds a real card, well formed, for nearly every bank in the thirteen, each with its source', () => {
    let found = 0;
    for (const country of BANKING) {
      for (const bank of country.banks) {
        const card = cards[bank.id];
        if (!card) continue;
        found += 1;
        expect(card.source, bank.id).toBeTruthy();
        if ('none' in card) continue;
        expect(card.name.length, bank.id).toBeGreaterThan(2);
        expect(['revolving', 'charge'], bank.id).toContain(card.kind);
        for (const r of [card.apr, card.aprFrom, card.aprTo]) if (r !== undefined) expect(r > 0 && r < 3, `${bank.id} ${r}`).toBe(true);
        if (card.aprFrom !== undefined) expect(card.aprFrom, bank.id).toBeLessThanOrEqual(card.aprTo!);
        expect(card.asOf, bank.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
    expect(found).toBeGreaterThanOrEqual(55);
  });

  it('holds every country cap as a yearly fraction, under three', () => {
    for (const [iso, rule] of Object.entries(laws)) {
      if (rule.aprCap !== undefined) expect(rule.aprCap > 0 && rule.aprCap < 3, `${iso} ${rule.aprCap}`).toBe(true);
      expect(rule.law, iso).toBeTruthy();
    }
  });
});
