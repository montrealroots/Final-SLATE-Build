// Language fit between performers and the dialogue languages (a consumer of character-creation languages).
// Part of the production engine; src/engine/production.ts is its public interface.

import { personById } from '../people';
import { isReal } from '../guests';
import { approvedCharacters } from '../projects';
import type { GameState, Project } from '../types';

export function personLanguagesFit(state: GameState, p: Project, a: { characterId: string; performer: string }): boolean {
  const c = approvedCharacters(p).find((x) => x.id === a.characterId);
  if (!c) return true;
  const langs = c.languages.length ? c.languages : [p.axes.dialogueLanguages[0]];
  if (a.performer === 'player') {
    const known = [state.character.mainLanguage, ...state.character.languages.filter((l) => l.proficiency !== 'Basic').map((l) => l.code)];
    return langs.every((l) => known.includes(l));
  }
  // A real person's languages aren't recorded, and none is supposed either way (guests.ts): no coach is required for them.
  if (isReal(a.performer)) return true;
  const person = personById(state, a.performer);
  return langs.every((l) => person.languages.includes(l));
}

/** Names of cast characters whose performer needs coaching in a dialogue language. */
export function coachingNeeded(state: GameState, p: Project): string[] {
  return p.cast.filter((a) => !personLanguagesFit(state, p, a)).map((a) => approvedCharacters(p).find((c) => c.id === a.characterId)?.name ?? '');
}
