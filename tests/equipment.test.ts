// Your equipment and a project's kit (engine/equipment.ts; the v4 package, 02; ledger V4-016.02, V4-018, V4-019).
// Each comparison changes one thing: whether the project has a kit, what is in it, or what the day's scenes need.
import { describe, expect, it } from 'vitest';
import { GEAR, GEAR_SOURCE, RENT_LEAST, RENT_SHARE, SERVICE_BELOW, gearById, rentDayRate } from '../src/engine/gear-catalog';
import { addToKit, buyGear, buyRefusal, dayKitProblems, kitAddRefusal, kitClash, kitProblems, lentValue, removeFromKit, resaleValue, sellGear, sellRefusal, serviceCost, serviceGear, serviceRefusal } from '../src/engine/equipment';
import { personalBalance, personalStatement } from '../src/engine/personal';
import { dayFees, housePackageFee } from '../src/engine/production/rates';
import { rigDayCost } from '../src/engine/craft';
import { approvedScenes, deserialize, serialize } from './engine-api';
import { validateDraft } from '../src/engine/state';
import type { CreationDraft, GameState, Project } from '../src/engine/types';
import { approve, buildProject, castAll, runDays, staffAll, startLife, startProduction, summary } from './helpers';
import { draft } from './fixtures';

const rich = (tag: string, over: Partial<CreationDraft> = {}) => startLife(tag, 'gb-london', { savings: 25_000, family: { circumstances: 'wealthy', support: 'gift', amount: 100_000 }, ...over });
/** A short: an office interior with dialogue, and a day exterior. */
function short(s: GameState, title = 'Kit Fixture'): Project {
  const p = buildProject(s, { title, format: 'short', medium: 'live-action' }, [{ name: 'Wren' }], [{ place: 'Office', chars: ['Wren'] }, { place: 'Quay', intExt: 'EXT', chars: ['Wren'] }]);
  p.scenes[0].dialogue = [{ id: 'l1', characterId: p.characters[0].id, text: 'Is the line open?' }] as Project['scenes'][number]['dialogue'];
  approve(s, p);
  return p;
}
const own = (s: GameState, p: Project, ids: string[]) => ids.forEach((id) => addToKit(s, p, { itemId: buyGear(s, id).id }));
/** Everything this short needs, for the Pocket 4K. */
const FULL = ['bmpcc-4k', 'lumix-12-35', 'sd-uhs2-256', 'halo-100x', 'stand-300f', 'videomic-ntg', 'befree-video'];

describe('the shop', () => {
  it('sells only what has a recorded price, from a dated source, with its specifications\' source', () => {
    expect(GEAR_SOURCE).toMatchObject({ currency: 'USD', retrieved: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) });
    for (const g of GEAR) {
      expect(g.specFrom).toBeTruthy();
      expect(g.price === null).toBe(g.priceFrom === null);
    }
    expect(rentDayRate(gearById('bmpcc-4k')!)).toBe(Math.round(1139 * RENT_SHARE));
    expect(rentDayRate(gearById('stand-300f')!)).toBe(RENT_LEAST);
    const s = rich('shop');
    const unpriced = { ...gearById('stand-300f')!, id: 'fixture-unpriced', price: null, priceFrom: null };
    GEAR.push(unpriced); // labelled fixture: an item the retailer no longer lists
    try { expect(buyRefusal(s, 'fixture-unpriced')).toBe('No price is recorded for this, so it isn\'t sold.'); } finally { GEAR.pop(); }
  });

  it('buys from your own account only, and only what it holds', () => {
    const s = startLife('poor', 'gb-london', { savings: 1_000 });
    expect(buyRefusal(s, 'bmpcc-4k')).toBe('It costs $1,139 and you have $1,000 in your own account.');
    const it = buyGear(s, 'stand-300f');
    expect(it).toMatchObject({ owner: 'you', paid: 43, condition: 100 });
    expect(personalBalance(s)).toBe(957);
    expect(personalStatement(s)).toContainEqual({ kind: 'equipment', total: -43 });
    const old = startLife('old');
    delete old.money; // labelled fixture: a story from before your own money
    expect(buyRefusal(old, 'stand-300f')).toMatch(/^This story began before your own money/);
  });
});

describe('a kit of your own', () => {
  it('replaces the rental house package: owned items cost nothing to use, rentals their day rate', () => {
    const s = rich('fees');
    const p = short(s);
    expect(dayFees(p).equipment).toBe(housePackageFee(p));
    own(s, p, ['bmpcc-4k']);
    expect(dayFees(p).equipment).toBe(0);
    addToKit(s, p, { gearId: 'lumix-12-35' });
    expect(dayFees(p).equipment).toBe(rentDayRate(gearById('lumix-12-35')!));
    for (const k of [...p.kit!.items]) removeFromKit(p, k.id);
    expect(p.kit).toBeUndefined();
    expect(dayFees(p).equipment).toBe(housePackageFee(p));
  });

  it('checks what fits: mount, card, battery, and says what in the shop would fix it', () => {
    const s = rich('fit');
    const p = short(s);
    own(s, p, ['bmpcc-4k', 'canon-ef-50-18', 'cfx-b-256']);
    const needs = kitProblems(p).map((x) => x.need);
    expect(needs).toEqual(expect.arrayContaining(['lens', 'media']));
    expect(needs).not.toContain('battery'); // the Pocket 4K comes with one
    expect(kitProblems(p).find((x) => x.need === 'lens')!.fix).toEqual(['lumix-12-35']);
    expect(kitProblems(p).find((x) => x.need === 'media')!.fix.sort()).toEqual(['cfast-256', 'sd-uhs2-256']);
    // A camera without a battery in the box needs one of its type.
    const q = short(s, 'Pyxis Fixture');
    own(s, q, ['pyxis-6k-ef']);
    expect(kitProblems(q).find((x) => x.need === 'battery')!.fix).toEqual(['bp-u35']);
    expect(kitAddRefusal(s, q, { gearId: 'bmpcc-6k-g2' })).toMatch(/^This kit has a camera/);
  });

  it('asks lights only for scenes lit as usual, stands for the lights, a microphone for dialogue, a tripod for tripod scenes', () => {
    const s = rich('needs');
    const p = short(s);
    own(s, p, ['bmpcc-4k', 'lumix-12-35', 'sd-uhs2-256']);
    expect(kitProblems(p).map((x) => x.need).sort()).toEqual(['light', 'microphone', 'tripod']);
    p.axes.light = 'available'; // one input changed: practical and available light
    expect(kitProblems(p).map((x) => x.need)).not.toContain('light');
    p.axes.light = 'standard';
    own(s, p, ['halo-100x']);
    expect(kitProblems(p).map((x) => x.need)).toContain('stand');
    own(s, p, ['stand-300f', 'videomic-ntg', 'befree-video']);
    expect(kitProblems(p)).toEqual([]);
    // Dialogue Clarity booms every dialogue scene: a shotgun on a pole.
    p.axes.sound = ['clarity'];
    expect(kitProblems(p).map((x) => x.need).sort()).toEqual(['boom', 'shotgun']);
    own(s, p, ['mke-600', 'boompole']);
    expect(kitProblems(p)).toEqual([]);
    // Inputs: the Pocket 4K has two; a third microphone needs a recorder.
    addToKit(s, p, { gearId: 'mke-600' });
    expect(kitProblems(p).map((x) => x.need)).toEqual(['inputs']);
    own(s, p, ['zoom-f3']);
    expect(kitProblems(p)).toEqual([]);
  });

  it('follows the method: an animated project shoots nothing and takes no kit; a hybrid does', () => {
    const s = rich('method');
    const anim = buildProject(s, { title: 'Drawn', format: 'short', medium: 'animation', technique: '2d-drawn' }, [{ name: 'Wren' }], [{ place: 'Office', chars: ['Wren'] }]);
    expect(kitAddRefusal(s, anim, { gearId: 'bmpcc-4k' })).toBe('An animated project has no shoot days: it needs no camera kit.');
    const hybrid = buildProject(s, { title: 'Both', format: 'short', medium: 'hybrid', technique: '3d-cg' }, [{ name: 'Wren' }], [{ place: 'Office', chars: ['Wren'] }]);
    expect(kitAddRefusal(s, hybrid, { gearId: 'bmpcc-4k' })).toBeNull();
  });

  it('a stabilizer in the kit replaces the one rented for long moving takes', () => {
    const s = rich('gimbal');
    const p = short(s);
    p.shotPlans = Object.fromEntries(p.scenes.map((sc) => [sc.id, { rig: 'moving' as const }]));
    expect(rigDayCost(p, approvedScenes(p))).toBe(450);
    own(s, p, ['rs4-pro']);
    expect(rigDayCost(p, approvedScenes(p))).toBe(0);
    expect(rigDayCost(p, approvedScenes(p), false)).toBe(450); // a day the kit doesn't serve
  });
});

describe('shooting on the kit', () => {
  const made = (tag: string, kit: string[] | null) => {
    const s = rich(tag);
    const p = short(s);
    if (kit) own(s, p, kit);
    castAll(s, p);
    staffAll(s, p);
    runDays(s, p, 30);
    startProduction(s, p);
    runDays(s, p, 200);
    const eq = p.obligations.flatMap((o) => o.postings).filter((x) => x.kind === 'settle' && x.key.startsWith('eq:'));
    return { s, p, eq };
  };

  it('a complete kit of your own pays no equipment day fee and wears; without one, each day pays the house package', () => {
    const house = made('house', null);
    const mine = made('mine', FULL);
    expect(summary(house.p).delivered).toBe(true);
    expect(summary(mine.p).delivered).toBe(true);
    const shot = (p: Project) => p.schedule.days.filter((d) => d.status === 'shot' || d.status === 'partial').length;
    const ran = (p: Project) => p.schedule.days.filter((d) => ['shot', 'partial', 'lost'].includes(d.status)).length;
    expect(house.eq.length).toBe(ran(house.p)); // a day lost to rain was still paid for, as before
    expect(house.eq.every((x) => x.amount === housePackageFee(house.p))).toBe(true);
    expect(mine.eq).toEqual([]);
    const cam = mine.s.gear!.items.find((x) => x.gearId === 'bmpcc-4k')!;
    expect(cam.condition).toBe(100 - shot(mine.p));
  }, 60_000);

  it('a day the kit can\'t serve hires the house package for that day, and says why', () => {
    const { s, p, eq } = made('short-kit', FULL.filter((id) => id !== 'videomic-ntg'));
    const talkDay = p.schedule.days.find((d) => d.sceneIds.includes(p.scenes[0].id))!;
    expect(eq.find((x) => x.key === `eq:${talkDay.id}`)!.amount).toBe(housePackageFee(p));
    expect(s.log.some((l) => l.text.includes("your kit couldn't serve") && l.text.includes('Scenes have dialogue, and the kit has no microphone.'))).toBe(true);
    const quiet = p.schedule.days.filter((d) => d.id !== talkDay.id && d.status === 'shot');
    for (const d of quiet) expect(eq.find((x) => x.key === `eq:${d.id}`)).toBeUndefined();
  }, 60_000);
});

describe('one item, one shoot at a time', () => {
  it('refuses a schedule or a kit that would put an owned item on two shoots the same date', () => {
    const s = rich('clash');
    const a = short(s, 'First Short');
    const b = short(s, 'Second Short');
    const cam = buyGear(s, 'bmpcc-4k');
    addToKit(s, a, { itemId: cam.id });
    a.schedule.days.push({ id: 'd-fixture', date: '2026-03-02', episode: 1, sceneIds: [], locationLabel: 'Office', interior: true, night: false, status: 'scheduled', playerActing: false, conflicts: [] }); // labelled fixture: a's shoot day
    b.schedule.days.push({ id: 'd-fixture-b', date: '2026-03-02', episode: 1, sceneIds: [], locationLabel: 'Office', interior: true, night: false, status: 'scheduled', playerActing: false, conflicts: [] });
    expect(kitAddRefusal(s, b, { itemId: cam.id })).toBe('Blackmagic Pocket Cinema Camera 4K is booked for First Short on 2026-03-02.');
    b.schedule.days = [];
    addToKit(s, b, { itemId: cam.id }); // no shoot dates yet: allowed
    expect(kitClash(s, b, ['2026-03-03'])).toBeNull();
    expect(kitClash(s, b, ['2026-03-02'])).toMatch(/^Blackmagic Pocket Cinema Camera 4K is booked for First Short on 2026-03-02\. One item can't be on two shoots at once/);
    // On the day itself, an item booked elsewhere is a reason the kit can't serve it.
    const d = { ...a.schedule.days[0], id: 'd-b', date: '2026-03-02' };
    expect(dayKitProblems(s, b, d, s.now).map((x) => x.need)).toContain('booked');
  });

  it('a real schedule that would put the camera on two shoots the same days is refused, and changes nothing', () => {
    const s = rich('clash-plan');
    const a = short(s, 'First Short');
    const b = short(s, 'Second Short');
    const cam = buyGear(s, 'bmpcc-4k');
    addToKit(s, a, { itemId: cam.id });
    addToKit(s, b, { itemId: cam.id }); // neither is scheduled yet
    startProduction(s, a);
    const before = JSON.stringify(b.tasks);
    expect(() => startProduction(s, b)).toThrow(/^Blackmagic Pocket Cinema Camera 4K is booked for First Short on \d{4}-\d{2}-\d{2}\. One item can't be on two shoots at once/);
    expect(b.schedule.days).toEqual([]);
    expect(JSON.stringify(b.tasks)).toBe(before);
  });
});

describe('wear, servicing and selling', () => {
  it('a worn item is serviced for a share of its price and is away for days; sold, it brings back half its price less wear', () => {
    const s = rich('wear');
    const p = short(s);
    const it = buyGear(s, 'halo-100x');
    it.condition = SERVICE_BELOW - 1; // labelled fixture: fifty-odd shoot days of wear
    addToKit(s, p, { itemId: it.id });
    const d = { id: 'd-w', date: '2026-03-02', episode: 1, sceneIds: [], locationLabel: 'Office', interior: true, night: false, status: 'scheduled' as const, playerActing: false, conflicts: [] };
    expect(dayKitProblems(s, p, d, s.now).map((x) => x.need)).toContain('worn');
    const before = personalBalance(s);
    const cost = serviceCost(it);
    expect(cost).toBe(Math.round(169 * 0.25 * 51 / 100));
    serviceGear(s, it.id);
    expect(personalBalance(s)).toBe(before - cost);
    expect(dayKitProblems(s, p, d, s.now).map((x) => x.need)).toContain('away');
    expect(serviceRefusal(s, it.id)).toBe('It\'s already away being serviced.');
    expect(sellRefusal(s, it.id)).toBe('It\'s in the kit for Kit Fixture. Take it out first.');
    removeFromKit(p, p.kit!.items[0].id);
    it.condition = 80; // labelled fixture
    const value = resaleValue(it);
    expect(value).toBe(Math.round(169 * 0.5 * 0.8));
    expect(sellGear(s, it.id)).toBe(value);
    expect(personalStatement(s)).toContainEqual({ kind: 'equipment-sale', total: value });
    expect(personalStatement(s).reduce((a, x) => a + x.total, 0)).toBe(personalBalance(s)); // the statement is the whole account
    expect(sellRefusal(s, it.id)).toBe('You don\'t have that.');
  });
});

describe('equipment your family lends', () => {
  it('is bounded by their circumstances, costs nothing, moves no money, and can\'t be sold', () => {
    const lend = ['bmpcc-4k', 'lumix-12-35', 'sd-uhs2-256'];
    const dear = ['pyxis-12k-l', 'sigma-24-70-l'];
    expect(validateDraft({ ...draft(), family: { circumstances: 'getting-by', support: 'equipment', amount: lentValue(dear), gear: dear } }).map((x) => x.message)).toContain('A getting by family could offer at most $3,000.');
    const s = startLife('lent', 'gb-london', { family: { circumstances: 'comfortable', support: 'equipment', amount: lentValue(lend), gear: lend } });
    expect(personalBalance(s)).toBe(0);
    expect(s.gear!.items.map((x) => [x.gearId, x.owner, x.paid])).toEqual(lend.map((id) => [id, 'family', 0]));
    expect(sellRefusal(s, s.gear!.items[0].id)).toBe('Your family lent you this; it isn\'t yours to sell.');
    expect(validateDraft({ ...draft(), family: { circumstances: 'comfortable', support: 'equipment', amount: 0, gear: [] } }).map((x) => x.message)).toContain('Choose what your family lends.');
  });
});

describe('saving', () => {
  it('keeps your equipment and a project\'s kit; a save from before has neither, and hires the house package as it did', () => {
    const s = rich('save');
    const p = short(s);
    own(s, p, ['bmpcc-4k']);
    addToKit(s, p, { gearId: 'lumix-12-35' });
    const back = deserialize(serialize(s));
    expect(back.gear).toEqual(s.gear);
    expect(back.projects[0].kit).toEqual(p.kit);
    const old = startLife('old-save');
    const q = short(old);
    const reloaded = deserialize(serialize(old));
    expect(reloaded.gear).toBeUndefined();
    expect(dayFees(reloaded.projects.find((x) => x.id === q.id)!).equipment).toBe(housePackageFee(q));
  });
});
