// The player's production company (src/engine/company.ts; the owner's v5 brief, 9): formed from your own account, its own
// account a list of postings, every move explicit and posted on both sides, never money that appears from nowhere.
import { describe, expect, it } from 'vitest';
import { FORMATION_FEE, companyBalance, companyInRefusal, companyIntoProject, companyStatement, formCompany, formRefusal, moveCompanyMoney, takeToCompany } from '../src/engine/company';
import { financeSummary, setFinanceTarget } from '../src/engine/finance';
import { personalBalance, takeHome, takeHomeAvailable } from '../src/engine/personal';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import type { CreationDraft, GameState, Project } from '../src/engine/types';
import { draft } from './fixtures';
import { approve, buildProject } from './helpers';

const life = (over: Partial<CreationDraft>, tag: string) => newGame({ ...draft(), ...over }, 0, `save-${tag}`);
const short = (s: GameState): Project => {
  const p = buildProject(s, { title: 'Harbour Lights', format: 'short', medium: 'live-action', runtime: 12, scenario: 'low' }, [{ name: 'Mara', patch: { roleSize: 'lead' } }], [{ place: 'Pier', chars: ['Mara'], minutes: 4 }]);
  approve(s, p);
  setFinanceTarget(p, financeSummary(p).promised + 50_000); // labelled fixture: $50,000 still to raise
  return p;
};
/** Everything of yours, in your account and the company's: what neither formation nor a project should change. */
const yours = (s: GameState) => personalBalance(s) + companyBalance(s);

describe('your company', () => {
  it('is formed with a name and capital from your own account, the fee paid, each side posted', () => {
    const s = life({ savings: 5_000 }, 'co-form');
    expect(formRefusal(s, 'A', 0)).toBe('Give the company a name.');
    expect(formRefusal(s, 'Tidewater Pictures', 5_000)).toBe(`Forming it costs $${FORMATION_FEE}, and $5,000 goes in: you have $5,000 in your own account.`);
    const before = yours(s);
    formCompany(s, 'Tidewater Pictures', 2_000);
    expect([personalBalance(s), companyBalance(s)]).toEqual([5_000 - 2_000 - FORMATION_FEE, 2_000]);
    expect(yours(s)).toBe(before - FORMATION_FEE); // only the fee leaves you
    expect(companyStatement(s)).toEqual([{ kind: 'capital', total: 2_000 }]);
    expect(formRefusal(s, 'Another', 0)).toBe('You already have a company, Tidewater Pictures.');
  });

  it('moves money in and draws it out, each posted once on both sides, never more than is there', () => {
    const s = life({ savings: 5_000 }, 'co-move');
    formCompany(s, 'Tidewater Pictures', 1_000);
    const before = yours(s);
    moveCompanyMoney(s, 'in', 1_500);
    moveCompanyMoney(s, 'out', 700);
    expect(companyBalance(s)).toBe(1_800);
    expect(yours(s)).toBe(before);
    expect(() => moveCompanyMoney(s, 'out', 5_000)).toThrow('Tidewater Pictures has $1,800.');
    expect(() => moveCompanyMoney(s, 'in', 100_000)).toThrow(/^You have \$[\d,]+ in your own account\.$/);
  });

  it('puts money into a project, which it then produces; what the project does not spend is the company\'s again', () => {
    const s = life({ savings: 10_000 }, 'co-project');
    formCompany(s, 'Tidewater Pictures', 8_000);
    const p = short(s);
    expect(companyInRefusal(s, p, 9_000)).toBe('Tidewater Pictures has $8,000.');
    const fund = p.funding.fund;
    const d = companyIntoProject(s, p, 6_000);
    expect(d).toMatchObject({ kind: 'company', backer: 'Tidewater Pictures', status: 'accepted', received: 6_000, terms: { unspent: 'yours', recoup: 0, incomeShare: 0 } });
    expect([p.funding.fund - fund, companyBalance(s), p.producedBy]).toEqual([6_000, 2_000, 'Tidewater Pictures']);
    // Delivered with income kept (labelled fixtures): it goes to the company or home, and what one moves the other can't.
    p.delivered = { at: s.now, runtimeMin: 12 };
    p.revenue = 10_000;
    const can = takeHomeAvailable(p);
    takeToCompany(s, p, 'earnings', can.earnings);
    expect(companyBalance(s)).toBe(2_000 + can.earnings);
    expect(takeHomeAvailable(p).earnings).toBe(0);
    expect(() => takeHome(s, p, 'earnings', 1)).toThrow();
    expect(() => takeToCompany(s, p, 'earnings', 1)).toThrow(/^Harbour Lights has nothing of that kind to move\.$/);
  });

  it('is kept whole through a save and a load', () => {
    const s = life({ savings: 5_000 }, 'co-save');
    formCompany(s, 'Tidewater Pictures', 1_000);
    moveCompanyMoney(s, 'out', 400);
    const s2 = deserialize(serialize(s));
    expect(s2.company).toEqual(s.company);
    expect(companyBalance(s2)).toBe(600);
  });
});
