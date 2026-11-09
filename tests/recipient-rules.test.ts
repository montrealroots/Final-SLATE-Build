// Recipient rules read from the organizers' documents (part 5 of the awards work, November 9, 2026): who may be entered for
// a work, beyond who is credited for it. Each test pairs the rule with the version or organizer that doesn't have it.
import { describe, expect, it } from 'vitest';
import { DAY, RULEBOOKS, acceptDeal, approachBacker, categoryRecipients, checkEligibility, categoryRules, entryEpisodes, institution, nonEnglishShare, processUntil, submitEntry } from './engine-api';
import { requirementProblems } from '../src/engine/awards-rules';
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
    expect(e.rulesId).toBe('emmys-2027@4'); // version 4 keeps version 3's performer rules and adds one-episode entries
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

describe('Emmys, Performer Awards: a guest is in fewer than half the episodes, a short form performer in half or more', () => {
  /** A six-episode drama series with a declared guest part the player plays, credited in the given episodes. */
  function guested(tag: string, episodes: number[]) {
    const s: GameState = startLife(tag, 'us-los-angeles');
    s.character.actingTitle = 'Actor';
    const p = buildProject(s, { title: 'Harbor Lights', format: 'short', medium: 'live-action', runtime: 20 },
      [{ name: 'Ines', patch: { roleSize: 'lead', functions: ['protagonist'] } }, { name: 'Marcus', patch: { roleSize: 'supporting', seriesInvolvement: 'guest' } }],
      [{ place: 'Harbor', chars: ['Ines', 'Marcus'], minutes: 3 }]);
    approve(s, p);
    Object.assign(p.axes, { format: 'series', episodeCount: 6, targetRuntimeMin: 50 });
    p.credits = [credit('c1', 'Ines', 'p-ines'), { ...credit('c2', 'Marcus'), episodes }];
    return { s, p, e: s.editions.find((x) => x.id === 'emmys-2027')!, cat: institution('emmys').categories.find((c) => c.id === 'guest-actor')! };
  }

  it('two of six episodes is a guest; three of six is not, and the reason counts them', () => {
    const two = guested('rr-g2', [2, 5]);
    expect(checkEligibility(two.s, two.p, two.e, two.cat).recipients.map((c) => c.characterName)).toEqual(['Marcus']);
    const three = guested('rr-g3', [1, 2, 3]);
    const el = checkEligibility(three.s, three.p, three.e, three.cat);
    expect(el.recipients).toEqual([]);
    expect(el.reasons).toContain('This category takes performers in fewer than half of the episodes; Marcus is in 3 of 6.');
    // Version 2 took whoever was declared a guest.
    three.e.rulesId = 'emmys-2027@2';
    expect(checkEligibility(three.s, three.p, three.e, three.cat).recipients.map((c) => c.characterName)).toEqual(['Marcus']);
  });

  it('Short Form Performer takes half or more: three of six enters, two of six does not', () => {
    const { s, p, e } = guested('rr-sf', [1, 2, 3]);
    const cat = institution('emmys').categories.find((c) => c.id === 'short-form-performer')!;
    Object.assign(p.axes, { format: 'web-series', targetRuntimeMin: 10 });
    expect(categoryRules(e, cat.id)?.episodeShare?.value).toEqual({ atLeast: 0.5 });
    expect(categoryRecipients(s, p, cat, undefined, categoryRules(e, cat.id)).map((c) => c.characterName)).toContain('Marcus');
    p.credits[1] = { ...p.credits[1], episodes: [1, 2] };
    expect(categoryRecipients(s, p, cat, undefined, categoryRules(e, cat.id)).map((c) => c.characterName)).not.toContain('Marcus');
    expect(categoryRecipients(s, p, cat).map((c) => c.characterName)).toContain('Marcus'); // credited: only the rule removes them
  });
});

describe('Non-English dialogue is measured from the script: Oscars Rule Sixteen II.D, Golden Globes A.3.c.i', () => {
  /** A French-based feature whose one scene has `fr` words of French and `en` words of English (declared language: French). */
  function spoken(tag: string, fr: number, en: number) {
    const s: GameState = startLife(tag, 'fr-paris');
    const p = buildProject(s, { title: 'Le Quai', format: 'feature', medium: 'live-action', runtime: 95 }, [{ name: 'Lou', patch: { roleSize: 'lead' } }], [{ place: 'Quai', chars: ['Lou'], minutes: 3 }]);
    p.axes.dialogueLanguages = ['fr', 'en'];
    const who = p.characters[0].id;
    p.scenes[0].dialogue = [
      { id: 'l1', characterId: who, text: Array(fr).fill('mot').join(' '), language: 'fr' },
      { id: 'l2', characterId: who, text: Array(en).fill('word').join(' '), language: 'en' },
    ].filter((l) => l.text);
    approve(s, p);
    return { s, p };
  }
  const oscars = (s: GameState) => s.editions.find((x) => x.id === 'oscars-2027')!;
  const why = (s: GameState, p: Parameters<typeof checkEligibility>[1], id: string) => {
    const e = id === 'international' ? oscars(s) : s.editions.find((x) => x.id === 'golden-globes-2027')!;
    return checkEligibility(s, p, e, institution(e.institutionId).categories.find((c) => c.id === id)!).reasons.join(' ');
  };

  it('60% French qualifies; 40% does not, with the share in the reason; exactly half is not "more than 50%"', () => {
    const a = spoken('ne-60', 60, 40);
    expect(nonEnglishShare(a.p)).toBe(0.6);
    expect(why(a.s, a.p, 'international')).not.toMatch(/written dialogue/);
    expect(why(a.s, a.p, 'non-english')).not.toMatch(/written dialogue/);
    const b = spoken('ne-40', 40, 60);
    expect(why(b.s, b.p, 'international')).toMatch(/40% of its written dialogue is in a language other than English; this category needs more than 50%\./);
    expect(why(b.s, b.p, 'non-english')).toMatch(/40% of its written dialogue/);
    const c = spoken('ne-50', 50, 50);
    expect(why(c.s, c.p, 'international')).toMatch(/50% of its written dialogue/);
  });

  it('the declared language no longer decides when the script says otherwise; version 2 read only the declaration', () => {
    const { s, p } = spoken('ne-decl', 10, 90); // declared French first, written mostly in English
    expect(why(s, p, 'international')).toMatch(/10% of its written dialogue/);
    const e = oscars(s);
    e.rulesId = 'oscars-2027@2';
    expect(checkEligibility(s, p, e, institution('oscars').categories.find((c) => c.id === 'international')!).reasons.join(' ')).not.toMatch(/English/);
  });
});

describe('Co-production: a partner signed through Financing counts', () => {
  it('the Eurimages award reads an accepted co-production deal, not only the money of saves made before financing existed', () => {
    const s: GameState = startLife('copro', 'fr-paris');
    const p = buildProject(s, { title: 'Les Deux Rives', format: 'feature', medium: 'live-action', runtime: 95 }, [{ name: 'Lou', patch: { roleSize: 'lead' } }], [{ place: 'Rive', chars: ['Lou'], minutes: 3 }]);
    approve(s, p);
    // Labelled fixture: half the target agreed, so a partner has something to match (they match half of what is promised).
    p.finance!.deals[0].amount = Math.round(p.finance!.target / 2);
    const cat = institution('european-film-awards').categories.find((c) => c.id === 'coproduction')!;
    const why = () => requirementProblems(s, p, cat).join(' ');
    expect(p.funding.extra).toEqual([]);
    expect(why()).toMatch(/no co-production partner/);
    const deal = approachBacker(s, p, 'co-producer');
    processUntil(s, deal.decideAt! + DAY, 'tick', 100000);
    expect(deal.status).toBe('offered'); // this seed's partner says yes
    expect(why()).toMatch(/no co-production partner/); // an offer isn't a partner yet
    acceptDeal(s, p, deal.id);
    expect(p.funding.extra).toEqual([]); // the legacy money stays empty: only the deal says it
    expect(why()).not.toMatch(/co-production/);
  });
});

describe('Emmys, directing and writing: "for a single episode", to those credited on it (emmys-2027@4)', () => {
  const dir = (id: string, person: string, episodes: number[], billing: number): Credit => ({ id, person, personName: person, contribution: 'Directed By', roleId: 'episode-director', episodes, billing });
  /** A six-episode drama series: the player directed 1 to 3; three directors shared episode 5 (labelled fixture). */
  function season(tag: string) {
    const s: GameState = startLife(tag, 'us-los-angeles');
    const p = buildProject(s, { title: 'Harbor Lights', format: 'short', medium: 'live-action', runtime: 20 }, [{ name: 'Ines', patch: { roleSize: 'lead' } }], [{ place: 'Harbor', chars: ['Ines'], minutes: 3 }]);
    approve(s, p);
    Object.assign(p.axes, { format: 'series', episodeCount: 6, targetRuntimeMin: 50, register: 'drama' });
    p.credits = [dir('d1', 'You', [1, 2, 3], 1), dir('d2', 'Ada Ruiz', [4, 5, 6], 2), dir('d3', 'Bo Lind', [5], 3), dir('d4', 'Cy Okoro', [5], 4)];
    const e = s.editions.find((x) => x.id === 'emmys-2027')!;
    return { s, p, e, cat: institution('emmys').categories.find((c) => c.id === 'directing')! };
  }
  const names = (r: Credit[]) => r.map((c) => c.personName);

  it('the episode chosen decides who receives it; with none chosen, the first episode anyone directed', () => {
    const { s, p, e, cat } = season('ep-1');
    expect(e.rulesId).toBe('emmys-2027@4');
    expect(entryEpisodes(s, p, cat, categoryRules(e, cat.id))).toEqual([1, 2, 3, 4, 5, 6]);
    expect(names(checkEligibility(s, p, e, cat).recipients)).toEqual(['You']);
    expect(names(checkEligibility(s, p, e, cat, undefined, undefined, 4).recipients)).toEqual(['Ada Ruiz']);
    // "An entry is limited to two directors": episode 5 had three; the first two billed are named.
    expect(names(checkEligibility(s, p, e, cat, undefined, undefined, 5).recipients)).toEqual(['Ada Ruiz', 'Bo Lind']);
    expect(checkEligibility(s, p, e, cat, undefined, undefined, 9).reasons).toContain('Harbor Lights has 6 episodes; choose one of them.');
    // Version 3 entered the season, to every director credited on any episode.
    e.rulesId = 'emmys-2027@3';
    expect(names(checkEligibility(s, p, e, cat).recipients)).toEqual(['You', 'Ada Ruiz', 'Bo Lind', 'Cy Okoro']);
  });

  it('an entry records its episode and goes to that episode\'s director; writing has no cap', () => {
    const { s, p, e, cat } = season('ep-2');
    // Labelled fixture: delivered and aired in the US inside the eligibility year.
    p.delivered = { at: Date.parse('2026-08-01T20:00:00Z'), runtimeMin: 300 };
    p.releases.push({ id: 'r1', route: 'broadcast', date: '2026-10-01', territories: ['US'], distributor: 'Channel Nine', note: '', status: 'released' });
    s.now = e.deadline - 30 * DAY;
    const entry = submitEntry(s, p, e.id, cat.id, undefined, undefined, 4);
    expect(entry.episode).toBe(4);
    expect(entry.recipients).toEqual(['d2']);
    expect(categoryRules(e, 'writing')?.oneEpisode?.value).toEqual({});
    expect(categoryRules(e, 'drama')?.oneEpisode).toBeUndefined(); // the program award is the season's
  });
});

describe('Emmys, limited or anthology series: the complete series when credited on every part, else one part (Categories 26, 115)', () => {
  it('a writer of all four parts enters the whole series; once another writer shares part 2, the entry is one part', () => {
    const s: GameState = startLife('lim', 'us-los-angeles');
    const p = buildProject(s, { title: 'The Long Winter', format: 'short', medium: 'live-action', runtime: 20 }, [{ name: 'Ines', patch: { roleSize: 'lead' } }], [{ place: 'Farm', chars: ['Ines'], minutes: 3 }]);
    approve(s, p);
    Object.assign(p.axes, { format: 'limited-series', episodeCount: 4, targetRuntimeMin: 50 });
    const w = (id: string, name: string, episodes: number[] | 'all', billing: number): Credit => ({ id, person: name, personName: name, contribution: 'Written By', roleId: 'writer', episodes, billing });
    p.credits = [w('w1', 'You', [1, 2, 3, 4], 1)];
    const e = s.editions.find((x) => x.id === 'emmys-2027')!;
    const cat = institution('emmys').categories.find((c) => c.id === 'writing-limited')!;
    const rules = categoryRules(e, cat.id);
    expect(entryEpisodes(s, p, cat, rules)).toEqual([]); // nothing to choose: the complete series
    expect(checkEligibility(s, p, e, cat).recipients.map((c) => c.personName)).toEqual(['You']);
    p.credits.push(w('w2', 'Mo Sato', [2], 2));
    expect(entryEpisodes(s, p, cat, rules)).toEqual([1, 2, 3, 4]);
    expect(checkEligibility(s, p, e, cat, undefined, undefined, 2).recipients.map((c) => c.personName)).toEqual(['You', 'Mo Sato']);
    expect(checkEligibility(s, p, e, cat, undefined, undefined, 3).recipients.map((c) => c.personName)).toEqual(['You']);
    expect(categoryRules(e, 'directing-limited')?.oneEpisode?.value).toEqual({ max: 2, wholeWhenAll: true });
  });
});
