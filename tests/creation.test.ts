import { describe, expect, it } from 'vitest';
import { CREATION_STEPS, creationStep, emptyDraft, newGame, normalizeDraft, validateDraft } from '../src/engine/state';
import { settledTitle } from '../src/data/identity';
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

  it("creation has 1221's steps, holding only what the engine keeps", () => {
    expect(CREATION_STEPS.map((s) => s.title)).toEqual(['Identity', 'Background & Languages', 'Starting Point', 'Review']);
  });

  it('a draft saved by the eight-step creation reopens on the step that now holds the same fields', () => {
    const old = { ...draft(), step: 4 } as unknown; // the old Birthday screen, by number
    expect(normalizeDraft(old)!.step).toBe('identity');
    expect(normalizeDraft({ ...draft(), step: 7 })!.step).toBe('review');
    expect(normalizeDraft({ ...draft(), step: 99 })!.step).toBe('review');
    expect(normalizeDraft({ ...draft(), step: 'nowhere' })!.step).toBe('identity');
    const byId: Record<string, string> = {
      name: 'identity', pronouns: 'identity', birthday: 'identity', background: 'background', languages: 'background',
      'start-date': 'starting-point', 'start-location': 'starting-point', review: 'review', 'starting-point': 'starting-point',
    };
    for (const [old2, now] of Object.entries(byId)) expect(normalizeDraft({ ...draft(), step: old2 })!.step, old2).toBe(now);
  });

  it('a partial or damaged draft keeps what it has and fills the rest, instead of breaking the screen', () => {
    // A draft from before names had parts: its one name becomes the first and last names (November 8, 2026).
    const d = normalizeDraft({ name: 'Ines Okafor-Reyes', step: 'background', heritages: 'oops', languages: null })!;
    expect([d.firstName, d.middleName, d.lastName, d.preferredName]).toEqual(['Ines', '', 'Okafor-Reyes', '']);
    expect(d.name).toBeUndefined();
    expect(d.step).toBe('background');
    expect(d.heritages).toEqual([]);
    expect(d.languages).toEqual([]);
    expect(d.startTime).toBe('08:00');
    expect(normalizeDraft('nonsense')).toBeNull();
    expect(normalizeDraft([1, 2])).toBeNull();
  });

  it('everything entered survives a save and reopen, including the return-to-Review flag', () => {
    const kv = memoryStore();
    const d = { ...draft(), step: 'background' as const, returnToReview: true, heritageCustomText: 'half typed' };
    writeDraft(kv, d);
    expect(readDraft(kv)).toEqual(d);
  });

  it('pronouns settle the billing as 1221 does: He/Him is Actor, She/Her is Actress, They/Them chooses', () => {
    expect(settledTitle('he')).toBe('Actor');
    expect(settledTitle('she')).toBe('Actress');
    expect(settledTitle('they')).toBeUndefined();
    // They/Them with nothing chosen can't start; a choice is kept.
    const titles = (d: ReturnType<typeof draft>) => validateDraft(d).filter((p) => p.field === 'actingTitle').map((p) => p.message);
    expect(titles(draft({ pronouns: 'they', actingTitle: '' }))).toEqual(['Choose how you are billed.']);
    expect(newGame(draft({ pronouns: 'they', actingTitle: 'Actress' }), 0, 'save-a').character.actingTitle).toBe('Actress');
    // He/Him and She/Her need no choice, and a stale one never wins (the award categories read this title).
    expect(titles(draft({ pronouns: 'he', actingTitle: '' }))).toEqual([]);
    expect(newGame(draft({ pronouns: 'he', actingTitle: 'Actress' }), 0, 'save-b').character.actingTitle).toBe('Actor');
    expect(normalizeDraft({ ...draft(), pronouns: 'she', actingTitle: 'Actor' })!.actingTitle).toBe('Actress');
    expect(normalizeDraft({ ...draft(), pronouns: 'they', actingTitle: 'Actress' })!.actingTitle).toBe('Actress');
  });
});
