// Camera, light and sound choices that reach the work (src/engine/craft.ts; the Creative Depth package, milestone C). Each
// test is a controlled comparison: the same seed and the same film, with one choice changed, and what that choice is
// meant to change, and nothing else, compared. No choice is a quality bonus; several cost time or money for nothing but
// the look.
import { describe, expect, it } from 'vitest';
import { approvedScenes, buildTasks, costBreakdown, materialCost, neededRoles } from './engine-api';
import { LIGHTS, LOOP_GROUP_SESSION, RIGS, SCORES, SOUNDS, UNCREWED_RESET, craftTime, postFactors, rigDayCost, takeSpread, type Light, type Rig, type Score, type SoundChoice } from '../src/engine/craft';
import { needsDialogueReplacement } from '../src/engine/production/shoot';
import { SETUP_RESET, TAKE_RUN, planTime, recordTakes } from '../src/engine/takes';
import type { GameState, Project, Task } from '../src/engine/types';
import { approve, buildProject, startLife } from './helpers';

interface Variant { rig?: Rig; light?: Light; sound?: SoundChoice[]; score?: Score; hire?: string[]; creature?: boolean; medium?: 'animation' }

/** The same film every time: two people, a day interior with dialogue, a night exterior with a crowd, a day exterior. */
function film(v: Variant = {}): { s: GameState; p: Project } {
  const s = startLife('craft');
  const p = buildProject(s, { title: 'Craft Fixture', format: 'feature', medium: v.medium ?? 'live-action', ...(v.medium ? { technique: 'stop-motion' as const } : {}) }, [{ name: 'Wren' }, { name: 'Dale' }],
    [{ place: 'Office', chars: ['Wren', 'Dale'], minutes: 4 }, { place: 'Main Street', intExt: 'EXT', time: 'NIGHT', chars: ['Wren'], minutes: 4, extra: { crowd: 30 } }, { place: 'Quay', intExt: 'EXT', chars: ['Dale'], minutes: 4 }]);
  p.scenes[0].dialogue = [{ id: 'l1', characterId: p.characters[0].id, text: 'Is the line open?' }, { id: 'l2', characterId: p.characters[1].id, text: 'It was.' }] as Project['scenes'][number]['dialogue'];
  if (v.creature) Object.assign(p.characters[1], { entity: 'creature', realization: 'prosthetics' });
  if (v.light) p.axes.light = v.light;
  if (v.sound) p.axes.sound = v.sound;
  if (v.score) p.axes.score = v.score;
  approve(s, p);
  if (v.rig) p.shotPlans = Object.fromEntries(p.scenes.map((sc) => [sc.id, { rig: v.rig }]));
  for (const roleId of v.hire ?? []) p.hires.push({ id: `h-${roleId}`, personId: `x-${roleId}`, roleId, kind: 'crew', episodes: 'all', dayRate: 300, estDays: 1, status: 'accepted', offeredAt: 0, responseAt: 0, obligationId: null, daysWorked: 0 } as Project['hires'][number]);
  p.tasks = buildTasks(p);
  return { s, p };
}
const task = (p: Project, kind: string): Task | undefined => p.tasks.find((t) => t.kind === kind);
const units = (p: Project, kind: string): number => p.tasks.filter((t) => t.kind === kind).reduce((a, t) => a + t.units, 0);
const interior = (p: Project) => approvedScenes(p)[0];
const night = (p: Project) => approvedScenes(p)[1];
const dayExt = (p: Project) => approvedScenes(p)[2];
const roles = (p: Project) => neededRoles(p).filter((r) => r.required).map((r) => r.roleId);

describe('how the camera moves', () => {
  it('a project with nothing chosen shoots as it always did', () => {
    const { p } = film();
    for (const sc of approvedScenes(p)) expect(craftTime(p, sc)).toEqual({ reset: 1, run: 1, extraTakes: 0 });
    expect(postFactors(p)).toEqual({ foley: 1, effects: 1, score: 1, mix: 1, grade: 1 });
    expect([task(p, 'prep:camera-test'), task(p, 'prep:wildtrack'), task(p, 'post:score-session'), task(p, 'post:loop-group')]).toEqual([undefined, undefined, undefined, undefined]);
  });

  it('each rig changes the time a scene takes by its own reset and running time, and nothing else about the plan', () => {
    const base = planTime(film().p, interior(film().p));
    for (const rig of ['handheld', 'dolly', 'moving', 'pov'] as Rig[]) {
      const d = RIGS[rig];
      const { p } = film({ rig, hire: d.role ? [d.role] : [] });
      const sc = interior(p);
      // Master and singles, two planned takes each (the usual rule).
      expect(planTime(p, sc)).toBeCloseTo(2 * (SETUP_RESET * d.reset + TAKE_RUN * d.run * 2), 10);
      expect(planTime(p, sc) < base).toBe(d.reset < 1 && d.run <= 1);
    }
    expect(planTime(film({ rig: 'handheld' }).p, interior(film().p))).toBeLessThan(base);
    expect(planTime(film({ rig: 'dolly', hire: ['key-grip'] }).p, interior(film().p))).toBeGreaterThan(base);
  });

  it('a dolly needs a key grip and rented track; without the grip every setup is slower than a tripod\'s', () => {
    const none = film({ rig: 'dolly' }).p;
    const { s, p: crewed } = film({ rig: 'dolly', hire: ['key-grip'] });
    expect(roles(none)).toContain('key-grip');
    expect(roles(film().p)).not.toContain('key-grip');
    expect(craftTime(none, interior(none)).reset).toBeCloseTo(RIGS.dolly.reset * UNCREWED_RESET, 10);
    expect(craftTime(crewed, interior(crewed)).reset).toBe(RIGS.dolly.reset);
    expect(rigDayCost(crewed, approvedScenes(crewed))).toBe(600);
    expect(rigDayCost(film({ rig: 'handheld' }).p, approvedScenes(crewed))).toBe(0);
    const line = (q: Project) => costBreakdown(s, q).toCome.find((l) => l.label === 'Camera rig rental');
    expect(line(crewed)?.amount).toBeGreaterThan(0);
    expect(line(film().p)).toBeUndefined();
  });

  it('long moving takes and scenes through a character\'s eyes are rehearsed, and the rehearsal is work on the list', () => {
    const cast = (q: Project) => { q.cast.push({ characterId: q.characters[0].id, performer: 'player', method: 'on-camera' } as Project['cast'][number]); q.tasks = buildTasks(q); return q; };
    const days = (q: Project) => task(cast(q), 'prep:rehearsal')?.units ?? 0;
    const base = days(film().p); // the days the player set
    expect(days(film({ rig: 'moving' }).p) - base).toBe(1); // three scenes at a third of a day each
    expect(days(film({ rig: 'pov' }).p) - base).toBe(1); // three at a quarter, rounded up
    expect(days(film({ rig: 'handheld' }).p)).toBe(base);
    // With no rehearsal set at all, the rig's day is still on the list.
    const bare = film({ rig: 'moving' }).p;
    bare.schedule.rehearsalDays = 0;
    expect(days(bare)).toBe(1);
  });

  it('a rig widens or narrows how a take\'s technical side varies: no rig moves its centre', () => {
    const tech = (rig: Rig) => {
      const { s, p } = film({ rig, hire: RIGS[rig].role ? [RIGS[rig].role!] : [] });
      p.takesModel = true;
      p.shotPlans![interior(p).id] = { rig, takes: 'many' };
      const all: number[] = [];
      for (let i = 0; i < 400; i++) all.push(...recordTakes(s.seed, p, interior(p), `2026-03-${String(i).padStart(3, '0')}`, 60).takes.map((t) => t.tech));
      const mean = all.reduce((a, x) => a + x, 0) / all.length;
      return { mean, sd: Math.sqrt(all.reduce((a, x) => a + (x - mean) ** 2, 0) / all.length) };
    };
    const [sticks, handheld, dolly] = [tech('sticks'), tech('handheld'), tech('dolly')];
    expect(takeSpread(film({ rig: 'handheld' }).p, interior(film().p))).toBe(1.4);
    expect(handheld.sd).toBeGreaterThan(sticks.sd * 1.2);
    expect(dolly.sd).toBeLessThan(sticks.sd);
    for (const x of [handheld, dolly]) expect(Math.abs(x.mean - sticks.mean)).toBeLessThan(0.8);
  });
});

describe('the light', () => {
  it('practical and available light: interiors reset sooner and need no gaffer, a take more is planned, after a day of tests', () => {
    const { p } = film({ light: 'available' });
    expect(craftTime(p, interior(p))).toEqual({ reset: LIGHTS.available.reset, run: 1, extraTakes: 1 });
    expect(craftTime(p, dayExt(p))).toEqual({ reset: 1, run: 1, extraTakes: 0 }); // a day exterior has no lighting to save
    expect(planTime(p, interior(p))).toBeCloseTo(2 * (SETUP_RESET * 0.8 + TAKE_RUN * 3), 10);
    expect(task(p, 'prep:camera-test')).toMatchObject({ units: 1, roleId: 'dop' });
    // The night exterior still needs a gaffer; take it away and the film needs none.
    expect(roles(p)).toContain('gaffer');
    const { s, p: q } = film({ light: 'available' });
    q.scenes[1].heading.time = 'DAY';
    approve(s, q);
    expect(roles(q)).not.toContain('gaffer');
    expect(roles(film().p)).toContain('gaffer');
  });

  it('high contrast: slower on lit scenes, a longer grade, two days of tests, and no change to a day exterior', () => {
    const { p } = film({ light: 'contrast' });
    expect(craftTime(p, interior(p)).reset).toBe(1.25);
    expect(craftTime(p, dayExt(p)).reset).toBe(1);
    expect(task(p, 'prep:camera-test')!.units).toBe(2);
    // Twelve minutes grade in a day either way (a day at least); forty minutes show the half more.
    expect(postFactors(p).grade).toBe(1.5);
    const long = (light?: Light) => { const f = film({ light }); f.p.scenes[0].estMinutes = 40; approve(f.s, f.p); return units({ ...f.p, tasks: buildTasks(f.p) } as Project, 'post:color'); };
    expect(long('contrast')).toBeCloseTo(long() * 1.5, 1);
    expect(units(p, 'post:music')).toBe(units(film().p, 'post:music'));
  });

  it('macro on miniatures is for stop motion: two more stage days and fewer frames a day; it asks nothing of a live film', () => {
    const live = film({ light: 'macro' }).p;
    expect(task(live, 'prep:camera-test')).toBeUndefined();
    expect(live.tasks.map((t) => [t.id, t.units])).toEqual(film().p.tasks.map((t) => [t.id, t.units]));
    const sm = film({ light: 'macro', medium: 'animation' }).p;
    const plain = film({ medium: 'animation' }).p;
    expect(task(sm, 'sm:stages')!.units - task(plain, 'sm:stages')!.units).toBe(2);
    expect(units(sm, 'sm:animation')).toBeCloseTo(units(plain, 'sm:animation') / LIGHTS.macro.frames, 0);
    expect(units(sm, 'sm:animation')).toBeGreaterThan(units(plain, 'sm:animation'));
  });
});

describe('the sound and the score', () => {
  it('each sound choice moves its own work and no other', () => {
    const base = film().p;
    const of = (sound: SoundChoice[], v: Variant = {}) => film({ sound, ...v }).p;
    const texture = of(['texture']);
    expect(task(texture, 'prep:wildtrack')).toMatchObject({ units: 1, roleId: 'sound-mixer' });
    expect(units(texture, 'post:sound')).toBeLessThanOrEqual(units(base, 'post:sound'));
    expect(postFactors(texture)).toMatchObject({ effects: 0.7, foley: 1, score: 1, mix: 1 });
    const sparse = of(['sparse']);
    expect(postFactors(sparse)).toEqual({ foley: 1.5, effects: 1, score: 0.6, mix: 1.2, grade: 1 });
    const crowd = of(['crowd']);
    expect(task(crowd, 'post:loop-group')).toMatchObject({ units: 1, material: LOOP_GROUP_SESSION });
    expect(materialCost(task(crowd, 'post:loop-group')!)).toBe(LOOP_GROUP_SESSION);
    expect(crowd.tasks.find((t) => t.kind === 'post:mix')!.dependsOn).toContain('post:loop-group:1');
    const creature = of(['creature'], { creature: true });
    expect(units(creature, 'post:foley') - units(film({ creature: true }).p, 'post:foley')).toBe(2);
    expect(units(of(['creature']), 'post:foley')).toBe(units(base, 'post:foley')); // no creature in the script, nothing to record
    // Choices combine by multiplying, each on its own line.
    expect(postFactors(of(['sparse', 'texture', 'crowd']))).toEqual({ foley: 1.5, effects: 0.7, score: 0.6, mix: 1.2 * 1.1, grade: 1 });
    expect(SOUNDS.clarity.role).toBe('boom-operator');
  });

  it('dialogue clarity: a boom operator is required, dialogue scenes reset a little slower, and a compromised day\'s dialogue holds', () => {
    const none = film({ sound: ['clarity'], hire: ['sound-mixer'] }).p;
    const boomed = film({ sound: ['clarity'], hire: ['sound-mixer', 'boom-operator'] }).p;
    const plain = film({ hire: ['sound-mixer'] }).p;
    for (const q of [none, boomed, plain]) q.takesModel = true;
    expect(roles(none)).toContain('boom-operator');
    expect(roles(plain)).not.toContain('boom-operator');
    expect(craftTime(boomed, interior(boomed)).reset).toBe(1.05);
    expect(craftTime(boomed, night(boomed)).reset).toBe(1); // no dialogue, nothing to quiet the set for
    expect(needsDialogueReplacement(plain, interior(plain), true)).toBe(true);
    expect(needsDialogueReplacement(boomed, interior(boomed), true)).toBe(false);
    expect(needsDialogueReplacement(none, interior(none), true)).toBe(true); // chosen, and nobody hired to do it
    expect(needsDialogueReplacement(boomed, interior(boomed), false)).toBe(false);
  });

  it('a score with players is recorded in sessions that cost money and hold the mix; an electronic one is the composer alone', () => {
    const chamber = film({ score: 'chamber' }).p;
    const sessions = task(chamber, 'post:score-session')!;
    expect(sessions).toMatchObject({ units: 1, material: SCORES.chamber.session, roleId: 'composer' });
    expect(chamber.tasks.find((t) => t.kind === 'post:mix')!.dependsOn).toContain('post:score-session:1');
    expect(task(film({ score: 'synth' }).p, 'post:score-session')).toBeUndefined();
    expect(units(film({ score: 'synth' }).p, 'post:music')).toBe(units(film().p, 'post:music'));
    const perc = film({ score: 'percussive' }).p;
    expect(units(perc, 'post:music')).toBeCloseTo(units(film().p, 'post:music') * 1.2, 10);
    expect(task(perc, 'post:score-session')!.material).toBe(SCORES.percussive.session);
  });
});
