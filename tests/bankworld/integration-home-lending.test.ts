// @ts-nocheck: 1221's test, ported (docs/v9/PARITY.md). Its skipped cases name 1221 fields and exports SLATE doesn't carry.
/**
 * Borrowing at a bank kept from home (the integration pass of 2026-10-16), found by the coverage area on a played,
 * rendered save and fixed outside the banking area, which had finished.
 *
 * A bank in another country opens nothing new for a customer abroad (`abroadRefusal`, systems/abroad.ts, from 2026-10-16):
 * the overdraft and loan commands refused in its words. The Borrowing panels read `overdraftOffer` and `loanOffer`, which
 * didn't ask it, so a London-raised student who kept HSBC UK, paid $414.00 of work-study in September, was shown "It would
 * arrange up to $414 at 39.9%", a limit to type and Arrange It, and a Personal Loan form with Borrow It, each refused when
 * pressed: "HSBC UK opens its accounts for people living in the UK; for a customer abroad it has HSBC Expat, from
 * £75,000." Since then the offers ask it first, the panels say it in place of the controls, and the commands refuse in the
 * same words through the offers.
 *
 * The life: a modest family's student raised in London from 2008, banking at Chase in New Haven and keeping HSBC UK, at
 * Yale from Monday 24 August 2026, played to 2 October 2026; then HSBC UK made her primary account, as Borrow At or Set As
 * Primary reaches it. Her twin banking at Wells Fargo, with nothing kept from home, still draws its loan form: the change
 * is the bank abroad's.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createSave, loadPlacesFor } from '../../src/engine/bankworld';
import type { Simulation } from '../../src/engine/bankworld/core/simulation';
import { instantFromZoned } from '../../src/engine/bankworld/core/time';
import { newLifeFrom, type NewSaveConfig } from '../../src/engine/bankworld/world/bootstrap';
import { addCountryHolidays } from '../../src/engine/bankworld/content/holidays';
import { bankById } from '../../src/engine/bankworld/content/banks';

const h = vi.hoisted(() => ({ sim: undefined as unknown as import('../../src/engine/bankworld/core/simulation').Simulation, drawn: [] as { feature: string; label: string }[] }));
vi.mock('../../src/ui/bankworld/ui/kept', async (orig) => { const real = await orig<typeof import('../../src/ui/bankworld/ui/kept')>(); return { ...real, useKept: <T,>(_key: string, initial: T) => [initial, () => undefined] as const }; });
vi.mock('../../src/ui/bankworld/app/game-context', () => {
  const noop = () => undefined;
  const game = () => new Proxy({ get sim() { return h.sim; }, version: 0, run: (kind: string, payload: Record<string, unknown> = {}) => h.sim.execute({ kind, payload }), toast: noop, navigate: noop, standingAt: null } as Record<string, unknown>, { get: (t, k) => (k in t ? t[k as string] : noop) });
  return { useGame: () => game(), useWorld: <T,>(read: (s: Simulation) => T) => read(h.sim) };
});
// Each control the panel draws, by its feature and its words.
vi.mock('../../src/ui/bankworld/ui/guide/Guide', async (orig) => {
  const real = await orig<typeof import('../../src/ui/bankworld/ui/guide/Guide')>();
  const { createElement: ce } = await import('react');
  const words = (c: unknown): string => (Array.isArray(c) ? c.map(words).join('') : typeof c === 'string' || typeof c === 'number' ? String(c) : '');
  return { ...real, Gated: (props: Parameters<typeof real.Gated>[0]) => { h.drawn.push({ feature: props.feature, label: words(props.children).trim() }); return ce(real.Gated, props); } };
});
const { BankLending } = await import('../../src/ui/bankworld/ui/bank/BankLending');
addCountryHolidays('uk', readFileSync('src/engine/bankworld/data/holidays/uk.tsv', 'utf8'));

const at = (y: number, m: number, d: number, hr = 9) => instantFromZoned({ year: y, month: m, day: d, hour: hr, minute: 0 }, 'America/New_York');
const onScreen = (html: string) => html.replace(/\stitle="[^"]*"/g, '').replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, '\'').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const HSBC_ABROAD = 'HSBC UK opens its accounts for people living in the UK; for a customer abroad it has HSBC Expat, from £75,000.';

async function londoner(): Promise<Simulation> {
  const config = newLifeFrom({ homeRegionId: 'uk-eng-london', firstName: 'Ada', lastName: 'Cole', pronouns: 'she/her', wealth: 'modest', bankId: 'us-chase', priorResidence: { cityId: 'uk-eng-london', fromYear: 2008, fromMonth: 9 }, homeBankId: 'gb-hsbc' } as Partial<NewSaveConfig>);
  const sim = createSave(1, 'ihl-hsbc', config);
  await loadPlacesFor(sim.universe);
  sim.advanceTo(at(2026, 10, 2));
  return sim;
}
const accountAt = (sim: Simulation, bankId: string) => Object.values(sim.universe.accounts).find((a) => a.ownerId === sim.player.id && a.bankId === bankId && a.kind === 'checking' && !a.closedAt)!;
/** The Borrowing panels for a bank, as the player has them, and the controls they draw. */
function borrowing(sim: Simulation, bankId: string) {
  h.sim = sim; h.drawn = [];
  const text = onScreen(renderToStaticMarkup(createElement(BankLending, { bank: bankById(bankId)!, account: accountAt(sim, bankId), show: ['borrowing'] })));
  return { text, drawn: h.drawn.map((d) => d.feature) };
}

describe('borrowing at a bank kept from home', () => {
  // Not ported: 1221's account kept at home from before Yale (systems/homeaccount.ts) isn't ported: it is a Yale-only start.
  it.skip('PLAYER JOURNEY: a London-raised student keeping HSBC UK is told at Borrowing that it opens nothing new for a customer abroad, with no Arrange It and no loan form, as its primary account or not; the commands refuse in the same words', async () => {
    const sim = await londoner();
    const home = accountAt(sim, 'gb-hsbc');
    for (const primary of [false, true]) {
      if (primary) expect(sim.execute({ kind: 'bank.set_primary', payload: { accountId: home.id } }).ok).toBe(true);
      const { text, drawn } = borrowing(sim, 'gb-hsbc');
      // Said where the overdraft's offer and the loan's form were: twice, once in each panel.
      expect(text.split(HSBC_ABROAD).length - 1).toBe(2);
      // Until 2026-10-16 the panel drew the offer and its controls here.
      expect(text).not.toContain('It would arrange');
      expect(drawn).not.toContain('bank.arrange_overdraft');
      expect(drawn).not.toContain('bank.borrow');
      expect(text).not.toContain('Loan Amount');
      // Pressed anyway (a stale screen, a duplicate submission), refused in the same words, and nothing arranged or lent.
      expect(sim.execute({ kind: 'bank.arrange_overdraft', payload: { limit: 100_00, accountId: home.id } }).error).toBe(HSBC_ABROAD);
      expect(sim.execute({ kind: 'bank.borrow', payload: { amount: 1_000_00, months: 12, bankId: 'gb-hsbc' } }).error).toBe(HSBC_ABROAD);
      expect(home.overdraftLimit ?? 0).toBe(0);
      expect(Object.values(sim.universe.accounts).filter((a) => a.ownerId === sim.player.id && a.kind === 'loan')).toEqual([]);
    }
  }, 300_000);

  it('PLAYER JOURNEY: her twin banking at Wells Fargo where she lives, with nothing kept from home, is still drawn its Personal Loan form and Borrow It, and nothing of a customer abroad', async () => {
    // Chase, her own bank here, publishes no personal loan, so its panel draws none to compare.
    const config = newLifeFrom({ homeRegionId: 'uk-eng-london', firstName: 'Ada', lastName: 'Cole', pronouns: 'she/her', wealth: 'modest', bankId: 'us-wells-fargo' } as Partial<NewSaveConfig>);
    const sim = createSave(1, 'ihl-hsbc', config);
    await loadPlacesFor(sim.universe);
    sim.advanceTo(at(2026, 10, 2));
    expect(Object.values(sim.universe.accounts).filter((a) => a.ownerId === sim.player.id && a.bankId === 'gb-hsbc')).toEqual([]);
    const { text, drawn } = borrowing(sim, 'us-wells-fargo');
    expect(text).not.toContain('for a customer abroad');
    expect(text).toContain('Loan Amount');
    expect(drawn).toContain('bank.borrow');
  }, 300_000);
});
