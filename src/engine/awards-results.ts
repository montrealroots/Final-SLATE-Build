// How the expanded catalog's prizes, honorary awards and national selections are decided, and what an edition shows for
// a category you weren't in (docs/awards/DESIGN.md rules 4 to 7). Loaded with the catalog, not at startup (awards.ts
// loadInstitutions): the handlers that call it run only in a game, which waits for the catalog before opening.
import { getPlace } from '../data/places';
import {
  RIVAL_WORDS_A, RIVAL_WORDS_B, categoriesFor, categoryDeadline, categoryRecipients, checkEligibility, countryWords, edition, enterable, institution,
  involved, rivalTitle, seasonSlate, compactEdition, type Category, type Judging,
} from './awards';
import { craftScore, requirementProblems } from './awards-rules';
import { isEpisodic } from './projects';
import { gaussian, intBetween, pick, stream, unit } from './rng';
import { COMEDY_MUSICAL } from './script-effects';
import { addLog, schedule, type HandlerResult } from './state';
import { DAY, addDaysToKey, dateKey, formatDateKey, localToInstant, parseYmd } from './time';
import type { Edition, GameState, Project, RivalFilm, ScheduledEvent } from './types';

/** A festival prize the project won in the year before an instant (its entries record it). */
export function festivalPrizeBefore(state: GameState, p: Project, before: number): boolean {
  return state.editions.some((x) => x.end <= before && x.end > before - 400 * DAY && institution(x.institutionId).kind === 'festival' && x.entries.some((e) => e.projectId === p.id && e.status === 'won'));
}

/**
 * National selection: a festival prize in the past year qualifies the film outright; otherwise the country's committee
 * chooses between it and the country's strongest other film, whose strength is drawn once per edition and country.
 */
export function committee(state: GameState, ed: Edition, p: Project): { chosen: boolean; reason: string } {
  const country = getPlace(p.axes.basePlaceId).country;
  if (festivalPrizeBefore(state, p, ed.deadline)) return { chosen: true, reason: 'Its festival prize qualifies it without the national committee.' };
  const r = stream(state.seed, 'committee', ed.id, country);
  const rival = Math.max(30, Math.min(95, gaussian(r, 66, 8)));
  const title = `${pick(r, ['The ', '', '', 'A '])}${pick(r, RIVAL_WORDS_A)} ${pick(r, RIVAL_WORDS_B)}`;
  const mine = (p.quality?.overall ?? 50) + visibility(state, p, ed.deadline);
  return mine >= rival
    ? { chosen: true, reason: `${countryWords(country)}'s selection committee chose it over ${title}.` }
    : { chosen: false, reason: `${countryWords(country)}'s selection committee put forward ${title} instead.` };
}

/**
 * An entry accepted on a planned release that was then cancelled no longer qualifies: it is disqualified before judging,
 * and its fee isn't refunded. Entries that qualified on a completed release keep their place.
 */
export function disqualifyCancelled(state: GameState, ed: Edition, messages: string[]): void {
  const inst = institution(ed.institutionId);
  for (const e of ed.entries.filter((x) => x.status === 'accepted' && x.reason?.startsWith('Entered provisionally'))) {
    const p = state.projects.find((x) => x.id === e.projectId);
    const cat = inst.categories.find((c) => c.id === e.categoryId);
    if (!p || !cat) continue;
    const saved = state.now;
    state.now = Math.min(ed.deadline, categoryDeadline(ed, cat, p)) - 1;
    const el = checkEligibility(state, p, ed, cat, e.recipients, e.versionId);
    state.now = saved;
    if (el.eligible) continue;
    e.status = 'disqualified';
    e.reason = `Disqualified: ${el.reasons[0]} The entry fee isn't refunded.`;
    messages.push(`${p.title}'s entry for ${cat.name} at the ${ed.label} was disqualified. ${el.reasons[0]}`);
  }
}

/** Your record for an honorary award's body of work: delivered projects you're credited on, wins, nominations and years. */
export function careerRecord(state: GameState, cat: Pick<Category, 'career' | 'need' | 'recipient' | 'formats'>, before: number): { works: number; wins: number; nominations: number; years: number } {
  const fits = (p: Project) => {
    const tv = isEpisodic(p.axes.format) || p.axes.format === 'tv-film';
    // An award for work on a subject (the Stanley Kramer Award's social issues) counts only the work that is about it.
    if (cat.need?.length && requirementProblems(state, p, cat).length) return false;
    switch (cat.career) {
      case 'film': return !tv;
      case 'television': case 'program': return tv;
      case 'animation': return p.axes.medium !== 'live-action';
      case 'producer': return p.credits.some((c) => c.person === 'player' && c.roleId === 'producer');
      default: return true;
    }
  };
  const works = state.projects.filter((p) => p.delivered && (p.delivered.at ?? 0) <= before && p.credits.some((c) => c.person === 'player') && fits(p));
  const ids = new Set(works.map((p) => p.id));
  const mine = state.editions.flatMap((e) => e.entries).filter((e) => ids.has(e.projectId));
  return {
    works: works.length,
    wins: mine.filter((e) => e.status === 'won').length,
    nominations: mine.filter((e) => ['nominated', 'won', 'lost', 'mention'].includes(e.status)).length,
    years: Math.max(0, (before - state.startedAt) / (365.25 * DAY)),
  };
}

/** How likely a career is to be chosen for an honorary award: 0 until it is ten years long with three delivered works. */
export function honoraryChance(rec: ReturnType<typeof careerRecord>, prestige: number): number {
  if (rec.years < 10 || rec.works < 3) return 0;
  const standing = rec.works * 4 + rec.wins * 8 + rec.nominations * 2 + rec.years * 1.5;
  return Math.max(0, Math.min(0.6, (standing - prestige) / 60));
}

/**
 * Honorary awards are chosen by the organizer from a body of work, never entered or paid for (rule 6). Considered once,
 * at the edition's announcement, with a draw fixed by the seed; stored only when it is yours.
 */
export function considerHonorary(state: GameState, ed: Edition, cat: Category, messages: string[]): void {
  if (ed.results[cat.id] || ed.announce < state.startedAt) return;
  const chance = honoraryChance(careerRecord(state, cat, ed.announce), institution(ed.institutionId).prestige);
  if (chance <= 0 || unit(state.seed, 'honorary', ed.id, cat.id) >= chance) return;
  ed.results[cat.id] = { stage: 'winner', projectIds: [], rivalIds: [], revealed: true, honoree: 'player' };
  messages.push(`The ${ed.label} will give you ${cat.name}, for your body of work.`);
}

/** The sections a prize, audience or partner award is decided among: its own, or every section that takes entries. */
export function prizeParents(cats: Category[], cat: Category): Category[] {
  return cat.parents?.length ? cats.filter((c) => cat.parents!.includes(c.id)) : cats.filter(enterable);
}

/** The competing works chosen for a section: as stored where you entered it, else as computed from the season. */
export function sectionField(state: GameState, ed: Edition, cat: Category): Candidate[] {
  const res = ed.results[cat.id];
  if (!res) return publicField(state, ed, cat);
  return res.rivalIds.flatMap((id) => {
    const r = ed.rivals.find((x) => x.id === id);
    const filmKey = r?.film ?? id; // a compact edition names the film directly
    const film = state.rivalFilms[filmKey];
    return film ? [{ id, filmKey, film, score: r?.score ?? 50 }] : [];
  });
}

/** The works a category would select from the season with no entries of yours: what announceEdition would store. */
export function publicField(state: GameState, ed: Edition, cat: Category): Candidate[] {
  const rivals = rivalsFor(state, ed, cat);
  const ranked = judge(state, ed, cat, 'selection', rivals.map((x) => ({ id: x.id, kind: 'rival' as const, score: x.score }))).slice(0, cat.slots);
  return ranked.map((x) => rivals.find((r) => r.id === x.id)!);
}

/** A prize's field: the parents' selected works that fit it, scored for what it rewards (a season film's own strength there). */
export function prizeField(state: GameState, ed: Edition, cats: Category[], cat: Category): Candidate[] {
  const slate = new Map(seasonSlate(state.seed, seasonOf(ed)).map((f) => [f.id, f]));
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const parent of prizeParents(cats, cat)) {
    for (const x of sectionField(state, ed, parent)) {
      if (seen.has(x.filmKey) || !cat.formats.includes(x.film.format)) continue;
      seen.add(x.filmKey);
      out.push({ id: `${ed.id}:${cat.id}:${x.filmKey}`, filmKey: x.filmKey, film: x.film, score: slate.get(x.filmKey)?.scores[cat.recipient] ?? x.score });
    }
  }
  return out;
}

/** Your works selected for a prize's sections that meet its own requirements and have someone credited to receive it. */
export function prizeContenders(state: GameState, ed: Edition, cats: Category[], cat: Category): { p: Project; recipients: string[] }[] {
  const parents = new Set(prizeParents(cats, cat).map((c) => c.id));
  const out: { p: Project; recipients: string[] }[] = [];
  for (const e of ed.entries) {
    if (!parents.has(e.categoryId) || !['selected', 'nominated', 'won', 'lost', 'mention'].includes(e.status) || out.some((x) => x.p.id === e.projectId)) continue;
    const p = state.projects.find((x) => x.id === e.projectId);
    if (!p || !cat.formats.includes(p.axes.format) || (cat.mediums && !cat.mediums.includes(p.axes.medium)) || requirementProblems(state, p, cat).length) continue;
    const recipients = categoryRecipients(state, p, cat).map((c) => c.id);
    if (recipients.length) out.push({ p, recipients });
  }
  return out;
}

/**
 * Prizes, audience and partner awards are decided at results among the works selected for their sections (rule 5).
 * They are stored, with an entry marked as coming from the selection, only where a work of yours was in contention.
 */
export function decidePrizes(state: GameState, ed: Edition, messages: string[]): void {
  const cats = categoriesFor(institution(ed.institutionId), ed.year);
  for (const cat of cats) {
    if (enterable(cat) || cat.kind === 'honorary' || ed.results[cat.id]) continue;
    const contenders = prizeContenders(state, ed, cats, cat);
    if (!contenders.length) continue;
    const field = prizeField(state, ed, cats, cat);
    const ranked = judge(state, ed, cat, 'winner', [
      ...contenders.map((c) => ({ id: c.p.id, kind: 'project' as const, score: playerScore(c.p, cat, c.recipients, cat.judging) })),
      ...field.map((x) => ({ id: x.id, kind: 'rival' as const, score: x.score })),
    ]);
    const winners = winnersOf(cat, ranked);
    // The strongest few competing works are kept with the result, and every winner.
    const kept = field.filter((x) => winners.includes(x.id) || ranked.filter((y) => y.kind === 'rival').slice(0, 5).some((y) => y.id === x.id));
    for (const x of kept) {
      state.rivalFilms[x.filmKey] ??= x.film;
      ed.rivals.push({ id: x.id, film: x.filmKey, score: x.score });
    }
    ed.results[cat.id] = { stage: 'winner', projectIds: contenders.map((c) => c.p.id), rivalIds: kept.map((x) => x.id), winner: winners[0], ...(cat.kind === 'area' || cat.kind === 'juried' ? { winners } : {}), revealed: true };
    // A jury can single out the work just behind the winner (modeled: within three points).
    const next = ranked[winners.length];
    const mention = next && next.kind === 'project' && cat.judging === 'jury' && winners.length > 0 && next.score >= ranked[0].score - 3 ? next.id : undefined;
    for (const c of contenders) {
      const won = winners.includes(c.p.id);
      const status = won ? 'won' : c.p.id === mention ? 'mention' : 'lost';
      ed.entries.push({ id: `${ed.id}:${cat.id}:${c.p.id}`, projectId: c.p.id, categoryId: cat.id, submittedAt: state.now, status, recipients: c.recipients, fee: 0, via: 'selection' });
      if (status === 'won') {
        messages.push(`${winnerWords(c.p, cat, c.recipients)} won ${cat.name} at the ${ed.label}.`);
        c.p.history.push({ at: state.now, text: `Won ${cat.name}, ${ed.label}.` });
      } else if (status === 'mention') {
        messages.push(`${c.p.title} received a special mention for ${cat.name} at the ${ed.label}.`);
        c.p.history.push({ at: state.now, text: `Special mention: ${cat.name}, ${ed.label}.` });
      }
    }
  }
  // One line for a work that was considered and received nothing, rather than one per prize.
  for (const p of state.projects) {
    const mine = ed.entries.filter((x) => x.projectId === p.id && x.via === 'selection');
    // A prize or a mention brings distributors' attention once more: exposure that raises their interest, never a
    // promise of an offer (finish.ts distribution-offer decides from the film's reception plus this exposure).
    const best = mine.some((x) => x.status === 'won') ? 6 : mine.some((x) => x.status === 'mention') ? 10 : 0;
    if (best) schedule(state, ed.end + 2 * DAY, 'distribution-offer', { projectId: p.id, wave: `${ed.id}:prize`, exposure: Math.round(institution(ed.institutionId).prestige / best) }, { attention: 'notify', priority: 55 });
    if (!mine.length || mine.some((x) => x.status !== 'lost')) continue;
    const name = cats.find((c) => c.id === mine[0].categoryId)?.name;
    messages.push(`${p.title} didn't win ${mine.length === 1 ? name : `any of the ${mine.length} prizes it was considered for`} at the ${ed.label}.`);
  }
}

/** What an edition shows for a category: the selected or nominated works, the winners, and an honorary recipient. */
export interface ShownResult { stage: 'selection' | 'nomination' | 'winner'; field: string[]; winners: string[]; honoree?: 'player' | string; none?: boolean }

const shownCache = new Map<string, ShownResult | null>();

/**
 * A category's result as shown: stored where you were involved, else computed from the season and the seed exactly as
 * announceEdition and the results would have decided it, so it reads the same after every reload (rule 4).
 */
export function publicResult(state: GameState, ed: Edition, cat: Category): ShownResult | null {
  const title = (id: string) => state.projects.find((x) => x.id === id)?.title ?? rivalTitle(state, ed, id) ?? state.rivalFilms[id]?.title;
  const stored = ed.results[cat.id];
  if (stored) {
    if (!stored.revealed) return null;
    const all = [...stored.projectIds, ...stored.rivalIds].map(title).filter((x): x is string => !!x);
    const ws = (stored.winners ?? (stored.winner ? [stored.winner] : [])).map(title).filter((x): x is string => !!x);
    return { stage: stored.stage, field: all, winners: ws, honoree: stored.honoree, none: stored.stage === 'winner' && !ws.length && !stored.honoree };
  }
  if (ed.status !== 'announced' && ed.status !== 'complete') return null;
  const key = `${state.seed}|${ed.id}|${cat.id}|${ed.status}`;
  if (shownCache.has(key)) return shownCache.get(key)!;
  const done = ed.status === 'complete';
  const festival = institution(ed.institutionId).kind === 'festival' || cat.kind === 'section';
  let out: ShownResult | null;
  if (cat.kind === 'honorary') {
    const r = stream(state.seed, 'honoree', ed.id, cat.id);
    out = { stage: 'winner', field: [], winners: [], honoree: `${pick(r, ['Iris', 'Teo', 'Marisol', 'Kwame', 'Ana', 'Lars', 'Mina', 'Rafi', 'Odile', 'Sung-min', 'Leila', 'Joaquín'])} ${pick(r, ['Varga', 'Mbeki', 'Holt', 'Ruiz', 'Okoro', 'Aalto', 'Brandt', 'Sato', 'Navarro', 'Moreau', 'Osei', 'Tanaka'])}` };
  } else if (!enterable(cat)) {
    if (!done) out = null;
    else {
      const field = prizeField(state, ed, categoriesFor(institution(ed.institutionId), ed.year), cat);
      const ws = winnersOf(cat, judge(state, ed, cat, 'winner', field.map((x) => ({ id: x.id, kind: 'rival' as const, score: x.score }))));
      const t = ws.map((id) => field.find((x) => x.id === id)!.film.title);
      out = { stage: 'winner', field: [], winners: t, none: !t.length };
    }
  } else {
    const field = publicField(state, ed, cat);
    const titles = field.map((x) => x.film.title);
    let winners: string[] = [];
    if (done && cat.competitive) winners = winnersOf(cat, judge(state, ed, cat, 'winner', field.map((x) => ({ id: x.id, kind: 'rival' as const, score: x.score })))).map((id) => field.find((x) => x.id === id)!.film.title);
    out = { stage: done && cat.competitive ? 'winner' : festival ? 'selection' : 'nomination', field: titles, winners, none: done && cat.competitive && !winners.length };
  }
  if (shownCache.size > 2000) shownCache.clear();
  shownCache.set(key, out);
  return out;
}

// ---------------- Judging (moved from awards.ts, November 9, 2026) ----------------

export function seasonOf(ed: Edition): number {
  return institution(ed.institutionId).kind === 'festival' ? ed.year : ed.year - 1;
}

/** A candidate competing work for one category: its film (stored once per save if chosen) and its strength there. */
export interface Candidate { id: string; filmKey: string; film: RivalFilm; score: number }

export function rivalsFor(state: GameState, ed: Edition, cat: Category): Candidate[] {
  const slate = seasonSlate(state.seed, seasonOf(ed)).filter((f) =>
    cat.formats.includes(f.format) && (!cat.mediums || cat.mediums.includes(f.medium)) &&
    (!cat.genres || f.genres.some((g) => cat.genres!.includes(g))) && (!cat.excludeGenres || !f.genres.some((g) => cat.excludeGenres!.includes(g))) &&
    (!cat.class || (cat.class === 'comedy') === f.genres.some((g) => COMEDY_MUSICAL.includes(g))));
  const fromSlate: Candidate[] = slate.map((f) => ({
    id: `${ed.id}:${cat.id}:${f.id}`, filmKey: f.id, film: { title: f.title, people: f.people, format: f.format, medium: f.medium, runtimeMin: f.runtimeMin }, score: f.scores[cat.recipient],
  }));
  const needed = Math.max(cat.slots * 3, cat.slots + 6);
  if (fromSlate.length >= needed) return fromSlate;
  return [...fromSlate, ...generatedRivals(state, ed, cat, needed - fromSlate.length)];
}

function generatedRivals(state: GameState, ed: Edition, cat: Category, n: number): Candidate[] {
  const inst = institution(ed.institutionId);
  const r = stream(state.seed, 'rivals', ed.id, cat.id);
  const out: Candidate[] = [];
  for (let i = 0; i < n; i++) {
    const title = `${pick(r, ['The ', '', '', 'A '])}${pick(r, RIVAL_WORDS_A)} ${pick(r, RIVAL_WORDS_B)}`;
    // Rival work strength by event prestige; a simulation assumption.
    const score = Math.max(20, Math.min(97, gaussian(r, inst.prestige - 8, 10)));
    const id = `${ed.id}:${cat.id}:r${i}`;
    out.push({
      id, filmKey: id, score,
      film: {
        title, people: { lead: `${pick(r, ['Iris', 'Teo', 'Marisol', 'Kwame', 'Ana', 'Lars', 'Mina', 'Rafi', 'Odile', 'Sung-min'])} ${pick(r, ['Varga', 'Mbeki', 'Holt', 'Ruiz', 'Okoro', 'Aalto', 'Brandt', 'Sato', 'Navarro', 'Achterberg'])}` },
        format: cat.formats[0], medium: cat.mediums?.[0] ?? 'live-action', runtimeMin: cat.formats.includes('short') ? intBetween(r, 6, 30) : intBetween(r, 80, 140),
      },
    });
  }
  return out;
}

export function playerScore(p: Project, cat: Category, recipients: string[], judging: Judging): number {
  const q = p.quality ?? {};
  const perf = (rid: string) => {
    const credit = p.credits.find((c) => c.id === rid);
    const chars = p.drafts.find((d) => d.number === p.approvedDraft)?.characters ?? [];
    const ch = chars.find((x) => x.name === credit?.characterName);
    const key = Object.keys(q).find((k) => k.startsWith(`performance:${ch?.id}:`) && k.endsWith(`:${credit?.person}`));
    return key ? q[key] : q.overall ?? 50;
  };
  switch (cat.recipient) {
    case 'director': return q.direction ?? 50;
    case 'writer': return q.script ?? 50;
    case 'lead': case 'supporting': case 'voice': return recipients.length ? Math.max(...recipients.map(perf)) : 50;
    case 'ensemble': case 'host': case 'national': case 'career': return q.overall ?? 50;
    case 'guest': case 'performer': return recipients.length ? Math.max(...recipients.map(perf)) : 50;
    case 'craft': return craftScore(p, cat.crafts, false);
    case 'song': return craftScore(p, undefined, true);
    default: {
      if (judging === 'audience') return q.reception ?? q.overall ?? 50;
      if (cat.mediums?.includes('animation') && q.animation) return (q.overall + q.animation) / 2;
      return q.overall ?? 50;
    }
  }
}

/** Season visibility: earlier festival selections and wins in the past year help with members' ballots. */
export function visibility(state: GameState, p: Project, before: number): number {
  let v = 0;
  for (const e of state.editions) {
    if (e.end > before || e.end < before - 400 * DAY) continue;
    for (const [, r] of Object.entries(e.results)) {
      if (!r.revealed) continue;
      if (r.winner === p.id) v += 3;
      else if (r.projectIds.includes(p.id)) v += 1;
    }
  }
  return Math.min(8, v);
}

const NOISE: Record<Judging, number> = { programmers: 7, jury: 9, members: 5, audience: 6 };

export function judge(state: GameState, ed: Edition, cat: Category, stage: 'selection' | 'winner', pool: { id: string; kind: 'project' | 'rival'; score: number }[]): { id: string; kind: 'project' | 'rival'; score: number }[] {
  const r = stream(state.seed, 'judging', ed.id, cat.id, stage);
  return pool
    .map((x) => ({ ...x, score: x.score + gaussian(r, 0, NOISE[cat.judging]) }))
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
}


/**
 * Selection or nominations, for the categories you entered: other categories' public results are computed when shown
 * (publicResult), never stored (docs/awards/DESIGN.md rule 4; until November 9, 2026 every category's were, which at
 * 802 categories would have filled long careers' saves). Honorary awards are considered here. Results persist once and
 * are never rerolled.
 */
export function announce(state: GameState, ed: Edition): HandlerResult {
  if (ed.status === 'announced' || ed.status === 'complete') return { suppressInterrupt: true };
  const inst = institution(ed.institutionId);
  ed.status = 'announced';
  const messages: string[] = [];
  disqualifyCancelled(state, ed, messages);
  for (const cat of categoriesFor(inst, ed.year)) {
    if (cat.kind === 'honorary') { considerHonorary(state, ed, cat, messages); continue; }
    if (ed.results[cat.id]) continue; // persisted once; never rerolled
    const entries = ed.entries.filter((e) => e.categoryId === cat.id && e.status === 'accepted');
    if (!entries.length) continue;
    const rivals = rivalsFor(state, ed, cat);
    const pool = [
      ...entries.map((e) => {
        const p = state.projects.find((x) => x.id === e.projectId)!;
        const vis = cat.judging === 'members' ? visibility(state, p, ed.announce) : 0;
        return { id: p.id, kind: 'project' as const, score: playerScore(p, cat, e.recipients, cat.judging) + vis };
      }),
      ...rivals.map((x) => ({ id: x.id, kind: 'rival' as const, score: x.score })),
    ];
    const ranked = judge(state, ed, cat, 'selection', pool).slice(0, cat.slots);
    const chosenRivals = rivals.filter((x) => ranked.some((y) => y.id === x.id));
    for (const x of chosenRivals) {
      state.rivalFilms[x.filmKey] ??= x.film;
      ed.rivals.push({ id: x.id, film: x.filmKey, score: x.score });
    }
    const festival = inst.kind === 'festival' || cat.kind === 'section';
    ed.results[cat.id] = { stage: festival ? 'selection' : 'nomination', projectIds: ranked.filter((x) => x.kind === 'project').map((x) => x.id), rivalIds: chosenRivals.map((x) => x.id), revealed: true };
    for (const e of entries) {
      const p = state.projects.find((x) => x.id === e.projectId)!;
      const picked = ranked.some((x) => x.id === p.id);
      e.status = festival ? (picked ? 'selected' : 'not-selected') : picked ? 'nominated' : 'not-nominated';
      if (picked) {
        const zone = getPlace(state.locationId).zone;
        messages.push(festival
          ? `${p.title} has been selected for ${cat.name} at the ${ed.label}.${inst.kind === 'festival' ? ` The festival runs from ${formatDateKey(dateKey(ed.start, zone))}.` : ''}`
          : `${p.title} was nominated for ${cat.name} at the ${ed.label}. The ceremony is on ${formatDateKey(dateKey(ed.start, zone))}.`);
        p.history.push({ at: state.now, text: `${festival ? 'Selected' : 'Nominated'}: ${cat.name}, ${ed.label}.` });
      } else {
        messages.push(`${p.title} wasn't ${festival ? 'selected' : 'nominated'} for ${cat.name} at the ${ed.label}.`);
      }
    }
  }
  for (const m of messages) addLog(state, m, inst.kind === 'festival' ? 'festival' : 'award', { route: { view: 'event', editionId: ed.id } });
  if (!messages.length) return involved(state, ed) ? { message: `The ${ed.label} announced its ${inst.kind === 'festival' ? 'selection' : 'nominations'}.` } : { suppressInterrupt: true };
  return { message: messages[0] };
}

export function festivalOpens(state: GameState, ed: Edition): HandlerResult {
  const inst = institution(ed.institutionId);
  if (inst.kind !== 'festival') return involved(state, ed) ? { message: `The ${ed.label} ceremony is today.` } : { suppressInterrupt: true };
  const zone = getPlace(inst.placeId).zone;
  const startKey = dateKey(ed.start, zone);
  const messages: string[] = [];
  for (const e of ed.entries.filter((x) => x.status === 'selected')) {
    const p = state.projects.find((x) => x.id === e.projectId);
    if (!p) continue;
    const cat = inst.categories.find((c) => c.id === e.categoryId)!;
    if (cat.premiere === 'world' && p.premiere && p.premiere.editionId !== ed.id && p.premiere.date < startKey) {
      e.status = 'disqualified';
      e.reason = 'It premiered elsewhere first, so it no longer qualifies for this section.';
      messages.push(`${p.title} can't screen in ${cat.name} at the ${ed.label}: it premiered elsewhere first.`);
      continue;
    }
    if (!p.premiere) p.premiere = { kind: 'world', date: startKey, country: getPlace(inst.placeId).country, venue: ed.label, editionId: ed.id };
    // Two public screenings inside the festival dates. They happen whether or not you attend.
    ed.screenings ??= [];
    const slots: [number, number][] = [[1, 19], [3, 14]];
    for (const [dayOffset, hour] of slots) {
      const k = addDaysToKey(startKey, Math.min(dayOffset, inst.duration - 1));
      const { year, month, day } = parseYmd(k);
      const at = Math.min(ed.end - 3600_000, localToInstant(zone, year, month, day, hour).instant);
      if (ed.screenings.some((x) => x.projectId === p.id && x.at === at)) continue;
      // You're invited to attend; reply at least a day ahead. The screening happens either way.
      ed.screenings.push({ projectId: p.id, at, done: false, rsvpBy: at - DAY, rsvp: 'pending' });
      schedule(state, at, 'screening', { editionId: ed.id, projectId: p.id, at }, { attention: 'notify', priority: 31 });
      schedule(state, at - 30 * 60_000, 'screening-reminder', { editionId: ed.id, projectId: p.id, at }, { attention: 'interrupt', priority: 30 });
    }
    messages.push(`${p.title} screens at the ${ed.label} this week.`);
    schedule(state, ed.end + DAY, 'distribution-offer', { projectId: p.id, wave: ed.id, exposure: Math.round(institution(ed.institutionId).prestige / 8) }, { attention: 'notify', priority: 55 });
  }
  for (const m of messages) addLog(state, m, 'festival', { route: { view: 'event', editionId: ed.id } });
  return messages.length ? { message: messages[0] } : involved(state, ed) ? { message: `The ${ed.label} opens today.` } : { suppressInterrupt: true };
}

export function screeningHappens(state: GameState, ev: ScheduledEvent): HandlerResult {
  const ed = edition(state, ev.payload.editionId as string);
  const sc = ed.screenings?.find((x) => x.projectId === ev.payload.projectId && x.at === ev.payload.at);
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  if (!sc || sc.done) return { suppressInterrupt: true };
  sc.done = true;
  const inst = institution(ed.institutionId);
  sc.attended = sc.rsvp === 'accepted' && state.locationId === inst.placeId && !state.travel;
  if (sc.rsvp === 'pending') sc.rsvp = 'expired';
  const reception = p?.quality?.reception ?? 50;
  const response = reception >= 75 ? 'warm' : reception >= 55 ? 'mixed but attentive' : 'cool';
  const presence = sc.attended ? ' You were there and answered questions afterward.' : sc.rsvp === 'accepted' ? " You'd said you would attend, but you weren't there." : '';
  const text = `${p?.title ?? 'Your film'} screened at the ${ed.label}. The audience response was ${response}.${presence}`;
  p?.history.push({ at: state.now, text });
  addLog(state, text, 'festival', { projectId: p?.id, route: { view: 'event', editionId: ed.id } });
  return { message: text };
}

export function screeningReminder(state: GameState, ev: ScheduledEvent): HandlerResult {
  const ed = edition(state, ev.payload.editionId as string);
  const sc = ed.screenings?.find((x) => x.projectId === ev.payload.projectId && x.at === ev.payload.at);
  if (!sc || sc.done || sc.rsvp === 'declined') return { suppressInterrupt: true };
  const text = 'Your screening starts in 30 minutes.';
  addLog(state, text, 'festival', { projectId: sc.projectId, route: { view: 'event', editionId: ed.id } });
  return { message: text };
}

export function editionResults(state: GameState, ed: Edition): HandlerResult {
  if (ed.status === 'complete') return { suppressInterrupt: true };
  const inst = institution(ed.institutionId);
  if (ed.status !== 'announced') {
    // Events that finished before the life began (or without an announcement) are announced first.
    announce(state, ed);
  }
  const messages: string[] = [];
  for (const cat of categoriesFor(inst, ed.year)) {
    const res = ed.results[cat.id];
    if (!res || !cat.competitive || !enterable(cat) || res.stage === 'winner') continue;
    const pool = [
      ...res.projectIds.map((id) => {
        const p = state.projects.find((x) => x.id === id)!;
        const e = ed.entries.find((x) => x.projectId === id && x.categoryId === cat.id)!;
        const vis = cat.judging === 'members' ? visibility(state, p, ed.start) : 0;
        return { id, kind: 'project' as const, score: playerScore(p, cat, e?.recipients ?? [], cat.judging) + vis };
      }).filter((x) => ed.entries.some((e) => e.projectId === x.id && e.categoryId === cat.id && e.status !== 'withdrawn' && e.status !== 'disqualified')),
      ...res.rivalIds.map((id) => ({ id, kind: 'rival' as const, score: ed.rivals.find((r) => r.id === id)?.score ?? 50 })),
    ];
    if (!pool.length) continue;
    const winners = winnersOf(cat, judge(state, ed, cat, 'winner', pool));
    res.winner = winners[0];
    if (cat.kind === 'area' || cat.kind === 'juried') res.winners = winners;
    res.stage = 'winner';
    const titles = winners.map((id) => state.projects.find((x) => x.id === id)?.title ?? rivalTitle(state, ed, id) ?? 'another work');
    for (const e of ed.entries.filter((x) => x.categoryId === cat.id && (x.status === 'selected' || x.status === 'nominated'))) {
      const p = state.projects.find((x) => x.id === e.projectId)!;
      const won = winners.includes(p.id);
      e.status = won ? 'won' : 'lost';
      if (won) {
        messages.push(`${winnerWords(p, cat, e.recipients)} won ${cat.name} at the ${ed.label}.`);
        p.history.push({ at: state.now, text: `Won ${cat.name}, ${ed.label}.` });
      } else {
        messages.push(`${p.title} didn't win ${cat.name} at the ${ed.label}. ${titles.length ? `It went to ${titles.join(' and ')}.` : 'No award was given this year.'}`);
      }
    }
  }
  decidePrizes(state, ed, messages);
  ed.status = 'complete';
  compactEdition(ed);
  for (const m of messages) addLog(state, m, inst.kind === 'festival' ? 'festival' : 'award', { route: { view: 'event', editionId: ed.id } });
  return messages.length ? { message: messages[0] } : { suppressInterrupt: true };
}

export function winnerWords(p: Project, cat: Category, recipients: string[]): string {
  const names = recipients.map((rid) => p.credits.find((c) => c.id === rid)?.personName).filter(Boolean);
  return cat.recipient === 'project' || cat.recipient === 'producer' || !names.length ? p.title : `${names.join(' and ')} for ${p.title}`;
}

/** Area and juried awards: any work the judges hold to the standard wins, so one, several or none (modeled bar). */
const JURIED_BAR = 78;

export function winnersOf(cat: Category, ranked: { id: string; score: number }[]): string[] {
  if (cat.kind === 'area' || cat.kind === 'juried') return ranked.filter((x) => x.score >= JURIED_BAR).map((x) => x.id);
  return ranked.length ? [ranked[0].id] : [];
}

