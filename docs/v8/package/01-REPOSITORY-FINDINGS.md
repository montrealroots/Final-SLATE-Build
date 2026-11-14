# Repository findings and reuse decisions

## Inspected snapshots
- Final-SLATE-Build: 84775c775b745322510308f940f4c15b12b1bf3a, after PR 91. Selected code files are included.
- SLATE-REBUILD: 88256bfc234cf6f4912b3d53632ca0fdd76720c2. Best evidenced candidate among the banking implementations inspected; contains account engine, ledger, named bank catalog and document registries.
- SLATE: acf1874da57732c9f9408bae8b7846aa2e34f153. Tree inspected; contains the same banking/papers module families. Its full runtime was not compared line by line.
- 1221: repository discovered; package.json read, but recursive listing failed and bank search returned no matches. Its bank implementation was not identified. Do not claim this comparison proved the richest implementation across all four repos.

## Concrete findings
Current first-look.ts lines around 90–95 choose overhead of 1,500/3,500/6,000 and development funds of 25,000/50,000/100,000 from catalog release pace. It uses 30-day months, permits one overhead counter and pays overhead into personal money when no company exists. These are explicit game calibrations. Replace simplistic pricing/selection with scoped capacity and player value; retain accepted contracts in existing saves.
Current personal.ts offers family circumstances and support terms, with Wealthy capped at 150,000. Replace this new-game setup with the fixed inheritance scenario. Keep old obligations in migrated saves; removing their UI is not permission to forgive outstanding loans silently.
Current company.ts has a name, foundation time and postings, plus a universal simulated formation fee of 300. This is not a country-specific registry fee. Expand business identity and responsibility, and do not describe 300 as a real worldwide incorporation cost.
Current ScriptViews.tsx has Story Setting text, Story Setting Place, scene Place, and a separate shooting base. Some represent genuinely different concepts, but the presentation is repetitive. Unify the story-setting editor and distinguish filming logistics later. Preserve values rather than deleting supposedly duplicate fields indiscriminately.
Current script scope preview can say work changes but the estimate stays at the budget-size amount. Remove the budget-tier floor from custom estimates. A budget target and a calculated estimate are different numbers.
The latest reviewed funding readiness check compares projected costs with promised funding. Build a dated liquidity forecast; promises payable on delivery cannot pay today's deposit.
Current CSS contains a scaled layout mode and many responsive rules. This inspection is static, not a screenshot audit. Replace scaled-phone defaults and conflicting overrides with one responsive layout contract and actual browser verification.

## Legacy banking strengths
accounts.ts implements opening requirements, residency, age, deposits, periodic fees, waiver conditions, savings, interest, transfers and overdraft behavior. ledger.ts and core/money provide transferable ideas. It imports the old Context/frame, old events, family means, country types, currencies, cards and rates. It is not drop-in compatible with Final-SLATE-Build.
The compiled legacy bank data has 249 account records across 231 country/territory keys. Its 252-row coverage ledger says 231 researched, 15 blocked and 6 proven. Those are inherited status labels, not this package's fresh verification. Six proven rows are not six extra populated banking markets.
Work rules have 232 country/territory keys and 7 groups; coverage says 232 researched, 14 blocked, 6 proven. Visit rules have 246 destination keys. Group expansion and nationality handling must be ported before consuming these tables. A country key existing does not mean every nationality, purpose or provider is covered.
A dangerous legacy convention: absent bank terms are not charged. In the new model absent means unknown, not free. Distinguish published zero, no applicable fee, incomplete data and modeled fee.

## Adapter plan
Keep the current project's save/events/ledger architecture. Extract normalized facts and pure calculations; replace legacy imports with adapters. Map currencies by ISO identifiers and minor-unit exponents; map jurisdictions by canonical IDs, with territories/disputed/historical entries recorded explicitly. Retain source IDs and dates. Port account operations into atomic command transactions. Do not import old family means or tax modules. Include legal-person/product eligibility so a consumer bank account is not automatically offered to an incorporated company.
Repository-reference files are excerpts for inspection and migration, with original headers retained. They are not independently verified legal advice or an executable dependency bundle. Remaining imports are listed in the source files; obtain a needed module from the pinned source, rather than guessing its behavior.
