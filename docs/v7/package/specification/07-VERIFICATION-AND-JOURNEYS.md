# Verification and playthroughs

## Required layers
Static checks and production build; focused engine tests; data validators; migration/save tests; deterministic simulation runs; actual UI journeys; accessibility and layout inspection. Existing repository commands are authoritative—discover them rather than assuming a new npm script exists. Verify tools are callable in the current session before claiming their use.

Playwright can operate the interface, collect screenshots, inspect accessibility/DOM state and assert outcomes. It cannot certify real-device keyboard behavior, human enjoyment or external factual truth. Report emulation and physical-device work separately.

## Whole-system journeys
J01 Historical start: start January 1, 2026; open charts/calendar; future winner hidden; announced release visible; advance past release and publication dates; reveal only correct reports; save/reload with no duplicates.
J02 Source to independent feature: choose a researched source; review proposed fields; edit viewpoint; cast real catalog people; finance; book kit; produce; deliver; self-release; collect reports; repay backing; withdraw remaining funds; verify credits/reputation.
J03 One-person source: no forced antagonist; character counts remain valid; production and release complete without fabricated roles. Test a source with no identified people as incomplete, not secretly three people.
J04 Ensemble adaptation: alias merging, multiple leads, age stages and voice/double assignments; change an episode performer without corrupting other credits.
J05 2D animation: animatic revision before animation versus after completed animation; compare actual rework, costs and schedule.
J06 3D animation: rig issue and constrained render capacity; blocked task recovery; delivery date propagation.
J07 Stop motion: physical puppet/set requirement, capture booking, interruption/repair and continuity; no live-action-only assumptions.
J08 Hybrid: live-action/capture/VFX dependencies; changing an approved take invalidates cleanup and produces a clear cost preview.
J09 Documentary: access refused or contributor withdrawn; revise scope without fictional factual claims; proceed through editorial review.
J10 Weekly series: episode schedule, overlapping performer commitments, staggered releases, territory-specific reports, renewal versus planned ending, next-season continuity.
J11 Music: select recorded song and original score route; verify distinct resources, cue versions, revisions, costs and credits; unavailable audio does not prevent metadata gameplay.
J12 First-look film: earn an offer; negotiate; accept; collect overhead once; submit covered project; studio passes; outside deal repays development once; term ends without deleting obligations.
J13 First-look TV: covered-series scope and season obligations; incompatible film opportunity remains outside scope; renewal decision reflects results and capacity.
J14 Distribution: pitch selective real buyer; rejection and recoverable alternate route; self-service destination requirements; territory exclusivity conflict; festival hold; later-window earnings.
J15 Finance stress: insufficient funds, canceled reservation, failed payment, partial backing, company/personal transfer and recoupment. No money creation or negative available balance from duplicate events.
J16 Awards: nomination publication date, ceremony, exact recipient credit, eligibility loss from early release; historical results preserved alongside alternate player competition.
J17 Worldwide schedule: travel, local holiday, weather exposure, daylight, timezone deadline and sleep across events; player cannot work simultaneous bookings.
J18 Catalog and offline: interrupted pack import, duplicate IDs, missing image, low storage, retry/restart and offline save load; no required entity vanishes.
J19 Long career: simulate repeated releases across years; renewals/cancellations, reputation stability, company capacity and record rankings remain coherent; no unbounded event growth.
J20 Phone parity: complete adaptation, casting, negotiations, production approvals and release on phone/WebKit plus desktop; inspect text/zoom/dialogs; preserve unsaved work and navigation.
J21 History boundary: per-dataset cutoff; late report; correction; advance into future simulation; provenance remains clear and historical totals unchanged.
J22 Reputation exploits: repeat award import, reload before negotiation, tiny-budget extreme return, unrelated-role success and repeated credit assignment; no duplicate or universal prestige boost.

## Assertions and negative paths
Fixed seeds pin expected outcomes, not “either success or failure.” Test success and rejection in separate fixtures. When a fixture is intentionally changed, justify the new expectation and preserve coverage of the displaced path. Never remove an assertion solely to pass CI.

Financial tests reconcile source balance, target balance, commitments, settlement and repayment. Scheduling tests cover coincident deadlines, cancellations, leap dates and local time boundaries. Data tests cover missing facts and incompatible metrics. Source tests inspect actual named roles and provenance, not only nonempty strings.

## Performance and acceptance evidence
Measure baseline and changed startup payload, search latency, save size, memory, pack throughput and long advances on the same environment. Set explicit budgets from measured baseline and target devices; do not invent universal millisecond targets. Record failures, not only averages. No full-catalog scan per frame/tick. Capture UI evidence at representative widths and inspect screenshots rather than declaring screenshots taken equals review passed.

For each journey retain code SHA, dataset/model version, seed, environment, steps, assertions, outcome and evidence location. Publish matrix visited/planned separately from behavioral pass/fail. Human playtesting should evaluate clarity, pacing, choice variety and whether the player understands money and next actions.
