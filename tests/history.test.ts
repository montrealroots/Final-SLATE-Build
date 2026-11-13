// Recorded history (src/engine/history.ts; the owner's v6 package, J01 and J21): nothing is reportable before it was
// published, a correction applies only from its own date, the data names its sources and the game's categories, and a
// save holds none of it, so a reload can't duplicate a result.
import { describe, expect, it } from 'vitest';
import institutions from '../src/data/institutions.json';
import { DATASETS, holdsRecords, observationsAt, recordedResults, reportableFrom, sourceOf, type HistoryDataset } from '../src/engine/history';
import { serialize } from '../src/engine/save';
import { startLife } from './helpers';

const at = (iso: string) => Date.parse(iso);
const ids = (xs: { id: string }[]) => xs.map((x) => x.id).sort();

describe('recorded history', () => {
  it('shows nothing before it was published, and each result from the end of its published day where it was announced', () => {
    expect(observationsAt(at('2026-01-05T16:00:00Z'))).toEqual([]);
    // The Golden Globes, January 11 in Los Angeles: reportable from midnight going into January 12 there (08:00 UTC).
    expect(recordedResults('golden-globes', 2026, at('2026-01-12T07:59:00Z'))).toEqual([]);
    expect(ids(recordedResults('golden-globes', 2026, at('2026-01-12T08:00:00Z')))).toEqual(['globes-83-animated', 'globes-83-comedy', 'globes-83-director', 'globes-83-drama', 'globes-83-non-english']);
    // The Oscars: the Best Picture nominees after January 22; no winner until March 15 has ended in Los Angeles.
    const feb = recordedResults('oscars', 2026, at('2026-02-01T00:00:00Z'));
    expect(ids(feb)).toEqual(['oscars-98-picture-nominees']);
    expect(feb[0].subjects).toHaveLength(10);
    expect(recordedResults('oscars', 2026, at('2026-03-16T06:59:00Z')).some((o) => o.kind === 'winner')).toBe(false);
    const after = recordedResults('oscars', 2026, at('2026-03-16T07:00:00Z'));
    expect(after.find((o) => o.id === 'oscars-98-picture')).toMatchObject({ subjects: ['One Battle after Another'], credited: 'Adam Somner, Sara Murphy and Paul Thomas Anderson, Producers' });
    expect(holdsRecords('oscars', 2026)).toBe(true);
    expect(holdsRecords('oscars', 2027)).toBe(false);
  });

  it('applies a correction only from its own publication, keeping the earlier revision before it', () => {
    const base = DATASETS[0].observations[0];
    const fixture: HistoryDataset = { ...DATASETS[0], observations: [base, { ...base, subjects: ['A Corrected Title (Fixture)'], published: '2026-02-01', revision: 2 }] };
    expect(observationsAt(at('2026-01-20T00:00:00Z'), () => true, [fixture])[0].subjects).toEqual(base.subjects);
    expect(observationsAt(at('2026-02-03T00:00:00Z'), () => true, [fixture])[0]).toMatchObject({ revision: 2, subjects: ['A Corrected Title (Fixture)'] });
    expect(reportableFrom({ ...base, institution: 'nowhere-known' })).toBeGreaterThan(reportableFrom(base)); // an unknown place waits for the last time zone
  });

  it('cites a source for every observation, never publishes before it happens, and names the game\'s own categories and editions', () => {
    const insts = (institutions as { institutions: { id: string; categories: { id: string }[]; official?: Record<string, { label?: string }> }[] }).institutions;
    const wrong: string[] = [];
    const seen = new Set<string>();
    for (const d of DATASETS) for (const o of d.observations) {
      const inst = insts.find((x) => x.id === o.institution);
      if (!inst) { wrong.push(`${o.id}: no institution ${o.institution}`); continue; }
      if (!inst.categories.some((c) => c.id === o.category)) wrong.push(`${o.id}: no category ${o.category}`);
      if (inst.official?.[o.year]?.label !== o.edition) wrong.push(`${o.id}: edition ${o.edition} isn't the institution's ${o.year} edition`);
      if (o.published < o.occurred) wrong.push(`${o.id}: published before it happened`);
      if (!d.sources[o.source] || (o.publishedSource && !d.sources[o.publishedSource])) wrong.push(`${o.id}: source missing`);
      if (!sourceOf(o).url.startsWith('https://')) wrong.push(`${o.id}: no link`);
      if (seen.has(`${o.id}@${o.revision}`)) wrong.push(`${o.id}: revision ${o.revision} twice`);
      seen.add(`${o.id}@${o.revision}`);
      if (!o.subjects.length || o.subjects.some((x) => !x.trim())) wrong.push(`${o.id}: no subject`);
    }
    expect(wrong).toEqual([]);
  });

  it('isn\'t stored in a save; a new save holds the 2026 ceremonies on their announced dates', () => {
    const s = startLife('history', 'us-los-angeles');
    expect(serialize(s)).not.toContain('One Battle after Another');
    const globes = s.editions.find((e) => e.id === 'golden-globes-2026')!;
    expect([new Date(globes.start).toISOString(), globes.provenance]).toEqual(['2026-01-12T01:00:00.000Z', 'official']); // 17:00 in Los Angeles
    expect(s.editions.find((e) => e.id === 'oscars-2026')!.provenance).toBe('official');
  });
});
