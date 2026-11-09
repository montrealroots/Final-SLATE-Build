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
  it('recounts the catalog the audit covers: 37 institutions and 802 categories', () => {
    expect(INSTITUTIONS.length).toBe(37);
    // 141 before the 78th Emmys renamed Outstanding Television Movie to Outstanding Movie (kept as two, by year); 142 until
    // the rosters of November 9, 2026 (docs/awards/roster).
    expect(INSTITUTIONS.reduce((n, i) => n + i.categories.length, 0)).toBe(802);
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
        for (const [k, r] of Object.entries(rules)) {
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
    expect(ed(s, 'oscars-2027').rulesId).toBe('oscars-2027@1');
    expect(ed(s, 'sundance-2027').rulesId).toBe('sundance-2027@1');
    expect(ed(s, 'venice-2026').rulesId).toBe('venice-2026@1');
    expect(ed(s, 'tiff-2026').rulesId).toBe('simulated');
    expect(categoryRuleStatus(rulebook('cannes-2027@1'), 'shorts')).toBe('projected');
    expect(categoryRuleStatus(rulebook('cannes-2027@1'), 'competition')).toBe('simulated');
    expect(categoryRuleStatus(rulebook('oscars-2027@1'), 'picture')).toBe('verified');
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

  it('Oscar shorts qualify by a US theatrical run or a listed festival win inside October 2025 to September 2026', () => {
    const s = startLife('osh');
    s.now = at('America/Los_Angeles', '2026-09-20', 9);
    const e = ed(s, 'oscars-2027');
    const p = work(s, { format: 'short', runtime: 15, completed: '2026-01-10' });
    const live = cat(e, 'live-short');
    expect(checkEligibility(s, p, e, live).reasons.join(' ')).toMatch(/top award at one of its qualifying festivals/);
    // A win at a festival section the Academy doesn't list doesn't count.
    const busan = ed(s, 'busan-2026');
    busan.results.shorts = { stage: 'winner', projectIds: [p.id], rivalIds: [], winner: p.id, revealed: true };
    expect(checkEligibility(s, p, e, live).eligible).toBe(false);
    const cf = ed(s, 'clermont-2026');
    // Clermont's International Competition selects; its Grand Prix is the award the Academy lists (from November 9, 2026).
    cf.results.international = { stage: 'selection', projectIds: [p.id], rivalIds: [], revealed: true };
    expect(checkEligibility(s, p, e, live).eligible).toBe(false);
    cf.results['grand-prix'] = { stage: 'winner', projectIds: [p.id], rivalIds: [], winner: p.id, revealed: true };
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
    // International Feature's own rules weren't read (from November 9, 2026): it keeps the game's deadline, and the
    // edition stays open until its last category closes.
    expect(categoryDeadline(e, cat(e, 'international'))).toBe(e.defaultDeadline);
    expect(e.deadline).toBe(Math.max(close, e.defaultDeadline!));
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
    expect(o.rulesId).toBe('oscars-2027@1');
    expect(categoryDeadline(o, cat(o, 'picture'))).toBe(at('America/Los_Angeles', '2026-11-12', 17));
    expect(o.deadline).toBe(Math.max(at('America/Los_Angeles', '2026-11-12', 17), oldDeadline)); // International Feature keeps the game's
    expect(o.defaultDeadline).toBe(oldDeadline);
    expect(v3.events.find((x) => x.id === 'oscars-2027:deadline')?.at).toBe(o.deadline);
    expect(v3.editions.find((e) => e.id === 'sundance-2027')!.rulesId).toBe('simulated'); // someone entered: unchanged
    expect(v3.editions.find((e) => e.id === 'tiff-2026')!.rulesId).toBe('simulated'); // no published rules read
    expect(v3.editions.find((e) => e.id === 'venice-2026')!.rulesId).toBe('venice-2026@1'); // untouched, in the future
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
  it('66 categories follow verified rules for at least one edition, 2 only projected ones; the other 734 are simulated', () => {
    const rank = { simulated: 0, projected: 1, verified: 2 } as const;
    const best = (instId: string, catId: string) => RULEBOOKS.filter((b) => b.institutionId === instId)
      .map((b) => categoryRuleStatus(b, catId)).reduce<keyof typeof rank>((a, x) => (rank[x] > rank[a] ? x : a), 'simulated');
    const n = { verified: 0, projected: 0, simulated: 0 };
    for (const inst of INSTITUTIONS) for (const c of inst.categories) n[best(inst.id, c.id)] += 1;
    // 48 and 92 until November 9, 2026, when the rosters added 660 categories and the read rules were extended to the
    // Oscars' craft and adapted-screenplay categories, Sundance's World Cinema competitions, Orizzonti Corti and the
    // Annies' four TV categories (rulebooks.ts).
    expect(n).toEqual({ verified: 66, projected: 2, simulated: 734 });
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
    expect(e.rulesId).toBe('san-sebastian-2026@1');
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
    expect(back.editions.find((e) => e.id === 'venice-2026')!.rulesId).toBe('venice-2026@1');
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
