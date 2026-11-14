/**
 * SLATE — the minimum a revolving course asks, where a bank sets it by a
 * table rather than a share.
 *
 * Japan's cards are paid in full by default, and revolving (リボ払い) is a
 * course the holder takes: its monthly payment is set by the balance, not a
 * share of it. MUFG's 一般 course asks ¥5,000 up to ¥100,000 owed and ¥5,000
 * more for each ¥100,000 after, interest inside it (残高スライド元利定額;
 * cr.mufg.jp). SMBC's マイ・ペイすリボ asks a fixed ¥5,000 of principal with
 * the month's interest on top (元金定額; smbc-card.com). Korea's 리볼빙 asks
 * a share of the balance the bank sets by the holder's credit grade, 10% to
 * 30% at Shinhan (shinhancard.com) and KB Kookmin; where SLATE's record falls
 * among the grades is its estimate. Until 2026-09-28 each of these asked a
 * typical American card's minimum, and said so.
 */

import type { Money } from '../core/money';

export interface RevolvingCourse {
  /** A fixed payment, and a step of the balance each adds another of it; none, and it's fixed whatever is owed. */
  pay?: Money;
  every?: Money;
  /** The month's interest on top of the payment, where it's principal only. */
  plusInterest?: boolean;
  /** Korea's: a share of the balance by the record, the best first: at or over each score, its share. */
  shareByScore?: readonly (readonly [number, number])[];
  source: string;
}

export const REVOLVING_COURSE: Readonly<Record<string, RevolvingCourse>> = {
  'jp-mufg': { pay: 5_000_00, every: 100_000_00, source: 'https://www.cr.mufg.jp/mufgcard/service/payment/revo/index.html (残高スライド 一般 course: ¥5,000 to ¥100,000, then ¥5,000 more each ¥100,000)' },
  'jp-smbc': { pay: 5_000_00, plusInterest: true, source: 'https://www.smbc-card.com/mem/revo/mypace.jsp (マイ・ペイすリボ: ¥5,000 of principal at least, interest on top)' },
  'kr-shinhan': { shareByScore: [[740, 0.1], [670, 0.2], [0, 0.3]], source: 'https://www.shinhancard.com/pconts/html/finance/revolving/CONFM60030/CONFM60030R01.html (a 10% to 30% minimum by credit grade; which grade a credit record in the game falls in is the game’s estimate)' },
  'kr-kb-kookmin': { shareByScore: [[740, 0.1], [670, 0.2], [0, 0.3]], source: 'https://card.kbcard.com/CXPRIFIC0009.cms (a minimum ratio by grade, raised after a delinquency; its range is the game’s estimate, Shinhan’s 10% to 30%)' },
};

/** What a course asks of a balance, before any interest on top: its fixed payment by the balance's steps, or its share by the record. */
export function coursePayment(course: RevolvingCourse, balance: Money, score: number, inSave: (bankMoney: Money) => Money): Money {
  if (course.shareByScore) return Math.round(balance * (course.shareByScore.find(([at]) => score >= at)?.[1] ?? 0.3));
  const pay = inSave(course.pay ?? 0);
  if (!course.every) return pay;
  return pay * Math.max(1, Math.ceil(balance / inSave(course.every)));
}
