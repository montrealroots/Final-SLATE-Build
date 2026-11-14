/**
 * SLATE — a current account's monthly fee and how its bank waives it, in the bank's own conditions (from 2026-10-16: moved
 * here from `ui/workspaces/BankWorkspace.tsx`, which says it for an account held, so the opening panel,
 * `ui/bank/BankMoves.tsx`, says it before Apply). The figures are the product's, the ones `feeFor`
 * (`systems/banking.ts`) charges by.
 */
import type { Product } from '../../../../engine/bankworld/content/banks';

/**
 * How a fee is waived, the way the bank puts its conditions, each one an "or", and what lowers it. From 2026-10-17 each
 * condition is something the player does in a month ("in any month you keep $1,500 in it all month") or a time it holds
 * ("while you’re under 24"), where it had said "waived with keeping $1,500 in it all month, or being under 24".
 */
export function waiverWords(product: Product, money: (cents: number) => string): string {
  const waiver = product.waiver;
  // As the bank counts them: any electronic deposit where it does, and until 2026-09-27 this said wages for every bank.
  const paidIn = product.deposits === 'electronic' ? 'of electronic deposits (wages, benefits or a tax refund) paid in' : 'of wages paid in';
  const either = (month: string[], age: string[]): string => [month.length ? `in any month you ${month.join(', or ')}` : '', ...age].filter(Boolean).join(', or ');
  const cut = product.reduced;
  const lower = !cut ? '' : `; it’s ${money(cut.to)} ${either([
    ...(cut.depositsAtLeast !== undefined ? [`have ${money(cut.depositsAtLeast)} ${paidIn}`] : []),
    ...(cut.averageAtLeast !== undefined ? [`keep an average of ${money(cut.averageAtLeast)} in it over the month`] : []),
  ], cut.ageBelow !== undefined ? [`while you’re under ${cut.ageBelow}`] : [])}`;
  if (!waiver) return lower;
  // Deutsche Bank's month of opening, free (from 2026-10-16, `Product.waiver.openingMonth`).
  const free = [
    ...(waiver.openingMonth ? [', free in the month it opens'] : []),
    ...(waiver.firstMonths !== undefined ? [`, free for the first ${waiver.firstMonths} months after it opens`] : []),
  ].join('');
  const month: string[] = [];
  if (waiver.depositsAtLeast !== undefined) {
    const also = waiver.depositsAlso;
    const extra = !also ? '' : also.either !== undefined
      ? ` and have made ${also.either} bill or card payments in the last ${also.months} months`
      : ` and have made ${[also.bills !== undefined ? `${also.bills} bill payments` : '', also.purchases !== undefined ? `${also.purchases} card payments` : ''].filter(Boolean).join(' or ')} in the last ${also.months} months`;
    month.push(`have ${money(waiver.depositsAtLeast)} ${paidIn}${extra}`);
  }
  if (waiver.balanceAtLeast !== undefined) month.push(`keep ${money(waiver.balanceAtLeast)} in it all month`);
  if (waiver.averageAtLeast !== undefined) month.push(`keep an average of ${money(waiver.averageAtLeast)} in it over the month`);
  if (waiver.linkedAverageAtLeast !== undefined) month.push(`keep an average of ${money(waiver.linkedAverageAtLeast)} across your accounts at the bank`);
  if (waiver.purchasesAtLeast !== undefined) month.push(`make ${waiver.purchasesAtLeast} card payments`);
  const age = [
    ...(waiver.ageBelow !== undefined ? [`while you’re under ${waiver.ageBelow}`] : []),
    ...(waiver.ageAtLeast !== undefined ? [`once you’re ${waiver.ageAtLeast} or over`] : []),
  ];
  if (month.length === 0 && age.length === 0) return `${free}${lower}`;
  return `${free}, waived ${either(month, age)}${lower}`;
}

/** The suffix of an ordinal day, "st" for the 1st: for a day of the month written as a figure. */
export function nth(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return 'th';
  return n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';
}
