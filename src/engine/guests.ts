// Real people from the film catalog, working in a save (the Creative Depth package, milestone D,
// docs/creative-depth/package/03-PEOPLE-CASTING-AND-HIRING.md). Until this, a person's page in the catalog was a
// reference: their recorded credits and nothing to do with them. Here they become people the player can consider,
// audition, make an offer to, contract, pay and credit, through the same hiring code as everyone else.
//
// Two things are kept about each, and never mixed:
// - `rec`, a copy of what is recorded: their name, their dates of birth and death where the catalog has them, and how
//   many credits of each kind it holds for them. It is the catalog's, so it lasts only as long as the catalog may: six
//   months from when it was gathered (TMDB's API terms, 1.C, as docs/CATALOG.md reads them). An installed catalog renews
//   it; with none, it is removed, and their name is shown as withdrawn until one is back.
// - `sim`, what the game makes up for this story: how experienced they count as in each job, a capability drawn around
//   that, a rate they ask, and other work that keeps them busy. None of it is a fact about the person, and every screen
//   that shows it says so. It is frozen when they are first considered, so a refreshed catalog never changes it.
//
// What is never done: no background, nationality, language, pronoun, health or temperament is guessed from a name, a
// photograph or a place of birth. No rating, vote count or popularity figure is read (the catalog pages show TMDB's
// rating of a title; nothing here reads it). Nobody recorded as having died is approached after that day. Somebody
// with no recorded birth date is not hired until the player says to treat them as an adult in this story.
//
// A real person has one ID wherever they were credited, TMDB's own, so they have one diary: bookings are kept per
// person across every project (state.people), and a second project finds them busy.
import { ROLES, role, type Person } from './people';
import { gaussian, intBetween, stream } from './rng';
import { DAY, addDaysToKey, dateKey } from './time';
import type { GameState, PerformanceMethod, Project } from './types';

/** How long a copy of the catalog's record may be kept: TMDB's six months, as the catalog and the packs keep it. */
export const RECORD_DAYS = 180;
/** What stands in for a name the save may no longer hold. */
export const WITHDRAWN = 'Someone From The Film Catalog';

/** A credit as the catalog records it (src/catalog/model.ts PersonCredit), as far as this module reads it. */
export interface RecordedCredit { kind: string; role: string | null; department?: string; date: string | null; episodes?: number }
/** A person as the catalog records them (PersonRecord), as far as this module reads it. */
export interface RecordedPerson { id: number; name: string; details: { birthday: string | null; deathday: string | null; retrievedAt?: string } | null; credits: RecordedCredit[] }

/** Recorded credits counted by the game's jobs: how many, and the years of the first and the last that have a date. */
export type Evidence = Record<string, { n: number; first?: number; last?: number }>;

export interface RealPerson {
  /** `tp_<TMDB person ID>`: the same wherever they were credited. */
  id: string;
  /** The catalog's record, copied. Absent once it has been withdrawn for its age. */
  rec?: { name: string; born?: string; died?: string; ev: Evidence; from: string };
  /** This story's own, made by the game when they were first considered, and kept. */
  sim: {
    at: number;
    /** For each job they have recorded credits in: the level the game counts them at (1 to 5), a capability and an asking rate. */
    jobs: Record<string, { exp: number; cap: number; rate: number }>;
    /** Other work that keeps them busy in this story. Made up, as it is for everyone in the game. */
    busy: { from: string; to: string }[];
    /** Set by the player for someone with no recorded birth date: treated as an adult in this story. */
    adult?: true;
    /** Their age range for parts, kept when they were first considered with a recorded birth date. */
    playing?: [number, number];
  };
}
export type RealPeople = Record<string, RealPerson>;
const realOf = (state: GameState): RealPeople => (state.real ??= {});
const peek = (state: GameState): RealPeople => state.real ?? {};

export const realId = (tmdbId: number): string => `tp_${tmdbId}`;
export const isReal = (id: string): boolean => /^tp_\d+$/.test(id);
export const tmdbIdOf = (id: string): number => Number(id.slice(3));

// ---------------- What the record shows ----------------

/**
 * Recorded crew jobs, as TMDB names them, and the job in the game each is evidence for. A credit as Executive Producer
 * is evidence for none: it isn't the work of a producer on the floor, and the game has no such job to hire for.
 */
const JOBS: Record<string, string[]> = {
  Director: ['episode-director'], Screenplay: ['episode-writer', 'co-writer'], Writer: ['episode-writer', 'co-writer'], Story: ['co-writer'], Teleplay: ['episode-writer', 'co-writer'], Creator: ['episode-writer', 'co-writer'],
  Producer: ['line-producer'], 'Line Producer': ['line-producer'], 'Director of Photography': ['dop'], Editor: ['editor'], 'Original Music Composer': ['composer'],
  'Production Design': ['production-designer'], 'Costume Design': ['costume-designer'], Casting: ['casting-director'],
};
const ACTING = new Set(['cast', 'series-cast', 'episode-guest']);

/** Count a person's recorded credits by the game's jobs. Only what is recorded counts; nothing is supposed. */
export function evidenceOf(credits: RecordedCredit[]): Evidence {
  const ev: Evidence = {};
  const add = (job: string, c: RecordedCredit) => {
    const e = (ev[job] ??= { n: 0 });
    e.n += 1;
    const y = c.date ? Number(c.date.slice(0, 4)) : NaN;
    if (Number.isFinite(y)) { e.first = Math.min(e.first ?? y, y); e.last = Math.max(e.last ?? y, y); }
  };
  for (const c of credits) {
    if (ACTING.has(c.kind)) {
      add('actor', c);
      // A voice part is evidence of voice work only where the record says it was one.
      if (/\(voice\)/i.test(c.role ?? '')) add('voice-actor', c);
      continue;
    }
    for (const job of JOBS[c.kind === 'creator' ? 'Creator' : c.role ?? ''] ?? []) add(job, c);
  }
  return ev;
}

/** The level the game counts someone at from how many recorded credits they have in a job. Calibration, not a ranking. */
export function levelFrom(n: number): number {
  return n >= 40 ? 5 : n >= 20 ? 4 : n >= 8 ? 3 : n >= 3 ? 2 : 1;
}

/** The jobs a real person can be approached for: those with a recorded credit, and voice work for any performer. */
export function jobsOf(p: RealPerson): string[] {
  const jobs = Object.keys(p.sim.jobs);
  return jobs.includes('actor') && !jobs.includes('voice-actor') ? [...jobs, 'voice-actor'] : jobs;
}

// ---------------- Considering someone ----------------

/**
 * Bring a person from the catalog into this save, or renew the copy of their record if they are already in it. What
 * the game makes up about them is made once, the first time, from this save's seed and their recorded credits, and
 * never again: a later catalog renews their name and dates and nothing else.
 */
export function considerPerson(state: GameState, record: RecordedPerson, gathered: string): RealPerson {
  const id = realId(record.id);
  const real = realOf(state);
  const ev = evidenceOf(record.credits);
  const rec: NonNullable<RealPerson['rec']> = { name: record.name, ev, from: (record.details?.retrievedAt ?? gathered).slice(0, 10) };
  if (record.details?.birthday) rec.born = record.details.birthday;
  if (record.details?.deathday) rec.died = record.details.deathday;
  const have = real[id];
  if (have) { have.rec = rec; return have; }
  const jobs: RealPerson['sim']['jobs'] = {};
  for (const [job, e] of Object.entries(ev)) {
    const def = ROLES.find((r) => r.id === job);
    if (!def) continue;
    const r = stream(state.seed, 'real-person', id, job);
    const exp = levelFrom(e.n);
    // The same calibration as anyone in the game (people.ts): a capability drawn around the level, and a rate from the
    // job's base rate. The draw is this save's; another save draws its own.
    jobs[job] = { exp, cap: Math.round(Math.min(98, Math.max(30, 40 + exp * 9 + gaussian(r, 0, 8)))), rate: Math.round((def.rate * (0.62 + exp * 0.2) * (0.9 + r() * 0.2)) / 10) * 10 };
  }
  if (jobs.actor && !jobs['voice-actor']) {
    // A performer with no recorded voice part can still be asked to read for one: counted as new to it.
    const r = stream(state.seed, 'real-person', id, 'voice-actor');
    jobs['voice-actor'] = { exp: 1, cap: Math.round(Math.min(98, Math.max(30, 49 + gaussian(r, 0, 8)))), rate: Math.round((role('voice-actor').rate * 0.82 * (0.9 + r() * 0.2)) / 10) * 10 };
  }
  const rb = stream(state.seed, 'real-person', id, 'busy');
  const busy: { from: string; to: string }[] = [];
  for (let b = intBetween(rb, 0, 3); b > 0; b--) {
    const from = addDaysToKey(dateKey(state.now, 'UTC'), intBetween(rb, 20, 900));
    busy.push({ from, to: addDaysToKey(from, intBetween(rb, 10, 70)) });
  }
  const p: RealPerson = { id, rec, sim: { at: state.now, jobs, busy } };
  if (rec.born && jobs.actor) {
    const age = yearsBetween(rec.born, dateKey(state.now, 'UTC'));
    const width = intBetween(stream(state.seed, 'real-person', id, 'playing'), 6, 14);
    p.sim.playing = age < 18 ? [Math.max(0, age - 2), age + 2] : [Math.max(16, age - Math.round(width * 0.6)), age + width - Math.round(width * 0.6)];
  }
  real[id] = p;
  return p;
}

const yearsBetween = (born: string, on: string): number => {
  const y = Number(on.slice(0, 4)) - Number(born.slice(0, 4));
  return on.slice(5) < born.slice(5) ? y - 1 : y;
};

export const realPerson = (state: GameState, id: string): RealPerson | undefined => peek(state)[id];
export const realPeople = (state: GameState): RealPerson[] => Object.values(peek(state));

/** Treat someone with no recorded birth date as an adult in this story, or stop doing so. The player's choice, and labelled. */
export function treatAsAdult(state: GameState, id: string, on: boolean): void {
  const p = peek(state)[id];
  if (!p) throw new Error("That person isn't in your story yet.");
  if (p.rec?.born) throw new Error(`${p.rec.name}'s date of birth is recorded, so their age is reckoned from it.`);
  if (on) p.sim.adult = true; else delete p.sim.adult;
}

// ---------------- Considering someone for a part or a job ----------------

/** A real person the player is considering for a part or a job on a project: the list the Cast and Crew pages show. */
export interface Considered { personId: string; roleId: string; characterId?: string; method?: PerformanceMethod }
export const consideredOn = (p: Project): Considered[] => p.considered ?? [];

/**
 * Put a real person on a project's list for a part or a job. Nothing is offered, held or paid by this: it is the
 * player's shortlist. Refused, with the reason, when they can't be approached for it.
 */
export function considerFor(state: GameState, p: Project, c: Considered, on: string): void {
  if (p.delivered) throw new Error('This project has already been delivered.');
  const a = canApproach(state, c.personId, c.roleId, on);
  if (!a.ok) throw new Error(a.reason);
  if (c.characterId && !p.characters.some((x) => x.id === c.characterId)) throw new Error('That part is no longer in the script.');
  const list = (p.considered ??= []);
  const entry: Considered = { personId: c.personId, roleId: c.roleId, ...(c.characterId ? { characterId: c.characterId, method: c.method ?? 'on-camera' } : {}) };
  if (list.some((x) => x.personId === entry.personId && x.roleId === entry.roleId && x.characterId === entry.characterId && x.method === entry.method)) return;
  list.push(entry);
}

/** Take someone off a project's list. Their offers, if any were made, are untouched: withdraw those where they are shown. */
export function stopConsidering(p: Project, c: Considered): void {
  p.considered = (p.considered ?? []).filter((x) => !(x.personId === c.personId && x.roleId === c.roleId && x.characterId === c.characterId));
  if (!p.considered.length) delete p.considered;
}

// ---------------- Whether they can be approached ----------------

export interface Approach { ok: boolean; reason?: string; notes: string[] }

/**
 * Whether a real person can be approached for a job on a date, with the reason when not, and things to know when so.
 * The reasons are about what is recorded and what isn't; none is a judgement of the person.
 */
export function canApproach(state: GameState, id: string, job: string, on: string): Approach {
  const p = peek(state)[id];
  const notes: string[] = [];
  if (!p) return { ok: false, reason: "They aren't in your story yet: open their page in the catalog and consider them first.", notes };
  if (!p.rec) return { ok: false, reason: "Their record was withdrawn when the film catalog's six months passed. Install the films again, and they can be approached.", notes };
  const name = p.rec.name;
  if (p.rec.died && p.rec.died <= on) return { ok: false, reason: `${name} died on ${p.rec.died}. Their page stays for reference.`, notes };
  if (!jobsOf(p).includes(job)) {
    const label = ROLES.find((r) => r.id === job)?.label.toLowerCase() ?? job;
    return { ok: false, reason: `The catalog records no credit for ${name} as ${/^[aeiou]/.test(label) ? 'an' : 'a'} ${label}. That isn't a judgement of them: there is nothing to go on.`, notes };
  }
  const cast = !!ROLES.find((r) => r.id === job)?.cast;
  if (!p.rec.born && !p.sim.adult) {
    return { ok: false, reason: `${name}'s date of birth isn't recorded, so the game can't tell whether the rules for children apply. Mark them as an adult in this story on their page, or choose someone else.`, notes };
  }
  if (!p.rec.born) notes.push(`${name}'s age isn't recorded. You marked them as an adult in this story.`);
  if (job === 'voice-actor' && !p.rec.ev['voice-actor']) notes.push('The catalog records no voice part for them. They are counted as new to voice work.');
  if (cast) notes.push("The languages they work in aren't recorded, and none is assumed.");
  const e = p.rec.ev[job];
  if (e) notes.push(`${e.n} recorded ${e.n === 1 ? 'credit' : 'credits'} in this catalog${e.first ? `, ${e.first === e.last ? `in ${e.first}` : `from ${e.first} to ${e.last}`}` : ''}. Work the catalog doesn't cover isn't counted.`);
  return { ok: true, notes };
}

// ---------------- As a person in the game ----------------

/**
 * A real person as the hiring code reads anyone (people.ts Person), for a job. Their experience, capability, rate and
 * diary are this story's (`sim`); their name and date of birth are the record's. Background, nationality and languages
 * are empty: nothing is known, and nothing is guessed. Pronouns are 'they' for the same reason.
 */
export function asPerson(state: GameState, id: string, job?: string): Person {
  const p = peek(state)[id];
  if (!p) throw new Error('Unknown person');
  const roleId = job && p.sim.jobs[job] ? job : Object.keys(p.sim.jobs)[0] ?? 'actor';
  const j = p.sim.jobs[roleId] ?? { exp: 1, cap: 49, rate: role(roleId).rate };
  const e = p.rec?.ev[roleId];
  const def = role(roleId);
  return {
    id, name: p.rec?.name ?? WITHDRAWN, pronouns: 'they', roleId, experience: j.exp, capability: j.cap, dayRate: j.rate, languages: [], homeCountry: '', heritages: [], nationalities: [],
    ...(def.cast && p.sim.playing ? { playingAge: p.sim.playing } : {}),
    // Someone with no recorded birth date, treated as an adult, is given no date: every rule that asks one is told so.
    born: p.rec?.born ?? '',
    skills: [],
    samples: e ? `${e.n} recorded ${e.n === 1 ? 'credit' : 'credits'} in the film catalog.` : 'No recorded credit of this kind in the film catalog.',
    busy: p.sim.busy,
  };
}

// ---------------- Six months ----------------

/** When a person's copied record must be renewed or removed. */
export const recordEnds = (p: RealPerson): number | null => (p.rec ? Date.parse(`${p.rec.from}T00:00:00Z`) + RECORD_DAYS * DAY : null);

/** Text the game wrote that can carry a person's name: the log, each project's history, credits and shoot-day results. */
function eachGameText(state: GameState, fn: (text: string) => string): void {
  for (const e of state.log) e.text = fn(e.text);
  for (const p of state.projects) {
    for (const h of p.history) h.text = fn(h.text);
    for (const c of p.credits) c.personName = fn(c.personName);
    for (const d of p.schedule.days) if (d.result) d.result = fn(d.result);
    for (const t of p.tasks) if (t.blockedReason) t.blockedReason = fn(t.blockedReason);
  }
}

/**
 * Renew or remove the copied records that have reached six months, by the real clock. `renew` gives the installed
 * catalog's record for a person, or nothing when no catalog is installed. A removed record takes the person's name out
 * of everything the game wrote with it; what was decided (contracts, pay, work done, their made-up profile) stays, and
 * the player's own writing is never touched. Returns how many were renewed and how many removed.
 */
export function expireRecords(state: GameState, realNow: number, renew: (tmdbId: number) => { record: RecordedPerson; gathered: string } | undefined): { renewed: number; removed: number } {
  let renewed = 0;
  let removed = 0;
  for (const p of Object.values(peek(state))) {
    const ends = recordEnds(p);
    if (ends === null || realNow < ends) continue;
    const fresh = renew(tmdbIdOf(p.id));
    // A renewal is only one gathered since: an equally old copy from an expired catalog renews nothing.
    if (fresh && Date.parse(`${(fresh.record.details?.retrievedAt ?? fresh.gathered).slice(0, 10)}T00:00:00Z`) + RECORD_DAYS * DAY > realNow) {
      const old = p.rec!.name;
      considerPerson(state, fresh.record, fresh.gathered);
      if (p.rec!.name !== old) eachGameText(state, (t) => t.split(old).join(p.rec!.name));
      renewed += 1;
      continue;
    }
    const name = p.rec!.name;
    delete p.rec;
    eachGameText(state, (t) => (t.includes(name) ? t.split(name).join(WITHDRAWN) : t));
    removed += 1;
  }
  return { renewed, removed };
}

/** Put a renewed name back on a person's own credits, which carry their ID. Log lines written while it was withdrawn stay as they were written. */
export function restoreNames(state: GameState): void {
  for (const p of state.projects) for (const c of p.credits) {
    const real = isReal(c.person) ? peek(state)[c.person] : undefined;
    if (real?.rec && c.personName === WITHDRAWN) c.personName = real.rec.name;
  }
}

// ---------------- Their work in this story ----------------

export interface StoryCredit { projectId: string; title: string; as: string; status: 'offered' | 'working' | 'credited' | 'ended'; date: string | null }

/**
 * What a real person has done in this save, for the section of their page that is kept apart from their recorded
 * credits: each part or job on the player's projects, and where it stands. Derived from the projects; nothing is
 * written to the catalog, and the recorded credits above it are never changed.
 */
export function storyCredits(state: GameState, id: string): StoryCredit[] {
  const out: StoryCredit[] = [];
  for (const p of state.projects) {
    for (const h of p.hires.filter((x) => x.personId === id)) {
      const part = h.characterId ? p.characters.find((c) => c.id === h.characterId)?.name : undefined;
      const as = part ? `${part}${h.method && h.method !== 'on-camera' ? ` (${h.method.replace('-', ' ')})` : ''}` : ROLES.find((r) => r.id === h.roleId)?.label ?? h.roleId;
      // Credited when the delivered work's credits name them for it; the credits are made from the work done (finish.ts).
      const credited = !!p.delivered && p.credits.some((c) => c.person === id && (part ? c.characterName === part : c.roleId === h.roleId || !c.characterName));
      const status: StoryCredit['status'] = credited ? 'credited' : h.status === 'accepted' ? 'working' : h.status === 'offered' || h.status === 'countered' ? 'offered' : 'ended';
      out.push({ projectId: p.id, title: p.title, as, status, date: p.delivered ? dateKey(p.delivered.at, 'UTC') : null });
    }
  }
  return out;
}
