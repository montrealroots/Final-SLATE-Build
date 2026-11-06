import { describe, expect, it } from 'vitest';
import {
  INSTITUTIONS, RULEBOOKS, categoriesFor, categoryDeadline, categoryRuleStatus, categoryRules, checkEligibility, institution, migrateV2toV3,
  rulebook, submitEntry, withdrawEntry, rivalTitle, announceEdition,
} from '../src/engine';
import { deserialize, memoryStore, openSave, serialize, writeSave } from '../src/engine/save';
import { isValidDate, localToInstant } from '../src/engine/time';
import type { Credit, Edition, GameState, Project } from '../src/engine/types';
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
  it('recounts the catalog the audit covers: 37 institutions and 141 categories', () => {
    expect(INSTITUTIONS.length).toBe(37);
    expect(INSTITUTIONS.reduce((n, i) => n + i.categories.length, 0)).toBe(141);
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
    expect(ed(s, 'venice-2026').rulesId).toBe('simulated');
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
    cf.results.international = { stage: 'winner', projectIds: [p.id], rivalIds: [], winner: p.id, revealed: true };
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
    const c = cat(e, 'dramatic');
    const us = work(s, { format: 'feature', runtime: 90, completed: '2026-03-01', base: 'us-los-angeles' });
    const intl = work(s, { format: 'feature', runtime: 90, completed: '2026-03-01', base: 'gb-london' });
    expect(checkEligibility(s, us, e, c).eligible).toBe(true);
    expect(checkEligibility(s, intl, e, c).eligible).toBe(true);
    us.premiere = { kind: 'world', date: '2026-07-01', country: 'US', venue: 'Other', editionId: 'sxsw-2026' };
    intl.premiere = { kind: 'world', date: '2026-07-01', country: 'GB', venue: 'Home', editionId: 'sxsw-2026' };
    expect(checkEligibility(s, us, e, c).reasons.join(' ')).toMatch(/requires a world premiere/);
    expect(checkEligibility(s, intl, e, c).eligible).toBe(true); // shown only at home: still an international premiere
    release(intl, 'theatrical', '2026-07-15', ['FR']);
    expect(checkEligibility(s, intl, e, c).reasons.join(' ')).toMatch(/requires an international premiere/);
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
    expect(e.results.international.projectIds).not.toContain(p.id);
    expect(en.status).toBe('withdrawn');
    expect(e.results.international.rivalIds.every((id) => rivalTitle(s, e, id))).toBe(true);
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
    for (const id of ['venice-2026', 'tiff-2026', 'oscars-2027']) announceEdition(s, ed(s, id));
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
    expect(o.deadline).toBe(at('America/Los_Angeles', '2026-11-12', 17));
    expect(o.defaultDeadline).toBe(oldDeadline);
    expect(v3.events.find((x) => x.id === 'oscars-2027:deadline')?.at).toBe(o.deadline);
    expect(v3.editions.find((e) => e.id === 'sundance-2027')!.rulesId).toBe('simulated'); // someone entered: unchanged
    expect(v3.editions.find((e) => e.id === 'venice-2026')!.rulesId).toBe('simulated');
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

  it('a version-2 save in storage opens, is backed up first, and saves as version 3', () => {
    const s = startLife('store');
    const raw = asVersion2(s);
    const data = JSON.stringify(raw);
    const text = JSON.stringify({ format: 'slate-save', version: 2, checksum: hashString(data), data });
    const kv = memoryStore();
    kv.setItem(`slate.v1.save.${s.saveId}`, text);
    const { state } = openSave(kv, s.saveId, 1);
    expect(state.version).toBe(3);
    expect(kv.getItem(`slate.v1.save.${s.saveId}.backup-v2`)).toBe(text);
    expect(writeSave(kv, state, 2).ok).toBe(true);
    expect(deserialize(kv.getItem(`slate.v1.save.${s.saveId}`)!).rivalFilms).toEqual(state.rivalFilms);
    expect(serialize(state)).toBe(kv.getItem(`slate.v1.save.${s.saveId}`));
  });
});

describe('audit counts', () => {
  it('23 categories follow verified rules and 1 projected; the rest of the 141 are simulated', () => {
    let verified = 0;
    let projected = 0;
    for (const inst of INSTITUTIONS) {
      for (const c of inst.categories) {
        const st = categoryRuleStatus(RULEBOOKS.find((b) => b.institutionId === inst.id), c.id);
        if (st === 'verified') verified += 1;
        if (st === 'projected') projected += 1;
      }
    }
    expect([verified, projected]).toEqual([23, 1]);
  });
});
