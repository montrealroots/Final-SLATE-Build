// Recipient rules read from the organizers' documents (part 5 of the awards work, November 9, 2026): who may be entered for
// a work, beyond who is credited for it. Each test pairs the rule with the version or organizer that doesn't have it.
import { describe, expect, it } from 'vitest';
import { DAY, RULEBOOKS, acceptDeal, approachBacker, categoryRecipients, checkEligibility, categoryRules, entryEpisodes, institution, processUntil, submitEntry } from './engine-api';
import { nonEnglishShare, requirementProblems } from '../src/engine/awards-rules';
import { approve, buildProject, startLife } from './helpers';
import { recordScreenTime } from '../src/engine/screen-time';
import type { Credit, GameState, Project } from '../src/engine/types';

/** Labelled fixture: the part's screen time recorded from the cut, the whole of every scene it is in. */
function seen(s: GameState, p: Project, name: string) {
  const id = p.drafts.find((d) => d.number === p.approvedDraft)!.characters.find((c) => c.name === name)!.id;
  for (const sc of p.drafts.find((d) => d.number === p.approvedDraft)!.scenes.filter((x) => x.participants.includes(id))) recordScreenTime(s, p, sc.id, id, sc.estMinutes);
}

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
    expect(e.rulesId).toBe('emmys-2027@5'); // version 4 keeps version 3's performer rules and adds one-episode entries; 5 adds Original Music And Lyrics
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
    // The only other organizer's rules that exclude narrators: the International Emmys' performances (read November 9, 2026).
    const others = RULEBOOKS.filter((b) => b.institutionId !== 'emmys').flatMap((b) => Object.entries(b.categories).filter(([, r]) => r.noNarrators).map(([id]) => `${b.id}/${id}`));
    expect(others).toEqual(['international-emmys-2026@2/actor', 'international-emmys-2026@2/actress', 'international-emmys-2027@2/actor', 'international-emmys-2027@2/actress']);
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
    seen(s, p, 'Marcus'); // the 5% screen-time rule is tested in tests/screen-time.test.ts
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
    expect(e.rulesId).toBe('emmys-2027@5');
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

describe('Emmys, Guest Performer Eligibility: nominated as supporting, never a guest in the same role later', () => {
  it('season 2 can\'t enter Marcus as a guest after a supporting nomination for season 1; a non-nomination doesn\'t count', () => {
    const s: GameState = startLife('gpe', 'us-los-angeles');
    s.character.actingTitle = 'Actor';
    const make = (title: string) => {
      const p = buildProject(s, { title, format: 'short', medium: 'live-action', runtime: 20 },
        [{ name: 'Ines', patch: { roleSize: 'lead' } }, { name: 'Marcus', patch: { roleSize: 'supporting', seriesInvolvement: 'guest', awardPlacement: 'none' } }],
        [{ place: 'Harbor', chars: ['Ines', 'Marcus'], minutes: 3 }]);
      approve(s, p);
      Object.assign(p.axes, { format: 'series', episodeCount: 6, targetRuntimeMin: 50, register: 'drama' });
      p.credits = [{ ...credit('m1', 'Marcus'), episodes: [2] }];
      seen(s, p, 'Marcus');
      return p;
    };
    const one = make('Harbor Lights');
    const two = make('Harbor Lights: Season 2');
    two.continues = { from: one.id, number: 2, returning: [] };
    // Labelled fixture: season 1's nomination as supporting actor at the 2026 Emmys.
    const past = s.editions.find((x) => x.id === 'emmys-2026')!;
    past.entries.push({ id: 'x', projectId: one.id, categoryId: 'supporting-actor', submittedAt: 0, status: 'nominated', recipients: ['m1'], fee: 0 });
    const e = s.editions.find((x) => x.id === 'emmys-2027')!;
    const guest = institution('emmys').categories.find((c) => c.id === 'guest-actor')!;
    const el = checkEligibility(s, two, e, guest);
    expect(el.recipients).toEqual([]);
    expect(el.reasons).toContain('Marcus was nominated as a lead or supporting performance in an earlier season, so the part can\'t be entered as a guest.');
    past.entries[0].status = 'not-nominated';
    expect(checkEligibility(s, two, e, guest).recipients.map((c) => c.characterName)).toEqual(['Marcus']);
    // The first season itself is not "a subsequent year".
    past.entries[0].status = 'won';
    expect(checkEligibility(s, one, e, guest).recipients.map((c) => c.characterName)).toEqual(['Marcus']);
  });
});

// The 5% screen-time rule (emmys-2026@4 screenShare) read the approved script until November 9, 2026; it now reads the cut,
// and its tests are in tests/screen-time.test.ts.

describe('Golden Globes, Cinematic and Box Office Achievement: $150 million worldwide, $100 million of it in the US (B.1.b)', () => {
  it('reads what distributors reported for 2026 theatrical releases; a release in several countries counts only worldwide', () => {
    const s: GameState = startLife('bo', 'us-los-angeles');
    const p = buildProject(s, { title: 'Big Night', format: 'feature', medium: 'live-action', runtime: 110 }, [{ name: 'Lou', patch: { roleSize: 'lead' } }], [{ place: 'Hall', chars: ['Lou'], minutes: 3 }]);
    approve(s, p);
    p.delivered = { at: Date.parse('2026-02-01T12:00:00Z'), runtimeMin: 110 };
    // Labelled fixture: two accepted theatrical offers and what their distributors reported.
    const run = (id: string, territories: string[], gross: number, date = '2026-05-01') => {
      p.offers.push({ id, distributor: `D-${id}`, route: 'theatrical', minimumGuarantee: 0, territories, releaseWindowDays: 30, expiresAt: 0, status: 'accepted', reported: { gross, net: gross / 2, overagePaid: 0 } } as never);
      p.releases.push({ id: `r-${id}`, route: 'theatrical', date, territories, distributor: `D-${id}`, note: '', status: 'released', offerId: id });
    };
    run('us', ['US'], 120_000_000);
    run('fr', ['FR'], 40_000_000);
    const e = s.editions.find((x) => x.id === 'golden-globes-2027')!;
    expect(e.rulesId).toBe('golden-globes-2027@5');
    const cat = institution('golden-globes').categories.find((c) => c.id === 'box-office')!;
    const why = () => checkEligibility(s, p, e, cat).reasons.join(' ');
    expect(why()).not.toMatch(/reported/);
    p.offers[0].reported!.gross = 90_000_000; // $130 million worldwide, $90 million in the US
    expect(why()).toMatch(/Its cinemas have reported \$130,000,000 worldwide, \$90,000,000 of it in the United States, in the qualifying year; this award needs \$150,000,000, \$100,000,000 of it in the United States\./);
    run('eu-us', ['US', 'GB'], 50_000_000); // worldwide only: its report isn't split by country
    expect(why()).toMatch(/\$180,000,000 worldwide, \$90,000,000 of it/);
    run('late', ['US'], 30_000_000, '2027-01-10'); // after the qualifying year
    expect(why()).toMatch(/\$180,000,000 worldwide/);
    e.rulesId = 'golden-globes-2027@3'; // version 3 asked only for a theatrical release
    expect(why()).not.toMatch(/reported/);
  });
});

describe('a festival screening is not a release outside cinemas', () => {
  it('a Goya feature premiered at a festival before its Spanish release stays eligible; one streamed first does not', () => {
    const s: GameState = startLife('tf-fest', 'es-madrid');
    const make = (first: 'festival-premiere' | 'streaming') => {
      const p = buildProject(s, { title: `Rio ${first}`, format: 'feature', medium: 'live-action', runtime: 95 }, [{ name: 'A', patch: { roleSize: 'lead' } }], [{ place: 'R', chars: ['A'], minutes: 3 }]);
      approve(s, p);
      p.delivered = { at: Date.parse('2026-01-10T12:00:00Z'), runtimeMin: 95 };
      p.releases.push({ id: 'f', route: first, date: '2026-03-01', territories: ['ES'], distributor: null, note: '', status: 'released' });
      p.releases.push({ id: 't', route: 'theatrical', date: '2026-05-01', territories: ['ES'], distributor: 'D', note: '', status: 'released' });
      return p;
    };
    const e = s.editions.find((x) => x.id === 'goya-2027')!;
    const film = institution('goya').categories.find((c) => c.id === 'film')!;
    expect(checkEligibility(s, make('festival-premiere'), e, film).reasons.join(' ')).not.toMatch(/outside cinemas/);
    expect(checkEligibility(s, make('streaming'), e, film).reasons.join(' ')).toMatch(/released on March 1, 2026 outside cinemas, before any theatrical run/);
  });
});

describe('categories for work from abroad are not held to the event\'s own countries', () => {
  it('a US film can be entered for the César for Best Foreign Film; it still can\'t enter Best Film', () => {
    const s: GameState = startLife('foreign', 'us-los-angeles');
    const p = buildProject(s, { title: 'Desert Road', format: 'feature', medium: 'live-action', runtime: 100 }, [{ name: 'A', patch: { roleSize: 'lead' } }], [{ place: 'R', chars: ['A'], minutes: 3 }]);
    approve(s, p);
    const e = s.editions.find((x) => x.institutionId === 'cesar' && x.year === 2027)!;
    const why = (id: string) => checkEligibility(s, p, e, institution('cesar').categories.find((c) => c.id === id)!).reasons.join(' ');
    expect(why('foreign')).not.toMatch(/production base country isn't eligible/);
    expect(why('film')).toMatch(/production base country isn't eligible/);
  });
});
