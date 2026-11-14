/**
 * A bank's business days in its own country (2026-09-28): a US bank keeps the
 * Federal Reserve's holidays; every other bank its country's public and bank
 * holidays from the holiday file, and its customer's region's. Until then a
 * bank outside the US kept only weekends.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { addCountryHolidays } from '../../src/engine/bankworld/content/holidays';
import { afterBusinessDays, bankHoliday, businessDay, businessDaysBetween, countryOfIso } from '../../src/engine/bankworld/content/bankdays';
import { nextBusinessDay } from '../../src/engine/bankworld/systems/lending';

addCountryHolidays('uk', readFileSync('src/engine/bankworld/data/holidays/uk.tsv', 'utf8'));
addCountryHolidays('jp', readFileSync('src/engine/bankworld/data/holidays/jp.tsv', 'utf8'));

describe('a bank’s business days', () => {
  it('keep the country’s holidays: Easter Monday in Britain, the New Year’s bank days in Japan, Thanksgiving in America', () => {
    expect(bankHoliday('uk', '2027-03-29')).toBe(true);
    expect(businessDay('uk', '2027-03-30')).toBe(true);
    expect(bankHoliday('jp', '2027-01-04')).toBe(false);
    expect(bankHoliday('jp', '2027-01-02')).toBe(true);
    expect(bankHoliday('us', '2026-11-26')).toBe(true);
    // A Friday's payment in London posts two business days on: past Good Friday itself it's the Tuesday and Wednesday.
    expect(nextBusinessDay('2027-03-25', 'uk')).toBe('2027-03-30');
    // A country whose file isn't in hand (Germany's, here) keeps weekends only.
    expect(nextBusinessDay('2027-03-25', 'de')).toBe('2027-03-26');
  });

  it('keep the region’s: England’s summer bank holiday, not Scotland’s', () => {
    expect(bankHoliday('uk', '2027-08-30', 'uk-eng')).toBe(true);
    expect(bankHoliday('uk', '2027-08-30', 'uk-sct')).toBe(false);
    expect(bankHoliday('uk', '2027-08-02', 'uk-sct')).toBe(true);
  });

  it('count forward and between past the holidays', () => {
    const thursday = Date.UTC(2027, 2, 25, 12);
    // Friday is Good Friday and Monday Easter Monday: two business days from Thursday is Wednesday.
    expect(new Date(afterBusinessDays(thursday, 2, 'uk', 'Europe/London')).toISOString().slice(0, 10)).toBe('2027-03-31');
    expect(new Date(afterBusinessDays(thursday, 2, 'de', 'Europe/Berlin')).toISOString().slice(0, 10)).toBe('2027-03-29');
    expect(businessDaysBetween(thursday, Date.UTC(2027, 2, 31, 12), 'uk', 'Europe/London')).toBe(2);
    expect(countryOfIso('GB')).toBe('uk');
    expect(countryOfIso('IS')).toBe('is');
  });
});
