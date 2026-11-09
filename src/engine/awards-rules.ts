// What the expanded festival and award catalog asks of a project and who receives each award (docs/awards/DESIGN.md,
// November 9, 2026). Every requirement reads something the project records or the player declares; none reads prose.
import { songsOf, songUses, writtenForProject } from './songs';
import { cutScenes } from './screen-time';
import { findPlace, getPlace } from '../data/places';
import { personById } from './people';
import { competesAs } from './script-effects';
import { approvedScenes, isEpisodic } from './projects';
import type { CategoryRules } from './rulebooks';
import type { Credit, GameState, Project, Song } from './types';

export { QUALIFYING_LISTS, projectedList, qualifyingList } from './qualifying-lists';
export { RULEBOOK_DATA } from './rulebook-data';

/** What `Category` fields this module reads (kept structural so awards.ts and this module don't import each other). */
interface Asks { recipient: string; formats: string[]; class?: 'comedy' | 'drama'; family?: string[]; episodes?: [number, number]; material?: 'original' | 'adapted'; need?: string[]; crafts?: string[]; with?: string[]; actingTitle?: 'Actor' | 'Actress' }

export const EUROPE = ['AL', 'AD', 'AM', 'AT', 'BA', 'BE', 'BG', 'BY', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GE', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'XK', 'LI', 'LT', 'LU', 'LV', 'MC', 'MD', 'ME', 'MK', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'SE', 'SI', 'SK', 'SM', 'TR', 'UA', 'VA'];
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
      // A partner signed through Financing, or the co-production money of a save from before financing existed. Until November 9,
      // 2026 only the second counted, so no partner a player signed could qualify.
      case 'coproduction': if (!p.funding.extra.length && !p.finance?.deals.some((d) => d.kind === 'co-producer' && d.status === 'accepted')) fail('This award is for international co-productions; the project has no co-production partner.'); break;
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
      case 'sports': if (!p.axes.genres.some((g) => g.id === 'sports')) fail('This award is for documentaries about sport; give the project the Sports genre if it is one.'); break;
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
export function newRecipients(state: GameState, p: Project, cat: Asks, placed: (name?: string) => string | null, ctx: { versionId?: string; songId?: string; song?: SongRule } = {}): Credit[] | null {
  const cast = p.credits.filter((c) => c.contribution === 'Cast' || c.contribution === 'Performance Capture');
  const pick = (r: string): Credit[] | null => {
    switch (r) {
      case 'craft': return p.credits.filter((c) => cat.crafts?.includes(c.roleId));
      case 'guest': return cast.filter((c) => chars(p).find((x) => x.name === c.characterName)?.seriesInvolvement === 'guest');
      case 'performer': return cast.filter((c) => placed(c.characterName) === 'lead' || placed(c.characterName) === 'supporting');
      // Emmy Category 76: a traditional narration, read as a narrator, not a character; the part's declared function says which.
      // Both the part and the narration sequence come from the approved script, the one delivered.
      case 'narrator': return (p.drafts.find((d) => d.number === p.approvedDraft)?.scenes ?? []).some((s) => s.kind === 'narration') ? p.credits.filter((c) => (c.contribution === 'Cast' || c.contribution === 'Voice Cast') && chars(p).find((x) => x.name === c.characterName)?.functions.includes('narrator')) : [];
      case 'host': return p.credits.filter((c) => c.roleId === 'contributor' && /\bhost/i.test(p.contributors.find((x) => `contributor:${x.id}` === c.person)?.role ?? ''));
      // One song, written for the work, with its writers: until November 9, 2026, the score composer of any project with a
      // song not marked licensed. Now the song entered (or the first that qualifies) and only its writing credits.
      case 'song': {
        const song = originalSongs(p, ctx.versionId, ctx.song).find((x) => !ctx.songId || x.id === ctx.songId);
        return song ? songRecipients(p, song, ctx.song) : [];
      }
      case 'national': return p.credits.filter((c) => c.contribution === 'Directed By');
      default: return null;
    }
  };
  const groups = [cat.recipient, ...(cat.with ?? [])];
  if (!groups.some((g) => ['craft', 'guest', 'performer', 'host', 'narrator', 'song', 'national'].includes(g)) && !cat.need?.includes('breakthrough')) return null;
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

/** An earlier film of these formats you directed and released anywhere outside a festival, before this one: the first found. */
export function earlierReleased(state: GameState, p: Project, formats: string[]): Project | undefined {
  return state.projects.find((x) => x.id !== p.id && formats.includes(x.axes.format) && x.delivered && (x.delivered.at ?? 0) <= (p.delivered?.at ?? Infinity)
    && x.credits.some((c) => c.person === 'player' && c.contribution === 'Directed By')
    && x.releases.some((r) => r.status === 'released' && r.route !== 'festival-premiere'));
}

/** Where a credited person works from: hired people's home country; yours, the country you live in. */
export function workBase(state: GameState, c: Credit): string | undefined {
  return c.person === 'player' ? findPlace(state.character.livesIn)?.country : personById(state, c.person).homeCountry;
}

type SongRule = NonNullable<CategoryRules['song']>['value'];

/** The songs heard in the cut entered that were written for the work, with words, and meet the organizer's song rules. */
export function originalSongs(p: Project, versionId?: string, rule?: SongRule): Song[] {
  const v = versionId ? p.versions?.find((x) => x.id === versionId) : undefined;
  return [...new Set(songUses(p, cutScenes(p, versionId), v).map((x) => x.song))].filter((x) => writtenForProject(p, x) && x.writers.some((w) => w.lyrics) && !songRuleProblem(p, x, versionId, rule));
}

/**
 * A song's own organizer rules, in the cut entered (rulebooks.ts `song`): where it plays over the end credits, how long it
 * is heard, a series' title theme. Null when it meets them.
 */
function songRuleProblem(p: Project, song: Song, versionId: string | undefined, rule?: SongRule): string | null {
  if (!rule) return null;
  const v = versionId ? p.versions?.find((x) => x.id === versionId) : undefined;
  const cut = cutScenes(p, versionId);
  const all = songUses(p, cut, v);
  const mine = all.filter((x) => x.song === song);
  const body = mine.filter((x) => x.use.placement !== 'end-credits' && !(rule.noTitleTheme && x.use.placement === 'opening-titles' && isEpisodic(p.axes.format)));
  if (rule.noTitleTheme && !body.length && mine.some((x) => x.use.placement === 'opening-titles') && isEpisodic(p.axes.format)) return `"${song.title}" plays only as the main title theme, which this award doesn't take.`;
  if (rule.endCredits && !body.length && mine.length) {
    if (rule.endCredits === 'never') return `"${song.title}" plays only over the end credits, which this award doesn't take.`;
    // The first new cue once the end credits begin, in each episode of the cut entered: the lowest cue there.
    const episodeOf = (id: string) => cut.find((sc) => sc.id === id)?.episode ?? 1;
    const first = mine.some(({ use }) => {
      const credits = all.filter((x) => x.use.placement === 'end-credits' && episodeOf(x.use.sceneId) === episodeOf(use.sceneId));
      return Math.min(...credits.map((x) => x.use.cue ?? 1)) === (use.cue ?? 1);
    });
    if (!first) return `"${song.title}" plays only over the end credits, and isn't their first song; this award takes a song in the body of the film or the first new song once the end credits begin.`;
  }
  if (rule.minSeconds || rule.minTotalSeconds) {
    const known = mine.filter((x) => x.use.minutes !== null).map((x) => (x.use.minutes ?? 0) * 60);
    const longest = Math.max(0, ...known);
    const total = known.reduce((a, x) => a + x, 0);
    const met = (rule.minSeconds !== undefined && longest + 1e-9 >= rule.minSeconds) || (rule.minTotalSeconds !== undefined && total + 1e-9 >= rule.minTotalSeconds);
    const need = [rule.minSeconds ? `${rule.minSeconds} seconds at once` : '', rule.minTotalSeconds ? `${rule.minTotalSeconds} seconds in all` : ''].filter(Boolean).join(' or ');
    if (!met) {
      return known.length < mine.length
        ? `How long "${song.title}" plays isn't recorded in every scene; this award needs it heard for ${need}. Record its minutes under Songs.`
        : `"${song.title}" plays for ${Math.round(longest)} seconds at most at once, ${Math.round(total)} in all; this award needs ${need}.`;
    }
  }
  return null;
}

/**
 * Why a work's songs don't make a soundtrack under the organizer's rule, or null (AACTA 10.2(b): at least five songs, each
 * heard clearly for five seconds). The rule leaves out the composer's score; a SLATE score is never a song, so every song
 * heard counts, licensed or written for the work. A use whose minutes aren't recorded counts for nothing until they are.
 */
export function soundtrackProblem(p: Project, versionId: string | undefined, rule: { minSongs: number; minSeconds: number }): string | null {
  const v = versionId ? p.versions?.find((x) => x.id === versionId) : undefined;
  const uses = songUses(p, cutScenes(p, versionId), v);
  const songs = [...new Set(uses.map((x) => x.song))];
  const short = songs.filter((s) => uses.filter((x) => x.song === s).reduce((a, x) => a + (x.use.minutes ?? 0) * 60, 0) + 1e-9 < rule.minSeconds);
  const counted = songs.length - short.length;
  if (counted >= rule.minSongs) return null;
  const unknown = short.filter((s) => uses.some((x) => x.song === s && x.use.minutes === null)).length;
  const text = `${counted} song${counted === 1 ? ' is' : 's are'} heard for ${rule.minSeconds} seconds or more; this award's soundtrack needs ${rule.minSongs}.`;
  return unknown ? `${text} How long ${unknown} more ${unknown === 1 ? 'plays' : 'play'} isn't recorded: record ${unknown === 1 ? 'its' : 'their'} minutes under Songs.` : text;
}

/**
 * Who receives a song award: the song's writing credits, never its performers or producer. Where the organizer names
 * only the principal, essentially equal writers (Oscars II.E, II.J), a writer who wrote less than half as many days as the
 * main writer is a partial contributor (SLATE's measure of "essentially equal": the Committee's judgement isn't
 * published); the rest receive it up to `maxWriters`, in credit order. Writers with no recorded days count as equal.
 */
export function songRecipients(p: Project, song: Song, rule?: SongRule): Credit[] {
  let writers = p.credits.filter((c) => c.songId === song.id && (c.roleId === 'songwriter' || c.roleId === 'lyricist'));
  const days = (c: Credit) => song.writers.find((w) => w.who === c.person)?.days;
  if (rule?.minShare) {
    const total = writers.reduce((a, c) => a + (days(c) ?? 0), 0);
    writers = writers.filter((c) => days(c) === undefined || !total || (days(c) ?? 0) / total + 1e-9 >= rule.minShare!);
  }
  if (rule?.essentiallyEqual) {
    const most = Math.max(0, ...writers.map((c) => days(c) ?? 0));
    writers = writers.filter((c) => days(c) === undefined || !most || (days(c) ?? 0) * 2 >= most);
  }
  return rule?.maxWriters ? writers.slice(0, rule.maxWriters) : writers;
}

/** Why no song can be entered, or why the one chosen can't, in the player's words. */
export function songProblems(p: Project, songId?: string, versionId?: string, rule?: SongRule): string[] {
  const v = versionId ? p.versions?.find((x) => x.id === versionId) : undefined;
  const heard = [...new Set(songUses(p, cutScenes(p, versionId), v).map((x) => x.song))];
  const chosen = songId ? songsOf(p).find((x) => x.id === songId) : undefined;
  if (songId && !chosen) return ['That song is no longer part of the project.'];
  if (chosen && !heard.includes(chosen)) return [`"${chosen.title}" isn't heard in the ${v ? v.label : 'cut'} entered.`];
  if (!heard.length) return [`No song is heard in the ${v ? v.label : 'cut'} entered.`];
  return (chosen ? [chosen] : heard).map((x) => {
    if (x.rights === 'licensed') return `"${x.title}" is licensed; an original song award takes a song written for the work.`;
    if (x.origin === 'existing') return `"${x.title}" existed before the project; an original song award takes a song written for the work.`;
    if (x.origin === 'unrecorded') return `"${x.title}" came from a save made before songs had writers, and nothing shows it was written for this project.`;
    if (!writtenForProject(p, x)) return `"${x.title}" isn't finished: its writing isn't done.`;
    if (!x.writers.some((w) => w.lyrics)) return `"${x.title}" has no lyrics; an original song award takes words and music.`;
    return songRuleProblem(p, x, versionId, rule) ?? '';
  }).filter(Boolean);
}

/** The figure a craft or song is judged on: that craft's own quality where delivery recorded it, else the project's. */
export function craftScore(p: Project, crafts: string[] | undefined, song: boolean, songId?: string): number {
  const q = p.quality ?? {};
  // A song is judged on its own writing where delivery recorded it (finish.ts), else on the music as before.
  if (song) return (songId ? q[`song:${songId}`] : undefined) ?? q.music ?? q.craft ?? 50;
  const own = (crafts ?? []).map((r) => q[`craft:${r}`]).filter((x): x is number => typeof x === 'number');
  if (own.length) return Math.max(...own);
  if (crafts?.includes('editor')) return q.editing ?? q.craft ?? 50;
  if (crafts?.includes('composer')) return q.music ?? q.craft ?? 50;
  return q.craft ?? 50;
}

// Recipient and work-specific rules (docs/awards/RECIPIENT-RULES.md). They load with the catalog, not at startup.

/** The share of the approved script's dialogue, in words, in a language other than English; null with no written dialogue. */
export function nonEnglishShare(p: Project): number | null {
  let all = 0;
  let other = 0;
  for (const s of approvedScenes(p)) for (const l of s.dialogue) {
    const words = l.text.split(/\s+/).filter(Boolean).length;
    all += words;
    if ((l.language || p.axes.dialogueLanguages[0]) !== 'en') other += words;
  }
  return all ? other / all : null;
}

/** Whether a credit is for a part whose story function is Narrator. */
export function isNarrator(p: Project, c: Credit): boolean {
  return !!p.drafts.find((d) => d.number === p.approvedDraft)?.characters.find((x) => x.name === c.characterName)?.functions.includes('narrator');
}

/** The share of a program's episodes a credit covers. */
export function episodeShare(p: Project, c: Credit): number {
  return c.episodes === 'all' ? 1 : c.episodes.length / Math.max(1, p.axes.episodeCount);
}

/**
 * Whether this performer was nominated (or won) at the organizer, in a category whose id starts with one of `prefixes`, for
 * playing the same part in an earlier season of the same series (the seasons `continues` links).
 */
export function nominatedEarlier(state: GameState, p: Project, c: Credit, institutionId: string, prefixes: string[]): boolean {
  for (let q = state.projects.find((x) => x.id === p.continues?.from); q; q = state.projects.find((x) => x.id === q!.continues?.from)) {
    const season = q;
    for (const e of state.editions) {
      if (e.institutionId !== institutionId) continue;
      for (const x of e.entries) {
        if (x.projectId !== season.id || !['nominated', 'won', 'lost'].includes(x.status) || !prefixes.some((pre) => x.categoryId.startsWith(pre))) continue;
        if (x.recipients.some((id) => { const k = season.credits.find((y) => y.id === id); return k?.person === c.person && k.characterName === c.characterName; })) return true;
      }
    }
  }
  return false;
}

// The share of the running time a part is on screen came from the approved script here until November 9, 2026 (every
// listed scene counted whole, an episode ran its target length). It now comes from the cut: screen-time.ts.
export { shareCheck } from './screen-time';

/**
 * Theatrical gross the distributors have reported for releases dated in the window: worldwide, and from releases only in
 * `country`. A release that covers that country and others counts toward the worldwide total only, since its report
 * isn't split by country.
 */
export function boxOffice(p: Project, country: string, window?: { from: string; to: string }): { worldwide: number; domestic: number } {
  const theatrical = p.releases.filter((r) => r.route === 'theatrical' && r.status === 'released' && (!window || (r.date >= window.from && r.date <= window.to)));
  // A release's earnings are what the distributor of its accepted offer has reported (distribution.ts).
  const gross = (rs: typeof theatrical) => rs.reduce((a, r) => a + (p.offers.find((o) => o.id === r.offerId)?.reported?.gross ?? 0), 0);
  return { worldwide: gross(theatrical), domestic: gross(theatrical.filter((r) => r.territories.length === 1 && r.territories[0] === country)) };
}
