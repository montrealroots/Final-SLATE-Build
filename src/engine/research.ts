// Research notes for a fiction script (SLATE-04-04.02, November 8, 2026): a question, the reference it rests on, the scenes
// it informs, and whether it has been reviewed or remains uncertain. A record for the writer: nothing is verified by the
// game, nothing scores, and an uncertain note stays uncertain until the player says otherwise. Documentary claims keep
// their own fact-checking (Evidence), which does gate delivery.
import { newId } from './state';
import { assertEditable, sceneLabel } from './projects';
import type { GameState, Project, ResearchNote } from './types';

export function addResearch(state: GameState, p: Project, question: string): ResearchNote {
  assertEditable(p);
  const q = question.trim();
  if (!q) throw new Error('Write the question first.');
  const n: ResearchNote = { id: newId(state, 'rn'), question: q.slice(0, 200), reference: '', status: 'open', sceneIds: [] };
  (p.research ??= []).push(n);
  return n;
}

export function updateResearch(p: Project, id: string, patch: Partial<Omit<ResearchNote, 'id'>>): ResearchNote {
  assertEditable(p);
  const n = p.research?.find((x) => x.id === id);
  if (!n) throw new Error('That note no longer exists.');
  if (patch.question !== undefined && !patch.question.trim()) throw new Error('Write the question first.');
  if (patch.status === 'reviewed' && !(patch.reference ?? n.reference).trim()) throw new Error('Note the reference you checked before marking it reviewed.');
  Object.assign(n, patch);
  n.sceneIds = n.sceneIds.filter((sid) => p.scenes.some((s) => s.id === sid));
  return n;
}

export function removeResearch(p: Project, id: string): void {
  assertEditable(p);
  p.research = (p.research ?? []).filter((x) => x.id !== id);
}

/** Open or uncertain questions behind scenes still in the script: advice for the writer, by scene. */
export function researchNotes(p: Project): { text: string; sceneId: string }[] {
  const out: { text: string; sceneId: string }[] = [];
  for (const n of p.research ?? []) {
    if (n.status === 'reviewed') continue;
    for (const sid of n.sceneIds) {
      const s = p.scenes.find((x) => x.id === sid);
      if (s) out.push({ text: `${sceneLabel(p, s)} rests on a question still ${n.status === 'uncertain' ? 'uncertain' : 'open'}: ${n.question}`, sceneId: sid });
    }
  }
  return out;
}
