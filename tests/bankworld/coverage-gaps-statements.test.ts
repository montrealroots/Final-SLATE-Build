/**
 * Past card statements keep the cycles they were cut on (from 2026-10-10): each statement's cut is kept on the card
 * (`CardState.cuts`), and `periodsOf` builds the past from them, so moving the statement day moves only what comes
 * after. The New Haven student's own card, through `card.set_statement_day` and the statements as they come.
 */
import { describe, expect, it } from 'vitest';
import { createSave, loadSave } from '../../src/engine/bankworld';
import type { Simulation } from '../../src/engine/bankworld/core/simulation';
import { MS_DAY, zonedParts } from '../../src/engine/bankworld/core/time';
import { newLifeConfig } from '../../src/engine/bankworld/world/bootstrap';
import { deserialise, serialise } from '../../src/engine/bankworld/persistence/adapter';
import { MIN_CYCLE_DAYS, STATEMENT_KIND, cardOf, stateOf } from '../../src/engine/bankworld/systems/credit';
import { cardStatement, periodsOf } from '../../src/engine/bankworld/systems/statements';

const student = (seed: string) => createSave(1, seed, { ...newLifeConfig(), homeRegionId: 'us-ny-newyork', firstName: 'Ada', lastName: 'Cole', pronouns: 'she/her' });
const reload = (sim: Simulation) => loadSave(deserialise(serialise(sim.universe)) as never);
const nextStatement = (sim: Simulation) => sim.timeline.pending().find((i) => i.kind === STATEMENT_KIND && i.payload.personId === sim.player.id)!.at;
const cuts = (sim: Simulation) => sim.universe.scheduled.filter((i) => i.kind === STATEMENT_KIND && i.status === 'done' && i.payload.personId === sim.player.id).map((i) => i.at).sort((a, b) => a - b);
const day = (sim: Simulation, t: number) => zonedParts(t, sim.zone).day;
const give = (sim: Simulation, accountId: string, amount: number, memo: string) => sim.post({ memo, category: 'test', postings: [{ accountId, amount }, { accountId: sim.nominalAccount('income', 'Test').id, amount: -amount }] });

describe('a card’s past statements', () => {
  it('keep their cycles through two moves of the statement day, a longer transition cycle between', () => {
    let sim = student('stmt-moves');
    const card = () => cardOf(sim, sim.player)!;
    sim.advanceTo(nextStatement(sim) + 1000);
    sim.advanceTo(nextStatement(sim) + 1000);
    const before = cuts(sim);
    expect(before).toHaveLength(2);
    const oldDay = day(sim, before[1]!);
    sim.must({ kind: 'card.set_statement_day', payload: { day: oldDay === 5 ? 9 : 5 } });
    // A charge in the transition cycle, which is longer than a month.
    give(sim, card().id, -40_00, 'In the transition');
    sim.advanceTo(nextStatement(sim) + 1000);
    sim.must({ kind: 'card.set_statement_day', payload: { day: 25 } });
    sim.advanceTo(nextStatement(sim) + 1000);
    sim = reload(sim);
    const all = cuts(sim);
    expect(stateOf(sim.player, card()).cuts).toEqual(all);
    const periods = periodsOf(sim, card());
    // Every past period between two cuts that happened, newest first, after the open one.
    const past = periods.slice(1, all.length);
    for (let i = 0; i < past.length; i += 1) expect(past[i]).toMatchObject({ from: all[all.length - 2 - i], to: all[all.length - 1 - i] });
    // The one before the first move ends on the old day still.
    expect(day(sim, past.at(-1)!.to)).toBe(oldDay);
    // The transition cycle is longer than a month, and at least the shortest cycle.
    const transition = past.find((p) => p.to === all[2])!;
    expect(transition.to - transition.from).toBeGreaterThan(31 * MS_DAY);
    expect(transition.to - transition.from).toBeGreaterThanOrEqual(MIN_CYCLE_DAYS * MS_DAY);
    // Its charge is on it, and on no other statement.
    const on = (p: typeof transition) => cardStatement(sim, card(), p).lines.some((l) => l.memo === 'In the transition');
    expect(periods.filter(on)).toEqual([transition]);
    expect(periods.some((p) => p.rebuilt && p.to > all[0]!)).toBe(false);
  });

  it('from a save before the cuts were kept (LEGACY STATE), are rebuilt on today’s day and say so', () => {
    const sim = student('stmt-legacy');
    sim.advanceTo(nextStatement(sim) + 1000);
    sim.advanceTo(nextStatement(sim) + 1000);
    const card = cardOf(sim, sim.player)!;
    delete stateOf(sim.player, card).cuts;
    const periods = periodsOf(sim, card);
    expect(periods[0]!.rebuilt).toBeUndefined();
    expect(periods.slice(1).every((p) => p.rebuilt && p.label.endsWith('(Rebuilt)'))).toBe(true);
  });
});
