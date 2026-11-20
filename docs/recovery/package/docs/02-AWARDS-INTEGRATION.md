# Awards: complete integration contract

## Import and identity

1. Compare every incoming observation with current history. Semantic key: institution + edition + category + observation kind + recipient/title identity. Preserve source revisions and imported timestamps.
2. Map categories to existing canonical IDs. Do not invent a new category just because capitalization or translation differs. Distinguish audience awards, juried awards, honorary awards, mentions and qualifying selections.
3. Resolve titles using title, original title, year, country, director and existing external IDs. Never merge on title alone. Treat alternate titles such as regional release names as aliases, not duplicate films.
4. Resolve a person with associated work and credit. Craft results supplied as film titles need the actual credited recipient mapping before giving a character a personal award.
5. Keep a review table for unmatched/ambiguous records. Missing internal IDs should produce a visible development report, not discarded data or guessed recipients.
6. Import existing observations idempotently. Running the importer twice must make no duplicate calendar events, trophies or reputation changes.

## Timeline

Model `edition`, `eligibilityWindow`, `submissionDeadline`, `nominationAnnouncement`, `ceremony`, `publicationDate`, `sourceRevision` separately. Day-only evidence stays day-only. A conservative end-of-day visibility policy may be used, but identify it as a simulation convention.

On January 1, no future nominations or winners are visible. As the game reaches a publication date, publish only the corresponding information. An awards page's current contents must never be used as if the player knew them earlier. Archive revisions should preserve the source's original and corrected versions where available.

Do not fabricate future ceremony dates or winners as historical facts. Future simulated scheduling can keep the world playable, but retain a distinct simulation origin. Do not copy last year's winner into the next edition.

## Player competition against real work

Historical evidence is immutable reference data. The save has a separate alternate-history competition state. Without eligible player participation, the historical baseline can replay on its dates. With eligible participation, evaluate the player and eligible competitors using the same category-specific model; the save may produce a different winner, as requested. Do not modify the sourced archive to make the player's alternate win appear historical.

Freeze the competitor/ballot set at the appropriate stage. A player entering after nominations cannot retroactively become a nominee unless a documented rule permits a correction. Lock the random seed and outcome at adjudication so reloads do not reroll awards. Do not force the player to win merely because the player entered.

Inputs should use existing project evidence: relevant craft quality, credited contribution, completed/released status, language/territory/runtime rules, eligibility window, premiere/distribution conditions and category restrictions. Campaign visibility may affect awareness under a bounded simulated model; expenditure must not buy guaranteed wins. Festival selection, jury awards, audience votes and television branch judging are distinct processes.

Official sources rarely reveal a numerical judging formula. Label model weights as simulation parameters, never as researched institutional facts. Missing official rules remain explicit; do not fill them with another festival's rules.

## Consequences and full loop

Eligible completed work → category check → submission and fee, if applicable → submission confirmation → accepted/rejected/withdrawn state → nomination/selection publication → invitation/travel planning → adjudication → published result → credit/trophy → reputation and relationship effects → discoverability and later deal opportunities → career archive.

Each fee and travel expense posts once to the ledger. Awards affect relevant credits and reputation, with diminishing returns and no infinite repeated rewards. Co-recipients receive the correct shared recognition. An ineligible submission should explain the actual failed rule in natural language.

Examples: “Submissions Close on 12 September”; “Your Film Was Selected”; “This Category Requires a Theatrical Release”; “Nominations Have Not Been Announced.” Avoid technical evidence IDs in player-facing text.

## Acceptance cases

* One day before and on nomination publication; one day before and on ceremony results.
* EFA January2026 versus January2027 remain separate; no incorrect pending state.
* SXSW March dates remain March despite October URL folders.
* BAFTA film, television and craft never merge categories or ceremonies.
* Audience award and jury award coexist for the same film without duplicate-trophy bugs.
* Unmatched person/title stops that mapping only; reports an actionable row.
* Player loses and wins in deterministic test scenarios; effects posted once after save/reload.
* Historical baseline does not change when a save produces an alternate outcome.
* Full roster completion has an expected-count audit per edition, backed by source extraction. This package's selected results are not that exhaustive audit.
