// Considering someone the industry has recognised (recognition.ts) for a job on a project, from the hiring lists: the
// same as considering them from their page in the film catalog (guests.ts), with what the awards record holds of them
// (their name and dates; Wikidata, CC0) as their record. Their jobs, capability and asking rate are read from their
// recognition when they are first considered (guests.ts considerPerson).
import { considerFor, considerPerson, realId, realPerson, type Considered } from './guests';
import { recognitionData } from './recognition';
import type { GameState, Project } from './types';

/** Bring a recognised person into the save and consider them for this job on this project. */
export function considerRecognised(state: GameState, p: Project, tmdbId: number, c: Omit<Considered, 'personId'>, on: string): void {
  const data = recognitionData();
  const rec = data?.people[String(tmdbId)];
  if (!data || !rec?.[0]) throw new Error("The industry's record of awards isn't loaded.");
  // A record from the film catalog is fuller (their credits): it is kept, and only the consideration is added.
  if (!realPerson(state, realId(tmdbId))?.rec) {
    considerPerson(state, { id: tmdbId, name: rec[0], details: { birthday: rec[1], deathday: rec[2], retrievedAt: data.source.retrieved }, credits: [] }, data.source.retrieved, { cc0: true, awards: true });
  }
  considerFor(state, p, { ...c, personId: realId(tmdbId) }, on);
}
