// A dated cash forecast (the owner's v8 package, 03 "Liquidity and readiness"; A06, A07; from November 14, 2026), ported
// from the package's reference (reference/money_reference.py cash_forecast) into the game's own types.
//
// It starts from what can be spent now: settled cash less what is held. Each remaining outflow is subtracted once, on
// its date. An obligation already held is skipped, because its hold has already come off the opening figure. An inflow
// counts only if it is secured; an expected receipt belongs to another scenario, never to guaranteed liquidity. On a day
// with both, money out goes first, so a deposit due the day a payment arrives is still short. The answer is the first day
// short and the most more that would be needed. "Funded overall" and "can pay on time" are different questions, and
// both are answered here.
export interface CashEvent {
  id: string;
  /** YYYY-MM-DD. */
  date: string;
  kind: 'in' | 'out';
  /** Minor units, never negative. */
  minor: number;
  /** An inflow that is contracted and will arrive on its date. Unsecured inflows don't count here. */
  secured?: boolean;
  /** An outflow whose money is already held: the opening figure has it off already. */
  alreadyHeld?: boolean;
  label?: string;
}
export interface Forecast {
  /** The first day the balance would go below nothing, or null. */
  firstDeficit: string | null;
  /** The most more money needed, at the worst point. */
  additionalRequired: number;
  endingBalance: number;
  /** Funded overall: secured money in covers every remaining outflow, whatever the dates. */
  fundedOverall: boolean;
  rows: { id: string; date: string; balance: number; label?: string }[];
}

export function cashForecast(openingAvailable: number, events: CashEvent[]): Forecast {
  let balance = openingAvailable;
  let worst = Math.min(0, balance);
  let first: string | null = balance < 0 ? 'now' : null;
  const seen = new Set<string>();
  const rows: Forecast['rows'] = [];
  let totalIn = 0, totalOut = 0;
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date) || (a.kind === 'out' ? 0 : 1) - (b.kind === 'out' ? 0 : 1) || a.id.localeCompare(b.id));
  for (const e of sorted) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) throw new Error(`A cash event needs a date: ${e.id}.`);
    if (seen.has(e.id)) throw new Error(`A cash event is listed twice: ${e.id}.`);
    seen.add(e.id);
    if (!Number.isSafeInteger(e.minor) || e.minor < 0) throw new Error(`A cash event needs a whole, non-negative amount: ${e.id}.`);
    if (e.alreadyHeld || (e.kind === 'in' && !e.secured)) continue;
    if (e.kind === 'in') totalIn += e.minor; else totalOut += e.minor;
    balance += e.kind === 'in' ? e.minor : -e.minor;
    if (balance < 0 && first === null) first = e.date;
    worst = Math.min(worst, balance);
    rows.push({ id: e.id, date: e.date, balance, label: e.label });
  }
  // Math.max(0, -worst): never -0 when nothing is short.
  return { firstDeficit: first, additionalRequired: Math.max(0, -worst), endingBalance: balance, fundedOverall: openingAvailable + totalIn >= totalOut, rows };
}
