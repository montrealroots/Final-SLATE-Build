// Your own money and your family's support (engine/personal.ts; the v4 package, 02; ledger V4-016 and V4-017).
import { describe, expect, it } from 'vitest';
import { DAY, processUntil } from './engine-api';
import { CIRCUMSTANCES, LOAN_MONTHS, SAVINGS_MOST, familyTerms, loanStanding, openingPreview, personalBalance, personalStatement, personalPostings, postPersonal, putInOwnMoney, putInRefusal, takeHome, takeHomeAvailable } from '../src/engine/personal';
import { financeSummary, setFinanceTarget } from '../src/engine/finance';
import { ledgerTotals } from '../src/engine/budget';
import { deserialize, serialize } from '../src/engine/save';
import { newGame, validateDraft } from '../src/engine/state';
import type { CreationDraft, GameState, Project } from '../src/engine/types';
import { draft } from './fixtures';
import { approve, buildProject } from './helpers';

const life = (over: Partial<CreationDraft>, tag = 'money') => newGame({ ...draft(), ...over }, 0, `save-${tag}`);
const short = (s: GameState): Project => {
  const p = buildProject(s, { title: 'Harbour Lights', format: 'short', medium: 'live-action', runtime: 12, scenario: 'low' }, [{ name: 'Mara', patch: { roleSize: 'lead' } }], [{ place: 'Pier', chars: ['Mara'], minutes: 4 }]);
  approve(s, p);
  setFinanceTarget(p, financeSummary(p).promised + 50_000); // labelled fixture: $50,000 still to raise
  return p;
};

describe('what your family can offer', () => {
  it('is bounded by their circumstances, and decides nothing else', () => {
    expect(familyTerms('stretched', 'gift', 100)).toBe('A family with nothing to spare can offer nothing.');
    expect(familyTerms('getting-by', 'gift', CIRCUMSTANCES['getting-by'].most + 1)).toBe('A getting by family could offer at most $3,000.');
    expect(familyTerms('comfortable', 'loan', 12_000)).toEqual({ circumstances: 'comfortable', support: 'loan', amount: 12_000, months: LOAN_MONTHS, monthly: 500 });
    expect(familyTerms('wealthy', 'investment', 40_000)).toMatchObject({ share: 0.25, cap: 60_000 });
    // The same character, whatever the family: their circumstances change only the money.
    const poor = life({ family: { circumstances: 'stretched', support: 'none', amount: 0 } }, 'poor');
    const rich = life({ family: { circumstances: 'wealthy', support: 'gift', amount: 100_000 } }, 'poor');
    expect(rich.character).toEqual(poor.character);
    expect(personalBalance(rich) - personalBalance(poor)).toBe(100_000);
  });

  it('is read on Review before the story starts: each line, the balance, and what will be owed', () => {
    const pre = openingPreview(2_000, familyTerms('comfortable', 'loan', 12_000) as never);
    expect(pre.lines).toEqual([{ label: 'Your Savings', amount: 2_000 }, { label: 'From Your Family: A Loan', amount: 12_000 }]);
    expect(pre.balance).toBe(14_000);
    expect(pre.owe[0]).toBe('You repay your family $500 a month for 24 months, $12,000 in all, from your own account. A month you can\'t pay is owed on.');
    expect(validateDraft({ ...draft(), savings: SAVINGS_MOST + 1 }).map((x) => x.field)).toContain('savings');
    expect(validateDraft({ ...draft(), family: { circumstances: 'stretched', support: 'gift', amount: 5 } }).map((x) => x.message)).toContain('A family with nothing to spare can offer nothing.');
  });
});

describe('your account', () => {
  it('opens with what was chosen, and a loan is repaid month by month; a month short is owed on, never forgotten', () => {
    const s = life({ savings: 600, family: { circumstances: 'comfortable', support: 'loan', amount: 2_400 } });
    expect(personalBalance(s)).toBe(3_000);
    expect(personalStatement(s)).toEqual([{ kind: 'savings', total: 600 }, { kind: 'loan', total: 2_400 }]);
    processUntil(s, s.now + 31 * DAY, 'tick', 100000);
    expect(loanStanding(s)).toEqual({ repaid: 100, owed: 2_300 });
    // Spend down to nothing: the next months are owed on.
    const p = short(s);
    putInOwnMoney(s, p, Math.min(personalBalance(s), financeSummary(p).stillToRaise));
    const left = personalBalance(s);
    processUntil(s, s.now + 30 * DAY, 'tick', 100000);
    expect(loanStanding(s)!.repaid).toBe(100 + Math.min(100, left));
    if (left < 100) expect(s.log.some((l) => /^You couldn't repay your family all that was due this month: \$[\d,]+ is still owed/.test(l.text))).toBe(true);
  });

  it('puts money into a project only by your choice, only what you have, only what it still needs', () => {
    const s = life({ savings: 5_000 }, 'putin');
    const p = short(s);
    expect(putInRefusal(s, p, 6_000)).toBe('You have $5,000 in your own account.');
    const fund = p.funding.fund;
    const d = putInOwnMoney(s, p, 3_000);
    expect(d).toMatchObject({ kind: 'savings', backer: 'Your Own Money', status: 'accepted', received: 3_000, terms: { unspent: 'yours', recoup: 0, incomeShare: 0 } });
    expect(p.funding.fund - fund).toBe(3_000);
    expect(personalBalance(s)).toBe(2_000);
    expect(personalStatement(s)).toContainEqual({ kind: 'to-project', total: -3_000 });
  });

  it('takes home what a delivered project kept, and a family investment takes its share of income, never of your own money back', () => {
    const s = life({ family: { circumstances: 'wealthy', support: 'investment', amount: 4_000 } }, 'home');
    const p = short(s);
    putInOwnMoney(s, p, 4_000);
    // Labelled fixtures: the project was delivered and its release brought in income it kept.
    p.delivered = { at: s.now, runtimeMin: 12 };
    p.revenue = 10_000;
    const can = takeHomeAvailable(p);
    expect(can.earnings).toBeLessThanOrEqual(10_000);
    expect(can.earnings).toBeLessThanOrEqual(ledgerTotals(p).available);
    takeHome(s, p, 'earnings', 8_000);
    expect(personalStatement(s)).toContainEqual({ kind: 'from-project', total: 8_000 });
    expect(personalStatement(s)).toContainEqual({ kind: 'participation', total: -2_000 }); // 25% of income taken home
    expect(takeHomeAvailable(p).earnings).toBe(can.earnings - 8_000);
    expect(() => takeHome(s, p, 'earnings', can.earnings)).toThrow(/^At most \$[\d,]+ can come home/);
    // The family's share stops at what the terms say: 1.5 times what they put in.
    const back = personalPostings(s).filter((x) => x.kind === 'participation').reduce((a, x) => a - x.amount, 0);
    expect(back).toBeLessThanOrEqual(6_000);
  });

  it('refuses more than the project still needs', () => {
    const s = life({ savings: 25_000 }, 'need');
    const p = short(s);
    setFinanceTarget(p, financeSummary(p).promised + 10_000); // labelled fixture: $10,000 still to raise
    expect(putInRefusal(s, p, 10_001)).toBe('This project has $10,000 still to raise.');
  });

  it('a family investment shares income up to its cap, and never your own money coming back', () => {
    const s = life({ family: { circumstances: 'wealthy', support: 'investment', amount: 4_000 } }, 'cap');
    const p = short(s);
    putInOwnMoney(s, p, 4_000);
    p.delivered = { at: s.now, runtimeMin: 12 }; // labelled fixtures: delivered, with income kept
    p.revenue = 40_000;
    const theirs = () => -personalPostings(s).filter((x) => x.kind === 'participation').reduce((a, x) => a + x.amount, 0);
    takeHome(s, p, 'earnings', Math.min(30_000, takeHomeAvailable(p).earnings));
    expect(theirs()).toBe(6_000); // 25% would be 7,500: the cap is 1.5 times the 4,000
    const capital = takeHomeAvailable(p).capital;
    if (capital > 0) { takeHome(s, p, 'capital', capital); expect(theirs()).toBe(6_000); }
    // Your own money back, with no income taken: nothing for them.
    const t = life({ family: { circumstances: 'wealthy', support: 'investment', amount: 4_000 } }, 'cap2');
    const q = short(t);
    putInOwnMoney(t, q, 4_000);
    q.delivered = { at: t.now, runtimeMin: 12 };
    takeHome(t, q, 'capital', takeHomeAvailable(q).capital);
    expect(personalPostings(t).some((x) => x.kind === 'participation')).toBe(false);
  });

  it('a month missed is due with the next, and a repeated month repays nothing twice', () => {
    const s = life({ family: { circumstances: 'comfortable', support: 'loan', amount: 2_400 } }, 'missed');
    const p = short(s);
    putInOwnMoney(s, p, 2_400); // nothing left for month one
    processUntil(s, s.now + 31 * DAY, 'tick', 100000);
    expect(loanStanding(s)).toEqual({ repaid: 0, owed: 2_400 });
    postPersonal(s, 'gift', 1_000, 'Fixture', 'fixture'); // labelled fixture: money arrives
    processUntil(s, s.now + 30 * DAY, 'tick', 100000);
    expect(loanStanding(s)!.repaid).toBe(200); // months one and two
    // The same month's event delivered twice (labelled fixture) repays it once.
    const repaid = loanStanding(s)!.repaid;
    s.events.push({ id: 'e-dup', at: s.now + 1, kind: 'family-repayment', priority: 60, attention: 'silent', payload: { month: 2 } });
    processUntil(s, s.now + 2, 'tick', 100000);
    expect(loanStanding(s)!.repaid).toBe(repaid);
  });

  it('a story from before your own money existed opens with an empty account and no new money', () => {
    const s = life({}, 'old');
    delete s.money; delete s.journal; // labelled fixture: a save made before November 12, 2026
    const back = deserialize(serialize(s));
    expect(back.money).toBeUndefined();
    expect(personalBalance(back)).toBe(0);
    expect(loanStanding(back)).toBeNull();
  });

  it('survives saving and loading, and a retried posting is never posted twice', () => {
    const s = life({ savings: 1_000, family: { circumstances: 'comfortable', support: 'loan', amount: 2_400 } }, 'save');
    processUntil(s, s.now + 31 * DAY, 'tick', 100000);
    const back = deserialize(serialize(s));
    expect(personalBalance(back)).toBe(personalBalance(s));
    // The same month's event run again repays nothing more.
    const before = personalBalance(back);
    processUntil(back, back.now + 1 * DAY, 'tick', 100000);
    expect(personalBalance(back)).toBe(before);
  });
});
