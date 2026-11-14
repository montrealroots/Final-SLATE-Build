// A project's planned budget (src/engine/project-budget.ts; the owner's v8 package, 03 "Budget creation"; A04). A plan is
// kept exactly, every change is recorded with its reason, and no change to it moves any money.
import { describe, expect, it } from 'vitest';
import { budgetPicture, plannedText, setPlannedBudget } from '../src/engine/project-budget';
import { parseAmount } from '../src/engine/cash/money';
import { ledgerTotals } from '../src/engine/budget';
import { financeSummary } from '../src/engine/finance';
import { personalBalance } from '../src/engine/personal';
import { deserialize, serialize } from '../src/engine/save';
import { buildProject, startLife } from './helpers';

const cents = (t: string) => { const r = parseAmount(t, 'USD'); if (!r.ok) throw new Error(r.reason); return r.minor; };

describe('A04: a planned budget is the amount typed, and no money', () => {
  it('keeps 20,000 and 2,000,000 exactly through a reload, and moves no money either way', () => {
    const s = startLife('budget-plan');
    const p = buildProject(s, { title: 'Ledger', format: 'short', medium: 'live-action', runtime: 8 }, [{ name: 'Mara' }], [{ place: 'Pier', chars: ['Mara'] }]);
    const before = { ledger: ledgerTotals(p), received: financeSummary(p).received, mine: personalBalance(s), txs: s.bank!.transactions.length };
    expect(plannedText(p)).toBe('Not set');
    setPlannedBudget(s, p, cents('20000'), 'A short with friends');
    expect([plannedText(p), p.finance!.target]).toEqual(['$20,000 planned', 20_000]);
    setPlannedBudget(s, p, cents('2,000,000'), 'A bigger cast');
    let back = deserialize(serialize(s));
    let q = back.projects[0];
    expect(q.finance!.planned).toEqual({ currency: 'USD', minor: 200_000_000 });
    expect(q.finance!.revisions!.map((r) => [r.from, r.to, r.reason])).toEqual([[null, 2_000_000, 'A short with friends'], [2_000_000, 200_000_000, 'A bigger cast']]);
    // Nothing moved: the project's ledger, what backers paid, your account, the bank's ledger.
    expect({ ledger: ledgerTotals(q), received: financeSummary(q).received, mine: personalBalance(back), txs: back.bank!.transactions.length }).toEqual(before);
    // Lowered, then cleared to unknown; zero is an unfunded draft, not unknown.
    setPlannedBudget(back, q, 0, 'Shelved for now');
    expect(plannedText(q)).toBe('$0: an unfunded draft');
    setPlannedBudget(back, q, null, 'Not sure yet');
    back = deserialize(serialize(back));
    q = back.projects[0];
    expect([plannedText(q), budgetPicture(back, q).planned]).toEqual(['Not set', null]);
  });

  it('refuses a negative plan or a fraction of a cent, and changes nothing when it does', () => {
    const s = startLife('budget-bad');
    const p = buildProject(s, { title: 'Ledger', format: 'short', medium: 'live-action', runtime: 8 }, [{ name: 'Mara' }], [{ place: 'Pier', chars: ['Mara'] }]);
    expect(() => setPlannedBudget(s, p, -1, 'x')).toThrow("A planned budget can't be negative.");
    expect(() => setPlannedBudget(s, p, 0.5, 'x')).toThrow(/whole number/);
    expect(p.finance!.revisions ?? []).toEqual([]);
  });
});
