# Journey Report (November 20, 2026)

This report follows the research recovery package's `docs/04-JOURNEYS-AND-SAFARI.md`. Each row says what ran, where, and with what result. A test that wasn't run is marked as not run. Emulated WebKit is not Safari and not a physical iPhone.

Environment: a Linux cloud container, Playwright 1.63.0, Chromium build 1252, and WebKit build 2386 (`/opt/pw-browsers/webkit-2386`). The game ran on the Vite dev server unless a row says otherwise. Each world seed is pinned in its test and labelled a fixture.

| Journey | Save | Browser | Data | What it does | Result | Limitation |
|---|---|---|---|---|---|---|
| J02 in one save (`e2e/j02-one-save.spec.ts`) | one save, from creation to Sundance results and a reload | desktop Chromium | real: Don Quixote's Wikipedia story; Toy Story's cast from the installed TMDB catalog. Fixture: the seed, and the film's quality set high before entry | adapt a real work; consider a real catalog performer from their page and cast them; staff; schedule; shoot; deliver; release through the player's storefront; enter Sundance 2027's short film program; reach the results; save, reload and play on | RESULT_J02 | Runs only where the real catalog is installed (never in CI). Contracts and rights are the game's own. Not run on WebKit yet (see below). |
| Awards (`e2e/awards.spec.ts`), every test | one save per test | desktop Chromium, phone-width Chromium, iPhone 15 Plus WebKit | the game's records and fixtures | 18 tests per project | 54 passed, 0 failed, 0 skipped (14.0 minutes) | Emulation |
| Every journey on WebKit (`--project=iphone-webkit-all`) | each test's own | iPhone 15 Pro Max WebKit | as each test says | every spec, including the 41 tests that ran only at desktop width before November 20 | RESULT_WEBKIT | Emulation. Opt-in: a full run takes hours, so CI doesn't run it. |

## What Changed In The Test Setup

- **One helper decides where a test runs.** Every test's project list now goes through `e2e/helpers.ts onlyOn`; 86 files changed. On the five existing projects a test runs exactly where it did before. The new `iphone-webkit-all` project (added with `SLATE_E2E_WEBKIT_ALL=1`) runs every test, with no list of files. That includes `journey-a.spec.ts` and the 41 tests that said they ran "once, at desktop width".
- **Platform-specific tests stay where they belong.** `devices.spec.ts` stays on the iPhone projects. `phone-layout.spec.ts` stays off desktop, because a desktop browser ignores the viewport tag. `measure.spec.ts` is a measurement and runs only on desktop with `SLATE_MEASURE=1`.

## Safari And A Physical iPhone

Not tested. This container is Linux: it has no Mac with `safaridriver` and no iPhone attached. Playwright's WebKit runs the same engine, emulating the iPhone's screen, touch and user agent. It does not test Safari's browser bars, on-screen keyboard, rotation, backgrounding or storage on a real device. To test those, run the same journeys on a Mac with Safari's remote automation turned on, or on an iPhone, and record the device model, the iOS and Safari versions, and the date.
