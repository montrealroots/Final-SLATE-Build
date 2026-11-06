# Storage

Measured November 6, 2026 in the Linux cloud container (Node 22.23.4; Playwright 1.63.0 Chromium and WebKit, which
is emulation, not real Safari). Raw numbers: `docs/perf/career-before.json`, `docs/perf/career-after.json`,
`docs/perf/browser-vault.json`; storage measurements below come from `scripts/perf-storage.mjs`.

## Where Saves Live

Saves are kept in **IndexedDB** (database `slate-saves`), each record gzip-compressed, through the save vault:
`src/engine/vault.ts` (logic, tested in Node) and `src/ui/idb.ts` (browser). localStorage keeps only small things:
the creation draft, tab locks, the theme, and the closing-page journal (below).

- Each operation loads only the records it needs, runs the same save functions as before (`src/engine/save.ts`:
  validation, backup, damaged-copy preservation, newer-version refusal, index rebuild), then commits every change in
  **one IndexedDB transaction**: the save, its backup and the index land together or not at all. "Saved" is shown
  only after the transaction completes.
- Operations run one at a time, in order. A save asked for while one is being written runs once more afterwards, only
  if the game changed meanwhile; after a change, the next save waits longer when writes are slow (ten times the last
  write, 1.2 to 10 seconds), and a save still happens every 30 seconds while time runs.
- Where IndexedDB can't be opened, or opens but refuses a test write (some private modes), the same vault runs on
  localStorage, uncompressed and with its roughly 5 MB limit, as before.
- Compressed bytes are stored as ArrayBuffers: WebKit refuses Blobs in IndexedDB in private (ephemeral) sessions,
  which is how the first browser run here failed.

### The Journal Written As A Page Closes

IndexedDB writes are asynchronous and may not finish while a page unloads. When the page is hidden or closed, the game
being played is written synchronously to localStorage (`slate.v1.pending.<id>`) if it fits. On the next start, a journal
entry newer than the stored save is saved through the vault the normal way (the stored save becomes its backup) and then
cleared; an older one is superseded and cleared; an unreadable one is kept in the vault as a damaged copy. A career too
large for localStorage (over about 5 MB of save, roughly 20 game years) can't be journaled: closing the page then
loses at most the time since the last stored save, normally under 30 seconds.

### Moving Saves Out Of localStorage

On first start after this change, every save record still in localStorage moves into IndexedDB, one save at a time:

1. Commit the save's records in one transaction.
2. Read them back and compare with the originals.
3. Only then remove them from localStorage.

This runs under a Web Lock (`slate-vault-migration`) so two tabs never move saves at once, and it is safe to repeat
after an interruption at any step: a record already moved with the same text is just removed from localStorage. If the
two stores disagree (a tab running an older version kept saving to localStorage), nothing is lost: the newer save stays
the save and the other is kept as a **"Copy saved by another tab"** recovery copy (`.conflict-<time>`). If the vault has
no room, everything stays in localStorage and the start screen says so; it moves next time.

## What Is Kept For Each Save

| Key | What it is | When it is written | When it goes |
| --- | --- | --- | --- |
| `slate.v1.save.<id>` | The save | Every save | Deleting the save |
| `.bak` | The previous good save | Every save, if the save being replaced is sound | Replaced by the next good save; deleting the save |
| `.backup-v<n>` | The save exactly as it was before an update to a newer save version | Once, before migrating | Only when the player deletes it or the save |
| `.backup-repair` | The save as it was before places were repaired | Once, before a repair | Only when the player deletes it or the save |
| `.damaged-<time>` | A save that couldn't be used, kept as found (one copy per distinct content) | When opening or saving finds the save damaged | Only when the player deletes it or the save |
| `.conflict-<time>` | The other version when localStorage and IndexedDB disagreed | When saves are moved | Only when the player deletes it or the save |
| `.tmp` | A complete copy left by an interrupted write from an earlier build | No longer written | Only when the player deletes it or the save |
| `slate.v1.index` | List of saves (rebuilt from the saves if missing or damaged) | Every save | — |

The game never deletes a recovery copy by itself. Saved Games shows how much storage the games use (and, where the
browser says, how much it allows) and lists every recovery copy with **Export Copy** and **Delete Copy** (asks first,
with **Export First**). Deleting a save says how many recovery copies go with it. **Export Save** downloads the game
being played from memory, so it works even when storage is full.

### Import Save

**Import Save** (Saved Games, also with no saves yet) reads an exported file in memory: the checksum must match, a
newer version is refused ("made by a newer version of SLATE"), older versions are upgraded and the result is validated
(`readImport`, `src/engine/save.ts`). Nothing is stored until all of that has passed, and the file is never changed.

- A save whose ID is new is stored as it is.
- A save whose ID is already here is never replaced silently: the player chooses **Import As A Separate Copy** (new ID,
  name ending "(Imported Copy)", the save here untouched) or **Replace The Save Here**, which asks again; the save it
  replaces is kept as the backup. A save here from a newer version is never replaced. The game being played, or a save
  open in another tab, can't be replaced (the player is told why); a separate copy still can.
- The import is one vault transaction (`Vault.forImport`): with no room, or a failed write, nothing changes and the
  player is told so. It works the same on IndexedDB and on the localStorage fallback.
- Tested: `tests/import.test.ts` (round trip with history, credits, money, places, events and editions; older and
  newer versions; malformed files; duplicates; failed and full commits; localStorage fallback) and `e2e/backup.spec.ts`
  (export, import into a fresh browser profile, open, play, save, reload; copy and confirmed replacement; refusals;
  two tabs).

## Long Careers

`tests/perf/career.perf.ts` makes real productions through the engine (live-action shorts, low-budget features, 2D
shorts; about two a year), releases each, enters it wherever it is eligible (up to four entries), and lets time pass,
for 50 years. Every edition of all 37 institutions runs and is judged. This is an engine simulation, not a played UI
career.

### What Grew

At 50 years before this change, the save was 19.8 MB: festival and award editions 48% (9.5 MB), competing films 22%
(4.3 MB), projects 18% (3.6 MB). Of 182 finished editions after 5 years, the player had entered 11; finished editions
still stored every competing work's judging strength and its long ID twice, though nothing reads strengths once results
are final.

**Save version 4** compacts each edition once its results are final (`compactEdition`, also applied by the migration):
selected, nominated and winning works, entries and the player's results are all kept, and results name films directly;
the competing works' strengths are dropped. Titles and outcomes are tested to be identical before and after.

### Measured, Before And After

| Career | Projects | Save before | Save after | Write before → after (Node) | Load before → after (Node) | Game state in memory after |
| --- | --- | --- | --- | --- | --- | --- |
| 1 year | 2 | 595 kB | 450 kB | 24 → 19 ms | 6 → 5 ms | 0.5 MB |
| 5 years | 10 | 2.2 MB | 1.5 MB | 77 → 55 ms | 21 → 16 ms | 1.7 MB |
| 10 years | 20 | 4.2 MB | 2.7 MB | 137 → 100 ms | 38 → 29 ms | 3.3 MB |
| 25 years | 50 | 10.0 MB | 6.3 MB | 388 → 271 ms | 100 → 67 ms | 7.5 MB |
| 50 years | 100 | 19.8 MB | 12.4 MB | 768 → 534 ms | 226 → 144 ms | 14.7 MB |

"Write" is the full checked save (`writeSave`: serialize, validate the new save, validate the one it replaces, index).

Stored in IndexedDB (gzip), per copy:

| Career | Raw | Chromium stored | WebKit stored | Compress and commit save + backup (Chromium / WebKit) | Read, decompress, parse (Chromium / WebKit) |
| --- | --- | --- | --- | --- | --- |
| 1 year | 450 kB | 49 kB | 51 kB | 22 / 16 ms | 9 / 6 ms |
| 5 years | 1.5 MB | 150 kB | 158 kB | 55 / 46 ms | 16 / 17 ms |
| 10 years | 2.7 MB | 276 kB | 290 kB | 100 / 72 ms | 29 / 31 ms |
| 25 years | 6.3 MB | 646 kB | 679 kB | 235 / 180 ms | 58 / 65 ms |
| 50 years | 12.4 MB | 1.3 MB | 1.3 MB | 447 / 343 ms | 115 / 137 ms |

The game itself, production build in Chromium (`scripts/perf-browser.mjs`, median of 3):

| Career | Open (Continue) | Advance one month | Save And Exit after it |
| --- | --- | --- | --- |
| 1 year | 74 ms | 117 ms | 117 ms |
| 10 years | 108 ms | 336 ms | 227 ms |
| 50 years | 289 ms | 1.2 s | 1.2 s |

### Capacity

- **Before:** localStorage holds 5,242,880 characters per site, and a save needs room for itself and its backup, so a
  single career stopped saving after about 5 game years (at 4.4 MB peak) and two slots sooner.
- **After:** a 50-year career needs about 2.6 MB (save plus backup, compressed). Quotas reported in this container:
  Chromium 4 GB (Chromium allows a share of free disk), WebKit 1,000 MB. Both browsers accepted a 30 MB record.
  **Real Safari, Firefox and phones were not measured**; their limits depend on the device and settings.
- **Not unlimited:** saves still grow about 0.25 MB raw (25 kB stored) per game year after compaction. Competing films
  (4.3 MB raw at 50 years, of which only titles are read) and projects (3.6 MB) are the largest parts now.
- **Where IndexedDB isn't available** (the localStorage fallback), the old limit applies: about 9 game years after
  compaction for one career (save plus backup must fit in 5.24 million characters).
- **Eviction:** browsers may clear site data under storage pressure or, in Safari, after weeks without a visit.
  `navigator.storage.persist()` is not requested (Firefox would show a permission prompt). Export Save is the way to
  keep a copy outside the browser.

### Time And Memory At 50 Years

Saving is the cost that grows: about 0.5 s of synchronous work per save at 50 game years (serialize and validate), plus
asynchronous compression and the transaction. Saves after changes are spaced further apart as writes get slower. Each
batch of events copies the game for rollback (`docs/PERFORMANCE.md`), about 1.5 ms per MB, so ticking and advancing a
50-year career cost more than a new one (One Month took 1.2 s above).

## Failure Behavior, Tested

- **Full storage:** the transaction fails as a whole; nothing from that save is stored; the game says the storage is
  full, that the last save is still there, and offers Free Up Space and Export Save; Save And Exit stays in the game.
  (`e2e/storage.spec.ts`, `e2e/failures.spec.ts` with injected QuotaExceededError; `tests/vault.test.ts`.)
- **Failed writes at every step** of the save function (`tests/save-recovery.test.ts`), and failed commits
  (`tests/vault.test.ts`): the last good save stays, and the save is never reported as saved.
- **Interrupted move, two tabs moving at once, conflicting copies, no room to move:** `tests/vault.test.ts` and
  `e2e/storage.spec.ts`.
- **Corrupt data:** damaged saves open from the newest sound copy with the damaged one kept, in the vault as before
  (`tests/vault.test.ts`, `e2e/failures.spec.ts`).
- **Newer-version saves** are refused and never replaced (`tests/save-recovery.test.ts`, `e2e/failures.spec.ts`).
- **A page closed mid-play:** the journal brings the latest game back (`tests/vault.test.ts`; `e2e/world.spec.ts`
  reloads right after travelling and finds the new place).
- **Another tab deleting or upgrading the database:** this tab closes its connection instead of blocking it; its
  saves then fail and say so.
