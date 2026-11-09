// Qualifying-festival routes read from the Academy's own lists (November 9, 2026). Until then a short qualified for the
// Oscars through any festival win whose rules weren't read, or a list that named sections and audience awards the
// Academy doesn't, and International Feature Film took any festival entry marked won in the previous 400 days. Each list
// is explicit: institution, award, edition, window and source (rulebooks.ts QUALIFYING_LISTS). The fixtures below are
// labelled where they stand in for an edition the game doesn't hold.
import { describe, expect, it } from 'vitest';
import { announceEdition, checkEligibility, institution, processUntil } from '../src/engine';
import { QUALIFYING_LISTS, projectedList, qualifyingList } from '../src/engine/qualifying-lists';
import { adoptPublishedRules, festivalListFor, qualifyingWin } from '../src/engine/awards';
import { submitEntry, withdrawEntry } from '../src/engine/awards-actions';
import { committee } from '../src/engine/awards-results';
import { deserialize, serialize } from '../src/engine/save';
import { localToInstant } from '../src/engine/time';
import type { Credit, Edition, GameState, Project } from '../src/engine/types';
import { approve, buildProject, startLife, writePitch } from './helpers';

const at = (zone: string, date: string, hh: number) => {
  const [y, m, d] = date.split('-').map(Number);
  return localToInstant(zone, y, m, d, hh, 0).instant;
};
const ed = (s: GameState, id: string): Edition => s.editions.find((e) => e.id === id)!;
const cat = (e: Edition, id: string) => institution(e.institutionId).categories.find((c) => c.id === id)!;
const credit = (id: string, contribution: string, roleId: string): Credit => ({ id, person: 'player', personName: `Person ${id}`, contribution, roleId, episodes: 'all', billing: 1 });

function work(s: GameState, o: { format?: Project['axes']['format']; runtime?: number; base?: string; lang?: string; quality?: number } = {}): Project {
  const p = buildProject(s, { title: `Work ${s.projects.length + 1}`, format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'A', patch: { roleSize: 'lead' } }], [{ place: 'Room', chars: ['A'], minutes: 2 }]);
  approve(s, p);
  writePitch(p);
  p.axes.format = o.format ?? 'feature';
  p.axes.basePlaceId = o.base ?? 'us-los-angeles';
  if (o.lang) p.axes.dialogueLanguages = [o.lang];
  p.delivered = { at: at('UTC', '2025-09-01', 12), runtimeMin: o.runtime ?? 100 };
  p.credits = [credit('d1', 'Directed By', 'director'), credit('pr1', 'Produced By', 'producer')];
  p.funding.fund = 50_000;
  if (o.quality !== undefined) p.quality = { overall: o.quality };
  return p;
}

/** The project's result for one category of an edition: a win, a mention, a selection, or a win it later lost. */
function result(e: Edition, p: Project, categoryId: string, status: 'won' | 'mention' | 'selected' | 'withdrawn' | 'disqualified') {
  const winner = status === 'won' || status === 'withdrawn' || status === 'disqualified';
  e.results[categoryId] = { stage: status === 'selected' ? 'selection' : 'winner', projectIds: [p.id], rivalIds: [], winner: winner ? p.id : undefined, revealed: true };
  e.entries.push({ id: `${e.id}:${categoryId}:${p.id}`, projectId: p.id, categoryId, submittedAt: 0, status, recipients: [], fee: 0 });
}

function release(p: Project, route: Project['releases'][number]['route'], date: string, territories: string[], status: 'planned' | 'released' = 'released') {
  p.releases.push({ id: `r${p.releases.length + 1}`, route, date, territories, distributor: 'D', note: '', status });
}

describe('the lists are explicit and point at real awards', () => {
  it('every listed award is a category of that institution that is a prize or a competitive award, never a section or an audience award', () => {
    for (const list of QUALIFYING_LISTS) {
      expect(list.window.from < list.window.to, list.id).toBe(true);
      for (const a of list.awards) {
        const c = institution(a.institution).categories.find((x) => x.id === a.category);
        expect(c, `${list.id} ${a.institution}:${a.category}`).toBeDefined();
        expect(['prize', 'award'], `${list.id} ${a.institution}:${a.category}`).toContain(c!.kind);
        if (a.match === 'interpreted') expect(a.note, `${list.id} ${a.category} must say how it is read`).toBeTruthy();
      }
    }
    // The six International Feature awards the FAQ names, five held in SLATE (Busan's isn't).
    expect(qualifyingList('aa99-international')!.awards.map((a) => `${a.institution}:${a.category}`)).toEqual([
      'berlinale:golden-bear', 'cannes:palme', 'sundance:world-dramatic-grand-jury', 'sundance:world-documentary-grand-jury', 'tiff:platform-award', 'venice:golden-lion',
    ]);
    // Version 1's shorts list named these, which the Academy's list doesn't.
    const shorts = qualifyingList('aa99-shorts')!.awards.map((a) => `${a.institution}:${a.category}`);
    for (const gone of ['tiff:short-cuts-animated', 'hot-docs:audience', 'sxsw:shorts-jury', 'fespaco:shorts', 'idfa:shorts']) expect(shorts).not.toContain(gone);
  });

  it('a later edition carries the newest list forward, a year on, labelled projected; an earlier one has none', () => {
    const p = projectedList('shorts', 'oscars', 2028)!;
    expect(p.status).toBe('projected');
    expect(p.list.window).toEqual({ from: '2026-10-01', to: '2027-09-30' });
    expect(p.list.projectedFrom).toBe('aa99-shorts');
    expect(projectedList('shorts', 'oscars', 2027)!.status).toBe('verified');
    expect(projectedList('shorts', 'oscars', 2026)).toBeUndefined();
  });
});

describe('Oscar shorts: only a listed award, won inside the window', () => {
  it('qualifies on the listed prize; not on another prize at the same festival, a selection, a mention, an audience award or a lost win', () => {
    const s = startLife('q-shorts');
    s.now = at('America/Los_Angeles', '2026-09-25', 9);
    const osc = ed(s, 'oscars-2027');
    const live = cat(osc, 'live-short');
    const p = (n: number) => { const x = work(s, { format: 'short', runtime: 15 }); x.title = `Short ${n}`; return x; };
    const ok = (x: Project) => checkEligibility(s, x, osc, live).eligible;
    const sel = p(1); result(ed(s, 'tiff-2026'), sel, 'shorts', 'selected');
    const other = p(2); result(ed(s, 'tiff-2026'), other, 'short-cuts-animated', 'won'); // a Toronto prize the list doesn't name
    const mention = p(3); result(ed(s, 'sundance-2026'), mention, 'shorts-grand-jury', 'mention');
    const audience = p(4); result(ed(s, 'annecy-2026'), audience, 'short-audience', 'won');
    const withdrawn = p(5); result(ed(s, 'berlinale-2026'), withdrawn, 'shorts-golden-bear', 'withdrawn');
    const disq = p(6); result(ed(s, 'berlinale-2026'), disq, 'shorts-golden-bear', 'disqualified');
    const listed = p(7); result(ed(s, 'tiff-2026'), listed, 'short-cuts-international', 'won');
    const award = p(8); result(ed(s, 'goya-2026'), award, 'short-fiction', 'won'); // an academy award on the list
    expect([sel, other, mention, audience, withdrawn, disq].map(ok)).toEqual([false, false, false, false, false, false]);
    expect(ok(listed)).toBe(true);
    expect(ok(award)).toBe(true);
    expect(qualifyingWin(s, listed, qualifyingList('aa99-shorts')!)?.award.listed).toBe('Toronto: Best International Short Film');
  });

  it('a win after the window qualifies for the next Awards, on the projected list; one before it qualifies for neither', () => {
    const s = startLife('q-window');
    const late = work(s, { format: 'short', runtime: 15 });
    result(ed(s, 'sundance-2027'), late, 'shorts-grand-jury', 'won'); // closes January 31, 2027, in Utah
    expect(qualifyingWin(s, late, qualifyingList('aa99-shorts')!)).toBeUndefined();
    expect(qualifyingWin(s, late, projectedList('shorts', 'oscars', 2028)!.list)?.date).toBe('2027-01-31');
    // Labelled fixture: a Toronto edition that closed on September 20, 2025, eleven days before the window opens.
    const early = work(s, { format: 'short', runtime: 15 });
    const tiff2025: Edition = { ...JSON.parse(JSON.stringify(ed(s, 'tiff-2026'))), id: 'tiff-2025-fixture', label: '2025 Toronto Fixture', year: 2025, end: at('America/Toronto', '2025-09-20', 22), entries: [], results: {} };
    s.editions.push(tiff2025);
    result(tiff2025, early, 'short-cuts-international', 'won');
    expect(qualifyingWin(s, early, qualifyingList('aa99-shorts')!)).toBeUndefined();
  });

  it('an edition entered under version 1 keeps that list for good; an untouched one moves to version 2 when the save loads', () => {
    const s = startLife('q-history');
    const osc = ed(s, 'oscars-2027');
    osc.rulesId = 'oscars-2027@1';
    const p = work(s, { format: 'short', runtime: 15 });
    result(ed(s, 'tiff-2026'), p, 'short-cuts-animated', 'won'); // on version 1's list only
    s.now = at('America/Los_Angeles', '2026-09-25', 9);
    expect(checkEligibility(s, p, osc, cat(osc, 'live-short')).eligible).toBe(true);
    osc.entries.push({ id: 'kept', projectId: p.id, categoryId: 'live-short', submittedAt: s.now, status: 'accepted', recipients: [], fee: 0 });
    adoptPublishedRules(s);
    expect(osc.rulesId).toBe('oscars-2027@1'); // someone entered: judged by the rules they entered under
    const back = deserialize(serialize(s));
    expect(ed(back, 'oscars-2027').rulesId).toBe('oscars-2027@1');
    expect(checkEligibility(back, back.projects.find((x) => x.id === p.id)!, ed(back, 'oscars-2027'), cat(osc, 'live-short')).eligible).toBe(true);
    // The same edition, untouched, adopts the latest version (2 read the list; 3 only adds International Feature's
    // dialogue share; 4 Original Song's own rules), and the unlisted prize no longer qualifies.
    osc.entries = [];
    adoptPublishedRules(s);
    expect(osc.rulesId).toBe('oscars-2027@4');
    expect(checkEligibility(s, p, osc, cat(osc, 'live-short')).eligible).toBe(false);
  });
});

describe('Oscar documentary feature: a US run in 2026, a listed award, or an accepted International Feature entry', () => {
  it('a listed award qualifies whatever was streamed before; a prize not on the documentary list doesn\'t', () => {
    const s = startLife('q-doc');
    s.now = at('America/Los_Angeles', '2026-10-10', 9);
    const osc = ed(s, 'oscars-2027');
    const doc = cat(osc, 'documentary');
    const a = work(s, { format: 'documentary-feature', runtime: 90 });
    release(a, 'streaming', '2026-03-01', ['US']); // before any theatrical run
    expect(checkEligibility(s, a, osc, doc).reasons.join(' ')).toMatch(/or an accepted International Feature Film entry/);
    result(ed(s, 'berlinale-2026'), a, 'documentary-award', 'won');
    expect(checkEligibility(s, a, osc, doc).eligible).toBe(true);
    const b = work(s, { format: 'documentary-feature', runtime: 90 });
    result(ed(s, 'berlinale-2026'), b, 'golden-bear', 'won'); // on the International Feature list, not this one
    expect(checkEligibility(s, b, osc, doc).eligible).toBe(false);
    // A theatrical run still rules out a streaming release before it.
    const c = work(s, { format: 'documentary-feature', runtime: 90 });
    release(c, 'streaming', '2026-03-01', ['US']);
    release(c, 'theatrical', '2026-04-01', ['US']);
    expect(checkEligibility(s, c, osc, doc).reasons.join(' ')).toMatch(/outside cinemas in the United States, before any theatrical run there/);
  });

  it('enters provisionally on a submitted International Feature entry and is accepted when the committee chooses it', () => {
    const s = startLife('q-doc-intl', 'fr-paris');
    s.now = at('America/Los_Angeles', '2026-09-20', 9);
    const osc = ed(s, 'oscars-2027');
    const p = work(s, { format: 'documentary-feature', runtime: 90, base: 'fr-paris', lang: 'fr', quality: 99 });
    release(p, 'theatrical', '2026-02-01', ['FR']);
    expect(checkEligibility(s, p, osc, cat(osc, 'documentary')).eligible).toBe(false);
    const intl = submitEntry(s, p, osc.id, 'international');
    const el = checkEligibility(s, p, osc, cat(osc, 'documentary'));
    expect(el.eligible && el.provisional).toBe(true);
    const doc = submitEntry(s, p, osc.id, 'documentary');
    expect(doc.reason).toBe('Entered provisionally. It qualifies through its International Feature Film entry, which must be accepted.');
    processUntil(s, osc.deadline + 1, 'tick', 100_000);
    expect(intl.status).toBe('accepted');
    expect(doc.status).toBe('accepted');
  });

  it('a withdrawn International Feature entry takes the route away', () => {
    const s = startLife('q-doc-wd', 'fr-paris');
    s.now = at('America/Los_Angeles', '2026-09-20', 9);
    const osc = ed(s, 'oscars-2027');
    const p = work(s, { format: 'documentary-feature', runtime: 90, base: 'fr-paris', lang: 'fr', quality: 99 });
    release(p, 'theatrical', '2026-02-01', ['FR']);
    const intl = submitEntry(s, p, osc.id, 'international');
    const doc = submitEntry(s, p, osc.id, 'documentary');
    withdrawEntry(s, osc.id, intl.id);
    processUntil(s, osc.deadline + 1, 'tick', 100_000);
    expect(doc.status).toBe('rejected');
    expect(doc.reason).toMatch(/It needs a theatrical release in the United States/);
  });
});

describe('International Feature Film: a release outside the United States or one of the six awards', () => {
  it('a theatrical release abroad in the window qualifies; one only in the United States, or after streaming, doesn\'t', () => {
    const s = startLife('q-intl');
    s.now = at('America/Los_Angeles', '2026-09-20', 9);
    const osc = ed(s, 'oscars-2027');
    const intl = cat(osc, 'international');
    const abroad = work(s, { base: 'fr-paris', lang: 'fr' });
    release(abroad, 'theatrical', '2026-03-01', ['FR']);
    expect(checkEligibility(s, abroad, osc, intl).eligible).toBe(true);
    const usOnly = work(s, { base: 'fr-paris', lang: 'fr' });
    release(usOnly, 'theatrical', '2026-03-01', ['US']);
    expect(checkEligibility(s, usOnly, osc, intl).reasons.join(' ')).toMatch(/needs a theatrical release outside the United States between October 1, 2025 and September 30, 2026/);
    const early = work(s, { base: 'fr-paris', lang: 'fr' });
    release(early, 'theatrical', '2025-09-30', ['FR']); // the day before the window
    expect(checkEligibility(s, early, osc, intl).eligible).toBe(false);
    const streamed = work(s, { base: 'fr-paris', lang: 'fr' });
    release(streamed, 'streaming', '2026-02-01', ['DE']);
    release(streamed, 'theatrical', '2026-03-01', ['FR']);
    expect(checkEligibility(s, streamed, osc, intl).reasons.join(' ')).toMatch(/released on February 1, 2026 outside cinemas, before any theatrical run, which rules it out/);
    // Its materials are due at 5 p.m. Pacific on September 30, 2026.
    s.now = at('America/Los_Angeles', '2026-09-30', 17) + 1;
    expect(checkEligibility(s, abroad, osc, intl).reasons).toContain('The entry deadline has passed.');
  });

  it('only the listed top award qualifies without the committee: not the Grand Jury Prize, a selection or an out-of-window Golden Bear', () => {
    const s = startLife('q-intl-fest');
    const osc = ed(s, 'oscars-2027');
    const film = (q = 1) => work(s, { base: 'de-berlin', lang: 'de', quality: q });
    const bear = film(); result(ed(s, 'berlinale-2026'), bear, 'golden-bear', 'won');
    const grandJury = film(); result(ed(s, 'berlinale-2026'), grandJury, 'grand-jury', 'won');
    const selected = film(); result(ed(s, 'venice-2026'), selected, 'competition', 'selected');
    const nextYear = film(); result(ed(s, 'berlinale-2027'), nextYear, 'golden-bear', 'won'); // February 2027: the 100th Awards
    const world = film(); result(ed(s, 'sundance-2026'), world, 'world-dramatic-grand-jury', 'won');
    expect(committee(s, osc, bear)).toMatchObject({ chosen: true, via: 'festival', reason: `Its Golden Bear for Best Film at the ${ed(s, 'berlinale-2026').label} qualifies it without the national committee.` });
    expect(committee(s, osc, world).via).toBe('festival');
    // Quality 1: each of these goes to the committee, which puts another film forward.
    for (const x of [grandJury, selected, nextYear]) expect(committee(s, osc, x)).toMatchObject({ chosen: false, via: 'committee' });
    // A festival winner needs no theatrical release (Rule Sixteen II.A.2), and streaming before it doesn't rule it out.
    s.now = at('America/Los_Angeles', '2026-09-20', 9);
    release(bear, 'streaming', '2026-04-01', ['DE']);
    expect(checkEligibility(s, bear, osc, cat(osc, 'international')).eligible).toBe(true);
    expect(checkEligibility(s, grandJury, osc, cat(osc, 'international')).eligible).toBe(false);
  });

  it('a country puts forward one film: your stronger one is considered first, and a festival winner takes no country\'s place', () => {
    const s = startLife('q-intl-one', 'fr-paris');
    s.now = at('America/Los_Angeles', '2026-09-20', 9);
    const osc = ed(s, 'oscars-2027');
    const strong = work(s, { base: 'fr-paris', lang: 'fr', quality: 99 });
    const weaker = work(s, { base: 'fr-paris', lang: 'fr', quality: 98 });
    const winner = work(s, { base: 'fr-paris', lang: 'fr', quality: 1 });
    for (const x of [strong, weaker, winner]) release(x, 'theatrical', '2026-03-01', ['FR']);
    result(ed(s, 'cannes-2026'), winner, 'palme', 'won');
    const w = submitEntry(s, weaker, osc.id, 'international');
    const st = submitEntry(s, strong, osc.id, 'international');
    const pw = submitEntry(s, winner, osc.id, 'international');
    processUntil(s, osc.deadline + 1, 'tick', 100_000);
    expect(st.status).toBe('accepted');
    expect(w.status).toBe('not-selected');
    expect(w.reason).toBe(`France's selection committee put forward ${strong.title}; a country submits one film.`);
    expect(pw.status).toBe('accepted');
    expect(pw.reason).toMatch(/^Its Palme d’Or at the .+ qualifies it without the national committee\.$/);
    // The decision survives a reload, and judging leaves it as it was.
    const back = deserialize(serialize(s));
    expect(ed(back, 'oscars-2027').entries.map((e) => e.status)).toEqual(osc.entries.map((e) => e.status));
    announceEdition(s, osc);
    expect(w.status).toBe('not-selected');
  });

  it('a later Academy year reads the projected list: a February 2027 Golden Bear qualifies a film for the 100th Awards', () => {
    const s = startLife('q-intl-100');
    const film = work(s, { base: 'de-berlin', lang: 'de' });
    result(ed(s, 'berlinale-2027'), film, 'golden-bear', 'won');
    // Labelled fixture: the 100th Academy Awards, made from the 99th with SLATE's rules (the Academy hasn't published them).
    const osc100: Edition = { ...JSON.parse(JSON.stringify(ed(s, 'oscars-2027'))), id: 'oscars-2028-fixture', year: 2028, label: '100th Academy Awards', rulesId: 'simulated', entries: [], results: {} };
    expect(festivalListFor(osc100, 'international')?.projectedFrom).toBe('aa99-international');
    expect(committee(s, osc100, film).via).toBe('festival');
    expect(committee(s, ed(s, 'oscars-2027'), film).via).toBe('committee');
  });
});
