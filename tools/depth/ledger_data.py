# Reconciliation of the SLATE Gameplay Depth package against Final-SLATE-Build (November 8, 2026).
# Statuses: VE = VERIFIED EXISTING, V = VERIFIED, IU = IMPLEMENTED UNVERIFIED, NR = NEEDS REPAIR, MI = MISSING,
# EB = EXTERNAL BLOCKER. Evidence: "path::fragment", the fragment being words in that file (the checker reads them).
S = {'VE': 'VERIFIED EXISTING', 'V': 'VERIFIED', 'IU': 'IMPLEMENTED UNVERIFIED', 'NR': 'NEEDS REPAIR', 'MI': 'MISSING', 'EB': 'EXTERNAL BLOCKER'}

# parent id -> (ui_entry, engine_files, [(child requirement, status, evidence list, gap)])
C = {
'01-01': ('Creation > Identity', 'src/engine/identity.ts; src/engine/state.ts', [
  ('Enter first, middle and last name, preferred name and pronouns; the acting title follows the pronouns', 'VE',
   ['tests/identity.test.ts::credits carry the legal name', 'tests/creation.test.ts::pronouns settle the billing'], ''),
  ('A missing or invalid entry keeps every other entry and names what to fix', 'VE',
   ['e2e/creation.spec.ts::a step with something missing says what', 'tests/creation.test.ts::every validation problem points at the screen'], ''),
  ('The legal name carries into credits; the preferred name into Home, the rail, Profile and saves', 'VE',
   ['tests/identity.test.ts::credits carry the legal name', 'e2e/identity.spec.ts::a preferred name, a headshot and a citizenship'], ''),
  ('Everything entered survives save, reload and older saves', 'VE',
   ['tests/creation.test.ts::everything entered survives a save and reopen', 'tests/identity.test.ts::a version 5 save gets its name in parts'], ''),
]),
'01-02': ('Creation > Background & Languages', 'src/data/identity.ts; src/engine/identity.ts; src/data/country-languages.ts', [
  ('Several ethnicities and several nationalities, at least one of each', 'VE',
   ['tests/identity.test.ts::Ethnicity offers peoples and the broad groups', 'e2e/creation.spec.ts::ethnicity and nationality are both asked'], ''),
  ('A main language and others with a proficiency; suggestions are marked, never chosen for you', 'VE',
   ['e2e/creation.spec.ts::backgrounds drive the game', 'tests/identity.test.ts::a nationality suggests what its word did'], ''),
  ('A duplicate or blank entry in your own words is refused with a reason', 'V',
   ['e2e/creation.spec.ts::an ethnicity in your own words: blank or repeated is refused'], ''),
  ('Languages decide coaching and casting fit; heritage informs casting and never scores', 'VE',
   ['tests/heritage.test.ts::a performer from the pool', 'tests/identity.test.ts::casting a Cuban woman'], ''),
  ('Saves and drafts from before the split convert without loss', 'VE',
   ['tests/identity.test.ts::a version 6 save: nationality words become countries', 'tests/creation.test.ts::a draft from before nationality was asked'], ''),
]),
'01-03': ('Creation > Identity, Starting Point', 'src/engine/state.ts; src/engine/time.ts; src/ui/WorldPicker.tsx', [
  ('Birthplace, where you live, birth date and a start from 2026 (default) to 2050 with a time; at least 19 that day', 'VE',
   ['tests/dates.test.ts::you must be at least 19 on the starting date', 'e2e/creation.spec.ts::Starting Point: featured cities A to Z'],
   'Owner decision of November 8, 2026 widened the package\'s 2026-only start to 2026-2050'),
  ('Local context before confirming: zone, date and time in words, population, the chosen place on the map', 'VE',
   ['e2e/creation.spec.ts::Starting Point: featured cities A to Z'], ''),
  ('The life starts at the chosen local time and zone; birthdays and holidays follow it', 'VE',
   ['tests/foundation.test.ts::starts the life at the chosen local time', 'tests/foundation.test.ts::a whole simulated year fires each birthday'], ''),
  ('Impossible dates and unavailable places block starting, with editing and Try Again', 'VE',
   ['tests/dates.test.ts::creation refuses impossible birth and start dates', 'e2e/world.spec.ts::a failed place load offers Try Again'], ''),
]),
'01-04': ('Review, Projects > Cast, Script', 'src/engine/hiring.ts; src/engine/finish.ts', [
  ('Screenwriter, producer, director and actor or actress from the start', 'VE',
   ['e2e/careers.spec.ts::writing, producing and directing without acting'], ''),
  ('Acting is chosen per project; no acting means no acting credit', 'VE',
   ['tests/journeys.test.ts::the player behind the camera only gets no acting credit'], ''),
  ('Credits follow the work actually done', 'VE', ['tests/journeys.test.ts::runs from script to delivery'], ''),
  ('Acting on a day you also direct is a visible constraint on that day', 'V',
   ['tests/schedule.test.ts::a day you act on is marked'], ''),
  ('Handing writing or directing of an episode to someone else keeps your authorship of work already done', 'V',
   ['tests/handover.test.ts::a writer replaced after their draft was approved', 'tests/handover.test.ts::a director replaced after a day of their episode was shot'], ''),
]),
'01-05': ('Creation > Review', 'src/engine/state.ts; src/engine/save.ts', [
  ('The draft is saved as you go and reopens on the same step', 'VE',
   ['e2e/creation.spec.ts::a reload in the middle of creation reopens the same step'], ''),
  ('Each Review card edits its step and returns to Review', 'VE',
   ['e2e/creation.spec.ts::each Review edit goes to the step it names'], ''),
  ('Start My Story with something missing goes to that step', 'VE',
   ['e2e/creation.spec.ts::Start My Story with something missing goes to that step'], ''),
  ('Starting twice (double press, two tabs) creates one life, and the draft becomes the save', 'V',
   ['e2e/creation.spec.ts::pressing Start My Story twice starts one life'], ''),
]),
'02-01': ('Shell clock', 'src/engine/clock.ts', [
  ('One real second is one game second while visible', 'VE', ['tests/foundation.test.ts::60 s of measured real time gives 60 game seconds'], ''),
  ('Hidden tabs and suspension stop the clock with no catch-up', 'VE',
   ['tests/foundation.test.ts::suspension stops accumulation and resume does not catch up', 'e2e/viewports.spec.ts::the clock runs 1:1 while visible'], ''),
  ('A second tab cannot run the same save', 'VE',
   ['tests/foundation.test.ts::only one live tab may run a save', 'e2e/viewports.spec.ts::a second tab opens the same save read-only'], ''),
  ('Closing and reopening continues at the saved instant', 'VE', ['e2e/viewports.spec.ts::reloading the page and continuing at once'], ''),
]),
'02-02': ('Shell > Advance, Sleep', 'src/engine/state.ts', [
  ('Advance by a duration or to the next event; Sleep to an alarm', 'VE', ['tests/foundation.test.ts::Advance stops at a reminder'], ''),
  ('Sleep wakes for obligations by default; snoozing past one misses it', 'VE', ['tests/foundation.test.ts::sleep wakes for obligations by default'], ''),
  ('A failed event batch rolls back and runs exactly once after the fault', 'VE',
   ['tests/processing.test.ts::rolls the batch back', 'e2e/failures.spec.ts::a failure while time passes pauses time'], ''),
  ('Before advancing, the commitments the advance will pass are listed', 'V',
   ['e2e/viewports.spec.ts::Advance lists the plans it will pass'], ''),
  ('There is no manual pause control', 'V', ['e2e/viewports.spec.ts::there is nothing to pause the clock with'], ''),
]),
'02-03': ('World, Calendar, Profile', 'src/world/gazetteer; src/engine/state.ts', [
  ('Find any country or territory, region and place', 'VE',
   ['tests/gazetteer.test.ts::lists every entry', 'e2e/world.spec.ts::a life can start anywhere in the world'], ''),
  ('A place shows its zone, climate source and holidays', 'VE', ['e2e/world.spec.ts::a place says where its climate comes from'], ''),
  ('Travel takes time by distance; an arrival too late is refused with the reason', 'VE',
   ['tests/season.test.ts::invites with a reply deadline; travel must arrive in time'], ''),
  ('A place that cannot be loaded is named, with Try Again', 'VE',
   ['tests/gazetteer.test.ts::retries a failed load', 'e2e/failures.spec.ts::holiday dates and the map that fail to load are explained'], ''),
]),
'02-04': ('Places > forecast, Schedule', 'src/engine/weather.ts; src/engine/production/shoot.ts', [
  ('A forecast for the coming days, reproducible, true on the day', 'VE', ['tests/foundation.test.ts::forecasts are reproducible'], ''),
  ('Weather differs by place, season and hemisphere', 'VE', ['tests/foundation.test.ts::is deterministic, bounded and seasonal by hemisphere'], ''),
  ('A wet exterior day can be swapped with an interior day, shot anyway or moved', 'V',
   ['tests/schedule.test.ts::swaps dates with the next interior day', 'tests/schedule.test.ts::shooting anyway is recorded on the day'], ''),
  ('A moved day keeps its costs, bookings and history', 'VE', ['tests/schedule.test.ts::moves a day to the first free working day'], ''),
  ('Night and day scenes respect daylight at the place and date', 'V', ['tests/schedule.test.ts::polar night an exterior day scene is not shot'], ''),
]),
'02-05': ('Calendar, Home', 'src/engine/state.ts; src/engine/awards.ts', [
  ('Plans with reminders; Advance stops at a reminder', 'VE', ['e2e/screenings.spec.ts::the 30-minute reminder'], ''),
  ('Invitations are accepted, declined or expire; decisions keep their consequences', 'VE',
   ['tests/season.test.ts::invites with a reply deadline', 'e2e/screenings.spec.ts::declining keeps the selection'], ''),
  ('Conflicts name the commitment in the way', 'VE', ['tests/schedule.test.ts::refuses when someone needed on set is busy'], ''),
  ('Event buttons say what they do (Travel To The Venue, Accept Invitation)', 'VE', ['e2e/screenings.spec.ts::accept, travel to the venue'], ''),
  ('Birthdays, kept holidays and project days share the calendar', 'VE',
   ['tests/foundation.test.ts::a whole simulated year fires each birthday', 'e2e/creation.spec.ts::Home says so on the second day'], ''),
]),
'03-01': ('Projects > New Script', 'src/engine/projects.ts', [
  ('Format, basis, medium and technique chosen separately', 'VE', ['tests/media.test.ts::follows boards, animatic, voice and animation dependencies'], ''),
  ('Each combination routes to its own production', 'VE',
   ['e2e/journeys.spec.ts::hybrid: a live-action scene and a 3D scene share one production', 'e2e/journeys.spec.ts::stop motion to delivery'], ''),
  ('An unsupported combination says why and is not converted', 'IU', [], 'validateAxes refuses with a message; no test'),
]),
'03-02': ('New Script, Overview', 'src/engine/genres.ts; src/engine/script-effects.ts', [
  ('Title, several genres, tone, setting, audience and dialogue languages', 'VE', ['tests/genres.test.ts::composes shared mechanics once'], ''),
  ('Genres raise their questions and requirements', 'VE', ['tests/genres.test.ts::every entry reaches a consumer'], ''),
  ('A genre never grants prestige or quality by itself', 'VE', ['tests/genres.test.ts::genres route to award and festival categories by rule, not prestige'], ''),
]),
'03-03': ('New Script, Budget', 'src/engine/estimate.ts', [
  ('Runtime, scenes, cast and technique drive the estimate', 'VE', ['tests/tight-budget.test.ts::follows what the script needs'], ''),
  ('An estimate over what can be raised offers concrete ways to cut cost', 'V',
   ['tests/cost-cuts.test.ts::lists cuts with their savings', 'tests/cost-cuts.test.ts::the saving shown is what the estimate really drops by'], ''),
]),
'03-04': ('Projects list, Overview', 'src/engine/projects.ts', [
  ('Create, save and reopen a project by a stable ID', 'VE', ['tests/journeys.test.ts::runs from script to delivery'], ''),
  ('Shelving or cancelling a project settles its commitments and keeps its history', 'V',
   ['tests/shelve.test.ts::says what it will do; then releases people', 'tests/shelve.test.ts::refuses changes and hiring until it is taken up again', 'e2e/structure.spec.ts::a project shelved and taken up again'], ''),
  ('Projects with the same title stay distinguishable', 'IU', [], 'IDs differ; the list shows only titles'),
]),
'03-05': ('Overview', 'src/engine/projects.ts', [
  ('The stages a project will go through, and what each needs, are shown before development', 'IU', [],
   'projectModules drives the tabs; no test of the explanation'),
  ('No inert control appears as implemented', 'VE', ['e2e/viewports.spec.ts::no tutorial, no excluded systems'], ''),
]),
'04-01': ('Script > Story', 'src/engine/script-effects.ts', [
  ('Premise, logline, question, stakes, theme and intended experience, revised freely', 'VE',
   ['tests/screenwriting.test.ts::filling every text field with anything moves the score only a little'], ''),
  ('Completeness is checked; prose is never judged', 'VE', ['tests/screenwriting.test.ts::nothing is guessed from prose'], ''),
]),
'04-02': ('Script > Scenes', 'src/engine/projects.ts', [
  ('Turning points per scene and a declared nonlinear structure', 'VE',
   ['tests/script-effects.test.ts::a nonlinear structure (payoff shown first, marked deliberate)'], ''),
  ('Acts or sequences group scenes, and story threads connect scenes and characters', 'V',
   ['tests/structure.test.ts::group scenes; an empty act is noted', 'tests/structure.test.ts::deleting the resolving scene names what broke', 'e2e/structure.spec.ts::acts, threads, research and arcs kept'], ''),
  ('A thread left open on purpose is a valid choice', 'V', ['tests/structure.test.ts::either way is valid and only an unchosen one is noted'], ''),
]),
'04-03': ('Script > Setups And Payoffs, Edit', 'src/engine/finish.ts', [
  ('Declare a setup, where it is planted and where it pays off', 'VE', ['e2e/script-rules.spec.ts::a supporting antagonist, an incomplete pitch'], ''),
  ('Cutting a planting scene warns the payoff loses its setup', 'VE', ['tests/script-effects.test.ts::cutting a scene that plants a clue'], ''),
  ('Restore the scene or move the setup', 'VE', ['e2e/script-rules.spec.ts::an essential scene cut then picked up'], ''),
]),
'04-04': ('Script', 'src/engine/projects.ts', [
  ('Documentary claims carry a source note and a checked status', 'VE', ['tests/unscripted.test.ts::factual shows need claims to check'], ''),
  ('Fiction research questions and references, marked reviewed or uncertain', 'V',
   ['tests/structure.test.ts::note open and uncertain questions on their scenes'], ''),
]),
'04-05': ('Script > Documents, Budget > Backers', 'src/engine/finance.ts; src/engine/script-effects.ts', [
  ('Outline, treatment, pitch and statement; what is missing is named by field', 'VE',
   ['tests/script-effects.test.ts::a grant application names the documents and fields it still needs'], ''),
  ('A backer receives the documents as they were when sent; later edits do not change what was sent', 'V',
   ['tests/finance.test.ts::keeps each document word for word with the approved draft'], ''),
]),
'05-01': ('Script > Characters', 'src/engine/projects.ts', [
  ('Name, pronouns, age in story, description and background', 'VE', ['tests/identity.test.ts::casting a Cuban woman'], ''),
  ('Aliases', 'V', ['tests/scenes.test.ts::renaming changes the name everywhere'], ''),
  ('Renaming keeps every link by ID and the history', 'V', ['tests/scenes.test.ts::every scene, line and setup still points at the same ID'], ''),
]),
'05-02': ('Character editor', 'src/engine/script-effects.ts', [
  ('Size, several functions and award placement chosen separately', 'VE', ['tests/script-effects.test.ts::a supporting antagonist stays supporting'], ''),
  ('Award entries follow placement and organizer rules, never the story function', 'VE', ['tests/script-effects.test.ts::in a real entry: the antagonist is offered for supporting'], ''),
]),
'05-03': ('Character editor', 'src/engine/production/tasks.ts; src/engine/mocap.ts', [
  ('Being type and performance methods drive the work (voice, capture, puppet, creature)', 'VE',
   ['tests/media.test.ts::cannot animate before rigs exist', 'tests/lunar-mocap.test.ts::capture sessions feed animation'], ''),
  ('One method never fulfils another (a voice session is not capture)', 'IU', [], 'Separate tasks exist; no test asserts it'),
]),
'05-04': ('Script > Relationships', 'src/engine/projects.ts', [
  ('Wants and fears per character; directed relationships between characters', 'IU', [], 'Fields and editor exist; no test'),
  ('Arc beats tied to scenes', 'V', ['tests/structure.test.ts::a beat goes only in a scene the character is in'], ''),
  ('Removing a character previews dependent scenes and relationships first', 'V', ['tests/scenes.test.ts::removing a character lists the scenes that use them'], ''),
]),
'05-05': ('Script > Characters, Cast', 'src/engine/hiring.ts', [
  ('Scenes and episodes a character appears in drive casting days and credits', 'VE',
   ['tests/script-effects.test.ts::series regulars are booked for every episode'], ''),
  ('A character in no scene creates no booking, fee or credit', 'IU', [], 'neededRoles skips them; no test'),
]),
'06-01': ('Script > Scene editor', 'src/engine/projects.ts', [
  ('Episode, place, interior or exterior, time of day, participants and length', 'VE', ['tests/media.test.ts::produces episodes with episode-specific credits'], ''),
  ('Impossible or missing combinations give an actionable message', 'VE', ['tests/screenwriting.test.ts::a readiness check counts only once revised'], ''),
]),
'06-02': ('Scene editor', 'src/engine/script-explain.ts', [
  ('Action and dialogue with speakers and languages', 'VE', ['tests/script-effects.test.ts::subtitles are priced by runtime for each language'], ''),
  ('Length is not quality', 'VE', ['tests/script-effects.test.ts::meaningless text manufactures no quality'], ''),
  ('A line whose speaker is no longer in the scene asks for repair', 'IU', [], 'scriptIssues reports it; no test'),
]),
'06-03': ('Scene editor > Breakdown', 'src/engine/projects.ts', [
  ('Props, crowd, animals, stunts, intimacy, music, vehicles and effects declared per scene', 'VE',
   ['tests/screenwriting.test.ts::the same scene with and without a stunt'], ''),
  ('Removing a requirement previews the bookings and assets it strands', 'V', ['tests/scenes.test.ts::names the requirement and whoever is booked only for it'], ''),
]),
'06-04': ('Script > Scenes', 'src/engine/projects.ts', [
  ('Insert and reorder scenes', 'VE', ['e2e/careers.spec.ts::an approved scene changed after filming'], ''),
  ('Duplicate a scene (new ID), split one in two, combine two, remapping links explicitly', 'V',
   ['tests/scenes.test.ts::makes a new scene with its own ID', 'tests/scenes.test.ts::splits before a line', 'tests/scenes.test.ts::folds a scene into another', 'e2e/structure.spec.ts::scenes duplicated, split and combined'], ''),
  ('Cut from the edit and restore', 'VE', ['tests/script-effects.test.ts::missing footage names the scene and the choices'], ''),
]),
'06-05': ('Script > Drafts', 'src/engine/projects.ts; src/engine/production.ts', [
  ('Save a draft, compare, restore; the working copy stays separate', 'VE', ['tests/writing.test.ts::compares drafts, restores an earlier one'], ''),
  ('Re-approving after filming keeps unchanged scenes and redoes only changed ones', 'VE',
   ['tests/writing.test.ts::re-approving after filming keeps unchanged scenes', 'e2e/careers.spec.ts::an approved scene changed after filming'], ''),
  ('Repeated revision earns nothing', 'VE', ['tests/screenwriting.test.ts::your own notes and repeated revision passes add nothing'], ''),
]),
'07-01': ('Script (series)', 'src/engine/season.ts', [
  ('World rules and relationships shared across episodes', 'V',
   ['tests/episodes.test.ts::a relationship touches every scene its two characters share', 'e2e/season.spec.ts::A relationship touches every scene its two characters share'], ''),
  ('Changing a shared fact previews the episodes it touches', 'V',
   ['tests/episodes.test.ts::a rule lists the scenes that rely on it, by episode, and which are recorded', 'e2e/season.spec.ts::changing a shared fact says which episodes it touches first'], ''),
]),
'07-02': ('Script, Schedule', 'src/engine/production/tasks.ts', [
  ('Episodes with titles and scenes; work and credits per episode', 'VE', ['tests/media.test.ts::produces episodes with episode-specific credits'], ''),
  ('A season arc and episode order', 'V',
   ['tests/episodes.test.ts::an episode moves with its scenes, in every draft, and its writer', 'e2e/season.spec.ts::a season planned and reordered'],
   'The arc is the writer\'s plan: advice notes only, carried into the next season; it scores nothing'),
  ('The estimate covers every episode, not one', 'IU', [], 'scriptEstimate sums scenes across episodes; no test'),
]),
'07-03': ('Cast', 'src/engine/hiring.ts', [
  ('Regulars, recurring parts and guests booked for the episodes they appear in', 'VE',
   ['tests/script-effects.test.ts::series regulars are booked for every episode', 'e2e/careers.spec.ts::a TV season: a regular and a guest'], ''),
  ('Episode credits follow appearances and work', 'VE', ['e2e/journeys.spec.ts::TV limited series: episodes, a guest role and episode-level credits'], ''),
]),
'07-04': ('Script > Episodes', 'src/engine/types.ts', [
  ('Each episode names its writer and director', 'V',
   ['tests/handover.test.ts::a writer replaced after their draft was approved', 'tests/episodes.test.ts::episodes with different directors never share a day'], ''),
  ('Block scheduling of episodes sharing sets and locations', 'V',
   ['tests/episodes.test.ts::in blocks, one director shoots both on one day', 'e2e/journeys.spec.ts::Shoot Episodes In Blocks'], ''),
]),
'07-05': ('Edit, Release', 'src/engine/finish.ts', [
  ('Deliver the season with per-episode credits', 'VE', ['e2e/careers.spec.ts::per-episode credits'], ''),
  ('A commissioner renews or cancels; a renewal starts a new season with returning cast and new contracts', 'V',
   ['tests/episodes.test.ts::a commissioner renews a season that turned out well', 'e2e/journeys.spec.ts::Start The Next Season'],
   'Renewal reads the assessment made at delivery (overall 60 or more): game calibration, not industry data'),
]),
'08-01': ('Budget', 'src/engine/estimate.ts; src/engine/budget.ts', [
  ('The estimate by category with contingency, separate from money in hand', 'VE', ['tests/finance.test.ts::a new project has an estimate and a target'], ''),
  ('A line with no available candidate is flagged as uncertain, never free', 'IU', [], 'projectedCost prices roles by rate; no test for a role with no candidate'),
]),
'08-02': ('Budget > Backers', 'src/engine/finance.ts', [
  ('Each backer says what it needs; send; an answer after some days', 'VE',
   ['tests/finance.test.ts::each backer says what it needs', 'tests/finance.test.ts::a grant and an investor answer after some days'], ''),
  ('A refusal says why and leaves other backers open', 'VE', ['e2e/first-project.spec.ts::a refusal, the agreed backing'], ''),
]),
'08-03': ('Budget > Backers', 'src/engine/finance.ts; src/engine/negotiation.ts', [
  ('Terms: amount, timing, recoupment, share, approvals, credit; accept or refuse', 'VE',
   ['tests/finance.test.ts::a commissioner pays most on signing', 'tests/finance.test.ts::a co-producer only joins a backed project'], ''),
  ('An offer that has expired cannot be accepted', 'V',
   ['tests/negotiation.test.ts::after its open days it can\'t be accepted', 'e2e/negotiation.spec.ts::Left unanswered past February 9, it lapses'],
   'Offers stay open 21 days (game calibration); offers made before this have no lapse date and stay open'),
  ('Negotiating a backer\'s terms', 'V',
   ['tests/negotiation.test.ts::they agree, keep their terms or take it back, by your leverage', 'e2e/negotiation.spec.ts::asking for better terms holds it while they consider'],
   'One request per offer; leverage (script notes, delivered work, a competing offer) sets the odds and the world seed settles it: game calibration'),
]),
'08-04': ('Budget', 'src/engine/budget.ts', [
  ('Reserved, committed, settled and cancelled amounts by line, from postings', 'VE', ['tests/ledger.test.ts::settle rejects malformed amounts, pays once per key'], ''),
  ('No negative, NaN or duplicate payments; a failed action charges nothing', 'VE',
   ['tests/ledger.test.ts::commit rejects NaN', 'tests/processing.test.ts::restores deep changes to projects, ledgers'], ''),
]),
'08-05': ('Budget', 'src/engine/finance.ts', [
  ('A shortfall stops spending with the exact amount; more backing resumes it', 'VE', ['e2e/careers.spec.ts::stop motion: refused for lack of money'], ''),
  ('Income repays backers in order, then shares', 'VE', ['tests/finance.test.ts::income repays backers first'], ''),
  ('Compare cutting scope against postponing or raising more', 'V', ['tests/cost-cuts.test.ts::the saving shown is what the estimate really drops by'], ''),
]),
'09-01': ('Cast > Find Performers', 'src/engine/hiring.ts; src/engine/people.ts', [
  ('Candidates with rates, languages, playing age, availability and shared background', 'VE', ['tests/identity.test.ts::casting a Cuban woman'], ''),
  ('A performer booked elsewhere is shown as unavailable with the dates', 'VE', ['e2e/careers.spec.ts::an offer to a performer booked elsewhere is turned down'], ''),
]),
'09-02': ('Cast', 'src/engine/auditions.ts; src/engine/casting-calls.ts', [
  ('Invite to audition, schedule it, see the read, shortlist', 'V',
   ['tests/auditions.test.ts::a read is a range that contains their real capability', 'e2e/auditions.spec.ts::each read is a range in words beside the rate and the fit notes'],
   'The read reveals the modeled capability that drives a performance; spreads and notice are game calibration'),
  ('Callbacks and chemistry reads', 'V',
   ['tests/auditions.test.ts::a callback narrows it, still containing it', 'tests/auditions.test.ts::which moves their performances in shared scenes', 'e2e/auditions.spec.ts::Nothing in particular between them, reading with you.'],
   'Chemistry is a modeled pair property (world seed), half-weighted into shared-scene performances: game calibration'),
  ('A missed or declined audition leaves the others; background casting skips auditions', 'V',
   ['tests/auditions.test.ts::someone booked on the session day declines, saying so, and the others still read', 'tests/auditions.test.ts::background parts, cast parts and repeat invitations are refused with a reason'], ''),
]),
'09-03': ('Cast', 'src/engine/hiring.ts', [
  ('Offer, then acceptance, refusal or counteroffer', 'VE', ['e2e/careers.spec.ts::an offer to a performer booked elsewhere is turned down'], ''),
  ('A booking reserves the dates and the money together; no double booking', 'VE', ['tests/schedule.test.ts::refuses when someone needed on set is busy'], ''),
  ('An unanswered offer lapses and releases what it held', 'IU', [], 'Offers resolve by responseAt; no test of a lapse'),
]),
'09-04': ('Cast', 'src/engine/hiring.ts; src/engine/mocap.ts', [
  ('Cast yourself or not, per part', 'VE', ['e2e/live-action.spec.ts::cast yourself'], ''),
  ('A replaced performer keeps pay and credit for work that stays', 'VE', ['tests/mocap-calendar.test.ts::keeps what they were paid'], ''),
]),
'09-05': ('Cast, Festivals', 'src/engine/awards.ts', [
  ('Credits by part, method and episode', 'VE', ['e2e/journeys.spec.ts::episode-level credits'], ''),
  ('Award entries name the people the organizer names', 'VE', ['tests/rulebooks.test.ts::project awards name the credited people'], ''),
]),
'10-01': ('Crew', 'src/engine/hiring.ts', [
  ('Required crew derived from the work', 'VE', ['tests/tight-budget.test.ts::staffing hires a required crew the money can pay'], ''),
  ('Each role says why it is needed', 'IU', [], 'Roles name their department; no test of the reason shown'),
  ('Unfilled required work stays blocked with the reason', 'VE', ['tests/tight-budget.test.ts::a voice session it can no longer pay'], ''),
]),
'10-02': ('Crew > Find', 'src/engine/hiring.ts', [
  ('Compare experience, rate and availability', 'VE', ['e2e/connected.spec.ts::a connected career'], ''),
  ('No candidate is an explicit gap', 'IU', [], 'Shown; no test'),
]),
'10-03': ('Crew', 'src/engine/hiring.ts', [
  ('Offer, book and assign dates; declines release only their reservations', 'VE', ['tests/tight-budget.test.ts::staffing hires a required crew'], ''),
]),
'10-04': ('Crew', 'src/engine/people.ts', [
  ('Combine compatible roles on small productions', 'VE', ['tests/tight-budget.test.ts::on a micro budget, one person takes the roles they can combine'], ''),
  ('A combined role works one task at a time', 'IU', [], 'teamFor assigns one task per worker per day; no test'),
]),
'10-05': ('Crew', 'src/engine/hiring.ts', [
  ('Releasing someone keeps done work, pay owed and credit', 'VE', ['tests/mocap-calendar.test.ts::still credited for the work that stays'], ''),
  ('A handover to a replacement mid-task', 'IU', [], 'releaseHire then a new hire; no test of the handover'),
]),
'11-01': ('Production > Readiness', 'src/engine/projects.ts', [
  ('Approved scenes become a breakdown of requirements', 'VE', ['tests/genres.test.ts::requirements come from scenes, not labels'], ''),
  ('Readiness links each unresolved item', 'VE', ['tests/genres.test.ts::its questions appear in readiness'], ''),
]),
'11-02': ('Production', 'src/engine/production/tasks.ts; src/engine/locations.ts', [
  ('Location scouting and permits as work with a cost', 'VE', ['tests/production-golden.test.ts::fixed-seed production outcomes are unchanged'], ''),
  ('Choose among scouted locations, keep a backup, lose one and fall back', 'V',
   ['tests/locations.test.ts::a site that falls through goes to the backup', 'tests/locations.test.ts::a place with no site after a loss loses its day', 'e2e/live-action.spec.ts::a cheaper stand-in with the real place as the backup'],
   'Three site kinds per place (real, stage set, stand-in); fees and risks are game calibration; no choice keeps the old behaviour'),
]),
'11-03': ('Production', 'src/engine/production.ts; src/engine/designs.ts', [
  ('Assets with versions and readiness; a design change rebuilds only what depends on it', 'VE',
   ['tests/media.test.ts::a design change reports its impact and rebuilds only affected work'], ''),
  ('Approve or reject a design before building', 'V',
   ['tests/designs.test.ts::builds wait for an approved design', 'e2e/media.spec.ts::Nothing is built until its design is approved (SLATE-11-03.02).'],
   'Projects started before November 8, 2026 build without approval (designReview unset)'),
  ('Damaged puppets are repaired', 'IU', [], 'maybePuppetDamage exists; no test'),
]),
'11-04': ('Schedule', 'src/engine/production/tasks.ts', [
  ('Rehearsal days, stunt and choreography rehearsal, storyboards and animatic as work', 'VE',
   ['tests/media.test.ts::follows boards, animatic, voice and animation dependencies'], ''),
  ('Preparation has a bounded effect', 'IU', [], 'Rehearsal days are capped; no test of the bound'),
]),
'11-05': ('Schedule', 'src/engine/production/schedule.ts; src/engine/callsheet.ts', [
  ('Plan shoot days by availability, holidays and six-day weeks', 'VE', ['tests/heritage.test.ts::its shoot days skip them'], ''),
  ('Move a day without paying twice', 'VE', ['tests/schedule.test.ts::moves a day to the first free working day'], ''),
  ('A call sheet for each day: who, where, when', 'V',
   ['tests/callsheet.test.ts::says the call the game schedules, who is called for which scenes', 'e2e/live-action.spec.ts::Each day\'s call sheet (SLATE-11-05.03)'],
   'Derived from the day (call and wrap events, who it pays, daylight, forecast); never stored'),
]),
'12-01': ('Production', 'src/engine/production/shoot.ts', [
  ('A day runs only with the people it needs', 'VE', ['tests/schedule.test.ts::refuses when someone needed on set is busy'], ''),
  ('Missing people or gear: switch scenes, delay or cancel, with costs', 'IU', [], 'Partly via moveShootDay; no test of a missing-resource day'),
]),
'12-02': ('Production', 'src/engine/production/shoot.ts; src/engine/takes.ts', [
  ('A shoot day captures its scenes with coverage and quality', 'VE', ['tests/journeys.test.ts::runs from script to delivery'], ''),
  ('Setups, coverage choices and takes per scene', 'V',
   ['tests/takes.test.ts::more coverage and more takes use more of the day', 'e2e/live-action.spec.ts::The shot plan (SLATE-12-02.02)'],
   'Coverage and take policies per scene; time factors and spreads are game calibration; projects from before keep one result per scene'),
]),
'12-03': ('Production, Edit', 'src/engine/takes.ts', [
  ('Review a take, ask for another, or move on, at a time cost', 'V',
   ['tests/takes.test.ts::choosing another take moves the performance and the direction', 'e2e/live-action.spec.ts::the cut uses the best balanced one; use another for the dock scene'],
   'Takes are chosen before the day (the policy) and reviewed in the edit; the shoot itself runs unattended'),
]),
'12-04': ('Production', 'src/engine/production/shoot.ts', [
  ('Weather loses or compromises a day and the log says so', 'IU', [], 'runShootDay records lost and partial days; no test'),
  ('A failed day rolls back; completed work is kept', 'VE', ['tests/processing.test.ts::rolls the batch back'], ''),
]),
'12-05': ('Edit > Pickups', 'src/engine/production/shoot.ts', [
  ('Pickups are booked after the last shoot day and capture the missing scene', 'VE', ['tests/script-effects.test.ts::is booked after the last scheduled shoot day'], ''),
]),
'13-01': ('Production', 'src/engine/production/tasks.ts', [
  ('Design, boards, animatic, layout, animation, cleanup and colour, composite', 'VE', ['e2e/journeys.spec.ts::2D animation: deliver'], ''),
  ('A late change reworks only what depends on it', 'VE', ['tests/media.test.ts::a design change reports its impact'], ''),
]),
'13-02': ('Production', 'src/engine/production/tasks.ts', [
  ('Model, rig, layout, animation, effects, lighting, render, composite', 'VE', ['e2e/media.spec.ts::modeling and rigging before animation'], ''),
  ('Render capacity is finite; more nodes cost money', 'VE', ['tests/media.test.ts::uses finite render capacity'], ''),
]),
'13-03': ('Production', 'src/engine/production/workday.ts', [
  ('Puppets, sets, stages and frames; copies allow parallel stages', 'VE', ['tests/media.test.ts::a puppet cannot serve two stages at once'], ''),
  ('Damage and repair', 'IU', [], 'See 11-03'),
]),
'13-04': ('Production > Capture, Voice', 'src/engine/mocap.ts', [
  ('Book sessions, record, retake, approve, clean up and retarget', 'VE', ['tests/lunar-mocap.test.ts::a changed take resets cleanup'], ''),
  ('A session the studio cannot be paid for waits, with the reason', 'VE', ['tests/tight-budget.test.ts::a voice session it can no longer pay'], ''),
  ('A missed session is rebooked', 'IU', [], 'rebookMissed exists; no test'),
]),
'13-05': ('Production', 'src/engine/production/tasks.ts', [
  ('Plates and digital scenes in one production; plate integration', 'VE', ['tests/media.test.ts::shoots live scenes and animates the rest'], ''),
  ('A changed plate flags its integration task and cost', 'IU', [], 'Change orders exist; no test for plates'),
]),
'14-01': ('Script (documentary)', 'src/engine/documentary.ts', [
  ('Research and access planning; contributors and archives', 'VE', ['e2e/media.spec.ts::documentary through the UI'], ''),
  ('A refusal says what it affects and offers alternatives', 'VE', ['e2e/journeys.spec.ts::a contributor who declines is told apart'], ''),
]),
'14-02': ('Contributors', 'src/engine/documentary.ts; src/engine/unscripted.ts', [
  ('Ask for consent; given, declined or withdrawn', 'VE', ['tests/media.test.ts::uses contributors, consent and fact checks'], ''),
  ('Restrictions on use (no face, no name, approval of use) carried into the edit', 'V',
   ['tests/restrictions.test.ts::a hidden face adds blurring after lock that delivery waits for', 'tests/restrictions.test.ts::a refusal holds delivery until their scenes are cut', 'e2e/journeys.spec.ts::Joost agrees on condition his face isn\'t shown'],
   'Shares of each condition are simulation assumptions; cut approval reads the locked cut and resets on unlock'),
  ('Withdrawal before filming adds no redaction; after filming, redaction work', 'VE', ['tests/unscripted.test.ts::before the shoot there is nothing to redact'], ''),
]),
'14-03': ('Production (documentary)', 'src/engine/production/tasks.ts', [
  ('Interviews and actuality captured; claims checked', 'VE', ['e2e/journeys.spec.ts::documentary: consent and fact checks gate delivery'], ''),
]),
'14-04': ('Production (unscripted)', 'src/engine/unscripted.ts', [
  ('Format rules per family; deterministic competition rounds', 'VE', ['tests/unscripted.test.ts::competition: deterministic, stored rounds'], ''),
]),
'14-05': ('Edit (documentary)', 'src/engine/finish.ts', [
  ('Unchecked claims and unresolved withdrawals block delivery, with the way out', 'VE', ['tests/unscripted.test.ts::factual shows need claims to check'], ''),
]),
'15-01': ('Edit', 'src/engine/finish.ts', [
  ('Assembly only from captured material; gaps named', 'VE', ['tests/script-effects.test.ts::missing footage names the scene'], ''),
]),
'15-02': ('Edit', 'src/engine/finish.ts', [
  ('Cut, restore and the essential-scene warnings', 'VE', ['e2e/script-rules.spec.ts::an essential scene cut then picked up'], ''),
]),
'15-03': ('Edit', 'src/engine/production/shoot.ts', [
  ('Pickups with cost and dates', 'VE', ['tests/script-effects.test.ts::is booked after the last scheduled shoot day'], ''),
  ('Replacement voice or effects revisions as additional work', 'V',
   ['tests/revisions.test.ts::an effects revision is the effects artist\'s work the grade waits for', 'tests/revisions.test.ts::re-recorded lines are a dialogue session the sound waits for', 'e2e/live-action.spec.ts::Additional work before lock (SLATE-15-03.02)'],
   'Gains (effects +5 to the scene capture, re-recording +4 to the performance) are game calibration'),
]),
'15-04': ('Edit, Production', 'src/engine/production/tasks.ts', [
  ('Sound, music, effects, colour, mix and captions as dependent work', 'VE', ['tests/journeys.test.ts::runs from script to delivery'], ''),
  ('Dialogue edit with ADR and Foley as their own work', 'V',
   ['tests/post-sound.test.ts::a new project edits dialogue, records Foley and cuts effects as separate work', 'tests/post-sound.test.ts::when the weather spoiled the sound', 'e2e/media.spec.ts::Sound finishing as its own work (SLATE-15-04.02)'],
   'New projects only; the sound designer does all three, so short works take a day or two longer'),
  ('Unlocking the picture reopens the finishing work it affects', 'IU', [], 'unlockPicture exists; no test'),
]),
'15-05': ('Edit, Release', 'src/engine/finish.ts', [
  ('Delivery checks name what is missing', 'VE', ['tests/script-effects.test.ts::a shoot day left empty by a cut is cancelled'], ''),
  ('A broadcast edit as a separate deliverable', 'VE', ['e2e/script-rules.spec.ts::what the broadcaster offers'], ''),
  ('Festival and distribution versions with their own runtime and credits', 'V',
   ['tests/versions.test.ts::a version is conformed from the locked cut as a day of editing, with its own runtime and credits', 'tests/versions.test.ts::a festival\'s runtime rules read the version entered', 'e2e/live-action.spec.ts::A Festival Cut without the wheelhouse scene (SLATE-15-05.03)'],
   'Versions leave scenes out of the locked cut; credits drop people whose scenes are left out'),
]),
'16-01': ('Release', 'src/engine/finish.ts', [
  ('Choose a route and date', 'VE', ['tests/release.test.ts::a contracted release happens on its date'], ''),
  ('Territories and exclusivity compared before accepting', 'MI', [], 'Offers list territories; no exclusivity conflict'),
]),
'16-02': ('Release', 'src/engine/finish.ts', [
  ('Accept or decline; delivery materials reserved; cancellation terms', 'VE', ['tests/release.test.ts::accepting reserves delivery materials'], ''),
]),
'16-03': ('Script > Content, Release', 'src/engine/script-effects.ts', [
  ('Declared content sets outlet conditions; late slot or broadcast edit', 'VE', ['tests/script-effects.test.ts::strong content still gets a broadcast offer'], ''),
]),
'16-04': ('Release, Budget', 'src/engine/finance.ts', [
  ('Income arrives once and repays backers in order', 'VE', ['tests/finance.test.ts::income repays backers first'], ''),
  ('Reported earnings shown apart from money received', 'MI', [], 'One revenue figure'),
]),
'16-05': ('Release', '', [
  ('Later windows and territories after the first release', 'MI', [], 'One release per offer, no later windows'),
]),
'17-01': ('Festivals And Awards', 'src/engine/awards.ts', [
  ('Editions per year with their own dates, projected when not announced', 'VE', ['tests/rulebooks.test.ts::new editions record the rules they use'], ''),
]),
'17-02': ('Festivals And Awards', 'src/engine/awards.ts; src/engine/rulebooks.ts', [
  ('Eligibility explained per category with edition rules', 'VE', ['tests/rulebooks.test.ts::runtime limits'], ''),
]),
'17-03': ('Festivals And Awards', 'src/engine/awards.ts', [
  ('Submit with a fee; withdraw and enter again without paying twice', 'VE', ['tests/rulebooks.test.ts::refuses a duplicate'], ''),
]),
'17-04': ('Festivals, Calendar', 'src/engine/awards.ts', [
  ('Selection, invitation, travel and attendance', 'VE', ['e2e/screenings.spec.ts::a screening invitation'], ''),
]),
'17-05': ('Festivals, Profile', 'src/engine/awards.ts', [
  ('Results kept per edition; later rule changes never rewrite them', 'VE', ['tests/rulebooks.test.ts::keeps every nominee, winner and entry after results'], ''),
]),
'18-01': ('Profile', 'src/ui/Places.tsx', [
  ('Credits across projects on Profile', 'IU', [], 'Profile lists credits; no test'),
]),
'18-02': ('Profile, Cast, Crew', '', [
  ('Collaboration history with people you have worked with', 'MI', [], 'No relationship history'),
  ('History changes their willingness for related work only', 'MI', [], 'Depends on history'),
]),
'18-03': ('Home', '', [
  ('Proposals tied to your past work, with terms, accepted or declined', 'MI', [], 'No opportunities'),
]),
'18-04': ('Projects', 'src/engine/continuation.ts', [
  ('A sequel or new season carries story continuity and eligible assets', 'V',
   ['tests/episodes.test.ts::carries the same characters, world and open threads', 'tests/episodes.test.ts::a sequel reuses the finished puppets'], ''),
  ('Returning people are asked again and paid again', 'V',
   ['tests/episodes.test.ts::the cast are listed to ask back at their rate, not hired', 'e2e/journeys.spec.ts::is asked back at their last rate, an offer like any other'], ''),
]),
'18-05': ('Projects, Budget', 'src/engine/people.ts; src/engine/finance.ts', [
  ('Bookings across projects never overlap for one person', 'VE', ['tests/schedule.test.ts::refuses when someone needed on set is busy'], ''),
  ('Debts and duties of one project survive starting another', 'VE', ['e2e/first-project.spec.ts::a second project'], ''),
  ('Cancel or hand over a project explicitly', 'V', ['tests/shelve.test.ts::a backer', 'tests/handover.test.ts::a writer replaced after their draft was approved'], ''),
]),
'19-01': ('Every screen', 'docs/COPY-GUIDE.md', [
  ('Natural, specific wording; no raw IDs or engine terms', 'VE', ['e2e/viewports.spec.ts::no raw IDs or source text on screen'], ''),
]),
'19-02': ('Every screen', 'src/ui/app.css', [
  ('Desktop, phone and iPhone emulation fit without sideways scrolling', 'VE', ['e2e/viewports.spec.ts::every main screen fits each viewport'], ''),
  ('Focus and input kept through rerenders', 'VE', ['e2e/focus.spec.ts::typing straight into New Script keeps every character'], ''),
  ('Jumping to a section is not hidden under the sticky header', 'V', ['e2e/viewports.spec.ts::a destination scrolled to or focused is never hidden under the top bar'], ''),
]),
'19-03': ('Every action', 'src/ui', [
  ('Preview cost and time before committing; outcome after', 'IU', [], 'Many actions preview; no audit'),
  ('Disabled actions say why', 'IU', [], 'Many say why; no audit'),
]),
'19-04': ('Saved Games, Settings', 'src/engine/save.ts; src/engine/vault.ts', [
  ('Export, import, newer and duplicate saves', 'VE', ['e2e/backup.spec.ts::export, then import into a fresh browser'], ''),
  ('Atomic writes, backups, quota and migration', 'VE', ['tests/save-recovery.test.ts::keeps the previous good save as a backup'], ''),
]),
'19-05': ('Every screen', 'e2e/accessibility.spec.ts', [
  ('Recovery from damaged saves and failed loads', 'VE', ['e2e/failures.spec.ts::a damaged save opens the last good copy'], ''),
  ('Keyboard and screen-reader names', 'VE', ['e2e/viewports.spec.ts::keyboard: skip link, focus order'], ''),
  ('Physical-device and human accessibility checks', 'EB', [], 'Needs real devices and people; browser emulation only'),
]),
'20-01': ('docs/depth', 'tests/depth-ledger.test.ts', [
  ('Every group has children, a status from the evidence, and evidence that exists', 'V', ['tests/depth-ledger.test.ts::every group'], ''),
]),
'20-02': ('docs/DATA-PROVENANCE.md, rulebooks', 'src/engine/rulebooks.ts', [
  ('Festival and award rules cite their source, edition and status', 'VE', ['tests/rulebooks.test.ts::every rule names a real institution, category and source'], ''),
  ('World data sources recorded', 'VE', ['tests/world-holidays.test.ts::labels years past the last announcement as projected'], ''),
  ('Production-process sources per feature ID', 'MI', [], 'Production rates are modeled with no per-feature source register'),
]),
'20-03': ('tests', 'tests', [
  ('Transitions, boundaries, failures, determinism and migration tested', 'VE', ['tests/processing.test.ts::processes it exactly once'], ''),
]),
'20-04': ('e2e', 'e2e', [
  ('Desktop, phone and WebKit journeys for creation, funding, casting, revision, save and recovery', 'VE', ['e2e/careers.spec.ts::stop motion: refused for lack of money'], ''),
  ('Journeys for the features this package adds', 'MI', [], 'Added with each stage'),
]),
'20-05': ('People', '', [
  ('Human play and real devices', 'EB', [], 'Needs the owner and real devices'),
]),
}
