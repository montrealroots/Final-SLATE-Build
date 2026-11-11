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

- **Which version.** Each set is the text as read on November 11, 2026 (`RULES_READ`). When each version took effect
  isn't recorded here for any set. The game applies it to every year it can be played in, from 2026, which assumes none
  of them changed during 2026 before they were read, and none changes after. The player is told the date they were read,
  and that later changes aren't known.
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
| Ontario | Amendments since the Act was passed in 2015: the consolidated text couldn't be read, so none were checked. |
| Ireland | The licence conditions read are a PDF dated 2005; whether a later version exists wasn't checked. |
| Germany | The authority's time to approve and the time at the workplace; the game allows 14 days and twice the work hours. |
| France | Hours: the commissions' indicative hours weren't read, so England's stand in, and the game says so. The ratio of supervisors; the game has one per 5. The share set aside is set child by child, so none is recorded. |
| New South Wales | The authority's processing time; the game allows 7 days. A supervisor ratio from 3; the game has one per 5. |
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

- **Source:** the Protecting Child Performers Act, 2015 as passed: Bill 17's Royal Assent text on the Legislative
  Assembly's page (ola.org), read November 11, 2026. The consolidated statute on e-Laws renders only by script and
  couldn't be read, and CanLII refused the request, so amendments since 2015, if any, weren't checked. Part II of the
  ministry's Child Performers Guideline (ontario.ca) was read for chaperones.
- **Ages:** a child performer is under 18 (s. 1). No one under 15 days in recorded entertainment (s. 10).
- **Hours (s. 11(1)):** at most 4 hours of work a day under 2, and 8 from 2. Tutoring counts; unpaid meal breaks, of at
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
  all times. Children with the same parent have one each (s. 14(2)).
- **Trust (s. 8(1)):** "if a child performer earns more than $2,000 on a production or project, the employer shall remit
  25 per cent of those earnings" to be held in trust until they are 18. A union's agreement may instead hold 25% of
  lifetime earnings over $5,000 (s. 8(2)).
- **How the game reads it:**
  - Work hours are the hours of work less the camera breaks, as British Columbia's: 1.7 under 2, 3.4 at 2, 5.3 from 3, 6.5
    from 6, 6.9 from 12, 7.4 at 16 and 17.
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
