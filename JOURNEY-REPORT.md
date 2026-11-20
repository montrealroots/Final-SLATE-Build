# Journey Report (November 20, 2026)

This report follows the research recovery package's `docs/04-JOURNEYS-AND-SAFARI.md`. Each row says what ran, where, and with what result. A test that wasn't run is marked as not run. Emulated WebKit is not Safari and not a physical iPhone.

Environment: a Linux cloud container, Playwright 1.63.0, Chromium build 1252, and WebKit build 2386 (`/opt/pw-browsers/webkit-2386`). The game ran on the Vite dev server unless a row says otherwise. Each world seed is pinned in its test and labelled a fixture.

| Journey | Save | Browser | Data | What it does | Result | Limitation |
|---|---|---|---|---|---|---|
| J02 in one save (`e2e/j02-one-save.spec.ts`) | one save, from creation to Sundance results and a reload | desktop Chromium; WebKit (then the iPhone 15 Pro Max profile) | real: Don Quixote's Wikipedia story; Toy Story's cast from the installed TMDB catalog. Fixture: the seed, and the film's quality set high before entry | adapt a real work; consider a real catalog performer from their page and cast them; staff; schedule; shoot; deliver; release through the player's storefront; enter Sundance 2027's short film program; reach the results; save, reload and play on | Passed on desktop (56 seconds) and on WebKit (1.2 minutes). The desktop save's own summary: Sarah Rayne (TMDB 12903) contracted at $990 a day, considered from her page after Tom Hanks (asks $644,630 a day) and Don Rickles (died 2017) were passed over; source Don Quixote; delivered; released through the storefront; Sundance 2027 short film program selected, its grand jury prize lost; the entry fee posted once; played on to March 3, 2027 after a reload | Runs only where the real catalog is installed (never in CI). Contracts and rights are the game's own. |
| Awards (`e2e/awards.spec.ts`), every test | one save per test | desktop Chromium, phone-width Chromium, WebKit (then the iPhone 15 Plus profile) | the game's records and fixtures | 18 tests per project | 54 passed, 0 failed, 0 skipped (14.0 minutes) | Emulation |
| Every journey on WebKit (`--project=iphone-webkit-all`), first run | each test's own | iPhone 15 Pro Max WebKit | as each test says | every spec, including the 41 tests that ran only at desktop width before November 20 | 228 passed, 6 failed, 18 skipped, of 252 (1.5 hours). The six are below, each now fixed or explained | Emulation. Opt-in: a full run takes hours, so CI doesn't run it. |
| Every journey on the iPhone 18 Pro Max (`--project=iphone-webkit-all`) | each test's own | iPhone 18 Pro Max WebKit (440 by 763, iOS 27's user agent) | as each test says | every spec, after the owner made the iPhone 18 Pro Max the one phone | 237 passed, 1 failed, 14 skipped, of 252 (1.2 hours), with nothing else running. The one failure was the reload test's error check, fixed below; it then passed 8 of 8 | Emulation; the profile is derived from Apple's published specifications, since Playwright has none for this phone. |

## What Changed In The Test Setup

- **One helper decides where a test runs.** Every test's project list now goes through `e2e/helpers.ts onlyOn`; 86 files changed. On the five existing projects a test runs exactly where it did before. The new `iphone-webkit-all` project (added with `SLATE_E2E_WEBKIT_ALL=1`) runs every test, with no list of files. That includes `journey-a.spec.ts` and the 41 tests that said they ran "once, at desktop width".
- **Platform-specific tests stay where they belong.** `devices.spec.ts` stays on the iPhone projects. `phone-layout.spec.ts` stays off desktop, because a desktop browser ignores the viewport tag. `measure.spec.ts` is a measurement and runs only on desktop with `SLATE_MEASURE=1`.

## Safari And A Physical iPhone

Not tested. This container is Linux: it has no Mac with `safaridriver` and no iPhone attached. Playwright's WebKit runs the same engine, emulating the iPhone's screen, touch and user agent. It does not test Safari's browser bars, on-screen keyboard, rotation, backgrounding or storage on a real device. To test those, run the same journeys on a Mac with Safari's remote automation turned on, or on an iPhone, and record the device model, the iOS and Safari versions, and the date.

## The Six WebKit Failures (Found And Resolved November 20, 2026)

These journeys had never run on WebKit before. Each failure was either the test assuming desktop or Chromium, or the machine being overloaded. None was a fault in the game.

| Test | What failed | What it was | What was done |
|---|---|---|---|
| `e2e/first-project.spec.ts:43` first project | The credits weren't the desktop table's tab-separated row | On the phone the credits stack each name under its role | The test accepts either layout |
| `e2e/storage.spec.ts:15` full storage | The recovery copy downloaded as `..._(damaged_copy).slate-save.json` | WebKit writes spaces in a download's name as underscores | The test accepts both spellings |
| `e2e/j11.spec.ts:18` J11 | A send button's `isEnabled` timed out | Three heavy runs shared the machine | None needed: it passes when run alone |
| `e2e/journeys.spec.ts:88` hybrid production | "Approach Starting Backing" wasn't found | The same load | None needed: it passes when run alone |
| `e2e/storage.spec.ts:83` saves moving from localStorage | An unexpected `.bak` record | The same load | None needed: it passes when run alone |
| `e2e/viewports.spec.ts:231` reload and continue at once | "Importing a module script failed" | The error came from the old page as it was replaced. The reload cancels its module loads, and WebKit reports each cancelled load as an error before the new page arrives; Chromium drops them. The game reached the right screen every time. | `e2e/test.ts`'s error check no longer counts errors between the main frame's navigation request and its navigation. A planted error after a reload is still caught, on desktop and in WebKit |

The three load failures passed 16 of 16 on the iPhone 18 Pro Max across two repeats, alone. The reload test failed 8 of 8 alone before the fix and passed 8 of 8 after it.

Other runs on November 20:
- The full check passed: 236 test files, 1,913 tests passed, 59 skipped. The build and size budget passed.
- The papers browser tests passed on desktop and phone, 2 of 2 on desktop. One desktop run failed while three heavy runs shared the machine, and passed when rerun alone.
- The Credits test passed on desktop and phone.
