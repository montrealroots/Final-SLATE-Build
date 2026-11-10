// The companies the Disney catalog covers, and their leadership, researched November 10, 2026 (docs/CATALOG.md).
//
// Each entry is one company record as TMDB holds it: its TMDB ID was found by search and checked against the company's
// own TMDB details (name, country, headquarters) that day, never guessed. A credited name stays as credited: 20th Century
// Fox and 20th Century Studios are two records, because TMDB credits titles to the name a company had at the time, and
// a film credited to 20th Century Fox in 1997 wasn't a Disney production. Ownership is the relationship to The Walt
// Disney Company, with a date only where an official source gives one.
//
// Leadership comes from the companies' own leadership pages and announcements, never from screen credits. Dates are
// what the sources state; where a source gives none, the field is null and the page says so.

export interface Source { url: string; title: string; published: string | null }

export type CompanyRole = 'production' | 'distribution' | 'network' | 'streaming' | 'holding';

export interface CompanyRecord {
  /** Stable ID other systems can refer to: company:<slug>. */
  id: string;
  name: string;
  kind: 'corporate' | 'film' | 'television' | 'network';
  roles: CompanyRole[];
  /** The TMDB company record, checked by search and company details; null for a company TMDB lists only as a network or not at all. */
  tmdb: { id: number; name: string; country: string; headquarters: string } | null;
  website: string | null;
  /** Its place in The Walt Disney Company. */
  parent: { id: string; how: 'division' | 'acquired'; from: string | null; source: Source | null } | null;
  /** Earlier or later names held as separate records, with how they relate. */
  related: { id: string; relation: string }[];
  notes: string[];
}

const S = {
  pixar: { url: 'https://thewaltdisneycompany.com/press-releases/disney-completes-pixar-acquisition/', title: 'Disney Completes Pixar Acquisition', published: '2006-05-05' },
  marvel: { url: 'https://thewaltdisneycompany.com/press-releases/disney-completes-marvel-acquisition/', title: 'Disney Completes Marvel Acquisition', published: '2009-12-31' },
  lucasfilm: { url: 'https://www.sec.gov/Archives/edgar/data/0001001039/000100103913000164/fy2013_q4x10k.htm', title: 'The Walt Disney Company, Form 10-K, fiscal 2013 (Lucasfilm acquired December 21, 2012)', published: '2013-11-20' },
  fox: { url: 'https://thewaltdisneycompany.com/press-releases/disney-21st-century-fox-acquisition-closing-date/', title: 'Disney and 21st Century Fox Announce Per Share Value in Connection with $71 Billion Acquisition (effective 12:02 a.m. Eastern Time, March 20, 2019)', published: '2019-03-19' },
  ceo: { url: 'https://thewaltdisneycompany.com/press-releases/josh-damaro-named-next-chief-executive-officer-of-the-walt-disney-company/', title: "Josh D'Amaro Named Next Chief Executive Officer of The Walt Disney Company", published: '2026-02-03' },
  entertainment: { url: 'https://thewaltdisneycompany.com/press-releases/the-walt-disney-company-sets-leadership-team-for-expanded-disney-entertainment-segment/', title: 'The Walt Disney Company Sets Leadership Team for Expanded Disney Entertainment Segment', published: '2026-03-16' },
  about: { url: 'https://thewaltdisneycompany.com/about/', title: 'The Walt Disney Company: About, Executive Leadership', published: null },
  lucasLeaders: { url: 'https://www.lucasfilm.com/who-we-are/leadership-team/', title: 'Lucasfilm Leadership', published: null },
  lucasChange: { url: 'https://www.starwars.com/news/lucasfilm-leadership', title: 'Lucasfilm and The Walt Disney Studios Announce Leadership Transition', published: '2026-01-15' },
  pixarLeaders: { url: 'https://www.pixar.com/leaders', title: 'Pixar Animation Studios: Leaders', published: null },
  wdas: { url: 'https://thewaltdisneycompany.com/news/jared-bush-walt-disney-animation-studios/', title: 'Jared Bush Named Chief Creative Officer of Walt Disney Animation Studios', published: '2024-09-19' },
  feige: { url: 'https://thewaltdisneycompany.com/news/deadpool-and-wolverine-kevin-feige/', title: 'Marvel Studios President Kevin Feige on Deadpool & Wolverine', published: '2024-07-25' },
} satisfies Record<string, Source>;

/** When the registry was researched: TMDB IDs checked, leadership pages read. */
export const REGISTRY_CHECKED = '2026-11-10';

const TWDC = 'company:the-walt-disney-company';
const STUDIOS = 'company:the-walt-disney-studios';
const owned = (how: 'division', id = STUDIOS) => ({ id, how, from: null, source: null });
const bought = (source: Source, from: string) => ({ id: TWDC, how: 'acquired' as const, from, source });
const tm = (id: number, name: string, country: string, headquarters: string) => ({ id, name, country, headquarters });

export const COMPANIES: CompanyRecord[] = [
  { id: TWDC, name: 'The Walt Disney Company', kind: 'corporate', roles: ['holding'], tmdb: null, website: 'https://thewaltdisneycompany.com', parent: null,
    related: [{ id: 'company:walt-disney-productions', relation: 'Its earlier name (when it changed is not recorded here)' }], notes: ['TMDB credits no titles to The Walt Disney Company itself; its studios and labels are credited.'] },
  { id: STUDIOS, name: 'The Walt Disney Studios', kind: 'film', roles: ['production', 'distribution'], tmdb: tm(109755, 'The Walt Disney Studios', 'US', 'Burbank, California'), website: 'https://www.disneystudios.com', parent: owned('division', TWDC), related: [], notes: [] },
  { id: 'company:walt-disney-productions', name: 'Walt Disney Productions', kind: 'film', roles: ['production'], tmdb: tm(3166, 'Walt Disney Productions', 'US', 'Burbank, California'), website: null, parent: owned('division', TWDC),
    related: [{ id: TWDC, relation: 'Later named The Walt Disney Company (the date is not recorded here)' }], notes: ['The company itself, under its earlier name: titles credited to it are credited as such.'] },
  { id: 'company:walt-disney-pictures', name: 'Walt Disney Pictures', kind: 'film', roles: ['production'], tmdb: tm(2, 'Walt Disney Pictures', 'US', 'Burbank, California'), website: 'https://movies.disney.com', parent: owned('division'), related: [], notes: [] },
  { id: 'company:walt-disney-animation-studios', name: 'Walt Disney Animation Studios', kind: 'film', roles: ['production'], tmdb: tm(6125, 'Walt Disney Animation Studios', 'US', 'Burbank, California'), website: 'https://www.disneyanimation.com/', parent: owned('division'),
    related: [{ id: 'company:walt-disney-animation-studios-vancouver', relation: 'Its Vancouver studio, a separate TMDB record' }], notes: [] },
  { id: 'company:walt-disney-animation-studios-vancouver', name: 'Walt Disney Animation Studios (Vancouver)', kind: 'film', roles: ['production'], tmdb: tm(158526, 'Walt Disney Animation Studios', 'CA', 'Vancouver, British Columbia'), website: null, parent: owned('division'),
    related: [{ id: 'company:walt-disney-animation-studios', relation: 'Part of Walt Disney Animation Studios' }], notes: ['TMDB keeps the Vancouver studio as its own record under the same name.'] },
  { id: 'company:pixar', name: 'Pixar', kind: 'film', roles: ['production'], tmdb: tm(3, 'Pixar', 'US', 'Emeryville, California'), website: 'https://www.pixar.com', parent: bought(S.pixar, '2006-05-05'), related: [], notes: ['Titles Pixar made before May 5, 2006 were made before Disney owned it; Disney distributed many of them.'] },
  { id: 'company:marvel-studios', name: 'Marvel Studios', kind: 'film', roles: ['production'], tmdb: tm(420, 'Marvel Studios', 'US', 'Burbank, California'), website: 'https://www.marvel.com/movies', parent: bought(S.marvel, '2009-12-31'), related: [], notes: ['Disney acquired Marvel Entertainment, its parent, on December 31, 2009. Earlier Marvel Studios titles were made before that.'] },
  { id: 'company:lucasfilm', name: 'Lucasfilm', kind: 'film', roles: ['production'], tmdb: tm(1, 'Lucasfilm Ltd.', 'US', 'San Francisco, California'), website: 'https://www.lucasfilm.com', parent: bought(S.lucasfilm, '2012-12-21'), related: [{ id: 'company:lucasfilm-animation', relation: 'Its animation studio' }], notes: ['Titles made before December 21, 2012 were made before Disney owned Lucasfilm.'] },
  { id: 'company:20th-century-studios', name: '20th Century Studios', kind: 'film', roles: ['production'], tmdb: tm(127928, '20th Century Studios', 'US', 'Los Angeles, California'), website: 'https://www.20thcenturystudios.com', parent: bought(S.fox, '2019-03-20'),
    related: [{ id: 'company:20th-century-fox', relation: 'Its earlier name, a separate TMDB record' }], notes: [] },
  { id: 'company:20th-century-fox', name: '20th Century Fox', kind: 'film', roles: ['production'], tmdb: tm(25, '20th Century Fox', 'US', 'Century City, California'), website: null, parent: bought(S.fox, '2019-03-20'),
    related: [{ id: 'company:20th-century-studios', relation: 'Renamed 20th Century Studios (the date is not recorded here)' }], notes: ['Almost all of its titles were made before Disney acquired it on March 20, 2019. They are credited to 20th Century Fox, not to Disney.'] },
  { id: 'company:searchlight-pictures', name: 'Searchlight Pictures', kind: 'film', roles: ['production'], tmdb: tm(127929, 'Searchlight Pictures', 'US', 'Burbank, California'), website: 'https://www.searchlightpictures.com', parent: bought(S.fox, '2019-03-20'),
    related: [{ id: 'company:fox-searchlight-pictures', relation: 'Its earlier name, a separate TMDB record' }], notes: [] },
  { id: 'company:fox-searchlight-pictures', name: 'Fox Searchlight Pictures', kind: 'film', roles: ['production'], tmdb: tm(43, 'Fox Searchlight Pictures', 'US', 'Los Angeles, California'), website: null, parent: bought(S.fox, '2019-03-20'),
    related: [{ id: 'company:searchlight-pictures', relation: 'Renamed Searchlight Pictures (the date is not recorded here)' }], notes: ['Titles from before March 20, 2019 were made before Disney owned it.'] },
  { id: 'company:touchstone-pictures', name: 'Touchstone Pictures', kind: 'film', roles: ['production'], tmdb: tm(9195, 'Touchstone Pictures', 'US', 'Burbank, California'), website: null, parent: owned('division'), related: [], notes: [] },
  { id: 'company:hollywood-pictures', name: 'Hollywood Pictures', kind: 'film', roles: ['production'], tmdb: tm(915, 'Hollywood Pictures', 'US', 'Burbank, California'), website: null, parent: owned('division'), related: [], notes: [] },
  { id: 'company:disneynature', name: 'Disneynature', kind: 'film', roles: ['production'], tmdb: tm(4436, 'Disneynature', 'FR', 'Paris'), website: 'http://nature.disney.com', parent: owned('division'), related: [], notes: [] },
  { id: 'company:blue-sky-studios', name: 'Blue Sky Studios', kind: 'film', roles: ['production'], tmdb: tm(9383, 'Blue Sky Studios', 'US', 'Greenwich, Connecticut'), website: null, parent: bought(S.fox, '2019-03-20'), related: [], notes: ['Acquired with 21st Century Fox; its films before March 20, 2019 were made under Fox. The studio has since closed (the date is not recorded here).'] },
  { id: 'company:disney-television-animation', name: 'Disney Television Animation', kind: 'television', roles: ['production'], tmdb: tm(3475, 'Disney Television Animation', 'US', 'Glendale, California'), website: null, parent: owned('division', TWDC), related: [], notes: [] },
  { id: 'company:walt-disney-television', name: 'Walt Disney Television', kind: 'television', roles: ['production'], tmdb: tm(670, 'Walt Disney Television', 'US', 'Burbank, California'), website: null, parent: owned('division', TWDC), related: [], notes: ['TMDB lists Walt Disney Pictures as its parent record.'] },
  { id: 'company:disney-branded-television', name: 'Disney Branded Television', kind: 'television', roles: ['production'], tmdb: tm(241784, 'Disney Branded Television', 'US', 'Burbank, California'), website: null, parent: owned('division', TWDC), related: [], notes: [] },
  { id: 'company:abc-signature', name: 'ABC Signature', kind: 'television', roles: ['production'], tmdb: tm(236613, 'ABC Signature', 'US', 'Burbank, California'), website: null, parent: owned('division', TWDC),
    related: [{ id: 'company:abc-studios', relation: 'An earlier Disney studio name, a separate TMDB record' }, { id: 'company:abc-signature-studios', relation: 'A separate TMDB record of a similar name' }], notes: [] },
  { id: 'company:abc-studios', name: 'ABC Studios', kind: 'television', roles: ['production'], tmdb: tm(19366, 'ABC Studios', 'US', ''), website: null, parent: owned('division', TWDC), related: [{ id: 'company:abc-signature', relation: 'A later Disney studio name' }], notes: [] },
  { id: 'company:abc-signature-studios', name: 'ABC Signature Studios', kind: 'television', roles: ['production'], tmdb: tm(76871, 'ABC Signature Studios', 'US', 'Burbank, California'), website: null, parent: owned('division', TWDC), related: [], notes: [] },
  { id: 'company:touchstone-television', name: 'Touchstone Television', kind: 'television', roles: ['production'], tmdb: tm(1558, 'Touchstone Television', 'US', ''), website: null, parent: owned('division', TWDC), related: [],
    notes: ['TMDB has a second Touchstone Television record (141822, Los Angeles), with one title. Which company each stands for is not settled here, so only this one is covered.'] },
  { id: 'company:20th-century-fox-television', name: '20th Century Fox Television', kind: 'television', roles: ['production'], tmdb: tm(1556, '20th Century Fox Television', 'US', 'Los Angeles, California'), website: 'https://20thtv.com', parent: bought(S.fox, '2019-03-20'),
    related: [{ id: 'company:20th-television', relation: 'Its later name, a separate TMDB record (the date is not recorded here)' }], notes: ['Its series before March 20, 2019 were made under Fox.'] },
  { id: 'company:20th-television', name: '20th Television', kind: 'television', roles: ['production'], tmdb: tm(236166, '20th Television', 'US', 'Los Angeles, California'), website: null, parent: bought(S.fox, '2019-03-20'),
    related: [{ id: 'company:20th-century-fox-television', relation: 'Its earlier name' }], notes: ['TMDB has an older 20th Television record (21659) with 8 series. Which company it stands for is not settled here, so it isn\'t covered.'] },
  { id: 'company:20th-television-animation', name: '20th Television Animation', kind: 'television', roles: ['production'], tmdb: tm(154887, '20th Television Animation', 'US', 'Los Angeles, California'), website: null, parent: bought(S.fox, '2019-03-20'), related: [], notes: [] },
  { id: 'company:fx-productions', name: 'FX Productions', kind: 'television', roles: ['production'], tmdb: tm(15990, 'FX Productions', 'US', 'Burbank, California'), website: null, parent: bought(S.fox, '2019-03-20'), related: [], notes: ['Its series before March 20, 2019 were made under Fox.'] },
  { id: 'company:fox-21-television-studios', name: 'Fox 21 Television Studios', kind: 'television', roles: ['production'], tmdb: tm(86063, 'Fox 21 Television Studios', 'US', 'Los Angeles, California'), website: null, parent: bought(S.fox, '2019-03-20'), related: [], notes: ['Its series before March 20, 2019 were made under Fox.'] },
  { id: 'company:marvel-television', name: 'Marvel Television', kind: 'television', roles: ['production'], tmdb: tm(38679, 'Marvel Television', 'US', 'Burbank, California'), website: null, parent: bought(S.marvel, '2009-12-31'), related: [], notes: [] },
  { id: 'company:marvel-animation', name: 'Marvel Animation', kind: 'television', roles: ['production'], tmdb: tm(13252, 'Marvel Animation', 'US', 'Glendale, California'), website: null, parent: bought(S.marvel, '2009-12-31'), related: [], notes: [] },
  { id: 'company:lucasfilm-animation', name: 'Lucasfilm Animation', kind: 'television', roles: ['production'], tmdb: tm(108270, 'Lucasfilm Animation', 'US', 'San Francisco, California'), website: 'https://www.lucasfilm.com/what-we-do/animation', parent: bought(S.lucasfilm, '2012-12-21'), related: [{ id: 'company:lucasfilm', relation: 'Part of Lucasfilm' }], notes: [] },
  { id: 'company:its-a-laugh-productions', name: "It's a Laugh Productions", kind: 'television', roles: ['production'], tmdb: tm(3812, "It's a Laugh Productions", 'US', 'Los Angeles, California'), website: null, parent: owned('division', TWDC), related: [], notes: [] },
  // Networks and services: where titles air or stream, which is not who made them. No titles are gathered for these.
  { id: 'company:disney-plus', name: 'Disney+', kind: 'network', roles: ['streaming'], tmdb: null, website: 'https://www.disneyplus.com', parent: owned('division', TWDC), related: [], notes: ['A title being on Disney+ does not make it a Disney production.'] },
  { id: 'company:hulu', name: 'Hulu', kind: 'network', roles: ['streaming'], tmdb: null, website: 'https://www.hulu.com', parent: owned('division', TWDC), related: [], notes: ['A title being on Hulu does not make it a Disney production.'] },
  { id: 'company:abc', name: 'ABC', kind: 'network', roles: ['network'], tmdb: null, website: 'https://abc.com', parent: owned('division', TWDC), related: [], notes: ['A series airing on ABC does not make it a Disney production.'] },
  { id: 'company:disney-channel', name: 'Disney Channel', kind: 'network', roles: ['network'], tmdb: null, website: 'https://disneynow.com', parent: owned('division', TWDC), related: [], notes: [] },
  { id: 'company:fx', name: 'FX', kind: 'network', roles: ['network'], tmdb: null, website: 'https://www.fxnetworks.com', parent: bought(S.fox, '2019-03-20'), related: [], notes: ['FX the network is separate from FX Productions, which makes series for it and others.'] },
];

export interface LeadershipRole {
  /** Stable person ID for executives: exec:<slug>. */
  personId: string;
  name: string;
  /** The position exactly as the source writes it. */
  title: string;
  companyId: string;
  /** When the role began, as the source states it (a year alone where that is all it gives), or null where it doesn't. */
  start: string | null;
  /** When it ended, or is planned to end; null if open. */
  end: string | null;
  /** When it was announced, if before it began. */
  announced: string | null;
  /** When a departure was announced without an effective date. */
  endAnnounced: string | null;
  sources: Source[];
}

const role = (personId: string, name: string, companyId: string, title: string, sources: Source[], d: Partial<Pick<LeadershipRole, 'start' | 'end' | 'announced' | 'endAnnounced'>> = {}): LeadershipRole =>
  ({ personId, name, title, companyId, start: d.start ?? null, end: d.end ?? null, announced: d.announced ?? null, endAnnounced: d.endAnnounced ?? null, sources });

export const LEADERSHIP: LeadershipRole[] = [
  role('exec:robert-a-iger', 'Robert A. Iger', TWDC, 'Chief Executive Officer', [S.ceo], { end: '2026-03-18' }),
  role('exec:robert-a-iger', 'Robert A. Iger', TWDC, 'Senior Advisor, The Walt Disney Company', [S.ceo, S.about], { start: '2026-03-18', end: '2026-12-31', announced: '2026-02-03' }),
  role('exec:josh-damaro', "Josh D'Amaro", TWDC, 'Chairman, Disney Experiences', [S.ceo], { end: '2026-03-18' }),
  role('exec:josh-damaro', "Josh D'Amaro", TWDC, 'Chief Executive Officer, The Walt Disney Company', [S.ceo, S.about], { start: '2026-03-18', announced: '2026-02-03' }),
  role('exec:dana-walden', 'Dana Walden', TWDC, 'Co-Chairman, Disney Entertainment', [S.ceo], { end: '2026-03-18' }),
  role('exec:dana-walden', 'Dana Walden', TWDC, 'President and Chief Creative Officer, The Walt Disney Company', [S.ceo, S.entertainment, S.about], { start: '2026-03-18', announced: '2026-02-03' }),
  role('exec:hugh-johnston', 'Hugh Johnston', TWDC, 'Senior Executive Vice President & Chief Financial Officer, The Walt Disney Company', [S.about]),
  role('exec:alan-bergman', 'Alan Bergman', STUDIOS, 'Chairman, Disney Entertainment, Studios, The Walt Disney Company', [S.entertainment, S.about]),
  role('exec:debra-oconnell', 'Debra OConnell', TWDC, 'Chairman, Disney Entertainment Television, The Walt Disney Company', [S.entertainment, S.about], { announced: '2026-03-16' }),
  role('exec:thomas-mazloum', 'Thomas Mazloum', TWDC, 'Chairman, Disney Experiences, The Walt Disney Company', [S.about]),
  role('exec:asad-ayaz', 'Asad Ayaz', TWDC, 'Chief Marketing and Brand Officer, The Walt Disney Company', [S.entertainment, S.about]),
  role('exec:dave-filoni', 'Dave Filoni', 'company:lucasfilm', 'President and Chief Creative Officer', [S.lucasChange, S.lucasLeaders], { announced: '2026-01-15' }),
  role('exec:lynwen-brennan', 'Lynwen Brennan', 'company:lucasfilm', 'Co-President', [S.lucasChange, S.lucasLeaders], { announced: '2026-01-15' }),
  role('exec:kathleen-kennedy', 'Kathleen Kennedy', 'company:lucasfilm', 'President', [S.lucasChange], { start: '2012', endAnnounced: '2026-01-15' }),
  role('exec:jim-morris', 'Jim Morris', 'company:pixar', 'President', [S.pixarLeaders]),
  role('exec:pete-docter', 'Pete Docter', 'company:pixar', 'Chief Creative Officer', [S.pixarLeaders]),
  role('exec:jonathan-garson', 'Jonathan Garson', 'company:pixar', 'General Manager', [S.pixarLeaders]),
  role('exec:clark-spencer', 'Clark Spencer', 'company:walt-disney-animation-studios', 'President, Walt Disney Animation Studios', [S.wdas]),
  role('exec:jared-bush', 'Jared Bush', 'company:walt-disney-animation-studios', 'Chief Creative Officer (CCO) of Walt Disney Animation Studios', [S.wdas], { start: '2024-09-19' }),
  role('exec:jennifer-lee', 'Jennifer Lee', 'company:walt-disney-animation-studios', 'Chief Creative Officer', [S.wdas], { end: '2024-09-19' }),
  role('exec:kevin-feige', 'Kevin Feige', 'company:marvel-studios', 'Producer and President, Marvel Studios', [S.feige]),
];

/** Companies whose leadership couldn't be confirmed from a current official source, and why. Shown on their pages. */
export const LEADERSHIP_GAPS: Record<string, string> = {
  'company:20th-century-studios': "Official sources found on November 10, 2026 named different people at the head of 20th Century Studios, and none was dated recently enough to settle it, so no leadership is listed.",
  'company:searchlight-pictures': 'No current official source for Searchlight Pictures\' leadership was found on November 10, 2026, so none is listed.',
  'company:walt-disney-pictures': 'No current official source for Walt Disney Pictures\' own leadership was found on November 10, 2026, so none is listed.',
};

export const company = (id: string) => COMPANIES.find((c) => c.id === id);
export const companyByTmdb = (tmdbId: number) => COMPANIES.find((c) => c.tmdb?.id === tmdbId);
/** Companies whose credited titles are gathered: every record with a TMDB ID. */
export const DISCOVERED = COMPANIES.filter((c) => c.tmdb && c.kind !== 'network');
