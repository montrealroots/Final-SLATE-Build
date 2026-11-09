// The awards coverage ledger (docs/awards/LEDGER.csv): one row per playable category of every institution, with its
// child requirements: the roster record, the rules it is judged by, how the engine decides it, who receives it, how
// the player sees it, what the save keeps, the evidence that covers it, and its known gaps. Written from the catalog,
// the rulebooks and the rosters, and checked against the committed file, so it can't drift from the game.
// Regenerate after an intended change: LEDGER_WRITE=1 npx vitest run tests/awards-ledger.test.ts
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
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

function evidence(c: Category): string {
  const out = new Set<string>();
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
  return out.join('; ');
}

const csv = (xs: string[]) => xs.map((x) => (/[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x)).join(',');

function ledger(): string {
  const head = ['institution', 'edition', 'category', 'name', 'kind', 'roster', 'rules', 'engine', 'recipients', 'ui', 'save', 'evidence', 'gaps'];
  const rows = [csv(head)];
  for (const inst of INSTITUTIONS) {
    for (const c of inst.categories) {
      const roster = blocked(inst) ? 'blocked' : c.verified === false ? 'unverified' : 'read';
      const ui = c.retired ? 'kept for older entries; not shown' : enterable(c) ? 'event page row; Prepare Submission; status in Your Entries' : 'event page row; not enterable; result shown';
      const save = c.kind === 'honorary' ? 'stored only when given to you' : enterable(c) ? 'stored when you enter; otherwise computed when shown' : 'stored when your selected work is considered; otherwise computed when shown';
      rows.push(csv([inst.id, edition(inst.id), c.id, c.name, c.kind ?? 'award', roster, rules(inst, c), engine(inst, c), recipients(c), ui, save, evidence(c), gaps(inst, c)]));
    }
  }
  return `${rows.join('\n')}\n`;
}

describe('the awards coverage ledger', () => {
  const text = ledger();
  if (process.env.LEDGER_WRITE || !existsSync(FILE)) writeFileSync(FILE, text);

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
