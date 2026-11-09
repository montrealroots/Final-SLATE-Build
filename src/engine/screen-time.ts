// Screen time from the finished edit (November 9, 2026). Until then the Emmys' 5% rule read the approved script: a part
// was on screen for every minute of every scene it was listed in, and an episode ran its target length. The game has no
// footage to measure, so a performer's time in a scene is what the player records from the cut: minutes seen, and
// minutes heard but not seen. A scene with no record is unknown, a range from nothing to the whole scene, and a rule
// that needs a share is met, missed or left open by that range: never by guessing either end of it. Loaded with the
// catalog and the Edit tab, not at startup.
import { editScenes } from './finish';
import { approvedCharacters } from './projects';
import { versionScenes } from './versions';
import type { Credit, GameState, Project, Scene, ScreenTime } from './types';

const round1 = (n: number) => Math.round(n * 10) / 10;
export const minutesWords = (n: number) => `${round1(n)} ${round1(n) === 1 ? 'minute' : 'minutes'}`;

/** The scenes of the cut entered: a version's, or the main cut's. */
export function cutScenes(p: Project, versionId?: string): Scene[] {
  const v = versionId ? p.versions?.find((x) => x.id === versionId) : undefined;
  return v ? versionScenes(p, v) : editScenes(p);
}

/** The record for a performer in a scene, if any, and whether it still fits the scene (a script change can shorten it). */
export function recordFor(p: Project, sceneId: string, characterId: string): { rec: ScreenTime; stale: boolean } | null {
  const rec = p.edit.screenTime?.find((x) => x.sceneId === sceneId && x.characterId === characterId);
  if (!rec) return null;
  const scene = editScenes(p).find((s) => s.id === sceneId);
  return { rec, stale: !scene || rec.onScreen + rec.heardOnly > scene.estMinutes + 1e-9 };
}

/**
 * Record how long a part is seen and heard-only in a scene of the cut. Several performers can share the same minutes: each
 * is checked against the scene alone. Recording is reviewing the delivered cut, so it is open after delivery too; entries
 * already submitted keep what they were entered with.
 */
export function recordScreenTime(state: GameState, p: Project, sceneId: string, characterId: string, onScreen: number, heardOnly = 0): void {
  const scene = editScenes(p).find((s) => s.id === sceneId);
  if (!scene) throw new Error('That scene isn\'t in the cut.');
  if (!scene.participants.includes(characterId)) throw new Error('That part isn\'t in this scene.');
  for (const [n, what] of [[onScreen, 'On-screen'], [heardOnly, 'Heard-only']] as const) {
    if (!Number.isFinite(n) || n < 0) throw new Error(`${what} time has to be zero or more minutes.`);
  }
  if (onScreen > scene.estMinutes + 1e-9) throw new Error(`The scene runs ${minutesWords(scene.estMinutes)}; nobody is on screen longer than that.`);
  if (onScreen + heardOnly > scene.estMinutes + 1e-9) throw new Error(`Seen and heard-only time together can't be more than the scene's ${minutesWords(scene.estMinutes)}.`);
  const list = (p.edit.screenTime ??= []);
  const at = list.findIndex((x) => x.sceneId === sceneId && x.characterId === characterId);
  const rec: ScreenTime = { sceneId, characterId, onScreen: round1(onScreen), heardOnly: round1(heardOnly), sceneMinutes: scene.estMinutes, at: state.now };
  if (at >= 0) list[at] = rec; else list.push(rec);
}

/** Take a record back: the scene's time for that part is unknown again. */
export function clearScreenTime(p: Project, sceneId: string, characterId: string): void {
  p.edit.screenTime = (p.edit.screenTime ?? []).filter((x) => !(x.sceneId === sceneId && x.characterId === characterId));
}

export interface ScreenTotal {
  /** Minutes on screen recorded from the cut. */
  recorded: number;
  /** Most the unrecorded (or stale) scenes could add: their full length. */
  unknown: number;
  heardOnly: number;
  /** The running time it is a share of. */
  of: number;
  scenes: number;
  unrecordedScenes: number;
}

/** A part's screen time in some of the cut's scenes, against those scenes' running time (or `of`). */
export function screenTotal(p: Project, characterId: string, scenes: Scene[], of = scenes.reduce((a, s) => a + s.estMinutes, 0)): ScreenTotal {
  const t: ScreenTotal = { recorded: 0, unknown: 0, heardOnly: 0, of, scenes: 0, unrecordedScenes: 0 };
  for (const s of scenes.filter((x) => x.participants.includes(characterId))) {
    t.scenes += 1;
    const r = recordFor(p, s.id, characterId);
    if (r && !r.stale) { t.recorded += r.rec.onScreen; t.heardOnly += r.rec.heardOnly; } else { t.unknown += s.estMinutes; t.unrecordedScenes += 1; }
  }
  return t;
}

export const characterOf = (p: Project, c: Pick<Credit, 'characterName'>) => approvedCharacters(p).find((x) => x.name === c.characterName);

export interface ShareCheck { met: boolean | null; text: string; episode?: number }

/**
 * Whether a credited part is on screen for at least `atLeast` of the running time: of the entered episode (or, with none
 * named, whichever episode does best), or of the whole cut entered. Met when recorded time alone reaches it, missed when
 * even every unrecorded minute wouldn't, otherwise open, with what to record. The text shows the calculation.
 */
export function shareCheck(p: Project, c: Credit, atLeast: number, per: 'episode' | 'whole', ctx: { episode?: number; versionId?: string } = {}): ShareCheck {
  const ch = characterOf(p, c);
  const name = c.characterName ?? c.personName;
  if (!ch) return { met: false, text: `${name} isn't a part in the approved script.` };
  const cut = cutScenes(p, ctx.versionId);
  const groups: { episode?: number; scenes: Scene[] }[] = per === 'whole' ? [{ scenes: cut }]
    : [...new Set(cut.filter((s) => s.participants.includes(ch.id)).map((s) => s.episode))].filter((e) => ctx.episode === undefined || e === ctx.episode).map((e) => ({ episode: e, scenes: cut.filter((s) => s.episode === e) }));
  if (!groups.length) return { met: false, text: `${name} isn't in ${ctx.episode !== undefined ? `episode ${ctx.episode}` : 'the cut'}.`, episode: ctx.episode };
  const pct = Math.round(atLeast * 100);
  const checks = groups.map((g) => {
    const t = screenTotal(p, ch.id, g.scenes);
    const need = atLeast * t.of;
    const where = g.episode !== undefined && per === 'episode' ? `episode ${g.episode} (${minutesWords(t.of)})` : `the ${minutesWords(t.of)} cut`;
    const share = t.of ? Math.round((t.recorded / t.of) * 1000) / 10 : 0;
    const base = `${name} is on screen ${minutesWords(t.recorded)} of ${where}, ${share}%, as recorded from the cut`;
    const heard = t.heardOnly ? `, besides ${minutesWords(t.heardOnly)} heard but not seen, which doesn't count` : '';
    if (t.recorded + 1e-9 >= need) return { met: true as const, episode: g.episode, text: `${base}${heard}; this category needs ${pct}% (${minutesWords(need)}).`, score: t.recorded / Math.max(1, t.of) };
    if (t.recorded + t.unknown + 1e-9 < need) {
      const open = t.unrecordedScenes ? `; even if they were on screen for all of the ${t.unrecordedScenes} scene${t.unrecordedScenes === 1 ? '' : 's'} not recorded yet, it would be ${minutesWords(t.recorded + t.unknown)}` : '';
      return { met: false as const, episode: g.episode, text: `${base}${heard}${open}; this category needs ${pct}% (${minutesWords(need)}).`, score: -1 };
    }
    const missing = t.unrecordedScenes === t.scenes
      ? (t.scenes === 1 ? `their scene there (up to ${minutesWords(t.unknown)}) isn't recorded yet` : `none of their ${t.scenes} scenes there (up to ${minutesWords(t.unknown)}) is recorded yet`)
      : `${t.unrecordedScenes} of their ${t.scenes} scenes there (up to ${minutesWords(t.unknown)}) ${t.unrecordedScenes === 1 ? 'isn\'t' : 'aren\'t'} recorded yet`;
    return { met: null, episode: g.episode, text: `${base}${heard}, and ${missing}. This category needs ${pct}% (${minutesWords(need)}): record their screen time in the Edit tab to show it.`, score: 0 };
  });
  return checks.find((x) => x.met === true) ?? checks.find((x) => x.met === null) ?? checks[0];
}
