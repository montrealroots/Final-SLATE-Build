// Can the project go ahead, and if not, what holds it (the owner's v6 package, 03 §6 "Packaging and feasibility";
// V6-023; from November 14, 2026). Script, cast, crew, designs, money and the delivery date the backers hold it to, each
// checked against the project as it stands; the first that fails is the bottleneck, named with the ways round it and
// what each costs. Nothing here is a progress bar: a project with every box ticked but no money is not going ahead.
// Derived, never stored.
import { approvedCharacters, approvedScenes } from './projects';
import { deals, financeSummary } from './finance';
import { neededRoles } from './hiring';
import { covers, roleLabel } from './people';
import { designsToReview } from './designs';
import { projectedCost } from './estimate';
import { money } from './budget';
import { forecastFinish } from './production/forecast';
import { dateKey, formatDateKey } from './time';
import { getPlace } from '../data/places';
import type { GameState, Project } from './types';

export interface FeasibilityCheck {
  /** What is checked, in the player's words. */
  label: string;
  ok: boolean;
  /** What stands, in a sentence. */
  detail: string;
  /** The ways round it, and what each costs. Empty when it passes. */
  options: string[];
}
export interface Feasibility { ready: boolean; bottleneck: FeasibilityCheck | null; checks: FeasibilityCheck[] }

export function feasibility(state: GameState, p: Project): Feasibility {
  const checks: FeasibilityCheck[] = [];
  const add = (c: FeasibilityCheck) => checks.push(c);

  // 1. A script to make.
  const approved = p.approvedDraft !== null && p.approvedDraft !== undefined;
  add({ label: 'Script', ok: approved, detail: approved ? 'A draft is approved.' : 'No draft is approved yet, so nothing can be broken down, cast or scheduled.',
    options: approved ? [] : ['Approve a draft on the Script page.'] });

  // 2. Cast: every part with scenes, the leads first.
  const parts = approvedCharacters(p).filter((c) => c.roleSize !== 'background' && approvedScenes(p).some((s) => s.participants.includes(c.id)));
  const uncast = parts.filter((c) => !p.cast.some((a) => a.characterId === c.id)).sort((a, b) => Number(b.roleSize === 'lead') - Number(a.roleSize === 'lead'));
  add({ label: 'Cast', ok: !uncast.length,
    detail: uncast.length ? `${uncast.length === 1 ? 'One part is' : `${uncast.length} parts are`} not cast: ${uncast.slice(0, 3).map((c) => `${c.name}${c.roleSize === 'lead' ? ' (a lead)' : ''}`).join(', ')}${uncast.length > 3 ? ', and more' : ''}.` : `All ${parts.length} ${parts.length === 1 ? 'part is' : 'parts are'} cast.`,
    options: uncast.length ? [`Cast ${uncast[0].name} on the Cast page: an offer takes days to be answered, and a performer with a record asks more.`, 'Play the part yourself, which costs no fee but takes your days.', 'Cut the part from the script, which needs a new approved draft.'] : [] });

  // 3. Crew: every role the plan needs, filled.
  const missing = neededRoles(p, state).filter((r) => r.required && !p.hires.some((h) => h.status === 'accepted' && covers(h.roleId, r.roleId)));
  add({ label: 'Crew', ok: !missing.length,
    detail: missing.length ? `${missing.length === 1 ? 'One role is' : `${missing.length} roles are`} not filled: ${missing.slice(0, 3).map((r) => roleLabel(r.roleId)).join(', ')}${missing.length > 3 ? ', and more' : ''}.` : 'Every role the plan needs is filled.',
    options: missing.length ? [`Hire a ${roleLabel(missing[0].roleId).toLowerCase()} on the Crew page, or let Guide Me staff the department within a ceiling.`, 'Work that needs the role waits until someone covers it; nothing else stops.'] : [] });

  // 4. Designs: nothing is built until its design is approved (animation assets, sets, costumes).
  const designs = designsToReview(p);
  add({ label: 'Designs', ok: !designs.length,
    detail: designs.length ? `${designs.length === 1 ? 'One design waits' : `${designs.length} designs wait`} for your approval: ${designs.slice(0, 3).join(', ')}.` : 'No design is waiting for you.',
    options: designs.length ? ['Approve them on the Production page; asking for changes adds a day of design work that every build waits for.'] : [] });

  // 5. Money: what the plan is projected to cost against what is promised.
  const cost = projectedCost(state, p).total;
  const { promised } = financeSummary(p);
  const short = Math.max(0, Math.round(cost - promised));
  add({ label: 'Money', ok: short === 0,
    detail: short ? `The plan is projected to cost about ${money(cost)}; ${money(promised)} is promised, ${money(short)} short.` : `The plan is projected to cost about ${money(cost)}, and ${money(promised)} is promised.`,
    options: short ? ['Raise the rest on the Budget page: each backer has terms and days to answer.', 'Put in money of your own, which you get back only from what the project earns.', 'Cut scope: fewer days, a smaller crew or simpler scenes lower the estimate.'] : [] });

  // 6. Delivery: a backer's date the work would run past, once there is a plan to forecast.
  if (p.schedule.startDate && p.tasks.length) {
    const zone = getPlace(p.axes.basePlaceId).zone;
    const fc = forecastFinish(p, dateKey(state.now, zone));
    const late = fc ? deals(p).filter((d) => (d.status === 'accepted' || d.status === 'breached') && d.terms.deliverBy && dateKey(d.terms.deliverBy, zone) < fc.finish) : [];
    add({ label: 'Delivery Date', ok: !late.length,
      detail: late.length ? `The work would finish around ${formatDateKey(fc!.finish)}, after ${formatDateKey(dateKey(late[0].terms.deliverBy!, zone))}, when ${late[0].backer} expects delivery.` : fc ? `The work would finish around ${formatDateKey(fc.finish)}, before any backer's date.` : 'Nothing is left to do.',
      options: late.length ? ['Hire more people for the work the finish waits on, shown on the Production page.', 'Cut scope so there is less to do.', `Deliver late: what ${late[0].backer} paid in, ${money(late[0].received)} so far, must then be repaid.`] : [] });
  }

  const bottleneck = checks.find((c) => !c.ok) ?? null;
  return { ready: !bottleneck, bottleneck, checks };
}
