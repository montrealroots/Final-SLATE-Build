/**
 * SLATE — how a person gets, keeps and uses a car driving license, by the
 * authority that issues it: each step and its fee, the youngest age, how long
 * a license lasts and what renewing it costs, any graduated or probationary
 * stage, what a visitor or a new resident with a license from elsewhere may
 * do, and who issues the International Driving Permit. Researched 2026-09-29
 * from each authority's own pages where they could be read; each entry lists
 * its sources and what the research could not confirm. Built by
 * `tools/build-licenses.mjs`; don't edit by hand.
 *
 * Nineteen jurisdictions. A license is issued by a state or province in the
 * United States, Canada and Australia, and by the country elsewhere; a place
 * outside them has no rule here, and `systems/documents.ts` says so rather
 * than assume one.
 */

export interface LicenseStep { step: string; fee: number | null; currency: string; note: string }

export interface VisitorRule {
  /** Days from entry a visitor may drive on a license from elsewhere; null where the authority sets none. */
  days: number | null;
  /** Languages a license needs no permit or translation in; 'any', 'latin' letters, or 'always' a permit. */
  languages: readonly string[] | 'any' | 'latin' | 'always';
  confirmed: boolean;
}

export interface LicenseRule {
  authority: string;
  name: string;
  minAge: { full: number; learner: number; note: string };
  steps: LicenseStep[];
  validityYears: number | null;
  renewalFee: number | null;
  /**
   * A district's own surcharge on a license, by the half-years it runs, for someone living in its towns (New York's
   * MCTD, from 2026-10-06: "$1 per 6 months of validity", on a first license, an exchange and a renewal).
   */
  district?: { cityIds: readonly string[]; perHalfYear: number };
  renewalNote: string;
  graduated: unknown;
  visitor: VisitorRule;
  foreign: { visitor: string | null; newResident: string | null };
  idp: { issuer: string; fee: number | null; currency: string; validity: string | null; convention: string | null; note?: string } | null;
  sources: { url: string; statedDate: string | null }[];
  uncertain: string[];
}

export const LICENSES: Readonly<Record<string, LicenseRule>> = {
  "us-ny": {
    "authority": "New York State Department of Motor Vehicles (NY DMV)",
    "name": "Class D (Operator) driver license",
    "minAge": {
      "full": 18,
      "learner": 16,
      "note": "Residents 16+ may apply for a Class D learner permit (the online permit test can be taken from 15 years 11 months). A Class D license is available at 17 with a driver-education completion certificate, otherwise at 18. Under 18 the license is a Junior (DJ) license under the Graduated Driver License law."
    },
    "steps": [
      {
        "step": "learner permit",
        "fee": 64.25,
        "currency": "USD",
        "note": "The permit/first-license fee is a single application fee set by age and county. Age 21+: $64.25-$67.50 outside the MCTD, $73.25-$77.50 inside the MCTD (Bronx, Kings, New York, Queens, Richmond, Dutchess, Nassau, Orange, Putnam, Rockland, Suffolk, Westchester); age 18-18.5: $80 / $90; 18.5-21: $76.75-$80 / $85.75-$90. The MCTD surcharge is $1 per 6 months of validity. Figure given is the low end for 21+ non-MCTD."
      },
      {
        "step": "knowledge test",
        "fee": null,
        "currency": "USD",
        "note": "Written permit test on the Driver's Manual; no separate fee is listed, it’s part of the permit application."
      },
      {
        "step": "eye test",
        "fee": null,
        "currency": "USD",
        "note": "Vision test at the DMV office when applying for the permit; no separate fee listed."
      },
      {
        "step": "course",
        "fee": null,
        "currency": "USD",
        "note": "Five-hour pre-licensing course at a licensed driving school (or high-school driver education) must be completed before scheduling the road test. Fee set by the school, not DMV."
      },
      {
        "step": "road test",
        "fee": null,
        "currency": "USD",
        "note": "Supervised practice with a licensed driver; the 50 hours (15 after sunset) requirement is stated for applicants under 18 only. No minimum permit-holding period for adults was stated on the pages fetched. No separate road-test fee found on the fees page."
      },
      {
        "step": "probationary license",
        "fee": null,
        "currency": "USD",
        "note": "All newly licensed drivers, regardless of age, serve a 6-month probation period; certain violations during it lead to suspension or revocation."
      }
    ],
    "validityYears": 8,
    "renewalFee": 64.5,
    "district": { "cityIds": ["us-ny-newyork"], "perHalfYear": 1 },
    "renewalNote": "Renewal of a Class D license: $64.50 outside the MCTD, $80.50 inside it (includes $16 MCTD for an 8-year license). A vision test by DMV or an approved provider (MV-619) is required. The first license is issued for up to 5 years to the birthday; renewals are 8-year.",
    "graduated": {
      "exists": true,
      "mainRestriction": "Graduated Driver License law applies to under-18 junior (DJ) licenses (time and area limits, e.g. no driving 9pm-5am in NYC); adults get an unrestricted Class D subject only to the 6-month probation.",
      "lengthForAdults": "None beyond the 6-month probationary period",
      "note": "Adults 18+ skip the junior stage."
    },
    "visitor": {
      "days": null,
      "languages": [
        "en"
      ],
      "confirmed": true
    },
    "foreign": {
      "visitor": "A visitor may drive in NY on a valid license from another country and need not apply for a NY license unless they become a resident. If the license isn’t in English, an International Driving Permit or a certified translation (by a consulate, the US Department of State or another official agency) is required. No time limit is stated by DMV. Visitors may not drive in a DMV road-test area.",
      "newResident": "Out-of-state (US state/territory) and Canadian-province licenses must be exchanged within 30 days of becoming a resident. A license from any other country can’t be exchanged: the holder applies for an original NY license as a new driver — vision test, written permit test, five-hour pre-licensing course, and road test — and surrenders the foreign license to the road-test examiner on passing. NY DMV publishes no foreign-country exchange/reciprocity list on the pages fetched."
    },
    "idp": {
      "issuer": "AAA or AATA (the only organizations authorized by the US Department of State)",
      "fee": 20,
      "currency": "USD",
      "validity": "1 year (maximum under the 1949 Convention; AAA page fetched didn’t state it)",
      "convention": "1949 Geneva Convention on Road Traffic (the US is a party to 1949, not 1968)"
    },
    "sources": [
      {
        "url": "https://dmv.ny.gov/driver-license/fees-refunds",
        "statedDate": null
      },
      {
        "url": "https://dmv.ny.gov/driver-license/get-learner-permit",
        "statedDate": null
      },
      {
        "url": "https://dmv.ny.gov/new-york-state-drivers-manual-and-practice-tests/chapter-1-driver-licenses",
        "statedDate": null
      },
      {
        "url": "https://dmv.ny.gov/driver-license/renew-a-driver-license",
        "statedDate": null
      },
      {
        "url": "https://dmv.ny.gov/driver-license/drivers-from-other-countries",
        "statedDate": null
      },
      {
        "url": "https://dmv.ny.gov/driver-license/exchange-out-of-state-driver-license",
        "statedDate": null
      },
      {
        "url": "https://www.aaa.com/vacation/idpf.html",
        "statedDate": null
      },
      {
        "url": "https://www.usa.gov/international-drivers-license",
        "statedDate": null
      }
    ],
    "uncertain": [
      "Whether the permit/license application fee covers the road test, and the number of road-test attempts included, weren’t stated on the fees page.",
      "Five-hour course price is set by private driving schools.",
      "No stated minimum permit-holding period or supervised-hours requirement for adults 18+.",
      "Renewal fee: renew page says $64.50/$80.50; a search snippet of the same site mentioned '$65 or $75' — the renew page figure was used.",
      "Visitor time limit on a foreign license not stated by NY DMV.",
      "IDP validity (1 year) not confirmed on an official page fetched; travel.state.gov returned 403."
    ]
  },
  "us-ct": {
    "authority": "Connecticut Department of Motor Vehicles (CT DMV)",
    "name": "Class D operator's license",
    "minAge": {
      "full": 18,
      "learner": 16,
      "note": "16- and 17-year-olds follow the teen (graduated) route; 18+ apply for an adult learner's permit. Full adult license route starts at 18."
    },
    "steps": [
      {
        "step": "eye test",
        "fee": null,
        "currency": "USD",
        "note": "Vision test must be passed before the knowledge test; covered by the $40 testing fee."
      },
      {
        "step": "knowledge test",
        "fee": 40,
        "currency": "USD",
        "note": "25-question knowledge test, by appointment at a DMV office. The $40 license exam/testing fee covers the vision, knowledge and road tests (fee page itemizes $16 knowledge, $30 road — the package is $40)."
      },
      {
        "step": "learner permit",
        "fee": 19,
        "currency": "USD",
        "note": "Adult learner's permit (Class D). Must drive with a qualified trainer at least 20 years old who has held a valid license for 4 consecutive years without suspension. Permit must be held at least 90 days before the road test (exempt: active-duty military, prior CT license holders, holders of another state's or country's license)."
      },
      {
        "step": "course",
        "fee": null,
        "currency": "USD",
        "note": "Eight-hour Safe Driving Practices Course at a licensed driving school, required before the road test (waived if you held a CT license expired 2+ years). Price set by the school."
      },
      {
        "step": "road test",
        "fee": null,
        "currency": "USD",
        "note": "On-the-road skills test booked online after the 90-day wait; covered by the $40 testing fee."
      },
      {
        "step": "license issue",
        "fee": 84,
        "currency": "USD",
        "note": "$84 license fee paid after passing the road test. Fee page: original license issued for 5.5 to 7 years to expire on the birthday."
      }
    ],
    "validityYears": 8,
    "renewalFee": 96,
    "renewalNote": "CT DMV is phasing in an eight-year license; the renewal notice sets the term. Fee page: 6-year renewal $72, 8-year renewal $96, 2-year renewal $24 for age 65+; $25 late fee.",
    "graduated": {
      "exists": true,
      "mainRestriction": "Graduated rules apply to 16-17-year-olds only; adults receive an unrestricted license after the 90-day permit period, course and road test.",
      "lengthForAdults": "None (90-day minimum permit period before the road test)",
      "note": ""
    },
    "visitor": {
      "days": 365,
      "languages": [
        "en",
        "es"
      ],
      "confirmed": true
    },
    "foreign": {
      "visitor": "A student (full-time), active-duty military member or visitor may drive for up to one year on a valid foreign license. If the license isn’t in English or Spanish it must be accompanied by an International Driving Permit (which serves as the English translation), issued in the country of origin.",
      "newResident": "New residents must transfer within 90 days. Licenses from Canada, Germany and France transfer under the out-of-state rules: $40 application fee + $84 license fee, vision test only, no knowledge or road test, no learner's permit, and the license mustn’t be expired more than 2 years. Holders of any other country's license must go through the adult learner's permit route (vision + knowledge test, 8-hour course, road test); the 90-day permit hold is waived for those who held another country's license."
    },
    "idp": {
      "issuer": "AAA or AATA (US); CT requires a visitor's IDP to be issued by the country of origin",
      "fee": 20,
      "currency": "USD",
      "validity": "1 year (1949 Convention maximum; not stated on the AAA page fetched)",
      "convention": "1949 Geneva Convention on Road Traffic"
    },
    "sources": [
      {
        "url": "https://portal.ct.gov/dmv/licenses-permits-ids/get-learners-permit/adult-learners-permit",
        "statedDate": null
      },
      {
        "url": "https://portal.ct.gov/dmv/resources/dmv-fees",
        "statedDate": null
      },
      {
        "url": "https://portal.ct.gov/dmv/licenses-permits-ids/transfer-out-of-state-license",
        "statedDate": null
      },
      {
        "url": "https://portal.ct.gov/dmv/licenses-permits-ids/renew-driver-license",
        "statedDate": null
      },
      {
        "url": "https://portal.ct.gov/DMV/Licenses/Licenses/International-Driver-Permits",
        "statedDate": null
      },
      {
        "url": "https://www.aaa.com/vacation/idpf.html",
        "statedDate": null
      }
    ],
    "uncertain": [
      "License term: fee page says originals run 5.5-7 years while the renewal page says DMV is phasing in 8-year licenses; validityYears 8 reflects the phase-in, not a confirmed figure for every new license.",
      "Fee page itemizes knowledge $16 and road $30 but the adult-permit page says a single $40 testing fee covers all tests; $40 treated as the charge.",
      "No required supervised-hours log stated for adults.",
      "Eight-hour course price set by schools.",
      "Whether CT has added any foreign exchange partner beyond Canada, Germany and France (e.g. Taiwan) — only those three are listed on the transfer page.",
      "Visitor 1-year rule text came from a legacy CT DMV page seen via search, not fully fetched."
    ]
  },
  "us-ca": {
    "authority": "California Department of Motor Vehicles (CA DMV)",
    "name": "Class C (basic) driver's license",
    "minAge": {
      "full": 18,
      "learner": 15.5,
      "note": "Instruction permit from 15.5 with driver education; provisional license at 16 for minors. At 18+ an adult gets a regular Class C with no provisional stage."
    },
    "steps": [
      {
        "step": "application",
        "fee": 46,
        "currency": "USD",
        "note": "Online DL/ID application, then an office visit with identity, SSN and California residency documents, thumbprint and photo. The $46 non-refundable application fee is valid for 12 months and covers 3 knowledge-test and 3 drive-test attempts."
      },
      {
        "step": "eye test",
        "fee": null,
        "currency": "USD",
        "note": "Vision exam at the office; included in the application fee."
      },
      {
        "step": "knowledge test",
        "fee": null,
        "currency": "USD",
        "note": "Included; 3 attempts per application, after which you must reapply."
      },
      {
        "step": "learner permit",
        "fee": null,
        "currency": "USD",
        "note": "Instruction permit issued after passing the knowledge test. No minimum holding period or supervised-hours requirement stated for adults (minors: 6 months and 50 hours, 10 at night)."
      },
      {
        "step": "road test",
        "fee": null,
        "currency": "USD",
        "note": "Behind-the-wheel test by appointment, proof of insurance required. Three attempts included; each retest after a fail costs $9 (fees page)."
      }
    ],
    "validityYears": 5,
    "renewalFee": 46,
    "renewalNote": "An original license expires on the applicant's 5th birthday after the application; renewals every 5 years at $46. A limited-term license expires with the holder's legal-presence document. Drivers 70+ renew in person.",
    "graduated": {
      "exists": true,
      "mainRestriction": "Provisional license for under-18s: for the first 12 months no driving 11pm-5am and no passengers under 20 without a qualifying adult.",
      "lengthForAdults": "None — adults 18+ receive a regular Class C.",
      "note": ""
    },
    "visitor": {
      "days": null,
      "languages": "any",
      "confirmed": true
    },
    "foreign": {
      "visitor": "A visitor over 18 with a valid license from their home state or country may drive in California without a California license as long as that license remains valid. No IDP requirement stated by CA DMV.",
      "newResident": "A new resident must get a California license within 10 days. Residency is established by, e.g., voting, paying resident tuition or claiming a homeowner's exemption, or by presence of 6+ months in a 12-month period. California publishes no foreign-license exchange list on the pages fetched: a foreign-license holder applies as for an original license, with the knowledge test, vision exam and drive test."
    },
    "idp": {
      "issuer": "AAA or AATA",
      "fee": 20,
      "currency": "USD",
      "validity": "1 year (1949 Convention maximum; not stated on the AAA page fetched)",
      "convention": "1949 Geneva Convention on Road Traffic"
    },
    "sources": [
      {
        "url": "https://www.dmv.ca.gov/portal/driver-licenses-identification-cards/driver-licenses-dl/",
        "statedDate": null
      },
      {
        "url": "https://www.dmv.ca.gov/portal/driver-licenses-identification-cards/licensing-fees/",
        "statedDate": null
      },
      {
        "url": "https://www.dmv.ca.gov/portal/handbook/california-driver-handbook/getting-an-instruction-permit-and-drivers-license/",
        "statedDate": null
      },
      {
        "url": "https://www.dmv.ca.gov/portal/driver-licenses-identification-cards/dl-renewal/",
        "statedDate": null
      },
      {
        "url": "https://www.dmv.ca.gov/portal/file/fast-facts-5-requirements-for-a-california-drivers-license/",
        "statedDate": "2020-06 (FFDL 5 REV. 6/2020)"
      },
      {
        "url": "https://www.aaa.com/vacation/idpf.html",
        "statedDate": null
      }
    ],
    "uncertain": [
      "Retest fee: licensing-fees page says $9; the driver-licenses page says $7 — $9 used.",
      "Whether a foreign-license holder's drive test is ever waived, and whether CA has any foreign reciprocity (e.g. Taiwan), wasn’t stated on the pages fetched.",
      "No separate instruction-permit fee published; assumed included in the $46 application fee."
    ]
  },
  "gb": {
    "authority": "DVLA (licensing) and DVSA (theory and practical tests)",
    "name": "Photocard driving licence, category B (provisional, then full)",
    "minAge": {
      "full": 17,
      "learner": 17,
      "note": "A provisional license can be applied for at 15 years 9 months but can’t be used to drive a car until 17 (16 for those receiving the enhanced rate of the mobility part of PIP; that exception isn’t verified on a fetched page this session). No minimum learning period and no compulsory lessons."
    },
    "steps": [
      {
        "step": "learner permit",
        "fee": 34,
        "currency": "GBP",
        "note": "Provisional driving license. GBP 34 online, GBP 43 by post (check or postal order). Apply from 15y9m. Learners must display L plates and be supervised by a qualified driver."
      },
      {
        "step": "knowledge test",
        "fee": 23,
        "currency": "GBP",
        "note": "Car theory test (multiple choice plus hazard perception), GBP 23 weekday or evening/weekend."
      },
      {
        "step": "eye test",
        "fee": null,
        "currency": "GBP",
        "note": "No separate fee: the eyesight check (reading a number plate at a set distance) is done at the start of the practical test. Not verified on a fetched page this session."
      },
      {
        "step": "road test",
        "fee": 62,
        "currency": "GBP",
        "note": "Car practical test GBP 62 weekdays; GBP 75 evenings (from 4:30pm), weekends and bank holidays. No compulsory lessons or hours."
      },
      {
        "step": "full license",
        "fee": 0,
        "currency": "GBP",
        "note": "Full license issued after passing; no separate upgrade fee is listed on the fee pages fetched (treat 0 as unverified)."
      }
    ],
    "validityYears": 10,
    "renewalFee": 14,
    "renewalNote": "Photocard must be renewed every 10 years: GBP 14 online, GBP 17 by post. Free at 70+ (renewal then every 3 years) and for medical short-period licenses.",
    "graduated": {
      "exists": false,
      "mainRestriction": "No plates or passenger/night restrictions. Under the New Drivers Act, 6 or more penalty points within 2 years of passing revokes the license (back to provisional, both tests retaken).",
      "lengthForAdults": "2 years (points threshold only)",
      "note": "Optional P plates exist but aren’t required. New Drivers Act rule not verified on a fetched page this session."
    },
    "visitor": {
      "days": 365,
      "languages": "any",
      "confirmed": true
    },
    "foreign": {
      "visitor": "May drive a car on a valid non-GB license for up to 12 months from entering GB. IDP not required for GB by the gov.uk guidance fetched (license in English or with IDP is the practical norm; not verified).",
      "newResident": "EU/EEA licenses: may drive until the license expires (age 70) and may exchange at any time; no test. Licenses from designated countries may be used for 12 months from becoming resident and exchanged without a test within 5 years of becoming resident: Andorra, Australia, Barbados, British Virgin Islands, Canada, Cayman Islands, Falkland Islands, Faroe Islands, Hong Kong, Japan, Monaco, New Zealand, North Macedonia, Republic of Korea, Singapore, South Africa, Switzerland, Taiwan, Ukraine, United Arab Emirates, Zimbabwe (plus Gibraltar, Jersey, Guernsey, Isle of Man). Only licenses where the test was passed in a designated country/EU-EEA qualify. Everyone else: drive up to 12 months on the foreign license, then must get a GB provisional license and pass theory and practical tests."
    },
    "idp": {
      "issuer": "PayPoint shops (in person; Post Office no longer issues since April 1, 2024)",
      "fee": 5.5,
      "currency": "GBP",
      "validity": "1926 or 1949 permit: 12 months; 1968 permit: 3 years or until the UK license expires, whichever is first",
      "convention": "1926, 1949 and 1968 permits all issued (type depends on destination country)",
      "note": "Must live in GB or NI, hold a full UK license, and be 18+."
    },
    "sources": [
      {
        "url": "https://www.gov.uk/apply-first-provisional-driving-licence",
        "statedDate": null
      },
      {
        "url": "https://www.gov.uk/driving-test-cost",
        "statedDate": null
      },
      {
        "url": "https://www.gov.uk/renew-driving-licence",
        "statedDate": null
      },
      {
        "url": "https://www.gov.uk/driving-abroad/get-an-idp",
        "statedDate": null
      },
      {
        "url": "https://www.gov.uk/driving-abroad/international-driving-permit",
        "statedDate": null
      },
      {
        "url": "https://www.gov.uk/government/news/law-on-driving-licence-exchange-tightened-to-improve-road-safety",
        "statedDate": "2013-01-15"
      },
      {
        "url": "https://www.legislation.gov.uk/uksi/2021/537/contents/made",
        "statedDate": "2021"
      },
      {
        "url": "https://www.nidirect.gov.uk/articles/exchanging-your-foreign-driving-licence",
        "statedDate": null
      }
    ],
    "uncertain": [
      "gov.uk exchange/non-GB-license pages are interactive tools; the designated-country list is assembled from the 2013 DfT news release, the 2021 Exchangeable Licenses Order (added Cayman? North Macedonia, Taiwan, Ukraine, UAE) and the NI list, not read from a single current GB page.",
      "Whether Moldova has since been added (a DfT consultation on Moldovan license exchange exists).",
      "Exchange fee for a foreign license in GB (commonly GBP 43 by D1 form) not verified on an official page.",
      "Eyesight check procedure, PIP age-16 exception and New Drivers Act 6-point rule not verified on fetched pages.",
      "Whether an IDP or translation is required for visitors with non-English licenses in GB not stated on fetched pages."
    ]
  },
  "gb-nir": {
    "authority": "Driver & Vehicle Agency (DVA), Department for Infrastructure NI",
    "name": "Northern Ireland photocard driving licence, category B",
    "minAge": {
      "full": 17,
      "learner": 17,
      "note": "Provisional can be applied for up to 2 months before 17; earliest valid date is the 17th birthday (16 with enhanced-rate PIP). From 1 October 2026, learners whose category B provisional entitlement starts on/after that date face a mandatory 6-month minimum learning period, so the earliest full license is effectively 17.5."
    },
    "steps": [
      {
        "step": "learner permit",
        "fee": 62.5,
        "currency": "GBP",
        "note": "First provisional license GBP 62.50 (renew provisional GBP 30). L plates, 45 mph maximum while displaying L plates, supervisor 21+ with 3+ years full license."
      },
      {
        "step": "course",
        "fee": null,
        "currency": "GBP",
        "note": "From 1 Oct 2026 (GDL): a Program of Training recorded in a Logbook (app or web) must be completed before the practical test. Cost set by instructors, not DVA."
      },
      {
        "step": "knowledge test",
        "fee": 23,
        "currency": "GBP",
        "note": "Car theory test GBP 23; can’t be booked before the provisional license is valid."
      },
      {
        "step": "road test",
        "fee": 65,
        "currency": "GBP",
        "note": "Car practical test GBP 65 weekday, GBP 95 evening/weekend. GDL learners must wait at least 6 months from the provisional license's valid date. Practical test itself changes from 1 April 2027; pre-GDL learners may take the current test until 31 March 2027."
      },
      {
        "step": "probationary license",
        "fee": 0,
        "currency": "GBP",
        "note": "Provisional-to-full upgrade after the test is free."
      }
    ],
    "validityYears": 10,
    "renewalFee": 30,
    "renewalNote": "Car photocard expires every 10 years. 'Optional renewal car (new 10-year period)' and 'Expired car or motorcycle' are each GBP 30. Free from age 70 and for medically restricted licenses. Can renew up to 2 months before expiry.",
    "graduated": {
      "exists": true,
      "mainRestriction": "R plates. Pre-GDL: R plates for 12 months with a 45 mph maximum for R-plated cars. GDL (provisional entitlement from 1 Oct 2026): 2-year new-driver period with R plates; first 6 months blue-on-white R plate with a restriction of no more than one passenger aged 14-20 between 23:00 and 06:00 (exemptions for immediate family and a supervising licensed driver aged 21+); remaining 18 months white-on-blue R plate without restrictions.",
      "lengthForAdults": "2 years under GDL (12 months under the old rules)",
      "note": "DfI GDL FAQ states GDL imposes no speed restrictions on newly qualified drivers. A DfI-sourced search summary says the night passenger restriction applies to new drivers under 24."
    },
    "visitor": {
      "days": 365,
      "languages": "any",
      "confirmed": true
    },
    "foreign": {
      "visitor": "Valid non-EEA, non-designated license: may drive cars for up to 12 months from entering the UK. Convention-format IDPs are accepted; so-called 'international driving licenses' not issued under UN authorisation aren’t valid.",
      "newResident": "EU/EEA licenses: drive until expiry (Group 1), exchange optional. Designated countries may be used for 1 year from becoming resident (3 years for Ukrainian licenses from 25 March 2024) and exchanged without a test within 5 years (within 12 months recommended to keep continuous entitlement): Andorra, Australia, Barbados, British Virgin Islands, Canada, Cayman Islands, Falkland Islands, Faroe Islands, Gibraltar, Hong Kong, Japan, Monaco, New Zealand, North Macedonia, Republic of Korea, Singapore, South Africa, Switzerland, Taiwan, UAE, Ukraine, Zimbabwe; also Great Britain, Jersey, Guernsey, Isle of Man. All others: 12 months on the foreign license, then an NI provisional license and both tests before the 12 months end to keep full-license status."
    },
    "idp": {
      "issuer": "PayPoint shops (UK-wide scheme; NI residents eligible)",
      "fee": 5.5,
      "currency": "GBP",
      "validity": "1926/1949: 12 months; 1968: 3 years or until UK license expiry",
      "convention": "1926, 1949, 1968"
    },
    "sources": [
      {
        "url": "https://www.nidirect.gov.uk/articles/cost-driving-licence",
        "statedDate": null
      },
      {
        "url": "https://www.nidirect.gov.uk/articles/driving-test-fees",
        "statedDate": null
      },
      {
        "url": "https://www.nidirect.gov.uk/articles/minimum-ages-and-rules-learner-drivers-and-riders",
        "statedDate": null
      },
      {
        "url": "https://www.nidirect.gov.uk/campaigns/graduated-driver-licensing",
        "statedDate": null
      },
      {
        "url": "https://www.infrastructure-ni.gov.uk/articles/graduated-driver-licensing-faqs",
        "statedDate": null
      },
      {
        "url": "https://www.nidirect.gov.uk/articles/exchanging-your-foreign-driving-licence",
        "statedDate": null
      },
      {
        "url": "https://www.nidirect.gov.uk/articles/driving-licences-all-other-countries-and-students-foreign-licence",
        "statedDate": null
      },
      {
        "url": "https://www.nidirect.gov.uk/articles/renewing-your-driving-licence",
        "statedDate": null
      },
      {
        "url": "https://www.gov.uk/driving-abroad/get-an-idp",
        "statedDate": null
      }
    ],
    "uncertain": [
      "Whether the old 12-month R-plate 45 mph limit is repealed for GDL drivers or still applies to pre-GDL drivers passing after 1 Oct 2026 (FAQ says GDL imposes no speed restriction; nidirect still states 45 mph for R-plated cars).",
      "Exact age scope of the GDL night-time passenger restriction (under-24 per a search summary of DfI material, not read verbatim).",
      "nidirect also mentions the Post Office as an IDP issuer; gov.uk says PayPoint since 1 April 2024.",
      "No statedDate on any nidirect page fetched."
    ]
  },
  "ca-on": {
    "authority": "Ontario Ministry of Transportation, via ServiceOntario and DriveTest",
    "name": "Class G driver's licence (graduated: G1, G2, G)",
    "minAge": {
      "full": 17,
      "learner": 16,
      "note": "G1 at 16. G1 lasts 12 months (8 with an approved beginner driver education course) and G2 at least 12 months, so the earliest full G is about 17 years 8 months; the program typically takes about 20 months. Adults go through the same stages."
    },
    "steps": [
      {
        "step": "eye test",
        "fee": null,
        "currency": "CAD",
        "note": "Vision test at a DriveTest center; included in the G1 package."
      },
      {
        "step": "knowledge test",
        "fee": 159.75,
        "currency": "CAD",
        "note": "G1 knowledge-test package. Secondary sources give $159.75 = knowledge test $16 + one G2 road test $53.75 + 5-year license $90; Ontario's own fee page confirms only the $90 license fee. Since 11 May 2026 applicants must declare Ontario as their primary residence and confirm legal presence in Canada."
      },
      {
        "step": "learner permit",
        "fee": null,
        "currency": "CAD",
        "note": "G1: zero blood alcohol, no driving midnight-5am, must be accompanied by a fully licensed driver with 4+ years' experience; wait 12 months (8 with approved course) before the G2 road test."
      },
      {
        "step": "road test",
        "fee": 53.75,
        "currency": "CAD",
        "note": "G2 road test (first attempt included in the G1 package). Passing gives the G2 license."
      },
      {
        "step": "probationary license",
        "fee": null,
        "currency": "CAD",
        "note": "G2: may drive alone on all roads; zero blood alcohol; passenger limits if under 20. Hold at least 12 months before the G road test."
      },
      {
        "step": "road test",
        "fee": null,
        "currency": "CAD",
        "note": "G road test (advanced skills, including highway driving). Fee not confirmed from an official page (commonly cited $91.25)."
      }
    ],
    "validityYears": 5,
    "renewalFee": 90,
    "renewalNote": "License renewal $90 (Ontario driver and vehicle fees page); license is a 5-year license.",
    "graduated": {
      "exists": true,
      "mainRestriction": "G1 must drive accompanied, zero alcohol, no midnight-5am; G2 zero alcohol (and passenger limits under 20).",
      "lengthForAdults": "At least 20 months (G1 12 months, or 8 with approved course, plus G2 12 months); applies to all ages.",
      "note": "Adults aren’t exempt from graduated licensing."
    },
    "visitor": {
      "days": 90,
      "languages": "any",
      "confirmed": true
    },
    "foreign": {
      "visitor": "A visitor staying under 3 months may drive on a valid license from their own province, state or country. A visitor from another country staying longer than 3 months needs an International Driving Permit from their home country, obtained before arriving (it can’t be applied for in Ontario).",
      "newResident": "A new resident may drive on a valid outside license for 60 days, then must switch to an Ontario license. Direct exchange is available for licenses from any Canadian province or territory, the Canadian Armed Forces, all US states (not territories), and Australia, Austria, Belgium, Croatia, Denmark, France, Germany, Great Britain, Hungary, the Isle of Man, Japan, South Korea, Kosovo, New Zealand, Northern Ireland, the Republic of Ireland, Switzerland, Taiwan and Ukraine. For other countries, effective 1 July 2026 an applicant can get credit for up to one year of driving experience with an authenticated foreign license plus an official government letter confirming it (in English or French); they must then pass the vision, knowledge and G2 road tests, wait at least 12 months, and pass the G road test."
    },
    "idp": {
      "issuer": "CAA (the only authorized issuer in Canada)",
      "fee": 32,
      "currency": "CAD",
      "validity": "1 year from issue, or until the Canadian license expires, whichever is first",
      "convention": "1949 United Nations Convention on Road Traffic"
    },
    "sources": [
      {
        "url": "https://www.ontario.ca/page/get-g-drivers-licence-new-drivers",
        "statedDate": null
      },
      {
        "url": "https://www.ontario.ca/page/exchange-out-province-drivers-licence",
        "statedDate": "2026-09-23"
      },
      {
        "url": "https://www.ontario.ca/page/driver-and-vehicle-fees",
        "statedDate": "2024-07-25"
      },
      {
        "url": "https://www.ontario.ca/page/drive-ontario-visitors",
        "statedDate": null
      },
      {
        "url": "https://drivetest.ca/tests/fees/",
        "statedDate": null
      },
      {
        "url": "https://g1canada.com/g1test-fees.html",
        "statedDate": null
      },
      {
        "url": "https://www.caa.ca/faqs/how-much-does-an-idp-cost/",
        "statedDate": "2025-12-01 (fee effective)"
      },
      {
        "url": "https://www.caa.ca/faqs/how-long-does-an-idp-last/",
        "statedDate": null
      }
    ],
    "uncertain": [
      "drivetest.ca fee page returned 403; the $159.75 G1 package and $53.75 G2 road test come from secondary sources (consistent with the official $90 license fee). G road test fee not confirmed (commonly $91.25).",
      "Exchange-country license holders' outcome by experience (e.g. full G with 2+ years, G2 with less) isn’t stated on the exchange page fetched.",
      "The exchange page says only 'up to one year' of credit from 1 July 2026 for non-agreement countries; what it replaced wasn’t stated.",
      "Exchange fee not listed ('applicable fees').",
      "Visitor-page details came from a search snippet of ontario.ca/page/drive-ontario-visitors, not a full fetch."
    ]
  },
  "ca-bc": {
    "authority": "Insurance Corporation of British Columbia (ICBC), for RoadSafetyBC",
    "name": "Class 5 driver's licence (via Graduated Licensing Program: Class 7L learner, Class 7 novice)",
    "minAge": {
      "full": 19,
      "learner": 16,
      "note": "Learner (L) at 16, held at least 12 months; novice (N) at least 24 months (possibly 18 with an ICBC-approved course in the L stage and a clean record), so the earliest full Class 5 is at about 19 (18.5 with the course). Takes about three years start to finish; adults follow the same program unless they can prove 2+ years of full-privilege driving elsewhere."
    },
    "steps": [
      {
        "step": "knowledge test",
        "fee": 15,
        "currency": "CAD",
        "note": "Class 7 knowledge test, $15 per attempt (free for 65+). Available in 12 languages. Must be retaken if the learner license expires."
      },
      {
        "step": "eye test",
        "fee": null,
        "currency": "CAD",
        "note": "Vision screening at the driver licensing office; no separate fee listed."
      },
      {
        "step": "learner permit",
        "fee": 10,
        "currency": "CAD",
        "note": "Class 7L photo learner license $10. L restrictions: supervisor 25+ with a full license, zero alcohol and drugs, no electronic devices, L sign. At least 12 months before the Class 7 road test."
      },
      {
        "step": "road test",
        "fee": 35,
        "currency": "CAD",
        "note": "Class 7 road test $35; ICBC states the Class 7 and 8 road-test fee becomes $50 from 19 October 2026. $25 cancellation fee if not canceled 48 hours ahead."
      },
      {
        "step": "probationary license",
        "fee": 75,
        "currency": "CAD",
        "note": "First 5-year novice license $75. N stage at least 24 months (18 with approved training): zero alcohol and drugs, no electronic devices, N sign, and passenger limits; midnight-5am restrictions apply."
      },
      {
        "step": "road test",
        "fee": 50,
        "currency": "CAD",
        "note": "Class 5 road test $50 (road-test fee only; a license fee may apply). Road tests free for 65+."
      }
    ],
    "validityYears": 5,
    "renewalFee": 75,
    "renewalNote": "5-year license renewal $75 ($17 for seniors 65+). Licenses expiring within 180 days count as renewals and are valid 5 years from the upcoming birthday.",
    "graduated": {
      "exists": true,
      "mainRestriction": "L: supervised by 25+ driver, zero alcohol/drugs, no devices; N: zero alcohol/drugs, no devices, N sign, passenger limits.",
      "lengthForAdults": "At least 36 months (12 L + 24 N; 30 with an approved course), unless the adult proves 2+ years of full-privilege, non-learner driving experience.",
      "note": "Adults without proof of 2+ years' full-license experience enter the GLP with Class 7/8 restrictions."
    },
    "visitor": {
      "days": 180,
      "languages": "any",
      "confirmed": true
    },
    "foreign": {
      "visitor": "A tourist may drive on a valid license from home for up to six months (seasonal agricultural workers up to 12 months). A new resident may drive on their current license for up to 90 days.",
      "newResident": "Must switch to a B.C. license within 90 days and surrender all other licenses. Knowledge and road testing are waived for every Canadian province and territory, and for passenger (and motorcycle) licenses from most US states (including Washington DC and Puerto Rico). Passenger licenses from Austria, Australia, Belgium, France, Germany, Guernsey, Isle of Man, Jersey, Ireland, Japan, the Netherlands (not the former Antilles territories: Aruba, Bonaire, Curacao, Saba, St. Eustatius, St. Maarten), New Zealand, South Korea, Switzerland, Taiwan (passenger only, with a red-seal verification certificate and a TECO Vancouver translation) and the United Kingdom also exchange without testing. Everyone else takes the knowledge test and the Class 5 road test; failing the road test leads to a B.C. learner license and the old license isn’t returned. Proof of 2+ years' full-privilege experience is needed to skip graduated licensing; ICBC credits up to 15 years of experience for insurance. Translation by an ICBC-approved translator may be required. A license expired over 3 years with no proof of recent driving means both tests. A first 2-year license for non-learner drivers moving to B.C. costs $31."
    },
    "idp": {
      "issuer": "CAA (the only authorized issuer in Canada)",
      "fee": 32,
      "currency": "CAD",
      "validity": "1 year from issue, or until the Canadian license expires, whichever is first",
      "convention": "1949 United Nations Convention on Road Traffic"
    },
    "sources": [
      {
        "url": "https://icbc.com/driver-licensing/new-drivers/Graduated-licensing",
        "statedDate": null
      },
      {
        "url": "https://icbc.com/driver-licensing/moving-bc/moving-from-another-country",
        "statedDate": null
      },
      {
        "url": "https://icbc.com/driver-licensing/visit-dl-office/Fees",
        "statedDate": "Class 7/8 road-test fee rises to $50 from 2026-10-19"
      },
      {
        "url": "https://www.caa.ca/faqs/how-much-does-an-idp-cost/",
        "statedDate": "2025-12-01 (fee effective)"
      },
      {
        "url": "https://www.caa.ca/faqs/how-long-does-an-idp-last/",
        "statedDate": null
      }
    ],
    "uncertain": [
      "Whether an exchange-list driver with under 2 years' experience gets a Class 7 (novice) rather than a Class 5 — ICBC ties GLP exemption to 2+ years' proof, not to the list.",
      "Exact N-stage passenger limit and the midnight-5am rule details were only summarized, not quoted.",
      "Whether a visitor needs an IDP or translation wasn’t stated on the pages fetched.",
      "No 'last updated' date on ICBC pages; the fees page states the 2026-10-19 change."
    ]
  },
  "ie": {
    "authority": "National Driver Licence Service (NDLS), operated by the Road Safety Authority (RSA)",
    "name": "Driving licence, category B (learner permit, then full licence)",
    "minAge": {
      "full": 17,
      "learner": 17,
      "note": "Learner permit at 17. Because the first learner permit must be held for 6 months and 12 EDT lessons completed before the test, the earliest full license is in practice about 17.5."
    },
    "steps": [
      {
        "step": "knowledge test",
        "fee": null,
        "currency": "EUR",
        "note": "Driver Theory Test (theorytest.ie) must be passed before applying for the first learner permit. Reported as EUR 45 by secondary sources; official fee page not reachable."
      },
      {
        "step": "eye test",
        "fee": null,
        "currency": "EUR",
        "note": "An eyesight report is required with the first learner permit application (not verified on a fetched page; optician fee set privately)."
      },
      {
        "step": "learner permit",
        "fee": 45,
        "currency": "EUR",
        "note": "EUR 45 since 1 January 2025 (was EUR 35). Valid 2 years. Must display L plates and be accompanied by a full-license holder of 2+ years. From 1 November 2026: a third or fourth permit requires a driving test taken within the previous 2 years, a fourth permit lasts 1 year only, and after 7 years or 4 permits the learner must restart (theory test, lessons, test)."
      },
      {
        "step": "course",
        "fee": null,
        "currency": "EUR",
        "note": "Essential Driver Training (EDT): 12 one-hour lessons with an Approved Driving Instructor (6 if eligible for reduced EDT), recorded in a logbook; ADIs set their own prices."
      },
      {
        "step": "road test",
        "fee": null,
        "currency": "EUR",
        "note": "Must hold first learner permit at least 6 months and have completed all EDT lessons. Reported as EUR 85 by secondary sources; official RSA fee page not reachable. From 9 March 2026 a certificate of motor insurance for the test vehicle must be presented (secondary source)."
      },
      {
        "step": "probationary license",
        "fee": 65,
        "currency": "EUR",
        "note": "First full license EUR 65 (was EUR 55 until 31 Dec 2024), issued for 10 years; novice (N-plate) period of 2 years follows."
      }
    ],
    "validityYears": 10,
    "renewalFee": 65,
    "renewalNote": "EUR 65 for first-time, renewal or replacement license; exempt at 70+. License is normally 10 years (shorter for older or medically restricted drivers).",
    "graduated": {
      "exists": true,
      "mainRestriction": "Novice (N-plate) period: must display N plates (2 penalty points on fixed charge, 4 on conviction if not); disqualification at 7 penalty points instead of 12 for drivers whose first learner permit was granted on/after 1 August 2014, during the learner period and first 2 years of the first full license.",
      "lengthForAdults": "2 years",
      "note": "The novice period applies once only; it doesn’t restart on gaining another category."
    },
    "visitor": {
      "days": 365,
      "languages": "any",
      "confirmed": true
    },
    "foreign": {
      "visitor": "May drive on a current, valid license from any state outside the EU/EEA for up to 1 year as a visitor. EU/EEA licenses are recognized.",
      "newResident": "EU/EEA licenses are recognized and can be exchanged without a test. Recognized states whose full licenses exchange without a test: Australia, Gibraltar, Guernsey, Isle of Man, Japan, Jersey, New Zealand, Republic of Korea, South Africa, Switzerland, Taiwan, United Kingdom, and the Canadian provinces of Alberta, British Columbia, Manitoba, Newfoundland & Labrador, Ontario and Saskatchewan (license must be current or within 1 year of expiry). Ukrainian license holders under temporary protection can keep driving on their Ukrainian license. All other residents must go through the full process (theory test, learner permit, EDT, driving test)."
    },
    "idp": {
      "issuer": "NDLS (in person at an NDLS center by appointment); AA Ireland discontinued the service",
      "fee": 15,
      "currency": "EUR",
      "validity": null,
      "convention": null,
      "note": "Fee and issuer reported by AA Ireland blog and Citizens Information; NDLS page not reachable."
    },
    "sources": [
      {
        "url": "https://www.ndls.ie/learner-driver/fees.html",
        "statedDate": null
      },
      {
        "url": "https://www.ndls.ie/licensed-driver/fees.html",
        "statedDate": null
      },
      {
        "url": "https://www.ndls.ie/news/264-fee-increases-to-take-effect-from-01-january-2025.html",
        "statedDate": "2025-01-01 (effective)"
      },
      {
        "url": "https://www.rsa.ie/news-events/news/details/2024/12/12/fee-adjustments-for-rsa-services-to-take-effect-from-january-1st",
        "statedDate": "2024-12-12"
      },
      {
        "url": "https://www.rte.ie/news/ireland/2024/1212/1486240-rsa-price-increase/",
        "statedDate": "2024-12-12"
      },
      {
        "url": "https://www.rsa.ie/services/learner-drivers/driving-lessons/car-driving-lessons-(edt)",
        "statedDate": null
      },
      {
        "url": "https://www.rsa.ie/news-events/news/details/2025/11/05/rsa-welcomes-learner-permit-changes--a-step-towards-safer--fairer-driving",
        "statedDate": "2025-11-05"
      },
      {
        "url": "https://www.rsa.ie/services/licensed-drivers/driving-licence/novice-drivers",
        "statedDate": null
      },
      {
        "url": "https://www.ndls.ie/licensed-driver/exchange-my-foreign-driving-licence.html",
        "statedDate": null
      },
      {
        "url": "https://www.theaa.ie/blog/international-driving-permit-ireland-what-you-need-to-know/",
        "statedDate": null
      }
    ],
    "uncertain": [
      "ndls.ie, rsa.ie and citizensinformation.ie returned HTTP 403 to fetches; all Irish figures come from search-result snippets of those official pages plus RTE, not from reading the pages directly.",
      "Car driving test fee (EUR 85) and theory test fee (EUR 45) not confirmed on an official page; left null.",
      "Eyesight report requirement for the first learner permit not verified.",
      "IDP validity and convention (Ireland is party to 1949; NDLS issue) not verified; IDP fee EUR 15 from secondary sources.",
      "Whether the UK is on the recognized-states list as of 2026 is from memory of the post-Brexit agreement, not a fetched page."
    ]
  },
  "is": {
    "authority": "Samgöngustofa (Icelandic Transport Authority) sets rules; Sýslumenn (District Commissioners) issue licenses; Frumherji runs tests",
    "name": "Ökuskírteini, B flokkur (bráðabirgðaskírteini, then fullnaðarskírteini)",
    "minAge": {
      "full": 18,
      "learner": 16,
      "note": "Driving lessons may start at 16; a (provisional) license is issued no earlier than the 17th birthday. The full license requires at least 12 months on the provisional license, so the earliest full license is 18. Written test from 2 months before 17, practical test from 2 weeks before 17."
    },
    "steps": [
      {
        "step": "learner permit",
        "fee": null,
        "currency": "ISK",
        "note": "Study permit (námsheimild) applied for together with the first license via Sýslumenn. Accompanied practice (æfingaakstur) with a private supervisor is allowed after at least 10 instructor lessons and instructor sign-off; the practice permit is issued for up to 18 months. Requires adequate vision/hearing and health declaration."
      },
      {
        "step": "course",
        "fee": null,
        "currency": "ISK",
        "note": "Driving School 1 and 2 (theory, 25 hours total across Ö1-Ö3; Ö2 expires after 2 years) and 17-25 hours with a licensed driving instructor; Driving School 3 (practical risk training incl. skid simulation) comes later for the full license. Driving-school prices are private."
      },
      {
        "step": "knowledge test",
        "fee": 7583,
        "currency": "ISK",
        "note": "Frumherji written test: 50 true/false statements, 45 minutes, 45 correct to pass; retake after 1 week. Booked via prof.is."
      },
      {
        "step": "road test",
        "fee": 19619,
        "currency": "ISK",
        "note": "Frumherji practical test for category B, booked by the instructor; minimum score 80; retake after 1 week."
      },
      {
        "step": "probationary license",
        "fee": 4300,
        "currency": "ISK",
        "note": "Bráðabirgðaskírteini (provisional license), valid 3 years. Postal fee 365 ISK if mailed."
      },
      {
        "step": "full license",
        "fee": 8600,
        "currency": "ISK",
        "note": "Fullnaðarskírteini: after 12 continuous months on the provisional license, Driving School 3 completed, a driving assessment (akstursmat) with an instructor, and no penalty points or suspension in the previous 12 months."
      }
    ],
    "validityYears": 15,
    "renewalFee": 8600,
    "renewalNote": "Full B license valid 15 years but never beyond age 70. Renewal 8,600 ISK; 1,800 ISK for those 65 and over.",
    "graduated": {
      "exists": true,
      "mainRestriction": "Bráðabirgðaskírteini: fewer penalty points needed to lose the license; can’t upgrade to a full license unless 12 months pass without points or suspension.",
      "lengthForAdults": "Minimum 1 year, maximum 3 years (provisional license validity)",
      "note": "No passenger or night restrictions stated on the pages fetched."
    },
    "visitor": {
      "days": null,
      "languages": "latin",
      "confirmed": true
    },
    "foreign": {
      "visitor": "Foreign citizens with a valid foreign license may drive to the extent the license permits. Non-EEA licenses must be in Latin letters or accompanied by a translation into Icelandic, Danish, Norwegian, Swedish or English (an IDP serves this purpose).",
      "newResident": "EEA, UK, Switzerland and Japan licenses exchange for an Icelandic license without a test after 6 months of permanent residence in Iceland. Holders of licenses from all other countries must, after 6 months of permanent residence, take both the theory and practical tests. Exchange fee 8,600 ISK."
    },
    "idp": {
      "issuer": "Sýslumenn (District Commissioners) and FÍB (Icelandic Automobile Association)",
      "fee": 1200,
      "currency": "ISK",
      "validity": "1 year from issue",
      "convention": null,
      "note": "Requires valid Icelandic license, age 18+, 35x45 mm photo; issued within one working day; only valid together with the license."
    },
    "sources": [
      {
        "url": "https://island.is/en/first-driving-licence-study-permit/bradabirgdaskirteini",
        "statedDate": null
      },
      {
        "url": "https://island.is/en/permanent-driving-license",
        "statedDate": null
      },
      {
        "url": "https://island.is/en/drivers-license",
        "statedDate": null
      },
      {
        "url": "https://island.is/s/syslumenn/gjaldskra-syslumanna",
        "statedDate": null
      },
      {
        "url": "https://frumherji.is/thjonusta/profstadir/oekunam-og-prof",
        "statedDate": null
      },
      {
        "url": "https://island.is/en/foreign-driving-licences",
        "statedDate": null
      },
      {
        "url": "https://island.is/en/althjodlegt-okuskirteini",
        "statedDate": null
      },
      {
        "url": "https://island.is/reglugerdir/nr/0830-2011",
        "statedDate": "Regulation 830/2011 as amended"
      }
    ],
    "uncertain": [
      "How long a visitor may drive on a foreign license (no time limit found on fetched pages).",
      "Whether the 4,300 ISK provisional-license fee also covers the learner/study permit, or whether the study permit has its own fee.",
      "Which road-traffic convention Iceland's 1-year IDP follows (1-year validity suggests 1949; not stated).",
      "Exact penalty-point threshold on the provisional license.",
      "Frumherji test fees are private-operator prices and may change; no date stated."
    ]
  },
  "de": {
    "authority": "Fahrerlaubnisbehörde (Führerscheinstelle) of the district or city; tests run by the Technische Prüfstelle (TÜV/DEKRA) under the Fahrerlaubnis-Verordnung (FeV); fees set by the GebOSt",
    "name": "Fahrerlaubnis Klasse B (EU card license, Führerschein)",
    "minAge": {
      "full": 18,
      "learner": 17,
      "note": "Begleitetes Fahren ab 17 (BF17): license from 17 valid only with a named accompanying driver until 18. Minors may not drive in Germany on a third-country license and must use BF17 (ADAC, 18.08.2026). A Bundesregierung/BMV reform of driver training (online theory, a question catalog about 30% smaller) passed cabinet in 2026 and is planned for early 2027; not in force today."
    },
    "steps": [
      {
        "step": "eye test",
        "fee": null,
        "currency": "EUR",
        "note": "Sehtest at an optician or doctor; ADAC reports EUR 0-7 (many opticians free). Not a fixed official fee."
      },
      {
        "step": "first aid course",
        "fee": null,
        "currency": "EUR",
        "note": "Erste-Hilfe-Kurs, required; private providers, ADAC reports from about EUR 60. Unregulated."
      },
      {
        "step": "application",
        "fee": 43.4,
        "currency": "EUR",
        "note": "Antrag auf Ersterteilung Klasse B at the Fahrerlaubnisbehörde, GebOSt fee as published by municipal service portals (e.g. Trier). Some authorities add postage or other items; ADAC gives a range of EUR 38-70."
      },
      {
        "step": "course",
        "fee": null,
        "currency": "EUR",
        "note": "Driving school is mandatory: theory classes plus 12 Sonderfahrten (5 Überland, 4 Autobahn, 3 night) and as many normal lessons as needed. Prices unregulated; ADAC 08.04.2025 puts the total at EUR 2,466-4,476, BMV cites an average of about EUR 3,400."
      },
      {
        "step": "knowledge test",
        "fee": 24.99,
        "currency": "EUR",
        "note": "Theoretische Prüfung at TÜV/DEKRA: EUR 21.00 net + 19% VAT (GebOSt Nr. 402), valid since 31.01.2024; paid again per attempt."
      },
      {
        "step": "road test",
        "fee": 129.83,
        "currency": "EUR",
        "note": "Praktische Prüfung Klasse B at TÜV/DEKRA: EUR 109.10 net + 19% VAT, valid since 31.01.2024; paid again per attempt. The school also charges its own presentation fee (unregulated)."
      },
      {
        "step": "probationary license",
        "fee": null,
        "currency": "EUR",
        "note": "License issued under a 2-year Probezeit (see graduated)."
      }
    ],
    "validityYears": 15,
    "renewalFee": null,
    "renewalNote": "The card (not the entitlement) is valid 15 years for licenses issued since 19.01.2013; replacement is administrative, with no medical or test for class B. Older paper and card licenses must be exchanged on a staggered schedule. Replacement fee not verified from an official page.",
    "graduated": {
      "exists": true,
      "mainRestriction": "Probezeit: 0.0 per mille alcohol; a serious (A) or two lesser (B) offences trigger an Aufbauseminar and extend the probation to 4 years.",
      "lengthForAdults": "2 years",
      "note": "Applies to everyone on first license regardless of age. Details are from general knowledge of the FeV/StVG, not fetched from an official page this session."
    },
    "visitor": {
      "days": null,
      "languages": [
        "de"
      ],
      "confirmed": true
    },
    "foreign": {
      "visitor": "A non-resident may drive on a valid foreign license. A translation is needed if the license isn’t in German or not in the 1968 Vienna Convention format; licenses from Andorra, Hong Kong, Monaco, New Zealand, San Marino, Switzerland and Senegal need none (ADAC 18.08.2026). An IDP serves as the translation.",
      "newResident": "A third-country license is valid for 6 months after taking up normal residence (one 6-month extension if the stay won’t exceed 12 months). After that it must be converted (Umschreibung). Holders from Anlage 11 FeV list states convert class B with no theory or practical test, including the United Kingdom, Gibraltar, Switzerland, Japan, South Korea, Taiwan, Singapore, Israel, New Zealand, South Africa, Namibia, Andorra, Monaco, Albania, Bosnia and Herzegovina, Serbia, Montenegro and Ukraine (the last two added 18.08.2026), the Australian states and territories, and the Canadian provinces. Some US states are listed; several (reported: Connecticut, District of Columbia, Florida, Minnesota, Mississippi, Missouri, Nebraska, North Carolina, Tennessee) require the theory test only. Other third-country licenses convert only after passing both theory and practical tests at a driving school, without mandatory lesson minimums."
    },
    "idp": {
      "issuer": "Fahrerlaubnisbehörde (Führerscheinstelle); ADAC doesn’t issue it",
      "fee": null,
      "currency": "EUR",
      "validity": "3 years (in practice), never beyond the national license",
      "convention": "1968 Vienna (Germany also issues a 1926 format for some countries)",
      "note": "GebOSt Nr. 207 sets a EUR 11.20-15.30 frame per one secondary source; municipal portals charge about EUR 16.30 in person, EUR 18.90 by post. Not confirmed on a federal page."
    },
    "sources": [
      {
        "url": "https://www.tuev-hessen.de/324/gebuehren-entgelte-und-auslagen-fuer-fahrerlaubnispruefungen/",
        "statedDate": "2024-01-31"
      },
      {
        "url": "https://www.adac.de/verkehr/rund-um-den-fuehrerschein/erwerb/fuehrerschein-kosten/",
        "statedDate": "2025-04-08"
      },
      {
        "url": "https://www.trier.de/service/dienstleistungen-a-z/15768.Lebenslagen-fuer-Buergerinnen-und-Buerger.html?detID=1455",
        "statedDate": null
      },
      {
        "url": "https://www.adac.de/verkehr/rund-um-den-fuehrerschein/auslaendische-fuehrerscheine/staaten-auserhalb/",
        "statedDate": "2026-08-18"
      },
      {
        "url": "https://www.gesetze-im-internet.de/fev_2010/anlage_11.html",
        "statedDate": null
      },
      {
        "url": "https://www.buzer.de/Anlage_11_FeV.htm",
        "statedDate": "2026-08-18"
      },
      {
        "url": "https://www.bmv.de/SharedDocs/DE/Pressemitteilungen/2026/043-schnieder-bezahlbarer-fuehrerschein.html",
        "statedDate": null
      },
      {
        "url": "https://www.landkreis-muenchen.de/buergerservice/dienstleistung/internationaler-fuehrerschein/",
        "statedDate": null
      }
    ],
    "uncertain": [
      "Driving school cost is unregulated (ADAC EUR 2,466-4,476; BMV average about EUR 3,400).",
      "Application fee 43.40 EUR taken from municipal portals, not a federal source; ADAC gives a range of EUR 38-70.",
      "Sehtest and first aid course prices are market prices, not official.",
      "License replacement fee at the end of the 15-year card validity not verified.",
      "IDP fee varies by authority (about 16.30 EUR in person); the GebOSt frame was reported by a secondary source.",
      "The full Anlage 11 row-by-row breakdown for US states was read through a summariser; the exact US states listed and which need the theory test should be checked on gesetze-im-internet.de before use.",
      "Probezeit details not fetched from an official page this session."
    ]
  },
  "fr": {
    "authority": "Ministère de l'Intérieur / Sécurité routière; applications through ANTS (France Titres)",
    "name": "Permis de conduire catégorie B",
    "minAge": {
      "full": 17,
      "learner": 15,
      "note": "Permis B at 17 (since 1 January 2024). Apprentissage anticipé de la conduite (AAC, conduite accompagnée) from 15; registration possible from 16 otherwise."
    },
    "steps": [
      {
        "step": "registration",
        "fee": 0,
        "currency": "EUR",
        "note": "Online registration with ANTS to get a NEPH number, usually filed by the driving school. No fee found."
      },
      {
        "step": "course",
        "fee": null,
        "currency": "EUR",
        "note": "Minimum 20 hours of driving lessons, at least 15 on the road (the rest may be simulator); 13 hours for automatic. Driving school prices unregulated."
      },
      {
        "step": "learner permit",
        "fee": null,
        "currency": "EUR",
        "note": "Optional AAC from 15: after initial training, at least 3,000 km over at least 1 year with an accompanier; shortens probation to 2 years."
      },
      {
        "step": "knowledge test",
        "fee": 30,
        "currency": "EUR",
        "note": "Examen du code de la route at an approved private center, EUR 30, paid again after a failure."
      },
      {
        "step": "road test",
        "fee": 0,
        "currency": "EUR",
        "note": "The state practical exam carries no state fee; driving schools charge for presenting the candidate and the car (unregulated)."
      },
      {
        "step": "probationary license",
        "fee": 0,
        "currency": "EUR",
        "note": "Permis probatoire with 6 points (see graduated). No issuance fee found for a first license."
      }
    ],
    "validityYears": 15,
    "renewalFee": null,
    "renewalNote": "The card format is valid 15 years; the category itself doesn’t expire and no medical is required for B absent individual restrictions. Renewal of the card is done through ANTS; fee not confirmed from an official page.",
    "graduated": {
      "exists": true,
      "mainRestriction": "Permis probatoire: starts with 6 of 12 points; 'A' disc on the car; lower speed limits (110 on motorways, 100 on 110 roads, 80 on 90 roads) and 0.2 g/l alcohol.",
      "lengthForAdults": "3 years (2 years after AAC; 1 year 6 months with complementary training at a labelled school)",
      "note": "Without AAC, +2 points per clean year; with AAC, +3 per clean year. An offense costing points interrupts the annual increase. Speed and alcohol figures from general knowledge, not fetched this session."
    },
    "visitor": {
      "days": 180,
      "languages": [
        "fr"
      ],
      "confirmed": true
    },
    "foreign": {
      "visitor": "On a short stay under 6 months a valid non-EU license may be used if it is written in French, or is accompanied by an international driving permit, or by an official translation (legalised or apostilled if made abroad, or by an accredited translator or the issuing country's consulate). The driver must meet France's minimum age for the category.",
      "newResident": "A non-EU license is recognized for 1 year from the start of normal residence (for a first residence permit, the exchange must be requested within 1 year of receiving it). Exchange without a test is possible only if the issuing state is on the reciprocity list (liste des États pratiquant l'échange, arrêté du 12 janvier 2012; list dated 2 March 2026; about 126 states and entities), which states per category and, for federal states, per state or province. Otherwise the full French test is required. Electronic fiscal stamp EUR 40 (EUR 20 in French Guiana). A French translation is needed if the license isn’t in French."
    },
    "idp": {
      "issuer": "ANTS (France Titres), online request",
      "fee": 0,
      "currency": "EUR",
      "validity": "3 years, or until the national license expires if sooner",
      "convention": "1949 Geneva and 1968 Vienna (France is party to both); convention format of the printed permit not confirmed",
      "note": "Processing 2-4 weeks as of March 2026; sent by tracked letter."
    },
    "sources": [
      {
        "url": "https://www.service-public.gouv.fr/particuliers/vosdroits/F2828",
        "statedDate": "2025-05-26"
      },
      {
        "url": "https://www.service-public.gouv.fr/particuliers/vosdroits/F2390",
        "statedDate": null
      },
      {
        "url": "https://www.service-public.gouv.fr/particuliers/vosdroits/F1460",
        "statedDate": "2026-06-01"
      },
      {
        "url": "https://www.service-public.gouv.fr/particuliers/vosdroits/F1459",
        "statedDate": "2026-06-01"
      },
      {
        "url": "https://www.securite-routiere.gouv.fr/sites/default/files/2026-03/liste_reciprocite_hors_ue_et_eee_au_2_mars_2026.pdf",
        "statedDate": "2026-03-02"
      },
      {
        "url": "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000025175223",
        "statedDate": null
      },
      {
        "url": "https://www.service-public.gouv.fr/particuliers/vosdroits/R50828",
        "statedDate": null
      }
    ],
    "uncertain": [
      "Driving school cost is unregulated; not recorded.",
      "Contents of the 2 March 2026 reciprocity list couldn’t be retrieved (connection failed), so the specific countries, US states and Canadian provinces that exchange without a test aren’t named here.",
      "Card renewal fee after 15 years not confirmed.",
      "Novice speed limits and 0.2 g/l limit stated from general knowledge, not fetched this session.",
      "Which convention format the ANTS IDP follows wasn’t confirmed.",
      "The EUR 40 exchange stamp is as stated on F1460 (01.06.2026); earlier exchanges were free, so this appears to be recent."
    ]
  },
  "es": {
    "authority": "Dirección General de Tráfico (DGT), Ministerio del Interior",
    "name": "Permiso de conducción clase B",
    "minAge": {
      "full": 18,
      "learner": 17.75,
      "note": "No learner permit exists in Spain today; the first exam may be taken 3 months before turning 18. Accompanied driving from 17 (EU Directive 2025/2205) is planned, not in force: Spain must transpose it by 26 November 2028 (DGT revista, April 2026)."
    },
    "steps": [
      {
        "step": "eye test",
        "fee": null,
        "currency": "EUR",
        "note": "Psychophysical aptitude report (vision, hearing, psychomotor) from an authorised Centro de Reconocimiento de Conductores, valid 90 days. Price not an official DGT fee (secondary sources say EUR 30-50)."
      },
      {
        "step": "course",
        "fee": null,
        "currency": "EUR",
        "note": "No legal minimum of lessons; in practice an autoescuela with a dual-control car. Unregulated; secondary sources put the total at EUR 1,000-1,400."
      },
      {
        "step": "exam fee",
        "fee": 94.05,
        "currency": "EUR",
        "note": "Tasa 2.1 (exámenes para permisos de conducir) covers the theory and practical exams with two attempts in total; after that a new fee is due. EUR 93.12 in the DGT fee table previously published; EUR 94.05 for 2026 per secondary sources, consistent with the 2026 figures on DGT pages for other fees."
      },
      {
        "step": "knowledge test",
        "fee": null,
        "currency": "EUR",
        "note": "Included in tasa 2.1. A pass stays valid for 2 years."
      },
      {
        "step": "road test",
        "fee": null,
        "currency": "EUR",
        "note": "Included in tasa 2.1. On passing, a provisional permit valid 3 months is issued while the card is made (usually within 6 weeks)."
      },
      {
        "step": "probationary license",
        "fee": null,
        "currency": "EUR",
        "note": "Conductor novel for 2 years (see graduated)."
      }
    ],
    "validityYears": 10,
    "renewalFee": 24.58,
    "renewalNote": "Valid 10 years until 65, then 5 years. Renewal (prórroga de vigencia, tasa 4.3) needs a new psychophysical report from a Centro de Reconocimiento (priced separately). EUR 24.34 in the older DGT fee table; 24.58 for 2026 per secondary sources.",
    "graduated": {
      "exists": true,
      "mainRestriction": "Starts with 8 points (12 after 2 clean years); 'L' plate on the rear window for the first year; alcohol limit 0.15 mg/l breath (0.3 g/l blood) for 2 years.",
      "lengthForAdults": "2 years",
      "note": "Applies to everyone with less than 2 years since first license, regardless of age. Details from secondary sources (Legálitas, others), not a DGT page."
    },
    "visitor": {
      "days": null,
      "languages": [
        "es"
      ],
      "confirmed": true
    },
    "foreign": {
      "visitor": "A non-EU license can be used by a visitor if it conforms to Annex 9 of the 1949 Geneva Convention or Annex 6 of the 1968 Vienna Convention, or is accompanied by an IDP or an official translation into Spanish; carry passport and original license (DGT, updated 13.11.2020).",
      "newResident": "A non-EU license stays valid for at most 6 months from acquiring normal residence. It must be exchanged within those 6 months (canje, tasa 2.3, EUR 28.87) if the country has a canje agreement; otherwise the full Spanish test is required. Countries with an agreement for class B, with no exam: Andorra, Algeria, Argentina, Bolivia, Brazil, Chile, Colombia, South Korea, Costa Rica, Ecuador, Philippines, Georgia, Guatemala, Honduras, Japan, North Macedonia, Morocco, Moldova, Monaco, Nicaragua, New Zealand, Panama, Paraguay, Peru, UK and Northern Ireland, Dominican Republic, El Salvador, Serbia, Switzerland, Tunisia, Turkey, Ukraine, Uruguay (DGT, updated 26.06.2026). The US and Canada aren’t on the list. Licenses obtained after the agreement was signed while the holder was already resident in Spain can’t be exchanged."
    },
    "idp": {
      "issuer": "DGT (Jefaturas de Tráfico)",
      "fee": 10.51,
      "currency": "EUR",
      "validity": "1 year, not renewable",
      "convention": "1949 Geneva",
      "note": "Tasa 4.5. Not valid in Spain itself; not needed within the EU/EEA or in countries with bilateral agreements."
    },
    "sources": [
      {
        "url": "https://www.dgt.es/nuestros-servicios/permisos-de-conducir/obtener-un-nuevo-permiso-de-conducir/requisitos-preparacion-y-presentacion-a-examen/",
        "statedDate": null
      },
      {
        "url": "https://sede.dgt.gob.es/export/sites/dgt/.galleries/otros-tramites/pago-de-tasas/Importe_de_Tasas.pdf",
        "statedDate": null
      },
      {
        "url": "https://sede.dgt.gob.es/es/permisos-de-conducir/permiso-internacional/",
        "statedDate": null
      },
      {
        "url": "https://www.dgt.es/nuestros-servicios/permisos-de-conducir/permisos-extranjeros-y-de-fuerzas-y-cuerpos-de-seguridad/canjes-de-permisos/paises-con-convenio-de-canjes/",
        "statedDate": "2026-06-26"
      },
      {
        "url": "https://www.dgt.es/nuestros-servicios/permisos-de-conducir/permisos-extranjeros-y-de-fuerzas-y-cuerpos-de-seguridad/conducir-con-un-permiso-extranjero/",
        "statedDate": "2020-11-13"
      },
      {
        "url": "https://revista.dgt.es/es/reportajes/2026/03MARZO/0325-N277-conduccion-acompayada.shtml",
        "statedDate": "2026-04-16"
      },
      {
        "url": "https://traficotest.es/dgt/tasas-dgt-2026-precio-carnet",
        "statedDate": null
      },
      {
        "url": "https://www.legalitas.com/actualidad/todo-lo-que-debes-saber-del-conductor-novel",
        "statedDate": null
      }
    ],
    "uncertain": [
      "Tasa 2.1 of EUR 94.05 and renewal tasa 4.3 of EUR 24.58 for 2026 come from secondary sources; the DGT fee PDF retrieved showed the earlier 93.12 / 24.34 and the Ministry of the Interior fee page returned 403. Both 2026 figures are about 1% above the old table, matching the 2026 canje (28.87 vs 28.58) and IDP (10.51 vs 10.40) figures on DGT pages.",
      "IDP page states EUR 10.51 with no date.",
      "Psychophysical report price at Centros de Reconocimiento isn’t an official DGT fee.",
      "Driving school cost is unregulated.",
      "minAge.learner is 17.75 only because the exam can be sat 3 months before 18; Spain has no learner permit.",
      "Novice driver rules (8 points, L plate 1 year, 0.15 mg/l for 2 years) taken from secondary sources."
    ]
  },
  "jp": {
    "authority": "Prefectural Public Safety Commission (Tokyo: Tokyo Metropolitan Police Department), under the Road Traffic Act administered nationally by the National Police Agency",
    "name": "普通自動車免許 (Futsū jidōsha menkyo, standard car license)",
    "minAge": {
      "full": 18,
      "learner": 17.5,
      "note": "From 1 April 2026 the provisional (仮免許) and full-license exams may be taken from 17 years 6 months, but the full license is issued only from 18 (Tokyo MPD, updated 01.04.2026)."
    },
    "steps": [
      {
        "step": "course",
        "fee": null,
        "currency": "JPY",
        "note": "Most learners attend a designated driving school (指定自動車教習所), which conducts the provisional and final skill tests itself, so the test center's road test is waived. School fees unregulated. Direct-test route exists."
      },
      {
        "step": "eye test",
        "fee": null,
        "currency": "JPY",
        "note": "Aptitude test (適性試験: vision, color, hearing) at the test center, included in the exam fee."
      },
      {
        "step": "learner permit",
        "fee": null,
        "currency": "JPY",
        "note": "仮免許 (provisional license) after passing the school's stage-1 skill test and a provisional knowledge test; valid 6 months. Tokyo MPD fee table (updated 19.01.2026) lists JPY 5,800 for the direct-exam route; a driving school reported the school-route issue fee rising from JPY 2,850 to 2,900 on 24.03.2025."
      },
      {
        "step": "first aid course",
        "fee": null,
        "currency": "JPY",
        "note": "Emergency first aid training is part of the school curriculum; direct-test applicants must take 取得時講習 including 応急救護 separately (fee not found)."
      },
      {
        "step": "road test",
        "fee": null,
        "currency": "JPY",
        "note": "Direct-test route only: road test at the center after at least 5 days / 10 hours of road practice on the provisional license. School graduates are exempt."
      },
      {
        "step": "knowledge test",
        "fee": 1900,
        "currency": "JPY",
        "note": "Full-license written exam at the test center, school graduate (JPY 3,300 for the direct-test route). Online reservation only, weekdays."
      },
      {
        "step": "license issue",
        "fee": 2350,
        "currency": "JPY",
        "note": "Issue fee for a conventional card; school graduate total JPY 4,250 (JPY 3,450 My Number card only, JPY 4,350 both). Direct route total JPY 5,650."
      },
      {
        "step": "probationary license",
        "fee": null,
        "currency": "JPY",
        "note": "初心運転者期間: first year (see graduated)."
      }
    ],
    "validityYears": 3,
    "renewalFee": 2850,
    "renewalNote": "First renewal gives 3 years; later renewals give 5 years for 優良 (gold, no violations in the prior 5 years) and general drivers meeting the criteria, 3 years otherwise. Tokyo base renewal fee JPY 2,850 (conventional card; 2,100 My Number only; 2,950 both) plus a lecture fee of JPY 500-1,400 by category (JPY 200 for online gold lecture).",
    "graduated": {
      "exists": true,
      "mainRestriction": "Beginner mark (初心者マーク) must be displayed front and rear for 1 year; 3+ violation points (or 4+ if a single 3-point offense) require a beginner-driver course, and failure to attend or further points lead to a re-examination that can cancel the license.",
      "lengthForAdults": "1 year",
      "note": "Applies to all new licensees regardless of age."
    },
    "visitor": {
      "days": 365,
      "languages": "always",
      "confirmed": true
    },
    "foreign": {
      "visitor": "Up to 1 year from entry on a 1949 Geneva Convention IDP (Japan doesn’t accept 1968-only IDPs), or, for Switzerland, Germany, France, Belgium, Monaco and Taiwan, the national license with an official Japanese translation from JAF, the issuing authority or embassy, the Taiwan-Japan Relations Association, ADAC, Zippurasu or the Japan Incoming Drivers Support Association. For people in the resident register, a return after under 3 months abroad doesn’t restart the year.",
      "newResident": "Conversion (外国免許切替) at a test center after the IDP/translation year: requires proof of at least 3 months cumulative stay in the issuing country after licensing, document review, aptitude test, and a knowledge check and skill check unless exempt. Exempt from both checks (29 countries/regions): Iceland, Ireland, USA (Ohio, Oregon, Colorado, Virginia, Hawaii, Maryland, Washington only), UK, Italy, Australia, Austria, Netherlands, Canada, South Korea, Greece, Switzerland, Sweden, Spain, Slovenia, Czech Republic, Denmark, Germany, New Zealand, Norway, Hungary, Finland, France, Belgium, Poland, Portugal, Monaco, Luxembourg, Taiwan; Indiana is exempt from the skill check only. Tokyo fees: exam JPY 1,600-3,900 by class plus issue JPY 2,350. Procedures changed on 1 October 2025 (residence documentation required; harder knowledge check)."
    },
    "idp": {
      "issuer": "Prefectural Public Safety Commission (Tokyo: Fuchu, Samezu, Koto test centers, Kanda and Shinjuku renewal centers, Setagaya, Itabashi, Tachikawa police stations)",
      "fee": 2250,
      "currency": "JPY",
      "validity": "1 year from issue, not renewable; void if the Japanese license lapses",
      "convention": "1949 Geneva"
    },
    "sources": [
      {
        "url": "https://www.keishicho.metro.tokyo.lg.jp/menkyo/menkyo/annai/intro/tetsuzuki00.html",
        "statedDate": "2026-04-01"
      },
      {
        "url": "https://www.keishicho.metro.tokyo.lg.jp/menkyo/oshirase/fee.html",
        "statedDate": "2026-01-19"
      },
      {
        "url": "https://www.keishicho.metro.tokyo.lg.jp/menkyo/menkyo/kokugai/kokugai05.html",
        "statedDate": "2026-09-07"
      },
      {
        "url": "https://www.keishicho.metro.tokyo.lg.jp/menkyo/menkyo/kokugai/gaikokumenkyo.html",
        "statedDate": "2025-12-05"
      },
      {
        "url": "https://www.keishicho.metro.tokyo.lg.jp/menkyo/menkyo/kokugai/kokugai01.html",
        "statedDate": "2026-06-10"
      },
      {
        "url": "https://www.keishicho.metro.tokyo.lg.jp/menkyo/koshu/koshu/koshu06.html",
        "statedDate": null
      },
      {
        "url": "https://www.npa.go.jp/policies/application/license_renewal/QA.html",
        "statedDate": null
      },
      {
        "url": "https://www.edogawa-ds.co.jp/pages/1/detail=1/b_id=3/r_id=173/",
        "statedDate": null
      }
    ],
    "uncertain": [
      "Fees are Tokyo's; other prefectures follow the national cabinet-order fees but should be checked.",
      "Designated driving school cost is unregulated (commonly about JPY 300,000, not verified).",
      "Minimum school hours (reported as 26 classroom + 34 MT / 31 AT practical) not verified from an official page.",
      "Provisional license fee for the school route (JPY 2,900) comes from a driving school, not the MPD.",
      "Whether the 仮免許 itself can be issued before 18 under the April 2026 change wasn’t confirmed; learner age 17.5 reflects the exam age.",
      "Fee for 取得時講習 / first aid training on the direct route not found.",
      "validityYears is 3 for the first license period; later periods are 5 years for eligible drivers."
    ]
  },
  "kr": {
    "authority": "Korea Road Traffic Authority (한국도로교통공단, KoROAD) driver license test centers, under the Korean National Police Agency and the Road Traffic Act",
    "name": "제2종 보통 운전면허 (Class 2 ordinary; 1종 보통 also covers cars and small trucks)",
    "minAge": {
      "full": 18,
      "learner": 18,
      "note": "Minimum 18 for both the practice license (연습면허) and the ordinary license."
    },
    "steps": [
      {
        "step": "course",
        "fee": 0,
        "currency": "KRW",
        "note": "Traffic safety education (교통안전교육), 1 hour, before the knowledge test; exempt for those trained at a driving school. Fee not listed (treated as none found)."
      },
      {
        "step": "eye test",
        "fee": 7000,
        "currency": "KRW",
        "note": "Physical/aptitude exam (신체검사) at the test center, plus three passport photos."
      },
      {
        "step": "knowledge test",
        "fee": 10000,
        "currency": "KRW",
        "note": "학과시험."
      },
      {
        "step": "skill test",
        "fee": 25000,
        "currency": "KRW",
        "note": "기능시험 (course skills test)."
      },
      {
        "step": "learner permit",
        "fee": 4000,
        "currency": "KRW",
        "note": "연습면허, valid 1 year, lapses on getting the full license. Road practice needs an accompanying driver licensed for the class."
      },
      {
        "step": "road test",
        "fee": 30000,
        "currency": "KRW",
        "note": "도로주행시험; requires a valid practice license."
      },
      {
        "step": "license issue",
        "fee": 10000,
        "currency": "KRW",
        "note": "정식 면허 (full license) issue; ID and one photo. Mobile/IC card options cost more."
      }
    ],
    "validityYears": 10,
    "renewalFee": 10000,
    "renewalNote": "For licenses obtained since 9 December 2011: renewal every 10 years (5 years from 65, 3 years from 75), within a window from 6 months before to 6 months after the birthday in the due year. Class 2 renewal KRW 10,000 (IC KRW 15,000), no physical. Class 1 aptitude test KRW 16,000 (IC 21,000) plus a KRW 7,000-8,000 physical.",
    "graduated": {
      "exists": true,
      "mainRestriction": "One-year practice license (연습면허) with accompanied road practice, then the full license; new drivers are 초보운전자 for 2 years from first issue.",
      "lengthForAdults": "Up to 1 year on the practice license; 2 years as a novice after the full license",
      "note": "Specific novice-period penalties weren’t confirmed from an official page this session."
    },
    "visitor": {
      "days": 365,
      "languages": "always",
      "confirmed": true
    },
    "foreign": {
      "visitor": "A visitor may drive for 1 year from entry with a valid 1949 Geneva or 1968 Vienna Convention IDP (Hong Kong and Macau IDPs also accepted), carried with passport and national license.",
      "newResident": "Exchange at a test center: requires at least 90 consecutive days in the issuing country after licensing (출입국사실증명), embassy confirmation or apostille issued within 1 year, and a full (not learner) license. Holders from countries that recognize Korean licenses (국내면허 인정국가, Police Agency notice dated 6 April 2026) take only the aptitude/physical exam; those from other countries take the aptitude exam plus a 40-question written test (Korean, English, Mandarin or Vietnamese). Belgium, Poland, Spain, Italy and Ireland have special agreements giving the same class; Hong Kong, Taiwan and Guam are recognized regions; some US states are listed (the page names Oregon, Idaho, Utah and Nevada, with a written test noted for some). Exchanged licenses are issued as Class 2 ordinary except for special-agreement countries. Fees: written test KRW 10,000 if required, physical KRW 7,000-8,000, issue KRW 10,000-15,000."
    },
    "idp": {
      "issuer": "Driver license test centers, police stations, Incheon and Gimhae airport IDP centers (online applications also)",
      "fee": 9000,
      "currency": "KRW",
      "validity": "1 year from issue",
      "convention": "1949 Geneva (Korea also accepts 1968 Vienna IDPs since 1 January 2002)"
    },
    "sources": [
      {
        "url": "https://www.safedriving.or.kr/guide/rerGuide07View.do?menuCode=MN-PO-1117",
        "statedDate": null
      },
      {
        "url": "https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=668&ccfNo=2&cciNo=2&cnpClsNo=1",
        "statedDate": "2026-08-31"
      },
      {
        "url": "https://www.safedriving.or.kr/guide/larGuide011.do?menuCode=MN-PO-1211",
        "statedDate": null
      },
      {
        "url": "https://www.safedriving.or.kr/guide/larGuide031.do?menuCode=MN-PO-1213",
        "statedDate": "2026-04-06"
      },
      {
        "url": "https://www.safedriving.or.kr/guide/larGuide051.do",
        "statedDate": null
      }
    ],
    "uncertain": [
      "Full list of 국내면허 인정국가 (countries whose licenses exchange with only a physical) not retrieved; only the examples named on the page are given. Some US states are listed, and a secondary summary also named Ohio and Kentucky.",
      "Driving school (운전전문학원) cost unregulated, not recorded.",
      "Novice-driver (초보운전자) penalties and the accompanying-driver requirements for road practice not confirmed from an official page.",
      "Traffic safety education fee not stated (recorded as 0).",
      "Validity of an exchanged license not stated on the exchange page; assumed to follow normal renewal rules."
    ]
  },
  "mx-cmx": {
    "authority": "Secretaría de Movilidad de la Ciudad de México (SEMOVI), Dirección General de Licencias y Operación del Transporte Vehicular; fees set by the Secretaría de Administración y Finanzas (Código Fiscal CDMX)",
    "name": "Licencia para conducir Tipo A",
    "minAge": {
      "full": 18,
      "learner": 15,
      "note": "Tipo A is for adults (18+). Minors 15-17 can hold a 'Permiso de Conducir con Vigencia Única' (fee MXN 587 on the Finanzas fee list). There’s no learner/graduated stage for adults: an adult goes straight to a Tipo A license."
    },
    "steps": [
      {
        "step": "knowledge test",
        "fee": null,
        "currency": "MXN",
        "note": "For the Licencia Permanente, applicants who never held a CDMX Tipo A must pass an online theory exam (20 questions drawn from a bank of 200+, pass mark 8.0) at examenlicperm.cdmx.gob.mx. On 21 Sept 2026 SEMOVI guidelines published in the Gaceta Oficial made a knowledge evaluation AND a practical 'pericia' (driving) evaluation mandatory for all license types incl. Tipo A, run by CONOCER-accredited certifiers and SEMOVI-authorised Centros Evaluadores; start date, pass mark, manoeuvres and evaluation cost not yet announced as of 2026-09-24 press reports."
      },
      {
        "step": "road test",
        "fee": null,
        "currency": "MXN",
        "note": "Newly required under the 21 Sept 2026 Gaceta lineamientos (car licenses previously had no driving test in CDMX; motorcycle A1/A2 already required CONOCER EC1331 certification incl. a pericia test since 31 July). Evaluation fee set by each certifying body; not yet published."
      },
      {
        "step": "license issue (Tipo A, 3 years)",
        "fee": 1142,
        "currency": "MXN",
        "note": "Finanzas CDMX concept 'Licencia A vehículos particulares por 3 años (expedición, reposición y renovación)'. Page shows no year/date."
      },
      {
        "step": "license issue (Tipo A Permanente)",
        "fee": 1500,
        "currency": "MXN",
        "note": "Permanent (no-expiry) license reinstated in 2026; requires INE/passport, CURP, proof of CDMX address <3 months old, no unpaid serious traffic fines, Llave CDMX account. Fee of MXN 1,500 is from press reports; the Finanzas concept list shows 'Licencia A Permanente' without a price. Press reports say it’s available only until 31 Dec 2026."
      }
    ],
    "validityYears": 3,
    "renewalFee": 1142,
    "renewalNote": "Tipo A: 3 years, renewal same fee as issue (MXN 1,142). Tipo A Permanente: no expiry, no renewal (reportedly obtainable only until end of 2026).",
    "graduated": {
      "exists": false,
      "mainRestriction": null,
      "lengthForAdults": null,
      "note": "No probationary stage for adults. Only the minors' permiso (15-17) functions as a restricted stage."
    },
    "visitor": {
      "days": null,
      "languages": "any",
      "confirmed": false
    },
    "foreign": {
      "visitor": "Not verified from an official source: tourists are generally permitted to drive in CDMX on their valid home license; no official SEMOVI statement on duration or IDP/translation requirement could be fetched (SEMOVI sites refused connections).",
      "newResident": "Not verified: residents are expected to hold a CDMX (or other Mexican state) license; foreigners apply with residence card as ID. No exchange/reciprocity list is published by SEMOVI; post-21-Sept-2026 applicants face the new knowledge + practical evaluations."
    },
    "idp": {
      "issuer": "Asociación Mexicana Automovilística (AMA) (not SEMOVI)",
      "fee": null,
      "currency": "MXN",
      "validity": null,
      "convention": null
    },
    "sources": [
      {
        "url": "https://data.finanzas.cdmx.gob.mx/formato_lc/conceptos/licencias",
        "statedDate": null
      },
      {
        "url": "https://www.semovi.cdmx.gob.mx/tramites-y-servicios/vehiculos-particulares/licencia-permanente-preguntas-frecuentes/emision-licencia-primera-vez",
        "statedDate": null
      },
      {
        "url": "https://examenlicperm.cdmx.gob.mx/",
        "statedDate": null
      },
      {
        "url": "https://www.semovi.cdmx.gob.mx/tramites-y-servicios/vehiculos-particulares/motocicleta/licencia/centros-evaluadores",
        "statedDate": null
      },
      {
        "url": "https://es-us.noticias.yahoo.com/licencia-manejo-cdmx-tendr%C3%A1s-aprobar-190217717.html",
        "statedDate": "2026-09-24 (reports Gaceta Oficial lineamientos of 2026-09-21; secondary source)"
      },
      {
        "url": "https://www.infobae.com/mexico/2026/08/05/licencia-de-conducir-permanente-cdmx-2026-cuanto-cuesta-tramitar-el-permiso-durante-agosto/",
        "statedDate": "2026-08-05 (secondary source for MXN 1,500)"
      }
    ],
    "uncertain": [
      "SEMOVI / CDMX government sites (semovi.cdmx.gob.mx, licenciapermanente.cdmx.gob.mx, jefaturadegobierno.cdmx.gob.mx) refused connections; permanent-license fee (MXN 1,500) and end-2026 deadline come from press reports, not a fetched official page.",
      "Finanzas fee list (MXN 1,142 Tipo A; 587 permiso menores) shows no year; 2026 Ley de Ingresos article not confirmed.",
      "Effective start date, cost, pass mark and content of the mandatory practical test under the 2026-09-21 Gaceta lineamientos not yet published.",
      "Foreign visitor/new-resident rules and IDP issuer fee/validity/convention for Mexico not confirmed from official source."
    ]
  },
  "au-nsw": {
    "authority": "Transport for NSW (policy) / Service NSW (transactions)",
    "name": "NSW Driver Licence, Class C (car): Learner (L), Provisional P1 (red), Provisional P2 (green), Unrestricted",
    "minAge": {
      "full": 20,
      "learner": 16,
      "note": "Earliest unrestricted: 16 + 12 months L + 12 months P1 + 24 months P2 = 20. Adults 25+ still pass through P1 (12 months) and P2 (24 months) but have no logbook or minimum L tenure."
    },
    "steps": [
      {
        "step": "knowledge test",
        "fee": 58,
        "currency": "AUD",
        "note": "Driver Knowledge Test (DKT). Online DKT: $58 for unlimited attempts, paid when applying for the license; in person $58 per attempt."
      },
      {
        "step": "eye test",
        "fee": null,
        "currency": "AUD",
        "note": "Eyesight test at the service center when getting L, P1 and unrestricted; no separate fee listed."
      },
      {
        "step": "learner permit",
        "fee": 32,
        "currency": "AUD",
        "note": "Learner license valid 5 years. Conditions: L plates, licensed supervisor beside, max 90 km/h, zero alcohol, no phone. Under 25: 120 logbook hours incl. 20 at night (bonus hours via instructor lessons and Safer Drivers Course), hold L at least 10 months before HPT and 12 months before driving test. 25+: no logbook, no minimum L period."
      },
      {
        "step": "hazard perception test",
        "fee": 58,
        "currency": "AUD",
        "note": "Per attempt; taken before the driving test."
      },
      {
        "step": "road test",
        "fee": 72,
        "currency": "AUD",
        "note": "Driving test, per attempt (inc GST)."
      },
      {
        "step": "probationary license (P1)",
        "fee": 74,
        "currency": "AUD",
        "note": "Held at least 12 months. Max 90 km/h, zero alcohol, no phone use at all, P plates, prohibited high-performance vehicles; under 25: max one passenger under 21 between 11pm and 5am."
      },
      {
        "step": "probationary license (P2)",
        "fee": 115,
        "currency": "AUD",
        "note": "Held at least 24 months; progression to unrestricted no longer needs a test (DQT abolished), eyesight test only."
      },
      {
        "step": "unrestricted license",
        "fee": 234,
        "currency": "AUD",
        "note": "5-year fee shown; 1 yr $74, 3 yr $172, 10 yr $434 (10-year only for ages 21-44)."
      }
    ],
    "validityYears": 5,
    "renewalFee": 234,
    "renewalNote": "Unrestricted license renewed for 1 yr ($74), 3 yr ($172), 5 yr ($234) or 10 yr ($434, ages 21-44). Fees effective 1 July 2026.",
    "graduated": {
      "exists": true,
      "mainRestriction": "P1: 90 km/h max, zero alcohol, no phone, under-25 night passenger limit; P2: probationary conditions incl. zero alcohol and no handheld phone",
      "lengthForAdults": "3 years (12 months P1 + 24 months P2); L stage has no minimum for 25+",
      "note": "Applies to all new drivers regardless of age."
    },
    "visitor": {
      "days": 180,
      "languages": [
        "en"
      ],
      "confirmed": true
    },
    "foreign": {
      "visitor": "Temporary overseas visitors may drive on a current overseas license for up to 6 months (visitors who arrived on/after 1 July 2023 and stay longer must get a NSW license within 6 months). A non-English license must be carried with an English translation or an International Driving Permit. New Zealand and interstate license holders: up to 3 months.",
      "newResident": "Australian permanent residents must get a NSW license within 3 months of arrival. Holders of a current (or expired <5 years), non-learner car license from a recognized country get a NSW license without knowledge or driving tests. Recognized list (car/rider): Austria, Belgium, Bosnia and Herzegovina, Canada (any province), Croatia, Denmark, Finland, France, Germany, Greece, Guernsey, Ireland, Isle of Man, Italy, Japan, Jersey, Luxembourg, Malta, Netherlands, New Zealand, Norway, Portugal, Singapore, Spain, Sweden, Switzerland, United Kingdom, United States (any state). Others (e.g. China; Hong Kong SAR from 1 Feb 2026) must pass the DKT and driving test. Experienced (25+) holders from some further countries (e.g. Poland, South Korea) reportedly have exemptions."
    },
    "idp": {
      "issuer": "NRMA (for NSW license holders; on behalf of the Australian Automobile Association)",
      "fee": 64.4,
      "currency": "AUD",
      "validity": "12 months or until the Australian license expires, whichever first",
      "convention": "1949"
    },
    "sources": [
      {
        "url": "https://www.nsw.gov.au/driving-boating-and-transport/driver-and-rider-licences/fees",
        "statedDate": "2026-07-01 (fees effective 1 July 2026)"
      },
      {
        "url": "https://www.nsw.gov.au/driving-boating-and-transport/driving-nsw/driver-and-rider-licences/driver-licences/getting-your-driver-licence",
        "statedDate": null
      },
      {
        "url": "https://www.nsw.gov.au/driving-boating-and-transport/driving-nsw/driver-and-rider-licences/driver-licences/learner-driver-licence",
        "statedDate": null
      },
      {
        "url": "https://www.nsw.gov.au/driving-boating-and-transport/driver-and-rider-licences/driver-licences/provisional-p1-licence",
        "statedDate": null
      },
      {
        "url": "https://www.nsw.gov.au/driving-boating-and-transport/driver-and-rider-licences/visiting-or-moving-to-nsw/visiting-from-overseas-or-interstate",
        "statedDate": null
      },
      {
        "url": "https://www.nsw.gov.au/driving-boating-and-transport/driver-and-rider-licences/visiting-or-moving-to-nsw/moving-your-overseas-licence/knowledge-and-driving-test-exemptions",
        "statedDate": null
      },
      {
        "url": "https://www.mynrma.com.au/travel/international-driving-permits",
        "statedDate": null
      }
    ],
    "uncertain": [
      "Overseas license conversion fee not listed separately on the fees page (the license fee for the class issued presumably applies).",
      "Second tier of recognized countries (experienced drivers 25+, e.g. Poland, South Korea) appeared in search snippet only; the exemptions page as fetched listed only the all-ages group.",
      "NRMA IDP fee ($64.40) is from a search snippet ('from $64.40'); NRMA page itself not fetched.",
      "P2 conditions detail (e.g. 100 km/h cap) not fetched from official page."
    ]
  },
  "br": {
    "authority": "SENATRAN / CONTRAN (national rules under the Código de Trânsito Brasileiro); issued by state DETRANs (fees here: DETRAN-SP)",
    "name": "Carteira Nacional de Habilitação (CNH), categoria B; first issued as Permissão para Dirigir (PPD)",
    "minAge": {
      "full": 19,
      "learner": 18,
      "note": "Must be 18, literate, with CPF and ID. Licença de Aprendizagem (LADV) only from 18. PPD valid 1 year; definitive CNH at earliest 19."
    },
    "steps": [
      {
        "step": "course",
        "fee": 0,
        "currency": "BRL",
        "note": "Resolução CONTRAN 1.020 of 1 Dec 2025 (in force nationwide Dec 2025): theory course free online/in person via the CNH do Brasil app; driving school (autoescola) no longer mandatory."
      },
      {
        "step": "medical exam",
        "fee": 90,
        "currency": "BRL",
        "note": "DETRAN-SP CNH Paulista price, paid to the clinic. An older DETRAN-SP page showed R$122.17."
      },
      {
        "step": "psychological evaluation",
        "fee": 90,
        "currency": "BRL",
        "note": "DETRAN-SP CNH Paulista price. An older DETRAN-SP page showed R$142.53."
      },
      {
        "step": "toxicology test",
        "fee": null,
        "currency": "BRL",
        "note": "For first-license processes opened from 17 June 2026, a negative toxicology result is required before CNH issue (DETRAN-SP); price set by Senatran-accredited lab."
      },
      {
        "step": "knowledge test",
        "fee": 52.83,
        "currency": "BRL",
        "note": "Theory exam: 30 questions, pass 20 (lowered from 21), 60 minutes. Resolution 1.020 makes the first retake free (implementation varies by state)."
      },
      {
        "step": "learner permit",
        "fee": null,
        "currency": "BRL",
        "note": "LADV issued after theory pass, for practical lessons."
      },
      {
        "step": "practical lessons",
        "fee": null,
        "currency": "BRL",
        "note": "Minimum cut from 20 hours to 2 hours; may use own car, an autoescola or a DETRAN-credentialed autonomous instructor. Price set by provider."
      },
      {
        "step": "road test",
        "fee": 52.83,
        "currency": "BRL",
        "note": "Practical exam, scheduled directly by the candidate in SP."
      },
      {
        "step": "probationary license",
        "fee": 137.79,
        "currency": "BRL",
        "note": "Permissão para Dirigir. Digital CNH free after passing; R$137.79 is for the physical card (DETRAN-SP)."
      }
    ],
    "validityYears": 10,
    "renewalFee": null,
    "renewalNote": "CNH validity by age (CTB art. 147 as amended by Lei 14.071/2020): 10 years under 50, 5 years 50-69, 3 years 70+. Since 9 Jan 2026 (MP 1.327 of 10 Dec 2025, later converted to law, sanctioned June 2026) drivers in the Registro Nacional Positivo de Condutores with no infractions in the last 12 months are renewed automatically, free, without exams; 50+ get only one automatic renewal; 70+ excluded. DETRAN-SP paid renewal fee not confirmed.",
    "graduated": {
      "exists": true,
      "mainRestriction": "Permissão para Dirigir: definitive CNH only if, during the 1 year, the driver commits no serious (grave) or very serious (gravíssima) infraction and doesn’t repeat a medium (média) one; otherwise restarts the process.",
      "lengthForAdults": "1 year",
      "note": "Applies to all first-time drivers regardless of age."
    },
    "visitor": {
      "days": 180,
      "languages": "always",
      "confirmed": true
    },
    "foreign": {
      "visitor": "A foreign driver may drive for up to 180 days from entry, within the license's validity, if covered by a convention ratified by Brazil or reciprocity. Must carry the foreign license, an IDP where the license is from a 1968 Vienna Convention party, ID, and proof of entry date (Resolução CONTRAN 1.020/2025 governs, replacing Res. 360/2010).",
      "newResident": "After 180 days of regular stay, must obtain a Brazilian CNH at the state DETRAN: medical (physical/mental) exam and psychological evaluation are required. Holders from countries with mutual-recognition agreements (e.g. Spain, Italy, Mozambique) exchange their license for a CNH; others from convention/reciprocity countries are 'habilitados' after exams; non-reciprocal countries must take the full process."
    },
    "idp": {
      "issuer": "DETRAN of the holder's state (Permissão Internacional para Dirigir, PID)",
      "fee": 422.62,
      "currency": "BRL",
      "validity": "Up to 3 years, never beyond the CNH's own expiry",
      "convention": "1968"
    },
    "sources": [
      {
        "url": "https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/Resolucao10202025.pdf",
        "statedDate": "2025-12-01"
      },
      {
        "url": "https://www.detran.pr.gov.br/Pagina/Informacoes-sobre-mudancas-no-processo-de-habilitacao-Resolucao-Contran-10202025",
        "statedDate": null
      },
      {
        "url": "https://detran.sp.gov.br/cnhpaulista/",
        "statedDate": null
      },
      {
        "url": "https://www.detran.sp.gov.br/detransp/pb/servico/habilitacao/_iniciar_processo_primeira_habilitacao?id=carta_de_servico_iniciar_processo_primeira_habilitacao",
        "statedDate": null
      },
      {
        "url": "https://www.gov.br/transportes/pt-br/assuntos/noticias/2025/12/governo-do-brasil-publica-medida-provisoria-que-garante-beneficios-aos-bons-motoristas",
        "statedDate": "2025-12"
      },
      {
        "url": "https://www.gov.br/secom/pt-br/acompanhe-a-secom/noticias/2026/01/governo-do-brasil-anuncia-renovacao-automatica-para-bom-condutor-valendo-a-partir-desta-sexta-9",
        "statedDate": "2026-01"
      },
      {
        "url": "https://www.gov.br/planalto/pt-br/acompanhe-o-planalto/noticias/2026/06/presidente-lula-sanciona-lei-que-moderniza-a-emissao-da-cnh-e-garante-renovacao-automatica-a-bons-condutores",
        "statedDate": "2026-06"
      },
      {
        "url": "https://www.poupatempo.sp.gov.br/carta/9D7A4B1A-F6A6-465B-90BF-40CE3D4C7A45",
        "statedDate": null
      },
      {
        "url": "https://servicos.sp.gov.br/fcarta/91833900-1b04-426b-8cfb-e6d6d96dd21e",
        "statedDate": null
      }
    ],
    "uncertain": [
      "Medical/psych fees conflict: CNH Paulista page R$90 each vs another DETRAN-SP page R$122.17 / R$142.53; used R$90 (CNH Paulista).",
      "Law number and exact text of the June 2026 law converting MP 1.327 not fetched (page behind CAPTCHA).",
      "Validity tiers (10/5/3 years) from CTB art. 147 / Lei 14.071/2020, not re-fetched this session.",
      "DETRAN-SP paid renewal fee (for drivers not eligible for automatic renewal) not found.",
      "PID fee R$422.62 from search snippet; other figures (R$418.22, R$399.96) also seen from older pages.",
      "Foreign-license exchange fee in SP not found; full reciprocity country list not fetched.",
      "Toxicology requirement for category B first licenses (from 17 June 2026) from DETRAN-SP snippet; lab price unknown."
    ]
  },
  "nz": {
    "authority": "NZ Transport Agency Waka Kotahi (NZTA)",
    "name": "Class 1 (car) driver licence: learner, restricted, full",
    "minAge": {
      "full": 18,
      "learner": 16,
      "note": "Current system (until 24 Jan 2027): 16 + 6 months learner + 18 months restricted = 18 (17.5 with approved advanced course). Adults 25+: 6 months learner + 6 months restricted (3 with course)."
    },
    "steps": [
      {
        "step": "learner permit",
        "fee": 96.1,
        "currency": "NZD",
        "note": "Learner license application fee includes the theory test (2 attempts); 3rd and later attempts $54.60 each. Supervisor required, L plates."
      },
      {
        "step": "knowledge test",
        "fee": null,
        "currency": "NZD",
        "note": "Theory test included in learner application fee."
      },
      {
        "step": "eye test",
        "fee": null,
        "currency": "NZD",
        "note": "Eyesight check at each license stage; no separate NZTA fee (the requirement for full license ends 25 Jan 2027)."
      },
      {
        "step": "road test",
        "fee": 167.5,
        "currency": "NZD",
        "note": "Restricted license application incl. restricted practical test (2 attempts); 3rd+ $102.80 each. Minimum 6 months on learner (all ages). From 25 Jan 2027: under-25 learner period rises to 12 months (6 with approved course/logged hours), 25+ stays 6 months; hazard perception moves into restricted test; fee $160.50."
      },
      {
        "step": "probationary license",
        "fee": null,
        "currency": "NZD",
        "note": "Restricted license: may drive alone 5am-10pm; no passengers unless supervisor present (exceptions for spouse/dependants); zero alcohol for under-20. Under 25: 18 months (12 with approved advanced course); 25+: 6 months (3 with course). From 25 Jan 2027: 12 months, no course reduction."
      },
      {
        "step": "full license test",
        "fee": 98.9,
        "currency": "NZD",
        "note": "Full license application incl. full practical test (2 attempts); 3rd+ $71.90 each. From 25 Jan 2027: no full test or eyesight check, fee $25.90."
      }
    ],
    "validityYears": 10,
    "renewalFee": 32.4,
    "renewalNote": "Most licenses issued for 10 years at $32.40. Seniors renew at 75, 80 and every 2 years after with medical certificate.",
    "graduated": {
      "exists": true,
      "mainRestriction": "Restricted: no driving 10pm-5am and no passengers unless a supervisor is in the front seat",
      "lengthForAdults": "25+: 6 months learner + 6 months restricted (3 with approved course); under 25: 6 months learner + 18 months restricted",
      "note": "Graduated Driver Licensing System reform takes effect 25 Jan 2027 (full test removed, restricted 12 months, under-25 learner 12 months)."
    },
    "visitor": {
      "days": 548,
      "languages": [
        "en"
      ],
      "confirmed": true
    },
    "foreign": {
      "visitor": "May drive on a current overseas license (or one expired <12 months, not suspended) for up to 18 months from last entry; this reduces to 12 months from 1 November 2026. Non-English licenses need an accurate English translation (from an NZTA-approved translator) or an IDP.",
      "newResident": "Must convert to an NZ license before the overseas-license period (18 months, 12 from 1 Nov 2026) ends, at a specialist overseas-conversion agent (AA/VTNZ/VTNZ-type agents). Holders from exempt countries who have held the license 2+ years convert without theory or practical tests (application fee $52.10); held <2 years: practical test required. Exempt countries per NZTA: Australia, Austria, Belgium, Canada, Croatia, Denmark, Finland, France, Germany, Greece, Hong Kong, Ireland, Italy, Japan, Luxembourg, Netherlands, Norway, Portugal, South Africa, South Korea, Sweden, Switzerland, United Kingdom, United States. Non-exempt countries: must pass theory and practical tests (included in the conversion application fee)."
    },
    "idp": {
      "issuer": "AA New Zealand (only issuer for NZ license holders)",
      "fee": 49.5,
      "currency": "NZD",
      "validity": "12 months from issue (or until NZ license expires/suspended)",
      "convention": "1949"
    },
    "sources": [
      {
        "url": "https://www.nzta.govt.nz/driver-licences/licensing-fees/licence-fees",
        "statedDate": null
      },
      {
        "url": "https://www.nzta.govt.nz/driver-licences/licensing-fees/test-fees",
        "statedDate": null
      },
      {
        "url": "https://www.nzta.govt.nz/driver-licences/getting-a-licence/proposed-changes-to-graduated-driver-licensing",
        "statedDate": "changes effective 2027-01-25"
      },
      {
        "url": "https://www.nzta.govt.nz/driver-licences/getting-a-licence/licences-by-vehicle-type/cars/restricted-licence-2/restricted-licence-conditions/",
        "statedDate": null
      },
      {
        "url": "https://www.nzta.govt.nz/driver-licences/licensing-fees/renewal-fees",
        "statedDate": null
      },
      {
        "url": "https://www.nzta.govt.nz/driver-licences/new-residents-and-visitors/driving-on-nz-roads/time-limit-extended-for-driving-on-an-overseas-licence",
        "statedDate": "reduction to 12 months effective 2026-11-01"
      },
      {
        "url": "https://www.nzta.govt.nz/driver-licences/new-residents-and-visitors/converting-to-nz-driver-licence/converting-a-car-licence/converting-a-car-licence-from-an-exempt-country",
        "statedDate": null
      },
      {
        "url": "https://www.nzta.govt.nz/assets/resources/factsheets/72/docs/72-overseas-driver-licence.pdf",
        "statedDate": null
      },
      {
        "url": "https://www.aa.co.nz/drivers/driver-licences/driving-permits-for-driving-overseas/",
        "statedDate": null
      }
    ],
    "uncertain": [
      "nzta.govt.nz blocks automated fetch (Incapsula); all NZ figures come from search-result extracts of NZTA pages, not direct page reads, so page 'last updated' dates are unknown.",
      "Exempt-country list from search extract; Singapore's status not confirmed; NZTA doesn’t use 'category A/B' terms on the pages seen.",
      "Non-exempt-country conversion fee not found.",
      "Restricted period for 25+ (6 months / 3 with course) and under-25 18 months stated from NZTA reform page extracts; direct confirmation not fetched.",
      "AA IDP convention (1949) and NSW/NZ convention membership not verified from an official page."
    ]
  },
  "lv": {
    "authority": "CSDD (Ceļu satiksmes drošības direkcija / Road Traffic Safety Directorate)",
    "name": "Vadītāja apliecība, B kategorija",
    "minAge": {
      "full": 18,
      "learner": 16,
      "note": "Learner driver's permit for category B from 16 (valid 3 years, Latvia only); training trips with an instructor or a lay trainer with 3+ years' experience in the category. License from 18."
    },
    "steps": [
      {
        "step": "eye test",
        "fee": null,
        "currency": "EUR",
        "note": "Medical fitness certificate required (fee set by the medical provider; not stated on fetched pages)."
      },
      {
        "step": "course",
        "fee": null,
        "currency": "EUR",
        "note": "Training at a driving school is mandatory; prices set by schools."
      },
      {
        "step": "learner permit",
        "fee": null,
        "currency": "EUR",
        "note": "Learner driver's permit from age 16, valid 3 years, usable only in Latvia."
      },
      {
        "step": "knowledge test",
        "fee": null,
        "currency": "EUR",
        "note": "CSDD theory exam. Reported as EUR 11.40 in 2026 by a secondary source (credit24.lv); official CSDD price page unreachable. Driving exam must be passed within 1 year of the theory exam."
      },
      {
        "step": "road test",
        "fee": null,
        "currency": "EUR",
        "note": "CSDD driving exam; fee not confirmed."
      },
      {
        "step": "probationary license",
        "fee": null,
        "currency": "EUR",
        "note": "License issue reported as EUR 22.41 in 2026 by a secondary source; not confirmed on an official page."
      }
    ],
    "validityYears": 10,
    "renewalFee": null,
    "renewalNote": "Category B licenses are valid 10 years (CSDD). Renewal fee not confirmed (secondary sources give EUR 22.41 for issue/exchange/replacement). CSDD prices were reported as changing from 1 March 2026.",
    "graduated": {
      "exists": true,
      "mainRestriction": "Novice drivers with under 2 years' experience: blood alcohol limit 0.2 per mille (versus 0.5 for others).",
      "lengthForAdults": "2 years",
      "note": "A 2-year first license (issued for 2 years, then exchanged for a 10-year license) was expected but couldn’t be confirmed on any CSDD page reached; CSDD search snippets state only a 10-year validity for B."
    },
    "visitor": {
      "days": 365,
      "languages": "latin",
      "confirmed": true
    },
    "foreign": {
      "visitor": "May drive on a foreign license while staying under 1 year; a license not in Latin characters needs a notarised Latvian translation.",
      "newResident": "Licenses from EU member states, EFTA states and the United Kingdom need not be exchanged. Holders of other foreign licenses staying more than 1 year must exchange for a Latvian license (10-year B), which requires passing the CSDD driving exam (in Latvian, Russian or English) plus passport, current license and medical certificate; failing to exchange risks a EUR 40 fine. For Russia, Belarus, USA, Canada, New Zealand, Azerbaijan, Uzbekistan, UAE, Egypt and Turkey, the holder must supply an apostilled/legalised confirmation of the license from the issuing authority."
    },
    "idp": {
      "issuer": "CSDD",
      "fee": 19.84,
      "currency": "EUR",
      "validity": null,
      "convention": "1968 (Vienna)",
      "note": "Valid only together with the Latvian license; issued in 2-3 working days. Fee from a CSDD search snippet."
    },
    "sources": [
      {
        "url": "https://www.csdd.lv/en/driving-licence-for-vehicle-b/general-information",
        "statedDate": null
      },
      {
        "url": "https://www.csdd.lv/en/learner-drivers-permit/obtaining-a-learners-drivers-permit",
        "statedDate": null
      },
      {
        "url": "https://www.csdd.lv/en/learner-drivers-permit/use-of-a-learners-driver-permit",
        "statedDate": null
      },
      {
        "url": "https://www.csdd.lv/viegla-automobila-vaditaja-aplieciba-b/maksajumi",
        "statedDate": "prices referenced to 24.09.2013 and Cabinet Regulation No. 1000 (per search snippet)"
      },
      {
        "url": "https://www.csdd.lv/en/useful-information/for-drivers-in-latvia",
        "statedDate": null
      },
      {
        "url": "https://www.csdd.lv/en/exchange-of-driver-s-license/exchange-of-a-license-issued-abroad",
        "statedDate": null
      },
      {
        "url": "https://www.csdd.lv/en/use-of-foreign-driving-licence/general-information",
        "statedDate": null
      },
      {
        "url": "https://www.csdd.lv/en/international-driving-permit-idp/payments",
        "statedDate": null
      },
      {
        "url": "https://livelatvia.lv/living-in-latvia/live/transport/drivers-licence/",
        "statedDate": null
      },
      {
        "url": "https://www.credit24.lv/blog/vaditaja-aplieciba-cena",
        "statedDate": "2026 (secondary source)"
      }
    ],
    "uncertain": [
      "csdd.lv refused connections (ECONNREFUSED) from this environment; all CSDD facts come from search-result snippets of csdd.lv pages, not the pages read directly.",
      "All Latvian licensing fees (theory exam, driving exam, license issue, renewal, exchange) unconfirmed on an official page; CSDD tariffs reportedly changed 1 March 2026.",
      "Whether Latvia still issues the first B license for 2 years before a 10-year license, and what conditions govern that exchange.",
      "Whether any non-EU/EFTA countries (e.g. via bilateral agreements) exchange without the driving exam, and whether a theory exam is also required for some.",
      "Accompanied-driving at 17 with a private mentor and its exact conditions.",
      "IDP validity period (1968-convention permits are commonly 3 years) not stated on reached snippets."
    ]
  }
};
