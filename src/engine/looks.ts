// How people look on screen, and what it takes (November 11, 2026; the Creative Depth package, milestone B,
// docs/creative-depth/package/02-CREATIVE-LIBRARIES.md "Department loops"). A character's makeup method and where their
// costume comes from, a crowd's makeup, and whether a crowd is people or partly made in post. Each choice is an ID kept
// on the character or scene; everything else here is worked out from it.
//
// Before this, makeup was nothing but a crew role, every costume was one unit of one task, and a creature was three
// build days whatever it was. Nothing the player chose about a look changed a day or a cost.
//
// The numbers are game calibration, chosen by judgement so the choices differ in the ways the work differs: minutes in
// the chair, days to test and build, money for materials. They are not industry rates (docs/ASSUMPTIONS.md). No choice
// here raises or lowers a quality score: a demanding look makes work, and the work has to be staffed, scheduled and
// paid for.
//
// One owner for each piece of work: a character with a makeup method here is not also charged as a "creature effect"
// (projects.ts deriveRequirements), and a costume with a source here is not also counted in the shared costume task
// (production/tasks.ts).
//
// Only types are imported, so the script, the schedule, the estimate and the shoot day can all read this.
import type { Project, Scene, StoryCharacter } from './types';

export type MakeupId = 'character' | 'period-hair' | 'aging' | 'partial' | 'wounds' | 'creature' | 'body-paint' | 'mask' | 'cleanup' | 'digital';
export interface MakeupMethod {
  id: MakeupId;
  label: string;
  /** What choosing it means, in a sentence. */
  summary: string;
  /** Minutes in the chair before a performer can shoot, each day they work. */
  chairMin: number;
  /** Minutes to take it off at the end of the day. */
  removeMin: number;
  /** Days of camera tests before the shoot, per character. */
  testDays: number;
  /** Days to sculpt, mould and make appliances, per character and per appearance state. Zero for none. */
  buildDays: number;
  /** Materials for those builds, per build day. */
  buildCost: number;
  /** Materials used up each day a performer wears it. */
  dayCost: number;
  /** Who applies it: the hair and makeup artist, or the prosthetics designer. */
  specialist: 'hair-makeup' | 'prosthetics';
  /** For a background performer: the share of the chair time and daily materials a simpler version takes. */
  crowdShare: number;
  /** Days of visual-effects work per scene, for a look finished in post. */
  vfxDays: number;
}
export const MAKEUP: MakeupMethod[] = [
  { id: 'character', label: 'Everyday Makeup And Hair', summary: 'A simple look kept the same from day to day.', chairMin: 20, removeMin: 5, testDays: 0, buildDays: 0, buildCost: 0, dayCost: 15, specialist: 'hair-makeup', crowdShare: 0.5, vfxDays: 0 },
  { id: 'period-hair', label: 'Period Hair And Wigs', summary: 'Wigs or set hair of another time, tested on camera and dressed each morning.', chairMin: 50, removeMin: 15, testDays: 1, buildDays: 0, buildCost: 0, dayCost: 40, specialist: 'hair-makeup', crowdShare: 0.5, vfxDays: 0 },
  { id: 'aging', label: 'Aging Appliances', summary: 'Sculpted pieces that add years, made for one face and applied fresh each day.', chairMin: 150, removeMin: 40, testDays: 2, buildDays: 5, buildCost: 700, dayCost: 260, specialist: 'prosthetics', crowdShare: 0.3, vfxDays: 0 },
  { id: 'partial', label: 'Partial Facial Appliances', summary: 'A few small pieces that change a face, a brow or a nose, tested for how they move.', chairMin: 90, removeMin: 25, testDays: 1, buildDays: 3, buildCost: 500, dayCost: 140, specialist: 'prosthetics', crowdShare: 0.4, vfxDays: 0 },
  { id: 'wounds', label: 'Wounds And Blood', summary: 'Injuries that change through the story, matched from scene to scene.', chairMin: 60, removeMin: 20, testDays: 1, buildDays: 1, buildCost: 300, dayCost: 90, specialist: 'hair-makeup', crowdShare: 0.6, vfxDays: 0 },
  { id: 'creature', label: 'Full Creature Appliances', summary: 'A face and hands rebuilt in foam or silicone: sculpted, tested, and hours in the chair every shooting day.', chairMin: 210, removeMin: 45, testDays: 3, buildDays: 8, buildCost: 900, dayCost: 380, specialist: 'prosthetics', crowdShare: 0.25, vfxDays: 0 },
  { id: 'body-paint', label: 'Body Paint', summary: 'Painted skin, redone every day and touched up between takes.', chairMin: 120, removeMin: 40, testDays: 1, buildDays: 0, buildCost: 0, dayCost: 120, specialist: 'hair-makeup', crowdShare: 0.5, vfxDays: 0 },
  { id: 'mask', label: 'A Worn Mask', summary: 'A made mask the performer puts on: built and fitted once, with almost no time in the chair.', chairMin: 10, removeMin: 5, testDays: 1, buildDays: 4, buildCost: 600, dayCost: 10, specialist: 'prosthetics', crowdShare: 1, vfxDays: 0 },
  { id: 'cleanup', label: 'Practical With Digital Cleanup', summary: 'Applied for real, with edges and joins tidied in post for the shots that show them.', chairMin: 150, removeMin: 40, testDays: 2, buildDays: 5, buildCost: 700, dayCost: 240, specialist: 'prosthetics', crowdShare: 0.3, vfxDays: 1 },
  { id: 'digital', label: 'Finished Digitally', summary: 'Tracking marks on set and the look made in post: little chair time, and effects work for every scene.', chairMin: 15, removeMin: 5, testDays: 1, buildDays: 0, buildCost: 0, dayCost: 10, specialist: 'hair-makeup', crowdShare: 1, vfxDays: 3 },
];
const makeupById = new Map(MAKEUP.map((m) => [m.id, m]));
export const makeup = (id: MakeupId | undefined): MakeupMethod | undefined => (id ? makeupById.get(id) : undefined);

export type WardrobeId = 'stock' | 'bought' | 'rental' | 'build';
export interface WardrobeSource {
  id: WardrobeId;
  label: string;
  summary: string;
  /** Costume designer's days for one costume. */
  days: number;
  /** Materials, purchase or hire for one copy. */
  cost: number;
  /** Fittings with the performer before the shoot. */
  fittings: number;
  /** Whether it can dress a story set well away from the present without being remade. */
  anyPeriod: boolean;
}
export const WARDROBE: WardrobeSource[] = [
  { id: 'stock', label: "From The Performer's Own Or Stock", summary: 'Clothes already to hand. Quick and cheap, and only as right as what there is.', days: 0.5, cost: 60, fittings: 1, anyPeriod: false },
  { id: 'bought', label: 'Bought', summary: 'Shopped for the part, in sizes that fit and with copies where they are needed.', days: 1, cost: 350, fittings: 1, anyPeriod: false },
  { id: 'rental', label: 'Hired From A Costume House', summary: 'Period and specialist pieces on hire: researched, fitted, and returned as they came.', days: 1.5, cost: 500, fittings: 2, anyPeriod: true },
  { id: 'build', label: 'Made For The Part', summary: 'Designed, patterned and sewn for this performer: the most days, the most money, and exactly the garment.', days: 5, cost: 1400, fittings: 3, anyPeriod: true },
];
const wardrobeById = new Map(WARDROBE.map((w) => [w.id, w]));
export const wardrobe = (id: WardrobeId | undefined): WardrobeSource | undefined => (id ? wardrobeById.get(id) : undefined);

/** The most appearance states a character can be given: each is a look that has to be matched and, for appliances, built. */
export const MAX_STATES = 6;
export const statesOf = (c: StoryCharacter): number => Math.max(1, Math.min(MAX_STATES, c.look?.states ?? 1));

// ---------------- Period ----------------

export type PeriodBand = 'present' | 'recent' | 'period' | 'distant' | 'future';
/**
 * How far the story's year is from the year it is made, as the costume and design departments meet it. Present: within
 * eight years. Recent: up to thirty, still findable second-hand. Period: up to eighty, a costume house's stock. Distant:
 * older, largely made. Future: more than eight years ahead, designed.
 */
export function periodBand(storyYear: number, madeIn: number): PeriodBand {
  const gap = madeIn - storyYear;
  if (gap < -8) return 'future';
  if (gap <= 8) return 'present';
  if (gap <= 30) return 'recent';
  return gap <= 80 ? 'period' : 'distant';
}
/** How much more costume and design work a band takes than the present day does. */
export const PERIOD_WORK: Record<PeriodBand, number> = { present: 1, recent: 1.25, period: 1.5, distant: 2, future: 1.5 };
export const PERIOD_LABEL: Record<PeriodBand, string> = { present: 'the present day', recent: 'the recent past', period: 'a period within living memory', distant: 'a distant period', future: 'the future' };
/** The year a project is made in: the year it was started. */
export const madeIn = (p: Project): number => new Date(p.createdAt).getUTCFullYear();
/** The band a project's declared story year puts it in, or undefined when no year is declared (the older rules apply). */
export const projectBand = (p: Project): PeriodBand | undefined => (p.axes.storyYear === undefined ? undefined : periodBand(p.axes.storyYear, madeIn(p)));

/**
 * A wardrobe source that can't dress this story as it is: bought or stock clothes for a period or a future they don't
 * exist in. Returns why, or null. The costume is then remade from them, at the period's extra work.
 */
export function wardrobeMismatch(p: Project, c: StoryCharacter): string | null {
  const w = wardrobe(c.look?.wardrobe);
  const band = projectBand(p);
  if (!w || !band || w.anyPeriod || band === 'present' || band === 'recent') return null;
  return `${w.label} clothes aren't of ${PERIOD_LABEL[band]}: ${c.name}'s will be altered to pass, which takes the extra work a period costume does. A costume house or a build suits it better.`;
}

// ---------------- Copies ----------------

/**
 * Copies of a character's costume the shoot needs: one for each appearance state, doubled when a scene they are in has a
 * stunt or water, since a soaked or torn costume can't be reset between takes.
 */
export function costumeCopies(c: StoryCharacter, scenes: Scene[]): number {
  const rough = scenes.some((s) => s.participants.includes(c.id) && (s.water || !!s.stunts.trim()));
  return statesOf(c) * (rough ? 2 : 1);
}

// ---------------- Crowds ----------------

/** The share of a crowd that is still people on set when the rest is added in post, and the fewest there can be. */
export const DIGITAL_CROWD_SHARE = 0.25;
export const DIGITAL_CROWD_FLOOR = 8;
/** Background performers actually on set for a scene. */
export function physicalCrowd(s: Scene): number {
  if (s.crowd <= 0) return 0;
  return s.crowdMethod === 'digital' ? Math.min(s.crowd, Math.max(DIGITAL_CROWD_FLOOR, Math.ceil(s.crowd * DIGITAL_CROWD_SHARE))) : s.crowd;
}
/** A scene whose crowd is extended in post: it shoots clean plates as well, and its crowd is finished later. */
export const digitalCrowd = (s: Scene): boolean => s.crowdMethod === 'digital' && s.crowd > physicalCrowd(s);
/** How much longer a scene takes to shoot when clean plates and tracking passes are shot for a crowd made in post. */
export const PLATE_FACTOR = 1.15;
/** Days of effects work to finish one scene's crowd in post. */
export const CROWD_POST_DAYS = 3;

// ---------------- The chair ----------------

/** A shooting day's working minutes, and how long before the unit's call makeup may start without eating into it. */
export const DAY_WORK_MIN = 600;
export const PRECALL_MIN = 120;
/** How long removal may take after wrap without eating into the day. */
export const WRAP_MIN = 30;
/** The least of a day that is left to shoot however long makeup takes. */
export const MIN_SHARE = 0.25;

/** Characters in these scenes whose makeup method takes chair time: principals with a method, in live scenes. */
export function madeUp(scenes: Scene[], chars: StoryCharacter[]): { c: StoryCharacter; m: MakeupMethod }[] {
  const out: { c: StoryCharacter; m: MakeupMethod }[] = [];
  for (const c of chars) {
    const m = makeup(c.look?.makeup);
    if (m && c.roleSize !== 'background' && scenes.some((s) => s.participants.includes(c.id))) out.push({ c, m });
  }
  return out;
}

/** Minutes of chair work a day's scenes take in all, before the unit can shoot: every made-up principal and every made-up background performer. */
export function chairMinutes(scenes: Scene[], chars: StoryCharacter[]): number {
  let total = madeUp(scenes, chars).reduce((a, x) => a + x.m.chairMin, 0);
  // A crowd is made up once for the day, at its largest.
  const byMethod = new Map<MakeupId, number>();
  for (const s of scenes) if (s.crowdLook && physicalCrowd(s) > 0) byMethod.set(s.crowdLook, Math.max(byMethod.get(s.crowdLook) ?? 0, physicalCrowd(s)));
  for (const [id, heads] of byMethod) { const m = makeup(id)!; total += heads * m.chairMin * m.crowdShare; }
  return total;
}

/**
 * The share of a shooting day left once makeup is done, with `chairs` people applying it at once. Makeup starts up to
 * PRECALL_MIN before the unit's call at no cost to the day, and removal runs up to WRAP_MIN after wrap; what either takes
 * beyond that comes out of the working day. Never less than MIN_SHARE. With nobody to apply it the chairs count as one: the day's
 * scenes then wait for someone to be hired (production/shoot.ts), so this only prices the plan.
 */
export function makeupShare(scenes: Scene[], chars: StoryCharacter[], chairs: number): number {
  const minutes = chairMinutes(scenes, chars);
  if (minutes <= 0) return 1;
  const queue = minutes / Math.max(1, chairs);
  const removal = Math.max(0, ...madeUp(scenes, chars).map((x) => x.m.removeMin));
  const lost = Math.max(0, queue - PRECALL_MIN) + Math.max(0, removal - WRAP_MIN);
  return Math.max(MIN_SHARE, 1 - lost / DAY_WORK_MIN);
}

/** When makeup starts before the unit's call, in minutes, for the call sheet: the whole queue. */
export const makeupLead = (scenes: Scene[], chars: StoryCharacter[], chairs: number): number => Math.ceil(chairMinutes(scenes, chars) / Math.max(1, chairs) / 15) * 15;

/** Materials used up on a shooting day: every made-up principal's, and the crowd's at its share. */
export function makeupDayCost(scenes: Scene[], chars: StoryCharacter[]): number {
  let total = madeUp(scenes, chars).reduce((a, x) => a + x.m.dayCost, 0);
  const byMethod = new Map<MakeupId, number>();
  for (const s of scenes) if (s.crowdLook && physicalCrowd(s) > 0) byMethod.set(s.crowdLook, Math.max(byMethod.get(s.crowdLook) ?? 0, physicalCrowd(s)));
  for (const [id, heads] of byMethod) { const m = makeup(id)!; total += heads * m.dayCost * m.crowdShare; }
  return Math.round(total);
}

/** Whether any look here needs someone to apply it on the day. */
export const needsMakeupCrew = (scenes: Scene[], chars: StoryCharacter[]): boolean => chairMinutes(scenes, chars) > 0;
