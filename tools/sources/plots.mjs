#!/usr/bin/env node
// The story of each work in the source catalog (the owner, November 13, 2026: "All adapted material should have a story
// behind it, even the copyrighted one ... I need actual material for those still"). Until then an adaptation's premise
// was the English Wikipedia article's lead, which for many works says what the work is (a 2007 puzzle-platform game by
// Valve) and not what happens in it, and the proposal said the game did not have the work's story.
//
//   node tools/sources/plots.mjs            # fetch what isn't cached yet, slowly, into .sources-cache/plots/
//   node tools/sources/plots.mjs --build    # write src/data/plots.json from the cache
//
// The story is the English Wikipedia article's own plot section (Plot, Synopsis, Story and the like), in its own words
// under CC BY-SA 4.0, kept with the article's title, link, licence, section and date, so it is always shown as that
// article's words and credited, never as the game's. A copyrighted work's article is Wikipedia's writing about the work,
// not the work, and is credited the same way. A work whose article has no such section has no story here, and the game
// says so. Requests go one at a time and back off when Wikimedia asks (429), as its rate-limit guidance says.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// A second cache from November 13, 2026: it keeps each story section's raw text with its subsection headings, so how a
// story is read can change without fetching it again. The first kept only the paragraphs.
const CACHE = '.sources-cache/plots2';
const UA = 'slate-source-catalog/1.0 (a game\'s catalog build; Wikipedia CC BY-SA)';
/** Section titles that hold a work's story, in the order they are preferred. */
export const STORY_SECTIONS = ['Plot', 'Plot summary', 'Synopsis', 'Story', 'Storyline', 'Plot overview', 'Summary', 'Narrative', 'Premise', 'Plot and characters', 'Contents', 'Content', 'Outline', 'Setting and plot', 'Plot and setting'];
/** The most kept of one work's story, in characters: whole paragraphs up to this. */
export const MOST = 6000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Subsections of a story section that tell its events, where it has any: an article like Portal's divides its Synopsis
 * into Characters, Setting and Plot, and only the last is the story. Without such a subsection, the ones about the
 * work's world rather than its events are left out (when anything else remains).
 */
const PLOT_PART = /\b(plot|story|storyline|synopsis|summary|narrative|events)\b/i;
const NOT_STORY = /^(the )?(main )?(setting|characters?|background|world|cast|universe|gameplay|premise|themes?|style|reception|development)\b/i; // a heading that starts so, not "Part 1: Alex's world"

/** The raw text of a story section of a plain-text extract whose headings are `== Title ==`, its subsections kept. */
export function storySection(extract) {
  const lines = extract.split('\n');
  const heads = [];
  lines.forEach((l, i) => { const m = /^(={2,})\s*(.+?)\s*\1\s*$/.exec(l); if (m) heads.push({ i, level: m[1].length, title: m[2] }); });
  for (const want of STORY_SECTIONS) {
    const h = heads.find((x) => x.level === 2 && x.title.toLowerCase() === want.toLowerCase());
    if (!h) continue;
    const end = heads.find((x) => x.i > h.i && x.level <= 2)?.i ?? lines.length;
    return { section: h.title, raw: lines.slice(h.i + 1, end).join('\n') };
  }
  return null;
}

/** A story section's paragraphs: its plot subsections where it has them, otherwise all but those about its world. */
export function storyOf(found) {
  if (!found) return null;
  const parts = [{ title: null, paragraphs: [] }];
  for (const l of found.raw.split('\n')) {
    const m = /^(={3,})\s*(.+?)\s*\1\s*$/.exec(l);
    if (m) parts.push({ title: m[2], paragraphs: [] });
    else if (l.trim()) parts.at(-1).paragraphs.push(l.trim());
  }
  const filled = parts.filter((x) => x.paragraphs.length);
  // Only a section that mixes the story with something else (Portal's Synopsis: Setting, then Plot) is narrowed: to its
  // plot parts, or failing those to what isn't the something else. One whose parts all tell the story keeps them all.
  // Until November 13, 2026 the plot parts were kept wherever there were any, so Don Quixote's Summary kept only "The
  // Ill-Advised Curiosity summary", a tale told inside the novel, and lost the novel's own story.
  const other = filled.filter((x) => x.title && NOT_STORY.test(x.title));
  const plot = filled.filter((x) => x.title && PLOT_PART.test(x.title));
  const told = !other.length ? filled : plot.length ? plot : filled.filter((x) => !other.includes(x)).length ? filled.filter((x) => !other.includes(x)) : filled;
  const paragraphs = told.flatMap((x) => x.paragraphs);
  const kept = [];
  let size = 0;
  for (const p of paragraphs) { if (size + p.length > MOST && kept.length) break; kept.push(p); size += p.length; }
  return kept.length ? { section: found.section, parts: told === filled ? [] : told.map((x) => x.title).filter(Boolean), paragraphs: kept, whole: kept.length === paragraphs.length } : null;
}

async function fetchOne(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&exsectionformat=wiki&redirects=1&format=json&formatversion=2&titles=${encodeURIComponent(title)}`;
  for (let wait = 60_000; ; wait = Math.min(wait * 2, 30 * 60_000)) {
    const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } }).catch(() => null);
    if (r?.ok) return (await r.json()).query?.pages?.[0] ?? null;
    if (r && r.status !== 429 && r.status < 500) throw new Error(`${title}: ${r.status}`);
    console.log(`${new Date().toISOString()} ${r?.status ?? 'no answer'} for ${title}; waiting ${wait / 60_000} min`);
    await sleep(wait);
  }
}

async function fetchAll() {
  mkdirSync(CACHE, { recursive: true });
  const { records } = JSON.parse(readFileSync('src/data/sources.json', 'utf8'));
  const todo = records.filter((r) => r.article && !existsSync(join(CACHE, `${r.id.replace(':', '-')}.json`)));
  console.log(`${todo.length} of ${records.length} works to fetch`);
  for (const r of todo) {
    const title = decodeURIComponent(r.article.split('/wiki/')[1]).replace(/_/g, ' ');
    const page = await fetchOne(title);
    const found = page?.extract ? storySection(page.extract) : null;
    const story = storyOf(found);
    writeFileSync(join(CACHE, `${r.id.replace(':', '-')}.json`), JSON.stringify({ id: r.id, article: page?.title ?? title, retrieved: new Date().toISOString().slice(0, 10), found, story }));
    console.log(`${r.title}: ${story ? `${story.section}, ${story.paragraphs.length} paragraphs` : 'no story section'}`);
    await sleep(6_000); // one request at a time, well inside what Wikimedia asks of serial clients; a 429 waits a minute and more
  }
}

/**
 * A paragraph about the book rather than its story ("published in 1605, divided internally into four parts"): left out
 * where it comes before the story, as in Don Quixote's Summary section. Only at the start, and never the last one left.
 */
export const ABOUT_THE_BOOK = /\b(published|publication|edition|editions|volumes?|chapters|serialized|serialised|instal?ments|first appeared|was released|developed by)\b/i;
export function storyParagraphs(paragraphs) {
  let i = 0;
  while (i < paragraphs.length - 1 && ABOUT_THE_BOOK.test(paragraphs[i])) i += 1;
  return paragraphs.slice(i);
}

function build() {
  const out = {};
  for (const f of readdirSync(CACHE)) {
    const c = JSON.parse(readFileSync(join(CACHE, f), 'utf8'));
    // Read again from the raw section each build, so a change to storyOf needs no new fetch.
    c.story = c.found ? storyOf(c.found) : null;
    if (!c.story) continue;
    out[c.id] = { from: 'English Wikipedia', article: c.article, link: `https://en.wikipedia.org/wiki/${encodeURIComponent(c.article.replace(/ /g, '_'))}`, licence: 'CC BY-SA 4.0', section: c.story.section, ...(c.story.parts.length ? { parts: c.story.parts } : {}), whole: c.story.whole, retrieved: c.retrieved, paragraphs: storyParagraphs(c.story.paragraphs) };
  }
  writeFileSync('src/data/plots.json', `${JSON.stringify({ version: 1, source: 'English Wikipedia', licence: 'CC BY-SA 4.0', plots: out })}\n`);
  console.log(`${Object.keys(out).length} works with a story written to src/data/plots.json`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--build')) build(); else await fetchAll();
}
