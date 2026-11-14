# UI and voice

## Navigation and detail hierarchy
Preserve existing navigation where it works. Add coherent destinations: World, Calendar, Sources, Projects, People, Companies, Music, Equipment, Box Office, Box Office Records, Television, Awards & Festivals, Career, Finances, Settings. Do not create all as primary tabs if existing grouping is clearer.

Every catalog card leads to detail: title/person/company identity → relevant credits and relationships → dated history → eligible actions. Person detail links to cast/hire offers, not a disconnected biography. Source detail offers Adapt This Work directly; the player should not create an empty script just to locate adaptation.

Project detail follows Concept → Script → Cast & Crew → Production → Finish → Release → Results, while preserving access to the whole project. Each stage explains missing prerequisites and the impact of changes. Avoid fake completion bars hiding unresolved work.

## Mobile fidelity
Honor the owner's latest choice of desktop-like scaled layout or responsive phone layout; preserve the option if present. Same information architecture, typography family, colors and feature access across devices. A 1280px viewport shrunk onto a phone is not proof of readability. Validate readable text, zoom, touch targets, modal height, scroll restoration, safe areas, focus and actual keyboard behavior. Do not solve overflow by hiding required controls.

Test portrait/landscape at common phone widths including 390, 393, 414, 430 and 440 CSS pixels; verify actual device profiles rather than inventing an iPhone model name. Also cover tablet and desktop. These widths are test targets, not a claim that every device uses them. Wide tables may scroll within labeled containers, while critical actions stay reachable. Text zoom must not trap dialogs.

## Exact voice examples
- “Choose a source” / “Adapt This Work” / “Review Your Adaptation”.
- “This story doesn't identify another character. You can add one or continue.”
- “Your changes affect six scenes. Review the revised schedule before confirming.” Numbers must come from state.
- “The studio passed because its current slate is full.” Only when that is the actual decision reason.
- “Your film earned revenue, but the proceeds are still repaying its backers.”
- “The offer expires on [local date].”
- “The screening starts in [duration].” Actions: “Travel to the screening”, “Review the invitation”, “Decline”. Do not show a travel action if already there.
- “Recorded results through [date]” / “Simulated results from [date]”.
- “No audience figures are available for this reporting period.”
- “You have [amount] available after existing commitments.”

No “stand there,” unexplained “go,” diagnostic jargon or generic motivational filler. Do not claim certainty in forecasts. Title-case headings and buttons follow the actual retained 1221 rules, inspected before implementation; body text uses natural sentence case. Credits and data sources belong in Settings → Credits where provider terms permit. Provider-required attribution must remain wherever required.

## Decision previews
Before committing, show cost, funding source, dates, irreversible work and affected commitments. Afterward show what changed and the next useful action. Expensive changes and cancellation have clear confirmation; ordinary navigation does not. Unsaved draft edits survive routine navigation and catalog refreshes.
