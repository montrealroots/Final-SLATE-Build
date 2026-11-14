// SLATE-19-03: a disabled action says why. Every `disabled={...}` in src/ui is listed here with where the player reads
// the reason, so a new disabled control fails this test until its reason is shown and recorded (November 8, 2026). The
// audit that built this list found these with no reason anywhere (Travel Here during a trip, Start A Sequel
// before delivery, Start Cut Pass before the assembly, Add Version for a name in use, the acting title before
// pronouns, Mark As Checked before research, and the Crew and Schedule pages of a delivered project); each now says.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FIELD = 'Waits for the text field just above it; the field says what to enter.';
const DELIVERED_SCRIPT = 'The Script page says the project has been delivered and the script is locked.';
const REASONS: Record<string, string> = {
  'Creation.tsx | !d.pronouns': 'Choose your pronouns first, under the buttons.',
  'FinishViews.tsx | !VERSION_LABELS.some((l) => l === label && !(p.versions ?? []).some((v) => v.label === l))': 'The runtime line says a version with that name exists already.',
  'FinishViews.tsx | !assemblyComplete(p) || p.edit.pictureLocked || !!cutting': 'A line under the buttons says a cut pass waits for the assembly; Picture says Locked; Cut Passes shows a pass under way.',
  'Papers.tsx | !!no': 'Under the button: the application is already being decided.',
  'PlanViews.tsx | !!parsed && !parsed.ok': 'The planned budget field says what is wrong with the amount typed.',
  'FinishViews.tsx | !el.eligible || !!docs': 'The dialog lists why the entry can\'t be submitted, and the missing documents.',
  'FinishViews.tsx | !pick.length || p.edit.pictureLocked': 'Choose scenes in the list above; Picture says Locked.',
  'FinishViews.tsx | db.length > 0': 'The list above the button names what delivery still needs.',
  'WorkViews.tsx | !title.trim()': 'A line under Add Song says to give the song a title.',
  'WorkViews.tsx | !sceneId': 'A line beside Use In Scene says to choose a scene.',
  "WorkViews.tsx | on.trim() === '' && heard.trim() === ''": 'A line beside Record says to enter the minutes; the status says it is not recorded.',
  'FinishViews.tsx | lb.length > 0': '"Before you lock:" lists what is missing.',
  'FinishViews.tsx | !!needs': 'The offer shows what accepting it needs.',
  'Places.tsx | !!g.travel': 'The trip line says you are travelling already.',
  'PlanViews.tsx | !!d.counter && !d.counter.outcome': 'The counter line says when their answer is due and that the offer can\'t be accepted until then.',
  'PlanViews.tsx | !o.ready': 'The backer row shows what approaching them needs.',
  'StudioPitch.tsx | !!o.needs': "The studio's row shows what pitching to it needs.",
  'PlanViews.tsx | !proposal.proposals.length': 'The staffing dialog lists why each role was skipped.',
  'PlanViews.tsx | !!why': 'The reason is shown beside the button (and as its title for Invite To Read).',
  'PlanViews.tsx | !!p.delivered': 'The Crew and Schedule pages say the project has been delivered.',
  'Projects.tsx | !!canContinue(p) || !Number.isInteger(years)': 'The reason (deliver it first, or it already has one) is shown above the button; the years field beside it is empty until a whole number is entered.',
  'Projects.tsx | !add': 'Waits for a language to be chosen in the list beside it.',
  'Projects.tsx | locked': 'The budget size says it is available after you deliver a project.',
  'ScriptViews.tsx | locked': DELIVERED_SCRIPT,
  'ScriptViews.tsx | !!p.delivered': DELIVERED_SCRIPT,
  'ScriptViews.tsx | !!p.delivered || first': 'The first character has nowhere higher to go, and the last nowhere lower; a delivered script says it is locked at the top of the page.',
  'ScriptViews.tsx | !!p.delivered || last': 'The first character has nowhere higher to go, and the last nowhere lower; a delivered script says it is locked at the top of the page.',
  'ScriptViews.tsx | !subject.trim() || !!p.delivered': 'Waits for the subject typed beside it; a delivered project is locked at the top of the page.',
  'ScriptViews.tsx | !!why': 'The Split dialog says what is missing under the scenes: none ticked, all of them ticked, or no name.',
  'ScriptViews.tsx | !!p.delivered || scenes < 2': 'The card says how many scenes the character is in: one scene can\'t be split; a delivered script is locked at the top of the page.',
  'ScriptViews.tsx | !!refusal': 'The dialog says why above the buttons: someone is contracted or has an offer for the part, or it has contracts or filmed work behind it, and Set Aside is offered instead.',
  'ReviseBrief.tsx | !!pre.refusal': 'The dialog says why above the fields: the script is delivered, or a draft is approved and work has begun on it.',
  'PlanViews.tsx | !!no': 'The dialog says why under the ceiling field: no approved draft, a mandate already running, a ceiling of nothing, or more than the money uncommitted.',
  'FirstLook.tsx | !!fl || (!!offer.counter && !offer.counter.outcome)': 'The running deal shows on the same card, and a request for more overhead says when the studio answers it.',
  'FirstLook.tsx | !!offer.counter': 'The line above the buttons says what you asked for and what the studio answered.',
  'Jobs.tsx | !!j.counter': 'The line above the buttons says what you asked for and what the production answered.',
  'MusicCatalog.tsx | listed': 'The button itself reads Considered For Composer, and the line under the list says where to approach them.',
  'MusicCatalog.tsx | have': 'The button itself reads In This Project.',
  'ReleasePlan.tsx | !!no': 'The reason shows under the button: a missing route, territory, date or document, money the project lacks, rights another deal holds, or a buyer who already answered.',
  'FirstLook.tsx | !!no': 'The reason shows under the field once an amount is typed: more than the fund has left, a project already submitted, or a project the deal does not cover.',
  'YourMoney.tsx | !!no': 'The reason shows under the field once an amount is typed: more than your account holds, more than the project still needs, or a script not yet approved.',
  'YourMoney.tsx | home.earnings <= 0': 'The line above says how much income the delivered project can send home: nothing, here.',
  'YourMoney.tsx | home.capital <= 0': 'The line above says how much of your own unspent money it can send home: nothing, here.',
  'MusicTab.tsx | !note.trim()': 'Waits for the note typed above it.',
  'MusicTab.tsx | !!libraryRefusal(p, s.id)': 'The line under the buttons says why: the song is performed on screen in footage already shot, or the project is delivered.',
  'MusicTab.tsx | !!p.delivered': 'A delivered project says Delivered at the top of every page; its music is final.',
  'MusicTab.tsx | !!no': 'The line above the buttons says what is missing: a medium, a country, the years, or that a request is already open.',
  'MusicTab.tsx | p.edit.pictureLocked': 'The line under it says the picture is locked: unlock it, or use a version without the song.',
  'Jobs.tsx | !!no': 'Under the offer: your own project shoots on one of its days, you are working another job then, or it has lapsed.',
  'AdaptWork.tsx | locked': 'The budget size says it is available after you deliver a project.',
  'Equipment.tsx | !!service': 'Under the item: away being serviced, or not enough in your account; an item at 100% shows its condition and needs nothing.',
  'Equipment.tsx | !!sell': 'Under the item: it is in a project\'s kit, named.',
  'Equipment.tsx | !!no': 'Under the item: in the shop, what it costs against what your account holds; in a kit, the item booked on another shoot that date, or the kit already has a camera.',
  'ScriptViews.tsx | !accepted.length || !!p.revision || !!p.delivered': 'The button counts accepted notes; a revision under way is shown on the page; the script is locked once delivered.',
  'ScriptViews.tsx | !undoStack.get(p.id)?.length || locked': 'Nothing to undo yet; or the script is locked once delivered.',
  'ScriptViews.tsx | locked || (!changed && p.drafts.length > 0)': 'Nothing changed since the last draft; or the script is locked once delivered.',
  'ScriptViews.tsx | first || !!refusal': 'The first episode can\'t move earlier; a refusal is shown under the plan.',
  'ScriptViews.tsx | last || !!refusal': 'The last episode can\'t move later; a refusal is shown under the plan.',
  'ScriptViews.tsx | !title.trim() || title.trim() === e.title': FIELD,
  'ScriptViews.tsx | !a || !b || a === b || !kind.trim()': 'Waits for two different characters and what the relationship is, in the fields above.',
  "ScriptViews.tsx | !p.tasks.some((t) => t.kind === 'doc:factcheck' && t.status === 'done') && !p.tasks.some((t) => t.kind === 'doc:research' && t.status === 'done')": 'A line under Facts says a fact can be checked once research or a fact check is done.',
  'Shell.tsx | blocked': 'The clock says Asleep; a read-only save or a processing problem shows its own banner; while busy the game is processing.',
  'Startup.tsx | !ready': 'The page asks you to choose a replacement for each missing place.',
  "SavedGames.tsx | stage.kind === 'busy'": 'The button reads Importing… while it works.',
  'IdeaPicker.tsx | !sentence': "Under Your Logline: the parts chosen don't go together, and it says to change one.",
  'DataPacks.tsx | busy': 'A status line under the mods says what is downloading or installing, with how much is done. Sign In and Take The Newer Records are disabled only while they are working, and report beside themselves.',
  'WorldPicker.tsx | !!busy': 'A place is being opened; the list shows it loading.',
  "WorldPicker.tsx | ws.status !== 'ready'": 'Loading places… is shown until the regions arrive.',
  'WorldView.tsx | !!opening': 'A place is being opened.',
  'WorldView.tsx | !ws.country': 'Choose a country first, in the field above.',
  'FinishViews.tsx | cutting': 'The episode row says a cut pass is under way; it is listed among what holds it back.',
  'FinishViews.tsx | lockWhy.length > 0': 'The episode row lists what must happen before it can be locked.',
  'FinishViews.tsx | why.length > 0': 'The episode row says what is holding it back.',
  'Catalog.tsx | at === 0': 'The line above the list says which page of how many is shown.',
  'Catalog.tsx | at >= pages - 1': 'The line above the list says which page of how many is shown.',
  'Representation.tsx | !!no': 'The line under the agent in Find An Agent gives the reason they can\'t be approached now.',
  'components.tsx | props.disabled': 'Passed through from the caller, which is listed here in its own right.',
};
for (const f of ['!act.trim()', '!change.trim()', '!changing.kind.trim()', '!changing.rule.trim()', '!claim.trim()', '!label.trim()', '!name.trim()', '!q.trim()', '!rule.trim()', '!thread.trim()', '!text.trim()']) REASONS[`ScriptViews.tsx | ${f}`] = FIELD;
REASONS['World.tsx | !title.trim()'] = 'Waits for a title for the new project, in the field above.';

function disabledControls(): Set<string> {
  const out = new Set<string>();
  for (const f of readdirSync('src/ui').filter((x) => x.endsWith('.tsx'))) {
    const s = readFileSync(`src/ui/${f}`, 'utf8');
    for (const m of s.matchAll(/disabled=\{/g)) {
      let i = m.index! + 10;
      for (let depth = 1; depth; i++) depth += s[i] === '{' ? 1 : s[i] === '}' ? -1 : 0;
      out.add(`${f} | ${s.slice(m.index! + 10, i - 1)}`);
    }
  }
  return out;
}

describe('disabled actions say why', () => {
  it('every disabled control in the interface is recorded with where its reason is shown, and no record is stale', () => {
    const found = disabledControls();
    expect([...found].filter((k) => !REASONS[k])).toEqual([]);
    expect(Object.keys(REASONS).filter((k) => !found.has(k))).toEqual([]);
  });
});
