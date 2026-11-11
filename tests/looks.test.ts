// How people look on screen, and what it takes (src/engine/looks.ts; the Creative Depth package, milestone B). Each test is
// a controlled comparison: the same seed and the same project, with one choice changed, and what that choice is meant to
// change, and nothing else, compared. No TMDB data and no real person is used: every name here is made up.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { approvedCharacters, approvedScenes, buildTasks, costBreakdown, groupShootDays, materialCost, neededRoles } from './engine-api';
import { callSheet } from '../src/engine/callsheet';
import {
  CROWD_POST_DAYS, DAY_WORK_MIN, MAKEUP, MIN_SHARE, PERIOD_WORK, PLATE_FACTOR, PRECALL_MIN, WARDROBE, WRAP_MIN, chairMinutes, costumeCopies, digitalCrowd, makeup, makeupDayCost,
  makeupShare, periodBand, physicalCrowd, wardrobe, wardrobeMismatch, type MakeupId, type WardrobeId,
} from '../src/engine/looks';
import { chairsOf, sceneLoad } from '../src/engine/production/schedule';
import { covers } from '../src/engine/people';
import { CROWD_DAY_RATE } from '../src/engine/production/rates';
import type { GameState, Project, Scene, StoryCharacter } from '../src/engine/types';
import { approve, buildProject, castAll, runDays, staffAll, startLife, startProduction, summary } from './helpers';

type Look = { makeup?: MakeupId; wardrobe?: WardrobeId; states?: number };
interface Variant { looks?: Record<string, Look>; scene?: Record<string, Partial<Scene>>; storyYear?: number; styleEra?: string; medium?: 'live-action' | 'animation'; undead?: string[] }

/**
 * The same small feature every time: three parts, six scenes, one of them a crowd at night. Only `v` differs. The two
 * workshop scenes fill one day exactly, so a day that holds less no longer holds both.
 */
function film(v: Variant = {}, seed = 'looks'): { s: GameState; p: Project } {
  const s = startLife(seed);
  const p = buildProject(s, { title: 'Looks Fixture', format: 'feature', medium: v.medium ?? 'live-action', ...(v.medium === 'animation' ? { technique: 'stop-motion' as const } : {}) },
    [{ name: 'Wren' }, { name: 'Dale' }, { name: 'Marta' }],
    [
      { place: 'Dispatch Office', chars: ['Wren', 'Dale'] },
      { place: 'Dispatch Office', chars: ['Wren'] },
      { place: 'Workshop', chars: ['Dale', 'Marta'], minutes: 4 },
      { place: 'Workshop', chars: ['Marta'], minutes: 4 },
      { place: 'Main Street', intExt: 'EXT', time: 'NIGHT', chars: ['Wren', 'Marta'], extra: { crowd: 40 } },
      { place: 'Transmitter Shed', chars: ['Wren', 'Dale', 'Marta'] },
    ]);
  for (const c of p.characters) {
    if (v.looks?.[c.name]) c.look = v.looks[c.name];
    if (v.undead?.includes(c.name)) Object.assign(c, { entity: 'undead', realization: 'prosthetics' });
  }
  for (const sc of p.scenes) Object.assign(sc, v.scene?.[`${sc.heading.place}${sc.heading.time === 'NIGHT' ? ' Night' : ''}`] ?? {});
  if (v.storyYear !== undefined) p.axes.storyYear = v.storyYear;
  if (v.styleEra) p.axes.styleEra = v.styleEra;
  approve(s, p);
  return { s, p };
}
const kinds = (p: Project) => buildTasks(p).map((t) => t.kind).sort();
const task = (p: Project, id: string) => buildTasks(p).find((t) => t.id === id);
const idOf = (p: Project, name: string) => p.characters.find((c) => c.name === name)!.id;
const req = (p: Project, kind: string) => p.requirements.filter((r) => r.kind === kind).map((r) => `${r.label} x${r.qty}`).sort();
const days = (s: GameState, p: Project) => groupShootDays(p, s).length;
const toCome = (s: GameState, p: Project, label: RegExp) => costBreakdown(s, p).toCome.filter((l) => label.test(l.label)).reduce((a, l) => a + l.amount, 0);

describe('the methods and sources themselves', () => {
  it('are a short list with every figure in its unit, and differ in the ways the work differs', () => {
    expect(MAKEUP.map((m) => m.id)).toEqual(['character', 'period-hair', 'aging', 'partial', 'wounds', 'creature', 'body-paint', 'mask', 'cleanup', 'digital']);
    expect(WARDROBE.map((w) => w.id)).toEqual(['stock', 'bought', 'rental', 'build']);
    for (const m of MAKEUP) {
      expect(m.label && m.summary, m.id).toBeTruthy();
      for (const n of [m.chairMin, m.removeMin, m.testDays, m.buildDays, m.buildCost, m.dayCost, m.vfxDays]) expect(Number.isFinite(n) && n >= 0, m.id).toBe(true);
      expect(m.crowdShare > 0 && m.crowdShare <= 1, m.id).toBe(true);
      // Appliances are built by the prosthetics designer; nothing built is free to build.
      if (m.buildDays > 0) expect(m.buildCost, m.id).toBeGreaterThan(0);
    }
    // A worn mask and a look finished digitally are the two that spare the chair; each pays for it elsewhere.
    expect(makeup('mask')!.chairMin).toBeLessThan(makeup('wounds')!.chairMin);
    expect(makeup('mask')!.buildDays).toBeGreaterThan(0);
    expect(makeup('digital')!.vfxDays).toBeGreaterThan(0);
    expect(makeup('creature')!.chairMin).toBeGreaterThan(PRECALL_MIN);
    for (const w of WARDROBE) expect(w.days > 0 && w.cost > 0 && w.fittings >= 1, w.id).toBe(true);
    expect(wardrobe('build')!.days).toBeGreaterThan(wardrobe('rental')!.days);
  });

  it('never reach a quality score: the assessment reads no look, method or source', () => {
    for (const f of ['src/engine/finish.ts', 'src/engine/takes.ts', 'src/engine/directing.ts', 'src/engine/awards-results.ts']) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/\.look\b|crowdLook|crowdMethod|from '\.\/looks'|storyYear|styleEra/);
    }
  });
});

describe('a makeup method', () => {
  const base = film();
  const creature = film({ looks: { Marta: { makeup: 'creature' } } });

  it('adds its own tests, builds, crew and daily materials for that character, and leaves every other task as it was', () => {
    const marta = idOf(creature.p, 'Marta');
    expect(req(creature.p, 'makeup')).toEqual(['Marta x1']);
    expect(task(creature.p, `prep:appliances:${marta}`)).toMatchObject({ units: 8, roleId: 'prosthetics', unitLabel: 'build days', material: 7200 });
    expect(task(creature.p, `prep:makeup-test:${marta}`)).toMatchObject({ units: 3, roleId: 'prosthetics', dependsOn: [`prep:appliances:${marta}`] });
    // Everything else is the same work as without it.
    const added = ['prep:appliances', 'prep:makeup-test'];
    expect(kinds(creature.p).filter((k) => !added.includes(k))).toEqual(kinds(base.p));
    const same = (id: string) => expect(task(creature.p, id)?.units, id).toBe(task(base.p, id)!.units);
    for (const id of ['prep:costume:all', 'prep:design:all', 'prep:locations:all', 'post:assembly:1', 'post:music:1', 'post:color:1']) same(id);
    expect(neededRoles(creature.p, creature.s).find((r) => r.roleId === 'prosthetics')).toMatchObject({ required: true });
    expect(neededRoles(base.p, base.s).some((r) => r.roleId === 'prosthetics')).toBe(false);
  });

  it('takes its chair time out of the days she works, and none out of the days she doesn\'t', () => {
    const scenes = approvedScenes(creature.p);
    const chars = approvedCharacters(creature.p);
    const withMarta = scenes.filter((s) => s.participants.includes(idOf(creature.p, 'Marta')));
    const without = scenes.filter((s) => !s.participants.includes(idOf(creature.p, 'Marta')));
    // 210 minutes in the chair: 90 beyond the pre-call, and 45 to take off, 15 beyond wrap, out of a 600-minute day.
    expect(chairMinutes(withMarta, chars)).toBe(210);
    expect(makeupShare(withMarta, chars, 1)).toBeCloseTo(1 - (210 - PRECALL_MIN + 45 - WRAP_MIN) / DAY_WORK_MIN, 6);
    expect(makeupShare(without, chars, 1)).toBe(1);
    expect(makeupShare(scenes, approvedCharacters(base.p), 1)).toBe(1);
    // The shoot is longer by the days her scenes no longer fit, and the office days she isn't in are unchanged.
    expect(days(creature.s, creature.p)).toBeGreaterThan(days(base.s, base.p));
    const office = (x: { s: GameState; p: Project }) => groupShootDays(x.p, x.s).filter((g) => g.place === 'Dispatch Office').map((g) => [g.sceneIds.length, g.load]);
    expect(office(creature)).toEqual(office(base));
  });

  it('is paid for each day it is worn, in the estimate and nowhere twice', () => {
    expect(toCome(base.s, base.p, /^Makeup materials$/)).toBe(0);
    const worn = groupShootDays(creature.p, creature.s).filter((g) => g.sceneIds.some((id) => approvedScenes(creature.p).find((s) => s.id === id)!.participants.includes(idOf(creature.p, 'Marta')))).length;
    expect(toCome(creature.s, creature.p, /^Makeup materials$/)).toBe(worn * makeup('creature')!.dayCost);
    expect(toCome(creature.s, creature.p, /^Full Creature Appliances: Marta$/)).toBe(7200);
    // The whole difference in materials and builds is those two lines.
    const builds = (x: { s: GameState; p: Project }) => costBreakdown(x.s, x.p).toCome.filter((l) => l.area === 'builds').reduce((a, l) => a + l.amount, 0);
    expect(builds(creature) - builds(base)).toBe(7200);
  });

  it('is on the call sheet: when makeup starts, and for whom', () => {
    staffAll(creature.s, creature.p);
    runDays(creature.s, creature.p, 30);
    startProduction(creature.s, creature.p);
    const day = creature.p.schedule.days.find((d) => approvedScenes(creature.p).some((s) => d.sceneIds.includes(s.id) && s.participants.includes(idOf(creature.p, 'Marta')) && !d.night))!;
    const note = callSheet(creature.s, creature.p, day.id).notes.find((n) => n.startsWith('Makeup'))!;
    expect(note).toMatch(/^Makeup starts at \d+:\d\d AM, .* before call: Marta \(full creature appliances\)\.$/);
    const other = creature.p.schedule.days.find((d) => !approvedScenes(creature.p).some((s) => d.sceneIds.includes(s.id) && s.participants.includes(idOf(creature.p, 'Marta'))))!;
    expect(callSheet(creature.s, creature.p, other.id).notes.some((n) => n.startsWith('Makeup'))).toBe(false);
  });

  it('owns the look: an undead character with a method is not also charged as a creature effect', () => {
    const before = film({ undead: ['Marta'] });
    const after = film({ undead: ['Marta'], looks: { Marta: { makeup: 'creature' } } });
    expect(req(before.p, 'creature')).toEqual(['Marta x1']);
    expect(kinds(before.p)).toContain('prep:creature');
    expect(req(after.p, 'creature')).toEqual([]);
    expect(req(after.p, 'makeup')).toEqual(['Marta x1']);
    expect(kinds(after.p)).not.toContain('prep:creature');
    expect(kinds(after.p)).toContain('prep:appliances');
  });

  it('shortens with a second chair, and each appearance state is its own build', () => {
    const two = film({ looks: { Marta: { makeup: 'creature' }, Wren: { makeup: 'aging' } } });
    const together = approvedScenes(two.p).filter((s) => s.heading.place === 'Transmitter Shed');
    const chars = approvedCharacters(two.p);
    expect(chairMinutes(together, chars)).toBe(210 + 150);
    expect(makeupShare(together, chars, 2)).toBeGreaterThan(makeupShare(together, chars, 1));
    expect(makeupShare(together, chars, 2)).toBeCloseTo(1 - (180 - PRECALL_MIN + 45 - WRAP_MIN) / DAY_WORK_MIN, 6);
    const states = film({ looks: { Marta: { makeup: 'creature', states: 3 } } });
    expect(task(states.p, `prep:appliances:${idOf(states.p, 'Marta')}`)).toMatchObject({ units: 24, material: 21600 });
    expect(req(states.p, 'makeup')).toEqual(['Marta x3']);
  });

  it('finished digitally spares the chair and makes effects work for every scene she is in', () => {
    const digital = film({ looks: { Marta: { makeup: 'digital' } } });
    const marta = idOf(digital.p, 'Marta');
    const hers = approvedScenes(digital.p).filter((s) => s.participants.includes(marta)).length;
    expect(task(digital.p, 'post:looks:1')).toMatchObject({ units: hers * 3, roleId: 'vfx-artist' });
    expect(task(digital.p, 'post:color:1')!.dependsOn).toContain('post:looks:1');
    expect(kinds(digital.p)).not.toContain('prep:appliances');
    expect(days(digital.s, digital.p)).toBe(days(base.s, base.p));
    expect(task(creature.p, 'post:looks:1')).toBeUndefined();
  });

  it('never leaves a day with nothing: however long the queue, a quarter of the day is left', () => {
    const crowd = film({ scene: { 'Main Street Night': { crowdLook: 'creature' } } });
    const night = approvedScenes(crowd.p).filter((s) => s.heading.time === 'NIGHT');
    expect(makeupShare(night, approvedCharacters(crowd.p), 1)).toBe(MIN_SHARE);
  });
});

describe('where a costume comes from', () => {
  const base = film();
  it('is its own work, in the copies its states and rough scenes need, and leaves the others on the shared costume task', () => {
    const built = film({ looks: { Wren: { wardrobe: 'build' } } });
    const wren = idOf(built.p, 'Wren');
    expect(task(built.p, `prep:wardrobe:${wren}`)).toMatchObject({ units: 5, material: 1400, roleId: 'costume-designer' });
    expect(task(built.p, `prep:fitting:${wren}`)).toMatchObject({ units: 3, dependsOn: [`prep:wardrobe:${wren}`] });
    expect(task(built.p, 'prep:costume:all')!.units).toBe(task(base.p, 'prep:costume:all')!.units - 1);
    expect(req(built.p, 'costume')).toEqual(['Wren x1']);
    const bought = film({ looks: { Wren: { wardrobe: 'bought' } } });
    expect(task(bought.p, `prep:wardrobe:${wren}`)).toMatchObject({ units: 1, material: 350 });
    expect(task(bought.p, `prep:fitting:${wren}`)!.units).toBe(1);
    // Where it comes from changes no shoot day.
    expect(days(built.s, built.p)).toBe(days(base.s, base.p));
  });

  it('is doubled for a stunt or water, and multiplied by each appearance state', () => {
    const wet = film({ looks: { Wren: { wardrobe: 'bought', states: 2 } }, scene: { 'Transmitter Shed': { water: true } } });
    const wren = wet.p.characters.find((c) => c.name === 'Wren')!;
    expect(costumeCopies(wren, approvedScenes(wet.p))).toBe(4);
    expect(task(wet.p, `prep:wardrobe:${wren.id}`)).toMatchObject({ units: 4, material: 1400 });
    expect(req(wet.p, 'costume')).toEqual(['Wren x4']);
    const dry = film({ looks: { Wren: { wardrobe: 'bought', states: 2 } } });
    expect(costumeCopies(dry.p.characters.find((c) => c.name === 'Wren')!, approvedScenes(dry.p))).toBe(2);
  });

  it('bought or stock clothes are altered for a period story, and a costume house\'s are not', () => {
    const y = { storyYear: 1986 };
    const bought = film({ ...y, looks: { Wren: { wardrobe: 'bought' } } });
    const rental = film({ ...y, looks: { Wren: { wardrobe: 'rental' } } });
    const wren = (x: { p: Project }) => x.p.characters.find((c) => c.name === 'Wren')! as StoryCharacter;
    expect(task(bought.p, `prep:wardrobe:${wren(bought).id}`)).toMatchObject({ units: 1.5, material: 525 });
    expect(task(rental.p, `prep:wardrobe:${wren(rental).id}`)).toMatchObject({ units: 1.5, material: 500 });
    expect(wardrobeMismatch(bought.p, wren(bought))).toMatch(/aren't of a period within living memory/);
    expect(wardrobeMismatch(rental.p, wren(rental))).toBeNull();
    expect(wardrobeMismatch(film({ looks: { Wren: { wardrobe: 'bought' } } }).p, wren(bought))).toBeNull();
  });
});

describe('the year the story is set in', () => {
  it('bands by how far it is from the year it is made', () => {
    expect([2026, 2020, 2018, 2017, 1996, 1995, 1946, 1945, 1800, 2034, 2035].map((y) => periodBand(y, 2026))).toEqual(
      ['present', 'present', 'present', 'recent', 'recent', 'period', 'period', 'distant', 'distant', 'present', 'future']);
  });

  it('1986 made in 2026 is a period: research, and half as much costume work again; 2026 is neither; the look it borrows changes no work', () => {
    const present = film({ storyYear: 2026 });
    const period = film({ storyYear: 1986 });
    const base = film();
    expect(req(period.p, 'period-research')).toEqual(['1986 x1']);
    expect(req(present.p, 'period-research')).toEqual([]);
    expect(kinds(period.p)).toContain('prep:research');
    expect(task(period.p, 'prep:costume:all')!.units).toBe(task(present.p, 'prep:costume:all')!.units * PERIOD_WORK.period);
    expect(task(present.p, 'prep:costume:all')!.units).toBe(task(base.p, 'prep:costume:all')!.units);
    // Costumes and design wait for the research; nothing after the shoot is touched.
    expect(task(period.p, 'prep:costume:all')!.dependsOn).toContain('prep:research:period');
    for (const id of ['post:assembly:1', 'post:music:1', 'post:mix:1']) expect(task(period.p, id)!.units).toBe(task(present.p, id)!.units);
    expect(days(period.s, period.p)).toBe(days(present.s, present.p));
    // A contemporary story with a 1980s look: the same work as one without.
    const retro = film({ storyYear: 2026, styleEra: '1980s' });
    expect(buildTasks(retro.p)).toEqual(buildTasks(present.p));
    expect(retro.p.requirements).toEqual(present.p.requirements);
  });
});

describe('a crowd', () => {
  const practical = film();
  const digital = film({ scene: { 'Main Street Night': { crowdMethod: 'digital' } } });
  const night = (x: { p: Project }) => approvedScenes(x.p).find((s) => s.heading.time === 'NIGHT')!;

  it('made partly in post puts a quarter on set, shoots plates, and is finished after the picture is locked', () => {
    expect(physicalCrowd(night(practical))).toBe(40);
    expect(physicalCrowd(night(digital))).toBe(10);
    expect(digitalCrowd(night(digital))).toBe(true);
    expect(req(digital.p, 'crowd')).toEqual(['Main Street x10']);
    expect(task(digital.p, 'post:crowd:1')).toMatchObject({ units: CROWD_POST_DAYS, roleId: 'vfx-artist', sceneIds: [night(digital).id] });
    expect(task(practical.p, 'post:crowd:1')).toBeUndefined();
    expect(sceneLoad(digital.p, night(digital))).toBeCloseTo(sceneLoad(practical.p, night(practical)) * PLATE_FACTOR, 6);
    // Forty people need background casting; ten don't.
    expect(neededRoles(practical.p, practical.s).some((r) => r.roleId === 'extras-casting')).toBe(true);
    expect(neededRoles(digital.p, digital.s).some((r) => r.roleId === 'extras-casting')).toBe(false);
    const crowdCost = (x: { s: GameState; p: Project }) => toCome(x.s, x.p, /^Background performers/);
    expect(crowdCost(practical) % (40 * CROWD_DAY_RATE)).toBe(0);
    expect(crowdCost(digital) % (10 * CROWD_DAY_RATE)).toBe(0);
    expect(crowdCost(digital)).toBeLessThan(crowdCost(practical));
  });

  it('too small to extend is simply there: eight or fewer are all on set, and no post work is made', () => {
    const few = film({ scene: { 'Main Street Night': { crowdMethod: 'digital', crowd: 6 } } });
    expect(physicalCrowd(night(few))).toBe(6);
    expect(digitalCrowd(night(few))).toBe(false);
    expect(task(few.p, 'post:crowd:1')).toBeUndefined();
  });

  it('made up is made up head by head: the people on set, at a background performer\'s share', () => {
    const all = film({ scene: { 'Main Street Night': { crowdLook: 'wounds' } } });
    const some = film({ scene: { 'Main Street Night': { crowdLook: 'wounds', crowdMethod: 'digital' } } });
    const chars = approvedCharacters(all.p);
    expect(chairMinutes([night(all)], chars)).toBe(40 * 60 * 0.6);
    expect(chairMinutes([night(some)], chars)).toBe(10 * 60 * 0.6);
    expect(makeupDayCost([night(all)], chars)).toBe(40 * 90 * 0.6);
    expect(req(all.p, 'makeup')).toEqual(['Background: Main Street x40']);
    expect(req(some.p, 'makeup')).toEqual(['Background: Main Street x10']);
    // Only that night is affected.
    const other = approvedScenes(all.p).filter((s) => s.heading.time !== 'NIGHT');
    expect(chairMinutes(other, chars)).toBe(0);
  });
});

describe('a puppet film', () => {
  it('has no chair, no fittings and no appliances, whatever the characters\' looks say', () => {
    const plain = film({ medium: 'animation' });
    const dressed = film({ medium: 'animation', looks: { Marta: { makeup: 'creature', wardrobe: 'build' } }, scene: { 'Main Street Night': { crowdLook: 'wounds' } } });
    expect(buildTasks(dressed.p)).toEqual(buildTasks(plain.p));
    expect(req(dressed.p, 'makeup')).toEqual([]);
    expect(req(dressed.p, 'costume')).toEqual([]);
    expect(neededRoles(dressed.p, dressed.s).some((r) => r.roleId === 'hair-makeup' || r.roleId === 'prosthetics')).toBe(false);
  });
});

describe('through a shoot', () => {
  it('a day with heavy makeup shoots less than the same day without it, and says why', () => {
    const run = (look?: Look) => {
      const { s, p } = film(look ? { looks: { Marta: look } } : {}, 'looks-day');
      castAll(s, p);
      staffAll(s, p);
      runDays(s, p, 30);
      startProduction(s, p);
      runDays(s, p, 400);
      return { s, p };
    };
    const plain = run();
    const heavy = run({ makeup: 'creature' });
    expect(chairsOf(heavy.p)).toBeGreaterThan(0);
    expect(summary(plain.p).delivered && summary(heavy.p).delivered).toBe(true);
    const shot = (p: Project) => p.schedule.days.filter((d) => d.status === 'shot' || d.status === 'partial').length;
    expect(shot(heavy.p)).toBeGreaterThan(shot(plain.p));
    // The workshop scenes, which filled one day, now take two.
    const workshop = (p: Project) => p.schedule.days.filter((d) => d.locationLabel === 'Workshop' && d.status !== 'lost').length;
    expect(workshop(plain.p)).toBe(1);
    expect(workshop(heavy.p)).toBe(2);
  });

  it('a made-up cast is shot, the materials are paid once a day, and the film is delivered', () => {
    const { s, p } = film({ looks: { Marta: { makeup: 'wounds', wardrobe: 'bought', states: 2 }, Wren: { wardrobe: 'rental' } }, storyYear: 1986 }, 'looks-run');
    castAll(s, p);
    staffAll(s, p);
    runDays(s, p, 30);
    startProduction(s, p);
    runDays(s, p, 400);
    expect(summary(p)).toMatchObject({ delivered: true });
    const postings = p.obligations.flatMap((o) => o.postings.map((x) => x.key));
    const makeupKeys = postings.filter((k) => k.startsWith('makeup:'));
    expect(makeupKeys.length).toBeGreaterThan(0);
    expect(new Set(makeupKeys).size).toBe(makeupKeys.length);
    // Each costume's and each appliance's materials were paid once.
    for (const kind of ['prep:wardrobe', 'prep:fitting', 'prep:appliances', 'prep:makeup-test']) {
      for (const t of p.tasks.filter((x) => x.kind === kind)) {
        expect(t.status, t.label).toBe('done');
        if (materialCost(t)) expect(postings.filter((k) => k === `mat:${t.id}`), t.label).toHaveLength(1);
      }
    }
    // Someone who does makeup, or whose job covers it on a small crew, was on set.
    expect(p.hires.some((h) => h.status === 'accepted' && h.daysWorked > 0 && covers(h.roleId, 'hair-makeup'))).toBe(true);
  });
});
