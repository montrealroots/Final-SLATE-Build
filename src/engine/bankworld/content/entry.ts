/**
 * SLATE — who may come in, for a short stay (tourism and business visits, not
 * work), by destination and by citizenship: visa-free and for how long, a
 * travel authorization and which, a visa, free movement, or the country's
 * own citizens; each destination's passport validity rule; and each
 * authorization's fee, validity and processing. Researched 2026-09-29 from each
 * government's own pages where they could be read, and every rule carries its
 * source. What the research could not confirm is in `ENTRY_UNCERTAIN`, and a
 * passport rule not confirmed says so (`confirmed: false`), SLATE then asking
 * only validity for the stay. Built by `tools/build-entry.mjs`; don't edit by
 * hand.
 *
 * Fifteen destinations and fifteen citizenships: the countries SLATE's lives
 * begin in and bank in. A pair outside them is a rule SLATE doesn't have, and
 * `systems/documents.ts` says so rather than assume one.
 */

export type EntryStatus = 'citizen' | 'free-movement' | 'free' | 'authorization' | 'visa';

export interface EntryRule {
  status: EntryStatus;
  /** The authorization this citizenship needs, a key of the destination's `authorizations`. */
  authorization?: string;
  /** The visa this citizenship needs, by the destination's name for it. */
  visa?: string;
  maxDays: number | null;
  windowDays: number | null;
  note: string;
  source: string;
}

export interface Authorization {
  name: string;
  fee: number;
  currency: string;
  validityYears: number;
  /** Whether it's in force: the EU's ETIAS is researched and not yet live. */
  live: boolean;
  processing: string;
  source: string;
  statedDate: string;
}

export interface Destination {
  authority: string;
  passport: { beyondDays: number; issuedWithinYears?: number; confirmed: boolean; rule: string };
  authorizations: Record<string, Authorization>;
  citizens: Record<string, EntryRule>;
}

export const ENTRY: Readonly<Record<string, Destination>> = {
  "US": {
    "authority": "U.S. Department of State (visas) and U.S. Customs and Border Protection (ESTA and admission)",
    "passport": {
      "beyondDays": 0,
      "confirmed": true,
      "rule": "VWP travelers need an electronic (chip) passport. Passport must be valid for the intended stay; nationals of 'Six-Month Club' countries (which include the VWP countries in this list) need only validity for the duration of stay. Source: travel.state.gov VWP page; CBP."
    },
    "authorizations": {
      "ESTA": {
        "name": "ESTA (Electronic System for Travel Authorization)",
        "fee": 40,
        "currency": "USD",
        "validityYears": 2,
        "live": true,
        "processing": "Fee rose from USD 21 to USD 40 for applications on or after 30 Sep 2025 (Public Law 119-21, H.R. 1). Most decisions immediate; CBP advises applying at least 72 hours before travel. Valid 2 years or until passport expiry.",
        "source": "https://www.cbp.gov/newsroom/national-media-release/cbp-announces-esta-fee-change",
        "statedDate": "2025-09-30 (fee effective)"
      }
    },
    "citizens": {
      "US": {
        "status": "citizen",
        "maxDays": null,
        "windowDays": null,
        "note": "You’re one of its citizens.",
        "source": "https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visa-waiver-program.html"
      },
      "CA": {
        "status": "free",
        "maxDays": 180,
        "windowDays": null,
        "note": "Canadian citizens need no visa and don’t use ESTA. US Customs and Border Protection usually admits them for up to 6 months, at the officer’s discretion.",
        "source": "https://www.cbp.gov/travel/international-visitors/visa-waiver-program"
      },
      "MX": {
        "status": "visa",
        "visa": "B-1/B-2 visa or Border Crossing Card",
        "maxDays": 180,
        "windowDays": null,
        "note": "Mexico isn’t in the Visa Waiver Program. US Customs and Border Protection sets how long a B-1/B-2 visitor may stay at entry, commonly up to 6 months.",
        "source": "https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visa-waiver-program.html"
      },
      "BR": {
        "status": "visa",
        "visa": "B-1/B-2 visa",
        "maxDays": 180,
        "windowDays": null,
        "note": "Brazil isn’t in the Visa Waiver Program. US Customs and Border Protection sets how long a visitor may stay at entry, commonly up to 6 months.",
        "source": "https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visa-waiver-program.html"
      },
      "GB": {
        "status": "authorization",
        "authorization": "ESTA",
        "maxDays": 90,
        "windowDays": null,
        "note": "Under the Visa Waiver Program: up to 90 days each visit, with no extension. There’s no fixed limit over a year, but border officers look closely at frequent or long stays. You need an e-passport.",
        "source": "https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visa-waiver-program.html"
      },
      "IE": {
        "status": "authorization",
        "authorization": "ESTA",
        "maxDays": 90,
        "windowDays": null,
        "note": "Under the Visa Waiver Program: up to 90 days each visit, with no extension. There’s no fixed limit over a year, but border officers look closely at frequent or long stays. You need an e-passport.",
        "source": "https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visa-waiver-program.html"
      },
      "IS": {
        "status": "authorization",
        "authorization": "ESTA",
        "maxDays": 90,
        "windowDays": null,
        "note": "Under the Visa Waiver Program: up to 90 days each visit, with no extension. There’s no fixed limit over a year, but border officers look closely at frequent or long stays. You need an e-passport.",
        "source": "https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visa-waiver-program.html"
      },
      "DE": {
        "status": "authorization",
        "authorization": "ESTA",
        "maxDays": 90,
        "windowDays": null,
        "note": "Under the Visa Waiver Program: up to 90 days each visit, with no extension. There’s no fixed limit over a year, but border officers look closely at frequent or long stays. You need an e-passport.",
        "source": "https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visa-waiver-program.html"
      },
      "FR": {
        "status": "authorization",
        "authorization": "ESTA",
        "maxDays": 90,
        "windowDays": null,
        "note": "Under the Visa Waiver Program: up to 90 days each visit, with no extension. There’s no fixed limit over a year, but border officers look closely at frequent or long stays. You need an e-passport.",
        "source": "https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visa-waiver-program.html"
      },
      "ES": {
        "status": "authorization",
        "authorization": "ESTA",
        "maxDays": 90,
        "windowDays": null,
        "note": "Under the Visa Waiver Program: up to 90 days each visit, with no extension. There’s no fixed limit over a year, but border officers look closely at frequent or long stays. You need an e-passport.",
        "source": "https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visa-waiver-program.html"
      },
      "JP": {
        "status": "authorization",
        "authorization": "ESTA",
        "maxDays": 90,
        "windowDays": null,
        "note": "Under the Visa Waiver Program: up to 90 days each visit, with no extension. There’s no fixed limit over a year, but border officers look closely at frequent or long stays. You need an e-passport.",
        "source": "https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visa-waiver-program.html"
      },
      "KR": {
        "status": "authorization",
        "authorization": "ESTA",
        "maxDays": 90,
        "windowDays": null,
        "note": "Under the Visa Waiver Program: up to 90 days each visit, with no extension. There’s no fixed limit over a year, but border officers look closely at frequent or long stays. You need an e-passport.",
        "source": "https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visa-waiver-program.html"
      },
      "AU": {
        "status": "authorization",
        "authorization": "ESTA",
        "maxDays": 90,
        "windowDays": null,
        "note": "Under the Visa Waiver Program: up to 90 days each visit, with no extension. There’s no fixed limit over a year, but border officers look closely at frequent or long stays. You need an e-passport.",
        "source": "https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visa-waiver-program.html"
      },
      "NZ": {
        "status": "authorization",
        "authorization": "ESTA",
        "maxDays": 90,
        "windowDays": null,
        "note": "Under the Visa Waiver Program: up to 90 days each visit, with no extension. There’s no fixed limit over a year, but border officers look closely at frequent or long stays. You need an e-passport.",
        "source": "https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visa-waiver-program.html"
      },
      "LV": {
        "status": "authorization",
        "authorization": "ESTA",
        "maxDays": 90,
        "windowDays": null,
        "note": "Under the Visa Waiver Program: up to 90 days each visit, with no extension. There’s no fixed limit over a year, but border officers look closely at frequent or long stays. You need an e-passport.",
        "source": "https://travel.state.gov/content/travel/en/us-visas/tourism-visit/visa-waiver-program.html"
      }
    }
  },
  "GB": {
    "authority": "UK Visas and Immigration and Border Force (Home Office)",
    "passport": {
      "beyondDays": 0,
      "confirmed": true,
      "rule": "Passport must be valid for the whole stay (no extra-months rule for visitors). An ETA is linked to the passport used to apply and ends if that passport expires. Source: gov.uk visit and ETA guidance."
    },
    "authorizations": {
      "ETA": {
        "name": "ETA (Electronic Travel Authorisation)",
        "fee": 20,
        "currency": "GBP",
        "validityYears": 2,
        "live": true,
        "processing": "Fee rose from GBP 16 to GBP 20 on 8 Apr 2026. Most decisions within minutes via the UK ETA app; Home Office advises applying 3 working days ahead. Multiple journeys, stays up to 6 months each; valid 2 years or until passport expiry. Covers the UK, Jersey, Guernsey and the Isle of Man.",
        "source": "https://homeofficemedia.blog.gov.uk/electronic-travel-authorisation-eta-factsheet-april-2026/",
        "statedDate": "2026-04 factsheet; rollout: non-Europeans 8 Jan 2025, Europeans 2 Apr 2025; mandatory enforcement 25 Feb 2026"
      }
    },
    "citizens": {
      "GB": {
        "status": "citizen",
        "maxDays": null,
        "windowDays": null,
        "note": "You’re one of its citizens.",
        "source": "https://www.gov.uk/guidance/apply-for-an-electronic-travel-authorisation-eta"
      },
      "IE": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Under the Common Travel Area, Irish citizens need no ETA or visa, and may live and work in the UK.",
        "source": "https://www.gov.uk/guidance/apply-for-an-electronic-travel-authorisation-eta"
      },
      "US": {
        "status": "authorization",
        "authorization": "ETA",
        "maxDays": 180,
        "windowDays": null,
        "note": "A visitor may stay up to 6 months each visit. An ETA has been required for travel since January 8, 2025 (Appendix ETA National List, section (c)), and airlines and other carriers have checked for one since February 25, 2026.",
        "source": "https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-eta-national-list"
      },
      "CA": {
        "status": "authorization",
        "authorization": "ETA",
        "maxDays": 180,
        "windowDays": null,
        "note": "A visitor may stay up to 6 months each visit. An ETA has been required for travel since January 8, 2025 (Appendix ETA National List, section (c)), and airlines and other carriers have checked for one since February 25, 2026.",
        "source": "https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-eta-national-list"
      },
      "JP": {
        "status": "authorization",
        "authorization": "ETA",
        "maxDays": 180,
        "windowDays": null,
        "note": "A visitor may stay up to 6 months each visit. An ETA has been required for travel since January 8, 2025 (Appendix ETA National List, section (c)), and airlines and other carriers have checked for one since February 25, 2026.",
        "source": "https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-eta-national-list"
      },
      "KR": {
        "status": "authorization",
        "authorization": "ETA",
        "maxDays": 180,
        "windowDays": null,
        "note": "A visitor may stay up to 6 months each visit. An ETA has been required for travel since January 8, 2025 (Appendix ETA National List, section (c)), and airlines and other carriers have checked for one since February 25, 2026.",
        "source": "https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-eta-national-list"
      },
      "MX": {
        "status": "authorization",
        "authorization": "ETA",
        "maxDays": 180,
        "windowDays": null,
        "note": "A visitor may stay up to 6 months each visit. An ETA has been required for travel since January 8, 2025 (Appendix ETA National List, section (c)), and airlines and other carriers have checked for one since February 25, 2026.",
        "source": "https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-eta-national-list"
      },
      "AU": {
        "status": "authorization",
        "authorization": "ETA",
        "maxDays": 180,
        "windowDays": null,
        "note": "A visitor may stay up to 6 months each visit. An ETA has been required for travel since January 8, 2025 (Appendix ETA National List, section (c)), and airlines and other carriers have checked for one since February 25, 2026.",
        "source": "https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-eta-national-list"
      },
      "BR": {
        "status": "authorization",
        "authorization": "ETA",
        "maxDays": 180,
        "windowDays": null,
        "note": "A visitor may stay up to 6 months each visit. An ETA has been required for travel since January 8, 2025 (Appendix ETA National List, section (c)), and airlines and other carriers have checked for one since February 25, 2026.",
        "source": "https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-eta-national-list"
      },
      "NZ": {
        "status": "authorization",
        "authorization": "ETA",
        "maxDays": 180,
        "windowDays": null,
        "note": "A visitor may stay up to 6 months each visit. An ETA has been required for travel since January 8, 2025 (Appendix ETA National List, section (c)), and airlines and other carriers have checked for one since February 25, 2026.",
        "source": "https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-eta-national-list"
      },
      "IS": {
        "status": "authorization",
        "authorization": "ETA",
        "maxDays": 180,
        "windowDays": null,
        "note": "A visitor may stay up to 6 months each visit. European nationals have needed an ETA for travel since April 2, 2025 (Appendix ETA National List, section (d)). Applications opened on March 5, 2025.",
        "source": "https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-eta-national-list"
      },
      "DE": {
        "status": "authorization",
        "authorization": "ETA",
        "maxDays": 180,
        "windowDays": null,
        "note": "A visitor may stay up to 6 months each visit. European nationals have needed an ETA for travel since April 2, 2025 (Appendix ETA National List, section (d)). Applications opened on March 5, 2025.",
        "source": "https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-eta-national-list"
      },
      "FR": {
        "status": "authorization",
        "authorization": "ETA",
        "maxDays": 180,
        "windowDays": null,
        "note": "A visitor may stay up to 6 months each visit. European nationals have needed an ETA for travel since April 2, 2025 (Appendix ETA National List, section (d)). Applications opened on March 5, 2025.",
        "source": "https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-eta-national-list"
      },
      "ES": {
        "status": "authorization",
        "authorization": "ETA",
        "maxDays": 180,
        "windowDays": null,
        "note": "A visitor may stay up to 6 months each visit. European nationals have needed an ETA for travel since April 2, 2025 (Appendix ETA National List, section (d)). Applications opened on March 5, 2025.",
        "source": "https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-eta-national-list"
      },
      "LV": {
        "status": "authorization",
        "authorization": "ETA",
        "maxDays": 180,
        "windowDays": null,
        "note": "A visitor may stay up to 6 months each visit. European nationals have needed an ETA for travel since April 2, 2025 (Appendix ETA National List, section (d)). Applications opened on March 5, 2025.",
        "source": "https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-eta-national-list"
      }
    }
  },
  "CA": {
    "authority": "Immigration, Refugees and Citizenship Canada (IRCC) and Canada Border Services Agency (CBSA)",
    "passport": {
      "beyondDays": 0,
      "confirmed": true,
      "rule": "Passport valid for the planned stay; an eTA is linked to the passport and ends when it expires. Source: canada.ca entry requirements."
    },
    "authorizations": {
      "eTA": {
        "name": "eTA (Electronic Travel Authorization)",
        "fee": 7,
        "currency": "CAD",
        "validityYears": 5,
        "live": true,
        "processing": "Most approved within minutes; some take several days. Valid up to 5 years or until passport expiry. Air travel only.",
        "source": "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta.html",
        "statedDate": "current as of 2026"
      }
    },
    "citizens": {
      "CA": {
        "status": "citizen",
        "maxDays": null,
        "windowDays": null,
        "note": "You’re one of its citizens.",
        "source": "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/entry-requirements-country.html"
      },
      "US": {
        "status": "free",
        "maxDays": 180,
        "windowDays": null,
        "note": "US citizens need neither a visa nor an eTA, only a valid US passport. Visitors are normally admitted for up to 6 months, at the officer’s discretion.",
        "source": "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/entry-requirements-country.html"
      },
      "MX": {
        "status": "visa",
        "visa": "Visitor visa (TRV), or eTA if eligible",
        "maxDays": 180,
        "windowDays": null,
        "note": "Since February 29, 2024, Mexican citizens need a visitor visa. An eTA is enough instead for someone flying in on a Mexican passport who holds a valid US nonimmigrant visa, or has held a Canadian visa in the past 10 years. Arriving by land or sea always needs a visa.",
        "source": "https://www.canada.ca/en/immigration-refugees-citizenship/campaigns/eta-work-visa-mexico.html"
      },
      "BR": {
        "status": "visa",
        "visa": "Visitor visa (TRV), or eTA if eligible",
        "maxDays": 180,
        "windowDays": null,
        "note": "Brazilians need a visa, but those flying in who hold a valid US nonimmigrant visa, or have held a Canadian visa in the past 10 years, can use an eTA instead. That’s by air only.",
        "source": "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta/eligibility/eta-x.html"
      },
      "GB": {
        "status": "authorization",
        "authorization": "eTA",
        "maxDays": 180,
        "windowDays": null,
        "note": "An eTA is required to fly to or through a Canadian airport, but not to arrive by land or sea. Visitors are normally admitted for up to 6 months, at the officer’s discretion.",
        "source": "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/entry-requirements-country.html"
      },
      "IE": {
        "status": "authorization",
        "authorization": "eTA",
        "maxDays": 180,
        "windowDays": null,
        "note": "An eTA is required to fly to or through a Canadian airport, but not to arrive by land or sea. Visitors are normally admitted for up to 6 months, at the officer’s discretion.",
        "source": "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/entry-requirements-country.html"
      },
      "IS": {
        "status": "authorization",
        "authorization": "eTA",
        "maxDays": 180,
        "windowDays": null,
        "note": "An eTA is required to fly to or through a Canadian airport, but not to arrive by land or sea. Visitors are normally admitted for up to 6 months, at the officer’s discretion.",
        "source": "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/entry-requirements-country.html"
      },
      "DE": {
        "status": "authorization",
        "authorization": "eTA",
        "maxDays": 180,
        "windowDays": null,
        "note": "An eTA is required to fly to or through a Canadian airport, but not to arrive by land or sea. Visitors are normally admitted for up to 6 months, at the officer’s discretion.",
        "source": "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/entry-requirements-country.html"
      },
      "FR": {
        "status": "authorization",
        "authorization": "eTA",
        "maxDays": 180,
        "windowDays": null,
        "note": "An eTA is required to fly to or through a Canadian airport, but not to arrive by land or sea. Visitors are normally admitted for up to 6 months, at the officer’s discretion.",
        "source": "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/entry-requirements-country.html"
      },
      "ES": {
        "status": "authorization",
        "authorization": "eTA",
        "maxDays": 180,
        "windowDays": null,
        "note": "An eTA is required to fly to or through a Canadian airport, but not to arrive by land or sea. Visitors are normally admitted for up to 6 months, at the officer’s discretion.",
        "source": "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/entry-requirements-country.html"
      },
      "JP": {
        "status": "authorization",
        "authorization": "eTA",
        "maxDays": 180,
        "windowDays": null,
        "note": "An eTA is required to fly to or through a Canadian airport, but not to arrive by land or sea. Visitors are normally admitted for up to 6 months, at the officer’s discretion.",
        "source": "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/entry-requirements-country.html"
      },
      "KR": {
        "status": "authorization",
        "authorization": "eTA",
        "maxDays": 180,
        "windowDays": null,
        "note": "An eTA is required to fly to or through a Canadian airport, but not to arrive by land or sea. Visitors are normally admitted for up to 6 months, at the officer’s discretion.",
        "source": "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/entry-requirements-country.html"
      },
      "AU": {
        "status": "authorization",
        "authorization": "eTA",
        "maxDays": 180,
        "windowDays": null,
        "note": "An eTA is required to fly to or through a Canadian airport, but not to arrive by land or sea. Visitors are normally admitted for up to 6 months, at the officer’s discretion.",
        "source": "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/entry-requirements-country.html"
      },
      "NZ": {
        "status": "authorization",
        "authorization": "eTA",
        "maxDays": 180,
        "windowDays": null,
        "note": "An eTA is required to fly to or through a Canadian airport, but not to arrive by land or sea. Visitors are normally admitted for up to 6 months, at the officer’s discretion.",
        "source": "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/entry-requirements-country.html"
      },
      "LV": {
        "status": "authorization",
        "authorization": "eTA",
        "maxDays": 180,
        "windowDays": null,
        "note": "An eTA is required to fly to or through a Canadian airport, but not to arrive by land or sea. Visitors are normally admitted for up to 6 months, at the officer’s discretion.",
        "source": "https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/entry-requirements-country.html"
      }
    }
  },
  "IE": {
    "authority": "Immigration Service Delivery (Department of Justice) and the Border Management Unit / Garda National Immigration Bureau",
    "passport": {
      "beyondDays": 0,
      "confirmed": false,
      "rule": "Visitors must hold a valid passport; Irish immigration guidance for visa applicants asks for validity of at least 6 months beyond the intended departure (see uncertain). Source: irishimmigration.ie."
    },
    "authorizations": {},
    "citizens": {
      "IE": {
        "status": "citizen",
        "maxDays": null,
        "windowDays": null,
        "note": "You’re one of its citizens.",
        "source": "https://www.irishimmigration.ie/coming-to-visit-ireland/"
      },
      "GB": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Under the Common Travel Area, British citizens need no visa or permission, and may live and work in Ireland.",
        "source": "https://www.irishimmigration.ie/coming-to-visit-ireland/"
      },
      "IS": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA. Ireland is outside the Schengen area, so there are still passport or ID checks at the border.",
        "source": "https://www.irishimmigration.ie/coming-to-visit-ireland/"
      },
      "DE": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA. Ireland is outside the Schengen area, so there are still passport or ID checks at the border.",
        "source": "https://www.irishimmigration.ie/coming-to-visit-ireland/"
      },
      "FR": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA. Ireland is outside the Schengen area, so there are still passport or ID checks at the border.",
        "source": "https://www.irishimmigration.ie/coming-to-visit-ireland/"
      },
      "ES": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA. Ireland is outside the Schengen area, so there are still passport or ID checks at the border.",
        "source": "https://www.irishimmigration.ie/coming-to-visit-ireland/"
      },
      "LV": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA. Ireland is outside the Schengen area, so there are still passport or ID checks at the border.",
        "source": "https://www.irishimmigration.ie/coming-to-visit-ireland/"
      },
      "US": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "An immigration officer at the border grants permission to land for up to 90 days. Ireland isn’t in the Schengen area, so this doesn’t count toward Schengen’s 90 days in 180. There’s no electronic travel authorization scheme in force.",
        "source": "https://www.ireland.ie/en/dfa/visas-for-ireland/"
      },
      "CA": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "An immigration officer at the border grants permission to land for up to 90 days. Ireland isn’t in the Schengen area, so this doesn’t count toward Schengen’s 90 days in 180. There’s no electronic travel authorization scheme in force.",
        "source": "https://www.ireland.ie/en/dfa/visas-for-ireland/"
      },
      "JP": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "An immigration officer at the border grants permission to land for up to 90 days. Ireland isn’t in the Schengen area, so this doesn’t count toward Schengen’s 90 days in 180. There’s no electronic travel authorization scheme in force.",
        "source": "https://www.ireland.ie/en/dfa/visas-for-ireland/"
      },
      "KR": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "An immigration officer at the border grants permission to land for up to 90 days. Ireland isn’t in the Schengen area, so this doesn’t count toward Schengen’s 90 days in 180. There’s no electronic travel authorization scheme in force.",
        "source": "https://www.ireland.ie/en/dfa/visas-for-ireland/"
      },
      "MX": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "An immigration officer at the border grants permission to land for up to 90 days. Ireland isn’t in the Schengen area, so this doesn’t count toward Schengen’s 90 days in 180. There’s no electronic travel authorization scheme in force.",
        "source": "https://www.ireland.ie/en/dfa/visas-for-ireland/"
      },
      "AU": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "An immigration officer at the border grants permission to land for up to 90 days. Ireland isn’t in the Schengen area, so this doesn’t count toward Schengen’s 90 days in 180. There’s no electronic travel authorization scheme in force.",
        "source": "https://www.ireland.ie/en/dfa/visas-for-ireland/"
      },
      "BR": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "An immigration officer at the border grants permission to land for up to 90 days. Ireland isn’t in the Schengen area, so this doesn’t count toward Schengen’s 90 days in 180. There’s no electronic travel authorization scheme in force.",
        "source": "https://www.ireland.ie/en/dfa/visas-for-ireland/"
      },
      "NZ": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "An immigration officer at the border grants permission to land for up to 90 days. Ireland isn’t in the Schengen area, so this doesn’t count toward Schengen’s 90 days in 180. There’s no electronic travel authorization scheme in force.",
        "source": "https://www.ireland.ie/en/dfa/visas-for-ireland/"
      }
    }
  },
  "IS": {
    "authority": "Directorate of Immigration (Utlendingastofnun) and the Icelandic police (border control), applying the common Schengen rules",
    "passport": {
      "beyondDays": 90,
      "issuedWithinYears": 10,
      "confirmed": true,
      "rule": "Schengen Borders Code (Regulation (EU) 2016/399) art. 6: third-country nationals need a travel document valid at least 3 months after the intended date of departure from the Schengen area and issued within the previous 10 years. Source: https://travel-europe.europa.eu/"
    },
    "authorizations": {
      "ETIAS": {
        "name": "ETIAS (European Travel Information and Authorisation System)",
        "fee": 20,
        "currency": "EUR",
        "validityYears": 3,
        "live": false,
        "processing": "Not operating on 2026-09-29. The Commission had indicated the last quarter of 2026; the official portal later removed that window and no new date is published; reporting points to 2027. Fee set at EUR 20 (raised from the original EUR 7). Will cover visa-exempt third-country nationals. Separately, the Entry/Exit System (EES) started 12 Oct 2025 and became fully operational on 10 Apr 2026, replacing passport stamps with biometric registration.",
        "source": "https://travel-europe.europa.eu/etias_en",
        "statedDate": "scheduled; no confirmed start date as of 2026-09-29"
      }
    },
    "citizens": {
      "US": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "GB": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026. UK nationals have been treated as non-EU nationals since January 1, 2021.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "CA": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "IE": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA. Ireland is in the EU but outside the Schengen area, so there are ID or passport checks at the Schengen border.",
        "source": "https://travel-europe.europa.eu/"
      },
      "IS": {
        "status": "citizen",
        "maxDays": null,
        "windowDays": null,
        "note": "You’re one of its citizens.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "DE": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA.",
        "source": "https://travel-europe.europa.eu/"
      },
      "FR": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA.",
        "source": "https://travel-europe.europa.eu/"
      },
      "ES": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA.",
        "source": "https://travel-europe.europa.eu/"
      },
      "JP": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "KR": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "MX": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "AU": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "BR": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "NZ": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "LV": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA.",
        "source": "https://travel-europe.europa.eu/"
      }
    }
  },
  "DE": {
    "authority": "Federal Foreign Office (Auswaertiges Amt) and Federal Police (Bundespolizei), applying the common Schengen rules",
    "passport": {
      "beyondDays": 90,
      "issuedWithinYears": 10,
      "confirmed": true,
      "rule": "Schengen Borders Code (Regulation (EU) 2016/399) art. 6: third-country nationals need a travel document valid at least 3 months after the intended date of departure from the Schengen area and issued within the previous 10 years. Source: https://travel-europe.europa.eu/"
    },
    "authorizations": {
      "ETIAS": {
        "name": "ETIAS (European Travel Information and Authorisation System)",
        "fee": 20,
        "currency": "EUR",
        "validityYears": 3,
        "live": false,
        "processing": "Not operating on 2026-09-29. The Commission had indicated the last quarter of 2026; the official portal later removed that window and no new date is published; reporting points to 2027. Fee set at EUR 20 (raised from the original EUR 7). Will cover visa-exempt third-country nationals. Separately, the Entry/Exit System (EES) started 12 Oct 2025 and became fully operational on 10 Apr 2026, replacing passport stamps with biometric registration.",
        "source": "https://travel-europe.europa.eu/etias_en",
        "statedDate": "scheduled; no confirmed start date as of 2026-09-29"
      }
    },
    "citizens": {
      "US": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "GB": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026. UK nationals have been treated as non-EU nationals since January 1, 2021.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "CA": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "IE": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA. Ireland is in the EU but outside the Schengen area, so there are ID or passport checks at the Schengen border.",
        "source": "https://travel-europe.europa.eu/"
      },
      "IS": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA.",
        "source": "https://travel-europe.europa.eu/"
      },
      "DE": {
        "status": "citizen",
        "maxDays": null,
        "windowDays": null,
        "note": "You’re one of its citizens.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "FR": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA.",
        "source": "https://travel-europe.europa.eu/"
      },
      "ES": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA.",
        "source": "https://travel-europe.europa.eu/"
      },
      "JP": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "KR": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "MX": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "AU": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "BR": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "NZ": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "LV": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA.",
        "source": "https://travel-europe.europa.eu/"
      }
    }
  },
  "FR": {
    "authority": "Ministry for Europe and Foreign Affairs and Ministry of the Interior (France-Visas; Police aux frontieres), applying the common Schengen rules",
    "passport": {
      "beyondDays": 90,
      "issuedWithinYears": 10,
      "confirmed": true,
      "rule": "Schengen Borders Code (Regulation (EU) 2016/399) art. 6: third-country nationals need a travel document valid at least 3 months after the intended date of departure from the Schengen area and issued within the previous 10 years. Source: https://travel-europe.europa.eu/"
    },
    "authorizations": {
      "ETIAS": {
        "name": "ETIAS (European Travel Information and Authorisation System)",
        "fee": 20,
        "currency": "EUR",
        "validityYears": 3,
        "live": false,
        "processing": "Not operating on 2026-09-29. The Commission had indicated the last quarter of 2026; the official portal later removed that window and no new date is published; reporting points to 2027. Fee set at EUR 20 (raised from the original EUR 7). Will cover visa-exempt third-country nationals. Separately, the Entry/Exit System (EES) started 12 Oct 2025 and became fully operational on 10 Apr 2026, replacing passport stamps with biometric registration.",
        "source": "https://travel-europe.europa.eu/etias_en",
        "statedDate": "scheduled; no confirmed start date as of 2026-09-29"
      }
    },
    "citizens": {
      "US": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "GB": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026. UK nationals have been treated as non-EU nationals since January 1, 2021.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "CA": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "IE": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA. Ireland is in the EU but outside the Schengen area, so there are ID or passport checks at the Schengen border.",
        "source": "https://travel-europe.europa.eu/"
      },
      "IS": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA.",
        "source": "https://travel-europe.europa.eu/"
      },
      "DE": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA.",
        "source": "https://travel-europe.europa.eu/"
      },
      "FR": {
        "status": "citizen",
        "maxDays": null,
        "windowDays": null,
        "note": "You’re one of its citizens.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "ES": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA.",
        "source": "https://travel-europe.europa.eu/"
      },
      "JP": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "KR": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "MX": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "AU": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "BR": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "NZ": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "LV": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA.",
        "source": "https://travel-europe.europa.eu/"
      }
    }
  },
  "ES": {
    "authority": "Ministry of Foreign Affairs, EU and Cooperation and the National Police (Policia Nacional), applying the common Schengen rules",
    "passport": {
      "beyondDays": 90,
      "issuedWithinYears": 10,
      "confirmed": true,
      "rule": "Schengen Borders Code (Regulation (EU) 2016/399) art. 6: third-country nationals need a travel document valid at least 3 months after the intended date of departure from the Schengen area and issued within the previous 10 years. Source: https://travel-europe.europa.eu/"
    },
    "authorizations": {
      "ETIAS": {
        "name": "ETIAS (European Travel Information and Authorisation System)",
        "fee": 20,
        "currency": "EUR",
        "validityYears": 3,
        "live": false,
        "processing": "Not operating on 2026-09-29. The Commission had indicated the last quarter of 2026; the official portal later removed that window and no new date is published; reporting points to 2027. Fee set at EUR 20 (raised from the original EUR 7). Will cover visa-exempt third-country nationals. Separately, the Entry/Exit System (EES) started 12 Oct 2025 and became fully operational on 10 Apr 2026, replacing passport stamps with biometric registration.",
        "source": "https://travel-europe.europa.eu/etias_en",
        "statedDate": "scheduled; no confirmed start date as of 2026-09-29"
      }
    },
    "citizens": {
      "US": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "GB": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026. UK nationals have been treated as non-EU nationals since January 1, 2021.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "CA": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "IE": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA. Ireland is in the EU but outside the Schengen area, so there are ID or passport checks at the Schengen border.",
        "source": "https://travel-europe.europa.eu/"
      },
      "IS": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA.",
        "source": "https://travel-europe.europa.eu/"
      },
      "DE": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA.",
        "source": "https://travel-europe.europa.eu/"
      },
      "FR": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA.",
        "source": "https://travel-europe.europa.eu/"
      },
      "ES": {
        "status": "citizen",
        "maxDays": null,
        "windowDays": null,
        "note": "You’re one of its citizens.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "JP": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "KR": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "MX": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "AU": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "BR": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "NZ": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "LV": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA.",
        "source": "https://travel-europe.europa.eu/"
      }
    }
  },
  "LV": {
    "authority": "Office of Citizenship and Migration Affairs (PMLP) and the State Border Guard, applying the common Schengen rules",
    "passport": {
      "beyondDays": 90,
      "issuedWithinYears": 10,
      "confirmed": true,
      "rule": "Schengen Borders Code (Regulation (EU) 2016/399) art. 6: third-country nationals need a travel document valid at least 3 months after the intended date of departure from the Schengen area and issued within the previous 10 years. Source: https://travel-europe.europa.eu/"
    },
    "authorizations": {
      "ETIAS": {
        "name": "ETIAS (European Travel Information and Authorisation System)",
        "fee": 20,
        "currency": "EUR",
        "validityYears": 3,
        "live": false,
        "processing": "Not operating on 2026-09-29. The Commission had indicated the last quarter of 2026; the official portal later removed that window and no new date is published; reporting points to 2027. Fee set at EUR 20 (raised from the original EUR 7). Will cover visa-exempt third-country nationals. Separately, the Entry/Exit System (EES) started 12 Oct 2025 and became fully operational on 10 Apr 2026, replacing passport stamps with biometric registration.",
        "source": "https://travel-europe.europa.eu/etias_en",
        "statedDate": "scheduled; no confirmed start date as of 2026-09-29"
      }
    },
    "citizens": {
      "US": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "GB": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026. UK nationals have been treated as non-EU nationals since January 1, 2021.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "CA": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "IE": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA. Ireland is in the EU but outside the Schengen area, so there are ID or passport checks at the Schengen border.",
        "source": "https://travel-europe.europa.eu/"
      },
      "IS": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA.",
        "source": "https://travel-europe.europa.eu/"
      },
      "DE": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA.",
        "source": "https://travel-europe.europa.eu/"
      },
      "FR": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA.",
        "source": "https://travel-europe.europa.eu/"
      },
      "ES": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Free movement within the EU and EEA.",
        "source": "https://travel-europe.europa.eu/"
      },
      "JP": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "KR": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "MX": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "AU": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "BR": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "NZ": {
        "status": "free",
        "maxDays": 90,
        "windowDays": 180,
        "note": "Under Regulation (EU) 2018/1806, Annex II: up to 90 days in any 180-day period across the whole Schengen area. Since October 12, 2025, visitors register their fingerprints and a photo in the Entry/Exit System (EES) at the external border, fully running from April 10, 2026. ETIAS will be required once it launches. It wasn’t live on September 29, 2026.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      },
      "LV": {
        "status": "citizen",
        "maxDays": null,
        "windowDays": null,
        "note": "You’re one of its citizens.",
        "source": "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en"
      }
    }
  },
  "JP": {
    "authority": "Ministry of Foreign Affairs of Japan (visas) and the Immigration Services Agency of Japan",
    "passport": {
      "beyondDays": 0,
      "confirmed": true,
      "rule": "Passport valid for the duration of the stay (no extra-months rule). Source: MOFA / Immigration Services Agency."
    },
    "authorizations": {},
    "citizens": {
      "JP": {
        "status": "citizen",
        "maxDays": null,
        "windowDays": null,
        "note": "You’re one of its citizens.",
        "source": "https://www.mofa.go.jp/j_info/visit/visa/short/novisa.html"
      },
      "US": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "No visa is needed for a short stay of up to 90 days. There’s no travel authorization to apply for yet: Japan plans one, JESTA, but when it starts wasn’t confirmed.",
        "source": "https://www.mofa.go.jp/j_info/visit/visa/short/novisa.html"
      },
      "CA": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "No visa is needed for a short stay of up to 90 days. There’s no travel authorization to apply for yet: Japan plans one, JESTA, but when it starts wasn’t confirmed.",
        "source": "https://www.mofa.go.jp/j_info/visit/visa/short/novisa.html"
      },
      "IS": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "No visa is needed for a short stay of up to 90 days. There’s no travel authorization to apply for yet: Japan plans one, JESTA, but when it starts wasn’t confirmed.",
        "source": "https://www.mofa.go.jp/j_info/visit/visa/short/novisa.html"
      },
      "FR": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "No visa is needed for a short stay of up to 90 days. There’s no travel authorization to apply for yet: Japan plans one, JESTA, but when it starts wasn’t confirmed.",
        "source": "https://www.mofa.go.jp/j_info/visit/visa/short/novisa.html"
      },
      "ES": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "No visa is needed for a short stay of up to 90 days. There’s no travel authorization to apply for yet: Japan plans one, JESTA, but when it starts wasn’t confirmed.",
        "source": "https://www.mofa.go.jp/j_info/visit/visa/short/novisa.html"
      },
      "KR": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "No visa is needed for a short stay of up to 90 days. There’s no travel authorization to apply for yet: Japan plans one, JESTA, but when it starts wasn’t confirmed.",
        "source": "https://www.mofa.go.jp/j_info/visit/visa/short/novisa.html"
      },
      "AU": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "No visa is needed for a short stay of up to 90 days. There’s no travel authorization to apply for yet: Japan plans one, JESTA, but when it starts wasn’t confirmed.",
        "source": "https://www.mofa.go.jp/j_info/visit/visa/short/novisa.html"
      },
      "NZ": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "No visa is needed for a short stay of up to 90 days. There’s no travel authorization to apply for yet: Japan plans one, JESTA, but when it starts wasn’t confirmed.",
        "source": "https://www.mofa.go.jp/j_info/visit/visa/short/novisa.html"
      },
      "LV": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "No visa is needed for a short stay of up to 90 days. There’s no travel authorization to apply for yet: Japan plans one, JESTA, but when it starts wasn’t confirmed.",
        "source": "https://www.mofa.go.jp/j_info/visit/visa/short/novisa.html"
      },
      "GB": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "No visa is needed for up to 90 days. A footnote from Japan’s foreign ministry says citizens of this country can apply at a regional immigration office to extend the stay to 6 months in all, though this wasn’t confirmed.",
        "source": "https://www.mofa.go.jp/j_info/visit/visa/short/novisa.html"
      },
      "IE": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "No visa is needed for up to 90 days. A footnote from Japan’s foreign ministry says citizens of this country can apply at a regional immigration office to extend the stay to 6 months in all, though this wasn’t confirmed.",
        "source": "https://www.mofa.go.jp/j_info/visit/visa/short/novisa.html"
      },
      "DE": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "No visa is needed for up to 90 days. A footnote from Japan’s foreign ministry says citizens of this country can apply at a regional immigration office to extend the stay to 6 months in all, though this wasn’t confirmed.",
        "source": "https://www.mofa.go.jp/j_info/visit/visa/short/novisa.html"
      },
      "MX": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "No visa is needed for up to 90 days. A footnote from Japan’s foreign ministry says citizens of this country can apply at a regional immigration office to extend the stay to 6 months in all, though this wasn’t confirmed.",
        "source": "https://www.mofa.go.jp/j_info/visit/visa/short/novisa.html"
      },
      "BR": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "Since September 30, 2023, Brazilians with an e-passport to the international (ICAO) standard need no visa. The waiver first ran for 3 years, to September 29, 2026, and an exchange of notes in July 2026 extended it to September 29, 2029. A passport without a chip still needs a visa.",
        "source": "https://www.gov.br/mre/en/contact-us/press-area/press-releases/reciprocal-visa-exemption-between-brazil-and-japan"
      }
    }
  },
  "KR": {
    "authority": "Korea Immigration Service (Ministry of Justice)",
    "passport": {
      "beyondDays": 0,
      "confirmed": false,
      "rule": "Passport valid for the intended stay; K-ETA validity ends with the passport. (Six months' validity is commonly advised but wasn’t confirmed as a legal requirement.)"
    },
    "authorizations": {
      "K-ETA": {
        "name": "K-ETA (Korea Electronic Travel Authorization)",
        "fee": 10000,
        "currency": "KRW",
        "validityYears": 3,
        "live": true,
        "processing": "KRW 10,000 plus a card processing fee; apply at least 72 hours before departure; valid 3 years (for approvals from 3 Jul 2023) or until passport expiry. 22 countries and regions temporarily exempt until 31 Dec 2026.",
        "source": "https://overseas.mofa.go.kr/ie-en/brd/m_23773/view.do?seq=761699",
        "statedDate": "exemption extended to 2026-12-31 (announced Sep 2025)"
      }
    },
    "citizens": {
      "KR": {
        "status": "citizen",
        "maxDays": null,
        "windowDays": null,
        "note": "You’re one of its citizens.",
        "source": "https://www.k-eta.go.kr/"
      },
      "US": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "Up to 90 days. This country is one of 22 countries and regions that don’t need a K-ETA until December 31, 2026, and a K-ETA is required again from January 1, 2027, unless that’s extended. You can still apply for one, for a fee.",
        "source": "https://www.mofa.go.kr/ca-en/brd/m_5231/view.do?seq=761797"
      },
      "GB": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "Up to 90 days. This country is one of 22 countries and regions that don’t need a K-ETA until December 31, 2026, and a K-ETA is required again from January 1, 2027, unless that’s extended. You can still apply for one, for a fee.",
        "source": "https://www.mofa.go.kr/ca-en/brd/m_5231/view.do?seq=761797"
      },
      "DE": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "Up to 90 days. This country is one of 22 countries and regions that don’t need a K-ETA until December 31, 2026, and a K-ETA is required again from January 1, 2027, unless that’s extended. You can still apply for one, for a fee.",
        "source": "https://www.mofa.go.kr/ca-en/brd/m_5231/view.do?seq=761797"
      },
      "FR": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "Up to 90 days. This country is one of 22 countries and regions that don’t need a K-ETA until December 31, 2026, and a K-ETA is required again from January 1, 2027, unless that’s extended. You can still apply for one, for a fee.",
        "source": "https://www.mofa.go.kr/ca-en/brd/m_5231/view.do?seq=761797"
      },
      "ES": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "Up to 90 days. This country is one of 22 countries and regions that don’t need a K-ETA until December 31, 2026, and a K-ETA is required again from January 1, 2027, unless that’s extended. You can still apply for one, for a fee.",
        "source": "https://www.mofa.go.kr/ca-en/brd/m_5231/view.do?seq=761797"
      },
      "JP": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "Up to 90 days. This country is one of 22 countries and regions that don’t need a K-ETA until December 31, 2026, and a K-ETA is required again from January 1, 2027, unless that’s extended. You can still apply for one, for a fee.",
        "source": "https://www.mofa.go.kr/ca-en/brd/m_5231/view.do?seq=761797"
      },
      "AU": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "Up to 90 days. This country is one of 22 countries and regions that don’t need a K-ETA until December 31, 2026, and a K-ETA is required again from January 1, 2027, unless that’s extended. You can still apply for one, for a fee.",
        "source": "https://www.mofa.go.kr/ca-en/brd/m_5231/view.do?seq=761797"
      },
      "NZ": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "Up to 90 days. This country is one of 22 countries and regions that don’t need a K-ETA until December 31, 2026, and a K-ETA is required again from January 1, 2027, unless that’s extended. You can still apply for one, for a fee.",
        "source": "https://www.mofa.go.kr/ca-en/brd/m_5231/view.do?seq=761797"
      },
      "CA": {
        "status": "free",
        "maxDays": 180,
        "windowDays": null,
        "note": "Up to 6 months, under an arrangement between Korea and Canada. A K-ETA isn’t needed until December 31, 2026.",
        "source": "https://www.mofa.go.kr/ca-en/wpge/m_5236/contents.do"
      },
      "IE": {
        "status": "authorization",
        "authorization": "K-ETA",
        "maxDays": 90,
        "windowDays": null,
        "note": "Up to 90 days. This country isn’t among the 22 exempt for now, so a K-ETA is required before boarding.",
        "source": "https://www.k-eta.go.kr/"
      },
      "IS": {
        "status": "authorization",
        "authorization": "K-ETA",
        "maxDays": 90,
        "windowDays": null,
        "note": "Up to 90 days. This country isn’t among the 22 exempt for now, so a K-ETA is required before boarding.",
        "source": "https://www.k-eta.go.kr/"
      },
      "MX": {
        "status": "authorization",
        "authorization": "K-ETA",
        "maxDays": 90,
        "windowDays": null,
        "note": "Up to 90 days. This country isn’t among the 22 exempt for now, so a K-ETA is required before boarding.",
        "source": "https://www.k-eta.go.kr/"
      },
      "BR": {
        "status": "authorization",
        "authorization": "K-ETA",
        "maxDays": 90,
        "windowDays": null,
        "note": "Up to 90 days. This country isn’t among the 22 exempt for now, so a K-ETA is required before boarding.",
        "source": "https://www.k-eta.go.kr/"
      },
      "LV": {
        "status": "authorization",
        "authorization": "K-ETA",
        "maxDays": 90,
        "windowDays": null,
        "note": "Up to 90 days. This country isn’t among the 22 exempt for now, so a K-ETA is required before boarding.",
        "source": "https://www.k-eta.go.kr/"
      }
    }
  },
  "MX": {
    "authority": "Instituto Nacional de Migracion (INM) and Secretaria de Relaciones Exteriores (SRE)",
    "passport": {
      "beyondDays": 0,
      "confirmed": true,
      "rule": "Passport valid for the duration of the stay ('vigente... valido conforme al derecho internacional'). Source: INM."
    },
    "authorizations": {},
    "citizens": {
      "MX": {
        "status": "citizen",
        "maxDays": null,
        "windowDays": null,
        "note": "You’re one of its citizens.",
        "source": "https://www.inm.gob.mx/gobmx/word/index.php/paises-no-requieren-visa-para-mexico/"
      },
      "US": {
        "status": "free",
        "maxDays": 180,
        "windowDays": null,
        "note": "A visitor, without permission to work, for up to 180 days. The immigration officer (INM) sets the actual number of days at entry and records it on the visitor’s form, the FMM, on paper or digital. There’s no travel authorization to apply for in advance.",
        "source": "https://www.inm.gob.mx/gobmx/word/index.php/paises-no-requieren-visa-para-mexico/"
      },
      "GB": {
        "status": "free",
        "maxDays": 180,
        "windowDays": null,
        "note": "A visitor, without permission to work, for up to 180 days. The immigration officer (INM) sets the actual number of days at entry and records it on the visitor’s form, the FMM, on paper or digital. There’s no travel authorization to apply for in advance.",
        "source": "https://www.inm.gob.mx/gobmx/word/index.php/paises-no-requieren-visa-para-mexico/"
      },
      "CA": {
        "status": "free",
        "maxDays": 180,
        "windowDays": null,
        "note": "A visitor, without permission to work, for up to 180 days. The immigration officer (INM) sets the actual number of days at entry and records it on the visitor’s form, the FMM, on paper or digital. There’s no travel authorization to apply for in advance.",
        "source": "https://www.inm.gob.mx/gobmx/word/index.php/paises-no-requieren-visa-para-mexico/"
      },
      "IE": {
        "status": "free",
        "maxDays": 180,
        "windowDays": null,
        "note": "A visitor, without permission to work, for up to 180 days. The immigration officer (INM) sets the actual number of days at entry and records it on the visitor’s form, the FMM, on paper or digital. There’s no travel authorization to apply for in advance.",
        "source": "https://www.inm.gob.mx/gobmx/word/index.php/paises-no-requieren-visa-para-mexico/"
      },
      "IS": {
        "status": "free",
        "maxDays": 180,
        "windowDays": null,
        "note": "A visitor, without permission to work, for up to 180 days. The immigration officer (INM) sets the actual number of days at entry and records it on the visitor’s form, the FMM, on paper or digital. There’s no travel authorization to apply for in advance.",
        "source": "https://www.inm.gob.mx/gobmx/word/index.php/paises-no-requieren-visa-para-mexico/"
      },
      "DE": {
        "status": "free",
        "maxDays": 180,
        "windowDays": null,
        "note": "A visitor, without permission to work, for up to 180 days. The immigration officer (INM) sets the actual number of days at entry and records it on the visitor’s form, the FMM, on paper or digital. There’s no travel authorization to apply for in advance.",
        "source": "https://www.inm.gob.mx/gobmx/word/index.php/paises-no-requieren-visa-para-mexico/"
      },
      "FR": {
        "status": "free",
        "maxDays": 180,
        "windowDays": null,
        "note": "A visitor, without permission to work, for up to 180 days. The immigration officer (INM) sets the actual number of days at entry and records it on the visitor’s form, the FMM, on paper or digital. There’s no travel authorization to apply for in advance.",
        "source": "https://www.inm.gob.mx/gobmx/word/index.php/paises-no-requieren-visa-para-mexico/"
      },
      "ES": {
        "status": "free",
        "maxDays": 180,
        "windowDays": null,
        "note": "A visitor, without permission to work, for up to 180 days. The immigration officer (INM) sets the actual number of days at entry and records it on the visitor’s form, the FMM, on paper or digital. There’s no travel authorization to apply for in advance.",
        "source": "https://www.inm.gob.mx/gobmx/word/index.php/paises-no-requieren-visa-para-mexico/"
      },
      "JP": {
        "status": "free",
        "maxDays": 180,
        "windowDays": null,
        "note": "A visitor, without permission to work, for up to 180 days. The immigration officer (INM) sets the actual number of days at entry and records it on the visitor’s form, the FMM, on paper or digital. There’s no travel authorization to apply for in advance.",
        "source": "https://www.inm.gob.mx/gobmx/word/index.php/paises-no-requieren-visa-para-mexico/"
      },
      "KR": {
        "status": "free",
        "maxDays": 180,
        "windowDays": null,
        "note": "A visitor, without permission to work, for up to 180 days. The immigration officer (INM) sets the actual number of days at entry and records it on the visitor’s form, the FMM, on paper or digital. There’s no travel authorization to apply for in advance.",
        "source": "https://www.inm.gob.mx/gobmx/word/index.php/paises-no-requieren-visa-para-mexico/"
      },
      "AU": {
        "status": "free",
        "maxDays": 180,
        "windowDays": null,
        "note": "A visitor, without permission to work, for up to 180 days. The immigration officer (INM) sets the actual number of days at entry and records it on the visitor’s form, the FMM, on paper or digital. There’s no travel authorization to apply for in advance.",
        "source": "https://www.inm.gob.mx/gobmx/word/index.php/paises-no-requieren-visa-para-mexico/"
      },
      "NZ": {
        "status": "free",
        "maxDays": 180,
        "windowDays": null,
        "note": "A visitor, without permission to work, for up to 180 days. The immigration officer (INM) sets the actual number of days at entry and records it on the visitor’s form, the FMM, on paper or digital. There’s no travel authorization to apply for in advance.",
        "source": "https://www.inm.gob.mx/gobmx/word/index.php/paises-no-requieren-visa-para-mexico/"
      },
      "LV": {
        "status": "free",
        "maxDays": 180,
        "windowDays": null,
        "note": "A visitor, without permission to work, for up to 180 days. The immigration officer (INM) sets the actual number of days at entry and records it on the visitor’s form, the FMM, on paper or digital. There’s no travel authorization to apply for in advance.",
        "source": "https://www.inm.gob.mx/gobmx/word/index.php/paises-no-requieren-visa-para-mexico/"
      },
      "BR": {
        "status": "visa",
        "visa": "Mexican visitor visa",
        "maxDays": 180,
        "windowDays": null,
        "note": "Mexico has required Brazilians to have a visa again since August 18, 2022. A Brazilian with a valid US, Canadian, UK, Japanese or Schengen visa, or permanent residence in one of those or a Pacific Alliance country, enters without one as a visitor.",
        "source": "https://www.inm.gob.mx/gobmx/word/index.php/paises-requieren-visa-para-mexico/"
      }
    }
  },
  "AU": {
    "authority": "Department of Home Affairs (Australian Border Force at the border)",
    "passport": {
      "beyondDays": 0,
      "confirmed": true,
      "rule": "Passport valid for the stay; the ETA or eVisitor is linked to the passport and ends if it expires. Source: homeaffairs.gov.au."
    },
    "authorizations": {
      "ETA": {
        "name": "ETA (Electronic Travel Authority, subclass 601)",
        "fee": 20,
        "currency": "AUD",
        "validityYears": 1,
        "live": true,
        "processing": "Only via the Australian ETA app; AUD 20 service charge, no visa application charge. Multiple entries within 12 months (or until passport expiry), up to 3 months per visit.",
        "source": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/electronic-travel-authority-601",
        "statedDate": "current as of 2026"
      },
      "eVisitor": {
        "name": "eVisitor (subclass 651)",
        "fee": 0,
        "currency": "AUD",
        "validityYears": 1,
        "live": true,
        "processing": "Free, applied for via ImmiAccount, for European passport holders. Multiple entries within 12 months, up to 3 months per visit.",
        "source": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/evisitor-651",
        "statedDate": "current as of 2026"
      }
    },
    "citizens": {
      "AU": {
        "status": "citizen",
        "maxDays": null,
        "windowDays": null,
        "note": "You’re one of its citizens.",
        "source": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/electronic-travel-authority-601"
      },
      "NZ": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Under the Trans-Tasman arrangement, New Zealand citizens get a Special Category Visa (subclass 444) on arrival, and may live and work in Australia indefinitely.",
        "source": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/special-category-444"
      },
      "US": {
        "status": "authorization",
        "authorization": "ETA",
        "maxDays": 90,
        "windowDays": null,
        "note": "Everyone who isn’t a citizen needs a visa, and the ETA is a visa linked electronically to the passport. It allows entries over 12 months, up to 3 months each visit.",
        "source": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/electronic-travel-authority-601"
      },
      "CA": {
        "status": "authorization",
        "authorization": "ETA",
        "maxDays": 90,
        "windowDays": null,
        "note": "Everyone who isn’t a citizen needs a visa, and the ETA is a visa linked electronically to the passport. It allows entries over 12 months, up to 3 months each visit.",
        "source": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/electronic-travel-authority-601"
      },
      "JP": {
        "status": "authorization",
        "authorization": "ETA",
        "maxDays": 90,
        "windowDays": null,
        "note": "Everyone who isn’t a citizen needs a visa, and the ETA is a visa linked electronically to the passport. It allows entries over 12 months, up to 3 months each visit.",
        "source": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/electronic-travel-authority-601"
      },
      "KR": {
        "status": "authorization",
        "authorization": "ETA",
        "maxDays": 90,
        "windowDays": null,
        "note": "Everyone who isn’t a citizen needs a visa, and the ETA is a visa linked electronically to the passport. It allows entries over 12 months, up to 3 months each visit.",
        "source": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/electronic-travel-authority-601"
      },
      "GB": {
        "status": "authorization",
        "authorization": "eVisitor",
        "maxDays": 90,
        "windowDays": null,
        "note": "Citizens can use either an eVisitor (free, through ImmiAccount) or an ETA (AUD 20, through the app). Either allows entries over 12 months, up to 3 months each visit.",
        "source": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/evisitor-651"
      },
      "IE": {
        "status": "authorization",
        "authorization": "eVisitor",
        "maxDays": 90,
        "windowDays": null,
        "note": "Citizens can use either an eVisitor (free, through ImmiAccount) or an ETA (AUD 20, through the app). Either allows entries over 12 months, up to 3 months each visit.",
        "source": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/evisitor-651"
      },
      "IS": {
        "status": "authorization",
        "authorization": "eVisitor",
        "maxDays": 90,
        "windowDays": null,
        "note": "Citizens can use either an eVisitor (free, through ImmiAccount) or an ETA (AUD 20, through the app). Either allows entries over 12 months, up to 3 months each visit.",
        "source": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/evisitor-651"
      },
      "DE": {
        "status": "authorization",
        "authorization": "eVisitor",
        "maxDays": 90,
        "windowDays": null,
        "note": "Citizens can use either an eVisitor (free, through ImmiAccount) or an ETA (AUD 20, through the app). Either allows entries over 12 months, up to 3 months each visit.",
        "source": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/evisitor-651"
      },
      "FR": {
        "status": "authorization",
        "authorization": "eVisitor",
        "maxDays": 90,
        "windowDays": null,
        "note": "Citizens can use either an eVisitor (free, through ImmiAccount) or an ETA (AUD 20, through the app). Either allows entries over 12 months, up to 3 months each visit.",
        "source": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/evisitor-651"
      },
      "ES": {
        "status": "authorization",
        "authorization": "eVisitor",
        "maxDays": 90,
        "windowDays": null,
        "note": "Citizens can use either an eVisitor (free, through ImmiAccount) or an ETA (AUD 20, through the app). Either allows entries over 12 months, up to 3 months each visit.",
        "source": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/evisitor-651"
      },
      "LV": {
        "status": "authorization",
        "authorization": "eVisitor",
        "maxDays": 90,
        "windowDays": null,
        "note": "Latvian citizens can use an eVisitor (free), but not an ETA. It allows entries over 12 months, up to 3 months each visit.",
        "source": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/evisitor-651"
      },
      "MX": {
        "status": "visa",
        "visa": "Visitor visa (subclass 600)",
        "maxDays": 90,
        "windowDays": null,
        "note": "Citizens can’t use an ETA or an eVisitor, so they apply for a Visitor visa (subclass 600, Tourist stream), for a fee. The visa sets how long they can stay, commonly up to 3, 6 or 12 months.",
        "source": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/visitor-600"
      },
      "BR": {
        "status": "visa",
        "visa": "Visitor visa (subclass 600)",
        "maxDays": 90,
        "windowDays": null,
        "note": "Citizens can’t use an ETA or an eVisitor, so they apply for a Visitor visa (subclass 600, Tourist stream), for a fee. The visa sets how long they can stay, commonly up to 3, 6 or 12 months.",
        "source": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/visitor-600"
      }
    }
  },
  "BR": {
    "authority": "Ministerio das Relacoes Exteriores (Itamaraty) for visas; Policia Federal at the border",
    "passport": {
      "beyondDays": 0,
      "confirmed": false,
      "rule": "Passport valid for the stay; e-Visa guidance commonly asks for at least 6 months' validity (see uncertain). Source: gov.br MRE."
    },
    "authorizations": {
      "e-Visa": {
        "name": "e-Visa (electronic visitor visa) for US, Canadian and Australian citizens",
        "fee": 80.9,
        "currency": "USD",
        "validityYears": 10,
        "live": true,
        "processing": "Required from 10 Apr 2025. Applied for via the official portal (brazil.vfsevisa.com); average about 5 business days. Validity 10 years for US citizens and 5 years for Canadian and Australian citizens (validityYears holds the US figure). Up to 90 days per stay, 180 per year.",
        "source": "https://www.gov.br/mre/pt-br/consulado-miami/information-about-visas-in-english/electronic-visitor-visa-e-visa",
        "statedDate": "2025-04-10 (effective)"
      }
    },
    "citizens": {
      "BR": {
        "status": "citizen",
        "maxDays": null,
        "windowDays": null,
        "note": "You’re one of its citizens.",
        "source": "https://www.gov.br/mre/pt-br/assuntos/portal-consular/vistos/quadro-geral-de-regime-de-vistos-para-a-entrada-de-estrangeiros-no-brasil"
      },
      "GB": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "A visitor can stay up to 90 days, and the Federal Police can extend that to 180 days in any 12 months. For citizens of Schengen countries in the EU, the Brazil-EU short-stay agreement allows 90 days in any 180.",
        "source": "https://www.gov.br/mre/pt-br/assuntos/portal-consular/vistos/quadro-geral-de-regime-de-vistos-para-a-entrada-de-estrangeiros-no-brasil"
      },
      "IE": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "A visitor can stay up to 90 days, and the Federal Police can extend that to 180 days in any 12 months. For citizens of Schengen countries in the EU, the Brazil-EU short-stay agreement allows 90 days in any 180.",
        "source": "https://www.gov.br/mre/pt-br/assuntos/portal-consular/vistos/quadro-geral-de-regime-de-vistos-para-a-entrada-de-estrangeiros-no-brasil"
      },
      "IS": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "A visitor can stay up to 90 days, and the Federal Police can extend that to 180 days in any 12 months. For citizens of Schengen countries in the EU, the Brazil-EU short-stay agreement allows 90 days in any 180.",
        "source": "https://www.gov.br/mre/pt-br/assuntos/portal-consular/vistos/quadro-geral-de-regime-de-vistos-para-a-entrada-de-estrangeiros-no-brasil"
      },
      "DE": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "A visitor can stay up to 90 days, and the Federal Police can extend that to 180 days in any 12 months. For citizens of Schengen countries in the EU, the Brazil-EU short-stay agreement allows 90 days in any 180.",
        "source": "https://www.gov.br/mre/pt-br/assuntos/portal-consular/vistos/quadro-geral-de-regime-de-vistos-para-a-entrada-de-estrangeiros-no-brasil"
      },
      "FR": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "A visitor can stay up to 90 days, and the Federal Police can extend that to 180 days in any 12 months. For citizens of Schengen countries in the EU, the Brazil-EU short-stay agreement allows 90 days in any 180.",
        "source": "https://www.gov.br/mre/pt-br/assuntos/portal-consular/vistos/quadro-geral-de-regime-de-vistos-para-a-entrada-de-estrangeiros-no-brasil"
      },
      "ES": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "A visitor can stay up to 90 days, and the Federal Police can extend that to 180 days in any 12 months. For citizens of Schengen countries in the EU, the Brazil-EU short-stay agreement allows 90 days in any 180.",
        "source": "https://www.gov.br/mre/pt-br/assuntos/portal-consular/vistos/quadro-geral-de-regime-de-vistos-para-a-entrada-de-estrangeiros-no-brasil"
      },
      "KR": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "A visitor can stay up to 90 days, and the Federal Police can extend that to 180 days in any 12 months. For citizens of Schengen countries in the EU, the Brazil-EU short-stay agreement allows 90 days in any 180.",
        "source": "https://www.gov.br/mre/pt-br/assuntos/portal-consular/vistos/quadro-geral-de-regime-de-vistos-para-a-entrada-de-estrangeiros-no-brasil"
      },
      "MX": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "A visitor can stay up to 90 days, and the Federal Police can extend that to 180 days in any 12 months. For citizens of Schengen countries in the EU, the Brazil-EU short-stay agreement allows 90 days in any 180.",
        "source": "https://www.gov.br/mre/pt-br/assuntos/portal-consular/vistos/quadro-geral-de-regime-de-vistos-para-a-entrada-de-estrangeiros-no-brasil"
      },
      "NZ": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "A visitor can stay up to 90 days, and the Federal Police can extend that to 180 days in any 12 months. For citizens of Schengen countries in the EU, the Brazil-EU short-stay agreement allows 90 days in any 180.",
        "source": "https://www.gov.br/mre/pt-br/assuntos/portal-consular/vistos/quadro-geral-de-regime-de-vistos-para-a-entrada-de-estrangeiros-no-brasil"
      },
      "LV": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "A visitor can stay up to 90 days, and the Federal Police can extend that to 180 days in any 12 months. For citizens of Schengen countries in the EU, the Brazil-EU short-stay agreement allows 90 days in any 180.",
        "source": "https://www.gov.br/mre/pt-br/assuntos/portal-consular/vistos/quadro-geral-de-regime-de-vistos-para-a-entrada-de-estrangeiros-no-brasil"
      },
      "JP": {
        "status": "free",
        "maxDays": 90,
        "windowDays": null,
        "note": "Since September 30, 2023, Brazil and Japan have each waived visas for the other’s citizens with an e-passport to the international (ICAO) standard. In July 2026 the waiver was extended to September 29, 2029.",
        "source": "https://www.gov.br/mre/en/contact-us/press-area/press-releases/reciprocal-visa-exemption-between-brazil-and-japan"
      },
      "US": {
        "status": "visa",
        "visa": "e-Visa (electronic visitor visa)",
        "maxDays": 90,
        "windowDays": null,
        "note": "Brazil has required a visa again since April 10, 2025, in return for these countries requiring one of Brazilians. Apply online for an e-Visa (USD 80.90). It allows up to 90 days each entry, which can be extended to 180 in any 12 months. It’s valid for 10 years for US citizens and 5 years for Canadian and Australian citizens, though the validity wasn’t confirmed.",
        "source": "https://www.gov.br/mre/pt-br/consulado-miami/information-about-visas-in-english/electronic-visitor-visa-e-visa"
      },
      "CA": {
        "status": "visa",
        "visa": "e-Visa (electronic visitor visa)",
        "maxDays": 90,
        "windowDays": null,
        "note": "Brazil has required a visa again since April 10, 2025, in return for these countries requiring one of Brazilians. Apply online for an e-Visa (USD 80.90). It allows up to 90 days each entry, which can be extended to 180 in any 12 months. It’s valid for 10 years for US citizens and 5 years for Canadian and Australian citizens, though the validity wasn’t confirmed.",
        "source": "https://www.gov.br/mre/pt-br/consulado-miami/information-about-visas-in-english/electronic-visitor-visa-e-visa"
      },
      "AU": {
        "status": "visa",
        "visa": "e-Visa (electronic visitor visa)",
        "maxDays": 90,
        "windowDays": null,
        "note": "Brazil has required a visa again since April 10, 2025, in return for these countries requiring one of Brazilians. Apply online for an e-Visa (USD 80.90). It allows up to 90 days each entry, which can be extended to 180 in any 12 months. It’s valid for 10 years for US citizens and 5 years for Canadian and Australian citizens, though the validity wasn’t confirmed.",
        "source": "https://www.gov.br/mre/pt-br/consulado-miami/information-about-visas-in-english/electronic-visitor-visa-e-visa"
      }
    }
  },
  "NZ": {
    "authority": "Immigration New Zealand (Ministry of Business, Innovation and Employment)",
    "passport": {
      "beyondDays": 90,
      "confirmed": true,
      "rule": "Passport must be valid for at least 3 months beyond the date you intend to leave New Zealand. Source: immigration.govt.nz."
    },
    "authorizations": {
      "NZeTA": {
        "name": "NZeTA (New Zealand Electronic Travel Authority)",
        "fee": 17,
        "currency": "NZD",
        "validityYears": 2,
        "live": true,
        "processing": "NZD 17 via the app or NZD 23 via the web, plus the International Visitor Conservation and Tourism Levy (IVL) of NZD 100 paid at the same time (IVL rose from NZD 35 on 1 Oct 2024). Allow up to 72 hours. Valid 2 years.",
        "source": "https://www.immigration.govt.nz/process-to-apply/applying-for-a-visa/fees-processing-times-and-refunds/paying-the-international-visitor-levy/",
        "statedDate": "rates from 1 Oct 2024"
      }
    },
    "citizens": {
      "NZ": {
        "status": "citizen",
        "maxDays": null,
        "windowDays": null,
        "note": "You’re one of its citizens.",
        "source": "https://www.immigration.govt.nz/visas/new-zealand-electronic-travel-authority-nzeta/"
      },
      "AU": {
        "status": "free-movement",
        "maxDays": null,
        "windowDays": null,
        "note": "Under the Trans-Tasman Travel Arrangement, Australian citizens get a resident visa on arrival, and need no NZeTA or visitor levy (IVL).",
        "source": "https://www.immigration.govt.nz/visas/new-zealand-electronic-travel-authority-nzeta/"
      },
      "GB": {
        "status": "authorization",
        "authorization": "NZeTA",
        "maxDays": 180,
        "windowDays": null,
        "note": "UK citizens need no visa and may stay up to 6 months, but need an NZeTA and must pay the visitor levy (IVL) before they travel.",
        "source": "https://www.immigration.govt.nz/visas/new-zealand-electronic-travel-authority-nzeta/"
      },
      "US": {
        "status": "authorization",
        "authorization": "NZeTA",
        "maxDays": 90,
        "windowDays": null,
        "note": "No visa is needed for up to 3 months each visit, but you need an NZeTA and must pay the visitor levy (IVL, NZD 100) before you travel.",
        "source": "https://www.immigration.govt.nz/visas/new-zealand-electronic-travel-authority-nzeta/"
      },
      "CA": {
        "status": "authorization",
        "authorization": "NZeTA",
        "maxDays": 90,
        "windowDays": null,
        "note": "No visa is needed for up to 3 months each visit, but you need an NZeTA and must pay the visitor levy (IVL, NZD 100) before you travel.",
        "source": "https://www.immigration.govt.nz/visas/new-zealand-electronic-travel-authority-nzeta/"
      },
      "IE": {
        "status": "authorization",
        "authorization": "NZeTA",
        "maxDays": 90,
        "windowDays": null,
        "note": "No visa is needed for up to 3 months each visit, but you need an NZeTA and must pay the visitor levy (IVL, NZD 100) before you travel.",
        "source": "https://www.immigration.govt.nz/visas/new-zealand-electronic-travel-authority-nzeta/"
      },
      "IS": {
        "status": "authorization",
        "authorization": "NZeTA",
        "maxDays": 90,
        "windowDays": null,
        "note": "No visa is needed for up to 3 months each visit, but you need an NZeTA and must pay the visitor levy (IVL, NZD 100) before you travel.",
        "source": "https://www.immigration.govt.nz/visas/new-zealand-electronic-travel-authority-nzeta/"
      },
      "DE": {
        "status": "authorization",
        "authorization": "NZeTA",
        "maxDays": 90,
        "windowDays": null,
        "note": "No visa is needed for up to 3 months each visit, but you need an NZeTA and must pay the visitor levy (IVL, NZD 100) before you travel.",
        "source": "https://www.immigration.govt.nz/visas/new-zealand-electronic-travel-authority-nzeta/"
      },
      "FR": {
        "status": "authorization",
        "authorization": "NZeTA",
        "maxDays": 90,
        "windowDays": null,
        "note": "No visa is needed for up to 3 months each visit, but you need an NZeTA and must pay the visitor levy (IVL, NZD 100) before you travel.",
        "source": "https://www.immigration.govt.nz/visas/new-zealand-electronic-travel-authority-nzeta/"
      },
      "ES": {
        "status": "authorization",
        "authorization": "NZeTA",
        "maxDays": 90,
        "windowDays": null,
        "note": "No visa is needed for up to 3 months each visit, but you need an NZeTA and must pay the visitor levy (IVL, NZD 100) before you travel.",
        "source": "https://www.immigration.govt.nz/visas/new-zealand-electronic-travel-authority-nzeta/"
      },
      "JP": {
        "status": "authorization",
        "authorization": "NZeTA",
        "maxDays": 90,
        "windowDays": null,
        "note": "No visa is needed for up to 3 months each visit, but you need an NZeTA and must pay the visitor levy (IVL, NZD 100) before you travel.",
        "source": "https://www.immigration.govt.nz/visas/new-zealand-electronic-travel-authority-nzeta/"
      },
      "KR": {
        "status": "authorization",
        "authorization": "NZeTA",
        "maxDays": 90,
        "windowDays": null,
        "note": "No visa is needed for up to 3 months each visit, but you need an NZeTA and must pay the visitor levy (IVL, NZD 100) before you travel.",
        "source": "https://www.immigration.govt.nz/visas/new-zealand-electronic-travel-authority-nzeta/"
      },
      "MX": {
        "status": "authorization",
        "authorization": "NZeTA",
        "maxDays": 90,
        "windowDays": null,
        "note": "No visa is needed for up to 3 months each visit, but you need an NZeTA and must pay the visitor levy (IVL, NZD 100) before you travel.",
        "source": "https://www.immigration.govt.nz/visas/new-zealand-electronic-travel-authority-nzeta/"
      },
      "BR": {
        "status": "authorization",
        "authorization": "NZeTA",
        "maxDays": 90,
        "windowDays": null,
        "note": "No visa is needed for up to 3 months each visit, but you need an NZeTA and must pay the visitor levy (IVL, NZD 100) before you travel.",
        "source": "https://www.immigration.govt.nz/visas/new-zealand-electronic-travel-authority-nzeta/"
      },
      "LV": {
        "status": "authorization",
        "authorization": "NZeTA",
        "maxDays": 90,
        "windowDays": null,
        "note": "No visa is needed for up to 3 months each visit, but you need an NZeTA and must pay the visitor levy (IVL, NZD 100) before you travel.",
        "source": "https://www.immigration.govt.nz/visas/new-zealand-electronic-travel-authority-nzeta/"
      }
    }
  }
};

/** What the research could not confirm, in its own words. */
export const ENTRY_UNCERTAIN: readonly string[] = [
  "ETIAS start date: the EU portal dropped its 'last quarter of 2026' window; on 2026-09-29 there’s no officially confirmed start date. Secondary reporting (Newland Chase, etias.com, Tafapolsky & Smith) expects 2027. The official page (travel-europe.europa.eu/etias_en) is rendered by JavaScript and couldn’t be read directly.",
  "ETIAS fee recorded as EUR 20 (the Commission's increase from EUR 7) and validity as 3 years; confirm on the official page once it’s live.",
  "Japan-Brazil waiver extension to 29 Sep 2029: confirmed by several Brazilian reports (CNN Brasil, Panrotas, Bunkyo, July 2026) citing an exchange of notes published in the Diario Oficial; the MOFA Japan page returned 403 and wasn’t read directly.",
  "Japan's 6-month extension footnote (UK, Ireland, Germany, Mexico, plus Austria, Liechtenstein and Switzerland) is from memory of the MOFA list, not re-read (403).",
  "Korea visa-free stay for UK citizens recorded as 90 days; only Canada's 6 months was confirmed from an official Korean source. The Korean MOFA / HiKorea visa-waiver table wasn’t read directly.",
  "K-ETA exemption list (22 countries and regions) is from KPMG (flash alert 2026-024) and the Korean Embassy in Canada notice; the k-eta.go.kr notice returned an error. Ireland, Iceland, Latvia, Mexico and Brazil are recorded as needing K-ETA because they’re absent from that list.",
  "Australia: the ETA and eVisitor eligible-passport lists are from known Home Affairs lists; the pages returned 403 and the eligibility tabs couldn’t be read. Mexico and Brazil are recorded as needing a Visitor visa (subclass 600). The AUD 20 charge and 12-month / 3-month terms were read from the Home Affairs page source.",
  "Brazil e-Visa validity (10 years for US, 5 years for CA and AU) and the USD 80.90 fee come from secondary sources (Wego, Fragomen, VisaHQ); the gov.br consulate page showed a CAPTCHA.",
  "Brazil's passport rule and the extension up to 180 days per 12 months are from general Brazilian migration rules (Lei 13.445/2017 and its regulation); not read from an official page in this session.",
  "Mexico: the INM visa-exempt list is an image and couldn’t be read; the exempt status of the 13 nationalities follows the published INM/SRE lists (Infobae, May 2026, confirmed Brazil is visa-required). The list of visas and residences that exempt Brazilians is from the 2022 rule and wasn’t re-read.",
  "Ireland passport validity: the '6 months beyond departure' figure is from Irish visa-application guidance; for visa-exempt visitors the formal requirement may be validity for the stay only.",
  "US: whether the H.R. 1 'Visa Integrity Fee' (USD 250) for visa applicants such as Mexicans and Brazilians is being collected on 2026-09-29 wasn’t confirmed.",
  "Canada and US admission periods of 'up to 6 months' are officer-discretion norms, not fixed legal maxima.",
  "Japan's JESTA (planned pre-travel authorisation) is reported as targeted for FY2028; not confirmed from an official source in this session, and not in force.",
  "Stays stated as '3 months' or '6 months' were converted to 90 and 180 days."
];

export const ENTRY_AS_OF = '2026-09-29';
