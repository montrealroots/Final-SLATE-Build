// Child performers (November 11, 2026, the owner's brief: child actors in full, with their effects downstream). A
// performer under the age the shoot's rules treat as a child works under those rules:
// - how long they may be at work and how long they may perform, by age, and more on a day with no school;
// - who must be with them: a studio teacher, a licensed chaperone or a tutor, and a nurse for a baby;
// - a licence or permit before their first day, with its lead time, and approval for night work;
// - twelve hours between their last call and the next;
// - in California and New York, 15% of their gross pay set aside in a trust for them.
// The rules are those of the place the production is based, read from their official texts (listed with each set below
// and in docs/ASSUMPTIONS.md, Child Performers). A place
// whose rules aren't recorded uses the nearest recorded set, and says so.
//
// What follows from them: a child's scenes fill less of a shoot day, so a script with children takes more days and
// costs more; the people who must be with them are crew the production hires and pays on the days they work; their
// scenes can't be shot before the licence is granted, without those people, at night without approval, or the morning
// after a late night; and their pay has a part that isn't theirs to spend until they are adults.
import { getPlace, type Place } from '../data/places';
import { placeHolidaysOn } from './holidays';
import { personAge, personById } from './people';
import { storyAge } from './story-age';
import { addDaysToKey, weekdayOfKey } from './time';
import type { GameState, Project } from './types';

export interface AgeBand {
  /** Ages in days, from and below: a band of 9 to 16 years is [9 years, 16 years). */
  fromDays: number;
  toDays: number;
  label: string;
  /** Most hours a day at the place of work, schooling and breaks included. */
  atPlace: number;
  /** Most hours a day of work (performing and rehearsing) when school is in session, and when it isn't. */
  work: number;
  workNoSchool: number;
}

export interface MinorRules {
  id: 'GB-ENG' | 'US-CA' | 'US-NY';
  /** Where the rules are from, for messages: "England". Their full names are in casting-notes.ts RULE_WORDS. */
  place: string;
  /** The age from which these rules stop applying. */
  adultAt: number;
  /** Youngest a performer may be, in days. */
  minAgeDays: number;
  bands: AgeBand[];
  /** The person who must be with the children, how many each may look after, and up to what age. */
  supervisor: { roleId: 'studio-teacher' | 'chaperone'; perGroup: number; perGroupNoSchool: number; underAge: number };
  /** Teaching on school days: hours a day, and who gives it (a studio teacher may be the supervisor as well). */
  teaching: { roleId: 'studio-teacher' | 'tutor'; hours: number; perGroup: number };
  /** A nurse for babies under this many days old. */
  nurseUnderDays: number | null;
  /** Days to arrange the licence or permit before the first day, and approval for night work. */
  licence: { leadDays: number; nightLeadDays: number };
  /** Hours between dismissal and the next call. */
  restHours: number;
  /** The share of gross pay set aside in trust, if any. */
  setAside: { percent: number } | null;
}

const YEAR = 365.25;
const days = (years: number) => Math.round(years * YEAR);

/** England: The Children (Performances and Activities) (England) Regulations 2014 (SI 2014/3309). */
const ENGLAND: MinorRules = {
  id: 'GB-ENG',
  place: 'England',
  // The regulations cover children until they are over compulsory school age, 16 in England (in the game, their 16th birthday).
  adultAt: 16,
  minAgeDays: 0,
  bands: [
    // Regulation 22, Table 2: hours at the place, and performing or rehearsing. The regulations set no larger figure
    // for days without school.
    { fromDays: 0, toDays: days(5), label: 'under 5', atPlace: 5, work: 2, workNoSchool: 2 },
    { fromDays: days(5), toDays: days(9), label: '5 to 8', atPlace: 8, work: 3, workNoSchool: 3 },
    { fromDays: days(9), toDays: days(16), label: '9 to 15', atPlace: 9.5, work: 5, workNoSchool: 5 },
  ],
  supervisor: { roleId: 'chaperone', perGroup: 12, perGroupNoSchool: 12, underAge: 16 }, // regulation 15(3)
  teaching: { roleId: 'tutor', hours: 3, perGroup: 6 }, // regulation 13(3)(d) and (e)
  nurseUnderDays: null,
  // Regulation 4(2): the authority may refuse an application received less than 21 days before the first performance.
  // Night work is permitted by the licensing authority (regulation 28), so it is asked for with the licence.
  licence: { leadDays: 21, nightLeadDays: 21 },
  restHours: 12, // regulation 24
  setAside: null,
};

/** California: 8 CCR §11760 (hours), §11755.2 (studio teachers), Family Code §6752 (the 15% set-aside). */
const CALIFORNIA: MinorRules = {
  id: 'US-CA',
  place: 'California',
  adultAt: 18,
  minAgeDays: 15,
  bands: [
    { fromDays: 15, toDays: 183, label: '15 days to 6 months', atPlace: 2, work: 20 / 60, workNoSchool: 20 / 60 },
    { fromDays: 183, toDays: days(2), label: '6 months to 2 years', atPlace: 4, work: 2, workNoSchool: 2 },
    { fromDays: days(2), toDays: days(6), label: '2 to 5', atPlace: 6, work: 3, workNoSchool: 3 },
    { fromDays: days(6), toDays: days(9), label: '6 to 8', atPlace: 8, work: 4, workNoSchool: 6 },
    { fromDays: days(9), toDays: days(16), label: '9 to 15', atPlace: 9, work: 5, workNoSchool: 7 },
    { fromDays: days(16), toDays: days(18), label: '16 and 17', atPlace: 10, work: 6, workNoSchool: 8 },
  ],
  // A studio teacher on every call for minors under 16: one for each ten, or twenty on a day without school (§11755.2).
  supervisor: { roleId: 'studio-teacher', perGroup: 10, perGroupNoSchool: 20, underAge: 16 },
  teaching: { roleId: 'studio-teacher', hours: 3, perGroup: 10 },
  nurseUnderDays: 183, // §11760: a nurse with babies under six months
  // The Entertainment Work Permit: a first-time 10-day permit is issued at once; the employer needs a permit to employ
  // minors as well. Earlier or later hours need the Labor Commissioner's approval, asked for in writing 48 hours ahead.
  licence: { leadDays: 1, nightLeadDays: 2 },
  restHours: 12, // §11760(i)
  setAside: { percent: 15 }, // a Coogan trust account (Family Code §6752)
};

/** New York: 12 NYCRR Part 186, and the Department of Labor's chart LS 559 (09/18). */
const NEW_YORK: MinorRules = {
  id: 'US-NY',
  place: 'New York',
  adultAt: 18,
  minAgeDays: 15,
  bands: [
    // LS 559: on set and work hours, non-live performance.
    { fromDays: 15, toDays: 183, label: '15 days to 5 months', atPlace: 2, work: 20 / 60, workNoSchool: 20 / 60 },
    { fromDays: 183, toDays: days(2), label: '6 months to 1 year', atPlace: 4, work: 2, workNoSchool: 2 },
    { fromDays: days(2), toDays: days(6), label: '2 to 5', atPlace: 6, work: 3, workNoSchool: 3 },
    { fromDays: days(6), toDays: days(9), label: '6 to 8', atPlace: 8, work: 4, workNoSchool: 6 },
    { fromDays: days(9), toDays: days(16), label: '9 to 15', atPlace: 9, work: 5, workNoSchool: 7 },
    { fromDays: days(16), toDays: days(18), label: '16 and 17', atPlace: 10, work: 6, workNoSchool: 9 },
  ],
  // A responsible person must watch each performer under 16. A parent or guardian may be that person; the game has the
  // production hire a chaperone, as it can't assume a parent is free to be on set.
  supervisor: { roleId: 'chaperone', perGroup: 20, perGroupNoSchool: 20, underAge: 16 },
  // Instruction averages three hours a school day (Part 186-5). The chart gives no number of children per teacher; the
  // game uses California's ten.
  teaching: { roleId: 'tutor', hours: 3, perGroup: 10 },
  nurseUnderDays: 183,
  // A Child Performer Permit (free), and the employer's notice of use at least two business days before work begins.
  licence: { leadDays: 2, nightLeadDays: 2 },
  restHours: 12,
  setAside: { percent: 15 }, // a child performer trust account (Part 186)
};

/**
 * The rules for a production based at a place. A place whose own rules aren't recorded uses the nearest recorded set
 * and says so: the rest of the United States uses California's, everywhere else England's. Scotland, Wales and
 * Northern Ireland have rules of their own, close to England's but not read for the game.
 */
export function rulesFor(place: Place): { rules: MinorRules; standIn: string | null } {
  if (place.country === 'US') {
    if (/^new york$/i.test(place.region)) return { rules: NEW_YORK, standIn: null };
    if (/^california$/i.test(place.region)) return { rules: CALIFORNIA, standIn: null };
    return { rules: CALIFORNIA, standIn: `${place.region}'s own rules aren't recorded, so California's are used.` };
  }
  if (place.country === 'GB' && (place.regionCode === 'GB-ENG' || /^england$/i.test(place.region))) return { rules: ENGLAND, standIn: null };
  return { rules: ENGLAND, standIn: `${place.region || place.countryName}'s own rules aren't recorded, so England's are used.` };
}

export const projectRules = (p: Project) => rulesFor(getPlace(p.axes.basePlaceId));

/** The age band of a child, by age in days; none once they are past the rules' age. */
export function bandFor(rules: MinorRules, ageDays: number): AgeBand | null {
  return rules.bands.find((b) => ageDays >= b.fromDays && ageDays < b.toDays) ?? null;
}

/**
 * Whether a date is a school day where the production is based: a weekday that isn't a public holiday or in the long
 * summer or winter break. The breaks are typical dates, not a school calendar: England's summer from July 22 to
 * September 3, the United States' from June 15 to August 20, elsewhere north of the equator July and August, and south
 * of it December 15 to January 31; and in the north, December 22 to January 2.
 */
export function isSchoolDay(place: Place, key: string): boolean {
  const wd = weekdayOfKey(key);
  if (wd === 0 || wd === 6) return false;
  if (placeHolidaysOn(place, key).length) return false;
  const md = key.slice(5);
  if (place.lat < 0) return !(md >= '12-15' || md <= '01-31');
  if (md >= '12-22' || md <= '01-02') return false;
  if (place.country === 'GB') return !(md >= '07-22' && md <= '09-03');
  if (place.country === 'US') return !(md >= '06-15' && md <= '08-20');
  return !(md >= '07-01' && md <= '08-31');
}

/** A shoot day of the game's: the hours its four screen-minutes stand for (game calibration). */
export const ADULT_SHOOT_HOURS = 10;

export interface Minor {
  characterId: string;
  name: string;
  /** Their hire, or none for a part not yet cast, which is reckoned from the character's age. */
  personId: string | null;
  ageDays: number;
  band: AgeBand;
  rules: MinorRules;
}

/** Age in whole days from a birth date to a date. */
export function ageInDays(born: string, on: string): number {
  return Math.round((Date.parse(`${on}T12:00:00Z`) - Date.parse(`${born}T12:00:00Z`)) / 86_400_000);
}

/**
 * The child playing a part on a date, if the part is played by one. A cast performer's real age decides. A part not
 * yet cast is reckoned from the character's age: under 16 in the story, a child of that age is assumed, as children's
 * parts are played by children; at 16 and 17, by an adult, as is common, until someone younger is cast.
 */
export function minorFor(state: GameState | undefined, p: Project, characterId: string, on: string, method: 'on-set' | 'voice' | 'motion-capture' = 'on-set'): Minor | null {
  const { rules } = projectRules(p);
  const ch = p.characters.find((c) => c.id === characterId);
  const cast = p.cast.find((c) => c.characterId === characterId && (method === 'on-set' ? c.method !== 'voice' : c.method === method));
  if (cast && cast.performer === 'player') return null; // the player is never under 19 (state.ts MIN_START_AGE)
  if (cast && state) {
    const person = personById(state, cast.performer);
    const ageDays = ageInDays(person.born, on);
    if (personAge(person, on) >= rules.adultAt) return null;
    const band = bandFor(rules, ageDays);
    return band ? { characterId, name: person.name, personId: person.id, ageDays, band, rules } : null;
  }
  const a = storyAge(ch?.ageInStory);
  if (!a || a.max >= 16 || a.max >= rules.adultAt) return null;
  const ageDays = Math.round(a.min * YEAR + YEAR / 2);
  const band = bandFor(rules, Math.max(rules.minAgeDays, ageDays));
  return band ? { characterId, name: ch?.name ?? 'A child', personId: null, ageDays, band, rules } : null;
}

/** The share of a shoot day's capacity a child may work, on a school day or not. */
export function childShare(m: Minor, school: boolean): number {
  return Math.min(1, (school ? m.band.work : m.band.workNoSchool) / ADULT_SHOOT_HOURS);
}

// ---------------- Who must be there ----------------

export interface Supervision { roleId: string; count: number; why: string }

/** The people a day with these children needs: supervisors, teachers on school days, a nurse for babies. */
export function supervisionFor(minors: Minor[], school: boolean): Supervision[] {
  if (!minors.length) return [];
  const rules = minors[0].rules;
  const out = new Map<string, Supervision>();
  const add = (roleId: string, count: number, why: string) => {
    const prev = out.get(roleId);
    if (!prev || prev.count < count) out.set(roleId, { roleId, count, why });
  };
  const watched = minors.filter((m) => m.ageDays < days(rules.supervisor.underAge));
  if (watched.length) add(rules.supervisor.roleId, Math.ceil(watched.length / (school ? rules.supervisor.perGroup : rules.supervisor.perGroupNoSchool)), `${rules.place}'s rules require one with children under ${rules.supervisor.underAge}.`);
  // Teaching is for school-age children (5 and over) on school days.
  const pupils = minors.filter((m) => m.ageDays >= days(5));
  if (school && pupils.length) {
    const t = rules.teaching;
    const prev = out.get(t.roleId);
    const need = Math.ceil(pupils.length / t.perGroup);
    add(t.roleId, Math.max(prev?.count ?? 0, need), `${rules.place}'s rules require ${t.hours} hours of teaching on a school day.`);
  }
  if (rules.nurseUnderDays !== null && minors.some((m) => m.ageDays < rules.nurseUnderDays!)) add('set-nurse', 1, `${rules.place}'s rules require a nurse with babies under six months.`);
  return [...out.values()];
}

// ---------------- Licences ----------------

export interface ChildLicence { characterId: string; personId: string; applied: string; ready: string; night: boolean; nightApplied?: string }

/** A cast child's licence, applying for it today if there isn't one (or for night work, if it is needed and missing). */
export function ensureLicence(p: Project, m: Minor, today: string, night: boolean): ChildLicence | null {
  if (!m.personId) return null;
  const list = (p.childLicences ??= []);
  const have = list.find((l) => l.personId === m.personId && l.characterId === m.characterId);
  if (have) {
    // A licence already asked for stays as it is; night work asked for later delays only the night scenes.
    if (night && !have.night) Object.assign(have, { night: true, nightApplied: today });
    return have;
  }
  const lead = night ? Math.max(m.rules.licence.leadDays, m.rules.licence.nightLeadDays) : m.rules.licence.leadDays;
  const fresh: ChildLicence = { characterId: m.characterId, personId: m.personId, applied: today, ready: addDaysToKey(today, lead), night, ...(night ? { nightApplied: today } : {}) };
  list.push(fresh);
  return fresh;
}

/** Whether a cast child may work on a date: their licence granted, and for a night scene, night work approved. */
export function licenceReady(p: Project, m: Minor, date: string, night: boolean): { ok: boolean; reason?: string } {
  if (!m.personId) return { ok: true };
  const l = (p.childLicences ?? []).find((x) => x.personId === m.personId && x.characterId === m.characterId);
  if (!l) return { ok: false, reason: `${m.name} has no licence yet; it is asked for when the shoot is scheduled.` };
  if (l.ready > date) return { ok: false, reason: `${m.name}'s licence isn't granted until ${l.ready}.` };
  if (night && !l.night) return { ok: false, reason: `${m.name}'s night scene needs approval for night work.` };
  if (night && addDaysToKey(l.nightApplied ?? l.applied, m.rules.licence.nightLeadDays) > date) return { ok: false, reason: `${m.name}'s night work isn't approved until ${addDaysToKey(l.nightApplied ?? l.applied, m.rules.licence.nightLeadDays)}.` };
  return { ok: true };
}

/** A child's set-aside from a payment, in whole currency units, under rules that require one. */
export function setAsideOf(rules: MinorRules, pay: number): number {
  return rules.setAside ? Math.round((pay * rules.setAside.percent) / 100) : 0;
}
