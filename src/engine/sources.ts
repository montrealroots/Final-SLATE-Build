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
// - No synopsis is written: Wikidata has none, and one is not invented.
import sourcesUrl from '../data/sources.json?url';

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
}
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
export function searchSources(c: SourceCatalog, o: { text?: string; medium?: SourceMedium | ''; genre?: string; standing?: RightsStanding | '' }): SourceWork[] {
  const words = (o.text ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/).filter(Boolean);
  const hay = (w: SourceWork) => `${w.title} ${w.creators.map((x) => x.name).join(' ')} ${w.recordedGenres.map((g) => g.label).join(' ')} ${w.description ?? ''}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return c.records
    .filter((w) => (!o.medium || w.medium === o.medium) && (!o.genre || w.genres.some((g) => g.genre === o.genre)) && (!o.standing || rightsStanding(w) === o.standing))
    .filter((w) => { if (!words.length) return true; const h = hay(w); return words.every((x) => h.includes(x)); })
    .sort((a, b) => b.wikipedias - a.wikipedias || a.title.localeCompare(b.title));
}
