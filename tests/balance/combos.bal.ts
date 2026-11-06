// Held-out seeds and feature combinations (Gap Completion Package, M7). The tuned families in balance.bal.ts use
// seed1-seed30; these runs use seeds never used for tuning, and combine features added later: motion capture,
// world places with worldwide holidays, and unscripted competition with a withdrawal. Results go to
// docs/balance-heldout.json for BALANCE-REPORT.md.
import { writeFileSync } from 'fs';
import { expect, it } from 'vitest';
import { DAY, adoptPlace, ledgerTotals, processUntil, setFamily, setupCompetition, withdrawRelease } from '../engine-api';
import { placesOf, search, toGamePlace } from '../../src/world/gazetteer/gazetteer';
import { loadWorldHolidays } from '../../src/world/holidays/holidays';
import { approve, buildProject, castAll, manage, runDays, staffAll, startLife, startProduction } from '../helpers';
import type { GameState, Project } from '../../src/engine/types';

const HELD_OUT = Array.from({ length: 10 }, (_, i) => `holdout${i + 1}`);

function integrity(p: Project) {
  const keys = p.obligations.flatMap((o) => o.postings.filter((x) => x.kind === 'settle').map((x) => x.key));
  return { doubleSettle: keys.length - new Set(keys).size, cashNegative: ledgerTotals(p).available < 0 };
}

function produce(s: GameState, p: Project, days = 500, each?: () => void) {
  approve(s, p);
  castAll(s, p);
  staffAll(s, p);
  for (let i = 0; i < 10; i++) {
    manage(s, p);
    processUntil(s, s.now + DAY, 'tick', 100000);
  }
  const start = s.now;
  startProduction(s, p, 7);
  runDays(s, p, days, each);
  return { delivered: !!p.delivered, days: p.delivered ? Math.round((p.delivered.at - start) / DAY) : null, overall: p.quality?.overall ?? null, ...integrity(p) };
}

async function worldBase(s: GameState, country: string, query: string) {
  const w = search(await placesOf(country), query)[0];
  const pl = await toGamePlace(w);
  adoptPlace(s, pl);
  s.locationId = pl.id; // projects are based where you are
  return pl;
}

const combos: Record<string, (seed: string) => Promise<ReturnType<typeof produce>>> = {
  // Pair: motion capture + a world place (Kraków: worldwide holiday rules, station climate).
  'mocap + world place': async (seed) => {
    const s = startLife(`mw-${seed}`, 'gb-london');
    await worldBase(s, 'PL', 'krakow');
    const p = buildProject(s, { title: 'M', format: 'short', medium: 'animation', technique: '3d-cg', runtime: 3, quality: 'limited' },
      [{ name: 'Golem', patch: { roleSize: 'lead', entity: 'monster', methods: ['voice', 'motion-capture'] } }, { name: 'Child', patch: { roleSize: 'supporting' } }],
      [{ place: 'Quarry', chars: ['Golem', 'Child'], minutes: 1 }]);
    return produce(s, p);
  },
  // Pair: live action shot at a world place with worldwide holidays (Valparaíso, Chile).
  'live action + world place': async (seed) => {
    const s = startLife(`lw-${seed}`, 'gb-london');
    await worldBase(s, 'CL', 'valparaiso');
    const p = buildProject(s, { title: 'L', format: 'short', medium: 'live-action', scenario: 'micro', genres: ['drama'], runtime: 8 },
      [{ name: 'Lead', patch: { roleSize: 'lead' } }], [{ place: 'Harbour', intExt: 'EXT', chars: ['Lead'], minutes: 3 }, { place: 'Flat', chars: ['Lead'], minutes: 3 }]);
    return produce(s, p);
  },
  // Triple: unscripted competition + world place + a withdrawal before delivery.
  'competition + world place + withdrawal': async (seed) => {
    const s = startLife(`cw-${seed}`, 'gb-london');
    await worldBase(s, 'IE', 'galway');
    const p = buildProject(s, { title: 'C', format: 'unscripted-series', medium: 'live-action', episodes: 2, runtime: 20 }, [], []);
    p.worldRules.push({ id: 'fr', rule: 'Bakers compete; one leaves each episode.', limit: 'One day per episode.' });
    setFamily(p, 'competition');
    const cs = ['c1', 'c2', 'c3', 'c4'];
    p.contributors.push({ id: 'h', name: 'Host', role: 'Host', consent: 'given' }, { id: 'x', name: 'Neighbour', role: 'Participant', consent: 'given' },
      ...cs.map((id, i) => ({ id, name: `Baker ${i + 1}`, role: 'Contestant', consent: 'given' as const })));
    setupCompetition(p, cs, 1);
    const seg = (id: string, ep: number, who: string[]) => ({
      id, episode: ep, heading: { intExt: 'INT' as const, place: 'Tent', time: 'DAY' as const }, storyLocation: 'Tent', participants: [], objective: 'Round', action: '', dialogue: [], turningPoint: '',
      estMinutes: 6, props: [], animals: [], vehicles: [], stunts: '', crowd: 0, intimacy: false, water: false, vfx: [], songs: [], dance: false, kind: 'segment' as const,
      basis: 'sourced' as const, contributorIds: who, evidenceIds: [], intentionalDiscontinuity: false,
    });
    p.scenes.push(seg('a', 1, ['h', ...cs]), seg('b', 1, ['h', 'x']), seg('c', 2, ['h', ...cs.slice(0, 1)]));
    let withdrew = false;
    const r = produce(s, p, 500, () => {
      if (!withdrew && p.tasks.find((t) => t.id === 'unscripted:logging:1')?.status === 'done' && !p.edit.pictureLocked) {
        withdrew = true;
        withdrawRelease(s, p, 'x');
      }
    });
    return { ...r, withdrew } as ReturnType<typeof produce>;
  },
};

it('held-out seeds and feature combinations', async () => {
  await loadWorldHolidays();
  const out: Record<string, unknown> = { generatedBy: 'npm run balance', heldOutSeeds: HELD_OUT.length, combos: {} };
  for (const [name, fn] of Object.entries(combos)) {
    const rows = [];
    for (const seed of HELD_OUT) rows.push(await fn(seed));
    const days = rows.filter((r) => r.days !== null).map((r) => r.days!).sort((a, b) => a - b);
    const overall = rows.filter((r) => r.overall !== null).map((r) => r.overall!);
    (out.combos as Record<string, unknown>)[name] = {
      runs: rows.length,
      deliveredRate: rows.filter((r) => r.delivered).length / rows.length,
      medianDays: days.length ? days[Math.floor(days.length / 2)] : null,
      meanOverall: overall.length ? Math.round((overall.reduce((a, b) => a + b, 0) / overall.length) * 10) / 10 : null,
      withdrawals: rows.filter((r) => (r as { withdrew?: boolean }).withdrew).length,
      integrity: { negativeCash: rows.filter((r) => r.cashNegative).length, doubleSettlements: rows.reduce((a, r) => a + r.doubleSettle, 0) },
    };
    expect(rows.every((r) => !r.cashNegative && !r.doubleSettle), name).toBe(true);
    if (name.includes('withdrawal')) expect(rows.every((r) => (r as { withdrew?: boolean }).withdrew), 'every triple run withdrew a participant').toBe(true);
  }
  writeFileSync('docs/balance-heldout.json', `${JSON.stringify(out, null, 2)}\n`);
});
