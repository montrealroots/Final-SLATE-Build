# Journey Report (November 20, 2026)

This report follows the research recovery package's `docs/04-JOURNEYS-AND-SAFARI.md`. Each row says what ran, where, and with what result. A test that wasn't run is marked as not run. Emulated WebKit is not Safari and not a physical iPhone.

Environment: a Linux cloud container, Playwright 1.63.0, Chromium build 1252, and WebKit build 2386 (`/opt/pw-browsers/webkit-2386`). The game ran on the Vite dev server unless a row says otherwise. Each world seed is pinned in its test and labelled a fixture.

| Journey | Save | Browser | Data | What it does | Result | Limitation |
|---|---|---|---|---|---|---|
| J02 in one save (`e2e/j02-one-save.spec.ts`) | one save, from creation to Sundance results and a reload | desktop Chromium; iPhone 15 Pro Max WebKit | real: Don Quixote's Wikipedia story; Toy Story's cast from the installed TMDB catalog. Fixture: the seed, and the film's quality set high before entry | adapt a real work; consider a real catalog performer from their page and cast them; staff; schedule; shoot; deliver; release through the player's storefront; enter Sundance 2027's short film program; reach the results; save, reload and play on | Passed on desktop (56 seconds) and on WebKit (1.2 minutes). The desktop save's own summary: Sarah Rayne (TMDB 12903) contracted at $990 a day, considered from her page after Tom Hanks (asks $644,630 a day) and Don Rickles (died 2017) were passed over; source Don Quixote; delivered; released through the storefront; Sundance 2027 short film program selected, its grand jury prize lost; the entry fee posted once; played on to March 3, 2027 after a reload | Runs only where the real catalog is installed (never in CI). Contracts and rights are the game's own. |
| Awards (`e2e/awards.spec.ts`), every test | one save per test | desktop Chromium, phone-width Chromium, iPhone 15 Plus WebKit | the game's records and fixtures | 18 tests per project | 54 passed, 0 failed, 0 skipped (14.0 minutes) | Emulation |
| Every journey on WebKit (`--project=iphone-webkit-all`) | each test's own | iPhone 15 Pro Max WebKit | as each test says | every spec, including the 41 tests that ran only at desktop width before November 20 | 228 passed, 6 failed, 18 skipped, of 252 (1.5 hours). The six failures are below; none is fixed yet | Emulation. Opt-in: a full run takes hours, so CI doesn't run it. |

## What Changed In The Test Setup

- **One helper decides where a test runs.** Every test's project list now goes through `e2e/helpers.ts onlyOn`; 86 files changed. On the five existing projects a test runs exactly where it did before. The new `iphone-webkit-all` project (added with `SLATE_E2E_WEBKIT_ALL=1`) runs every test, with no list of files. That includes `journey-a.spec.ts` and the 41 tests that said they ran "once, at desktop width".
- **Platform-specific tests stay where they belong.** `devices.spec.ts` stays on the iPhone projects. `phone-layout.spec.ts` stays off desktop, because a desktop browser ignores the viewport tag. `measure.spec.ts` is a measurement and runs only on desktop with `SLATE_MEASURE=1`.

## Safari And A Physical iPhone

Not tested. This container is Linux: it has no Mac with `safaridriver` and no iPhone attached. Playwright's WebKit runs the same engine, emulating the iPhone's screen, touch and user agent. It does not test Safari's browser bars, on-screen keyboard, rotation, backgrounding or storage on a real device. To test those, run the same journeys on a Mac with Safari's remote automation turned on, or on an iPhone, and record the device model, the iOS and Safari versions, and the date.

## The Six WebKit Failures (Found November 20, 2026, Not Fixed)

These journeys had never run on WebKit before. Each failure is either the test assuming desktop or Chromium, or a real fault on the phone. None has been diagnosed yet, so they are reported as they ran.

| Test | What failed | First reading |
|---|---|---|
| `e2e/first-project.spec.ts:43` first project | The credits table text wasn't the desktop table's tab-separated row (`With Thanks To	Starting Backing`) | The phone layout presents the credits differently; probably the test |
| `e2e/j11.spec.ts:18` J11 | A send button's `isEnabled` timed out (line 194) | Not yet known |
| `e2e/journeys.spec.ts:88` hybrid production | "Approach Starting Backing" wasn't found to click (line 353) | Not yet known: could be layout or a real gap on the phone |
| `e2e/storage.spec.ts:15` full storage | The recovery copy downloaded as `..._(damaged_copy).slate-save.json` | WebKit puts underscores in a download's name for spaces; the test expects Chromium's |
| `e2e/storage.spec.ts:83` saves moving from localStorage | An unexpected `.bak` record | Not yet known |
| `e2e/viewports.spec.ts:228` reload and continue at once | "Importing a module script failed" in a React component | A quick reload against the dev server in WebKit; needs a production-build run to tell |

Other runs on November 20:
- The full check passed: 236 test files, 1,913 tests passed, 59 skipped. The build and size budget passed.
- The papers browser tests passed on desktop and phone, 2 of 2 on desktop. One desktop run failed while three heavy runs shared the machine, and passed when rerun alone.
- The Credits test passed on desktop and phone.
