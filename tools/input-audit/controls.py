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
c(f, '"First Name"', I, 'character.firstName', 'identity.ts legalName', 'The legal name on credits', U('identity', 'credits carry the legal name'), E('creation', 'editing from Review'))
c(f, '"Middle Name (Optional)"', I, 'character.middleName', 'identity.ts legalName', 'Part of the legal name on credits', U('identity', 'credits carry the legal name'))
c(f, '"Last Name"', I, 'character.lastName', 'identity.ts legalName', 'The legal name on credits', U('identity', 'credits carry the legal name'))
c(f, '"Pronouns"', I, 'character.pronouns', 'state.ts newGame (settledTitle)', 'He/Him and She/Her settle Actor or Actress billing', U('creation', 'pronouns settle the billing'), E('creation', 'a step with something missing says what'))
for lab in ['"Month"', '"Day"', '"Year Of Birth"']:
    c(f, lab, I, 'character.birthDate', 'state.ts characterAge, observedBirthday', 'Age and birthdays; you must be 19 on the starting date', U('dates', 'you must be at least 19 on the starting date'))
c(f, '"Place Of Birth"', D, 'character.birthplaceId', 'identity.ts citizenshipOf -> awards.ts nationality rules', 'Citizenship, which national and European award rules read', U('recovered-rules', 'European Film Awards'), E('awards', 'European Film Awards'))
c(f, '"Where You Live"', D, 'state.locationId', 'state.ts newGame; projects.ts createProject (base)', 'Where the game starts: holidays, weather, the default production base', U('dates', 'creation refuses impossible birth and start dates'), E('world', 'a life can start anywhere in the world'))
c(f, '"Starting Date"', D, 'state.now', 'state.ts newGame', 'When the world starts: which award editions and rules apply', U('dates', 'creation refuses impossible birth and start dates'), E('creation', 'Starting Point'))
c(f, '"Starting Time"', D, 'state.now', 'state.ts newGame', 'The hour the clock starts', U('dates', 'creation refuses impossible birth and start dates'))
c(f, '{props.label}', 'component', '', '', 'PlacePicker definition, used by the place controls above')
c(f, '"Your Savings"', D, 'draft.savings -> state.money (savings posting)', 'personal.ts openPersonalMoney, personalBalance, putInRefusal', 'What is in your own account at the start, and so what you can put into a project', U('personal', 'opens with what was chosen'))
c(f, '"Your Family\'s Circumstances"', D, 'draft.family.circumstances', 'personal.ts familyTerms', 'The most your family could offer; it decides nothing else about you', U('personal', 'is bounded by their circumstances, and decides nothing else'))
c(f, '"What Your Family Offers"', D, 'draft.family.support -> state.money.family', 'personal.ts familyTerms, openPersonalMoney, family-repayment, takeHome', 'A gift is yours; a loan is repaid monthly from your account; an investment takes a share of income you take home', U('personal', 'opens with what was chosen'))
c(f, '{`${g.name}, ${money(g.price!)}`}', D, 'draft.family.gear -> state.gear (owner family)', 'equipment.ts onNewGame, lentValue; personal.ts familyTerms', 'What your family lends goes on your shelf, free to use, not yours to sell, and bounded by their circumstances', U('equipment', 'is bounded by their circumstances'))
c(f, '"How Much"', D, 'draft.family.amount', 'personal.ts familyTerms, openingPreview', 'What your family puts in, and so what is owed', U('personal', 'is read on Review before the story starts'))
c(f, '"Search Ethnicities"', V)
c(f, '"Describe Your Ethnicity"', I, 'character.heritages (custom)', 'identity.ts splitBackgrounds', 'Your own words for your ethnicity, kept and shown', '', E('creation', 'an ethnicity in your own words'))
c(f, '"Search Nationalities"', V)
c(f, '{o.name}', D, 'character.observances', 'projects.ts createProject -> schedule.observances; schedule.ts isWorkingDay', 'Days you keep are not worked on your productions', U('heritage', 'every observance has a 2026 date'), E('creation', 'a Jewish background keeps every day of no work'))
c(f, '"Add Language"', V)
c(f, '{`${languageName(l.code)} Proficiency`}', D, 'character.languages', 'production/language.ts personLanguagesFit; hiring.ts fitNotes', 'Whether you need a language coach to play a part in that language', U('decision-effects', 'playing a part in a language you speak only a little'), '')

# ---------------- New Script and the project ----------------
f = 'Projects.tsx'
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
c(f, '"Tone"', I, 'axes.tone', 'shown in the Story panel', 'Your words for the tone; read for nothing')
c(f, '"Competes As"', D, 'axes.register', 'script-effects.ts competesAs', 'Drama or comedy where awards split them', U('script-effects', 'where it competes: declared comedy or drama, else its primary genres'))
c(f, '"Story Era"', D, 'axes.storyEra', 'projects.ts deriveRequirements (period research); production/tasks.ts costumes', 'A period story adds research, and costumes take longer', U('genres', 'module consumers change the right downstream state'))
c(f, '"Story Setting"', I, 'axes.storySetting', 'shown in the Story panel', 'Your words for where it happens')
c(f, '"Story Setting Place"', D, 'axes.settingPlaceId', 'projects.ts deriveRequirements; production/tasks.ts', 'A setting abroad adds Setting Research, which design and costumes wait for', U('decision-effects', 'a setting abroad adds research before design and costumes'), E('journey-d', 'the same film set at home or abroad'))
c(f, '"Production Base"', D, 'axes.basePlaceId', 'production/schedule.ts isWorkingDay; weather.ts', 'Holidays, weather and time zone of the shoot', U('depth-gaps-production', 'rain stops an exterior day'), E('journeys', 'live action in a wet October'))
c(f, '"Search Genres"', V)

# ---------------- Story panel, scenes, characters, structure ----------------
f = 'ScriptViews.tsx'
for lab in ['"Logline"', '"Premise"', '"Stakes"', '"Central Conflict"', '"Point Of View"', '"Theme"', '"Intended Ending"', '"Central Question"']:
    c(f, lab, D, 'story.*', 'script-effects.ts documentsNeeded', 'Must be written before a pitch, treatment or statement can be sent; never read for meaning', U('script-effects', 'briefs add no work'), E('script-rules', 'a supporting antagonist, an incomplete pitch and a revised treatment'))
c(f, '"Intended Experience"', I, 'story.intendedExperience', 'shown in the Story panel', 'Your words; read for nothing', U('script-effects', 'briefs add no work'))
c(f, '"Tone"', I, 'axes.tone', 'shown in the Story panel', 'Your words for the tone; read for nothing', U('script-effects', 'briefs add no work'))
c(f, '"Story Setting"', I, 'axes.storySetting', 'shown in the Story panel', 'Your words for where it happens', U('script-effects', 'briefs add no work'))
c(f, '"Story Setting Place"', D, 'axes.settingPlaceId', 'projects.ts deriveRequirements', 'A setting abroad adds Setting Research', U('decision-effects', 'a setting abroad adds research before design and costumes'), E('readers', 'a story set abroad is researched'))
c(f, '"Competes As"', D, 'axes.register', 'script-effects.ts competesAs', 'Drama or comedy where awards split them', U('script-effects', 'where it competes: declared comedy or drama, else its primary genres'))
c(f, '"Source Material"', D, 'source.kind', 'awards-rules.ts (original or adapted screenplay)', 'Original or adapted screenplay categories', U('awards-catalog', 'original or adapted is the project'))
c(f, '"Adapted From"', R, 'source.work', 'shown with the project', 'The adapted work\'s title')
c(f, '"When It Is Set"', D, 'storyTime', 'awards-rules.ts requirementProblems', 'Period, fantasy or contemporary categories', U('decision-effects', 'a period story enters period categories'))
c(f, '{x.label}', D, 'subjects', 'awards-rules.ts PROJECT_SUBJECTS', 'Subject categories (sport, environment and others)', U('awards-catalog', 'a prize with its own requirement considers only works that meet it'))
c(f, '{q.label}', I, 'genreNotes', 'shown with the genre questions', 'Your answers to a genre\'s questions; optional, read for nothing')
c(f, '"Draft Name"', R, 'draft.label', 'drafts list', 'A draft\'s name')
c(f, '"Draft Name"', R, 'draft.label', 'drafts list', 'A draft\'s name', n=2)
c(f, '{`"${x.title}" In This Scene`}', D, 'song.uses', 'songs.ts songUses; projects.ts deriveRequirements', 'A song in a scene needs clearing or recording, and counts for song awards', U('songs', 'a commissioned song is written by a songwriter and a lyricist'), E('awards', 'Songs'))
c(f, '"Interior Or Exterior"', D, 'scene.heading.intExt', 'production/shoot.ts (weather)', 'Exterior days can be rained out', U('depth-gaps-production', 'rain stops an exterior day'), E('journeys', 'live action in a wet October'))
c(f, '"Place"', D, 'scene.heading.place', 'production/schedule.ts groupShootDays', 'Scenes at one place share days; each place needs a site', U('locations', 'after scouting, a chosen site sets the day fee'))
c(f, '"Time Of Day"', D, 'scene.heading.time', 'production/rates.ts dayFees', 'Night shoots cost more', U('estimates', 'same runtime, different production complexity'))
c(f, '"Estimated Minutes"', D, 'scene.estMinutes', 'production/schedule.ts sceneLoad; finish.ts runtime', 'Shoot load and running time', U('estimates', 'same runtime, different production complexity'))
c(f, '"Kind"', D, 'scene.kind', 'projects.ts deriveRequirements (interview, archival)', 'What a documentary scene needs: interviews, archive', U('media', 'uses contributors, consent and fact checks'), E('journeys', 'documentary'))
c(f, '"Basis"', D, 'scene.basis', 'projects.ts scriptIssues (sourced needs a fact)', 'Sourced material needs a linked fact', U('media', 'uses contributors, consent and fact checks'))
c(f, '"Technique For This Scene"', D, 'scene.technique', 'projects.ts sceneTechnique; production/tasks.ts', 'Which pipeline does a hybrid scene', U('estimates', 'same script, different production method'), E('journeys', 'hybrid'))
c(f, '"Act"', I, 'scene.act', 'structure.ts structureNotes', 'Groups scenes; an empty act is noted; scores nothing', U('structure', 'group scenes; an empty act is noted'), E('structure', 'scenes duplicated, split and combined'))
c(f, '"Tonal Intention"', I, 'scene.tone', 'projects.ts scriptIssues (tonal genres note a missing one)', 'Your note on the scene\'s tone; read for nothing')
c(f, '"Who Is Recording"', D, 'scene.operator', 'projects.ts scriptIssues (found footage)', 'Found-footage scenes need an in-story camera operator', U('genres', 'module consumers change the right downstream state'))
c(f, '{c.name}', D, 'scene.participants', 'projects.ts deriveRequirements; hiring.ts estimateDays', 'Who is in a scene: casting, days booked, credits', U('script-effects', 'series regulars are booked for every episode'))
c(f, '{c.name}', D, 'scene.contributorIds', 'projects.ts deriveRequirements (interviews, consent)', 'A contributor in a scene needs an interview and consent', U('media', 'uses contributors, consent and fact checks'), n=2)
c(f, '{e.claim.slice(0, 50)}', D, 'scene.evidenceIds', 'projects.ts scriptIssues', 'Links sourced material to a checked fact', U('media', 'uses contributors, consent and fact checks'))
c(f, '"Objective"', I, 'scene.objective', 'projects.ts scriptIssues (advisory note when empty)', 'Your note; read for nothing')
c(f, "{nonfiction ? 'What Happens' : 'Action'}", I, 'scene.action', 'shown on the scene', 'Your words; read for nothing')
c(f, '"Turning Point"', I, 'scene.turningPoint', 'shown on the scene', 'Your note; the game doesn\'t read it')
c(f, '"Essential To The Story"', D, 'scene.essential', 'finish.ts (cutting it costs the edit); cost-cuts.ts', 'Cutting an essential scene costs the edit and it is never offered as a saving', U('cost-cuts', 'never an essential scene'))
for lab in ['"Props"', '"Animals"', '"Vehicles"', '"Stunts"', '"Visual Effects"']:
    c(f, lab, D, 'scene production needs', 'projects.ts deriveRequirements; production/tasks.ts', 'Requirements, work, crew and cost', U('screenwriting', 'the same scene with and without a stunt, water, a crowd'))
c(f, '"Crowd Size"', D, 'scene.crowd', 'production/rates.ts (crowd day rate)', 'Background performers paid per day', U('screenwriting', 'the same scene with and without a stunt, water, a crowd'))
for lab in ['"Dance"', '"Intimate Scene"', '"Water Work"']:
    c(f, lab, D, 'scene production needs', 'projects.ts deriveRequirements', 'Choreography, an intimacy coordinator or water safety', U('screenwriting', 'the same scene with and without a stunt, water, a crowd'))
c(f, '"Intentional Discontinuity"', D, 'scene.intentionalDiscontinuity', 'projects.ts scriptIssues', 'Marks a continuity break as deliberate, so it no longer blocks approval', U('depth-gaps', 'a line whose speaker has left the scene blocks approval'))
c(f, '"Speaker"', D, 'dialogue.speaker', 'projects.ts scriptIssues; finish.ts', 'Who speaks: language rules and continuity checks', U('depth-gaps', 'a line whose speaker has left the scene blocks approval'))
c(f, '"Line"', I, 'dialogue.text', 'script-explain.ts spokenMinutes (a guide only)', 'Your dialogue; its length is shown as a guide')
c(f, '{o.label}', D, 'worldRule.sceneIds', 'season.ts sharedFactImpact', 'Changing a rule lists the scenes that rely on it', U('episodes', 'a rule lists the scenes that rely on it'), E('season', 'a season planned and reordered'))
c(f, '"Rule"', I, 'worldRule.rule', 'season.ts', 'Your story-world rule')
c(f, '"Limit Or Cost"', I, 'worldRule.limit', 'season.ts', 'Your rule\'s limit')
c(f, '"Rule"', I, 'worldRule.rule', 'season.ts', 'Your story-world rule', n=2)
c(f, '"Limit Or Cost"', I, 'worldRule.limit', 'season.ts', 'Your rule\'s limit', n=2)
c(f, '"Season Arc"', I, 'seasonArc', 'sequel.ts continueProject (carried into the next season)', 'Your plan; a next season starts from it', U('episodes', 'carries the same characters, world and open threads'))
c(f, '{`Title Of Episode ${n}`}', R, 'episode.title', 'shown wherever an episode is named', 'An episode\'s title', U('episodes', 'an episode moves with its scenes'))
c(f, '{`What Episode ${n} Moves`}', I, 'episode.arc', 'shown in the season plan', 'Your plan', U('episodes', 'an episode moves with its scenes'))
c(f, '"New Act Or Sequence"', I, 'acts', 'structure.ts', 'Names a new act')
c(f, '{o.label}', I, 'thread.sceneIds', 'structure.ts structureNotes; threadCutConsequences', 'Cutting a thread\'s resolving scene warns by name; scores nothing', U('structure', 'cutting the resolving scene from the edit warns by name'), E('structure', 'scenes duplicated, split and combined'), n=2)
c(f, '{c.name}', I, 'thread.characterIds', 'structure.ts structureNotes', 'A note when a character the thread follows is in none of its scenes; scores nothing', U('decision-effects', 'raise a structure note when one is in none of its scenes'), n=3)
c(f, '{`How ${t.name} Ends`}', I, 'thread.resolution', 'structure.ts', 'A thread resolves in a scene or is left open; scores nothing', U('structure', 'a thread resolves in a named scene or is left open'))
c(f, '"New Thread"', I, 'threads', 'structure.ts', 'Names a thread')
c(f, '"Reference"', I, 'research.reference', 'research.ts', 'What you checked a question against')
c(f, '"Status"', I, 'research.status', 'research.ts researchNotes', 'An open or uncertain question is noted on its scenes', U('structure', 'note open and uncertain questions on their scenes'))
c(f, '{sceneLabel(p, s)}', I, 'research.sceneIds', 'research.ts researchNotes', 'The scenes a question informs', U('structure', 'note open and uncertain questions on their scenes'))
c(f, '"New Question"', I, 'research', 'research.ts', 'A research question')
c(f, '"Planted In"', D, 'setup.plantedIn', 'script-effects.ts; finish.ts edit consequences', 'Cutting a planted scene says the payoff loses its setup', U('script-effects', 'cutting a scene that plants a clue'))
c(f, '"Pays Off In"', D, 'setup.paidIn', 'script-effects.ts; finish.ts edit consequences', 'The payoff a cut affects', U('script-effects', 'cutting a scene that plants a clue'))
c(f, '"What Is Set Up"', I, 'setup.label', 'shown with the setup', 'Its name')
c(f, '"Kind"', D, 'setup.kind', 'projects.ts deriveRequirements (clue props)', 'A clue in a mystery needs a hero prop', U('script-effects', 'cutting a scene that plants a clue'), n=2)
c(f, '"First Character"', I, 'relationship.a', 'season.ts sharedFactImpact', 'A relationship touches every scene its two characters share', U('episodes', 'a relationship touches every scene its two characters share'))
c(f, '"Second Character"', I, 'relationship.b', 'season.ts sharedFactImpact', 'As above', U('episodes', 'a relationship touches every scene its two characters share'))
for n in (1, 2):
    c(f, '"Relationship"', I, 'relationship.kind', 'shown in the season plan', 'Your words', n=n)
    c(f, '"Where It Starts"', I, 'relationship.start', 'shown in the season plan', 'Your words', n=n)
    c(f, '"Where It Ends"', I, 'relationship.end', 'shown in the season plan', 'Your words', n=n)
c(f, '"Claim"', D, 'evidence.claim', 'projects.ts deriveRequirements (fact-check)', 'Every claim not dramatized needs a fact check', U('media', 'uses contributors, consent and fact checks'))
c(f, '"Status"', D, 'evidence.status', 'projects.ts deriveRequirements', 'Dramatized claims need no fact check', U('media', 'uses contributors, consent and fact checks'), n=2)
c(f, '"Source Note"', R, 'evidence.sourceNote', 'shown with the fact', 'Where the fact comes from')
c(f, '"Contributor Name"', R, 'contributor.name', 'credits, consent', 'A contributor\'s name')
c(f, '"Who They Are"', R, 'contributor.role', 'shown with the contributor', 'Their role')
c(f, '"Note"', I, 'note.text', 'projects.ts startRevision', 'Your own notes add nothing to quality', U('screenwriting', 'your own notes and repeated revision passes add nothing'))
c(f, '"Area"', I, 'note.area', 'shown with the note', 'The note\'s area')
c(f, '"About"', I, 'note.sceneId', 'the notes list', 'The scene a note is about', '', E('readers', 'a story set abroad is researched'))
c(f, '"Character Name"', R, 'character.name', 'everywhere a part is named', 'A character\'s name', U('scenes', 'renaming changes the name everywhere it is shown'))
c(f, '"Scene"', I, 'beat.sceneId', 'structure.ts beatsIn', 'Where a character changes; cutting it warns', U('structure', 'a beat goes only in a scene the character is in'))
c(f, '"What Changes"', I, 'beat.change', 'structure.ts', 'Your words')
c(f, '"Name"', R, 'character.name', 'everywhere a part is named', 'A character\'s name', U('scenes', 'renaming changes the name everywhere it is shown'))
c(f, '"Role Size"', D, 'character.roleSize', 'script-effects.ts castPlacement; hiring.ts', 'Award placement and rates', U('script-effects', 'placement, essential scenes, the content declaration'))
c(f, '"Entity"', D, 'character.entity', 'projects.ts deriveRequirements; production/shoot.ts', 'Non-human parts need designs, builds or effects', U('genres', 'module consumers change the right downstream state'))
c(f, '"Realized As"', D, 'character.realization', 'projects.ts deriveRequirements; production/shoot.ts', 'Prosthetics, a suit, a puppet or CG: who builds it and how long', U('genres', 'module consumers change the right downstream state'))
c(f, '"Age In Story"', D, 'character.ageInStory', 'hiring.ts fitNotes', 'Casting notes who fits the age', U('auditions', 'background parts, cast parts and repeat invitations'))
c(f, '"Also Called"', I, 'character.aliases', 'shown with the part in casting', 'Other names; one character')
c(f, '"Pronouns"', I, 'character.pronouns', 'script-explain.ts characterPronouns', 'Casting marks matching performers; nobody is filtered or scored')
c(f, '"Speaks"', D, 'character.languages', 'production/language.ts personLanguagesFit', 'A performer who doesn\'t speak it needs coaching', U('decision-effects', 'the same part in English'))
c(f, '"Awards Placement"', D, 'character.awardPlacement', 'script-effects.ts castPlacement', 'Lead or supporting categories', U('script-effects', 'placement, essential scenes, the content declaration'))
c(f, '"Series Involvement"', D, 'character.seriesInvolvement', 'hiring.ts estimateDays; finish.ts computeCredits', 'Regulars are booked and credited for every episode', U('script-effects', 'series regulars are booked for every episode'))
c(f, '{title(f)}', D, 'character.functions', 'awards-rules.ts isNarrator; hiring.ts estimateDays', 'A narrator records narration in post and is placed in narrator categories', U('recipient-rules', 'version 3 leaves the narrator out of Supporting Actor'))
c(f, '{title(m)}', D, 'character.methods', 'hiring.ts; production', 'How the part is performed: on camera, voice, capture, suit, puppetry', U('depth-gaps-production', 'a voice performer is not a capture performer'))
c(f, '"What Kind Of Being"', I, 'character.entityNote', 'shown to design and casting', 'Your description; the game doesn\'t read it')
for lab in ['"Description"', '"Wants"', '"Fears"']:
    c(f, lab, I, f'character.{lab.strip(chr(34)).lower()}', 'script-explain.ts breakdownComplete', 'Offers include the casting breakdown once all three are written; it changes who accepts nothing')
c(f, '"Format Family"', D, 'unscripted.family', 'unscripted.ts buildTasks', 'An unscripted show\'s work: talk, competition, observational', U('unscripted', 'uses format rules, participants and segments'), E('journeys', 'unscripted series'))
c(f, '{c.name}', D, 'competition.contestants', 'unscripted.ts decideCompetition', 'Who competes', U('unscripted', 'uses format rules, participants and segments'), n=4)
c(f, '"Leave Each Episode"', D, 'competition.eliminatePerEpisode', 'unscripted.ts decideCompetition', 'How many leave each episode', U('unscripted', 'uses format rules, participants and segments'))
c(f, '{`Add Ethnicity For ${who}`}', I, 'character.heritages', 'hiring.ts sharedHeritages', 'Casting shows who shares a background; scores nothing', U('heritage', 'a performer from the pool'))
c(f, '{`Add Nationality For ${who}`}', I, 'character.nationalities', 'hiring.ts', 'Casting shows who shares a nationality; scores nothing', U('identity', 'a version 6 save'))
c(f, '{i.label}', D, 'axes.content', 'script-explain.ts; finish.ts outlet requirements', 'Broadcast slots and streaming advisories', U('script-effects', 'placement, essential scenes, the content declaration'))

# ---------------- Casting, crew, schedule, budget ----------------
f = 'PlanViews.tsx'
c(f, '"Only Show People Who Are Free"', V)
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
c(f, '"How Closely It Follows The Work"', D, 'source.option.terms.approach', 'adaptation.ts optionTerms, changesOutsideGrant', "The option's price, and what the rights holder will approve the script changing", U('adaptation', 'latitude is priced: a freer adaptation costs more, by the same rule for every production'), E('sources', 'an adaptation of a protected work is optioned, renewed and bought before its production can be planned'))
c(f, '{CHANGES[c]}', D, 'source.changes', 'adaptation.ts changesOutsideGrant, approvalStanding', 'Whether the rights holder approves the draft, and whether an approval already given still stands', U('adaptation', 'they approve a draft whose declared changes the agreement allows, and refuse one that goes past it, naming what'), E('sources', 'an adaptation of a protected work is optioned, renewed and bought before its production can be planned'))
c(f, '"Change Financing Target"', D, 'finance.target', 'finance.ts financeSummary, decide', 'What is still to raise, and whether backers can be approached', U('decision-effects', 'sets what is still to raise'), E('careers', 'stop motion: refused for lack of money'))
c(f, '{`Ask The ${d.backer} For`}', D, 'deal.counter.term', 'negotiation.ts', 'Asking for better terms: they agree, hold or withdraw', U('negotiation', 'leverage rises with another offer open'), E('negotiation', 'an investor offer'))

# ---------------- Edit, release, awards, capture ----------------
f = 'FinishViews.tsx'
c(f, "{`Version In ${r.territories.map(countryName).join(', ')}`}", D, 'releases[].version, releases[].dubObligationId', 'finish.ts setReleaseVersion, the release handler; distribution.ts territoriesReached, reportedGross', "A dubbed version's cost is set aside now and paid on release, and each territory it is dubbed for counts for half as much again in the distributor's reports", U('strategy', "a dubbed version is yours to pay for, counts for more where the language isn't the film's, and is refused where nothing needs translating"), E('studio-pitch', 'J08'))
c(f, '"Version"', R, 'version.label', 'versions.ts addVersion (named and unique); shown where the version is entered', 'The version\'s name. What it leaves out is the decision, below', U('versions', 'a version is conformed from the locked cut'), E('awards', 'Emmys guest'))
c(f, '{sceneLabel(p, s)}', D, 'version.leaveOut', 'versions.ts versionScenes', 'Scenes a version leaves out: its running time and its credits', U('screen-time', 'a version is its own cut'), E('awards', 'Emmys guest'))
c(f, '{`${g.label}: ${g.reason}`}', D, 'pickup choice', 'edit-actions.ts requestPickups', 'Scenes picked up on a pickup day', U('directing', 'missing coverage is shot on a targeted pickup'))
c(f, '"Route"', D, 'release.route', 'finish.ts planRelease; awards.ts qualifying', 'How it is released, which award routes it opens', U('qualifying-routes', 'a theatrical release abroad in the window qualifies'), E('journeys', '2D animation: deliver, release digitally'))
c(f, '"Release Date"', D, 'release.date', 'finish.ts planRelease; awards.ts qualifying windows', 'When it is released: which award years it qualifies for', U('dates', 'a production start date and a release date must be real dates'), E('release-schedule', 'a series released across the year end'))
c(f, '"Episode Schedule"', D, 'release.episodes, release.pattern', 'episode-releases.ts presetDates; finish.ts planRelease', 'Which day each episode comes out: the calendar, the events, and the airing and per-episode award rules', U('episode-releases', 'all at once, weekly, and several on the premiere then weekly'), E('release-schedule', 'a series released across the year end'))
c(f, '"Episodes On The Premiere"', D, 'release.episodes', 'episode-releases.ts presetDates', 'How many episodes come out on the first day', U('episode-releases', 'all at once, weekly, and several on the premiere then weekly'))
c(f, '{`Episode ${i + 2}`}', D, 'release.episodes[].date', 'episode-releases.ts episodeDateProblem; awards-rules.ts airing; awards.ts ruledReleaseFits', 'A break or a split season: which episodes count in which year', U('episode-releases', 'custom dates with a break make a split season'), E('release-schedule', 'a series released across the year end'))
c(f, '{`New Date For Episode ${e.number}`}', D, 'release.episodes[].date', 'episode-releases.ts setEpisodeDates; release-schedule.ts scheduleChangeEffects', 'Moves what is still to come, with its events, the calendar and any entry it affects shown first', U('episode-releases', 'a split season across the year end'), E('release-schedule', 'a series released across the year end'))
c(f, '"Territory Code"', D, 'release.territories', 'awards.ts; finish.ts', 'Where it is released: territory rules and subtitling', U('qualifying-routes', 'a theatrical release abroad in the window qualifies'))
c(f, '"Show"', V)
c(f, '"Project"', V)
c(f, '"Show"', V, n=2)
c(f, '"Format"', V)
c(f, "{`Find ${inst.kind === 'festival' ? 'A Section Or Award' : 'A Category'}`}", V)
c(f, '"Project"', D, 'entry.projectId', 'awards.ts checkEligibility', 'Which project is entered', U('awards-catalog', 'a national entry is the director'), E('awards', 'Oscars'), n=2)
c(f, '"Episode To Enter"', D, 'entry.episode', 'awards-actions.ts submitEntry; finish.ts assessEpisode', 'The entry is judged on that episode\'s own work', U('episode-assessment', 'a stronger and a weaker episode differ'), E('awards', 'Emmys directing'))
c(f, '"Song To Enter"', D, 'entry.songId', 'awards-rules.ts songProblems', 'Which song competes, and who it goes to', U('awards-catalog', 'an original song goes to the song'), E('awards', 'Songs'))
c(f, '"Version To Enter"', D, 'entry.versionId', 'awards-actions.ts entrySnapshot', 'Which cut is judged and timed', U('screen-time', 'a version is its own cut'), E('awards', 'Emmys guest'))
c(f, '{`${c.personName} as ${c.characterName}`}', D, 'entry.recipients', 'awards-actions.ts submitEntry', 'Who the performance entry is for', U('recipient-rules', 'applies only to the performer categories'), E('awards', 'Emmys'))
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
c(f, '"Save Name"', R, 'saveName', 'the saved games list', 'The save\'s name')
c(f, '"Larger Text"', V, 'the browser (not the save)', 'document data-text', 'Larger text on this device')
c(f, '"Wake Me For Obligations"', D, 'settings.wakeForObligations', 'state.ts runEvents', 'Reminders and call times wake you', U('foundation', 'sleep wakes for obligations by default'))
f = 'Startup.tsx'
c(f, '{`Replacement Place ${i + 1}`}', D, 'repair replacements', 'save.ts repairSave', 'Which place replaces one a save can\'t find', U('migration', 'open after a repair that keeps a backup and changes only the places'), E('failures', 'asks for a replacement, keeping a backup'))
f = 'DataPacks.tsx'
# Not game state: a display choice kept on the device. Nothing in the engine reads a picture.
c(f, '"Show Pictures From The Picture Pack"', V, 'this device (localStorage slate.pictures), not a saved game', 'Picture.tsx picturesOn, Picture', "Off, every picture is a plain placeholder and none is read from storage; on, a picture is read when its box comes near the screen. No engine reads a picture and no outcome changes", '', E('data-packs', 'J09'))
# Not game state: it is sent to the game's own server, which then answers this browser as the owner (docs/DEPLOYMENT.md).
c(f, '"Owner Passphrase"', V, '', 'server/catalog-handler.mjs createOwnerGate', 'Signs the owner in where the server offers it; kept nowhere in the browser', U('catalog-server', 'answers a request from elsewhere only after the owner signs in'), E('owner-access', 'the owner signs in from elsewhere'))

f = 'World.tsx'
c(f, '"Title For The New Project"', R, 'project.title', 'opportunities.ts acceptOpportunity', 'The new project\'s name', U('opportunities', 'accepted, starts a project funded by the commission'), E('career', 'a proposal is accepted into a funded project'))
f = 'WorkViews.tsx'
c(f, '"Song Title"', R, 'song.title', 'everywhere a song is named', 'The song\'s title')
c(f, '"Where It Comes From"', D, 'song.origin, rights', 'songs.ts songTasks; awards-rules.ts songProblems', 'Written for the work, commissioned, licensed or public domain: the work, the clearance and song awards', U('songs', 'a commissioned song is written by a songwriter and a lyricist'), E('journey-c', 'songs written, recorded and cleared in production'))
c(f, '"Lyrics"', D, 'song.plan.lyrics', 'songs.ts songTasks', 'Whether lyrics are written, and by whom', U('songs', 'a commissioned song is written by a songwriter and a lyricist'), E('journey-c', 'songs written, recorded and cleared in production'))
c(f, '"Music By"', D, 'song.writers', 'songs.ts songCredits; awards recipients', 'Who is credited and who a song award goes to', U('awards-catalog', 'an original song goes to the song'), E('awards', 'Songs'))
c(f, '"Lyrics By"', D, 'song.writers', 'songs.ts songCredits; awards recipients', 'As above', U('awards-catalog', 'an original song goes to the song'), E('awards', 'Songs'))
c(f, '"Rights Holder"', R, 'song.license.holder', 'shown with the song', 'Who a licensed song is cleared with', '', E('journey-e', 'refused with a reason, then recovered'))
c(f, '{`Scene For ${s.title}`}', D, 'song.uses', 'songs.ts songUses', 'Where the song plays: the clearance, the recording and song rules', U('songs', 'a commissioned song is written by a songwriter and a lyricist'), E('awards', 'Songs'))
c(f, '"How It Plays"', D, 'songUse.placement', 'awards-rules.ts songRuleProblem', 'Performed, background or end credits: what song categories accept', U('songs', 'a commissioned song is written by a songwriter and a lyricist'), E('awards', 'Songs'))
c(f, '"Minutes It Plays"', D, 'songUse.minutes', 'awards-rules.ts songRuleProblem', 'Minimum-length song rules', U('songs', 'a commissioned song is written by a songwriter and a lyricist'))
c(f, '{`${c.name} Performs ${s.title}`}', D, 'song.performers', 'hiring.ts fitNotes; songs.ts songCredits', 'Who sings it: casting notes and performer credits', U('songs', 'played to delivery: writers are whoever wrote'), E('awards', 'Songs'))
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
c(f, '"Central Question"', I, 'story.question', 'shown in the Story panel; part of the Statement Of Intent for a documentary', 'Your words; the game doesn\'t read them', n=2)
c(f, '"Synopsis"', I, 'story.synopsis', 'shown in the Story panel', 'The whole story in a paragraph; your words, never read for meaning')
c(f, '"Who It Is For"', I, 'story.audience', 'shown in the Story panel', 'Your words; the audience age range that engines read is on the Overview page')
c(f, '"How It Is Built"', I, 'story.structure', 'shown in the Story panel', 'A name for the shape; the acts themselves are under Acts And Threads')
for lab, st in [('"What An Episode Does"', 'series.engine'), ('"How Its People Change"', 'series.changes'), ('"Places It Returns To"', 'series.recurring'), ('"How It Goes On Or Ends"', 'series.continuation')]:
    c(f, lab, I, st, 'season.ts setSeriesPlan; shown in the season plan', 'Your plan for the series; the game doesn\'t score it')
for lab, st in [('"Why They Want It"', 'motivation'), ('"What Stands In The Way"', 'obstacle'), ('"What In Them Pulls Against It"', 'contradiction'), ('"How They Change"', 'arc'), ('"How They Speak"', 'voice')]:
    c(f, lab, I, f'character.{st}', 'shown with the part', 'Your words for the part; the game doesn\'t read them')
c(f, '"Give Their Scenes, Lines And Relationships To"', D, 'who takes a set-aside character\'s scenes', 'projects.ts archiveCharacter', 'Their scenes, lines, relationships and threads go to the character chosen; with nobody chosen the scenes simply lose them', U('characters', 'can give their scenes, lines and bonds to someone else, with no bond to oneself and none twice'))
f = 'AdaptWork.tsx'
c(f, '"Working Title"', R, 'project.title', 'everywhere a project is named', "The project's name; the work's title to start with", U('proposal', 'makes one project'))
c(f, '"Format"', D, 'axes.format', 'proposal.ts proposeFromSource; projects.ts, production/tasks.ts', 'How many of the recorded people it carries, how many scenes, a season; then the work like any project', U('proposal', 'fits the work to the format'))
c(f, '"Medium"', D, 'axes.medium', 'production/tasks.ts buildTasks', 'Live action shoots; animation has no shoot days but studio and render time', U('estimates', 'same script, different production method'))
c(f, "{medium === 'hybrid' ? 'Animation Technique For Animated Scenes' : 'Animation Technique'}", D, 'axes.technique', 'production/tasks.ts buildTasks', 'Which animation pipeline does the work', U('estimates', 'same script, different production method'))
c(f, '"Episodes"', D, 'axes.episodeCount', 'proposal.ts (the season it proposes); projects.ts', 'How many episodes the season plan has', U('proposal', 'fits the work to the format'))
c(f, "{episodic ? 'Target Minutes Per Episode' : 'Target Runtime In Minutes'}", D, 'axes.targetRuntimeMin', 'proposal.ts (cast and scene count); estimate.ts', 'A short follows one strand of a long work; a feature compresses it', U('proposal', 'fits the work to the format'))
c(f, '{`Name For ${c.name}`}', I, 'the names the proposal writes', 'blueprints.ts named, applyBlueprint', "The player's own name for one of the work's people, used everywhere the brief names them", U('proposal', 'makes one project'))
f = 'ReviseBrief.tsx'
c(f, '{`Keep My ${c.label}`}', D, "which of the player's words a revision leaves alone", 'blueprints.ts applyBlueprint', 'A kept field is not replaced', U('blueprints', "keeps the player's own words where they choose to, leaves a locked field alone, and says so first"))
c(f, '{`Keep My ${c.label} And Add None`}', D, "whether a revision adds the proposal's people or outline beside the project's", 'blueprints.ts applyBlueprint', 'Kept: nothing is added; unticked: the proposal\'s are added beside, and nothing is removed', U('proposal', 'revising'))
f = 'PlanViews.tsx'
c(f, '"Spending Ceiling"', D, 'Project.mandates[].ceiling', 'mandates.ts guideMePlan, runMandate, guideMeRefusal', 'The most Guide Me may commit for a department: offers that do not fit are not sent, and a counteroffer past it comes back to the player', U('guide-me', 'never goes past the ceiling'))
f = 'YourMoney.tsx'
c(f, '"Put In From Your Own Money"', D, 'state.money postings; project finance deal (savings)', 'personal.ts putInOwnMoney, putInRefusal', 'Money leaves your account and arrives in the project as Your Own Money, nobody repaid from it', U('personal', 'puts money into a project only by your choice'))
f = 'Equipment.tsx'
c(f, '"Show"', V)
c(f, '"Show"', V, n=2)
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

# ---------------- Rows the table gained by hand before November 11, 2026, brought back into this file ----------------
c('Catalog.tsx', '"Title Or Person"', V, '', '', '', '', '', n=1)
c('Catalog.tsx', '"Search Titles"', V, '', '', '', '', '', n=1)
c('Catalog.tsx', '"Show"', V, '', '', '', '', '', n=1)
c('Catalog.tsx', '"Order"', V, '', '', '', '', '', n=1)
c('Catalog.tsx', '{`Include titles not released by ${formatDateKey(today)}`}', V, '', '', '', '', '', n=1)
c('PlanViews.tsx', '"List Performers Who Play This Age First"', V, '', '', '', '', '', n=1)
c('Projects.tsx', '"Years That Pass In The Story"', D, 'character.ageInStory (next season)', 'sequel.ts continueProject', 'Each character is that much older in the next season or sequel; a child in the cast may stop being one', "tests/minors.test.ts::ages a series' characters by the years that pass between seasons", '', n=1)
c('ScriptViews.tsx', '"Up To"', D, 'character.ageInStory', 'story-age.ts storyAge; casting-notes.ts fitNotes', 'An age range: casting compares it with the ages each performer plays', 'tests/minors.test.ts::reads an age, a range or a decade', '', n=1)

# Three rows the table had corrected by hand (fitNotes moved to casting-notes.ts; ages under 16 reach minors.ts).
c('Creation.tsx', '{`${languageName(l.code)} Proficiency`}', D, 'character.languages', 'production/language.ts personLanguagesFit; casting-notes.ts fitNotes', 'Whether you need a language coach to play a part in that language', 'tests/decision-effects.test.ts::playing a part in a language you speak only a little', '', n=1)
c('ScriptViews.tsx', '"Age In Story"', D, 'character.ageInStory', 'story-age.ts storyAge; casting-notes.ts fitNotes; minors.ts minorFor', "Casting notes who plays the age; a part under 16 is reckoned as a child's, with its hours, crew, licence and shoot days", "tests/minors.test.ts::a child's part takes more shoot days than the same script with an adult", '', n=1)
c('WorkViews.tsx', '{`${c.name} Performs ${s.title}`}', D, 'song.performers', 'casting-notes.ts fitNotes; songs.ts songCredits', 'Who sings it: casting notes and performer credits', 'tests/songs.test.ts::played to delivery: writers are whoever wrote', 'e2e/awards.spec.ts::Songs', n=1)
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
c(f, '{s.label}', I, 'the words an idea writes', 'brief.ts fill', "The player's own names in the idea's words; a blank takes the suggestion", U('brief', "writes the player's names where the idea has slots, and its suggestions where they left them blank"))
c(f, '{c.name}', D, 'which characters an idea applies to', AP, 'The idea is applied to the characters ticked, and no others', U('brief', 'one choice of a kind for a target: a second makeup method replaces the first, for that character only'))
c(f, '{`Scene ${i + 1}', D, 'which scenes an idea applies to', AP, 'The idea is applied to the scenes ticked, and no others', U('brief', 'a physical gag on a chosen scene makes a stunt of it, with its rehearsal, coordinator and doubled costume'))
c(f, "{`${b.intExt === 'EXT' ? 'Exterior' : 'Interior'}", D, 'which offered scenes are added', AP + '; projects.ts addScene', 'Only the scenes ticked are added to the script', U('brief', 'offered scenes are added only when ticked, and then make the work scenes make'))
c(f, '{`Keep My ${o.label}`}', D, 'which of the player\'s words an idea leaves alone', AP, 'A kept field is not replaced', U('brief', "asks before replacing the player's own words, and leaves them alone when told to keep them"))
for lab in ['"When It Starts"', '"Who It Happens To"', '"What They Must Do"', '"What It Costs"']:
    c(f, lab, I, 'story.logline (once applied)', 'src/ideas/loglines.ts compose; ' + AP, 'One of the four parts of a built logline', U('ideas', "refuses parts that don't go together, and parts that aren't there"))

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
missing = [k for k in found if k not in C]
stale = [k for k in C if k not in found]
bad = []
for k, v in C.items():
    for ref in (v[4], v[5]):
        if ref:
            p, t = ref.split('::', 1)
            if t not in open(p).read().replace("\\'", "'"): bad.append((k, ref))  # a title with an apostrophe is written \' in its test file
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
