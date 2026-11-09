# Awards And Festivals: Engine Design (November 9, 2026)

Developer record for how the expanded catalog (`tools/awards/build.py` → `src/data/institutions.json`) is played.
Written before the engine work so it could resume from here, and updated as it was built.

## Category fields the build adds

| Field | Meaning |
| --- | --- |
| `kind` | `award` (nominees, one winner), `area` (one, several or no winners), `juried` (judges; one, several or none), `section` (festival selection only, never a win), `prize` (chosen among the films selected for its `parents` sections), `audience` (audience vote among `parents`, or the whole field when it has none), `partner` (an independent or partner jury among `parents`), `honorary` (no entry, no fee: chosen from a body of work) |
| `parents` | The sections a prize, audience or partner award is decided among. These have no entries of their own. |
| `recipient` | Adds `craft` (with `crafts`: the crew roles credited for that craft), `guest`, `performer` (lead or supporting), `host`, `song`, `national` (a country's committee enters it), `career` (with `career`: `film`, `television`, `producer`, `animation`, `program` or `any`) |
| `with` | Further recipient groups (`producer+director` gives both) |
| `material` | `original` or `adapted`, read from the project's declared source (new field `Project.source`) |
| `class` | `comedy` or `drama`, from the project's own "competes as" declaration. Replaces genre lists: the JSON catalog broke the reference check `cat.genres === COMEDY_MUSICAL`, so from November 8 the declaration had been ignored. |
| `family`, `episodes` | Unscripted program types and episode counts (a one-episode variety program is a special) |
| `need` | Requirements: debut, writer-debut, new (first season), runtime bounds (over-60, over-70, under-60, max-20), under-1m (budget), box-office, indie/independent, la-ny-theatrical, non-english, subjects (environment, civil-rights, social-issues, current-events, arts, food: new field `Project.subjects`), archival (archival scenes), coproduction, audiences (family, children, preschool, mature), story era (period, fantasy, contemporary), episode length (half, hour), origin (us, non-us, fr, non-fr, es, ca, non-ca, au, jp, non-jp, nl, europe, europe-non-es, iberoamerica-non-es, latin-america, asia-pacific, basque), breakthrough (a performer's first credited role) |
| `section` | The heading the player navigates by |
| `verified` | False when the roster marks the entry UNVERIFIED or the institution is blocked; the game says so in its rules note |
| `retired` | Kept only so older entries and results keep their category; closed to new entries |

## Engine rules

1. **Enterable** categories are `award`, `area`, `juried` and `section` (and any category without a kind, from older
   data). Prizes, audience and partner awards and honorary awards take no entries and no fees.
2. **Recipients** come from credits: crafts by role, guests by series involvement, songs by the composer when the
   project has original (unlicensed) songs, hosts by the unscripted host credit, national by the director. Nobody
   receives an award for a contribution they didn't make; the player is not the default recipient.
3. **Judging** a craft reads that craft's quality (`quality['craft:<role>']`, written at delivery from the credited
   person's work), falling back to the project's craft figure for projects delivered before it existed.
4. **Results** are stored only where the player is involved (an entry, or a selection in a prize's section, or an
   honorary award given to them). Public results elsewhere are computed on demand from the season's slate and the seed,
   never stored, so long careers don't carry hundreds of rival lists per edition, and reloading gives the same answer.
5. **Prizes** are decided at results among the section's selected works (the player's selected entries and the
   section's selected rivals) that meet the prize's own requirements (a debut prize only among debuts).
6. **Honorary** awards are considered at the edition's announcement from the player's career history (delivered
   projects, wins, years working), deterministically from the seed. They never cost money or create an entry.
7. **National selection** (Oscar International Feature): the entry goes to the production country's committee, which
   chooses between the player's film and the country's strongest rival film at the deadline; a qualifying festival
   award (for example TIFF's Platform Award for a non-English film) qualifies without the committee.

## Where it lives (as built, November 9, 2026)

- `src/engine/awards.ts` (startup): the catalog's types, editions and calendar, eligibility (`checkEligibility`), recipients
  (`categoryRecipients`), entry deadlines and the national committee at the deadline, the season slate, saves and
  migrations. Its event handlers for announcement, festival opening, screenings and results are one-line delegates.
- `src/engine/awards-rules.ts` and `src/engine/awards-results.ts`: loaded with the catalog, not at startup
  (`loadInstitutions`), because the work took the startup JavaScript to 705 kB against its 700 kB budget. Every game
  waits for the catalog before opening, so no handler runs without them; one that did would throw rather than skip.
  - `awards-rules.ts`: what `class`, `material`, `family`, `episodes` and `need` ask of a project, recipients for the
    new recipient kinds, and the craft and song scores.
  - `awards-results.ts`: judging, announcement, festival opening and screenings, results, prizes among a section's
    selection, honorary awards, national committees, disqualification and the shown result of a category (`publicResult`).
- Startup JavaScript after the split: 685 kB (219 kB gzipped), against 689 kB (218 kB) before the work.

## Decisions made while building

- **Shown results** (`publicResult`) are computed with the same judging streams the stored path uses, so a category you
  entered and one you didn't are decided the same way; the cache is per seed, edition, category and edition status.
- **Prize fields** are the parent sections' selected works (stored where you entered the section, otherwise computed)
  that fit the prize's formats; a season film is scored on what the prize rewards (`scores[recipient]`). Your work is a
  contender when it was selected (or nominated) in a parent, meets the prize's own requirements, and has someone credited
  to receive it. The result keeps the strongest five competing works and every winner.
- **Several winners or none** (area and juried awards, and prizes of those kinds): every work whose judged score reaches
  78 wins. The bar is a game assumption, not an organizer's figure.
- **Special mention**: a jury prize's next-ranked work, when it is yours and within three points of the winner. Modeled;
  no organizer's rule was read for it.
- **Honorary**: considered once, at the announcement, for editions announced after the life began. A career needs ten
  years and three delivered works credited to you (of the award's kind: film, television, animation, producing, or a
  declared subject such as the Stanley Kramer Award's social issues). The chance grows with works, wins, nominations and
  years against the event's prestige, at most 60 percent, drawn once from the seed. Only an honour given to you is stored.
- **National selection**: any festival prize the film won in the year before the deadline qualifies it (the design's
  TIFF Platform example generalized, because the Academy's list of qualifying festival awards wasn't read in full);
  otherwise the committee compares the film's overall quality plus season visibility with the country's strongest other
  film, drawn once per edition and country.
- **Disqualification**: an entry accepted on a planned release that was later cancelled is disqualified at the
  announcement (fee kept); a film selected for a world-premiere section that premiered elsewhere first is disqualified
  when the festival opens (it was marked withdrawn until November 9, 2026, though you hadn't withdrawn it).
- **Oscar shorts' festival route** names each listed festival's top short-film prize; FESPACO's and IDFA's prizes weren't
  read, so their sections can't qualify a short yet.
