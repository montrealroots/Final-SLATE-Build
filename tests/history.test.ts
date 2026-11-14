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
    expect(observationsAt('2026-01-05')).toEqual([]);
    expect(recordedResults('golden-globes', 2026, '2026-01-10')).toEqual([]);
    expect(ids(recordedResults('golden-globes', 2026, '2026-01-11'))).toEqual(['globes-83-animated', 'globes-83-comedy', 'globes-83-director', 'globes-83-drama', 'globes-83-non-english']);
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
    const emmys = recordedResults('emmys', 2026, '2026-09-14');
    expect(emmys.map((o) => [o.category, o.subjects, o.recipients])).toEqual([['comedy', ['Widow’s Bay'], 'work_only'], ['drama', ['The Pitt'], 'work_only'], ['limited', ['DTF St. Louis'], 'work_only']]);
    expect(recordedResults('cannes', 2026, '2026-05-23').find((o) => o.category === 'director')!.subjects).toHaveLength(3); // shared: La Bola Negra's two directors and Fatherland's (FEST01)
    expect(recordedResults('bafta-film', 2026, '2026-02-22').filter((o) => o.category === null).map((o) => o.categoryName)).toEqual(['Supporting Actor', 'Supporting Actress']);
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
