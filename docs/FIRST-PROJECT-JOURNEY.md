# The First-Project Journey

Audited November 6, 2026 against the code, from character creation through a first finished project into the next one.
Each stage lists what enables it, what it needs and where that comes from, what the player chooses, what changes, and
what becomes possible. "Engine" names the module that enforces it. The journey is played end to end through the UI in
`e2e/first-project.spec.ts` (desktop; the financing screens also on phone).

All four professions are open from the start: the player writes, produces and directs every project, and may act in
it. What the player has to secure is money and people.

| Stage | Enabled by | Needs (and where it comes from) | Player chooses | Afterwards | Next |
| --- | --- | --- | --- | --- | --- |
| Character creation | New Game | Nothing | Name, pronouns, acting title, backgrounds, languages, birth date and place, start date, time and place; any of them again from Review | A life begins at the start place and date (`newGame`) | Home; New Script |
| New project | New Script (Home or Projects) | A title; a production base (any playable place) | Format, medium, runtime, genres, dialogue languages, **budget size** | A project in development with a budget estimate and financing target; **no money** (`createProject`, `finance.ts`) | Write the script |
| Script | The project | Characters, scenes (places, who is in them, minutes); readiness checks (`scriptIssues`) | Story, characters, scenes, drafts; which draft to approve | An approved draft freezes what is breakdown, casting and scheduling input; later drafts keep it until approved (`approveDraft`) | Financing, casting and crew open (each refuses before approval) |
| Financing | An approved script | Backers (`backerOptions`): the agreed starting backing (first project only), an arts grant, a private investor, a co-producer (once something is promised), a commissioner (after a delivered project) | Whom to approach; whether to accept an offer after reading its terms; the financing target | Money arrives only from accepted deals, when the deal says; terms apply from then on: repayment and share of income (`receiveIncome`), approval rights (`approvalRights`), credits (`computeCredits`), a delivery deadline (`finance-deadline`) | Hiring can reserve money |
| Casting | An approved script; money to reserve the offer (`reserve` refuses with the amount short) | People from the world's pool (`roleCandidates`), each with availability, fit notes and a day rate | Who to offer, at what rate; or to cast yourself | Offers hold money; answers arrive over days; backers with casting approval add days to lead offers | Crew; schedule |
| Crew | An approved script; money | The pool, by department (`proposeStaffing`) | Who to hire, or a proposed staffing set | Hires hold and then pay money; departments become able to work | Schedule |
| Schedule | An approved script, not delivered | Shoot days from the approved scenes (`generatePlan`), the base's calendar: holidays by the project's policy, weather forecasts, daylight | Start date; moving or swapping days when weather or conflicts call for it | Shoot days on the calendar; tasks with dependencies (`buildTasks`) | Production |
| Production | A schedule | Hired people available on the day; consent for nonfiction contributors; money for day costs | Respond to weather, holidays, declines and replacements; advance time | Days are shot, partly shot or lost; footage and assets accumulate; money is paid (`workday`, `shoot`) | Edit |
| Edit and delivery | Production work done | An editor; picture approval if a backer holds it | Cut passes; locking picture; delivering | Delivery checks (`deliveryBlockers`): picture locked, tasks finished, consent and redactions, verified claims. Delivery locks credits and quality and pays any money due on delivery (`onProjectDelivered`) | Release, festivals |
| Release | A delivered project | Routes and territories; distributors' offers (minimum guarantees) | Accept an offer, or plan a self-release; cancel a plan (terms stated) | Income goes to backers first, as their deal says, then to the project (`receiveIncome`) | Festivals and awards; the next project |
| Festivals and awards | A delivered project | Editions open to it under their rules (`checkEligibility`) | Where to enter; whether to attend screenings | Entries, selections, results and honors stay in the project's history | The next project |
| The next project | Always | As for the first; the starting backing is spent; a delivered project now satisfies the commissioner and raises what an investor will put in | As above | Every earlier project keeps its credits, releases, entries and results | As above |

## Money, Kept Apart

- **Budget estimate:** what the chosen budget size suggests. Game calibration, not industry prices.
- **Financing target:** what the player aims to raise. It starts at the estimate and can be changed.
- **Promised:** the total of accepted deals.
- **Received:** money actually in the project. It is the only money hiring and production can use.

The **starting backing** is the one preset: an agreed starting scenario, labelled as such. It backs one first project, up
to the low-budget size, once its script is approved, and is repaid first from the project's income.

## Saves From Before Financing

Save version 5 (`migrateV4toV5`) keeps every project's money. Each project's existing fund is recorded as an accepted
deal, "Funding agreed before financing was added", with the approval rights its budget size carried. Nothing is removed.

## Not Modeled

- Personal money, banking, taxes and housing.
- Negotiating a backer's terms.
- More than one approach to the same backer for a project.
