// SLATE-14-02.02: contributors' conditions on use are recorded with consent and respected in post, credits and delivery.
import { showCut } from '../src/engine/documentary-actions';
import { describe, expect, it } from 'vitest';
import { DAY, computeCredits, deliveryBlockers, processUntil, requestConsent } from './engine-api';
import { CUT_REVIEW_DAYS, ensureBlurTasks } from '../src/engine/documentary';
import { buildTasks } from '../src/engine/production/tasks';
import { editScenes, unlockPicture } from '../src/engine/finish';
import type { Project, Scene } from '../src/engine/types';
import { approve, buildProject, startLife } from './helpers';

const blankDoc = (id: string, contributor: string): Scene => ({
  id, episode: 1, heading: { intExt: 'INT', place: 'Boathouse', time: 'DAY' }, storyLocation: 'Boathouse', participants: [], objective: 'Hear them.', action: '',
  dialogue: [], turningPoint: '', estMinutes: 3, props: [], animals: [], vehicles: [], stunts: '', crowd: 0, intimacy: false, water: false, vfx: [],
  songs: [], dance: false, kind: 'interview', basis: 'sourced', contributorIds: [contributor], evidenceIds: [], intentionalDiscontinuity: false,
});

function doc(tag: string) {
  const s = startLife(tag, 'za-durban');
  const p = buildProject(s, { title: 'Tide Keepers', format: 'documentary-short', medium: 'live-action', genres: ['documentary'], runtime: 10 }, [], []);
  p.contributors.push({ id: 'ct1', name: 'Nomvula Dube', role: 'Lifeguard', consent: 'not-asked' });
  p.scenes.push(blankDoc('a1', 'ct1'), blankDoc('a2', 'ct1'));
  approve(s, p);
  return { s, p };
}
const c1 = (p: Project) => p.contributors.find((c) => c.id === 'ct1')!;

describe("contributors' conditions on use", () => {
  it('agreement comes with conditions drawn from the world seed, each kind appearing across worlds', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const { s, p } = doc(`restrict-${i}`);
      requestConsent(s, p, 'ct1');
      processUntil(s, s.now + 8 * DAY, 'tick', 100000);
      for (const r of c1(p).restrictions ?? []) seen.add(r);
      if (c1(p).consent !== 'given') expect(c1(p).restrictions).toBeUndefined();
    }
    expect([...seen].sort()).toEqual(['approval', 'face', 'name']);
  });

  it("a hidden face adds blurring after lock that delivery waits for; a withheld name is credited as withheld", () => {
    const { s, p } = doc('restrict-face');
    Object.assign(c1(p), { consent: 'given', restrictions: ['face', 'name'] }); // labelled fixture: the agreement's terms
    const blur = buildTasks(p).find((t) => t.id === 'post:blur:ct1')!;
    expect([blur.label, blur.units, blur.dependsOn]).toEqual(["Hide Nomvula Dube's Face", 1, ['milestone:lock:1']]);
    // Agreed after the plan was made: the work is added to the plan, once.
    p.tasks = buildTasks({ ...p, contributors: [] });
    ensureBlurTasks(p); ensureBlurTasks(p);
    expect(p.tasks.filter((t) => t.kind === 'post:blur')).toHaveLength(1);
    expect(computeCredits(s, p).find((c) => c.contribution === 'Featuring')!.personName).toBe('Name withheld at their request');
  });

  it('approval of the cut: shown once locked, answered in days; a refusal holds delivery until their scenes are cut', () => {
    const { s, p } = doc('restrict-approval');
    Object.assign(c1(p), { consent: 'given', restrictions: ['approval'] }); // labelled fixture: the agreement's terms
    expect(deliveryBlockers(p)).toContain('Nomvula Dube approves how they appear: show them the locked cut.');
    expect(() => showCut(s, p, 'ct1')).toThrow('Lock picture first');
    p.edit.pictureLocked = true; // labelled fixture: the cut is locked
    showCut(s, p, 'ct1');
    expect(deliveryBlockers(p)).toContain('Nomvula Dube is reviewing the cut.');
    processUntil(s, s.now + (CUT_REVIEW_DAYS + 1) * DAY, 'tick', 100000);
    const answer = c1(p).cutApproval!.status;
    expect(['approved', 'refused']).toContain(answer);
    // Unlocking changes the cut they saw: an approval or a review in progress is shown again; a refusal stays, since
    // unlocking is how their scenes get cut.
    c1(p).cutApproval = { status: 'approved', answerAt: s.now };
    unlockPicture(s, p);
    expect(c1(p).cutApproval).toBeUndefined();
    p.edit.pictureLocked = true;
    c1(p).cutApproval = { status: 'refused', answerAt: s.now };
    unlockPicture(s, p);
    expect(c1(p).cutApproval?.status).toBe('refused');
    void answer;
    // A refusal: their scenes leave the edit, and the blocker with them.
    expect(deliveryBlockers(p)).toContain("Nomvula Dube didn't approve how they appear. Cut their scenes to deliver.");
    p.edit.cutSceneIds = ['a1', 'a2'];
    expect(editScenes(p)).toHaveLength(0);
    expect(deliveryBlockers(p).some((b) => b.includes('Nomvula'))).toBe(false);
  });

});
