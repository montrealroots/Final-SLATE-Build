// Banks through their lifecycle (src/engine/banking.ts; the owner's v8 package, 03 "Bank lifecycle"; A09, A10). Each case
// changes an input (where you live, a company, money in, the days that pass) and reads the journal.
import { describe, expect, it } from 'vitest';
import { DAY, processUntil } from './engine-api';
import { PRODUCTS, applyForAccount, applyRefusal, closeAccount, closeRefusal, feeText, productById, productsOpenTo, transferBetween, transferRefusal } from '../src/engine/banking';
import { available, pendingIn, posted } from '../src/engine/cash/journal';
import { formCompany } from '../src/engine/company';
import { PERSONAL_CASH } from '../src/engine/personal';
import { localParts } from '../src/engine/time';
import { schedule } from '../src/engine/state';
import { deserialize, serialize } from '../src/engine/save';
import type { GameState } from '../src/engine/types';
import { startLife } from './helpers';

// Wednesday 26 January 2028: three business days on is Monday 31 January, so the fee is anchored on a month's last day.
const life = (tag: string) => startLife(tag, 'us-los-angeles', { startDate: '2028-01-26', startTime: '09:00' });
const until = (s: GameState, key: string) => {
  for (let i = 0; i < 800; i++) {
    const p = localParts(s.now, 'America/Los_Angeles');
    if (`${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}` >= key && p.hour >= 12) return;
    processUntil(s, s.now + DAY / 4, 'advance', 1_000_000);
  }
  throw new Error(`never reached ${key}`);
};
const fees = (s: GameState, id: string) => s.journal!.txs.filter((t) => t.kind === 'bank-fee' && t.lines.some((l) => l.account === id)).map((t) => [t.key, -t.lines.find((l) => l.account === id)!.minor]);

describe('A10: what is offered, and what a fee nobody recorded reads as', () => {
  it('offers personal accounts where you live, business ones only with a company, and never another market\'s', () => {
    const s = life('bank-offer');
    const open = productsOpenTo(s);
    expect(open.map((p) => p.id)).toContain('us-0');
    expect(open.every((p) => p.market === 'US' && p.holder === 'personal')).toBe(true);
    expect(applyRefusal(s, 'us-chase-business-complete')).toBe('Business Complete Checking is a business account: it needs a company to hold it.');
    expect(applyRefusal(s, 'gb-0')).toBe('Barclays opens this account for people who live in GB; you live in US.');
    formCompany(s, 'Derrick Lane Pictures', 0);
    expect(productsOpenTo(s).map((p) => p.id)).toEqual(expect.arrayContaining(['us-chase-business-complete', 'us-wise-business']));
  });

  it('says a fee is unknown when the record has none, and "no account fee" only when the record says so', () => {
    expect(feeText(productById('jp-0')!)).toBe('Account fee not recorded');
    expect(feeText(productById('gb-0')!)).toBe('No account fee');
    expect(feeText(productById('us-0')!)).toBe('$15 a month, waived on conditions');
    // Every product's evidence is one of the four, and every imported one names its source.
    expect(new Set(PRODUCTS.map((p) => p.evidence))).toEqual(new Set(['simulation', 'legacy-unreverified', 'reported', 'primary-observed']));
    expect(PRODUCTS.filter((p) => p.evidence !== 'simulation').every((p) => p.source.length > 0)).toBe(true);
  });
});

describe('an account from application to closing', () => {
  it('is pending until the bank decides, three business days on', () => {
    const s = life('bank-apply');
    const a = applyForAccount(s, 'us-0');
    expect(a.state).toBe('pending');
    expect(applyRefusal(s, 'us-0')).toBe('You already hold or have applied for Chase Total Checking.');
    expect(transferRefusal(s, PERSONAL_CASH, a.id, 100)).toBe('Both accounts must be open.');
    until(s, '2028-01-31');
    expect([a.state, a.bank!.anchor]).toEqual(['open', '2028-01-31']);
  });

  it('turns you down if you no longer live in its market when it decides', () => {
    const s = life('bank-moved');
    const a = applyForAccount(s, 'us-0');
    s.character.livesIn = 'gb-london'; // labelled fixture: moved before the decision
    until(s, '2028-01-31');
    expect([a.state, a.bank!.reason]).toEqual(['closed', 'You no longer live in US.']);
  });

  it('moves money on its way: held at the sender, not yet spendable at either end, settled the next business day', () => {
    const s = life('bank-move');
    const a = applyForAccount(s, 'us-0');
    until(s, '2028-01-31');
    const before = available(s, PERSONAL_CASH);
    const tx = transferBetween(s, 'm1', PERSONAL_CASH, a.id, 10_000);
    expect(transferBetween(s, 'm1', PERSONAL_CASH, a.id, 10_000)).toBe(tx); // the same command twice moves it once
    expect([available(s, PERSONAL_CASH), posted(s, PERSONAL_CASH)]).toEqual([before - 10_000, before]);
    expect([available(s, a.id), pendingIn(s, a.id)]).toEqual([0, 10_000]);
    until(s, '2028-02-01');
    expect([available(s, PERSONAL_CASH), available(s, a.id), pendingIn(s, a.id)]).toEqual([before - 10_000, 10_000, 0]);
  });

  it('A09: charges the fee on the anchored day, the last of a leap February, once per period, and through a reload', () => {
    const s = life('bank-fee');
    const a = applyForAccount(s, 'us-0');
    until(s, '2028-01-31');
    transferBetween(s, 'm1', PERSONAL_CASH, a.id, 10_000); // $100: under every waiver Chase records
    until(s, '2028-02-29');
    expect(fees(s, a.id)).toEqual([['bankfee:bank:1:2028-02', 1_500]]);
    // The same period delivered again (labelled fixture) charges nothing more.
    schedule(s, s.now + 1, 'bank-fee', { account: a.id, period: 1 });
    processUntil(s, s.now + 2, 'tick', 1000);
    const back = deserialize(serialize(s));
    until(back, '2028-03-31');
    expect(fees(back, a.id)).toEqual([['bankfee:bank:1:2028-02', 1_500], ['bankfee:bank:1:2028-03', 1_500]]);
    expect(posted(back, a.id)).toBe(10_000 - 3_000);
  });

  it('waives the fee when the account meets a condition its record gives, read from its own lines', () => {
    const s = life('bank-waive');
    const a = applyForAccount(s, 'us-0');
    until(s, '2028-01-31');
    transferBetween(s, 'm1', PERSONAL_CASH, a.id, 200_000); // $2,000: $500 paid in, and over $1,500 every day after
    until(s, '2028-02-29');
    expect(fees(s, a.id)).toEqual([]);
    expect(s.log.some((l) => /waived Chase Total Checking's fee for the period to 2028-02-29: \$500 or more paid in\./.test(l.text))).toBe(true);
  });

  it('closes only when nothing would be stranded', () => {
    const s = life('bank-close');
    const a = applyForAccount(s, 'us-0');
    until(s, '2028-01-31');
    transferBetween(s, 'in', PERSONAL_CASH, a.id, 5_000);
    expect(closeRefusal(s, a.id)).toBe('Money is held or on its way: wait until it settles.');
    until(s, '2028-02-01');
    expect(closeRefusal(s, a.id)).toBe('Move the $50 in it out first.');
    // Out to another bank: Chase's recorded $25 domestic transfer fee is charged, so $25 of the $50 can leave.
    expect(transferRefusal(s, a.id, PERSONAL_CASH, 5_000)).toBe('Chase, Chase Total Checking has $50 available.');
    transferBetween(s, 'out', a.id, PERSONAL_CASH, 2_500);
    until(s, '2028-02-02');
    expect(s.journal!.txs.find((t) => t.key === 'transfer:out')!.lines.filter((l) => l.account === a.id).map((l) => l.minor)).toEqual([-2_500, -2_500]);
    closeAccount(s, a.id);
    expect(a.state).toBe('closed');
    expect(s.events.some((e) => e.kind === 'bank-fee' && e.payload.account === a.id)).toBe(false);
    expect(closeRefusal(s, PERSONAL_CASH)).toBe('This is the account your money moves through in the game; it stays open.');
  });
});
