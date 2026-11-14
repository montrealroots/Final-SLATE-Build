// SLATE's pay is wages in the bank's eyes (from November 14, 2026; the feature proofs found no SLATE player could ever
// borrow: docs/v10/proof/bank-loan.json). Outside work's pay and a first-look deal's overhead count; taking a film's
// earnings home doesn't, as an owner's draw isn't a wage.
import { describe, expect, it } from 'vitest';
import { isWages } from '../src/engine/bankworld/core/ledger';
import { advanceBankWorld, bankSim } from '../src/engine/bankworld';
import { postToBank } from '../src/engine/bank';
import { startLife } from './helpers';

const borrow = (s: ReturnType<typeof startLife>) => { advanceBankWorld(s.bank!, s.now); return bankSim(s.bank!).execute({ kind: 'bank.borrow', payload: { amount: 1_010_000, months: 60 } }); };

describe('SLATE pay counts as wages', () => {
  it('names which of SLATE\'s money is wages', () => {
    expect([isWages('salary'), isWages('slate:paid-work#job:1'), isWages('slate:overhead#fl:2'), isWages('slate:from-project#x'), isWages('groceries')]).toEqual([true, true, true, false, false]);
  });

  it('a bank that refused for want of wages lends once outside work has paid in', () => {
    const s = startLife('wages-loan');
    expect(borrow(s)).toMatchObject({ ok: false, error: 'The bank lends against wages paid in over the last 30 days, and none has been paid in.' });
    postToBank(s, 'paid-work', 6_000, 'Paid For Acting On A Test Production', 'job:test');
    expect(borrow(s).ok).toBe(true);
  });

  it('taking a film\'s earnings home isn\'t wages, so it doesn\'t open a loan', () => {
    const s = startLife('wages-draw');
    postToBank(s, 'from-project', 6_000, 'From A Test Film', 'from-project:test');
    expect(borrow(s).ok).toBe(false);
  });
});
