/**
 * SLATE — the banks of the thirteen countries SLATE pays and taxes a life in.
 *
 * From research on 2026-09-25, each figure from the bank's own price list,
 * product page or rate table where it could be read, and from the official
 * body otherwise: the tax authority for what a bank takes off interest.
 * Each country's deposit guarantee, its central bank's rate and a line on
 * how money moves there were researched too and read by nothing, and went
 * on 2026-09-27; they are in this file's history. Where a
 * figure couldn't be found it is left out rather than guessed: a bank with
 * no published savings rate pays none here, and the screen says there's no
 * rate on record.
 *
 * Money is in each currency's hundredths. A fee a bank charges by the
 * quarter or the year is its monthly share, and the source line says so.
 *
 * What wasn't modeled, and is said in the source line where it touches a
 * figure: fees per transaction or per passbook, a savings account's ceiling
 * (France's Livret A holds up to €22,950), the second year of an
 * introductory rate, and personal loans and fixed-term deposits, which no
 * screen offers yet.
 */

import type { CardYear, CountryBanking, Product } from './banks';

/**
 * SLATE SIMULATION ASSUMPTION, UNVERIFIED (brief 10, 2026-10-16): when in the year Arion charges its debit card's 950 kr.
 * This is the one setting a later source replaces: `paid: 'behind'` is implemented and tested beside it, and `simulated`
 * goes once a source settles the timing (docs/verification/remaining-10/arion-result.json, the research record).
 *
 * Confirmed, and not part of this assumption (read 2026-10-16): the amount, 950 kr a year from 24 and 0 kr at 23 and
 * under (Gjaldskrá greiðslureikninga, Veltureikningur, 07.05.2026; Verðskrá einstaklinga 13.1 and 13.1.1, from
 * 07.05.2026); a fee paid once a year (the official glossary of payment-account terms, B-deild no. 485/2023); paid by the
 * account holder from the account (Almennir viðskiptaskilmálar 18.7.1.15, ch. 5), under a framework contract in the sense
 * of Act 114/2021 (the same, 1.1); and what a close owes whatever the timing: Act 114/2021 art. 57(4), "Ef gjöld vegna
 * greiðsluþjónustu samkvæmt rammasamningi eru greidd fyrir fram skulu þau endurgreidd notanda hlutfallslega, með tilliti
 * til gildistíma uppsagnar", and the share of a regular payment collected after a termination likewise (Stjórnartíðindi
 * A, 15 July 2021, in force 1 November 2021, art. 115; it carries Directive (EU) 2015/2366 as EEA Joint Committee
 * Decision 165/2019 incorporated it, art. 113). That a debit card's yearly fee is such a fee is SLATE's reading: the Act
 * names no card fee, and Arion's terms put its cards in the framework contract.
 *
 * Not confirmed, and so assumed here: whether the 950 kr pays for the card year ahead or the year past, the day it's
 * charged, and that the share is counted in days. None of Arion's documents, the glossary or the Act says. The default,
 * ahead, from the account's first night in the life and on the same date each year after, in Reykjavík's calendar:
 * - it changes least of what every played life already did, the year charged on the first night of a kept account, and
 *   the opening float counts the same years (`feesToGraduation`);
 * - it is the form Berliner Sparkasse's price list states for its card, so one model serves both;
 * - under art. 57(4) the holder pays for the same days held either way: the assumption moves when the krónur leave and
 *   whether a close gives back or charges, not what a year costs.
 * The year counted to the same date a year on, not 365 days, as "once a year" reads, so 29 February neither moves the
 * renewal nor goes uncounted. A close in the hours between Reykjavík's midnight and New Haven's, when SLATE's night opens
 * the next year, finds the last year used up and the next not begun: nothing back, nothing charged.
 */
export const ARION_CARD_YEAR: CardYear = {
  paid: 'ahead',
  length: 'anniversary',
  zone: 'Atlantic/Reykjavik',
  place: 'Reykjavík',
  simulated: 'Arion’s price list and terms don’t say when in the year it’s charged',
  law: 'Iceland’s Act on Payment Services, art. 57',
};

const AS_OF = '2026-09-25';
const p = (name: string, source: string, extra: Partial<Product> = {}): Product => ({ name, source, asOf: AS_OF, ...extra });
const NOT_FOUND = 'no published rate found';

export const THIRTEEN: readonly CountryBanking[] = [
  // --- United States ----------------------------------------------------------
  {
    iso: 'US',
    interestTax: { rate: 0, note: 'The bank withholds no tax; interest is reported on a 1099-INT and taxed on the return.', source: 'irs.gov backup withholding' },
    banks: [
      {
        id: 'us-chase', name: 'Chase', iso: 'US', currency: 'USD', format: 'us', code: '021000021',
        current: p('Chase Total Checking', 'chase.com Total Checking: $15 a month, waived with $500 of electronic deposits, a $1,500 daily balance, or a $5,000 average across it and linked Chase accounts', { deposits: 'electronic', monthlyFee: 15_00, waiver: { depositsAtLeast: 500_00, balanceAtLeast: 1_500_00, linkedAverageAtLeast: 5_000_00 } }),
        savings: p('Chase Savings', 'chase.com: $5 a month, waived with a $300 balance; 0.01% APY, compounded and credited monthly on the daily collected balance (chase.com savings page, read October 22, 2026)', { rate: 0.0001, quoted: 'APY', monthlyFee: 5_00, waiver: { balanceAtLeast: 300_00 } }),
      },
      {
        id: 'us-bank-of-america', name: 'Bank of America', iso: 'US', currency: 'USD', format: 'us', code: '026009593',
        current: p('Advantage Plus Banking', 'NerdWallet review of Bank of America: $12 a month, waived with a $250 direct deposit or a $1,500 daily balance', { deposits: 'electronic', monthlyFee: 12_00, waiver: { depositsAtLeast: 250_00, balanceAtLeast: 1_500_00 } }),
        savings: p('Advantage Savings', 'NerdWallet review of Bank of America: 0.01% APY; a daily periodic rate, compounded and paid monthly (bankofamerica.com savings FAQ and Clarity Statement, read October 22, 2026)', { rate: 0.0001, quoted: 'APY' }),
      },
      {
        id: 'us-wells-fargo', name: 'Wells Fargo', iso: 'US', currency: 'USD', format: 'us', code: '121000248',
        current: p('Everyday Checking', 'wellsfargo.com: $15 a month, waived with $500 of electronic deposits, a $1,500 daily balance, $5,000 in linked Wells Fargo accounts (the game takes it as an average), or ages 17 to 24; the military direct-deposit waiver applies to no one in the game', { deposits: 'electronic', monthlyFee: 15_00, waiver: { depositsAtLeast: 500_00, balanceAtLeast: 1_500_00, linkedAverageAtLeast: 5_000_00, ageBelow: 25 } }),
        savings: p('Way2Save Savings', 'wellsfargo.com: 0.01% APY, compounded daily and paid monthly, on a 365-day year (Way2Save page and consumer disclosures, read October 22, 2026)', { rate: 0.0001, quoted: 'APY', compounds: 'daily' }),
      },
      {
        id: 'us-citi', name: 'Citi', iso: 'US', currency: 'USD', format: 'us', code: '021000089',
        current: p('Citi Access Checking', 'citi.com: $5 a month, waived with $250 of direct deposits, or for owners 23 and under', { deposits: 'electronic', monthlyFee: 5_00, waiver: { depositsAtLeast: 250_00, ageBelow: 24 } }),
        savings: p('Citi Savings', `citi.com: $4.50 a month, waived with a $500 average balance; ${NOT_FOUND}`, { monthlyFee: 4_50, waiver: { averageAtLeast: 500_00 } }),
        overdraft: 'Citi charges no overdraft or returned-item fees.',
      },
      {
        id: 'us-capital-one', name: 'Capital One', iso: 'US', currency: 'USD', format: 'us', code: '031176110',
        current: p('360 Checking', 'capitalone.com: no monthly fee'),
        savings: p('360 Performance Savings', '3.00% APY variable, as a rate aggregator had it on September 24, 2026; compounded and credited monthly, by the daily balance method (capitalone.com disclosure, dated July 15, 2026)', { rate: 0.03, quoted: 'APY' }),
        overdraft: 'Capital One charges no overdraft fees.',
      },
    ],
  },
  // --- Canada -----------------------------------------------------------------
  {
    iso: 'CA',
    interestTax: { rate: 0, note: 'The bank withholds no tax from a resident; interest is reported on a T5 slip.', source: 'canada.ca, line 12100' },
    banks: [
      {
        id: 'ca-rbc', returned: { fee: 10_00, gapDays: 2, ifShortAtLeast: 10_00, source: 'canada.ca: since March 12, 2026 at most $10 for a payment returned unpaid, one fee every two business days, none under $10' }, name: 'RBC Royal Bank', iso: 'CA', currency: 'CAD', format: 'ca', code: '003',
        current: p('RBC Signature No Limit Banking', 'rbcroyalbank.com: $16.95 a month; the $4,000 minimum-balance waiver is from secondary sources', { monthlyFee: 16_95, waiver: { balanceAtLeast: 4_000_00 } }),
        savings: p('RBC High Interest eSavings', 'rbcroyalbank.com: 0.550% regular rate', { rate: 0.0055 }),
      },
      {
        id: 'ca-td', returned: { fee: 10_00, gapDays: 2, ifShortAtLeast: 10_00, source: 'canada.ca: since March 12, 2026 at most $10 for a payment returned unpaid, one fee every two business days, none under $10' }, name: 'TD Canada Trust', iso: 'CA', currency: 'CAD', format: 'ca', code: '004',
        current: p('TD Unlimited Chequing', 'td.com: $17.95 a month, waived with a $4,000 minimum daily balance', { monthlyFee: 17_95, waiver: { balanceAtLeast: 4_000_00 } }),
        savings: p('TD ePremium Savings', 'td.com: 0.45%, only on balances of $10,000 or more', { rate: 0.0045, rateFrom: 10_000_00 }),
      },
      {
        id: 'ca-scotiabank', returned: { fee: 10_00, gapDays: 2, ifShortAtLeast: 10_00, source: 'canada.ca: since March 12, 2026 at most $10 for a payment returned unpaid, one fee every two business days, none under $10' }, name: 'Scotiabank', iso: 'CA', currency: 'CAD', format: 'ca', code: '002',
        current: p('Preferred Package', 'scotiabank.com: $16.95 a month, waived with a $4,000 daily balance', { monthlyFee: 16_95, waiver: { balanceAtLeast: 4_000_00 } }),
        savings: p('MomentumPLUS Savings', 'scotiabank.com: 0.40% base rate; the game leaves out the premiums for money held 90 to 360 days', { rate: 0.004 }),
      },
      {
        id: 'ca-bmo', returned: { fee: 10_00, gapDays: 2, ifShortAtLeast: 10_00, source: 'canada.ca: since March 12, 2026 at most $10 for a payment returned unpaid, one fee every two business days, none under $10' }, name: 'BMO', iso: 'CA', currency: 'CAD', format: 'ca', code: '001',
        current: p('Performance Chequing Plan', 'finder.com/ca: $17.95 a month, waived with a $4,000 minimum balance', { monthlyFee: 17_95, waiver: { balanceAtLeast: 4_000_00 } }),
        savings: p('Savings Amplifier Account', 'bmo.com promotional offer terms, August 26, 2026: the posted rate 0.450%, paid monthly; the game leaves out the 4.550% promotion for 120 days, for accounts opened in September 2026 with a chequing plan', { rate: 0.0045 }),
      },
      {
        id: 'ca-cibc', returned: { fee: 10_00, gapDays: 2, ifShortAtLeast: 10_00, source: 'canada.ca: since March 12, 2026 at most $10 for a payment returned unpaid, one fee every two business days, none under $10' }, name: 'CIBC', iso: 'CA', currency: 'CAD', format: 'ca', code: '010',
        current: p('CIBC Smart Account', 'cibc.com: $16.95 a month, rebated with a $4,000 daily balance; free under 25', { monthlyFee: 16_95, waiver: { balanceAtLeast: 4_000_00, ageBelow: 25 } }),
        savings: p('CIBC eAdvantage Savings', 'CIBC’s own rate feed, July 2, 2026: 0.30% up to $99,999.99 and 0.60% from $100,000, which the game applies to the whole balance at its tier; it leaves out the 4.60% three-month bonus and the Smart Interest top-up', { rate: 0.003, tiers: [{ from: 100_000_00, rate: 0.006 }] }),
      },
    ],
  },
  // --- Mexico -----------------------------------------------------------------
  {
    iso: 'MX',
    interestTax: { rate: 0, note: 'The bank withholds ISR at 0.90% a year on the capital earning interest (LIF 2026, art. 24); no savings rate was found, so nothing in the game earns interest for it to withhold from.', source: 'diputados.gob.mx LIF 2026' },
    banks: [
      {
        id: 'mx-bbva', name: 'BBVA México', iso: 'MX', currency: 'MXN', format: 'mx', code: '012',
        current: p('Libretón Básico Cuenta Digital', 'bbva.mx: no fees on the digital account'),
        savings: p('Libretón', 'bbva.mx Libretón contract cover sheet: “sin intereses”, no interest'),
      },
      {
        id: 'mx-banorte', name: 'Banorte', iso: 'MX', currency: 'MXN', format: 'mx', code: '072',
        current: p('Cuenta Enlace Personal', 'banorte.com: a MXN 5,000 minimum average, waived with payroll; the fee itself was not found'),
        savings: p('Inversión Enlace', 'banorte.com Enlace Personal brochure, July 3, 2026: GAT nominal 0.31% (GAT real −3.50%) before tax; a GAT is a net yearly yield (Banco de México, Circular 35/2010); when it’s credited wasn’t found, so monthly is estimated', { rate: 0.0031, quoted: 'GAT' }),
      },
      {
        id: 'mx-santander', quietMonth: { fee: 11_48, minTransactions: 2, unlessWages: true, source: 'santander.com.mx: MXN 9.90 plus 16% VAT in a month with fewer than two transactions and no payroll' }, name: 'Santander México', iso: 'MX', currency: 'MXN', format: 'mx', code: '014',
        current: p('Débito LikeU', 'santander.com.mx: no monthly fee but the quiet-month fee'),
        savings: p('Débito LikeU', 'financera.mx, September 5, 2026: the account pays no interest (santander.com.mx could not be read)'),
      },
      {
        id: 'mx-banamex', name: 'Banamex', iso: 'MX', currency: 'MXN', format: 'mx', code: '002',
        current: p('Cuenta de Nómina Banamex', 'banamex.com: no fee while a salary is paid into it'),
        savings: p('Ahorro Fácil', 'banamex.com, August 5, 2026: a variable 0.00%, GAT nominal 0.00%'),
      },
    ],
  },
  // --- United Kingdom ---------------------------------------------------------
  {
    iso: 'GB',
    interestTax: { rate: 0, note: 'Banks have withheld no tax since April 2016; the Personal Savings Allowance covers £1,000 a year for a basic-rate taxpayer.', source: 'gov.uk' },
    banks: [
      {
        id: 'gb-barclays', name: 'Barclays', iso: 'GB', currency: 'GBP', format: 'gb', code: '20',
        current: p('Barclays Bank Account', 'barclays.co.uk: no monthly fee'),
        savings: p('Everyday Saver', 'barclays.co.uk: 1.00% AER from March 11, 2026; paid monthly, as DepositScout lists it', { rate: 0.01, quoted: 'AER' }),
      },
      {
        id: 'gb-lloyds', name: 'Lloyds Bank', iso: 'GB', currency: 'GBP', format: 'gb', code: '30',
        current: p('Classic Account', 'lloydsbank.com: no monthly fee'),
        savings: p('Easy Saver', 'lloydsbank.com: up to 1.00% AER variable; interest paid 12 months after the account opens (lloydsbank.com Easy Saver page, read October 22, 2026)', { rate: 0.01, quoted: 'AER', creditsEvery: 12 }),
      },
      {
        id: 'gb-natwest', name: 'NatWest', iso: 'GB', currency: 'GBP', format: 'gb', code: '60',
        current: p('Select Account', 'natwest.com: no monthly fee'),
        savings: p('Flexible Saver', 'natwest.com: 1.25% AER up to £10,000, 1.00% above (the game pays 1.25% on all of it); when it’s paid wasn’t found, so monthly is estimated', { rate: 0.0125, quoted: 'AER' }),
      },
      {
        id: 'gb-hsbc', name: 'HSBC UK', iso: 'GB', currency: 'GBP', format: 'gb', code: '40',
        current: p('HSBC Bank Account', 'hsbc.co.uk: no monthly fee'),
        savings: p('Flexible Saver', 'hsbc.co.uk: 1.05% AER, 1.04% gross, from March 12, 2026, calculated daily and credited monthly', { rate: 0.0105, quoted: 'AER' }),
      },
      {
        id: 'gb-santander', name: 'Santander UK', iso: 'GB', currency: 'GBP', format: 'gb', code: '09',
        current: p('Everyday Current Account', 'santander.co.uk: no monthly fee'),
        savings: p('Easy Access Saver', 'santander.co.uk Issue 31 key facts, July 17, 2026: 2.00% AER for 12 months (1.98% gross paid monthly), then moved to the Everyday Saver at 0.90% (rates at August 4, 2026)', { rate: 0.009, quoted: 'AER', intro: [{ months: 12, rate: 0.02 }] }),
      },
      {
        id: 'gb-nationwide', name: 'Nationwide Building Society', iso: 'GB', currency: 'GBP', format: 'gb', code: '07',
        current: p('FlexAccount', 'nationwide.co.uk: no monthly fee'),
        savings: p('Flex Instant Saver', 'nationwide.co.uk: 2.30% AER/gross, calculated daily and credited once a year (read October 22, 2026)', { rate: 0.023, quoted: 'AER', creditsEvery: 12 }),
      },
    ],
  },
  // --- Ireland ----------------------------------------------------------------
  {
    iso: 'IE',
    interestTax: { rate: 0.33, note: 'DIRT at 33%, taken by the bank and final.', source: 'revenue.ie' },
    banks: [
      {
        id: 'ie-aib', name: 'AIB', iso: 'IE', currency: 'EUR', format: 'ie', code: 'AIBK93',
        current: p('Personal Current Account', 'aib.ie: €6 a month from July 1, 2026; the game leaves out its exemptions for students, graduates, over-66s and mortgage holders', { monthlyFee: 6_00 }),
        savings: p('Demand Deposit Account', 'aib.ie: 0.25% AER (rates dated May 2025); interest put in each April and October', { rate: 0.0025, quoted: 'AER', pays: [4, 10] }),
      },
      {
        id: 'ie-bank-of-ireland', name: 'Bank of Ireland', iso: 'IE', currency: 'EUR', format: 'ie', code: 'BOFI90',
        current: p('Personal Current Account', 'bankofireland.com: €6 a month flat', { monthlyFee: 6_00 }),
        savings: p('Demand Deposit Account', 'bankofireland.com rate table, September 14, 2026: 0.10% AER; when it’s paid wasn’t found, so monthly is estimated', { rate: 0.001, quoted: 'AER' }),
      },
      {
        id: 'ie-ptsb', name: 'PTSB', iso: 'IE', currency: 'EUR', format: 'ie', code: 'IPBS99',
        current: p('Explore Account', 'ptsb.ie: €8 a month, no waivers since 2023', { monthlyFee: 8_00 }),
        savings: p('Demand Deposit Account', 'ptsb.ie: 0.01%', { rate: 0.0001 }),
      },
    ],
  },
  // --- Iceland ----------------------------------------------------------------
  {
    iso: 'IS',
    interestTax: {
      rate: 0.22, refund: { allowance: 300_000_00, month: 6, day: 1, estimateDate: true },
      note: 'Capital income tax (fjármagnstekjuskattur) at 22%, taken by the bank; the tax on the first 300,000 kr of a year’s interest comes back at the next year’s assessment.',
      source: 'skatturinn.is',
    },
    banks: [
      {
        id: 'is-landsbankinn', name: 'Landsbankinn', iso: 'IS', currency: 'ISK', format: 'is', code: '01', currentLedger: '26', savingsLedger: '05',
        current: p('Einkareikningur', 'landsbankinn.is rate decision, September 1, 2026: the checking account pays 0.50%; no fees were found', { rate: 0.005 }),
        savings: p('Vaxtareikningur', 'landsbankinn.is rate decision, September 1, 2026: 5.79% on the lowest tier, up to 6.25%', { rate: 0.0579 }),
      },
      {
        // The source said "Arion price list, 23 September 2026" until brief 10 (2026-10-16), when the price list read was
        // the one valid from 7 May 2026, its figures the same; the timing is `ARION_CARD_YEAR`'s, labelled simulated.
        id: 'is-arion', card: { yearly: 950_00, perPurchase: 19_00, freeUnder: 24, year: ARION_CARD_YEAR, source: 'Arion’s price list and payment-account fee sheet, from May 7, 2026 (read October 16, 2026): a debit card at 950 kr a year and 19 kr a purchase, free for 23 and under' }, name: 'Arion banki', iso: 'IS', currency: 'ISK', format: 'is', code: '03', currentLedger: '26', savingsLedger: '13',
        current: p('Veltureikningur', 'arionbanki.is rate table, September 24, 2026: 0.05%; no monthly fee', { rate: 0.0005 }),
        savings: p('Vöxtur', 'arionbanki.is individuals’ rate table, September 24, 2026, Vöxtur óbundinn: 5.55% to 1 million kr, 5.65% to 5 million, 5.75% to 20 million, 5.85% over', { rate: 0.0555, tiers: [{ from: 1_000_000_00, rate: 0.0565 }, { from: 5_000_000_00, rate: 0.0575 }, { from: 20_000_000_00, rate: 0.0585 }] }),
      },
      {
        id: 'is-islandsbanki', name: 'Íslandsbanki', iso: 'IS', currency: 'ISK', format: 'is', code: '05', currentLedger: '26',
        current: p('Almennur reikningur', 'islandsbanki.is rate table, September 3, 2026: 0.25%; no fees were found', { rate: 0.0025 }),
        savings: p('Vaxtaþrep', 'islandsbanki.is rate table from September 3, 2026, Vaxtaþrep, interest paid monthly: 6.13% under 1 million kr, 6.17% to 5 million, 6.22% to 20 million, 6.27% to 75 million, 6.31% to 100 million', { rate: 0.0613, tiers: [{ from: 1_000_000_00, rate: 0.0617 }, { from: 5_000_000_00, rate: 0.0622 }, { from: 20_000_000_00, rate: 0.0627 }, { from: 75_000_000_00, rate: 0.0631 }] }),
      },
    ],
  },
  // --- France -----------------------------------------------------------------
  {
    iso: 'FR',
    interestTax: { rate: 0.314, note: 'On ordinary interest the bank takes 12.8% toward income tax and 18.6% social charges (from 2026). A Livret A pays tax-free.', source: 'service-public.gouv.fr F2329' },
    banks: [
      {
        id: 'fr-bnp-paribas', name: 'BNP Paribas', iso: 'FR', currency: 'EUR', format: 'fr', code: '30004',
        current: p('Compte de dépôt', 'BNP Paribas price list from January 1, 2026, via moneyvox.fr: account keeping €2.60 a month, free for 18 to 24', { monthlyFee: 2_60, waiver: { ageBelow: 25 } }),
        savings: p('Livret A', 'economie.gouv.fr: 1.7% from August 1, 2026, tax-free, paid once a year at the end of December', { rate: 0.017, taxFree: true, pays: [12] }),
      },
      {
        id: 'fr-societe-generale', name: 'SG', iso: 'FR', currency: 'EUR', format: 'fr', code: '30003',
        current: p('Compte bancaire', 'SG price list 2026: €7.65 a quarter (€2.55 a month in the game), waived under 25', { monthlyFee: 2_55, waiver: { ageBelow: 25 } }),
        savings: p('Livret A', 'economie.gouv.fr: 1.7% from August 1, 2026, tax-free, paid once a year', { rate: 0.017, taxFree: true, pays: [12] }),
      },
      {
        id: 'fr-lcl', name: 'LCL', iso: 'FR', currency: 'EUR', format: 'fr', code: '30002',
        current: p('Compte de dépôt', 'LCL via moneyvox.fr: free where a salary is paid in, else €10 a quarter (€3.33 a month in the game)', { monthlyFee: 3_33, waiver: { depositsAtLeast: 1 } }),
        savings: p('Livret A', 'economie.gouv.fr: 1.7% from August 1, 2026, tax-free, paid once a year', { rate: 0.017, taxFree: true, pays: [12] }),
      },
      {
        id: 'fr-credit-agricole', name: 'Crédit Agricole Paris Île-de-France', iso: 'FR', currency: 'EUR', format: 'fr', code: '18206',
        current: p('Compte de dépôt', 'moneyvox.fr: €18 a year (€1.50 a month in the game), varying by regional bank', { monthlyFee: 1_50 }),
        savings: p('Livret A', 'economie.gouv.fr: 1.7% from August 1, 2026, tax-free, paid once a year', { rate: 0.017, taxFree: true, pays: [12] }),
      },
      {
        id: 'fr-la-banque-postale', name: 'La Banque Postale', iso: 'FR', currency: 'EUR', format: 'fr', code: '20041',
        current: p('CCP', 'moneyvox.fr: €25.20 a year (€2.10 a month in the game)', { monthlyFee: 2_10 }),
        savings: p('Livret A', 'economie.gouv.fr: 1.7% from August 1, 2026, tax-free, paid once a year', { rate: 0.017, taxFree: true, pays: [12] }),
      },
    ],
  },
  // --- Germany ----------------------------------------------------------------
  {
    iso: 'DE',
    interestTax: { rate: 0.26375, allowance: 1_000_00, note: 'Abgeltungsteuer at 25% plus the 5.5% Solidaritätszuschlag, taken by the bank on interest above the €1,000 Sparer-Pauschbetrag a year; the game leaves out church tax.', source: 'gesetze-im-internet.de, §32d and §20(9) EStG' },
    banks: [
      {
        id: 'de-deutsche-bank', name: 'Deutsche Bank', iso: 'DE', currency: 'EUR', format: 'de', code: '10070000',
        // Its opening month free from 2026-10-16, read in the price list that day; until then charged whole.
        current: p('AktivKonto', 'deutsche-bank.de fee information, September 23, 2026: €6.90 a month; its price list (Stand October 1, 2026, read October 16, 2026): the month it opens free', { monthlyFee: 6_90, waiver: { openingMonth: true } }),
        savings: p('Flexgeld', 'deutsche-bank.de: 0.50%', { rate: 0.005 }),
      },
      {
        id: 'de-commerzbank', name: 'Commerzbank', iso: 'DE', currency: 'EUR', format: 'de', code: '10040000',
        // Taken at each month's end from 2026-10-16 (brief 09's follow-up), as its distance-selling information books
        // “Kontoführungsentgelte monatlich”: until then at the quarter's closing. Its price list's footnote (“mit dem
        // nächstfolgenden Kontoabschluss berechnet”) and its payment-account information (“zum jeweiligen
        // Rechnungsabschluss belastet”) say the closing instead; the booking clause, the one that names the account fee and
        // sets it apart from the interest charged at the closing, is the one followed.
        current: p('GiroKonto', 'commerzbank.de, December 1, 2025: €4.90 a month, free only with €50,000 held at the bank (in the game, €50,000 in the account); charged at each month’s end (commerzbank.de distance-selling information, June 19, 2026, read October 16, 2026)', { monthlyFee: 4_90, waiver: { balanceAtLeast: 50_000_00 }, feePosts: 'month' }),
        savings: p('Tagesgeld', NOT_FOUND),
      },
      {
        id: 'de-postbank', name: 'Postbank', iso: 'DE', currency: 'EUR', format: 'de', code: '10010010',
        current: p('Giro plus', 'postbank.de, July 15, 2026: €6.90 a month, €5.90 in a month with €1,000 paid in', { deposits: 'electronic', monthlyFee: 6_90, reduced: { to: 5_90, depositsAtLeast: 1_000_00 } }),
        savings: p('Tagesgeld', NOT_FOUND),
      },
      {
        id: 'de-ing', name: 'ING Deutschland', iso: 'DE', currency: 'EUR', format: 'de', code: '50010517',
        // Taken in the month after from 2026-10-16 (brief 09's follow-up): “Belastung des monatlichen Entgelts im
        // Folgemonat” (ing.de conditions, Stand 1 June 2026); until then at the quarter's closing. The day in that month
        // isn't published: SLATE takes the first.
        current: p('Girokonto', 'ing.de conditions, September 25, 2026: free with €1,000 paid in a month or under 28, else €4.90, charged in the month after', { deposits: 'electronic', monthlyFee: 4_90, waiver: { depositsAtLeast: 1_000_00, ageBelow: 28 }, feePosts: 'next' }),
        savings: p('Extra-Konto', 'ing.de: 3.20% for a new customer’s first four months, then 0.75%', { rate: 0.0075, intro: [{ months: 4, rate: 0.032 }] }),
      },
      {
        // Its Sparkassen-Card from 2026-10-16 (brief 09's follow-up): until then SLATE charged nothing for it.
        id: 'de-berliner-sparkasse', name: 'Berliner Sparkasse', iso: 'DE', currency: 'EUR', format: 'de', code: '10050000',
        // `ahead: true` until brief 10 (2026-10-16), the same rule in `CardYear`'s words.
        card: { yearly: 12_00, year: { paid: 'ahead', length: 365 }, source:'berliner-sparkasse.de Giro Digital fee information, February 1, 2026, and price list, July 15, 2026 (read October 16, 2026): Giro Digital includes no Sparkassen-Card, which costs €12.00 a year, paid ahead, the unused part refunded on an early close (footnote 45, § 675h(3) BGB); the month it’s charged in isn’t published' },
        current: p('Giro Digital', 'berliner-sparkasse.de, February 1, 2026: €4.95 a month', { monthlyFee: 4_95 }),
        savings: p('Tagesgeld', 'berliner-sparkasse.de: 0.50%', { rate: 0.005 }),
      },
    ],
  },
  // --- Spain ------------------------------------------------------------------
  {
    iso: 'ES',
    interestTax: { rate: 0.19, note: 'A 19% retención on interest, taken by the bank.', source: 'Ley 35/2006, art. 101.4, boe.es' },
    banks: [
      {
        id: 'es-santander', name: 'Banco Santander', iso: 'ES', currency: 'EUR', format: 'es', code: '0049',
        current: p('Cuenta Santander', 'bancosantander.es: €20 a month, free with a nómina of €600 and three bills or six card payments in the quarter, more than €25,000 at the bank, or under 29', { monthlyFee: 20_00, waiver: { depositsAtLeast: 600_00, depositsAlso: { bills: 3, purchases: 6, months: 3 }, linkedAverageAtLeast: 25_000_01, ageBelow: 29 } }),
        savings: p('Cuenta Hucha', 'Finantres, September 16, 2026, and bancosantander.es: Santander’s accounts pay 0% TIN, 0% TAE'),
      },
      {
        id: 'es-bbva', name: 'BBVA', iso: 'ES', currency: 'EUR', format: 'es', code: '0182',
        current: p('Cuenta Online Sin Comisiones', 'bbva.es via comparison sites: no fee, no conditions'),
        savings: p('Cuenta Metas', 'bbva.es and Kelisto, September 21, 2026: 0% TIN, 0% TAE'),
      },
      {
        id: 'es-caixabank', name: 'CaixaBank', iso: 'ES', currency: 'EUR', format: 'es', code: '2100',
        current: p('Programa Día a Día', 'caixabank.es: €60 a quarter (€20 a month in the game) unless a nómina over €600 with three bills or card payments in the quarter, €20,000 at the bank, or under 29', { monthlyFee: 20_00, waiver: { depositsAtLeast: 600_01, depositsAlso: { either: 3, months: 3 }, linkedAverageAtLeast: 20_000_00, ageBelow: 29 } }),
        savings: p('Cuenta Online sin Comisiones', 'caixabank.es, September 2026: “cuenta no retribuida (0% TAE, 0% TIN)”'),
      },
      {
        id: 'es-sabadell', name: 'Banco Sabadell', iso: 'ES', currency: 'EUR', format: 'es', code: '0081',
        current: p('Cuenta Online Sabadell', 'comparison sites: no fee on the digital account'),
        savings: p('Cuenta Ahorro Sabadell', 'bancsabadell.com conditions, August 2026: 1% TIN (1.005% TAE) on up to €20,000, paid monthly', { rate: 0.01, rateUpTo: 20_000_00 }),
      },
      {
        id: 'es-bankinter', name: 'Bankinter', iso: 'ES', currency: 'EUR', format: 'es', code: '0128',
        current: p('Cuenta Nómina', 'bankinter.com: 5% TAE in the first year and 2% in the second (4.94% and 1.99% TIN), interest settled every six months from opening, on up to €10,000 (no rate after that was found); €22.50 a half-year (€3.75 a month in the game) without a nómina of €800', { intro: [{ months: 12, rate: 0.05 }, { months: 12, rate: 0.02 }], quoted: 'TAE', creditsEvery: 6, rateUpTo: 10_000_00, monthlyFee: 3_75, waiver: { depositsAtLeast: 800_00 } }),
        savings: p('Cuenta Nómina', NOT_FOUND),
      },
    ],
  },
  // --- Japan ------------------------------------------------------------------
  {
    iso: 'JP',
    interestTax: { rate: 0.20315, note: '20.315% taken at source and final: 15.315% national, reconstruction surtax included, and 5% local.', source: 'nta.go.jp No.1310' },
    banks: [
      {
        id: 'jp-mufg', dormant: { yearly: 1_320_00, afterYears: 2, source: 'bk.mufg.jp: ¥1,320 a year on an account unused for two years' }, name: 'MUFG Bank', iso: 'JP', currency: 'JPY', format: 'jp', code: '0005',
        current: p('普通預金 (Ordinary Deposit)', 'bk.mufg.jp: 0.40% since August 3, 2026, 0.50% from November 2, 2026, paid in February and August; the game’s accounts use the paperless passbook, which carries no fee', { rate: 0.004, changes: [{ from: '2026-11-02', rate: 0.005 }], pays: [2, 8] }),
        savings: p('普通預金 (Ordinary Deposit)', 'bk.mufg.jp: as the everyday account', { rate: 0.004, changes: [{ from: '2026-11-02', rate: 0.005 }], pays: [2, 8] }),
      },
      {
        id: 'jp-smbc', name: 'SMBC', iso: 'JP', currency: 'JPY', format: 'jp', code: '0009',
        current: p('普通預金 (Ordinary Deposit)', 'smbc.co.jp: 0.40%, 0.50% from November 2, 2026; SMBC’s ¥1,100 yearly fee on an account unused for two years holding under ¥10,000 spares one with the Web passbook, which the game’s accounts use (smbc.co.jp digitalmiriyou, April 8, 2024)', { rate: 0.004, changes: [{ from: '2026-11-02', rate: 0.005 }], pays: [2, 8] }),
        savings: p('普通預金 (Ordinary Deposit)', 'smbc.co.jp: as the everyday account', { rate: 0.004, changes: [{ from: '2026-11-02', rate: 0.005 }], pays: [2, 8] }),
      },
      {
        id: 'jp-mizuho', name: 'Mizuho Bank', iso: 'JP', currency: 'JPY', format: 'jp', code: '0001',
        current: p('普通預金 (Ordinary Deposit)', 'mizuhobank.co.jp: 0.40%, 0.50% from November 2, 2026', { rate: 0.004, changes: [{ from: '2026-11-02', rate: 0.005 }], pays: [2, 8] }),
        savings: p('普通預金 (Ordinary Deposit)', 'mizuhobank.co.jp: as the everyday account', { rate: 0.004, changes: [{ from: '2026-11-02', rate: 0.005 }], pays: [2, 8] }),
      },
      {
        id: 'jp-resona', dormant: { yearly: 1_320_00, afterYears: 2, belowBalance: 10_000_00, source: 'resona-gr.co.jp: ¥1,320 a year on an account unused for two years holding under ¥10,000' }, name: 'Resona Bank', iso: 'JP', currency: 'JPY', format: 'jp', code: '0010',
        current: p('普通預金 (Ordinary Deposit)', 'resona-gr.co.jp: 0.40% from August 3, 2026', { rate: 0.004, pays: [2, 8] }),
        savings: p('普通預金 (Ordinary Deposit)', 'resona-gr.co.jp: as the everyday account', { rate: 0.004, pays: [2, 8] }),
      },
      {
        id: 'jp-japan-post-bank', name: 'Japan Post Bank', iso: 'JP', currency: 'JPY', format: 'jp', code: '9900',
        current: p('通常貯金 (Ordinary Savings)', 'jp-bank.japanpost.jp: 0.400%, 0.500% from November 9, 2026', { rate: 0.004, changes: [{ from: '2026-11-09', rate: 0.005 }], pays: [2, 8] }),
        savings: p('通常貯金 (Ordinary Savings)', 'jp-bank.japanpost.jp: as the everyday account', { rate: 0.004, changes: [{ from: '2026-11-09', rate: 0.005 }], pays: [2, 8] }),
      },
    ],
  },
  // --- South Korea ------------------------------------------------------------
  {
    iso: 'KR',
    interestTax: { rate: 0.154, note: '15.4% taken at source: 14% national and 1.4% local income tax.', source: 'kbthink.com' },
    banks: [
      {
        id: 'kr-kb-kookmin', name: 'KB Kookmin Bank', iso: 'KR', currency: 'KRW', format: 'kr', code: '004', groups: [6, 2, 6],
        current: p('KB국민ONE통장 (everyday account)', 'obank.kbstar.com: 0.10%, no maintenance fee', { rate: 0.001 }),
        savings: p('KB국민ONE통장 (everyday account)', 'obank.kbstar.com: 0.10%', { rate: 0.001 }),
      },
      {
        id: 'kr-shinhan', name: 'Shinhan Bank', iso: 'KR', currency: 'KRW', format: 'kr', code: '088', groups: [3, 3, 6],
        current: p('쏠편한 입출금통장 (everyday account)', 'm.shinhan.com: 0.1%, no maintenance fee', { rate: 0.001 }),
        savings: p('쏠편한 입출금통장 (everyday account)', 'm.shinhan.com: 0.1%', { rate: 0.001 }),
      },
      {
        id: 'kr-hana', name: 'Hana Bank', iso: 'KR', currency: 'KRW', format: 'kr', code: '081', groups: [3, 6, 5],
        current: p('달달 하나 통장 (everyday account)', 'm.hanabank.com: 0.10% base; the game leaves out the up to 1.90% on ₩2 million with a salary', { rate: 0.001 }),
        savings: p('달달 하나 통장 (everyday account)', 'm.hanabank.com: 0.10% base', { rate: 0.001 }),
      },
      {
        id: 'kr-nh', name: 'NH NongHyup Bank', iso: 'KR', currency: 'KRW', format: 'kr', code: '011', groups: [3, 4, 4, 2],
        current: p('NH올원e통장 (everyday account)', 'etoday.co.kr: 0.1% base', { rate: 0.001 }),
        savings: p('NH올원e통장 (everyday account)', 'etoday.co.kr: 0.1% base', { rate: 0.001 }),
      },
      {
        id: 'kr-kakaobank', name: 'KakaoBank', iso: 'KR', currency: 'KRW', format: 'kr', code: '090', groups: [4, 2, 7],
        current: p('입출금통장 (everyday account)', 'kakaobank.com: 0.10%', { rate: 0.001 }),
        savings: p('세이프박스 (savings box)', 'kakaobank.com: 1.80% from September 10, 2026', { rate: 0.018 }),
      },
    ],
  },
  // --- Australia --------------------------------------------------------------
  {
    iso: 'AU',
    interestTax: { rate: 0, note: 'The bank withholds no tax once a tax file number is given; without one the bank takes 47%.', source: 'savings.com.au (the ATO page could not be read)' },
    banks: [
      {
        id: 'au-commbank', name: 'Commonwealth Bank', iso: 'AU', currency: 'AUD', format: 'au', code: '06',
        current: p('Everyday Account Smart Access', 'commbank.com.au: $4 a month, waived with $2,000 deposited in the month or under 30', { deposits: 'electronic', monthlyFee: 4_00, waiver: { depositsAtLeast: 2_000_00, ageBelow: 30 } }),
        savings: p('NetBank Saver', 'commbank.com.au, September 24, 2026: 5.20% for the first five months, then 2.10% standard', { rate: 0.021, intro: [{ months: 5, rate: 0.052 }] }),
      },
      {
        id: 'au-westpac', name: 'Westpac', iso: 'AU', currency: 'AUD', format: 'au', code: '03',
        current: p('Westpac Choice', 'westpac.com.au: $5 a month, waived with $2,000 deposited in the month', { deposits: 'electronic', monthlyFee: 5_00, waiver: { depositsAtLeast: 2_000_00 } }),
        savings: p('Westpac Life', 'westpac.com.au: 0.10% base, and a 4.90% bonus in a month the balance grows', { rate: 0.001, bonus: { rate: 0.049, when: 'grows' } }),
      },
      {
        id: 'au-nab', name: 'NAB', iso: 'AU', currency: 'AUD', format: 'au', code: '08',
        current: p('NAB Classic Banking', 'nab.com.au: no monthly fee'),
        savings: p('NAB Reward Saver', 'nab.com.au, from September 21, 2026: 0.01% base, and a 4.99% bonus in a month with no withdrawals', { rate: 0.0001, bonus: { rate: 0.0499, when: 'no_withdrawals' } }),
      },
      {
        id: 'au-anz', name: 'ANZ', iso: 'AU', currency: 'AUD', format: 'au', code: '01',
        current: p('ANZ Plus Everyday', 'anz.com.au: no monthly fee'),
        savings: p('ANZ Plus Growth Saver', 'anz.com.au: 0.10% base, and a 5.00% bonus in a month the balance grows by $100', { rate: 0.001, bonus: { rate: 0.05, when: 'grows', growBy: 100_00 } }),
      },
    ],
  },
  // --- New Zealand ------------------------------------------------------------
  {
    iso: 'NZ',
    interestTax: {
      brackets: [
        { upTo: 15_600_00, rate: 0.105 }, { upTo: 53_500_00, rate: 0.175 }, { upTo: 78_100_00, rate: 0.30 },
        { upTo: 180_000_00, rate: 0.33 }, { rate: 0.39 },
      ],
      note: 'Resident withholding tax at the rate that matches the saver’s income: 10.5%, 17.5%, 30%, 33% or 39%.',
      source: 'ird.govt.nz, resident withholding tax',
    },
    banks: [
      {
        id: 'nz-anz', name: 'ANZ', iso: 'NZ', currency: 'NZD', format: 'nz', code: '01',
        current: p('ANZ Go', 'anz.co.nz fees, September 1, 2026: no monthly fee'),
        savings: p('Serious Saver', 'anz.co.nz: 0.05% base, and a 2.00% bonus in a month with no withdrawals', { rate: 0.0005, bonus: { rate: 0.02, when: 'no_withdrawals' } }),
      },
      {
        id: 'nz-asb', name: 'ASB', iso: 'NZ', currency: 'NZD', format: 'nz', code: '12',
        current: p('ASB Streamline', 'asb.co.nz: no monthly fee'),
        savings: p('Savings Plus', 'interest.co.nz: 2.05%', { rate: 0.0205 }),
      },
      {
        id: 'nz-bnz', name: 'BNZ', iso: 'NZ', currency: 'NZD', format: 'nz', code: '02',
        current: p('YouMoney', 'bnz.co.nz: no monthly fee'),
        savings: p('Rapid Save', 'bnz.co.nz: 2.00%', { rate: 0.02 }),
      },
      {
        id: 'nz-westpac', name: 'Westpac NZ', iso: 'NZ', currency: 'NZD', format: 'nz', code: '03',
        current: p('Westpac Everyday', 'westpac.co.nz: no monthly fee'),
        savings: p('Bonus Saver', 'interest.co.nz: 1.75%', { rate: 0.0175 }),
      },
      {
        id: 'nz-kiwibank', name: 'Kiwibank', iso: 'NZ', currency: 'NZD', format: 'nz', code: '38',
        current: p('Free Up', 'kiwibank.co.nz: no monthly fee'),
        savings: p('Online Call', 'interest.co.nz: 1.90%', { rate: 0.019 }),
      },
    ],
  },
];
