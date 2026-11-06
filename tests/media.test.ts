import { describe, expect, it } from 'vitest';
import {
  DAY, approvedScenes, buildTasks, describeImpact, designChangeImpact, applyDesignChange, ledgerTotals, processUntil, requestConsent, runWorkDay,
  updateCharacter, generatePlan, dateKey, addDaysToKey, deliveryBlockers,
} from './engine-api';
import { approve, buildProject, castAll, manage, runDays, staffAll, startLife, startProduction, summary } from './helpers';
import type { GameState, Project } from '../src/engine/types';

function hireUp(s: GameState, p: Project, days = 12): void {
  castAll(s, p);
  staffAll(s, p);
  for (let i = 0; i < days; i++) {
    manage(s, p);
    processUntil(s, s.now + DAY, 'tick', 100000);
  }
}

describe('2D drawn animation', () => {
  it('follows boards, animatic, voice and animation dependencies', () => {
    const s = startLife('2d');
    const p = buildProject(s, { title: 'Paper Lanterns', format: 'short', medium: 'animation', technique: '2d-drawn', genres: ['fantasy', 'family'], runtime: 6, quality: 'limited' },
      [{ name: 'Mika', patch: { roleSize: 'lead' } }, { name: 'Old Fox', patch: { roleSize: 'supporting', entity: 'animal' } }],
      [{ place: 'Lantern Market', chars: ['Mika', 'Old Fox'], minutes: 1.5 }, { place: 'River', intExt: 'EXT', chars: ['Mika'], minutes: 1 }]);
    approve(s, p);
    const tasks = buildTasks(p);
    const kinds = new Set(tasks.map((t) => t.kind));
    expect([...kinds]).toEqual(expect.arrayContaining(['anim:visdev', 'anim:boards', 'anim:animatic', 'anim:voice', 'anim:backgrounds', 'anim:animation', 'anim:inbetween', 'anim:composite']));
    expect(kinds.has('anim:render')).toBe(false); // drawn 2D has no render farm stage
    const anim = tasks.find((t) => t.kind === 'anim:animation')!;
    expect(anim.dependsOn.some((d) => d.startsWith('anim:voice:'))).toBe(true);
    // No live shoot is fabricated for animation.
    expect(p.requirements.some((r) => r.kind === 'location')).toBe(false);
    hireUp(s, p);
    startProduction(s, p, 3);
    expect(p.schedule.days.length).toBe(0);
    runDays(s, p, 300);
    expect(summary(p).openTasks).toEqual([]);
    expect(p.delivered).not.toBeNull();
    expect(p.credits.filter((c) => c.contribution === 'Voice Cast').length).toBe(2);
  }, 60000);
});

describe('3D CG animation', () => {
  it('cannot animate before rigs exist and uses finite render capacity', () => {
    const s = startLife('3d');
    const p = buildProject(s, { title: 'Orbit Garden', format: 'short', medium: 'animation', technique: '3d-cg', genres: ['romantic-drama'], runtime: 5, quality: 'limited' },
      [{ name: 'Ada', patch: { roleSize: 'lead' } }, { name: 'Unit 7', patch: { roleSize: 'co-lead', entity: 'robot' } }],
      [{ place: 'Greenhouse', chars: ['Ada', 'Unit 7'], minutes: 1 }, { place: 'Airlock', chars: ['Unit 7'], minutes: 1, extra: { vfx: ['Vacuum frost'] } }]);
    approve(s, p);
    hireUp(s, p);
    startProduction(s, p, 2);
    const animTask = p.tasks.find((t) => t.kind === 'anim:animation')!;
    expect(animTask.dependsOn.some((d) => d.startsWith('anim:rig:'))).toBe(true);
    // Run until something renders and check no animation finished before its rigs.
    let sawRenderLimit = false;
    p.schedule.renderNodes = 1;
    for (let i = 0; i < 300 && !p.delivered; i++) {
      manage(s, p);
      processUntil(s, s.now + DAY, 'tick', 100000);
      for (const t of p.tasks.filter((x) => x.kind === 'anim:animation' && x.done > 0)) {
        for (const d of t.dependsOn.filter((x) => x.startsWith('anim:rig:'))) expect(p.tasks.find((x) => x.id === d)?.status).toBe('done');
      }
      if (p.tasks.some((t) => t.kind === 'anim:render' && t.blockedReason === 'All render nodes are busy today.')) sawRenderLimit = true;
      if (i === 40) p.schedule.renderNodes = 20;
    }
    expect(p.delivered).not.toBeNull();
    expect(sawRenderLimit || p.tasks.filter((t) => t.kind === 'anim:render').every((t) => t.workedDays >= 1)).toBe(true);
    expect(p.obligations.some((o) => o.label.startsWith('Render Time'))).toBe(true);
  }, 60000);
});

describe('stop motion', () => {
  it('a puppet cannot serve two stages at once without a duplicate', () => {
    const s = startLife('sm');
    const make = (copies: number) => {
      const p = buildProject(s, { title: `Tin Heart ${copies}`, format: 'short', medium: 'animation', technique: 'stop-motion', genres: ['mystery'], runtime: 4, quality: 'feature' },
        [{ name: 'Pip', patch: { roleSize: 'lead' } }],
        [{ place: 'Attic', chars: ['Pip'], minutes: 1 }, { place: 'Clock Room', chars: ['Pip'], minutes: 1 }]);
      approve(s, p);
      p.schedule.stages = 2;
      p.schedule.puppetCopies[p.characters[0].id] = copies;
      return p;
    };
    const single = make(1);
    const double = make(2);
    for (const p of [single, double]) {
      // Mark everything except animation as done, staff two animators, and run one stage day.
      generatePlan(s, p, addDaysToKey(dateKey(s.now, 'Europe/London'), 1));
      for (const t of p.tasks) if (t.kind !== 'sm:animation') { t.status = 'done'; t.done = t.units; }
      p.cast.push({ characterId: p.characters[0].id, performer: 'player', method: 'voice', note: '' });
      for (let i = 0; i < 2; i++) p.hires.push({ id: `h${i}${p.id}`, personId: `np_stopmo-animator_GB_${i}`, roleId: 'stopmo-animator', kind: 'crew', episodes: 'all', dayRate: 1, estDays: 99, status: 'accepted', offeredAt: 0, responseAt: 0, obligationId: null, daysWorked: 0 });
      runWorkDay(s, p, '2026-01-07');
    }
    const active = (p: Project) => p.tasks.filter((t) => t.kind === 'sm:animation' && t.done > 0).length;
    expect(active(single)).toBe(1);
    expect(single.tasks.find((t) => t.kind === 'sm:animation' && t.done === 0)?.blockedReason).toMatch(/puppets it needs are on another stage/);
    expect(active(double)).toBe(2);
  });

  it('a design change reports its impact and rebuilds only affected work', () => {
    const s = startLife('sm2');
    const p = buildProject(s, { title: 'Wax Moon', format: 'short', medium: 'animation', technique: 'stop-motion', runtime: 4, quality: 'tv' },
      [{ name: 'Moth', patch: { roleSize: 'lead' } }, { name: 'Lamp', patch: { roleSize: 'supporting', entity: 'anthropomorphic-object' } }],
      [{ place: 'Porch', chars: ['Moth'], minutes: 1 }, { place: 'Porch', chars: ['Moth', 'Lamp'], minutes: 1 }, { place: 'Shed', chars: ['Lamp'], minutes: 1 }]);
    approve(s, p);
    generatePlan(s, p, addDaysToKey(dateKey(s.now, 'Europe/London'), 1));
    for (const t of p.tasks) if (t.assetRef) { t.status = 'done'; t.done = t.units; }
    const moth = p.characters.find((c) => c.name === 'Moth')!;
    const lampTasks = p.tasks.filter((t) => t.assetRef !== moth.id && t.needsVersion !== undefined).map((t) => t.id);
    const imp = designChangeImpact(p, moth.id);
    expect(imp.unstartedShots).toBe(2);
    expect(describeImpact(imp)).toContain("Changing this character's design affects 2 shots that haven't been animated.");
    updateCharacter(p, moth.id, { realization: 'puppet', description: 'Now made of felt.' });
    applyDesignChange(s, p, moth.id, false);
    expect(p.tasks.filter((t) => t.assetRef === moth.id && t.needsVersion !== undefined).every((t) => t.status === 'waiting' && t.done === 0)).toBe(true);
    // Recorded voice work does not depend on the visual design and stays finished.
    expect(p.tasks.find((t) => t.id === `anim:voice:${moth.id}`)?.status).toBe('done');
    expect(p.tasks.filter((t) => lampTasks.includes(t.id)).every((t) => t.status === 'done')).toBe(true);
  });
});

describe('hybrid', () => {
  it('shoots live scenes and animates the rest without duplicating actors or footage', () => {
    const s = startLife('hy');
    const p = buildProject(s, { title: 'Bramble', format: 'short', medium: 'hybrid', technique: '3d-cg', genres: ['fantasy'], runtime: 8, quality: 'limited' },
      [{ name: 'June', patch: { roleSize: 'lead' } }, { name: 'Bramble', patch: { roleSize: 'co-lead', entity: 'supernatural', realization: 'cg', methods: ['voice', 'motion-capture'] } }],
      [{ place: 'Garden', intExt: 'EXT', chars: ['June'], minutes: 2 }, { place: 'Hedge World', chars: ['Bramble'], minutes: 1, extra: { technique: '3d-cg' } }]);
    approve(s, p);
    const tasks = buildTasks(p);
    expect(tasks.some((t) => t.kind === 'hy:integrate')).toBe(true);
    expect(tasks.filter((t) => t.kind === 'anim:animation').map((t) => t.sceneIds[0])).toEqual([approvedScenes(p)[1].id]);
    hireUp(s, p);
    startProduction(s, p, 5);
    expect(p.schedule.days.every((d) => d.sceneIds.includes(approvedScenes(p)[0].id))).toBe(true);
    runDays(s, p, 300);
    expect(p.delivered).not.toBeNull();
    const keys = p.obligations.flatMap((o) => o.postings.filter((x) => x.kind === 'settle').map((x) => x.key));
    expect(new Set(keys).size).toBe(keys.length);
  }, 60000);
});

describe('documentary', () => {
  /** Labelled fixture: the contributors' answers are set directly (the game draws them from the world seed). */
  function documentary(tag: string, interviewee: 'given' | 'declined') {
    const s = startLife(tag, 'za-durban');
    const p = buildProject(s, { title: 'Tide Keepers', format: 'documentary-short', medium: 'live-action', genres: ['documentary', 'sports'], runtime: 15 }, [], []);
    p.contributors.push({ id: 'ct1', name: 'Nomvula Dube', role: 'Lifeguard', consent: 'not-asked' }, { id: 'ct2', name: 'Sipho Khumalo', role: 'Coach', consent: 'not-asked' });
    p.evidence.push({ id: 'ev1', claim: 'The club has run since 1952.', status: 'established', sourceNote: 'Club archive', verified: false });
    p.scenes.push(
      { ...blankDoc('a1'), heading: { intExt: 'EXT', place: 'Beach', time: 'DAY' }, storyLocation: 'Beach', kind: 'interview', contributorIds: ['ct1'] },
      { ...blankDoc('a2'), heading: { intExt: 'EXT', place: 'Beach', time: 'DAY' }, storyLocation: 'Beach', kind: 'actuality', evidenceIds: ['ev1'] },
      { ...blankDoc('a3'), heading: { intExt: 'INT', place: 'Club Archive', time: 'DAY' }, storyLocation: 'Club Archive', kind: 'archival', evidenceIds: ['ev1'] },
    );
    approve(s, p);
    expect(p.requirements.map((r) => r.kind)).toEqual(expect.arrayContaining(['interview', 'consent', 'fact-check', 'archival']));
    expect(approvedScenes(p).every((sc) => sc.dialogue.length === 0)).toBe(true);
    requestConsent(s, p, 'ct1');
    requestConsent(s, p, 'ct2');
    hireUp(s, p, 10);
    expect(p.contributors.every((c) => c.consent === 'given' || c.consent === 'declined')).toBe(true); // the game answered
    p.contributors.find((c) => c.id === 'ct1')!.consent = interviewee;
    startProduction(s, p, 5);
    runDays(s, p, 200);
    return { s, p };
  }

  it('uses contributors, consent and fact checks instead of scripted dialogue, and delivers once the facts are checked', () => {
    const { s, p } = documentary('doc', 'given');
    expect(p.delivered).toBeNull(); // delivery waits for checked facts
    expect(deliveryBlockers(p).join(' ')).toMatch(/verified/);
    p.evidence[0].verified = true;
    runDays(s, p, 60);
    expect(p.delivered).not.toBeNull();
  }, 60000);

  it("a contributor who declined can't be filmed, so their interview is skipped and the film can't be delivered", () => {
    const { s, p } = documentary('doc-declined', 'declined');
    p.evidence[0].verified = true;
    runDays(s, p, 60);
    expect(p.delivered).toBeNull();
    expect(s.log.some((l) => /skipped: Nomvula Dube hasn't given consent/.test(l.text))).toBe(true);
  }, 60000);
});

describe('TV season', () => {
  it('produces episodes with episode-specific credits and shared assets', () => {
    const s = startLife('tv', 'us-atlanta');
    const p = buildProject(s, { title: 'Night Shift', format: 'limited-series', medium: 'live-action', genres: ['medical-drama'], episodes: 2, runtime: 30 },
      [{ name: 'Dr. Ines Park', patch: { roleSize: 'lead', seriesInvolvement: 'regular' } }, { name: 'Marcus', patch: { roleSize: 'supporting', seriesInvolvement: 'guest' } }],
      [
        { place: 'ER', chars: ['Dr. Ines Park'], minutes: 3, extra: { episode: 1 } },
        { place: 'ER', chars: ['Dr. Ines Park', 'Marcus'], minutes: 3, extra: { episode: 1 } },
        { place: 'ER', chars: ['Dr. Ines Park'], minutes: 3, extra: { episode: 2 } },
      ]);
    approve(s, p);
    // ER appears in both episodes but is one location requirement (shared standing set).
    expect(p.requirements.filter((r) => r.kind === 'location').length).toBe(1);
    hireUp(s, p);
    startProduction(s, p, 6);
    runDays(s, p, 250);
    expect(p.delivered).not.toBeNull();
    const marcus = p.credits.find((c) => c.characterName === 'Marcus')!;
    expect(marcus.episodes).toEqual([1]);
    const ines = p.credits.find((c) => c.characterName === 'Dr. Ines Park')!;
    expect(ines.episodes).toEqual([1, 2]);
    expect(p.credits.find((c) => c.contribution === 'Executive Producer And Showrunner')?.person).toBe('player');
    expect(p.tasks.filter((t) => t.kind === 'post:assembly').length).toBe(2);
    expect(ledgerTotals(p).cash).toBeGreaterThanOrEqual(0);
  }, 60000);
});

function blankDoc(id: string) {
  return {
    id, episode: 1, heading: { intExt: 'INT' as const, place: '', time: 'DAY' as const }, storyLocation: '', participants: [], objective: '', action: '', dialogue: [],
    turningPoint: '', estMinutes: 3, props: [], animals: [], vehicles: [], stunts: '', crowd: 0, intimacy: false, water: false, vfx: [], songs: [], dance: false,
    kind: 'interview' as const, basis: 'sourced' as const, contributorIds: [] as string[], evidenceIds: [] as string[], intentionalDiscontinuity: false,
  };
}
