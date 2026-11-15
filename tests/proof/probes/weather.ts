// Weather on the shoot: the forecast warning for an exterior day, and what the player does with it.
import type { Probe } from '../probe';
import type { GameState } from '../../../src/engine/types';
import { forecast } from '../../../src/engine/weather';
import { dayPlace } from '../../../src/engine/destinations';
import { keepWeatherPlan, moveShootDay, swapWithInteriorDay } from '../../../src/engine/production/shoot';
import { addDaysToKey, dateKey } from '../../../src/engine/time';
import { buildProject } from '../../helpers';
import { unfunded } from '../career';

/** Each day, for tomorrow's exterior days the forecast warns of (rain at 40% or more, as weather-check warns): act. */
const onWarning = (act: 'swap' | 'move' | 'keep') => (s: GameState) => {
  for (const p of s.projects.filter((x) => !x.delivered)) {
    for (const d of p.schedule.days.filter((x) => x.status === 'scheduled' && !x.interior)) {
      const place = dayPlace(p, d);
      const today = dateKey(s.now, place.zone);
      if (d.date !== addDaysToKey(today, 1) || forecast(s.seed, place, d.date, today).chanceOfPrecip < 40) continue;
      try {
        if (act === 'swap') swapWithInteriorDay(s, p, d.id);
        else if (act === 'move') moveShootDay(s, p, d.id);
        else keepWeatherPlan(s, p, d.id);
      } catch { /* no interior day to swap with, or no free day: kept as it was */ }
    }
  }
};
/**
 * Each day, from the log: a warning of rain on tomorrow's exterior shoot (production/shoot.ts weather-check) moves that
 * day to after the last. This player learns of the weather only from the warning; onWarning reads the forecast itself.
 */
export const onLoggedWarning = (s: GameState) => {
  for (const p of s.projects.filter((x) => !x.delivered)) {
    // Each warning since yesterday names the day after it was given.
    for (const l of s.log.filter((x) => x.projectId === p.id && x.at >= s.now - 86_400_000 && / films outside tomorrow\./.test(x.text))) {
      for (const d of p.schedule.days.filter((x) => x.status === 'scheduled' && !x.interior)) {
        if (d.date !== addDaysToKey(dateKey(l.at, dayPlace(p, d).zone), 1)) continue;
        try { moveShootDay(s, p, d.id); } catch { /* no free day: kept */ }
      }
    }
  }
};
export const RAINY = { years: 2 };
/**
 * The default short with its exterior shot first: the plan orders places by name (schedule.ts groupShootDays), and the
 * default's one exterior, the Street, comes last, so there was never a later interior day to swap it with and the swap
 * probe measured nothing (until November 14, 2026).
 */
const exteriorFirst = (s: GameState, year: number) => unfunded(buildProject(s, { title: `Year ${year + 1}`, format: 'short', medium: 'live-action', scenario: 'micro', genres: ['drama'], runtime: 10 },
  [{ name: 'Lead', patch: { roleSize: 'lead' } }, { name: 'Friend', patch: { roleSize: 'supporting' } }],
  [{ place: 'Allotment', intExt: 'EXT', chars: ['Lead'], minutes: 3 }, { place: 'Cafe', chars: ['Lead', 'Friend'], minutes: 4 }, { place: 'Flat', chars: ['Lead', 'Friend'], minutes: 3 }]));

export const PROBES: Probe[] = [
  { id: 'weather-swap', seeds: 60, features: ['action:production/shoot.swapWithInteriorDay'], decision: 'When rain is forecast for an exterior day, film an interior day instead',
    reads: ['src/engine/production/shoot.ts#swapWithInteriorDay'], base: { ...RAINY, project: exteriorFirst }, variant: { ...RAINY, project: exteriorFirst, daily: onWarning('swap') }, bites: ['lostDays'], downstream: ['daysToDeliver', 'spent', 'money'] },
  { id: 'weather-move', seeds: 60, features: ['action:production/shoot.moveShootDay'], decision: 'When rain is forecast for an exterior day, move the shoot to after the last day',
    reads: ['src/engine/production/shoot.ts#moveShootDay'], base: RAINY, variant: { ...RAINY, daily: onWarning('move') }, bites: ['lostDays', 'daysToDeliver'], downstream: ['spent', 'money'] },
  { id: 'weather-keep', seeds: 60, features: ['action:production/shoot.keepWeatherPlan', 'scheduled:weather-check'], decision: 'When rain is forecast for an exterior day, shoot anyway',
    reads: ['src/engine/production/shoot.ts#keepWeatherPlan', 'src/engine/production/shoot.ts#handler:weather-check'], base: RAINY, variant: { ...RAINY, daily: onWarning('keep') }, bites: ['lostDays'], downstream: ['overall', 'daysToDeliver', 'spent'] },
];
