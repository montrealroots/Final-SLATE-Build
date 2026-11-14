/**
 * Money moved between countries: module 5 of 2026-10-16 (`abroadQuote`, `sendAbroad`, `systems/abroad.ts`), from an
 * account kept at home to the American one and back, played through `bank.transfer`, the clock and the rendered Move
 * Money panel, in lives made as the game makes them (`createSave` on `newLifeConfig` with Before Yale's fields).
 *
 * Until this, a payment from Barclays to Chase would have taken Britain's Faster Payments and landed at once, free:
 * `sendBetweenBanks` now sends any payment between two countries abroad first. Worked by hand from `content/currency.ts`
 * (0.79 pounds, 150 yen to the dollar) and the research's figures (`content/homeaccounts.ts`):
 *
 * - Barclays to Chase, £1,000 on Friday 28 August 2026 at ten: 100,000p is 126,582¢ (126,582.28); Barclays charges
 *   nothing online and takes up to 2.75%, 3,481¢ (3,481.005); Chase charges $15 for a wire from abroad; Chase receives
 *   126,582 − 3,481 − 1,500 = 121,601¢. Two business days in both countries from the day after: Monday 31 August is
 *   England's summer bank holiday, so Tuesday and Wednesday, 2 September at five. The same sent Friday 4 September waits
 *   on Labor Day, Monday 7 September, and lands Wednesday 9 September: a rule of the sender's days alone would land it
 *   on the Tuesday, and one of the receiver's alone the first one on the Tuesday 1 September.
 * - Chase to HSBC UK, $1,000 the same Friday: Chase's $5 for a wire in another currency under $5,000; no margin is
 *   published, so SLATE's 2.6%, 2,600¢; 97,400¢ is 76,946p; HSBC UK takes £5 for a payment in from abroad, 76,446p,
 *   whose 500p are 633¢ (632.91), so the save's books carry 100,000 − 2,600 − 633 = 96,767¢. No time is published, so
 *   SLATE's three business days: Tuesday, Wednesday, Thursday 3 September.
 * - SMBC to Chase, ¥100,000 on Friday 18 September: SMBC's ¥3,500; 10,000,000 sen is 66,667¢ (66,666.67); its ¥1 a
 *   dollar is 1/150, 444¢ (444.45); Chase's $15; 64,723¢ arrive. Japan's Silver Week keeps 21, 22 and 23 September, so
 *   three business days of both are Thursday 24, Friday 25 and Monday 28 September.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createSave, loadPlacesFor, loadSave } from '../../src/engine/bankworld';
import { newLifeConfig, withFamily, type NewSaveConfig } from '../../src/engine/bankworld/world/bootstrap';
import { addCountryHolidays } from '../../src/engine/bankworld/content/holidays';
import { breaches } from '../../src/engine/bankworld/core/invariants';
import { instantFromZoned, MS_DAY } from '../../src/engine/bankworld/core/time';
import { deserialise, serialise } from '../../src/engine/bankworld/persistence/adapter';
import { abroadQuote, quoteWords } from '../../src/engine/bankworld/systems/abroad';
import { inTransitOf } from '../../src/engine/bankworld/systems/bankmoves';
import type { Simulation } from '../../src/engine/bankworld/core/simulation';
import type { Account } from '../../src/engine/bankworld/core/ledger';

for (const country of ['uk', 'jp', 'ie', 'nz']) addCountryHolidays(country, readFileSync(`src/engine/bankworld/data/holidays/${country}.tsv`, 'utf8'));

const h = vi.hoisted(() => ({
  sim: undefined as unknown as import('../../src/engine/bankworld/core/simulation').Simulation,
  /** TEST SETUP: what each useState starts at, in render order, in place of its own initial value, while any are left. */
  states: [] as unknown[],
  /** The buttons the screen drew, with their own props. */
  elements: [] as { type: string; props: Record<string, unknown>; text: string }[],
  toasts: [] as string[],
}));

vi.mock('react', async (orig) => {
  const real = await orig<typeof import('react')>();
  const useState = ((initial: unknown) => {
    const [value] = real.useState(initial);
    const set = () => undefined;
    return [h.states.length > 0 ? h.states.shift() : value, set];
  }) as unknown as typeof real.useState;
  return { ...real, default: { ...real, useState }, useState };
});
const textOf = (c: unknown): string => (c == null || typeof c === 'boolean' ? '' : Array.isArray(c) ? c.map(textOf).join('') : typeof c === 'object' ? textOf((c as { props?: { children?: unknown } }).props?.children) : String(c));
const keepElements = (real: Record<string, unknown>) => {
  const grab = (make: (...a: unknown[]) => unknown) => (type: unknown, props: Record<string, unknown>, ...rest: unknown[]) => {
    if (type === 'button' && props) h.elements.push({ type, props, text: textOf(props.children) });
    return make(type, props, ...rest);
  };
  return { ...real, ...(real.jsx ? { jsx: grab(real.jsx as never), jsxs: grab(real.jsxs as never) } : {}), ...(real.jsxDEV ? { jsxDEV: grab(real.jsxDEV as never) } : {}) };
};
vi.mock('react/jsx-runtime', async (orig) => keepElements(await orig<Record<string, unknown>>()));
vi.mock('react/jsx-dev-runtime', async (orig) => keepElements(await orig<Record<string, unknown>>()));
vi.mock('../../src/ui/bankworld/app/game-context', () => {
  const noop = () => undefined;
  const game = () => new Proxy({
    get sim() { return h.sim; },
    version: 0,
    run: (kind: string, payload: Record<string, unknown> = {}) => h.sim.execute({ kind, payload }),
    toast: (text: string) => { h.toasts.push(text); },
    standingAt: null,
  } as Record<string, unknown>, { get: (t, k) => (k in t ? t[k as string] : noop) });
  return { useGame: () => game(), useWorld: <T,>(read: (s: Simulation) => T) => read(h.sim), GameProvider: ({ children }: { children: unknown }) => children };
});
vi.mock('../../src/ui/bankworld/ui/kept', async (orig) => {
  const real = await orig<typeof import('../../src/ui/bankworld/ui/kept')>();
  return { ...real, useKept: <T,>(_key: string, initial: T) => [initial, () => undefined] as const };
});
const { BankWorkspace } = await import('../../src/ui/bankworld/ui/workspaces/BankWorkspace');

const life = (extra: Partial<NewSaveConfig> = {}): NewSaveConfig => ({
  ...withFamily(newLifeConfig(), 'modest'),
  homeRegionId: 'uk-eng-london', firstName: 'Ada', lastName: 'Cole', pronouns: 'she/her', bankId: 'us-chase', ...extra,
});
const london = (bank: string) => life({ priorResidence: { cityId: 'uk-eng-london', fromYear: 2008, fromMonth: 9 }, homeBankId: bank });
const make = async (config: NewSaveConfig) => { const sim = createSave(1, 'transfers', config); await loadPlacesFor(sim.universe); return sim; };
const reload = (sim: Simulation) => loadSave(deserialise(serialise(sim.universe)) as never);
const mine = (sim: Simulation) => Object.values(sim.universe.accounts).filter((a) => !a.nominal && a.ownerId === sim.player.id);
const at = (sim: Simulation, bankId: string, kind: 'checking' | 'savings') => mine(sim).find((a) => a.bankId === bankId && a.kind === kind)!;
const run = <T = unknown>(sim: Simulation, kind: string, payload: Record<string, unknown>) => {
  const answer = sim.execute<T>({ kind, payload });
  expect(answer.ok, `${kind}: ${answer.error}`).toBe(true);
  return answer.value as T;
};
const refused = (sim: Simulation, kind: string, payload: Record<string, unknown>) => {
  const answer = sim.execute({ kind, payload });
  expect(answer.ok, kind).toBe(false);
  return String(answer.error);
};
const day = (sim: Simulation, month: number, d: number, hour = 10) => instantFromZoned({ year: 2026, month, day: d, hour }, sim.homeZone);
const iso = (at: number) => new Date(at).toISOString();
const arrivals = (sim: Simulation, memo: string) => sim.universe.transactions.filter((t) => t.memo === memo);
const named = (sim: Simulation, t: { postings: { accountId: string; amount: number }[] }, name: string) => t.postings.find((p) => sim.universe.accounts[p.accountId]?.name === name)?.amount;
const on = (t: { postings: { accountId: string; amount: number; native?: number }[] }, a: Account) => t.postings.find((p) => p.accountId === a.id)!;

describe('from home to America', () => {
  // Not ported: 1221's account kept at home from before Yale (systems/homeaccount.ts) isn't ported: it is a Yale-only start.
  it.skip('sends Barclays’ £1,000 to Chase over England’s bank holiday and over Labor Day, landing less its margin and Chase’s fee', async () => {
    const sim = await make(london('gb-barclays'));
    const current = at(sim, 'gb-barclays', 'checking');
    const saver = at(sim, 'gb-barclays', 'savings');
    const chase = at(sim, 'us-chase', 'checking');
    // At one bank, at once, the pounds typed on both sides.
    expect(run(sim, 'bank.transfer', { fromId: saver.id, toId: current.id, amount: 110_000, in: 'GBP' })).toEqual({ moved: 139_241, sent: 110_000, sentIn: 'GBP' });
    expect([current.held, saver.held]).toEqual([110_000, 448_100]);

    sim.advanceTo(day(sim, 8, 28));
    const quote = abroadQuote(sim, sim.player, current, chase, 100_000);
    expect(quote).toMatchObject({ sent: 100_000, fee: 0, worth: 126_582, margin: 0.0275, marginAssumed: false, marginSave: 3_481, incoming: 1_500, received: 121_601, daysAssumed: false });
    const chaseBefore = chase.balance;
    const sent = run<{ moved: number; arrivesAt: number }>(sim, 'bank.transfer', { fromId: current.id, toId: chase.id, amount: 100_000, in: 'GBP' });
    expect(sent).toMatchObject({ moved: 126_582, sent: 100_000, sentIn: 'GBP' });
    expect(iso(sent.arrivesAt)).toBe('2026-09-02T21:00:00.000Z');
    // Nothing straight across: Chase holds what it held, and the money is in transit.
    expect(chase.balance).toBe(chaseBefore);
    expect(inTransitOf(sim, sim.player).balance).toBe(126_582);
    expect([current.held, current.balance]).toEqual([10_000, 139_241 - 126_582]);

    sim.advanceTo(day(sim, 9, 3));
    const landed = arrivals(sim, 'From Barclays Bank Account at Barclays, abroad');
    expect(landed).toHaveLength(1);
    expect(iso(landed[0]!.at)).toBe('2026-09-02T21:00:00.000Z');
    expect(on(landed[0]!, chase).amount).toBe(121_601);
    expect([named(sim, landed[0]!, 'Exchange Margin'), named(sim, landed[0]!, 'Bank Fees')]).toEqual([3_481, 1_500]);

    // Friday 4 September, over Labor Day.
    sim.advanceTo(day(sim, 9, 4));
    run(sim, 'bank.transfer', { fromId: saver.id, toId: current.id, amount: 100_000, in: 'GBP' });
    const second = run<{ arrivesAt: number }>(sim, 'bank.transfer', { fromId: current.id, toId: chase.id, amount: 100_000, in: 'GBP' });
    expect(iso(second.arrivesAt)).toBe('2026-09-09T21:00:00.000Z');
    expect(current.held).toBe(10_000);
    expect(sim.ledger.audit()).toEqual([]);
  });

  // Not ported: 1221's account kept at home from before Yale (systems/homeaccount.ts) isn't ported: it is a Yale-only start.
  it.skip('sends ¥100,000 from SMBC to Chase over Japan’s Silver Week for its ¥3,500 and its ¥1 a dollar', async () => {
    const sim = await make(life({ homeRegionId: 'jp-13-tokyo', priorResidence: { cityId: 'jp-13-tokyo', fromYear: 2005, fromMonth: 4 }, homeBankId: 'jp-smbc' }));
    const savings = at(sim, 'jp-smbc', 'savings');
    const chase = at(sim, 'us-chase', 'checking');
    sim.advanceTo(day(sim, 9, 18));
    const held = savings.held!;
    const quote = abroadQuote(sim, sim.player, savings, chase, 10_000_000);
    expect(quote).toMatchObject({ fee: 350_000, worth: 66_667, marginSave: 444, incoming: 1_500, received: 64_723, daysAssumed: true });
    const sent = run<{ arrivesAt: number }>(sim, 'bank.transfer', { fromId: savings.id, toId: chase.id, amount: 10_000_000, in: 'JPY' });
    expect(iso(sent.arrivesAt)).toBe('2026-09-28T21:00:00.000Z');
    expect(savings.held).toBe(held - 10_000_000 - 350_000);
    const fee = sim.universe.transactions.find((t) => t.memo === 'International payment fee')!;
    expect(on(fee, savings)).toMatchObject({ amount: -2_333, native: -350_000 });
    sim.advanceTo(day(sim, 9, 29));
    expect(on(arrivals(sim, 'From 普通預金 (Ordinary Deposit) at SMBC, abroad')[0]!, chase).amount).toBe(64_723);
  });
});

describe('from America to home', () => {
  // Not ported: 1221's account kept at home from before Yale (systems/homeaccount.ts) isn't ported: it is a Yale-only start.
  it.skip('mirrors it: Chase’s $5, SLATE’s stated margin, HSBC UK’s £5, three business days of both, the pence exact', async () => {
    const sim = await make(london('gb-hsbc'));
    const hsbc = at(sim, 'gb-hsbc', 'checking');
    const chase = at(sim, 'us-chase', 'checking');
    sim.advanceTo(day(sim, 8, 28));
    const quote = abroadQuote(sim, sim.player, chase, hsbc, 100_000);
    expect(quote).toMatchObject({ fee: 500, marginSave: 2_600, marginAssumed: true, incoming: 500, incomingSave: 633, received: 76_446, receivedSave: 96_767, daysAssumed: true });
    expect(quoteWords(sim, quote as never)).toBe('Chase sends $1,000.00 for a $5.00 fee. At 2.6% under the estimated exchange rate (an estimate: the bank publishes no margin, so the game uses the FSB’s 2024 average cost of a payment abroad, 2.6%), HSBC UK receives £764.46 after its £5.00 fee for a payment from abroad, on Thursday, September 3, 2026 (an estimate: the bank publishes no time, so the game uses three business days).');
    const before = chase.balance;
    const sent = run<{ arrivesAt: number }>(sim, 'bank.transfer', { fromId: chase.id, toId: hsbc.id, amount: 100_000 });
    expect(iso(sent.arrivesAt)).toBe('2026-09-03T21:00:00.000Z');
    expect(before - chase.balance).toBe(100_500);
    sim.advanceTo(day(sim, 9, 4));
    const landed = arrivals(sim, 'From Chase Total Checking at Chase, abroad');
    expect(landed).toHaveLength(1);
    expect(on(landed[0]!, hsbc)).toMatchObject({ amount: 96_767, native: 76_446 });
    expect(hsbc.held).toBe(76_446);
    expect(sim.ledger.audit()).toEqual([]);
  });

  // Not ported: 1221's account kept at home from before Yale (systems/homeaccount.ts) isn't ported: it is a Yale-only start.
  it.skip('arrives once when the save is reloaded with it on its way', async () => {
    const sim = await make(london('gb-hsbc'));
    sim.advanceTo(day(sim, 8, 28));
    run(sim, 'bank.transfer', { fromId: at(sim, 'us-chase', 'checking').id, toId: at(sim, 'gb-hsbc', 'checking').id, amount: 100_000 });
    const again = reload(sim);
    await loadPlacesFor(again.universe);
    again.advanceTo(day(again, 9, 10));
    expect(arrivals(again, 'From Chase Total Checking at Chase, abroad')).toHaveLength(1);
    expect(at(again, 'gb-hsbc', 'checking').held).toBe(76_446);
    expect(inTransitOf(again, again.player).balance).toBe(0);
    expect(again.ledger.audit()).toEqual([]);
  });

  // Not ported: 1221's account kept at home from before Yale (systems/homeaccount.ts) isn't ported: it is a Yale-only start.
  it.skip('comes back to Chase less the margin and the fee when Barclays has closed the account before it lands', async () => {
    const sim = await make(london('gb-barclays'));
    const chase = at(sim, 'us-chase', 'checking');
    sim.advanceTo(day(sim, 10, 21));
    run(sim, 'bank.transfer', { fromId: chase.id, toId: at(sim, 'gb-barclays', 'checking').id, amount: 50_000 });
    sim.advanceTo(day(sim, 10, 28));
    // $500: Chase's $5; SLATE's 2.6%, 1,300¢; 48,700¢ is 38,473p, over £100, so Barclays' £6, 600p, 759¢ (759.49).
    const back = arrivals(sim, 'Returned from abroad, less the exchange and the fee: the account it was sent to isn’t open');
    expect(back).toHaveLength(1);
    expect(on(back[0]!, chase).amount).toBe(50_000 - 1_300 - 759);
    expect(sim.universe.notifications.filter((n) => n.title === 'A Payment Abroad Came Back')).toHaveLength(1);
  });
});

describe('refusals, in words', () => {
  // Not ported: 1221's account kept at home from before Yale (systems/homeaccount.ts) isn't ported: it is a Yale-only start.
  it.skip('says what the bank or the research leaves out', async () => {
    const barclays = await make(london('gb-barclays'));
    expect(refused(barclays, 'bank.transfer', { fromId: at(barclays, 'gb-barclays', 'checking').id, toId: at(barclays, 'us-chase', 'checking').id, amount: 100_000, in: 'GBP' }))
      .toBe('Barclays Bank Account has nothing available, so nothing was moved.');
    const mizuho = await make(life({ homeRegionId: 'jp-13-tokyo', priorResidence: { cityId: 'jp-13-tokyo', fromYear: 2005, fromMonth: 4 }, homeBankId: 'jp-mizuho' }));
    expect(refused(mizuho, 'bank.transfer', { fromId: at(mizuho, 'jp-mizuho', 'savings').id, toId: at(mizuho, 'us-chase', 'checking').id, amount: 100_000, in: 'JPY' }))
      .toBe('Mizuho’s app and Direct banking aren’t open to a non-resident, and its counters are in Japan.');
    const auckland = await make(life({ homeRegionId: 'nz-akl-auckland', priorResidence: { cityId: 'nz-akl-auckland', fromYear: 2005, fromMonth: 4 }, homeBankId: 'nz-asb' }));
    expect(refused(auckland, 'bank.transfer', { fromId: at(auckland, 'nz-asb', 'savings').id, toId: at(auckland, 'us-chase', 'checking').id, amount: 100_000, in: 'NZD' }))
      .toBe('What ASB charges to send a payment abroad isn’t known to the game.');
    const dublin = await make(life({ homeRegionId: 'ie-lei-dublin', priorResidence: { cityId: 'ie-lei-dublin', fromYear: 2002, fromMonth: 6 }, homeBankId: 'ie-ptsb' }));
    expect(refused(dublin, 'bank.transfer', { fromId: at(dublin, 'us-chase', 'checking').id, toId: at(dublin, 'ie-ptsb', 'checking').id, amount: 10_000 }))
      .toBe('What PTSB charges for a payment received from abroad isn’t known to the game.');
    // The whole of SMBC's savings, and its fee beside it, is more than they hold: ¥1,059,750 less the ¥7,480 its
    // current account opens with (from 2026-10-16), and ¥3,500 more.
    const tokyo = await make(life({ homeRegionId: 'jp-13-tokyo', priorResidence: { cityId: 'jp-13-tokyo', fromYear: 2005, fromMonth: 4 }, homeBankId: 'jp-smbc' }));
    expect(refused(tokyo, 'bank.transfer', { fromId: at(tokyo, 'jp-smbc', 'savings').id, toId: at(tokyo, 'us-chase', 'checking').id, amount: 105_227_000, in: 'JPY' }))
      .toBe('普通預金 (Ordinary Deposit) holds ¥1,052,270, and this takes ¥1,055,770 with the bank’s fee.');
  });
});

describe('the Move Money panel', () => {
  // Not ported: 1221's account kept at home from before Yale (systems/homeaccount.ts) isn't ported: it is a Yale-only start.
  it.skip('takes the amount in pounds from a pound account, quotes the payment, and says when it arrives', async () => {
    const sim = await make(london('gb-barclays'));
    const current = at(sim, 'gb-barclays', 'checking');
    const chase = at(sim, 'us-chase', 'checking');
    run(sim, 'bank.transfer', { fromId: at(sim, 'gb-barclays', 'savings').id, toId: current.id, amount: 110_000, in: 'GBP' });
    sim.advanceTo(day(sim, 8, 28));
    h.sim = sim;
    // TEST SETUP: Move Money's From, To and Amount, its first three states, as the player chose and typed them.
    h.states = [current.id, chase.id, '1000'];
    h.elements = [];
    const words = renderToStaticMarkup(createElement(BankWorkspace)).replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, '\'').replace(/\s+/g, ' ');
    expect(words).toContain('Amount (GBP)');
    expect(words).toContain('Barclays Bank Account ···');
    expect(words).toContain('Barclays sends £1,000.00 for no fee. At its rate, 2.75% under the estimated exchange rate, Chase receives $1,216.01 after its $15.00 fee for a payment from abroad, on Wednesday, September 2, 2026.');
    const press = h.elements.find((e) => e.text === 'Move It')!;
    (press.props.onClick as () => void)();
    expect(h.toasts.at(-1)).toBe(`Sent £1,000.00 to ${chase.name}. It arrives September 2, 2026.`);
    expect(current.held).toBe(10_000);
  });
});

describe('the books, after a played month', () => {
  // Not ported: 1221's account kept at home from before Yale (systems/homeaccount.ts) isn't ported: it is a Yale-only start.
  it.skip('keeps every life’s ledger and invariants clean with payments both ways, fees and interest', async () => {
    for (const bank of ['gb-barclays', 'gb-hsbc']) {
      const sim = await make(london(bank));
      sim.advanceTo(day(sim, 8, 28));
      run(sim, 'bank.transfer', { fromId: at(sim, 'us-chase', 'checking').id, toId: at(sim, bank, 'checking').id, amount: 20_000 });
      run(sim, 'bank.transfer', { fromId: at(sim, bank, 'savings').id, toId: at(sim, 'us-chase', 'checking').id, amount: 50_000, in: 'GBP' });
      sim.advanceTo(sim.now + 31 * MS_DAY);
      expect(sim.ledger.audit(), bank).toEqual([]);
      expect(breaches(sim.universe), bank).toEqual([]);
      expect(mine(sim).some((a) => a.inactive), bank).toBe(false);
    }
  });
});
