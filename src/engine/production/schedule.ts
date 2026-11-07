// Shoot-day planning and plan generation (finished work is kept when a plan is rebuilt).
// Part of the production engine; src/engine/production.ts is its public interface.

import type { Asset, GameState, Project, Scene, ShootDay } from '../types';
import { getPlace } from '../../data/places';
import { cancel, ledgerTotals, money, reserve, FundsError } from '../budget';
import { isMakeUpWorkday, placeHolidaysOn } from '../holidays';
import { observancesOn } from '../observances';
import { approvedCharacters, approvedScenes, projectModules, sceneTechnique } from '../projects';
import { addLog, cancelEvents, newId, schedule } from '../state';
import { addDaysToKey, dateKey, formatDateKey, isDateKey, localParts, localToInstant, parseYmd, weekdayOfKey } from '../time';
import { materialCost } from './workday';
import { buildTasks } from './tasks';
import { BASE_MINUTES_PER_SHOOT_DAY, dayFees } from './rates';

// ---------------- Shoot day planning ----------------

export function sceneComplexity(s: Scene, mods: Set<string>): number {
  let f = 1;
  if (s.stunts.trim()) f *= mods.has('action') ? 0.55 : 0.6;
  if (s.crowd > 20) f *= 0.7;
  if (s.animals.length) f *= 0.75;
  if (s.water) f *= 0.7;
  if (s.heading.time === 'NIGHT') f *= 0.85;
  if (s.songs.length || s.dance) f *= 0.75;
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

/** Group live scenes into shoot days by episode block, location and interior/exterior, not script order. */
export function planShootDays(state: GameState, p: Project, firstDay: string): ShootDay[] {
  const mods = projectModules(p);
  const scenes = approvedScenes(p).filter((s) => sceneTechnique(p, s) === 'live' && s.kind !== 'archival' && s.kind !== 'narration');
  const groups = new Map<string, Scene[]>();
  for (const s of scenes) {
    const key = `${s.episode}|${s.storyLocation || s.heading.place}|${s.heading.intExt === 'EXT' ? 'EXT' : 'INT'}|${s.heading.time === 'NIGHT' ? 'N' : 'D'}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(s);
  }
  const days: ShootDay[] = [];
  let cursor = nextWorkingDay(p, firstDay);
  const playerChars = new Set(p.cast.filter((c) => c.performer === 'player').map((c) => c.characterId));
  const sortedGroups = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en', { numeric: true }));
  for (const [key, list] of sortedGroups) {
    const [ep, place, ie, dn] = key.split('|');
    let bucket: Scene[] = [];
    let load = 0;
    const flush = () => {
      if (!bucket.length) return;
      days.push({
        id: newId(state, 'd'), date: cursor, episode: Number(ep), sceneIds: bucket.map((s) => s.id), locationLabel: place, interior: ie === 'INT', night: dn === 'N',
        status: 'scheduled', playerActing: bucket.some((s) => s.participants.some((c) => playerChars.has(c))), conflicts: [],
      });
      cursor = nextWorkingDay(p, addDaysToKey(cursor, 1));
      bucket = [];
      load = 0;
    };
    for (const s of list) {
      const need = s.estMinutes / sceneComplexity(s, mods);
      if (load + need <= BASE_MINUTES_PER_SHOOT_DAY) {
        bucket.push(s);
        load += need;
        continue;
      }
      flush();
      // A scene longer than one day's capacity spans several consecutive days.
      let remaining = need;
      while (remaining > BASE_MINUTES_PER_SHOOT_DAY) {
        bucket = [s];
        flush();
        remaining -= BASE_MINUTES_PER_SHOOT_DAY;
      }
      bucket = [s];
      load = remaining;
    }
    flush();
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
  // Budget the schedule: shoot-day costs and materials are reserved now, so they can't be spent twice.
  const shootCost = planned.length * (dayFees(p).location + dayFees(p).equipment) +
    planned.reduce((a, d) => a + approvedScenes(p).filter((sc) => d.sceneIds.includes(sc.id)).reduce((b, sc) => b + sc.crowd * 180, 0), 0);
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
  p.history.push({ at: state.now, text: `Production scheduled from ${startDate}.` });
  return { tasks: p.tasks.length, shootDays: planned.length, firstDay: startDate, lastShootDay: planned[planned.length - 1]?.date ?? null };
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
  const zone = getPlace(p.axes.basePlaceId).zone;
  const { year, month, day } = parseYmd(d.date);
  const prev = parseYmd(addDaysToKey(d.date, -1));
  const callHour = d.night ? 17 : 7;
  schedule(state, localToInstant(zone, prev.year, prev.month, prev.day, 18).instant, 'weather-check', { projectId: p.id, dayId: d.id }, { attention: d.interior ? 'silent' : 'notify', priority: 40 });
  schedule(state, localToInstant(zone, year, month, day, callHour).instant, 'shoot-call', { projectId: p.id, dayId: d.id }, { attention: 'interrupt', priority: 15 });
  schedule(state, localToInstant(zone, year, month, day, d.night ? 23 : 19).instant, 'shoot-wrap', { projectId: p.id, dayId: d.id }, { attention: 'notify', priority: 45 });
}

export function ensureWorkEvent(state: GameState, p: Project): void {
  if (p.delivered) return;
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

