# Coherent script flow and readable phone interface

## Location concepts
One Story Setting editor: “Where Does The Story Take Place?” It combines a real-place selector or fictional-place name, time period/year and optional description. No separate compulsory second question asking the same place. Scene locations reference named story places and their interior/exterior/time-of-day details. A story may span several places and eras.

Production planning later asks “Where Will You Film It?” Choices can include the story place, another actual location doubling for it, a set/soundstage, animation or a mixed technique. Production Base is the operating/logistical home, not automatically the setting or every shoot site. Label it only where relevant. Scriptwriting can start before a filming site is chosen; show logistics as unplanned, not silently authorized.

Defaults: selecting a real story place may suggest it for filming, but never book travel or buy a permit. An adaptation proposes setting/era with evidence; user edits remain editable. Changing filming place updates weather, daylight, travel, accommodation, location permissions, worker authorization and estimated costs. Changing fictional setting affects design/research requirements, not automatically legal jurisdiction. If filming choice followed a default and the story changes, ask whether to update it; don't overwrite a deliberate production decision.

Migrate existing Story Setting text and settingPlaceId into one editor with both retained. If text and place disagree, preserve text and show a one-time review. Keep scene heading.place as scene-local name; migrate duplicated storyLocation only when demonstrably equivalent. Keep IDs and approved drafts stable. Preview schedule and cost changes before reapproval.

## Screen hierarchy
Home → Projects → project Overview, Script, Cast, Crew, Production, Budget, Release, Awards. Money view contains personal accounts, transfers, pending payments and statements; company view contains entity/banner, company accounts, slate, obligations and deals. Do not expose unused shell systems. Create Project asks format, title/source and optional planning budget; elaborate budgeting lives in Budget, not repeated across script pages.

Phone uses the same information architecture and visual identity, with stacked cards, a compact header, reachable navigation and progressively disclosed details. No transform:scale or page zoom used to cram desktop into phone width. Remove persisted scaled-mode preference for phone through a reversible migration/default reset, explaining “Phone layout updated for readability.” Preserve desktop settings independently.

## Concrete layout contract (design targets)
Base text 16 CSS px, readable line height around 1.45–1.6; controls at least 44 CSS px high as a design target. W3C's minimum target criterion is not being quoted as 44. Inputs use at least 16px font on phone. Content width fluid; min-width:0 on flex/grid children; wrap long names and amounts intentionally. Use single-column forms below content-driven breakpoints; two columns only when labels and values fit comfortably. Do not hide overflow to conceal missing controls.

Budget amounts show currency separately and wrap cleanly; a detail view exposes full values. Tables turn into labeled cards where comparison still works; truly two-dimensional data can use a local scroll region with visible affordance and accessible headings. Calendar offers a phone agenda; month view remains optional. Sticky actions cannot cover content or keyboard focus. Account for safe-area insets and virtual keyboard; dialogs fit dynamic viewport height with reachable close/confirm actions.

Preserve button names, field labels and action availability across layouts. No hover-only essential actions. Keyboard, focus order, screen-reader labels and reduced motion all matter. Display sources in Credits unless required attribution specifies otherwise; validation errors say how to fix the actual field.

## Required viewport checks
320, 375, 390, 393, 414, 430 CSS px portrait; phone landscape; tablet; 1280 and 1440 desktop. Confirm every major screen at large text/zoom and with long localized names, many accounts and $25m+ balances. W3C Reflow targets 320 CSS px equivalent for ordinary vertical content. Test input with the virtual keyboard on a physical device where possible; WebKit emulation does not prove real iOS keyboard behavior.

Playwright journey: create age-19 life → inspect inherited cash → enter 20,000 budget → fund project → choose fictional setting and separate real filming place → compare deadline/permission/cash requirements → make/release work → receive payout → inspect project/company/personal money → negotiate deal → enter awards → see one result history. Every click must have a persistent, observable effect. Save screenshots for before/after review and check no horizontal page overflow, overlaps or hidden primary actions.
