#!/usr/bin/env node
// The UI coverage matrix (docs/v3/UI-COVERAGE.md): every screen, tab, dialog and state in docs/v3/ui-inventory.json,
// with what measured it and what it found. Two measures feed it:
//   the walk   e2e/ui-coverage.spec.ts, run with UI_COVERAGE_WRITE=1: each screen at several sizes, a phone against a desktop;
//   the sweep  every journey run with SLATE_UI_SWEEP=<file>: the same audit on whatever real play reaches.
// node tools/v3/ui-coverage.mjs [--sweep <file.jsonl> ...]   folds new sweep files into docs/v3/ui-coverage/sweep.json first.
// A row nothing reached says so. Nothing here is typed by hand except the inventory's names.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';

const DIR = 'docs/v3/ui-coverage';
const inventory = JSON.parse(readFileSync('docs/v3/ui-inventory.json', 'utf8'));
const norm = (s) => String(s).replace(/\d+/g, '#');

// ---- the sweep, folded into one small file
const sweepPath = `${DIR}/sweep.json`;
const args = process.argv.slice(2);
const files = args.flatMap((a, i) => (args[i - 1] === '--sweep' ? [a] : []));
let sweep = existsSync(sweepPath) && !args.includes('--fresh') ? JSON.parse(readFileSync(sweepPath, 'utf8')) : { seen: {}, defects: {}, accepted: {}, scrollers: {}, sig: {} };
// A later file's run of a spec on a profile replaces an earlier file's: a spec run again after a fix is the one that counts.
const lines = files.flatMap((f, n) => readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => ({ n, x: JSON.parse(l) })));
const lastFile = {}; for (const { n, x } of lines) lastFile[`${x.project}|${x.spec}`] = n;
for (const { n, x } of lines) {
  if (lastFile[`${x.project}|${x.spec}`] !== n) continue;
  if (x.screen === 'other') continue; // before the app has drawn anything
  const key = `${x.screen.replace(/\s+/g, ' ')}|${x.dialog}`;
  if (x.t === 'seen') { const at = (sweep.seen[key] ??= {}); const sizes = (at[x.project] ??= []); if (!sizes.includes(x.size)) sizes.push(x.size); }
  else if (x.t === 'sig') { const at = (((sweep.sig[key] ??= {})[x.project] ??= {})[`${x.spec} | ${x.test}`] ??= []); for (const i of x.items) if (!at.includes(i)) at.push(i); }
  else if (x.t === 'defect') { const k = `${key}|${x.project}|${x.kind}|${norm(x.what)}|${x.where && norm(x.where)}`; const d = (sweep.defects[k] ??= { screen: x.screen, dialog: x.dialog, project: x.project, kind: x.kind, what: norm(x.what), where: norm(x.where ?? ''), by: x.by, sizes: [], specs: [] }); if (!d.sizes.includes(x.size)) d.sizes.push(x.size); if (!d.specs.includes(x.spec) && d.specs.length < 3) d.specs.push(x.spec); }
  else { const bag = x.t === 'accepted' ? sweep.accepted : sweep.scrollers; const k = `${key}|${norm(x.what)}`; (bag[k] ??= { screen: x.screen, dialog: x.dialog, what: norm(x.what), projects: [] }); if (!bag[k].projects.includes(x.project)) bag[k].projects.push(x.project); }
}
if (files.length) writeFileSync(sweepPath, `${JSON.stringify(sweep, null, 1)}\n`);

// ---- the walk
const walks = Object.fromEntries(readdirSync(DIR).filter((f) => /^walk-.*\.json$/.test(f)).map((f) => [f.slice(5, -5), JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8'))]));
const walkRows = (id) => Object.entries(walks).flatMap(([project, w]) => w.rows.filter((r) => r.id === id).map((r) => ({ project, ...r })));

// ---- which inventory row a swept screen belongs to
const dialogRows = inventory.filter((r) => r.kind === 'dialog' && r.dialog).map((r) => ({ r, re: new RegExp(r.dialog) }));
const owner = (key) => {
  const [screen, dialog] = key.split('|');
  if (dialog) return dialogRows.find((d) => d.re.test(dialog))?.r.id ?? null;
  return inventory.find((r) => r.kind !== 'dialog' && r.kind !== 'panel' && r.kind !== 'menu' && r.screen === screen)?.id ?? null;
};
const sweptBy = {}; const strays = [];
for (const [key, at] of Object.entries(sweep.seen)) { const id = owner(key); if (!id) { strays.push(key); continue; } for (const [project, sizes] of Object.entries(at)) { const s = ((sweptBy[id] ??= {})[project] ??= new Set()); sizes.forEach((x) => s.add(x)); } }

// The same journeys on a desktop and on a phone: what each screen offered in one and not the other, over the journeys both ran.
// A journey is sampled as it goes, so a thing on screen for under half a second can be in one run and not the other;
// every difference is listed to be looked at, and none is called a defect until someone has.
const NAV = /^press: (Menu|Close Menu|Close Navigation|SLATE, Go To Home|Home|Player Profile|World|Projects|Companies|Saved Games|Settings|Save & Exit|Skip To Content|Calendar|Sleep|Advance|Running|Paused|.*, Open Your Player Profile)$/;
const journeyParity = {}; const parityNotes = [];
for (const [key, by] of Object.entries(sweep.sig ?? {})) {
  const id = owner(key); if (!id || !by.desktop || !by.phone) continue;
  const specs = Object.keys(by.desktop).filter((sp) => by.phone[sp]);
  if (!specs.length) continue;
  const D = new Set(specs.flatMap((sp) => by.desktop[sp])), P = new Set(specs.flatMap((sp) => by.phone[sp]));
  const onlyD = [...D].filter((x) => !P.has(x) && !NAV.test(x)), onlyP = [...P].filter((x) => !D.has(x) && !NAV.test(x));
  const at = (journeyParity[id] ??= { both: 0, onlyD: 0, onlyP: 0 }); at.both += [...D].filter((x) => P.has(x)).length; at.onlyD += onlyD.length; at.onlyP += onlyP.length;
  for (const x of onlyD) parityNotes.push(`| ${inventory.find((r) => r.id === id).name} | desktop only | ${x.replace(/\|/g, '/')} |`);
  for (const x of onlyP) parityNotes.push(`| ${inventory.find((r) => r.id === id).name} | phone only | ${x.replace(/\|/g, '/')} |`);
}
const out = []; const open = []; let unvisited = 0;
out.push('| Area | Screen | Kind | Walked: sizes measured | Desktop And Phone, Walked | Reached In Journeys | Desktop And Phone, In Journeys | Open Defects |', '|---|---|---|---|---|---|---|---|');
for (const row of inventory) {
  const walked = (row.walk ?? []).flatMap(walkRows);
  const sizes = {}; let defects = 0; let parity = '';
  for (const w of walked) {
    for (const [size, v] of Object.entries(w.sizes)) { (sizes[w.project] ??= new Set()).add(size); for (const d of v.defects) { defects++; open.push(`| ${row.name} | walk, ${w.project}, ${size} | ${d.kind} | ${norm(d.what).replace(/\|/g, '/')} | ${Math.round(d.by)} |`); } }
    if (w.parity) { const diff = w.parity.onlyDesktop.length + w.parity.onlyPhone.length; parity = diff || !w.parity.sameOrder ? `differs: ${[...w.parity.onlyDesktop.map((x) => `desktop only, ${x}`), ...w.parity.onlyPhone.map((x) => `phone only, ${x}`), ...(w.parity.sameOrder ? [] : ['order differs'])].join('; ')}` : parity || 'same headings, actions and fields, same order'; }
  }
  const swept = sweptBy[row.id] ?? {};
  for (const d of Object.values(sweep.defects)) if (owner(`${d.screen}|${d.dialog}`) === row.id) { defects++; open.push(`| ${row.name} | journeys, ${d.project}, ${d.sizes.join(' ')} (${d.specs.join(', ')}) | ${d.kind} | ${d.what.replace(/\|/g, '/')}${d.where ? ` in ${d.where}` : ''} | ${d.by} |`); }
  const walkedText = Object.entries(sizes).map(([p, s]) => `${p}: ${s.size}`).join(', ');
  const sweptText = Object.entries(swept).map(([p, s]) => `${p} (${[...s].join(' ')})`).join(', ');
  if (!walkedText && !sweptText) unvisited++;
  out.push(`| ${row.area} | ${row.name}${row.note ? ` (${row.note})` : ''} | ${row.kind} | ${walkedText || 'no'} | ${parity || (walkedText ? 'not compared' : 'not compared')} | ${sweptText || 'no'} | ${journeyParity[row.id] ? `${journeyParity[row.id].both} things in both${journeyParity[row.id].onlyD + journeyParity[row.id].onlyP ? `, ${journeyParity[row.id].onlyD} seen only on desktop, ${journeyParity[row.id].onlyP} only on phone (listed below)` : ''}` : 'not compared'} | ${!walkedText && !sweptText ? '**not visited**' : defects || 'none found'} |`);
}
const stamp = Object.values(walks).map((w) => w.at).sort().at(-1) ?? 'never';
const md = [
  '# UI Coverage Matrix', '',
  `Written by \`node tools/v3/ui-coverage.mjs\` from \`docs/v3/ui-inventory.json\`, the walk (\`e2e/ui-coverage.spec.ts\`, last run ${stamp.slice(0, 10)}) and the journey sweep (\`SLATE_UI_SWEEP\`). The owner's brief is \`docs/v3/UI-BRIEF.md\`.`, '',
  `${inventory.length} rows. ${inventory.length - unvisited} measured, ${unvisited} not visited. ${open.length} open defects.`, '',
  'What the columns mean. **Walked**: the screen was opened on purpose and measured at that many window sizes in each browser profile. **Desktop And Phone**: the same screen in the same state at 1280 and at 390 pixels wide, compared for headings, things to press, fields and their order. **Reached In Journeys**: a full play-through reached it and the same measure ran there, at the sizes listed. **Desktop And Phone, In Journeys**: what the screen offered when the same journeys ran in each layout. Browser emulation is not a real device: nothing here measures a virtual keyboard, and that is tracked in the limits below.', '',
  ...out, '',
  '## Open Defects', '', ...(open.length ? ['| Screen | Measured By | Kind | What | Pixels |', '|---|---|---|---|---|', ...[...new Set(open)]] : ['None found by the measures above.']), '',
  '## Seen In One Layout\'s Journeys And Not The Other\'s', '', 'From the same journeys run on a desktop and on a phone. A journey is sampled as it plays, so something on screen for under half a second can be caught in one run and missed in the other; these are to be looked at, not counted as defects.', '', ...(parityNotes.length ? ['| Screen | Seen | What |', '|---|---|---|', ...[...new Set(parityNotes)].sort()] : ['None.']), '',
  '## Accepted, With The Reason', '',
  ...[...new Set([...Object.values(walks).flatMap((w) => w.rows.flatMap((r) => r.accepted ?? [])), ...Object.values(sweep.accepted).map((a) => a.what)].map(norm))].sort().map((x) => `- ${x}`), '',
  '## Panes That Scroll Sideways On Purpose', '',
  ...[...new Set([...Object.values(walks).flatMap((w) => w.rows.flatMap((r) => r.scrollers ?? [])), ...Object.values(sweep.scrollers).map((a) => a.what)].map(norm))].sort().map((x) => `- ${x}`), '',
  '## Reached In Journeys But Not In The Inventory', '', ...(strays.length ? strays.sort().map((k) => `- \`${k}\``) : ['None.']), '',
];
writeFileSync('docs/v3/UI-COVERAGE.md', md.join('\n'));
console.log(`${inventory.length} rows, ${unvisited} not visited, ${open.length} open defects, ${strays.length} strays`);
