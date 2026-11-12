// How a followed studio reads a pitch, what it offers, and how it releases a film it backs (src/engine/strategy.ts,
// finance.ts, finish.ts; the Creative Depth package, milestone F). Every studio here is a made-up fixture. Controlled
// comparisons: one project put to studios with different records, and one studio shown projects that differ in one thing.
import { describe, expect, it } from 'vitest';
import {
  DAY, acceptDeal, cancelRelease, createProject, dateKey, dealTerms, deals, deserialize, financeSummary, processUntil, serialize, setFinanceTarget,
} from './engine-api';
import { getPlace } from '../src/data/places';
import { STUDIO_OPTION_SHARE, pitchToStudio, projectFamilies, studioOption, studioOptions } from '../src/engine/finance';
import { STAGGER_DAYS, dubbingCost, setReleaseVersion, windowDate } from '../src/engine/finish';
import { territoriesReached } from '../src/engine/distribution';
import { DUBBED_REACH, DUB_PER_MINUTE } from '../src/engine/script-effects';
import { NOTES, WANT, pitchRead, reachTerritories, slateRoom, strategyOf, strategyWords, type PitchInput } from '../src/engine/strategy';
import type { StudioProfile } from '../src/engine/studios';
import type { Format, GameState, Medium, Project } from '../src/engine/types';
import { approve, buildProject, startLife, writePitch } from './helpers';

const EVEN = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
const HORROR: StudioProfile = { c: 'company:fixture-horror', name: 'Night Shift Pictures (Fixture)', n: 5, g: [['Horror', 10], ['Thriller', 6], ['Drama', 2]], m: [0, 1, 0, 0, 0, 0, 0, 1, 0, 6, 0, 0], ann: {} };
const ANIMATION: StudioProfile = { c: 'company:fixture-animation', name: 'Lantern Animation (Fixture)', n: 9, g: [['Animation', 9], ['Family', 9], ['Comedy', 6]], m: EVEN, ann: {} };
const FAMILY: StudioProfile = { c: 'company:fixture-family', name: 'Sunday Matinee (Fixture)', n: 4, g: [['Family', 8], ['Comedy', 8], ['Romance', 4]], m: EVEN, ann: {} };
const DRAMA: StudioProfile = { c: 'company:fixture-drama', name: 'Long Room Films (Fixture)', n: 3, g: [['Drama', 12], ['History', 4], ['Horror', 3], ['Romance', 3]], m: EVEN, ann: {} };
const TINY: StudioProfile = { c: 'company:fixture-tiny', name: 'Two Desks (Fixture)', n: 0.5, g: [['Drama', 2]], m: EVEN, ann: {} };

/**
 * A save whose world follows these studios. A studio's slate is full in some years of some worlds, which is its own test
 * below; here the first world (by tag) in which every studio has room next year is used, so the tests are about fit.
 */
function world(tag: string, studios: StudioProfile[]): GameState {
  for (let i = 0; i < 40; i++) {
    const s = startLife(`${tag}-${i}`);
    s.industry = { horizon: '2026-11-10', builtAt: '2026-11-10T00:00:00Z', series: {}, studios };
    if (studios.every((x) => slateRoom(s.seed, '2026-11-10', x, 2027).room > 1)) return s;
  }
  throw new Error('No world with room on every slate.');
}
/** A feature with an approved script and nothing raised (labelled fixture: a few scenes stand in for a full script). */
function feature(s: GameState, o: { title?: string; format?: Format; medium?: Medium; genres?: string[] } = {}): Project {
  const p = createProject(s, { title: o.title ?? 'The Long Night', scenarioId: 'low', axes: { format: o.format ?? 'feature', medium: o.medium ?? 'live-action', targetRuntimeMin: 90 } });
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
/** A delivered, assessed film of yours (labelled fixture), so backers see a record. */
function record(s: GameState, reception: number, title = 'An Earlier Film'): Project {
  const p = buildProject(s, { title, format: 'feature', medium: 'live-action', runtime: 90 }, [{ name: 'Ada' }], [{ place: 'Pier', chars: ['Ada'] }]);
  p.delivered = { at: s.now, runtimeMin: 90 };
  p.phase = 'delivered';
  p.quality = { reception };
  return p;
}
const wait = (s: GameState, days: number) => processUntil(s, s.now + days * DAY, 'tick', 100_000);
const read = (s: GameState, p: Project, c: StudioProfile) => studioOption(s, p, c.c)!.read;

describe('a studio\'s strategy, from the pace its save froze', () => {
  it('is its genres by share, its busiest month, the slate it can carry, and a reach that says it is modeled', () => {
    const st = strategyOf(HORROR);
    expect(st.families.map((f) => f.genre)).toEqual(['Horror', 'Thriller', 'Drama']);
    expect(st.families[0].share).toBeCloseTo(10 / 18);
    expect([st.window, st.capacity, st.record, st.reach, st.v]).toEqual([9, 8, 'full', 'home-and-majors', 1]);
    expect(strategyWords(st).join(' ')).toContain('It most often opens a film in October.');
    expect(strategyWords(st).join(' ')).toContain('Modeled, not recorded');
    expect(strategyOf(TINY).record).toBe('thin');
    expect(reachTerritories(strategyOf(ANIMATION), 'GB')).toHaveLength(13);
    expect(reachTerritories(strategyOf(TINY), 'GB')).toEqual(['GB']);
    expect(strategyOf(JSON.parse(JSON.stringify(HORROR)))).toEqual(st); // the same profile, the same strategy
  });
});

describe('one horror film, put to four studios', () => {
  it('gets a different answer from each, for reasons that are its record and not its size', () => {
    const s = world('strategy-four', [HORROR, ANIMATION, FAMILY, DRAMA]);
    const p = feature(s);
    expect(projectFamilies(p)).toEqual(['horror']);
    const horror = read(s, p, HORROR);
    expect(horror.verdict).toBe('option'); // it wants it, and a first film gets an option
    expect(horror.for.join(' ')).toContain('Horror is 56% of its genre credits');
    expect(horror.against).toContain("You haven't delivered a film yet.");
    // The busiest studio here is the animation house, and it passes: a studio isn't chosen by how many films it releases.
    const animation = read(s, p, ANIMATION);
    expect(animation.verdict).toBe('pass');
    expect(animation.against[0]).toBe('Lantern Animation (Fixture) is an animation studio: Animation is the largest part of its record, 38% of its genre credits. A live-action film isn\'t what it makes.');
    expect(animation.next).toContain("'s record is the nearer fit for it.");
    const family = read(s, p, FAMILY);
    expect(family.verdict).toBe('pass');
    expect(family.against.join(' ')).toContain('Nothing like it is in its record: its films are mostly Comedy, Family, Romance.');
    const drama = read(s, p, DRAMA);
    expect(drama.verdict).toBe('notes');
    expect(drama.next).toBe('It would read a film nearer to what it makes.');
    expect(studioOptions(s, p).map((o) => o.name)[0]).toBe('Night Shift Pictures (Fixture)'); // the nearest fit is listed first
  });

  it('changes with the film, not the wording: the same studio wants an animated family film it would pass on as horror', () => {
    const s = world('strategy-medium', [HORROR, ANIMATION]);
    const cartoon = feature(s, { title: 'Small Lights', medium: 'animation', genres: ['family'] });
    expect(read(s, cartoon, ANIMATION).verdict).toBe('option');
    const refused = read(s, cartoon, HORROR);
    expect(refused.verdict).toBe('pass');
    expect(refused.against[0]).toBe('Night Shift Pictures (Fixture) has released almost no animation (0% of its genre credits).');
    expect(refused.next).toBe("Lantern Animation (Fixture)'s record is the nearer fit for an animated film.");
  });

  it('a series is not what a film studio takes, a thin record rules nothing out, and a full slate says so', () => {
    const s = world('strategy-gates', [HORROR, TINY]);
    const st = strategyOf(HORROR);
    const base: PitchInput = { title: 'x', format: 'feature', formatLabel: 'Feature Film', medium: 'live-action', families: ['horror'], script: 90, works: 1, reception: 60, wins: 0, deliveredForThem: 0, brokenWithThem: 0, year: 2027, room: { capacity: 8, taken: 4, room: 4 } };
    expect(pitchRead(st, { ...base, format: 'limited-series', formatLabel: 'Limited Series' }).against[0]).toBe("Night Shift Pictures (Fixture)'s record here is feature films. A limited series isn't something it takes on.");
    const p = feature(s, { title: 'Thin' });
    expect(read(s, p, TINY).for).toContain("Its record is too thin to say what it won't make, so the genre counts neither for nor against.");
    expect(pitchRead(st, base).verdict).toBe('offer');
    const full = pitchRead(st, { ...base, room: { capacity: 8, taken: 8, room: 0 } });
    expect([full.verdict, full.against[0]]).toEqual(['pass', 'Its slate for 2027 is full: it carries about 8 films a year, and 8 are dated or in work.']);
    expect(full.next).toBe('Its slate for 2028 may have room: ask again with a draft approved then.');
    // The room is what it can carry less what this save's world has it releasing that year, less films of yours it backs.
    const room = slateRoom(s.seed, s.industry!.horizon, HORROR, 2027);
    expect([room.capacity, room.room]).toEqual([8, 8 - room.taken]);
    expect(slateRoom(s.seed, s.industry!.horizon, HORROR, 2027, 1)).toMatchObject({ taken: room.taken + 1, room: room.room - 1 });
    // A studio with eight films already dated for the year has no room, and passes for that reason whatever the film is.
    const booked: StudioProfile = { ...HORROR, c: 'company:fixture-booked', name: 'Booked Solid (Fixture)', ann: { 2027: 8 } };
    s.industry!.studios!.push(booked);
    expect(read(s, p, booked).against[0]).toMatch(/^Its slate for 2027 is full: it carries about 8 films a year, and \d+ are dated or in work\.$/);
  });

  it('what you have delivered moves the answer: an option for a first film, an offer once one is delivered, less when it was coolly received', () => {
    const st = strategyOf(DRAMA);
    const x: PitchInput = { title: 'x', format: 'feature', formatLabel: 'Feature Film', medium: 'live-action', families: ['drama'], script: 90, works: 0, reception: null, wins: 0, deliveredForThem: 0, brokenWithThem: 0, year: 2027, room: { capacity: 5, taken: 1, room: 4 } };
    const first = pitchRead(st, x);
    const proven = pitchRead(st, { ...x, works: 1, reception: 75 });
    const cool = pitchRead(st, { ...x, works: 1, reception: 35 });
    expect([first.verdict, proven.verdict]).toEqual(['option', 'offer']);
    expect(proven.score).toBeGreaterThan(first.score);
    expect(cool.score).toBeLessThan(proven.score);
    expect(cool.against).toContain('Your delivered work was coolly received.');
    expect(pitchRead(st, { ...x, works: 1, reception: 60, brokenWithThem: 1 }).against).toContain("A film it backed wasn't delivered in time.");
    expect(WANT).toBeGreaterThan(NOTES);
  });
});

describe('pitching, the answer, and the deal', () => {
  it('needs an approved script and the documents, takes two weeks, and a first film\'s option is a share of the target with its terms shown', () => {
    const s = world('strategy-deal', [HORROR, FAMILY]);
    const p = feature(s);
    p.story.logline = '';
    expect(studioOption(s, p, HORROR.c)!.needs).toContain('A pitch to a studio includes');
    expect(() => pitchToStudio(s, p, HORROR.c)).toThrow('A pitch to a studio includes');
    writePitch(p);
    const d = pitchToStudio(s, p, HORROR.c);
    expect([d.kind, d.backer, d.status, d.sent]).toEqual(['studio', 'Night Shift Pictures (Fixture)', 'considering', ['Pitch', 'Treatment']]);
    expect(studioOption(s, p, HORROR.c)!.needs).toBe('It has this project in front of it now.');
    wait(s, 15);
    expect(d.status).toBe('offered');
    expect(d.amount).toBe(Math.round(400_000 * STUDIO_OPTION_SHARE));
    expect(d.studio).toMatchObject({ verdict: 'option', window: 9, v: 1 });
    expect(d.studio!.territories[0]).toBe(getPlace(p.axes.basePlaceId).country);
    expect(d.studio!.territories).toHaveLength(5);
    const terms = dealTerms(d).join(' ');
    expect(terms).toContain('They release it in cinemas in your home country and 4 other territories, opening in October, each territory on its own date');
    expect(terms).toContain('They approve the final cut before you can lock picture.');
    expect(s.log.some((l) => l.text.startsWith('Night Shift Pictures (Fixture) offered $60,000 for The Long Night.'))).toBe(true); // by its name, with no "the"
    acceptDeal(s, p, d.id);
    expect(financeSummary(p).received).toBe(60_000);
    expect(studioOption(s, p, HORROR.c)!.needs).toBe('It already backs this project.');
    // The read it gave is kept with the deal across a save.
    expect(deals(deserialize(serialize(s)).projects.find((x) => x.id === p.id)!)[0].studio).toEqual(d.studio);
  });

  it('a pass is final for the project; notes are read again only with a newer approved draft', () => {
    const s = world('strategy-again', [FAMILY, DRAMA]);
    const p = feature(s);
    const pass = pitchToStudio(s, p, FAMILY.c);
    const notes = pitchToStudio(s, p, DRAMA.c);
    wait(s, 15);
    expect([pass.status, notes.status]).toEqual(['declined', 'declined']);
    expect(pass.reason).toMatch(/^It passed\. Nothing like it is in its record/);
    expect(notes.reason).toMatch(/^Not yet\..*It would read a film nearer to what it makes\.$/);
    expect(studioOption(s, p, DRAMA.c)!.needs).toBe('It has read this draft. It reads a project again only with a newer approved draft.');
    approve(s, p); // a newer approved draft
    expect(studioOption(s, p, DRAMA.c)!.needs).toBe('');
    expect(studioOption(s, p, FAMILY.c)!.needs).toBe('It passed on this project.');
  });

  it('a proven filmmaker is financed in full, and the studio\'s slate for that year then has one place fewer', () => {
    const s = world('strategy-proven', [HORROR]);
    record(s, 72);
    const p = feature(s);
    const before = studioOption(s, p, HORROR.c)!;
    expect(before.read.verdict).toBe('offer');
    const d = pitchToStudio(s, p, HORROR.c);
    wait(s, 15);
    expect([d.status, d.amount, d.terms.credit, d.terms.approvalRights]).toEqual(['offered', 400_000, 'Presented By', ['Casting Approval', 'Picture Approval']]);
    acceptDeal(s, p, d.id);
    const other = feature(s, { title: 'Another Night' });
    expect(studioOption(s, other, HORROR.c)!.read.for[0]).toBe(`Its slate for ${before.year} has room for ${Number(/room for (\d+) more/.exec(before.read.for[0])![1]) - 1} more.`);
  });
});

describe('the release a studio sets when the film it backed is delivered', () => {
  function backedAndDelivered(tag: string, studio: StudioProfile, languages = ['en']) {
    const s = world(tag, [studio]);
    record(s, 72);
    const p = feature(s);
    p.axes.dialogueLanguages = languages;
    const d = pitchToStudio(s, p, studio.c);
    wait(s, 15);
    acceptDeal(s, p, d.id);
    // Labelled fixture: delivered and assessed without being made, as tests/earnings.test.ts does.
    p.delivered = { at: s.now, runtimeMin: 90 };
    p.phase = 'delivered';
    p.quality = { reception: 80 };
    processUntil(s, s.now + 1, 'tick', 1000);
    return { s, p, d };
  }

  it('waits for its month, opens at home first and then four territories every two weeks, each a release of its own', async () => {
    const { s, p, d } = backedAndDelivered('strategy-release', HORROR);
    const { onProjectDelivered } = await import('../src/engine/finance');
    onProjectDelivered(s, p);
    wait(s, 1);
    const today = dateKey(s.now, getPlace(p.axes.basePlaceId).zone);
    const mine = p.releases.filter((r) => r.offerId);
    expect(mine.map((r) => r.territories.length)).toEqual([1, 4]);
    expect(mine[0].date).toBe(windowDate(today, 9).replace(/^(\d{4})/, mine[0].date.slice(0, 4)));
    expect(mine[0].date.slice(5)).toBe('10-10'); // its month, October
    expect(Date.parse(mine[1].date) - Date.parse(mine[0].date)).toBe(STAGGER_DAYS * 86_400_000);
    expect(d.studio!.releaseId).toBe(mine[0].id);
    const offer = p.offers.find((o) => o.studioDeal === d.id)!;
    expect([offer.minimumGuarantee, offer.exclusive, offer.status]).toEqual([0, true, 'accepted']);
    expect(() => cancelRelease(s, p, mine[0].id)).toThrow("releases the film as a term of the deal that financed it, so this opening isn't yours to cancel.");
    // It earns only where it has opened: nothing is counted for the four territories until their day.
    processUntil(s, Date.parse(`${mine[0].date}T12:00:00Z`), 'tick', 1_000_000);
    expect(mine.map((r) => r.status)).toEqual(['released', 'planned']);
    expect(territoriesReached(p, offer)).toBe(1);
    processUntil(s, Date.parse(`${mine[1].date}T12:00:00Z`), 'tick', 1_000_000);
    expect(territoriesReached(p, offer)).toBe(5);
    // One set of monthly reports for the deal, not one for each opening.
    expect(s.events.filter((e) => e.kind === 'distribution-report' && e.payload.offerId === offer.id).length + (offer.reported ? 1 : 0)).toBeLessThanOrEqual(6);
    // The studio is repaid from what it reports before the project keeps any.
    wait(s, 200);
    expect(offer.reported!.gross).toBeGreaterThan(0);
    expect(d.repaid).toBeGreaterThan(0);
    expect(d.repaid).toBeLessThanOrEqual(offer.reported!.net);
  }, 60_000);

  it('a dubbed version is yours to pay for, counts for more where the language isn\'t the film\'s, and is refused where nothing needs translating', async () => {
    const { s, p, d } = backedAndDelivered('strategy-dub', HORROR);
    const { onProjectDelivered } = await import('../src/engine/finance');
    p.funding.fund += 200_000; // labelled fixture: money in the project to pay for a dub
    onProjectDelivered(s, p);
    wait(s, 1);
    const [home, abroad] = p.releases.filter((r) => r.offerId);
    const offer = p.offers.find((o) => o.studioDeal === d.id)!;
    expect(() => setReleaseVersion(s, p, home.id, 'dubbed')).toThrow('Everyone there speaks a language the film is in.');
    expect(abroad.version).toBe('subtitled');
    const cost = dubbingCost(p, abroad);
    expect(cost % (90 * DUB_PER_MINUTE)).toBe(0);
    expect(cost).toBeGreaterThan(0);
    setReleaseVersion(s, p, abroad.id, 'dubbed');
    const line = p.obligations.find((o) => o.id === abroad.dubObligationId)!;
    expect([line.amount, line.state]).toEqual([cost, 'reserved']);
    processUntil(s, Date.parse(`${abroad.date}T12:00:00Z`), 'tick', 1_000_000);
    expect(line.settled).toBe(cost);
    const foreign = abroad.territories.filter((c) => !['US', 'GB', 'CA', 'AU'].includes(c)).length;
    expect(territoriesReached(p, offer)).toBeCloseTo(1 + (4 - foreign) + foreign * DUBBED_REACH);
    expect(() => setReleaseVersion(s, p, abroad.id, 'subtitled')).toThrow('It is out already, in the version it opened in.');
  }, 60_000);
});
