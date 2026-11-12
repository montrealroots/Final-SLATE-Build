# Full Imported-Catalog Picture Pack

The owner explicitly requests pictures for all imported TMDB people and titles, not a few showcase entries. Implement a complete inventory and a resumable download pipeline for the full installed catalog. Do not download TMDB's entire global database independently of the imported scope.

## Required coverage

For each imported person, retrieve available portrait metadata and at least one suitable primary portrait where available and permitted. For every imported film and TV series retrieve posters and backdrops; for imported seasons retrieve season posters; for imported episodes retrieve available stills. Include available company/network logos from supported sources with their actual provenance, not guessed TMDB endpoints. Full primary-image coverage is required; an optional all-variants tier may retrieve additional languages, sizes and alternates without claiming they are unique entities.

Use an asset manifest keyed by provider, stable entity ID, media kind, original path and content hash. Record source, retrieval date, language, dimensions, selected rendition, attribution/access restrictions and status. Statuses include ready, no-image-published, temporarily-failed, permission-limited, stale, intentionally-excluded-with-reason and not-attempted. Never treat a placeholder as a retrieved image or erase failures to make coverage look complete.

Build a reconciliation report: total eligible entities by type; checked; primary image available; downloaded; reused; unavailable; failed; excluded; remaining. Report portrait/poster coverage separately from backdrop/episode coverage. A complete audit may have genuine unavailable records; a complete download must have no unexplained unattempted records. Repeat fetches must be idempotent.

## Access and provenance

Use the configured TMDB access securely; never put credentials in source control, build output, browser bundles, logs or exported packs. Recheck official API image configuration and usage/attribution/retention requirements before implementation. No claim that an API key transfers image copyright or that noncommercial use automatically permits redistribution. Preserve the existing owner-only boundary; distribution to other users is not authorized by this request.

Source images remain source images; do not generate replacement actor faces or fake posters and label them as TMDB. Use accessible placeholders for unavailable records. Document per-asset rights information when provided and honestly mark unknown details. Keep the game usable when a permitted image cannot be fetched.

## Storage and loading

Preflight storage estimates and capacity before installation. Divide assets into resumable shards by entity type/company with global deduplication so a person credited to several studios downloads once. Allow Download All Available, scoped packs, pause/cancel, resume, retry failures, update and remove. Resume only verified partial work; verify checksums before atomic publication. Preserve the previous installed manifest if replacement fails.

Do not load all images into startup memory or JavaScript. Lazy-load viewport assets, use appropriate thumbnail sizes, bound concurrent requests and retry backoff, respect provider limits, reserve image dimensions, and offer low-data settings. Offline play uses locally installed assets and placeholders for misses. On mobile, never attempt a massive full pack without showing required/free space and receiving the player's install choice.

Keep images separate from saves. Removing pictures preserves people, projects, cast contracts, receipts and credits. Apply the validated retention policy and cancellation cleanly to blobs, manifests, browser caches and server copies; a refresh must not reset simulation state. Never delete unrelated user data to make space.

## UI and tests

Portraits appear on people, casting, hiring and credited-person views; posters on films/series and release/history views; season/episode imagery on the relevant pages. Images supplement natural text and alt text. Maintain stable aspect ratios and no layout shifts, clipped labels or oversized mobile downloads.

Test a real authorized small sample plus synthetic fixtures for missing images, duplicates, 429 responses, interruption, corruption, unavailable storage, refresh and expiry. Then run the full inventory/download operation if access and storage permit. Record full-catalog totals separately from small-sample test evidence. Prove unauthorized clients cannot fetch the manifest or image bytes. No fabricated proof of full download when only fixtures were used.
