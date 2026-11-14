// A banner (src/engine/company.ts; the owner's v8 package, 02 "Independent creator, banner and entity"; A03). Each case
// changes one input and reads the bank's ledger and the save.
import { describe, expect, it } from 'vitest';
import { productionCredit, setBanner } from '../src/engine/company';
import { personalBalance } from '../src/engine/personal';
import { buildProject, startLife } from './helpers';

describe('A03: a banner is a name, not an entity', () => {
  it('credits your work under it and opens no account, forms no company and moves no money or rights', () => {
    const s = startLife('banner');
    const p = buildProject(s, { title: 'Ledger', format: 'short', medium: 'live-action', runtime: 8 }, [{ name: 'Mara' }], [{ place: 'Pier', chars: ['Mara'] }]);
    const before = { accounts: Object.keys(s.bank!.accounts).sort(), txs: s.bank!.transactions.length, mine: personalBalance(s) };
    setBanner(s, 'Derrick Lane');
    expect(productionCredit(s, p)).toBe('Derrick Lane');
    expect({ accounts: Object.keys(s.bank!.accounts).sort(), txs: s.bank!.transactions.length, mine: personalBalance(s) }).toEqual(before);
    expect([s.company, p.producedBy]).toEqual([undefined, undefined]);
    setBanner(s, '');
    expect(productionCredit(s, p)).toBeNull();
    expect(() => setBanner(s, 'X')).toThrow('A banner name is 2 to 60 characters.');
  });
});

// A company applied for, decided, and drawn on (A11) was tested here until November 14, 2026, when the company left play
// (tests/v9-company-removed.test.ts says what is left of it).
