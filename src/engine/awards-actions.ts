// Entering and withdrawing festival and awards entries, answering screening invitations, and the honours list: what
// the player does from the Festivals And Awards and Profile pages (awards.ts holds the institutions, their editions and
// the handlers that run them). Loaded with those pages, not at startup (the startup JavaScript budget).
import { getPlace } from '../data/places';
import { categoriesFor, categoryRules, checkEligibility, edition, entryEpisodes, entryNeeds, institution, screeningTravel, type Honor } from './awards';
import { ledgerTotals, money, spend } from './budget';
import { approvedScenes as approvedScenesOf, isEpisodic } from './projects';
import { addLog } from './state';
import { dateKey } from './time';
import type { Edition, EditionEntry, EntrySnapshot, GameState, Project, Screening } from './types';
import { assessedWords, playerScore } from './awards-results';
import { shareCheck } from './screen-time';
import { versionRuntime } from './versions';
import { airings } from './episode-releases';

export function submitEntry(state: GameState, p: Project, editionId: string, categoryId: string, recipientIds?: string[], versionId?: string, episode?: number, songId?: string): EditionEntry {
  const ed = edition(state, editionId);
  const inst = institution(ed.institutionId);
  const cat = inst.categories.find((c) => c.id === categoryId);
  if (!cat) throw new Error('That category doesn\'t exist.');
  if (!categoriesFor(inst, ed.year).includes(cat)) throw new Error(`The ${ed.label} doesn't hold that category.`);
  const rules = categoryRules(ed, cat.id, p);
  const live = ed.entries.filter((e) => e.projectId === p.id && e.categoryId === categoryId && e.status !== 'withdrawn');
  // One entry per work in a category; a song award takes each song as its own entry, up to the organizer's limit
  // (the Oscars' three, Rule Nineteen III.C; the Canadian Screen Awards' two). Until November 9, 2026, one song per work.
  if (cat.recipient !== 'song' && live.length) throw new Error('This project is already entered in that category.');
  // Entered for one episode (the Emmys' directing and writing): the one chosen, or the first anyone credited worked on.
  // A performer category that measures screen time per episode is entered for one too: the one chosen, or their best.
  const perEpisode = rules?.screenShare?.value.per === 'episode';
  let ep = (rules?.oneEpisode || perEpisode) && isEpisodic(p.axes.format) ? episode ?? (rules?.oneEpisode ? entryEpisodes(state, p, cat, rules)[0] : undefined) : undefined;
  const el = checkEligibility(state, p, ed, cat, recipientIds, versionId, ep, songId);
  if (!el.eligible) throw new Error(el.reasons[0]);
  if (perEpisode && ep === undefined && isEpisodic(p.axes.format) && el.recipients[0]) ep = shareCheck(p, el.recipients[0], rules!.screenShare!.value.atLeast, 'episode', { versionId }).episode;
  // The song entered: the one chosen, or the one whose writers were credited.
  const song = cat.recipient === 'song' ? songId ?? p.credits.find((c) => c.id === el.recipients[0]?.id)?.songId : undefined;
  if (cat.recipient === 'song') {
    const limit = rules?.song?.value;
    if (live.some((e) => e.songId === song)) throw new Error('This song is already entered in that category.');
    if (limit?.maxSongs && live.length >= limit.maxSongs) throw new Error(`${inst.short} takes at most ${limit.maxSongs} songs from one work in this category.`);
    const team = (id?: string) => (p.songs?.find((x) => x.id === id)?.writers ?? []).map((w) => w.who ?? w.name).sort().join('|');
    if (limit?.oneEntryPerTeam && live.some((e) => team(e.songId) === team(song))) throw new Error(`The same writers can enter only one song from a work at the ${inst.short}.`);
  }
  // Entry forms ask for a logline and a synopsis (the Pitch). SLATE checks they are written, never what they say.
  const pitch = entryNeeds(p);
  if (pitch) throw new Error(pitch);
  // One fee per project, category and edition: entering again after withdrawing doesn't charge it twice.
  const feeKey = `fee:${editionId}:${categoryId}`;
  const alreadyPaid = p.obligations.some((o) => o.postings.some((x) => x.key === feeKey));
  if (cat.fee && !alreadyPaid) {
    if (ledgerTotals(p).available < cat.fee) throw new Error(`The entry fee is ${money(cat.fee)}, and this project has ${money(ledgerTotals(p).available)} uncommitted.`);
    spend(state, p, `${inst.short} Entry Fee`, 'festival', cat.fee, feeKey);
  }
  const base = `${editionId}:${categoryId}:${song ? `${p.id}~${song}` : p.id}`;
  const tries = ed.entries.filter((e) => e.id === base || e.id.startsWith(`${base}#`)).length;
  // Entering again after withdrawing is a new entry that says which one it revises; the withdrawn one stays as it was.
  const previous = [...ed.entries].reverse().find((e) => e.id === base || e.id.startsWith(`${base}#`));
  const entry: EditionEntry = {
    id: tries ? `${base}#${tries + 1}` : base, projectId: p.id, categoryId, submittedAt: state.now, status: 'submitted', recipients: el.recipients.map((r) => r.id), fee: cat.fee && !alreadyPaid ? cat.fee : 0,
    reason: el.provisional ? el.provisionalNote ?? 'Entered provisionally. The planned release must happen within the eligibility period.' : undefined,
    ...(versionId ? { versionId } : {}),
    ...(ep ? { episode: ep } : {}),
    ...(song ? { songId: song } : {}),
    ...(previous ? { revises: previous.id } : {}),
  };
  entry.snapshot = entrySnapshot(p, cat, entry, rules);
  ed.entries.push(entry);
  if (!state.followed.includes(inst.id)) state.followed.push(inst.id);
  addLog(state, `You entered ${p.title} for ${cat.name} at the ${ed.label}.`, inst.kind === 'festival' ? 'festival' : 'award', { projectId: p.id, route: { view: 'event', editionId } });
  return entry;
}

/**
 * What the entry is judged on, kept from now: the cut's runtime, the score, who receives it, the screen-time calculation
 * shown, the song and its writers. Later edits and records don't change it.
 */
export function entrySnapshot(p: Project, cat: Parameters<typeof playerScore>[1], e: EditionEntry, rules?: ReturnType<typeof categoryRules>): EntrySnapshot {
  const v = e.versionId ? p.versions?.find((x) => x.id === e.versionId) : undefined;
  const credits = e.recipients.map((id) => p.credits.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => !!c);
  const screen = rules?.screenShare?.value;
  const song = e.songId ? p.songs?.find((x) => x.id === e.songId) : undefined;
  return {
    runtimeMin: v ? versionRuntime(p, v) : p.delivered?.runtimeMin ?? 0,
    score: playerScore(p, cat, e.recipients, cat.judging, e),
    assessed: assessedWords(p, cat, e),
    recipients: credits.map((c) => ({ id: c.id, name: c.personName, contribution: c.contribution, ...(c.characterName ? { characterName: c.characterName } : {}) })),
    ...(screen ? { screen: credits.map((c) => ({ creditId: c.id, text: shareCheck(p, c, screen.atLeast, screen.per, { episode: e.episode, versionId: e.versionId }).text })) } : {}),
    ...(song ? { song: { id: song.id, title: song.title, writers: credits.map((c) => c.personName) } } : {}),
    // A series: each episode's date as it stood, planned or out, so a later change to the schedule shows against it.
    ...(isEpisodic(p.axes.format) && p.releases.some((r) => r.episodes) ? { airing: airings(p).map((a) => ({ number: a.number, date: a.date, status: a.planned ? 'planned' as const : 'released' as const, ...(a.assumed ? { assumed: true as const } : {}) })) } : {}),
  };
}

export function withdrawEntry(state: GameState, editionId: string, entryId: string): void {
  const ed = edition(state, editionId);
  const e = ed.entries.find((x) => x.id === entryId);
  if (!e || !['submitted', 'accepted', 'needs-correction'].includes(e.status)) throw new Error('That entry can no longer be withdrawn.');
  e.status = 'withdrawn';
  e.reason = 'You withdrew this entry. Entry fees are not refunded.';
}

/** Your own work that overlaps a screening day: shoot days you direct or act on. */
export function screeningConflicts(state: GameState, ed: Edition, sc: Screening): string[] {
  const out: string[] = [];
  for (const p of state.projects) {
    if (p.delivered) continue;
    const zone = getPlace(p.axes.basePlaceId).zone;
    const day = dateKey(sc.at, zone);
    for (const d of p.schedule.days.filter((x) => x.date === day && x.status === 'scheduled')) {
      const eps = [...new Set(approvedScenesOf(p).filter((s) => d.sceneIds.includes(s.id)).map((s) => s.episode))];
      const what = isEpisodic(p.axes.format) && eps.length ? `Episode ${eps.join(' and ')}` : p.title;
      out.push(`You're scheduled to direct ${what} during this screening.`);
    }
  }
  void ed;
  return out;
}

/** Answer a screening invitation. Accepting checks that you can get there in time; declining keeps the selection. */
export function rsvpScreening(state: GameState, editionId: string, projectId: string, at: number, accept: boolean): void {
  const ed = edition(state, editionId);
  const sc = ed.screenings?.find((x) => x.projectId === projectId && x.at === at);
  if (!sc || sc.done) throw new Error('That screening has already happened.');
  if (sc.rsvpBy !== undefined && state.now > sc.rsvpBy && sc.rsvp === 'pending') {
    sc.rsvp = 'expired';
    throw new Error('The reply deadline has passed.');
  }
  if (!accept) {
    sc.rsvp = 'declined';
    addLog(state, `You declined the invitation to attend the screening at the ${ed.label}. It still screens.`, 'festival', { route: { view: 'event', editionId: ed.id } });
    return;
  }
  const t = screeningTravel(state, ed, sc);
  if (!t.arrivesInTime) throw new Error(`You couldn't arrive in time: the trip takes about ${Math.round(t.hours)} hours.`);
  sc.rsvp = 'accepted';
}

export function honors(state: GameState): Honor[] {
  const out: Honor[] = [];
  for (const ed of state.editions) {
    const inst = institution(ed.institutionId);
    for (const e of ed.entries) {
      if (!['selected', 'nominated', 'won', 'lost', 'mention'].includes(e.status)) continue;
      const p = state.projects.find((x) => x.id === e.projectId);
      const cat = inst.categories.find((c) => c.id === e.categoryId);
      if (!p || !cat) continue;
      const personal = e.recipients.some((rid) => p.credits.find((c) => c.id === rid)?.person === 'player');
      // A prize you were considered for and didn't win isn't an honour; the section's selection already is.
      if (e.via === 'selection' && e.status === 'lost') continue;
      const result = e.status === 'won' ? 'Won' : e.status === 'mention' ? 'Special Mention' : inst.kind === 'festival' || cat.kind === 'section' ? 'Selected' : 'Nominated';
      out.push({ editionLabel: ed.label, category: cat.name, projectTitle: p.title, result, personal, at: ed.end });
    }
    for (const [id, r] of Object.entries(ed.results)) {
      const cat = inst.categories.find((c) => c.id === id);
      if (r.honoree === 'player' && cat) out.push({ editionLabel: ed.label, category: cat.name, projectTitle: '', result: 'Honorary', personal: true, at: ed.start });
    }
  }
  return out.sort((a, b) => b.at - a.at);
}

export function isTv(p: Project): boolean {
  return isEpisodic(p.axes.format) || p.axes.format === 'tv-film';
}
