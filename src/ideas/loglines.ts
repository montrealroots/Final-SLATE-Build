// The logline builder's parts (the Creative Depth package, 02-CREATIVE-LIBRARIES.md, "Logline/story-premise builder").
// A logline here is four chosen parts: when it starts, who it happens to, what they must do, and what it costs. The
// player picks each, reads the whole sentence, and applies it to the Logline field, where it is theirs to rewrite.
//
// Counted honestly (tests/ideas.test.ts reports both): the parts below are what was written; the sentences they make are
// combinations, most of them, not separately written ideas. A part that makes no sense with another says so (`not`), and
// those pairs are never offered. The game reads none of it for meaning.
export interface Part { id: string; text: string; /** Parts of other kinds this one doesn't go with. */ not?: string[] }

export const WHEN: Part[] = [
  { id: 'when.power', text: 'When the power fails across the district' },
  { id: 'when.road', text: 'When the last road out is closed' },
  { id: 'when.letter', text: 'When a letter arrives thirty years late' },
  { id: 'when.vote', text: 'On the night before the town votes' },
  { id: 'when.witness', text: 'When the only witness stops talking' },
  { id: 'when.heat', text: 'In the hottest week anyone remembers' },
  { id: 'when.rival', text: 'When an old rival comes back to town' },
  { id: 'when.sold', text: 'On the last day before the building is sold' },
  { id: 'when.mistaken', text: 'When a stranger is mistaken for someone important' },
  { id: 'when.bridge', text: 'After the river takes the bridge' },
  { id: 'when.inherit', text: 'When an inheritance turns out to be a debt' },
  { id: 'when.first-day', text: 'On their first day in a job nobody else wanted' },
];
export const WHO: Part[] = [
  { id: 'who.dispatcher', text: 'a night-shift dispatcher' },
  { id: 'who.courier', text: 'a bicycle courier' },
  { id: 'who.teacher', text: 'a substitute teacher' },
  { id: 'who.pilot', text: 'a retired ferry pilot' },
  { id: 'who.editor', text: 'an apprentice film editor' },
  { id: 'who.host', text: 'a small-town radio host' },
  { id: 'who.engineer', text: 'a contract engineer' },
  { id: 'who.stage-manager', text: 'a touring stage manager' },
  { id: 'who.porter', text: 'a hospital porter' },
  { id: 'who.trader', text: 'a market trader' },
  { id: 'who.interpreter', text: 'a court interpreter' },
  { id: 'who.driver', text: 'a school bus driver' },
  { id: 'who.photographer', text: 'a wedding photographer' },
  { id: 'who.conductor', text: 'a night-train conductor' },
  { id: 'who.librarian', text: 'a village librarian' },
  { id: 'who.cook', text: 'a canteen cook', not: ['when.first-day'] },
];
export const MUST: Part[] = [
  { id: 'must.return', text: 'must return something that was never theirs to keep' },
  { id: 'must.message', text: 'must get one message to the right person' },
  { id: 'must.promise', text: 'must keep a promise made to someone who can no longer ask for it' },
  { id: 'must.finish', text: 'must finish a job everyone else has walked away from', not: ['when.first-day'] },
  { id: 'must.record', text: 'must find out who changed the record' },
  { id: 'must.escort', text: 'must bring a stranger safely across hostile ground', not: ['when.sold'] },
  { id: 'must.stop', text: "must stop a celebration that nobody wants stopped", not: ['when.road', 'when.bridge'] },
  { id: 'must.trust', text: 'must win back the people they walked out on', not: ['when.first-day', 'when.mistaken'] },
  { id: 'must.secret', text: 'must keep one secret through one long evening' },
  { id: 'must.believe', text: 'must decide which of two people to believe' },
  { id: 'must.open', text: 'must keep a failing place open for one more night', not: ['when.road', 'when.bridge'] },
  { id: 'must.stand-in', text: 'must stand in for someone who never arrived' },
  { id: 'must.teach', text: 'must teach the one thing they know to the person least willing to learn it' },
  { id: 'must.undo', text: 'must undo a favour before it is called in' },
];
export const COST: Part[] = [
  { id: 'cost.time', text: 'before the people relying on them run out of time' },
  { id: 'cost.home', text: 'or lose the one place that still feels like home' },
  { id: 'cost.name', text: 'even though the truth will cost them their good name' },
  { id: 'cost.help', text: 'with help only from the person who has every reason to refuse' },
  { id: 'cost.morning', text: 'before morning makes the choice for them' },
  { id: 'cost.others', text: "or someone who did nothing wrong will pay for it" },
  { id: 'cost.together', text: 'knowing that no choice keeps everyone together' },
  { id: 'cost.watching', text: 'while the whole town watches and nobody says a word' },
  { id: 'cost.once', text: 'and there will be no second attempt' },
  { id: 'cost.credit', text: "and whoever succeeds, someone else's name will be on it" },
];

export type LoglineParts = { when: string; who: string; must: string; cost: string };
const all = [...WHEN, ...WHO, ...MUST, ...COST];
const byId = new Map(all.map((x) => [x.id, x]));

/** Whether the four chosen parts go together: none of them rules another out. */
export function fits(parts: LoglineParts): boolean {
  const ids = [parts.when, parts.who, parts.must, parts.cost];
  return ids.every((id) => byId.has(id)) && !ids.some((id) => byId.get(id)!.not?.some((n) => ids.includes(n)));
}

/** The sentence four parts make, or null when they don't go together. */
export function compose(parts: LoglineParts): string | null {
  if (!fits(parts)) return null;
  return `${byId.get(parts.when)!.text}, ${byId.get(parts.who)!.text} ${byId.get(parts.must)!.text}, ${byId.get(parts.cost)!.text}.`;
}

/** Every combination that goes together. Thousands: counted, never shown as a list. */
export function* combinations(): Generator<LoglineParts> {
  for (const when of WHEN) for (const who of WHO) for (const must of MUST) for (const cost of COST) {
    const parts = { when: when.id, who: who.id, must: must.id, cost: cost.id };
    if (fits(parts)) yield parts;
  }
}
