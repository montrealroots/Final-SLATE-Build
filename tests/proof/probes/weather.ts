// Weather on the shoot: the forecast warning for an exterior day, and what the player does with it.
import type { Probe } from '../probe';
import type { GameState } from '../../../src/engine/types';
import { forecast } from '../../../src/engine/weather';
import { dayPlace } from '../../../src/engine/destinations';
import { keepWeatherPlan, moveShootDay, swapWithInteriorDay } from '../../../src/engine/production/shoot';
import { addDaysToKey, dateKey } from '../../../src/engine/time';

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
const RAINY = { years: 2 };

export const PROBES: Probe[] = [
  { id: 'weather-swap', seeds: 60, features: ['action:production/shoot.swapWithInteriorDay'], decision: 'When rain is forecast for an exterior day, film an interior day instead',
    reads: ['src/engine/production/shoot.ts#swapWithInteriorDay'], base: RAINY, variant: { ...RAINY, daily: onWarning('swap') }, bites: ['lostDays'], downstream: ['daysToDeliver', 'spent', 'money'] },
  { id: 'weather-move', seeds: 60, features: ['action:production/shoot.moveShootDay'], decision: 'When rain is forecast for an exterior day, move the shoot to after the last day',
    reads: ['src/engine/production/shoot.ts#moveShootDay'], base: RAINY, variant: { ...RAINY, daily: onWarning('move') }, bites: ['lostDays', 'daysToDeliver'], downstream: ['spent', 'money'] },
  { id: 'weather-keep', seeds: 60, features: ['action:production/shoot.keepWeatherPlan', 'scheduled:weather-check'], decision: 'When rain is forecast for an exterior day, shoot anyway',
    reads: ['src/engine/production/shoot.ts#keepWeatherPlan', 'src/engine/production/shoot.ts#handler:weather-check'], base: RAINY, variant: { ...RAINY, daily: onWarning('keep') }, bites: ['lostDays'], downstream: ['overall', 'daysToDeliver', 'spent'] },
];
