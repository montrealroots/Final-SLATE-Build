// Runtime validation of a save before the game accepts it. A save comes from storage the game doesn't control: it can
// be truncated, edited, or written by a buggy older build. Each check names what is wrong in plain words, so the
// player can be told which part is damaged and the game can fall back to a good copy instead of crashing later.

import { isPortrait } from './identity';
import { isValidDate } from './time';
import type { GameState } from './types';

export class SaveValidationError extends Error {}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 200;

const FORMATS = ['short', 'mid-length', 'feature', 'tv-film', 'series', 'limited-series', 'anthology-series', 'documentary-feature', 'documentary-short', 'documentary-series', 'unscripted-series', 'web-series', 'music-video'];
const MEDIUMS = ['live-action', 'animation', 'hybrid'];
const TECHNIQUES = ['none', '2d-drawn', '2d-rigged', '3d-cg', 'stop-motion', 'rotoscope', 'mixed'];
const PHASES = ['development', 'pre-production', 'production', 'post-production', 'delivered', 'released'];
const OBLIGATION_STATES = ['reserved', 'committed', 'settled', 'cancelled'];
const POSTING_KINDS = ['reserve', 'commit', 'settle', 'cancel'];
const TASK_STATUSES = ['waiting', 'ready', 'active', 'done', 'blocked'];
const ATTENTION = ['interrupt', 'notify', 'silent'];
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function fail(where: string, what: string): never {
  throw new SaveValidationError(`${where}: ${what}`);
}

function need(ok: boolean, where: string, what: string): void {
  if (!ok) fail(where, what);
}

function dateKeyOk(v: unknown): boolean {
  if (!isStr(v) || !DATE_KEY.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  return isValidDate(y, m, d);
}

/** Throws SaveValidationError naming the first problem found; returns normally for a sound save. */
export function validateGameState(raw: unknown): asserts raw is GameState {
  need(isObj(raw), 'the save', 'is not a game');
  const s = raw as Obj;
  need(isId(s.saveId), 'the save', 'has no save ID');
  need(isStr(s.saveName), 'the save', 'has no name');
  for (const k of ['now', 'startedAt', 'seed', 'createdAtReal', 'updatedAtReal'] as const) {
    need(isNum(s[k]), k === 'now' || k === 'startedAt' ? 'the game clock' : 'the save details', `${k} is not a number`);
  }
  need(Number.isInteger(s.idCounter) && (s.idCounter as number) >= 0, 'the save details', 'the ID counter is not a whole number');

  const c = s.character;
  need(isObj(c), 'the character', 'is missing');
  const ch = c as Obj;
  need(isStr(ch.name) && (ch.name as string).trim().length > 0 && (ch.name as string).length <= 200, 'the character', 'has no name');
  // Name parts, a preferred name, where you live and a headshot arrived in save version 6 (identity.ts).
  need(isStr(ch.firstName) && isStr(ch.lastName) && (ch.middleName === undefined || isStr(ch.middleName)) && (ch.preferredName === undefined || isStr(ch.preferredName)), 'the character', 'has a malformed name');
  need(isId(ch.livesIn), 'the character', 'has no home');
  need(ch.portrait === undefined || isPortrait(ch.portrait), 'the character', 'has a damaged headshot');
  need(['he', 'she', 'they'].includes(ch.pronouns as string), 'the character', 'has unknown pronouns');
  need(['Actor', 'Actress'].includes(ch.actingTitle as string), 'the character', 'has an unknown acting title');
  const b = ch.birth as Obj;
  need(isObj(b) && isValidDate(b.year as number, b.month as number, b.day as number), 'the character', 'has an impossible birth date');
  need(isId(ch.birthplaceId), 'the character', 'has no birthplace');
  need(Array.isArray(ch.heritages) && Array.isArray(ch.nationalities) && (ch.nationalities as unknown[]).every((c) => typeof c === 'string') && Array.isArray(ch.languages) && isStr(ch.mainLanguage), 'the character', 'has malformed backgrounds or languages');
  need(ch.observances === undefined || (Array.isArray(ch.observances) && (ch.observances as unknown[]).every(isStr)), 'the character', 'has malformed holidays');

  need(isId(s.locationId), 'where you are', 'is missing');
  need(isStr(s.ageZone) && zoneOk(s.ageZone as string), 'the character', 'has an unknown time zone');

  need(isObj(s.settings), 'settings', 'are missing');
  const st = s.settings as Obj;
  need(['dark', 'light'].includes(st.theme as string), 'settings', 'have an unknown theme');
  need(typeof st.wakeForObligations === 'boolean', 'settings', 'wakeForObligations is not on or off');

  const sl = s.sleep as Obj;
  need(isObj(sl) && typeof sl.asleep === 'boolean' && typeof sl.alarm === 'boolean', 'sleep', 'is malformed');
  need(sl.wakeAt === undefined || isNum(sl.wakeAt), 'sleep', 'has an invalid wake time');
  if (s.travel !== undefined && s.travel !== null) {
    const t = s.travel as Obj;
    need(isObj(t) && isId(t.to) && isId(t.from) && isNum(t.arriveAt), 'your trip', 'is malformed');
  }

  need(Array.isArray(s.events), 'scheduled events', 'are missing');
  let last = -Infinity;
  for (const e of s.events as unknown[]) {
    need(isObj(e) && isId(e.id) && isStr(e.kind) && isNum(e.at) && isNum(e.priority) && ATTENTION.includes(e.attention as string) && isObj(e.payload),
      'a scheduled event', 'is malformed');
    need((e as Obj).at as number >= last, 'scheduled events', 'are out of order');
    last = (e as Obj).at as number;
  }
  need(Array.isArray(s.processedEventIds) && (s.processedEventIds as unknown[]).every(isStr), 'processed events', 'are malformed');
  if (s.industry !== undefined) {
    const ind = s.industry as Obj;
    need(isObj(ind) && isStr(ind.horizon) && isStr(ind.builtAt) && isObj(ind.series) && Object.values(ind.series as Obj).every((x) => isObj(x) && Array.isArray((x as Obj).seasons) && Array.isArray((x as Obj).outcomes) && typeof (x as Obj).closed === 'boolean')
      && (ind.studios === undefined || (Array.isArray(ind.studios) && (ind.studios as Obj[]).every((p) => isObj(p) && isStr(p.c) && typeof p.n === 'number' && Array.isArray(p.g) && Array.isArray(p.m) && isObj(p.ann)))), 'the save', 'has a malformed industry record');
    // A series' frozen inputs (industry.ts FrozenSeries): a decision reads these, so a malformed one is refused here.
    const run = (r: unknown) => r === undefined || (isObj(r) && typeof r.n === 'number' && typeof r.eps === 'number' && isStr(r.d0) && typeof r.gap === 'number' && typeof r.drop === 'boolean' && isStr(r.end));
    need(Object.values(ind.series as Obj).every((x) => {
      const f = (x as Obj).p;
      return f === undefined || (isObj(f) && typeof f.v === 'number' && ['daily', 'kids', 'broadcast', 'cable', 'streaming'].includes(f.o as string) && typeof f.mini === 'boolean' && typeof f.pilot === 'boolean'
        && typeof f.anim === 'boolean' && typeof f.aired === 'number' && Array.isArray(f.reg) && (f.reg as unknown[]).every((id) => typeof id === 'number') && run(f.last) && run(f.model));
    }), 'the save', 'has a malformed series profile');
    need(ind.from === undefined || isStr(ind.from), 'the save', 'has a malformed industry record');
    need(ind.refreshes === undefined || (Array.isArray(ind.refreshes) && (ind.refreshes as Obj[]).every((r) => isObj(r) && isStr(r.at) && isStr(r.builtAt))), 'the save', 'has a malformed industry record');
  }
  need(Array.isArray(s.log) && Array.isArray(s.plans) && Array.isArray(s.followed) && Array.isArray(s.calendarFilters), 'the save', 'is missing lists it needs');

  need(isObj(s.places), 'places', 'are missing');
  for (const [id, p] of Object.entries(s.places as Obj)) {
    const pl = p as Obj;
    need(isObj(pl) && pl.id === id && isStr(pl.name) && isNum(pl.lat) && Math.abs(pl.lat as number) <= 90 && isNum(pl.lon) && Math.abs(pl.lon as number) <= 180
      && isStr(pl.zone) && isStr(pl.country), `the place ${id}`, 'is malformed');
  }

  need(isObj(s.people), 'people', 'are missing');
  for (const [id, ps] of Object.entries(s.people as Obj)) {
    need(isObj(ps) && Array.isArray((ps as Obj).bookings), `bookings for ${id}`, 'are malformed');
    for (const bk of (ps as Obj).bookings as unknown[]) need(isObj(bk) && dateKeyOk(bk.from) && dateKeyOk(bk.to) && isId(bk.projectId), `a booking for ${id}`, 'has an impossible date');
  }

  need(Array.isArray(s.projects), 'projects', 'are missing');
  const projectIds = new Set<string>();
  (s.projects as unknown[]).forEach((pr, i) => validateProject(pr, i, projectIds));

  need(Array.isArray(s.editions), 'festival and award editions', 'are missing');
  need(isObj(s.rivalFilms), 'competing films', 'are missing');
  const films = s.rivalFilms as Obj;
  for (const [key, f] of Object.entries(films)) {
    need(isObj(f) && isStr(f.title) && isObj(f.people) && isStr(f.format) && isStr(f.medium) && isNum(f.runtimeMin), `the competing film ${key}`, 'is malformed');
  }
  for (const ed of s.editions as unknown[]) {
    need(isObj(ed) && isId(ed.id) && isId(ed.institutionId) && Number.isInteger(ed.year) && isNum(ed.start) && isNum(ed.end) && isNum(ed.deadline)
      && Array.isArray(ed.entries) && isObj(ed.results) && Array.isArray(ed.rivals), 'a festival or award edition', 'is malformed');
    const e = ed as Obj;
    need(e.rulesId === undefined || isId(e.rulesId), `the ${e.id} edition`, 'names unknown rules');
    need(e.defaultDeadline === undefined || isNum(e.defaultDeadline), `the ${e.id} edition`, 'has an invalid deadline');
    for (const r of e.rivals as unknown[]) {
      need(isObj(r) && isId(r.id) && isStr(r.film) && isNum(r.score), `a competing work in ${e.id}`, 'is malformed');
      need(Object.hasOwn(films, (r as Obj).film as string), `a competing work in ${e.id}`, 'refers to a film that is missing');
    }
    if (e.compact) {
      need((e.rivals as unknown[]).length === 0, `the ${e.id} edition`, 'is marked final but still has competing works');
      for (const r of Object.values(e.results as Obj)) {
        need(isObj(r) && Array.isArray(r.rivalIds) && (r.rivalIds as unknown[]).every((k) => isStr(k) && Object.hasOwn(films, k)), `the results of ${e.id}`, 'name a film that is missing');
      }
    }
  }
}

function zoneOk(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

const FINANCE_STATUSES = ['considering', 'offered', 'declined', 'refused', 'accepted', 'breached', 'lapsed', 'withdrawn'];
const FINANCE_KINDS = ['agreed', 'starting', 'grant', 'investor', 'co-producer', 'commissioner', 'earnings', 'capital', 'studio'];

function validateProject(raw: unknown, i: number, seen: Set<string>): void {
  const where = `project ${i + 1}`;
  need(isObj(raw), where, 'is malformed');
  const p = raw as Obj;
  need(isId(p.id) && !seen.has(p.id as string), where, 'has a missing or repeated ID');
  seen.add(p.id as string);
  const name = isStr(p.title) ? `"${p.title}"` : where;
  need(PHASES.includes(p.phase as string), name, 'has an unknown phase');
  const a = p.axes as Obj;
  need(isObj(a) && FORMATS.includes(a.format as string) && MEDIUMS.includes(a.medium as string) && TECHNIQUES.includes(a.technique as string), name, 'has an unknown format, medium or technique');
  need(isId(a.basePlaceId), name, 'has no production base');
  need(Number.isInteger(a.episodeCount) && (a.episodeCount as number) >= 1, name, 'has an invalid episode count');
  need(isObj(p.funding) && isNum((p.funding as Obj).fund) && ((p.funding as Obj).fund as number) >= 0, name, 'has an invalid fund');
  need(isNum(p.revenue), name, 'has invalid revenue');
  if (p.finance !== undefined) {
    const f = p.finance as Obj;
    need(isObj(f) && isNum(f.estimate) && isNum(f.target) && (f.target as number) >= 0 && Array.isArray(f.deals), name, 'has malformed financing');
    const dealIds = new Set<string>();
    for (const d of f.deals as unknown[]) {
      need(isObj(d) && isId(d.id) && !dealIds.has(d.id as string) && FINANCE_STATUSES.includes(d.status as string) && FINANCE_KINDS.includes(d.kind as string), `a backer of ${name}`, 'is malformed');
      const x = d as Obj;
      dealIds.add(x.id as string);
      need(isNum(x.amount) && isNum(x.received) && isNum(x.repaid) && (x.received as number) <= (x.amount as number) + 0.5 && (x.received as number) >= 0 && (x.repaid as number) >= 0, `the ${x.backer} deal of ${name}`, 'has invalid amounts');
      need(isObj(x.terms) && Array.isArray((x.terms as Obj).approvalRights), `the ${x.backer} deal of ${name}`, 'has malformed terms');
      const unspent = (x.terms as Obj).unspent;
      need(unspent === undefined || unspent === 'stays' || unspent === 'yours', `the ${x.backer} deal of ${name}`, 'has malformed terms');
      const tr = x.transfer as Obj | undefined;
      need(tr === undefined || (isObj(tr) && isId(tr.id) && Array.isArray(tr.sources) && (tr.sources as unknown[]).every((y) => isObj(y) && isId(y.projectId) && isNum(y.amount) && (y.amount as number) > 0)), `the ${x.backer} deal of ${name}`, 'has a malformed transfer');
    }
  }

  need(Array.isArray(p.obligations), name, 'has no budget lines');
  const obligationIds = new Set<string>();
  for (const o of p.obligations as unknown[]) {
    need(isObj(o) && isId(o.id) && OBLIGATION_STATES.includes(o.state as string), `a budget line of ${name}`, 'is malformed');
    const ob = o as Obj;
    need(isNum(ob.amount) && (ob.amount as number) >= 0 && isNum(ob.settled) && (ob.settled as number) >= 0, `the budget line "${ob.label}" of ${name}`, 'has an invalid amount');
    need((ob.settled as number) <= (ob.amount as number) + 0.5, `the budget line "${ob.label}" of ${name}`, 'has paid more than its amount');
    need(Array.isArray(ob.postings), `the budget line "${ob.label}" of ${name}`, 'has no history');
    const keys = new Set<string>();
    for (const x of ob.postings as unknown[]) {
      need(isObj(x) && POSTING_KINDS.includes(x.kind as string) && isNum(x.amount) && isNum(x.at) && isStr(x.key), `the budget line "${ob.label}" of ${name}`, 'has a malformed entry');
      need(!keys.has((x as Obj).key as string), `the budget line "${ob.label}" of ${name}`, 'records the same payment twice');
      keys.add((x as Obj).key as string);
    }
    obligationIds.add(ob.id as string);
  }

  need(Array.isArray(p.tasks), name, 'has no task list');
  const taskIds = new Set((p.tasks as Obj[]).map((t) => t?.id as string));
  for (const t of p.tasks as unknown[]) {
    need(isObj(t) && isId(t.id) && TASK_STATUSES.includes(t.status as string) && isNum(t.units) && (t.units as number) >= 0 && isNum(t.done) && (t.done as number) >= 0
      && (t.done as number) <= (t.units as number) + 1e-6 && Array.isArray(t.dependsOn), `a task of ${name}`, 'is malformed');
    for (const d of (t as Obj).dependsOn as unknown[]) {
      need(isStr(d) && (taskIds.has(d) || d.startsWith('milestone:') || d.startsWith('capture:')), `the task "${(t as Obj).label}" of ${name}`, 'depends on work that does not exist');
    }
  }

  need(Array.isArray(p.hires), name, 'has no hires list');
  for (const h of p.hires as unknown[]) {
    need(isObj(h) && isId(h.id) && isStr(h.personId) && isNum(h.dayRate) && (h.dayRate as number) >= 0, `a hire of ${name}`, 'is malformed');
    const ob = (h as Obj).obligationId;
    need(ob === undefined || ob === null || obligationIds.has(ob as string), `a hire of ${name}`, 'points at a budget line that does not exist');
  }
  need(isObj(p.schedule) && Array.isArray((p.schedule as Obj).days), name, 'has no schedule');
  const kept = (p.schedule as Obj).observances;
  need(kept === undefined || (Array.isArray(kept) && (kept as unknown[]).every(isStr)), name, 'has malformed holidays');
  for (const d of (p.schedule as Obj).days as unknown[]) need(isObj(d) && isId(d.id) && dateKeyOk(d.date), `a shoot day of ${name}`, 'has an impossible date');
  for (const k of ['scenes', 'characters', 'drafts', 'cast', 'captures', 'releases', 'offers', 'credits', 'history', 'contributors', 'evidence']) {
    need(Array.isArray(p[k]), name, `is missing its ${k}`);
  }
}
