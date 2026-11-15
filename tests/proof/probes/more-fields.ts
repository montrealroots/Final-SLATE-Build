// More of the script's and the player's fields: the score and the sound plan, a puppet's face, capture as a way of
// performing, where the scenes are, who speaks and who is in them, waking for obligations and waking early, and the
// inheritance the story starts with. Each changed where its field changes it, the rest as the default career plays.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { buildProject } from '../../helpers';
import { unfunded } from '../career';
import { processUntil } from '../../engine-api';
import { startSleep, wakeEarly } from '../../../src/engine/state';
import { short } from './script';
import { onceWithShoot } from './day';

const F = (label: string, n = 1) => `field:ScriptViews.tsx#${label}#${n}`;
const COST = { bites: ['spent'], downstream: ['ownIn', 'daysToDeliver'] };
/** The default short, its scenes changed by `fn` before the script is approved. */
const edited = (fn: (p: Project) => void) => (s: GameState, year: number): Project => { const p = short()(s, year); fn(p); return p; };
const id = (p: Project, name: string) => p.characters.find((c) => c.name === name)!.id;
/** An exchange between the lead and their friend in each scene they share. */
const exchange = (p: Project) => { for (const s of p.scenes.filter((x) => x.participants.length > 1)) s.dialogue = [{ id: `${s.id}-1`, characterId: id(p, 'Lead'), text: 'You came.', language: 'en' }, { id: `${s.id}-2`, characterId: id(p, 'Friend'), text: 'I said I would.', language: 'en' }]; };
/** A two-minute animated short (stop-motion or 3D CG), its lead patched with `lead`. */
const animated = (technique: '3d-cg' | 'stop-motion', lead: Record<string, unknown> = {}) => (s: GameState, year: number): Project => unfunded(buildProject(s,
  { title: `Year ${year + 1}`, format: 'short', medium: 'animation', technique, quality: 'tv', scenario: 'micro', genres: ['drama'], runtime: 2 },
  [{ name: 'Lead', patch: { roleSize: 'lead', ...lead } }, { name: 'Friend', patch: { roleSize: 'supporting' } }],
  [{ place: 'Flat', chars: ['Lead', 'Friend'], minutes: 1 }, { place: 'Cafe', chars: ['Lead', 'Friend'], minutes: 1 }]));
/** Ten the night before the first shoot day: asleep, with no alarm, until ten (day.ts sleep-through-call). */
const sleepIn = onceWithShoot((s, at) => { processUntil(s, at(-2), 'tick', 1_000_000); startSleep(s, at(10), false); });
/** The same, not woken for obligations: asleep through the call. */
const sleepThrough = (s: GameState) => { s.settings.wakeForObligations = false; sleepIn(s); };
const sleepThenWake = onceWithShoot((s, at) => { s.settings.wakeForObligations = false; processUntil(s, at(-2), 'tick', 1_000_000); startSleep(s, at(10), false); processUntil(s, at(5), 'tick', 1_000_000); wakeEarly(s); });
/** Scenes shot with singles as well as the master (types.ts SceneCapture setups). */
const singles = (_s: GameState, projects: Project[]) => ({ singles: projects.reduce((a, p) => a + p.captures.filter((c) => c.setups?.includes('singles')).length, 0) });
const lateDays = (_s: GameState, projects: Project[]) => ({ lateDays: projects.reduce((a, p) => a + p.schedule.days.filter((d) => d.late).length, 0) });

export const PROBES: Probe[] = [
  { id: 'score-chamber', features: [F('"The Score"')], decision: 'Score the short for a chamber ensemble', reads: ['src/engine/craft.ts#scoreSessions'],
    variant: { project: short({ axes: { score: 'chamber' } }) }, ...COST },
  // A boom operator is called for by a scene with dialogue (craft.ts craftRoles): both arms have the exchange.
  { id: 'sound-clarity', features: [F('{SOUNDS[k].label}')], decision: 'Record the short\'s dialogue for clarity, a boom on every dialogue scene', reads: ['src/engine/craft.ts#craftRoles'],
    base: { project: edited(exchange) }, variant: { project: (s: GameState, year: number) => { const p = short({ axes: { sound: ['clarity'] } })(s, year); exchange(p); return p; } }, bites: ['hired'], downstream: ['spent', 'ownIn'] },
  { id: 'puppet-face', features: [F('"Puppet Face"')], decision: 'Give the lead\'s puppet a mechanical head rather than replacement faces', reads: ['src/engine/production/tasks.ts#buildTasks'],
    base: { project: animated('stop-motion') }, variant: { project: animated('stop-motion', { faceMethod: 'mechanical' }) }, ...COST },
  { id: 'method-capture', features: [F('{title(m)}')], decision: 'Have the lead of the 3D short performed in motion capture as well as voiced', reads: ['src/engine/hiring.ts#castRoleFor', 'src/engine/production/tasks.ts#buildTasks'],
    // The capture performer and the stage's crew are hired, and captured movement comes faster than animating it by hand.
    base: { project: animated('3d-cg', { methods: ['voice'] }) }, variant: { project: animated('3d-cg', { methods: ['voice', 'motion-capture'] }) }, bites: ['hired', 'castRates'], downstream: ['daysToDeliver'] },
  { id: 'scenes-one-place', features: [F('"Place"')], decision: 'Set all three scenes in the flat', reads: ['src/engine/production/schedule.ts#groupShootDays'],
    variant: { project: edited((p) => { for (const s of p.scenes) { s.heading = { ...s.heading, place: 'Flat', intExt: 'INT' }; s.storyLocation = 'Flat'; } }) }, bites: ['shootDays'], downstream: ['spent', 'ownIn'] },
  // Two speakers in a scene need a single on each to cut between them (takes.ts requiredSetups).
  { id: 'dialogue-two-speakers', features: [F('"Speaker"')], decision: 'Write an exchange between the lead and their friend in each scene they share', reads: ['src/engine/takes.ts#requiredSetups'],
    // The singles are shot in the same shoot days, and the cut between them takes longer (4 careers: about three and a half days).
    variant: { project: edited(exchange) }, measure: singles, bites: ['singles'], downstream: ['daysToDeliver'] },
  { id: 'friend-out-of-cafe', features: [F('{c.name}', 1)], decision: 'Take the friend out of the café scene', reads: ['src/engine/hiring.ts#estimateDays'],
    // A day less of the friend's fee (4 careers: two thousand dollars less spent, and more left at the end).
    variant: { project: edited((p) => { const cafe = p.scenes.find((s) => s.heading.place === 'Cafe')!; cafe.participants = cafe.participants.filter((c) => c !== id(p, 'Friend')); }) }, bites: ['spent'], downstream: ['money', 'daysToDeliver'] },
  // On, as a new game starts, sleep ends an hour before the call (state.ts startSleep); off, it runs to ten.
  { id: 'no-wake-for-obligations', features: ['field:SavedGames.tsx#"Wake Me For Obligations"#1'], decision: 'Stop being woken for obligations, then sleep in before the first shoot day', reads: ['src/engine/state.ts#startSleep'],
    base: { daily: sleepIn }, variant: { daily: sleepThrough }, measure: lateDays, bites: ['lateDays'], downstream: ['quality.direction', 'overall'] },
  { id: 'wake-early', features: ['field:Shell.tsx#"Wake Up"#1'], decision: 'Wake at five before the first shoot day rather than sleep in until ten, not woken for obligations', reads: ['src/engine/state.ts#wakeEarly'],
    base: { daily: sleepThrough }, variant: { daily: sleepThenWake }, measure: lateDays, bites: ['lateDays'], downstream: ['quality.direction', 'overall'] },
  // The default short costs about forty thousand a year: twenty thousand of your own leaves the first short of money.
  { id: 'small-inheritance', features: ['field:Creation.tsx#"Amount (US Dollars)"#1'], decision: 'Start with twenty thousand dollars rather than twenty-five million', reads: ['src/engine/personal.ts#openInheritance'],
    variant: { creation: { inheritance: { currency: 'USD', amountMinor: 2_000_000 } } }, bites: ['ownIn'], downstream: ['delivered', 'backerIn'] },
];
