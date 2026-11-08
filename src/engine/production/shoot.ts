// Shoot days: weather checks, calls and wraps, moving or swapping days, capture and pickups.
// Part of the production engine; src/engine/production.ts is its public interface.

import { getPlace } from '../../data/places';
import { ledgerTotals, money, settle, FundsError } from '../budget';
import { placeHolidaysOn } from '../holidays';
import { covers, isAvailable, personById, roleLabel } from '../people';
import { approvedCharacters, approvedScenes, isNonfiction, projectModules, sceneLabel } from '../projects';
import { addLog, cancelEvents, newId, registerHandler } from '../state';
import { addDaysToKey, dateKey, formatDateKey } from '../time';
import { BASE_MINUTES_PER_SHOOT_DAY, HOLIDAY_PREMIUM, dayFees } from './rates';
import { ensureWorkEvent, isWorkingDay, nextWorkingDay, sceneComplexity, scheduleShootDay } from './schedule';
import { addLogOnce, payPlanned, plannedRemaining } from './workday';
import { t } from './tasks';
import { personLanguagesFit } from './language';
import type { GameState, Project, Scene, SceneCapture, ShootDay } from '../types';
import { forecast, precipitationDuring, weatherOn, daylightWindowLocal } from '../weather';
import { siteFactor, siteOnTheDay } from '../locations';
import { planTime, recordTakes, shotPlan, takeFigures } from '../takes';

// ---------------- Shoot days ----------------

export const SHOOT_CREW = new Set(['dop', 'camera-operator', 'camera-assistant', 'gaffer', 'key-grip', 'sound-mixer', 'boom-operator', 'first-ad', 'script-supervisor', 'hair-makeup', 'video-assist',
  'stunt-coordinator', 'fight-choreographer', 'intimacy-coordinator', 'animal-wrangler', 'vehicle-coordinator', 'marine-coordinator', 'extras-casting', 'choreographer', 'dialect-coach', 'prop-master', 'costume-designer', 'location-manager']);


registerHandler('weather-check', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const d = p?.schedule.days.find((x) => x.id === ev.payload.dayId);
  if (!p || !d || d.status !== 'scheduled' || d.interior) return { suppressInterrupt: true };
  const place = getPlace(p.axes.basePlaceId);
  const issued = dateKey(state.now, place.zone);
  const f = forecast(state.seed, place, d.date, issued);
  if (f.chanceOfPrecip >= 40) {
    // Package copy: "Rain is expected during your exterior shoot." Offer an interior scene only when one is scheduled.
    const lead = f.summary === 'Rain Likely' || f.summary === 'Snow Likely' ? `${f.summary.startsWith('Snow') ? 'Snow' : 'Rain'} is expected during your exterior shoot.` : `There's a chance of ${f.summary.includes('Snow') ? 'snow' : 'rain'} during your exterior shoot.`;
    const interior = p.schedule.days.some((o) => o.interior && o.status === 'scheduled' && o.date > d.date);
    const text = `${lead} ${p.title} films outside tomorrow. ${interior ? 'You can move the shoot, film an interior scene instead, or keep the plan.' : 'You can move the shoot or keep the plan.'}`;
    addLog(state, text, 'warning', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'schedule' } });
    return { message: text };
  }
  return { suppressInterrupt: true };
});

registerHandler('shoot-call', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const d = p?.schedule.days.find((x) => x.id === ev.payload.dayId);
  if (!p || !d || d.status !== 'scheduled') return { suppressInterrupt: true };
  const directorHired = p.episodes.find((e) => e.number === d.episode)?.director !== 'player';
  const playerNeeded = !directorHired || d.playerActing;
  if (!playerNeeded) return { suppressInterrupt: true };
  const away = state.locationId !== p.axes.basePlaceId || !!state.travel;
  if (state.sleep.asleep || away) {
    d.late = true;
    const text = away
      ? `You weren't in ${getPlace(p.axes.basePlaceId).name} for the call on ${p.title}. The day started late without you.`
      : `You weren't on set for the call on ${p.title}. The day started late.`;
    addLog(state, text, 'warning', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'schedule' } });
    return { message: text };
  }
  const text = `Call time on ${p.title}: ${d.locationLabel}, ${d.sceneIds.length} ${d.sceneIds.length === 1 ? 'scene' : 'scenes'} today.`;
  addLog(state, text, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'schedule' } });
  return { message: text };
});

registerHandler('shoot-wrap', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const d = p?.schedule.days.find((x) => x.id === ev.payload.dayId);
  if (!p || !d || d.status !== 'scheduled') return { suppressInterrupt: true };
  const text = runShootDay(state, p, d);
  return { message: text };
});

export function keepWeatherPlan(state: GameState, p: Project, dayId: string): void {
  const d = p.schedule.days.find((x) => x.id === dayId);
  if (!d) throw new Error('That shoot day no longer exists.');
  d.weatherAnyway = true;
  void state;
}

/** Swap an exterior day with the next scheduled interior day (dates exchange; scenes stay together). */
export function swapWithInteriorDay(state: GameState, p: Project, dayId: string): string {
  const d = p.schedule.days.find((x) => x.id === dayId && x.status === 'scheduled');
  if (!d) throw new Error('That shoot day can no longer be changed.');
  const other = p.schedule.days.find((x) => x.status === 'scheduled' && x.interior && x.date > d.date);
  if (!other) throw new Error('There is no later interior day to swap with. You can keep the plan or wait for the weather.');
  [d.date, other.date] = [other.date, d.date];
  cancelEvents(state, (e) => (e.payload.dayId === d.id || e.payload.dayId === other.id) && ['shoot-call', 'shoot-wrap', 'weather-check'].includes(e.kind));
  scheduleShootDay(state, p, d);
  scheduleShootDay(state, p, other);
  addLog(state, `You swapped the ${d.locationLabel} exterior with the ${other.locationLabel} interior day.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'schedule' } });
  return other.date;
}

/**
 * Move the Shoot: put a scheduled day on the first free working day after the last scheduled shoot day. Everyone
 * needed on set must be free that day; their bookings are extended to cover it. Costs are unchanged (the same day
 * is shot, later), and the day's call, wrap and weather check move with it.
 */
export function moveShootDay(state: GameState, p: Project, dayId: string): string {
  const d = p.schedule.days.find((x) => x.id === dayId && x.status === 'scheduled');
  if (!d) throw new Error('That shoot day can no longer be changed.');
  const taken = new Set(p.schedule.days.filter((x) => x.status === 'scheduled').map((x) => x.date));
  let k = addDaysToKey(p.schedule.days.filter((x) => x.status === 'scheduled').reduce((m, x) => (x.date > m ? x.date : m), d.date), 1);
  for (let i = 0; i < 60 && (!isWorkingDay(p, k) || taken.has(k)); i++) k = addDaysToKey(k, 1);
  if (!isWorkingDay(p, k) || taken.has(k)) throw new Error('There is no free working day to move the shoot to.');
  const onSet = p.hires.filter((h) => h.status === 'accepted' && (SHOOT_CREW.has(h.roleId) || h.kind === 'cast'));
  for (const h of onSet) {
    const person = personById(state, h.personId);
    if (!person) continue;
    const free = isAvailable(state, person, k, k, p.id);
    if (!free.ok) throw new Error(`${free.reason} The shoot can't move to ${formatDateKey(k, true)}.`);
  }
  for (const h of onSet) {
    const b = state.people[h.personId]?.bookings.find((x) => x.projectId === p.id);
    if (b && b.to < k) b.to = k;
  }
  const from = d.date;
  d.date = k;
  d.weatherAnyway = undefined;
  cancelEvents(state, (e) => e.payload.dayId === d.id && ['shoot-call', 'shoot-wrap', 'weather-check'].includes(e.kind));
  scheduleShootDay(state, p, d);
  addLog(state, `You moved the ${d.locationLabel} ${d.interior ? 'interior' : 'exterior'} from ${formatDateKey(from, true)} to ${formatDateKey(k, true)}.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'schedule' } });
  return k;
}

/** A scene's dialogue is re-recorded in post when there was no sound mixer, or (new projects) the weather spoiled it. */
export function needsDialogueReplacement(p: Project, s: Scene, compromised: boolean): boolean {
  return s.dialogue.length > 0 && (!hasCrew(p, 'sound-mixer') || (!!p.takesModel && compromised));
}

export function hasCrew(p: Project, roleId: string): boolean {
  return p.hires.some((h) => covers(h.roleId, roleId) && h.status === 'accepted');
}

export function runShootDay(state: GameState, p: Project, d: ShootDay): string {
  const place = getPlace(p.axes.basePlaceId);
  const mods = projectModules(p);
  const scenes = approvedScenes(p).filter((s) => d.sceneIds.includes(s.id));
  const w = weatherOn(state.seed, place, d.date);
  const f = { late: !!d.late, weatherAnyway: !!d.weatherAnyway };
  const reasons: string[] = [];
  const shot: string[] = [];
  const nonfiction = isNonfiction(p.axes.format);
  // A day cannot run without someone to shoot it.
  const camera = hasCrew(p, 'dop') || hasCrew(p, 'camera-operator');
  if (!camera) {
    d.status = 'lost';
    d.result = 'No camera crew was hired, so nothing could be shot.';
    rescheduleScenes(state, p, d.sceneIds, d);
    addLog(state, `${p.title}: ${d.result}`, 'warning', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'crew' } });
    return d.result;
  }
  // The chosen site can fall through this morning (locations.ts): to the backup if there is one, else the day is lost.
  const where = siteOnTheDay(state.seed, p, d.locationLabel, d.date);
  if (where.lost) {
    d.status = 'lost';
    d.result = where.text!;
    rescheduleScenes(state, p, d.sceneIds, d);
    addLog(state, `${p.title}: ${d.result}`, 'warning', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'schedule' } });
    return d.result;
  }
  if (where.text) addLog(state, `${p.title}: ${where.text}`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'schedule' } });
  const locationFee = Math.round(dayFees(p).location * siteFactor(p, d.locationLabel));
  // Money first: a day whose cost exceeds agreed amounts and uncommitted funds doesn't run.
  const holidayToday = placeHolidaysOn(place, d.date).length > 0;
  const onSetHires = p.hires.filter((h) => h.status === 'accepted' && h.obligationId &&
    (SHOOT_CREW.has(h.roleId) || (h.kind === 'cast' && h.method !== 'voice' && scenes.some((s) => s.participants.includes(h.characterId ?? '')))));
  const overrun = onSetHires.reduce((a, h) => {
    const o = p.obligations.find((x) => x.id === h.obligationId)!;
    const pay = h.dayRate * (holidayToday ? HOLIDAY_PREMIUM : 1);
    return a + Math.max(0, o.settled + pay - Math.max(o.amount, o.settled));
  }, 0) + Math.max(0, locationFee + dayFees(p).equipment + scenes.reduce((a, s) => a + s.crowd, 0) * 180 - plannedRemaining(p, 'plan:shoot'));
  if (overrun > ledgerTotals(p).available) {
    d.status = 'lost';
    d.result = `There wasn't enough money for this shoot day (${money(overrun)} needed beyond what's already agreed). Add funding or cut scope, then rebuild the schedule.`;
    addLogOnce(state, p, `funds:${d.id}`, `${p.title}: ${d.result}`);
    return d.result;
  }
  let capacity = BASE_MINUTES_PER_SHOOT_DAY;
  if (f.late) capacity *= 0.7;
  if (!hasCrew(p, 'first-ad') && scenes.length > 1) capacity *= 0.85;
  const directorHired = p.episodes.find((e) => e.number === d.episode)?.director !== 'player';
  if (d.playerActing && !directorHired && !hasCrew(p, 'video-assist')) capacity *= 0.85; // acting and directing without playback support
  const pending: string[] = [];
  for (const s of scenes) {
    const label = sceneLabel(p, s);
    // Prep readiness.
    const prepMissing = p.tasks.filter((x) => x.kind.startsWith('prep:') && x.kind !== 'prep:rehearsal' && x.status !== 'done' &&
      (x.kind !== 'prep:stunts' || s.stunts.trim()) && (x.kind !== 'prep:choreo' || s.dance) && (x.kind !== 'prep:creature' || s.participants.some((c) => approvedCharacters(p).find((ch) => ch.id === c && ch.entity !== 'human' && ch.realization !== 'performer'))));
    if (prepMissing.length) {
      reasons.push(`${label} couldn't be shot: ${prepMissing[0].label.toLowerCase()} isn't finished.`);
      pending.push(s.id);
      continue;
    }
    // Specialists required for safety-related or regulated work.
    const need: [boolean, string][] = [
      [!!s.stunts.trim(), 'stunt-coordinator'], [s.animals.length > 0, 'animal-wrangler'], [s.water, 'marine-coordinator'], [s.intimacy, 'intimacy-coordinator'],
      [s.crowd > 20, 'extras-casting'], [s.heading.time === 'NIGHT' || s.heading.intExt !== 'EXT', 'gaffer'], [s.vehicles.length > 0, 'vehicle-coordinator'],
    ];
    if (s.kind === 'segment' && !p.hires.some((h) => h.roleId === 'camera-operator' && h.status === 'accepted')) {
      reasons.push(`${label} needs a second camera: hire a camera operator for multi-camera coverage.`);
      pending.push(s.id);
      continue;
    }
    const missing = need.find(([cond, r]) => cond && !hasCrew(p, r));
    if (missing) {
      reasons.push(`${label} needs a ${roleLabel(missing[1]).toLowerCase()}, so it wasn't shot.`);
      pending.push(s.id);
      continue;
    }
    // Cast availability.
    const absent = s.participants.find((cid) => {
      const ch = approvedCharacters(p).find((c) => c.id === cid);
      if (!ch || ch.roleSize === 'background') return false;
      const assignment = p.cast.find((c) => c.characterId === cid && c.method !== 'voice');
      if (!assignment) return true;
      if (assignment.performer === 'player') return state.sleep.asleep && f.late;
      const h = p.hires.find((x) => x.id === assignment.hireId);
      if (!h || h.status !== 'accepted') return true;
      return !isAvailable(state, personById(state, h.personId), d.date, d.date, p.id).ok;
    });
    if (absent && !nonfiction) {
      const name = approvedCharacters(p).find((c) => c.id === absent)?.name ?? 'A character';
      reasons.push(`${label} was skipped because ${name} isn't cast or isn't available.`);
      pending.push(s.id);
      continue;
    }
    if (nonfiction && s.kind === 'interview') {
      const noConsent = s.contributorIds.find((cid) => p.contributors.find((c) => c.id === cid)?.consent !== 'given');
      if (noConsent) {
        reasons.push(`${label} was skipped: ${p.contributors.find((c) => c.id === noConsent)?.name ?? 'the contributor'} hasn't given consent.`);
        pending.push(s.id);
        continue;
      }
    }
    // Weather and daylight for exteriors.
    let compromised = false;
    if (s.heading.intExt === 'EXT') {
      const window: [number, number] = d.night ? [17, 23] : [7, 19];
      if (precipitationDuring(w, window[0], window[1])) {
        if (!f.weatherAnyway) {
          reasons.push(`${w.snow ? 'Snow' : 'Rain'} stopped ${label}.`);
          pending.push(s.id);
          continue;
        }
        compromised = true;
      }
      const dl = daylightWindowLocal(place, d.date);
      const light = Math.max(0, Math.min(dl.to, 19) - Math.max(dl.from, 7));
      if (s.heading.time !== 'NIGHT' && light < 3) {
        reasons.push(`There wasn't enough daylight for ${label}.`);
        pending.push(s.id);
        continue;
      }
    }
    const need2 = (s.estMinutes / sceneComplexity(s, mods)) * planTime(p, s);
    const cap = p.captures.find((c) => c.sceneId === s.id);
    const already = cap && cap.version === p.approvedDraft ? cap.captured : 0;
    const remainingNeed = need2 * (1 - already);
    const fraction = Math.min(1, capacity / Math.max(0.01, remainingNeed));
    capacity -= Math.min(capacity, remainingNeed);
    const quality = captureQuality(state, p, s, compromised, f.late);
    // With a shot plan, the takes are recorded and the best balanced one is used (takes.ts).
    const recorded = shotPlan(p, s.id) ? recordTakes(state.seed, p, s, d.date, quality) : null;
    markCaptured(p, s.id, already + (1 - already) * fraction, recorded ? takeFigures(recorded.takes[recorded.chosen]).quality : quality, compromised);
    if (recorded) Object.assign(p.captures.find((c) => c.sceneId === s.id)!, { takes: recorded.takes, chosenTake: recorded.chosen, perf: recorded.takes[recorded.chosen].perf });
    // Dialogue replacement: recorded without a sound mixer, or, on projects from November 8, 2026, in weather that spoiled
    // the sound (SLATE-15-04.02). The episode's dialogue edit waits for it.
    if (needsDialogueReplacement(p, s, compromised)) {
      const id = `post:adr:${s.id}`;
      if (!p.tasks.some((x) => x.id === id)) {
        p.tasks.push(t('post:adr', s.id, `Dialogue Replacement: ${label}`, 'Post Production', 'sound-designer', 1, 'days', [`milestone:lock:${s.episode}`], { sceneIds: [s.id], episode: s.episode }));
        const edit = p.tasks.find((x) => x.id === `post:dialogue:${s.episode}`);
        if (edit && !edit.dependsOn.includes(id)) edit.dependsOn.push(id);
      }
    }
    if (already + (1 - already) * fraction < 0.999) {
      pending.push(s.id);
      reasons.push(`${label} ran out of time and needs another day.`);
    } else shot.push(label);
    if (capacity <= 0.01) {
      for (const rest of scenes.slice(scenes.indexOf(s) + 1)) pending.push(rest.id);
      if (scenes.indexOf(s) < scenes.length - 1) reasons.push('The day ran out before every scene was shot.');
      break;
    }
  }
  // Costs: everyone on the shoot crew and the cast in today's scenes is paid once for the day.
  for (const h of onSetHires) {
    if (settle(state, p, h.obligationId!, h.dayRate * (holidayToday ? HOLIDAY_PREMIUM : 1), `${h.id}:${d.date}`)) h.daysWorked += 1;
  }
  try {
    payPlanned(state, p, 'plan:shoot', `Location Fee (${d.date})`, 'locations', locationFee, `loc:${d.id}`);
    payPlanned(state, p, 'plan:shoot', `Equipment Package (${d.date})`, 'equipment', dayFees(p).equipment, `eq:${d.id}`);
    const crowd = scenes.reduce((a, s) => a + s.crowd, 0);
    if (crowd) payPlanned(state, p, 'plan:shoot', `Background Performers (${d.date})`, 'cast', crowd * 180, `crowd:${d.id}`);
  } catch (e) {
    if (e instanceof FundsError) addLogOnce(state, p, `day:${d.id}`, `${p.title} couldn't pay for today's location and equipment. Add funding before the next shoot day.`);
  }
  const progressed = scenes.some((s) => !pending.includes(s.id) || (p.captures.find((c) => c.sceneId === s.id)?.captured ?? 0) > 0 && reasons.some((r) => r.includes('ran out of time') && r.includes(sceneLabel(p, s))));
  d.status = pending.length === 0 ? 'shot' : shot.length || progressed ? 'partial' : 'lost';
  const unique = [...new Set(pending)];
  if (unique.length) rescheduleScenes(state, p, unique, d);
  d.result = shot.length
    ? `Shot ${shot.length} of ${scenes.length} ${scenes.length === 1 ? 'scene' : 'scenes'}.${reasons.length ? ` ${reasons[0]}` : ''}`
    : reasons[0] ?? 'Nothing was shot.';
  addLog(state, `${p.title}, ${formatDateKey(d.date)}: ${d.result}${unique.length ? ' The remaining work moved to a new day.' : ''}`, d.status === 'shot' ? 'project' : 'warning', {
    projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'schedule' },
  });
  return d.result;
}

export function rescheduleScenes(state: GameState, p: Project, sceneIds: string[], after: ShootDay): void {
  const last = p.schedule.days.reduce((m, x) => (x.date > m ? x.date : m), after.date);
  const date = nextWorkingDay(p, addDaysToKey(last, 1));
  const nd: ShootDay = {
    id: newId(state, 'd'), date, episode: after.episode, sceneIds: [...sceneIds], locationLabel: after.locationLabel, interior: after.interior, night: after.night,
    status: 'scheduled', playerActing: after.playerActing, conflicts: [],
  };
  p.schedule.days.push(nd);
  scheduleShootDay(state, p, nd);
  ensureWorkEvent(state, p);
}

/** Pickup days for scenes that need more coverage; grouped by location like the main schedule. */
export function schedulePickups(state: GameState, p: Project, sceneIds: string[]): number {
  const scenes = approvedScenes(p).filter((s) => sceneIds.includes(s.id));
  const groups = new Map<string, Scene[]>();
  for (const s of scenes) {
    const k = `${s.episode}|${s.storyLocation || s.heading.place}|${s.heading.intExt === 'EXT' ? 'E' : 'I'}|${s.heading.time === 'NIGHT' ? 'N' : 'D'}`;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(s);
  }
  const zone = getPlace(p.axes.basePlaceId).zone;
  // Pickups follow main photography: from three days out, and never before the last scheduled shoot day. Until November 7,
  // 2026 they were always three days out, so a pickup asked for before the shoot ran ahead of prep and was lost, still paid.
  const lastScheduled = p.schedule.days.filter((x) => x.status === 'scheduled').reduce((m, x) => (x.date > m ? x.date : m), '');
  const soonest = addDaysToKey(dateKey(state.now, zone), 3);
  let date = nextWorkingDay(p, lastScheduled && lastScheduled >= soonest ? addDaysToKey(lastScheduled, 1) : soonest);
  let n = 0;
  for (const [k, list] of groups) {
    const [ep, place, ie, dn] = k.split('|');
    const d: ShootDay = {
      id: newId(state, 'd'), date, episode: Number(ep), sceneIds: list.map((s) => s.id), locationLabel: place, interior: ie === 'I', night: dn === 'N', status: 'scheduled',
      playerActing: list.some((s) => s.participants.some((c) => p.cast.some((a) => a.characterId === c && a.performer === 'player'))), conflicts: [],
    };
    p.schedule.days.push(d);
    scheduleShootDay(state, p, d);
    date = nextWorkingDay(p, addDaysToKey(date, 1));
    n += 1;
  }
  ensureWorkEvent(state, p);
  addLog(state, `${n} pickup ${n === 1 ? 'day is' : 'days are'} scheduled for ${p.title}.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'schedule' } });
  return n;
}

export function markCaptured(p: Project, sceneId: string, captured: number, quality: number, weatherCompromised: boolean): void {
  const existing = p.captures.find((c) => c.sceneId === sceneId);
  const scene = p.scenes.find((s) => s.id === sceneId);
  const now = p.cast.filter((c) => c.method !== 'voice' && scene?.participants.includes(c.characterId)).map((c) => c.performer);
  const performers = [...new Set([...(existing?.performers ?? []), ...now])];
  const rec: SceneCapture = { sceneId, captured: Math.min(1, captured), quality, version: p.approvedDraft ?? 0, weatherCompromised, ...(performers.length ? { performers } : {}) };
  if (existing) Object.assign(existing, rec);
  else p.captures.push(rec);
}

/** Modeled capture quality: rehearsal, key crew capability and conditions. A game model, not a measure of art. */
export function captureQuality(state: GameState, p: Project, s: Scene, compromised: boolean, late: boolean): number {
  const crewCap = ['dop', 'sound-mixer', 'gaffer', 'first-ad'].map((r) => {
    const h = p.hires.find((x) => x.roleId === r && x.status === 'accepted');
    return h ? personById(state, h.personId).capability : 45;
  });
  const castCap = s.participants.map((cid) => {
    const a = p.cast.find((c) => c.characterId === cid);
    if (!a) return 50;
    // Dialogue in a language the performer doesn't speak, with no coach hired, costs quality.
    const coachPenalty = !personLanguagesFit(state, p, a) && !hasCrew(p, 'dialect-coach') ? 12 : 0;
    if (a.performer === 'player') return 55 + Math.min(20, p.schedule.rehearsalDays * 3) - coachPenalty;
    const h = p.hires.find((x) => x.id === a.hireId);
    return (h ? personById(state, h.personId).capability : 50) - coachPenalty;
  });
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 50);
  const rehearsal = p.tasks.find((x) => x.kind === 'prep:rehearsal')?.status === 'done' ? 6 : 0;
  let q = 0.5 * avg(crewCap) + 0.5 * avg(castCap) + rehearsal;
  if (compromised) q -= 15;
  if (late) q -= 5;
  return Math.round(Math.max(5, Math.min(100, q)));
}

