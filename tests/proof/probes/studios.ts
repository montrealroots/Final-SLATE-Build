// Studios (finance.ts pitchToStudio, first-look.ts drawDevelopment), on the labelled fixture studios the first-look
// proofs use (career-wide.ts STUDIOS), over three years. A pitch is answered after the studio's days to consider, and
// an offer taken; development money is drawn under a first-look deal signed when one is offered.
import type { Probe } from '../probe';
import type { FinanceDeal, GameState, Project } from '../../../src/engine/types';
import { DAY, processUntil } from '../../engine-api';
import { acceptDeal, financeSummary, pitchToStudio, studioOptions, submitSeries } from '../../../src/engine/finance';
import { activeFirstLook, developmentRefusal, drawDevelopment, fundLeft } from '../../../src/engine/first-look';
import { STUDIOS, answerFirstLooks } from './career-wide';
import { feature } from './script';
import { SERIES } from './scheduled';

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

// A season submitted under a television first-look deal (finance.ts submitSeries). A company with series on its record
// offers a television deal once you have delivered a series (first-look.ts, TV scope); while it runs, each series goes
// to it first. The career's two-episode limited series, made three years running and paid for from your own money; a
// labelled fixture studio with a television record, whose offer of a deal is taken.
const TV_STUDIOS: typeof STUDIOS = STUDIOS.map((x) => ({ ...x, tv: { n: 12, g: [['Drama', 6], ['Crime', 6], ['Mystery', 3]] } }));
const ownSeries = (s: GameState, year: number): Project => {
  const p = SERIES.project(s, year);
  // Not commissioned here: the fixture commissioner taken off, so the season is the player's to place.
  const fixture = (p.finance?.deals ?? []).filter((d) => d.kind === 'commissioner');
  for (const d of fixture) p.funding.fund -= d.amount;
  if (p.finance) p.finance.deals = p.finance.deals.filter((d) => !fixture.includes(d));
  return p;
};
/** Before the money is raised, under a television deal: submitted to its company, the answer waited for, and an offer taken. */
const submit = (s: GameState, p: Project) => {
  let d: FinanceDeal;
  try { d = submitSeries(s, p); } catch { return; }
  for (let i = 0; i < 90 && d.status === 'considering'; i++) processUntil(s, s.now + DAY, 'tick', 1_000_000);
  if (d.status === 'offered') try { acceptDeal(s, p, d.id); } catch { /* its terms can't be met */ }
};
const TV_RUN = { years: 3, studios: TV_STUDIOS, takeDistribution: false, project: ownSeries, daily: (s: GameState) => { SERIES.daily(s); answerFirstLooks('accept')(s); } };
PROBES.push({
  id: 'submit-series', features: ['action:finance.submitSeries'], decision: 'Submit each season to the company your television first-look deal is with, and take its offer',
  reads: ['src/engine/finance.ts#submitSeries', 'src/engine/finance.ts#studioOption'],
  base: TV_RUN, variant: { ...TV_RUN, decide: submit },
  measure: (_s, projects) => ({
    submittedSeries: projects.reduce((a, p) => a + (p.finance?.deals ?? []).filter((d) => d.firstLook && d.kind === 'commissioner').length, 0),
    commissionedIn: projects.reduce((a, p) => a + (p.finance?.deals ?? []).filter((d) => d.kind === 'commissioner' && d.status === 'accepted').reduce((b, d) => b + d.amount, 0), 0),
  }),
  bites: ['submittedSeries'], downstream: ['commissionedIn', 'ownIn', 'money'],
});
