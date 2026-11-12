# The Owner's Brief: Phone Overhaul And Whole-Game UI Cleanup

Given with the v3 package on November 12, 2026, in the owner's words. Kept here so a later session reads the request
itself, not a summary of it.

**Design goal.** The phone version must look and feel like the desktop version adapted to a phone, not a separate
design. Preserve the same visual identity, page structure, section order, information hierarchy, typography system,
colors, controls, images and available actions. Use the current desktop UI as the reference. Where the phone requires
adaptation, reflow columns, stack panels or adapt navigation while keeping equivalent content and functionality. Do not
shrink the entire desktop page, hide essential information or remove features to make it fit.

1. **Audit the entire UI.** Inventory every screen, tab, panel, dialog, drawer, menu, form, picker, table, notification
   and loading, error and empty state: startup and creation, scripts, characters, casting, crew, companies, catalogs,
   pictures, calendars, production, finances, releases, audiences, awards and settings, wherever implemented. Track
   desktop/mobile parity and defects in a UI coverage matrix. Audit the v3 features as they are added. Do not declare
   the overhaul complete after fixing only the main screens.
2. **Build a consistent responsive foundation.** Shared components and design tokens for spacing, typography, control
   heights, borders, corners, shadows and alignment. Consolidate conflicting styles rather than adding page-specific
   overrides. Every layout has an intentional sizing and wrapping strategy: flex/grid minimum widths, long text, nested
   panels, image aspect ratios. No fixed heights that clip, no blanket overflow hiding, no absolute positioning to force
   form alignment. Match the desktop's proportions within the phone's width; consistent gutters; safe areas; portrait
   and landscape.
3. **Clean up every visual defect:** bleeding outside containers; overlap and wrong stacking; misaligned labels,
   inputs, buttons, icons and section edges; inconsistent control heights, padding, spacing and corners; clipped text
   and broken wrapping; accidental page-wide sideways scrolling; sticky headers or bottom controls covering content;
   dialogs beyond the viewport or losing their buttons; layout shifts as pictures, fonts or data load; tables, tabs and
   navigation unusable on phones. Deliberate contained sideways scrolling only for a genuinely wide table, made
   discoverable, with the page itself fitted.
4. **Phone interaction must work.** Every desktop action available; tap and keyboard alternatives to hover;
   comfortable touch targets; inputs visible when focused; dialogs and forms scroll to their actions; text, selection
   and scroll position kept through rerenders. Virtual-keyboard behavior checked on real devices when available;
   emulation is not proof. Text enlargement, zoom, reduced motion, focus. No viewport setting that prevents zoom.
5. **Verify desktop and phone parity** with Playwright on desktop Chromium, phone Chromium and WebKit profiles for
   iPhone 15 Plus and Pro Max, plus narrower widths, larger phones and landscape. For each inventoried screen: reach it
   through working UI; compare content, section order and actions; capture and inspect screenshots in both layouts;
   assert bounds; check overlap, overflow, clipping, alignment; exercise menus, dialogs, tabs, forms, image loading;
   test long titles and names, large lists, missing images, errors, empty and populated states. Run complete film and
   TV career journeys after the overhaul. Add regression tests for the defects fixed. Keep unvisited screens and
   physical-device checks explicitly tracked.
6. **Preserve the game.** No features removed, no gameplay simplified, no engine rules changed, no saves discarded.
   Natural wording and title case kept. No tutorial. Performance budgets kept; large catalogs and media lazy-loaded.
   Desktop layouts verified after shared-component changes.
7. **Delivery.** One agent. Implement, not only audit. Commit and push verified milestones; merge only after required
   CI passes. Finish with the completed screen-by-screen coverage matrix; desktop and phone screenshots of
   representative screens and all major fixes; test results tied to the final commit; remaining defects and unverified
   device behavior, stated precisely. Never "perfect", "all screens checked" or complete parity without the evidence.
