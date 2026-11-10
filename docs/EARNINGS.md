# Your Earnings: Whose Money A Project Holds

Written November 10, 2026. Earlier that day, the cycle audit (`docs/INPUT-AUDIT.md`, Cycles That Stopped Short) had
made a delivered project's leftover money available to the next project as **Your Earnings**. `finance.ts` `keepers`
counted everything a delivered project still had uncommitted (`ledgerTotals(p).available`). An unspent grant, an
investor's stake and a co-producer's money all counted, and all were called earnings. That rule was replaced the same
day by the one below. The code is `src/engine/finance.ts`, from `moneyKept` to `moveOwnMoney`.

## The Parts Of A Project's Money

A project's money is the sum of its deals' payments (`funding.fund`), partners recorded before deals existed
(`funding.extra`) and the income it kept (`revenue`). Each part is read from what was recorded, never from the total:

| Part | What it is | Where it is read from |
|---|---|---|
| Production funding | Money backers paid in to make this project | Accepted deals whose `terms.unspent` is `'stays'`, or has no value, plus `funding.extra` |
| Your own money | Money you put in from earlier projects | The `received` of accepted deals whose `terms.unspent` is `'yours'` (Your Earnings, Your Unspent Money) |
| Income kept | What the project earned, after backers' repayments and shares | `revenue`: `receiveIncome` repays each backer's `recoup` first, in signing order, then pays each recouped backer its `incomeShare`, and only what is left is added |
| Held for bills | Lines agreed or held and not yet paid | Reserved and committed obligations, at `amount − settled` |
| Moved out | Your money put into another project | Budget lines whose `ref` is `transfer:<id>:earnings` or `transfer:<id>:capital` |

**Costs.** Everything the project has spent, plus every bill held or agreed and not yet paid, counts as a cost. Moved
money doesn't count. Costs are charged to production funding first, then to your own money, then to income. If income
was taken back (`cancelRelease` subtracts a guarantee), the shortfall is a cost too.

**What is left of each part:**
- production funding left is production funding minus what it paid;
- your unspent money is your own money minus what it paid, minus what was moved;
- your earnings are income kept minus what it paid, minus what was moved.

Each is never below zero. Their sum is the ledger's uncommitted money: `tests/earnings.test.ts` checks
`restricted + capital + earnings = available`.

**What can move.** A project's money can move only once the project is delivered. Only two parts can move: your
earnings, and your unspent money. Each is capped at what the ledger has uncommitted. A project with a move made under
the old rule can't move anything (see Saves, below).

## Terms For Unspent Money, By Arrangement

Every deal made from now on records `terms.unspent`, and the offer shows it before you accept:

| Arrangement | `unspent` | What the offer says |
|---|---|---|
| Starting Backing, Screen Arts Fund Grant, Private Investor, Co-Production Partner, Commissioner | `'stays'` | What the project doesn't spend of it stays with the project. |
| Your Earnings, Your Unspent Money | `'yours'` | What the project doesn't spend of it is yours again once the project is delivered. |
| Any deal made before November 10, 2026, including funding agreed before financing existed | none | Read as `'stays'`. For your own money put in then, the offer says it was put in under the earlier rule. |

A missing term never lets money move.

## Moving Your Money

Your Earnings and Your Unspent Money are separate backers of your own. Each:
- answers at once and never lapses;
- can't be negotiated (`negotiation.ts` `NOT_NEGOTIABLE`);
- has no repayment, share, credit or approval right.

The offer is the smaller of what can move and what is still to raise. The offer's reason names each project the money
comes from, with its amount.

Asking again replaces an unanswered offer of the same kind, which is marked Offer Taken Back. Two offers on one project
never count the same money.

**Accepting.** One transfer, with id `tr-<deal id>`:
1. **The check.** It is refused, with nothing changed, if any project's deal already records that transfer, or any
   project's budget line already carries its ref. A second acceptance, a retry after a reload, or a lost acceptance
   whose lines survived all move nothing.
2. **The amount.** What can move is worked out again, now. If it is less than the offer, the offer is refused with
   nothing changed. This covers an offer made stale by spending, or another project that took the same money first.
3. **Paying out.** The amount is taken from the sources, largest first, ties by project id. Each source pays one
   budget line, `Put Into <project>`: it is held, then paid once with settle key `transfer:<id>`, then closed. If any
   source throws, the lines already added are removed and the id counter is restored.
4. **The record.** The deal records `transfer: { id, sources: [{ projectId, amount }] }`.
5. **The credit.** `acceptDeal` credits the destination once (`funding.fund += amount`).

The money in all projects together is unchanged by a move. Moved money isn't spending: it is left out of the source's
category totals and its Spent line, and shown as Put Into Other Projects.

## On Screen

- **Raise Money.** Your Earnings says how much can go in and from which projects. It says why the rest can't:
  - production funding still in delivered projects, by project;
  - money held for bills;
  - money in projects not yet delivered;
  - a move made under the old rule.

  Your Unspent Money is listed once you have ever put money of your own in.
- **Budget, on a delivered project.** The card What This Project Has Left shows:
  - production funding left;
  - money held for bills;
  - your earnings;
  - your unspent money;
  - what was put into other projects.
- **Backers.** An accepted move says where it came from: "Moved from Tidewater ($11,000)."

## Saves

There is no change to the save version, and nothing is rewritten on load. A save from before this fix is read as it
stands:

- **The old moves stand.** A move made under the old rule is a finance line paid with key `earnings:<deal>`, with no
  ref. It stays as history and counts as a cost of the project it left. Nothing more can move out of that project. Its
  Budget tab and the Raise Money card both say why.
- **Old put-ins stay where they went.** The old rule's Your Earnings deal has no `unspent` term. What it paid in is
  production funding of the project it went into, because the save doesn't record whose money it was.
- **Old deals stay restricted.** Every other deal from before has no `unspent` term, so its unspent money stays with
  its project.

`tests/earnings.test.ts` "saves made under the earlier rule" checks this:
- an old move and an old put-in survive save and load unchanged;
- every ledger total and the total money are the same;
- the save validates;
- the source can't give more.

## Assumptions And What Isn't Modeled

These are simulation assumptions, not industry rules:

- **Cost order.** Costs are charged to production funding before your own money and income.
- **Unspent outside money.** It stays with its project. No arrangement yet makes a backer take back what wasn't spent.
- **Commissioned projects.** The income a commissioned project keeps after the commissioner's 85% is yours.

Personal money outside projects, fees, taxes and company accounts are not modeled (`docs/FIRST-PROJECT-JOURNEY.md`). Your
money stays in your projects and moves between them.

## Evidence

- **Unit tests.** `tests/earnings.test.ts` has 13 tests:
  - unspent restricted funding refused;
  - missing terms read as restricted;
  - income moved as a linked transfer;
  - mixed funding kept apart;
  - repayments and shares paid once;
  - held bills reduce what can move;
  - unspent money kept apart from earnings;
  - competing offers and several sources;
  - stale offers refused with nothing changed;
  - double acceptance, reload and retry;
  - income taken back after it was moved;
  - the old-rule save.

  Mutation-tested by hand: reversing the cost order, dropping the old-rule block, dropping held bills, dropping the stale
  check, dropping the withdrawal of earlier offers, dropping the delivered check and dropping the cap at uncommitted
  each fail at least one of them.
- **Browser journey.** `e2e/earnings.spec.ts` runs on desktop and phone, with world seed 3 pinned:
  - a grant funds a short film, which is made and delivered;
  - Your Earnings is refused while only grant money is left;
  - a distributor's guarantee is accepted;
  - that income goes into the next project, while the grant money stays;
  - both budgets are checked on screen and in the saved game, after a save and reload.
