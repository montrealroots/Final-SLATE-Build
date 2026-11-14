// Writing jobs (writing-jobs.ts): a hired script editor asked for a polish of the approved script, accepted, revised
// or stopped. Only an accepted pass counts in the script's assessment (finish.ts), so each probe's direct measure is what
// was accepted and its later one the film's script and overall scores.
import type { Probe } from '../probe';
import { roleCandidates, makeOffer } from '../../../src/engine/hiring';
import { acceptWriting, cancelWriting, commissionWriting, requestRevision } from '../../../src/engine/writing-jobs';
import type { GameState, Project } from '../../../src/engine/types';

/** Offer the job to the first script editor the project's candidates list, at their asking rate, once the money is raised. */
const hireEditor = (s: GameState, p: Project) => {
  if (p.hires.some((h) => h.roleId === 'script-editor' && h.status !== 'declined')) return;
  const c = roleCandidates(s, p, 'script-editor')[0];
  if (c) { try { makeOffer(s, p, { personId: c.id, roleId: 'script-editor', dayRate: c.dayRate, episodes: 'all' }); } catch { /* no money yet: tomorrow */ } }
};
const editor = (p: Project) => p.hires.find((h) => h.roleId === 'script-editor' && h.status === 'accepted');

/** Each day: commission a polish once the editor has accepted, then what to do with the delivered pass. */
const writingDay = (onDelivered: 'accept' | 'revise' | 'cancel') => (s: GameState) => {
  for (const p of s.projects.filter((x) => !x.delivered && x.writing && x.approvedDraft !== null)) {
    hireEditor(s, p);
    const h = editor(p);
    if (h && !p.writing!.some((j) => j.hireId === h.id)) { try { commissionWriting(s, p, h.id, { scope: 'polish', episode: 1 }); } catch { /* not yet */ } }
    for (const j of p.writing!.filter((x) => x.hireId === h?.id)) {
      if (onDelivered === 'cancel' && j.status === 'working') cancelWriting(s, p, j.id);
      if (j.status !== 'delivered') continue;
      if (onDelivered === 'revise' && j.passes.length === 1) requestRevision(s, p, j.id, { focus: 'Dialogue' });
      else acceptWriting(s, p, j.id);
    }
  }
};

const measure = (_s: GameState, projects: Project[]) => ({
  passesAccepted: projects.reduce((a, p) => a + (p.writing ?? []).filter((j) => j.status === 'accepted').length, 0),
  passesWritten: projects.reduce((a, p) => a + (p.writing ?? []).reduce((b, j) => b + j.passes.length, 0), 0),
  passesCancelled: projects.reduce((a, p) => a + (p.writing ?? []).filter((j) => j.status === 'cancelled').length, 0),
});

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
];
