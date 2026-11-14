/**
 * The multiple-bank experience, its exceptional paths (from 2026-10-10, after the audit in
 * docs/verification/papers-bank-audit.json). PLAYER JOURNEYS play through commands; FIXTURES set a state by hand, and
 * say so.
 */
import { describe, expect, it } from 'vitest';
import { createSave, loadSave, quickSave } from '../../src/engine/bankworld';
import type { Simulation } from '../../src/engine/bankworld/core/simulation';
import { MS_DAY } from '../../src/engine/bankworld/core/time';
import { newLifeConfig } from '../../src/engine/bankworld/world/bootstrap';
import { deserialise, serialise } from '../../src/engine/bankworld/persistence/adapter';
import { checkingsOf, SWITCH_KIND } from '../../src/engine/bankworld/systems/lending';
import { hold } from '../../src/engine/bankworld/systems/pending';
import { bankAccountsOf } from '../../src/engine/bankworld/systems/banking';

const student = (seed: string) => createSave(1, seed, { ...newLifeConfig(), homeRegionId: 'us-ny-newyork', firstName: 'Ada', lastName: 'Cole', pronouns: 'she/her', bankId: 'us-chase' });
const reload = (sim: Simulation) => loadSave(deserialise(serialise(sim.universe)) as never);
const primary = (sim: Simulation) => sim.universe.accounts[sim.player.primaryAccountId!]!;
/** FIXTURE: money put in from outside. */
const fund = (sim: Simulation, id: string, amount: number) => sim.post({ memo: 'TEST SETUP', category: 'test', postings: [{ accountId: id, amount }, { accountId: sim.nominalAccount('income', 'Test').id, amount: -amount }] });
/** FIXTURE: a card purchase on an account, held pending as a debit card's is. */
const pendingBuy = (sim: Simulation, id: string, amount: number) => hold(sim, sim.post({ memo: 'TEST SETUP: groceries', category: 'food', postings: [{ accountId: id, amount: -amount }, { accountId: sim.nominalAccount('expense', 'Food').id, amount }] }), sim.universe.accounts[id]!);

describe('closing an account with card payments pending', () => {
  it('is refused at Chase until they post, and Citi keeps it open, restricted, then closes it and remits past its own limit', () => {
    let sim = student('mv-second');
    const chase = primary(sim);
    const citi = sim.must<{ accountId: string }>({ kind: 'bank.open_current', payload: { bankId: 'us-citi' } }).accountId;
    // The old account: Chase, no longer primary, its wages, savings and autopay moved off by the player first.
    sim.must({ kind: 'bank.set_primary', payload: { accountId: citi } });
    sim.player.payments = { ...sim.player.payments!, depositTo: citi };
    for (const a of bankAccountsOf(sim, sim.player)) if (a.kind === 'savings') sim.must({ kind: 'bank.close_savings', payload: { accountId: a.id } });
    for (const c of Object.values(sim.universe.accounts).filter((a) => a.ownerId === sim.player.id && a.kind === 'credit_card' && !a.closedAt)) sim.must({ kind: 'card.set_autopay_from', payload: { cardId: c.id, accountId: citi } });
    pendingBuy(sim, chase.id, 30_00);
    expect(sim.execute({ kind: 'bank.close_current', payload: { accountId: chase.id, remainderTo: citi } }).error).toMatch(/pending/);
    sim.advanceTo(sim.now + 5 * MS_DAY);
    expect(sim.execute({ kind: 'bank.close_current', payload: { accountId: chase.id, remainderTo: citi } }).ok).toBe(true);
    fund(sim, citi, 20_000_00);
    // Citi: pending items keep it open, restricted, and it closes once they post; what it holds goes, past $10,000.
    const other = sim.must<{ accountId: string }>({ kind: 'bank.open_current', payload: { bankId: 'us-wells-fargo', fundFrom: citi, amount: 25_00 } }).accountId;
    sim.advanceTo(sim.now + 4 * MS_DAY);
    sim.must({ kind: 'bank.set_primary', payload: { accountId: other } });
    sim.player.payments = { ...sim.player.payments!, depositTo: other };
    for (const c of Object.values(sim.universe.accounts).filter((a) => a.ownerId === sim.player.id && a.kind === 'credit_card' && !a.closedAt)) sim.must({ kind: 'card.set_autopay_from', payload: { cardId: c.id, accountId: other } });
    pendingBuy(sim, citi, 40_00);
    const answer = sim.must<{ closedAt: number }>({ kind: 'bank.close_current', payload: { accountId: citi, remainderTo: other } });
    expect(answer.closedAt).toBeGreaterThan(sim.now);
    expect(sim.universe.accounts[citi]!.closingAt).toBe(answer.closedAt);
    expect(sim.execute({ kind: 'bank.set_primary', payload: { accountId: citi } }).ok).toBe(false);
    sim = reload(sim);
    sim.advanceTo(answer.closedAt + 60_000);
    expect(sim.universe.accounts[citi]!.closedAt).toBeDefined();
    sim.advanceTo(sim.now + 3 * MS_DAY);
    expect(sim.universe.accounts[other]!.balance).toBeGreaterThan(19_000_00);
  });
});

describe('a switching service', () => {
  it('won’t switch into a bank already kept, and closes the account it was asked about, not whichever is primary on the day', () => {
    const sim = quickSave({ startLocationId: 'uk-eng-london', homeRegionId: 'uk-eng-london', livesWhereBorn: true, bankId: 'gb-barclays' }, 'bk-cass');
    const barclays = primary(sim);
    const natwest = sim.must<{ accountId: string }>({ kind: 'bank.open_current', payload: { bankId: 'gb-natwest' } }).accountId;
    expect(sim.execute({ kind: 'bank.switch', payload: { bankId: 'gb-natwest' } }).error).toMatch(/already have an account at NatWest/);
    const at = sim.must<{ at: number }>({ kind: 'bank.switch', payload: { bankId: 'gb-hsbc' } }).at;
    expect(sim.universe.scheduled.find((i) => i.kind === SWITCH_KIND && i.status === 'pending')!.payload.fromId).toBe(barclays.id);
    sim.must({ kind: 'bank.set_primary', payload: { accountId: natwest } });
    sim.advanceTo(at + 60_000);
    expect(sim.universe.accounts[barclays.id]!.closedAt).toBeDefined();
    expect(sim.universe.accounts[natwest]!.closedAt).toBeUndefined();
    expect(checkingsOf(sim, sim.player).map((a) => a.bankId).sort()).toEqual(['gb-hsbc', 'gb-natwest']);
  });
});

describe('savings', () => {
  it('opens beside a current account at each bank, one each', () => {
    const sim = student('mv-move');
    sim.must({ kind: 'bank.open_current', payload: { bankId: 'us-capital-one' } });
    const opened = sim.must<{ accountId: string }>({ kind: 'bank.open_savings', payload: { bankId: 'us-capital-one' } }).accountId;
    expect(sim.universe.accounts[opened]!.bankId).toBe('us-capital-one');
    expect(sim.execute({ kind: 'bank.open_savings', payload: { bankId: 'us-capital-one' } }).error).toMatch(/already have a savings account at Capital One/);
    expect(sim.execute({ kind: 'bank.open_savings', payload: { bankId: 'us-citi' } }).ok).toBe(false);
  });
});
