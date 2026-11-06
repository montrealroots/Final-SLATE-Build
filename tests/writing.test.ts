import { describe, expect, it } from 'vitest';
import {
  DAY, addNote, approvalImpact, approveDraft, diffDrafts, processUntil, restoreDraft, saveDraft, setNoteStatus, startRevision, updateScene,
  workingCopyDiffersFromLatestDraft,
} from './engine-api';
import { approve, buildProject, castAll, manage, staffAll, startLife, startProduction } from './helpers';

describe('writing regression', () => {
  it('compares drafts, restores an earlier one and keeps the working copy separate', () => {
    const s = startLife('write-cmp');
    const p = buildProject(s, { title: 'Glass Harbor', format: 'short', medium: 'live-action' },
      [{ name: 'Ines', patch: { roleSize: 'lead' } }], [{ place: 'Dock', chars: ['Ines'], minutes: 2 }, { place: 'Lighthouse', chars: ['Ines'], minutes: 2 }]);
    const d1 = saveDraft(s, p);
    updateScene(p, p.scenes[1].id, { action: 'Ines climbs the stairs in the dark.' });
    expect(workingCopyDiffersFromLatestDraft(p)).toBe(true);
    const d2 = saveDraft(s, p);
    expect(diffDrafts(d1, d2)).toContain('The ending has changed.');
    // Back to draft 1: the working copy matches it again; draft 2 is still there to return to.
    restoreDraft(p, d1.number);
    expect(p.scenes[1].action).toBe(d1.scenes[1].action);
    expect(p.drafts.map((d) => d.number)).toEqual([d1.number, d2.number]);
    restoreDraft(p, d2.number);
    expect(p.scenes[1].action).toBe('Ines climbs the stairs in the dark.');
  });

  it('a scheduled revision pass takes time and addresses the accepted notes', () => {
    const s = startLife('write-rev');
    const p = buildProject(s, { title: 'Glass Harbor', format: 'short', medium: 'live-action' },
      [{ name: 'Ines', patch: { roleSize: 'lead' } }], [{ place: 'Dock', chars: ['Ines'], minutes: 2 }]);
    saveDraft(s, p);
    const n = addNote(s, p, 'Give Ines a clearer want.', 'characterization', null);
    setNoteStatus(p, n.id, 'accepted');
    const { endsAt } = startRevision(s, p);
    expect(endsAt).toBeGreaterThan(s.now);
    expect(() => startRevision(s, p)).toThrow(/already underway/);
    processUntil(s, endsAt + 1, 'tick', 100000);
    expect(p.notes.find((x) => x.id === n.id)?.status).toBe('addressed');
    expect(p.revision).toBeNull();
  });

  it('re-approving after filming keeps unchanged scenes and redoes only the changed one', () => {
    const s = startLife('write-reapprove');
    const p = buildProject(s, { title: 'Glass Harbor', format: 'short', medium: 'live-action', scenario: 'micro' },
      [{ name: 'Ines', patch: { roleSize: 'lead' } }], [{ place: 'Dock', intExt: 'INT', chars: ['Ines'], minutes: 2 }, { place: 'Lighthouse', intExt: 'INT', chars: ['Ines'], minutes: 2 }]);
    approve(s, p);
    castAll(s, p);
    staffAll(s, p);
    for (let i = 0; i < 6; i++) {
      manage(s, p);
      processUntil(s, s.now + DAY, 'tick', 100000);
    }
    startProduction(s, p, 5);
    const [dock, light] = p.scenes.map((x) => x.id);
    const filmed = () => p.captures.filter((c) => c.version === p.approvedDraft && c.captured >= 0.8).map((c) => c.sceneId);
    for (let i = 0; i < 120 && filmed().length < 2; i++) {
      manage(s, p);
      processUntil(s, s.now + DAY, 'tick', 100000);
    }
    expect(filmed().sort()).toEqual([dock, light].sort());
    // Rewrite only the lighthouse scene.
    updateScene(p, light, { action: 'The lamp fails; Ines finishes the night by hand.' });
    const next = saveDraft(s, p);
    const impact = approvalImpact(p, next.number);
    expect(impact.some((t) => t.includes('Lighthouse') && t.includes('filming again'))).toBe(true);
    expect(impact.some((t) => t.includes('Dock'))).toBe(false);
    approveDraft(s, p, next.number);
    expect(filmed()).toEqual([dock]); // the dock footage is still good
  }, 120000);
});
