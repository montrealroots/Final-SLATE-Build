// Your money and the money raised to make a project, kept apart (November 10, 2026). Until then any money a delivered
// project had left was offered to the next as Your Earnings, unspent grant and investor money included. Labelled fixtures:
// a delivered project's backers are recorded as accepted deals with the terms the game now writes, and its spending as
// budget lines, because raising and spending it is the work of the journeys; income goes through receiveIncome, as a
// distributor's guarantee or overage does.
import { describe, expect, it } from 'vitest';
import { acceptDeal, approachBacker, backerOptions, categoryTotals, createProject, dealTerms, deals, ledgerTotals, moneyKept, ownMoney, ownMoneyNotes, receiveIncome, reserve, setFinanceTarget, spend } from '../src/engine';
import { deserialize, serialize } from '../src/engine/save';
import { validateGameState } from '../src/engine/validate';
import type { FinanceDeal, FinanceDealKind, GameState, Project } from '../src/engine/types';
import { approve, buildProject, startLife, writePitch } from './helpers';

type Terms = Partial<FinanceDeal['terms']>;
/** A backer's accepted deal, paid in (labelled fixture). */
function backed(p: Project, kind: FinanceDealKind, amount: number, terms: Terms = {}): FinanceDeal {
  p.finance ??= { estimate: amount, target: amount, deals: [] };
  const d: FinanceDeal = {
    id: `${p.id}-${kind}-${p.finance.deals.length}`, kind, backer: kind, amount, status: 'accepted', askedAt: 0, reason: '', received: amount, repaid: 0,
    terms: { recoup: 0, incomeShare: 0, approvalRights: [], credit: null, onDelivery: 0, deliverBy: null, unspent: kind === 'earnings' || kind === 'capital' ? 'yours' : 'stays', ...terms },
  };
  p.finance.deals.push(d);
  p.funding.fund += amount;
  return d;
}
/** A delivered project with no money of its own yet: its fixture's agreed funding is taken out. */
function delivered(s: GameState, title: string): Project {
  const p = buildProject(s, { title, format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ines', patch: { roleSize: 'lead' } }], [{ place: 'Dock', chars: ['Ines'], minutes: 3 }]);
  p.funding.fund = 0;
  p.finance!.deals = [];
  p.delivered = { at: s.now, runtimeMin: 10 };
  p.phase = 'delivered';
  return p;
}
/** Income arriving as callers record it: backers' repayments and shares first, the rest kept. */
const income = (s: GameState, p: Project, amount: number) => { p.revenue += receiveIncome(s, p, amount, 'A distributor'); };
/** A new project with an approved script and a $500,000 target, nothing raised yet. */
function next(s: GameState, title = 'Next One'): Project {
  const p = createProject(s, { title, scenarioId: 'low', axes: { format: 'short', medium: 'live-action', targetRuntimeMin: 10 } });
  const q = buildProject(s, { title: 'tmp', format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ada', patch: { roleSize: 'lead' } }], [{ place: 'Pier', chars: ['Ada'], minutes: 3 }]);
  p.characters = q.characters;
  p.scenes = q.scenes;
  writePitch(p);
  s.projects = s.projects.filter((x) => x.id !== q.id);
  approve(s, p);
  setFinanceTarget(p, 500_000);
  return p;
}
const option = (s: GameState, p: Project, kind: string) => backerOptions(s, p).find((o) => o.kind === kind);
const avail = (p: Project) => ledgerTotals(p).available;
const totalMoney = (s: GameState) => s.projects.reduce((n, p) => n + avail(p), 0);
const parts = (p: Project) => { const m = moneyKept(p); return m.restricted + m.capital + m.earnings; };

describe('money raised to make a project stays with it', () => {
  it('unspent grant, investor and co-production money is not earnings and cannot fund another project', () => {
    const s = startLife('earn-restricted');
    const a = delivered(s, 'Grant Film');
    backed(a, 'grant', 100_000);
    backed(a, 'investor', 50_000, { recoup: 60_000, incomeShare: 0.3 });
    backed(a, 'co-producer', 25_000, { incomeShare: 0.5 });
    spend(s, a, 'Crew', 'crew', 60_000, 'k1');
    expect(moneyKept(a)).toMatchObject({ restricted: 115_000, earnings: 0, capital: 0, held: 0 });
    expect(avail(a)).toBe(115_000); // the old rule offered all of this as Your Earnings
    const b = next(s);
    expect(option(s, b, 'earnings')).toMatchObject({ ready: false, needs: expect.stringContaining("haven't kept any income yet") });
    expect(() => approachBacker(s, b, 'earnings')).toThrow(/haven't kept any income yet/);
    expect(ownMoneyNotes(s, b)).toContain('Production funding still in your delivered projects stays with them: it was raised to make them. Grant Film ($115,000).');
    expect(deals(b)).toHaveLength(0);
  });

  it('a deal with no recorded term for its unspent money is read as staying: missing terms never let money move', () => {
    const s = startLife('earn-missing');
    const a = delivered(s, 'Old Terms');
    const d = backed(a, 'agreed', 80_000);
    delete d.terms.unspent;
    const e = backed(a, 'earnings', 20_000);
    delete e.terms.unspent; // own money put in under the earlier rule
    expect(moneyKept(a)).toMatchObject({ restricted: 100_000, capital: 0, earnings: 0 });
    expect(dealTerms(e)).toContain("Put in under the earlier rule, which didn't record whose money it was: what the project doesn't spend of it stays with the project.");
  });
});

describe('income a delivered project kept can go into the next one', () => {
  it('is offered as Your Earnings, moved as one linked transfer, and both budgets show it', () => {
    const s = startLife('earn-move');
    const a = delivered(s, 'Earner');
    backed(a, 'grant', 40_000);
    spend(s, a, 'Crew', 'crew', 40_000, 'k1');
    income(s, a, 50_000);
    expect(moneyKept(a)).toMatchObject({ restricted: 0, earnings: 50_000 });
    const b = next(s);
    expect(option(s, b, 'earnings')).toMatchObject({ ready: true, needs: '' });
    const d = approachBacker(s, b, 'earnings');
    expect(d).toMatchObject({ status: 'offered', amount: 50_000, reason: 'Income kept by Earner ($50,000). Nobody is repaid from it and nobody takes a share.' });
    expect(d.terms).toMatchObject({ recoup: 0, incomeShare: 0, approvalRights: [], credit: null, unspent: 'yours' });
    expect(d.expiresAt).toBeUndefined();
    const before = totalMoney(s);
    acceptDeal(s, b, d.id);
    expect(avail(b)).toBe(50_000);
    expect(avail(a)).toBe(0);
    expect(totalMoney(s)).toBe(before);
    expect(d.transfer).toEqual({ id: `tr-${d.id}`, sources: [{ projectId: a.id, amount: 50_000 }] });
    const line = a.obligations.find((o) => o.ref === `transfer:tr-${d.id}:earnings`)!;
    expect(line).toMatchObject({ label: 'Put Into Next One', state: 'settled', settled: 50_000 });
    expect(line.postings.map((x) => [x.kind, x.key])).toEqual([['reserve', `${line.id}:reserve`], ['settle', `transfer:tr-${d.id}`]]);
    expect(moneyKept(a)).toMatchObject({ earnings: 0, moved: { earnings: 50_000, capital: 0 } });
    expect(categoryTotals(a).finance).toBeUndefined(); // moved money isn't spending on Earner
    // In the new project it is your money, which can move again only once that project is delivered.
    expect(moneyKept(b)).toMatchObject({ restricted: 0, capital: 50_000, earnings: 0 });
    expect(ownMoney(s).capital).toEqual([]);
  });

  it('mixed funding, own money and income keep their restrictions, each part moved only as itself', () => {
    const s = startLife('earn-mixed');
    const a = delivered(s, 'Mixed');
    backed(a, 'grant', 100_000);
    backed(a, 'capital', 20_000);
    spend(s, a, 'Crew', 'crew', 50_000, 'k1');
    income(s, a, 30_000);
    expect(moneyKept(a)).toMatchObject({ restricted: 50_000, capital: 20_000, earnings: 30_000 });
    expect(parts(a)).toBe(avail(a));
    const b = next(s);
    const d = approachBacker(s, b, 'earnings');
    expect(d.amount).toBe(30_000);
    acceptDeal(s, b, d.id);
    expect(moneyKept(a)).toMatchObject({ restricted: 50_000, capital: 20_000, earnings: 0 });
    const c = approachBacker(s, b, 'capital');
    expect(c).toMatchObject({ backer: 'Your Unspent Money', amount: 20_000 });
    acceptDeal(s, b, c.id);
    expect(moneyKept(a)).toMatchObject({ restricted: 50_000, capital: 0, earnings: 0, moved: { earnings: 30_000, capital: 20_000 } });
    expect(parts(a)).toBe(avail(a));
    expect(avail(b)).toBe(50_000);
    expect(option(s, b, 'earnings')?.ready).toBe(false);
  });

  it('backers are repaid and paid their shares once: what is moved is what they left, and later income is shared again', () => {
    const s = startLife('earn-recoup');
    const a = delivered(s, 'Recouping');
    const start = backed(a, 'starting', 40_000, { recoup: 40_000 });
    const inv = backed(a, 'investor', 10_000, { recoup: 12_000, incomeShare: 0.3 });
    spend(s, a, 'Crew', 'crew', 50_000, 'k1');
    income(s, a, 100_000);
    // 40,000 and 12,000 repaid; 30% of the 48,000 left to the investor; 33,600 kept.
    expect([start.repaid, inv.repaid, a.revenue]).toEqual([40_000, 12_000 + 14_400, 33_600]);
    expect(moneyKept(a).earnings).toBe(33_600);
    const b = next(s);
    const d = approachBacker(s, b, 'earnings');
    acceptDeal(s, b, d.id);
    expect([start.repaid, inv.repaid]).toEqual([40_000, 26_400]); // moving it pays no one again
    expect(avail(b)).toBe(33_600);
    income(s, a, 10_000);
    expect(inv.repaid).toBe(29_400);
    expect(moneyKept(a).earnings).toBe(7_000);
    expect(ownMoney(s, b.id).earnings).toEqual([{ p: a, amount: 7_000 }]);
  });

  it('bills agreed or held and not yet paid come out of what can move', () => {
    const s = startLife('earn-held');
    const a = delivered(s, 'Owing');
    backed(a, 'grant', 30_000);
    spend(s, a, 'Crew', 'crew', 30_000, 'k1');
    income(s, a, 30_000);
    reserve(s, a, 'Festival Fee', 'festival', 5_000);
    expect(moneyKept(a)).toMatchObject({ held: 5_000, earnings: 25_000 });
    const b = next(s);
    expect(approachBacker(s, b, 'earnings').amount).toBe(25_000);
    expect(ownMoneyNotes(s, b)).toContain('$5,000 in your delivered projects is held for bills they still have to pay.');
  });
});

describe('money you put in and did not spend', () => {
  it('is yours again as Your Unspent Money, never called earnings', () => {
    const s = startLife('earn-capital');
    const a = delivered(s, 'Self Funded');
    backed(a, 'grant', 10_000);
    backed(a, 'earnings', 30_000); // your earnings from before, put in
    spend(s, a, 'Crew', 'crew', 25_000, 'k1');
    expect(moneyKept(a)).toMatchObject({ restricted: 0, capital: 15_000, earnings: 0 });
    const b = next(s);
    expect(option(s, b, 'earnings')?.ready).toBe(false);
    expect(option(s, b, 'capital')).toMatchObject({ ready: true });
    const d = approachBacker(s, b, 'capital');
    expect(d).toMatchObject({ kind: 'capital', backer: 'Your Unspent Money', amount: 15_000, reason: 'Money you put in and left unspent in Self Funded ($15,000). Nobody is repaid from it and nobody takes a share.' });
    acceptDeal(s, b, d.id);
    expect(a.obligations.find((o) => o.ref?.endsWith(':capital'))?.settled).toBe(15_000);
    expect(moneyKept(a).moved).toEqual({ earnings: 0, capital: 15_000 });
  });

  it('is not offered before you have ever put money in', () => {
    const s = startLife('earn-capital-none');
    expect(option(s, next(s), 'capital')).toBeUndefined();
  });
});

describe('moving your money never makes or loses any', () => {
  it('from several projects, and two projects offered the same money: the first to accept takes it, the second is refused', () => {
    const s = startLife('earn-compete');
    const a = delivered(s, 'First');
    const c = delivered(s, 'Second');
    income(s, a, 30_000);
    income(s, c, 20_000);
    const b = next(s, 'Third');
    const e = next(s, 'Fourth');
    const db = approachBacker(s, b, 'earnings');
    const de = approachBacker(s, e, 'earnings');
    expect([db.amount, de.amount]).toEqual([50_000, 50_000]);
    const total = totalMoney(s);
    acceptDeal(s, b, db.id);
    expect(db.transfer!.sources).toEqual([{ projectId: a.id, amount: 30_000 }, { projectId: c.id, amount: 20_000 }]);
    const after = serialize(s);
    expect(() => acceptDeal(s, e, de.id)).toThrow("Your Earnings has nothing in it now, less than the $50,000 offered, so nothing was moved. Turn this offer down and put in what there is.");
    expect(serialize(s)).toBe(after);
    expect(totalMoney(s)).toBe(total);
    expect([avail(a), avail(c), avail(b), avail(e)]).toEqual([0, 0, 50_000, 0]);
  });

  it('an offer made stale by spending is refused with nothing changed; asking again offers what is left', () => {
    const s = startLife('earn-stale');
    const a = delivered(s, 'Spender');
    income(s, a, 40_000);
    const b = next(s);
    const d = approachBacker(s, b, 'earnings');
    spend(s, a, 'Festival Travel', 'travel', 15_000, 'k2');
    const before = serialize(s);
    expect(() => acceptDeal(s, b, d.id)).toThrow('Your Earnings comes to $25,000 now, less than the $40,000 offered, so nothing was moved. Turn this offer down and put in what there is.');
    expect(serialize(s)).toBe(before);
    const again = approachBacker(s, b, 'earnings');
    expect(d.status).toBe('withdrawn');
    expect(again.amount).toBe(25_000);
    expect(() => acceptDeal(s, b, d.id)).toThrow('That offer is no longer open.');
  });

  it('accepting twice, after a reload, or retrying a transfer already made moves nothing more', () => {
    const s = startLife('earn-twice');
    const a = delivered(s, 'Once');
    income(s, a, 20_000);
    const b = next(s);
    const d = approachBacker(s, b, 'earnings');
    acceptDeal(s, b, d.id);
    expect(() => acceptDeal(s, b, d.id)).toThrow('That offer is no longer open.');
    const back = deserialize(serialize(s));
    const [a2, b2] = [a.id, b.id].map((id) => back.projects.find((x) => x.id === id)!);
    expect([avail(a2), avail(b2)]).toEqual([0, 20_000]);
    expect(() => acceptDeal(back, b2, d.id)).toThrow('That offer is no longer open.');
    expect(option(back, b2, 'earnings')?.ready).toBe(false);
    // A retry of the same transfer, as if the acceptance had been lost but its budget lines kept, is refused.
    const d2 = deals(b2).find((x) => x.id === d.id)!;
    d2.status = 'offered';
    delete d2.transfer;
    income(back, a2, 20_000);
    const before = serialize(back);
    expect(() => acceptDeal(back, b2, d.id)).toThrow('This money has already been moved.');
    expect(serialize(back)).toBe(before);
    // So is one whose deal kept the transfer though the source's line was lost.
    d2.transfer = { id: `tr-${d.id}`, sources: [{ projectId: a2.id, amount: 20_000 }] };
    a2.obligations = a2.obligations.filter((o) => !o.ref?.startsWith('transfer:'));
    expect(() => acceptDeal(back, b2, d.id)).toThrow('This money has already been moved.');
  });
});

describe('income taken back after it was moved', () => {
  it('leaves nothing more to move, even money you put in, while the project is short', () => {
    const s = startLife('earn-clawback');
    const a = delivered(s, 'Clawed Back');
    backed(a, 'grant', 80_000);
    backed(a, 'capital', 20_000);
    spend(s, a, 'Crew', 'crew', 75_000, 'k1');
    income(s, a, 50_000);
    const b = next(s);
    acceptDeal(s, b, approachBacker(s, b, 'earnings').id);
    expect(moneyKept(a)).toMatchObject({ restricted: 5_000, capital: 20_000, earnings: 0 });
    a.revenue -= 50_000; // as cancelRelease takes a guarantee back (finish.ts)
    expect(avail(a)).toBe(-25_000);
    expect(ownMoney(s, b.id).capital).toEqual([]);
  });
});

describe('saves made under the earlier rule', () => {
  it('load with every balance as it was; the old move stays as history and nothing more moves out of that project', () => {
    const s = startLife('earn-legacy');
    const a = delivered(s, 'Before');
    backed(a, 'agreed', 60_000);
    delete a.finance!.deals[0].terms.unspent;
    spend(s, a, 'Crew', 'crew', 20_000, 'k1');
    const b = next(s, 'After');
    // What the old rule did: offered A's whole uncommitted 40,000 as earnings and paid it out with an earnings: key.
    const old: FinanceDeal = { id: 'fd-old', kind: 'earnings', backer: 'Your Earnings', amount: 30_000, status: 'accepted', askedAt: s.now, reason: 'Money your delivered projects kept.', received: 30_000, repaid: 0, terms: { recoup: 0, incomeShare: 0, approvalRights: [], credit: null, onDelivery: 0, deliverBy: null } };
    b.finance!.deals.push(old);
    b.funding.fund += 30_000;
    spend(s, a, 'Put Into After', 'finance', 30_000, 'earnings:fd-old');
    income(s, a, 25_000); // income after the old move
    const raw = JSON.parse(serialize(s));
    const back = deserialize(JSON.stringify(raw));
    expect(() => validateGameState(back)).not.toThrow();
    const [a2, b2] = [a.id, b.id].map((id) => back.projects.find((x) => x.id === id)!);
    for (const [x, y] of [[a, a2], [b, b2]]) expect(ledgerTotals(y)).toEqual(ledgerTotals(x));
    expect(totalMoney(back)).toBe(totalMoney(s));
    expect(b2.finance!.deals.find((d) => d.id === 'fd-old')).toEqual(old);
    expect(a2.obligations.find((o) => o.label === 'Put Into After')?.settled).toBe(30_000);
    expect(moneyKept(a2).oldMove?.label).toBe('Put Into After');
    const c = next(back, 'Later');
    expect(option(back, c, 'earnings')?.ready).toBe(false);
    expect(ownMoneyNotes(back, c)).toContain("$30,000 was moved out of Before under the earlier rule, which didn't tell its income from its production funding. That move stands, and no more money can move out of Before.");
    expect(moneyKept(b2)).toMatchObject({ capital: 0 }); // the old put-in records no owner, so it stays with After
  });
});
