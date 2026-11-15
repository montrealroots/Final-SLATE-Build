// Real people graded by how the industry has judged them (recognition.ts): hiring the most recognised director of
// photography, makeup artist and costume designer who can be approached, rather than the game's own.
import { readFileSync } from 'node:fs';
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { makeOffer } from '../../../src/engine/hiring';
import { personById } from '../../../src/engine/people';
import { realId } from '../../../src/engine/guests';
import { applyRecognition, recognisedIn } from '../../../src/engine/recognition';
import { considerRecognised } from '../../../src/engine/recognition-hire';
import { dateKey } from '../../../src/engine/time';
import { fund } from './casting';

// The record the hiring lists fetch in the game, read from the file here.
applyRecognition(JSON.parse(readFileSync('src/data/recognition.json', 'utf8')));
const JOBS = ['dop', 'hair-makeup', 'costume-designer'];

/** Funded first (offers hold money), then for each job the most recognised person who can be approached is considered and offered their rate. */
const hireRecognised = (s: GameState, p: Project) => {
  fund(s, p);
  const today = dateKey(s.now, 'UTC');
  for (const job of JOBS) {
    for (const { tmdbId } of recognisedIn(job, Number(today.slice(0, 4)))) {
      try {
        considerRecognised(s, p, tmdbId, { roleId: job }, today);
        makeOffer(s, p, { personId: realId(tmdbId), roleId: job, dayRate: personById(s, realId(tmdbId), job).dayRate });
        break;
      } catch { /* recorded as having died, no recorded age, or an offer refused: the next */ }
    }
  }
};

const measure = (_s: GameState, projects: Project[]) => ({
  recognisedHired: projects.reduce((a, p) => a + p.hires.filter((h) => JOBS.includes(h.roleId) && /^tp_/.test(h.personId) && (h.status === 'accepted' || h.status === 'released')).length, 0),
});

export const PROBES: Probe[] = [
  {
    id: 'hire-recognised',
    features: ['action:recognition-hire.considerRecognised'],
    decision: 'Hire the most recognised cinematographer, makeup artist and costume designer who can be approached',
    reads: ['src/engine/recognition-hire.ts#considerRecognised', 'src/engine/recognition.ts#standingOf', 'src/engine/guests.ts#considerPerson'],
    base: { decide: fund },
    variant: { decide: hireRecognised },
    measure,
    bites: ['recognisedHired'],
    downstream: ['spent', 'quality.craft', 'overall'],
  },
];
