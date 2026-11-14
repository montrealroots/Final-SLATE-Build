// The whole game's feature matrix (the owner's command of November 14, 2026): every feature, from creation to late
// career, in one row, with whether it reads, bites, has downstream effects and which engine reads it, and the proof.
// - The rows come from the code (tests/proof/register.ts), so a feature can't be left out.
// - A feature is proven only by a played-career Monte Carlo result (tests/proof/probe.ts, written to docs/v10/proof/)
//   whose verdict is proven and whose hashes match the files it reads today: a result older than its code is stale.
// - A row that isn't a feature says why, in docs/v10/not-features.json (a date formatter called inside a change, a view).
// - What isn't proven yet may fall and may not rise (docs/v10/ratchet.json).
// docs/v10/FEATURES.md is written by this test with SLATE_WRITE_AUDIT=1 and held to it otherwise.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { actions, bankCommands, fields, scheduled, type Feature } from './proof/register';
import { hashOf, type Result } from './proof/probe';

type Status = 'proven' | 'does not bite' | 'no downstream effect' | 'stale' | 'not a feature' | 'not yet proven';
interface Row { id: string; kind: Feature['kind']; name: string; module: string; status: Status; proof: string; why: string }

const EXPLAINED = JSON.parse(readFileSync('docs/v10/explained.json', 'utf8')) as Record<string, string>;
const NOT_FEATURES = JSON.parse(readFileSync('docs/v10/not-features.json', 'utf8')) as Record<string, string>;
const RESULTS: Result[] = existsSync('docs/v10/proof') ? readdirSync('docs/v10/proof').filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(`docs/v10/proof/${f}`, 'utf8'))) : [];

function register(): Feature[] {
  const f = fields().filter((x) => x.class !== 'view' && x.class !== 'component');
  return [...actions(), ...bankCommands(), ...scheduled(), ...f];
}

function matrix(): Row[] {
  return register().map((f) => {
    const notFeature = NOT_FEATURES[f.id];
    if (notFeature) return { id: f.id, kind: f.kind, name: f.name, module: f.module, status: 'not a feature', proof: '', why: notFeature };
    const r = RESULTS.filter((x) => x.features.includes(f.id));
    if (!r.length) return { id: f.id, kind: f.kind, name: f.name, module: f.module, status: 'not yet proven', proof: '', why: '' };
    const fresh = r.filter((x) => Object.entries(x.hashes).every(([file, h]) => existsSync(file) && hashOf(file) === h));
    const best = fresh.find((x) => x.verdict === 'proven') ?? fresh[0];
    if (!best) return { id: f.id, kind: f.kind, name: f.name, module: f.module, status: 'stale', proof: r.map((x) => x.id).join(', '), why: 'measured before the code it reads last changed' };
    const moved = [...best.bites, ...best.downstream].filter((m) => m.ok).map((m) => `${m.metric} ${best.diff[m.metric].mean > 0 ? '+' : ''}${best.diff[m.metric].mean}`);
    const why = best.verdict === 'proven' ? moved.join('; ') : [moved.length ? `moved: ${moved.join('; ')}` : 'nothing moved', EXPLAINED[best.id]].filter(Boolean).join('. ');
    return { id: f.id, kind: f.kind, name: f.name, module: f.module, status: best.verdict, proof: `${best.id} (${best.seeds} seeds)`, why };
  });
}

const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
function markdown(rows: Row[]): string {
  const count = (k: string, s: Status) => rows.filter((r) => r.kind === k && r.status === s).length;
  const kinds = ['action', 'bank', 'scheduled', 'field'] as const;
  const statuses: Status[] = ['proven', 'does not bite', 'no downstream effect', 'stale', 'not a feature', 'not yet proven'];
  return [
    '# Every Feature, Proven Or Not',
    '',
    'Written by `tests/v10-features.test.ts` from the code; don\'t edit by hand. A feature is proven only by a played-career',
    'Monte Carlo result in `docs/v10/proof/`: the same seeds played twice, one decision changed, a direct measure and a later',
    'measure in another system both moving with their 95% interval clear of zero.',
    '',
    '| Kind | ' + statuses.join(' | ') + ' | All |',
    '|---|' + statuses.map(() => '---').join('|') + '|---|',
    ...kinds.map((k) => `| ${k} | ${statuses.map((s) => count(k, s)).join(' | ')} | ${rows.filter((r) => r.kind === k).length} |`),
    `| all | ${statuses.map((s) => rows.filter((r) => r.status === s).length).join(' | ')} | ${rows.length} |`,
    '',
    '## Rows',
    '',
    '| Feature | Kind | Read by | Status | Proof | What moved, or why |',
    '|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${cell(r.name)} | ${r.kind} | ${cell(r.module)} | ${r.status} | ${cell(r.proof)} | ${cell(r.why)} |`),
    '',
  ].join('\n');
}

describe('the whole game\'s feature matrix', () => {
  const rows = matrix();

  it('names a real engine reader for every proof, and every "not a feature" row is still in the register', () => {
    const ids = new Set(rows.map((r) => r.id));
    for (const id of Object.keys(NOT_FEATURES)) expect(ids.has(id), `${id} in docs/v10/not-features.json is no longer in the register`).toBe(true);
    for (const r of RESULTS) for (const read of r.reads) {
      const [file, fn] = read.split('#');
      expect(existsSync(file), read).toBe(true);
      // A function by name, or a scheduled system by its kind (its handler).
      const text = readFileSync(file, 'utf8');
      const found = fn.startsWith('handler:') ? text.includes(`registerHandler('${fn.slice(8)}'`) : new RegExp(`(function|const|let)\\s+${fn}\\b`).test(text);
      expect(found, `${read}: no such function or handler`).toBe(true);
    }
  });

  it('lets what isn\'t proven fall and never rise', () => {
    const open = rows.filter((r) => r.status !== 'proven' && r.status !== 'not a feature').length;
    const file = 'docs/v10/ratchet.json';
    if (process.env.SLATE_WRITE_AUDIT) writeFileSync(file, JSON.stringify({ open }, null, 1) + '\n');
    expect(open, 'more features are unproven than before').toBeLessThanOrEqual(JSON.parse(readFileSync(file, 'utf8')).open);
  });

  it('matches docs/v10/FEATURES.md', () => {
    const md = markdown(rows);
    if (process.env.SLATE_WRITE_AUDIT) writeFileSync('docs/v10/FEATURES.md', md);
    expect(readFileSync('docs/v10/FEATURES.md', 'utf8'), 'docs/v10/FEATURES.md is out of date: run with SLATE_WRITE_AUDIT=1').toBe(md);
  });
});
