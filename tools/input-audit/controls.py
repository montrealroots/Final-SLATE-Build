# The input audit's control table (docs/input-audit/CONTROLS.csv), written from the classification below and checked against
# the UI by tests/input-audit.test.ts. Run from the repository root after adding or changing a control:
#   python3 tools/input-audit/controls.py
# Each row is one labelled control in src/ui, keyed by file, label (as written in the source) and occurrence. Classes:
#   decision  - changes a rule, an action, work, the schedule, a cost, eligibility, an assessment or an outcome
#   identity  - the player's identity or creative expression, kept and used consistently where it belongs
#   record    - a record of what happened or a name for something, shown back accurately
#   view      - a screen control: search, filter or sort; not game state
#   component - a shared component's own definition, not a control the player meets
import csv, re, glob, sys

U = lambda f, t: f'tests/{f}.test.ts::{t}'
E = lambda f, t: f'e2e/{f}.spec.ts::{t}'
D = 'decision'; I = 'identity'; R = 'record'; V = 'view'

# (file, label, occurrence) -> (class, state, consumer, effect, unit evidence, journey evidence)
C = {}
def c(file, label, cls, state='', consumer='', effect='', unit='', journey='', n=1):
    C[(file, label, n)] = (cls, state, consumer, effect, unit, journey)

# ---------------- Creation ----------------
f = 'Creation.tsx'
c(f, '"First Name"', 'identity', 'character.firstName', 'shown as your legal name, on credits: identity.ts legalName; with the birth and start dates it seeds the world (state.ts newGame)', 'The legal name on credits', 'tests/identity.test.ts::credits carry the legal name', 'e2e/creation.spec.ts::editing from Review')
c(f, '"Middle Name (Optional)"', 'identity', 'character.middleName', 'shown as your legal name, on credits: identity.ts legalName; with the birth and start dates it seeds the world (state.ts newGame)', 'Part of the legal name on credits', 'tests/identity.test.ts::credits carry the legal name', '')
c(f, '"Last Name"', 'identity', 'character.lastName', 'shown as your legal name, on credits: identity.ts legalName; with the birth and start dates it seeds the world (state.ts newGame)', 'The legal name on credits', 'tests/identity.test.ts::credits carry the legal name', '')
c(f, '"Pronouns"', I, 'character.pronouns', 'state.ts newGame (settledTitle)', 'He/Him and She/Her settle Actor or Actress billing', U('creation', 'pronouns settle the billing'), E('creation', 'a step with something missing says what'))
for lab in ['"Month"', '"Day"', '"Year Of Birth"']:
    c(f, lab, I, 'character.birthDate', 'state.ts characterAge, observedBirthday', 'Age and birthdays; you must be 19 on the starting date', U('dates', 'you are exactly 19 on the starting date'))
c(f, '"Place Of Birth"', D, 'character.birthplaceId', 'identity.ts citizenshipOf -> awards.ts nationality rules', 'Citizenship, which national and European award rules read', U('recovered-rules', 'European Film Awards'), E('awards', 'European Film Awards'))
c(f, '"Where You Live"', D, 'state.locationId', 'state.ts newGame; projects.ts createProject (base)', 'Where the game starts: holidays, weather, the default production base', U('dates', 'creation refuses impossible birth and start dates'), E('world', 'a life can start anywhere in the world'))
c(f, '"Starting Date"', D, 'state.now', 'state.ts newGame', 'When the world starts: which award editions and rules apply', U('dates', 'creation refuses impossible birth and start dates'), E('creation', 'Starting Point'))
c(f, '"Starting Time"', D, 'state.now', 'state.ts newGame', 'The hour the clock starts', U('dates', 'creation refuses impossible birth and start dates'))
c(f, '{props.label}', 'component', '', '', 'PlacePicker definition, used by the place controls above')
# The savings and family controls were removed on November 14, 2026 (the owner's v8 package, decisions 2 and 3): one inheritance.
c(f, '"Amount (US Dollars)"', D, 'draft.inheritance.amountMinor -> journal (one inheritance transaction), state.money.source', 'personal.ts openInheritance, personalBalance, putInRefusal; cash/money.ts parseAmount', 'What is in your own account at the start, and so what you can spend and put into a project', U('v8-inheritance', 'is a default, not a fixed amount'), E('money', 'an inheritance read on Review'))
c(f, '"Search Ethnicities"', V)
c(f, '"Describe Your Ethnicity"', 'identity', 'character.heritages (custom)', 'shown with your ethnicities: identity.ts splitBackgrounds', 'Your own words for your ethnicity, kept and shown', '', 'e2e/creation.spec.ts::an ethnicity in your own words')
c(f, '"Search Nationalities"', V)
c(f, '{o.name}', D, 'character.observances', 'projects.ts createProject -> schedule.observances; schedule.ts isWorkingDay', 'Days you keep are not worked on your productions', U('heritage', 'every observance has a 2026 date'), E('creation', 'a Jewish background keeps every day of no work'))
c(f, '"Add Language"', V)
c(f, '{`${languageName(l.code)} Proficiency`}', D, 'character.languages', 'production/language.ts personLanguagesFit; hiring.ts fitNotes', 'Whether you need a language coach to play a part in that language', U('decision-effects', 'playing a part in a language you speak only a little'), '')

# ---------------- New Script and the project ----------------
f = 'Projects.tsx'
c(f, '"Planned Budget (US Dollars)"', D, 'project.finance.planned (cents), finance.target', 'project-budget.ts setPlannedBudget, budgetPicture, plannedText; finance.ts financeSummary', 'What you plan to spend, kept exactly; at $1,000 or more it becomes what backers are asked for. It moves no money', U('v8-budget', 'keeps 20,000 and 2,000,000 exactly'))
c(f, '"Working Title"', R, 'project.title', 'everywhere a project is named', 'The project\'s name', '', E('title-input', 'a title typed, edited, cleared, pasted and submitted'))
c(f, '"Format"', D, 'axes.format', 'projects.ts, production/tasks.ts, awards.ts', 'Episodes, runtime, work, and which awards it can enter', U('genres', 'module consumers change the right downstream state and nothing else'), E('awards', 'SXSW'))
c(f, '"Medium"', D, 'axes.medium', 'production/tasks.ts buildTasks', 'Live action shoots; animation has no shoot days but studio and render time', U('estimates', 'same script, different production method'), E('journeys', '2D animation'))
c(f, "{medium === 'hybrid' ? 'Animation Technique For Animated Scenes' : 'Animation Technique'}", D, 'axes.technique', 'production/tasks.ts buildTasks', 'Which animation pipeline does the work', U('estimates', 'same script, different production method'), E('journeys', 'stop motion to delivery'))
c(f, '"Animation Finish"', D, 'axes.animationQuality', 'production/workday.ts (render hours per frame); estimate.ts', 'Render time and cost per frame', U('decision-effects', 'a finish of feature quality renders longer'))
c(f, '"Episodes"', D, 'axes.episodeCount', 'projects.ts; production/tasks.ts', 'How many episodes are written, shot and delivered', U('episodes', 'an episode moves with its scenes'), E('careers', 'a TV season'))
c(f, "{episodic ? 'Target Minutes Per Episode' : 'Target Runtime In Minutes'}", D, 'axes.targetRuntimeMin', 'awards.ts checkEligibility (running time); estimate.ts', 'Running-time rules and the estimate', U('recovered-rules', 'Busan'), E('awards', 'Busan 2026'))
c(f, '?', D, 'axes.genres / axes.dialogueLanguages', 'genres.ts composeGenres; script-effects.ts competesAs; finish.ts subtitlingCost', 'Genres: modules, checks, comedy or drama; languages: subtitling and language rules', U('decision-effects', 'which genre is primary decides comedy or drama'), '')
c(f, '?', D, 'axes.dialogueLanguages', 'finish.ts subtitlingCost; awards.ts language rules', 'Subtitling cost and language-based award rules', U('recipient-rules', 'the declared language no longer decides'), '', n=2)
c(f, '"Intended Audience"', D, 'axes.audience', 'awards-rules.ts; script-explain.ts audienceContentNote', 'Children\'s categories, and what the content declaration is checked against', U('recovered-rules', 'programs not made for children'))
c(f, '"Tone"', 'decision', 'axes.tone', 'cues.ts proposeBrief', 'Its words choose the music brief the project proposes: quiet or tender a chamber score, taut or tense percussion, cold or eerie electronic, silent or without music no score', 'tests/cues.test.ts::is proposed from the project', '')
c(f, '"Competes As"', D, 'axes.register', 'script-effects.ts competesAs', 'Drama or comedy where awards split them', U('script-effects', 'where it competes: declared comedy or drama, else its primary genres'))
c(f, '"Story Era"', D, 'axes.storyEra', 'projects.ts deriveRequirements (period research); production/tasks.ts costumes', 'A period story adds research, and costumes take longer', U('genres', 'module consumers change the right downstream state'))
c(f, '"Story Setting Place"', D, 'axes.settingPlaceId', 'projects.ts deriveRequirements; production/tasks.ts', 'A setting abroad adds Setting Research, which design and costumes wait for', U('decision-effects', 'a setting abroad adds research before design and costumes'), E('journey-d', 'the same film set at home or abroad'))
c(f, '"Production Base"', D, 'axes.basePlaceId', 'production/schedule.ts isWorkingDay; weather.ts', 'Holidays, weather and time zone of the shoot', U('depth-gaps-production', 'rain stops an exterior day'), E('journeys', 'live action in a wet October'))
c(f, '"Search Genres"', V)

# ---------------- Story panel, scenes, characters, structure ----------------
f = 'ScriptViews.tsx'
for lab in ['"Logline"', '"Premise"', '"Stakes"', '"Central Conflict"', '"Point Of View"', '"Theme"', '"Intended Ending"', '"Central Question"']:
    c(f, lab, D, 'story.*', 'script-effects.ts documentsNeeded', 'Must be written before a pitch, treatment or statement can be sent; never read for meaning', U('script-effects', 'briefs add no work'), E('script-rules', 'a supporting antagonist, an incomplete pitch and a revised treatment'))
c(f, '"Intended Experience"', 'decision', 'story.intendedExperience', 'cues.ts proposeBrief', 'Its words choose the music brief the project proposes: quiet or tender a chamber score, taut or tense percussion, cold or eerie electronic, silent or without music no score', 'tests/cues.test.ts::is proposed from the project', '')
c(f, '"Tone"', 'decision', 'axes.tone', 'cues.ts proposeBrief', 'Its words choose the music brief the project proposes: quiet or tender a chamber score, taut or tense percussion, cold or eerie electronic, silent or without music no score', 'tests/cues.test.ts::is proposed from the project', '')
c(f, '"Story Setting"', I, 'axes.storySetting', 'shown in the Story panel', 'Your words for where it happens', U('script-effects', 'briefs add no work'))
c(f, '"Story Setting Place"', D, 'axes.settingPlaceId', 'projects.ts deriveRequirements', 'A setting abroad adds Setting Research', U('decision-effects', 'a setting abroad adds research before design and costumes'), E('readers', 'a story set abroad is researched'))
c(f, '"Competes As"', D, 'axes.register', 'script-effects.ts competesAs', 'Drama or comedy where awards split them', U('script-effects', 'where it competes: declared comedy or drama, else its primary genres'))
c(f, '"Source Material"', D, 'source.kind', 'awards-rules.ts (original or adapted screenplay)', 'Original or adapted screenplay categories', U('awards-catalog', 'original or adapted is the project'))
c(f, '"Adapted From"', 'record', 'source.work', 'shown with the project', "The adapted work's title", 'tests/carried-text.test.ts::kept through a save exactly as written', '')
c(f, '"When It Is Set"', D, 'storyTime', 'awards-rules.ts requirementProblems', 'Period, fantasy or contemporary categories', U('decision-effects', 'a period story enters period categories'))
c(f, '{x.label}', D, 'subjects', 'awards-rules.ts PROJECT_SUBJECTS', 'Subject categories (sport, environment and others)', U('awards-catalog', 'a prize with its own requirement considers only works that meet it'))
c(f, '{q.label}', 'identity', 'genreNotes', 'shown with the genre questions', "Your answers to a genre's questions; optional, read for nothing", 'tests/carried-text.test.ts::kept through a save exactly as written', '')
c(f, '"Draft Name"', 'record', 'draft.label', 'drafts list', "A draft's name", 'tests/carried-text.test.ts::kept through a save exactly as written', '')
c(f, '"Draft Name"', 'record', 'draft.label', 'drafts list', "A draft's name", 'tests/carried-text.test.ts::kept through a save exactly as written', '', n=2)
c(f, '{`"${x.title}" In This Scene`}', D, 'song.uses', 'songs.ts songUses; projects.ts deriveRequirements', 'A song in a scene needs clearing or recording, and counts for song awards', U('songs', 'a commissioned song is written by a songwriter and a lyricist'), E('awards', 'Songs'))
c(f, '"Interior Or Exterior"', D, 'scene.heading.intExt', 'production/shoot.ts (weather)', 'Exterior days can be rained out', U('depth-gaps-production', 'rain stops an exterior day'), E('journeys', 'live action in a wet October'))
c(f, '"Place"', D, 'scene.heading.place', 'production/schedule.ts groupShootDays', 'Scenes at one place share days; each place needs a site', U('locations', 'after scouting, a chosen site sets the day fee'))
c(f, '"Time Of Day"', D, 'scene.heading.time', 'production/rates.ts dayFees', 'Night shoots cost more', U('estimates', 'same runtime, different production complexity'))
c(f, '"Estimated Minutes"', D, 'scene.estMinutes', 'production/schedule.ts sceneLoad; finish.ts runtime', 'Shoot load and running time', U('estimates', 'same runtime, different production complexity'))
c(f, '"Kind"', D, 'scene.kind', 'projects.ts deriveRequirements (interview, archival)', 'What a documentary scene needs: interviews, archive', U('media', 'uses contributors, consent and fact checks'), E('journeys', 'documentary'))
c(f, '"Basis"', D, 'scene.basis', 'projects.ts scriptIssues (sourced needs a fact)', 'Sourced material needs a linked fact', U('media', 'uses contributors, consent and fact checks'))
c(f, '"Technique For This Scene"', D, 'scene.technique', 'projects.ts sceneTechnique; production/tasks.ts', 'Which pipeline does a hybrid scene', U('estimates', 'same script, different production method'), E('journeys', 'hybrid'))
c(f, '"Act"', 'identity', 'scene.act', 'shown as advice: structure.ts structureNotes', 'Groups scenes; an empty act is noted; scores nothing', 'tests/structure.test.ts::group scenes; an empty act is noted', 'e2e/structure.spec.ts::scenes duplicated, split and combined')
c(f, '"Tonal Intention"', 'identity', 'scene.tone', 'shown as advice: projects.ts scriptIssues (tonal genres note a missing one)', "Your note on the scene's tone; read for nothing", 'tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing', '')
c(f, '"Who Is Recording"', 'identity', 'scene.operator', 'shown as advice: projects.ts scriptIssues (found footage)', 'Found-footage scenes need an in-story camera operator', 'tests/genres.test.ts::module consumers change the right downstream state', '')
c(f, '{c.name}', D, 'scene.participants', 'projects.ts deriveRequirements; hiring.ts estimateDays', 'Who is in a scene: casting, days booked, credits', U('script-effects', 'series regulars are booked for every episode'))
c(f, '{c.name}', D, 'scene.contributorIds', 'projects.ts deriveRequirements (interviews, consent)', 'A contributor in a scene needs an interview and consent', U('media', 'uses contributors, consent and fact checks'), n=2)
c(f, '{e.claim.slice(0, 50)}', D, 'scene.evidenceIds', 'projects.ts scriptIssues', 'Links sourced material to a checked fact', U('media', 'uses contributors, consent and fact checks'))
c(f, '"Objective"', 'identity', 'scene.objective', 'shown as advice: projects.ts scriptIssues (advisory note when empty)', 'Your note; read for nothing', 'tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing', '')
c(f, "{nonfiction ? 'What Happens' : 'Action'}", 'identity', 'scene.action', 'shown on the scene', 'Your words; read for nothing', 'tests/carried-text.test.ts::kept through a save exactly as written', '')
c(f, '"Turning Point"', 'identity', 'scene.turningPoint', 'shown on the scene', "Your note; the game doesn't read it", 'tests/carried-text.test.ts::kept through a save exactly as written', '')
c(f, '"Essential To The Story"', D, 'scene.essential', 'finish.ts (cutting it costs the edit); cost-cuts.ts', 'Cutting an essential scene costs the edit and it is never offered as a saving', U('cost-cuts', 'never an essential scene'))
for lab in ['"Props"', '"Animals"', '"Vehicles"', '"Stunts"', '"Visual Effects"']:
    c(f, lab, D, 'scene production needs', 'projects.ts deriveRequirements; production/tasks.ts', 'Requirements, work, crew and cost', U('screenwriting', 'the same scene with and without a stunt, water, a crowd'))
c(f, '"Crowd Size"', D, 'scene.crowd', 'production/rates.ts (crowd day rate)', 'Background performers paid per day', U('screenwriting', 'the same scene with and without a stunt, water, a crowd'))
for lab in ['"Dance"', '"Intimate Scene"', '"Water Work"']:
    c(f, lab, D, 'scene production needs', 'projects.ts deriveRequirements', 'Choreography, an intimacy coordinator or water safety', U('screenwriting', 'the same scene with and without a stunt, water, a crowd'))
c(f, '"Intentional Discontinuity"', D, 'scene.intentionalDiscontinuity', 'projects.ts scriptIssues', 'Marks a continuity break as deliberate, so it no longer blocks approval', U('depth-gaps', 'a line whose speaker has left the scene blocks approval'))
c(f, '"Speaker"', D, 'dialogue.speaker', 'projects.ts scriptIssues; finish.ts', 'Who speaks: language rules and continuity checks', U('depth-gaps', 'a line whose speaker has left the scene blocks approval'))
c(f, '"Line"', 'identity', 'dialogue.text', 'shown as advice: script-explain.ts spokenMinutes (a guide only)', 'Your dialogue; its length is shown as a guide', 'tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing', '')
c(f, '{o.label}', 'identity', 'worldRule.sceneIds', 'shown as a preview: season.ts sharedFactImpact', 'Changing a rule lists the scenes that rely on it', 'tests/episodes.test.ts::a rule lists the scenes that rely on it', 'e2e/season.spec.ts::a season planned and reordered')
c(f, '"Rule"', 'identity', 'worldRule.rule', 'shown in the season plan: season.ts', 'Your story-world rule; an unscripted show needs at least one, its format rules, before approval (projects.ts scriptIssues)', 'tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing', '')
c(f, '"Limit Or Cost"', 'identity', 'worldRule.limit', 'shown in the season plan: season.ts', "Your rule's limit", 'tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing', '')
c(f, '"Rule"', 'identity', 'worldRule.rule', 'shown in the season plan: season.ts', 'Your story-world rule; an unscripted show needs at least one, its format rules, before approval (projects.ts scriptIssues)', 'tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing', '', n=2)
c(f, '"Limit Or Cost"', 'identity', 'worldRule.limit', 'shown in the season plan: season.ts', "Your rule's limit", 'tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing', '', n=2)
c(f, '"Season Arc"', 'identity', 'seasonArc', 'shown in the season plan, and carried into the next season: sequel.ts continueProject (carried into the next season)', 'Your plan; a next season starts from it', 'tests/episodes.test.ts::carries the same characters, world and open threads', '')
c(f, '{`Title Of Episode ${n}`}', R, 'episode.title', 'shown wherever an episode is named', 'An episode\'s title', U('episodes', 'an episode moves with its scenes'))
c(f, '{`What Episode ${n} Moves`}', I, 'episode.arc', 'shown in the season plan', 'Your plan', U('episodes', 'an episode moves with its scenes'))
c(f, '"New Act Or Sequence"', 'identity', 'acts', 'shown as advice: structure.ts', 'Names a new act', 'tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing', '')
c(f, '{o.label}', 'identity', 'thread.sceneIds', 'shown as advice: structure.ts structureNotes; threadCutConsequences', "Cutting a thread's resolving scene warns by name; scores nothing", 'tests/structure.test.ts::cutting the resolving scene from the edit warns by name', 'e2e/structure.spec.ts::scenes duplicated, split and combined', n=2)
c(f, '{c.name}', 'identity', 'thread.characterIds', 'shown as advice: structure.ts structureNotes', 'A note when a character the thread follows is in none of its scenes; scores nothing', 'tests/decision-effects.test.ts::raise a structure note when one is in none of its scenes', '', n=3)
c(f, '{`How ${t.name} Ends`}', 'identity', 'thread.resolution', 'shown as advice: structure.ts', 'A thread resolves in a scene or is left open; scores nothing', 'tests/structure.test.ts::a thread resolves in a named scene or is left open', '')
c(f, '"New Thread"', 'identity', 'threads', 'shown as advice: structure.ts', 'Names a thread', 'tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing', '')
c(f, '"Reference"', 'identity', 'research.reference', 'shown as advice: research.ts', 'What you checked a question against', 'tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing', '')
c(f, '"Status"', 'identity', 'research.status', 'shown as advice: research.ts researchNotes', 'An open or uncertain question is noted on its scenes', 'tests/structure.test.ts::note open and uncertain questions on their scenes', '')
c(f, '{sceneLabel(p, s)}', 'identity', 'research.sceneIds', 'shown as advice: research.ts researchNotes', 'The scenes a question informs', 'tests/structure.test.ts::note open and uncertain questions on their scenes', '')
c(f, '"New Question"', 'identity', 'research', 'shown as advice: research.ts', 'A research question', 'tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing', '')
c(f, '"Planted In"', D, 'setup.plantedIn', 'script-effects.ts; finish.ts edit consequences', 'Cutting a planted scene says the payoff loses its setup', U('script-effects', 'cutting a scene that plants a clue'))
c(f, '"Pays Off In"', D, 'setup.paidIn', 'script-effects.ts; finish.ts edit consequences', 'The payoff a cut affects', U('script-effects', 'cutting a scene that plants a clue'))
c(f, '"What Is Set Up"', 'identity', 'setup.label', 'shown with the setup', 'Its name', 'tests/carried-text.test.ts::kept through a save exactly as written', '')
c(f, '"Kind"', D, 'setup.kind', 'projects.ts deriveRequirements (clue props)', 'A clue in a mystery needs a hero prop', U('script-effects', 'cutting a scene that plants a clue'), n=2)
c(f, '"First Character"', 'identity', 'relationship.a', 'shown as a preview: season.ts sharedFactImpact', 'A relationship touches every scene its two characters share', 'tests/episodes.test.ts::a relationship touches every scene its two characters share', '')
c(f, '"Second Character"', 'identity', 'relationship.b', 'shown as a preview: season.ts sharedFactImpact', 'As above', 'tests/episodes.test.ts::a relationship touches every scene its two characters share', '')
for n in (1, 2):
    c(f, '"Relationship"', I, 'relationship.kind', 'shown in the season plan', 'Your words', n=n)
    c(f, '"Where It Starts"', I, 'relationship.start', 'shown in the season plan', 'Your words', n=n)
    c(f, '"Where It Ends"', I, 'relationship.end', 'shown in the season plan', 'Your words', n=n)
c(f, '"Claim"', D, 'evidence.claim', 'projects.ts deriveRequirements (fact-check)', 'Every claim not dramatized needs a fact check', U('media', 'uses contributors, consent and fact checks'))
c(f, '"Status"', D, 'evidence.status', 'projects.ts deriveRequirements', 'Dramatized claims need no fact check', U('media', 'uses contributors, consent and fact checks'), n=2)
c(f, '"Source Note"', 'record', 'evidence.sourceNote', 'shown with the fact', 'Where the fact comes from', 'tests/carried-text.test.ts::kept through a save exactly as written', '')
c(f, '"Contributor Name"', 'record', 'contributor.name', 'credits, consent', "A contributor's name", 'tests/carried-text.test.ts::kept through a save exactly as written', '')
c(f, '"Who They Are"', 'record', 'contributor.role', 'shown with the contributor', 'Their role', 'tests/carried-text.test.ts::kept through a save exactly as written', '')
c(f, '"Note"', D, 'note.text', 'projects.ts addNote, finish.ts assessQuality', 'On a problem the readiness checks flag (its area, and its scene or the whole script), it counts once a revision addresses it and the problem is fixed; on no problem, nothing', U('screenwriting', 'a note of your own on a problem the checks flag counts'))
c(f, '"Area"', 'decision', 'note.area', 'projects.ts addNote', "Which flagged problem a note of yours is on: it must be the problem's area", 'tests/screenwriting.test.ts::a note of your own on a problem the checks flag counts', '')
c(f, '"About"', 'decision', 'note.sceneId', 'projects.ts addNote', "Which flagged problem a note of yours is on: the problem's scene, or the whole script for one on the whole script", 'tests/screenwriting.test.ts::a note of your own on a problem the checks flag counts', 'e2e/readers.spec.ts::a story set abroad is researched')
c(f, '"Character Name"', R, 'character.name', 'everywhere a part is named', 'A character\'s name', U('scenes', 'renaming changes the name everywhere it is shown'))
c(f, '"Scene"', 'identity', 'beat.sceneId', 'shown as advice: structure.ts beatsIn', 'Where a character changes; cutting it warns', 'tests/structure.test.ts::a beat goes only in a scene the character is in', '')
c(f, '"What Changes"', 'identity', 'beat.change', 'shown as advice: structure.ts', 'Your words', 'tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing', '')
c(f, '"Name"', R, 'character.name', 'everywhere a part is named', 'A character\'s name', U('scenes', 'renaming changes the name everywhere it is shown'))
c(f, '"Role Size"', D, 'character.roleSize', 'script-effects.ts castPlacement; hiring.ts', 'Award placement and rates', U('script-effects', 'placement, essential scenes, the content declaration'))
c(f, '"Entity"', D, 'character.entity', 'projects.ts deriveRequirements; production/shoot.ts', 'Non-human parts need designs, builds or effects', U('genres', 'module consumers change the right downstream state'))
c(f, '"Realized As"', D, 'character.realization', 'projects.ts deriveRequirements; production/shoot.ts', 'Prosthetics, a suit, a puppet or CG: who builds it and how long', U('genres', 'module consumers change the right downstream state'))
c(f, '"Age In Story"', D, 'character.ageInStory', 'hiring.ts fitNotes', 'Casting notes who fits the age', U('auditions', 'background parts, cast parts and repeat invitations'))
c(f, '"Also Called"', 'identity', 'character.aliases', 'shown with the part in casting', 'Other names; one character', 'tests/carried-text.test.ts::kept through a save exactly as written', '')
c(f, '"Pronouns"', 'identity', 'character.pronouns', 'shown in casting: script-explain.ts characterPronouns', 'Casting marks matching performers; nobody is filtered or scored', 'tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing', '')
c(f, '"Speaks"', D, 'character.languages', 'production/language.ts personLanguagesFit', 'A performer who doesn\'t speak it needs coaching', U('decision-effects', 'the same part in English'))
c(f, '"Awards Placement"', D, 'character.awardPlacement', 'script-effects.ts castPlacement', 'Lead or supporting categories', U('script-effects', 'placement, essential scenes, the content declaration'))
c(f, '"Series Involvement"', D, 'character.seriesInvolvement', 'hiring.ts estimateDays; finish.ts computeCredits', 'Regulars are booked and credited for every episode', U('script-effects', 'series regulars are booked for every episode'))
c(f, '{title(f)}', D, 'character.functions', 'awards-rules.ts isNarrator; hiring.ts estimateDays', 'A narrator records narration in post and is placed in narrator categories', U('recipient-rules', 'version 3 leaves the narrator out of Supporting Actor'))
c(f, '{title(m)}', D, 'character.methods', 'hiring.ts; production', 'How the part is performed: on camera, voice, capture, suit, puppetry', U('depth-gaps-production', 'a voice performer is not a capture performer'))
c(f, '"What Kind Of Being"', 'identity', 'character.entityNote', 'shown to design and casting', "Your description; the game doesn't read it", 'tests/carried-text.test.ts::kept through a save exactly as written', '')
for lab in ['"Description"', '"Wants"', '"Fears"']:
    c(f, lab, I, f'character.{lab.strip(chr(34)).lower()}', 'script-explain.ts breakdownComplete', 'Offers include the casting breakdown once all three are written; it changes who accepts nothing')
c(f, '"Format Family"', 'decision', 'unscripted.family', 'unscripted.ts unscriptedIssues, decideCompetition; awards-rules.ts requirementProblems', 'What each episode needs before the script is approved, whether a competition is decided as it is recorded, and which unscripted award categories it may enter', 'tests/unscripted.test.ts::uses format rules, participants and segments', 'e2e/journeys.spec.ts::unscripted series')
c(f, '{c.name}', D, 'competition.contestants', 'unscripted.ts decideCompetition', 'Who competes', U('unscripted', 'uses format rules, participants and segments'), n=4)
c(f, '"Leave Each Episode"', D, 'competition.eliminatePerEpisode', 'unscripted.ts decideCompetition', 'How many leave each episode', U('unscripted', 'uses format rules, participants and segments'))
c(f, '{`Add Ethnicity For ${who}`}', 'identity', 'character.heritages', 'shown in casting: hiring.ts sharedHeritages', 'Casting shows who shares a background; scores nothing', 'tests/heritage.test.ts::a performer from the pool', '')
c(f, '{`Add Nationality For ${who}`}', 'identity', 'character.nationalities', 'shown in casting: hiring.ts', 'Casting shows who shares a nationality; scores nothing', 'tests/identity.test.ts::a version 6 save', '')
c(f, '{i.label}', D, 'axes.content', 'script-explain.ts; finish.ts outlet requirements', 'Broadcast slots and streaming advisories', U('script-effects', 'placement, essential scenes, the content declaration'))

# ---------------- Casting, crew, schedule, budget ----------------
f = 'PlanViews.tsx'
c(f, '"New Planned Budget (US Dollars)"', D, 'project.finance.planned, revisions, target', 'project-budget.ts setPlannedBudget, readiness', 'Changes the plan with its reason; never moves money or cancels anything signed', U('v8-budget', 'keeps 20,000 and 2,000,000 exactly'))
c(f, '"Why"', R, 'project.finance.revisions[].reason', 'PlanViews.tsx Plan Revisions', 'The reason kept with the change and shown in the revisions', U('v8-budget', 'keeps 20,000 and 2,000,000 exactly'))
c(f, '"Only Show People Who Are Free"', V)
c(f, '"What To Call It"', 'record', 'stage.label', "shown as the stage's name: parts.ts partName: the Cast page, call sheets, offers, credits", 'The stage is named by it beside the part: Mara (Age 10)', 'tests/parts.test.ts::is cast on its own', '')
c(f, '"Age In These Scenes (Optional)"', D, 'stage.age', 'minors.ts minorFor (an uncast stage)', 'Under 16, the stage is a child\'s part before anyone is cast: child rules, supervision and hours in its scenes', U('parts', 'with an age of its own'))
c(f, '{`Episode ${e}`}', D, 'stage.episodes', 'parts.ts stageIn, partScenes; hiring.ts estimateDays', 'Every scene of the episode is the stage\'s: its performer\'s days, pay, call sheets and credit', U('parts', 'a whole episode from on'))
c(f, '{sceneLabel(p, s)}', D, 'stage.sceneIds', 'parts.ts stageIn, castIn; production/shoot.ts; callsheet.ts; finish.ts', 'The scene is played by the stage\'s performer: who is called, paid, recorded, judged and credited for it', U('parts', 'shoots each scene with whoever plays it'))
c(f, '"List Matching Pronouns First"', V)
c(f, '{`Day Rate For ${c.name}`}', D, 'hire.dayRate', 'hiring.ts resolveOffer', 'What you offer decides whether they accept, counter or decline', U('relationships', 'someone who saw a project through with you takes a fair offer'), '')
c(f, '{`Read ${who.name} With`}', D, 'audition.callback.partnerId', 'auditions.ts pairChemistry', 'A chemistry read reveals the pair\'s chemistry, which moves shared scenes', U('auditions', 'a chemistry read reveals the pair'), E('auditions', 'auditions'))
c(f, '{`Writer For Episode ${e.number}`}', D, 'episode.writer', 'finish.ts assessEpisode', 'That episode\'s script assessment, and its credit', U('episode-assessment', 'crew hired for one episode count for it alone'), '')
c(f, '"Writer"', D, 'episode.writer', 'projects.ts assignEpisodeRole; finish.ts computeCredits, assessQuality', 'Who is credited for writing the film and whose accepted pass its script is assessed by; only someone whose draft or rewrite you accepted can be chosen', U('writing-jobs', 'accepted, the episode is theirs to be credited for beside the writer of the approved script'), E('real-people', 'J05: a director with no recorded date of birth and a writer are hired for a film by job'))
c(f, '"Director"', D, 'episode.director', 'production/shoot.ts onSetHires; finish.ts computeCredits, assessQuality', 'Who directs the film: on set and paid each shoot day, credited, and the direction assessed by their level; you are not needed on set', U('writing-jobs', 'is paid once for each day they direct'), E('real-people', 'J05: a director with no recorded date of birth and a writer are hired for a film by job'))
c(f, '{`Director For Episode ${e.number}`}', D, 'episode.director', 'finish.ts assessEpisode; production/schedule.ts blocks', 'That episode\'s direction, and which episodes share shoot blocks', U('episode-assessment', 'crew hired for one episode count for it alone'), E('release-schedule', 'a series released across the year end'))
c(f, '"Production Start"', D, 'schedule.startDate', 'production/schedule.ts generatePlan', 'When the shoot is planned', U('dates', 'a production start date and a release date must be real dates'), E('connected', 'a connected career'))
c(f, '"Rehearsal Days"', D, 'schedule.rehearsalDays', 'production/shoot.ts; hiring.ts (booked days)', 'Rehearsal lifts captured performance up to a cap and books performers longer', U('depth-gaps-production', 'rehearsal lifts your own captured performance'))
c(f, '"Stop-Motion Stages"', D, 'schedule.stages', 'production/workday.ts', 'How many stop-motion shots run at once', U('media', 'a puppet cannot serve two stages at once'), '')
c(f, '"Render Nodes"', D, 'schedule.renderNodes', 'production/workday.ts', 'How fast frames render, and the render cost', U('media', 'uses finite render capacity'))
c(f, '"Six-Day Weeks"', D, 'schedule.sixDayWeeks', 'production/schedule.ts isWorkingDay', 'Saturdays are worked: the same days in fewer weeks', U('decision-effects', 'the same shoot days fit into fewer weeks'))
c(f, '"Shoot Episodes In Blocks"', D, 'schedule.blockEpisodes', 'production/schedule.ts', 'Episodes with one director share days at the same place', U('episodes', 'without blocks each episode shoots its own day'))
c(f, '"Work On Public Holidays"', D, 'schedule.workHolidays', 'production/schedule.ts isWorkingDay', 'Holidays are worked, at a premium', U('heritage', 'kept holidays carry into every new project'))
c(f, '{`${c.name} Puppet Copies`}', D, 'schedule.puppetCopies', 'production/schedule.ts; production/workday.ts', 'More copies let more stages shoot one character at once', U('media', 'a puppet cannot serve two stages at once without a duplicate'))
c(f, '{`Emphasis For ${sceneLabel(p, s)}`}', D, 'shotPlan.emphasis', 'takes.ts; directing.ts', 'What the direction serves in the scene', U('directing', 'a restrained one-shot scene is not penalised'))
c(f, '{`Camera For ${sceneLabel(p, s)}`}', D, 'shotPlans[scene].rig', 'craft.ts craftTime, craftRoles, rigDayCost, takeSpread; takes.ts planTime, recordTakes', 'How long each setup takes to reset and each take to run, how much takes vary, the grip or playback the rig needs, rented kit for the day, and rehearsal days', U('craft', 'each rig changes the time a scene takes by its own reset and running time, and nothing else about the plan'))
c(f, '{`Coverage For ${sceneLabel(p, s)}`}', D, 'shotPlan.coverage', 'takes.ts requiredSetups; production/shoot.ts', 'Setups, time on the day, and what the edit can do', U('directing', 'missing coverage costs the edit'))
c(f, '{`Takes For ${sceneLabel(p, s)}`}', D, 'shotPlan.takes', 'takes.ts setupTime', 'Time on the day and the chance of a usable take', U('directing', 'under the same resources, covering what each scene needs'))
c(f, '{`Site For ${place}`}', D, 'locationChoices.main', 'locations.ts', 'The day fee and what happens if it falls through', U('locations', 'after scouting, a chosen site sets the day fee'))
c(f, '{`Backup For ${place}`}', D, 'locationChoices.backup', 'locations.ts', 'Where the day goes if the site falls through', U('locations', 'a site that falls through goes to the backup'))
c(f, '"Change Financing Target"', D, 'finance.target', 'finance.ts financeSummary, decide', 'What is still to raise, and whether backers can be approached', U('decision-effects', 'sets what is still to raise'), E('careers', 'stop motion: refused for lack of money'))
c(f, '{`Ask The ${d.backer} For`}', D, 'deal.counter.term', 'negotiation.ts', 'Asking for better terms: they agree, hold or withdraw', U('negotiation', 'leverage rises with another offer open'), E('negotiation', 'an investor offer'))

# ---------------- Edit, release, awards, capture ----------------
f = 'FinishViews.tsx'
c(f, "{`Version In ${r.territories.map(countryName).join(', ')}`}", D, 'releases[].version, releases[].dubObligationId', 'finish.ts setReleaseVersion, the release handler; distribution.ts territoriesReached, reportedGross', "A dubbed version's cost is set aside now and paid on release, and each territory it is dubbed for counts for half as much again in the distributor's reports", U('strategy', "a dubbed version is yours to pay for, counts for more where the language isn't the film's, and is refused where nothing needs translating"), E('studio-pitch', 'J08'))
c(f, '"Version"', 'record', 'version.label', 'shown where the version is entered: versions.ts addVersion (named and unique)', "The version's name. What it leaves out is the decision, below", 'tests/versions.test.ts::a version is conformed from the locked cut', 'e2e/awards.spec.ts::Emmys guest')
c(f, '{sceneLabel(p, s)}', D, 'version.leaveOut', 'versions.ts versionScenes', 'Scenes a version leaves out: its running time and its credits', U('screen-time', 'a version is its own cut'), E('awards', 'Emmys guest'))
c(f, '{`${g.label}: ${g.reason}`}', D, 'pickup choice', 'edit-actions.ts requestPickups', 'Scenes picked up on a pickup day', U('directing', 'missing coverage is shot on a targeted pickup'))
c(f, '"Route"', D, 'release.route', 'finish.ts planRelease; awards.ts qualifying', 'How it is released, which award routes it opens', U('qualifying-routes', 'a theatrical release abroad in the window qualifies'), E('journeys', '2D animation: deliver, release digitally'))
c(f, '"Release Date"', D, 'release.date', 'finish.ts planRelease; awards.ts qualifying windows', 'When it is released: which award years it qualifies for', U('dates', 'a production start date and a release date must be real dates'), E('release-schedule', 'a series released across the year end'))
c(f, '"Episode Schedule"', D, 'release.episodes, release.pattern', 'episode-releases.ts presetDates; finish.ts planRelease', 'Which day each episode comes out: the calendar, the events, and the airing and per-episode award rules', U('episode-releases', 'all at once, weekly, and several on the premiere then weekly'), E('release-schedule', 'a series released across the year end'))
c(f, '"Episodes On The Premiere"', D, 'release.episodes', 'episode-releases.ts presetDates', 'How many episodes come out on the first day', U('episode-releases', 'all at once, weekly, and several on the premiere then weekly'))
c(f, '{`Episode ${i + 2}`}', D, 'release.episodes[].date', 'episode-releases.ts episodeDateProblem; awards-rules.ts airing; awards.ts ruledReleaseFits', 'A break or a split season: which episodes count in which year', U('episode-releases', 'custom dates with a break make a split season'), E('release-schedule', 'a series released across the year end'))
c(f, '{`New Date For Episode ${e.number}`}', D, 'release.episodes[].date', 'episode-releases.ts setEpisodeDates; release-schedule.ts scheduleChangeEffects', 'Moves what is still to come, with its events, the calendar and any entry it affects shown first', U('episode-releases', 'a split season across the year end'), E('release-schedule', 'a series released across the year end'))
c(f, '"Territory Code"', D, 'release.territories', 'awards.ts; finish.ts', 'Where it is released: territory rules and subtitling', U('qualifying-routes', 'a theatrical release abroad in the window qualifies'))
c(f, '"Which Cut"', D, 'release.cut', 'finish.ts planRelease; music.ts releaseSongs, releaseLicenceRefusal', "The cut released: its songs are the ones whose licences must cover it", U('music', 'a release of a version that takes the song out needs no licence for it'))
c(f, '"Show"', V)
c(f, '"Project"', V)
c(f, '"Show"', V, n=2)
c(f, '"Format"', V)
c(f, "{`Find ${inst.kind === 'festival' ? 'A Section Or Award' : 'A Category'}`}", V)
c(f, '"Project"', D, 'entry.projectId', 'awards.ts checkEligibility', 'Which project is entered', U('awards-catalog', 'a national entry is the director'), E('awards', 'Oscars'), n=2)
c(f, '"Episode To Enter"', D, 'entry.episode', 'awards-actions.ts submitEntry; finish.ts assessEpisode', 'The entry is judged on that episode\'s own work', U('episode-assessment', 'a stronger and a weaker episode differ'), E('awards', 'Emmys directing'))
c(f, '"Song To Enter"', D, 'entry.songId', 'awards-rules.ts songProblems', 'Which song competes, and who it goes to', U('awards-catalog', 'an original song goes to the song'), E('awards', 'Songs'))
c(f, '"Version To Enter"', D, 'entry.versionId', 'awards-actions.ts entrySnapshot', 'Which cut is judged and timed', U('screen-time', 'a version is its own cut'), E('awards', 'Emmys guest'))
c(f, '{performerLabel(c)}', D, 'entry.recipients', 'awards-actions.ts submitEntry', 'Who the performance entry is for', U('recipient-rules', 'applies only to the performer categories'), E('awards', 'Emmys'))
c(f, '{`What To Capture For ${name}`}', D, 'mocap.parts', 'mocap.ts bookMocap, sessionCost', 'Body, face or both: session cost and credits', U('lunar-mocap', 'waits for a booking, which reserves the stage'), '')

# ---------------- Calendar, places, settings, shell ----------------
f = 'ScriptViews.tsx'
c(f, '"The Light It Is Shot In"', D, 'axes.light', 'craft.ts craftTime, gafferNeeded, cameraTestDays, postFactors; takes.ts planTime; hiring.ts neededRoles; production/tasks.ts buildTasks', 'Setup time on interiors and nights, whether interiors need a gaffer, a planned take more, camera test days before the shoot, the grade, and stop-motion frames a day', U('craft', 'practical and available light: interiors reset sooner and need no gaffer, a take more is planned, after a day of tests'))
c(f, '"The Score"', D, 'axes.score', 'craft.ts postFactors, scoreSessions; production/tasks.ts buildTasks', "The composer's days, and recording sessions that cost money and that the mix waits for", U('craft', 'a score with players is recorded in sessions that cost money and hold the mix; an electronic one is the composer alone'))
c(f, '{SOUNDS[k].label}', D, 'axes.sound', 'craft.ts craftTime, craftRoles, postFactors, dialogueHolds; production/tasks.ts buildTasks; production/shoot.ts needsDialogueReplacement', 'Each choice moves its own work: location recording days, a boom operator and dialogue that holds, Foley, effects editing, the score, a loop group, the mix', U('craft', 'each sound choice moves its own work and no other'))

f = 'FilmedAt.tsx'
c(f, '"Film It In"', D, 'locationChoices[place].at.placeId', 'destinations.ts dayPlace, awayCosts, permitWork; production/shoot.ts runShootDay; production/schedule.ts scheduleShootDay', "The day's weather, daylight, public holidays and clock are that place's; a unit away from base is moved once and housed each day; you have to be there for the call", U('destinations', 'a place far from the base: its own place for the day, a fee by the kind of site, a move once and housing each day, and permits first'))
c(f, '"Kind Of Site"', D, 'locationChoices[place].at.kind', 'destinations.ts kindFee, permitWork, underCover, noisyDay', "The share of the location fee a day costs, the permit days before the first day there, whether rain can stop it, and how often noise spoils dialogue", U('destinations', 'the kind of site decides whether rain can stop it and how often noise spoils dialogue, the same on every run'))

f = 'PersonWork.tsx'
J04 = E('real-people', 'J04: a performer from the film catalog is considered, reads, counters, is contracted, found booked elsewhere, works and is credited')
J05 = E('real-people', 'J05: a director with no recorded date of birth and a writer are hired for a film by job')
c(f, '"Treat As An Adult In This Story"', D, 'real[id].sim.adult', 'guests.ts canApproach -> hiring.ts makeOffer, casting-calls.ts inviteRefusal', 'With no recorded date of birth nothing can be offered until this is ticked; it is the story\'s mark, never a date', U('guests', 'with no recorded birth date, not until the player says to treat them as an adult'), J05)
c(f, '"Project"', V)
c(f, '"Consider Them For"', D, 'project.considered', 'guests.ts considerFor -> hiring.ts candidatesFor', 'Puts them first on that part\'s or job\'s list on the project, where they are invited to read or offered it', U('real-hiring', 'is one person however they were found, and joins the list for a part without anything being offered'), J04)

f = 'WritingWork.tsx'
c(f, '{`Ask ${name} For`}', D, 'writing[].scope', 'writing-jobs.ts writingTerms, acceptedRead', 'The pass\'s working days and cost, whether accepting it gives a writing credit, and how much of the script their work counts for', U('writing-jobs', 'a polish counts for less than a draft from the same pass'), J05)
c(f, '{`Episode For ${name}`}', D, 'writing[].episode', 'writing-jobs.ts writingTerms, acceptedRead', 'Which episode they work on: its length sets the days, and its assessment and credit are what the pass counts for', U('writing-jobs', 'the terms are shown before anything is agreed'), '')
c(f, '{`Your Brief For ${name} (Optional)`}', R, 'writing[].brief', 'WritingWork.tsx JobLine', 'Kept as written and shown back with the pass; the game never reads it', U('writing-jobs', 'the brief and the notes are kept as written and change nothing'), J05)
c(f, '{`What ${name}\'s Revision Should Look At`}', R, 'writing[].passes[].focus', 'WritingWork.tsx JobLine', 'A label on the revision, shown back; asking for the revision is what costs days and replaces the pass', U('writing-jobs', 'a revision costs their days, replaces the pass, and is limited by the contract'), J05)
c(f, '{`Your Note To ${name} (Optional)`}', R, 'writing[].passes[].text', 'WritingWork.tsx JobLine', 'Kept as written and shown back with the revision; the game never reads it', U('writing-jobs', 'the brief and the notes are kept as written and change nothing'), J05)

f = 'Places.tsx'
c(f, '{f}', V, 'calendarFilters', 'the calendar', 'Which kinds of event the calendar shows')
c(f, '"Search Events"', V)
c('RecordBook.tsx', '"As Of"', V)  # Box Office Records as they stood at a past year's end (v6 package, 02 C); changes nothing
c(f, '"Title"', R, 'plan.title', 'the calendar, reminders', 'A plan\'s name', U('foundation', 'Advance stops at a reminder'))
c(f, '"Start Time"', D, 'plan.start', 'state.ts addPlan', 'When the plan starts; Advance stops for it', U('foundation', 'Advance stops at a reminder'), E('viewports', 'Advance lists the plans it will pass'))
c(f, '"Length In Minutes"', D, 'plan.durationMin', 'production/schedule.ts planShootDays (your commitments)', 'How long you are busy', U('foundation', 'Advance stops at a reminder'))
c(f, '"Reminder"', D, 'plan.remindMin', 'state.ts addPlan (plan-reminder event)', 'When the reminder interrupts', U('foundation', 'its day-ahead reminder fires, names the day'))
c(f, '"Search Places"', V)
f = 'Shell.tsx'
c(f, '"Advance To"', D, 'clock', 'state.ts processUntil', 'How far time moves', U('foundation', 'Advance stops at a reminder'), E('viewports', 'Advance lists the plans it will pass'))
c(f, '"Date"', D, 'clock', 'state.ts processUntil', 'Advance to a date', U('foundation', 'Advance stops at a reminder'))
c(f, '"Time"', D, 'clock', 'state.ts processUntil', 'Advance to a time', U('foundation', 'Advance stops at a reminder'))
c(f, '"Wake Up"', D, 'sleep', 'state.ts startSleep', 'How long you sleep', U('foundation', 'waking says how long you slept'))
c(f, '"Set Wake Time"', D, 'sleep.wakeAt', 'state.ts startSleep', 'When you wake', U('foundation', 'waking says how long you slept'))
c(f, '"Hours Of Sleep"', D, 'sleep.wakeAt', 'state.ts startSleep', 'When you wake', U('foundation', 'waking says how long you slept'))
c(f, '"Set An Alarm"', D, 'sleep.alarm', 'state.ts snooze', 'An alarm lets you snooze', U('foundation', 'sleep wakes for obligations by default'))
# Saved Games and Settings moved out of Startup.tsx when the start screen was slimmed (November 11, 2026).
f = 'SavedGames.tsx'
c(f, '"Save Name"', 'record', 'saveName', 'the saved games list', "The save's name", 'tests/carried-text.test.ts::kept through a save exactly as written', '')
c(f, '"Larger Text"', V, 'the browser (not the save)', 'document data-text', 'Larger text on this device')
c(f, '"Phone Layout"', V, 'the browser (not the save)', 'layout-mode.ts applyLayout (the viewport tag)', "On a phone: its own layout (the default), or the desktop's shrunk to fit", '', E('phone-layout', 'a phone shows its own readable layout'))
c(f, '"Wake Me For Obligations"', D, 'settings.wakeForObligations', 'state.ts runEvents', 'Reminders and call times wake you', U('foundation', 'sleep wakes for obligations by default'))
f = 'Startup.tsx'
c(f, '{`Replacement Place ${i + 1}`}', D, 'repair replacements', 'save.ts repairSave', 'Which place replaces one a save can\'t find', U('migration', 'open after a repair that keeps a backup and changes only the places'), E('failures', 'asks for a replacement, keeping a backup'))
f = 'DataPacks.tsx'
# Not game state: a display choice kept on the device. Nothing in the engine reads a picture.
c(f, '"Show Pictures From The Picture Pack"', V, 'this device (localStorage slate.pictures), not a saved game', 'Picture.tsx picturesOn, Picture', "Off, every picture is a plain placeholder and none is read from storage; on, a picture is read when its box comes near the screen. No engine reads a picture and no outcome changes", '', E('data-packs', 'J09'))
# Not game state: it is sent to the game's own server, which then answers this browser as the owner (docs/DEPLOYMENT.md).
c(f, '"Owner Passphrase"', V, '', 'server/catalog-handler.mjs createOwnerGate', 'Signs the owner in where the server offers it; kept nowhere in the browser', U('catalog-server', 'answers a request from elsewhere only after the owner signs in'), E('owner-access', 'the owner signs in from elsewhere'))

f = 'World.tsx'
c(f, '"Title For The New Project"', 'record', 'project.title', "shown as the project's title: opportunities.ts acceptOpportunity", "The new project's name", 'tests/opportunities.test.ts::accepted, starts a project funded by the commission', 'e2e/career.spec.ts::a proposal is accepted into a funded project')
f = 'WorkViews.tsx'
c(f, '"Song Title"', 'record', 'song.title', 'everywhere a song is named', "The song's title", 'tests/carried-text.test.ts::kept through a save exactly as written', '')
c(f, '"Where It Comes From"', D, 'song.origin, rights', 'songs.ts songTasks; awards-rules.ts songProblems', 'Written for the work, commissioned, licensed or public domain: the work, the clearance and song awards', U('songs', 'a commissioned song is written by a songwriter and a lyricist'), E('journey-c', 'songs written, recorded and cleared in production'))
c(f, '"Lyrics"', D, 'song.plan.lyrics', 'songs.ts songTasks', 'Whether lyrics are written, and by whom', U('songs', 'a commissioned song is written by a songwriter and a lyricist'), E('journey-c', 'songs written, recorded and cleared in production'))
c(f, '"Music By"', D, 'song.writers', 'songs.ts songCredits; awards recipients', 'Who is credited and who a song award goes to', U('awards-catalog', 'an original song goes to the song'), E('awards', 'Songs'))
c(f, '"Lyrics By"', D, 'song.writers', 'songs.ts songCredits; awards recipients', 'As above', U('awards-catalog', 'an original song goes to the song'), E('awards', 'Songs'))
c(f, '"Rights Holder"', R, 'song.license.holder', 'shown with the song', 'Who a licensed song is cleared with', '', E('journey-e', 'refused with a reason, then recovered'))
c(f, '{`Scene For ${s.title}`}', D, 'song.uses', 'songs.ts songUses', 'Where the song plays: the clearance, the recording and song rules', U('songs', 'a commissioned song is written by a songwriter and a lyricist'), E('awards', 'Songs'))
c(f, '"How It Plays"', D, 'songUse.placement', 'awards-rules.ts songRuleProblem', 'Performed, background or end credits: what song categories accept', U('songs', 'a commissioned song is written by a songwriter and a lyricist'), E('awards', 'Songs'))
c(f, '"Minutes It Plays"', D, 'songUse.minutes', 'awards-rules.ts songRuleProblem', 'Minimum-length song rules', U('songs', 'a commissioned song is written by a songwriter and a lyricist'))
c(f, '{`${c.name} Performs ${s.title}`}', 'identity', 'song.performers', 'credits: songs.ts songCredits (Song Performed By), and the casting notes: casting-notes.ts fitNotes', 'Who is credited as singing it, and whose casting notes say the part sings; it scores and costs nothing', 'tests/songs.test.ts::played to delivery: writers are whoever wrote', 'e2e/awards.spec.ts::Songs')
c(f, '{`${v.label}: ${sceneLabel(p, sc)}, In Place Of "${song.title}"`}', D, 'version.songChanges', 'song-actions.ts changeVersionSong', 'A version swaps one song for another: its song awards and credits', U('songs', 'a version'), E('awards', 'Songs'))
c(f, '{`${c.name} On Screen (Minutes)`}', D, 'edit.screenTime', 'screen-time.ts shareCheck', 'The 5% guest rule reads recorded screen time', U('screen-time', 'a record made when the scene ran another length'), E('awards', 'Emmys guest'))
c(f, '{`${c.name} Heard Only (Minutes)`}', D, 'edit.screenTime', 'screen-time.ts screenTotal', 'Heard-only time never counts as on screen', U('screen-time', 'a record made when the scene ran another length'), E('awards', 'Emmys guest'))

# ---------------- Browser evidence added November 10, 2026 (after #59) ----------------
# Each citation below names the test and what it proves in the browser: the control used, the consequence read on the
# screen, a refusal or limit met where the control has one, and the choice read back after the game is reopened where
# that was checked. `kind` says whether the test is a targeted interaction journey (it stops once the decision has done
# what it does) or a full playthrough (the project is made in the browser through production). Rows cited before this
# pass keep their journey and take their kind from the spec file (PLAYTHROUGHS); their effect column says what they show.
# The v3 package (November 12, 2026): full stories, the series plan, more of a character, and setting one aside.
f = 'ScriptViews.tsx'
c(f, '"Central Question"', 'identity', 'story.question', 'shown in the Story panel; part of the Statement Of Intent for a documentary', "Your words; the game doesn't read them", 'tests/carried-text.test.ts::kept through a save exactly as written', '', n=2)
c(f, '"Synopsis"', 'identity', 'story.synopsis', 'shown in the Story panel', 'The whole story in a paragraph; your words, never read for meaning', 'tests/carried-text.test.ts::kept through a save exactly as written', '')
c(f, '"Who It Is For"', 'identity', 'story.audience', 'shown in the Story panel', 'Your words; the audience age range that engines read is on the Overview page', 'tests/carried-text.test.ts::kept through a save exactly as written', '')
c(f, '"How It Is Built"', 'identity', 'story.structure', 'shown in the Story panel', 'A name for the shape; the acts themselves are under Acts And Threads', 'tests/carried-text.test.ts::kept through a save exactly as written', '')
for lab, st in [('"What An Episode Does"', 'series.engine'), ('"How Its People Change"', 'series.changes'), ('"Places It Returns To"', 'series.recurring'), ('"How It Goes On Or Ends"', 'series.continuation')]:
    c(f, lab, I, st, 'season.ts setSeriesPlan; shown in the season plan', 'Your plan for the series; the game doesn\'t score it')
for lab, st in [('"Why They Want It"', 'motivation'), ('"What Stands In The Way"', 'obstacle'), ('"What In Them Pulls Against It"', 'contradiction'), ('"How They Change"', 'arc'), ('"How They Speak"', 'voice')]:
    c(f, lab, I, f'character.{st}', 'shown with the part', 'Your words for the part; the game doesn\'t read them')
c(f, '"Give Their Scenes, Lines And Relationships To"', D, 'who takes a set-aside character\'s scenes', 'projects.ts archiveCharacter', 'Their scenes, lines, relationships and threads go to the character chosen; with nobody chosen the scenes simply lose them', U('characters', 'can give their scenes, lines and bonds to someone else, with no bond to oneself and none twice'))
c(f, '"What It Is About"', 'identity', 'Project.docPlan.subject', 'shown as advice: documentary.ts proposeDocumentaryPlan (the research questions it writes)', "The subject the proposed questions ask about; the player's words", 'tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing', '')
c(f, '"Kind Of Subject"', 'identity', 'Project.docPlan.kind', 'shown as advice: documentary.ts proposeDocumentaryPlan (the research questions and who to approach)', 'Which research questions are proposed and which kinds of people to approach; nothing is found or scored', 'tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing', '')
c(f, '"Puppet Face"', D, 'character.faceMethod', 'production/tasks.ts (sm:faces, sm:armature, sm:animation); rates.ts FACE_METHODS', 'Replacement faces add a face set and its materials and animate quicker; a mechanical head adds armature days and animates slower', U('media', 'a puppet face is a choice of work'))
c(f, '"New Character\'s Name"', 'identity', "the split-off character's name", "shown as the new character's name: projects.ts splitCharacter", "The new character's name everywhere it is shown", 'tests/characters.test.ts::a new character takes the chosen scenes', '')
c(f, '{sceneLabel(p, s)}', D, 'which scenes a split-off character takes', 'projects.ts splitCharacter', 'Those scenes, their lines and the arc beats set there move to the new character; the original keeps the rest and its contracts', U('characters', 'a new character takes the chosen scenes'), n=2)
f = 'AdaptWork.tsx'
c(f, '"Working Title"', R, 'project.title', 'everywhere a project is named', "The project's name; the work's title to start with", U('proposal', 'makes one project'))
c(f, '"Format"', D, 'axes.format', 'proposal.ts proposeFromSource; projects.ts, production/tasks.ts', 'How many of the recorded people it carries, how many scenes, a season; then the work like any project', U('proposal', 'fits the work to the format'))
c(f, '"Medium"', D, 'axes.medium', 'production/tasks.ts buildTasks', 'Live action shoots; animation has no shoot days but studio and render time', U('estimates', 'same script, different production method'))
c(f, "{medium === 'hybrid' ? 'Animation Technique For Animated Scenes' : 'Animation Technique'}", D, 'axes.technique', 'production/tasks.ts buildTasks', 'Which animation pipeline does the work', U('estimates', 'same script, different production method'))
c(f, '"Episodes"', D, 'axes.episodeCount', 'proposal.ts (the season it proposes); projects.ts', 'How many episodes the season plan has', U('proposal', 'fits the work to the format'))
c(f, "{episodic ? 'Target Minutes Per Episode' : 'Target Runtime In Minutes'}", D, 'axes.targetRuntimeMin', 'proposal.ts (cast and scene count); estimate.ts', 'A short follows one strand of a long work; a feature compresses it', U('proposal', 'fits the work to the format'))
c(f, '{`Name For ${c.name}`}', 'identity', 'the names the proposal writes', 'shown everywhere the brief names them: blueprints.ts named, applyBlueprint', "The player's own name for one of the work's people, used everywhere the brief names them", 'tests/proposal.test.ts::makes one project', '')
f = 'ReviseBrief.tsx'
c(f, '{`Keep My ${c.label}`}', D, "which of the player's words a revision leaves alone", 'blueprints.ts applyBlueprint', 'A kept field is not replaced', U('blueprints', "keeps the player's own words where they choose to, leaves a locked field alone, and says so first"))
c(f, '{`Keep My ${c.label} And Add None`}', D, "whether a revision adds the proposal's people or outline beside the project's", 'blueprints.ts applyBlueprint', 'Kept: nothing is added; unticked: the proposal\'s are added beside, and nothing is removed', U('proposal', 'revising'))
f = 'PlanViews.tsx'
c(f, '"Spending Ceiling"', D, 'Project.mandates[].ceiling', 'mandates.ts guideMePlan, runMandate, guideMeRefusal', 'The most Guide Me may commit for a department: offers that do not fit are not sent, and a counteroffer past it comes back to the player', U('guide-me', 'never goes past the ceiling'))
# The real music catalog (music-catalog.ts, from November 13, 2026: the owner's v5 brief, 3).
f = 'MusicCatalog.tsx'
c(f, '"Find A Composer, Artist Or Recording"', D, 'none (a search of the music catalog)', 'music-catalog.ts searchMusic', 'Which real people, groups and recordings are listed, to license or consider', U('music-catalog', 'finds people by name and role'))
c(f, '"Their Role"', D, 'none (a filter of the music catalog)', 'music-catalog.ts searchMusic', 'Only people credited in that role are listed, and recordings only for performers', U('music-catalog', 'finds people by name and role'))
# The Release Plan (release-plan.ts, from November 13, 2026: the owner's v5 brief, 6).
f = 'ReleasePlan.tsx'
c(f, '{PLAN_ROUTES[r].label}', D, 'Project.releasePlan.routes', 'release-plan.ts setReleasePlan, proposalRefusal, selfRefusal; finish.ts festivalHold', 'Which routes can be worked: a buyer route opens proposals, a route you run opens its booking, festival-first holds every public release', U('release-plan', 'festival-first holds every public release'))
c(f, '"Plan Territories"', D, 'Project.releasePlan.territories', 'release-plan.ts buyerValue, proposeLicence, selfCosts, releaseYourself', "Where proposals and your own releases go: more territories are worth more, cost more and can't include one an exclusive deal holds", U('release-plan', 'where an exclusive deal holds the rights'))
c(f, '"First Public Date"', D, 'Project.releasePlan.date', 'release-plan.ts leadDays, releaseYourself (planRelease date)', 'The day your own releases go out and how long after signing a buyer releases', U('release-plan', 'names every cost first'))
c(f, '"Held For Festivals Until"', D, 'Project.releasePlan.festivalUntil', 'finish.ts festivalHold in planRelease and acceptDistribution', 'No public release, and no offer signed for one, before this date', U('release-plan', 'festival-first holds every public release'))
c(f, '"Version Abroad"', D, 'Project.releasePlan.version', 'release-plan.ts releaseYourself (finish.ts setReleaseVersion)', 'A dubbed version is reserved and paid on release, and reaches more people where it is dubbed', U('release-plan', 'keeps the plan and its proposals through a save'))
c(f, '"Promotion Budget"', D, 'Project.releasePlan.promo; DistributionOffer.promo', 'release-plan.ts selfCosts; distribution.ts promoLift in reportedGross', 'Paid on release, and the same release reports more with it than without', U('release-plan', 'more with promotion'))
c(f, '{`${label}: Buyer`}', D, 'LicenceProposal.buyer', 'release-plan.ts proposeLicence, answerProposal', 'Who answers, and who a rejection on the work rules out for good', U('release-plan', 'finally for that buyer'))
c(f, '{`${label}: Your Ask`}', D, 'LicenceProposal.ask', 'release-plan.ts answerProposal', 'Accepted at or under what the buyer would pay, countered up to half again, rejected beyond', U('release-plan', 'is accepted at or under what the buyer would pay'))
c(f, '{`${label}: Exclusive`}', D, 'LicenceProposal.exclusive; DistributionOffer.exclusive', 'release-plan.ts buyerValue; distribution.ts heldTerritories', 'Worth a fifth more, and holds its territories from every other deal for a year from release', U('release-plan', 'goes through a sales agent'))
f = 'YourMoney.tsx'
c(f, '"Put In From Your Own Money"', D, 'state.money postings; project finance deal (savings)', 'personal.ts putInOwnMoney, putInRefusal', 'Money leaves your account and arrives in the project as Your Own Money, nobody repaid from it', U('personal', 'puts money into a project only by your choice'))
# Your company (company.ts, from November 13, 2026: the owner's v5 brief, 9).
# Company Name, Put In When It Is Registered, Move Between You And The Company and Put In From The Company left with the
# company on November 14, 2026 (the owner's v9 package, 6); their rows stayed here, citing tests/company.test.ts, which
# went with it, so this tool stopped at reading that file until November 16, when they were taken out. Banner Name stays.
c(f, '"Banner Name"', 'record', 'state.banner', 'shown in credits: company.ts setBanner, productionCredit; FinishViews.tsx credits', 'The name your work is credited under when no company produces it; it opens no account and moves nothing', 'tests/v8-company.test.ts::credits your work under it', '')
f = 'Papers.tsx'
# Your papers (papers.ts, from November 14, 2026: the owner's v8 package, 05).
# Brought back in line with docs/input-audit/CONTROLS.csv on November 16, 2026, which the screens had kept and this hadn't. Working In became Country.
c(f, '"Country"', V, '', 'papers.ts entryRight visaCheck workRight', 'Which country Visiting And Working reads: what entering it asks of you, and what working there asks', U('v8-papers', 'a visa with a recorded fee and time'))
f = 'Recognised.tsx'
c(f, '"Search By Name"', V)
# Banking.tsx's four controls (Account To Apply For, From, To, Amount) left with Banking.tsx on November 14, 2026, when
# 1221's bank screens replaced it (src/ui/bankworld, below); their rows stayed here until November 16.
f = 'FirstLook.tsx'
c(f, '"Development Money From The Deal"', D, 'project finance deal (first-look); FirstLook.drawn', 'first-look.ts drawDevelopment, developmentRefusal, repayTurnaround', "The studio's development money arrives in a covered project, repaid from another studio's money if one takes it after a pass", U('first-look', 'puts development money into a covered film'))
f = 'YourMoney.tsx'
f = 'Equipment.tsx'
c(f, "{`Hire The Rental House's Package On A Day The Kit Can't Serve (${money(housePackageFee(p))} A Day)`}", D, 'Project.kit.packageApproved', 'production/shoot.ts (a day the kit cannot serve); equipment.ts setPackageApproval', "Approved: such a day hires the package and is shot; not approved: the day is postponed, nothing paid, and the shortage waits", U('equipment', 'without approval, a day the kit'))
c(f, '"Show"', V)
c(f, '"Show"', V, n=2)
f = 'MusicTab.tsx'
c(f, '"Let The Composer\'s Themes Stand Without My Review"', D, 'music.brief.delegateReview', 'cues.ts onThemesDone, themesGate; production/workday.ts', 'Composition starts as soon as the themes are written, with no review or notes rounds', U('cues', 'handed to the composer, the themes stand as written'))
c(f, '"Let The Composer\'s Themes Stand Without My Review"', D, 'music.brief.delegateReview', 'cues.ts onThemesDone, themesGate; production/workday.ts', 'Composition starts as soon as the themes are written, with no review or notes rounds', U('cues', 'handed to the composer, the themes stand as written'), n=2)
c(f, '"Music Spending Ceiling"', D, 'Project.mandates[].ceiling (Music)', 'mandates.ts guideMePlan, runMandate, guideMeRefusal', 'The most Guide Me may commit for the composer and music supervisor; past it, a counteroffer comes back to the player', U('guide-me', 'never goes past the ceiling'))
c(f, '"Your Notes On The Themes"', D, 'music.themes.notes, rounds', 'cues.ts giveThemeNotes, themeTasks; song-actions.ts syncMusicTasks', 'A round of revision, days of the composer\'s work, before composition can start', U('cues', 'notes add a round of revision'))
c(f, '"What Music It Has"', D, 'music.brief.approach', 'cues.ts proposeCues, scoreMinutes; production/tasks.ts (post:music, post:score-session)', 'Silence has no score work and needs no composer; songs only scores nothing; a score places cues', U('cues', 'silence has none and needs no composer'))
c(f, '"The Score\'s Sound"', D, 'music.brief.style -> axes.score', 'craft.ts SCORES, scoreSessions; production/tasks.ts', 'Players are recorded in sessions; electronic needs none; percussion takes longer to write', U('craft', 'score'))
c(f, '"How Much Of It Is Scored"', D, 'music.brief.density', 'cues.ts proposeCues, scoreMinutes; production/tasks.ts post:music', 'More scenes scored, more minutes for the composer', U('cues', 'the minutes scored, not the running time'))
c(f, '{`Intensity Of ${c.code}`}', 'decision', 'cue.intensity', 'cues.ts judgeScore', "A loud cue under dialogue costs the score's assessment; it is kept when the plan is proposed again", 'tests/cues.test.ts::a loud cue under dialogue costs the lines it covers; lowered, it costs nothing', '')
c(f, '{LICENCE_MEDIUM_LABELS[m]}', D, 'licence scope.media', 'music.ts holderFee, releaseLicenceRefusal', 'Each medium asked for raises the price and the chance of a no; a release in a medium not granted is refused', U('music', 'a release outside its media'))
c(f, '"The Whole World"', D, 'licence scope.territories (worldwide)', 'music.ts holderFee, licence-answer (refusal odds, counteroffer), releaseLicenceRefusal', 'Worldwide costs three times one country, is refused more often, and may come back as an offer for the home country only', U('music', 'a worldwide request refused can come back narrower'))
c(f, '"Countries, By Two-Letter Code"', D, 'licence scope.territories', 'music.ts holderFee, releaseLicenceRefusal', 'A release to a country not granted is refused with its code', U('music', 'a release outside its media, its territories or its years is refused'))
c(f, '"For How Long"', D, 'licence scope.years', 'music.ts holderFee, agreeLicence (expiry), licence-expiry', 'Longer costs more; when it runs out, new releases are refused until it is renewed', U('music', 'runs out after its years'))
f = 'SourcePicker.tsx'
c(f, '"Search Works"', V)
c(f, '"Medium"', V)
c(f, '"One Of The Game\'s Genres"', V)
c(f, '"What Is Recorded About Its Rights"', V)

PLAYTHROUGHS = {'journeys', 'careers', 'connected', 'journey-a', 'journey-c', 'release-schedule', 'rolling-delivery', 'live-action', 'first-project', 'media'}
J = {}
def cite(file, label, ref, kind, proves, n=1):
    v = C[(file, label, n)]
    C[(file, label, n)] = (*v[:5], ref)
    J[(file, label, n)] = (kind, proves)
T, P = 'targeted', 'playthrough'
dec = lambda t: E('decisions', t)
WS, RS, GL = 'work schedule and staffing rates', 'release settings', 'genre emphasis and dialogue languages'
f = 'PlanViews.tsx'
cite(f, '"Rehearsal Days"', dec(WS), T, 'From 3 to 11 rehearsal days the casting window quotes 4 more paid days for the part; 25 stops at 20; 11 is read back after Save And Exit and Continue')
cite(f, '"Six-Day Weeks"', dec(WS), T, 'Without it the built shoot has no Saturday; with it a Saturday is a shoot day; still ticked and saved after reopening')
cite(f, '"Work On Public Holidays"', dec(WS), T, 'Without it the shoot skips the August 31 bank holiday though it runs either side; with it that day is a shoot day; kept after reopening')
cite(f, '{`Day Rate For ${c.name}`}', dec(WS), T, 'Half the asking rate is declined ("The rate was too low", logged); 80% brings a counteroffer at the ask, accepted at that rate; four times is refused at once, corrected and accepted')
cite(f, '{`Writer For Episode ${e.number}`}', E('journeys', 'TV limited series'), P, 'A hired episode writer is given episode 2: the credits list them for episode 2, and you for 1 and 2 (you wrote its approved scenes)')
cite(f, '{`Emphasis For ${sceneLabel(p, s)}`}', E('live-action', 'live-action short'), P, 'A detail emphasis makes the call sheet say the scene needs inserts')
cite(f, '{`Coverage For ${sceneLabel(p, s)}`}', E('live-action', 'live-action short'), P, 'A master only says the edit will lack inserts unless a pickup shoots them')
cite(f, '{`Takes For ${sceneLabel(p, s)}`}', E('live-action', 'live-action short'), P, 'Five takes a setup raises the share of the standard plan\'s time the call sheet quotes')
cite(f, '{`Site For ${place}`}', E('live-action', 'live-action short'), P, 'A cheaper stand-in is chosen from three priced sites, and the card says it costs less and falls through more often')
f = 'FinishViews.tsx'
cite(f, '"Episodes On The Premiere"', dec(RS), T, 'Three on the premiere puts episodes 2 and 3 on the release date and episode 4 a week later; the saved dates match after reopening')
cite(f, '"Territory Code"', dec(RS), T, 'XX is refused with a reason and nothing is planned; GB, then IE, are planned as two releases of the season; both kept after reopening')
f = 'Projects.tsx'
cite(f, '?', dec(GL), T, 'Comedy primary: the Golden Globes drama category turns the feature away as comedy; the same genres with Drama made primary: it doesn\'t; the emphasis is saved')
cite(f, '?', dec(GL), T, 'French added to the dialogue languages: a part can speak French, and you, who speak none, need coaching to play it; the English part doesn\'t; kept after reopening', n=2)
f = 'ScriptViews.tsx'
cite(f, '"Competes As"', dec(GL), T, 'Declared Comedy Or Musical, a drama-led feature is turned away from the Golden Globes drama category; saved as declared')
cite(f, '"Speaks"', dec(GL), T, 'Offers only the dialogue languages; French for Maya puts her, not Ben, in the coaching notice on Cast, still there after reopening')
cite(f, '"Awards Placement"', E('script-rules', 'a supporting antagonist'), T, 'Leading says the part is entered in the leading categories as placed; By Role Size returns it to supporting')
cite(f, '"Essential To The Story"', E('script-rules', 'a mature project'), T, 'Cutting the essential scene is previewed with the gap it leaves (editing 8 points lower), then carried as a gap in the edit')
cite(f, '"Source Material"', E('awards', 'Oscars: one film in several categories'), T, 'Declared adapted, the Adapted Screenplay category opens to the film and Original Screenplay says it is declared adapted')

# The season planned as the last (continuation.ts, from November 15, 2026): in the table, not here, until November 17.
c('Projects.tsx', '"Plan This Season As The Last"', D, 'project.finalSeason', 'continuation.ts season-decision, canContinue', 'The season ends as planned: nobody decides on another, and no next season can be started', 'tests/v10-planned-ending.test.ts::ends as planned', 'e2e/v10-planned-ending.spec.ts::a season planned as the last ends as planned')
J[('Projects.tsx', '"Plan This Season As The Last"', 1)] = ('targeted', '')

# Homes And Property (homes/*.ts, from November 17, 2026: the owner's Homes & Property package). Searching and sorting
# are views; colours and the viewing day are records shown where they're chosen; every choice that moves money, time or
# what may be done is a decision, read by the engine named and compared by tests/homes-choices.test.ts.
f = 'Homes.tsx'
HC = lambda t: U('homes-choices', t)
HJ = lambda t: E('homes', t)
c(f, '"Something Broken"', D, 'repairs[].component', 'renting.ts reportRepair (who repairs: the landlord, or you for your things and damage you caused)', "The landlord's heating is mended free; your own desk is quoted and paid by you", HC('which thing is broken decides who pays'), HJ('Renting in London'))
c(f, '"Something Broken"', D, 'repairs[].component', 'renting.ts reportRepair, approveRepair', "An owner's repair is quoted and paid by them; a home with something poor can't be let until it's mended", HC('which thing is broken decides who pays'), HJ('Letting in Los Angeles'), n=2)
c(f, '"Ask Permission For"', D, 'permissions[].work', 'renting.ts askPermission, decidePermission', 'Reversible work is granted on condition it is put back; structural and outside work is refused', U('homes', 'a tenant asks'))
c(f, '"Place"', V, '', 'market.ts marketEvidence, offersIn', 'Which place the homes on offer are drawn for')
c(f, '"Looking To"', V, '', 'Homes.tsx FindHome', 'Rent, buy a home, or buy land: which offers are listed')
c(f, "{`Most You'll Pay${ev ? ` (${ev.currency}", V, '', 'Homes.tsx FindHome', 'Filters the list')
c(f, '"Bedrooms At Least"', V, '', 'Homes.tsx FindHome', 'Filters the list')
c(f, '"Sort By"', V, '', 'Homes.tsx FindHome', 'Orders the list')
c(f, '"Favourites Only"', V, '', 'Homes.tsx FindHome', 'Filters the list to saved homes')
c(f, '"Viewing Day"', R, 'viewings[].at', 'shown in Viewings: index.ts arrangeViewing, view', 'When the viewing is; what it shows is said on the day', U('homes', 'a viewing comes on its day'))
c(f, '{`Your Offer (${home.currency})`}', D, 'purchases[].offerMinor', 'buying.ts makeOffer, answerOffer, acceptCounter', 'At 97% of asking or more it is accepted; from 90% the seller counters; below, refused', HC('an offer below asking is countered'))
c(f, '"Paying With"', D, 'purchases[].finance', 'buying.ts purchaseQuote, decideFinance, complete, mortgageDue', 'A mortgage is borrowed and repaid monthly with interest; cash is paid at completion', HC('the deposit share and the term set the loan and the payment'), HJ('Buying in Los Angeles'))
c(f, '"Your Deposit (%)"', D, 'purchases[].finance.loanMinor', 'buying.ts purchaseQuote', 'What you borrow, and so the monthly payment', HC('the deposit share and the term set the loan and the payment'))
c(f, '"Mortgage Term"', D, 'purchases[].finance.years', 'buying.ts purchaseQuote, mortgageDue', 'The monthly payment and how long it runs', HC('the deposit share and the term set the loan and the payment'))
c(f, '"Have It Inspected"', D, 'purchases[].inspect', 'buying.ts makeOffer, inspect', "The inspector's fee, and what the inspection finds before completion", HC('an inspection is paid for'))
c(f, '{label}', D, 'builds[].design (style, roof, materials, walls, windows, door, garage, driveway, garden)', 'building.ts saveDesign, buildQuote', 'A garage, a paved drive or a garden is costed in the plan; every choice is drawn in the picture', HC("a design's garage, balconies, porch and size change the cost plan"), HJ('Land in Austin'))
c(f, '{label}', R, 'builds[].design colours', 'said in words on the home: Homes.tsx outsideWords', "The colour of the roof, walls, frames and door, said on the home's facts", U('homes', 'changes with the work done to it'), n=2)
c(f, '"Floors"', D, 'builds[].design.floors', 'building.ts designProblems, buildQuote', 'The footprint each floor takes, and so what fits the plot', HC("a design's garage, balconies, porch and size change the cost plan"))
c(f, '"Width (m)"', D, 'builds[].design.widthM', 'building.ts designProblems', 'The footprint drawn must match the floor area a floor', HC("a design's garage, balconies, porch and size change the cost plan"))
c(f, '"Depth (m)"', D, 'builds[].design.depthM', 'building.ts designProblems', 'The footprint drawn must match the floor area a floor', HC("a design's garage, balconies, porch and size change the cost plan"))
c(f, '"Floor Area (m²)"', D, 'builds[].floorAreaM2', 'building.ts buildQuote, designProblems', 'The cost plan, at the rate a square metre', HC("a design's garage, balconies, porch and size change the cost plan"))
c(f, '"Windows Across Each Floor"', R, 'builds[].design.windowsPerFloor', 'said in words on the home: Homes.tsx outsideWords', "Said on the home's facts", U('homes', 'changes with the work done to it'))
c(f, '"Balconies"', D, 'builds[].design.balconies', 'building.ts buildQuote, designProblems', 'Each costs the game\'s estimate; a balcony needs a floor above the ground', HC("a design's garage, balconies, porch and size change the cost plan"))
c(f, '{title(o)}', D, 'builds[].design.outdoor', 'building.ts buildQuote, designProblems', 'A pool, porch, terrace or fence is costed; a pool needs garden space', HC("a design's garage, balconies, porch and size change the cost plan"))
c(f, '{`${ROOM_WORDS[r.kind]} ${i + 1} (m²)`}', D, 'builds[].rooms', 'building.ts designProblems (model.ts roomCheck)', 'Rooms must fit the floor area with halls and stairs', HC("a design's garage, balconies, porch and size change the cost plan"))
c(f, '"Add A Room"', V, '', 'Homes.tsx AddRoom', 'Which room the Add button adds')
c(f, '"Home"', V, '', 'Homes.tsx Improvements', 'Which of your homes the work and furnishings are for')
c(f, '"Work"', D, 'jobs[].work', 'living.ts workQuote, workRefusal, startWork, workDone; model.ts permissionFor', 'What it costs, who must agree, how long it takes, and what changes when it is done', HC('the work chosen sets its cost'))
c(f, '"New Colour"', R, 'jobs[].choice.color -> design.wallColor', 'said in words on the home: living.ts workDone; Homes.tsx outsideWords', 'The walls are that colour once the work is done, in a new revision of the design', U('homes', 'changes with the work done to it'))
c(f, '"Roof Material"', R, 'jobs[].choice.roofMaterial -> design.roofMaterial', 'said in words on the home: living.ts workDone; Homes.tsx outsideWords', 'The new roof is that material, in a new revision of the design', HC('the work chosen sets its cost'))
c(f, '"Category"', V, '', 'market.ts applianceCatalog', 'Which records are listed')
c(f, '"Brand Or Model"', V, '', 'market.ts applianceCatalog', 'Filters the records')
c(f, '"For The Room"', D, 'items[].roomId', 'living.ts itemCheck, buyItem, installRefusal', "A washing machine needs water and a drain: a room without them refuses it", HC('the room chosen decides whether a washing machine can go in'))
c(f, '"Nights"', D, 'stays[]', 'living.ts bookStay', 'What the stay costs, at the game\'s nightly estimate', HC('nights booked set what a stay costs'))
c(f, '{`Asking Price (${cur})`}', D, 'sales[].askingMinor', 'buying.ts listForSale, buyerOffer', 'How long a buyer takes and what they offer (never above the asking price)', HC('asking more than it is worth'))
c(f, '{`New Rent (${cur})`}', D, 'lettings[].rentMinor', 'letting.ts changeRent, chooseTenant, receiveRent', 'What the tenant pays each month', HC('a lower rent, set once applicants come, is what is received'))
c(f, '{`Rent A Month (${cur})`}', D, 'lettings[].rentMinor', 'letting.ts advertise, applicantsArrive, receiveRent', 'Applicants and what they pay', U('homes', 'rent is income'), HJ('Letting in Los Angeles'))
c(f, '"Have An Agent Manage It"', D, 'lettings[].manager', 'letting.ts receiveRent', "The agent's 10% of each rent, and repairs done without asking", HC('an agent takes a tenth of the rent'))
c(f, '{`Repair Limit (${cur})`}', D, 'lettings[].manager.capMinor', 'letting.ts receiveRent', 'Repairs up to it are done and paid without asking you; above it, they wait for you', HC('an agent takes a tenth of the rent'))

# ---------------- Rows the table gained by hand before November 11, 2026, brought back into this file ----------------
c('Catalog.tsx', '"Title Or Person"', V, '', '', '', '', '', n=1)
c('Catalog.tsx', '"Search Titles"', V, '', '', '', '', '', n=1)
c('Catalog.tsx', '"Show"', V, '', '', '', '', '', n=1)
c('Catalog.tsx', '"Order"', V, '', '', '', '', '', n=1)
c('Catalog.tsx', '{`Include titles not released by ${formatDateKey(today)}`}', V, '', '', '', '', '', n=1)
c('PlanViews.tsx', '"List Performers Who Play This Age First"', V, '', '', '', '', '', n=1)
c('Projects.tsx', '"Years That Pass In The Story"', D, 'character.ageInStory (next season)', 'sequel.ts continueProject', 'Each character is that much older in the next season or sequel; a child in the cast may stop being one', "tests/minors.test.ts::ages a series' characters by the years that pass between seasons", '', n=1)
c('ScriptViews.tsx', '"Up To"', D, 'character.ageInStory', 'story-age.ts storyAge; casting-notes.ts fitNotes', 'An age range: casting compares it with the ages each performer plays', 'tests/minors.test.ts::reads an age, a range or a decade', '', n=1)

# Rows the table had corrected by hand (fitNotes moved to casting-notes.ts; ages under 16 reach minors.ts). A third, a
# song's performer, said decision here after the table made it identity on November 15, 2026; it went on November 16.
c('Creation.tsx', '{`${languageName(l.code)} Proficiency`}', D, 'character.languages', 'production/language.ts personLanguagesFit; casting-notes.ts fitNotes', 'Whether you need a language coach to play a part in that language', 'tests/decision-effects.test.ts::playing a part in a language you speak only a little', '', n=1)
c('ScriptViews.tsx', '"Age In Story"', D, 'character.ageInStory', 'story-age.ts storyAge; casting-notes.ts fitNotes; minors.ts minorFor', "Casting notes who plays the age; a part under 16 is reckoned as a child's, with its hours, crew, licence and shoot days", "tests/minors.test.ts::a child's part takes more shoot days than the same script with an adult", '', n=1)
J[('WorkViews.tsx', '{`${c.name} Performs ${s.title}`}', 1)] = ('targeted', '')

# ---------------- The Creative Depth package, milestone B: looks, crowds, the story's year, and the idea picker ----------------
f = 'ScriptViews.tsx'
LK = 'looks.ts makeupShare, makeupDayCost; production/tasks.ts buildTasks; production/schedule.ts groupShootDays'
c(f, '"Year It Is Set In"', D, 'axes.storyYear', 'looks.ts periodBand, projectBand; projects.ts deriveRequirements; production/tasks.ts buildTasks', 'How far the story is from the year it is made: period research, and how much costume work', U('looks', '1986 made in 2026 is a period: research, and half as much costume work again; 2026 is neither; the look it borrows changes no work'))
c(f, '"The Look It Borrows"', R, 'axes.styleEra', 'the Creative Brief card', 'A note for the departments; changes no work and no date', U('looks', '1986 made in 2026 is a period: research, and half as much costume work again; 2026 is neither; the look it borrows changes no work'))
c(f, '"Crowd Makeup"', D, 'scene.crowdLook', 'looks.ts chairMinutes, makeupDayCost; production/shoot.ts runShootDay', 'Chair time and materials for every background performer on set that day', U('looks', "made up is made up head by head: the people on set, at a background performer's share"))
c(f, '"Extend The Crowd In Post"', D, 'scene.crowdMethod', 'looks.ts physicalCrowd, digitalCrowd; production/tasks.ts buildTasks; production/schedule.ts sceneLoad', 'A quarter of the crowd on set, plates on the day, effects work after the lock', U('looks', 'made partly in post puts a quarter on set, shoots plates, and is finished after the picture is locked'))
c(f, '"Makeup"', D, 'character.look.makeup', LK + '; production/shoot.ts runShootDay; callsheet.ts callSheet; hiring.ts neededRoles', 'Tests and builds before the shoot, chair time out of each day worked, daily materials, and who must be hired', U('looks', 'adds its own tests, builds, crew and daily materials for that character, and leaves every other task as it was'))
c(f, '"Costume From"', D, 'character.look.wardrobe', 'looks.ts costumeCopies, wardrobeMismatch; production/tasks.ts buildTasks', "The costume's own days, materials and fittings, in the copies it needs", U('looks', 'is its own work, in the copies its states and rough scenes need, and leaves the others on the shared costume task'))
c(f, '"Appearance States"', D, 'character.look.states', 'looks.ts statesOf, costumeCopies; production/tasks.ts buildTasks', 'A build for each state, and a costume copy for each', U('looks', 'shortens with a second chair, and each appearance state is its own build'))
c(f, '{`Names Of ${c.name}\'s Looks`}', D, 'character.look.named', 'looks.ts statesOf, stateNames; brief.ts setLook', 'As many looks as names, each named in the scene\'s own select; the count is what builds and costume copies follow', U('states', 'names set the number of looks, are kept as written, and survive a save'))
c(f, '{`${c.name}\'s Look In This Scene`}', D, 'scene.states', 'looks.ts stateIn, statesUsed, costumeCopies, changeMinutes, makeupShare', 'Only the looks that appear are made, and a change of look inside a shooting day takes time out of it', U('states', 'changing looks inside a shooting day takes time out of it; a day in one look loses nothing'))
f = 'IdeaPicker.tsx'
AP = 'brief.ts applyIdea'
ALL = U('brief', 'every idea applies through the one command path and says first what it will do')
c(f, '"Search Ideas"', V)
c(f, '{s.label}', 'identity', 'the words an idea writes', "shown in the idea's words: brief.ts fill", "The player's own names in the idea's words; a blank takes the suggestion", "tests/brief.test.ts::writes the player's names where the idea has slots, and its suggestions where they left them blank", '')
c(f, '{c.name}', D, 'which characters an idea applies to', AP, 'The idea is applied to the characters ticked, and no others', U('brief', 'one choice of a kind for a target: a second makeup method replaces the first, for that character only'))
c(f, '{`Scene ${i + 1}', D, 'which scenes an idea applies to', AP, 'The idea is applied to the scenes ticked, and no others', U('brief', 'a physical gag on a chosen scene makes a stunt of it, with its rehearsal, coordinator and doubled costume'))
c(f, "{`${b.intExt === 'EXT' ? 'Exterior' : 'Interior'}", D, 'which offered scenes are added', AP + '; projects.ts addScene', 'Only the scenes ticked are added to the script', U('brief', 'offered scenes are added only when ticked, and then make the work scenes make'))
c(f, '{`Keep My ${o.label}`}', D, 'which of the player\'s words an idea leaves alone', AP, 'A kept field is not replaced', U('brief', "asks before replacing the player's own words, and leaves them alone when told to keep them"))
for lab in ['"When It Starts"', '"Who It Happens To"', '"What They Must Do"', '"What It Costs"']:
    c(f, lab, I, 'story.logline (once applied)', 'src/ideas/loglines.ts compose; ' + AP, 'One of the four parts of a built logline', U('ideas', "refuses parts that don't go together, and parts that aren't there"))


# Rows revised in the table by hand on November 15, 2026, and brought back here on November 16, where the entry above
# is written by a loop (a later c() for a key replaces the earlier).
c('Creation.tsx', '"Month"', 'identity', 'character.birthDate', 'shown as your age and birthday: state.ts characterAge, observedBirthday; it dates the inheritance (personal.ts inheritanceDay) and seeds the world (state.ts newGame)', 'Age and birthdays; you must be 19 on the starting date', 'tests/dates.test.ts::you are exactly 19 on the starting date', '', n=1)
c('Creation.tsx', '"Day"', 'identity', 'character.birthDate', 'shown as your age and birthday: state.ts characterAge, observedBirthday; it dates the inheritance (personal.ts inheritanceDay) and seeds the world (state.ts newGame)', 'Age and birthdays; you must be 19 on the starting date', 'tests/dates.test.ts::you are exactly 19 on the starting date', '', n=1)
c('Creation.tsx', '"Year Of Birth"', 'identity', 'character.birthDate', 'shown as your age and birthday: state.ts characterAge, observedBirthday; it dates the inheritance (personal.ts inheritanceDay) and seeds the world (state.ts newGame)', 'Age and birthdays; you must be 19 on the starting date', 'tests/dates.test.ts::you are exactly 19 on the starting date', '', n=1)
c('IdeaPicker.tsx', '"When It Starts"', 'identity', 'story.logline (once applied)', 'shown as the logline it builds: src/ideas/loglines.ts compose; brief.ts applyIdea', 'One of the four parts of a built logline', "tests/ideas.test.ts::refuses parts that don't go together, and parts that aren't there", '', n=1)
c('IdeaPicker.tsx', '"Who It Happens To"', 'identity', 'story.logline (once applied)', 'shown as the logline it builds: src/ideas/loglines.ts compose; brief.ts applyIdea', 'One of the four parts of a built logline', "tests/ideas.test.ts::refuses parts that don't go together, and parts that aren't there", '', n=1)
c('IdeaPicker.tsx', '"What They Must Do"', 'identity', 'story.logline (once applied)', 'shown as the logline it builds: src/ideas/loglines.ts compose; brief.ts applyIdea', 'One of the four parts of a built logline', "tests/ideas.test.ts::refuses parts that don't go together, and parts that aren't there", '', n=1)
c('IdeaPicker.tsx', '"What It Costs"', 'identity', 'story.logline (once applied)', 'shown as the logline it builds: src/ideas/loglines.ts compose; brief.ts applyIdea', 'One of the four parts of a built logline', "tests/ideas.test.ts::refuses parts that don't go together, and parts that aren't there", '', n=1)
c('ScriptViews.tsx', '"What An Episode Does"', 'identity', 'series.engine', 'shown in the season plan: season.ts setSeriesPlan', "Your plan for the series; the game doesn't score it", 'tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing', '', n=1)
c('ScriptViews.tsx', '"How Its People Change"', 'identity', 'series.changes', 'shown in the season plan: season.ts setSeriesPlan', "Your plan for the series; the game doesn't score it", 'tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing', '', n=1)
c('ScriptViews.tsx', '"Places It Returns To"', 'identity', 'series.recurring', 'shown in the season plan: season.ts setSeriesPlan', "Your plan for the series; the game doesn't score it", 'tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing', '', n=1)
c('ScriptViews.tsx', '"How It Goes On Or Ends"', 'identity', 'series.continuation', 'shown in the season plan: season.ts setSeriesPlan', "Your plan for the series; the game doesn't score it", 'tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing', '', n=1)
c('ScriptViews.tsx', '"Relationship"', 'identity', 'relationship.kind', 'shown in the season plan', 'Your words', 'tests/carried-text.test.ts::kept through a save exactly as written', '', n=1)
c('ScriptViews.tsx', '"Where It Starts"', 'identity', 'relationship.start', 'shown in the season plan', 'Your words', 'tests/carried-text.test.ts::kept through a save exactly as written', '', n=1)
c('ScriptViews.tsx', '"Where It Ends"', 'identity', 'relationship.end', 'shown in the season plan', 'Your words', 'tests/carried-text.test.ts::kept through a save exactly as written', '', n=1)
c('ScriptViews.tsx', '"Relationship"', 'identity', 'relationship.kind', 'shown in the season plan', 'Your words', 'tests/carried-text.test.ts::kept through a save exactly as written', '', n=2)
c('ScriptViews.tsx', '"Where It Starts"', 'identity', 'relationship.start', 'shown in the season plan', 'Your words', 'tests/carried-text.test.ts::kept through a save exactly as written', '', n=2)
c('ScriptViews.tsx', '"Where It Ends"', 'identity', 'relationship.end', 'shown in the season plan', 'Your words', 'tests/carried-text.test.ts::kept through a save exactly as written', '', n=2)
c('ScriptViews.tsx', '"Description"', 'identity', 'character.description', 'shown as advice: script-explain.ts breakdownComplete', 'Offers include the casting breakdown once all three are written; it changes who accepts nothing', 'tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing', '', n=1)
c('ScriptViews.tsx', '"Wants"', 'identity', 'character.wants', 'shown as advice: script-explain.ts breakdownComplete', 'Offers include the casting breakdown once all three are written; it changes who accepts nothing', 'tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing', '', n=1)
c('ScriptViews.tsx', '"Fears"', 'identity', 'character.fears', 'shown as advice: script-explain.ts breakdownComplete', 'Offers include the casting breakdown once all three are written; it changes who accepts nothing', 'tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing', '', n=1)
c('ScriptViews.tsx', '"Why They Want It"', 'identity', 'character.motivation', 'shown with the part', "Your words for the part; the game doesn't read them", 'tests/carried-text.test.ts::kept through a save exactly as written', '', n=1)
c('ScriptViews.tsx', '"What Stands In The Way"', 'identity', 'character.obstacle', 'shown with the part', "Your words for the part; the game doesn't read them", 'tests/carried-text.test.ts::kept through a save exactly as written', '', n=1)
c('ScriptViews.tsx', '"What In Them Pulls Against It"', 'identity', 'character.contradiction', 'shown with the part', "Your words for the part; the game doesn't read them", 'tests/carried-text.test.ts::kept through a save exactly as written', '', n=1)
c('ScriptViews.tsx', '"How They Change"', 'identity', 'character.arc', 'shown with the part', "Your words for the part; the game doesn't read them", 'tests/carried-text.test.ts::kept through a save exactly as written', '', n=1)
c('ScriptViews.tsx', '"How They Speak"', 'identity', 'character.voice', 'shown with the part', "Your words for the part; the game doesn't read them", 'tests/carried-text.test.ts::kept through a save exactly as written', '', n=1)
c('WritingWork.tsx', "{`What ${name}'s Revision Should Look At`}", 'decision', 'writing[].passes[].focus', 'writing-jobs.ts revisionAims', "A revision aimed at something the episode's script has notes on reads better; Something Else, or an area with no notes, reads as it would have", 'tests/writing-jobs.test.ts::a revision aimed at what the episode has notes on reads better; aimed elsewhere, as it would have', 'e2e/real-people.spec.ts::J05: a director with no recorded date of birth and a writer are hired for a film by job', n=1)

# ---------------- The bank screens (src/ui/bankworld, ported from 1221) ----------------
# From November 16, 2026: until then this read src/ui's own files, and none of these was listed. Each is named by its id,
# or its aria-label where it has none; each decision cites a test that issues its command with what it chooses.
BW = lambda name: 'bankworld/ui/bank/' + name
LC = lambda t: U('bankworld/bank-lifecycle', t)
f = BW('BankCard.tsx')
c(f, 'id="card-apply-bank"', D, 'card.apply bankId', 'systems/cardlife.ts card.apply', 'Which bank the card is applied for at: its rate, its fee, the limit it opens with', U('bankworld/b20-credit-limit', 'waits six months from a new card’s opening'))
c(f, 'id="card-apply-from"', D, 'card.apply transfer, fromId', 'systems/cardlife.ts card.apply; systems/cardoffers.ts transferRefusal', "Which card's balance is moved onto the new one, for the new bank's fee", U('bankworld/cardoffers', 'moves a Chase card’s balance onto Citi’s card after switching, for Citi’s fee, at 0% for eighteen months'))
c(f, 'id={`card-statement-day-${card.id}`}', D, 'account.statementDay', 'systems/cardlife.ts card.set_statement_day', 'The day statements come, and the due date with them', U('bankworld/cardlife', 'moves, and the statement and its due date come with it'))
c(f, 'id={`card-limit-${card.id}`}', D, 'account.creditLimit (asked)', 'systems/cardlife.ts card.request_limit', 'The limit asked for: lowered at once, raised only for a record that earns it', U('bankworld/cardlife', 'lowers on asking, never under what’s owed, and rises only for a record that earns it, by a fifth at most'))
f = BW('BankCardOffers.tsx')
c(f, 'id={`card-money-transfer-${card.id}`}', D, 'card balance; current account', 'systems/cardoffers.ts card.money_transfer', 'How much moves from the card into your account, for its fee, at its transfer rate', U('bankworld/cardoffers', 'pays NatWest’s card into the current account for 3%, at its transfer rate from the day it’s made'))
c(f, 'id={`card-plan-amount-${card.id}`}', D, 'account.plans', 'systems/cardoffers.ts card.plan', 'How much of the purchases goes into a plan paid in equal months', U('bankworld/cardoffers', 'pays a Bank of Ireland purchase off in equal months at 6.7%, from €250, over its own lengths'))
c(f, 'id={`card-plan-months-${card.id}`}', D, 'account.plans (months)', 'systems/cardoffers.ts card.plan', 'Over how many months, at the rate or fee for that length', U('bankworld/cardoffers', 'pays a Bank of Ireland purchase off in equal months at 6.7%, from €250, over its own lengths'))
f = BW('BankCash.tsx')
c(f, 'id="cash-out"', D, 'cash in hand; the account or card', 'systems/cash.ts cash.withdraw, cashQuote', 'How much is taken out, and so its fee', U('bankworld/cash', 'is free at the bank’s own ATM and costs the bank’s fee at another’s, and in the US its owner’s average $3.22'))
c(f, 'id="cash-from"', D, 'cash.withdraw from', 'systems/cash.ts cash.withdraw, cashQuote', "Where the cash comes from: the bank's own machine, another's, the counter, or the credit card as a cash advance", U('bankworld/cash', 'costs the card’s fee, never under its minimum, and draws its rate from the day it’s taken with no grace period'))
c(f, 'id="cash-in"', D, 'cash in hand; the account', 'systems/cash.ts cash.deposit', 'How much cash is paid in', U('bankworld/cash', 'pays it into savings, and the day’s groceries come out of the wallet first where that’s the choice'))
c(f, 'id="cash-into"', D, 'cash.deposit toId', 'systems/cash.ts cash.deposit', 'Which account the cash is paid into', U('bankworld/cash', 'pays it into savings, and the day’s groceries come out of the wallet first where that’s the choice'))
c(f, 'id="cash-at"', D, 'cash.deposit at', 'systems/cash.ts cash.deposit', 'Where it is paid in, where the bank allows it: an ATM, the counter, the Post Office', U('bankworld/cash', 'can use the Post Office in Britain where the bank lets it, and pay in only where it allows that too'))
f = BW('BankLending.tsx')
c(f, 'id="od-limit"', D, 'account.overdraftLimit, overdraftRate', 'systems/lending.ts bank.arrange_overdraft, overdraftOffer', 'How far the account can go below zero at the arranged rate before the fees for going past it', U('bankworld/bank-fees', 'charges it past an arranged limit, and not inside it'))
c(f, 'id="od-per-use"', D, 'account.overdraftPerUse', 'systems/lending.ts bank.arrange_overdraft, chargeForItem', "Paid for by the use instead of by the month, where a Canadian bank offers both", LC('at TD charges $5 the first time a day it is used and nothing a month; the monthly plan charges $5 a month and nothing a use'))
c(f, "id={`term-amount${account ? `-${bank.id}` : ''}`}", D, 'a term deposit account', 'systems/lending.ts bank.open_term', 'How much is locked away for the term, and the interest it earns', U('bankworld/lending', 'is locked away, kept from spending, and paid out with its interest less the tax'))
c(f, 'id="collections-pay"', D, 'the collections account; the current account', 'systems/lending.ts bank.pay_collections', 'How much is paid toward the debt, never more than is owed or held; paid off, it closes', LC('is paid toward from the checking account, never more than is owed or held, and closes when it is paid'))
c(f, 'id="loan-repay-from"', D, 'loan.repayFromId', 'systems/lending.ts bank.set_loan_repayment, repaymentAccount', 'Which account the next payments come from', LC('moves the next payment to the account chosen, and refuses one that is closing or not a checking account'))
c(f, 'id="loan-amount"', D, 'a loan account', 'systems/lending.ts bank.borrow, loanOffer', 'How much is borrowed, and so its rate, payment and whether it is lent', U('bankworld/lending', 'is priced by the record, paid down monthly, and closed when it’s paid'))
c(f, 'id="loan-months"', D, 'loan.loanMonths', 'systems/lending.ts bank.borrow, loanOffer', 'Over how many months: the monthly payment and the interest paid', U('bankworld/lending', 'is priced by the record, paid down monthly, and closed when it’s paid'))
c(f, 'id="loan-purpose"', D, 'bank.borrow purpose', 'systems/lending.ts loanOffer (notFor)', "What it is for, which a lender that won't lend for it refuses", LC('at Capital One, an education expense is refused in Discover’s terms, and any other purpose is lent'))
c(f, 'id="loan-into"', D, 'bank.borrow intoId', 'systems/lending.ts bank.borrow', 'Which account the loan is paid into', LC('borrows at Citi while Chase is primary, pays into Chase, repays from Citi through a change of primary, and counts the loan against the next'))
c(f, 'id="loan-repay"', D, 'loan.repayFromId', 'systems/lending.ts bank.borrow, repaymentAccount', 'Which account repays it, kept through a change of primary', LC('borrows at Citi while Chase is primary, pays into Chase, repays from Citi through a change of primary, and counts the loan against the next'))
c(f, 'id="switch-partial"', D, 'the scheduled switch (partial)', 'systems/lending.ts bank.switch, completeSwitch', "A partial switch: the payments move, the old account stays open, in CASS's 20 working days", LC('in Britain takes CASS’s 20 working days to the full switch’s 7, and leaves the old account open with its balance'))
c(f, 'id="switch-to"', D, 'the scheduled switch (bankId)', 'systems/lending.ts bank.switch, completeSwitch', 'Which bank everything moves to', U('bankworld/bank-moves', 'still switches in Britain, in CASS’s seven working days'))
c(f, 'id="switch-on"', D, 'the scheduled switch (date)', 'systems/lending.ts bank.switch', 'The day it happens, and so until when it can be called off', LC('can be called off until seven working days before its date, then not; called off, nothing moves'))
f = BW('BankMoves.tsx')
MV = U('bankworld/bank-moves', 'moves the primary account, then wages, then orders, then closes Chase, with nothing lost')
c(f, 'id={`close-into-${a.id}`}', D, 'bank.close_current remainderTo', 'systems/bankmoves.ts bank.close_current', 'Where what the closing account holds is sent', MV)
c(f, 'id={`order-from-${o.id}`}', D, 'standing order source', 'systems/bankmoves.ts bank.set_order_source, orderSource', 'Which account the standing order pays from, from its next payment', MV)
c(f, 'id={`autopay-from-${c.id}`}', D, 'card autopay source', 'systems/bankmoves.ts card.set_autopay_from, autopaySource', 'Which account the card is paid from, from its next due date', MV)
OPEN = U('bankworld/bank-moves', 'reviews a Bank of America application for two business days, its $100 deposit waiting on the decision')
c(f, 'id="open-at"', D, 'a new current account', 'systems/bankmoves.ts bank.open_current, openRefusal', 'Which bank the account is applied for at: its fees, its review, its opening deposit', OPEN)
c(f, 'id="open-from"', D, 'bank.open_current fundFrom', 'systems/bankmoves.ts bank.open_current', 'Which account pays the opening deposit', OPEN)
c(f, 'id="open-amount"', D, 'bank.open_current amount', 'systems/bankmoves.ts bank.open_current', 'How much the opening deposit is, at least the bank’s minimum', OPEN)
f = BW('BankPayments.tsx')
c(f, 'id="pay-everyday"', D, 'payments.everyday', 'systems/payments.ts bank.set_payments; systems/spending.ts', "What the day's spending is paid with: cash, the debit card or the credit card", U('bankworld/cardoffers', 'pays CIBC’s 2% on groceries and 1% on bills at the statement, and 0.5% on the rest'))
SO = U('bankworld/b21-banking-proof', 'is made on its day from a US bank, a Saturday included: no rule moving it was read, so that’s an assumption')
c(f, 'id="so-amount"', D, 'a standing order', 'systems/payments.ts bank.add_standing_order', 'How much moves into savings each month', SO)
c(f, 'id="so-day"', D, 'a standing order (day)', 'systems/payments.ts bank.add_standing_order', 'The day of the month it is made, moved by the bank’s own rule where it has one', SO)
c(f, 'id="so-to"', D, 'a standing order (to)', 'systems/payments.ts bank.add_standing_order', 'Which savings account it pays into', SO)
SP = U('bankworld/payments', 'pays on the day set, and not once canceled')
c(f, 'id="sp-from"', D, 'a scheduled payment (from)', 'systems/payments.ts bank.schedule_payment', 'Which account it leaves', SP)
c(f, 'id="sp-to"', D, 'a scheduled payment (to)', 'systems/payments.ts bank.schedule_payment', 'Which account it arrives in', SP)
c(f, 'id="sp-amount"', D, 'a scheduled payment (amount)', 'systems/payments.ts bank.schedule_payment', 'How much moves on the day', SP)
c(f, 'id="sp-date"', D, 'a scheduled payment (date)', 'systems/payments.ts bank.schedule_payment', 'The day it is made', SP)
f = BW('BankSecurity.tsx')
c(f, 'aria-label="Why"', D, 'card.report why', 'systems/security.ts card.report', 'Damaged, lost or stolen: what the replacement costs where the bank charges for some and not others', U('bankworld/security', 'rushes Chase’s for $15 in two business days, refuses a rush Lloyds has none of, and replaces a stolen card free where the bank does'))
f = BW('BankStatements.tsx')
c(f, 'id="statement-account"', V)
c(f, 'id="statement-period"', V)
c(f, 'id="statement-year"', V)
LINES = U('bankworld/statements', 'the lines set: under the low line tells once until it’s back over; a payment over the large line tells, one under it doesn’t')
c(f, 'id="alert-low"', D, 'person.alerts.lowBalance', 'systems/statements.ts bank.set_alerts; systems/obligations.ts accountAlerts', 'A notice when a current account ends a day under it, once until it is back over', LINES)
c(f, 'id="alert-large"', D, 'person.alerts.largePayment', 'systems/statements.ts bank.set_alerts', 'A notice for each payment out over it', LINES)
f = BW('RoundUps.tsx')
RU = U('bankworld/roundups', 'is the player’s to make wherever the bank states no default: nothing is filled in, and the refusal names the choices')
c(f, 'aria-label={label}', D, 'round-ups choice (every, unit)', 'systems/accountlife.ts bank.set_round_ups, roundUpRefusal', 'How purchases are rounded up, where the bank gives a choice', RU)
c(f, 'aria-label="Each Purchase"', D, 'round-ups choice (each purchase)', 'systems/accountlife.ts bank.set_round_ups', 'How much is put aside from each purchase', RU)
c(f, 'aria-label="Minimum Balance"', D, 'round-ups choice (minimum balance)', 'systems/accountlife.ts bank.set_round_ups', 'The balance the current account keeps before any is put aside', RU)
f = 'bankworld/ui/workspaces/BankWorkspace.tsx'
TR = U('bankworld/banking', 'moves between one’s own accounts, and no further than there is')
c(f, 'id="move-from"', D, 'bank.transfer fromId', 'systems/banking.ts bank.transfer', 'Which account the money leaves, and so what it has to move', TR)
c(f, 'id="move-to"', D, 'bank.transfer toId', 'systems/banking.ts bank.transfer', 'Which account it arrives in, and when, between banks', TR)
c(f, 'id="move-amount"', D, 'bank.transfer amount', 'systems/banking.ts bank.transfer', 'How much moves, never more than there is', TR)
c(f, 'id="lender"', D, 'bank.borrow bankId', 'systems/lending.ts bank.borrow, loanOffer', "Which bank the loan is asked of: its rates, its conditions, whether it lends", LC('borrows at Citi while Chase is primary, pays into Chase, repays from Citi through a change of primary, and counts the loan against the next'))

# ---------------- Build and check ----------------
rx = re.compile(r'<(TextField|SelectField|NumberField|Check|PlacePicker|LanguagePicker|GenrePicker|WorldPlacePicker)\b([^>]*?)(/>|>)', re.S)
found = []
for path in sorted(glob.glob('src/ui/*.tsx')):
    s = open(path).read(); seen = {}
    for m in rx.finditer(s):
        lab = re.search(r'label=(\{`[^`]*`\}|"[^"]*"|\{[^}]*\})', m.group(2))
        label = lab.group(1) if lab else '?'
        key = (path.split('/')[-1], label); seen[key] = seen.get(key, 0) + 1
        found.append((key[0], label, seen[key]))

# The bank screens ported from 1221 (src/ui/bankworld, from November 16, 2026: until then this read src/ui's own files
# only). They use plain <input>, <select> and <textarea>, each named by its id, or its aria-label where it has none; the
# tag is read to its own end, as an attribute can hold `=>` and a template its own braces.
def attr(tag, name):
    m = re.search(r'\b' + name + r'=', tag)
    if not m: return None
    i = m.end()
    if tag[i] == '"': return tag[i:tag.index('"', i + 1) + 1]
    depth, j = 0, i
    while True:
        depth += {'{': 1, '}': -1}.get(tag[j], 0); j += 1
        if depth == 0: return tag[i:j]

def raw_controls(path):
    s = open(path).read(); out = []
    for m in re.finditer(r'<(input|select|textarea)\b', s):
        depth, j = 0, m.end()
        while not (s[j] == '>' and depth == 0):
            depth += {'{': 1, '}': -1}.get(s[j], 0); j += 1
        tag = s[m.end():j]
        name = attr(tag, 'id'); aria = attr(tag, 'aria-label')
        out.append(f'id={name}' if name else f'aria-label={aria}' if aria else '?')
    return out

for path in sorted(glob.glob('src/ui/bankworld/**/*.tsx', recursive=True)):
    seen = {}
    for label in raw_controls(path):
        key = (path[len('src/ui/'):], label); seen[key] = seen.get(key, 0) + 1
        found.append((key[0], label, seen[key]))
missing = [k for k in found if k not in C]
stale = [k for k in C if k not in found]
bad = []
for k, v in C.items():
    for ref in (v[4], v[5]):
        if ref:
            p, t = ref.split('::', 1)
            try: src = open(p).read()
            except FileNotFoundError: bad.append((k, ref + ' (no such file)')); continue  # reported, not a crash (from 2026-11-16)
            if t not in src.replace("\\'", "'"): bad.append((k, ref))  # a title with an apostrophe is written \' in its test file
    if v[0] == D and not v[2]: bad.append((k, 'decision without a consumer'))
if missing or stale or bad:
    print('missing', missing, '\nstale', stale, '\nbad', bad); sys.exit(1)
with open('docs/input-audit/CONTROLS.csv', 'w', newline='') as out:
    w = csv.writer(out, lineterminator='\n')  # the table is kept with plain line endings
    w.writerow(['screen', 'label', 'occurrence', 'class', 'state', 'consumer', 'effect', 'unit_test', 'journey', 'journey_kind', 'journey_proves'])
    for k in found:
        ref = C[k][5]
        kind, proves = J.get(k, ((P if ref.split('::')[0][4:-8] in PLAYTHROUGHS else T) if ref else '', ''))
        w.writerow([k[0], k[1], k[2], *C[k], kind, proves])
dj = [k for k in found if C[k][0] == D]
print('decisions with browser evidence:', sum(1 for k in dj if C[k][5]), 'of', len(dj), '; added in this pass:', len(J))
print(len(found), 'controls;', {cl: sum(1 for k in found if C[k][0] == cl) for cl in ('decision', 'identity', 'record', 'view', 'component')})
