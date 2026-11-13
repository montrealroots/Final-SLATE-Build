# First-Look Deals: What Was Read, What The Game Models

The owner's v5 brief, section 5, asked for this research before any modelling. The research was done on November 13, 2026.
The engine is `src/engine/first-look.ts`. The screens are `src/ui/FirstLook.tsx`: one card on the Profile and one on a
project's Budget page.

## What Was Read

These sources are explainers and encyclopedia entries. No contract was copied, and no studio's real terms are used.

- Wikipedia, "First-look deal": https://en.wikipedia.org/wiki/First-look_deal
- No Film School, "First look deal definition": https://nofilmschool.com/first-look-deal-definition
- No Film School, "What is an overall deal": https://nofilmschool.com/what-is-an-overall-deal
- LAist, on the pros and cons of first-look pacts: https://laist.com/news/arts-and-entertainment/first-look-pacts-hollywood-pros-cons
- Parrot Analytics glossary, "First-look deal": https://www.parrotanalytics.com/glossary/production-company/first-look-deal/
- LexisNexis, on a director's first-look agreement: https://www.lexisnexis.com/community/amp-insights/84/first-things-first-director-s-first-look-agreement
- AccountingTools, "Overall deal": https://www.accountingtools.com/articles/overall-deal
- Creator Essentials glossary, "Right of first refusal": https://www.creatoressentials.com/glossary/right-of-first-refusal/
- Pact (UK producers' trade body), on broken turnaround: https://www.pact.co.uk/resource/important-update-on-broken-turnaround.html

## The Distinctions The Game Keeps

| Arrangement | What it is | In the game |
|---|---|---|
| First look | A studio pays the producer's overhead, and sometimes a development fund. In return it gets the first chance to consider the projects the deal covers, for a set number of days each. | `first-look.ts`: one deal at a time, with its own Profile card. |
| Option | The right to buy the rights to one property, paid for, for a period. | A studio's option on one film (`finance.ts`, verdict `option`): development money and a release, not the whole budget. |
| Distribution deal | One finished picture released in territories, for a period. | Distribution offers after delivery (`finish.ts`). |
| Overall deal | The producer's services exclusively, usually for a larger fee. | Not modelled. Nothing in the game claims it is. |
| First refusal | The right to match an offer someone else has already made. | Not modelled. A first look is not a match right, and the game never treats it as one. |

## What The Game Models

- **The offer.** It comes from one studio the save's world follows. It needs delivered film work received at 60 or
  better, or a win, and genre fit with the studio's recorded films. A studio checks 45 days after each delivery.
- **The terms.** They depend on the studio's recorded scale. Every amount is game calibration:

  | Studio's recorded pace | Term | Days to answer | Overhead a month | Development fund |
  |---|---|---|---|---|
  | 8 or more films a year | 24 months | 90 | $6,000 | $100,000 |
  | 3 to 7 films a year | 12 months | 60 | $3,500 | $50,000 |
  | Fewer than 3 | 12 months | 30 | $1,500 | $25,000 |

  The 90-day window comes from the sources. The others are scaled down from it.
- **Coverage.** The deal covers films, and not series. A studio that makes little but animation covers only animated
  films.
- **Approval.** Nothing binds the player until they accept. The player can ask once for half as much overhead again. The
  studio agrees if the work won something or was received at 70 or better; otherwise it keeps its offer. An offer
  unanswered after 30 days lapses. A studio that was declined, or let lapse, doesn't ask again within a year.
- **Submission first.** A covered project must be pitched to the first-look studio before any other studio. Until the
  studio answers, no other studio can be pitched it. The studio reads the pitch the way it reads any pitch
  (`strategy.ts` `pitchRead`), with the deal's days to answer. If it passes, or the player refuses its offer, the project
  goes into turnaround and other studios are open to it.
- **Development money.** It goes into a covered project as a backer line. If another studio or a commissioner later takes
  a project the first-look studio passed on, the development money is repaid from that backer's money: a "burdened"
  turnaround. This happens once, as a line on the project's ledger.
- **No contradictory deals.** Only one first-look deal runs at a time. Only one studio can back a film, because each
  studio's release holds territories.
- **Overhead.** It is paid monthly into the player's company account, or into their own account if they have no company.
- **The end.** The deal ends at its term. It is offered again if the studio took a project or the player's record still
  counts. If the player ends it early, the overhead stops. Either way, submissions in hand are still answered, and a
  project developed with its money stays bound to submit to that studio first.

## Not Modelled

These are left out, and the game says nowhere that it models them:

- turnaround periods after which rights revert;
- any interest charged on development money;
- overall deals and first-refusal rights;
- a studio's real terms;
- deals for series.

## Evidence

- `tests/first-look.test.ts` has eleven engine tests: offer conditions, terms, lapse, the request for more overhead,
  decline, overhead to the company or the player's own account, submission first, burdened turnaround, one studio per
  film, ending early, renewal and save round-trip.
- `e2e/v5-first-look.spec.ts` is the browser journey.
