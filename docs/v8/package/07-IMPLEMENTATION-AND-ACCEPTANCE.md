# Dependency-ordered implementation

1. Snapshot latest main, read AGENTS/rules and existing saves/tests; record baseline SHA and CI. Inspect changes since the included 84775c7 snapshot before applying patches. Keep working functionality.
2. Add canonical money and transactional adapters. Migrate existing postings with reconciliation, backups, versioning and rollback. Never merge amounts from different currencies as if identical.
3. New-game inheritance at 19, remove family-support menus for new games, preserve old family contracts. Implement personal account and owner/source-of-funds identities.
4. Import/normalize legacy banks/documents with per-field evidence and country statuses. Port account commands, calendar charges, settlements and holds into current architecture. Add tested banking screens.
5. Replace fixed budget target tiers; separate estimate/ceiling/commitments/liquidity; connect actual supplier and production cost choices. Fix feasibility at cash-event level.
6. Company/banner distinction, optional formation, company account ownership, owner capital, projects, overhead and payouts. Preserve non-company independent route.
7. Deal types, scope, differentiated offers, negotiated terms, calendar payments, submissions, passes, project approval, turnaround and renewal. Grandfather existing deals unless player explicitly converts.
8. Document/visa/permit workflow and production geography; reconcile story setting/filming/base concepts and remove redundant input.
9. Awards single-timeline migration and complete lifecycle from the inherited addendum. Keep historical source facts behind the simulation; don't erase completed save results.
10. Phone overhaul across every changed screen and remaining navigation. Desktop parity means capabilities, not unreadable scaling.
11. Integrated journeys, failure recovery, seed-based economy runs and performance/storage checks. Update feature matrix with actual evidence. Commit coherent tested sections, push reviewable PRs and merge only after required checks pass.

## Acceptance cases
A01 New life is 19 with all four roles and one inheritance posting; reload and midnight do not duplicate it.
A02 Personal → company → project transfers conserve combined cash, except documented fees. Neither transfer is revenue.
A03 A production banner does not open an entity bank account or automatically transfer copyrights.
A04 Enter 20,000 and 2,000,000; save/reload retains exact amount; changing target creates no cash.
A05 Invalid formats, precision and overflow rejected; valid currency minor units preserved.
A06 Delivery-only funding cannot pay tomorrow's deposit; bridge/owner funds clear only after settlement.
A07 A single obligation reserved then paid does not count twice in cash forecast; cancellation releases only the refundable hold.
A08 FX transaction reconciles both currencies and fees; rate refresh does not change history.
A09 Monthly fees/interest respect product terms and calendar anchors, including leap February; advance cannot duplicate charge.
A10 An unknown bank fee is not shown as free; personal products aren't offered as business accounts by default.
A11 Company withdrawals preserve restricted funds, liabilities and capital/profit distinctions.
A12 First-look film scope leaves excluded TV free; matching/resubmission rights enforced only if present.
A13 Novice inherited wealth does not auto-grant elite deals; competing offers and strong track record change supported terms.
A14 An overall headline value is not deposited as personal cash at signing. Overhead and development stay separately accounted.
A15 Expiry stops future support but keeps surviving rights and repayment; renewal doesn't duplicate already paid months.
A16 Passport/visit permission does not automatically confer work authorization; pending/expired permits affect the actual shoot.
A17 Fictional story location and real filming location remain distinct; changing one doesn't silently overwrite the other.
A18 An awards nominee or winner replaces a competitor only through the proper stage; no spoilers, duplicate awards or reload rerolls.
A19 Nomination/prize consequences affect the proper recipients and produce bounded, non-circular reputation changes.
A20 Complete phone flow with long money values, dialog, keyboard and save recovery; no scaled desktop canvas.
A21 Existing saves preserve money, family obligations, signed deals, completed awards and player-edited scripts. Migration failure restores prior save.
A22 Multi-year playthrough: no unlimited inheritance, money creation, repeat-payment exploit, event queue leak or compulsory repeat winner suppression.

## Stress, depth and honesty
Run current required checks plus targeted unit/integration tests and Playwright for changed journeys. Use fixtures for edge cases and at least one actual no-fixture career path. A fixture that jumps straight to delivery does not verify the whole production lifecycle. Measure simulation runtime/save growth over several seeds and years. Human pacing and physical-phone testing remain distinct from automated evidence.

Every meaningful input maps to persistent state, engine consumer, downstream outcome and test. Preserve unknown research rows; don't pad counts with aliases or claim a file-presence test proves factual accuracy. The packet's Python reference tests only validate illustrative logic; Claude must port and test the actual game.
