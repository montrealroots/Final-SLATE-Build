/**
 * SLATE — what opening a current account at a bank takes, how long money takes to move between banks, and what a
 * bank does with an account nobody funds (from 2026-10-10, `systems/bankmoves.ts`).
 *
 * Every figure is the bank's own, from its deposit account agreement or its help pages, as
 * `docs/research/world/research-banking.json` quotes them, read on 2026-10-10. Where a bank gives a range, SLATE takes
 * its longer end, and says so. Where a bank publishes nothing, the entry says that too: SLATE then keeps no rule at all
 * (no review, no minimum, no closing), or an estimate marked `estimate` that the screen calls SLATE's. Nothing here was
 * set to make moving banks harder: Citi and Capital One open at once, and so do the others whose timing isn't published.
 */

import type { Money } from '../core/money';

export interface Opening {
  /** Business days the bank takes to decide an application, where it says. Absent: decided as it's made. */
  reviewDays?: number;
  /** The opening deposit the product asks for, in the bank's currency's hundredths. Absent: none. */
  minimumDeposit?: Money;
  /** The account isn't open for use until money is in it (Capital One: "at least a penny"). */
  openedWhenFunded?: boolean;
  /** Days after opening by which it must be funded, or the bank closes it. */
  fundWithinDays?: number;
  /** Days at a zero balance after which the bank closes it, where it says so. */
  closesAtZeroAfterDays?: number;
  /** A new debit card: in so many days, business or calendar, and whether a digital card works in the meantime. */
  card?: { days: number; business: boolean; digital?: boolean };
  /** Business days a transfer to the holder's own account at another bank takes, sent from here. */
  sendDays?: number;
  /** The same business day, sent before this hour of the bank's day; the next business day after it. */
  sameDayBefore?: number;
  /** What it lets go out to other banks in a day and a month, in the bank's hundredths, through its transfer service. */
  limits?: { outDay: Money; outMonth: Money };
  /** The age it opens an account for somebody on their own. */
  minimumAge?: number;
  /** For US citizens and permanent residents only (Capital One), or so online with no branch route published (Citi). */
  usPersonsOnly?: boolean;
  /** Without a US taxpayer number, opened only in a branch, with a passport (from 2026-10-10). */
  withoutSsn?: 'branch';
  /** Days it may keep an account open, restricted, while items are pending, before closing it. Absent: it won't close one with items pending. */
  closeWithPendingDays?: number;
  source: string;
}

export const OPENING: Readonly<Record<string, Opening>> = {
  'us-chase': {
    // "No minimum opening deposit"; Chase "may automatically close your account if the balance is $0", with no count of
    // days, so SLATE closes nothing for it.
    card: { days: 7, business: false },
    sendDays: 3,
    minimumAge: 18,
    withoutSsn: 'branch',
    source: 'Chase: "International students ... must open account at a Chase branch", with a passport, a US address and a second ID such as the I-20, no SSN needed. Chase Total Checking page and Deposit Account Agreement of June 14, 2026: 18 or older; the debit card "typically arrives in about a week"; a transfer to or from a non-Chase account "typically takes 2-3 business days"',
  },
  'us-bank-of-america': {
    reviewDays: 2,
    minimumDeposit: 100_00,
    card: { days: 6, business: true, digital: true },
    minimumAge: 18,
    withoutSsn: 'branch',
    source: 'Bank of America: no SSN needed in person, a foreign passport and a second ID, with both addresses; "Your application will be processed in 1 to 2 business days"; Advantage Plus Banking "requires a $100 opening deposit"; "You will receive your debit card in 4-6 business days", with a digital card in the app "to use while you\'re waiting". Its time for a transfer to another bank isn\'t published',
  },
  'us-wells-fargo': {
    minimumDeposit: 25_00,
    card: { days: 7, business: false },
    sendDays: 2,
    minimumAge: 18,
    withoutSsn: 'branch',
    source: 'Wells Fargo: online needs an SSN or ITIN, and in a branch a passport serves (though its FAQ also says a branch asks for one); "Be at least 18 years old"; Everyday Checking "$25 opening deposit"; a new card "within 5 to 7 calendar days"; "Initially the delivery speed is 2 business days for a transfer from your Wells Fargo account to your account at another financial institution". The game leaves out its closing of a zero-balance account at a fee period\'s end unless something posted in two months',
  },
  'us-citi': {
    closesAtZeroAfterDays: 90,
    sameDayBefore: 12.5,
    limits: { outDay: 10_000_00, outMonth: 15_000_00 },
    minimumAge: 18,
    usPersonsOnly: true,
    closeWithPendingDays: 21,
    source: 'Citi Consumer Deposit Account Agreement: "no minimum opening deposit"; "Accounts with zero balances are subject to closure after 90 days"; with items pending "the account may remain open for a period of up to 21 days"; a transfer to another bank the same day before 12:30 PM ET, the next after; $10,000 a day and $15,000 a month out for an account not yet "tenured" (when one becomes tenured isn\'t published, so the game keeps the lower limits throughout); its inbound limits are for money Citi pulls in, and in the game every transfer is sent by the bank it leaves, so the game leaves them out. Online, a US citizen or resident alien, 18 or older. Its debit card\'s delivery isn\'t published',
  },
  'us-capital-one': {
    openedWhenFunded: true,
    fundWithinDays: 60,
    usPersonsOnly: true,
    card: { days: 7, business: true },
    sendDays: 3,
    source: 'Capital One 360 Checking: for "United States citizens or lawful permanent residents" (disclosure of May 20, 2026); "There is no minimum deposit required"; it "won\'t be considered \'opened\' until it\'s funded ... at least a penny"; it "must be funded within 60 days of account opening, otherwise it will automatically close"; the debit card "within 5-7 business days"; transfers to your own account elsewhere "typically take 2-3 business days". Its minimum age isn\'t stated',
  },
};

/** Business days a transfer between banks takes where the bank publishes none: SLATE's estimate, the longer end of the US banks that do (Chase, Capital One). */
export const ESTIMATE_SEND_DAYS = 3;
/** Days a new debit card takes where the bank publishes none: SLATE's estimate, the same as a replacement (`systems/security.ts`). */
export const ESTIMATE_CARD_DAYS = 7;

/**
 * How money moves between two banks in a country, where its banks share a scheme that says: at once (`instant`), or in
 * so many business days. A US bank's own figure (`OPENING`) comes first.
 */
export const TRANSFERS: Readonly<Record<string, { instant?: boolean; days?: number; sameDayBefore?: number; scheme: string; source: string }>> = {
  GB: { instant: true, scheme: 'Faster Payments', source: 'Pay.UK: in seconds; the Payment Services Regulations 2017, reg. 86, allow until the next business day. The game leaves out a fraud hold of up to four business days (2024)' },
  IE: { instant: true, scheme: 'SEPA Instant', source: 'Regulation (EU) 2024/886: every euro bank sends instant transfers from October 9, 2025, within ten seconds' },
  DE: { instant: true, scheme: 'SEPA Instant', source: 'Regulation (EU) 2024/886, as for Ireland' },
  FR: { instant: true, scheme: 'SEPA Instant', source: 'Regulation (EU) 2024/886, as for Ireland' },
  ES: { instant: true, scheme: 'SEPA Instant', source: 'Regulation (EU) 2024/886, as for Ireland' },
  IS: { instant: true, scheme: 'the Central Bank\'s real-time system', source: 'Central Bank of Iceland: domestic krónur transfers settle in real time' },
  JP: { sameDayBefore: 15.5, scheme: 'Zengin', source: 'Zengin-Net: in real time in its core hours, 8:30 AM to 3:30 PM on business days; at night and on holidays only between banks in its extended hours since October 2018, so the game uses the next business day then' },
  KR: { instant: true, scheme: 'KFTC interbank network', source: 'Korea Financial Telecommunications and Clearings Institute (BIS CPMI): in seconds' },
  MX: { instant: true, scheme: 'SPEI', source: 'Banco de México, SPEI rules: credited within 5 or 30 seconds, every day' },
  AU: { instant: true, scheme: 'NPP / Osko', source: 'Reserve Bank of Australia: near real time, every day, where both banks are on the NPP' },
  NZ: { instant: true, scheme: 'interbank settlement', source: 'Payments NZ: settled within the day, every day since 2025, usually in one to two hours (secondary summaries); the game has it arrive at once' },
  CA: { days: 1, scheme: 'electronic funds transfer', source: 'Payments Canada: an EFT the next business day, often one to three; Interac e-Transfer takes minutes but has its own limits, and the Real-Time Rail launches from late 2026' },
};
