# Continuous journeys and Safari verification

This is an executable test specification for Claude to implement against actual UI selectors, not a report that these journeys have passed. No game/browser tests were run in preparing this package.

## One continuous source-to-award save

Use one save ID throughout. Establish fixture data through an explicit test harness, then perform player actions through the UI. Do not silently replace the save or inject a finished film halfway through. Fixture licences and fictional offers are simulated game records, not real-world rights agreements.

1. Create a 19-year-old player with all four creative roles. Set date/location and verify opening funds post exactly once through the existing inheritance/startup mechanism. Do not restore the company system the user asked to remove.
2. Browse a real source work already permitted in the catalog. Check identity, synopsis/metadata, release dates and external ID. Choose adaptation; record simulated rights permission, territory, term and price or explicit unavailable status. Do not imply possession of actual adaptation rights.
3. Populate the project's fields and verify their persisted values: format, genres, premise, setting, tone, target audience and planned duration. Change at least one choice and prove it changes downstream production requirements.
4. Name a character, define role and match a real catalog performer by stable ID. Negotiate the simulated contract and verify schedule availability, fees, credited role and budget commitments. Include a relevant director/composer/crew hire where the format requires it.
5. Set a numeric budget and fund it from the player's actual bank balance. Confirm available cash, committed cost and spent cost remain distinct.
6. Choose shooting location. Where the fixture requires entry/work/filming permissions, follow application/payment/approval steps and prove production respects them. Advance time through the UI.
7. Complete format-appropriate preparation, production, post-production and delivery. Verify elapsed time and expenses; do not allow a generic button to skip required dependencies unnoticed.
8. Choose an independent release destination/distributor supported by the game. Confirm delivery requirements, release date, fees/revenue share and payment timing. Verify the film is actually released before eligibility checks.
9. Submit to a supported award/category. Confirm eligibility, fee and nomination schedule. Run separate deterministic win and loss scenarios; no arbitrary always-win rule.
10. Reach the result date. Confirm award publication, credited recipients, reputation, career archive and subsequent deal effects. Confirm historical reference records remain intact.
11. Save, exit, reopen and continue after major milestones. Compare bank/ledger/project/rights/credits/awards IDs to pre-exit state. No duplicate charges, trophies, advances or compensation.

Also test insufficient funds, declined contract, ineligible submission, expired rights, failed permission and schedule conflict. A failure must lead to a sensible recovery choice. Record browser console and unhandled errors, screenshots, trace on failure and a short journey summary.

## Fix both mobile test barriers

At the inspected commit, phone WebKit uses test allowlists and `journey-a.spec.ts` skips non-desktop projects. Review all test files for `test.skip`, project-name branching and platform assumptions. Replace obsolete desktop-only restrictions for shared functionality. Keep a documented reason for genuinely platform-specific cases.

Add a dedicated all-journeys WebKit project or expand the current projects deliberately. Use the same deterministic fixtures across Chromium and WebKit. Do not erase tests or increase timeouts to conceal a broken flow. Use observable state or accessible locator assertions instead of arbitrary sleeps.

Inspect mobile at portrait and landscape sizes representative of iPhone15 Plus/Pro Max and newer targets. Check navigation, dialogs, long lists, touch targets, scrolling, wrapping, safe areas, focus, fixed footers, input labels and save/continue. The mobile layout should preserve desktop features while fitting the phone; do not simply shrink the desktop canvas.

Run development and production builds where their asset loading differs. The inspected configuration supports `SLATE_E2E_PROD=1`; first confirm that remains true in the current branch. Record exact project names and executed/skipped counts in the report.

## Real Safari is a separate result

Playwright's WebKit engine is valuable browser coverage; it is not branded Safari or a physical iPhone. Apple provides WebDriver support through Safari's `safaridriver` on macOS. A Mac runner can exercise actual desktop Safari after the owner enables remote automation; do not claim this ran on a Linux worker.

For an actual iPhone, run the same user journey with a device operator or an available appropriately configured device service. Check software keyboard appearance, viewport resizing, focus/scroll into view, text selection, browser bars, rotation, background/foreground handling, storage persistence and touch interaction. Record device model, iOS/Safari version and date. Mark untested if no device is available.

## Evidence report

Produce `JOURNEY-REPORT.md` with columns: journey, save ID, environment/browser/version, fixture/live data, steps completed, assertions, executed tests, skips with reasons, screenshots/traces, result and remaining limitation. Do not mark every journey passed from one smoke test. No current package claim substitutes for this report.
