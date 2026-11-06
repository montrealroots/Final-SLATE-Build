// Long careers through the engine (not a UI playthrough): real productions made one after another, released, entered
// at festivals and awards, with time passing between them. Measures what a save holds at 1, 5, 10, 25 and 50 years.
// CAREER_YEARS (default 10) limits the run; CAREER_LABEL names docs/perf/career-<label>.json; CAREER_SAVE_DIR keeps saves.
import { writeFileSync } from 'fs';
import { expect, it } from 'vitest';
import { DAY, checkEligibility, categoriesFor, institution, planRelease, processUntil, serialize, submitEntry } from '../engine-api';
import { deserialize, memoryStore, writeSave } from '../../src/engine/save';
import { copyPlain } from '../../src/engine/copy';
import { dateKey, addDaysToKey } from '../../src/engine/time';
import type { GameState, Project } from '../../src/engine/types';
import { approve, buildProject, castAll, runDays, staffAll, startLife, startProduction } from '../helpers';

const YEAR = 365.25 * DAY;
const gc = (globalThis as { gc?: () => void }).gc;

type Maker = (s: GameState, n: number) => Project;
const makers: Maker[] = [
  (s, n) => buildProject(s, { title: `Short ${n}`, format: 'short', medium: 'live-action', scenario: 'micro', genres: ['drama'], runtime: 10 },
    [{ name: 'Lead', patch: { roleSize: 'lead' } }, { name: 'Friend', patch: { roleSize: 'supporting' } }],
    [{ place: 'Flat', chars: ['Lead', 'Friend'], minutes: 3 }, { place: 'Street', intExt: 'EXT', chars: ['Lead'], minutes: 2 }, { place: 'Cafe', chars: ['Lead', 'Friend'], minutes: 3 }]),
  (s, n) => {
    const sc = Array.from({ length: 14 }, (_, i) => ({ place: ['House', 'Field', 'Bar', 'Office', 'Car Park'][i % 5], intExt: (i % 5 === 1 || i % 5 === 4 ? 'EXT' : 'INT') as 'INT' | 'EXT', chars: i % 3 === 0 ? ['Lead', 'Rival'] : ['Lead', 'Ally'], minutes: 3.5 }));
    return buildProject(s, { title: `Feature ${n}`, format: 'feature', medium: 'live-action', scenario: 'low', genres: ['thriller'], runtime: 50 },
      [{ name: 'Lead', patch: { roleSize: 'lead' } }, { name: 'Rival', patch: { roleSize: 'supporting' } }, { name: 'Ally', patch: { roleSize: 'supporting' } }], sc);
  },
  (s, n) => buildProject(s, { title: `Drawn ${n}`, format: 'short', medium: 'animation', technique: '2d-drawn', genres: ['family'], runtime: 5, quality: 'tv' },
    [{ name: 'Kit', patch: { roleSize: 'lead' } }, { name: 'Owl', patch: { entity: 'animal' } }], [{ place: 'Wood', chars: ['Kit', 'Owl'], minutes: 1.5 }, { place: 'Den', chars: ['Kit'], minutes: 1.5 }]),
];

/** Make one project to delivery, release it, and enter it wherever it is eligible (up to four entries). */
function makeOne(s: GameState, n: number): void {
  const p = makers[n % makers.length](s, n);
  approve(s, p);
  castAll(s, p);
  staffAll(s, p);
  startProduction(s, p, 7);
  runDays(s, p, 400);
  if (!p.delivered) return;
  const today = dateKey(s.now, 'UTC');
  try { planRelease(s, p, { route: 'digital', date: addDaysToKey(today, 7), territories: ['US', 'GB'] }); } catch { /* not releasable */ }
  let entered = 0;
  for (const ed of s.editions.filter((e) => e.status === 'open' || e.status === 'upcoming')) {
    for (const c of categoriesFor(institution(ed.institutionId), ed.year)) {
      if (entered >= 4) return;
      if (checkEligibility(s, p, ed, c).eligible) {
        try { submitEntry(s, p, ed.id, c.id); entered += 1; } catch { /* fee or duplicate */ }
      }
    }
  }
}

function parts(s: GameState) {
  const kb = (v: unknown) => Math.round((JSON.stringify(v) ?? '').length / 1024);
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(s)) { const x = kb(v); if (x >= 2) out[k] = x; }
  const proj: Record<string, number> = {};
  for (const p of s.projects) for (const [k, v] of Object.entries(p)) proj[k] = (proj[k] ?? 0) + kb(v);
  return { top: out, projectFields: Object.fromEntries(Object.entries(proj).filter(([, x]) => x >= 5).sort((a, b) => b[1] - a[1])) };
}

function time(fn: () => void, reps = 3) {
  const xs: number[] = [];
  for (let i = 0; i < reps; i++) { const t = performance.now(); fn(); xs.push(performance.now() - t); }
  return Math.round(xs.sort((a, b) => a - b)[Math.floor(reps / 2)] * 10) / 10;
}

function measure(s: GameState, years: number) {
  const text = serialize(s);
  let heapKB: number | null = null;
  if (gc) { gc(); const b = process.memoryUsage().heapUsed; const keep = copyPlain(s); gc(); heapKB = Math.round((process.memoryUsage().heapUsed - b) / 1024); expect(keep.saveId).toBe(s.saveId); }
  const kv = memoryStore();
  writeSave(kv, s, 1);
  s.now += 1;
  writeSave(kv, s, 2);
  kv.peak = kv.used();
  s.now += 1;
  const writeMs = time(() => { s.now += 1; writeSave(kv, s, 3); });
  return {
    years, projects: s.projects.length, delivered: s.projects.filter((p) => p.delivered).length, editions: s.editions.length,
    entries: s.editions.reduce((n, e) => n + e.entries.length, 0), rivalFilms: Object.keys(s.rivalFilms).length, log: s.log.length,
    saveKB: Math.round(text.length / 1024), peakWriteKB: Math.round(kv.peak / 1024), stateHeapKB: heapKB,
    serializeMs: time(() => serialize(s)), loadMs: time(() => deserialize(text)), writeSaveMs: writeMs,
    ...parts(s),
  };
}

it('measures saves across a long career', () => {
  const target = Number(process.env.CAREER_YEARS ?? 10);
  const marks = [1, 5, 10, 25, 50].filter((y) => y <= target);
  const s = startLife('career', 'gb-london');
  const t0 = performance.now();
  const rows: ReturnType<typeof measure>[] = [];
  let n = 0;
  for (let year = 1; year <= target; year++) {
    const end = s.startedAt + year * YEAR;
    // About two projects a year, then time passes to the end of the year.
    for (let k = 0; k < 2 && s.now < end - 120 * DAY; k++) makeOne(s, n++);
    while (s.now < end) processUntil(s, Math.min(end, s.now + 30 * DAY), 'tick', 1_000_000);
    if (marks.includes(year)) {
      rows.push(measure(s, year));
      if (process.env.CAREER_SAVE_DIR) writeFileSync(`${process.env.CAREER_SAVE_DIR}/career-${year}y.save`, serialize(s));
      console.log(JSON.stringify(rows.at(-1)));
    }
  }
  const out = { label: process.env.CAREER_LABEL ?? 'run', node: process.version, date: new Date().toISOString().slice(0, 10), simulatedSeconds: Math.round((performance.now() - t0) / 1000), rows };
  writeFileSync(`docs/perf/career-${out.label}.json`, JSON.stringify(out, null, 2) + '\n');
});
