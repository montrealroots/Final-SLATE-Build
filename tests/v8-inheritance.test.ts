// The v8 start (the owner's v8 package, 00 decisions 1-4, 02 "New-game setup"; A01, A13's wealth, A21's family
// contracts): 19, all four roles, one inheritance posted once, no family menus, no company. Each case reads the journal.
import { describe, expect, it } from 'vitest';
import { DAY, processUntil } from './engine-api';
import { companyBalance, formCompany } from '../src/engine/company';
import { INHERITANCE_MOST_MINOR, inheritanceDay, inheritanceStory, loanStanding, personalBalance, personalPostings } from '../src/engine/personal';
import { deserialize, serialize } from '../src/engine/save';
import { DEFAULT_INHERITANCE_MINOR, characterAge, emptyDraft, newGame, normalizeDraft, validateDraft } from '../src/engine/state';
import { reputation, standings } from '../src/engine/reputation';
import { born19, draft } from './fixtures';

const fresh = (over = {}, tag = 'v8-start') => newGame({ ...draft(), ...over }, 0, `save-${tag}`);

describe('A01: a new life starts at 19 with one inheritance', () => {
  it('posts $25,000,000 once, from the estate, with where it came from', () => {
    const s = fresh();
    expect(characterAge(s)).toBe(19);
    expect(personalBalance(s)).toBe(25_000_000);
    expect(personalPostings(s).map((p) => [p.kind, p.amount, p.key])).toEqual([['inheritance', 25_000_000, 'opening:inheritance']]);
    expect(s.money!.source).toMatchObject({ kind: 'inheritance', background: 'oil-family', currency: 'USD', amountMinor: 2_500_000_000, settledOffstage: true });
    expect(s.money!.family).toBeUndefined();
    expect(s.company).toBeUndefined();
  });

  it('a reload, a midnight and a year of days post nothing more: no allowance and no second deposit', () => {
    const s = fresh({}, 'v8-year');
    const back = deserialize(serialize(s));
    expect(personalPostings(back)).toHaveLength(1);
    processUntil(back, back.now + 400 * DAY, 'advance', 1_000_000);
    expect(personalPostings(back).filter((p) => p.kind === 'inheritance')).toHaveLength(1);
    expect(personalBalance(back)).toBe(25_000_000);
  });

  it('forming a company moves your money; it never deposits the inheritance again', () => {
    const s = fresh({}, 'v8-co');
    formCompany(s, 'Derrick Lane Pictures', 1_000_000);
    expect(personalBalance(s) + companyBalance(s)).toBe(25_000_000 - 300);
    expect(personalPostings(s).filter((p) => p.kind === 'inheritance')).toHaveLength(1);
  });

  it('is a default, not a fixed amount: changed before the start, refused past the cap or below nothing', () => {
    expect(emptyDraft().inheritance).toEqual({ currency: 'USD', amountMinor: DEFAULT_INHERITANCE_MINOR });
    const small = fresh({ inheritance: { currency: 'USD', amountMinor: 2_000_050 } }, 'v8-small');
    expect(personalBalance(small)).toBe(20_000.5);
    const none = fresh({ inheritance: { currency: 'USD', amountMinor: 0 } }, 'v8-none');
    expect([personalBalance(none), personalPostings(none).length]).toEqual([0, 0]);
    const field = (m: number) => validateDraft({ ...draft(), inheritance: { currency: 'USD', amountMinor: m } }).filter((p) => p.field === 'inheritance').map((p) => p.message);
    expect(field(INHERITANCE_MOST_MINOR)).toEqual([]);
    expect(field(INHERITANCE_MOST_MINOR + 1)).toEqual(['Your inheritance can be from nothing to $1,000,000,000.']);
    expect(field(-1)).toHaveLength(1);
    expect(field(0.5)).toHaveLength(1);
  });

  it('released on your 19th birthday: today if the story starts on it, else settled before it begins', () => {
    expect(inheritanceDay('2007-01-05', '2026-01-05')).toBe('2026-01-05');
    expect(inheritanceDay('2006-05-20', '2026-01-05')).toBe('2025-05-20');
    expect(inheritanceDay('2008-02-29', '2027-03-01')).toBe('2027-02-28');
    expect(inheritanceStory(2_500_000_000, '2026-01-05', '2026-01-05')).toMatch(/^Your family's wealth comes from oil\. Today, your nineteenth birthday, your inheritance is released\. You have \$25,000,000 available/);
    expect(inheritanceStory(2_500_000_000, '2025-05-20', '2026-01-05')).toContain('released on your nineteenth birthday, May 20, 2025, and is settled before your story begins');
    expect(fresh({ startDate: '2026-01-05', birthDate: '2006-05-20' }, 'v8-later').money!.source!.releasedOn).toBe('2025-05-20');
  });

  it('a saved draft from before keeps no family menus: its savings and family offer go, and the inheritance comes', () => {
    const d = normalizeDraft({ ...draft(), savings: 5_000, family: { circumstances: 'wealthy', support: 'loan', amount: 10_000 } })!;
    expect([d.savings, d.family, d.inheritance]).toEqual([undefined, undefined, { currency: 'USD', amountMinor: DEFAULT_INHERITANCE_MINOR }]);
    expect(personalPostings(newGame(d, 0, 'save-v8-norm')).map((p) => p.kind)).toEqual(['inheritance']);
  });
});

describe('A13: wealth buys things and nothing else', () => {
  it('a rich novice has the same standing in every role as one with nothing', () => {
    const rich = fresh({}, 'v8-rich');
    const poor = fresh({ inheritance: { currency: 'USD', amountMinor: 0 } }, 'v8-rich'); // the same world: same tag, name and dates
    expect([standings(rich), reputation(rich), rich.seed]).toEqual([standings(poor), reputation(poor), poor.seed]);
  });
});

describe('A21: an old family contract still runs', () => {
  it('a loan made before the v8 start is still repaid month by month', () => {
    // Labelled fixture: the v4 opening, which only a draft naming a family offer still makes (the screens no longer do).
    const s = newGame({ ...draft(), savings: 1_000, family: { circumstances: 'comfortable', support: 'loan', amount: 2_400 } }, 0, 'save-v8-loan');
    expect(personalPostings(s).map((p) => p.kind)).toEqual(['savings', 'loan']);
    processUntil(s, s.now + 31 * DAY, 'tick', 100_000);
    expect(loanStanding(s)).toEqual({ repaid: 100, owed: 2_300 });
    void born19;
  });
});
