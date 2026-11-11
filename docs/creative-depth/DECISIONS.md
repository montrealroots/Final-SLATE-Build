# Creative Depth And Living Industry: Decision Log

One log, newest milestone last. Each entry says what was decided, what it rests on, and what was turned down where that
matters later. Dates are when the decision was made.

## Milestone A (November 11, 2026)

### Owner Access

- **Local means three things, all checked.** A request is this machine's only if the connection is loopback, the Host
  header is a loopback name, and no forwarding header is present. Any one alone is spoofable or misleading: a proxy
  connects from loopback, and a hostile page can point its own name at 127.0.0.1.
  Turned down: trusting the bind address alone, which fails behind a reverse proxy on the same machine.
- **A passphrase file, not an environment variable or a built-in default.** The owner names a file outside the
  repository. Nothing in the source, the build or a log holds it. The package forbids a hardcoded shared password.
  Turned down: a per-start random token printed to the console, which the owner following the game from the app would
  never see.
- **Refuse to start rather than start unguarded.** `--owner` with a non-local address and no passphrase exits with the
  reason.
- **Sessions in memory, twelve hours, cookie `HttpOnly; Secure; SameSite=Strict`.** No session store to leak or to
  clean. The cost: remote use needs HTTPS, and a restart signs everyone out.
- **A visitor is told nothing.** Film routes answer exactly as a server with no catalog does, so the answer doesn't
  reveal that data exists behind a sign-in. The session route does say whether sign-in is offered, which the game needs
  in order to show the field.
- **`private` caching with `Vary: Cookie` for the owner's records.** They were `public` before, which let a shared
  cache serve them on.

### Frozen Profiles

- **Freeze classes, not records.** The save keeps the game's reading of a series (kind of outlet, limited or not,
  seasons aired to six) and a short-lived copy of two recorded seasons. It keeps no name. This is what the package
  means by a minimal versioned simulation profile.
- **Seasons aired is capped at six.** The rules compare it with 1, 2, 3, 5 and 6 and nothing higher, so the cap loses
  nothing and stores less.
- **The copies of recorded seasons expire.** They are deleted once the save has its own first season for the series,
  and in any case at TMDB's six months from the oldest record gathered. Source: TMDB API Terms of Use 1.C, as already
  applied to the catalog and the packs (`docs/CATALOG.md`).
  Turned down: keeping them for the life of the save, which would make a save a way to hold TMDB's records past
  their time.
- **After expiry, an undecided series waits for a catalog and reads the old season from it.** This is the one path by
  which a later catalog's record reaches an old save. Accepted, and documented, as the cost of the rule above.
- **Person IDs are kept; names are not.** An ID is a reference that means nothing without an installed catalog.
- **A recorded death still removes someone from a returning cast, read live.** A fact the game won't contradict
  outranks stability here.
- **Decisions still wait while no catalog is installed.** With a frozen profile the engine could go on alone, but the
  player couldn't see what it decided, and the frozen profile would then be doing the catalog's job after the catalog
  was withdrawn.

### Opt-In Refresh

- **Only series nothing has been decided for.** A decided series, the records' end and the studios' pace never change,
  so no simulated film or season the save has shown can move.
  Turned down: moving the records' end forward on refresh. The studios' films are worked out from the seed, the records'
  end and the pace, so moving it would replace films the save has already released.
- **A recovery copy, not an export prompt.** The save is written and copied inside the same storage the game already
  manages, and listed with the other recovery copies. One copy is kept, of the save before the latest refresh.
- **Nothing dated before today.** A refreshed series' decision is planned from the day after the refresh.

## Milestone B (November 11, 2026)

### Where The Numbers Live

- **Small registries in the engine, a large library outside it.** Makeup methods and costume sources are short typed
  lists in `looks.ts`, as shot plans and location sites already are. A save keeps their IDs. The idea library is a
  separate lazy file whose ideas point at those IDs.
  Turned down: putting each option's figures in the library and copying them into the save on Apply. A save would then
  carry the catalog, and two saves could disagree about what "full creature appliances" takes.
- **Apply calls the page's own functions.** An idea's patch is commands, and each command calls what the matching
  control calls. So there is one path, Undo works, and the existing draft approval already previews cost and days for
  a change after approval.
  Turned down: a second "brief" state that engines read. Two sources for one fact is how double charging starts.

### One Owner For Each Piece Of Work

- **A makeup method owns the look.** A character with one is not also a "creature effect". Without one, the older
  creature build stands, so earlier projects are unchanged.
- **A sourced costume leaves the shared costume task.** The rest stay on it.
- **A crowd's post work is counted once**, on the scene, in the episode's crowd-extension task.

### What Chair Time Costs

- **It comes out of the day, not the score.** A long application means a shorter shooting day unless more people apply
  it. It never changes a quality figure. The package forbids a universal bonus for an expensive preset; the same goes
  for a penalty.
- **A pre-call and a wrap allowance.** Two hours before call and thirty minutes after wrap are free, so everyday makeup
  costs no shooting time and a creature does.

### Earlier Projects Are Unchanged

- Every new rule applies only when its new field is set: a look, a crowd method, a story year. The production golden
  tests pass untouched.

### Words

- **A premise writes a logline and stakes too, and offers a cast and scenes.** The player ticks the scenes; none is
  added otherwise. The package asks for scene beats to be offered, not applied.
- **Slots, with suggestions.** A premise's names are the player's. A blank takes the suggestion, so no placeholder can
  reach a saved field.
- **The save keeps IDs, not words.** After Apply the field is what counts, and it is the player's to rewrite.

### Honest Counts

- **Notes are called notes.** A starter option with no engine behind it is a reference idea that says so, rather than
  a mechanical one with nothing reading it.
- **Combinations are reported apart from written parts.**

### The Medium Command

- **Changing how a project is made converts its parts.** On-camera parts become voice parts for animation, and back.
  Otherwise an animated project would have no castable parts.
- **Refused after approval.** People and a schedule are built on it by then.
