import {
  acceptCounter, addCharacter, addScene, approveDraft, assemblyComplete, castPlayer, castRoleFor, createProject, deliver, deliveryBlockers,
  emptyDraft, generatePlan, ledgerTotals, makeOffer, neededRoles, newGame, processUntil, proposeStaffing, roleCandidates,
  saveDraft, sendStaffingOffers, updateCharacter, updateScene, productionWindow, isAvailable, approvedCharacters, approvedScenes,
  DAY, dateKey, addDaysToKey, getProjectZone, FundsError, bringInCoProducer, approveTake, bookMocap, mocapRecord,
} from './engine-api';
import { showCut } from '../src/engine/documentary-actions';
import { personAge, playingAgeAt, type Person } from '../src/engine/people';
import { storyAge } from '../src/engine/story-age';
import { approveDesign } from '../src/engine/designs-actions';
import { fundingScenario } from '../src/engine/projects';
import type { CreationDraft, Format, GameState, Medium, PerformanceMethod, Project, Technique } from '../src/engine/types';
import { designStatus, designsToReview } from '../src/engine/designs';
import { cutFromEdit, editScenes } from '../src/engine/finish';
import { lockBlockers, lockPicture, startCutPass, unlockPicture } from '../src/engine/edit-actions';

export function startLife(seedTag: string, placeId = 'gb-london', over: Partial<CreationDraft> = {}): GameState {
  const d: CreationDraft = {
    ...emptyDraft(), name: 'Rin Sato-Moreau', pronouns: 'they', actingTitle: 'Actor', birthDate: '1990-06-15', birthplaceId: 'jp-tokyo',
    heritages: [{ id: 'Japanese', label: 'Japanese', custom: false }, { id: 'French', label: 'French', custom: false }], nationalities: ['JP', 'FR'], mainLanguage: 'en',
    languages: [{ code: 'ja', proficiency: 'Fluent' }, { code: 'fr', proficiency: 'Conversational' }], startPlaceId: placeId, startDate: '2026-01-05', startTime: '08:00', ...over,
  };
  return newGame(d, 0, `save-${seedTag}`);
}

export interface SceneSpec {
  place: string;
  intExt?: 'INT' | 'EXT';
  time?: 'DAY' | 'NIGHT';
  chars: string[];
  minutes?: number;
  extra?: Record<string, unknown>;
}

/**
 * Labelled test fixture: the project's estimate is already agreed and paid in, as an accepted deal of the kind saves
 * from before financing get (so engine tests start from the same money as before). Gameplay never does this:
 * money comes from backers the player approaches (tests/finance.test.ts).
 */
export function agreedFunding(p: Project, amount = p.finance?.estimate ?? 0): void {
  p.finance ??= { estimate: amount, target: amount, deals: [] };
  p.finance.deals.push({
    id: `${p.id}-fixture`, kind: 'agreed', backer: 'Test fixture: agreed funding', amount, status: 'accepted', askedAt: 0, reason: 'Test fixture.',
    // The approval rights this budget size carried before financing existed (as migrateV4toV5 keeps them).
    received: amount, repaid: 0, terms: { recoup: 0, incomeShare: 0, approvalRights: [...fundingScenario(p.funding.scenarioId).rights], credit: null, onDelivery: 0, deliverBy: null },
  });
  p.funding.fund += amount;
}

export function buildProject(
  state: GameState,
  opts: { title: string; format: Format; medium: Medium; technique?: Technique; scenario?: string; genres?: string[]; runtime?: number; episodes?: number; quality?: 'limited' | 'tv' | 'feature' },
  characters: { name: string; patch?: Record<string, unknown> }[],
  scenes: SceneSpec[],
): Project {
  const p = createProject(state, {
    title: opts.title,
    scenarioId: opts.scenario ?? 'low',
    axes: {
      format: opts.format, medium: opts.medium, ...(opts.technique ? { technique: opts.technique } : {}),
      ...(opts.runtime ? { targetRuntimeMin: opts.runtime } : {}), ...(opts.episodes ? { episodeCount: opts.episodes } : {}), ...(opts.quality ? { animationQuality: opts.quality } : {}),
    },
  });
  agreedFunding(p);
  writePitch(p);
  p.axes.genres = (opts.genres ?? []).map((id, i) => ({ id, emphasis: i === 0 ? 'primary' : 'secondary' }));
  const ids: Record<string, string> = {};
  for (const c of characters) {
    const ch = addCharacter(state, p, c.name);
    if (c.patch) updateCharacter(p, ch.id, c.patch as never);
    ids[c.name] = ch.id;
  }
  for (const sc of scenes) {
    const s = addScene(state, p, (sc.extra?.episode as number) ?? 1);
    updateScene(p, s.id, {
      heading: { intExt: sc.intExt ?? 'INT', place: sc.place, time: sc.time ?? 'DAY' }, storyLocation: sc.place, participants: sc.chars.map((n) => ids[n]),
      objective: 'Move the story forward.', action: 'Action.', estMinutes: sc.minutes ?? 3, ...(sc.extra ?? {}),
    } as never);
  }
  return p;
}

/**
 * Labelled fixture: the documents a player writes in the Story panel (Pitch, Treatment, Statement Of Intent), which
 * backers, festival entry forms and distribution contracts include (script-effects.ts DOCUMENTS), and a content
 * declaration of none, which streaming contracts ask for. Never read for meaning; tests of the requirements clear them.
 */
export function writePitch(p: Project): void {
  Object.assign(p.story, { logline: 'A test logline.', premise: 'A test premise.', stakes: 'Test stakes.', theme: 'A test theme.', question: 'A test question.',
    conflict: 'A test conflict.', viewpoint: 'Hers.', ending: 'A test ending.', intendedExperience: 'A test experience.' });
  p.axes.storySetting ||= 'A test setting.';
  p.axes.content ??= {};
}

export function approve(state: GameState, p: Project): void {
  saveDraft(state, p);
  approveDraft(state, p, p.drafts[p.drafts.length - 1].number);
}

/** Offer every role the cheapest available experienced candidate at their asking rate. */
export function castAll(state: GameState, p: Project, playerRoles: { character: string; method: PerformanceMethod }[] = []): void {
  for (const pr of playerRoles) {
    const c = approvedCharacters(p).find((x) => x.name === pr.character)!;
    castPlayer(state, p, c.id, pr.method);
  }
  const win = productionWindow(state, p);
  for (const c of approvedCharacters(p)) {
    if (c.roleSize === 'background') continue;
    if (!approvedScenes(p).some((s) => s.participants.includes(c.id))) continue;
    const animated = p.axes.medium === 'animation' || (['cg', 'drawn', 'puppet'].includes(c.realization) && c.methods.includes('voice'));
    const methods: PerformanceMethod[] = animated ? ['voice', ...(c.methods.includes('motion-capture') ? ['motion-capture' as const] : [])] : ['on-camera'];
    for (const method of methods) {
      if (p.cast.some((a) => a.characterId === c.id && a.method === method)) continue;
      if (p.hires.some((h) => h.characterId === c.id && h.method === method && ['offered', 'countered', 'accepted'].includes(h.status))) continue;
      const roleId = castRoleFor(method);
      const tried = new Set(p.hires.filter((h) => h.characterId === c.id && h.method === method).map((h) => h.personId));
      // As a producer would: someone who plays the part's age, or for a part with no age written, an adult. Until the pool
      // had children (November 11, 2026), the cheapest experienced performer was always one.
      const today = dateKey(state.now, 'UTC');
      const want = storyAge(c.ageInStory);
      const suits = (x: Person) => {
        const plays = playingAgeAt(x, today);
        return want ? !!plays && want.max >= plays[0] && want.min <= plays[1] : personAge(x, today) >= 18;
      };
      const pool = roleCandidates(state, p, roleId).filter((x) => !tried.has(x.id) && isAvailable(state, x, win.from, win.to, p.id).ok && x.experience >= (want && want.max < 16 ? 1 : 3) && suits(x)).sort((a, b) => a.dayRate - b.dayRate);
      for (const pick of pool) {
        try {
          makeOffer(state, p, { personId: pick.id, roleId, dayRate: pick.dayRate, characterId: c.id, method });
          break;
        } catch {
          /* clash or funds: try the next candidate */
        }
      }
    }
  }
}

export function staffAll(state: GameState, p: Project): void {
  const depts = [...new Set(neededRoles(p, state).map((r) => r.dept))];
  for (const d of depts) {
    const { proposals } = proposeStaffing(state, p, d);
    sendStaffingOffers(state, p, proposals);
  }
}

/** One simulated management day: keeps hiring, accepts counters, moves the edit forward. */
export function manage(state: GameState, p: Project): string[] {
  const did: string[] = [];
  for (const h of p.hires.filter((x) => x.status === 'countered')) {
    try {
      acceptCounter(state, p, h.id);
      did.push('counter');
    } catch {
      /* ignore */
    }
  }
  if (!p.delivered) {
    staffAll(state, p);
    castAll(state, p);
    // Designs: approve each one as it is finished, as a producer would (designs.ts).
    for (const cid of designsToReview(p)) if (designStatus(p, cid) === 'awaiting') { approveDesign(p, cid); did.push('design-approved'); }
    // Motion capture: book the stage once the schedule exists, then approve the best take when capture is done.
    for (const t of p.tasks.filter((x) => x.kind === 'anim:mocap' && x.assetRef)) {
      const rec = mocapRecord(p, t.assetRef!);
      if (rec.status !== 'booked' && t.status !== 'done') {
        try {
          bookMocap(state, p, t.assetRef!);
          did.push('mocap-booked');
        } catch {
          /* not cast yet or short of funds */
        }
      }
      if (t.status === 'done' && !rec.approvedTakeId && rec.takes.length) {
        approveTake(p, t.assetRef!, [...rec.takes].sort((a, b) => b.quality - a.quality)[0].id);
        did.push('take-approved');
      }
    }
    // Recovery a player would choose when money runs out: bring in a partner, then rebuild the schedule.
    const broke = p.tasks.some((t) => t.status === 'blocked' && /money/.test(t.blockedReason ?? '')) || p.schedule.days.some((d) => d.status === 'lost' && /enough money/.test(d.result ?? ''));
    if (broke && !p.funding.extra.length) {
      bringInCoProducer(state, p);
      did.push('co-producer');
      if (p.schedule.startDate && !p.schedule.days.some((d) => d.status === 'scheduled')) {
        try {
          generatePlan(state, p, addDaysToKey(dateKey(state.now, getProjectZone(p)), 2));
        } catch {
          /* still short: stays blocked */
        }
      }
    }
  }
  if (assemblyComplete(p) && !p.edit.pictureLocked && !p.tasks.some((t) => t.kind === 'post:cutpass' && t.status !== 'done')) {
    if (lockBlockers(p).length === 0) {
      lockPicture(state, p);
      did.push('lock');
    } else if (p.edit.cutPasses < 2 && !p.schedule.days.some((d) => d.status === 'scheduled')) {
      try {
        startCutPass(state, p);
        did.push('cut');
      } catch {
        /* ignore */
      }
    }
  }
  // Contributors who approve how they appear: show them the locked cut; after a refusal, unlock and cut their scenes.
  for (const c of p.contributors.filter((x) => x.consent === 'given' && x.restrictions?.includes('approval') && editScenes(p).some((s) => s.contributorIds.includes(x.id)))) {
    if (p.edit.pictureLocked && !c.cutApproval) { showCut(state, p, c.id); did.push('cut-shown'); }
    else if (c.cutApproval?.status === 'refused') {
      if (p.edit.pictureLocked) unlockPicture(state, p);
      for (const sc of editScenes(p).filter((x) => x.contributorIds.includes(c.id))) cutFromEdit(state, p, sc.id);
      did.push('contributor-cut');
    }
  }
  if (p.edit.pictureLocked && !p.delivered && deliveryBlockers(p).length === 0) {
    deliver(state, p);
    did.push('deliver');
  }
  return did;
}

export function runDays(state: GameState, p: Project, days: number, onDay?: (i: number) => void): void {
  for (let i = 0; i < days; i++) {
    manage(state, p);
    processUntil(state, state.now + DAY, 'tick', 100000);
    onDay?.(i);
    if (p.delivered) break;
  }
}

/** Builds the schedule; on a funding shortfall it brings in a co-producer once, as a player could. */
export function startProduction(state: GameState, p: Project, leadDays = 10): { neededCoProducer: boolean } {
  const zone = getProjectZone(p);
  const start = addDaysToKey(dateKey(state.now, zone), leadDays);
  try {
    generatePlan(state, p, start);
    return { neededCoProducer: false };
  } catch (e) {
    if (!(e instanceof FundsError)) throw e;
    bringInCoProducer(state, p);
    generatePlan(state, p, start);
    return { neededCoProducer: true };
  }
}

export function summary(p: Project) {
  const t = ledgerTotals(p);
  return {
    delivered: !!p.delivered, spent: t.settled, fund: t.fund, shootDays: p.schedule.days.length, lostDays: p.schedule.days.filter((d) => d.status === 'lost').length,
    openTasks: p.tasks.filter((x) => x.status !== 'done').map((x) => `${x.label}: ${x.blockedReason ?? x.status}`).slice(0, 5),
  };
}
