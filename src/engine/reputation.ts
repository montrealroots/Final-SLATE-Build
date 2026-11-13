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
