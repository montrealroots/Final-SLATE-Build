# Country And Holiday Detail Audit

Checked November 6, 2026 in the Linux cloud container. The per-entry ledger is `COUNTRY-COVERAGE.csv` (rewritten by
`npm run world:check`, which keeps the classification and source columns); totals are in `world-coverage.json`.

## Recount

| Measure | Count |
| --- | --- |
| Gazetteer entries | 252 |
| Playable | 246 (not playable: AN and CS historical; AQ, BV, HM and UM have no populated place) |
| Playable with holiday rules | 219 (218 before; Suriname added) |
| Playable without holiday rules | 27 |
| Playable with a weather station of their own | 237; 9 use another country's station or modeled climate (below) |

## Classification (placeholder resolved)

Every entry carried `geographic-entry-review-current-classification`. Each now says what it is:

| Classification | Entries | Source |
| --- | --- | --- |
| `un-member-state` | 193 | United Nations, Member States (un.org/en/about-us/member-states, read November 6, 2026): 193 listed; the 193 codes left after the rows below match it exactly |
| `un-observer-state` | 2: VA, PS | United Nations, Non-Member States: the Holy See and the State of Palestine (A/RES/67/19) |
| `limited-recognition` | 2: XK, TW | Not UN members; recognised by some states |
| `non-self-governing-territory:disputed` | 1: EH | Western Sahara |
| `dependency:<sovereign>` and similar | 51 | ISO 3166-1 territories, each with its sovereign's code: US 6, GB 12 (+3 crown dependencies), FR 7 (+5 overseas regions), NL 3 constituent countries (+BQ), DK 2, FI 1, NO 2, AU 4, NZ 3, CN 2 special administrative regions, AQ the Antarctic Treaty area |
| `historical` | 2: AN, CS | Unchanged |

Place IDs, region keys and save mappings are unchanged: classification is ledger data only.

## Holidays Added Or Named

- **Suriname (new):** the ten days the Algemene termijnenwet (Staatsblad 2024 no. 167, article 3) lists with fixed or
  Easter dates. Its four movable feasts (Holi-Phagwa, Divali, Ied-Ul-Fitre, Ied Ul-Adha) are set each year and weren't
  read, so they are **not on the calendar**, and the place screen says so by name ("Not on the calendar until
  announced each year: …"). The law moves nothing off a weekend. Source quoted in `holiday-sources/SR.json`.
- **English names (new field `en`):** only from an official English source, never translated here. Cyprus: all 14
  holidays, from the Central Bank of Cyprus' English list for 2026 ("Πρωτοχρονιά (New Year's Day)"). Other countries keep
  their original names alone.

Original names stay as the law or list gives them. Official, calculated (Easter, lunar, equinox), projected (after
the last announced year) and unavailable (named but not dated; or no rules) stay distinct in the data and on screen.

## Still Without Holiday Rules (27 playable)

Tried this session and not readable from here, or not found in an official source:

| Entry | What happened |
| --- | --- |
| MW Malawi | Public Holidays Act (Cap. 18:05) found on MalawiLII; its schedule is behind a bot check, which was not bypassed. Search excerpts give sections 2-4 (Minister may add or move days; weekend days move) but not the dates |
| SZ Eswatini | Public Holidays Act, 1938 (as at 1998) found on EswatiniLII; its search excerpt gives the Sunday rule (a holiday on a Sunday is observed on the Monday), but the schedule of days is behind a bot check, which was not bypassed (second pass, November 6, 2026) |
| FO Faroe Islands | No løgtingslóg text reached (logir.fo path not found; norden.org 403). Secondary sources only |
| SJ Svalbard and Jan Mayen | Norway's Helligdagsfredloven read on Lovdata, but it says nothing about Svalbard, and the Svalbard Act applies other Norwegian law only where specially provided. Norway's days are **not** copied |
| PW Palau | Palau National Code Title 1 ch. 7 on PacLII (403) and its AustLII mirror (connection dropped) |
| TJ Tajikistan, CV Cabo Verde | Only commercial calendars found; Cabo Verde's Decreto-Lei n.º 18/84 named by them but not reached |
| AF, BT, CF, ER, GM, GQ, GW, HT, IO, IR, KP, LA, LS, MM, SL, SO, SS, TF, TK, TV | Not researched this session (blocked in the package's ledger) |

The game says "Holiday dates for {country} aren't included yet, so no day here is treated as a holiday." for these.
A fallback is not verified data, so none is used.

## Regional And City Holidays

National and first-level regional holidays are kept (1,096 rules limited to regions, in 27 countries; 17 of them have
regions that keep their own law's days in place of the country's). City holidays exist only where a country's rules are per parish or municipality (Andorra's parishes). Other city
holidays are not included.

## Weather Audit

The playable entries with no station of their own, checked at each one's most populous place
(`tests/climate-audit.test.ts`). The place screen now says where the climate comes from, after "Weather in SLATE is
simulated from typical local climate, not live observations.":

| Entry | Place | Source of its typical climate |
| --- | --- | --- |
| HT | Port-au-Prince | Station 52 km away in the Dominican Republic |
| PS | East Jerusalem | Station 1 km away in Israel |
| SM | Serravalle | Station 12 km away in Italy |
| VA | Vatican City | Station 6 km away in Italy |
| VG | Road Town | Station 38 km away in the U.S. Virgin Islands |
| TC | Providenciales | Station 224 km away in the Dominican Republic; wet days modeled (none within 400 km) |
| NR | Arijejen | Modeled from latitude and height (nearest station 701 km) |
| NU | Alofi | Modeled (nearest 430 km) |
| TK | Nukunonu | Modeled (nearest 513 km) |
