# Real Films' Box Office, As Recorded (November 22, 2026)

The owner asked for real box office in the game. No free source of dated weekend or daily reports may be used: the BFI's
site terms (clause 2.2, last updated October 2015) forbid copying its UK weekend sheets, and The Numbers (OpusData) and
Comscore sell licences, which only the owner can buy. On November 22 the owner chose Wikidata for now, and asked how to
buy a licence; the steps are in the session's notes and `docs/recovery/BOX-OFFICE.md`. A licensed feed would come in
through `src/engine/box-office-feed.ts`, beside this.

## The Data

- **Source.** Wikidata's box office property (P2142) on films, with its point in time (P585), territory (P3005), rank and
  references (stated in, URL, retrieved, published). Wikidata is CC0, so the figures ship in the build:
  `src/data/box-office/wikidata.json`, 0.66 MB (145 KB compressed), which every copy carries, Base44's included.
- **Built by.** `node tools/box-office/wikidata.mjs`, three queries cached in `.box-office-cache/` (git-ignored), plus
  one for the few films titled in neither English nor Wikidata's multilingual label.
- **What was kept (November 22, 2026).** 4,682 of 7,990 figures, for 3,106 films; 3,094 of them carry a TMDB ID, so a
  catalog film's page finds its own. Left out and counted: 3,101 with no date of any kind, 143 that Wikidata marks
  deprecated (known to be wrong), 41 with no currency, 23 for a region that isn't a country. Most cite Box Office Mojo.
- **Currencies.** Kept as recorded (US dollars for 3,942; Australian dollars, yen, euros and others for the rest),
  never converted.

## When A Figure Counts As Known

A save never sees a figure before it was recorded:
- A figure runs through its point in time (a month or a year read as its last day).
- It was known from the earliest date one of its references was published or retrieved on or after that; with none,
  from the point in time; with no point in time, from its earliest reference date.
- Most were recorded from 2019 on (1,643 in 2022 alone), and 155 during 2026, so a story that starts in January 2026
  sees some only as its clock reaches them.

## Where It Shows And What It Changes

- **A film's page in Companies** (`src/ui/RecordedBoxOffice.tsx`): "Box Office As Recorded", each territory's latest
  figure known by the save's date, who reported it and when it was recorded, and how many more were recorded later.
- **Box Office Records** (`src/ui/RecordBook.tsx`): "Among Real Films", the real films' worldwide takings in US dollars
  as recorded by the chosen day, with each of your films placed among them. Yours stay the game's simulation and are
  never added in.
- **Studio offers** (`src/engine/studio-projects.ts`): a franchise whose last film is recorded as having taken less than
  twice its budget worldwide isn't continued; the studio offers another franchise, or an original. The rule is the
  BFI's, as Stephen Follows tested it ("Do Hollywood movies make a profit?", July 25, 2016: right 72% and 75% of the
  time on his two datasets). It's read only where the franchise's recorded budget is that same film's. An offer for a
  franchise whose last film made it says so, with the film, its gross, its source and the day it was recorded.

The game's own weekly box office (`src/engine/box-office.ts`) is unchanged: it simulates your films, and nothing real is
mixed into it.

## Tests

- `tests/box-office-recorded.test.ts`: the shipped data (CC0, dated, a currency each, never known before it runs
  through, every film titled), Cars' worldwide figure shown only from March 7, 2019, the rankings in US dollars only, a
  film's figures on a day, and the studio rule through the real offer code. Switching the rule off fails it.
- `e2e/recorded-box-office.spec.ts`: a film's page, a figure recorded after the save's date not shown, and Box Office
  Records, on desktop, phone width and iPhone WebKit.

## Not Done

- Weekend, weekly or daily reports, and corrections as such: Wikidata holds totals. These need a licensed feed.
- Your films' simulated takings don't shape the real figures, and the real figures don't shape your films' weeks.
