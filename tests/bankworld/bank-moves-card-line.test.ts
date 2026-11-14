/**
 * What Open An Account At Another Bank says about the new account's debit card, against what opening one does (from
 * 2026-10-12; `ui/bank/BankMoves.tsx`, `cardArrival` and `openApproved` in `systems/bankmoves.ts`).
 *
 * Until 2026-10-12 the line said Bank of America's card "takes 6 business days, with a digital card in the app
 * meanwhile". Nothing read the 6: a digital card works from the day the account opens and nothing arrives after it, so
 * the line now says that, and docs/UNBITTEN.md says why the 6 are kept in `OPENING`. And where a bank publishes no days
 * for a new card, the line said SLATE's 7 business days while the card came in the bank's own days for a replacement
 * (`SECURITY`): Citi's 5 and SMBC's 10, 29 of the thirteen countries' 60 banks. The line reads those days now.
 *
 * PLAYER JOURNEYS: the panel is rendered as the player has it, for the bank it shows first, and that bank is then
 * opened through the command its Apply button runs. The days the line gives are read back off it and held against the
 * day the card arrives. TEST SETUP: Bank of America's card rule is changed in place for two of them, and put back.
 */
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { quickSave } from '../../src/engine/bankworld';
import type { Simulation } from '../../src/engine/bankworld/core/simulation';
import type { Account } from '../../src/engine/bankworld/core/ledger';
import { MS_DAY } from '../../src/engine/bankworld/core/time';
import { businessDaysBetween, daysOfAccount } from '../../src/engine/bankworld/content/bankdays';
import { OPENING, ESTIMATE_CARD_DAYS } from '../../src/engine/bankworld/content/bankopening';
import { SECURITY } from '../../src/engine/bankworld/content/security';
import { banksFor } from '../../src/engine/bankworld/systems/banking';
import { homeOf } from '../../src/engine/bankworld/systems/earnings';
import { checkingsOf } from '../../src/engine/bankworld/systems/lending';
import { applicationsOf } from '../../src/engine/bankworld/systems/bankmoves';
import { REPLACED_KIND } from '../../src/engine/bankworld/systems/security';

const h = vi.hoisted(() => ({ sim: undefined as unknown as import('../../src/engine/bankworld/core/simulation').Simulation }));

// Without the original: it imports the looks, which import it back, and would get the original’s hooks.
vi.mock('../../src/ui/bankworld/app/game-context', () => {
  const noop = () => undefined;
  const game = () => new Proxy({
    get sim() { return h.sim; },
    version: 0,
    run: (kind: string, payload: Record<string, unknown> = {}) => h.sim.execute({ kind, payload }),
    toast: noop,
  } as Record<string, unknown>, { get: (t, k) => (k in t ? t[k as string] : noop) });
  return { useGame: () => game(), useWorld: <T,>(read: (s: Simulation) => T) => read(h.sim) };
});

const { BankMoves } = await import('../../src/ui/bankworld/ui/bank/BankMoves');

const HOUR = 3_600_000;
const BOA = 'us-bank-of-america';
const lifeIn = (cityId: string, bankId: string, seed: string) => quickSave({ startLocationId: cityId, homeRegionId: cityId, livesWhereBorn: true, wealth: 'comfortable', bankId }, seed);
const primary = (sim: Simulation) => sim.universe.accounts[sim.player.primaryAccountId!]!;
const run = <T = unknown>(sim: Simulation, kind: string, payload: Record<string, unknown>) => {
  const answer = sim.execute<T>({ kind, payload });
  expect(answer.ok, `${kind}: ${answer.error}`).toBe(true);
  return answer.value as T;
};
/** The bank screen’s panels, as text. */
const screen = (sim: Simulation): string => {
  h.sim = sim;
  return renderToStaticMarkup(createElement(BankMoves)).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
};
/** The bank the panel shows first: the first here with no current account and no application of the player's. */
const shown = (sim: Simulation) => {
  const kept = new Set(checkingsOf(sim, sim.player).map((a) => a.bankId));
  return banksFor(homeOf(sim.player)).find((b) => !kept.has(b.id) && !applicationsOf(sim, sim.player).some((a) => a.bankId === b.id))!;
};
/** The card's line, and the days it gives, where it gives any. */
const cardLine = (text: string): { line: string; days?: number; business?: boolean } => {
  const line = /The debit card [^.]*\./.exec(text)![0];
  const m = /arrives in (\d+) (business )?days/.exec(line);
  return m ? { line, days: Number(m[1]), business: m[2] !== undefined } : { line };
};
const currentAt = (sim: Simulation, bankId: string): Account => checkingsOf(sim, sim.player).find((a) => a.bankId === bankId)!;
const arrivals = (sim: Simulation, account: Account) => sim.universe.scheduled.filter((i) => i.kind === REPLACED_KIND && i.payload.accountId === account.id && i.status === 'pending');
/** Business days from a moment to the card's arrival, on the bank's own calendar. */
const businessDaysTo = (sim: Simulation, account: Account, from: number, to: number) => {
  const kept = daysOfAccount(account, sim.player);
  return businessDaysBetween(from, to, kept.countryId, sim.homeZone, kept.regionId);
};
/** Applies at Bank of America from Chase, with its opening deposit, and lets it decide. Returns the account and the day it opened. */
const applyAtBoa = (sim: Simulation): { account: Account; openedAt: number } => {
  const chase = primary(sim).id;
  const { decidedAt } = run<{ decidedAt: number }>(sim, 'bank.open_current', { bankId: BOA, fundFrom: chase, amount: 100_00 });
  sim.advanceTo(decidedAt + HOUR);
  return { account: currentAt(sim, BOA), openedAt: decidedAt };
};
/** Bank of America's card rule, changed for the length of `body` and put back. TEST SETUP. */
const withBoaCard = <T,>(change: { days?: number; digital?: boolean }, body: () => T): T => {
  const card = OPENING[BOA]!.card as { days: number; business: boolean; digital?: boolean };
  const was = { ...card };
  Object.assign(card, change);
  try { return body(); } finally { Object.assign(card, was); if (was.digital === undefined) delete card.digital; }
};

describe('PLAYER JOURNEY: a New York life at Chase, applying at Bank of America', () => {
  it('says its digital card works from the day the account opens, gives no days, and nothing arrives after it', () => {
    const sim = lifeIn('us-ny-newyork', 'us-chase', 'card-line-boa');
    expect(shown(sim).id).toBe(BOA);
    const { line, days } = cardLine(screen(sim));
    expect(line).toBe('The debit card works from the day the account opens, as a digital card in the app.');
    // Until 2026-10-12: "The debit card takes 6 business days, with a digital card in the app meanwhile."
    expect(days).toBeUndefined();
    expect(line).not.toContain('meanwhile');
    const { account } = applyAtBoa(sim);
    expect(account.plastic).toBeDefined();
    expect([account.plastic!.stopped, account.plastic!.replacementAt]).toEqual([undefined, undefined]);
    expect(arrivals(sim, account)).toEqual([]);
  }, 120_000);

  it('the 6 change no outcome: at 60 the line and the account are the same (docs/UNBITTEN.md)', () => {
    const base = lifeIn('us-ny-newyork', 'us-chase', 'card-line-boa-60');
    const asIs = cardLine(screen(base)).line;
    const sim = lifeIn('us-ny-newyork', 'us-chase', 'card-line-boa-60');
    withBoaCard({ days: 60 }, () => {
      expect(cardLine(screen(sim)).line).toBe(asIs);
      const { account } = applyAtBoa(sim);
      expect([account.plastic!.stopped, account.plastic!.replacementAt]).toEqual([undefined, undefined]);
      expect(arrivals(sim, account)).toEqual([]);
    });
  }, 120_000);

  it('without the digital card, the line gives the 6 business days and the card arrives on the sixth', () => {
    const sim = lifeIn('us-ny-newyork', 'us-chase', 'card-line-boa-plastic');
    withBoaCard({ digital: false }, () => {
      const { line, days, business } = cardLine(screen(sim));
      expect(line).toBe(`The debit card arrives in ${OPENING[BOA]!.card!.days} business days.`);
      expect([days, business]).toEqual([OPENING[BOA]!.card!.days, OPENING[BOA]!.card!.business]);
      const { account, openedAt } = applyAtBoa(sim);
      expect(account.plastic!.stopped).toBe('new');
      expect(arrivals(sim, account)).toHaveLength(1);
      expect(businessDaysTo(sim, account, openedAt, account.plastic!.replacementAt!)).toBe(days);
    });
  }, 120_000);
});

describe('PLAYER JOURNEY: a New York life at Chase, then Wells Fargo and Citi', () => {
  it('gives Wells Fargo’s calendar days and Citi’s days for a replacement, and each card arrives on the day given', () => {
    const sim = lifeIn('us-ny-newyork', 'us-chase', 'card-line-citi');
    const chase = primary(sim).id;
    run(sim, 'bank.open_current', { bankId: BOA, fundFrom: chase, amount: 100_00 });

    // Wells Fargo publishes 7 calendar days for a new card.
    expect(shown(sim).id).toBe('us-wells-fargo');
    const wells = cardLine(screen(sim));
    expect(wells.line).toBe('The debit card arrives in 7 days.');
    const openedWells = sim.now;
    const { cardAt: wellsCard } = run<{ cardAt: number }>(sim, 'bank.open_current', { bankId: 'us-wells-fargo', fundFrom: chase, amount: 25_00 });
    expect(Math.round((wellsCard - openedWells) / MS_DAY)).toBe(wells.days);

    // Citi publishes none for a new card, and its replacement's 5 business days are what the card takes.
    expect(shown(sim).id).toBe('us-citi');
    const citi = cardLine(screen(sim));
    expect(citi.line).toBe(`The debit card arrives in ${SECURITY['us-citi']!.standardDays} business days.`);
    expect(screen(sim)).toContain('The new card’s days are estimated from the bank’s time for a replacement card, as no figure for a new account’s card was found.');
    // Until 2026-10-12 the line gave SLATE's 7 here.
    expect(citi.days).not.toBe(ESTIMATE_CARD_DAYS);
    const openedCiti = sim.now;
    const { accountId, cardAt } = run<{ accountId: string; cardAt: number }>(sim, 'bank.open_current', { bankId: 'us-citi' });
    expect(businessDaysTo(sim, sim.universe.accounts[accountId]!, openedCiti, cardAt)).toBe(citi.days);
  }, 120_000);
});

describe('PLAYER JOURNEY: a Tokyo life at MUFG, opening an account at SMBC', () => {
  it('gives SMBC’s days for a replacement, and the card arrives on the day given', () => {
    const sim = lifeIn('jp-13-tokyo', 'jp-mufg', 'card-line-smbc');
    expect(shown(sim).id).toBe('jp-smbc');
    const { line, days } = cardLine(screen(sim));
    expect(line).toBe(`The debit card arrives in ${SECURITY['jp-smbc']!.standardDays} business days.`);
    expect(screen(sim)).toContain('The new card’s days are estimated from the bank’s time for a replacement card');
    const opened = sim.now;
    const { accountId, cardAt } = run<{ accountId: string; cardAt: number }>(sim, 'bank.open_current', { bankId: 'jp-smbc' });
    expect(businessDaysTo(sim, sim.universe.accounts[accountId]!, opened, cardAt)).toBe(days);
  }, 120_000);
});

describe('PLAYER JOURNEY: a Paris life, opening an account at a bank that publishes no card days', () => {
  it('gives SLATE’s estimate, and the card arrives on the day given', () => {
    const sim = lifeIn('fr-idf-paris', 'fr-bnp-paribas', 'card-line-estimate');
    const bank = shown(sim);
    expect(OPENING[bank.id]?.card).toBeUndefined();
    expect(SECURITY[bank.id]?.standardDays).toBeUndefined();
    const { line, days } = cardLine(screen(sim));
    expect(line).toBe(`The debit card arrives in ${ESTIMATE_CARD_DAYS} business days.`);
    expect(screen(sim)).toContain('The debit card’s days are estimated: the bank doesn’t say.');
    const opened = sim.now;
    const { accountId, cardAt } = run<{ accountId: string; cardAt: number }>(sim, 'bank.open_current', { bankId: bank.id });
    expect(businessDaysTo(sim, sim.universe.accounts[accountId]!, opened, cardAt)).toBe(days);
  }, 120_000);
});
