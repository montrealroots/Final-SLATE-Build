// A studio picture's cast, chosen from real actors (src/engine/your-films.ts castPicture; the owner, November 19, 2026:
// "now do one with real cast"). In its own file because the awards record, once loaded, stays loaded for the file, and
// your-films.test.ts keeps the invented cast a picture has without it.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyRecognition, fameOf, filmFeeFrom, genderOf, performerFee, recognisedAtHome, standingOf } from '../src/engine/recognition';
import { namesFor } from '../src/engine/names-by-country';
import { castPicture, pictureCredits, ANY_FIRSTS, CREW_SHARE, LEAD_SHARE, MEN_FIRSTS, PICTURE_CREW, SUPPORTING_SHARE, WOMEN_FIRSTS } from '../src/engine/your-films';
import type { OutsideJob } from '../src/engine/jobs';
import type { GameState } from '../src/engine/types';
import type { StudioProfile } from '../src/engine/studios';
import { startLife } from './helpers';

function picture(s: GameState, released: string, budget: number): OutsideJob {
  const j = {
    id: 'made', role: 'directing', production: 'Untitled', company: 'TOHO', dayRate: 0, days: ['2026-02-02'], placeId: s.locationId, zone: 'Asia/Tokyo',
    status: 'done', offeredAt: s.now, answerBy: s.now, attended: [], missed: [],
    studio: { fee: 450_000, genre: 'Drama', budget, title: 'Glasshouse', released, quality: 70 },
  } as OutsideJob;
  (s.jobs ??= []).push(j);
  return j;
}

describe('a studio picture cast from real actors', () => {
  it('without the awards record, casts nobody yet and shows invented names', () => {
    const s = startLife('cast-none');
    const j = picture(s, '2026-10-01', 60_000_000);
    castPicture(s, j, null);
    expect(j.studio!.cast).toBeUndefined();
    expect(pictureCredits(s, j).cast.every((m) => !m.tmdbId)).toBe(true);
  });

  const data = applyRecognition(JSON.parse(readFileSync('src/data/recognition.json', 'utf8')));

  it('casts eight different recognised actors, alive and grown, whose fees its budget can pay', () => {
    const s = startLife('cast-real');
    const j = picture(s, '2026-10-01', 60_000_000);
    const crewBefore = pictureCredits(s, j).crew;
    castPicture(s, j);
    const cast = j.studio!.cast!;
    expect(cast).toHaveLength(8);
    expect(new Set(cast.map((m) => m.tmdbId)).size).toBe(8);
    cast.forEach((m, i) => {
      expect(m.tmdbId).toBeDefined();
      const st = standingOf(m.tmdbId!, 'actor', 2026)!;
      expect(st.points).toBeGreaterThan(0);
      expect(performerFee(st.points, fameOf(m.tmdbId!))).toBeLessThanOrEqual(60_000_000 * (i === 0 ? LEAD_SHARE : SUPPORTING_SHARE));
      const [name, born, died] = data.people[String(m.tmdbId)];
      expect(m.name).toBe(name);
      expect(!died || died > '2026-10-01').toBe(true);
      expect(!born || Number(born.slice(0, 4)) <= 2008).toBe(true);
    });
    expect(pictureCredits(s, j).cast).toBe(cast);
    expect(crewBefore.find((c) => c.job === 'Director')!.name).toBe(s.character.name);
  });

  it('is cast once, the same for the same story, and a bigger budget reaches dearer actors', () => {
    const a = startLife('cast-same'); const ja = picture(a, '2026-10-01', 60_000_000); castPicture(a, ja);
    const b = startLife('cast-same'); const jb = picture(b, '2026-10-01', 60_000_000); castPicture(b, jb);
    expect(jb.studio!.cast).toEqual(ja.studio!.cast);
    const kept = ja.studio!.cast;
    castPicture(a, ja);
    expect(ja.studio!.cast).toBe(kept);
    const fee = (j: OutsideJob) => j.studio!.cast!.reduce((n, m) => n + (!m.tmdbId ? 0 : performerFee(standingOf(m.tmdbId!, 'actor', 2026)!.points, fameOf(m.tmdbId!))), 0);
    const c = startLife('cast-same'); const jc = picture(c, '2026-10-01', 4_000_000); castPicture(c, jc);
    expect(fee(jc)).toBeLessThan(fee(ja));
    // A part no recognised actor will play for its share goes to an unknown, invented by the game.
    expect(jc.studio!.cast!.some((m) => !m.tmdbId)).toBe(true);
    expect(jc.studio!.cast!.every((m) => m.name)).toBe(true);
  });

  it("doesn't cast anyone recognised only after it comes out", () => {
    const s = startLife('cast-early');
    const j = picture(s, '1995-06-01', 60_000_000);
    castPicture(s, j);
    for (const m of j.studio!.cast!.filter((x) => x.tmdbId)) expect(standingOf(m.tmdbId!, 'actor', 1995)).not.toBeNull();
  });
  it("names each part for the actor's gender as the record states it", () => {
    const s = startLife('cast-parts');
    const j = picture(s, '2026-10-01', 60_000_000);
    castPicture(s, j);
    const firsts = { woman: WOMEN_FIRSTS, man: MEN_FIRSTS };
    for (const m of j.studio!.cast!) {
      const g = m.tmdbId ? genderOf(m.tmdbId) : m.gender;
      expect(m.gender).toBe(g);
      expect((g ? firsts[g] : ANY_FIRSTS)).toContain(m.character!.split(' ')[0]);
    }
    // The record says so: an actress's categories, an actor's.
    expect(genderOf(11514)).toBe('woman'); // Catherine O'Hara
    expect(genderOf(6752)).toBe('man'); // Željko Ivanek
  });

  it('is directed and written by you, its other heads of department real where the record has someone the budget pays', () => {
    const s = startLife('cast-crew');
    const j = picture(s, '2026-10-01', 60_000_000);
    castPicture(s, j);
    const crew = j.studio!.crew!;
    expect(crew.map((c) => c.job)).toEqual(PICTURE_CREW.map((c) => c.job));
    for (const c of crew.filter((x) => x.job === 'Director' || x.job === 'Screenplay')) expect(c).toMatchObject({ name: s.character.name, you: true });
    // Its producers are real too, recognised for the pictures and series they produced, and two different people.
    const producers = crew.filter((c) => c.job === 'Producer');
    expect(producers.every((c) => c.tmdbId)).toBe(true);
    expect(new Set(producers.map((c) => c.tmdbId)).size).toBe(2);
    const real = crew.filter((c) => c.tmdbId);
    expect(real.length).toBeGreaterThanOrEqual(8);
    for (const c of real) {
      const job = PICTURE_CREW.find((x) => x.job === c.job)!.recognised!;
      const st = standingOf(c.tmdbId!, job, 2026)!;
      expect(st).not.toBeNull();
      expect(filmFeeFrom(st.points)).toBeLessThanOrEqual(60_000_000 * CREW_SHARE);
    }
    const everyone = [...j.studio!.cast!, ...real].filter((x) => x.tmdbId).map((x) => x.tmdbId);
    expect(new Set(everyone).size).toBe(everyone.length);
  });

  it('keeps the actors of a cast chosen before parts were named, and names their parts', () => {
    const s = startLife('cast-older');
    const j = picture(s, '2026-10-01', 60_000_000);
    j.studio!.cast = [{ name: "Catherine O'Hara", tmdbId: 11514 }, { name: 'Elsa Holt' }];
    castPicture(s, j);
    expect(j.studio!.cast!.map((m) => m.name)).toEqual(["Catherine O'Hara", 'Elsa Holt']);
    expect(j.studio!.cast![0].gender).toBe('woman');
    expect(WOMEN_FIRSTS).toContain(j.studio!.cast![0].character!.split(' ')[0]);
    expect(j.studio!.cast![1].character).toBeTruthy();
    expect(j.studio!.crew).toHaveLength(PICTURE_CREW.length);
  });
});


// A studio's country (November 22, 2026): Toho casts performers Japan's own awards recognised, and anyone it invents,
// part or crew, has a Japanese name. Before then every studio cast from the one record and named its parts Grace and Walter.
describe("a studio picture cast from the studio's own country", () => {
  const toho = (s: GameState) => { s.industry = { horizon: '2026-11-10', builtAt: '2026-11-10T00:00:00Z', series: {}, studios: [{ c: 'company:toho', name: 'TOHO', n: 10, g: [['Drama', 10]] } as StudioProfile] }; };
  const jp = namesFor('JP')!;

  it('casts actors the Japan Academy Prizes recognised, never one recognised only abroad', () => {
    const s = startLife('cast-toho'); toho(s);
    const j = picture(s, '2026-10-01', 60_000_000);
    castPicture(s, j);
    const real = j.studio!.cast!.filter((m) => m.tmdbId);
    expect(real.length).toBeGreaterThanOrEqual(4);
    for (const m of real) expect(recognisedAtHome(m.tmdbId!, 'JP', 2026)).toBe(true);
    // At any budget: a part Japan's own can't be paid for goes to an unknown, not to someone recognised abroad.
    for (const budget of [500_000, 2_000_000, 5_000_000, 15_000_000, 200_000_000]) {
      const b = startLife(`cast-toho-${budget}`); toho(b);
      const jb = picture(b, '2026-10-01', budget);
      castPicture(b, jb);
      for (const m of jb.studio!.cast!) if (m.tmdbId) expect(recognisedAtHome(m.tmdbId, 'JP', 2026)).toBe(true);
    }
    // Every part, whoever plays it, is a Japanese name.
    for (const m of j.studio!.cast!) {
      const [first, last] = m.character!.split(' ');
      expect([...jp.women, ...jp.men]).toContain(first);
      expect(jp.last).toContain(last);
    }
    // The same picture at a studio the game has no country for casts as before: Hollywood's record, English names.
    const u = startLife('cast-toho');
    const ju = picture(u, '2026-10-01', 60_000_000);
    castPicture(u, ju);
    expect(ju.studio!.cast!.filter((m) => m.tmdbId && !recognisedAtHome(m.tmdbId, 'JP', 2026)).length).toBeGreaterThan(0);
  });

  it("casts from the whole record where the country's own can't fill a picture's parts", () => {
    // Canada's: the record holds none of the Canadian Screen Awards' film acting prizes, one actor in all.
    const s = startLife('cast-canada');
    s.industry = { horizon: '2026-11-10', builtAt: '2026-11-10T00:00:00Z', series: {}, studios: [{ c: 'company:walt-disney-animation-studios-vancouver', name: 'Vancouver Fixture', n: 1, g: [['Drama', 1]] } as StudioProfile] };
    const j = picture(s, '2026-10-01', 60_000_000);
    j.company = 'Vancouver Fixture';
    castPicture(s, j);
    expect(j.studio!.cast!.every((m) => m.tmdbId)).toBe(true);
    expect(j.studio!.cast!.filter((m) => !recognisedAtHome(m.tmdbId!, 'CA', 2026)).length).toBeGreaterThan(0);
  });

  it('gives a part none of its own can be paid for to an unknown with a Japanese name, and so its crew', () => {
    const s = startLife('cast-toho-small'); toho(s);
    const j = picture(s, '2026-10-01', 300_000);
    castPicture(s, j);
    const invented = j.studio!.cast!.filter((m) => !m.tmdbId);
    expect(invented.length).toBeGreaterThan(0);
    for (const m of invented) {
      const [first, last] = m.name.split(' ');
      expect(m.gender === 'woman' ? jp.women : jp.men).toContain(first);
      expect(jp.last).toContain(last);
    }
    const crew = j.studio!.crew!.filter((c) => !c.tmdbId && !c.you);
    expect(crew.length).toBeGreaterThan(0);
    for (const c of crew) expect(jp.last).toContain(c.name.split(' ').at(-1));
  });
});
