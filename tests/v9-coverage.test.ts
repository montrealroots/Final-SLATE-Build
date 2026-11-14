// Coverage by jurisdiction (the owner's command of November 14, 2026, 7 "Worldwide coverage"): for every country in the
// game's own gazetteer, each banking and papers capability in one of six classes:
// - verified: checked against its source in this work (none yet: nothing was re-verified on November 14, 2026);
// - inherited-unverified: researched in 1221 or SLATE-REBUILD and brought over, not checked again here;
// - modeled: the game's own rule, said as one;
// - not applicable;
// - missing: the fact isn't recorded, named;
// - implemented/tested: brought over and run by a test here for this country.
// The matrix is docs/v9/coverage.json, written by this test with SLATE_WRITE_AUDIT=1 and held to it otherwise; the
// summary is docs/v9/COVERAGE.md. Aliases aren't countries: only the gazetteer's own codes are rows.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COUNTRIES } from '../src/world/gazetteer/gazetteer';
import { banksIn } from '../src/engine/bankworld/content/banks';
import { PASSPORTS } from '../src/engine/bankworld/content/passports';
import { VISAS } from '../src/engine/bankworld/content/visas';

type Status = 'verified' | 'inherited-unverified' | 'modeled' | 'not applicable' | 'missing' | 'implemented/tested';
const rows = (f: string) => Object.fromEntries((JSON.parse(readFileSync(f, 'utf8')) as { rows: { key: string; status: string }[] }).rows.map((r) => [r.key, r.status]));
const RATES = rows('src/engine/bankworld/data/rates/rates-countries.json');
const VISITS = rows('docs/v9/papers-sources/visits-countries.json');
const WORK = rows('docs/v9/papers-sources/work-countries.json');
const PASSPORT_DATA = rows('docs/v9/papers-sources/passports-countries.json');
const tests = [...readdirSync('tests/bankworld').map((f) => `tests/bankworld/${f}`), ...readdirSync('e2e').filter((f) => f.startsWith('v9-')).map((f) => `e2e/${f}`), 'tests/v9-fx.test.ts', 'tests/v8-papers.test.ts']
  .map((f) => readFileSync(f, 'utf8')).join('\n');
const testedBank = (iso: string) => banksIn(iso).some((b) => tests.includes(`'${b.id}'`)) || (iso === 'US' && tests.includes('Chase'));
const PASSPORT_RECORDS = JSON.parse(readFileSync('src/data/papers/passports.json', 'utf8')) as Record<string, { issuedBy?: string; routes?: { id: string; within: unknown }[]; bands?: { pay: Record<string, number | null> }[] }>;
/** A passport record with a route whose fee and time are both recorded, as papers.ts \`passportOffers\` takes it. */
const passportRoutes = (iso: string): boolean => {
  const e = PASSPORT_RECORDS[iso];
  const p = e?.issuedBy ? PASSPORT_RECORDS[e.issuedBy] : e;
  return !!p?.routes?.some((r) => r.within && p.bands?.some((b) => typeof b.pay[r.id] === 'number'));
};
const VISA_DESTINATIONS = new Set(Object.keys(VISAS).map((k) => k.split('<')[0]));

/** SLATE-REBUILD's coverage words in the owner's classes: researched isn't re-verified here; proven rows are the six places with no settlement. */
const fromRebuild = (s: string | undefined, why: string): [Status, string] =>
  s === 'researched' ? ['inherited-unverified', `${why}: SLATE-REBUILD researched it; not re-checked here`]
    : s === 'proven' ? ['not applicable', 'no populated place']
      : s === 'blocked' ? ['missing', `${why}: SLATE-REBUILD's research was blocked`]
        : ['missing', `${why}: no record`];

function matrix() {
  const out: Record<string, Record<string, [Status, string]>> = {};
  for (const c of COUNTRIES) {
    const iso = c.code;
    const empty = PASSPORT_DATA[iso] === 'proven';
    const banks = banksIn(iso);
    out[iso] = {
      bank: empty ? ['not applicable', 'no populated place']
        : banks.length ? (testedBank(iso) ? ['implemented/tested', `1221's banks (${banks.length}), run by ported tests`] : ['inherited-unverified', `1221's banks (${banks.length}); no test here opens one`])
          : ['missing', 'no bank recorded: a life here keeps a plain current account with no bank\'s terms'],
      'exchange rate': iso === 'US' ? ['not applicable', 'the dollar is the unit']
        : RATES[iso] === 'proven' ? ['not applicable', 'SLATE-REBUILD proves no rate is needed: the dollar, or no populated place']
          : fromRebuild(RATES[iso], 'the currency\'s dated rate'),
      'passport application': empty ? ['not applicable', 'no populated place']
        : PASSPORTS[iso] ? ['inherited-unverified', '1221\'s passport office: fee, days and validity']
          : passportRoutes(iso) ? (iso === 'SE' ? ['implemented/tested', 'SLATE-REBUILD\'s record, a route with its fee and time; tests/v8-papers.test.ts'] : ['inherited-unverified', 'SLATE-REBUILD\'s record: a route with its fee and time'])
            : ['missing', PASSPORT_DATA[iso] === 'researched' ? 'no route with both its fee and its time recorded' : 'no passport office recorded'],
      'visiting rules': fromRebuild(VISITS[iso], 'who may visit'),
      'visitor visa application': empty ? ['not applicable', 'no populated place']
        : VISA_DESTINATIONS.has(iso) ? (iso === 'US' ? ['implemented/tested', '1221\'s visa record for some passports; tests/v8-papers.test.ts, e2e/v9-papers.spec.ts'] : ['inherited-unverified', '1221\'s visa record, for some passports only'])
          : ['missing', 'the fee and how long a decision takes'],
      'work rules': fromRebuild(WORK[iso], 'who may work'),
      'work permit application': empty ? ['not applicable', 'no populated place'] : WORK[iso] === 'researched' ? ['missing', "the permit's fee and how long the decision takes"] : fromRebuild(WORK[iso], 'who may work'),
    };
  }
  return out;
}

describe('coverage by jurisdiction', () => {
  it('has a row for every country in the gazetteer, each capability in one of the six classes, and matches the committed file', () => {
    const m = matrix();
    const allowed = new Set(['verified', 'inherited-unverified', 'modeled', 'not applicable', 'missing', 'implemented/tested']);
    for (const [iso, caps] of Object.entries(m)) for (const [cap, [s]] of Object.entries(caps)) expect(allowed.has(s), `${iso} ${cap}`).toBe(true);
    expect(Object.keys(m).length).toBe(COUNTRIES.length);
    const text = JSON.stringify(m, null, 1) + '\n';
    if (process.env.SLATE_WRITE_AUDIT) writeFileSync('docs/v9/coverage.json', text);
    expect(readFileSync('docs/v9/coverage.json', 'utf8'), 'docs/v9/coverage.json is out of date: run with SLATE_WRITE_AUDIT=1').toBe(text);
  });

  it('counts each class per capability, so COVERAGE.md\'s numbers are the matrix\'s own', () => {
    const m = matrix();
    const counts: Record<string, Record<string, number>> = {};
    for (const caps of Object.values(m)) for (const [cap, [s]] of Object.entries(caps)) (counts[cap] ??= {})[s] = (counts[cap][s] ?? 0) + 1;
    const md = readFileSync('docs/v9/COVERAGE.md', 'utf8');
    for (const [cap, byStatus] of Object.entries(counts)) for (const [s, n] of Object.entries(byStatus)) expect(md, `${cap}: ${s}`).toContain(`| ${cap} | ${s} | ${n} |`);
  });
});
