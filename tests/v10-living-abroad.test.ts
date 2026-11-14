// Living abroad takes real papers (the owner, November 14, 2026: "make living abroad need real papers"). Until then the
// game assumed a life might live and work wherever it was lived. Now: citizenship, free movement, or a work visa. A life
// that starts abroad arrives on the visa (the owner chose that over arriving without one), its fee paid on the first day;
// it covers all four kinds of work and the stay, runs out on its real term, and can be renewed as its end nears.
import { describe, expect, it } from 'vitest';
import { DAY, processUntil } from './engine-api';
import { acceptRefusal } from '../src/engine/jobs';
import { applications, applyForPermit, entryRight, homeVisa, permitCheck, workRight } from '../src/engine/papers';
import { personalPostings } from '../src/engine/personal';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import { draft } from './fixtures';
import type { GameState } from '../src/engine/types';

const O1 = 'O-1 (extraordinary ability in the arts, or extraordinary achievement in motion pictures or television)';
const french = (startPlaceId: string, tag: string, over = {}) => newGame(draft({ startPlaceId, birthplaceId: 'fr-paris', nationalities: ['FR'], ...over }), 0, `save-${tag}`);
const four = (s: GameState, c: string) => (['act', 'direct', 'produce', 'write'] as const).map((a) => workRight(s, c, a).can);

describe('a life abroad arrives on the work visa it needs', () => {
  it('a French actress starting in Los Angeles holds the O-1 from the first day, its fee paid, for its three years', () => {
    const s = french('us-los-angeles', 'abroad-la');
    const [visa] = applications(s);
    expect(visa).toMatchObject({ kind: 'permit', all: true, arrival: true, country: 'US', route: O1, stage: 'issued', fee: { minor: 165_500, currency: 'USD', paidUsdMinor: 165_500 } });
    expect(visa.expiresAt! - s.now).toBe(1095 * DAY);
    expect(personalPostings(s).map((p) => [p.kind, p.amount])).toEqual([['inheritance', 25_000_000], ['papers', -1_655]]);
    expect(four(s, 'US')).toEqual([true, true, true, true]); // one visa where you live covers all four kinds of work
    expect(entryRight(s, 'US')).toMatchObject({ kind: 'lives' });
    expect(entryRight(s, 'US').why).toMatch(/^You live in the United States on your O-1 .+, good until \d{4}-\d{2}-\d{2}\.$/);
  });

  it('a citizen at home, or with free movement, holds no visa and pays nothing', () => {
    const paris = french('fr-paris', 'abroad-paris');
    const berlin = french('de-berlin', 'abroad-berlin');
    for (const s of [paris, berlin]) {
      expect(applications(s)).toEqual([]);
      expect(personalPostings(s).map((p) => p.kind)).toEqual(['inheritance']);
    }
    expect(four(berlin, 'DE')).toEqual([true, true, true, true]);
    expect(entryRight(berlin, 'DE').why).toBe('You live in Germany: your passport from France gives you the right to live and work there.');
  });

  it('a life that begins with less than the fee holds the visa, its fee paid before the story began', () => {
    const s = french('us-los-angeles', 'abroad-poor', { inheritance: { currency: 'USD', amountMinor: 0 } });
    expect(applications(s)[0]).toMatchObject({ stage: 'issued', fee: { paidUsdMinor: 0 } });
    expect(personalPostings(s)).toEqual([]);
  });
});

describe('the visa runs out, and is renewed', () => {
  it('ran out, she lives there without the right to, can\'t work there, and can\'t take a job there', () => {
    const s = french('us-los-angeles', 'abroad-lapse');
    const visa = applications(s)[0];
    processUntil(s, visa.expiresAt! + 1000, 'tick', 5_000_000);
    expect(visa.stage).toBe('expired');
    expect(four(s, 'US')).toEqual([false, false, false, false]);
    expect(entryRight(s, 'US')).toMatchObject({ kind: 'unpermitted' });
    expect(s.log.some((l) => l.text.startsWith(`Your ${O1} for the United States has run out. You live there without the right to now`))).toBe(true);
    (s.jobs ??= []).push({ id: 'la-job', role: 'acting', production: 'Harbour', company: 'Fixture Pictures', productionId: 'x', part: 'A part', dayRate: 400, days: ['2030-01-07'], placeId: 'us-los-angeles', zone: 'America/Los_Angeles', status: 'offered', offeredAt: s.now, answerBy: s.now + 7 * DAY, attended: [], missed: [] } as never);
    expect(acceptRefusal(s, 'la-job')).toMatch(/^To act in the United States you need O-1/);
    // Falsifiable: in force, the same job can be taken.
    const fresh = french('us-los-angeles', 'abroad-lapse');
    (fresh.jobs ??= []).push({ ...s.jobs.at(-1)!, answerBy: fresh.now + 7 * DAY, offeredAt: fresh.now } as never);
    expect(acceptRefusal(fresh, 'la-job')).toBeNull();
  }, 120_000);

  it('can be renewed once its end is nearer than its decision and a month, and the new one covers all four kinds of work', () => {
    const s = french('us-los-angeles', 'abroad-renew');
    const visa = applications(s)[0];
    expect(homeVisa(s)).toMatchObject({ renewable: false });
    expect(permitCheck(s, 'US')).toMatchObject({ ok: false });
    // The O-1 is decided in 135 days: renewable from 165 days before it runs out.
    processUntil(s, visa.expiresAt! - 166 * DAY, 'tick', 5_000_000);
    expect(homeVisa(s)!.renewable).toBe(false);
    processUntil(s, visa.expiresAt! - 164 * DAY, 'tick', 5_000_000);
    expect(homeVisa(s)!.renewable).toBe(true);
    const renewal = applyForPermit(s, 'US');
    expect(renewal).toMatchObject({ all: true, stage: 'applied', fee: { paidUsdMinor: 165_500 } });
    expect(permitCheck(s, 'US')).toEqual({ ok: false, why: 'Your application is being decided.' });
    processUntil(s, visa.expiresAt! + DAY, 'tick', 5_000_000);
    expect([visa.stage, renewal.stage]).toEqual(['expired', 'issued']);
    expect(four(s, 'US')).toEqual([true, true, true, true]);
    expect(entryRight(s, 'US')).toMatchObject({ kind: 'lives' });
  }, 120_000);
});

describe('a story from before', () => {
  it('a save abroad from before living there took papers holds the visa it arrived on, its fee taken as settled, once', () => {
    const s = french('us-los-angeles', 'abroad-old');
    s.paperApplications = [];
    delete s.papersArrival;
    s.events = s.events.filter((e) => e.kind !== 'papers-expiry');
    const postings = personalPostings(s).length;
    const back = deserialize(serialize(s));
    expect(applications(back)).toHaveLength(1);
    expect(applications(back)[0]).toMatchObject({ country: 'US', all: true, fee: { paidUsdMinor: 0 } });
    expect(personalPostings(back)).toHaveLength(postings); // no fee charged on loading
    expect(applications(deserialize(serialize(back)))).toHaveLength(1);
  });
});
