import {
  acceptCounter, addCharacter, addScene, approveDraft, assemblyComplete, castPlayer, castRoleFor, createProject, deliver, deliveryBlockers,
  emptyDraft, generatePlan, ledgerTotals, lockBlockers, lockPicture, makeOffer, neededRoles, newGame, processUntil, proposeStaffing, roleCandidates,
  saveDraft, sendStaffingOffers, startCutPass, updateCharacter, updateScene, productionWindow, isAvailable, approvedCharacters, approvedScenes,
  DAY, dateKey, addDaysToKey, getProjectZone,
} from './engine-api';
import type { CreationDraft, Format, GameState, Medium, PerformanceMethod, Project, Technique } from '../src/engine/types';

export function startLife(seedTag: string, placeId = 'gb-london', over: Partial<CreationDraft> = {}): GameState {
  const d: CreationDraft = {
    ...emptyDraft(), name: 'Rin Sato-Moreau', pronouns: 'they', actingTitle: 'Actor', birthDate: '1990-06-15', birthplaceId: 'jp-tokyo',
    heritages: [{ id: 'Japanese', label: 'Japanese', custom: false }, { id: 'French', label: 'French', custom: false }], mainLanguage: 'en',
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
    const method: PerformanceMethod = c.methods.includes('voice') && p.axes.medium === 'animation' ? 'voice' : 'on-camera';
    if (p.cast.some((a) => a.characterId === c.id && a.method === method)) continue;
    if (p.hires.some((h) => h.characterId === c.id && h.method === method && ['offered', 'countered', 'accepted'].includes(h.status))) continue;
    const roleId = castRoleFor(method);
    const tried = new Set(p.hires.filter((h) => h.characterId === c.id).map((h) => h.personId));
    const pool = roleCandidates(state, p, roleId).filter((x) => !tried.has(x.id) && isAvailable(state, x, win.from, win.to, p.id).ok && x.experience >= 3).sort((a, b) => a.dayRate - b.dayRate);
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

export function startProduction(state: GameState, p: Project, leadDays = 10): void {
  const zone = getProjectZone(p);
  generatePlan(state, p, addDaysToKey(dateKey(state.now, zone), leadDays));
}

export function summary(p: Project) {
  const t = ledgerTotals(p);
  return {
    delivered: !!p.delivered, spent: t.settled, fund: t.fund, shootDays: p.schedule.days.length, lostDays: p.schedule.days.filter((d) => d.status === 'lost').length,
    openTasks: p.tasks.filter((x) => x.status !== 'done').map((x) => `${x.label}: ${x.blockedReason ?? x.status}`).slice(0, 5),
  };
}
