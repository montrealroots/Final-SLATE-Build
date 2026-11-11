// Child performers (November 11, 2026, the owner's brief: child actors in full, with their effects downstream). A
// performer under the age the shoot's rules treat as a child works under those rules:
// - how long they may be at work and how long they may perform, by age, and more on a day with no school;
// - who must be with them: a studio teacher, a licensed chaperone or a tutor, and a nurse for a baby;
// - a licence or permit before their first day, with its lead time, and approval for night work;
// - twelve hours between their last call and the next;
// - a share of their pay set aside in a trust for them: 15% in California and New York, and in British Columbia 25% of
//   what they earn past $2,000 on a production, and in Ontario 25% of all of it once it passes $2,000;
// - where the rules set it, the days a week they may work (New South Wales, British Columbia, Ontario).
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
  /** Most days a week, where the rules set one for the age (New South Wales, British Columbia). */
  days?: number;
  /** Children each supervisor may have at this age, where the rules set it by age (British Columbia). */
  perSupervisor?: number;
}

export interface MinorRules {
  id: 'GB-ENG' | 'US-CA' | 'US-NY' | 'CA-BC' | 'CA-ON' | 'IE' | 'DE' | 'FR' | 'AU-NSW';
  /** Where the rules are from, for messages: "England". Their full names are in casting-notes.ts RULE_WORDS. */
  place: string;
  /** The age from which these rules stop applying. */
  adultAt: number;
  /** Youngest a performer may be, in days. */
  minAgeDays: number;
  bands: AgeBand[];
  /** The person who must be with the children, how many each may look after, and up to what age. */
  supervisor: { roleId: 'studio-teacher' | 'chaperone'; perGroup: number; perGroupNoSchool: number; underAge: number };
  /** Teaching on school days, where the rules require it: hours a day, and who gives it (a studio teacher may be both). */
  teaching: { roleId: 'studio-teacher' | 'tutor'; hours: number; perGroup: number } | null;
  /** Most hours of work on a day the child goes to school or is taught, where the rules cap it (New South Wales). */
  schoolCap?: number;
  /** A nurse for babies under this many days old. */
  nurseUnderDays: number | null;
  /** Days to arrange the licence or permit before the first day, and approval for night work. */
  licence: { leadDays: number; nightLeadDays: number };
  /** Hours between dismissal and the next call. */
  restHours: number;
  /**
   * The share of gross pay set aside in trust, if any. With `over`, only once a child's earnings on the production pass
   * it: of the part past it, or with `ofAll`, of all of them (Ontario: "25 per cent of those earnings").
   */
  setAside: { percent: number; over?: number; ofAll?: boolean } | null;
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

/** British Columbia: Employment Standards Regulation, Part 7.1, Division 2 (docs/child-rules/RESEARCH.md). */
const BRITISH_COLUMBIA: MinorRules = {
  id: 'CA-BC',
  place: 'British Columbia',
  adultAt: 15,
  minAgeDays: 15,
  // s. 45.8: 8 hours from reporting under 12, 10 from 12. Work is that, less the breaks the camera table requires
  // (s. 45.10): 15 minutes in front of the camera then 20 off under 3; 30 and 15 to 6; 45 and 10 to 12; 60 and 10 to 15.
  // s. 45.12: 5 days a week; s. 45.13: a chaperone for each child under 6, each 3 to 12, each 5 to 15.
  bands: [
    { fromDays: 15, toDays: days(3), label: 'under 3', atPlace: 8, work: 3.4, workNoSchool: 3.4, days: 5, perSupervisor: 1 },
    { fromDays: days(3), toDays: days(6), label: '3 to 5', atPlace: 8, work: 5.3, workNoSchool: 5.3, days: 5, perSupervisor: 1 },
    { fromDays: days(6), toDays: days(12), label: '6 to 11', atPlace: 8, work: 6.5, workNoSchool: 6.5, days: 5, perSupervisor: 3 },
    { fromDays: days(12), toDays: days(15), label: '12 to 14', atPlace: 10, work: 8.6, workNoSchool: 8.6, days: 5, perSupervisor: 5 },
  ],
  supervisor: { roleId: 'chaperone', perGroup: 5, perGroupNoSchool: 5, underAge: 15 },
  teaching: null,
  nurseUnderDays: null,
  licence: { leadDays: 1, nightLeadDays: 1 },
  restHours: 12,
  setAside: { percent: 25, over: 2000 }, // s. 45.14: 25% of earnings over $2,000 on a production
};

/** Ontario: the Protecting Child Performers Act, 2015, as passed (Bill 17, Royal Assent; docs/child-rules/RESEARCH.md). */
const ONTARIO: MinorRules = {
  id: 'CA-ON',
  place: 'Ontario',
  adultAt: 18, // s. 1: a child performer is under 18
  minAgeDays: 15, // s. 10
  // s. 11(1): 4 hours of work a day under 2, 8 from 2, tutoring included and unpaid meals of up to an hour left out
  // (ss. 11(6), 13). Work is that, less the breaks s. 12 requires before a camera, as British Columbia's: 15 minutes then
  // 20 off under 3; 30 and 15 to 6; 45 and 10 to 12; 60 and 10 to 16; 60 and 5 from 16. s. 11(5): 12 hours free a day
  // and 48 consecutive hours a week, which leaves at most 5 working days.
  bands: [
    { fromDays: 15, toDays: days(2), label: 'under 2', atPlace: 5, work: 1.7, workNoSchool: 1.7, days: 5 },
    { fromDays: days(2), toDays: days(3), label: '2', atPlace: 9, work: 3.4, workNoSchool: 3.4, days: 5 },
    { fromDays: days(3), toDays: days(6), label: '3 to 5', atPlace: 9, work: 5.3, workNoSchool: 5.3, days: 5 },
    { fromDays: days(6), toDays: days(12), label: '6 to 11', atPlace: 9, work: 6.5, workNoSchool: 6.5, days: 5 },
    { fromDays: days(12), toDays: days(16), label: '12 to 15', atPlace: 9, work: 6.9, workNoSchool: 6.9, days: 5 },
    { fromDays: days(16), toDays: days(18), label: '16 and 17', atPlace: 9, work: 7.4, workNoSchool: 7.4, days: 5 },
  ],
  // s. 14: a parent, guardian or authorised chaperone present and accessible at all times, under 16; one for each child
  // of the same parent (s. 14(2)). The game has the production hire one for each child, as it can't assume a parent is free.
  supervisor: { roleId: 'chaperone', perGroup: 1, perGroupNoSchool: 1, underAge: 16 },
  // s. 7: time in the schedule for tutoring, under regulations that weren't read; the employer isn't required to provide
  // the tutor, so the game hires none.
  teaching: null,
  nurseUnderDays: null,
  // No permit. s. 11(4): a call after 7 p.m. needs 48 hours' notice; the game asks two days for night work.
  licence: { leadDays: 1, nightLeadDays: 2 },
  restHours: 12,
  setAside: { percent: 25, over: 2000, ofAll: true }, // s. 8(1)
};

/** Ireland: the Workplace Relations Commission's note on film and TV licences under s. 3(2) of the 1996 Act (RESEARCH.md). */
const IRELAND: MinorRules = {
  id: 'IE',
  place: 'Ireland',
  adultAt: 16, // the Minister licenses children up to 16
  minAgeDays: 0,
  // Conditions 1 to 3: at the place of employment 5 hours under 7, 7.5 from 7 to 13, 8 over 13; performing or rehearsing
  // 2, 3 and 4 hours. Condition 5(2): 5 days in any 7.
  bands: [
    { fromDays: 0, toDays: days(7), label: 'under 7', atPlace: 5, work: 2, workNoSchool: 2, days: 5 },
    { fromDays: days(7), toDays: days(13), label: '7 to 12', atPlace: 7.5, work: 3, workNoSchool: 3, days: 5 },
    { fromDays: days(13), toDays: days(16), label: '13 to 15', atPlace: 8, work: 4, workNoSchool: 4, days: 5 },
  ],
  // Condition 6: a suitably qualified chaperone, in charge of no more than twelve children.
  supervisor: { roleId: 'chaperone', perGroup: 12, perGroupNoSchool: 12, underAge: 16 },
  // Condition 7: alternative teaching where work means more than a week away from school, with no hours set; not modelled.
  teaching: null,
  nurseUnderDays: null,
  // The licence is applied for at least 21 days ahead, night work with it (condition 4: only where essential).
  licence: { leadDays: 21, nightLeadDays: 21 },
  restHours: 12, // the note sets none; England's 12 hours stand in
  setAside: null, // condition 9: earnings lodged in an account in the child's name, not held back in trust
};

/** Germany: Jugendarbeitsschutzgesetz §§ 2, 5, 6, 8 (docs/child-rules/RESEARCH.md). */
const GERMANY: MinorRules = {
  id: 'DE',
  place: 'Germany',
  adultAt: 18,
  // § 6(1)2: film and TV from over 3: up to 2 hours a day to 6, 3 hours over 6; § 8: 8 hours for young people (15 to 17),
  // who are taken as children while still in compulsory schooling, so to 16 here. The authority sets the time at the
  // workplace; the game allows twice the work.
  minAgeDays: days(3) + 1,
  bands: [
    { fromDays: days(3) + 1, toDays: days(6), label: 'over 3 to 6', atPlace: 4, work: 2, workNoSchool: 2, perSupervisor: 1 },
    { fromDays: days(6), toDays: days(16), label: '6 to 15', atPlace: 6, work: 3, workNoSchool: 3 },
    { fromDays: days(16), toDays: days(18), label: '16 and 17', atPlace: 8.5, work: 8, workNoSchool: 8 },
  ],
  supervisor: { roleId: 'chaperone', perGroup: 3, perGroupNoSchool: 3, underAge: 15 },
  teaching: null,
  nurseUnderDays: null,
  licence: { leadDays: 14, nightLeadDays: 14 }, // the law sets no lead time: the game allows 14 days
  restHours: 14, // § 6(2)5
  setAside: null,
};

/** France: the audiovisual industry's 2025 agreement on minors, restating the Code du travail (RESEARCH.md). */
const FRANCE: MinorRules = {
  id: 'FR',
  place: 'France',
  adultAt: 16,
  minAgeDays: 0,
  // The commission sets each child's hours; with no indicative hours read, England's hours by age stand in.
  bands: ENGLAND.bands,
  supervisor: { roleId: 'chaperone', perGroup: 5, perGroupNoSchool: 5, underAge: 16 }, // a responsable des enfants
  teaching: null,
  nurseUnderDays: null,
  licence: { leadDays: 30, nightLeadDays: 30 }, // the prefect has a month to decide
  restHours: 12,
  setAside: null, // the pécule's share is set by the commission child by child, so none is fixed here
};

/** New South Wales: the Office of the Children's Guardian's requirements by age (docs/child-rules/RESEARCH.md). */
const NEW_SOUTH_WALES: MinorRules = {
  id: 'AU-NSW',
  place: 'New South Wales',
  adultAt: 16,
  minAgeDays: 0,
  bands: [
    { fromDays: 0, toDays: 183, label: 'under 6 months', atPlace: 4, work: 4, workNoSchool: 4, days: 1 },
    { fromDays: 183, toDays: days(3), label: '6 months to 2', atPlace: 4, work: 4, workNoSchool: 4, days: 2 },
    { fromDays: days(3), toDays: days(8), label: '3 to 7', atPlace: 7, work: 6, workNoSchool: 6, days: 4 },
    { fromDays: days(8), toDays: days(16), label: '8 to 15', atPlace: 9, work: 8, workNoSchool: 8, days: 5 },
  ],
  supervisor: { roleId: 'chaperone', perGroup: 5, perGroupNoSchool: 5, underAge: 16 },
  teaching: null,
  schoolCap: 4, // at most 4 hours on a day the child attends or receives schooling
  nurseUnderDays: days(3),
  licence: { leadDays: 7, nightLeadDays: 7 }, // no processing time is published: the game allows 7 days
  restHours: 12,
  setAside: null,
};

/** The countries of the European Union, the EEA and Switzerland, which use Germany's rules where their own aren't read. */
const EUROPE = new Set('AT BE BG HR CY CZ DK EE FI GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO CH'.split(' '));

/**
 * The rules for a production based at a place. A place whose own rules aren't recorded uses the nearest recorded set
 * and says so: the rest of the United States uses California's, the rest of Canada British Columbia's (Ontario has its own), the rest of
 * Australia and New Zealand New South Wales's, the rest of Europe's single market Germany's (Ireland has its own), everywhere else England's.
 * Scotland, Wales and Northern Ireland have rules of their own, close to England's but not read for the game. The set
 * every playable country uses is listed in docs/child-rules/COVERAGE.md.
 */
export function rulesFor(place: Place): { rules: MinorRules; standIn: string | null } {
  const own = (r: MinorRules) => ({ rules: r, standIn: null });
  const instead = (r: MinorRules) => ({ rules: r, standIn: `${place.region || place.countryName}'s own rules aren't recorded, so ${r.place}'s are used.` });
  const region = (name: string) => new RegExp(`^${name}$`, 'i').test(place.region);
  switch (place.country) {
    case 'US': return region('new york') ? own(NEW_YORK) : region('california') ? own(CALIFORNIA) : instead(CALIFORNIA);
    case 'CA': return region('british columbia') ? own(BRITISH_COLUMBIA) : region('ontario') ? own(ONTARIO) : instead(BRITISH_COLUMBIA);
    case 'AU': return region('new south wales') ? own(NEW_SOUTH_WALES) : instead(NEW_SOUTH_WALES);
    case 'NZ': return instead(NEW_SOUTH_WALES);
    case 'IE': return own(IRELAND);
    case 'DE': return own(GERMANY);
    case 'FR': return own(FRANCE);
    case 'GB': return place.regionCode === 'GB-ENG' || region('england') ? own(ENGLAND) : instead(ENGLAND);
    default: return EUROPE.has(place.country) ? instead(GERMANY) : instead(ENGLAND);
  }
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
  return Math.min(1, (school ? Math.min(m.band.work, m.rules.schoolCap ?? 24) : m.band.workNoSchool) / ADULT_SHOOT_HOURS);
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
  // Children are counted against the supervisors their age allows (British Columbia sets it by age), else the rules' own.
  const per = new Map<number, number>();
  for (const m of watched) {
    const n = m.band.perSupervisor ?? (school ? rules.supervisor.perGroup : rules.supervisor.perGroupNoSchool);
    per.set(n, (per.get(n) ?? 0) + 1);
  }
  const supervisors = [...per].reduce((a, [n, kids]) => a + Math.ceil(kids / n), 0);
  if (watched.length) add(rules.supervisor.roleId, supervisors, `${rules.place}'s rules require one with children under ${rules.supervisor.underAge}.`);
  // Teaching is for school-age children (5 and over) on school days.
  const pupils = minors.filter((m) => m.ageDays >= days(5));
  if (school && pupils.length && rules.teaching) {
    const t = rules.teaching;
    const prev = out.get(t.roleId);
    const need = Math.ceil(pupils.length / t.perGroup);
    add(t.roleId, Math.max(prev?.count ?? 0, need), `${rules.place}'s rules require ${t.hours} hours of teaching on a school day.`);
  }
  if (rules.nurseUnderDays !== null && minors.some((m) => m.ageDays < rules.nurseUnderDays!)) add('set-nurse', 1, `${rules.place}'s rules require a nurse with children under ${rules.nurseUnderDays! < YEAR ? 'six months' : `${Math.round(rules.nurseUnderDays! / YEAR)}`}.`);
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
export function setAsideOf(rules: MinorRules, pay: number, paidBefore = 0): number {
  if (!rules.setAside) return 0;
  // Over a threshold, only the part of this payment above it (British Columbia: earnings over $2,000 on a production).
  const over = rules.setAside.over ?? 0;
  const total = paidBefore + pay;
  // Ontario's share is of all the earnings once they pass the threshold, so the payment that passes it carries what came before.
  const counted = rules.setAside.ofAll ? (total > over ? (paidBefore > over ? pay : total) : 0)
    : Math.max(0, total - over) - Math.max(0, paidBefore - over);
  return Math.round((counted * rules.setAside.percent) / 100);
}
