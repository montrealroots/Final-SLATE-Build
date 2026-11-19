# What People Are Paid

Written by `tests/people-matrix.test.ts` from the code; don't edit by hand. Run with `SLATE_WRITE_AUDIT=1` to rewrite it.

## SAG-AFTRA Minimums

A performer is paid at least the minimum of the SAG-AFTRA agreement the production's budget falls under (`src/engine/union.ts`). Sources and their status are in `docs/depth/PRODUCTION-SOURCES.md`.

| From | Ultra Low Budget Agreement, to $300,000 | Moderate Low Budget Agreement, to $700,000 | Low Budget Agreement, to $1,999,999 | Theatrical, A Day | Theatrical, A Week | Background, Theatrical |
|---|---|---|---|---|---|---|
| 2025-07-01 | $249 | $436 | $810 | $1,246 | $4,326 | $224 |
| 2026-07-01 | $257 | $449 | $834 | $1,283 | $4,456 | $231 |
| 2027-07-01 | $264 | $462 | $859 | $1,321 | $4,590 | $238 |
| 2028-07-01 | $272 | $476 | $885 | $1,361 | $4,728 | $245 |
| 2029-07-01 | $280 | $491 | $911 | $1,402 | $4,870 | $252 |

## Fees From Recognition

A recognised performer's fee for a film is the game's curve on the weight of their recognition: $250,000 × (1 + weight ÷ 4)^1.5, at most $30 million, asked as a day rate over 40 days, and never under the SAG-AFTRA minimum. A win weighs 10 at the Academy Awards, 7 at the BAFTA Film Awards, 7 at the Screen Actors Guild Awards, 7 at the Cannes Festival prizes, 7 at the Venice Festival prizes, 6 at the Berlin Silver Bears, 6 at the Primetime Emmys, 5 at the Golden Globes, 5 at the Césars, 5 at the BAFTA Television Awards, 4 at the Critics' Choice Awards, 4 at the Independent Spirit Awards; a nomination weighs 0.4 of a win. The weights and the curve are the game's: Modeled assumption.

A recognised composer's fee for a feature's score is the game's curve on the same weight: $40,000 × (1 + weight ÷ 4)^1.4, at most $3 million, asked as a day rate over the 30 days a fully scored feature takes, and never under what their experience asks. Reported composer fees run from $20,000 for a lower-budget film to over $1 million for a studio release with a well-known composer (Jeffrey and Todd Brabec, "Film Composing Fees", taxi.com). At a weight of 65 (Hans Zimmer's) it asks $2,156,000. A recognised songwriter's fee for a film's song is $12,000 × (1 + weight ÷ 4)^1.3, at most $400,000, over the 4 days a song takes: film songwriting fees run from nothing to over $100,000 for established writers, occasionally more (Donald Passman, All You Need to Know About the Music Business, 11th edition). At a weight of 29 (Elton John's) it asks $186,000. A recognised director's fee for a feature is $500,000 × (1 + weight ÷ 4)^1.4, at most $20 million, over the 40 days of a feature's shoot: studio directors average $750,000 to $1.5 million, and Ridley Scott was paid $10 to $12 million for Alien: Covenant (The Hollywood Reporter, 2016 and 2017); at a weight of 19 (Christopher Nolan's) it asks $5,788,000. A recognised writer's fee for a feature's script is $150,000 × (1 + weight ÷ 4)^1.2, at most $5 million, over the 25 days a draft takes: the WGA's minimum for an original screenplay on a film of $5 million or more is $173,215 (2026), and established writers are paid about $1 million a script (The Hollywood Reporter); at a weight of 33 (Aaron Sorkin's) it asks $2,165,000. Recognition explains what prestige is paid, not what drawing an audience is. Modeled assumption.

A performer's fee is also read from how widely they are known: $4,700 × (Wikipedia editions with an article on them)^1.75, at most $30 million, and the fee asked is whichever of the two is more. Recognition prices prestige; fame prices an audience's draw. The fame is today's (Wikidata sitelinks, tools/recognition/fame.mjs): a fee before a star was this well known is over-read, and a singer's or a public figure's fame counts as an actor's. Modeled assumption.

Beside fees that were reported, at the weight of recognition recorded before the year of each deal and the fame recorded now. Variety reported the Red Notice fees.

| Performer | Film | Year | Reported | Weight Then | Editions | The Game's Fee | Game ÷ Reported |
|---|---|---|---|---|---|---|---|
| Leonardo DiCaprio | Killers of the Flower Moon | 2022 | $30,000,000 | 76 | 150 | $30,000,000 | 1.00 |
| Joaquin Phoenix | Joker: Folie à Deux | 2022 | $20,000,000 | 60 | 92 | $16,000,000 | 0.80 |
| Joaquin Phoenix | Joker | 2018 | $4,500,000 | 31 | 92 | $12,845,000 | 2.85 |
| Margot Robbie | Barbie | 2022 | $12,500,000 | 25.6 | 93 | $13,090,000 | 1.05 |
| Ryan Gosling | Barbie | 2022 | $12,500,000 | 13 | 90 | $12,360,000 | 0.99 |
| Lady Gaga | Joker: Folie à Deux | 2022 | $10,000,000 | 9 | 199 | $30,000,000 | 3.00 |
| Daniel Craig | Knives Out sequels (each of two) | 2021 | $50,000,000 | 4.8 | 105 | $16,187,000 | 0.32 |
| Dwayne Johnson | Red Notice | 2021 | $23,500,000 | 0 | 114 | $18,693,000 | 0.80 |
| Gal Gadot | Red Notice | 2021 | $20,000,000 | 0 | 94 | $13,337,000 | 0.67 |
| Ryan Reynolds | Red Notice | 2021 | $20,000,000 | 0 | 91 | $12,601,000 | 0.63 |

Every recognised performer and crew member, with their grade and what they ask: `docs/people/PERFORMERS.csv` and `docs/people/CREW.csv`. Recognition from Wikidata (CC0 1.0), retrieved 2026-11-19.
