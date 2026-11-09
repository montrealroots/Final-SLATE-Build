// Recipient rules read from the organizers' documents (part 5 of the awards work, November 9, 2026): who may be entered for
// a work, beyond who is credited for it. Each test pairs the rule with the version or organizer that doesn't have it.
import { describe, expect, it } from 'vitest';
import { RULEBOOKS, categoryRecipients, checkEligibility, categoryRules, institution } from './engine-api';
import { approve, buildProject, startLife } from './helpers';
import type { Credit, GameState } from '../src/engine/types';

const credit = (id: string, characterName: string, person = 'player'): Credit => ({ id, person, personName: 'You', contribution: 'Cast', roleId: 'actor', characterName, episodes: 'all', billing: 5 });

/** A drama series whose narrator is a supporting part the player plays (labelled fixture: credits set directly). */
function narratedDrama(tag: string) {
  const s: GameState = startLife(tag, 'us-los-angeles');
  s.character.actingTitle = 'Actor';
  const p = buildProject(s, { title: 'Harbor Lights', format: 'short', medium: 'live-action', runtime: 20 },
    [{ name: 'Ines', patch: { roleSize: 'lead', functions: ['protagonist'] } }, { name: 'The Narrator', patch: { roleSize: 'supporting', functions: ['narrator'] } }],
    [{ place: 'Harbor', chars: ['Ines', 'The Narrator'], minutes: 3 }]);
  approve(s, p);
  Object.assign(p.axes, { format: 'series', episodeCount: 6, targetRuntimeMin: 50 }); // built as a short, then given the season under test
  p.credits = [credit('c1', 'Ines', 'p-ines'), credit('c2', 'The Narrator')];
  return { s, p };
}

describe('Emmys, Performer Categories: narrators may not enter lead, supporting or guest categories', () => {
  it('version 3 leaves the narrator out of Supporting Actor and says why; version 2 entered them', () => {
    const { s, p } = narratedDrama('rr-narr');
    const e = s.editions.find((x) => x.id === 'emmys-2027')!;
    expect(e.rulesId).toBe('emmys-2027@3');
    const cat = institution('emmys').categories.find((c) => c.id === 'supporting-actor')!;
    expect(categoryRules(e, cat.id)?.noNarrators?.value).toBe(true);
    expect(categoryRecipients(s, p, cat, undefined, categoryRules(e, cat.id))).toEqual([]);
    expect(checkEligibility(s, p, e, cat).reasons).toContain('A narrator can\'t be entered in this performer category; the narration can be entered for a narrator award.');
    // Version 2 hadn't read the Performer Categories rule, and an edition that took entries under it keeps it: there the
    // same part is entered.
    e.rulesId = 'emmys-2027@2';
    expect(checkEligibility(s, p, e, cat).reasons.join(' ')).not.toMatch(/narrator/);
    expect(checkEligibility(s, p, e, cat).recipients.map((c) => c.characterName)).toEqual(['The Narrator']);
  });

  it('applies only to the performer categories: a lead who isn\'t the narrator still enters, and other organizers don\'t have the rule', () => {
    const { s, p } = narratedDrama('rr-narr2');
    const e = s.editions.find((x) => x.id === 'emmys-2027')!;
    const lead = institution('emmys').categories.find((c) => c.id === 'lead-actor')!;
    p.credits = [credit('c1', 'Ines'), credit('c2', 'The Narrator', 'p-narr')];
    expect(checkEligibility(s, p, e, lead).recipients.map((c) => c.characterName)).toEqual(['Ines']);
    expect(categoryRules(e, 'drama')?.noNarrators).toBeUndefined();
    expect(categoryRules(e, 'narrator')?.noNarrators).toBeUndefined();
    // No other organizer's rules read so far exclude narrators.
    const others = RULEBOOKS.filter((b) => b.institutionId !== 'emmys').flatMap((b) => Object.entries(b.categories).filter(([, r]) => r.noNarrators).map(([id]) => `${b.id}/${id}`));
    expect(others).toEqual([]);
  });
});
