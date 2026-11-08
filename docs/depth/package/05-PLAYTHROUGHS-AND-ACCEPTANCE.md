# Playthrough And Acceptance Plan

These are required scenario families, not claims of executed tests. Discover the actual scripts in package.json and reuse the repository toolchain. Installed tools must be verified by a real relevant invocation; no API keys, paid APIs, subagents or unnecessary replacement installers.

## Connected scenarios

For every journey: begin through the visible UI, make meaningful decisions, assert state and visible outcomes, save/reopen midstream and at the end, and inspect screenshots. Label fixtures. Seed deterministically without changing seeds to hide defects. Prefer production-build browser runs for acceptance. A fixture may establish the world or rare failure condition; it must not bypass the player decision under test.

1. Live-action short: creation with multi-ethnicity and multiple languages; Review edits; name characters; supporting antagonist; structured story dependency; pitch; funding; self-cast or cast others; crew; schedule; weather disruption; filming; editorial cut/restore; delivery; release; receipts; second project.
2. Behind the camera: screenwrite, produce and direct with no acting credit; cast an unavailable performer; receive refusal; choose replacement; confirm used-work credits and payments.
3. Episodic production: two or more episodes; regular, recurring and guest participation; episode-specific scenes; shared locations; revise one filmed scene; preserve unaffected work; pickup; individual episode delivery and credits; season completion.
4. Stop motion: puppets, duplicates, stage access and animators; funding shortfall; revised scope or new backing; shoot; repair or reschedule; finish and distribute. Demonstrate time/cost tradeoff without universal quality bonus.
5. 2D: storyboard and animatic approval; voice; animation and cleanup; late change; affected-work-only revision; finishing and versioned delivery.
6. 3D: model/rig readiness; animation; render bottleneck; capacity change; compositing; delivery. Test unavailable required crew and realistic nonzero feasibility reporting.
7. Hybrid/motion capture: distinguish body, face, voice and filmed contributions; dated conflicts; missed booking; replacement performer; preserve credits for used work.
8. Documentary: access refusal; contributor interview; use restrictions; factual review; withdrawal before capture and after capture; remove or replace affected material; deliver coherent version.
9. Supported unscripted family: explicit format rules; participant changes; episode progression; restrictions; withdrawal; correct credits and delivery. Add separate cases for materially different format families.
10. Festival route: valid and invalid format/runtime/premiere cases; exact edition/category; fee; withdrawal and resubmission; invitation conflict; screening; results; correct eligibility after cancellation versus actual release.
11. Distribution alternatives: adult-oriented content receives outlet-specific options; alternate delivery edit; territory/language requirements; exclusivity conflict; late payment; correct net/received accounting.
12. Persistence and recovery: malformed genre data halfway through; request failure/retry; quota failure; damaged main save; import/export; older/newer save versions; reload lock; second tab; interrupted event processing; no duplicate money/events.
13. Calendar: birth date anniversary; leap years; DST transition where applicable; local midnight; year rollover; holidays; long advance interrupted by a decision; close/reopen without offline progress.
14. Scope revision: cut, split, combine, duplicate and rename with IDs and links intact; revise approved material; no repeated-revision quality exploit; delete/archive project with obligations preserved.
15. Multi-project career: overlapping personnel and resources; outstanding repayment; returning collaborators; sequel/season continuity; second project preserves first project history.

## Browser and UI coverage

- Desktop, phone-sized Chromium and WebKit emulation for iPhone 15 Plus and 15 Pro Max. Use supported landscape coverage for navigation, dialogs and keyboard-sensitive flows.
- Critical creation, funding, casting, scene revision, save/reload and recovery must be exercised on WebKit, not inferred from desktop results. Expand TV/animation mobile coverage when UI paths differ.
- Verify no clipping, horizontal overflow, buried buttons, moving targets or obscured scroll destinations beneath sticky headers. Test zoom, long names, accented names, long localized labels and large project lists.
- Inspect keyboard navigation, focus after route changes and modal close, labels, error announcements, touch targets and loading placeholders.
- Keep failure traces, console/page/network errors and evidence of the specific outcome. Explain intentional skips; they are not passes. Browser emulation is not physical iPhone or real Safari verification.

## Integrity assertions

Money finite and conserved across receipts, reservations and settlement; no negative available funds or duplicate settlements. No double-booking of exclusive resources. Explicit time ordering and no offline catch-up. Exact save round trips and safe migration. Valid stable references. No phantom completed tasks or footage. Credit follows contribution. Changed work invalidates dependent work only. Identity and text-presence do not grant unsupported ability or quality.

## Balance and performance

Use multiple reproducible seeds, scope sizes, cities and production methods; hold out combinations from tuning. Separate completion reachability from challenge and enjoyment. Report cost/time distributions, funding shortfalls, dead ends, sensitivity and meaningful choice effects. Do not force every strategy to succeed. Human playtesting is required to assess enjoyment and natural pacing.

Measure startup JS, compressed transfer, background data, first playable time, navigation responsiveness, event advancement, long-career save size and recovery time. Keep existing budgets; do not hide transfer costs by moving files out of JS. Profile before optimizing.

## Completion gate

A leaf is VERIFIED only when its relevant child actions, effects, recovery, persistence, source classification and evidence are complete. No claim of universal completeness from finite tests. Every remaining blocker names the exact feature, reason, attempted resolution and next action. Update QA, resume notes and requirement evidence against the same tested source commit. Commit all intended work without committing secrets, dependencies or transient traces by default. Push and merge via PR only after required CI is green, then verify main CI.
