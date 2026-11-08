// Stage 4 of the gameplay-depth package: episodes. Block scheduling (SLATE-07-04.02), the series bible's shared facts
// (07-01.02), the season plan (07-02.02) and continuations (07-05.02, 18-04).
import { describe, expect, it } from 'vitest';
import { DAY, RENEWAL_DECISION_DAYS, addThread, assignEpisodeRole, deleteScene, scriptIssues, backerOptions, buildTasks, makeOffer, planShootDays, processUntil, projectedCost, roleCandidates, scheduleRenewal, updateCharacter } from './engine-api';
import { continueProject } from '../src/engine/sequel';
import { moveEpisode, removeWorldRule, reorderRefusal, setEpisodeArc, setEpisodeTitle, setSeasonArc, sharedFactImpact, sharedFactPreview, updateRelationship, updateWorldRule } from '../src/engine/season';
import type { GameState, Project } from '../src/engine/types';
import { approve, buildProject, startLife } from './helpers';

function series(tag: string): { s: GameState; p: Project } {
  const s = startLife(tag);
  const p = buildProject(s, { title: 'Tidewater', format: 'limited-series', medium: 'live-action', episodes: 2, runtime: 20 },
    [{ name: 'Mara' }],
    [
      { place: 'Pier', chars: ['Mara'], minutes: 2, extra: { episode: 1 } },
      { place: 'Pier', chars: ['Mara'], minutes: 2, extra: { episode: 2 } },
      { place: 'Kitchen', chars: ['Mara'], minutes: 2, extra: { episode: 2 } },
    ]);
  approve(s, p);
  return { s, p };
}
const shape = (days: ReturnType<typeof planShootDays>) => days.map((d) => [d.locationLabel, d.episodes ?? [d.episode]]);

describe('block scheduling', () => {
  it('without blocks each episode shoots its own day at the pier; in blocks, one director shoots both on one day', () => {
    const { s, p } = series('blocks');
    expect(shape(planShootDays(s, p, '2026-02-02'))).toEqual([['Pier', [1]], ['Kitchen', [2]], ['Pier', [2]]]);
    p.schedule.blockEpisodes = true;
    const days = planShootDays(s, p, '2026-02-02');
    expect(shape(days)).toEqual([['Kitchen', [2]], ['Pier', [1, 2]]]);
    expect(days.find((d) => d.locationLabel === 'Pier')!.episode).toBe(1);
  });

  it('episodes with different directors never share a day: each director gets their own day at the pier', () => {
    const { s, p } = series('blocks-directors');
    const who = roleCandidates(s, p, 'episode-director')[0];
    makeOffer(s, p, { personId: who.id, roleId: 'episode-director', dayRate: who.dayRate }).status = 'accepted'; // labelled fixture: hired
    assignEpisodeRole(p, 2, 'director', who.id);
    p.schedule.blockEpisodes = true;
    // Grouped by director, so the order follows the directors; what matters is that no day mixes them.
    const days = shape(planShootDays(s, p, '2026-02-02')).map((x) => JSON.stringify(x)).sort();
    expect(days).toEqual([['Kitchen', [2]], ['Pier', [1]], ['Pier', [2]]].map((x) => JSON.stringify(x)));
  });
});

// SLATE-07-05.02 and 18-04: another season or a sequel carries continuity, never money or people for free.
describe('continuing a project', () => {
  function delivered(tag: string, technique: 'stop-motion' | 'none' = 'none') {
    const s = startLife(tag);
    const p = buildProject(s, technique === 'stop-motion'
      ? { title: 'Clay Tide', format: 'short', medium: 'animation', technique: 'stop-motion', runtime: 4 }
      : { title: 'Tidewater', format: 'limited-series', medium: 'live-action', episodes: 2, runtime: 20 },
    [{ name: 'Mara', patch: { roleSize: 'lead' } }],
    technique === 'stop-motion' ? [{ place: 'Shore', chars: ['Mara'], minutes: 2 }]
      : [{ place: 'Pier', chars: ['Mara'], minutes: 2, extra: { episode: 1 } }, { place: 'Lighthouse', chars: ['Mara'], minutes: 2, extra: { episode: 2 } }]);
    approve(s, p);
    return { s, p };
  }

  it('is refused until the work is delivered, and only once', () => {
    const { s, p } = delivered('cont-refused');
    expect(() => continueProject(s, p)).toThrow('Deliver it first.');
    p.delivered = { at: s.now, runtimeMin: 40 }; // labelled fixture: delivered
    continueProject(s, p);
    expect(() => continueProject(s, p)).toThrow('It already has a continuation.');
  });

  it('carries the same characters, world and open threads; the cast are listed to ask back at their rate, not hired', () => {
    const { s, p } = delivered('cont-carry');
    p.worldRules.push({ id: 'w1', rule: 'The tide never lies', limit: '' });
    p.threads = [{ id: 't1', name: 'The missing boat', characterIds: [], sceneIds: [p.scenes[0].id], resolution: 'open', resolvedIn: null },
      { id: 't2', name: 'The storm', characterIds: [], sceneIds: [p.scenes[0].id], resolution: 'resolves', resolvedIn: p.scenes[1].id }];
    p.cast.push({ characterId: p.characters[0].id, performer: 'np_actor_GB_3', method: 'on-camera', note: '', hireId: 'h1' });
    p.hires.push({ id: 'h1', personId: 'np_actor_GB_3', roleId: 'actor', kind: 'cast', characterId: p.characters[0].id, method: 'on-camera', episodes: 'all', dayRate: 410, estDays: 3, status: 'accepted', offeredAt: 0, responseAt: 0, obligationId: null, daysWorked: 3 });
    p.delivered = { at: s.now, runtimeMin: 40 };
    const next = continueProject(s, p);
    expect(next.title).toBe('Tidewater: Season 2');
    expect(next.characters.map((c) => c.id)).toEqual(p.characters.map((c) => c.id));
    expect(next.worldRules.map((r) => [r.rule, r.sceneIds])).toEqual([['The tide never lies', []]]);
    expect(next.threads!.map((t) => [t.name, t.sceneIds])).toEqual([['The missing boat', []]]);
    expect(next.continues!.returning).toEqual([{ characterId: p.characters[0].id, personId: 'np_actor_GB_3', method: 'on-camera', rate: 410 }]);
    expect(next.cast).toEqual([]);
    expect(next.hires).toEqual([]);
    expect(next.funding.fund).toBe(0);
    expect(p.continuedBy).toBe(next.id);
  });

  it('a sequel reuses the finished puppets: its estimate is lower than the same film made from nothing', () => {
    const { s, p } = delivered('cont-puppets', 'stop-motion');
    p.tasks = buildTasks(p).map((t) => (/^sm:(armature|puppet|costume)$/.test(t.kind) ? { ...t, done: t.units, status: 'done' as const } : t)); // labelled fixture: the builds were finished
    p.delivered = { at: s.now, runtimeMin: 4 };
    const sequel = continueProject(s, p);
    expect(sequel.tasks.map((t) => t.kind).sort()).toEqual(['sm:armature', 'sm:costume', 'sm:puppet']);
    sequel.scenes = JSON.parse(JSON.stringify(p.scenes));
    approve(s, sequel);
    const twin = delivered('cont-puppets-twin', 'stop-motion').p;
    expect(projectedCost(s, sequel).total).toBeLessThan(projectedCost(s, twin).total);
    // A changed design makes it a new build: planning would rebuild it, so the estimate counts it again.
    const reused = projectedCost(s, sequel).total;
    updateCharacter(sequel, sequel.characters[0].id, { entityNote: 'Older now, weathered clay' , realization: 'puppet', methods: ['puppetry'] });
    sequel.characters[0].designVersion += 1;
    approve(s, sequel);
    expect(projectedCost(s, sequel).total).toBeGreaterThan(reused);
  });

  it('a commissioner renews a season that turned out well with an offer to fund the next; one that did not is not renewed', () => {
    for (const [overall, outcome] of [[72, 'renewed'], [41, 'cancelled']] as const) {
      const { s, p } = delivered(`cont-renew-${overall}`);
      p.finance = { estimate: 1, target: 1, deals: [{ id: 'fd1', kind: 'commissioner', backer: 'A Broadcaster', amount: 900_000, status: 'accepted', askedAt: 0, reason: '', received: 900_000, repaid: 0, terms: { recoup: 0, incomeShare: 0, approvalRights: ['Casting Approval'], credit: null, onDelivery: 0, deliverBy: null } }] };
      p.quality = { overall } as Record<string, number>; // labelled fixture: the assessment made at delivery
      p.delivered = { at: s.now, runtimeMin: 40 };
      scheduleRenewal(s, p);
      processUntil(s, s.now + (RENEWAL_DECISION_DAYS + 1) * DAY, 'tick', 100000);
      expect(p.renewal?.outcome).toBe(outcome);
      const next = continueProject(s, p);
      if (outcome === 'renewed') {
        expect(next.finance!.deals.map((d) => [d.kind, d.status, d.amount])).toEqual([['commissioner', 'offered', 900_000]]);
        expect(next.funding.fund).toBe(0); // an offer, not money
      } else {
        expect(backerOptions(s, next).find((o) => o.kind === 'commissioner')!.needs).toBe("The commissioner didn't renew the series.");
      }
    }
  });
});

describe('the series bible: changing a shared fact says which episodes it touches first', () => {
  it('a rule lists the scenes that rely on it, by episode, and which are recorded; the change leaves the footage alone', () => {
    const { p } = series('bible-rule');
    p.worldRules.push({ id: 'w1', rule: 'The tide never lies', limit: '' });
    const [pier1, pier2] = p.scenes;
    expect(sharedFactPreview(p, { kind: 'rule', id: 'w1' })).toEqual(['No scene relies on it yet, so nothing else changes.']);
    updateWorldRule(p, 'w1', { sceneIds: [pier1.id, pier2.id] });
    p.captures.push({ sceneId: pier2.id, captured: 1, quality: 70, version: 1, weatherCompromised: false }); // labelled fixture: recorded
    expect(sharedFactImpact(p, { kind: 'rule', id: 'w1' }).map((e) => [e.episode, e.scenes.map((x) => x.recorded)])).toEqual([[1, [false]], [2, [true]]]);
    expect(sharedFactPreview(p, { kind: 'rule', id: 'w1' })).toEqual([
      'Episode 1: Scene 1 (Pier).', 'Episode 2: Scene 1 (Pier) (recorded).',
      'Recorded scenes stay as they were shot. Rewrite or reshoot them if they no longer fit.',
    ]);
    updateWorldRule(p, 'w1', { rule: 'The tide lies once a year' });
    expect(p.worldRules[0].rule).toBe('The tide lies once a year');
    expect(p.captures[0].captured).toBe(1);
    expect(() => updateWorldRule(p, 'w1', { rule: '  ' })).toThrow('Say what the rule is.');
    // A deleted scene leaves the rule; the rule is then removed outright.
    deleteScene(p, pier1.id);
    expect(p.worldRules[0].sceneIds).toEqual([pier2.id]);
    removeWorldRule(p, 'w1');
    expect(p.worldRules).toEqual([]);
  });

  it('a relationship touches every scene its two characters share', () => {
    const s = startLife('bible-rel');
    const p = buildProject(s, { title: 'Tidewater', format: 'limited-series', medium: 'live-action', episodes: 2, runtime: 20 },
      [{ name: 'Mara' }, { name: 'Tom' }],
      [{ place: 'Pier', chars: ['Mara', 'Tom'], minutes: 2, extra: { episode: 1 } }, { place: 'Kitchen', chars: ['Mara'], minutes: 2, extra: { episode: 2 } }, { place: 'Boat', chars: ['Tom', 'Mara'], minutes: 2, extra: { episode: 2 } }]);
    const [mara, tom] = p.characters;
    p.relationships.push({ id: 'r1', a: mara.id, b: tom.id, kind: 'Sisters-in-law', start: '', end: '' });
    expect(sharedFactImpact(p, { kind: 'relationship', id: 'r1' }).map((e) => [e.episode, e.scenes.map((x) => x.label)])).toEqual([[1, ['Episode 1, Scene 1 (Pier)']], [2, ['Episode 2, Scene 2 (Boat)']]]);
    updateRelationship(p, 'r1', { kind: 'Rivals' });
    expect(p.relationships[0].kind).toBe('Rivals');
  });
});

describe('the season plan', () => {
  it('an episode moves with its scenes, in every draft, and its writer; titles and arc lines are kept', () => {
    const { s, p } = series('season-order');
    setEpisodeTitle(p, 2, 'The Storm');
    setEpisodeArc(p, 2, 'Mara learns the boat was sold');
    p.episodes[1].writer = 'np_writer_x'; // labelled fixture: a hired episode writer
    const kitchen = p.scenes.find((x) => x.heading.place === 'Kitchen')!;
    expect(reorderRefusal(p)).toBeNull();
    moveEpisode(p, 2, -1);
    expect(p.episodes.map((e) => [e.number, e.title, e.writer, e.arc ?? null])).toEqual([[1, 'The Storm', 'np_writer_x', 'Mara learns the boat was sold'], [2, 'Episode 2', 'player', null]]);
    expect(p.scenes.find((x) => x.id === kitchen.id)!.episode).toBe(1);
    expect(p.drafts.every((d) => d.scenes.find((x) => x.id === kitchen.id)!.episode === 1)).toBe(true);
    expect(() => moveEpisode(p, 1, -1)).toThrow('It is the first episode already.');
    expect(() => setEpisodeTitle(p, 1, ' ')).toThrow('Give the episode a title.');
    // Once the shoot is planned by episode, the order holds.
    planShootDays(s, p, '2026-02-02');
    p.schedule.startDate = '2026-02-02'; // labelled fixture: the plan was made
    expect(() => moveEpisode(p, 1, 1)).toThrow('The shoot is planned by episode already.');
  });

  it("the arc's notes are advice only, and the next season starts from the last one's arc", () => {
    const { s, p } = series('season-arc');
    const before = scriptIssues(p).filter((i) => !i.advisory).length;
    setSeasonArc(p, 'Mara gives up the sea, then takes it back.');
    setEpisodeArc(p, 1, 'She sells the boat');
    const notes = scriptIssues(p).filter((i) => i.text.includes('no line on what it moves'));
    expect(notes.map((n) => [n.text, n.advisory])).toEqual([['Episode 2 has no line on what it moves in the season arc.', true]]);
    expect(scriptIssues(p).filter((i) => !i.advisory).length).toBe(before);
    addThread(s, p, 'The boat');
    p.delivered = { at: s.now, runtimeMin: 40 }; // labelled fixture: delivered
    expect(continueProject(s, p).continues!.previousArc).toBe('Mara gives up the sea, then takes it back.');
  });
});
