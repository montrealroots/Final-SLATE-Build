// The package's 126 starter options as idea records (src/engine/brief.ts). Written by tools/ideas/from-starter.py from
// docs/creative-depth/package/starter-options.json: change the generator, not this file. Original authored content;
// no entry retells a real work.
import type { Idea } from '../engine/brief';

export const STARTER: Idea[] = [
 {
  "id": "premise.001",
  "v": 1,
  "field": "premise",
  "label": "A Town That Cannot Sleep",
  "text": "In Briar Hollow, the night-shift dispatcher Briar Hollow must keep a divided town connected when the dead return before dawn.",
  "kind": "brief",
  "scope": "project",
  "tags": [
   "night",
   "small-town",
   "siege",
   "ensemble"
  ],
  "patch": [
   {
    "op": "story",
    "field": "premise",
    "text": "In {town}, the night-shift dispatcher {lead} must keep a divided town connected when the dead return before dawn."
   },
   {
    "op": "story",
    "field": "logline",
    "text": "When the dead return during {town}'s overnight shift, the dispatcher {lead} and a stranded repair crew must restore the emergency transmitter before dawn divides the survivors for good."
   },
   {
    "op": "story",
    "field": "stakes",
    "text": "If the transmitter stays down, each street faces the night alone, and by morning nobody will trust a call for help again."
   },
   {
    "op": "cast",
    "parts": [
     {
      "slot": "lead",
      "name": "{lead}",
      "size": "lead",
      "wants": "To keep every line open until morning."
     },
     {
      "slot": "second",
      "name": "{second}",
      "size": "co-lead",
      "wants": "To get his crew home."
     },
     {
      "slot": "dead",
      "name": "The Returned",
      "size": "featured",
      "entity": "undead"
     }
    ]
   },
   {
    "op": "beats",
    "beats": [
     {
      "place": "Dispatch Office",
      "intExt": "INT",
      "time": "NIGHT",
      "objective": "The radio link fails while {lead} is the only one on shift.",
      "minutes": 3,
      "with": [
       "lead"
      ]
     },
     {
      "place": "Workshop",
      "intExt": "INT",
      "time": "NIGHT",
      "objective": "{second}'s crew and the townspeople argue over the last usable battery.",
      "minutes": 3,
      "with": [
       "second"
      ]
     },
     {
      "place": "Main Street",
      "intExt": "EXT",
      "time": "NIGHT",
      "objective": "A small group of the returned crosses between {lead} and the workshop.",
      "minutes": 3,
      "crowd": 12,
      "crowdLook": "wounds",
      "with": [
       "lead",
       "dead"
      ]
     },
     {
      "place": "Transmitter Shed",
      "intExt": "INT",
      "time": "NIGHT",
      "objective": "{lead} and {second} repair the transmitter while the door is held.",
      "minutes": 3,
      "with": [
       "lead",
       "second"
      ]
     },
     {
      "place": "Main Street",
      "intExt": "EXT",
      "time": "DAWN",
      "objective": "Morning shows who answered and who did not.",
      "minutes": 3,
      "with": [
       "lead",
       "second"
      ]
     }
    ]
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)",
   "projects.ts deriveRequirements (only for the scenes you add)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do",
   "tests/brief.test.ts::offered scenes are added only when ticked, and then make the work scenes make"
  ],
  "fits": {
   "genres": [
    "horror",
    "zombie",
    "horror-comedy"
   ],
   "formats": [
    "feature"
   ]
  },
  "slots": [
   {
    "key": "town",
    "label": "The Town's Name",
    "suggest": "Briar Hollow"
   },
   {
    "key": "lead",
    "label": "The Dispatcher's Name",
    "suggest": "June Okafor"
   },
   {
    "key": "second",
    "label": "The Repair Crew's Foreman",
    "suggest": "Dale Whitlock"
   }
  ]
 },
 {
  "id": "premise.002",
  "v": 1,
  "field": "premise",
  "label": "The Last Delivery",
  "text": "Tavi Reyes, a bicycle courier carrying medicine that cannot wait, must cross a quarantined district with Noor Halim, a former rival.",
  "kind": "brief",
  "scope": "project",
  "tags": [
   "city",
   "deadline",
   "two-hander",
   "journey"
  ],
  "patch": [
   {
    "op": "story",
    "field": "premise",
    "text": "{lead}, a bicycle courier carrying medicine that cannot wait, must cross a quarantined district with {second}, a former rival."
   },
   {
    "op": "story",
    "field": "logline",
    "text": "When a quarantine seals the district, courier {lead} has until curfew to carry a dose across it, with the one rider who knows the back routes: the rival who cost {lead} the job."
   },
   {
    "op": "story",
    "field": "stakes",
    "text": "The medicine spoils by curfew, and the only person who can get it through is the one {lead} swore never to ride with again."
   },
   {
    "op": "cast",
    "parts": [
     {
      "slot": "lead",
      "name": "{lead}",
      "size": "lead",
      "wants": "To make the one delivery that matters."
     },
     {
      "slot": "second",
      "name": "{second}",
      "size": "co-lead",
      "wants": "To be trusted again."
     }
    ]
   },
   {
    "op": "beats",
    "beats": [
     {
      "place": "Depot",
      "intExt": "INT",
      "time": "DAY",
      "objective": "{lead} is handed the package and the deadline.",
      "minutes": 3,
      "with": [
       "lead"
      ]
     },
     {
      "place": "Checkpoint",
      "intExt": "EXT",
      "time": "DAY",
      "objective": "The checkpoint turns {lead} back; {second} offers another way.",
      "minutes": 3,
      "crowd": 15,
      "with": [
       "lead",
       "second"
      ]
     },
     {
      "place": "Back Alleys",
      "intExt": "EXT",
      "time": "DAY",
      "objective": "A chase through streets only {second} knows.",
      "minutes": 3,
      "stunts": "Bicycle chase",
      "with": [
       "lead",
       "second"
      ]
     },
     {
      "place": "Clinic Door",
      "intExt": "EXT",
      "time": "DUSK",
      "objective": "The dose arrives, and the two riders settle what is owed.",
      "minutes": 3,
      "with": [
       "lead",
       "second"
      ]
     }
    ]
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)",
   "projects.ts deriveRequirements (only for the scenes you add)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do",
   "tests/brief.test.ts::offered scenes are added only when ticked, and then make the work scenes make"
  ],
  "fits": {
   "genres": [
    "thriller",
    "drama",
    "action"
   ]
  },
  "slots": [
   {
    "key": "lead",
    "label": "The Courier's Name",
    "suggest": "Tavi Reyes"
   },
   {
    "key": "second",
    "label": "The Rival's Name",
    "suggest": "Noor Halim"
   }
  ]
 },
 {
  "id": "premise.003",
  "v": 1,
  "field": "premise",
  "label": "Closing Night",
  "text": "A failing theater company discovers that its final performance is the only thing keeping a dangerous visitor calm.",
  "kind": "brief",
  "scope": "project",
  "tags": [
   "one-location",
   "backstage",
   "ensemble",
   "night"
  ],
  "patch": [
   {
    "op": "story",
    "field": "premise",
    "text": "A failing theater company discovers that its final performance is the only thing keeping a dangerous visitor calm."
   },
   {
    "op": "story",
    "field": "logline",
    "text": "On closing night, {lead}'s broke theater company learns that the stranger in row three stays peaceful only while the play goes on, and the play is ninety minutes long."
   },
   {
    "op": "story",
    "field": "stakes",
    "text": "When the curtain falls, the visitor stops being an audience."
   },
   {
    "op": "cast",
    "parts": [
     {
      "slot": "lead",
      "name": "{lead}",
      "size": "lead",
      "wants": "To get one last full house out alive."
     },
     {
      "slot": "visitor",
      "name": "The Visitor",
      "size": "supporting",
      "entity": "supernatural"
     }
    ]
   },
   {
    "op": "beats",
    "beats": [
     {
      "place": "Theater Foyer",
      "intExt": "INT",
      "time": "NIGHT",
      "objective": "The visitor arrives and the company counts a thin house.",
      "minutes": 3,
      "crowd": 20,
      "with": [
       "lead",
       "visitor"
      ]
     },
     {
      "place": "Backstage",
      "intExt": "INT",
      "time": "NIGHT",
      "objective": "The company works out what the visitor is, between cues.",
      "minutes": 3,
      "with": [
       "lead"
      ]
     },
     {
      "place": "Stage",
      "intExt": "INT",
      "time": "NIGHT",
      "objective": "The play runs out of script and the company starts to improvise.",
      "minutes": 3,
      "crowd": 20,
      "with": [
       "lead",
       "visitor"
      ]
     },
     {
      "place": "Stage Door",
      "intExt": "EXT",
      "time": "NIGHT",
      "objective": "What the company agrees to, to keep the show running.",
      "minutes": 3,
      "with": [
       "lead",
       "visitor"
      ]
     }
    ]
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)",
   "projects.ts deriveRequirements (only for the scenes you add)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do",
   "tests/brief.test.ts::offered scenes are added only when ticked, and then make the work scenes make"
  ],
  "fits": {
   "genres": [
    "horror-comedy",
    "comedy",
    "horror",
    "fantasy"
   ]
  },
  "slots": [
   {
    "key": "lead",
    "label": "The Company Manager's Name",
    "suggest": "Imre Castellan"
   }
  ]
 },
 {
  "id": "premise.004",
  "v": 1,
  "field": "premise",
  "label": "The Missing Minute",
  "text": "Sol Aguirre, an apprentice editor, finds the same missing minute in unrelated recordings and follows the people erased from it.",
  "kind": "brief",
  "scope": "project",
  "tags": [
   "investigation",
   "city",
   "solo-lead"
  ],
  "patch": [
   {
    "op": "story",
    "field": "premise",
    "text": "{lead}, an apprentice editor, finds the same missing minute in unrelated recordings and follows the people erased from it."
   },
   {
    "op": "story",
    "field": "logline",
    "text": "When apprentice editor {lead} finds one identical gap cut from a dozen unrelated recordings, the search for who removed it leads to the people who were in it."
   },
   {
    "op": "story",
    "field": "stakes",
    "text": "Whoever cut the minute is still cutting, and {lead} has now been seen looking."
   },
   {
    "op": "cast",
    "parts": [
     {
      "slot": "lead",
      "name": "{lead}",
      "size": "lead",
      "wants": "To know what was in the minute."
     }
    ]
   },
   {
    "op": "beats",
    "beats": [
     {
      "place": "Edit Room",
      "intExt": "INT",
      "time": "NIGHT",
      "objective": "{lead} lines up two recordings and finds the same hole in both.",
      "minutes": 3,
      "with": [
       "lead"
      ]
     },
     {
      "place": "Archive",
      "intExt": "INT",
      "time": "DAY",
      "objective": "A third recording, older, with the same minute gone.",
      "minutes": 3,
      "with": [
       "lead"
      ]
     },
     {
      "place": "Apartment Stairwell",
      "intExt": "INT",
      "time": "NIGHT",
      "objective": "Someone from the missing minute refuses to talk, then does.",
      "minutes": 3,
      "with": [
       "lead"
      ]
     },
     {
      "place": "Edit Room",
      "intExt": "INT",
      "time": "DAWN",
      "objective": "{lead} decides whether to put the minute back.",
      "minutes": 3,
      "with": [
       "lead"
      ]
     }
    ]
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)",
   "projects.ts deriveRequirements (only for the scenes you add)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do",
   "tests/brief.test.ts::offered scenes are added only when ticked, and then make the work scenes make"
  ],
  "fits": {
   "genres": [
    "mystery",
    "thriller",
    "science-fiction"
   ]
  },
  "slots": [
   {
    "key": "lead",
    "label": "The Editor's Name",
    "suggest": "Sol Aguirre"
   }
  ]
 },
 {
  "id": "premise.005",
  "v": 1,
  "field": "premise",
  "label": "The Borrowed Name",
  "text": "Calla Brandt, a struggling performer, accepts a mistaken identity and must choose between the breakthrough and the person losing credit.",
  "kind": "brief",
  "scope": "project",
  "tags": [
   "backstage",
   "identity",
   "two-hander"
  ],
  "patch": [
   {
    "op": "story",
    "field": "premise",
    "text": "{lead}, a struggling performer, accepts a mistaken identity and must choose between the breakthrough and the person losing credit."
   },
   {
    "op": "story",
    "field": "logline",
    "text": "Mistaken for a rising name, struggling performer {lead} takes the part of a lifetime, until the person whose name it is turns up asking for nothing but their own work back."
   },
   {
    "op": "story",
    "field": "stakes",
    "text": "Every good notice {lead} earns is taken from someone who can't afford to lose it."
   },
   {
    "op": "cast",
    "parts": [
     {
      "slot": "lead",
      "name": "{lead}",
      "size": "lead",
      "wants": "To be seen once."
     },
     {
      "slot": "second",
      "name": "{second}",
      "size": "supporting",
      "wants": "To have what she made carry her name."
     }
    ]
   },
   {
    "op": "beats",
    "beats": [
     {
      "place": "Audition Room",
      "intExt": "INT",
      "time": "DAY",
      "objective": "{lead} is greeted by the wrong name and does not correct it.",
      "minutes": 3,
      "with": [
       "lead"
      ]
     },
     {
      "place": "Rehearsal Hall",
      "intExt": "INT",
      "time": "DAY",
      "objective": "The work is good, and the lie gets harder to leave.",
      "minutes": 3,
      "crowd": 10,
      "with": [
       "lead"
      ]
     },
     {
      "place": "Stage Door",
      "intExt": "EXT",
      "time": "NIGHT",
      "objective": "{second} arrives and asks one question.",
      "minutes": 3,
      "with": [
       "lead",
       "second"
      ]
     },
     {
      "place": "Dressing Room",
      "intExt": "INT",
      "time": "NIGHT",
      "objective": "{lead} chooses, before the half-hour call.",
      "minutes": 3,
      "with": [
       "lead",
       "second"
      ]
     }
    ]
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)",
   "projects.ts deriveRequirements (only for the scenes you add)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do",
   "tests/brief.test.ts::offered scenes are added only when ticked, and then make the work scenes make"
  ],
  "fits": {
   "genres": [
    "drama",
    "comedy",
    "tragicomedy"
   ]
  },
  "slots": [
   {
    "key": "lead",
    "label": "The Performer's Name",
    "suggest": "Calla Brandt"
   },
   {
    "key": "second",
    "label": "The Name's Real Owner",
    "suggest": "Edda Morrow"
   }
  ]
 },
 {
  "id": "premise.006",
  "v": 1,
  "field": "premise",
  "label": "The Festival Detour",
  "text": "Ines Vaartjes, a filmmaker stranded with a rival crew, has one night to get their only screening copy to a distant festival.",
  "kind": "brief",
  "scope": "project",
  "tags": [
   "journey",
   "rivals",
   "deadline",
   "night"
  ],
  "patch": [
   {
    "op": "story",
    "field": "premise",
    "text": "{lead}, a filmmaker stranded with a rival crew, has one night to get their only screening copy to a distant festival."
   },
   {
    "op": "story",
    "field": "logline",
    "text": "Stranded overnight with the crew who beat them to every prize, filmmaker {lead} has until morning to carry the only copy of the film to a festival three hundred miles off."
   },
   {
    "op": "story",
    "field": "stakes",
    "text": "Miss the screening and the film has no premiere, and the rival crew are the only people with a van."
   },
   {
    "op": "cast",
    "parts": [
     {
      "slot": "lead",
      "name": "{lead}",
      "size": "lead",
      "wants": "To see the film play once in a full room."
     },
     {
      "slot": "second",
      "name": "{second}",
      "size": "co-lead",
      "wants": "To win fairly, for once."
     }
    ]
   },
   {
    "op": "beats",
    "beats": [
     {
      "place": "Roadside Garage",
      "intExt": "EXT",
      "time": "NIGHT",
      "objective": "The car is dead, and the only other vehicle belongs to {second}.",
      "minutes": 3,
      "with": [
       "lead",
       "second"
      ]
     },
     {
      "place": "Van",
      "intExt": "INT",
      "time": "NIGHT",
      "objective": "Two crews, one drive, and an argument about who cut whose shot.",
      "minutes": 3,
      "with": [
       "lead",
       "second"
      ]
     },
     {
      "place": "Mountain Road",
      "intExt": "EXT",
      "time": "NIGHT",
      "objective": "A wrong turn costs an hour neither crew has.",
      "minutes": 3,
      "with": [
       "lead",
       "second"
      ]
     },
     {
      "place": "Festival Cinema",
      "intExt": "INT",
      "time": "DAY",
      "objective": "The copy reaches the booth with minutes to spare, or does not.",
      "minutes": 3,
      "crowd": 40,
      "with": [
       "lead",
       "second"
      ]
     }
    ]
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)",
   "projects.ts deriveRequirements (only for the scenes you add)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do",
   "tests/brief.test.ts::offered scenes are added only when ticked, and then make the work scenes make"
  ],
  "fits": {
   "genres": [
    "comedy",
    "road-movie",
    "tragicomedy"
   ]
  },
  "slots": [
   {
    "key": "lead",
    "label": "The Filmmaker's Name",
    "suggest": "Ines Vaartjes"
   },
   {
    "key": "second",
    "label": "The Rival Director's Name",
    "suggest": "Pell Oduya"
   }
  ]
 },
 {
  "id": "premise.007",
  "v": 1,
  "field": "premise",
  "label": "The Quiet Broadcast",
  "text": "A local radio team receives tomorrow's emergency calls and disagrees about which to answer first.",
  "kind": "brief",
  "scope": "project",
  "tags": [
   "small-town",
   "ensemble",
   "time"
  ],
  "patch": [
   {
    "op": "story",
    "field": "premise",
    "text": "A local radio team receives tomorrow's emergency calls and disagrees about which to answer first."
   },
   {
    "op": "story",
    "field": "logline",
    "text": "When a small-town radio station starts picking up tomorrow's emergency calls, host {lead} and the night crew have one day's warning and no agreement on whom to warn."
   },
   {
    "op": "story",
    "field": "stakes",
    "text": "There are more calls than hours, and every one they answer is one they chose over another."
   },
   {
    "op": "cast",
    "parts": [
     {
      "slot": "lead",
      "name": "{lead}",
      "size": "lead",
      "wants": "To be right about which call can't wait."
     }
    ]
   },
   {
    "op": "beats",
    "beats": [
     {
      "place": "Radio Studio",
      "intExt": "INT",
      "time": "NIGHT",
      "objective": "The first call comes in dated tomorrow, and it's a voice they know.",
      "minutes": 3,
      "with": [
       "lead"
      ]
     },
     {
      "place": "Radio Studio",
      "intExt": "INT",
      "time": "DAY",
      "objective": "The crew lists the calls and cannot agree on an order.",
      "minutes": 3,
      "with": [
       "lead"
      ]
     },
     {
      "place": "Farm Road",
      "intExt": "EXT",
      "time": "DAY",
      "objective": "The first warning is delivered, and not believed.",
      "minutes": 3,
      "with": [
       "lead"
      ]
     },
     {
      "place": "Radio Studio",
      "intExt": "INT",
      "time": "NIGHT",
      "objective": "The last call on the list is from the station itself.",
      "minutes": 3,
      "with": [
       "lead"
      ]
     }
    ]
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)",
   "projects.ts deriveRequirements (only for the scenes you add)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do",
   "tests/brief.test.ts::offered scenes are added only when ticked, and then make the work scenes make"
  ],
  "fits": {
   "genres": [
    "science-fiction",
    "thriller",
    "drama"
   ]
  },
  "slots": [
   {
    "key": "lead",
    "label": "The Host's Name",
    "suggest": "Marguerite Bell"
   }
  ]
 },
 {
  "id": "premise.008",
  "v": 1,
  "field": "premise",
  "label": "The Family Archive",
  "text": "Three siblings rebuilding a damaged archive uncover incompatible versions of the event that separated them.",
  "kind": "brief",
  "scope": "project",
  "tags": [
   "family",
   "one-location",
   "ensemble"
  ],
  "patch": [
   {
    "op": "story",
    "field": "premise",
    "text": "Three siblings rebuilding a damaged archive uncover incompatible versions of the event that separated them."
   },
   {
    "op": "story",
    "field": "logline",
    "text": "Called home to salvage their family's flooded archive, three estranged siblings each find proof of a different version of the night that split them, and all three can't be true."
   },
   {
    "op": "story",
    "field": "stakes",
    "text": "Whichever version they keep becomes the family record, and one of them has to be written out of it."
   },
   {
    "op": "cast",
    "parts": [
     {
      "slot": "lead",
      "name": "{lead}",
      "size": "ensemble-lead",
      "wants": "To have it written down as it happened."
     }
    ]
   },
   {
    "op": "beats",
    "beats": [
     {
      "place": "Archive Basement",
      "intExt": "INT",
      "time": "DAY",
      "objective": "The siblings start drying what the flood left.",
      "minutes": 3,
      "with": [
       "lead"
      ]
     },
     {
      "place": "Kitchen",
      "intExt": "INT",
      "time": "NIGHT",
      "objective": "The first document that contradicts what one of them remembers.",
      "minutes": 3,
      "with": [
       "lead"
      ]
     },
     {
      "place": "Archive Basement",
      "intExt": "INT",
      "time": "NIGHT",
      "objective": "A second version, in a hand they all recognise.",
      "minutes": 3,
      "with": [
       "lead"
      ]
     },
     {
      "place": "Garden",
      "intExt": "EXT",
      "time": "DAWN",
      "objective": "What they decide to keep, and what to let the water have.",
      "minutes": 3,
      "with": [
       "lead"
      ]
     }
    ]
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)",
   "projects.ts deriveRequirements (only for the scenes you add)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do",
   "tests/brief.test.ts::offered scenes are added only when ticked, and then make the work scenes make"
  ],
  "fits": {
   "genres": [
    "drama",
    "mystery",
    "domestic-drama"
   ]
  },
  "slots": [
   {
    "key": "lead",
    "label": "The Eldest Sibling's Name",
    "suggest": "Thea Lindqvist"
   }
  ]
 },
 {
  "id": "premise.009",
  "v": 1,
  "field": "premise",
  "label": "The Unfinished Bridge",
  "text": "Rafa Montiel, a temporary engineer, and Agnes Tully, a local organizer, must finish an evacuation route while its sponsors demand a celebration.",
  "kind": "brief",
  "scope": "project",
  "tags": [
   "work",
   "community",
   "deadline"
  ],
  "patch": [
   {
    "op": "story",
    "field": "premise",
    "text": "{lead}, a temporary engineer, and {second}, a local organizer, must finish an evacuation route while its sponsors demand a celebration."
   },
   {
    "op": "story",
    "field": "logline",
    "text": "With a storm season a month away, contract engineer {lead} and organizer {second} have to finish the valley's only evacuation bridge, while the people paying for it want a ribbon-cutting first."
   },
   {
    "op": "story",
    "field": "stakes",
    "text": "If the opening comes before the last span is safe, the first crowd across it will be the test."
   },
   {
    "op": "cast",
    "parts": [
     {
      "slot": "lead",
      "name": "{lead}",
      "size": "lead",
      "wants": "To sign off only what will hold."
     },
     {
      "slot": "second",
      "name": "{second}",
      "size": "co-lead",
      "wants": "To get her town a way out."
     }
    ]
   },
   {
    "op": "beats",
    "beats": [
     {
      "place": "Bridge Site",
      "intExt": "EXT",
      "time": "DAY",
      "objective": "{lead} finds the fault in the last span.",
      "minutes": 3,
      "crowd": 15,
      "with": [
       "lead"
      ]
     },
     {
      "place": "Town Hall",
      "intExt": "INT",
      "time": "NIGHT",
      "objective": "The sponsors set the opening date over {second}'s objection.",
      "minutes": 3,
      "crowd": 25,
      "with": [
       "lead",
       "second"
      ]
     },
     {
      "place": "Bridge Site",
      "intExt": "EXT",
      "time": "NIGHT",
      "objective": "A night shift nobody authorised.",
      "minutes": 3,
      "with": [
       "lead",
       "second"
      ]
     },
     {
      "place": "Bridge Site",
      "intExt": "EXT",
      "time": "DAY",
      "objective": "The opening, with the town on one side and the work not quite done.",
      "minutes": 3,
      "crowd": 60,
      "with": [
       "lead",
       "second"
      ]
     }
    ]
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)",
   "projects.ts deriveRequirements (only for the scenes you add)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do",
   "tests/brief.test.ts::offered scenes are added only when ticked, and then make the work scenes make"
  ],
  "fits": {
   "genres": [
    "drama",
    "thriller",
    "satire"
   ]
  },
  "slots": [
   {
    "key": "lead",
    "label": "The Engineer's Name",
    "suggest": "Rafa Montiel"
   },
   {
    "key": "second",
    "label": "The Organizer's Name",
    "suggest": "Agnes Tully"
   }
  ]
 },
 {
  "id": "premise.010",
  "v": 1,
  "field": "premise",
  "label": "The Second First Day",
  "text": "Odile Farrow, a substitute teacher, relives the first day of a school's closure and learns whose choices keep changing.",
  "kind": "brief",
  "scope": "project",
  "tags": [
   "time",
   "school",
   "ensemble"
  ],
  "patch": [
   {
    "op": "story",
    "field": "premise",
    "text": "{lead}, a substitute teacher, relives the first day of a school's closure and learns whose choices keep changing."
   },
   {
    "op": "story",
    "field": "logline",
    "text": "Substitute teacher {lead} keeps waking on the day the school is told it will close, and each time one thing is different, because someone else is trying to change it too."
   },
   {
    "op": "story",
    "field": "stakes",
    "text": "The day ends the same way unless the two of them stop undoing each other."
   },
   {
    "op": "cast",
    "parts": [
     {
      "slot": "lead",
      "name": "{lead}",
      "size": "lead",
      "wants": "To get one class through one day."
     }
    ]
   },
   {
    "op": "beats",
    "beats": [
     {
      "place": "Classroom",
      "intExt": "INT",
      "time": "DAY",
      "objective": "The announcement, the first time.",
      "minutes": 3,
      "crowd": 18,
      "with": [
       "lead"
      ]
     },
     {
      "place": "Staff Room",
      "intExt": "INT",
      "time": "DAY",
      "objective": "The same morning, with one chair moved.",
      "minutes": 3,
      "with": [
       "lead"
      ]
     },
     {
      "place": "School Yard",
      "intExt": "EXT",
      "time": "DAY",
      "objective": "{lead} finds who else remembers.",
      "minutes": 3,
      "crowd": 30,
      "with": [
       "lead"
      ]
     },
     {
      "place": "Classroom",
      "intExt": "INT",
      "time": "DAY",
      "objective": "The last version of the day, made together.",
      "minutes": 3,
      "crowd": 18,
      "with": [
       "lead"
      ]
     }
    ]
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)",
   "projects.ts deriveRequirements (only for the scenes you add)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do",
   "tests/brief.test.ts::offered scenes are added only when ticked, and then make the work scenes make"
  ],
  "fits": {
   "genres": [
    "fantasy",
    "tragicomedy",
    "science-fiction"
   ]
  },
  "slots": [
   {
    "key": "lead",
    "label": "The Teacher's Name",
    "suggest": "Odile Farrow"
   }
  ]
 },
 {
  "id": "premise.011",
  "v": 1,
  "field": "premise",
  "label": "The Last Night Train",
  "text": "Passengers on a diverted train must decide whether to stop for voices coming from an abandoned station.",
  "kind": "brief",
  "scope": "project",
  "tags": [
   "one-location",
   "night",
   "ensemble",
   "journey"
  ],
  "patch": [
   {
    "op": "story",
    "field": "premise",
    "text": "Passengers on a diverted train must decide whether to stop for voices coming from an abandoned station."
   },
   {
    "op": "story",
    "field": "logline",
    "text": "When the last train of the night is diverted down a closed line, conductor {lead} and a carriage of strangers hear people calling from a station that shut forty years ago, and have to vote on whether to stop."
   },
   {
    "op": "story",
    "field": "stakes",
    "text": "Stop, and they may not leave; go on, and they'll never know who was asking."
   },
   {
    "op": "cast",
    "parts": [
     {
      "slot": "lead",
      "name": "{lead}",
      "size": "ensemble-lead",
      "wants": "To get every passenger to the end of the line."
     }
    ]
   },
   {
    "op": "beats",
    "beats": [
     {
      "place": "Train Carriage",
      "intExt": "INT",
      "time": "NIGHT",
      "objective": "The diversion is announced, and the lights of the usual line fall behind.",
      "minutes": 3,
      "crowd": 14,
      "with": [
       "lead"
      ]
     },
     {
      "place": "Train Carriage",
      "intExt": "INT",
      "time": "NIGHT",
      "objective": "The voices, and the first argument about what they are.",
      "minutes": 3,
      "crowd": 14,
      "with": [
       "lead"
      ]
     },
     {
      "place": "Abandoned Platform",
      "intExt": "EXT",
      "time": "NIGHT",
      "objective": "The train slows, and somebody opens a door.",
      "minutes": 3,
      "with": [
       "lead"
      ]
     },
     {
      "place": "Train Carriage",
      "intExt": "INT",
      "time": "DAWN",
      "objective": "Who is on the train when it reaches the junction.",
      "minutes": 3,
      "crowd": 14,
      "with": [
       "lead"
      ]
     }
    ]
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)",
   "projects.ts deriveRequirements (only for the scenes you add)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do",
   "tests/brief.test.ts::offered scenes are added only when ticked, and then make the work scenes make"
  ],
  "fits": {
   "genres": [
    "horror",
    "mystery",
    "thriller"
   ]
  },
  "slots": [
   {
    "key": "lead",
    "label": "The Conductor's Name",
    "suggest": "Bram Adeyemi"
   }
  ]
 },
 {
  "id": "premise.012",
  "v": 1,
  "field": "premise",
  "label": "The Substitute Champion",
  "text": "Hollis Grange, a retired amateur, is asked to impersonate an absent champion until the town insists on a real contest.",
  "kind": "brief",
  "scope": "project",
  "tags": [
   "small-town",
   "identity",
   "crowd"
  ],
  "patch": [
   {
    "op": "story",
    "field": "premise",
    "text": "{lead}, a retired amateur, is asked to impersonate an absent champion until the town insists on a real contest."
   },
   {
    "op": "story",
    "field": "logline",
    "text": "To save the town's centenary, retired amateur {lead} agrees to stand in for a champion who never arrived, and is believed so well that the town arranges a real match."
   },
   {
    "op": "story",
    "field": "stakes",
    "text": "The contest is on Saturday, the whole town has money on it, and {lead} hasn't competed in thirty years."
   },
   {
    "op": "cast",
    "parts": [
     {
      "slot": "lead",
      "name": "{lead}",
      "size": "lead",
      "wants": "To not be found out before Sunday."
     }
    ]
   },
   {
    "op": "beats",
    "beats": [
     {
      "place": "Railway Platform",
      "intExt": "EXT",
      "time": "DAY",
      "objective": "The champion is not on the train, and the welcome party is waiting.",
      "minutes": 3,
      "crowd": 30,
      "with": [
       "lead"
      ]
     },
     {
      "place": "Town Square",
      "intExt": "EXT",
      "time": "DAY",
      "objective": "{lead} is cheered as someone else.",
      "minutes": 3,
      "crowd": 50,
      "with": [
       "lead"
      ]
     },
     {
      "place": "Back Room",
      "intExt": "INT",
      "time": "NIGHT",
      "objective": "Training, in secret, with the one person who knows.",
      "minutes": 3,
      "with": [
       "lead"
      ]
     },
     {
      "place": "Town Square",
      "intExt": "EXT",
      "time": "DAY",
      "objective": "The contest.",
      "minutes": 3,
      "crowd": 80,
      "stunts": "A sporting contest played for real",
      "with": [
       "lead"
      ]
     }
    ]
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)",
   "projects.ts deriveRequirements (only for the scenes you add)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do",
   "tests/brief.test.ts::offered scenes are added only when ticked, and then make the work scenes make"
  ],
  "fits": {
   "genres": [
    "comedy",
    "sports",
    "tragicomedy"
   ]
  },
  "slots": [
   {
    "key": "lead",
    "label": "The Stand-In's Name",
    "suggest": "Hollis Grange"
   }
  ]
 },
 {
  "id": "conflict.001",
  "v": 1,
  "field": "conflict",
  "label": "Duty Versus Loyalty",
  "text": "Two legitimate commitments cannot both be kept.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "story",
    "field": "conflict",
    "text": "Duty Versus Loyalty: two legitimate commitments cannot both be kept."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "ending_route.001",
  "v": 1,
  "field": "ending",
  "label": "Costly Victory",
  "text": "The goal is achieved with a persistent consequence.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "story",
    "field": "ending",
    "text": "Costly Victory: the goal is achieved with a persistent consequence."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "character_goal.001",
  "v": 1,
  "field": "character-goal",
  "label": "Protect A Dependent",
  "text": "A specific person needs protection from a defined threat.",
  "kind": "brief",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "character",
    "field": "wants",
    "text": "A specific person needs protection from a defined threat."
   }
  ],
  "consumers": [
   "the character sheet and the casting breakdown (casting-notes.ts)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "conflict.002",
  "v": 1,
  "field": "conflict",
  "label": "Access Denied",
  "text": "The needed place or information is controlled by another party.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "story",
    "field": "conflict",
    "text": "Access Denied: the needed place or information is controlled by another party."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "ending_route.002",
  "v": 1,
  "field": "ending",
  "label": "Partial Rescue",
  "text": "Some objectives succeed while another remains unresolved.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "story",
    "field": "ending",
    "text": "Partial Rescue: some objectives succeed while another remains unresolved."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "character_goal.002",
  "v": 1,
  "field": "character-goal",
  "label": "Recover A Lost Record",
  "text": "Find a record whose contents change an important decision.",
  "kind": "brief",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "character",
    "field": "wants",
    "text": "Find a record whose contents change an important decision."
   }
  ],
  "consumers": [
   "the character sheet and the casting breakdown (casting-notes.ts)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "conflict.003",
  "v": 1,
  "field": "conflict",
  "label": "Competing Deadlines",
  "text": "Time-sensitive goals require a genuine tradeoff.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "story",
    "field": "conflict",
    "text": "Competing Deadlines: time-sensitive goals require a genuine tradeoff."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "ending_route.003",
  "v": 1,
  "field": "ending",
  "label": "Reconciliation",
  "text": "Resolve a central relationship through an earned choice.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "story",
    "field": "ending",
    "text": "Reconciliation: resolve a central relationship through an earned choice."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "character_goal.003",
  "v": 1,
  "field": "character-goal",
  "label": "Keep A Promise",
  "text": "Fulfill an established commitment despite its increasing cost.",
  "kind": "brief",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "character",
    "field": "wants",
    "text": "Fulfill an established commitment despite its increasing cost."
   }
  ],
  "consumers": [
   "the character sheet and the casting breakdown (casting-notes.ts)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "conflict.004",
  "v": 1,
  "field": "conflict",
  "label": "Scarce Resource",
  "text": "Different groups need the same limited resource.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "story",
    "field": "conflict",
    "text": "Scarce Resource: different groups need the same limited resource."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "ending_route.004",
  "v": 1,
  "field": "ending",
  "label": "Reversal Of Perspective",
  "text": "Earlier events acquire a supported new interpretation.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "story",
    "field": "ending",
    "text": "Reversal Of Perspective: earlier events acquire a supported new interpretation."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "character_goal.004",
  "v": 1,
  "field": "character-goal",
  "label": "Clear A Misunderstanding",
  "text": "Correct a specific false belief before consequences become permanent.",
  "kind": "brief",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "character",
    "field": "wants",
    "text": "Correct a specific false belief before consequences become permanent."
   }
  ],
  "consumers": [
   "the character sheet and the casting breakdown (casting-notes.ts)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "conflict.005",
  "v": 1,
  "field": "conflict",
  "label": "Mistaken Evidence",
  "text": "A plausible interpretation points toward the wrong choice.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "story",
    "field": "conflict",
    "text": "Mistaken Evidence: a plausible interpretation points toward the wrong choice."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "ending_route.005",
  "v": 1,
  "field": "ending",
  "label": "Ambiguous Escape",
  "text": "Leave a deliberately bounded uncertainty.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "story",
    "field": "ending",
    "text": "Ambiguous Escape: leave a deliberately bounded uncertainty."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "character_goal.005",
  "v": 1,
  "field": "character-goal",
  "label": "Complete A Journey",
  "text": "Reach a destination with a meaningful constraint.",
  "kind": "brief",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "character",
    "field": "wants",
    "text": "Reach a destination with a meaningful constraint."
   }
  ],
  "consumers": [
   "the character sheet and the casting breakdown (casting-notes.ts)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "conflict.006",
  "v": 1,
  "field": "conflict",
  "label": "Broken Agreement",
  "text": "A prior promise now conflicts with immediate needs.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "story",
    "field": "conflict",
    "text": "Broken Agreement: a prior promise now conflicts with immediate needs."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "ending_route.006",
  "v": 1,
  "field": "ending",
  "label": "Collective Solution",
  "text": "Several established contributions resolve the obstacle.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "story",
    "field": "ending",
    "text": "Collective Solution: several established contributions resolve the obstacle."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "character_goal.006",
  "v": 1,
  "field": "character-goal",
  "label": "Build A Partnership",
  "text": "Earn cooperation through choices rather than a single speech.",
  "kind": "brief",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "character",
    "field": "wants",
    "text": "Earn cooperation through choices rather than a single speech."
   }
  ],
  "consumers": [
   "the character sheet and the casting breakdown (casting-notes.ts)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "conflict.007",
  "v": 1,
  "field": "conflict",
  "label": "Unreliable Infrastructure",
  "text": "Essential systems fail in a defined, consistent way.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "story",
    "field": "conflict",
    "text": "Unreliable Infrastructure: essential systems fail in a defined, consistent way."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "ending_route.007",
  "v": 1,
  "field": "ending",
  "label": "Tragic Recognition",
  "text": "The protagonist understands the cost too late.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "story",
    "field": "ending",
    "text": "Tragic Recognition: the protagonist understands the cost too late."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "character_goal.007",
  "v": 1,
  "field": "character-goal",
  "label": "Repair A Community Resource",
  "text": "Restore something that different people depend on.",
  "kind": "brief",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "character",
    "field": "wants",
    "text": "Restore something that different people depend on."
   }
  ],
  "consumers": [
   "the character sheet and the casting breakdown (casting-notes.ts)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "conflict.008",
  "v": 1,
  "field": "conflict",
  "label": "Public Versus Private Goal",
  "text": "A visible responsibility conflicts with a hidden personal aim.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "story",
    "field": "conflict",
    "text": "Public Versus Private Goal: a visible responsibility conflicts with a hidden personal aim."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "ending_route.008",
  "v": 1,
  "field": "ending",
  "label": "New Responsibility",
  "text": "Success creates a credible next obligation.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "story",
    "field": "ending",
    "text": "New Responsibility: success creates a credible next obligation."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "character_goal.008",
  "v": 1,
  "field": "character-goal",
  "label": "Expose A Deception",
  "text": "Obtain and reveal evidence at a personal cost.",
  "kind": "brief",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "character",
    "field": "wants",
    "text": "Obtain and reveal evidence at a personal cost."
   }
  ],
  "consumers": [
   "the character sheet and the casting breakdown (casting-notes.ts)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "conflict.009",
  "v": 1,
  "field": "conflict",
  "label": "Unequal Information",
  "text": "Different characters act on different partial truths.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "story",
    "field": "conflict",
    "text": "Unequal Information: different characters act on different partial truths."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "ending_route.009",
  "v": 1,
  "field": "ending",
  "label": "Cycle Broken",
  "text": "A repeated behavior changes through a consequential decision.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "story",
    "field": "ending",
    "text": "Cycle Broken: a repeated behavior changes through a consequential decision."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "character_goal.009",
  "v": 1,
  "field": "character-goal",
  "label": "Leave A Harmful Situation",
  "text": "Secure a viable escape and support.",
  "kind": "brief",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "character",
    "field": "wants",
    "text": "Secure a viable escape and support."
   }
  ],
  "consumers": [
   "the character sheet and the casting breakdown (casting-notes.ts)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "conflict.010",
  "v": 1,
  "field": "conflict",
  "label": "Cost Of Truth",
  "text": "Revealing the truth creates a concrete risk.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "story",
    "field": "conflict",
    "text": "Cost Of Truth: revealing the truth creates a concrete risk."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "ending_route.010",
  "v": 1,
  "field": "ending",
  "label": "False Resolution",
  "text": "A seemingly complete solution exposes a prepared remaining problem.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "story",
    "field": "ending",
    "text": "False Resolution: a seemingly complete solution exposes a prepared remaining problem."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "character_goal.010",
  "v": 1,
  "field": "character-goal",
  "label": "Win A Fair Chance",
  "text": "Overcome a concrete barrier to participation.",
  "kind": "brief",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "character",
    "field": "wants",
    "text": "Overcome a concrete barrier to participation."
   }
  ],
  "consumers": [
   "the character sheet and the casting breakdown (casting-notes.ts)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "comedy_treatment.001",
  "v": 1,
  "field": "tone",
  "label": "Mistaken Identity",
  "text": "Build escalating misunderstandings around conflicting assumptions.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "tone",
    "text": "Mistaken Identity"
   },
   {
    "op": "story",
    "field": "intendedExperience",
    "text": "Build escalating misunderstandings around conflicting assumptions."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ],
  "fits": {
   "genres": [
    "comedy",
    "romantic-comedy",
    "black-comedy",
    "satire",
    "farce",
    "slapstick",
    "buddy-comedy",
    "mockumentary",
    "tragicomedy",
    "horror-comedy"
   ]
  }
 },
 {
  "id": "comedy_treatment.002",
  "v": 1,
  "field": "tone",
  "label": "Workplace Farce",
  "text": "Set intersecting goals against one constrained working space.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "tone",
    "text": "Workplace Farce"
   },
   {
    "op": "story",
    "field": "intendedExperience",
    "text": "Set intersecting goals against one constrained working space."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ],
  "fits": {
   "genres": [
    "comedy",
    "romantic-comedy",
    "black-comedy",
    "satire",
    "farce",
    "slapstick",
    "buddy-comedy",
    "mockumentary",
    "tragicomedy",
    "horror-comedy"
   ]
  }
 },
 {
  "id": "comedy_treatment.003",
  "v": 1,
  "field": "tone",
  "label": "Deadpan Absurdity",
  "text": "Keep performances restrained while circumstances grow implausible.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "tone",
    "text": "Deadpan Absurdity"
   },
   {
    "op": "story",
    "field": "intendedExperience",
    "text": "Keep performances restrained while circumstances grow implausible."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ],
  "fits": {
   "genres": [
    "comedy",
    "romantic-comedy",
    "black-comedy",
    "satire",
    "farce",
    "slapstick",
    "buddy-comedy",
    "mockumentary",
    "tragicomedy",
    "horror-comedy"
   ]
  }
 },
 {
  "id": "comedy_treatment.004",
  "v": 1,
  "field": "physical-comedy",
  "label": "Physical Slapstick",
  "text": "A physical gag in the scenes you choose: rehearsed, with a coordinator on the day and a spare costume.",
  "kind": "mechanical",
  "scope": "scene",
  "tags": [],
  "patch": [
   {
    "op": "stunt",
    "text": "A rehearsed physical gag"
   }
  ],
  "consumers": [
   "projects.ts deriveRequirements (stunt)",
   "production/schedule.ts sceneComplexity",
   "hiring.ts neededRoles (stunt coordinator)",
   "looks.ts costumeCopies"
  ],
  "tests": [
   "tests/brief.test.ts::a physical gag on a chosen scene makes a stunt of it, with its rehearsal, coordinator and doubled costume"
  ],
  "fits": {
   "genres": [
    "comedy",
    "romantic-comedy",
    "black-comedy",
    "satire",
    "farce",
    "slapstick",
    "buddy-comedy",
    "mockumentary",
    "tragicomedy",
    "horror-comedy"
   ]
  }
 },
 {
  "id": "comedy_treatment.005",
  "v": 1,
  "field": "tone",
  "label": "Social Satire",
  "text": "Expose incentives through choices and consequences rather than speech alone.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "tone",
    "text": "Social Satire"
   },
   {
    "op": "story",
    "field": "intendedExperience",
    "text": "Expose incentives through choices and consequences rather than speech alone."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ],
  "fits": {
   "genres": [
    "comedy",
    "romantic-comedy",
    "black-comedy",
    "satire",
    "farce",
    "slapstick",
    "buddy-comedy",
    "mockumentary",
    "tragicomedy",
    "horror-comedy"
   ]
  }
 },
 {
  "id": "comedy_treatment.006",
  "v": 1,
  "field": "tone",
  "label": "Buddy Friction",
  "text": "Use two incompatible problem-solving methods and changing trust.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "tone",
    "text": "Buddy Friction"
   },
   {
    "op": "story",
    "field": "intendedExperience",
    "text": "Use two incompatible problem-solving methods and changing trust."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ],
  "fits": {
   "genres": [
    "comedy",
    "romantic-comedy",
    "black-comedy",
    "satire",
    "farce",
    "slapstick",
    "buddy-comedy",
    "mockumentary",
    "tragicomedy",
    "horror-comedy"
   ]
  }
 },
 {
  "id": "comedy_treatment.007",
  "v": 1,
  "field": "tone",
  "label": "Romantic Misalignment",
  "text": "Give leads understandable but conflicting relationship expectations.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "tone",
    "text": "Romantic Misalignment"
   },
   {
    "op": "story",
    "field": "intendedExperience",
    "text": "Give leads understandable but conflicting relationship expectations."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ],
  "fits": {
   "genres": [
    "comedy",
    "romantic-comedy",
    "black-comedy",
    "satire",
    "farce",
    "slapstick",
    "buddy-comedy",
    "mockumentary",
    "tragicomedy",
    "horror-comedy"
   ]
  }
 },
 {
  "id": "comedy_treatment.008",
  "v": 1,
  "field": "tone",
  "label": "Dark Comic Escalation",
  "text": "Let increasingly serious consequences collide with flawed coping.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "tone",
    "text": "Dark Comic Escalation"
   },
   {
    "op": "story",
    "field": "intendedExperience",
    "text": "Let increasingly serious consequences collide with flawed coping."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ],
  "fits": {
   "genres": [
    "comedy",
    "romantic-comedy",
    "black-comedy",
    "satire",
    "farce",
    "slapstick",
    "buddy-comedy",
    "mockumentary",
    "tragicomedy",
    "horror-comedy"
   ]
  }
 },
 {
  "id": "comedy_treatment.009",
  "v": 1,
  "field": "tone",
  "label": "Comedy Of Manners",
  "text": "Use social conventions, status and misunderstandings in a specific setting.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "tone",
    "text": "Comedy Of Manners"
   },
   {
    "op": "story",
    "field": "intendedExperience",
    "text": "Use social conventions, status and misunderstandings in a specific setting."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ],
  "fits": {
   "genres": [
    "comedy",
    "romantic-comedy",
    "black-comedy",
    "satire",
    "farce",
    "slapstick",
    "buddy-comedy",
    "mockumentary",
    "tragicomedy",
    "horror-comedy"
   ]
  }
 },
 {
  "id": "comedy_treatment.010",
  "v": 1,
  "field": "tone",
  "label": "Mockumentary Ensemble",
  "text": "Use staged interview and observed-scene grammar in a fictional narrative.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "tone",
    "text": "Mockumentary Ensemble"
   },
   {
    "op": "story",
    "field": "intendedExperience",
    "text": "Use staged interview and observed-scene grammar in a fictional narrative."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ],
  "fits": {
   "genres": [
    "comedy",
    "romantic-comedy",
    "black-comedy",
    "satire",
    "farce",
    "slapstick",
    "buddy-comedy",
    "mockumentary",
    "tragicomedy",
    "horror-comedy"
   ]
  }
 },
 {
  "id": "comedy_treatment.011",
  "v": 1,
  "field": "tone",
  "label": "Fish Out Of Water",
  "text": "Place a capable protagonist in unfamiliar rules without mocking identity.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "tone",
    "text": "Fish Out Of Water"
   },
   {
    "op": "story",
    "field": "intendedExperience",
    "text": "Place a capable protagonist in unfamiliar rules without mocking identity."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ],
  "fits": {
   "genres": [
    "comedy",
    "romantic-comedy",
    "black-comedy",
    "satire",
    "farce",
    "slapstick",
    "buddy-comedy",
    "mockumentary",
    "tragicomedy",
    "horror-comedy"
   ]
  }
 },
 {
  "id": "comedy_treatment.012",
  "v": 1,
  "field": "tone",
  "label": "Backstage Chaos",
  "text": "Intersect performance deadlines, preparation and competing responsibilities.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "tone",
    "text": "Backstage Chaos"
   },
   {
    "op": "story",
    "field": "intendedExperience",
    "text": "Intersect performance deadlines, preparation and competing responsibilities."
   }
  ],
  "consumers": [
   "script-effects.ts DOCUMENTS (the Pitch and the Treatment are made of these fields)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ],
  "fits": {
   "genres": [
    "comedy",
    "romantic-comedy",
    "black-comedy",
    "satire",
    "farce",
    "slapstick",
    "buddy-comedy",
    "mockumentary",
    "tragicomedy",
    "horror-comedy"
   ]
  }
 },
 {
  "id": "creature_rule.001",
  "v": 1,
  "field": "world-rule",
  "label": "Slow Reanimated",
  "text": "Slow movement and persistent pursuit; movement does not itself select makeup.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "rule",
    "rule": "The returned move slowly and never stop.",
    "limit": "They can be outwalked, never outwaited."
   }
  ],
  "consumers": [
   "season.ts sharedFactImpact (a changed rule previews the scenes that rely on it)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ],
  "fits": {
   "genres": [
    "horror",
    "zombie",
    "science-fiction",
    "fantasy",
    "horror-comedy"
   ]
  }
 },
 {
  "id": "creature_rule.002",
  "v": 1,
  "field": "world-rule",
  "label": "Fast Infected",
  "text": "Fast pursuit motivates selected stunt and chase requirements.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "rule",
    "rule": "The infected run.",
    "limit": "Nobody on foot outpaces one for long."
   }
  ],
  "consumers": [
   "season.ts sharedFactImpact (a changed rule previews the scenes that rely on it)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ],
  "fits": {
   "genres": [
    "horror",
    "zombie",
    "science-fiction",
    "fantasy",
    "horror-comedy"
   ]
  }
 },
 {
  "id": "creature_rule.003",
  "v": 1,
  "field": "world-rule",
  "label": "Sound-Drawn",
  "text": "Sound attracts threats and informs scene obstacles and sound cues.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "rule",
    "rule": "Sound draws them.",
    "limit": "Silence is safe; a dropped tool is not."
   }
  ],
  "consumers": [
   "season.ts sharedFactImpact (a changed rule previews the scenes that rely on it)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ],
  "fits": {
   "genres": [
    "horror",
    "zombie",
    "science-fiction",
    "fantasy",
    "horror-comedy"
   ]
  }
 },
 {
  "id": "creature_rule.004",
  "v": 1,
  "field": "world-rule",
  "label": "Light-Averse",
  "text": "Light changes creature behavior and informs selected lighting beats.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "rule",
    "rule": "They turn from light.",
    "limit": "Darkness is theirs; a working lamp is a wall."
   }
  ],
  "consumers": [
   "season.ts sharedFactImpact (a changed rule previews the scenes that rely on it)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ],
  "fits": {
   "genres": [
    "horror",
    "zombie",
    "science-fiction",
    "fantasy",
    "horror-comedy"
   ]
  }
 },
 {
  "id": "creature_rule.005",
  "v": 1,
  "field": "world-rule",
  "label": "Memory Echoes",
  "text": "Creatures repeat traces of former routines; creates character and performance notes.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "rule",
    "rule": "They repeat traces of who they were.",
    "limit": "A routine can be predicted, and used."
   }
  ],
  "consumers": [
   "season.ts sharedFactImpact (a changed rule previews the scenes that rely on it)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ],
  "fits": {
   "genres": [
    "horror",
    "zombie",
    "science-fiction",
    "fantasy",
    "horror-comedy"
   ]
  }
 },
 {
  "id": "creature_rule.006",
  "v": 1,
  "field": "world-rule",
  "label": "Swarm Behavior",
  "text": "Coordinated crowd action requires chosen crowd/effects methods.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "rule",
    "rule": "They move as one.",
    "limit": "What one finds, all find."
   }
  ],
  "consumers": [
   "season.ts sharedFactImpact (a changed rule previews the scenes that rely on it)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ],
  "fits": {
   "genres": [
    "horror",
    "zombie",
    "science-fiction",
    "fantasy",
    "horror-comedy"
   ]
  }
 },
 {
  "id": "creature_rule.007",
  "v": 1,
  "field": "world-rule",
  "label": "Limited Outbreak",
  "text": "Constrain the outbreak footprint and selected crowd scale.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "rule",
    "rule": "The outbreak is confined to one place.",
    "limit": "Beyond its edge, nobody believes it."
   }
  ],
  "consumers": [
   "season.ts sharedFactImpact (a changed rule previews the scenes that rely on it)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ],
  "fits": {
   "genres": [
    "horror",
    "zombie",
    "science-fiction",
    "fantasy",
    "horror-comedy"
   ]
  }
 },
 {
  "id": "creature_rule.010",
  "v": 1,
  "field": "world-rule",
  "label": "Environmental Dormancy",
  "text": "Define a specific fictional environmental trigger and its scene usage.",
  "kind": "brief",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "rule",
    "rule": "They sleep until a specific change in their surroundings wakes them.",
    "limit": "The trigger is one thing, and the story names it."
   }
  ],
  "consumers": [
   "season.ts sharedFactImpact (a changed rule previews the scenes that rely on it)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ],
  "fits": {
   "genres": [
    "horror",
    "zombie",
    "science-fiction",
    "fantasy",
    "horror-comedy"
   ]
  }
 },
 {
  "id": "creature_rule.008",
  "v": 1,
  "field": "makeup",
  "label": "Progressive Transformation",
  "text": "They change by stages: three appearance states, each matched from scene to scene and, for appliances, each its own build.",
  "kind": "mechanical",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "look",
    "states": 3
   }
  ],
  "consumers": [
   "looks.ts statesOf, costumeCopies",
   "production/tasks.ts buildTasks (a build for each state)"
  ],
  "tests": [
   "tests/looks.test.ts::adds its own tests, builds, crew and daily materials for that character, and leaves every other task as it was",
   "tests/zombie.test.ts::changing one choice changes its own consumers and nothing else"
  ]
 },
 {
  "id": "creature_rule.009",
  "v": 1,
  "field": "makeup",
  "label": "Human Disguise",
  "text": "They pass as human until a reveal: two appearance states, before and after, kept straight across the shoot.",
  "kind": "mechanical",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "look",
    "states": 2
   }
  ],
  "consumers": [
   "looks.ts statesOf, costumeCopies",
   "production/tasks.ts buildTasks (a build for each state)"
  ],
  "tests": [
   "tests/looks.test.ts::adds its own tests, builds, crew and daily materials for that character, and leaves every other task as it was",
   "tests/zombie.test.ts::changing one choice changes its own consumers and nothing else"
  ]
 },
 {
  "id": "makeup_method.001",
  "v": 1,
  "field": "makeup",
  "label": "Minimal Character Makeup",
  "text": "Simple recurring look with continuity records.",
  "kind": "mechanical",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "look",
    "makeup": "character"
   }
  ],
  "consumers": [
   "looks.ts makeupShare, makeupDayCost",
   "production/tasks.ts buildTasks (tests and builds)",
   "production/schedule.ts groupShootDays",
   "production/shoot.ts runShootDay",
   "callsheet.ts callSheet",
   "hiring.ts neededRoles"
  ],
  "tests": [
   "tests/looks.test.ts::adds its own tests, builds, crew and daily materials for that character, and leaves every other task as it was",
   "tests/zombie.test.ts::changing one choice changes its own consumers and nothing else"
  ],
  "fits": {
   "media": [
    "live-action",
    "hybrid"
   ]
  },
  "excludes": [
   "makeup_method.002",
   "makeup_method.003",
   "makeup_method.004",
   "makeup_method.005",
   "makeup_method.006",
   "makeup_method.007",
   "makeup_method.008",
   "makeup_method.009"
  ]
 },
 {
  "id": "makeup_method.002",
  "v": 1,
  "field": "makeup",
  "label": "Aging Appliances",
  "text": "Tests, application/removal and matched continuity states.",
  "kind": "mechanical",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "look",
    "makeup": "aging"
   }
  ],
  "consumers": [
   "looks.ts makeupShare, makeupDayCost",
   "production/tasks.ts buildTasks (tests and builds)",
   "production/schedule.ts groupShootDays",
   "production/shoot.ts runShootDay",
   "callsheet.ts callSheet",
   "hiring.ts neededRoles"
  ],
  "tests": [
   "tests/looks.test.ts::adds its own tests, builds, crew and daily materials for that character, and leaves every other task as it was",
   "tests/zombie.test.ts::changing one choice changes its own consumers and nothing else"
  ],
  "fits": {
   "media": [
    "live-action",
    "hybrid"
   ]
  },
  "excludes": [
   "makeup_method.001",
   "makeup_method.003",
   "makeup_method.004",
   "makeup_method.005",
   "makeup_method.006",
   "makeup_method.007",
   "makeup_method.008",
   "makeup_method.009"
  ]
 },
 {
  "id": "makeup_method.003",
  "v": 1,
  "field": "makeup",
  "label": "Full Creature Appliances",
  "text": "Specialist fabrication, fittings and longer preparation.",
  "kind": "mechanical",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "look",
    "makeup": "creature"
   }
  ],
  "consumers": [
   "looks.ts makeupShare, makeupDayCost",
   "production/tasks.ts buildTasks (tests and builds)",
   "production/schedule.ts groupShootDays",
   "production/shoot.ts runShootDay",
   "callsheet.ts callSheet",
   "hiring.ts neededRoles"
  ],
  "tests": [
   "tests/looks.test.ts::adds its own tests, builds, crew and daily materials for that character, and leaves every other task as it was",
   "tests/zombie.test.ts::changing one choice changes its own consumers and nothing else"
  ],
  "fits": {
   "media": [
    "live-action",
    "hybrid"
   ]
  },
  "excludes": [
   "makeup_method.001",
   "makeup_method.002",
   "makeup_method.004",
   "makeup_method.005",
   "makeup_method.006",
   "makeup_method.007",
   "makeup_method.008",
   "makeup_method.009"
  ]
 },
 {
  "id": "makeup_method.004",
  "v": 1,
  "field": "makeup",
  "label": "Partial Facial Appliances",
  "text": "Targeted facial changes with movement tests.",
  "kind": "mechanical",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "look",
    "makeup": "partial"
   }
  ],
  "consumers": [
   "looks.ts makeupShare, makeupDayCost",
   "production/tasks.ts buildTasks (tests and builds)",
   "production/schedule.ts groupShootDays",
   "production/shoot.ts runShootDay",
   "callsheet.ts callSheet",
   "hiring.ts neededRoles"
  ],
  "tests": [
   "tests/looks.test.ts::adds its own tests, builds, crew and daily materials for that character, and leaves every other task as it was",
   "tests/zombie.test.ts::changing one choice changes its own consumers and nothing else"
  ],
  "fits": {
   "media": [
    "live-action",
    "hybrid"
   ]
  },
  "excludes": [
   "makeup_method.001",
   "makeup_method.002",
   "makeup_method.003",
   "makeup_method.005",
   "makeup_method.006",
   "makeup_method.007",
   "makeup_method.008",
   "makeup_method.009"
  ]
 },
 {
  "id": "makeup_method.005",
  "v": 1,
  "field": "makeup",
  "label": "Painted Creature Look",
  "text": "Surface treatment with sweat/weather touch-up planning.",
  "kind": "mechanical",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "look",
    "makeup": "body-paint"
   }
  ],
  "consumers": [
   "looks.ts makeupShare, makeupDayCost",
   "production/tasks.ts buildTasks (tests and builds)",
   "production/schedule.ts groupShootDays",
   "production/shoot.ts runShootDay",
   "callsheet.ts callSheet",
   "hiring.ts neededRoles"
  ],
  "tests": [
   "tests/looks.test.ts::adds its own tests, builds, crew and daily materials for that character, and leaves every other task as it was",
   "tests/zombie.test.ts::changing one choice changes its own consumers and nothing else"
  ],
  "fits": {
   "media": [
    "live-action",
    "hybrid"
   ]
  },
  "excludes": [
   "makeup_method.001",
   "makeup_method.002",
   "makeup_method.003",
   "makeup_method.004",
   "makeup_method.006",
   "makeup_method.007",
   "makeup_method.008",
   "makeup_method.009"
  ]
 },
 {
  "id": "makeup_method.006",
  "v": 1,
  "field": "makeup",
  "label": "Wearable Creature Mask",
  "text": "Mask fitting, sightline and movement checks.",
  "kind": "mechanical",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "look",
    "makeup": "mask"
   }
  ],
  "consumers": [
   "looks.ts makeupShare, makeupDayCost",
   "production/tasks.ts buildTasks (tests and builds)",
   "production/schedule.ts groupShootDays",
   "production/shoot.ts runShootDay",
   "callsheet.ts callSheet",
   "hiring.ts neededRoles"
  ],
  "tests": [
   "tests/looks.test.ts::adds its own tests, builds, crew and daily materials for that character, and leaves every other task as it was",
   "tests/zombie.test.ts::changing one choice changes its own consumers and nothing else"
  ],
  "fits": {
   "media": [
    "live-action",
    "hybrid"
   ]
  },
  "excludes": [
   "makeup_method.001",
   "makeup_method.002",
   "makeup_method.003",
   "makeup_method.004",
   "makeup_method.005",
   "makeup_method.007",
   "makeup_method.008",
   "makeup_method.009"
  ]
 },
 {
  "id": "makeup_method.007",
  "v": 1,
  "field": "makeup",
  "label": "Practical With Digital Cleanup",
  "text": "Physical application plus selected post cleanup shots.",
  "kind": "mechanical",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "look",
    "makeup": "cleanup"
   }
  ],
  "consumers": [
   "looks.ts makeupShare, makeupDayCost",
   "production/tasks.ts buildTasks (tests and builds)",
   "production/schedule.ts groupShootDays",
   "production/shoot.ts runShootDay",
   "callsheet.ts callSheet",
   "hiring.ts neededRoles"
  ],
  "tests": [
   "tests/looks.test.ts::adds its own tests, builds, crew and daily materials for that character, and leaves every other task as it was",
   "tests/zombie.test.ts::changing one choice changes its own consumers and nothing else"
  ],
  "fits": {
   "media": [
    "live-action",
    "hybrid"
   ]
  },
  "excludes": [
   "makeup_method.001",
   "makeup_method.002",
   "makeup_method.003",
   "makeup_method.004",
   "makeup_method.005",
   "makeup_method.006",
   "makeup_method.008",
   "makeup_method.009"
  ]
 },
 {
  "id": "makeup_method.008",
  "v": 1,
  "field": "makeup",
  "label": "Digital Creature Replacement",
  "text": "Tracking/performance reference and post work instead of physical final appearance.",
  "kind": "mechanical",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "look",
    "makeup": "digital"
   }
  ],
  "consumers": [
   "looks.ts makeupShare, makeupDayCost",
   "production/tasks.ts buildTasks (tests and builds)",
   "production/schedule.ts groupShootDays",
   "production/shoot.ts runShootDay",
   "callsheet.ts callSheet",
   "hiring.ts neededRoles"
  ],
  "tests": [
   "tests/looks.test.ts::adds its own tests, builds, crew and daily materials for that character, and leaves every other task as it was",
   "tests/zombie.test.ts::changing one choice changes its own consumers and nothing else"
  ],
  "fits": {
   "media": [
    "live-action",
    "hybrid"
   ]
  },
  "excludes": [
   "makeup_method.001",
   "makeup_method.002",
   "makeup_method.003",
   "makeup_method.004",
   "makeup_method.005",
   "makeup_method.006",
   "makeup_method.007",
   "makeup_method.009"
  ]
 },
 {
  "id": "makeup_method.009",
  "v": 1,
  "field": "makeup",
  "label": "Progressive Wound States",
  "text": "Scene-specific injury states and reset requirements.",
  "kind": "mechanical",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "look",
    "makeup": "wounds",
    "states": 3
   }
  ],
  "consumers": [
   "looks.ts makeupShare, makeupDayCost",
   "production/tasks.ts buildTasks (tests and builds)",
   "production/schedule.ts groupShootDays",
   "production/shoot.ts runShootDay",
   "callsheet.ts callSheet",
   "hiring.ts neededRoles"
  ],
  "tests": [
   "tests/looks.test.ts::adds its own tests, builds, crew and daily materials for that character, and leaves every other task as it was",
   "tests/zombie.test.ts::changing one choice changes its own consumers and nothing else"
  ],
  "fits": {
   "media": [
    "live-action",
    "hybrid"
   ]
  },
  "excludes": [
   "makeup_method.001",
   "makeup_method.002",
   "makeup_method.003",
   "makeup_method.004",
   "makeup_method.005",
   "makeup_method.006",
   "makeup_method.007",
   "makeup_method.008"
  ]
 },
 {
  "id": "makeup_method.010",
  "v": 1,
  "field": "makeup",
  "label": "Puppet Surface Finish",
  "text": "A puppet's finish is part of building the puppet: there is no makeup chair, and this adds nothing to it.",
  "kind": "reference",
  "scope": "character",
  "tags": [],
  "patch": [],
  "consumers": [
   "production/tasks.ts buildTasks (puppet fabrication finishes the puppet; no performer is made up)"
  ],
  "tests": [
   "tests/looks.test.ts::has no chair, no fittings and no appliances, whatever the characters' looks say"
  ],
  "fits": {
   "media": [
    "animation"
   ]
  }
 },
 {
  "id": "wardrobe_strategy.001",
  "v": 1,
  "field": "wardrobe",
  "label": "Contemporary Sourced",
  "text": "Source garments fitting the chosen locale and role.",
  "kind": "mechanical",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "look",
    "wardrobe": "bought"
   }
  ],
  "consumers": [
   "looks.ts costumeCopies, wardrobeMismatch",
   "production/tasks.ts buildTasks (costume and fittings)"
  ],
  "tests": [
   "tests/looks.test.ts::is its own work, in the copies its states and rough scenes need, and leaves the others on the shared costume task"
  ],
  "fits": {
   "media": [
    "live-action",
    "hybrid"
   ]
  }
 },
 {
  "id": "wardrobe_strategy.002",
  "v": 1,
  "field": "wardrobe",
  "label": "Period Rental",
  "text": "Research, availability, fittings, returns and damage terms.",
  "kind": "mechanical",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "look",
    "wardrobe": "rental"
   }
  ],
  "consumers": [
   "looks.ts costumeCopies, wardrobeMismatch",
   "production/tasks.ts buildTasks (costume and fittings)"
  ],
  "tests": [
   "tests/looks.test.ts::is its own work, in the copies its states and rough scenes need, and leaves the others on the shared costume task"
  ],
  "fits": {
   "media": [
    "live-action",
    "hybrid"
   ]
  }
 },
 {
  "id": "wardrobe_strategy.003",
  "v": 1,
  "field": "wardrobe",
  "label": "Custom Period Build",
  "text": "Design, patterning, fabrication and fittings.",
  "kind": "mechanical",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "look",
    "wardrobe": "build"
   }
  ],
  "consumers": [
   "looks.ts costumeCopies, wardrobeMismatch",
   "production/tasks.ts buildTasks (costume and fittings)"
  ],
  "tests": [
   "tests/looks.test.ts::is its own work, in the copies its states and rough scenes need, and leaves the others on the shared costume task"
  ],
  "fits": {
   "media": [
    "live-action",
    "hybrid"
   ]
  }
 },
 {
  "id": "wardrobe_strategy.004",
  "v": 1,
  "field": "wardrobe",
  "label": "Workwear Ensemble",
  "text": "Work clothes for the job the character does: bought, in sizes that fit, with copies where the scenes are rough.",
  "kind": "mechanical",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "look",
    "wardrobe": "bought"
   }
  ],
  "consumers": [
   "looks.ts costumeCopies, wardrobeMismatch",
   "production/tasks.ts buildTasks (costume and fittings)"
  ],
  "tests": [
   "tests/looks.test.ts::is its own work, in the copies its states and rough scenes need, and leaves the others on the shared costume task"
  ],
  "fits": {
   "media": [
    "live-action",
    "hybrid"
   ]
  }
 },
 {
  "id": "wardrobe_strategy.005",
  "v": 1,
  "field": "wardrobe",
  "label": "Formal Occasion",
  "text": "Clothes for one occasion, hired and returned.",
  "kind": "mechanical",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "look",
    "wardrobe": "rental"
   }
  ],
  "consumers": [
   "looks.ts costumeCopies, wardrobeMismatch",
   "production/tasks.ts buildTasks (costume and fittings)"
  ],
  "tests": [
   "tests/looks.test.ts::is its own work, in the copies its states and rough scenes need, and leaves the others on the shared costume task"
  ],
  "fits": {
   "media": [
    "live-action",
    "hybrid"
   ]
  }
 },
 {
  "id": "wardrobe_strategy.006",
  "v": 1,
  "field": "wardrobe",
  "label": "Action Duplicates",
  "text": "A matching replacement for each look, for scenes that damage a costume.",
  "kind": "mechanical",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "look",
    "states": 2
   }
  ],
  "consumers": [
   "looks.ts costumeCopies, wardrobeMismatch",
   "production/tasks.ts buildTasks (costume and fittings)"
  ],
  "tests": [
   "tests/looks.test.ts::is its own work, in the copies its states and rough scenes need, and leaves the others on the shared costume task"
  ],
  "fits": {
   "media": [
    "live-action",
    "hybrid"
   ]
  }
 },
 {
  "id": "wardrobe_strategy.007",
  "v": 1,
  "field": "wardrobe",
  "label": "Weathered Survival",
  "text": "Clothes that wear out through the story: three levels of wear, kept in scene order.",
  "kind": "mechanical",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "look",
    "wardrobe": "bought",
    "states": 3
   }
  ],
  "consumers": [
   "looks.ts costumeCopies, wardrobeMismatch",
   "production/tasks.ts buildTasks (costume and fittings)"
  ],
  "tests": [
   "tests/looks.test.ts::is its own work, in the copies its states and rough scenes need, and leaves the others on the shared costume task"
  ],
  "fits": {
   "media": [
    "live-action",
    "hybrid"
   ]
  }
 },
 {
  "id": "wardrobe_strategy.008",
  "v": 1,
  "field": "wardrobe",
  "label": "Creature Costume",
  "text": "A costume that makes a creature: built on the performer, tested for heat and for movement.",
  "kind": "mechanical",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "look",
    "wardrobe": "build"
   }
  ],
  "consumers": [
   "looks.ts costumeCopies, wardrobeMismatch",
   "production/tasks.ts buildTasks (costume and fittings)"
  ],
  "tests": [
   "tests/looks.test.ts::is its own work, in the copies its states and rough scenes need, and leaves the others on the shared costume task"
  ],
  "fits": {
   "media": [
    "live-action",
    "hybrid"
   ]
  }
 },
 {
  "id": "wardrobe_strategy.009",
  "v": 1,
  "field": "wardrobe",
  "label": "Miniature Wardrobe",
  "text": "A puppet's clothes are made to its scale when it is built, and fitted then: this adds nothing to that.",
  "kind": "reference",
  "scope": "character",
  "tags": [],
  "patch": [],
  "consumers": [
   "production/tasks.ts buildTasks (a puppet's costume is fitted when the puppet is made)"
  ],
  "tests": [
   "tests/looks.test.ts::has no chair, no fittings and no appliances, whatever the characters' looks say"
  ],
  "fits": {
   "media": [
    "animation"
   ]
  }
 },
 {
  "id": "wardrobe_strategy.010",
  "v": 1,
  "field": "style",
  "label": "Stylized Anachronism",
  "text": "Dress it out of its own time on purpose. A note for the departments: it changes no work and no date.",
  "kind": "reference",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "style",
    "era": "{era}"
   }
  ],
  "consumers": [
   "the Creative Brief on the Script page (a note for the departments)"
  ],
  "tests": [
   "tests/looks.test.ts::1986 made in 2026 is a period: research, and half as much costume work again; 2026 is neither; the look it borrows changes no work"
  ],
  "slots": [
   {
    "key": "era",
    "label": "The Period Whose Look It Borrows",
    "suggest": "The 1980s"
   }
  ]
 },
 {
  "id": "location_type.001",
  "v": 1,
  "field": "location",
  "label": "Market District",
  "text": "A scene at a market District, with 30 people in the background. Exterior, by day: scouted, booked and scheduled like any other.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "beats",
    "beats": [
     {
      "place": "{place}",
      "intExt": "EXT",
      "time": "DAY",
      "objective": "What happens here.",
      "minutes": 3,
      "crowd": 30
     }
    ]
   }
  ],
  "consumers": [
   "projects.ts deriveRequirements (location, crowd)",
   "production/schedule.ts groupShootDays",
   "locations.ts scoutedPlaces"
  ],
  "tests": [
   "tests/brief.test.ts::offered scenes are added only when ticked, and then make the work scenes make"
  ],
  "slots": [
   {
    "key": "place",
    "label": "The Place's Name In Your Story",
    "suggest": "Market District"
   }
  ]
 },
 {
  "id": "location_type.002",
  "v": 1,
  "field": "location",
  "label": "Rail Station",
  "text": "A scene at a rail Station, with 20 people in the background. Interior, by day: scouted, booked and scheduled like any other.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "beats",
    "beats": [
     {
      "place": "{place}",
      "intExt": "INT",
      "time": "DAY",
      "objective": "What happens here.",
      "minutes": 3,
      "crowd": 20
     }
    ]
   }
  ],
  "consumers": [
   "projects.ts deriveRequirements (location, crowd)",
   "production/schedule.ts groupShootDays",
   "locations.ts scoutedPlaces"
  ],
  "tests": [
   "tests/brief.test.ts::offered scenes are added only when ticked, and then make the work scenes make"
  ],
  "slots": [
   {
    "key": "place",
    "label": "The Place's Name In Your Story",
    "suggest": "Rail Station"
   }
  ]
 },
 {
  "id": "location_type.003",
  "v": 1,
  "field": "location",
  "label": "Coastal Settlement",
  "text": "A scene at a coastal Settlement. Exterior, by day: scouted, booked and scheduled like any other.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "beats",
    "beats": [
     {
      "place": "{place}",
      "intExt": "EXT",
      "time": "DAY",
      "objective": "What happens here.",
      "minutes": 3
     }
    ]
   }
  ],
  "consumers": [
   "projects.ts deriveRequirements (location, crowd)",
   "production/schedule.ts groupShootDays",
   "locations.ts scoutedPlaces"
  ],
  "tests": [
   "tests/brief.test.ts::offered scenes are added only when ticked, and then make the work scenes make"
  ],
  "slots": [
   {
    "key": "place",
    "label": "The Place's Name In Your Story",
    "suggest": "Harbour Front"
   }
  ]
 },
 {
  "id": "location_type.004",
  "v": 1,
  "field": "location",
  "label": "Mountain Road",
  "text": "A scene at a mountain Road. Exterior, by day: scouted, booked and scheduled like any other.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "beats",
    "beats": [
     {
      "place": "{place}",
      "intExt": "EXT",
      "time": "DAY",
      "objective": "What happens here.",
      "minutes": 3
     }
    ]
   }
  ],
  "consumers": [
   "projects.ts deriveRequirements (location, crowd)",
   "production/schedule.ts groupShootDays",
   "locations.ts scoutedPlaces"
  ],
  "tests": [
   "tests/brief.test.ts::offered scenes are added only when ticked, and then make the work scenes make"
  ],
  "slots": [
   {
    "key": "place",
    "label": "The Place's Name In Your Story",
    "suggest": "Mountain Road"
   }
  ]
 },
 {
  "id": "location_type.005",
  "v": 1,
  "field": "location",
  "label": "Forest Clearing",
  "text": "A scene at a forest Clearing. Exterior, by day: scouted, booked and scheduled like any other.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "beats",
    "beats": [
     {
      "place": "{place}",
      "intExt": "EXT",
      "time": "DAY",
      "objective": "What happens here.",
      "minutes": 3
     }
    ]
   }
  ],
  "consumers": [
   "projects.ts deriveRequirements (location, crowd)",
   "production/schedule.ts groupShootDays",
   "locations.ts scoutedPlaces"
  ],
  "tests": [
   "tests/brief.test.ts::offered scenes are added only when ticked, and then make the work scenes make"
  ],
  "slots": [
   {
    "key": "place",
    "label": "The Place's Name In Your Story",
    "suggest": "Forest Clearing"
   }
  ]
 },
 {
  "id": "location_type.006",
  "v": 1,
  "field": "location",
  "label": "Industrial Waterfront",
  "text": "A scene at a industrial Waterfront. Exterior, at night: scouted, booked and scheduled like any other.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "beats",
    "beats": [
     {
      "place": "{place}",
      "intExt": "EXT",
      "time": "NIGHT",
      "objective": "What happens here.",
      "minutes": 3
     }
    ]
   }
  ],
  "consumers": [
   "projects.ts deriveRequirements (location, crowd)",
   "production/schedule.ts groupShootDays",
   "locations.ts scoutedPlaces"
  ],
  "tests": [
   "tests/brief.test.ts::offered scenes are added only when ticked, and then make the work scenes make"
  ],
  "slots": [
   {
    "key": "place",
    "label": "The Place's Name In Your Story",
    "suggest": "Industrial Waterfront"
   }
  ]
 },
 {
  "id": "location_type.007",
  "v": 1,
  "field": "location",
  "label": "Residential Interior",
  "text": "A scene at a residential Interior. Interior, at night: scouted, booked and scheduled like any other.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "beats",
    "beats": [
     {
      "place": "{place}",
      "intExt": "INT",
      "time": "NIGHT",
      "objective": "What happens here.",
      "minutes": 3
     }
    ]
   }
  ],
  "consumers": [
   "projects.ts deriveRequirements (location, crowd)",
   "production/schedule.ts groupShootDays",
   "locations.ts scoutedPlaces"
  ],
  "tests": [
   "tests/brief.test.ts::offered scenes are added only when ticked, and then make the work scenes make"
  ],
  "slots": [
   {
    "key": "place",
    "label": "The Place's Name In Your Story",
    "suggest": "Kitchen"
   }
  ]
 },
 {
  "id": "location_type.008",
  "v": 1,
  "field": "location",
  "label": "Historic Street",
  "text": "A scene at a historic Street, with 10 people in the background. Exterior, by day: scouted, booked and scheduled like any other.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "beats",
    "beats": [
     {
      "place": "{place}",
      "intExt": "EXT",
      "time": "DAY",
      "objective": "What happens here.",
      "minutes": 3,
      "crowd": 10
     }
    ]
   }
  ],
  "consumers": [
   "projects.ts deriveRequirements (location, crowd)",
   "production/schedule.ts groupShootDays",
   "locations.ts scoutedPlaces"
  ],
  "tests": [
   "tests/brief.test.ts::offered scenes are added only when ticked, and then make the work scenes make"
  ],
  "slots": [
   {
    "key": "place",
    "label": "The Place's Name In Your Story",
    "suggest": "Old Town Street"
   }
  ]
 },
 {
  "id": "location_type.009",
  "v": 1,
  "field": "location",
  "label": "Soundstage",
  "text": "A scene at a soundstage. Interior, by day: scouted, booked and scheduled like any other.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "beats",
    "beats": [
     {
      "place": "{place}",
      "intExt": "INT",
      "time": "DAY",
      "objective": "What happens here.",
      "minutes": 3
     }
    ]
   }
  ],
  "consumers": [
   "projects.ts deriveRequirements (location, crowd)",
   "production/schedule.ts groupShootDays",
   "locations.ts scoutedPlaces"
  ],
  "tests": [
   "tests/brief.test.ts::offered scenes are added only when ticked, and then make the work scenes make"
  ],
  "slots": [
   {
    "key": "place",
    "label": "The Place's Name In Your Story",
    "suggest": "Stage Set"
   }
  ]
 },
 {
  "id": "location_type.010",
  "v": 1,
  "field": "location",
  "label": "School Building",
  "text": "A scene at a school Building, with 15 people in the background. Interior, by day: scouted, booked and scheduled like any other.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "beats",
    "beats": [
     {
      "place": "{place}",
      "intExt": "INT",
      "time": "DAY",
      "objective": "What happens here.",
      "minutes": 3,
      "crowd": 15
     }
    ]
   }
  ],
  "consumers": [
   "projects.ts deriveRequirements (location, crowd)",
   "production/schedule.ts groupShootDays",
   "locations.ts scoutedPlaces"
  ],
  "tests": [
   "tests/brief.test.ts::offered scenes are added only when ticked, and then make the work scenes make"
  ],
  "slots": [
   {
    "key": "place",
    "label": "The Place's Name In Your Story",
    "suggest": "School Corridor"
   }
  ]
 },
 {
  "id": "location_type.011",
  "v": 1,
  "field": "location",
  "label": "Community Hall",
  "text": "A scene at a community Hall, with 20 people in the background. Interior, at night: scouted, booked and scheduled like any other.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "beats",
    "beats": [
     {
      "place": "{place}",
      "intExt": "INT",
      "time": "NIGHT",
      "objective": "What happens here.",
      "minutes": 3,
      "crowd": 20
     }
    ]
   }
  ],
  "consumers": [
   "projects.ts deriveRequirements (location, crowd)",
   "production/schedule.ts groupShootDays",
   "locations.ts scoutedPlaces"
  ],
  "tests": [
   "tests/brief.test.ts::offered scenes are added only when ticked, and then make the work scenes make"
  ],
  "slots": [
   {
    "key": "place",
    "label": "The Place's Name In Your Story",
    "suggest": "Community Hall"
   }
  ]
 },
 {
  "id": "location_type.012",
  "v": 1,
  "field": "location",
  "label": "Rural Workshop",
  "text": "A scene at a rural Workshop. Interior, by day: scouted, booked and scheduled like any other.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "beats",
    "beats": [
     {
      "place": "{place}",
      "intExt": "INT",
      "time": "DAY",
      "objective": "What happens here.",
      "minutes": 3
     }
    ]
   }
  ],
  "consumers": [
   "projects.ts deriveRequirements (location, crowd)",
   "production/schedule.ts groupShootDays",
   "locations.ts scoutedPlaces"
  ],
  "tests": [
   "tests/brief.test.ts::offered scenes are added only when ticked, and then make the work scenes make"
  ],
  "slots": [
   {
    "key": "place",
    "label": "The Place's Name In Your Story",
    "suggest": "Workshop"
   }
  ]
 },
 {
  "id": "camera_treatment.001",
  "v": 1,
  "field": "camera",
  "label": "Locked-Off Observations",
  "text": "Plan static coverage and staging.",
  "kind": "mechanical",
  "scope": "scene",
  "tags": [],
  "patch": [
   {
    "op": "shot",
    "coverage": "master",
    "emphasis": "scene",
    "rig": "sticks"
   }
  ],
  "consumers": [
   "takes.ts planTime, shotPlan, recordTakes",
   "craft.ts craftTime, craftRoles, rigDayCost",
   "production/schedule.ts sceneLoad",
   "finish.ts coverageEdit"
  ],
  "tests": [
   "tests/brief.test.ts::a camera idea sets the scene's shot plan, which the schedule already reads",
   "tests/craft.test.ts::each rig changes the time a scene takes by its own reset and running time, and nothing else about the plan"
  ],
  "fits": {
   "media": [
    "live-action",
    "hybrid"
   ]
  }
 },
 {
  "id": "camera_treatment.002",
  "v": 1,
  "field": "camera",
  "label": "Handheld Intimacy",
  "text": "Carried by the operator: setups reset quickly, and takes vary more.",
  "kind": "mechanical",
  "scope": "scene",
  "tags": [],
  "patch": [
   {
    "op": "shot",
    "coverage": "standard",
    "emphasis": "performances",
    "rig": "handheld"
   }
  ],
  "consumers": [
   "takes.ts planTime, shotPlan, recordTakes",
   "craft.ts craftTime, craftRoles, rigDayCost",
   "production/schedule.ts sceneLoad",
   "finish.ts coverageEdit"
  ],
  "tests": [
   "tests/brief.test.ts::a camera idea sets the scene's shot plan, which the schedule already reads",
   "tests/craft.test.ts::each rig changes the time a scene takes by its own reset and running time, and nothing else about the plan"
  ],
  "fits": {
   "media": [
    "live-action",
    "hybrid"
   ]
  }
 },
 {
  "id": "camera_treatment.003",
  "v": 1,
  "field": "camera",
  "label": "Long Moving Takes",
  "text": "One rehearsed take that moves with the action, on a rented stabiliser. A take that fails starts again from the top.",
  "kind": "mechanical",
  "scope": "scene",
  "tags": [],
  "patch": [
   {
    "op": "shot",
    "coverage": "master",
    "takes": "many",
    "emphasis": "one-shot",
    "rig": "moving"
   }
  ],
  "consumers": [
   "takes.ts planTime, shotPlan, recordTakes",
   "craft.ts craftTime, craftRoles, rigDayCost",
   "production/schedule.ts sceneLoad",
   "finish.ts coverageEdit"
  ],
  "tests": [
   "tests/brief.test.ts::a camera idea sets the scene's shot plan, which the schedule already reads",
   "tests/craft.test.ts::each rig changes the time a scene takes by its own reset and running time, and nothing else about the plan"
  ],
  "fits": {
   "media": [
    "live-action",
    "hybrid"
   ]
  }
 },
 {
  "id": "camera_treatment.004",
  "v": 1,
  "field": "camera",
  "label": "Controlled Dolly Moves",
  "text": "Track is laid for each setup by a key grip, on a rented dolly. Slower to set, steadier to shoot.",
  "kind": "mechanical",
  "scope": "scene",
  "tags": [],
  "patch": [
   {
    "op": "shot",
    "coverage": "standard",
    "takes": "few",
    "emphasis": "scene",
    "rig": "dolly"
   }
  ],
  "consumers": [
   "takes.ts planTime, shotPlan, recordTakes",
   "craft.ts craftTime, craftRoles, rigDayCost",
   "production/schedule.ts sceneLoad",
   "finish.ts coverageEdit"
  ],
  "tests": [
   "tests/brief.test.ts::a camera idea sets the scene's shot plan, which the schedule already reads",
   "tests/craft.test.ts::each rig changes the time a scene takes by its own reset and running time, and nothing else about the plan"
  ],
  "fits": {
   "media": [
    "live-action",
    "hybrid"
   ]
  }
 },
 {
  "id": "camera_treatment.005",
  "v": 1,
  "field": "camera",
  "label": "Close-Up Driven",
  "text": "Performance continuity and coverage emphasis.",
  "kind": "mechanical",
  "scope": "scene",
  "tags": [],
  "patch": [
   {
    "op": "shot",
    "coverage": "full",
    "emphasis": "performances"
   }
  ],
  "consumers": [
   "takes.ts planTime, shotPlan, recordTakes",
   "craft.ts craftTime, craftRoles, rigDayCost",
   "production/schedule.ts sceneLoad",
   "finish.ts coverageEdit"
  ],
  "tests": [
   "tests/brief.test.ts::a camera idea sets the scene's shot plan, which the schedule already reads",
   "tests/craft.test.ts::each rig changes the time a scene takes by its own reset and running time, and nothing else about the plan"
  ],
  "fits": {
   "media": [
    "live-action",
    "hybrid"
   ]
  }
 },
 {
  "id": "camera_treatment.006",
  "v": 1,
  "field": "camera",
  "label": "Wide Ensemble Blocking",
  "text": "Space, staging and multi-performer coordination.",
  "kind": "mechanical",
  "scope": "scene",
  "tags": [],
  "patch": [
   {
    "op": "shot",
    "coverage": "master",
    "takes": "few",
    "emphasis": "scene"
   }
  ],
  "consumers": [
   "takes.ts planTime, shotPlan, recordTakes",
   "craft.ts craftTime, craftRoles, rigDayCost",
   "production/schedule.ts sceneLoad",
   "finish.ts coverageEdit"
  ],
  "tests": [
   "tests/brief.test.ts::a camera idea sets the scene's shot plan, which the schedule already reads",
   "tests/craft.test.ts::each rig changes the time a scene takes by its own reset and running time, and nothing else about the plan"
  ],
  "fits": {
   "media": [
    "live-action",
    "hybrid"
   ]
  }
 },
 {
  "id": "camera_treatment.007",
  "v": 1,
  "field": "light",
  "label": "Practical Low Light",
  "text": "Lamps in the room and what the day gives. Interiors need no gaffer and reset sooner; a take more is planned for each setup, after a day of camera tests.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "light",
    "light": "available"
   }
  ],
  "consumers": [
   "craft.ts craftTime, gafferNeeded, cameraTestDays, postFactors",
   "takes.ts planTime",
   "hiring.ts neededRoles",
   "production/tasks.ts buildTasks"
  ],
  "tests": [
   "tests/craft.test.ts::practical and available light: interiors reset sooner and need no gaffer, a take more is planned, after a day of tests"
  ],
  "fits": {
   "media": [
    "live-action",
    "hybrid"
   ]
  },
  "excludes": [
   "camera_treatment.008",
   "camera_treatment.009"
  ]
 },
 {
  "id": "camera_treatment.008",
  "v": 1,
  "field": "light",
  "label": "High-Contrast Stylization",
  "text": "Hard light and deep shadow, shaped setup by setup and matched in the grade: slower on the day and longer in the grade, after two days of tests.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "light",
    "light": "contrast"
   }
  ],
  "consumers": [
   "craft.ts craftTime, gafferNeeded, cameraTestDays, postFactors",
   "takes.ts planTime",
   "hiring.ts neededRoles",
   "production/tasks.ts buildTasks"
  ],
  "tests": [
   "tests/craft.test.ts::high contrast: slower on lit scenes, a longer grade, two days of tests, and no change to a day exterior"
  ],
  "fits": {
   "media": [
    "live-action",
    "hybrid"
   ]
  },
  "excludes": [
   "camera_treatment.007",
   "camera_treatment.009"
  ]
 },
 {
  "id": "camera_treatment.009",
  "v": 1,
  "field": "light",
  "label": "Miniature Macro",
  "text": "Close lenses on small sets, for stop motion: two more stage days of lens and depth tests, and fewer frames in a day.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "light",
    "light": "macro"
   }
  ],
  "consumers": [
   "craft.ts craftTime, gafferNeeded, cameraTestDays, postFactors",
   "takes.ts planTime",
   "hiring.ts neededRoles",
   "production/tasks.ts buildTasks"
  ],
  "tests": [
   "tests/craft.test.ts::macro on miniatures is for stop motion: two more stage days and fewer frames a day; it asks nothing of a live film"
  ],
  "fits": {
   "media": [
    "animation",
    "hybrid"
   ]
  },
  "excludes": [
   "camera_treatment.007",
   "camera_treatment.008"
  ]
 },
 {
  "id": "camera_treatment.010",
  "v": 1,
  "field": "camera",
  "label": "Subjective Camera",
  "text": "Seen through a character's eyes: eyelines to the lens are rehearsed and checked on playback.",
  "kind": "mechanical",
  "scope": "scene",
  "tags": [],
  "patch": [
   {
    "op": "shot",
    "emphasis": "performances",
    "rig": "pov"
   }
  ],
  "consumers": [
   "takes.ts planTime, shotPlan, recordTakes",
   "craft.ts craftTime, craftRoles, rigDayCost",
   "production/schedule.ts sceneLoad",
   "finish.ts coverageEdit"
  ],
  "tests": [
   "tests/brief.test.ts::a camera idea sets the scene's shot plan, which the schedule already reads",
   "tests/craft.test.ts::each rig changes the time a scene takes by its own reset and running time, and nothing else about the plan"
  ],
  "fits": {
   "media": [
    "live-action",
    "hybrid"
   ]
  }
 },
 {
  "id": "sound_treatment.001",
  "v": 1,
  "field": "sound",
  "label": "Natural Location Texture",
  "text": "The recordist records each place by itself before the shoot: a day for every three locations, and less effects editing after.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "sound",
    "add": "texture"
   }
  ],
  "consumers": [
   "craft.ts craftTime, craftRoles, postFactors, dialogueHolds",
   "production/tasks.ts buildTasks",
   "production/shoot.ts needsDialogueReplacement",
   "hiring.ts neededRoles"
  ],
  "tests": [
   "tests/craft.test.ts::each sound choice moves its own work and no other"
  ],
  "adds": true
 },
 {
  "id": "sound_treatment.002",
  "v": 1,
  "field": "sound",
  "label": "Dialogue Clarity",
  "text": "A boom operator on every dialogue scene, and a moment to quiet the set before each setup. Dialogue recorded this way needs replacing only when there is no boom operator after all.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "sound",
    "add": "clarity"
   }
  ],
  "consumers": [
   "craft.ts craftTime, craftRoles, postFactors, dialogueHolds",
   "production/tasks.ts buildTasks",
   "production/shoot.ts needsDialogueReplacement",
   "hiring.ts neededRoles"
  ],
  "tests": [
   "tests/craft.test.ts::dialogue clarity: a boom operator is required, dialogue scenes reset a little slower, and a compromised day's dialogue holds"
  ],
  "adds": true
 },
 {
  "id": "sound_treatment.003",
  "v": 1,
  "field": "sound",
  "label": "Sparse Soundscape",
  "text": "Quiet, with few sounds, each one exposed: more Foley and a longer mix, and less score.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "sound",
    "add": "sparse"
   }
  ],
  "consumers": [
   "craft.ts craftTime, craftRoles, postFactors, dialogueHolds",
   "production/tasks.ts buildTasks",
   "production/shoot.ts needsDialogueReplacement",
   "hiring.ts neededRoles"
  ],
  "tests": [
   "tests/craft.test.ts::each sound choice moves its own work and no other"
  ],
  "adds": true
 },
 {
  "id": "sound_treatment.004",
  "v": 1,
  "field": "sound",
  "label": "Heightened Creature Foley",
  "text": "Movement and material recorded for each creature: two Foley days for every creature in the script.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "sound",
    "add": "creature"
   }
  ],
  "consumers": [
   "craft.ts craftTime, craftRoles, postFactors, dialogueHolds",
   "production/tasks.ts buildTasks",
   "production/shoot.ts needsDialogueReplacement",
   "hiring.ts neededRoles"
  ],
  "tests": [
   "tests/craft.test.ts::each sound choice moves its own work and no other"
  ],
  "adds": true
 },
 {
  "id": "sound_treatment.005",
  "v": 1,
  "field": "score",
  "label": "Original Synth Score",
  "text": "An electronic score, made by the composer alone: no players and no sessions.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "score",
    "score": "synth"
   }
  ],
  "consumers": [
   "craft.ts postFactors, scoreSessions",
   "production/tasks.ts buildTasks (the score, its recording sessions, the mix)"
  ],
  "tests": [
   "tests/craft.test.ts::a score with players is recorded in sessions that cost money and hold the mix; an electronic one is the composer alone"
  ],
  "excludes": [
   "sound_treatment.006",
   "sound_treatment.007"
  ]
 },
 {
  "id": "sound_treatment.006",
  "v": 1,
  "field": "score",
  "label": "Original Chamber Score",
  "text": "A small ensemble, recorded: a session for every twenty minutes of the film, which the mix waits for.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "score",
    "score": "chamber"
   }
  ],
  "consumers": [
   "craft.ts postFactors, scoreSessions",
   "production/tasks.ts buildTasks (the score, its recording sessions, the mix)"
  ],
  "tests": [
   "tests/craft.test.ts::a score with players is recorded in sessions that cost money and hold the mix; an electronic one is the composer alone"
  ],
  "excludes": [
   "sound_treatment.005",
   "sound_treatment.007"
  ]
 },
 {
  "id": "sound_treatment.007",
  "v": 1,
  "field": "score",
  "label": "Original Percussive Score",
  "text": "Percussion written tightly to the cut: longer to compose, with a session for every forty minutes.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "score",
    "score": "percussive"
   }
  ],
  "consumers": [
   "craft.ts postFactors, scoreSessions",
   "production/tasks.ts buildTasks (the score, its recording sessions, the mix)"
  ],
  "tests": [
   "tests/craft.test.ts::a score with players is recorded in sessions that cost money and hold the mix; an electronic one is the composer alone"
  ],
  "excludes": [
   "sound_treatment.005",
   "sound_treatment.006"
  ]
 },
 {
  "id": "sound_treatment.008",
  "v": 1,
  "field": "sound",
  "label": "Source Music Focus",
  "text": "Existing songs carry the film. Choosing this licenses nothing: add each song on the Songs card, where licensing one makes its clearance work.",
  "kind": "reference",
  "scope": "project",
  "tags": [],
  "patch": [],
  "consumers": [
   "songs.ts (add each song on the Songs card: licensing one there makes its clearance work and cost)"
  ],
  "tests": [
   "tests/brief.test.ts::every idea applies through the one command path and says first what it will do"
  ]
 },
 {
  "id": "sound_treatment.009",
  "v": 1,
  "field": "sound",
  "label": "Voice-Over Narrative",
  "text": "A character tells the story in voice-over: recorded once the picture is locked, before the final mix.",
  "kind": "mechanical",
  "scope": "character",
  "tags": [],
  "patch": [
   {
    "op": "narrator"
   }
  ],
  "consumers": [
   "production/tasks.ts buildTasks (narration recording, which every mix waits for)"
  ],
  "tests": [
   "tests/brief.test.ts::a narrator chosen from an idea is recorded after the lock, and the mix waits"
  ]
 },
 {
  "id": "sound_treatment.010",
  "v": 1,
  "field": "sound",
  "label": "Layered Crowd Sound",
  "text": "A loop group records the crowd after the lock: a session for every two scenes with a crowd.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "sound",
    "add": "crowd"
   }
  ],
  "consumers": [
   "craft.ts craftTime, craftRoles, postFactors, dialogueHolds",
   "production/tasks.ts buildTasks",
   "production/shoot.ts needsDialogueReplacement",
   "hiring.ts neededRoles"
  ],
  "tests": [
   "tests/craft.test.ts::each sound choice moves its own work and no other"
  ],
  "adds": true
 },
 {
  "id": "production_medium.001",
  "v": 1,
  "field": "medium",
  "label": "Live Action",
  "text": "Physical performances and selected practical/digital post methods.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "medium",
    "medium": "live-action",
    "technique": "none"
   }
  ],
  "consumers": [
   "projects.ts sceneTechnique, deriveRequirements",
   "production/tasks.ts buildTasks",
   "hiring.ts neededRoles"
  ],
  "tests": [
   "tests/zombie.test.ts::made as stop motion: puppets and animators, voices kept, and no makeup chair"
  ],
  "excludes": [
   "production_medium.002",
   "production_medium.003",
   "production_medium.004",
   "production_medium.005",
   "production_medium.006",
   "production_medium.007",
   "production_medium.008",
   "production_medium.009",
   "production_medium.010"
  ]
 },
 {
  "id": "production_medium.002",
  "v": 1,
  "field": "medium",
  "label": "2D Hand-Drawn",
  "text": "Drawing, cleanup, color and compositing workflow.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "medium",
    "medium": "animation",
    "technique": "2d-drawn"
   }
  ],
  "consumers": [
   "projects.ts sceneTechnique, deriveRequirements",
   "production/tasks.ts buildTasks",
   "hiring.ts neededRoles"
  ],
  "tests": [
   "tests/zombie.test.ts::made as stop motion: puppets and animators, voices kept, and no makeup chair"
  ],
  "excludes": [
   "production_medium.001",
   "production_medium.003",
   "production_medium.004",
   "production_medium.005",
   "production_medium.006",
   "production_medium.007",
   "production_medium.008",
   "production_medium.009",
   "production_medium.010"
  ]
 },
 {
  "id": "production_medium.003",
  "v": 1,
  "field": "medium",
  "label": "2D Cutout",
  "text": "Reusable rigs/assets and compositing workflow.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "medium",
    "medium": "animation",
    "technique": "2d-rigged"
   }
  ],
  "consumers": [
   "projects.ts sceneTechnique, deriveRequirements",
   "production/tasks.ts buildTasks",
   "hiring.ts neededRoles"
  ],
  "tests": [
   "tests/zombie.test.ts::made as stop motion: puppets and animators, voices kept, and no makeup chair"
  ],
  "excludes": [
   "production_medium.001",
   "production_medium.002",
   "production_medium.004",
   "production_medium.005",
   "production_medium.006",
   "production_medium.007",
   "production_medium.008",
   "production_medium.009",
   "production_medium.010"
  ]
 },
 {
  "id": "production_medium.004",
  "v": 1,
  "field": "medium",
  "label": "3D Computer Animation",
  "text": "Model, rig, layout, animation, lighting and render workflow.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "medium",
    "medium": "animation",
    "technique": "3d-cg"
   }
  ],
  "consumers": [
   "projects.ts sceneTechnique, deriveRequirements",
   "production/tasks.ts buildTasks",
   "hiring.ts neededRoles"
  ],
  "tests": [
   "tests/zombie.test.ts::made as stop motion: puppets and animators, voices kept, and no makeup chair"
  ],
  "excludes": [
   "production_medium.001",
   "production_medium.002",
   "production_medium.003",
   "production_medium.005",
   "production_medium.006",
   "production_medium.007",
   "production_medium.008",
   "production_medium.009",
   "production_medium.010"
  ]
 },
 {
  "id": "production_medium.005",
  "v": 1,
  "field": "medium",
  "label": "Puppet Stop-Motion",
  "text": "Armatures, puppets, sets, frame animation and repair workflow.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "medium",
    "medium": "animation",
    "technique": "stop-motion"
   }
  ],
  "consumers": [
   "projects.ts sceneTechnique, deriveRequirements",
   "production/tasks.ts buildTasks",
   "hiring.ts neededRoles"
  ],
  "tests": [
   "tests/zombie.test.ts::made as stop motion: puppets and animators, voices kept, and no makeup chair"
  ],
  "excludes": [
   "production_medium.001",
   "production_medium.002",
   "production_medium.003",
   "production_medium.004",
   "production_medium.006",
   "production_medium.007",
   "production_medium.008",
   "production_medium.009",
   "production_medium.010"
  ]
 },
 {
  "id": "production_medium.006",
  "v": 1,
  "field": "medium",
  "label": "Clay Animation",
  "text": "Malleable models, replacement/repair and frame animation.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "medium",
    "medium": "animation",
    "technique": "stop-motion"
   }
  ],
  "consumers": [
   "projects.ts sceneTechnique, deriveRequirements",
   "production/tasks.ts buildTasks",
   "hiring.ts neededRoles"
  ],
  "tests": [
   "tests/zombie.test.ts::made as stop motion: puppets and animators, voices kept, and no makeup chair"
  ],
  "excludes": [
   "production_medium.001",
   "production_medium.002",
   "production_medium.003",
   "production_medium.004",
   "production_medium.005",
   "production_medium.007",
   "production_medium.008",
   "production_medium.009",
   "production_medium.010"
  ]
 },
 {
  "id": "production_medium.007",
  "v": 1,
  "field": "medium",
  "label": "Object Stop-Motion",
  "text": "Object preparation and controlled frame animation.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "medium",
    "medium": "animation",
    "technique": "stop-motion"
   }
  ],
  "consumers": [
   "projects.ts sceneTechnique, deriveRequirements",
   "production/tasks.ts buildTasks",
   "hiring.ts neededRoles"
  ],
  "tests": [
   "tests/zombie.test.ts::made as stop motion: puppets and animators, voices kept, and no makeup chair"
  ],
  "excludes": [
   "production_medium.001",
   "production_medium.002",
   "production_medium.003",
   "production_medium.004",
   "production_medium.005",
   "production_medium.006",
   "production_medium.008",
   "production_medium.009",
   "production_medium.010"
  ]
 },
 {
  "id": "production_medium.008",
  "v": 1,
  "field": "medium",
  "label": "Rotoscoped Animation",
  "text": "Performance reference plus drawing/processing workflow.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "medium",
    "medium": "animation",
    "technique": "rotoscope"
   }
  ],
  "consumers": [
   "projects.ts sceneTechnique, deriveRequirements",
   "production/tasks.ts buildTasks",
   "hiring.ts neededRoles"
  ],
  "tests": [
   "tests/zombie.test.ts::made as stop motion: puppets and animators, voices kept, and no makeup chair"
  ],
  "excludes": [
   "production_medium.001",
   "production_medium.002",
   "production_medium.003",
   "production_medium.004",
   "production_medium.005",
   "production_medium.006",
   "production_medium.007",
   "production_medium.009",
   "production_medium.010"
  ]
 },
 {
  "id": "production_medium.009",
  "v": 1,
  "field": "medium",
  "label": "Live Action With Animation",
  "text": "Shot-level hybrid breakdown and compositing.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "medium",
    "medium": "hybrid",
    "technique": "3d-cg"
   }
  ],
  "consumers": [
   "projects.ts sceneTechnique, deriveRequirements",
   "production/tasks.ts buildTasks",
   "hiring.ts neededRoles"
  ],
  "tests": [
   "tests/zombie.test.ts::made as stop motion: puppets and animators, voices kept, and no makeup chair"
  ],
  "excludes": [
   "production_medium.001",
   "production_medium.002",
   "production_medium.003",
   "production_medium.004",
   "production_medium.005",
   "production_medium.006",
   "production_medium.007",
   "production_medium.008",
   "production_medium.010"
  ]
 },
 {
  "id": "production_medium.010",
  "v": 1,
  "field": "medium",
  "label": "Mixed Animation Techniques",
  "text": "Explicit shot/asset boundaries between chosen techniques.",
  "kind": "mechanical",
  "scope": "project",
  "tags": [],
  "patch": [
   {
    "op": "medium",
    "medium": "animation",
    "technique": "mixed"
   }
  ],
  "consumers": [
   "projects.ts sceneTechnique, deriveRequirements",
   "production/tasks.ts buildTasks",
   "hiring.ts neededRoles"
  ],
  "tests": [
   "tests/zombie.test.ts::made as stop motion: puppets and animators, voices kept, and no makeup chair"
  ],
  "excludes": [
   "production_medium.001",
   "production_medium.002",
   "production_medium.003",
   "production_medium.004",
   "production_medium.005",
   "production_medium.006",
   "production_medium.007",
   "production_medium.008",
   "production_medium.009"
  ]
 }
];
