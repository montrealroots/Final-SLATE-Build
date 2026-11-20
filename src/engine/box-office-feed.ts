// A licensed box-office history, read as it was known on each day (the owner's research recovery package of November 19,
// 2026, docs/05-BOX-OFFICE.md, "Adapter contract"). No such dataset is held: the providers that sell one (The Numbers /
// OpusData, Comscore) need a licence the owner hasn't taken, and the BFI's public weekend sheets are one territory's
// weekends with reuse terms not yet confirmed. So FEED says none is installed, and the game's own box office
// (box-office.ts) stays its simulation, labelled so. This is the contract a licensed dataset would come in through,
// tested on a fixture that is synthetic and named so (tests/fixtures/box-office-synthetic.json): the software works; no
// real coverage is claimed.
//
// What the contract holds to:
// - A report is shown from its publication, never before: on a date, a query sees only what was published by then.
// - A correction is a later revision of the same report, published on its own date; the earlier stays readable before it.
// - Importing the same revision twice adds nothing; a revision that changes a held one, or supersedes one not held, is
//   refused.
// - Daily, weekend, weekly and cumulative figures are never added together: a total is either the latest cumulative
//   figure or a sum of one period type, said which.
// - A territory's currency is checked against the territory, and a mismatch is refused, not converted or guessed.
// - Each report keeps its dataset's release, so a save can say which edition of the data it read.

export type Period = 'day' | 'weekend' | 'week' | 'cumulative';
export interface BoxOfficeReport {
  provider: string;
  /** The provider's own title, territory and release keys. */
  title: string;
  territory: string;
  period: Period;
  /** The period's first and last day (a cumulative figure: release to `to`). */
  from: string;
  to: string;
  /** In the territory's currency, minor units. */
  amountMinor: number;
  currency: string;
  /** When the provider published this figure (YYYY-MM-DD), and its revision of the same report. */
  published: string;
  revision: number;
  sourceRef: string;
  licenceRef: string;
  retrieved: string;
  /** The dataset release this came in, so a save can say which edition it read. */
  release: string;
}

/** The territories a dataset may report, and the currency each reports in. Anything else is refused. */
export const TERRITORY_CURRENCY: Record<string, string> = { US: 'USD', CA: 'USD', GB: 'GBP', IE: 'EUR', FR: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', JP: 'JPY', KR: 'KRW', AU: 'AUD', IN: 'INR', CN: 'CNY', MX: 'MXN', BR: 'BRL' };

/** What is installed. A licensed dataset would set this from its own manifest; none is installed. */
export const FEED: { installed: false; why: string } | { installed: true; provider: string; release: string; licence: string } = {
  installed: false,
  why: 'No licensed box-office history is installed. The providers that sell one need a licence, and none has been agreed. The figures in the game are its own simulation.',
};

export const reportKey = (r: Pick<BoxOfficeReport, 'provider' | 'title' | 'territory' | 'period' | 'from' | 'to'>) => `${r.provider}|${r.title}|${r.territory}|${r.period}|${r.from}|${r.to}`;

export interface Store { reports: BoxOfficeReport[] }

/** Adds reports to the store: each checked, a repeat skipped. Returns what was added and what was refused, with why. */
export function ingest(store: Store, incoming: BoxOfficeReport[]): { added: number; skipped: number; refused: { report: BoxOfficeReport; why: string }[] } {
  const refused: { report: BoxOfficeReport; why: string }[] = [];
  let added = 0;
  let skipped = 0;
  for (const r of incoming) {
    const want = TERRITORY_CURRENCY[r.territory];
    if (!want) { refused.push({ report: r, why: `Territory ${r.territory} isn't one the contract defines.` }); continue; }
    if (r.currency !== want) { refused.push({ report: r, why: `${r.territory} reports in ${want}, not ${r.currency}; nothing is converted.` }); continue; }
    if (!Number.isInteger(r.amountMinor) || r.amountMinor < 0) { refused.push({ report: r, why: 'An amount must be a whole number of minor units, not negative.' }); continue; }
    if (r.from > r.to || r.published < r.to) { refused.push({ report: r, why: 'A figure is published after its period, which runs forward.' }); continue; }
    const key = reportKey(r);
    const same = store.reports.find((x) => reportKey(x) === key && x.revision === r.revision);
    if (same) {
      if (JSON.stringify(same) === JSON.stringify(r)) { skipped++; continue; }
      refused.push({ report: r, why: `Revision ${r.revision} of this report is held with different figures; a correction is a new revision.` });
      continue;
    }
    if (r.revision > 1 && !store.reports.some((x) => reportKey(x) === key && x.revision === r.revision - 1)) { refused.push({ report: r, why: `It corrects revision ${r.revision - 1}, which isn't held.` }); continue; }
    store.reports.push(r);
    added++;
  }
  return { added, skipped, refused };
}

/** Each report as it stood on `today`: published by then, at its latest revision published by then. */
export function asOf(store: Store, today: string, keep: (r: BoxOfficeReport) => boolean = () => true): BoxOfficeReport[] {
  const latest = new Map<string, BoxOfficeReport>();
  for (const r of store.reports) {
    if (r.published > today || !keep(r)) continue;
    const k = reportKey(r);
    const had = latest.get(k);
    if (!had || r.revision > had.revision) latest.set(k, r);
  }
  return [...latest.values()].sort((a, b) => a.from.localeCompare(b.from) || a.period.localeCompare(b.period));
}

/**
 * A title's total in one territory as known on `today`: the latest cumulative figure where one is published, said so;
 * otherwise the sum of one period type that doesn't overlap (days, else weeks, else weekends), said which. Never a mix.
 */
export function totalAsOf(store: Store, today: string, title: string, territory: string): { amountMinor: number; currency: string; from: Period | 'none'; through: string | null } {
  const mine = asOf(store, today, (r) => r.title === title && r.territory === territory);
  const currency = TERRITORY_CURRENCY[territory];
  const cum = mine.filter((r) => r.period === 'cumulative').sort((a, b) => b.to.localeCompare(a.to))[0];
  if (cum) return { amountMinor: cum.amountMinor, currency, from: 'cumulative', through: cum.to };
  for (const period of ['day', 'week', 'weekend'] as const) {
    const xs = mine.filter((r) => r.period === period);
    if (xs.length) return { amountMinor: xs.reduce((a, r) => a + r.amountMinor, 0), currency, from: period, through: xs.map((r) => r.to).sort().at(-1)! };
  }
  return { amountMinor: 0, currency, from: 'none', through: null };
}
