# Data Provenance

This is developer documentation. None of it is shown in normal gameplay.

| Data | Source | Status |
| --- | --- | --- |
| Genre catalog (149 IDs, names, definitions, mechanic specifications) | Package `genres/registry.json` (from montrealroots/SLATE `src/person/genres/genres.json`, blob 82ff633d…). Copied unchanged to `src/data/genre-registry.json`, sha256 be894ee3…006f | The 169 inherited source references were **not** re-verified in this build. Definitions and mechanics are working design. |
| Genre-to-mechanic mapping and convention questions | `src/engine/genres.ts`, written for this build from each entry's mechanic specification | Design decision, not a historical fact. |
| Time zones and local time | IANA zone identifiers resolved by the runtime's `Intl` implementation | Accuracy follows the browser's time-zone database. |
| Place coordinates | General geographic reference, rounded to two decimals | Not checked one by one against GeoNames in this build. Coverage is 66 curated cities in 33 countries. |
| Climate parameters per place | Approximate typical values chosen for the weather model | **Modeled.** Not station normals. Weather is never presented as an observation. |
| Daylight | Standard sunrise equation (solar declination and hour angle) | A deterministic calculation, accurate to a few minutes. Tested against London's solstice day length and polar day and night in Tromsø. |
| Public holidays | Rules written for each catalog country (fixed dates, nth weekdays, Easter offsets, observed substitutes, Japan's equinox formula and substitute rules, Korea's substitute rule) | Lunar and lunisolar observances and government-announced moves are **not** included. Some regional holidays are covered (for example GB-ENG and GB-SCT, CA-ON, CA-BC, CA-QC, DE-BE, CH-TI, AU-NSW, AU-VIC). The rules were written from general knowledge and checked only by the tests in `tests/foundation.test.ts`. Italy's possible reinstatement of October 4 and New Zealand's Matariki dates were left out because they were not verified. |
| Festival and award names | Planning roster in the package (`FOUNDATION-HISTORY.md`) | Real institutions. Their **rules in the game are simulated**; the event detail screen says so. |
| Official dates | 99th Academy Awards on March 14, 2027 and 100th on March 5, 2028 (https://press.oscars.org/news/academy-and-abc-announce-show-dates-99th-and-100th-oscarsr, cited in the package); FESPACO 2027 on March 20–27, 2027, entries February 24–October 20, 2026 (https://fespaco.bf/en/call-for-entries-fespaco-2027/, cited in the package) | Taken from the package's recorded source checks. They were not re-fetched in this build. Entry deadlines for the Oscars editions are simulated. |
| All other edition dates | Generated once per edition from a seasonal window and the save seed | **Simulated**, and labeled as simulated on the event screen. |
| Sundance location (Boulder, Colorado) | Public announcement of the festival's move from 2027 | From general knowledge; not re-verified in this build. |
| Heritage and language lists | Written for this build | Self-identification lists; players can describe their own. They have no effect on ability or outcomes. |
| People, distributors and rival films | Generated from word lists | Fictional. |

## Licenses

No dataset is redistributed beyond the inherited genre registry and hand-written tables. Check the license of the inherited genre registry before any separate redistribution of it. No license has been chosen for this repository.
