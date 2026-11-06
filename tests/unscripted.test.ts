import { describe, expect, it } from 'vitest';
import { buildTasks, scriptIssues, neededRoles, processUntil, DAY } from './engine-api';
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
