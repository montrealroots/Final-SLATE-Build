// The call sheet for a shoot day (SLATE-11-05.03, November 8, 2026). Shoot days listed their scenes and location; who
// was called, when, and what the day held was the player's to work out. The call sheet says it, read from the same
// things the day runs on (production/shoot.ts runShootDay and schedule.ts scheduleShootDay): the call and wrap the
// game schedules, the crew and the on-camera cast it pays that day, the parts still uncast, daylight for an exterior,
// the forecast once there is one, and a public holiday's premium. It is derived, never stored, so it can't disagree
// with the day. Loaded with the Schedule page, not at startup.
import { castIn, partName, stageIn } from './parts';
import { dayPlace, filmedAt, isAway } from './destinations';
import { roofed } from './locations';
import { placeHolidaysOn } from './holidays';
import { personById, roleLabel } from './people';
import { SHOOT_CREW } from './production/shoot';
import { HOLIDAY_PREMIUM } from './production/rates';
import { approvedCharacters, approvedScenes, sceneLabel } from './projects';
import { dateKey, formatClock, formatTime } from './time';
import { daylight, forecast } from './weather';
import { makeupLead, madeUp, physicalCrowd } from './looks';
import { chairsOf } from './production/schedule';
import type { GameState, Project } from './types';

export interface CallSheet {
  call: string;
  wrap: string;
  where: string;
  scenes: string[];
  cast: { part: string; who: string; scenes: string[] }[];
  uncast: string[];
  crew: { role: string; who: string }[];
  notes: string[];
}

export function callSheet(state: GameState, p: Project, dayId: string): CallSheet {
  const d = p.schedule.days.find((x) => x.id === dayId);
  if (!d) throw new Error('That shoot day no longer exists.');
  // Where the day is filmed (destinations.ts): its daylight and its clock are that place's.
  const place = dayPlace(p, d);
  const scenes = approvedScenes(p).filter((s) => d.sceneIds.includes(s.id));
  const chars = approvedCharacters(p);
  const cast: CallSheet['cast'] = [];
  const uncast: string[] = [];
  for (const c of chars.filter((x) => x.roleSize !== 'background' && scenes.some((s) => s.participants.includes(x.id)))) {
    // A part with stages (parts.ts) is a line for each stage the day's scenes call.
    for (const stage of [...new Set(scenes.filter((s) => s.participants.includes(c.id)).map((s) => stageIn(p, c.id, s)))]) {
      const mine = scenes.filter((s) => s.participants.includes(c.id) && stageIn(p, c.id, s) === stage);
      const its = mine.map((s) => sceneLabel(p, s));
      // On camera only: a voice part is recorded in a session, not on set (runShootDay pays the same people).
      const a = castIn(p, c.id, mine[0], (x) => x.method === 'on-camera');
      const part = partName(p, c.id, stage);
      if (a) cast.push({ part, who: a.performer === 'player' ? 'You' : personById(state, a.performer).name, scenes: its });
      else if (c.methods.includes('on-camera')) uncast.push(`${part} isn't cast yet (${its.join(', ')}).`);
    }
  }
  const crew = p.hires.filter((h) => h.status === 'accepted' && SHOOT_CREW.has(h.roleId))
    .map((h) => ({ role: roleLabel(h.roleId), who: personById(state, h.personId).name }))
    .sort((a, b) => a.role.localeCompare(b.role));
  const notes: string[] = [];
  const crowd = scenes.reduce((a, s) => a + physicalCrowd(s), 0);
  if (crowd) notes.push(`${crowd} background ${crowd === 1 ? 'performer' : 'performers'}.`);
  // Makeup that starts before the unit's call (looks.ts): who is in the chair, and how long before call it starts.
  const lead = makeupLead(scenes, chars, chairsOf(p));
  if (lead > 0) {
    const who = madeUp(scenes, chars).map((x) => `${x.c.name} (${x.m.label.toLowerCase()})`);
    if (scenes.some((s) => s.crowdLook && physicalCrowd(s) > 0)) who.push('the background performers');
    const callMin = (d.night ? 17 : 7) * 60;
    const span = `${lead >= 60 ? `${Math.floor(lead / 60)} ${lead >= 120 ? 'hours' : 'hour'}${lead % 60 ? ` ${lead % 60} minutes` : ''}` : `${lead} minutes`}`;
    // More chair time than there is morning: it can't all be done before call with the people hired.
    notes.push(lead > callMin
      ? `Makeup needs ${span} with the people hired, more than there is before call: ${who.join(', ')}. Hire more makeup artists, or the day shoots less.`
      : `Makeup starts at ${formatClock(Math.floor((callMin - lead) / 60), (callMin - lead) % 60)}, ${span} before call: ${who.join(', ')}.`);
  }
  const holiday = placeHolidaysOn(place, d.date)[0];
  if (holiday) notes.push(`${holiday.name}: a public holiday, so everyone on set is paid ${HOLIDAY_PREMIUM} times their day rate.`);
  if (!d.interior && roofed(p, d.locationLabel)) notes.push('Filmed under a roof: the weather and the daylight do not matter today.');
  else if (!d.interior) {
    const light = daylight(place.lat, place.lon, d.date);
    if (light.sunrise !== null && light.sunset !== null) notes.push(`Sunrise ${formatTime(light.sunrise, place.zone)}, sunset ${formatTime(light.sunset, place.zone)}.`);
    else notes.push(light.polar === 'night' ? 'No daylight: the sun stays below the horizon.' : 'Daylight all day: the sun stays up.');
    const today = dateKey(state.now, place.zone);
    if (d.status === 'scheduled' && d.date >= today) {
      const fc = forecast(state.seed, place, d.date, today);
      if (fc.leadDays <= 10) notes.push(`Forecast: ${fc.summary}, ${fc.chanceOfPrecip}% chance of rain or snow.`);
    }
  }
  if (!crew.some((c) => c.role === roleLabel('dop') || c.role === roleLabel('camera-operator'))) notes.push('No camera crew is hired: the day can\'t be shot without one.');
  return {
    call: formatClock(d.night ? 17 : 7, 0),
    wrap: formatClock(d.night ? 23 : 19, 0),
    where: `${d.locationLabel}, ${d.interior ? 'interior' : 'exterior'}${d.night ? ', night' : ''}${filmedAt(p, d.locationLabel) ? `. Filmed in ${place.name}, ${place.countryName}, on ${place.name}'s clock${isAway(p, d.locationLabel) ? ': be there for the call' : ''}` : ''}`,
    scenes: scenes.map((s) => sceneLabel(p, s)),
    cast, uncast, crew, notes: [...notes, ...d.conflicts],
  };
}
