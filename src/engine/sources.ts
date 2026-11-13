// The source-material catalog (the v3 package, 02): real novels, short stories, plays, poems, comics, video games and
// online fiction a script could be developed from. The records are Wikidata's (CC0), gathered by
// tools/sources/import.mjs into src/data/sources.json, and fetched only when a screen asks for them.
//
// What the game says about a work is what the record says, with where it came from. In particular:
// - Rights. A work's copyright status is shown only where Wikidata states one, with the place the statement applies
//   to. The game works nothing out from a date of death, and says "not recorded" for the rest. Nothing here is advice
//   about the law, and nothing the player agrees in the game grants a right to a real work.
// - Genres. A work keeps the genres Wikidata records. One of the game's own genres is attached only where the reviewed
//   table (tools/sources/genre-map.mjs) says a recorded genre is that genre, and the reason is kept with it.
// - No synopsis is written: Wikidata has none, and one is not invented. From November 12, 2026 a work can carry the
//   English Wikipedia article's own lead summary (tools/sources/enrich.mjs), always shown as that article's words with
//   its licence, never as the game's.
// - A work first published after the game's year is not offered (searchSources byYear).
import sourcesUrl from '../data/sources.json?url';
import plotsUrl from '../data/plots.json?url';

export type SourceMedium = 'novel' | 'short-story' | 'play' | 'poem' | 'comic' | 'video-game' | 'online' | 'light-novel';
export const MEDIUM_LABELS: Record<SourceMedium, string> = {
  novel: 'Novel', 'short-story': 'Short Story', play: 'Play', poem: 'Poem Or Epic', comic: 'Comic, Graphic Novel Or Manga', 'video-game': 'Video Game', online: 'Online Fiction, Webcomic Or Webtoon', 'light-novel': 'Light Novel',
};
export interface SourceWork {
  /** Wikidata's own identifier, "wd:Q480". */
  id: string;
  title: string;
  medium: SourceMedium;
  /** What Wikidata says it is an instance of ("literary work", "video game"). */
  kind: string | null;
  /** Wikidata's one-line description. Not a synopsis. */
  description: string | null;
  creators: { id: string; name: string; role: 'author' | 'creator' | 'developer'; died?: number }[];
  /** The earliest year Wikidata records for its publication, first performance or release; null where none is recorded. */
  year: number | null;
  languages: string[];
  countries: string[];
  recordedGenres: { id: string; label: string }[];
  /** The game's own genres, each with why. */
  genres: { genre: string; because: string }[];
  series: { id: string; name: string; number?: string } | null;
  /** Copyright statements exactly as recorded, each with the place it applies to where one is given. */
  copyright: { status: string; where?: string }[];
  link: string;
  article: string | null;
  provenance: { source: string; licence: string; retrieved: string };
  /** How many language editions of Wikipedia have an article on it: how widely it is written about, nothing more. */
  wikipedias: number;
  // Added by tools/sources/enrich.mjs (November 12, 2026). Each is what Wikidata records; absent or empty is not recorded.
  /** Characters (P674), most written about first, with their recorded sex or gender (P21) and kind (P31: "fictional horse"). */
  characters?: { id: string; name: string; gender?: string; kind?: string; sitelinks?: number }[];
  /** Where it is set (P840) and when (P2408), and what it is about (P921). */
  places?: { id: string; name: string }[];
  periods?: string[];
  subjects?: string[];
  /** The installment before and after it (P155, P156). */
  follows?: { id: string; title: string } | null;
  followedBy?: { id: string; title: string } | null;
  /** Its form as recorded (P7937): novel, novella, short story, collection. */
  forms?: string[];
  /** Works recorded as based on it (P144), earliest first, at most twelve; and how many there are. */
  adaptations?: { id: string; title: string; kind: string | null; year: number | null }[];
  adaptationCount?: number;
  /** The English Wikipedia article's own lead summary, with its licence: never the game's words. */
  summary?: { text: string; from: string; article: string; link: string; licence: string; retrieved: string } | null;
  enriched?: { source: string; retrieved: string };
  /** The work's story, from its article's plot section (tools/sources/plots.mjs), attached by loadPlots. Null: none recorded. */
  plot?: WorkPlot | null;
}
/**
 * A work's story as the English Wikipedia article tells it in its plot section (Plot, Synopsis, Story and the like), in
 * the article's own words under CC BY-SA 4.0 and credited wherever it is shown: never the game's words, and never the
 * work's own text. `whole` is false where the section was longer than was kept, so its end is not here.
 */
export interface WorkPlot { from: string; article: string; link: string; licence: string; section: string; whole: boolean; retrieved: string; paragraphs: string[] }
export interface SourceCatalog { version: 1; source: string; licence: string; retrieved: string; records: SourceWork[] }

let loaded: SourceCatalog | null = null;
let loading: Promise<SourceCatalog> | null = null;
/** Publish a catalog (the loader, and tests). */
export function applySources(data: unknown): SourceCatalog {
  const c = data as SourceCatalog;
  if (c?.version !== 1 || !Array.isArray(c.records)) throw new Error("The source catalog couldn't be read.");
  loaded = c;
  return c;
}
/** Fetched, not imported, so a failed load can be tried again (as the genre catalog is, genres.ts). */
export function loadSources(): Promise<SourceCatalog> {
  if (loaded) return Promise.resolve(loaded);
  if (!loading) {
    const attempt: Promise<SourceCatalog> = fetch(sourcesUrl)
      .then((r) => { if (!r.ok) throw new Error(`Couldn't load the source catalog (${r.status}).`); return r.json() as Promise<unknown>; })
      .then(applySources)
      .finally(() => { if (loading === attempt) loading = null; });
    loading = attempt;
  }
  return loading;
}
export const sourcesLoaded = (): SourceCatalog | null => loaded;

/**
 * The works' stories (src/data/plots.json), fetched only when a work is opened or adapted: they are as large as the
 * catalog itself. Each loaded work is given its story, or null where its article has none. From November 13, 2026.
 */
let plots: Promise<void> | null = null;
export function applyPlots(data: unknown, catalog: SourceCatalog | null = loaded): void {
  const d = data as { version?: number; plots?: Record<string, WorkPlot> };
  if (d?.version !== 1 || typeof d.plots !== 'object') throw new Error("The works' stories couldn't be read.");
  for (const w of catalog?.records ?? []) w.plot = d.plots![w.id] ?? null;
}
export function loadPlots(): Promise<void> {
  if (!plots) {
    const attempt: Promise<void> = Promise.all([loadSources(), fetch(plotsUrl).then((r) => { if (!r.ok) throw new Error(`Couldn't load the works' stories (${r.status}).`); return r.json() as Promise<unknown>; })])
      .then(([c, d]) => applyPlots(d, c))
      .catch((e) => { if (plots === attempt) plots = null; throw e; });
    plots = attempt;
  }
  return plots;
}

export type RightsStanding = 'public-domain-recorded' | 'copyrighted-recorded' | 'not-recorded';
/**
 * What the record says about a work's copyright, and nothing it doesn't. "Recorded as public domain" means Wikidata
 * carries that statement for at least one place and carries no statement that it is copyrighted anywhere; where the
 * record says both, or says copyrighted, it is "recorded as copyrighted"; with no statement, "not recorded".
 */
export function rightsStanding(w: SourceWork): RightsStanding {
  if (!w.copyright.length) return 'not-recorded';
  if (w.copyright.some((c) => /copyrighted/i.test(c.status))) return 'copyrighted-recorded';
  return w.copyright.some((c) => /public domain/i.test(c.status)) ? 'public-domain-recorded' : 'not-recorded';
}
/** The rights line a screen shows: the statements as recorded, then what that does and doesn't mean. */
export function rightsLine(w: SourceWork): string {
  const said = w.copyright.map((c) => `${c.status}${c.where ? ` (${c.where})` : ''}`).join('; ');
  const standing = rightsStanding(w);
  if (standing === 'not-recorded') return 'Wikidata records no copyright status for it. Its rights are unknown to the game.';
  return `Wikidata records: ${said}. That is a record, not advice, and it may be wrong or apply only where it says.`;
}

/** Works a search finds: every word in the title, a creator's name, a recorded genre or the description. */
export function searchSources(c: SourceCatalog, o: { text?: string; medium?: SourceMedium | ''; genre?: string; standing?: RightsStanding | ''; byYear?: number }): SourceWork[] {
  const words = (o.text ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/).filter(Boolean);
  const hay = (w: SourceWork) => `${w.title} ${w.creators.map((x) => x.name).join(' ')} ${w.recordedGenres.map((g) => g.label).join(' ')} ${w.description ?? ''}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return c.records
    // A work first published after the game's year doesn't exist yet in the game (the v4 package, 01). One with no year recorded is offered.
    .filter((w) => o.byYear === undefined || w.year === null || w.year <= o.byYear)
    .filter((w) => (!o.medium || w.medium === o.medium) && (!o.genre || w.genres.some((g) => g.genre === o.genre)) && (!o.standing || rightsStanding(w) === o.standing))
    .filter((w) => { if (!words.length) return true; const h = hay(w); return words.every((x) => h.includes(x)); })
    .sort((a, b) => b.wikipedias - a.wikipedias || a.title.localeCompare(b.title));
}
