# Build Order And Connected-System Contracts

## Reconcile before changing

Read the repository instructions, current main and active branch, package, QA report, resume notes and existing requirements. Identify uncommitted work without overwriting it. Record the exact starting SHA. The historical review baseline is b025147 / PR #38; it is not a checkout instruction. Existing features can satisfy rows after evidence review. This package is not a reason to redo working systems.

For all 100 parent groups, identify implemented children, missing controls, disconnected state, untested paths and research gaps. Keep the original IDs and append child IDs. Use statuses: NOT YET RECONCILED, VERIFIED EXISTING, NEEDS REPAIR, MISSING, IMPLEMENTED UNVERIFIED, VERIFIED, EXTERNAL BLOCKER. Documentation alone cannot satisfy a gameplay row. Do not mark a whole parent verified while required children remain missing. Record every out-of-scope boundary explicitly; never remove rows to make coverage look complete.

## Dependency order

1. Reconciliation, stable IDs, save migrations, event ordering, transaction boundaries and coverage ledger (19–20).
2. Identity, timeline, geography, calendar, responsive navigation and recovery (01–02,19). Preserve the existing base; fix the known sticky-header scroll issue if still present.
3. Project setup, characters, scenes, structure, documents and immutable draft approval (03–06).
4. Episode/season model and the connections from characters, scenes and credits into episodes (07).
5. Cost projections, financing, ledger, casting, crew and participant availability (08–10).
6. Breakdown, assets, preparation, scheduling and readiness (11).
7. Live-action production and its failure/recovery paths (12).
8. Animation, stop motion and hybrid dependencies (13), then documentary/unscripted-specific paths (14); reuse shared contracts without forcing identical workflows.
9. Editing, versions, post-production and delivery (15).
10. Distribution, revenue, festival eligibility and annual editions (16–17).
11. Cross-project relationships, opportunities, obligations, sequels and returning seasons (18).
12. Complete end-to-end combinations, long-career persistence, performance, copy, accessibility and owner acceptance (19–20).

UI and tests are delivered with each engine slice, not postponed until the end. Each stage includes implementation, normal and failure paths, migration, UI, evidence and a coherent commit. Later stages remain in the ledger; do not stop permanently after completing one vertical slice.

## Required cross-system contracts

| Trigger | Must update | Must preserve | Recovery |
|---|---|---|---|
| Approve revised script | Changed scenes/assets, estimate, schedule and outstanding work | Unchanged footage, prior submitted drafts, past credits and payments | Impact preview; cancel or confirm; reopen affected work only |
| Change character performance method | Required casting, capture/voice tasks, assets and bookings | Stable character ID, completed contributions and historical versions | Explain unusable material and cancellation costs |
| Accept financing | Deal obligations and promised receipts | Existing ledger and prior terms | Record due receipts; cash changes only on receipt |
| Accept cast or crew offer | Bookings, reservations, work assignments | Other projects and existing commitments | Reject conflicts or reschedule atomically |
| Change schedule or location | Participant/resource dates, travel, daylight, weather exposure and calendar | Finished work and payment history | Show conflicts and costs before confirmation |
| Production event executes | Work, material, cost and calendar status | Unrelated work and reproducible random state | Commit once; rollback failure or explicitly retain staged completed work |
| Cut scene | Cut version, runtime and explicit story dependencies | Source footage, approved screenplay and historical versions | Restore or revise dependency; pickups if needed |
| Change picture lock | Affected sound, captions, effects and delivery tasks | Previously accepted version | Create a revision and price additional work |
| Accept release | Window, version, territory, delivery and deal obligations | Previous release and eligibility history | Reject incompatible commitments; supported cancellation records consequences |
| Submit to institution | Edition/category entry, document version and fee | Prior withdrawn/rejected entries | Unique entry ID; no duplicate fees on replay |
| Release income arrives | Receipt and supported contractual distributions | Reported gross distinct from cash and net | Idempotent settlement and auditable corrections |
| Replace collaborator | Future bookings, affected work and contracts | Credit/pay for work still used | Explicit handover, reshoots and agreed cancellation terms |
| Close/reopen game | Persist exact game instant, choices and future events | RNG, ledger, versions, IDs and histories | No offline advancement; recover newest sound compatible save |

## Technical boundaries

Keep domain transitions independent of screen layout. UI invokes validated actions rather than directly mutating financial or scheduling state. Reuse existing patterns before adding abstractions. Avoid one monolithic universal simulator and avoid one separate engine per genre when shared mechanics suffice.

Never count the same money as available after reservation. Never schedule impossible simultaneous work. Distinguish estimated costs from secured resources. When no candidate exists, report feasibility uncertainty instead of a zero cost. Separate project identity from versions and editions. Future dates may be projected; provenance changes must not silently rewrite completed history.

Multiple projects, multiple tabs, failed loads, interrupted writes, delayed events and stale UI all need clear ownership and idempotency. A successful repeat command must not duplicate characters, contracts, entries, fees, shots or credits.
