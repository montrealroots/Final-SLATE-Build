import { beforeAll, describe, expect, it } from 'vitest';
import { HERITAGES, LANGUAGES } from '../src/data/identity';
import { HERITAGE_LANGUAGES, heritageLanguages } from '../src/data/heritage-languages';
import { OBSERVANCES, assessQuality, candidates, createProject, isWorkingDay, observanceDate, observancesOn, personById, sharedHeritages, suggestedObservances } from '../src/engine';
import { loadWorldHolidays } from '../src/world/holidays/holidays';
import type { GameState, Project } from '../src/engine/types';
import { buildProject, startLife } from './helpers';


beforeAll(async () => {
  await loadWorldHolidays();
});

describe('backgrounds suggest holidays you keep, dated by the holiday rules', () => {
  it('every observance has a 2026 date from the rules of a country that keeps it; calendar-based ones run to 2100', () => {
    for (const o of OBSERVANCES) expect(observanceDate(o.id, 2026), o.id).toMatch(/^2026-\d{2}-\d{2}$/);
    // Dated only as far as their country has announced (no invented dates): Diwali, Vesak and these new years.
    const announced = new Set(['diwali', 'vesak', 'thai-pongal', 'sinhala-tamil-new-year', 'khmer-new-year', 'tsagaan-sar']);
    for (const o of OBSERVANCES.filter((x) => !announced.has(x.id))) {
      for (const y of [2040, 2100]) expect(observanceDate(o.id, y), `${o.id} ${y}`).toMatch(new RegExp(`^${y}-\\d{2}-\\d{2}$`));
    }
    expect(observanceDate('lunar-new-year', 2040)).toBe('2040-02-12');
    // Dates the published calendars give for 2026.
    expect(observanceDate('lunar-new-year', 2026)).toBe('2026-02-17');
    expect(observanceDate('eid-al-fitr', 2026)).toBe('2026-03-20');
    expect(observanceDate('diwali', 2026)).toBe('2026-11-08');
    expect(observanceDate('rosh-hashanah', 2026)).toBe('2026-09-12');
    expect(observanceDate('orthodox-easter', 2026)).toBe('2026-04-12');
    expect(observanceDate('easter', 2026)).toBe('2026-04-05');
  });

  it('every background named in the tables is a real background, and every suggested language a real language', () => {
    for (const o of OBSERVANCES) for (const h of o.heritages) expect(HERITAGES, `${o.id}: ${h}`).toContain(h);
    const codes = new Set(LANGUAGES.map((l) => l.code));
    // Every background suggests a language, except Assyrian (Neo-Aramaic isn't among the game's languages).
    expect(HERITAGES.filter((h) => !HERITAGE_LANGUAGES[h])).toEqual(['Assyrian']);
    for (const [h, langs] of Object.entries(HERITAGE_LANGUAGES)) {
      expect(HERITAGES, h).toContain(h);
      for (const l of langs) expect(codes.has(l), `${h}: ${l}`).toBe(true);
    }
  });

  it('suggestions follow the backgrounds chosen; holidays nobody is suggested are still open to everyone', () => {
    expect(suggestedObservances(['Korean']).map((o) => o.id)).toEqual(['seollal', 'chuseok']);
    expect(suggestedObservances(['Polish'])).toEqual([]);
    expect(OBSERVANCES.some((o) => o.id === 'easter' && o.heritages.length === 0)).toBe(true);
    expect(heritageLanguages(['Yoruba', 'Polish', 'Yoruba'])).toEqual(['yo', 'pl']);
  });

  it('kept holidays carry into every new project, and its shoot days skip them', () => {
    const s = startLife('obs-keep', 'gb-london', { observances: ['diwali', 'eid-al-fitr'] });
    expect(s.character.observances).toEqual(['diwali', 'eid-al-fitr']);
    const p = createProject(s, { title: 'Lights', scenarioId: 'micro', axes: { format: 'short', medium: 'live-action', targetRuntimeMin: 10 } });
    expect(p.schedule.observances).toEqual(['diwali', 'eid-al-fitr']);
    expect(observancesOn(p.schedule.observances, '2026-03-20').map((o) => o.name)).toEqual(['Eid al-Fitr']);
    expect(isWorkingDay(p, '2026-03-20')).toBe(false); // a Friday, kept
    expect(isWorkingDay(p, '2026-03-19')).toBe(true);
    // Someone who doesn't keep it shoots that Friday; a project told to work holidays shoots it too.
    const other = createProject(startLife('obs-none'), { title: 'Lights', scenarioId: 'micro', axes: { format: 'short', medium: 'live-action', targetRuntimeMin: 10 } });
    expect(isWorkingDay(other, '2026-03-20')).toBe(true);
    p.schedule.workHolidays = true;
    expect(isWorkingDay(p, '2026-03-20')).toBe(true);
  });
});

// Until the review of November 7, 2026 a shared background added 6 to a performance. Ability isn't inferred from
// ethnicity: casting shows who shares a background, as information for the producer, and the score ignores it.
describe('a shared background is shown in casting and never scores a performance', () => {
  function cast(s: GameState, heritages: string[] | undefined, performer: 'player' | string): Project {
    const p = buildProject(s, { title: 'Harbour', format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ines', patch: { roleSize: 'lead', heritages } }], [{ place: 'Harbour', chars: ['Ines'], minutes: 6 }]);
    p.cast = [{ characterId: p.characters[0].id, performer, method: 'on-camera', note: '' }];
    return p;
  }
  const perf = (s: GameState, p: Project) => assessQuality(s, p)[`performance:${p.characters[0].id}:${p.cast[0].performer}`];

  it('you, playing a character written with a background you share', () => {
    const s = startLife('auth-me'); // Japanese and French
    const shared = cast(s, ['Japanese'], 'player');
    expect(sharedHeritages(s, shared, shared.characters[0].id, 'player')).toEqual(['Japanese']);
    const unwritten = cast(s, undefined, 'player');
    const unshared = cast(s, ['Korean'], 'player');
    expect(perf(s, shared)).toBe(perf(s, unwritten));
    expect(perf(s, unshared)).toBe(perf(s, unwritten));
  });

  it('a performer from the pool, whose backgrounds are drawn with the rest of them and stay the same', () => {
    const s = startLife('auth-pool');
    const pool = candidates(s, 'actor', 'GB');
    expect(pool.every((x) => x.heritages.length >= 1 && x.heritages.every((h) => HERITAGES.includes(h)))).toBe(true);
    const actor = pool[0];
    expect(personById(startLife('auth-pool'), actor.id).heritages).toEqual(actor.heritages); // deterministic
    const shared = cast(s, [actor.heritages[0]], actor.id);
    const unwritten = cast(s, undefined, actor.id);
    expect(sharedHeritages(s, shared, shared.characters[0].id, actor.id)).toEqual([actor.heritages[0]]);
    expect(perf(s, shared)).toBe(perf(s, unwritten));
  });
});
