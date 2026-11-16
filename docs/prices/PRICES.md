# What Things Cost

Written by `tests/prices.test.ts` from the code; don't edit by hand. Run with `SLATE_WRITE_AUDIT=1` to rewrite it.

Every price the player pays, read from the code, beside a published figure and where it was published. **Sourced**: the game's price sits inside the published range (the test fails if it leaves it). **Fixed**: changed on November 15 or 16, 2026 to the published figure. **Modeled**: no published figure was found, so the price is the game's own. 28 sourced, 20 fixed, 4 modeled.

British rate cards are read at 1.265 dollars to the pound. A US union hourly rate is read as a 10-hour day, eight hours straight and two at time and a half. A non-union background day is 8 hours at California's minimum wage, by date: $16.50 from 2025-01-01, $16.90 from 2026-01-01, $17.40 from 2027-01-01.

| Area | What | The Game | In The World | Source | Status | Where |
|---|---|---|---|---|---|---|
| People | Performer day minimum, theatrical ($2 million and up), from July 1, 2026 | $1,283 | $1,283 | SAG-AFTRA 2026 Theatrical Wage Table | Sourced | `union.ts SAG_PERIODS` |
| People | Performer fee for a film, a star | Recognition or fame, whichever is more | Barbie $12.5 million each; Red Notice $20 to $23.5 million | docs/people/PAY.md (Variety and others): within a third for most | Fixed | `recognition.ts performerFee` |
| People | Background performer, under $2 million (non-union), 2026 | $135 | 8 hours at $16.90 | California Department of Industrial Relations, 2026 minimum wage | Fixed | `rates.ts crowdDayRate` |
| People | Background performer, $2 million and up, from July 1, 2026 | $231 | $231 | SAG-AFTRA 2026 TV/Theatrical Agreement, background actor | Fixed | `rates.ts crowdDayRate` |
| People | Camera operator, middle experience | $610 | $430 to $731 (Tier 1B to Tier 3) | IATSE Local 600, Low Budget Theatrical Agreement wage scales 2025 (a 10-hour day) | Sourced | `people.ts ROLES` |
| People | Camera assistant, middle experience | $427 | $366 to $634 (1st AC, Tier 1A to Tier 3) | IATSE Local 600, Low Budget Theatrical Agreement wage scales 2025 | Sourced | `people.ts ROLES` |
| People | Art director, middle experience | $610 | £362 to £534 a day ($458 to $676) | Bectu Art Department Film Rate Card 2025-26 (Feature Film £1M-£5M minimum to Major Motion Picture 3+ years) | Sourced | `people.ts ROLES` |
| People | Storyboard artist, middle experience | $549 | £374 to £483 a day ($473 to $611) | Bectu Art Department Film Rate Card 2025-26 | Sourced | `people.ts ROLES` |
| People | Editor, middle experience | $732 | about $834 a day ($4,168 a week on call) | IATSE Local 700, Low Budget Theatrical Agreement 2025, editor weekly on call | Sourced | `people.ts ROLES` |
| People | Director, over $11 million, from July 1, 2026 | $5,043 | $25,214 a week | DGA Basic Agreement 2026-30 wage tables (AMPTP), freelance high budget | Fixed | `union.ts guildMinimum` |
| People | Writer, $5 million and up, a day of a draft | $6,929 | $173,215 an original screenplay | WGA 2026 Schedule of Minimums | Fixed | `union.ts guildMinimum` |
| People | A recognised director, writer, composer or songwriter | A fee for the work, from recognition | Spielberg $20 million a feature; Zimmer $2.2 million a score; Sorkin $2.2 million a script | docs/people/PAY.md (The Hollywood Reporter, Brabec, Passman, WGA) | Fixed | `recognition-pay.ts` |
| People | Sixth day worked, above £5 million | × 1.5 | time and a half | Pact/Bectu agreements | Sourced | `rates.ts SIXTH_DAY_PREMIUM` |
| People | A holiday worked | × 2 | double time for the first twelve hours | IATSE West Coast, studio holiday (Wrapbook rate finder) | Fixed | `rates.ts HOLIDAY_PREMIUM` |
| People | A night shoot day | × 1.2 | 110% to 120% by the hour of the call | IATSE night differentials (Wrapbook rate finder) | Fixed | `rates.ts NIGHT_PREMIUM` |
| Shooting | Location fee for a day, micro budget | $500 | $500 to $5,000 a shoot day | Visit Tulsa, Filming On Your Property | Fixed | `rates.ts LOCATION_FEE` |
| Shooting | Location fee for a day, low budget | $1,500 | $500 to $5,000 a shoot day | Visit Tulsa, Filming On Your Property | Fixed | `rates.ts LOCATION_FEE` |
| Shooting | Location fee for a day, mid budget | $3,500 | $500 to $5,000; Los Angeles average $5,000 to $6,000 | Visit Tulsa; Giggster, Rent Your House For Filming | Fixed | `rates.ts LOCATION_FEE` |
| Shooting | Location fee for a day, commissioned | $5,000 | Los Angeles average $5,000 to $6,000 | Giggster, Rent Your House For Filming | Fixed | `rates.ts LOCATION_FEE` |
| Shooting | Equipment package for a day, micro budget | $450 | a 1-ton grip truck $400 a day | Cinevo (Phoenix) rental rates | Sourced | `rates.ts EQUIPMENT_PER_DAY` |
| Shooting | Equipment package for a day, low budget | $1,500 | a 3-ton G&E package $1,095 and a camera kit about $435 | KitSplit (Van Nuys); Lensrentals ALEXA Mini LF kit, $3,037 a week | Sourced | `rates.ts EQUIPMENT_PER_DAY` |
| Shooting | Equipment package for a day, mid budget | $3,000 | a 5-ton package $1,500 and a camera package | Camera Ambassador (Chicago); Lensrentals | Sourced | `rates.ts DAY_COST_SCALE` |
| Shooting | A dolly and track for a day | $600 | a Fisher 10 $295 to $600 a day, track beside it | US rental house listings; Mes Trois Filles, March 2025 (€450 to €700 a feature dolly) | Sourced | `craft.ts RIGS` |
| Shooting | A stabiliser for a day | $450 | a DJI Ronin 2, $200 to $800 a day | KitSplit and Camera Ambassador (Chicago, $350) listings | Sourced | `craft.ts RIGS` |
| Shooting | Aging appliances, built | $3,500 | $3,000 to $10,000 custom prosthetic makeup | Backstage, The Truth About Prop, Makeup, and Effects Costs | Sourced | `looks.ts MAKEUP` |
| Shooting | Full creature appliances, built | $7,200 | $3,000 to $10,000 custom prosthetic makeup | Backstage | Sourced | `looks.ts MAKEUP` |
| Shooting | Practical makeup with digital cleanup, built | $3,500 | $3,000 to $10,000 custom prosthetic makeup | Backstage | Sourced | `looks.ts MAKEUP` |
| Shooting | Partial appliances, wounds, a mask, built | $1,500, $300, $2,400 | smaller builds than a full prosthetic makeup | none found for each | Modeled | `looks.ts MAKEUP` |
| Shooting | Housing and feeding one person for a day away | $178 | $110 lodging and $68 meals | GSA FY 2026 standard CONUS per diem (Federal Register, August 19, 2025) | Fixed | `destinations.ts PER_DIEM` |
| Shooting | Moving the unit under 500 km: a car by the mile, four to a car | $0.76 | 76 cents a mile | IRS standard business mileage rate from July 1, 2026 | Fixed | `destinations.ts CAR_PER_MILE` |
| Shooting | Moving the unit under 500 km: the equipment truck by the mile | $0.65 | 65 cents a mile | Cinevo rate card, grip and electric truck mileage | Fixed | `destinations.ts TRUCK_PER_MILE` |
| Shooting | Moving the unit further: a seat there and back, in the same country | $436 | $436, the average US domestic fare, second quarter of 2026 ($428 in the first) | Bureau of Transportation Statistics, average domestic air fares | Fixed | `destinations.ts FARE` |
| Shooting | Moving the unit further: a seat there and back, to another country | $1,138 | a median international round trip from the US, $1,138 in summer 2026 ($1,115 a year before) | Hopper analysis reported by Fox 29, summer 2026 | Fixed | `destinations.ts FARE` |
| Shooting | Costumes, a character | $600 | an indie film's wardrobe $5,475 to $17,450 in all: $550 to $1,750 a character for ten | Filmmaker Magazine, DV case study ($5,475); Bloomsbury, Feature Film Budgeting, Sample Budget 3 ($17,450) | Sourced | `rates.ts MATERIAL_COST` |
| Shooting | Design materials, a design day (about $225 a scene on a feature) | $900 | an indie film's art, set dressing and props $11,025 to $39,210 in all | Filmmaker Magazine, DV case study; Bloomsbury, Sample Budget 3 | Sourced | `rates.ts MATERIAL_COST` |
| Shooting | Archive footage, a clip | $2,500 | $45 to $75 a second, 30-second minimums: $1,350 to $4,500 for 30 to 60 seconds | Film Archives Online ($60 a second, feature documentary); Budget Films ($50 to $75 a second) | Sourced | `rates.ts MATERIAL_COST` |
| Shooting | Other materials (creature builds, stop-motion armatures, puppets, faces, sets, location prep) | prep:creature $4,000, sm:armature $900, sm:puppet $1,500, sm:faces $1,200, sm:costume $300, sm:sets $2,500, prep:locations $500 | varies by production | none found per task | Modeled | `rates.ts MATERIAL_COST` |
| Post | A recording studio day | $1,200 | from $1,200 a day; rooms $100 to $400 an hour | C&I Studios, Downtown Los Angeles; TagVenue Los Angeles listings | Fixed | `rates.ts VOICE_SESSION_STUDIO` |
| Post | A motion-capture stage session | $1,500 | $1,500 to $5,000 a day | MoCap Online, The Real Cost of Motion Capture in 2026; AUT Motion Capture Lab (NZ$1,800 a day) | Sourced | `mocap.ts` |
| Post | A facial rig for a capture session | $500 | $175 an actor a day (a university stage) to a $1,125 a day head camera; $500 to $2,000 a day for high-fidelity facial capture | WAAPA Performance Capture Rate Card; Faceware pricing; MoCap Online, The Real Cost of Motion Capture in 2026 | Sourced | `mocap.ts` |
| Post | A render node for a day | $35 | GPU render nodes $0.90 to $3.50 an hour ($22 to $84 a day) | Super Renders Farm, Cloud Render Farm Pricing Explained 2026; AWS g5.xlarge on demand, about $1.01 an hour | Sourced | `rates.ts RENDER_NODE_DAY_COST` |
| Post | Subtitles, a finished minute, each language | $12 | $3 to $20 a minute; translated film subtitles from about £9 ($12) | Voquent subtitling prices; Beverly Boy, How Much Does it Cost to Subtitle a Film? | Sourced | `script-effects.ts` |
| Post | Dubbing, a finished minute, each language | $140 | human dubbing $50 to $200 a minute | Vitrina, AI Dubbing vs Human Dubbing; Checksub dubbing price guide | Sourced | `script-effects.ts` |
| Post | A broadcast edit for an earlier slot | $2,500 | not found | none found | Modeled | `script-effects.ts` |
| Music | A song licence | By fame, budget and scope | Hello: about $18,000 festivals (micro) to $530,000 the world (commissioned) | Music Connection; the Mad Men Beatles licence (music.ts) | Fixed | `music.ts holderFee` |
| Music | A library track, a use | $250 | per-track library licences in the low hundreds | Fox Music, Music Licensing for Short Film 2026 | Sourced | `music.ts LIBRARY_FEE_PER_USE` |
| Release | A digital aggregator, a feature on three platforms | $1,300 | $950 the first platform and $175 each more | Quiver Digital fees (MovieMaker); Vitrina, aggregators up to a $1,500 flat fee | Sourced | `release-plan.ts AGGREGATOR_FEE` |
| Release | A booking partner for your own cinema release | $5,000 | no published booking fee; renting a cinema yourself in one market is reported at $7,000 to $22,000 with its marketing | Vitrina, How Much Does It Cost to Distribute a Feature Film Independently (a different service) | Modeled | `release-plan.ts PARTNER_FEE` |
| Release | A cinema ticket | $11.31 | $11.31 (US, 2024) | The Numbers | Fixed | `box-office.ts TICKET_PRICE` |
| Elsewhere | Equipment you buy | Each item at a retailer's listed price | retail | Each item's own link (src/data/equipment.json) | Sourced | `equipment.json` |
| Elsewhere | Festival and awards entry fees | Each institution's own fee | their rules | Each rulebook's own citation (rulebook-data.ts) | Sourced | `rulebook-data.ts` |
| Elsewhere | Bank fees, papers and visas | Each bank's and office's own | their price lists | Each product's own citation (bankworld content, papers) | Sourced | `bankworld/content, papers` |
