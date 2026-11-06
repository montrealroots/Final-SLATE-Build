// Public holiday rules for the countries in the place catalog. Coverage: fixed-date,
// nth-weekday, Easter-relative and formula-based national holidays plus selected regional
// rules. Lunar/lunisolar observances (e.g. Lunar New Year, Eid, Diwali, Chuseok) and
// government-announced moves are NOT modeled; docs/DATA-PROVENANCE.md records this gap.
// A holiday only changes gameplay where a production calendar observes it (see schedule.ts).

import { addDaysToKey, daysInMonth, weekdayOfKey, ymd } from './time';

export interface Holiday {
  date: string; // local date key
  name: string;
  observedFor?: string; // set when this is a substitute day
}

type Subst = 'none' | 'us' | 'next-weekday' | 'sun-to-mon';

interface Rule {
  name: string;
  regions?: string[];
  date: (year: number) => string | null;
  subst?: Subst;
}

export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return ymd(year, month, day);
}

/** nth weekday (n>=1) or last (n=-1) of a month. weekday 0=Sunday. */
export function nthWeekday(year: number, month: number, weekday: number, n: number): string {
  if (n > 0) {
    const first = weekdayOfKey(ymd(year, month, 1));
    const day = 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
    return ymd(year, month, day);
  }
  const lastDay = daysInMonth(year, month);
  const lastWd = weekdayOfKey(ymd(year, month, lastDay));
  return ymd(year, month, lastDay - ((lastWd - weekday + 7) % 7));
}

const fixed = (name: string, month: number, day: number, subst: Subst = 'none', regions?: string[]): Rule => ({
  name, regions, subst, date: (y) => ymd(y, month, day),
});
const nth = (name: string, month: number, weekday: number, n: number, regions?: string[]): Rule => ({
  name, regions, date: (y) => nthWeekday(y, month, weekday, n),
});
const easter = (name: string, offset: number, regions?: string[]): Rule => ({
  name, regions, date: (y) => addDaysToKey(easterSunday(y), offset),
});
const custom = (name: string, fn: (y: number) => string | null, regions?: string[]): Rule => ({ name, regions, date: fn });

/** Monday on or before May 24 (Victoria Day / National Patriots' Day). */
const victoriaDay = (y: number) => {
  const wd = weekdayOfKey(ymd(y, 5, 24));
  return addDaysToKey(ymd(y, 5, 24), -((wd - 1 + 7) % 7));
};
/** First weekday d on or after a date. */
const onOrAfter = (y: number, m: number, d: number, weekday: number) => {
  const wd = weekdayOfKey(ymd(y, m, d));
  return addDaysToKey(ymd(y, m, d), (weekday - wd + 7) % 7);
};
const jpVernal = (y: number) => ymd(y, 3, Math.floor(20.8431 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4)));
const jpAutumnal = (y: number) => ymd(y, 9, Math.floor(23.2488 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4)));

const GOOD_FRIDAY = (r?: string[]) => easter('Good Friday', -2, r);
const EASTER_MONDAY = (r?: string[]) => easter('Easter Monday', 1, r);
const ASCENSION = () => easter('Ascension Day', 39);
const WHIT_MONDAY = () => easter('Whit Monday', 50);

const RULES: Record<string, Rule[]> = {
  US: [
    fixed("New Year's Day", 1, 1, 'us'), nth('Martin Luther King Jr. Day', 1, 1, 3), nth("Washington's Birthday", 2, 1, 3),
    nth('Memorial Day', 5, 1, -1), fixed('Juneteenth National Independence Day', 6, 19, 'us'), fixed('Independence Day', 7, 4, 'us'),
    nth('Labor Day', 9, 1, 1), nth('Columbus Day', 10, 1, 2), fixed('Veterans Day', 11, 11, 'us'), nth('Thanksgiving Day', 11, 4, 4),
    fixed('Christmas Day', 12, 25, 'us'),
  ],
  CA: [
    fixed("New Year's Day", 1, 1), nth('Family Day', 2, 1, 3, ['CA-ON', 'CA-BC']), GOOD_FRIDAY(),
    custom('Victoria Day', victoriaDay, ['CA-ON', 'CA-BC']), custom("National Patriots' Day", victoriaDay, ['CA-QC']),
    fixed('Fête nationale du Québec', 6, 24, 'none', ['CA-QC']), fixed('Canada Day', 7, 1, 'sun-to-mon'),
    nth('British Columbia Day', 8, 1, 1, ['CA-BC']), nth('Labour Day', 9, 1, 1),
    fixed('National Day for Truth and Reconciliation', 9, 30, 'none', ['CA-BC']), nth('Thanksgiving', 10, 1, 2),
    fixed('Remembrance Day', 11, 11, 'none', ['CA-BC']), fixed('Christmas Day', 12, 25), fixed('Boxing Day', 12, 26, 'none', ['CA-ON']),
  ],
  MX: [
    fixed("New Year's Day", 1, 1), nth('Constitution Day', 2, 1, 1), nth("Benito Juárez's Birthday", 3, 1, 3), fixed('Labour Day', 5, 1),
    fixed('Independence Day', 9, 16), nth('Revolution Day', 11, 1, 3), fixed('Christmas Day', 12, 25),
  ],
  BR: [
    fixed("New Year's Day", 1, 1), GOOD_FRIDAY(), fixed('Tiradentes Day', 4, 21), fixed('Labour Day', 5, 1), fixed('Independence Day', 9, 7),
    fixed('Our Lady of Aparecida', 10, 12), fixed("All Souls' Day", 11, 2), fixed('Republic Proclamation Day', 11, 15),
    fixed('Black Consciousness Day', 11, 20), fixed('Christmas Day', 12, 25),
  ],
  AR: [
    fixed("New Year's Day", 1, 1), easter('Carnival Monday', -48), easter('Carnival Tuesday', -47), fixed('Day of Remembrance for Truth and Justice', 3, 24),
    fixed('Malvinas Day', 4, 2), GOOD_FRIDAY(), fixed('Labour Day', 5, 1), fixed('May Revolution Day', 5, 25), fixed('Flag Day', 6, 20),
    fixed('Independence Day', 7, 9), fixed('Immaculate Conception', 12, 8), fixed('Christmas Day', 12, 25),
  ],
  GB: [
    fixed("New Year's Day", 1, 1, 'next-weekday'), fixed('2 January', 1, 2, 'next-weekday', ['GB-SCT']), GOOD_FRIDAY(), EASTER_MONDAY(['GB-ENG']),
    nth('Early May Bank Holiday', 5, 1, 1), nth('Spring Bank Holiday', 5, 1, -1), nth('Summer Bank Holiday', 8, 1, -1, ['GB-ENG']),
    nth('Summer Bank Holiday', 8, 1, 1, ['GB-SCT']), fixed("St Andrew's Day", 11, 30, 'next-weekday', ['GB-SCT']),
    fixed('Christmas Day', 12, 25, 'next-weekday'), fixed('Boxing Day', 12, 26, 'next-weekday'),
  ],
  IE: [
    fixed("New Year's Day", 1, 1),
    custom("St Brigid's Day", (y) => (weekdayOfKey(ymd(y, 2, 1)) === 5 ? ymd(y, 2, 1) : nthWeekday(y, 2, 1, 1))),
    fixed("St Patrick's Day", 3, 17), EASTER_MONDAY(), nth('May Bank Holiday', 5, 1, 1), nth('June Bank Holiday', 6, 1, 1),
    nth('August Bank Holiday', 8, 1, 1), nth('October Bank Holiday', 10, 1, -1), fixed('Christmas Day', 12, 25), fixed("St Stephen's Day", 12, 26),
  ],
  FR: [
    fixed("New Year's Day", 1, 1), EASTER_MONDAY(), fixed('Labour Day', 5, 1), fixed('Victory in Europe Day', 5, 8), ASCENSION(), WHIT_MONDAY(),
    fixed('Bastille Day', 7, 14), fixed('Assumption Day', 8, 15), fixed("All Saints' Day", 11, 1), fixed('Armistice Day', 11, 11), fixed('Christmas Day', 12, 25),
  ],
  MC: [
    fixed("New Year's Day", 1, 1), fixed("Saint Devota's Day", 1, 27), EASTER_MONDAY(), fixed('Labour Day', 5, 1), ASCENSION(), WHIT_MONDAY(),
    easter('Corpus Christi', 60), fixed('Assumption Day', 8, 15), fixed("All Saints' Day", 11, 1), fixed("Prince's Day", 11, 19),
    fixed('Immaculate Conception', 12, 8), fixed('Christmas Day', 12, 25),
  ],
  DE: [
    fixed("New Year's Day", 1, 1), fixed("International Women's Day", 3, 8, 'none', ['DE-BE']), GOOD_FRIDAY(), EASTER_MONDAY(), fixed('Labour Day', 5, 1),
    ASCENSION(), WHIT_MONDAY(), easter('Corpus Christi', 60, ['DE-NW']), fixed('Day of German Unity', 10, 3),
    fixed("All Saints' Day", 11, 1, 'none', ['DE-NW']), fixed('Christmas Day', 12, 25), fixed('Second Day of Christmas', 12, 26),
  ],
  ES: [
    fixed("New Year's Day", 1, 1), fixed('Epiphany', 1, 6), GOOD_FRIDAY(), fixed('Labour Day', 5, 1), fixed('Assumption Day', 8, 15),
    fixed('National Day of Spain', 10, 12), fixed("All Saints' Day", 11, 1), fixed('Constitution Day', 12, 6), fixed('Immaculate Conception', 12, 8),
    fixed('Christmas Day', 12, 25),
  ],
  IT: [
    fixed("New Year's Day", 1, 1), fixed('Epiphany', 1, 6), EASTER_MONDAY(), fixed('Liberation Day', 4, 25), fixed('Labour Day', 5, 1),
    fixed('Republic Day', 6, 2), fixed('Assumption Day', 8, 15), fixed("All Saints' Day", 11, 1), fixed('Immaculate Conception', 12, 8),
    fixed('Christmas Day', 12, 25), fixed("St Stephen's Day", 12, 26),
  ],
  NL: [
    fixed("New Year's Day", 1, 1), EASTER_MONDAY(),
    custom("King's Day", (y) => (weekdayOfKey(ymd(y, 4, 27)) === 0 ? ymd(y, 4, 26) : ymd(y, 4, 27))),
    ASCENSION(), WHIT_MONDAY(), fixed('Christmas Day', 12, 25), fixed('Second Day of Christmas', 12, 26),
  ],
  CH: [
    fixed("New Year's Day", 1, 1, 'none', ['CH-TI']), fixed('Epiphany', 1, 6, 'none', ['CH-TI']), fixed("St Joseph's Day", 3, 19, 'none', ['CH-TI']),
    EASTER_MONDAY(['CH-TI']), fixed('Labour Day', 5, 1, 'none', ['CH-TI']), easter('Ascension Day', 39, ['CH-TI']), easter('Whit Monday', 50, ['CH-TI']),
    easter('Corpus Christi', 60, ['CH-TI']), fixed("Saints Peter and Paul", 6, 29, 'none', ['CH-TI']), fixed('Swiss National Day', 8, 1),
    fixed('Assumption Day', 8, 15, 'none', ['CH-TI']), fixed("All Saints' Day", 11, 1, 'none', ['CH-TI']), fixed('Immaculate Conception', 12, 8, 'none', ['CH-TI']),
    fixed('Christmas Day', 12, 25, 'none', ['CH-TI']), fixed("St Stephen's Day", 12, 26, 'none', ['CH-TI']),
  ],
  CZ: [
    fixed('Restoration Day of the Independent Czech State', 1, 1), GOOD_FRIDAY(), EASTER_MONDAY(), fixed('Labour Day', 5, 1), fixed('Liberation Day', 5, 8),
    fixed('Saints Cyril and Methodius Day', 7, 5), fixed('Jan Hus Day', 7, 6), fixed('Czech Statehood Day', 9, 28), fixed('Independent Czechoslovak State Day', 10, 28),
    fixed('Struggle for Freedom and Democracy Day', 11, 17), fixed('Christmas Eve', 12, 24), fixed('Christmas Day', 12, 25), fixed("St Stephen's Day", 12, 26),
  ],
  SE: [
    fixed("New Year's Day", 1, 1), fixed('Epiphany', 1, 6), GOOD_FRIDAY(), easter('Easter Sunday', 0), EASTER_MONDAY(), fixed('May Day', 5, 1), ASCENSION(),
    easter('Pentecost', 49), fixed('National Day of Sweden', 6, 6), custom('Midsummer Day', (y) => onOrAfter(y, 6, 20, 6)),
    custom("All Saints' Day", (y) => onOrAfter(y, 10, 31, 6)), fixed('Christmas Day', 12, 25), fixed('Second Day of Christmas', 12, 26),
  ],
  NO: [
    fixed("New Year's Day", 1, 1), easter('Maundy Thursday', -3), GOOD_FRIDAY(), easter('Easter Sunday', 0), EASTER_MONDAY(), fixed('Labour Day', 5, 1),
    fixed('Constitution Day', 5, 17), ASCENSION(), easter('Whit Sunday', 49), WHIT_MONDAY(), fixed('Christmas Day', 12, 25), fixed('Second Day of Christmas', 12, 26),
  ],
  DK: [
    fixed("New Year's Day", 1, 1), easter('Maundy Thursday', -3), GOOD_FRIDAY(), easter('Easter Sunday', 0), EASTER_MONDAY(), ASCENSION(),
    easter('Whit Sunday', 49), WHIT_MONDAY(), fixed('Christmas Day', 12, 25), fixed('Second Day of Christmas', 12, 26),
  ],
  TR: [
    fixed("New Year's Day", 1, 1), fixed("National Sovereignty and Children's Day", 4, 23), fixed('Labour and Solidarity Day', 5, 1),
    fixed('Commemoration of Atatürk, Youth and Sports Day', 5, 19), fixed('Democracy and National Unity Day', 7, 15), fixed('Victory Day', 8, 30),
    fixed('Republic Day', 10, 29),
  ],
  EG: [
    fixed('Coptic Christmas', 1, 7), fixed('Revolution Day (January 25)', 1, 25), fixed('Sinai Liberation Day', 4, 25), fixed('Labour Day', 5, 1),
    fixed('June 30 Revolution Day', 6, 30), fixed('Revolution Day (July 23)', 7, 23), fixed('Armed Forces Day', 10, 6),
  ],
  MA: [
    fixed("New Year's Day", 1, 1), fixed('Proclamation of Independence Day', 1, 11), fixed('Amazigh New Year', 1, 14), fixed('Labour Day', 5, 1),
    fixed('Throne Day', 7, 30), fixed('Oued Ed-Dahab Day', 8, 14), fixed('Revolution of the King and the People', 8, 20), fixed('Youth Day', 8, 21),
    fixed('Green March', 11, 6), fixed('Independence Day', 11, 18),
  ],
  NG: [
    fixed("New Year's Day", 1, 1), GOOD_FRIDAY(), EASTER_MONDAY(), fixed("Workers' Day", 5, 1), fixed('Democracy Day', 6, 12),
    fixed('Independence Day', 10, 1), fixed('Christmas Day', 12, 25), fixed('Boxing Day', 12, 26),
  ],
  BF: [
    fixed("New Year's Day", 1, 1), fixed('Anniversary of the 1966 Uprising', 1, 3), fixed("International Women's Day", 3, 8), EASTER_MONDAY(),
    fixed('Labour Day', 5, 1), ASCENSION(), fixed('Independence Day', 8, 5), fixed('Assumption Day', 8, 15), fixed("All Saints' Day", 11, 1),
    fixed('Proclamation of the Republic', 12, 11), fixed('Christmas Day', 12, 25),
  ],
  KE: [
    fixed("New Year's Day", 1, 1), GOOD_FRIDAY(), EASTER_MONDAY(), fixed('Labour Day', 5, 1), fixed('Madaraka Day', 6, 1), fixed('Mashujaa Day', 10, 20),
    fixed('Jamhuri Day', 12, 12), fixed('Christmas Day', 12, 25), fixed('Boxing Day', 12, 26),
  ],
  ZA: [
    fixed("New Year's Day", 1, 1, 'sun-to-mon'), fixed('Human Rights Day', 3, 21, 'sun-to-mon'), GOOD_FRIDAY(), easter('Family Day', 1),
    fixed('Freedom Day', 4, 27, 'sun-to-mon'), fixed("Workers' Day", 5, 1, 'sun-to-mon'), fixed('Youth Day', 6, 16, 'sun-to-mon'),
    fixed("National Women's Day", 8, 9, 'sun-to-mon'), fixed('Heritage Day', 9, 24, 'sun-to-mon'), fixed('Day of Reconciliation', 12, 16, 'sun-to-mon'),
    fixed('Christmas Day', 12, 25, 'sun-to-mon'), fixed('Day of Goodwill', 12, 26, 'sun-to-mon'),
  ],
  AE: [fixed("New Year's Day", 1, 1), fixed('National Day', 12, 2), fixed('National Day Holiday', 12, 3)],
  SA: [fixed('Founding Day', 2, 22), fixed('Saudi National Day', 9, 23)],
  IN: [fixed('Republic Day', 1, 26), fixed('Independence Day', 8, 15), fixed('Gandhi Jayanti', 10, 2)],
  JP: [
    fixed("New Year's Day", 1, 1), nth('Coming of Age Day', 1, 1, 2), fixed('National Foundation Day', 2, 11), fixed("Emperor's Birthday", 2, 23),
    custom('Vernal Equinox Day', jpVernal), fixed('Shōwa Day', 4, 29), fixed('Constitution Memorial Day', 5, 3), fixed('Greenery Day', 5, 4),
    fixed("Children's Day", 5, 5), nth('Marine Day', 7, 1, 3), fixed('Mountain Day', 8, 11), nth('Respect for the Aged Day', 9, 1, 3),
    custom('Autumnal Equinox Day', jpAutumnal), nth('Sports Day', 10, 1, 2), fixed('Culture Day', 11, 3), fixed('Labour Thanksgiving Day', 11, 23),
  ],
  KR: [
    fixed("New Year's Day", 1, 1), fixed('Independence Movement Day', 3, 1), fixed("Children's Day", 5, 5), fixed('Memorial Day', 6, 6),
    fixed('Liberation Day', 8, 15), fixed('National Foundation Day', 10, 3), fixed('Hangul Day', 10, 9), fixed('Christmas Day', 12, 25),
  ],
  CN: [fixed("New Year's Day", 1, 1), fixed('Labour Day', 5, 1), fixed('Labour Day Holiday', 5, 2), fixed('National Day', 10, 1), fixed('National Day Holiday', 10, 2), fixed('National Day Holiday', 10, 3)],
  AU: [
    fixed("New Year's Day", 1, 1), fixed('Australia Day', 1, 26, 'next-weekday'), nth('Labour Day', 3, 1, 2, ['AU-VIC']), GOOD_FRIDAY(),
    easter('Easter Saturday', -1, ['AU-NSW', 'AU-VIC']), easter('Easter Sunday', 0, ['AU-NSW', 'AU-VIC']), EASTER_MONDAY(), fixed('Anzac Day', 4, 25),
    nth("King's Birthday", 6, 1, 2), nth('Labour Day', 10, 1, 1, ['AU-NSW']), nth('Melbourne Cup Day', 11, 2, 1, ['AU-VIC']),
    fixed('Christmas Day', 12, 25, 'next-weekday'), fixed('Boxing Day', 12, 26, 'next-weekday'),
  ],
  NZ: [
    fixed("New Year's Day", 1, 1, 'next-weekday'), fixed("Day After New Year's Day", 1, 2, 'next-weekday'), fixed('Waitangi Day', 2, 6, 'next-weekday'),
    GOOD_FRIDAY(), EASTER_MONDAY(), fixed('Anzac Day', 4, 25, 'next-weekday'), nth("King's Birthday", 6, 1, 1), nth('Labour Day', 10, 1, 4),
    fixed('Christmas Day', 12, 25, 'next-weekday'), fixed('Boxing Day', 12, 26, 'next-weekday'),
  ],
};

const KR_SUBSTITUTE = new Set(['Independence Movement Day', "Children's Day", 'Liberation Day', 'National Foundation Day', 'Hangul Day', 'Christmas Day']);

const cache = new Map<string, Holiday[]>();

export function hasHolidayRules(country: string): boolean {
  return country in RULES;
}

export function holidaysForYear(country: string, regionCode: string | undefined, year: number): Holiday[] {
  const key = `${country}|${regionCode ?? ''}|${year}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const rules = (RULES[country] ?? []).filter((r) => !r.regions || (regionCode && r.regions.includes(regionCode)));
  const list: Holiday[] = [];
  const taken = new Set<string>();
  for (const r of rules) {
    const d = r.date(year);
    if (d) {
      list.push({ date: d, name: r.name });
      taken.add(d);
    }
  }
  // Substitute (observed) days, processed in date order so chained substitutes land correctly.
  const ordered = rules.map((r) => ({ r, d: r.date(year) })).filter((x) => x.d).sort((a, b) => (a.d! < b.d! ? -1 : 1));
  for (const { r, d } of ordered) {
    const date = d!;
    const wd = weekdayOfKey(date);
    let sub: string | null = null;
    if (r.subst === 'us') sub = wd === 6 ? addDaysToKey(date, -1) : wd === 0 ? addDaysToKey(date, 1) : null;
    else if (r.subst === 'sun-to-mon') sub = wd === 0 ? addDaysToKey(date, 1) : null;
    else if (r.subst === 'next-weekday' && (wd === 0 || wd === 6)) {
      let c = addDaysToKey(date, 1);
      while (weekdayOfKey(c) === 0 || weekdayOfKey(c) === 6 || taken.has(c)) c = addDaysToKey(c, 1);
      sub = c;
    }
    if (sub && !taken.has(sub)) {
      list.push({ date: sub, name: `${r.name} (Observed)`, observedFor: date });
      taken.add(sub);
    }
  }
  if (country === 'JP') {
    for (const h of [...list]) {
      if (weekdayOfKey(h.date) === 0) {
        let c = addDaysToKey(h.date, 1);
        while (taken.has(c)) c = addDaysToKey(c, 1);
        list.push({ date: c, name: 'Substitute Holiday', observedFor: h.date });
        taken.add(c);
      }
    }
    for (const h of [...list]) {
      const between = addDaysToKey(h.date, 1);
      if (!taken.has(between) && taken.has(addDaysToKey(h.date, 2)) && weekdayOfKey(between) !== 0) {
        list.push({ date: between, name: "Citizens' Holiday" });
        taken.add(between);
      }
    }
  }
  if (country === 'KR') {
    for (const h of [...list]) {
      if (!KR_SUBSTITUTE.has(h.name)) continue;
      const wd = weekdayOfKey(h.date);
      if (wd === 0 || wd === 6) {
        let c = addDaysToKey(h.date, 1);
        while (weekdayOfKey(c) === 0 || weekdayOfKey(c) === 6 || taken.has(c)) c = addDaysToKey(c, 1);
        list.push({ date: c, name: 'Substitute Holiday', observedFor: h.date });
        taken.add(c);
      }
    }
  }
  list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  cache.set(key, list);
  return list;
}

export function holidaysOn(country: string, regionCode: string | undefined, date: string): Holiday[] {
  const year = Number(date.slice(0, 4));
  return holidaysForYear(country, regionCode, year).filter((h) => h.date === date);
}
