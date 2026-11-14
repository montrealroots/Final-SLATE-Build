// @ts-nocheck: 1221's test, ported (docs/v9/PARITY.md). Its skipped cases name 1221 fields and exports SLATE doesn't carry.
/**
 * The Papers repairs of 2026-10-10, each held by the behavior it fixed: a status isn't reported lost with its paper;
 * OPT applied for answers the status's decision, which offers the standard filing first and premium by name; a
 * dismissed student's status ends on the dismissal, with no grace; and the week's work-study is read as work. Until
 * 2026-10-13 this and the dismissal's title said fifteen days, the withdrawal's grace, which the rule of 2026-10-10
 * (`graceDays`) had already taken from a dismissal, while the test asserted none (found by that day's final checks).
 */
import { describe, expect, it } from 'vitest';
import { createSave, quickSave } from '../../src/engine/bankworld';
import type { Simulation } from '../../src/engine/bankworld/core/simulation';
import { MS_DAY } from '../../src/engine/bankworld/core/time';
import { newLifeConfig } from '../../src/engine/bankworld/world/bootstrap';
import { documentsOf } from '../../src/engine/bankworld/systems/documents';
import { STATUS_GRACE_DAYS, US_STATUS_KIND, usStatusEnds } from '../../src/engine/bankworld/systems/permission';
import { workedBetween } from '../../src/engine/bankworld/systems/earnings';
const YEAR = 365.25 * MS_DAY;

/** TEST SETUP: a British graduate in New York, their F-1's program ending a number of days from now. */
function graduate(seed: string, programEndsIn: number): Simulation {
  const sim = quickSave({ startLocationId: 'us-ny-newyork', homeRegionId: 'uk-eng-london', livesWhereBorn: false, wealth: 'wealthy' }, seed);
  sim.player.documents = [];
  const end = sim.now + programEndsIn * MS_DAY;
  documentsOf(sim.player).push(
    { id: 'pp', kind: 'passport', issuer: 'GB', name: 'Passport', number: 'P1', status: 'valid', issuedAt: sim.now - YEAR, expiresAt: sim.now + 8 * YEAR },
    { id: 'f1', kind: 'visa', issuer: 'US', name: 'F-1 Student Visa', number: 'F1', status: 'valid', issuedAt: sim.now - 2 * YEAR, expiresAt: end + 60 * MS_DAY, destination: 'US', passportId: 'pp' },
  );
  if (sim.player.school) sim.player.school.standing = 'graduated';
  return sim;
}

describe('a status’s paper', () => {
  it('isn’t reported lost; a passport is', () => {
    const sim = graduate('lost-status', 30);
    expect(sim.execute({ kind: 'documents.report_lost', payload: { documentId: 'f1' } }).error).toBe('You can’t report a status lost. It stays in force whatever happens to the paper.');
    expect(documentsOf(sim.player).find((d) => d.id === 'f1')!.status).toBe('valid');
    expect(sim.execute({ kind: 'documents.report_lost', payload: { documentId: 'pp' } }).ok).toBe(true);
  });
});

describe('the status’s ending', () => {
  // Not ported: 1221's student status, school and scholarships are excluded (no Yale-only assumptions).
  it.skip('offers OPT standard first and premium by name, and is answered once OPT is applied for', () => {
    const sim = graduate('opt-decision', -1);
    sim.schedule({ at: sim.now + 60_000, kind: US_STATUS_KIND, label: 'US Status', category: 'system', priority: 5, payload: { personId: sim.player.id } });
    sim.advanceTo(sim.now + 120_000);
    const d = Object.values(sim.universe.decisions).find((x) => x.refType === 'us-status')!;
    expect(d.actions.map((a) => a.payload)).toEqual([{}, { premium: true }]);
    expect(d.actions[1]!.label).toMatch(/Premium/);
    sim.must({ kind: 'world.take_decision_action', payload: { decisionId: d.id, actionIndex: 0 } });
    expect(d.resolvedAt).toBeDefined();
    expect(sim.universe.transactions.some((t) => /premium/i.test(t.memo))).toBe(false);
  });
});

describe('a dismissed student', () => {
  // Not ported: 1221's student status, school and scholarships are excluded (no Yale-only assumptions).
  it.skip('loses their status on the day of the dismissal, with no grace, not at the degree’s end', () => {
    const sim = graduate('dismissed', 400);
    // TEST SETUP: the school's record, dismissed today.
    sim.player.school = { standing: 'dismissed', endedAt: sim.now } as never;
    // Failing to maintain status leaves no grace (8 CFR 214.2(f)(5)(iv)): it ends the moment of the dismissal.
    expect(STATUS_GRACE_DAYS.dismissed).toBe(0);
    expect(usStatusEnds(sim.player)).toBe(sim.now);
  });
});

describe('a week of work-study', () => {
  it('is read as work: its pay and its hours', () => {
    const sim = createSave(1, 'worked', { ...newLifeConfig(), homeRegionId: 'us-ny-newyork', firstName: 'Ada', lastName: 'Cole', pronouns: 'she/her' });
    const from = sim.now;
    sim.post({ memo: 'Work-study wages, 12 hours: Yale', category: 'salary', postings: [{ accountId: sim.player.primaryAccountId!, amount: 276_00 }, { accountId: sim.nominalAccount('income', 'Wages').id, amount: -276_00 }] });
    expect(workedBetween(sim, sim.player, from, sim.now + 1)).toEqual({ pay: 276_00, hours: 12 });
  });
});
