/**
 * SLATE — a passport, by the country that issues it: its standard adult fee,
 * how long an application takes, an expedited service and what it adds,
 * how long it lasts, and what the office says about a lost one and applying
 * from abroad. Researched 2026-09-29 from each passport office's own pages
 * where they could be read; each entry lists its sources and what the
 * research could not confirm. A processing time the office doesn't publish
 * is SLATE's estimate and says so (`daysEstimated`). Built by
 * `tools/build-passports.mjs`; don't edit by hand.
 *
 * Fifteen countries: those SLATE's lives begin and bank in. A citizen of
 * another country applies to an office SLATE doesn't have, and
 * `systems/documents.ts` says so.
 */

export interface PassportRule {
  issuer: string;
  name: string;
  fee: number;
  currency: string;
  feeBasis: string;
  /** Standard days, at most, from applying to having it. */
  days: number;
  daysEstimated: boolean;
  expedite: { extra: number; days: number; renewalOnly?: boolean; note?: string } | null;
  validityYears: number;
  /** A shorter passport, at its own fee where it has one, for an adult under an age. */
  young?: { under: number; years: number; fee?: number };
  lost: string;
  abroad: string;
  sources: { url: string; statedDate: string | null }[];
  uncertain: string[];
}

export const PASSPORTS: Readonly<Record<string, PassportRule>> = {
  "US": {
    "issuer": "U.S. Department of State, Bureau of Consular Affairs (Passport Services)",
    "name": "U.S. Passport Book",
    "fee": 165,
    "currency": "USD",
    "feeBasis": "First-time adult (16+) passport book on Form DS-11: a $130 application fee paid to the Department of State, and a $35 acceptance fee paid separately to the acceptance facility.",
    "days": 42,
    "daysEstimated": false,
    "expedite": {
      "extra": 60,
      "days": 21
    },
    "validityYears": 10,
    "lost": "{\"fee\":165,\"oldCancelled\":true,\"note\":\"Report on Form DS-64 (online reports are canceled within 1 business day). In the U.S., a replacement must be applied for in person on Form DS-11, which carries the first-time fees ($130 + $35). Once reported, the passport is no longer valid and can’t be used for international travel even if found later; traveling on it can lead to detention on entry.\"}",
    "abroad": "Outside the U.S. (except Canada) citizens apply at the nearest U.S. embassy or consulate, pay the passport fee only, and don’t pay the expedite fee. Residents of Canada may mail a renewal to the U.S. with routine or expedited service.",
    "sources": [
      {
        "url": "https://adoption.state.gov/content/dam/tsg_aem/passports/documents/forms-fees/Passport_Fee_Chart_English_Accessible_July_2026.pdf",
        "statedDate": "Updated June 2026 (file named July 2026); read directly"
      },
      {
        "url": "https://travel.state.gov/en/passports/apply/help/processing-time.html",
        "statedDate": "not stated; page returned 403 to direct fetch, figures confirmed via search snippet 2026-09-29"
      },
      {
        "url": "https://travel.state.gov/en/passports/renew-replace/report-passport-lost-stolen.html",
        "statedDate": "not stated; confirmed via search snippet 2026-09-29"
      },
      {
        "url": "https://travel.state.gov/content/travel/en/passports/passport-help/faqs.html",
        "statedDate": "not stated; validity and 6-month note confirmed via search snippet 2026-09-29"
      },
      {
        "url": "https://travel.state.gov/content/travel/en/passports/how-apply/fees.html",
        "statedDate": "not stated; abroad-fee note confirmed via search snippet 2026-09-29"
      }
    ],
    "uncertain": [
      "travel.state.gov blocks automated fetches (HTTP 403); processing times (4-6 weeks routine, 2-3 weeks expedited), lost/stolen rules, validity and abroad rules were taken from search-result snippets of travel.state.gov pages rather than a full page read. The fee figures were read from the Department's own fee chart PDF.",
      "Processing times are published as current estimates and change; the figure is as surfaced on 2026-09-29."
    ]
  },
  "GB": {
    "issuer": "HM Passport Office (Home Office)",
    "name": "British Passport (Standard 34-Page)",
    "fee": 102,
    "currency": "GBP",
    "feeBasis": "Standard adult (16+) 34-page passport, online application from the UK; first adult passport, renewal and replacement all cost the same. Paper form via the Post Office: 115.50. 54-page frequent traveler: 116 online / 129.50 paper. Fees effective April 8, 2026.",
    "days": 21,
    "daysEstimated": false,
    "expedite": {
      "extra": 90,
      "days": 7,
      "note": "Fast Track, £192 in all"
    },
    "validityYears": 10,
    "lost": "{\"fee\":102,\"oldCancelled\":true,\"note\":\"A lost or stolen passport must be canceled before applying for a replacement; replacement costs the same as renewal (102 online / 115.50 paper). GOV.UK doesn’t state on these pages whether a passport found after cancellation can be used, but cancellation is the precondition for replacement.\"}",
    "abroad": "British nationals overseas apply online to HM Passport Office at higher fees: 116.50 adult online / 130 paper; child 75.50 online / 89 paper (from April 8, 2026). Different turnaround times apply overseas (not stated on the pages read). Passports are free for people born on or before September 2, 1929.",
    "sources": [
      {
        "url": "https://www.gov.uk/passport-fees",
        "statedDate": "no date on page; read 2026-09-29"
      },
      {
        "url": "https://www.gov.uk/government/news/new-fees-for-passport-applications",
        "statedDate": "published 18 March 2026; fees effective 8 April 2026"
      },
      {
        "url": "https://www.gov.uk/get-a-passport-urgently",
        "statedDate": "no date on page; read 2026-09-29"
      },
      {
        "url": "https://www.gov.uk/apply-first-adult-passport",
        "statedDate": "no date on page; read 2026-09-29 (adult valid 10 years)"
      },
      {
        "url": "https://www.gov.uk/get-a-child-passport",
        "statedDate": "no date on page; read 2026-09-29 (child valid 5 years)"
      },
      {
        "url": "https://www.gov.uk/government/organisations/hm-passport-office/about/about-our-services",
        "statedDate": "no date on page; read 2026-09-29 (usually within 3 weeks)"
      },
      {
        "url": "https://www.gov.uk/renew-adult-passport/replace",
        "statedDate": "no date on page; read 2026-09-29"
      },
      {
        "url": "https://www.gov.uk/foreign-travel-advice/spain/entry-requirements",
        "statedDate": "no 'still current at' date captured; read 2026-09-29"
      }
    ],
    "uncertain": [
      "Standard processing is stated only as 'usually within 3 weeks'; no minimum is given and GOV.UK doesn’t say whether return delivery is included.",
      "Overseas application turnaround times weren’t stated on the pages read.",
      "Whether a passport found after cancellation can be used isn’t stated on the GOV.UK pages read (cancellation is required before replacement)."
    ]
  },
  "CA": {
    "issuer": "Passport Program, Immigration, Refugees and Citizenship Canada (IRCC), delivered by Service Canada in Canada",
    "name": "Canadian Passport (Regular, 10-Year)",
    "fee": 163.5,
    "currency": "CAD",
    "feeBasis": "10-year regular adult (16+) passport applied for in Canada; same for first passport and renewal. 5-year adult: 122.50. Fees effective March 31, 2026.",
    "days": 28,
    "daysEstimated": false,
    "expedite": {
      "extra": 125.75,
      "days": 1,
      "note": "Urgent: by the end of the next business day"
    },
    "validityYears": 10,
    "lost": "{\"fee\":45,\"feeNote\":\"Administrative fee of 45 on top of the regular passport fee, for a lost or stolen passport that hadn’t yet expired.\",\"oldCancelled\":true,\"note\":\"A Canadian travel document once reported lost, stolen, inaccessible, damaged or found is no longer valid and mustn’t be used for travel. Repeated losses may lead to refusal or to a replacement of severely limited validity, without refund.\"}",
    "abroad": "Outside Canada and the U.S., fees are higher: 266.25 for 10-year adult, 194.25 for 5-year adult, 102.50 child. Applications mailed from the U.S. or abroad have a 20-business-day standard, excluding mailing. Temporary passport 125.75.",
    "sources": [
      {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/fees/fee-changes-passport.html",
        "statedDate": "Date modified 2026-07-20; fees on or after 31 March 2026"
      },
      {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/news/notices/passport-travel-document-fees-increase.html",
        "statedDate": "published 4 March 2026; effective 31 March 2026"
      },
      {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/processing-times.html",
        "statedDate": "Date modified 2026-03-30"
      },
      {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/urgent-emergency-passport.html",
        "statedDate": "Date modified 2026-07-15"
      },
      {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/03/canada-begins-new-30-days-or-free-guarantee-for-passport-processing.html",
        "statedDate": "March 2026; guarantee effective 1 April 2026 (via search snippet)"
      },
      {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/lost-stolen-inaccessible-damaged-found.html",
        "statedDate": "not stated; confirmed via search snippet 2026-09-29"
      },
      {
        "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports-usa/renew-us/submit-form-fees.html",
        "statedDate": "not stated; 45 lost/stolen fee confirmed via search snippet 2026-09-29"
      }
    ],
    "uncertain": [
      "Canada.ca fee pages load amounts dynamically and returned 'Error loading fee' to automated reads; the adult, child, urgent and weekend amounts come from IRCC's fee-change table (read directly).",
      "Express pickup (50), standard pickup (20) and the lost/stolen administrative fee (45) are pre-March-2026 figures confirmed only via search snippets; they’re absent from the March 2026 change table, which implies but doesn’t state that they’re unchanged.",
      "Canada publishes no minimum-remaining-validity guidance of its own; destination rules apply."
    ]
  },
  "IE": {
    "issuer": "Department of Foreign Affairs – Passport Service (An Roinn Gnóthaí Eachtracha)",
    "name": "Irish Passport (Standard 10-Year Passport Book)",
    "fee": 75,
    "currency": "EUR",
    "feeBasis": "Standard adult 10-year passport via Passport Online; the same €75 applies to a first-time adult application and to a renewal. Post Passport (paper) channel: €80 plus a postal service fee of €9.50 per single application (€16 for up to four sent together). Public-counter renewal in Dublin/Cork: €95 passport fee plus an appointment fee. Passport Card €35; book plus card bundle €100. Applicants living outside Ireland pay an extra €15 postal fee when applying online. Expedite: Adult renewals only, never first-time applications, by booked appointment at the public offices. Same-day turnaround (Dublin): €95 passport fee plus €150 appointment fee, €245 in total. Four-day turnaround (Cork and Dublin): €95 plus €75, €170 in total. London offers a five-day turnaround at €170. The page doesn’t say whether 'four-day' means working or calendar days. A same-day emergency service for bereavement or medical emergency charges only the passport fee.",
    "days": 28,
    "daysEstimated": false,
    "expedite": {
      "extra": 170,
      "days": 0,
      "renewalOnly": true,
      "note": "Same-day renewal at a public office: €95 and a €150 appointment fee"
    },
    "validityYears": 10,
    "lost": "{\"fee\":75,\"oldCancelled\":true,\"note\":\"The loss is reported inside the replacement application, which is handled as a complex renewal (15 working days). The fee schedule lists no separate fee for a lost passport, so the standard €75 online fee applies. DFA reports the lost passport to Interpol and it’s no longer valid for travel, even if it is later found. Losing two or more passports in 10 years can restrict the next passport to between 1 and 10 years' validity. Adults whose last passport was lost or stolen need extra identity verification (a Public Services Card, or other documents or an interview).\"}",
    "abroad": "Passport Online works from anywhere in the world at the same €75 adult fee, plus a €15 postal fee for applicants living outside Ireland. Turnaround times are the same regardless of residence, but postage from abroad is longer. First-time applicants abroad have their identity form witnessed by an appropriate witness outside the State rather than An Garda Síochána. Where local post is unreliable, documents go through the nearest Irish Embassy. The Irish Embassy in London runs a five-day urgent renewal service at €170. Fees for other embassy-lodged applications weren’t checked.",
    "sources": [
      {
        "url": "https://www.ireland.ie/en/dfa/passports/passport-fees/",
        "statedDate": "not stated on page (published_time meta empty); fetched 2026-09-29"
      },
      {
        "url": "https://www.ireland.ie/en/dfa/passports/turnaround-times/",
        "statedDate": "not stated on page ('current average turnaround times'); fetched 2026-09-29"
      },
      {
        "url": "https://www.ireland.ie/en/dfa/passports/urgent-appointment/",
        "statedDate": "not stated on page; fetched 2026-09-29"
      },
      {
        "url": "https://www.ireland.ie/en/dfa/passports/lost-stolen-damaged/",
        "statedDate": "not stated on page; fetched 2026-09-29"
      },
      {
        "url": "https://www.ireland.ie/en/dfa/passports/faqs/",
        "statedDate": "not stated on page; fetched 2026-09-29"
      },
      {
        "url": "https://www.ireland.ie/en/dfa/passports/how-to-apply-for-a-passport/renew-adult-passport/",
        "statedDate": "not stated on page; fetched 2026-09-29"
      },
      {
        "url": "https://www.ireland.ie/en/dfa/passports/how-to-apply-for-a-passport/first-adult-passport/",
        "statedDate": "not stated on page; fetched 2026-09-29"
      },
      {
        "url": "https://www.ireland.ie/en/dfa/passports/how-to-apply-for-a-passport/first-child-passport/",
        "statedDate": "not stated on page; fetched 2026-09-29"
      }
    ],
    "uncertain": [
      "Lost-passport fee: no lost-specific fee is published; 75 is the standard online fee, taken from a fee schedule that lists only one adult fee.",
      "expediteFee 150 is the same-day appointment fee added to the €95 counter passport fee (€245 total); the four-day option is €75 extra (€170 total). The page doesn’t say whether 'four-day' counts working or calendar days.",
      "processingDays are published averages, not guarantees, and exclude postage.",
      "Embassy fees for applications lodged abroad in local currency weren’t checked."
    ]
  },
  "IS": {
    "issuer": "Þjóðskrá Íslands (Registers Iceland), which produces and issues the passport; applications are taken by the Sýslumenn (District Commissioners) in Iceland and by Icelandic embassies abroad",
    "name": "Íslenskt vegabréf (Icelandic passport)",
    "fee": 19000,
    "currency": "ISK",
    "feeBasis": "Standard processing (almenn afgreiðsla), adults aged 18 to 66. The same price applies to a first passport and a renewal. Apply online on Ísland.is or at a Sýslumaður office, then attend photographing in person within 30 days. Children, people aged 67 and over, and disability pensioners pay 7,000 ISK. Expedite: 39,200 ISK is the full price of express processing (hraðafgreiðsla) for ages 18 to 66, not a surcharge on top of the standard fee. It’s 14,000 ISK for children, people aged 67 and over, and disability pensioners. Express delivery is within 2 days of the photographing appointment. The page doesn’t say whether these are working days, so the figure isn’t converted.",
    "days": 6,
    "daysEstimated": false,
    "expedite": {
      "extra": 20200,
      "days": 2,
      "note": "Express, 39,200 ISK in all"
    },
    "validityYears": 10,
    "lost": "{\"fee\":null,\"oldCancelled\":true,\"note\":\"A passport reported lost is entered in the Schengen and Interpol systems and becomes permanently unusable. If found, it must be handed in, and one presented abroad is confiscated. The replacement is given the same validity end date as the passport reported lost (Passports Act art. 6(2)). Anyone who has lost two or more passports may get a passport valid 2 years or less while the lost ones remain valid (Regulation art. 18). No separate replacement fee is published.\"}",
    "abroad": "Abroad, applications are taken only at certain Icelandic embassies and consulates-general. Honorary consuls can issue only emergency passports, not ordinary ones. Bring the old passport, or photo ID if it was lost, and payment. Delivery options are collection at the application post or DHL shipping abroad, and shipping time is added. The fee charged at embassies wasn’t found on the pages checked.",
    "sources": [
      {
        "url": "https://island.is/vegabref",
        "statedDate": "not stated on page (Sýslumenn page; page JSON carries updatedAt values from 2026-01-02 to 2026-06-08); fetched 2026-09-29"
      },
      {
        "url": "https://www.skra.is/folk/vegabref-og-onnur-skilriki/vegabref/",
        "statedDate": "not stated on page; fetched 2026-09-29"
      },
      {
        "url": "https://www.skra.is/folk/vegabref-og-onnur-skilriki/vegabref/gildistimi-vegabrefa/",
        "statedDate": "not stated on page; fetched 2026-09-29"
      },
      {
        "url": "https://www.skra.is/folk/vegabref-og-onnur-skilriki/vegabref/stolid-tynt-vegabref/",
        "statedDate": "not stated on page; fetched 2026-09-29"
      },
      {
        "url": "https://island.is/stolidtynt-vegabref",
        "statedDate": "not stated on page; fetched 2026-09-29"
      },
      {
        "url": "https://www.skra.is/folk/vegabref-og-onnur-skilriki/vegabref/umsoknarferli/umsoknarferli-erlendis/",
        "statedDate": "not stated on page; fetched 2026-09-29"
      },
      {
        "url": "https://www.skra.is/folk/vegabref-og-onnur-skilriki/vegabref/afhending-vegabrefa/",
        "statedDate": "not stated on page; fetched 2026-09-29"
      },
      {
        "url": "https://www.skra.is/um-okkur/um-okkur/gjaldskra/",
        "statedDate": "not stated on page; states that passport fees are published on the Sýslumenn site; fetched 2026-09-29"
      }
    ],
    "uncertain": [
      "lostReplacement.fee: no lost-specific fee is published; the standard 19,000 ISK presumably applies, but this isn’t stated.",
      "expediteDays.min and processingDays.min aren’t published.",
      "It isn’t stated whether the '2 days' express and '4 days' standard figures on island.is are working days; Registers Iceland states 4 working days for standard.",
      "Fees charged at Icelandic embassies abroad weren’t found.",
      "The page shows no effective date for the 19,000 / 39,200 ISK prices; they’re the figures shown on 2026-09-29."
    ]
  },
  "DE": {
    "issuer": "Passbehörde der Gemeinde (Bürgeramt), passport produced centrally by Bundesdruckerei GmbH; abroad: deutsche Auslandsvertretung (Auswärtiges Amt)",
    "name": "Reisepass (ePass)",
    "fee": 70,
    "currency": "EUR",
    "feeBasis": "Standard 32-page Reisepass for an applicant who has completed their 24th year (24+), issued by the competent domestic Passbehörde; same fee for first issue and renewal (PassV § 27(1) Nr. 1a). Under 24: 37.50 EUR. Surcharges: 48 pages +22 EUR; photo taken at the office +6 EUR; direct postal delivery (Direktversand) +15 EUR; fee doubled at a non-competent authority (PassV § 27(2) Nr. 2).",
    "days": 56,
    "daysEstimated": false,
    "expedite": {
      "extra": 32,
      "days": 6
    },
    "validityYears": 10,
    "young": {
      "under": 24,
      "years": 6,
      "fee": 37.5
    },
    "lost": "{\"fee\":70,\"oldCancelled\":true,\"note\":\"Loss must be reported to the Passbehörde without delay (PassG § 15 Nr. 3); replacement is a new passport at the ordinary fee (70 EUR for 24+). The lost passport is entered in the national search database (and Interpol); official guidance advises not to travel on a recovered passport even after reporting its recovery, as the Interpol entry isn’t automatically deleted and border police may seize it. 'oldCancelled' reflects this search-entry practice; PassG § 11 doesn’t list loss as a ground of automatic invalidity.\"}",
    "abroad": "Residents abroad apply in person at the competent German mission (Auslandsvertretung); fees rise by 36 EUR (PassV § 27(3)): 106 EUR for 24+, 73.50 EUR under 24; at a non-competent mission 176 EUR / 111 EUR. Vorläufiger Reisepass abroad 75 EUR (26+49), 101 EUR at non-competent mission. Honorary consuls add 73.13-88.43 EUR plus expenses. Processing 4-6 weeks because the passport travels Bundesdruckerei -> Auswärtiges Amt Berlin -> mission; Express shortens only production time. A lost passport abroad can be replaced by a Reiseausweis als Passersatz for return to Germany (max 1 month).",
    "sources": [
      {
        "url": "https://www.gesetze-im-internet.de/passv_2007/__27.html",
        "statedDate": "PassV § 27 Gebühren, current consolidated text fetched 2026-09-29"
      },
      {
        "url": "https://www.gesetze-im-internet.de/pa_g_1986/__5.html",
        "statedDate": "PassG § 5 Gültigkeitsdauer, fetched 2026-09-29"
      },
      {
        "url": "https://www.gesetze-im-internet.de/pa_g_1986/__11.html",
        "statedDate": "PassG § 11 Ungültigkeit, fetched 2026-09-29"
      },
      {
        "url": "https://www.gesetze-im-internet.de/pa_g_1986/__15.html",
        "statedDate": "PassG § 15 Pflichten des Inhabers, fetched 2026-09-29"
      },
      {
        "url": "https://verwaltung.bund.de/leistungsverzeichnis/DE/leistung/99085001012000/herausgeber/BE-L100108_121151/region/11",
        "statedDate": "Bundesportal (Berlin) Reisepass beantragen; no update date stated; fetched 2026-09-29"
      },
      {
        "url": "https://verwaltung.bund.de/leistungsverzeichnis/DE/leistung/99085001012005/herausgeber/BE-L100108_121153/region/11",
        "statedDate": "Bundesportal (Berlin) Reisepass vorläufig beantragen; no update date stated; fetched 2026-09-29"
      },
      {
        "url": "https://verwaltung.bund.de/leistungsverzeichnis/DE/leistung/99085001012012/herausgeber/LeiKa-100521036/region/000000000000",
        "statedDate": "Bundesportal / Auswärtiges Amt, Reisepass im Ausland beantragen, last updated 16 June 2026"
      },
      {
        "url": "https://www.bmi.bund.de/SharedDocs/faqs/DE/themen/moderne-verwaltung/reisepass/beantragung-kosten-abholung/02-gebuehren.html",
        "statedDate": "BMI FAQ; confirmed only via search snippet (site returned HTTP 400 to direct fetch), 2026-09-29"
      },
      {
        "url": "https://verwaltung.bund.de/leistungsverzeichnis/DE/leistung/BY/35232",
        "statedDate": "Bundesportal loss/recovery guidance; confirmed only via search snippet, 2026-09-29"
      }
    ],
    "uncertain": [
      "processingDays.min: no official minimum stated; Berlin gives only 'bis zu 8 Wochen' and it varies by municipality.",
      "expediteDays is a working-day to calendar-day conversion of '4 Werktage'.",
      "lostReplacement.oldCancelled: invalidation is via police/Interpol search entry per official guidance, not a statutory invalidity clause.",
      "BMI FAQ pages couldn’t be fetched directly (HTTP 400); Express timing statement from BMI confirmed only via search snippet."
    ]
  },
  "FR": {
    "issuer": "Ministère de l'Intérieur via Agence nationale des titres sécurisés (ANTS); applications lodged at an equipped mairie; abroad at French embassies/consulates",
    "name": "Passeport (passeport biométrique)",
    "fee": 86,
    "currency": "EUR",
    "feeBasis": "Timbre fiscal for an adult (18+) passport, metropolitan France, first application or renewal alike (43 EUR in Guyane). Minors: 42 EUR aged 15-17, 17 EUR aged 0-14. If the photo is taken at the counter (only where no professional photographer), the stamp is 89 EUR.",
    "days": 21,
    "daysEstimated": true,
    "expedite": null,
    "validityYears": 10,
    "lost": "{\"fee\":86,\"oldCancelled\":true,\"note\":\"Replacement after loss costs the ordinary 86 EUR stamp (96 EUR abroad); the loss declaration (cerfa n°14011) can be made at the time of the new application. Once loss or theft is declared the passport is invalidated in the computer systems, irreversibly, and reported to Interpol and the Schengen Information System; a found passport must be returned to a prefecture.\"}",
    "abroad": "Abroad the adult passport costs 96 EUR (minors 27 EUR 0-14, 52 EUR 15-17), applied for at the embassy/consulate; the passeport temporaire costs 90 EUR. Residents registered on the Registre des Français établis hors de France can request postal delivery (prepaid envelope via the consulate's approved carrier). In Australia, Canada, Spain and Portugal eligible adults can renew without visiting the consulate.",
    "sources": [
      {
        "url": "https://www.service-public.fr/particuliers/vosdroits/F14929",
        "statedDate": "Passeport d'un majeur : première demande, Vérifié le 08 avril 2026"
      },
      {
        "url": "https://www.service-public.gouv.fr/particuliers/vosdroits/F34752",
        "statedDate": "Combien coûte un passeport ?, Vérifié le 05 août 2026"
      },
      {
        "url": "https://www.service-public.gouv.fr/particuliers/vosdroits/F14930",
        "statedDate": "Passeport d'un mineur : première demande, Vérifié le 19 juin 2026"
      },
      {
        "url": "https://www.service-public.gouv.fr/particuliers/vosdroits/F21246",
        "statedDate": "Passeport d'un majeur : renouvellement en cas de perte, Vérifié le 08 avril 2026"
      },
      {
        "url": "https://www.service-public.gouv.fr/particuliers/vosdroits/F1373",
        "statedDate": "Passeport en urgence : passeport temporaire pour un majeur, Vérifié le 06 octobre 2025"
      },
      {
        "url": "https://www.service-public.gouv.fr/particuliers/vosdroits/F18704",
        "statedDate": "Que faire si on retrouve sa carte d'identité ou son passeport après la déclaration de perte ou de vol ?, Vérifié le 09 avril 2025"
      }
    ],
    "uncertain": [
      "processingDays min/max: no official figure published on service-public; ANTS publishes live local delays only.",
      "expediteDays.max: passeport temporaire 'peut être remis immédiatement ou prendre quelques jours' - no number given.",
      "minRemainingValidityNote: no French rule; destination-country requirement."
    ]
  },
  "ES": {
    "issuer": "Dirección General de la Policía - Cuerpo Nacional de Policía (Ministerio del Interior); abroad: Oficinas Consulares (Ministerio de Asuntos Exteriores, Unión Europea y Cooperación)",
    "name": "Pasaporte ordinario (pasaporte electrónico)",
    "fee": 30,
    "currency": "EUR",
    "feeBasis": "Single tasa for first issue, renewal, loss, theft, early renewal ('anticipo') or damage, any age: 30,00 EUR; free for holders of a valid Título de Familia Numerosa. Amount set annually by the Ley de Presupuestos Generales del Estado.",
    "days": 0,
    "daysEstimated": false,
    "expedite": null,
    "validityYears": 10,
    "young": {
      "under": 30,
      "years": 5
    },
    "lost": "{\"fee\":30,\"oldCancelled\":true,\"note\":\"Same 30 EUR tasa. Loss/theft must be reported immediately to police/Guardia Civil (or consulate abroad). The first duplicate keeps the expiry date of the lost passport; later duplicates may be limited to 6 months, although a full 5/10-year passport can be issued exceptionally where a destination requires longer validity. A valid passport being replaced must be surrendered for anulación; the anulación of a reported-lost passport is inferred from the reporting duty and isn’t stated in these words.\"}",
    "abroad": "Only Spaniards registered as residents in the consulate's Registro de Matrícula Consular can get an ordinary passport abroad; the consular tasa is also 30 EUR. It isn’t issued on the spot: consular pages cite an indicative average of about 3 weeks. Non-registered Spaniards who lost their passport abroad can be issued a pasaporte provisional (RD 896/2003).",
    "sources": [
      {
        "url": "https://www.dnielectronico.es/PortalDNIe/PRF1_Cons02.action?pag=REF_1086",
        "statedDate": "Policía Nacional DNIe portal, Tasas de pasaporte 'para el presente año'; site build v.20260505; fetched 2026-09-29"
      },
      {
        "url": "https://www.dnielectronico.es/PortalDNIe/PRF1_Cons02.action?pag=REF_1085&id_menu=56",
        "statedDate": "Policía Nacional DNIe portal, Validez del Pasaporte; fetched 2026-09-29"
      },
      {
        "url": "https://www.dnielectronico.es/PortalDNIe/PRF1_Cons02.action?pag=REF_1084&id_menu=56",
        "statedDate": "Policía Nacional DNIe portal, Requisitos para la obtención; fetched 2026-09-29"
      },
      {
        "url": "https://www.boe.es/buscar/act.php?id=BOE-A-2003-13978",
        "statedDate": "Real Decreto 896/2003, consolidated text last updated 25/06/2014"
      },
      {
        "url": "https://www.interior.gob.es/opencms/es/servicios-al-ciudadano/tramites-y-gestiones/pasaporte/procedimiento-de-expedicion/",
        "statedDate": "Ministerio del Interior; 'en el acto' confirmed only via search snippet (Cloudflare/403 on direct fetch), 2026-09-29"
      },
      {
        "url": "https://www.exteriores.gob.es/Consulados/amsterdam/es/ServiciosConsulares/Paginas/index.aspx?scca=Pasaportes+y+otros+documentos&scco=Pa%C3%ADses+Bajos&scd=9&scs=Pasaportes+-+Requisitos+y+procedimiento+para+obtenerlo",
        "statedDate": "Consular 30 EUR tasa and ~3-week average confirmed only via search snippet of exteriores.gob.es consular pages, 2026-09-29"
      }
    ],
    "uncertain": [
      "Immediate issue ('en el acto') confirmed only via a search snippet of interior.gob.es; in practice waiting time depends on getting a cita previa, which isn’t counted.",
      "Consular processing (~3 weeks) and 30 EUR consular tasa seen only in search snippets and may vary by consulate.",
      "lostReplacement.oldCancelled: stated for surrendered valid passports; for reported-lost ones it’s inferred, not quoted."
    ]
  },
  "JP": {
    "issuer": "Ministry of Foreign Affairs of Japan (外務省), with applications taken and passports issued through prefectural passport offices (e.g. 東京都生活文化局 旅券課 / Tokyo Passport Centers)",
    "name": "一般旅券 (Japanese passport)",
    "fee": 9300,
    "currency": "JPY",
    "feeBasis": "10-year passport, applicant 18 or over, window (paper) application in Japan, new or renewal (切替) alike. Made of 7,000 national fee (収入印紙 revenue stamp) + 2,300 prefectural fee (Tokyo). Online application via Mynaportal: 8,900 (7,000 stamp + 1,900 prefectural; the prefectural fee is 400 lower online). Applies to applications from July 1, 2026. Before July 1, 2026 the 10-year fee was 16,300 window (14,000 stamp + 2,300 prefectural) / 15,900 online, and a 5-year passport for 12+ was 11,300 (9,000 + 2,300). From July 1, 2026 the 5-year passport is only for under-18s (4,800 window: 2,500 + 2,300; 4,400 online); adults can only get 10-year. A same-remaining-validity replacement (残存有効期間同一旅券, 18+) is 5,800 window (3,500 + 2,300). If a previously issued passport lapsed uncollected (未交付失効) within the last 5 years, the 10-year fee is 15,300 (11,000 + 4,300). The 2025 changes: from March 24, 2025 all passport applications (not only renewals) can be made online via Mynaportal, with the 400-yen-lower prefectural fee online.",
    "days": 12,
    "daysEstimated": false,
    "expedite": null,
    "validityYears": 10,
    "lost": "{\"fee\":9300,\"oldCancelled\":true,\"note\":\"No separate lost-passport fee: the holder files a 紛失一般旅券等届出書 (loss report, in person or online since 2025-03-24) and applies for a new passport at the ordinary fee (9,300 window / 8,900 online for 18+). Filing the report invalidates the lost passport; MOFA publishes its number in the official gazette (官報) and notifies foreign authorities, and it can’t be used even if found. A police report reference (or fire/municipal disaster certificate) is required. Alternative: a same-remaining-validity passport (5,800 window) is available for 18+.\"}",
    "abroad": "Residents abroad apply at a Japanese embassy or consulate. The fee is charged in local currency at a rate each mission publishes (set by fiscal-year exchange rates), and the July 1, 2026 reduction applies from 00:00 Japan time (or the same clock time locally for missions behind Japan). Processing is about 1 month because passports are produced in Japan and shipped. Local-currency amounts are on each mission's site and weren’t collected here.",
    "sources": [
      {
        "url": "https://www.seikatubunka.metro.tokyo.lg.jp/passport/documents/0000000432",
        "statedDate": "Page updated 2026-07-01; fetched 2026-09-29. Fee tables for applications from 2026-07-01 and up to 2026-06-30, uncollected-lapse table, online 400 reduction."
      },
      {
        "url": "https://www.seikatubunka.metro.tokyo.lg.jp/passport/others/0000001836",
        "statedDate": "Page updated 2026-08-25; fetched 2026-09-29. Online fee 8,900 (7,000 stamp + 1,900 prefectural) for 10-year 18+; online under-18 5-year shown as 4,800, which doesn’t add up (see uncertain)."
      },
      {
        "url": "https://www.seikatubunka.metro.tokyo.lg.jp/passport/guide/application/0000000361",
        "statedDate": "Page updated 2026-07-01; fetched 2026-09-29. Renewal eligibility (under 1 year remaining / 3 spreads), 18+ get 10-year, same-validity passport 5,800."
      },
      {
        "url": "https://www.seikatubunka.metro.tokyo.lg.jp/passport/guide/application/0000000362",
        "statedDate": "Page updated 2026-07-01; fetched 2026-09-29. Collection from 9th business day; 6-month collection limit; +6,000 after uncollected lapse."
      },
      {
        "url": "https://www.seikatubunka.metro.tokyo.lg.jp/passport/guide/loss/0000000360",
        "statedDate": "Page updated 2025-03-24; fetched 2026-09-29. Loss report procedure, invalidation, gazette publication, online from 2025-03-24."
      },
      {
        "url": "https://www.mofa.go.jp/mofaj/files/100482215.pdf",
        "statedDate": "MOFA fee table applicable from 2026-07-01 (national 7,000; prefectural 1,900 online / 2,300 window; totals 8,900 / 9,300). Confirmed via search snippet only; mofa.go.jp returned HTTP 403."
      },
      {
        "url": "https://www.mofa.go.jp/mofaj/ca/pss/pagew_000001_02493.html",
        "statedDate": "MOFA fee-revision page: effective 00:00 JST 2026-07-01; overseas missions take about 2 extra weeks. Search snippet only (HTTP 403)."
      },
      {
        "url": "https://www.honolulu.us.emb-japan.go.jp/itpr_ja/11_000001_01127.html",
        "statedDate": "Consulate notice on the 2026-07-01 revision: 5-year passport limited to under-18s from 2026-07-01; missions normally take about 1 month. Search snippet only (HTTP 403)."
      }
    ],
    "uncertain": [
      "Online fee for the under-18 5-year passport: the Tokyo online page lists 4,800 (2,500 stamp + 1,900 prefectural), which doesn’t add up (2,500 + 1,900 = 4,400); the Tokyo fee table says window 4,800 and online 400 less, i.e. 4,400. Treat 4,400 as the online figure; the page appears to contain a typo.",
      "Prefectural fee is set by each prefecture; 2,300 (1,900 online) is Tokyo's and matches the MOFA national table, but other prefectures weren’t individually checked.",
      "No official maximum processing time; processingDays.max is null.",
      "No expedited service exists in Japan for ordinary passports; expediteFee/expediteDays null. (Overseas missions issue an emergency travel document for return, not researched here.)",
      "Local-currency consular fees abroad after 2026-07-01 weren’t collected (mission pages returned HTTP 403).",
      "The pre-2025-03-24 fee structure (before the prefectural fee of 2,300 and the online discount) wasn’t re-verified from an official page."
    ]
  },
  "KR": {
    "issuer": "Ministry of Foreign Affairs of the Republic of Korea (외교부 여권과), through passport agencies (여권사무 대행기관: provincial/city halls and district offices) and overseas missions",
    "name": "대한민국 여권 (복수여권, electronic passport)",
    "fee": 52000,
    "currency": "KRW",
    "feeBasis": "10-year multiple-entry electronic passport (복수여권), 58 pages, applicant 18 or over; first issue and reissue alike. Made of 40,000 passport issuance fee (여권발급수수료) + 12,000 international exchange contribution (국제교류기여금). 26-page version: 49,000 (37,000 + 12,000). Issuance fee rose by 2,000 won from March 1, 2026. At overseas missions: USD 52 (58p) / USD 49 (26p).",
    "days": 15,
    "daysEstimated": false,
    "expedite": null,
    "validityYears": 10,
    "lost": "{\"fee\":52000,\"oldCancelled\":true,\"note\":\"A lost passport is reported (at a passport agency, via Government24 online, or at a mission abroad) and a new passport is issued at the ordinary fee (52,000 for 10-year 58p, 49,000 for 26p), or with the lost passport's remaining validity for 27,000. A passport reported lost is invalidated immediately, can’t be used even if recovered, and is registered with Interpol. Online reissue isn’t allowed for repeat losers (2+ losses in 5 years, or 1 loss in 5 years while another valid passport exists).\"}",
    "abroad": "Overseas Koreans apply at a Korean embassy or consulate; fees are charged in US-dollar terms (USD 52 for 10-year 58p, USD 49 for 26p, USD 50 emergency passport). Reissue on expiry can be applied for online through the 재외동포 365 민원포털 (first issue, lost/damaged and data-change cases must apply in person). Passports issued abroad are produced in Korea and shipped, so they take longer than domestic issue (mission-specific times not collected).",
    "sources": [
      {
        "url": "https://www.passport.go.kr/home/kor/contents.do?menuPos=41",
        "statedDate": "Fee table (수수료 안내) fetched 2026-09-29; reflects the 2026-03-01 increase. All fees, contribution split, USD mission fees, emergency passport, remaining-validity passport, 10-year-only rule for 18+."
      },
      {
        "url": "https://www.passport.go.kr/home/kor/main.do",
        "statedDate": "Notice '여권발급수수료 2천원 인상 안내 (2026.3.1.(일) 시행)', posted 2026-02-12; fetched 2026-09-29."
      },
      {
        "url": "https://www.passport.go.kr/home/kor/contents.do?menuPos=15",
        "statedDate": "Emergency passport page fetched 2026-09-29: 50,000 / 17,000, 33,000 refund, single-use 1 year."
      },
      {
        "url": "https://www.passport.go.kr/home/kor/contents.do?menuPos=16",
        "statedDate": "48-hour e-passport page fetched 2026-09-29: criteria, 14:00 cutoff, ordinary fee."
      },
      {
        "url": "https://www.passport.go.kr/home/kor/contents.do?menuPos=26",
        "statedDate": "Loss page fetched 2026-09-29: immediate invalidation, Interpol registration."
      },
      {
        "url": "https://www.passport.go.kr/home/kor/contents.do?menuPos=9",
        "statedDate": "Reissue for loss/damage page fetched 2026-09-29: fee table, online restrictions."
      },
      {
        "url": "https://www.passport.go.kr/home/kor/contents.do?menuPos=7",
        "statedDate": "Reissue on expiry page fetched 2026-09-29: new vs remaining-validity reissue, online channels (Government24, KB Star Banking, 재외동포365)."
      },
      {
        "url": "https://www.passport.go.kr/home/kor/contents.do?menuPos=45",
        "statedDate": "Postal delivery service page fetched 2026-09-29: about 3-4 business days, up to 10+."
      },
      {
        "url": "https://www.seocho.go.kr/site/seocho/01/10102010300002015070110.jsp",
        "statedDate": "Seocho-gu passport page: 8+ business days, 10-11 at peak. Search snippet only (page didn’t load)."
      },
      {
        "url": "https://www.jungnang.go.kr/portal/main/contents.do?menuNo=200012",
        "statedDate": "Jungnang-gu passport page: 10 business days incl. application day. Search snippet only (page didn’t load)."
      }
    ],
    "uncertain": [
      "No national standard processing time is published on passport.go.kr; processingDays comes from Seoul district-office pages seen only through search snippets and varies by office.",
      "expediteFee 52,000 is the ordinary fee charged for the 48-hour e-passport (no surcharge); it’s only available on strict criteria. The emergency non-electronic passport (50,000) is a different document.",
      "Mission-abroad processing times weren’t collected."
    ]
  },
  "MX": {
    "issuer": "Secretaría de Relaciones Exteriores (SRE), through its state offices (oficinas de pasaportes) in Mexico and consular offices abroad",
    "name": "Pasaporte ordinario mexicano (tipo \"N\")",
    "fee": 4280,
    "currency": "MXN",
    "feeBasis": "10-year ordinary passport, adult (18+), first issue or renewal alike, applied for in Mexico; derechos under Ley Federal de Derechos art. 20 fr. IV for 2026 (statutory amount 4,277.69, charged as 4,280). Other adult validities: 3 years 1,795 (art. 20 fr. II, 1,795.29); 6 years 2,440 (fr. III, 2,438.63). 1 year 920 (fr. I, 920.75) is only for children under 3. People over 60 and people with a certified disability pay 50% (3y 900, 6y 1,220, 10y 2,140); agricultural workers under the Mexico-Canada program pay 50% on 1-6-year passports only. Effective January 1, 2026.",
    "days": 0,
    "daysEstimated": false,
    "expedite": null,
    "validityYears": 10,
    "lost": "{\"fee\":4280,\"oldCancelled\":null,\"note\":\"No separate replacement fee: after loss, theft or destruction the holder reports it to the Ministerio Público (or the competent foreign authority abroad), fills in the SRE office form, and reapplies with first-time requirements, paying the ordinary fee for the chosen validity (4,280 for 10 years).\"}",
    "abroad": "Abroad, Mexicans apply by appointment at a consulate and pay there in US dollars (US figures for 2026, Consulate General in Atlanta): 1 year USD 44, 3 years USD 101, 6 years USD 137, 10 years USD 209; over-60s pay half (USD 50.50 / 68.50 / 104.50). Consulates charge 30% more for an emergency passport (LFD art. 20: USD 57 / 131 / 178 / 272). Fee revenue from abroad funds the consulates.",
    "sources": [
      {
        "url": "https://www.gob.mx/pasaporte/",
        "statedDate": "Official SRE passport site, fetched 2026-09-29 via WebFetch (curl blocked by a bot challenge): costs 920 / 1,795 / 2,440 / 4,280 and 50% amounts, effective 2026-01-01; same-day delivery; loss procedure; early renewal allowed."
      },
      {
        "url": "https://www.diputados.gob.mx/LeyesBiblio/pdf/LFD.pdf",
        "statedDate": "Ley Federal de Derechos, texto vigente, última reforma DOF 07-11-2025, amounts updated by Resolución Miscelánea Fiscal 2026 (DOF 28-12-2025). Art. 20 fr. I-IV: 920.75 / 1,795.29 / 2,438.63 / 4,277.69; emergency +30%; 50% for over-60s and disability; agricultural workers 50% on fr. I-III."
      },
      {
        "url": "https://sre.gob.mx/vigencias-de-pasaportes",
        "statedDate": "SRE validity by age (under 3: 1 or 3 years; 3-17: 3 or 6; 18+: 3, 6 or 10). Search snippet only."
      },
      {
        "url": "https://consulmex.sre.gob.mx/atlanta/images/stories/content/sitio/2026/enero/Derechos_Consulares_Consulmex_Atlanta_2026_V301225.pdf",
        "statedDate": "Tabla de derechos consulares 2026, Consulado General de México en Atlanta, 'vigente a partir del 1º de enero de 2026'; fetched 2026-09-29."
      }
    ],
    "uncertain": [
      "The 3-year fee is published by SRE as 1,795 while the other statutory amounts are rounded to the nearest ten (2,440, 4,280); 1,795 is used as SRE publishes it.",
      "Whether the lost passport is formally canceled on report isn’t stated on the page read; oldCancelled null.",
      "No domestic expedited service (issue is same-day); the 30% emergency surcharge appears in LFD art. 20 and on consular fee tables, so expediteFee is null for applications in Mexico.",
      "Appointment wait times aren’t published."
    ]
  },
  "AU": {
    "issuer": "Australian Passport Office, Department of Foreign Affairs and Trade",
    "name": "Australian Passport",
    "fee": 422,
    "currency": "AUD",
    "feeBasis": "Standard adult passport (aged 16 and over, 10-year validity); the same fee applies to a first passport and to a renewal. Figure from the fee table headed 'as of 1 January 2026' - no July 1, 2026 indexation is published; the current schedule is dated January 1, 2026.",
    "days": 42,
    "daysEstimated": false,
    "expedite": {
      "extra": 308,
      "days": 3,
      "note": "Priority processing"
    },
    "validityYears": 10,
    "lost": "{\"fee\":422,\"oldCancelled\":true,\"note\":\"A lost or stolen passport must be reported; APO cancels it and it can’t be used again even if found. You must apply for a new passport (not a renewal), so the standard adult fee applies; the $265 'Replacement passport' fee is only for minor damage or a name/gender change and explicitly can’t be used for a lost, stolen or canceled passport. Two losses in 5 years: next adult passport valid 5 years only, still at the 10-year fee; 3 or more: max 2 years or refusal, still at the 10-year fee. Those with 2+ losses in 5 years are ineligible for faster processing.\"}",
    "abroad": "Apply or renew through an Australian embassy or consulate, paying in local currency the equivalent of the AUD fee plus an overseas surcharge of $189 (adult) or $92 (child). Overseas applications aren’t eligible for Priority or Fast Track; allow at least 6 weeks, with mailing arrangements depending on location. An emergency passport overseas costs $265 (valid up to one year, no chip).",
    "sources": [
      {
        "url": "https://www.passports.gov.au/help/fees",
        "statedDate": "Page fee table headed 'Passport and travel document application fees as of 1 January 2026'; fetched 2026-09-29"
      },
      {
        "url": "https://www.passports.gov.au/help/processing-times",
        "statedDate": "'Passport timeframes as at August 2026'; fetched 2026-09-29"
      },
      {
        "url": "https://www.passports.gov.au/help/urgent-travel",
        "statedDate": "No date on page; fetched 2026-09-29"
      },
      {
        "url": "https://www.passports.gov.au/help/lost-and-stolen-passports",
        "statedDate": "No date on page; fetched 2026-09-29"
      },
      {
        "url": "https://www.passports.gov.au/help/replacement-passport",
        "statedDate": "No date on page; fetched 2026-09-29"
      },
      {
        "url": "https://www.passports.gov.au/help/applying-outside-australia",
        "statedDate": "No date on page; fetched 2026-09-29"
      },
      {
        "url": "https://www.passports.gov.au/help/passport-expiry",
        "statedDate": "No date on page; fetched 2026-09-29"
      }
    ],
    "uncertain": [
      "The brief asked for fees indexed 1 July 2026; the official fee page instead states a schedule 'as of 1 January 2026' and no July 2026 change was found, so $422 is taken as current.",
      "processingDays.min is null: APO publishes only maxima.",
      "lostReplacement.fee 422 is inferred from the rule that a lost/stolen passport requires a new passport application at the standard fee; APO lists no separate lost-passport fee."
    ]
  },
  "BR": {
    "issuer": "Polícia Federal (Departamento de Polícia Federal), Ministério da Justiça e Segurança Pública",
    "name": "Passaporte comum",
    "fee": 257.25,
    "currency": "BRL",
    "feeBasis": "Taxa de emissão de passaporte comum, paid via GRU/PagTesouro after submitting the online form; the same fee applies to first issue and to any new passport (there’s no separate renewal). Set by Portaria MJ 927/2015.",
    "days": 8,
    "daysEstimated": false,
    "expedite": {
      "extra": 77.17,
      "days": 7
    },
    "validityYears": 10,
    "lost": "{\"fee\":514.5,\"oldCancelled\":null,\"note\":\"If a valid passport was lost, mislaid, destroyed or retained by an embassy/company, a Comunicação de Ocorrência is filed and an additional fee is charged on top of the common R$ 257.25, totalling R$ 514.50 (Portaria MJ 927/2015). If it was stolen or seized and a police report (Boletim de Ocorrência) or seizure record is presented, only the common R$ 257.25 is charged; also only the common fee for loss in a Congress-declared public calamity. A previous passport that’s presented is physically canceled and returned (visas remain valid).\"}",
    "abroad": "Abroad, passports are issued by Brazilian embassies and consulates (Ministério das Relações Exteriores, via e-consular), not the Polícia Federal; fees are the consular fee in local currency, not the GRU. For loss or theft abroad, the holder goes to the Brazilian mission, which issues an Autorização de Retorno if a new passport can’t be issued.",
    "sources": [
      {
        "url": "https://www.gov.br/pf/pt-br/assuntos/passaporte/documentacao/formulario/pagar-taxa/pagamento-da-taxa",
        "statedDate": "Atualizado em 29/01/2024 (states R$ 257,25 or up to R$ 514,50); fetched 2026-09-29"
      },
      {
        "url": "https://www.gov.br/pf/pt-br/assuntos/passaporte/documentacao/lista-brasileiro",
        "statedDate": "Atualizado em 14/01/2026 (lost fee R$ 514,50, stolen/seized common fee only); fetched 2026-09-29"
      },
      {
        "url": "https://www.gov.br/pf/pt-br/assuntos/passaporte/ajuda/duvidas_/inicio/inicio-em-quantos-dias-consigo",
        "statedDate": "Atualizado em 29/01/2024 (6 dias úteis; R$ 77,17 surcharge, total R$ 334,42; urgência 3-5 dias úteis, emergência 24 horas úteis); fetched 2026-09-29"
      },
      {
        "url": "https://www.gov.br/pf/pt-br/assuntos/passaporte/suporte/duvidas_/inicio/prazo-de-entrega",
        "statedDate": "Atualizado em 03/08/2023 (payment clearance, 1-30 day appointment wait); fetched 2026-09-29"
      },
      {
        "url": "https://www.gov.br/pf/pt-br/assuntos/passaporte/ajuda/duvidas_/caderneta/caderneta-validade-do-passaporte",
        "statedDate": "Atualizado em 29/01/2024 (validity bands, exit/return rules); fetched 2026-09-29"
      },
      {
        "url": "https://www.gov.br/pf/pt-br/assuntos/passaporte/ajuda/duvidas_/caderneta/caderneta-perda-roubo-furto-etc",
        "statedDate": "Atualizado em 29/01/2024 (BO vs comunicação de ocorrência; abroad via embassy); fetched 2026-09-29"
      }
    ],
    "uncertain": [
      "processingDays min/max 8 is only the post-appointment production time (6 business days converted); the full journey adds 1-30 days waiting for an appointment and up to 72 business hours for payment clearance.",
      "lostReplacement.oldCancelled is null: PF pages say loss is communicated via Comunicação de Ocorrência but don’t state explicitly that the lost booklet is canceled.",
      "Consular fees for applying abroad weren’t captured: the MRE consulate page (Montreal) returned a CAPTCHA."
    ]
  },
  "NZ": {
    "issuer": "Te Tari Taiwhenua Department of Internal Affairs (New Zealand Passports)",
    "name": "New Zealand Passport",
    "fee": 247,
    "currency": "NZD",
    "feeBasis": "Standard adult passport (GST inclusive), fee in force from May 2, 2025; the same fee applies to first passports and renewals. Courier delivery is charged on top (NZD 7 to 78 for online applications, by destination).",
    "days": 28,
    "daysEstimated": false,
    "expedite": {
      "extra": 247,
      "days": 5,
      "note": "Urgent service; its fee is from search extracts, not read from the office itself"
    },
    "validityYears": 10,
    "lost": "{\"fee\":null,\"oldCancelled\":true,\"note\":\"The lost/stolen/damaged passport is declared (online or form PAS201) and canceled with an alert on the holder's record; a still-valid stolen passport must be reported to police with the report number given. A new passport isn’t issued until the holder applies for one. No separate lost-passport fee was found.\"}",
    "abroad": "Citizens overseas apply online to DIA (overseas paper forms go to offices in New Zealand, Sydney or London, paid in local currency). Fees are the same NZD amounts; non-residents for NZ tax applying online aren’t charged GST. Courier delivery NZD 7 to 78 depending on country. An emergency travel document for returning home costs NZD 685.",
    "sources": [
      {
        "url": "https://www.dia.govt.nz/press.nsf/d77da9b523f12931cc256ac5000d19b6/81b8eaa9c51a898acc258c7d0003b229!OpenDocument",
        "statedDate": "Press release 1 May 2025: adult $215 to $247, child $125 to $144, effective 2 May 2025; fetched 2026-09-29"
      },
      {
        "url": "https://www.passports.govt.nz/passport-costs",
        "statedDate": "Site returned HTTP 403; adult $247, child $144, urgent adult NZD 494, urgent child NZD 391, urgent upgrade NZD 247, courier NZD 7-78, ETD NZD 685 confirmed only through search snippets of this official page (2026-09-29)"
      },
      {
        "url": "https://www.passports.govt.nz/passport-costs/passport-timeframes",
        "statedDate": "Site returned HTTP 403; 20 working days advice and 3 working day urgent aim confirmed only through search snippets (2026-09-29)"
      },
      {
        "url": "https://www.dia.govt.nz/press.nsf/d77da9b523f12931cc256ac5000d19b6/a47510d80c862e03cc258b1d000a1c15!OpenDocument",
        "statedDate": "DIA statement on passport processing times; 85.6% within 10 working days figure via search snippet, date not confirmed"
      },
      {
        "url": "https://www.passports.govt.nz/urgent-travel",
        "statedDate": "Site returned HTTP 403; confirmed through search snippet only"
      },
      {
        "url": "https://www.passports.govt.nz/lost-stolen-or-damaged-passport",
        "statedDate": "Site returned HTTP 403; cancellation and police-report rules confirmed through search snippet only"
      },
      {
        "url": "https://www.passports.govt.nz/travel-information",
        "statedDate": "Validity (10 years age 16+, 5 years child) confirmed through search snippet only"
      }
    ],
    "uncertain": [
      "passports.govt.nz blocked all direct fetches (HTTP 403); every figure except the adult/child base fee (confirmed by the DIA press release) rests on search snippets of official pages.",
      "One search snippet showed a garbled 'NZD$898.00' against a child passport; it contradicts the press release and was discarded.",
      "processingDays.min is null: DIA publishes only guidance maxima.",
      "lostReplacement.fee is null: no separate lost/stolen replacement fee was found; presumably the standard application fee applies but that isn’t confirmed.",
      "minRemainingValidityNote is null: no DIA guidance found."
    ]
  },
  "LV": {
    "issuer": "Pilsonības un migrācijas lietu pārvalde (Office of Citizenship and Migration Affairs, PMLP/OCMA), under the Ministry of the Interior",
    "name": "Latvijas Republikas pilsoņa pase (Latvian citizen's passport)",
    "fee": 50,
    "currency": "EUR",
    "feeBasis": "State fee for issuing a passport within 10 working days, from January 1, 2026 (Cabinet Regulation No. 133 of February 21, 2012, as amended). The same fee applies to a first passport and a replacement. Apply in person at any PMLP division; there’s no online channel. Reduced fee of €25 for people under 20, pension-age or pensioner holders, and group I/II disability. The passport is optional in Latvia; the eID card (€30) is the mandatory identity document from age 15. Expedite: €75 is the full state fee for issue within 2 working days (not a surcharge); the reduced category pays €45. 2 working days x7/5 = 2.8, rounded to 3 calendar days. Express is charged at the 10-day rate for: a surname change within 30 days of marriage; within 30 days of naturalisation; medical treatment abroad; travel for a relative's illness or death; and under-20s or students under 24 on an organized school or youth trip.",
    "days": 14,
    "daysEstimated": false,
    "expedite": {
      "extra": 25,
      "days": 3,
      "note": "Two working days, €75 in all"
    },
    "validityYears": 10,
    "young": {
      "under": 20,
      "years": 5,
      "fee": 25
    },
    "lost": "{\"fee\":50,\"oldCancelled\":true,\"note\":\"The loss must be reported at once to PMLP, the State Police, the State Border Guard or, abroad, a Latvian mission. A document reported lost in writing becomes invalid even if found. Without another valid ID, the new application is due within 30 days. The fee schedule has no loss-specific fee, so the ordinary state fee applies. Losing a personal identification document can bring a warning or a fine of up to 14 fine units (€70) under Section 17(4) of the Personal Identification Documents Law.\"}",
    "abroad": "Abroad, apply in person at a Latvian embassy or consulate, which charges its own consular fees. Example, the Embassy of Latvia in Ireland (page updated July 15, 2026): adult passport €140 on the normal track (about 5 weeks on average) or €165 urgent (about 3 weeks); under-20s, pensioners and group I/II disability pay €115 or €135; forwarding documents within the consular district costs €15. A mission can issue a temporary travel document to return to Latvia if the passport is lost abroad.",
    "sources": [
      {
        "url": "https://www.pmlp.gov.lv/lv/valsts-nodeva-par-personu-apliecinosa-dokumenta-izsniegsanu",
        "statedDate": "Publicēts 24.09.2020, Atjaunināts 24.03.2026; fees effective from 2026-01-01"
      },
      {
        "url": "https://www.pmlp.gov.lv/lv/pilsona-pase",
        "statedDate": "Publicēts 24.09.2020, Atjaunināts 23.08.2025"
      },
      {
        "url": "https://www.pmlp.gov.lv/en/if-your-personal-identification-document-passport-or-eid-card-has-been-lost-stolen-or-seized",
        "statedDate": "Published 06.01.2021, Updated 25.07.2025"
      },
      {
        "url": "https://www.pmlp.gov.lv/en/administrative-offences-field-personal-identification-documents",
        "statedDate": "Published 06.01.2021, Updated 25.07.2025"
      },
      {
        "url": "https://www.pmlp.gov.lv/en/when-passport-or-identity-card-shall-be-changed",
        "statedDate": "Published 06.01.2021"
      },
      {
        "url": "https://www2.mfa.gov.lv/ireland/konsulara-informacija/latvijas-pasu-un-personu-apliecibu-izsniegsana",
        "statedDate": "Publicēts 16.02.2026, Atjaunināts 15.07.2026 (Embassy of Latvia in Ireland consular fees)"
      }
    ],
    "uncertain": [
      "lostReplacement.fee 50: the fee schedule publishes no loss-specific fee, and a PMLP search snippet says a state fee is paid for the new document. The standard fee is inferred, and a separate fine of up to €70 may apply.",
      "processingDays.min and expediteDays.min aren’t published.",
      "Consular fees vary by mission; only the Embassy in Ireland's schedule was checked.",
      "PMLP publishes no minimum-remaining-validity guidance."
    ]
  }
};
