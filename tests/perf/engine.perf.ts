// Measures what rollback protection costs on fresh, medium and long-running saves, with fixed seeds, so results can be
// compared before and after a change on the same machine. Writes docs/perf/engine-<label>.json (PERF_LABEL, default "run").
import { writeFileSync } from 'fs';
import { expect, it } from 'vitest';
import { DAY, processUntil, serialize } from '../engine-api';
import { BROWSER_STORAGE_CHARS, memoryStore, writeSave } from '../../src/engine/save';
import { hashString } from '../../src/engine/rng';
import { copyPlain } from '../../src/engine/copy';
import { startSleep } from '../../src/engine/state';
import type { GameState } from '../../src/engine/types';
import { approve, buildProject, castAll, runDays, staffAll, startLife, startProduction } from '../helpers';

const MIN = 60_000;
const gc = (globalThis as { gc?: () => void }).gc;

function fresh(): GameState {
  return startLife('perf-fresh', 'gb-london');
}

function feature(s: GameState, title: string) {
  const sc = Array.from({ length: 14 }, (_, i) => ({ place: ['House', 'Field', 'Bar', 'Office', 'Car Park'][i % 5], intExt: (i % 5 === 1 || i % 5 === 4 ? 'EXT' : 'INT') as 'INT' | 'EXT', chars: i % 3 === 0 ? ['Lead', 'Rival'] : ['Lead', 'Ally'], minutes: 3.5 }));
  const p = buildProject(s, { title, format: 'feature', medium: 'live-action', scenario: 'low', genres: ['thriller'], runtime: 50 },
    [{ name: 'Lead', patch: { roleSize: 'lead' } }, { name: 'Rival', patch: { roleSize: 'supporting' } }, { name: 'Ally', patch: { roleSize: 'supporting' } }], sc);
  approve(s, p);
  castAll(s, p);
  staffAll(s, p);
  startProduction(s, p, 7);
  return p;
}

/** One low-budget feature two weeks into its shoot. */
function medium(): GameState {
  const s = startLife('perf-medium', 'gb-london');
  const p = feature(s, 'Medium');
  runDays(s, p, 20);
  return s;
}

/** Three features made one after another to delivery, then a further year of ordinary life: the log, ledgers and editions grow. */
function long(): GameState {
  const s = startLife('perf-long', 'gb-london');
  for (const t of ['One', 'Two', 'Three']) {
    const p = feature(s, t);
    runDays(s, p, 500);
  }
  for (let i = 0; i < 365; i++) processUntil(s, s.now + DAY, 'tick', 100000);
  return s;
}

function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  return Math.round(s[Math.floor(s.length / 2)] * 1000) / 1000;
}

function time(fn: () => void, reps: number) {
  const out: number[] = [];
  for (let i = 0; i < reps; i++) {
    const t = performance.now();
    fn();
    out.push(performance.now() - t);
  }
  return median(out);
}

/** Times only `run` on a fresh copy of `base` each repetition; the copy and any checking are outside the timing. */
function timeOn<T>(base: GameState, reps: number, run: (s: GameState) => T, after?: (s: GameState, r: T) => void) {
  const out: number[] = [];
  for (let i = 0; i < reps; i++) {
    const s = structuredClone(base);
    const t = performance.now();
    const r = run(s);
    out.push(performance.now() - t);
    after?.(s, r);
  }
  return median(out);
}

/** Runs a mode to `to`, continuing past interrupts as a player pressing Advance again would. */
function drive(s: GameState, to: number, mode: 'tick' | 'advance' | 'sleep', batch: number) {
  let events = 0;
  let calls = 0;
  for (;;) {
    const r = processUntil(s, to, mode, batch);
    events += r.processed;
    calls += 1;
    if (r.done) return { events, calls };
  }
}

/**
 * Storage during saving, in characters as browsers count them. "Normal" is a save with its backup; "with recovery copies"
 * adds a migration backup and a damaged copy of the same size. Peak is the most in use at any moment of the next save.
 */
function storage(base: GameState) {
  const run = (extras: boolean) => {
    const kv = memoryStore();
    const s = copyPlain(base);
    writeSave(kv, s, 1);
    s.now += 60_000;
    writeSave(kv, s, 2);
    if (extras) {
      const main = kv.getItem(`slate.v1.save.${s.saveId}`)!;
      kv.setItem(`slate.v1.save.${s.saveId}.backup-v1`, main);
      kv.setItem(`slate.v1.save.${s.saveId}.damaged-3`, main.slice(0, -10));
    }
    const steady = kv.used();
    kv.peak = steady;
    s.now += 60_000;
    const ok = writeSave(kv, s, 4).ok;
    return { steadyKB: Math.round(steady / 1024), peakKB: Math.round(kv.peak / 1024), peakOverSaveSize: Math.round((kv.peak / serialize(s).length) * 100) / 100, ok };
  };
  const normal = run(false);
  return { normal, withRecoveryCopies: run(true), browserLimitKB: Math.round(BROWSER_STORAGE_CHARS / 1024) };
}

function measure(name: string, base: GameState) {
  const size = serialize(base).length;
  const cloneMs = time(() => structuredClone(base), 30);
  const snapshotMs = time(() => copyPlain(base), 30);
  let heap = null as number | null;
  if (gc) {
    gc();
    const before = process.memoryUsage().heapUsed;
    const keep = copyPlain(base);
    gc();
    heap = Math.round((process.memoryUsage().heapUsed - before) / 1024);
    expect(keep.saveId).toBe(base.saveId);
  }
  // Natural ticking: the store ticks every 250 ms; at the fastest speed each tick covers about 15 game minutes.
  let tickEvents = 0;
  let tickHash = 0;
  const tickMs = timeOn(base, 3, (s) => {
    let n = 0;
    for (let i = 0; i < 96 * 7; i++) n += processUntil(s, s.now + 15 * MIN, 'tick', 200).processed;
    return n;
  }, (s, n) => { tickEvents = n; tickHash = hashString(serialize(s)); });
  let adv = { events: 0, calls: 0 };
  let advHash = 0;
  const advanceMs = timeOn(base, 3, (s) => drive(s, s.now + 30 * DAY, 'advance', 400), (s, r) => { adv = r; advHash = hashString(serialize(s)); });
  let slp = { events: 0, calls: 0 };
  const sleepMs = timeOn(base, 5, (s) => {
    startSleep(s, s.now + 8 * 60 * MIN, true);
    return drive(s, s.sleep.wakeAt!, 'sleep', 400);
  }, (_s, r) => { slp = r; });
  const parts = Object.fromEntries(Object.entries(base).map(([k, v]) => [k, Math.round((JSON.stringify(v) ?? '').length / 1024)]).filter(([, kb]) => (kb as number) >= 5));
  return {
    name, saveKB: Math.round(size / 1024), storage: storage(base), events: base.events.length, projects: base.projects.length, log: base.log.length,
    structuredCloneMs: cloneMs, snapshotMs, snapshotHeapKB: heap, partsKB: parts,
    tick: { ms: tickMs, calls: 96 * 7, events: tickEvents, msPerCall: Math.round((tickMs / (96 * 7)) * 1000) / 1000, resultHash: tickHash },
    advance30Days: { ms: advanceMs, ...adv, resultHash: advHash },
    sleep8Hours: { ms: sleepMs, ...slp },
  };
}

it('measures rollback copying on fresh, medium and long saves', () => {
  const t0 = performance.now();
  const saves = { fresh: fresh(), medium: medium(), long: long() };
  const buildMs = Math.round(performance.now() - t0);
  // For the browser comparison (scripts/perf-browser.mjs): the same saves, written where the caller asks.
  if (process.env.PERF_SAVE_DIR) for (const [n, s] of Object.entries(saves)) writeFileSync(`${process.env.PERF_SAVE_DIR}/${n}.save`, serialize(s));
  const rows = Object.entries(saves).map(([n, s]) => measure(n, s));
  const out = { label: process.env.PERF_LABEL ?? 'run', node: process.version, date: new Date().toISOString().slice(0, 10), buildSavesMs: buildMs, rows };
  writeFileSync(`docs/perf/engine-${out.label}.json`, JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out, null, 1));
});
