/**
 * SLATE — an account's life: savings and term deposits over time, and what
 * happens to an account nobody uses (module 7 of `docs/BANKING-FUNCTIONS.md`).
 *
 * From each bank's own terms (`content/accountlife.ts`):
 *
 * - **A term deposit's end** (B7, B41): the bank writes before it, and at it
 *   the deposit does what its holder told the bank, among what the bank
 *   allows and with the notice it needs, or else the bank's default: renews
 *   for the same term at the bank's rate, with any days' grace to take the
 *   money without penalty; moves into the bank's easy-access savings; or is
 *   paid out.
 * - **Breaking one early** (B16): for the bank's penalty in days of interest
 *   where it states it so (the US's and Britain's banks), never more than
 *   the interest earned where the bank caps it there (Chase, NatWest, HSBC),
 *   and at least a week's interest in a term's first week where it says so;
 *   taken from the deposit itself if the interest won't cover it; where the bank words its
 *   penalty another way (a reduced rate in Japan, a rate cut in France, a
 *   share of the amount in Spain), the interest built so far is forfeited,
 *   SLATE's estimate, and the bank's own words are shown; where the bank
 *   doesn't allow it, it can't be, except in a grace window or a
 *   cooling-off period.
 * - **Interest taken during the term** (B18), where the bank allows it.
 * - **Savings withdrawals** (B12, B33): free up to the bank's number a month,
 *   and its fee for each after (Canada's banks, New Zealand's).
 * - **Round-ups** (B9): each debit card purchase rounded up to the next
 *   whole unit, or the bank's flat amount a purchase where its words say so
 *   (Wells Fargo's, from 2026-10-12), moved at the day's end to savings at
 *   the current account's bank (from 2026-10-12: savings at any bank until
 *   then), skipped on a day the current account is short, where the bank
 *   offers it.
 * - **An idle account** (A19, A20, B35): inactive after the bank's months,
 *   dormant after more, blocked until the holder uses it again, and earning
 *   nothing where the bank says so.
 * - **Unclaimed money** (A21): after the country's years untouched, the
 *   balance goes to the state or its scheme, and can be claimed back.
 * - **Changing one's mind** (A12, C6): a savings account, a term deposit, a
 *   current account or a card opened in the last 14 days (the country's
 *   cooling-off period) canceled, the money back with its interest or
 *   without it and its fees refunded or charged, as the country's rule has
 *   it (`KEEPS_INTEREST`, `REFUNDS_CHARGES`); Britain's fixed-rate deposits
 *   excepted, as its rules except them, and Korea's deposits, which its rule
 *   doesn't reach. Until 2026-10-15 a deposit's money came back “in full”,
 *   its interest dropped and its charges kept, in every country.
 */

import type { Simulation } from '../core/simulation';
import { CommandError } from '../core/simulation';
import type { Person, RoundUpChoice } from '../domain/model';
import type { Account, LedgerTransaction } from '../core/ledger';
import { formatMoney, saveCurrency, type Money } from '../core/money';
import { addDays, addMonths, endOfDay, formatDate, instantFromZoned, startOfNextDay, zonedParts, MS_DAY, type Instant } from '../core/time';
import { bankById } from '../content/banks';
import { afterBusinessDays, daysOfAccount } from '../content/bankdays';
import { ACCOUNT_LIFE, UNCLAIMED, type BankAccountLife, type TermEnd } from '../content/accountlife';
import { moveRoundUps, setRoundUps } from './roundups';
import { closingFeesOf, dropPaymentsFor, inSaveMoney, interestTaxFor, openOne, rateOn, settleFees, settleInterest } from './banking';
import { savingsLeftThisMonth } from './cash';
import { checkingAt, checkingsOf, lendingOf, settleOverdraftInterest } from './lending';
import { closeCard, stateOf } from './credit';
import { closeRefusal, sendBetweenBanks } from './bankmoves';
import { recordInterest } from './earnings';

/**
 * A country's unclaimed-money law, in the words a player is told. The US's research is New York's (the State
 * Comptroller, no fee and no time limit, three years), and until 2026-10-13 a life in Connecticut was told it would go
 * to New York's office and could be claimed back there (found by the review of that day). The words say any state's
 * office now. Connecticut’s own law was read later that day (Conn. Gen. Stat. §3-57a(a)(1): a demand or savings deposit
 * is presumed abandoned unless the owner has, within three years, moved money in or out or written to the bank about it;
 * §3-70a(a): claimed back from the Treasurer “at any time thereafter”; cga.ct.gov, chapter 32), and gives the same
 * three years; the source shown is Connecticut’s statute, and says the three years are taken for every state. Until then
 * it was New York’s research, a law firm’s note on its Comptroller, shown to a Connecticut life (found by that day’s
 * third round of defects); that research is still where the three years came from, and no screen shows it.
 */
export function unclaimedLaw(iso: string): (typeof UNCLAIMED)[string] | undefined {
  const law = UNCLAIMED[iso];
  if (!law || iso !== 'US') return law;
  return {
    ...law,
    to: 'the state’s unclaimed-property office',
    claimBack: 'It can be claimed back from that office.',
    source: 'each state’s own law: in Connecticut a deposit untouched three years is presumed abandoned (Conn. Gen. Stat. §3-57a) and can be claimed back from the State Treasurer at any time (§3-70a; cga.ct.gov, October 13, 2026); the game uses the three years for every state',
  };
}

/** The months to its end a term deposit was opened for. */
function termMonths(term: Account): number {
  if (term.maturesAt === undefined) return 12;
  return Math.max(1, Math.round((term.maturesAt - (term.renewedAt ?? term.openedAt)) / (30.44 * MS_DAY)));
}

function currentOf(sim: Simulation, person: Person): Account | undefined {
  return person.primaryAccountId ? sim.universe.accounts[person.primaryAccountId] : undefined;
}

function isoOfAccount(account: Account): string | undefined {
  return account.bankId ? bankById(account.bankId)?.iso : undefined;
}

/**
 * What breaking one of a bank's term deposits of so many months would cost, by the rule `breakQuote` charges, for the
 * deposit's panel to say before Put It Away (from 2026-10-20, brief 17, section 8): until then it said only that breaking
 * one, "where the bank lets you", was under Your Accounts Over Time, and its cost showed once the money was locked.
 */
export function breakRuleWords(bankId: string, months: number): string {
  const rules = ACCOUNT_LIFE[bankId];
  const name = bankById(bankId)?.name ?? 'The bank';
  if (rules?.early === false) return `${name} doesn’t let a term deposit be broken before its end.`;
  if (rules?.penaltyDays) {
    const band = rules.penaltyDays.find((one) => one.underMonths === undefined || months < one.underMonths) ?? rules.penaltyDays.at(-1)!;
    return `Breaking it early costs ${band.days} days’ interest on it${rules.penaltyCapped ? ', never more than it has earned' : ''}${rules.penaltyFirstWeekDays ? `, and at least ${rules.penaltyFirstWeekDays} days’ interest in its first week` : ''}.`;
  }
  const early = EARLY_RATE[bankId];
  if (early) return `Broken early, it’s paid ${name}’s ordinary savings rate for the time it was held, or ${Math.round(early.share * 100)}% of its own rate if it has run ${early.underMonths} months and that’s more.`;
  return `Breaking it early costs the interest it has earned so far. That’s estimated: ${rules?.penaltyWords ? 'the bank words its penalty another way' : 'no penalty was found for the bank'}.`;
}

/** What breaking a term deposit now would cost, or why it can't be broken. */
export function breakQuote(sim: Simulation, term: Account): { penalty: Money; estimate: boolean; refused?: string; words?: string } {
  const rules = term.bankId ? ACCOUNT_LIFE[term.bankId] : undefined;
  const earned = Math.floor(term.accrued ?? 0);
  // In its grace window after renewing, or its cooling-off period, it comes out whole.
  if ((term.graceUntil !== undefined && sim.now <= term.graceUntil) || inCoolingOff(sim, term)) return { penalty: 0, estimate: false };
  if (rules?.early === false) return { penalty: 0, estimate: false, refused: `${term.institution ?? 'The bank'} doesn’t let a term deposit be broken before its end.`, ...(rules.penaltyWords ? { words: rules.penaltyWords } : {}) };
  if (rules?.penaltyDays) {
    const months = termMonths(term);
    const band = rules.penaltyDays.find((one) => one.underMonths === undefined || months < one.underMonths) ?? rules.penaltyDays.at(-1)!;
    const daysOf = (days: number) => Math.round(Math.max(0, term.balance) * (term.fixedRate ?? 0) * days / 365);
    let penalty = daysOf(band.days);
    if (rules.penaltyCapped) penalty = Math.min(penalty, earned);
    // In the term's first week, a week's interest at least, whatever the cap.
    if (rules.penaltyFirstWeekDays && sim.now - (term.renewedAt ?? term.openedAt) < 7 * MS_DAY) penalty = Math.max(penalty, daysOf(rules.penaltyFirstWeekDays));
    return { penalty, estimate: false, ...(rules.penaltyWords ? { words: rules.penaltyWords } : {}) };
  }
  const early = term.bankId ? EARLY_RATE[term.bankId] : undefined;
  if (early) {
    const bank = bankById(term.bankId!)!;
    const ordinary = rateOn(bank.savings, sim.now, sim.homeZone);
    const from = term.renewedAt ?? term.openedAt;
    const months = (sim.now - from) / (30.4375 * MS_DAY);
    const rate = months < early.underMonths ? ordinary : Math.max(ordinary, (term.fixedRate ?? 0) * early.share);
    const paid = Math.round(Math.max(0, term.balance) * rate * ((sim.now - from) / MS_DAY) / 365);
    return { penalty: Math.max(0, earned - paid), estimate: false, ...(rules?.penaltyWords ? { words: rules.penaltyWords } : {}) };
  }
  // Worded another way, or not found: the interest so far is forfeited, SLATE's estimate.
  return { penalty: earned, estimate: true, ...(rules?.penaltyWords ? { words: rules.penaltyWords } : {}) };
}

/**
 * Where an account canceled in its cooling-off period keeps the interest it earned there (from 2026-10-15: until then a
 * savings account or term deposit canceled anywhere came back without it, and a current account canceled anywhere was
 * paid it). Each rule was read that day:
 *
 * - Britain: the bank may charge only for the service actually provided, and nothing “construed as a penalty” (FCA
 *   BCOBS 6.3.2R, https://www.handbook.fca.org.uk/handbook/BCOBS/6/3.html); Nationwide's terms say that within the 14
 *   days it “will not deduct any interest you have earned to date” (Savings Account Terms and Conditions P2797, January
 *   2026, condition 76, https://www.nationwide.co.uk/-/assets/nationwidecouk/documents/savings/terms-and-conditions/p2797-savings-accounts.pdf).
 * - Canada: the bank closes the account “without charge” and refunds its charges (SOR/2021-181 s.5(2),
 *   https://lois-laws.justice.gc.ca/eng/regulations/SOR-2021-181/FullText.html); nothing there takes back interest
 *   earned, so it's paid as any close pays it.
 * - The European Union's rule, which Germany, France, Spain, Ireland and Iceland (through the EEA) carry, is the other
 *   way: the bank returns what it received and the consumer “shall return to the supplier any sums … he has received
 *   from the supplier” (Directive 2002/65/EC art. 7(4)-(5), https://www.legislation.gov.uk/eudr/2002/65/article/7).
 *   Germany's words are the same, “die empfangenen Leistungen” returned (BGB § 355(3),
 *   https://www.gesetze-im-internet.de/bgb/__355.html), and Deutsche Bank's notice says “die beiderseits empfangenen
 *   Leistungen” (its pre-contract information for ZinsMarkt-Festgeld, February 2025,
 *   https://www.deutsche-bank.de/dam/deutschebank/de/shared/pdf/ser_vvi_fernabsatz_vertraege_finanzdienstleistungen_zinsmarkt_ag.pdf).
 *   Iceland's own act (lög 33/2005) wasn't read: althingi.is refused SLATE's fetch.
 * - Mexico returns things “al estado en el que se encontraban antes de su firma” (Ley para la Transparencia y
 *   Ordenamiento de los Servicios Financieros, art. 11 Bis 1, as amended to 24 January 2024,
 *   https://www.cnbv.gob.mx/Normatividad/Ley%20para%20la%20transparencia%20y%20ordenamiento%20de%20los%20servicios%20financieros.pdf).
 *
 * Where it isn't kept, interest already paid in the window goes back (`interestPaidSince`) and what was building is
 * dropped.
 */
const KEEPS_INTEREST: ReadonlySet<string> = new Set(['GB', 'CA']);

/**
 * Where canceling refunds the bank's charges while the account was open, other than a machine owner's: Canada's,
 * “any charges related to the operation of the retail deposit account, other than interest charges” (SOR/2021-181
 * s.5(2)(b)), for any deposit account, savings among them; and Mexico's, where the bank “no podrán cobrar Comisión
 * alguna” (art. 11 Bis 1). Until 2026-10-15 only a Canadian current account's came back, and a Canadian savings
 * account's withdrawal fee, or anything Mexico's banks charged, was kept.
 */
const REFUNDS_CHARGES: ReadonlySet<string> = new Set(['CA', 'MX']);

/**
 * The interest an account was paid since it opened, each payment's transaction: into it, or a term's taken out of it,
 * which carries the term itself, a posting of nothing (`bank.take_term_interest`). Until 2026-10-15's second recheck a
 * term's taken interest was matched by its memo alone, and every term at a bank has the same name, so canceling a new
 * Deutsche Bank FestzinsSparen took back the €6.93 an older one had paid, out of the primary and off the year's income
 * (found by that day's skeptic). Interest taken before then carries no such posting, and until 2026-10-16 it wasn't
 * found: canceling the term left it paid and on the year's income, where the rule returns it. From then it's found once,
 * when a save that build wrote is opened (`findTermInterest`), and kept on the term (`untaggedTakes`).
 */
function interestPaidSince(sim: Simulation, account: Account) {
  const untagged = new Set(account.untaggedTakes ?? []);
  return sim.universe.transactions.filter((t) => t.category === 'interest' && t.at >= account.openedAt
    && (untagged.has(t.id) || t.postings.some((q) => q.accountId === account.id && (q.amount > 0 || (account.category === 'term' && q.amount === 0)))));
}

/**
 * The interest taken out of term deposits during their term by a build before 2026-10-15's second recheck, found once
 * when a save that build wrote is opened (`loadSave`, named in `SaveUniverse.opened`, from 2026-10-16), and kept on each
 * term (`untaggedTakes`) so canceling it in its cooling-off period gives it back as the country's rule has it
 * (`interestPaidSince`, `bank.cancel_new`). Returns how many transactions were found.
 *
 * That build posted a take as the primary account's net, the Interest line's gross and any Tax On Interest, under
 * “Interest: <the term's name>”, a name every term at the bank shares, and nothing against the term. What tells two
 * same-named terms apart is the term itself: it builds its balance × its fixed rate / 365 at each day's end
 * (`systems/lending.ts`), a take is the whole cents built then (`bank.take_term_interest`), and what's left is its
 * `accrued`. So each term has its accrual replayed from its opening to now, day end by day end, the build's own
 * arithmetic in its own order, through the untagged takes under its name since it opened that no earlier term has
 * claimed. A take is its own where its gross is what the replay has built then, and the set taken is the one that leaves
 * exactly its `accrued` now: the earliest such set where two would (twins opened together and taken the same day leave
 * the same sums either way). Terms are read oldest first. Where no set leaves its `accrued` (a take the replay can't
 * reproduce), nothing is found for it: the interest stays paid, as the build that paid it left it, rather than taken back
 * from a term that may not have paid it. Nothing is posted, and no transaction is changed.
 */
export function findTermInterest(sim: Simulation): number {
  const accounts = sim.universe.accounts;
  const terms = Object.values(accounts).filter((a) => a.category === 'term');
  const termIds = new Set(terms.map((a) => a.id));
  const income = Object.values(accounts).find((a) => a.nominal && a.kind === 'income' && a.name === 'Interest');
  if (!income) return 0;
  const grossOf = (t: LedgerTransaction) => -t.postings.filter((q) => q.accountId === income.id).reduce((n, q) => n + q.amount, 0);
  const claimed = new Set<string>();
  // Every term, oldest first. Whether it's open, which country or bank it's at, and whether it renewed aren't asked: a take
  // is found only where the replay reproduces the term, and a closed one (holding nothing, building nothing) and one that
  // renewed (its balance and what it had built changed then) don't, and a term no country lets be canceled reads nothing
  // it's given. Asking them changed no outcome (each survived its mutation, 2026-10-16), and they went.
  const inOrder = [...terms].sort((a, b) => a.openedAt - b.openedAt || a.id.localeCompare(b.id));
  let found = 0;
  for (const term of inOrder) {
    const into = (q: { accountId: string; amount: Money }) => q.amount > 0 && accounts[q.accountId]?.ownerId === term.ownerId && !accounts[q.accountId]?.nominal;
    const candidates = sim.universe.transactions.filter((t) => t.category === 'interest' && t.memo === `Interest: ${term.name}` && t.at >= term.openedAt
      && !claimed.has(t.id) && !t.postings.some((q) => termIds.has(q.accountId)) && t.postings.some(into) && grossOf(t) > 0);
    if (candidates.length === 0) continue;
    const fits = replayTakes(sim, term, candidates, grossOf);
    if (!fits) continue;
    term.untaggedTakes = fits.map((t) => t.id);
    for (const t of fits) claimed.add(t.id);
    found += fits.length;
  }
  return found;
}

/** The candidates a term's own accrual, replayed from its opening, says it paid, or nothing where no set reproduces it. */
function replayTakes(sim: Simulation, term: Account, candidates: LedgerTransaction[], grossOf: (t: LedgerTransaction) => Money): LedgerTransaction[] | undefined {
  // Each day's end builds this, as `systems/lending.ts` builds it, the same expression in the same order.
  const daily = (Math.max(0, term.balance) * (term.fixedRate ?? 0)) / 365;
  // Takes this build tagged with the term since: its own, fixed.
  const tagged = sim.universe.transactions.filter((t) => t.category === 'interest' && t.at >= term.openedAt && t.postings.some((q) => q.accountId === term.id && q.amount === 0));
  const events: { at: Instant; kind: 0 | 1 | 2; t?: LedgerTransaction }[] = [];
  for (let d = startOfNextDay(term.openedAt, sim.homeZone); d <= sim.now; d = startOfNextDay(d, sim.homeZone)) events.push({ at: d, kind: 0 });
  for (const t of tagged) events.push({ at: t.at, kind: 1, t });
  for (const t of candidates) events.push({ at: t.at, kind: 2, t });
  // A day's end runs before a command at its instant; transactions keep the ledger's order (a stable sort).
  events.sort((a, b) => a.at - b.at || a.kind - b.kind);
  const want = term.accrued ?? 0;
  const pick: LedgerTransaction[] = [];
  let steps = 0;
  const walk = (from: number, built: number): boolean => {
    let acc = built;
    for (let i = from; i < events.length; i += 1) {
      if ((steps += 1) > 100_000) return false;
      const e = events[i]!;
      if (e.kind === 0) { acc = acc + daily; continue; }
      const earned = Math.floor(acc);
      if (e.kind === 1) {
        if (grossOf(e.t!) !== earned) return false;
        acc = acc - earned;
        continue;
      }
      // A candidate: taken from this term, or left for another.
      if (earned > 0 && grossOf(e.t!) === earned) {
        pick.push(e.t!);
        if (walk(i + 1, acc - earned)) return true;
        pick.pop();
      }
    }
    return Math.abs(acc - want) < 1e-6;
  };
  return walk(0, 0) && pick.length > 0 ? [...pick] : undefined;
}

/**
 * What canceling would take back of the interest it paid, net of the tax kept on it, where it isn't kept: by the holder's
 * account each payment went into. A term's interest taken during the term (`bank.take_term_interest`) went into the
 * primary current account, and the reversal takes it back out of there. Until 2026-10-15's recheck only what was paid
 * into the account itself was counted, so nothing refused a cancellation that took it from a primary account holding
 * less, and a Commerzbank primary was left at −€6.30 by a Deutsche Bank term (found by that day's skeptic). It's taken
 * from where it went, not from the deposit: Deutsche Bank's own terms say only that each side returns what it received,
 * within 30 days (“Verpflichtungen zur Erstattung von Zahlungen müssen innerhalb von 30 Tagen erfüllt werden”, the
 * Widerrufsfolgen of its ZinsMarkt pre-contract information, cited at `KEEPS_INTEREST`, read 2026-10-15), and nothing of
 * keeping it back from the deposit.
 */
function interestBackOf(sim: Simulation, account: Account): Map<string, Money> {
  const back = new Map<string, Money>();
  if (account.kind === 'credit_card' || KEEPS_INTEREST.has(isoOfAccount(account) ?? '')) return back;
  for (const q of interestPaidSince(sim, account).flatMap((t) => t.postings)) {
    if (q.amount > 0 && sim.universe.accounts[q.accountId]?.ownerId === account.ownerId) back.set(q.accountId, (back.get(q.accountId) ?? 0) + q.amount);
  }
  return back;
}

/**
 * The charges canceling would refund, where the country refunds them, by the expense line each was charged to. Not
 * overdraft interest, which is posted as a bank fee (`systems/lending.ts`, against Overdraft Interest): Canada refunds
 * charges “other than interest charges” (SOR/2021-181 s.5(2)(b), read 2026-10-15), and Mexico's “Comisión” is a fee, not
 * interest (art. 11 Bis 1). Until 2026-10-15's recheck every bank fee came back, overdraft interest with it, and all of
 * it against Bank Fees (found by that day's skeptic: C$23.76 refunded in Toronto, C$1.81 of it interest).
 */
function chargesBackOf(sim: Simulation, account: Account): Map<string, Money> {
  const back = new Map<string, Money>();
  if (account.kind === 'credit_card' || !REFUNDS_CHARGES.has(isoOfAccount(account) ?? '')) return back;
  for (const t of sim.universe.transactions) {
    if (t.category !== 'bank_fee' || t.at < account.openedAt || t.memo === 'The machine owner’s fee' || !t.postings.some((q) => q.accountId === account.id)) continue;
    const lines = t.postings.filter((q) => sim.universe.accounts[q.accountId]?.nominal);
    if (lines.some((q) => sim.universe.accounts[q.accountId]?.name === 'Overdraft Interest')) continue;
    for (const q of lines) back.set(q.accountId, (back.get(q.accountId) ?? 0) + q.amount);
  }
  return back;
}

const total = (m: Map<string, Money>) => [...m.values()].reduce((n, v) => n + v, 0);

/** What canceling an account gives back, in the panel's words: with or without its interest, and its fees. */
export function cancelWords(account: Account): string {
  if (account.kind === 'credit_card') return 'with anything spent still to repay';
  const iso = isoOfAccount(account) ?? '';
  const interest = KEEPS_INTEREST.has(iso) ? 'its money back with its interest' : 'its money back without the interest it earned';
  return `${interest}${REFUNDS_CHARGES.has(iso) ? ', and its fees refunded' : account.kind === 'checking' ? ', less the fees it owes' : ''}`;
}

/**
 * Why an account can't be canceled in its cooling-off period now, or nothing: a current account's Close It refusals
 * (`closeRefusal`), and for any account what settling it takes past what it holds, fees owed and interest going back,
 * which would leave it overdrawn, and the bank closes an overdrawn account only once that's paid (from 2026-10-15, when
 * canceling began to charge fees; the interest going back from the same day). Where the fees are refunded, none are
 * owed; where interest is kept, what it's paid counts toward them. The panel and the command both read it.
 */
export function cancelRefusal(sim: Simulation, person: Person, account: Account): string | undefined {
  if (account.kind === 'checking') {
    const no = closeRefusal(sim, person, account);
    if (no) return no;
  }
  const iso = isoOfAccount(account) ?? '';
  const owed = REFUNDS_CHARGES.has(iso) ? 0 : closingFeesOf(sim, account);
  const earned = KEEPS_INTEREST.has(iso) ? Math.floor(account.accrued ?? 0) : 0;
  const backs = interestBackOf(sim, account);
  const back = backs.get(account.id) ?? 0;
  const short = owed + back - account.balance - total(chargesBackOf(sim, account)) - (earned > 0 ? earned - interestTaxFor(sim, account, earned) : 0);
  const m = (n: Money) => formatMoney(n, saveCurrency(sim.universe));
  // The overdraft interest built since the 1st, charged on canceling from 2026-10-16 (`settleOverdraftInterest`), is
  // counted by Close It's refusal above: only a current account builds it.
  if (short > 0) {
    const what = owed > 0 && back > 0 ? `Its fees, ${m(owed)}, and the interest it was paid, ${m(back)}, are` : owed > 0 ? `Its fees, ${m(owed)}, are` : `The interest it was paid, ${m(back)}, goes back, and is`;
    return `${what} more than it holds. Move ${m(short)} into it first.`;
  }
  // Interest it paid into another account, a term's taken during the term, goes back out of that one (from 2026-10-15's
  // recheck, `interestBackOf`).
  for (const [id, amount] of backs) {
    const into = sim.universe.accounts[id];
    if (id === account.id || !into || amount <= into.balance) continue;
    return `Canceling takes back the ${m(amount)} of interest it paid into ${into.name}, which holds less than that. Move ${m(amount - into.balance)} into ${into.name} first.`;
  }
  return undefined;
}

/**
 * Where the cooling-off period is counted in business days at the bank's country: Canada's “within 14 business days
 * after the day on which the retail deposit account is opened” (SOR/2021-181 s.5(1), read 2026-10-15) and Mexico's
 * “diez días hábiles posteriores a la firma” (Ley para la Transparencia y Ordenamiento de los Servicios Financieros art.
 * 11 Bis 1, text in force at its last reform of 14 November 2025, https://www.diputados.gob.mx/LeyesBiblio/pdf/LTOSF.pdf,
 * read 2026-10-15). Until 2026-10-15's recheck both were counted in calendar days, which ended Canada's four or more
 * days early and Mexico's from four.
 */
const BUSINESS_DAY_COOLING: ReadonlySet<string> = new Set(['CA', 'MX']);

/** When an account's cooling-off period ends, on its country's count, or nothing where there's none. */
export function coolingOffEnds(sim: Simulation, account: Account): Instant | undefined {
  const iso = isoOfAccount(account);
  const days = iso ? UNCLAIMED[iso]?.coolingOffDays : undefined;
  if (days === undefined) return undefined;
  // To the end of its last day, in the save's zone, which is the bank's country's: each rule counts days, not hours, the
  // fourteen “calendar days” of Directive 2002/65/EC art. 6(1), Canada's “within 14 business days after the day on
  // which [it] is opened” and Mexico's “diez días hábiles posteriores”. Until 2026-10-15's second recheck it ended at
  // the hour the account opened, so an RBC account opened at 7:30 AM on 5 January, “until January 23” on the panel, was
  // refused at 11:30 AM on the 23rd (found by that day's skeptic).
  if (!BUSINESS_DAY_COOLING.has(iso!)) return endOfDay(addDays(account.openedAt, days, sim.homeZone), sim.homeZone);
  const holder = account.ownerId ? sim.universe.people[account.ownerId] : undefined;
  const kept = daysOfAccount(account, holder);
  return endOfDay(afterBusinessDays(account.openedAt, days, kept.countryId, sim.homeZone, kept.regionId), sim.homeZone);
}

/**
 * Whether it's been used since it opened, as Mexico's right asks: a payment out of it by its holder, a card's purchase
 * among them, and not the bank's own fees, its interest or its tax on it. Money paid in isn't counted, an account being
 * funded to be opened. Mexico's period holds only “siempre y cuando el Cliente no haya utilizado u operado los productos
 * o servicios financieros contratados” (art. 11 Bis 1); until 2026-10-15's recheck a Mexican account could be canceled
 * however it had been used.
 */
function usedSince(sim: Simulation, account: Account): boolean {
  const list = sim.universe.transactions;
  for (let i = list.length - 1; i >= 0 && list[i]!.at >= account.openedAt; i -= 1) {
    const t = list[i]!;
    if (t.category !== 'interest' && t.category !== 'bank_fee' && t.postings.some((q) => q.accountId === account.id && q.amount < 0)) return true;
  }
  return false;
}

/** Whether an account or card is still within its country's cooling-off period. */
export function inCoolingOff(sim: Simulation, account: Account): boolean {
  const iso = isoOfAccount(account);
  const ends = coolingOffEnds(sim, account);
  if (ends === undefined) return false;
  // Britain's rules except fixed-rate deposits.
  if (iso === 'GB' && account.category === 'term') return false;
  // Canada's regulation prescribes a cancellation period for a retail deposit account (s.5) and a deposit-type
  // instrument (s.6), and none for a credit card: section 627.11 of the Bank Act lets one be canceled “in accordance
  // with any prescribed requirements”, and SOR/2021-181 prescribes none (s.4's list has no card; read 2026-10-15,
  // https://laws-lois.justice.gc.ca/eng/regulations/SOR-2021-181/FullText.html). Until 2026-10-15's recheck a Canadian
  // card could be canceled in 14 days, which no Canadian rule gives.
  if (iso === 'CA' && account.kind === 'credit_card') return false;
  // Korea's withdrawal of a subscription (청약철회) is for insurance, investment and lending products only, not deposits
  // (금융소비자 보호에 관한 법률 제46조 1항, as easylaw.go.kr's guide to it sets out, read 2026-10-15:
  // https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=1771&ccfNo=1&cciNo=2&cnpClsNo=1). Until 2026-10-15 a
  // Korean savings account, term deposit or current account could be canceled in 14 days, which no Korean rule gives.
  // A card, a lending product, keeps them; that its 14 days hold for a card wasn't confirmed that day.
  if (iso === 'KR' && account.kind !== 'credit_card') return false;
  return sim.now <= ends && !(iso === 'MX' && usedSince(sim, account));
}

/**
 * Withdrawals from savings this month, for the bank's free count: every
 * payment out, not the bank's own interest tax or fees. Until 2026-09-27 it
 * counted only a move by hand, in the clock's zone rather than the bank's
 * month, and a payment the linked savings made was never counted or charged.
 */
function withdrawalsThisMonth(sim: Simulation, account: Account): number {
  const p = zonedParts(sim.now, sim.homeZone);
  const since = instantFromZoned({ year: p.year, month: p.month, day: 1, hour: 0 }, sim.homeZone);
  let n = 0;
  const list = sim.universe.transactions;
  for (let i = list.length - 1; i >= 0 && list[i]!.at >= since; i -= 1) {
    const t = list[i]!;
    if (t.category !== 'interest' && t.category !== 'bank_fee' && t.postings.some((q) => q.accountId === account.id && q.amount < 0)) n += 1;
  }
  return n;
}

/** The fee a withdrawal from savings costs now, past the bank's free ones a month (B12, B33). */
export function savingsWithdrawalFee(sim: Simulation, account: Account): Money {
  if (account.kind !== 'savings' || account.category === 'term' || !account.bankId) return 0;
  const rules = ACCOUNT_LIFE[account.bankId];
  if (rules?.freeWithdrawals === undefined || !rules.withdrawalFee) return 0;
  // In the save's money: until 2026-09-27 a Canadian or New Zealand fee was taken in the bank's own hundredths.
  return withdrawalsThisMonth(sim, account) >= rules.freeWithdrawals ? inSaveMoney(sim, rules.withdrawalFee, bankById(account.bankId)!.currency) : 0;
}

/**
 * What can come out of easy-access savings now, and what the next
 * withdrawal costs: the balance less the fee, and no more than Germany's
 * monthly allowance without notice. Every way money leaves savings reads
 * it: a move by hand, the linked sweep, a scheduled payment, the card paid
 * from the bank.
 */
export function savingsDebit(sim: Simulation, account: Account): { room: Money; fee: Money } {
  const fee = savingsWithdrawalFee(sim, account);
  const left = savingsLeftThisMonth(sim, account);
  return { room: Math.max(0, Math.min(account.balance - fee, left ?? Infinity)), fee };
}

/**
 * The days' notice a bank needs before it closes a term deposit early, where
 * its terms ask for it: NatWest's Fixed Term Savings, 35 (its own words are
 * kept in `penaltyWords`). Until 2026-09-27 SLATE broke it at once.
 */
export const BREAK_NOTICE: Readonly<Record<string, number>> = { 'gb-natwest': 35 };

/** A term deposit closing on the notice given (`bank.break_term`), on the clock for the moment its notice runs out. */
export const TERM_NOTICE_KIND = 'bank.term_notice';

/**
 * A bank whose early rate is a rule rather than days of interest: MUFG's
 * 期限前解約利率 pays the ordinary deposit's rate on a time deposit broken in
 * its first six months, and 70% of the posted rate for the time it's run
 * after, never less than the ordinary rate (bk.mufg.jp, スーパー定期 rules,
 * 12 September 2022). SLATE carries only the twelve-month rate and takes it
 * for the six-month one. Until 2026-09-28 MUFG's term forfeited all its
 * interest, as a bank's whose rule wasn't read does.
 */
export const EARLY_RATE: Readonly<Record<string, { underMonths: number; share: number }>> = { 'jp-mufg': { underMonths: 6, share: 0.7 } };

/** A term deposit broken now: the penalty from its interest, and from the deposit where that won't cover it. */
function breakTerm(s: Simulation, person: Person, term: Account): { paid: Money; penalty: Money } {
  const quote = breakQuote(s, term);
  // Into the current account at the term's own bank; with none there, sent to the primary one in the bank's days, as a
  // savings account closed is (from 2026-10-13: until then into the primary account at once, whatever bank it was at;
  // found by the review of that day). Every life holds a primary account from its creation, and the primary can’t be
  // closed, so there’s always one: until 2026-10-13 `bank.break_term` refused a life without a current account, and the
  // notice close waited for one, which no life could be; found by that day’s second round of evidence.
  const into = checkingAt(s, person, term.bankId) ?? currentOf(s, person)!;
  const sameBank = into.bankId === term.bankId;
  const earned = Math.floor(term.accrued ?? 0);
  const kept = Math.max(0, earned - quote.penalty);
  const fromPrincipal = Math.max(0, quote.penalty - earned);
  const tax = interestTaxFor(s, term, kept);
  const paid = term.balance - fromPrincipal + kept - tax;
  const postings = sameBank
    ? [{ accountId: into.id, amount: paid }, { accountId: term.id, amount: -term.balance }]
    : [{ accountId: term.id, amount: paid - term.balance }];
  if (kept > 0) postings.push({ accountId: s.nominalAccount('income', 'Interest').id, amount: -kept });
  if (tax > 0) postings.push({ accountId: s.nominalAccount('expense', 'Tax On Interest').id, amount: tax });
  if (fromPrincipal > 0) postings.push({ accountId: s.nominalAccount('expense', 'Early Withdrawal Penalty').id, amount: fromPrincipal });
  const moved = postings.filter((q) => q.amount !== 0);
  if (moved.length >= 2) s.post({ memo: `${term.name} broken early`, category: kept > 0 ? 'interest' : 'transfer', postings: moved });
  if (!sameBank && paid > 0) sendBetweenBanks(s, person, term, into, paid);
  // What it kept of its interest is income, as at its end (`creditInterest`; from 2026-10-14, until then not recorded).
  if (kept > 0) recordInterest(person, s.now, s.homeZone, kept);
  term.accrued = 0;
  term.closedAt = s.now;
  delete term.breakAt;
  return { paid, penalty: quote.penalty };
}

export function registerAccountLife(sim: Simulation): void {
  sim.onEvent('world.day_rollover', 'bank.account_life', (_event, { sim: s }) => {
    for (const person of Object.values(s.universe.people)) {
      // Round-ups, by the bank's own rule (`systems/roundups.ts`, from 2026-10-13): until then the day's change moved
      // every night at every bank, into easy-access savings at the current account's bank (from 2026-10-12; the first
      // savings found at any bank before), and stayed in the current account on a day it was short.
      moveRoundUps(s, person);
      for (const account of Object.values(s.universe.accounts)) {
        if (account.ownerId !== person.id || account.closedAt || !account.bankId) continue;
        const rules = ACCOUNT_LIFE[account.bankId];
        // An early close on notice is on the clock for the moment the notice runs out (`TERM_NOTICE_KIND`): until
        // 2026-10-13 it waited here for the first midnight after, so a notice the screen said closed on 10 February
        // paid on the 11th (found by that day's final checks).
        // A term deposit's end: the bank writes a month before, or in time
        // for any notice it needs to change what happens (B41).
        if (account.category === 'term' && account.maturesAt !== undefined && rules?.atEnd && !account.maturityNoticed && account.maturesAt - s.now <= noticeLead(rules) * MS_DAY) {
          account.maturityNoticed = true;
          if (person.id === s.universe.playerId) s.notify({ category: 'bank', title: `Your ${account.name} Ends Soon`, body: `On ${formatDate(account.maturesAt, s.zone)} it ${END_WORDS[termEndOf(account)]}.${(rules.endChoices?.length ?? 0) > 1 ? ` You can change that${rules.endNoticeDays ? ` until ${rules.endNoticeDays} days before` : ''}.` : ''}${rules.graceDays && termEndOf(account) === 'renews' ? ` After it renews you have ${rules.graceDays} days to take the money without a penalty.` : ''}`, importance: 45, route: '/workspace/bank' });
        }
      }
    }
  });

  sim.onCommand<{ accountId: string; atEnd: TermEnd }, { atEnd: TermEnd }>('bank.set_term_end', (p, { sim: s }) => {
    const term = s.universe.accounts[p.accountId];
    if (!term || term.ownerId !== s.player.id || term.closedAt || term.category !== 'term') throw new CommandError('That isn’t one of your term deposits.');
    const rules = ACCOUNT_LIFE[term.bankId ?? ''];
    const choices = rules?.endChoices ?? ['paid_out'];
    if (!choices.includes(p.atEnd)) throw new CommandError(`${term.institution ?? 'The bank'} doesn’t let a term deposit end that way.`);
    const notice = rules?.endNoticeDays ?? 0;
    if (term.maturesAt !== undefined && term.maturesAt - s.now < notice * MS_DAY) throw new CommandError(`${term.institution ?? 'The bank'} needs ${notice} days’ notice before the end to change it.`);
    if (p.atEnd === (rules?.atEnd ?? 'paid_out')) delete term.atEnd;
    else term.atEnd = p.atEnd;
    return { atEnd: p.atEnd };
  });

  sim.onCommand<{ accountId: string }, { paid: Money; penalty: Money; at?: Instant }>('bank.break_term', (p, { sim: s }) => {
    const person = s.player;
    const term = s.universe.accounts[p.accountId];
    if (!term || term.ownerId !== person.id || term.closedAt || term.category !== 'term') throw new CommandError('That isn’t one of your term deposits.');
    const quote = breakQuote(s, term);
    if (quote.refused) throw new CommandError(quote.refused);
    // A bank that needs notice closes it when the notice has run, at the penalty then.
    const notice = BREAK_NOTICE[term.bankId ?? ''];
    if (notice) {
      if (term.breakAt !== undefined) throw new CommandError(`It already closes on ${formatDate(term.breakAt, s.zone)}, on the notice you gave.`);
      term.breakAt = s.now + notice * MS_DAY;
      s.schedule({ at: term.breakAt, kind: TERM_NOTICE_KIND, label: `${term.name} Closes`, category: 'home', priority: 36, payload: { personId: person.id, accountId: term.id } });
      return { paid: 0, penalty: quote.penalty, at: term.breakAt };
    }
    return breakTerm(s, person, term);
  });

  // The early close on notice, the moment the notice has run, on the day the screen and the refusal name.
  sim.onSchedule(TERM_NOTICE_KIND, (item, s) => {
    const person = s.universe.people[String(item.payload.personId)];
    const account = s.universe.accounts[String(item.payload.accountId)];
    if (!person || !account || account.closedAt || account.breakAt === undefined) return;
    const done = breakTerm(s, person, account);
    // What’s paid is after the charge (`breakTerm`): until 2026-10-13 this said “£10,000.00 … less £39.41”, where
    // £10,000.00 was what arrived, the £39.41 already kept back (found by that day’s third round of defects).
    if (person.id === s.universe.playerId) s.notify({ category: 'bank', title: `Your ${account.name} Closed`, body: `Your notice period ended: ${formatMoney(done.paid, saveCurrency(s.universe))} went to your checking account, after a ${formatMoney(done.penalty, saveCurrency(s.universe))} penalty for closing early.`, importance: 50, route: '/workspace/bank' });
  });

  sim.onCommand<{ accountId: string }, { paid: Money }>('bank.take_term_interest', (p, { sim: s }) => {
    const person = s.player;
    const term = s.universe.accounts[p.accountId];
    if (!term || term.ownerId !== person.id || term.closedAt || term.category !== 'term') throw new CommandError('That isn’t one of your term deposits.');
    if (!ACCOUNT_LIFE[term.bankId ?? '']?.interestDuringTerm) throw new CommandError(`${term.institution ?? 'The bank'} pays a term deposit’s interest at its end.`);
    const earned = Math.floor(term.accrued ?? 0);
    const into = currentOf(s, person);
    if (earned <= 0 || !into) throw new CommandError('It hasn’t earned anything to take yet.');
    const tax = interestTaxFor(s, term, earned);
    // The term itself is carried, a posting of nothing, so canceling it finds what it paid by the account, never by the
    // name every term at the bank shares (`interestPaidSince`, from 2026-10-15's second recheck).
    const postings = [{ accountId: into.id, amount: earned - tax }, { accountId: s.nominalAccount('income', 'Interest').id, amount: -earned }, { accountId: term.id, amount: 0 }];
    if (tax > 0) postings.push({ accountId: s.nominalAccount('expense', 'Tax On Interest').id, amount: tax });
    s.post({ memo: `Interest: ${term.name}`, category: 'interest', postings });
    term.accrued = (term.accrued ?? 0) - earned;
    recordInterest(person, s.now, s.homeZone, earned);
    return { paid: earned - tax };
  });

  sim.onCommand<{ on: boolean } & RoundUpChoice, { on: boolean }>('bank.set_round_ups', (p, { sim: s }) => setRoundUps(s, p));

  sim.onCommand<{ accountId: string }, { accountId: string }>('bank.reactivate', (p, { sim: s }) => {
    const account = s.universe.accounts[p.accountId];
    // A dormant account, or one the bank has written about before handing it to the state: getting in touch keeps it.
    if (!account || account.ownerId !== s.player.id || (!account.dormant && account.escheatWarned === undefined)) throw new CommandError('That account isn’t dormant.');
    delete account.dormant;
    delete account.inactive;
    delete account.escheatWarned;
    account.reactivatedAt = s.now;
    for (const d of Object.values(s.universe.decisions)) if (d.refType === 'unclaimed-notice' && d.refId === account.id && !d.resolvedAt) d.resolvedAt = s.now;
    return { accountId: account.id };
  });

  sim.onCommand<{ accountId: string }, { refunded: Money }>('bank.cancel_new', (p, { sim: s }) => {
    const person = s.player;
    const account = s.universe.accounts[p.accountId];
    if (!account || account.ownerId !== person.id || account.closedAt) throw new CommandError('That isn’t one of your accounts.');
    if (!inCoolingOff(s, account)) throw new CommandError('Its cooling-off period has passed, or there isn’t one here for it.');
    const into = currentOf(s, person);
    if (account.kind === 'credit_card') {
      // Canceled, with anything spent still to repay (C6).
      if (!person.credit) throw new CommandError('You don’t have a card.');
      stateOf(person, account).closing = s.now;
      // Owing nothing, closed now, a credit on it sent back first (`closeCard`, from 2026-10-24).
      if (account.balance >= 0) closeCard(s, person, account, 'now');
      return { refunded: 0 };
    }
    if (!into || into.id === account.id) throw new CommandError('You can’t cancel your primary account. Make another account primary first.');
    // A current account canceled like any close, on Close It's own refusals (`closeRefusal`, from 2026-10-15): until then
    // only what still used it was asked (`linkedTo`, from 2026-10-10), so one overdrawn closed with its debt, and one
    // with money on its way, card payments pending or savings beside it closed too; found by that day's scope pass. A
    // savings account's orders into it go with it, as they always have (`dropPaymentsFor`). From 2026-10-15 too, fees owed
    // past what it holds (`cancelRefusal`), and for savings and a term deposit too, which until then were asked nothing.
    const refused = cancelRefusal(s, person, account);
    if (refused) throw new CommandError(refused);
    // Canceled, it settles as Close It settles (`closeNow`, systems/bankmoves.ts), as the country's rule has it: its fees
    // charged and its overdraft gone with it, and its interest paid where the rule leaves the holder what it earned
    // (`KEEPS_INTEREST`, from 2026-10-15). A current account closed with neither until then, its interest lost and a
    // German account's quarter's fees unpaid, where the guide said it closed the same way (found by that day's skeptic);
    // and from that day until the same day's later pass it was paid its interest in every country, Germany and Iceland
    // among them, whose rule returns it. The fees are the service actually provided, which Britain lets the bank charge on
    // a cancellation (FCA BCOBS 6.3.2R, https://www.handbook.fca.org.uk/handbook/BCOBS/6/3.html, read 2026-10-15) and
    // Germany too, as Wertersatz (BGB § 357b(2), https://www.gesetze-im-internet.de/bgb/__357b.html, read 2026-10-15).
    // Canada and Mexico are the other way: their charges come back (`REFUNDS_CHARGES`), a machine owner's fee, a third
    // party's, aside.
    if (KEEPS_INTEREST.has(isoOfAccount(account) ?? '')) settleInterest(s, account, `Interest: ${account.name}, on canceling`);
    else {
      // What it was paid goes back as it came, its tax with it, and off the year's income (`recordInterest`).
      const owner = account.ownerId ? s.universe.people[account.ownerId] : undefined;
      for (const t of interestPaidSince(s, account)) {
        s.post({ memo: `Interest returned: ${account.name}, canceled`, category: 'interest', postings: t.postings.filter((q) => q.amount !== 0).map((q) => ({ accountId: q.accountId, amount: -q.amount })) });
        const gross = -t.postings.filter((q) => q.accountId === s.nominalAccount('income', 'Interest').id).reduce((n, q) => n + q.amount, 0);
        if (owner && gross > 0) recordInterest(owner, t.at, s.homeZone, -gross);
      }
    }
    // The overdraft interest built since the 1st, from 2026-10-16 (`settleOverdraftInterest`): until then it was dropped.
    settleOverdraftInterest(s, account);
    settleFees(s, account);
    // Each charge back against the line it was charged to (from 2026-10-15's recheck: until then all of it against Bank
    // Fees, overdraft interest included).
    const charges = chargesBackOf(s, account);
    const refund = total(charges);
    if (refund > 0) s.post({ memo: `Fees refunded: ${account.name}, canceled`, category: 'bank_fee', postings: [{ accountId: account.id, amount: refund }, ...[...charges].filter(([, n]) => n !== 0).map(([id, n]) => ({ accountId: id, amount: -n }))] });
    account.overdraftLimit = undefined;
    // Into a current account at its own bank; with none there, sent to the primary one in the bank’s days, as a
    // term broken and a savings account closed are (from 2026-10-13: until then into the primary account at once,
    // whatever bank it was at; found by that day’s final defect pass). Until 2026-10-15 a savings account or a term
    // deposit came back “whole”, without its interest or its charges, wherever it was.
    const back = Math.max(0, account.balance);
    const to = checkingsOf(s, person).find((a) => a.bankId === account.bankId && a.id !== account.id) ?? into;
    if (back > 0 && to.bankId !== account.bankId) sendBetweenBanks(s, person, account, to, back);
    else if (back > 0) s.post({ memo: `${account.name} canceled`, category: 'transfer', postings: [{ accountId: account.id, amount: -back }, { accountId: to.id, amount: back }] });
    account.accrued = 0;
    account.closedAt = s.now;
    dropPaymentsFor(s, person, account);
    return { refunded: back };
  });

  sim.onCommand<Record<string, never>, { claimed: Money }>('bank.claim_unclaimed', (_p, { sim: s }) => {
    const person = s.player;
    const held = person.unclaimed ?? [];
    const into = currentOf(s, person);
    if (held.length === 0 || !into) throw new CommandError('No money of yours is held as unclaimed.');
    let claimed = 0;
    for (const one of held) {
      s.post({ memo: `Unclaimed money returned from ${one.to}`, category: 'transfer', postings: [{ accountId: s.nominalAccount('liability_other', 'Unclaimed Money').id, amount: -one.amount }, { accountId: into.id, amount: one.amount }] });
      claimed += one.amount;
    }
    person.unclaimed = [];
    return { claimed };
  });
}

/**
 * How far ahead a bank writes before it hands an untouched balance to the
 * state: the US Revised Uniform Unclaimed Property Act asks for a notice 60
 * to 120 days before the report, and states that adopt it keep the window.
 * SLATE writes at 90, inside it, for every country, where the rest publish
 * no single figure. Until 2026-09-28 nothing was written, and a wealthy
 * student's untouched savings went to the state without a word beforehand.
 */
export const ESCHEAT_NOTICE_DAYS = 90;

/**
 * At a month's end, for each of a person's accounts: dormant or inactive by
 * the bank's months untouched, and after the country's years, the balance
 * gone to the state or its scheme.
 */
/** A count of years as prose says it: “three years”, “a year”. */
const yearsWord = (n: number | undefined): string => (n === 1 ? 'a year' : n === undefined ? 'years' : `${['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][n] ?? n} years`);

export function idleAccounts(sim: Simulation, person: Person, lastUsed: (account: Account) => Instant): void {
  for (const account of Object.values(sim.universe.accounts)) {
    if (account.ownerId !== person.id || account.closedAt || !account.bankId || (account.kind !== 'checking' && account.kind !== 'savings') || account.category === 'term') continue;
    const rules = ACCOUNT_LIFE[account.bankId];
    const idle = sim.now - Math.max(lastUsed(account), account.reactivatedAt ?? 0);
    const month = 30.44 * MS_DAY;
    if (rules?.inactiveMonths !== undefined) account.inactive = idle >= rules.inactiveMonths * month;
    if (rules?.dormantMonths !== undefined && idle >= rules.dormantMonths * month && !account.dormant) {
      account.dormant = true;
      if (person.id === sim.universe.playerId) sim.notify({ category: 'bank', title: `${account.name} Is Dormant`, body: `It hasn’t been used for ${rules.dormantMonths} months, so ${account.institution ?? 'the bank'} has blocked it. Reactivate it on Money, under Your Accounts Over Time, to use it again.`, importance: 55, route: '/workspace/bank' });
    }
    const iso = bankById(account.bankId)?.iso;
    const law = iso ? unclaimedLaw(iso) : undefined;
    // The years guard also narrows the type; without it NaN compares false the same.
    // The bank writes first: the balance goes to the state unless the holder gets in touch.
    const due = law?.years !== undefined ? law.years * 365.25 * MS_DAY : Infinity;
    if (law && account.escheatWarned === undefined && idle >= due - ESCHEAT_NOTICE_DAYS * MS_DAY && idle < due && account.balance > 0 && account.id !== person.primaryAccountId) {
      account.escheatWarned = sim.now;
      if (person.id === sim.universe.playerId) {
        const by = sim.now + (due - idle);
        sim.requireDecision({
          urgency: 85, category: 'bank', title: `${account.institution ?? 'Your Bank'} Is About To Hand ${account.name} To The State`,
          detail: `${formatMoney(account.balance, saveCurrency(sim.universe))} in ${account.name} hasn’t been used for nearly ${yearsWord(law.years)}. Unless you tell the bank to keep the account by ${formatDate(by, sim.zone)}, it goes to ${law.to ?? 'the state'} as unclaimed money.`,
          route: '/workspace/bank', dueAt: by, refType: 'unclaimed-notice', refId: account.id,
          actions: [{ label: 'Keep The Account', commandKind: 'bank.reactivate', payload: { accountId: account.id } }],
        });
      }
    }
    if (law?.years !== undefined && idle >= law.years * 365.25 * MS_DAY && account.balance > 0 && account.id !== person.primaryAccountId) {
      const amount = account.balance;
      sim.post({ memo: `Unclaimed, to ${law.to ?? 'the state'}`, category: 'transfer', postings: [{ accountId: account.id, amount: -amount }, { accountId: sim.nominalAccount('liability_other', 'Unclaimed Money').id, amount }] });
      account.closedAt = sim.now;
      dropPaymentsFor(sim, person, account);
      person.unclaimed = [...(person.unclaimed ?? []), { amount, to: law.to ?? 'the state', at: sim.now }];
      if (person.id === sim.universe.playerId) sim.notify({ category: 'bank', title: 'Unclaimed Money', body: `${formatMoney(amount, saveCurrency(sim.universe))} left unused in ${account.name} for ${yearsWord(law.years)} went to ${law.to ?? 'the state'}.${law.claimBack ? ` ${law.claimBack}` : ''}`, importance: 60, route: '/workspace/bank' });
    }
  }
}

/** What a term deposit will do at its end: its holder's instruction, or the bank's default, or paid out where the bank's isn't known. */
export function termEndOf(term: Account): TermEnd {
  return term.atEnd ?? (term.bankId ? ACCOUNT_LIFE[term.bankId]?.atEnd : undefined) ?? 'paid_out';
}

export const END_WORDS: Record<TermEnd, string> = {
  renews: 'renews for the same term at the bank’s rate on the day',
  savings: 'moves, with its interest, into the bank’s easy-access savings',
  paid_out: 'is paid, with its interest, into your checking account',
};

/** Days before a term deposit's end the bank writes: a month, or two weeks more than any notice it needs. */
function noticeLead(rules: BankAccountLife): number {
  return Math.max(30, (rules.endNoticeDays ?? 0) + 14);
}

/**
 * The interest a term deposit built, credited to it after tax, at its end, and recorded as its holder’s income
 * (`recordInterest`). Until 2026-10-14 it was posted and not recorded, here, at a term paid out (lending.ts) and at one
 * broken (`breakTerm`), so the year’s return and the month’s income test missed it: an Inherited student’s Chase CD
 * credited $57,928.16 on 24 March 2027 left March’s income at $276, and Enroll on 1 April gave HUSKY D where the
 * marketplace was due. Found by that day’s third round of evidence.
 */
function creditInterest(sim: Simulation, term: Account, memo: string): void {
  const earned = Math.floor(term.accrued ?? 0);
  const tax = interestTaxFor(sim, term, earned);
  if (earned > 0) {
    const postings = [{ accountId: term.id, amount: earned - tax }, { accountId: sim.nominalAccount('income', 'Interest').id, amount: -earned }];
    if (tax > 0) postings.push({ accountId: sim.nominalAccount('expense', 'Tax On Interest').id, amount: tax });
    sim.post({ memo, category: 'interest', postings });
    const owner = sim.universe.people[term.ownerId];
    if (owner) recordInterest(owner, sim.now, sim.homeZone, earned);
  }
  term.accrued = 0;
}

/**
 * A term deposit at its end, where it doesn't pay out (B7): renewed for the
 * same term at the bank's rate on the day, or moved into the bank's
 * easy-access savings, opened for it if the holder has none there. Returns
 * what it did, or 'paid_out' for the caller to pay it out.
 */
export function endTerm(sim: Simulation, person: Person, term: Account): TermEnd {
  const end = termEndOf(term);
  if (end === 'paid_out' || term.maturesAt === undefined) return 'paid_out';
  const bank = bankById(term.bankId!);
  if (!bank) return 'paid_out';
  const rules = ACCOUNT_LIFE[bank.id];
  if (end === 'savings') {
    creditInterest(sim, term, `Interest: ${term.name}`);
    const savings = Object.values(sim.universe.accounts).find((a) => a.ownerId === person.id && a.kind === 'savings' && a.category !== 'term' && !a.closedAt && a.bankId === bank.id)
      ?? openOne(sim, person, bank, 'savings', 0);
    sim.post({ memo: `${term.name} ended, into ${savings.name}`, category: 'transfer', postings: [{ accountId: term.id, amount: -term.balance }, { accountId: savings.id, amount: term.balance }] });
    term.closedAt = sim.now;
    return 'savings';
  }
  const offer = lendingOf(bank).term;
  const months = termMonths(term);
  // Principal and interest reinvested, at the bank's rate on the day.
  creditInterest(sim, term, `Interest: ${term.name}, reinvested`);
  // Its opening day stays. A draft moved it, and a renewed deposit at a bank
  // with no grace days, AIB's, could be broken free for a fortnight after
  // every renewal as if new.
  term.renewedAt = sim.now;
  term.maturesAt = addMonths(sim.now, months, sim.homeZone);
  if (offer?.rate !== undefined) term.fixedRate = offer.rate;
  term.maturityNoticed = false;
  if (rules?.graceDays) term.graceUntil = sim.now + rules.graceDays * MS_DAY;
  return 'renews';
}
