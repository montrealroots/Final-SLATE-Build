# Architecture, Sequence And Completion Contract

## 1. Audit the current game once, then implement
Read AGENTS/CLAUDE instructions, current PR state, types, routes, save migrations and existing audits. Map every editable gameplay field and actionable control to its current engine consumer. Identify where a field is creative prose, identity, structured gameplay input, factual metadata or operational configuration. Produce FIELD-INVENTORY.csv with screen, field, type, current consumer, proposed picker, existing/custom value preservation and test ID. Do not replace names, dates, quantities or exact financial terms with nonsensical preset catalogs. Offer fitting tools: name suggestions, calendar pickers, ranges and contract templates respectively.

Do not keep reopening finished research. Maintain one decision log with verified facts, chosen simulation policies, rejected alternatives that matter, and source dates. One agent only; no subagents or parallel-agent workflows. Ordinary build tools and tests remain permitted.

## 2. Repair foundation before building breadth
Owner mode: keep private TMDB data inaccessible to other players. Default owner-server binding must be loopback; explicitly configured remote owner use requires actual authentication and authorization on every metadata, pack, manifest and image route. A flag, port, hidden URL, CORS rule or browser label is not authentication. Do not ship a hardcoded shared password. Add tests for direct unauthenticated requests and normal public mode. Do not publish private packs or enable a remote host without an authorized deployment configuration.

World consistency: save a minimal versioned simulation profile for each active imported entity, or reference an immutable permitted snapshot with a defined lifecycle. Freeze every input used by decisions: outlet type, past season model, production pace, availability assumptions, audience model and rule version. Saving only the newest recorded season number does not freeze the rest. Later pack updates change reference views without silently changing old careers. Opt-in migration must preview effects, back up saves and never rewrite completed outcomes. Account for provider retention/deletion: derived profiles must not become a workaround to retain prohibited source content indefinitely. Use a documented expiry/migration policy, keeping original simulated decisions separate from expiring source material.

Protect existing earned money accounting; do not restore the old shortcut from leftover funding to personal earnings. Keep the startup budget and first-use measurements. Make all large creative libraries, studios, people and geography shards lazy-loadable.

## 3. One authoritative model and effect pipeline
Use stable entity IDs: TMDB person ID is global, title IDs include media type, real places use source IDs, original generated people use game IDs. A performer on several studio slates is one person with shared commitments. Do not duplicate them per company or per pack.

Suggested bounded domains, adapted to the repository rather than copied blindly:
- Creative library: options, compatibility, provenance, templates and bindings.
- Project brief: applied structured intent with revision history.
- Requirements: scene/episode/asset breakdown derived from the brief.
- Production: task dependencies, people, facilities, locations, calendars and commitments.
- Finance: cost estimates, reservations, cash settlements, ownership and receipts.
- Industry: people, companies, opportunities, contracts and competitors.
- Release and reception: versions, territories, windows, audiences and results.
- Evidence: sources, model versions, effect traces and audit coverage.

For each change run: select → preview validated patch → confirm → write revision → recompute affected requirements → reconcile tasks and reservations → notify affected departments → surface reasons. Use one command path for picker and custom structured input. Rendering must never mutate gameplay state. Preview must be pure. Save only chosen IDs, versions and necessary custom values, never the full catalog.

Effects carry units and provenance. For example, makeup minutes per performer-day, costume duplicates per damage state, travel days per move and storage cost per asset are different dimensions. Each physical requirement has one owner to prevent charging the same stunt, prosthetic or render pass multiple times through genre, style and scene tags. Use dependency invalidation and incremental recomputation; retain paid completed work unless a revision actually invalidates it.

Do not implement universal bonuses such as +10 quality for choosing an expensive preset. Model resources and execution: a demanding look creates work; adequate preparation and suitable personnel help execute it; insufficient time or mismatched material creates a specific risk. Results remain uncertain. A meaningful choice can alter a document or constraint without changing every quality score.

## 4. Changes after approval
Before applying a change, display scope, estimated cost/time change, affected scenes/episodes, affected signed agreements and what requires consent. Keep a reversible draft stage. Once contracts/payments or completed work are affected, create explicit change orders. Do not refund money automatically on undo or erase real commitments. A partial approval applies only to the selected subset. Changing the era must not silently overwrite character identities, chosen destination or music rights.

Custom prose is never claimed to be semantically understood by a deterministic engine. Let the player attach or confirm structured tags; explain which tags are used. No runtime paid AI service is required. Build-time authored/composed suggestions work offline after installation. If future AI is optional, it must propose a patch for player review and use the same validation path.

## 5. Sequential milestones
A. Baseline audit, private-data access repair, stable simulation profiles, regression tests.
B. Shared picker, schema, original starter libraries and input inventory; prove the complete zombie example through delivery.
C. Expand every inventoried creative input and medium-specific pipeline; add controlled comparisons.
D. Real-person identity reconciliation, availability, auditions/hiring, negotiation, contracts, scheduling, payroll and credits.
E. Real destination discovery, scouting, actual shoot-site planning and geography-aware production.
F. Studio strategy, remaining studio imports, regional release plans, competition and careers.
G. Opt-in portraits/posters and pack refresh/storage controls; expand international data coverage.
H. Full connected playthroughs, performance, accessibility, migration and coverage reconciliation.

Each checkpoint is a complete vertical slice with UI, engine, persistence, failure behavior and proof. Commit/push coherent scoped changes; follow standing green-CI merge rules. Never commit credentials or prohibited data. Do not bundle another studio import with an unverified finance or save migration.

## 6. UI pattern
Keep the existing layout. Compact field row: current value, Choose Ideas, Write My Own. Picker has searchable facets, preview and explicit Apply; phone uses a full-width sheet with safe-area spacing, reachable actions, restored focus and no sideways scrolling. Desktop uses the same hierarchy with more columns, not different features. A typed custom value stays when a picker opens/cancels.

Picker tabs: Recommended For This Project, Browse All, Saved Choices. Show why a suggestion fits rather than hiding all alternatives. Cards show a short description, scene/character applicability and consequential requirements. Advanced specifics are progressively disclosed. Filter counts refer to distinct eligible entries, not theoretical products.

Natural copy examples: Choose A Starting Idea; Make It Your Own; Apply To These Scenes; This Changes The Shoot; Keep My Current Choices; Two Costume Changes Need Extra Prep; This Performer Is Already Booked; Send The Offer; Their Reply Is Due Friday. Titles follow repository title-case rules; sentences remain natural. No engine terminology or source dumps in the normal flow; provenance is available under details/credits.
