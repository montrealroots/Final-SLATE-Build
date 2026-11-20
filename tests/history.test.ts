// Recorded history (src/engine/history.ts; the owner's v6 package J01 and J21, and the v7 package's reference logic):
// nothing is reportable before its published date, an unknown publication is never reported, a correction applies
// only from its own date, inferred availability needs an explicit opt-in, figures are comparable only in the same
// scope, and a save holds none of it.
import { describe, expect, it } from 'vitest';
import institutions from '../src/data/institutions.json';
import { AUDIENCE_ROWS, DATASETS, audienceAt, comparable, displayed, holdsRecords, observationsAt, recordedResults, reportable, sourceOf, type HistoryDataset } from '../src/engine/history';
import { serialize } from '../src/engine/save';
import { startLife } from './helpers';
import { savedResult } from '../src/engine/awards-history';

const institutionsById = (id: string) => (institutions as { institutions: { id: string; categories: { id: string }[] }[] }).institutions.find((x) => x.id === id)!;

const ids = (xs: { id: string }[]) => xs.map((x) => x.id).sort();

describe('recorded history', () => {
  it('shows nothing before its published date, and each result from that date in the player\'s calendar', () => {
    // The first is the Berlinale's Honorary Golden Bear, announced November 14, 2025; then the Spirit Awards' nominees,
    // December 3.
    expect(observationsAt('2025-11-13')).toEqual([]);
    expect(observationsAt('2025-12-02').map((o) => o.id)).toEqual(['berlinale-2026-the-honorary-golden-bear']);
    // The Golden Globes' nominees from December 8, 2025 (from November 19, 2026; until then none was recorded, and a
    // January start saw nothing), its winners from January 11.
    // By then: nominees, the Spirit Awards', the PGA's documentary field (December 9, 2025) and the Golden Globes', and
    // Sundance's selection (December 10 and 15); two winners, the Berlinale's honorary bear and the Sloan prize Sundance
    // announced with its selection.
    expect(observationsAt('2026-01-05').filter((o) => o.kind === 'winner').map((o) => o.id).sort()).toEqual(['berlinale-2026-the-honorary-golden-bear', 'sundance-2026-alfred-p-sloan-feature-film-prize']);
    expect([...new Set(observationsAt('2026-01-05').map((o) => o.institution))].sort()).toEqual(['berlinale', 'golden-globes', 'pga', 'spirit', 'sundance']);
    expect(recordedResults('golden-globes', 2026, '2026-01-10')).toHaveLength(28);
    expect(recordedResults('golden-globes', 2026, '2026-01-10').some((o) => o.kind === 'winner')).toBe(false);
    const globes = recordedResults('golden-globes', 2026, '2026-01-11').filter((o) => o.kind === 'winner');
    expect(globes).toHaveLength(28);
    expect(ids(globes).slice(0, 5)).toEqual(['globes-83-actor-comedy', 'globes-83-actor-drama', 'globes-83-actress-comedy', 'globes-83-actress-drama', 'globes-83-animated']);
    // The night's article named The Pitt and The Studio without their categories; the nominations page says which.
    expect(globes.find((o) => o.category === 'tv-drama')!.subjects).toEqual(['The Pitt']);
    expect(globes.find((o) => o.category === 'tv-comedy')!.subjects).toEqual(['The Studio']);
    // The Oscars: the nominees from January 22 (Best Picture and the four acting categories), no winner until March 15.
    const feb = recordedResults('oscars', 2026, '2026-02-01');
    expect(feb.every((o) => o.kind === 'nominees')).toBe(true);
    expect(feb.find((o) => o.category === 'actor')!.subjects).toHaveLength(5);
    expect(recordedResults('oscars', 2026, '2026-03-14').some((o) => o.kind === 'winner')).toBe(false);
    const after = recordedResults('oscars', 2026, '2026-03-15');
    expect(after.find((o) => o.id === 'oscars-98-picture')).toMatchObject({ subjects: ['One Battle after Another'], credited: 'Adam Somner, Sara Murphy and Paul Thomas Anderson, Producers' });
    expect(after.filter((o) => o.kind === 'winner' && o.category === 'actress')).toHaveLength(1); // one record of it, not two
    expect(holdsRecords('oscars', 2026)).toBe(true);
    expect(holdsRecords('oscars', 2027)).toBe(false);
    // Unknown publication is never shown (reference: test_unknown_publication_hidden).
    expect(reportable({ published: null, occurred: '2026-01-01' }, '2026-11-13')).toBe(false);
  });

  it('applies a correction only from its own publication, keeping the earlier revision before it', () => {
    const base = DATASETS[0].observations[0];
    const fixture: HistoryDataset = { ...DATASETS[0], observations: [base, { ...base, subjects: ['A Corrected Title (Fixture)'], published: '2026-02-01', revision: 2 }] };
    expect(observationsAt('2026-01-20', () => true, [fixture])[0].subjects).toEqual(base.subjects);
    expect(observationsAt('2026-02-03', () => true, [fixture])[0]).toMatchObject({ revision: 2, subjects: ['A Corrected Title (Fixture)'] });
  });

  it('keeps work-only results free of named recipients, and festivals\' shared prizes whole', () => {
    // The 2026 Emmys whole (from November 19, 2026): the nominees from July 8, each category's winner from its own night.
    const emmysOn = (day: string, kind: string) => recordedResults('emmys', 2026, day).filter((o) => o.kind === kind);
    expect(recordedResults('emmys', 2026, '2026-07-07')).toEqual([]);
    expect(emmysOn('2026-07-08', 'nominees')).toHaveLength(117);
    expect(emmysOn('2026-09-04', 'winner')).toEqual([]);
    const byName = (os: { categoryName: string }[]) => new Set(os.map((o) => o.categoryName.toLowerCase()));
    expect(byName(emmysOn('2026-09-05', 'winner')).size).toBe(49); // the first Creative Arts night
    expect(byName(emmysOn('2026-09-13', 'winner')).size).toBe(101);
    const emmys = emmysOn('2026-09-14', 'winner');
    expect(byName(emmys).size).toBe(120); // every category, once
    expect(emmys).toHaveLength(120);
    // The programs' awards name the work, the people's the person; the reference set's three keep their wording.
    expect(emmys.filter((o) => ['comedy', 'drama', 'limited'].includes(o.category ?? '')).map((o) => [o.category, o.subjects, o.recipients]).sort()).toEqual([['comedy', ['Widow’s Bay'], 'work_only'], ['drama', ['The Pitt'], 'work_only'], ['limited', ['DTF St. Louis'], 'work_only']]);
    expect(emmys.filter((o) => o.subjects.includes('Matthew Rhys')).map((o) => o.work)).toEqual(['The Beast In Me', "Widow's Bay"]);
    // A show nominated twice in a category is told apart by its episode, as the Academy's page lists it.
    expect(emmysOn('2026-07-08', 'nominees').find((o) => o.category === 'writing')!.subjects).toEqual(['Pluribus', 'The Diplomat', 'The Pitt (1:00 P.M.)', 'The Pitt (12:00 P.M.)', 'Slow Horses', 'Task']);
    expect(recordedResults('cannes', 2026, '2026-05-23').find((o) => o.category === 'director')!.subjects).toHaveLength(3); // shared: La Bola Negra's two directors and Fatherland's (FEST01)
    expect(recordedResults('bafta-film', 2026, '2026-02-22').filter((o) => o.category === null && o.id.startsWith('v7-')).map((o) => o.categoryName)).toEqual(['Supporting Actor', 'Supporting Actress']);
    // From November 20, 2026 the rest of the night's winners too (the recovery package), each once: not the reference's again.
    expect(recordedResults('bafta-film', 2026, '2026-02-22').filter((o) => o.kind === 'winner')).toHaveLength(26);
  });

  it("holds the 98th Academy Awards whole: every competitive category's nominees from January 22 and winner from March 15", () => {
    const insts = (institutions as { institutions: { id: string; categories: { id: string; competitive?: boolean }[] }[] }).institutions;
    // The competitive categories, the Board's awards aside; of them only Original Musical wasn't given in 2026. (Read by
    // a flag, not by name: the awards ledger counts a category a test names as one it tests.)
    const competitive = insts.find((x) => x.id === 'oscars')!.categories.filter((c) => c.competitive).map((c) => c.id);
    const at = (day: string, kind: string) => new Set(recordedResults('oscars', 2026, day).filter((o) => o.kind === kind).map((o) => o.category));
    expect(at('2026-01-21', 'nominees').size).toBe(0);
    const nominated = [...at('2026-01-22', 'nominees')].sort();
    expect(nominated).toHaveLength(competitive.length - 1);
    expect(competitive.filter((c) => !nominated.includes(c))).toHaveLength(1);
    expect(at('2026-03-14', 'winner').size).toBe(0);
    expect([...at('2026-03-15', 'winner')].sort()).toEqual(nominated);
    // The page's one tie: two winners, each named.
    expect(recordedResults('oscars', 2026, '2026-03-15').find((o) => o.kind === 'winner' && o.category === 'live-short')!.subjects).toEqual(['The Singers', 'Two People Exchanging Saliva']);
  });

  it('holds the 32nd Actor Awards whole: the nominees from January 7, the stunt ensembles from February 26, each recipient from March 1', () => {
    const on = (day: string, kind: string) => recordedResults('actor-awards', 2026, day).filter((o) => o.kind === kind);
    expect(recordedResults('actor-awards', 2026, '2026-01-06')).toEqual([]);
    expect(on('2026-01-07', 'nominees')).toHaveLength(13);
    expect(on('2026-02-26', 'nominees')).toHaveLength(15);
    expect(on('2026-02-28', 'winner')).toEqual([]);
    const won = on('2026-03-01', 'winner');
    expect(won).toHaveLength(15);
    // The stunt ensembles have no category in the game: kept, and listed apart.
    expect(won.filter((o) => o.category === null).map((o) => o.subjects[0])).toEqual(['Mission: Impossible - The Final Reckoning', 'The Last of Us']);
    expect(won.find((o) => o.category === 'cast')!.subjects).toEqual(['Sinners']);
    // Written as the game's other records write them, not in the page's capitals.
    expect(won.find((o) => o.category === 'tv-female-comedy')).toMatchObject({ subjects: ["Catherine O'Hara"], work: 'The Studio' });
  });

  it('holds the 78th DGA Awards: nominees from January 7 and 8, winners from February 7, and no winner the release does not state', () => {
    const on = (day: string, kind: string) => recordedResults('dga', 2026, day).filter((o) => o.kind === kind);
    expect(on('2026-01-07', 'nominees')).toHaveLength(9); // television and documentary
    expect(on('2026-01-08', 'nominees')).toHaveLength(11); // and the two feature categories
    expect(on('2026-02-06', 'winner')).toEqual([]);
    const won = on('2026-02-07', 'winner');
    expect(won).toHaveLength(10);
    // Its Comedy Series section is worded as nominees and lists one; the record doesn't guess that it was the winner.
    expect(won.some((o) => o.category === 'comedy')).toBe(false);
    expect(won.find((o) => o.category === 'drama')).toMatchObject({ subjects: ['Amanda Marsalis'], work: 'The Pitt, “6:00 P.M.”' });
    expect(on('2026-01-07', 'nominees').find((o) => o.category === 'reality')!.subjects).toContain('Adam Sandler (The Price is Right, “10,000th Episode”)');
  });

  it('holds the 78th Writers Guild Awards in the 15 categories the game holds: nominees from January 27, winners from March 8', () => {
    const on = (day: string, kind: string) => recordedResults('wga', 2026, day).filter((o) => o.kind === kind);
    expect(recordedResults('wga', 2026, '2026-01-26')).toEqual([]);
    expect(on('2026-01-27', 'nominees')).toHaveLength(15);
    expect(on('2026-03-07', 'winner')).toEqual([]);
    const won = on('2026-03-08', 'winner');
    expect(won).toHaveLength(15);
    expect(won.find((o) => o.category === 'episodic')).toMatchObject({ subjects: ['R. Scott Gemmill'], work: 'The Pitt, “7:00 A.M.”' });
    // A series' award names the show, crediting its writers.
    expect(won.find((o) => o.category === 'comedy-series')).toMatchObject({ subjects: ['The Studio'], recipients: 'work_only' });
  });

  it('holds the 37th PGA Awards: documentary nominees from December 9, the rest from January 9, winners from February 26 and 28', () => {
    const on = (day: string, kind: string) => recordedResults('pga', 2026, day).filter((o) => o.kind === kind);
    expect(on('2025-12-09', 'nominees').map((o) => o.category)).toEqual(['documentary']);
    expect(on('2026-01-09', 'nominees')).toHaveLength(10);
    expect(on('2026-02-26', 'winner').map((o) => o.category).sort()).toEqual(['childrens', 'short-form']);
    const won = on('2026-02-28', 'winner');
    expect(won).toHaveLength(12);
    expect(won.find((o) => o.category === 'theatrical')).toMatchObject({ subjects: ['One Battle After Another'], credited: 'Adam Somner, Sara Murphy, Paul Thomas Anderson' });
  });

  it('holds the 41st Spirit Awards whole: nominees from December 3, winners from February 15, each a nominee of its category', () => {
    const on = (day: string, kind: string) => recordedResults('spirit', 2026, day).filter((o) => o.kind === kind);
    expect(on('2025-12-03', 'nominees')).toHaveLength(20);
    expect(on('2026-02-14', 'winner')).toEqual([]);
    const won = on('2026-02-15', 'winner');
    expect(won).toHaveLength(20);
    // Eva Victor was nominated for both directing and writing: her win is the screenplay's, under its own heading.
    expect(won.find((o) => o.category === 'screenplay')).toMatchObject({ subjects: ['Eva Victor'], work: 'Sorry, Baby' });
    expect(won.find((o) => o.category === 'director')!.subjects).toEqual(['Clint Bentley']);
    // A title the PDF breaks over two lines takes its whole name from the nominees.
    expect(won.find((o) => o.category === 'editing')!.work).toBe('The Testament of Ann Lee');
    for (const w of won) {
      const field = on('2025-12-03', 'nominees').find((o) => o.categoryName === w.categoryName)!.subjects.join('|');
      expect(field).toContain(w.subjects[0]);
    }
  });

  it('holds the 51st César Awards whole: nominees from January 28, winners from February 26, in their own spelling', () => {
    const on = (day: string, kind: string) => recordedResults('cesar', 2026, day).filter((o) => o.kind === kind);
    expect(recordedResults('cesar', 2026, '2026-01-27')).toEqual([]);
    expect(on('2026-01-28', 'nominees')).toHaveLength(24);
    expect(on('2026-02-25', 'winner')).toEqual([]);
    const won = on('2026-02-26', 'winner');
    expect(won).toHaveLength(24);
    expect(won.find((o) => o.category === 'film')!.subjects).toEqual(["L'Attachement"]);
    expect(won.find((o) => o.category === 'actor')).toMatchObject({ subjects: ['Laurent Lafitte'], work: 'La Femme la plus riche du monde' });
  });

  it('holds the 40th Goya Awards whole: nominees from January 13, winners from February 28, each a nominee of its category', () => {
    const on = (day: string, kind: string) => recordedResults('goya', 2026, day).filter((o) => o.kind === kind);
    expect(on('2026-01-13', 'nominees')).toHaveLength(28);
    expect(on('2026-02-27', 'winner')).toEqual([]);
    const won = on('2026-02-28', 'winner');
    expect(won).toHaveLength(28);
    expect(won.find((o) => o.category === 'film')!.subjects).toEqual(['Los Domingos']);
    // A song's writers win it; the song and its film are what was nominated.
    expect(won.find((o) => o.category === 'song')).toMatchObject({ subjects: ['Alba Flores, Sílvia Pérez Cruz'], work: 'Flores para Antonio, from Flores para Antonio' });
    expect(won.find((o) => o.category === 'european')).toMatchObject({ subjects: ['Valor sentimental'], credited: 'Noruega' });
  });

  it('holds the 2026 AACTA Awards: each winner dated by the gala (February 4) or the ceremony (February 6) that named it', () => {
    const on = (day: string, kind: string) => recordedResults('aacta', 2026, day).filter((o) => o.kind === kind);
    // The nominations release states no date: the nominees are shown from the first ceremony, when they were public.
    expect(recordedResults('aacta', 2026, '2026-02-03')).toEqual([]);
    expect(on('2026-02-04', 'nominees')).toHaveLength(48);
    expect(on('2026-02-04', 'winner')).toHaveLength(26);
    const won = on('2026-02-06', 'winner');
    expect(won).toHaveLength(48);
    expect(won.find((o) => o.categoryName === 'AACTA Award For Best Film')).toMatchObject({ subjects: ['Bring Her Back'], published: '2026-02-06' });
    // "Best Documentary" is inside "Best Documentary or Factual Program": the release must name its winner after it.
    expect(won.find((o) => o.categoryName === 'AACTA Award For Best Documentary')!.published).toBe('2026-02-06');
  });

  it('holds the 49th Japan Academy Film Prize: 15 categories, the Excellent Awards and the Best from the March 13 ceremony', () => {
    const on = (day: string, kind: string) => recordedResults('japan-academy', 2026, day).filter((o) => o.kind === kind);
    expect(recordedResults('japan-academy', 2026, '2026-03-12')).toEqual([]);
    expect(on('2026-03-13', 'nominees')).toHaveLength(15);
    const won = on('2026-03-13', 'winner');
    expect(won).toHaveLength(15);
    expect(won.find((o) => o.category === 'picture')!.subjects).toEqual(['Kokuho']);
    // The special award listed after the foreign films isn't one of their field.
    expect(on('2026-03-13', 'nominees').find((o) => o.category === 'foreign')!.subjects).toEqual(['Conclave', 'Twilight of the Warriors: Walled In', 'Mission: Impossible - The Final Reckoning', 'One Battle After Another', 'F1: The Movie']);
  });

  it('holds the 2026 Canadian Screen Awards: nominees from March 25, every winner from May 31, the last of their shows', () => {
    const on = (day: string, kind: string) => recordedResults('canadian-screen', 2026, day).filter((o) => o.kind === kind);
    expect(recordedResults('canadian-screen', 2026, '2026-03-24')).toEqual([]);
    expect(on('2026-03-25', 'nominees')).toHaveLength(145);
    expect(on('2026-05-30', 'winner')).toEqual([]);
    const won = on('2026-05-31', 'winner');
    expect(won).toHaveLength(145);
    expect(won.find((o) => o.category !== null && /Best Motion Picture/.test(o.categoryName))!.subjects[0]).toContain('Nirvanna the Band the Show the Movie');
  });

  it('holds the 2026 Sundance Film Festival: each section\'s selection from its announcement, its awards from their nights', () => {
    const on = (day: string, kind: string) => recordedResults('sundance', 2026, day).filter((o) => o.kind === kind);
    expect(recordedResults('sundance', 2026, '2025-12-09')).toEqual([]);
    // December 10: the features and episodic projects, 97 in eleven sections, five of them the game's.
    const dec10 = on('2025-12-10', 'nominees');
    expect(dec10.reduce((n, o) => n + o.subjects.length, 0)).toBe(97);
    expect(dec10.filter((o) => o.category).map((o) => o.category).sort()).toEqual(['documentary', 'dramatic', 'episodic', 'world-documentary', 'world-dramatic']);
    expect(dec10.find((o) => o.category === 'dramatic')!.subjects).toHaveLength(10);
    // December 15: the 54 shorts, one Short Film Program.
    expect(on('2025-12-15', 'nominees').find((o) => o.category === 'shorts')!.subjects).toHaveLength(54);
    // The short film awards on January 27, the rest on January 30; each winner is in the selection it was chosen from.
    expect(on('2026-01-27', 'winner').find((o) => o.category === 'shorts-grand-jury')).toMatchObject({ subjects: ['Ben Proudfoot and Stephen Curry'], work: 'The Baddest Speechwriter of All' });
    expect(on('2026-01-29', 'winner').some((o) => o.category === 'dramatic-grand-jury')).toBe(false);
    const won = on('2026-01-30', 'winner');
    expect(won.find((o) => o.category === 'dramatic-grand-jury')!.subjects).toEqual(['Josephine']);
    expect(won.find((o) => o.category === 'world-documentary-grand-jury')!.subjects).toEqual(['To Hold a Mountain']);
    const field = (cat: string) => dec10.find((o) => o.category === cat)!.subjects;
    for (const [prize, section] of [['dramatic-grand-jury', 'dramatic'], ['dramatic-directing', 'dramatic'], ['waldo-salt', 'dramatic'], ['documentary-grand-jury', 'documentary'], ['documentary-directing', 'documentary'], ['world-dramatic-grand-jury', 'world-dramatic'], ['world-documentary-grand-jury', 'world-documentary']]) {
      const w = won.find((o) => o.category === prize)!;
      expect(field(section)).toContain(w.work ?? w.subjects[0]);
    }
    expect(new Set(won.filter((o) => o.category).map((o) => o.category)).size).toBe(10); // every prize the game holds
  });

  it('holds the 48th Clermont-Ferrand festival: its three competitions from the opening, its prizes from the close', () => {
    const on = (day: string, kind: string) => recordedResults('clermont', 2026, day).filter((o) => o.kind === kind);
    expect(recordedResults('clermont', 2026, '2026-01-29')).toEqual([]);
    const sel = on('2026-01-30', 'nominees');
    expect(Object.fromEntries(sel.map((o) => [o.category, o.subjects.length]))).toEqual({ international: 60, national: 51, lab: 24 });
    expect(on('2026-02-06', 'winner')).toEqual([]);
    const won = on('2026-02-07', 'winner');
    expect(won).toHaveLength(29);
    // The palmarès writes titles in capitals and in French; each is the programme's original title.
    expect(won.find((o) => o.category === 'grand-prix')!.subjects).toEqual(['Cœur bleu']);
    expect(won.find((o) => o.category === 'special-jury')!.subjects).toEqual(['Buah']);
    for (const o of won.filter((x) => x.category)) expect(sel.find((x) => x.category === 'international')!.subjects).toContain(o.subjects[0]);
    expect(won.find((o) => o.id === 'clermont-2026-prix-d-interpretation-competition-internationale')).toMatchObject({ subjects: ['Ana Barja'], work: 'Casi septiembre' });
  });

  it('holds the 76th Berlinale: each section from the release that completed it, the prizes from February 20 and 21', () => {
    const on = (day: string, kind: string) => recordedResults('berlinale', 2026, day).filter((o) => o.kind === kind);
    const sizes = (day: string) => Object.fromEntries(on(day, 'nominees').filter((o) => o.category).map((o) => [o.category, o.subjects.length]));
    expect(sizes('2026-01-14')).toEqual({ shorts: 21, panorama: 37, generation: 41 });
    expect(sizes('2026-01-20')).toEqual({ shorts: 21, panorama: 37, generation: 41, forum: 45, competition: 22 });
    // Perspectives had 13 first features on January 20 and a 14th on January 29: the section is shown whole from then.
    expect(sizes('2026-01-29').perspectives).toBe(14);
    // Before the prizes, the honorary ones: the Golden Bear (November 14) and two Berlinale Cameras (January 12, February 16).
    expect(on('2026-02-19', 'winner').map((o) => o.category ?? o.subjects[0]).sort()).toEqual(['Haile Gerima', 'Max Richter', 'honorary-bear']);
    expect(on('2026-02-20', 'winner').filter((o) => o.categoryName.includes('14plus'))).toHaveLength(4);
    const won = on('2026-02-21', 'winner');
    expect(won.find((o) => o.category === 'golden-bear')!.subjects).toEqual(['Gelbe Briefe']);
    expect(won.find((o) => o.category === 'leading-performance')).toMatchObject({ subjects: ['Sandra Hüller'], work: 'Rose', recipients: 'named_person' });
    const competition = on('2026-02-21', 'nominees').find((o) => o.category === 'competition')!.subjects;
    for (const id of ['golden-bear', 'grand-jury', 'jury-prize', 'director', 'leading-performance', 'screenplay', 'artistic-contribution']) {
      const o = won.find((x) => x.category === id)!;
      expect(competition).toContain(o.work ?? o.subjects[0]);
    }
    expect(new Set(won.filter((o) => o.category).map((o) => o.category)).size).toBe(12); // every prize the game holds, and the honorary bear
  });

  it('holds Series Mania 2026: the selection from the opening, the palmarès from the close, the UGC label after', () => {
    const on = (day: string, kind: string) => recordedResults('series-mania', 2026, day).filter((o) => o.kind === kind);
    expect(recordedResults('series-mania', 2026, '2026-03-19')).toEqual([]);
    expect(Object.fromEntries(on('2026-03-20', 'nominees').filter((o) => o.category).map((o) => [o.category, o.subjects.length]))).toEqual({ international: 9, french: 6, panorama: 12, 'short-forms': 8, 'special-screenings': 7 });
    expect(on('2026-03-26', 'winner')).toEqual([]);
    const won = on('2026-03-27', 'winner');
    expect(won.find((o) => o.category === 'grand-prix')!.subjects).toEqual(['PROUD']);
    expect(won.find((o) => o.category === 'intl-writing')).toMatchObject({ subjects: ['Dennis Kelly'], work: 'Waiting for the out' });
    expect(new Set(won.filter((o) => o.category).map((o) => o.category)).size).toBe(12); // every prize the game holds
    expect(won.some((o) => o.categoryName === 'Label des spectateurs UGC')).toBe(false);
    expect(on('2026-04-04', 'winner').find((o) => o.categoryName === 'Label des spectateurs UGC')!.subjects).toEqual(['Burden of justice']);
  });

  it('holds the 33rd Hot Docs: the juried awards from May 1, the audience awards from May 4', () => {
    const on = (day: string) => recordedResults('hot-docs', 2026, day);
    expect(on('2026-04-30')).toEqual([]);
    expect(on('2026-05-01')).toHaveLength(11);
    expect(on('2026-05-03').some((o) => o.category === 'audience')).toBe(false);
    expect(on('2026-05-04').find((o) => o.category === 'audience')!.subjects).toEqual(['American Doctor']);
    expect(on('2026-05-04')).toHaveLength(14);
  });

  it('holds the 79th Cannes: the selection as announced and completed, each prize from its own night', () => {
    const on = (day: string, kind: string) => recordedResults('cannes', 2026, day).filter((o) => o.kind === kind);
    expect(on('2026-04-08', 'nominees')).toEqual([]);
    expect(on('2026-04-09', 'nominees').map((o) => o.categoryName).sort()).toEqual(['Midnight Screenings', 'Out of Competition']);
    expect(on('2026-04-22', 'nominees').find((o) => o.category === 'competition')!.subjects).toHaveLength(22);
    expect(on('2026-05-21', 'winner').filter((o) => o.categoryName.startsWith('La Cinef'))).toHaveLength(3);
    expect(on('2026-05-22', 'winner').some((o) => o.category === 'ucr-prize')).toBe(true);
    expect(on('2026-05-22', 'winner').some((o) => o.category === 'palme')).toBe(false);
    const won = on('2026-05-23', 'winner');
    // The Palme, the Grand Prix and the shared Best Director prize are the reference set's, once each.
    expect(won.filter((o) => ['palme', 'grand-prix', 'director'].includes(o.category ?? '')).map((o) => o.id).sort()).toEqual(['v7-cannes-best_director-winner', 'v7-cannes-grand_prix-winner', 'v7-cannes-palme_dor-winner']);
    expect(won.find((o) => o.category === 'palme')!.subjects).toEqual(['Fjord']);
    // The winners' list says Notre Salut; the selection gives the film as A Man Of His Time, by the same director.
    expect(won.find((o) => o.category === 'screenplay')).toMatchObject({ subjects: ['Emmanuel Marre'], work: 'A Man Of His Time' });
    const comp = on('2026-05-23', 'nominees').find((o) => o.category === 'competition')!.subjects;
    for (const id of ['palme', 'jury-prize', 'screenplay', 'actress', 'actor']) {
      const o = won.find((x) => x.category === id)!;
      expect(comp).toContain(o.work ?? o.subjects[0]);
    }
    expect(new Set(won.filter((o) => o.category).map((o) => o.category)).size).toBe(12); // every prize the game holds
  });

  it('holds the 2026 Annecy festival: its sections from the opening, the special prizes a day before the official ones', () => {
    const on = (day: string, kind: string) => recordedResults('annecy', 2026, day).filter((o) => o.kind === kind);
    expect(recordedResults('annecy', 2026, '2026-06-20')).toEqual([]);
    const sel = on('2026-06-21', 'nominees');
    expect(sel.reduce((n, o) => n + o.subjects.length, 0)).toBe(257);
    expect(sel.find((o) => o.category === 'features')!.subjects).toContain('The Violinist');
    expect(on('2026-06-26', 'winner').find((o) => o.category === 'canal-junior')!.subjects).toEqual(['Piccolo Piccolo']);
    expect(on('2026-06-26', 'winner').some((o) => o.category === 'feature-cristal')).toBe(false);
    const won = on('2026-06-27', 'winner');
    expect(won.find((o) => o.category === 'feature-cristal')!.subjects).toEqual(['The Violinist']);
    // Two prizes are called Jury Award; each is the game's own category for its section.
    expect(won.find((o) => o.category === 'feature-jury')!.subjects).toEqual(['Iron Boy']);
    expect(won.find((o) => o.category === 'short-jury')!.subjects).toEqual(['God Is Shy']);
    expect(won).toHaveLength(36);
  });

  it('holds the 83rd Venice festival: the Competition from NAZA\'s addition, the rest from the opening, the prizes from September 12', () => {
    const on = (day: string, kind: string) => recordedResults('venice', 2026, day).filter((o) => o.kind === kind);
    expect(on('2026-08-23', 'nominees')).toEqual([]);
    expect(on('2026-08-24', 'nominees').map((o) => [o.category, o.subjects.length])).toEqual([['competition', 21]]);
    expect(Object.fromEntries(on('2026-09-02', 'nominees').filter((o) => o.category).map((o) => [o.category, o.subjects.length]))).toEqual({ competition: 21, 'out-of-competition': 40, orizzonti: 19, 'orizzonti-corti': 15, spotlight: 8 });
    expect(on('2026-09-11', 'winner').map((o) => o.subjects[0])).toEqual(['George Clooney', 'Ellen Burstyn']);
    const won = on('2026-09-12', 'winner');
    // The Golden Lion and the Grand Jury Prize are the reference set's; the page's own spelling stays there.
    expect(won.find((o) => o.category === 'golden-lion')!.id).toBe('v7-venice-golden_lion-winner');
    expect(won.find((o) => o.category === 'volpi-actress')).toMatchObject({ subjects: ['Mathilde Arcel'], work: 'Kvinde Ukendt' });
    expect(won.find((o) => o.category === 'orizzonti-short')!.subjects).toEqual(['Quelques instants de bonheur']);
    expect(new Set(won.filter((o) => o.category).map((o) => o.category)).size).toBe(18); // every prize the game holds, and the lifetime lions
  });

  it('holds the 74th San Sebastián festival\'s awards from its closing night, the shared Silver Shell as one result', () => {
    const on = (day: string) => recordedResults('san-sebastian', 2026, day);
    expect(on('2026-09-25')).toEqual([]);
    const won = on('2026-09-26');
    expect(won).toHaveLength(22);
    expect(won.find((o) => o.category === 'golden-shell')!.subjects).toEqual(['Tender Loving Care']);
    expect(won.find((o) => o.category === 'silver-shell-leading')!.subjects).toEqual(['Kate O’Flynn, for Tender Loving Care', 'Asta Kamma August, for Markens grøde']);
    expect(won.filter((o) => o.category === 'donostia').map((o) => o.subjects[0])).toEqual(['Werner Herzog', 'Naomi Watts']);
  });

  it('holds the 31st Busan festival: its Competition and the opening night\'s honours from October 6, the rest from October 15', () => {
    const on = (day: string) => recordedResults('busan', 2026, day);
    expect(on('2026-10-05')).toEqual([]);
    expect(on('2026-10-06').find((o) => o.category === 'competition')!.subjects).toHaveLength(13);
    expect(on('2026-10-06').filter((o) => o.kind === 'winner').map((o) => o.subjects[0])).toEqual(['Michelle Yeoh', 'Kim Dong-ho', 'Ann Hui']);
    const won = on('2026-10-15').filter((o) => o.kind === 'winner');
    expect(won.find((o) => o.categoryName === 'Busan Award for Best Film')!.subjects).toEqual(['Midday Meal']);
    // A prize given twice is one result naming both, each with the film.
    expect(won.find((o) => o.categoryName === 'Busan Award for Best Actor')!.subjects).toEqual(['Zhou Xun, for The First Taste of Loneliness', 'Himeno Kashun, for Satoko Always']);
  });

  it('holds the 59th Sitges festival: the competitive awards from October 17, the honorary ones from its last day', () => {
    const on = (day: string) => recordedResults('sitges', 2026, day);
    expect(on('2026-10-16')).toEqual([]);
    expect(on('2026-10-17').find((o) => o.category === 'best-film')!.subjects).toEqual(['Sanguine']);
    expect(on('2026-10-17').some((o) => o.category === 'grand-honorary')).toBe(false);
    expect(on('2026-10-18').filter((o) => o.category === 'grand-honorary').map((o) => o.subjects[0])).toEqual(['Kevin Bacon', 'Kyra Sedgwick', 'Sir Peter Jackson', 'Danny DeVito', 'Amy Irving']);
    expect(on('2026-10-18')).toHaveLength(50);
  });

  // The owner's research recovery package of November 19, 2026 (docs/recovery/MAPPING.md).
  it('holds SXSW 2026 from its releases\' own dates: the jury awards from March 18, the audience awards from March 20', () => {
    const on = (day: string) => recordedResults('sxsw', 2026, day);
    expect(on('2026-03-17')).toEqual([]);
    expect(on('2026-03-18').find((o) => o.category === 'documentary-jury')!.subjects).toEqual(['Summer 2000: The X-Cetra Story']);
    expect(on('2026-03-19').some((o) => o.category === 'documentary-audience')).toBe(false);
    expect(on('2026-03-20').find((o) => o.category === 'documentary-audience')!.subjects).toEqual(['The Ascent']);
    // The files sit in an October upload folder; that isn't their date.
    expect(on('2026-03-20').every((o) => (o.published ?? '').startsWith('2026-03'))).toBe(true);
    // A jury award and an audience award for one short are two results, not one trophy twice.
    const paperTrail = on('2026-03-20').filter((o) => o.subjects.includes('Paper Trail')).map((o) => o.categoryName).sort();
    expect(paperTrail).toEqual(['Animated Short Competition Audience Award', 'Animated Short Competition Jury Award']);
  });

  it('shows IDFA\'s awards from their announcement on November 19, before the festival ends on November 22', () => {
    const s = startLife('idfa', 'gb-london', { startDate: '2026-11-01' });
    const ed = s.editions.find((e) => e.id === 'idfa-2026')!;
    const cat = institutionsById('idfa').categories.find((c) => c.id === 'international-award')!;
    expect(savedResult(s, ed, cat as never, '2026-11-18')?.winners ?? []).toEqual([]);
    expect(savedResult(s, ed, cat as never, '2026-11-19')).toMatchObject({ winners: ['The Year of the Ghost'], from: 'record' });
    expect(new Date(ed.end).toISOString() > '2026-11-22').toBe(true);
  });

  it('keeps the European Film Awards\' editions apart: the 39th\'s nominees from November 14, the 38th never in a 2026 edition', () => {
    expect(recordedResults('european-film-awards', 2026, '2026-11-13')).toEqual([]);
    const noms = recordedResults('european-film-awards', 2026, '2026-11-14');
    expect(noms.every((o) => o.kind === 'nominees' && o.edition === '39th European Film Awards')).toBe(true);
    expect(noms.find((o) => o.category === 'director')!.subjects).toHaveLength(5);
    // The 38th (January 2026) is the 2025 edition, held as reported: its archive page gives no date.
    const old = recordedResults('european-film-awards', 2025, '2026-11-20');
    expect(old.find((o) => o.category === 'film')).toMatchObject({ subjects: ['Sentimental Value'], status: 'reported' });
    expect(noms.some((o) => o.subjects.includes('Sentimental Value'))).toBe(false);
  });

  it('holds the International Emmys\' and the Gothams\' nominees before their ceremonies, and no winner', () => {
    expect(recordedResults('international-emmys', 2026, '2026-09-22')).toEqual([]);
    const ie = recordedResults('international-emmys', 2026, '2026-11-20');
    expect(ie.every((o) => o.kind === 'nominees')).toBe(true);
    expect(ie.find((o) => o.category === 'actor')!.subjects).toContain('Ricardo Darín (The Eternaut)');
    expect(recordedResults('gotham', 2026, '2026-10-26')).toEqual([]);
    const g = recordedResults('gotham', 2026, '2026-11-20');
    expect(g.every((o) => o.kind === 'nominees')).toBe(true);
    expect(g.find((o) => o.category === 'documentary')!.subjects).toEqual(['Closure', 'A Fox Under a Pink Moon', 'Naza', 'Once Upon a Time in Harlem', 'You Can See Everything']);
  });

  it('never calls a secondary report verified, and says so where it shows one', () => {
    const wrong = DATASETS.flatMap((d) => d.observations.filter((o) => /secondary|undated/i.test(d.sources[o.source].access) && o.status !== 'reported').map((o) => o.id));
    expect(wrong).toEqual([]);
    const s = startLife('locarno', 'gb-london', { startDate: '2026-08-01' });
    const ed = s.editions.find((e) => e.id === 'locarno-2026')!;
    const pardo = institutionsById('locarno').categories.find((c) => c.id === 'pardo')!;
    expect(savedResult(s, ed, pardo as never, '2026-08-15')).toMatchObject({ winners: ["You Don't Belong Here"], reported: true });
    const bafta = s.editions.find((e) => e.id === 'bafta-film-2026')!;
    const director = institutionsById('bafta-film').categories.find((c) => c.id === 'director')!;
    expect(savedResult(s, bafta, director as never, '2026-08-15')).toMatchObject({ winners: ['Paul Thomas Anderson'], from: 'record' });
    expect(savedResult(s, bafta, director as never, '2026-08-15')!.reported).toBeUndefined();
  });

  it('keeps the BAFTA Television Craft Awards a ceremony of their own, never merged into the Television Awards', () => {
    const tv = recordedResults('bafta-tv', 2026, '2026-11-20');
    expect(tv.every((o) => o.edition === '2026 BAFTA Television Awards' && o.published === '2026-05-10')).toBe(true);
    const craft = recordedResults('bafta-tv-craft', 2026, '2026-11-20');
    expect(craft).toHaveLength(23);
    expect(craft.every((o) => o.published === '2026-04-26' && o.category === null)).toBe(true);
    // A craft award the record gives to a programme names no person.
    expect(craft.find((o) => o.categoryName === 'Sound: Fiction')).toMatchObject({ subjects: ['Adolescence'], recipients: 'work_only' });
  });

  it('cites a source for every observation, never publishes before it happens, and names the game\'s own categories', () => {
    const insts = (institutions as { institutions: { id: string; categories: { id: string }[]; official?: Record<string, { label?: string }> }[] }).institutions;
    const wrong: string[] = [];
    const seen = new Set<string>();
    for (const d of DATASETS) for (const o of d.observations) {
      const inst = insts.find((x) => x.id === o.institution);
      if (!inst) { if (!d.coverage.unplacedInstitutions?.[o.institution]) wrong.push(`${o.id}: no institution ${o.institution}`); continue; }
      if (o.category !== null && !inst.categories.some((c) => c.id === o.category)) wrong.push(`${o.id}: no category ${o.category}`);
      if (inst.official?.[o.year]?.label && inst.official[o.year].label !== o.edition) wrong.push(`${o.id}: edition ${o.edition} isn't the institution's ${o.year} edition`);
      if (!o.published || o.published < o.occurred) wrong.push(`${o.id}: published before it happened, or unknown`);
      if (!d.sources[o.source] || (o.publishedSource && !d.sources[o.publishedSource])) wrong.push(`${o.id}: source missing`);
      if (!sourceOf(o).url.startsWith('https://')) wrong.push(`${o.id}: no link`);
      if (seen.has(`${o.id}@${o.revision}`)) wrong.push(`${o.id}: revision ${o.revision} twice`);
      seen.add(`${o.id}@${o.revision}`);
      if (!o.subjects.length || o.subjects.some((x) => !x.trim())) wrong.push(`${o.id}: no subject`);
    }
    expect(wrong).toEqual([]);
  });

  it('keeps an inferred audience week out of strict playback, compares only like with like, and shows values as displayed', () => {
    expect(audienceAt('2026-11-13')).toEqual([]); // reference: test_packet_inferred_audience_hidden_in_strict_mode
    expect(audienceAt('2026-11-13', true)).toHaveLength(AUDIENCE_ROWS.length);
    expect(audienceAt('2026-11-09', true)).toEqual([]); // before Tuesday's inferred publication
    const a = { metric: 'views', unit: 'views', territory: 'global', period_start: '2026-11-02', period_end: '2026-11-08', methodology: 'hours/runtime' };
    expect(comparable(a, a)).toBe(true);
    expect(comparable(a, { ...a, territory: 'US' })).toBe(false);
    expect(comparable(a, { ...a, unit: 'minutes' })).toBe(false);
    expect(comparable(a, { ...a, methodology: undefined })).toBe(false);
    expect(displayed(AUDIENCE_ROWS[0])).toBe('8.6 million views');
  });

  it('isn\'t stored in a save; a new save holds the 2026 ceremonies on their announced dates', () => {
    const s = startLife('history', 'us-los-angeles');
    expect(serialize(s)).not.toContain('One Battle after Another');
    const globes = s.editions.find((e) => e.id === 'golden-globes-2026')!;
    expect([new Date(globes.start).toISOString(), globes.provenance]).toEqual(['2026-01-12T01:00:00.000Z', 'official']); // 17:00 in Los Angeles
    expect(s.editions.find((e) => e.id === 'oscars-2026')!.provenance).toBe('official');
  });
});
