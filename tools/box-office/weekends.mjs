// 2026's real US weekends at the box office, from Wikipedia (November 22, 2026, docs/BOX-OFFICE-WEEKENDS.md): each
// weekend's number-one film and its weekend gross, as Wikipedia's "List of 2026 box office number-one films in the
// United States" gives them, most cited to Box Office Mojo. Wikipedia's text is CC BY-SA 4.0: the figures ship in the
// build (src/data/box-office/weekends-us-2026.json) with the page, its licence and the day it was read, and the game
// credits it wherever they show. The owner asked on November 22 for the year to move as it did in real life up to that
// day, and be simulated from there.
//   node tools/box-office/weekends.mjs
// The page's source is cached in .box-office-cache/; a rerun reads the cache. Delete it to read the page again.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = 'List_of_2026_box_office_number-one_films_in_the_United_States';
const AGENT = 'SLATE-box-office-import/1.0 (a personal film-industry game)';
const CACHE = process.env.BOX_OFFICE_CACHE ?? join(process.cwd(), '.box-office-cache');
const OUT = process.env.WEEKENDS_OUT ?? join(process.cwd(), 'src/data/box-office/weekends-us-2026.json');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

async function source() {
  mkdirSync(CACHE, { recursive: true });
  const f = join(CACHE, `${PAGE}.json`);
  if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8'));
  const res = await fetch(`https://en.wikipedia.org/w/index.php?title=${PAGE}&action=raw`, { headers: { 'User-Agent': AGENT } });
  if (!res.ok) throw new Error(`Wikipedia answered ${res.status}; try again later.`);
  const out = { retrievedAt: new Date().toISOString(), text: await res.text() };
  writeFileSync(f, JSON.stringify(out));
  return out;
}

/** A film's title from its cell: the link's shown text, else its target, without the italics. */
export const filmTitle = (cell) => {
  const link = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/.exec(cell);
  const t = link ? (link[2] ?? link[1]) : cell.replace(/''/g, '');
  return t.replace(/''/g, '').trim();
};

/**
 * The weekend table's rows: the week, the weekend's last day, the number-one film (a film spanning weekends is written
 * once, with a rowspan, and carried to the rows it covers), the gross in whole dollars, and the source its reference
 * names. Rows outside the first table are not read.
 */
export function parseWeekends(text) {
  const table = text.slice(text.indexOf('{| class="wikitable'), text.indexOf('|}'));
  const rows = table.split(/\n\|-\s*\n/).slice(1);
  const out = [];
  let film = null;
  let left = 0;
  for (const row of rows) {
    const line = row.replace(/^\|\s*/, '');
    const cells = line.split('||').map((c) => c.trim());
    const week = Number(cells[0]);
    const date = /\{\{dts\|(\d{4})\|(\w+)\|(\d+)/.exec(cells[1] ?? '');
    if (!Number.isInteger(week) || !date) continue;
    const end = `${date[1]}-${String(MONTHS.indexOf(date[2]) + 1).padStart(2, '0')}-${date[3].padStart(2, '0')}`;
    let rest = cells.slice(2);
    if (!/^\$/.test(rest[0])) {
      const span = /rowspan="(\d+)"\s*\|\s*(.*)$/.exec(rest[0]);
      film = filmTitle(span ? span[2] : rest[0]);
      left = span ? Number(span[1]) - 1 : 0;
      rest = rest.slice(1);
    } else if (left > 0) {
      left--;
    } else {
      throw new Error(`Week ${week}: no film and none carried over.`);
    }
    const gross = Number(rest[0].replace(/[^\d]/g, ''));
    const site = /website\s*=\s*([^|}]+)/.exec(row)?.[1]?.trim() ?? null;
    out.push({ week, end, film, gross, source: site });
  }
  return out;
}

async function main() {
  const { retrievedAt, text } = await source();
  const weekends = parseWeekends(text);
  if (!weekends.length) throw new Error('No weekends were read from the page.');
  const body = {
    source: 'Wikipedia', page: `https://en.wikipedia.org/wiki/${PAGE}`, licence: 'CC BY-SA 4.0',
    territory: 'US', retrieved: retrievedAt.slice(0, 10), weekends,
  };
  mkdirSync(join(OUT, '..'), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(body, null, 1)}\n`);
  console.log(`${weekends.length} weekends, ${weekends[0].end} to ${weekends.at(-1).end}; last: ${weekends.at(-1).film}, $${weekends.at(-1).gross.toLocaleString('en-US')}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
