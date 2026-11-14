# Package validation

Validated on 2026-11-14.

- 12 executable Python reference tests passed. These cover amount parsing, transfers, cash forecasting and calendar dates, plus source-reference integrity.
- All included JSON files parsed successfully. Research source IDs are unique.
- The package includes 22 integration acceptance cases for implementation in the actual game.
- Pinned legacy excerpts are migration evidence, not a complete runnable application.
- No game source was modified, no game CI was run, and no physical phone or game Playwright playthrough was performed for this package.
- Research status and worldwide coverage limits are recorded in 08-COVERAGE-AND-OPEN-RESEARCH.md. Passing reference tests does not establish factual accuracy of legacy data or validate simulated deal prices.
- MANIFEST.json contains file hashes for integrity, not factual verification.
