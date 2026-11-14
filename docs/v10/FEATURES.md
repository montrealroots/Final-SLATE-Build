# Every Feature, Proven Or Not

Written by `tests/v10-features.test.ts` from the code; don't edit by hand. A feature is proven only by a played-career
Monte Carlo result in `docs/v10/proof/`: the same seeds played twice, one decision changed, a direct measure and a later
measure in another system both moving with their 95% interval clear of zero.

| Kind | proven | does not bite | no downstream effect | stale | not a feature | not yet proven | All |
|---|---|---|---|---|---|---|---|
| action | 3 | 0 | 0 | 17 | 8 | 130 | 158 |
| bank | 0 | 0 | 0 | 6 | 0 | 48 | 54 |
| scheduled | 0 | 0 | 0 | 2 | 0 | 64 | 66 |
| field | 0 | 0 | 0 | 5 | 0 | 301 | 306 |
| all | 3 | 0 | 0 | 30 | 8 | 543 | 584 |

## Rows

| Feature | Kind | Read by | Status | Proof | What moved, or why |
|---|---|---|---|---|---|
| rsvpScreening | action | src/engine/awards-actions.ts | not yet proven |  |  |
| submitEntry | action | src/engine/awards-actions.ts | stale | enter-awards | measured before the code it reads last changed |
| withdrawEntry | action | src/engine/awards-actions.ts | stale | withdraw-entry | measured before the code it reads last changed |
| execute | action | src/engine/bankworld/core/simulation.ts | not a feature |  | The bank world's dispatcher: every bank command a screen runs goes through it, and each command is its own row. |
| advanceBankWorld | action | src/engine/bankworld/index.ts | not a feature |  | Brings the bank to the game's clock before a bank command runs; time passing is proven through the scheduled rows and the bank commands. |
| bankSim | action | src/engine/bankworld/index.ts | not a feature |  | Reads the bank world for the command that follows; not a decision. |
| setLock | action | src/engine/blueprints.ts | not yet proven |  |  |
| saveIdea | action | src/engine/brief.ts | not yet proven |  |  |
| callBack | action | src/engine/casting-calls.ts | not yet proven |  |  |
| inviteToAudition | action | src/engine/casting-calls.ts | not yet proven |  |  |
| setShortlisted | action | src/engine/casting-calls.ts | not yet proven |  |  |
| shortlistAdvice | action | src/engine/casting-director.ts | not yet proven |  |  |
| startSearch | action | src/engine/casting-director.ts | not yet proven |  |  |
| setBanner | action | src/engine/company.ts | not yet proven |  |  |
| applyBrief | action | src/engine/cues.ts | not yet proven |  |  |
| approveThemes | action | src/engine/cues.ts | not yet proven |  |  |
| editCue | action | src/engine/cues.ts | not yet proven |  |  |
| giveThemeNotes | action | src/engine/cues.ts | not yet proven |  |  |
| approveDesign | action | src/engine/designs-actions.ts | not yet proven |  |  |
| askForDesignChanges | action | src/engine/designs-actions.ts | not yet proven |  |  |
| setFilmedAt | action | src/engine/destinations.ts | not yet proven |  |  |
| applyFix | action | src/engine/directing.ts | not yet proven |  |  |
| showCut | action | src/engine/documentary-actions.ts | not yet proven |  |  |
| requestConsent | action | src/engine/documentary.ts | not yet proven |  |  |
| lockPicture | action | src/engine/edit-actions.ts | stale | lock-picture | measured before the code it reads last changed |
| requestPickups | action | src/engine/edit-actions.ts | not yet proven |  |  |
| restoreToEdit | action | src/engine/edit-actions.ts | not yet proven |  |  |
| startCutPass | action | src/engine/edit-actions.ts | stale | cut-passes | measured before the code it reads last changed |
| unlockPicture | action | src/engine/edit-actions.ts | not yet proven |  |  |
| deliverEpisode | action | src/engine/episode-delivery.ts | not yet proven |  |  |
| lockEpisode | action | src/engine/episode-delivery.ts | not yet proven |  |  |
| startEpisodeCutPass | action | src/engine/episode-delivery.ts | not yet proven |  |  |
| setEpisodeDates | action | src/engine/episode-releases.ts | not yet proven |  |  |
| addToKit | action | src/engine/equipment.ts | not yet proven |  |  |
| buyGear | action | src/engine/equipment.ts | not yet proven |  |  |
| removeFromKit | action | src/engine/equipment.ts | not yet proven |  |  |
| sellGear | action | src/engine/equipment.ts | not yet proven |  |  |
| serviceGear | action | src/engine/equipment.ts | not yet proven |  |  |
| setPackageApproval | action | src/engine/equipment.ts | not yet proven |  |  |
| acceptDeal | action | src/engine/finance.ts | proven | own-money-or-backer (30 seeds) | ownIn -70933.333; backerDeals +2; revenue -73627.267 |
| approachBacker | action | src/engine/finance.ts | proven | own-money-or-backer (30 seeds) | ownIn -70933.333; backerDeals +2; revenue -73627.267 |
| pitchToStudio | action | src/engine/finance.ts | not yet proven |  |  |
| refuseDeal | action | src/engine/finance.ts | not yet proven |  |  |
| setFinanceTarget | action | src/engine/finance.ts | not yet proven |  |  |
| submitSeries | action | src/engine/finance.ts | not yet proven |  |  |
| acceptDistribution | action | src/engine/finish.ts | stale | distributor-or-self | measured before the code it reads last changed |
| cancelRelease | action | src/engine/finish.ts | not yet proven |  |  |
| cutFromEdit | action | src/engine/finish.ts | not yet proven |  |  |
| declineDistribution | action | src/engine/finish.ts | stale | decline-distribution | measured before the code it reads last changed |
| deliver | action | src/engine/finish.ts | stale | deliver | measured before the code it reads last changed |
| planRelease | action | src/engine/finish.ts | stale | release-or-not | measured before the code it reads last changed |
| setReleaseVersion | action | src/engine/finish.ts | not yet proven |  |  |
| acceptFirstLook | action | src/engine/first-look.ts | not yet proven |  |  |
| askMoreOverhead | action | src/engine/first-look.ts | not yet proven |  |  |
| declineFirstLook | action | src/engine/first-look.ts | not yet proven |  |  |
| drawDevelopment | action | src/engine/first-look.ts | not yet proven |  |  |
| endFirstLook | action | src/engine/first-look.ts | not yet proven |  |  |
| considerFor | action | src/engine/guests.ts | not yet proven |  |  |
| considerPerson | action | src/engine/guests.ts | not yet proven |  |  |
| stopConsidering | action | src/engine/guests.ts | not yet proven |  |  |
| treatAsAdult | action | src/engine/guests.ts | not yet proven |  |  |
| acceptCounter | action | src/engine/hiring.ts | stale | counter-offers | measured before the code it reads last changed |
| castPlayer | action | src/engine/hiring.ts | not yet proven |  |  |
| castRoleFor | action | src/engine/hiring.ts | not yet proven |  |  |
| declineCounter | action | src/engine/hiring.ts | stale | counter-offers | measured before the code it reads last changed |
| makeOffer | action | src/engine/hiring.ts | stale | offered-rate | measured before the code it reads last changed |
| releaseHire | action | src/engine/hiring.ts | not yet proven |  |  |
| sendStaffingOffers | action | src/engine/hiring.ts | not yet proven |  |  |
| uncastPlayer | action | src/engine/hiring.ts | not yet proven |  |  |
| withdrawOffer | action | src/engine/hiring.ts | not yet proven |  |  |
| acceptJob | action | src/engine/jobs.ts | stale | outside-work | measured before the code it reads last changed |
| askBetterRate | action | src/engine/jobs.ts | not yet proven |  |  |
| declineJob | action | src/engine/jobs.ts | not yet proven |  |  |
| withdrawJob | action | src/engine/jobs.ts | not yet proven |  |  |
| negotiate | action | src/engine/line-producer.ts | not yet proven |  |  |
| chooseSite | action | src/engine/locations-actions.ts | not yet proven |  |  |
| approveGuideMe | action | src/engine/mandates.ts | not yet proven |  |  |
| endGuideMe | action | src/engine/mandates.ts | not yet proven |  |  |
| approveTake | action | src/engine/mocap.ts | not yet proven |  |  |
| bookMocap | action | src/engine/mocap.ts | not yet proven |  |  |
| cancelMocapBooking | action | src/engine/mocap.ts | not yet proven |  |  |
| requestRetake | action | src/engine/mocap.ts | not yet proven |  |  |
| considerComposer | action | src/engine/music-catalog.ts | not yet proven |  |  |
| licenseRecording | action | src/engine/music-catalog.ts | not yet proven |  |  |
| agreeLicence | action | src/engine/music.ts | not yet proven |  |  |
| declineQuote | action | src/engine/music.ts | not yet proven |  |  |
| renewLicence | action | src/engine/music.ts | not yet proven |  |  |
| replaceWithLibrary | action | src/engine/music.ts | not yet proven |  |  |
| requestLicence | action | src/engine/music.ts | not yet proven |  |  |
| askForBetterTerms | action | src/engine/negotiation-actions.ts | not yet proven |  |  |
| acceptOpportunity | action | src/engine/opportunities.ts | not yet proven |  |  |
| declineOpportunity | action | src/engine/opportunities.ts | not yet proven |  |  |
| applyForPermit | action | src/engine/papers.ts | stale | work-permit | measured before the code it reads last changed |
| applyForRecordedPassport | action | src/engine/papers.ts | not yet proven |  |  |
| applyForVisa | action | src/engine/papers.ts | not yet proven |  |  |
| addStage | action | src/engine/parts.ts | not yet proven |  |  |
| removeStage | action | src/engine/parts.ts | not yet proven |  |  |
| putInOwnMoney | action | src/engine/personal.ts | proven | own-money-or-backer (30 seeds) | ownIn -70933.333; backerDeals +2; revenue -73627.267 |
| takeHome | action | src/engine/personal.ts | stale | take-money-home | measured before the code it reads last changed |
| takeHomeAvailable | action | src/engine/personal.ts | not a feature |  | Reads how much may come home, inside the Take Home action, which is its own row. |
| applyDesignChange | action | src/engine/production.ts | not yet proven |  |  |
| generatePlan | action | src/engine/production/schedule.ts | not yet proven |  |  |
| keepWeatherPlan | action | src/engine/production/shoot.ts | not yet proven |  |  |
| moveShootDay | action | src/engine/production/shoot.ts | not yet proven |  |  |
| swapWithInteriorDay | action | src/engine/production/shoot.ts | not yet proven |  |  |
| setPlannedBudget | action | src/engine/project-budget.ts | not yet proven |  |  |
| addNote | action | src/engine/projects.ts | not yet proven |  |  |
| approveDraft | action | src/engine/projects.ts | not yet proven |  |  |
| assignEpisodeRole | action | src/engine/projects.ts | not yet proven |  |  |
| createProject | action | src/engine/projects.ts | not yet proven |  |  |
| noteFromIssue | action | src/engine/projects.ts | not yet proven |  |  |
| renameDraft | action | src/engine/projects.ts | not yet proven |  |  |
| setNoteStatus | action | src/engine/projects.ts | not yet proven |  |  |
| startRevision | action | src/engine/projects.ts | not yet proven |  |  |
| createFromSource | action | src/engine/proposal.ts | not yet proven |  |  |
| proposeLicence | action | src/engine/release-plan.ts | stale | licence-proposal | measured before the code it reads last changed |
| releaseYourself | action | src/engine/release-plan.ts | stale | self-release-stores | measured before the code it reads last changed |
| setReleasePlan | action | src/engine/release-plan.ts | stale | self-release-stores | measured before the code it reads last changed |
| approachAgent | action | src/engine/representation.ts | not yet proven |  |  |
| declineMandate | action | src/engine/representation.ts | not yet proven |  |  |
| giveNotice | action | src/engine/representation.ts | not yet proven |  |  |
| renewMandate | action | src/engine/representation.ts | not yet proven |  |  |
| signWith | action | src/engine/representation.ts | not yet proven |  |  |
| submitThrough | action | src/engine/representation.ts | not yet proven |  |  |
| rerecordLines | action | src/engine/revisions.ts | not yet proven |  |  |
| reviseAnimatic | action | src/engine/revisions.ts | not yet proven |  |  |
| reviseEffects | action | src/engine/revisions.ts | not yet proven |  |  |
| clearScreenTime | action | src/engine/screen-time.ts | not yet proven |  |  |
| recordScreenTime | action | src/engine/screen-time.ts | not yet proven |  |  |
| moveEpisode | action | src/engine/season.ts | not yet proven |  |  |
| continueProject | action | src/engine/sequel.ts | not yet proven |  |  |
| resumeProject | action | src/engine/shelve.ts | not yet proven |  |  |
| shelveProject | action | src/engine/shelve.ts | not yet proven |  |  |
| attachSong | action | src/engine/song-actions.ts | not yet proven |  |  |
| changeVersionSong | action | src/engine/song-actions.ts | not yet proven |  |  |
| createSong | action | src/engine/song-actions.ts | not yet proven |  |  |
| detachSong | action | src/engine/song-actions.ts | not yet proven |  |  |
| playFirstOverEndCredits | action | src/engine/song-actions.ts | not yet proven |  |  |
| removeSong | action | src/engine/song-actions.ts | not yet proven |  |  |
| restoreVersionSong | action | src/engine/song-actions.ts | not yet proven |  |  |
| setSongPerformers | action | src/engine/song-actions.ts | not yet proven |  |  |
| syncMusicTasks | action | src/engine/song-actions.ts | not a feature |  | Follows a song change with the work it now needs; the song changes are their own rows. |
| syncSongTasks | action | src/engine/song-actions.ts | not a feature |  | Follows a song change with the work it now needs; the song changes are their own rows. |
| addPlan | action | src/engine/state.ts | not yet proven |  |  |
| adoptPlace | action | src/engine/state.ts | not a feature |  | Makes a chosen place known to the world; the place field that chose it is the row. |
| cancelPlan | action | src/engine/state.ts | not yet proven |  |  |
| startSleep | action | src/engine/state.ts | not yet proven |  |  |
| travelTo | action | src/engine/state.ts | not yet proven |  |  |
| chooseTake | action | src/engine/takes-actions.ts | not yet proven |  |  |
| setShotPlan | action | src/engine/takes-actions.ts | not yet proven |  |  |
| formatDateKey | action | src/engine/time.ts | not a feature |  | Formats a date inside a change; not a decision. |
| withdrawRelease | action | src/engine/unscripted.ts | not yet proven |  |  |
| addVersion | action | src/engine/versions.ts | not yet proven |  |  |
| removeVersion | action | src/engine/versions.ts | not yet proven |  |  |
| acceptWriting | action | src/engine/writing-jobs.ts | not yet proven |  |  |
| cancelWriting | action | src/engine/writing-jobs.ts | not yet proven |  |  |
| commissionWriting | action | src/engine/writing-jobs.ts | not yet proven |  |  |
| requestRevision | action | src/engine/writing-jobs.ts | not yet proven |  |  |
| bank.add_standing_order | bank | src/engine/bankworld | not yet proven |  |  |
| bank.arrange_overdraft | bank | src/engine/bankworld | not yet proven |  |  |
| bank.borrow | bank | src/engine/bankworld | stale | bank-loan | measured before the code it reads last changed |
| bank.break_term | bank | src/engine/bankworld | not yet proven |  |  |
| bank.cancel_new | bank | src/engine/bankworld | not yet proven |  |  |
| bank.cancel_scheduled | bank | src/engine/bankworld | not yet proven |  |  |
| bank.cancel_standing_order | bank | src/engine/bankworld | not yet proven |  |  |
| bank.cancel_switch | bank | src/engine/bankworld | not yet proven |  |  |
| bank.claim_unclaimed | bank | src/engine/bankworld | not yet proven |  |  |
| bank.close_current | bank | src/engine/bankworld | not yet proven |  |  |
| bank.close_savings | bank | src/engine/bankworld | not yet proven |  |  |
| bank.debit_overdraft | bank | src/engine/bankworld | not yet proven |  |  |
| bank.new_number | bank | src/engine/bankworld | not yet proven |  |  |
| bank.open_current | bank | src/engine/bankworld | not yet proven |  |  |
| bank.open_savings | bank | src/engine/bankworld | stale | bank-savings | measured before the code it reads last changed |
| bank.open_term | bank | src/engine/bankworld | not yet proven |  |  |
| bank.pay_collections | bank | src/engine/bankworld | not yet proven |  |  |
| bank.reactivate | bank | src/engine/bankworld | not yet proven |  |  |
| bank.redirect_deposits | bank | src/engine/bankworld | not yet proven |  |  |
| bank.repay_loan | bank | src/engine/bankworld | not yet proven |  |  |
| bank.schedule_payment | bank | src/engine/bankworld | not yet proven |  |  |
| bank.set_alerts | bank | src/engine/bankworld | not yet proven |  |  |
| bank.set_loan_repayment | bank | src/engine/bankworld | not yet proven |  |  |
| bank.set_order_source | bank | src/engine/bankworld | not yet proven |  |  |
| bank.set_payments | bank | src/engine/bankworld | stale | credit-card | measured before the code it reads last changed |
| bank.set_primary | bank | src/engine/bankworld | not yet proven |  |  |
| bank.set_round_ups | bank | src/engine/bankworld | not yet proven |  |  |
| bank.set_term_end | bank | src/engine/bankworld | not yet proven |  |  |
| bank.stop_balance_transfer | bank | src/engine/bankworld | not yet proven |  |  |
| bank.switch | bank | src/engine/bankworld | not yet proven |  |  |
| bank.take_overrun_loan | bank | src/engine/bankworld | not yet proven |  |  |
| bank.take_term_interest | bank | src/engine/bankworld | not yet proven |  |  |
| bank.transfer | bank | src/engine/bankworld | stale | bank-savings | measured before the code it reads last changed |
| card.apply | bank | src/engine/bankworld | stale | credit-card | measured before the code it reads last changed |
| card.close | bank | src/engine/bankworld | not yet proven |  |  |
| card.dispute | bank | src/engine/bankworld | not yet proven |  |  |
| card.lock | bank | src/engine/bankworld | not yet proven |  |  |
| card.money_transfer | bank | src/engine/bankworld | not yet proven |  |  |
| card.plan | bank | src/engine/bankworld | not yet proven |  |  |
| card.redeem_rewards | bank | src/engine/bankworld | not yet proven |  |  |
| card.refund_credit | bank | src/engine/bankworld | not yet proven |  |  |
| card.report | bank | src/engine/bankworld | not yet proven |  |  |
| card.request_hardship | bank | src/engine/bankworld | not yet proven |  |  |
| card.request_limit | bank | src/engine/bankworld | not yet proven |  |  |
| card.set_auto_raise | bank | src/engine/bankworld | not yet proven |  |  |
| card.set_autopay_from | bank | src/engine/bankworld | not yet proven |  |  |
| card.set_everyday | bank | src/engine/bankworld | not yet proven |  |  |
| card.set_over_limit | bank | src/engine/bankworld | not yet proven |  |  |
| card.set_statement_day | bank | src/engine/bankworld | not yet proven |  |  |
| cash.deposit | bank | src/engine/bankworld | not yet proven |  |  |
| cash.withdraw | bank | src/engine/bankworld | stale | cash-withdrawal | measured before the code it reads last changed |
| documents.apply_passport | bank | src/engine/bankworld | not yet proven |  |  |
| finance.pay_card | bank | src/engine/bankworld | not yet proven |  |  |
| finance.set_autopay | bank | src/engine/bankworld | not yet proven |  |  |
| agent-answer | scheduled | src/engine/representation.ts | not yet proven |  |  |
| agent-notice-end | scheduled | src/engine/representation.ts | not yet proven |  |  |
| agent-offer-lapse | scheduled | src/engine/representation.ts | not yet proven |  |  |
| agent-renewal | scheduled | src/engine/representation.ts | not yet proven |  |  |
| agent-term-end | scheduled | src/engine/representation.ts | not yet proven |  |  |
| arrive | scheduled | src/engine/state.ts | not yet proven |  |  |
| audience-week | scheduled | src/engine/distribution.ts | not yet proven |  |  |
| audition | scheduled | src/engine/auditions.ts | not yet proven |  |  |
| birthday | scheduled | src/engine/state.ts | not yet proven |  |  |
| box-office-week | scheduled | src/engine/distribution.ts | not yet proven |  |  |
| company-decision | scheduled | src/engine/company.ts | not yet proven |  |  |
| consent-response | scheduled | src/engine/documentary.ts | not yet proven |  |  |
| contributor-cut | scheduled | src/engine/documentary.ts | not yet proven |  |  |
| counter-lapse | scheduled | src/engine/hiring.ts | not yet proven |  |  |
| distribution-offer | scheduled | src/engine/finish.ts | not yet proven |  |  |
| distribution-report | scheduled | src/engine/distribution.ts | not yet proven |  |  |
| edition-announce | scheduled | src/engine/awards.ts | not yet proven |  |  |
| edition-deadline | scheduled | src/engine/awards.ts | not yet proven |  |  |
| edition-deadline-soon | scheduled | src/engine/awards.ts | not yet proven |  |  |
| edition-open | scheduled | src/engine/awards.ts | stale | off-edition-open | measured before the code it reads last changed |
| edition-results | scheduled | src/engine/awards.ts | not yet proven |  |  |
| edition-start | scheduled | src/engine/awards.ts | not yet proven |  |  |
| editions-roll | scheduled | src/engine/awards.ts | not yet proven |  |  |
| episode-release | scheduled | src/engine/episode-releases.ts | not yet proven |  |  |
| family-repayment | scheduled | src/engine/personal.ts | not yet proven |  |  |
| finance-counter | scheduled | src/engine/negotiation.ts | not yet proven |  |  |
| finance-deadline | scheduled | src/engine/finance.ts | not yet proven |  |  |
| finance-decision | scheduled | src/engine/finance.ts | not yet proven |  |  |
| finance-offer-lapse | scheduled | src/engine/negotiation.ts | not yet proven |  |  |
| first-look-check | scheduled | src/engine/first-look.ts | not yet proven |  |  |
| first-look-counter | scheduled | src/engine/first-look.ts | not yet proven |  |  |
| first-look-end | scheduled | src/engine/first-look.ts | not yet proven |  |  |
| first-look-lapse | scheduled | src/engine/first-look.ts | not yet proven |  |  |
| first-look-overhead | scheduled | src/engine/first-look.ts | not yet proven |  |  |
| guide-me | scheduled | src/engine/mandates.ts | not yet proven |  |  |
| industry-decision | scheduled | src/engine/industry.ts | not yet proven |  |  |
| job-counter | scheduled | src/engine/jobs.ts | not yet proven |  |  |
| job-day | scheduled | src/engine/jobs.ts | not yet proven |  |  |
| job-lapse | scheduled | src/engine/jobs.ts | not yet proven |  |  |
| job-offer | scheduled | src/engine/jobs.ts | not yet proven |  |  |
| licence-answer | scheduled | src/engine/music.ts | not yet proven |  |  |
| licence-expiry | scheduled | src/engine/music.ts | not yet proven |  |  |
| offer-response | scheduled | src/engine/hiring.ts | not yet proven |  |  |
| opportunity | scheduled | src/engine/opportunities.ts | not yet proven |  |  |
| opportunity-expire | scheduled | src/engine/opportunities.ts | not yet proven |  |  |
| papers-decision | scheduled | src/engine/papers.ts | stale | work-permit | measured before the code it reads last changed |
| papers-expiry | scheduled | src/engine/papers.ts | not yet proven |  |  |
| papers-passport | scheduled | src/engine/papers.ts | not yet proven |  |  |
| permit-decision | scheduled | src/engine/papers.ts | not yet proven |  |  |
| plan-reminder | scheduled | src/engine/state.ts | not yet proven |  |  |
| plan-start | scheduled | src/engine/state.ts | not yet proven |  |  |
| production-confirm | scheduled | src/engine/productions.ts | not yet proven |  |  |
| production-release | scheduled | src/engine/productions.ts | not yet proven |  |  |
| release | scheduled | src/engine/finish.ts | not yet proven |  |  |
| release-licence-answer | scheduled | src/engine/release-plan.ts | not yet proven |  |  |
| revision-done | scheduled | src/engine/projects.ts | not yet proven |  |  |
| screening | scheduled | src/engine/awards.ts | not yet proven |  |  |
| screening-reminder | scheduled | src/engine/awards.ts | not yet proven |  |  |
| season-decision | scheduled | src/engine/continuation.ts | not yet proven |  |  |
| shoot-call | scheduled | src/engine/production/shoot.ts | not yet proven |  |  |
| shoot-wrap | scheduled | src/engine/production/shoot.ts | not yet proven |  |  |
| studio-release | scheduled | src/engine/finish.ts | not yet proven |  |  |
| wake | scheduled | src/engine/state.ts | not yet proven |  |  |
| weather-check | scheduled | src/engine/production/shoot.ts | not yet proven |  |  |
| work-day | scheduled | src/engine/production/workday.ts | not yet proven |  |  |
| writing-day | scheduled | src/engine/writing-jobs.ts | not yet proven |  |  |
| "Working Title" | field | everywhere a project is named | not yet proven |  |  |
| "Format" | field | proposal.ts proposeFromSource; projects.ts, production/tasks.ts | not yet proven |  |  |
| "Medium" | field | production/tasks.ts buildTasks | not yet proven |  |  |
| {medium === 'hybrid' ? 'Animation Technique For Animated Scenes' : 'Animation Technique'} | field | production/tasks.ts buildTasks | not yet proven |  |  |
| "Episodes" | field | proposal.ts (the season it proposes); projects.ts | not yet proven |  |  |
| {episodic ? 'Target Minutes Per Episode' : 'Target Runtime In Minutes'} | field | proposal.ts (cast and scene count); estimate.ts | not yet proven |  |  |
| {`Name For ${c.name}`} | field | blueprints.ts named, applyBlueprint | not yet proven |  |  |
| "First Name" | field | identity.ts legalName | not yet proven |  |  |
| "Middle Name (Optional)" | field | identity.ts legalName | not yet proven |  |  |
| "Last Name" | field | identity.ts legalName | not yet proven |  |  |
| "Pronouns" | field | state.ts newGame (settledTitle) | not yet proven |  |  |
| "Month" | field | state.ts characterAge, observedBirthday | not yet proven |  |  |
| "Day" | field | state.ts characterAge, observedBirthday | not yet proven |  |  |
| "Year Of Birth" | field | state.ts characterAge, observedBirthday | not yet proven |  |  |
| "Place Of Birth" | field | identity.ts citizenshipOf -> awards.ts nationality rules | not yet proven |  |  |
| "Where You Live" | field | state.ts newGame; projects.ts createProject (base) | not yet proven |  |  |
| "Starting Date" | field | state.ts newGame | not yet proven |  |  |
| "Starting Time" | field | state.ts newGame | not yet proven |  |  |
| "Amount (US Dollars)" | field | personal.ts openInheritance, personalBalance, putInRefusal; cash/money.ts parseAmount | not yet proven |  |  |
| "Describe Your Ethnicity" | field | identity.ts splitBackgrounds | not yet proven |  |  |
| {o.name} | field | projects.ts createProject -> schedule.observances; schedule.ts isWorkingDay | not yet proven |  |  |
| {`${languageName(l.code)} Proficiency`} | field | production/language.ts personLanguagesFit; casting-notes.ts fitNotes | not yet proven |  |  |
| {`Hire The Rental House's Package On A Day The Kit Can't Serve (${money(housePackageFee(p))} A Day)`} | field | production/shoot.ts (a day the kit cannot serve); equipment.ts setPackageApproval | not yet proven |  |  |
| "Film It In" | field | destinations.ts dayPlace, awayCosts, permitWork; production/shoot.ts runShootDay; production/schedule.ts scheduleShootDay | not yet proven |  |  |
| "Kind Of Site" | field | destinations.ts kindFee, permitWork, underCover, noisyDay | not yet proven |  |  |
| "Version" | field | versions.ts addVersion (named and unique); shown where the version is entered | not yet proven |  |  |
| {sceneLabel(p, s)} | field | versions.ts versionScenes | not yet proven |  |  |
| {`${g.label}: ${g.reason}`} | field | edit-actions.ts requestPickups | not yet proven |  |  |
| "Route" | field | finish.ts planRelease; awards.ts qualifying | not yet proven |  |  |
| "Release Date" | field | finish.ts planRelease; awards.ts qualifying windows | not yet proven |  |  |
| "Territory Code" | field | awards.ts; finish.ts | not yet proven |  |  |
| "Which Cut" | field | finish.ts planRelease; music.ts releaseSongs, releaseLicenceRefusal | not yet proven |  |  |
| "Episode Schedule" | field | episode-releases.ts presetDates; finish.ts planRelease | not yet proven |  |  |
| "Episodes On The Premiere" | field | episode-releases.ts presetDates | not yet proven |  |  |
| {`Episode ${i + 2}`} | field | episode-releases.ts episodeDateProblem; awards-rules.ts airing; awards.ts ruledReleaseFits | not yet proven |  |  |
| {`New Date For Episode ${e.number}`} | field | episode-releases.ts setEpisodeDates; release-schedule.ts scheduleChangeEffects | not yet proven |  |  |
| "Project" | field | awards.ts checkEligibility | not yet proven |  |  |
| "Episode To Enter" | field | awards-actions.ts submitEntry; finish.ts assessEpisode | not yet proven |  |  |
| "Song To Enter" | field | awards-rules.ts songProblems | not yet proven |  |  |
| "Version To Enter" | field | awards-actions.ts entrySnapshot | not yet proven |  |  |
| {performerLabel(c)} | field | awards-actions.ts submitEntry | not yet proven |  |  |
| {`What To Capture For ${name}`} | field | mocap.ts bookMocap, sessionCost | not yet proven |  |  |
| {`Version In ${r.territories.map(countryName).join(', ')}`} | field | finish.ts setReleaseVersion, the release handler; distribution.ts territoriesReached, reportedGross | not yet proven |  |  |
| "Development Money From The Deal" | field | first-look.ts drawDevelopment, developmentRefusal, repayTurnaround | not yet proven |  |  |
| {s.label} | field | brief.ts fill | not yet proven |  |  |
| {c.name} | field | brief.ts applyIdea | not yet proven |  |  |
| {`Scene ${i + 1} | field | brief.ts applyIdea | not yet proven |  |  |
| {`${b.intExt === 'EXT' ? 'Exterior' : 'Interior'} | field | brief.ts applyIdea; projects.ts addScene | not yet proven |  |  |
| {`Keep My ${o.label}`} | field | brief.ts applyIdea | not yet proven |  |  |
| "When It Starts" | field | src/ideas/loglines.ts compose; brief.ts applyIdea | not yet proven |  |  |
| "Who It Happens To" | field | src/ideas/loglines.ts compose; brief.ts applyIdea | not yet proven |  |  |
| "What They Must Do" | field | src/ideas/loglines.ts compose; brief.ts applyIdea | not yet proven |  |  |
| "What It Costs" | field | src/ideas/loglines.ts compose; brief.ts applyIdea | not yet proven |  |  |
| "Find A Composer, Artist Or Recording" | field | music-catalog.ts searchMusic | not yet proven |  |  |
| "Their Role" | field | music-catalog.ts searchMusic | not yet proven |  |  |
| "Music Spending Ceiling" | field | mandates.ts guideMePlan, runMandate, guideMeRefusal | not yet proven |  |  |
| "Let The Composer's Themes Stand Without My Review" | field | cues.ts onThemesDone, themesGate; production/workday.ts | not yet proven |  |  |
| "What Music It Has" | field | cues.ts proposeCues, scoreMinutes; production/tasks.ts (post:music, post:score-session) | not yet proven |  |  |
| "The Score's Sound" | field | craft.ts SCORES, scoreSessions; production/tasks.ts | not yet proven |  |  |
| "How Much Of It Is Scored" | field | cues.ts proposeCues, scoreMinutes; production/tasks.ts post:music | not yet proven |  |  |
| "Let The Composer's Themes Stand Without My Review" | field | cues.ts onThemesDone, themesGate; production/workday.ts | not yet proven |  |  |
| {`Intensity Of ${c.code}`} | field | cues.ts editCue (kept through a new proposal) | not yet proven |  |  |
| {LICENCE_MEDIUM_LABELS[m]} | field | music.ts holderFee, releaseLicenceRefusal | not yet proven |  |  |
| "The Whole World" | field | music.ts holderFee, licence-answer (refusal odds, counteroffer), releaseLicenceRefusal | not yet proven |  |  |
| "Countries, By Two-Letter Code" | field | music.ts holderFee, releaseLicenceRefusal | not yet proven |  |  |
| "For How Long" | field | music.ts holderFee, agreeLicence (expiry), licence-expiry | not yet proven |  |  |
| "Your Notes On The Themes" | field | cues.ts giveThemeNotes, themeTasks; song-actions.ts syncMusicTasks | not yet proven |  |  |
| "Treat As An Adult In This Story" | field | guests.ts canApproach -> hiring.ts makeOffer, casting-calls.ts inviteRefusal | not yet proven |  |  |
| "Consider Them For" | field | guests.ts considerFor -> hiring.ts candidatesFor | not yet proven |  |  |
| "Title" | field | the calendar, reminders | not yet proven |  |  |
| "Start Time" | field | state.ts addPlan | not yet proven |  |  |
| "Length In Minutes" | field | production/schedule.ts planShootDays (your commitments) | not yet proven |  |  |
| "Reminder" | field | state.ts addPlan (plan-reminder event) | not yet proven |  |  |
| {`Day Rate For ${c.name}`} | field | hiring.ts resolveOffer | not yet proven |  |  |
| "What To Call It" | field | parts.ts partName: the Cast page, call sheets, offers, credits | not yet proven |  |  |
| "Age In These Scenes (Optional)" | field | minors.ts minorFor (an uncast stage) | not yet proven |  |  |
| {`Episode ${e}`} | field | parts.ts stageIn, partScenes; hiring.ts estimateDays | not yet proven |  |  |
| {sceneLabel(p, s)} | field | parts.ts stageIn, castIn; production/shoot.ts; callsheet.ts; finish.ts | not yet proven |  |  |
| {`Read ${who.name} With`} | field | auditions.ts pairChemistry | not yet proven |  |  |
| {`Writer For Episode ${e.number}`} | field | finish.ts assessEpisode | not yet proven |  |  |
| "Writer" | field | projects.ts assignEpisodeRole; finish.ts computeCredits, assessQuality | not yet proven |  |  |
| {`Director For Episode ${e.number}`} | field | finish.ts assessEpisode; production/schedule.ts blocks | not yet proven |  |  |
| "Director" | field | production/shoot.ts onSetHires; finish.ts computeCredits, assessQuality | not yet proven |  |  |
| "Production Start" | field | production/schedule.ts generatePlan | not yet proven |  |  |
| "Rehearsal Days" | field | production/shoot.ts; hiring.ts (booked days) | not yet proven |  |  |
| "Stop-Motion Stages" | field | production/workday.ts | not yet proven |  |  |
| "Render Nodes" | field | production/workday.ts | not yet proven |  |  |
| "Six-Day Weeks" | field | production/schedule.ts isWorkingDay | not yet proven |  |  |
| "Shoot Episodes In Blocks" | field | production/schedule.ts | not yet proven |  |  |
| "Work On Public Holidays" | field | production/schedule.ts isWorkingDay | not yet proven |  |  |
| {`${c.name} Puppet Copies`} | field | production/schedule.ts; production/workday.ts | not yet proven |  |  |
| {`Emphasis For ${sceneLabel(p, s)}`} | field | takes.ts; directing.ts | not yet proven |  |  |
| {`Camera For ${sceneLabel(p, s)}`} | field | craft.ts craftTime, craftRoles, rigDayCost, takeSpread; takes.ts planTime, recordTakes | not yet proven |  |  |
| {`Coverage For ${sceneLabel(p, s)}`} | field | takes.ts requiredSetups; production/shoot.ts | not yet proven |  |  |
| {`Takes For ${sceneLabel(p, s)}`} | field | takes.ts setupTime | not yet proven |  |  |
| {`Site For ${place}`} | field | locations.ts | not yet proven |  |  |
| {`Backup For ${place}`} | field | locations.ts | not yet proven |  |  |
| "New Planned Budget (US Dollars)" | field | project-budget.ts setPlannedBudget, readiness | not yet proven |  |  |
| "Why" | field | PlanViews.tsx Plan Revisions | not yet proven |  |  |
| "Change Financing Target" | field | finance.ts financeSummary, decide | not yet proven |  |  |
| {`Ask The ${d.backer} For`} | field | negotiation.ts | not yet proven |  |  |
| "Spending Ceiling" | field | mandates.ts guideMePlan, runMandate, guideMeRefusal | not yet proven |  |  |
| "Working Title" | field | everywhere a project is named | not yet proven |  |  |
| "Format" | field | projects.ts, production/tasks.ts, awards.ts | not yet proven |  |  |
| "Medium" | field | production/tasks.ts buildTasks | not yet proven |  |  |
| {medium === 'hybrid' ? 'Animation Technique For Animated Scenes' : 'Animation Technique'} | field | production/tasks.ts buildTasks | not yet proven |  |  |
| "Animation Finish" | field | production/workday.ts (render hours per frame); estimate.ts | not yet proven |  |  |
| "Episodes" | field | projects.ts; production/tasks.ts | not yet proven |  |  |
| {episodic ? 'Target Minutes Per Episode' : 'Target Runtime In Minutes'} | field | awards.ts checkEligibility (running time); estimate.ts | not yet proven |  |  |
| ? | field | genres.ts composeGenres; script-effects.ts competesAs; finish.ts subtitlingCost | not yet proven |  |  |
| "Intended Audience" | field | awards-rules.ts; script-explain.ts audienceContentNote | not yet proven |  |  |
| "Tone" | field | shown in the Story panel | not yet proven |  |  |
| "Competes As" | field | script-effects.ts competesAs | not yet proven |  |  |
| "Story Era" | field | projects.ts deriveRequirements (period research); production/tasks.ts costumes | not yet proven |  |  |
| "Story Setting" | field | shown in the Story panel | not yet proven |  |  |
| ? | field | finish.ts subtitlingCost; awards.ts language rules | not yet proven |  |  |
| "Story Setting Place" | field | projects.ts deriveRequirements; production/tasks.ts | not yet proven |  |  |
| "Production Base" | field | production/schedule.ts isWorkingDay; weather.ts | not yet proven |  |  |
| "Planned Budget (US Dollars)" | field | project-budget.ts setPlannedBudget, budgetPicture, plannedText; finance.ts financeSummary | not yet proven |  |  |
| "Years That Pass In The Story" | field | sequel.ts continueProject | not yet proven |  |  |
| {PLAN_ROUTES[r].label} | field | release-plan.ts setReleasePlan, proposalRefusal, selfRefusal; finish.ts festivalHold | stale | self-release-stores | measured before the code it reads last changed |
| "Plan Territories" | field | release-plan.ts buyerValue, proposeLicence, selfCosts, releaseYourself | not yet proven |  |  |
| "First Public Date" | field | release-plan.ts leadDays, releaseYourself (planRelease date) | not yet proven |  |  |
| "Held For Festivals Until" | field | finish.ts festivalHold in planRelease and acceptDistribution | not yet proven |  |  |
| "Version Abroad" | field | release-plan.ts releaseYourself (finish.ts setReleaseVersion) | not yet proven |  |  |
| "Promotion Budget" | field | release-plan.ts selfCosts; distribution.ts promoLift in reportedGross | stale | promotion-budget | measured before the code it reads last changed |
| {`${label}: Buyer`} | field | release-plan.ts proposeLicence, answerProposal | stale | licence-proposal | measured before the code it reads last changed |
| {`${label}: Your Ask`} | field | release-plan.ts answerProposal | stale | licence-ask | measured before the code it reads last changed |
| {`${label}: Exclusive`} | field | release-plan.ts buyerValue; distribution.ts heldTerritories | stale | licence-exclusive | measured before the code it reads last changed |
| {`Keep My ${c.label}`} | field | blueprints.ts applyBlueprint | not yet proven |  |  |
| {`Keep My ${c.label} And Add None`} | field | blueprints.ts applyBlueprint | not yet proven |  |  |
| "Save Name" | field | the saved games list | not yet proven |  |  |
| "Wake Me For Obligations" | field | state.ts runEvents | not yet proven |  |  |
| "The Light It Is Shot In" | field | craft.ts craftTime, gafferNeeded, cameraTestDays, postFactors; takes.ts planTime; hiring.ts neededRoles; production/tasks.ts buildTasks | not yet proven |  |  |
| "The Score" | field | craft.ts postFactors, scoreSessions; production/tasks.ts buildTasks | not yet proven |  |  |
| {SOUNDS[k].label} | field | craft.ts craftTime, craftRoles, postFactors, dialogueHolds; production/tasks.ts buildTasks; production/shoot.ts needsDialogueReplacement | not yet proven |  |  |
| "Central Question" | field | script-effects.ts documentsNeeded | not yet proven |  |  |
| "Central Question" | field | shown in the Story panel; part of the Statement Of Intent for a documentary | not yet proven |  |  |
| "Synopsis" | field | shown in the Story panel | not yet proven |  |  |
| "Logline" | field | script-effects.ts documentsNeeded | not yet proven |  |  |
| "Premise" | field | script-effects.ts documentsNeeded | not yet proven |  |  |
| "Stakes" | field | script-effects.ts documentsNeeded | not yet proven |  |  |
| "Central Conflict" | field | script-effects.ts documentsNeeded | not yet proven |  |  |
| "Point Of View" | field | script-effects.ts documentsNeeded | not yet proven |  |  |
| "Theme" | field | script-effects.ts documentsNeeded | not yet proven |  |  |
| "Intended Ending" | field | script-effects.ts documentsNeeded | not yet proven |  |  |
| "Intended Experience" | field | shown in the Story panel | not yet proven |  |  |
| "Who It Is For" | field | shown in the Story panel | not yet proven |  |  |
| "How It Is Built" | field | shown in the Story panel | not yet proven |  |  |
| "Tone" | field | shown in the Story panel | not yet proven |  |  |
| "Story Setting" | field | shown in the Story panel | not yet proven |  |  |
| "Competes As" | field | script-effects.ts competesAs | not yet proven |  |  |
| "Source Material" | field | awards-rules.ts (original or adapted screenplay) | not yet proven |  |  |
| "Adapted From" | field | shown with the project | not yet proven |  |  |
| "When It Is Set" | field | awards-rules.ts requirementProblems | not yet proven |  |  |
| "Year It Is Set In" | field | looks.ts periodBand, projectBand; projects.ts deriveRequirements; production/tasks.ts buildTasks | not yet proven |  |  |
| "The Look It Borrows" | field | the Creative Brief card | not yet proven |  |  |
| "Story Setting Place" | field | projects.ts deriveRequirements | not yet proven |  |  |
| {x.label} | field | awards-rules.ts PROJECT_SUBJECTS | not yet proven |  |  |
| {q.label} | field | shown with the genre questions | not yet proven |  |  |
| "Draft Name" | field | drafts list | not yet proven |  |  |
| "Draft Name" | field | drafts list | not yet proven |  |  |
| {`"${x.title}" In This Scene`} | field | songs.ts songUses; projects.ts deriveRequirements | not yet proven |  |  |
| "Interior Or Exterior" | field | production/shoot.ts (weather) | not yet proven |  |  |
| "Place" | field | production/schedule.ts groupShootDays | not yet proven |  |  |
| "Time Of Day" | field | production/rates.ts dayFees | not yet proven |  |  |
| "Estimated Minutes" | field | production/schedule.ts sceneLoad; finish.ts runtime | not yet proven |  |  |
| "Kind" | field | projects.ts deriveRequirements (interview, archival) | not yet proven |  |  |
| "Basis" | field | projects.ts scriptIssues (sourced needs a fact) | not yet proven |  |  |
| "Technique For This Scene" | field | projects.ts sceneTechnique; production/tasks.ts | not yet proven |  |  |
| "Act" | field | structure.ts structureNotes | not yet proven |  |  |
| "Tonal Intention" | field | projects.ts scriptIssues (tonal genres note a missing one) | not yet proven |  |  |
| "Who Is Recording" | field | projects.ts scriptIssues (found footage) | not yet proven |  |  |
| {c.name} | field | projects.ts deriveRequirements; hiring.ts estimateDays | not yet proven |  |  |
| {`${c.name}'s Look In This Scene`} | field | looks.ts stateIn, statesUsed, costumeCopies, changeMinutes, makeupShare | not yet proven |  |  |
| {c.name} | field | projects.ts deriveRequirements (interviews, consent) | not yet proven |  |  |
| {e.claim.slice(0, 50)} | field | projects.ts scriptIssues | not yet proven |  |  |
| "Objective" | field | projects.ts scriptIssues (advisory note when empty) | not yet proven |  |  |
| {nonfiction ? 'What Happens' : 'Action'} | field | shown on the scene | not yet proven |  |  |
| "Turning Point" | field | shown on the scene | not yet proven |  |  |
| "Essential To The Story" | field | finish.ts (cutting it costs the edit); cost-cuts.ts | not yet proven |  |  |
| "Props" | field | projects.ts deriveRequirements; production/tasks.ts | not yet proven |  |  |
| "Animals" | field | projects.ts deriveRequirements; production/tasks.ts | not yet proven |  |  |
| "Vehicles" | field | projects.ts deriveRequirements; production/tasks.ts | not yet proven |  |  |
| "Stunts" | field | projects.ts deriveRequirements; production/tasks.ts | not yet proven |  |  |
| "Crowd Size" | field | production/rates.ts (crowd day rate) | not yet proven |  |  |
| "Crowd Makeup" | field | looks.ts chairMinutes, makeupDayCost; production/shoot.ts runShootDay | not yet proven |  |  |
| "Extend The Crowd In Post" | field | looks.ts physicalCrowd, digitalCrowd; production/tasks.ts buildTasks; production/schedule.ts sceneLoad | not yet proven |  |  |
| "Visual Effects" | field | projects.ts deriveRequirements; production/tasks.ts | not yet proven |  |  |
| "Dance" | field | projects.ts deriveRequirements | not yet proven |  |  |
| "Intimate Scene" | field | projects.ts deriveRequirements | not yet proven |  |  |
| "Water Work" | field | projects.ts deriveRequirements | not yet proven |  |  |
| "Intentional Discontinuity" | field | projects.ts scriptIssues | not yet proven |  |  |
| "Speaker" | field | projects.ts scriptIssues; finish.ts | not yet proven |  |  |
| "Line" | field | script-explain.ts spokenMinutes (a guide only) | not yet proven |  |  |
| {o.label} | field | season.ts sharedFactImpact | not yet proven |  |  |
| "Rule" | field | season.ts | not yet proven |  |  |
| "Limit Or Cost" | field | season.ts | not yet proven |  |  |
| "Rule" | field | season.ts | not yet proven |  |  |
| "Limit Or Cost" | field | season.ts | not yet proven |  |  |
| "Season Arc" | field | sequel.ts continueProject (carried into the next season) | not yet proven |  |  |
| "What An Episode Does" | field | season.ts setSeriesPlan; shown in the season plan | not yet proven |  |  |
| "How Its People Change" | field | season.ts setSeriesPlan; shown in the season plan | not yet proven |  |  |
| "Places It Returns To" | field | season.ts setSeriesPlan; shown in the season plan | not yet proven |  |  |
| "How It Goes On Or Ends" | field | season.ts setSeriesPlan; shown in the season plan | not yet proven |  |  |
| {`Title Of Episode ${n}`} | field | shown wherever an episode is named | not yet proven |  |  |
| {`What Episode ${n} Moves`} | field | shown in the season plan | not yet proven |  |  |
| "New Act Or Sequence" | field | structure.ts | not yet proven |  |  |
| {o.label} | field | structure.ts structureNotes; threadCutConsequences | not yet proven |  |  |
| {c.name} | field | structure.ts structureNotes | not yet proven |  |  |
| {`How ${t.name} Ends`} | field | structure.ts | not yet proven |  |  |
| "New Thread" | field | structure.ts | not yet proven |  |  |
| "Reference" | field | research.ts | not yet proven |  |  |
| "Status" | field | research.ts researchNotes | not yet proven |  |  |
| {sceneLabel(p, s)} | field | research.ts researchNotes | not yet proven |  |  |
| "New Question" | field | research.ts | not yet proven |  |  |
| "Planted In" | field | script-effects.ts; finish.ts edit consequences | not yet proven |  |  |
| "Pays Off In" | field | script-effects.ts; finish.ts edit consequences | not yet proven |  |  |
| "What Is Set Up" | field | shown with the setup | not yet proven |  |  |
| "Kind" | field | projects.ts deriveRequirements (clue props) | not yet proven |  |  |
| "First Character" | field | season.ts sharedFactImpact | not yet proven |  |  |
| "Second Character" | field | season.ts sharedFactImpact | not yet proven |  |  |
| "Relationship" | field | shown in the season plan | not yet proven |  |  |
| "Where It Starts" | field | shown in the season plan | not yet proven |  |  |
| "Where It Ends" | field | shown in the season plan | not yet proven |  |  |
| "Relationship" | field | shown in the season plan | not yet proven |  |  |
| "Where It Starts" | field | shown in the season plan | not yet proven |  |  |
| "Where It Ends" | field | shown in the season plan | not yet proven |  |  |
| "Claim" | field | projects.ts deriveRequirements (fact-check) | not yet proven |  |  |
| "Status" | field | projects.ts deriveRequirements | not yet proven |  |  |
| "Source Note" | field | shown with the fact | not yet proven |  |  |
| "Contributor Name" | field | credits, consent | not yet proven |  |  |
| "Who They Are" | field | shown with the contributor | not yet proven |  |  |
| "What It Is About" | field | documentary.ts proposeDocumentaryPlan (the questions it writes) | not yet proven |  |  |
| "Kind Of Subject" | field | documentary.ts proposeDocumentaryPlan | not yet proven |  |  |
| "Note" | field | projects.ts startRevision | not yet proven |  |  |
| "Area" | field | shown with the note | not yet proven |  |  |
| "About" | field | the notes list | not yet proven |  |  |
| "Character Name" | field | everywhere a part is named | not yet proven |  |  |
| "Give Their Scenes, Lines And Relationships To" | field | projects.ts archiveCharacter | not yet proven |  |  |
| "Scene" | field | structure.ts beatsIn | not yet proven |  |  |
| "What Changes" | field | structure.ts | not yet proven |  |  |
| "New Character's Name" | field | projects.ts splitCharacter | not yet proven |  |  |
| {sceneLabel(p, s)} | field | projects.ts splitCharacter | not yet proven |  |  |
| "Name" | field | everywhere a part is named | not yet proven |  |  |
| "Role Size" | field | script-effects.ts castPlacement; hiring.ts | not yet proven |  |  |
| "Entity" | field | projects.ts deriveRequirements; production/shoot.ts | not yet proven |  |  |
| "Realized As" | field | projects.ts deriveRequirements; production/shoot.ts | not yet proven |  |  |
| "Puppet Face" | field | production/tasks.ts (sm:faces, sm:armature, sm:animation); rates.ts FACE_METHODS | not yet proven |  |  |
| "Also Called" | field | shown with the part in casting | not yet proven |  |  |
| "Pronouns" | field | script-explain.ts characterPronouns | not yet proven |  |  |
| "Speaks" | field | production/language.ts personLanguagesFit | not yet proven |  |  |
| "Awards Placement" | field | script-effects.ts castPlacement | not yet proven |  |  |
| "Series Involvement" | field | hiring.ts estimateDays; finish.ts computeCredits | not yet proven |  |  |
| {title(f)} | field | awards-rules.ts isNarrator; hiring.ts estimateDays | not yet proven |  |  |
| {title(m)} | field | hiring.ts; production | not yet proven |  |  |
| "What Kind Of Being" | field | shown to design and casting | not yet proven |  |  |
| "Description" | field | script-explain.ts breakdownComplete | not yet proven |  |  |
| "Wants" | field | script-explain.ts breakdownComplete | not yet proven |  |  |
| "Fears" | field | script-explain.ts breakdownComplete | not yet proven |  |  |
| "Why They Want It" | field | shown with the part | not yet proven |  |  |
| "What Stands In The Way" | field | shown with the part | not yet proven |  |  |
| "What In Them Pulls Against It" | field | shown with the part | not yet proven |  |  |
| "How They Change" | field | shown with the part | not yet proven |  |  |
| "How They Speak" | field | shown with the part | not yet proven |  |  |
| "Makeup" | field | looks.ts makeupShare, makeupDayCost; production/tasks.ts buildTasks; production/schedule.ts groupShootDays; production/shoot.ts runShootDay; callsheet.ts callSheet; hiring.ts neededRoles | not yet proven |  |  |
| "Costume From" | field | looks.ts costumeCopies, wardrobeMismatch; production/tasks.ts buildTasks | not yet proven |  |  |
| "Appearance States" | field | looks.ts statesOf, costumeCopies; production/tasks.ts buildTasks | not yet proven |  |  |
| {`Names Of ${c.name}'s Looks`} | field | looks.ts statesOf, stateNames; brief.ts setLook | not yet proven |  |  |
| "Format Family" | field | unscripted.ts buildTasks | not yet proven |  |  |
| {c.name} | field | unscripted.ts decideCompetition | not yet proven |  |  |
| "Leave Each Episode" | field | unscripted.ts decideCompetition | not yet proven |  |  |
| {`Add Ethnicity For ${who}`} | field | hiring.ts sharedHeritages | not yet proven |  |  |
| {`Add Nationality For ${who}`} | field | hiring.ts | not yet proven |  |  |
| {i.label} | field | script-explain.ts; finish.ts outlet requirements | not yet proven |  |  |
| "Age In Story" | field | story-age.ts storyAge; casting-notes.ts fitNotes; minors.ts minorFor | not yet proven |  |  |
| "Up To" | field | story-age.ts storyAge; casting-notes.ts fitNotes | not yet proven |  |  |
| "Advance To" | field | state.ts processUntil | not yet proven |  |  |
| "Date" | field | state.ts processUntil | not yet proven |  |  |
| "Time" | field | state.ts processUntil | not yet proven |  |  |
| "Wake Up" | field | state.ts startSleep | not yet proven |  |  |
| "Set Wake Time" | field | state.ts startSleep | not yet proven |  |  |
| "Hours Of Sleep" | field | state.ts startSleep | not yet proven |  |  |
| "Set An Alarm" | field | state.ts snooze | not yet proven |  |  |
| {`Replacement Place ${i + 1}`} | field | save.ts repairSave | not yet proven |  |  |
| "Song Title" | field | everywhere a song is named | not yet proven |  |  |
| "Where It Comes From" | field | songs.ts songTasks; awards-rules.ts songProblems | not yet proven |  |  |
| "Lyrics" | field | songs.ts songTasks | not yet proven |  |  |
| "Music By" | field | songs.ts songCredits; awards recipients | not yet proven |  |  |
| "Lyrics By" | field | songs.ts songCredits; awards recipients | not yet proven |  |  |
| "Rights Holder" | field | shown with the song | not yet proven |  |  |
| {`Scene For ${s.title}`} | field | songs.ts songUses | not yet proven |  |  |
| "How It Plays" | field | awards-rules.ts songRuleProblem | not yet proven |  |  |
| "Minutes It Plays" | field | awards-rules.ts songRuleProblem | not yet proven |  |  |
| {`${c.name} Performs ${s.title}`} | field | casting-notes.ts fitNotes; songs.ts songCredits | not yet proven |  |  |
| {`${v.label}: ${sceneLabel(p, sc)}, In Place Of "${song.title}"`} | field | song-actions.ts changeVersionSong | not yet proven |  |  |
| {`${c.name} On Screen (Minutes)`} | field | screen-time.ts shareCheck | not yet proven |  |  |
| {`${c.name} Heard Only (Minutes)`} | field | screen-time.ts screenTotal | not yet proven |  |  |
| "Title For The New Project" | field | opportunities.ts acceptOpportunity | not yet proven |  |  |
| {`What ${name}'s Revision Should Look At`} | field | WritingWork.tsx JobLine | not yet proven |  |  |
| {`Your Note To ${name} (Optional)`} | field | WritingWork.tsx JobLine | not yet proven |  |  |
| {`Ask ${name} For`} | field | writing-jobs.ts writingTerms, acceptedRead | not yet proven |  |  |
| {`Episode For ${name}`} | field | writing-jobs.ts writingTerms, acceptedRead | not yet proven |  |  |
| {`Your Brief For ${name} (Optional)`} | field | WritingWork.tsx JobLine | not yet proven |  |  |
| "Put In From Your Own Money" | field | personal.ts putInOwnMoney, putInRefusal | not yet proven |  |  |
| "Banner Name" | field | company.ts setBanner, productionCredit; FinishViews.tsx credits | not yet proven |  |  |
