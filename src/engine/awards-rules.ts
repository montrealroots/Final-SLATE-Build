// What the expanded festival and award catalog asks of a project and who receives each award (docs/awards/DESIGN.md,
// November 9, 2026). Every requirement reads something the project records or the player declares; none reads prose.
import { getPlace } from '../data/places';
import { personById } from './people';
import { competesAs } from './script-effects';
import type { Credit, GameState, Project } from './types';

/** What `Category` fields this module reads (kept structural so awards.ts and this module don't import each other). */
interface Asks { recipient: string; formats: string[]; class?: 'comedy' | 'drama'; family?: string[]; episodes?: [number, number]; material?: 'original' | 'adapted'; need?: string[]; crafts?: string[]; with?: string[]; actingTitle?: 'Actor' | 'Actress' }

const EUROPE = ['AL', 'AD', 'AM', 'AT', 'BA', 'BE', 'BG', 'BY', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GE', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'XK', 'LI', 'LT', 'LU', 'LV', 'MC', 'MD', 'ME', 'MK', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'SE', 'SI', 'SK', 'SM', 'TR', 'UA', 'VA'];
const LATIN_AMERICA = ['AR', 'BO', 'BR', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'GT', 'HN', 'MX', 'NI', 'PA', 'PE', 'PR', 'PY', 'SV', 'UY', 'VE'];
const ASIA_PACIFIC = ['AF', 'AU', 'BD', 'BT', 'BN', 'KH', 'CN', 'FJ', 'HK', 'IN', 'ID', 'JP', 'KZ', 'KG', 'LA', 'MO', 'MY', 'MV', 'MN', 'MM', 'NP', 'NZ', 'KP', 'PK', 'PG', 'PH', 'SG', 'KR', 'LK', 'TW', 'TJ', 'TH', 'TL', 'TM', 'UZ', 'VN', 'IR', 'IQ', 'IL', 'JO', 'LB', 'PS', 'SA', 'SY', 'AE', 'YE'];
const FANTASY = ['fantasy', 'science-fiction', 'dark-fantasy', 'space-opera', 'sword-and-sorcery', 'science-fantasy', 'cyberpunk', 'time-travel', 'superhero', 'fairy-tale'];
const SUBJECTS: Record<string, string> = { environment: 'climate or the environment', 'civil-rights': 'civil rights', 'social-issues': 'social issues', 'current-events': 'current events', arts: 'the arts', food: 'food' };

/** Subjects a player can declare for a project, with the label shown for each. */
export const PROJECT_SUBJECTS = Object.keys(SUBJECTS).map((id) => ({ id, label: ({ environment: 'Climate Or The Environment', 'civil-rights': 'Civil Rights', 'social-issues': 'Social Issues', 'current-events': 'Current Events', arts: 'The Arts', food: 'Food' } as Record<string, string>)[id] }));

const origin = (p: Project) => getPlace(p.axes.basePlaceId).country;
const runtime = (p: Project) => p.delivered?.runtimeMin ?? p.axes.targetRuntimeMin;
const delivered = (state: GameState, before: Project, kind: 'Directed By' | 'Written By') => state.projects.filter((x) => x.id !== before.id && x.delivered && (x.delivered.at ?? 0) <= (before.delivered?.at ?? Infinity) && x.credits.some((c) => c.person === 'player' && c.contribution === kind) && (x.axes.format === 'feature' || x.axes.format === 'documentary-feature'));

/** Why a project doesn't meet a category's requirements beyond format and medium, in the player's words. */
export function requirementProblems(state: GameState, p: Project, cat: Asks): string[] {
  const out: string[] = [];
  if (cat.class === 'comedy' && competesAs(p) !== 'comedy') out.push('This category is for comedy and musical work; this project competes as drama.');
  if (cat.class === 'drama' && competesAs(p) === 'comedy') out.push('Comedy and musical work competes in a separate category.');
  if (cat.family && p.axes.format === 'unscripted-series' && !cat.family.includes(p.unscripted?.family ?? '')) out.push('This category is for a different kind of unscripted program.');
  if (cat.episodes && (p.axes.episodeCount < cat.episodes[0] || p.axes.episodeCount > cat.episodes[1])) out.push(cat.episodes[1] === 1 ? 'This category is for one-off specials.' : 'This category is for series, not one-off specials.');
  if (cat.material === 'adapted' && p.source?.kind !== 'adapted') out.push('This category is for screenplays adapted from other work; this one is declared original.');
  if (cat.material === 'original' && p.source?.kind === 'adapted') out.push('This category is for original screenplays; this one is declared adapted.');
  const o = origin(p);
  const lang = p.axes.dialogueLanguages[0];
  for (const n of cat.need ?? []) {
    const fail = (why: string) => out.push(why);
    switch (n) {
      case 'debut': if (delivered(state, p, 'Directed By').length || !p.credits.some((c) => c.person === 'player' && c.contribution === 'Directed By')) fail('This category is for a director\'s first feature; you directed an earlier one, or didn\'t direct this one.'); break;
      case 'writer-debut': if (delivered(state, p, 'Written By').length || !p.credits.some((c) => c.person === 'player' && c.contribution === 'Written By')) fail('This category is for a writer\'s first produced feature screenplay.'); break;
      case 'new': if (p.continues) fail('This category is for a series\' first season.'); break;
      case 'over-60': if (runtime(p) <= 60) fail(`It runs ${runtime(p)} minutes. This takes work over 60.`); break;
      case 'over-70': if (runtime(p) <= 70) fail(`It runs ${runtime(p)} minutes. This takes work over 70.`); break;
      case 'under-60': if (runtime(p) >= 60) fail(`It runs ${runtime(p)} minutes. This takes work under 60.`); break;
      case 'max-20': if (runtime(p) > 20) fail(`It runs ${runtime(p)} minutes. This takes 20 minutes or less.`); break;
      case 'under-1m': if ((p.finance?.estimate ?? Infinity) >= 1_000_000) fail('This award is for films made for under $1,000,000.'); break;
      case 'indie': case 'independent': if (p.funding.scenarioId === 'commissioned' || p.finance?.deals.some((d) => d.kind === 'commissioner' && d.status === 'accepted')) fail('This award is for independent work, made without a studio or commissioner.'); break;
      case 'box-office': if (!p.releases.some((r) => r.route === 'theatrical' && r.status === 'released')) fail('This award goes on box office: it needs a theatrical release.'); break;
      case 'la-ny-theatrical': if (!p.releases.some((r) => r.route === 'theatrical' && r.status !== 'cancelled' && r.territories.includes('US'))) fail('It needs a theatrical run in Los Angeles or New York (a US theatrical release in the game).'); break;
      case 'non-english': if (lang === 'en') fail('This category is for work mainly in a language other than English.'); break;
      case 'archival': if (!p.scenes.some((s) => s.kind === 'archival')) fail('This award is for creative use of archive; the project has no archival material.'); break;
      case 'coproduction': if (!p.funding.extra.length) fail('This award is for international co-productions; the project has no co-production partner.'); break;
      case 'family': if (!['Family', 'Children (6 To 11)', 'Preschool'].includes(p.axes.audience)) fail('This is for work made for young audiences and families.'); break;
      case 'children': if (!['Children (6 To 11)', 'Family'].includes(p.axes.audience)) fail('This category is for children\'s programs.'); break;
      case 'preschool': if (p.axes.audience !== 'Preschool') fail('This category is for preschool programs.'); break;
      case 'mature': if (['Children (6 To 11)', 'Preschool', 'Family'].includes(p.axes.audience)) fail('This category is for programs made for older audiences.'); break;
      case 'period': if (p.storyTime !== 'period') fail('This category is for stories set in the past.'); break;
      case 'fantasy': if (p.storyTime !== 'future' && !p.axes.genres.some((g) => FANTASY.includes(g.id))) fail('This category is for fantasy and science fiction.'); break;
      case 'contemporary': if ((p.storyTime ?? 'contemporary') !== 'contemporary' || p.axes.genres.some((g) => FANTASY.includes(g.id))) fail('This category is for stories set in the present day.'); break;
      case 'half': if (p.axes.targetRuntimeMin > 40) fail('This category is for half-hour series.'); break;
      case 'hour': if (p.axes.targetRuntimeMin <= 40) fail('This category is for one-hour series.'); break;
      case 'breakthrough': break; // checked per performer (recipients)
      case 'us': if (o !== 'US') fail('This category is for American productions.'); break;
      case 'non-us': if (o === 'US') fail('This category is for productions made outside the United States.'); break;
      case 'europe': if (!EUROPE.includes(o)) fail('This category is for European productions.'); break;
      case 'europe-non-es': if (!EUROPE.includes(o) || o === 'ES') fail('This category is for European productions from outside Spain.'); break;
      case 'iberoamerica-non-es': if (!LATIN_AMERICA.includes(o) && o !== 'PT') fail('This category is for Ibero-American productions from outside Spain.'); break;
      case 'latin-america': if (!LATIN_AMERICA.includes(o)) fail('This section is for Latin American productions.'); break;
      case 'asia-pacific': if (!ASIA_PACIFIC.includes(o)) fail('This award is for Asian and Pacific productions.'); break;
      case 'basque': fail('This award is for Basque productions, which the game doesn\'t record yet.'); break;
      default: {
        const country: Record<string, string> = { fr: 'FR', es: 'ES', ca: 'CA', au: 'AU', jp: 'JP', nl: 'NL' };
        if (country[n] && o !== country[n]) fail('This category is for productions from the organizer\'s country.');
        else if (n.startsWith('non-') && o === n.slice(4).toUpperCase()) fail('This category is for productions from other countries.');
        else if (SUBJECTS[n] && !p.subjects?.includes(n)) fail(`This award is for work about ${SUBJECTS[n]}; declare it on the Overview if the story is.`);
      }
    }
  }
  return out;
}

const chars = (p: Project) => p.drafts.find((d) => d.number === p.approvedDraft)?.characters ?? [];
/** A performer's first credited role (the player's: no earlier delivered project with an acting credit). */
function breakthrough(state: GameState, p: Project, c: Credit): boolean {
  if (c.person !== 'player') return personById(state, c.person).experience === 1; // the least experienced performers in the pool
  return !state.projects.some((x) => x.id !== p.id && x.delivered && (x.delivered.at ?? 0) < (p.delivered?.at ?? Infinity) && x.credits.some((k) => k.person === 'player' && (k.contribution === 'Cast' || k.contribution === 'Voice Cast')));
}

/**
 * Credited recipients for the recipient kinds the expanded catalog adds, or null for the older kinds (awards.ts keeps
 * those). Only people credited with the contribution the award concerns.
 */
export function newRecipients(state: GameState, p: Project, cat: Asks, placed: (name?: string) => string | null): Credit[] | null {
  const cast = p.credits.filter((c) => c.contribution === 'Cast' || c.contribution === 'Performance Capture');
  const pick = (r: string): Credit[] | null => {
    switch (r) {
      case 'craft': return p.credits.filter((c) => cat.crafts?.includes(c.roleId));
      case 'guest': return cast.filter((c) => chars(p).find((x) => x.name === c.characterName)?.seriesInvolvement === 'guest');
      case 'performer': return cast.filter((c) => placed(c.characterName) === 'lead' || placed(c.characterName) === 'supporting');
      case 'host': return p.credits.filter((c) => c.roleId === 'contributor' && /\bhost/i.test(p.contributors.find((x) => `contributor:${x.id}` === c.person)?.role ?? ''));
      case 'song': return p.scenes.some((s) => s.songs.some((x) => !x.licensed)) ? p.credits.filter((c) => c.roleId === 'composer') : [];
      case 'national': return p.credits.filter((c) => c.contribution === 'Directed By');
      default: return null;
    }
  };
  const groups = [cat.recipient, ...(cat.with ?? [])];
  if (!groups.some((g) => ['craft', 'guest', 'performer', 'host', 'song', 'national'].includes(g)) && !cat.need?.includes('breakthrough')) return null;
  let out: Credit[] = [];
  for (const g of groups) {
    const got = pick(g);
    if (got === null) return null; // a mix with an older kind: awards.ts resolves it
    out.push(...got.filter((c) => !out.includes(c)));
  }
  if (cat.need?.includes('breakthrough')) out = out.filter((c) => breakthrough(state, p, c));
  if (cat.actingTitle && (cat.recipient === 'guest' || cat.recipient === 'performer')) out = out.filter((c) => c.person === 'player' && state.character.actingTitle === cat.actingTitle);
  return out;
}

/** The figure a craft or song is judged on: that craft's own quality where delivery recorded it, else the project's. */
export function craftScore(p: Project, crafts: string[] | undefined, song: boolean): number {
  const q = p.quality ?? {};
  if (song) return q.music ?? q.craft ?? 50;
  const own = (crafts ?? []).map((r) => q[`craft:${r}`]).filter((x): x is number => typeof x === 'number');
  if (own.length) return Math.max(...own);
  if (crafts?.includes('editor')) return q.editing ?? q.craft ?? 50;
  if (crafts?.includes('composer')) return q.music ?? q.craft ?? 50;
  return q.craft ?? 50;
}
