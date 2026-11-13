// The v4 spread (the v4 package, 05: "Seeds across resource levels, territories, formats and methods; event-frequency
// report; documented balance targets"; ledger V4-030.02, V4-037.03). Built November 13, 2026, beside balance.bal.ts,
// which runs thirty seeds of each family in London.
//
// Each cell is a format and method at a resource level, run in four places (budgets, holidays, weather, child rules and
// languages differ by place) over ten seeds. Every run's notices are kept and reduced to their template: the words with
// names, titles, money, numbers and dates taken out, so "Mara accepted the role" and "Ben accepted the role" are one
// template. The report says how often each template is said, in how many runs, and the most any run says it, which is
// how repetition shows. The targets below are this game's, written down before the run and checked by it.
import { mkdirSync, writeFileSync } from 'fs';
import { expect, it } from 'vitest';
import { DAY, ledgerTotals, processUntil } from '../engine-api';
import { agreedFunding, approve, buildProject, castAll, manage, runDays, staffAll, startLife, startProduction } from '../helpers';
import type { GameState, Project } from '../../src/engine/types';

const SEEDS = Array.from({ length: 10 }, (_, i) => `v4s${i + 1}`);
const PLACES = ['gb-london', 'us-los-angeles', 'ng-lagos', 'jp-tokyo'];

type Cell = { level: string; build: (s: GameState) => Project };
const cells: Record<string, Cell> = {
  'live-action short': { level: 'micro', build: (s) => buildProject(s, { title: 'Quay', format: 'short', medium: 'live-action', scenario: 'micro', genres: ['drama'], runtime: 8 },
    [{ name: 'Lead', patch: { roleSize: 'lead' } }, { name: 'Friend', patch: { roleSize: 'supporting' } }],
    [{ place: 'Flat', chars: ['Lead', 'Friend'], minutes: 3 }, { place: 'Street', intExt: 'EXT', chars: ['Lead'], minutes: 2 }, { place: 'Cafe', chars: ['Lead', 'Friend'], minutes: 3 }]) },
  'live-action feature': { level: 'low', build: (s) => buildProject(s, { title: 'Harbour', format: 'feature', medium: 'live-action', scenario: 'low', genres: ['thriller'], runtime: 40 },
    [{ name: 'Lead', patch: { roleSize: 'lead' } }, { name: 'Rival', patch: { roleSize: 'supporting' } }],
    Array.from({ length: 10 }, (_, i) => ({ place: ['House', 'Field', 'Bar', 'Office'][i % 4], intExt: (i % 4 === 1 ? 'EXT' : 'INT') as 'INT' | 'EXT', chars: i % 2 ? ['Lead'] : ['Lead', 'Rival'], minutes: 4 }))) },
  'live-action limited series': { level: 'mid', build: (s) => buildProject(s, { title: 'Precinct', format: 'limited-series', medium: 'live-action', scenario: 'mid', genres: ['crime'], episodes: 2, runtime: 25 },
    [{ name: 'Detective', patch: { roleSize: 'lead' } }, { name: 'Suspect', patch: { seriesInvolvement: 'guest' } }],
    [{ place: 'Precinct', chars: ['Detective'], minutes: 3, extra: { episode: 1 } }, { place: 'Alley', intExt: 'EXT', chars: ['Detective', 'Suspect'], minutes: 3, extra: { episode: 1 } }, { place: 'Precinct', chars: ['Detective'], minutes: 3, extra: { episode: 2 } }]) },
  '2D drawn short': { level: 'low', build: (s) => buildProject(s, { title: 'Wood', format: 'short', medium: 'animation', technique: '2d-drawn', scenario: 'low', genres: ['family'], runtime: 4, quality: 'tv' },
    [{ name: 'Kit', patch: { roleSize: 'lead' } }, { name: 'Owl', patch: { entity: 'animal' } }], [{ place: 'Wood', chars: ['Kit', 'Owl'], minutes: 1.5 }, { place: 'Den', chars: ['Kit'], minutes: 1.5 }]) },
  '3D CG short': { level: 'micro', build: (s) => buildProject(s, { title: 'Deck', format: 'short', medium: 'animation', technique: '3d-cg', scenario: 'micro', genres: ['science-fiction'], runtime: 2, quality: 'limited' },
    [{ name: 'Nova', patch: { roleSize: 'lead' } }, { name: 'Drone', patch: { entity: 'robot' } }], [{ place: 'Deck', chars: ['Nova', 'Drone'], minutes: 1 }, { place: 'Hangar', chars: ['Drone'], minutes: 1 }]) },
  'stop-motion short': { level: 'micro', build: (s) => buildProject(s, { title: 'Drawer', format: 'short', medium: 'animation', technique: 'stop-motion', scenario: 'micro', genres: ['family'], runtime: 2, quality: 'limited' },
    [{ name: 'Pip', patch: { roleSize: 'lead' } }, { name: 'Crow', patch: {} }], [{ place: 'Drawer', chars: ['Pip'], minutes: 1 }, { place: 'Sill', chars: ['Pip', 'Crow'], minutes: 1 }]) },
};

/**
 * The balance targets, written down before the run (game targets, not industry figures). A cell meets them when:
 * every run keeps its books (no negative cash, no payment made twice); at least 80% of runs deliver within 500 days;
 * a micro budget delivers in every run; the mean overall quality of what is delivered falls between 40 and 80; and
 * spending stays within the money raised (a co-producer included) in every run.
 */
export const TARGETS = { deliveredAtLeast: 0.8, quality: [40, 80] as const };

/** A notice reduced to its template: names, titles, money, numbers and dates taken out. */
export function template(text: string, titles: string[]): string {
  let t = text;
  for (const title of titles) t = t.split(title).join('<Title>');
  return t
    .replace(/"[^"]*"/g, '"<Quoted>"')
    .replace(/\$[\d,]+(\.\d+)?/g, '<Money>')
    .replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}\b/g, '<Date>')
    .replace(/\b\d{4}-\d\d-\d\d\b/g, '<Date>')
    .replace(/\d+(\.\d+)?/g, '<N>')
    .replace(/\b[A-Z][a-z'’-]+(?: [A-Z][a-z'’-]+)+\b/g, '<Name>');
}

function run(name: string, place: string, seed: string) {
  const s = startLife(`v4-${name}-${place}-${seed}`, place);
  const p = cells[name].build(s);
  approve(s, p);
  if (p.funding.scenarioId === 'micro' && p.finance!.target > p.funding.fund) agreedFunding(p, p.finance!.target - p.funding.fund);
  castAll(s, p);
  staffAll(s, p);
  for (let i = 0; i < 10; i++) { manage(s, p); processUntil(s, s.now + DAY, 'tick', 100000); }
  startProduction(s, p, 7);
  runDays(s, p, 500);
  const t = ledgerTotals(p);
  const keys = p.obligations.flatMap((o) => o.postings.filter((x) => x.kind === 'settle').map((x) => x.key));
  return {
    delivered: !!p.delivered, overall: p.quality?.overall ?? null, spentShare: t.fund ? t.settled / t.fund : 0,
    integrity: t.cash >= 0 && keys.length === new Set(keys).size,
    notices: s.log.map((l) => template(l.text, [p.title, s.character.name])),
  };
}

it('the v4 spread: resource levels, territories, formats and methods; event frequency; balance targets', () => {
  const cellsOut: Record<string, unknown> = {};
  const freq = new Map<string, { said: number; runs: number; mostInOneRun: number }>();
  let runs = 0;
  let lines = 0;
  const misses: string[] = [];
  for (const name of Object.keys(cells)) {
    for (const place of PLACES) {
      const rows = SEEDS.map((sd) => run(name, place, sd));
      runs += rows.length;
      for (const r of rows) {
        lines += r.notices.length;
        const here = new Map<string, number>();
        for (const n of r.notices) here.set(n, (here.get(n) ?? 0) + 1);
        for (const [k, c] of here) {
          const f = freq.get(k) ?? { said: 0, runs: 0, mostInOneRun: 0 };
          freq.set(k, { said: f.said + c, runs: f.runs + 1, mostInOneRun: Math.max(f.mostInOneRun, c) });
        }
      }
      const delivered = rows.filter((r) => r.delivered);
      const q = delivered.map((r) => r.overall!).filter((x) => x !== null);
      const mean = q.length ? Math.round((q.reduce((a, b) => a + b, 0) / q.length) * 10) / 10 : null;
      const cell = { level: cells[name].level, place, runs: rows.length, deliveredRate: delivered.length / rows.length, meanOverall: mean, integrity: rows.every((r) => r.integrity), maxSpentShare: Math.round(Math.max(...rows.map((r) => r.spentShare)) * 1000) / 1000 };
      cellsOut[`${name} @ ${place}`] = cell;
      if (!cell.integrity) misses.push(`${name} @ ${place}: books`);
      if (cell.deliveredRate < TARGETS.deliveredAtLeast) misses.push(`${name} @ ${place}: delivered ${Math.round(cell.deliveredRate * 100)}%`);
      if (cells[name].level === 'micro' && cell.deliveredRate < 1) misses.push(`${name} @ ${place}: a micro budget that did not deliver`);
      if (mean !== null && (mean < TARGETS.quality[0] || mean > TARGETS.quality[1])) misses.push(`${name} @ ${place}: mean quality ${mean}`);
      if (cell.maxSpentShare > 1.0001) misses.push(`${name} @ ${place}: spent past the money raised`);
    }
  }
  const top = [...freq.entries()].sort((a, b) => b[1].said - a[1].said);
  mkdirSync('docs/v4', { recursive: true });
  writeFileSync('docs/v4/SPREAD-RESULTS.json', `${JSON.stringify({ generatedBy: 'npm run balance', seeds: SEEDS.length, places: PLACES, targets: TARGETS, cells: cellsOut, misses }, null, 2)}\n`);
  const row = ([k, f]: [string, { said: number; runs: number; mostInOneRun: number }]) => `| ${f.said} | ${f.runs} of ${runs} | ${f.mostInOneRun} | ${k.replace(/\|/g, '\\|')} |`;
  writeFileSync('docs/v4/EVENT-FREQUENCY.md', [
    '# Event Frequency', '',
    `Written by \`npm run balance\` (\`tests/balance/v4-spread.bal.ts\`): ${runs} runs (${Object.keys(cells).length} formats and methods at their resource levels, in ${PLACES.length} places, ${SEEDS.length} seeds each), ${lines} notices, ${freq.size} templates. A template is a notice with its names, titles, money, numbers and dates taken out.`, '',
    '## Said Most Often', '', '| Said | In Runs | Most In One Run | Template |', '| --- | --- | --- | --- |', ...top.slice(0, 40).map(row), '',
    '## Said Most In One Run', '', '| Said | In Runs | Most In One Run | Template |', '| --- | --- | --- | --- |', ...[...freq.entries()].sort((a, b) => b[1].mostInOneRun - a[1].mostInOneRun).slice(0, 20).map(row), '',
  ].join('\n'));
  expect(misses).toEqual([]);
});
