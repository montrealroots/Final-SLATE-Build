// Festival screenings (awards-actions.ts, awards-results.ts): accepting the invitation to a screening of your film, and
// being there. A screening you attend brings buyers' offers (`distribution-offer`); getting there takes your papers,
// so the visitor visa a festival abroad asks for is proved here too. Every film is entered as the awards probes enter it.
import type { Probe } from '../probe';
import { enterEverything } from './awards';
import { institution } from '../../../src/engine/awards';
import { rsvpScreening } from '../../../src/engine/awards-actions';
import { applyForVisa, entryRefusal, visaCheck } from '../../../src/engine/papers';
import { travelRefusal, travelTo } from '../../../src/engine/state';
import { acceptDistribution } from '../../../src/engine/finish';
import { getPlace } from '../../../src/data/places';
import type { GameState } from '../../../src/engine/types';

const HOUR = 3_600_000;
/**
 * Each day: enter everything; answer each pending screening invitation (accept, or leave it); set off for an accepted
 * screening two days ahead, with a visitor visa first where one is needed (if `visas`); go home once it's done; and, as
 * a player does, take the best buyer's offer that comes in later (the career decides its release weeks after delivery,
 * before any festival: an offer a screening brings would otherwise wait unanswered).
 */
const festivalDay = (accept: boolean, visas: boolean) => (s: GameState) => {
  enterEverything(s);
  for (const ed of s.editions) for (const sc of ed.screenings ?? []) {
    if (!s.projects.some((p) => p.id === sc.projectId)) continue;
    const place = institution(ed.institutionId).placeId;
    if (accept && sc.rsvp === 'pending' && !sc.done) { try { rsvpScreening(s, ed.id, sc.projectId, sc.at, true); } catch { /* can't get there in time */ } }
    if (sc.rsvp !== 'accepted' || sc.done) continue;
    const country = getPlace(place).country;
    if (visas && entryRefusal(s, country) && visaCheck(s, country).ok && !(s.paperApplications ?? []).some((a) => a.country === country && a.stage === 'applied')) applyForVisa(s, country);
    if (s.locationId !== place && sc.at - s.now < 48 * HOUR && !travelRefusal(s, place)) travelTo(s, place);
  }
  for (const p of s.projects.filter((x) => x.delivered)) {
    for (const o of p.offers.filter((x) => x.status === 'open').sort((a, b) => b.minimumGuarantee - a.minimumGuarantee)) { try { acceptDistribution(s, p, o.id); break; } catch { /* its terms can't be met now: the next */ } }
  }
  const home = s.character.livesIn;
  const away = s.editions.some((ed) => (ed.screenings ?? []).some((sc) => sc.rsvp === 'accepted' && !sc.done));
  if (!away && s.locationId !== home && !travelRefusal(s, home)) travelTo(s, home);
};

const measure = (s: GameState) => {
  const mine = s.editions.flatMap((ed) => (ed.screenings ?? []).filter((sc) => s.projects.some((p) => p.id === sc.projectId)));
  return {
    accepted: mine.filter((sc) => sc.rsvp === 'accepted').length,
    attended: mine.filter((sc) => sc.attended).length,
    visas: (s.paperApplications ?? []).filter((a) => a.kind === 'visa').length,
    offers: s.projects.reduce((a, p) => a + p.offers.length, 0),
    guarantees: s.projects.reduce((a, p) => a + p.offers.filter((o) => o.status === 'accepted').reduce((b, o) => b + o.minimumGuarantee, 0), 0),
  };
};

export const PROBES: Probe[] = [
  {
    id: 'attend-screening',
    features: ['action:awards-actions.rsvpScreening', 'scheduled:screening'],
    decision: 'Accept each invitation to a screening of your film and be there, or leave the invitations unanswered',
    reads: ['src/engine/awards-actions.ts#rsvpScreening', 'src/engine/awards.ts#handler:screening'],
    seeds: 30,
    base: { years: 3, daily: festivalDay(false, true) },
    variant: { years: 3, daily: festivalDay(true, true) },
    measure,
    bites: ['accepted', 'attended'],
    downstream: ['offers', 'guarantees', 'distributed', 'revenue', 'money'],
  },
  {
    id: 'visitor-visa',
    features: ['action:papers.applyForVisa'],
    decision: 'Apply for the visitor visa a festival abroad asks for before going to its screening',
    reads: ['src/engine/papers.ts#applyForVisa', 'src/engine/papers.ts#entryRefusal'],
    seeds: 30,
    base: { years: 3, daily: festivalDay(true, false) },
    variant: { years: 3, daily: festivalDay(true, true) },
    measure,
    bites: ['visas'],
    downstream: ['attended', 'offers', 'guarantees', 'distributed', 'revenue'],
  },
];
