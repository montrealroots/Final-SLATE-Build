/**
 * SLATE — round-ups into savings, bank by bank, as each bank's own pages and terms say.
 *
 * Researched from official sources for every bank SLATE has, checked 2026-10-13 for the owner's brief of that day, with
 * each finding read again by a second researcher. Twenty banks have a feature a purchase or a balance moves money into
 * savings by, and each is here as it works there: what a purchase moves and what the customer picks, when it moves,
 * what happens when the account can't cover it, and what turning it off does with what's waiting.
 *
 * Until 2026-10-13 SLATE moved the change to the next whole unit at every bank whose words it had, a cent at most for a
 * purchase in won, yen or krónur, Wells Fargo's flat $1 aside (`ROUND_UP_AMOUNT`, from 2026-10-12); and where the
 * customer chooses the amount and the bank states no default, TD's and Landsbankinn's, it moved the change as "SLATE's
 * estimate", a default nobody stated. A choice the bank leaves to the customer is now the player's to make before it
 * starts, and nothing moves until it's made.
 *
 * - **Left out, with the reason:** KB Kookmin's 자투리 모으기 (May 2020 news only; no official page read confirms it's
 *   offered today, and SLATE had words for it); Nationwide's Round-ups (the app works out a week's change, and the
 *   member moves it: nothing moves by itself, as Move Money does in SLATE); CaixaBank's Ahorra el Cambio, Resona's
 *   おつり貯蓄, Hana's 잔돈투자 and Shinhan's (withdrawn).
 * - **What a purchase is:** the day's food, the one purchase SLATE's debit card makes. A bank's ATM withdrawals, bill
 *   payments and other banks' cards aren't purchases SLATE makes, and each bank's `notHere` says what it counts that
 *   SLATE doesn't.
 * - **Where it goes:** easy-access savings at the same bank, which every bank's round-ups need. SLATE has one savings
 *   product at a bank, where some banks name theirs (Way2Save, Money Master, an Extra-Konto, a 저금통).
 *
 * Amounts are in whole units of the bank's currency, read in the save's money by `systems/accountlife.ts`.
 */

/** What a purchase moves, or a balance. */
export type RoundUpWay =
  /** Each purchase rounded up to the next multiple of a unit, the difference saved; one unit is fixed. `fullOnWhole`: a purchase already at a multiple moves a whole unit (BBVA Mexico's "strictly above"); else nothing. */
  | { kind: 'change'; units: readonly number[]; multipliers?: readonly number[]; fullOnWhole?: true }
  /** A fixed amount for each purchase: one of `amounts`, or anything in `range`. */
  | { kind: 'flat'; amounts?: readonly number[]; range?: { min: number; max: number } }
  /** Bankinter: the change to the next euro and the amount chosen past the first euro (€6.30 at €2 moves €1.70). */
  | { kind: 'changePlus'; amounts: readonly number[] }
  /** KakaoBank: the part of the day's closing balance under `unit`, swept on a weekday; skipped at `above` or less, and where the savings would pass `cap`. */
  | { kind: 'remainder'; unit: number; above: number; cap: number };

/**
 * When the counted amount moves, at the start of a day in SLATE (midnight, the day's rollover):
 * - `day`: every day, the day before's;
 * - `business`: at the end of each of the bank's business days, the days between waiting for it;
 * - `next-business`: counted at the end of a business day, and moved at the start of the next one (Friday's on Monday);
 * - `weekdays`: Monday to Friday, holidays or not (KakaoBank);
 * - `friday-night`: the week's, overnight from Friday to Saturday (Sabadell);
 * - `half-month`: the 1st and the 16th (LCL's 'quinzaine', whose day the terms don't give: SLATE's reading).
 */
export type RoundUpWhen = 'day' | 'business' | 'next-business' | 'weekdays' | 'friday-night' | 'half-month';

/** How often, where the customer picks: counted from the day it's turned on. */
export type RoundUpEvery = 'day' | 'week' | 'fortnight';

export interface RoundUpRule {
  /** The bank's name for it. */
  product: string;
  /** What it does here, in a sentence or two. */
  words: string;
  /** The ways a purchase counts; more than one and the customer picks (Landsbankinn's round-up or set amount). */
  ways: readonly RoundUpWay[];
  /** A multiplier the bank states as the default (NatWest's ×1). Nothing else has one: the customer picks. */
  defaultMultiplier?: number;
  /** When it moves, where the bank sets it. */
  when: RoundUpWhen;
  /** How often, where the customer picks instead (Citi; TD). */
  every?: readonly RoundUpEvery[];
  /** Nothing counts while the current account holds less than this (ING's 20 €). */
  pausedUnder?: number;
  /** Citi: a minimum balance the customer sets, at least this; under it the transfer waits two more days, then it's turned off. */
  minimumAtLeast?: number;
  /** Citi: the most one transfer moves, the rest carried to the next. */
  perTransfer?: number;
  /** The bank's own credit card's purchases count too, the change paid from the current account. */
  credit?: true;
  /** When the current account can't cover it. */
  short: string;
  /** What the bank's sources leave open, and what SLATE does there. */
  open: readonly string[];
  /** What the bank counts or offers that SLATE doesn't. */
  notHere: readonly string[];
  /** Where it was read, and the version or date the source gives. */
  source: string;
  checked: string;
}

const CHECKED = '2026-10-13';
const DROPPED_UNSAID = 'In the game, none of that day’s round-ups move, never just some of them and never into an overdraft, and they’re dropped: the bank doesn’t say whether they’re carried.';
const OFF = 'In the game, turning it off, or switching your primary account to another bank, drops what was counted and hasn’t moved. The bank doesn’t say what happens.';

export const ROUND_UPS: Readonly<Record<string, RoundUpRule>> = {
  'us-bank-of-america': {
    product: 'Keep the Change',
    words: 'Each Bank of America debit card purchase is rounded up to the next whole dollar, and the difference moves to your savings in one transfer at the end of each business day.',
    ways: [{ kind: 'change', units: [1] }],
    when: 'business',
    short: 'If the account can’t cover the day’s transfer, that day’s round-ups are canceled, not carried, and it never overdraws.',
    open: ['A purchase of whole dollars: the terms say “the amount in excess of the purchase price”, so the game moves nothing.', 'An account overdrawn during the day and back in credit by its end: the terms cancel the day; the game looks at the balance at the day’s end.', OFF],
    notHere: ['A purchase refunded leaves its round-up in savings, as the terms say; purchases in the game aren’t refunded.'],
    source: 'bankofamerica.com, Personal Schedule of Fees, effective August 7, 2026; Keep the Change page and FAQ',
    checked: CHECKED,
  },
  'us-wells-fargo': {
    product: 'Way2Save Save As You Go',
    words: 'Not a round-up: a flat $1 for each one-time debit card purchase, counted at the end of each business day and moved to your savings on the next business day.',
    ways: [{ kind: 'flat', amounts: [1] }],
    when: 'next-business',
    short: 'If the account doesn’t have the funds or is overdrawn, the transfer doesn’t happen. The game drops it: the terms don’t say it’s tried again.',
    open: ['Which day’s balance decides: the game looks when the transfer is made.', 'A day Overdraft Protection was used, Wells Fargo makes no transfer: the game doesn’t look for it, and moves it if the account covers it.', OFF],
    notHere: ['Online Bill Pay payments count at Wells Fargo too; bills in the game aren’t paid through Bill Pay.', 'Wells Fargo names Way2Save Savings as the account it goes into; the game has one savings account at a bank.'],
    source: 'wellsfargo.com, Consumer Account Fee and Information Schedule, effective July 28, 2026',
    checked: CHECKED,
  },
  'us-citi': {
    product: 'Spend & Save',
    words: 'Each purchase on your Citi debit card or Citi credit card is rounded up to the next whole dollar into a running tally, paid from your checking account, and moved to your savings daily or weekly, as you choose, at most $15 a transfer with the rest carried to the next.',
    ways: [{ kind: 'change', units: [1] }],
    when: 'day',
    every: ['day', 'week'],
    minimumAtLeast: 50,
    perTransfer: 15,
    credit: true,
    short: 'You set a minimum balance, at least $50. Below it on the day a transfer is due, Citi tries the next two days, and after three days below it turns Spend & Save off.',
    open: ['What happens to the tally when it’s turned off, by you or by Citi: the game drops it.', 'A purchase of whole dollars: the game moves nothing.', 'Daily on calendar days or business days: the game moves it every day; weekly from the day you turn it on, the game’s reading of “the next occurrence of the chosen weekday”.'],
    notHere: [],
    source: 'citi.com/online-services/ways-to-save, Spend & Save terms (undated, read October 13, 2026)',
    checked: CHECKED,
  },
  'fr-lcl': {
    product: 'System’Épargne',
    words: 'Every card payment in euros is rounded up to the next 1 € or the next 5 €, as you choose, and the total moves to your savings twice a month.',
    ways: [{ kind: 'change', units: [1, 5] }],
    when: 'half-month',
    short: 'If the period’s transfer would leave the account in debit, it’s canceled in full for that period, not carried.',
    open: ['The day of the twice-monthly transfer: the terms say each “quinzaine”, so the game moves it on the 1st and the 16th.', 'A payment already at a whole euro (or a multiple of 5 €): the game moves nothing.', 'Turned off, the round-ups counted before aren’t credited, as the terms say; switching your primary account to another bank drops them too.'],
    notHere: ['A deferred-debit card’s round-ups move at the month’s end; the game’s card is an immediate-debit one.', 'A child’s account or an LCL-chosen charity can receive them; the game moves them to your savings.'],
    source: 'LCL, Carte Visa Cléo Dispositions Générales, Option System’Épargne, in force from January 1, 2026',
    checked: CHECKED,
  },
  'gb-lloyds': {
    product: 'Save the Change',
    words: 'Every Lloyds debit card purchase is rounded up to the next whole pound, and the day’s change moves to your savings at the start of the next working day: Friday’s on Monday, and Saturday’s to Monday’s together on Tuesday.',
    ways: [{ kind: 'change', units: [1] }],
    when: 'next-business',
    short: 'It moves only as long as it doesn’t take the account overdrawn, or more overdrawn. The game drops what couldn’t move: the conditions don’t say whether it’s carried.',
    open: ['What happens to change not yet moved when an account closes: the game drops it.', OFF],
    notHere: ['A refunded purchase’s change stays in savings, as the conditions say; purchases in the game aren’t refunded.'],
    source: 'Lloyds Save the Change conditions M57299 (04/26), read from the Wayback Machine’s capture of September 22, 2026',
    checked: CHECKED,
  },
  'gb-natwest': {
    product: 'Round Ups',
    words: 'Debit card payments in pounds are rounded up to the next whole pound, and the change, times the multiplier you pick from 1 to 5, moves to your savings at the day’s end.',
    ways: [{ kind: 'change', units: [1], multipliers: [1, 2, 3, 4, 5] }],
    defaultMultiplier: 1,
    when: 'day',
    short: 'Round Ups never take you into an overdraft, and don’t move while you’re already in one. The game drops what couldn’t move: NatWest doesn’t say whether it’s tried again.',
    open: ['The multiplier is optional, so ×1 is the plain change and the game’s starting choice; NatWest doesn’t call it a default in so many words.', 'NatWest moves them when the payments clear, which can take up to 4 days; the game moves them at the day’s end.', 'Closing the current or savings account stops Round Ups, and what hasn’t moved doesn’t, as NatWest says.'],
    notHere: [],
    source: 'natwest.com/savings/tools-for-savings/round-ups.html and the support FAQ, read live October 13, 2026',
    checked: CHECKED,
  },
  'de-ing': {
    product: 'Kleingeld Plus',
    words: 'Every card payment is rounded up to the next 1 € or the next 5 €, as you choose, and the day’s amounts move to your Extra-Konto savings each day.',
    ways: [{ kind: 'change', units: [1, 5] }],
    when: 'day',
    pausedUnder: 20,
    short: 'It pauses while your checking account holds less than 20 €, so it doesn’t go into the red, and starts again above it.',
    open: ['Round-ups from payments made while it’s paused: the game counts none.', 'Whether a refunded payment takes its round-up back: purchases in the game aren’t refunded.', OFF],
    notHere: ['With Girokonto Future, the change can go to a charity instead of savings.'],
    source: 'ing.de, Kleingeld Plus product page and FAQ; Bedingungen Girokonto Future, June 19, 2026',
    checked: CHECKED,
  },
  'ca-scotiabank': {
    product: 'Bank The Rest',
    words: 'Every ScotiaCard debit purchase is rounded up to the next multiple of $1 or $5, as you choose, and the day’s round-ups move to your Money Master savings at the end of each business day.',
    ways: [{ kind: 'change', units: [1, 5] }],
    when: 'business',
    short: 'If the balance at the business day’s end is less than the day’s round-ups, that day’s transfer is canceled, even with overdraft protection.',
    open: ['A purchase already at a multiple of the unit: the game moves nothing.', 'Whether a canceled day is tried again: the game drops it.', 'Closing the Money Master account turns it off, as the terms say.', OFF],
    notHere: ['A canceled or reversed purchase leaves its round-up in savings, as the terms say; purchases in the game aren’t refunded.', 'The investment option moving a month’s round-ups to a fund.'],
    source: 'Scotiabank, Day-to-Day Banking Companion Booklet, September 2026, Part 16',
    checked: CHECKED,
  },
  'ca-td': {
    product: 'Simply Save',
    words: 'Not a round-up: a fixed amount you choose, from $0.50 to $5.00, for each debit purchase, moved from checking to your savings daily, weekly or every two weeks, as you choose.',
    ways: [{ kind: 'flat', range: { min: 0.5, max: 5 } }],
    when: 'day',
    every: ['day', 'week', 'fortnight'],
    short: 'TD won’t make the transfer if checking doesn’t have enough to cover it. The game drops it: TD doesn’t say whether it’s carried to the next.',
    open: ['The steps between $0.50 and $5.00: the game takes any amount in cents.', 'Which weekday a weekly transfer falls on: the game counts from the day you turn it on.', OFF],
    notHere: ['TD can count ATM withdrawals as well as, or instead of, purchases; the game counts purchases.'],
    source: 'td.com, automated savings and TD Ask Us (Simply Save), undated, read October 13, 2026',
    checked: CHECKED,
  },
  'mx-bbva': {
    product: 'Plan, Redondeo',
    words: 'Each purchase on your BBVA debit or credit card is rounded up to the next $10, $50 or $100, as you choose, and the difference goes to your Plan savings; a purchase already at a multiple moves a whole unit.',
    ways: [{ kind: 'change', units: [10, 50, 100], fullOnWhole: true }],
    when: 'day',
    credit: true,
    short: DROPPED_UNSAID,
    open: ['When each amount posts: BBVA says “with each purchase”, and the game moves the day’s together at its end.', 'BBVA may cap it at amounts it doesn’t publish: the game sets none.', OFF],
    notHere: ['The Porcentaje rule, a share of each purchase.', 'The Plan account pays no interest; the game moves it to your savings.'],
    source: 'BBVA México, Contrato de Productos y Servicios Múltiples, chapter I.IV (Plan), RECA 0305-999-037855/09-01904-0826; ficha Plan, January 5, 2023',
    checked: CHECKED,
  },
  'mx-santander': {
    product: 'Mis Metas, Redondeo',
    words: 'Each purchase on your Santander debit or credit card is rounded up to the next $10, and the difference goes to your savings.',
    ways: [{ kind: 'change', units: [10] }],
    when: 'day',
    credit: true,
    short: DROPPED_UNSAID,
    open: ['A purchase already at a multiple of $10: the game moves nothing.', 'When it posts: Santander says with each purchase, and the game moves the day’s together at its end.', 'Santander doesn’t say that a credit card purchase’s round-up comes from your checking account; the game takes it from there.', OFF],
    notHere: ['Disfruta y guarda, a set amount at participating merchants, whose list isn’t published.', 'A meta is a goal kept inside your checking account, not a savings product, and Santander’s pages disagree on whether it earns interest; the game moves it to your savings.'],
    source: 'Santander México, Mis Metas page and FAQ (read live October 13, 2026); contract clause V.28',
    checked: CHECKED,
  },
  'kr-kakaobank': {
    product: '저금통, 동전 모으기',
    words: 'Not a purchase round-up: each weekday, Monday to Friday, holidays or not, the part of the previous day’s closing balance under ₩1,000 moves to your savings, the 저금통.',
    ways: [{ kind: 'remainder', unit: 1000, above: 1000, cap: 100000 }],
    when: 'weekdays',
    short: 'It’s skipped when the balance is ₩1,000 or less, never moves just part, and never overdraws the account.',
    open: ['A sweep that would take the 저금통 past its ₩100,000 cap: the game skips it. Your KakaoBank savings stand in for the 저금통, and the cap counts what the sweeps have put in, never more than the savings hold.', 'Stopping it stops saving from that moment, as KakaoBank says.'],
    notHere: ['자동 모으기, an amount KakaoBank works out each Saturday.', '캐시백 모으기, cashback from brand coupons.'],
    source: 'kakaobank.com/products/coinbox; 저금통 특약 (부칙 September 23, 2026)',
    checked: CHECKED,
  },
  'es-santander': {
    product: 'Cuenta Hucha, redondeo',
    words: 'Each card purchase is rounded up to the next euro, and the difference goes to your Hucha savings.',
    ways: [{ kind: 'change', units: [1] }],
    when: 'day',
    short: DROPPED_UNSAID,
    open: ['Santander also offers “two units up” and “another figure”, without saying how either is worked out: the game offers the next euro only.', 'A purchase of whole euros: the game moves nothing.', 'When it moves: the game moves the day’s at its end.', OFF],
    notHere: [],
    source: 'bancosantander.es, Cuenta Hucha Digital page and precontract (read live October 13, 2026)',
    checked: CHECKED,
  },
  'es-bbva': {
    product: 'Programa tu Cuenta, Redondeo en compras',
    words: 'Each BBVA debit card purchase that isn’t a whole euro is rounded up to the next euro; the day’s round-ups are added up at its end and move to your savings.',
    ways: [{ kind: 'change', units: [1] }],
    when: 'day',
    short: 'If the account doesn’t have what the rule needs, it doesn’t run. The game drops that day’s: BBVA doesn’t say whether it’s tried again.',
    open: ['A multiplier from x2 to x4, in BBVA’s 2019 and 2020 news and on none of its pages now: not offered.', OFF],
    notHere: ['A purchase refunded leaves its round-up where it went, as BBVA says; purchases in the game aren’t refunded.', 'A pension plan or a fund can receive them.'],
    source: 'bbva.es, reglas de Programa tu Cuenta (updated July 28, 2025) and app-redondeo-ahorro (updated October 13, 2025)',
    checked: CHECKED,
  },
  'es-sabadell': {
    product: 'Ahorro Sabadell, redondeo de cada compra',
    words: 'Each purchase is rounded up to the next euro, and the week’s round-ups move to your Ahorro Sabadell overnight from Friday to Saturday.',
    ways: [{ kind: 'change', units: [1] }],
    when: 'friday-night',
    short: DROPPED_UNSAID,
    open: ['The next euro is only in Sabadell’s 2020 brochure; its pages now give no unit.', 'Whether a “compra” is a card purchase only or, as in 2020, any payment from the account: the game counts card purchases.', 'A multiplier is reported only outside Sabadell: not offered.', OFF],
    notHere: [],
    source: 'bancsabadell.com, Ahorro Sabadell page and help center (when the saving moves, May 1, 2024)',
    checked: CHECKED,
  },
  'es-bankinter': {
    product: 'Cuenta Modo Ahorro, redondeo',
    words: 'Each card purchase moves the change to the next euro and the rest of the amount you choose, €1 or €2 (€6.30 at €2 moves €1.70), in one charge the day after.',
    ways: [{ kind: 'changePlus', amounts: [1, 2] }],
    when: 'day',
    short: DROPPED_UNSAID,
    open: ['Bankinter also lets you pick any other amount, with no limits stated: the game offers the two it names.', 'A purchase of whole euros: the game moves the amount past the first euro, nothing at €1.', OFF],
    notHere: ['A round-up set on several goals moves once for each; the game has one.'],
    source: 'bankinter.com, Cuenta Modo Ahorro (read live October 13, 2026)',
    checked: CHECKED,
  },
  'is-landsbankinn': {
    product: 'Sparað með kortanotkun',
    words: 'Each debit card purchase is either rounded up to the next 100, 500 or 1,000 kr, or raised by a set 100, 250, 500 or 1,000 kr, as you choose, and the day’s saving moves at the end of each banking day.',
    ways: [{ kind: 'change', units: [100, 500, 1000] }, { kind: 'flat', amounts: [100, 250, 500, 1000] }],
    when: 'business',
    short: 'If the account has no funds at the banking day’s end, that day’s saving is canceled, and it’s never made on an overdraft.',
    open: ['The detailed rules are from 2019 and 2020; the bank’s page still offers the next hundred or thousand and a set amount.', 'A purchase already at a multiple of the unit: the game moves nothing.', OFF],
    notHere: ['On a Visa credit card it’s worked out at the statement’s end and moved on the due date.', 'Spara í appi’s set amount a purchase, whose choices the bank doesn’t give.', 'Another customer’s account or a charity can receive it.'],
    source: 'landsbankinn.is/einstaklingar/sparnadur (read live October 13, 2026); terms, Wayback capture of December 8, 2019',
    checked: CHECKED,
  },
  'is-islandsbanki': {
    product: 'Eigðu afganginn',
    words: 'Each debit card purchase is rounded up to the next 100, 500 or 1,000 kr, as you choose, and the day’s difference moves to your savings at the end of each working banking day.',
    ways: [{ kind: 'change', units: [100, 500, 1000] }],
    when: 'business',
    short: 'If the balance goes below the withdrawal limit, 0 kr, that day’s saving is canceled; the overdraft is never used for it.',
    open: ['The detailed rules are from the bank’s pages of 2009 and 2018; its page now still offers 100, 500 or 1,000 kr.', 'A purchase already at a multiple of the unit: the game moves nothing.', OFF],
    notHere: ['ATM withdrawals counted too, in the 2009 rules.', 'Someone else’s account, or a charity’s, can receive it.'],
    source: 'islandsbanki.is, Eigðu afganginn (read live October 13, 2026); rules, archived August 25, 2018',
    checked: CHECKED,
  },
  'au-anz': {
    product: 'ANZ Plus Round Ups',
    words: 'Each ANZ Plus Visa Debit purchase is rounded up to the next $1, $2, $5 or $10, as you choose, and the difference moves to your ANZ Plus savings the same day.',
    ways: [{ kind: 'change', units: [1, 2, 5, 10] }],
    when: 'day',
    short: DROPPED_UNSAID,
    open: ['ANZ Plus accounts only: the game takes your ANZ account as one.', 'A $2 default appears only in ANZ’s 2023 launch release, and its pages now state none: you choose.', 'Each purchase’s round-up moves on its own; the game moves the day’s together at its end.', OFF],
    notHere: ['ANZ won’t reverse a Round Up when the purchase changes, as its terms say; purchases in the game aren’t refunded.'],
    source: 'anz.com.au, ANZ Plus terms and conditions, November 24, 2025; Round Ups support page, October 27, 2025',
    checked: CHECKED,
  },
  'nz-asb': {
    product: 'Save the Change',
    words: 'Each EFTPOS and Visa Debit purchase is rounded up to the next $1, $2, $5 or $10, as you choose, and the day’s change moves to your savings overnight.',
    ways: [{ kind: 'change', units: [1, 2, 5, 10] }],
    when: 'day',
    short: 'When the account can’t cover the day’s change, nothing moves that day, all or nothing.',
    open: ['That the skipped change isn’t carried, ASB doesn’t say in so many words: the game drops it.', 'ASB’s current pages state no default: you choose.', OFF],
    notHere: ['With an arranged overdraft it moves within the limit; the game has no arranged overdraft.', 'One to ten savings accounts, or Donate the Change; the game moves it to your savings.'],
    source: 'asb.co.nz, Save the Change and help pages, read from Wayback copies of 2025 and 2026',
    checked: CHECKED,
  },
};

