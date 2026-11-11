// The companies the catalog covers, and their leadership: The Walt Disney Company's, researched November 10, 2026, and
// NBCUniversal's (Comcast's), researched November 11, 2026 (docs/CATALOG.md).
//
// Each entry is one company record as TMDB holds it: its TMDB ID was found by search and checked against the company's
// own TMDB details (name, country, headquarters) that day, never guessed. A credited name stays as credited: 20th Century
// Fox and 20th Century Studios are two records, because TMDB credits titles to the name a company had at the time, and
// a film credited to 20th Century Fox in 1997 wasn't a Disney production. Ownership is the relationship to the company's
// group (The Walt Disney Company, or Comcast through NBCUniversal), with a date only where an official source gives one.
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
  /** Its place in its group (groupOf): The Walt Disney Company, or Comcast through NBCUniversal. */
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
  comcastTimeline: { url: 'https://corporate.comcast.com/press/timeline', title: 'Comcast Corporation: Company Timeline (NBCUniversal formed January 28, 2011; GE\'s 49% acquired March 19, 2013)', published: null },
  dreamworks: { url: 'https://www.sec.gov/Archives/edgar/data/0001166691/000119312516747958/Financial_Report.xlsx', title: 'Comcast Corporation, Form 10-Q, quarter ended September 30, 2016 (DreamWorks Animation acquired August 22, 2016)', published: '2016-10-27' },
  versant: { url: 'https://www.newscaststudio.com/2026/01/05/versant-ipo/', title: 'Comcast completes Versant spinoff with IPO', published: '2026-01-05' },
  nbcuSpin: { url: 'https://www.sec.gov/Archives/edgar/data/0001166691/000095010326009591/dp249094_ex9901.htm', title: 'Comcast Corporation, Form 8-K, Exhibit 99.1: Comcast to separate NBCUniversal and Sky (announced June 29, 2026)', published: '2026-06-29' },
  nbcuLeaders: { url: 'https://www.nbcuniversal.com/leadership', title: 'NBCUniversal: Leadership', published: null },
  cinemacon: { url: 'https://www.nbcuniversal.com/article/christopher-nolan-steven-spielberg-and-chris-meledandri-lead-nbcuniversals-2026-cinemacon-showcase', title: "Christopher Nolan, Steven Spielberg, and Chris Meledandri Lead NBCUniversal's 2026 CinemaCon Showcase", published: '2026-04' },
} satisfies Record<string, Source>;

/** When the registry was researched: TMDB IDs checked, leadership pages read. Disney's companies, November 10, 2026. */
export const REGISTRY_CHECKED = '2026-11-10';
/** NBCUniversal's companies were researched a day later, when the owner asked for Universal. */
export const REGISTRY_CHECKED_NBCU = '2026-11-11';

const TWDC = 'company:the-walt-disney-company';
const STUDIOS = 'company:the-walt-disney-studios';
const owned = (how: 'division', id = STUDIOS) => ({ id, how, from: null, source: null });
const bought = (source: Source, from: string) => ({ id: TWDC, how: 'acquired' as const, from, source });
const tm = (id: number, name: string, country: string, headquarters: string) => ({ id, name, country, headquarters });
const COMCAST = 'company:comcast';
const NBCU = 'company:nbcuniversal';
const nbcu = (how: 'division' = 'division') => ({ id: NBCU, how, from: null, source: null });
const dwa = () => ({ id: NBCU, how: 'acquired' as const, from: '2016-08-22', source: S.dreamworks });

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
  { id: 'company:pixar', name: 'Pixar', kind: 'film', roles: ['production'], tmdb: tm(3, 'Pixar', 'US', 'Emeryville, California'), website: 'https://www.pixar.com', parent: bought(S.pixar, '2006-05-05'), related: [], notes: ['Titles Pixar released before May 5, 2006 came out before Disney owned it; Disney distributed many of them.'] },
  { id: 'company:marvel-studios', name: 'Marvel Studios', kind: 'film', roles: ['production'], tmdb: tm(420, 'Marvel Studios', 'US', 'Burbank, California'), website: 'https://www.marvel.com/movies', parent: bought(S.marvel, '2009-12-31'), related: [], notes: ['Disney acquired Marvel Entertainment, its parent, on December 31, 2009. Marvel Studios titles released earlier came out before that.'] },
  { id: 'company:lucasfilm', name: 'Lucasfilm', kind: 'film', roles: ['production'], tmdb: tm(1, 'Lucasfilm Ltd.', 'US', 'San Francisco, California'), website: 'https://www.lucasfilm.com', parent: bought(S.lucasfilm, '2012-12-21'), related: [{ id: 'company:lucasfilm-animation', relation: 'Its animation studio' }], notes: ['Titles released before December 21, 2012 came out before Disney owned Lucasfilm.'] },
  { id: 'company:20th-century-studios', name: '20th Century Studios', kind: 'film', roles: ['production'], tmdb: tm(127928, '20th Century Studios', 'US', 'Los Angeles, California'), website: 'https://www.20thcenturystudios.com', parent: bought(S.fox, '2019-03-20'),
    related: [{ id: 'company:20th-century-fox', relation: 'Its earlier name, a separate TMDB record' }], notes: [] },
  { id: 'company:20th-century-fox', name: '20th Century Fox', kind: 'film', roles: ['production'], tmdb: tm(25, '20th Century Fox', 'US', 'Century City, California'), website: null, parent: bought(S.fox, '2019-03-20'),
    related: [{ id: 'company:20th-century-studios', relation: 'Renamed 20th Century Studios (the date is not recorded here)' }], notes: ['Almost all of its titles were released before Disney acquired it on March 20, 2019. They are credited to 20th Century Fox, not to Disney.'] },
  { id: 'company:searchlight-pictures', name: 'Searchlight Pictures', kind: 'film', roles: ['production'], tmdb: tm(127929, 'Searchlight Pictures', 'US', 'Burbank, California'), website: 'https://www.searchlightpictures.com', parent: bought(S.fox, '2019-03-20'),
    related: [{ id: 'company:fox-searchlight-pictures', relation: 'Its earlier name, a separate TMDB record' }], notes: [] },
  { id: 'company:fox-searchlight-pictures', name: 'Fox Searchlight Pictures', kind: 'film', roles: ['production'], tmdb: tm(43, 'Fox Searchlight Pictures', 'US', 'Los Angeles, California'), website: null, parent: bought(S.fox, '2019-03-20'),
    related: [{ id: 'company:searchlight-pictures', relation: 'Renamed Searchlight Pictures (the date is not recorded here)' }], notes: ['Titles released before March 20, 2019 came out before Disney owned it.'] },
  { id: 'company:touchstone-pictures', name: 'Touchstone Pictures', kind: 'film', roles: ['production'], tmdb: tm(9195, 'Touchstone Pictures', 'US', 'Burbank, California'), website: null, parent: owned('division'), related: [], notes: [] },
  { id: 'company:hollywood-pictures', name: 'Hollywood Pictures', kind: 'film', roles: ['production'], tmdb: tm(915, 'Hollywood Pictures', 'US', 'Burbank, California'), website: null, parent: owned('division'), related: [], notes: [] },
  { id: 'company:disneynature', name: 'Disneynature', kind: 'film', roles: ['production'], tmdb: tm(4436, 'Disneynature', 'FR', 'Paris'), website: 'http://nature.disney.com', parent: owned('division'), related: [], notes: [] },
  { id: 'company:blue-sky-studios', name: 'Blue Sky Studios', kind: 'film', roles: ['production'], tmdb: tm(9383, 'Blue Sky Studios', 'US', 'Greenwich, Connecticut'), website: null, parent: bought(S.fox, '2019-03-20'), related: [], notes: ['Acquired with 21st Century Fox; its films released before March 20, 2019 came out under Fox. The studio has since closed (the date is not recorded here).'] },
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
    related: [{ id: 'company:20th-television', relation: 'Its later name, a separate TMDB record (the date is not recorded here)' }], notes: ['Its series that premiered before March 20, 2019 began under Fox.'] },
  { id: 'company:20th-television', name: '20th Television', kind: 'television', roles: ['production'], tmdb: tm(236166, '20th Television', 'US', 'Los Angeles, California'), website: null, parent: bought(S.fox, '2019-03-20'),
    related: [{ id: 'company:20th-century-fox-television', relation: 'Its earlier name' }], notes: ['TMDB has an older 20th Television record (21659) with 8 series. Which company it stands for is not settled here, so it isn\'t covered.'] },
  { id: 'company:20th-television-animation', name: '20th Television Animation', kind: 'television', roles: ['production'], tmdb: tm(154887, '20th Television Animation', 'US', 'Los Angeles, California'), website: null, parent: bought(S.fox, '2019-03-20'), related: [], notes: [] },
  { id: 'company:fx-productions', name: 'FX Productions', kind: 'television', roles: ['production'], tmdb: tm(15990, 'FX Productions', 'US', 'Burbank, California'), website: null, parent: bought(S.fox, '2019-03-20'), related: [], notes: ['Its series that premiered before March 20, 2019 began under Fox.'] },
  { id: 'company:fox-21-television-studios', name: 'Fox 21 Television Studios', kind: 'television', roles: ['production'], tmdb: tm(86063, 'Fox 21 Television Studios', 'US', 'Los Angeles, California'), website: null, parent: bought(S.fox, '2019-03-20'), related: [], notes: ['Its series that premiered before March 20, 2019 began under Fox.'] },
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

  // NBCUniversal (November 11, 2026). TMDB IDs found by search and checked against each company's TMDB details that day.
  { id: COMCAST, name: 'Comcast', kind: 'corporate', roles: ['holding'], tmdb: null, website: 'https://corporate.comcast.com', parent: null, related: [],
    notes: ['On June 29, 2026 Comcast announced it would separate NBCUniversal and Sky into a company of their own, expected in mid-2027; until it happens, NBCUniversal is part of Comcast.'] },
  { id: NBCU, name: 'NBCUniversal', kind: 'corporate', roles: ['holding'], tmdb: null, website: 'https://www.nbcuniversal.com', parent: { id: COMCAST, how: 'acquired', from: '2011-01-28', source: S.comcastTimeline }, related: [],
    notes: ['Comcast took control of NBCUniversal on January 28, 2011 and bought the rest from GE on March 19, 2013. Titles released before January 28, 2011 came out before Comcast owned it.',
      'Most of its cable networks (USA Network, Syfy, E!, CNBC, MS NOW, Oxygen, Golf Channel) left for Versant Media on January 2, 2026; NBC, Telemundo, Bravo and Peacock stayed.',
      'TMDB has a company record for NBCUniversal (26559); titles are gathered from its studios rather than from it.'] },
  { id: 'company:universal-pictures', name: 'Universal Pictures', kind: 'film', roles: ['production', 'distribution'], tmdb: tm(33, 'Universal Pictures', 'US', 'Universal City, California'), website: 'https://www.universalpictures.com', parent: nbcu(), related: [], notes: [] },
  { id: 'company:focus-features', name: 'Focus Features', kind: 'film', roles: ['production', 'distribution'], tmdb: tm(10146, 'Focus Features', 'US', 'Universal City, California'), website: 'https://www.focusfeatures.com', parent: nbcu(), related: [], notes: [] },
  { id: 'company:illumination', name: 'Illumination', kind: 'film', roles: ['production'], tmdb: tm(6704, 'Illumination', 'US', 'Santa Monica, California'), website: 'https://www.illumination.com', parent: null,
    related: [{ id: 'company:universal-pictures', relation: 'Releases its films' }], notes: ["Its films are released by Universal Pictures; who owns it isn't recorded here, as no official source for that was found on November 11, 2026."] },
  { id: 'company:dreamworks-animation', name: 'DreamWorks Animation', kind: 'film', roles: ['production'], tmdb: tm(521, 'DreamWorks Animation', 'US', 'Glendale, California'), website: 'https://www.dreamworks.com', parent: dwa(), related: [{ id: 'company:dreamworks-animation-television', relation: 'Its television studio' }],
    notes: ['Titles released before August 22, 2016 came out before NBCUniversal owned DreamWorks Animation.'] },
  { id: 'company:working-title', name: 'Working Title', kind: 'film', roles: ['production'], tmdb: tm(10163, 'Working Title', 'GB', 'London, England'), website: 'https://www.workingtitlefilms.com', parent: null,
    related: [{ id: 'company:universal-pictures', relation: 'Releases most of its films' }], notes: ["Who owns it isn't recorded here, as no official source for that was found on November 11, 2026."] },
  { id: 'company:universal-animation-studios', name: 'Universal Animation Studios', kind: 'film', roles: ['production'], tmdb: tm(5556, 'Universal Animation Studios', 'US', 'Glendale, California'), website: null, parent: nbcu(), related: [], notes: [] },
  { id: 'company:universal-television', name: 'Universal Television', kind: 'television', roles: ['production'], tmdb: tm(26727, 'Universal Television', 'US', ''), website: 'https://www.nbcuniversal.com/business/universal-television', parent: nbcu(), related: [], notes: [] },
  { id: 'company:ucp', name: 'UCP', kind: 'television', roles: ['production'], tmdb: tm(7938, 'UCP', 'US', 'Universal City, California'), website: null, parent: nbcu(), related: [], notes: [] },
  { id: 'company:universal-international-studios', name: 'Universal International Studios', kind: 'television', roles: ['production'], tmdb: tm(87455, 'Universal International Studios', 'GB', ''), website: null, parent: nbcu(), related: [], notes: [] },
  { id: 'company:dreamworks-animation-television', name: 'DreamWorks Animation Television', kind: 'television', roles: ['production'], tmdb: tm(42141, 'DreamWorks Animation Television', 'US', 'Glendale, California'), website: 'https://www.dreamworks.com/shows', parent: dwa(),
    related: [{ id: 'company:dreamworks-animation', relation: 'Part of DreamWorks Animation' }], notes: ['Its series that premiered before August 22, 2016 began before NBCUniversal owned it.'] },
  { id: 'company:nbc', name: 'NBC', kind: 'network', roles: ['network'], tmdb: null, website: 'https://www.nbc.com', parent: nbcu(), related: [], notes: ['A series airing on NBC does not make it an NBCUniversal production.'] },
  { id: 'company:peacock', name: 'Peacock', kind: 'network', roles: ['streaming'], tmdb: null, website: 'https://www.peacocktv.com', parent: nbcu(), related: [], notes: ['A title being on Peacock does not make it an NBCUniversal production.'] },
  { id: 'company:bravo', name: 'Bravo', kind: 'network', roles: ['network'], tmdb: null, website: 'https://www.bravotv.com', parent: nbcu(), related: [], notes: [] },
  { id: 'company:telemundo', name: 'Telemundo', kind: 'network', roles: ['network'], tmdb: null, website: 'https://www.telemundo.com', parent: nbcu(), related: [], notes: [] },
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
  /** It begins on an event its sources give no date for, so it stays announced, not begun, at any date. */
  undated?: boolean;
  sources: Source[];
}

const role = (personId: string, name: string, companyId: string, title: string, sources: Source[], d: Partial<Pick<LeadershipRole, 'start' | 'end' | 'announced' | 'endAnnounced' | 'undated'>> = {}): LeadershipRole =>
  ({ personId, name, title, companyId, start: d.start ?? null, end: d.end ?? null, announced: d.announced ?? null, endAnnounced: d.endAnnounced ?? null, ...(d.undated ? { undated: true } : {}), sources });

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
  // NBCUniversal's, from its leadership page as it stood on November 11, 2026.
  role('exec:michael-j-cavanagh', 'Michael J. Cavanagh', COMCAST, 'Co-CEO, Comcast Corporation', [S.nbcuLeaders]),
  role('exec:michael-j-cavanagh', 'Michael J. Cavanagh', NBCU, 'Chief Executive Officer, NBCUniversal (once it is separated from Comcast)', [S.nbcuSpin], { announced: '2026-06-29', undated: true }),
  role('exec:donna-langley', 'Donna Langley', NBCU, 'Chairman, NBCUniversal Entertainment', [S.nbcuLeaders]),
  role('exec:pearlena-igbokwe', 'Pearlena Igbokwe', 'company:universal-television', 'Chairman, Television Studios, NBC Entertainment & Peacock Scripted', [S.nbcuLeaders]),
  role('exec:frances-berwick', 'Frances Berwick', 'company:peacock', 'Chairman, Bravo & Peacock Unscripted', [S.nbcuLeaders]),
  role('exec:luis-fernandez', 'Luis Fernández', 'company:telemundo', 'Chairman, NBCUniversal Telemundo Enterprises', [S.nbcuLeaders]),
  role('exec:chris-meledandri', 'Chris Meledandri', 'company:illumination', 'Founder and CEO', [S.cinemacon]),
];

/** Companies whose leadership couldn't be confirmed from a current official source, and why. Shown on their pages. */
export const LEADERSHIP_GAPS: Record<string, string> = {
  'company:20th-century-studios': "Official sources found on November 10, 2026 named different people at the head of 20th Century Studios, and none was dated recently enough to settle it, so no leadership is listed.",
  'company:searchlight-pictures': 'No current official source for Searchlight Pictures\' leadership was found on November 10, 2026, so none is listed.',
  'company:walt-disney-pictures': 'No current official source for Walt Disney Pictures\' own leadership was found on November 10, 2026, so none is listed.',
  'company:universal-pictures': "NBCUniversal's leadership page (read November 11, 2026) names no head of Universal Pictures itself, and no other current official source was found, so none is listed.",
  'company:focus-features': 'No current official source for Focus Features\' leadership was found on November 11, 2026, so none is listed.',
  'company:dreamworks-animation': 'No current official source for DreamWorks Animation\'s leadership was found on November 11, 2026, so none is listed.',
  'company:working-title': 'No current official source for Working Title\'s leadership was found on November 11, 2026, so none is listed.',
};

export const company = (id: string) => COMPANIES.find((c) => c.id === id);
export const companyByTmdb = (tmdbId: number) => COMPANIES.find((c) => c.tmdb?.id === tmdbId);
/**
 * When a company's record and leadership were read. Illumination and Working Title stand outside NBCUniversal (no official
 * source placed them in it) but were read with it.
 */
export function checkedFor(id: string): string {
  return groupOf(id)?.id === COMCAST || id === 'company:illumination' || id === 'company:working-title' ? REGISTRY_CHECKED_NBCU : REGISTRY_CHECKED;
}

/** The group a company belongs to: the top of its chain of parents (The Walt Disney Company, or Comcast), or itself. */
export function groupOf(id: string): CompanyRecord | undefined {
  let c = company(id);
  for (let i = 0; c?.parent && i < 6; i++) c = company(c.parent.id) ?? c;
  return c;
}
/**
 * When a company came into its group: the latest acquisition along its chain of parents (Pixar, 2006; Universal
 * Pictures, through NBCUniversal, 2011; DreamWorks Animation, 2016). Null where it was always the group's, or the date
 * isn't recorded.
 */
export function joinedGroup(id: string): { from: string; source: Source | null } | null {
  let out: { from: string; source: Source | null } | null = null;
  let c = company(id);
  for (let i = 0; c?.parent && i < 6; i++) {
    if (c.parent.how === 'acquired' && c.parent.from && (!out || c.parent.from > out.from)) out = { from: c.parent.from, source: c.parent.source };
    c = company(c.parent.id);
  }
  return out;
}

/** Companies whose credited titles are gathered: every record with a TMDB ID. */
export const DISCOVERED = COMPANIES.filter((c) => c.tmdb && c.kind !== 'network');
