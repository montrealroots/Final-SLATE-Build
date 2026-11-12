// The Creative Depth package's two audit tables (06-TESTING-AND-DELIVERY.md, "Audit artifacts"), written from the code
// and checked against it here, so neither can drift:
// - docs/creative-depth/FIELD-INVENTORY.csv: every labelled control in the interface, what kind of thing it is, what
//   reads it, and whether it has an idea picker, will get one, or shouldn't have one, and why.
// - docs/creative-depth/EFFECT-COVERAGE.csv: every idea in the library, what it sets, what reads that, the test that
//   compares it, and its status in the package's own words.
// To rewrite both after a change: SLATE_WRITE_AUDIT=1 npx vitest run tests/creative-depth-audit.test.ts
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Command, Idea } from '../src/engine/brief';
import { IDEAS } from '../src/ideas';
import { COST, MUST, WHEN, WHO } from '../src/ideas/loglines';

const WRITE = process.env.SLATE_WRITE_AUDIT === '1';
const cell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
const toCsv = (rows: string[][]) => `${rows.map((r) => r.map(cell).join(',')).join('\n')}\n`;
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) { if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (ch === '"') quoted = false; else field += ch; }
    else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; } else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; } else if (ch !== '\r') field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}
function check(file: string, text: string): void {
  if (WRITE) writeFileSync(file, text);
  expect(existsSync(file), `${file} is missing: run with SLATE_WRITE_AUDIT=1`).toBe(true);
  expect(readFileSync(file, 'utf8'), `${file} is out of date: run with SLATE_WRITE_AUDIT=1`).toBe(text);
}

// ---------------- The field inventory ----------------

/** Each labelled control's widget, in the order the input audit lists them (tests/input-audit.test.ts scans the same way). */
function widgets(): Map<string, string> {
  const rx = /<(TextField|SelectField|NumberField|Check|PlacePicker|LanguagePicker|GenrePicker|WorldPlacePicker)\b([^>]*?)(\/>|>)/gs;
  const out = new Map<string, string>();
  for (const f of readdirSync('src/ui').filter((x) => x.endsWith('.tsx')).sort()) {
    const seen = new Map<string, number>();
    for (const m of readFileSync(`src/ui/${f}`, 'utf8').matchAll(rx)) {
      const label = /label=(\{`[^`]*`\}|"[^"]*"|\{[^}]*\})/.exec(m[2])?.[1] ?? '?';
      const n = (seen.get(label) ?? 0) + 1;
      seen.set(label, n);
      out.set(`${f}|${label}|${n}`, `${m[1]}${/\bmultiline\b/.test(m[2]) ? ' (long text)' : ''}${/type="(date|time|search|password)"/.test(m[2]) ? ` (${/type="(\w+)"/.exec(m[2])![1]})` : ''}`);
    }
  }
  return out;
}

const KEPT = "Kept. What is typed stays unless an idea is applied; applying asks before replacing it, and Undo Last Change brings it back.";
const KEPT_TEST = "tests/brief.test.ts::asks before replacing the player's own words, and leaves them alone when told to keep them";
/** Fields with an idea picker now: [screen, label] to the picker and what it offers. */
const PICKER: Record<string, string> = {
  'ScriptViews.tsx|"Logline"': 'Build A Logline: four parts chosen and read as one sentence',
  'ScriptViews.tsx|"Premise"': 'Choose A Starting Idea, Choose A Premise: 12 premises, each with a cast and scenes offered',
  'ScriptViews.tsx|"Stakes"': 'Choose What Is At Stake: 8 ideas (premises also write it)',
  'ScriptViews.tsx|"Central Conflict"': 'Choose A Central Conflict: 10 ideas',
  'ScriptViews.tsx|"Theme"': 'Choose A Theme: 10 ideas',
  'ScriptViews.tsx|"Intended Ending"': 'Choose An Ending: 10 ideas',
  'ScriptViews.tsx|"Tone"': 'Choose A Tone: 11 ideas',
  'ScriptViews.tsx|"Intended Experience"': 'Choose What It Should Feel Like: 8 ideas (a tone idea also writes it)',
  'ScriptViews.tsx|"Tonal Intention"': 'Ideas For This Scene: 10 tones for a scene',
  'ScriptViews.tsx|"Season Arc"': 'Choose A Season Arc: 8 ideas',
  'ScriptViews.tsx|"What Kind Of Being"': 'What Kind Of Being: 10 ideas',
  'ScriptViews.tsx|"Year It Is Set In"': 'Choose When It Is Set: the present day and ten decades',
  'ScriptViews.tsx|"The Look It Borrows"': 'Choose A Look To Borrow: ten decades, or any words',
  'ScriptViews.tsx|"Wants"': 'What They Want: 10 ideas',
  'ScriptViews.tsx|"Fears"': 'What They Fear: 8 ideas',
  'ScriptViews.tsx|"Makeup"': 'How They Look: 10 makeup ideas; the control lists all ten methods',
  'ScriptViews.tsx|"Costume From"': 'How They Look: 8 costume ideas; the control lists all four sources',
  'ScriptViews.tsx|"Appearance States"': 'How They Look: ideas that set two or three states',
  'ScriptViews.tsx|"Crowd Makeup"': 'Ideas For This Scene: 4 crowd-makeup ideas',
  'ScriptViews.tsx|"Extend The Crowd In Post"': 'Ideas For This Scene: Everyone On Set, Extend The Crowd In Post',
  'ScriptViews.tsx|"Stunts"': 'Ideas For This Scene: a physical gag',
  'ScriptViews.tsx|"Rule"': "Choose A Rule For Your Story's World: 8 ideas",
  'ScriptViews.tsx|"Point Of View"': 'Choose A Point Of View: 10 ideas',
  'ScriptViews.tsx|"Central Question"': 'Choose The Question It Asks: 10 ideas',
  'ScriptViews.tsx|"Story Setting"': 'Choose Where It Is Set: 16 ideas',
  'ScriptViews.tsx|"Description"': 'How They Come Across: 12 ideas',
  'ScriptViews.tsx|"Objective"': 'Ideas For This Scene: 14 objectives',
  "ScriptViews.tsx|{nonfiction ? 'What Happens' : 'Action'}": 'Ideas For This Scene: 10 kinds of action',
  'ScriptViews.tsx|"Turning Point"': 'Ideas For This Scene: 12 turns',
  'ScriptViews.tsx|"Props"': 'Ideas For This Scene: 12 sets of props, added to what is listed',
  'ScriptViews.tsx|"Animals"': 'Ideas For This Scene: 6 ideas, each requiring a wrangler',
  'ScriptViews.tsx|"Vehicles"': 'Ideas For This Scene: 8 ideas, each requiring a coordinator',
  'ScriptViews.tsx|"Visual Effects"': 'Ideas For This Scene: 8 effects, each four days of work after the lock',
  'ScriptViews.tsx|"The Light It Is Shot In"': 'Choose The Light It Is Shot In: 3 ideas; the control lists all four',
  'ScriptViews.tsx|"The Score"': 'Choose Its Score: 3 ideas; the control lists all four',
  'ScriptViews.tsx|{SOUNDS[k].label}': 'Sound And Music: 5 sound ideas, each ticking one of these',
  'PlanViews.tsx|{`Camera For ${sceneLabel(p, s)}`}': 'Ideas For This Scene (Script page): camera ideas that set the rig with the coverage',
  'Projects.tsx|"Tone"': 'Choose A Tone, on the Script page once the project exists: 11 ideas',
  'Projects.tsx|"Story Era"': 'Choose When It Is Set, on the Script page once the project exists',
  'Projects.tsx|"Story Setting"': 'Choose Where It Is Set, on the Script page once the project exists: 16 ideas',
  'ScriptViews.tsx|"Limit Or Cost"': "Choose A Rule For Your Story's World: written with the rule",
  'ScriptViews.tsx|"Place"': 'Add A Scene From An Idea: 12 kinds of place',
  'ScriptViews.tsx|"Interior Or Exterior"': 'Add A Scene From An Idea: set by the kind of place',
  'ScriptViews.tsx|"Time Of Day"': 'Add A Scene From An Idea: set by the kind of place',
  'ScriptViews.tsx|"Crowd Size"': 'Add A Scene From An Idea: set by the kind of place',
  'ScriptViews.tsx|"Character Name"': 'A premise brings named characters, with the names yours to change',
  'Projects.tsx|"Medium"': 'How It Is Made (Script page, before a draft is approved): 10 ideas',
  "Projects.tsx|{medium === 'hybrid' ? 'Animation Technique For Animated Scenes' : 'Animation Technique'}": 'How It Is Made (Script page): set with the medium',
  'Projects.tsx|?': 'Blend Genres (Script page): 8 blends; the genre search lists all 149',
};
/** Creative fields with no picker yet, for milestone C. */
const LATER = new Set(['"Central Question"', '"Point Of View"', '"Story Setting"', '{q.label}', '"Objective"', "{nonfiction ? 'What Happens' : 'Action'}", '"Turning Point"', '"Tonal Intention"', '"Line"', '"Season Arc"',
  '{`What Episode ${n} Moves`}', '"New Act Or Sequence"', '"New Thread"', '"What Is Set Up"', '"Relationship"', '"Where It Starts"', '"Where It Ends"', '"Description"', '"What Kind Of Being"', '"Props"', '"Animals"', '"Vehicles"',
  '"Visual Effects"', '"What Changes"', '"New Question"', '"Reference"', '"Also Called"', '"Story Era"', '"Tone"', '"Story Setting"']);

/** Text that is the player's own by its nature, so no idea is offered for it, with the reason. */
const OWN: Record<string, string> = {
  '"Line"': "None: a line of dialogue is the writer's own. The game counts lines and never reads them",
  '"Note"': "None: a note to yourself, kept as written",
  '"Reference"': 'None: your own reference, kept as written',
  '"New Question"': "None: a question for your own research, kept as written",
  '"What Changes"': "None: your own account of a change you made, kept as written",
  '"Also Called"': 'None: another name for the same character, typed',
  '"Describe Your Ethnicity"': "None: your own identity, in your own words. Nothing is suggested for it",
  '{`Add Ethnicity For ${who}`}': "None: a search of the backgrounds list, or your own words. Nothing is suggested for a character's identity",
  '{`Add Nationality For ${who}`}': 'None: a search of real countries',
};

function decision(screen: string, label: string, cls: string, widget: string): [string, string, string] {
  const hit = PICKER[`${screen}|${label}`];
  if (hit) return [hit, KEPT, KEPT_TEST];
  if (OWN[label]) return [OWN[label], 'Unchanged', ''];
  if (screen === 'IdeaPicker.tsx') return ["Part of the picker itself", 'n/a', ''];
  if (cls === 'view') return ['None: a control of the screen, not of the game', 'n/a', ''];
  if (/Picker$/.test(widget)) return [widget === 'GenrePicker' ? 'None: a search of the genre catalog' : widget === 'LanguagePicker' ? 'None: a search of the languages' : 'None: the world search of real places (destinations: milestone E)', 'n/a', ''];
  if (/\((date|time)\)/.test(widget) || /"(Month|Day|Year Of Birth|Release Date|Starting Date|Starting Time)"/.test(label)) return ['None: a date or time, entered as one', 'n/a', ''];
  if (widget.startsWith('NumberField')) return ['None: a quantity, entered as a number within its range', 'n/a', ''];
  if (widget.startsWith('Check')) return ['None: a yes or no', 'n/a', ''];
  if (widget.startsWith('SelectField')) return ['None: already a short list to choose from', 'n/a', ''];
  if (cls === 'record' || /Name|Title/.test(label)) return ['None: a name or a record, typed. Name suggestions: milestone C', 'Unchanged', ''];
  if (LATER.has(label) || /long text/.test(widget) || cls === 'identity') return ['Not yet: creative text with no ideas written for it. Milestone C', 'Unchanged', ''];
  return ['None: entered as text', 'Unchanged', ''];
}

describe('the field inventory', () => {
  const [head, ...rows] = parseCsv(readFileSync('docs/input-audit/CONTROLS.csv', 'utf8'));
  const col = (r: string[], name: string) => r[head.indexOf(name)];
  const w = widgets();
  const out: string[][] = [['screen', 'field', 'occurrence', 'kind_of_field', 'control', 'what_reads_it', 'picker_or_why_not', 'typed_value', 'test']];
  for (const r of rows) {
    const key = `${col(r, 'screen')}|${col(r, 'label')}|${col(r, 'occurrence')}`;
    const widget = w.get(key) ?? 'unknown';
    const [picker, kept, pickerTest] = decision(col(r, 'screen'), col(r, 'label'), col(r, 'class'), widget);
    out.push([col(r, 'screen'), col(r, 'label'), col(r, 'occurrence'), col(r, 'class'), widget, col(r, 'consumer') || col(r, 'state'), picker, kept, [col(r, 'unit_test'), col(r, 'journey'), pickerTest].filter(Boolean).join(' ; ')]);
  }

  it('lists every labelled control with a decision, and matches the committed file', () => {
    expect(out.length - 1).toBe(rows.length);
    for (const r of out.slice(1)) {
      expect(r[4], `${r[0]} ${r[1]}: no control found in the interface`).not.toBe('unknown');
      expect(r[6].length, `${r[0]} ${r[1]}`).toBeGreaterThan(8);
    }
    check('docs/creative-depth/FIELD-INVENTORY.csv', toCsv(out));
  });

  it('counts the decisions, so the ledger\'s numbers are the inventory\'s own', () => {
    const kind = (s: string) => (s.startsWith('None') ? 'no picker, by design' : s.startsWith('Not yet') || s.includes('milestone C)') ? 'no picker yet' : s.startsWith('Part of') ? 'the picker itself' : 'has ideas');
    const n: Record<string, number> = {};
    for (const r of out.slice(1)) n[kind(r[6])] = (n[kind(r[6])] ?? 0) + 1;
    expect(n).toMatchInlineSnapshot(`
      {
        "has ideas": 53,
        "no picker yet": 23,
        "no picker, by design": 210,
        "the picker itself": 10,
      }
    `);
  });
});

// ---------------- The effect coverage ----------------

const BUTTON: Record<Idea['field'], string> = {
  premise: 'Script: Choose A Starting Idea; Premise', logline: 'Script: Logline', conflict: 'Script: Central Conflict', stakes: 'Script: Stakes', theme: 'Script: Theme', ending: 'Script: Intended Ending', tone: 'Script: Tone',
  experience: 'Script: Intended Experience', 'world-rule': 'Script: Story World Rules', period: 'Script: Year It Is Set In', style: 'Script: The Look It Borrows', 'genre-blend': 'Script: Blend Genres', medium: 'Script: How It Is Made',
  'character-goal': 'Characters: Wants', 'character-fear': 'Characters: Fears', makeup: 'Characters: How They Look', wardrobe: 'Characters: How They Look', crowd: 'Script: Ideas For This Scene', camera: 'Script: Ideas For This Scene',
  sound: 'Script: Sound And Music', light: 'Script: The Light It Is Shot In', score: 'Script: Sound And Music',
  'genre-route': 'Script: Routes Through Its Genre', 'season-arc': 'Script: Season Arc', 'scene-tone': 'Script: Ideas For This Scene', 'character-being': 'Characters: What Kind Of Being', viewpoint: 'Script: Point Of View', question: 'Script: Central Question', setting: 'Script: Story Setting', 'character-description': 'Characters: Description',
  'scene-objective': 'Script: Ideas For This Scene', 'scene-action': 'Script: Ideas For This Scene', 'scene-turn': 'Script: Ideas For This Scene',
  props: 'Script: Ideas For This Scene', animals: 'Script: Ideas For This Scene', vehicles: 'Script: Ideas For This Scene', effects: 'Script: Ideas For This Scene', location: 'Script: Add A Scene From An Idea', 'physical-comedy': 'Script: Ideas For This Scene',
};
const sets = (c: Command): string => {
  switch (c.op) {
    case 'story': return `story.${c.field}`;
    case 'tone': return 'axes.tone';
    case 'setting': return 'axes.storySetting';
    case 'style': return 'axes.styleEra';
    case 'year': return 'axes.storyYear';
    case 'genre': return 'axes.genres';
    case 'medium': return 'axes.medium, axes.technique, character.methods';
    case 'rule': return 'worldRules';
    case 'character': return `character.${c.field}`;
    case 'look': return ['makeup' in c ? 'character.look.makeup' : '', 'wardrobe' in c ? 'character.look.wardrobe' : '', 'states' in c ? 'character.look.states' : ''].filter(Boolean).join(', ');
    case 'narrator': return 'character.functions';
    case 'crowd': return [c.method ? 'scene.crowdMethod' : '', c.look !== undefined ? 'scene.crowdLook' : ''].filter(Boolean).join(', ');
    case 'stunt': return 'scene.stunts';
    case 'scene': return `scene.${c.field}`;
    case 'season': return 'seasonArc';
    case 'needs': return `scene.${c.kind}`;
    case 'shot': return 'shotPlans[scene]';
    case 'light': return 'axes.light';
    case 'sound': return 'axes.sound';
    case 'score': return 'axes.score';
    case 'beats': return 'scenes (only those ticked)';
    case 'cast': return 'characters';
  }
};
const CLASS: Record<Idea['kind'], string> = { mechanical: 'mechanical decision', brief: 'document/identity information', reference: 'visual reference' };

describe('the effect coverage', () => {
  const journey = readFileSync('e2e/creative-ideas.spec.ts', 'utf8');
  const status = (x: Idea) => (x.kind === 'reference' ? 'reference-only by design' : journey.includes(x.label) ? 'implemented+browser verified' : 'implemented+engine verified');
  const out: string[][] = [['where', 'option_id', 'family', 'label', 'classification', 'saved_as', 'handler', 'read_by', 'what_it_does', 'test', 'status']];
  for (const x of IDEAS) {
    out.push([BUTTON[x.field], x.id, x.field, x.label, CLASS[x.kind], [...new Set(x.patch.map(sets)), 'brief.picks (its ID and version)'].join('; '), 'brief.ts applyIdea', x.consumers.join('; '), x.text, x.tests.join(' ; '), status(x)]);
  }
  out.push([BUTTON.logline, 'logline.<when>-<who>-<must>-<cost>', 'logline', 'A Built Logline', CLASS.brief, 'story.logline; brief.picks (the four parts chosen)', 'src/ideas/loglines.ts compose; brief.ts applyIdea',
    'script-effects.ts DOCUMENTS (the Pitch is made of this field)', `${WHEN.length + WHO.length + MUST.length + COST.length} written parts in four lists, which make thousands of sentences; the parts that don't go together are never offered.`,
    "tests/ideas.test.ts::counts what was written and what it makes, separately, and every sentence it offers is whole and its own ; e2e/creative-ideas.spec.ts::a logline built from four parts, and a crowd extended in post from a scene's own ideas", 'implemented+browser verified']);

  it('has a row for every idea, a status from the package\'s list, and matches the committed file', () => {
    const allowed = ['implemented+engine verified', 'implemented+browser verified', 'reference-only by design', 'awaiting source', 'awaiting external configuration', 'not implemented'];
    for (const r of out.slice(1)) {
      expect(allowed, r[1]).toContain(r[10]);
      // Nothing is called verified without a test to its name.
      if (r[10].startsWith('implemented')) expect(r[9].length, r[1]).toBeGreaterThan(20);
      // A mechanical decision names engine code that reads it.
      if (r[4] === 'mechanical decision') expect(r[7], r[1]).toMatch(/\.ts\b/);
    }
    check('docs/creative-depth/EFFECT-COVERAGE.csv', toCsv(out));
  });

  it('counts the statuses by classification, so the ledger\'s numbers are the table\'s own', () => {
    const n: Record<string, number> = {};
    for (const r of out.slice(1)) n[`${r[4]}: ${r[10]}`] = (n[`${r[4]}: ${r[10]}`] ?? 0) + 1;
    expect(n).toMatchInlineSnapshot(`
      {
        "document/identity information: implemented+browser verified": 5,
        "document/identity information: implemented+engine verified": 203,
        "mechanical decision: implemented+browser verified": 4,
        "mechanical decision: implemented+engine verified": 184,
        "visual reference: reference-only by design": 14,
      }
    `);
  });
});
