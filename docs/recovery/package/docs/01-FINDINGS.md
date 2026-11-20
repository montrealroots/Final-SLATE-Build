# Findings and remaining work

The screenshot mixes four different problems: inaccessible sources, announcements that have not happened, incomplete policy models, and unrun tests. They need different remedies.

| Area | What was recovered | Remaining work |
|---|---|---|
| BAFTA film | Official winners release and full awards page | Full nominee/recipient extraction and repository ID reconciliation |
| BAFTA television | Official television and craft releases | Distinguish ceremonies; expand full nominees and special awards |
| SXSW | Official jury and audience PDFs in the current press archive | Add missing special mentions and recipients; keep jury and audience distinct |
| Locarno | Organizer-attributed secondary report | Direct official confirmation and missing mentions/independent juries |
| TIFF | Secondary reporting with corroborating report | Full official roster and remaining awards; do not promote secondary evidence |
| IDFA | Official indexed November 19 results | Other award streams and full nominees; exact announcement time unavailable |
| International Emmys | Official nominations release and roster endpoint | Full structured extraction; ceremony results are future at cutoff |
| Gothams | Official indexed nomination announcement | Full structured extraction and independent ceremony-date confirmation |
| Blue Dragon | Secondary nominations reporting | Organizer confirmation, other categories, future results |
| European Film Awards | Earlier 2026 ceremony results and next edition's rules/nomination page | Complete category extraction; next ceremony winners are future |
| Immigration | Conditional fee evidence for selected routes | The rest of the 276 country/record estimates and 46 time gaps remain tracked |
| Browser journeys | Specific skip/config obstacles identified | Implement and execute tests; physical Safari requires an appropriate device |
| Box office | Vendor and public regional data routes | Licence, dataset delivery and dated/revision-aware ingestion |

## Important corrections

**Festival end and award announcement are different dates.** IDFA's recovered awards announcement is November 19; waiting for the festival to end loses information already released. Never label all festival awards pending solely from the closing date.

**European Film Awards need an edition key.** The ceremony in January 2026 and the next ceremony in January 2027 are different records. A November 2026 nomination announcement belongs to the latter; it does not make the January 2026 results unannounced.

**An upload folder is not an event date.** SXSW's March releases are now in a URL containing `/2026/10/`. Use dates in the release and official press archive, not the URL path.

**Currency or consular-post differences are not necessarily conflicts.** Serbia's Washington charges are valid evidence for that post, not proof that every embassy should charge the same USD amount. Malawi's two official single-entry prices, however, remain a real unresolved conflict in this package.

**Fee-only verification is useful but incomplete.** Colombia's schedule separates study and issuance. An application can consume a nonrefundable study fee without a visa being issued. That must affect banking and the application lifecycle, not just a displayed price.

**A temporary policy can expire while the game runs.** Sri Lanka's recovered exemption evidence has a stated end date. Store the time interval and require a successor policy rather than silently extending it.

## Repository observations

The inspected `playwright.config.ts` restricts phone WebKit projects to test allowlists. `e2e/journey-a.spec.ts` additionally skips non-desktop projects. Both layers must be addressed before claiming all journeys run on mobile. Configuration alone is insufficient.

Existing historical awards already contain many observations. Import by a stable semantic key and report additions/updates/duplicates; do not overwrite the archive with this selected recovery set.

`src/data/papers/terms.json` largely represents one term per destination. Nationality, location of application, purpose, date and fee component require a richer resolver. Do not paste a post-specific fee into a worldwide country scalar.

These findings are tied to the pinned commit. Compare the latest branch before applying changes; never undo improvements made after this snapshot.
