// Reproducible balance experiments: 30 fixed seeds per scenario family plus single-variable
// sensitivity checks. Results go to docs/balance-results.json for BALANCE-REPORT.md.
import { writeFileSync } from 'fs';
import { expect, it } from 'vitest';
import { DAY, ledgerTotals, processUntil } from '../engine-api';
import { approve, buildProject, castAll, manage, runDays, staffAll, startLife, startProduction } from '../helpers';
import type { GameState, Project } from '../../src/engine/types';

const SEEDS = Array.from({ length: 30 }, (_, i) => `seed${i + 1}`);

type Family = (s: GameState, variant: Record<string, number>) => Project;

const families: Record<string, Family> = {
  'live-action short (micro budget)': (s) => buildProject(s, { title: 'A', format: 'short', medium: 'live-action', scenario: 'micro', genres: ['drama'], runtime: 10 },
    [{ name: 'Lead', patch: { roleSize: 'lead' } }, { name: 'Friend', patch: { roleSize: 'supporting' } }],
    [{ place: 'Flat', chars: ['Lead', 'Friend'], minutes: 3 }, { place: 'Street', intExt: 'EXT', chars: ['Lead'], minutes: 2 }, { place: 'Cafe', chars: ['Lead', 'Friend'], minutes: 3 }]),
  'live-action feature (low budget)': (s, v) => {
    const sc = Array.from({ length: 14 }, (_, i) => ({ place: ['House', 'Field', 'Bar', 'Office', 'Car Park'][i % 5], intExt: (i % 5 === 1 || i % 5 === 4 ? 'EXT' : 'INT') as 'INT' | 'EXT', chars: i % 3 === 0 ? ['Lead', 'Rival'] : ['Lead', 'Ally'], minutes: 3.5, extra: i === 5 ? { stunts: 'Fight', crowd: 25 } : {} }));
    const p = buildProject(s, { title: 'B', format: 'feature', medium: 'live-action', scenario: v.mid ? 'mid' : 'low', genres: ['thriller'], runtime: 50 },
      [{ name: 'Lead', patch: { roleSize: 'lead' } }, { name: 'Rival', patch: { roleSize: 'supporting', functions: ['antagonist'] } }, { name: 'Ally', patch: { roleSize: 'supporting' } }], sc);
    p.schedule.rehearsalDays = v.rehearsal ?? 3;
    return p;
  },
  '2D drawn short': (s) => buildProject(s, { title: 'C', format: 'short', medium: 'animation', technique: '2d-drawn', genres: ['family'], runtime: 5, quality: 'tv' },
    [{ name: 'Kit', patch: { roleSize: 'lead' } }, { name: 'Owl', patch: { entity: 'animal' } }], [{ place: 'Wood', chars: ['Kit', 'Owl'], minutes: 1.5 }, { place: 'Den', chars: ['Kit'], minutes: 1.5 }]),
  '3D CG short': (s, v) => {
    const p = buildProject(s, { title: 'D', format: 'short', medium: 'animation', technique: '3d-cg', genres: ['science-fiction'], runtime: 4, quality: 'tv' },
      [{ name: 'Nova', patch: { roleSize: 'lead' } }, { name: 'Drone', patch: { entity: 'robot' } }], [{ place: 'Deck', chars: ['Nova', 'Drone'], minutes: 1.5 }, { place: 'Hangar', chars: ['Drone'], minutes: 1, extra: { vfx: ['Sparks'] } }]);
    p.schedule.renderNodes = v.nodes ?? 20;
    return p;
  },
  'stop-motion short': (s, v) => {
    const p = buildProject(s, { title: 'E', format: 'short', medium: 'animation', technique: 'stop-motion', genres: ['mystery'], runtime: 4, quality: 'tv' },
      [{ name: 'Button', patch: { roleSize: 'lead' } }, { name: 'Spool', patch: {} }], [{ place: 'Drawer', chars: ['Button', 'Spool'], minutes: 1 }, { place: 'Shelf', chars: ['Button'], minutes: 1 }, { place: 'Box', chars: ['Button'], minutes: 1 }]);
    p.schedule.stages = v.stages ?? 2;
    if (v.copies) for (const c of p.characters) p.schedule.puppetCopies[c.id] = v.copies;
    return p;
  },
  'TV limited series (2 episodes)': (s) => buildProject(s, { title: 'G', format: 'limited-series', medium: 'live-action', genres: ['crime'], episodes: 2, runtime: 25 },
    [{ name: 'Detective', patch: { roleSize: 'lead' } }, { name: 'Suspect', patch: { seriesInvolvement: 'guest' } }],
    [{ place: 'Precinct', chars: ['Detective'], minutes: 3, extra: { episode: 1 } }, { place: 'Alley', intExt: 'EXT', chars: ['Detective', 'Suspect'], minutes: 3, extra: { episode: 1 } }, { place: 'Precinct', chars: ['Detective'], minutes: 3, extra: { episode: 2 } }]),
};

function run(name: string, seed: string, variant: Record<string, number> = {}) {
  const s = startLife(`${name}-${seed}`, 'gb-london');
  const p = families[name](s, variant);
  approve(s, p);
  castAll(s, p);
  staffAll(s, p);
  for (let i = 0; i < 10; i++) {
    manage(s, p);
    processUntil(s, s.now + DAY, 'tick', 100000);
  }
  const start = s.now;
  const { neededCoProducer } = startProduction(s, p, 7);
  runDays(s, p, 500);
  const t = ledgerTotals(p);
  return {
    neededCoProducer: neededCoProducer || p.funding.extra.length > 0, delivered: !!p.delivered, days: p.delivered ? Math.round((p.delivered.at - start) / DAY) : null, spent: t.settled, fund: t.fund, cashNegative: t.cash < 0,
    lostDays: p.schedule.days.filter((d) => d.status === 'lost').length, shootDays: p.schedule.days.length,
    overall: p.quality?.overall ?? null, reception: p.quality?.reception ?? null,
    doubleSettle: (() => { const k = p.obligations.flatMap((o) => o.postings.filter((x) => x.kind === 'settle').map((x) => x.key)); return k.length - new Set(k).size; })(),
  };
}

function stats(xs: number[]) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  const sd = Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / s.length);
  const q = (f: number) => s[Math.min(s.length - 1, Math.floor(f * s.length))];
  return { n: s.length, mean: Math.round(mean * 10) / 10, sd: Math.round(sd * 10) / 10, min: s[0], p10: q(0.1), median: q(0.5), p90: q(0.9), max: s[s.length - 1] };
}

function summarize(rows: ReturnType<typeof run>[]) {
  return {
    runs: rows.length, neededCoProducerRate: rows.filter((r) => r.neededCoProducer).length / rows.length, deliveredRate: rows.filter((r) => r.delivered).length / rows.length,
    days: stats(rows.filter((r) => r.days !== null).map((r) => r.days!)), spent: stats(rows.map((r) => r.spent)),
    spentShareOfFund: stats(rows.map((r) => Math.round((r.spent / r.fund) * 1000) / 10)), lostDays: stats(rows.map((r) => r.lostDays)),
    overall: stats(rows.filter((r) => r.overall !== null).map((r) => r.overall!)), reception: stats(rows.filter((r) => r.reception !== null).map((r) => r.reception!)),
    integrity: { negativeCash: rows.filter((r) => r.cashNegative).length, doubleSettlements: rows.reduce((a, r) => a + r.doubleSettle, 0) },
  };
}

it('balance experiments', () => {
  const out: Record<string, unknown> = { generatedBy: 'npm run balance', seeds: SEEDS.length, families: {}, sensitivity: {}, determinism: null };
  for (const name of Object.keys(families)) {
    const rows = SEEDS.map((sd) => run(name, sd));
    (out.families as Record<string, unknown>)[name] = summarize(rows);
    const bad = rows.filter((r) => r.cashNegative || r.doubleSettle); if (bad.length) writeFileSync("docs/_bad.json", JSON.stringify({ name, bad }, null, 1));
    expect(bad.length).toBe(0);
  }
  const sub = SEEDS.slice(0, 15);
  const sens = out.sensitivity as Record<string, unknown>;
  sens['feature: rehearsal 0 vs 8 days (overall quality)'] = {
    rehearsal0: summarize(sub.map((sd) => run('live-action feature (low budget)', sd, { rehearsal: 0 }))).overall,
    rehearsal8: summarize(sub.map((sd) => run('live-action feature (low budget)', sd, { rehearsal: 8 }))).overall,
  };
  sens['feature: low vs mid budget scenario (same hiring policy)'] = {
    low: summarize(sub.map((sd) => run('live-action feature (low budget)', sd))),
    mid: summarize(sub.map((sd) => run('live-action feature (low budget)', sd, { mid: 1 }))),
  };
  sens['stop motion: 1 vs 2 puppet copies (days to deliver)'] = {
    copies1: summarize(sub.map((sd) => run('stop-motion short', sd, { copies: 1 }))).days,
    copies2: summarize(sub.map((sd) => run('stop-motion short', sd, { copies: 2 }))).days,
  };
  sens['3D: 4 vs 40 render nodes (days to deliver)'] = {
    nodes4: summarize(sub.map((sd) => run('3D CG short', sd, { nodes: 4 }))).days,
    nodes40: summarize(sub.map((sd) => run('3D CG short', sd, { nodes: 40 }))).days,
  };
  const a = run('live-action short (micro budget)', 'seed7');
  const b = run('live-action short (micro budget)', 'seed7');
  out.determinism = { identical: JSON.stringify(a) === JSON.stringify(b) };
  expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  writeFileSync('docs/balance-results.json', `${JSON.stringify(out, null, 2)}\n`);
});
