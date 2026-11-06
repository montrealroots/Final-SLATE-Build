import { describe, expect, it } from 'vitest';
import { CREATION_STEPS, creationStep, emptyDraft, normalizeDraft, validateDraft } from '../src/engine/state';
import { memoryStore, readDraft, writeDraft } from '../src/engine/save';
import { draft } from './fixtures';

describe('character creation steps', () => {
  it('every validation problem points at the screen that owns its field', () => {
    const problems = validateDraft({ ...emptyDraft(), startDate: 'bad', startTime: 'bad' });
    expect(problems.length).toBeGreaterThan(5);
    for (const p of problems) expect(creationStep(p.step).fields, `${p.field} on ${p.step}`).toContain(p.field);
    // Each field belongs to exactly one screen.
    const owners = CREATION_STEPS.flatMap((s) => s.fields);
    expect(new Set(owners).size).toBe(owners.length);
  });

  it('a draft saved with a numeric step reopens on the same screen, by id', () => {
    const old = { ...draft(), step: 4 } as unknown;
    expect(normalizeDraft(old)!.step).toBe('birthday');
    expect(normalizeDraft({ ...draft(), step: 7 })!.step).toBe('review');
    expect(normalizeDraft({ ...draft(), step: 99 })!.step).toBe('review');
    expect(normalizeDraft({ ...draft(), step: 'nowhere' })!.step).toBe('name');
  });

  it('a partial or damaged draft keeps what it has and fills the rest, instead of breaking the screen', () => {
    const d = normalizeDraft({ name: 'Ines', step: 'languages', heritages: 'oops', languages: null })!;
    expect(d.name).toBe('Ines');
    expect(d.step).toBe('languages');
    expect(d.heritages).toEqual([]);
    expect(d.languages).toEqual([]);
    expect(d.startTime).toBe('08:00');
    expect(normalizeDraft('nonsense')).toBeNull();
    expect(normalizeDraft([1, 2])).toBeNull();
  });

  it('everything entered survives a save and reopen, including the return-to-Review flag', () => {
    const kv = memoryStore();
    const d = { ...draft(), step: 'languages' as const, returnToReview: true, heritageCustomText: 'half typed' };
    writeDraft(kv, d);
    expect(readDraft(kv)).toEqual(d);
  });
});
