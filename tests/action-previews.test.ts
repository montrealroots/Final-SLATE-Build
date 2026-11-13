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
  applyWorldRefresh: { preview: "Settings, Your Story's World: See What Would Change lists each series and what taking the newer records would change, before anything does.", outcome: 'A status line says it was done and where the copy of the game from before is kept.' },
  approachAgent: { preview: "Find An Agent on the Profile page says what each agent needs to see, how they would answer on today's record, their commission and where they stand aside, and that an approach is answered in about three days.", outcome: `${LOG} The Representation card shows the approach and the day the answer is due, then the answer with its reason.` },
  declineMandate: { preview: "The Representation card shows the agent's offer with every term, and Decline beside Sign.", outcome: `${LOG} The card goes back to Find An Agent.` },
  giveNotice: { preview: "Give Notice? states the thirty days, that they make no new submissions in that time, and whether commission is still due on what they submitted.", outcome: `${LOG} The Representation card shows the day it ends.` },
  renewMandate: { preview: "The Representation card shows the agent's word on renewing, with its reason, a month before the term ends; the button names the twelve months.", outcome: `${LOG} The card shows the new end of the term.` },
  signWith: { preview: "The Representation card lists the mandate's terms before Sign: the commission, what it covers, where the agent stands aside, the twelve months and the notice.", outcome: `${LOG} The card shows who represents you and until when.` },
  submitThrough: { preview: "Under the backer on the Budget page: that the agent can submit the project, and their share of the money if it is signed; the backer's own lines above give the documents sent and the days they take to answer.", outcome: `${LOG} Backers shows the approach as submitted by the agent, and the Representation card lists it.` },
  commissionWriting: { preview: "Writing Work on the Crew page states the pass's working days, the writer's day rate and the cost before Commission This Pass.", outcome: `${LOG} The writer's panel shows the pass and the day it is on.` },
  requestRevision: { preview: 'The delivered pass states how many working days a revision takes and what it costs before Ask For A Revision.', outcome: "The writer's panel shows the revision under way; its delivery is logged." },
  pitchToStudio: { preview: "Pitch To A Studio on the Budget page shows what each studio would say today, with its reasons, what it makes, and that it answers in about two weeks, before Send The Pitch. Sending costs nothing.", outcome: `${LOG} The Backers list shows the studio as Considering, then its answer with what counted for and against.` },
  setReleaseVersion: { preview: "The version field on a planned release states the dubbed version's cost, that it is set aside now and paid on release, and what a dubbed territory counts for in the distributor's reports.", outcome: `${LOG} The release row shows the version; the budget shows the line.` },
  negotiate: { preview: "On a counteroffer's row: who negotiates, the cost (one of the line producer's days), how much more than the offer is asked over the person's days, and that they may not come down, before Ask To Negotiate.", outcome: `${LOG} The row says what the negotiation brought back; the line producer's own row says what their negotiations cost and saved.` },
  startSearch: { preview: "Under the part on the Cast page: who runs the search, how many performers they would bring, the day they would read, and the cost (two of the casting director's days), before Ask To Run A Search.", outcome: `${LOG} The search's line under the part says who was asked and who read, and the readings appear in the part's auditions.` },
  sendForApproval: { preview: "Adaptation Rights states that the rights holder reads the approved draft before production and answers within seven days, from what the script is declared to change; a change outside the agreement is named above the button.", outcome: `${LOG} The card shows the day their answer is due, then the answer with its reason, and the chain of title gains the line.` },
  widenAgreement: { preview: 'Each Widen button on Adaptation Rights names the freer approach and what the difference costs now.', outcome: 'The chain of title gains the widening with what was paid, the card says what the agreement now lets the script change, and Spent on the Summary rises by it.' },
  takeOption: { preview: 'Adaptation Rights on the Budget page states the option fee, its eighteen months, that it counts towards the price, and what it covers; the button names the fee.', outcome: 'The card says Option Held, the Chain Of Title gains the option with its fee and the day it runs out, and Spent on the Summary rises by the fee.' },
  renewOption: { preview: 'Adaptation Rights states the renewal fee, its twelve months and that it does not count towards the price; the button names the fee.', outcome: 'The Chain Of Title gains the renewal and the new day the option runs out; the Renew button goes, since one renewal is all it allows.' },
  approveGuideMe: { preview: 'The Guide Me dialog lists each job, who would be offered it, at what day rate for how many days, the plan\'s cost, the money uncommitted and the ceiling; a ceiling above the money or a second mandate is refused with the reason.', outcome: 'Offers go out at once, each marked Guide Me on the ledger; the department shows what is committed against the ceiling and anything returned to you; the log says it began.' },
  acceptJob: { preview: 'Profile, Work For Others lists the role, the invented production and company, the days, the day rate, the total if every day is worked, and the agent\'s share; a clash with your own shoot days or another job is said under it.', outcome: 'The days go on the calendar; each morning in town is worked or missed, and the log says which; after the last day the pay arrives in your account, less commission, and the credit is listed.' },
  syncMusicTasks: { preview: 'The brief says what it will score and why before Take This Brief; the themes review says that a round of notes is days of the composer\'s work before Give Notes.', outcome: 'The Production page lists the score\'s steps (spotting, themes, any revision round, composition, stems), sized to the cue plan; a silent brief takes score work not yet started away.' },
  requestLicence: { preview: 'The Ask form on the Music page says what both holders would likely ask in all for the scope chosen, that they answer in days, and that a broad request is refused more often; a scope that can\'t be asked is said instead.', outcome: 'The request is listed as Asked with the day its answers are due; the log says both holders were asked.' },
  agreeLicence: { preview: 'The quote shows each holder\'s price and the total on the button, Agree For $X.', outcome: 'The licence is listed as Agreed with its scope and the date it runs until; the total is a Licence line on the Budget page.' },
  replaceWithLibrary: { preview: 'The button says the library fee, Replace With Library Music For $X, and the line under it the terms (every medium, worldwide, 10 years) and that a finished mix takes half a day to lay it in.', outcome: 'A Library Track card shows its licence as Agreed until its date, the fee is a Licence line on the Budget page, and the song\'s scenes play the track.' },
  syncSongTasks: { preview: 'The library button\'s line says a finished mix takes half a day to lay the track in.', outcome: 'The Production page lists Lay The Track Into The Final Mix for each episode whose mix was done.' },
  renewLicence: { preview: 'The button says what renewing costs, and the line beside it the years it adds from when it runs out.', outcome: 'The licence runs to its new date, the renewal is a Licence Renewed line on the Budget page, and releases inside it can be planned again.' },
  takeHome: { preview: 'The Your Own Account card on a delivered project says how much income and how much of your own unspent money it can send home, on each button.', outcome: 'The money leaves the project as a Taken Home line and arrives in your account; Profile, Your Money lists it as taken home, and a family investment\'s share as theirs.' },
  exerciseOption: { preview: 'Adaptation Rights states the price of the rights and that the option fee counts towards it; the button names what is still to pay.', outcome: 'The card says Rights Bought, the Chain Of Title gains the purchase with the credit agreed, and production can be planned once the rights holder has approved the draft.' },
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
  ensureIndustry: { preview: 'Not a choice the player makes: the living world starts when a game opens with the film catalog installed (docs/WORLD.md). Home\'s In The Industry says that after the records end the save\'s world decides.', outcome: 'Each decision appears in In The Industry on Home and in the series\' In Your Story, marked Simulated.' },
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
