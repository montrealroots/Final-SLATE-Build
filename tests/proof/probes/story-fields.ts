// The Story panel's fields, each part of a document a backer reads (script-effects.ts DOCUMENTS): the premise is in the
// pitch an investor reads, as the logline is (script.ts logline-missing); the central conflict, point of view and
// intended ending are the treatment, and the theme and stakes the statement of intent, which a grant panel reads with
// the pitch; the central question is a documentary's statement. A document missing a field can't be sent, so the
// approach isn't made. Each probe leaves one field unwritten.
import type { Probe } from '../probe';
import type { FinanceDeal, GameState, Project } from '../../../src/engine/types';
import { DAY, processUntil } from '../../engine-api';
import { acceptDeal, approachBacker, backerOptions } from '../../../src/engine/finance';
import { short } from './script';
import { askAll, checkClaims, doc } from './documentary';

const F = (label: string) => `field:ScriptViews.tsx#"${label}"#1`;
/** Before the money is raised: a grant applied for when its panel will read the project, its answer waited for and an offer taken. */
const applyForGrant = (s: GameState, p: Project) => {
  if (!backerOptions(s, p).find((o) => o.kind === 'grant')?.ready) return;
  let d: FinanceDeal;
  try { d = approachBacker(s, p, 'grant'); } catch { return; }
  for (let i = 0; i < 90 && d.status === 'considering'; i++) processUntil(s, s.now + DAY, 'tick', 1_000_000);
  if (d.status === 'offered') try { acceptDeal(s, p, d.id); } catch { /* lapsed */ }
};
const grants = (_s: GameState, projects: Project[]) => ({
  grantsAsked: projects.reduce((a, p) => a + (p.finance?.deals ?? []).filter((d) => d.kind === 'grant').length, 0),
  grantIn: projects.reduce((a, p) => a + (p.finance?.deals ?? []).filter((d) => d.kind === 'grant' && d.status === 'accepted').reduce((b, d) => b + d.amount, 0), 0),
});
/** The short with one story field left unwritten, applying for a grant. */
const without = (key: string, label: string, id: string): Probe => ({
  id, features: [F(label)], decision: `Leave the ${label.toLowerCase()} unwritten when applying for a grant`, reads: ['src/engine/script-effects.ts#missingFields', 'src/engine/finance.ts#backerOptions'],
  base: { decide: applyForGrant }, variant: { project: short({ story: { [key]: '' } }), decide: applyForGrant }, measure: grants,
  bites: ['grantsAsked'], downstream: ['grantIn', 'ownIn'],
});
/** A documentary, its contributors asked and claims checked, with its central question written or not. */
const docWithout = (s: GameState, year: number): Project => { const p = doc(s, year); p.story.question = ''; return p; };
const DOC = { decide: (s: GameState, p: Project) => { askAll(s, p); applyForGrant(s, p); }, beforeManage: checkClaims };

export const PROBES: Probe[] = [
  { id: 'premise-missing', features: [F('Premise')], decision: 'Leave the premise unwritten (investors read the pitch)', reads: ['src/engine/script-effects.ts#missingFields'],
    base: { ownShare: 0 }, variant: { ownShare: 0, project: short({ story: { premise: '' } }) }, bites: ['backerDeals'], downstream: ['ownIn', 'money'] },
  without('conflict', 'Central Conflict', 'conflict-missing'),
  without('viewpoint', 'Point Of View', 'viewpoint-missing'),
  without('ending', 'Intended Ending', 'ending-missing'),
  without('theme', 'Theme', 'theme-missing'),
  without('stakes', 'Stakes', 'stakes-missing'),
  { id: 'question-missing', features: [F('Central Question')], decision: 'Leave the documentary\'s central question unwritten when applying for a grant', reads: ['src/engine/script-effects.ts#missingFields'],
    seeds: 20, base: { project: doc, ...DOC }, variant: { project: docWithout, ...DOC }, measure: grants, bites: ['grantsAsked'], downstream: ['grantIn', 'ownIn'] },
];
