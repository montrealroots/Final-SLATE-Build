// A proof by many played careers (the owner's command of November 14, 2026). Each probe changes one decision and keeps
// every other, over the same seeds, so each seed is its own control: the difference a seed shows is the decision's.
// - bites: a direct measure moves, its 95% interval over the seeds clear of zero;
// - downstream: at least one later measure, in another system, moves the same way;
// - reads: the engine function that reads the decision, named, which tests/v10-features.test.ts finds in the code.
// A probe's result is written to docs/v10/proof/<id>.json with the hash of every file it names, so a result measured
// before the code it reads last changed is stale, and the gate says so.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { DEFAULT_POLICY, playCareer, type Policy } from './career';
import { handlerOf, registerHandler } from '../../src/engine/state';
import type { GameState, Project } from '../../src/engine/types';

export interface Probe {
  id: string;
  /** Register ids this probe proves (tests/proof/register.ts). */
  features: string[];
  /** What the decision is, in the player's words. */
  decision: string;
  /** The engine function that reads it, as module.ts#function: checked to exist. */
  reads: string[];
  seeds?: number;
  base?: Partial<Policy>;
  variant: Partial<Policy>;
  /** Extra measures read from the end of each career. */
  measure?: (s: GameState, projects: Project[]) => Record<string, number>;
  bites: string[];
  downstream: string[];
  /** Kinds of event switched off in the variant: the falsifiability test for a system that runs as time passes. */
  disable?: string[];
}

export interface Stat { mean: number; lo: number; hi: number; changed: number; n: number }
export interface Result {
  id: string; features: string[]; decision: string; reads: string[]; seeds: number;
  base: Record<string, number>; variant: Record<string, number>; diff: Record<string, Stat>;
  bites: { metric: string; ok: boolean }[]; downstream: { metric: string; ok: boolean }[];
  verdict: 'proven' | 'does not bite' | 'no downstream effect';
  hashes: Record<string, string>;
}

const round = (x: number) => Math.round(x * 1000) / 1000;
/** Mean of paired differences with a 95% interval (Student's t, two-sided; the seeds are independent). */
export function paired(a: number[], b: number[]): Stat {
  const d = a.map((x, i) => b[i] - x);
  const n = d.length;
  const mean = d.reduce((s, x) => s + x, 0) / n;
  const sd = Math.sqrt(d.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, n - 1));
  const t = n >= 120 ? 1.98 : n >= 60 ? 2.0 : n >= 30 ? 2.045 : 2.262;
  const half = t * sd / Math.sqrt(n);
  return { mean: round(mean), lo: round(mean - half), hi: round(mean + half), changed: d.filter((x) => x !== 0).length, n };
}
const clear = (s: Stat) => s.lo > 0 || s.hi < 0;

export const hashOf = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 16);

export function runProbe(p: Probe, seeds = p.seeds ?? 40): Result {
  // Each event of a disabled kind is counted and does nothing; the base run counts the same kinds as they run.
  const switched = (off: boolean, run: () => Record<string, number>) => {
    const kinds = p.disable ?? [];
    const saved = kinds.map((k) => [k, handlerOf(k)] as const);
    let fired = 0;
    for (const [k, h] of saved) registerHandler(k, (state, ev) => { fired++; return off || !h ? { suppressInterrupt: true } : h(state, ev); });
    try { return { ...run(), fired }; } finally { for (const [k, h] of saved) if (h) registerHandler(k, h); }
  };
  const metrics = (pol: Policy, seed: string, off = false) => switched(off, () => {
    const r = playCareer(seed, pol);
    return { ...r.metrics, ...(p.measure?.(r.state, r.projects) ?? {}) };
  });
  // The files it reads are hashed before it runs, so code changed while it ran can't pass as what it measured.
  const files = [...new Set([...p.reads.map((r) => r.split('#')[0]), 'tests/proof/career.ts'])];
  const hashes = Object.fromEntries(files.map((f) => [f, hashOf(f)]));
  const base: Record<string, number>[] = [];
  const variant: Record<string, number>[] = [];
  for (let i = 0; i < seeds; i++) {
    const seed = `${p.id}-${i}`;
    base.push(metrics({ ...DEFAULT_POLICY, ...p.base }, seed));
    variant.push(metrics({ ...DEFAULT_POLICY, ...p.base, ...p.variant }, seed, true));
  }
  const keys = Object.keys(base[0]);
  const diff = Object.fromEntries(keys.map((k) => [k, paired(base.map((x) => x[k]), variant.map((x) => x[k]))]));
  const avg = (rows: Record<string, number>[]) => Object.fromEntries(keys.map((k) => [k, round(rows.reduce((s, x) => s + x[k], 0) / rows.length)]));
  const bites = p.bites.map((m) => ({ metric: m, ok: !!diff[m] && clear(diff[m]) }));
  const downstream = p.downstream.map((m) => ({ metric: m, ok: !!diff[m] && clear(diff[m]) }));
  return {
    id: p.id, features: p.features, decision: p.decision, reads: p.reads, seeds,
    base: avg(base), variant: avg(variant), diff, bites, downstream,
    verdict: !bites.every((b) => b.ok) ? 'does not bite' : !downstream.some((d) => d.ok) ? 'no downstream effect' : 'proven',
    hashes,
  };
}

export function writeResult(r: Result): void {
  mkdirSync('docs/v10/proof', { recursive: true });
  writeFileSync(`docs/v10/proof/${r.id}.json`, JSON.stringify(r, null, 1) + '\n');
}
