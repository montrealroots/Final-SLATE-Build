// Fixed-seed production outcomes, recorded before the production module was split (November 6, 2026). The split must
// not change any of them: delivery timing, money, every payment and task, credits and quality. Regenerate only for an
// intended behaviour change: GOLDEN_WRITE=1 npx vitest run tests/production-golden.test.ts
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { describe, expect, it } from 'vitest';
import { DAY, ledgerTotals, processUntil } from './engine-api';
import { hashString } from '../src/engine/rng';
import { approve, buildProject, castAll, manage, runDays, staffAll, startLife, startProduction } from './helpers';
import type { GameState, Project } from '../src/engine/types';

const FILE = 'tests/fixtures-data/production-golden.json';

const families: Record<string, (s: GameState) => Project> = {
  'live-action short': (s) => buildProject(s, { title: 'A', format: 'short', medium: 'live-action', scenario: 'micro', genres: ['drama'], runtime: 8 },
    [{ name: 'Lead', patch: { roleSize: 'lead' } }], [{ place: 'Flat', chars: ['Lead'], minutes: 3 }, { place: 'Street', intExt: 'EXT', chars: ['Lead'], minutes: 2 }]),
  '2D short': (s) => buildProject(s, { title: 'C', format: 'short', medium: 'animation', technique: '2d-drawn', genres: ['family'], runtime: 4, quality: 'limited' },
    [{ name: 'Kit', patch: { roleSize: 'lead' } }], [{ place: 'Wood', chars: ['Kit'], minutes: 1 }]),
  '3D with motion capture': (s) => buildProject(s, { title: 'D', format: 'short', medium: 'animation', technique: '3d-cg', runtime: 3, quality: 'limited' },
    [{ name: 'Golem', patch: { roleSize: 'lead', entity: 'monster', methods: ['voice', 'motion-capture'] } }], [{ place: 'Quarry', chars: ['Golem'], minutes: 1 }]),
  'stop motion': (s) => buildProject(s, { title: 'E', format: 'short', medium: 'animation', technique: 'stop-motion', runtime: 3, quality: 'tv' },
    [{ name: 'Button', patch: { roleSize: 'lead' } }], [{ place: 'Drawer', chars: ['Button'], minutes: 1 }]),
  'TV limited series': (s) => buildProject(s, { title: 'G', format: 'limited-series', medium: 'live-action', genres: ['crime'], episodes: 2, runtime: 10 },
    [{ name: 'Detective', patch: { roleSize: 'lead' } }], [{ place: 'Precinct', chars: ['Detective'], minutes: 3, extra: { episode: 1 } }, { place: 'Alley', intExt: 'EXT', chars: ['Detective'], minutes: 3, extra: { episode: 2 } }]),
};

function outcome(name: string, seed: string) {
  const s = startLife(`golden-${name}-${seed}`, 'gb-london');
  const p = families[name](s);
  approve(s, p);
  castAll(s, p);
  staffAll(s, p);
  for (let i = 0; i < 10; i++) {
    manage(s, p);
    processUntil(s, s.now + DAY, 'tick', 100000);
  }
  const start = s.now;
  startProduction(s, p, 7);
  runDays(s, p, 500);
  const payments = p.obligations.flatMap((o) => o.postings.map((x) => `${o.label}|${x.kind}|${x.amount}|${x.key}`)).join('\n');
  const tasks = p.tasks.map((t) => `${t.id}|${t.units}|${t.done}|${t.status}|${t.workedDays}|${t.dependsOn.join(',')}`).join('\n');
  return {
    delivered: !!p.delivered,
    days: p.delivered ? Math.round((p.delivered.at - start) / DAY) : null,
    settled: ledgerTotals(p).settled,
    payments: hashString(payments),
    tasks: hashString(tasks),
    shootDays: p.schedule.days.map((d) => `${d.date}:${d.status}`).join(' '),
    credits: p.credits.map((c) => `${c.contribution}:${c.personName}${c.characterName ? `:${c.characterName}` : ''}`).sort().join('; '),
    quality: p.quality,
  };
}

describe('fixed-seed production outcomes are unchanged', () => {
  const got: Record<string, unknown> = {};
  for (const name of Object.keys(families)) for (const seed of ['g1', 'g2']) got[`${name} / ${seed}`] = outcome(name, seed);
  if (process.env.GOLDEN_WRITE || !existsSync(FILE)) writeFileSync(FILE, `${JSON.stringify(got, null, 2)}\n`);
  const want = JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, unknown>;
  for (const key of Object.keys(want)) it(key, () => expect(got[key]).toEqual(want[key]));
});
