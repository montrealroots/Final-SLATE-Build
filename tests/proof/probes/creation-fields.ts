// The new game's own fields (Creation.tsx), each changed in the draft a career starts from (helpers.ts startLife): the
// date it starts, the holidays you keep, and how well you speak a language a part you play is written in.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { castPlayer } from '../../../src/engine/hiring';
import { OBSERVANCES } from '../../../src/engine/observances';
import { short } from './script';
import { CG } from './plan-fields';

const C = (label: string) => `field:Creation.tsx#${label}#1`;
/** Before the money is raised: the player cast as the lead, on camera. */
const castSelf = (s: GameState, p: Project) => { const c = p.characters.find((x) => x.name === 'Lead'); if (c && !p.cast.some((x) => x.characterId === c.id)) try { castPlayer(s, p, c.id, 'on-camera'); } catch { /* not castable */ } };
/** The default short written in French, its lead a French speaker. */
const FRENCH = short({ axes: { dialogueLanguages: ['fr'] }, lead: { languages: ['fr'] } });
/** startLife's languages (helpers.ts) with French at `level`. */
const french = (level: 'Fluent' | 'Basic') => ({ languages: [{ code: 'ja', proficiency: 'Fluent' as const }, { code: 'fr', proficiency: level }] });

export const PROBES: Probe[] = [
  // A life starts in a year from 2026 to 2050 (state.ts validateDraft): the world as it is then, its prices and people.
  { id: 'start-2040', features: [C('"Starting Date"')], decision: 'Start the career in January 2040 rather than January 2026', reads: ['src/engine/state.ts#newGame'],
    variant: { creation: { startDate: '2040-01-09' } }, measure: (s) => ({ year: new Date(s.now).getUTCFullYear() }),
    // At four careers the final balance was $355,000 higher, and nothing the films spent or earned moved measurably.
    bites: ['year'], downstream: ['money'] },
  // A holiday you keep is a day off wherever you work (production/schedule.ts isWorkingDay): on the 3D short, whose
  // animation runs for months, every holiday in the list.
  { id: 'observances-kept', features: [C('{o.name}')], decision: 'Keep every holiday the game lists, on the 3D short', reads: ['src/engine/production/schedule.ts#isWorkingDay', 'src/engine/observances.ts#observancesOn'],
    base: { project: CG }, variant: { project: CG, creation: { observances: OBSERVANCES.map((o) => o.id) } }, bites: ['daysToDeliver'], downstream: ['revenue', 'money'] },
  // A part in a language you speak only a little is coached (production/language.ts personLanguagesFit).
  { id: 'french-basic', features: [C("{`${languageName(l.code)} Proficiency`}")], decision: 'Speak basic French rather than fluent, then play the French-speaking lead yourself', reads: ['src/engine/production/language.ts#personLanguagesFit'],
    base: { project: FRENCH, decide: castSelf, creation: french('Fluent') }, variant: { project: FRENCH, decide: castSelf, creation: french('Basic') }, bites: ['hired'], downstream: ['spent', 'ownIn'] },
];
