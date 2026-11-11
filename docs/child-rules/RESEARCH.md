# Child Performer Rules: Research Log

What was read for each jurisdiction, and what it said. `src/engine/minors.ts` encodes the rules from this log. A rule
the log doesn't have isn't encoded as if it were read. Begun November 11, 2026, when the owner asked for child
performers "across the whole map".

Status per jurisdiction:
- **Read**: the figures come from the official text or the regulator's own page.
- **Partly read**: some figures come from the official text, and the rest are marked as from a secondary source.
- **Not read**: no rules are encoded. The game uses the nearest read set and says so.

The engine records each set's status (`read` in `src/engine/minors.ts`), and `tests/minors.test.ts` fails if it and the
headings below disagree.

## Dates, Ages And Gaps (November 11, 2026)

What every set has in common, and what isn't known.

- **Which version.** Each set is the text as read on November 11, 2026 (`RULES_READ`). When it took effect, and the
  latest change found, are in the table below. The game applies it to every year it can be played in, from 2026: no set
  is known to have changed after January 1, 2026, and none is known to change later. The player is told the date they
  were read, and that later changes aren't known.

When each set took effect, and the latest change found (read November 11, 2026). `tests/minors.test.ts` fails if a set
the engine has is missing here, or its latest change is in 2026 or later.

| Set | In force from | Latest change found | Where it was found |
| --- | --- | --- | --- |
| England (GB-ENG) | 2015-02-06 | 2015-02-06 | legislation.gov.uk; its changes database lists no amendment to SI 2014/3309. |
| Scotland (GB-SCT) | 2015-02-20 | 2015-02-20 | legislation.gov.uk; no amendment listed to SSI 2014/372. |
| Wales (GB-WLS) | 2015-10-30 | 2015-10-30 | legislation.gov.uk; no amendment listed to WSI 2015/1757. |
| Northern Ireland (GB-NIR) | 1996-11-04 | 1996-11-04 | Regulation 1; no amendment listed to SR 1996/481, whose revised text legislation.gov.uk doesn't publish. |
| California (US-CA) | 1986-04-03 | 2014-01-01 | 8 CCR §11760's history note (Cornell's copy): last amended, filed March 4, 1986, in effect 30 days later. Family Code §6752's 15% from Stats. 1999, ch. 940, amended in 2003 and 2013 (a secondary source; leginfo's history note sits behind a bot check and wasn't read); the 2013 change taken as in effect January 1, 2014. |
| New York (US-NY) | 2013-04-01 | 2013-04-01 | The Department of Labor's summary. Its PDF of Part 186 is marked "08/24"; what, if anything, changed then wasn't read. |
| Georgia (US-GA) | 2018-01-03 | 2018-01-03 | The Department of Labor's notice of the new Rule 300-7-1. |
| British Columbia (CA-BC) | 1995-11-01 | 2024-07-16 | B.C. Reg. 396/95; the 25% set-aside added by B.C. Reg. 191/2024 (Gazette, July 16, 2024). The regulation's later amendments (to April 1, 2026) weren't read for Part 7.1. |
| Ontario (CA-ON) | 2016-02-05 | 2021-04-19 | e-Laws' versions (above, in Ontario's section). |
| Ireland (IE) | 1997 | 2005 | The Protection of Young Persons (Employment) Act 1996; the licence note's date. |
| Germany (DE) | 1976-05-01 | 2024-10-23 | gesetze-im-internet.de: text from May 1, 1976, last amended by Art. 53 of the Act of October 23, 2024; whether that touched § 6 wasn't read. |
| France (FR) | 2025-03-21 | 2025-03-21 | The industry agreement's signing date. |
| India (IN) | 2017-06-02 | 2017-06-02 | G.S.R. 543(E), which added Rule 2C; the NCPCR guidelines restate it. Later amendments to Rule 2C weren't looked for. |
| Japan (JP) | 1947 | 2025-06-01 | e-Gov's revisions: Articles 56, 60 and 61 are the same in every revision from June 1, 2025 (the earliest compared) to December 23, 2028. Articles 57 and 58 (certificates, guardians) change on that date; the game doesn't model them. |
| Texas (US-TX) | 1993-09-01 | 2024-12-30 | Labor Code §§ 51.011 to 51.013 from September 1, 1993; 40 TAC § 817.33 from January 12, 1998; § 817.31 last amended effective December 30, 2024 (Cornell's copy of the Register note). |
| New Mexico (US-NM) | 2008-06-30 | 2017-11-14 | 11.1.4 NMAC's history notes: adopted June 30, 2008; the current sections in effect November 14, 2017. |
| Quebec (CA-QC) | 1999 | 2025 | LégisQuébec's notes: ss. 84.2 to 84.7 from 1997 and 1999, amended by L.Q. 2023, c. 11; the regulation's s. 35.0.3 last amended by Decree 577-2025. |
| Spain (ES) | 2015-10-24 | 2015-10-24 | The Workers' Statute recast (Royal Legislative Decree 2/2015); Article 6 as consolidated on BOE. The set ends on May 24, 2027. |
| Spain from 2027 (ES-2027) | 2027-05-25 | 2026-07-25 | Royal Decree 607/2026, published July 25, 2026 and in force ten months later (final provision 2). The engine applies it from May 25, 2027. |
| Italy (IT) | 1967 | 2006-07-05 | Normattiva: Article 4 in force from July 5, 2006; Articles 15, 17 and 18 from October 23, 1999; the law's last update March 14, 2016. |
| Brazil (BR) | 1990-07-13 | 2000-12-19 | ECA Articles 67 and 149 as enacted; CLT Article 403 as worded by Law 10.097 of December 19, 2000; Articles 404 to 413 from 1943 and 1967. |
| New Zealand (NZ) | 2020-08-01 | 2024-08-10 | Education and Training Act 2020, s. 54, with no amendment noted; the Health and Safety at Work (General Risk and Workplace Management) Regulations 2016 as at August 10, 2024, reg. 48 with none noted. |
| Mexico (MX) | 1970-05-01 | 2015-06-12 | The Chamber of Deputies' text (last reform May 14, 2026): Articles 174, 175, 175 Bis, 178 and 180 were last reformed on June 12, 2015, and Article 177 carries no reform note. |
| South Korea (KR) | 2014-07-29 | 2025-09-26 | law.go.kr: Act No. 12349 of January 28, 2014, in force six months later; the version read is in force from September 26, 2025, and Articles 22 and 23 carry no amendment marks. |
| New South Wales (AU-NSW) | 2022-09-01 | 2025-11-12 | The Children's Guardian (Amendment) Regulation (No 2) 2022 moved child employment into the Children's Guardian Regulation 2022; the Code of Practice page was last updated November 12, 2025. |
- **Ages.** A child is a year older on their birthday, the same day everywhere in the game: for their age, for which age
  band applies, and for the rules' adult age. A band "over" an age (Germany's over 3) starts the day after that birthday.
  Until November 11, 2026 the bands counted 365.25-day years, so a band could change a day before or after the birthday.
- **Adult ages taken as a birthday.** England's regulations last until the end of compulsory school age, which ends on
  the last Friday in June of the school year a child turns 16. The game ends them on the 16th birthday.
- **School days.** Typical term dates by country (summer and winter breaks, weekends and public holidays), not a school
  calendar.

Gaps in each set, as found when it was read:

| Set | What wasn't read, or what the game decided |
| --- | --- |
| England | Nothing recorded. Scotland, Wales and Northern Ireland had used England's until November 11, 2026, when their own were read. |
| Scotland | Nothing recorded. |
| Wales | Nothing recorded. |
| Northern Ireland | legislation.gov.uk has only the text as made in 1996, so amendments since weren't checked. No general overnight rest: the game uses the 14 hours the latest and earliest times leave. Its bands, its 5 days in 7, and its earliest and latest times are encoded only as hours and days; times of day aren't modelled for any set. |
| California | Nothing recorded. |
| New York | The number of children per teacher; the game uses California's ten. A parent may be the responsible person; the game hires a chaperone. |
| Georgia | A processing time for certification; the game allows two days. A 15% blocked trust was proposed (HB 968, HB 418), not found enacted. |
| British Columbia | Nothing recorded. |
| Ontario | Nothing recorded. Until November 11, 2026 the Act was read as passed, and the game allowed 4 hours under 2; the consolidated text, read that day, has 8 at every age since 2017. |
| Ireland | The licence conditions read are a PDF dated 2005; whether a later version exists wasn't checked. |
| Germany | The authority's time to approve and the time at the workplace; the game allows 14 days and twice the work hours. |
| France | Hours: the commissions' indicative hours weren't read, so England's stand in, and the game says so. The ratio of supervisors; the game has one per 5. The share set aside is set child by child, so none is recorded. |
| New South Wales | The authority's processing time; the game allows 7 days. A supervisor ratio from 3; the game has one per 5. |
| India | Rule 2C itself wasn't read: its figures are from the NCPCR guidelines, which cite it rule by rule. The District Magistrate's time to permit; the game allows 7 days. No rest between days is set; the game uses 12. The 27 consecutive days and the six-month permit aren't modelled. |
| Japan | The Inspection Office's time to permit; the game allows 14 days. A school day taken as 6 hours of school. The weekly 40 hours aren't modelled. |
| Texas | A certified tutor is required past two consecutive school days (40 TAC § 817.33(9)); the game doesn't count consecutive days, so hires none. The Commission's processing time; the game allows 7 days, though the authorization lasts until the child is 14. The weekly 48 hours taken as 6 days. The hardship exemption at 14 and 15 isn't modelled. |
| New Mexico | The trust's $1,000 is on the contract; the game counts earnings on the production. The time to issue the certificate; the game allows 7 days. Teaching is from 6 in the rules and from 5 in the game. |
| Quebec | The 17 hours a week and 10 from Monday to Friday taken as 2 on a school day and 7 on a day without; the limit lifts in a break of more than seven days, which the game doesn't model. No rest between days; the game uses 12. Collective agreements (UDA, AQTIS) aren't law and weren't read. |
| Spain | Until May 25, 2027: the hours are a case-by-case authorisation in law, so the 2026 decree's stand in. From then: weekly hours taken as days of the daily hours, and the longer weeks out of term not modelled. The authority's time for a first authorisation; the game allows 21 days. Night work at 12 to 15 ends at 11 p.m. or midnight; the game treats a night scene as one night. |
| Italy | DPR 365/1994, which sets the authorisation's procedure, wasn't read; the game allows 14 days. Ministerial Decree 218/2006 (children under 14 in television) wasn't read. |
| Brazil | Under 16 the judge sets the conditions case by case; England's hours stand in. The time to obtain the authorisation; the game allows 30 days. |
| New Zealand | No hours are set for child performers; New South Wales's stand in, with its 4-hour cap on a school day standing for the ban on work in school hours. No approved code of practice for night work in screen production was found. |
| Mexico | Under 15: no hours, night limit or day off are set, as the activity isn't work in law; the 15-year-old's stand in, and the game says so. The time to arrange the agreement or certificate; the game allows 7 days. No rest between days; the game uses 12. |
| South Korea | The weekly hours taken as 5 days; the extra hour by agreement from 15, and work to midnight before a school holiday under 15, aren't modelled. The youth protection officer (Article 21-2) is one of the producer's staff, so no one is hired. No rest between days from 15; the game uses 8 at every age. |
| Every other place | No rules read: the nearest read set stands in, and the game says so (`docs/child-rules/COVERAGE.md`). |

## England (GB-ENG): read

- **Source:** The Children (Performances and Activities) (England) Regulations 2014, SI 2014/3309, Parts 2 to 5,
  legislation.gov.uk.
- **Hours (reg 22, Table 2):**
  - under 5: 5 hours at the place, 2 performing;
  - 5 to 8: 8 at the place, 3 performing;
  - 9 to school leaving age: 9.5 at the place, 5 performing.
- **Times (reg 21):** 07:00 to 22:00 under 5; 07:00 to 23:00 from 5.
- **Rest:** 12 hours overnight (reg 24). At most 6 consecutive days (reg 26).
- **Chaperone:** up to 12 children each, 3 if the chaperone is the private teacher (reg 15(3)). Not needed when a parent
  cares for the child (reg 15(2)).
- **Tuition:** at least 3 hours each school day; at most 6 children per teacher, or 12 at a similar standard (reg 13).
- **Licence:** may be refused if applied for less than 21 days before (reg 4(2)).

## Scotland (GB-SCT): read

- **Source:** The Children (Performances and Activities) (Scotland) Regulations 2014, SSI 2014/372, legislation.gov.uk.
  In force February 20, 2015.
- **Hours (regs 19 to 21):**
  - under 5: 5 hours at the place, 2 performing, between 08:00 and 20:00;
  - 5 to 8: 8 at the place, 3 performing, between 07:00 and 23:00;
  - 9 and over: 9.5 at the place, 4 performing, between 07:00 and 23:00.
- **Rest:** 12 hours overnight (reg 22). At most 6 consecutive days (reg 26); 14 days' break after 8 weeks (reg 27).
- **Chaperone:** up to 10 children each, 3 if the chaperone is the private teacher (reg 14(2)).
- **Tuition:** 3 hours each school day, or for film and broadcast 6 hours a week with at most 5 on a day; a teacher has at
  most 5 other children, or 11 at a similar standard (reg 12).
- **Licence:** may be refused if applied for less than 21 days before (reg 4(2)).
- **Earnings:** the authority may set conditions (reg 13); no share is fixed.

## Wales (GB-WLS): read

- **Source:** The Children (Performances and Activities) (Wales) Regulations 2015, WSI 2015/1757, legislation.gov.uk. In
  force October 30, 2015.
- **Hours:** under 5, 5 hours at the place and 2 performing, 07:00 to 22:00; 5 to 8, 8 and 3; 9 and over, 9.5 and 5,
  07:00 to 23:00. England's figures.
- **Rest:** 12 hours overnight (reg 26). At most 6 consecutive days (reg 28).
- **Chaperone:** up to 12 children each, 3 if the chaperone is the private teacher (reg 17(3)).
- **Tuition:** 3 hours each school day, or 6 a week with at most 5 on a day; at most 6 children per teacher, 12 at a
  similar standard (reg 15).
- **Licence:** may be refused if applied for less than 21 days before (reg 4(2)).
- **Earnings:** at the authority's discretion (reg 16); no share is fixed.

## Northern Ireland (GB-NIR): read

- **Source:** The Children (Public Performances) Regulations (Northern Ireland) 1996, SR 1996/481, legislation.gov.uk,
  Parts II, IV and VI (film and broadcast). Only the text as made is published there.
- **Hours (regs 29 to 31):**
  - under 5: 5 hours at the place, 2 performing, at most 30 minutes at a time, 09:30 to 16:30;
  - 5 to 12: 7.5 at the place, 3 performing, at most 45 minutes at a time, 09:00 to 16:30 (17:00 at 10 and over);
  - 13 and over: 8 at the place, 3.5 performing, at most an hour at a time, 09:00 to 19:00.
- **Days:** at most 5 in any 7 (reg 27). 14 days' break after 8 weeks at the maximum (reg 18).
- **Late work:** only for an outdoor scene, with the board's permission; 16 hours before the next performance
  (reg 32).
- **Matron (chaperone):** at most 11 other children, 2 if the matron is the private teacher (reg 14).
- **Tuition:** 3 hours each school day, or 6 a week with at most 5 on a day; a teacher has at most 5 other children, or
  11 at a similar standard (reg 12).
- **Licence:** the application reaches the authority 30 days before the first performance (reg 3(3)).
- **Earnings:** the authority may require them dealt with as it approves (reg 13); no share is fixed.

## India (IN): read

- **Source:** the National Commission for Protection of Child Rights' "Guidelines for Child and Adolescent Participation
  in the Entertainment Industry or any Commercial Entertainment Activity" (the copy on mib.gov.in), which cite Rule 2C
  of the Child and Adolescent Labour (Prohibition and Regulation) Rules, 1988, added by the Amendment Rules, 2017
  (G.S.R. 543(E), June 2, 2017), and the Act's s. 3(2)(b). Read November 11, 2026. The Ministry's letter of December
  2021 to private satellite channels (mib.gov.in) quotes Rule 2C(b).
- **Ages:** a child is under 14; an adolescent 14 to 17.
- **Permission (Rule 2C(b)):** the District Magistrate's permission before the activity, with an undertaking (Form C),
  the list of children, the parents' consent and the person responsible for their safety. Valid six months.
- **Hours (Rule 2C):** no more than five hours a day, and no more than three without rest. An adolescent works periods of
  at most three hours with an hour's rest. Either way, no more than six hours at the place, rest and waiting included.
  No overtime; at least a day off a week. No more than 27 consecutive days (Rule 2C(d)).
- **Infants:** under three months, only in programmes promoting breastfeeding or immunisation.
- **Responsible person:** one for at most five children.
- **Education:** the producer arranges it so the child's lessons go on; no hours are set.
- **Earnings (Rule 2C(f)):** at least 20% of the child's income from the production in a fixed deposit in their name at
  a nationalised bank, theirs at majority. Extras and background artists are exempt.

## Japan (JP): read

- **Source:** the Labour Standards Act (Act No. 49 of 1947), Articles 34, 56, 57, 60 and 61, from e-Gov's law data
  (laws.e-gov.go.jp), read November 11, 2026 in each revision from June 1, 2025 to December 23, 2028.
- **Who (Article 56):** a child until the March 31 after their 15th birthday. They may work only with the government
  office's permission, outside school hours, in light work; in film production and theatre at any age.
- **Documents (Article 57(2)):** the head teacher's certificate that school won't suffer, and a parent's or guardian's
  consent.
- **Hours (Article 60(2)):** 7 hours a day and 40 a week, school hours counted in.
- **Night (Article 61(5)):** for such children, none from 8 p.m. to 5 a.m. (which the Minister may move to 9 p.m. to 6
  a.m.). There is no permission for night work.
- **Breaks (Article 34):** 45 minutes when a day's work passes 6 hours.
- **Not required:** a chaperone or teacher on set, or any share of pay set aside.

## Texas, United States (US-TX): read

- **Source:** Texas Labor Code §§ 51.002, 51.011 to 51.013 (statutes.capitol.texas.gov, read in a browser) and 40 TAC
  §§ 817.31 and 817.33 (Cornell's copy of the Texas Administrative Code), read November 11, 2026.
- **Who:** a child is under 18 (§ 51.002), but the limits are for children under 16. Under 14, employment is unlawful
  (§ 51.011) except as performers the Commission authorizes (§ 51.012).
- **Authorization (§ 817.31):** a parent applies, with proof of age and a photograph; valid until the child is 14.
- **Under 14 (§ 817.33):** within the hours § 51.013 sets at 14 and 15, or outside them with a parent's consent and 12
  hours off before returning, never past 8 hours a day or 48 a week; a parent or guardian present, within sight and
  sound; a certified tutor past two consecutive school days; no lost class credit.
- **14 and 15 (§ 51.013):** 8 hours a day, 48 a week; none from 10 p.m. to 5 a.m. before a school day, or from midnight
  to 5 a.m. otherwise; a hardship exemption may lift it.
- **Not found:** any share of pay set aside.

## New Mexico, United States (US-NM): read

- **Source:** 11.1.4.10 to 11.1.4.13 NMAC (Cornell's copy of the New Mexico Administrative Code), read November 11, 2026.
- **Certificate (11.1.4.10):** the employer obtains the Department of Workforce Solutions' pre-authorization
  certificate for any performer under 18 before work starts. A parent or guardian signs off, and is within eyesight
  and earshot at all times except while a teacher is teaching.
- **Teacher (11.1.4.11, 11.1.4.12(A)):** a certified teacher for each 10 performers aged 6 to 17 when school is in session.
- **Hours (11.1.4.12):** at the place, and work:
  - 15 days to 6 months: 2 and 20 minutes, a physician's certificate;
  - 7 months to 2: 4 and 2;
  - 3 to 5: 6 and 3;
  - 6 to 8: 8 and 4 (6 without school);
  - 9 to 15: 9 and 5 (7 without school);
  - 16 to 18: 10 and 6 (8 without school).
- **Times (11.1.4.12(B)):** not before 5 a.m., or after 10 p.m. before a school day or midnight otherwise; the Department
  may waive the limits in advance. 12 hours' rest after the workday (11.1.4.12(J)).
- **Trust (11.1.4.13):** on a contract of $1,000 or more, at least 15% of gross earnings into a trust until 18.

## Quebec, Canada (CA-QC): read

- **Source:** the Act respecting labour standards (CQLR c. N-1.1), ss. 84.2 to 84.7, current to October 15, 2026, and
  the Regulation respecting labour standards (c. N-1.1, r. 3), ss. 35.0.3 to 35.2, current to July 1, 2026, on
  LégisQuébec, read November 11, 2026 in a browser.
- **Under 14 (s. 84.3, r. 3 s. 35.0.3(1)):** may work as a creator or performer in film, with a parent's written consent
  on the CNESST's form, stating the most hours a week and when the child is free.
- **School (ss. 84.4, 84.5):** a child who must attend school works outside class hours, at most 17 hours a week and 10
  from Monday to Friday, except in a break of more than seven days.
- **Night (ss. 84.6, 84.7):** none from 11 p.m. to 6 a.m., and home between them; neither applies to performers (r. 3,
  ss. 35.1 and 35.2).
- **Not required:** a permit, a chaperone, a teacher, or any share of pay set aside.

## Spain (ES): partly read

- **Source:** the Workers' Statute (Royal Legislative Decree 2/2015), Article 6, consolidated on BOE (last update
  October 21, 2026), read November 11, 2026. Royal Decree 1435/1985, which it works with, wasn't read.
- **Under 16 (Article 6.4):** no work, except performing in public shows in exceptional cases, by the labour authority's
  written authorisation for the specific performances, if neither health nor education suffers. No hours are set.
- **Under 18 (Articles 6.2, 6.3):** no night work and no overtime.
- **What stands in:** the hours Royal Decree 607/2026 sets (below), as the law sets none until it takes effect.

## Spain from May 25, 2027 (ES-2027): read

- **Source:** Royal Decree 607/2026 of July 22, 2026 on the special employment relationship of artists (BOE July 25,
  2026), Article 11 and final provision 2, read on BOE November 11, 2026. It replaces Royal Decree 1435/1985 entirely.
- **In force:** ten months after publication: May 25, 2027.
- **Authorisation (11(3)):** the labour authority's, before work starts, for each production, with its days, hours and
  places; asked for by the company with the parents' authorisation and, from 12, the child's consent. Extensions:
  15 working days' notice, and 15 working days for the authority to decide.
- **Hours (11(2)(c)), preparation included:**
  - up to 2 months: none;
  - to 1: 2 a day, 4 a week;
  - to 3: 3 a day, 6 a week;
  - to 6: 4 a day, 10 a week;
  - to 12: 5 a day, 15 a week (25 out of term);
  - to 16: 6 a day, 24 a week (30 out of term);
  - a break of at least 30 minutes.
- **Night (11(2)(d), 11(4)(b)):** none, except by authorisation: 12 to 14 until 11 p.m. (midnight out of term), 15 to 17
  until midnight; at most three nights a week, each followed by 16 hours' rest.
- **Present (11(2)(b)):** a relative to the second degree, or someone the company names with the parents' agreement.
- **Content (11(2)(f)):** nothing sexually explicit under 18; no violent scenes under 7.

## Italy (IT): read

- **Source:** Law 977 of October 17, 1967 (protection of the work of children and adolescents), Articles 1, 4, 15, 17,
  18 and 20, as in force November 11, 2026 on Normattiva, read in a browser.
- **Who (Article 1):** a child (bambino) is under 15 or still in compulsory schooling; an adolescent is 15 to 17 and
  out of it.
- **Authorisation (Article 4(2)):** the labour inspectorate may authorise a child's work in entertainment, with the
  parents' written consent, if safety, development and school attendance don't suffer, under DPR 365/1994.
- **Hours (Article 18):** a child free of school obligations, 7 a day and 35 a week; an adolescent, 8 and 40.
- **Night (Articles 15, 17):** none, but a performer may work until midnight, then 14 consecutive hours' rest.

## Brazil (BR): partly read

- **Source:** the Child and Adolescent Statute (Law 8.069/1990), Articles 67 and 149, and the Consolidation of Labour
  Laws (Decree-Law 5.452/1943), Articles 403 to 406 and 411 to 413, the updated texts on the Chamber of Deputies' site
  (camara.leg.br), read November 11, 2026. The Presidency's site refused the request.
- **Under 16 (CLT 403; ECA 149):** no work, except taking part in public shows by a judge's authorisation (alvará),
  case by case, with no general rules (149 §2).
- **Under 18:** no night work, 10 p.m. to 5 a.m. (CLT 404, ECA 67); 11 hours between workdays (CLT 412); the general
  working day, without overtime (CLT 411, 413); hours that allow school (CLT 403).
- **What stands in:** England's hours under 16, as the judge sets them case by case.

## New Zealand (NZ): partly read

- **Source:** the Education and Training Act 2020, s. 54 (version as at October 1, 2026), and the Health and Safety at
  Work (General Risk and Workplace Management) Regulations 2016, reg. 48 (as at August 10, 2024), on
  legislation.govt.nz, read in a browser November 11, 2026. MBIE's page on hiring young people (updated May 5, 2026)
  points to both.
- **Under 16:** not in school hours, or in a way that interferes with school (s. 54); not from 10 p.m. to 6 a.m., unless
  under an approved code of practice (reg. 48).
- **Not set:** hours, a permit, a chaperone, or any share of pay set aside.
- **What stands in:** New South Wales's hours and days a week.

## Mexico (MX): partly read

- **Source:** the Ley Federal del Trabajo, Articles 61, 173 to 180 and 175 Bis, the Chamber of Deputies' text
  (diputados.gob.mx, last reform DOF May 14, 2026), read November 11, 2026.
- **Under 15 (Article 175 Bis):** artistic performance under the supervision, care and responsibility of a parent or
  guardian isn't work, if: a written agreement with the parent's express consent; it doesn't interfere with education,
  rest or recreation, or risk health; and the pay is no less than a 15-to-17-year-old's wage. No hours are set.
- **15 to 17:** a medical certificate of fitness (Article 174). Under 16, at most 6 hours a day, in periods of at most 3
  with an hour's rest between (Article 177). No overtime, Sundays or rest days (Article 178); 18 days' paid holiday
  (Article 179); work arranged around school (Article 180(III)).
- **Night (Article 175(I)):** under 18, none after 10 p.m.
- **What stands in:** under 15, the hours, night limit and day off set at 15, as the law sets none.

## South Korea (KR): read

- **Source:** the Popular Culture and Arts Industry Development Act (대중문화예술산업발전법), Articles 2, 21, 21-2, 22 and
  23, the version in force from September 26, 2025 (Act No. 20833), on law.go.kr, read November 11, 2026.
- **Who (Article 2(10)):** a youth is under 19, until the January 1 of the year they turn 19.
- **Under 15 (Article 22):** at most 35 hours a week. No work from 10 p.m. to 6 a.m., except until midnight when the next
  day is a school holiday, with the consent of the performer and a parent.
- **15 and over (Article 23):** at most 40 hours a week, and by agreement an hour a day more, up to 6 a week. Night work
  (10 p.m. to 6 a.m.) only with the consent of the performer and a parent.
- **Rights (Article 21):** the contract must protect health, learning, sleep and rest; no pressure to miss school.
- **Youth protection officer (Article 21-2, added January 31, 2025):** designated from the producer's staff.
- **Not required:** a permit, a teacher, or any share of pay set aside.

## California (US-CA): read

- **Source:** 8 CCR §11760 and §11755.2 (dir.ca.gov); Family Code §6752; the Entertainment Work Permit pages.
- **Hours at the place / work:**

  | Age | At the place | Work | Work without school |
  | --- | --- | --- | --- |
  | 15 days to 6 months | 2 | 20 min | 20 min |
  | 6 months to 2 | 4 | 2 | 2 |
  | 2 to 5 | 6 | 3 | 3 |
  | 6 to 8 | 8 | 4 | 6 |
  | 9 to 15 | 9 | 5 | 7 |
  | 16 and 17 | 10 | 6 | 8 |

- **Rest:** 12 hours between dismissal and call.
- **Studio teacher:** on every call under 16, one per 10 on school days, 20 otherwise.
- **Nurse:** under 6 months.
- **Set-aside:** 15% of gross, deposited within 15 business days.

## New York (US-NY): read

- **Source:** the Department of Labor's chart LS 559 (09/18), its text extracted from the PDF; 12 NYCRR Part 186; the
  Department's pages on employers' duties.
- **Hours (non-live):**
  - 15 days to 5 months: 2 on set, 20 minutes of work;
  - 6 months to 1 year: 4 and 2;
  - 2 to 5: 6 and 3;
  - 6 to 8: 8 and 4 (6 without school);
  - 9 to 15: 9 and 5 (7);
  - 16 and 17: 10 and 6 (9).
- **Times:** not before 05:00; until 22:00 before school days and 00:30 otherwise.
- **Rest:** 12 hours between workdays.
- **Instruction:** an average of 3 hours a school day.
- **Set-aside:** 15% to a trust account.
- **Permit:** a Child Performer Permit, and the employer's notice of use 2 business days ahead.

## Georgia (US-GA): read

- **Source:** the Georgia Department of Labor's Rules, Chapter 300-7-1 (Child Labor: Minors in Entertainment), and its
  form "Schedule of Hours of Performance" (dol.georgia.gov, PDFs), read November 11, 2026.
- **Who (rule .02):** a minor is anyone under 18. No infant under 15 days may work (rule .03(1)(e)).
- **Certification (rules .03, .05, .06, .08):**
  - the production company holds a Department certification;
  - each minor holds a minor certification, valid for the calendar year;
  - each location is approved for 60 days.
  - No processing time is given. Earlier or later hours need a written request 24 hours ahead (rule .03(4)).
- **The Schedule:**

  | Age | At the location | Work | Latest |
  | --- | --- | --- | --- |
  | 15 days to 6 months | 2 consecutive hours, in set windows | 20 minutes | 8 p.m. |
  | 6 months to 2 | 4 | 2 | 10 p.m. |
  | 2 to 6 | 6 | 3 | 10 p.m. |
  | 6 to 9 | 8 | 4, or 6 when tutoring isn't required | 10 p.m. |
  | 9 to 16 | 10 | 5, or 7 when tutoring isn't required | 10 p.m. before school, midnight otherwise |
  | 16 to 18 | 12 | 8, or 10 when tutoring isn't required | midnight before school, 2 a.m. otherwise |

- **All minors:**
  - no start before 5 a.m.;
  - no more than six consecutive days;
  - the minor's representative (a parent or guardian) present at all times.
- **Infants (Schedule (c)):** a Child Labor Coordinator, a child care provider and a nurse for every 3 infants under 6
  weeks, and every 10 from 6 weeks to 6 months.
- **Child Labor Coordinator (rule .04):** retained by the production, at the location whenever minors are, one per ten
  minors.
- **Education (rule .09):** a studio teacher from the first day when a minor works more than one school day in a school
  week; three hours of instruction a school day from 4 to 18; one teacher per ten minors.
- **Rest (rule .03(5)):** 12 hours between dismissal and the next call or school, from 4 to 18, when working during
  school hours.
- **Trust:** none enacted that was found. Bills HB 968 (2023–24) and HB 418 (2025–26) proposed a 15% blocked trust;
  neither was found to have passed.
- **How the game reads it:**
  - Work hours from the Schedule, with the extra two hours on days without school.
  - The Child Labor Coordinator is the game's chaperone, one per ten minors under 18.
  - A studio teacher per ten on school days.
  - A nurse under 6 months.
  - Two days to arrange certification.
  - No trust set-aside.
  - Not modelled: the infant time windows, the six-day limit (the game never works Sundays), and banked instruction hours.

## British Columbia, Canada (CA-BC): read

- **Source:** the BC government's page on Employment Standards Regulation, Part 7.1, Division 2 (children under 15 in
  recorded entertainment), www2.gov.bc.ca, read November 11, 2026.
- **Ages:** the Division covers children under 15 (s. 45.5(2)). No one under 15 days old may be employed (s. 45.7).
- **Hours (s. 45.8(2)):** a shift ends no later than 8 hours after the child reports (under 12), or 10 hours (12 to under
  15). The director may approve longer in writing.
- **Times (s. 45.8(3)–(4)):** not before 05:00. When school is in session, until 22:00 before a school day and 00:30
  otherwise; when it isn't, until 02:00.
- **Camera time and breaks (s. 45.10):** at most this long in front of the camera at a stretch, then a break:

  | Age | In front of the camera (minutes) | Break (minutes) |
  | --- | --- | --- |
  | under 3 | 15 | 20 |
  | 3 to under 6 | 30 | 15 |
  | 6 to under 12 | 45 | 10 |
  | 12 to under 15 | 60 | 10 |

- **Rest (s. 45.11):** 12 hours between shifts and before school. 48 hours free each week.
- **Days (s. 45.12):** at most 5 days a week without the director's approval.
- **Chaperone (s. 45.13):** a chaperone on set, who may be a parent of 19 or over. One child each from 15 days to
  under 6; three each from 6 to under 12; five each from 12 to under 15.
- **Teaching:** no tutoring requirement in the Division.
- **Set-aside (s. 45.14):** on earnings over $2,000 on a production, 25% of the excess to the Public Guardian and
  Trustee.
- **How the game reads it:**
  - Work hours are the hours at work, less the breaks the camera table requires: the share of time a child can be in
    front of the camera, 15/35, 30/45, 45/55 and 60/70.
  - There is no licence; the game asks for a day to arrange consent and the hire.

## Ontario, Canada (CA-ON): read

- **Source:** the Protecting Child Performers Act, 2015, S.O. 2015, c. 2, consolidated on e-Laws (ontario.ca/laws),
  current to November 6, 2026, read November 11, 2026 in a browser, as the page renders only by script. Bill 17's Royal
  Assent text (ola.org) had been read first that day. Part II of the ministry's Child Performers Guideline (ontario.ca)
  was read for chaperones.
- **Versions:** passed May 5, 2015; e-Laws versions from February 5, 2016, March 22, 2017 and April 19, 2021. Amended by
  S.O. 2017, c. 2, Sched. 13 (hours, camera breaks, meals, parents' travel costs, chaperones for children under 3) and
  S.O. 2021, c. 4, Sched. 11, s. 29 (wording: parent or guardian). What changed on February 5, 2016 wasn't read; it is
  taken as the Act's coming into force.
- **Ages:** a child performer is under 18 (s. 1). No one under 15 days in recorded entertainment (s. 10).
- **Hours (s. 11(1), as amended in 2017):** at most 8 hours of work a day, at every age. (As passed in 2015: 4 under 2,
  and 8 from 2.) Tutoring counts; unpaid meal breaks, of at
  most an hour each (s. 13), don't (s. 11(6)). Unionised performers of 12 to 15 may work 2 hours' overtime, and 16 and
  17 four (s. 11(2)–(3)).
- **Late calls (s. 11(4)):** no call later than 7 p.m. without 48 hours' notice.
- **Rest (s. 11(5)):** 12 consecutive hours free each day, and 48 consecutive hours each week.
- **Camera time (s. 12):** at most 15 minutes then 20 off under 3; 30 and 15 to 6; 45 and 10 to 12; 60 and 10 to 16; 60
  and 5 at 16 and 17.
- **Split shifts (s. 13):** none.
- **Tutoring (s. 7):** time in the schedule for children of compulsory school age to be tutored, under regulations that
  weren't read.
- **Chaperone (s. 14):** under 16, a parent, guardian or authorised chaperone present at the workplace and accessible at
  all times. Children under 3 with the same parent have one each (s. 14(2), as amended in 2017).
- **Trust (s. 8(1)):** "if a child performer earns more than $2,000 on a production or project, the employer shall remit
  25 per cent of those earnings" to be held in trust until they are 18. A union's agreement may instead hold 25% of
  lifetime earnings over $5,000 (s. 8(2)).
- **How the game reads it:**
  - Work hours are the hours of work less the camera breaks, as British Columbia's: 3.4 under 3, 5.3 from 3, 6.5 from 6,
    6.9 from 12, 7.4 at 16 and 17. (1.7 under 2 until November 11, 2026, from the Act as passed.)
  - The weekly 48 hours free leave at most 5 working days.
  - A chaperone hired for each child under 16, as a parent can't be assumed free.
  - No tutor is hired, as the Act asks for time, not a teacher.
  - Night work: two days' notice. The non-union trust rule: 25% of all the child's earnings on the production, from the
    payment that takes them past $2,000.
  - Not modelled: union overtime.

## Ireland (IE): read

- **Source:** the Workplace Relations Commission's "Note on employing a child by licence under Section 3(2)", Film/TV
  licence (workplacerelations.ie, PDF dated 2005), under the Protection of Young Persons (Employment) Act 1996, read
  November 11, 2026.
- **Licence:** the Minister may license, case by case, a child up to 16 in cultural, artistic, sports or advertising
  work. Apply in writing at least 21 days before the employment begins, with the child's details, the parent's consent,
  the amount of night work, the sums to be earned, and the school's agreement to any absence.
- **Conditions which may apply:**

  | Age | At the place of employment | Not before / after | Hours a year | Performing or rehearsing |
  | --- | --- | --- | --- | --- |
  | under 7 | 5 hours | 09:30 / 16:30 | 250 | 30 minutes at a stretch, 2 hours a day |
  | 7 to under 13 | 7.5 hours | 09:00 / 17:00 | 700 | 45 minutes at a stretch, 3 hours a day |
  | over 13 | 8 hours | 09:00 / 19:00 | 900 | 1 hour at a stretch, 4 hours a day |

- **Night work (4):** after the latest hour only where the performance must take place then.
- **Breaks and days (5):** an hour's meal break and 15 minutes' rest for each 3.5 hours; at most 5 days in any 7 (or 6,
  if no more than 20 in 28).
- **Chaperone (6):** a suitably qualified chaperone in charge at all times, unless a parent or guardian is; no more than
  twelve children each.
- **Education (7):** alternative teaching where work means more than a week away from school.
- **Nudity (8(2)):** only with the parent's express permission, with a qualified nurse or social worker present.
- **Earnings (9):** sums earned are lodged in a post office or bank account in the child's name.
- **How the game reads it:**
  - Work hours 2, 3 and 4 by age; at the place 5, 7.5 and 8; 5 days a week.
  - A chaperone per 12 children; no tutor, as no hours are set.
  - The licence 21 days ahead, night work with it.
  - The note sets no rest between days, so England's 12 hours stand in.
  - No trust set-aside: the earnings are the child's, in their own account.
  - Not modelled: the hours of the day, the yearly hours, the sixth day in some weeks.

## Germany (DE): read

- **Source:** Jugendarbeitsschutzgesetz (JArbSchG), §§ 2, 5, 6 and 8, gesetze-im-internet.de, read November 11, 2026.
- **Ages (§ 2):** a child is under 15; a young person is 15 to 17. A young person still in full-time compulsory schooling
  is treated as a child.
- **Children (§ 5):** may not be employed. § 6 allows exceptions for performances, approved by the supervisory
  authority on application.
- **Film, TV and recordings (§ 6(1)2):**
  - children over 3 up to 6: up to 2 hours a day, between 08:00 and 17:00;
  - children over 6: up to 3 hours a day, between 08:00 and 22:00.
  - Children of 3 and under can't be approved.
- **Conditions of the approval (§ 6(2)):**
  - written parental consent;
  - a medical certificate no older than three months;
  - protection against danger;
  - care and supervision assured;
  - at least 14 hours uninterrupted free time after work;
  - school progress not impaired.
- **The authority decides (§ 6(3)–(4)):**
  - how long and when the child works, the breaks, and the most time at the workplace;
  - the employer may employ the child only after receiving the written approval.
- **Young people of 15 to 17 (§ 8):** at most 8 hours a day and 40 a week.
- **How the game reads it:**
  - Work hours: 2 (over 3 to 6) and 3 (over 6 to 14). Young people of 15 to 17 have 8, and those still in compulsory
    schooling are taken as children, so the game uses children's hours until 16.
  - Time at the workplace is set by the authority; the game uses twice the work hours.
  - A supervisor is required with no ratio set; the game has one per child under 6, then one per 3.
  - The law sets no lead time for the approval; the game allows 14 days.
  - There is no trust set-aside.

## France (FR): partly read

- **Source:** the audiovisual production industry's agreement on employing minors (*Accord relatif à l'emploi des mineurs*,
  signed March 21, 2025, afar-fiction.com), which restates the Code du travail and the collective agreement.
- **Authorisation (art. 3):**
  - Employing anyone under 16 needs prior, individual, named authorisation from the prefect, after the opinion of the
    children's commission (*commission des enfants du spectacle*).
  - The prefect has one month from a complete file to decide, and no answer means refusal.
  - Children over 13 must agree in writing.
  - A medical examination is required first (art. 3.3).
- **Hours (art. 4.1):**
  - Actors' hours fall under the Code's rules for young workers (L. 3161-1 and following).
  - The commission judges the proposed hours.
  - Some commissions set indicative hours by age; those weren't read.
- **Night work (art. 4.1):** forbidden for young workers. Where a role requires it, the labour inspectorate's specific
  prior authorisation (L. 3163-1, L. 3163-2, R. 7124-30-1).
- **Pay (art. 4.3):** the parents keep a share the commission sets; the rest goes to the Caisse des dépôts et
  consignations until the child comes of age (L. 7124-9).
- **Supervision (art. 5.2):** a qualified children's supervisor (*responsable des enfants*) is required whenever anyone
  under 16 is engaged.
- **How the game reads it:**
  - A licence with 30 days to arrange, and the same for night work.
  - A children's supervisor (the game's chaperone) for anyone under 16, one per production day, with no ratio set; the
    game has one per 5.
  - The commission sets hours child by child. With no indicative hours read, the game uses England's hours by age as the
    nearest read set, and says so.
  - No fixed set-aside percentage: the share is set child by child, so the game records none.

## New South Wales, Australia (AU-NSW): read

- **Source:** the Office of the Children's Guardian's page "Requirements for different aged children" (employing
  children in acting and modelling), ocg.nsw.gov.au, read November 11, 2026.
- **Entertainment and exhibition (film, TV, radio, photography, modelling):**

  | Age | Days a week | Hours | Hours of work a day | On set, breaks included |
  | --- | --- | --- | --- | --- |
  | under 6 months | 1 | 06:00 to 18:00 | 4 | 4 |
  | 6 months to under 3 | 2 | 06:00 to 18:00 | 4 | 4 |
  | 3 to under 8 | 4 | 06:00 to 23:00 | 6 | 7 |
  | 8 to under 16 | 5 | 06:00 to 23:00 | 8 | 9 |

- **Breaks:** a one-hour rest break every four hours, which doesn't count toward the maximum.
- **School days:** at most 4 hours of work on a day the child attends or receives schooling. No later than 21:00 before
  school. At most 50 hours of work and schooling in a week.
- **Supervision:** under 3, a registered nurse or midwife as well as a parent, parent nominee or supervisor.
- **Babies under 12 weeks:**
  - specific permission (a variation) before any work;
  - a nurse's report 2 to 3 days before;
  - born full term and at least 3 kg.
- **Authority:** the employer needs the Children's Guardian's authority to employ children. The page gives no
  processing time.
- **How the game reads it:**
  - Work hours from the table, capped at 4 on a school day.
  - Days a week per age.
  - A nurse under 3.
  - A supervisor: the page sets none from 3; the game has the production hire one per 5, as children on set must be
    supervised.
  - The authority: the game allows 7 days to arrange it, and 3 days for a baby's nurse report.
  - No trust set-aside is stated on the page.
