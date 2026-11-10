// The screen catalog's pages: companies, their leadership and titles, a title's credits, seasons, episodes and people
// (docs/CATALOG.md). Everything here is reference material, loaded on demand and kept out of saves. It is shown at the
// save's date: later releases are announced, not history, and later results aren't shown as known.
import { useMemo, useState, type ReactNode } from 'react';
import { currentZone, dateKey, formatDateKey } from '../engine';
import type { Route } from '../engine/types';
import { COMPANIES, LEADERSHIP_GAPS, REGISTRY_CHECKED, company as registryCompany, type CompanyRecord, type LeadershipRole } from '../catalog/registry';
import {
  executive, fileFor, filmographyView, happenedBy, leadershipAt, lifeAt, madeUnderDisney, moneyOrUnknown, parseRef, registryFor, titleStanding,
  type CatalogIndex, type CompanyFilmography, type PersonCredit, type PersonRecord, type SeasonRecord, type SortKey, type TitleRecord,
} from '../catalog/model';
import { retryCatalog, useCatalogFile, type Loaded } from '../catalog/load';
import { describe as describeWorld, eventsBetween, inStory, isNews, useWorld } from '../catalog/world';
import { addDaysToKey } from '../engine';
import logo from '../catalog/tmdb-logo.svg';
import { Check, Empty, PageHead, Panel, SelectField, TextField } from './components';
import { Breadcrumbs } from './Shell';
import { store, useGame } from './store';

const PAGE = 50;
/** A count in words, with thousands separated: catalog numbers run into the thousands. */
const plural = (n: number, word: string, many = `${word}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? word : many}`;
const day = (d: string) => (d.length === 4 ? d : formatDateKey(d.slice(0, 10)));
const yearOf = (d: string | null) => (d ? d.slice(0, 4) : 'Undated');

function useToday(): string {
  const g = useGame();
  return dateKey(g.now, currentZone(g));
}

function Link({ to, children, label }: { to: Route; children: ReactNode; label?: string }) {
  return <button type="button" className="link" aria-label={label} onClick={() => store.go(to)}>{children}</button>;
}
const titleRoute = (ref: string): Route => ({ view: 'title', ref } as Route);
const personRoute = (id: number): Route => ({ view: 'person', ref: `person:${id}` } as Route);

function GoBack() {
  return <button type="button" className="btn btn-sm" onClick={() => store.back()}>Go Back</button>;
}

/** What a page shows while its file loads, when the catalog isn't installed, or when a record isn't in it. */
function Status<T>({ loaded, what, children }: { loaded: Loaded<T>; what: string; children: (data: T) => ReactNode }) {
  if (loaded.status === 'loading') return <p role="status" className="muted">Loading {what}…</p>;
  if (loaded.status === 'missing') return <Empty title={`${what.charAt(0).toUpperCase()}${what.slice(1)} isn't in this copy of the catalog`}><p className="muted">This copy of SLATE doesn't have it. The catalog is gathered from TMDB separately from the game (see Companies).</p><GoBack /></Empty>;
  if (loaded.status === 'failed') return <Empty title={`${what.charAt(0).toUpperCase()}${what.slice(1)} couldn't be loaded`}><p className="muted">{loaded.message} Your game is unaffected.</p><div className="row gap-2 wrap"><button className="btn btn-sm" onClick={retryCatalog}>Try Again</button><GoBack /></div></Empty>;
  return <>{children(loaded.data)}</>;
}

export function TmdbCredit() {
  return (
    <section className="card" aria-labelledby="tmdb-h">
      <h2 id="tmdb-h">Film And Television Data</h2>
      <div className="row gap-2 wrap">
        <img src={logo} alt="TMDB" width={137} height={18} />
      </div>
      <p className="muted">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
      <p className="dim small">Titles, credits, dates and TMDB ratings in the screen catalog come from TMDB (themoviedb.org). Company leadership comes from the companies' own pages and announcements.</p>
    </section>
  );
}

// ---------- companies ----------

const KIND_LABEL: Record<CompanyRecord['kind'], string> = { corporate: 'The Company', film: 'Film', television: 'Television', network: 'Networks And Streaming' };

export function CompaniesPage() {
  const index = useCatalogFile<CatalogIndex>('index.json');
  const counts = index.status === 'ready' ? new Map(index.data.companies.map((c) => [c.tmdbId, c])) : null;
  return (
    <>
      <PageHead eyebrow="Industry" title="Companies" lede="The Walt Disney Company's studios and labels, their leadership, and the films and series credited to them, from TMDB." />
      <CatalogStatus index={index} />
      <CatalogSearch ready={index.status === 'ready'} />
      {(['corporate', 'film', 'television', 'network'] as const).map((k) => (
        <Panel key={k} title={KIND_LABEL[k]}>
          <ul className="list">
            {COMPANIES.filter((c) => c.kind === k).map((c) => {
              const n = c.tmdb && counts?.get(c.tmdb.id);
              return (
                <li key={c.id} className="list-item">
                  <span className="grow"><Link to={{ view: 'company', ref: c.id } as Route}>{c.name}</Link></span>
                  <span className="dim small">{n ? [n.movies && plural(n.movies, 'film'), n.series && plural(n.series, 'series', 'series')].filter(Boolean).join(', ') || 'No titles' : c.kind === 'network' ? 'Airs and streams titles' : ''}</span>
                </li>
              );
            })}
          </ul>
        </Panel>
      ))}
      <TmdbCredit />
    </>
  );
}

function CatalogStatus({ index }: { index: Loaded<CatalogIndex> }) {
  if (index.status === 'loading') return <p role="status" className="muted">Loading the catalog…</p>;
  if (index.status !== 'ready') {
    return (
      <section className="card callout" aria-labelledby="cat-h">
        <h2 id="cat-h">The Film Catalog Isn't Installed</h2>
        <p className="muted">{index.status === 'failed' ? `It couldn't be loaded: ${index.message}` : "This copy of SLATE doesn't include the films and series. They are gathered from TMDB separately, and TMDB's terms don't allow them to be shipped with the game."} Companies and their leadership are still here.</p>
      </section>
    );
  }
  const c = index.data.counts;
  return (
    <section className="card" aria-labelledby="cat-h">
      <h2 id="cat-h">The Catalog</h2>
      <p className="muted">{plural(c.movies, 'film')}, {plural(c.series, 'series', 'series')} with {plural(c.seasons, 'season')} and {plural(c.episodes, 'episode')}, and {plural(c.people, 'person', 'people')}, as TMDB listed them for these companies between {day(index.data.retrieved.from ?? '')} and {day(index.data.retrieved.to ?? '')}.</p>
      <p className="dim small">These are the titles TMDB credits to each company, not a complete record of everything the companies ever made, and not checked against the companies' own catalogs. A title on Disney+ isn't listed here unless one of these companies is credited with it.</p>
    </section>
  );
}

function CatalogSearch({ ready }: { ready: boolean }) {
  const [q, setQ] = useState('');
  const titles = useCatalogFile<[string, string, string | null][]>(ready ? 'search/titles.json' : null);
  const letter = /^[a-z]/i.test(q.trim()) ? q.trim()[0].toUpperCase() : '_';
  const people = useCatalogFile<[number, string, number][]>(ready && q.trim().length >= 2 ? `search/people-${letter}.json` : null);
  if (!ready) return null;
  const needle = q.trim().toLowerCase();
  const tHits = needle.length >= 2 && titles.status === 'ready' ? titles.data.filter((t) => t[1].toLowerCase().includes(needle)).slice(0, 20) : [];
  const pHits = needle.length >= 2 && people.status === 'ready' ? people.data.filter((p) => p[1].toLowerCase().startsWith(needle)).slice(0, 20) : [];
  return (
    <Panel title="Search The Catalog">
      <TextField label="Title Or Person" value={q} onChange={setQ} hint="At least two letters. People are found by the start of their name." />
      {needle.length >= 2 && (
        <div className="spaced">
          {!tHits.length && !pHits.length && titles.status === 'ready' && <p className="muted">Nothing in the catalog matches “{q.trim()}”.</p>}
          {tHits.length > 0 && <><h3>Titles</h3><ul className="list">{tHits.map((t) => <li key={t[0]} className="list-item"><span className="grow"><Link to={titleRoute(t[0])}>{t[1]}</Link></span><span className="dim small">{t[0].startsWith('tv') ? 'Series' : 'Film'}, {t[2] ?? 'undated'}</span></li>)}</ul></>}
          {pHits.length > 0 && <><h3>People</h3><ul className="list">{pHits.map((p) => <li key={p[0]} className="list-item"><span className="grow"><Link to={personRoute(p[0])}>{p[1]}</Link></span><span className="dim small">{plural(p[2], 'credit')}</span></li>)}</ul></>}
        </div>
      )}
    </Panel>
  );
}

export function CompanyPage({ id }: { id: string }) {
  const today = useToday();
  const c = registryCompany(id);
  const tmdbOnly = /^tmdbco:(\d+)$/.exec(id);
  if (!c) {
    return (
      <>
        <Breadcrumbs items={[{ label: 'Companies', route: { view: 'companies' } }, { label: tmdbOnly ? 'Credited Company' : 'Company' }]} />
        <Empty title="This Company Isn't One The Catalog Follows"><p className="muted">It is credited on titles in the catalog, but SLATE gathers titles only for The Walt Disney Company's studios and labels, so there is nothing more about it here.</p><GoBack /></Empty>
      </>
    );
  }
  const parent = c.parent && registryCompany(c.parent.id);
  return (
    <>
      <Breadcrumbs items={[{ label: 'Companies', route: { view: 'companies' } }, { label: c.name }]} />
      <PageHead eyebrow={KIND_LABEL[c.kind]} title={c.name} />
      <Panel title="About">
        <dl className="kv">
          <dt>Roles</dt><dd>{c.roles.map((r) => ({ production: 'Production', distribution: 'Distribution', network: 'Network', streaming: 'Streaming Service', holding: 'Parent Company' }[r])).join(', ')}</dd>
          {parent && <><dt>Part Of</dt><dd><Link to={{ view: 'company', ref: parent.id } as Route}>{parent.name}</Link>{c.parent!.how === 'acquired' && c.parent!.from ? `, since ${day(c.parent!.from)}` : ''}</dd></>}
          {c.tmdb && <><dt>On TMDB</dt><dd>{c.tmdb.name}, {c.tmdb.headquarters ? `${c.tmdb.headquarters}, ` : ''}{c.tmdb.country} (company {c.tmdb.id})</dd></>}
          {c.website && <><dt>Website</dt><dd><a href={c.website} target="_blank" rel="noreferrer noopener">{c.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a></dd></>}
        </dl>
        {c.parent?.how === 'acquired' && c.parent.from && happenedBy(c.parent.from, today) === false && <p className="callout">At this point in your story, {c.name} isn't part of The Walt Disney Company yet: the acquisition completes on {day(c.parent.from)}.</p>}
        {c.parent?.source && <p className="dim small">Source: <a href={c.parent.source.url} target="_blank" rel="noreferrer noopener">{c.parent.source.title}</a>.</p>}
        {c.related.map((r) => { const o = registryCompany(r.id); return o ? <p key={r.id} className="muted">{r.relation}: <Link to={{ view: 'company', ref: o.id } as Route}>{o.name}</Link>.</p> : null; })}
        {c.notes.map((n) => <p key={n} className="dim">{n}</p>)}
      </Panel>
      <LeadershipCard c={c} today={today} />
      {c.tmdb && c.kind !== 'network' ? <Filmography tmdbId={c.tmdb.id} name={c.name} today={today} /> : (
        <Panel title="Titles"><p className="muted">{c.kind === 'network' ? 'No titles are gathered for networks and streaming services: where a title airs or streams isn\'t who made it.' : 'TMDB credits no titles to this company itself; see its studios and labels.'}</p></Panel>
      )}
    </>
  );
}

const STANDING_LABEL = { current: 'Current', listed: 'Listed', incoming: 'Announced, Not Yet Begun', former: 'Former' } as const;

function roleDates(r: LeadershipRole, standing: keyof typeof STANDING_LABEL, today: string): string {
  const parts: string[] = [];
  if (r.start) parts.push(`${standing === 'incoming' ? 'begins' : 'from'} ${day(r.start)}`);
  if (r.end) parts.push(`${r.end > today && standing !== 'former' ? 'planned to end' : 'until'} ${day(r.end)}`);
  if (r.endAnnounced) parts.push(`stepping down announced ${day(r.endAnnounced)}, effective date not given`);
  if (r.announced && !r.start) parts.push(`announced ${day(r.announced)}, effective date not given`);
  else if (r.announced) parts.push(`announced ${day(r.announced)}`);
  if (!r.start && !r.end && !r.announced && !r.endAnnounced) parts.push('when it began isn\'t recorded');
  return parts.join('; ');
}

function LeadershipCard({ c, today }: { c: CompanyRecord; today: string }) {
  const roles = leadershipAt(c.id, today, REGISTRY_CHECKED);
  const gap = LEADERSHIP_GAPS[c.id];
  if (!roles.length && !gap) return null;
  return (
    <Panel title="Leadership" subtitle={`As of ${formatDateKey(today)} in your story, from the company's own pages and announcements (checked ${formatDateKey(REGISTRY_CHECKED)}). Positions, not screen credits.`}>
      {gap && <p className="muted">{gap}</p>}
      <ul className="list">
        {roles.map(({ role: r, standing }) => (
          <li key={`${r.personId}-${r.title}`} className="list-item">
            <span className="grow"><Link to={{ view: 'executive', ref: r.personId } as Route}>{r.name}</Link>: {r.title} <span className="dim small">({roleDates(r, standing, today)})</span></span>
            <span className={`chip ${standing === 'current' ? 'chip-positive' : standing === 'incoming' ? 'chip-info' : ''}`}>{STANDING_LABEL[standing]}</span>
          </li>
        ))}
      </ul>
      {roles.some((x) => x.standing === 'listed') && <p className="dim small">Listed: named in the role by a source checked after this point in your story, with no start date, so whether they held it yet isn't known.</p>}
    </Panel>
  );
}

function Filmography({ tmdbId, name, today }: { tmdbId: number; name: string; today: string }) {
  const f = useCatalogFile<CompanyFilmography>(`companies/${tmdbId}.json`);
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | 'movie' | 'tv'>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [later, setLater] = useState(false);
  const [page, setPage] = useState(0);
  const list = useMemo(() => (f.status === 'ready' ? filmographyView(f.data.entries, { query, type, sort, today, later }) : []), [f, query, type, sort, today, later]);
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const at = Math.min(page, pages - 1);
  const set = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(0); };
  return (
    <Panel title="Films And Series" subtitle={`Titles TMDB credits to ${name}.`}>
      <Status loaded={f} what="this company's titles">{(d) => (
        <>
          <div className="inline-form">
            <TextField label="Search Titles" value={query} onChange={set(setQuery)} />
            <SelectField label="Show" value={type} onChange={set(setType)} options={[{ value: 'all', label: 'Films And Series' }, { value: 'movie', label: 'Films' }, { value: 'tv', label: 'Series' }]} />
            <SelectField label="Order" value={sort} onChange={set(setSort)} options={[{ value: 'newest', label: 'Newest First' }, { value: 'oldest', label: 'Oldest First' }, { value: 'title', label: 'By Title' }]} />
          </div>
          <Check label={`Include titles not released by ${formatDateKey(today)}`} checked={later} onChange={set(setLater)} hint="Announced and later titles, and titles TMDB has no date for." />
          <p className="dim small" role="status">{plural(list.length, 'title')} of {d.entries.length}{list.length > PAGE ? `, page ${at + 1} of ${pages}` : ''}.</p>
          {list.length ? (
            <ul className="list">
              {list.slice(at * PAGE, at * PAGE + PAGE).map((e) => (
                <li key={e.ref} className="list-item">
                  <span className="grow"><Link to={titleRoute(e.ref)}>{e.title}</Link>{e.credited && e.credited !== name ? <span className="dim small"> (credited as {e.credited})</span> : null}{!e.credited ? <span className="dim small"> (found through TMDB's search; its credits no longer list the company)</span> : null}</span>
                  <span className="dim small">{e.ref.startsWith('tv') ? 'Series' : 'Film'}, {happenedBy(e.date, today) ? yearOf(e.date) : e.date ? `due ${day(e.date)}` : 'undated'}</span>
                </li>
              ))}
            </ul>
          ) : <p className="muted">{d.entries.length ? 'No titles match.' : 'TMDB credits no titles to this company.'}</p>}
          {pages > 1 && (
            <div className="row gap-2 wrap spaced">
              <button className="btn btn-sm" disabled={at === 0} onClick={() => setPage(at - 1)}>Previous Page</button>
              <button className="btn btn-sm" disabled={at >= pages - 1} onClick={() => setPage(at + 1)}>Next Page</button>
            </div>
          )}
        </>
      )}</Status>
    </Panel>
  );
}

// ---------- titles ----------

function Released({ t, today }: { t: { date: string | null; status: string | null; type?: string }; today: string }) {
  const s = titleStanding(t, today);
  const verb = t.type === 'tv' ? 'First aired' : 'Released';
  return <>{s === 'released' ? `${verb} ${day(t.date!)}` : s === 'upcoming' ? `Not released by ${formatDateKey(today)}: due ${day(t.date!)}, as announced` : 'No release date recorded'}</>;
}

export function TitlePage({ refId }: { refId: string }) {
  const today = useToday();
  const file = fileFor(refId);
  const t = useCatalogFile<TitleRecord>(file && /^(movie|tv):\d+$/.test(refId) ? file : null);
  return (
    <Status loaded={t} what="this title">{(d) => <TitleView t={d} today={today} />}</Status>
  );
}

function TitleView({ t, today }: { t: TitleRecord; today: string }) {
  const standing = titleStanding(t, today);
  const firstDisney = t.companies.map((c) => registryFor(c.tmdbId)).find(Boolean);
  const retrieved = formatDateKey(t.retrievedAt.slice(0, 10));
  return (
    <>
      <Breadcrumbs items={[{ label: 'Companies', route: { view: 'companies' } }, ...(firstDisney ? [{ label: firstDisney.name, route: { view: 'company', ref: firstDisney.id } as Route }] : []), { label: t.title }]} />
      <PageHead eyebrow={t.type === 'tv' ? 'Series' : 'Film'} title={t.title} lede={<Released t={t} today={today} />} />
      {standing !== 'released' && <p className="callout">At this point in your story this title hasn't come out. What's below is what TMDB listed on {retrieved}, and may change.</p>}
      <Panel title="About">
        {t.tagline && <p><em>{t.tagline}</em></p>}
        <p>{t.overview ?? 'TMDB has no overview for this title.'}</p>
        <dl className="kv">
          {t.originalTitle !== t.title && <><dt>Original Title</dt><dd>{t.originalTitle}</dd></>}
          <dt>Genres</dt><dd>{t.genres.join(', ') || 'Not recorded'}</dd>
          <dt>{t.type === 'tv' ? 'Episode Length' : 'Runtime'}</dt><dd>{t.type === 'tv' ? (t.episodeRuntimes?.length ? t.episodeRuntimes.map((m) => `${m} minutes`).join(', ') : 'Not recorded') : t.runtime ? `${t.runtime} minutes` : 'Not recorded'}</dd>
          <dt>Languages</dt><dd>{t.languages.join(', ') || 'Not recorded'}</dd>
          <dt>Countries</dt><dd>{t.countries.join(', ') || 'Not recorded'}</dd>
          {t.type === 'tv' && <><dt>Network</dt><dd>{t.networks?.join(', ') || 'Not recorded'} <span className="dim small">(where it aired, which isn't who made it)</span></dd></>}
          {t.type === 'tv' && t.lastAirDate && happenedBy(t.lastAirDate, today) && <><dt>Last Aired</dt><dd>{day(t.lastAirDate)}</dd></>}
          {t.collection && <><dt>Collection</dt><dd>{t.collection.name}</dd></>}
          {t.classifications.length > 0 && <><dt>Ratings Boards</dt><dd>{t.classifications.slice(0, 8).map((c) => `${c.country} ${c.rating}`).join(', ')}{t.classifications.length > 8 ? `, and ${t.classifications.length - 8} more` : ''}</dd></>}
          {t.externalIds.imdb && <><dt>IMDb ID</dt><dd>{t.externalIds.imdb}</dd></>}
          <dt>Status On TMDB</dt><dd>{t.status ?? 'Not recorded'} <span className="dim small">(on {retrieved})</span></dd>
        </dl>
      </Panel>
      <Panel title="Figures" subtitle={`As TMDB recorded them on ${retrieved}.`}>
        {standing === 'released' ? (
          <dl className="kv">
            {t.type === 'movie' && <><dt>Budget</dt><dd>{moneyOrUnknown(t.budget)}</dd><dt>Box Office</dt><dd>{moneyOrUnknown(t.revenue)}</dd></>}
            <dt>TMDB Rating</dt><dd>{t.rating ? `${t.rating.average.toFixed(1)} out of 10, from ${plural(t.rating.count, 'vote')}` : 'No votes recorded'}</dd>
          </dl>
        ) : <p className="muted">Not shown: at this point in your story the title hasn't come out, so its figures aren't known yet.</p>}
        <p className="dim small">TMDB's figures are TMDB users' ratings and the amounts TMDB's contributors entered, recorded later than your story's date. They aren't IMDb ratings, and nothing in your game is based on them.</p>
      </Panel>
      <CreditedCompanies t={t} />
      {t.type === 'tv' && <SeasonsCard t={t} today={today} />}
      {t.type === 'tv' && t.createdBy?.length ? <Panel title="Created By"><ul className="list">{t.createdBy.map((c) => <li key={c.person} className="list-item"><Link to={personRoute(c.person)}>{c.name}</Link></li>)}</ul></Panel> : null}
      {t.type === 'tv' ? <SeriesCredits t={t} /> : <MovieCredits t={t} />}
    </>
  );
}

function CreditedCompanies({ t }: { t: TitleRecord }) {
  return (
    <Panel title="Credited Companies" subtitle="As credited on the title. Who owns a company now is shown on its page.">
      {t.companies.length ? (
        <ul className="list">
          {t.companies.map((c) => {
            const r = registryFor(c.tmdbId);
            const under = madeUnderDisney(c.tmdbId, t.date);
            return (
              <li key={c.tmdbId} className="list-item">
                <span className="grow"><Link to={{ view: 'company', ref: r ? r.id : `tmdbco:${c.tmdbId}` } as Route}>{c.name}</Link>{c.country ? <span className="dim small"> ({c.country})</span> : null}</span>
                {r?.parent?.how === 'acquired' && under === false && <span className="dim small">Made before The Walt Disney Company owned it ({day(r.parent.from!)})</span>}
              </li>
            );
          })}
        </ul>
      ) : <p className="muted">TMDB lists no production companies for this title.</p>}
    </Panel>
  );
}

function Expandable<T>({ items, render, label }: { items: T[]; render: (x: T, i: number) => ReactNode; label: string }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 40);
  return (
    <>
      <ul className="list">{shown.map(render)}</ul>
      {items.length > 40 && <button className="btn btn-sm spaced" onClick={() => setAll(!all)}>{all ? `Show Fewer ${label}` : `Show All ${items.length} ${label}`}</button>}
    </>
  );
}

function MovieCredits({ t }: { t: TitleRecord }) {
  const depts = [...new Set(t.crew.map((c) => c.department))].sort();
  return (
    <>
      <Panel title="Cast" subtitle={t.cast.length ? `${plural(t.cast.length, 'credit')}, in billing order.` : undefined}>
        {t.cast.length ? <Expandable items={[...t.cast].sort((a, b) => a.order - b.order)} label="Cast" render={(c) => <li key={`${c.person}-${c.character}`} className="list-item"><span className="grow"><Link to={personRoute(c.person)}>{c.name}</Link></span><span className="dim small">{c.character ?? 'Role not recorded'}</span></li>} />
          : <p className="muted">TMDB lists no cast for this title.</p>}
      </Panel>
      <Panel title="Crew" subtitle={t.crew.length ? `${plural(t.crew.length, 'credit')} across ${plural(depts.length, 'department')}.` : undefined}>
        {t.crew.length ? depts.map((d) => (
          <section key={d}><h3>{d}</h3><Expandable items={t.crew.filter((c) => c.department === d)} label={`${d} Credits`} render={(c) => <li key={`${c.person}-${c.job}`} className="list-item"><span className="grow"><Link to={personRoute(c.person)}>{c.name}</Link></span><span className="dim small">{c.job}</span></li>} /></section>
        )) : <p className="muted">TMDB lists no crew for this title.</p>}
      </Panel>
    </>
  );
}

function SeriesCredits({ t }: { t: TitleRecord }) {
  const cast = t.seriesCast ?? [];
  const crew = t.seriesCrew ?? [];
  return (
    <>
      <Panel title="Series Cast" subtitle="Everyone TMDB credits across the series, with the number of episodes it counts for each. That isn't a claim they were in every episode; each episode's page has its own credits.">
        {cast.length ? <Expandable items={cast} label="Cast" render={(c) => <li key={c.person} className="list-item"><span className="grow"><Link to={personRoute(c.person)}>{c.name}</Link> <span className="dim small">{c.roles.map((r) => r.character).filter(Boolean).join(', ')}</span></span><span className="dim small">{plural(c.episodes, 'episode')}</span></li>} />
          : <p className="muted">TMDB lists no cast for this series.</p>}
      </Panel>
      <Panel title="Series Crew" subtitle="As TMDB totals them across episodes.">
        {crew.length ? <Expandable items={crew} label="Crew" render={(c) => <li key={`${c.person}-${c.department}`} className="list-item"><span className="grow"><Link to={personRoute(c.person)}>{c.name}</Link> <span className="dim small">{c.jobs.map((j) => j.job).join(', ')}</span></span><span className="dim small">{plural(c.episodes, 'episode')}</span></li>} />
          : <p className="muted">TMDB lists no crew for this series.</p>}
      </Panel>
    </>
  );
}

function SeasonsCard({ t, today }: { t: TitleRecord; today: string }) {
  const seasons = t.seasons ?? [];
  return (
    <Panel title="Seasons">
      {seasons.length ? (
        <ul className="list">
          {seasons.map((s) => (
            <li key={s.ref} className="list-item">
              <span className="grow">{s.available ? <Link to={{ view: 'season', ref: s.ref } as Route}>{s.name}</Link> : <>{s.name} <span className="dim small">(its episodes couldn't be gathered)</span></>}</span>
              <span className="dim small">{plural(s.episodes, 'episode')}, {happenedBy(s.date, today) ? yearOf(s.date) : s.date ? `due ${day(s.date)}` : 'undated'}</span>
            </li>
          ))}
        </ul>
      ) : <p className="muted">TMDB lists no seasons for this series.</p>}
    </Panel>
  );
}

// ---------- seasons and episodes ----------

export function SeasonPage({ refId }: { refId: string }) {
  const today = useToday();
  const r = parseRef(refId);
  const s = useCatalogFile<SeasonRecord>(r?.kind === 'season' ? fileFor(refId) : null);
  return <Status loaded={s} what="this season">{(d) => (
    <>
      <Breadcrumbs items={[{ label: 'Companies', route: { view: 'companies' } }, { label: d.seriesTitle, route: titleRoute(d.series) }, { label: d.name }]} />
      <PageHead eyebrow={d.seriesTitle} title={d.name} lede={d.date ? (happenedBy(d.date, today) ? `First aired ${day(d.date)}` : `Not aired by ${formatDateKey(today)}: due ${day(d.date)}`) : 'No air date recorded'} />
      {d.overview && <Panel title="About"><p>{d.overview}</p></Panel>}
      <Panel title="Episodes">
        {d.episodes.length ? (
          <ul className="list">
            {d.episodes.map((e) => (
              <li key={e.number} className="list-item">
                <span className="grow">{e.number}. <Link to={{ view: 'episode', ref: `${d.ref}:e:${e.number}` } as Route}>{e.name}</Link></span>
                <span className="dim small">{happenedBy(e.date, today) ? day(e.date!) : e.date ? `not aired yet, due ${day(e.date)}` : 'no air date'}</span>
              </li>
            ))}
          </ul>
        ) : <p className="muted">TMDB lists no episodes for this season.</p>}
      </Panel>
      <Panel title="Season Cast" subtitle="The regular cast TMDB lists for this season.">
        {d.cast.length ? <Expandable items={d.cast} label="Cast" render={(c) => <li key={c.person} className="list-item"><span className="grow"><Link to={personRoute(c.person)}>{c.name}</Link></span><span className="dim small">{c.character ?? 'Role not recorded'}</span></li>} />
          : <p className="muted">TMDB lists no regular cast for this season.</p>}
      </Panel>
    </>
  )}</Status>;
}

export function EpisodePage({ refId }: { refId: string }) {
  const today = useToday();
  const r = parseRef(refId);
  const s = useCatalogFile<SeasonRecord>(r?.kind === 'episode' ? fileFor(refId) : null);
  return <Status loaded={s} what="this episode">{(d) => {
    const e = d.episodes.find((x) => x.number === r!.episode);
    if (!e) return <Empty title="This Episode Isn't In The Catalog"><p className="muted">TMDB lists no episode {r!.episode} for {d.name} of {d.seriesTitle}.</p></Empty>;
    const aired = happenedBy(e.date, today);
    const depts = [...new Set(e.crew.map((c) => c.department))].sort();
    return (
      <>
        <Breadcrumbs items={[{ label: 'Companies', route: { view: 'companies' } }, { label: d.seriesTitle, route: titleRoute(d.series) }, { label: d.name, route: { view: 'season', ref: d.ref } as Route }, { label: `Episode ${e.number}` }]} />
        <PageHead eyebrow={`${d.seriesTitle}, ${d.name}`} title={e.name} lede={aired ? `Aired ${day(e.date!)}` : e.date ? `Not aired by ${formatDateKey(today)}: due ${day(e.date)}, as announced` : 'No air date recorded'} />
        <Panel title="About">
          <p>{e.overview ?? 'TMDB has no overview for this episode.'}</p>
          <dl className="kv">
            <dt>Runtime</dt><dd>{e.runtime ? `${e.runtime} minutes` : 'Not recorded'}</dd>
            <dt>TMDB Rating</dt><dd>{!aired ? 'Not shown: it hasn\'t aired at this point in your story' : e.rating ? `${e.rating.average.toFixed(1)} out of 10, from ${plural(e.rating.count, 'vote')}` : 'No votes recorded'}</dd>
          </dl>
        </Panel>
        <Panel title="Episode Crew" subtitle="Credited on this episode.">
          {e.crew.length ? depts.map((dp) => <section key={dp}><h3>{dp}</h3><ul className="list">{e.crew.filter((c) => c.department === dp).map((c) => <li key={`${c.person}-${c.job}`} className="list-item"><span className="grow"><Link to={personRoute(c.person)}>{c.name}</Link></span><span className="dim small">{c.job}</span></li>)}</ul></section>)
            : <p className="muted">TMDB lists no crew for this episode.</p>}
        </Panel>
        <Panel title="Guest Cast" subtitle="Credited on this episode. The series' regular cast is on the season's page.">
          {e.guests.length ? <ul className="list">{e.guests.map((c) => <li key={`${c.person}-${c.character}`} className="list-item"><span className="grow"><Link to={personRoute(c.person)}>{c.name}</Link></span><span className="dim small">{c.character ?? 'Role not recorded'}</span></li>)}</ul>
            : <p className="muted">TMDB lists no guest cast for this episode.</p>}
        </Panel>
      </>
    );
  }}</Status>;
}

// ---------- people ----------

const CREDIT_GROUPS: { title: string; kinds: PersonCredit['kind'][] }[] = [
  { title: 'Film Acting', kinds: ['cast'] },
  { title: 'Film Crew', kinds: ['crew'] },
  { title: 'Series', kinds: ['creator', 'series-cast', 'series-crew'] },
  { title: 'Episodes', kinds: ['episode-guest', 'episode-crew'] },
];

export function PersonPage({ refId }: { refId: string }) {
  const today = useToday();
  const r = parseRef(refId);
  const bucket = useCatalogFile<Record<string, PersonRecord>>(r?.kind === 'person' ? fileFor(refId) : null);
  return <Status loaded={bucket} what="this person">{(b) => {
    const p = b[String(r!.id)];
    if (!p) return <Empty title="This Person Isn't In The Catalog"><p className="muted">They aren't credited on any title the catalog covers.</p></Empty>;
    const life = p.details ? lifeAt(p.details, today) : null;
    return (
      <>
        <Breadcrumbs items={[{ label: 'Companies', route: { view: 'companies' } }, { label: p.name }]} />
        <PageHead eyebrow="Person" title={p.name} lede={p.details?.knownFor ? `Known for ${p.details.knownFor.toLowerCase()}, as TMDB lists it` : undefined} />
        <Panel title="About">
          {p.details ? (
            <>
              <dl className="kv">
                <dt>Born</dt><dd>{life?.born ? day(life.born) : 'Not recorded'}{p.details.placeOfBirth ? `, ${p.details.placeOfBirth}` : ''}</dd>
                {life?.died && <><dt>Died</dt><dd>{day(life.died)}</dd></>}
                {p.details.alsoKnownAs.length > 0 && <><dt>Also Known As</dt><dd>{p.details.alsoKnownAs.join(', ')}</dd></>}
              </dl>
              {p.details.biography && <p className="muted">{p.details.biography}</p>}
              <p className="dim small">From TMDB, {formatDateKey(p.details.retrievedAt.slice(0, 10))}.</p>
            </>
          ) : <p className="muted">Only this person's credits were gathered, not their details: details are gathered for each title's top-billed cast and its directors, writers, producers, composers, cinematographers and editors.</p>}
        </Panel>
        <Panel title="Credits In The Catalog" subtitle="Their credits on the titles this catalog covers, from TMDB. Their other work isn't gathered. A credit is a record of past work, not who they work for or whether they could work for you.">
          {CREDIT_GROUPS.map((g) => {
            const cs = p.credits.filter((c) => g.kinds.includes(c.kind)).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
            if (!cs.length) return null;
            return (
              <section key={g.title}>
                <h3>{g.title}</h3>
                <Expandable items={cs} label="Credits" render={(c, i) => {
                  const to: Route = { view: c.kind.startsWith('episode') ? 'episode' : 'title', ref: c.ref } as Route;
                  return <li key={`${c.ref}-${c.kind}-${i}`} className="list-item"><span className="grow"><Link to={to}>{c.title}</Link> <span className="dim small">{c.role ?? ''}{c.episodes ? ` (${plural(c.episodes, 'episode')})` : ''}</span></span><span className="dim small">{happenedBy(c.date, today) ? yearOf(c.date) : c.date ? 'not released yet' : 'undated'}</span></li>;
                }} />
              </section>
            );
          })}
        </Panel>
      </>
    );
  }}</Status>;
}

export function ExecutivePage({ id }: { id: string }) {
  const today = useToday();
  const e = executive(id);
  if (!e) return <Empty title="This Person Isn't In The Leadership Records"><p className="muted">SLATE has no executive positions recorded for them.</p></Empty>;
  const roles = e.roles.map((r) => ({ r, standing: leadershipAt(r.companyId, today, REGISTRY_CHECKED).find((x) => x.role === r)?.standing ?? null })).filter((x) => x.standing);
  return (
    <>
      <Breadcrumbs items={[{ label: 'Companies', route: { view: 'companies' } }, { label: e.name }]} />
      <PageHead eyebrow="Executive" title={e.name} />
      <Panel title="Positions" subtitle={`As of ${formatDateKey(today)} in your story. From the companies' own leadership pages and announcements, checked ${formatDateKey(REGISTRY_CHECKED)}. These are executive positions, kept apart from screen credits.`}>
        {roles.length ? (
          <ul className="list">
            {roles.map(({ r, standing }) => {
              const c = registryCompany(r.companyId)!;
              return (
                <li key={r.title} className="list-item">
                  <span className="grow">{r.title}, <Link to={{ view: 'company', ref: c.id } as Route}>{c.name}</Link> <span className="dim small">({roleDates(r, standing!, today)})</span>
                    <span className="dim small"> Sources: {r.sources.map((s, i) => <span key={s.url}>{i ? '; ' : ''}<a href={s.url} target="_blank" rel="noreferrer noopener">{s.title}</a>{s.published ? ` (${day(s.published)})` : ''}</span>)}.</span>
                  </span>
                  <span className={`chip ${standing === 'current' ? 'chip-positive' : standing === 'incoming' ? 'chip-info' : ''}`}>{STANDING_LABEL[standing!]}</span>
                </li>
              );
            })}
          </ul>
        ) : <p className="muted">None of their recorded positions had been announced at this point in your story.</p>}
        <p className="dim small">A position here says nothing about whether they would work with you or on what terms.</p>
      </Panel>
    </>
  );
}

/**
 * Home's view of the industry: what happened in the last two weeks and what is due in the next, from the catalog's
 * records at the save's date. Shown only where the catalog is installed.
 */
export function IndustryCard() {
  const g = useGame();
  const today = useToday();
  const w = useWorld();
  if (w.status !== 'ready') return null;
  const start = dateKey(g.startedAt, currentZone(g));
  const pick = (from: string, to: string) => eventsBetween(w.data, from, to).filter((e) => isNews(e) && inStory(e, start));
  const recent = pick(addDaysToKey(today, -14), today).reverse().slice(0, 8);
  const soon = pick(addDaysToKey(today, 1), addDaysToKey(today, 14)).slice(0, 6);
  const row = (e: (typeof recent)[number]) => (
    <li key={`${e.r}-${e.k}-${e.d}`} className="list-item">
      <span className="grow"><Link to={{ view: e.k === 'episode' ? 'episode' : e.k === 'season' ? 'season' : 'title', ref: e.r } as Route}>{describeWorld(e, today)}</Link></span>
      <span className="dim small nowrap">{formatDateKey(e.d)}</span>
    </li>
  );
  return (
    <Panel title="In The Industry" subtitle="Releases, premieres and endings at the companies you can look up in Companies, on the dates TMDB records."
      actions={<button className="btn btn-sm" onClick={() => store.go({ view: 'companies' } as Route)}>Open Companies</button>}>
      {recent.length ? <ul className="list">{recent.map(row)}</ul> : <p className="muted small">Nothing in the last two weeks.</p>}
      {soon.length > 0 && <><h3>Coming Up</h3><ul className="list">{soon.map(row)}</ul></>}
      {soon.length > 0 && <p className="dim small">Dates still to come were the schedule when the records were taken, on {formatDateKey(w.data.horizon)}, and may change.</p>}
    </Panel>
  );
}

/** The catalog views, by route. */
export function CatalogView({ route }: { route: Route & { ref?: string } }) {
  const ref = route.ref ?? '';
  if (route.view === 'companies') return <CompaniesPage />;
  if (route.view === 'company') return <CompanyPage id={ref} />;
  if (route.view === 'title') return <TitlePage key={ref} refId={ref} />;
  if (route.view === 'season') return <SeasonPage key={ref} refId={ref} />;
  if (route.view === 'episode') return <EpisodePage key={ref} refId={ref} />;
  if (route.view === 'person') return <PersonPage key={ref} refId={ref} />;
  if (route.view === 'executive') return <ExecutivePage id={ref} />;
  return null;
}
