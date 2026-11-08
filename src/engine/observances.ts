// Holidays a character keeps from their own backgrounds, beyond where they live: Lunar New Year, Eid, Diwali, Pesach and
// the rest. Backgrounds suggest them; anyone may keep any of them. Each date is the one the game's holiday rules already
// give for a country that keeps it publicly (holidays.ts, src/world/holidays), so nothing here invents a date. Kept
// observances go on the calendar, and a project's working days skip them (production/schedule.ts isWorkingDay).
// Until November 8, 2026 every observance was one day; the Jewish holidays now keep all their days of no work.
import { easter, toKey } from '../world/holidays/rules';
import { placeHolidays } from './holidays';
import { addDaysToKey } from './time';

export interface Observance {
  id: string;
  name: string;
  /**
   * Where the date comes from: the first of these countries whose rules have a holiday of one of the names that year
   * (its first day), or Easter. Some are dated only as far ahead as their country has announced; later years show none.
   */
  from: { country: string; names: string[] }[] | 'easter' | 'orthodox-easter';
  /** Backgrounds that suggest it (labels from HERITAGES). Empty: offered to everyone, suggested to no one. */
  heritages: string[];
  /**
   * When more than its first day is kept: each named holiday of the first source's country, and how many days run from
   * it. The Jewish holidays keep the days of no work as they're kept outside Israel, where a festival's first day (and
   * Pesach's last) is doubled; Israel's own public holidays already cover anyone living there.
   */
  spans?: { name: string; days: number }[];
}

const MUSLIM_MAJORITY_HERITAGES = [
  'Afghan', 'Albanian', 'Algerian', 'Amazigh', 'Arab', 'Azerbaijani', 'Bangladeshi', 'Bosnian', 'Chechen', 'Egyptian', 'Emirati', 'Fulani',
  'Hausa', 'Indonesian', 'Iraqi', 'Jordanian', 'Kazakh', 'Kurdish', 'Lebanese', 'Malay', 'Moroccan', 'Pakistani', 'Palestinian', 'Pashtun',
  'Saudi', 'Senegalese', 'Sindhi', 'Somali', 'Sudanese', 'Syrian', 'Tatar', 'Tunisian', 'Turkish', 'Uyghur', 'Wolof', 'Yemeni',
];
const JEWISH = ['Ashkenazi Jewish', 'Beta Israel', 'Sephardic Jewish', 'Mizrahi Jewish', 'Israeli'];
const ORTHODOX = ['Belarusian', 'Eritrean', 'Ethiopian', 'Georgian', 'Russian', 'Serbian', 'Ukrainian'];
const CHINESE = ['Chinese', 'Han Chinese', 'Hong Konger', 'Singaporean', 'Taiwanese'];
const SOUTH_ASIAN_HINDU = ['Bengali', 'Gujarati', 'Indian', 'Malayali', 'Nepali', 'Punjabi', 'Sikh', 'Sindhi', 'Tamil', 'Telugu'];

export const OBSERVANCES: readonly Observance[] = [
  { id: 'lunar-new-year', name: 'Lunar New Year', from: [{ country: 'MO', names: ['1.º dia do Novo Ano Lunar'] }, { country: 'HK', names: ['Lunar New Year’s Day'] }], heritages: CHINESE },
  { id: 'seollal', name: 'Seollal', from: [{ country: 'KR', names: ['Seollal', '설날'] }], heritages: ['Korean'] },
  { id: 'tet', name: 'Tết', from: [{ country: 'VN', names: ['Tết Nguyên đán'] }], heritages: ['Vietnamese'] },
  { id: 'tsagaan-sar', name: 'Tsagaan Sar', from: [{ country: 'MN', names: ['Цагаан сар'] }], heritages: ['Mongolian'] },
  { id: 'mid-autumn', name: 'Mid-Autumn Festival', from: [{ country: 'TW', names: ['中秋節'] }], heritages: [...CHINESE, 'Vietnamese'] },
  { id: 'chuseok', name: 'Chuseok', from: [{ country: 'KR', names: ['Chuseok', '추석'] }], heritages: ['Korean'] },
  { id: 'eid-al-fitr', name: 'Eid al-Fitr', from: [{ country: 'SA', names: ['Eid al-Fitr'] }], heritages: MUSLIM_MAJORITY_HERITAGES },
  { id: 'eid-al-adha', name: 'Eid al-Adha', from: [{ country: 'SA', names: ['Eid al-Adha'] }], heritages: MUSLIM_MAJORITY_HERITAGES },
  { id: 'nowruz', name: 'Nowruz', from: [{ country: 'KZ', names: ['Наурыз мейрамы'] }], heritages: ['Afghan', 'Azerbaijani', 'Iranian', 'Kazakh', 'Kurdish', 'Pashtun', 'Persian', 'Tatar', 'Uyghur'] },
  { id: 'diwali', name: 'Diwali', from: [{ country: 'SG', names: ['Deepavali'] }], heritages: SOUTH_ASIAN_HINDU },
  { id: 'thai-pongal', name: 'Thai Pongal', from: [{ country: 'LK', names: ['Tamil Thai Pongal Day'] }], heritages: ['Tamil'] },
  { id: 'sinhala-tamil-new-year', name: 'Sinhala and Tamil New Year', from: [{ country: 'LK', names: ['Sinhala & Tamil New Year Day'] }], heritages: ['Sri Lankan', 'Tamil'] },
  { id: 'vesak', name: 'Vesak', from: [{ country: 'SG', names: ['Vesak Day'] }, { country: 'MY', names: ['Hari Wesak'] }], heritages: ['Burmese', 'Cambodian', 'Khmer', 'Lao', 'Mongolian', 'Nepali', 'Sri Lankan', 'Thai', 'Tibetan'] },
  { id: 'songkran', name: 'Songkran', from: [{ country: 'TH', names: ['Songkran Festival'] }], heritages: ['Lao', 'Thai'] },
  { id: 'khmer-new-year', name: 'Khmer New Year', from: [{ country: 'KH', names: ['Khmer New Year'] }], heritages: ['Cambodian', 'Khmer'] },
  // In the year's order from Pesach: its first two days and last two, Shavuot's two, Rosh Hashanah's two, Yom Kippur, Sukkot's first two.
  { id: 'pesach', name: 'Pesach (Passover)', from: [{ country: 'IL', names: ['Pesach'] }], heritages: JEWISH, spans: [{ name: 'Pesach', days: 2 }, { name: 'Seventh day of Pesach', days: 2 }] },
  { id: 'shavuot', name: 'Shavuot', from: [{ country: 'IL', names: ['Shavuot'] }], heritages: JEWISH, spans: [{ name: 'Shavuot', days: 2 }] },
  { id: 'rosh-hashanah', name: 'Rosh Hashanah', from: [{ country: 'IL', names: ['Rosh Hashanah'] }], heritages: JEWISH, spans: [{ name: 'Rosh Hashanah', days: 2 }] },
  { id: 'yom-kippur', name: 'Yom Kippur', from: [{ country: 'IL', names: ['Yom Kippur'] }], heritages: JEWISH },
  { id: 'sukkot', name: 'Sukkot', from: [{ country: 'IL', names: ['Sukkot'] }], heritages: JEWISH, spans: [{ name: 'Sukkot', days: 2 }] },
  { id: 'orthodox-christmas', name: 'Orthodox Christmas', from: [{ country: 'RS', names: ['Božić'] }], heritages: ORTHODOX },
  { id: 'orthodox-easter', name: 'Orthodox Easter', from: 'orthodox-easter', heritages: [...ORTHODOX, 'Bulgarian', 'Greek', 'Romanian'] },
  { id: 'enkutatash', name: 'Enkutatash (Ethiopian New Year)', from: [{ country: 'ET', names: ['Enkutatash (New Year)'] }], heritages: ['Eritrean', 'Ethiopian'] },
  { id: 'timket', name: 'Timket', from: [{ country: 'ET', names: ['Timket (Epiphany)'] }], heritages: ['Eritrean', 'Ethiopian'] },
  { id: 'juneteenth', name: 'Juneteenth', from: [{ country: 'US', names: ['Juneteenth National Independence Day'] }], heritages: ['African American'] },
  { id: 'emancipation-day', name: 'Emancipation Day', from: [{ country: 'TT', names: ['African Emancipation Day'] }], heritages: ['Afro-Caribbean', 'Jamaican', 'Trinidadian'] },
  { id: 'st-patricks-day', name: "St Patrick's Day", from: [{ country: 'IE', names: ["St Patrick's Day"] }], heritages: ['Irish'] },
  { id: 'easter', name: 'Easter Sunday', from: 'easter', heritages: [] },
  { id: 'christmas', name: 'Christmas Day', from: [{ country: 'GB', names: ['Christmas Day'] }], heritages: [] },
];

const byId = new Map(OBSERVANCES.map((o) => [o.id, o]));
export const observance = (id: string): Observance | undefined => byId.get(id);

const cache = new Map<string, string | null>();

/** The observance's first day in a year, from the holiday rules; null where the rules don't give one (yet). */
export function observanceDate(id: string, year: number): string | null {
  const key = `${id}|${year}`;
  if (cache.has(key)) return cache.get(key)!;
  const o = byId.get(id);
  if (!o) return null;
  const date = o.from === 'easter' ? toKey(easter(year)) : o.from === 'orthodox-easter' ? toKey(easter(year, true))
    : o.from.map((src) => placeHolidays({ country: src.country }, year).find((h) => src.names.includes(h.name))?.date).find(Boolean) ?? null;
  // Only a found date is kept: the worldwide rules load after the game opens, and an early miss must not stick.
  if (date) cache.set(key, date);
  return date;
}

const daysCache = new Map<string, string[]>();

/** Every day the observance is kept in a year, in order; empty where the rules don't date it (yet). */
export function observanceDates(id: string, year: number): string[] {
  const key = `${id}|${year}`;
  const hit = daysCache.get(key);
  if (hit) return hit;
  const o = byId.get(id);
  const first = observanceDate(id, year);
  if (!o || !first) return [];
  let days = [first];
  if (o.spans && Array.isArray(o.from)) {
    const named = placeHolidays({ country: o.from[0].country }, year);
    days = o.spans.flatMap((s) => {
      const start = named.find((h) => h.name === s.name)?.date;
      return start ? Array.from({ length: s.days }, (_, i) => addDaysToKey(start, i)) : [];
    });
  }
  daysCache.set(key, days);
  return days;
}

/** The kept observances that fall on a date, on any of their days. */
export function observancesOn(ids: readonly string[] | undefined, date: string): Observance[] {
  const year = Number(date.slice(0, 4));
  return (ids ?? []).filter((id) => observanceDates(id, year).includes(date)).map((id) => byId.get(id)!);
}

/** The observances a character's backgrounds suggest, in list order; the rest stay open to choose. */
export function suggestedObservances(heritageLabels: readonly string[]): Observance[] {
  const mine = new Set(heritageLabels);
  return OBSERVANCES.filter((o) => o.heritages.some((h) => mine.has(h)));
}
