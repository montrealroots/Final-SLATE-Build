// Money coming in goes where the player told the bank to pay it (bank.ts postToBank, routing.ts depositAccount). Until
// November 15, 2026 SLATE's pay always went to the primary account, so redirecting wages to savings did nothing.
import { describe, expect, it } from 'vitest';
import { postToBank } from '../src/engine/bank';
import { advanceBankWorld, bankSim } from '../src/engine/bankworld';
import { DAY } from '../src/engine/time';
import { startLife } from './helpers';
import type { GameState } from '../src/engine/types';

const run = (s: GameState, kind: string, payload: Record<string, unknown> = {}) => {
  advanceBankWorld(s.bank!, s.now);
  const r = bankSim(s.bank!).execute<Record<string, unknown>>({ kind, payload });
  if (!r.ok) throw new Error(r.error);
  return r.value!;
};
const held = (s: GameState, id: string) => bankSim(s.bank!).universe.accounts[id].balance;

describe('wages paid into another account', () => {
  it('go where the bank was told, once the change has taken effect', () => {
    const s = startLife('deposits');
    const savings = run(s, 'bank.open_savings').accountId as string;
    run(s, 'bank.redirect_deposits', { accountId: savings });
    const primary = bankSim(s.bank!).player.primaryAccountId!;
    // Paid in before the change takes effect: to the current account.
    const before = [held(s, primary), held(s, savings)];
    postToBank(s, 'wages', 1000, 'Day rate', 'wages:1');
    expect(held(s, primary)).toBeGreaterThan(before[0]);
    expect(held(s, savings)).toBe(before[1]);
    // A fortnight on (DEPOSIT_LEAD): into savings.
    s.now += 15 * DAY;
    advanceBankWorld(s.bank!, s.now);
    const mid = [held(s, primary), held(s, savings)];
    postToBank(s, 'wages', 1000, 'Day rate', 'wages:2');
    expect(held(s, savings)).toBeGreaterThan(mid[1]);
    expect(held(s, primary)).toBe(mid[0]);
  });
});
