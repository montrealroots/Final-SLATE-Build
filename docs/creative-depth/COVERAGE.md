# Final Coverage: The Package's Nine Acceptance Points

Written November 11, 2026, at the end of milestone H. Each point of `package/06-TESTING-AND-DELIVERY.md`, "Exact final
acceptance", with what is true of the code, the evidence, and what is not done. Statuses are the package's own. Nothing
here is called complete that has a row still open: the package's rule is no 100% declaration while mechanical rows
are unfinished, and some are.

Counts come from the audit tables, which a test compares with the code on every run
(`tests/creative-depth-audit.test.ts`).

## 1. Every Inventoried Field Has A Picker Or A Reasoned Decision, And Existing Data Is Kept

**Not complete.** `FIELD-INVENTORY.csv` lists 267 labelled controls.

| Decision | Controls |
| --- | --- |
| Has ideas to choose from | 52 |
| No picker, by design, with the reason given | 194 |
| Part of the picker itself | 10 |
| No picker yet | 11 |

The 11 are structural script fields: the genre's own questions, what each episode moves, acts, threads, setups,
relationships and arcs. They take what the player writes, as before. Custom text is kept everywhere, and no idea
replaces what the player wrote without asking (`tests/brief.test.ts`; journey J01).

## 2. Every Mechanical Option Family Has A Consumer And A Counterfactual Test

**Implemented, engine verified; part browser verified.** `EFFECT-COVERAGE.csv` has 410 rows: 188 mechanical decisions,
208 that are words for a document or an identity, and 14 visual references that are reference-only by design. Every
mechanical row names the engine code that reads it and a test in which changing only that value changes an outcome.
9 rows are also verified through a browser journey; the other 387 by engine tests.

Families and their comparisons: makeup, costume, looks and crowds (`tests/looks.test.ts`, `tests/states.test.ts`);
camera, light, sound and score (`tests/craft.test.ts`); where a place is filmed and under what roof
(`tests/destinations.test.ts`); who is hired from the catalog (`tests/real-hiring.test.ts`); writers' passes
(`tests/writing-jobs.test.ts`); which studio is pitched and what it releases (`tests/strategy.test.ts`); the version a
territory sees (the same file). Mutations made across the package, each of which failed a test: 5 (A), 2 (B), 11 (D),
1 (E), 6 (F), 4 (G).

Open: four of the package's starter options remain notes with no engine (two puppet finishes, a stylized anachronism,
source music), and are classed as words, not mechanics.

## 3. Every Genre Has Definitions And Suggestion Routes

**Implemented, engine verified.** 149 genres in 17 families. 68 routes are written, four for each family, so every
genre is offered at least four (`tests/routes.test.ts`). They are written entries, counted once each, not
combinations. A route is a tone, a light, sound choices, a score and three offered scenes; none is a quality bonus,
and the same work is assessed the same whichever route was chosen. Gap: routes are by family, so two genres of one
family are offered the same four.

## 4. Real People Through Audition, Hiring, Paid Work And Credits, With Shared Availability

**Implemented, browser verified** (J04, J05, on desktop, phone and WebKit; `tests/guests.test.ts`,
`tests/real-hiring.test.ts`). Recorded facts and what the game makes up are kept apart; nothing is inferred; an
unknown age blocks every offer until the player says; nobody is approached after a recorded death; one diary across
projects. Not built: agents, a producer's job, and holds on an inquiry. Every person in the tests is a made-up
fixture; the owner's real catalog is the owner's alone.

## 5. Every Playable Place Navigable, With Truthful Destination Coverage And Labelled Fallback

**Partly.** Any place in the world registry can be where a script location is filmed, and the day takes that place's
weather, daylight, holidays and clock (J07; `tests/destinations.test.ts`). The site is always a candidate the game
made up and says so; no real venue, address, fee or permit rule is stated. Not done: a note beside the picker for a
country with few registry places; the schedule builder using the filmed place's working calendar; child-performer
rules by the filmed place; real venues, which are reference-only by design.

## 6. The Remaining Studio Groups, Imported And Usable Through Distinct Strategies

**Registry: implemented, engine verified. Strategies: implemented, browser verified. Import: under way when this was
written.** Paramount completed its purchase of Warner Bros. Discovery on October 6, 2026, so two of the three named
families are one group, Skydance, with two acquisition dates from official sources; Sony's dates are not recorded
because its own pages refuse automated readers (`docs/CATALOG.md`). 50 more companies have their titles gathered.
The gathering run for them began on November 11, 2026, takes hours, and is reported in `docs/CATALOG-COVERAGE.md`
when it ends; until then that file describes the two earlier groups only. A studio reads a pitch by fit, slate room,
script and record, with no chance in it, and releases a film it backs territory by territory (J08;
`tests/strategy.test.ts`; `tests/offer-concentration.test.ts`, 100 seeds). The journeys use made-up studios. Four
Hollywood groups are not the whole world: no international or independent group is covered.

## 7. Optional Media Loads Only Where Permitted, Degrades Gracefully, And Owner Data Is Protected

**Implemented, browser verified** (J09; `tests/packs.test.ts`, `tests/catalog-server.test.ts`). The picture pack is
optional, the owner's alone, under the same six months as the films, and deleted within the hour if the game is left
open past them. With no pack or no picture, a plain placeholder of the same shape. A server that isn't the owner's
neither lists nor serves films or pictures. Each picture's licence is not checked: the pack says the rights are each
owner's and claims nothing more.

## 8. Migrations, Pack Refresh And Removal, And Repeated Actions Conserve Money And Keep History

**Implemented, engine and browser verified.** No save version changed in this package: every new field is optional,
and a save from before plays by the rules it had (tested for projects without writing jobs, people without records,
places with nothing chosen, releases with no version). A pack is replaced in one step and the old one kept if the
new one fails; removing a pack never touches a saved game (J09). A refreshed catalog changes nothing a save decided
(J10). Payments are recorded once each: a writer's day, a director's day, a unit's move, a dub
(`tests/writing-jobs.test.ts`, `tests/destinations.test.ts`, `tests/strategy.test.ts`).

## 9. CI And The Production Browser Suites On The Exact Final Commit

**Recorded pull request by pull request in `QA-REPORT.md`.** Each milestone merges only after the repository's CI,
which runs the unit suite, the build, the budgets, and the browser suite on both the development and production
builds, is green on that pull request's final commit. This file is written before the last of them; the QA report
says which have merged.

## Not Done, In One Place

- 11 structural fields have no ideas.
- A puppet's face method; painted 2D backgrounds as their own task; a series bible and standing sets as records.
- A backup place for a location; the unit's travel days on the calendar; a coverage note for sparse countries.
- A distributor's own multi-territory offer opens everywhere on one day; only a studio's release is staggered.
- Budget bands, franchises and who at a studio decides. No real executive is given a preference.
- Sony's ownership dates. International and independent groups.
- Choosing people one by one for pictures; backdrops and logos; each picture's own licence.
- A browser journey for a birthday during production, for a cut-off download resumed, and for the whole of a series
  from outline to a made second season in one career.
- Any check on a physical device.
- Performance was held to the existing budgets (startup under 700 kB, 220 kB gzipped; measured 306 and 98) and no
  budget was raised. The package's wider before-and-after timings (picker search, pack install, long-career advance)
  were not re-measured as a set.
