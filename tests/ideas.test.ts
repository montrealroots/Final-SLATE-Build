// The idea library's contract (src/ideas/, src/engine/brief.ts; the Creative Depth package, 06-TESTING-AND-DELIVERY.md
// "Automated contract tests"). Every record is checked as data: its ID, its words, its patch, what reads it and what
// tests it. An idea is a record, never code, and a record that points at something that isn't there fails here.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyGenreCatalog } from '../src/engine/genres';
import { GENRES } from './engine-api';
import { fill, type Command, type Idea } from '../src/engine/brief';
import { MAKEUP, WARDROBE } from '../src/engine/looks';
import { IDEAS, ideaById, ideasFor } from '../src/ideas';
import { COST, MUST, WHEN, WHO, combinations, compose, fits } from '../src/ideas/loglines';
import { STARTER } from '../src/ideas/starter';

applyGenreCatalog(JSON.parse(readFileSync('src/data/genre-catalog.json', 'utf8')));
const genreIds = new Set(GENRES.map((g) => g.id));
const FIELDS = ['premise', 'logline', 'conflict', 'stakes', 'theme', 'ending', 'tone', 'experience', 'world-rule', 'period', 'style', 'genre-blend', 'medium', 'character-goal', 'character-fear', 'makeup', 'wardrobe', 'crowd', 'camera', 'light', 'sound', 'score', 'location', 'physical-comedy', 'genre-route', 'viewpoint', 'question', 'setting', 'character-description', 'scene-objective', 'scene-action', 'scene-turn', 'props', 'animals', 'vehicles', 'effects'];
const OPS = ['story', 'tone', 'setting', 'style', 'year', 'genre', 'medium', 'rule', 'character', 'look', 'narrator', 'crowd', 'stunt', 'scene', 'needs', 'shot', 'light', 'sound', 'score', 'beats', 'cast'];
const CHARACTER_OPS = new Set(['character', 'look', 'narrator']);
const SCENE_OPS = new Set(['crowd', 'stunt', 'shot', 'scene', 'needs']);
/** Every string a patch would write, for checking its words. */
const strings = (c: Command): string[] => {
  switch (c.op) {
    case 'story': case 'tone': case 'setting': case 'character': case 'stunt': return [c.text];
    case 'rule': return [c.rule, c.limit];
    case 'style': return c.era ? [c.era] : [];
    case 'beats': return c.beats.flatMap((b) => [b.place, b.objective]);
    case 'cast': return c.parts.flatMap((x) => [x.name, x.wants ?? '']);
    default: return [];
  }
};
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

describe('every idea', () => {
  it('has a stable ID used once, a version, a known field, a label in title case, and a sentence of its own', () => {
    expect(new Set(IDEAS.map((x) => x.id)).size).toBe(IDEAS.length);
    for (const x of IDEAS) {
      expect(x.id, x.id).toMatch(/^[a-z_-]+\.[A-Za-z0-9-]+$/);
      expect(Number.isInteger(x.v) && x.v >= 1, x.id).toBe(true);
      expect(FIELDS, x.id).toContain(x.field);
      expect(x.label.trim().length, x.id).toBeGreaterThan(2);
      expect(x.label, x.id).toMatch(/^[A-Z0-9]/);
      expect(x.text.trim().length, x.id).toBeGreaterThan(20);
      expect(x.text, x.id).toMatch(/[.?]$/);
      expect(['mechanical', 'brief', 'reference'], x.id).toContain(x.kind);
      expect(['project', 'character', 'scene'], x.id).toContain(x.scope);
    }
  });

  it('says nothing twice: no two ideas for a field share a label or a sentence', () => {
    for (const field of FIELDS) {
      const list = ideasFor(field as Idea['field']);
      expect(new Set(list.map((x) => norm(x.label))).size, `${field} labels`).toBe(list.length);
      expect(new Set(list.map((x) => norm(x.text))).size, `${field} sentences`).toBe(list.length);
    }
  });

  it('has a patch of known commands that suits its scope, naming only methods, sources and genres that exist', () => {
    for (const x of IDEAS) {
      for (const c of x.patch) {
        expect(OPS, `${x.id} ${c.op}`).toContain(c.op);
        // A command for characters or scenes needs an idea that asks the player which ones.
        if (CHARACTER_OPS.has(c.op)) expect(x.scope, `${x.id} ${c.op}`).toBe('character');
        if (SCENE_OPS.has(c.op)) expect(x.scope, `${x.id} ${c.op}`).toBe('scene');
        if (c.op === 'look') {
          if (c.makeup) expect(MAKEUP.map((m) => m.id), x.id).toContain(c.makeup);
          if (c.wardrobe) expect(WARDROBE.map((w) => w.id), x.id).toContain(c.wardrobe);
          if (c.states !== undefined) expect(c.states >= 1 && c.states <= 6, x.id).toBe(true);
        }
        if (c.op === 'crowd' && c.look) expect(MAKEUP.map((m) => m.id), x.id).toContain(c.look);
        if (c.op === 'genre') expect(genreIds.has(c.id), `${x.id}: genre ${c.id}`).toBe(true);
        if (c.op === 'year' && c.year !== null) expect(c.year >= 1000 && c.year <= 2200, x.id).toBe(true);
        if (c.op === 'medium') expect(c.medium === 'live-action' ? c.technique === 'none' : c.technique !== 'none', x.id).toBe(true);
        if (c.op === 'beats') for (const b of c.beats) {
          expect(b.minutes > 0 && b.minutes <= 15, x.id).toBe(true);
          if (b.crowdLook) expect(MAKEUP.map((m) => m.id), x.id).toContain(b.crowdLook);
          // A scene can only put in it people the same idea brings.
          const slots = x.patch.flatMap((k) => (k.op === 'cast' ? k.parts.map((part) => part.slot) : []));
          for (const w of b.with ?? []) expect(slots, `${x.id}: scene with ${w}`).toContain(w);
        }
      }
      for (const g of x.fits?.genres ?? []) expect(genreIds.has(g), `${x.id}: fits genre ${g}`).toBe(true);
      for (const e of x.excludes ?? []) expect(ideaById(e), `${x.id} excludes ${e}`).toBeTruthy();
      // A mechanical or a words idea sets something; only a note may set nothing.
      if (x.kind !== 'reference') expect(x.patch.length, x.id).toBeGreaterThan(0);
    }
  });

  it('never leaves a placeholder in what it writes: every slot it uses has a suggestion, and filling leaves no brace', () => {
    for (const x of IDEAS) {
      const used = new Set(x.patch.flatMap(strings).flatMap((s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1])));
      const declared = new Set((x.slots ?? []).map((s) => s.key));
      for (const k of used) expect(declared.has(k), `${x.id}: slot {${k}} has no suggestion`).toBe(true);
      for (const s of x.slots ?? []) expect(s.label && s.suggest.trim(), `${x.id}: ${s.key}`).toBeTruthy();
      for (const s of x.patch.flatMap(strings)) {
        expect(fill(s, x), x.id).not.toMatch(/[{}]/);
        expect(fill(s, x, Object.fromEntries([...declared].map((k) => [k, '  ']))), `${x.id} with blank slots`).not.toMatch(/[{}]/);
      }
      // The card's own sentence is read before anything is filled in.
      expect(x.text, x.id).not.toMatch(/[{}]/);
    }
  });

  it('names what reads it, and a test that exists: a mechanical idea names engine code, and a note says it is one', () => {
    const cache = new Map<string, string>();
    const read = (f: string) => cache.get(f) ?? cache.set(f, readFileSync(f, 'utf8').replace(/\\'/g, "'")).get(f)!;
    for (const x of IDEAS) {
      expect(x.consumers.length, x.id).toBeGreaterThan(0);
      expect(x.tests.length, x.id).toBeGreaterThan(0);
      for (const t of x.tests) {
        const [file, title] = t.split('::');
        expect(existsSync(file), `${x.id}: ${file}`).toBe(true);
        expect(read(file).includes(title), `${x.id}: no test "${title}" in ${file}`).toBe(true);
      }
      if (x.kind === 'mechanical') {
        // Each reader is a source file and something in it.
        for (const c of x.consumers) {
          const m = /^([\w/-]+\.ts)\b/.exec(c);
          expect(m, `${x.id}: "${c}" names no engine file`).toBeTruthy();
          expect(existsSync(`src/engine/${m![1]}`), `${x.id}: src/engine/${m![1]}`).toBe(true);
        }
      }
      if (x.kind === 'reference' && x.patch.length === 0) expect(x.text, x.id).toMatch(/note|nothing|adds nothing|either way|licenses nothing/i);
    }
  });

  it('holds no code and no address: an idea is words and commands, nothing that runs or fetches', () => {
    const raw = JSON.stringify(IDEAS);
    expect(raw).not.toMatch(/https?:|javascript:|<script|=>|function\s*\(|\beval\b|import\(/);
    for (const f of ['src/ideas/starter.ts', 'src/ideas/more.ts', 'src/ideas/loglines.ts']) expect(readFileSync(f, 'utf8'), f).not.toMatch(/api[_-]?key|Bearer |TMDB|themoviedb/i);
  });
});

describe('the package\'s starter set', () => {
  it('is all here under its own IDs: 126 options in twelve families', () => {
    const src = JSON.parse(readFileSync('docs/creative-depth/package/starter-options.json', 'utf8')) as { options: { id: string; label: string }[] };
    expect(STARTER).toHaveLength(126);
    expect(STARTER.map((x) => x.id).sort()).toEqual(src.options.map((o) => o.id).sort());
    for (const o of src.options) expect(ideaById(o.id)!.label, o.id).toBe(o.label);
    // The example project's choices are all ideas the game has.
    const example = JSON.parse(readFileSync('docs/creative-depth/package/example-project.json', 'utf8')) as { choices: string[] };
    for (const id of example.choices) expect(ideaById(id), id).toBeTruthy();
  });
});

describe('the logline builder', () => {
  it('counts what was written and what it makes, separately, and every sentence it offers is whole and its own', () => {
    const written = WHEN.length + WHO.length + MUST.length + COST.length;
    const seen = new Set<string>();
    let n = 0;
    for (const parts of combinations()) {
      const s = compose(parts)!;
      n += 1;
      expect(s).toMatch(/^[A-Z].*[a-z]\.$/);
      expect(s).not.toMatch(/[{}]|undefined|null|\s{2}|,,| ,/);
      seen.add(norm(s));
    }
    // 52 parts were written; they make thousands of sentences, each different from every other.
    expect(written).toBe(52);
    expect(n).toBeGreaterThan(1000);
    expect(seen.size).toBe(n);
    // Raw, the parts multiply to more; the pairs that make no sense are what is missing.
    const raw = WHEN.length * WHO.length * MUST.length * COST.length;
    expect(n).toBeLessThan(raw);
    expect({ written, raw, offered: n }).toEqual({ written: 52, raw: 26880, offered: n });
  });

  it('refuses parts that don\'t go together, and parts that aren\'t there', () => {
    expect(fits({ when: 'when.first-day', who: 'who.teacher', must: 'must.trust', cost: 'cost.time' })).toBe(false);
    expect(compose({ when: 'when.first-day', who: 'who.teacher', must: 'must.trust', cost: 'cost.time' })).toBeNull();
    expect(compose({ when: 'when.nope', who: 'who.teacher', must: 'must.return', cost: 'cost.time' })).toBeNull();
    expect(compose({ when: 'when.power', who: 'who.dispatcher', must: 'must.message', cost: 'cost.morning' }))
      .toBe('When the power fails across the district, a night-shift dispatcher must get one message to the right person, before morning makes the choice for them.');
  });
});

describe('what the library holds, counted', () => {
  it('reports written ideas by field and kind, so the numbers in the ledger are the library\'s own', () => {
    const count = (k: Idea['kind']) => IDEAS.filter((x) => x.kind === k).length;
    const byField = Object.fromEntries(FIELDS.map((f) => [f, ideasFor(f as Idea['field']).length]).filter(([, n]) => n));
    expect(IDEAS.length).toBe(count('mechanical') + count('brief') + count('reference'));
    expect({ total: IDEAS.length, mechanical: count('mechanical'), brief: count('brief'), reference: count('reference') }).toMatchInlineSnapshot(`
      {
        "brief": 171,
        "mechanical": 188,
        "reference": 14,
        "total": 373,
      }
    `);
    expect(byField).toMatchInlineSnapshot(`
      {
        "animals": 6,
        "camera": 7,
        "character-description": 12,
        "character-fear": 8,
        "character-goal": 10,
        "conflict": 10,
        "crowd": 6,
        "effects": 8,
        "ending": 10,
        "genre-blend": 8,
        "genre-route": 68,
        "light": 3,
        "location": 12,
        "makeup": 12,
        "medium": 10,
        "period": 11,
        "physical-comedy": 1,
        "premise": 12,
        "props": 12,
        "question": 10,
        "scene-action": 10,
        "scene-objective": 14,
        "scene-turn": 12,
        "score": 3,
        "setting": 16,
        "sound": 7,
        "stakes": 8,
        "style": 11,
        "theme": 10,
        "tone": 11,
        "vehicles": 8,
        "viewpoint": 10,
        "wardrobe": 9,
        "world-rule": 8,
      }
    `);
  });
});
