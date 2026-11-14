/**
 * The bank is a real bank where the character lives, and does what it does.
 *
 * Each claim in `systems/banking.ts` is held here against the figures the
 * tables carry (`content/banks-thirteen.ts`): the account names and numbers,
 * interest built by the day and paid in the bank's months, the tax a country
 * has the bank take, the fee and each way it is waived, a bonus and what
 * earns it, and money moved between accounts. And a save from before the
 * banks, at "Northbank", moves to a real one with its money intact.
 */

import { describe, expect, it } from 'vitest';
import { loadSave, quickSave } from '../../src/engine/bankworld';
import type { Simulation } from '../../src/engine/bankworld/core/simulation';
import type { Account } from '../../src/engine/bankworld/core/ledger';
import { MS_DAY, instantFromZoned } from '../../src/engine/bankworld/core/time';
import { deserialise, serialise } from '../../src/engine/bankworld/persistence/adapter';
import { abaValid, clabeCheck, ibanValid, kennitalaValid } from '../../src/engine/bankworld/core/banknumbers';
import { BANKING, bankById } from '../../src/engine/bankworld/content/banks';
import { accountNumber } from '../../src/engine/bankworld/systems/banknumber';
import {
  bankAccountsOf, bankOf, earningBalance, feeFor, interestTaxFor, interestTaxOn, monthStartOf, rateOn,
} from '../../src/engine/bankworld/systems/banking';

const lifeIn = (cityId: string, extra: Record<string, unknown> = {}, seed = 'bank') =>
  quickSave({ startLocationId: cityId, homeRegionId: cityId, livesWhereBorn: true, ...extra }, seed);

const current = (sim: Simulation) => sim.universe.accounts[sim.player.primaryAccountId!]!;
const savings = (sim: Simulation) => bankAccountsOf(sim, sim.player).find((a) => a.kind === 'savings');

/** Sets an account's balance by posting the difference, the way money arrives. */
function holding(sim: Simulation, account: Account, amount: number): void {
  const diff = amount - account.balance;
  if (diff === 0) return;
  sim.post({
    memo: 'Test', category: 'test',
    postings: [{ accountId: account.id, amount: diff }, { accountId: sim.nominalAccount('equity', 'Test').id, amount: -diff }],
  });
  account.lowest = amount;
  account.monthOpen = amount;
}

/** The interest postings into an account. */
const interestPaid = (sim: Simulation, account: Account) => sim.universe.transactions
  .filter((t) => t.category === 'interest')
  .flatMap((t) => t.postings.filter((p) => p.accountId === account.id).map((p) => p.amount))
  .reduce((a, b) => a + b, 0);

describe('the bank a life starts with', () => {
  it('is a real bank of the country, under its own account names', () => {
    const sim = lifeIn('is-39-mosfellsbr', { wealth: 'modest' });
    expect(bankOf(sim, sim.player)?.name).toBe('Landsbankinn');
    expect(current(sim).name).toBe('Einkareikningur');
    expect(savings(sim)?.name).toBe('Vaxtareikningur');
    expect(Object.values(sim.universe.accounts).some((a) => a.institution === 'Northbank')).toBe(false);
  });

  it('is the one chosen at creation, where it is the country’s', () => {
    const sim = lifeIn('is-39-mosfellsbr', { bankId: 'is-arion' });
    expect(bankOf(sim, sim.player)?.name).toBe('Arion banki');
    expect(current(sim).name).toBe('Veltureikningur');
  });

  it('numbers the account the country’s way, and the check digits hold', () => {
    const sim = lifeIn('is-39-mosfellsbr');
    const number = current(sim).number!.replace(/^IBAN /, '');
    expect(ibanValid(number)).toBe(true);
    // An Icelandic IBAN ends in the holder's kennitala, born 14 June 2001.
    const kt = number.replace(/\s/g, '').slice(-10);
    expect(kennitalaValid(kt)).toBe(true);
    expect(kt.startsWith('140601')).toBe(true);
    expect(number.replace(/\s/g, '').slice(4, 6)).toBe('01');
  });

  it('gives every bank of the thirteen a number that checks the way its country checks', () => {
    const sim = quickSave({}, 'numbers');
    for (const country of BANKING) {
      for (const bank of country.banks) {
        const one = accountNumber(sim, sim.player, bank, 'checking');
        const saved = accountNumber(sim, sim.player, bank, 'savings');
        if (one.startsWith('IBAN ')) expect(ibanValid(one.slice(5)), `${bank.id} ${one}`).toBe(true);
        if (bank.format === 'us') expect(abaValid(bank.code), bank.id).toBe(true);
        if (bank.format === 'mx') {
          const clabe = one.replace('CLABE ', '');
          expect(clabe).toHaveLength(18);
          expect(clabe.startsWith(bank.code)).toBe(true);
          expect(clabeCheck(clabe.slice(0, 17))).toBe(clabe[17]);
        }
        if (bank.format === 'nz') {
          expect(one.endsWith('-00'), bank.id).toBe(true);
          expect(saved.endsWith('-30'), bank.id).toBe(true);
        }
        if (bank.format === 'kr') expect(one.replace('Account ', '').split('-').map((g) => g.length)).toEqual([...bank.groups!]);
      }
    }
  });

  it('keeps every country in the world that has a bank, by name', () => {
    expect(bankById('nl-ing')?.name).toBe('ING');
    expect(bankById('br-itau-unibanco')?.currency).toBe('BRL');
    expect(bankById('za-capitec')?.name).toBe('Capitec');
  });
});

describe('interest', () => {
  it('builds by the day on what the account holds and is paid at the month’s end, less the tax', () => {
    // Vaxtareikningur at 5.79%, 1,000,000 kr all of February 2026, and
    // Iceland's 22% taken by the bank.
    const sim = lifeIn('is-39-mosfellsbr', { wealth: 'modest' });
    const saver = savings(sim)!;
    const zone = sim.homeZone;
    sim.advanceTo(instantFromZoned({ year: 2026, month: 2, day: 1, hour: 0 }, zone) - 1);
    const paidBefore = interestPaid(sim, saver);
    holding(sim, saver, 1_000_000_00);
    saver.accrued = 0;
    sim.advanceTo(instantFromZoned({ year: 2026, month: 3, day: 1, hour: 1 }, zone));
    const gross = Math.floor((1_000_000_00 * 0.0579 * 28) / 365);
    const net = interestPaid(sim, saver) - paidBefore;
    expect(net).toBe(gross - Math.round(gross * 0.22));
  });

  it('is paid only in the bank’s months: February and August in Japan', () => {
    const sim = lifeIn('jp-13-tokyo', { wealth: 'modest' });
    const account = current(sim);
    holding(sim, account, 5_000_000_00);
    sim.advanceBy(50 * MS_DAY);
    // January and the first days of February: built up, not paid.
    expect(interestPaid(sim, account)).toBe(0);
    expect(account.accrued ?? 0).toBeGreaterThan(0);
    sim.advanceBy(10 * MS_DAY);
    expect(interestPaid(sim, account)).toBeGreaterThan(0);
  });

  it('follows a change the bank announced, from its day', () => {
    const product = bankById('jp-mufg')!.current;
    expect(rateOn(product, Date.UTC(2026, 9, 1), 'Asia/Tokyo')).toBe(0.004);
    expect(rateOn(product, Date.UTC(2026, 10, 3), 'Asia/Tokyo')).toBe(0.005);
  });

  it('is paid only above a floor, and only up to a cap', () => {
    // TD ePremium pays on $10,000 or more; Bankinter's Cuenta Nómina on up to €10,000.
    const td = bankById('ca-td')!.savings;
    const bankinter = bankById('es-bankinter')!.current;
    expect(earningBalance(td, 9_999_99)).toBe(0);
    expect(earningBalance(td, 12_000_00)).toBe(12_000_00);
    expect(earningBalance(bankinter, 4_000_00)).toBe(4_000_00);
    expect(earningBalance(bankinter, 50_000_00)).toBe(10_000_00);
  });

  it('takes Germany’s tax only past the year’s €1,000 allowance', () => {
    const sim = lifeIn('de-be-berlin', { wealth: 'modest' });
    const account = current(sim);
    expect(bankOf(sim, sim.player)?.iso).toBe('DE');
    expect(interestTaxFor(sim, account, 900_00)).toBe(0);
    expect(interestTaxFor(sim, account, 1_200_00)).toBe(Math.round(200_00 * 0.26375));
  });

  it('takes New Zealand’s by the saver’s income, and France’s not at all on a Livret A', () => {
    // The income is the wages paid in over the last year. It was the day
    // job's rate times its week until the job engine went on 2026-09-26.
    const nz = lifeIn('nz-akl-auckland', { wealth: 'modest' });
    expect(interestTaxOn(nz, current(nz))).toBe(0.105);
    nz.post({
      memo: 'Wages', category: 'salary',
      postings: [{ accountId: current(nz).id, amount: 60_000_00 }, { accountId: nz.nominalAccount('income', 'Wages').id, amount: -60_000_00 }],
    });
    expect(interestTaxOn(nz, current(nz))).toBe(0.30);
    // A year on, those wages are last year's.
    nz.advanceBy(366 * MS_DAY);
    expect(interestTaxOn(nz, current(nz))).toBe(0.105);
    const fr = lifeIn('fr-idf-paris', { wealth: 'modest' });
    expect(savings(fr)?.name).toBe('Livret A');
    expect(interestTaxOn(fr, savings(fr)!)).toBe(0);
    expect(interestTaxOn(fr, current(fr))).toBe(0.314);
  });

  it('adds a bonus only in a month that earns it', () => {
    // Westpac Life: 0.10%, and 4.90% more in a month the balance grows.
    const grew = lifeIn('au-nsw-sydney', { wealth: 'modest', bankId: 'au-westpac' }, 'grew');
    const held = lifeIn('au-nsw-sydney', { wealth: 'modest', bankId: 'au-westpac' }, 'held');
    for (const sim of [grew, held]) {
      const saver = savings(sim)!;
      holding(sim, saver, 20_000_00);
      saver.accrued = 0;
    }
    // One of them puts a dollar in during the month.
    const saver = savings(grew)!;
    grew.advanceBy(3 * MS_DAY);
    grew.post({
      memo: 'Test', category: 'test',
      postings: [{ accountId: saver.id, amount: 1_00 }, { accountId: grew.nominalAccount('equity', 'Test').id, amount: -1_00 }],
    });
    grew.advanceBy(30 * MS_DAY);
    held.advanceBy(33 * MS_DAY);
    expect(interestPaid(grew, savings(grew)!)).toBeGreaterThan(interestPaid(held, savings(held)!) * 10);
  });
});

describe('the monthly fee', () => {
  it('is Chase’s $15 on a month with no deposits and too little in it', () => {
    const sim = lifeIn('us-ny-newyork', { wealth: 'scraping', bankId: 'us-chase', birthYear: 1990 });
    const account = current(sim);
    expect(account.name).toBe('Chase Total Checking');
    holding(sim, account, 1_000_00);
    expect(feeFor(sim, account, monthStartOf(sim, sim.now)).fee).toBe(15_00);
    const before = account.balance;
    sim.advanceBy(28 * MS_DAY);
    // The monthly fee only: a life with no wages in New York soon overdraws, and Chase charges for that too.
    const fees = sim.universe.transactions.filter((t) => t.category === 'bank_fee' && t.memo.startsWith('Monthly fee')).flatMap((t) => t.postings).filter((p) => p.accountId === account.id);
    expect(fees.map((p) => p.amount)).toEqual([-15_00]);
    expect(account.balance).toBeLessThan(before);
  });

  it('is waived by a balance kept above the line all month', () => {
    const sim = lifeIn('us-ny-newyork', { wealth: 'scraping', bankId: 'us-chase', birthYear: 1990 });
    const account = current(sim);
    holding(sim, account, 2_000_00);
    expect(feeFor(sim, account, monthStartOf(sim, sim.now))).toEqual({ fee: 0, waivedBy: 'balance' });
    // A day under $1,500 is enough to lose it.
    account.lowest = 1_400_00;
    expect(feeFor(sim, account, monthStartOf(sim, sim.now)).fee).toBe(15_00);
  });

  it('is waived by wages paid in, and by age where the bank waives it for the young', () => {
    const sim = lifeIn('us-ny-newyork', { wealth: 'scraping', bankId: 'us-chase', birthYear: 1990 });
    const account = current(sim);
    holding(sim, account, 100_00);
    const start = monthStartOf(sim, sim.now);
    const wages = (amount: number) => sim.post({
      memo: 'Wages', category: 'salary',
      postings: [{ accountId: account.id, amount }, { accountId: sim.nominalAccount('income', 'Wages').id, amount: -amount }],
    });
    // $499 by direct deposit isn't enough; $500 is.
    wages(499_00);
    expect(feeFor(sim, account, start).fee).toBe(15_00);
    wages(1_00);
    expect(feeFor(sim, account, start)).toEqual({ fee: 0, waivedBy: 'deposits' });
    const young = lifeIn('us-ny-newyork', { wealth: 'scraping', bankId: 'us-wells-fargo', birthYear: 2004 });
    holding(young, current(young), 10_00);
    expect(feeFor(young, current(young), monthStartOf(young, young.now))).toEqual({ fee: 0, waivedBy: 'age' });
  });

  it('is lowered, not waived, where the bank only lowers it', () => {
    const sim = lifeIn('de-be-berlin', { wealth: 'scraping', bankId: 'de-postbank' });
    const account = current(sim);
    expect(feeFor(sim, account, monthStartOf(sim, sim.now)).fee).toBe(6_90);
    sim.post({
      memo: 'Wages', category: 'salary',
      postings: [{ accountId: account.id, amount: 1_200_00 }, { accountId: sim.nominalAccount('income', 'Wages').id, amount: -1_200_00 }],
    });
    expect(feeFor(sim, account, monthStartOf(sim, sim.now))).toEqual({ fee: 5_90, waivedBy: 'deposits' });
  });
});

describe('moving money', () => {
  it('moves between one’s own accounts, and no further than there is', () => {
    const sim = lifeIn('is-39-mosfellsbr', { wealth: 'modest' });
    const from = current(sim);
    const to = savings(sim)!;
    const [a, b] = [from.balance, to.balance];
    expect(sim.execute({ kind: 'bank.transfer', payload: { fromId: from.id, toId: to.id, amount: 10_000_00 } }).ok).toBe(true);
    expect(from.balance).toBe(a - 10_000_00);
    expect(to.balance).toBe(b + 10_000_00);
    expect(sim.execute({ kind: 'bank.transfer', payload: { fromId: from.id, toId: to.id, amount: from.balance + 1 } }).ok).toBe(false);
    expect(sim.execute({ kind: 'bank.transfer', payload: { fromId: from.id, toId: from.id, amount: 1 } }).ok).toBe(false);
  });

  it('closes a savings account into the current account, with what it earned, and opens another', () => {
    const sim = lifeIn('is-39-mosfellsbr', { wealth: 'modest' });
    const saver = savings(sim)!;
    saver.accrued = 12_345;
    const total = current(sim).balance + saver.balance;
    expect(sim.execute({ kind: 'bank.close_savings', payload: { accountId: saver.id } }).ok).toBe(true);
    expect(saver.closedAt).toBeDefined();
    expect(saver.balance).toBe(0);
    // 12,345 hundredths earned, less Iceland's 22%.
    const tax = Math.round(12_345 * 0.22);
    expect(current(sim).balance).toBe(total + 12_345 - tax);
    expect(sim.execute({ kind: 'bank.open_savings', payload: {} }).ok).toBe(true);
    expect(savings(sim)?.name).toBe('Vaxtareikningur');
    expect(sim.execute({ kind: 'bank.open_savings', payload: {} }).ok).toBe(false);
  });
});

describe('a save from before the banks', () => {
  // Not ported: 1221's own old-save migrations aren't ported: no SLATE save was ever a 1221 save.
  it.skip('moves from Northbank to the country’s bank with every balance as it was', () => {
    const sim = lifeIn('is-39-mosfellsbr', { wealth: 'modest' });
    const balances = Object.values(sim.universe.accounts).map((a) => [a.id, a.balance]);
    for (const account of Object.values(sim.universe.accounts)) {
      if (account.ownerId !== sim.player.id || account.nominal) continue;
      if (account.kind === 'checking' || account.kind === 'savings' || account.kind === 'credit_card') {
        account.institution = 'Northbank';
        delete account.bankId;
        delete account.number;
        account.name = 'Everyday Checking';
      }
    }
    const back = loadSave(deserialise(serialise(sim.universe)) as never);
    const accounts = Object.values(back.universe.accounts);
    expect(accounts.some((a) => a.institution === 'Northbank')).toBe(false);
    expect(back.universe.accounts[back.player.primaryAccountId!]!.name).toBe('Einkareikningur');
    expect(accounts.map((a) => [a.id, a.balance])).toEqual(balances);
  });
});
