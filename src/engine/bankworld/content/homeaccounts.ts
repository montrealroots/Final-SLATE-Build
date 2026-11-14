/**
 * SLATE — what a bank in the country a Yale student lived in before does with their account once they live in America
 * (from 2026-10-16, the owner's decision of that day: an eligible student may keep an account they already held there,
 * beside the American one).
 *
 * The research is `docs/research/banking/home-accounts.json`, read on 2026-10-16, sixty banks in the thirteen countries
 * SLATE banks in by name. What the rule and the creation screen read of it is copied into `content/home-accounts.json`
 * by `tools/build-home-accounts.mjs`, quoted rather than rewritten, and typed here (`HOME_TERMS`). What SLATE took from
 * the words to act on is in `READ` below, each with where it came from:
 *
 * - **Retention.** The research's `kept`: `true` is kept; `false` is closed with the bank's notice (Barclays, the one
 *   such bank); `conditional` is kept on the conditions the research states, as SLATE's assumption, and the screen says
 *   so. Its confidence (`confidence`) is the research's footing: high where the bank says it in its own words, medium
 *   where the bank publishes its price for a customer abroad but no rule on moving, low where it publishes nothing on
 *   moving and the account rests on the absence of a rule ("The 46 conditionals rest on the absence of a published
 *   emigration rule, not on a published permission", the research's summary).
 * - **A bank with no usable terms is refused, never guessed.** A bank the research didn't read has no entry, and the
 *   rule says "SLATE has no research on what <bank> does when a customer moves to America." That is every bank in the
 *   world's ~230 other countries: the research's `world.assumptions` say only that such an account "may" be kept,
 *   converted, restricted or closed, and that its transfer fees weren't researched and "SLATE does not invent a
 *   per-country number". Neither says what happens, so neither was taken as a rule. And a bank the research read whose
 *   own words leave nothing to keep on is refused for its reason (`unusable`).
 * - **Opening age.** Read where the research found one (PTSB 18, Kiwibank 16, BBVA México's Libretón Básico 18).
 *   Elsewhere SLATE assumes 16, said on the screen as SLATE's (`ageAssumed`).
 * - **US persons.** None of the sixty publishes refusing or closing a US person's account (the research's summary), so
 *   every entry keeps one. `addHomeTerms` registers terms a test needs, a bank that refuses one among them.
 *
 * The cards abroad, transfers, identification and tax at source were in the research too, and weren't copied until
 * modules 4 and 5 of 2026-10-16 read them. Each bank's `abroad` (`AbroadTerms`) is read by hand from its words in
 * `RESEARCH.banks[id].abroad`, as the retention was: its debit card's fee on a purchase in dollars and at a machine, its
 * fee and margin on a payment abroad and how many business days it takes, its fee on one received, and its limits. A
 * figure the research says isn't published, or found only on a site that isn't the bank's, is left out, and what needs
 * it is refused in words ("SLATE has no research on …"), never guessed. Two figures that almost no bank publishes have
 * SLATE's stated assumption in their place, said wherever they're used: the margin on the exchange
 * (`ASSUMED_MARGIN`) and the days a payment takes (`ASSUMED_DAYS`). The five American banks' wires are `US_WIRES`, and
 * each country's tax at source on a non-resident's interest `NON_RESIDENT_TAX`.
 */

import type { Money } from '../core/money';
import { bankById } from './banks';
import data from './home-accounts.json';

/** One bank's retention, as the research quotes it. */
interface Researched {
  kept: true | false | 'conditional';
  conditions: string;
  nonResidentFee: string | null;
  closesWithNoticeDays: number | null;
  usResidentPolicy: string;
  /** What it does for a customer abroad, quoted: card and machine fees, payments abroad, opening, identification, tax. */
  abroad: { card: string; atm: string; outgoing: string; incoming: string; fxMargin: string; days: string; opening: string; kyc: string; taxAtSource: string };
  assumptions: readonly string[];
  sources: readonly Source[];
}

interface Source { title: string; url: string; read: string; official: boolean }

export const RESEARCH: {
  read: string;
  banks: Readonly<Record<string, Researched>>;
  /** Each country's tax at source on a non-resident's interest, quoted. */
  countries: Readonly<Record<string, { nonResidentWithholding: string; sources: readonly Source[] }>>;
  /** America's rules on a student's account abroad, quoted: an F-1's foreign interest, US persons, FBAR, Form 8938, FATCA. */
  us: { foreignInterestForF1: string; usPersons: string; fbar: string; form8938: string; fatca: string; sources: readonly Source[] };
  world: { assumptions: readonly string[] };
} = data as never;

/**
 * A fee as a bank publishes it, in its currency's hundredths unless `currency` names another (BBVA México's fees are in
 * dollars): a fixed part, a share of the amount held between a minimum and a maximum, a second part beside it (`plus`),
 * and lower charges for an amount up to a line (`upTo`, the first line the amount is within).
 */
export interface Charge {
  fixed?: Money;
  share?: number;
  min?: Money;
  max?: Money;
  plus?: Charge;
  upTo?: readonly { amount: Money; charge: Charge }[];
  currency?: string;
}

/**
 * What a bank does for a customer who lives abroad, read from its words (`RESEARCH.banks[id].abroad`). A charge left out
 * is one the research found unpublished, or only on a site that isn't the bank's; a `…Refused` is the bank's own reason
 * there is none.
 */
export interface AbroadTerms {
  /** Its debit card on a purchase in another currency. */
  card?: Charge;
  cardRefused?: string;
  /** The first so much a month of purchases abroad free of the card's fee (BBVA's €300). */
  cardFreeMonthly?: Money;
  /** Its debit card at another bank's machine abroad. */
  atm?: Charge;
  atmRefused?: string;
  /** Its fee for sending a payment abroad, online where it has an online way. */
  out?: Charge;
  outRefused?: string;
  /** Its margin on the exchange, as a share of the amount, where it publishes one; lower over a line where it says. */
  margin?: number;
  marginOver?: readonly { from: Money; rate: number }[];
  /** Its fee on a payment received from abroad. */
  incoming?: Charge;
  /** The business days a payment abroad takes, where it publishes them. */
  days?: number;
  /** Its limits on what goes out a day or a month, in its money. */
  limitDay?: Money;
  limitMonth?: Money;
  /** Why it opens nothing new for a customer abroad, in its words where the research quotes them. */
  opening?: string;
}

/** The margin SLATE takes where a bank publishes none: the FSB's 2024 average cost of a retail payment abroad, which the research keeps as its calibration. */
export const ASSUMED_MARGIN = 0.026;
/** The business days SLATE takes where a bank publishes none: the middle of the one to five that the banks publishing them give. */
export const ASSUMED_DAYS = 3;
/** What each assumption says beside the figure. */
export const ASSUMED_WORDS = {
  margin: 'an estimate: the bank publishes no margin, so the game uses the FSB’s 2024 average cost of a payment abroad, 2.6%',
  days: 'an estimate: the bank publishes no time, so the game uses three business days',
} as const;

/** A fee the bank charges a customer who lives abroad, in its currency's hundredths, every so many months. */
export interface NonResidentFee {
  amount: Money;
  months: number;
  /** Not charged under this age. */
  ageBelow?: number;
  /** What it is, in the bank's words, and what's uncertain. */
  note: string;
  /**
   * A bank whose current account can't go below zero (from 2026-10-16): the fee is taken from an account at the bank that
   * holds it (`chargeAbroadFee`), and where none does it's owed, taken the first night one does, and meanwhile the bank
   * sends nothing abroad, in these words. Until then every bank's fee overdrew the current account, which a home account
   * at SMBC opens empty, by ¥220 a month while its savings held a million yen.
   */
  unpaid?: string;
}

export interface HomeTerms {
  bankId: string;
  /** What the bank does once its customer lives in America. */
  nonResident: 'keeps' | 'closes' | 'conditional';
  /** For one that closes: the notice, in days. */
  closeNoticeDays?: number;
  /** A longer notice for an account opened on or after a date, YYYY-MM-DD (Britain's 90 days from 28 April 2026). */
  longerNotice?: { openedFrom: string; days: number };
  /** What it does with the account of a US person: keeps it, closes it, or never opened one. */
  usPersons: 'keeps' | 'closes' | 'refuses';
  /** For one kept on conditions: what SLATE assumes it's kept on, in a sentence. */
  condition?: string;
  nonResidentFee?: NonResidentFee;
  /** The age it opens an account from. */
  openFromAge: number;
  /** The age is SLATE's: the research read none for the bank. */
  ageAssumed: boolean;
  /** How sure the research was that the account is kept (or closed) as said. */
  confidence: 'H' | 'M' | 'L';
  /** Researched, but its words leave nothing SLATE can keep the account on: why. */
  unusable?: string;
  /** Its card, cash, payments abroad and opening, for a customer who lives abroad (modules 4 and 5, 2026-10-16). */
  abroad: AbroadTerms;
  source: string;
  asOf: string;
}

/** What each footing means, said on the screen beside the bank (the bank workspace's CONFIDENCE, for retention). */
export const RETENTION_CONFIDENCE: Readonly<Record<HomeTerms['confidence'], string>> = {
  H: 'The bank says so in its own words.',
  M: 'The bank publishes its price for a customer abroad but no rule on moving, so this is the game’s reading of it.',
  L: 'The bank publishes nothing on a customer who moves abroad, so this is the game’s assumption.',
};

/** The opening age SLATE takes where the research read none. */
export const ASSUMED_OPENING_AGE = 16;

/** Britain's longer notice: SI 2025/688, 90 days for a payment account opened from 28 April 2026 (the research's `countries.GB`). */
const UK_LONGER = { openedFrom: '2026-04-28', days: 90 } as const;

/** What SLATE took from the research's words, bank by bank, beyond `kept` and the notice. */
const READ: Readonly<Record<string, Partial<Omit<HomeTerms, 'bankId' | 'source' | 'asOf' | 'abroad'>>>> = {
  // "SLATE assumes closesWithNoticeDays = 60 (two months) for a Barclays account opened before 28 April 2026".
  'gb-barclays': { longerNotice: UK_LONGER },
  'gb-lloyds': { condition: 'Lloyds keeps it once you’ve told it your American address, though its terms say it “may not be able to keep your account open” for a customer who moves abroad.' },
  'gb-natwest': { condition: 'NatWest keeps it once you’ve registered your American address: it says that “in most cases” nothing changes when a customer moves abroad.' },
  'gb-santander': { condition: 'Santander UK keeps it once you’ve told it you moved (“we can currently service existing products”), though its terms ask that a customer be a UK resident.' },
  'gb-nationwide': { condition: 'Nationwide keeps it once you’ve registered your American address; its guidance on moving abroad is written for Europe and says nothing about America.' },
  'ie-ptsb': { openFromAge: 18, condition: 'PTSB keeps it once you’ve completed its non-resident form and the tax self-certification.' },
  'fr-bnp-paribas': {
    condition: 'BNP Paribas keeps it at its price for a customer living outside France.',
    nonResidentFee: { amount: 15_00, months: 1, note: '€15 a month for a customer living in a country outside the tax-information exchange, which the United States is; whether its free account for under-25s waives it isn’t said, so the game charges it' },
  },
  'fr-societe-generale': {
    condition: 'SG keeps it at its quarterly charge for a customer living abroad, which it doesn’t charge under 25.',
    nonResidentFee: { amount: 75_00, months: 3, ageBelow: 25, note: '€75 a quarter for a customer living outside the tax-information exchange, the game’s reading of where SG puts the United States; none under 25' },
  },
  'fr-lcl': {
    condition: 'LCL keeps it at its quarterly charge for a customer living outside the European Union, which it doesn’t charge under 26.',
    nonResidentFee: { amount: 40_00, months: 3, ageBelow: 26, note: '€40 a quarter for a customer in the United States with no income paid in, which LCL counts in the tax-information exchange; none under 26' },
  },
  'de-deutsche-bank': { condition: 'Deutsche Bank keeps it, as an AktivKonto at €6.90 a month: its free account for students needs an address in the European Union, and the price list says it then carries on as an AktivKonto.' },
  'de-ing': { condition: 'ING keeps it, though its terms ask for a home and work in Germany to open one, and customers who moved abroad report it ending theirs on two months’ notice.' },
  'es-santander': { condition: 'Banco Santander keeps it as a non-resident account, once you’ve given it proof that you no longer live in Spain, renewed every two years.' },
  'es-bbva': { condition: 'BBVA keeps it as a non-resident account, once you’ve given it proof that you no longer live in Spain, renewed every two years.' },
  'es-caixabank': { condition: 'CaixaBank keeps it as a non-resident account, once you’ve given it proof that you no longer live in Spain, renewed every two years.' },
  'es-sabadell': {
    condition: 'Banco Sabadell keeps it as a non-resident account, and charges for asking the police for your certificate of non-residence every two years.',
    nonResidentFee: { amount: 30_00, months: 24, note: '€30 every two years for the certificate of non-residence it asks the police for, plus the police’s own charge, which isn’t published' },
  },
  'es-bankinter': { condition: 'Bankinter keeps it as a non-resident account, once you’ve given it proof that you no longer live in Spain, renewed every two years.' },
  'jp-mufg': {
    condition: 'MUFG keeps it through Global Direct, which a student going abroad to study applies for before leaving, as the game assumes you did.',
    nonResidentFee: {
      amount: 300_00, months: 1, note: '¥300 a month for Global Direct; what it does when the fee can’t be taken isn’t published, so the game uses SMBC’s rule: a Japanese ordinary deposit has no overdraft',
      unpaid: 'MUFG sends nothing abroad while its Global Direct fee is unpaid, an assumption the game takes from SMBC’s rule.',
    },
  },
  'jp-smbc': {
    condition: 'SMBC keeps it through its Global Service, which a student going abroad to study registers for before leaving, as the game assumes you did; a cash card then works only at Japanese ATMs.',
    nonResidentFee: {
      amount: 220_00, months: 1, note: '¥220 a month for the Global Service',
      // "If the fee cannot be debited, transfers and some other services stop" (the research's `nonResidentFee`).
      unpaid: 'SMBC stops its payments abroad while the Global Service fee can’t be taken.',
    },
  },
  'jp-mizuho': { condition: 'Mizuho keeps it once it’s changed to non-resident status at a branch, but then with no cash card and no internet banking.' },
  'jp-resona': { condition: 'Resona keeps it once it’s converted to a non-resident yen deposit at a branch before leaving.' },
  // The research's own default is closing: "SLATE assumes the default for a Japan Post Bank customer leaving to study in
  // the US is closure (the bank's own published request)", kept only with a proxy in Japan, which SLATE has none of.
  'jp-japan-post-bank': { unusable: 'Japan Post Bank asks a customer going abroad to close the account, and keeps one open only if someone in Japan acts for them, which the game doesn’t offer.' },
  'kr-kakaobank': { condition: 'KakaoBank keeps it while you keep your Korean phone number: it has no branch, and every check runs through the app and that phone.' },
  'au-nab': { condition: 'NAB keeps it once you’ve updated your tax residency, though its guidance for customers leaving Australia steers them to close.' },
  'au-anz': { condition: 'ANZ keeps it only until it acts on its rule that a customer has an Australian address, which the game assumes you don’t.' },
  'mx-bbva': { openFromAge: 18 },
  'nz-kiwibank': { openFromAge: 16 },
};

/**
 * Each bank's card, cash, payments abroad and opening for a customer abroad, read by hand from its words in
 * `RESEARCH.banks[id].abroad` on 2026-10-16, in the bank's money's hundredths. Where the research quotes a range or a
 * ceiling ("no more than 2.75%", "one to two working days"), the figure is its top. A figure the research found only on
 * a site that isn't the bank's (an aggregator, a blog) is left out, as unpublished. Korea's fees step by the amount in
 * dollars, written here in won at SLATE's 1,350 to the dollar. Mexico's fees are in dollars "plus IVA", taken at
 * Mexico's 16%.
 */
const NEW_HERE = (name: string, where: string) => `${name} opens accounts for people living in ${where}, and none for a customer abroad.`;
const ABROAD: Readonly<Record<string, AbroadTerms>> = {
  // Canada: wires. The banks' own transfer services are left out, as none publishes its fee.
  'ca-rbc': { card: { fixed: 1_00, share: 0.025 }, atm: { fixed: 3_00, share: 0.025 }, out: { fixed: 45_00 }, incoming: { fixed: 17_00, upTo: [{ amount: 49_99, charge: {} }] } },
  'ca-td': { card: { share: 0.035 }, atm: { fixed: 3_00, share: 0.035 }, outRefused: 'TD sends a wire abroad from a branch in Canada; its online transfer service’s fee isn’t published.', incoming: { fixed: 17_50 } },
  'ca-scotiabank': { card: { share: 0.025 }, atm: { fixed: 3_00, share: 0.025 }, out: { share: 0.002, min: 30_00, max: 100_00, plus: { fixed: 7_50 } }, incoming: { fixed: 15_00 } },
  'ca-bmo': { card: { share: 0.025 }, atm: { fixed: 5_00, share: 0.025 }, out: { fixed: 50_00 }, incoming: { fixed: 16_00 } },
  'ca-cibc': { card: { share: 0.025 }, atm: { fixed: 3_00, share: 0.025 }, out: { fixed: 80_00, upTo: [{ amount: 10_000_00, charge: { fixed: 30_00 } }, { amount: 50_000_00, charge: { fixed: 50_00 } }] }, incoming: { fixed: 15_00 } },
  // Mexico.
  'mx-bbva': { card: {}, atm: {}, out: { fixed: 10_00, currency: 'USD' }, days: 1, opening: 'BBVA México asks for a Mexican address and a Mexican immigration form to open an account.' },
  'mx-banorte': { atm: { fixed: 3_48, currency: 'USD' }, out: { fixed: 34_80, currency: 'USD' }, incoming: { fixed: 19_72, currency: 'USD' } },
  'mx-santander': { atm: { fixed: 3_00, currency: 'USD' }, out: {} },
  'mx-banamex': { atm: { fixed: 4_06, currency: 'USD' }, outRefused: 'Banamex sends a personal customer’s payment abroad from a branch in Mexico.', incoming: { fixed: 17_40, currency: 'USD' }, opening: 'Banamex opens an account only for someone “radicada en México”.' },
  // Britain.
  'gb-barclays': { card: { share: 0.0299 }, atm: { share: 0.0299 }, out: {}, margin: 0.0275, incoming: { fixed: 6_00, upTo: [{ amount: 100_00, charge: {} }] }, days: 2, opening: 'Barclays keeps accounts only for customers who live in the UK, and opens none for one who doesn’t.' },
  'gb-lloyds': { card: { share: 0.0299, fixed: 50 }, atm: { share: 0.0299, fixed: 1_50 }, out: { fixed: 9_50 }, incoming: { fixed: 7_00, upTo: [{ amount: 100_00, charge: { fixed: 2_00 } }] }, limitDay: 100_000_00, opening: NEW_HERE('Lloyds Bank', 'the UK') },
  'gb-natwest': { card: { share: 0.0275 }, atm: { share: 0.0275 }, out: {}, margin: 0.0325, incoming: { fixed: 7_00, upTo: [{ amount: 100_00, charge: { fixed: 1_00 } }] }, days: 3, opening: NEW_HERE('NatWest', 'the UK') },
  'gb-hsbc': { card: { share: 0.0275 }, atm: { share: 0.0275, plus: { share: 0.02, min: 1_75, max: 5_00 } }, out: {}, incoming: { fixed: 5_00 }, opening: 'HSBC UK opens its accounts for people living in the UK; for a customer abroad it has HSBC Expat, from £75,000.' },
  'gb-santander': { card: { share: 0.0295 }, atm: { share: 0.0295 }, out: { fixed: 25_00 }, margin: 0.03, marginOver: [{ from: 10_000_01, rate: 0.02 }, { from: 50_000_01, rate: 0.01 }], incoming: {}, days: 4, opening: '“To apply for any Santander UK plc product, you need to be a resident of the UK.”' },
  // Nationwide's sources conflict on £20 and £15; its help page, the newer, says £15. "Longer than 4 working days" is five.
  'gb-nationwide': { card: { share: 0.0299 }, atm: { share: 0.0299 }, out: { fixed: 15_00 }, margin: 0.022, incoming: {}, days: 5, opening: 'Nationwide can’t open a new account for a customer living abroad.' },
  // Ireland. AIB's 1.4% rests on a snippet that may be its business customers'; it's the only figure there is.
  'ie-aib': { card: { share: 0.0175, min: 45, max: 11_00 }, atm: { share: 0.025, plus: { share: 0.01, min: 2_00, max: 6_00 } }, out: { fixed: 15_00 }, margin: 0.014, incoming: { fixed: 6_35, upTo: [{ amount: 127_00, charge: {} }] } },
  'ie-bank-of-ireland': { card: { share: 0.02, max: 11_43 }, atm: { share: 0.035, min: 3_17, max: 11_43 }, out: { fixed: 5_00 }, margin: 0.025, marginOver: [{ from: 10_000_01, rate: 0.02 }], incoming: { fixed: 5_00, upTo: [{ amount: 65_00, charge: {} }] }, days: 3, limitDay: 20_000_00, opening: 'Bank of Ireland says a non-resident account can’t be opened online: it’s opened in a branch.' },
  'ie-ptsb': { card: { share: 0.0175, min: 46, max: 11_43 }, atm: { share: 0.035, min: 3_17, max: 11_43 }, out: { fixed: 31_50 }, opening: NEW_HERE('PTSB', 'the Republic of Ireland') },
  // Iceland.
  'is-landsbankinn': { card: { share: 0.023, fixed: 18_00 }, atm: { share: 0.01, min: 800_00, plus: { share: 0.023 } }, out: { fixed: 900_00 }, incoming: { fixed: 700_00 } },
  'is-arion': { card: { share: 0.025, fixed: 19_00 }, atm: { share: 0.01, min: 790_00, plus: { share: 0.025 } }, out: { fixed: 895_00 }, incoming: { fixed: 650_00 } },
  'is-islandsbanki': { card: { share: 0.025, fixed: 20_00 }, atm: { share: 0.02, plus: { share: 0.025 } }, out: { fixed: 900_00 }, incoming: { fixed: 680_00 }, opening: 'Íslandsbanki asks a customer from outside the EEA for a residence permit in Iceland.' },
  // France. SG's margin is its own published example: 1.1678 made 1.1515 for buying $1,000, 1.4%.
  'fr-bnp-paribas': { card: { share: 0.029, fixed: 90 }, atm: { share: 0.029, fixed: 3_00 }, out: {}, incoming: { fixed: 11_00 } },
  'fr-societe-generale': { card: { share: 0.027, fixed: 1_00, upTo: [{ amount: 10_00, charge: { share: 0.027 } }] }, atm: { fixed: 3_00, share: 0.027 }, out: { fixed: 13_00, upTo: [{ amount: 500_00, charge: { fixed: 9_00 } }] }, margin: 0.014, incoming: { fixed: 22_00, upTo: [{ amount: 150_00, charge: {} }] } },
  'fr-lcl': { card: { fixed: 1_26, plus: { share: 0.0305, min: 80 } }, atm: { fixed: 3_17, share: 0.0305 }, out: { fixed: 26_70, plus: { share: 0.0005, min: 20_00 } }, incoming: { fixed: 20_00 } },
  'fr-credit-agricole': { card: { share: 0.025 }, atm: { fixed: 3_00 }, out: { share: 0.001, min: 15_00 }, incoming: { fixed: 21_84, upTo: [{ amount: 107_59, charge: { share: 0.2 } }] } },
  'fr-la-banque-postale': { card: { share: 0.023, max: 6_00 }, atm: { fixed: 3_30, share: 0.023 }, out: { fixed: 10_00, plus: { share: 0.001, min: 9_90, max: 70_00 } }, incoming: { fixed: 13_50 } },
  // Germany. Deutsche Bank's and Postbank's margins are 0.0050 and 0.0036 dollars a euro, at SLATE's 1.087 dollars a euro.
  'de-deutsche-bank': { card: { share: 0.01, min: 1_50, plus: { share: 0.005 } }, atm: { share: 0.01, min: 5_99, plus: { share: 0.005 } }, out: { share: 0.0015, min: 10_00, plus: { fixed: 1_55 } }, margin: 0.0046, incoming: { share: 0.001, max: 95_00, upTo: [{ amount: 2_500_00, charge: { fixed: 5_50 } }, { amount: 12_500_00, charge: { fixed: 10_00 } }] } },
  'de-commerzbank': { card: { share: 0.015 }, atm: { share: 0.0195, min: 5_98 }, out: { fixed: 10_00, plus: { share: 0.0015, min: 12_50, upTo: [{ amount: 249_99, charge: { fixed: 10_00 } }] } }, incoming: { fixed: 2_50, plus: { share: 0.0015, min: 12_50, max: 100_00, upTo: [{ amount: 12_99, charge: {} }, { amount: 249_99, charge: { fixed: 10_00 } }] } }, opening: 'Commerzbank says only that an EU citizen living in the EU has a right to an account.' },
  // Postbank's price list has no item for a payment received from abroad, so none is charged.
  'de-postbank': { card: { share: 0.0185, plus: { share: 0.005 } }, atm: { share: 0.01, min: 5_99, plus: { share: 0.005 } }, out: { share: 0.0015, min: 8_00 }, margin: 0.0033, incoming: {}, opening: 'Postbank doesn’t open accounts for people living abroad.' },
  'de-ing': { card: { share: 0.022 }, atm: { share: 0.022 }, out: { share: 0.0015, min: 20_00, upTo: [{ amount: 500_00, charge: { fixed: 10_00 } }] }, margin: 0.01, incoming: {}, opening: 'ING asks for a home and work in Germany (“Wohnsitz und Arbeitsplatz in Deutschland”) to open an account.' },
  'de-berliner-sparkasse': { card: { share: 0.019 }, atm: { share: 0.02, min: 7_50 }, out: { share: 0.001, max: 500_00, plus: { share: 0.00025, max: 100_00 }, upTo: [{ amount: 10_000_00, charge: { fixed: 12_50 } }] }, incoming: { share: 0.001, max: 150_00, plus: { share: 0.00025, max: 100_00 }, upTo: [{ amount: 10_000_00, charge: { fixed: 12_50 } }] }, opening: '“Für die Online-Kontoeröffnung benötigen Sie einen Wohnsitz in Deutschland”: Berliner Sparkasse opens online only for someone living in Germany.' },
  // Spain. Santander's and Bankinter's debit card fees are found only on aggregators or in conflict; BBVA's €300 a month free.
  'es-santander': { out: {}, opening: 'Banco Santander’s non-resident account opens online for residents of the countries it lists, and the United States isn’t one.' },
  'es-bbva': { card: { share: 0.03 }, cardFreeMonthly: 300_00, atm: { share: 0.045, min: 3_00 }, out: { share: 0.006, min: 6_00, max: 100_00, upTo: [{ amount: 1_000_00, charge: { fixed: 6_00 } }] } },
  'es-caixabank': { card: { share: 0.0395 }, atm: { share: 0.045, min: 4_00, plus: { share: 0.0395 } }, out: { share: 0.006, min: 15_00 }, margin: 0.025, opening: 'CaixaBank’s HolaBank opens remotely for residents of the countries it lists, and the United States isn’t one.' },
  'es-sabadell': { card: { share: 0.035 }, atm: { share: 0.045, min: 4_00 }, out: { share: 0.0075, min: 22_00 }, margin: 0.03, incoming: { share: 0.004, min: 18_00 }, opening: 'Banco Sabadell opens its Key Account in person at a branch.' },
  'es-bankinter': { atm: { share: 0.04, min: 3_00 }, out: { share: 0.006, min: 20_00, plus: { share: 0.005, min: 20_00 } } },
  // Japan. MUFG's online fee to another bank; SMBC's commission of ¥1 a dollar is a margin of 1/150 at SLATE's rate.
  'jp-mufg': { card: { share: 0.0305 }, atm: { fixed: 110_00, share: 0.0305 }, out: { fixed: 3_000_00 }, incoming: { fixed: 1_500_00 }, opening: 'MUFG’s Global Direct can’t be applied for after leaving Japan, and it publishes nothing that opens an account for a customer already living abroad.' },
  'jp-smbc': {
    cardRefused: 'SMBC’s Global Service has its customers cancel the debit card before they leave Japan.',
    atmRefused: 'SMBC’s Global Service says its cash card works only at machines in Japan.',
    out: { fixed: 3_500_00 }, margin: 1 / 150, incoming: { fixed: 1_500_00 }, limitDay: 3_000_000_00, limitMonth: 5_000_000_00,
    opening: 'SMBC’s Global Service can’t be applied for after leaving Japan, and it publishes nothing that opens an account for a customer already living abroad.',
  },
  'jp-mizuho': {
    cardRefused: 'Mizuho says a non-resident can’t use a cash card.',
    atmRefused: 'Mizuho says a non-resident can’t use a cash card.',
    outRefused: 'Mizuho’s app and Direct banking aren’t open to a non-resident, and its counters are in Japan.',
    incoming: { fixed: 2_500_00 },
  },
  'jp-resona': { card: { share: 0.044 }, atm: { fixed: 220_00, share: 0.044 }, outRefused: 'Resona sends money abroad only after a visit to a branch in Japan.' },
  // Korea, in won; a dollar step at 1,350 won.
  'kr-kb-kookmin': { card: { share: 0.0125 }, atm: { fixed: 3_00, currency: 'USD', plus: { share: 0.01 } }, out: { fixed: 33_000_00, upTo: [{ amount: 675_000_00, charge: { fixed: 13_000_00 } }, { amount: 2_700_000_00, charge: { fixed: 18_000_00 } }, { amount: 6_750_000_00, charge: { fixed: 23_000_00 } }, { amount: 13_500_000_00, charge: { fixed: 28_000_00 } }] }, incoming: { fixed: 10_000_00, upTo: [{ amount: 134_999_00, charge: {} }] } },
  'kr-shinhan': { out: { fixed: 20_500_00, upTo: [{ amount: 675_000_00, charge: { fixed: 10_500_00 } }, { amount: 2_700_000_00, charge: { fixed: 13_000_00 } }, { amount: 6_750_000_00, charge: { fixed: 15_500_00 } }, { amount: 27_000_000_00, charge: { fixed: 18_000_00 } }] }, incoming: { fixed: 10_000_00, upTo: [{ amount: 134_999_00, charge: {} }] } },
  'kr-hana': { card: { share: 0.01, plus: { fixed: 50, currency: 'USD' } }, atm: { fixed: 3_00, currency: 'USD', plus: { share: 0.01 } }, out: { fixed: 10_000_00, upTo: [{ amount: 6_750_000_00, charge: { fixed: 8_000_00 } }] }, incoming: { fixed: 10_000_00, upTo: [{ amount: 134_999_00, charge: {} }] } },
  'kr-nh': { card: { share: 0.01, plus: { fixed: 50, currency: 'USD' } }, atm: { fixed: 3_00, currency: 'USD', plus: { share: 0.01 } }, out: { fixed: 30_000_00, upTo: [{ amount: 675_000_00, charge: { fixed: 10_000_00 } }, { amount: 2_700_000_00, charge: { fixed: 15_000_00 } }, { amount: 6_750_000_00, charge: { fixed: 20_000_00 } }, { amount: 27_000_000_00, charge: { fixed: 25_000_00 } }] }, incoming: { fixed: 10_000_00, upTo: [{ amount: 135_000_00, charge: {} }] } },
  'kr-kakaobank': { card: { share: 0.0125 }, atm: { fixed: 3_00, currency: 'USD', plus: { share: 0.01 } }, out: { fixed: 4_900_00 }, incoming: {}, days: 3 },
  // Australia: free online in a foreign currency.
  'au-commbank': { card: { share: 0.035 }, atm: { fixed: 5_00, share: 0.035 }, out: {}, incoming: { fixed: 11_00 }, days: 1, opening: NEW_HERE('CommBank', 'Australia or moving there') },
  'au-westpac': { card: { share: 0.03 }, atm: { fixed: 5_00, share: 0.03 }, out: {}, incoming: { fixed: 12_00, upTo: [{ amount: 100_00, charge: {} }] }, days: 3, opening: NEW_HERE('Westpac', 'Australia or moving there') },
  'au-nab': { card: { share: 0.035 }, atm: { fixed: 5_00, share: 0.035 }, out: {}, incoming: { fixed: 15_00 }, opening: NEW_HERE('NAB', 'Australia or moving there') },
  'au-anz': { card: { share: 0.03 }, atm: { fixed: 5_00, share: 0.03 }, out: {}, incoming: { fixed: 15_00, upTo: [{ amount: 300_00, charge: {} }] }, opening: NEW_HERE('ANZ', 'Australia or moving there') },
  // New Zealand. ASB's fees at a machine and for sending are found only on an aggregator.
  'nz-anz': { card: { share: 0.013 }, atm: { share: 0.013 }, out: {}, incoming: { fixed: 15_00, upTo: [{ amount: 299_99, charge: {} }] }, opening: NEW_HERE('ANZ', 'New Zealand or arriving within 90 days') },
  'nz-asb': { card: { share: 0.021 } },
  'nz-bnz': { card: { share: 0.0225 }, atm: { share: 0.0225 }, out: {}, incoming: { fixed: 10_00 } },
  'nz-westpac': { card: { share: 0.0183 }, atm: { fixed: 3_00, share: 0.0183 }, out: {}, incoming: { fixed: 15_00 } },
  'nz-kiwibank': { card: { share: 0.0185 }, out: { fixed: 10_00 }, incoming: { fixed: 12_00 }, opening: 'Kiwibank asks that you “live at a New Zealand residential address” to open one.' },
};

/** A bank kept on conditions, where no sentence of its own says what they are: the research's general ones. */
const conditionOf = (name: string): string => `${name} keeps it once you’ve told it your American address and given it a tax self-certification.`;

function termsFrom(bankId: string, r: Researched): HomeTerms {
  const read = READ[bankId] ?? {};
  const name = bankById(bankId)?.name ?? bankId;
  const nonResident = r.kept === true ? 'keeps' : r.kept === false ? 'closes' : 'conditional';
  const confidence = nonResident !== 'conditional' ? 'H' : read.nonResidentFee || bankId === 'de-deutsche-bank' ? 'M' : 'L';
  const official = r.sources.find((s) => s.official) ?? r.sources[0];
  return {
    bankId,
    nonResident,
    ...(nonResident === 'closes' && r.closesWithNoticeDays !== null ? { closeNoticeDays: r.closesWithNoticeDays } : {}),
    usPersons: 'keeps',
    ...(nonResident === 'conditional' ? { condition: conditionOf(name) } : {}),
    openFromAge: read.openFromAge ?? ASSUMED_OPENING_AGE,
    ageAssumed: read.openFromAge === undefined,
    confidence,
    ...read,
    abroad: ABROAD[bankId] ?? {},
    source: official ? `${official.title} (${official.url})` : 'docs/research/banking/home-accounts.json',
    asOf: RESEARCH.read,
  };
}

const TERMS = new Map<string, HomeTerms>();
for (const [bankId, r] of Object.entries(RESEARCH.banks)) {
  // An American bank is the account here, not one kept from abroad (the rule's second step).
  if (!bankId.startsWith('us-')) TERMS.set(bankId, termsFrom(bankId, r));
}

/** A bank's terms for an account kept from abroad, or nothing where SLATE has no research on it. */
export function homeTerms(bankId: string): HomeTerms | undefined {
  return TERMS.get(bankId);
}

/** Every bank with terms. */
export function allHomeTerms(): readonly HomeTerms[] {
  return [...TERMS.values()];
}

/** Registers terms, as a test needs them: a bank that refuses a US person, or one the research didn't read. */
export function addHomeTerms(terms: HomeTerms): void {
  TERMS.set(terms.bankId, terms);
}

/** Takes terms a test registered away again, or puts the researched ones back. */
export function resetHomeTerms(bankId: string): void {
  const r = RESEARCH.banks[bankId];
  if (r && !bankId.startsWith('us-')) TERMS.set(bankId, termsFrom(bankId, r));
  else TERMS.delete(bankId);
}

/** The notice a closing bank gives an account opened on a day (YYYY-MM-DD). */
export function noticeFor(terms: HomeTerms, opened: string): number | undefined {
  if (terms.longerNotice && opened >= terms.longerNotice.openedFrom) return terms.longerNotice.days;
  return terms.closeNoticeDays;
}

/**
 * The five American banks' wires abroad, read from the same research (`RESEARCH.banks['us-…'].abroad`), in dollars'
 * cents: what each charges to send one in the other country's money from its app (Chase $5, nothing from $5,000; Capital
 * One sends one only from a branch, $40), and to receive one. None publishes its margin or its days.
 */
export const US_WIRES: Readonly<Record<string, AbroadTerms>> = {
  'us-chase': { out: { fixed: 0, upTo: [{ amount: 4_999_99, charge: { fixed: 5_00 } }] }, incoming: { fixed: 15_00 } },
  'us-bank-of-america': { out: {}, incoming: { fixed: 15_00 } },
  'us-wells-fargo': { out: {}, incoming: {} },
  'us-citi': { out: {}, incoming: { fixed: 15_00 } },
  // "May take up to 10 business days to be deposited to the recipient's account."
  'us-capital-one': { out: { fixed: 40_00 }, incoming: {}, days: 10 },
};

/** A bank's terms for a payment abroad: the home terms' `abroad`, or an American bank's wires. */
export function abroadTermsOf(bankId: string | undefined): AbroadTerms | undefined {
  if (!bankId) return undefined;
  return US_WIRES[bankId] ?? TERMS.get(bankId)?.abroad;
}

/**
 * Each country's tax at source on the interest of a customer who lives abroad, read from `RESEARCH.countries`. SLATE takes
 * it that the student gave the bank what its law asks to be treated as non-resident, the self-certification creation
 * says they gave (Germany's proof of the move, Ireland's declaration, Spain's non-resident account); and that no treaty
 * rate is claimed where the research says it must be claimed by form (Iceland's RSK 5.42, Japan's treaty notice, Korea's
 * application). New Zealand's banks take the treaty rate, 10%, by themselves.
 */
export const NON_RESIDENT_TAX: Readonly<Record<string, { rate: number; note: string }>> = {
  CA: { rate: 0, note: 'Canada withholds nothing on a bank’s interest to a customer at arm’s length.' },
  MX: { rate: 0.049, note: 'Mexico withholds 4.9% from a bank’s interest to a customer abroad (LISR art. 166).' },
  GB: { rate: 0, note: 'Britain’s banks have taken no tax from interest since April 2016.' },
  IE: { rate: 0, note: 'Ireland takes no DIRT from a customer abroad who has made the non-resident declaration.' },
  IS: { rate: 0.12, note: 'Iceland withholds 12% from a customer abroad; the treaty’s exemption is claimed by form, and the game assumes it wasn’t.' },
  FR: { rate: 0, note: 'France takes no tax on a customer abroad’s interest (CGI art. 125 A III).' },
  DE: { rate: 0, note: 'Germany takes no tax on a customer abroad’s interest once the bank has proof of the move.' },
  ES: { rate: 0, note: 'Spain takes no tax on a non-resident account’s interest (LIRNR art. 14.1.d).' },
  JP: { rate: 0.15315, note: 'Japan withholds 15.315% from a customer abroad; the treaty’s exemption needs a notice through the bank, and the game assumes none was given.' },
  KR: { rate: 0.22, note: 'Korea withholds 22% from a customer abroad; the treaty’s 12% needs an application, and the game assumes none was made.' },
  AU: { rate: 0.1, note: 'Australia withholds 10%, final, from a customer abroad.' },
  NZ: { rate: 0.1, note: 'New Zealand’s banks withhold 10% from a customer in a treaty country, America among them.' },
};

/**
 * America's reports on a US person's accounts abroad, read from `RESEARCH.us` on 2026-10-16 (from that day), in dollars'
 * cents. FinCEN Form 114, the FBAR: the accounts' aggregate value over $10,000 at any time in the calendar year, due
 * 15 April with an automatic extension to 15 October, filed with FinCEN and not with the return (31 CFR 1010.350). Form
 * 8938: an unmarried taxpayer living in America, over $50,000 on the year's last day or $75,000 at any time, and only
 * with an income tax return ("If you do not have to file an income tax return for the tax year, you do not need to
 * file Form 8938"). Neither is asked of an F-1 student, a nonresident alien and not a US person. The aggregate is the
 * sum of each account's most in the year, as FinCEN's instructions total it; SLATE reads 8938's the same way.
 */
export const US_REPORTS = {
  fbar: { over: 10_000_00, due: { month: 4, day: 15 }, extended: { month: 10, day: 15 } },
  form8938: { yearEnd: 50_000_00, anyTime: 75_000_00 },
} as const;

/** A charge on an amount, both in the bank's money's hundredths. */
export function chargeOf(charge: Charge, amount: Money, bankCurrency: string, exchange: (cents: Money, from: string, to: string) => Money | undefined): Money {
  const step = charge.upTo?.find((one) => amount <= one.amount);
  if (step) return chargeOf(step.charge, amount, bankCurrency, exchange);
  const fixed = charge.fixed ? (charge.currency && charge.currency !== bankCurrency ? exchange(charge.fixed, charge.currency, bankCurrency) ?? charge.fixed : charge.fixed) : 0;
  let share = charge.share ? Math.round(amount * charge.share) : 0;
  if (charge.share && charge.min !== undefined) share = Math.max(share, charge.min);
  if (charge.share && charge.max !== undefined) share = Math.min(share, charge.max);
  return fixed + share + (charge.plus ? chargeOf(charge.plus, amount, bankCurrency, exchange) : 0);
}

/** A bank's margin on an amount in its money, and whether it's SLATE's assumption. */
export function marginOf(terms: AbroadTerms, amount: Money): { rate: number; assumed: boolean } {
  if (terms.margin === undefined) return { rate: ASSUMED_MARGIN, assumed: true };
  let rate = terms.margin;
  for (const step of terms.marginOver ?? []) if (amount >= step.from) rate = step.rate;
  return { rate, assumed: false };
}
