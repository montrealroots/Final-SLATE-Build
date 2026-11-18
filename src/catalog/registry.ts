// The companies the catalog covers, and their leadership: The Walt Disney Company's, researched November 10, 2026;
// NBCUniversal's (Comcast's), researched November 11, 2026; and, the same day, Skydance's (Paramount's and Warner
// Bros.') and Sony's, for the Creative Depth package's milestone F (docs/CATALOG.md).
//
// Each entry is one company record as TMDB holds it: its TMDB ID was found by search and checked against the company's
// own TMDB details (name, country, headquarters) that day, never guessed. A credited name stays as credited: 20th Century
// Fox and 20th Century Studios are two records, because TMDB credits titles to the name a company had at the time, and
// a film credited to 20th Century Fox in 1997 wasn't a Disney production. Ownership is the relationship to the company's
// group (The Walt Disney Company, Comcast through NBCUniversal, Skydance, or Sony Group through Sony Pictures
// Entertainment), with a date only where an official source gives one. A group is who owns a company on the day the
// registry was read, not a claim about any earlier day: each acquisition's date says when that began.
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
  /** Its place in its group (groupOf): The Walt Disney Company, Comcast through NBCUniversal, Skydance, or Sony Group. */
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
  skyMerger: { url: 'https://www.sec.gov/Archives/edgar/data/2041610/000119312525175046/d841914d8k12b.htm', title: 'Paramount Skydance Corporation, Form 8-K12B (the business combination completed August 7, 2025; Skydance and Paramount each became its wholly owned subsidiaries)', published: '2025-08-07' },
  skyWbd: { url: 'https://www.skydance.com/news/press/paramount-completes-acquisition-of-warner-bros-discovery-creating-a-new-global-entertainment-leader-skydance', title: 'Paramount Completes Acquisition of Warner Bros. Discovery, Creating a New Global Entertainment Leader, Skydance', published: '2026-10-06' },
  skyLeaders: { url: 'https://www.skydance.com/about/leadership', title: 'Skydance: Leadership', published: null },
  sonyStructure: { url: 'https://www.sec.gov/Archives/edgar/data/313838/000110465925006885/tm254786d1_6k.htm', title: "Sony Group Corporation, Form 6-K: Sony Group's New Management Structure (as of April 1, 2025)", published: '2025-01-29' },
  // The other American studios and services, read on November 18, 2026 (the owner: "all the studios and their stuff").
  mgm: { url: 'https://www.aboutamazon.com/news/entertainment/mgm-joins-prime-video-and-amazon-studios', title: 'MGM joins Prime Video and Amazon Studios', published: '2022-03-17' },
  sTeam: { url: 'https://www.aboutamazon.com/news/workplace/amazon-s-team-members', title: "Amazon's S-team: Meet the members who make up our senior leadership team (updated August 1, 2026)", published: '2023-12-14' },
  starzSplit: { url: 'https://www.sec.gov/Archives/edgar/data/2052959/000119312525114482/d927789d8k12b.htm', title: 'Lionsgate Studios Corp., Form 8-K12B (Starz separated from the studio business on May 6, 2025)', published: '2025-05-07' },
  summit: { url: 'https://www.sec.gov/Archives/edgar/data/929351/000110465912002181/a12-2800_1ex99d1.htm', title: 'Lions Gate Entertainment Corp., Form 8-K, Exhibit 99.1: Lionsgate completes its acquisition of Summit Entertainment', published: '2012-01-13' },
  miramax: { url: 'https://www.sec.gov/Archives/edgar/data/813828/000081382820000022/viac10q-033120.htm', title: 'ViacomCBS Inc., Form 10-Q, quarter ended March 31, 2020 (a 49% interest in Miramax, bought in April 2020)', published: null },
  netflixLeaders: { url: 'https://ir.netflix.net/governance/leadership-and-directors/default.aspx', title: 'Netflix: Leadership & Directors (Officers)', published: null },
  appleLeaders: { url: 'https://www.apple.com/leadership/', title: 'Apple Leadership', published: null },
  appleVideo: { url: 'https://www.apple.com/uk/tv-pr/news/2026/06/apples-eddy-cue-honored-as-the-2026-entertainment-person-of-the-year/', title: "Apple's Eddy Cue honoured as the 2026 Entertainment Person of the Year", published: '2026-06-22' },
  legendary: { url: 'https://www.legendary.com/about/', title: 'Legendary: About (its film and television divisions)', published: null },
  // Europe's studios, read on November 18, 2026.
  constantin: { url: 'https://constantin.film/en/companies/constantin-film-ag/', title: 'Constantin Film AG (a subsidiary of Highlight Communications AG; its Executive Board)', published: null },
  film4: { url: 'https://film4productions.com/about', title: "About Film4 Productions (Channel 4 Television's feature film division)", published: null },
  // Asia's and Mexico's, read on November 18, 2026.
  toeiAnim: { url: 'https://corp.toei-anim.co.jp/en/company/history.html', title: 'Toei Animation: History (July 1956: Nichido Film purchased by Toei Co. and renamed Toei Doga)', published: null },
} satisfies Record<string, Source>;

/** When the registry was researched: TMDB IDs checked, leadership pages read. Disney's companies, November 10, 2026. */
export const REGISTRY_CHECKED = '2026-11-10';
/** NBCUniversal's companies were researched a day later, when the owner asked for Universal. */
export const REGISTRY_CHECKED_NBCU = '2026-11-11';
/** Skydance's and Sony's companies, the same day as NBCUniversal's, for the Creative Depth package. */
export const REGISTRY_CHECKED_F = '2026-11-11';
/** Amazon's, Lionsgate's, Netflix's and Apple's companies, the American independents and Europe's studios, read on November 18, 2026. */
export const REGISTRY_CHECKED_US = '2026-11-18';

const TWDC = 'company:the-walt-disney-company';
const STUDIOS = 'company:the-walt-disney-studios';
const owned = (how: 'division', id = STUDIOS) => ({ id, how, from: null, source: null });
const bought = (source: Source, from: string) => ({ id: TWDC, how: 'acquired' as const, from, source });
const tm = (id: number, name: string, country: string, headquarters: string) => ({ id, name, country, headquarters });
const COMCAST = 'company:comcast';
const NBCU = 'company:nbcuniversal';
const nbcu = (how: 'division' = 'division') => ({ id: NBCU, how, from: null, source: null });
const dwa = () => ({ id: NBCU, how: 'acquired' as const, from: '2016-08-22', source: S.dreamworks });
const SKY = 'company:skydance';
const SONY = 'company:sony-group';
const SPE = 'company:sony-pictures-entertainment';
/** Paramount's and Skydance Media's companies: under the combined company from August 7, 2025. */
const par = () => ({ id: SKY, how: 'acquired' as const, from: '2025-08-07', source: S.skyMerger });
/** Warner Bros. Discovery's companies: under it from October 6, 2026. */
const wbd = () => ({ id: SKY, how: 'acquired' as const, from: '2026-10-06', source: S.skyWbd });
const sony = () => ({ id: SPE, how: 'division' as const, from: null, source: null });
const LABEL = 'Placed here as a Warner Bros. label. No official source for when it became one was read on November 11, 2026; the date given is the day Skydance took over Warner Bros. Discovery.';
const PLABEL = 'Placed here as a Paramount label. No official source for when it became one was read on November 11, 2026; the date given is the day the combined company was formed.';
const SLABEL = "Placed here as a Sony Pictures label. When it became one isn't recorded: Sony's own pages refuse automated readers, and no other official source was read on November 11, 2026.";
const AMAZON = 'company:amazon';
const LIONSGATE = 'company:lionsgate-studios';
const NETFLIX = 'company:netflix-inc';
const APPLE = 'company:apple';
const LEGENDARY = 'company:legendary-entertainment';
const amz = () => ({ id: AMAZON, how: 'division' as const, from: null, source: null });
const mgmLabel = () => ({ id: 'company:metro-goldwyn-mayer', how: 'division' as const, from: null, source: null });
const MLABEL = "Placed here as an MGM label. No official source for when it became one was read on November 18, 2026; it came to Amazon with MGM on March 17, 2022.";
const lgs = () => ({ id: LIONSGATE, how: 'division' as const, from: null, source: S.starzSplit });
const nfx = () => ({ id: NETFLIX, how: 'division' as const, from: null, source: null });
const apl = () => ({ id: APPLE, how: 'division' as const, from: null, source: null });
const HIGHLIGHT = 'company:highlight-communications';
const CHANNEL4 = 'company:channel-4';
/** Its own page refused automated readers or named no owner on November 18, 2026, so it stands on its own here. */
const UNREAD = (owner: string) => `Reported as part of ${owner}, but no official source saying so could be read on November 18, 2026, so it stands on its own here.`;
type Kind = CompanyRecord['kind'];
const rec = (slug: string, name: string, kind: Kind, id: number, country: string, hq: string, parent: CompanyRecord['parent'], notes: string[] = [], related: CompanyRecord['related'] = []): CompanyRecord =>
  ({ id: `company:${slug}`, name, kind, roles: ['production'], tmdb: tm(id, name, country, hq), website: null, parent, related, notes });
const net = (slug: string, name: string, role: 'network' | 'streaming', website: string, parent: CompanyRecord['parent'], notes: string[] = []): CompanyRecord =>
  ({ id: `company:${slug}`, name, kind: 'network', roles: [role], tmdb: null, website, parent, related: [], notes });

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

  // Skydance: Paramount and Warner Bros. (November 11, 2026). TMDB IDs found by search and checked against each company's
  // TMDB details that day.
  { id: SKY, name: 'Skydance', kind: 'corporate', roles: ['holding'], tmdb: null, website: 'https://www.skydance.com', parent: null, related: [],
    notes: ['Named Paramount Skydance Corporation from August 7, 2025, when Paramount Global and Skydance Media were combined under it, until October 6, 2026, when it completed its purchase of Warner Bros. Discovery and took the name Skydance.',
      'A title credited to a Paramount label before August 7, 2025, or to a Warner Bros. label before October 6, 2026, came out before this company owned that label.',
      "Who owned Paramount's and Warner Bros.' labels before those days isn't recorded here."] },
  { ...rec('paramount-pictures', 'Paramount Pictures', 'film', 4, 'US', 'Hollywood, California', par(), ['TMDB lists Viacom International as its parent record.']), roles: ['production', 'distribution'], website: 'https://www.paramountpictures.com' },
  rec('paramount-animation', 'Paramount Animation', 'film', 24955, 'US', 'Los Angeles, California', par(), [PLABEL]),
  rec('paramount-players', 'Paramount Players', 'film', 96540, 'US', 'Los Angeles, California', par(), [PLABEL]),
  rec('paramount-vantage', 'Paramount Vantage', 'film', 838, 'US', '', par(), [PLABEL, 'TMDB lists Paramount Pictures as its parent record.']),
  rec('paramount-classics', 'Paramount Classics', 'film', 220287, 'US', '', par(), [PLABEL]),
  rec('nickelodeon-movies', 'Nickelodeon Movies', 'film', 2348, 'US', 'Los Angeles, California', par(), [PLABEL]),
  rec('mtv-films', 'MTV Films', 'film', 746, 'US', '', par(), [PLABEL]),
  rec('cbs-films', 'CBS Films', 'film', 5490, 'US', 'Los Angeles, California, USA', par(), [PLABEL]),
  rec('skydance-media', 'Skydance Media', 'film', 82819, 'US', 'Santa Monica, California', par(), ['One of the two companies combined on August 7, 2025. Its earlier titles were made as an independent company.']),
  rec('skydance-animation', 'Skydance Animation', 'film', 115416, 'US', 'Los Angeles, California', par(), ['Part of Skydance Media.']),
  rec('paramount-television', 'Paramount Television', 'television', 9223, 'US', 'Hollywood, California', par(), [PLABEL], [{ id: 'company:paramount-television-studios', relation: 'A later studio of a similar name, a separate TMDB record' }]),
  rec('paramount-television-studios', 'Paramount Television Studios', 'television', 228633, 'US', 'Hollywood, California', par(), [PLABEL, 'TMDB has a second Paramount Television Studios record (270146), with 31 series. Which studio each stands for is not settled here, so only this one is covered.']),
  rec('cbs-studios', 'CBS Studios', 'television', 1081, 'US', 'Los Angeles, California, USA', par(), [PLABEL]),
  rec('cbs-productions', 'CBS Productions', 'television', 2161, 'US', 'Los Angeles, California, USA', par(), [PLABEL]),
  rec('nickelodeon-animation-studio', 'Nickelodeon Animation Studio', 'television', 4859, 'US', 'Burbank, California', par(), [PLABEL]),
  rec('nickelodeon-productions', 'Nickelodeon Productions', 'television', 5371, 'US', 'New York City, New York', par(), [PLABEL]),
  rec('mtv-entertainment-studios', 'MTV Entertainment Studios', 'television', 6329, 'US', 'Los Angeles, California', par(), [PLABEL]),
  rec('showtime-networks', 'Showtime Networks', 'television', 4343, 'US', 'New York City, New York', par(), [PLABEL, 'The company credited on its films and series, not the channel they aired on.']),
  rec('skydance-television', 'Skydance Television', 'television', 87731, 'US', 'Santa Monica, California', par(), ['Part of Skydance Media.']),
  { ...rec('warner-bros-pictures', 'Warner Bros. Pictures', 'film', 174, 'US', 'Burbank, California', wbd(), ['TMDB lists Warner Bros. Entertainment as its parent record.']), roles: ['production', 'distribution'], website: 'https://www.warnerbros.com' },
  rec('warner-bros-entertainment', 'Warner Bros. Entertainment', 'film', 17, 'US', 'Burbank, California', wbd(), ['The studio company itself, as TMDB credits it on some titles. TMDB lists Time Warner as its parent record, an earlier owner.']),
  rec('new-line-cinema', 'New Line Cinema', 'film', 12, 'US', 'Burbank, California', wbd(), [LABEL]),
  rec('fine-line-features', 'Fine Line Features', 'film', 8, 'US', '', wbd(), [LABEL, 'TMDB lists New Line Cinema as its parent record.']),
  rec('warner-bros-pictures-animation', 'Warner Bros. Pictures Animation', 'film', 257419, 'US', 'Burbank, California', wbd(), [LABEL], [{ id: 'company:warner-animation-group', relation: 'Its earlier name, a separate TMDB record (the date is not recorded here)' }]),
  rec('warner-animation-group', 'Warner Animation Group', 'film', 25120, 'US', 'Burbank, California', wbd(), [LABEL], [{ id: 'company:warner-bros-pictures-animation', relation: 'Its later name' }]),
  rec('dc-studios', 'DC Studios', 'film', 184898, 'US', 'Burbank, California', wbd(), [LABEL], [{ id: 'company:dc-films', relation: 'An earlier Warner Bros. label for DC films, a separate TMDB record' }]),
  rec('dc-films', 'DC Films', 'film', 128064, 'US', 'Burbank, California', wbd(), [LABEL]),
  rec('dc-entertainment', 'DC Entertainment', 'film', 9993, 'US', 'Burbank, California', wbd(), [LABEL]),
  rec('castle-rock-entertainment', 'Castle Rock Entertainment', 'film', 97, 'US', 'Beverly Hills, California', wbd(), [LABEL, 'TMDB lists Warner Bros. Entertainment as its parent record. Its earliest titles were made as an independent company.']),
  rec('warner-independent-pictures', 'Warner Independent Pictures', 'film', 11509, 'US', 'Burbank, California', wbd(), [LABEL]),
  rec('hbo-films', 'HBO Films', 'film', 7429, 'US', 'New York City', wbd(), [LABEL]),
  rec('warner-bros-television', 'Warner Bros. Television', 'television', 1957, 'US', 'Burbank, California', wbd(), [LABEL]),
  rec('warner-horizon-television', 'Warner Horizon Television', 'television', 29347, 'US', '', wbd(), [LABEL]),
  rec('warner-bros-animation', 'Warner Bros. Animation', 'television', 2785, 'US', 'Burbank, California', wbd(), [LABEL]),
  rec('hbo', 'HBO', 'television', 3268, 'US', 'New York City, New York', wbd(), ['The company credited on its films and series, not the channel they aired on.']),
  rec('cartoon-network-studios', 'Cartoon Network Studios', 'television', 7899, 'US', 'Burbank, California', wbd(), [LABEL]),
  rec('hanna-barbera', 'Hanna-Barbera Cartoons', 'television', 1353, 'US', 'Los Angeles, California', wbd(), [LABEL, 'Most of its titles were made long before, under earlier owners.']),
  rec('williams-street', 'Williams Street', 'television', 6760, 'US', 'Atlanta, Georgia', wbd(), [LABEL]),
  net('paramount-plus', 'Paramount+', 'streaming', 'https://www.paramountplus.com', par(), ['A title being on Paramount+ does not make it a Paramount production.']),
  net('pluto-tv', 'Pluto TV', 'streaming', 'https://pluto.tv', par()),
  net('cbs', 'CBS', 'network', 'https://www.cbs.com', par(), ['A series airing on CBS does not make it a Paramount production.']),
  net('nickelodeon', 'Nickelodeon', 'network', 'https://www.nick.com', par()),
  net('mtv', 'MTV', 'network', 'https://www.mtv.com', par()),
  net('bet', 'BET', 'network', 'https://www.bet.com', par()),
  net('comedy-central', 'Comedy Central', 'network', 'https://www.cc.com', par()),
  net('hbo-max', 'HBO Max', 'streaming', 'https://www.hbomax.com', wbd(), ['A title being on HBO Max does not make it a Warner Bros. production.']),
  net('hbo-channel', 'HBO (The Channel)', 'network', 'https://www.hbo.com', wbd(), ['The channel is separate from HBO the company credited on films and series, which has its own page.']),
  net('cartoon-network', 'Cartoon Network', 'network', 'https://www.cartoonnetwork.com', wbd(), ['The channel is separate from Cartoon Network Studios, which makes series for it and others.']),
  net('cnn', 'CNN', 'network', 'https://www.cnn.com', wbd()),

  // Sony (November 11, 2026). Sony's own pages refuse automated readers, so its ownership dates are not recorded.
  { id: SONY, name: 'Sony Group Corporation', kind: 'corporate', roles: ['holding'], tmdb: null, website: 'https://www.sony.com', parent: null, related: [], notes: ['TMDB credits no titles to Sony Group Corporation itself; its studios and labels are credited.'] },
  { id: SPE, name: 'Sony Pictures Entertainment', kind: 'corporate', roles: ['holding'], tmdb: null, website: 'https://www.sonypictures.com', parent: { id: SONY, how: 'division', from: null, source: S.sonyStructure }, related: [],
    notes: ["Sony Group's management structure of April 1, 2025 names its President and CEO as the officer in charge of Sony's Pictures business.",
      "When Sony bought Columbia Pictures isn't recorded here: Sony's own pages refuse automated readers, and its annual report couldn't be read on November 11, 2026. Until it is, no title is marked as made before Sony owned its label."] },
  { ...rec('columbia-pictures', 'Columbia Pictures', 'film', 5, 'US', 'Culver City, California', sony(), [SLABEL, 'Many of its titles were made long before Sony owned it.']), roles: ['production', 'distribution'] },
  rec('sony-pictures', 'Sony Pictures', 'film', 34, 'US', 'Culver City, California', sony(), ['The name TMDB credits on some titles. TMDB has a second Sony Pictures record (82346, Tokyo), which is not covered.']),
  rec('tristar-pictures', 'TriStar Pictures', 'film', 559, 'US', 'Culver City, California', sony(), [SLABEL]),
  rec('screen-gems', 'Screen Gems', 'film', 3287, 'US', 'Culver City, California', sony(), [SLABEL]),
  rec('sony-pictures-classics', 'Sony Pictures Classics', 'film', 58, 'US', 'New York City, New York', sony(), [SLABEL]),
  rec('sony-pictures-animation', 'Sony Pictures Animation', 'film', 2251, 'US', 'Culver City, California', sony(), [SLABEL, 'TMDB lists Sony Pictures as its parent record.']),
  rec('3000-pictures', '3000 Pictures', 'film', 130405, 'US', 'Culver City, California', sony(), [SLABEL]),
  rec('stage-6-films', 'Stage 6 Films', 'film', 11341, 'US', 'Culver City, California', sony(), [SLABEL]),
  rec('affirm-films', 'Affirm Films', 'film', 10156, 'US', 'Culver City, California', sony(), [SLABEL]),
  rec('sony-pictures-television', 'Sony Pictures Television', 'television', 11073, 'US', 'Culver City, California', sony(), [SLABEL], [{ id: 'company:columbia-tristar-television', relation: 'An earlier name, a separate TMDB record (the date is not recorded here)' }]),
  rec('columbia-tristar-television', 'Columbia TriStar Television', 'television', 10471, 'US', 'Culver City, California', sony(), [SLABEL], [{ id: 'company:columbia-pictures-television', relation: 'An earlier name, a separate TMDB record (the date is not recorded here)' }]),
  rec('columbia-pictures-television', 'Columbia Pictures Television', 'television', 3614, 'US', '', sony(), [SLABEL]),
  net('crunchyroll', 'Crunchyroll', 'streaming', 'https://www.crunchyroll.com', sony(), ["Sony's purchase of it could not be read from an official source on November 11, 2026, so no date is given. A title being on Crunchyroll does not make it a Sony production."]),
  // Amazon, Lionsgate, Netflix, Apple and the independent studios, read on November 18, 2026. Each TMDB ID was found by
  // TMDB's company search and checked against its company details and its count of films and series that day.
  { id: AMAZON, name: 'Amazon', kind: 'corporate', roles: ['holding'], tmdb: null, website: 'https://www.aboutamazon.com', parent: null, related: [], notes: ['TMDB credits no titles to Amazon itself; its studios are credited.'] },
  { ...rec('amazon-mgm-studios', 'Amazon MGM Studios', 'film', 210099, 'US', 'Culver City, California', amz(), ["Amazon's studio under the name it took after MGM joined it. When it took the name isn't recorded: no official source for the date was read on November 18, 2026."], [{ id: 'company:amazon-studios', relation: 'Its earlier name, a separate TMDB record' }]), kind: 'film', roles: ['production', 'distribution'] },
  { ...rec('amazon-studios', 'Amazon Studios', 'film', 20580, 'US', 'Santa Monica, California', amz()), notes: ['The name TMDB credits on its earlier titles. TMDB has regional Amazon Studios records (Brazil, Mexico, Australia, India, Germany, South Africa), which are not covered.'] },
  { ...rec('metro-goldwyn-mayer', 'Metro-Goldwyn-Mayer', 'film', 21, 'US', 'Beverly Hills, California', { id: AMAZON, how: 'acquired', from: '2022-03-17', source: S.mgm }, ['MGM joined Amazon on March 17, 2022 (Amazon\'s own news of that day). Most of its titles were made long before that.', "TMDB's record names Sony Pictures as its parent company; no source read on November 18, 2026 supports that, so it isn't followed."]), roles: ['production', 'distribution'] },
  rec('united-artists', 'United Artists', 'film', 60, 'US', 'Beverly Hills, California', mgmLabel(), [MLABEL, 'Most of its titles were made long before Amazon owned MGM. TMDB has a newer United Artists record (242583, Culver City), which is not covered.']),
  rec('orion-pictures', 'Orion Pictures', 'film', 41, 'US', 'Los Angeles, California', mgmLabel(), [MLABEL, 'TMDB has a second Orion Pictures record (267168), which is not covered.']),
  rec('mgm-television', 'MGM Television', 'television', 2230, 'US', 'Beverly Hills, California', mgmLabel(), [MLABEL]),
  net('prime-video', 'Prime Video', 'streaming', 'https://www.primevideo.com', amz()),
  { id: LIONSGATE, name: 'Lionsgate Studios Corp.', kind: 'corporate', roles: ['holding'], tmdb: null, website: 'https://www.lionsgate.com', parent: null, related: [],
    notes: ['The studio business of Lions Gate Entertainment, a separate public company since May 6, 2025, when Starz was split from it (its Form 8-K12B).', "Legendary was reported in October 2026 to have offered to buy it. Neither company confirmed it, so it isn't recorded as a change of owner."] },
  { ...rec('lionsgate', 'Lionsgate', 'film', 1632, 'US', 'Santa Monica, California', lgs(), [], [{ id: 'company:lions-gate-films', relation: 'Its earlier name, a separate TMDB record' }]), roles: ['production', 'distribution'] },
  rec('lions-gate-films', 'Lions Gate Films', 'film', 35, 'US', '', lgs(), ['The name TMDB credits on its earlier titles.']),
  rec('summit-entertainment', 'Summit Entertainment', 'film', 491, 'US', 'Santa Monica, California', { id: LIONSGATE, how: 'acquired', from: '2012-01-13', source: S.summit }, ['Lionsgate completed its purchase of Summit on January 13, 2012 (its Form 8-K). Its titles before then came out before Lionsgate owned it.']),
  rec('lionsgate-television', 'Lionsgate Television', 'television', 28523, 'US', '', lgs()),
  net('starz', 'Starz', 'network', 'https://www.starz.com', null, ['Part of Lionsgate until May 6, 2025, a separate public company since (Lionsgate Studios Corp.\'s Form 8-K12B). A title being on Starz does not make it a Lionsgate production.']),
  { id: NETFLIX, name: 'Netflix, Inc.', kind: 'corporate', roles: ['holding'], tmdb: null, website: 'https://ir.netflix.net', parent: null, related: [], notes: [] },
  { ...rec('netflix', 'Netflix', 'film', 178464, 'US', 'Los Gatos, California', nfx()), roles: ['production', 'distribution'], notes: ["TMDB credits most Netflix originals to the companies that made them, not to Netflix: its series are counted here only where TMDB credits Netflix itself. TMDB's regional Netflix records (Japan, the UK) are not covered."] },
  rec('netflix-animation-studios', 'Netflix Animation Studios', 'film', 171251, 'US', 'Los Angeles, California', nfx()),
  net('netflix-service', 'Netflix (The Service)', 'streaming', 'https://www.netflix.com', nfx()),
  { id: APPLE, name: 'Apple', kind: 'corporate', roles: ['holding'], tmdb: null, website: 'https://www.apple.com', parent: null, related: [], notes: [] },
  { ...rec('apple-studios', 'Apple Studios', 'film', 194232, 'US', 'Culver City, California', apl()), roles: ['production', 'distribution'] },
  net('apple-tv', 'Apple TV', 'streaming', 'https://tv.apple.com', apl()),
  { id: LEGENDARY, name: 'Legendary Entertainment', kind: 'corporate', roles: ['holding'], tmdb: null, website: 'https://www.legendary.com', parent: null, related: [], notes: ["Legendary's own page names its film and television divisions. Who owns Legendary isn't recorded: no official source was read on November 18, 2026."] },
  rec('legendary-pictures', 'Legendary Pictures', 'film', 923, 'US', 'Burbank, California', { id: LEGENDARY, how: 'division', from: null, source: S.legendary }),
  rec('legendary-television', 'Legendary Television', 'television', 54629, 'US', 'Burbank, California', { id: LEGENDARY, how: 'division', from: null, source: S.legendary }),
  { ...rec('a24', 'A24', 'film', 41077, 'US', 'New York City, New York', null, ['TMDB has a London A24 record (293354), which is not covered.']), roles: ['production', 'distribution'] },
  { ...rec('neon', 'NEON', 'film', 90733, 'US', 'New York City, New York', null), roles: ['distribution'] },
  rec('blumhouse-productions', 'Blumhouse Productions', 'film', 3172, 'US', 'Los Angeles, California', null, [], [{ id: 'company:blumhouse-television', relation: 'Its television arm, a separate TMDB record' }]),
  rec('blumhouse-television', 'Blumhouse Television', 'television', 68884, 'US', 'Los Angeles, California', null),
  rec('amblin-entertainment', 'Amblin Entertainment', 'film', 56, 'US', 'Universal City, California', null),
  rec('annapurna-pictures', 'Annapurna Pictures', 'film', 13184, 'US', 'Los Angeles, California', null, ['TMDB has an Annapurna Pictures record in India (117057), a different company, which is not covered.']),
  { ...rec('miramax', 'Miramax', 'film', 14, 'US', 'Los Angeles, California', null, ['ViacomCBS (later Paramount, now part of Skydance) bought 49% of Miramax in April 2020 (its 10-Q for that quarter). That is a minority holding, so Miramax stands on its own here; who holds the rest was not read from an official source on November 18, 2026.']), related: [] },
  // Europe's studios, read on November 18, 2026. Each TMDB ID was found by TMDB's company search and checked against its
  // details that day; regional records (StudioCanal's UK and German, Pathé's UK) are not covered.
  { ...rec('studiocanal', 'StudioCanal', 'film', 694, 'FR', 'Paris', null, [UNREAD('CANAL+'), "TMDB's StudioCanal records for the UK (113521) and Germany (106689) are not covered."]), roles: ['production', 'distribution'] },
  { ...rec('gaumont', 'Gaumont', 'film', 9, 'FR', 'Neuilly-sur-Seine', null), roles: ['production', 'distribution'] },
  { ...rec('pathe', 'Pathé', 'film', 7981, 'FR', 'Paris', null, ["TMDB's Pathe record for the UK (7396) is not covered."]), roles: ['production', 'distribution'] },
  { ...rec('europacorp', 'EuropaCorp', 'film', 6896, 'FR', 'Paris', null), roles: ['production', 'distribution'] },
  { ...rec('wild-bunch', 'Wild Bunch', 'film', 856, 'FR', 'Paris', null), roles: ['production', 'distribution'] },
  { id: HIGHLIGHT, name: 'Highlight Communications AG', kind: 'corporate', roles: ['holding'], tmdb: null, website: 'https://www.highlight-group.com', parent: null, related: [], notes: ['TMDB credits no titles to Highlight Communications itself; Constantin Film is credited.'] },
  { ...rec('constantin-film', 'Constantin Film', 'film', 47, 'DE', 'Munich', { id: HIGHLIGHT, how: 'division', from: null, source: S.constantin }, ["Constantin's own page calls it a subsidiary of Highlight Communications AG; when it became one isn't recorded."]), roles: ['production', 'distribution'] },
  rec('ufa', 'UFA', 'film', 12372, 'DE', 'Potsdam', null, ["UFA's own page calls it the parent of all the German production of an international media group, without naming the group, so it stands on its own here."]),
  rec('rai-cinema', 'RAI Cinema', 'film', 155990, 'IT', 'Rome', null, [UNREAD('RAI, Italy\'s public broadcaster')]),
  rec('medusa-film', 'Medusa Film', 'film', 6246, 'IT', 'Rome', null, ["Its own page names no owner, and no official source for one was read on November 18, 2026, so it stands on its own here."]),
  rec('bbc-film', 'BBC Film', 'film', 288, 'GB', 'London, England', null, [UNREAD('the BBC')]),
  { id: CHANNEL4, name: 'Channel 4', kind: 'corporate', roles: ['holding'], tmdb: null, website: 'https://www.channel4.com', parent: null, related: [], notes: ['TMDB credits Film4 Productions, not Channel 4 itself, with its films.'] },
  rec('film4-productions', 'Film4 Productions', 'film', 6705, 'GB', 'London, England', { id: CHANNEL4, how: 'division', from: null, source: S.film4 }, ["Film4's own page calls it Channel 4 Television's feature film division."]),
  // Asia's and Mexico's studios, read on November 18, 2026, the same way. Only Toei Animation is placed under another
  // company: its own history says Toei bought it. The rest stand on their own, by country.
  { ...rec('toho', 'TOHO', 'film', 882, 'JP', 'Tokyo', null), roles: ['production', 'distribution'] },
  { ...rec('toei-company', 'Toei Company', 'film', 5822, 'JP', 'Chuo, Tokyo', null, ["TMDB's Toei Video Company record (9221) is not covered."]), roles: ['production', 'distribution'] },
  rec('toei-animation', 'Toei Animation', 'film', 5542, 'JP', 'Nerima, Tokyo', { id: 'company:toei-company', how: 'division', from: null, source: S.toeiAnim }, ["Toei Animation's own history says Toei bought it in July 1956, as Nichido Film, and renamed it Toei Doga. How much of it Toei holds now isn't recorded."]),
  { ...rec('shochiku', 'Shochiku', 'film', 192, 'JP', 'Tokyo', null), roles: ['production', 'distribution'] },
  rec('nikkatsu', 'Nikkatsu Corporation', 'film', 955, 'JP', 'Bunkyo, Tokyo', null),
  rec('kadokawa', 'KADOKAWA', 'film', 2073, 'JP', 'Tokyo', null, ["TMDB's KADOKAWA Shoten (1194) and KADOKAWA Daiei Studio (46774) records are not covered."]),
  rec('studio-ghibli', 'Studio Ghibli', 'film', 10342, 'JP', 'Koganei, Tokyo', null, [UNREAD('Nippon TV since October 6, 2023')]),
  { ...rec('cj-enm', 'CJ ENM', 'film', 128404, 'KR', 'Mapo, Seoul', null), roles: ['production', 'distribution'] },
  { ...rec('showbox', 'Showbox', 'film', 3491, 'KR', 'Gangnam, Seoul', null, ["TMDB's record names Lotte Entertainment as its parent; no source read on November 18, 2026 supports that, so it isn't followed."]), roles: ['production', 'distribution'] },
  { ...rec('lotte-entertainment', 'Lotte Entertainment', 'film', 7819, 'KR', 'Songpa, Seoul', null), roles: ['production', 'distribution'] },
  rec('shaw-brothers', 'Shaw Brothers', 'film', 5798, 'HK', '', null),
  { ...rec('orange-sky-golden-harvest', 'Orange Sky Golden Harvest', 'film', 2521, 'HK', 'Hong Kong', null, ["TMDB's earlier Golden Harvest Productions record (39985) is not covered."]), roles: ['production', 'distribution'] },
  { ...rec('bona-film-group', 'Bona Film Group', 'film', 30148, 'CN', 'Beijing', null), roles: ['production', 'distribution'] },
  { ...rec('yash-raj-films', 'Yash Raj Films', 'film', 1569, 'IN', 'Mumbai, Maharashtra', null), roles: ['production', 'distribution'] },
  rec('t-series', 'T-Series', 'film', 3522, 'IN', 'Mumbai, Maharashtra', null),
  rec('dharma-productions', 'Dharma Productions', 'film', 19146, 'IN', 'Mumbai, Maharashtra', null),
  rec('red-chillies-entertainment', 'Red Chillies Entertainment', 'film', 2343, 'IN', 'Mumbai, Maharashtra', null),
  rec('televisa', 'Televisa', 'television', 20911, 'MX', 'Mexico City', null, ['Mostly series: TMDB credits it with far more series than films.']),
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
  // Skydance's, from its leadership page as it stood on November 11, 2026. The page gives no dates, so each is recorded
  // as announced with the company's present form on October 6, 2026: hidden before that day, Announced until the page
  // was read, and current from then (model.ts standingAt).
  ...([
    ['david-ellison', 'David Ellison', SKY, 'Chairman & Chief Executive Officer'],
    ['ynon-kreiz', 'Ynon Kreiz', SKY, 'Co-CEO'],
    ['andy-gordon', 'Andy Gordon', SKY, 'President'],
    ['casey-bloys', 'Casey Bloys', SKY, 'Co-Chair and Chief Content Officer, Skydance Direct-To-Consumer (DTC)'],
    ['george-cheeks', 'George Cheeks', SKY, 'Co-Chair and Chief Content Officer, Skydance TV'],
    ['dennis-cinelli', 'Dennis Cinelli', SKY, 'Chief Financial Officer'],
    ['makan-delrahim', 'Makan Delrahim', SKY, 'Chief Legal Officer & President, Global Corporate Affairs'],
    ['dane-glasgow', 'Dane Glasgow', SKY, 'Chief Product Officer'],
    ['dana-goldberg', 'Dana Goldberg', SKY, 'Co-Chair, Skydance Motion Picture Group'],
    ['josh-greenstein', 'Josh Greenstein', SKY, 'Co-Chair, Skydance Motion Picture Group'],
    ['james-gunn', 'James Gunn', 'company:dc-studios', 'Co-Chairman, DC Studios'],
    ['rebecca-mall', 'Rebecca Mall', SKY, 'Chief Marketing Officer'],
    ['jb-perrette', 'Jean-Briac (JB) Perrette', SKY, 'Co-Chair & Chief Business Officer, Skydance TV and Skydance Direct-To-Consumer (DTC)'],
    ['peter-safran', 'Peter Safran', 'company:dc-studios', 'Co-Chairman, DC Studios'],
    ['mark-thompson', 'Mark Thompson', 'company:cnn', 'Chairman and Editor-in-Chief, CNN'],
    ['bari-weiss', 'Bari Weiss', 'company:cbs', 'Editor-in-Chief, CBS News'],
    ['melissa-zukerman', 'Melissa Zukerman', SKY, 'Chief Communications Officer'],
  ] as [string, string, string, string][]).map(([slug, name, co, title]) => role(`exec:${slug}`, name, co, title, [S.skyLeaders, S.skyWbd], { announced: '2026-10-06' })),
  // Sony's, from Sony Group's management structure as of April 1, 2025. When he took the title isn't given there.
  role('exec:ravi-ahuja', 'Ravi Ahuja', SPE, 'President and CEO, Sony Pictures Entertainment Inc.', [S.sonyStructure]),
  // Netflix's officers, from its investor site as it stood on November 18, 2026 (the page gives no dates), the ones
  // over the company and its content.
  ...([
    ['ted-sarandos', 'Ted Sarandos', 'Co-CEO'], ['greg-peters', 'Greg Peters', 'Co-CEO'], ['peter-rice', 'Peter Rice', 'Chief Content Officer'],
    ['spencer-neumann', 'Spencer Neumann', 'Chief Financial Officer'], ['jinny-howe', 'Jinny Howe', 'Head of Scripted Series, US and Canada'],
    ['brandon-riegg', 'Brandon Riegg', 'Vice President, Nonfiction Series & Sports'], ['marian-lee', 'Marian Lee', 'Chief Marketing Officer'],
  ] as [string, string, string][]).map(([slug, name, title]) => role(`exec:${slug}`, name, NETFLIX, title, [S.netflixLeaders])),
  // Amazon's, from its S-team page (updated August 1, 2026): the one who leads its studios.
  role('exec:mike-hopkins', 'Mike Hopkins', AMAZON, 'SVP, Amazon Video and Studios', [S.sTeam]),
  // Apple's, from its leadership page and its newsroom (June 22, 2026).
  role('exec:john-ternus', 'John Ternus', APPLE, 'CEO', [S.appleLeaders]),
  role('exec:eddy-cue', 'Eddy Cue', APPLE, 'Senior Vice President Services and Health', [S.appleLeaders, S.appleVideo]),
  role('exec:jamie-erlicht', 'Jamie Erlicht', 'company:apple-studios', "Apple's head of Worldwide Video", [S.appleVideo]),
  // Constantin Film's Executive Board, from its own page as it stood on November 18, 2026 (no dates given).
  role('exec:oliver-berben', 'Oliver Berben', 'company:constantin-film', 'CEO', [S.constantin]),
  role('exec:martin-bachmann', 'Martin Bachmann', 'company:constantin-film', 'Member of the Executive Board', [S.constantin]),
  role('exec:hanns-beese', 'Hanns Beese', 'company:constantin-film', 'Member of the Executive Board', [S.constantin]),
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
  'company:paramount-pictures': "Skydance's leadership page (read November 11, 2026) names the two heads of its Motion Picture Group, not a head of Paramount Pictures itself, so none is listed here.",
  'company:warner-bros-pictures': "Skydance's leadership page (read November 11, 2026) names the two heads of its Motion Picture Group, not a head of Warner Bros. Pictures itself, so none is listed here.",
  'company:hbo': "Skydance's leadership page (read November 11, 2026) names a content chief for its streaming business, not a head of HBO itself, so none is listed here.",
  'company:columbia-pictures': "Sony's own pages refuse automated readers, so no current official source for Columbia Pictures' leadership could be read on November 11, 2026, and none is listed.",
  'company:sony-pictures-television': "Sony's own pages refuse automated readers, so no current official source for Sony Pictures Television's leadership could be read on November 11, 2026, and none is listed.",
  'company:amazon-mgm-studios': "Amazon's own pages (read November 18, 2026) name the head of its video and studios business, listed under Amazon, but not the heads of Amazon MGM Studios' film or television; the trade press does, but no official source, so none is listed here.",
  'company:metro-goldwyn-mayer': 'No current official source for MGM\'s own leadership was found on November 18, 2026, so none is listed.',
  'company:lionsgate': "Lionsgate's investor pages refuse automated readers, so no current official source for its leadership could be read on November 18, 2026, and none is listed.",
  'company:netflix': "Netflix's officers are listed under Netflix, Inc.: its investor site names no separate head of its studio.",
  'company:a24': 'No official source for A24\'s leadership was found on November 18, 2026, so none is listed.',
  'company:neon': 'No official source for NEON\'s leadership was found on November 18, 2026, so none is listed.',
  'company:legendary-pictures': "Legendary's own page (read November 18, 2026) names no executives, so none is listed.",
  'company:blumhouse-productions': 'No official source for Blumhouse\'s leadership was found on November 18, 2026, so none is listed.',
  'company:amblin-entertainment': 'No official source for Amblin\'s leadership was found on November 18, 2026, so none is listed.',
  'company:annapurna-pictures': 'No official source for Annapurna\'s leadership was found on November 18, 2026, so none is listed.',
  'company:miramax': 'No official source for Miramax\'s leadership was found on November 18, 2026, so none is listed.',
  'company:studiocanal': "StudioCanal's and CANAL+'s own sites refuse automated readers, so no current official source for its leadership could be read on November 18, 2026, and none is listed.",
  'company:gaumont': "No current official source for Gaumont's leadership was read on November 18, 2026, so none is listed.",
  'company:pathe': "No current official source for Pathé's leadership was read on November 18, 2026, so none is listed.",
  'company:ufa': "UFA's own page (read November 18, 2026) names no executives, so none is listed.",
  'company:rai-cinema': "RAI Cinema's own site refuses automated readers, so no current official source for its leadership could be read on November 18, 2026, and none is listed.",
  'company:medusa-film': "Medusa Film's own page (read November 18, 2026) names no executives, so none is listed.",
  'company:bbc-film': "The BBC's own site refuses automated readers, so no current official source for BBC Film's leadership could be read on November 18, 2026, and none is listed.",
  'company:film4-productions': "Film4's own page (read November 18, 2026) names no executives, so none is listed.",
  'company:toho': "No official source for its leadership could be read on November 18, 2026, so none is listed.",
  'company:toei-company': "No official source for its leadership could be read on November 18, 2026, so none is listed.",
  'company:shochiku': "No official source for its leadership could be read on November 18, 2026, so none is listed.",
  'company:studio-ghibli': "No official source for its leadership could be read on November 18, 2026, so none is listed.",
  'company:cj-enm': "No official source for its leadership could be read on November 18, 2026, so none is listed.",
  'company:yash-raj-films': "No official source for its leadership could be read on November 18, 2026, so none is listed.",
};

export const company = (id: string) => COMPANIES.find((c) => c.id === id);
export const companyByTmdb = (tmdbId: number) => COMPANIES.find((c) => c.tmdb?.id === tmdbId);
/**
 * When a company's record and leadership were read. Illumination and Working Title stand outside NBCUniversal (no official
 * source placed them in it) but were read with it.
 */
const READ_US = new Set([AMAZON, LIONSGATE, NETFLIX, APPLE, LEGENDARY, 'company:a24', 'company:neon', 'company:blumhouse-productions', 'company:blumhouse-television', 'company:amblin-entertainment', 'company:annapurna-pictures', 'company:miramax', 'company:starz',
  // Europe's, read the same day.
  'company:studiocanal', 'company:gaumont', 'company:pathe', 'company:europacorp', 'company:wild-bunch', HIGHLIGHT, 'company:ufa', 'company:rai-cinema', 'company:medusa-film', 'company:bbc-film', CHANNEL4,
  // Asia's and Mexico's, read the same day.
  'company:toho', 'company:toei-company', 'company:shochiku', 'company:nikkatsu', 'company:kadokawa', 'company:studio-ghibli', 'company:cj-enm', 'company:showbox', 'company:lotte-entertainment', 'company:shaw-brothers', 'company:orange-sky-golden-harvest', 'company:bona-film-group', 'company:yash-raj-films', 'company:t-series', 'company:dharma-productions', 'company:red-chillies-entertainment', 'company:televisa']);
export function checkedFor(id: string): string {
  const g = groupOf(id)?.id;
  if (g === SKY || g === SONY) return REGISTRY_CHECKED_F;
  if (g && READ_US.has(g)) return REGISTRY_CHECKED_US;
  return g === COMCAST || id === 'company:illumination' || id === 'company:working-title' ? REGISTRY_CHECKED_NBCU : REGISTRY_CHECKED;
}

/** The group a company belongs to: the top of its chain of parents (The Walt Disney Company, Comcast, Skydance or Sony Group), or itself. */
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
