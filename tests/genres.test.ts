import { describe, expect, it } from 'vitest';
import registry from '../src/data/genre-registry.json';
import {
  GENRES, composeGenres, deriveRequirements, projectModules, scriptIssues, institution, checkEligibility, buildTasks,
} from './engine-api';
import { approve, buildProject, startLife } from './helpers';
import type { Project } from '../src/engine/types';

function withGenres(ids: string[], scenes: Parameters<typeof buildProject>[3] = [{ place: 'Kitchen', chars: ['Ana'], minutes: 2 }], extraChars: Parameters<typeof buildProject>[2] = []): Project {
  const s = startLife(`g-${ids.join('-')}`);
  return buildProject(s, { title: 'Genre Probe', format: 'short', medium: 'live-action', genres: ids, runtime: 10 }, [{ name: 'Ana', patch: { roleSize: 'lead' } }, ...extraChars], scenes);
}

describe('the 149-entry catalog', () => {
  it('keeps every registry ID and name with a mechanic mapping', () => {
    const recs = (registry as { records: { id: string; name: string }[] }).records;
    expect(recs.length).toBe(149);
    expect(GENRES.length).toBe(149);
    expect(new Set(GENRES.map((g) => g.id)).size).toBe(149);
    for (const r of recs) expect(GENRES.find((g) => g.id === r.id)?.name).toBe(r.name);
    for (const g of GENRES) {
      expect(g.modules.length, g.id).toBeGreaterThan(0);
      expect(g.questions.length, g.id).toBeGreaterThan(0);
      expect(g.definition.length, g.id).toBeGreaterThan(10);
    }
  });

  it('every entry reaches a consumer: its questions appear in readiness and answering them clears them', () => {
    const base = scriptIssues(withGenres([])).map((i) => i.text);
    for (const g of GENRES) {
      const p = withGenres([g.id]);
      const issues = scriptIssues(p).map((i) => i.text);
      const added = issues.filter((t) => !base.includes(t));
      expect(added.length, g.id).toBeGreaterThan(0);
      for (const q of g.questions) expect(issues.some((t) => t.includes(q.label)), `${g.id}: ${q.label}`).toBe(true);
      for (const q of g.questions) p.genreNotes[q.key] = 'Decided.';
      const after = scriptIssues(p).map((i) => i.text);
      for (const q of g.questions) expect(after.some((t) => t.includes(`: ${q.label}.`)), `${g.id} cleared`).toBe(false);
      // Genre choice never touches money or hiring directly.
      expect(p.obligations.length).toBe(0);
    }
  });

  it('signatures differ: no two entries share both modules and questions unless the registry says they share mechanics', () => {
    const sig = new Map<string, string[]>();
    for (const g of GENRES) {
      const k = `${[...g.modules].sort().join('+')}|${g.questions.map((q) => q.key).sort().join('+')}`;
      sig.set(k, [...(sig.get(k) ?? []), g.id]);
    }
    const dupes = [...sig.values()].filter((v) => v.length > 1);
    expect(dupes).toEqual([]);
  });

  it('composes shared mechanics once instead of stacking them', () => {
    const { modules, questions } = composeGenres(['crime', 'detective', 'whodunit']);
    expect([...modules]).toEqual(['clues']);
    const p = withGenres(['crime', 'detective', 'whodunit']);
    expect(scriptIssues(p).filter((i) => i.text === 'Add the clues your audience can follow.').length).toBe(1);
    expect(questions.length).toBe(new Set(questions.map((q) => q.key)).size);
    // Shared questions list every genre that asks them.
    expect(composeGenres(['espionage', 'spy']).questions.find((q) => q.key === 'covers')?.genres).toEqual(['Espionage', 'Spy']);
  });

  it('module consumers change the right downstream state and nothing else', () => {
    // Clues become hero props tied to the planting scene.
    const m = withGenres(['mystery'], [{ place: 'Study', chars: ['Ana'] }, { place: 'Hall', chars: ['Ana'] }]);
    m.setups.push({ id: 'k1', kind: 'clue', label: 'Torn Ticket', plantedIn: m.scenes[0].id, paidIn: m.scenes[1].id });
    const reqs = deriveRequirements(m, m.scenes, m.characters);
    expect(reqs.find((r) => r.kind === 'clue-prop')?.sceneIds).toEqual([m.scenes[0].id]);
    // The same clue without the Mystery label is a plain setup, not a hero-prop requirement.
    const plain = withGenres([], [{ place: 'Study', chars: ['Ana'] }, { place: 'Hall', chars: ['Ana'] }]);
    plain.setups.push({ id: 'k1', kind: 'clue', label: 'Torn Ticket', plantedIn: plain.scenes[0].id, paidIn: plain.scenes[1].id });
    expect(deriveRequirements(plain, plain.scenes, plain.characters).some((r) => r.kind === 'clue-prop')).toBe(false);
    // Payoff before plant is a blocking continuity error unless deliberately discontinuous.
    m.setups[0].plantedIn = m.scenes[1].id;
    m.setups[0].paidIn = m.scenes[0].id;
    expect(scriptIssues(m).some((i) => i.severity === 'blocking' && i.text.includes('pays off before'))).toBe(true);
    const sur = withGenres(['surrealist'], [{ place: 'Study', chars: ['Ana'] }, { place: 'Hall', chars: ['Ana'] }]);
    sur.setups.push({ id: 'k2', kind: 'setup', label: 'Clock', plantedIn: sur.scenes[1].id, paidIn: sur.scenes[0].id });
    sur.scenes[0].intentionalDiscontinuity = true;
    expect(scriptIssues(sur).some((i) => i.severity === 'blocking')).toBe(false);
    // Period settings add research and more wardrobe work; contemporary ones don't.
    const period = withGenres(['period-drama']);
    period.axes.storyEra = '1890s';
    const modern = withGenres(['period-drama']);
    const s1 = startLife('per');
    approve(s1, period);
    approve(s1, modern);
    expect(period.requirements.some((r) => r.kind === 'period-research')).toBe(true);
    expect(modern.requirements.some((r) => r.kind === 'period-research')).toBe(false);
    const cost = (p: Project) => buildTasks(p).find((t) => t.kind === 'prep:costume')!.units;
    expect(cost(period)).toBeGreaterThan(cost(modern));
    // Combat adds fight choreography to stunt scenes only.
    const fight = withGenres(['martial-arts'], [{ place: 'Dojo', chars: ['Ana'], extra: { stunts: 'Staff fight' } }, { place: 'Tea House', chars: ['Ana'] }]);
    const fr = deriveRequirements(fight, fight.scenes, fight.characters).filter((r) => r.kind === 'stunt');
    expect(fr.map((r) => r.label)).toEqual(['Staff fight', 'Fight Choreography: Staff fight']);
    expect(fr.every((r) => r.sceneIds.length === 1 && r.sceneIds[0] === fight.scenes[0].id)).toBe(true);
  });

  it('Western + Zombie + Comedy: requirements come from scenes, not labels', () => {
    const p = withGenres(['western', 'zombie', 'comedy'], [{ place: 'Saloon', chars: ['Ana', 'Rotting Rex'] }], [{ name: 'Rotting Rex', patch: { entity: 'undead', realization: 'prosthetics' } }]);
    const reqs = deriveRequirements(p, p.scenes, p.characters);
    expect(reqs.some((r) => r.kind === 'animal')).toBe(false); // no horse unless a scene uses one
    expect(reqs.some((r) => r.kind === 'crowd')).toBe(false); // the zombie label doesn't create a crowd
    expect(reqs.find((r) => r.kind === 'creature')?.label).toBe('Rotting Rex');
    expect([...projectModules(p)].sort()).toEqual(['action', 'creature', 'period', 'scale', 'setups', 'tonal']);
  });

  it('classification entries do their actual job', () => {
    // Animated label on a live-action project is flagged instead of silently changing the medium.
    expect(scriptIssues(withGenres(['animated'])).some((i) => i.severity === 'blocking' && i.text.includes('medium is live action'))).toBe(true);
    // Audience: an intimate scene conflicts with a children's audience.
    const kids = withGenres(['childrens'], [{ place: 'Park', chars: ['Ana'], extra: { intimacy: true } }]);
    kids.axes.audience = 'Children (6 To 11)';
    expect(scriptIssues(kids).some((i) => i.severity === 'blocking')).toBe(true);
    // Anthology: a character crossing stories needs a declared shared link.
    const s = startLife('anth');
    const a = buildProject(s, { title: 'Tales', format: 'anthology-series', medium: 'live-action', genres: ['anthology'], episodes: 2 }, [{ name: 'Wren' }],
      [{ place: 'Inn', chars: ['Wren'], extra: { episode: 1 } }, { place: 'Mill', chars: ['Wren'], extra: { episode: 2 } }]);
    expect(scriptIssues(a).some((i) => i.text.includes('appears in more than one story'))).toBe(true);
    a.genreNotes['shared-link-between-stories'] = 'Wren is the narrator who visits each place.';
    expect(scriptIssues(a).some((i) => i.text.includes('appears in more than one story'))).toBe(false);
  });

  it('genres route to award and festival categories by rule, not prestige', () => {
    const s = startLife('route');
    const make = (ids: string[]) => {
      const p = buildProject(s, { title: 'Route', format: 'feature', medium: 'live-action', genres: ids, runtime: 95 }, [{ name: 'Ana' }], [{ place: 'Room', chars: ['Ana'], minutes: 50 }]);
      approve(s, p);
      p.delivered = { at: s.now, runtimeMin: 95 };
      p.credits = [{ id: 'cr1', person: 'player', personName: 'Me', contribution: 'Produced By', roleId: 'producer', episodes: 'all', billing: 0 }];
      p.releases.push({ id: 'r', route: 'theatrical', date: '2026-06-01', territories: ['US'], distributor: 'X', note: '', status: 'released' });
      return p;
    };
    const comedy = make(['comedy']);
    const drama = make(['drama']);
    const ed = { ...s.editions.find((e) => e.institutionId === 'golden-globes' && e.year === 2027)! };
    ed.submissionOpens = s.now - 1;
    ed.deadline = s.now + 1e10;
    const gg = institution('golden-globes');
    const cat = (id: string) => gg.categories.find((c) => c.id === id)!;
    expect(checkEligibility(s, comedy, ed, cat('comedy')).eligible).toBe(true);
    expect(checkEligibility(s, comedy, ed, cat('drama')).eligible).toBe(false);
    expect(checkEligibility(s, drama, ed, cat('drama')).eligible).toBe(true);
    expect(checkEligibility(s, drama, ed, cat('comedy')).eligible).toBe(false);
  });
});
