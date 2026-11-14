// A banner and a company (src/engine/company.ts; the owner's v8 package, 02 "Independent creator, banner and entity";
// A03, A11). Each case changes one input and reads the journal and the save.
import { describe, expect, it } from 'vitest';
import { DAY, processUntil } from './engine-api';
import { applyForCompany, capitalOutstanding, postCompany, companyBalance, companyPostings, formCompany, moveCompanyMoney, productionCredit, registered, setBanner } from '../src/engine/company';
import { personalBalance } from '../src/engine/personal';
import { buildProject, startLife } from './helpers';

describe('A03: a banner is a name, not an entity', () => {
  it('credits your work under it and opens no account, forms no company and moves no money or rights', () => {
    const s = startLife('banner');
    const p = buildProject(s, { title: 'Ledger', format: 'short', medium: 'live-action', runtime: 8 }, [{ name: 'Mara' }], [{ place: 'Pier', chars: ['Mara'] }]);
    const before = { accounts: Object.keys(s.journal!.accounts).sort(), txs: s.journal!.txs.length, mine: personalBalance(s) };
    setBanner(s, 'Derrick Lane');
    expect(productionCredit(s, p)).toBe('Derrick Lane');
    expect({ accounts: Object.keys(s.journal!.accounts).sort(), txs: s.journal!.txs.length, mine: personalBalance(s) }).toEqual(before);
    expect([s.company, p.producedBy]).toEqual([undefined, undefined]);
    setBanner(s, '');
    expect(productionCredit(s, p)).toBeNull();
    expect(() => setBanner(s, 'X')).toThrow('A banner name is 2 to 60 characters.');
  });
});

describe('a company is applied for, and the registry decides', () => {
  it('is pending, holds nothing until registered, then takes the capital you said', () => {
    const s = startLife('co-apply', 'us-los-angeles');
    const start = personalBalance(s);
    applyForCompany(s, 'Derrick Lane Pictures', 50_000);
    expect([s.company!.status, s.company!.jurisdiction, personalBalance(s), companyBalance(s)]).toEqual(['pending', 'US', start - 300, 0]);
    expect(() => moveCompanyMoney(s, 'in', 1_000)).toThrow("Derrick Lane Pictures isn't registered yet.");
    processUntil(s, s.now + 10 * DAY, 'advance', 1_000_000);
    expect([registered(s), companyBalance(s), personalBalance(s)]).toEqual([true, 50_000, start - 300 - 50_000]);
  });

  it('is refused under a name a studio already has; the fee stays paid and you can apply again', () => {
    const s = startLife('co-refused', 'us-los-angeles');
    s.industry = { ...(s.industry ?? {}), studios: [{ c: 'Q1', n: 1, g: [], m: [], ann: {}, name: 'Harbour Pictures' }] } as never; // labelled fixture: a studio by that name
    const start = personalBalance(s);
    applyForCompany(s, 'Harbour Pictures', 10_000);
    processUntil(s, s.now + 10 * DAY, 'advance', 1_000_000);
    expect([s.company!.status, s.company!.reason, personalBalance(s)]).toEqual(['refused', 'The name Harbour Pictures is already registered to a studio.', start - 300]);
    applyForCompany(s, 'Tidewater Pictures', 0);
    expect(s.company!.status).toBe('pending');
  });
});

describe('A11: a draw is your capital back first, then earnings paid out', () => {
  it('says which is which, and never more than the company holds', () => {
    const s = startLife('co-draw');
    formCompany(s, 'Tidewater Pictures', 10_000); // labelled fixture: registered at once
    // Labelled fixture: the company earned $5,000 (a project's income back).
    postCompany(s, 'from-project', 5_000, 'Income From Ledger', 'fixture:income');
    expect(capitalOutstanding(s)).toBe(10_000);
    moveCompanyMoney(s, 'out', 12_000);
    const kinds = companyPostings(s).filter((x) => x.amount < 0).map((x) => [x.kind, x.amount]);
    expect(kinds).toEqual([['draw', -10_000], ['distribution', -2_000]]);
    expect([capitalOutstanding(s), companyBalance(s)]).toEqual([0, 3_000]);
    expect(() => moveCompanyMoney(s, 'out', 3_001)).toThrow('Tidewater Pictures has $3,000.');
  });
});
