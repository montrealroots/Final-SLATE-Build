// Licences for existing songs (the v4 package, 03 "Existing-song lifecycle"; ledger V4-024, V4-026.01, V4-026.02).
// Built November 12, 2026. Until then a licensed song was cleared by the music supervisor's days and one flat fee for the
// whole project, whatever it was used for, and nobody could say no.
//
// A composition and a recording of it are separate works with separate owners (US Copyright Office, Circular 56A,
// copyright.gov/circs/circ56a.pdf), so using an existing recording in a film is asked of both: the composition's
// publisher and the recording's owner. Each answers in days, from the world seed: a quote, or no. A worldwide or broad
// request is refused more often, and a refused worldwide request may come back as a counteroffer for the production's
// own country. Both say yes, the player agrees the total, it is paid once from the project, and the grant runs for its
// years. What the grant covers is read when a release is planned: a medium or territory outside it, or a date after it
// ends, is refused with the reason. An agreement can be renewed. A refusal leaves the song in the script and offers the
// routes the package names: ask again for less, choose another track, commission an original, or take the cue out.
// Holders, quotes and odds are invented by the game (labelled so); nothing here is a real rights holder or a real price,
// and nothing agreed in the game is permission to use a real recording.
import { money, spend } from './budget';
import { stream } from './rng';
import { addLog, newId, registerHandler, schedule } from './state';
import { DAY, addLocal, dateKey } from './time';
import { getPlace } from '../data/places';
import { songUses, songsOf } from './songs';
import type { GameState, Project, ReleaseRecord, Song } from './types';

export type LicenceMedium = Exclude<ReleaseRecord['route'], 'festival-premiere'> | 'festival';
export const LICENCE_MEDIA: LicenceMedium[] = ['festival', 'theatrical', 'streaming', 'broadcast', 'digital'];
export const LICENCE_MEDIUM_LABELS: Record<LicenceMedium, string> = { festival: 'Festivals', theatrical: 'Cinemas', streaming: 'Streaming', broadcast: 'Television', digital: 'Digital Sale And Rental' };
export interface LicenceScope { territories: 'worldwide' | string[]; media: LicenceMedium[]; years: number }
export interface HolderAnswer { holder: string; answer?: 'yes' | 'no'; fee?: number }
export interface SongLicence {
  id: string;
  songId: string;
  scope: LicenceScope;
  composition: HolderAnswer;
  recording: HolderAnswer;
  status: 'requested' | 'quoted' | 'countered' | 'refused' | 'agreed' | 'expired' | 'declined';
  askedAt: number;
  answerAt: number;
  /** Why it was refused, in the holder's words. */
  reason?: string;
  agreedAt?: number;
  expires?: number;
  renewals?: { at: number; paid: number; to: number }[];
}
export interface MusicPlan {
  licences: SongLicence[];
  /** The brief taken, and the cue plan from it (cues.ts). Absent until the player takes a brief: the score covers the running time. */
  brief?: import('./cues').MusicBrief;
  cues?: import('./cues').Cue[];
  /** The composer's themes and your review of them (cues.ts). */
  themes?: import('./cues').ThemesState;
}

/** Game calibration: what a holder asks, and how often they say no. */
export const LICENCE_BASE_FEE = 1_500;
export const LICENCE_SCALE: Record<string, number> = { micro: 0.4, low: 1, mid: 2, commissioned: 3 };
export const LICENCE_ANSWER_DAYS = 6;
export const LICENCE_REFUSAL = { base: 0.12, worldwide: 0.12, perMediumOverTwo: 0.06 };
export const RENEWAL_SHARE = 0.5;
export const SCOPE_YEARS = [1, 3, 5, 10];

/** Whether this project licenses its songs (a project made from November 12, 2026) or clears them as before. */
export const licensesSongs = (p: Project): boolean => !!p.music;
export const licencesOf = (p: Project, songId?: string): SongLicence[] => (p.music?.licences ?? []).filter((l) => !songId || l.songId === songId);
/** The licence that stands for a song now: agreed and not run out. */
export const standingLicence = (p: Project, songId: string, now: number): SongLicence | undefined => licencesOf(p, songId).find((l) => l.status === 'agreed' && (l.expires ?? 0) > now);

const holderOf = (song: Song): { composition: string; recording: string } => ({
  composition: `The publisher of ${song.writers.map((w) => w.name).join(' and ') || 'its writers'}`,
  recording: song.license?.holder ?? 'Its recording\'s owner',
});

/** What one holder would ask for this song, this scope and this production. Game calibration, never a real price. */
export function holderFee(p: Project, song: Song, scope: LicenceScope): number {
  const territory = scope.territories === 'worldwide' ? 3 : Math.min(3, 1 + 0.25 * (scope.territories.length - 1));
  const media = 0.6 + 0.4 * scope.media.length;
  const years = 1 + 0.2 * (scope.years - 1);
  const prominent = song.uses.some((u) => u.placement === 'performed' || u.placement === 'opening-titles') ? 1.5 : 1;
  const minutes = Math.max(1, song.uses.reduce((a, u) => a + (u.minutes ?? 1), 0));
  return Math.round(LICENCE_BASE_FEE * (LICENCE_SCALE[p.funding.scenarioId] ?? 1) * territory * media * years * prominent * Math.min(3, 0.5 + 0.25 * minutes) / 10) * 10;
}

export function requestRefusal(p: Project, songId: string, scope: LicenceScope): string | null {
  if (!licensesSongs(p)) return 'This project clears its songs the way it always has.';
  const song = songsOf(p).find((x) => x.id === songId);
  if (!song) return 'That song is no longer part of the project.';
  if (song.library) return `"${song.title}" is library music, licensed on the library's terms.`;
  if (song.rights !== 'licensed') return `"${song.title}" isn't licensed: ${song.rights === 'production' ? 'the production holds its rights' : 'it is in the public domain'}.`;
  if (!scope.media.length) return 'Choose at least one way it will be shown.';
  if (scope.territories !== 'worldwide' && !scope.territories.length) return 'Choose where, or ask for the world.';
  if (!SCOPE_YEARS.includes(scope.years)) return 'Choose how many years.';
  if (licencesOf(p, songId).some((l) => l.status === 'requested' || l.status === 'quoted' || l.status === 'countered')) return 'A request for it is already open.';
  return null;
}

/** Ask both holders. Their answers come in LICENCE_ANSWER_DAYS. */
export function requestLicence(state: GameState, p: Project, songId: string, scope: LicenceScope): SongLicence {
  const no = requestRefusal(p, songId, scope);
  if (no) throw new Error(no);
  const song = songsOf(p).find((x) => x.id === songId)!;
  const h = holderOf(song);
  const l: SongLicence = { id: newId(state, 'lic'), songId, scope: { ...scope, territories: scope.territories === 'worldwide' ? 'worldwide' : [...scope.territories], media: LICENCE_MEDIA.filter((m) => scope.media.includes(m)) }, composition: { holder: h.composition }, recording: { holder: h.recording }, status: 'requested', askedAt: state.now, answerAt: state.now + LICENCE_ANSWER_DAYS * DAY };
  p.music!.licences.push(l);
  schedule(state, l.answerAt, 'licence-answer', { projectId: p.id, licenceId: l.id }, { attention: 'notify', priority: 45 });
  addLog(state, `You asked to license "${song.title}" for ${p.title}: its publisher and its recording's owner answer within ${LICENCE_ANSWER_DAYS} days.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'music' } });
  return l;
}

const refuseChance = (s: LicenceScope) => LICENCE_REFUSAL.base + (s.territories === 'worldwide' ? LICENCE_REFUSAL.worldwide : 0) + LICENCE_REFUSAL.perMediumOverTwo * Math.max(0, s.media.length - 2);

registerHandler('licence-answer', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const l = p ? licencesOf(p).find((x) => x.id === ev.payload.licenceId) : undefined;
  if (!p || !l || l.status !== 'requested') return { suppressInterrupt: true };
  const song = songsOf(p).find((x) => x.id === l.songId)!;
  const rng = stream(state.seed, 'licence', l.id);
  for (const side of ['composition', 'recording'] as const) {
    const yes = rng() >= refuseChance(l.scope);
    l[side] = { ...l[side], answer: yes ? 'yes' : 'no', ...(yes ? { fee: holderFee(p, song, l.scope) } : {}) };
  }
  const refused = (['composition', 'recording'] as const).filter((x) => l[x].answer === 'no');
  let text: string;
  if (!refused.length) {
    l.status = 'quoted';
    text = `Both holders of "${song.title}" will license it for ${p.title}: ${money(licenceTotal(l))} in all. Agree it on the Music page.`;
  } else if (l.scope.territories === 'worldwide' && rng() < 0.5) {
    // A worldwide request refused may come back narrower: the production's own country, the same media and years.
    const home = getPlace(p.axes.basePlaceId).country;
    l.scope = { ...l.scope, territories: [home] };
    for (const side of ['composition', 'recording'] as const) l[side] = { ...l[side], answer: 'yes', fee: holderFee(p, song, l.scope) };
    l.status = 'countered';
    text = `The holders of "${song.title}" won't license it worldwide, but offer ${home} only, for ${money(licenceTotal(l))}.`;
  } else {
    l.status = 'refused';
    l.reason = `${refused.map((x) => l[x].holder).join(' and ')} said no to ${scopeWords(l.scope)}.`;
    text = `"${song.title}" can't be licensed as asked: ${l.reason} Ask for less, choose another track, commission an original, or leave the cue silent.`;
  }
  addLog(state, `${p.title}: ${text}`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'music' } });
  return { message: text };
});

export const licenceTotal = (l: SongLicence): number => (l.composition.fee ?? 0) + (l.recording.fee ?? 0);
export const scopeWords = (s: LicenceScope): string => `${s.media.map((m) => LICENCE_MEDIUM_LABELS[m].toLowerCase()).join(', ')} in ${s.territories === 'worldwide' ? 'the whole world' : s.territories.join(', ')} for ${s.years} ${s.years === 1 ? 'year' : 'years'}`;

/** Agree a quote or a counteroffer: paid once from the project, and the grant runs from today. */
export function agreeLicence(state: GameState, p: Project, licenceId: string): void {
  const l = licencesOf(p).find((x) => x.id === licenceId);
  if (!l || (l.status !== 'quoted' && l.status !== 'countered')) throw new Error('That quote is no longer open.');
  const song = songsOf(p).find((x) => x.id === l.songId)!;
  spend(state, p, `Licence: "${song.title}" (${scopeWords(l.scope)})`, 'licensing', licenceTotal(l), `licence:${l.id}`);
  l.status = 'agreed';
  l.agreedAt = state.now;
  l.expires = addLocal(state.now, getPlace(p.axes.basePlaceId).zone, { years: l.scope.years });
  schedule(state, l.expires, 'licence-expiry', { projectId: p.id, licenceId: l.id }, { attention: 'notify', priority: 50 });
}

export function declineQuote(p: Project, licenceId: string): void {
  const l = licencesOf(p).find((x) => x.id === licenceId);
  if (!l || (l.status !== 'quoted' && l.status !== 'countered')) throw new Error('That quote is no longer open.');
  l.status = 'declined';
}

/** What renewing costs: a share of what was agreed, for the same scope again. */
export const renewalFee = (l: SongLicence): number => Math.round(licenceTotal(l) * RENEWAL_SHARE);

/** Renew an agreement for its years again, from when it runs out (or today, if it has). Paid once each time. */
export function renewLicence(state: GameState, p: Project, licenceId: string): void {
  const l = licencesOf(p).find((x) => x.id === licenceId);
  if (!l || (l.status !== 'agreed' && l.status !== 'expired')) throw new Error('Only an agreed licence can be renewed.');
  const song = songsOf(p).find((x) => x.id === l.songId)!;
  const n = (l.renewals ?? []).length + 1;
  spend(state, p, `Licence Renewed: "${song.title}"`, 'licensing', renewalFee(l), `licence-renewal:${l.id}:${n}`);
  const from = Math.max(state.now, l.expires ?? state.now);
  const to = addLocal(from, getPlace(p.axes.basePlaceId).zone, { years: l.scope.years });
  (l.renewals ??= []).push({ at: state.now, paid: renewalFee(l), to });
  l.expires = to;
  l.status = 'agreed';
  schedule(state, to, 'licence-expiry', { projectId: p.id, licenceId: l.id }, { attention: 'notify', priority: 50 });
}

registerHandler('licence-expiry', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const l = p ? licencesOf(p).find((x) => x.id === ev.payload.licenceId) : undefined;
  if (!p || !l || l.status !== 'agreed' || (l.expires ?? 0) > state.now) return { suppressInterrupt: true }; // renewed since
  l.status = 'expired';
  const song = songsOf(p).find((x) => x.id === l.songId);
  const text = `The licence for "${song?.title}" in ${p.title} has run out. Releases already out are not affected; a new one needs it renewed.`;
  addLog(state, text, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'music' } });
  return { message: text };
});

/** Licensed songs in the main cut without a licence standing now: delivery waits for them. */
export function unlicensed(p: Project, used: Song[], now: number): Song[] {
  if (!licensesSongs(p)) return [];
  return used.filter((s) => s.rights === 'licensed' && !standingLicence(p, s.id, now));
}

/** Why a release can't use these songs: a medium, a territory or a date the grant doesn't cover. Null when it can. */
export function releaseLicenceRefusal(p: Project, used: Song[], rel: { route: ReleaseRecord['route']; territories: string[]; date: string }, now: number): string | null {
  if (!licensesSongs(p)) return null;
  const medium: LicenceMedium = rel.route === 'festival-premiere' ? 'festival' : rel.route;
  const zone = getPlace(p.axes.basePlaceId).zone;
  for (const s of used.filter((x) => x.rights === 'licensed')) {
    const l = standingLicence(p, s.id, now);
    if (!l) return `"${s.title}" has no licence standing. Renew it, or replace it, on the Music page.`;
    if (!l.scope.media.includes(medium)) return `"${s.title}" is licensed for ${l.scope.media.map((m) => LICENCE_MEDIUM_LABELS[m].toLowerCase()).join(', ')}, not ${LICENCE_MEDIUM_LABELS[medium].toLowerCase()}. Ask for that on the Music page, or replace the song on the Production page.`;
    const outside = l.scope.territories === 'worldwide' ? [] : rel.territories.filter((t) => !(l.scope.territories as string[]).includes(t));
    if (outside.length) return `"${s.title}" is licensed for ${(l.scope.territories as string[]).join(', ')}, not ${outside.join(', ')}. Ask for more on the Music page, or replace the song on the Production page.`;
    if (rel.date > dateKey(l.expires!, zone)) return `"${s.title}"'s licence runs out on ${dateKey(l.expires!, zone)}, before this release. Renew it on the Music page.`;
  }
  return null;
}

// ---------------- Library music (the v4 package, 03: a refused request's routes include "authorized library music") ----------------
// Built November 13, 2026. A production music library owns both a track's composition and its recording and licenses
// them together on its own terms, without being asked: here every medium, worldwide, for LIBRARY_YEARS, at a fee per
// scene it plays in. Replacing a song with a library track moves the song's uses in the cut (and its cues) to the track;
// what was paid for the song stays paid. It is a sound change, so a locked picture allows it, but a scene performed on
// screen can't take another song. Where an episode's final mix is already done, the track has to be laid into it:
// half a day of the re-recording mixer's (post:relay), which delivery waits for. The library, its terms and its fee are
// invented by the game and labelled so.
export const LIBRARY_HOLDER = 'A Production Music Library';
export const LIBRARY_FEE_PER_USE = 250;
export const LIBRARY_YEARS = 10;
export const RELAY_DAYS = 0.5;

export function libraryRefusal(p: Project, songId: string): string | null {
  if (!licensesSongs(p)) return 'This project clears its songs the way it always has.';
  if (p.delivered) return 'This project is delivered; its songs are final.';
  const song = songsOf(p).find((x) => x.id === songId);
  if (!song) return 'That song is no longer part of the project.';
  if (song.library) return `"${song.title}" is already library music.`;
  if (!song.uses.length) return `"${song.title}" isn't in any scene.`;
  const shot = song.uses.find((u) => u.placement === 'performed' && (p.captures.find((c) => c.sceneId === u.sceneId)?.captured ?? 0) > 0);
  if (shot) return `"${song.title}" is performed on screen in footage already shot: a library track can't take its place there.`;
  return null;
}

export const libraryFee = (p: Project, song: Song): number => Math.round(LIBRARY_FEE_PER_USE * (LICENCE_SCALE[p.funding.scenarioId] ?? 1) * Math.max(1, song.uses.length) / 10) * 10;

/** Put a library track where the song plays, licensed and paid once now, and lay it into any mix already finished. */
export function replaceWithLibrary(state: GameState, p: Project, songId: string): Song {
  const no = libraryRefusal(p, songId);
  if (no) throw new Error(no);
  const old = songsOf(p).find((x) => x.id === songId)!;
  const scenes = new Map([...p.scenes, ...p.drafts.flatMap((d) => d.scenes)].map((s) => [s.id, s.episode]));
  const remix = [...new Set(old.uses.map((u) => scenes.get(u.sceneId) ?? 1))].filter((e) => p.tasks.some((x) => x.id === `post:mix:${e}` && x.status === 'done')).sort((a, b) => a - b);
  let title = `Library Track For "${old.title}"`;
  for (let n = 2; songsOf(p).some((x) => x.title === title); n++) title = `Library Track ${n} For "${old.title}"`;
  const track: Song = { id: newId(state, 'song'), title, origin: 'existing', rights: 'licensed', writers: [], performers: [], uses: old.uses.map((u) => ({ ...u })), license: { holder: LIBRARY_HOLDER }, library: true, replaces: { songId: old.id, remix }, createdAt: state.now };
  const fee = libraryFee(p, track);
  old.uses = [];
  for (const v of p.versions ?? []) for (const c of v.songChanges ?? []) if (c.songId === old.id) c.songId = track.id;
  for (const c of p.music!.cues ?? []) if (c.songId === old.id) c.songId = track.id;
  p.songs!.push(track);
  const half = Math.round(fee / 2);
  const l: SongLicence = { id: newId(state, 'lic'), songId: track.id, scope: { territories: 'worldwide', media: [...LICENCE_MEDIA], years: LIBRARY_YEARS }, composition: { holder: LIBRARY_HOLDER, answer: 'yes', fee: half }, recording: { holder: LIBRARY_HOLDER, answer: 'yes', fee: fee - half }, status: 'quoted', askedAt: state.now, answerAt: state.now };
  p.music!.licences.push(l);
  agreeLicence(state, p, l.id);
  addLog(state, `${p.title}: a library track replaces "${old.title}", licensed for ${scopeWords(l.scope)} for ${money(fee)}.${remix.length ? ` It has to be laid into the finished mix of ${remix.length === 1 ? 'its episode' : `${remix.length} episodes`}.` : ''}`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'music' } });
  return track;
}

/** The songs a release plays: the main cut's, or the chosen version's (its scenes, and the songs it changes). */
export function releaseSongs(p: Project, scenes: import('./types').Scene[], cut?: string): Song[] {
  const v = cut ? p.versions?.find((x) => x.id === cut) : undefined;
  if (cut && !v) throw new Error('That version no longer exists.');
  return [...new Set(songUses(p, v ? scenes.filter((s) => !v.leaveOut.includes(s.id)) : scenes, v).map((x) => x.song))];
}
