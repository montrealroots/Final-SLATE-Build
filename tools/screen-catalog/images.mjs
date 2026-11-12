// Gathers the optional picture pack (the Creative Depth package, milestone G; docs/DATA-PACKS.md, "The Picture Pack"):
// posters of the titles credited to the companies you choose, and profile photos of their top-billed cast and their
// directors and creators, at a small or a medium size. Nothing is fetched until the plan has been printed, and
// `--plan` stops there.
//   NODE_USE_ENV_PROXY=1 node tools/screen-catalog/images.mjs --companies=company:pixar,company:lucasfilm [--tier=small|medium] [--people=8] [--plan]
// It reads the film catalog's own cache for each title's and person's picture path (TMDB's poster_path and
// profile_path), then fetches each picture from TMDB's image host, which needs no credential: none is read, held or
// sent here. Pictures are kept in .screen-images/ (git-ignored), each with the day it was fetched; one older than
// TMDB's six months is fetched again. `node tools/pack.mjs images` then writes the pack.
//
// A picture is information to look at. Nothing in the game reads one, and having the pack changes no outcome.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { COMPANIES } from '../../src/catalog/registry.ts';
import { CACHE, MAX_AGE_DAYS, cached, pool } from './tmdb.mjs';

export const IMAGE_BASE = 'https://image.tmdb.org/t/p/';
/** TMDB's own size names (its /configuration), by tier. Never "original": a list card doesn't need it. */
export const TIERS = { small: { profile: 'w185', poster: 'w154' }, medium: { profile: 'h632', poster: 'w342' } };
/** About what one picture weighs at each size, for the plan. Measured on a sample on November 11, 2026. */
export const ABOUT_BYTES = { w185: 12_000, w154: 14_000, h632: 60_000, w342: 45_000 };
export const RIGHTS = "Pictures come from TMDB, where its users contribute them. The rights to each belong to its owner. Nothing here clears a picture for any use beyond showing it in the owner's own copy of the game, with TMDB credited.";
const OUT = process.env.SCREEN_IMAGES ?? join(process.cwd(), '.screen-images');
const DAY = 86_400_000;
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

/**
 * Width and height from a JPEG's, a PNG's or a WebP's own header; null when none can be read. The image host answers
 * a few `.jpg` paths with a WebP (27 of 313,671 on November 12, 2026), which a browser shows all the same.
 */
export function dimensions(buf) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf.length > 30 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') {
    const kind = buf.toString('latin1', 12, 16);
    if (kind === 'VP8 ' && buf[23] === 0x9d && buf[24] === 0x01 && buf[25] === 0x2a) return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    if (kind === 'VP8L' && buf[20] === 0x2f) { const b = buf.readUInt32LE(21); return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 }; }
    if (kind === 'VP8X') return { w: buf.readUIntLE(24, 3) + 1, h: buf.readUIntLE(27, 3) + 1 };
    return null;
  }
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  return null;
}

/** What to fetch for a selection: each subject with its TMDB picture path. Reads only the catalog's cache. */
export function plan({ companies, people = 8, manifest, read = cached }) {
  const ids = new Set(companies.map((c) => COMPANIES.find((x) => x.id === c)?.tmdb?.id).filter(Boolean));
  const titles = manifest.titles.filter((t) => t.companies.some((c) => ids.has(c)));
  const posters = new Map();
  const persons = new Set();
  let missing = 0;
  for (const t of titles) {
    const [type, id] = t.key.split(':');
    const d = read(type === 'movie' ? `movie/${id}?append_to_response=credits,external_ids,release_dates` : `tv/${id}?append_to_response=aggregate_credits,credits,external_ids,content_ratings`)?.body;
    if (!d) { missing++; continue; }
    if (d.poster_path) posters.set(`${type}:${id}`, { path: d.poster_path, loc: null });
    const cast = type === 'movie' ? (d.credits?.cast ?? []).filter((c) => c.order < people) : (d.aggregate_credits?.cast ?? []).slice(0, people);
    for (const c of cast) persons.add(c.id);
    for (const c of d.credits?.crew ?? []) if (c.job === 'Director') persons.add(c.id);
    for (const c of d.created_by ?? []) persons.add(c.id);
  }
  const profiles = new Map();
  for (const id of persons) { const p = read(`person/${id}`)?.body; if (p?.profile_path) profiles.set(`person:${id}`, { path: p.profile_path, loc: null }); }
  return { titles: titles.length, missing, posters, profiles, withoutPicture: { titles: titles.length - missing - posters.size, people: persons.size - profiles.size } };
}

async function main() {
  const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
  const companies = arg('companies', '').split(',').filter(Boolean);
  const tier = arg('tier', 'small');
  if (!companies.length || !TIERS[tier]) { console.error('Usage: images.mjs --companies=company:<slug>[,...] [--tier=small|medium] [--people=8] [--plan]'); process.exit(2); }
  const unknown = companies.filter((c) => !COMPANIES.some((x) => x.id === c && x.tmdb));
  if (unknown.length) { console.error(`Not a company the catalog gathers titles for: ${unknown.join(', ')}`); process.exit(2); }
  const manifest = JSON.parse(readFileSync(join(CACHE, 'manifest.json'), 'utf8'));
  const sizes = TIERS[tier];
  const p = plan({ companies, people: Number(arg('people', '8')), manifest });
  const about = p.posters.size * ABOUT_BYTES[sizes.poster] + p.profiles.size * ABOUT_BYTES[sizes.profile];
  log(`${p.titles} titles credited to ${companies.length} ${companies.length === 1 ? 'company' : 'companies'}: ${p.posters.size} posters and ${p.profiles.size} profile photos at the ${tier} size, about ${(about / 1048576).toFixed(1)} MB to fetch and to store.`);
  log(`No picture is recorded for ${p.withoutPicture.titles} titles and ${p.withoutPicture.people} people; they keep the game's placeholder.${p.missing ? ` ${p.missing} titles aren't in the cache yet.` : ''}`);
  if (process.argv.includes('--plan')) return;

  const want = [...[...p.posters].map(([s, v]) => [s, sizes.poster, v]), ...[...p.profiles].map(([s, v]) => [s, sizes.profile, v])];
  const now = Date.now();
  let fetched = 0, kept = 0, failed = 0, next = 0;
  const one = async ([subject, size, v]) => {
    const file = join(size, v.path.replace(/^\//, ''));
    const full = join(OUT, file);
    if (existsSync(full) && now - statSync(full).mtimeMs < MAX_AGE_DAYS * DAY) { kept++; return [subject, file, v]; }
    for (let attempt = 0; attempt < 4; attempt++) {
      // About twenty a second.
      const at = Math.max(Date.now(), next); next = at + 50; if (at > Date.now()) await new Promise((r) => setTimeout(r, at - Date.now()));
      try {
        const res = await fetch(`${IMAGE_BASE}${size}${v.path}`);
        if (res.status === 404) break;
        if (!res.ok) { await new Promise((r) => setTimeout(r, 500 * 2 ** attempt)); continue; }
        mkdirSync(join(OUT, size), { recursive: true });
        writeFileSync(full, Buffer.from(await res.arrayBuffer()));
        fetched++;
        if ((fetched + kept) % 500 === 0) log(`${fetched + kept} of ${want.length}`);
        return [subject, file, v];
      } catch { await new Promise((r) => setTimeout(r, 500 * 2 ** attempt)); }
    }
    failed++;
    return null;
  };
  const got = (await pool(want, 8, one)).filter(Boolean);
  const entries = {}, files = {};
  let from = Infinity, to = 0, bytes = 0;
  for (const [subject, file, v] of got) {
    const full = join(OUT, file);
    const st = statSync(full);
    const dim = dimensions(readFileSync(full));
    if (!dim) { failed++; continue; }
    from = Math.min(from, st.mtimeMs); to = Math.max(to, st.mtimeMs); bytes += st.size;
    entries[subject] = { p: v.path, w: dim.w, h: dim.h, at: new Date(st.mtimeMs).toISOString().slice(0, 10), loc: v.loc };
    files[subject] = file;
  }
  if (!got.length) { log('Nothing was fetched, so no index was written.'); process.exit(1); }
  const index = {
    version: 1, name: 'Pictures', provider: 'TMDB', builtAt: new Date().toISOString(),
    retrieved: { from: new Date(from).toISOString(), to: new Date(to).toISOString(), maxAgeDays: MAX_AGE_DAYS },
    sizes, tier, rights: RIGHTS, selection: { companies, people: Number(arg('people', '8')) }, entries, files,
  };
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'index.json'), JSON.stringify(index));
  log(`Done: ${Object.keys(entries).length} pictures, ${(bytes / 1048576).toFixed(1)} MB (${fetched} fetched, ${kept} already here, ${failed} failed). Now: node tools/pack.mjs images`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
