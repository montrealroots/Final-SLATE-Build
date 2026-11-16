// A visit's limit (papers.ts "staying", from November 16, 2026): a Japanese actor living in Toronto visits New York on
// the Visa Waiver Program's authorization, stays past its 90 days, comes home, and goes back the next spring. The
// overstay voids the authorization and closes the waiver to them, so the second trip asks a visa of them first.
import type { Probe } from '../probe';
import type { GameState } from '../../../src/engine/types';
import { applyForVisa, entryRefusal, overstays, stays, visaCheck } from '../../../src/engine/papers';
import { travelRefusal, travelTo } from '../../../src/engine/state';
import { getPlace } from '../../../src/data/places';

const NEW_YORK = 'us-new-york';
const DAY = 86_400_000;
/** Days spent in the United States, to `until`. */
const usDays = (s: GameState, until = s.now) => stays(s).filter((x) => x.country === 'US' && x.from < until).reduce((a, x) => a + (Math.min(x.until ?? s.now, until) - x.from) / DAY, 0);
/** The first trip, from the day the authorization lets them in, lasts 105 days (past the 90 the waiver allows); the second, days 250 to 279. */
const away = (s: GameState, day: number) => (day < 250 && usDays(s) < 105) || (day >= 250 && day < 280);

function usTrips(s: GameState, day: number): void {
  if (s.travel) return;
  const inUS = getPlace(s.locationId).country === 'US';
  if (away(s, day) && !inUS) {
    if (entryRefusal(s, 'US')) {
      if (visaCheck(s, 'US').ok) applyForVisa(s, 'US');
      return;
    }
    if (!travelRefusal(s, NEW_YORK)) travelTo(s, NEW_YORK);
  } else if (!away(s, day) && inUS && !travelRefusal(s, s.character.livesIn)) travelTo(s, s.character.livesIn);
}

export const STAYS_BASE: Probe['base'] = { years: 1, placeId: 'ca-toronto', creation: { nationalities: ['JP'], birthplaceId: 'jp-tokyo' }, daily: usTrips };

export const staysMeasure = (s: GameState) => {
  const second = s.startedAt + 250 * DAY;
  const visas = (s.paperApplications ?? []).filter((a) => a.kind === 'visa' && a.country === 'US');
  return {
    overstays: overstays(s).length,
    // Days in the United States from the second trip's first day.
    secondTripDays: stays(s).filter((x) => x.country === 'US').reduce((a, x) => a + Math.max(0, ((x.until ?? s.now) - Math.max(x.from, second)) / DAY), 0),
    usVisas: visas.length,
    papersPaid: visas.reduce((a, v) => a + v.fee.paidUsdMinor / 100, 0),
  };
};
