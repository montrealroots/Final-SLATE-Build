// The rules recovered on November 9, 2026 from the owner's research pass and read again here (rulebook-data.ts, the
// "Recovered sources" section). Each organizer: its boundaries (the day before, the day and the day after), its local
// deadline, its exceptions and alternative routes, its exclusions, duplicate or repeat entries, who receives it, and what
// stays unresolved. Fixtures are labelled: projects are built directly with the format, runtime, completion date, base,
// credits and releases under test.
import { describe, expect, it } from 'vitest';
import { RULEBOOKS, categoryDeadline, categoryRuleStatus, checkEligibility, institution, rulebook } from '../src/engine';
import { submitEntry } from '../src/engine/awards-actions';
import { episodeAirDates, europeanPoints } from '../src/engine/awards-rules';
import { GAPS } from '../src/engine/rulebook-data';
import { localToInstant } from '../src/engine/time';
import type { Credit, Edition, GameState, Project } from '../src/engine/types';
import { approve, buildProject, startLife } from './helpers';

const at = (zone: string, date: string, hh: number, mm = 0) => {
  const [y, m, d] = date.split('-').map(Number);
  return localToInstant(zone, y, m, d, hh, mm).instant;
};
const ed = (s: GameState, id: string): Edition => s.editions.find((e) => e.id === id)!;
const cat = (e: Edition, id: string) => institution(e.institutionId).categories.find((c) => c.id === id)!;
const why = (s: GameState, p: Project, e: Edition, c: string) => checkEligibility(s, p, e, cat(e, c)).reasons.join(' ');
const credit = (id: string, contribution: string, roleId: string, billing: number, person = `p-${id}`, characterName?: string): Credit => ({ id, person, personName: `Person ${id}`, contribution, roleId, episodes: 'all', billing, ...(characterName ? { characterName } : {}) });

/** A delivered work (labelled fixture): format, medium, finished runtime, completion date, base, credits as given. */
function work(s: GameState, o: { format: Project['axes']['format']; runtime: number; completed: string; base?: string; medium?: Project['axes']['medium']; episodes?: number; director?: string }): Project {
  const p = buildProject(s, { title: `Work ${s.projects.length + 1}`, format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'A', patch: { roleSize: 'lead' } }], [{ place: 'Room', chars: ['A'], minutes: 2 }]);
  approve(s, p);
  p.axes.format = o.format;
  p.axes.medium = o.medium ?? 'live-action';
  p.axes.basePlaceId = o.base ?? 'us-los-angeles';
  if (o.episodes) p.axes.episodeCount = o.episodes;
  p.delivered = { at: at('UTC', o.completed, 12), runtimeMin: o.runtime };
  p.credits = [credit('d1', 'Directed By', 'director', 1, o.director ?? 'p-d1'), credit('pr1', 'Produced By', 'producer', 10)];
  return p;
}
const release = (p: Project, route: Project['releases'][number]['route'], date: string, territories: string[], status: 'planned' | 'released' = 'released') =>
  p.releases.push({ id: `r${p.releases.length + 1}`, route, date, territories, distributor: 'D', note: '', status });
const entered = (e: Edition, p: Project, categoryId: string, status: Edition['entries'][number]['status'] = 'submitted') =>
  e.entries.push({ id: `${e.id}:${categoryId}:${p.id}`, projectId: p.id, categoryId, submittedAt: 0, status, recipients: [], fee: 0 });

describe('International Emmys: the 2026 Rules & Regulations (and 2027 projected from them)', () => {
  it('a season counts in the year most of its episodes aired; an equal split enters either year, once', () => {
    const s = startLife('iemmy-hang');
    const e27 = ed(s, 'international-emmys-2027');
    expect(e27.rulesId).toBe('international-emmys-2027@2');
    s.now = at('America/New_York', '2026-12-10', 9);
    const show = (start: string, route: 'broadcast' | 'streaming' = 'broadcast', episodes = 6) => { const p = work(s, { format: 'series', runtime: 50 * episodes, completed: '2026-01-10', base: 'gb-london', episodes }); release(p, route, start, ['GB']); return p; };
    expect(why(s, show('2026-06-01'), e27, 'drama')).toBe('');
    // Weekly from December 10: four of six in 2026; from December 17: three and three; from December 24: two of six.
    expect(episodeAirDates(show('2026-12-17')).map((x) => x.date)).toEqual(['2026-12-17', '2026-12-24', '2026-12-31', '2027-01-07', '2027-01-14', '2027-01-21']);
    expect(why(s, show('2026-12-10'), e27, 'drama')).toBe('');
    expect(why(s, show('2026-12-17'), e27, 'drama')).toBe('');
    expect(why(s, show('2026-12-24'), e27, 'drama')).toBe('2 of its 6 episodes air between January 1, 2026 and December 31, 2026; a season counts in the year most of its episodes aired.');
    // A streaming release puts every episode out on its day: December 31 is inside, January 1 isn't.
    expect(why(s, show('2026-12-31', 'streaming'), e27, 'drama')).toBe('');
    expect(why(s, show('2027-01-01', 'streaming'), e27, 'drama')).toBe('0 of its 6 episodes air between January 1, 2026 and December 31, 2026; a season counts in the year most of its episodes aired.');
    expect(why(s, show('2025-12-31', 'streaming'), e27, 'drama')).toMatch(/^0 of its 6 episodes/);
  });

  it('an equal split entered in 2026 can\'t enter 2027 too; the 2026 edition now opens before it closes', () => {
    const s = startLife('iemmy-split');
    const e26 = ed(s, 'international-emmys-2026');
    const e27 = ed(s, 'international-emmys-2027');
    expect(e26.rulesId).toBe('international-emmys-2026@2');
    expect(e26.submissionOpens).toBe(at('America/New_York', '2025-12-08', 9)); // it said March 18, after its own deadline
    expect(e26.eligibility).toEqual({ from: '2025-01-01', to: '2025-12-31' }); // the page showed SLATE's October to September
    expect(categoryDeadline(e26, cat(e26, 'drama'))).toBe(at('America/New_York', '2026-01-31', 12));
    s.now = at('America/New_York', '2026-01-20', 9);
    const p = work(s, { format: 'series', runtime: 300, completed: '2025-11-01', base: 'gb-london', episodes: 6 });
    release(p, 'broadcast', '2025-12-11', ['GB']); // December 11, 18, 25; January 1, 8, 15: three and three
    expect(why(s, p, e26, 'drama')).toBe('');
    submitEntry(s, p, e26.id, 'drama');
    s.now = at('America/New_York', '2026-12-10', 9);
    expect(why(s, p, e27, 'drama')).toBe('Half its episodes aired in each year, so it could enter either year\'s competition, but it is already entered at the 54th International Emmy Awards.');
  });

  it('first aired outside the US; never in cinemas first; not in another Emmy competition; the category\'s own length', () => {
    const s = startLife('iemmy-rules');
    const e = ed(s, 'international-emmys-2027');
    s.now = at('America/New_York', '2026-12-10', 9);
    const show = (episodes = 6, minutes = 50, format: Project['axes']['format'] = 'series') => work(s, { format, runtime: minutes * episodes, completed: '2026-01-10', base: 'gb-london', episodes });
    const sameDay = show();
    release(sameDay, 'broadcast', '2026-05-01', ['GB']);
    release(sameDay, 'streaming', '2026-05-01', ['US']);
    expect(why(s, sameDay, e, 'drama')).toBe('It aired in the United States first (on the same day as elsewhere); this competition takes work first broadcast outside the United States.');
    const dayAfter = show();
    release(dayAfter, 'broadcast', '2026-05-01', ['GB']);
    release(dayAfter, 'streaming', '2026-05-02', ['US']);
    expect(why(s, dayAfter, e, 'drama')).toBe('');
    const cinemaFirst = show(1, 95, 'tv-film');
    release(cinemaFirst, 'theatrical', '2026-03-01', ['FR']);
    release(cinemaFirst, 'broadcast', '2026-04-01', ['GB']);
    expect(why(s, cinemaFirst, e, 'tv-movie')).toMatch(/opened in cinemas on March 1, 2026, before airing there, which rules it out of television awards/);
    const both = show();
    release(both, 'broadcast', '2026-05-01', ['GB']);
    entered(ed(s, 'emmys-2027'), both, 'drama');
    expect(why(s, both, e, 'drama')).toBe(`It is entered at the ${ed(s, 'emmys-2027').label}; work entered there can't also be entered here.`);
    const two = show(2);
    release(two, 'broadcast', '2026-05-01', ['GB']);
    expect(why(s, two, e, 'drama')).toBe('It has 2 episodes. This category needs at least 3.');
    const nineteen = show(6, 19);
    release(nineteen, 'broadcast', '2026-05-01', ['GB']);
    expect(why(s, nineteen, e, 'drama')).toBe('Its episodes average 19 minutes. This category needs episodes of at least 20.');
    const short = show(6, 20, 'web-series');
    release(short, 'streaming', '2026-05-01', ['GB']);
    expect(why(s, short, e, 'short-form')).toBe('Its episodes average 20 minutes. This category takes episodes under 20 minutes, credits included.');
    short.delivered!.runtimeMin = 6 * 19;
    expect(why(s, short, e, 'short-form')).toBe('');
    // A planned first airing in the window enters provisionally.
    const planned = show();
    release(planned, 'broadcast', '2026-12-01', ['GB'], 'planned'); // six weekly airings, December 1 to January 5: five in 2026
    const pl = checkEligibility(s, planned, e, cat(e, 'drama'));
    expect([pl.eligible, pl.provisional, pl.provisionalNote]).toEqual([true, true, 'Entered provisionally: its first airing, on December 1, 2026, is still planned.']);
  });

  it('performances: scripted, live-action programs not made for children, 20-minute episodes, no narrators', () => {
    const s = startLife('iemmy-perf');
    const e = ed(s, 'international-emmys-2027');
    s.now = at('America/New_York', '2026-12-10', 9);
    const show = () => { const p = work(s, { format: 'series', runtime: 300, completed: '2026-01-10', base: 'gb-london', episodes: 6 }); release(p, 'broadcast', '2026-05-01', ['GB']); return p; };
    const rules = rulebook('international-emmys-2027@2')!.categories.actress;
    expect(rules.screenShare?.value).toEqual({ atLeast: 0.1, per: 'episode' });
    expect(rules.formats?.value).not.toContain('unscripted-series');
    const animated = show();
    animated.axes.medium = 'animation';
    expect(why(s, animated, e, 'actress')).toMatch(/This category is for live action or hybrid work\./);
    const kids = show();
    kids.axes.audience = 'Children (6 To 11)';
    expect(why(s, kids, e, 'actress')).toMatch(/This category doesn't take work made for children audiences\./);
    const reality = show();
    reality.axes.format = 'unscripted-series';
    expect(why(s, reality, e, 'actress')).toMatch(/This category doesn't accept unscripted series projects\./);
  });
});

describe('European Film Awards, 39th (Athens, January 16, 2027)', () => {
  const efaLife = (tag: string, born = 'fr-paris') => {
    const s = startLife(tag, 'fr-paris', { birthplaceId: born });
    s.now = at('Europe/Berlin', '2026-05-20', 9);
    return { s, e: ed(s, 'european-film-awards-2026') };
  };
  /** A French fiction feature (labelled fixture): you direct, write, compose and lead; shown in three countries. */
  const film = (s: GameState, firstShown = '2026-03-01') => {
    const p = work(s, { format: 'feature', runtime: 100, completed: '2026-01-10', base: 'fr-paris', director: 'player' });
    p.credits.find((c) => c.id === 'pr1')!.person = 'player'; // a European main producer (3.2)
    p.credits.push(credit('w', 'Written By', 'writer', 2, 'player'), credit('c', 'Music By', 'composer', 3, 'player'), credit('l', 'Cast', 'actor', 4, 'player', 'A'));
    release(p, 'theatrical', firstShown, ['FR']);
    release(p, 'theatrical', firstShown, ['DE']);
    release(p, 'theatrical', firstShown, ['IT']);
    return p;
  };

  it('first screening from October 1, 2025 to September 30, 2026; the submission period follows it', () => {
    const { s, e } = efaLife('efa-window');
    expect(e.rulesId).toBe('european-film-awards-2026@1');
    expect(e.start).toBe(at('Europe/Athens', '2027-01-16', 18)); // the catalog's date already matches the regulations (1.3)
    expect(why(s, film(s, '2025-10-01'), e, 'film')).toBe('');
    expect(why(s, film(s, '2025-09-30'), e, 'film')).toBe('It was first shown on September 30, 2025; this award takes work first screened between October 1, 2025 and September 30, 2026.');
    // First shown by May 31: due May 31, 2026; from June 1: June 15 to September 15, 2026.
    const may = film(s, '2026-05-31');
    const june = film(s, '2026-06-01');
    expect(categoryDeadline(e, cat(e, 'film'), may)).toBe(at('Europe/Berlin', '2026-05-31', 23, 59) + 59_000);
    expect(categoryDeadline(e, cat(e, 'film'), june)).toBe(at('Europe/Berlin', '2026-09-15', 23, 59) + 59_000);
    expect(why(s, june, e, 'film')).toBe('Entries for this work open on June 15, 2026.');
    s.now = at('Europe/Berlin', '2026-06-15', 9);
    expect(why(s, june, e, 'film')).toBe('');
    expect(why(s, may, e, 'film')).toBe('The entry deadline has passed.');
    const late = film(s, '2026-09-30');
    const later = film(s, '2026-10-01');
    expect(why(s, late, e, 'film')).toBe('');
    expect(why(s, later, e, 'film')).toMatch(/first shown on October 1, 2026/);
    // Never shown: refused, with the window to aim for.
    const unshown = film(s);
    unshown.releases = [];
    expect(why(s, unshown, e, 'film')).toMatch(/hasn't been shown at a festival or in cinemas yet/);
  });

  it('European directors and recipients; 13 of 21 European points; a selection or three countries', () => {
    const tokyo = efaLife('efa-tokyo', 'jp-tokyo');
    expect(why(tokyo.s, film(tokyo.s), tokyo.e, 'director')).toMatch(/This award is for films by directors from Europe; you are from Japan\./);
    const { s, e } = efaLife('efa-points');
    const p = film(s);
    expect(europeanPoints(s, p, ['EUROPE'])).toBe(14); // director 4, writer 3, composer 1, lead 3, the base 3
    p.credits = p.credits.filter((c) => c.id !== 'c' && c.id !== 'l');
    expect(europeanPoints(s, p, ['EUROPE'])).toBe(10);
    expect(why(s, p, e, 'film')).toMatch(/It has 10 of 21 European points; this award needs 13/);
    p.credits.push(credit('c', 'Music By', 'composer', 3, 'player'), credit('l', 'Cast', 'actor', 4, 'player', 'A'), credit('l2', 'Cast', 'actor', 5, 'player', 'B'));
    expect(europeanPoints(s, p, ['EUROPE'])).toBe(16);
    // Documentaries have no points scheme (5.1), and 70 minutes.
    const doc = work(s, { format: 'documentary-feature', runtime: 69, completed: '2026-01-10', base: 'fr-paris', director: 'player' });
    ['FR', 'DE', 'IT'].forEach((c) => release(doc, 'theatrical', '2026-03-01', [c]));
    expect(why(s, doc, e, 'documentary')).toBe('It runs 69 minutes. This category needs at least 70.');
    doc.delivered!.runtimeMin = 70;
    expect(why(s, doc, e, 'documentary')).toBe('');
    // A release in one country isn't enough; a festival selection is.
    const one = film(s);
    one.releases = one.releases.slice(0, 1);
    expect(why(s, one, e, 'film')).toBe('It needs a festival selection, or a theatrical release in at least 3 countries; it has one.');
    entered(ed(s, 'locarno-2026'), one, 'concorso', 'selected');
    expect(why(s, one, e, 'film')).toBe('');
    // Recipients: European producers only; a craft group taken whole when at least half is European.
    const prod = film(s);
    prod.credits.push(credit('pr2', 'Produced By', 'producer', 11, 'p-pr2'));
    expect(checkEligibility(s, prod, e, cat(e, 'film')).recipients.map((c) => c.id)).toEqual(['pr1']);
    prod.credits.find((c) => c.id === 'pr1')!.person = 'p-pr1';
    expect(why(s, prod, e, 'film')).toBe('Person pr1 isn\'t from Europe, and this award goes only to people who are.');
    const crew = film(s);
    crew.credits.push(credit('ed1', 'Editor', 'editor', 20, 'player'), credit('ed2', 'Editor', 'editor', 21, 'p-x'));
    expect(checkEligibility(s, crew, e, cat(e, 'editor')).recipients.map((c) => c.id)).toEqual(['ed1', 'ed2']); // one of two: half
    crew.credits.push(credit('ed3', 'Editor', 'editor', 22, 'p-y'));
    expect(checkEligibility(s, crew, e, cat(e, 'editor')).recipients).toEqual([]);
  });

  it('shorts keep their own scheme: produced in 2025 or 2026, 30 minutes or less, no submission periods', () => {
    const { s, e } = efaLife('efa-short');
    // The Short Film Network's selection (8.2, 8.3) isn't modeled: SLATE's own festival screening in the window stands in.
    const short = (runtime: number, completed: string) => { const p = work(s, { format: 'short', runtime, completed, base: 'fr-paris', director: 'player' }); release(p, 'festival-premiere', '2026-03-01', ['FR']); return p; };
    expect(why(s, short(30, '2025-01-01'), e, 'short')).toBe('');
    expect(why(s, short(31, '2025-06-01'), e, 'short')).toMatch(/It runs 31 minutes\. This category takes 30 minutes or less/);
    expect(why(s, short(20, '2024-12-31'), e, 'short')).toMatch(/completed on December 31, 2024/);
    expect(rulebook('european-film-awards-2026@1')!.categories.short.deadlines).toBeUndefined();
    expect(rulebook('european-film-awards-2026@1')!.categories.short.firstShown).toBeUndefined();
  });
});

describe('EE BAFTA Film Awards 2027', () => {
  it('70 minutes; first UK cinema release January 1, 2026 to February 19, 2027; documentaries and other languages to March 19, but not Best Film', () => {
    const s = startLife('bafta');
    const e = ed(s, 'bafta-film-2027');
    expect(e.rulesId).toBe('bafta-film-2027@1');
    s.now = at('Europe/London', '2026-10-01', 9);
    const film = (date: string, runtime = 100, format: Project['axes']['format'] = 'feature') => { const p = work(s, { format, runtime, completed: '2025-12-01', base: 'gb-london' }); release(p, 'theatrical', date, ['GB']); return p; };
    expect(why(s, film('2026-01-01', 70), e, 'film')).toBe('');
    expect(why(s, film('2026-01-01', 69), e, 'film')).toBe('It runs 69 minutes. This category needs at least 70.');
    expect(why(s, film('2025-12-31'), e, 'film')).toMatch(/between January 1, 2026 and February 19, 2027/);
    expect(why(s, film('2027-02-19'), e, 'film')).toBe('');
    expect(why(s, film('2027-02-20'), e, 'director')).toMatch(/between January 1, 2026 and February 19, 2027/);
    const french = film('2027-03-19');
    french.axes.dialogueLanguages = ['fr'];
    expect(why(s, french, e, 'director')).toBe('');
    expect(why(s, french, e, 'film')).toMatch(/between January 1, 2026 and February 19, 2027/); // no extension for Best Film
    french.releases[0].date = '2027-03-20';
    expect(why(s, french, e, 'director')).toMatch(/between January 1, 2026 and March 19, 2027/);
    expect(why(s, film('2027-03-10', 90, 'documentary-feature'), e, 'documentary')).toBe('');
    expect(categoryDeadline(e, cat(e, 'film'))).toBe(at('Europe/London', '2026-10-29', 23, 59) + 59_000);
  });
});

describe('TIFF 2026', () => {
  it('completed from September 4, 2025; nothing shown or released in North America; no home video; 60 and 40 minutes; May 8 ET', () => {
    const s = startLife('tiff');
    const e = ed(s, 'tiff-2026');
    expect(e.rulesId).toBe('tiff-2026@1');
    s.now = at('America/Toronto', '2026-04-01', 9);
    const film = (completed = '2026-01-10', runtime = 95, format: Project['axes']['format'] = 'feature') => work(s, { format, runtime, completed, base: 'fr-paris' });
    expect(why(s, film('2025-09-04'), e, 'official')).toBe('');
    expect(why(s, film('2025-09-03'), e, 'official')).toMatch(/completed on September 3, 2025/);
    expect(why(s, film('2026-01-10', 59), e, 'official')).toBe('It runs 59 minutes. This category needs at least 60.');
    // Shown at home in France, or at Cannes: still a North American premiere. Shown in the US: no premiere status left.
    const home = film();
    release(home, 'theatrical', '2026-03-01', ['FR']);
    expect(why(s, home, e, 'official')).toBe('');
    const us = film();
    release(us, 'festival-premiere', '2026-03-01', ['US']);
    expect(why(s, us, e, 'official')).toMatch(/It has been shown publicly in Canada or the United States/);
    const vod = film();
    release(vod, 'digital', '2026-03-01', ['FR']);
    expect(why(s, vod, e, 'official')).toBe('It was released on home video or for download on March 1, 2026, before the festival, which rules it out.');
    const streamed = film();
    release(streamed, 'streaming', '2026-03-01', ['CA']);
    expect(why(s, streamed, e, 'official')).toMatch(/released on a streaming service in Canada or the United States on March 1, 2026/);
    expect(why(s, film('2026-01-10', 40, 'short'), e, 'shorts')).toBe('');
    expect(why(s, film('2026-01-10', 41, 'short'), e, 'shorts')).toMatch(/It runs 41 minutes\. This category takes 40 minutes or less/);
    const series = work(s, { format: 'series', runtime: 60, completed: '2026-01-10', base: 'fr-paris', episodes: 1 });
    expect(why(s, series, e, 'official')).toBe('It has 1 episode. This category needs at least 2.');
    expect(categoryDeadline(e, cat(e, 'official'))).toBe(at('America/Toronto', '2026-05-08', 23, 59) + 59_000);
    // Submitted to an earlier TIFF: not again (the 2027 edition is SLATE's, so this reads the rule itself).
    expect(rulebook('tiff-2026@1')!.categories.official.noReentry?.value).toBe(true);
  });
});

describe('SXSW 2027, version 2', () => {
  it('March 15 to 21; completed from 2025; features not released in US cinemas, online, on US television or home video first', () => {
    const s = startLife('sxsw2');
    const e = ed(s, 'sxsw-2027');
    expect(e.rulesId).toBe('sxsw-2027@2');
    expect(e.start).toBe(at('America/Chicago', '2027-03-15', 10));
    expect(e.end).toBe(at('America/Chicago', '2027-03-21', 22));
    s.now = at('America/Chicago', '2026-09-01', 9);
    const film = (completed = '2026-01-10') => work(s, { format: 'feature', runtime: 95, completed, base: 'us-austin' });
    expect(why(s, film('2025-01-01'), e, 'narrative')).toBe('');
    expect(why(s, film('2024-12-31'), e, 'narrative')).toMatch(/completed on December 31, 2024/);
    // A festival screening elsewhere is fine: no world-premiere requirement for every section.
    const fest = film();
    release(fest, 'festival-premiere', '2026-05-01', ['FR']);
    expect(why(s, fest, e, 'narrative')).toBe('');
    const ukCinema = film();
    release(ukCinema, 'theatrical', '2026-05-01', ['GB']);
    expect(why(s, ukCinema, e, 'narrative')).toBe('');
    const usCinema = film();
    release(usCinema, 'theatrical', '2026-05-01', ['US']);
    expect(why(s, usCinema, e, 'narrative')).toBe('It was released in cinemas in the United States on May 1, 2026, before the festival, which rules it out.');
    const online = film();
    release(online, 'streaming', '2026-05-01', ['GB']);
    expect(why(s, online, e, 'narrative')).toBe('It was released on a streaming service on May 1, 2026, before the festival, which rules it out.');
    // A music video keeps SLATE's other rules: only the completion date is read for it.
    expect(rulebook('sxsw-2027@2')!.categories['music-videos'].notReleased).toBeUndefined();
  });
});

describe('Busan, 31st (October 6 to 15, 2026)', () => {
  it('Asian features of 60 minutes by July 8; Asian short fiction of 30 minutes in world or international premiere by June 2; 18:00 KST', () => {
    const s = startLife('busan');
    const e = ed(s, 'busan-2026');
    expect(e.rulesId).toBe('busan-2026@1');
    expect(e.start).toBe(at('Asia/Seoul', '2026-10-06', 10));
    expect(e.end).toBe(at('Asia/Seoul', '2026-10-15', 22));
    expect(e.provenance).toBe('official');
    s.now = at('Asia/Seoul', '2026-05-01', 9);
    const film = (o: Partial<{ format: Project['axes']['format']; runtime: number; completed: string; base: string }> = {}) => work(s, { format: o.format ?? 'feature', runtime: o.runtime ?? 95, completed: o.completed ?? '2026-01-10', base: o.base ?? 'kr-seoul' });
    expect(why(s, film({ completed: '2025-09-01' }), e, 'competition')).toBe('');
    expect(why(s, film({ completed: '2025-08-31' }), e, 'competition')).toMatch(/completed on August 31, 2025/);
    expect(why(s, film({ runtime: 59 }), e, 'competition')).toBe('It runs 59 minutes. This category needs at least 60.');
    expect(why(s, film({ base: 'fr-paris' }), e, 'competition')).toMatch(/This section is for work made in/);
    // Shorts: 30 minutes, Asian fiction, no short documentaries; world or international premiere.
    expect(why(s, film({ format: 'short', runtime: 30 }), e, 'shorts')).toBe('');
    expect(why(s, film({ format: 'short', runtime: 31 }), e, 'shorts')).toMatch(/It runs 31 minutes\. This category takes 30 minutes or less/);
    expect(why(s, film({ format: 'documentary-short', runtime: 20 }), e, 'shorts')).toMatch(/This category doesn't accept documentary short projects\./);
    expect(why(s, film({ format: 'short', runtime: 20, base: 'gb-london' }), e, 'shorts')).toMatch(/This section is for work made in/);
    const abroad = film({ format: 'short', runtime: 20 });
    release(abroad, 'festival-premiere', '2026-04-01', ['FR']);
    expect(why(s, abroad, e, 'shorts')).toMatch(/requires an international premiere/);
    // Features: a premiere elsewhere is a preference, not a bar.
    const shown = film();
    release(shown, 'festival-premiere', '2026-04-01', ['FR']);
    expect(why(s, shown, e, 'competition')).toBe('');
    expect(categoryDeadline(e, cat(e, 'shorts'))).toBe(at('Asia/Seoul', '2026-06-02', 18));
    expect(categoryDeadline(e, cat(e, 'competition'))).toBe(at('Asia/Seoul', '2026-07-08', 18));
    s.now = at('Asia/Seoul', '2026-06-02', 18) + 1;
    expect(why(s, film({ format: 'short', runtime: 20 }), e, 'shorts')).toBe('The entry deadline has passed.');
    expect(why(s, film(), e, 'competition')).toBe('');
  });
});

describe('DGA 79th: Documentary Film (version 5)', () => {
  it('over 40 minutes; a US release in 2026 by cinema, streaming or television; one entry per director; October 16 at 5 p.m. PT', () => {
    const s = startLife('dga-doc');
    const e = ed(s, 'dga-2027');
    expect(e.rulesId).toBe('dga-2027@5');
    s.now = at('America/Los_Angeles', '2026-09-01', 9);
    const doc = (runtime = 80, route: 'theatrical' | 'streaming' | 'broadcast' = 'theatrical', date = '2026-05-01', where = ['US']) => { const p = work(s, { format: 'documentary-feature', runtime, completed: '2026-01-10', base: 'gb-london', director: 'player' }); release(p, route, date, where); return p; };
    expect(why(s, doc(41), e, 'documentary')).toBe('');
    expect(why(s, doc(40), e, 'documentary')).toBe('It runs 40 minutes. This category needs more than 40.');
    expect(why(s, doc(80, 'streaming'), e, 'documentary')).toBe(''); // a foreign documentary streamed in the US
    expect(why(s, doc(80, 'broadcast', '2025-12-31'), e, 'documentary')).toMatch(/between January 1, 2026 and December 31, 2026/);
    expect(why(s, doc(80, 'theatrical', '2026-05-01', ['GB']), e, 'documentary')).toMatch(/in the United States between January 1, 2026/);
    const first = doc();
    const second = doc();
    submitEntry(s, first, e.id, 'documentary');
    expect(why(s, second, e, 'documentary')).toBe(`You already entered ${first.title} in this category; a director enters one film.`);
    expect(categoryDeadline(e, cat(e, 'documentary'))).toBe(at('America/Los_Angeles', '2026-10-16', 17));
    expect(rulebook('dga-2027@5')!.sources.find((x) => x.id === 'dga79-doc')!.url).toMatch(/^https:\/\/preview\.dga\.org\//); // provenance kept
  });
});

describe('FESPACO, 30th (2027): what the sources agree on is applied; when it is held stays unresolved', () => {
  it('runtimes, series packages, age, earlier FESPACO, Burkina Faso releases, African directors; the dates are a recorded conflict', () => {
    const s = startLife('fespaco', 'ng-lagos', { birthplaceId: 'ng-lagos' });
    const e = ed(s, 'fespaco-2027');
    expect(e.rulesId).toBe('fespaco-2027@1');
    s.now = at('Africa/Ouagadougou', '2026-06-01', 9);
    const film = (o: Partial<{ format: Project['axes']['format']; runtime: number; completed: string; episodes: number }> = {}) => work(s, { format: o.format ?? 'feature', runtime: o.runtime ?? 95, completed: o.completed ?? '2026-01-10', base: 'ng-lagos', director: 'player', episodes: o.episodes });
    expect(why(s, film({ completed: '2024-12-31' }), e, 'fiction')).toBe('');
    expect(why(s, film({ completed: '2024-12-30' }), e, 'fiction')).toMatch(/completed on December 30, 2024/);
    expect(why(s, film({ runtime: 59 }), e, 'fiction')).toBe('It runs 59 minutes. This category needs at least 60.');
    expect(why(s, film({ format: 'short', runtime: 35 }), e, 'shorts')).toBe('');
    expect(why(s, film({ format: 'short', runtime: 36 }), e, 'shorts')).toMatch(/takes 35 minutes or less/);
    expect(why(s, film({ format: 'series', runtime: 104, episodes: 2 }), e, 'series')).toBe(''); // two of 52
    expect(why(s, film({ format: 'series', runtime: 100, episodes: 2 }), e, 'series')).toBe('Its episodes average 50 minutes, so it enters as 3 consecutive episodes; it has 2.');
    expect(why(s, film({ format: 'series', runtime: 72, episodes: 6 }), e, 'series')).toBe('Its episodes average 12 minutes; this section takes episodes of at least 13.');
    const bf = film();
    release(bf, 'theatrical', '2026-05-01', ['BF']);
    expect(why(s, bf, e, 'fiction')).toBe('It was released in cinemas in Burkina Faso on May 1, 2026, before the festival, which rules it out.');
    const lagos = film();
    release(lagos, 'theatrical', '2026-05-01', ['NG']);
    expect(why(s, lagos, e, 'fiction')).toBe('');
    const elsewhere = startLife('fespaco-gb', 'ng-lagos', { birthplaceId: 'gb-london' });
    elsewhere.now = s.now;
    const gb = work(elsewhere, { format: 'feature', runtime: 95, completed: '2026-01-10', base: 'ng-lagos', director: 'player' });
    expect(why(elsewhere, gb, ed(elsewhere, 'fespaco-2027'), 'fiction')).toBe('This award is for films by directors from Africa; you are from the United Kingdom.');
    // The dates: two official pages disagree. SLATE's own calendar stays, and the rulebook sets neither.
    const book = rulebook('fespaco-2027@1')!;
    expect(book.held).toBeUndefined();
    expect(Object.values(book.categories).some((c) => c.deadlines)).toBe(false);
    expect(book.unresolved?.map((u) => [u.subject, u.status])).toEqual([['dates', 'source conflict'], ['deadline', 'source conflict']]);
  });
});

describe('AMAA, and what couldn\'t be read', () => {
  it('the AMAA call: December 1, 2025 to May 31, 2026; the release wording stays unapplied', () => {
    const s = startLife('amaa');
    const e = ed(s, 'amaa-2026');
    expect(e.rulesId).toBe('amaa-2026@1');
    expect(e.submissionOpens).toBe(at('Africa/Lagos', '2025-12-01', 9));
    expect(categoryDeadline(e, cat(e, 'film'))).toBe(at('Africa/Lagos', '2026-05-31', 23, 59) + 59_000);
    const book = rulebook('amaa-2026@1')!;
    expect(book.unresolved?.map((u) => u.status)).toEqual(['ambiguous', 'unavailable']);
    expect(Object.values(book.categories).every((c) => Object.keys(c).join() === 'deadlines')).toBe(true); // nothing else applied
    expect(categoryRuleStatus(book, 'film')).toBe('simulated'); // a deadline alone isn't eligibility
  });

  it('Blue Dragon and Locarno: recorded as unavailable, and their editions keep SLATE\'s rules', () => {
    const s = startLife('gaps');
    expect(GAPS.map((g) => `${g.institutionId}-${g.year}:${g.unresolved[0].status}`)).toEqual(['blue-dragon-2026:unavailable', 'locarno-2027:unavailable']);
    expect(ed(s, 'blue-dragon-2026').rulesId).toBe('simulated');
    expect(ed(s, 'locarno-2027').rulesId).toBe('simulated');
    expect(RULEBOOKS.some((b) => b.institutionId === 'blue-dragon' || b.institutionId === 'locarno')).toBe(false);
  });
});
