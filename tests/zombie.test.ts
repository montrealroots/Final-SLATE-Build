// The package's worked example (docs/creative-depth/package/example-project.json, 02-CREATIVE-LIBRARIES.md "Worked
// acceptance example"): Last Shift In Briar Hollow, a 1986 zombie film made in 2026, built from ideas the way a player
// would build it, then compared against the same film with one choice changed, and run to delivery. An acceptance
// fixture: the names are made up, and nothing here is a real work.
import { describe, expect, it } from 'vitest';
import { approvedCharacters, approvedScenes, buildTasks, costBreakdown, createProject, groupShootDays, ledgerTotals, neededRoles } from './engine-api';
import { applyIdea, type Target } from '../src/engine/brief';
import { callSheet } from '../src/engine/callsheet';
import { competesAs } from '../src/engine/script-effects';
import { ideaById } from '../src/ideas';
import type { GameState, Project, Task } from '../src/engine/types';
import { agreedFunding, approve, castAll, runDays, staffAll, startLife, startProduction, summary, writePitch } from './helpers';

interface Variant { year?: 'present'; crowd?: 'digital'; medium?: 'stop-motion' }
/** The example, applied idea by idea. `v` changes exactly one choice. */
function briarHollow(v: Variant = {}, seed = 'briar-hollow'): { s: GameState; p: Project } {
  const s = startLife(seed);
  const p = createProject(s, { title: 'Last Shift In Briar Hollow', scenarioId: 'low', axes: { format: 'feature', medium: 'live-action' } });
  writePitch(p);
  const pick = (id: string, t: Target = {}) => applyIdea(s, p, ideaById(id)!, t);
  if (v.medium) pick('production_medium.005');
  pick('blend.horror-comedy');
  pick(v.year === 'present' ? 'period.present' : 'period.1980s');
  pick('style.1980s');
  pick('premise.001', { beats: [0, 1, 2, 3, 4] });
  pick('creature_rule.001');
  pick('ending_route.006');
  pick('sound_treatment.005');
  const id = (name: string) => p.characters.find((c) => c.name === name)!.id;
  pick('makeup_method.003', { characterIds: [id('The Returned')] });
  pick('wardrobe_strategy.003', { characterIds: [id('June Okafor'), id('Dale Whitlock')] });
  if (v.crowd) pick('crowd.digital', { sceneIds: p.scenes.filter((x) => x.crowd > 0).map((x) => x.id) });
  approve(s, p);
  agreedFunding(p, 1_500_000);
  return { s, p };
}
const tasks = (p: Project) => new Map(buildTasks(p).map((t) => [t.id, t]));
/** Tasks that differ between two builds, by ID: added, gone, or changed in units, materials or what they wait on. */
function diff(a: Project, b: Project): { added: string[]; gone: string[]; changed: string[] } {
  const ta = tasks(a), tb = tasks(b);
  const key = (t: Task) => JSON.stringify([t.units, t.material ?? null, t.roleId, [...t.dependsOn].sort()]);
  return {
    added: [...tb.keys()].filter((k) => !ta.has(k)).map((k) => tb.get(k)!.kind).sort(),
    gone: [...ta.keys()].filter((k) => !tb.has(k)).map((k) => ta.get(k)!.kind).sort(),
    changed: [...ta.keys()].filter((k) => tb.has(k) && key(ta.get(k)!) !== key(tb.get(k)!)).map((k) => ta.get(k)!.kind).sort(),
  };
}
const kinds = (p: Project) => [...new Set(buildTasks(p).map((t) => t.kind))].sort();

describe('Last Shift In Briar Hollow, as chosen', () => {
  const { s, p } = briarHollow();

  it('is the brief the example asks for: its words, its genres, its year, and scenes only where they were ticked', () => {
    expect(p.story.logline).toBe("When the dead return during Briar Hollow's overnight shift, the dispatcher June Okafor and a stranded repair crew must restore the emergency transmitter before dawn divides the survivors for good.");
    expect(p.axes.genres).toEqual([{ id: 'horror', emphasis: 'primary' }, { id: 'comedy', emphasis: 'secondary' }]);
    // A secondary comedy genre doesn't make it a comedy for awards that split the two.
    expect(competesAs(p)).toBe('drama');
    expect([p.axes.storyYear, p.axes.styleEra, new Date(p.createdAt).getUTCFullYear()]).toEqual([1986, 'The 1980s', 2026]);
    expect(p.scenes.map((x) => `${x.heading.place} ${x.heading.time}`)).toEqual(['Dispatch Office NIGHT', 'Workshop NIGHT', 'Main Street NIGHT', 'Transmitter Shed NIGHT', 'Main Street DAWN']);
    expect(p.worldRules.map((r) => r.rule)).toEqual(['The returned move slowly and never stop.']);
    expect(p.story.ending).toMatch(/^Collective Solution:/);
    expect(p.brief!.picks.map((k) => k.id)).toEqual(['blend.horror-comedy', 'period.1980s', 'style.1980s', 'premise.001', 'creature_rule.001', 'ending_route.006', 'sound_treatment.005', 'makeup_method.003', 'wardrobe_strategy.003']);
  });

  it('makes the work the example lists: period wardrobe and fittings, appliance tests and builds, extras in one scene, a score', () => {
    const t = tasks(p);
    const id = (name: string) => approvedCharacters(p).find((c) => c.name === name)!.id;
    // Period wardrobe: built for each lead, then fitted, after the period is researched.
    for (const name of ['June Okafor', 'Dale Whitlock']) {
      expect(t.get(`prep:wardrobe:${id(name)}`), name).toMatchObject({ units: 5, material: 1400, dependsOn: ['prep:research:period'] });
      expect(t.get(`prep:fitting:${id(name)}`), name).toMatchObject({ units: 3 });
    }
    // Creature appliances: built, then tested, by the prosthetics designer, who is then required.
    expect(t.get(`prep:appliances:${id('The Returned')}`)).toMatchObject({ units: 8, material: 7200, roleId: 'prosthetics' });
    expect(t.get(`prep:makeup-test:${id('The Returned')}`)).toMatchObject({ units: 3 });
    expect(neededRoles(p, s).find((r) => r.roleId === 'prosthetics')).toMatchObject({ required: true });
    // The creature is made that way and no other: no second creature build.
    expect(kinds(p)).not.toContain('prep:creature');
    // Extras only in the one scene that was given them, made up at a background performer's share.
    expect(p.requirements.filter((r) => r.kind === 'crowd').map((r) => `${r.label} x${r.qty}`)).toEqual(['Main Street x12']);
    expect(p.requirements.filter((r) => r.kind === 'makeup').map((r) => `${r.label} x${r.qty}`).sort()).toEqual(['Background: Main Street x12', 'The Returned x1']);
    // An original score is commissioned, as for any film. The electronic palette is the composer alone: it books no
    // recording session, where an ensemble would (craft.ts; until November 11, 2026 the palette was a note).
    expect(t.get('post:music:1')).toMatchObject({ roleId: 'composer' });
    expect(ideaById('sound_treatment.005')).toMatchObject({ kind: 'mechanical', field: 'score' });
    expect([...t.keys()].filter((k) => k.startsWith('post:score-session'))).toEqual([]);
  });

  it('schedules the night scenes at night where it is based, with the creature in the chair hours before call', () => {
    castAll(s, p);
    staffAll(s, p);
    runDays(s, p, 40);
    startProduction(s, p);
    const street = p.schedule.days.find((d) => d.locationLabel === 'Main Street' && d.night)!;
    const sheet = callSheet(s, p, street.id);
    expect(sheet.call).toBe('5:00 PM');
    expect(sheet.where).toBe('Main Street, exterior, night');
    expect(sheet.notes.some((n) => /^Sunrise .* sunset /.test(n))).toBe(true);
    expect(sheet.notes.find((n) => n.startsWith('Makeup'))).toMatch(/The Returned \(full creature appliances\), the background performers/);
    expect(sheet.notes).toContain('12 background performers.');
    // The dawn scene on the same street is its own day: a night shoot and a dawn one don't share a call.
    expect(p.schedule.days.filter((d) => d.locationLabel === 'Main Street').length).toBeGreaterThan(1);
  });

  it('is shot, finished and delivered, with every cost paid once', () => {
    runDays(s, p, 500);
    expect(summary(p)).toMatchObject({ delivered: true });
    const keys = p.obligations.flatMap((o) => o.postings.map((x) => x.key)).filter(Boolean);
    expect(new Set(keys).size).toBe(keys.length);
    for (const t of p.tasks.filter((x) => ['prep:wardrobe', 'prep:fitting', 'prep:appliances', 'prep:makeup-test'].includes(x.kind))) expect(t.status, t.label).toBe('done');
    expect(keys.some((k) => k.startsWith('makeup:'))).toBe(true);
    expect(keys.filter((k) => k.startsWith('crowd:')).length).toBeGreaterThan(0);
    // Money is conserved: what was spent is what the ledger settled, and no more than came in.
    const totals = ledgerTotals(p);
    expect(totals.settled).toBeLessThanOrEqual(totals.fund);
    expect(p.credits.length).toBeGreaterThan(5);
  }, 120_000);
});

describe('the same film with one choice changed', () => {
  const base = briarHollow();

  it('changing one choice changes its own consumers and nothing else', () => {
    // Set in the present day instead of 1986: the period goes, and the creature stays exactly as it was.
    const present = briarHollow({ year: 'present' });
    const d = diff(base.p, present.p);
    expect(d.added).toEqual([]);
    expect(d.gone).toEqual(['prep:research']);
    // Costumes and design no longer wait on research. The two built costumes are the same size, since a built costume
    // is made to the period either way; the creature's own clothes, on the shared costume task, take a third less.
    expect(d.changed).toEqual(['prep:costume', 'prep:design', 'prep:wardrobe', 'prep:wardrobe']);
    const tb = tasks(base.p), tp = tasks(present.p);
    for (const [id, t] of tb) if (t.kind === 'prep:wardrobe') expect([tp.get(id)!.units, tp.get(id)!.material]).toEqual([t.units, t.material]);
    expect(tb.get('prep:costume:all')!.units).toBe(tp.get('prep:costume:all')!.units * 1.5);
    const makeupTasks = (p: Project) => buildTasks(p).filter((t) => t.kind === 'prep:appliances' || t.kind === 'prep:makeup-test').map((t) => [t.kind, t.units, t.material ?? null]);
    expect(makeupTasks(present.p)).toEqual(makeupTasks(base.p));
    expect(present.p.requirements.some((r) => r.kind === 'period-research')).toBe(false);
    expect(base.p.requirements.some((r) => r.kind === 'period-research')).toBe(true);
    expect(groupShootDays(present.p, present.s).length).toBe(groupShootDays(base.p, base.s).length);

    // The crowd extended in post: fewer people on set that night, plates, and effects work after the lock.
    const digital = briarHollow({ crowd: 'digital' });
    const c = diff(base.p, digital.p);
    expect(c.added).toEqual(['post:crowd']);
    expect(c.gone).toEqual([]);
    expect(c.changed).toEqual(['post:color']); // the grade now waits for the crowd shots
    expect(digital.p.requirements.find((r) => r.kind === 'crowd')).toMatchObject({ qty: 8 });
    expect(digital.p.requirements.find((r) => r.kind === 'makeup' && r.label.startsWith('Background'))).toMatchObject({ qty: 8 });
    const crowdCost = (x: { s: GameState; p: Project }) => costBreakdown(x.s, x.p).toCome.filter((l) => /^Background performers/.test(l.label)).reduce((a, l) => a + l.amount, 0);
    expect(crowdCost(digital)).toBeLessThan(crowdCost(base));
    // The other four scenes are scheduled as before.
    const others = (x: { s: GameState; p: Project }) => groupShootDays(x.p, x.s).filter((g) => g.place !== 'Main Street').map((g) => [g.place, g.sceneIds.length, g.load]);
    expect(others(digital)).toEqual(others(base));
  });

  it('made as stop motion: puppets and animators, voices kept, and no makeup chair', () => {
    const puppets = briarHollow({ medium: 'stop-motion' });
    const k = kinds(puppets.p);
    for (const kind of ['sm:armature', 'sm:puppet', 'sm:costume', 'sm:sets', 'sm:animation', 'anim:voice']) expect(k, kind).toContain(kind);
    // Nothing of the live shoot's makeup, costume or crowd work survives into the puppet film.
    for (const kind of ['prep:appliances', 'prep:makeup-test', 'prep:wardrobe', 'prep:fitting', 'prep:costume', 'prep:creature', 'prep:locations', 'post:crowd']) expect(k, kind).not.toContain(kind);
    expect(puppets.p.requirements.some((r) => r.kind === 'makeup' || r.kind === 'costume' || r.kind === 'location')).toBe(false);
    expect(neededRoles(puppets.p, puppets.s).some((r) => r.roleId === 'hair-makeup' || r.roleId === 'prosthetics')).toBe(false);
    expect(groupShootDays(puppets.p, puppets.s)).toEqual([]);
    // The parts are still cast, as voices; each speaking part has a recording session.
    const voiced = approvedCharacters(puppets.p).filter((c) => c.methods.includes('voice'));
    expect(voiced.map((c) => c.name)).toEqual(expect.arrayContaining(['June Okafor', 'Dale Whitlock']));
    expect(buildTasks(puppets.p).filter((t) => t.kind === 'anim:voice').length).toBe(voiced.filter((c) => c.roleSize !== 'background' && approvedScenes(puppets.p).some((sc) => sc.participants.includes(c.id))).length);
    // The words are the same film.
    expect(puppets.p.story.logline).toBe(base.p.story.logline);
    // The crowd is animated, not hired: no background performers are paid.
    expect(costBreakdown(puppets.s, puppets.p).toCome.some((l) => /^Background performers/.test(l.label))).toBe(false);
  });
});
