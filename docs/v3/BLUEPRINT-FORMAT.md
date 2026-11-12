# The Story File Format

Full stories are in `src/blueprints/`, one text file for each genre (`heist.bp`) and one for each supported pair of
genres (`heist+romance.bp`). `src/engine/blueprints.ts` reads them (`parseBlueprints`) and says what is wrong with an
entry (`blueprintProblems`). A story with any problem is counted nowhere and shown to nobody
(`tests/v3-content.test.ts`).

A story starts at `== ` and runs to the next one. Lines are `key: value`, or start with `@` (a character), `~` (a
relationship), `#` (a scene) or `ep` (an episode). Fields in a line are separated by ` | `. A line starting `//` is a
comment.

```
== <id> | <format> | <structure>
```

- **id:** `<genre>.f01` for a film, `<genre>.t01` for a series, `<genre>+<genre>.x01` for a mixed story. The genre is
  one of the registry's 149 IDs.
- **format:** `feature`, `short`, `mid-length`, `tv-film`, `documentary-feature`, `documentary-short`; or `series`,
  `limited-series`, `anthology-series`, `documentary-series`, `web-series`.
- **structure:** `three-act`, `four-act`, `five-act`, `two-part`, `circular`, `episodic`, `nonlinear`, `parallel`,
  `real-time`, `frame`, `chapters`, `journey`.

## Lines Every Story Has

| Line | What it is |
| --- | --- |
| `title:` | The working title. |
| `genre: <primary> + <secondary>, <secondary>` | One primary genre, which is the quota it fills; secondary genres fill none. |
| `tone:` | 80 characters at most. |
| `era: <year or -> \| contemporary, period or future` | The year the story is set in, if it has one. |
| `setting: <name> \| real or fictional \| <type>` | A made-up place says so. The type is one of the matrix's words (`SETTING_TYPES`). |
| `logline:` `premise:` `synopsis:` `question:` | The synopsis is the whole story, ending included. |
| `themes: a; b; c` | |
| `audience:` `viewpoint:` `stakes:` `conflict:` `ending:` `experience:` | |
| `look:` `sound:` | Suggestions, kept as notes. They choose nothing. |
| `m: <goal> \| <opposition> \| <dilemma> \| <resolution>` | The diversity matrix, in its fixed words (`GOALS`, `OPPOSITIONS`, `DILEMMAS`, `RESOLUTIONS`). |
| `review: reviewed or authored \| <date> \| <note>` | `reviewed` once it has been read for coherence and against the stories beside it. |

Optional: `rule: <rule> | <limit>` for a story-world rule, as many as needed.

## People

```
@ key | Name | billing | functions | being | pronouns | age | wants | why | obstacle | contradiction | arc | voice | look
~ keyA - keyB | what they are to each other | where it starts | where it ends
```

Billing, functions and kind of being are the game's own values. Pronouns and age are `-` where neither applies. In
any prose line a character is written `{key}`, so the player's name for them is used everywhere the story names them.

## The Outline

```
# Part | INT, EXT or INT/EXT | Place | DAY, NIGHT, DAWN or DUSK | keys | purpose | what happens | what turns | minutes | needs
```

At least five scenes in at least three parts. A scene that turns the story says how in its eighth field; at least two
do. Needs are typed, comma-separated, and are what the breakdown reads: `crowd=40`, `stunts=<what>`, `water`,
`intimacy`, `dance`, `vfx=a+b`, `animals=a+b`, `vehicles=a+b`, `props=a+b`. Nothing is read from the words.

## A Series

```
tv: <episodes> x <minutes>
engine:        what every episode does
arc:           the first season's arc
ep 1 | Title | what it moves        (one line for each episode)
changes:       how its people change over the season
recurring: a; b; c                  the places it returns to
continuation:  what a next season would be, or that it ends
```

The `#` lines are the first episode.

## A Documentary

```
subject: who | who they are | how they might be reached
ask: a question | what would answer it
evidence: what it would have to show | where that might be found
```

Nobody is promised and nothing is found in advance: a subject is someone to approach, and their consent is asked in
the game like anyone's.
