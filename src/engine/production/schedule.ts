// Shoot-day planning and plan generation (finished work is kept when a plan is rebuilt).
// Part of the production engine; src/engine/production.ts is its public interface.

import { castIn } from '../parts';
import type { Asset, GameState, Project, Scene, ShootDay } from '../types';
import { getPlace } from '../../data/places';
import { cancel, ledgerTotals, money, reserve, FundsError } from '../budget';
import { isMakeUpWorkday, placeHolidaysOn } from '../holidays';
import { observancesOn } from '../observances';
import { approvedCharacters, approvedScenes, projectModules, sceneTechnique } from '../projects';
import { addLog, cancelEvents, distanceKm, newId, schedule } from '../state';
import { addDaysToKey, dateKey, formatDateKey, isDateKey, localParts, localToInstant, parseYmd, weekdayOfKey } from '../time';
import { materialCost } from './workday';
import { buildTasks } from './tasks';
import { BASE_MINUTES_PER_SHOOT_DAY, CROWD_DAY_RATE, dayFees } from './rates';
import { planTime } from '../takes';
import { songUses } from '../songs';
import { childShare, ensureLicence, minorFor, type Minor } from '../minors';
import { rigDayCost } from '../craft';
import { AWAY_KM, awayCosts, dayPlace } from '../destinations';
import { kitClash } from '../equipment';
import { PLATE_FACTOR, digitalCrowd, makeupDayCost, makeupShare, physicalCrowd } from '../looks';
import { covers } from '../people';

/**
 * People who can apply makeup at once (looks.ts): everyone hired who does hair and makeup or prosthetics, or whose job
 * covers one of them, as a costume designer on a small crew covers hair and makeup (people.ts COMBINES).
 */
export const chairsOf = (p: Project): number => p.hires.filter((h) => h.status === 'accepted' && (covers(h.roleId, 'hair-makeup') || covers(h.roleId, 'prosthetics'))).length;

/** A song is performed on screen in this scene (songs.ts). */
export const performedSong = (p: Project, s: Scene): boolean => songUses(p, [s]).some((x) => x.use.placement === 'performed');

// ---------------- Shoot day planning ----------------

/** How much slower a scene shoots than a plain one. A song performed in it (`singing`, songs.ts) slows it as a dance does. */
export function sceneComplexity(s: Scene, mods: Set<string>, singing = false): number {
  let f = 1;
  if (s.stunts.trim()) f *= mods.has('action') ? 0.55 : 0.6;
  if (s.crowd > 20) f *= 0.7;
  if (s.animals.length) f *= 0.75;
  if (s.water) f *= 0.7;
  if (s.heading.time === 'NIGHT') f *= 0.85;
  if (singing || s.dance) f *= 0.75;
  if (s.kind === 'interview') f *= 1.5;
  return f;
}

export function isWorkingDay(p: Project, key: string): boolean {
  const base = getPlace(p.axes.basePlaceId);
  if (isMakeUpWorkday(base.country, key)) return true;
  const wd = weekdayOfKey(key);
  if (wd === 0) return false;
  if (wd === 6 && !p.schedule.sixDayWeeks) return false;
  if (!p.schedule.workHolidays) {
    const place = getPlace(p.axes.basePlaceId);
    if (placeHolidaysOn(place, key).length) return false;
    if (observancesOn(p.schedule.observances, key).length) return false; // the holidays you keep, wherever you shoot
  }
  return true;
}

export function nextWorkingDay(p: Project, key: string): string {
  let k = key;
  for (let i = 0; i < 30 && !isWorkingDay(p, k); i++) k = addDaysToKey(k, 1);
  return k;
}

/**
 * Group live scenes into shoot days by episode, location and interior/exterior, not script order. With block scheduling
 * (November 8, 2026), a series groups by director instead of episode: scenes at one place in episodes the same person
 * directs share days, and a place used by two directors gets a day each, since one day has one director.
 */
/**
 * How much of a shoot day a scene needs: its minutes, slowed by what it involves (sceneComplexity), times its shot plan
 * (takes.ts planTime). One rule for the schedule, the estimate and the shoot day itself (November 8, 2026); until then
 * the schedule and the estimate left out the shot plan, so richer coverage made the shoot overrun days nobody planned.
 */
export function sceneLoad(p: Project, s: Scene, mods: Set<string> = projectModules(p)): number {
  // A crowd extended in post is shot with clean plates and tracking passes as well (looks.ts).
  return (s.estMinutes / sceneComplexity(s, mods, performedSong(p, s))) * planTime(p, s) * (digitalCrowd(s) ? PLATE_FACTOR : 1);
}

export interface ShootDayGroup { sceneIds: string[]; episodes: number[]; place: string; interior: boolean; night: boolean; load: number }

/**
 * The shoot days the approved live-action scenes need: grouped by episode (or director), place, interior or exterior,
 * and day or night, then filled to a day's capacity. The schedule dates these; the estimate counts and prices them, so
 * a script whose scenes are spread over places and times of day costs the days it really takes (November 8, 2026;
 * the estimate pooled every minute into one total until then).
 */
/** The date ages are reckoned on when planning: the shoot's start, else today. */
export function planningDate(p: Project, state?: GameState): string {
  if (p.schedule.startDate) return p.schedule.startDate;
  return state ? dateKey(state.now, getPlace(p.axes.basePlaceId).zone) : new Date().toISOString().slice(0, 10);
}

/**
 * The children in a project's live scenes, by character, on a date (minors.ts): a cast child by their real age (with
 * the game state), a part not cast by the character's age.
 */
export function minorsInScenes(p: Project, scenes: Scene[], on: string, state?: GameState): Map<string, Minor> {
  const out = new Map<string, Minor>();
  // Per scene: a part's stages can be played by a child in some scenes and an adult in others (parts.ts).
  for (const sc of scenes) for (const cid of sc.participants) {
    if (out.has(cid)) continue;
    const m = minorFor(state, p, cid, on, 'on-set', sc);
    if (m) out.set(cid, m);
  }
  return out;
}

export function groupShootDays(p: Project, state?: GameState): ShootDayGroup[] {
  const mods = projectModules(p);
  // Scenes already filmed in full for the approved draft are done: a rebuilt plan and the estimate leave them out alike.
  const filmed = new Set(p.captures.filter((c) => c.captured >= 0.999 && c.version === p.approvedDraft).map((c) => c.sceneId));
  const scenes = approvedScenes(p).filter((s) => sceneTechnique(p, s) === 'live' && s.kind !== 'archival' && s.kind !== 'narration' && !filmed.has(s.id));
  const groups = new Map<string, Scene[]>();
  const block = !!p.schedule.blockEpisodes && p.episodes.length > 1;
  const directorOf = (ep: number) => p.episodes.find((e) => e.number === ep)?.director ?? 'player';
  for (const s of scenes) {
    const unit = block ? `D:${directorOf(s.episode)}` : String(s.episode);
    const key = `${unit}|${s.storyLocation || s.heading.place}|${s.heading.intExt === 'EXT' ? 'EXT' : 'INT'}|${s.heading.time === 'NIGHT' ? 'N' : 'D'}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(s);
  }
  // A child may work only part of a day (minors.ts): their scenes in a day fill no more than their share of it. Planned
  // as school days, the stricter case, since the dates aren't known yet. Until November 11, 2026 a child's scenes filled
  // a day as an adult's did.
  const kids = minorsInScenes(p, scenes, planningDate(p, state), state);
  const kidCap = (cid: string) => BASE_MINUTES_PER_SHOOT_DAY * childShare(kids.get(cid)!, true);
  const kidsOf = (s: Scene) => s.participants.filter((c) => kids.has(c));
  // Makeup that takes longer than the pre-call allows comes out of the day (looks.ts): a day with scenes that need it
  // holds less. Planned with the makeup crew hired so far, or one chair when none is.
  const chars = approvedCharacters(p);
  const chairs = chairsOf(p);
  const dayCap = (list: Scene[]) => BASE_MINUTES_PER_SHOOT_DAY * makeupShare(list, chars, chairs);
  const out: ShootDayGroup[] = [];
  const sortedGroups = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en', { numeric: true }));
  for (const [key, list] of sortedGroups) {
    const [, place, ie, dn] = key.split('|');
    let bucket: Scene[] = [];
    let load = 0;
    let kidLoad = new Map<string, number>();
    const flush = () => {
      if (!bucket.length) return;
      out.push({ sceneIds: bucket.map((s) => s.id), episodes: [...new Set(bucket.map((s) => s.episode))].sort((x, y) => x - y), place, interior: ie === 'INT', night: dn === 'N', load });
      bucket = [];
      load = 0;
      kidLoad = new Map();
    };
    for (const s of list) {
      const need = sceneLoad(p, s, mods);
      const ks = kidsOf(s);
      if (load + need <= dayCap([...bucket, s]) + 1e-9 && ks.every((k) => (kidLoad.get(k) ?? 0) + need <= kidCap(k) + 1e-9)) {
        bucket.push(s);
        load += need;
        for (const k of ks) kidLoad.set(k, (kidLoad.get(k) ?? 0) + need);
        continue;
      }
      flush();
      // A scene longer than one day's capacity, or than a child in it may work in a day, spans several days.
      const perDay = Math.min(dayCap([s]), ...ks.map(kidCap));
      let remaining = need;
      while (remaining > perDay + 1e-9) {
        bucket = [s];
        load = perDay;
        flush();
        remaining -= perDay;
      }
      bucket = [s];
      load = remaining;
      for (const k of ks) kidLoad.set(k, remaining);
    }
    flush();
  }
  return out;
}

/**
 * Where the unit travels from to shoot at `label` after a day at `prevLabel` (the base when null), when the move takes a
 * working day: that place's name, or null. A day's travel is read by every way a shoot day is dated: the plan, a moved
 * day and a pickup (the v4 package, 02; ledger V4-020.02). Until November 12, 2026 the move was paid but took no time.
 */
export function travelFrom(p: Project, prevLabel: string | null, label: string): string | null {
  const from = prevLabel === null ? getPlace(p.axes.basePlaceId) : dayPlace(p, { locationLabel: prevLabel });
  const to = dayPlace(p, { locationLabel: label });
  return from.id !== to.id && distanceKm(from, to) >= AWAY_KM ? from.name : null;
}

/**
 * After days change places (a swap, a moved day), each scheduled day says again where the unit travels from.
 * shortcut: it relabels and does not re-date; a swap that puts two distant places on consecutive days says the unit
 * travels without a day for it. Re-date here if swaps between distant places become common.
 */
export function relabelTravel(p: Project): void {
  let at: string | null = null;
  for (const d of [...p.schedule.days].filter((x) => x.status !== 'cancelled' && x.status !== 'moved').sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))) {
    if (d.status === 'scheduled') { const from = travelFrom(p, at, d.locationLabel); if (from) d.travelFrom = from; else delete d.travelFrom; }
    at = d.locationLabel;
  }
}

/** The day dated last in the schedule, of any status, or undefined: where the unit was last sent. */
export const lastDay = (p: Project): ShootDay | undefined => p.schedule.days.reduce<ShootDay | undefined>((m, x) => (!m || x.date > m.date ? x : m), undefined);

export function planShootDays(state: GameState, p: Project, firstDay: string): ShootDay[] {
  const days: ShootDay[] = [];
  // Days the player has taken outside work (jobs.ts) are not shoot days: until November 13, 2026 a shoot could be planned
  // over them, and the player was booked twice, though a job was refused over a shoot day.
  const away = new Set((state.jobs ?? []).filter((j) => j.status === 'accepted').flatMap((j) => j.days));
  const workday = (k: string) => { let d = nextWorkingDay(p, k); for (let n = 0; n < 60 && away.has(d); n++) d = nextWorkingDay(p, addDaysToKey(d, 1)); return d; };
  let cursor = workday(firstDay);
  const scenes = approvedScenes(p);
  // Each cast child's licence is applied for now (minors.ts), with night work if any of their scenes is at night. A day
  // with a child waits for their licence: days without children go first, and the child's days follow once it's granted.
  const today = dateKey(state.now, getPlace(p.axes.basePlaceId).zone);
  const kidsIn = (g: ShootDayGroup) => [...minorsInScenes(p, scenes.filter((s) => g.sceneIds.includes(s.id)), firstDay, state).values()];
  const groups = groupShootDays(p, state);
  for (const g of groups) for (const m of kidsIn(g)) ensureLicence(p, m, today, g.night);
  const readyBy = (g: ShootDayGroup) => kidsIn(g).reduce((r, m) => {
    const l = (p.childLicences ?? []).find((x) => x.personId === m.personId && x.characterId === m.characterId);
    const at = l ? (g.night && l.nightApplied ? addDaysToKey(l.nightApplied, m.rules.licence.nightLeadDays) : l.ready) : r;
    return at > r ? at : r;
  }, '');
  const pending = groups.map((g) => ({ g, ready: readyBy(g) }));
  let lastNightKids = new Set<string>();
  // Where the unit is: the base until the first day away (travelFrom).
  let at: string | null = null;
  while (pending.length) {
    const i = pending.findIndex((x) => x.ready <= cursor);
    // Nothing can go yet: wait for the first licence.
    if (i < 0) { cursor = workday(pending.reduce((m, x) => (x.ready < m ? x.ready : m), pending[0].ready)); continue; }
    const { g } = pending.splice(i, 1)[0];
    const kids = kidsIn(g).map((m) => m.characterId);
    // Twelve hours between a child's dismissal and their next call: a day call after a night shoot moves a day on.
    if (!g.night && kids.some((k) => lastNightKids.has(k))) cursor = workday(addDaysToKey(cursor, 1));
    const from = travelFrom(p, at, g.place);
    if (from) cursor = workday(addDaysToKey(cursor, 1));
    days.push({
      ...(from ? { travelFrom: from } : {}),
      id: newId(state, 'd'), date: cursor, episode: g.episodes[0], ...(g.episodes.length > 1 ? { episodes: g.episodes } : {}), sceneIds: g.sceneIds, locationLabel: g.place, interior: g.interior, night: g.night,
      status: 'scheduled', playerActing: scenes.some((s) => g.sceneIds.includes(s.id) && s.participants.some((c) => castIn(p, c, s, () => true)?.performer === 'player')), conflicts: [],
    });
    lastNightKids = new Set(g.night ? kids : []);
    at = g.place;
    cursor = workday(addDaysToKey(cursor, 1));
  }
  // Note conflicts with the player's own appointments.
  for (const d of days) {
    const zone = getPlace(p.axes.basePlaceId).zone;
    const { year, month, day } = parseYmd(d.date);
    const from = localToInstant(zone, year, month, day, 7).instant;
    const to = localToInstant(zone, year, month, day, 19).instant;
    for (const plan of state.plans) {
      if (plan.status === 'upcoming' && plan.start < to && plan.start + plan.durationMin * 60000 > from) d.conflicts.push(`Your plan "${plan.title}" overlaps this shoot day.`);
    }
    for (const other of state.projects) {
      if (other.id === p.id) continue;
      if (other.schedule.days.some((x) => x.date === d.date && x.status === 'scheduled')) d.conflicts.push(`${other.title} also shoots on this day. You can't direct both.`);
    }
  }
  return days;
}

// ---------------- Plan generation (keeps finished work) ----------------

export interface PlanResult {
  tasks: number;
  shootDays: number;
  firstDay: string;
  lastShootDay: string | null;
}

export function generatePlan(state: GameState, p: Project, startDate: string): PlanResult {
  if (p.approvedDraft === null) throw new Error('Approve a draft before planning production.');
  if (p.delivered) throw new Error('This project has already been delivered.');
  if (p.shelved) throw new Error('This project is shelved. Take it up again to plan it.');
  // Until November 13, 2026 a copyrighted work's rights had to be bought and the draft approved first
  // (adaptation.ts, "Copyright"); the owner decided it is credited instead, and blocks nothing.
  if (!isDateKey(startDate)) throw new Error('Choose a start date.');
  const today = dateKey(state.now, getPlace(p.axes.basePlaceId).zone);
  if (startDate < today) throw new Error('Choose a start date from today onward.');
  const backup = { tasks: p.tasks, assets: p.assets, startDate: p.schedule.startDate };
  const fresh = buildTasks(p);
  const old = new Map(p.tasks.map((x) => [x.id, x]));
  p.tasks = fresh.map((nt) => {
    const prev = old.get(nt.id);
    if (!prev) return nt;
    // Finished work stays finished unless the design it depended on changed.
    const stale = nt.needsVersion !== undefined && prev.needsVersion !== undefined && prev.needsVersion < nt.needsVersion;
    return stale ? { ...nt } : { ...nt, done: Math.min(prev.done, nt.units), workedDays: prev.workedDays, status: prev.status === 'done' && prev.done >= nt.units ? 'done' : 'waiting', doneAt: prev.doneAt };
  });
  ensureAssets(p);
  p.schedule.startDate = startDate;
  // Shoot days start after the prep period: one week per five prep units, at least five working days.
  const prepUnits = p.tasks.filter((x) => x.kind.startsWith('prep:') && x.status !== 'done').reduce((a, x) => a + (x.units - x.done), 0);
  let shootStart = startDate;
  const prepDays = Math.max(5, Math.ceil(prepUnits / 3));
  for (let i = 0; i < prepDays; i++) shootStart = nextWorkingDay(p, addDaysToKey(shootStart, 1));
  const kept = p.schedule.days.filter((d) => d.status !== 'scheduled');
  const capturedIds = new Set(p.captures.filter((c) => c.captured >= 0.999 && c.version === p.approvedDraft).map((c) => c.sceneId));
  const planned = planShootDays(state, p, shootStart).map((d) => ({ ...d, sceneIds: d.sceneIds.filter((s) => !capturedIds.has(s)) })).filter((d) => d.sceneIds.length);
  // One owned item can't be on two shoots on the same date (equipment.ts).
  const clash = kitClash(state, p, planned.map((d) => d.date));
  if (clash) {
    p.tasks = backup.tasks;
    p.assets = backup.assets;
    p.schedule.startDate = backup.startDate;
    throw new Error(clash);
  }
  // Budget the schedule: shoot-day costs and materials are reserved now, so they can't be spent twice.
  const shootCost = planned.length * (dayFees(p).location + dayFees(p).equipment) +
    planned.reduce((a, d) => { const its = approvedScenes(p).filter((sc) => d.sceneIds.includes(sc.id)); return a + its.reduce((b, sc) => b + physicalCrowd(sc) * CROWD_DAY_RATE, 0) + makeupDayCost(its, approvedCharacters(p)) + rigDayCost(p, its); }, 0) +
    // Days filmed away from the base: the unit's move, once for each place, and its housing each day (destinations.ts).
    awayCosts(p, planned).reduce((a, x) => a + x.move + x.housing, 0);
  const matCost = p.tasks.filter((x) => x.status !== 'done').reduce((a, x) => a + materialCost(x), 0);
  const previous = p.obligations.filter((o) => (o.ref === 'plan:shoot' || o.ref === 'plan:materials') && (o.state === 'reserved' || o.state === 'committed'));
  const freed = previous.reduce((a, o) => a + Math.max(0, o.amount - o.settled), 0);
  if (shootCost + matCost > ledgerTotals(p).available + freed) {
    p.tasks = backup.tasks;
    p.assets = backup.assets;
    p.schedule.startDate = backup.startDate;
    throw new FundsError(
      `This schedule needs ${money(shootCost + matCost)} for locations, equipment and materials, but only ${money(ledgerTotals(p).available + freed)} is uncommitted. Release someone, cut scenes, or bring in more funding.`,
      shootCost + matCost - ledgerTotals(p).available - freed,
    );
  }
  for (const o of previous) cancel(state, p, o.id);
  if (shootCost > 0) reserve(state, p, 'Shoot Days: Locations, Equipment And Crowds', 'locations', shootCost, 'plan:shoot');
  if (matCost > 0) reserve(state, p, 'Materials, Builds And Licensing', 'materials', matCost, 'plan:materials');
  cancelEvents(state, (e) => e.payload.projectId === p.id && (e.kind === 'shoot-call' || e.kind === 'shoot-wrap' || e.kind === 'weather-check'));
  p.schedule.days = [...kept, ...planned];
  for (const d of planned) scheduleShootDay(state, p, d);
  if (planned.length || p.tasks.length) {
    if (p.phase === 'pre-production' || p.phase === 'development') p.phase = 'production';
  }
  ensureWorkEvent(state, p);
  addLog(state, `${p.title} is scheduled to start on ${formatDateKey(startDate, true)}${planned.length ? ` with ${planned.length} shoot ${planned.length === 1 ? 'day' : 'days'}` : ''}.`, 'project', {
    projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'schedule' },
  });
  p.history.push({ at: state.now, text: `Production scheduled from ${formatDateKey(startDate)}.` }); // until November 10, 2026 the raw 2026-03-17
  return { tasks: p.tasks.length, shootDays: planned.length, firstDay: startDate, lastShootDay: planned[planned.length - 1]?.date ?? null };
}

/**
 * What building the schedule from this date would do, before it is done (the owner's v5 brief, 2: "Preview consequences
 * before approving a plan"; November 13, 2026). The plan is built on a copy of the game, so nothing in the real one
 * changes: the same rules give the same answer, or the same refusal, with its reason.
 */
export interface PlanPreview {
  ok: boolean;
  reason?: string;
  tasks: number;
  /** Tasks whose work is already done, kept as they are. */
  kept: number;
  shootDays: number;
  firstShootDay: string | null;
  lastShootDay: string | null;
  /** Money the plan sets aside for its shoot days and materials, and what is left uncommitted after it. */
  reserved: number;
  leftAfter: number;
}
export function previewPlan(state: GameState, p: Project, startDate: string): PlanPreview {
  const copy = structuredClone(state);
  const q = copy.projects.find((x) => x.id === p.id)!;
  const before = q.obligations.filter((o) => o.ref === 'plan:shoot' || o.ref === 'plan:materials').reduce((a, o) => a + Math.max(0, o.amount - o.settled), 0);
  try {
    const r = generatePlan(copy, q, startDate);
    const live = q.obligations.filter((o) => (o.ref === 'plan:shoot' || o.ref === 'plan:materials') && (o.state === 'reserved' || o.state === 'committed'));
    const shoot = q.schedule.days.filter((d) => d.status === 'scheduled').map((d) => d.date).sort();
    return {
      ok: true, tasks: r.tasks, kept: q.tasks.filter((t) => t.status === 'done').length, shootDays: r.shootDays,
      firstShootDay: shoot[0] ?? null, lastShootDay: shoot[shoot.length - 1] ?? null,
      reserved: live.reduce((a, o) => a + Math.max(0, o.amount - o.settled), 0) - before, leftAfter: ledgerTotals(q).available,
    };
  } catch (e) {
    return { ok: false, reason: (e as Error).message, tasks: 0, kept: 0, shootDays: 0, firstShootDay: null, lastShootDay: null, reserved: 0, leftAfter: ledgerTotals(p).available };
  }
}

export function ensureAssets(p: Project): void {
  const chars = approvedCharacters(p);
  const keep = new Map(p.assets.map((a) => [a.id, a]));
  const next: Asset[] = [];
  for (const task of p.tasks) {
    if (!task.assetRef || !/^(sm:(armature|puppet|costume)|anim:(model|rig))$/.test(task.kind)) continue;
    const c = chars.find((x) => x.id === task.assetRef);
    if (!c) continue;
    const kind: Asset['kind'] = task.kind.startsWith('sm:') ? 'puppet' : task.kind === 'anim:rig' ? 'rig' : task.kind === 'anim:model' ? 'model' : 'design';
    const id = `${kind}:${c.id}`;
    if (next.some((a) => a.id === id)) continue;
    const prev = keep.get(id);
    next.push({
      id, kind, label: `${c.name} ${kind === 'puppet' ? 'Puppet' : kind === 'rig' ? 'Rig' : kind === 'model' ? 'Model' : 'Design'}`, characterId: c.id,
      copies: kind === 'puppet' ? p.schedule.puppetCopies[c.id] ?? 1 : 1, version: c.designVersion, ready: prev?.version === c.designVersion ? prev.ready : false,
      stage: prev?.stage ?? 'Not Started', costumeFitted: prev?.costumeFitted,
    });
  }
  p.assets = next;
}

export function scheduleShootDay(state: GameState, p: Project, d: ShootDay): void {
  // Called on the clock of the place the day is filmed in (destinations.ts).
  const zone = dayPlace(p, d).zone;
  const { year, month, day } = parseYmd(d.date);
  const prev = parseYmd(addDaysToKey(d.date, -1));
  const callHour = d.night ? 17 : 7;
  schedule(state, localToInstant(zone, prev.year, prev.month, prev.day, 18).instant, 'weather-check', { projectId: p.id, dayId: d.id }, { attention: d.interior ? 'silent' : 'notify', priority: 40 });
  schedule(state, localToInstant(zone, year, month, day, callHour).instant, 'shoot-call', { projectId: p.id, dayId: d.id }, { attention: 'interrupt', priority: 15 });
  schedule(state, localToInstant(zone, year, month, day, d.night ? 23 : 19).instant, 'shoot-wrap', { projectId: p.id, dayId: d.id }, { attention: 'notify', priority: 45 });
}

export function ensureWorkEvent(state: GameState, p: Project): void {
  if (p.delivered || p.shelved) return;
  if (state.events.some((e) => e.kind === 'work-day' && e.payload.projectId === p.id)) return;
  const zone = getPlace(p.axes.basePlaceId).zone;
  let key = dateKey(state.now, zone);
  const lp = localParts(state.now, zone);
  if (lp.hour >= 18) key = addDaysToKey(key, 1);
  if (p.schedule.startDate && key < p.schedule.startDate) key = p.schedule.startDate;
  key = nextWorkingDay(p, key);
  const { year, month, day } = parseYmd(key);
  schedule(state, localToInstant(zone, year, month, day, 18).instant, 'work-day', { projectId: p.id, date: key }, { priority: 60 });
}

