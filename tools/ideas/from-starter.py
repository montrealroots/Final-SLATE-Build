# Turns the package's starter options (docs/creative-depth/package/starter-options.json, original authored content) into
# the game's idea records (src/ideas/starter.ts). The starter set gives each option a label and a sentence and a
# placeholder patch; here each is given a real one: commands from src/engine/brief.ts that set fields the game has.
# What an option can't yet do in the engine is recorded as a reference idea, not dressed up as a mechanic.
#   python3 tools/ideas/from-starter.py
# The IDs are the package's, so its example project (example-project.json) names the same ideas.
import json

src = json.load(open('docs/creative-depth/package/starter-options.json'))
by = {o['id']: o for o in src['options']}
out = []

def idea(oid, field, kind, scope, patch, consumers, tests, fits=None, slots=None, text=None, tags=None, excludes=None, adds=False):
    o = by[oid]
    rec = {'id': oid, 'v': 1, 'field': field, 'label': o['label'], 'text': text or o['description'], 'kind': kind, 'scope': scope, 'tags': tags or [], 'patch': patch, 'consumers': consumers, 'tests': tests}
    if fits: rec['fits'] = fits
    if slots: rec['slots'] = slots
    if excludes: rec['excludes'] = excludes
    if adds: rec['adds'] = True
    out.append(rec)

DOC = ['script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)']
T_APPLY = ['tests/brief.test.ts::every idea applies through the one command path and says first what it will do']
T_LOOKS = ['tests/looks.test.ts::adds its own tests, builds, crew and daily materials for that character, and leaves every other task as it was', 'tests/zombie.test.ts::changing one choice changes its own consumers and nothing else']
T_WARD = ['tests/looks.test.ts::is its own work, in the copies its states and rough scenes need, and leaves the others on the shared costume task']
T_BEATS = ['tests/brief.test.ts::offered scenes are added only when ticked, and then make the work scenes make']

def S(key, label, suggest): return {'key': key, 'label': label, 'suggest': suggest}
def B(place, ie, time, objective, minutes=3, **k): return {'place': place, 'intExt': ie, 'time': time, 'objective': objective, 'minutes': minutes, **k}
def P(slot, name, size, **k): return {'slot': slot, 'name': name, 'size': size, **k}

# ---------------- Premises: words, a cast to start from, and scenes offered ----------------
PREMISES = {
 'premise.001': dict(
   text='In {town}, the night-shift dispatcher {lead} must keep a divided town connected when the dead return before dawn.',
   logline="When the dead return during {town}'s overnight shift, the dispatcher {lead} and a stranded repair crew must restore the emergency transmitter before dawn divides the survivors for good.",
   stakes='If the transmitter stays down, each street faces the night alone, and by morning nobody will trust a call for help again.',
   slots=[S('town', "The Town's Name", 'Briar Hollow'), S('lead', "The Dispatcher's Name", 'June Okafor'), S('second', "The Repair Crew's Foreman", 'Dale Whitlock')],
   parts=[P('lead', '{lead}', 'lead', wants='To keep every line open until morning.'), P('second', '{second}', 'co-lead', wants='To get his crew home.'), P('dead', 'The Returned', 'featured', entity='undead')],
   beats=[B('Dispatch Office', 'INT', 'NIGHT', 'The radio link fails while {lead} is the only one on shift.', **{'with': ['lead']}),
          B('Workshop', 'INT', 'NIGHT', "{second}'s crew and the townspeople argue over the last usable battery.", **{'with': ['second']}),
          B('Main Street', 'EXT', 'NIGHT', 'A small group of the returned crosses between {lead} and the workshop.', crowd=12, crowdLook='wounds', **{'with': ['lead', 'dead']}),
          B('Transmitter Shed', 'INT', 'NIGHT', '{lead} and {second} repair the transmitter while the door is held.', **{'with': ['lead', 'second']}),
          B('Main Street', 'EXT', 'DAWN', 'Morning shows who answered and who did not.', **{'with': ['lead', 'second']})],
   fits={'genres': ['horror', 'zombie', 'horror-comedy'], 'formats': ['feature']}, tags=['night', 'small-town', 'siege', 'ensemble']),
 'premise.002': dict(
   text='{lead}, a bicycle courier carrying medicine that cannot wait, must cross a quarantined district with {second}, a former rival.',
   logline='When a quarantine seals the district, courier {lead} has until curfew to carry a dose across it, with the one rider who knows the back routes: the rival who cost {lead} the job.',
   stakes='The medicine spoils by curfew, and the only person who can get it through is the one {lead} swore never to ride with again.',
   slots=[S('lead', "The Courier's Name", 'Tavi Reyes'), S('second', "The Rival's Name", 'Noor Halim')],
   parts=[P('lead', '{lead}', 'lead', wants='To make the one delivery that matters.'), P('second', '{second}', 'co-lead', wants='To be trusted again.')],
   beats=[B('Depot', 'INT', 'DAY', '{lead} is handed the package and the deadline.', **{'with': ['lead']}),
          B('Checkpoint', 'EXT', 'DAY', 'The checkpoint turns {lead} back; {second} offers another way.', crowd=15, **{'with': ['lead', 'second']}),
          B('Back Alleys', 'EXT', 'DAY', 'A chase through streets only {second} knows.', stunts='Bicycle chase', **{'with': ['lead', 'second']}),
          B('Clinic Door', 'EXT', 'DUSK', 'The dose arrives, and the two riders settle what is owed.', **{'with': ['lead', 'second']})],
   fits={'genres': ['thriller', 'drama', 'action']}, tags=['city', 'deadline', 'two-hander', 'journey']),
 'premise.003': dict(
   text="A failing theater company discovers that its final performance is the only thing keeping a dangerous visitor calm.",
   logline="On closing night, {lead}'s broke theater company learns that the stranger in row three stays peaceful only while the play goes on, and the play is ninety minutes long.",
   stakes='When the curtain falls, the visitor stops being an audience.',
   slots=[S('lead', "The Company Manager's Name", 'Imre Castellan')],
   parts=[P('lead', '{lead}', 'lead', wants='To get one last full house out alive.'), P('visitor', 'The Visitor', 'supporting', entity='supernatural')],
   beats=[B('Theater Foyer', 'INT', 'NIGHT', 'The visitor arrives and the company counts a thin house.', crowd=20, **{'with': ['lead', 'visitor']}),
          B('Backstage', 'INT', 'NIGHT', 'The company works out what the visitor is, between cues.', **{'with': ['lead']}),
          B('Stage', 'INT', 'NIGHT', 'The play runs out of script and the company starts to improvise.', crowd=20, **{'with': ['lead', 'visitor']}),
          B('Stage Door', 'EXT', 'NIGHT', 'What the company agrees to, to keep the show running.', **{'with': ['lead', 'visitor']})],
   fits={'genres': ['horror-comedy', 'comedy', 'horror', 'fantasy']}, tags=['one-location', 'backstage', 'ensemble', 'night']),
 'premise.004': dict(
   text='{lead}, an apprentice editor, finds the same missing minute in unrelated recordings and follows the people erased from it.',
   logline='When apprentice editor {lead} finds one identical gap cut from a dozen unrelated recordings, the search for who removed it leads to the people who were in it.',
   stakes='Whoever cut the minute is still cutting, and {lead} has now been seen looking.',
   slots=[S('lead', "The Editor's Name", 'Sol Aguirre')],
   parts=[P('lead', '{lead}', 'lead', wants='To know what was in the minute.')],
   beats=[B('Edit Room', 'INT', 'NIGHT', '{lead} lines up two recordings and finds the same hole in both.', **{'with': ['lead']}),
          B('Archive', 'INT', 'DAY', 'A third recording, older, with the same minute gone.', **{'with': ['lead']}),
          B('Apartment Stairwell', 'INT', 'NIGHT', 'Someone from the missing minute refuses to talk, then does.', **{'with': ['lead']}),
          B('Edit Room', 'INT', 'DAWN', '{lead} decides whether to put the minute back.', **{'with': ['lead']})],
   fits={'genres': ['mystery', 'thriller', 'science-fiction']}, tags=['investigation', 'city', 'solo-lead']),
 'premise.005': dict(
   text='{lead}, a struggling performer, accepts a mistaken identity and must choose between the breakthrough and the person losing credit.',
   logline="Mistaken for a rising name, struggling performer {lead} takes the part of a lifetime, until the person whose name it is turns up asking for nothing but their own work back.",
   stakes="Every good notice {lead} earns is taken from someone who can't afford to lose it.",
   slots=[S('lead', "The Performer's Name", 'Calla Brandt'), S('second', "The Name's Real Owner", 'Edda Morrow')],
   parts=[P('lead', '{lead}', 'lead', wants='To be seen once.'), P('second', '{second}', 'supporting', wants='To have what she made carry her name.')],
   beats=[B('Audition Room', 'INT', 'DAY', '{lead} is greeted by the wrong name and does not correct it.', **{'with': ['lead']}),
          B('Rehearsal Hall', 'INT', 'DAY', 'The work is good, and the lie gets harder to leave.', crowd=10, **{'with': ['lead']}),
          B('Stage Door', 'EXT', 'NIGHT', '{second} arrives and asks one question.', **{'with': ['lead', 'second']}),
          B('Dressing Room', 'INT', 'NIGHT', '{lead} chooses, before the half-hour call.', **{'with': ['lead', 'second']})],
   fits={'genres': ['drama', 'comedy', 'tragicomedy']}, tags=['backstage', 'identity', 'two-hander']),
 'premise.006': dict(
   text='{lead}, a filmmaker stranded with a rival crew, has one night to get their only screening copy to a distant festival.',
   logline="Stranded overnight with the crew who beat them to every prize, filmmaker {lead} has until morning to carry the only copy of the film to a festival three hundred miles off.",
   stakes='Miss the screening and the film has no premiere, and the rival crew are the only people with a van.',
   slots=[S('lead', "The Filmmaker's Name", 'Ines Vaartjes'), S('second', "The Rival Director's Name", 'Pell Oduya')],
   parts=[P('lead', '{lead}', 'lead', wants='To see the film play once in a full room.'), P('second', '{second}', 'co-lead', wants='To win fairly, for once.')],
   beats=[B('Roadside Garage', 'EXT', 'NIGHT', 'The car is dead, and the only other vehicle belongs to {second}.', **{'with': ['lead', 'second']}),
          B('Van', 'INT', 'NIGHT', 'Two crews, one drive, and an argument about who cut whose shot.', **{'with': ['lead', 'second']}),
          B('Mountain Road', 'EXT', 'NIGHT', 'A wrong turn costs an hour neither crew has.', **{'with': ['lead', 'second']}),
          B('Festival Cinema', 'INT', 'DAY', 'The copy reaches the booth with minutes to spare, or does not.', crowd=40, **{'with': ['lead', 'second']})],
   fits={'genres': ['comedy', 'road-movie', 'tragicomedy']}, tags=['journey', 'rivals', 'deadline', 'night']),
 'premise.007': dict(
   text="A local radio team receives tomorrow's emergency calls and disagrees about which to answer first.",
   logline="When a small-town radio station starts picking up tomorrow's emergency calls, host {lead} and the night crew have one day's warning and no agreement on whom to warn.",
   stakes='There are more calls than hours, and every one they answer is one they chose over another.',
   slots=[S('lead', "The Host's Name", 'Marguerite Bell')],
   parts=[P('lead', '{lead}', 'lead', wants="To be right about which call can't wait.")],
   beats=[B('Radio Studio', 'INT', 'NIGHT', "The first call comes in dated tomorrow, and it's a voice they know.", **{'with': ['lead']}),
          B('Radio Studio', 'INT', 'DAY', 'The crew lists the calls and cannot agree on an order.', **{'with': ['lead']}),
          B('Farm Road', 'EXT', 'DAY', 'The first warning is delivered, and not believed.', **{'with': ['lead']}),
          B('Radio Studio', 'INT', 'NIGHT', 'The last call on the list is from the station itself.', **{'with': ['lead']})],
   fits={'genres': ['science-fiction', 'thriller', 'drama']}, tags=['small-town', 'ensemble', 'time']),
 'premise.008': dict(
   text='Three siblings rebuilding a damaged archive uncover incompatible versions of the event that separated them.',
   logline="Called home to salvage their family's flooded archive, three estranged siblings each find proof of a different version of the night that split them, and all three can't be true.",
   stakes='Whichever version they keep becomes the family record, and one of them has to be written out of it.',
   slots=[S('lead', "The Eldest Sibling's Name", 'Thea Lindqvist')],
   parts=[P('lead', '{lead}', 'ensemble-lead', wants='To have it written down as it happened.')],
   beats=[B('Archive Basement', 'INT', 'DAY', 'The siblings start drying what the flood left.', **{'with': ['lead']}),
          B('Kitchen', 'INT', 'NIGHT', 'The first document that contradicts what one of them remembers.', **{'with': ['lead']}),
          B('Archive Basement', 'INT', 'NIGHT', 'A second version, in a hand they all recognise.', **{'with': ['lead']}),
          B('Garden', 'EXT', 'DAWN', 'What they decide to keep, and what to let the water have.', **{'with': ['lead']})],
   fits={'genres': ['drama', 'mystery', 'domestic-drama']}, tags=['family', 'one-location', 'ensemble']),
 'premise.009': dict(
   text='{lead}, a temporary engineer, and {second}, a local organizer, must finish an evacuation route while its sponsors demand a celebration.',
   logline="With a storm season a month away, contract engineer {lead} and organizer {second} have to finish the valley's only evacuation bridge, while the people paying for it want a ribbon-cutting first.",
   stakes='If the opening comes before the last span is safe, the first crowd across it will be the test.',
   slots=[S('lead', "The Engineer's Name", 'Rafa Montiel'), S('second', "The Organizer's Name", 'Agnes Tully')],
   parts=[P('lead', '{lead}', 'lead', wants='To sign off only what will hold.'), P('second', '{second}', 'co-lead', wants="To get her town a way out.")],
   beats=[B('Bridge Site', 'EXT', 'DAY', '{lead} finds the fault in the last span.', crowd=15, **{'with': ['lead']}),
          B('Town Hall', 'INT', 'NIGHT', 'The sponsors set the opening date over {second}\'s objection.', crowd=25, **{'with': ['lead', 'second']}),
          B('Bridge Site', 'EXT', 'NIGHT', 'A night shift nobody authorised.', **{'with': ['lead', 'second']}),
          B('Bridge Site', 'EXT', 'DAY', 'The opening, with the town on one side and the work not quite done.', crowd=60, **{'with': ['lead', 'second']})],
   fits={'genres': ['drama', 'thriller', 'satire']}, tags=['work', 'community', 'deadline']),
 'premise.010': dict(
   text="{lead}, a substitute teacher, relives the first day of a school's closure and learns whose choices keep changing.",
   logline="Substitute teacher {lead} keeps waking on the day the school is told it will close, and each time one thing is different, because someone else is trying to change it too.",
   stakes='The day ends the same way unless the two of them stop undoing each other.',
   slots=[S('lead', "The Teacher's Name", 'Odile Farrow')],
   parts=[P('lead', '{lead}', 'lead', wants='To get one class through one day.')],
   beats=[B('Classroom', 'INT', 'DAY', 'The announcement, the first time.', crowd=18, **{'with': ['lead']}),
          B('Staff Room', 'INT', 'DAY', 'The same morning, with one chair moved.', **{'with': ['lead']}),
          B('School Yard', 'EXT', 'DAY', '{lead} finds who else remembers.', crowd=30, **{'with': ['lead']}),
          B('Classroom', 'INT', 'DAY', 'The last version of the day, made together.', crowd=18, **{'with': ['lead']})],
   fits={'genres': ['fantasy', 'tragicomedy', 'science-fiction']}, tags=['time', 'school', 'ensemble']),
 'premise.011': dict(
   text='Passengers on a diverted train must decide whether to stop for voices coming from an abandoned station.',
   logline="When the last train of the night is diverted down a closed line, conductor {lead} and a carriage of strangers hear people calling from a station that shut forty years ago, and have to vote on whether to stop.",
   stakes="Stop, and they may not leave; go on, and they'll never know who was asking.",
   slots=[S('lead', "The Conductor's Name", 'Bram Adeyemi')],
   parts=[P('lead', '{lead}', 'ensemble-lead', wants='To get every passenger to the end of the line.')],
   beats=[B('Train Carriage', 'INT', 'NIGHT', 'The diversion is announced, and the lights of the usual line fall behind.', crowd=14, **{'with': ['lead']}),
          B('Train Carriage', 'INT', 'NIGHT', 'The voices, and the first argument about what they are.', crowd=14, **{'with': ['lead']}),
          B('Abandoned Platform', 'EXT', 'NIGHT', 'The train slows, and somebody opens a door.', **{'with': ['lead']}),
          B('Train Carriage', 'INT', 'DAWN', 'Who is on the train when it reaches the junction.', crowd=14, **{'with': ['lead']})],
   fits={'genres': ['horror', 'mystery', 'thriller']}, tags=['one-location', 'night', 'ensemble', 'journey']),
 'premise.012': dict(
   text='{lead}, a retired amateur, is asked to impersonate an absent champion until the town insists on a real contest.',
   logline="To save the town's centenary, retired amateur {lead} agrees to stand in for a champion who never arrived, and is believed so well that the town arranges a real match.",
   stakes="The contest is on Saturday, the whole town has money on it, and {lead} hasn't competed in thirty years.",
   slots=[S('lead', "The Stand-In's Name", 'Hollis Grange')],
   parts=[P('lead', '{lead}', 'lead', wants='To not be found out before Sunday.')],
   beats=[B('Railway Platform', 'EXT', 'DAY', 'The champion is not on the train, and the welcome party is waiting.', crowd=30, **{'with': ['lead']}),
          B('Town Square', 'EXT', 'DAY', '{lead} is cheered as someone else.', crowd=50, **{'with': ['lead']}),
          B('Back Room', 'INT', 'NIGHT', 'Training, in secret, with the one person who knows.', **{'with': ['lead']}),
          B('Town Square', 'EXT', 'DAY', 'The contest.', crowd=80, stunts='A sporting contest played for real', **{'with': ['lead']})],
   fits={'genres': ['comedy', 'sports', 'tragicomedy']}, tags=['small-town', 'identity', 'crowd']),
}
for oid, d in PREMISES.items():
    idea(oid, 'premise', 'brief', 'project',
         [{'op': 'story', 'field': 'premise', 'text': d['text']}, {'op': 'story', 'field': 'logline', 'text': d['logline']}, {'op': 'story', 'field': 'stakes', 'text': d['stakes']},
          {'op': 'cast', 'parts': d['parts']}, {'op': 'beats', 'beats': d['beats']}],
         DOC + ['projects.ts deriveRequirements (only for the scenes you add)'], T_APPLY + T_BEATS, fits=d['fits'], slots=d['slots'], text=d['text'].replace('{lead}', d['slots'][0]['suggest'] if any(s['key'] == 'lead' for s in d['slots']) else '').replace('{second}', next((s['suggest'] for s in d['slots'] if s['key'] == 'second'), '')).replace('{town}', next((s['suggest'] for s in d['slots'] if s['key'] == 'town'), '')), tags=d['tags'])

# ---------------- Words for one field ----------------
low = lambda s: s[0].lower() + s[1:]
for n in range(1, 11):
    oid = f'conflict.{n:03d}'; o = by[oid]
    idea(oid, 'conflict', 'brief', 'project', [{'op': 'story', 'field': 'conflict', 'text': f"{o['label']}: {low(o['description'])}"}], DOC, T_APPLY)
    oid = f'ending_route.{n:03d}'; o = by[oid]
    idea(oid, 'ending', 'brief', 'project', [{'op': 'story', 'field': 'ending', 'text': f"{o['label']}: {low(o['description'])}"}], DOC, T_APPLY)
    oid = f'character_goal.{n:03d}'; o = by[oid]
    idea(oid, 'character-goal', 'brief', 'character', [{'op': 'character', 'field': 'wants', 'text': o['description']}], ['the character sheet and the casting breakdown (casting-notes.ts)'], T_APPLY)

COMEDY = ['comedy', 'romantic-comedy', 'black-comedy', 'satire', 'farce', 'slapstick', 'buddy-comedy', 'mockumentary', 'tragicomedy', 'horror-comedy']
for n in range(1, 13):
    oid = f'comedy_treatment.{n:03d}'; o = by[oid]
    if n == 4:
        idea(oid, 'physical-comedy', 'mechanical', 'scene', [{'op': 'stunt', 'text': 'A rehearsed physical gag'}], ['projects.ts deriveRequirements (stunt)', 'production/schedule.ts sceneComplexity', 'hiring.ts neededRoles (stunt coordinator)', 'looks.ts costumeCopies'],
             ['tests/brief.test.ts::a physical gag on a chosen scene makes a stunt of it, with its rehearsal, coordinator and doubled costume'], fits={'genres': COMEDY},
             text='A physical gag in the scenes you choose: rehearsed, with a coordinator on the day and a spare costume.')
    else:
        idea(oid, 'tone', 'brief', 'project', [{'op': 'tone', 'text': o['label']}, {'op': 'story', 'field': 'intendedExperience', 'text': o['description']}], DOC, T_APPLY, fits={'genres': COMEDY})

# ---------------- The story world's rules ----------------
RULES = {1: ('The returned move slowly and never stop.', 'They can be outwalked, never outwaited.'), 2: ('The infected run.', 'Nobody on foot outpaces one for long.'),
         3: ('Sound draws them.', 'Silence is safe; a dropped tool is not.'), 4: ('They turn from light.', 'Darkness is theirs; a working lamp is a wall.'),
         5: ('They repeat traces of who they were.', 'A routine can be predicted, and used.'), 6: ('They move as one.', 'What one finds, all find.'),
         7: ('The outbreak is confined to one place.', 'Beyond its edge, nobody believes it.'), 10: ('They sleep until a specific change in their surroundings wakes them.', 'The trigger is one thing, and the story names it.')}
for n, (rule, limit) in RULES.items():
    idea(f'creature_rule.{n:03d}', 'world-rule', 'brief', 'project', [{'op': 'rule', 'rule': rule, 'limit': limit}], ['season.ts sharedFactImpact (a changed rule previews the scenes that rely on it)'], T_APPLY, fits={'genres': ['horror', 'zombie', 'science-fiction', 'fantasy', 'horror-comedy']})
idea('creature_rule.008', 'makeup', 'mechanical', 'character', [{'op': 'look', 'states': 3}], ['looks.ts statesOf, costumeCopies', 'production/tasks.ts buildTasks (a build for each state)'], T_LOOKS,
     text='They change by stages: three appearance states, each matched from scene to scene and, for appliances, each its own build.')
idea('creature_rule.009', 'makeup', 'mechanical', 'character', [{'op': 'look', 'states': 2}], ['looks.ts statesOf, costumeCopies', 'production/tasks.ts buildTasks (a build for each state)'], T_LOOKS,
     text='They pass as human until a reveal: two appearance states, before and after, kept straight across the shoot.')

# ---------------- Makeup ----------------
MK = {1: ('character', None), 2: ('aging', None), 3: ('creature', None), 4: ('partial', None), 5: ('body-paint', None), 6: ('mask', None), 7: ('cleanup', None), 8: ('digital', None), 9: ('wounds', 3)}
CONS_MK = ['looks.ts makeupShare, makeupDayCost', 'production/tasks.ts buildTasks (tests and builds)', 'production/schedule.ts groupShootDays', 'production/shoot.ts runShootDay', 'callsheet.ts callSheet', 'hiring.ts neededRoles']
for n, (mid, states) in MK.items():
    idea(f'makeup_method.{n:03d}', 'makeup', 'mechanical', 'character', [{'op': 'look', 'makeup': mid, **({'states': states} if states else {})}], CONS_MK, T_LOOKS, fits={'media': ['live-action', 'hybrid']},
         excludes=[f'makeup_method.{k:03d}' for k in MK if k != n])
idea('makeup_method.010', 'makeup', 'reference', 'character', [], ['production/tasks.ts buildTasks (puppet fabrication finishes the puppet; no performer is made up)'],
     ['tests/looks.test.ts::has no chair, no fittings and no appliances, whatever the characters\' looks say'], fits={'media': ['animation']},
     text="A puppet's finish is part of building the puppet: there is no makeup chair, and this adds nothing to it.")

# ---------------- Costume ----------------
CONS_W = ['looks.ts costumeCopies, wardrobeMismatch', 'production/tasks.ts buildTasks (costume and fittings)']
WD = {1: ('bought', None, None), 2: ('rental', None, None), 3: ('build', None, None), 4: ('bought', None, 'Work clothes for the job the character does: bought, in sizes that fit, with copies where the scenes are rough.'),
      5: ('rental', None, 'Clothes for one occasion, hired and returned.'), 6: (None, 2, 'A matching replacement for each look, for scenes that damage a costume.'),
      7: ('bought', 3, 'Clothes that wear out through the story: three levels of wear, kept in scene order.'), 8: ('build', None, 'A costume that makes a creature: built on the performer, tested for heat and for movement.')}
for n, (wid, states, text) in WD.items():
    idea(f'wardrobe_strategy.{n:03d}', 'wardrobe', 'mechanical', 'character', [{'op': 'look', **({'wardrobe': wid} if wid else {}), **({'states': states} if states else {})}], CONS_W, T_WARD, fits={'media': ['live-action', 'hybrid']}, text=text)
idea('wardrobe_strategy.009', 'wardrobe', 'reference', 'character', [], ['production/tasks.ts buildTasks (a puppet\'s costume is fitted when the puppet is made)'],
     ['tests/looks.test.ts::has no chair, no fittings and no appliances, whatever the characters\' looks say'], fits={'media': ['animation']},
     text="A puppet's clothes are made to its scale when it is built, and fitted then: this adds nothing to that.")
idea('wardrobe_strategy.010', 'style', 'reference', 'project', [{'op': 'style', 'era': '{era}'}], ['the Creative Brief on the Script page (a note for the departments)'],
     ['tests/looks.test.ts::1986 made in 2026 is a period: research, and half as much costume work again; 2026 is neither; the look it borrows changes no work'],
     slots=[S('era', 'The Period Whose Look It Borrows', 'The 1980s')], text='Dress it out of its own time on purpose. A note for the departments: it changes no work and no date.')

# ---------------- Places: a scene offered at that kind of place ----------------
LOC = {1: ('Market District', 'EXT', 'DAY', 30), 2: ('Rail Station', 'INT', 'DAY', 20), 3: ('Harbour Front', 'EXT', 'DAY', 0), 4: ('Mountain Road', 'EXT', 'DAY', 0), 5: ('Forest Clearing', 'EXT', 'DAY', 0),
       6: ('Industrial Waterfront', 'EXT', 'NIGHT', 0), 7: ('Kitchen', 'INT', 'NIGHT', 0), 8: ('Old Town Street', 'EXT', 'DAY', 10), 9: ('Stage Set', 'INT', 'DAY', 0), 10: ('School Corridor', 'INT', 'DAY', 15),
       11: ('Community Hall', 'INT', 'NIGHT', 20), 12: ('Workshop', 'INT', 'DAY', 0)}
for n, (place, ie, time, crowd) in LOC.items():
    o = by[f'location_type.{n:03d}']
    idea(f'location_type.{n:03d}', 'location', 'mechanical', 'project', [{'op': 'beats', 'beats': [B('{place}', ie, time, 'What happens here.', **({'crowd': crowd} if crowd else {}))]}],
         ['projects.ts deriveRequirements (location, crowd)', 'production/schedule.ts groupShootDays', 'locations.ts scoutedPlaces'], T_BEATS,
         slots=[S('place', "The Place's Name In Your Story", place)],
         text=f"A scene at a {low(o['label'])}{', with ' + str(crowd) + ' people in the background' if crowd else ''}. {'Exterior' if ie == 'EXT' else 'Interior'}, {'by day' if time == 'DAY' else 'at night'}: scouted, booked and scheduled like any other.")

# ---------------- Camera: how each scene is covered and what the camera is on; the light, for the whole film ----------------
T_CRAFT = 'tests/craft.test.ts::'
CAM = {1: dict(coverage='master', emphasis='scene', rig='sticks'), 2: dict(coverage='standard', emphasis='performances', rig='handheld'), 3: dict(coverage='master', takes='many', emphasis='one-shot', rig='moving'),
       4: dict(coverage='standard', takes='few', emphasis='scene', rig='dolly'), 5: dict(coverage='full', emphasis='performances'), 6: dict(coverage='master', takes='few', emphasis='scene'),
       10: dict(emphasis='performances', rig='pov')}
CAM_TEXT = {2: 'Carried by the operator: setups reset quickly, and takes vary more.', 3: 'One rehearsed take that moves with the action, on a rented stabiliser. A take that fails starts again from the top.',
            4: 'Track is laid for each setup by a key grip, on a rented dolly. Slower to set, steadier to shoot.', 10: "Seen through a character's eyes: eyelines to the lens are rehearsed and checked on playback."}
LIGHT = {7: ('available', 'Lamps in the room and what the day gives. Interiors need no gaffer and reset sooner; a take more is planned for each setup, after a day of camera tests.'),
         8: ('contrast', 'Hard light and deep shadow, shaped setup by setup and matched in the grade: slower on the day and longer in the grade, after two days of tests.'),
         9: ('macro', 'Close lenses on small sets, for stop motion: two more stage days of lens and depth tests, and fewer frames in a day.')}
for n in range(1, 11):
    oid = f'camera_treatment.{n:03d}'
    if n in CAM:
        idea(oid, 'camera', 'mechanical', 'scene', [{'op': 'shot', **CAM[n]}], ['takes.ts planTime, shotPlan, recordTakes', 'craft.ts craftTime, craftRoles, rigDayCost', 'production/schedule.ts sceneLoad', 'finish.ts coverageEdit'],
             ['tests/brief.test.ts::a camera idea sets the scene\'s shot plan, which the schedule already reads', T_CRAFT + 'each rig changes the time a scene takes by its own reset and running time, and nothing else about the plan'],
             fits={'media': ['live-action', 'hybrid']}, **({'text': CAM_TEXT[n]} if n in CAM_TEXT else {}))
    else:
        light, text = LIGHT[n]
        idea(oid, 'light', 'mechanical', 'project', [{'op': 'light', 'light': light}], ['craft.ts craftTime, gafferNeeded, cameraTestDays, postFactors', 'takes.ts planTime', 'hiring.ts neededRoles', 'production/tasks.ts buildTasks'],
             [T_CRAFT + {'available': 'practical and available light: interiors reset sooner and need no gaffer, a take more is planned, after a day of tests', 'contrast': 'high contrast: slower on lit scenes, a longer grade, two days of tests, and no change to a day exterior',
                         'macro': 'macro on miniatures is for stop motion: two more stage days and fewer frames a day; it asks nothing of a live film'}[light]],
             text=text, fits={'media': ['animation', 'hybrid']} if light == 'macro' else {'media': ['live-action', 'hybrid']}, excludes=[f'camera_treatment.{k:03d}' for k in LIGHT if k != n])

# ---------------- Sound and music ----------------
SOUND = {1: ('texture', 'The recordist records each place by itself before the shoot: a day for every three locations, and less effects editing after.'),
         2: ('clarity', 'A boom operator on every dialogue scene, and a moment to quiet the set before each setup. Dialogue recorded this way holds on a day spoiled by weather or noise, where it would otherwise be replaced in post.'),
         3: ('sparse', 'Quiet, with few sounds, each one exposed: more Foley and a longer mix, and less score.'),
         4: ('creature', 'Movement and material recorded for each creature: two Foley days for every creature in the script.'),
         10: ('crowd', 'A loop group records the crowd after the lock: a session for every two scenes with a crowd.')}
SCORE = {5: ('synth', 'An electronic score, made by the composer alone: no players and no sessions.'), 6: ('chamber', 'A small ensemble, recorded: a session for every twenty minutes of the film, which the mix waits for.'),
         7: ('percussive', 'Percussion written tightly to the cut: longer to compose, with a session for every forty minutes.')}
for n in range(1, 11):
    oid = f'sound_treatment.{n:03d}'
    if n == 9:
        idea(oid, 'sound', 'mechanical', 'character', [{'op': 'narrator'}], ['production/tasks.ts buildTasks (narration recording, which every mix waits for)'],
             ['tests/brief.test.ts::a narrator chosen from an idea is recorded after the lock, and the mix waits'], text='A character tells the story in voice-over: recorded once the picture is locked, before the final mix.')
    elif n in SCORE:
        score, text = SCORE[n]
        idea(oid, 'score', 'mechanical', 'project', [{'op': 'score', 'score': score}], ['craft.ts postFactors, scoreSessions', 'production/tasks.ts buildTasks (the score, its recording sessions, the mix)'],
             [T_CRAFT + 'a score with players is recorded in sessions that cost money and hold the mix; an electronic one is the composer alone'], text=text, excludes=[f'sound_treatment.{k:03d}' for k in SCORE if k != n])
    elif n == 8:
        idea(oid, 'sound', 'reference', 'project', [], ['songs.ts (add each song on the Songs card: licensing one there makes its clearance work and cost)'], T_APPLY,
             text='Existing songs carry the film. Choosing this licenses nothing: add each song on the Songs card, where licensing one makes its clearance work.')
    else:
        sound, text = SOUND[n]
        idea(oid, 'sound', 'mechanical', 'project', [{'op': 'sound', 'add': sound}], ['craft.ts craftTime, craftRoles, postFactors, dialogueHolds', 'production/tasks.ts buildTasks', 'production/shoot.ts needsDialogueReplacement', 'hiring.ts neededRoles'],
             [T_CRAFT + ('dialogue clarity: a boom operator is required, dialogue scenes reset a little slower, and a compromised day\'s dialogue holds' if sound == 'clarity' else 'each sound choice moves its own work and no other')], text=text, adds=True)

# ---------------- How it is made ----------------
MED = {1: ('live-action', 'none'), 2: ('animation', '2d-drawn'), 3: ('animation', '2d-rigged'), 4: ('animation', '3d-cg'), 5: ('animation', 'stop-motion'), 6: ('animation', 'stop-motion'),
       7: ('animation', 'stop-motion'), 8: ('animation', 'rotoscope'), 9: ('hybrid', '3d-cg'), 10: ('animation', 'mixed')}
for n, (m, tq) in MED.items():
    idea(f'production_medium.{n:03d}', 'medium', 'mechanical', 'project', [{'op': 'medium', 'medium': m, 'technique': tq}], ['projects.ts sceneTechnique, deriveRequirements', 'production/tasks.ts buildTasks', 'hiring.ts neededRoles'],
         ['tests/zombie.test.ts::made as stop motion: puppets and animators, voices kept, and no makeup chair'], excludes=[f'production_medium.{k:03d}' for k in MED if k != n])

assert len(out) == 126, len(out)
assert len({o['id'] for o in out}) == 126
body = json.dumps(out, indent=1, ensure_ascii=False)
open('src/ideas/starter.ts', 'w').write(
"// The package's 126 starter options as idea records (src/engine/brief.ts). Written by tools/ideas/from-starter.py from\n"
"// docs/creative-depth/package/starter-options.json: change the generator, not this file. Original authored content;\n"
"// no entry retells a real work.\n"
"import type { Idea } from '../engine/brief';\n\n"
"export const STARTER: Idea[] = " + body + ";\n")
print(len(out), 'ideas;', {k: sum(1 for o in out if o['kind'] == k) for k in ('mechanical', 'brief', 'reference')})
