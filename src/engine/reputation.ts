// Reputation by role (the v4 package, 04: "Reputation tracks craft by role, reliability, budget/delivery, audience,
// commercial results and relationships"; ledger V4-031.01). Built November 13, 2026. Until then the industry read one
// record for everything (delivered projects, best reception, prizes): a writer was offered directing on the strength
// of a well-received script.
//
// Nothing here is stored. Each facet is read from what happened: craft from the assessments of the delivered work the
// player did in that role (the script assessment where they wrote it, the direction where they directed it, their
// performance where they acted), reliability from outside jobs (jobs.ts), budget and delivery from what delivered
// projects spent against their budgets and how many were shelved, audience from reception, commercial results from
// what distributors paid against what was spent, relationships from the history people keep with you. What reads it:
// an offer of outside work leans to the role the record is strongest in, and its day rate follows that role's craft.
import design from '../data/reputation-design.json';
import { ledgerTotals } from './budget';
import { reliability, type JobRole } from './jobs';
import type { GameState, Project } from './types';

export interface CraftRecord { craft: number | null; works: { title: string; score: number }[] }
export interface Reputation {
  roles: Record<JobRole, CraftRecord>;
  reliability: number;
  budget: { delivered: number; onBudget: number; shelved: number };
  audience: number | null;
  commercial: { spent: number; earned: number } | null;
  relationships: { completed: number; letGo: number; declined: number };
}

const avg = (xs: number[]): number | null => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
const delivered = (s: GameState): Project[] => s.projects.filter((p) => p.delivered && p.quality);

/** Their craft in a role, from the assessments of delivered work they did in it. */
export function roleCraft(s: GameState, role: JobRole): CraftRecord {
  const works: CraftRecord['works'] = [];
  for (const p of delivered(s)) {
    const q = p.quality!;
    if (role === 'writing' && p.episodes.some((e) => e.writer === 'player')) works.push({ title: p.title, score: q.script });
    if (role === 'directing' && p.episodes.some((e) => e.director === 'player')) works.push({ title: p.title, score: q.direction });
    if (role === 'acting') {
      const mine = Object.entries(q).filter(([k]) => k.startsWith('performance:') && k.endsWith(':player')).map(([, v]) => v);
      if (mine.length) works.push({ title: p.title, score: avg(mine)! });
    }
  }
  return { craft: avg(works.map((w) => w.score)), works };
}

export function reputation(s: GameState): Reputation {
  const done = delivered(s);
  const spentOn = (p: Project) => ledgerTotals(p).settled;
  const budgetOf = (p: Project) => p.finance?.estimate || ledgerTotals(p).fund;
  const paid = done.flatMap((p) => p.offers.filter((o) => o.status === 'accepted').map((o) => o.minimumGuarantee + (o.reported?.overagePaid ?? 0)));
  const hist = Object.values(s.people).flatMap((x) => x.history ?? []);
  return {
    roles: { acting: roleCraft(s, 'acting'), writing: roleCraft(s, 'writing'), directing: roleCraft(s, 'directing') },
    reliability: reliability(s),
    budget: { delivered: done.length, onBudget: done.filter((p) => spentOn(p) <= budgetOf(p)).length, shelved: s.projects.filter((p) => p.shelved).length },
    audience: avg(done.map((p) => p.quality!.reception)),
    commercial: done.length ? { spent: done.reduce((a, p) => a + spentOn(p), 0), earned: paid.reduce((a, b) => a + b, 0) } : null,
    relationships: { completed: hist.filter((h) => h.kind === 'completed').length, letGo: hist.filter((h) => h.kind === 'let-go').length, declined: hist.filter((h) => h.kind === 'counter-declined').length },
  };
}

/** Game calibration: how much a role's craft moves offers in it. 60 is a solid record; each 10 above it weighs more. */
export const CRAFT_WEIGHT_PER_10 = 0.5;
export const CRAFT_RATE_PER_POINT = 0.01;
export const CRAFT_RATE_BOUNDS: [number, number] = [0.8, 1.3];

/** How strongly offers lean to a role: 1 with no record in it, more for strong work, less for weak. */
export const roleWeight = (r: CraftRecord): number => (r.craft === null ? 1 : Math.max(0.25, 1 + (CRAFT_WEIGHT_PER_10 * (r.craft - 60)) / 10));

/** What a role's craft does to its day rate: nothing with no record; more for strong work, less for weak, within bounds. */
export const craftRate = (r: CraftRecord): number => (r.craft === null ? 1 : Math.min(CRAFT_RATE_BOUNDS[1], Math.max(CRAFT_RATE_BOUNDS[0], 1 + CRAFT_RATE_PER_POINT * (r.craft - 60))));

// ---- Standing and grade by role (the owner's v7 package, 04 and reputation-design.json; from November 13, 2026). Its
// calibration is the package's own, versioned, and original game design, not an industry formula. Each completed work in
// a role is one event, counted once (it is read from the projects, never stored, so a reload can't count it twice), its
// contribution bounded to [-1, 1]: a craft score of 50 is neutral. The standing leans to the midpoint by a prior worth
// four works, so one result can't swing it far; a grade also needs enough completed works. A role's standing comes only
// from work in that role: directing well raises no acting standing. It is not talent, and no quality multiplier reads it.

export type StandingRole = 'writing' | 'directing' | 'acting' | 'producing';
export const REPUTATION_MODEL = design as unknown as { model_version: string; event_contribution_bounds: [number, number]; prior_weight: number; score_midpoint: number; score_scale: number; grades: [number, string][]; requires_minimum_completed_works: Record<string, number> };
export interface Standing { role: StandingRole; works: number; standing: number; grade: string; next: string | null }

/** One work's contribution from its score in the role: (score - midpoint) / scale, bounded. */
export const contribution = (score: number): number => {
  const [lo, hi] = REPUTATION_MODEL.event_contribution_bounds;
  return Math.min(hi, Math.max(lo, (score - REPUTATION_MODEL.score_midpoint) / REPUTATION_MODEL.score_scale));
};

/** A standing from a role's completed works' scores, and the grade it supports. Pure. */
export function standingFrom(role: StandingRole, scores: number[]): Standing {
  const m = REPUTATION_MODEL;
  const standing = Math.round(m.score_midpoint + (m.score_scale * scores.reduce((a, x) => a + contribution(x), 0)) / (m.prior_weight + scores.length));
  const ok = ([at, name]: [number, string]) => standing >= at && scores.length >= (m.requires_minimum_completed_works[name] ?? 0);
  const grade = [...m.grades].reverse().find(ok)?.[1] ?? m.grades[0][1];
  const higher = m.grades.find(([at, name]) => at > (m.grades.find((g) => g[1] === grade)![0]) && !ok([at, name]));
  const need = higher ? m.requires_minimum_completed_works[higher[1]] ?? 0 : 0;
  const next = !higher ? null : scores.length < need ? `${higher[1]} needs ${need} completed works in this role; you have ${scores.length}.` : `${higher[1]} needs a standing of ${higher[0]}; yours is ${standing}.`;
  return { role, works: scores.length, standing, grade, next };
}

/** The player's standing in each role, from the delivered work they did in it. Producing reads how the work was received. */
export function standings(s: GameState): Standing[] {
  return [
    ...(['writing', 'directing', 'acting'] as const).map((r) => standingFrom(r, roleCraft(s, r).works.map((w) => w.score))),
    standingFrom('producing', delivered(s).map((p) => p.quality!.reception)),
  ];
}
