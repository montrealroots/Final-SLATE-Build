# Housing Coverage, Place By Place

Written by `tests/homes-coverage.test.ts` from the engine's `coverageOf` for 2026-11-17; don't edit by hand. One CSV a
country in this folder has every place in the world catalog. The target is fifty distinct homes at real, verified
addresses in each place's own market. **No place has any**: no permitted source the game holds gives a home's
verified specification, price and availability at a real address (docs/homes/COVERAGE.md says which sources were
considered and why each wasn't imported). Every place's market has fifty of the game's own simulated homes, which
are never presented as real listings. Recorded sales are past transactions, not homes for sale now.

## Columns

- `market`: the size of place its fifty simulated homes are fitted to: large-city (500,000 people or more, or one of the
  catalog's own cities), city (100,000), town (10,000), village.
- `verified_homes`, `dated_listings`: homes at real, verified addresses, and dated real listings, the place holds.
- `shortfall_to_50`: what is missing from fifty verified homes.
- `recorded_sales`: past sales recorded in the place itself: DVF 2025 single-home sales in a French commune, or HDB
  resales in a Singapore town in the year to the record's date. Not homes for sale now.
- `rent_source`, `price_source`: where its rents and prices come from: `hud-county` (HUD FY2026 Fair Market Rent for
  the place's own county), `ons-nation` (ONS's average rent for the UK nation, not the city's own), `nahb-national`
  (NAHB's national average, not the city's own), `dvf-commune` (DVF 2025 recorded sales in the place's own commune),
  `hdb-town` (HDB resales in its own town), `acs-place` (the Census Bureau's median rent or home value for the place
  itself, American Community Survey 2020-2024; a home value moved by FHFA's price index), `acs-county` (the Census
  median home value for its county, where the place has none good enough), `none` (the game's placeholder).
- The kinds of home each market holds follow its size (market.ts localMix): a large city and a city have flats,
  condominiums, townhouses and houses; a town and a village mostly houses, with some flats and townhouses; every
  market has studios and building plots, and a Singapore HDB town has HDB flats.

- Places: 171,750
- Verified homes at real addresses: 0. Dated real listings: 0.
- Shortfall against fifty verified homes each: 8,587,500
- Places with recorded sales of their own (DVF communes, HDB towns): 8,322
- Places whose rents are their own (Census) or their county's (HUD): 17,321
- Places whose prices are their own (Census, DVF, HDB) or their county's (Census): 25,600
- Places with no housing statistics at all (rents and prices both the game's placeholder): 141,440

| Code | Country | Places | Verified | Listings | Shortfall | With recorded sales | Local rents | Local prices |
|---|---|---|---|---|---|---|---|---|
| AD | Andorra | 15 | 0 | 0 | 750 | 0 | 0 | 0 |
| AE | United Arab Emirates | 105 | 0 | 0 | 5250 | 0 | 0 | 0 |
| AF | Afghanistan | 319 | 0 | 0 | 15950 | 0 | 0 | 0 |
| AG | Antigua and Barbuda | 21 | 0 | 0 | 1050 | 0 | 0 | 0 |
| AI | Anguilla | 14 | 0 | 0 | 700 | 0 | 0 | 0 |
| AL | Albania | 380 | 0 | 0 | 19000 | 0 | 0 | 0 |
| AM | Armenia | 455 | 0 | 0 | 22750 | 0 | 0 | 0 |
| AO | Angola | 565 | 0 | 0 | 28250 | 0 | 0 | 0 |
| AR | Argentina | 1179 | 0 | 0 | 58950 | 0 | 0 | 0 |
| AS | American Samoa | 17 | 0 | 0 | 850 | 0 | 0 | 0 |
| AT | Austria | 2266 | 0 | 0 | 113300 | 0 | 0 | 0 |
| AU | Australia | 3834 | 0 | 0 | 191700 | 0 | 0 | 0 |
| AW | Aruba | 14 | 0 | 0 | 700 | 0 | 0 | 0 |
| AX | Aland Islands | 21 | 0 | 0 | 1050 | 0 | 0 | 0 |
| AZ | Azerbaijan | 219 | 0 | 0 | 10950 | 0 | 0 | 0 |
| BA | Bosnia and Herzegovina | 292 | 0 | 0 | 14600 | 0 | 0 | 0 |
| BB | Barbados | 14 | 0 | 0 | 700 | 0 | 0 | 0 |
| BD | Bangladesh | 226 | 0 | 0 | 11300 | 0 | 0 | 0 |
| BE | Belgium | 1735 | 0 | 0 | 86750 | 0 | 0 | 0 |
| BF | Burkina Faso | 113 | 0 | 0 | 5650 | 0 | 0 | 0 |
| BG | Bulgaria | 305 | 0 | 0 | 15250 | 0 | 0 | 0 |
| BH | Bahrain | 12 | 0 | 0 | 600 | 0 | 0 | 0 |
| BI | Burundi | 32 | 0 | 0 | 1600 | 0 | 0 | 0 |
| BJ | Benin | 87 | 0 | 0 | 4350 | 0 | 0 | 0 |
| BL | Saint Barthelemy | 1 | 0 | 0 | 50 | 0 | 0 | 0 |
| BM | Bermuda | 11 | 0 | 0 | 550 | 0 | 0 | 0 |
| BN | Brunei | 47 | 0 | 0 | 2350 | 0 | 0 | 0 |
| BO | Bolivia | 148 | 0 | 0 | 7400 | 0 | 0 | 0 |
| BQ | Bonaire, Saint Eustatius and Saba  | 8 | 0 | 0 | 400 | 0 | 0 | 0 |
| BR | Brazil | 5883 | 0 | 0 | 294150 | 0 | 0 | 0 |
| BS | Bahamas | 37 | 0 | 0 | 1850 | 0 | 0 | 0 |
| BT | Bhutan | 31 | 0 | 0 | 1550 | 0 | 0 | 0 |
| BW | Botswana | 120 | 0 | 0 | 6000 | 0 | 0 | 0 |
| BY | Belarus | 260 | 0 | 0 | 13000 | 0 | 0 | 0 |
| BZ | Belize | 81 | 0 | 0 | 4050 | 0 | 0 | 0 |
| CA | Canada | 2915 | 0 | 0 | 145750 | 0 | 0 | 0 |
| CC | Cocos Islands | 1 | 0 | 0 | 50 | 0 | 0 | 0 |
| CD | Democratic Republic of the Congo | 118 | 0 | 0 | 5900 | 0 | 0 | 0 |
| CF | Central African Republic | 51 | 0 | 0 | 2550 | 0 | 0 | 0 |
| CG | Republic of the Congo | 59 | 0 | 0 | 2950 | 0 | 0 | 0 |
| CH | Switzerland | 1427 | 0 | 0 | 71350 | 0 | 0 | 0 |
| CI | Ivory Coast | 3775 | 0 | 0 | 188750 | 0 | 0 | 0 |
| CK | Cook Islands | 2 | 0 | 0 | 100 | 0 | 0 | 0 |
| CL | Chile | 305 | 0 | 0 | 15250 | 0 | 0 | 0 |
| CM | Cameroon | 142 | 0 | 0 | 7100 | 0 | 0 | 0 |
| CN | China | 4971 | 0 | 0 | 248550 | 0 | 0 | 0 |
| CO | Colombia | 1173 | 0 | 0 | 58650 | 0 | 0 | 0 |
| CR | Costa Rica | 130 | 0 | 0 | 6500 | 0 | 0 | 0 |
| CU | Cuba | 207 | 0 | 0 | 10350 | 0 | 0 | 0 |
| CV | Cabo Verde | 141 | 0 | 0 | 7050 | 0 | 0 | 0 |
| CW | Curacao | 12 | 0 | 0 | 600 | 0 | 0 | 0 |
| CX | Christmas Island | 1 | 0 | 0 | 50 | 0 | 0 | 0 |
| CY | Cyprus | 102 | 0 | 0 | 5100 | 0 | 0 | 0 |
| CZ | Czechia | 1490 | 0 | 0 | 74500 | 0 | 0 | 0 |
| DE | Germany | 7659 | 0 | 0 | 382950 | 0 | 0 | 0 |
| DJ | Djibouti | 26 | 0 | 0 | 1300 | 0 | 0 | 0 |
| DK | Denmark | 439 | 0 | 0 | 21950 | 0 | 0 | 0 |
| DM | Dominica | 18 | 0 | 0 | 900 | 0 | 0 | 0 |
| DO | Dominican Republic | 210 | 0 | 0 | 10500 | 0 | 0 | 0 |
| DZ | Algeria | 350 | 0 | 0 | 17500 | 0 | 0 | 0 |
| EC | Ecuador | 541 | 0 | 0 | 27050 | 0 | 0 | 0 |
| EE | Estonia | 130 | 0 | 0 | 6500 | 0 | 0 | 0 |
| EG | Egypt | 260 | 0 | 0 | 13000 | 0 | 0 | 0 |
| EH | Western Sahara | 22 | 0 | 0 | 1100 | 0 | 0 | 0 |
| ER | Eritrea | 18 | 0 | 0 | 900 | 0 | 0 | 0 |
| ES | Spain | 7179 | 0 | 0 | 358950 | 0 | 0 | 0 |
| ET | Ethiopia | 256 | 0 | 0 | 12800 | 0 | 0 | 0 |
| FI | Finland | 884 | 0 | 0 | 44200 | 0 | 0 | 0 |
| FJ | Fiji | 16 | 0 | 0 | 800 | 0 | 0 | 0 |
| FK | Falkland Islands | 1 | 0 | 0 | 50 | 0 | 0 | 0 |
| FM | Micronesia | 52 | 0 | 0 | 2600 | 0 | 0 | 0 |
| FO | Faroe Islands | 26 | 0 | 0 | 1300 | 0 | 0 | 0 |
| FR | France | 8942 | 0 | 0 | 447100 | 8314 | 0 | 8314 |
| GA | Gabon | 50 | 0 | 0 | 2500 | 0 | 0 | 0 |
| GB | United Kingdom | 4645 | 0 | 0 | 232250 | 0 | 0 | 0 |
| GD | Grenada | 9 | 0 | 0 | 450 | 0 | 0 | 0 |
| GE | Georgia | 175 | 0 | 0 | 8750 | 0 | 0 | 0 |
| GF | French Guiana | 19 | 0 | 0 | 950 | 0 | 0 | 0 |
| GG | Guernsey | 11 | 0 | 0 | 550 | 0 | 0 | 0 |
| GH | Ghana | 120 | 0 | 0 | 6000 | 0 | 0 | 0 |
| GI | Gibraltar | 6 | 0 | 0 | 300 | 0 | 0 | 0 |
| GL | Greenland | 13 | 0 | 0 | 650 | 0 | 0 | 0 |
| GM | Gambia | 126 | 0 | 0 | 6300 | 0 | 0 | 0 |
| GN | Guinea | 83 | 0 | 0 | 4150 | 0 | 0 | 0 |
| GP | Guadeloupe | 25 | 0 | 0 | 1250 | 0 | 0 | 0 |
| GQ | Equatorial Guinea | 26 | 0 | 0 | 1300 | 0 | 0 | 0 |
| GR | Greece | 1132 | 0 | 0 | 56600 | 0 | 0 | 0 |
| GS | South Georgia and the South Sandwich Islands | 1 | 0 | 0 | 50 | 0 | 0 | 0 |
| GT | Guatemala | 340 | 0 | 0 | 17000 | 0 | 0 | 0 |
| GU | Guam | 26 | 0 | 0 | 1300 | 0 | 0 | 0 |
| GW | Guinea-Bissau | 50 | 0 | 0 | 2500 | 0 | 0 | 0 |
| GY | Guyana | 22 | 0 | 0 | 1100 | 0 | 0 | 0 |
| HK | Hong Kong | 325 | 0 | 0 | 16250 | 0 | 0 | 0 |
| HN | Honduras | 468 | 0 | 0 | 23400 | 0 | 0 | 0 |
| HR | Croatia | 764 | 0 | 0 | 38200 | 0 | 0 | 0 |
| HT | Haiti | 109 | 0 | 0 | 5450 | 0 | 0 | 0 |
| HU | Hungary | 1112 | 0 | 0 | 55600 | 0 | 0 | 0 |
| ID | Indonesia | 2021 | 0 | 0 | 101050 | 0 | 0 | 0 |
| IE | Ireland | 370 | 0 | 0 | 18500 | 0 | 0 | 0 |
| IL | Israel | 433 | 0 | 0 | 21650 | 0 | 0 | 0 |
| IM | Isle of Man | 21 | 0 | 0 | 1050 | 0 | 0 | 0 |
| IN | India | 7219 | 0 | 0 | 360950 | 0 | 0 | 0 |
| IO | British Indian Ocean Territory | 1 | 0 | 0 | 50 | 0 | 0 | 0 |
| IQ | Iraq | 173 | 0 | 0 | 8650 | 0 | 0 | 0 |
| IR | Iran | 2151 | 0 | 0 | 107550 | 0 | 0 | 0 |
| IS | Iceland | 35 | 0 | 0 | 1750 | 0 | 0 | 0 |
| IT | Italy | 10063 | 0 | 0 | 503150 | 0 | 0 | 0 |
| JE | Jersey | 6 | 0 | 0 | 300 | 0 | 0 | 0 |
| JM | Jamaica | 101 | 0 | 0 | 5050 | 0 | 0 | 0 |
| JO | Jordan | 146 | 0 | 0 | 7300 | 0 | 0 | 0 |
| JP | Japan | 2160 | 0 | 0 | 108000 | 0 | 0 | 0 |
| KE | Kenya | 334 | 0 | 0 | 16700 | 0 | 0 | 0 |
| KG | Kyrgyzstan | 108 | 0 | 0 | 5400 | 0 | 0 | 0 |
| KH | Cambodia | 301 | 0 | 0 | 15050 | 0 | 0 | 0 |
| KI | Kiribati | 19 | 0 | 0 | 950 | 0 | 0 | 0 |
| KM | Comoros | 93 | 0 | 0 | 4650 | 0 | 0 | 0 |
| KN | Saint Kitts and Nevis | 16 | 0 | 0 | 800 | 0 | 0 | 0 |
| KP | North Korea | 127 | 0 | 0 | 6350 | 0 | 0 | 0 |
| KR | South Korea | 307 | 0 | 0 | 15350 | 0 | 0 | 0 |
| KW | Kuwait | 28 | 0 | 0 | 1400 | 0 | 0 | 0 |
| KY | Cayman Islands | 67 | 0 | 0 | 3350 | 0 | 0 | 0 |
| KZ | Kazakhstan | 345 | 0 | 0 | 17250 | 0 | 0 | 0 |
| LA | Laos | 94 | 0 | 0 | 4700 | 0 | 0 | 0 |
| LB | Lebanon | 50 | 0 | 0 | 2500 | 0 | 0 | 0 |
| LC | Saint Lucia | 37 | 0 | 0 | 1850 | 0 | 0 | 0 |
| LI | Liechtenstein | 14 | 0 | 0 | 700 | 0 | 0 | 0 |
| LK | Sri Lanka | 89 | 0 | 0 | 4450 | 0 | 0 | 0 |
| LR | Liberia | 27 | 0 | 0 | 1350 | 0 | 0 | 0 |
| LS | Lesotho | 48 | 0 | 0 | 2400 | 0 | 0 | 0 |
| LT | Lithuania | 133 | 0 | 0 | 6650 | 0 | 0 | 0 |
| LU | Luxembourg | 172 | 0 | 0 | 8600 | 0 | 0 | 0 |
| LV | Latvia | 131 | 0 | 0 | 6550 | 0 | 0 | 0 |
| LY | Libya | 119 | 0 | 0 | 5950 | 0 | 0 | 0 |
| MA | Morocco | 479 | 0 | 0 | 23950 | 0 | 0 | 0 |
| MC | Monaco | 12 | 0 | 0 | 600 | 0 | 0 | 0 |
| MD | Moldova | 98 | 0 | 0 | 4900 | 0 | 0 | 0 |
| ME | Montenegro | 41 | 0 | 0 | 2050 | 0 | 0 | 0 |
| MF | Saint Martin | 9 | 0 | 0 | 450 | 0 | 0 | 0 |
| MG | Madagascar | 152 | 0 | 0 | 7600 | 0 | 0 | 0 |
| MH | Marshall Islands | 26 | 0 | 0 | 1300 | 0 | 0 | 0 |
| MK | North Macedonia | 202 | 0 | 0 | 10100 | 0 | 0 | 0 |
| ML | Mali | 94 | 0 | 0 | 4700 | 0 | 0 | 0 |
| MM | Myanmar | 528 | 0 | 0 | 26400 | 0 | 0 | 0 |
| MN | Mongolia | 331 | 0 | 0 | 16550 | 0 | 0 | 0 |
| MO | Macao | 7 | 0 | 0 | 350 | 0 | 0 | 0 |
| MP | Northern Mariana Islands | 6 | 0 | 0 | 300 | 0 | 0 | 0 |
| MQ | Martinique | 21 | 0 | 0 | 1050 | 0 | 0 | 0 |
| MR | Mauritania | 85 | 0 | 0 | 4250 | 0 | 0 | 0 |
| MS | Montserrat | 3 | 0 | 0 | 150 | 0 | 0 | 0 |
| MT | Malta | 69 | 0 | 0 | 3450 | 0 | 0 | 0 |
| MU | Mauritius | 113 | 0 | 0 | 5650 | 0 | 0 | 0 |
| MV | Maldives | 30 | 0 | 0 | 1500 | 0 | 0 | 0 |
| MW | Malawi | 39 | 0 | 0 | 1950 | 0 | 0 | 0 |
| MX | Mexico | 8944 | 0 | 0 | 447200 | 0 | 0 | 0 |
| MY | Malaysia | 731 | 0 | 0 | 36550 | 0 | 0 | 0 |
| MZ | Mozambique | 94 | 0 | 0 | 4700 | 0 | 0 | 0 |
| NA | Namibia | 80 | 0 | 0 | 4000 | 0 | 0 | 0 |
| NC | New Caledonia | 60 | 0 | 0 | 3000 | 0 | 0 | 0 |
| NE | Niger | 74 | 0 | 0 | 3700 | 0 | 0 | 0 |
| NF | Norfolk Island | 1 | 0 | 0 | 50 | 0 | 0 | 0 |
| NG | Nigeria | 928 | 0 | 0 | 46400 | 0 | 0 | 0 |
| NI | Nicaragua | 167 | 0 | 0 | 8350 | 0 | 0 | 0 |
| NL | The Netherlands | 1605 | 0 | 0 | 80250 | 0 | 0 | 0 |
| NO | Norway | 533 | 0 | 0 | 26650 | 0 | 0 | 0 |
| NP | Nepal | 74 | 0 | 0 | 3700 | 0 | 0 | 0 |
| NR | Nauru | 10 | 0 | 0 | 500 | 0 | 0 | 0 |
| NU | Niue | 1 | 0 | 0 | 50 | 0 | 0 | 0 |
| NZ | New Zealand | 647 | 0 | 0 | 32350 | 0 | 0 | 0 |
| OM | Oman | 41 | 0 | 0 | 2050 | 0 | 0 | 0 |
| PA | Panama | 643 | 0 | 0 | 32150 | 0 | 0 | 0 |
| PE | Peru | 1773 | 0 | 0 | 88650 | 0 | 0 | 0 |
| PF | French Polynesia | 38 | 0 | 0 | 1900 | 0 | 0 | 0 |
| PG | Papua New Guinea | 52 | 0 | 0 | 2600 | 0 | 0 | 0 |
| PH | Philippines | 4528 | 0 | 0 | 226400 | 0 | 0 | 0 |
| PK | Pakistan | 570 | 0 | 0 | 28500 | 0 | 0 | 0 |
| PL | Poland | 3022 | 0 | 0 | 151100 | 0 | 0 | 0 |
| PM | Saint Pierre and Miquelon | 2 | 0 | 0 | 100 | 0 | 0 | 0 |
| PN | Pitcairn | 1 | 0 | 0 | 50 | 0 | 0 | 0 |
| PR | Puerto Rico | 220 | 0 | 0 | 11000 | 0 | 0 | 0 |
| PS | Palestinian Territory | 378 | 0 | 0 | 18900 | 0 | 0 | 0 |
| PT | Portugal | 962 | 0 | 0 | 48100 | 0 | 0 | 0 |
| PW | Palau | 22 | 0 | 0 | 1100 | 0 | 0 | 0 |
| PY | Paraguay | 151 | 0 | 0 | 7550 | 0 | 0 | 0 |
| QA | Qatar | 42 | 0 | 0 | 2100 | 0 | 0 | 0 |
| RE | Reunion | 28 | 0 | 0 | 1400 | 0 | 0 | 0 |
| RO | Romania | 4571 | 0 | 0 | 228550 | 0 | 0 | 0 |
| RS | Serbia | 437 | 0 | 0 | 21850 | 0 | 0 | 0 |
| RU | Russia | 4933 | 0 | 0 | 246650 | 0 | 0 | 0 |
| RW | Rwanda | 51 | 0 | 0 | 2550 | 0 | 0 | 0 |
| SA | Saudi Arabia | 159 | 0 | 0 | 7950 | 0 | 0 | 0 |
| SB | Solomon Islands | 23 | 0 | 0 | 1150 | 0 | 0 | 0 |
| SC | Seychelles | 26 | 0 | 0 | 1300 | 0 | 0 | 0 |
| SD | Sudan | 112 | 0 | 0 | 5600 | 0 | 0 | 0 |
| SE | Sweden | 832 | 0 | 0 | 41600 | 0 | 0 | 0 |
| SG | Singapore | 116 | 0 | 0 | 5800 | 8 | 0 | 8 |
| SH | Saint Helena | 4 | 0 | 0 | 200 | 0 | 0 | 0 |
| SI | Slovenia | 301 | 0 | 0 | 15050 | 0 | 0 | 0 |
| SJ | Svalbard and Jan Mayen | 2 | 0 | 0 | 100 | 0 | 0 | 0 |
| SK | Slovakia | 612 | 0 | 0 | 30600 | 0 | 0 | 0 |
| SL | Sierra Leone | 87 | 0 | 0 | 4350 | 0 | 0 | 0 |
| SM | San Marino | 13 | 0 | 0 | 650 | 0 | 0 | 0 |
| SN | Senegal | 153 | 0 | 0 | 7650 | 0 | 0 | 0 |
| SO | Somalia | 75 | 0 | 0 | 3750 | 0 | 0 | 0 |
| SR | Suriname | 31 | 0 | 0 | 1550 | 0 | 0 | 0 |
| SS | South Sudan | 23 | 0 | 0 | 1150 | 0 | 0 | 0 |
| ST | Sao Tome and Principe | 26 | 0 | 0 | 1300 | 0 | 0 | 0 |
| SV | El Salvador | 101 | 0 | 0 | 5050 | 0 | 0 | 0 |
| SX | Sint Maarten | 6 | 0 | 0 | 300 | 0 | 0 | 0 |
| SY | Syria | 309 | 0 | 0 | 15450 | 0 | 0 | 0 |
| SZ | Eswatini | 24 | 0 | 0 | 1200 | 0 | 0 | 0 |
| TC | Turks and Caicos Islands | 7 | 0 | 0 | 350 | 0 | 0 | 0 |
| TD | Chad | 72 | 0 | 0 | 3600 | 0 | 0 | 0 |
| TF | French Southern Territories | 1 | 0 | 0 | 50 | 0 | 0 | 0 |
| TG | Togo | 35 | 0 | 0 | 1750 | 0 | 0 | 0 |
| TH | Thailand | 1070 | 0 | 0 | 53500 | 0 | 0 | 0 |
| TJ | Tajikistan | 102 | 0 | 0 | 5100 | 0 | 0 | 0 |
| TK | Tokelau | 3 | 0 | 0 | 150 | 0 | 0 | 0 |
| TL | Timor Leste | 32 | 0 | 0 | 1600 | 0 | 0 | 0 |
| TM | Turkmenistan | 149 | 0 | 0 | 7450 | 0 | 0 | 0 |
| TN | Tunisia | 285 | 0 | 0 | 14250 | 0 | 0 | 0 |
| TO | Tonga | 24 | 0 | 0 | 1200 | 0 | 0 | 0 |
| TR | Turkey | 2833 | 0 | 0 | 141650 | 0 | 0 | 0 |
| TT | Trinidad and Tobago | 27 | 0 | 0 | 1350 | 0 | 0 | 0 |
| TV | Tuvalu | 9 | 0 | 0 | 450 | 0 | 0 | 0 |
| TW | Taiwan | 89 | 0 | 0 | 4450 | 0 | 0 | 0 |
| TZ | Tanzania | 324 | 0 | 0 | 16200 | 0 | 0 | 0 |
| UA | Ukraine | 3887 | 0 | 0 | 194350 | 0 | 0 | 0 |
| UG | Uganda | 208 | 0 | 0 | 10400 | 0 | 0 | 0 |
| US | United States | 17343 | 0 | 0 | 867150 | 0 | 17321 | 17278 |
| UY | Uruguay | 135 | 0 | 0 | 6750 | 0 | 0 | 0 |
| UZ | Uzbekistan | 219 | 0 | 0 | 10950 | 0 | 0 | 0 |
| VA | Vatican | 1 | 0 | 0 | 50 | 0 | 0 | 0 |
| VC | Saint Vincent and the Grenadines | 20 | 0 | 0 | 1000 | 0 | 0 | 0 |
| VE | Venezuela | 414 | 0 | 0 | 20700 | 0 | 0 | 0 |
| VG | British Virgin Islands | 2 | 0 | 0 | 100 | 0 | 0 | 0 |
| VI | U.S. Virgin Islands | 6 | 0 | 0 | 300 | 0 | 0 | 0 |
| VN | Vietnam | 906 | 0 | 0 | 45300 | 0 | 0 | 0 |
| VU | Vanuatu | 9 | 0 | 0 | 450 | 0 | 0 | 0 |
| WF | Wallis and Futuna | 3 | 0 | 0 | 150 | 0 | 0 | 0 |
| WS | Samoa | 32 | 0 | 0 | 1600 | 0 | 0 | 0 |
| XK | Kosovo | 65 | 0 | 0 | 3250 | 0 | 0 | 0 |
| YE | Yemen | 309 | 0 | 0 | 15450 | 0 | 0 | 0 |
| YT | Mayotte | 57 | 0 | 0 | 2850 | 0 | 0 | 0 |
| ZA | South Africa | 978 | 0 | 0 | 48900 | 0 | 0 | 0 |
| ZM | Zambia | 98 | 0 | 0 | 4900 | 0 | 0 | 0 |
| ZW | Zimbabwe | 68 | 0 | 0 | 3400 | 0 | 0 | 0 |
