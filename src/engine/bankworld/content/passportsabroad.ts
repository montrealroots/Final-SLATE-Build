/**
 * SLATE — a passport applied for from outside its country (from 2026-10-16): what each office asks of a citizen living
 * abroad, where that differs from what it asks at home (`content/passports.ts`). Every life in SLATE lives in New Haven,
 * so a citizen of any country but the United States applies to their own office from abroad, and until 2026-10-16 was
 * charged the office's fee at home and offered its faster service at home: a British student's Renew It was £102 and
 * Renew It Faster the UK's Fast Track, £192 in seven days, which isn't sold outside the UK, while the screen's own fine
 * print, from the research, said £116.50 from abroad (tests/remaining-papers.test.ts).
 *
 * Read from `content/passports.ts`'s research of 2026-09-29 (each office's own pages, its `abroad` line), and for the
 * UK again on 2026-10-16: gov.uk's "New fees for passport applications" (published 18 March 2026, in force from 8 April
 * 2026: £116.50 online from overseas, £130 on paper) and "Get a passport urgently" ("You cannot use this service if:
 * you're outside the UK"). Where an office's fee or time from abroad wasn't found, its fee at home stands and the entry
 * says so (`assumed`); where its faster service isn't sold abroad, or that wasn't found, none is offered.
 *
 * Iceland's, Brazil's and Latvia's read again on 2026-10-17, on their own pages (`docs/research/world/
 * research-passports-abroad.json`, brief 11): until then Iceland's fee at an embassy, Brazil's at a consulate and
 * Latvia's at its embassy in the US weren't found, and SLATE took Iceland's and Brazil's fees at home (Brazil's R$257.25,
 * the Polícia Federal's) and the Latvian embassy in Ireland's fees and times, its €165 urgent service with them, for the
 * embassy in the US; Iceland's express wasn't offered from abroad. Japan's consulate and New Zealand's office refused
 * every request that day (403s, a Cloudflare challenge), and their entries still said what was SLATE's.
 *
 * Japan's and New Zealand's tried again on 2026-10-17 (brief 12's KS-passport-fees, the same record's `brief12`). Japan's
 * settled in its own law, read on e-Gov: US$62, set for the whole country by MOFA's ordinance from 1 July 2026, where
 * until then SLATE charged the window fee in Japan, 9,300 yen, at its own rate, the same $62.00 said to be SLATE's. New
 * Zealand's GST and urgent fee from abroad stayed behind challenges (passports.govt.nz's Cloudflare, legislation.govt.nz's
 * AWS WAF), and are SLATE's assumptions, each one value in `NZ_FROM_ABROAD`, labelled so on the screen.
 *
 * A value here is read when an application is made, and what it charged is posted then: changed later, a fee already
 * paid stands and a passport on its way comes as it was applied for, and the new value applies to what's applied for
 * after. A passport's term is set when it's issued, from the office's years at home, which nothing here touches.
 *
 * The United States isn't here: a US citizen in New Haven applies at home, and renews by mail (`US_RENEWAL`).
 */
import type { PassportRule } from './passports';

export interface AbroadTerms {
  /** The adult fee from abroad, and under an age where the office charges less (Germany's under 24). */
  fee: number;
  youngFee?: number;
  currency: string;
  /** Days from applying to having it, at most; SLATE's where the office publishes none from abroad. */
  days: number;
  daysEstimated: boolean;
  /** A faster service sold to an applicant abroad, or none. */
  expedite: PassportRule['expedite'];
  /** What it is, in the office's terms, for the screen. */
  basis: string;
  /** What wasn't found and is SLATE's, said. */
  assumed: string[];
}

export const PASSPORTS_ABROAD: Readonly<Record<string, AbroadTerms>> = {
  GB: {
    fee: 116.5, currency: 'GBP', days: 21, daysEstimated: true, expedite: null,
    basis: 'An adult passport applied for online from outside the UK: £116.50 from April 8, 2026 (£130 on paper). Fast Track and the other urgent services are for applicants in the UK.',
    assumed: ['HM Passport Office publishes no turnaround from overseas, so the game uses its three weeks at home.'],
  },
  CA: {
    fee: 163.5, currency: 'CAD', days: 28, daysEstimated: false, expedite: null,
    basis: 'From the United States, the fee in Canada (only outside Canada and the US is it higher), and a standard of 20 business days for an application mailed from the US, mailing aside.',
    assumed: ['Canada’s urgent and express services are given at its passport offices in Canada. Whether they’re offered from abroad wasn’t found, so the game offers none from New Haven.', 'The 20 business days are taken as 28 days.'],
  },
  IE: {
    fee: 90, currency: 'EUR', days: 28, daysEstimated: false, expedite: null,
    basis: 'Passport Online from anywhere at the adult €75, with €15 postage for an applicant living outside Ireland, in the same turnaround.',
    assumed: ['Same-day renewal is at a passport office in Ireland, and the only urgent renewal found abroad is the London embassy’s, so none is offered from the US.', 'Postage from abroad takes longer, and that isn’t counted.'],
  },
  // The consular fee schedule (stjornarradid.is, Gjaldskrá fyrir verk borgaraþjónustu, read 2026-10-17): an adult of 18
  // to 66 pays the fee in Iceland, 19,000 ISK (USD 148 at December 2025's monthly rate), and express 39,200 ISK in all
  // (USD 306), under art. 14 of Act no. 88/1991; in the US only the embassy in Washington takes the application. Until
  // 2026-10-17 the fee was the same, said to be assumed, and no express was offered.
  IS: {
    fee: 19000, currency: 'ISK', days: 6, daysEstimated: true, expedite: { extra: 20200, days: 2, note: 'Express, 39,200 ISK in all' },
    basis: 'At the Embassy of Iceland in Washington, the only post in the US that takes it, at the fee in Iceland: 19,000 ISK, or 39,200 ISK for express, in dollars at the month’s rate; collected there or shipped.',
    assumed: ['Registers Iceland’s four business days don’t include delivery, and the time for delivery isn’t published, so the game uses the days in Iceland: four, or two for express.'],
  },
  DE: {
    fee: 106, youngFee: 73.5, currency: 'EUR', days: 42, daysEstimated: false, expedite: null,
    basis: 'In person at the competent German mission, 36 EUR over the fee at home (PassV § 27(3)): 106 EUR from 24, 73.50 EUR under it; four to six weeks, the passport traveling from Berlin to the mission.',
    assumed: ['Express shortens only production abroad, not the journey to the mission, so the game offers none.'],
  },
  FR: {
    fee: 96, currency: 'EUR', days: 21, daysEstimated: true, expedite: null,
    basis: 'At the embassy or a consulate, the adult passport 96 EUR.',
    assumed: ['No processing time is published abroad, so the game uses three weeks, as at home.'],
  },
  ES: {
    fee: 30, currency: 'EUR', days: 21, daysEstimated: true, expedite: null,
    basis: 'At the consulate, for a Spaniard registered there (Registro de Matrícula Consular), the same 30 EUR; not issued on the spot, about three weeks on average.',
    assumed: ['You’re taken to be registered with the consulate in New York.'],
  },
  // MOFA Ordinance 4 of 2006 on passport fees abroad (国外における旅券手数料の額を定める省令), as amended by MOFA Ordinance
  // 19 of 2026, promulgated 24 June 2026, in force for applications from 1 July 2026, its table's row for the United
  // States: US$62 for a ten-year passport on paper, US$60 online. The Passport Act's Enforcement Order, art. 5, sets the
  // fee abroad for each country where the consular officer is posted, in its currency, so the consulate for Connecticut
  // charges what every Japanese post in the US does. Both read on laws.e-gov.go.jp on 2026-10-17, every emb-japan.go.jp
  // and mofa.go.jp page refusing SLATE (403). Until 2026-10-17 SLATE charged the window fee in Japan, 9,300 yen, at its
  // own rate, which came to the same $62.00, and said the figure was its own.
  JP: {
    fee: 62, currency: 'USD', days: 30, daysEstimated: true, expedite: null,
    basis: 'At a Japanese embassy or consulate in the US, on paper: US$62 from July 1, 2026, the fee MOFA’s ordinance on passport fees abroad sets for the United States (US$60 applied for online); about a month, the passport made in Japan.',
    assumed: [],
  },
  KR: {
    fee: 52, currency: 'USD', days: 30, daysEstimated: true, expedite: null,
    basis: 'At a Korean embassy or consulate, USD 52 for a ten-year passport of 58 pages; made in Korea and shipped.',
    assumed: ['The mission’s time wasn’t collected. It’s longer than at home, so the game uses 30 days.'],
  },
  MX: {
    fee: 209, currency: 'USD', days: 0, daysEstimated: true, expedite: null,
    basis: 'By appointment at a consulate, paid in US dollars: USD 209 for ten years (the Consulate General in Atlanta’s figures for 2026).',
    assumed: ['Whether a consulate hands it over at the appointment wasn’t found. In the game it does, as Mexico’s offices do at home.'],
  },
  AU: {
    fee: 611, currency: 'AUD', days: 42, daysEstimated: false, expedite: null,
    basis: 'Through an Australian embassy or consulate, the fee and an overseas surcharge of $189: 611 AUD; at least six weeks, and no Priority or Fast Track overseas.',
    assumed: [],
  },
  // Portaria MRE nº 664 of 29 April 2026 (DOU 4 May 2026), in force 1 June 2026: a passaporte comum is 60 reais-ouro
  // (item 110.5), and a real-ouro is one US dollar (Regulamento Consular Brasileiro, Portaria nº 428/2022, 4.1.45 IV);
  // both read in the Diário Oficial on 2026-10-17, the Hartford consulate's page answering with a CAPTCHA. Until
  // 2026-10-17 SLATE charged the Polícia Federal's R$257.25 at home.
  BR: {
    fee: 60, currency: 'USD', days: 8, daysEstimated: true, expedite: null,
    basis: 'Issued by Brazilian embassies and consulates through e-consular, at the consular fee from June 1, 2026: 60 reais-ouro, a real-ouro being a dollar, so US$60.',
    assumed: ['The consulate’s time wasn’t found, so the game uses the days at home.', 'The Polícia Federal’s urgent service isn’t given at consulates, so none is offered.'],
  },
  // Read when it's asked for, so a change to `NZ_FROM_ABROAD` reaches the screen and the command alike (from 2026-10-17:
  // until then its figures were written here, NZ$247 and NZ$247 more, GST in both, the same as `nzTerms` gives by
  // default).
  get NZ(): AbroadTerms { return nzTerms(); },
  // The Embassy of Latvia to the USA (usa.mfa.gov.lv, "Applying for passport and ID card", updated 27.05.2026, read
  // 2026-10-17): a passport alone €140, €115 under 20 or over 65, from 1 May 2026, in about eight weeks, no urgent
  // service. Until 2026-10-17 SLATE took the embassy in Ireland's for it: €140 in about five weeks, and €165 urgent.
  LV: {
    fee: 140, youngFee: 115, currency: 'EUR', days: 56, daysEstimated: false, expedite: null,
    basis: 'In person at the Embassy of Latvia in Washington, at its own fees from May 1, 2026: €140 (€115 under 20), in about eight weeks on average; no urgent service.',
    assumed: ['Shipment by FedEx, €35, isn’t charged: you’re taken to collect the passport at the embassy, where you apply in person.'],
  },
};

/**
 * New Zealand's office from abroad (brief 12's KS-passport-fees; `docs/research/world/research-passports-abroad.json`,
 * its `brief12`, read 2026-10-17). What's DIA's: the adult fee, NZ$247 with GST from 2 May 2025 (DIA's release of 1 May
 * 2025), NZ$214.78 before it, the regulations setting fees before GST (DIA's 2022 Cabinet papers); DIA's 2022 schedule
 * charging no GST on "online applications from outside New Zealand"; and its priority fee for an application "New
 * Zealand or on line" equal to the standard fee. What's SLATE's, each one value here, said so on the screen:
 *
 * - `gstCharged`: whether a New Zealander applying online from New Haven pays GST. DIA's costs page (behind a Cloudflare
 *   challenge; seen in search extracts) spares "a non-resident for New Zealand tax purposes", and IRD makes that a
 *   person with no permanent place of abode in New Zealand who's away more than 325 days in a year, which turns on a home
 *   SLATE knows nothing of. SLATE charges it, the price DIA publishes, as it did from 2026-10-16. Off, NZ$214.78.
 * - `urgentBeforeGst`: the urgent fee for an online application from overseas, taken as the standard fee, as DIA's 2022
 *   schedule set it, Cabinet's 2025 increase of about 14.9% applying to every passport fee alike; the 2025 regulations
 *   (SL 2025/75) were behind an AWS WAF challenge. GST on it follows `gstCharged`.
 *
 * Changed, it's read on the next application: a fee already charged stands (`content/passportsabroad.ts`'s header).
 */
export const NZ_FROM_ABROAD: { feeBeforeGst: number; urgentBeforeGst: number; gstRate: number; gstCharged: boolean } = {
  feeBeforeGst: 214.78,
  urgentBeforeGst: 214.78,
  gstRate: 0.15,
  gstCharged: true,
};

/** A New Zealand fee before GST, with GST where SLATE charges it, to the cent. */
const nzFee = (beforeGst: number): number => Math.round(beforeGst * (NZ_FROM_ABROAD.gstCharged ? 1 + NZ_FROM_ABROAD.gstRate : 1) * 100) / 100;

/** New Zealand's terms from abroad, as `NZ_FROM_ABROAD` stands now. */
function nzTerms(): AbroadTerms {
  const gst = NZ_FROM_ABROAD.gstCharged;
  return {
    fee: nzFee(NZ_FROM_ABROAD.feeBeforeGst), currency: 'NZD', days: 28, daysEstimated: false,
    expedite: { extra: nzFee(NZ_FROM_ABROAD.urgentBeforeGst), days: 5, note: 'Urgent service, its fee from overseas assumed' },
    basis: `Online to DIA from overseas: NZ$${NZ_FROM_ABROAD.feeBeforeGst.toFixed(2)} before GST, NZ$${(NZ_FROM_ABROAD.feeBeforeGst * (1 + NZ_FROM_ABROAD.gstRate)).toFixed(2)} with it, from May 2, 2025.`,
    assumed: [
      gst
        ? 'GST is charged. DIA charges none to a non-resident for New Zealand tax applying online, and whether you’re one turns on a home in New Zealand, which the game doesn’t keep.'
        : 'No GST is charged, as you’re taken to be a non-resident for New Zealand tax.',
      'The urgent fee from overseas is the standard fee, as DIA’s 2022 schedule set it for an application online.',
      'Courier delivery, NZD 7 to 78, isn’t charged.',
    ],
  };
}

/**
 * A US passport renewed by mail on Form DS-82 (from 2026-10-16): $130 to the Department of State, with no acceptance
 * fee, where the most recent passport was issued within the last 15 years, at 16 or older, valid for 10 years, and was
 * never reported lost or stolen (travel.state.gov, "Renew Your Passport by Mail", and State's fee chart "Updated
 * October 2026", each read through search on 2026-10-16; the chart's $130 for a renewal beside a first passport's $130
 * and $35 acceptance fee). Otherwise Form DS-11 in person, at the first passport's $165 (`content/passports.ts`). Until
 * 2026-10-16 every US application paid $165. Undamaged and in the same name are taken as met: SLATE keeps neither.
 */
export const US_RENEWAL = { fee: 130, currency: 'USD', withinYears: 15, issuedFromAge: 16, validityYears: 10, form: 'DS-82' } as const;
