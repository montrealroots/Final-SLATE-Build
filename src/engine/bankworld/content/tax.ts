/**
 * SLATE — Taxes and jurisdiction rules.
 *
 * Where the player lives genuinely changes their money. Rules resolve down a
 * jurisdiction path (country, then region, then city) and every rule carries an
 * effective date range, because rates change and a save that runs for twenty
 * years has to survive that.
 *
 * Honesty: these rates are CALIBRATED APPROXIMATIONS of how real tax systems
 * behave in structure — progressive brackets, flat state rates, no-income-tax
 * states, sales tax, property tax, payroll tax. They are close enough for the
 * simulation to teach real intuitions and they are not filing advice. A
 * vehicle's registration and purchase tax were kept too until 2026-09-27,
 * when nothing was driven; since 2026-09-29 they are kept again in
 * `content/vehiclefees.ts`. Property tax was a fact the place showed, charged to
 * no one, until homes could be owned on 2026-09-28 (`systems/homes.ts`),
 * which charges it, and reads California's cap on how fast an assessment grows.
 */

import type { Money } from '../core/money';
import { applyRate } from '../core/money';
import { jurisdictionPath } from './geography';
import { exchange } from './currency';

export interface TaxBracket {
  /** Lower bound of the bracket in cents. */
  from: Money;
  /** Marginal rate as a decimal. */
  rate: number;
}

export interface IncomeTaxRule {
  jurisdictionCode: string;
  label: string;
  kind: 'progressive' | 'flat' | 'none';
  brackets: TaxBracket[];
  flatRate?: number;
  standardDeduction: Money;
  effectiveFrom: number;
  effectiveTo?: number;
  note: string;
  /** The money its brackets and deduction are written in; dollars where not said. */
  currency?: string;
  /** Tax credits taken off the tax the brackets give, never below nothing, as Ireland's. */
  credit?: Money;
  /** A second charge on the whole income beside the tax, as Ireland's Universal Social Charge: none at all up to `exemptUpTo`. */
  levy?: { label: string; brackets: TaxBracket[]; exemptUpTo: Money };
}

export interface PayrollTaxRule {
  jurisdictionCode: string;
  /** Employee-side social insurance rate. */
  socialRate: number;
  /** Wage base above which the social rate stops applying, in cents. */
  socialWageBase: Money;
  medicalRate: number;
  /** Additional rate above the surcharge threshold. */
  surchargeRate: number;
  surchargeThreshold: Money;
  /** Self-employed pay both halves. */
  selfEmployedMultiplier: number;
  effectiveFrom: number;
  effectiveTo?: number;
  /** Earnings below which the social rate doesn't start, as the UK's primary threshold. */
  socialFloor?: Money;
  /** The money its bases and thresholds are written in; dollars where not said. */
  currency?: string;
}

export interface SalesTaxRule {
  jurisdictionCode: string;
  rate: number;
  /** Categories exempt from sales tax in this jurisdiction. */
  exemptCategories: string[];
  effectiveFrom: number;
}

export interface PropertyTaxRule {
  jurisdictionCode: string;
  /** Annual rate applied to assessed value. */
  rate: number;
  /** Cap on annual assessed-value growth, as a decimal. */
  assessmentGrowthCap?: number;
  effectiveFrom: number;
}

const YEAR = (y: number) => Date.UTC(y, 0, 1);

const APPROX = 'Calibrated approximation of the real structure. Not tax advice.';

// --- Income tax -------------------------------------------------------------

function brackets(pairs: [number, number][]): TaxBracket[] {
  return pairs.map(([from, rate]) => ({ from: from * 100, rate }));
}

/**
 * Iceland, which is where this game is played and was not in this table.
 *
 * Every other rule here was written for somewhere a production might travel to.
 * The one country the player actually lives in had no row at all, so the home
 * screen told them Iceland taxes a wage at 0% and charges no sales tax — beside
 * a company the same build already describes as paying 20% corporation tax and
 * 24% VSK.
 *
 * Three bands on the combined rate, which is how an Icelander experiences it:
 * tekjuskattur to the state and útsvar to the municipality are withheld
 * together and nobody quotes them apart. State 16.78 / 23.28 / 31.85 plus an
 * average útsvar of 14.97. The thresholds are monthly in law — ISK 472,005 and
 * ISK 1,325,127 — carried to a year and to this table's unit at the atlas's own
 * ISK rate of 138 to the dollar.
 *
 * One honest substitution. Iceland's persónuafsláttur is a CREDIT against tax
 * (ISK 68,691 a month, ISK 824,292 a year) and this table only has a deduction.
 * A credit of that size at the first band's rate is worth the same as deducting
 * about $18,800, so that is what is written, and it is the one figure here that
 * is a translation rather than a number.
 */
const ICELAND_NOTE = 'Tekjuskattur and average útsvar together. The personal credit is written as the '
  + 'deduction worth the same at the first band. Calibrated approximation. Not tax advice.';

export const INCOME_TAX_RULES: readonly IncomeTaxRule[] = [
  // The federal brackets and standard deduction of a single filer, by tax year, from the IRS’s own revenue procedures:
  // - 2024 and before: 2024’s, Rev. Proc. 2023-34, §3.01 Table 3 and §3.15(1) (10% to $11,600, $14,600 deducted), held
  //   back to 2018.
  // - 2025: Rev. Proc. 2024-40, §2.01 Table 3 (10% to $11,925, 12% to $48,475, 22% to $103,350, 24% to $197,300, 32% to
  //   $250,525, 35% to $626,350, 37% over). Its $15,000 deduction (§2.15(1)) was removed by Rev. Proc. 2025-32, §3.01: the
  //   One Big Beautiful Bill Act (Pub. L. 119-21, §70102) made 2025’s $15,750. Its §70101 kept the rates and left 2025’s
  //   brackets as 2024-40 had them (Rev. Proc. 2025-32, §2.01, and §3, which modifies only 2024-40’s §2.15(1) and §2.25).
  // - 2026: Rev. Proc. 2025-32, §4.01 Table 3 (10% to $12,400, 12% to $50,400, 22% to $105,700, 24% to $201,775, 32% to
  //   $256,225, 35% to $640,600, 37% over) and §4.14(1), $16,100 deducted; held for every year after, the IRS not having
  //   published 2027’s. (All three read from irs.gov/pub/irs-drop/rp-23-34.pdf, rp-24-40.pdf and rp-25-32.pdf on 2026-10-14.)
  // Until 2026-10-14 2024’s table was held for every year from 2018 (recorded as a limitation on 2026-10-13), so a 2026
  // return deducted $14,600, not $16,100, and the filing threshold that reads this deduction was 2024’s.
  {
    jurisdictionCode: 'US',
    label: 'United States Federal Income Tax',
    kind: 'progressive',
    brackets: brackets([
      [0, 0.10], [11_600, 0.12], [47_150, 0.22], [100_525, 0.24],
      [191_950, 0.32], [243_725, 0.35], [609_350, 0.37],
    ]),
    standardDeduction: 14_600_00,
    effectiveFrom: YEAR(2018),
    effectiveTo: YEAR(2025),
    note: 'Rev. Proc. 2023-34: 2024’s single filer’s table, held back to 2018. Not tax advice.',
  },
  {
    jurisdictionCode: 'US',
    label: 'United States Federal Income Tax',
    kind: 'progressive',
    brackets: brackets([
      [0, 0.10], [11_925, 0.12], [48_475, 0.22], [103_350, 0.24],
      [197_300, 0.32], [250_525, 0.35], [626_350, 0.37],
    ]),
    standardDeduction: 15_750_00,
    effectiveFrom: YEAR(2025),
    effectiveTo: YEAR(2026),
    note: 'Rev. Proc. 2024-40 brackets; the One Big Beautiful Bill Act’s $15,750 deduction (Rev. Proc. 2025-32, §3.01). Not tax advice.',
  },
  {
    jurisdictionCode: 'US',
    label: 'United States Federal Income Tax',
    kind: 'progressive',
    brackets: brackets([
      [0, 0.10], [12_400, 0.12], [50_400, 0.22], [105_700, 0.24],
      [201_775, 0.32], [256_225, 0.35], [640_600, 0.37],
    ]),
    standardDeduction: 16_100_00,
    effectiveFrom: YEAR(2026),
    note: 'Rev. Proc. 2025-32: 2026’s single filer’s table, kept for later years until the IRS publishes 2027’s. Not tax advice.',
  },
  { jurisdictionCode: 'US-CA', label: 'California Income Tax', kind: 'progressive', brackets: brackets([[0, 0.01], [10_412, 0.02], [24_684, 0.04], [38_959, 0.06], [54_081, 0.08], [68_350, 0.093], [349_137, 0.103], [418_961, 0.113], [698_271, 0.123]]), standardDeduction: 5_363_00, effectiveFrom: YEAR(2018), note: APPROX },
  // New York City's resident income tax, a single filer's brackets (NY Form IT-201 instructions, NYC rate schedule;
  // the rates have stood since 2017). Until 2026-09-27 SLATE had none, and a New Yorker paid only the state's.
  { jurisdictionCode: 'US-NY-newyork', label: 'New York City Resident Income Tax', kind: 'progressive', brackets: brackets([[0, 0.03078], [12_000, 0.03762], [25_000, 0.03819], [50_000, 0.03876]]), standardDeduction: 8_000_00, effectiveFrom: YEAR(2018), note: APPROX },
  // The same for the boroughs SLATE keeps by name (from 2026-10-11: until then Brooklyn, Queens, Manhattan and the Bronx
  // paid New York State's alone; all five are New York City for its tax, per DTF, research-local-income-taxes.json).
  ...['brooklyn', 'queens', 'manhattan', 'thebronx'].map((b): IncomeTaxRule => ({ jurisdictionCode: `US-NY-${b}`, label: 'New York City Resident Income Tax', kind: 'progressive', brackets: brackets([[0, 0.03078], [12_000, 0.03762], [25_000, 0.03819], [50_000, 0.03876]]), standardDeduction: 8_000_00, effectiveFrom: YEAR(2018), note: APPROX })),
  // Philadelphia's resident Wage and Earnings Tax, which changes each 1 July: a calendar year's rate here is its two
  // halves' mean, SLATE's reading of a year's income as earned evenly (3.74% to June 2026 and 3.735% after; 3.73% from
  // July 2027). No deduction. Collected by the city's Department of Revenue, not the state (research-local-income-taxes.json).
  { jurisdictionCode: 'US-PA-philadelphia', label: 'Philadelphia Wage And Earnings Tax', kind: 'flat', brackets: [], flatRate: (0.0375 + 0.0374) / 2, standardDeduction: 0, effectiveFrom: YEAR(2025), effectiveTo: YEAR(2026), note: 'Philadelphia Department of Revenue: 3.75% to June 2025, 3.74% from July; the game uses the year’s average.' },
  { jurisdictionCode: 'US-PA-philadelphia', label: 'Philadelphia Wage And Earnings Tax', kind: 'flat', brackets: [], flatRate: (0.0374 + 0.03735) / 2, standardDeduction: 0, effectiveFrom: YEAR(2026), effectiveTo: YEAR(2027), note: 'Philadelphia Department of Revenue: 3.74% to June 2026, 3.735% from July; the game uses the year’s average.' },
  { jurisdictionCode: 'US-PA-philadelphia', label: 'Philadelphia Wage And Earnings Tax', kind: 'flat', brackets: [], flatRate: (0.03735 + 0.0373) / 2, standardDeduction: 0, effectiveFrom: YEAR(2027), note: 'Philadelphia Department of Revenue: 3.735% to June 2027, 3.73% from July; the game uses the year’s average, and keeps it for later years.' },
  // Columbus's city income tax, 2.5% (2025 confirmed; 2026 and on not restated, held), collected by its Income Tax Division.
  { jurisdictionCode: 'US-OH-columbus', label: 'Columbus City Income Tax', kind: 'flat', brackets: [], flatRate: 0.025, standardDeduction: 0, effectiveFrom: YEAR(2025), note: 'City of Columbus Income Tax Division: 2.5% (confirmed for 2025, and assumed for later years).' },
  // Portland's two regional taxes, collected together by the City of Portland's Revenue Division: Metro's Supportive
  // Housing Services tax, 1% over $125,000 (2025), $128,000 (2026), $132,000 (2027); Multnomah County's Preschool For All
  // tax, 1.5% over $125,000 and 1.5% more over $250,000. Kept as one schedule; none below $125,000.
  { jurisdictionCode: 'US-OR-portland', label: 'Metro SHS And Multnomah PFA Taxes', kind: 'progressive', brackets: brackets([[0, 0], [125_000, 0.025], [250_000, 0.04]]), standardDeduction: 0, effectiveFrom: YEAR(2025), effectiveTo: YEAR(2026), note: 'City of Portland Revenue Division: SHS 1% over $125,000 (2025); PFA 1.5% over $125,000 and 1.5% more over $250,000.' },
  { jurisdictionCode: 'US-OR-portland', label: 'Metro SHS And Multnomah PFA Taxes', kind: 'progressive', brackets: brackets([[0, 0], [125_000, 0.015], [128_000, 0.025], [250_000, 0.04]]), standardDeduction: 0, effectiveFrom: YEAR(2026), effectiveTo: YEAR(2027), note: 'City of Portland Revenue Division: SHS 1% over $128,000 (2026); PFA 1.5% over $125,000 and 1.5% more over $250,000.' },
  { jurisdictionCode: 'US-OR-portland', label: 'Metro SHS And Multnomah PFA Taxes', kind: 'progressive', brackets: brackets([[0, 0], [125_000, 0.015], [132_000, 0.025], [250_000, 0.04]]), standardDeduction: 0, effectiveFrom: YEAR(2027), note: 'City of Portland Revenue Division: SHS 1% over $132,000 (2027); PFA 1.5% over $125,000 and 1.5% more over $250,000; its increase delayed to 2028, not assumed.' },
  { jurisdictionCode: 'US-NY', label: 'New York State Income Tax', kind: 'progressive', brackets: brackets([[0, 0.04], [8_500, 0.045], [11_700, 0.0525], [13_900, 0.055], [80_650, 0.06], [215_400, 0.0685], [1_077_550, 0.0965], [5_000_000, 0.103]]), standardDeduction: 8_000_00, effectiveFrom: YEAR(2018), note: APPROX },
  { jurisdictionCode: 'US-GA', label: 'Georgia Income Tax', kind: 'flat', brackets: [], flatRate: 0.0539, standardDeduction: 12_000_00, effectiveFrom: YEAR(2024), note: APPROX },
  // 4.99% for 2026, by Georgia's Department of Revenue (researched 2026-09-27).
  { jurisdictionCode: 'US-GA', label: 'Georgia Income Tax', kind: 'flat', brackets: [], flatRate: 0.0499, standardDeduction: 12_000_00, effectiveFrom: YEAR(2026), note: APPROX },
  { jurisdictionCode: 'US-IL', label: 'Illinois Income Tax', kind: 'flat', brackets: [], flatRate: 0.0495, standardDeduction: 2_775_00, effectiveFrom: YEAR(2018), note: APPROX },
  { jurisdictionCode: 'US-MA', label: 'Massachusetts Income Tax', kind: 'flat', brackets: [], flatRate: 0.05, standardDeduction: 4_400_00, effectiveFrom: YEAR(2018), note: APPROX },
  { jurisdictionCode: 'US-CO', label: 'Colorado Income Tax', kind: 'flat', brackets: [], flatRate: 0.044, standardDeduction: 14_600_00, effectiveFrom: YEAR(2022), note: APPROX },
  { jurisdictionCode: 'US-AZ', label: 'Arizona Income Tax', kind: 'flat', brackets: [], flatRate: 0.025, standardDeduction: 14_600_00, effectiveFrom: YEAR(2023), note: APPROX },
  { jurisdictionCode: 'US-UT', label: 'Utah Income Tax', kind: 'flat', brackets: [], flatRate: 0.0455, standardDeduction: 14_600_00, effectiveFrom: YEAR(2023), note: APPROX },
  { jurisdictionCode: 'US-NC', label: 'North Carolina Income Tax', kind: 'flat', brackets: [], flatRate: 0.0425, standardDeduction: 12_750_00, effectiveFrom: YEAR(2024), note: APPROX },
  { jurisdictionCode: 'US-NM', label: 'New Mexico Income Tax', kind: 'progressive', brackets: brackets([[0, 0.017], [5_500, 0.032], [11_000, 0.047], [16_000, 0.049], [210_000, 0.059]]), standardDeduction: 14_600_00, effectiveFrom: YEAR(2021), note: APPROX },
  { jurisdictionCode: 'US-LA', label: 'Louisiana Income Tax', kind: 'flat', brackets: [], flatRate: 0.03, standardDeduction: 12_500_00, effectiveFrom: YEAR(2025), note: APPROX },
  { jurisdictionCode: 'US-OR', label: 'Oregon Income Tax', kind: 'progressive', brackets: brackets([[0, 0.0475], [4_300, 0.0675], [10_750, 0.0875], [125_000, 0.099]]), standardDeduction: 2_745_00, effectiveFrom: YEAR(2018), note: APPROX },
  { jurisdictionCode: 'US-HI', label: 'Hawaii Income Tax', kind: 'progressive', brackets: brackets([[0, 0.014], [9_600, 0.055], [24_000, 0.0725], [48_000, 0.0825], [175_000, 0.09], [200_000, 0.10], [325_000, 0.11]]), standardDeduction: 4_400_00, effectiveFrom: YEAR(2018), note: APPROX },
  { jurisdictionCode: 'US-NJ', label: 'New Jersey Income Tax', kind: 'progressive', brackets: brackets([[0, 0.014], [20_000, 0.0175], [35_000, 0.035], [40_000, 0.05525], [75_000, 0.0637], [500_000, 0.0897], [1_000_000, 0.1075]]), standardDeduction: 0, effectiveFrom: YEAR(2018), note: APPROX },
  { jurisdictionCode: 'US-PA', label: 'Pennsylvania Income Tax', kind: 'flat', brackets: [], flatRate: 0.0307, standardDeduction: 0, effectiveFrom: YEAR(2018), note: APPROX },
  { jurisdictionCode: 'US-MI', label: 'Michigan Income Tax', kind: 'flat', brackets: [], flatRate: 0.0425, standardDeduction: 0, effectiveFrom: YEAR(2018), note: APPROX },
  { jurisdictionCode: 'US-OH', label: 'Ohio Income Tax', kind: 'progressive', brackets: brackets([[0, 0], [26_050, 0.0275], [100_000, 0.035]]), standardDeduction: 0, effectiveFrom: YEAR(2024), note: APPROX },
  // Indiana, the District of Columbia and Oklahoma, from the remaining-gaps pass of 2026-10-11
  // (docs/research/world/research-state-tax-in-dc-ok.json). Until then each had a city in SLATE and no rule: a life
  // there paid only the IRS. Indiana's is a flat rate by year, 3.0% for 2025, 2.95% for 2026, 2.9% from 2027 to 2029
  // (IC 6-3-2-1), on federal AGI less the $1,000 personal exemption (it has no standard deduction), kept here as the
  // deduction. Its county tax is the city's own rule below.
  { jurisdictionCode: 'US-IN', label: 'Indiana Income Tax', kind: 'flat', brackets: [], flatRate: 0.03, standardDeduction: 1_000_00, effectiveFrom: YEAR(2025), effectiveTo: YEAR(2026), note: 'IC 6-3-2-1: 3.0% for 2025, less the $1,000 personal exemption.' },
  { jurisdictionCode: 'US-IN', label: 'Indiana Income Tax', kind: 'flat', brackets: [], flatRate: 0.0295, standardDeduction: 1_000_00, effectiveFrom: YEAR(2026), effectiveTo: YEAR(2027), note: 'IC 6-3-2-1: 2.95% for 2026, less the $1,000 personal exemption.' },
  { jurisdictionCode: 'US-IN', label: 'Indiana Income Tax', kind: 'flat', brackets: [], flatRate: 0.029, standardDeduction: 1_000_00, effectiveFrom: YEAR(2027), note: 'IC 6-3-2-1: 2.9% from 2027 to 2029, less the $1,000 personal exemption; cuts from 2030 only on certified revenue growth, not assumed.' },
  // Marion County's income tax, 2.02% for 2025 and 2026, by county of residence on 1 January, on the state's base (Indiana
  // AGI less exemptions), filed on the state's return and collected by Indiana's DOR. The 2027 rate isn't published:
  // 2026's is held, SLATE's assumption.
  { jurisdictionCode: 'US-IN-indianapolis', label: 'Marion County Income Tax', kind: 'flat', brackets: [], flatRate: 0.0202, standardDeduction: 1_000_00, effectiveFrom: YEAR(2025), note: 'Indiana DOR Departmental Notice 1: Marion County 2.02% for 2025 and 2026; 2027 is assumed to stay at 2026’s rate.' },
  // The District's brackets, unchanged since 2022 (DC Code 47-1806.03), on federal AGI less the $15,000 standard
  // deduction (2025). The 2026 deduction is $15,000 indexed to local inflation, and the indexed figure isn't published:
  // $15,000 is held, SLATE's assumption.
  { jurisdictionCode: 'US-DC', label: 'District Of Columbia Income Tax', kind: 'progressive', brackets: brackets([[0, 0.04], [10_000, 0.06], [40_000, 0.065], [60_000, 0.085], [250_000, 0.0925], [500_000, 0.0975], [1_000_000, 0.1075]]), standardDeduction: 15_000_00, effectiveFrom: YEAR(2022), note: 'DC Code 47-1806.03; the $15,000 standard deduction of 2025, assumed for 2026 and later because the inflation-indexed 2026 figure isn’t published.' },
  // Oklahoma's, 2025's six steps, then 2026's four (HB 2764, 68 O.S. 2355); no further cut certified for 2027, so 2026's
  // stand. A single filer's $6,350 standard deduction and $1,000 exemption, inferred for 2026 from the OW-2 tables.
  { jurisdictionCode: 'US-OK', label: 'Oklahoma Income Tax', kind: 'progressive', brackets: brackets([[0, 0.0025], [1_000, 0.0075], [2_500, 0.0175], [3_750, 0.0275], [4_900, 0.0375], [7_200, 0.0475]]), standardDeduction: 7_350_00, effectiveFrom: YEAR(2025), effectiveTo: YEAR(2026), note: '68 O.S. 2355: 2025’s six steps, single; the $6,350 standard deduction and $1,000 exemption.' },
  { jurisdictionCode: 'US-OK', label: 'Oklahoma Income Tax', kind: 'progressive', brackets: brackets([[0, 0], [3_750, 0.025], [4_900, 0.035], [7_200, 0.045]]), standardDeduction: 7_350_00, effectiveFrom: YEAR(2026), note: 'HB 2764, 68 O.S. 2355: 2026’s four steps, single, standing for 2027 with no cut certified; the $6,350 deduction and $1,000 exemption (2026’s inferred from the OW-2 tables).' },
  // No state income tax.
  { jurisdictionCode: 'US-TX', label: 'Texas (No State Income Tax)', kind: 'none', brackets: [], standardDeduction: 0, effectiveFrom: YEAR(1900), note: 'Texas levies no personal income tax.' },
  { jurisdictionCode: 'US-FL', label: 'Florida (No State Income Tax)', kind: 'none', brackets: [], standardDeduction: 0, effectiveFrom: YEAR(1900), note: 'Florida levies no personal income tax.' },
  { jurisdictionCode: 'US-NV', label: 'Nevada (No State Income Tax)', kind: 'none', brackets: [], standardDeduction: 0, effectiveFrom: YEAR(1900), note: 'Nevada levies no personal income tax.' },
  { jurisdictionCode: 'US-WA', label: 'Washington (No State Income Tax)', kind: 'none', brackets: [], standardDeduction: 0, effectiveFrom: YEAR(1900), note: 'Washington levies no personal income tax on wages.' },
  { jurisdictionCode: 'US-TN', label: 'Tennessee (No State Income Tax)', kind: 'none', brackets: [], standardDeduction: 0, effectiveFrom: YEAR(2021), note: 'Tennessee levies no personal income tax.' },
  // Other countries, structurally modeled.
  { jurisdictionCode: 'CA', label: 'Canada Federal Income Tax', kind: 'progressive', brackets: brackets([[0, 0.15], [55_867, 0.205], [111_733, 0.26], [173_205, 0.29], [246_752, 0.33]]), standardDeduction: 15_705_00, effectiveFrom: YEAR(2024), note: APPROX, currency: 'CAD' },
  { jurisdictionCode: 'CA-02', label: 'British Columbia Income Tax', kind: 'progressive', brackets: brackets([[0, 0.0506], [47_937, 0.077], [95_875, 0.105], [110_076, 0.1229], [133_664, 0.147], [181_232, 0.168], [252_752, 0.205]]), standardDeduction: 12_580_00, effectiveFrom: YEAR(2024), note: APPROX, currency: 'CAD' },
  { jurisdictionCode: 'CA-08', label: 'Ontario Income Tax', kind: 'progressive', brackets: brackets([[0, 0.0505], [51_446, 0.0915], [102_894, 0.1116], [150_000, 0.1216], [220_000, 0.1316]]), standardDeduction: 12_399_00, effectiveFrom: YEAR(2024), note: APPROX, currency: 'CAD' },
  { jurisdictionCode: 'CA-10', label: 'Quebec Income Tax', kind: 'progressive', brackets: brackets([[0, 0.14], [51_780, 0.19], [103_545, 0.24], [126_000, 0.2575]]), standardDeduction: 18_056_00, effectiveFrom: YEAR(2024), note: APPROX, currency: 'CAD' },
  { jurisdictionCode: 'GB', label: 'United Kingdom Income Tax', kind: 'progressive', brackets: brackets([[0, 0], [12_570, 0.20], [50_270, 0.40], [125_140, 0.45]]), standardDeduction: 0, effectiveFrom: YEAR(2021), note: APPROX, currency: 'GBP' },
  { jurisdictionCode: 'IE', label: 'Ireland Income Tax', kind: 'progressive', brackets: brackets([[0, 0.20], [42_000, 0.40]]), standardDeduction: 0, effectiveFrom: YEAR(2024), effectiveTo: YEAR(2026), note: APPROX, currency: 'EUR' },
  // Revenue's Budget 2026 summary: 20% on a single person's first €44,000 and
  // 40% above, less the personal credit and the employee or earned income
  // credit, €2,000 each and never more than €2,000 together for the second;
  // the Universal Social Charge beside it, none at all on €13,000 or less and
  // on every euro above it otherwise, from 1 January 2026. The rent credit and
  // USC's 3% surcharge on self-employed income over €100,000 aren't kept.
  // Until 2026-09-29 Ireland's band was 2024's €42,000, with no credits and
  // no USC.
  {
    jurisdictionCode: 'IE', label: 'Ireland Income Tax', kind: 'progressive', brackets: brackets([[0, 0.20], [44_000, 0.40]]), standardDeduction: 0, effectiveFrom: YEAR(2026), currency: 'EUR',
    credit: 4_000_00,
    levy: { label: 'Universal Social Charge', brackets: brackets([[0, 0.005], [12_012, 0.02], [28_700, 0.03], [70_044, 0.08]]), exemptUpTo: 13_000_00 },
    note: 'Revenue, Budget 2026 summary; https://www.revenue.ie/en/jobs-and-pensions/usc/standard-rates-thresholds.aspx',
  },
  { jurisdictionCode: 'FR', label: 'France Income Tax', kind: 'progressive', brackets: brackets([[0, 0], [11_294, 0.11], [28_797, 0.30], [82_341, 0.41], [177_106, 0.45]]), standardDeduction: 0, effectiveFrom: YEAR(2024), note: APPROX, currency: 'EUR' },
  { jurisdictionCode: 'DE', label: 'Germany Income Tax', kind: 'progressive', brackets: brackets([[0, 0], [11_604, 0.14], [17_006, 0.24], [66_761, 0.42], [277_826, 0.45]]), standardDeduction: 0, effectiveFrom: YEAR(2024), note: APPROX, currency: 'EUR' },
  { jurisdictionCode: 'ES', label: 'Spain Income Tax', kind: 'progressive', brackets: brackets([[0, 0.19], [12_450, 0.24], [20_200, 0.30], [35_200, 0.37], [60_000, 0.45], [300_000, 0.47]]), standardDeduction: 5_550_00, effectiveFrom: YEAR(2023), note: APPROX, currency: 'EUR' },
  { jurisdictionCode: 'IT', label: 'Italy Income Tax', kind: 'progressive', brackets: brackets([[0, 0.23], [28_000, 0.35], [50_000, 0.43]]), standardDeduction: 0, effectiveFrom: YEAR(2024), note: APPROX, currency: 'EUR' },
  { jurisdictionCode: 'AU', label: 'Australia Income Tax', kind: 'progressive', brackets: brackets([[0, 0], [18_200, 0.16], [45_000, 0.30], [135_000, 0.37], [190_000, 0.45]]), standardDeduction: 0, effectiveFrom: YEAR(2024), note: APPROX, currency: 'AUD' },
  { jurisdictionCode: 'NZ', label: 'New Zealand Income Tax', kind: 'progressive', brackets: brackets([[0, 0.105], [15_600, 0.175], [53_500, 0.30], [78_100, 0.33], [180_000, 0.39]]), standardDeduction: 0, effectiveFrom: YEAR(2024), note: APPROX, currency: 'NZD' },
  { jurisdictionCode: 'JP', label: 'Japan Income Tax', kind: 'progressive', brackets: brackets([[0, 0.05], [1_950, 0.10], [3_300, 0.20], [6_950, 0.23], [9_000, 0.33], [18_000, 0.40], [40_000, 0.45]]), standardDeduction: 480_00, effectiveFrom: YEAR(2020), note: `${APPROX} Amounts are modeled in US dollar equivalents.` },
  { jurisdictionCode: 'KR', label: 'South Korea Income Tax', kind: 'progressive', brackets: brackets([[0, 0.06], [12_000, 0.15], [46_000, 0.24], [88_000, 0.35], [150_000, 0.38], [300_000, 0.40]]), standardDeduction: 0, effectiveFrom: YEAR(2023), note: `${APPROX} Amounts are modeled in US dollar equivalents.` },
  { jurisdictionCode: 'MX', label: 'Mexico Income Tax', kind: 'progressive', brackets: brackets([[0, 0.0192], [4_000, 0.064], [34_000, 0.1088], [60_000, 0.16], [120_000, 0.2152], [250_000, 0.30], [400_000, 0.35]]), standardDeduction: 0, effectiveFrom: YEAR(2023), effectiveTo: YEAR(2026), note: `${APPROX} Amounts are modeled in US dollar equivalents.` },
  // SAT's annual tariff for 2026 (Article 152, Anexo 8 of the RMF 2026), in
  // pesos, the first update since 2023; its fixed quotas are the brackets
  // below summed. The employment subsidy, a credit against a wage's ISR up
  // to MXN 11,492.66 a month, isn't kept. Until 2026-09-29 Mexico was taxed
  // on round brackets read in dollars.
  {
    jurisdictionCode: 'MX', label: 'Mexico Income Tax (ISR)', kind: 'progressive', currency: 'MXN', standardDeduction: 0, effectiveFrom: YEAR(2026),
    brackets: [[0, 0.0192], [10_135_12, 0.064], [86_022_12, 0.1088], [151_176_20, 0.16], [175_735_67, 0.1792], [210_403_70, 0.2136], [424_353_98, 0.2352], [668_840_15, 0.30], [1_276_925_99, 0.32], [1_702_567_98, 0.34], [5_107_703_93, 0.35]].map(([from, rate]) => ({ from: from as number, rate: rate as number })),
    note: 'https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/anexos/Anexo-8-RMF-2026_DOF-28122025.pdf',
  },
  { jurisdictionCode: 'AE', label: 'United Arab Emirates (No Personal Income Tax)', kind: 'none', brackets: [], standardDeduction: 0, effectiveFrom: YEAR(1900), note: 'The UAE levies no personal income tax on employment income.' },
  {
    jurisdictionCode: 'IS',
    label: 'Icelandic Income Tax',
    kind: 'progressive',
    brackets: brackets([[0, 0.3175], [41_044, 0.3825], [115_228, 0.4682]]),
    standardDeduction: 18_812_00,
    effectiveFrom: YEAR(2024),
    note: ICELAND_NOTE,
  },
];

export const PAYROLL_TAX_RULES: readonly PayrollTaxRule[] = [
  { jurisdictionCode: 'US', socialRate: 0.062, socialWageBase: 168_600_00, medicalRate: 0.0145, surchargeRate: 0.009, surchargeThreshold: 200_000_00, selfEmployedMultiplier: 2, effectiveFrom: YEAR(2024), effectiveTo: YEAR(2025) },
  // The Social Security wage base, SSA's: $176,100 in 2025 and $184,500 in 2026, held after. Until 2026-09-29 it stopped at 2024's $168,600.
  { jurisdictionCode: 'US', socialRate: 0.062, socialWageBase: 176_100_00, medicalRate: 0.0145, surchargeRate: 0.009, surchargeThreshold: 200_000_00, selfEmployedMultiplier: 2, effectiveFrom: YEAR(2025), effectiveTo: YEAR(2026) },
  { jurisdictionCode: 'US', socialRate: 0.062, socialWageBase: 184_500_00, medicalRate: 0.0145, surchargeRate: 0.009, surchargeThreshold: 200_000_00, selfEmployedMultiplier: 2, effectiveFrom: YEAR(2026) },
  { jurisdictionCode: 'CA', socialRate: 0.0595, socialWageBase: 68_500_00, medicalRate: 0.0166, surchargeRate: 0, surchargeThreshold: 0, selfEmployedMultiplier: 2, effectiveFrom: YEAR(2024), currency: 'CAD' },
  // Class 1 National Insurance: 8% between the primary threshold and the upper
  // earnings limit, 2% above it, both frozen at £12,570 and £50,270 to 2028.
  // Until 2026-09-29 the 8% ran from the first pound and the 2% on all of it.
  { jurisdictionCode: 'GB', socialRate: 0.08, socialFloor: 12_570_00, socialWageBase: 50_270_00, medicalRate: 0, surchargeRate: 0.02, surchargeThreshold: 50_270_00, selfEmployedMultiplier: 0.75, effectiveFrom: YEAR(2024), currency: 'GBP' },
  // Ireland's PRSI, Class A and Class S alike: 4.2% of all income from 1
  // October 2025, 4.35% from 1 October 2026 (Citizens Information). None at
  // €352 a week or less for an employee, nor on €5,000 a year for the
  // self-employed, which SLATE doesn't keep. Until 2026-09-29 Ireland took none.
  { jurisdictionCode: 'IE', socialRate: 0.042, socialWageBase: 0, medicalRate: 0, surchargeRate: 0, surchargeThreshold: 0, selfEmployedMultiplier: 1, effectiveFrom: Date.UTC(2025, 9, 1), effectiveTo: Date.UTC(2026, 9, 1), currency: 'EUR' },
  { jurisdictionCode: 'IE', socialRate: 0.0435, socialWageBase: 0, medicalRate: 0, surchargeRate: 0, surchargeThreshold: 0, selfEmployedMultiplier: 1, effectiveFrom: Date.UTC(2026, 9, 1), currency: 'EUR' },
  // A worker's IMSS contributions in 2026: 2.375% of the registered wage to
  // 25 UMA a day, and 0.40% more on what's over 3 UMA (the Social Security
  // Law, articles 25, 106, 107, 147 and 168; the 0.40% from a secondary
  // source). The UMA is MXN 117.31 a day from 1 February 2026. Until
  // 2026-09-29 Mexico took none.
  { jurisdictionCode: 'MX', socialRate: 0.02375, socialWageBase: 1_070_453_75, medicalRate: 0, surchargeRate: 0.004, surchargeThreshold: 128_454_45, selfEmployedMultiplier: 1, effectiveFrom: YEAR(2026), currency: 'MXN' },
  { jurisdictionCode: 'AU', socialRate: 0, socialWageBase: 0, medicalRate: 0.02, surchargeRate: 0, surchargeThreshold: 0, selfEmployedMultiplier: 1, effectiveFrom: YEAR(2024) },
  { jurisdictionCode: 'NZ', socialRate: 0.0153, socialWageBase: 142_283_00, medicalRate: 0, surchargeRate: 0, surchargeThreshold: 0, selfEmployedMultiplier: 1, effectiveFrom: YEAR(2024), currency: 'NZD' },
  { jurisdictionCode: 'AE', socialRate: 0, socialWageBase: 0, medicalRate: 0, surchargeRate: 0, surchargeThreshold: 0, selfEmployedMultiplier: 1, effectiveFrom: YEAR(1900) },
  // The employee side in Iceland is the mandatory pension contribution, 4% and
  // uncapped. Tryggingagjald at 6.35% is the employer's and is not withheld from
  // a wage, so it does not belong in a figure about what somebody takes home.
  { jurisdictionCode: 'IS', socialRate: 0.04, socialWageBase: 0, medicalRate: 0, surchargeRate: 0, surchargeThreshold: 0, selfEmployedMultiplier: 1, effectiveFrom: YEAR(2024) },
];

export const SALES_TAX_RULES: readonly SalesTaxRule[] = [
  { jurisdictionCode: 'US-CA', rate: 0.0725, exemptCategories: ['groceries', 'prescription'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-CA-losangeles', rate: 0.0975, exemptCategories: ['groceries', 'prescription'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-CA-burbank', rate: 0.1025, exemptCategories: ['groceries', 'prescription'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-CA-santamonica', rate: 0.1025, exemptCategories: ['groceries', 'prescription'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-NY', rate: 0.04, exemptCategories: ['groceries', 'prescription'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-NY-newyork', rate: 0.08875, exemptCategories: ['groceries', 'prescription'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-GA', rate: 0.04, exemptCategories: ['prescription'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-GA-atlanta', rate: 0.089, exemptCategories: ['prescription'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-TX', rate: 0.0625, exemptCategories: ['groceries', 'prescription'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-TX-austin', rate: 0.0825, exemptCategories: ['groceries', 'prescription'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-FL', rate: 0.06, exemptCategories: ['groceries', 'prescription'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-FL-miami', rate: 0.07, exemptCategories: ['groceries', 'prescription'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-NV', rate: 0.0685, exemptCategories: ['groceries', 'prescription'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-WA', rate: 0.065, exemptCategories: ['groceries', 'prescription'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-IL', rate: 0.0625, exemptCategories: ['prescription'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-IL-chicago', rate: 0.1025, exemptCategories: ['prescription'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-OR', rate: 0, exemptCategories: [], effectiveFrom: YEAR(1900) },
  { jurisdictionCode: 'US-CO', rate: 0.029, exemptCategories: ['groceries', 'prescription'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-NM', rate: 0.05125, exemptCategories: ['groceries'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-LA', rate: 0.0445, exemptCategories: ['groceries'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-TN', rate: 0.07, exemptCategories: [], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-MA', rate: 0.0625, exemptCategories: ['groceries', 'clothing'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-AZ', rate: 0.056, exemptCategories: ['groceries'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-HI', rate: 0.04, exemptCategories: [], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-NC', rate: 0.0475, exemptCategories: ['groceries'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-NJ', rate: 0.06625, exemptCategories: ['groceries', 'clothing'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-PA', rate: 0.06, exemptCategories: ['groceries', 'clothing'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-MI', rate: 0.06, exemptCategories: ['groceries'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-OH', rate: 0.0575, exemptCategories: ['groceries'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US', rate: 0.05, exemptCategories: ['groceries', 'prescription'], effectiveFrom: YEAR(1900) },
  { jurisdictionCode: 'CA', rate: 0.05, exemptCategories: ['groceries'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'CA-02', rate: 0.12, exemptCategories: ['groceries'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'CA-08', rate: 0.13, exemptCategories: ['groceries'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'CA-10', rate: 0.14975, exemptCategories: ['groceries'], effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'GB', rate: 0.20, exemptCategories: ['groceries', 'children_clothing'], effectiveFrom: YEAR(2011) },
  { jurisdictionCode: 'IE', rate: 0.23, exemptCategories: ['groceries'], effectiveFrom: YEAR(2021) },
  { jurisdictionCode: 'FR', rate: 0.20, exemptCategories: [], effectiveFrom: YEAR(2014) },
  { jurisdictionCode: 'DE', rate: 0.19, exemptCategories: [], effectiveFrom: YEAR(2007) },
  { jurisdictionCode: 'ES', rate: 0.21, exemptCategories: [], effectiveFrom: YEAR(2012) },
  { jurisdictionCode: 'IT', rate: 0.22, exemptCategories: [], effectiveFrom: YEAR(2013) },
  { jurisdictionCode: 'AU', rate: 0.10, exemptCategories: ['groceries'], effectiveFrom: YEAR(2000) },
  { jurisdictionCode: 'NZ', rate: 0.15, exemptCategories: [], effectiveFrom: YEAR(2010) },
  { jurisdictionCode: 'JP', rate: 0.10, exemptCategories: [], effectiveFrom: YEAR(2019) },
  { jurisdictionCode: 'KR', rate: 0.10, exemptCategories: [], effectiveFrom: YEAR(2000) },
  { jurisdictionCode: 'MX', rate: 0.16, exemptCategories: ['groceries'], effectiveFrom: YEAR(2014) },
  { jurisdictionCode: 'AE', rate: 0.05, exemptCategories: [], effectiveFrom: YEAR(2018) },
  // VSK. It was taken from the company side's `VAT_RATE` rather than typed
  // twice; that side is gone, so the rate lives here now, where the only thing
  // that reads a tax table is.
  { jurisdictionCode: 'IS', rate: 0.24, exemptCategories: [], effectiveFrom: YEAR(2024) },
];

export const PROPERTY_TAX_RULES: readonly PropertyTaxRule[] = [
  { jurisdictionCode: 'US-CA', rate: 0.0075, assessmentGrowthCap: 0.02, effectiveFrom: YEAR(1978) },
  { jurisdictionCode: 'US-NY', rate: 0.0165, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-GA', rate: 0.0092, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-TX', rate: 0.0181, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-FL', rate: 0.0089, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-IL', rate: 0.0227, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-NV', rate: 0.0059, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-WA', rate: 0.0094, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-CO', rate: 0.0052, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-OR', rate: 0.0098, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-NM', rate: 0.0078, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-LA', rate: 0.0056, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-NC', rate: 0.0082, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-TN', rate: 0.0067, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-MA', rate: 0.0123, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-AZ', rate: 0.0066, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-HI', rate: 0.0029, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-NJ', rate: 0.0247, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US-PA', rate: 0.0158, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'US', rate: 0.011, effectiveFrom: YEAR(1900) },
  { jurisdictionCode: 'CA', rate: 0.0085, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'GB', rate: 0.0045, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'AU', rate: 0.0035, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'NZ', rate: 0.0032, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'FR', rate: 0.0110, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'DE', rate: 0.0035, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'ES', rate: 0.0070, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'IT', rate: 0.0086, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'JP', rate: 0.0140, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'KR', rate: 0.0025, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'MX', rate: 0.0010, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'AE', rate: 0.0000, effectiveFrom: YEAR(2018) },
  { jurisdictionCode: 'IE', rate: 0.0018, effectiveFrom: YEAR(2018) },
  // Fasteignaskattur, A-flokkur: the residential band, which law caps at 0.5%
  // and Mosfellsbær sets near the middle of.
  { jurisdictionCode: 'IS', rate: 0.0028, effectiveFrom: YEAR(2024) },
];

// --- Resolution -------------------------------------------------------------

function effective<T extends { jurisdictionCode: string; effectiveFrom: number; effectiveTo?: number }>(
  rules: readonly T[], code: string, at: number,
): T | undefined {
  let best: T | undefined;
  for (const rule of rules) {
    if (rule.jurisdictionCode !== code) continue;
    if (rule.effectiveFrom > at) continue;
    if (rule.effectiveTo !== undefined && rule.effectiveTo <= at) continue;
    if (!best || rule.effectiveFrom > best.effectiveFrom) best = rule;
  }
  return best;
}

/**
 * Walks the jurisdiction path from most specific to least, returning the first
 * rule that applies. A Los Angeles sales-tax rate beats the California rate,
 * which beats the federal fallback.
 */
export function resolveRule<T extends { jurisdictionCode: string; effectiveFrom: number; effectiveTo?: number }>(
  rules: readonly T[], cityId: string, at: number,
): T | undefined {
  const path = jurisdictionPath(cityId);
  for (let i = path.length - 1; i >= 0; i--) {
    const found = effective(rules, path[i] as string, at);
    if (found) return found;
  }
  return undefined;
}

/** Every income-tax rule that applies at a location: federal plus regional. */
export function resolveIncomeTaxLayers(cityId: string, at: number): IncomeTaxRule[] {
  const path = jurisdictionPath(cityId);
  const layers: IncomeTaxRule[] = [];
  for (const code of path) {
    const rule = effective(INCOME_TAX_RULES, code, at);
    if (rule) layers.push(rule);
  }
  return layers;
}

export function applyBrackets(taxableIncome: Money, rule: IncomeTaxRule): Money {
  if (rule.kind === 'none') return 0;
  if (rule.kind === 'flat') return applyRate(Math.max(0, taxableIncome), rule.flatRate ?? 0);
  let tax = 0;
  const sorted = [...rule.brackets].sort((a, b) => a.from - b.from);
  for (let i = 0; i < sorted.length; i++) {
    const bracket = sorted[i] as TaxBracket;
    const upper = (sorted[i + 1]?.from ?? Number.POSITIVE_INFINITY);
    if (taxableIncome <= bracket.from) break;
    const slice = Math.min(taxableIncome, upper) - bracket.from;
    if (slice > 0) tax += applyRate(slice, bracket.rate);
  }
  return tax;
}

export interface TaxComputation {
  gross: Money;
  federal: Money;
  regional: Money;
  local: Money;
  payroll: Money;
  total: Money;
  net: Money;
  effectiveRate: number;
  /** Line-by-line explanation for the audit panel. */
  lines: { label: string; amount: Money; note: string }[];
}

/** Annual tax on employment income at a location. */
export function computeAnnualTax(
  income: Money, cityId: string, at: number,
  opts: { selfEmployed?: boolean; deductions?: Money; currency?: string; relief?: { deductions?: Money; credit?: Money } } = {},
): TaxComputation {
  // Each rule is written in its own money (`currency`, dollars where not
  // said): an amount is taxed on what it comes to in the rule's money, and the
  // tax said in the amount's own. Until 2026-09-27 a save kept in krónur was
  // taxed as if every króna were a dollar; until 2026-09-29 every rule was read
  // in dollars, and a Londoner's pound was taxed on bands of £12,570 read as
  // $12,570.
  const cur = opts.currency ?? 'USD';
  const inRule = (x: Money, rc: string) => (rc === cur ? x : exchange(x, cur, rc) ?? x);
  const outOf = (x: Money, rc: string) => (rc === cur ? x : exchange(x, rc, cur) ?? x);
  const money = (x: Money, rc: string) => (x / 100).toLocaleString('en-US', { style: 'currency', currency: rc, maximumFractionDigits: 0 });
  const gross = income;
  const layers = resolveIncomeTaxLayers(cityId, at);
  const lines: TaxComputation['lines'] = [];
  let federal = 0;
  let regional = 0;
  let local = 0;

  for (const rule of layers) {
    const rc = rule.currency ?? 'USD';
    // A married person's relief (`systems/marriage.ts`, from 2026-10-01): a deduction from the national tax's income, a credit off it.
    const depth0 = jurisdictionPath(cityId).indexOf(rule.jurisdictionCode) === 0;
    const reliefDeduction = depth0 ? inRule(opts.relief?.deductions ?? 0, rc) : 0;
    const taxable = Math.max(0, inRule(gross, rc) - rule.standardDeduction - inRule(opts.deductions ?? 0, rc) - reliefDeduction);
    const levy = rule.levy && inRule(gross, rc) > rule.levy.exemptUpTo ? outOf(applyBrackets(inRule(gross, rc), { ...rule, kind: 'progressive', brackets: rule.levy.brackets }), rc) : 0;
    const amount = Math.max(0, outOf(Math.max(0, applyBrackets(taxable, rule) - (rule.credit ?? 0)), rc) - (depth0 ? opts.relief?.credit ?? 0 : 0)) + levy;
    if (amount === 0 && rule.kind === 'none') {
      lines.push({ label: rule.label, amount: 0, note: rule.note });
      continue;
    }
    lines.push({
      label: rule.label,
      amount,
      note: (rule.kind === 'flat'
        ? `Flat ${((rule.flatRate ?? 0) * 100).toFixed(2)}% on ${money(taxable, rc)} after deductions.`
        : `Progressive brackets on ${money(taxable, rc)} after deductions.`)
        + (rule.credit ? ` Less ${money(rule.credit, rc)} of credits.` : '')
        + (rule.levy ? ` With the ${rule.levy.label}, ${money(levy, cur)}.` : ''),
    });
    const depth = jurisdictionPath(cityId).indexOf(rule.jurisdictionCode);
    if (depth === 0) federal += amount;
    else if (depth === 1) regional += amount;
    else local += amount;
  }

  const payrollRule = resolveRule(PAYROLL_TAX_RULES, cityId, at);
  let payroll = 0;
  if (payrollRule) {
    const multiplier = opts.selfEmployed ? payrollRule.selfEmployedMultiplier : 1;
    const rc = payrollRule.currency ?? 'USD';
    const g = inRule(gross, rc);
    const socialBase = Math.max(0, (payrollRule.socialWageBase > 0 ? Math.min(g, payrollRule.socialWageBase) : g) - (payrollRule.socialFloor ?? 0));
    const social = applyRate(socialBase, payrollRule.socialRate * multiplier);
    const medical = applyRate(g, payrollRule.medicalRate * multiplier);
    const surcharge = g > payrollRule.surchargeThreshold && payrollRule.surchargeThreshold > 0
      ? applyRate(g - payrollRule.surchargeThreshold, payrollRule.surchargeRate)
      : 0;
    payroll = outOf(social + medical + surcharge, rc);
    if (payroll > 0) {
      lines.push({
        label: opts.selfEmployed ? 'Payroll tax (self-employed, both halves)' : 'Payroll tax',
        amount: payroll,
        note: `Social insurance and medical levies${payrollRule.socialWageBase > 0 ? `, social capped at a ${money(payrollRule.socialWageBase, rc)} wage base` : ''}.`,
      });
    }
  }

  const total = federal + regional + local + payroll;
  return {
    gross, federal, regional, local, payroll, total,
    net: gross - total,
    effectiveRate: gross > 0 ? total / gross : 0,
    lines,
  };
}

/**
 * Who collects a city's income tax, and what it asks of those who only work there (from the remaining-gaps pass of
 * 2026-10-11; research-local-income-taxes.json, research-state-tax-in-dc-ok.json). New York City's and Marion County's
 * are filed on the state's return and collected by the state; Philadelphia's, Columbus's and Portland's are each the
 * city's own, an authority apart. A nonresident owes Philadelphia's lower rate, Columbus's 2.5% and Marion County's
 * 2.02% on wages earned there; New York City taxes no nonresident; Portland's start over a threshold no wage of SLATE's
 * reaches. Columbus credits its residents in full, to 2.5%, for a work city's tax on the same wages. Denver's
 * Occupational Privilege Tax is $5.75 a month withheld by the employer where a month's Denver earnings reach $500, filed
 * by nobody (`DENVER_OPT`).
 */
export const LOCAL_TAX: Readonly<Record<string, { collector: 'state' | 'city'; nonresident?: Readonly<Record<number, number>>; creditUpTo?: number }>> = {
  'us-ny-newyork': { collector: 'state' }, 'us-ny-brooklyn': { collector: 'state' }, 'us-ny-queens': { collector: 'state' }, 'us-ny-manhattan': { collector: 'state' }, 'us-ny-thebronx': { collector: 'state' },
  'us-in-indianapolis': { collector: 'state', nonresident: { 2025: 0.0202, 2026: 0.0202 } },
  'us-pa-philadelphia': { collector: 'city', nonresident: { 2025: (0.0344 + 0.0343) / 2, 2026: (0.0343 + 0.03425) / 2, 2027: (0.03425 + 0.0342) / 2 } },
  'us-oh-columbus': { collector: 'city', nonresident: { 2025: 0.025 }, creditUpTo: 0.025 },
  'us-or-portland': { collector: 'city' },
};

/**
 * The US cities in SLATE's tables with no local income tax on a resident's wages, each confirmed
 * (research-local-income-taxes.json, 2026-10-11): California's barred by R&TC 17041.5 (San Francisco's business taxes
 * fall on employers), Seattle's by RCW 36.65.030, Tennessee's, Nevada's, Florida's and Illinois's by their constitutions,
 * Phoenix's since 1972, Hudson's outside New York City and Yonkers, the District's own tax its only layer, and the rest by
 * the Tax Foundation's list (a secondary source). With `LOCAL_TAX` and Denver's, every US city in the tables is
 * accounted for (`tests/tax-coverage.test.ts`).
 */
export const NO_LOCAL_TAX: readonly string[] = [
  'us-ca-losangeles', 'us-ca-burbank', 'us-ca-santamonica', 'us-ca-sanfrancisco', 'us-ca-sandiego', 'us-ca-sanjose', 'us-ca-bakersfield',
  'us-ga-atlanta', 'us-tx-austin', 'us-tx-dallas', 'us-tx-houston', 'us-tx-sanantonio', 'us-tx-fortworth', 'us-tx-elpaso',
  'us-fl-miami', 'us-fl-jacksonville', 'us-il-chicago', 'us-nv-lasvegas', 'us-wa-seattle', 'us-nm-santafe', 'us-la-neworleans',
  'us-nc-wilmington', 'us-nc-charlotte', 'us-tn-nashville', 'us-ma-boston', 'us-az-phoenix', 'us-hi-honolulu',
  'us-ct-newhaven', 'us-ct-litchfield', 'us-ny-hudson', 'us-dc-washington', 'us-ok-oklahomacity',
];

/** A local rate for a year: its own, or the latest before it, held (SLATE's assumption where a later year isn't published). */
export function localRate(byYear: Readonly<Record<number, number>> | undefined, year: number): number {
  if (!byYear) return 0;
  const years = Object.keys(byYear).map(Number).filter((y) => y <= year).sort((a, b) => b - a);
  return years.length ? byYear[years[0]!]! : 0;
}

/** Denver's Occupational Privilege Tax on an employee: $5.75 for each month their Denver earnings reach $500. */
export const DENVER_OPT = { cityId: 'us-co-denver', monthly: 5_75, threshold: 500_00, source: 'Denver Treasury, Occupational Privilege Tax' } as const;

export function salesTaxRate(cityId: string, at: number, category: string): number {
  const rule = resolveRule(SALES_TAX_RULES, cityId, at);
  if (!rule) return 0;
  if (rule.exemptCategories.includes(category)) return 0;
  return rule.rate;
}

/**
 * A single filer’s US federal standard deduction for the tax year an instant falls in, wherever the filer lives: the
 * filing threshold and a nonresident’s 1040-NR read it (`systems/taxreturn.ts`). From 2026-10-14, when the table
 * gained 2025’s and 2026’s rules; until then those readers took the one rule there was, 2024’s, for every year.
 */
export function usStandardDeduction(at: number): Money {
  return effective(INCOME_TAX_RULES, 'US', at)?.standardDeduction ?? 0;
}

/** The federal standard deduction where a town is, from the federal layer of its rules. */
export function federalStandardDeduction(cityId: string, at: number): Money {
  const path = jurisdictionPath(cityId);
  return resolveIncomeTaxLayers(cityId, at).find((rule) => path.indexOf(rule.jurisdictionCode) === 0)?.standardDeduction ?? 0;
}

export function propertyTaxRate(cityId: string, at: number): number {
  return resolveRule(PROPERTY_TAX_RULES, cityId, at)?.rate ?? 0.011;
}


/** Cost-of-living multiplier relative to the national baseline. */
