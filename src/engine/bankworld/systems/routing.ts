/**
 * SLATE — where money comes in and goes out, as instructions (from 2026-10-10).
 *
 * Until then every incoming payment went to whichever account was primary on the day it arrived, and every standing
 * order and card autopay paid from it, so choosing a primary account rerouted everything at once, and a bank switch
 * was a pointer moved. Now each is an instruction of its own:
 *
 * - **The deposit instruction** (`depositTo`): where wages, a stipend, benefits, refunds and pensions are paid
 *   (`payeeAccount`). It's the payer's to act on, so a change takes effect from a later date (`DEPOSIT_LEAD`), and a
 *   payment made before then goes where it always did.
 * - **A standing order's account** (`StandingOrder.fromId`) and **a card's autopay account** (`CardState.autopayFrom`):
 *   each pays from the account it was set up on until the player moves it.
 * - **The primary account**: the debit card's purchases and the bills the player pays by hand come from it, and it's
 *   the default for a new instruction. Choosing another changes nothing already set up.
 *
 * A save from before keeps its behavior to the day: an instruction it never had is pinned to the primary account the
 * first time it's read, and holds from then on.
 */
import type { Simulation } from '../core/simulation';
import type { Person } from '../domain/model';
import type { Account } from '../core/ledger';
import { MS_DAY, formatDate, type Instant } from '../core/time';
import { paymentsOf, type PaymentSettings } from './payments';

/**
 * How long a change of where wages and other payments are paid takes to reach them: SLATE's estimate of a payroll
 * cycle's lead time. Employers and agencies say a change takes effect "in one to two pay cycles" (see
 * docs/research/world/research-banking.json); one cycle of two weeks is taken, and a payment dated before it still
 * goes to the account it was going to.
 */
export const DEPOSIT_LEAD = { days: 14 } as const;

/**
 * Yale's own payroll, which pays work-study weekly: a change of direct deposit in Workday "takes approximately one pay
 * cycle" (Yale payroll, research-student-status.json A4), so seven days, from 2026-10-10. Every other payer keeps
 * `DEPOSIT_LEAD`, an estimate, not any institution's rule.
 */
// SLATE: 1221's one payer with a lead of its own was Yale's payroll (7 days); SLATE has no Yale, so every payer takes
// the estimated `DEPOSIT_LEAD`.
export const PAYER_LEAD: Readonly<Record<string, number>> = {};
export type Payer = keyof typeof PAYER_LEAD;

/** A person's payment settings, kept on them where a save had none. */
function settingsOf(person: Person): PaymentSettings {
  person.payments ??= paymentsOf(person);
  return person.payments;
}

const open = (sim: Simulation, id: string | undefined): Account | undefined => {
  const a = id ? sim.universe.accounts[id] : undefined;
  return a && !a.closedAt ? a : undefined;
};

/**
 * Where incoming payments go today: the deposit instruction, a change to it applied once its day has come; for a payer
 * with a lead of its own (`PAYER_LEAD`), from that payer's day.
 */
export function depositAccount(sim: Simulation, person: Person, at: Instant = sim.now, payer?: string): Account | undefined {
  const pay = settingsOf(person);
  if (pay.depositChange && at >= pay.depositChange.at) {
    pay.depositTo = pay.depositChange.to;
    delete pay.depositChange;
  }
  pay.depositTo ??= open(sim, person.primaryAccountId)?.id;
  const early = payer ? pay.depositChange?.from?.[payer] : undefined;
  if (early !== undefined && at >= early) return open(sim, pay.depositChange!.to) ?? open(sim, pay.depositTo);
  return open(sim, pay.depositTo);
}

/** Asks the payers to pay into another account: from `DEPOSIT_LEAD` on. Returns when it takes effect. */
export function changeDeposits(sim: Simulation, person: Person, toId: string): Instant {
  const pay = settingsOf(person);
  depositAccount(sim, person);
  const at = sim.now + DEPOSIT_LEAD.days * MS_DAY;
  const from = Object.fromEntries(Object.entries(PAYER_LEAD).map(([payer, days]) => [payer, sim.now + days * MS_DAY]));
  if (pay.depositTo === toId) delete pay.depositChange;
  else pay.depositChange = { to: toId, at, from };
  return at;
}

/** The account a standing order pays from: the one it was set up on (pinned from the primary for an order from before). */
export function orderSource(sim: Simulation, person: Person, order: { fromId?: string }): Account | undefined {
  order.fromId ??= open(sim, person.primaryAccountId)?.id;
  return order.fromId ? sim.universe.accounts[order.fromId] : undefined;
}

/**
 * Everything an account was the instruction for, said so the player can move it before closing it (`closeRefusal`):
 * incoming payments, a change of them on its way, standing orders paying from it, card autopay from it, and one-off
 * payments set for a date. Until 2026-10-13 standing orders paying into it were named too; it’s read only for current
 * accounts, and an order goes only into savings (`bank.add_standing_order`), so none ever was.
 */
export function linkedTo(sim: Simulation, person: Person, accountId: string): string[] {
  const out: string[] = [];
  const pay = settingsOf(person);
  depositAccount(sim, person);
  if (pay.depositTo === accountId) out.push(paidInto(sim, pay, accountId));
  if (pay.depositChange?.to === accountId) out.push(`Your wages and other payments are being moved to it${movingDays(sim, pay.depositChange, 'from')}`);
  for (const o of pay.standingOrders) {
    if (orderSource(sim, person, o)?.id === accountId) out.push(`A standing order pays from it on the ${ordinal(o.day)}`);
  }
  // A card's autopay not yet pinned follows the primary account, as it pays (`autopaySource`), and a closed card's pays
  // nothing. Until 2026-10-16 only a pinned one was named, so Your Banks gained the line after a reload once something
  // had pinned it, and a closed card's was named too, refusing to close the account it had paid from.
  const autopayFrom = (cardId: string | undefined, from: string | undefined) => {
    const card = cardId ? sim.universe.accounts[cardId] : undefined;
    return card && !card.closedAt ? from ?? person.primaryAccountId : undefined;
  };
  for (const [cardId, state] of Object.entries(person.credit?.cards ?? {})) if (autopayFrom(cardId, state.autopayFrom) === accountId) out.push('A card’s autopay pays from it');
  if (autopayFrom(person.credit?.primaryId, person.credit?.autopayFrom) === accountId) out.push('Your everyday card’s autopay pays from it');
  for (const loan of Object.values(sim.universe.accounts)) {
    if (loan.ownerId === person.id && !loan.closedAt && loan.kind === 'loan' && loan.repayFromId === accountId) out.push(`${loan.name}’s payments come from it`);
  }
  for (const i of sim.universe.scheduled) {
    if (i.status !== 'pending' || i.kind !== 'bank.scheduled_payment' || i.payload.personId !== person.id) continue;
    if (i.payload.fromId === accountId || i.payload.toId === accountId) out.push('A payment set for a date uses it');
  }
  return out;
}

/** A day of the month as it's said, “the 5th” (from 2026-10-17: until then “on the 5”). */
const ordinal = (n: number): string => { const t = n % 100; return `${n}${t >= 11 && t <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')}`; };

/** The payers a change of deposit names apart from the rest, in the words for them. */
const PAYER_NAMES: Readonly<Record<string, string>> = {};

/**
 * When a change of deposit reaches each payer: “: Yale’s payroll from …, and the rest from …”, or “ from …” (“ on …”)
 * where it’s one day.
 */
function movingDays(sim: Simulation, change: NonNullable<PaymentSettings['depositChange']>, one: 'from' | 'on'): string {
  const day = (at: Instant) => formatDate(at, sim.zone);
  const early = Object.entries(change.from ?? {}).filter(([, at]) => day(at) !== day(change.at));
  if (early.length === 0) return ` ${one} ${day(change.at)}`;
  return `: ${early.map(([payer, at]) => `${PAYER_NAMES[payer] ?? 'one payer'} from ${day(at)}`).join(', ')}, and the rest from ${day(change.at)}`;
}

/**
 * `linkedTo`'s line for the account the wages are paid into: with a change on its way, until when, payer by payer, as the
 * new account's line says it. From 2026-10-16: until then it said only that they were paid into it, and Close It's
 * refusal said to move them, which was done already (found by the journeys area of brief 09 on its life je-1).
 */
function paidInto(sim: Simulation, pay: PaymentSettings, accountId: string): string {
  const change = pay.depositChange;
  if (!change || change.to === accountId) return 'Your wages and other payments are paid into it';
  return `Your wages and other payments are paid into it until they move to ${sim.universe.accounts[change.to]?.name ?? 'your other account'}${movingDays(sim, change, 'on')}`;
}

/**
 * The day the last payer stops paying into this account, where a change has been asked to move them elsewhere: from then
 * nothing pays into it (from 2026-10-16, for Close It's refusal to say when it can close).
 */
function depositsLeave(sim: Simulation, person: Person, accountId: string): Instant | undefined {
  const pay = settingsOf(person);
  depositAccount(sim, person);
  return pay.depositTo === accountId && pay.depositChange && pay.depositChange.to !== accountId ? pay.depositChange.at : undefined;
}

/**
 * Close It's refusal for what still uses the account (`closeRefusal`): what `linkedTo` names, and “Move it first.” Where
 * the wages are already on their way elsewhere they aren't the player's to move again, and it says the day it can close.
 * From 2026-10-16, moved here from `closeRefusal`: until then it said “Move it first.” of a change already asked for (the
 * journeys area of brief 09, life je-1).
 */
export function closeHold(sim: Simulation, person: Person, accountId: string): string | undefined {
  const links = linkedTo(sim, person, accountId);
  if (links.length === 0) return undefined;
  const leaves = depositsLeave(sim, person, accountId);
  if (leaves !== undefined) return `${links.join('. ')}. ${links.length === 1 ? 'You can close it' : 'Move the others first, and then you can close it'} from ${formatDate(leaves, sim.zone)}.`;
  return `${links.join('. ')}. Move ${links.length === 1 ? 'that' : 'those'} to another account first.`;
}

/**
 * A bank closed the account on them (\`closeForOverdraft\`): what was paid into it is paid into the account they keep
 * elsewhere, as a payer re-sends a payment returned from a closed account (SLATE doesn't keep the return and the
 * re-sending apart). Autopay from it isn't moved: it fails, and says so, until the player moves it. A standing order from
 * it ends with it (`endOrdersOf`, from 2026-10-16), the bank having held it; until then it stayed, and failed and said
 * so every month for good.
 */
export function redirectAway(sim: Simulation, person: Person, fromId: string, toId: string): void {
  const pay = settingsOf(person);
  depositAccount(sim, person);
  if (pay.depositTo === fromId) pay.depositTo = toId;
  if (pay.depositChange?.to === fromId) delete pay.depositChange;
}
