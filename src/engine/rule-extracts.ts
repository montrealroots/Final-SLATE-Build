// Partial eligibility rules read from organizers' documents (the owner's v7 package, decision 10; AW03-AW06, FEST02-FEST03).
// Every extract is incomplete, so a check against one has two answers only: it fails a rule the extract states, or it
// can't be confirmed. A missing fact is not a pass, and nothing here ever says an entry is eligible (the package's
// "Keep incomplete eligibility rules tri-state; no missing rule may become automatic approval"). The third state,
// eligible, belongs to the edition's complete rules, where the game has them (rulebooks.ts).
import extracts from '../data/eligibility-extracts.json';

export interface RuleExtract {
  id: string; institution: string; year: number; complete: false; additional_checks: string;
  eligibility_start?: string; eligibility_end?: string;
  runtime_minutes_exclusive_min?: number; runtime_minutes_inclusive_max?: number; runtime_includes_credits?: boolean;
  animation_fraction_excluding_credits_min?: number; qualifying_run_days_min?: number;
  initial_release?: string; production?: string;
  source: { url: string; title: string; checked: string };
}
export const RULE_EXTRACTS = (extracts as unknown as { extracts: RuleExtract[] }).extracts;

/** What is known of a work for these checks; null where it isn't. */
export interface WorkFacts { runtimeMinutes: number | null; animationShare: number | null; firstRelease: string | null }
export interface ExtractCheck { extract: RuleExtract; verdict: 'ineligible' | 'unknown'; reasons: string[] }

export function checkExtract(x: RuleExtract, f: WorkFacts): ExtractCheck {
  const fails: string[] = [];
  const open: string[] = [];
  if (x.runtime_minutes_exclusive_min != null) {
    if (f.runtimeMinutes == null) open.push('Its running time isn\'t known yet.');
    else if (f.runtimeMinutes <= x.runtime_minutes_exclusive_min) fails.push(`It runs ${f.runtimeMinutes} minutes; this needs more than ${x.runtime_minutes_exclusive_min}.`);
  }
  if (x.runtime_minutes_inclusive_max != null) {
    if (f.runtimeMinutes == null) open.push('Its running time isn\'t known yet.');
    else if (f.runtimeMinutes > x.runtime_minutes_inclusive_max) fails.push(`It runs ${f.runtimeMinutes} minutes; this takes ${x.runtime_minutes_inclusive_max} or fewer${x.runtime_includes_credits ? ', credits included' : ''}.`);
  }
  if (x.animation_fraction_excluding_credits_min != null) {
    if (f.animationShare == null) open.push('How much of it is animated isn\'t known.');
    else if (f.animationShare < x.animation_fraction_excluding_credits_min) fails.push(`${Math.round(f.animationShare * 100)}% of it is animated; this needs ${Math.round(x.animation_fraction_excluding_credits_min * 100)}%, credits left out.`);
  }
  if (x.eligibility_start && x.eligibility_end) {
    if (!f.firstRelease) open.push('It hasn\'t been released yet.');
    else if (f.firstRelease < x.eligibility_start || f.firstRelease > x.eligibility_end) fails.push(`It was first released ${f.firstRelease}, outside ${x.eligibility_start} to ${x.eligibility_end}.`);
  }
  // Whatever it passes, the rest of the edition's rules weren't read: never a pass.
  return fails.length ? { extract: x, verdict: 'ineligible', reasons: fails } : { extract: x, verdict: 'unknown', reasons: [...new Set(open), `Not confirmed: ${x.additional_checks.replace(/\.$/, '')} weren't read.`] };
}

/** The extracts for one edition. */
export const extractsFor = (institution: string, year: number) => RULE_EXTRACTS.filter((x) => x.institution === institution && x.year === year);
