# SLATE Gameplay Depth Package

A complete handoff of the 20-area gameplay-depth map agreed in this conversation, expanded into 100 traceable feature groups, with inner loops, downstream effects and recovery paths. This is a specification and implementation plan, not a runnable game or a claim that every conceivable filmmaking detail is covered.

## Use

Attach this ZIP to the Claude session working on Final-SLATE-Build. Paste 07-CLAUDE-START-COMMAND.txt as your message. If attachments cannot be extracted there, unzip into a documentation directory in that repository and point Claude at 00-START-HERE.md. Do not paste this package into the environment setup-script field: it is game-design/build guidance, not a tool installer.

## Contents and reading order

1. 01-GAMEPLAY-DEPTH-SPEC.md — full scope, constraints, 20 areas and 100 feature groups.
2. 02-COVERAGE-LEDGER.csv — every group prefilled; add concrete child requirements and evidence during reconciliation.
3. 03-FEATURE-MODEL.json — the same structured feature map, for tracking; not runtime game data.
4. 04-BUILD-ORDER-AND-CONNECTIONS.md — dependency order, state contracts and no-rebuild rules.
5. 05-PLAYTHROUGHS-AND-ACCEPTANCE.md — normal/failure journeys, mobile checks, integrity, performance and completion gates.
6. 06-RESEARCH-AND-NATURAL-COPY.md — source policy and specific examples of player-facing voice.
7. 07-CLAUDE-START-COMMAND.txt — complete command to send with the ZIP.
8. MANIFEST.json — file sizes and hashes for package integrity.

## Baseline and scope

The most recent code review available when this was prepared was b025147 / PR #38. It reported completed genre-loading recovery, expanded careers and micro-budget changes. These are historical context, not fresh certification: reconcile against latest main and preserve working code.

No repository code, donor repositories, downloaded source datasets, existing setup installers or earlier ZIP packages are bundled. Use the connected repository's current source and existing provenance; do not assume an old UI or world import must be repeated. This package captures the gameplay-depth agreement above and its direct implications, not every feature from unrelated earlier life-sim or wrestling discussions.

The 100 groups are not 100 completed features. Each starts NOT YET RECONCILED, and can expand into many actual controls and transitions. No silent omissions, no artificial numeric effects for every text field, and no claim that adding a screen completes an engine.
