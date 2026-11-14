// @ts-nocheck: 1221's test, ported (docs/v9/PARITY.md). Its skipped cases name 1221 fields and exports SLATE doesn't carry.
/**
 * The rest of what a bank charges and gives back, each as its bank does it.
 *
 * France's €8 an operation, €80 a month at most, past zero or past an
 * arranged limit; Spain's descubierto, with its interest and its commission
 * on the month's deepest point; Canada's $10 for a debit returned unpaid,
 * spared on a card purchase, a small one and a second within two business
 * days; Arion's debit card fees and its age exemption; MUFG's fee on an
 * account unused for two years; Santander México's fee for a quiet month;
 * introductory rates that step down; and Iceland's refund of the tax on the
 * first 300,000 kr of interest.
 */

import { describe, expect, it } from 'vitest';
import { quickSave } from '../../src/engine/bankworld';
import type { Simulation } from '../../src/engine/bankworld/core/simulation';
import type { Account } from '../../src/engine/bankworld/core/ledger';
import { MS_DAY, instantFromZoned } from '../../src/engine/bankworld/core/time';
import { spend } from '../../src/engine/bankworld/systems/spending';
import { bankAccountsOf, feeFor, inSaveMoney, monthStartOf, rateOf } from '../../src/engine/bankworld/systems/banking';
import { bankById, banksIn } from '../../src/engine/bankworld/content/banks';
import { WORLD_FEES } from '../../src/engine/bankworld/content/banks-world-fees';
import { SHEETS } from '../../src/engine/bankworld/content/banks-world-sheets';
import { IBAN_CODES } from '../../src/engine/bankworld/content/banks-world-iban';
import { accountNumber } from '../../src/engine/bankworld/systems/banknumber';
import { ibanValid, withNationalCheck } from '../../src/engine/bankworld/core/banknumbers';

const lifeIn = (cityId: string, extra: Record<string, unknown> = {}, seed = 'fees') =>
  quickSave({ startLocationId: cityId, homeRegionId: cityId, livesWhereBorn: true, ...extra }, seed);
const current = (sim: Simulation) => sim.universe.accounts[sim.player.primaryAccountId!]!;
const savings = (sim: Simulation) => bankAccountsOf(sim, sim.player).find((a) => a.kind === 'savings');
function set(sim: Simulation, account: Account | undefined, amount: number): void {
  if (!account) return;
  const diff = amount - account.balance;
  if (diff !== 0) sim.post({ memo: 'Test', category: 'test', postings: [{ accountId: account.id, amount: diff }, { accountId: sim.nominalAccount('equity', 'Test').id, amount: -diff }] });
}
const charged = (sim: Simulation, account: Account, memo: string) => sim.universe.transactions
  .filter((t) => t.memo === memo).flatMap((t) => t.postings).filter((p) => p.accountId === account.id).map((p) => p.amount);
/**
 * The day's groceries bought off a full EBT card, so nothing the test doesn't buy comes from the bank, and what it
 * buys still goes on the debit card, and nothing else is paid. It was no home (`home = undefined`), which bought no food, until the home
 * went in the scope reset of 2026-10-09 and every life bought its day's food.
 */
const noSpending = (sim: Simulation) => {
  const ebt = sim.openAccount({ id: sim.nextId('account'), kind: 'escrow', category: 'ebt', name: 'Groceries For The Tests', ownerId: sim.player.id, institution: 'Tests', openedAt: sim.now });
  sim.post({ memo: 'Groceries for the tests', category: 'opening', postings: [{ accountId: ebt.id, amount: 10_000_000_00 }, { accountId: sim.nominalAccount('income', 'Gift').id, amount: -10_000_000_00 }] });
  sim.player.assistance = { scheme: 'snap', since: sim.now, months: 0, ebtAccountId: ebt.id, closedAt: sim.now };
  // And no care to pay for: every life has had its health armed since 2026-10-09, where a life begun outside the
  // school had none before the career began.
  for (const item of sim.universe.scheduled) if (item.status === 'pending' && item.kind.startsWith('health.')) sim.timeline.cancel(item.id, sim.now);
};

describe('France', () => {
  it('charges €8 an operation past zero, and no more than €80 a month', () => {
    const sim = lifeIn('fr-idf-paris', { bankId: 'fr-bnp-paribas' });
    set(sim, current(sim), 0);
    set(sim, savings(sim), 0);
    for (let i = 0; i < 12; i += 1) spend(sim, sim.player, 5_00, 'Test', 'bills');
    expect(charged(sim, current(sim), 'Overdraft fee')).toEqual(new Array(10).fill(-8_00));
  });

  it('charges it past an arranged limit, and not inside it', () => {
    const sim = lifeIn('fr-idf-paris', { bankId: 'fr-societe-generale' });
    sim.post({ memo: 'Wages', category: 'salary', postings: [{ accountId: current(sim).id, amount: 2_000_00 }, { accountId: sim.nominalAccount('income', 'Wages').id, amount: -2_000_00 }] });
    sim.must({ kind: 'bank.arrange_overdraft', payload: { limit: 500_00 } });
    set(sim, current(sim), 0);
    set(sim, savings(sim), 0);
    spend(sim, sim.player, 400_00, 'Test', 'bills');
    expect(charged(sim, current(sim), 'Overdraft fee')).toEqual([]);
    spend(sim, sim.player, 200_00, 'Test', 'bills');
    expect(charged(sim, current(sim), 'Overdraft fee')).toEqual([-8_00]);
  });
});

describe('Spain’s descubierto', () => {
  // What the law lets the month cost: 8.125% a year on the overdrawn
  // balances, day by day, the first's midnight included.
  const lawAllows = (daySum: number) => Math.floor((daySum * 0.08125) / 365);
  const monthCost = (sim: Simulation, account: Account) => -[...charged(sim, account, 'Overdraft interest'), ...charged(sim, account, 'Overdraft commission')]
    .reduce((a, b) => a + b, 0);

  it('takes interest and a commission on the month’s deepest point, no more together than the law allows', () => {
    const sim = lifeIn('es-md-madrid', { bankId: 'es-santander' });
    noSpending(sim);
    set(sim, savings(sim), 0);
    const account = current(sim);
    set(sim, account, 0);
    sim.advanceTo(instantFromZoned({ year: 2026, month: 1, day: 20, hour: 12 }, sim.homeZone));
    spend(sim, sim.player, 400_00, 'Test', 'bills');
    set(sim, account, -100_00);
    sim.advanceTo(instantFromZoned({ year: 2026, month: 1, day: 31, hour: 23 }, sim.homeZone));
    const allowed = lawAllows((account.odDaySum ?? 0) + 100_00);
    sim.advanceTo(instantFromZoned({ year: 2026, month: 2, day: 1, hour: 6 }, sim.homeZone));
    // 5% of €400 is €20, far past what twelve days of €100 may cost; the
    // commission is what the cap leaves after the interest.
    expect(charged(sim, account, 'Overdraft interest').length).toBe(1);
    expect(charged(sim, account, 'Overdraft commission').length).toBe(1);
    expect(-charged(sim, account, 'Overdraft commission')[0]!).toBeLessThan(20_00);
    expect(monthCost(sim, account)).toBe(allowed);
    expect(account.odDaySum).toBe(0);
  });

  it('cuts the commission to what the cap leaves, even under its €15 floor', () => {
    const sim = lifeIn('es-md-madrid', { bankId: 'es-santander' });
    noSpending(sim);
    set(sim, savings(sim), 0);
    const account = current(sim);
    set(sim, account, 0);
    sim.advanceTo(instantFromZoned({ year: 2026, month: 1, day: 6, hour: 12 }, sim.homeZone));
    spend(sim, sim.player, 300_00, 'Test', 'bills');
    // Most of a month overdrawn by €40,000 lets it cost about €230, and the
    // interest (7.83%) leaves about €8 of that: under the floor, and all it charges.
    set(sim, account, -40_000_00);
    sim.advanceTo(instantFromZoned({ year: 2026, month: 1, day: 31, hour: 23 }, sim.homeZone));
    const allowed = lawAllows((account.odDaySum ?? 0) + 40_000_00);
    sim.advanceTo(instantFromZoned({ year: 2026, month: 2, day: 1, hour: 6 }, sim.homeZone));
    expect(monthCost(sim, account)).toBe(allowed);
    expect(-charged(sim, account, 'Overdraft commission')[0]!).toBeLessThan(15_00);
  });
});

describe('Canada’s returned payment', () => {
  it('is $10 on a bill the bank can’t pay, not on a card purchase, and not twice within two business days', () => {
    const sim = lifeIn('ca-on-toronto', { bankId: 'ca-td' });
    set(sim, current(sim), 0);
    set(sim, savings(sim), 0);
    spend(sim, sim.player, 50_00, 'Groceries', 'food');
    expect(charged(sim, current(sim), 'Returned payment fee')).toEqual([]);
    spend(sim, sim.player, 5_00, 'Bills', 'bills', true);
    expect(charged(sim, current(sim), 'Returned payment fee')).toEqual([]);
    spend(sim, sim.player, 50_00, 'Bills', 'bills', true);
    spend(sim, sim.player, 50_00, 'Bills', 'bills', true);
    expect(charged(sim, current(sim), 'Returned payment fee')).toEqual([-10_00]);
    sim.advanceBy(4 * MS_DAY);
    spend(sim, sim.player, 50_00, 'Bills', 'bills', true);
    expect(charged(sim, current(sim), 'Returned payment fee')).toEqual([-10_00, -10_00]);
  });
});

describe('Arion’s debit card', () => {
  it('costs 19 kr a purchase and 950 kr a year, and nothing at 23', () => {
    const sim = lifeIn('is-39-mosfellsbr', { bankId: 'is-arion', birthYear: 1990 });
    spend(sim, sim.player, 1_000_00, 'Groceries', 'food');
    expect(charged(sim, current(sim), 'Debit card purchase fee')).toEqual([-19_00]);
    // A year of living on no wages: enough in the account that the bank never closes it.
    set(sim, current(sim), 20_000_000_00);
    sim.advanceBy(366 * MS_DAY);
    // Two card years begun in the 366 days, each paid ahead: on the account's first night and on that date a year on
    // (`ARION_CARD_YEAR`, SLATE's simulation, from brief 10, 2026-10-16). Until then the first came a year after opening,
    // and this asserted one, [-950_00].
    expect(charged(sim, current(sim), 'Debit card yearly fee')).toEqual([-950_00, -950_00]);
    const young = lifeIn('is-39-mosfellsbr', { bankId: 'is-arion', birthYear: 2004 });
    spend(young, young.player, 1_000_00, 'Groceries', 'food');
    expect(charged(young, current(young), 'Debit card purchase fee')).toEqual([]);
  });
});

describe('a dormant account', () => {
  it('costs ¥1,320 a year at MUFG once two years pass without use', () => {
    const sim = lifeIn('jp-13-tokyo', { bankId: 'jp-mufg', wealth: 'modest' });
    const saver = savings(sim)!;
    // Enough in the current account that living never draws on savings.
    set(sim, current(sim), 100_000_000_00);
    sim.advanceBy(700 * MS_DAY);
    expect(charged(sim, saver, 'Dormant account fee')).toEqual([]);
    sim.advanceBy(60 * MS_DAY);
    expect(charged(sim, saver, 'Dormant account fee')).toEqual([-1_320_00]);
    // The current account, used every day, is never charged.
    expect(charged(sim, current(sim), 'Dormant account fee')).toEqual([]);
  });
});

describe('Santander México’s quiet month', () => {
  it('is charged for a month with under two transactions, and not for one with wages', () => {
    const sim = lifeIn('mx-cmx-mexicocity', { bankId: 'mx-santander' });
    noSpending(sim);
    sim.advanceTo(instantFromZoned({ year: 2026, month: 3, day: 1, hour: 6 }, sim.homeZone));
    expect(charged(sim, current(sim), 'Quiet month fee').length).toBeGreaterThanOrEqual(1);
    const before = charged(sim, current(sim), 'Quiet month fee').length;
    sim.post({ memo: 'Wages', category: 'salary', postings: [{ accountId: current(sim).id, amount: 5_000_00 }, { accountId: sim.nominalAccount('income', 'Wages').id, amount: -5_000_00 }] });
    sim.advanceTo(instantFromZoned({ year: 2026, month: 4, day: 1, hour: 6 }, sim.homeZone));
    expect(charged(sim, current(sim), 'Quiet month fee').length).toBe(before);
  });
});

describe('an introductory rate', () => {
  it('steps down: CommBank’s 5.20% for five months, then 2.10%', () => {
    const sim = lifeIn('au-nsw-sydney', { bankId: 'au-commbank', wealth: 'modest' });
    const saver = savings(sim)!;
    expect(rateOf(sim, saver)).toBe(0.052);
    sim.advanceBy(160 * MS_DAY);
    expect(rateOf(sim, saver)).toBe(0.021);
  });

  it('and Bankinter’s 5% for a year, 2% for the next, then none on record', () => {
    const sim = lifeIn('es-md-madrid', { bankId: 'es-bankinter' });
    const account = current(sim);
    expect(rateOf(sim, account)).toBe(0.05);
    sim.advanceBy(400 * MS_DAY);
    expect(rateOf(sim, account)).toBe(0.02);
    sim.advanceBy(370 * MS_DAY);
    expect(rateOf(sim, account)).toBe(0);
  });
});

describe('Iceland’s assessment', () => {
  it('gives back the tax on the first 300,000 kr of last year’s interest, on 1 June', () => {
    const sim = lifeIn('is-39-mosfellsbr', { bankId: 'is-landsbankinn', wealth: 'modest' });
    noSpending(sim);
    const account = current(sim);
    // 500,000 kr of interest in 2026, as the bank would have paid it.
    sim.post({ memo: 'Interest', category: 'interest', postings: [
      { accountId: account.id, amount: 390_000_00 }, { accountId: sim.nominalAccount('income', 'Interest').id, amount: -500_000_00 },
      { accountId: sim.nominalAccount('expense', 'Tax On Interest').id, amount: 110_000_00 },
    ] });
    sim.advanceTo(instantFromZoned({ year: 2027, month: 6, day: 1, hour: 6 }, sim.homeZone));
    const refunds = sim.universe.transactions.filter((t) => t.category === 'tax_refund')
      .flatMap((t) => t.postings).filter((p) => p.accountId === account.id).map((p) => p.amount);
    // Over 300,000 kr of interest, so the refund is 22% of 300,000 kr exactly.
    expect(refunds).toEqual([66_000_00]);
  });
});

describe('what the second research pass filled in', () => {
  it('pays CIBC’s eAdvantage 0.30%, and 0.60% on the whole of a balance from $100,000', () => {
    const sim = lifeIn('ca-on-toronto', { bankId: 'ca-cibc', wealth: 'modest' });
    const saver = savings(sim)!;
    set(sim, saver, 50_000_00);
    saver.accrued = 0;
    sim.advanceBy(MS_DAY);
    expect(saver.accrued).toBeCloseTo((50_000_00 * 0.003) / 365, 6);
    set(sim, saver, 150_000_00);
    saver.accrued = 0;
    sim.advanceBy(MS_DAY);
    expect(saver.accrued).toBeCloseTo((150_000_00 * 0.006) / 365, 6);
  });

  it('moves Santander UK’s Easy Access Saver to 0.90% after its first year', () => {
    const sim = lifeIn('uk-eng-london', { bankId: 'gb-santander', wealth: 'modest' });
    expect(rateOf(sim, savings(sim)!)).toBe(0.02);
    sim.advanceBy(370 * MS_DAY);
    expect(rateOf(sim, savings(sim)!)).toBe(0.009);
  });

  it('numbers an Icelandic savings account in its bank’s own ledger: 05 at Landsbankinn, 13 at Arion', () => {
    const ledger = (bankId: string) => {
      const sim = lifeIn('is-39-mosfellsbr', { bankId, wealth: 'modest' });
      const iban = savings(sim)!.number!.replace(/^IBAN |\s/g, '');
      return [iban.slice(8, 10), current(sim).number!.replace(/^IBAN |\s/g, '').slice(8, 10)];
    };
    expect(ledger('is-landsbankinn')).toEqual(['05', '26']);
    expect(ledger('is-arion')).toEqual(['13', '26']);
    expect(ledger('is-islandsbanki')).toEqual(['26', '26']);
  });
});

describe('the rest of the world’s banks', () => {
  it('carry the researched product names, rates and fees, and charge every fee whose waiver was words by a rule', () => {
    let named = 0;
    let stated = 0;
    for (const [iso, sheet] of Object.entries(SHEETS)) {
      for (const [name, found] of Object.entries(sheet.products ?? {})) {
        const bank = banksIn(iso).find((b) => b.name === name);
        expect(bank, `${iso} ${name}`).toBeDefined();
        if (found.current) {
          named += 1;
          expect(bank!.current.name).toBe(found.current.name);
          const rule = WORLD_FEES[`${iso}|${name}`];
          if (found.current.statedFee !== undefined) {
            // A fee the research gave with its waiver in words has a rule, and is charged.
            stated += 1;
            expect(rule, `${iso} ${name}`).toBeDefined();
            expect(bank!.current.monthlyFee).toBe(rule!.monthlyFee);
          } else {
            expect(rule, `${iso} ${name} has a rule for a fee it doesn't state`).toBeUndefined();
            expect(bank!.current.monthlyFee).toBe(found.current.monthlyFee || undefined);
          }
        }
        if (found.savings?.rate !== undefined) expect(bank!.savings.rate).toBe(found.savings.rate);
      }
    }
    expect(named).toBeGreaterThan(150);
    expect(stated).toBe(22);
    expect(Object.keys(WORLD_FEES).length).toBe(22);
    // Swedbank Latvia's Pamata package, free to 25, as its June 2026 price list says.
    expect(WORLD_FEES['LV|Swedbank']).toMatchObject({ monthlyFee: 1_70, waiver: { ageBelow: 26 } });
  });
});

describe('the waivers outside the thirteen', () => {
  // A Dublin life with its current account moved to a world bank: the fee
  // is the bank's, in the save's euros.
  const at = (bankId: string, birthYear: number) => {
    const sim = lifeIn('ie-lei-dublin', { bankId: 'ie-aib', birthYear, wealth: 'modest' });
    noSpending(sim);
    const account = current(sim);
    account.bankId = bankId;
    return { sim, account, fee: () => feeFor(sim, account, monthStartOf(sim, sim.now)), bank: bankById(bankId)! };
  };
  const inEuros = (sim: Simulation, amount: number, currency: string) => inSaveMoney(sim, amount, currency);

  it('waives Butterfield Bermuda’s at 60 and over, and not at 59', () => {
    const old = at('bm-butterfield', 1965);
    expect(old.fee()).toEqual({ fee: 0, waivedBy: 'age' });
    const younger = at('bm-butterfield', 1967);
    expect(younger.fee().fee).toBe(inEuros(younger.sim, 13_00, younger.bank.currency));
  });

  it('waives Česká spořitelna’s with four card payments in the month, not three', () => {
    const { sim, fee, bank } = at('cz-ceska-sporitelna', 1990);
    set(sim, current(sim), 1_000_00);
    for (let i = 0; i < 3; i += 1) spend(sim, sim.player, 5_00, 'Groceries', 'food');
    expect(fee().fee).toBe(inEuros(sim, 100_00, bank.currency));
    spend(sim, sim.player, 5_00, 'Groceries', 'food');
    expect(fee()).toEqual({ fee: 0, waivedBy: 'purchases' });
  });

  it('leaves Attijariwafa’s free for six months from opening, then charges it', () => {
    const { sim, account, fee, bank } = at('ma-attijariwafa-bank', 1990);
    expect(fee()).toEqual({ fee: 0, waivedBy: 'new' });
    account.openedAt = sim.now - 200 * MS_DAY;
    expect(fee().fee).toBe(inEuros(sim, 5_00, bank.currency));
  });

  it('lowers Butterfield Cayman’s to its compliance fee on a CI$5,000 average', () => {
    const { sim, account, fee, bank } = at('ky-butterfield', 1990);
    account.monthSum = 1_000_00 * 10;
    account.monthDays = 10;
    expect(fee().fee).toBe(inEuros(sim, 8_00, bank.currency));
    account.monthSum = inEuros(sim, 5_000_00, bank.currency) * 10;
    expect(fee()).toEqual({ fee: inEuros(sim, 2_00, bank.currency), waivedBy: 'balance' });
  });

  it('frees Swedbank Lithuania’s under 26, and lowers it for a salary', () => {
    expect(at('lt-swedbank', 2004).fee()).toEqual({ fee: 0, waivedBy: 'age' });
    const { sim, fee } = at('lt-swedbank', 1990);
    expect(fee().fee).toBe(1_70);
    sim.post({ memo: 'Wages', category: 'salary', postings: [{ accountId: current(sim).id, amount: 900_00 }, { accountId: sim.nominalAccount('income', 'Wages').id, amount: -900_00 }] });
    expect(fee()).toEqual({ fee: 1_10, waivedBy: 'deposits' });
  });

  it('halves NLB’s under 30', () => {
    expect(at('si-nlb', 2000).fee()).toEqual({ fee: 3_50, waivedBy: 'age' });
    expect(at('si-nlb', 1990).fee().fee).toBe(6_99);
  });
});

describe('an overdraft past its limit, or with none', () => {
  const wages = (sim: Simulation, amount: number) => sim.post({
    memo: 'Wages', category: 'salary',
    postings: [{ accountId: current(sim).id, amount }, { accountId: sim.nominalAccount('income', 'Wages').id, amount: -amount }],
  });

  it('charges Deutsche Bank’s higher rate on the part beyond the Dispo, and lets the account go there', () => {
    const run = (limit: number) => {
      const sim = lifeIn('de-be-berlin', { bankId: 'de-deutsche-bank', birthYear: 1985 });
      noSpending(sim);
      wages(sim, 3_000_00);
      if (limit > 0) sim.must({ kind: 'bank.arrange_overdraft', payload: { limit } });
      set(sim, savings(sim), 0);
      set(sim, current(sim), 0);
      set(sim, current(sim), -1_000_00);
      sim.advanceTo(instantFromZoned({ year: 2026, month: 2, day: 1, hour: 6 }, sim.homeZone));
      return -charged(sim, current(sim), 'Overdraft interest').reduce((a, b) => a + b, 0);
    };
    // €1,000 overdrawn all month: at 11.60% inside a €1,000 Dispo, at 13.05% with none.
    const inside = run(1_000_00);
    const beyond = run(0);
    expect(beyond).toBeGreaterThan(inside);
    expect(beyond / inside).toBeCloseTo(0.1305 / 0.116, 1);
  });

  it('charges BNZ’s unarranged fee for a month more than $20 overdrawn, and not at $20 or under 19', () => {
    const month = (overdrawn: number, birthYear = 1985) => {
      const sim = lifeIn('nz-akl-auckland', { bankId: 'nz-bnz', birthYear });
      noSpending(sim);
      set(sim, savings(sim), 0);
      set(sim, current(sim), 0);
      sim.advanceTo(instantFromZoned({ year: 2026, month: 1, day: 10, hour: 12 }, sim.homeZone));
      spend(sim, sim.player, overdrawn, 'Test', 'bills');
      expect(current(sim).balance).toBe(-overdrawn);
      set(sim, current(sim), -overdrawn);
      sim.advanceTo(instantFromZoned({ year: 2026, month: 2, day: 1, hour: 6 }, sim.homeZone));
      return charged(sim, current(sim), 'Unarranged overdraft fee');
    };
    expect(month(21_00)).toEqual([-2_00]);
    expect(month(20_00)).toEqual([]);
    expect(month(21_00, 2008)).toEqual([]);
  });

  it('charges ANZ’s past the limit only after more than a day', () => {
    const sim = lifeIn('nz-akl-auckland', { bankId: 'nz-anz', birthYear: 1985 });
    noSpending(sim);
    set(sim, savings(sim), 0);
    set(sim, current(sim), 0);
    sim.advanceTo(instantFromZoned({ year: 2026, month: 1, day: 10, hour: 12 }, sim.homeZone));
    spend(sim, sim.player, 50_00, 'Test', 'bills');
    set(sim, current(sim), -50_00);
    sim.advanceTo(instantFromZoned({ year: 2026, month: 1, day: 11, hour: 6 }, sim.homeZone));
    set(sim, current(sim), 0);
    sim.advanceTo(instantFromZoned({ year: 2026, month: 2, day: 1, hour: 6 }, sim.homeZone));
    // One midnight past it: no fee.
    expect(charged(sim, current(sim), 'Unarranged overdraft fee')).toEqual([]);
    set(sim, current(sim), -50_00);
    sim.advanceTo(instantFromZoned({ year: 2026, month: 3, day: 1, hour: 6 }, sim.homeZone));
    expect(charged(sim, current(sim), 'Unarranged overdraft fee')).toEqual([-3_00]);
  });

  it('charges PTSB’s set-up fee when the overdraft is arranged, and its yearly fee a year on', () => {
    const sim = lifeIn('ie-lei-dublin', { bankId: 'ie-ptsb', birthYear: 1985 });
    wages(sim, 3_000_00);
    sim.must({ kind: 'bank.arrange_overdraft', payload: { limit: 500_00 } });
    expect(charged(sim, current(sim), 'Overdraft set-up fee')).toEqual([-25_00]);
    expect(charged(sim, current(sim), 'Overdraft facility fee')).toEqual([]);
  });
});

describe('the waivers as the banks write them', () => {
  const wagesInto = (sim: Simulation, amount: number) => sim.post({
    memo: 'Wages', category: 'salary',
    postings: [{ accountId: current(sim).id, amount }, { accountId: sim.nominalAccount('income', 'Wages').id, amount: -amount }],
  });
  const days = (account: Account, perDay: number, count: number) => { account.monthSum = perDay * count; account.monthDays = count; };
  const feeNow = (sim: Simulation, account: Account) => feeFor(sim, account, monthStartOf(sim, sim.now));

  it('waives Citi’s savings fee on a $500 average, not the lowest day', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-citi', wealth: 'modest' });
    const saver = savings(sim)!;
    saver.lowest = 0;
    days(saver, 600_00, 10);
    expect(feeNow(sim, saver)).toEqual({ fee: 0, waivedBy: 'balance' });
    days(saver, 400_00, 10);
    expect(feeNow(sim, saver).fee).toBe(4_50);
  });

  it('starts the average again each month', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-citi', wealth: 'modest' });
    noSpending(sim);
    const saver = savings(sim)!;
    set(sim, saver, 2_000_00);
    sim.advanceTo(instantFromZoned({ year: 2026, month: 2, day: 1, hour: 6 }, sim.homeZone));
    set(sim, saver, 100_00);
    sim.advanceTo(instantFromZoned({ year: 2026, month: 2, day: 20, hour: 6 }, sim.homeZone));
    // January's $2,000 days don't carry into February's average.
    expect(feeNow(sim, saver).fee).toBe(4_50);
  });

  it('waives Chase’s on a $5,000 average across its accounts', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-chase', wealth: 'modest', birthYear: 1990 });
    const account = current(sim);
    set(sim, account, 100_00);
    account.lowest = 100_00;
    days(account, 1_000_00, 10);
    days(savings(sim)!, 3_900_00, 10);
    expect(feeNow(sim, account).fee).toBe(15_00);
    days(savings(sim)!, 4_100_00, 10);
    expect(feeNow(sim, account)).toEqual({ fee: 0, waivedBy: 'balance' });
  });

  it('asks Santander Spain for three bills or six card payments beside the nómina', () => {
    const sim = lifeIn('es-md-madrid', { bankId: 'es-santander', birthYear: 1985 });
    noSpending(sim);
    set(sim, current(sim), 5_000_00);
    set(sim, savings(sim), 0);
    wagesInto(sim, 1_000_00);
    expect(feeNow(sim, current(sim)).fee).toBe(20_00);
    for (let i = 0; i < 5; i += 1) spend(sim, sim.player, 10_00, 'Groceries', 'food');
    expect(feeNow(sim, current(sim)).fee).toBe(20_00);
    spend(sim, sim.player, 10_00, 'Groceries', 'food');
    expect(feeNow(sim, current(sim))).toEqual({ fee: 0, waivedBy: 'deposits' });
  });

  it('asks CaixaBank for three bills or card payments together', () => {
    const sim = lifeIn('es-md-madrid', { bankId: 'es-caixabank', birthYear: 1985 });
    noSpending(sim);
    set(sim, current(sim), 5_000_00);
    set(sim, savings(sim), 0);
    wagesInto(sim, 1_000_00);
    spend(sim, sim.player, 10_00, 'Bills', 'bills');
    spend(sim, sim.player, 10_00, 'Groceries', 'food');
    expect(feeNow(sim, current(sim)).fee).toBe(20_00);
    spend(sim, sim.player, 10_00, 'Groceries', 'food');
    expect(feeNow(sim, current(sim))).toEqual({ fee: 0, waivedBy: 'deposits' });
  });
});

describe('an IBAN in the rest of the world', () => {
  it('carries the bank’s own code where the registry puts it, and every check holds', () => {
    const sim = quickSave({}, 'world-iban');
    let checked = 0;
    for (const [key, { code }] of Object.entries(IBAN_CODES)) {
      const [iso, name] = key.split('|') as [string, string];
      const bank = banksIn(iso).find((b) => b.name === name);
      if (!bank?.bban) continue;
      const number = accountNumber(sim, sim.player, bank, 'checking').replace(/^IBAN |\s/g, '');
      const country = bank.ibanCountry ?? bank.iso;
      expect(ibanValid(number), `${key} ${number}`).toBe(true);
      expect(number.slice(0, 2)).toBe(country);
      const bban = number.slice(4);
      expect(bban.slice(bank.codeOffset ?? 0, (bank.codeOffset ?? 0) + code.length), key).toBe(code);
      // Its national check holds, where SLATE has the country's rule.
      expect(withNationalCheck(country, bban), key).toBe(bban);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(250);
    // ING in the Netherlands, as the Dutch write it.
    const ing = banksIn('NL').find((b) => b.name === 'ING')!;
    expect(accountNumber(sim, sim.player, ing, 'checking')).toMatch(/^IBAN NL\d{2} INGB/);
  });
});

describe('what counts as a deposit', () => {
  // A deposit posted into the current account, as the payer would.
  const pay = (sim: Simulation, account: Account, amount: number, category: string, memo: string) => sim.post({
    memo, category,
    postings: [
      { accountId: sim.nominalAccount('income', memo).id, amount: -amount },
      { accountId: account.id, amount },
    ],
  });

  it('counts unemployment benefit and a tax refund where the bank asks for electronic deposits, and only wages where it asks for a salary', () => {
    const chase = lifeIn('us-tx-houston', { bankId: 'us-chase', wealth: 'nothing' });
    const account = current(chase);
    const fee = () => feeFor(chase, account, monthStartOf(chase, chase.now));
    expect(fee().waivedBy).not.toBe('deposits');
    pay(chase, account, 300_00, 'benefit', 'Unemployment Benefits');
    pay(chase, account, 250_00, 'tax', 'Tax Refund');
    expect(fee()).toEqual({ fee: 0, waivedBy: 'deposits' });

    const lcl = lifeIn('fr-idf-paris', { bankId: 'fr-lcl', wealth: 'nothing' });
    const salaried = current(lcl);
    const lclFee = () => feeFor(lcl, salaried, monthStartOf(lcl, lcl.now));
    pay(lcl, salaried, 500_00, 'benefit', 'Allocation d’aide au retour à l’emploi');
    expect(lclFee().waivedBy).not.toBe('deposits');
    pay(lcl, salaried, 500_00, 'salary', 'Wages');
    expect(lclFee()).toEqual({ fee: 0, waivedBy: 'deposits' });
  });
});