// The company is out of play (the owner's command of November 14, 2026: "Remove the company system from active gameplay
// for now"; src/engine/company.ts). Each case changes an input and reads the outcome: no screen or function forms,
// funds or draws on a company; a company from an older save is kept as it was, its money never added to yours; a deal
// it signed goes on paying it, and a deal signed since pays you.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as company from '../src/engine/company';
import { companyBalance, postCompany } from '../src/engine/company';
import { financeSummary, setFinanceTarget } from '../src/engine/finance';
import { personalBalance, takeHomeAvailable } from '../src/engine/personal';
import { DAY, processUntil } from './engine-api';
import { schedule } from '../src/engine/state';
import { newGame } from '../src/engine/state';
import type { CreationDraft, GameState } from '../src/engine/types';
import { draft } from './fixtures';
import { approve, buildProject } from './helpers';
import { bankHeld } from '../src/engine/bank';

const life = (over: Partial<CreationDraft>, tag: string) => newGame({ ...draft(), ...over }, 0, `save-${tag}`);
/** Labelled fixture: a company a save made before November 14, 2026 holds, with money in its own v8 journal account. */
const oldCompany = (s: GameState, minor = 0, status: 'registered' | 'pending' = 'registered') => {
  s.company = { name: 'Tidewater Pictures', foundedAt: s.now, status, appliedAt: s.now };
  if (minor) postCompany(s, 'capital', minor, 'Put In By You (fixture)', 'fixture:capital');
};

describe('no company is formed, funded or drawn on', () => {
  it('the engine offers no way to form, fund or draw on one, and no screen shows one', () => {
    for (const gone of ['applyForCompany', 'formCompany', 'formRefusal', 'moveCompanyMoney', 'companyIntoProject', 'companyInRefusal', 'takeToCompany', 'FORMATION_FEE']) {
      expect(gone in company, gone).toBe(false);
    }
    const ui = ['YourMoney.tsx', 'PlanViews.tsx', 'Places.tsx', 'World.tsx'].map((f) => readFileSync(`src/ui/${f}`, 'utf8')).join('\n');
    for (const words of ['Apply To Register', 'Put In From The Company', 'Draw It Out', 'Company Name', 'CompanyProjectCard']) expect(ui, words).not.toContain(words);
  });

  it('a new life starts with no company, and its money is all in the bank', () => {
    const s = life({}, 'co-none');
    expect(s.company).toBeUndefined();
    expect(personalBalance(s)).toBe(25_000_000);
    expect(s.journal).toBeUndefined();
  });
});

describe('a company from an older save', () => {
  it('keeps its own money apart from yours: a change in its money changes nothing of yours', () => {
    const a = life({}, 'co-old-a');
    const b = life({}, 'co-old-b');
    oldCompany(a, 1_000);
    oldCompany(b, 9_000);
    expect([companyBalance(a), companyBalance(b)]).toEqual([1_000, 9_000]);
    expect(personalBalance(a)).toBe(personalBalance(b));
  });

  it('an application still waiting is answered as withdrawn on its day, and nothing more is charged', () => {
    const s = life({}, 'co-pending');
    oldCompany(s, 0, 'pending');
    schedule(s, s.now + 5 * DAY, 'company-decision', {}, { attention: 'notify', priority: 55, id: 'company-decision:fixture' });
    const before = bankHeld(s);
    processUntil(s, s.now + 6 * DAY, 'tick', 100_000);
    expect(s.company).toMatchObject({ status: 'refused', reason: 'Companies left the game before the registry answered, so the application was withdrawn.' });
    expect(bankHeld(s)).toBe(before); // in the bank's own money: in dollars it moves with the rate
    expect(companyBalance(s)).toBe(0);
  });

  it('what it put into a project stays with the project and can\'t be taken home as yours', () => {
    const s = life({ savings: 0 }, 'co-project');
    const p = buildProject(s, { title: 'Harbour Lights', format: 'short', medium: 'live-action', runtime: 12, scenario: 'low' }, [{ name: 'Mara', patch: { roleSize: 'lead' } }], [{ place: 'Pier', chars: ['Mara'], minutes: 4 }]);
    approve(s, p);
    setFinanceTarget(p, financeSummary(p).promised + 50_000);
    const deal = (kind: 'company' | 'savings') => ({ id: `fd-${kind}`, kind, backer: kind, amount: 6_000, status: 'accepted' as const, askedAt: s.now, reason: 'fixture', received: 6_000, repaid: 0, terms: { recoup: 0, incomeShare: 0, approvalRights: [], credit: null, onDelivery: 0, deliverBy: null, unspent: 'yours' as const } });
    // Labelled fixtures: the same $6,000 put in, once by an old save's company and once by you; delivered, nothing spent.
    const asCompany = structuredClone(p);
    asCompany.finance!.deals.push(deal('company'));
    p.finance!.deals.push(deal('savings'));
    for (const x of [p, asCompany]) { x.funding.fund += 6_000; x.delivered = { at: s.now, runtimeMin: 12 }; }
    expect(takeHomeAvailable(p).capital - takeHomeAvailable(asCompany).capital).toBe(6_000);
  });
});
