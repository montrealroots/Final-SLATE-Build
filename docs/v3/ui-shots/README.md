# Screens, Before And After, And Desktop Beside Phone

Captured by `UI_SHOTS=<folder> npx playwright test e2e/ui-coverage.spec.ts --project=phone` on November 12, 2026, and
put side by side. "Before" is the same walk run against `16b8eae`, the commit before the overhaul. Each sheet was
looked at before it was kept. The made-up names and titles are the walk's own.

## A Fix, Before And After (390 pixels wide)

| Sheet | What changed |
| --- | --- |
| `fix-calendar-phone.jpg` | The month's bar no longer wraps as Previous, month, then Next alone; days are wide enough for a thumb; the bar says the date |
| `fix-home-phone.jpg` | Up Next's heading and button share a line, as Projects' do; cards have a phone's margin |
| `fix-character-form-phone.jpg` | A form's boxes one to a row: "Performer As" is no longer cut short |
| `fix-advance-phone.jpg` | Advance To holds short choices and says the date under it |
| `fix-idea-tags-phone.jpg` | An idea's tags are a control's height |
| `fix-world-links-phone.jpg` | A place's name is tall enough to press |
| `fix-bar-date-phone.jpg` | The date and the time zone, under the time |

## Desktop (1280) Beside Phone (390)

`pair-start.jpg`, `pair-creation-review.jpg`, `pair-home.jpg`, `pair-calendar.jpg`, `pair-script.jpg`,
`pair-full-story.jpg`, `pair-characters.jpg`, `pair-cast.jpg`, `pair-schedule.jpg`, `pair-budget.jpg`,
`pair-company.jpg`, `pair-film.jpg`, `pair-saved-games.jpg`, `pair-dialog-compare-draft.jpg`.

A capture is one window's worth of a screen, not the whole page, and an emulated phone, not a real one.
