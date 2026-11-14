/**
 * SLATE — a card's instalment plan where the bank charges interest on it, or
 * a flat fee by its length, rather than a monthly fee on the whole.
 *
 * Until 2026-09-28 these weren't offered: SLATE's plan was only the monthly
 * fee Chase's, Bank of America's and the Japanese banks' charge. From the
 * banks' own pages: Bank of Ireland's instalment plan, 6.7% variable over 6,
 * 12 or 24 equal months, on €250 or more; Scotia SelectPay, 5.99% over three
 * months, 6.99% over six and 7.99% over twelve, on $100 or more; CaixaBank's
 * pago aplazado at its 20.40% TIN; and BBVA's fraccionar, a single fee of the
 * amount by the months, nothing over three and 6% over six (read from its
 * page's listing; the page refused a direct read). Santander Spain's Pago
 * Fácil rate isn't on its page.
 */

import type { Money } from '../core/money';

export interface InterestPlan {
  /** The months it may run, each with its yearly rate, or its fee on the whole where the bank charges one instead. */
  months: Readonly<Record<number, { apr?: number; fee?: number }>>;
  /** The least that can go into one, in the bank's money. */
  min?: Money;
  source: string;
}

export const INTEREST_PLANS: Readonly<Record<string, InterestPlan>> = {
  'ie-bank-of-ireland': { months: { 6: { apr: 0.067 }, 12: { apr: 0.067 }, 24: { apr: 0.067 } }, min: 250_00, source: 'https://personalbanking.bankofireland.com/borrow/credit-cards/instalment-plan/' },
  'ca-scotiabank': { months: { 3: { apr: 0.0599 }, 6: { apr: 0.0699 }, 12: { apr: 0.0799 } }, min: 100_00, source: 'https://www.scotiabank.com/ca/en/personal/credit-cards/selectpay.html' },
  'es-caixabank': { months: { 3: { apr: 0.204 }, 6: { apr: 0.204 }, 12: { apr: 0.204 } }, source: 'https://www.caixabank.es/particular/tarjetas/facilidades-credito.html (pago aplazado, TIN 20.40%)' },
  'es-bbva': { months: { 3: { fee: 0 }, 4: { fee: 0.043 }, 5: { fee: 0.052 }, 6: { fee: 0.06 } }, min: 50_00, source: 'https://www.bbva.es/personas/productos/tarjetas/financiacion-global.html (fraccionar: 0%, 4.30%, 5.20% or 6% of the amount over 3 to 6 months)' },
};

/** A plan's equal monthly payment at a yearly rate over some months: the annuity. */
export function planPayment(amount: Money, apr: number, months: number): Money {
  if (apr <= 0) return Math.ceil(amount / months);
  const r = apr / 12;
  return Math.ceil(amount * r / (1 - (1 + r) ** -months));
}
