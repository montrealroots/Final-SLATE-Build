// A part's gender (types.ts StoryCharacter.gender; the owner, November 19, 2026: "in the creation set their gender") and
// who matches it in casting (script-explain.ts genderMatches): a real performer by the awards record, the game's own by
// their pronouns. It marks and orders the list; it scores nothing.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyRecognition } from '../src/engine/recognition';
import { genderMatches, performerGender } from '../src/engine/script-explain';

describe("a part's gender in casting", () => {
  it("reads the game's own performers by their pronouns", () => {
    expect(performerGender({ id: 'p1', pronouns: 'she' })).toBe('woman');
    expect(performerGender({ id: 'p2', pronouns: 'he' })).toBe('man');
    expect(performerGender({ id: 'p3', pronouns: 'they' })).toBe('nonbinary');
  });

  it('reads a real performer by the awards record, and knows nothing of them without it', () => {
    expect(performerGender({ id: 'tp_11514' })).toBeUndefined();
    applyRecognition(JSON.parse(readFileSync('src/data/recognition.json', 'utf8')));
    expect(performerGender({ id: 'tp_11514' })).toBe('woman'); // Catherine O'Hara
    expect(performerGender({ id: 'tp_6752' })).toBe('man'); // Željko Ivanek
  });

  it('matches everyone to a part open to anyone, and only the gender written to one that has it', () => {
    expect(genderMatches({}, { id: 'p2', pronouns: 'he' })).toBe(true);
    expect(genderMatches({ gender: 'woman' }, { id: 'p1', pronouns: 'she' })).toBe(true);
    expect(genderMatches({ gender: 'woman' }, { id: 'p2', pronouns: 'he' })).toBe(false);
    expect(genderMatches({ gender: 'man' }, { id: 'tp_6752' })).toBe(true);
    expect(genderMatches({ gender: 'man' }, { id: 'tp_999999999' })).toBe(false);
  });
});
