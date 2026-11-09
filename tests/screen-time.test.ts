// Screen time from the finished edit (src/engine/screen-time.ts, November 9, 2026). The Emmys' 5% rule (Performer
// Awards; emmys-2026@4 screenShare) read the approved script until then: every listed scene counted whole and an episode
// ran its target length. Now it reads what the player recorded from the cut, against the cut's own running time.
import { describe, expect, it } from 'vitest';
import { categoryRules, checkEligibility, cutFromEdit, institution, submitEntry } from './engine-api';
import { clearScreenTime, recordScreenTime, screenTotal, shareCheck } from '../src/engine/screen-time';
import { addVersion } from '../src/engine/versions';
import { approve, buildProject, startLife } from './helpers';
import type { Credit, GameState } from '../src/engine/types';

const credit = (id: string, characterName: string, extra: Partial<Credit> = {}): Credit => ({ id, person: 'player', personName: 'You', contribution: 'Cast', roleId: 'actor', characterName, episodes: [1], billing: 5, ...extra });

/**
 * A drama series whose first episode is a 46-minute harbor scene with Ines and a 4-minute dock scene with Ines and Marcus,
 * a guest (labelled fixture: built as a short, given the season's format, credits set directly).
 */
function episode(tag: string, extraScenes: { place: string; chars: string[]; minutes: number }[] = []) {
  const s: GameState = startLife(tag, 'us-los-angeles');
  s.character.actingTitle = 'Actor';
  const p = buildProject(s, { title: 'Harbor Lights', format: 'short', medium: 'live-action', runtime: 20 },
    [{ name: 'Ines', patch: { roleSize: 'lead' } }, { name: 'Marcus', patch: { roleSize: 'small', seriesInvolvement: 'guest', awardPlacement: 'none' } }],
    [{ place: 'Harbor', chars: ['Ines'], minutes: 46 }, { place: 'Dock', chars: ['Ines', 'Marcus'], minutes: 4 }, ...extraScenes]);
  approve(s, p);
  Object.assign(p.axes, { format: 'series', episodeCount: 6, targetRuntimeMin: 50, register: 'drama' });
  p.credits = [credit('m1', 'Marcus')];
  const id = (name: string) => p.characters.find((c) => c.name === name)!.id;
  const scene = (place: string) => p.scenes.find((x) => x.heading.place === place)!;
  return { s, p, id, scene, e: s.editions.find((x) => x.id === 'emmys-2027')!, guest: institution('emmys').categories.find((c) => c.id === 'guest-actor')! };
}

describe('screen time is recorded from the cut, and unknown until it is', () => {
  it('an unrecorded scene is a range, never zero and never the whole scene', () => {
    const { s, p, id, scene, e, guest } = episode('st-unknown');
    const t = screenTotal(p, id('Marcus'), p.scenes);
    expect(t).toMatchObject({ recorded: 0, unknown: 4, unrecordedScenes: 1, of: 50 });
    const el = checkEligibility(s, p, e, guest);
    expect(el.recipients).toEqual([]);
    expect(el.reasons.join(' ')).toMatch(/Marcus is on screen 0 minutes of episode 1 \(50 minutes\), 0%, as recorded from the cut, and their scene there \(up to 4 minutes\) isn't recorded yet\. This category needs 5% \(2\.5 minutes\): record their screen time in the Edit tab to show it\./);
    // Recorded: 2 minutes is 4%, too little; 2.5 is 5%, enough.
    recordScreenTime(s, p, scene('Dock').id, id('Marcus'), 2);
    expect(checkEligibility(s, p, e, guest).reasons.join(' ')).toMatch(/Marcus is on screen 2 minutes of episode 1 \(50 minutes\), 4%, as recorded from the cut; this category needs 5% \(2\.5 minutes\)\./);
    recordScreenTime(s, p, scene('Dock').id, id('Marcus'), 2.5);
    expect(checkEligibility(s, p, e, guest).recipients.map((c) => c.characterName)).toEqual(['Marcus']);
    // Taking the record back makes it unknown again, not zero.
    clearScreenTime(p, scene('Dock').id, id('Marcus'));
    expect(screenTotal(p, id('Marcus'), p.scenes)).toMatchObject({ recorded: 0, unknown: 4 });
    // Version 3 of the Emmys' rules didn't measure screen time at all.
    e.rulesId = 'emmys-2027@3';
    expect(checkEligibility(s, p, e, guest).recipients.map((c) => c.characterName)).toEqual(['Marcus']);
  });

  it('two performers can share the same minutes; nobody is on screen longer than the scene', () => {
    const { s, p, id, scene } = episode('st-share');
    const dock = scene('Dock');
    recordScreenTime(s, p, dock.id, id('Ines'), 4);
    recordScreenTime(s, p, dock.id, id('Marcus'), 4); // the whole scene, together: no shared total to exceed
    expect(screenTotal(p, id('Ines'), [dock]).recorded).toBe(4);
    expect(screenTotal(p, id('Marcus'), [dock]).recorded).toBe(4);
    expect(() => recordScreenTime(s, p, dock.id, id('Marcus'), 4.5)).toThrow('The scene runs 4 minutes; nobody is on screen longer than that.');
    expect(() => recordScreenTime(s, p, dock.id, id('Marcus'), 3, 1.5)).toThrow('Seen and heard-only time together can\'t be more than the scene\'s 4 minutes.');
    expect(() => recordScreenTime(s, p, dock.id, id('Marcus'), -1)).toThrow('On-screen time has to be zero or more minutes.');
    expect(() => recordScreenTime(s, p, scene('Harbor').id, id('Marcus'), 1)).toThrow('That part isn\'t in this scene.');
  });

  it('heard but not seen is kept apart, and doesn\'t count toward time on screen', () => {
    const { s, p, id, scene, e, guest } = episode('st-voice');
    recordScreenTime(s, p, scene('Dock').id, id('Marcus'), 0, 4); // a voice on the phone for the whole scene
    expect(screenTotal(p, id('Marcus'), p.scenes)).toMatchObject({ recorded: 0, heardOnly: 4, unknown: 0 });
    const why = checkEligibility(s, p, e, guest).reasons.join(' ');
    expect(why).toMatch(/Marcus is on screen 0 minutes of episode 1 \(50 minutes\), 0%, as recorded from the cut, besides 4 minutes heard but not seen, which doesn't count; this category needs 5%/);
  });

  it('an edit changes eligibility: cutting another scene shortens the episode; cutting theirs takes them out', () => {
    const { s, p, id, scene, e, guest } = episode('st-edit', [{ place: 'Market', chars: ['Ines'], minutes: 15 }]);
    recordScreenTime(s, p, scene('Dock').id, id('Marcus'), 2.5); // 2.5 of a 65-minute episode: under 5%
    expect(shareCheck(p, p.credits[0], 0.05, 'episode').met).toBe(false);
    expect(checkEligibility(s, p, e, guest).reasons.join(' ')).toMatch(/2\.5 minutes of episode 1 \(65 minutes\), 3\.8%/);
    cutFromEdit(s, p, scene('Market').id); // the episode is now 50 minutes
    expect(checkEligibility(s, p, e, guest).recipients.map((c) => c.characterName)).toEqual(['Marcus']);
    cutFromEdit(s, p, scene('Dock').id); // cut material contributes nothing
    expect(checkEligibility(s, p, e, guest).reasons.join(' ')).toMatch(/Marcus isn't in the cut\./);
  });

  it('a record longer than its scene is now (the script changed) counts as unknown', () => {
    const { s, p, id, scene } = episode('st-stale');
    recordScreenTime(s, p, scene('Dock').id, id('Marcus'), 4);
    p.drafts.find((d) => d.number === p.approvedDraft)!.scenes.find((x) => x.heading.place === 'Dock')!.estMinutes = 3;
    expect(screenTotal(p, id('Marcus'), p.drafts.find((d) => d.number === p.approvedDraft)!.scenes)).toMatchObject({ recorded: 0, unknown: 3 });
  });

  it('a limited series\' supporting part is measured against the whole cut entered, and a version is its own cut', () => {
    const { s, p, id, scene, e } = episode('st-whole', [{ place: 'Market', chars: ['Ines'], minutes: 30 }]);
    Object.assign(p.axes, { format: 'limited-series', episodeCount: 1 });
    p.drafts.find((d) => d.number === p.approvedDraft)!.characters.find((c) => c.name === 'Marcus')!.awardPlacement = 'supporting';
    p.credits = [credit('m1', 'Marcus', { episodes: 'all' })];
    const cat = institution('emmys').categories.find((c) => c.id === 'supporting-actor-limited')!;
    expect(categoryRules(e, cat.id)?.screenShare?.value).toEqual({ atLeast: 0.05, per: 'whole' });
    recordScreenTime(s, p, scene('Dock').id, id('Marcus'), 3); // 3 of 80 minutes: 3.75%
    expect(checkEligibility(s, p, e, cat).reasons.join(' ')).toMatch(/Marcus is on screen 3 minutes of the 80 minutes cut, 3\.8%/);
    // A version that leaves the market out runs 50 minutes: there it is 6%.
    p.edit.pictureLocked = true;
    const v = addVersion(s, p, 'Festival Cut', [scene('Market').id]);
    expect(checkEligibility(s, p, e, cat, undefined, v.id).recipients.map((c) => c.characterName)).toEqual(['Marcus']);
    expect(checkEligibility(s, p, e, cat).recipients).toEqual([]); // the main cut is unchanged
  });

  it('an entry keeps the calculation it was entered with; recording more later doesn\'t rewrite it', () => {
    const { s, p, id, scene, e, guest } = episode('st-snap');
    recordScreenTime(s, p, scene('Dock').id, id('Marcus'), 3);
    p.delivered = { at: s.now, runtimeMin: 50 };
    p.quality = { overall: 60, script: 60, direction: 60, craft: 60, reception: 60, [`performance:${id('Marcus')}:player`]: 70 };
    p.releases.push({ id: 'r1', route: 'streaming', date: '2026-09-01', territories: ['US'], distributor: 'D', note: '', status: 'released' });
    s.now = e.submissionOpens + 1;
    const entry = submitEntry(s, p, e.id, guest.id);
    expect(entry.episode).toBe(1); // the episode measured: their best
    expect(entry.snapshot!.screen![0].text).toMatch(/Marcus is on screen 3 minutes of episode 1 \(50 minutes\), 6%/);
    recordScreenTime(s, p, scene('Dock').id, id('Marcus'), 1);
    expect(entry.snapshot!.screen![0].text).toMatch(/3 minutes/);
  });
});
