/**
 * SLATE — your bank.
 *
 * The bank a person keeps their money with, as that bank has it: its name,
 * the accounts by the names it sells them under, each account's number the
 * way the country writes it, what savings pays and what the current account
 * costs and how the fee is waived, in five tabs: accounts, cards, payments
 * and cash, borrowing, and statements. The deposit guarantee behind the
 * money was said here until 2026-09-26, and nothing read it. Money moves between the accounts here, and a
 * savings account is opened or closed (`systems/banking.ts`). The credit
 * card is the bank's too, and is run here (`ui/bank/BankCard.tsx`); until
 * 2026-09-26 it was run from the Money panel and this screen left it out.
 *
 * Every figure the bank publishes says where it came from; a figure that is
 * SLATE's estimate says that instead.
 */

import { type JSX, useState } from 'react';
import { SECTIONS, tabKey } from '../shell/sections';
import { useKept } from '../kept';
import { useGame, useWorld } from '../../app/game-context';
import { Panel, Empty, Fine } from '../components/primitives';
import { Gated } from '../guide/Guide';
import { BankLending, TermDeposits } from '../bank/BankLending';
import { BankMoves } from '../bank/BankMoves';
import { BankCard } from '../bank/BankCard';
import { BankCardOffers } from '../bank/BankCardOffers';
import { BankSecurity } from '../bank/BankSecurity';
import { BankStatements } from '../bank/BankStatements';
import { BankPayments } from '../bank/BankPayments';
import { BankCash } from '../bank/BankCash';
import { BankAccountLife } from '../bank/BankAccountLife';
import { WorthWords } from '../components/Glance';
import { apyOf } from '../../../../engine/bankworld/systems/statements';
import { formatMoney, saveCurrency, centsFromTyped } from '../../../../engine/bankworld/core/money';
import { dateKey, formatDate, formatDateKey } from '../../../../engine/bankworld/core/time';
import { bankById, bankingIn } from '../../../../engine/bankworld/content/banks';
import type { Simulation } from '../../../../engine/bankworld/core/simulation';
import type { Product } from '../../../../engine/bankworld/content/banks';
import { bankAccountsOf, introStep, nominalOf, rateOn, bankOf, directDeposits, feeFor, inSaveMoney, interestTaxOn, interestTaxFor, interestAllowanceLeft, monthEndAfter, monthStartOf, productOf, closesQuarterly, feesPostAt, savingsNotice, tierRate, earningBalance, cardYearWords } from '../../../../engine/bankworld/systems/banking';
import { savingsDebit } from '../../../../engine/bankworld/systems/accountlife';
import { savingsLeftThisMonth } from '../../../../engine/bankworld/systems/cash';
import { ACCOUNT_LIFE } from '../../../../engine/bankworld/content/accountlife';
import { CHEX, checkingAt, checkingsOf } from '../../../../engine/bankworld/systems/lending';
import type { Account } from '../../../../engine/bankworld/core/ledger';
import { LookRegion, Open, at } from '../looks';
import { abroadQuote, heldOf, heldText, homeAccountLines, quoteWords } from '../../../../engine/bankworld/systems/abroad';
import { arrivalOf } from '../../../../engine/bankworld/systems/bankmoves';
import { exchange } from '../../../../engine/bankworld/content/currency';
import { waiverWords } from '../bank/feeWords';
import { TabBar } from '../components/TabBar';

export function BankWorkspace() {
  const { sim, run, toast } = useGame();
  const cur = saveCurrency(sim.universe);
  const money = (cents: number) => formatMoney(cents, cur, { cents: false });
  // A balance as the tile and the From list show it: overdrawn, to the cent with a minus sign, where whole dollars and a
  // hyphen read "-$3" of -$3.30 (from 2026-10-17, the before-walk's find on the missed-plan save).
  const balanceOf = (cents: number) => (cents < 0 ? `−${formatMoney(-cents, cur)}` : money(cents));
  const bank = useWorld((s) => bankOf(s, s.player));
  const accounts = useWorld((s) => bankAccountsOf(s, s.player));
  const currents = useWorld((s) => checkingsOf(s, s.player));
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [tab, setTab] = useKept<BankTab>(tabKey('/workspace/bank'), 'accounts');

  if (!bank) {
    return <Empty title="No Bank" body="None of your money is at a bank the game covers, so there’s nothing to show here." />;
  }

  const here = accounts.filter((a) => a.bankId === bank.id);
  // The primary account (from 2026-10-10: until then the first current account found, which with two banks could be the
  // other one, named as where savings closes and where Move Money starts from).
  const current = accounts.find((a) => a.id === sim.player.primaryAccountId) ?? accounts.find((a) => a.kind === 'checking');
  // Savings to open: at each bank kept with a current account and no savings there, as `bank.open_savings` opens it
  // (from 2026-10-12: until then one panel, shown only while no bank held savings, opened at the primary account's bank
  // alone, so savings at a second bank hid the primary bank's and a second bank's couldn't be opened from any screen).
  const unsaved = [...new Set(currents.map((a) => a.bankId))]
    .map((id) => (id ? bankById(id) : undefined))
    .filter((b): b is NonNullable<typeof b> => !!b && !accounts.some((a) => a.kind === 'savings' && a.bankId === b.id));
  const fromId = from || current?.id || '';
  const toId = to || accounts.find((a) => a.id !== fromId)?.id || '';
  const monthStart = monthStartOf(sim, sim.now);
  const monthEnd = monthEndAfter(sim, sim.now);
  // When this month's fee comes off, by the bank's own schedule (`feesPostAt`, from 2026-10-16: until then every German
  // bank's was said to go to the quarter's closing, ING's and Commerzbank's among them).
  const dueWords = (account: import('../../../../engine/bankworld/core/ledger').Account) => {
    const posts = feesPostAt(account);
    return posts === 'quarter' ? 'charged at the quarter’s close' : posts === 'next' ? `charged ${formatDate(monthStartOf(sim, monthEnd + 2 * 3_600_000), sim.zone)}` : `due ${formatDate(monthEnd, sim.zone)}`;
  };

  // What a move out of savings costs, and what Germany's month still lets out, before it's made.
  const moving = accounts.find((a) => a.id === fromId);
  const savingsTerms = moving?.kind === 'savings' ? savingsDebit(sim, moving) : undefined;
  // By the rules of the bank the savings is at, as `savingsDebit` charges (from 2026-10-12: until then the primary
  // account's bank's, so savings elsewhere had its fee unsaid, or was told of a fee its bank doesn't charge).
  const rules = moving?.kind === 'savings' && moving.bankId ? ACCOUNT_LIFE[moving.bankId] : undefined;
  const freeLeft = rules?.freeWithdrawals !== undefined && rules.withdrawalFee ? savingsTerms!.fee === 0 : undefined;
  const allowanceLeft = moving ? savingsLeftThisMonth(sim, moving) : undefined;

  // In the sending account's own money where it's kept in another (from 2026-10-16): pounds from a pound account.
  const sendIn = moving?.currency ?? cur;
  const target = accounts.find((a) => a.id === toId);
  // Between banks in two countries, what the payment costs and when it lands, from the rule the command keeps.
  const abroad = moving && target && moving.bankId && target.bankId && bankById(moving.bankId)?.iso !== bankById(target.bankId)?.iso && centsFromTyped(amount) > 0
    ? abroadQuote(sim, sim.player, moving, target, centsFromTyped(amount))
    : undefined;
  // Between two banks in one country, when it would arrive, from the day `sendBetweenBanks` sets it (`arrivalOf`), said
  // before Move It (from 2026-10-20, brief 17, section 8): until then only the toast after it said the day, and the
  // panel's subtitle that it "takes as long as the sending bank takes".
  const between = moving && target && moving.bankId && target.bankId && moving.bankId !== target.bankId && !abroad && bankById(moving.bankId)?.iso === bankById(target.bankId)?.iso
    ? arrivalOf(sim, moving, sim.player)
    : undefined;

  const move = () => {
    // Typed in whole units of the money, as a banking app takes it.
    const cents = centsFromTyped(amount);
    const answer = run<{ moved: number; arrivesAt?: number; sent?: number; sentIn?: string }>('bank.transfer', { fromId, toId, amount: cents, ...(moving?.currency ? { in: moving.currency } : {}) });
    if (answer.ok && answer.value) {
      const later = answer.value.arrivesAt !== undefined && answer.value.arrivesAt > sim.now;
      const what = answer.value.sentIn ? formatMoney(answer.value.sent!, answer.value.sentIn) : money(answer.value.moved);
      toast(later ? `Sent ${what} to ${target?.name ?? 'your other account'}. It arrives ${formatDate(answer.value.arrivesAt!, sim.zone)}.` : `Moved ${what} to ${target?.name ?? 'your other account'}.`, 'positive');
      setAmount('');
    }
  };

  const panes: Record<BankTab, JSX.Element> = {
    accounts: (
      <>
      <div className="grid grid-2" style={{ marginBottom: 'var(--s5)' }}>
        {accounts.map((account) => {
          const product = productOf(account);
          const fee = feeFor(sim, account, monthStart);
          const tax = interestTaxOn(sim, account);
          // As the bank counts them: until 2026-09-27 wages only, where the bank counts any electronic deposit.
          const paidIn = directDeposits(sim, account, monthStart, product?.deposits);
          // Each account by its own bank's terms and money (from 2026-10-16): until then every panel read the primary
          // account's bank's currency, and an account kept at home showed its balance, fees and rates in dollars.
          const own = (account.bankId ? bankById(account.bankId) : undefined) ?? bank;
          const home = account.currency !== undefined;
          const inBank = (x: number) => (home ? formatMoney(x, own.currency, { cents: false }) : money(inSaveMoney(sim, x, own.currency)));
          return (
            <Panel key={account.id} title={account.name} subtitle={<Open subject={at('account', account.id)}>{account.institution} {account.number}{home ? ', Held From Abroad' : ''}</Open>} look={at('account', account.id)} help={home ? 'bank.home-account' : 'bank.accounts'}>
              <div className="col gap-3">
                <div className="stat">
                  <Open subject={at('account', account.id)}>
                    <span className="stat-label">Balance</span>{' '}
                    <span className="stat-value mono">{home ? heldText(sim, account) : balanceOf(account.balance)}</span>
                  </Open>
                  {home && <span className="stat-note">About {formatMoney(account.balance, cur)} at an estimated exchange rate</span>}
                  {!home && account.balance < 0 && <span className="stat-note">Overdrawn</span>}
                </div>
                <p className="small" style={{ margin: 0 }}>{interestWords(sim, product, tax, money, own.currency, account.openedAt, closesQuarterly(account), account, home ? inBank : undefined)}</p>
                {account.secondChance ? (
                  <p className="small" style={{ margin: 0 }}>A second-chance account: {formatMoney(inSaveMoney(sim, CHEX.secondChanceFee, 'USD'), cur)} a month instead of the usual fee, and no overdraft.</p>
                ) : product?.monthlyFee ? (
                  <p className="small" style={{ margin: 0 }}>
                    {home ? formatMoney(product.monthlyFee, own.currency) : formatMoney(inSaveMoney(sim, product.monthlyFee, own.currency), cur)} a month
                    {waiverWords(product, inBank)}
                    {'. '}
                    {fee.fee === 0
                      ? `It’s waived this month so far${fee.waivedBy === 'deposits' ? `, with ${money(paidIn)} paid in` : ''}.`
                      : fee.waivedBy
                        ? `So far this month it’s lowered to ${home && fee.native !== undefined ? formatMoney(fee.native, own.currency) : formatMoney(fee.fee, cur)}${fee.waivedBy === 'deposits' ? `, with ${money(paidIn)} paid in` : ''}, and it’s ${dueWords(account)}.`
                        : feesPostAt(account) === 'quarter' ? 'It isn’t waived this month so far. Unless one of those conditions is met, it’s added to the fees charged at the quarter’s close.' : `It isn’t waived this month so far. Unless one of those conditions is met, it’s ${dueWords(account)}.`}
                    {(account.feesDue ?? 0) > 0 ? ` ${feesPostAt(account) === 'quarter' ? 'The quarter’s fees so far' : 'Last month’s fees'}, ${home ? formatMoney(account.feesDueHeld ?? 0, own.currency) : money(account.feesDue ?? 0)}, ${feesPostAt(account) === 'quarter' ? 'are charged at its close' : `are charged ${formatDate(monthStartOf(sim, monthEnd + 2 * 3_600_000), sim.zone)}`}.` : ''}
                  </p>
                ) : (
                  <p className="small" style={{ margin: 0 }}>No monthly fee.</p>
                )}
                {homeAccountLines(sim, account).map((line) => <p key={line} className="small" style={{ margin: 0 }}>{line}</p>)}
                {/* The debit card's year (`cardYearWords`, from brief 10, 2026-10-16): until then no panel said it. */}
                {cardYearWords(sim, account) && <p className="small" style={{ margin: 0 }}>{cardYearWords(sim, account)}</p>}
                {product && <Fine>{product.estimate ? 'Estimated' : 'Source'}: {product.source}, {formatDateKey(product.asOf)}.{CONFIDENCE[own.confidence ?? 'H']}{account.secondChance ? ' The second-chance account’s fee is estimated.' : ''}</Fine>}
                {account.kind === 'savings' && (() => {
                  // Where closing it sends the money, as `closeSavings` does: the current account at its own bank, or the
                  // primary with none there (from 2026-10-16: until then both lines named the primary, so a Berlin-raised
                  // student's Flexgeld at Deutsche Bank said it moved to Chase Total Checking, where it goes to the
                  // AktivKonto; tests/integration-savings-notice.test.ts).
                  const into = checkingAt(sim, sim.player, account.bankId) ?? current;
                  return (
                  <div className="row gap-2" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                    {savingsNotice(sim, account)
                      ? <span className="xs dim">You’ve given notice. It closes <Open subject={at('day', dateKey(savingsNotice(sim, account)!.at, sim.homeZone))}>{formatDate(savingsNotice(sim, account)!.at, sim.zone)}</Open>, and what it holds moves to {into ? <Open subject={at('account', into.id)}>{into.name}</Open> : 'your checking account'} then.</span>
                      : <>
                        <Gated feature="bank.close_savings" className="btn btn-sm btn-ghost" onClick={() => { const a = run<{ on?: number }>('bank.close_savings', { accountId: account.id }); if (a.ok && a.value?.on) toast(`Notice given. It closes ${formatDate(a.value.on, sim.zone)}.`, 'positive'); }}>
                          Close It
                        </Gated>
                        <span className="xs dim">{closingWords(sim, account, into?.name ?? 'your checking account')}</span>
                      </>}
                  </div>
                  );
                })()}
              </div>
            </Panel>
          );
        })}
        {unsaved.map((there) => (
          <Panel key={`open-${there.id}`} title={there.savings.name} subtitle={`At ${there.name}, not open yet`} help="bank.open_savings">
            <p className="small">
              {interestWords(sim, there.savings, bankingIn(there.iso)?.interestTax?.rate ?? 0, money, there.currency, sim.now, there.iso === 'DE')} {there.savings.monthlyFee ? `It costs ${formatMoney(inSaveMoney(sim, there.savings.monthlyFee, there.currency), cur)} a month${waiverWords(there.savings, (c) => money(inSaveMoney(sim, c, there.currency)))}.` : 'It has no monthly fee.'}
            </p>
            <Gated feature="bank.open_savings" className="btn btn-sm" onClick={() => run('bank.open_savings', { bankId: there.id })}>
              Open A {there.savings.name}
            </Gated>
          </Panel>
        ))}
      </div>

      {accounts.length > 1 && (
        <Panel title="Move Money" subtitle="Between your own accounts. Within one bank it’s instant. To another bank it takes the sending bank’s time, said below once you choose the accounts, and abroad it also costs the exchange and the fees." help="bank.transfer">
          <div className="field-row">
            <div className="field">
              <label htmlFor="move-from">From</label>
              <select id="move-from" value={fromId} onChange={(e) => setFrom(e.target.value)}>
                {/* By balance, the most in it last. */}
                {[...accounts].sort((a, b) => a.balance - b.balance).map((a) => <option key={a.id} value={a.id}>{a.name} ···{a.last4}, {a.institution} ({a.currency ? heldText(sim, a) : balanceOf(a.balance)})</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="move-to">To</label>
              <select id="move-to" value={toId} onChange={(e) => setTo(e.target.value)}>
                {accounts.filter((a) => a.id !== fromId).sort((a, b) => a.balance - b.balance).map((a) => <option key={a.id} value={a.id}>{a.name} ···{a.last4}, {a.institution}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="move-amount">Amount ({sendIn})</label>
              <input id="move-amount" type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
          {savingsTerms && (freeLeft !== undefined || allowanceLeft !== undefined) && (
            <p className="xs dim" style={{ margin: '0 0 var(--s2)' }}>
              {freeLeft === true ? 'This withdrawal is free. Once the month’s free ones are used, each costs the bank’s fee. ' : ''}
              {freeLeft === false ? `You’ve used this month’s free withdrawals, so this one costs ${formatMoney(savingsTerms.fee, cur)}, taken from the savings on top of the amount. ` : ''}
              {allowanceLeft !== undefined ? `You can take out ${formatMoney(allowanceLeft, cur)} more this month without notice.` : ''}
            </p>
          )}
          {abroad && <p className="xs dim" style={{ margin: '0 0 var(--s2)' }}>{'refused' in abroad ? abroad.refused : quoteWords(sim, abroad)}</p>}
          {between !== undefined && (
            <p className="xs dim" style={{ margin: '0 0 var(--s2)' }} data-arrives="">
              {between > sim.now
                ? `Sent now, it leaves ${moving!.name} at once and arrives in ${target!.name} on ${formatDate(between, sim.zone)}. It isn’t available to spend in between.`
                : `Sent now, it arrives in ${target!.name} at once.`}
            </p>
          )}
          <Gated feature="bank.transfer" className="btn btn-primary btn-sm" onClick={move} disabled={!amount}>
            Move It
          </Gated>
        </Panel>
      )}


        <BankMoves />
        <TermDeposits primaryBank={bank} />
        <BankLending bank={bank} show={['switch']} />
        <div style={{ marginBottom: 'var(--s5)' }}>
          <BankAccountLife bankId={bank.id} />
        </div>
        <OtherCharges bank={bank} />
      </>
    ),
    cards: (
      <div className="col gap-5">
        <BankCard bankId={bank.id} />
        <BankCardOffers bankId={bank.id} />
        <BankSecurity bankId={bank.id} />
      </div>
    ),
    payments: (
      <div className="col gap-5">
        <BankPayments />
        <BankCash bankId={bank.id} />
      </div>
    ),
    borrowing: <BorrowingAt primaryBank={bank} />,
    statements: <BankStatements />,
  };

  return (
    <>
      <LookRegion className="page-head">
        <div className="eyebrow">Your Bank</div>
        <h1><Open subject={at('bank', bank.id)}>{bank.name}</Open></h1>
        {/* What's held here, now. Until 2026-09-26 this said what the deposit
            guarantee covers and the central bank's rate, which nothing in play
            reads: no bank fails, and no rate follows it. */}
        {/* The primary account's bank, and the others kept beside it (from 2026-10-10: until then every account was at one bank, and it said so). */}
        <p className="muted">
          <Open subject={at('bank', bank.id)}>{sumText(here, balanceOf)}</Open> held here, in{' '}
          {here.length === 1 && here[0]
            ? <Open subject={at('account', here[0].id)}>one account</Open>
            : <Open subject={at('bank', bank.id)}>{here.length} accounts</Open>}
          {accounts.length > here.length ? `, and ${othersText(accounts.filter((a) => a.bankId !== bank.id), money)}` : ''}.
          {/* What you're worth, everything held less everything owed (`networth`'s look), here from 2026-10-23 (brief 23):
              until then it was Home's Your Affairs line, which went from Home. */}
          {' '}<WorthWords />
        </p>
        {current && current.balance < 0 && <p className="glance glance-alert">Your account is overdrawn.</p>}
      </LookRegion>

      <BankTabs tab={tab} onTab={setTab} />
      <div role="tabpanel" id={`bank-pane-${tab}`} aria-labelledby={`bank-tab-${tab}`} tabIndex={0} className="bank-pane">
        {panes[tab]}
      </div>
    </>
  );
}

type BankTab = 'accounts' | 'cards' | 'payments' | 'borrowing' | 'statements';

/**
 * Borrowing at any bank held (from 2026-10-10): the lender chosen first, then that bank's own overdraft and loan, on the
 * current account there. Until then only the primary account's bank lent. Until 2026-10-13 this said its term deposits
 * were here too; they are on Accounts, a panel for each bank (`TermDeposits`).
 */
function BorrowingAt({ primaryBank }: { primaryBank: import('../../../../engine/bankworld/content/banks').Bank }) {
  const currents = useWorld((s) => checkingsOf(s, s.player));
  const [lender, setLender] = useState(primaryBank.id);
  const account = currents.find((a) => a.bankId === lender) ?? currents[0];
  const bank = (account?.bankId ? bankById(account.bankId) : undefined) ?? primaryBank;
  return (
    <div className="col gap-3">
      {currents.length > 1 && (
        <div className="field" style={{ maxWidth: 360 }}>
          <label htmlFor="lender">Borrow At</label>
          <select id="lender" value={bank.id} onChange={(e) => setLender(e.target.value)}>
            {currents.map((a) => <option key={a.id} value={a.bankId}>{a.institution}</option>)}
          </select>
        </div>
      )}
      <BankLending bank={bank} account={account} show={['borrowing']} />
    </div>
  );
}

/** The screen's parts, each under its own tab. Until 2026-09-26 they ran down one page, fourteen to sixteen panels long. */
/** Its tabs, as the rail lists them too (`ui/shell/sections.ts`, from 2026-10-08). */
const BANK_TABS = SECTIONS['/workspace/bank'] as readonly { id: BankTab; label: string }[];

/** The tabs, as a tab list: the shared bar from 2026-10-23 (`components/TabBar.tsx`), its own copy until then. */
function BankTabs({ tab, onTab }: { tab: BankTab; onTab: (tab: BankTab) => void }) {
  return <TabBar tabs={BANK_TABS} tab={tab} onTab={onTab} label="Your Bank" idPrefix="bank" />;
}

/**
 * What a set of accounts holds, for the page's head line (from 2026-10-16): accounts all kept in one other currency, in
 * it with the dollars beside; any other set, in the save's money.
 */
/**
 * What a bank holds, summed: in the save's money as the tiles write a balance, below zero with its minus sign and to the
 * cent (from 2026-10-20, brief 17: until then "-$600 held here", a hyphen and whole dollars, where the tile beside it read
 * −$600.00), and in the bank's own money first where every account there is kept in it.
 */
function sumText(list: Account[], money: (cents: number) => string): string {
  const total = money(list.reduce((sum, a) => sum + a.balance, 0));
  const kept = list[0]?.currency;
  if (!kept || list.some((a) => a.currency !== kept)) return total;
  const held = list.reduce((sum, a) => sum + heldOf(a), 0);
  return `${held < 0 ? `−${formatMoney(-held, kept)}` : formatMoney(held, kept, { cents: false })} (${total})`;
}

/** The other banks' sum in the save's money, and of it what each bank abroad holds in its own: "$7,065 at your other banks, £5,581 of it at HSBC UK". */
function othersText(list: Account[], money: (cents: number) => string): string {
  const byBank = new Map<string, Account[]>();
  for (const a of list) if (a.currency) byBank.set(a.institution ?? '', [...(byBank.get(a.institution ?? '') ?? []), a]);
  const total = money(list.reduce((sum, a) => sum + a.balance, 0));
  if (byBank.size === 0) return `${total} at your other banks`;
  return `${total} at your other banks, ${[...byBank].map(([name, held]) => `${formatMoney(held.reduce((sum, a) => sum + heldOf(a), 0), held[0]!.currency!, { cents: false })} of it at ${name}`).join(' and ')}`;
}

/** How sure the research was of a bank outside the thirteen, where it wasn't sure. */
const CONFIDENCE: Record<'H' | 'M' | 'L', string> = {
  H: '',
  M: ' Some of this bank’s figures couldn’t be fully confirmed.',
  L: ' This bank’s figures couldn’t be confirmed.',
};

/** Percent, to as many places as the figure has. */
const pct = (rate: number) => `${Number((rate * 100).toFixed(3))}%`;
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * What an account pays, said the way the bank's terms put it: the rate, any
 * change announced, a floor or a cap, a bonus and what earns it, when it is
 * paid, and what the bank takes off it for tax.
 */
function interestWords(sim: Simulation, product: Product | undefined, tax: number, money: (cents: number) => string, currency: string, openedAt: number, quarterly = false, account?: Account, own?: (units: number) => string): string {
  const step = introStep(sim, product, openedAt, sim.now);
  // The bank's own figures: in its money on an account kept in it (`own`, from 2026-10-16), in the save's otherwise.
  const inBank = (x: number) => (own ? own(x) : money(inSaveMoney(sim, x, currency)));
  // The tier the balance is in leads, as the engine pays it: until 2026-09-27 the headline was the base rate.
  const bankMoney = (x: number) => inSaveMoney(sim, x, currency);
  const tiered = account ? tierRate(product, account, earningBalance(product, account.balance, bankMoney), bankMoney) : undefined;
  const rate = tiered ?? step ?? rateOn(product, sim.now, sim.homeZone);
  // A rate the research didn't find isn't a rate of none: until 2026-09-26 Citi's savings said it paid no interest.
  if (product && product.rate === undefined && /no published rate/i.test(product.source) && !product.changes?.length && !product.tiers?.length && !product.bonus && !product.intro) return 'No published rate was found for it, so it earns no interest in the game.';
  if (!product || (rate <= 0 && !product.bonus && !product.intro)) return 'Pays no interest.';
  // The yield with the interest left in, credited monthly or in the bank's months (B31). A rate quoted as a yield is said
  // as the bank says it, with the rate a day's interest is worked from beside it (from 2026-10-22, brief 21: until then
  // every rate was said, and paid, as a nominal one, and Capital One's 3.00% APY as "3% a year (3.042% APY)").
  const perYear = product.creditsEvery ? 12 / product.creditsEvery : product.pays?.length ?? (quarterly ? 4 : 12);
  const on = tiered !== undefined ? ' on this balance' : '';
  const said: string[] = [product.quoted
    ? `Pays ${pct(rate)} ${product.quoted}${on} (${pct(Number(nominalOf(product, rate, perYear).toFixed(5)))} a year${product.compounds === 'daily' ? ', compounded daily' : ' before compounding'})`
    : `Pays ${pct(rate)} a year${on} (${pct(Number(apyOf(rate, perYear).toFixed(5)))} APY)`];
  if (step !== undefined) {
    // The steps still to come, and what it pays after them.
    let through = 0;
    const ahead: string[] = [];
    for (const one of product.intro ?? []) {
      through += one.months;
      ahead.push(`${pct(one.rate)} until month ${through}`);
    }
    said.push(` for now: ${ahead.join(', ')}, then ${pct(rateOn(product, sim.now, sim.homeZone))}, counted from when it opened`);
  }
  // The bank's day, as the engine reads it: until 2026-09-27 a UTC one.
  const next = (product.changes ?? []).find((c) => c.from > dateKey(sim.now, sim.homeZone));
  if (next) { const [y, m, d] = next.from.split('-').map(Number); said.push(`, ${pct(next.rate)} from ${formatDate(Date.UTC(y!, m! - 1, d!, 12), 'UTC')}`); }
  for (const tier of product.tiers ?? []) said.push(`, and ${pct(tier.rate)} on the whole balance once it’s ${inBank(tier.from)} or more`);
  if (product.rateFrom !== undefined) said.push(`, on a balance of ${inBank(product.rateFrom)} or more`);
  if (product.rateUpTo !== undefined) said.push(`, on up to ${inBank(product.rateUpTo)}`);
  said.push('.');
  if (product.bonus) {
    const earn = product.bonus.when === 'no_withdrawals'
      ? 'you take nothing out'
      : product.bonus.growBy !== undefined ? `the balance grows by ${inBank(product.bonus.growBy)}` : 'the balance grows';
    said.push(` It pays another ${pct(product.bonus.rate)} in any month ${earn}.`);
  }
  // As the engine pays it: in the bank’s months, at Germany’s quarterly closing, or each month’s end.
  said.push(product.creditsEvery
    ? ` Interest builds up daily and is paid every ${product.creditsEvery === 12 ? '12' : 'six'} months, counted from the day it opened.`
    : product.pays
    ? ` Interest builds up daily and is paid in ${product.pays.map((m) => MONTH_NAMES[m - 1]).join(' and ')}.`
    : quarterly
      ? ' Interest builds up daily and is paid at each quarter’s close: the end of March, June, September and December.'
      : ' Interest builds up daily and is paid on the last day of the month.');
  if (product.taxFree) said.push(' The interest is tax-free.');
  else if (tax > 0) {
    // Past the year's allowance, where the country has one: until 2026-09-27 it read as tax on all of it.
    const iso = account?.bankId ? bankById(account.bankId)?.iso : undefined;
    const levy = iso ? bankingIn(iso)?.interestTax : undefined;
    const left = account ? interestAllowanceLeft(sim, account) : undefined;
    said.push(levy?.allowance !== undefined
      ? ` The bank keeps back ${pct(tax)} for tax on interest past the first ${inBank(levy.allowance)} each year${left !== undefined ? `, and ${money(left)} of that allowance is left this year` : ''}.`
      : ` The bank keeps back ${pct(tax)} of it for tax.`);
    if (levy?.source) said.push(` Source: ${levy.source}.`);
  }
  return said.join('');
}

/** The bank's charges that aren't an account's monthly fee, and the tax the country gives back. */
function OtherCharges({ bank }: { bank: import('../../../../engine/bankworld/content/banks').Bank }) {
  const { sim } = useGame();
  const cur = saveCurrency(sim.universe);
  const money = (c: number) => formatMoney(inSaveMoney(sim, c, bank.currency), cur);
  const refund = bankingIn(bank.iso)?.interestTax;
  const lines: string[] = [];
  if (bank.card) {
    // Paid for the year ahead, and its days left given back on a close (from 2026-10-16, `Bank.card.ahead` until brief 10);
    // charged behind, and its days used charged on a close, and where the timing is SLATE's, said to be simulated and
    // unverified (`Bank.card.year`, from brief 10).
    const year = bank.card.yearly !== undefined ? bank.card.year : undefined;
    const timing = year ? (year.paid === 'ahead' ? '. It’s paid for the year ahead, and what’s left of the year is refunded if the account closes' : '. It’s charged at the end of each card year, and the days used so far are charged if the account closes') : '';
    const simulated = year?.simulated ? ` The timing is estimated: ${year.simulated}.` : '';
    lines.push(`The debit card costs ${bank.card.yearly !== undefined ? `${money(bank.card.yearly)} a year` : 'nothing a year'}${bank.card.perPurchase !== undefined ? ` and ${money(bank.card.perPurchase)} a purchase` : ''}${bank.card.freeUnder !== undefined ? `, or nothing at ${bank.card.freeUnder - 1} and under` : ''}${timing}. Source: ${bank.card.source}.${simulated}`);
  }
  if (bank.returned) lines.push(`A payment the bank returns unpaid costs ${money(bank.returned.fee)}${bank.returned.ifShortAtLeast !== undefined ? `, or nothing when the account is less than ${money(bank.returned.ifShortAtLeast)} short` : ''}${bank.returned.gapDays > 1 ? `, at most once every ${bank.returned.gapDays} business days` : ''}. Source: ${bank.returned.source}.`);
  if (bank.dormant) lines.push(`An account left unused for ${bank.dormant.afterYears} years costs ${money(bank.dormant.yearly)} a year${bank.dormant.belowBalance !== undefined ? ` while it holds less than ${money(bank.dormant.belowBalance)}` : ''}. Source: ${bank.dormant.source}.`);
  if (bank.quietMonth) lines.push(`A month with fewer than ${bank.quietMonth.minTransactions} transactions costs ${money(bank.quietMonth.fee)}${bank.quietMonth.unlessWages ? ', unless wages are paid in' : ''}. Source: ${bank.quietMonth.source}.`);
  if (refund?.refund) {
    const day = `${MONTH_NAMES[refund.refund.month - 1]} ${refund.refund.day}`;
    lines.push(`${refund.note} It’s paid here on ${day}.${refund.refund.estimateDate ? ' The day is estimated.' : ''}`);
  }
  if (lines.length === 0) return null;
  return (
    <Panel title="Other Charges">
      <div className="col gap-2">
        {lines.map((line) => <p key={line} className="small" style={{ margin: 0 }}>{line}</p>)}
      </div>
    </Panel>
  );
}

/**
 * What closing savings moves: the balance, with this month's interest paid
 * less its tax. Until 2026-09-27 it said the balance, and more moved. From
 * 2026-10-17 it says the figure to the cent, and an overdrawn savings account
 * says what closing takes to clear it (`closeSavings` posts the shortfall from
 * the current account), where it had said "Its -$3, moves to …".
 */
function closingWords(sim: Simulation, account: Account, into: string): string {
  const cur = saveCurrency(sim.universe);
  const money = (c: number) => formatMoney(c, cur);
  const earned = Math.floor(account.accrued ?? 0);
  const net = earned - (earned > 0 ? interestTaxFor(sim, account, earned) : 0);
  const taxed = earned > net ? ' after tax' : '';
  const left = savingsLeftThisMonth(sim, account);
  if (left !== undefined && account.balance + earned > left) return `It holds more than the ${money(left)} you can take out this month without notice, so closing it gives three months’ notice, as the law requires. The money moves to ${into} then.`;
  // An account kept at home in its own money, the month's interest so far turned into it at the game's rate (from 2026-10-16).
  if (account.currency) {
    const built = exchange(net, cur, account.currency) ?? 0;
    const total = heldOf(account) + built;
    if (total < 0) return `It’s overdrawn by ${heldText(sim, account, -total)}. Closing it takes that from ${into} to clear it.`;
    if (total === 0) return 'It’s empty, so closing it moves nothing.';
    return `Closing it moves its ${heldText(sim, account, total)} to ${into}${built > 0 ? `, including ${heldText(sim, account, built)} of interest from this month${taxed}` : ''}.`;
  }
  const total = account.balance + net;
  if (total < 0) return `It’s overdrawn by ${money(-total)}. Closing it takes ${money(-total)} from ${into} to clear it.`;
  if (total === 0) return 'It’s empty, so closing it moves nothing.';
  return `Closing it moves its ${money(total)} to ${into}${net > 0 ? `, including ${money(net)} of interest from this month${taxed}` : ''}.`;
}

// `waiverWords` moved to `ui/bank/feeWords.ts` on 2026-10-16, so the opening panel says the fee before Apply.
