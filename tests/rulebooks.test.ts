import { describe, expect, it } from 'vitest';
import {
  INSTITUTIONS, RULEBOOKS, categoriesFor, categoryDeadline, categoryRuleStatus, categoryRules, checkEligibility, institution, migrateV2toV3,
  rulebook, rivalTitle, announceEdition, processUntil, schedule, DAY,
} from '../src/engine';
import { submitEntry, withdrawEntry } from '../src/engine/awards-actions';
import { publicResult } from '../src/engine/awards-results';
import { deserialize, memoryStore, openSave, serialize, writeSave } from '../src/engine/save';
import { isValidDate, localToInstant } from '../src/engine/time';
import type { Credit, Edition, GameState, Project } from '../src/engine/types';
import { SAVE_VERSION } from '../src/engine/types';
import { hashString } from '../src/engine/rng';
import { approve, buildProject, startLife } from './helpers';

const at = (zone: string, date: string, hh: number, mm = 0, ss = 0) => {
  const [y, m, d] = date.split('-').map(Number);
  return localToInstant(zone, y, m, d, hh, mm).instant + ss * 1000;
};
const ed = (s: GameState, id: string): Edition => s.editions.find((e) => e.id === id)!;
const cat = (e: Edition, id: string) => institution(e.institutionId).categories.find((c) => c.id === id)!;

function credit(id: string, contribution: string, roleId: string, billing: number): Credit {
  return { id, person: `p-${id}`, personName: `Person ${id}`, contribution, roleId, episodes: 'all', billing };
}

/** A delivered project with directors and producers credited, ready to check against rules. */
function work(s: GameState, o: { format: Project['axes']['format']; medium?: Project['axes']['medium']; runtime: number; completed: string; base?: string; producers?: number }): Project {
  // Built as a plain short, then given the format, medium and finished runtime under test.
  const p = buildProject(s, { title: `Work ${s.projects.length + 1}`, format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'A', patch: { roleSize: 'lead' } }], [{ place: 'Room', chars: ['A'], minutes: 2 }]);
  approve(s, p);
  p.axes.format = o.format;
  p.axes.medium = o.medium ?? 'live-action';
  p.axes.basePlaceId = o.base ?? 'us-los-angeles';
  p.delivered = { at: at('UTC', o.completed, 12), runtimeMin: o.runtime };
  p.credits = [credit('d1', 'Directed By', 'director', 1), ...Array.from({ length: o.producers ?? 2 }, (_, i) => credit(`pr${i + 1}`, 'Produced By', 'producer', 10 + i))];
  return p;
}

function release(p: Project, route: Project['releases'][number]['route'], date: string, territories: string[], status: 'planned' | 'released' | 'cancelled' = 'released') {
  p.releases.push({ id: `r${p.releases.length + 1}`, route, date, territories, distributor: 'D', note: '', status });
}

describe('rulebook data', () => {
  it('recounts the catalog the audit covers: 37 institutions and 806 categories', () => {
    expect(INSTITUTIONS.length).toBe(37);
    // 141 before the 78th Emmys renamed Outstanding Television Movie to Outstanding Movie (kept as two, by year); 142 until
    // the rosters of November 9, 2026 (docs/awards/roster); 802 until the nonplayable review the same day entered the
    // Emmys' Outstanding Narrator, SXSW's Music Video Competition with its jury award and the International Emmys' Sports
    // Documentary.
    expect(INSTITUTIONS.reduce((n, i) => n + i.categories.length, 0)).toBe(806);
  });

  it('every rule names a real institution, category and source, with real dates', () => {
    const ids = new Set<string>();
    for (const b of RULEBOOKS) {
      expect(ids.has(b.id), b.id).toBe(false);
      ids.add(b.id);
      expect(b.id).toBe(`${b.institutionId}-${b.year}@${b.version}`);
      const inst = institution(b.institutionId);
      const sources = new Set(b.sources.map((x) => x.id));
      for (const [catId, rules] of Object.entries(b.categories)) {
        expect(categoriesFor(inst, b.year).some((c) => c.id === catId), `${b.id} ${catId}`).toBe(true);
        // A format's own rules (byFormat) are checked like the category's.
        const flat = [...Object.entries(rules).filter(([k]) => k !== 'byFormat'), ...(rules.byFormat ?? []).flatMap((f) => Object.entries(f.rules).map(([k, r]) => [`${f.formats.join('/')} ${k}`, r] as const))];
        for (const [k, r] of flat as [string, { source: string; status: string; note?: string }][]) {
          expect(sources.has(r.source), `${b.id} ${catId} ${k}`).toBe(true);
          expect(['verified', 'projected']).toContain(r.status);
          if (r.status === 'projected') expect(r.note, `${b.id} ${catId} ${k} must say why it is projected`).toBeTruthy();
        }
        for (const d of rules.deadlines?.value ?? []) {
          const [y, m, dd] = d.date.split('-').map(Number);
          expect(isValidDate(y, m, dd)).toBe(true);
          expect(() => new Intl.DateTimeFormat('en', { timeZone: d.zone })).not.toThrow();
        }
      }
      for (const x of b.sources) expect(x.url).toMatch(/^https:\/\//);
    }
  });

  it('new editions record the rules they use; others say simulated', () => {
    const s = startLife('rules-ids');
    // Version 2 from November 9, 2026: qualifying-festival routes read from the Academy's lists; version 3 the same day:
    // International Feature's dialogue share; version 4 (also November 9): Original Song's own rules (Rule Nineteen).
    expect(ed(s, 'oscars-2027').rulesId).toBe('oscars-2027@5');
    expect(ed(s, 'sundance-2027').rulesId).toBe('sundance-2027@1');
    expect(ed(s, 'venice-2026').rulesId).toBe('venice-2026@4');
    expect(ed(s, 'tiff-2026').rulesId).toBe('simulated');
    expect(categoryRuleStatus(rulebook('cannes-2027@1'), 'shorts')).toBe('projected');
    expect(categoryRuleStatus(rulebook('cannes-2027@1'), 'competition')).toBe('simulated');
    expect(categoryRuleStatus(rulebook('oscars-2027@1'), 'picture')).toBe('verified');
    expect(categoryRuleStatus(rulebook('oscars-2027@1'), 'international')).toBe('simulated');
    expect(categoryRuleStatus(rulebook('oscars-2027@2'), 'international')).toBe('verified');
  });
});

describe('eligibility boundaries from the organizers\' rules', () => {
  it('runtime limits: Oscar shorts 40 minutes or less, features over 40; Sundance features 50 or more, shorts under 50', () => {
    const s = startLife('rt');
    s.now = at('America/Los_Angeles', '2026-09-01', 9);
    const osc = ed(s, 'oscars-2027');
    const short40 = work(s, { format: 'short', runtime: 40, completed: '2026-03-01' });
    const short41 = work(s, { format: 'short', runtime: 41, completed: '2026-03-01' });
    const r = (p: Project, e: Edition, c: string) => checkEligibility(s, p, e, cat(e, c)).reasons.join(' ');
    expect(r(short40, osc, 'live-short')).not.toMatch(/minutes/);
    expect(r(short41, osc, 'live-short')).toMatch(/takes 40 minutes or less, credits included/);
    const f40 = work(s, { format: 'feature', runtime: 40, completed: '2026-03-01' });
    const f41 = work(s, { format: 'feature', runtime: 41, completed: '2026-03-01' });
    expect(r(f40, osc, 'picture')).toMatch(/needs more than 40/);
    expect(r(f41, osc, 'picture')).not.toMatch(/minutes/);
    const sun = ed(s, 'sundance-2027');
    s.now = at('America/Denver', '2026-08-01', 9);
    expect(r(work(s, { format: 'feature', runtime: 49, completed: '2026-03-01' }), sun, 'dramatic')).toMatch(/at least 50/);
    expect(r(work(s, { format: 'feature', runtime: 50, completed: '2026-03-01' }), sun, 'dramatic')).not.toMatch(/minutes/);
    expect(r(work(s, { format: 'short', runtime: 49, completed: '2026-03-01' }), sun, 'shorts')).not.toMatch(/minutes/);
    expect(r(work(s, { format: 'short', runtime: 50, completed: '2026-03-01' }), sun, 'shorts')).toMatch(/under 50 minutes/);
  });

  it('Clermont-Ferrand: 40 minutes, completed after October 1, 2025, not French-made, never entered before', () => {
    const s = startLife('cf');
    s.now = at('Europe/Paris', '2026-06-01', 9);
    const e = ed(s, 'clermont-2027');
    const c = cat(e, 'international');
    const r = (p: Project) => checkEligibility(s, p, e, c).reasons.join(' ');
    expect(r(work(s, { format: 'short', runtime: 40, completed: '2025-10-02' }))).toBe('');
    expect(r(work(s, { format: 'short', runtime: 41, completed: '2025-10-02' }))).toMatch(/40 minutes or less/);
    expect(r(work(s, { format: 'short', runtime: 20, completed: '2025-10-01' }))).toMatch(/completed from October 2, 2025/);
    expect(r(work(s, { format: 'short', runtime: 20, completed: '2026-02-01', base: 'fr-paris' }))).toMatch(/national competition/);
    const again = work(s, { format: 'short', runtime: 20, completed: '2026-02-01' });
    const older = ed(s, 'clermont-2026');
    older.entries.push({ id: 'old', projectId: again.id, categoryId: 'international', submittedAt: 0, status: 'withdrawn', recipients: [], fee: 0 });
    expect(r(again)).toMatch(/entered at an earlier/);
  });

  it('Cannes short films use the 2026 rules carried forward, labelled projected: 15 minutes, not online, no other festival', () => {
    const s = startLife('cannes');
    s.now = at('Europe/Paris', '2027-01-10', 9);
    const e = ed(s, 'cannes-2027');
    const c = cat(e, 'shorts');
    expect(categoryRules(e, 'shorts')?.runtime?.status).toBe('projected');
    const r = (p: Project) => checkEligibility(s, p, e, c).reasons.join(' ');
    expect(r(work(s, { format: 'short', runtime: 15, completed: '2026-09-01', base: 'gb-london' }))).toBe('');
    expect(r(work(s, { format: 'short', runtime: 16, completed: '2026-09-01', base: 'gb-london' }))).toMatch(/15 minutes or less/);
    const online = work(s, { format: 'short', runtime: 12, completed: '2026-09-01', base: 'gb-london' });
    release(online, 'streaming', '2026-12-01', ['GB']);
    expect(r(online)).toMatch(/released online/);
    const festival = work(s, { format: 'short', runtime: 12, completed: '2026-09-01', base: 'gb-london' });
    festival.premiere = { kind: 'world', date: '2026-11-01', country: 'GB', venue: 'X', editionId: 'clermont-2027' };
    expect(r(festival)).toMatch(/already screened at/);
    expect(r(work(s, { format: 'short', runtime: 12, completed: '2026-05-10', base: 'gb-london' }))).toMatch(/completed from May 11, 2026/);
  });
});

describe('disqualifications, overlapping categories and premiere changes', () => {
  it('an Oscar feature streamed in the US before its theatrical run is ruled out; abroad first is fine', () => {
    const s = startLife('tf');
    s.now = at('America/Los_Angeles', '2026-10-01', 9);
    const e = ed(s, 'oscars-2027');
    const ok = work(s, { format: 'feature', runtime: 95, completed: '2026-02-01' });
    release(ok, 'streaming', '2026-03-01', ['FR']);
    release(ok, 'theatrical', '2026-04-01', ['US']);
    expect(checkEligibility(s, ok, e, cat(e, 'picture')).eligible).toBe(true);
    const bad = work(s, { format: 'feature', runtime: 95, completed: '2026-02-01' });
    release(bad, 'streaming', '2026-03-01', ['US']);
    release(bad, 'theatrical', '2026-04-01', ['US']);
    expect(checkEligibility(s, bad, e, cat(e, 'picture')).reasons.join(' ')).toMatch(/outside cinemas in the United States, before any theatrical run/);
    // A cancelled release never happened.
    const cancelled = work(s, { format: 'feature', runtime: 95, completed: '2026-02-01' });
    release(cancelled, 'streaming', '2026-03-01', ['US'], 'cancelled');
    release(cancelled, 'theatrical', '2026-04-01', ['US']);
    expect(checkEligibility(s, cancelled, e, cat(e, 'picture')).eligible).toBe(true);
  });

  it('Oscar shorts qualify by a US theatrical run or a win of an award on the Academy\'s list inside October 2025 to September 2026', () => {
    const s = startLife('osh');
    s.now = at('America/Los_Angeles', '2026-09-20', 9);
    const e = ed(s, 'oscars-2027');
    const p = work(s, { format: 'short', runtime: 15, completed: '2026-01-10' });
    const live = cat(e, 'live-short');
    expect(checkEligibility(s, p, e, live).reasons.join(' ')).toMatch(/or a win of an award on the Oscars qualifying-festival list between October 1, 2025 and September 30, 2026/);
    const won = (x: Edition, categoryId: string, status: 'won' | 'selected' = 'won') => {
      x.results[categoryId] = { stage: status === 'won' ? 'winner' : 'selection', projectIds: [p.id], rivalIds: [], winner: status === 'won' ? p.id : undefined, revealed: true };
      x.entries.push({ id: `${x.id}:${categoryId}`, projectId: p.id, categoryId, submittedAt: 0, status, recipients: [], fee: 0, via: status === 'won' ? 'selection' : undefined });
    };
    // A win at a festival section the Academy doesn't list doesn't count, nor a selection for the section the listed prize is decided in.
    won(ed(s, 'tiff-2026'), 'short-cuts-animated');
    expect(checkEligibility(s, p, e, live).eligible).toBe(false);
    won(ed(s, 'clermont-2026'), 'international', 'selected');
    expect(checkEligibility(s, p, e, live).eligible).toBe(false);
    won(ed(s, 'clermont-2026'), 'grand-prix');
    expect(checkEligibility(s, p, e, live).eligible).toBe(true);
  });

  it('overlapping categories: a documentary short is not a live action short; a hybrid feature is not an animated feature', () => {
    const s = startLife('ov');
    s.now = at('America/Los_Angeles', '2026-09-20', 9);
    const e = ed(s, 'oscars-2027');
    const doc = work(s, { format: 'documentary-short', runtime: 20, completed: '2026-01-10' });
    release(doc, 'theatrical', '2026-02-01', ['US']);
    expect(checkEligibility(s, doc, e, cat(e, 'live-short')).eligible).toBe(false);
    expect(checkEligibility(s, doc, e, cat(e, 'doc-short')).eligible).toBe(true);
    const hybrid = work(s, { format: 'feature', medium: 'hybrid', runtime: 90, completed: '2026-01-10' });
    release(hybrid, 'theatrical', '2026-02-01', ['US']);
    expect(checkEligibility(s, hybrid, e, cat(e, 'animated')).reasons.join(' ')).toMatch(/for animation work/);
    expect(checkEligibility(s, hybrid, e, cat(e, 'picture')).eligible).toBe(true); // the same film can enter both kinds of category
    const anim = work(s, { format: 'feature', medium: 'animation', runtime: 90, completed: '2026-01-10' });
    release(anim, 'theatrical', '2026-02-01', ['US']);
    expect(checkEligibility(s, anim, e, cat(e, 'animated')).eligible).toBe(true);
    expect(checkEligibility(s, anim, e, cat(e, 'picture')).eligible).toBe(true);
  });

  it('Sundance premieres: US work needs a world premiere, international work an international one; a later screening changes that', () => {
    const s = startLife('prem');
    s.now = at('America/Denver', '2026-08-01', 9);
    const e = ed(s, 'sundance-2027');
    // International features enter the World Cinema competition (the U.S. one is for US work, from November 9, 2026).
    const c = cat(e, 'dramatic');
    const w = cat(e, 'world-dramatic');
    const us = work(s, { format: 'feature', runtime: 90, completed: '2026-03-01', base: 'us-los-angeles' });
    const intl = work(s, { format: 'feature', runtime: 90, completed: '2026-03-01', base: 'gb-london' });
    expect(checkEligibility(s, us, e, c).eligible).toBe(true);
    expect(checkEligibility(s, intl, e, c).reasons.join(' ')).toMatch(/American productions/);
    expect(checkEligibility(s, us, e, w).reasons.join(' ')).toMatch(/outside the United States/);
    expect(checkEligibility(s, intl, e, w).eligible).toBe(true);
    us.premiere = { kind: 'world', date: '2026-07-01', country: 'US', venue: 'Other', editionId: 'sxsw-2026' };
    intl.premiere = { kind: 'world', date: '2026-07-01', country: 'GB', venue: 'Home', editionId: 'sxsw-2026' };
    expect(checkEligibility(s, us, e, c).reasons.join(' ')).toMatch(/requires a world premiere/);
    expect(checkEligibility(s, intl, e, w).eligible).toBe(true); // shown only at home: still an international premiere
    release(intl, 'theatrical', '2026-07-15', ['FR']);
    expect(checkEligibility(s, intl, e, w).reasons.join(' ')).toMatch(/requires an international premiere/);
  });

  it('Sundance shorts: shown before 2026 rules out older work, but work completed in 2026 needs no premiere', () => {
    const s = startLife('sshort');
    s.now = at('America/Denver', '2026-08-01', 9);
    const e = ed(s, 'sundance-2027');
    const c = cat(e, 'shorts');
    const older = work(s, { format: 'short', runtime: 12, completed: '2025-11-01' });
    release(older, 'streaming', '2025-12-15', ['US']);
    expect(checkEligibility(s, older, e, c).reasons.join(' ')).toMatch(/shown publicly before January 1, 2026/);
    const newer = work(s, { format: 'short', runtime: 12, completed: '2026-01-02' });
    release(newer, 'streaming', '2026-02-01', ['US']);
    expect(checkEligibility(s, newer, e, c).eligible).toBe(true);
  });
});

describe('deadlines at the boundary, in the organizer\'s time zone', () => {
  it('Oscars general entry closes at 5:00 p.m. Pacific on November 12, 2026, whatever the player\'s time zone', () => {
    const s = startLife('dl', 'jp-tokyo');
    const e = ed(s, 'oscars-2027');
    const p = work(s, { format: 'feature', runtime: 95, completed: '2026-02-01' });
    release(p, 'theatrical', '2026-04-01', ['US']);
    const close = at('America/Los_Angeles', '2026-11-12', 17);
    expect(categoryDeadline(e, cat(e, 'picture'), p)).toBe(close);
    s.now = close - 1;
    expect(checkEligibility(s, p, e, cat(e, 'picture')).eligible).toBe(true);
    s.now = close + 1;
    expect(checkEligibility(s, p, e, cat(e, 'picture')).reasons).toContain('The entry deadline has passed.');
    // Shorts and documentaries close earlier, the edition stays open until its last deadline.
    expect(categoryDeadline(e, cat(e, 'live-short'))).toBe(at('America/Los_Angeles', '2026-10-08', 17));
    expect(categoryDeadline(e, cat(e, 'documentary'))).toBe(at('America/Los_Angeles', '2026-10-15', 17));
    // International Feature's own rules were read on November 9, 2026 (version 2): its materials are due September 30.
    // Until then it kept the game's deadline. Every category now has the Academy's, so the edition closes with the last.
    expect(categoryDeadline(e, cat(e, 'international'))).toBe(at('America/Los_Angeles', '2026-09-30', 17));
    expect(e.deadline).toBe(close);
  });

  it('Clermont-Ferrand closes July 9 for 2025 films and September 24 for 2026 films, at the end of the day in France', () => {
    const s = startLife('dl2');
    const e = ed(s, 'clermont-2027');
    const c = cat(e, 'international');
    const old = work(s, { format: 'short', runtime: 20, completed: '2025-11-01' });
    const fresh = work(s, { format: 'short', runtime: 20, completed: '2026-02-01' });
    const july = at('Europe/Paris', '2026-07-09', 23, 59, 59);
    expect(categoryDeadline(e, c, old)).toBe(july);
    expect(categoryDeadline(e, c, fresh)).toBe(at('Europe/Paris', '2026-09-24', 23, 59, 59));
    s.now = july;
    expect(checkEligibility(s, old, e, c).eligible).toBe(true);
    s.now = july + 1000;
    expect(checkEligibility(s, old, e, c).reasons).toContain('The entry deadline has passed.');
    expect(checkEligibility(s, fresh, e, c).eligible).toBe(true);
  });
});

describe('entries: duplicates, withdrawals, payments and recipients', () => {
  it('refuses a duplicate, lets a withdrawn entry be entered again without charging the fee twice', () => {
    const s = startLife('dup');
    s.now = at('Europe/Paris', '2026-06-01', 9);
    const e = ed(s, 'clermont-2027');
    const p = work(s, { format: 'short', runtime: 20, completed: '2026-02-01' });
    p.funding.fund = 10_000;
    const first = submitEntry(s, p, e.id, 'international');
    expect(() => submitEntry(s, p, e.id, 'international')).toThrow(/already entered/);
    withdrawEntry(s, e.id, first.id);
    expect(first.status).toBe('withdrawn');
    const second = submitEntry(s, p, e.id, 'international');
    expect(second.id).not.toBe(first.id);
    const fees = p.obligations.flatMap((o) => o.postings.filter((x) => x.kind === 'settle' && x.key.startsWith('fee:')));
    expect(fees.length).toBe(first.fee > 0 ? 1 : 0);
    expect(second.fee).toBe(0);
    withdrawEntry(s, e.id, second.id); // the new entry can be found and withdrawn too
    expect(second.status).toBe('withdrawn');
  });

  it('withdrawn entries are never selected', () => {
    const s = startLife('wd');
    s.now = at('Europe/Paris', '2026-06-01', 9);
    const e = ed(s, 'clermont-2027');
    const p = work(s, { format: 'short', runtime: 20, completed: '2026-02-01' });
    p.funding.fund = 10_000;
    p.quality = { overall: 99, reception: 99, direction: 99, script: 99 };
    const en = submitEntry(s, p, e.id, 'international');
    withdrawEntry(s, e.id, en.id);
    announceEdition(s, e);
    // Nothing of yours is in it, so nothing is stored; the public selection is computed when shown (from November 9, 2026).
    expect(e.results.international).toBeUndefined();
    expect(en.status).toBe('withdrawn');
    const shown = publicResult(s, e, cat(e, 'international'))!;
    expect(shown.field).not.toContain(p.title);
    expect(shown.field.length).toBeGreaterThan(0);
  });

  it('project awards name the credited people the organizer names: three producers at most for Best Picture, the director at Clermont', () => {
    const s = startLife('who');
    s.now = at('America/Los_Angeles', '2026-10-01', 9);
    const osc = ed(s, 'oscars-2027');
    const p = work(s, { format: 'feature', runtime: 95, completed: '2026-02-01', producers: 4 });
    p.credits.push(credit('ep', 'Executive Producer', 'executive-producer', 5));
    release(p, 'theatrical', '2026-04-01', ['US']);
    const named = checkEligibility(s, p, osc, cat(osc, 'picture')).recipients.map((c) => c.id);
    expect(named).toEqual(['pr1', 'pr2', 'pr3']);
    s.now = at('Europe/Paris', '2026-06-01', 9);
    const cf = ed(s, 'clermont-2027');
    const short = work(s, { format: 'short', runtime: 20, completed: '2026-02-01' });
    expect(checkEligibility(s, short, cf, cat(cf, 'international')).recipients.map((c) => c.contribution)).toEqual(['Directed By']);
    // Individual awards still need the individual: no credited lead, no acting entry.
    expect(checkEligibility(s, p, osc, cat(osc, 'actor')).reasons.join(' ')).toMatch(/No credited lead performance/);
  });
});

describe('history and saves', () => {
  /** A version-2 save as the previous build wrote it: rivals in full on every edition, no rules recorded. */
  function asVersion2(s: GameState): Record<string, unknown> {
    const raw = JSON.parse(JSON.stringify(s));
    raw.version = 2;
    delete raw.rivalFilms;
    for (const e of raw.editions) {
      delete e.rulesId;
      delete e.defaultDeadline;
      e.rivals = e.rivals.map((r: { id: string; film: string; score: number }) => {
        const f = s.rivalFilms[r.film];
        const catId = r.id.split(':')[1];
        return { id: r.id, title: f.title, people: f.people, format: f.format, medium: f.medium, runtimeMin: f.runtimeMin, premiereCountry: 'US', scores: { [catId]: r.score } };
      });
    }
    return raw;
  }

  it('migrating keeps every past result and title, stores each film once, and is idempotent', () => {
    const s = startLife('mig');
    // Results are stored only where you entered (from November 9, 2026), so this save enters every category it can.
    const p = work(s, { format: 'feature', runtime: 100, completed: '2026-01-10' });
    for (const id of ['venice-2026', 'tiff-2026', 'oscars-2027']) {
      const e = ed(s, id);
      for (const c of categoriesFor(institution(e.institutionId), e.year).filter((x) => x.formats.includes('feature') && !x.kind?.match(/prize|audience|partner|honorary/))) {
        e.entries.push({ id: `${e.id}:${c.id}`, projectId: p.id, categoryId: c.id, submittedAt: 0, status: 'accepted', recipients: [], fee: 0 });
      }
      announceEdition(s, e);
    }
    const before = Object.fromEntries(s.editions.map((e) => [e.id, Object.fromEntries(Object.entries(e.results).map(([k, r]) => [k, r.rivalIds.map((x) => rivalTitle(s, e, x))]))]));
    const raw = asVersion2(s);
    const v3 = migrateV2toV3(JSON.parse(JSON.stringify(raw)));
    const data = JSON.stringify({ ...v3, version: 3 });
    const back = deserialize(JSON.stringify({ format: 'slate-save', version: 3, checksum: hashString(data), data }));
    const after = Object.fromEntries(back.editions.map((e) => [e.id, Object.fromEntries(Object.entries(e.results).map(([k, r]) => [k, r.rivalIds.map((x) => rivalTitle(back, e, x))]))]));
    expect(after).toEqual(before);
    expect(JSON.stringify(back.editions).length).toBeLessThan(JSON.stringify(raw.editions).length);
    expect(migrateV2toV3(JSON.parse(JSON.stringify(v3)))).toEqual(v3);
  });

  it('a past or entered edition keeps simulated rules; an untouched future one adopts the published rules and its deadline moves', () => {
    const s = startLife('adopt');
    const raw = asVersion2(s) as { editions: (Edition & { rulesId?: string })[]; events: { id: string; at: number }[]; now: number };
    const oscars = raw.editions.find((e) => e.id === 'oscars-2027')!;
    const sundance = raw.editions.find((e) => e.id === 'sundance-2027')!;
    sundance.entries.push({ id: 'x', projectId: 'p', categoryId: 'dramatic', submittedAt: 0, status: 'submitted', recipients: [], fee: 0 });
    const oldDeadline = oscars.deadline;
    const v3 = migrateV2toV3(raw as unknown as Record<string, unknown>) as unknown as GameState;
    const o = v3.editions.find((e) => e.id === 'oscars-2027')!;
    expect(o.rulesId).toBe('oscars-2027@5');
    expect(categoryDeadline(o, cat(o, 'picture'))).toBe(at('America/Los_Angeles', '2026-11-12', 17));
    expect(o.deadline).toBe(at('America/Los_Angeles', '2026-11-12', 17)); // every category has the Academy's deadline (version 2)
    expect(o.defaultDeadline).toBe(oldDeadline);
    expect(v3.events.find((x) => x.id === 'oscars-2027:deadline')?.at).toBe(o.deadline);
    expect(v3.editions.find((e) => e.id === 'sundance-2027')!.rulesId).toBe('simulated'); // someone entered: unchanged
    expect(v3.editions.find((e) => e.id === 'tiff-2026')!.rulesId).toBe('simulated'); // no published rules read
    expect(v3.editions.find((e) => e.id === 'venice-2026')!.rulesId).toBe('venice-2026@4'); // untouched, in the future
    const sorted = [...v3.events].sort((a, b) => a.at - b.at || a.priority - b.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    expect(v3.events.map((x) => x.id)).toEqual(sorted.map((x) => x.id));
  });

  it('an edition judged by simulated rules keeps them even after a rulebook exists for its year', () => {
    const s = startLife('keep');
    s.now = at('America/Los_Angeles', '2026-09-20', 9);
    const e = ed(s, 'oscars-2027');
    e.rulesId = 'simulated';
    const p = work(s, { format: 'short', runtime: 41, completed: '2026-01-10' });
    // Simulated rules: a short over 40 minutes is refused with the simulated wording, not the Academy's.
    expect(checkEligibility(s, p, e, cat(e, 'live-short')).reasons.join(' ')).toMatch(/Short categories need 40 or fewer/);
  });

  it('a version-2 save in storage opens, is backed up first, and saves as the current version', () => {
    const s = startLife('store');
    const raw = asVersion2(s);
    const data = JSON.stringify(raw);
    const text = JSON.stringify({ format: 'slate-save', version: 2, checksum: hashString(data), data });
    const kv = memoryStore();
    kv.setItem(`slate.v1.save.${s.saveId}`, text);
    const { state } = openSave(kv, s.saveId, 1);
    expect(state.version).toBe(SAVE_VERSION);
    expect(kv.getItem(`slate.v1.save.${s.saveId}.backup-v2`)).toBe(text);
    expect(writeSave(kv, state, 2).ok).toBe(true);
    expect(deserialize(kv.getItem(`slate.v1.save.${s.saveId}`)!).rivalFilms).toEqual(state.rivalFilms);
    expect(serialize(state)).toBe(kv.getItem(`slate.v1.save.${s.saveId}`));
  });
});

describe('audit counts', () => {
  it('537 categories follow verified rules for at least one edition, 11 only projected ones; the other 258 are simulated', () => {
    const rank = { simulated: 0, projected: 1, verified: 2 } as const;
    const best = (instId: string, catId: string) => RULEBOOKS.filter((b) => b.institutionId === instId)
      .map((b) => categoryRuleStatus(b, catId)).reduce<keyof typeof rank>((a, x) => (rank[x] > rank[a] ? x : a), 'simulated');
    const n = { verified: 0, projected: 0, simulated: 0 };
    for (const inst of INSTITUTIONS) for (const c of inst.categories) n[best(inst.id, c.id)] += 1;
    // 48 and 92 until November 9, 2026, when the rosters added 660 categories and the read rules were extended to the
    // Oscars' craft and adapted-screenplay categories, Sundance's World Cinema competitions, Orizzonti Corti and the
    // Annies' four TV categories (rulebooks.ts). 66 and 734 until International Feature Film's rules were read the same day,
    // and 67 and 733 until the Emmys' general eligibility was applied to their other 98 entered categories (emmys-2026@2);
    // 2 projected until the Berlinale's five other sections were read (berlinale-2027@2), 7 until Cannes' four feature
    // sections were (cannes-2027@2). 165 verified until Annecy's Contrechamp, Off-Limits, Perspectives and TV (annecy-2026@2),
    // 169 until Venice's Out of Competition and Spotlight (venice-2026@2), 171 until San Sebastián's other six sections
    // (san-sebastian-2026@2), 177 until the Golden Globes' other 19 entered categories (golden-globes-2027@2), 196
    // until the Annies' other 20 categories held in 2027 (annie-2027@2), 216 until Clermont's Lab and National (clermont-2027@2),
    // 218 until Sitges' six sections (sitges-2026@1), 224 until the Giornate degli Autori (venice-2026@3),
    // 225 until IDFA's five sections (idfa-2026@1), 230 until Hot Docs (hot-docs-2027@1), 231 until the
    // Canadian Screen Awards' 115 entered categories (canadian-screen-2026@1), 346 until the Goyas' 23 feature categories (goya-2027@1),
    // 369 until the Césars' 25 (cesar-2027@1), 394 until the Spirit Awards' 20 (spirit-2027@1),
    // 414 until the Actor Awards' 13 (actor-awards-2027@1), 427 until the DGA's feature award (dga-2027@1),
    // 428 until the WGA's 16 (wga-2027@1), 444 until the Gothams' 10 film categories (gotham-2026@1),
    // 454 until the PGA's two film awards (pga-2027@1), 456 until Outstanding Narrator (emmys-2026@3). 335 simulated until
    // SXSW's Music Video Competition, its jury award and the International Emmys' Sports Documentary were entered, under
    // terms that weren't readable from here.
    // 457 until Venice's Critics' Week read its own regulations (venice-2026@4), 458 until the Goyas' European,
    // Ibero-American and short film awards read their specific Bases (goya-2027@2), 463 until the PGA's documentary award
    // (pga-2027@2), 464 until the WGA's Documentary Screenplay (wga-2027@2), 465 until the DGA's seven television awards
    // (dga-2027@2), 472 until the AACTA's 31 film, television, documentary and short categories (aacta-2027@1), 503 until the
    // Japan Academy's 17 (japan-academy-2027@1), 520 until the PGA's nine television awards (pga-2027@3), 529 until the
    // WGA's Paul Selvin, the Spirit Awards' Redford and the AACTA's song award took rules by format (byFormat), 532 until the
    // AACTA's soundtrack, hair and makeup, and visual effects or animation did (aacta-2027@3), 535 until the DGA's
    // first-time feature (dga-2027@3), 536 until the AACTA's online series (aacta-2027@4).
    expect(n).toEqual({ verified: 537, projected: 11, simulated: 258 });
  });
});

describe('finished editions are kept compactly', () => {
  it('keeps every nominee, winner and entry after results, without the judging strengths', async () => {
    const { processUntil, DAY } = await import('../src/engine');
    const s = startLife('compact');
    const e = ed(s, 'venice-2026');
    announceEdition(s, e);
    const before = Object.fromEntries(Object.entries(e.results).map(([k, r]) => [k, r.rivalIds.map((x) => rivalTitle(s, e, x))]));
    processUntil(s, e.end + 2 * DAY, 'tick', 1_000_000);
    expect(e.status).toBe('complete');
    expect(e.compact).toBe(true);
    expect(e.rivals).toEqual([]);
    const after = Object.fromEntries(Object.entries(e.results).map(([k, r]) => [k, r.rivalIds.map((x) => rivalTitle(s, e, x))]));
    expect(after).toEqual(before);
    for (const r of Object.values(e.results)) if (r.winner) expect(rivalTitle(s, e, r.winner) ?? s.projects.find((p) => p.id === r.winner)?.title).toBeTruthy();
    expect(deserialize(serialize(s)).editions.find((x) => x.id === e.id)).toEqual(JSON.parse(JSON.stringify(e)));
  });
});

describe('rules read on November 6, 2026: Annecy, Venice, Berlinale, Golden Globes, Emmys', () => {
  const r = (s: GameState, p: Project, e: Edition, c: string) => checkEligibility(s, p, e, cat(e, c)).reasons.join(' ');

  it('Annecy 2026 features: over 60 minutes, completed after January 1, 2025, not shown in France except at Cannes', () => {
    const s = startLife('an');
    s.now = at('Europe/Paris', '2026-03-01', 9);
    const e = ed(s, 'annecy-2026');
    const f = (rt: number, done = '2025-06-01') => work(s, { format: 'feature', medium: 'animation', runtime: rt, completed: done, base: 'gb-london' });
    expect(r(s, f(60), e, 'features')).toMatch(/more than 60/);
    expect(r(s, f(61), e, 'features')).toBe('');
    expect(r(s, f(90, '2025-01-01'), e, 'features')).toMatch(/completed from January 2, 2025/);
    const shownInFrance = f(90);
    release(shownInFrance, 'theatrical', '2026-02-01', ['FR']);
    expect(r(s, shownInFrance, e, 'features')).toMatch(/shown publicly in France/);
    const atCannes = f(90);
    atCannes.premiere = { kind: 'world', date: '2025-05-20', country: 'FR', venue: 'Cannes', editionId: 'cannes-2026' };
    s.editions.push({ ...ed(s, 'cannes-2027'), id: 'cannes-2026', year: 2026, entries: [], results: {}, rivals: [] });
    expect(r(s, atCannes, e, 'features')).not.toMatch(/shown publicly in France/);
    // Shorts: under 60 minutes, and the February deadline in France.
    const short = work(s, { format: 'short', medium: 'animation', runtime: 59, completed: '2025-06-01', base: 'gb-london' });
    expect(categoryDeadline(e, cat(e, 'shorts'), short)).toBe(at('Europe/Paris', '2026-02-14', 23, 59, 59));
    s.now = at('Europe/Paris', '2026-02-01', 9);
    expect(r(s, short, e, 'shorts')).toBe('');
    expect(categoryRuleStatus(rulebook('annecy-2027@1'), 'features')).toBe('projected');
  });

  it('Venice 2026: Orizzonti shorts 20 minutes at most and close May 28; features 60 or more and close June 4; world premieres only', () => {
    const s = startLife('ve');
    s.now = at('Europe/Rome', '2026-05-01', 9);
    const e = ed(s, 'venice-2026');
    const short = (rt: number) => work(s, { format: 'short', runtime: rt, completed: '2026-01-10', base: 'gb-london' });
    const feat = (rt: number) => work(s, { format: 'feature', runtime: rt, completed: '2026-01-10', base: 'gb-london' });
    // Shorts have their own section, Orizzonti Corti, from November 9, 2026.
    expect(r(s, short(20), e, 'orizzonti-corti')).toBe('');
    expect(r(s, short(21), e, 'orizzonti-corti')).toMatch(/20 minutes or less/);
    expect(r(s, short(20), e, 'orizzonti')).toMatch(/doesn't accept short/);
    expect(r(s, feat(59), e, 'orizzonti')).toMatch(/at least 60/);
    expect(categoryDeadline(e, cat(e, 'orizzonti-corti'), short(10))).toBe(at('Europe/Rome', '2026-05-28', 23, 59, 59));
    expect(categoryDeadline(e, cat(e, 'orizzonti'), feat(90))).toBe(at('Europe/Rome', '2026-06-04', 23, 59, 59));
    const streamed = feat(90);
    release(streamed, 'streaming', '2026-03-01', ['GB']);
    expect(r(s, streamed, e, 'competition')).toMatch(/world premiere|online/);
    expect(r(s, feat(90), e, 'competition')).toBe('');
  });

  it('Berlinale 2027 competition, projected from an undated page: nothing on television or online first', () => {
    const s = startLife('bl');
    s.now = at('Europe/Berlin', '2026-10-01', 9);
    const e = ed(s, 'berlinale-2027');
    const p = work(s, { format: 'feature', runtime: 95, completed: '2026-06-01', base: 'gb-london' });
    release(p, 'broadcast', '2026-09-01', ['GB']);
    expect(r(s, p, e, 'competition')).toMatch(/television or online/);
    expect(categoryRuleStatus(rulebook(e.rulesId), 'competition')).toBe('projected');
  });

  it('Golden Globes 2027: films 70 minutes or more with a 2026 US theatrical or pay-per-view release; US television only; animated names directors and producers', () => {
    const s = startLife('gg');
    s.now = at('America/Los_Angeles', '2026-11-01', 9);
    const e = ed(s, 'golden-globes-2027');
    const film = (rt: number, medium: Project['axes']['medium'] = 'live-action') => work(s, { format: 'feature', medium, runtime: rt, completed: '2026-01-10' });
    const short = film(69);
    release(short, 'theatrical', '2026-03-01', ['US']);
    expect(r(s, short, e, 'drama')).toMatch(/at least 70/);
    const streamedOnly = film(95);
    release(streamedOnly, 'streaming', '2026-03-01', ['US']);
    expect(r(s, streamedOnly, e, 'drama')).toMatch(/needs a release in the United States/);
    const anim = film(90, 'animation');
    release(anim, 'digital', '2026-03-01', ['US']);
    expect(checkEligibility(s, anim, e, cat(e, 'animated')).recipients.map((c) => c.contribution).sort()).toEqual(['Directed By', 'Produced By', 'Produced By']);
    const series = work(s, { format: 'series', runtime: 30, completed: '2026-01-10', base: 'gb-london' });
    release(series, 'streaming', '2026-03-01', ['US']);
    expect(r(s, series, e, 'tv-drama')).toMatch(/for work made in the United States/);
  });

  it('Berlinale 2027, version 2 (projected): Panorama takes a European premiere, not a film shown in Italy or in Germany; Shorts up to 30 minutes', () => {
    const s = startLife('bl2');
    const e = ed(s, 'berlinale-2027');
    expect(e.rulesId).toBe('berlinale-2027@2');
    s.now = e.submissionOpens + DAY;
    const film = (shownIn?: string) => {
      const p = work(s, { format: 'feature', runtime: 95, completed: '2026-06-01', base: 'fr-paris' });
      if (shownIn) release(p, 'theatrical', '2026-09-01', [shownIn]);
      return p;
    };
    for (const id of ['perspectives', 'panorama', 'forum', 'generation', 'shorts']) expect(categoryRuleStatus(rulebook(e.rulesId), id), id).toBe('projected');
    expect(r(s, film(), e, 'panorama')).toBe('');
    expect(r(s, film('FR'), e, 'panorama')).toBe(''); // shown at home only
    expect(r(s, film('US'), e, 'panorama')).not.toMatch(/premiere|Germany/); // outside Europe
    expect(r(s, film('IT'), e, 'panorama')).toMatch(/at least a European premiere/);
    expect(r(s, film('DE'), e, 'panorama')).toMatch(/shown publicly in Germany/);
    const old = work(s, { format: 'feature', runtime: 95, completed: '2026-01-15', base: 'fr-paris' });
    expect(r(s, old, e, 'forum')).toMatch(/completed on January 15, 2026/);
    const short = (runtime: number) => work(s, { format: 'short', runtime, completed: '2026-06-01', base: 'fr-paris' });
    expect(r(s, short(30), e, 'shorts')).not.toMatch(/minutes/);
    expect(r(s, short(31), e, 'shorts')).toMatch(/30 minutes or less/);
    expect(r(s, short(21), e, 'generation')).toMatch(/20 minutes or less/);
  });

  it('Cannes 2027, version 2 (projected from 2026 Article 4): its feature sections take films shown only at home, not online, made in the year before', () => {
    const s = startLife('fdc2');
    const e = ed(s, 'cannes-2027');
    expect(e.rulesId).toBe('cannes-2027@2');
    s.now = e.submissionOpens + DAY;
    const film = (completed = '2026-08-01') => work(s, { format: 'feature', runtime: 110, completed, base: 'fr-paris' });
    for (const id of ['competition', 'un-certain-regard', 'cannes-premiere', 'special']) {
      expect(r(s, film(), e, id), id).not.toMatch(/premiere|online|completed/);
      const abroad = film();
      release(abroad, 'theatrical', '2026-10-01', ['BE']);
      expect(r(s, abroad, e, id), id).toMatch(/international premiere/);
      const online = film();
      release(online, 'streaming', '2026-10-01', ['FR']);
      expect(r(s, online, e, id), id).toMatch(/released online/);
      expect(r(s, film('2026-05-01'), e, id), id).toMatch(/completed on May 1, 2026/);
    }
    expect(categoryDeadline(e, cat(e, 'competition'))).toBe(at('Europe/Paris', '2027-03-13', 23, 59) + 59_000);
  });

  it('Annecy 2026, version 2: Contrechamp reads the feature terms, Off-Limits and Perspectives the short film terms, TV its own regulations', () => {
    const s = startLife('an2');
    const e = ed(s, 'annecy-2026');
    expect(e.rulesId).toBe('annecy-2026@2');
    s.now = at('Europe/Paris', '2026-02-01', 9);
    const f60 = work(s, { format: 'feature', runtime: 60, completed: '2025-06-01', base: 'gb-london', medium: 'animation' });
    expect(r(s, f60, e, 'contrechamp')).toMatch(/more than 60/);
    const fr = work(s, { format: 'feature', runtime: 80, completed: '2025-06-01', base: 'gb-london', medium: 'animation' });
    release(fr, 'theatrical', '2026-01-10', ['FR']);
    expect(r(s, fr, e, 'contrechamp')).toMatch(/shown publicly in France/);
    const old = work(s, { format: 'short', runtime: 8, completed: '2024-12-01', base: 'gb-london', medium: 'animation' });
    for (const id of ['off-limits', 'perspectives']) expect(r(s, old, e, id), id).toMatch(/completed on December 1, 2024/);
    const ep = work(s, { format: 'series', runtime: 22, completed: '2024-12-01', base: 'gb-london', medium: 'animation' });
    expect(r(s, ep, e, 'tv')).toMatch(/completed on December 1, 2024/);
    expect(categoryDeadline(e, cat(e, 'tv'))).toBe(at('Europe/Paris', '2026-02-14', 23, 59) + 59_000);
  });

  it('Venice 2026, version 2: Out of Competition and Spotlight take the Official Selection\'s criteria; Spotlight runs longer than 60 minutes', () => {
    const s = startLife('ve2');
    const e = ed(s, 'venice-2026');
    s.now = at('Europe/Rome', '2026-04-01', 9);
    const film = (runtime: number, completed = '2026-01-10') => work(s, { format: 'feature', runtime, completed, base: 'it-rome' });
    expect(r(s, film(60), e, 'spotlight')).toMatch(/more than 60/);
    expect(r(s, film(61), e, 'spotlight')).not.toMatch(/minutes|premiere|completed/);
    expect(r(s, film(95, '2025-09-06'), e, 'out-of-competition')).toMatch(/completed on September 6, 2025/);
    const shown = film(95);
    release(shown, 'theatrical', '2026-03-01', ['IT']);
    expect(r(s, shown, e, 'out-of-competition')).toMatch(/world premiere/); // not even at home
    expect(categoryRuleStatus(rulebook('venice-2026@2'), 'sic')).toBe('simulated'); // its own association's regulations, read in version 4
  });

  it('San Sebastián 2026, version 2: every section reads section II; shorts have no open entry', () => {
    const s = startLife('ss2');
    const e = ed(s, 'san-sebastian-2026');
    s.now = at('Europe/Madrid', '2026-05-01', 9);
    const film = (format: Project['axes']['format'], runtime: number, completed = '2026-01-10') => work(s, { format, runtime, completed, base: 'ar-buenos-aires' });
    expect(r(s, film('feature', 60), e, 'horizontes')).toMatch(/more than 60/);
    expect(r(s, film('feature', 90, '2025-09-17'), e, 'perlak')).toMatch(/completed on September 17, 2025/);
    expect(r(s, film('short', 15), e, 'zabaltegi')).toMatch(/more than 60/);
    const streamed = film('feature', 90);
    release(streamed, 'streaming', '2026-03-01', ['AR']);
    expect(r(s, streamed, e, 'velodrome')).toMatch(/released online/);
    expect(categoryDeadline(e, cat(e, 'new-directors'))).toBe(at('Europe/Madrid', '2026-06-16', 23, 59) + 59_000);
  });

  it('Golden Globes 2027, version 2: Non-English Language needs a run in its country of origin, not in the US; TV acting reads the television rules', () => {
    const s = startLife('gg2');
    const e = ed(s, 'golden-globes-2027');
    expect(e.rulesId).toBe('golden-globes-2027@5'); // versions 3 and 4 add Non-English Language's dialogue share and the box-office threshold (tests/recipient-rules.test.ts); 5 Best Original Song's rule
    s.now = at('America/Los_Angeles', '2026-11-01', 9);
    const film = (where: string) => {
      const p = work(s, { format: 'feature', runtime: 100, completed: '2026-01-10', base: 'es-madrid' });
      p.axes.dialogueLanguages = ['es'];
      release(p, 'theatrical', '2026-03-01', [where]);
      return p;
    };
    expect(r(s, film('ES'), e, 'non-english')).toBe('');
    expect(r(s, film('US'), e, 'non-english')).toMatch(/theatrical release in Spain between January 1, 2026 and December 31, 2026/);
    expect(checkEligibility(s, film('ES'), e, cat(e, 'non-english')).recipients.map((c) => c.contribution).sort()).toEqual(['Directed By', 'Produced By', 'Produced By']);
    expect(r(s, film('ES'), e, 'actress-drama')).toMatch(/release in the United States/); // the film rules: a US run
    const show = work(s, { format: 'series', runtime: 45, completed: '2026-01-10', base: 'gb-london' });
    release(show, 'streaming', '2026-02-01', ['US']);
    expect(r(s, show, e, 'tv-actor-drama')).toMatch(/for work made in the United States/);
  });

  it('Annies 2027, version 2: every 2027 category reads the call for submissions: a US release in 2026, shorts exempt, by November 30', () => {
    const s = startLife('an54');
    const e = ed(s, 'annie-2027');
    expect(e.rulesId).toBe('annie-2027@2');
    s.now = at('America/Los_Angeles', '2026-10-01', 9);
    const series = (where: string) => {
      const p = work(s, { format: 'series', medium: 'animation', runtime: 22, completed: '2026-01-10', base: 'gb-london' });
      release(p, 'streaming', '2026-03-01', [where]);
      return p;
    };
    expect(r(s, series('GB'), e, 'fx-tv')).toMatch(/release in the United States between January 1, 2026 and December 31, 2026/);
    expect(r(s, series('US'), e, 'fx-tv')).not.toMatch(/release/);
    expect(categoryDeadline(e, cat(e, 'editorial-feature'))).toBe(at('America/Los_Angeles', '2026-11-30', 23, 59) + 59_000);
  });

  it('Clermont-Ferrand 2027, version 2: Lab reads the international rules; the National Competition takes French films under 60 minutes, until October 1', () => {
    const s = startLife('cf2');
    const e = ed(s, 'clermont-2027');
    expect(e.rulesId).toBe('clermont-2027@2');
    s.now = at('Europe/Paris', '2026-08-01', 9);
    const short = (base: string, runtime: number, completed = '2026-03-01') => work(s, { format: 'short', runtime, completed, base });
    expect(r(s, short('fr-paris', 59), e, 'national')).not.toMatch(/minutes|made in|completed/);
    expect(r(s, short('fr-paris', 60), e, 'national')).toMatch(/under 60 minutes/);
    expect(r(s, short('de-berlin', 20), e, 'national')).toMatch(/for work made in France/);
    expect(r(s, short('fr-paris', 20), e, 'lab')).toMatch(/national competition instead/);
    expect(r(s, short('de-berlin', 41), e, 'lab')).toMatch(/40 minutes or less/);
    // Films finished in 2025 close July 9; 2026 films October 1.
    expect(r(s, short('fr-paris', 20, '2025-11-01'), e, 'national')).toMatch(/deadline has passed/);
    expect(r(s, short('fr-paris', 20), e, 'national')).not.toMatch(/deadline/);
    expect(categoryDeadline(e, cat(e, 'national'), short('fr-paris', 20))).toBe(at('Europe/Paris', '2026-10-01', 23, 59) + 59_000);
  });

  it('Sitges 2026: films unreleased in Spain, made in 2025 or 2026; the Official Selection\'s features at least 60 minutes and its shorts at most 30; noon on July 16', () => {
    const s = startLife('sg');
    const e = ed(s, 'sitges-2026');
    expect(e.rulesId).toBe('sitges-2026@1');
    s.now = at('Europe/Madrid', '2026-06-01', 9);
    const film = (format: Project['axes']['format'], runtime: number, completed = '2026-01-10', shownIn?: string) => {
      const p = work(s, { format, runtime, completed, base: 'gb-london' });
      if (shownIn) release(p, 'theatrical', '2026-03-01', [shownIn]);
      return p;
    };
    expect(r(s, film('feature', 95), e, 'fantastic')).not.toMatch(/minutes|shown|completed|online|deadline/); // its genre is the catalog's requirement
    expect(r(s, film('feature', 59), e, 'fantastic')).toMatch(/at least 60/);
    expect(r(s, film('short', 31), e, 'fantastic')).toMatch(/30 minutes or less/);
    expect(r(s, film('feature', 95, '2026-01-10', 'ES'), e, 'panorama')).toMatch(/shown publicly in Spain/);
    expect(r(s, film('feature', 95, '2026-01-10', 'FR'), e, 'panorama')).not.toMatch(/shown publicly/);
    expect(r(s, film('feature', 95, '2024-12-01'), e, 'midnight')).toMatch(/completed on December 1, 2024/);
    expect(categoryDeadline(e, cat(e, 'documenta'))).toBe(at('Europe/Madrid', '2026-07-16', 12));
  });

  it('Venice 2026, version 3: the Giornate degli Autori take films over 60 minutes, made after September 30, 2025, not yet released, by June 15', () => {
    const s = startLife('gda');
    const e = ed(s, 'venice-2026');
    expect(e.rulesId).toBe('venice-2026@4'); // version 4 adds Critics' Week
    s.now = at('Europe/Rome', '2026-05-01', 9);
    const film = (runtime: number, completed = '2026-01-10') => work(s, { format: 'feature', runtime, completed, base: 'ar-buenos-aires' });
    expect(r(s, film(95), e, 'giornate')).toBe('');
    expect(r(s, film(60), e, 'giornate')).toMatch(/more than 60/);
    expect(r(s, film(95, '2025-09-30'), e, 'giornate')).toMatch(/completed on September 30, 2025/);
    const released = film(95);
    release(released, 'theatrical', '2026-03-01', ['AR']); // a release at home counts too
    expect(r(s, released, e, 'giornate')).toMatch(/already been released/);
    expect(categoryDeadline(e, cat(e, 'giornate'))).toBe(at('Europe/Rome', '2026-06-15', 23, 59) + 59_000);
  });

  it('Venice 2026, version 4: Critics\' Week takes a director\'s first feature, 60 minutes or more, made since September 2, 2025, by June 19', () => {
    const s = startLife('sic');
    const e = ed(s, 'venice-2026');
    expect(e.rulesId).toBe('venice-2026@4');
    expect(categoryRuleStatus(rulebook('venice-2026@3'), 'sic')).toBe('simulated'); // version 3 hadn't read them
    s.now = at('Europe/Rome', '2026-05-01', 9);
    const film = (runtime: number, base = 'ar-buenos-aires', completed = '2026-01-10') => {
      const p = work(s, { format: 'feature', runtime, completed, base });
      p.credits[0] = { ...p.credits[0], person: 'player' }; // the player's own first feature (the catalog's debut requirement)
      return p;
    };
    expect(r(s, film(95), e, 'sic')).toBe('');
    expect(r(s, film(59), e, 'sic')).toMatch(/60/);
    expect(r(s, film(95, 'ar-buenos-aires', '2025-09-01'), e, 'sic')).toMatch(/completed on September 1, 2025/);
    const online = film(95);
    release(online, 'streaming', '2026-03-01', ['AR']);
    expect(r(s, online, e, 'sic')).toMatch(/online|internet/i);
    const home = film(95);
    release(home, 'festival-premiere', '2026-03-01', ['AR']); // shown at home: allowed for a film from Argentina
    expect(r(s, home, e, 'sic')).not.toMatch(/premiere/);
    const italian = film(95, 'it-rome');
    release(italian, 'festival-premiere', '2026-03-01', ['IT']); // an Italian film must be a world premiere
    expect(r(s, italian, e, 'sic')).toMatch(/requires a world premiere/);
    expect(categoryDeadline(e, cat(e, 'sic'))).toBe(at('Europe/Rome', '2026-06-19', 23, 59) + 59_000);
  });

  it('SXSW 2027: the submissions page gives the final deadline and fees, not eligibility, so eligibility stays SLATE\'s', () => {
    const s = startLife('sxsw');
    const e = ed(s, 'sxsw-2027');
    expect(e.rulesId).toBe('sxsw-2027@1');
    expect(categoryDeadline(e, cat(e, 'music-videos'))).toBe(at('America/Los_Angeles', '2026-10-01', 23, 59) + 59_000);
    expect(cat(e, 'music-videos').fee).toBe(90);
    expect(cat(e, 'narrative').fee).toBe(125);
    expect(categoryRuleStatus(rulebook('sxsw-2027@1'), 'music-videos')).toBe('simulated'); // a deadline alone isn't eligibility
  });

  it('Goyas, version 2: European and Ibero-American films by their home release; Spanish shorts through a festival selection', () => {
    const s = startLife('goya2');
    const e = ed(s, 'goya-2027');
    expect(e.rulesId).toBe('goya-2027@3');
    s.now = at('Europe/Madrid', '2026-08-01', 9);
    const fr = work(s, { format: 'feature', runtime: 95, completed: '2026-01-10', base: 'fr-paris' });
    release(fr, 'theatrical', '2026-04-01', ['FR']);
    expect(r(s, fr, e, 'european')).toBe('');
    const streamedFirst = work(s, { format: 'feature', runtime: 95, completed: '2026-01-10', base: 'fr-paris' });
    release(streamedFirst, 'streaming', '2026-03-01', ['FR']);
    release(streamedFirst, 'theatrical', '2026-04-01', ['FR']);
    expect(r(s, streamedFirst, e, 'european')).toMatch(/outside cinemas in France, before any theatrical run there/);
    const inSpainOnly = work(s, { format: 'feature', runtime: 95, completed: '2026-01-10', base: 'fr-paris' });
    release(inSpainOnly, 'theatrical', '2026-04-01', ['ES']);
    expect(r(s, inSpainOnly, e, 'european')).toMatch(/theatrical release in France/);
    const ar = work(s, { format: 'feature', runtime: 95, completed: '2026-01-10', base: 'ar-buenos-aires' });
    release(ar, 'theatrical', '2025-11-15', ['AR']); // November 2025 is inside the window
    expect(r(s, ar, e, 'iberoamerican')).toBe('');
    // Shorts: no release qualifies; a selection at an Annex V festival does.
    const short = work(s, { format: 'short', runtime: 15, completed: '2026-01-10', base: 'es-madrid' });
    release(short, 'theatrical', '2026-04-01', ['ES']);
    expect(r(s, short, e, 'short-fiction')).toMatch(/It needs a selection at .*Clermont.* between October 1, 2024 and September 30, 2026\./);
    const clermont = s.editions.find((x) => x.institutionId === 'clermont' && x.end < at('UTC', '2026-09-30', 0) && x.end > at('UTC', '2024-10-01', 0))!;
    clermont.entries.push({ id: 'sel', projectId: short.id, categoryId: 'national', submittedAt: 0, status: 'selected', recipients: [], fee: 0 });
    expect(r(s, short, e, 'short-fiction')).toBe('');
    expect(r(s, work(s, { format: 'short', runtime: 15, completed: '2024-09-01', base: 'es-madrid' }), e, 'short-fiction')).toMatch(/completed on September 1, 2024/);
    expect(categoryDeadline(e, cat(e, 'short-fiction'))).toBe(at('Europe/Madrid', '2026-09-04', 14));
    expect(categoryDeadline(e, cat(e, 'european'))).toBe(at('Europe/Madrid', '2026-09-10', 14));
  });

  it('PGA 2027, version 2: a documentary qualifies by a US run, a US premiere on television or streaming, or a listed festival selection', () => {
    const s = startLife('pga-doc');
    const e = ed(s, 'pga-2027');
    expect(e.rulesId).toBe('pga-2027@3'); // version 3 adds the television awards; the documentary keeps version 2's rules
    s.now = at('America/Los_Angeles', '2026-07-01', 9);
    const doc = () => work(s, { format: 'documentary-feature', runtime: 85, completed: '2026-01-10' });
    const run = doc();
    release(run, 'theatrical', '2026-03-01', ['US']);
    expect(r(s, run, e, 'documentary')).toBe('');
    const streamed = doc();
    release(streamed, 'streaming', '2026-03-01', ['US']);
    expect(r(s, streamed, e, 'documentary')).toBe('');
    const unseen = doc();
    expect(r(s, unseen, e, 'documentary')).toMatch(/or a selection at .*Hot Docs/);
    const hotDocs = s.editions.find((x) => x.institutionId === 'hot-docs' && x.year === 2026)!;
    hotDocs.entries.push({ id: 'hd', projectId: unseen.id, categoryId: 'festival', submittedAt: 0, status: 'selected', recipients: [], fee: 0 });
    expect(r(s, unseen, e, 'documentary')).toBe('');
    expect(r(s, work(s, { format: 'documentary-feature', runtime: 40, completed: '2026-01-10' }), e, 'documentary')).toMatch(/more than 40/);
    expect(categoryDeadline(e, cat(e, 'documentary'))).toBe(at('America/Los_Angeles', '2026-08-28', 23, 59) + 59_000);
  });

  it('WGA 2027, version 2: Documentary Screenplay needs feature length and a US run in 2026, not a television premiere', () => {
    const s = startLife('wga-doc');
    const e = ed(s, 'wga-2027');
    s.now = at('America/Los_Angeles', '2026-10-01', 9);
    const doc = (runtime = 90) => { const p = work(s, { format: 'documentary-feature', runtime, completed: '2026-01-10' }); p.credits.push(credit('w1', 'Written By', 'writer', 2)); return p; };
    const run = doc();
    release(run, 'theatrical', '2026-04-01', ['US']);
    expect(r(s, run, e, 'documentary-screenplay')).toBe('');
    const tvFirst = doc();
    release(tvFirst, 'broadcast', '2026-03-01', ['US']);
    release(tvFirst, 'theatrical', '2026-04-01', ['US']);
    expect(r(s, tvFirst, e, 'documentary-screenplay')).toMatch(/outside cinemas, before any theatrical run/);
    const short = doc(40);
    release(short, 'theatrical', '2026-04-01', ['US']);
    expect(r(s, short, e, 'documentary-screenplay')).toMatch(/more than 40/);
    expect(categoryDeadline(e, cat(e, 'documentary-screenplay'))).toBe(at('America/Los_Angeles', '2026-11-20', 17));
  });

  it('DGA 2027, version 2: television awards take one episode aired in 2026, by November 13; a TV movie shown in US cinemas first is out', () => {
    const s = startLife('dga-tv');
    const e = ed(s, 'dga-2027');
    s.now = at('America/Los_Angeles', '2026-10-01', 9);
    const show = (format: Project['axes']['format'], date: string) => {
      const p = work(s, { format, runtime: 50, completed: '2026-01-10' });
      p.axes.episodeCount = format === 'tv-film' ? 1 : 6;
      p.credits = [{ ...credit('d1', 'Directed By', 'director', 1), episodes: [1, 2] }, { ...credit('d2', 'Directed By', 'episode-director', 2), episodes: [3, 4, 5, 6] }];
      release(p, 'streaming', date, ['US']);
      return p;
    };
    const drama = show('series', '2026-03-01');
    drama.axes.register = 'drama';
    expect(checkEligibility(s, drama, e, cat(e, 'drama'), undefined, undefined, 3).recipients.map((c) => c.id)).toEqual(['d2']);
    expect(r(s, show('series', '2025-12-01'), e, 'drama')).toMatch(/2026/);
    const movie = show('tv-film', '2026-05-01');
    release(movie, 'theatrical', '2026-04-01', ['US']);
    expect(r(s, movie, e, 'movie')).toMatch(/opened in cinemas in the United States on April 1, 2026, before airing there/);
    expect(categoryDeadline(e, cat(e, 'drama'))).toBe(at('America/Los_Angeles', '2026-11-13', 17));
  });

  it('AACTA 2027: films and television released in Australia in 2026; documentaries and shorts by completion date; each by its own deadline', () => {
    const s = startLife('aacta');
    const e = ed(s, 'aacta-2027');
    expect(e.rulesId).toBe('aacta-2027@4');
    s.now = at('Australia/Sydney', '2026-07-01', 9);
    const film = (runtime = 100) => work(s, { format: 'feature', runtime, completed: '2026-01-10', base: 'au-sydney' });
    const streamed = film();
    release(streamed, 'streaming', '2026-05-01', ['AU']);
    expect(r(s, streamed, e, 'film')).toBe('');
    const abroad = film();
    release(abroad, 'theatrical', '2026-05-01', ['NZ']);
    expect(r(s, abroad, e, 'film')).toMatch(/in Australia/);
    const short = film(59);
    release(short, 'theatrical', '2026-05-01', ['AU']);
    expect(r(s, short, e, 'film')).toMatch(/60/);
    expect(categoryDeadline(e, cat(e, 'film'))).toBe(at('Australia/Sydney', '2026-09-28', 23, 59) + 59_000);
    // Television: a first episode in Australia in 2026; documentaries and shorts by completion date and length.
    const series = work(s, { format: 'series', runtime: 50, completed: '2026-01-10', base: 'au-sydney' });
    release(series, 'broadcast', '2026-03-01', ['AU']);
    expect(r(s, series, e, 'drama')).not.toMatch(/release|Australia/);
    expect(r(s, work(s, { format: 'documentary-feature', runtime: 75, completed: '2025-08-01', base: 'au-sydney' }), e, 'documentary')).toMatch(/completed on August 1, 2025/);
    expect(r(s, work(s, { format: 'short', runtime: 40, completed: '2026-01-10', base: 'au-sydney' }), e, 'short')).toMatch(/40/);
    expect(categoryDeadline(e, cat(e, 'short'))).toBe(at('Australia/Sydney', '2026-08-03', 23, 59) + 59_000);
    expect(categoryRuleStatus(rulebook('aacta-2027@1'), 'song')).toBe('simulated'); // shared with television: SLATE's
    // Online series (version 4): premiered online from October 18, 2025 to October 1, 2026, in two episodes or more.
    const online = (date: string, episodes = 6) => { const p = work(s, { format: 'web-series', runtime: 60, completed: '2025-06-01', base: 'au-sydney' }); p.axes.episodeCount = episodes; release(p, 'digital', date, ['AU']); return p; };
    expect(r(s, online('2025-10-18'), e, 'online-series')).not.toMatch(/release|between|episodes/);
    expect(r(s, online('2025-10-17'), e, 'online-series')).toMatch(/between October 18, 2025 and October 1, 2026/);
    expect(r(s, online('2026-03-01', 1), e, 'online-series')).toMatch(/It has 1 episode. This category needs/);
    expect(categoryDeadline(e, cat(e, 'online-series'))).toBe(at('Australia/Sydney', '2026-09-28', 23, 59) + 59_000);
  });

  it('International Emmys: the FAQ gives the January 31 noon deadline only, so eligibility stays SLATE\'s', () => {
    const s = startLife('iemmy');
    const e = ed(s, 'international-emmys-2027');
    expect(e.rulesId).toBe('international-emmys-2027@1');
    expect(categoryDeadline(e, cat(e, 'drama'))).toBe(at('America/New_York', '2027-01-31', 12));
    expect(categoryRuleStatus(rulebook('international-emmys-2026@1'), 'drama')).toBe('simulated');
  });

  it('Japan Academy 2027: a film of 40 minutes or more first released in Japanese cinemas in 2026; no documentaries; nothing streamed first', () => {
    const s = startLife('jap');
    const e = ed(s, 'japan-academy-2027');
    expect(e.rulesId).toBe('japan-academy-2027@1');
    s.now = at('Asia/Tokyo', '2026-10-01', 9);
    const film = (format: Project['axes']['format'] = 'feature', runtime = 110, base = 'jp-tokyo') => work(s, { format, runtime, completed: '2026-01-10', base });
    const jp = film();
    release(jp, 'theatrical', '2026-04-01', ['JP']);
    expect(r(s, jp, e, 'picture')).toBe('');
    const doc = film('documentary-feature');
    release(doc, 'theatrical', '2026-04-01', ['JP']);
    expect(r(s, doc, e, 'picture')).toMatch(/doesn't accept documentary/);
    const streamedFirst = film();
    release(streamedFirst, 'streaming', '2026-03-01', ['JP']);
    release(streamedFirst, 'theatrical', '2026-04-01', ['JP']);
    expect(r(s, streamedFirst, e, 'picture')).toMatch(/outside cinemas/);
    const us = film('feature', 110, 'us-los-angeles');
    release(us, 'theatrical', '2026-04-01', ['JP']);
    expect(r(s, us, e, 'foreign')).toBe(''); // a foreign film, released in Japanese cinemas
  });

  it('IDFA 2026: completed after July 10, 2025, not shown in the Netherlands, a European premiere at least, by July 9; each section\'s length', () => {
    const s = startLife('idfa');
    const e = ed(s, 'idfa-2026');
    expect(e.rulesId).toBe('idfa-2026@1');
    s.now = at('Europe/Amsterdam', '2026-06-01', 9);
    const doc = (format: Project['axes']['format'], runtime: number, shownIn?: string, completed = '2026-01-10') => {
      const p = work(s, { format, runtime, completed, base: 'ar-buenos-aires' });
      if (shownIn) release(p, 'theatrical', '2026-03-01', [shownIn]);
      return p;
    };
    expect(r(s, doc('documentary-feature', 90), e, 'features')).toBe('');
    expect(r(s, doc('documentary-feature', 60), e, 'features')).toMatch(/more than 60/);
    expect(r(s, doc('documentary-feature', 41), e, 'envision')).not.toMatch(/minutes/);
    expect(r(s, doc('documentary-short', 41), e, 'shorts')).toMatch(/40 minutes or less/);
    expect(r(s, doc('documentary-feature', 90, 'AR'), e, 'luminous')).toBe(''); // shown at home only
    expect(r(s, doc('documentary-feature', 90, 'US'), e, 'luminous')).toBe(''); // outside Europe: still a European premiere
    expect(r(s, doc('documentary-feature', 90, 'BE'), e, 'frontlight')).toMatch(/at least a European premiere/);
    expect(r(s, doc('documentary-feature', 90, 'NL'), e, 'frontlight')).toMatch(/shown publicly in the Netherlands/);
    expect(r(s, doc('documentary-feature', 90, undefined, '2025-07-10'), e, 'features')).toMatch(/completed on July 10, 2025/);
    expect(categoryDeadline(e, cat(e, 'shorts'))).toBe(at('Europe/Amsterdam', '2026-07-09', 23, 59) + 59_000);
  });

  it('Hot Docs 2027: documentaries completed after January 1, 2026, not online first, by January 4', () => {
    const s = startLife('hd');
    const e = ed(s, 'hot-docs-2027');
    expect(e.rulesId).toBe('hot-docs-2027@1');
    s.now = at('America/Toronto', '2026-11-20', 9);
    const doc = (completed: string) => work(s, { format: 'documentary-feature', runtime: 80, completed, base: 'ca-toronto' });
    expect(r(s, doc('2026-03-01'), e, 'festival')).toBe('');
    expect(r(s, doc('2026-01-01'), e, 'festival')).toMatch(/completed on January 1, 2026/);
    const online = doc('2026-03-01');
    release(online, 'streaming', '2026-06-01', ['CA']);
    expect(r(s, online, e, 'festival')).toMatch(/released online/);
    expect(categoryDeadline(e, cat(e, 'festival'))).toBe(at('America/Toronto', '2027-01-04', 23, 59) + 59_000);
  });

  it('Canadian Screen Awards: the 2026 edition closed November 3, 2025; 2027 projects the rules a year on, film and television apart', () => {
    const s = startLife('csa');
    const e26 = ed(s, 'canadian-screen-2026');
    const e = ed(s, 'canadian-screen-2027');
    expect(e.rulesId).toBe('canadian-screen-2027@2');
    expect(categoryDeadline(e26, cat(e26, 'film'))).toBe(at('America/Toronto', '2025-11-03', 23, 59) + 59_000); // past when a game starts
    s.now = at('America/Toronto', '2026-10-01', 9);
    const film = (format: Project['axes']['format'], runtime: number, where: string, route: Project['releases'][number]['route'] = 'theatrical') => {
      const p = work(s, { format, runtime, completed: '2026-01-10', base: 'ca-toronto' });
      release(p, route, '2026-05-01', [where]);
      return p;
    };
    expect(r(s, film('feature', 95, 'CA'), e, 'cinematography')).not.toMatch(/release|minutes/);
    expect(r(s, film('feature', 95, 'US'), e, 'cinematography')).toMatch(/release in Canada between January 1, 2026 and March 31, 2027/);
    expect(r(s, film('feature', 59, 'CA'), e, 'film')).toMatch(/at least 60/);
    expect(r(s, film('documentary-feature', 45, 'CA'), e, 'documentary')).toMatch(/more than 45/);
    expect(r(s, film('documentary-short', 45, 'CA'), e, 'short-documentary')).toMatch(/under 45/);
    const show = film('documentary-feature', 50, 'CA', 'broadcast'); // television's documentary program: the TV window, no film length
    expect(r(s, show, e, 'tv-documentary-program')).not.toMatch(/release|minutes/);
    expect(categoryDeadline(e, cat(e, 'drama'))).toBe(at('America/Toronto', '2026-11-03', 23, 59) + 59_000);
  });

  it('Goyas 2027 (41st): Spanish features released in Spanish cinemas in 2026, at least 60 minutes (documentaries 70), never online first, by September 9', () => {
    const s = startLife('goya');
    const e = ed(s, 'goya-2027');
    expect(e.rulesId).toBe('goya-2027@3'); // version 2 adds the specific Bases' categories, 3 Best Original Song's article 18; the features keep version 1's rules
    s.now = at('Europe/Madrid', '2026-08-01', 9);
    const film = (format: Project['axes']['format'], runtime: number, where = 'ES') => {
      const p = work(s, { format, runtime, completed: '2026-01-10', base: 'es-madrid' });
      release(p, 'theatrical', '2026-04-01', [where]);
      return p;
    };
    expect(r(s, film('feature', 95), e, 'cinematography')).not.toMatch(/release|minutes/);
    expect(r(s, film('feature', 59), e, 'film')).toMatch(/at least 60/);
    expect(r(s, film('documentary-feature', 69), e, 'documentary')).toMatch(/at least 70/);
    expect(r(s, film('feature', 95, 'FR'), e, 'film')).toMatch(/theatrical release in Spain between January 1, 2026 and December 31, 2026/);
    const streamed = film('feature', 95);
    release(streamed, 'streaming', '2026-02-01', ['US']);
    expect(r(s, streamed, e, 'film')).toMatch(/outside cinemas, before any theatrical run/);
    expect(categoryRuleStatus(rulebook('goya-2027@1'), 'european')).toBe('simulated'); // its own Bases, read in version 2
    expect(categoryDeadline(e, cat(e, 'film'))).toBe(at('Europe/Madrid', '2026-09-09', 14));
  });

  it('César 2027: features released in French cinemas in 2026; shorts under an hour, registered by July 15', () => {
    const s = startLife('cesar');
    const e = ed(s, 'cesar-2027');
    expect(e.rulesId).toBe('cesar-2027@1');
    s.now = at('Europe/Paris', '2026-07-01', 9);
    const film = (where: string, date = '2026-03-01') => {
      const p = work(s, { format: 'feature', runtime: 100, completed: '2026-01-10', base: 'fr-paris' });
      release(p, 'theatrical', date, [where]);
      return p;
    };
    expect(r(s, film('FR'), e, 'cinematography')).not.toMatch(/release/);
    expect(r(s, film('BE'), e, 'cinematography')).toMatch(/theatrical release in France between January 1, 2026 and December 31, 2026/);
    expect(r(s, film('FR', '2025-12-20'), e, 'film')).toMatch(/theatrical release in France/);
    const short = (runtime: number) => work(s, { format: 'short', runtime, completed: '2026-01-10', base: 'fr-paris' });
    expect(r(s, short(59), e, 'short-fiction')).not.toMatch(/minutes/);
    expect(r(s, short(60), e, 'short-fiction')).toMatch(/under 60 minutes/);
    expect(categoryDeadline(e, cat(e, 'short-fiction'))).toBe(at('Europe/Paris', '2026-07-15', 23, 59) + 59_000);
  });

  it('Spirit Awards 2027: 70 minutes, under $30 million, a US week, streaming or a selection at a listed festival in 2026; new series with two episodes', () => {
    const s = startLife('spirit');
    const e = ed(s, 'spirit-2027');
    expect(e.rulesId).toBe('spirit-2027@3'); // version 2 reads the 18-minute floor per episode, 3 the Redford award by format
    s.now = at('America/Los_Angeles', '2026-09-01', 9);
    const film = (runtime = 95) => work(s, { format: 'feature', runtime, completed: '2026-01-10', base: 'us-los-angeles' });
    const out = film();
    expect(r(s, out, e, 'feature')).toMatch(/release in the United States between January 1, 2026 and December 31, 2026, or a selection at Hot Docs, Sundance, SXSW, TIFF, Berlinale/);
    // A selection, not a win, at a listed festival qualifies it; one at Venice doesn't.
    const venice = film();
    ed(s, 'venice-2026').entries.push({ id: 'v', projectId: venice.id, categoryId: 'competition', submittedAt: 0, status: 'selected', recipients: [], fee: 0 });
    expect(r(s, venice, e, 'feature')).toMatch(/It needs/);
    const sundance = film();
    ed(s, 'sundance-2026').entries.push({ id: 's', projectId: sundance.id, categoryId: 'dramatic', submittedAt: 0, status: 'selected', recipients: [], fee: 0 });
    expect(r(s, sundance, e, 'feature')).not.toMatch(/It needs/);
    const rich = film();
    release(rich, 'theatrical', '2026-05-01', ['US']);
    (rich as Project & { finance?: { estimate?: number } }).finance = { ...(rich.finance ?? {}), estimate: 30_000_000 } as Project['finance'];
    expect(r(s, rich, e, 'feature')).toMatch(/under \$30,000,000/);
    expect(r(s, film(69), e, 'director')).toMatch(/at least 70/);
    const show = (eps: number, each = 30) => { const p = work(s, { format: 'series', runtime: eps * each, completed: '2026-01-10', base: 'us-los-angeles' }); p.axes.episodeCount = eps; release(p, 'streaming', '2026-03-01', ['US']); return p; };
    expect(r(s, show(1), e, 'series')).toMatch(/needs at least 2/);
    expect(r(s, show(2), e, 'series')).not.toMatch(/release|episode/);
    // Two 12-minute episodes run 24 minutes together; version 1 read that against the 18-minute floor and let it in.
    expect(r(s, show(2, 12), e, 'series')).toMatch(/Its episodes average 12 minutes\. This category needs episodes of at least 18\./);
    expect(categoryDeadline(e, cat(e, 'series'))).toBe(at('America/Los_Angeles', '2026-09-15', 23, 59) + 59_000);
  });

  it('Actor Awards 2027 (33rd): films over 60 minutes with a US run in 2026 and nothing outside cinemas first; series of six 20-minute episodes', () => {
    const s = startLife('aa33');
    const e = ed(s, 'actor-awards-2027');
    expect(e.rulesId).toBe('actor-awards-2027@2'); // version 2 reads the 20-minute floor per episode
    s.now = at('America/Los_Angeles', '2026-10-01', 9);
    const film = (runtime = 100) => { const p = work(s, { format: 'feature', runtime, completed: '2026-01-10', base: 'us-los-angeles' }); release(p, 'theatrical', '2026-06-01', ['US']); return p; };
    expect(r(s, film(), e, 'cast')).not.toMatch(/release|minutes/);
    expect(r(s, film(60), e, 'cast')).toMatch(/more than 60/);
    const streamedFirst = film();
    release(streamedFirst, 'streaming', '2026-05-01', ['GB']);
    expect(r(s, streamedFirst, e, 'male-lead')).toMatch(/outside cinemas, before any theatrical run/);
    const show = (eps: number, each = 30) => { const p = work(s, { format: 'series', runtime: eps * each, completed: '2026-01-10', base: 'us-los-angeles' }); p.axes.episodeCount = eps; release(p, 'streaming', '2026-03-01', ['US']); return p; };
    expect(r(s, show(5), e, 'ensemble-drama')).toMatch(/needs at least 6/);
    expect(r(s, show(6), e, 'ensemble-drama')).not.toMatch(/release|episode/);
    expect(r(s, show(6, 15), e, 'ensemble-drama')).toMatch(/Its episodes average 15 minutes\. This category needs episodes of at least 20\./);
    expect(categoryDeadline(e, cat(e, 'cast'))).toBe(at('America/Los_Angeles', '2026-11-02', 17));
  });

  it('DGA 2027 (79th): a feature over 40 minutes with a US run in 2026, entered by November 13 at 5 p.m. PT', () => {
    const s = startLife('dga');
    const e = ed(s, 'dga-2027');
    expect(e.rulesId).toBe('dga-2027@3'); // versions 2 and 3 add the television categories and the first-time feature; the feature keeps version 1's rules
    s.now = at('America/Los_Angeles', '2026-10-01', 9);
    const p = work(s, { format: 'feature', runtime: 41, completed: '2026-01-10', base: 'us-los-angeles' });
    expect(r(s, p, e, 'feature')).toMatch(/theatrical release in the United States between January 1, 2026 and December 31, 2026/);
    release(p, 'theatrical', '2026-06-01', ['US']);
    expect(r(s, p, e, 'feature')).not.toMatch(/release|minutes/);
    expect(categoryDeadline(e, cat(e, 'feature'))).toBe(at('America/Los_Angeles', '2026-11-13', 17));
    // The Michael Apted award (version 3): a first feature, not animated, in cinemas before anything else, by October 16.
    expect(r(s, p, e, 'first-feature')).not.toMatch(/release|minutes|animat|cinemas/);
    p.axes.medium = 'animation';
    expect(r(s, p, e, 'first-feature')).toMatch(/This category is for live action or hybrid work./);
    p.axes.medium = 'live-action';
    release(p, 'streaming', '2026-05-01', ['US']);
    expect(r(s, p, e, 'first-feature')).toMatch(/released on May 1, 2026 outside cinemas in the United States, before any theatrical run there/);
    expect(r(s, p, e, 'feature')).not.toMatch(/before any theatrical run/); // the feature award has no such rule
    expect(categoryDeadline(e, cat(e, 'first-feature'))).toBe(at('America/Los_Angeles', '2026-10-16', 17));
    expect(categoryRuleStatus(rulebook('dga-2027@3'), 'first-feature')).toBe('verified');
  });

  it('Writers Guild Awards 2027: screenplays with a US run in 2026 and no television first; series in 2026; talk and documentary November to October', () => {
    const s = startLife('wga');
    const e = ed(s, 'wga-2027');
    expect(e.rulesId).toBe('wga-2027@3'); // versions 2 and 3 add Documentary Screenplay and the Paul Selvin Award; the rest keep version 1's rules
    s.now = at('America/Los_Angeles', '2026-10-01', 9);
    const film = work(s, { format: 'feature', runtime: 100, completed: '2026-01-10', base: 'us-los-angeles' });
    release(film, 'broadcast', '2026-02-01', ['US']);
    release(film, 'theatrical', '2026-03-01', ['US']);
    expect(r(s, film, e, 'original')).toMatch(/outside cinemas, before any theatrical run/);
    const show = (format: Project['axes']['format'], date: string) => { const p = work(s, { format, runtime: 30, completed: '2025-06-01', base: 'gb-london' }); release(p, 'streaming', date, ['GB']); return p; };
    expect(r(s, show('series', '2026-02-01'), e, 'drama-series')).not.toMatch(/release/); // no country named
    expect(r(s, show('series', '2025-12-01'), e, 'drama-series')).toMatch(/between January 1, 2026 and December 31, 2026/);
    expect(r(s, show('unscripted-series', '2025-12-01'), e, 'talk-series')).not.toMatch(/release/);
    expect(categoryDeadline(e, cat(e, 'talk-series'))).toBe(at('America/Los_Angeles', '2026-11-20', 17));
  });

  it('mixed film and television awards take each work under its own rules: the WGA\'s Paul Selvin, the Spirit Awards\' Redford', () => {
    const s = startLife('by-format');
    s.now = at('America/Los_Angeles', '2026-09-01', 9);
    const wga = ed(s, 'wga-2027');
    const film = work(s, { format: 'feature', runtime: 100, completed: '2026-01-10', base: 'us-los-angeles' });
    release(film, 'streaming', '2026-03-01', ['US']);
    expect(r(s, film, wga, 'selvin')).toMatch(/theatrical release in the United States/); // a film needs its week in cinemas
    const show = work(s, { format: 'series', runtime: 300, completed: '2026-01-10', base: 'gb-london' });
    release(show, 'broadcast', '2026-03-01', ['GB']);
    expect(r(s, show, wga, 'selvin')).not.toMatch(/release|between/); // television: first broadcast in 2026, any country
    const doc = work(s, { format: 'documentary-series', runtime: 200, completed: '2025-06-01', base: 'us-los-angeles' });
    release(doc, 'streaming', '2025-12-01', ['US']);
    expect(r(s, doc, wga, 'selvin')).not.toMatch(/between/); // documentary: November 2025 to October 2026
    expect(categoryRuleStatus(rulebook('wga-2027@3'), 'selvin')).toBe('verified');
    expect(categoryRuleStatus(rulebook('wga-2027@2'), 'selvin')).toBe('simulated');
    // The Redford award: a film under the film rules (70 minutes), a series under the television rules (two episodes).
    const spirit = ed(s, 'spirit-2027');
    expect(r(s, work(s, { format: 'feature', runtime: 60, completed: '2026-01-10', base: 'us-los-angeles' }), spirit, 'redford')).toMatch(/at least 70/);
    const one = work(s, { format: 'series', runtime: 30, completed: '2026-01-10', base: 'us-los-angeles' });
    one.axes.episodeCount = 1;
    release(one, 'streaming', '2026-03-01', ['US']);
    expect(r(s, one, spirit, 'redford')).toMatch(/needs at least 2/);
  });

  it('Gotham Awards 2026: over 70 minutes, a US theatrical run in 2026, entered by September 17', () => {
    const s = startLife('gotham');
    const e = ed(s, 'gotham-2026');
    expect(e.rulesId).toBe('gotham-2026@1');
    s.now = at('America/New_York', '2026-08-01', 9);
    const film = (runtime: number) => { const p = work(s, { format: 'feature', runtime, completed: '2026-01-10', base: 'us-new-york' }); release(p, 'theatrical', '2026-05-01', ['US']); return p; };
    expect(r(s, film(90), e, 'feature')).not.toMatch(/release|minutes/);
    expect(r(s, film(70), e, 'feature')).toMatch(/more than 70/);
    const streamed = work(s, { format: 'feature', runtime: 90, completed: '2026-01-10', base: 'us-new-york' });
    release(streamed, 'streaming', '2026-05-01', ['US']);
    expect(r(s, streamed, e, 'director')).toMatch(/theatrical release in the United States/);
    expect(categoryDeadline(e, cat(e, 'lead'))).toBe(at('America/New_York', '2026-09-17', 23, 59) + 59_000);
  });

  it('Producers Guild Awards 2027: a US theatrical release in 2026, nothing outside cinemas first, by October 9; animated features over 40 minutes', () => {
    const s = startLife('pga');
    const e = ed(s, 'pga-2027');
    expect(e.rulesId).toBe('pga-2027@3'); // versions 2 and 3 add the documentary and television awards; the film awards keep version 1's rules
    s.now = at('America/Los_Angeles', '2026-09-01', 9);
    const film = (medium: Project['axes']['medium'], runtime = 95) => { const p = work(s, { format: 'feature', medium, runtime, completed: '2026-01-10', base: 'us-los-angeles' }); release(p, 'theatrical', '2026-06-01', ['US']); return p; };
    expect(r(s, film('live-action'), e, 'theatrical')).not.toMatch(/release/);
    const vod = film('live-action');
    release(vod, 'digital', '2026-05-01', ['US']);
    expect(r(s, vod, e, 'theatrical')).toMatch(/outside cinemas, before any theatrical run/);
    expect(r(s, film('animation', 40), e, 'animated')).toMatch(/more than 40/);
    expect(r(s, film('hybrid'), e, 'animated')).toMatch(/for animation work/);
    expect(categoryDeadline(e, cat(e, 'animated'))).toBe(at('America/Los_Angeles', '2026-10-09', 23, 59) + 59_000);
  });

  it('PGA 2027, version 3: television in the US in 2026, by September 25; episode counts and lengths by category; a TV movie never in cinemas', () => {
    const s = startLife('pga-tv');
    const e = ed(s, 'pga-2027');
    s.now = at('America/Los_Angeles', '2026-09-01', 9);
    const show = (format: Project['axes']['format'], eps: number, each: number, date = '2026-03-01', country = 'US') => {
      const p = work(s, { format, runtime: eps * each, completed: '2026-01-10' });
      p.axes.episodeCount = eps;
      release(p, 'streaming', date, [country]);
      return p;
    };
    expect(r(s, show('series', 6, 30), e, 'drama')).toBe('');
    expect(r(s, show('series', 5, 30), e, 'drama')).toMatch(/It has 5 episodes\. This category needs at least 6\./);
    expect(r(s, show('series', 6, 20), e, 'comedy')).toMatch(/Its episodes average 20 minutes\. This category needs episodes of more than 20\./);
    expect(r(s, show('series', 6, 30, '2025-12-01'), e, 'drama')).toMatch(/between January 1, 2026 and December 31, 2026/);
    expect(r(s, show('series', 6, 30, '2026-03-01', 'GB'), e, 'drama')).toMatch(/United States/);
    const game = (eps: number) => { const p = show('unscripted-series', eps, 22); p.unscripted = { ...p.unscripted, family: 'competition' } as Project['unscripted']; return p; };
    expect(r(s, game(3), e, 'game-competition')).toBe('');
    expect(r(s, game(2), e, 'game-competition')).toMatch(/needs at least 3/);
    // A nonfiction special is entered whole: one 45-minute film needs no three episodes; a 15-minute one is too short.
    const special = (runtime: number) => { const p = work(s, { format: 'documentary-feature', runtime, completed: '2026-01-10' }); release(p, 'broadcast', '2026-03-01', ['US']); return p; };
    expect(r(s, special(45), e, 'nonfiction')).toBe('');
    expect(r(s, special(15), e, 'nonfiction')).toMatch(/It runs 15 minutes\. This category needs more than 20\./);
    expect(r(s, show('web-series', 3, 10), e, 'short-form')).toBe('');
    expect(r(s, show('web-series', 3, 20), e, 'short-form')).toMatch(/takes episodes under 20 minutes/);
    expect(r(s, show('limited-series', 1, 90), e, 'limited')).toMatch(/needs at least 2/);
    expect(r(s, show('limited-series', 3, 50), e, 'limited')).toBe('');
    // Children's: for children (the catalog's requirement), episodes of eight minutes or more, six for a series.
    const kids = show('series', 6, 7);
    kids.axes.genres = [{ id: 'children' } as Project['axes']['genres'][number]];
    expect(r(s, kids, e, 'childrens')).toMatch(/Its episodes average 7 minutes\. This category needs episodes of at least 8\./);
    // A TV movie with any theatrical release is out, even after it streamed, and anywhere.
    const movie = () => { const p = work(s, { format: 'tv-film', runtime: 95, completed: '2026-01-10' }); release(p, 'streaming', '2026-03-01', ['US']); return p; };
    expect(r(s, movie(), e, 'tv-movie')).toBe('');
    const later = movie();
    release(later, 'theatrical', '2026-05-01', ['FR']);
    expect(r(s, later, e, 'tv-movie')).toMatch(/It opened in cinemas on May 1, 2026; this award is for films that are never released in cinemas\./);
    // A season already on a PGA ballot can't enter again.
    const again = show('series', 6, 30);
    ed(s, 'pga-2026').entries.push({ id: 'old', projectId: again.id, categoryId: 'drama', submittedAt: 0, status: 'submitted', recipients: [], fee: 0 });
    expect(r(s, again, e, 'drama')).toMatch(/entered at an earlier/);
    expect(categoryDeadline(e, cat(e, 'drama'))).toBe(at('America/Los_Angeles', '2026-09-25', 23, 59) + 59_000);
    expect(categoryRuleStatus(rulebook('pga-2027@3'), 'short-form')).toBe('verified');
    expect(categoryRuleStatus(rulebook('pga-2027@2'), 'short-form')).toBe('simulated');
  });

  it('Emmys 2026, version 2: every entered category reads the general rules; series-only ones need their episodes, mixed ones don\'t', () => {
    const s = startLife('em2');
    s.now = at('America/Los_Angeles', '2026-04-01', 9);
    const e = ed(s, 'emmys-2026');
    expect(e.rulesId).toBe('emmys-2026@5'); // versions 3 and 4 add Outstanding Narrator and the performer and one-episode rules (tests/recipient-rules.test.ts), 5 Original Music And Lyrics (tests/songs.test.ts)
    for (const id of ['guest-actor', 'animated-program', 'reality-competition', 'title-design', 'hosted-nonfiction']) expect(categoryRuleStatus(rulebook(e.rulesId), id), id).toBe('verified');
    expect(categoryRuleStatus(rulebook('emmys-2026@1'), 'guest-actor')).toBe('simulated'); // version 1 read 13 categories
    const show = (format: Project['axes']['format'], eps: number, territory = 'US') => {
      const p = work(s, { format, runtime: 30, completed: '2025-12-01' });
      p.axes.episodeCount = eps;
      release(p, 'streaming', '2026-02-01', [territory]);
      return p;
    };
    // Eligibility 11c: six episodes for a reality series, three for hosted nonfiction; an animated program can be a special.
    expect(r(s, show('unscripted-series', 5), e, 'reality-competition')).toMatch(/needs at least 6/);
    expect(r(s, show('unscripted-series', 3), e, 'hosted-nonfiction')).not.toMatch(/needs at least/);
    expect(r(s, show('unscripted-series', 2), e, 'hosted-nonfiction')).toMatch(/needs at least 3/);
    expect(r(s, show('tv-film', 1), e, 'animated-program')).not.toMatch(/needs at least/);
    // The general rules: a US platform in the June-to-May year, by May 7.
    expect(r(s, show('series', 8, 'GB'), e, 'title-design')).toMatch(/release in the United States/);
    expect(categoryDeadline(e, cat(e, 'title-design'))).toBe(at('America/Los_Angeles', '2026-05-07', 23, 59) + 59_000);
    // Short form: at most six producers are named (Category 86).
    const sf = show('web-series', 6);
    sf.credits = Array.from({ length: 8 }, (_, i) => credit(`pr${i + 1}`, 'Produced By', 'producer', 10 + i));
    expect(checkEligibility(s, sf, e, cat(e, 'short-form-series')).recipients).toHaveLength(6);
  });

  it('Emmys 2026: six episodes for series, the June-to-May window, and no US cinema run before airing', () => {
    const s = startLife('em');
    s.now = at('America/Los_Angeles', '2026-04-01', 9);
    const e = ed(s, 'emmys-2026');
    const series = (eps: number, airs: string) => {
      const p = work(s, { format: 'series', runtime: 40, completed: '2025-12-01' });
      p.axes.episodeCount = eps;
      release(p, 'streaming', airs, ['US']);
      return p;
    };
    expect(r(s, series(5, '2026-02-01'), e, 'drama')).toMatch(/needs at least 6/);
    expect(r(s, series(6, '2026-05-31'), e, 'drama')).not.toMatch(/release|episode/);
    expect(r(s, series(6, '2025-05-31'), e, 'drama')).toMatch(/between June 1, 2025 and May 31, 2026/);
    const cinemaFirst = series(6, '2026-02-01');
    release(cinemaFirst, 'theatrical', '2026-01-10', ['US']);
    expect(r(s, cinemaFirst, e, 'drama')).toMatch(/opened in cinemas/);
    const movie = work(s, { format: 'tv-film', runtime: 74, completed: '2025-12-01' });
    release(movie, 'streaming', '2026-02-01', ['US']);
    expect(r(s, movie, e, 'movie')).toMatch(/at least 75/);
    expect(categoriesFor(institution('emmys'), 2026).map((c) => c.id)).toContain('movie');
    expect(categoriesFor(institution('emmys'), 2025).map((c) => c.id)).toContain('tv-movie');
  });

  it('a 2026 Emmys entry a save filed under Outstanding Television Movie moves to Outstanding Movie on load and is still judged', () => {
    const s = startLife('em-rename');
    const raw = JSON.parse(JSON.stringify(s));
    const e26 = raw.editions.find((e: Edition) => e.id === 'emmys-2026');
    e26.entries.push({ id: 'emmys-2026:tv-movie:p', projectId: 'p', categoryId: 'tv-movie', submittedAt: 0, status: 'accepted', recipients: [], fee: 0 });
    e26.results['tv-movie'] = { stage: 'nomination', projectIds: [], rivalIds: [], revealed: true };
    const data = JSON.stringify(raw);
    const back = deserialize(JSON.stringify({ format: 'slate-save', version: raw.version, checksum: hashString(data), data }));
    const e = back.editions.find((x) => x.id === 'emmys-2026')!;
    expect(e.entries[0].categoryId).toBe('movie');
    expect(e.entries[0].id).toBe('emmys-2026:tv-movie:p'); // the entry keeps its identity
    expect(Object.keys(e.results)).toEqual(['movie']);
    expect(categoriesFor(institution('emmys'), 2026).some((c) => c.id === 'movie')).toBe(true);
  });

  it('San Sebastián 2026 Official Selection: over 60 minutes, produced within the year, no earlier festival or VOD, June 16 in San Sebastián', () => {
    const s = startLife('ss');
    s.now = at('Europe/Madrid', '2026-05-01', 9);
    const e = ed(s, 'san-sebastian-2026');
    expect(e.rulesId).toBe('san-sebastian-2026@2');
    const f = (rt: number, done = '2026-02-01') => work(s, { format: 'feature', runtime: rt, completed: done, base: 'gb-london' });
    expect(r(s, f(60), e, 'official')).toMatch(/more than 60/);
    expect(r(s, f(61), e, 'official')).toBe('');
    expect(r(s, f(90, '2025-09-17'), e, 'official')).toMatch(/completed from September 18, 2025/);
    const streamed = f(90);
    release(streamed, 'streaming', '2026-04-01', ['GB']);
    expect(r(s, streamed, e, 'official')).toMatch(/online/);
    expect(categoryDeadline(e, cat(e, 'official'), f(90))).toBe(at('Europe/Madrid', '2026-06-16', 23, 59, 59));
    expect(categoryRuleStatus(rulebook('san-sebastian-2027@1'), 'official')).toBe('projected');
  });

  it('a save opened after these rules were published adopts them for untouched future editions only', () => {
    const s = startLife('adopt2');
    const raw = JSON.parse(JSON.stringify(s));
    for (const e of raw.editions) if (e.id === 'venice-2026' || e.id === 'emmys-2026') { e.rulesId = 'simulated'; delete e.defaultDeadline; }
    raw.editions.find((e: Edition) => e.id === 'emmys-2026').entries.push({ id: 'x', projectId: 'p', categoryId: 'drama', submittedAt: 0, status: 'submitted', recipients: [], fee: 0 });
    const data = JSON.stringify(raw);
    const back = deserialize(JSON.stringify({ format: 'slate-save', version: raw.version, checksum: hashString(data), data }));
    expect(back.editions.find((e) => e.id === 'venice-2026')!.rulesId).toBe('venice-2026@4');
    expect(back.editions.find((e) => e.id === 'emmys-2026')!.rulesId).toBe('simulated'); // someone entered it
    const v = back.editions.find((e) => e.id === 'venice-2026')!;
    expect(back.events.find((x) => x.id === 'venice-2026:deadline')?.at).toBe(v.deadline);
  });
});

describe('late entries, opening days and a verified edition run to its end', () => {
  it('Venice 2026 opens at 9:00 in Venice on February 9 and closes features at the end of June 4 there, wherever the player is', () => {
    const s = startLife('ve-dl', 'us-los-angeles');
    const e = ed(s, 'venice-2026');
    const c = cat(e, 'competition');
    const p = work(s, { format: 'feature', runtime: 100, completed: '2026-01-10', base: 'gb-london' });
    p.funding.fund = 10_000;
    const opens = at('Europe/Rome', '2026-02-09', 9);
    expect(e.submissionOpens).toBe(opens);
    s.now = opens - 1;
    expect(checkEligibility(s, p, e, c).reasons.join(' ')).toMatch(/Entries open on February 9, 2026/);
    s.now = opens;
    expect(checkEligibility(s, p, e, c).eligible).toBe(true);
    // 2:59:59 p.m. June 4 in Los Angeles is the last second in Venice; 3:00 p.m. is June 5 there.
    s.now = at('America/Los_Angeles', '2026-06-04', 14, 59, 59);
    expect(checkEligibility(s, p, e, c).eligible).toBe(true);
    s.now = at('America/Los_Angeles', '2026-06-04', 15);
    expect(() => submitEntry(s, p, e.id, 'competition')).toThrow('The entry deadline has passed.');
    expect(e.entries).toEqual([]);
  });

  it('Emmys close at the end of May 7 in Los Angeles; Golden Globes films at the end of December 2 there (times assumed and labelled)', () => {
    const s = startLife('em-dl', 'gb-london');
    const em = ed(s, 'emmys-2026');
    const series = work(s, { format: 'series', runtime: 40, completed: '2025-12-01' });
    series.axes.episodeCount = 6;
    release(series, 'streaming', '2026-02-01', ['US']);
    const emClose = at('America/Los_Angeles', '2026-05-07', 23, 59, 59);
    expect(categoryDeadline(em, cat(em, 'drama'), series)).toBe(emClose);
    expect(categoryRules(em, 'drama')!.deadlines!.value[0].timeAssumed).toBe(true);
    s.now = emClose;
    expect(checkEligibility(s, series, em, cat(em, 'drama')).eligible).toBe(true);
    s.now = emClose + 1000; // 8:00 a.m. May 8 in London
    expect(checkEligibility(s, series, em, cat(em, 'drama')).reasons).toContain('The entry deadline has passed.');

    const gg = ed(s, 'golden-globes-2027');
    const film = work(s, { format: 'feature', runtime: 100, completed: '2026-01-10' });
    release(film, 'theatrical', '2026-06-01', ['US']);
    const ggClose = at('America/Los_Angeles', '2026-12-02', 23, 59, 59);
    expect(categoryDeadline(gg, cat(gg, 'drama'), film)).toBe(ggClose);
    s.now = ggClose;
    expect(checkEligibility(s, film, gg, cat(gg, 'drama')).eligible).toBe(true);
    s.now = ggClose + 1000;
    expect(checkEligibility(s, film, gg, cat(gg, 'drama')).reasons).toContain('The entry deadline has passed.');
  });

  it('an entry made in time is accepted at the deadline, judged once, and the results never change when events repeat', () => {
    const s = startLife('ve-run', 'gb-london');
    const e = ed(s, 'venice-2026');
    s.now = at('Europe/Rome', '2026-05-01', 9);
    const p = work(s, { format: 'feature', runtime: 100, completed: '2026-01-10', base: 'gb-london' });
    p.funding.fund = 10_000;
    p.quality = { overall: 99, reception: 99, direction: 99, script: 99 };
    const entry = submitEntry(s, p, e.id, 'competition');
    expect(entry.status).toBe('submitted');
    processUntil(s, e.announce + 1, 'tick', 100_000);
    expect(entry.status).toBe('selected');
    const selection = JSON.stringify(e.results);
    announceEdition(s, e); // a repeated announcement rerolls nothing
    expect(JSON.stringify(e.results)).toBe(selection);
    processUntil(s, e.end + 2 * DAY, 'tick', 100_000);
    expect(e.status).toBe('complete');
    expect(e.compact).toBe(true);
    // Selection isn't a win (from November 9, 2026): the Competition entry stays selected, and the Golden Lion and the
    // other prizes are decided among the selected films, recorded from the selection without an entry or a fee.
    expect(entry.status).toBe('selected');
    expect(e.results.competition.stage).toBe('selection');
    const prizes = e.entries.filter((x) => x.via === 'selection');
    expect(prizes.map((x) => x.categoryId)).toContain('golden-lion');
    for (const x of prizes) {
      const res = e.results[x.categoryId];
      expect(res.stage).toBe('winner');
      expect(res.projectIds).toContain(p.id);
      expect(x.fee).toBe(0);
      expect(['won', 'lost', 'mention']).toContain(x.status);
      expect(x.status === 'won').toBe(res.winner === p.id);
      if (res.winner) expect([...res.projectIds, ...res.rivalIds]).toContain(res.winner);
    }
    // It premieres at Venice and screens twice.
    expect(p.premiere?.editionId).toBe(e.id);
    expect(e.screenings!.filter((x) => x.projectId === p.id)).toHaveLength(2);
    const final = JSON.stringify({ results: e.results, entries: e.entries, log: s.log.length });
    // Results arrive once: replaying the results event later changes nothing and logs nothing.
    schedule(s, s.now + 60_000, 'edition-results', { editionId: e.id }, { attention: 'notify' });
    processUntil(s, s.now + DAY, 'tick', 100_000);
    expect(JSON.stringify({ results: e.results, entries: e.entries, log: s.log.length })).toBe(final);
  });

  it('a film selected for a world-premiere section that premieres elsewhere first is disqualified when the festival opens, and never screens', () => {
    const s = startLife('ve-wp', 'gb-london');
    const e = ed(s, 'venice-2026');
    const p = work(s, { format: 'feature', runtime: 100, completed: '2026-01-10', base: 'gb-london' });
    // Labelled fixture: the selection is set directly, as judging is not under test here.
    e.entries.push({ id: 'en', projectId: p.id, categoryId: 'competition', submittedAt: 0, status: 'selected', recipients: [], fee: 0 });
    e.results.competition = { stage: 'selection', projectIds: [p.id], rivalIds: [], revealed: true };
    e.status = 'announced';
    p.premiere = { kind: 'world', date: '2026-08-20', country: 'FR', venue: 'Another festival', editionId: 'other' };
    processUntil(s, e.start + DAY, 'tick', 100_000);
    expect(e.entries[0].status).toBe('disqualified'); // 'withdrawn' until November 9, 2026: you hadn't withdrawn it
    expect(e.entries[0].reason).toMatch(/premiered elsewhere first/);
    expect((e.screenings ?? []).filter((x) => x.projectId === p.id)).toEqual([]);
    processUntil(s, e.end + 2 * DAY, 'tick', 100_000);
    expect(e.results.competition.winner).not.toBe(p.id);
  });
});
