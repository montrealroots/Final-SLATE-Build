// Studio projects (src/engine/studio-projects.ts; the owner, November 18, 2026): a studio asks you to direct or write its
// own next picture, the next entry in a franchise it owns where it has one. Every studio and franchise here is a labelled
// fixture; the fee is the guild minimum times the game's multiple. Each test changes an input and checks the outcome moves.
import { describe, expect, it } from 'vitest';
import { DAY, createProject, processUntil, setFinanceTarget } from './engine-api';
import { acceptFirstLook, offerFirstLook, scheduleFirstLookCheck } from '../src/engine/first-look';
import { acceptJob, acceptRefusal, askBetterRate, declineJob } from '../src/engine/jobs';
import { franchiseName, studioPitch, studioProjectOffer, studioReach, studioScale, STUDIO_DEAL_PICTURES, STUDIO_DEAL_STEP, STUDIO_FEE_SHARE, STUDIO_FEES, STUDIO_REACH } from '../src/engine/studio-projects';
import { standingIn } from '../src/engine/reputation';
import { institution } from '../src/engine/awards';
import { personalPostings } from '../src/engine/personal';
import { DGA_HIGH_BUDGET_WEEK, WGA_SCREENPLAY } from '../src/engine/union';
import { dateKey } from '../src/engine/time';
import type { StudioProfile } from '../src/engine/studios';
import type { GameState, Project } from '../src/engine/types';
import { approve, buildProject, startLife, writePitch } from './helpers';

const EVEN = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
const FAST: StudioProfile = { c: 'company:fixture-fast', name: 'Overdrive Pictures (Fixture)', n: 6, g: [['Action', 10], ['Drama', 6], ['Thriller', 6]], m: EVEN, ann: {}, fr: [{ name: 'The Long Road (Fixture) Collection', entries: 9, last: '2026-06-01', budget: 340_000_000, budgetOf: 'Long Road X (2023)' }], mb: 30_000_000 };
const MID: StudioProfile = { ...FAST, fr: [{ ...FAST.fr![0], budget: 150_000_000 }] };
const PLAIN: StudioProfile = { c: 'company:fixture-plain', name: 'Quiet Rooms (Fixture)', n: 4, g: [['Drama', 10], ['Romance', 4]], m: EVEN, ann: {} };
const BIG: StudioProfile = { c: 'company:fixture-big', name: 'Meridian (Fixture)', n: 12, g: [['Drama', 6], ['Action', 6]], m: EVEN, ann: {}, fr: [{ name: 'Northern Lights Collection', entries: 3, last: '2025-03-01' }] };

function world(tag: string, studios: StudioProfile[]): GameState {
  const s = startLife(tag, 'gb-london', { savings: 2_000 });
  s.industry = { horizon: '2026-11-10', builtAt: '2026-11-10T00:00:00Z', series: {}, studios };
  return s;
}
/** A delivered drama of yours (labelled fixture), received as given. */
function record(s: GameState, reception: number, title: string): Project {
  const p = createProject(s, { title, scenarioId: 'low', axes: { format: 'feature', medium: 'live-action', targetRuntimeMin: 90 } });
  const q = buildProject(s, { title: 'tmp', format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ines', patch: { roleSize: 'lead' } }], [{ place: 'Dock', chars: ['Ines'], minutes: 3 }]);
  p.characters = q.characters; p.scenes = q.scenes; writePitch(p);
  s.projects = s.projects.filter((x) => x.id !== q.id);
  p.axes.genres = [{ id: 'drama', emphasis: 'primary' }, { id: 'action', emphasis: 'secondary' }];
  approve(s, p); setFinanceTarget(p, 400_000);
  // A delivery records how its script and direction were judged too (reputation.ts reads them): the same score here.
  p.delivered = { at: s.now, runtimeMin: 90 }; p.phase = 'delivered'; p.quality = { reception, script: reception, direction: reception } as Project['quality'];
  return p;
}
const proven = (tag: string, studios: StudioProfile[]) => { const s = world(tag, studios); record(s, 66, 'An Earlier Film'); record(s, 72, 'A Second Film'); return s; };
const inForce = (t: [string, number][], d: string) => [...t].reverse().find(([f]) => f <= d)![1];
/** A Leading record: ten delivered films scored 100 (standing 86, eight works or more), trusted with any picture. */
const leading = (tag: string, studios: StudioProfile[]) => { const s = world(tag, studios); for (let i = 0; i < 10; i++) record(s, 100, `Film ${i + 1}`); return s; };

describe('a studio project', () => {
  it("names a franchise as people say it", () => {
    expect(['The Batman Collection', 'Superman (DCU) Collection', 'The Fast and the Furious Collection', 'Days of Thunder Colletion', 'Heart Eyes - Collection', 'Minecraft Movie Collection', 'The Lego Movie Collection', 'Scary Movie Collection',
      "Ferie d'agosto - Collezione", 'Manitu Filmreihe', 'Cumali Ceber Koleksiyonu', 'Carrosel: Coleção', 'Les Enfants de la Résistance - Saga', 'Il milanese imbruttito (Film) - Collezione',
      'Godzilla Minus Collection', 'Crayon Shinchan the Movie Collection', 'Rebel Highway Series', 'Spider-Man: Spider-Verse Collection'].map(franchiseName))
      .toEqual(['Batman', 'Superman', 'Fast and the Furious', 'Days of Thunder', 'Heart Eyes', 'Minecraft', 'Lego', 'Scary Movie',
        "Ferie d'agosto", 'Manitu', 'Cumali Ceber', 'Carrosel', 'Les Enfants de la Résistance', 'Il milanese imbruttito',
        'Godzilla', 'Crayon Shinchan', 'Rebel Highway', 'Spider-Verse']);
  });

  it("is the next entry in the best-fitting studio's own franchise, paid what the trade reports, placed by the franchise's real budget", () => {
    // A $340M tentpole goes only to a Leading director (STUDIO_REACH).
    const s = leading('sp-franchise', [FAST, PLAIN]);
    const j = studioProjectOffer(s)!;
    expect([j.company, j.role, j.production, j.studio?.franchise]).toEqual([FAST.name, 'directing', 'Untitled Long Road Film', 'Long Road']);
    // A $340M franchise is at the top of the scale: the top of a first studio feature's range ($450,000 to $750,000).
    expect([j.studio!.fee, j.studio!.budget, j.studio!.first]).toEqual([STUDIO_FEES.directing.first[1], 340_000_000, true]);
    // A tentpole's shoot: 18 weeks, paid by the day.
    expect(j.days).toHaveLength(90);
    expect(j.dayRate).toBe(Math.round(750_000 / 90));
    expect(studioPitch(j)).toMatch(/^Overdrive Pictures \(Fixture\) wants you to direct the next Long Road film: \$750,000 for 18 weeks of shooting, from .*\. On the strength of Film 1\.$/);
    expect(j.material).toBe("The Long Road films so far, and the studio's notes for the next one.");
    expect(studioScale(j)).toBe("A picture of about $340,000,000, as Long Road X (2023) cost. The fee is what studios pay for a director's first studio picture, as the trade reports it, before any share of the profits.");
  });

  it("pays more for a second studio picture, in your record's range, and less for a smaller budget", () => {
    const s = proven('sp-second', [MID]);
    const first = studioProjectOffer(s)!;
    (s.jobs ??= []).push({ ...first, id: 'done-before', status: 'done', offeredAt: s.now - 200 * DAY });
    const second = studioProjectOffer(s)!;
    // A record past its start (proven): $1M to $2M, three quarters of the way up for a $150M picture.
    expect([second.studio!.first, second.studio!.fee]).toEqual([false, Math.round((1_000_000 + 1_000_000 * (Math.log(7.5) / Math.log(15))) / 1000) * 1000]);
    // A $40M franchise: a quarter of the way up, on a log scale from $20M to $300M; and eight weeks of shooting.
    const t = proven('sp-small', [{ ...FAST, fr: [{ ...FAST.fr![0], budget: 40_000_000 }] }]);
    const small = studioProjectOffer(t)!;
    expect(small.studio!.fee).toBe(Math.round((450_000 + 300_000 * (Math.log(2) / Math.log(15))) / 1000) * 1000);
    expect(small.days).toHaveLength(40);
    // A franchise of one film so far is said as one.
    const one = studioProjectOffer(proven('sp-one', [{ ...MID, fr: [{ ...MID.fr![0], entries: 1 }] }]))!;
    // An original is "an action picture", never "a action".
    expect(studioProjectOffer(proven('sp-an', [{ ...MID, fr: undefined }]))!.material).toBe("The studio's brief for an action picture.");
    expect(one.material).toBe("The Long Road film, and the studio's notes for the next one.");
  });

  it("is an original in the genre the studio makes most where it has no live franchise; with no budget recorded, the middle of the range", () => {
    const s = proven('sp-original', [PLAIN]);
    const j = studioProjectOffer(s)!;
    expect([j.company, j.production, j.studio?.franchise, j.studio?.budget]).toEqual([PLAIN.name, 'Untitled Quiet Rooms (Fixture) Drama Picture', undefined, undefined]);
    expect(studioPitch(j)).toContain('wants you to direct its next drama picture');
    expect(j.studio!.fee).toBe(600_000);
    expect(studioScale(j)).toMatch(/^Its budget isn't recorded\./);
  });

  it("pays no more than a share of a small picture's budget, and only an American studio is held to the guild's minimum", () => {
    // A $1.7 million picture: 5% is $85,000, under the range and under the DGA's ten weeks.
    const small = (c: string) => { const s = proven(`sp-cap-${c}`, [{ ...FAST, c, fr: [{ ...FAST.fr![0], budget: 1_700_000 }] }]); return [studioProjectOffer(s)!, dateKey(s.now, 'UTC')] as const; };
    const [korean] = small('company:cj-enm');
    expect(korean.studio!.fee).toBe(Math.round(1_700_000 * STUDIO_FEE_SHARE / 1000) * 1000);
    expect(studioScale(korean)).toBe('A picture of about $1,700,000, as Long Road X (2023) cost. The fee is a twentieth of the budget, all a picture this size pays its director, before any share of the profits.');
    const [american, day] = small('company:universal-pictures');
    expect(american.studio!.fee).toBe(inForce(DGA_HIGH_BUDGET_WEEK, day) * 10);
    expect(studioScale(american)).toMatch(/The fee is the DGA's minimum for ten weeks, the least an American studio may pay, before any share of the profits\.$/);
    // A big picture abroad is paid the trade's range, as at home.
    expect(studioProjectOffer(leading('sp-cap-big', [{ ...FAST, c: 'company:toho' }]))!.studio!.fee).toBe(STUDIO_FEES.directing.first[1]);
  });

  it("reaches bigger pictures as your standing rises: none Emerging, up to $160M Established, any Leading", () => {
    const two: StudioProfile = { ...FAST, fr: [{ name: 'Titan Collection', entries: 4, last: '2026-07-01', budget: 340_000_000, budgetOf: 'Titan IV (2025)' }, { ...FAST.fr![0], last: '2025-01-01', budget: 120_000_000 }] };
    const established = proven('sp-reach', [two]);
    expect(standingIn(established, 'directing').grade).toBe('Established');
    expect(studioReach(established, 'directing')).toBe(STUDIO_REACH.Established);
    expect(studioProjectOffer(established)!.studio!.franchise).toBe('Long Road');
    const top = leading('sp-reach-top', [two]);
    expect(standingIn(top, 'directing').grade).toBe('Leading');
    expect(studioProjectOffer(top)!.studio!.franchise).toBe('Titan');
    // Without a franchise in reach, an original no bigger than you're trusted with, said without a budget it isn't.
    const vast = studioProjectOffer(proven('sp-reach-mb', [{ ...FAST, fr: [two.fr![0]], mb: 200_000_000 }]))!;
    expect([vast.studio!.franchise, vast.studio!.budget, vast.studio!.budgetOf]).toEqual([undefined, STUDIO_REACH.Established, undefined]);
  });

  it("says why it asks: your latest win or nomination in the role, else your best work in it", () => {
    const s = proven('sp-why', [MID]);
    expect(studioProjectOffer(s)!.studio!.why).toBe('On the strength of A Second Film.');
    // Labelled fixture: a win for the direction of the player's film, at an edition that has ended.
    const ed = s.editions.find((e) => institution(e.institutionId).categories.some((c) => c.recipient === 'director'))!;
    const cat = institution(ed.institutionId).categories.find((c) => c.recipient === 'director')!;
    const film = s.projects.find((p) => p.title === 'An Earlier Film')!;
    const before = standingIn(s, 'directing').standing;
    ed.entries.push({ id: 'win', projectId: film.id, categoryId: cat.id, status: 'won', submittedAt: s.now, recipients: [], fee: 0 } as never);
    ed.end = s.now - DAY;
    const j = studioProjectOffer(s)!;
    expect(j.studio!.why).toBe(`After An Earlier Film won ${cat.name} at the ${ed.label}.`);
    expect(standingIn(s, 'directing').standing).toBeGreaterThan(before); // the win raises the standing too (reputation.ts)
    expect(studioPitch(j)).toMatch(new RegExp(`After An Earlier Film won .* at the .*\\.$`));
  });

  it("stays fresh: a studio that asked lately gives way to the next best fit, and a studio asks for a franchise it hasn't yet", () => {
    const other: StudioProfile = { ...MID, c: 'company:fixture-other', name: 'Second Unit Pictures (Fixture)' };
    const s = proven('sp-fresh', [MID, other]);
    const first = studioProjectOffer(s)!;
    (s.jobs ??= []).push({ ...first, status: 'declined', offeredAt: s.now - 200 * DAY });
    const next = studioProjectOffer(s)!;
    expect([first.company, next.company]).toEqual([MID.name, other.name]);
    // Two years on, the best fit may ask again, now for a franchise it hasn't offered you.
    const twoFr: StudioProfile = { ...MID, fr: [MID.fr![0], { name: 'Night Shift Collection', entries: 2, last: '2024-01-01', budget: 60_000_000 }] };
    const t = proven('sp-fresh-fr', [twoFr]);
    const a = studioProjectOffer(t)!;
    (t.jobs ??= []).push({ ...a, status: 'declined', offeredAt: t.now - 800 * DAY });
    expect([a.studio!.franchise, studioProjectOffer(t)!.studio!.franchise]).toEqual(['Long Road', 'Night Shift']);
  });

  it("keeps continuity: a studio whose picture you made comes back to you for the next one", () => {
    const other: StudioProfile = { ...MID, c: 'company:fixture-other', name: 'Second Unit Pictures (Fixture)', g: [['Drama', 20], ['Action', 10]] };
    const s = proven('sp-back', [MID, other]);
    const made = studioProjectOffer(s)!;
    (s.jobs ??= []).push({ ...made, status: 'done', offeredAt: s.now - 400 * DAY });
    const back = studioProjectOffer(s)!;
    expect([back.company, back.studio!.franchise, back.studio!.why]).toEqual([made.company, made.studio!.franchise, `You directed its last ${made.studio!.franchise} film, and it wants you back.`]);
    // Once it has asked again, the next ask goes by fit and freshness.
    (s.jobs ??= []).push({ ...back, id: 'back', status: 'declined', offeredAt: s.now - 200 * DAY });
    expect(studioProjectOffer(s)!.studio!.why).not.toMatch(/wants you back/);
  });

  it('never pays under the guild minimum', () => {
    // The survey's first-timer screenplay range ($75,000 to $100,000) is under the WGA's screenplay minimum, which governs;
    // DGA's ten guaranteed weeks are under a first studio feature's range, which governs.
    const day = dateKey(Date.now(), 'UTC');
    expect(inForce(WGA_SCREENPLAY, day)).toBeGreaterThan(STUDIO_FEES.writing.first[1]);
    expect(inForce(DGA_HIGH_BUDGET_WEEK, day) * 10).toBeLessThan(STUDIO_FEES.directing.first[0]);
  });

  it('never comes to a record just starting, nor twice in six months', () => {
    const start = world('sp-start', [FAST]);
    record(start, 66, 'An Earlier Film');
    expect(studioProjectOffer(start)).toBeNull();
    const s = proven('sp-gap', [FAST]);
    (s.jobs ??= []).push(studioProjectOffer(s)!);
    expect(studioProjectOffer(s)).toBeNull();
    processUntil(s, s.now + 181 * DAY, 'tick', 1_000_000);
    expect(studioProjectOffer(s)).not.toBeNull();
  });

  it("comes from the studio of your overall deal, whose work you may take while it has your services", () => {
    const s = proven('sp-overall', [FAST, BIG]);
    const deal = offerFirstLook(s)!;
    const ours = [deal, ...(s.firstLooks ?? []).filter((x) => x.id !== deal.id)].find((x) => x.terms.overall)!;
    acceptFirstLook(s, ours.id);
    const j = studioProjectOffer(s)!;
    expect(j.company).toBe(ours.name);
    expect(j.studio?.franchise).toBe('Northern Lights');
    s.jobs = [j];
    expect(acceptRefusal(s, j.id)).toBeNull();
  });

  it('arrives by itself after a delivery, and once taken is worked, paid and credited like any job', () => {
    const s = proven('sp-arrives', [FAST]);
    scheduleFirstLookCheck(s, s.projects[0]);
    processUntil(s, s.now + 31 * DAY, 'tick', 1_000_000);
    const j = (s.jobs ?? []).find((x) => x.studio)!;
    expect(j.status).toBe('offered');
    expect(s.log.some((x) => x.text.startsWith(`${FAST.name} wants you to`))).toBe(true);
    acceptJob(s, j.id);
    processUntil(s, s.now + 220 * DAY, 'tick', 5_000_000); // eight weeks out, then eighteen weeks of shooting
    expect(j.status).toBe('done');
    const paid = personalPostings(s).filter((x) => x.kind === 'paid-work' && x.key === `job:${j.id}`).reduce((a, x) => a + x.amount, 0);
    // The fee itself, for the days worked: never a rounded day rate times the days.
    expect(paid).toBe(Math.round((j.studio!.fee * j.attended.length) / j.days.length));
    if (j.attended.length === j.days.length) expect(paid).toBe(j.studio!.fee);
    expect(j.attended.length).toBeGreaterThan(0);
  });
});

describe('multi-picture deals', () => {
  /** A studio picture of MID's, made: the studio comes back with a deal. */
  const madeOne = (tag: string, studios: StudioProfile[] = [MID]) => {
    const s = proven(tag, studios);
    const made = studioProjectOffer(s)!;
    // Its own id: an offer's id is the day it's made, and the next offer here is made the same day.
    (s.jobs ??= []).push({ ...made, id: 'made', status: 'done', offeredAt: s.now - 400 * DAY });
    return { s, made };
  };
  const dollars = (n: number) => `$${n.toLocaleString('en-US')}`;

  it('a studio whose picture you made offers a deal for its next two, each a step up, and says so', () => {
    const { s, made } = madeOne('deal-offer');
    const j = studioProjectOffer(s)!;
    const fee = j.studio!.fee;
    expect(j.studio!.deal).toEqual({ picture: 1, of: 2, fees: [fee, Math.round((fee * (1 + STUDIO_DEAL_STEP)) / 1000) * 1000] });
    expect([j.company, j.studio!.franchise]).toEqual([made.company, made.studio!.franchise]);
    const pitch = studioPitch(j);
    expect(pitch.startsWith(`${MID.name} offers you a two-picture deal: direct the next Long Road film: ${dollars(fee)} for `)).toBe(true);
    expect(pitch).toContain(`, then its next picture for ${dollars(j.studio!.deal!.fees[1])}. Each comes a month after the last is done; declining one ends the deal.`);
    // A first studio offer is never a deal: only a studio you've made a picture for offers one.
    expect(studioProjectOffer(proven('deal-none', [MID]))!.studio!.deal).toBeUndefined();
  });

  it("is three pictures once you're Leading", () => {
    const s = leading('deal-three', [MID]);
    (s.jobs ??= []).push({ ...studioProjectOffer(s)!, status: 'done', offeredAt: s.now - 400 * DAY });
    const j = studioProjectOffer(s)!;
    expect(j.studio!.deal!.of).toBe(STUDIO_DEAL_PICTURES.Leading);
    const [, b, c] = j.studio!.deal!.fees;
    expect(studioPitch(j)).toContain(`offers you a three-picture deal: `);
    expect(studioPitch(j)).toContain(`, then its next two pictures for ${dollars(b)} and ${dollars(c)}.`);
  });

  it("owes the next picture once the last is made, inside the six months, at the deal's fee; and is done after the last", () => {
    const { s } = madeOne('deal-owed');
    const first = studioProjectOffer(s)!;
    // Made just now: no ordinary offer would come for six months, but the deal's next picture does.
    s.jobs!.push({ ...first, id: 'p1', status: 'done', offeredAt: s.now - 30 * DAY });
    const second = studioProjectOffer(s)!;
    expect([second.company, second.studio!.franchise, second.studio!.fee, second.studio!.deal!.picture]).toEqual([first.company, first.studio!.franchise, first.studio!.deal!.fees[1], 2]);
    expect(second.studio!.why).toBe(`Picture 2 of your two-picture deal with ${first.company}.`);
    expect(studioPitch(second)).toContain(' wants you to direct the next Long Road film: ');
    expect(studioPitch(second).endsWith(`Picture 2 of your two-picture deal with ${first.company}.`)).toBe(true);
    // The last picture made: nothing more is owed, and the six months hold again.
    s.jobs!.push({ ...second, id: 'p2', status: 'done', offeredAt: s.now - 10 * DAY });
    expect(studioProjectOffer(s)).toBeNull();
  });

  it("declining a deal's picture ends the deal, and says so", () => {
    const { s } = madeOne('deal-decline');
    const first = studioProjectOffer(s)!;
    s.jobs!.push({ ...first, id: 'p1', status: 'done', offeredAt: s.now - 30 * DAY });
    const second = studioProjectOffer(s)!;
    s.jobs!.push(second);
    declineJob(s, second.id);
    expect(s.log[0].text).toBe(`That ends your 2-picture deal with ${first.company}.`);
    expect(studioProjectOffer(s)).toBeNull(); // nothing owed now, and the six months hold
  });

  it("a better fee agreed on the first picture lifts the deal's later pictures alike", () => {
    const { s } = madeOne('deal-ask');
    const j = studioProjectOffer(s)!;
    s.jobs!.push(j);
    const before = [...j.studio!.deal!.fees];
    askBetterRate(s, j.id);
    processUntil(s, s.now + 3 * DAY, 'tick', 1_000_000);
    expect(j.counter?.outcome).toBe('agreed'); // an Established director's ask is agreed (reputation.ts hasLeverage)
    expect(j.studio!.deal!.fees).toEqual(before.map((f) => Math.round((f * 1.2) / 1000) * 1000));
  });

  it("once a deal's picture is worked to the end, the studio asks for the next a month on", () => {
    const { s } = madeOne('deal-worked');
    const j = studioProjectOffer(s)!;
    s.jobs!.push(j);
    acceptJob(s, j.id);
    for (let i = 0; i < 300 && j.status !== 'done'; i++) processUntil(s, s.now + DAY, 'tick', 1_000_000);
    expect(j.status).toBe('done');
    expect(s.jobs!.some((x) => x.studio?.deal?.picture === 2)).toBe(false); // not before the month is out
    processUntil(s, s.now + 31 * DAY, 'tick', 1_000_000);
    const next = s.jobs!.find((x) => x.studio?.deal?.picture === 2)!;
    expect([next.status, next.company, next.studio!.fee]).toEqual(['offered', j.company, j.studio!.deal!.fees[1]]);
  });
});
