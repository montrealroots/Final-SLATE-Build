// The script's fields after the review of November 7, 2026 (src/engine/script-effects.ts, docs/SCREENWRITING-AUDIT.md):
// connected, explained decisions instead of "every field has an effect". Each test pairs an alternative a player could
// reasonably choose with the one it is compared to.
import { describe, expect, it } from 'vitest';
import {
  BACKERS, BROADCAST_EDIT_COST, DAY, DELIVERY_MATERIALS, ESSENTIAL_CUT_COST, LATE_SLOT_SHARE, SUBTITLE_PER_MINUTE, acceptDistribution, approachBacker,
  approvedScenes, assessQuality, backerOptions, buildTasks, castPlacement, categoryRecipients, competesAs, composeGenres, computeCredits,
  coverageGaps, cutFromEdit, deserialize, entryNeeds, estimateDays, lockBlockers, makeOffer, migrate, noteFromIssue, offerNeeds,
  processUntil, requestPickups, restoreToEdit, schedule, scriptIssues, serialize, subtitlingCost,
} from './engine-api';
import type { Category } from '../src/engine/awards';
import { audienceContentNote, cutConsequences, placementExplained } from '../src/engine/script-explain';
import { findPlace } from '../src/data/places';
import type { DistributionOffer, GameState, Project } from '../src/engine/types';
import { approve, buildProject, castAll, manage, runDays, staffAll, startLife, startProduction } from './helpers';

type CharSpec = { name: string; patch?: Record<string, unknown> };

function film(tag: string, chars: CharSpec[] = [{ name: 'Ines', patch: { roleSize: 'lead' } }], extra: Record<string, unknown> = {}, sceneCount = 1) {
  const s = startLife(tag);
  const p = buildProject(s, { title: 'Harbour', format: 'feature', medium: 'live-action', runtime: 90 }, chars,
    Array.from({ length: sceneCount }, (_, i) => ({ place: `Harbour ${i + 1}`, chars: chars.map((c) => c.name), minutes: 6, extra })));
  approve(s, p);
  return { s, p };
}

/** A short shot and delivered through the engine's own production loop (as tests/release.test.ts). */
function delivered(tag: string, chars: CharSpec[], scenes: { place: string; chars: string[] }[], before?: (p: Project) => void): { s: GameState; p: Project } {
  const s = startLife(tag, 'gb-london');
  const p = buildProject(s, { title: 'Tidewater', format: 'short', medium: 'live-action', scenario: 'micro' }, chars,
    scenes.map((x) => ({ place: x.place, intExt: 'INT' as const, chars: x.chars, minutes: 2 })));
  before?.(p);
  approve(s, p);
  castAll(s, p);
  staffAll(s, p);
  for (let i = 0; i < 6; i++) { manage(s, p); processUntil(s, s.now + DAY, 'tick', 100000); }
  startProduction(s, p, 5);
  runDays(s, p, 200);
  expect(p.delivered).not.toBeNull();
  return { s, p };
}

const cat = (recipient: 'lead' | 'supporting'): Category => ({ id: `t-${recipient}`, name: 'Test', recipient, formats: ['short'], judging: 'jury', slots: 5, competitive: true, fee: 0 } as Category);

describe("award placement is the producer's, never a story function's", () => {
  it('a supporting antagonist stays supporting unless placed otherwise; a cameo is not entered unless placed', () => {
    expect(castPlacement({ roleSize: 'supporting', awardPlacement: undefined })).toBe('supporting');
    expect(castPlacement({ roleSize: 'cameo', awardPlacement: undefined })).toBeNull();
    expect(castPlacement({ roleSize: 'cameo', awardPlacement: 'supporting' })).toBe('supporting');
    expect(castPlacement({ roleSize: 'supporting', awardPlacement: 'lead' })).toBe('lead');
    expect(castPlacement({ roleSize: 'lead', awardPlacement: 'none' })).toBeNull();
    expect(placementExplained({ name: 'Marcus', roleSize: 'supporting' })).toBe("Marcus is entered in the supporting categories, from the part's size (Supporting). Change Awards Placement on the character to enter it elsewhere.");
  });

  it('in a real entry: the antagonist is offered for supporting, and moves only when the producer places it', () => {
    const { s, p } = delivered('fx-place', [{ name: 'Ines', patch: { roleSize: 'lead', functions: ['protagonist'] } }, { name: 'Marcus', patch: { roleSize: 'supporting', functions: ['antagonist'] } }],
      [{ place: 'Pier', chars: ['Ines', 'Marcus'] }]);
    const names = (c: Category) => categoryRecipients(s, p, c).map((x) => x.characterName);
    expect(names(cat('supporting'))).toEqual(['Marcus']);
    expect(names(cat('lead'))).toEqual(['Ines']);
    // Placed as leading by the producer (on the approved draft, which the entry reads): it moves, and says why.
    const marcus = p.drafts.find((d) => d.number === p.approvedDraft)!.characters.find((c) => c.name === 'Marcus')!;
    marcus.awardPlacement = 'lead';
    expect(names(cat('lead')).sort()).toEqual(['Ines', 'Marcus']);
    expect(names(cat('supporting'))).toEqual([]);
    expect(placementExplained(marcus)).toBe('Marcus is entered in the leading categories, as you placed the part.');
  });

  it("a narrator records narration and is booked for it, whatever the part's size or placement", () => {
    const narr = film('fx-narr', [{ name: 'Ines', patch: { roleSize: 'featured', functions: ['narrator'] } }]);
    const plain = film('fx-narr', [{ name: 'Ines', patch: { roleSize: 'featured' } }]);
    expect(buildTasks(narr.p).find((t) => t.kind === 'post:narration')!.label).toBe("Record Ines's Narration");
    expect(castPlacement(narr.p.characters[0])).toBe('supporting');
    const id = (p: Project) => p.characters[0].id;
    expect(estimateDays(narr.p, 'actor', id(narr.p), 'on-camera')).toBe(estimateDays(plain.p, 'actor', id(plain.p), 'on-camera') + 1);
  });

  it('where it competes: declared comedy or drama, else its primary genres', () => {
    const { p } = film('fx-register');
    expect(competesAs(p)).toBe('drama');
    p.axes.genres = [{ id: 'satire', emphasis: 'primary' }];
    expect(competesAs(p)).toBe('comedy');
    p.axes.genres = [{ id: 'courtroom-drama', emphasis: 'primary' }, { id: 'satire', emphasis: 'secondary' }];
    expect(competesAs(p)).toBe('drama'); // a comic streak in a drama
    p.axes.genres = [{ id: 'courtroom-drama', emphasis: 'secondary' }, { id: 'satire', emphasis: 'primary' }];
    expect(competesAs(p)).toBe('comedy');
    p.axes.register = 'drama';
    expect(competesAs(p)).toBe('drama');
  });
});

describe('content is declared, and outlets apply their own requirements to it', () => {
  /** Offer waves for a delivered film until a broadcaster makes one. Deterministic for the seed. */
  function firstBroadcast(s: GameState, p: Project): DistributionOffer {
    for (let w = 0; w < 40; w++) {
      const b = p.offers.find((o) => o.route === 'broadcast' && o.status === 'open');
      if (b) return b;
      schedule(s, s.now + 1000, 'distribution-offer', { projectId: p.id, wave: `test-${w}`, exposure: 40 });
      processUntil(s, s.now + 2000, 'tick', 1000);
    }
    throw new Error('No broadcast offer in 40 waves.');
  }
  const scenes = [{ place: 'Pier', chars: ['Ada'] }];
  const chars = [{ name: 'Ada', patch: { roleSize: 'lead' } }];

  it('strong content still gets a broadcast offer, in a late slot or with a broadcast edit, and every other term matches', () => {
    const moderate = delivered('fx-mature', chars, scenes, (p) => { p.axes.content = { violence: 'moderate' }; });
    const strong = delivered('fx-mature', chars, scenes, (p) => { p.axes.content = { violence: 'strong', language: 'strong' }; });
    const a = firstBroadcast(moderate.s, moderate.p);
    const b = firstBroadcast(strong.s, strong.p);
    expect(a.slot).toBe('any');
    expect(b.slot).toBe('late');
    expect([b.distributor, b.territories, b.releaseWindowDays]).toEqual([a.distributor, a.territories, a.releaseWindowDays]);
    expect(b.editedGuarantee).toBe(a.minimumGuarantee);
    expect(b.minimumGuarantee).toBe(Math.round((a.minimumGuarantee * LATE_SLOT_SHARE) / 1000) * 1000);
    // The player's choice: the full guarantee for a broadcast edit, which costs a deliverable.
    const before = strong.p.revenue;
    acceptDistribution(strong.s, strong.p, b.id, { broadcastEdit: true });
    expect(strong.p.revenue - before).toBe(a.minimumGuarantee);
    expect(strong.p.obligations.find((o) => o.label.startsWith('Delivery Materials'))!.amount).toBe(DELIVERY_MATERIALS.broadcast + BROADCAST_EDIT_COST + subtitlingCost(strong.p, b.territories)); // subtitles for any territory whose language isn't spoken
  });

  it('a family audience with declared strong content is advised, never blocked', () => {
    const { s, p } = film('fx-family', undefined, { intimacy: true });
    p.axes.audience = 'Family';
    p.axes.content = { 'sexual-content': 'strong' };
    expect(scriptIssues(p).filter((i) => i.severity === 'blocking')).toEqual([]);
    expect(audienceContentNote(p)).toMatch(/declared strong content/);
    expect(() => approve(s, p)).not.toThrow();
  });

  it('a streaming contract asks for the declaration; the pitch is a deliverable, never a reason for no offers', () => {
    const { p } = delivered('fx-streamreq', chars, scenes);
    const o: DistributionOffer = { id: 'x', distributor: 'X', route: 'streaming', minimumGuarantee: 1000, territories: ['GB'], releaseWindowDays: 30, expiresAt: Infinity, status: 'open' };
    expect(offerNeeds(p, o)).toBeNull();
    delete p.axes.content;
    expect(offerNeeds(p, o)).toBe("A streaming service's delivery list includes content advisories. Declare the content on the Script page first.");
    p.axes.content = {};
    p.story.premise = '';
    expect(offerNeeds(p, o)).toBe("The contract's delivery list includes a Pitch. Still to write in the Story panel: Premise.");
  });

  it("subtitles are priced by runtime for each language the dialogue isn't in, not by words written", () => {
    const { s, p } = film('fx-subs');
    p.axes.dialogueLanguages = ['es'];
    const minutes = Math.round(approvedScenes(p).reduce((a, x) => a + x.estMinutes, 0));
    expect(subtitlingCost(p, ['ES'])).toBe(0);
    expect(subtitlingCost(p, ['GB'])).toBe(minutes * SUBTITLE_PER_MINUTE);
    p.scenes[0].dialogue = [{ id: 'd1', characterId: p.characters[0].id, text: Array.from({ length: 1500 }, () => 'palabra').join(' '), language: 'es' }];
    approve(s, p);
    expect(subtitlingCost(p, ['GB'])).toBe(minutes * SUBTITLE_PER_MINUTE); // writing the lines out changes nothing
  });
});

describe('text is a record and a document, never a score or a timer', () => {
  it('meaningless text manufactures no quality, and an empty field costs none', () => {
    const empty = film('fx-text');
    const filled = film('fx-text');
    for (const x of [empty, filled]) x.p.axes.genres = [{ id: 'mystery', emphasis: 'primary' }];
    empty.p.scenes[0].objective = '';
    filled.p.scenes[0].objective = 'x';
    for (const q of composeGenres(['mystery']).questions) filled.p.genreNotes[q.key] = 'x';
    for (const x of [empty, filled]) approve(x.s, x.p);
    expect(assessQuality(empty.s, empty.p).script).toBe(assessQuality(filled.s, filled.p).script);
    // Advisory prompts are shown but never count with backers or in the assessment.
    expect(scriptIssues(empty.p).some((i) => i.text.endsWith('has no stated objective.') && i.advisory)).toBe(true);
  });

  it('turning an empty-field prompt into a revision note and "resolving" it with filler earns nothing', () => {
    const { s, p } = film('fx-prompt');
    p.scenes[0].objective = '';
    approve(s, p);
    const before = assessQuality(s, p).script;
    const n = noteFromIssue(s, p, scriptIssues(p).find((i) => i.text.endsWith('has no stated objective.'))!.text);
    expect(n.advisory).toBe(true);
    p.scenes[0].objective = 'asdf';
    approve(s, p);
    n.status = 'addressed';
    expect(assessQuality(s, p).script).toBe(before);
  });

  it('a grant application names the documents and fields it still needs; once written it is sent, with no delay or bonus', () => {
    const { s, p } = film('fx-grant');
    p.finance!.deals = [];
    p.funding.fund = 0;
    Object.assign(p.story, { logline: 'x', premise: '', conflict: '', viewpoint: '', ending: '' });
    const grant = () => backerOptions(s, p).find((o) => o.kind === 'grant')!.needs;
    expect(grant()).toBe('A grant application includes a Pitch, a Treatment and a Statement Of Intent. Still to write in the Story panel: Premise, Central Conflict, Point Of View and Intended Ending.');
    expect(() => approachBacker(s, p, 'grant')).toThrow('Still to write in the Story panel: Premise');
    // The revised treatment and the missing premise: now it can be sent.
    Object.assign(p.story, { premise: 'y', conflict: 'a', viewpoint: 'b', ending: 'c' });
    expect(grant()).toBe('');
    const deal = approachBacker(s, p, 'grant');
    expect(deal.sent).toEqual(['Pitch', 'Treatment', 'Statement Of Intent']);
    expect(deal.decideAt! - s.now).toBe(BACKERS.grant.decideDays * DAY);
    expect(s.log.some((l) => /sending the approved script and your pitch, treatment, statement of intent/.test(l.text))).toBe(true);
  });

  it('an investor reads the pitch only; a treatment written or not changes nothing about when they answer', () => {
    const answer = (treatment: boolean) => {
      const { s, p } = film('fx-investor');
      p.finance!.deals = [];
      p.funding.fund = 0;
      if (!treatment) Object.assign(p.story, { conflict: '', viewpoint: '', ending: '' });
      const d = approachBacker(s, p, 'investor');
      return [d.decideAt! - s.now, d.sent];
    };
    expect(answer(false)).toEqual(answer(true));
    expect(answer(false)[1]).toEqual(['Pitch']);
  });

  it('festival entry forms name the missing pitch fields', () => {
    const { p } = film('fx-entry');
    expect(entryNeeds(p)).toBeNull();
    p.story.logline = '';
    expect(entryNeeds(p)).toBe('Every entry form includes a Pitch. Still to write in the Story panel: Logline.');
  });

  it('an offer for a part without a casting breakdown is answered just as soon', () => {
    const run = (patch: Record<string, unknown>) => {
      const { s, p } = film('fx-breakdown', [{ name: 'Ines', patch: { roleSize: 'lead', ...patch } }]);
      return makeOffer(s, p, { personId: 'np_actor_GB_0', roleId: 'actor', dayRate: 500, characterId: p.characters[0].id, method: 'on-camera' }).responseAt - s.now;
    };
    expect(run({})).toBe(run({ description: 'A nurse.', wants: 'To leave.', fears: 'Staying.' }));
  });

  it('briefs add no work; a setting place in another country than the base is researched before design and costumes', () => {
    const { s, p } = film('fx-briefs');
    const units = () => buildTasks(p).map((t) => `${t.id}:${t.units}`);
    const with_ = units();
    p.axes.tone = '';
    p.story.intendedExperience = '';
    p.axes.storySetting = '';
    expect(units()).toEqual(with_);
    const base = findPlace(p.axes.basePlaceId)!;
    // Same country as the base: nothing to research.
    p.axes.settingPlaceId = base.id;
    approve(s, p);
    expect(buildTasks(p).some((t) => t.id === 'prep:research:setting')).toBe(false);
    // Abroad: Setting Research, and design and costumes wait for it.
    p.axes.settingPlaceId = base.country === 'FR' ? 'jp-tokyo' : 'fr-paris';
    approve(s, p);
    expect(p.requirements.find((r) => r.kind === 'setting-research')?.label).toMatch(/^(Paris, France|Tokyo, Japan)$/);
    const tasks = buildTasks(p);
    expect(tasks.find((t) => t.id === 'prep:research:setting')?.units).toBe(3);
    for (const id of ['prep:design:all', 'prep:costume:all']) expect(tasks.find((t) => t.id === id)?.dependsOn).toContain('prep:research:setting');
  });
});

describe('structure: essential scenes and the edit plan', () => {
  const chars: CharSpec[] = [{ name: 'Ada', patch: { roleSize: 'lead' } }, { name: 'Ben', patch: { roleSize: 'supporting' } }];
  /** The first scene plants a letter the third pays off; the second is declared essential. */
  const plan = (p: Project) => {
    p.setups.push({ id: 'sp1', kind: 'clue', label: 'The letter', plantedIn: p.scenes[0].id, paidIn: p.scenes[2].id });
    p.scenes[1].essential = true;
  };
  const threeScenes = (tag: string) => {
    const x = film(tag, chars, {}, 3);
    plan(x.p);
    approve(x.s, x.p);
    return x;
  };

  it('missing footage names the scene and the choices; cutting it states the consequences and clears the block', () => {
    const { s, p } = threeScenes('fx-gap');
    const [, essential] = approvedScenes(p);
    p.edit.cutPasses = 1;
    p.tasks.push({ id: 'post:assembly:1', kind: 'post:assembly', label: 'Assembly', dept: 'Post Production', roleId: 'editor', units: 1, unitLabel: 'days', done: 1, dependsOn: [], status: 'done', episode: 1, sceneIds: [], workedDays: 1 });
    for (const sc of approvedScenes(p)) p.captures.push({ sceneId: sc.id, captured: sc.id === essential.id ? 0.3 : 1, quality: 60, version: p.approvedDraft ?? 0, weatherCompromised: false });
    const gap = coverageGaps(p);
    expect(gap.map((g) => g.sceneId)).toEqual([essential.id]);
    expect(lockBlockers(p)).toContain(`${gap[0].label} is missing coverage. Schedule a pickup, or cut it from the edit.`);
    expect(cutConsequences(p, essential.id)).toEqual([
      `${gap[0].label} is marked essential to the story: without it the edit has a gap the audience notices (editing ${ESSENTIAL_CUT_COST} points lower in this game's model).`,
      'The cut runs about 6 minutes shorter.',
    ]);
    const editing = assessQuality(s, p).editing;
    cutFromEdit(s, p, essential.id);
    expect(lockBlockers(p).some((b) => b.includes('missing coverage'))).toBe(false);
    expect(assessQuality(s, p).editing).toBe(Math.max(0, editing - ESSENTIAL_CUT_COST));
    // Restored, it is a gap to fill again.
    restoreToEdit(s, p, essential.id);
    expect(lockBlockers(p)).toContain(`${gap[0].label} is missing coverage. Schedule a pickup, or cut it from the edit.`);
  });

  it('cutting a scene that plants a clue says the payoff loses its setup, and the setup stops counting', () => {
    const { s, p } = threeScenes('fx-setup');
    const first = approvedScenes(p)[0];
    expect(cutConsequences(p, first.id)[0]).toMatch(/^It plants "The letter", which pays off in .+: that payoff would have no setup\.$/);
    const script = assessQuality(s, p).script;
    cutFromEdit(s, p, first.id);
    expect(assessQuality(s, p).script).toBeLessThan(script);
  });

  it('a nonlinear structure (payoff shown first, marked deliberate) scores the same as the linear one', () => {
    const linear = film('fx-nonlinear', chars, {}, 2);
    const nonlinear = film('fx-nonlinear', chars, {}, 2);
    linear.p.setups.push({ id: 'a', kind: 'setup', label: 'Gun', plantedIn: linear.p.scenes[0].id, paidIn: linear.p.scenes[1].id });
    nonlinear.p.setups.push({ id: 'a', kind: 'setup', label: 'Gun', plantedIn: nonlinear.p.scenes[1].id, paidIn: nonlinear.p.scenes[0].id });
    nonlinear.p.scenes[0].intentionalDiscontinuity = true;
    for (const x of [linear, nonlinear]) approve(x.s, x.p);
    expect(assessQuality(nonlinear.s, nonlinear.p).script).toBe(assessQuality(linear.s, linear.p).script);
  });

  it('a shoot day left empty by a cut is cancelled, and the project still delivers without it', () => {
    const s = startLife('fx-cutday', 'gb-london');
    const p = buildProject(s, { title: 'Tidewater', format: 'short', medium: 'live-action', scenario: 'micro' }, chars,
      [['Pier', ['Ada']], ['Boat', ['Ada', 'Ben']], ['Shed', ['Ben']]].map(([place, who]) => ({ place: place as string, intExt: 'INT' as const, chars: who as string[], minutes: 2 })));
    plan(p);
    approve(s, p);
    castAll(s, p);
    staffAll(s, p);
    for (let i = 0; i < 6; i++) { manage(s, p); processUntil(s, s.now + DAY, 'tick', 100000); }
    startProduction(s, p, 5);
    const essential = approvedScenes(p)[1];
    const days = p.schedule.days.filter((d) => d.sceneIds.includes(essential.id));
    expect(days.length).toBeGreaterThan(0);
    cutFromEdit(s, p, essential.id);
    for (const d of days) expect(d.sceneIds.includes(essential.id)).toBe(false);
    expect(days.every((d) => d.sceneIds.length > 0 || d.status === 'cancelled')).toBe(true);
    runDays(s, p, 200);
    expect(p.delivered).not.toBeNull();
    expect(p.delivered!.runtimeMin).toBe(4);
    expect(p.captures.some((c) => c.sceneId === essential.id)).toBe(false);
  });
});

describe('a pickup asked for before the shoot', () => {
  it('is booked after the last scheduled shoot day, so prep is done and the crew is still on, and the project delivers', () => {
    const s = startLife('fx-pickup', 'gb-london');
    const chars: CharSpec[] = [{ name: 'Ada', patch: { roleSize: 'lead' } }, { name: 'Ben', patch: { roleSize: 'supporting' } }];
    const p = buildProject(s, { title: 'Tidewater', format: 'short', medium: 'live-action', scenario: 'micro' }, chars,
      [['Pier', ['Ada']], ['Boat', ['Ada', 'Ben']], ['Shed', ['Ben']]].map(([place, who]) => ({ place: place as string, intExt: 'INT' as const, chars: who as string[], minutes: 2 })));
    approve(s, p);
    castAll(s, p);
    staffAll(s, p);
    for (let i = 0; i < 6; i++) { manage(s, p); processUntil(s, s.now + DAY, 'tick', 100000); }
    startProduction(s, p, 5);
    const scene = approvedScenes(p)[1];
    cutFromEdit(s, p, scene.id);
    restoreToEdit(s, p, scene.id);
    expect(coverageGaps(p).find((g) => g.sceneId === scene.id)!.reason).toBe('Nothing has been shot for it yet.');
    const lastMain = p.schedule.days.filter((d) => d.status === 'scheduled').map((d) => d.date).sort().at(-1)!;
    requestPickups(s, p, [scene.id]);
    const pickup = p.schedule.days.find((d) => d.status === 'scheduled' && d.sceneIds.includes(scene.id))!;
    expect(pickup.date > lastMain).toBe(true);
    runDays(s, p, 200);
    expect(p.delivered).not.toBeNull();
    expect(p.schedule.days.filter((d) => d.status === 'lost')).toEqual([]);
  });
});

describe('series terms', () => {
  it('series regulars are booked for every episode and credited in each; a guest in two episodes is no fault', () => {
    const s = startLife('fx-series');
    const p = buildProject(s, { title: 'Ward', format: 'series', medium: 'live-action', runtime: 30, episodes: 4 },
      [{ name: 'Ines', patch: { roleSize: 'lead', seriesInvolvement: 'regular' } }, { name: 'Marcus', patch: { seriesInvolvement: 'guest' } }],
      [1, 2, 3, 4].map((e) => ({ place: 'Ward', chars: e <= 2 ? ['Ines', 'Marcus'] : ['Ines'], minutes: 3, extra: { episode: e } })));
    approve(s, p);
    const ines = p.characters[0].id;
    expect(estimateDays(p, 'actor', ines, 'on-camera')).toBeGreaterThanOrEqual(4);
    expect(scriptIssues(p).some((i) => i.text.includes('guest part'))).toBe(false);
    p.cast = [{ characterId: ines, performer: 'player', method: 'on-camera', note: '' }, { characterId: p.characters[1].id, performer: 'player', method: 'on-camera', note: '' }];
    const credits = computeCredits(s, p);
    expect(credits.find((c) => c.characterName === 'Ines')!.episodes).toBe('all');
    expect(credits.find((c) => c.characterName === 'Marcus')!.episodes).toEqual([1, 2]);
  });
});

describe('saves keep the new choices, and delivered projects keep their results', () => {
  it('placement, essential scenes, the content declaration, the edit plan and sent documents survive save and load', () => {
    const { s, p } = film('fx-save', [{ name: 'Ines', patch: { roleSize: 'supporting', functions: ['antagonist'], awardPlacement: 'lead' } }], { essential: true });
    p.axes.content = { violence: 'strong' };
    p.edit.cutSceneIds = [p.scenes[0].id];
    p.finance!.deals = [];
    p.funding.fund = 0;
    approachBacker(s, p, 'investor');
    const back = deserialize(serialize(s)).projects[0];
    expect(back.characters[0].awardPlacement).toBe('lead');
    expect(back.scenes[0].essential).toBe(true);
    expect(back.axes.content).toEqual({ violence: 'strong' });
    expect(back.edit.cutSceneIds).toEqual([p.scenes[0].id]);
    expect(back.finance!.deals[0].sent).toEqual(['Pitch']);
    expect(migrate(JSON.parse(JSON.stringify(s))).projects[0].axes.content).toEqual({ violence: 'strong' }); // the migration path keeps them too
  });

  it('a delivered project keeps the quality it was given: results stored at delivery are never recomputed on load', () => {
    const { s, p } = delivered('fx-history', [{ name: 'Ada', patch: { roleSize: 'lead' } }], [{ place: 'Pier', chars: ['Ada'] }]);
    const stored = { ...p.quality! };
    expect(deserialize(serialize(s)).projects[0].quality).toEqual(stored);
  });
});
