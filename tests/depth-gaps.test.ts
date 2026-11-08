// Stage 12 of the gameplay-depth package: tests for children that were built before the package and had none
// (docs/depth/COVERAGE-LEDGER.csv rows marked IMPLEMENTED UNVERIFIED). Each asserts the rule, not only the sentence.
import { describe, expect, it } from 'vitest';
import { computeCredits, costBreakdown, estimateDays, neededRoles, projectedCost, proposeStaffing, roleCandidates, scriptIssues, unlockPicture, validateAxes } from '../src/engine';
import { buildTasks } from '../src/engine/production/tasks';
import { breakdownComplete } from '../src/engine/script-explain';
import type { ProjectAxes } from '../src/engine/types';
import { approve, buildProject, castAll, startLife } from './helpers';

describe('project axes (SLATE-03-01)', () => {
  it('an unsupported combination is refused with the reason, and the axes are left as they were', () => {
    const s = startLife('gaps-axes');
    const p = buildProject(s, { title: 'Ink', format: 'short', medium: 'live-action', runtime: 10 }, [], [{ place: 'Room', chars: [] }]);
    const before = JSON.stringify(p.axes);
    const bad: ProjectAxes = { ...p.axes, technique: 'stop-motion' };
    expect(validateAxes(bad)).toEqual(['Live-action projects have no animation technique.']);
    expect(validateAxes({ ...p.axes, medium: 'animation', technique: 'none' })).toEqual(['Choose an animation technique.']);
    expect(validateAxes({ ...p.axes, targetRuntimeMin: 41 })).toEqual(['A short film runs 40 minutes or less in this game.']);
    expect(validateAxes(p.axes)).toEqual([]);
    expect(JSON.stringify(p.axes)).toBe(before); // validating converts nothing
  });
});

describe('dialogue continuity (SLATE-06-02)', () => {
  it('a line whose speaker has left the scene blocks approval until repaired or marked deliberate', () => {
    const s = startLife('gaps-speaker');
    const p = buildProject(s, { title: 'Ink', format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ada' }, { name: 'Bo' }], [{ place: 'Room', chars: ['Ada', 'Bo'] }]);
    const sc = p.scenes[0];
    const bo = p.characters.find((c) => c.name === 'Bo')!.id;
    sc.dialogue.push({ id: 'l1', characterId: bo, text: 'Hello.', language: 'en' });
    const speakerIssue = () => scriptIssues(p).filter((i) => i.text.includes("dialogue for a character who isn't in the scene"));
    expect(speakerIssue()).toEqual([]);
    sc.participants = sc.participants.filter((c) => c !== bo); // Bo leaves the scene; the line stays
    expect(speakerIssue().map((i) => [i.severity, i.sceneId])).toEqual([['blocking', sc.id]]);
    sc.intentionalDiscontinuity = true;
    expect(speakerIssue()).toEqual([]);
  });
});

describe('the estimate (SLATE-07-02)', () => {
  it('covers every episode: scenes added to a later episode raise the projected cost', () => {
    const s = startLife('gaps-episodes');
    const one = buildProject(s, { title: 'Two Halves', format: 'series', medium: 'live-action', episodes: 2, runtime: 20 }, [{ name: 'Ada' }],
      [{ place: 'Room', chars: ['Ada'], minutes: 10 }, { place: 'Street', chars: ['Ada'], minutes: 10, extra: { episode: 2 } }]);
    approve(s, one);
    const two = buildProject(s, { title: 'Two Halves Longer', format: 'series', medium: 'live-action', episodes: 2, runtime: 20 }, [{ name: 'Ada' }],
      [{ place: 'Room', chars: ['Ada'], minutes: 10 }, { place: 'Street', chars: ['Ada'], minutes: 10, extra: { episode: 2 } }, { place: 'Field', chars: ['Ada'], minutes: 10, intExt: 'EXT', extra: { episode: 2 } }]);
    approve(s, two);
    expect(projectedCost(s, two).total).toBeGreaterThan(projectedCost(s, one).total);
  });
});

describe('crew roles (SLATE-10-01)', () => {
  it('each role says why it is needed, and a scene element brings its specialist with that reason', () => {
    const s = startLife('gaps-roles');
    const p = buildProject(s, { title: 'Ink', format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ada' }],
      [{ place: 'Pier', chars: ['Ada'], intExt: 'EXT', extra: { stunts: 'A fall from the pier.' } }]);
    approve(s, p);
    const roles = neededRoles(p, s);
    expect(roles.length).toBeGreaterThan(0);
    for (const r of roles) expect(r.reason.length).toBeGreaterThan(10);
    const stunt = roles.find((r) => r.roleId === 'stunt-coordinator')!;
    expect(stunt.required).toBe(true);
    expect(stunt.reason).toMatch(/stunt/i);
    p.scenes[0].stunts = '';
    approve(s, p);
    expect(neededRoles(p, s).some((r) => r.roleId === 'stunt-coordinator')).toBe(false);
  });
});

describe('unlocking the picture (SLATE-15-04)', () => {
  it('restarts finishing work that waited on the lock and leaves the rest alone', () => {
    const s = startLife('gaps-unlock');
    const p = buildProject(s, { title: 'Ink', format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ada' }], [{ place: 'Room', chars: ['Ada'] }]);
    approve(s, p);
    p.tasks = buildTasks(p); // as production start builds them
    const afterLock = p.tasks.filter((t) => t.dependsOn.some((d) => d.startsWith('milestone:lock')));
    const before = p.tasks.filter((t) => !afterLock.includes(t));
    expect(afterLock.length).toBeGreaterThan(0);
    // Labelled fixture: the picture is locked and finishing work and shooting are underway.
    p.edit.pictureLocked = true;
    for (const t of p.tasks) { t.done = 1; t.status = 'active'; }
    const reset = unlockPicture(s, p);
    expect(reset.sort()).toEqual(afterLock.map((t) => t.label).sort());
    for (const t of afterLock) expect([t.done, t.status]).toEqual([0, 'waiting']);
    for (const t of before) expect(t.done).toBe(1);
    expect(p.edit.pictureLocked).toBe(false);
    expect(() => unlockPicture(s, p)).toThrow("The picture isn't locked.");
  });
});

describe('the estimate with no one to price (SLATE-08-01)', () => {
  it('names a part no experienced performer can take and prices it at the lowest rate, never as free', () => {
    const s = startLife('gaps-unpriced');
    const p = buildProject(s, { title: 'Ink', format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ada', patch: { roleSize: 'lead' } }], [{ place: 'Room', chars: ['Ada'] }]);
    approve(s, p);
    const priced = projectedCost(s, p);
    expect(priced.uncertain).toEqual([]);
    expect(priced.cast).toBeGreaterThan(0);
    for (const x of roleCandidates(s, p, 'actor')) x.experience = 1; // labelled fixture: no experienced actor in the pool
    const unpriced = projectedCost(s, p);
    expect(unpriced.uncertain).toEqual(['Ada (on camera)']);
    // Priced at the lowest rate anyone asks, never at nothing (November 8, 2026), and flagged with how to resolve it.
    const cheapest = Math.min(...roleCandidates(s, p, 'actor').map((x) => x.dayRate));
    expect(unpriced.cast).toBe(cheapest * estimateDays(p, 'actor', p.characters[0].id, 'on-camera'));
    expect(costBreakdown(s, p).uncertain[0].resolve).toBe('Cast yourself, consider less experienced performers, or invite people to read.');
  });
});

describe('wants and fears (SLATE-05-04)', () => {
  it('a casting breakdown goes with offers only once the description, wants and fears are all written', () => {
    const part = { description: 'A ferry captain.', wants: 'To keep the route.', fears: '' };
    expect(breakdownComplete(part)).toBe(false);
    expect(breakdownComplete({ ...part, fears: 'The sea.' })).toBe(true);
    expect(breakdownComplete({ ...part, fears: '   ' })).toBe(false);
    expect(breakdownComplete({ ...part, wants: '', fears: 'The sea.' })).toBe(false);
  });
});

describe('a character in no scene (SLATE-05-05)', () => {
  it('creates no casting offer, no fee in the estimate, no work and no credit', () => {
    const s = startLife('gaps-ghost');
    const make = (title: string, ghost: boolean) => {
      const p = buildProject(s, { title, format: 'short', medium: 'live-action', runtime: 10 },
        [{ name: 'Ada', patch: { roleSize: 'lead' } }, ...(ghost ? [{ name: 'Ghost', patch: { roleSize: 'supporting' } }] : [])], [{ place: 'Room', chars: ['Ada'] }]);
      approve(s, p);
      return p;
    };
    const with_ = make('With A Ghost', true);
    const without = make('Without', false);
    const ghost = with_.characters.find((c) => c.name === 'Ghost')!.id;
    expect(projectedCost(s, with_).cast).toBe(projectedCost(s, without).cast);
    castAll(s, with_);
    expect(with_.hires.some((h) => h.characterId === ghost)).toBe(false);
    expect(buildTasks(with_).some((t) => t.assetRef === ghost)).toBe(false);
    with_.cast.push({ characterId: ghost, performer: 'player', method: 'on-camera', note: '' }); // labelled fixture: cast anyway
    with_.cast.push({ characterId: with_.characters.find((c) => c.name === 'Ada')!.id, performer: 'player', method: 'on-camera', note: '' });
    const credits = computeCredits(s, with_);
    expect(credits.some((c) => c.characterName === 'Ada')).toBe(true); // a part in a scene is credited
    expect(credits.some((c) => c.characterName === 'Ghost')).toBe(false);
  });
});

describe('no candidate (SLATE-10-02)', () => {
  it('staffing names a role no one is free for, apart from one no one affordable can take', () => {
    const s = startLife('gaps-nobody');
    const p = buildProject(s, { title: 'Ink', format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ada' }], [{ place: 'Room', chars: ['Ada'] }]);
    approve(s, p);
    const dept = neededRoles(p, s).find((r) => r.roleId === 'editor')!.dept;
    expect(proposeStaffing(s, p, dept).proposals.some((x) => x.roleId === 'editor')).toBe(true);
    for (const x of roleCandidates(s, p, 'editor')) x.busy.push({ from: '2026-01-01', to: '2030-12-31' }); // labelled fixture: every editor booked elsewhere
    const { proposals, skipped } = proposeStaffing(s, p, dept);
    expect(proposals.some((x) => x.roleId === 'editor')).toBe(false);
    expect(skipped).toContain('Editor: no one is free for your production window. Clear Only Show People Who Are Free on the Crew page to see who is booked, or move your start date.');
  });
});
