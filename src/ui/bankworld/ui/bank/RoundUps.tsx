/**
 * SLATE — round-ups on the bank's screen (from 2026-10-13, `systems/roundups.ts`): what the bank's feature does, the
 * choices it leaves to the customer, On or Off, what's counted and waiting, what came of the last transfer, what happens
 * when the account is short, and what the bank leaves open and SLATE leaves out, with the source and the day it was read.
 *
 * Until 2026-10-13 it was the bank's words and an On/Off button: a bank whose amount the customer chooses had SLATE's
 * estimate said beside it, and nothing showed what was waiting or what came of a night's transfer.
 */

import { useState } from 'react';
import { useGame, useWorld } from '../../app/game-context';
import { Gated } from '../guide/Guide';
import { HowItWorks } from '../guide/HowItWorks';
import { WhyNot } from '../components/primitives';
import { formatMoney, saveCurrency } from '../../../../engine/bankworld/core/money';
import { formatDate, formatDateKey } from '../../../../engine/bankworld/core/time';
import { bankById } from '../../../../engine/bankworld/content/banks';
import { ROUND_UPS, type RoundUpEvery } from '../../../../engine/bankworld/content/roundups';
import type { RoundUpChoice } from '../../../../engine/bankworld/domain/model';
import { roundUpEveryWords, roundUpMoney, roundUpRefusal, roundUpsOn, wayOf } from '../../../../engine/bankworld/systems/roundups';

const pick = (r: RoundUpChoice | undefined): RoundUpChoice => ({ way: r?.way, unit: r?.unit, amount: r?.amount, multiplier: r?.multiplier, every: r?.every, minimum: r?.minimum });
const same = (a: RoundUpChoice, b: RoundUpChoice) => (['way', 'unit', 'amount', 'multiplier', 'every', 'minimum'] as const).every((k) => a[k] === b[k]);

export function RoundUps({ bankId }: { bankId: string }) {
  const { sim, run } = useGame();
  const person = useWorld((s) => s.player);
  const primaryBank = useWorld((s) => s.universe.accounts[s.player.primaryAccountId ?? '']?.bankId);
  const rule = ROUND_UPS[bankId];
  const r = person.roundUps;
  const here = primaryBank === bankId;
  const mine = here && r !== undefined && (r.bankId === undefined || r.bankId === bankId);
  const [choice, setChoice] = useState<RoundUpChoice>(() => (mine ? pick(r) : {}));
  if (!rule) return null;
  const name = bankById(bankId)?.name ?? 'This bank';
  const cur = saveCurrency(sim.universe);
  const money = (n: number) => roundUpMoney(bankId, n);
  const on = mine && Boolean(r?.on);
  const counting = here && roundUpsOn(sim, person);
  const why = here ? roundUpRefusal(sim, person, choice) : `Round-ups at ${name} only work when a ${name} checking account is your primary account.`;
  const way = wayOf(rule, choice);
  const changed = on && !same(choice, pick(r));
  const wayNow = wayOf(rule, r);
  const unitNow = wayNow?.kind === 'change' ? (wayNow.units.length === 1 ? wayNow.units[0]! : r?.unit ?? 1) : 1;
  const set = (k: keyof RoundUpChoice) => (e: { target: { value: string } }) => setChoice((c) => ({ ...c, [k]: e.target.value === '' ? undefined : k === 'every' ? (e.target.value as RoundUpEvery) : Number(e.target.value) }));
  const select = (label: string, k: keyof RoundUpChoice, options: readonly (readonly [string | number, string])[]) => (
    <label className="xs col" style={{ gap: 2 }}>
      {label}
      <select className="input input-sm" aria-label={label} value={choice[k] ?? ''} onChange={set(k)}>
        <option value="">Choose…</option>
        {options.map(([v, words]) => <option key={v} value={v}>{words}</option>)}
      </select>
    </label>
  );

  return (
    <div data-roundups={bankId}>
      <p className="small" style={{ margin: '0 0 var(--s1)' }}>
        <span className="strong">Round-Ups, {rule.product}.</span> {rule.words}
      </p>
      <div className="row gap-2" style={{ flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 'var(--s1)' }}>
        {rule.ways.length > 1 && select('How It Counts', 'way', rule.ways.map((w, i) => [i, w.kind === 'change' ? 'Rounded Up' : 'A Set Amount'] as const))}
        {way?.kind === 'change' && way.units.length > 1 && select('Round Up To', 'unit', way.units.map((u) => [u, `The next ${money(u)}`] as const))}
        {way?.kind === 'change' && way.multipliers && select('Multiplier', 'multiplier', way.multipliers.map((m) => [m, `×${m}${m === rule.defaultMultiplier ? ', just the change' : ''}`] as const))}
        {way?.kind === 'flat' && way.amounts && way.amounts.length > 1 && select('Each Purchase', 'amount', way.amounts.map((a) => [a, money(a)] as const))}
        {way?.kind === 'changePlus' && select('Amount', 'amount', way.amounts.map((a) => [a, money(a)] as const))}
        {way?.kind === 'flat' && way.range && (
          <label className="xs col" style={{ gap: 2 }}>
            Each Purchase, {money(way.range.min)} To {money(way.range.max)}
            <input className="input input-sm" type="number" aria-label="Each Purchase" min={way.range.min} max={way.range.max} step={0.01} value={choice.amount ?? ''} onChange={set('amount')} style={{ width: 110 }} />
          </label>
        )}
        {rule.every && select('How Often', 'every', rule.every.map((e) => [e, roundUpEveryWords(e)[0]!.toUpperCase() + roundUpEveryWords(e).slice(1)] as const))}
        {rule.minimumAtLeast !== undefined && (
          <label className="xs col" style={{ gap: 2 }}>
            Minimum Balance, At Least {money(rule.minimumAtLeast)}
            <input className="input input-sm" type="number" aria-label="Minimum Balance" min={rule.minimumAtLeast} step={1} value={choice.minimum ?? ''} onChange={set('minimum')} style={{ width: 110 }} />
          </label>
        )}
      </div>
      <div className="row gap-2" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <Gated feature="bank.set_round_ups" className="btn btn-sm btn-ghost" disabled={!on && Boolean(why)} onClick={() => run('bank.set_round_ups', on ? { on: false } : { on: true, ...choice })}>
          Round-Ups: {on ? 'On' : 'Off'}
        </Gated>
        {changed && (
          <Gated feature="bank.set_round_ups" className="btn btn-sm btn-ghost" disabled={Boolean(why)} onClick={() => run('bank.set_round_ups', { on: true, ...choice })}>
            Save These Choices
          </Gated>
        )}
        <HowItWorks help="bank.round-ups" />
      </div>
      {!on && <WhyNot reasons={[['Turn On', why]]} />}
      {changed && <WhyNot reasons={[['Save These Choices', why]]} />}
      {on && !counting && <p className="xs dim" style={{ margin: 0 }}>Round-ups aren’t counting right now. {roundUpRefusal(sim, person, pick(r)) ?? 'Your primary account isn’t at this bank.'}</p>}
      {mine && ((r?.pending ?? 0) > 0 || (r?.due ?? 0) > 0) && (
        <p className="xs" style={{ margin: 0 }} data-roundups-waiting="">
          Counted but not moved yet: {formatMoney(r!.pending, cur)}{(r?.due ?? 0) > 0 ? `, and ${formatMoney(r!.due!, cur)} moves at the start of the next business day` : ''}.
        </p>
      )}
      {mine && (r?.whole ?? 0) > 0 && (
        <p className="xs dim" style={{ margin: 0 }} data-roundups-whole="">
          {r!.whole === 1 ? `One purchase since the last transfer was already a multiple of ${money(unitNow)}, so it added nothing.` : `${r!.whole} purchases since the last transfer were already a multiple of ${money(unitNow)}, so they added nothing.`}
        </p>
      )}
      {mine && r?.last && (
        <p className="xs" style={{ margin: 0 }} data-roundups-last="">
          {r.last.moved !== undefined ? `Last moved to savings: ${formatMoney(r.last.moved, cur)}, on ${formatDate(r.last.at, sim.zone)}.` : `Not moved on ${formatDate(r.last.at, sim.zone)}: ${formatMoney(r.last.notMoved ?? 0, cur)}, because ${r.last.why}.`}
        </p>
      )}
      <p className="xs dim" style={{ margin: '2px 0 0' }}>When the account is short: {rule.short}</p>
      <details className="xs" style={{ marginTop: 2 }}>
        <summary className="dim">What The Bank Leaves Open, And What The Game Leaves Out</summary>
        <ul style={{ margin: 'var(--s1) 0 0', paddingLeft: 'var(--s4)' }}>
          {rule.open.map((o) => <li key={o}>{o}</li>)}
          {rule.notHere.map((o) => <li key={o}>Not in the game: {o}</li>)}
        </ul>
        {/* Read and checked on one day said once (from 2026-10-17): until then most banks read "read live October 13,
            2026, checked October 13, 2026." */}
        <p className="dim" style={{ margin: 'var(--s1) 0 0' }}>Source: {rule.source.endsWith(`read live ${formatDateKey(rule.checked)}`) ? rule.source.replace(/read live (?=[^,]*, \d{4}$)/, 'read live and checked ') : `${rule.source}, checked ${formatDateKey(rule.checked)}`}.</p>
      </details>
    </div>
  );
}
