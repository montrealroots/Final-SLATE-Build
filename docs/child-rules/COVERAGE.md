# Child Performer Rules: Coverage

Which rules a production based in each playable country works under (`rulesFor` in `src/engine/minors.ts`). Every
playable place has a set. A place whose own rules are recorded uses them; any other uses the nearest recorded set, and
the game says so wherever the rules are shown. What was read for each recorded set is in `RESEARCH.md`.
`tests/minors.test.ts` fails when this table and the engine disagree.

Begun November 11, 2026. Recorded sets: England, Scotland, Wales, Northern Ireland (all four read November 11, 2026), California, New York, Georgia, British Columbia, Ontario, Ireland, Germany,
France (partly read: England's hours stand in for the hours its commission sets child by child), New South Wales, India,
Japan, South Korea and Mexico (read November 11, 2026; Mexico partly, as its law sets no hours under 15). New
York, Georgia, Ontario, Scotland, Wales and Northern Ireland are used only in their own regions, so they count no
countries below.

| Rules | Own | By region | Stand-in |
| --- | --- | --- | --- |
| England | 0 | 1 | 206 |
| California | 0 | 1 | 0 |
| British Columbia | 0 | 1 | 0 |
| Ontario | 0 | 0 | 0 |
| Ireland | 1 | 0 | 0 |
| Germany | 1 | 0 | 28 |
| France | 1 | 0 | 0 |
| New South Wales | 0 | 1 | 1 |
| India | 1 | 0 | 0 |
| Japan | 1 | 0 | 0 |
| South Korea | 1 | 0 | 0 |
| Mexico (partly read) | 1 | 0 | 0 |

Countries with places under more than one set (listed by the set used outside the recorded regions):
- **United States:** New York's, California's and Georgia's own; every other state uses California's.
- **Canada:** British Columbia's and Ontario's own; every other province and territory uses British Columbia's.
- **Australia:** New South Wales's own; every other state and territory uses New South Wales's.
- **United Kingdom:** England's, Scotland's, Wales's and Northern Ireland's own; a place with no region uses England's.

| Code | Country | Rules | Status |
| --- | --- | --- | --- |
| AF | Afghanistan | England | Stand-in |
| AX | Aland Islands | England | Stand-in |
| AL | Albania | England | Stand-in |
| DZ | Algeria | England | Stand-in |
| AS | American Samoa | England | Stand-in |
| AD | Andorra | England | Stand-in |
| AO | Angola | England | Stand-in |
| AI | Anguilla | England | Stand-in |
| AG | Antigua and Barbuda | England | Stand-in |
| AR | Argentina | England | Stand-in |
| AM | Armenia | England | Stand-in |
| AW | Aruba | England | Stand-in |
| AU | Australia | New South Wales | By region |
| AT | Austria | Germany | Stand-in |
| AZ | Azerbaijan | England | Stand-in |
| BS | Bahamas | England | Stand-in |
| BH | Bahrain | England | Stand-in |
| BD | Bangladesh | England | Stand-in |
| BB | Barbados | England | Stand-in |
| BY | Belarus | England | Stand-in |
| BE | Belgium | Germany | Stand-in |
| BZ | Belize | England | Stand-in |
| BJ | Benin | England | Stand-in |
| BM | Bermuda | England | Stand-in |
| BT | Bhutan | England | Stand-in |
| BO | Bolivia | England | Stand-in |
| BQ | Bonaire, Saint Eustatius and Saba  | England | Stand-in |
| BA | Bosnia and Herzegovina | England | Stand-in |
| BW | Botswana | England | Stand-in |
| BR | Brazil | England | Stand-in |
| IO | British Indian Ocean Territory | England | Stand-in |
| VG | British Virgin Islands | England | Stand-in |
| BN | Brunei | England | Stand-in |
| BG | Bulgaria | Germany | Stand-in |
| BF | Burkina Faso | England | Stand-in |
| BI | Burundi | England | Stand-in |
| CV | Cabo Verde | England | Stand-in |
| KH | Cambodia | England | Stand-in |
| CM | Cameroon | England | Stand-in |
| CA | Canada | British Columbia | By region |
| KY | Cayman Islands | England | Stand-in |
| CF | Central African Republic | England | Stand-in |
| TD | Chad | England | Stand-in |
| CL | Chile | England | Stand-in |
| CN | China | England | Stand-in |
| CX | Christmas Island | England | Stand-in |
| CC | Cocos Islands | England | Stand-in |
| CO | Colombia | England | Stand-in |
| KM | Comoros | England | Stand-in |
| CK | Cook Islands | England | Stand-in |
| CR | Costa Rica | England | Stand-in |
| HR | Croatia | Germany | Stand-in |
| CU | Cuba | England | Stand-in |
| CW | Curacao | England | Stand-in |
| CY | Cyprus | Germany | Stand-in |
| CZ | Czechia | Germany | Stand-in |
| CD | Democratic Republic of the Congo | England | Stand-in |
| DK | Denmark | Germany | Stand-in |
| DJ | Djibouti | England | Stand-in |
| DM | Dominica | England | Stand-in |
| DO | Dominican Republic | England | Stand-in |
| EC | Ecuador | England | Stand-in |
| EG | Egypt | England | Stand-in |
| SV | El Salvador | England | Stand-in |
| GQ | Equatorial Guinea | England | Stand-in |
| ER | Eritrea | England | Stand-in |
| EE | Estonia | Germany | Stand-in |
| SZ | Eswatini | England | Stand-in |
| ET | Ethiopia | England | Stand-in |
| FK | Falkland Islands | England | Stand-in |
| FO | Faroe Islands | England | Stand-in |
| FJ | Fiji | England | Stand-in |
| FI | Finland | Germany | Stand-in |
| FR | France | France | Own |
| GF | French Guiana | England | Stand-in |
| PF | French Polynesia | England | Stand-in |
| TF | French Southern Territories | England | Stand-in |
| GA | Gabon | England | Stand-in |
| GM | Gambia | England | Stand-in |
| GE | Georgia | England | Stand-in |
| DE | Germany | Germany | Own |
| GH | Ghana | England | Stand-in |
| GI | Gibraltar | England | Stand-in |
| GR | Greece | Germany | Stand-in |
| GL | Greenland | England | Stand-in |
| GD | Grenada | England | Stand-in |
| GP | Guadeloupe | England | Stand-in |
| GU | Guam | England | Stand-in |
| GT | Guatemala | England | Stand-in |
| GG | Guernsey | England | Stand-in |
| GN | Guinea | England | Stand-in |
| GW | Guinea-Bissau | England | Stand-in |
| GY | Guyana | England | Stand-in |
| HT | Haiti | England | Stand-in |
| HN | Honduras | England | Stand-in |
| HK | Hong Kong | England | Stand-in |
| HU | Hungary | Germany | Stand-in |
| IS | Iceland | Germany | Stand-in |
| IN | India | India | Own |
| ID | Indonesia | England | Stand-in |
| IR | Iran | England | Stand-in |
| IQ | Iraq | England | Stand-in |
| IE | Ireland | Ireland | Own |
| IM | Isle of Man | England | Stand-in |
| IL | Israel | England | Stand-in |
| IT | Italy | Germany | Stand-in |
| CI | Ivory Coast | England | Stand-in |
| JM | Jamaica | England | Stand-in |
| JP | Japan | Japan | Own |
| JE | Jersey | England | Stand-in |
| JO | Jordan | England | Stand-in |
| KZ | Kazakhstan | England | Stand-in |
| KE | Kenya | England | Stand-in |
| KI | Kiribati | England | Stand-in |
| XK | Kosovo | England | Stand-in |
| KW | Kuwait | England | Stand-in |
| KG | Kyrgyzstan | England | Stand-in |
| LA | Laos | England | Stand-in |
| LV | Latvia | Germany | Stand-in |
| LB | Lebanon | England | Stand-in |
| LS | Lesotho | England | Stand-in |
| LR | Liberia | England | Stand-in |
| LY | Libya | England | Stand-in |
| LI | Liechtenstein | Germany | Stand-in |
| LT | Lithuania | Germany | Stand-in |
| LU | Luxembourg | Germany | Stand-in |
| MO | Macao | England | Stand-in |
| MG | Madagascar | England | Stand-in |
| MW | Malawi | England | Stand-in |
| MY | Malaysia | England | Stand-in |
| MV | Maldives | England | Stand-in |
| ML | Mali | England | Stand-in |
| MT | Malta | Germany | Stand-in |
| MH | Marshall Islands | England | Stand-in |
| MQ | Martinique | England | Stand-in |
| MR | Mauritania | England | Stand-in |
| MU | Mauritius | England | Stand-in |
| YT | Mayotte | England | Stand-in |
| MX | Mexico | Mexico | Own |
| FM | Micronesia | England | Stand-in |
| MD | Moldova | England | Stand-in |
| MC | Monaco | England | Stand-in |
| MN | Mongolia | England | Stand-in |
| ME | Montenegro | England | Stand-in |
| MS | Montserrat | England | Stand-in |
| MA | Morocco | England | Stand-in |
| MZ | Mozambique | England | Stand-in |
| MM | Myanmar | England | Stand-in |
| NA | Namibia | England | Stand-in |
| NR | Nauru | England | Stand-in |
| NP | Nepal | England | Stand-in |
| NC | New Caledonia | England | Stand-in |
| NZ | New Zealand | New South Wales | Stand-in |
| NI | Nicaragua | England | Stand-in |
| NE | Niger | England | Stand-in |
| NG | Nigeria | England | Stand-in |
| NU | Niue | England | Stand-in |
| NF | Norfolk Island | England | Stand-in |
| KP | North Korea | England | Stand-in |
| MK | North Macedonia | England | Stand-in |
| MP | Northern Mariana Islands | England | Stand-in |
| NO | Norway | Germany | Stand-in |
| OM | Oman | England | Stand-in |
| PK | Pakistan | England | Stand-in |
| PW | Palau | England | Stand-in |
| PS | Palestinian Territory | England | Stand-in |
| PA | Panama | England | Stand-in |
| PG | Papua New Guinea | England | Stand-in |
| PY | Paraguay | England | Stand-in |
| PE | Peru | England | Stand-in |
| PH | Philippines | England | Stand-in |
| PN | Pitcairn | England | Stand-in |
| PL | Poland | Germany | Stand-in |
| PT | Portugal | Germany | Stand-in |
| PR | Puerto Rico | England | Stand-in |
| QA | Qatar | England | Stand-in |
| CG | Republic of the Congo | England | Stand-in |
| RE | Reunion | England | Stand-in |
| RO | Romania | Germany | Stand-in |
| RU | Russia | England | Stand-in |
| RW | Rwanda | England | Stand-in |
| BL | Saint Barthelemy | England | Stand-in |
| SH | Saint Helena | England | Stand-in |
| KN | Saint Kitts and Nevis | England | Stand-in |
| LC | Saint Lucia | England | Stand-in |
| MF | Saint Martin | England | Stand-in |
| PM | Saint Pierre and Miquelon | England | Stand-in |
| VC | Saint Vincent and the Grenadines | England | Stand-in |
| WS | Samoa | England | Stand-in |
| SM | San Marino | England | Stand-in |
| ST | Sao Tome and Principe | England | Stand-in |
| SA | Saudi Arabia | England | Stand-in |
| SN | Senegal | England | Stand-in |
| RS | Serbia | England | Stand-in |
| SC | Seychelles | England | Stand-in |
| SL | Sierra Leone | England | Stand-in |
| SG | Singapore | England | Stand-in |
| SX | Sint Maarten | England | Stand-in |
| SK | Slovakia | Germany | Stand-in |
| SI | Slovenia | Germany | Stand-in |
| SB | Solomon Islands | England | Stand-in |
| SO | Somalia | England | Stand-in |
| ZA | South Africa | England | Stand-in |
| GS | South Georgia and the South Sandwich Islands | England | Stand-in |
| KR | South Korea | South Korea | Own |
| SS | South Sudan | England | Stand-in |
| ES | Spain | Germany | Stand-in |
| LK | Sri Lanka | England | Stand-in |
| SD | Sudan | England | Stand-in |
| SR | Suriname | England | Stand-in |
| SJ | Svalbard and Jan Mayen | England | Stand-in |
| SE | Sweden | Germany | Stand-in |
| CH | Switzerland | Germany | Stand-in |
| SY | Syria | England | Stand-in |
| TW | Taiwan | England | Stand-in |
| TJ | Tajikistan | England | Stand-in |
| TZ | Tanzania | England | Stand-in |
| TH | Thailand | England | Stand-in |
| NL | The Netherlands | Germany | Stand-in |
| TL | Timor Leste | England | Stand-in |
| TG | Togo | England | Stand-in |
| TK | Tokelau | England | Stand-in |
| TO | Tonga | England | Stand-in |
| TT | Trinidad and Tobago | England | Stand-in |
| TN | Tunisia | England | Stand-in |
| TR | Turkey | England | Stand-in |
| TM | Turkmenistan | England | Stand-in |
| TC | Turks and Caicos Islands | England | Stand-in |
| TV | Tuvalu | England | Stand-in |
| VI | U.S. Virgin Islands | England | Stand-in |
| UG | Uganda | England | Stand-in |
| UA | Ukraine | England | Stand-in |
| AE | United Arab Emirates | England | Stand-in |
| GB | United Kingdom | England | By region |
| US | United States | California | By region |
| UY | Uruguay | England | Stand-in |
| UZ | Uzbekistan | England | Stand-in |
| VU | Vanuatu | England | Stand-in |
| VA | Vatican | England | Stand-in |
| VE | Venezuela | England | Stand-in |
| VN | Vietnam | England | Stand-in |
| WF | Wallis and Futuna | England | Stand-in |
| EH | Western Sahara | England | Stand-in |
| YE | Yemen | England | Stand-in |
| ZM | Zambia | England | Stand-in |
| ZW | Zimbabwe | England | Stand-in |
