// Recorded history (src/engine/history.ts; the owner's v6 package J01 and J21, and the v7 package's reference logic):
// nothing is reportable before its published date, an unknown publication is never reported, a correction applies
// only from its own date, inferred availability needs an explicit opt-in, figures are comparable only in the same
// scope, and a save holds none of it.
import { describe, expect, it } from 'vitest';
import institutions from '../src/data/institutions.json';
import { AUDIENCE_ROWS, DATASETS, audienceAt, comparable, displayed, holdsRecords, observationsAt, recordedResults, reportable, sourceOf, type HistoryDataset } from '../src/engine/history';
import { serialize } from '../src/engine/save';
import { startLife } from './helpers';

const ids = (xs: { id: string }[]) => xs.map((x) => x.id).sort();

describe('recorded history', () => {
  it('shows nothing before its published date, and each result from that date in the player\'s calendar', () => {
    expect(observationsAt('2025-12-02')).toEqual([]); // the Spirit Awards' nominees, December 3, 2025, are the first
    // The Golden Globes' nominees from December 8, 2025 (from November 19, 2026; until then none was recorded, and a
    // January start saw nothing), its winners from January 11.
    // By then: nominees only, the Spirit Awards', the PGA's documentary field (December 9, 2025) and the Golden Globes'.
    expect(observationsAt('2026-01-05').every((o) => o.kind === 'nominees')).toBe(true);
    expect([...new Set(observationsAt('2026-01-05').map((o) => o.institution))].sort()).toEqual(['golden-globes', 'pga', 'spirit']);
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
    expect(recordedResults('bafta-film', 2026, '2026-02-22').filter((o) => o.category === null).map((o) => o.categoryName)).toEqual(['Supporting Actor', 'Supporting Actress']);
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

  it('cites a source for every observation, never publishes before it happens, and names the game\'s own categories', () => {
    const insts = (institutions as { institutions: { id: string; categories: { id: string }[]; official?: Record<string, { label?: string }> }[] }).institutions;
    const wrong: string[] = [];
    const seen = new Set<string>();
    for (const d of DATASETS) for (const o of d.observations) {
      const inst = insts.find((x) => x.id === o.institution);
      if (!inst) { wrong.push(`${o.id}: no institution ${o.institution}`); continue; }
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
