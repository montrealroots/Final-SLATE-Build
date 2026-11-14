# Papers (Step 4 Of The Owner's Command Of November 14, 2026)

## The Records

SLATE-REBUILD's papers, from `88256bfc234cf6f4912b3d53632ca0fdd76720c2`, were copied unchanged:
- **Into `src/data/papers/`:** the compiled `passports.json`, `visits.json`, `work.json` and `citizenship.json`.
- **Into `docs/v9/papers-sources/`:** their research sources and their coverage.

Recounted on November 14, 2026; every count matches the owner's:

| Records | Entries | Notes |
|---|---|---|
| Passports | 236 | 23 of them say another state issues the passport |
| Visitor destinations | 246 | 9 shared lists |
| Work-permission countries | 232 | 7 shared lists |

The work records are identical, country for country, to the table the v8 work imported (`src/data/work-rights.json`),
which they replace.

What the records don't hold, said so the game never fills it:
- **Passports.** 118 of 1,030 fee figures are unrecorded, and so are 250 of 479 route times. Route times are in working
  days (107), days (58), weeks, hours, months or minutes.
- **Visits.** The rule (free, an electronic authorization, an e-visa, a visa on arrival or a visa) and how long a visit
  may last. No fee and no decision time.
- **Work.** The rule, the route's name, and the days a short engagement may be worked without it (42 countries for every
  other passport). No route's fee or decision time.

## What Is Kept Apart (`src/engine/papers.ts`)

1. **A passport and whether it is in force.** This is 1221's document in the bank world. You apply on Your Papers: the
   fee is paid from your bank, it is ready after the office's days, it expires, and it can be reported lost or stolen.
   - For the citizenships 1221 has no office for, SLATE-REBUILD's records are used (`passportOffers`,
     `applyForRecordedPassport`). Each route shows its fee and its time, and is taken only where both are recorded.
     That is 101 more citizenships (docs/v9/COVERAGE.md).
   - Working days skip weekends; public holidays aren't counted, which is a simplification.
   - A passport lets you travel, nothing more.
2. **Permission to enter** (`entryRight`). By the best of your passports: your own country, free, an electronic
   authorization, an e-visa, a visa on arrival or a visa. Or the visa you hold.
3. **Permission to stay.** A visit's length comes from the records and is said. Days spent in a country aren't counted
   yet. A residence document counts where a save holds one.
4. **Permission to work** (`workRight`).
   - **Allowed:** citizenship, free movement, or a short engagement's days, counted as you work them
     (`recordWorkDay`, called by the shoot).
   - **The game's assumption:** where your story is lived, which is never called ready.
   - **Not allowed:** otherwise. The route's name and what the records lack are said.
5. **Permission for the work itself.** The records describe what a performer needs, so they cover acting only.
   Directing and producing abroad need a general right to work there. The shoot checks each thing the day needs you
   for (acting, directing), and feasibility does the same.

## The Application

The lifecycle:
1. **Eligibility** (`visaCheck`).
2. **The documents it needs:** a passport in force until the decision at least.
3. **Applying, with the fee paid from your bank** at the day's reference rate. It is a line in your statement.
4. **The review:** the recorded days.
5. **The decision.** No refusal is modelled; the game doesn't invent a probability.
6. **The document issued,** with its recorded validity.
7. **Its use:** entry is allowed, and work is still not.
8. **Its expiry,** after which it is needed again.

Until later on November 14, 2026 an application was offered only where the records gave both the fee and the time:
1221's nine visitor visa records. The owner then asked for everything to be made possible, choosing "research, then
estimate" (`src/engine/papers-terms.ts`, `src/data/papers/terms.json`):
- **Visitor visas** can be applied for at every destination that asks for one. 1221's pair for your passport comes first;
  then the destination's researched visa (the Schengen visa for its 29 countries, the United Kingdom, Canada,
  Australia); otherwise the game's estimate.
- **Work permits** can be applied for everywhere, for each kind of work. Researched: the United States (O-1), the United
  Kingdom, Canada, Australia, New Zealand, Ireland, France and Germany, each with its source. The records name a
  performer's route only; directing, producing and writing take the same route at the same terms, an assumption said as
  one. A permit issued lets you do that kind of work there until it expires.
- **Passports**: whatever SLATE-REBUILD's record lacks, the fee, the time or the validity, is estimated.
- **The estimate** is the middle of the researched figures on the same continent (all of them, where none is on it), in
  dollars at the day's rate. The screen says it is the game's estimate and what it was made from. Every estimate is
  listed in `docs/v10/papers-estimates.json`, the research queue; `tests/v10-papers-terms.test.ts` lets their number fall
  and never rise.
- **Work rules** for the 14 countries whose research was blocked are the game's model (`work.json` `modeled`), said as one.

Before November 14, 2026, a work permit took 30 days where its time wasn't recorded and lasted a year, both the game's
own figures, said as nothing. A permit a save holds from then is kept until its date, and one still waiting is decided on
the terms it was applied for under.

## Not Yet Done

- **Research for the estimated routes.** Japan, South Korea, India and Mexico were searched on November 14, 2026, but no
  official fee could be confirmed (Japan's varies by nationality; Korea's and Mexico's were on agency sites only), so
  they stay estimates.
- **Counting days of stay against a visit's limit.**
- **A residence application.**
- **Travel refusing entry without the permission.** SLATE's journeys don't yet ask; the shoot refuses the work.
