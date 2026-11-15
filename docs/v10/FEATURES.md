# Every Feature, Proven Or Not

Written by `tests/v10-features.test.ts` from the code; don't edit by hand. A feature is proven only by a played-career
Monte Carlo result in `docs/v10/proof/`: the same seeds played twice, one decision changed, a direct measure and a later
measure in another system both moving with their 95% interval clear of zero. A name or a record that only a screen
shows (a title, a description) decides nothing, so it is carried rather than proven: its evidence is the test or
journey that shows it there.

| Kind | proven | carried | does not bite | no downstream effect | stale | not a feature | not yet proven | All |
|---|---|---|---|---|---|---|---|---|
| action | 81 | 0 | 0 | 2 | 18 | 8 | 50 | 159 |
| bank | 15 | 0 | 0 | 0 | 0 | 0 | 39 | 54 |
| scheduled | 34 | 0 | 0 | 1 | 4 | 5 | 22 | 66 |
| field | 24 | 14 | 0 | 0 | 9 | 0 | 259 | 306 |
| all | 154 | 14 | 0 | 3 | 31 | 13 | 370 | 585 |

## Rows

| Feature | Kind | Read by | Status | Proof | What moved, or why |
|---|---|---|---|---|---|
| rsvpScreening | action | src/engine/awards-actions.ts | proven | attend-screening (30 seeds) | accepted +6.867; attended +5.367; offers +7.1 |
| submitEntry | action | src/engine/awards-actions.ts | proven | enter-awards (30 seeds) | entries +41.5; selected +4.8 |
| withdrawEntry | action | src/engine/awards-actions.ts | proven | withdraw-entry (30 seeds) | withdrawn +32.8; selected -5.433 |
| execute | action | src/engine/bankworld/core/simulation.ts | not a feature |  | The bank world's dispatcher: every bank command a screen runs goes through it, and each command is its own row. |
| advanceBankWorld | action | src/engine/bankworld/index.ts | not a feature |  | Brings the bank to the game's clock before a bank command runs; time passing is proven through the scheduled rows and the bank commands. |
| bankSim | action | src/engine/bankworld/index.ts | not a feature |  | Reads the bank world for the command that follows; not a decision. |
| setLock | action | src/engine/blueprints.ts | not yet proven |  |  |
| saveIdea | action | src/engine/brief.ts | not yet proven |  |  |
| callBack | action | src/engine/casting-calls.ts | proven | callback (40 seeds) | callbacksSeen +7.35; castCapability +0.563 |
| inviteToAudition | action | src/engine/casting-calls.ts | stale | audition | measured before the code it reads last changed |
| setShortlisted | action | src/engine/casting-calls.ts | proven | callback (40 seeds) | callbacksSeen +7.35; castCapability +0.563 |
| shortlistAdvice | action | src/engine/casting-director.ts | not yet proven |  |  |
| startSearch | action | src/engine/casting-director.ts | not yet proven |  |  |
| setBanner | action | src/engine/company.ts | not yet proven |  |  |
| applyBrief | action | src/engine/cues.ts | proven | music-brief (40 seeds) | cues +4; spent +3758; daysToDeliver +2.1 |
| approveThemes | action | src/engine/cues.ts | proven | approve-themes (40 seeds) | themesApproved +2; delivered +2; released +2; quality.music +59.725 |
| editCue | action | src/engine/cues.ts | proven | edit-cue (40 seeds) | cues -4; spent -5533; daysToDeliver -1.712; quality.music -14.575 |
| giveThemeNotes | action | src/engine/cues.ts | proven | theme-notes (40 seeds) | themeRounds +4; quality.music +4; spent +2608.5; daysToDeliver +3.65 |
| approveDesign | action | src/engine/designs-actions.ts | not yet proven |  |  |
| askForDesignChanges | action | src/engine/designs-actions.ts | not yet proven |  |  |
| setFilmedAt | action | src/engine/destinations.ts | proven | filmed-abroad (40 seeds) | filmedAway +6; spent +17385.9; daysToDeliver +10.85 |
| applyFix | action | src/engine/directing.ts | not yet proven |  |  |
| showCut | action | src/engine/documentary-actions.ts | not yet proven |  |  |
| requestConsent | action | src/engine/documentary.ts | not yet proven |  |  |
| lockPicture | action | src/engine/edit-actions.ts | proven | lock-picture (30 seeds) | delivered -2; released -2; revenue -144950; standing.producing -3.3 |
| requestPickups | action | src/engine/edit-actions.ts | proven | request-pickups (40 seeds) | shootDays +2.675; spent +7538; daysToDeliver +6.863 |
| restoreToEdit | action | src/engine/edit-actions.ts | stale | restore-to-edit | measured before the code it reads last changed |
| startCutPass | action | src/engine/edit-actions.ts | proven | cut-passes (30 seeds) | quality.editing +8; daysToDeliver +3.217; overall +1.1; spent +2898 |
| unlockPicture | action | src/engine/edit-actions.ts | proven | unlock-picture (40 seeds) | daysToDeliver +3; spent +2042.75 |
| deliverEpisode | action | src/engine/episode-delivery.ts | not yet proven |  |  |
| lockEpisode | action | src/engine/episode-delivery.ts | not yet proven |  |  |
| startEpisodeCutPass | action | src/engine/episode-delivery.ts | not yet proven |  |  |
| setEpisodeDates | action | src/engine/episode-releases.ts | not yet proven |  |  |
| addToKit | action | src/engine/equipment.ts | proven | own-kit (40 seeds) | gearOwned +12; kitItems +12; spent -2793.5 |
| buyGear | action | src/engine/equipment.ts | proven | own-kit (40 seeds) | gearOwned +12; kitItems +12; spent -2793.5 |
| removeFromKit | action | src/engine/equipment.ts | proven | remove-from-kit (40 seeds) | kitItems -2; spent +2904.375 |
| sellGear | action | src/engine/equipment.ts | proven | sell-gear (30 seeds) | gearOwned -6; spent +478.367 |
| serviceGear | action | src/engine/equipment.ts | proven | service-gear (30 seeds) | worn -6; kitPostponed -725; lostDays -724.033; daysToDeliver +2.1; spent +42775; money +139614.108 |
| setPackageApproval | action | src/engine/equipment.ts | proven | package-approval (40 seeds) | kitPostponed -729; lostDays -727.4; daysToDeliver +33.563; delivered +2; spent +49743.25 |
| acceptDeal | action | src/engine/finance.ts | proven | own-money-or-backer (40 seeds) | ownIn -72300; backerDeals +2; revenue -65075.175 |
| approachBacker | action | src/engine/finance.ts | proven | own-money-or-backer (40 seeds) | ownIn -72300; backerDeals +2; revenue -65075.175 |
| pitchToStudio | action | src/engine/finance.ts | not yet proven |  |  |
| refuseDeal | action | src/engine/finance.ts | proven | refuse-deal (40 seeds) | refused +1.65; investorIn -61375; ownIn +61375; money +21270.955; leftInProjects -12945.5 |
| setFinanceTarget | action | src/engine/finance.ts | proven | finance-target (40 seeds) | backerIn +38750; leftInProjects +32709.5; money -7180.28; revenue -9014.2 |
| submitSeries | action | src/engine/finance.ts | not yet proven |  |  |
| acceptDistribution | action | src/engine/finish.ts | stale | distributor-or-self | measured before the code it reads last changed |
| cancelRelease | action | src/engine/finish.ts | stale | cancel-release | measured before the code it reads last changed |
| cutFromEdit | action | src/engine/finish.ts | stale | cut-from-edit | measured before the code it reads last changed |
| declineDistribution | action | src/engine/finish.ts | stale | decline-distribution | measured before the code it reads last changed |
| deliver | action | src/engine/finish.ts | stale | deliver | measured before the code it reads last changed |
| planRelease | action | src/engine/finish.ts | stale | release-or-not | measured before the code it reads last changed |
| setReleaseVersion | action | src/engine/finish.ts | stale | release-dubbed | measured before the code it reads last changed |
| acceptFirstLook | action | src/engine/first-look.ts | proven | first-look-accept (30 seeds) | firstLookActive +0.9; money +686273 |
| askMoreOverhead | action | src/engine/first-look.ts | proven | first-look-overhead (40 seeds) | overheadAsked +1.825; overheadAgreed +0.2 |
| declineFirstLook | action | src/engine/first-look.ts | proven | first-look-decline (30 seeds) | firstLookDeclined +1.3; firstLookActive -1.367; money -513714.867 |
| drawDevelopment | action | src/engine/first-look.ts | not yet proven |  |  |
| endFirstLook | action | src/engine/first-look.ts | proven | first-look-end (30 seeds) | firstLookEnded +1.433; money -391398.5 |
| considerFor | action | src/engine/guests.ts | proven | consider-real (40 seeds) | realCast +1.725; castCapability +9.356; performance +7.85; castRates +570.25 |
| considerPerson | action | src/engine/guests.ts | proven | consider-real (40 seeds) | realCast +1.725; castCapability +9.356; performance +7.85; castRates +570.25 |
| stopConsidering | action | src/engine/guests.ts | not yet proven |  |  |
| treatAsAdult | action | src/engine/guests.ts | not yet proven |  |  |
| acceptCounter | action | src/engine/hiring.ts | proven | counter-offers (30 seeds) | countersDeclined +89.333; spent +10760; quality.craft -59.65; overall -58.433; daysToDeliver -33.517 |
| castPlayer | action | src/engine/hiring.ts | proven | cast-yourself (40 seeds) | playerParts +2; castRates -1631.75; spent -5586.75; standing.acting +4.625; overall -0.512 |
| castRoleFor | action | src/engine/hiring.ts | not yet proven |  |  |
| declineCounter | action | src/engine/hiring.ts | proven | counter-offers (30 seeds) | countersDeclined +89.333; spent +10760; quality.craft -59.65; overall -58.433; daysToDeliver -33.517 |
| makeOffer | action | src/engine/hiring.ts | proven | offered-rate (30 seeds) | castRates -208.633; spent -1625.867; countersSeen +0.767; money -17052.633 |
| releaseHire | action | src/engine/hiring.ts | proven | release-hire (40 seeds) | released +2; offersMade +37.975; spent +2481.875 |
| sendStaffingOffers | action | src/engine/hiring.ts | not yet proven |  |  |
| uncastPlayer | action | src/engine/hiring.ts | proven | uncast-yourself (40 seeds) | playerParts -2; castRates +1637; spent +5783.5; standing.acting -4.65; overall +0.525 |
| withdrawOffer | action | src/engine/hiring.ts | proven | withdraw-offer (40 seeds) | withdrawn +2; offersMade +2; castRates +86 |
| acceptJob | action | src/engine/jobs.ts | proven | outside-work (40 seeds) | jobsDone -0.9; jobPay -5206.2; jobsOffered -0.175 |
| askBetterRate | action | src/engine/jobs.ts | proven | ask-better-rate (60 seeds) | ratesAgreed +7.5; jobPay +5917.083 |
| declineJob | action | src/engine/jobs.ts | proven | decline-job (40 seeds) | jobsDeclined +0.95; jobsDone -0.8; jobPay -4354.9 |
| withdrawJob | action | src/engine/jobs.ts | proven | withdraw-job (40 seeds) | jobsWithdrawn +0.9; jobsDone -0.975; jobPay -5139.65 |
| negotiate | action | src/engine/line-producer.ts | not yet proven |  |  |
| chooseSite | action | src/engine/locations-actions.ts | proven | stage-sets (40 seeds) | onStage +6; spent -2240.5; lostDays -1.45; daysToDeliver -1.987 |
| approveGuideMe | action | src/engine/mandates.ts | not yet proven |  |  |
| endGuideMe | action | src/engine/mandates.ts | not yet proven |  |  |
| approveTake | action | src/engine/mocap.ts | not yet proven |  |  |
| bookMocap | action | src/engine/mocap.ts | not yet proven |  |  |
| cancelMocapBooking | action | src/engine/mocap.ts | not yet proven |  |  |
| requestRetake | action | src/engine/mocap.ts | not yet proven |  |  |
| considerComposer | action | src/engine/music-catalog.ts | not yet proven |  |  |
| licenseRecording | action | src/engine/music-catalog.ts | not yet proven |  |  |
| agreeLicence | action | src/engine/music.ts | proven | license-song (40 seeds) | licensed +1.475; released +1.475; revenue +36961.25; spent +2563.25 |
| declineQuote | action | src/engine/music.ts | proven | decline-quote (40 seeds) | licensed -1.525; released -1.525; revenue -37008.625; spent -2333.75 |
| renewLicence | action | src/engine/music.ts | proven | renew-licence (40 seeds) | renewals +0.65; released +0.65; spent +292.5 |
| replaceWithLibrary | action | src/engine/music.ts | proven | library-track (40 seeds) | libraryTracks +2; released +1.95; revenue +131056.25; spent +6899.5 |
| requestLicence | action | src/engine/music.ts | proven | license-song (40 seeds) | licensed +1.475; released +1.475; revenue +36961.25; spent +2563.25 |
| askForBetterTerms | action | src/engine/negotiation-actions.ts | proven | better-terms (40 seeds) | asked +1.525; investorShare -0.137; investorIn -8925; ownIn +8925 |
| acceptOpportunity | action | src/engine/opportunities.ts | proven | accept-opportunity (30 seeds) | proposalsAccepted +0.6; commissioned +0.6; commissionMoney +50240 |
| declineOpportunity | action | src/engine/opportunities.ts | proven | decline-opportunity (30 seeds) | proposalsAccepted -0.533; commissioned -0.533; commissionMoney -39626.667 |
| applyForPermit | action | src/engine/papers.ts | proven | work-permit (100 seeds) | permits +0.99; lateDays -7.11; shootDays -1.13; daysToDeliver -1.35; spent -1678.68; quality.direction +3.745; overall +1.545 |
| applyForRecordedPassport | action | src/engine/papers.ts | not yet proven |  |  |
| applyForVisa | action | src/engine/papers.ts | proven | visitor-visa (30 seeds) | visas +1.067; attended +0.667 |
| moveTo | action | src/engine/papers.ts | proven | move-home (40 seeds) | livesInLondon -1; frenchAccounts +2; bankFees +31.19; overall -0.662; quality.direction -1.237; money -682861.9 |
| addStage | action | src/engine/parts.ts | not yet proven |  |  |
| removeStage | action | src/engine/parts.ts | not yet proven |  |  |
| putInOwnMoney | action | src/engine/personal.ts | proven | own-money-or-backer (40 seeds) | ownIn -72300; backerDeals +2; revenue -65075.175 |
| takeHome | action | src/engine/personal.ts | proven | take-money-home (40 seeds) | leftInProjects +146629.125; money -166082.875 |
| takeHomeAvailable | action | src/engine/personal.ts | not a feature |  | Reads how much may come home, inside the Take Home action, which is its own row. |
| applyDesignChange | action | src/engine/production.ts | not yet proven |  |  |
| generatePlan | action | src/engine/production/schedule.ts | proven | plan-later (40 seeds) | firstShootDay +70; daysToDeliver +67.363 |
| keepWeatherPlan | action | src/engine/production/shoot.ts | proven | weather-keep (60 seeds) | lostDays -1.3; overall +0.208; daysToDeliver -1.883; spent -3092.167 |
| moveShootDay | action | src/engine/production/shoot.ts | proven | weather-move (60 seeds) | lostDays -2.067; daysToDeliver -1.475; spent -4170.5 |
| swapWithInteriorDay | action | src/engine/production/shoot.ts | proven | weather-swap (60 seeds) | lostDays -0.7; daysToDeliver -0.942; spent -2031 |
| setPlannedBudget | action | src/engine/project-budget.ts | proven | plan-budget (40 seeds) | target +80525; ownIn +9000; backerIn +71525; revenue -19359.425; money -21761.218 |
| addNote | action | src/engine/projects.ts | stale | own-notes | measured before the code it reads last changed |
| approveDraft | action | src/engine/projects.ts | stale | second-project | measured before the code it reads last changed |
| assignEpisodeRole | action | src/engine/projects.ts | not yet proven |  |  |
| createProject | action | src/engine/projects.ts | stale | second-project | measured before the code it reads last changed |
| noteFromIssue | action | src/engine/projects.ts | stale | revision-notes | measured before the code it reads last changed |
| renameDraft | action | src/engine/projects.ts | not yet proven |  |  |
| setNoteStatus | action | src/engine/projects.ts | stale | revision-notes | measured before the code it reads last changed |
| startRevision | action | src/engine/projects.ts | stale | revision-notes | measured before the code it reads last changed |
| createFromSource | action | src/engine/proposal.ts | not yet proven |  |  |
| proposeLicence | action | src/engine/release-plan.ts | proven | licence-proposal (30 seeds) | licenceDeals +0.767; revenue -35555; money -37580.067 |
| releaseYourself | action | src/engine/release-plan.ts | proven | self-release-stores (30 seeds) | revenue +38987.667; money +34773.933; spent +2600 |
| setReleasePlan | action | src/engine/release-plan.ts | proven | self-release-stores (30 seeds) | revenue +38987.667; money +34773.933; spent +2600 |
| approachAgent | action | src/engine/representation.ts | proven | agent (40 seeds) | viaAgent +7.1; jobsOffered +7.1; commission +3627.575; jobPay +22883.725 |
| declineMandate | action | src/engine/representation.ts | proven | agent-decline (40 seeds) | viaAgent -6.775; jobsOffered -6.6; jobPay -18802.85 |
| giveNotice | action | src/engine/representation.ts | proven | agent-notice (40 seeds) | viaAgent -5.425; jobsOffered -5.425; jobPay -19731.075; commission -3154.2 |
| renewMandate | action | src/engine/representation.ts | proven | agent-renew (40 seeds) | renewals +3; represented +1; viaAgent +14.05; jobsOffered +14.125; jobPay +68818.3; money +63763.15 |
| signWith | action | src/engine/representation.ts | proven | agent (40 seeds) | viaAgent +7.1; jobsOffered +7.1; commission +3627.575; jobPay +22883.725 |
| submitThrough | action | src/engine/representation.ts | not yet proven |  |  |
| rerecordLines | action | src/engine/revisions.ts | not yet proven |  |  |
| reviseAnimatic | action | src/engine/revisions.ts | not yet proven |  |  |
| reviseEffects | action | src/engine/revisions.ts | not yet proven |  |  |
| clearScreenTime | action | src/engine/screen-time.ts | not yet proven |  |  |
| recordScreenTime | action | src/engine/screen-time.ts | not yet proven |  |  |
| moveEpisode | action | src/engine/season.ts | not yet proven |  |  |
| continueProject | action | src/engine/sequel.ts | not yet proven |  |  |
| resumeProject | action | src/engine/shelve.ts | no downstream effect | shelve-resume (60 seeds) | moved: deliveredDay +51.867. Shelved straight after the script is approved, before anyone is hired, the film is delivered 52 days later and nothing else changes: there are no offers to withdraw, no crew to settle and no days booked, so shelving early costs only time. Within a two-year career the later delivery doesn't show in what the film earns. |
| shelveProject | action | src/engine/shelve.ts | no downstream effect | shelve-resume (60 seeds) | moved: deliveredDay +51.867. Shelved straight after the script is approved, before anyone is hired, the film is delivered 52 days later and nothing else changes: there are no offers to withdraw, no crew to settle and no days booked, so shelving early costs only time. Within a two-year career the later delivery doesn't show in what the film earns. |
| attachSong | action | src/engine/song-actions.ts | proven | add-song (40 seeds) | songs +2; songUses +2; released -2; revenue -111865 |
| changeVersionSong | action | src/engine/song-actions.ts | not yet proven |  |  |
| createSong | action | src/engine/song-actions.ts | proven | add-song (40 seeds) | songs +2; songUses +2; released -2; revenue -111865 |
| detachSong | action | src/engine/song-actions.ts | proven | detach-song (40 seeds) | songUses -2; released +2; revenue +121808.375 |
| playFirstOverEndCredits | action | src/engine/song-actions.ts | not yet proven |  |  |
| removeSong | action | src/engine/song-actions.ts | proven | remove-song (40 seeds) | songs -2; spent -4131.75; daysToDeliver -1.375 |
| restoreVersionSong | action | src/engine/song-actions.ts | not yet proven |  |  |
| setSongPerformers | action | src/engine/song-actions.ts | not yet proven |  |  |
| syncMusicTasks | action | src/engine/song-actions.ts | not a feature |  | Follows a song change with the work it now needs; the song changes are their own rows. |
| syncSongTasks | action | src/engine/song-actions.ts | not a feature |  | Follows a song change with the work it now needs; the song changes are their own rows. |
| addPlan | action | src/engine/state.ts | proven | plan-over-call (40 seeds) | lateDays +1; quality.direction -0.5; overall -0.3 |
| adoptPlace | action | src/engine/state.ts | not a feature |  | Makes a chosen place known to the world; the place field that chose it is the row. |
| cancelPlan | action | src/engine/state.ts | proven | cancel-plan (40 seeds) | lateDays -1; quality.direction +0.638; overall +0.3 |
| startSleep | action | src/engine/state.ts | proven | sleep-through-call (40 seeds) | lateDays +1; quality.direction -0.75; overall -0.237 |
| travelTo | action | src/engine/state.ts | proven | travel-away (40 seeds) | lateDays +3.8; quality.direction -1.862; overall -0.712 |
| chooseTake | action | src/engine/takes-actions.ts | stale | weakest-takes | measured before the code it reads last changed |
| setShotPlan | action | src/engine/takes-actions.ts | proven | full-coverage (40 seeds) | setups +6; shootDays +25.775; spent +84118; quality.direction +2.188; overall +1.113 |
| formatDateKey | action | src/engine/time.ts | not a feature |  | Formats a date inside a change; not a decision. |
| withdrawRelease | action | src/engine/unscripted.ts | not yet proven |  |  |
| addVersion | action | src/engine/versions.ts | stale | add-version | measured before the code it reads last changed |
| removeVersion | action | src/engine/versions.ts | stale | remove-version | measured before the code it reads last changed |
| acceptWriting | action | src/engine/writing-jobs.ts | proven | writing-polish (40 seeds) | passesAccepted +1.925; quality.script +1.888; overall +0.638 |
| cancelWriting | action | src/engine/writing-jobs.ts | proven | writing-cancel (40 seeds) | passesAccepted -1.9; passesCancelled +1.925; quality.script -2.1; overall -0.512; spent -1102.25 |
| commissionWriting | action | src/engine/writing-jobs.ts | proven | writing-polish (40 seeds) | passesAccepted +1.925; quality.script +1.888; overall +0.638 |
| requestRevision | action | src/engine/writing-jobs.ts | proven | writing-revision (80 seeds) | passesWritten +1.9; spent +1432.125 |
| bank.add_standing_order | bank | src/engine/bankworld | proven | standing-order (40 seeds) | interestIn +11501.04; money +15293.933 |
| bank.arrange_overdraft | bank | src/engine/bankworld | not yet proven |  |  |
| bank.borrow | bank | src/engine/bankworld | proven | bank-loan (60 seeds) | interestOut +1722.856; money +10346.895 |
| bank.break_term | bank | src/engine/bankworld | proven | break-term (40 seeds) | accounts -1; interestIn -41099.99; worth -41099.99 |
| bank.cancel_new | bank | src/engine/bankworld | not yet proven |  |  |
| bank.cancel_scheduled | bank | src/engine/bankworld | not yet proven |  |  |
| bank.cancel_standing_order | bank | src/engine/bankworld | proven | cancel-standing-order (40 seeds) | interestIn -8743.03; money -11626.37 |
| bank.cancel_switch | bank | src/engine/bankworld | not yet proven |  |  |
| bank.claim_unclaimed | bank | src/engine/bankworld | not yet proven |  |  |
| bank.close_current | bank | src/engine/bankworld | not yet proven |  |  |
| bank.close_savings | bank | src/engine/bankworld | proven | close-savings (40 seeds) | accounts -1; interestIn -19961; money -25455.788 |
| bank.debit_overdraft | bank | src/engine/bankworld | not yet proven |  |  |
| bank.new_number | bank | src/engine/bankworld | not yet proven |  |  |
| bank.open_current | bank | src/engine/bankworld | proven | open-current (40 seeds) | accounts +1; bankFees +10.81; worth -10.81 |
| bank.open_savings | bank | src/engine/bankworld | proven | bank-savings (40 seeds) | accounts +1; interestIn +19961; money +26543.882 |
| bank.open_term | bank | src/engine/bankworld | proven | term-deposit (40 seeds) | accounts +1; interestIn +41099.99; worth +41099.99 |
| bank.pay_collections | bank | src/engine/bankworld | not yet proven |  |  |
| bank.reactivate | bank | src/engine/bankworld | not yet proven |  |  |
| bank.redirect_deposits | bank | src/engine/bankworld | not yet proven |  |  |
| bank.repay_loan | bank | src/engine/bankworld | not yet proven |  |  |
| bank.schedule_payment | bank | src/engine/bankworld | proven | scheduled-payment (40 seeds) | interestIn +19127.17; money +25435.064 |
| bank.set_alerts | bank | src/engine/bankworld | not yet proven |  |  |
| bank.set_loan_repayment | bank | src/engine/bankworld | not yet proven |  |  |
| bank.set_order_source | bank | src/engine/bankworld | not yet proven |  |  |
| bank.set_payments | bank | src/engine/bankworld | proven | credit-card (40 seeds) | accounts +1; onCard +1; cardPaid +846.28 |
| bank.set_primary | bank | src/engine/bankworld | not yet proven |  |  |
| bank.set_round_ups | bank | src/engine/bankworld | not yet proven |  |  |
| bank.set_term_end | bank | src/engine/bankworld | proven | term-end (30 seeds) | interestIn -58062.09; worth -16962.1 |
| bank.stop_balance_transfer | bank | src/engine/bankworld | not yet proven |  |  |
| bank.switch | bank | src/engine/bankworld | proven | switch-bank (40 seeds) | atFirstBank -2; interestIn +3052.17; worth +3624.89; money +4820.332 |
| bank.take_overrun_loan | bank | src/engine/bankworld | not yet proven |  |  |
| bank.take_term_interest | bank | src/engine/bankworld | not yet proven |  |  |
| bank.transfer | bank | src/engine/bankworld | proven | bank-savings (40 seeds) | accounts +1; interestIn +19961; money +26543.882 |
| card.apply | bank | src/engine/bankworld | proven | credit-card (40 seeds) | accounts +1; onCard +1; cardPaid +846.28 |
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
| cash.withdraw | bank | src/engine/bankworld | proven | cash-withdrawal (40 seeds) | withdrawn +250; paidInCash +250 |
| documents.apply_passport | bank | src/engine/bankworld | not yet proven |  |  |
| finance.pay_card | bank | src/engine/bankworld | not yet proven |  |  |
| finance.set_autopay | bank | src/engine/bankworld | not yet proven |  |  |
| agent-answer | scheduled | src/engine/representation.ts | proven | agent (40 seeds) | viaAgent +7.1; jobsOffered +7.1; commission +3627.575; jobPay +22883.725 |
| agent-notice-end | scheduled | src/engine/representation.ts | proven | agent-notice (40 seeds) | viaAgent -5.425; jobsOffered -5.425; jobPay -19731.075; commission -3154.2 |
| agent-offer-lapse | scheduled | src/engine/representation.ts | not yet proven |  |  |
| agent-renewal | scheduled | src/engine/representation.ts | proven | agent-renew (40 seeds) | renewals +3; represented +1; viaAgent +14.05; jobsOffered +14.125; jobPay +68818.3; money +63763.15 |
| agent-term-end | scheduled | src/engine/representation.ts | proven | agent-renew (40 seeds) | renewals +3; represented +1; viaAgent +14.05; jobsOffered +14.125; jobPay +68818.3; money +63763.15 |
| arrive | scheduled | src/engine/state.ts | proven | travel-away (40 seeds) | lateDays +3.8; quality.direction -1.862; overall -0.712 |
| audience-week | scheduled | src/engine/distribution.ts | proven | off-audience-week (40 seeds) | renewalWait +55.275; renewed -0.425 |
| audition | scheduled | src/engine/auditions.ts | stale | audition | measured before the code it reads last changed |
| birthday | scheduled | src/engine/state.ts | not a feature |  | A notice: it tells the player their age has changed. Age itself is read from the birth date wherever it matters (casting, licences), never from this event; switched off, nothing else changed (docs/v10/proof/off-birthday.json). |
| box-office-week | scheduled | src/engine/distribution.ts | proven | off-box-office-week (30 seeds) | gross +151560; revenue +48225.667; money +48149.4 |
| company-decision | scheduled | src/engine/company.ts | not yet proven |  |  |
| consent-response | scheduled | src/engine/documentary.ts | not yet proven |  |  |
| contributor-cut | scheduled | src/engine/documentary.ts | not yet proven |  |  |
| counter-lapse | scheduled | src/engine/hiring.ts | not yet proven |  |  |
| distribution-offer | scheduled | src/engine/finish.ts | stale | off-distribution-offer | measured before the code it reads last changed |
| distribution-report | scheduled | src/engine/distribution.ts | proven | off-distribution-report (30 seeds) | revenue -92526.5; money -91433.833 |
| edition-announce | scheduled | src/engine/awards.ts | proven | off-edition-announce (40 seeds) | screenings -8.25; offers -7.525 |
| edition-deadline | scheduled | src/engine/awards.ts | proven | off-edition-deadline (30 seeds) | selected -4.8; standing.producing -5.6 |
| edition-deadline-soon | scheduled | src/engine/awards.ts | not a feature |  | A notice: it tells the player an entry deadline is near. The deadline that closes entries is its own system (edition-deadline), proven separately. |
| edition-open | scheduled | src/engine/awards.ts | proven | off-edition-open (30 seeds) | entries -38.633; selected -4.267 |
| edition-results | scheduled | src/engine/awards.ts | no downstream effect | off-edition-results (40 seeds) | moved: finalised -7.275. Career not reached: the careers' shorts almost never reach a final result to win or lose; to prove with careers whose work is selected for competitive categories. |
| edition-start | scheduled | src/engine/awards.ts | proven | off-edition-start (40 seeds) | screenings -8.25; offers -7.05 |
| editions-roll | scheduled | src/engine/awards.ts | proven | off-editions-roll (30 seeds) | editionsOpen -63.733; entries -24.867; selected -2.733 |
| episode-release | scheduled | src/engine/episode-releases.ts | not yet proven |  |  |
| family-repayment | scheduled | src/engine/personal.ts | not yet proven |  |  |
| finance-counter | scheduled | src/engine/negotiation.ts | proven | better-terms (40 seeds) | asked +1.525; investorShare -0.137; investorIn -8925; ownIn +8925 |
| finance-deadline | scheduled | src/engine/finance.ts | not yet proven |  |  |
| finance-decision | scheduled | src/engine/finance.ts | proven | off-finance-decision (30 seeds) | backerIn -30966.667; ownIn +30966.667; money +17144.8 |
| finance-offer-lapse | scheduled | src/engine/negotiation.ts | not yet proven |  |  |
| first-look-check | scheduled | src/engine/first-look.ts | proven | off-first-look-check (40 seeds) | firstLookOffers -1.075; overheadPaid -539890; money -536702.539 |
| first-look-counter | scheduled | src/engine/first-look.ts | proven | first-look-overhead (40 seeds) | overheadAsked +1.825; overheadAgreed +0.2 |
| first-look-end | scheduled | src/engine/first-look.ts | not yet proven |  |  |
| first-look-lapse | scheduled | src/engine/first-look.ts | not yet proven |  |  |
| first-look-overhead | scheduled | src/engine/first-look.ts | proven | first-look-accept (30 seeds) | firstLookActive +0.9; money +686273 |
| guide-me | scheduled | src/engine/mandates.ts | not yet proven |  |  |
| industry-decision | scheduled | src/engine/industry.ts | not yet proven |  |  |
| job-counter | scheduled | src/engine/jobs.ts | proven | ask-better-rate (60 seeds) | ratesAgreed +7.5; jobPay +5917.083 |
| job-day | scheduled | src/engine/jobs.ts | proven | off-job-day (40 seeds) | jobsDone -0.85; jobPay -4210.85 |
| job-lapse | scheduled | src/engine/jobs.ts | not a feature |  | Record-keeping: on an unanswered offer's last day it marks the offer lapsed, for your list and the record. The deadline itself is enforced when you answer (jobs.ts acceptRefusal: "That offer has lapsed."), so with this event switched off an offer still can't be taken late; nothing else reads the mark (docs/v10/proof/off-job-lapse.json). |
| job-offer | scheduled | src/engine/jobs.ts | proven | off-job-offer (40 seeds) | jobsOffered -0.875; jobPay -4103.9 |
| licence-answer | scheduled | src/engine/music.ts | proven | license-song (40 seeds) | licensed +1.475; released +1.475; revenue +36961.25; spent +2563.25 |
| licence-expiry | scheduled | src/engine/music.ts | proven | renew-licence (40 seeds) | renewals +0.65; released +0.65; spent +292.5 |
| offer-response | scheduled | src/engine/hiring.ts | proven | off-offer-response (30 seeds) | hired -16; delivered -2; revenue -127289.5 |
| opportunity | scheduled | src/engine/opportunities.ts | proven | off-opportunity (40 seeds) | opportunities -0.375; commissioned -0.375 |
| opportunity-expire | scheduled | src/engine/opportunities.ts | not a feature |  | Record-keeping: on an unanswered proposal's last day it marks it lapsed, for your list. The deadline is enforced when you answer (opportunities.ts acceptOpportunity checks expiresAt), so with this event switched off a proposal still can't be taken late; nothing else reads the mark (docs/v10/proof/off-opportunity-expire.json). |
| papers-decision | scheduled | src/engine/papers.ts | proven | work-permit (100 seeds) | permits +0.99; lateDays -7.11; shootDays -1.13; daysToDeliver -1.35; spent -1678.68; quality.direction +3.745; overall +1.545 |
| papers-expiry | scheduled | src/engine/papers.ts | not yet proven |  |  |
| papers-passport | scheduled | src/engine/papers.ts | not yet proven |  |  |
| permit-decision | scheduled | src/engine/papers.ts | not yet proven |  |  |
| plan-reminder | scheduled | src/engine/state.ts | not yet proven |  |  |
| plan-start | scheduled | src/engine/state.ts | proven | plan-over-call (40 seeds) | lateDays +1; quality.direction -0.5; overall -0.3 |
| production-confirm | scheduled | src/engine/productions.ts | proven | off-production-confirm (100 seeds) | productionsChanged -1.39; jobsCancelled -0.07 |
| production-release | scheduled | src/engine/productions.ts | proven | off-production-release (60 seeds) | productionResults -6.25; jobsOffered -0.133 |
| release | scheduled | src/engine/finish.ts | stale | off-release | measured before the code it reads last changed |
| release-licence-answer | scheduled | src/engine/release-plan.ts | not yet proven |  |  |
| revision-done | scheduled | src/engine/projects.ts | stale | revision-notes | measured before the code it reads last changed |
| screening | scheduled | src/engine/awards.ts | proven | attend-screening (30 seeds) | accepted +6.867; attended +5.367; offers +7.1 |
| screening-reminder | scheduled | src/engine/awards.ts | not a feature |  | A notice: it tells the player a screening they were invited to is near. Attending is the screening itself and the RSVP, proven separately. |
| season-decision | scheduled | src/engine/continuation.ts | not yet proven |  |  |
| shoot-call | scheduled | src/engine/production/shoot.ts | proven | sleep-through-call (40 seeds) | lateDays +1; quality.direction -0.75; overall -0.237 |
| shoot-wrap | scheduled | src/engine/production/shoot.ts | proven | off-shoot-wrap (40 seeds) | delivered -2; revenue -137164.625; money -160388.041 |
| studio-release | scheduled | src/engine/finish.ts | not yet proven |  |  |
| wake | scheduled | src/engine/state.ts | not yet proven |  |  |
| weather-check | scheduled | src/engine/production/shoot.ts | proven | weather-keep (60 seeds) | lostDays -1.3; overall +0.208; daysToDeliver -1.883; spent -3092.167 |
| work-day | scheduled | src/engine/production/workday.ts | proven | off-work-day (40 seeds) | delivered -1.975; revenue -133664.375; money -156294.921 |
| writing-day | scheduled | src/engine/writing-jobs.ts | not yet proven |  |  |
| "Working Title" | field | everywhere a project is named | carried | tests/proposal.test.ts::makes one project | A name or a record, carried to everywhere a project is named: it decides nothing by its nature. |
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
| {`Version In ${r.territories.map(countryName).join(', ')}`} | field | finish.ts setReleaseVersion, the release handler; distribution.ts territoriesReached, reportedGross | stale | release-dubbed | measured before the code it reads last changed |
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
| "For How Long" | field | music.ts holderFee, agreeLicence (expiry), licence-expiry | proven | licence-years (40 seeds) | licenceYears +3.125; released +0.8 |
| "Your Notes On The Themes" | field | cues.ts giveThemeNotes, themeTasks; song-actions.ts syncMusicTasks | not yet proven |  |  |
| "Treat As An Adult In This Story" | field | guests.ts canApproach -> hiring.ts makeOffer, casting-calls.ts inviteRefusal | not yet proven |  |  |
| "Consider Them For" | field | guests.ts considerFor -> hiring.ts candidatesFor | not yet proven |  |  |
| "Title" | field | the calendar, reminders | carried | tests/foundation.test.ts::Advance stops at a reminder | A name or a record, carried to the calendar, reminders: it decides nothing by its nature. |
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
| "Rehearsal Days" | field | production/shoot.ts; hiring.ts (booked days) | proven | rehearsal-days (40 seeds) | performance +5.225; overall +1.388; reception +2.125 |
| "Stop-Motion Stages" | field | production/workday.ts | not yet proven |  |  |
| "Render Nodes" | field | production/workday.ts | not yet proven |  |  |
| "Six-Day Weeks" | field | production/schedule.ts isWorkingDay | proven | six-day-weeks (60 seeds) | daysToDeliver -3.608; spent +3842.333 |
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
| "Why" | field | PlanViews.tsx Plan Revisions | carried | tests/v8-budget.test.ts::keeps 20,000 and 2,000,000 exactly | A name or a record, carried to PlanViews.tsx Plan Revisions: it decides nothing by its nature. |
| "Change Financing Target" | field | finance.ts financeSummary, decide | proven | finance-target (40 seeds) | backerIn +38750; leftInProjects +32709.5; money -7180.28; revenue -9014.2 |
| {`Ask The ${d.backer} For`} | field | negotiation.ts | not yet proven |  |  |
| "Spending Ceiling" | field | mandates.ts guideMePlan, runMandate, guideMeRefusal | not yet proven |  |  |
| "Working Title" | field | everywhere a project is named | carried | e2e/title-input.spec.ts::a title typed, edited, cleared, pasted and submitted | A name or a record, carried to everywhere a project is named: it decides nothing by its nature. |
| "Format" | field | projects.ts, production/tasks.ts, awards.ts | proven | format-feature (30 seeds) | revenue -2974.833; money -2851.6 |
| "Medium" | field | production/tasks.ts buildTasks | proven | medium-animation (30 seeds) | shootDays -7.633; daysToDeliver -33.767; spent +285118; money -603131.233; revenue -128754.167 |
| {medium === 'hybrid' ? 'Animation Technique For Animated Scenes' : 'Animation Technique'} | field | production/tasks.ts buildTasks | not yet proven |  |  |
| "Animation Finish" | field | production/workday.ts (render hours per frame); estimate.ts | not yet proven |  |  |
| "Episodes" | field | projects.ts; production/tasks.ts | not yet proven |  |  |
| {episodic ? 'Target Minutes Per Episode' : 'Target Runtime In Minutes'} | field | awards.ts checkEligibility (running time); estimate.ts | stale | runtime-longer | measured before the code it reads last changed |
| ? | field | genres.ts composeGenres; script-effects.ts competesAs; finish.ts subtitlingCost | proven | genre-comedy (30 seeds) | reception -0.267; overall -0.267; revenue -1304.333; money -1087.767 |
| "Intended Audience" | field | awards-rules.ts; script-explain.ts audienceContentNote | not yet proven |  |  |
| "Tone" | field | cues.ts proposeBrief | proven | tone (40 seeds) | chamber +2; spent +9052; cues -2 |
| "Competes As" | field | script-effects.ts competesAs | not yet proven |  |  |
| "Story Era" | field | projects.ts deriveRequirements (period research); production/tasks.ts costumes | not yet proven |  |  |
| "Story Setting" | field | shown in the Story panel | not yet proven |  |  |
| ? | field | finish.ts subtitlingCost; awards.ts language rules | not yet proven |  |  |
| "Story Setting Place" | field | projects.ts deriveRequirements; production/tasks.ts | not yet proven |  |  |
| "Production Base" | field | production/schedule.ts isWorkingDay; weather.ts | proven | base-los-angeles (40 seeds) | lostDays -1.225; daysToDeliver -2.013 |
| "Planned Budget (US Dollars)" | field | project-budget.ts setPlannedBudget, budgetPicture, plannedText; finance.ts financeSummary | not yet proven |  |  |
| "Years That Pass In The Story" | field | sequel.ts continueProject | not yet proven |  |  |
| {PLAN_ROUTES[r].label} | field | release-plan.ts setReleasePlan, proposalRefusal, selfRefusal; finish.ts festivalHold | proven | self-release-stores (30 seeds) | revenue +38987.667; money +34773.933; spent +2600 |
| "Plan Territories" | field | release-plan.ts buyerValue, proposeLicence, selfCosts, releaseYourself | not yet proven |  |  |
| "First Public Date" | field | release-plan.ts leadDays, releaseYourself (planRelease date) | not yet proven |  |  |
| "Held For Festivals Until" | field | finish.ts festivalHold in planRelease and acceptDistribution | not yet proven |  |  |
| "Version Abroad" | field | release-plan.ts releaseYourself (finish.ts setReleaseVersion) | not yet proven |  |  |
| "Promotion Budget" | field | release-plan.ts selfCosts; distribution.ts promoLift in reportedGross | proven | promotion-budget (30 seeds) | spent +5993.333; revenue +8516.667 |
| {`${label}: Buyer`} | field | release-plan.ts proposeLicence, answerProposal | proven | licence-proposal (30 seeds) | licenceDeals +0.767; revenue -35555; money -37580.067 |
| {`${label}: Your Ask`} | field | release-plan.ts answerProposal | proven | licence-ask (100 seeds) | licenceDeals -0.82; releaseDelay +29.33; licenceFee -14680 |
| {`${label}: Exclusive`} | field | release-plan.ts buyerValue; distribution.ts heldTerritories | proven | licence-exclusive (100 seeds) | licenceFee +8950; money -10555.66 |
| {`Keep My ${c.label}`} | field | blueprints.ts applyBlueprint | not yet proven |  |  |
| {`Keep My ${c.label} And Add None`} | field | blueprints.ts applyBlueprint | not yet proven |  |  |
| "Save Name" | field | the saved games list | not yet proven |  |  |
| "Wake Me For Obligations" | field | state.ts runEvents | not yet proven |  |  |
| "The Light It Is Shot In" | field | craft.ts craftTime, gafferNeeded, cameraTestDays, postFactors; takes.ts planTime; hiring.ts neededRoles; production/tasks.ts buildTasks | proven | light-contrast (30 seeds) | spent +3722.667; money -5003.967 |
| "The Score" | field | craft.ts postFactors, scoreSessions; production/tasks.ts buildTasks | not yet proven |  |  |
| {SOUNDS[k].label} | field | craft.ts craftTime, craftRoles, postFactors, dialogueHolds; production/tasks.ts buildTasks; production/shoot.ts needsDialogueReplacement | not yet proven |  |  |
| "Central Question" | field | script-effects.ts documentsNeeded | not yet proven |  |  |
| "Central Question" | field | shown in the Story panel; part of the Statement Of Intent for a documentary | not yet proven |  |  |
| "Synopsis" | field | shown in the Story panel | not yet proven |  |  |
| "Logline" | field | script-effects.ts documentsNeeded | proven | logline-missing (30 seeds) | backerDeals -1; ownIn +34733.333; money -95919.7 |
| "Premise" | field | script-effects.ts documentsNeeded | not yet proven |  |  |
| "Stakes" | field | script-effects.ts documentsNeeded | not yet proven |  |  |
| "Central Conflict" | field | script-effects.ts documentsNeeded | not yet proven |  |  |
| "Point Of View" | field | script-effects.ts documentsNeeded | not yet proven |  |  |
| "Theme" | field | script-effects.ts documentsNeeded | not yet proven |  |  |
| "Intended Ending" | field | script-effects.ts documentsNeeded | not yet proven |  |  |
| "Intended Experience" | field | cues.ts proposeBrief | stale | intended-experience | measured before the code it reads last changed |
| "Who It Is For" | field | shown in the Story panel | not yet proven |  |  |
| "How It Is Built" | field | shown in the Story panel | not yet proven |  |  |
| "Tone" | field | cues.ts proposeBrief | proven | tone (40 seeds) | chamber +2; spent +9052; cues -2 |
| "Story Setting" | field | shown in the Story panel | carried | tests/script-effects.test.ts::briefs add no work | A name or a record, carried to shown in the Story panel: it decides nothing by its nature. |
| "Competes As" | field | script-effects.ts competesAs | not yet proven |  |  |
| "Source Material" | field | awards-rules.ts (original or adapted screenplay) | not yet proven |  |  |
| "Adapted From" | field | shown with the project | not yet proven |  |  |
| "When It Is Set" | field | awards-rules.ts requirementProblems | not yet proven |  |  |
| "Year It Is Set In" | field | looks.ts periodBand, projectBand; projects.ts deriveRequirements; production/tasks.ts buildTasks | not yet proven |  |  |
| "The Look It Borrows" | field | the Creative Brief card | carried | tests/looks.test.ts::1986 made in 2026 is a period: research, and half as much costume work again; 2026 is neither; the look it borrows changes no work | A name or a record, carried to the Creative Brief card: it decides nothing by its nature. |
| "Story Setting Place" | field | projects.ts deriveRequirements | not yet proven |  |  |
| {x.label} | field | awards-rules.ts PROJECT_SUBJECTS | not yet proven |  |  |
| {q.label} | field | shown with the genre questions | not yet proven |  |  |
| "Draft Name" | field | drafts list | not yet proven |  |  |
| "Draft Name" | field | drafts list | not yet proven |  |  |
| {`"${x.title}" In This Scene`} | field | songs.ts songUses; projects.ts deriveRequirements | not yet proven |  |  |
| "Interior Or Exterior" | field | production/shoot.ts (weather) | proven | scene-exterior (40 seeds) | lostDays +1.4; shootDays +1.2; money -25465.841 |
| "Place" | field | production/schedule.ts groupShootDays | not yet proven |  |  |
| "Time Of Day" | field | production/rates.ts dayFees | proven | scene-night (40 seeds) | spent +1438.55; overall +0.588 |
| "Estimated Minutes" | field | production/schedule.ts sceneLoad; finish.ts runtime | proven | scene-minutes (40 seeds) | runtime +22; spent +11593.1; daysToDeliver +7.55; offered +94350; guarantees +42350 |
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
| "Essential To The Story" | field | finish.ts (cutting it costs the edit); cost-cuts.ts | stale | scene-essential | measured before the code it reads last changed |
| "Props" | field | projects.ts deriveRequirements; production/tasks.ts | stale | scene-props | measured before the code it reads last changed |
| "Animals" | field | projects.ts deriveRequirements; production/tasks.ts | stale | scene-animals | measured before the code it reads last changed |
| "Vehicles" | field | projects.ts deriveRequirements; production/tasks.ts | stale | scene-vehicles | measured before the code it reads last changed |
| "Stunts" | field | projects.ts deriveRequirements; production/tasks.ts | stale | scene-stunts | measured before the code it reads last changed |
| "Crowd Size" | field | production/rates.ts (crowd day rate) | proven | scene-crowd (60 seeds) | spent +52006.167; money -40741.16 |
| "Crowd Makeup" | field | looks.ts chairMinutes, makeupDayCost; production/shoot.ts runShootDay | not yet proven |  |  |
| "Extend The Crowd In Post" | field | looks.ts physicalCrowd, digitalCrowd; production/tasks.ts buildTasks; production/schedule.ts sceneLoad | not yet proven |  |  |
| "Visual Effects" | field | projects.ts deriveRequirements; production/tasks.ts | stale | scene-vfx | measured before the code it reads last changed |
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
| {`Title Of Episode ${n}`} | field | shown wherever an episode is named | carried | tests/episodes.test.ts::an episode moves with its scenes | A name or a record, carried to shown wherever an episode is named: it decides nothing by its nature. |
| {`What Episode ${n} Moves`} | field | shown in the season plan | carried | tests/episodes.test.ts::an episode moves with its scenes | A name or a record, carried to shown in the season plan: it decides nothing by its nature. |
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
| "About" | field | the notes list | carried | e2e/readers.spec.ts::a story set abroad is researched | A name or a record, carried to the notes list: it decides nothing by its nature. |
| "Character Name" | field | everywhere a part is named | carried | tests/scenes.test.ts::renaming changes the name everywhere it is shown | A name or a record, carried to everywhere a part is named: it decides nothing by its nature. |
| "Give Their Scenes, Lines And Relationships To" | field | projects.ts archiveCharacter | not yet proven |  |  |
| "Scene" | field | structure.ts beatsIn | not yet proven |  |  |
| "What Changes" | field | structure.ts | not yet proven |  |  |
| "New Character's Name" | field | projects.ts splitCharacter | not yet proven |  |  |
| {sceneLabel(p, s)} | field | projects.ts splitCharacter | not yet proven |  |  |
| "Name" | field | everywhere a part is named | carried | tests/scenes.test.ts::renaming changes the name everywhere it is shown | A name or a record, carried to everywhere a part is named: it decides nothing by its nature. |
| "Role Size" | field | script-effects.ts castPlacement; hiring.ts | proven | lead-role-size (30 seeds) | leadEntries -2.967; actingDecided -2.967 |
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
| "Makeup" | field | looks.ts makeupShare, makeupDayCost; production/tasks.ts buildTasks; production/schedule.ts groupShootDays; production/shoot.ts runShootDay; callsheet.ts callSheet; hiring.ts neededRoles | proven | lead-makeup (30 seeds) | spent +22890.667; daysToDeliver +1.833 |
| "Costume From" | field | looks.ts costumeCopies, wardrobeMismatch; production/tasks.ts buildTasks | proven | lead-costume (30 seeds) | spent +19353; money -40642.1; daysToDeliver +6.317 |
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
| "Rights Holder" | field | shown with the song | carried | e2e/journey-e.spec.ts::refused with a reason, then recovered | A name or a record, carried to shown with the song: it decides nothing by its nature. |
| {`Scene For ${s.title}`} | field | songs.ts songUses | not yet proven |  |  |
| "How It Plays" | field | awards-rules.ts songRuleProblem | not yet proven |  |  |
| "Minutes It Plays" | field | awards-rules.ts songRuleProblem | not yet proven |  |  |
| {`${c.name} Performs ${s.title}`} | field | casting-notes.ts fitNotes; songs.ts songCredits | not yet proven |  |  |
| {`${v.label}: ${sceneLabel(p, sc)}, In Place Of "${song.title}"`} | field | song-actions.ts changeVersionSong | not yet proven |  |  |
| {`${c.name} On Screen (Minutes)`} | field | screen-time.ts shareCheck | not yet proven |  |  |
| {`${c.name} Heard Only (Minutes)`} | field | screen-time.ts screenTotal | not yet proven |  |  |
| "Title For The New Project" | field | opportunities.ts acceptOpportunity | not yet proven |  |  |
| {`What ${name}'s Revision Should Look At`} | field | WritingWork.tsx JobLine | not yet proven |  |  |
| {`Your Note To ${name} (Optional)`} | field | WritingWork.tsx JobLine | carried | tests/writing-jobs.test.ts::the brief and the notes are kept as written and change nothing | A name or a record, carried to WritingWork.tsx JobLine: it decides nothing by its nature. |
| {`Ask ${name} For`} | field | writing-jobs.ts writingTerms, acceptedRead | not yet proven |  |  |
| {`Episode For ${name}`} | field | writing-jobs.ts writingTerms, acceptedRead | not yet proven |  |  |
| {`Your Brief For ${name} (Optional)`} | field | WritingWork.tsx JobLine | carried | tests/writing-jobs.test.ts::the brief and the notes are kept as written and change nothing | A name or a record, carried to WritingWork.tsx JobLine: it decides nothing by its nature. |
| "Put In From Your Own Money" | field | personal.ts putInOwnMoney, putInRefusal | not yet proven |  |  |
| "Banner Name" | field | company.ts setBanner, productionCredit; FinishViews.tsx credits | not yet proven |  |  |
