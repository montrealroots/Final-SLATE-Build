# The Release Plan: What Was Read, What The Game Models

The owner's v5 brief, section 6, asked for this research before any modelling. It was done on November 13, 2026.

- **Engine:** `src/engine/release-plan.ts`.
- **Screen:** the Release Plan card on a project's Release page (`src/ui/ReleasePlan.tsx`).

## What Was Read

Some of these sources are industry blogs, and some of their authors sell services. Older fee figures differ from today's.
The game uses none of these sources' numbers as a real quote. Every amount in the game is labelled game calibration.

| Topic | Sources |
|---|---|
| Selective streaming services: acquired through distributors and sales agents, not taken as uploads | No Film School, NYFA, The Guerrilla Rep |
| One streaming service's own direct-upload programme: unsolicited non-fiction and short-form licensing submissions stopped in 2021 | No Film School, Filmmaker Magazine, CineD |
| Transactional stores: delivered by an approved encoding house, usually through an aggregator, for a fee | The store's own movie FAQ and encoding-house pages, No Film School |
| A direct-to-audience storefront: the seller keeps 90% after transaction costs, and must verify identity and contact details | The platform's seller FAQ, Jon Reiss |
| Four-walling and service deals: renting screens or paying a booking partner, keeping the box office, paying for advertising and prints | Wikipedia, Videomaker, Sundance Institute, Filmmaker Magazine |

## What The Game Models

**The plan.** A delivered project has one Release Plan. It sets:

- the routes intended, in order;
- the territories;
- the first public date;
- for a festival-first plan, the date festivals hold it until;
- the exclusive window asked of buyers;
- subtitled or dubbed versions;
- promotional spending on the routes the player runs themselves.

**The routes.**

| Route | How it is reached | What it costs and pays |
|---|---|---|
| Festival-first | Festival submissions (awards). The plan holds every public release until its festival date, so the premiere stays a premiere. | Entry fees, as before. |
| Partner-assisted theatrical | A booking partner on a service deal books the screens. Nobody has to accept it, but the player pays up front. | The partner's fee and each territory's screen rental, paid on booking. Advertising is the promotion. The partner keeps 10% of the rental. |
| Distributor sales (films) | A licence proposal to a distributor for cinemas, which it accepts, counters or rejects. | A guarantee, then overages past it, after the distributor's 35% fee. |
| Broadcast licence | A licence proposal to a broadcaster. | A licence fee. |
| Streaming licence | A licence proposal sent through a sales agent, because selective services take submissions only from distributors and sales agents they know. | A licence fee, less the agent's 20%. |
| Transactional digital | Through an aggregator, which needs a content declaration, captions for each territory's language, and its fee. | The aggregator's flat fee. The stores keep 30% of each sale. |
| Direct to audience | Your own storefront, which needs a pitch for its page and a content declaration. | The storefront keeps 10%. Reach depends on promotion. |

**A buyer's answer.** A buyer answers in three weeks, or four for a streaming service, by what it would pay for a film
or season like this one:

- **Accepted:** the ask was at or under that value.
- **Countered:** the ask was up to half as much again, and the buyer offers its value instead.
- **Rejected:** the ask was beyond that, or the work was received under the bar the buyer works to. The bars are 50 for
  a distributor, 55 for a broadcaster and 65 for a streaming service.

Accepted or countered, the buyer makes an offer. The player still has to accept it on the Release page before anything
binds: its delivery materials are reserved, its guarantee arrives, and its release is booked. After a rejection the plan
lists the alternatives:

- buyers on the same route not yet asked;
- a lower ask, if price was the reason;
- the routes the player runs themselves.

**Rights.**

- A proposal can't take a territory an exclusive deal holds, or one another deal on the same route already has.
- A self-release can't go where an exclusive deal holds the rights.
- A buyer that rejected the work on its reception isn't asked again for the same project.

**Series.** Broadcast, streaming and the self routes take a season. Its episodes come out on the dates the release
gives them (`episode-releases.ts`). A season's value grows with its episodes.

**What follows.** Each route ends in an accepted deal, so every route has its monthly reports, settlement of guarantee
and overages, audience weeks on television and online, a cinema run's weeks, and later windows (`distribution.ts`,
`box-office.ts`, `audiences.ts`), as a distributor's deal always had. Until November 13, 2026 a self-release earned
nothing at all.

## Not Modelled

These are left out, and the game says nowhere that it models them:

- real platforms and their names;
- real fees;
- festival sales markets;
- a sales agent's own territory sales;
- tax on sales.
