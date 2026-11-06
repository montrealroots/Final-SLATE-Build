# Storage

Saves live in the browser's localStorage for this site. Measured November 6, 2026, Chromium and WebKit
(Playwright 1.63.0) both allow **5,242,880 characters** per site, counting keys and values, and charge a replaced
value only the difference in size. `memoryStore` in `src/engine/save.ts` counts the same way, so tests and
measurements use the real limit.

## What Is Kept For Each Save

| Key | What it is | When it is written | When it goes |
| --- | --- | --- | --- |
| `slate.v1.save.<id>` | The save | Every save | Deleting the save |
| `.bak` | The previous good save | Every save, if the save being replaced is sound | Replaced by the next good save; deleting the save |
| `.backup-v<n>` | The save exactly as it was before an update to a newer save version | Once, before migrating | Only when the player deletes it or the save |
| `.backup-repair` | The save as it was before places were repaired | Once, before a repair | Only when the player deletes it or the save |
| `.damaged-<time>` | A save that couldn't be used, kept as found (one copy per distinct content) | When opening or saving finds the save damaged | Only when the player deletes it or the save |
| `.tmp` | A complete copy left by an interrupted write from an earlier build | No longer written | Only when the player deletes it or the save |
| `slate.v1.index` | List of saves (rebuilt from the saves if missing or damaged) | Every save | — |

The game never deletes a recovery copy by itself. Saved Games shows how much storage the games use and lists every
recovery copy with **Export Copy** (downloads it exactly as stored) and **Delete Copy** (asks first, with **Export
First**). Deleting a save says how many recovery copies go with it.

## How A Save Is Written

1. Serialize and validate the game (never store something this build couldn't open).
2. Refuse if the stored save was written by a newer version of the game.
3. If the stored save is sound, keep it as `.bak`; if not, keep it as a damaged copy (unless that copy already exists).
4. Replace the save and read it back.
5. Update the index. "Saved" is shown only when every step succeeded.

Earlier builds also wrote a temporary copy before step 3 and deleted it after step 4. Browsers replace a value in
one step, so the temporary copy added no protection: at every moment of the steps above the previous good save is
stored (as the save, the backup, or both). Leaving it out lowers the space a save needs from three copies to two.

## Peak Storage During A Save

From `npm run perf:engine` (`storage` in `docs/perf/engine-storage-before.json` and `engine-storage-after.json`),
in kB of characters. "With recovery copies" adds a migration backup and a damaged copy of the same size.

| Save | Save size | Peak before | Peak after | Peak with recovery copies, before | after |
| --- | --- | --- | --- | --- | --- |
| Fresh | 93 | 279 (3×) | 186 (2×) | 465 (5×) | 372 (4×) |
| Medium | 296 | 889 (3×) | 593 (2×) | 1,482 (5×) | 1,185 (4×) |
| Long (1.6 game years) | 1,100 | 3,300 (3×) | 2,200 (2×) | **5,499 (5×), over the 5,120 limit** | 4,400 (4×) |

Before this change, the long save with two recovery copies could not be saved at all in a browser.

## Running Out Of Space

- `writeSave` reports `storageFull` when the browser refuses for lack of space. The game says: "Your game couldn't be
  saved because this browser's storage for SLATE is full. Your last save is still there. Free up space in Saved Games,
  or export this game, then try again." with **Try Again**, **Free Up Space** and **Export Save** (which works from
  memory, so it needs no storage).
- Tested (`tests/save-recovery.test.ts`): running out at the backup, replace and index steps, and repeated failures at
  each step, leave every save listed and openable; a store just big enough for a save and its backup keeps saving;
  no room to keep a damaged copy refuses to replace it; a save whose only good copy is its backup or a migration backup
  is still listed and opens, newest copy first.
- In the browser (`e2e/storage.spec.ts`, desktop and phone): storage filled to its last character, then the full-storage
  message, the last save unchanged, Free Up Space, export and delete a recovery copy, Try Again saves, and the previous
  save becomes the backup. A save with only a pre-update backup left is listed and opens with an accurate message.

## Limits

- **Saves grow with play,** mostly from festival and award history. Save version 3 stores each competing film once
  instead of in every category of every edition (`GameState.rivalFilms`): the long workload went from 1,100 kB to 859 kB
  (edition data 736 kB to 360 kB; `docs/perf/engine-v3.json`), and the medium one from 296 kB to 255 kB. Growth is now
  roughly 0.45 MB per game year, so a single game reaches the browser limit (two copies of it in about 5 MB) after about
  five game years, instead of about four. **Still open:** compressing saves, or trimming the stored history of events the
  player never entered, would extend this further; both need care to keep past results intact.
- Other sites' storage does not count, but other SLATE saves and recovery copies do.
- Real Safari and Firefox were not measured; their documented limits are similar (about 5 MB) but unverified here.
