// First-look deals (src/engine/first-look.ts; the owner's v5 brief, 5). Every studio here is a made-up fixture, and every
// amount is the game's calibration by a studio's recorded scale. Controlled comparisons: the same save with and without
// a record, with and without a deal, a pass and a take.
import { describe, expect, it } from 'vitest';
import { DAY, acceptDeal, createProject, deserialize, processUntil, serialize, setFinanceTarget } from './engine-api';
import { backerOptions, pitchToStudio, studioOption, submitSeries } from '../src/engine/finance';
import { formCompany, companyBalance } from '../src/engine/company';
import { personalBalance } from '../src/engine/personal';
import {
  FIRST_LOOK_NOTICE_DAYS, acceptFirstLook, activeFirstLook, askMoreOverhead, declineFirstLook, developmentRefusal, drawDevelopment, endFirstLook,
  covers, firstLookCandidate, firstLookTerms, firstLookWords, fundLeft, offerFirstLook, scheduleFirstLookCheck, scopeOf, submissionStanding,
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
    expect(firstLookTerms(strategyOf(HORROR))).toEqual({ months: 12, considerDays: 60, overhead: 3_500, fund: 50_000, animatedOnly: false });
    expect(firstLookTerms(strategyOf(BIG))).toEqual({ months: 24, considerDays: 90, overhead: 6_000, fund: 100_000, animatedOnly: false });
    const s = world('fl-words', [HORROR]);
    record(s, 66);
    const fl = offerFirstLook(s)!;
    expect(fl.status).toBe('offered');
    expect(firstLookWords(fl)).toContain('Night Shift Pictures (Fixture) has 60 days to answer each one. If it passes, you may take the project elsewhere.');
    expect(personalBalance(s)).toBe(2_000); // nothing paid before acceptance
    expect(offerFirstLook(s)).toBeNull(); // one offer at a time
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
    for (const [reception, outcome, overhead] of [[75, 'agreed', 5_250], [62, 'held', 3_500]] as const) {
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

describe('a running deal', () => {
  it('pays overhead monthly into your company if you have one, or your own account', () => {
    const own = signed('fl-own');
    expect(personalBalance(own)).toBe(2_000 + 3_500);
    wait(own, 61);
    expect(personalBalance(own)).toBe(2_000 + 3 * 3_500);
    const co = world('fl-co', [HORROR]);
    record(co, 66);
    formCompany(co, 'Tidewater Pictures', 0);
    acceptFirstLook(co, offerFirstLook(co)!.id);
    wait(co, 31);
    expect(companyBalance(co)).toBe(2 * 3_500);
  });

  it('makes a covered film go to the studio first, with its own days to answer; another studio can be pitched only after a pass', () => {
    const s = signed('fl-submit');
    const p = feature(s, { title: 'Sunday Best', genres: ['family'] });
    expect(studioOption(s, p, FAMILY.c)!.needs).toBe('Your first-look deal gives Night Shift Pictures (Fixture) the first chance at Sunday Best: submit it to them first.');
    expect(() => pitchToStudio(s, p, FAMILY.c)).toThrow('submit it to them first');
    const sub = pitchToStudio(s, p, HORROR.c);
    expect(Math.round((sub.decideAt! - sub.askedAt) / DAY)).toBe(60);
    expect(studioOption(s, p, FAMILY.c)!.needs).toMatch(/^Night Shift Pictures \(Fixture\) is considering it under your first-look deal, until \d{4}-\d\d-\d\d\.$/);
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

describe('a television first-look deal (the v6 package, J13; the v7 package, DEAL02: TV scope)', () => {
  /** A save whose delivered work is a well-received horror series (labelled fixture: a delivered film marked a series). */
  function tvWorld(tag: string): GameState {
    const s = world(tag, [HORROR, FAMILY]);
    record(s, 66).axes.format = 'series';
    return s;
  }
  const series = (s: GameState, title: string, genres = ['horror']) => { const p = feature(s, { title, genres }); p.axes.format = 'series'; return p; }; // labelled: a series to submit

  it('comes after delivered series, covers series and not films, and says so in its terms', () => {
    const s = tvWorld('fl-tv-offer');
    expect(firstLookCandidate(s, 'film')).toBeNull(); // no delivered film
    const fl = offerFirstLook(s, undefined, 'television')!;
    expect([fl.name, scopeOf(fl.terms)]).toEqual([HORROR.name, 'television']);
    expect(firstLookWords(fl)[2]).toBe(`It covers the series you make while it runs, not films. You submit each one to ${HORROR.name} before you take it to any commissioner.`);
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
      const read = studioOption(s, p, HORROR.c)!.read;
      return { status: d.status, verdict: read.verdict, hold: commissioner().needs };
    });
    // The same facts give the same answer: an offer to commission it, or a pass that frees it for a commissioner.
    expect(answers[0].verdict).toBe(answers[1].verdict);
    for (const a of answers) {
      if (a.verdict === 'offer' || a.verdict === 'option') expect(a.status).toBe('offered');
      else { expect(a.status).toBe('declined'); expect(a.hold).not.toMatch(/first-look/); }
    }
  });
});
