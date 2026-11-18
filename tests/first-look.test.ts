// First-look deals (src/engine/first-look.ts; the owner's v5 brief, 5). Every studio here is a made-up fixture, and every
// amount is the game's calibration by a studio's recorded scale. Controlled comparisons: the same save with and without
// a record, with and without a deal, a pass and a take.
import { describe, expect, it } from 'vitest';
import { DAY, acceptDeal, createProject, deserialize, processUntil, serialize, setFinanceTarget } from './engine-api';
import { backerOptions, dealTerms, pitchToStudio, studioOption, submitSeries } from '../src/engine/finance';
import { acceptJob, acceptRefusal, moveJob } from '../src/engine/jobs';
import { companyBalance } from '../src/engine/company';
import { personalBalance, personalStatement, postPersonal } from '../src/engine/personal';
import {
  dealTier,
  FIRST_LOOK_NOTICE_DAYS, acceptFirstLook, activeFirstLook, askMoreOverhead, askToMatch, declineFirstLook, matchRefusal, openFirstLookOffers, developmentRefusal, drawDevelopment, endFirstLook,
  covers, firstLookCandidate, firstLookTerms, firstLooks, seriesJudgement, offerWords, fundLeft, offerFirstLook, scheduleFirstLookCheck, scopeOf, submissionStanding,
} from '../src/engine/first-look';
import { slateRoom, strategyOf } from '../src/engine/strategy';
import type { StudioProfile } from '../src/engine/studios';
import type { Format, GameState, Medium, Project } from '../src/engine/types';
import { validateGameState } from '../src/engine/validate';
import { approve, buildProject, startLife, writePitch } from './helpers';

const EVEN = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
const HORROR: StudioProfile = { c: 'company:fixture-horror', name: 'Night Shift Pictures (Fixture)', n: 5, g: [['Horror', 10], ['Thriller', 6], ['Drama', 2]], m: EVEN, ann: {} };
const FAMILY: StudioProfile = { c: 'company:fixture-family', name: 'Sunday Matinee (Fixture)', n: 4, g: [['Family', 8], ['Comedy', 8], ['Romance', 4]], m: EVEN, ann: {} };
const BIG: StudioProfile = { c: 'company:fixture-big', name: 'Meridian (Fixture)', n: 12, g: [['Horror', 6], ['Action', 6], ['Drama', 6]], m: EVEN, ann: {} };

function world(tag: string, studios: StudioProfile[]): GameState {
  for (let i = 0; i < 40; i++) {
    const s = startLife(`${tag}-${i}`, 'gb-london', { savings: 2_000 });
    s.industry = { horizon: '2026-11-10', builtAt: '2026-11-10T00:00:00Z', series: {}, studios };
    if (studios.every((x) => slateRoom(s.seed, '2026-11-10', x, 2027).room > 1)) return s;
  }
  throw new Error('No world with room on every slate.');
}
function feature(s: GameState, o: { title?: string; format?: Format; medium?: Medium; genres?: string[] } = {}): Project {
  const p = createProject(s, { title: o.title ?? 'The Long Night', scenarioId: 'low', axes: { format: o.format ?? 'feature', medium: o.medium ?? 'live-action', targetRuntimeMin: o.format === 'short' ? 10 : 90 } });
  const q = buildProject(s, { title: 'tmp', format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ines', patch: { roleSize: 'lead' } }], [{ place: 'Dock', chars: ['Ines'], minutes: 3 }]);
  p.characters = q.characters;
  p.scenes = q.scenes;
  writePitch(p);
  s.projects = s.projects.filter((x) => x.id !== q.id);
  p.axes.genres = (o.genres ?? ['horror']).map((id, i) => ({ id, emphasis: i === 0 ? 'primary' as const : 'secondary' as const }));
  approve(s, p);
  setFinanceTarget(p, 400_000);
  return p;
}
/** A delivered horror film of yours (labelled fixture), received as given. */
function record(s: GameState, reception: number): Project {
  const p = feature(s, { title: 'An Earlier Film' });
  p.delivered = { at: s.now, runtimeMin: 90 };
  p.phase = 'delivered';
  p.quality = { reception };
  return p;
}
const wait = (s: GameState, days: number) => processUntil(s, s.now + days * DAY, 'tick', 100_000);
/** A save with a running deal with the horror studio. */
function signed(tag: string, studios = [HORROR, FAMILY]): GameState {
  const s = world(tag, studios);
  record(s, 66);
  acceptFirstLook(s, offerFirstLook(s)!.id);
  return s;
}

describe('an offer', () => {
  it('comes only after delivered work a studio would want more of, from the studio it fits best', () => {
    const s = world('fl-offer', [HORROR, FAMILY]);
    expect(firstLookCandidate(s)).toBeNull(); // nothing delivered
    const p = record(s, 50);
    expect(firstLookCandidate(s)).toBeNull(); // received too coolly
    p.quality = { reception: 66 };
    const c = firstLookCandidate(s)!;
    expect(c.company).toBe(HORROR.c);
    expect(c.why).toBe('Your film sits with what Night Shift Pictures (Fixture) makes, most of all horror. How well your work was received counted.');
  });

  it('has terms by the studio\'s recorded scale, shown in full before anything binds', () => {
    // The yearly overhead from the package's calibration for the record (deal-model.json), placed by the studio's scale and
    // paid a twelfth a month (from November 14, 2026; $3,500 and $6,000 a month by scale alone before).
    expect(firstLookTerms(strategyOf(HORROR))).toEqual({ months: 12, considerDays: 60, overhead: 16_700, fund: 50_000, animatedOnly: false, tier: 'emerging', annualOverhead: 200_400 });
    expect(firstLookTerms(strategyOf(BIG))).toEqual({ months: 12, considerDays: 90, overhead: 25_000, fund: 100_000, animatedOnly: false, tier: 'emerging', annualOverhead: 300_000 });
    // A better record moves the range and the term, never the money you have.
    expect(firstLookTerms(strategyOf(BIG), 'film', 'proven')).toMatchObject({ months: 24, annualOverhead: 999_600 });
    // Never past the band's $8m top: until November 18, 2026 the rounding offered $8,000,400.
    expect(firstLookTerms(strategyOf(BIG), 'film', 'elite')).toMatchObject({ months: 60, annualOverhead: 7_999_200 });
    for (const t of ['emerging', 'proven', 'established', 'elite'] as const) { const x = firstLookTerms(strategyOf(HORROR), 'film', t); expect(x.overhead * 12).toBe(x.annualOverhead); }
    const s = world('fl-words', [HORROR]);
    record(s, 66);
    const fl = offerFirstLook(s)!;
    expect(fl.status).toBe('offered');
    // Said as a studio would (from November 18, 2026): what it is and what it's worth, then broken down.
    const w = offerWords(fl);
    expect(w.pitch).toBe('Night Shift Pictures (Fixture) wants first look at your next films: $16,700 a month toward your office for a year, $200,400 in all. Bring them each one first; they have 60 days to say yes before you can take it elsewhere.');
    expect(w.rows.map(([k]) => k)).toEqual(['Toward Your Office', 'How Long', 'They Get', 'Their Answer', 'Development Money', 'Ending Early', 'Set For']);
    expect(Object.fromEntries(w.rows)['Their Answer']).toBe("Within 60 days of each one; if they pass, it's yours to take elsewhere");
    expect(personalBalance(s)).toBe(2_000); // nothing paid before acceptance
    expect(offerFirstLook(s)).toBeNull(); // one offer at a time (a second studio offers alongside it only for a record past its start)
  });

  it('arrives by itself some weeks after a delivery, and lapses unanswered', () => {
    const s = world('fl-arrive', [HORROR]);
    const p = record(s, 66);
    scheduleFirstLookCheck(s, p);
    wait(s, FIRST_LOOK_NOTICE_DAYS + 1);
    const fl = s.firstLooks![0];
    expect([fl.company, fl.status]).toEqual([HORROR.c, 'offered']);
    wait(s, 31);
    expect(fl.status).toBe('lapsed');
    expect(firstLookCandidate(s)).toBeNull(); // it doesn't ask again within the year
  });

  it('can be asked once for more overhead: agreed for a record well above the bar, held otherwise', () => {
    for (const [reception, outcome, overhead] of [[75, 'agreed', 25_050], [62, 'held', 16_700]] as const) {
      const s = world(`fl-counter-${reception}`, [HORROR]);
      record(s, reception);
      const fl = offerFirstLook(s)!;
      askMoreOverhead(s, fl.id);
      expect(() => acceptFirstLook(s, fl.id)).toThrow('is considering the overhead you asked for');
      expect(() => askMoreOverhead(s, fl.id)).toThrow('You have asked once already.');
      wait(s, 8);
      expect([fl.counter!.outcome, fl.terms.overhead, fl.status]).toEqual([outcome, overhead, 'offered']);
    }
  });

  it('declined, binds nothing', () => {
    const s = world('fl-decline', [HORROR]);
    record(s, 66);
    const fl = offerFirstLook(s)!;
    declineFirstLook(s, fl.id);
    expect([fl.status, activeFirstLook(s)]).toEqual(['declined', null]);
    expect(() => acceptFirstLook(s, fl.id)).toThrow('That offer is no longer open.');
  });
});

const MONTHLY = firstLookTerms(strategyOf(HORROR)).overhead; // an emerging record, a mid-sized studio

describe('a running deal', () => {
  it('pays overhead monthly into your own account; only a deal signed while an old save\'s company held it pays the company', () => {
    const own = signed('fl-own');
    expect(personalBalance(own)).toBe(2_000 + MONTHLY);
    wait(own, 61);
    expect(personalBalance(own)).toBe(2_000 + 3 * MONTHLY);
    // Labelled fixture: a company from a save before November 14, 2026. A deal signed now pays you, not it.
    const co = world('fl-co', [HORROR]);
    record(co, 66);
    co.company = { name: 'Tidewater Pictures', foundedAt: co.now, status: 'registered' };
    const id = offerFirstLook(co)!.id;
    acceptFirstLook(co, id);
    const fl = co.firstLooks!.find((x) => x.id === id)!;
    wait(co, 31);
    expect([companyBalance(co), personalBalance(co)]).toEqual([0, 2_000 + 2 * MONTHLY]);
    // The same deal marked as signed while the company held it (cash/migrate11.ts sets `payee`) pays the company.
    fl.payee = 'company';
    wait(co, 30);
    expect([companyBalance(co), personalBalance(co)]).toEqual([MONTHLY, 2_000 + 2 * MONTHLY]);
  });

  it('makes a covered film go to the studio first, with its own days to answer; another studio can be pitched only after a pass', () => {
    const s = signed('fl-submit');
    const p = feature(s, { title: 'Sunday Best', genres: ['family'] });
    expect(studioOption(s, p, FAMILY.c)!.needs).toBe('Your first-look deal gives Night Shift Pictures (Fixture) the first chance at Sunday Best: submit it to them first.');
    expect(() => pitchToStudio(s, p, FAMILY.c)).toThrow('submit it to them first');
    const sub = pitchToStudio(s, p, HORROR.c);
    expect(Math.round((sub.decideAt! - sub.askedAt) / DAY)).toBe(60);
    expect(studioOption(s, p, FAMILY.c)!.needs).toMatch(/^Night Shift Pictures \(Fixture\) is considering it under your first-look deal, until [A-Z][a-z]+ \d{1,2}, \d{4}\.$/);
    wait(s, 61);
    expect(submissionStanding(s, p)!.stage).toBe('turnaround'); // a family film isn't what it makes
    expect(studioOption(s, p, FAMILY.c)!.needs).toBe('');
    // A series isn't covered, nor is anything once no deal runs.
    expect(submissionStanding(s, createProject(s, { title: 'A Series', scenarioId: 'low', axes: { format: 'series', medium: 'live-action', targetRuntimeMin: 30 } }))).toBeNull();
  });

  it('a covered short is weighed by the deal\'s studio, not turned down for being a short; another studio still is', () => {
    const s = signed('fl-short');
    const short = feature(s, { title: 'Last Tram', format: 'short' });
    const theirs = studioOption(s, short, HORROR.c)!.read;
    expect(theirs.for).toContain('Your first-look deal with it covers this short film.');
    expect(theirs.against.join(' ')).not.toContain("isn't something it takes on");
    expect(theirs.verdict).not.toBe('pass'); // a horror short, from a filmmaker whose horror it wanted more of
    // Under the deal, what the studio makes still counts: a family short gets the notes a family feature would, for that,
    // not a pass for being a short (and notes under the deal leave the film free to go elsewhere, as Sunday Best does).
    const family = studioOption(s, feature(s, { title: 'Night Bus', format: 'short', genres: ['family'] }), HORROR.c)!.read;
    expect([family.verdict, family.against[0], family.next]).toEqual(['notes', 'Nothing like it is in its record: its films are mostly Horror, Thriller, Drama.', 'It would read a film nearer to what it makes.']);
    expect(studioOption(s, short, FAMILY.c)!.read.against[0]).toBe("Sunday Matinee (Fixture)'s record here is feature films. A short film isn't something it takes on.");
    endFirstLook(s, activeFirstLook(s)!.id);
    expect(studioOption(s, short, HORROR.c)!.read.against[0]).toBe("Night Shift Pictures (Fixture)'s record here is feature films. A short film isn't something it takes on.");
  });

  it('puts development money into a covered film; repaid once from another studio\'s money when it takes a film the first look passed on', () => {
    const s = signed('fl-turnaround');
    const p = feature(s, { title: 'Sunday Best', genres: ['family'] });
    expect(developmentRefusal(s, p, 60_000)).toBe('The deal has $50,000 of development money left.');
    const dev = drawDevelopment(s, p, 20_000);
    expect([dev.kind, dev.backer, dev.received, fundLeft(activeFirstLook(s)!)]).toEqual(['first-look', 'Night Shift Pictures (Fixture)', 20_000, 30_000]);
    pitchToStudio(s, p, HORROR.c);
    expect(developmentRefusal(s, p, 1_000)).toBe('Sunday Best is already submitted to Night Shift Pictures (Fixture).');
    wait(s, 61);
    approve(s, p); // a newer draft for the next studio
    const other = pitchToStudio(s, p, FAMILY.c);
    wait(s, 15);
    expect(other.status).toBe('offered');
    acceptDeal(s, p, other.id);
    const repaid = p.obligations.filter((o) => o.ref?.startsWith('turnaround:'));
    expect(repaid.map((o) => [o.label, o.settled])).toEqual([['Development Money Repaid To Night Shift Pictures (Fixture)', 20_000]]);
  });

  it('lets one studio release a film: a second studio\'s offer can\'t be accepted once one backs it', () => {
    const s = world('fl-one-studio', [HORROR, BIG]);
    record(s, 72);
    const p = feature(s);
    const a = pitchToStudio(s, p, HORROR.c);
    const b = pitchToStudio(s, p, BIG.c);
    wait(s, 15);
    expect([a.status, b.status]).toEqual(['offered', 'offered']);
    acceptDeal(s, p, a.id);
    expect(() => acceptDeal(s, p, b.id)).toThrow('Night Shift Pictures (Fixture) already backs it as its studio, with its own release. One studio releases a film.');
  });

  it('allows one deal at a time; ended early, the overhead stops and the development money stays owed', () => {
    const s = signed('fl-end');
    const fl = activeFirstLook(s)!;
    const p = feature(s, { title: 'Sunday Best', genres: ['family'] });
    drawDevelopment(s, p, 10_000);
    endFirstLook(s, fl.id);
    const paid = personalBalance(s);
    wait(s, 61);
    expect(personalBalance(s)).toBe(paid);
    // The film its money is in still goes to it first.
    expect(studioOption(s, p, FAMILY.c)!.needs).toContain('submit it to them first');
  });

  it('is renewed at its end when the record still counts, and kept whole through a save', () => {
    const s = signed('fl-renew');
    const fl = activeFirstLook(s)!;
    expect(deserialize(serialize(s)).firstLooks).toEqual(s.firstLooks);
    expect(() => validateGameState(JSON.parse(JSON.stringify(s)))).not.toThrow();
    wait(s, 12 * 30 + 1);
    expect(fl.status).toBe('ended');
    const again = s.firstLooks!.find((x) => x.renews === fl.id)!;
    expect([again.status, again.company]).toEqual(['offered', HORROR.c]);
  });
});

describe('studios too thin to read, tied on fit (November 14, 2026)', () => {
  // Labelled fixtures: two studios under two films a year, so the same fit for anything; the one alphabetically first
  // has none of the work's genre, the other has some.
  const AARDVARK: StudioProfile = { c: 'company:fixture-aardvark', name: 'Aardvark Films (Fixture)', n: 1.8, g: [['Comedy', 3]], m: EVEN, ann: {} };
  const ZEPHYR: StudioProfile = { c: 'company:fixture-zephyr', name: 'Zephyr Pictures (Fixture)', n: 1.8, g: [['Horror', 2], ['Comedy', 1]], m: EVEN, ann: {} };
  it('goes to the one whose few credits are nearer the work, not the first name', () => {
    const s = world('fl-thin', [AARDVARK, ZEPHYR]);
    record(s, 70); // a horror film
    expect(firstLookCandidate(s)!.company).toBe(ZEPHYR.c);
  });
});

describe('a television first-look deal (the v6 package, J13; the v7 package, DEAL02: TV scope)', () => {
  /** A save whose delivered work is a well-received horror series (labelled fixture: a delivered film marked a series). */
  // Labelled fixture: the horror studio's television record, as the series the world follows would give it (studios.ts
  // withSeriesRecord). TMDB's TV genres have no Horror, so the series here are crime, which they do have.
  const HORROR_TV: StudioProfile = { ...HORROR, tv: { n: 12, g: [['Crime', 6], ['Drama', 6], ['Mystery', 3]] } };
  function tvWorld(tag: string, studios = [HORROR_TV, FAMILY]): GameState {
    const s = world(tag, studios);
    const p = record(s, 66);
    p.axes.format = 'series';
    p.axes.genres = [{ id: 'crime', emphasis: 'primary' }];
    return s;
  }
  const series = (s: GameState, title: string, genres = ['crime']) => { const p = feature(s, { title, genres }); p.axes.format = 'series'; return p; }; // labelled: a series to submit

  it('comes only from a company with series on its record, judged on them (November 14, 2026)', () => {
    // A film studio with no series doesn't offer a television deal, however well its films fit; until then the horror
    // studio below, read on its films, could have.
    expect(firstLookCandidate(tvWorld('fl-tv-film-only', [HORROR, FAMILY]), 'television')).toBeNull();
    const c = firstLookCandidate(tvWorld('fl-tv-record'), 'television')!;
    expect([c.company, c.strategy.pace]).toEqual([HORROR.c, 12]); // its pace here is its series, not its 5 films a year
    expect(c.why).toBe(`Your series sits with what ${HORROR.name} makes, most of all crime. How well your work was received counted.`);
    expect(firstLookTerms(c.strategy, 'television')).toMatchObject({ considerDays: 60, overhead: 16_700 }); // 12 series: mid-sized
    // Its read of a series says series, from its series' genres, and claims no slate it doesn't model.
    const s = tvWorld('fl-tv-read');
    const read = studioOption(s, series(s, 'Night Watch'), HORROR.c, 'television')!.read;
    expect(read.for).toContain('It makes this kind of series: Crime is 40% of the genre credits on its series.');
    expect(read.for.join(' ')).not.toMatch(/slate|film/);
  });

  it('comes after delivered series, covers series and not films, and says so in its terms', () => {
    const s = tvWorld('fl-tv-offer');
    expect(firstLookCandidate(s, 'film')).toBeNull(); // no delivered film
    const fl = offerFirstLook(s, undefined, 'television')!;
    expect([fl.name, scopeOf(fl.terms)]).toEqual([HORROR.name, 'television']);
    expect(offerWords(fl).pitch).toContain('wants first look at your next series');
    expect(Object.fromEntries(offerWords(fl).rows)['They Get']).toBe('The first chance at every series you make, before any commissioner; not your films');
    acceptFirstLook(s, fl.id);
    expect(covers(fl, series(s, 'Night Watch'))).toBe(true);
    expect(covers(fl, feature(s, { title: 'A Film Outside It' }))).toBe(false);
  });

  it('holds a covered series from any commissioner until the company answers; its answer is its read, not chance', () => {
    const answers = [0, 1].map((k) => {
      const s = tvWorld(`fl-tv-submit-${k}`);
      acceptFirstLook(s, offerFirstLook(s, undefined, 'television')!.id);
      const p = series(s, 'Night Watch');
      const commissioner = () => backerOptions(s, p).find((o) => o.kind === 'commissioner')!;
      expect(commissioner().needs).toBe(`Your first-look deal gives ${HORROR.name} the first chance at Night Watch: submit it to them first.`);
      const d = submitSeries(s, p);
      expect([d.kind, d.backer, d.firstLook, Math.round((d.decideAt! - d.askedAt) / DAY)]).toEqual(['commissioner', HORROR.name, activeFirstLook(s)!.id, activeFirstLook(s)!.terms.considerDays]);
      expect(commissioner().needs).toBe('Already approached for this project.'); // the submission is in front of it
      wait(s, activeFirstLook(s)!.terms.considerDays + 1);
      const read = studioOption(s, p, HORROR.c, 'television')!.read; // read on its series, as the decision reads it
      return { status: d.status, verdict: read.verdict, hold: commissioner().needs };
    });
    // The same facts give the same answer: an offer to commission it, or a pass that frees it for a commissioner.
    expect(answers[0].verdict).toBe(answers[1].verdict);
    for (const a of answers) {
      if (a.verdict === 'offer' || a.verdict === 'option') expect(a.status).toBe('offered');
      else { expect(a.status).toBe('declined'); expect(a.hold).not.toMatch(/first-look/); }
    }
  });

  // J13 (from November 17, 2026): what the deal holds a commissioned season to, and its renewal judged on how the series did.
  it("a season it commissions is owed by a date, or what it paid in is repaid", () => {
    // Labelled search: worlds until one whose company commissions the series (its read is the same on the same facts).
    for (let k = 0; k < 12; k++) {
      const s = tvWorld(`fl-tv-owed-${k}`);
      acceptFirstLook(s, offerFirstLook(s, undefined, 'television')!.id);
      const p = series(s, 'Night Watch');
      const d = submitSeries(s, p);
      wait(s, activeFirstLook(s)!.terms.considerDays + 1);
      if (d.status !== 'offered') continue;
      expect(Math.round((d.terms.deliverBy! - s.now) / DAY)).toBeGreaterThan(600);
      expect(dealTerms(d).join(' ')).toMatch(/Deliver by \d{4}-\d{2}-\d{2}, or what they paid in must be repaid\./);
      return;
    }
    throw new Error('No world in twelve where the company commissioned the series.');
  });

  it("is renewed at its term if a series it commissioned was renewed, and not if they were all cancelled", () => {
    const run = (outcome: 'renewed' | 'cancelled' | 'ended') => {
      const s = tvWorld(`fl-tv-judged-${outcome}`);
      const fl = offerFirstLook(s, undefined, 'television')!;
      acceptFirstLook(s, fl.id);
      // Labelled fixture: a series it commissioned under the deal, delivered and decided by its commissioner.
      const p = series(s, 'Night Watch');
      p.finance!.deals.push({ id: 'fd-fixture-tv', kind: 'commissioner', backer: fl.name, amount: 400_000, status: 'accepted', askedAt: s.now, reason: '', received: 400_000, repaid: 0, firstLook: fl.id, terms: { recoup: 0, incomeShare: 0.85, approvalRights: [], credit: 'Commissioned By', onDelivery: 0, deliverBy: null } } as never);
      fl.submissions.push({ projectId: p.id, dealId: 'fd-fixture-tv', at: s.now });
      p.delivered = { at: s.now, runtimeMin: 90 };
      p.renewal = { decidedAt: s.now, outcome, reason: 'Fixture.' };
      const judged = seriesJudgement(s, fl);
      wait(s, Math.ceil((fl.endsAt! - s.now) / DAY) + 1);
      return { judged, again: firstLooks(s).some((x) => x.renews === fl.id) };
    };
    expect(run('renewed')).toEqual({ judged: { keep: true, why: 'Night Watch, a series it commissioned under the deal, was renewed.' }, again: true });
    // Taken, and a record that counts: until November 17, 2026 that renewed it; a cancelled series now ends it.
    expect(run('cancelled')).toEqual({ judged: { keep: false, why: "Night Watch, which it commissioned under the deal, wasn't renewed." }, again: false });
    // A season you ended as planned says nothing either way: the deal is judged as before, on the series taken.
    expect(run('ended')).toEqual({ judged: null, again: true });
  });

  it('a film deal is never judged on series', () => {
    const s = signed('fl-film-judged');
    expect(seriesJudgement(s, activeFirstLook(s)!)).toBeNull();
  });
});

// The owner's v8 package, A13 (from November 14, 2026): an inheritance buys things, not a studio's trust.
describe('A13: what a record earns, and what money doesn\'t', () => {
  it('a rich novice gets no offer and no better tier; delivered, well-received work moves the tier', () => {
    const rich = world('fl-rich', [HORROR]);
    postPersonal(rich, 'inheritance', 25_000_000, 'Labelled fixture: an inheritance', 'fixture:rich');
    expect([dealTier(rich), offerFirstLook(rich)]).toEqual(['emerging', null]);
    record(rich, 66);
    expect(dealTier(rich)).toBe('emerging'); // one work is a start
    record(rich, 72);
    expect(dealTier(rich)).toBe('proven');
    const fl = offerFirstLook(rich)!;
    expect([fl.terms.tier, fl.terms.months]).toEqual(['proven', 24]);
  });
});

// The owner's v8 package, A14 (from November 17, 2026): an overall deal. A large studio offers one for a record past its
// start; its yearly guarantee is your pay, a twelfth a month, never the term's headline at signing; it has your services
// exclusively, and your films and series both.
describe('A14: an overall deal', () => {
  /** A proven record (two well-received films) in a world whose only fitting studio makes twelve films a year. */
  function proven(tag: string, studios = [BIG]): GameState {
    const s = world(tag, studios);
    record(s, 66);
    record(s, 72);
    return s;
  }
  const paid = (s: GameState, kind: string) => personalStatement(s).find((x) => x.kind === kind)?.total ?? 0;
  const guaranteePaid = (s: GameState) => paid(s, 'guarantee');
  const job = (s: GameState, company: string) => {
    (s.jobs ??= []).push({ id: `job-${company}`, role: 'acting', production: 'Fixture', company, dayRate: 300, days: ['2027-06-01'], placeId: s.locationId, zone: 'Europe/London', status: 'offered', offeredAt: s.now, answerBy: s.now + 7 * DAY, attended: [], missed: [] });
    return `job-${company}`;
  };

  it('comes from a large studio for a record past its start, never to a beginner, never from a small studio', () => {
    const s = proven('ov-offer');
    const fl = offerFirstLook(s)!;
    expect(fl.terms.overall).toBeDefined();
    expect([fl.terms.tier, fl.terms.months, fl.terms.overhead]).toEqual(['proven', 24, 0]);
    // The proven band (deal-model.json): $1m to $5m a year, placed by the studio's scale (twelve films a year).
    expect(fl.terms.overall!.annual).toBeGreaterThanOrEqual(1_000_000);
    expect(fl.terms.overall!.annual).toBeLessThanOrEqual(5_000_000);
    expect(offerWords(fl).pitch).toMatch(/wants you on an overall deal for two years: \$[\d,]+ a year for your services, \$[\d,]+ in all\. Everything you make goes to them first, and you work for no one else while it runs\./);
    expect(Object.fromEntries(offerWords(fl).rows)['Your Pay']).toMatch(/nothing up front$/);
    // The same record with a small studio is offered a first look; one film with a large studio, a first look too.
    expect(offerFirstLook(proven('ov-small', [HORROR]))!.terms.overall).toBeUndefined();
    const start = world('ov-start', [BIG]);
    record(start, 66);
    expect(offerFirstLook(start)!.terms.overall).toBeUndefined();
  });

  it('pays its guarantee a twelfth a month as your pay, never the headline at signing, and stops when it ends', () => {
    const s = proven('ov-pay');
    const fl = offerFirstLook(s)!;
    const before = personalBalance(s);
    acceptFirstLook(s, fl.id);
    const monthly = fl.terms.overall!.annual / 12;
    // Signing pays the first month only: the term's headline is twenty-four times that.
    expect(guaranteePaid(s)).toBeCloseTo(monthly, 2);
    expect(personalBalance(s) - before).toBeCloseTo(monthly, 0);
    wait(s, 95);
    expect(guaranteePaid(s)).toBeCloseTo(monthly * 4, 2);
    endFirstLook(s, fl.id);
    wait(s, 90);
    expect(guaranteePaid(s)).toBeCloseTo(monthly * 4, 2);
    // Overhead stayed nothing: the guarantee is pay, a kind of its own (A14: overhead and pay kept apart).
    expect(paid(s, 'overhead')).toBe(0);
  });

  it('has your services alone: work for another company is refused while it runs, and taken once it ends', () => {
    const s = proven('ov-excl');
    const id = job(s, 'Another Company (Fixture)');
    expect(acceptRefusal(s, id)).toBeNull();
    const fl = offerFirstLook(s)!;
    acceptFirstLook(s, fl.id);
    expect(acceptRefusal(s, id)).toMatch(/^Your overall deal with Meridian \(Fixture\) has your services alone until /);
    endFirstLook(s, fl.id);
    expect(acceptRefusal(s, id)).toBeNull();
    // A first look leaves your services free.
    const t = signed('ov-fl');
    expect(acceptRefusal(t, job(t, 'Another Company (Fixture)'))).toBeNull();
  });

  it('keeps work taken before it was signed: a production put back moves that work, it doesn\'t refuse it (proofs, November 17, 2026)', () => {
    // Until the fix, moving the days re-accepted the work through every check, the deal's exclusivity among them, so the
    // production's confirmation threw and time couldn't pass (docs/v10/proof/off-first-look-check.json found it).
    const s = proven('ov-moved');
    const id = job(s, 'Another Company (Fixture)');
    acceptJob(s, id);
    acceptFirstLook(s, offerFirstLook(s)!.id);
    const j = s.jobs!.find((x) => x.id === id)!;
    expect(() => moveJob(s, j, 21)).not.toThrow();
    expect([j.status, j.days[0]]).toEqual(['accepted', '2027-06-22']);
    expect(s.plans.filter((x) => x.status === 'upcoming' && x.title.includes('Fixture'))).toHaveLength(1);
  });

  it('covers films and series both: each goes to its studio first', () => {
    const s = proven('ov-scope');
    acceptFirstLook(s, offerFirstLook(s)!.id);
    const fl = activeFirstLook(s)!;
    const film = feature(s, { title: 'A Covered Film' });
    const series = feature(s, { title: 'A Covered Series', genres: ['crime'] });
    series.axes.format = 'series';
    expect([covers(fl, film), covers(fl, series)]).toEqual([true, true]);
    expect(studioOption(s, film, HORROR.c)?.needs ?? '').toBe(''); // HORROR isn't in this world; nothing to hold
    expect(submissionStanding(s, series)?.stage).toBe('not-submitted');
    submitSeries(s, series);
    expect(submissionStanding(s, series)?.stage).toBe('considering');
  });

  it('can be asked once for more, never past the most its tier pays', () => {
    const s = proven('ov-ask');
    const fl = offerFirstLook(s)!;
    askMoreOverhead(s, fl.id);
    expect(() => askMoreOverhead(s, fl.id)).toThrow(/asked once/);
    wait(s, 8);
    expect(fl.counter?.outcome).toBeDefined();
    expect(fl.terms.overall!.annual).toBeLessThanOrEqual(5_000_000);
    // Already at the top of its band, nothing more is asked.
    const t = proven('ov-top');
    const top = offerFirstLook(t)!;
    top.terms.overall!.annual = 5_000_000; // labelled fixture: an offer at the band's top
    expect(() => askMoreOverhead(t, top.id)).toThrow(/already offers the most/);
  });

  it('is kept whole through a save, and its guarantee counts as wages to a bank', async () => {
    const s = proven('ov-save');
    acceptFirstLook(s, offerFirstLook(s)!.id);
    const back = deserialize(serialize(s));
    expect(activeFirstLook(back)?.terms.overall).toEqual(activeFirstLook(s)!.terms.overall);
    expect(() => validateGameState(JSON.parse(JSON.stringify(back)))).not.toThrow();
    const { isWages } = await import('../src/engine/bankworld/core/ledger');
    expect(isWages('slate:guarantee#overall:fl-1:1')).toBe(true);
  });
});

describe('two studios bidding at once (from November 18, 2026)', () => {
  // Labelled fixture studios: a small horror house (two films a year), and large ones of twelve, fourteen and thirty.
  const SMALL: StudioProfile = { c: 'company:fixture-small', name: 'Cellar Door (Fixture)', n: 2, g: [['Horror', 10], ['Thriller', 4]], m: EVEN, ann: {} };
  const BIG2: StudioProfile = { c: 'company:fixture-big2', name: 'Northlight (Fixture)', n: 14, g: [['Horror', 6], ['Thriller', 6], ['Drama', 6]], m: EVEN, ann: {} };
  const HUGE: StudioProfile = { c: 'company:fixture-huge', name: 'Atlas (Fixture)', n: 30, g: [['Horror', 4], ['Action', 8], ['Drama', 8]], m: EVEN, ann: {} };
  function proven(tag: string, studios: StudioProfile[]): GameState {
    const s = world(tag, studios);
    record(s, 66);
    record(s, 72);
    return s;
  }
  const yearly = (fl: { terms: { overall?: { annual: number }; annualOverhead?: number; overhead: number } }) => fl.terms.overall?.annual ?? fl.terms.annualOverhead ?? fl.terms.overhead * 12;

  it('a record just starting gets one offer; a record past its start draws a second studio, on its own terms', () => {
    const start = world('rv-start', [HORROR, SMALL]);
    record(start, 66);
    offerFirstLook(start);
    expect(openFirstLookOffers(start)).toHaveLength(1);
    const s = proven('rv-two', [HORROR, SMALL]);
    const fl = offerFirstLook(s)!;
    const offers = openFirstLookOffers(s);
    expect(offers.map((x) => x.company).sort()).toEqual([HORROR.c, SMALL.c].sort());
    const rival = offers.find((x) => x.id !== fl.id)!;
    expect([fl.competing, rival.competing]).toEqual([rival.id, fl.id]);
    expect(rival.why).toContain(`It knows ${fl.name} has made you an offer`);
    // Each on its own scale (deal-model.json, proven first looks): $300,000 a year for two films a year, the middle of the
    // band for five ($650,000, kept a multiple of $1,200 so a month is whole dollars).
    expect(offers.map(yearly).sort((a, b) => a - b)).toEqual([300_000, 650_400]);
  });

  it('signing one turns the other down', () => {
    const s = proven('rv-sign', [HORROR, SMALL]);
    const fl = offerFirstLook(s)!;
    const rival = firstLooks(s).find((x) => x.id === fl.competing)!;
    acceptFirstLook(s, rival.id);
    expect([rival.status, fl.status]).toEqual(['active', 'declined']);
    expect(s.log.some((x) => x.text.includes(`You turned down ${fl.name}'s`))).toBe(true);
    expect(() => acceptFirstLook(s, fl.id)).toThrow('no longer open');
  });

  it("matches a rival's higher offer up to a quarter above its own; past that, its own stands", () => {
    // Two large studios: about $1.73m and $2.09m a year on overall deals, within a quarter: the lower one matches.
    const s = proven('rv-match', [BIG, BIG2]);
    offerFirstLook(s);
    const [low, high] = openFirstLookOffers(s).sort((a, b) => yearly(a) - yearly(b));
    expect(low.terms.overall && high.terms.overall).toBeTruthy();
    expect(matchRefusal(s, high)).toMatch(/already offers as much/);
    expect(matchRefusal(s, low)).toBeNull();
    askToMatch(s, low.id);
    expect(() => askToMatch(s, low.id)).toThrow('You have asked once already.');
    expect(() => askMoreOverhead(s, low.id)).toThrow('You have asked once already.');
    wait(s, 8);
    expect([low.counter!.outcome, yearly(low)]).toEqual(['agreed', yearly(high)]);
    // Against thirty films a year ($5m), twelve won't go that far: its offer stands, still open.
    const t = proven('rv-held', [BIG, HUGE]);
    offerFirstLook(t);
    const [l2, h2] = openFirstLookOffers(t).sort((a, b) => yearly(a) - yearly(b));
    const before = yearly(l2);
    askToMatch(t, l2.id);
    wait(t, 8);
    expect([l2.counter!.outcome, yearly(l2), l2.status]).toEqual(['held', before, 'offered']);
    expect(yearly(h2)).toBeGreaterThan(before * 1.25);
  });

  it('has nothing to match once the rival is gone, and never across kinds of deal', () => {
    const s = proven('rv-gone', [BIG, BIG2]);
    offerFirstLook(s);
    const [low, high] = openFirstLookOffers(s).sort((a, b) => yearly(a) - yearly(b));
    askToMatch(s, low.id);
    declineFirstLook(s, high.id);
    wait(s, 8);
    expect(low.counter!.outcome).toBe('held');
    expect(s.log.some((x) => x.text.includes('no longer open'))).toBe(true);
    // An overall deal (twelve films a year) and a first look (five) aren't the same thing to match.
    const k = proven('rv-kinds', [BIG, HORROR]);
    offerFirstLook(k);
    const first = openFirstLookOffers(k).find((x) => !x.terms.overall)!;
    expect(matchRefusal(k, first)).toMatch(/different kind of deal/);
  });

  it('keeps both offers and their link through a save', () => {
    const s = proven('rv-save', [HORROR, SMALL]);
    offerFirstLook(s);
    const back = deserialize(serialize(s));
    expect(() => validateGameState(back)).not.toThrow();
    expect(openFirstLookOffers(back).map((x) => x.competing).filter(Boolean)).toHaveLength(2);
  });
});
