import { describe, expect, it } from 'vitest';
import { PLACES } from '../src/data/places';
import { daylight, localParts } from './engine-api';

// Consistency checks that catch gross coordinate or zone errors (sign flips, wrong zone).
// They are not a substitute for checking each record against GeoNames.
describe('place catalog consistency', () => {
  it('every place has a plausible local solar noon for its zone (10:00 to 15:00 at the equinox)', () => {
    for (const p of PLACES) {
      const d = daylight(p.lat, p.lon, '2026-03-20');
      expect(d.sunrise, p.id).not.toBeNull();
      const noon = (d.sunrise! + d.sunset!) / 2;
      const lp = localParts(noon, p.zone);
      const hours = lp.hour + lp.minute / 60;
      expect(hours, `${p.id} solar noon ${hours.toFixed(2)}`).toBeGreaterThan(10);
      expect(hours, `${p.id} solar noon ${hours.toFixed(2)}`).toBeLessThan(15);
    }
  });
  it('southern-hemisphere places have longer days in December than in June, northern ones the reverse', () => {
    for (const p of PLACES.filter((x) => Math.abs(x.lat) > 15)) {
      const dec = daylight(p.lat, p.lon, '2026-12-21').dayLengthHours;
      const jun = daylight(p.lat, p.lon, '2026-06-21').dayLengthHours;
      if (p.lat < 0) expect(dec, p.id).toBeGreaterThan(jun);
      else expect(jun, p.id).toBeGreaterThan(dec);
    }
  });
  it('zones belong to the right broad region for each country', () => {
    const region: Record<string, RegExp> = {
      US: /^(America|Pacific\/Honolulu)/, CA: /^America/, MX: /^America/, BR: /^America/, AR: /^America/, AU: /^Australia/, NZ: /^Pacific\/Auckland/,
      JP: /^Asia/, KR: /^Asia/, CN: /^Asia/, IN: /^Asia/, AE: /^Asia/, SA: /^Asia/, EG: /^Africa/, MA: /^Africa/, NG: /^Africa/, BF: /^Africa/, KE: /^Africa/, ZA: /^Africa/,
    };
    for (const p of PLACES) {
      const re = region[p.country] ?? /^Europe/;
      expect(p.zone, p.id).toMatch(re);
    }
  });
});
