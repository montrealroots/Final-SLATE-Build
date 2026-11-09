// The awards coverage ledger (docs/awards/LEDGER.csv): one row per playable category of every institution, with its
// child requirements: the roster record, the rules it is judged by, how the engine decides it, who receives it, how
// the player sees it, what the save keeps, the evidence that covers it, and its known gaps. Written from the catalog,
// the rulebooks and the rosters, and checked against the committed file, so it can't drift from the game.
// Regenerate after an intended change: LEDGER_WRITE=1 npx vitest run tests/awards-ledger.test.ts
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { QUALIFYING_LISTS } from '../src/engine/qualifying-lists';
import { INSTITUTIONS, RULEBOOKS, categoryRuleStatus, enterable, type Category, type Institution } from './engine-api';
import { roleLabel } from '../src/engine/people';

const FILE = 'docs/awards/LEDGER.csv';
const rosterOf = (id: string) => readFileSync(`docs/awards/roster/${id}.txt`, 'utf8');
const edition = (id: string) => /^@edition (.+)$/m.exec(rosterOf(id))?.[1] ?? '';
const blocked = (inst: Institution) => /^@blocked/m.test(rosterOf(inst.id)) || (inst as Institution & { rosterStatus?: string }).rosterStatus === 'blocked';

function rules(inst: Institution, c: Category): string {
  const rank = { simulated: 0, projected: 1, verified: 2 } as const;
  const best = RULEBOOKS.filter((b) => b.institutionId === inst.id).map((b) => categoryRuleStatus(b, c.id)).reduce<keyof typeof rank>((a, x) => (rank[x] > rank[a] ? x : a), 'simulated');
  return best === 'verified' ? 'official rules' : best === 'projected' ? 'projected rules' : 'game rules';
}

function engine(inst: Institution, c: Category): string {
  const parents = (c.parents ?? []).join('+') || 'every section';
  switch (c.kind) {
    case 'section': return inst.categories.some((x) => x.parents?.includes(c.id)) ? 'entered; selection only; its prizes follow' : 'entered; selection only';
    case 'prize': return `decided at results among ${parents}`;
    case 'audience': return `audience vote at results among ${parents}`;
    case 'partner': return `partner jury at results among ${parents}`;
    case 'honorary': return `chosen at announcement from a ${c.career ?? 'any'} career`;
    case 'area': case 'juried': return 'entered; nominated; one, several or no winners';
    default: return c.recipient === 'national' ? 'entered; country committee at deadline; nominated; one winner' : 'entered; nominated or selected; one winner';
  }
}

function recipients(c: Category): string {
  const one = (r: string) => (r === 'craft' ? `craft:${(c.crafts ?? []).join('+')}` : r);
  return [c.recipient, ...(c.with ?? [])].map(one).join('+') + (c.actingTitle ? `:${c.actingTitle}` : '') + (c.need?.includes('breakthrough') ? ':first-role' : '');
}

/** Academy qualifying lists naming this award, and how (exact or SLATE's reading). */
const listed = (inst: Institution, c: Category) => QUALIFYING_LISTS.flatMap((l) => l.awards.filter((a) => a.institution === inst.id && a.category === c.id).map((a) => ({ list: l.id, match: a.match })));
const QUALIFIES = ['live-short', 'animated-short', 'doc-short', 'documentary', 'international'];

function evidence(inst: Institution, c: Category): string {
  const out = new Set<string>();
  if (inst.id === 'oscars' && QUALIFIES.includes(c.id)) out.add('tests/qualifying-routes.test.ts (qualifying festivals)');
  if (listed(inst, c).length) out.add('tests/qualifying-routes.test.ts (on an Academy qualifying list)');
  if (enterable(c)) out.add('tests/awards-catalog.test.ts (requirements)').add('e2e/awards.spec.ts (Oscars, Emmys)');
  if (c.kind === 'section' || c.kind === 'prize' || c.kind === 'audience' || c.kind === 'partner') out.add('tests/awards-catalog.test.ts (festival prizes)').add('e2e/awards.spec.ts (Venice)');
  if (c.kind === 'area' || c.kind === 'juried') out.add('tests/awards-catalog.test.ts (area and juried)');
  if (c.kind === 'honorary') out.add('tests/awards-catalog.test.ts (honorary)').add('e2e/awards.spec.ts (honorary)');
  if (c.recipient === 'craft') out.add('tests/awards-catalog.test.ts (craft recipients)');
  if (c.recipient === 'song') out.add('tests/awards-catalog.test.ts (original song)');
  if (c.recipient === 'national') out.add('tests/awards-catalog.test.ts (national selection)');
  if (c.class) out.add('tests/awards-catalog.test.ts (drama and comedy)');
  if (c.material) out.add('tests/awards-catalog.test.ts (original or adapted)').add('e2e/awards.spec.ts (Oscars correction)');
  return [...out].join('; ');
}

function gaps(inst: Institution, c: Category): string {
  const out: string[] = [];
  if (blocked(inst)) out.push("organizer's site blocked: names from the earlier catalog");
  else if (c.verified === false) out.push("organizer's material for it not read");
  if (c.need?.includes('basque')) out.push('Basque production not recorded: no project qualifies');
  if (c.kind === 'area' || c.kind === 'juried') out.push('the standard for an award is a game assumption');
  if (c.kind === 'honorary') out.push("the organizer's selection is modeled from career history");
  if (c.recipient === 'national') out.push("the committee and the country's other film are modeled");
  for (const x of listed(inst, c)) if (x.match === 'interpreted') out.push(`its place on ${x.list} is SLATE's reading of the list's wording`);
  return out.join('; ');
}

/**
 * The statuses the ledger keeps apart (November 9, 2026): a category's name being right says nothing about its eligibility
 * rules, its recipients, its dates or whether a test plays it. Each column below reads its own evidence.
 */
function recipientStatus(inst: Institution, c: Category): string {
  if (RULEBOOKS.some((b) => b.institutionId === inst.id && b.categories[c.id]?.recipients)) return "organizer's rule";
  return c.kind === 'honorary' ? 'the player, for a career (modeled)' : 'credited contributors by SLATE (not verified)';
}

function submission(c: Category): string {
  if (c.retired) return 'none (retired)';
  if (c.kind === 'honorary') return 'none: chosen by the organizer';
  if (c.recipient === 'national') return "entry, then the country's committee";
  if (c.kind === 'section') return 'entry, then selection';
  if (enterable(c)) return 'entry';
  return 'none: decided among a section';
}

function judging(c: Category): string {
  if (c.kind === 'honorary') return 'modeled from career history';
  return `modeled (${c.judging === 'members' ? "members' vote" : c.judging === 'programmers' ? 'programmers' : c.judging === 'audience' ? 'audience vote' : 'jury'})`;
}

const OFFICIAL_DATES = (inst: Institution) => Object.keys((inst as Institution & { official?: Record<string, unknown> }).official ?? {});
function dates(inst: Institution, c: Category): string {
  const announced = OFFICIAL_DATES(inst);
  const ruled = RULEBOOKS.filter((b) => b.institutionId === inst.id && b.categories[c.id]?.deadlines).map((b) => `${b.year}${b.categories[c.id].deadlines!.status === 'projected' ? ' projected' : ''}`);
  const parts = [announced.length ? `edition dates announced for ${announced.join(', ')}` : 'edition dates projected'];
  parts.push(ruled.length ? `deadline from the rules (${[...new Set(ruled)].join(', ')})` : 'deadline projected');
  return parts.join('; ');
}

const SOURCES = (dir: string, ext: string) => readdirSync(dir).filter((f) => f.endsWith(ext)).map((f) => ({ file: `${dir}/${f}`, text: readFileSync(`${dir}/${f}`, 'utf8') }));
const UNIT = SOURCES('tests', '.test.ts');
const BROWSER = SOURCES('e2e', '.spec.ts');
const quoted = (t: string, x: string) => t.includes(`'${x}'`) || t.includes(`"${x}"`);
/** Test files that name this institution and this category, so they can be playing it; a file only sweeping every category isn't counted. */
function playedBy(files: { file: string; text: string }[], inst: Institution, c: Category, byName: boolean): string {
  return files.filter((f) => (quoted(f.text, inst.id) || f.text.includes(`'${inst.id}-`)) && (quoted(f.text, c.id) || (byName && quoted(f.text, c.name)))).map((f) => f.file).join('; ');
}

const csv = (xs: string[]) => xs.map((x) => (/[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x)).join(',');

function ledger(): string {
  const head = ['institution', 'edition', 'category', 'name', 'kind', 'roster', 'rules', 'engine', 'recipients', 'ui', 'save', 'evidence', 'gaps', 'recipient rules', 'submission', 'judging', 'dates', 'unit tests naming it', 'browser journeys naming it'];
  const rows = [csv(head)];
  for (const inst of INSTITUTIONS) {
    for (const c of inst.categories) {
      const roster = blocked(inst) ? 'blocked' : c.verified === false ? 'unverified' : 'read';
      const ui = c.retired ? 'kept for older entries; not shown' : enterable(c) ? 'event page row; Prepare Submission; status in Your Entries' : 'event page row; not enterable; result shown';
      const save = c.kind === 'honorary' ? 'stored only when given to you' : enterable(c) ? 'stored when you enter; otherwise computed when shown' : 'stored when your selected work is considered; otherwise computed when shown';
      rows.push(csv([inst.id, edition(inst.id), c.id, c.name, c.kind ?? 'award', roster, rules(inst, c), engine(inst, c), recipients(c), ui, save, evidence(inst, c), gaps(inst, c),
        recipientStatus(inst, c), submission(c), judging(c), dates(inst, c), playedBy(UNIT, inst, c, false), playedBy(BROWSER, inst, c, true)]));
    }
  }
  return `${rows.join('\n')}\n`;
}

const STATUS = 'docs/awards/STATUS.md';
/** Research order (the owner's brief of November 9, 2026): the Oscars and the Emmys first, then the rest as listed. */
const ORDER = (insts: Institution[]) => [...insts].sort((a, b) => (a.id === 'oscars' ? -2 : a.id === 'emmys' ? -1 : 0) - (b.id === 'oscars' ? -2 : b.id === 'emmys' ? -1 : 0));

/** Counts by institution from the ledger's own columns, and the research queue: what each still runs on SLATE's rules. */
function status(text: string): string {
  const [head, ...lines] = text.trim().split('\n');
  const cols = head.split(',');
  const parse = (line: string) => { const out: string[] = []; let cur = '', q = false; for (const ch of line) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return Object.fromEntries(cols.map((c, i) => [c, out[i]])); };
  const rows = lines.map((l) => parse(l.replace(/""/g, '\u0001'))).map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, (v ?? '').replace(/\u0001/g, '"')])));
  const out = ['# Awards Status By Institution', '',
    'Generated by `tests/awards-ledger.test.ts` from `docs/awards/LEDGER.csv`. Do not edit by hand. Each column is its own evidence:',
    'a roster that was read says nothing about the eligibility rules, the recipients, the dates or the tests.', '',
    '- **Roster:** categories whose official name and existence were read in the organizer\'s material (`read`), not read (`unverified`), or whose site was blocked.',
    '- **Eligibility:** the edition rules a category is judged by: the organizer\'s for an edition (`official`), carried forward (`projected`), or SLATE\'s (`game`).',
    '- **Recipients:** who receives the award, from an organizer\'s rule; every other category names its recipients from credits by SLATE\'s mapping, not verified.',
    '- **Judging:** every result is modeled (juries, votes and committees can\'t be recreated); only what qualifies a work is a rule.',
    '- **Dates:** edition dates the organizer announced, and category deadlines from its rules; the rest are projected.',
    '- **Unit / browser:** categories a test file names (with its institution). Naming a category isn\'t testing every behaviour of it.',
    '- **Not playable:** official awards the roster records but the game doesn\'t hold (`docs/awards/roster/`).', '',
    '| Institution | Categories | Roster read / unverified / blocked | Eligibility official / projected / game | Recipients by rule | Dates announced | Deadlines from rules | Unit | Browser | Not playable |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |'];
  const total = { n: 0, read: 0, unv: 0, blk: 0, off: 0, proj: 0, game: 0, rec: 0, dates: 0, dl: 0, unit: 0, browser: 0, na: 0 };
  const queue: string[] = [];
  for (const inst of ORDER(INSTITUTIONS)) {
    const mine = rows.filter((r) => r.institution === inst.id);
    const k = (f: (r: Record<string, string>) => boolean) => mine.filter(f).length;
    const t = {
      n: mine.length, read: k((r) => r.roster === 'read'), unv: k((r) => r.roster === 'unverified'), blk: k((r) => r.roster === 'blocked'),
      off: k((r) => r.rules === 'official rules'), proj: k((r) => r.rules === 'projected rules'), game: k((r) => r.rules === 'game rules'),
      rec: k((r) => r['recipient rules'] === "organizer's rule"), dates: k((r) => r.dates.startsWith('edition dates announced')), dl: k((r) => r.dates.includes('deadline from the rules')),
      unit: k((r) => !!r['unit tests naming it']), browser: k((r) => !!r['browser journeys naming it']),
      na: rosterOf(inst.id).split('\n').filter((l) => l.startsWith('- ')).length,
    };
    for (const key of Object.keys(total) as (keyof typeof total)[]) total[key] += t[key];
    out.push(`| ${inst.name} (\`${inst.id}\`) | ${t.n} | ${t.read} / ${t.unv} / ${t.blk} | ${t.off} / ${t.proj} / ${t.game} | ${t.rec} | ${t.dates} | ${t.dl} | ${t.unit} | ${t.browser} | ${t.na} |`);
    // Entered categories only: a prize follows its section's rules, and an honorary award takes no entries (its purpose
    // is recorded in the roster).
    const todo = mine.filter((r) => r.rules === 'game rules' && r.submission.startsWith('entry')).map((r) => r.category);
    if (todo.length) queue.push(`${queue.length + 1}. \`${inst.id}\` (${todo.length}): ${todo.map((x) => `\`${x}\``).join(', ')}`);
  }
  out.push(`| **All ${INSTITUTIONS.length}** | ${total.n} | ${total.read} / ${total.unv} / ${total.blk} | ${total.off} / ${total.proj} / ${total.game} | ${total.rec} | ${total.dates} | ${total.dl} | ${total.unit} | ${total.browser} | ${total.na} |`, '',
    '## Research queue', '',
    'Entered categories still judged by SLATE\'s rules, in the order the eligibility research goes: the next session starts at the first id here.', '', ...queue, '');
  return out.join('\n');
}

describe('the awards coverage ledger', () => {
  const text = ledger();
  if (process.env.LEDGER_WRITE || !existsSync(FILE)) writeFileSync(FILE, text);
  const summary = status(text);
  if (process.env.LEDGER_WRITE || !existsSync(STATUS)) writeFileSync(STATUS, summary);

  it('the status summary is the ledger as it stands, institution by institution', () => {
    expect(readFileSync(STATUS, 'utf8')).toBe(summary);
  });

  it('is the catalog as it stands: one row per category of all 37 institutions', () => {
    expect(readFileSync(FILE, 'utf8')).toBe(text);
    expect(text.trim().split('\n')).toHaveLength(1 + INSTITUTIONS.reduce((n, i) => n + i.categories.length, 0));
  });

  it('every category can be reached: prizes name sections that take entries, crafts name roles that can be hired', () => {
    for (const inst of INSTITUTIONS) {
      for (const c of inst.categories) {
        for (const id of c.parents ?? []) expect(enterable(inst.categories.find((x) => x.id === id)!), `${inst.id}/${c.id} -> ${id}`).toBe(true);
        for (const r of c.crafts ?? []) expect(roleLabel(r), `${inst.id}/${c.id} craft ${r}`).not.toBe(r);
        expect(c.formats.length, `${inst.id}/${c.id}`).toBeGreaterThan(0);
        if (c.kind === 'honorary') expect(enterable(c)).toBe(false);
      }
    }
  });
});
