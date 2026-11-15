// Studios (finance.ts pitchToStudio, first-look.ts drawDevelopment), on the labelled fixture studios the first-look
// proofs use (career-wide.ts STUDIOS), over three years. A pitch is answered after the studio's days to consider, and
// an offer taken; development money is drawn under a first-look deal signed when one is offered.
import type { Probe } from '../probe';
import type { FinanceDeal, GameState, Project } from '../../../src/engine/types';
import { DAY, processUntil } from '../../engine-api';
import { acceptDeal, financeSummary, pitchToStudio, studioOptions } from '../../../src/engine/finance';
import { activeFirstLook, developmentRefusal, drawDevelopment, fundLeft } from '../../../src/engine/first-look';
import { STUDIOS, answerFirstLooks } from './career-wide';
import { feature } from './script';

/** Before the money is raised: pitched to the studio that reads it best, the answer waited for, and an offer taken. */
const pitch = (s: GameState, p: Project) => {
  const best = studioOptions(s, p).find((o) => !o.needs);
  if (!best) return;
  let d: FinanceDeal;
  try { d = pitchToStudio(s, p, best.company); } catch { return; }
  for (let i = 0; i < 60 && d.status === 'considering'; i++) processUntil(s, s.now + DAY, 'tick', 1_000_000);
  if (d.status === 'offered') try { acceptDeal(s, p, d.id); } catch { /* its terms can't be met */ }
};
/** Before the money is raised, under a first-look deal: as much development money as the film still needs, or the deal has left. */
const develop = (s: GameState, p: Project) => {
  const fl = activeFirstLook(s);
  if (!fl) return;
  const amount = Math.min(fundLeft(fl), financeSummary(p).stillToRaise);
  if (amount > 0 && !developmentRefusal(s, p, amount)) drawDevelopment(s, p, amount);
};

const measure = (_s: GameState, projects: Project[]) => ({
  pitched: projects.reduce((a, p) => a + (p.finance?.deals ?? []).filter((d) => d.kind === 'studio').length, 0),
  studioIn: projects.reduce((a, p) => a + (p.finance?.deals ?? []).filter((d) => d.kind === 'studio' && d.status === 'accepted').reduce((b, d) => b + d.amount, 0), 0),
  developmentIn: projects.reduce((a, p) => a + (p.finance?.deals ?? []).filter((d) => d.kind === 'first-look').reduce((b, d) => b + d.amount, 0), 0),
});

const FIRST_LOOK = { years: 3, studios: STUDIOS, daily: answerFirstLooks('accept') };
export const PROBES: Probe[] = [
  {
    id: 'pitch-to-studio', features: ['action:finance.pitchToStudio'], decision: 'Pitch the feature to the studio that reads it best, and take their offer',
    reads: ['src/engine/finance.ts#pitchToStudio', 'src/engine/finance.ts#studioOption'],
    // A studio takes features, not shorts ("A short film isn't something it takes on"), so the year's film is a feature.
    base: { years: 3, studios: STUDIOS, project: feature() }, variant: { years: 3, studios: STUDIOS, project: feature(), decide: pitch }, measure,
    bites: ['pitched'], downstream: ['studioIn', 'ownIn', 'money'],
  },
  {
    id: 'draw-development', features: ['action:first-look.drawDevelopment'], decision: "Put the first-look deal's development money into the short",
    reads: ['src/engine/first-look.ts#drawDevelopment'],
    base: FIRST_LOOK, variant: { ...FIRST_LOOK, decide: develop }, measure,
    bites: ['developmentIn'], downstream: ['ownIn', 'money'],
  },
];
