// Designs before they are built, a design changed once building began, and what the director does about the day's
// material: approve a design or ask for changes, change one and keep or redo the finished shots, and shoot a pickup for
// each problem the dailies raise rather than accept it.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { unfunded } from '../career';
import { buildProject } from '../../helpers';
import { askForDesignChanges } from '../../../src/engine/designs-actions';
import { designStatus, designsToReview, visdev } from '../../../src/engine/designs';
import { updateCharacter, approvedScenes } from '../../../src/engine/projects';
import { applyDesignChange } from '../../../src/engine/production';
import { applyFix, dailies, pickupCost } from '../../../src/engine/directing';
import { ledgerTotals } from '../../../src/engine/budget';
import { putInOwnMoney } from '../../../src/engine/personal';
import { financeSummary, setFinanceTarget } from '../../../src/engine/finance';
import { setShotPlan } from '../../../src/engine/takes-actions';

const CHARS = [{ name: 'Lead', patch: { roleSize: 'lead' as const } }, { name: 'Friend', patch: { roleSize: 'supporting' as const } }];
const SCENES = [{ place: 'Flat', chars: ['Lead', 'Friend'], minutes: 2 }, { place: 'Street', intExt: 'EXT' as const, chars: ['Lead'], minutes: 1 }, { place: 'Cafe', chars: ['Lead', 'Friend'], minutes: 2 }];
/** A five-minute 3D CG short: each character is modelled and rigged once its design is approved. */
const cg = (s: GameState, year: number): Project => unfunded(buildProject(s, { title: `Year ${year + 1}`, format: 'short', medium: 'animation', technique: '3d-cg', quality: 'tv', scenario: 'micro', genres: ['drama'], runtime: 5 }, CHARS, SCENES));
/** A ten-minute live-action short whose scenes two people talk in. */
const live = (s: GameState, year: number): Project => unfunded(buildProject(s, { title: `Year ${year + 1}`, format: 'short', medium: 'live-action', scenario: 'micro', genres: ['drama'], runtime: 10 },
  CHARS, [{ place: 'Flat', chars: ['Lead', 'Friend'], minutes: 3 }, { place: 'Street', intExt: 'EXT', chars: ['Lead'], minutes: 3 }, { place: 'Cafe', chars: ['Lead', 'Friend'], minutes: 4 }]));

/** Once per character, the first time its design waits for approval: sent back for changes. */
const askOnce = () => { const asked = new Set<string>(); return (_s: GameState, p: Project) => {
  for (const cid of designsToReview(p)) if (designStatus(p, cid) === 'awaiting' && !asked.has(`${p.id}:${cid}`)) { askForDesignChanges(p, cid); asked.add(`${p.id}:${cid}`); }
}; };
/** Once per project, after its first animated shot is finished: the lead's look changed, finished shots kept or redone. */
const changeOnce = (redo: boolean) => { const done = new WeakSet<Project>(); return (s: GameState, p: Project) => {
  if (done.has(p) || p.delivered) return;
  const shot = p.tasks.find((t) => t.kind === 'anim:animation' && t.status === 'done');
  const lead = p.characters.find((c) => c.name === 'Lead');
  const scene = shot && approvedScenes(p).find((x) => x.id === shot.sceneIds[0]);
  if (!lead || !scene?.participants.includes(lead.id)) return;
  updateCharacter(p, lead.id, { description: `${lead.description ?? ''} Older now, with grey at the temples.`.trim() });
  applyDesignChange(s, p, lead.id, redo);
  done.add(p);
}; };

/** Every scene planned with the emphasis on the performances and shot in a master only: the emphasis needs singles,
 *  so the dailies say what is missing. */
const masterOnly = (s: GameState, p: Project) => { if (!p.takesModel) return; for (const sc of approvedScenes(p)) setShotPlan(p, sc.id, { coverage: 'master', emphasis: 'performances' }, s); };
/** Each day of the shoot and after, before the lock: each scene's problems answered the day the dailies raise them,
 *  with the fix asked, once a scene (a director reads the dailies as they come; waiting for the end of a short shoot
 *  found the picture already locked). */
const answerAll = (action: 'pickup' | 'accept') => { const done = new Set<string>(); return (s: GameState) => {
  for (const p of s.projects.filter((x) => !x.delivered && !x.edit.pictureLocked)) {
    for (const d of dailies(p)) {
      if (done.has(`${p.id}:${d.sceneId}`) || !d.issues.length) continue;
      for (const issue of d.issues) {
        const fix = issue.fixes.find((f) => f.action === action);
        if (!fix) continue;
        // A pickup day isn't booked without the money for it: the player raises the financing target by what is short
        // and puts that in, as the refusal says.
        if (fix.action === 'pickup') {
          const short = pickupCost(p, d.sceneId).cost - ledgerTotals(p).available;
          if (short > 0) try { setFinanceTarget(p, financeSummary(p).target + short); putInOwnMoney(s, p, short); } catch { /* not that much */ }
        }
        try { applyFix(s, p, d.sceneId, fix); } catch { /* one pickup a scene, or still not the money */ }
      }
      done.add(`${p.id}:${d.sceneId}`);
    }
  }
}; };

const measure = (_s: GameState, projects: Project[]) => ({
  designDays: projects.reduce((a, p) => a + (visdev(p)?.units ?? 0), 0),
  redone: projects.reduce((a, p) => a + p.changeOrders.reduce((b, c) => b + c.affectedTasks.length, 0), 0),
  pickupDays: projects.reduce((a, p) => a + p.schedule.days.filter((d) => Object.keys(d.pickups ?? {}).length > 0).length, 0),
  accepted: projects.reduce((a, p) => a + p.captures.reduce((b, c) => b + (c.accepted ?? []).length, 0), 0),
});

export const PROBES: Probe[] = [
  {
    id: 'approve-design',
    features: ['action:designs-actions.approveDesign'],
    decision: 'Approve each finished design, rather than leave it waiting',
    reads: ['src/engine/designs-actions.ts#approveDesign', 'src/engine/designs.ts#designGate'],
    seeds: 20,
    base: { project: cg, approveDesigns: false },
    variant: { project: cg, approveDesigns: true },
    measure,
    bites: ['delivered'],
    downstream: ['revenue', 'money'],
  },
  {
    id: 'ask-design-changes',
    features: ['action:designs-actions.askForDesignChanges'],
    decision: 'Send each design back once for changes before approving it',
    reads: ['src/engine/designs-actions.ts#askForDesignChanges', 'src/engine/designs.ts#designGate'],
    seeds: 20,
    base: { project: cg },
    variant: { project: cg, beforeManage: askOnce() },
    measure,
    bites: ['designDays'],
    downstream: ['daysToDeliver', 'spent'],
  },
  {
    id: 'change-design',
    features: ['action:production.applyDesignChange'],
    decision: "Change the lead's look once their first shot is animated, keeping finished shots",
    reads: ['src/engine/production.ts#applyDesignChange', 'src/engine/projects.ts#updateCharacter'],
    seeds: 20,
    base: { project: cg },
    variant: { project: cg, beforeManage: changeOnce(false) },
    measure,
    bites: ['redone'],
    downstream: ['daysToDeliver', 'spent'],
  },
  {
    id: 'change-design-redo',
    features: ['action:production.applyDesignChange'],
    decision: "Change the lead's look once their first shot is animated, and redo the finished shots",
    reads: ['src/engine/production.ts#applyDesignChange'],
    seeds: 20,
    base: { project: cg, beforeManage: changeOnce(false) },
    variant: { project: cg, beforeManage: changeOnce(true) },
    measure,
    bites: ['redone'],
    downstream: ['daysToDeliver', 'spent'],
  },
  {
    id: 'fix-with-pickups',
    features: ['action:directing.applyFix'],
    decision: 'Shoot a pickup for each problem the dailies raise, rather than accept it',
    reads: ['src/engine/directing.ts#applyFix', 'src/engine/takes.ts#coverageEdit'],
    base: { project: live, decide: masterOnly, daily: answerAll('accept') },
    variant: { project: live, decide: masterOnly, daily: answerAll('pickup') },
    measure,
    bites: ['pickupDays'],
    downstream: ['spent', 'quality.editing', 'overall'],
  },
];
