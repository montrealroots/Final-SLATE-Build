// A visit's days counted against its limit, and the border asking for them (papers.ts "staying", from November 16, 2026).
// Every career here is a Japanese actor living in Toronto, whose passport visits the Schengen area free for 90 days in
// any 180, Mexico free for 180 days a visit, and the United States and the United Kingdom on an electronic authorization.
import { describe, expect, it } from 'vitest';
import { DAY, processUntil } from './engine-api';
import { applications, applyForPermit, applyForVisa, barredFrom, entryRight, nextEntry, overstayDays, overstays, permitCheck, stayNow, stayStatus, stays, visaCheck } from '../src/engine/papers';
import { travelRefusal, travelTo } from '../src/engine/state';
import { deserialize, serialize } from '../src/engine/save';
import { dateKey } from '../src/engine/time';
import { sponsorIn, startLife } from './helpers';
import type { GameState } from '../src/engine/types';

const japanese = (tag: string, placeId = 'ca-toronto') => startLife(`stays-${tag}`, placeId, { nationalities: ['JP'], birthplaceId: 'jp-tokyo' } as never);
const go = (s: GameState, placeId: string) => processUntil(s, travelTo(s, placeId) + 1, 'tick', 1_000_000);
const day = (key: string) => Date.parse(`${key}T00:00:00Z`);
const plus = (key: string, n: number) => dateKey(day(key) + n * DAY, 'UTC');
const logged = (s: GameState, re: RegExp) => s.log.some((l) => re.test(l.text));
/** The day (UTC) the stay you're on began. */
const arrivedOn = (s: GameState) => dateKey(stays(s).at(-1)!.from, 'UTC');

describe('the Schengen area: 90 days in any 180, across all its states', () => {
  it('counts from the day you arrive, warns a week before the last, and records the overstay the day after', () => {
    const s = japanese('schengen');
    expect(stayStatus(s)).toBeUndefined(); // at home
    expect(stayNow(s)).toBe("You're in Canada, where you have the right to stay.");
    go(s, 'fr-paris');
    const arrived = arrivedOn(s);
    expect(stayNow(s)).toBe(`You're in France as a visitor: 1 of the 90 days in any 180 that the Schengen area allows are used. You may stay until ${plus(arrived, 89)}.`);
    expect(stayStatus(s)).toMatchObject({ used: 1, lastDay: plus(arrived, 89), over: false, limit: { area: 'the Schengen area', days: 90, within: 180 } });
    const last = plus(arrived, 89);
    processUntil(s, day(plus(last, -6)) - 1, 'tick', 5_000_000);
    expect(logged(s, /You may stay in the Schengen area until/)).toBe(false);
    processUntil(s, day(plus(last, -6)) + 1, 'tick', 5_000_000);
    expect(logged(s, new RegExp(`You may stay in the Schengen area until ${last} \\(90 days in any 180`))).toBe(true);
    processUntil(s, day(plus(last, 1)) - 1, 'tick', 5_000_000);
    expect(overstays(s)).toEqual([]);
    processUntil(s, day(plus(last, 1)) + 1, 'tick', 5_000_000);
    expect(overstays(s)).toEqual([{ country: 'FR', area: 'the Schengen area', from: day(plus(last, 1)) }]);
    expect(logged(s, /you're overstaying\. Each state decides for itself/)).toBe(true);
    expect(stayNow(s)).toBe(`You're in France, overstaying: your visit to the Schengen area ended on ${last}. Leave to end it.`);

    // Within the area there's no border: Berlin lets you in, and the overstay goes on.
    expect(travelRefusal(s, 'de-berlin')).toBeNull();
    go(s, 'de-berlin');
    expect(overstays(s)[0].left).toBeUndefined();
    expect(stayStatus(s)?.over).toBe(true);
    // Leaving the area ends it.
    go(s, 'ca-toronto');
    // One warning: none comes for a visit already over, as Berlin's arrival is.
    expect(s.log.filter((l) => /You may stay in/.test(l.text))).toHaveLength(1);
    const o = overstays(s)[0];
    expect(o.left).toBeDefined();
    expect(overstayDays(o, s.now)).toBe(1); // left on its first day
    expect(barredFrom(s, 'FR')).toBeUndefined(); // no bar the law fixes
  });

  it('refuses a visitor with no days left until the day one comes free, and lets them in that day', () => {
    const s = japanese('again');
    go(s, 'fr-paris');
    const arrived = arrivedOn(s);
    processUntil(s, day(plus(arrived, 89)) + 3_600_000, 'tick', 5_000_000); // the 90th day
    go(s, 'ca-toronto');
    const why = travelRefusal(s, 'it-rome');
    expect(why).toMatch(/^You've spent 90 of the 90 days in any 180 that the Schengen area allows a visitor\. You can enter again from (\d{4}-\d\d-\d\d)\.$/);
    const again = /from (\d{4}-\d\d-\d\d)/.exec(why!)![1];
    // The first day whose 180-day window, that day included, holds fewer than 90 days spent there.
    expect(again).toBe(plus(arrived, 180));
    processUntil(s, day(again) - 3_600_000, 'tick', 5_000_000);
    expect(nextEntry(s, 'IT')?.day).toBe(again);
    processUntil(s, day(again) + 3_600_000, 'tick', 5_000_000);
    expect(nextEntry(s, 'IT')).toBeUndefined();
    expect(travelRefusal(s, 'it-rome')).toBeNull();
  });

  it('counts days in every Schengen state as one, and stops where you leave', () => {
    const s = japanese('split');
    go(s, 'fr-paris');
    const first = arrivedOn(s);
    processUntil(s, day(plus(first, 29)) + 3_600_000, 'tick', 5_000_000);
    go(s, 'ca-toronto');
    processUntil(s, s.now + 20 * DAY, 'tick', 5_000_000);
    go(s, 'de-berlin');
    // 30 days in France (the day you left among them), and the first in Germany.
    expect(stayStatus(s)?.used).toBe(31);
    expect(stayStatus(s)?.lastDay).toBe(plus(arrivedOn(s), 59));
  });

  it("doesn't count the days where you live: a resident of France visits Germany on its own 90", () => {
    const s = japanese('resident', 'fr-paris');
    expect(stayStatus(s)).toBeUndefined();
    processUntil(s, s.now + 60 * DAY, 'tick', 5_000_000);
    go(s, 'de-berlin');
    expect(stayStatus(s)).toMatchObject({ used: 1, limit: { area: 'the Schengen area' } });
  });
});

describe('a visit that lasts so many days, or months', () => {
  it('Mexico lets you stay 180 days from the day you arrive', () => {
    const s = japanese('mexico');
    go(s, 'mx-mexico-city');
    const arrived = arrivedOn(s);
    expect(stayStatus(s)).toMatchObject({ used: 1, lastDay: plus(arrived, 179), limit: { area: 'Mexico', days: 180 } });
    expect(stayStatus(s)?.limit.within).toBeUndefined();
    expect(stayNow(s)).toBe(`You're in Mexico as a visitor, on day 1 of a visit that may last 180 days. You may stay until ${plus(arrived, 179)}.`);
    processUntil(s, day(plus(arrived, 180)) + 3_600_000, 'tick', 5_000_000);
    expect(overstays(s)).toMatchObject([{ country: 'MX', from: day(plus(arrived, 180)) }]);
    // Each visit on its own: a new one may begin the day you leave.
    go(s, 'ca-toronto');
    expect(travelRefusal(s, 'mx-mexico-city')).toBeNull();
  });
});

describe("one state's border", () => {
  it('a visit to the United States counts from Puerto Rico, inside its border; Hong Kong counts apart from China', () => {
    const s = japanese('border');
    const t0 = s.now;
    s.stays = [{ country: 'CA', from: t0, until: t0 + DAY, free: true }, { country: 'PR', from: t0 + DAY, until: t0 + 11 * DAY }, { country: 'US', from: t0 + 11 * DAY }];
    s.locationId = 'us-new-york';
    s.now = t0 + 20 * DAY;
    expect(stayStatus(s)).toMatchObject({ used: 20, lastDay: dateKey(t0 + 90 * DAY, 'UTC'), limit: { area: 'the United States', days: 90 } });
    s.stays = [{ country: 'CN', from: t0, until: t0 + 10 * DAY }, { country: 'HK', from: t0 + 10 * DAY }];
    expect(stayStatus(s)).toMatchObject({ used: 11, limit: { area: 'Hong Kong', days: 90 } });
  });
});

describe('what the law makes of an overstay', () => {
  const overstayed = (tag: string, country: string, days: number, leftAgo = 10) => {
    const s = japanese(tag);
    const left = s.now - leftAgo * DAY;
    s.overstays = [{ country, area: 'there', from: left - (days - 1) * DAY, left }]; // the first day and the last both count
    return s;
  };

  it('the United States bars you three years past 180 days, ten past a year, and its visa waiver never admits you again', () => {
    const three = overstayed('us-181', 'US', 181);
    expect(barredFrom(three, 'US')?.why).toMatch(/^You overstayed in the United States by 181 days\. Its law bars you for 3 years from the day you left, until \d{4}-\d\d-\d\d\.$/);
    expect(travelRefusal(three, 'us-new-york')).toBe(barredFrom(three, 'US')!.why);
    expect(visaCheck(three, 'US')).toEqual({ ok: false, why: barredFrom(three, 'US')!.why });
    const ten = overstayed('us-365', 'US', 365);
    expect(barredFrom(ten, 'US')?.why).toMatch(/bars you for 10 years/);
    const short = overstayed('us-180', 'US', 180);
    expect(barredFrom(short, 'US')).toBeUndefined();
    // No bar, but the Visa Waiver Program is closed to you: a visa it is.
    expect(entryRight(short, 'US')).toMatchObject({ kind: 'needs', entry: 'visa' });
    expect(entryRight(japanese('us-none'), 'US')).toMatchObject({ kind: 'needs', entry: 'eta' });
    // The bar ends when its years do.
    const old = overstayed('us-old', 'US', 181, 3 * 366);
    expect(barredFrom(old, 'US')).toBeUndefined();
  });

  it('overstaying in the United States voids the authorization you came on, and the next visit needs a visa', () => {
    const s = japanese('us-void');
    const esta = applyForVisa(s, 'US'); // an authorization under the Visa Waiver Program
    processUntil(s, esta.decideAt + 1000, 'tick', 5_000_000);
    if (esta.stage !== 'issued') throw new Error(`this seed's authorization was ${esta.stage}`);
    go(s, 'us-new-york');
    const last = stayStatus(s)!.lastDay;
    expect(stayStatus(s)?.limit).toMatchObject({ area: 'the United States', days: 90 });
    processUntil(s, day(plus(last, 1)) + 3_600_000, 'tick', 5_000_000);
    expect(overstays(s)).toMatchObject([{ country: 'US' }]);
    expect(esta.stage).toBe('expired');
    expect(s.log.some((l) => l.text.includes(`Your ${esta.route} is void.`))).toBe(true);
    go(s, 'ca-toronto');
    expect(entryRight(s, 'US')).toMatchObject({ kind: 'needs', entry: 'visa' });
    expect(travelRefusal(s, 'us-new-york')).toMatch(/Visa Waiver Program never admits a visitor who has: to visit, you need a visa\. Apply under Your Papers/);
  });

  it('the United Kingdom refuses you 12 months past 30 days, and not for 30', () => {
    const over = overstayed('gb-31', 'GB', 31);
    expect(barredFrom(over, 'GB')?.why).toMatch(/^You overstayed in the United Kingdom by 31 days\. Its rules refuse you entry for 12 months/);
    expect(travelRefusal(over, 'gb-london')).toBe(barredFrom(over, 'GB')!.why);
    expect(permitCheck(over, 'GB')).toEqual({ ok: false, why: barredFrom(over, 'GB')!.why });
    expect(barredFrom(overstayed('gb-30', 'GB', 30), 'GB')).toBeUndefined();
    expect(barredFrom(overstayed('gb-old', 'GB', 31, 366), 'GB')).toBeUndefined();
  });
});

describe('the right to stay', () => {
  it('a work visa issued while you visit ends the visit: the days before it still count, the days after it do not', () => {
    const s = japanese('permit');
    go(s, 'fr-paris');
    const visiting = stays(s).at(-1)!;
    sponsorIn(s, 'fr-paris');
    const a = applyForPermit(s, 'FR', 'direct'); // acting there needs none for 90 days
    processUntil(s, a.decideAt + 1000, 'tick', 5_000_000);
    expect(applications(s).find((x) => x.id === a.id)?.stage).toBe('issued');
    expect(visiting.until).toBeDefined();
    expect(stays(s).at(-1)).toMatchObject({ country: 'FR', free: true, from: visiting.until });
    expect(stayStatus(s)).toBeUndefined();
    expect(overstays(s)).toEqual([]);
  });

  it('a story from before stays were kept counts the stay it is on from the day it opens', () => {
    const s = japanese('old');
    go(s, 'fr-paris');
    processUntil(s, s.now + 40 * DAY, 'tick', 5_000_000);
    delete s.stays;
    const opened = deserialize(serialize(s));
    expect(opened.stays).toEqual([{ country: 'FR', from: opened.now }]);
    expect(stayStatus(opened)?.used).toBe(1);
  });
});
