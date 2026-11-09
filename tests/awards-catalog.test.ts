// The expanded festival and award catalog (docs/awards/DESIGN.md, November 9, 2026): requirements read from the project,
// recipients from credits, results stored only where you are involved, prizes decided among a section's selection,
// honorary awards from a career, national committees, disqualification, and results that read the same after a reload.
import { describe, expect, it } from 'vitest';
import {
  DAY, announceEdition, categoriesFor, checkEligibility, institution, processUntil, publicResult, submitEntry,
} from './engine-api';
import { careerRecord, committee, editionResults, honoraryChance, winnersOf } from '../src/engine/awards-results';
import { craftScore, requirementProblems } from '../src/engine/awards-rules';
import { honors } from '../src/engine/awards-actions';
import { deserialize, serialize } from '../src/engine/save';
import { localToInstant } from '../src/engine/time';
import type { Credit, Edition, GameState, Project } from '../src/engine/types';
import { approve, buildProject, startLife, writePitch } from './helpers';

const at = (zone: string, date: string, hh: number) => {
  const [y, m, d] = date.split('-').map(Number);
  return localToInstant(zone, y, m, d, hh, 0).instant;
};
const ed = (s: GameState, id: string): Edition => s.editions.find((e) => e.id === id)!;
const cat = (e: Edition | string, id: string) => institution(typeof e === 'string' ? e : e.institutionId).categories.find((c) => c.id === id)!;
const credit = (id: string, contribution: string, roleId: string, person = `p-${id}`): Credit => ({ id, person, personName: `Person ${id}`, contribution, roleId, episodes: 'all', billing: 1 });

/** A delivered project credited to the player as director and producer, ready to check against a category. */
function work(s: GameState, o: { format?: Project['axes']['format']; runtime?: number; completed?: string; base?: string; lang?: string } = {}): Project {
  const p = buildProject(s, { title: `Work ${s.projects.length + 1}`, format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'A', patch: { roleSize: 'lead' } }], [{ place: 'Room', chars: ['A'], minutes: 2 }]);
  approve(s, p);
  writePitch(p);
  p.axes.format = o.format ?? 'feature';
  p.axes.basePlaceId = o.base ?? 'us-los-angeles';
  if (o.lang) p.axes.dialogueLanguages = [o.lang];
  p.delivered = { at: at('UTC', o.completed ?? '2026-02-01', 12), runtimeMin: o.runtime ?? 100 };
  p.credits = [credit('d1', 'Directed By', 'director', 'player'), credit('pr1', 'Produced By', 'producer', 'player')];
  p.funding.fund = 50_000;
  return p;
}

describe('requirements are read from what the project records or declares', () => {
  it('drama and comedy follow where the project says it competes, not a genre list', () => {
    const s = startLife('class');
    const p = work(s, { format: 'series' });
    p.axes.register = 'comedy';
    expect(requirementProblems(s, p, cat('emmys', 'directing-comedy'))).toEqual([]);
    expect(requirementProblems(s, p, cat('emmys', 'directing'))).toEqual(['Comedy and musical work competes in a separate category.']);
    p.axes.register = 'drama';
    expect(requirementProblems(s, p, cat('emmys', 'directing'))).toEqual([]);
    expect(requirementProblems(s, p, cat('emmys', 'directing-comedy'))[0]).toMatch(/competes as drama/);
  });

  it('original or adapted is the project\'s declared source', () => {
    const s = startLife('source');
    const p = work(s);
    expect(requirementProblems(s, p, cat('oscars', 'screenplay'))).toEqual([]);
    expect(requirementProblems(s, p, cat('oscars', 'adapted-screenplay'))[0]).toMatch(/declared original/);
    p.source = { kind: 'adapted', work: 'A Novel' };
    expect(requirementProblems(s, p, cat('oscars', 'adapted-screenplay'))).toEqual([]);
    expect(requirementProblems(s, p, cat('oscars', 'screenplay'))[0]).toMatch(/declared adapted/);
  });

  it('a debut is the director\'s first delivered feature, and a subject has to be declared', () => {
    const s = startLife('debut');
    const first = work(s, { completed: '2025-01-01' });
    const second = work(s, { completed: '2026-03-01' });
    const debut = cat('venice', 'lion-of-the-future');
    expect(requirementProblems(s, first, debut)).toEqual([]);
    expect(requirementProblems(s, second, debut)[0]).toMatch(/first feature/);
    const doc = work(s, { format: 'documentary-feature' });
    expect(requirementProblems(s, doc, cat('international-emmys', 'arts'))[0]).toMatch(/about the arts/);
    doc.subjects = ['arts'];
    expect(requirementProblems(s, doc, cat('international-emmys', 'arts'))).toEqual([]);
  });

  it('origin decides the U.S. or World Cinema competition, and International Feature needs a non-US film not mainly in English', () => {
    const s = startLife('origin');
    const us = work(s, { base: 'us-los-angeles' });
    const fr = work(s, { base: 'fr-paris', lang: 'fr' });
    expect(requirementProblems(s, us, cat('sundance', 'dramatic'))).toEqual([]);
    expect(requirementProblems(s, fr, cat('sundance', 'dramatic'))[0]).toMatch(/American productions/);
    expect(requirementProblems(s, fr, cat('sundance', 'world-dramatic'))).toEqual([]);
    s.now = at('America/Los_Angeles', '2026-09-01', 9);
    const osc = ed(s, 'oscars-2027');
    expect(checkEligibility(s, us, osc, cat(osc, 'international')).reasons.join(' ')).toMatch(/outside the United States/);
    const en = work(s, { base: 'fr-paris', lang: 'en' });
    expect(checkEligibility(s, en, osc, cat(osc, 'international')).reasons.join(' ')).toMatch(/not in English/);
  });

  it('prizes and honorary awards take no entries and no fees', () => {
    const s = startLife('noentry');
    s.now = at('Europe/Rome', '2026-05-01', 9);
    const e = ed(s, 'venice-2026');
    const p = work(s, { completed: '2026-01-10', base: 'gb-london' });
    expect(checkEligibility(s, p, e, cat(e, 'golden-lion')).reasons[0]).toMatch(/Enter the section instead/);
    expect(checkEligibility(s, p, e, cat(e, 'lifetime')).reasons[0]).toMatch(/take no entries/);
    expect(() => submitEntry(s, p, e.id, 'golden-lion')).toThrow(/Enter the section instead/);
    expect(p.obligations.flatMap((o) => o.postings).filter((x) => x.key.startsWith('fee:'))).toEqual([]);
  });
});

describe('recipients come from credits for the contribution the award concerns', () => {
  it('a craft award goes to the credited crew member, judged on that craft', () => {
    const s = startLife('craft');
    s.now = at('America/Los_Angeles', '2026-09-01', 9);
    const osc = ed(s, 'oscars-2027');
    const p = work(s);
    const cine = cat(osc, 'cinematography');
    expect(checkEligibility(s, p, osc, cine).reasons).toContain('No credited person for this category.');
    p.credits.push(credit('dp', 'Director Of Photography', 'dop'));
    expect(checkEligibility(s, p, osc, cine).recipients.map((c) => c.id)).toEqual(['dp']);
    // The player, who directed and produced, is not the default recipient.
    expect(checkEligibility(s, p, osc, cine).recipients.some((c) => c.person === 'player')).toBe(false);
    p.quality = { overall: 60, craft: 50, 'craft:dop': 88 };
    expect(craftScore(p, cine.crafts, false)).toBe(88);
    p.quality = { overall: 60, craft: 50 };
    expect(craftScore(p, cine.crafts, false)).toBe(50); // delivered before per-craft quality existed
  });

  it('an original song needs an original song in the film, and goes to its composer', () => {
    const s = startLife('song');
    s.now = at('America/Los_Angeles', '2026-09-01', 9);
    const osc = ed(s, 'oscars-2027');
    const p = work(s);
    p.credits.push(credit('cm', 'Music By', 'composer'));
    expect(checkEligibility(s, p, osc, cat(osc, 'song')).recipients).toEqual([]);
    p.scenes[0].songs.push({ title: 'Original', licensed: false } as Project['scenes'][number]['songs'][number]);
    expect(checkEligibility(s, p, osc, cat(osc, 'song')).recipients.map((c) => c.id)).toEqual(['cm']);
  });

  it('a national entry is the director\'s, and the country\'s committee chooses it or another film', () => {
    const s = startLife('national');
    const osc = ed(s, 'oscars-2027');
    const p = work(s, { base: 'fr-paris', lang: 'fr' });
    p.quality = { overall: 99 };
    const a = committee(s, osc, p);
    expect(committee(s, osc, p)).toEqual(a); // the same answer every time
    expect(a.chosen).toBe(true);
    p.quality = { overall: 1 };
    expect(committee(s, osc, p).chosen).toBe(false);
    expect(committee(s, osc, p).reason).toMatch(/France's selection committee put forward .+ instead/);
    // A festival prize in the past year qualifies it without the committee.
    const venice = ed(s, 'venice-2026');
    venice.entries.push({ id: 'gl', projectId: p.id, categoryId: 'golden-lion', submittedAt: 0, status: 'won', recipients: [], fee: 0, via: 'selection' });
    expect(committee(s, osc, p)).toEqual({ chosen: true, reason: 'Its festival prize qualifies it without the national committee.' });
  });
});

describe('results are stored only where you are involved, and read the same after a reload', () => {
  it('an edition you didn\'t enter stores nothing; what it shows is computed from the season and the seed', () => {
    const s = startLife('public');
    const e = ed(s, 'venice-2026');
    announceEdition(s, e);
    expect(e.results).toEqual({});
    expect(e.rivals).toEqual([]);
    const shown = publicResult(s, e, cat(e, 'orizzonti'))!;
    expect(shown.stage).toBe('selection');
    expect(shown.field.length).toBeGreaterThan(0);
    expect(shown.winners).toEqual([]); // a section selects; it is never a win
    const back = deserialize(serialize(s));
    expect(publicResult(back, ed(back, 'venice-2026'), cat(e, 'orizzonti'))).toEqual(shown);
    // Prizes show nothing until results; then a winner chosen among the section's selection.
    expect(publicResult(s, e, cat(e, 'golden-lion'))).toBeNull();
    processUntil(s, e.end + 2 * DAY, 'tick', 100_000);
    const lion = publicResult(s, e, cat(e, 'golden-lion'))!;
    expect(lion.winners).toHaveLength(1);
    expect(publicResult(s, e, cat(e, 'competition'))!.field).toContain(lion.winners[0]);
    expect(publicResult(deserialize(serialize(s)), e, cat(e, 'golden-lion'))).toEqual(lion);
  });

  it('a nomination and its result survive a save and reload unchanged', () => {
    const s = startLife('reload', 'us-los-angeles');
    s.now = at('America/Los_Angeles', '2026-10-01', 9);
    const osc = ed(s, 'oscars-2027');
    const p = work(s);
    p.releases.push({ id: 'r1', route: 'theatrical', date: '2026-04-01', territories: ['US'], distributor: 'D', note: '', status: 'released' });
    p.quality = { overall: 99, direction: 99, script: 99, reception: 99 };
    const entry = submitEntry(s, p, osc.id, 'director');
    processUntil(s, osc.announce + 1, 'tick', 100_000);
    expect(['nominated', 'not-nominated']).toContain(entry.status);
    const back = deserialize(serialize(s));
    expect(ed(back, osc.id).entries).toEqual(osc.entries);
    expect(ed(back, osc.id).results).toEqual(osc.results);
    processUntil(s, osc.end + DAY, 'tick', 100_000);
    processUntil(back, osc.end + DAY, 'tick', 100_000);
    expect(ed(back, osc.id).results.director).toEqual(osc.results.director);
    expect(ed(back, osc.id).entries[0].status).toBe(entry.status);
  });
});

describe('festival prizes are decided among the films a section selected', () => {
  function selected(seedTag: string, debut: boolean) {
    const s = startLife(seedTag, 'gb-london');
    const e = ed(s, 'venice-2026');
    const p = work(s, { completed: '2026-01-10', base: 'gb-london' });
    if (!debut) work(s, { completed: '2024-01-10', base: 'gb-london' }); // an earlier feature you directed
    p.quality = { overall: 99, direction: 99, script: 99, reception: 99 };
    // Labelled fixture: the selection is set directly; selection is tested in rulebooks.test.ts.
    e.entries.push({ id: 'en', projectId: p.id, categoryId: 'competition', submittedAt: 0, status: 'selected', recipients: [], fee: 120 });
    e.results.competition = { stage: 'selection', projectIds: [p.id], rivalIds: [], revealed: true };
    e.status = 'announced';
    return { s, e, p };
  }

  it('the selection stays a selection; each prize is recorded from it, without an entry fee, once', () => {
    const { s, e, p } = selected('prizes', true);
    editionResults(s, e);
    expect(e.entries.find((x) => x.id === 'en')!.status).toBe('selected');
    const prizes = e.entries.filter((x) => x.via === 'selection');
    // Only prizes decided among the Competition (the debut award among others); never Orizzonti's.
    const competitionPrizes = institution('venice').categories.filter((c) => c.parents?.includes('competition')).map((c) => c.id);
    expect(prizes.every((x) => competitionPrizes.includes(x.categoryId))).toBe(true);
    expect(prizes.map((x) => x.categoryId)).toContain('golden-lion');
    expect(prizes.map((x) => x.categoryId)).toContain('lion-of-the-future');
    expect(prizes.some((x) => x.categoryId.startsWith('orizzonti'))).toBe(false);
    expect(prizes.every((x) => x.fee === 0)).toBe(true);
    for (const x of prizes) expect(x.status === 'won').toBe(e.results[x.categoryId].winner === p.id);
    const again = JSON.stringify(e.entries);
    editionResults(s, e);
    expect(JSON.stringify(e.entries)).toBe(again);
  });

  it('a prize with its own requirement considers only works that meet it', () => {
    const { s, e } = selected('prizes-later', false);
    editionResults(s, e);
    expect(e.entries.some((x) => x.categoryId === 'lion-of-the-future')).toBe(false);
    expect(e.results['lion-of-the-future']).toBeUndefined();
  });

  it('a withdrawn or disqualified selection is in contention for nothing', () => {
    const { s, e } = selected('prizes-out', true);
    e.entries[0].status = 'disqualified';
    editionResults(s, e);
    expect(e.entries.filter((x) => x.via === 'selection')).toEqual([]);
  });
});

describe('area and juried awards can give one, several or no awards', () => {
  it('every work at the standard wins; none does when none reaches it', () => {
    const area = cat('emmys', categoriesFor(institution('emmys'), 2026).find((c) => c.kind === 'area' || c.kind === 'juried')!.id);
    expect(winnersOf(area, [{ id: 'a', score: 90 }, { id: 'b', score: 80 }, { id: 'c', score: 60 }])).toEqual(['a', 'b']);
    expect(winnersOf(area, [{ id: 'c', score: 60 }])).toEqual([]);
    expect(winnersOf(cat('emmys', 'directing'), [{ id: 'a', score: 90 }, { id: 'b', score: 80 }])).toEqual(['a']);
  });
});

describe('honorary awards are chosen from a career, never entered', () => {
  function career(seedTag: string, works: number, years: number) {
    const s = startLife(seedTag, 'gb-london');
    s.startedAt = s.now - years * 365.25 * DAY;
    for (let i = 0; i < works; i++) work(s, { completed: `20${10 + i}-03-01`, base: 'gb-london' }).delivered!.at = s.now - (works - i) * 300 * DAY;
    return s;
  }

  it('a short career isn\'t considered; a long one with a body of work is', () => {
    const s = career('hon-short', 2, 3);
    const lifetime = cat('venice', 'lifetime');
    expect(honoraryChance(careerRecord(s, lifetime, s.now), 80)).toBe(0);
    const l = career('hon-long', 9, 30);
    const rec = careerRecord(l, lifetime, l.now);
    expect(rec.works).toBe(9);
    expect(honoraryChance(rec, 80)).toBeGreaterThan(0);
    expect(careerRecord(l, cat('emmys', categoriesFor(institution('emmys'), 2027).find((c) => c.kind === 'honorary' && c.career === 'television')?.id ?? 'x') ?? { career: 'television', recipient: 'career', formats: [] }, l.now).works).toBe(0); // films don't count for a television award
  });

  it('honours go to you at an announcement, cost nothing, create no entry, and are never redrawn', () => {
    const s = career('hon-give', 12, 35);
    const given: string[] = [];
    for (const e of s.editions.filter((x) => x.announce > s.now && x.year === 2027)) {
      announceEdition(s, e);
      for (const [id, r] of Object.entries(e.results)) if (r.honoree) given.push(`${e.id}/${id}`);
      expect(e.entries).toEqual([]);
    }
    expect(given.length).toBeGreaterThan(0);
    expect(given.every((k) => cat(k.split('/')[0].replace(/-\d+$/, ''), k.split('/')[1]).kind === 'honorary')).toBe(true);
    expect(honors(s).filter((h) => h.result === 'Honorary')).toHaveLength(given.length);
    const before = JSON.stringify(s.editions.map((e) => e.results));
    for (const e of s.editions.filter((x) => x.year === 2027)) announceEdition(s, e);
    expect(JSON.stringify(s.editions.map((e) => e.results))).toBe(before);
    const none = career('hon-none', 1, 2);
    for (const e of none.editions.filter((x) => x.announce > none.now && x.year === 2027)) announceEdition(none, e);
    expect(none.editions.some((e) => Object.values(e.results).some((r) => r.honoree))).toBe(false);
  });
});

describe('an entry that relied on a planned release is disqualified when the release is cancelled', () => {
  it('accepted provisionally, then disqualified before judging, with its fee kept', () => {
    const s = startLife('dq', 'us-los-angeles');
    s.now = at('America/Los_Angeles', '2026-10-01', 9);
    const osc = ed(s, 'oscars-2027');
    const p = work(s);
    p.releases.push({ id: 'r1', route: 'theatrical', date: '2026-12-01', territories: ['US'], distributor: 'D', note: '', status: 'planned' });
    expect(checkEligibility(s, p, osc, cat(osc, 'picture')).provisional).toBe(true);
    const entry = submitEntry(s, p, osc.id, 'picture');
    processUntil(s, osc.deadline + 1, 'tick', 100_000);
    expect(entry.status).toBe('accepted');
    p.releases[0].status = 'cancelled';
    announceEdition(s, osc);
    expect(entry.status).toBe('disqualified');
    expect(entry.reason).toMatch(/^Disqualified: .*The entry fee isn't refunded\.$/);
    expect(osc.results.picture).toBeUndefined();
  });
});

describe('renamed and retired categories across editions', () => {
  it('the Annies held one TV category until 2026 and four from 2027; older entries still find theirs', () => {
    const annie = institution('annie');
    expect(categoriesFor(annie, 2026).map((c) => c.id)).toContain('tv');
    expect(categoriesFor(annie, 2027).map((c) => c.id)).not.toContain('tv');
    expect(categoriesFor(annie, 2027).map((c) => c.id)).toEqual(expect.arrayContaining(['tv-preschool', 'tv-children', 'tv-mature', 'tv-limited']));
    expect(annie.categories.find((c) => c.id === 'tv')).toBeDefined();
  });
});

describe('an organizer\'s deadline never leaves the announcement before it', () => {
  it('every edition announces after its last entry deadline and before it starts (the Golden Globes 2027 did not)', () => {
    const s = startLife('order', 'us-los-angeles');
    for (const e of s.editions) {
      expect(e.announce > e.deadline, e.id).toBe(true);
      expect(e.announce < e.start, e.id).toBe(true);
    }
    expect(ed(s, 'golden-globes-2027').announce).toBe(ed(s, 'golden-globes-2027').deadline + 7 * DAY);
  });
});
