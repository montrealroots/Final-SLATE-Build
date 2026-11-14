// Canonical money and the one journal (the owner's v8 package, 03 "Canonical money", 07 step 2; A02, A05, A07, A08, A09,
// A21's money). Each case changes an input and reads the balances the journal derives, never a typed number.
import { describe, expect, it } from 'vitest';
import { convert, formatMoney, fromMinor, monthlyDue, parseAmount, toMinor } from '../src/engine/cash/money';
import { available, captureHold, ensureAccount, exchange, held, outsideAccount, pendingIn, placeHold, postTx, posted, releaseHold, reverseTx, setTxStatus } from '../src/engine/cash/journal';
import { migrateV9toV10 } from '../src/engine/cash/migrate';
import { COMPANY_CASH, companyBalance, companyIntoProject, formCompany, moveCompanyMoney } from '../src/engine/company';
import { PERSONAL_CASH, personalBalance, personalPostings, postPersonal } from '../src/engine/personal';
import { financeSummary, setFinanceTarget } from '../src/engine/finance';
import { SaveFormatError, deserialize, memoryStore, openSave, serialize, writeSave } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import type { CreationDraft, GameState } from '../src/engine/types';
import { draft } from './fixtures';
import { approve, buildProject } from './helpers';

const life = (over: Partial<CreationDraft>, tag: string) => newGame({ ...draft(), ...over }, 0, `save-${tag}`);
const ok = (t: string, c: string) => { const r = parseAmount(t, c); if (!r.ok) throw new Error(r.reason); return r.minor; };
const no = (t: string, c: string) => { const r = parseAmount(t, c); expect(r.ok, t).toBe(false); return r.ok ? '' : r.reason; };

describe('A05: amounts typed by the player', () => {
  it('reads 20000, 20,000 and 2,000,000 exactly, in minor units', () => {
    expect(ok('20000', 'USD')).toBe(2_000_000);
    expect(ok('20,000', 'USD')).toBe(2_000_000);
    expect(ok('2,000,000', 'USD')).toBe(200_000_000);
    expect(ok('$2,000,000.50', 'USD')).toBe(200_000_050);
    expect(ok('0', 'USD')).toBe(0);
  });
  it('keeps each currency\'s own minor unit: none for yen, three places for dinars', () => {
    expect(ok('1,500', 'JPY')).toBe(1_500);
    expect(no('1,500.5', 'JPY')).toBe('Japanese Yen has no smaller unit: enter a whole amount.');
    expect(ok('1.250', 'KWD')).toBe(1_250);
    expect(no('1.2505', 'KWD')).toBe('Kuwaiti Dinar has 3 decimal places at most.');
    expect(formatMoney({ currency: 'KWD', minor: 1_250 })).toBe('KWD 1.250');
    expect(formatMoney({ currency: 'JPY', minor: 1_500 })).toBe('¥1,500');
    expect(formatMoney({ currency: 'USD', minor: 2_500_000_000 })).toBe('$25,000,000');
  });
  it('refuses negatives, exponents, infinity, excess decimals, overflow and mixed formats', () => {
    no('-5', 'USD'); no('1e6', 'USD'); no('Infinity', 'USD'); no('', 'USD');
    expect(no('10.005', 'USD')).toBe('US Dollar has 2 decimal places at most.');
    expect(no('90,071,992,547,409.92', 'USD')).toBe('That amount is too large.'); // one cent past the safe range
    expect(ok('90,071,992,547,409.91', 'USD')).toBe(Number.MAX_SAFE_INTEGER);
    expect(no('2.000.000,50', 'USD')).toMatch(/point for decimals/);
    no('20,00', 'USD'); no('1,0000', 'USD'); no('01', 'USD'); no('1 000', 'USD');
  });
  it('the adapter to the engine\'s whole dollars refuses what wouldn\'t survive', () => {
    expect(toMinor(25_000_000)).toBe(2_500_000_000);
    expect(fromMinor(2_500_000_000)).toBe(25_000_000);
    expect(() => toMinor(Number.MAX_SAFE_INTEGER)).toThrow(/too large/);
  });
});

describe('the journal', () => {
  const two = () => {
    const s = life({ savings: 0 }, 'journal');
    ensureAccount(s, { id: 'a', owner: 'player', type: 'asset', currency: 'USD', label: 'A' });
    ensureAccount(s, { id: 'b', owner: 'player', type: 'asset', currency: 'USD', label: 'B' });
    postTx(s, { key: 'fund', kind: 'test', memo: 'Labelled fixture', lines: [{ account: 'a', minor: 10_000 }, { account: outsideAccount(s, 'fixture', 'USD'), minor: -10_000 }] });
    return s;
  };

  it('refuses an unbalanced transaction, and a refused one changes nothing', () => {
    const s = two();
    expect(() => postTx(s, { key: 'x', kind: 't', memo: '', lines: [{ account: 'a', minor: -100 }, { account: 'b', minor: 99 }] })).toThrow("The lines don't balance in USD.");
    expect(() => postTx(s, { key: 'y', kind: 't', memo: '', lines: [{ account: 'a', minor: -20_000 }, { account: 'b', minor: 20_000 }] })).toThrow(/enough available/);
    expect(() => postTx(s, { key: 'z', kind: 't', memo: '', lines: [{ account: 'a', minor: -0.5 }, { account: 'b', minor: 0.5 }] })).toThrow(/whole number/);
    expect([posted(s, 'a'), posted(s, 'b'), s.journal!.txs.length]).toEqual([10_000, 0, 1]);
  });

  it('a key posted twice moves money once', () => {
    const s = two();
    const t = { key: 'move-1', kind: 't', memo: 'Move', lines: [{ account: 'a', minor: -3_000 }, { account: 'b', minor: 3_000 }] };
    const first = postTx(s, t);
    expect(postTx(s, t)).toBe(first);
    expect([posted(s, 'a'), posted(s, 'b')]).toEqual([7_000, 3_000]);
  });

  it('A07: a hold reduces what is available, and paying it doesn\'t count it twice; releasing frees it', () => {
    const s = two();
    const h = placeHold(s, 'deposit', 'a', 6_000, 'Deposit');
    expect([posted(s, 'a'), held(s, 'a'), available(s, 'a')]).toEqual([10_000, 6_000, 4_000]);
    expect(placeHold(s, 'deposit', 'a', 6_000, 'Deposit')).toBe(h); // idempotent
    expect(() => placeHold(s, 'other', 'a', 5_000, 'Too much')).toThrow(/enough available/);
    const pay = outsideAccount(s, 'supplier', 'USD');
    captureHold(s, h.id, { key: 'pay-deposit', kind: 't', memo: 'Deposit paid', lines: [{ account: 'a', minor: -6_000 }, { account: pay, minor: 6_000 }] });
    expect([posted(s, 'a'), held(s, 'a'), available(s, 'a')]).toEqual([4_000, 0, 4_000]); // 10,000 − 6,000, once
    const h2 = placeHold(s, 'refundable', 'a', 1_000, 'Refundable');
    releaseHold(s, h2.id);
    expect(available(s, 'a')).toBe(4_000);
  });

  it('pending money can\'t be spent until it settles; a failed one never counts; a reversal keeps history', () => {
    const s = two();
    const t = postTx(s, { key: 'inbound', kind: 't', memo: 'Wire', status: 'pending', lines: [{ account: 'b', minor: 5_000 }, { account: outsideAccount(s, 'wire', 'USD'), minor: -5_000 }] });
    expect([posted(s, 'b'), pendingIn(s, 'b'), available(s, 'b')]).toEqual([0, 5_000, 0]);
    setTxStatus(s, t.id, 'settled', 'arrived');
    expect(available(s, 'b')).toBe(5_000);
    const f = postTx(s, { key: 'inbound-2', kind: 't', memo: 'Wire', status: 'pending', lines: [{ account: 'b', minor: 1 }, { account: outsideAccount(s, 'wire', 'USD'), minor: -1 }] });
    setTxStatus(s, f.id, 'failed', 'returned');
    expect(posted(s, 'b')).toBe(5_000);
    const back = reverseTx(s, t.id, 'sent in error');
    expect([posted(s, 'b'), back.reverses, s.journal!.txs.find((x) => x.id === t.id)!.status]).toEqual([0, t.id, 'reversed']);
    expect(() => reverseTx(s, t.id, 'again')).toThrow(/Only a settled/);
  });

  it('A08: an exchange balances each currency, keeps its quote and fee, and a later rate changes nothing past', () => {
    const s = two();
    ensureAccount(s, { id: 'gbp', owner: 'player', type: 'asset', currency: 'GBP', label: 'Sterling' });
    const rate = { from: 'USD', to: 'GBP', num: 79, den: 100, asOf: '2026-11-14', source: 'Labelled fixture' };
    const tx = exchange(s, 'fx-1', 'a', 'gbp', 5_001, rate, 150);
    expect(convert({ currency: 'USD', minor: 5_001 }, rate).target.minor).toBe(3_951); // 3,950.79 rounds once
    expect([posted(s, 'a'), posted(s, 'gbp')]).toEqual([10_000 - 5_001 - 150, 3_951]);
    expect(tx.fx).toMatchObject({ source: { currency: 'USD', minor: 5_001 }, target: { currency: 'GBP', minor: 3_951 }, fee: { currency: 'USD', minor: 150 }, rate: { num: 79, den: 100, asOf: '2026-11-14' } });
    for (const cur of ['USD', 'GBP']) {
      const sum = tx.lines.filter((l) => s.journal!.accounts[l.account].currency === cur).reduce((a, l) => a + l.minor, 0);
      expect(sum, cur).toBe(0);
    }
    rate.num = 90; // a later quote
    expect(tx.fx!.rate.num).toBe(79);
    expect(posted(s, 'gbp')).toBe(3_951);
    // Yen has no minor unit and dinars three: exact both ways.
    expect(convert({ currency: 'JPY', minor: 1_000 }, { from: 'JPY', to: 'KWD', num: 2, den: 1000, asOf: 'x', source: 'f' }).target).toEqual({ currency: 'KWD', minor: 2_000 });
  });
});

describe('A09: monthly dates', () => {
  it('anchors on the start day and clamps to a short month, leap February included', () => {
    expect([0, 1, 2, 3].map((k) => monthlyDue('2027-01-31', k))).toEqual(['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30']);
    expect(monthlyDue('2028-01-31', 1)).toBe('2028-02-29');
    expect(monthlyDue('2026-12-15', 1)).toBe('2027-01-15');
  });
});

describe('A02: your money, your company\'s, and a project\'s', () => {
  it('moves conserve what is yours, the fee aside, and none is revenue', () => {
    const s = life({ savings: 20_000 }, 'a02');
    const yours = (g: GameState) => personalBalance(g) + companyBalance(g);
    const start = yours(s);
    formCompany(s, 'Tidewater Pictures', 5_000);
    expect(yours(s)).toBe(start - 300);
    moveCompanyMoney(s, 'in', 4_000);
    moveCompanyMoney(s, 'out', 1_000);
    expect(yours(s)).toBe(start - 300);
    // Each move between you and the company is one transaction with a line on each account.
    const moves = s.journal!.txs.filter((t) => t.lines.some((l) => l.account === PERSONAL_CASH) && t.lines.some((l) => l.account === COMPANY_CASH));
    expect(moves).toHaveLength(3);
    for (const t of moves) expect(t.lines.reduce((a, l) => a + l.minor, 0)).toBe(0);
    // Nothing reached an income account.
    expect(Object.values(s.journal!.accounts).filter((a) => a.type === 'income')).toEqual([]);
    const p = buildProject(s, { title: 'Harbour Lights', format: 'short', medium: 'live-action', runtime: 12, scenario: 'low' }, [{ name: 'Mara', patch: { roleSize: 'lead' } }], [{ place: 'Pier', chars: ['Mara'], minutes: 4 }]);
    approve(s, p);
    setFinanceTarget(p, financeSummary(p).promised + 50_000);
    const before = companyBalance(s);
    companyIntoProject(s, p, 2_000);
    expect(companyBalance(s)).toBe(before - 2_000);
    expect(posted(s, 'outside:projects:USD')).toBe(200_000); // the project's side, in cents
  });

  it('survives a save and reload with every cent and key, and a repeated key still moves once', () => {
    const s = life({ savings: 7_000 }, 'reload');
    postPersonal(s, 'paid-work', 1_234, 'Labelled fixture', 'job:x');
    const back = deserialize(serialize(s));
    expect(personalPostings(back)).toEqual(personalPostings(s));
    postPersonal(back, 'paid-work', 1_234, 'Labelled fixture', 'job:x');
    expect(personalBalance(back)).toBe(8_234);
  });
});

describe('A21: a save from version 9', () => {
  const v9 = () => {
    const s = life({ savings: 3_000 }, 'v9');
    // Labelled fixture: the shape a version-9 save had, postings on each account.
    const raw = JSON.parse(JSON.stringify(s));
    delete raw.journal;
    raw.version = 9;
    raw.money = { postings: [
      { id: 'pp-1', at: 0, kind: 'savings', amount: 3_000, label: 'Your Savings', key: 'opening:savings' },
      { id: 'pp-2', at: 10, kind: 'company', amount: -300, label: 'Forming Tide', key: 'company:form:co-1' },
      { id: 'pp-3', at: 10, kind: 'company', amount: -1_000, label: 'Put Into Tide', key: 'company:capital:co-1' },
      { id: 'pp-4', at: 20, kind: 'paid-work', amount: 500, label: 'Paid', key: 'job:1' },
      { id: 'pp-5', at: 21, kind: 'paid-work', amount: 500, label: 'Paid again under the same key', key: 'job:1' },
    ], family: { circumstances: 'comfortable', support: 'gift', amount: 0 } };
    raw.company = { name: 'Tide', foundedAt: 10, postings: [{ id: 'cp-1', at: 10, kind: 'capital', amount: 1_000, label: 'Put In By You When It Was Formed', key: 'capital:co-1' }] };
    return raw;
  };
  const envelope = (raw: Record<string, unknown>) => { const data = JSON.stringify(raw); return JSON.stringify({ format: 'slate-save', version: raw.version, checksum: hashOf(data), data }); };
  let hashOf: (s: string) => number;

  it('keeps every posting, cent for cent, with the family terms and the company', async () => {
    hashOf = (await import('../src/engine/rng')).hashString;
    const s = deserialize(envelope(v9()));
    expect(personalBalance(s)).toBe(3_000 - 300 - 1_000 + 500 + 500);
    expect(companyBalance(s)).toBe(1_000);
    expect(personalPostings(s).map((p) => [p.kind, p.amount, p.key])).toEqual([
      ['savings', 3_000, 'opening:savings'], ['company', -300, 'company:form:co-1'], ['company', -1_000, 'company:capital:co-1'], ['paid-work', 500, 'job:1'], ['paid-work', 500, 'job:1#pp-5'],
    ]);
    expect(s.money).toEqual({ family: { circumstances: 'comfortable', support: 'gift', amount: 0 } });
    expect(s.company).toEqual({ name: 'Tide', foundedAt: 10 });
    expect(posted(s, 'outside:company-transfers:USD')).toBe(0); // both sides of the old capital move arrived
    expect(posted(s, 'outside:formation:USD')).toBe(30_000); // the formation fee left you for the outside world
    expect(migrateV9toV10(migrateV9toV10(v9()))).toEqual(migrateV9toV10(v9())); // idempotent
  });

  it('a migration that can\'t reconcile opens nothing, and the stored save is left as it was', async () => {
    hashOf = (await import('../src/engine/rng')).hashString;
    const raw = v9();
    (raw.money as { postings: { amount: number }[] }).postings[3].amount = 500.005; // labelled fixture: a fraction of a cent
    const text = envelope(raw);
    expect(() => deserialize(text)).toThrow(SaveFormatError);
    const kv = memoryStore();
    const good = life({ savings: 1 }, 'v9-store');
    writeSave(kv, good, 1);
    const key = kv.keys().find((k) => k.endsWith(good.saveId))!;
    kv.setItem(key, text);
    expect(() => openSave(kv, good.saveId)).toThrow();
    expect(kv.getItem(key)).toBe(text); // the stored save, unchanged
    expect(kv.keys().filter((k) => kv.getItem(k) === text).length).toBeGreaterThanOrEqual(2); // and the copy kept before the upgrade
  });
});
