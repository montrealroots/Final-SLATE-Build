// The scheduled systems' proofs (tests/proof/probes/scheduled.ts, scheduled-more.ts), a file of their own so they run beside the others.
import { describe, expect, it } from 'vitest';
import { runProbe, writeResult } from './probe';
import { PROBES as FIRST } from './probes/scheduled';
import { PROBES as MORE } from './probes/scheduled-more';

const PROBES = [...FIRST, ...MORE];

const pick = process.env.PROBES?.split(',');
const seeds = process.env.SEEDS ? Number(process.env.SEEDS) : undefined;
describe('scheduled system proofs', () => {
  for (const p of PROBES.filter((x) => !pick || pick.includes(x.id))) {
    it(`${p.id}: ${p.decision}`, () => {
      const r = runProbe(p, p.seeds ?? seeds);
      writeResult(r);
      expect(r.verdict, JSON.stringify({ bites: r.bites, downstream: r.downstream, fired: r.diff.fired, diff: Object.fromEntries([...p.bites, ...p.downstream].map((m) => [m, r.diff[m]])) })).toBe('proven');
    });
  }
});
