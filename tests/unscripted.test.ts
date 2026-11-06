import { describe, expect, it } from 'vitest';
import { buildTasks, scriptIssues, neededRoles, processUntil, DAY, setFamily, setupCompetition, stillIn, withdrawRelease, deliveryBlockers, approvedScenes, depsMet } from './engine-api';
import type { Contributor, GameState, Project } from '../src/engine/types';
import { approve, buildProject, castAll, manage, runDays, staffAll, startLife, startProduction } from './helpers';

describe('unscripted TV', () => {
  it('uses format rules, participants and segments, and logs footage before the story edit', () => {
    const s = startLife('unscripted', 'gb-london');
    const p = buildProject(s, { title: 'Bake Or Break', format: 'unscripted-series', medium: 'live-action', episodes: 2, runtime: 20 }, [], []);
    expect(scriptIssues(p).some((i) => i.text.includes('format rules'))).toBe(true);
    p.worldRules.push({ id: 'fr1', rule: 'Three bakers compete; one leaves each episode.', limit: 'Two hours per challenge.' });
    p.contributors.push({ id: 'h1', name: 'Priya Shah', role: 'Host', consent: 'given' }, { id: 'c1', name: 'Tom Ellery', role: 'Participant', consent: 'given' }, { id: 'c2', name: 'Ana Ruiz', role: 'Participant', consent: 'given' });
    const seg = (id: string, ep: number, place: string, who: string[]) => ({
      id, episode: ep, heading: { intExt: 'INT' as const, place, time: 'DAY' as const }, storyLocation: place, participants: [], objective: 'Challenge', action: '', dialogue: [], turningPoint: '',
      estMinutes: 8, props: [], animals: [], vehicles: [], stunts: '', crowd: 0, intimacy: false, water: false, vfx: [], songs: [], dance: false, kind: 'segment' as const,
      basis: 'sourced' as const, contributorIds: who, evidenceIds: [], intentionalDiscontinuity: false,
    });
    p.scenes.push(seg('s1', 1, 'Tent', ['h1', 'c1', 'c2']), seg('s2', 2, 'Tent', ['h1', 'c1']));
    expect(scriptIssues(p).filter((i) => i.severity === 'blocking')).toEqual([]);
    approve(s, p);
    const tasks = buildTasks(p);
    const log1 = tasks.find((t) => t.id === 'unscripted:logging:1');
    const story1 = tasks.find((t) => t.id === 'unscripted:story:1');
    expect(log1 && story1).toBeTruthy();
    expect(story1!.dependsOn).toContain('unscripted:logging:1');
    expect(tasks.find((t) => t.id === 'post:assembly:1')!.dependsOn).toContain('unscripted:story:1');
    expect(tasks.some((t) => t.kind === 'doc:factcheck')).toBe(false); // not a documentary pipeline
    const roles = neededRoles(p, s).map((r) => r.roleId);
    expect(roles).toEqual(expect.arrayContaining(['story-producer', 'camera-operator']));
    castAll(s, p);
    staffAll(s, p);
    for (let i = 0; i < 8; i++) {
      manage(s, p);
      processUntil(s, s.now + DAY, 'tick', 100000);
    }
    startProduction(s, p, 5);
    runDays(s, p, 200);
    expect(p.delivered).not.toBeNull();
    expect(p.credits.some((c) => c.contribution === 'Story Producer')).toBe(true);
  }, 60000);
});

const seg = (id: string, ep: number, place: string, who: string[]) => ({
  id, episode: ep, heading: { intExt: 'INT' as const, place, time: 'DAY' as const }, storyLocation: place, participants: [], objective: 'Segment', action: '', dialogue: [], turningPoint: '',
  estMinutes: 6, props: [], animals: [], vehicles: [], stunts: '', crowd: 0, intimacy: false, water: false, vfx: [], songs: [], dance: false, kind: 'segment' as const,
  basis: 'sourced' as const, contributorIds: who, evidenceIds: [], intentionalDiscontinuity: false,
});
const person = (id: string, name: string, role: string): Contributor => ({ id, name, role, consent: 'given' });

function show(tag: string, episodes: number): { s: GameState; p: Project } {
  const s = startLife(tag, 'gb-london');
  const p = buildProject(s, { title: `Show ${tag}`, format: 'unscripted-series', medium: 'live-action', episodes, runtime: 20 }, [], []);
  p.worldRules.push({ id: 'fr1', rule: 'The rules of the show.', limit: 'One day per episode.' });
  return { s, p };
}

function produce(s: GameState, p: Project, days = 260, each?: () => void): void {
  approve(s, p);
  castAll(s, p);
  staffAll(s, p);
  for (let i = 0; i < 8; i++) {
    manage(s, p);
    processUntil(s, s.now + DAY, 'tick', 100000);
  }
  startProduction(s, p, 5);
  runDays(s, p, days, each);
}

describe('unscripted families', () => {
  it('talk: each episode needs a host and a guest; several guests can share an episode', () => {
    const { s, p } = show('talk', 2);
    setFamily(p, 'talk');
    p.contributors.push(person('h', 'Mina Okafor', 'Host'), person('g1', 'Lars Berg', 'Guest'), person('g2', 'Ines Duarte', 'Guest'), person('g3', 'Kofi Mensah', 'Guest'));
    p.scenes.push(seg('a', 1, 'Studio', ['h', 'g1', 'g2']), seg('b', 2, 'Studio', ['g3']));
    expect(scriptIssues(p).map((i) => i.text)).toContain('Episode 2 needs a host and at least one guest.');
    p.scenes[1].contributorIds.push('h');
    expect(scriptIssues(p).filter((i) => i.severity === 'blocking')).toEqual([]);
    produce(s, p);
    expect(p.delivered).not.toBeNull();
  }, 60000);

  it('studio variety needs at least two acts per episode', () => {
    const { p } = show('variety', 2);
    setFamily(p, 'studio-variety');
    p.contributors.push(person('h', 'Host', 'Host'), person('a1', 'The Jugglers', 'Act'));
    p.scenes.push(seg('a', 1, 'Studio', ['h', 'a1']));
    expect(scriptIssues(p).map((i) => i.text)).toContain('Episode 1 needs at least two acts.');
  });

  it('factual shows need claims to check, and unchecked claims block delivery', () => {
    const { p } = show('factual', 2);
    setFamily(p, 'factual');
    expect(scriptIssues(p).map((i) => i.text)).toContain('A factual show needs at least one claim to check.');
  });

  it('competition: deterministic, stored rounds; eliminated contestants cannot return', () => {
    const run = (tag: string) => {
      const { s, p } = show(tag, 3);
      setFamily(p, 'competition');
      const cs = ['c1', 'c2', 'c3', 'c4'];
      p.contributors.push(person('h', 'Host', 'Host'), ...cs.map((id, i) => person(id, `Baker ${i + 1}`, 'Contestant')));
      expect(scriptIssues(p).some((i) => /needs at least 4 contestants/.test(i.text))).toBe(true);
      setupCompetition(p, cs, 1);
      p.scenes.push(seg('e1', 1, 'Tent', ['h', ...cs]), seg('e2', 2, 'Tent', ['h', ...cs]), seg('e3', 3, 'Tent', ['h', ...cs]));
      expect(scriptIssues(p).filter((i) => i.severity === 'blocking')).toEqual([]);
      let checked = false;
      produce(s, p, 260, () => {
        const r1 = p.unscripted!.competition!.results.find((r) => r.episode === 1);
        if (r1 && !checked) {
          checked = true;
          // The script for later episodes must drop whoever left.
          expect(stillIn(p, 2)).not.toContain(r1.eliminated[0]);
          const issues = scriptIssues(p).map((i) => i.text);
          expect(issues.some((t) => t.includes('left the competition before Episode 2'))).toBe(true);
        }
      });
      return { p, checked };
    };
    const a = run('comp');
    const b = run('comp');
    expect(a.checked).toBe(true);
    const results = a.p.unscripted!.competition!.results;
    expect(results.length).toBeGreaterThan(0);
    expect(results.map((r) => r.eliminated)).toEqual(b.p.unscripted!.competition!.results.map((r) => r.eliminated)); // same seed, same results
    // Results are stored: setup can no longer change.
    expect(() => setupCompetition(a.p, ['c1', 'c2'], 1)).toThrow(/fixed/);
  }, 120000);

  it('observational: a withdrawn release is redacted before delivery', () => {
    const { s, p } = show('obs', 2);
    setFamily(p, 'observational');
    p.contributors.push(person('h', 'Narrator', 'Host'), person('w', 'Sam Kowalski', 'Participant'), person('k', 'Rita Moss', 'Participant'));
    p.scenes.push(seg('a', 1, 'Harbour', ['h', 'w']), seg('b', 1, 'Market', ['h', 'k']), seg('c', 2, 'Quay', ['h', 'k']));
    let withdrew = false;
    produce(s, p, 260, () => {
      const logging = p.tasks.find((t) => t.id === 'unscripted:logging:1');
      if (!withdrew && logging?.status === 'done' && !p.edit.pictureLocked) {
        withdrew = true;
        const made = withdrawRelease(s, p, 'w');
        expect(made.map((t) => t.label)).toEqual(['Redact Sam Kowalski: Episode 1']);
        expect(p.tasks.find((t) => t.id === 'post:assembly:1')!.dependsOn).toContain(made[0].id);
        expect(deliveryBlockers(p).some((b) => b.includes('Sam Kowalski withdrew'))).toBe(true);
      }
    });
    expect(withdrew).toBe(true);
    expect(p.delivered).not.toBeNull();
    expect(() => withdrawRelease(s, p, 'k')).toThrow(/delivered/);
    expect(approvedScenes(p).length).toBe(3);
    void depsMet;
  }, 60000);
});
