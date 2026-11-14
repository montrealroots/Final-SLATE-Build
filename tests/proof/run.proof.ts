// Runs the probes (npm run proof): PROBES=id,id picks some, SEEDS=n sets the seeds. Each result is written to
// docs/v10/proof/ for tests/v10-features.test.ts; a probe that doesn't prove its feature fails here too.
import { describe, expect, it } from 'vitest';
import { runProbe, writeResult } from './probe';
import { PROBES as CORE } from './probes/career-core';
import { PROBES as PRODUCTION } from './probes/production';
import { PROBES as RELEASE } from './probes/release';
import { PROBES as AWARDS } from './probes/awards';
import { PROBES as BANK } from './probes/bank';
import { PROBES as PAPERS } from './probes/papers';
import { PROBES as SCRIPT } from './probes/script';
import { PROBES as PROJECT } from './probes/project';
import { PROBES as CAREER_WIDE } from './probes/career-wide';
import { PROBES as WEATHER } from './probes/weather';

const ALL = [...CORE, ...PRODUCTION, ...RELEASE, ...AWARDS, ...BANK, ...PAPERS, ...SCRIPT, ...PROJECT, ...CAREER_WIDE, ...WEATHER];
const pick = process.env.PROBES?.split(',');
const seeds = process.env.SEEDS ? Number(process.env.SEEDS) : undefined;

describe('feature proofs', () => {
  for (const p of ALL.filter((x) => !pick || pick.includes(x.id))) {
    it(`${p.id}: ${p.decision}`, () => {
      const r = runProbe(p, p.seeds ?? seeds);
      writeResult(r);
      const why = JSON.stringify({ bites: r.bites, downstream: r.downstream, diff: Object.fromEntries([...p.bites, ...p.downstream].map((m) => [m, r.diff[m]])) });
      expect(r.verdict, why).toBe('proven');
    });
  }
});
