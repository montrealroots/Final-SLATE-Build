// Writing jobs (writing-jobs.ts): a hired script editor asked for a polish of the approved script, accepted, revised
// or stopped. Only an accepted pass counts in the script's assessment (finish.ts), so each probe's direct measure is what
// was accepted and its later one the film's script and overall scores.
import type { Probe } from '../probe';
import { roleCandidates, makeOffer } from '../../../src/engine/hiring';
import { acceptWriting, cancelWriting, commissionWriting, requestRevision, revisionAims, standing } from '../../../src/engine/writing-jobs';
import type { GameState, Project } from '../../../src/engine/types';

/** Offer the job to the first script editor the project's candidates list, at their asking rate, once the money is raised. */
export const hireEditor = (s: GameState, p: Project, role = 'script-editor') => {
  if (p.hires.some((h) => h.roleId === role && h.status !== 'declined')) return;
  const c = roleCandidates(s, p, role)[0];
  if (c) { try { makeOffer(s, p, { personId: c.id, roleId: role, dayRate: c.dayRate, episodes: 'all' }); } catch { /* no money yet: tomorrow */ } }
};
export const editor = (p: Project, role = 'script-editor') => p.hires.find((h) => h.roleId === role && h.status === 'accepted');

/**
 * Each day: commission a polish once the editor has accepted, then what to do with the delivered pass. A revision looks
 * at `focus`, or with 'aimed' at the first thing the episode has notes on.
 */
export const writingDay = (onDelivered: 'accept' | 'revise' | 'cancel', scope: 'polish' | 'rewrite' | 'draft' = 'polish', role = 'script-editor', focus = 'Dialogue', episode = 1) => (s: GameState) => {
  for (const p of s.projects.filter((x) => !x.delivered && x.writing && x.approvedDraft !== null)) {
    hireEditor(s, p, role);
    const h = editor(p, role);
    if (h && !p.writing!.some((j) => j.hireId === h.id)) { try { commissionWriting(s, p, h.id, { scope, episode }); } catch { /* not yet */ } }
    for (const j of p.writing!.filter((x) => x.hireId === h?.id)) {
      if (onDelivered === 'cancel' && j.status === 'working') cancelWriting(s, p, j.id);
      if (j.status !== 'delivered') continue;
      // A revision the money can't cover is not asked for: the pass is accepted as it stands.
      if (onDelivered === 'revise' && j.passes.length === 1) try { requestRevision(s, p, j.id, { focus: focus === 'aimed' ? revisionAims(p, episode)[0] ?? 'Something Else' : focus }); continue; } catch { /* accepted below */ }
      acceptWriting(s, p, j.id);
    }
  }
};

const measure = (_s: GameState, projects: Project[]) => ({
  passesAccepted: projects.reduce((a, p) => a + (p.writing ?? []).filter((j) => j.status === 'accepted').length, 0),
  passesWritten: projects.reduce((a, p) => a + (p.writing ?? []).reduce((b, j) => b + j.passes.length, 0), 0),
  passesCancelled: projects.reduce((a, p) => a + (p.writing ?? []).filter((j) => j.status === 'cancelled').length, 0),
  writingDays: projects.reduce((a, p) => a + (p.writing ?? []).reduce((b, j) => b + j.passes.reduce((c, x) => c + x.days, 0), 0), 0),
  passRead: projects.reduce((a, p) => a + (p.writing ?? []).filter((j) => j.status === 'accepted').reduce((b, j) => b + (standing(j)?.read ?? 0), 0), 0),
});
/** Once the script is approved: a note of yours that the middle drags, on its first scene, so a revision has something to look at. */
const dragNote = (s: GameState) => { for (const p of s.projects.filter((x) => !x.delivered && x.approvedDraft !== null && !x.notes.some((n) => n.id === 'n-drag'))) p.notes.push({ id: 'n-drag', text: 'The middle drags.', area: 'pacing', sceneId: p.scenes[0]?.id ?? null, status: 'open', source: 'player' }); };

export const PROBES: Probe[] = [
  {
    id: 'writing-polish',
    features: ['action:writing-jobs.commissionWriting', 'action:writing-jobs.acceptWriting'],
    decision: 'Hire a script editor and ask for a polish of the approved script, accepted when delivered; or write it all yourself',
    reads: ['src/engine/writing-jobs.ts#commissionWriting', 'src/engine/writing-jobs.ts#acceptWriting', 'src/engine/writing-jobs.ts#acceptedRead'],
    variant: { daily: writingDay('accept') },
    measure,
    bites: ['passesAccepted'],
    downstream: ['quality.script', 'overall', 'spent'],
  },
  {
    id: 'writing-revision',
    features: ['action:writing-jobs.requestRevision'],
    decision: 'Ask the script editor for one revision of the polish before accepting it',
    reads: ['src/engine/writing-jobs.ts#requestRevision'],
    // A revision narrows how far the pass stands from the writer's level and costs their days; at 40 seeds the cost was
    // just inside the noise (until November 14, 2026), and at 80 with the realistic prices (November 15, 2026).
    seeds: 240,
    base: { daily: writingDay('accept') },
    variant: { daily: writingDay('revise') },
    measure,
    bites: ['passesWritten'],
    downstream: ['quality.script', 'overall', 'spent'],
  },
  {
    id: 'writing-cancel',
    features: ['action:writing-jobs.cancelWriting'],
    decision: 'Stop the script editor\'s polish while it is being written',
    reads: ['src/engine/writing-jobs.ts#cancelWriting'],
    base: { daily: writingDay('accept') },
    variant: { daily: writingDay('cancel') },
    measure,
    bites: ['passesAccepted', 'passesCancelled'],
    downstream: ['quality.script', 'overall', 'spent'],
  },
  // A rewrite takes the writer more days than a polish (writing-jobs.ts writingTerms), and three fifths of the script is
  // read as theirs rather than three tenths (writing-jobs.ts acceptedRead). A script editor only
  // polishes (writing-jobs.ts SCOPES_FOR); a co-writer is hired in both arms.
  {
    id: 'writing-rewrite', features: ['field:WritingWork.tsx#{`Ask ${name} For`}#1'],
    decision: 'Ask a co-writer for a rewrite of the approved script rather than a polish',
    reads: ['src/engine/writing-jobs.ts#writingTerms', 'src/engine/writing-jobs.ts#acceptedRead'],
    base: { daily: writingDay('accept', 'polish', 'co-writer') }, variant: { daily: writingDay('accept', 'rewrite', 'co-writer') }, measure,
    bites: ['writingDays'], downstream: ['quality.script', 'standing.writing', 'overall'],
  },
  // A revision aimed at something the episode has notes on reads better (writing-jobs.ts revisionAims). Both arms carry the
  // same note that the middle drags and ask the co-writer for one revision of a rewrite: at it, or at something else.
  {
    id: 'revision-focus', features: ["field:WritingWork.tsx#{`What ${name}'s Revision Should Look At`}#1"],
    decision: 'Ask for the revision to look at what the script has notes on, rather than something else',
    reads: ['src/engine/writing-jobs.ts#revisionAims', 'src/engine/finish.ts#assessQuality'],
    base: { daily: (s) => { dragNote(s); writingDay('revise', 'rewrite', 'co-writer', 'Something Else')(s); } },
    variant: { daily: (s) => { dragNote(s); writingDay('revise', 'rewrite', 'co-writer', 'aimed')(s); } },
    measure, bites: ['passRead'], downstream: ['quality.script', 'overall'],
  },
];
