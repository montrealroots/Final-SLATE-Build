// Revision notes (projects.ts): a readiness check made a note, accepted, worked on in a revision pass, and the script
// fixed. Only a note the readiness checks raised counts in the script's assessment, once a pass has addressed it and the
// check is gone from the script (finish.ts): so both careers fix the script the same way, and only one takes the notes
// through a revision pass.
import type { Probe } from '../probe';
import { short } from './script';
import { DAY, processUntil } from '../../engine-api';
import { addNote, noteFromIssue, scriptIssues, setNoteStatus, startRevision } from '../../../src/engine/projects';
import type { GameState, Project } from '../../../src/engine/types';

const LABELS = ['The Letter', 'The Key', 'The Photograph'];
/** The short, with three setups planted in its first scene and paid nowhere: three readiness notes. */
const withSetups = (s: GameState, year: number): Project => {
  const p = short()(s, year);
  for (const label of LABELS) p.setups.push({ id: `sp-${label}`, kind: 'setup', label, plantedIn: p.scenes[0].id, paidIn: null });
  return p;
};
/** Each setup paid off in the last scene: the fix. */
const payOff = (p: Project) => { for (const sp of p.setups.filter((x) => LABELS.includes(x.label))) sp.paidIn = p.scenes[p.scenes.length - 1].id; };
/** The script fixed with each check taken through a revision pass first: a note from it, accepted, and the pass worked. */
const throughNotes = (extra: 'none' | 'own' | 'mine') => (s: GameState, year: number): Project => {
  const p = withSetups(s, year);
  if (extra !== 'mine') for (const i of scriptIssues(p).filter((x) => x.severity === 'note' && !x.advisory && /never pays off/.test(x.text))) setNoteStatus(p, noteFromIssue(s, p, i.text).id, 'accepted');
  if (extra === 'own') for (const t of ['Tighten the opening.', 'More warmth between them.']) setNoteStatus(p, addNote(s, p, t, 'dialogue', null).id, 'accepted');
  if (extra === 'mine') for (const i of scriptIssues(p).filter((x) => x.severity === 'note' && !x.advisory && /never pays off/.test(x.text))) setNoteStatus(p, addNote(s, p, `Pay this off: ${i.text}`, 'continuity', null).id, 'accepted');
  startRevision(s, p);
  processUntil(s, p.revision!.endsAt + DAY, 'tick', 1_000_000);
  payOff(p);
  return p;
};
const fixed = (s: GameState, year: number): Project => { const p = withSetups(s, year); payOff(p); return p; };

const measure = (_s: GameState, projects: Project[]) => ({
  notesAddressed: projects.reduce((a, p) => a + p.notes.filter((n) => n.status === 'addressed' && n.source === 'readiness').length, 0),
  ownNotes: projects.reduce((a, p) => a + p.notes.filter((n) => n.source === 'player').length, 0),
  revisionPasses: projects.reduce((a, p) => a + p.revisionPasses, 0),
});

export const PROBES: Probe[] = [
  {
    id: 'revision-notes',
    features: ['action:projects.noteFromIssue', 'action:projects.setNoteStatus', 'action:projects.startRevision', 'scheduled:revision-done'],
    decision: 'Take the script\'s readiness checks through a revision pass before fixing them, or just fix them',
    reads: ['src/engine/projects.ts#noteFromIssue', 'src/engine/projects.ts#startRevision', 'src/engine/finish.ts#assessQuality'],
    base: { project: fixed },
    variant: { project: throughNotes('none') },
    measure,
    bites: ['notesAddressed'],
    downstream: ['quality.script', 'overall', 'reception'],
  },
  {
    id: 'own-notes',
    features: ['action:projects.addNote', 'field:ScriptViews.tsx#"Note"#1', 'field:ScriptViews.tsx#"Area"#1', 'field:ScriptViews.tsx#"About"#1'],
    // The owner's choice of November 14, 2026: a note of your own on a problem the checks flag counts as the check's own
    // note does, once a revision addresses it and the problem is fixed (projects.ts addNote, finish.ts). Until then your
    // notes counted for nothing, and this probe added two on nothing.
    decision: 'Write your own notes on the script\'s unpaid setups and revise before fixing them, or just fix them',
    reads: ['src/engine/projects.ts#addNote', 'src/engine/finish.ts#assessQuality'],
    base: { project: fixed },
    variant: { project: throughNotes('mine') },
    measure,
    bites: ['ownNotes'],
    downstream: ['quality.script', 'overall', 'reception'],
  },
];
