// SLATE-19-03: an action that spends money or time says what it will cost before you commit to it, and shows what
// happened after. The engine functions the interface calls are read with the TypeScript parser; a function spends if it,
// or anything it calls, reserves, commits or settles money, schedules an event or adds work to a project. Each one is
// recorded here with where the player reads its cost or time first and its outcome after, so a new spending action fails
// this test until both are shown and recorded (November 8, 2026). The audit that built this list added the missing
// previews: a backer's answer time, consent's answer time, a cut pass's editor days and what locking starts, a version's
// conform day, a contributor's cut review time, what Move the Shoot and the interior swap do to costs, and the shoot days
// and day costs a schedule reserves.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const LOG = 'The result is written to Recent Updates on Home and the project log.';
const ACTIONS: Record<string, { preview: string; outcome: string }> = {
  acceptCounter: { preview: 'The hire row shows the rate they asked for and until when.', outcome: LOG },
  acceptDeal: { preview: 'Accept These Terms? lists the amount and every term.', outcome: LOG },
  acceptDistribution: { preview: 'The offer states its guarantee, release window, territories, delivery materials and subtitles.', outcome: LOG },
  acceptOpportunity: { preview: 'The proposal states the amount, the delivery deadline and the terms.', outcome: `${LOG} You are taken to the new project.` },
  addPlan: { preview: 'You choose the date, time and length.', outcome: 'The plan appears on the calendar and in Up Next.' },
  addVersion: { preview: 'The runtime it would run and the editor day to conform it.', outcome: 'The version is listed on the Versions card with its runtime.' },
  applyDesignChange: { preview: 'The impact callout counts the shots and assets the change rebuilds.', outcome: 'The rebuilt work appears on the Production page.' },
  applyFix: { preview: 'Each fix in Dailies says what it does; a pickup names the cost of its day, and is refused when the money for it isn\'t there.', outcome: 'The Dailies card shows the take in the cut or the issue gone; a pickup day is logged and appears on the Schedule.' },
  attachSong: { preview: 'How It Plays, and that a song performed on screen is recorded before the scene is shot.', outcome: 'The song row lists the scene and how it plays, and its work.' },
  changeVersionSong: { preview: 'The version\'s song choice for each scene of the cut, before the version is conformed.', outcome: 'The choice shows on the Versions card.' },
  createSong: { preview: 'Under Add Song: who writes it and how long, the recording day, or the clearance and its cost.', outcome: 'The song is listed with its status and its work.' },
  detachSong: { preview: 'Take It Out names the scene.', outcome: 'The scene leaves the song row; work not started that it needed goes.' },
  removeSong: { preview: 'Remove Song shows only once the song is in no scene.', outcome: 'The song leaves the list.' },
  restoreVersionSong: { preview: 'The version\'s song choice shows the cut\'s song.', outcome: 'The version plays the cut\'s song again.' },
  approachBacker: { preview: 'The backer row says what they need and how many days they take to answer.', outcome: LOG },
  askForBetterTerms: { preview: 'What changes, that you can ask once, and the days they take to answer.', outcome: LOG },
  bookMocap: { preview: 'The button shows the booking cost.', outcome: 'The booked dates, and any passed over with why, are listed.' },
  callBack: { preview: 'Auditions are on the next working day the notice days ahead.', outcome: 'The audition row shows the callback; its result is logged when it happens.' },
  cancelMocapBooking: { preview: 'The cancellation terms are shown under the booking.', outcome: 'The booking is shown as cancelled and the money released.' },
  continueProject: { preview: 'What carries over, and that people are asked and paid again.', outcome: 'You are taken to the new project.' },
  cutFromEdit: { preview: 'Cut This Scene From The Edit? says what it does to the story.', outcome: LOG },
  deliver: { preview: 'What delivery still needs, and what delivery does.', outcome: `${LOG} Delivery shows the runtime and the amount spent.` },
  generatePlan: { preview: 'The shoot days and day costs it reserves; rebuilding keeps finished work.', outcome: LOG },
  inviteToAudition: { preview: 'Auditions are on the next working day the notice days ahead.', outcome: 'The candidate shows Asked To Read; the read is logged when it happens.' },
  lockPicture: { preview: 'What locking still needs, and the finishing work it starts.', outcome: LOG },
  makeOffer: { preview: 'The day rate field and the paid days for the production window.', outcome: 'The hire row shows Offer Out; the answer is logged.' },
  moveShootDay: { preview: 'Where Move the Shoot puts the day, and that agreed costs stay.', outcome: LOG },
  planRelease: { preview: 'You choose the route, date and territory; what each route needs is stated. A series shows every episode\'s date before you plan it.', outcome: `${LOG} Each day episodes come out is on the calendar.` },
  startEpisodeCutPass: { preview: 'The episode row on Delivering Episode By Episode says what a cut pass needs; the editor days show on the Production page once it starts.', outcome: `${LOG} The episode row shows the pass under way.` },
  lockEpisode: { preview: 'Lock Episode N lists, under the episode, what must happen first; once locked, its sound, music and color go on.', outcome: `${LOG} The episode row says its picture is locked.` },
  setEpisodeDates: { preview: 'Change These Episode Dates? lists each episode that moves, the release day and any exclusive window that move with it, and every entry whose qualification would change.', outcome: `${LOG} The release lists each episode's date and whether it is out.` },
  requestConsent: { preview: 'They answer within two to six days.', outcome: 'The contributor shows Consent Requested; the answer is logged.' },
  requestPickups: { preview: 'A pickup is a paid shoot day after the main shoot; restarted plate integration is shown.', outcome: LOG },
  rerecordLines: { preview: 'The Additional Work card says who is paid and for how long.', outcome: 'The part shows re-recording booked, then done.' },
  reviseEffects: { preview: 'The Additional Work card says who works and for how long.', outcome: 'The scene shows its revision underway, then done.' },
  sendStaffingOffers: { preview: 'The staffing dialog lists each person, rate, days and total.', outcome: 'A line says how many offers were sent; each answer is logged.' },
  shelveProject: { preview: 'Shelve The Project lists what shelving cancels and keeps.', outcome: LOG },
  showCut: { preview: 'They answer the cut review days after seeing it.', outcome: LOG },
  startCutPass: { preview: 'The editor days a cut pass takes.', outcome: LOG },
  startRevision: { preview: 'The button counts the notes and the hours the pass takes.', outcome: 'A revision under way is shown on the Script page.' },
  startSleep: { preview: 'You choose when to wake.', outcome: 'The clock shows Asleep until the alarm.' },
  submitEntry: { preview: 'Prepare Submission shows the entry fee and the rules it is checked against.', outcome: LOG },
  swapWithInteriorDay: { preview: 'That it swaps dates with the next interior day, and that agreed costs stay.', outcome: LOG },
  travelTo: { preview: 'The trip says how many hours it takes.', outcome: 'You arrive after the hours pass; Home shows where you are.' },
  withdrawRelease: { preview: 'The withdrawal dialog says whether footage will be redacted.', outcome: LOG },
};
// Names the parser matches in the interface that aren't player actions spending anything.
const NOT_ACTIONS = new Set(['commit', 'newGame', 'scheduleChangeEffects']); // a portrait picker's own commit(); starting a life; a preview tried on a copy of the game

function spendingActions(): string[] {
  const files: string[] = [];
  const walk = (d: string) => { for (const f of readdirSync(d)) { const p = `${d}/${f}`; if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.ts')) files.push(p); } };
  walk('src/engine');
  const calls = new Map<string, Set<string>>();
  const exported = new Set<string>();
  const visit = (sf: ts.SourceFile, name: string, body: ts.Node) => {
    const set = calls.get(name) ?? new Set<string>();
    const go = (n: ts.Node) => {
      if (ts.isCallExpression(n)) {
        if (ts.isIdentifier(n.expression)) set.add(n.expression.text);
        if (ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'push' && /\.tasks$/.test(n.expression.expression.getText(sf))) set.add('@task');
      }
      ts.forEachChild(n, go);
    };
    go(body);
    calls.set(name, set);
  };
  for (const f of files) {
    const sf = ts.createSourceFile(f, readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true);
    const top = (n: ts.Node) => {
      if (ts.isFunctionDeclaration(n) && n.name && n.body) {
        visit(sf, n.name.text, n.body);
        if (n.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) exported.add(n.name.text);
      }
      ts.forEachChild(n, top);
    };
    top(sf);
  }
  const spends = new Set(['reserve', 'commit', 'settle', 'payPlanned', 'schedule', '@task']);
  for (let changed = true; changed;) {
    changed = false;
    for (const [n, set] of calls) if (!spends.has(n) && [...set].some((x) => spends.has(x))) { spends.add(n); changed = true; }
  }
  const ui = readdirSync('src/ui').map((f) => readFileSync(`src/ui/${f}`, 'utf8')).join('\n');
  return [...calls.keys()].filter((n) => spends.has(n) && exported.has(n) && !NOT_ACTIONS.has(n) && new RegExp(`\\b${n}\\(`).test(ui)).sort();
}

describe('actions that spend money or time', () => {
  it('each previews its cost or time and shows its outcome, and the record names nothing that is gone', () => {
    const found = spendingActions();
    expect(found.filter((n) => !ACTIONS[n])).toEqual([]);
    expect(Object.keys(ACTIONS).filter((n) => !found.includes(n))).toEqual([]);
  });
});
