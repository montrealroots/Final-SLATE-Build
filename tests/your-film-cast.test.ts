// A studio picture's cast, chosen from real actors (src/engine/your-films.ts castPicture; the owner, November 19, 2026:
// "now do one with real cast"). In its own file because the awards record, once loaded, stays loaded for the file, and
// your-films.test.ts keeps the invented cast a picture has without it.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyRecognition, fameOf, performerFee, standingOf } from '../src/engine/recognition';
import { castPicture, pictureCredits, LEAD_SHARE, SUPPORTING_SHARE } from '../src/engine/your-films';
import type { OutsideJob } from '../src/engine/jobs';
import type { GameState } from '../src/engine/types';
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
    // The crew are the ones the picture had before it was cast.
    expect(pictureCredits(s, j).crew).toEqual(crewBefore);
    expect(pictureCredits(s, j).cast).toBe(cast);
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
});
