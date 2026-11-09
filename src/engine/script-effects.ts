// What the script's fields drive downstream (November 7, 2026; revised the same day after review). The rules:
// - Prose is never read for meaning, never raises quality and never buys time. It is the player's creative record and the
//   material of real documents (pitch, treatment, statement of intent) that some processes ask for by name; a process
//   that needs one says which, and which fields are still empty, and the player sends it explicitly.
// - Structured choices drive engines only where the choice itself is what a real process reads: the producer's award
//   placement, a series regular's contract, a narrator's recording session, declared content against an outlet's rules.
// - What was removed in the revision, and why, is in docs/SCREENWRITING-AUDIT.md: story functions deciding award
//   placement, a rating inferred from one checkbox, an 18+ ban on broadcast, text-presence delays and bonuses, the
//   turning-point penalty, word-count notes and word-priced subtitles.
import type { ContentLevel, GenrePick, Project, RoleSize, StoryCharacter } from './types';

/** Comedy and musical genres: the categories that split drama from comedy read these (awards.ts). */
export const COMEDY_MUSICAL = ['comedy', 'musical', 'romantic-comedy', 'action-comedy', 'buddy-comedy', 'screwball-comedy', 'slapstick', 'farce', 'parody', 'satire', 'black-comedy', 'stoner-comedy', 'horror-comedy', 'backstage-musical', 'jukebox-musical'];

/**
 * Where the project competes where awards split drama from comedy: the producer's declaration, else its primary genres.
 * A secondary comedy genre is a flavour of a drama, not a comedy. Until November 9, 2026 any comedy genre made it a
 * comedy, and which genres were primary changed nothing anywhere.
 */
export function competesAs(p: Project): 'comedy' | 'drama' {
  if (p.axes.register) return p.axes.register;
  const primary: GenrePick[] = p.axes.genres.filter((g) => g.emphasis === 'primary');
  return (primary.length ? primary : p.axes.genres).some((g) => COMEDY_MUSICAL.includes(g.id)) ? 'comedy' : 'drama';
}

// ---------------- Award placement ----------------

/** The acting category a part's size suggests when the producer hasn't placed it. Cameos and background aren't entered. */
const PLACEMENT_BY_SIZE: Record<RoleSize, 'lead' | 'supporting' | null> = {
  lead: 'lead', 'co-lead': 'lead', 'ensemble-lead': 'lead', supporting: 'supporting', featured: 'supporting', cameo: null, background: null,
};

/**
 * The acting category a performance is entered in: the producer's placement, else the part's size. Entrants declare
 * placement in practice; an organizer that decides it by its own vote isn't modeled. Story functions never decide it:
 * an antagonist can be a supporting part, a narrator a small one.
 */
export function castPlacement(c: Pick<StoryCharacter, 'roleSize' | 'awardPlacement'>): 'lead' | 'supporting' | null {
  if (c.awardPlacement) return c.awardPlacement === 'none' ? null : c.awardPlacement;
  return PLACEMENT_BY_SIZE[c.roleSize];
}

// ---------------- Content ----------------

const LEVELS: ContentLevel[] = ['mild', 'moderate', 'strong'];

/** The highest level declared, 'none' when declared as containing none, null when not declared yet. A model, not a rating. */
export function contentLevel(p: Project): ContentLevel | 'none' | null {
  const c = p.axes.content;
  if (!c) return null;
  const top = Object.values(c).reduce((m, l) => (l && LEVELS.indexOf(l) > m ? LEVELS.indexOf(l) : m), -1);
  return top < 0 ? 'none' : LEVELS[top];
}

/** Whether declared content keeps a broadcast to a late slot: only content declared strong does. */
export function broadcastSlotFor(p: Project): 'any' | 'late' {
  return contentLevel(p) === 'strong' ? 'late' : 'any';
}

/** A late slot reaches fewer viewers, so it pays less; a broadcast edit for an earlier slot costs a deliverable. Simulation assumptions. */
export const LATE_SLOT_SHARE = 0.75;
export const BROADCAST_EDIT_COST = 2500;

// ---------------- Documents ----------------

export type DocumentId = 'pitch' | 'treatment' | 'statement';
type StoryKey = keyof Project['story'];

/** The documents some processes ask for, and the Story panel fields each is made from. */
export const DOCUMENTS: Record<DocumentId, { name: string; fields: (nonfiction: boolean) => [StoryKey, string][] }> = {
  pitch: { name: 'Pitch', fields: () => [['logline', 'Logline'], ['premise', 'Premise']] },
  treatment: { name: 'Treatment', fields: () => [['conflict', 'Central Conflict'], ['viewpoint', 'Point Of View'], ['ending', 'Intended Ending']] },
  statement: {
    name: 'Statement Of Intent',
    fields: (nf) => [['theme', 'Theme'], ['stakes', 'Stakes'], ...(nf ? [['question', 'Central Question'] as [StoryKey, string]] : [])],
  },
};

/** The Story panel fields a document still needs. Presence only: SLATE never judges what is written. */
export function missingFields(p: Project, doc: DocumentId, nonfiction: boolean): string[] {
  return DOCUMENTS[doc].fields(nonfiction).filter(([k]) => !String(p.story[k] ?? '').trim()).map(([, label]) => label);
}

const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** The documents' names in words: "a Pitch and a Treatment". */
export function documentNames(docs: DocumentId[]): string {
  return list(docs.map((d) => `a ${DOCUMENTS[d].name}`));
}

/**
 * What a submission still needs, or null when every document it includes can be sent. `who` names the submission:
 * "A grant application".
 */
export function documentsNeeded(p: Project, docs: DocumentId[], nonfiction: boolean, who: string): string | null {
  const missing = [...new Set(docs.flatMap((d) => missingFields(p, d, nonfiction)))];
  if (!missing.length) return null;
  return `${who} includes ${documentNames(docs)}. Still to write in the Story panel: ${list(missing)}.`;
}

/** Subtitling, per finished minute for each language a territory needs that the dialogue isn't in. Simulation assumption. */
export const SUBTITLE_PER_MINUTE = 12;

// ---------------- Structure ----------------

/** Cutting a scene declared essential leaves a gap the audience notices. Simulation assumption, in editing points. */
export const ESSENTIAL_CUT_COST = 8;
