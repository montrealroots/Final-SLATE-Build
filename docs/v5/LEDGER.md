# v5 Ledger: The Owner's Brief Against The Code

The owner's brief is `docs/v5/00-OWNER-BRIEF.md`. This is where each of its parts stands, read from the code on
November 13, 2026 (the sweep). Each section says what exists, with the file that does it, and what the brief asks that
doesn't yet exist. A part is **done** only when it is stored, read by its engine, has a consequence a player can see,
survives a reload, and has a test that fails without it. The order of work is at the end.

## 1. Source-Specific Adaptation

- **Exists.** `proposal.ts` proposes a whole brief from a work.
  - Since November 13, 2026, the premise, synopsis, a kept ending and every scene's action are the work's own story,
    from its article's plot section (`src/data/plots.json`, 517 of 643 works), credited. A series spreads it across
    every episode.
  - `ReviseBrief.tsx` previews a revision, keeps locks and selective changes; Undo takes the whole brief back.
  - `writing-jobs.ts` hires writers for passes (draft, rewrite, polish) with days, pay, review and credit.
- **Gaps.**
  - Scenes and episodes are the story cut into equal runs of sentences. The brief rules that out: organise it around
    developments, dependencies, character changes, episode purposes and format.
  - Tone, pacing, logline, question, stakes, conflict, character wants and arcs are still genre templates (`MATRIX`,
    `BEATS`), even where the story says more.
  - The synopsis keeps the article's words up to 3,000 characters. The brief asks for concise summaries and original
    planning rather than reproduction; long verbatim passages should give way to the game's own short planning.
  - No Guide Me for writing: a mandate that commissions development, drafts and revisions within a ceiling.

## 2. Production Tailored To Each Project

- **Exists.** `production/tasks.ts` builds tasks from format and method (live action, 2D, 3D, stop motion, hybrid by
  scene); assets for 3D and stop motion (`designs.ts`, `stages.ts`); locations and travel (`destinations.ts`); kits
  (`equipment.ts`); music tasks (`cues.ts`, `songs.ts`); per-episode delivery (`episode-delivery.ts`); revisions that
  reopen only affected work (`revisions.ts`, J04 and J09).
- **Gaps.** No preview of a plan's consequences before it is built ("Build Schedule" acts at once). The task lists of a
  short, a feature, a documentary, a limited series and an ongoing series haven't been compared side by side. "Quality
  doesn't rise with money or fame" isn't tested as a rule.

## 3. Real Artists, Recordings And Composers

- **Exists.** People share one identity across roles (`people.ts`, `guests.ts` for TMDB people). Music roles are
  distinct. Songs can be licensed (`songs.ts`), with library music as a fallback (`music.ts`).
- **Done on November 13, 2026.** `docs/v5/MUSIC.md` has the provider's terms and what is kept.
  - A real catalog from Wikidata (CC0), in `src/data/music.json`: 896 people and groups, 1,740 recordings and 497
    composers with recorded scores, each record with its QID and provenance.
  - A recording can be licensed into a project with its record.
  - A composer can be considered for the job under the save's one identity for them (their TMDB ID). A film catalog
    record of the same person is never replaced.
  - Fees, answers and availability are simulation, and labelled.
- **Evidence.** `tests/music-catalog.test.ts` (5 tests) and `e2e/v5-music-catalog.spec.ts`, on desktop and phone.

## 4. Music Specific To The Project

- **Exists.** `cues.ts` proposeBrief and proposeCues, Guide Me for music (`mandates.ts`), score judged on fit, sync and
  dialogue, stems, conform, cue sheets, licences with territories and terms.
- **Done on November 13, 2026.** The brief comes from the project, not its genre:
  - the player's tone and intended experience, quoted back;
  - the period;
  - its pace and talk;
  - its action;
  - its cast;
  - its budget;
  - its songs.

  Nothing pointing one way leaves the style to the composer, and silence is proposed when the intent asks for it.
  Cues follow what their scenes do: night isn't tension, and action is. Intensity climbs with the story, and motifs
  follow the characters.
- **Evidence.** `tests/cues.test.ts`, with controlled comparisons (a thriller and a drama that are the same film get the
  same brief), and `e2e/music.spec.ts`, where the brief quotes the journey's own intended experience.

## 5. First-Look Deals

- **Exists.** Studios with recorded paces and genres (`studios.ts`); studio options on single films (`finance.ts`, the
  studio deal).
- **Done on November 13, 2026.** First-look deals, researched first (`docs/v5/FIRST-LOOK.md`, with its sources and the
  distinctions from options, distribution, overall deals and first refusal), are built in `first-look.ts`:
  - offers come from the followed studio the player's delivered films fit, after work received at 60 or better, or a
    win;
  - terms follow the studio's recorded scale;
  - nothing binds without acceptance, and the player may ask once for more overhead;
  - one deal at a time;
  - covered films are submitted to the studio first, with its days to answer, and no other studio can be pitched them
    until then;
  - development money goes in, and is repaid once from another studio's money after a pass (a burdened turnaround);
  - one studio per film;
  - monthly overhead goes to the company, or to the player's own account;
  - the deal is renewed or ends at its term, or the player ends it early, and its obligations survive.
- **Evidence.** `tests/first-look.test.ts` (11 tests) and `e2e/v5-first-look.spec.ts`, on desktop and phone.
- **Left out, and said so.** Turnaround periods with reversion, overall deals, first refusal, and series deals.

## 6. Independent Release Plan

- **Exists.** `finish.ts` planRelease for a self-release, distributor offers drawn after delivery, festivals, later
  windows, exclusivity, episode schedules.
- **Done on November 13, 2026.** The research came first (`docs/v5/RELEASE-PLAN.md`, with its sources). Then
  `release-plan.ts` and the Release Plan card (`ReleasePlan.tsx`):
  - the routes, territories, date, festival hold, version abroad and promotion intended;
  - licence proposals to distributors, broadcasters and, through a sales agent, streaming services, which accept,
    counter or reject them in their own time;
  - offers the player still has to sign;
  - alternatives after a rejection;
  - a partner-assisted theatrical release, the stores through an aggregator, and the player's own storefront, each with
    its costs named before booking;
  - festival-first, which holds every public release, an offer's too;
  - exclusive rights kept;
  - series taken by every route but the cinema ones.

  Every route ends as a deal that reports, settles and opens later windows. Until then a self-release earned nothing.
- **Evidence.** `tests/release-plan.test.ts` (9 tests) and `e2e/v5-release-plan.spec.ts`, on desktop and phone.
- **Left out, and said so.** Real platforms and fees, festival markets, an agent's own territory sales, and tax.

## 7. Outside Work And The Living Industry

- **Exists.** `jobs.ts` (outside jobs with agents, pay and credit, J10), `industry.ts` (series renewals after the records
  end), `studios.ts` (simulated films at recorded paces), `continuation.ts` (a commissioner's season decision, renewal
  offers and cancellation).
- **Done on November 13, 2026.**
  - **Productions that persist.** `productions.ts` keeps a slate of other people's productions in each place:
    - each is made once from the seed and kept;
    - each has a company: a followed studio where the world has them, or one of a recurring roster;
    - each has a kind, genre, parts, shooting dates, a wrap and a release;
    - the slate is topped up as productions wrap, never reset;
    - each comes out on its date and is received (simulated).
  - **Jobs.** A job is on one of those productions, inside its shooting days. It names the part, episode, rewrite or
    second unit, the material to prepare from, and what is asked. Its rate can be asked up once.
  - **Results count.** How the work the player did was received weighs on later offers.
  - **Entry by evidence.** Writing opens on an approved script as a sample. Directing opens on a delivered project or
    on two jobs on others' sets.
- **Evidence.** `tests/productions.test.ts` (6 tests), `tests/jobs.test.ts`, and `e2e/j10.spec.ts` and
  `e2e/jobs.spec.ts`, on desktop and phone.
- **Still open.** Productions are local to the place the player is in. Delays and cancellations of others'
  productions aren't modelled.

## 8. Metrics And Historical Continuation

- **Exists.** Simulated weekly cinema results with screens and holdovers (`box-office.ts`), broadcast and streaming
  audiences (`audiences.ts`), recorded versus simulated world events (`catalog/world.ts historicalRecord`), the record
  book.
- **Done on November 13, 2026.**
  - **A TV week's context.** Each week's audience stands against three things, each kept on the observation and shown
    in the weekly table:
    - the timeslot: a late slot keeps 60%;
    - the season: summer 88%, winter 108%;
    - the week's competition, the same for every show that week.
  - **The record book's money kept apart.** Ticket sales, admissions, film rental, the project's income, its cost, its
    profit and what came to the player are each read from the ledger and the weeks.
- **Evidence.** `tests/audiences.test.ts` (a test of the week's context, and older tests compared net of it) and
  `tests/box-office.test.ts` (the money kept apart).
- **Data-limited.** No recorded box office or audience figures are imported. TMDB's catalog holds no weekly figures,
  and none is invented. Simulated figures are labelled everywhere they show.

## 9. Money And Equipment Approvals

- **Exists.** Personal account (`personal.ts`), project ledgers, financing deals, transfers of earnings between projects,
  equipment purchases, rentals and servicing, receipts that repay backers first.
- **Gaps.**
  - A shoot day the kit can't serve hires the rental house's package automatically (`production/shoot.ts`). The brief
    says it must come to the player with its options.
  - No company account.

## 10. Phone And Desktop Parity

- **Exists.**
  - Phones show the desktop layout scaled to fit, by default (`layout-mode.ts`). The owner asked for this on
    November 13.
  - Settings, Phone Layout gives the reflowed phone layout.
  - `ui-coverage.spec` shoots every screen at four sizes.
  - Phone picture sign-in works through the real server path (PR #86).
- **Gaps.** The brief now says: reflow, don't shrink the desktop canvas. That reverses the scaled default; the
  reflowed layout becomes the default again, matching the desktop's order and actions. The earlier choice stays
  available in Settings. New screens need adding to the coverage.

## 11. The Ten Journeys

| Journey | Exists Today |
| --- | --- |
| Source through brief, delegated writing, casting, production, release | J01 and J03 cover source to release; no delegated writing |
| Real composer through score and credits | J09 hires a game composer, not a real one |
| Song refused, replaced, cleared | J08 (library replacement) |
| First-look offer, submission, pass, outside release | v5-first-look.spec (offer, bargaining, acceptance, submission first); the pass and outside take are engine-tested |
| Independent film and series on different release routes | v5-release-plan.spec (a film: festival hold, a licence turned down then signed, the stores); series routes engine-tested |
| Paid outside job leading to an opportunity | J10, but the next offer isn't tied to the first job |
| Renewal or cancellation with obligations | J03 (cancellation), renewal.spec (a labelled fixture) |
| Equipment shortage needing approval | v5-money-equipment.spec |
| Company transfers and settled earnings | v5-money-equipment.spec (company formed, money moved, put into a project) |
| Phone pictures and mobile project management | owner-access.spec (fixture answer); no full phone run |

## The Owner's Goals Beyond The Command

- **Grades for people.** Every person has experience and capability (`people.ts`) driving their asking rate and their
  work. There is no grade a player reads, and real people's are drawn, not from their record. To build: a grade from a
  person's record (credits, years and reach for real people; work in this save for everyone), shown with what it is
  made of, driving skill and price.
- **More studios and people from TMDB.** The catalog build (`tools/screen-catalog`) gathers companies and people,
  owner-only (TMDB's terms, six months). To widen it: more companies and the people on their recent work, in batches,
  each batch's reach reported.
- **Box office that mimics the real world.** Tie the simulation to recorded budgets and revenues where TMDB has them, so
  a film behaves like its peers. Simulated, and labelled so.
- **TV ratings fresh each week.** Each week's audience comes from its competition, timeslot and word of mouth, drawn
  fresh and reproducibly from the save.

## Order Of Work

1. Adaptation: dramatic structure, whole brief, Guide Me for writing.
2. Equipment shortages that ask, and company accounts.
3. First-look deals.
4. The Release Plan.
5. Music: the real catalog, and proposals from the project.
6. The living industry, grades and prices, metrics.
7. Production plan previews and the format comparison.
8. Phone parity, the ten journeys, the final report.

Each is merged when its checks are green, and this ledger says what changed.
