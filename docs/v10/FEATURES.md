# Every Feature, Proven Or Not

Written by `tests/v10-features.test.ts` from the code; don't edit by hand. A feature is proven only by a played-career
Monte Carlo result in `docs/v10/proof/`: the same seeds played twice, one decision changed, a direct measure and a later
measure in another system both moving with their 95% interval clear of zero. A name or a record that only a screen
shows (a title, a description) decides nothing, so it is carried rather than proven: its evidence is the test or
journey that shows it there.

| Kind | proven | carried | does not bite | no downstream effect | stale | not a feature | not yet proven | All |
|---|---|---|---|---|---|---|---|---|
| action | 185 | 0 | 0 | 0 | 0 | 15 | 0 | 200 |
| bank | 54 | 0 | 0 | 0 | 0 | 0 | 0 | 54 |
| scheduled | 57 | 0 | 0 | 0 | 0 | 11 | 0 | 68 |
| field | 273 | 102 | 0 | 0 | 0 | 9 | 0 | 384 |
| all | 569 | 102 | 0 | 0 | 0 | 35 | 0 | 706 |

## Rows

| Feature | Kind | Read by | Status | Proof | What moved, or why |
|---|---|---|---|---|---|
| rsvpScreening | action | src/engine/awards-actions.ts | proven | attend-screening (30 seeds) | accepted +6.7; attended +5.8; offers +8.033 |
| submitEntry | action | src/engine/awards-actions.ts | proven | enter-awards (40 seeds) | entries +40.675; spent +1644.5; selected +4.625 |
| withdrawEntry | action | src/engine/awards-actions.ts | proven | withdraw-entry (40 seeds) | withdrawn +34.3; selected -5.55 |
| execute | action | src/engine/bankworld/core/simulation.ts | not a feature |  | The bank world's dispatcher: every bank command a screen runs goes through it, and each command is its own row. |
| advanceBankWorld | action | src/engine/bankworld/index.ts | not a feature |  | Brings the bank to the game's clock before a bank command runs; time passing is proven through the scheduled rows and the bank commands. |
| bankSim | action | src/engine/bankworld/index.ts | not a feature |  | Reads the bank world for the command that follows; not a decision. |
| setLock | action | src/engine/blueprints.ts | proven | lock-field (40 seeds) | periodFilms +2; spent +56298; daysToDeliver +11.7 |
| saveIdea | action | src/engine/brief.ts | not a feature |  | Keeps an idea on the player's shortlist in the idea picker (IdeaPicker.tsx); the idea itself is used through the brief, its own row. |
| callBack | action | src/engine/casting-calls.ts | proven | callback (40 seeds) | callbacksSeen +7.5; castCapability +1.025 |
| inviteToAudition | action | src/engine/casting-calls.ts | proven | audition (40 seeds) | readsSeen +14.725; castCapability +8.725; performance +7.813; overall +2.475; castRates +242.5 |
| setShortlisted | action | src/engine/casting-calls.ts | proven | callback (40 seeds) | callbacksSeen +7.5; castCapability +1.025 |
| shortlistAdvice | action | src/engine/casting-director.ts | proven | shortlist-advice (40 seeds) | callbacksSeen +10.05; castCapability +1.606; performance +1.6; overall +0.65 |
| startSearch | action | src/engine/casting-director.ts | proven | casting-search (40 seeds) | searches +3.85; readsSeen +20.325; castCapability +17.444; performance +14.125; castRates +1166.5; spent +11402.25 |
| setBanner | action | src/engine/company.ts | not a feature |  | Names your banner, shown on your credits as "A … Production" (YourMoney.tsx); a name, read only where it is shown. |
| planFinalSeason | action | src/engine/continuation.ts | proven | final-season (100 seeds) | ended +0.93; firstRenewed -0.46; slateRaised -0.21; laterRenewed +0.1 |
| applyBrief | action | src/engine/cues.ts | proven | music-brief (40 seeds) | cues +4; spent +2915.5; daysToDeliver +2.188; overall -0.15 |
| approveThemes | action | src/engine/cues.ts | proven | approve-themes (40 seeds) | themesApproved +2; delivered +2; released +2; quality.music +59.725 |
| editCue | action | src/engine/cues.ts | proven | edit-cue (40 seeds) | cues -4; spent -5996.5; daysToDeliver -1.962; quality.music -14.575 |
| giveThemeNotes | action | src/engine/cues.ts | proven | theme-notes (40 seeds) | themeRounds +4; quality.music +4; spent +2287; daysToDeliver +3.55 |
| approveDesign | action | src/engine/designs-actions.ts | proven | approve-design (20 seeds) | delivered +2; revenue +86850; money +114946.1 |
| askForDesignChanges | action | src/engine/designs-actions.ts | proven | ask-design-changes (20 seeds) | designDays +4; spent +1858 |
| setFilmedAt | action | src/engine/destinations.ts | proven | filmed-abroad (40 seeds) | filmedAway +6; spent +22739.6; daysToDeliver +10.625 |
| applyFix | action | src/engine/directing.ts | proven | fix-with-pickups (40 seeds) | pickupDays +7.125; spent +17194.75; quality.editing +3.975; overall -0.237 |
| showCut | action | src/engine/documentary-actions.ts | proven | show-cut (120 seeds) | cutApproved +0.85; runtime +2.55; daysToDeliver +2.117 |
| requestConsent | action | src/engine/documentary.ts | proven | request-consent (20 seeds) | consentGiven +3.1; delivered +1.15; revenue +50001.25 |
| lockPicture | action | src/engine/edit-actions.ts | proven | lock-picture (40 seeds) | delivered -2; released -2; revenue -116933.375; standing.producing -2.775 |
| requestPickups | action | src/engine/edit-actions.ts | proven | request-pickups (40 seeds) | shootDays +2.125; spent +7844.75; daysToDeliver +4.113; quality.direction +0.625 |
| restoreToEdit | action | src/engine/edit-actions.ts | proven | restore-to-edit (40 seeds) | cutFromEdit -2; overall -0.425; reception -0.425; revenue -5723.25 |
| startCutPass | action | src/engine/edit-actions.ts | proven | cut-passes (40 seeds) | quality.editing +8; daysToDeliver +3.238; overall +1.738; reception +1.738; revenue +15005.25; spent +2735.5 |
| unlockPicture | action | src/engine/edit-actions.ts | proven | unlock-picture (40 seeds) | daysToDeliver +2.963; spent +2400.75 |
| deliverEpisode | action | src/engine/episode-delivery.ts | proven | deliver-episode-release (40 seeds) | episodesDeliveredAlone +1.9; firstOut -7.5 |
| lockEpisode | action | src/engine/episode-delivery.ts | proven | deliver-episode-release (40 seeds) | episodesDeliveredAlone +1.9; firstOut -7.5 |
| startEpisodeCutPass | action | src/engine/episode-delivery.ts | proven | episode-cut-pass (40 seeds) | episodeCutPasses +1.7; quality.editing +3.35; spent +1146.75 |
| setEpisodeDates | action | src/engine/episode-releases.ts | proven | episode-dates (40 seeds) | episodesMoved +2.75; renewalWait +25.2; money -261.625 |
| addToKit | action | src/engine/equipment.ts | proven | own-kit (40 seeds) | gearOwned +12; kitItems +12; spent -3146.75; money -4871.78 |
| buyGear | action | src/engine/equipment.ts | proven | own-kit (40 seeds) | gearOwned +12; kitItems +12; spent -3146.75; money -4871.78 |
| removeFromKit | action | src/engine/equipment.ts | proven | remove-from-kit (40 seeds) | kitItems -2; spent +2609.875 |
| sellGear | action | src/engine/equipment.ts | proven | sell-gear (30 seeds) | gearOwned -6; money +1937.537; spent +478.367 |
| serviceGear | action | src/engine/equipment.ts | proven | service-gear (30 seeds) | worn -6; kitPostponed -725; lostDays -724.033; daysToDeliver +2.211; spent +43949.333; money +158847.853 |
| setPackageApproval | action | src/engine/equipment.ts | proven | package-approval (40 seeds) | kitPostponed -729; lostDays -727.375; daysToDeliver +33.688; delivered +2; spent +51940.5 |
| acceptDeal | action | src/engine/finance.ts | proven | own-money-or-backer (40 seeds) | ownIn -74025; backerDeals +2; money -14617.441; moneyChange -14617.441; revenue -71334.575 |
| approachBacker | action | src/engine/finance.ts | proven | own-money-or-backer (40 seeds) | ownIn -74025; backerDeals +2; money -14617.441; moneyChange -14617.441; revenue -71334.575 |
| pitchToStudio | action | src/engine/finance.ts | proven | pitch-to-studio (40 seeds) | pitched +3; studioIn +850000; ownIn -850000 |
| refuseDeal | action | src/engine/finance.ts | proven | refuse-deal (40 seeds) | refused +1.7; investorIn -67425; ownIn +67425; money +25514.43; leftInProjects -13379.2 |
| setFinanceTarget | action | src/engine/finance.ts | proven | finance-target (40 seeds) | backerIn +39787.5; leftInProjects +34385; money -20375.115; revenue -20960.85 |
| submitSeries | action | src/engine/finance.ts | proven | submit-series (40 seeds) | submittedSeries +1.2; commissionedIn +50775; ownIn -50775 |
| acceptDistribution | action | src/engine/finish.ts | proven | distributor-or-self (40 seeds) | distributed -1.75; revenue -121413.5; money -114841.5 |
| cancelRelease | action | src/engine/finish.ts | proven | cancel-release (40 seeds) | cancelledReleases +1.975; released -1.975; revenue -165337.25; money -158555.75 |
| cutFromEdit | action | src/engine/finish.ts | proven | cut-from-edit (40 seeds) | cutFromEdit +2; overall +0.663; reception +0.663 |
| declineDistribution | action | src/engine/finish.ts | proven | decline-distribution (40 seeds) | offersDeclined +1.725; distributed -1.7; revenue -127213.125; money -120633.125 |
| deliver | action | src/engine/finish.ts | proven | deliver (40 seeds) | delivered -2; released -2; revenue -123105.125; standing.producing -2.9 |
| planRelease | action | src/engine/finish.ts | proven | release-or-not (40 seeds) | released -2; revenue -124002.125; money -117974.625 |
| setReleaseVersion | action | src/engine/finish.ts | proven | release-dubbed (60 seeds) | dubbed +0.85; spent +4083.333; gross +6406.667; revenue +13511.333 |
| acceptFirstLook | action | src/engine/first-look.ts | proven | first-look-accept (40 seeds) | firstLookActive +1.5; money +619571.828 |
| askMoreOverhead | action | src/engine/first-look.ts | proven | first-look-overhead (120 seeds) | overheadAsked +1.425; overheadAgreed +0.158; overheadPaid +55885.417; money +54646.697 |
| declineFirstLook | action | src/engine/first-look.ts | proven | first-look-decline (40 seeds) | firstLookDeclined +1.45; firstLookActive -1.5; money -554863.822 |
| drawDevelopment | action | src/engine/first-look.ts | proven | draw-development (40 seeds) | developmentIn +47550; ownIn -47550; money +37486.843 |
| endFirstLook | action | src/engine/first-look.ts | proven | first-look-end (40 seeds) | firstLookEnded +1.125; money -212517.846 |
| considerFor | action | src/engine/guests.ts | proven | consider-real (40 seeds) | realCast +1.75; castCapability -3.65; performance -2.831; castRates +562.75 |
| considerPerson | action | src/engine/guests.ts | proven | consider-real (40 seeds) | realCast +1.75; castCapability -3.65; performance -2.831; castRates +562.75 |
| stopConsidering | action | src/engine/guests.ts | proven | stop-considering (40 seeds) | realReads -1.45; realCast -1.3; castRates -973780.85; spent -3370007.35 |
| treatAsAdult | action | src/engine/guests.ts | proven | treat-as-adult (40 seeds) | realCast +1.85; castCapability -7.812; performance -6.581; castRates +322.75 |
| acceptCounter | action | src/engine/hiring.ts | proven | counter-offers (40 seeds) | countersDeclined +90.45; spent +10152.5; quality.craft -59.675; overall -58.362; daysToDeliver -34.012 |
| castPlayer | action | src/engine/hiring.ts | proven | cast-yourself (40 seeds) | playerParts +2; castRates -1632; spent -5259.25; standing.acting +4.75; overall -0.4 |
| castRoleFor | action | src/engine/hiring.ts | not a feature |  | Names the job a part's casting method is (performer or voice performer) inside an offer; the offer is its own row (hiring.makeOffer). |
| declineCounter | action | src/engine/hiring.ts | proven | counter-offers (40 seeds) | countersDeclined +90.45; spent +10152.5; quality.craft -59.675; overall -58.362; daysToDeliver -34.012 |
| makeOffer | action | src/engine/hiring.ts | proven | offered-rate (40 seeds) | castRates -210.4; spent -610.25; countersSeen +0.725; money +610.242 |
| releaseHire | action | src/engine/hiring.ts | proven | release-hire (40 seeds) | released +2; offersMade +29.125; spent +1813.85; daysToDeliver +2 |
| sendStaffingOffers | action | src/engine/hiring.ts | proven | send-staffing (40 seeds) | crewRates -3541.5; crewExperience -2.367; spent -17377.5; quality.craft -18.1; overall -4.862 |
| uncastPlayer | action | src/engine/hiring.ts | proven | uncast-yourself (40 seeds) | playerParts -2; castRates +1637; spent +5737.5; standing.acting -4.475; overall +0.438 |
| withdrawOffer | action | src/engine/hiring.ts | proven | withdraw-offer (40 seeds) | withdrawn +2; offersMade +2; castRates +86; spent +418 |
| applyForApproval | action | src/engine/homes/building.ts | proven | build-a-house (40 seeds) | buildStagesDone +8; buildSpend +336047; money -339374.135; moneyChange -339374.135; worth -255209.349 |
| investigate | action | src/engine/homes/building.ts | proven | build-a-house (40 seeds) | buildStagesDone +8; buildSpend +336047; money -339374.135; moneyChange -339374.135; worth -255209.349 |
| resumeBuild | action | src/engine/homes/building.ts | proven | resume-building (40 seeds) | buildStagesDone +7; money -260238.63; moneyChange -260238.63; worth -195699.45 |
| saveDesign | action | src/engine/homes/building.ts | proven | double-garage (40 seeds) | buildQuote +18232.5; money -18329.481; moneyChange -18329.481; worth -13783.77 |
| signBuild | action | src/engine/homes/building.ts | proven | build-a-house (40 seeds) | buildStagesDone +8; buildSpend +336047; money -339374.135; moneyChange -339374.135; worth -255209.349 |
| startDesign | action | src/engine/homes/building.ts | proven | build-a-house (40 seeds) | buildStagesDone +8; buildSpend +336047; money -339374.135; moneyChange -339374.135; worth -255209.349 |
| acceptCounter | action | src/engine/homes/buying.ts | proven | offer-below-asking (40 seeds) | pricePaid -24674; money +25110.042; moneyChange +25110.042; worth +18882.752 |
| acceptSaleOffer | action | src/engine/homes/buying.ts | proven | sell-the-home (40 seeds) | sold +1; homesOwned -1; money +531830.572; moneyChange +531830.572; worth +399936.59 |
| declineSaleOffer | action | src/engine/homes/buying.ts | proven | decline-first-offer (40 seeds) | soldAtDay +22; money -217.576; moneyChange -217.576; worth -163.618 |
| listForSale | action | src/engine/homes/buying.ts | proven | sell-the-home (40 seeds) | sold +1; homesOwned -1; money +531830.572; moneyChange +531830.572; worth +399936.59 |
| makeOffer | action | src/engine/homes/buying.ts | proven | buy-a-home (40 seeds) | homesOwned +1; pricePaid +587025; money -602232.794; moneyChange -602232.794; worth -452879.061 |
| withdrawPurchase | action | src/engine/homes/buying.ts | proven | withdraw-purchase (40 seeds) | homesOwned -1; purchasesEnded +1; money +514858.681; moneyChange +514858.681; worth +387173.729 |
| arrangeViewing | action | src/engine/homes/index.ts | not a feature |  | Information, not a decision (from November 17, 2026): a viewing on its day says what can be seen of a home, its floors and walls, roof and heating, and what is shared; no engine function reads that it happened, and the price and terms are the same either way. tests/homes.test.ts shows it comes on its day, once. |
| toggleFavorite | action | src/engine/homes/index.ts | not a feature |  | A bookmark (from November 17, 2026): it keeps a home in Find A Home's list after its month so you can find it again; it changes no price, term or outcome. e2e/homes.spec.ts shows a saved home kept and lapsing on its own date. |
| advertise | action | src/engine/homes/letting.ts | proven | let-the-home (40 seeds) | letRents +23; letIncome +50121.9; money +53018.479; moneyChange +53018.479; worth +39869.896 |
| approveLandlordRepair | action | src/engine/homes/letting.ts | proven | approve-tenant-repair (80 seeds) | letCosts +2378.975; money -2381.933; moneyChange -2381.933; worth -1791.214 |
| changeRent | action | src/engine/homes/letting.ts | proven | cheaper-rent (40 seeds) | letIncome -11281.675; money -11736.91; moneyChange -11736.91; worth -8826.156 |
| chooseTenant | action | src/engine/homes/letting.ts | proven | let-the-home (40 seeds) | letRents +23; letIncome +50121.9; money +53018.479; moneyChange +53018.479; worth +39869.896 |
| endLetting | action | src/engine/homes/letting.ts | proven | end-the-letting (40 seeds) | letRents -16; lettingsEnded +1; money -43314.548; moneyChange -43314.548; worth -32572.54 |
| bookStay | action | src/engine/homes/living.ts | proven | stay-longer (40 seeds) | staySpend +560; money -553.299; moneyChange -553.299; worth -416.08 |
| buyInsurance | action | src/engine/homes/living.ts | proven | insure-belongings (40 seeds) | policies +1; money -414.893; moneyChange -414.893; worth -312 |
| buyItem | action | src/engine/homes/living.ts | proven | buy-furniture (40 seeds) | itemSpend +513; itemsInstalled +0.8; money -682.181; moneyChange -682.181; worth -513 |
| cancelWork | action | src/engine/homes/living.ts | proven | cancel-work (40 seeds) | jobsDone -1; workPaid -22400; money +22131.915; moneyChange +22131.915; worth +16643.2 |
| claimRepair | action | src/engine/homes/living.ts | proven | claim-on-insurance (40 seeds) | claimsPaid +370; money +365.57; moneyChange +365.57; worth +274.91 |
| disposeItem | action | src/engine/homes/living.ts | proven | dispose-item (40 seeds) | itemsGone +1; money -89.096; moneyChange -89.096; worth -67 |
| installItem | action | src/engine/homes/living.ts | proven | install-appliance (40 seeds) | itemsInstalled +0.75; money -140.794; moneyChange -140.794; worth -105.877 |
| measureForInstall | action | src/engine/homes/living.ts | proven | measure-for-install (40 seeds) | itemsInstalled +0.775; money -187.843; moneyChange -187.843; worth -141.258 |
| restoreChange | action | src/engine/homes/living.ts | proven | undo-the-paint (40 seeds) | depositKept -376; money +290.126; moneyChange +290.126; worth +218.175 |
| returnItem | action | src/engine/homes/living.ts | proven | return-item (40 seeds) | itemSpend -446; itemsGone +1; money +593.086; moneyChange +593.086; worth +446 |
| startWork | action | src/engine/homes/living.ts | proven | ask-to-paint (40 seeds) | jobsDone +1; workPaid +1523.85; money -2026.397; moneyChange -2026.397; worth -1523.85 |
| applyToRent | action | src/engine/homes/renting.ts | proven | rent-a-home (40 seeds) | rentsPaid +24; money -51602.442; moneyChange -51602.442; worth -38805.036 |
| approveRepair | action | src/engine/homes/renting.ts | proven | report-your-repair (40 seeds) | repairSpend +186; money -247.34; moneyChange -247.34; worth -186 |
| askPermission | action | src/engine/homes/renting.ts | proven | ask-to-paint (40 seeds) | jobsDone +1; workPaid +1523.85; money -2026.397; moneyChange -2026.397; worth -1523.85 |
| disputeDeductions | action | src/engine/homes/renting.ts | proven | dispute-deductions (120 seeds) | depositKept -23.542; money +31.306; moneyChange +31.306; worth +23.542 |
| giveNotice | action | src/engine/homes/renting.ts | proven | give-notice (40 seeds) | rentsPaid -12; depositBack +1523.12; money +25221.657; moneyChange +25221.657; worth +18966.686 |
| moveIn | action | src/engine/homes/renting.ts | proven | rent-a-home (40 seeds) | rentsPaid +24; money -51602.442; moneyChange -51602.442; worth -38805.036 |
| payArrears | action | src/engine/homes/renting.ts | proven | pay-rent-owed (60 seeds) | arrears -1422.217; money -1891.246; moneyChange -1891.246; worth -1422.217 |
| reportRepair | action | src/engine/homes/renting.ts | proven | report-your-repair (40 seeds) | repairSpend +186; money -247.34; moneyChange -247.34; worth -186 |
| signLease | action | src/engine/homes/renting.ts | proven | rent-a-home (40 seeds) | rentsPaid +24; money -51602.442; moneyChange -51602.442; worth -38805.036 |
| acceptJob | action | src/engine/jobs.ts | proven | outside-work (40 seeds) | jobsDone -0.725; jobPay -3428.45; money -3435.565 |
| askBetterRate | action | src/engine/jobs.ts | proven | ask-better-rate (60 seeds) | ratesAgreed +7.417; jobPay +5348.317; money +4632.203 |
| declineJob | action | src/engine/jobs.ts | proven | decline-job (40 seeds) | jobsDeclined +1.025; jobsDone -0.975; jobPay -6482.5; money -6532.204 |
| withdrawJob | action | src/engine/jobs.ts | proven | withdraw-job (40 seeds) | jobsWithdrawn +0.9; jobsDone -0.975; jobsOffered -0.1; jobPay -4806.55; money -4848.867 |
| negotiate | action | src/engine/line-producer.ts | proven | line-producer-negotiates (120 seeds) | counterRates -197.708; spent +1662.417; money -1999.887 |
| chooseSite | action | src/engine/locations-actions.ts | proven | stage-sets (40 seeds) | onStage +6; spent -2069.5; lostDays -1.55; daysToDeliver -2.325 |
| approveGuideMe | action | src/engine/mandates.ts | proven | guide-me-writing (40 seeds) | writersHired +3.975; quality.script +2.325; overall +0.538; spent +2241.5 |
| endGuideMe | action | src/engine/mandates.ts | proven | end-guide-me (40 seeds) | writingPasses -3.175; quality.script -2.237; spent -2869.75 |
| approveTake | action | src/engine/mocap.ts | proven | approve-weak-take (20 seeds) | approvedTake -20.3; overall -0.35 |
| bookMocap | action | src/engine/mocap.ts | proven | book-body-only (20 seeds) | spent -4067.5; overall -0.4 |
| cancelMocapBooking | action | src/engine/mocap.ts | proven | cancel-mocap (40 seeds) | cancelled +2; cancellationFees +3000; spent +3000 |
| requestRetake | action | src/engine/mocap.ts | proven | mocap-retake (20 seeds) | retakes +2; takes +2; spent +5571.5 |
| considerComposer | action | src/engine/music-catalog.ts | proven | consider-composer (40 seeds) | realComposers +1.9; spent +2126.75; quality.music -3.037; money -6095.02 |
| licenseRecording | action | src/engine/music-catalog.ts | proven | license-recording (40 seeds) | catalogSongs +2; licensed +2; spent +28048.25; money -105861.585 |
| agreeLicence | action | src/engine/music.ts | proven | license-song (40 seeds) | licensed +1.55; released +1.55; revenue +36972.5; spent +451 |
| declineQuote | action | src/engine/music.ts | proven | decline-quote (40 seeds) | licensed -1.5; released -1.5; revenue -30761.125; spent -407 |
| renewLicence | action | src/engine/music.ts | proven | renew-licence (40 seeds) | renewals +0.825; released +0.825; spent +41.25 |
| replaceWithLibrary | action | src/engine/music.ts | proven | library-track (40 seeds) | libraryTracks +2; released +1.975; revenue +131789.125; spent +7635.5 |
| requestLicence | action | src/engine/music.ts | proven | license-song (40 seeds) | licensed +1.55; released +1.55; revenue +36972.5; spent +451 |
| askForBetterTerms | action | src/engine/negotiation-actions.ts | proven | better-terms (40 seeds) | asked +1.725; investorShare -0.087; investorPaid -4036.4; overall -0.575 |
| acceptOpportunity | action | src/engine/opportunities.ts | proven | accept-opportunity (30 seeds) | proposalsAccepted +0.433; commissioned +0.433; commissionMoney +28586.667 |
| declineOpportunity | action | src/engine/opportunities.ts | proven | decline-opportunity (30 seeds) | proposalsAccepted -0.567; commissioned -0.567; commissionMoney -40533.333 |
| applyForPermit | action | src/engine/papers.ts | proven | work-permit (100 seeds) | permits +0.99; lateDays -3.53; spent +4725.5; quality.direction +4.25; overall +1.81 |
| applyForRecordedPassport | action | src/engine/papers.ts | proven | recorded-passport (40 seeds) | passports +1; papersPaid +36.64; worth -36.64 |
| applyForVisa | action | src/engine/papers.ts | proven | visitor-visa (30 seeds) | visas +1.533; attended +1.2; offers +1.633 |
| moveTo | action | src/engine/papers.ts | proven | move-home (40 seeds) | livesInLondon -1; frenchAccounts +2; bankFees +31.19; overall -0.587; quality.direction -1.287; money -686082.579 |
| addStage | action | src/engine/parts.ts | proven | add-stage (40 seeds) | stages +2; stageCast +2; performersCast +2; castRates +1578.75 |
| removeStage | action | src/engine/parts.ts | proven | remove-stage (40 seeds) | stages -2; stageCast -2; performersCast -2; castRates -1590.75 |
| putInOwnMoney | action | src/engine/personal.ts | proven | own-money-or-backer (40 seeds) | ownIn -74025; backerDeals +2; money -14617.441; moneyChange -14617.441; revenue -71334.575 |
| takeHome | action | src/engine/personal.ts | proven | take-money-home (40 seeds) | leftInProjects +160761.375; money -160761.385 |
| takeHomeAvailable | action | src/engine/personal.ts | not a feature |  | Reads how much may come home, inside the Take Home action, which is its own row. |
| applyDesignChange | action | src/engine/production.ts | proven | change-design-redo (20 seeds) | redone +10; daysToDeliver +59.525; spent +44841.5 |
| generatePlan | action | src/engine/production/schedule.ts | proven | plan-later (40 seeds) | firstShootDay +70; daysToDeliver +67.35; revenue -22787.375 |
| keepWeatherPlan | action | src/engine/production/shoot.ts | proven | weather-keep (60 seeds) | lostDays -1.267; overall +0.158; daysToDeliver -1.867; spent -3242.5 |
| moveShootDay | action | src/engine/production/shoot.ts | proven | weather-move (60 seeds) | lostDays -2.117; daysToDeliver -1.683; spent -4588.167 |
| swapWithInteriorDay | action | src/engine/production/shoot.ts | proven | weather-swap (60 seeds) | lostDays -0.7; daysToDeliver -0.942; spent -1808.333 |
| setPlannedBudget | action | src/engine/project-budget.ts | proven | plan-budget (40 seeds) | target +81525; ownIn +5100; backerIn +76425; revenue -25776.85; money -25843.978 |
| addNote | action | src/engine/projects.ts | proven | own-notes (40 seeds) | ownNotes +6; quality.script +6; overall +1.8; reception +1.8 |
| approveDraft | action | src/engine/projects.ts | proven | second-project (40 seeds) | projects +2; approvedProjects +2; deliveredAll +1.725; money -46750.471; standing.producing +1.25; jobsDone +0.725 |
| assignEpisodeRole | action | src/engine/projects.ts | proven | episode-director (40 seeds) | directedByHire +1.8; quality.direction +3.913; overall +0.813; spent +6272.35 |
| createProject | action | src/engine/projects.ts | proven | second-project (40 seeds) | projects +2; approvedProjects +2; deliveredAll +1.725; money -46750.471; standing.producing +1.25; jobsDone +0.725 |
| noteFromIssue | action | src/engine/projects.ts | proven | revision-notes (40 seeds) | notesAddressed +6; quality.script +6; overall +1.825; reception +1.825 |
| renameDraft | action | src/engine/projects.ts | not a feature |  | Names a draft; the name is shown in the draft list and nothing else reads it, as a label shouldn't be. |
| setNoteStatus | action | src/engine/projects.ts | proven | revision-notes (40 seeds) | notesAddressed +6; quality.script +6; overall +1.825; reception +1.825 |
| startRevision | action | src/engine/projects.ts | proven | revision-notes (40 seeds) | notesAddressed +6; quality.script +6; overall +1.825; reception +1.825 |
| createFromSource | action | src/engine/proposal.ts | proven | create-from-source (40 seeds) | adapted +2; parts +2; castRates +1626.75; spent +87228.55; overall -0.837 |
| considerRecognised | action | src/engine/recognition-hire.ts | proven | hire-recognised (40 seeds) | recognisedHired +3.875; spent +24309.1; quality.craft -51.962; overall -50.912 |
| proposeLicence | action | src/engine/release-plan.ts | proven | licence-proposal (120 seeds) | licenceDeals +0.808; releaseDelay -14.571; gross +73761.667; revenue -12798.5; money -15087 |
| releaseYourself | action | src/engine/release-plan.ts | proven | self-release-stores (40 seeds) | revenue +39280.5; money +36680.5; spent +2600 |
| setReleasePlan | action | src/engine/release-plan.ts | proven | self-release-stores (40 seeds) | revenue +39280.5; money +36680.5; spent +2600 |
| approachAgent | action | src/engine/representation.ts | proven | agent (40 seeds) | viaAgent +7.075; jobsOffered +7.025; commission +3683.35; jobPay +23624.1; money +20093.127 |
| declineMandate | action | src/engine/representation.ts | proven | agent-decline (40 seeds) | viaAgent -6.75; jobsOffered -6.65; jobPay -20606.4; money -18882.41 |
| giveNotice | action | src/engine/representation.ts | proven | agent-notice (40 seeds) | viaAgent -5.425; jobsOffered -5.45; jobPay -21068.975; commission -3053.4; money -19256.694 |
| renewMandate | action | src/engine/representation.ts | proven | agent-renew (40 seeds) | renewals +3; represented +1; viaAgent +14; jobsOffered +14.025; jobPay +69828.35; money +60168.672 |
| signWith | action | src/engine/representation.ts | proven | agent (40 seeds) | viaAgent +7.075; jobsOffered +7.025; commission +3683.35; jobPay +23624.1; money +20093.127 |
| submitThrough | action | src/engine/representation.ts | proven | submit-through-agent (40 seeds) | submitted +1; dealCommission +5302.5 |
| rerecordLines | action | src/engine/revisions.ts | proven | rerecord-lines (20 seeds) | linesRerecorded +2; overall +0.475; spent +2510.5 |
| reviseAnimatic | action | src/engine/revisions.ts | proven | revise-animatic (20 seeds) | spent +1289.5; money -1289.5 |
| reviseEffects | action | src/engine/revisions.ts | proven | revise-effects (40 seeds) | effectsRevised +5.475; quality.direction +3.325; spent +27196.75; overall +0.588 |
| clearScreenTime | action | src/engine/screen-time.ts | proven | clear-screen-time (40 seeds) | screenRecords -12; screenEntries -1; screenDecided -1 |
| recordScreenTime | action | src/engine/screen-time.ts | proven | record-screen-time (40 seeds) | screenRecords +12; screenEntries +1; screenDecided +1 |
| moveEpisode | action | src/engine/season.ts | proven | move-episode (240 seeds) | firstEpisodeDirected +1.825; firstHours +6420.833; hours +7312.5; renewed -0.096 |
| continueProject | action | src/engine/sequel.ts | proven | continue-project (40 seeds) | continued +1; buildDays -22; spent -10516.5; daysToDeliver -13.425 |
| resumeProject | action | src/engine/shelve.ts | proven | shelve-resume (60 seeds) | hiresReleased +16; deliveredDay +368.167; offersDeclined +339.1; castRates +168.667; revenue -83569.417; money -93410.235 |
| shelveProject | action | src/engine/shelve.ts | proven | shelve-resume (60 seeds) | hiresReleased +16; deliveredDay +368.167; offersDeclined +339.1; castRates +168.667; revenue -83569.417; money -93410.235 |
| attachSong | action | src/engine/song-actions.ts | proven | add-song (40 seeds) | songs +2; songUses +2; released -2; revenue -115136.125 |
| changeVersionSong | action | src/engine/song-actions.ts | proven | version-song (40 seeds) | songChanges +2; songTasks +4; spent +2031 |
| createSong | action | src/engine/song-actions.ts | proven | add-song (40 seeds) | songs +2; songUses +2; released -2; revenue -115136.125 |
| detachSong | action | src/engine/song-actions.ts | proven | detach-song (40 seeds) | songUses -2; released +2; revenue +130338 |
| playFirstOverEndCredits | action | src/engine/song-actions.ts | proven | song-first-over-credits (40 seeds) | songEntries +1; songDecided +1 |
| removeSong | action | src/engine/song-actions.ts | proven | remove-song (40 seeds) | songs -2; spent -4504 |
| restoreVersionSong | action | src/engine/song-actions.ts | proven | restore-version-song (40 seeds) | songChanges -2; songTasks -4; spent -2096 |
| setSongPerformers | action | src/engine/song-actions.ts | not a feature |  | Names who sings a song, shown in the credits as "Song Performed By" (songs.ts) and in a casting note; a name, read only where it is shown. |
| syncMusicTasks | action | src/engine/song-actions.ts | not a feature |  | Follows a song change with the work it now needs; the song changes are their own rows. |
| syncSongTasks | action | src/engine/song-actions.ts | not a feature |  | Follows a song change with the work it now needs; the song changes are their own rows. |
| addPlan | action | src/engine/state.ts | proven | plan-over-call (40 seeds) | lateDays +1; quality.direction -0.625; overall -0.175; reception -0.175 |
| adoptPlace | action | src/engine/state.ts | not a feature |  | Makes a chosen place known to the world; the place field that chose it is the row. |
| cancelPlan | action | src/engine/state.ts | proven | cancel-plan (40 seeds) | lateDays -1; quality.direction +0.563; overall +0.238; reception +0.238 |
| startSleep | action | src/engine/state.ts | proven | sleep-through-call (40 seeds) | lateDays +1; quality.direction -0.637; overall -0.237; reception -0.237 |
| travelTo | action | src/engine/state.ts | proven | travel-away (40 seeds) | lateDays +3.925; quality.direction -2.137; overall -0.737; reception -0.737 |
| chooseTake | action | src/engine/takes-actions.ts | proven | weakest-takes (40 seeds) | weakTakes +0.775; quality.direction -0.725; overall -0.25; reception -0.25 |
| setShotPlan | action | src/engine/takes-actions.ts | proven | full-coverage (40 seeds) | setups +6; shootDays +26.025; spent +87761.25; quality.direction +2.263; overall +1.125 |
| formatDateKey | action | src/engine/time.ts | not a feature |  | Formats a date inside a change; not a decision. |
| withdrawRelease | action | src/engine/unscripted.ts | proven | withdraw-release (120 seeds) | redactions +1.592; runtime -3.575; daysToDeliver -0.171; spent +691.017 |
| addVersion | action | src/engine/versions.ts | proven | add-version (40 seeds) | versions +2; versionDays +1.9; spent +1249 |
| removeVersion | action | src/engine/versions.ts | proven | remove-version (40 seeds) | versions -1.975; versionDays -1.775; daysToDeliver -0.237; spent -1252 |
| acceptWriting | action | src/engine/writing-jobs.ts | proven | writing-polish (40 seeds) | passesAccepted +1.9; quality.script +1.738; overall +0.563 |
| cancelWriting | action | src/engine/writing-jobs.ts | proven | writing-cancel (40 seeds) | passesAccepted -1.9; passesCancelled +1.925; quality.script -1.912; overall -0.562; spent -873.25 |
| commissionWriting | action | src/engine/writing-jobs.ts | proven | writing-polish (40 seeds) | passesAccepted +1.9; quality.script +1.738; overall +0.563 |
| requestRevision | action | src/engine/writing-jobs.ts | proven | writing-revision (240 seeds) | passesWritten +1.904; spent +799.458 |
| bank.add_standing_order | bank | src/engine/bankworld | proven | standing-order (40 seeds) | interestIn +11501.04; money +15293.935 |
| bank.arrange_overdraft | bank | src/engine/bankworld | proven | arrange-overdraft (40 seeds) | gearOwned +0.4; interestOut +5.912; worth -117.424 |
| bank.borrow | bank | src/engine/bankworld | proven | bank-loan (60 seeds) | interestOut +1860.279; money +11383.286 |
| bank.break_term | bank | src/engine/bankworld | proven | break-term (40 seeds) | accounts -1; interestIn -41099.99; worth -41099.99 |
| bank.cancel_new | bank | src/engine/bankworld | proven | cancel-new (40 seeds) | accounts -1; bankFees -10.81; worth +10.81 |
| bank.cancel_scheduled | bank | src/engine/bankworld | proven | cancel-scheduled (40 seeds) | savingsHeld -1019127.17; interestIn -19127.17; worth -19127.17 |
| bank.cancel_standing_order | bank | src/engine/bankworld | proven | cancel-standing-order (40 seeds) | interestIn -8743.03; money -11626.369 |
| bank.cancel_switch | bank | src/engine/bankworld | proven | cancel-switch (40 seeds) | atFirstBank +18641505.543; interestIn -4302.46; worth -4875.18 |
| bank.claim_unclaimed | bank | src/engine/bankworld | proven | claim-unclaimed (40 seeds) | heldByState -10003.07; worth +10003.07 |
| bank.close_current | bank | src/engine/bankworld | proven | close-current (40 seeds) | accounts -1; bankFees -10.81; worth +8.71 |
| bank.close_savings | bank | src/engine/bankworld | proven | close-savings (40 seeds) | accounts -1; interestIn -19961; money -25455.788 |
| bank.debit_overdraft | bank | src/engine/bankworld | proven | debit-overdraft (40 seeds) | gearOwned +1; bankFees +34; worth -404.03 |
| bank.new_number | bank | src/engine/bankworld | proven | new-number (40 seeds) | takenByNumber -671.69; fraudCarried -671.69 |
| bank.open_current | bank | src/engine/bankworld | proven | open-current (40 seeds) | accounts +1; bankFees +10.81; worth -10.81 |
| bank.open_savings | bank | src/engine/bankworld | proven | bank-savings (40 seeds) | accounts +1; interestIn +19961; money +26543.883 |
| bank.open_term | bank | src/engine/bankworld | proven | term-deposit (40 seeds) | accounts +1; interestIn +41099.99; worth +41099.99 |
| bank.pay_collections | bank | src/engine/bankworld | proven | pay-collections (40 seeds) | inCollections -119.75; wellsAccounts +0.475 |
| bank.reactivate | bank | src/engine/bankworld | proven | reactivate (40 seeds) | dormantAccounts -1; inSavings -5000 |
| bank.redirect_deposits | bank | src/engine/bankworld | proven | redirect-deposits (40 seeds) | savingsHeld +118054.679; interestIn +565.969; worth +565.969 |
| bank.repay_loan | bank | src/engine/bankworld | proven | repay-loan (40 seeds) | loansOwed -2840.582; interestOut -428.55; worth +386.257 |
| bank.schedule_payment | bank | src/engine/bankworld | proven | scheduled-payment (40 seeds) | interestIn +19127.17; money +25435.066 |
| bank.set_alerts | bank | src/engine/bankworld | proven | large-payment-alert (40 seeds) | fraudKnownAfter -9.442; fraudCarried +350; worth -350 |
| bank.set_loan_repayment | bank | src/engine/bankworld | proven | loan-repayment (40 seeds) | paidFromNatwest +2683.139; natwestHeld -2683.139; atFirstBank +4087.635 |
| bank.set_order_source | bank | src/engine/bankworld | proven | order-source (40 seeds) | paidFromNatwest +5000; natwestHeld -5000; atFirstBank +4962.21 |
| bank.set_payments | bank | src/engine/bankworld | proven | credit-card (40 seeds) | accounts +1; onCard +1; cardPaid +846.28 |
| bank.set_primary | bank | src/engine/bankworld | proven | set-primary (40 seeds) | primaryIsFirst -0.975; paidFromNatwest +4874.601; natwestHeld -4999.601 |
| bank.set_round_ups | bank | src/engine/bankworld | proven | round-ups (40 seeds) | savingsHeld +0.39; inCurrent -0.38; interestIn +0.01 |
| bank.set_term_end | bank | src/engine/bankworld | proven | term-end (30 seeds) | interestIn -58062.09; worth -16962.1 |
| bank.stop_balance_transfer | bank | src/engine/bankworld | proven | stop-balance-transfer (40 seeds) | atFirstBank +18564683.75; interestIn -4302.46; worth -13572.551 |
| bank.switch | bank | src/engine/bankworld | proven | switch-bank (40 seeds) | atFirstBank -2; interestIn +3052.17; worth +3624.89; money +4820.332 |
| bank.take_overrun_loan | bank | src/engine/bankworld | proven | overrun-loan (40 seeds) | loans +1; inCollections -12.12; lclOpen +1; worth -23.47 |
| bank.take_term_interest | bank | src/engine/bankworld | proven | term-interest (40 seeds) | termHeld -617.53; inCurrent +617.53 |
| bank.transfer | bank | src/engine/bankworld | proven | bank-savings (40 seeds) | accounts +1; interestIn +19961; money +26543.883 |
| card.apply | bank | src/engine/bankworld | proven | credit-card (40 seeds) | accounts +1; onCard +1; cardPaid +846.28 |
| card.close | bank | src/engine/bankworld | proven | card-close (40 seeds) | cardsOpen -1; onCard -1; cardPaid -861.08 |
| card.dispute | bank | src/engine/bankworld | proven | dispute-charge (40 seeds) | fraudReported +1; fraudCarried -350; worth +350 |
| card.lock | bank | src/engine/bankworld | proven | card-lock (40 seeds) | onCard -1; cardPaid -853.139 |
| card.money_transfer | bank | src/engine/bankworld | proven | card-money-transfer (40 seeds) | transferredIn +1000; bankFees +30; interestOut +1.82; worth -31.82 |
| card.plan | bank | src/engine/bankworld | proven | card-plan (40 seeds) | interestOut -68.054; cardPaid +223; worth +68.054 |
| card.redeem_rewards | bank | src/engine/bankworld | proven | card-redeem (40 seeds) | rewardsLeft -17.09; worth +17.09; money +17.09 |
| card.refund_credit | bank | src/engine/bankworld | proven | card-refund (40 seeds) | cardCredit -1000; money +1329.786 |
| card.report | bank | src/engine/bankworld | proven | card-report (40 seeds) | onCard -1; cardPaid -846.28 |
| card.request_hardship | bank | src/engine/bankworld | proven | card-hardship (40 seeds) | bankFees -175.26; worth +175.26; owed -175.26 |
| card.request_limit | bank | src/engine/bankworld | proven | card-limit-down (40 seeds) | limit -2347; cardPaid -346.28 |
| card.set_auto_raise | bank | src/engine/bankworld | proven | card-no-auto-raise (40 seeds) | cardLimit -1353; cardPaid -704.82 |
| card.set_autopay_from | bank | src/engine/bankworld | proven | autopay-from (40 seeds) | paidFromNatwest +849.995; natwestHeld -849.995; atFirstBank +849.996 |
| card.set_everyday | bank | src/engine/bankworld | proven | card-everyday (40 seeds) | onNatwestCard +1; cardBillsToNatwest +846.28 |
| card.set_over_limit | bank | src/engine/bankworld | proven | card-over-limit (40 seeds) | onCardAmount +50; cardPaid +50 |
| card.set_statement_day | bank | src/engine/bankworld | proven | card-statement-day (40 seeds) | statementDay +28; interestOut +9.84; cardPaid -3.16 |
| cash.deposit | bank | src/engine/bankworld | proven | cash-deposit (40 seeds) | cashHeld -500; atFirstBank +500 |
| cash.withdraw | bank | src/engine/bankworld | proven | cash-withdrawal (40 seeds) | withdrawn +250; paidInCash +250 |
| documents.apply_passport | bank | src/engine/bankworld | proven | bank-passport (40 seeds) | passports +1; worth -46.07; inCurrent -46.07 |
| finance.pay_card | bank | src/engine/bankworld | proven | card-pay-full (40 seeds) | cardPaid +144.64; interestOut -281.33; worth +281.33 |
| finance.set_autopay | bank | src/engine/bankworld | proven | card-autopay-minimum (40 seeds) | cardPaid -145.165; interestOut +282.351; worth -282.351 |
| agent-answer | scheduled | src/engine/representation.ts | proven | agent (40 seeds) | viaAgent +7.075; jobsOffered +7.025; commission +3683.35; jobPay +23624.1; money +20093.127 |
| agent-notice-end | scheduled | src/engine/representation.ts | proven | agent-notice (40 seeds) | viaAgent -5.425; jobsOffered -5.45; jobPay -21068.975; commission -3053.4; money -19256.694 |
| agent-offer-lapse | scheduled | src/engine/representation.ts | proven | off-agent-offer-lapse (40 seeds) | represented -1; viaAgent -40.75; jobsOffered -40.825 |
| agent-renewal | scheduled | src/engine/representation.ts | proven | agent-renew (40 seeds) | renewals +3; represented +1; viaAgent +14; jobsOffered +14.025; jobPay +69828.35; money +60168.672 |
| agent-term-end | scheduled | src/engine/representation.ts | proven | agent-renew (40 seeds) | renewals +3; represented +1; viaAgent +14; jobsOffered +14.025; jobPay +69828.35; money +60168.672 |
| arrive | scheduled | src/engine/state.ts | proven | travel-away (40 seeds) | lateDays +3.925; quality.direction -2.137; overall -0.737; reception -0.737 |
| audience-week | scheduled | src/engine/distribution.ts | proven | off-audience-week (100 seeds) | renewalWait +36.97; renewed -0.38 |
| audition | scheduled | src/engine/auditions.ts | proven | audition (40 seeds) | readsSeen +14.725; castCapability +8.725; performance +7.813; overall +2.475; castRates +242.5 |
| birthday | scheduled | src/engine/state.ts | not a feature |  | A notice: it tells the player their age has changed. Age itself is read from the birth date wherever it matters (casting, licences), never from this event; switched off, nothing else changed (docs/v10/proof/off-birthday.json). |
| box-office-week | scheduled | src/engine/distribution.ts | proven | off-box-office-week (40 seeds) | gross +120135; revenue +39043.875; money +39043.875 |
| company-decision | scheduled | src/engine/company.ts | not a feature |  | Withdraws a company registration an older save had pending: companies left the game (v9 step 6), and nothing in a new story schedules it. |
| consent-response | scheduled | src/engine/documentary.ts | proven | off-consent-response (20 seeds) | delivered -1.25; revenue -69936.75; money -530264.588 |
| contributor-cut | scheduled | src/engine/documentary.ts | proven | off-contributor-cut (20 seeds) | delivered -1.05; revenue -45724.25; money -434856.713 |
| counter-lapse | scheduled | src/engine/hiring.ts | proven | off-counter-lapse (40 seeds) | countersTaken +3.675; castRates -26.75; hired +1.2 |
| distribution-offer | scheduled | src/engine/finish.ts | proven | off-distribution-offer (40 seeds) | distributed -1.65; revenue -117409.5; money -111101 |
| distribution-report | scheduled | src/engine/distribution.ts | proven | off-distribution-report (40 seeds) | revenue -95262.375; money -95262.375 |
| edition-announce | scheduled | src/engine/awards.ts | proven | off-edition-announce (40 seeds) | screenings -8.7; offers -7.375 |
| edition-deadline | scheduled | src/engine/awards.ts | proven | off-edition-deadline (40 seeds) | selected -4.75; standing.producing -6.25 |
| edition-deadline-soon | scheduled | src/engine/awards.ts | not a feature |  | A notice: it tells the player an entry deadline is near. The deadline that closes entries is its own system (edition-deadline), proven separately. |
| edition-open | scheduled | src/engine/awards.ts | proven | off-edition-open (40 seeds) | entries -38.775; selected -4.3 |
| edition-results | scheduled | src/engine/awards.ts | proven | off-edition-results (400 seeds) | finalised -8.767; won -0.09; standing.directing +0.308; backerBonus -0.005; offers -0.197 |
| edition-start | scheduled | src/engine/awards.ts | proven | off-edition-start (40 seeds) | screenings -7.5; offers -6.6 |
| editions-roll | scheduled | src/engine/awards.ts | proven | off-editions-roll (40 seeds) | editionsOpen -63.725; entries -25.7; selected -2.75 |
| episode-release | scheduled | src/engine/episode-releases.ts | proven | off-episode-release (40 seeds) | episodesOut -0.475; audience -83225 |
| family-repayment | scheduled | src/engine/personal.ts | not a feature |  | Takes a month's repayment of a family loan chosen in an older save's creation: a new story starts with the inheritance and no family terms (personal.ts openPersonalMoney), so nothing in it schedules this. |
| finance-counter | scheduled | src/engine/negotiation.ts | proven | better-terms (40 seeds) | asked +1.725; investorShare -0.087; investorPaid -4036.4; overall -0.575 |
| finance-deadline | scheduled | src/engine/finance.ts | proven | off-finance-deadline (40 seeds) | breached -1; repaymentDue -60000 |
| finance-decision | scheduled | src/engine/finance.ts | proven | off-finance-decision (40 seeds) | backerIn -34725; ownIn +34725; money +9471.404 |
| finance-offer-lapse | scheduled | src/engine/negotiation.ts | proven | off-finance-offer-lapse (40 seeds) | studioIn -850000; ownIn +850000; money +87708.225 |
| first-look-check | scheduled | src/engine/first-look.ts | proven | off-first-look-check (40 seeds) | firstLookOffers -1.45; overheadPaid -306250; money -791618.028 |
| first-look-counter | scheduled | src/engine/first-look.ts | proven | first-look-overhead (120 seeds) | overheadAsked +1.425; overheadAgreed +0.158; overheadPaid +55885.417; money +54646.697 |
| first-look-end | scheduled | src/engine/first-look.ts | proven | off-first-look-end (40 seeds) | firstLookEnded -1.45; overheadPaid -355000; money -458750 |
| first-look-lapse | scheduled | src/engine/first-look.ts | proven | off-first-look-lapse (40 seeds) | firstLookActive -0.975; money -2294626.55 |
| first-look-overhead | scheduled | src/engine/first-look.ts | proven | first-look-accept (40 seeds) | firstLookActive +1.5; money +619571.828 |
| guide-me | scheduled | src/engine/mandates.ts | proven | off-guide-me (40 seeds) | writingPasses -3.375; quality.script -2.537; spent -4258.5 |
| home | scheduled | src/engine/homes/index.ts | proven | housing-clock (40 seeds) | rentsPaid -24; money +46545.941; moneyChange +46545.941; worth +35002.548 |
| industry-decision | scheduled | src/engine/industry.ts | not a feature |  | Renews or ends the real series the world follows, as the catalog's world pages show them (catalog/world.ts, simseason.ts); nothing in a player's career reads those outcomes. |
| job-counter | scheduled | src/engine/jobs.ts | proven | ask-better-rate (60 seeds) | ratesAgreed +7.417; jobPay +5348.317; money +4632.203 |
| job-day | scheduled | src/engine/jobs.ts | proven | off-job-day (40 seeds) | jobsDone -0.8; jobPay -4990.65; money -5003.086 |
| job-lapse | scheduled | src/engine/jobs.ts | not a feature |  | Record-keeping: on an unanswered offer's last day it marks the offer lapsed, for your list and the record. The deadline itself is enforced when you answer (jobs.ts acceptRefusal: "That offer has lapsed."), so with this event switched off an offer still can't be taken late; nothing else reads the mark (docs/v10/proof/off-job-lapse.json). |
| job-offer | scheduled | src/engine/jobs.ts | proven | off-job-offer (40 seeds) | jobsOffered -1.1; jobPay -5967.6; money -6045.143 |
| licence-answer | scheduled | src/engine/music.ts | proven | license-song (40 seeds) | licensed +1.55; released +1.55; revenue +36972.5; spent +451 |
| licence-expiry | scheduled | src/engine/music.ts | proven | renew-licence (40 seeds) | renewals +0.825; released +0.825; spent +41.25 |
| offer-response | scheduled | src/engine/hiring.ts | proven | off-offer-response (40 seeds) | hired -16; delivered -2; revenue -122344.625 |
| opportunity | scheduled | src/engine/opportunities.ts | proven | off-opportunity (40 seeds) | opportunities -0.35; commissioned -0.35 |
| opportunity-expire | scheduled | src/engine/opportunities.ts | not a feature |  | Record-keeping: on an unanswered proposal's last day it marks it lapsed, for your list. The deadline is enforced when you answer (opportunities.ts acceptOpportunity checks expiresAt), so with this event switched off a proposal still can't be taken late; nothing else reads the mark (docs/v10/proof/off-opportunity-expire.json). |
| papers-decision | scheduled | src/engine/papers.ts | proven | work-permit (100 seeds) | permits +0.99; lateDays -3.53; spent +4725.5; quality.direction +4.25; overall +1.81 |
| papers-expiry | scheduled | src/engine/papers.ts | not a feature |  | Marks a visa or permit expired on its date and tells you to apply again. Whether it still lets you in or lets you work is read from its date wherever that matters (papers.ts entryRight, permitIn), so the stage it sets changes only the words. |
| papers-passport | scheduled | src/engine/papers.ts | proven | recorded-passport (40 seeds) | passports +1; papersPaid +36.64; worth -36.64 |
| permit-decision | scheduled | src/engine/papers.ts | not a feature |  | Decides a work permit applied for before November 14, 2026, which older saves still hold (papers.ts "what older saves hold"); nothing in a new story schedules it, and permits now go through Your Papers (papers-decision). |
| plan-reminder | scheduled | src/engine/state.ts | not a feature |  | A reminder in the log before a plan starts; the plan itself is proven (plan-over-call, cancel-plan), and the reminder decides nothing. |
| plan-start | scheduled | src/engine/state.ts | proven | plan-over-call (40 seeds) | lateDays +1; quality.direction -0.625; overall -0.175; reception -0.175 |
| production-confirm | scheduled | src/engine/productions.ts | proven | off-production-confirm (100 seeds) | productionsChanged -1.62; jobsDone +0.1; jobPay +680.3; jobsCancelled -0.09 |
| production-release | scheduled | src/engine/productions.ts | proven | off-production-release (180 seeds) | productionResults -5.883; industryStanding -0.015 |
| release | scheduled | src/engine/finish.ts | proven | off-release (40 seeds) | released -2; revenue -85231; money -85231 |
| release-licence-answer | scheduled | src/engine/release-plan.ts | proven | off-release-licence-answer (120 seeds) | licenceDeals -0.725; revenue -117680.875; money -109215.708 |
| revision-done | scheduled | src/engine/projects.ts | proven | revision-notes (40 seeds) | notesAddressed +6; quality.script +6; overall +1.825; reception +1.825 |
| screening | scheduled | src/engine/awards.ts | proven | attend-screening (30 seeds) | accepted +6.7; attended +5.8; offers +8.033 |
| screening-reminder | scheduled | src/engine/awards.ts | not a feature |  | A notice: it tells the player a screening they were invited to is near. Attending is the screening itself and the RSVP, proven separately. |
| season-decision | scheduled | src/engine/continuation.ts | proven | off-season-decision (100 seeds) | renewed -0.62; renewalFunding -22000; ownIn +22000 |
| shoot-call | scheduled | src/engine/production/shoot.ts | proven | off-shoot-call (40 seeds) | lateDays -1; quality.direction +0.6; overall +0.288 |
| shoot-wrap | scheduled | src/engine/production/shoot.ts | proven | off-shoot-wrap (40 seeds) | delivered -2; revenue -136781.125; money -157857.058 |
| stay-limit | scheduled | src/engine/papers.ts | proven | off-stay-limit (20 seeds) | overstays -1; usVisas -1; papersPaid -185; secondTripDays +30 |
| studio-release | scheduled | src/engine/finish.ts | proven | off-studio-release (40 seeds) | released -8.925; gross -1639510 |
| wake | scheduled | src/engine/state.ts | proven | off-wake (40 seeds) | lateDays +6.75; quality.direction -63.5; overall -58.712 |
| weather-check | scheduled | src/engine/production/shoot.ts | proven | off-weather-check (60 seeds) | lostDays +1.567; daysToDeliver +1.208; spent +3456.833 |
| work-day | scheduled | src/engine/production/workday.ts | proven | off-work-day (40 seeds) | delivered -1.975; revenue -140708.75; money -162293.04 |
| writing-day | scheduled | src/engine/writing-jobs.ts | proven | off-writing-day (40 seeds) | passesAccepted -1.875; quality.script -1.575; spent -886.25 |
| "Working Title" | field | everywhere a project is named | carried | tests/proposal.test.ts::makes one project | A name or a record, carried to everywhere a project is named: it decides nothing by its nature. |
| "Format" | field | proposal.ts proposeFromSource; projects.ts, production/tasks.ts | proven | adapt-short (40 seeds) | scenes -6; spent -295140.5; daysToDeliver -77.587 |
| "Medium" | field | production/tasks.ts buildTasks | proven | adapt-animated (40 seeds) | shootDays -48.075; hired +8; spent +68923.95; delivered -2 |
| {medium === 'hybrid' ? 'Animation Technique For Animated Scenes' : 'Animation Technique'} | field | production/tasks.ts buildTasks | proven | adapt-animated (40 seeds) | shootDays -48.075; hired +8; spent +68923.95; delivered -2 |
| "Episodes" | field | proposal.ts (the season it proposes); projects.ts | proven | adapt-episodes (40 seeds) | scenes +12; spent +270505.1; shootDays +32.075 |
| {episodic ? 'Target Minutes Per Episode' : 'Target Runtime In Minutes'} | field | proposal.ts (cast and scene count); estimate.ts | proven | adapt-longer (40 seeds) | shootDays +16.9; spent +126096.8; daysToDeliver +31.075 |
| {`Name For ${c.name}`} | field | shown everywhere the brief names them: blueprints.ts named, applyBlueprint | carried | tests/proposal.test.ts::makes one project | A name or a record, carried to shown everywhere the brief names them: blueprints.ts named, applyBlueprint: it decides nothing by its nature. |
| "First Name" | field | shown as your legal name, on credits: identity.ts legalName; with the birth and start dates it seeds the world (state.ts newGame) | carried | tests/identity.test.ts::credits carry the legal name | A name or a record, carried to shown as your legal name, on credits: identity.ts legalName; with the birth and start dates it seeds the world (state.ts newGame): it decides nothing by its nature. |
| "Middle Name (Optional)" | field | shown as your legal name, on credits: identity.ts legalName; with the birth and start dates it seeds the world (state.ts newGame) | carried | tests/identity.test.ts::credits carry the legal name | A name or a record, carried to shown as your legal name, on credits: identity.ts legalName; with the birth and start dates it seeds the world (state.ts newGame): it decides nothing by its nature. |
| "Last Name" | field | shown as your legal name, on credits: identity.ts legalName; with the birth and start dates it seeds the world (state.ts newGame) | carried | tests/identity.test.ts::credits carry the legal name | A name or a record, carried to shown as your legal name, on credits: identity.ts legalName; with the birth and start dates it seeds the world (state.ts newGame): it decides nothing by its nature. |
| "Pronouns" | field | state.ts newGame (settledTitle) | proven | pronouns-she (40 seeds) | actressEntries +12; actorEntries -12 |
| "Month" | field | shown as your age and birthday: state.ts characterAge, observedBirthday; it dates the inheritance (personal.ts inheritanceDay) and seeds the world (state.ts newGame) | carried | tests/dates.test.ts::you are exactly 19 on the starting date | A name or a record, carried to shown as your age and birthday: state.ts characterAge, observedBirthday; it dates the inheritance (personal.ts inheritanceDay) and seeds the world (state.ts newGame): it decides nothing by its nature. |
| "Day" | field | shown as your age and birthday: state.ts characterAge, observedBirthday; it dates the inheritance (personal.ts inheritanceDay) and seeds the world (state.ts newGame) | carried | tests/dates.test.ts::you are exactly 19 on the starting date | A name or a record, carried to shown as your age and birthday: state.ts characterAge, observedBirthday; it dates the inheritance (personal.ts inheritanceDay) and seeds the world (state.ts newGame): it decides nothing by its nature. |
| "Year Of Birth" | field | shown as your age and birthday: state.ts characterAge, observedBirthday; it dates the inheritance (personal.ts inheritanceDay) and seeds the world (state.ts newGame) | carried | tests/dates.test.ts::you are exactly 19 on the starting date | A name or a record, carried to shown as your age and birthday: state.ts characterAge, observedBirthday; it dates the inheritance (personal.ts inheritanceDay) and seeds the world (state.ts newGame): it decides nothing by its nature. |
| "Place Of Birth" | field | identity.ts citizenshipOf -> awards.ts nationality rules | proven | born-in-paris (40 seeds) | efaEntries +2.625; decided +2.625; entries +2.625 |
| "Where You Live" | field | state.ts newGame; projects.ts createProject (base) | proven | base-los-angeles (40 seeds) | lostDays -1.275; daysToDeliver -2.325; money -11951.166 |
| "Starting Date" | field | state.ts newGame | proven | start-2040 (40 seeds) | year +14; money +314439.518 |
| "Starting Time" | field | state.ts newGame | proven | start-evening (40 seeds) | daysToDeliver -1.062; breached -1.375; repaymentDue -27500; money +95951.055 |
| "Amount (US Dollars)" | field | personal.ts openInheritance, personalBalance, putInRefusal; cash/money.ts parseAmount | proven | small-inheritance (40 seeds) | ownIn -61150; delivered -2 |
| "Describe Your Ethnicity" | field | shown with your ethnicities: identity.ts splitBackgrounds | carried | e2e/creation.spec.ts::an ethnicity in your own words | A name or a record, carried to shown with your ethnicities: identity.ts splitBackgrounds: it decides nothing by its nature. |
| {o.name} | field | projects.ts createProject -> schedule.observances; schedule.ts isWorkingDay | proven | observances-kept (40 seeds) | daysToDeliver +4.638; breached +0.55; repaymentDue +11000; money -38992.553 |
| {`${languageName(l.code)} Proficiency`} | field | production/language.ts personLanguagesFit; casting-notes.ts fitNotes | proven | french-basic (40 seeds) | hired +2; spent +2605.75 |
| {`Hire The Rental House's Package On A Day The Kit Can't Serve (${money(housePackageFee(p))} A Day)`} | field | production/shoot.ts (a day the kit cannot serve); equipment.ts setPackageApproval | proven | package-approval (40 seeds) | kitPostponed -729; lostDays -727.375; daysToDeliver +33.688; delivered +2; spent +51940.5 |
| "Film It In" | field | destinations.ts dayPlace, awayCosts, permitWork; production/shoot.ts runShootDay; production/schedule.ts scheduleShootDay | proven | filmed-abroad (40 seeds) | filmedAway +6; spent +22739.6; daysToDeliver +10.625 |
| "Kind Of Site" | field | destinations.ts kindFee, permitWork, underCover, noisyDay | proven | site-station (40 seeds) | daysToDeliver +11.488; ownIn +5299; spent +11899.95; money -32150.388 |
| "Version" | field | shown where the version is entered: versions.ts addVersion (named and unique) | carried | tests/versions.test.ts::a version is conformed from the locked cut | A name or a record, carried to shown where the version is entered: versions.ts addVersion (named and unique): it decides nothing by its nature. |
| {sceneLabel(p, s)} | field | versions.ts versionScenes | proven | add-version (40 seeds) | versions +2; versionDays +1.9; spent +1249 |
| {`${g.label}: ${g.reason}`} | field | edit-actions.ts requestPickups | proven | pickup-scenes (40 seeds) | shootDays +5.05; spent +16086; daysToDeliver +3.713 |
| "Route" | field | finish.ts planRelease; awards.ts qualifying | proven | release-route (40 seeds) | entries +32.2; entryFees +1987.5 |
| "Release Date" | field | finish.ts planRelease; awards.ts qualifying windows | proven | release-date (40 seeds) | releaseDelay +166; entries +1.025; decided +0.95; entryFees +40.5 |
| "Territory Code" | field | awards.ts; finish.ts | proven | release-in-us (40 seeds) | entries -1.6; entryFees -461; selected -0.6 |
| "Which Cut" | field | finish.ts planRelease; music.ts releaseSongs, releaseLicenceRefusal | proven | which-cut (40 seeds) | released +1.6; usEntries +4.45; entries -32.025; decided -27.325 |
| "Episode Schedule" | field | episode-releases.ts presetDates; finish.ts planRelease | proven | schedule-weekly (40 seeds) | emmyYears -1; decided -1; emmyEntries -1 |
| "Episodes On The Premiere" | field | episode-releases.ts presetDates | proven | premiere-count (40 seeds) | emmyYears -1; decided -1; emmyEntries -1 |
| {`Episode ${i + 2}`} | field | episode-releases.ts episodeDateProblem; awards-rules.ts airing; awards.ts ruledReleaseFits | proven | episode-date (40 seeds) | emmyYears -1; decided -1; emmyEntries -1 |
| {`New Date For Episode ${e.number}`} | field | episode-releases.ts setEpisodeDates; release-schedule.ts scheduleChangeEffects | proven | episode-dates (40 seeds) | episodesMoved +2.75; renewalWait +25.2; money -261.625 |
| "Project" | field | awards.ts checkEligibility | proven | enter-awards (40 seeds) | entries +40.675; spent +1644.5; selected +4.625 |
| "Episode To Enter" | field | awards-actions.ts submitEntry; finish.ts assessEpisode | proven | episode-entry (40 seeds) | enteredEpisode +4.6; episodeScore +4.838; selected +0.575 |
| "Song To Enter" | field | awards-rules.ts songProblems | proven | song-to-enter (40 seeds) | songEntries +1; songDecided +1 |
| "Version To Enter" | field | awards-actions.ts entrySnapshot | proven | version-entry (40 seeds) | entries +29.625; decided +20.75; entryFees +1146; selected +3.5 |
| {performerLabel(c)} | field | awards-actions.ts submitEntry | proven | performer-entry (30 seeds) | leadRecipients -2.9; leadScore -5.194 |
| {`What To Capture For ${name}`} | field | mocap.ts bookMocap, sessionCost | proven | book-body-only (20 seeds) | spent -4067.5; overall -0.4 |
| {`Version In ${r.territories.map(countryName).join(', ')}`} | field | finish.ts setReleaseVersion, the release handler; distribution.ts territoriesReached, reportedGross | proven | release-dubbed (60 seeds) | dubbed +0.85; spent +4083.333; gross +6406.667; revenue +13511.333 |
| "Development Money From The Deal" | field | first-look.ts drawDevelopment, developmentRefusal, repayTurnaround | proven | draw-development (40 seeds) | developmentIn +47550; ownIn -47550; money +37486.843 |
| "Something Broken" | field | renting.ts reportRepair (who repairs: the landlord, or you for your things and damage you caused) | proven | report-your-repair (40 seeds) | repairSpend +186; money -247.34; moneyChange -247.34; worth -186 |
| "Ask Permission For" | field | renting.ts askPermission, decidePermission | proven | ask-to-paint (40 seeds) | jobsDone +1; workPaid +1523.85; money -2026.397; moneyChange -2026.397; worth -1523.85 |
| "Viewing Day" | field | shown in Viewings: index.ts arrangeViewing, view | carried | tests/homes.test.ts::a viewing comes on its day | A name or a record, carried to shown in Viewings: index.ts arrangeViewing, view: it decides nothing by its nature. |
| {`Your Offer (${home.currency})`} | field | buying.ts makeOffer, answerOffer, acceptCounter | proven | offer-below-asking (40 seeds) | pricePaid -24674; money +25110.042; moneyChange +25110.042; worth +18882.752 |
| "Paying With" | field | buying.ts purchaseQuote, decideFinance, complete, mortgageDue | proven | mortgage-not-cash (40 seeds) | mortgageLoan +465280; mortgageOwed +444464.886; money +390533.438; moneyChange +390533.438; worth -40556.448 |
| "Your Deposit (%)" | field | buying.ts purchaseQuote | proven | bigger-deposit (40 seeds) | mortgageLoan -153120; mortgagePayment -1033.877; money -128521.515; moneyChange -128521.515; worth +13346.807 |
| "Mortgage Term" | field | buying.ts purchaseQuote, mortgageDue | proven | shorter-mortgage (40 seeds) | mortgagePayment +1124.918; mortgageOwed -26232.302; money -24770.64; moneyChange -24770.64; worth +1099.171 |
| "Have It Inspected" | field | buying.ts makeOffer, inspect | proven | inspect-first (40 seeds) | inspections +1; money -592.819; moneyChange -592.819; worth -445.8 |
| {label} | field | building.ts saveDesign, buildQuote | proven | double-garage (40 seeds) | buildQuote +18232.5; money -18329.481; moneyChange -18329.481; worth -13783.77 |
| {label} | field | shown in words on the home: Homes.tsx outsideWords | carried | tests/homes.test.ts::changes with the work done to it | A name or a record, carried to shown in words on the home: Homes.tsx outsideWords: it decides nothing by its nature. |
| "Floors" | field | building.ts designProblems, buildQuote | proven | bigger-house (40 seeds) | buildQuote +83236; money -83345.504; moneyChange -83345.504; worth -62675.82 |
| "Width (m)" | field | building.ts designProblems | proven | bigger-house (40 seeds) | buildQuote +83236; money -83345.504; moneyChange -83345.504; worth -62675.82 |
| "Depth (m)" | field | building.ts designProblems | proven | bigger-house (40 seeds) | buildQuote +83236; money -83345.504; moneyChange -83345.504; worth -62675.82 |
| "Floor Area (m²)" | field | building.ts buildQuote, designProblems | proven | bigger-house (40 seeds) | buildQuote +83236; money -83345.504; moneyChange -83345.504; worth -62675.82 |
| "Windows Across Each Floor" | field | shown in words on the home: Homes.tsx outsideWords | carried | tests/homes.test.ts::changes with the work done to it | A name or a record, carried to shown in words on the home: Homes.tsx outsideWords: it decides nothing by its nature. |
| "Balconies" | field | building.ts buildQuote, designProblems | proven | balconies (40 seeds) | buildQuote +13200; money -13270.213; moneyChange -13270.213; worth -9979.2 |
| {title(o)} | field | building.ts buildQuote, designProblems | proven | a-porch (40 seeds) | buildQuote +22000; money -22117.021; moneyChange -22117.021; worth -16632 |
| {`${ROOM_WORDS[r.kind]} ${i + 1} (m²)`} | field | building.ts designProblems (model.ts roomCheck) | proven | bigger-house (40 seeds) | buildQuote +83236; money -83345.504; moneyChange -83345.504; worth -62675.82 |
| "Work" | field | living.ts workQuote, workRefusal, startWork, workDone; model.ts permissionFor | proven | ask-to-paint (40 seeds) | jobsDone +1; workPaid +1523.85; money -2026.397; moneyChange -2026.397; worth -1523.85 |
| "New Colour" | field | shown in words on the home: living.ts workDone; Homes.tsx outsideWords | carried | tests/homes.test.ts::changes with the work done to it | A name or a record, carried to shown in words on the home: living.ts workDone; Homes.tsx outsideWords: it decides nothing by its nature. |
| "Roof Material" | field | shown in words on the home: living.ts workDone; Homes.tsx outsideWords | carried | tests/homes-choices.test.ts::the work chosen sets its cost | A name or a record, carried to shown in words on the home: living.ts workDone; Homes.tsx outsideWords: it decides nothing by its nature. |
| "For The Room" | field | living.ts itemCheck, buyItem, installRefusal | proven | washer-in-the-laundry (40 seeds) | itemSpend +988.75; money -976.916; moneyChange -976.916; worth -734.641 |
| "Nights" | field | living.ts bookStay | proven | stay-longer (40 seeds) | staySpend +560; money -553.299; moneyChange -553.299; worth -416.08 |
| "Something Broken" | field | renting.ts reportRepair, approveRepair | proven | owner-repairs-roof (40 seeds) | repairSpend +1295; repairsFixed +0.925; money -1279.502; moneyChange -1279.502; worth -962.185 |
| {`Asking Price (${cur})`} | field | buying.ts listForSale, buyerOffer | proven | ask-more (40 seeds) | saleOffer +25528.275; soldAtDay +5; money +23045.231; moneyChange +23045.231; worth +17330.014 |
| {`New Rent (${cur})`} | field | letting.ts changeRent, chooseTenant, receiveRent | proven | cheaper-rent (40 seeds) | letIncome -11281.675; money -11736.91; moneyChange -11736.91; worth -8826.156 |
| {`Rent A Month (${cur})`} | field | letting.ts advertise, applicantsArrive, receiveRent | proven | let-the-home (40 seeds) | letRents +23; letIncome +50121.9; money +53018.479; moneyChange +53018.479; worth +39869.896 |
| "Have An Agent Manage It" | field | letting.ts receiveRent | proven | agent-manages (40 seeds) | letCosts +5125.225; money -5127.167; moneyChange -5127.167; worth -3855.63 |
| {`Repair Limit (${cur})`} | field | letting.ts receiveRent | proven | repair-limit (80 seeds) | letCosts +2021.913; money -2023.99; moneyChange -2023.99; worth -1522.04 |
| {s.label} | field | shown in the idea's words: brief.ts fill | carried | tests/brief.test.ts::writes the player's names where the idea has slots, and its suggestions where they left them blank | A name or a record, carried to shown in the idea's words: brief.ts fill: it decides nothing by its nature. |
| {c.name} | field | brief.ts applyIdea | proven | idea-characters (40 seeds) | ownIn +9350; daysToDeliver +6.125; spent +8982.5 |
| {`Scene ${i + 1} | field | brief.ts applyIdea | proven | idea-scenes (40 seeds) | spent +41850.75; ownIn +18900; daysToDeliver +6.338 |
| {`${b.intExt === 'EXT' ? 'Exterior' : 'Interior'} | field | brief.ts applyIdea; projects.ts addScene | proven | idea-beat (40 seeds) | shootDays +1.1; spent +10315.5; daysToDeliver +2.538 |
| {`Keep My ${o.label}`} | field | brief.ts applyIdea | proven | idea-keep-tone (40 seeds) | chamber +2; spent +10109 |
| "When It Starts" | field | shown as the logline it builds: src/ideas/loglines.ts compose; brief.ts applyIdea | carried | tests/ideas.test.ts::refuses parts that don't go together, and parts that aren't there | A name or a record, carried to shown as the logline it builds: src/ideas/loglines.ts compose; brief.ts applyIdea: it decides nothing by its nature. |
| "Who It Happens To" | field | shown as the logline it builds: src/ideas/loglines.ts compose; brief.ts applyIdea | carried | tests/ideas.test.ts::refuses parts that don't go together, and parts that aren't there | A name or a record, carried to shown as the logline it builds: src/ideas/loglines.ts compose; brief.ts applyIdea: it decides nothing by its nature. |
| "What They Must Do" | field | shown as the logline it builds: src/ideas/loglines.ts compose; brief.ts applyIdea | carried | tests/ideas.test.ts::refuses parts that don't go together, and parts that aren't there | A name or a record, carried to shown as the logline it builds: src/ideas/loglines.ts compose; brief.ts applyIdea: it decides nothing by its nature. |
| "What It Costs" | field | shown as the logline it builds: src/ideas/loglines.ts compose; brief.ts applyIdea | carried | tests/ideas.test.ts::refuses parts that don't go together, and parts that aren't there | A name or a record, carried to shown as the logline it builds: src/ideas/loglines.ts compose; brief.ts applyIdea: it decides nothing by its nature. |
| "Find A Composer, Artist Or Recording" | field | music-catalog.ts searchMusic | not a feature |  | A search of the music catalog: it narrows who and what is listed (tests/music-catalog.test.ts::finds people by name and role), as the role filter beside it does. Licensing a recording or considering a composer found is the decision, proven by license-recording and consider-composer. |
| "Their Role" | field | music-catalog.ts searchMusic | not a feature |  | A filter of the music catalog: it narrows who is listed (tests/music-catalog.test.ts::finds people by name and role). Choosing someone listed is the decision, and those are their own rows. |
| "Music Spending Ceiling" | field | mandates.ts guideMePlan, runMandate, guideMeRefusal | proven | music-ceiling (40 seeds) | guideMeHires -2; quality.music -61.812; delivered -2 |
| "Let The Composer's Themes Stand Without My Review" | field | cues.ts onThemesDone, themesGate; production/workday.ts | proven | themes-stand (40 seeds) | themesApproved +2; delivered +2; released +2 |
| "What Music It Has" | field | cues.ts proposeCues, scoreMinutes; production/tasks.ts (post:music, post:score-session) | proven | music-silence (40 seeds) | cues -4; spent -4795; daysToDeliver -2.337; quality.music -58.487 |
| "The Score's Sound" | field | craft.ts SCORES, scoreSessions; production/tasks.ts | proven | score-sound-chamber (40 seeds) | chamber +2; spent +12444; daysToDeliver +2.125 |
| "How Much Of It Is Scored" | field | cues.ts proposeCues, scoreMinutes; production/tasks.ts post:music | proven | score-density (40 seeds) | scoredSeconds +2574; spent +20705; daysToDeliver +16 |
| "Let The Composer's Themes Stand Without My Review" | field | cues.ts onThemesDone, themesGate; production/workday.ts | proven | themes-stand (40 seeds) | themesApproved +2; delivered +2; released +2 |
| {`Intensity Of ${c.code}`} | field | cues.ts judgeScore | proven | cue-loud (40 seeds) | highUnderTalk +8; quality.music -8 |
| {LICENCE_MEDIUM_LABELS[m]} | field | music.ts holderFee, releaseLicenceRefusal | proven | licence-media (40 seeds) | licenceFees +4065; spent +5541; money -85866.315 |
| "The Whole World" | field | music.ts holderFee, licence-answer (refusal odds, counteroffer), releaseLicenceRefusal | proven | licence-world (40 seeds) | licenceFees +5538.5; spent +8568.6; money +164272.49 |
| "Countries, By Two-Letter Code" | field | music.ts holderFee, releaseLicenceRefusal | proven | licence-countries (40 seeds) | licenceFees +2600; spent +1926.4; money -1750 |
| "For How Long" | field | music.ts holderFee, agreeLicence (expiry), licence-expiry | proven | licence-years (40 seeds) | licenceYears +3.45; released +0.85; spent +34.5 |
| "Your Notes On The Themes" | field | cues.ts giveThemeNotes, themeTasks; song-actions.ts syncMusicTasks | proven | theme-notes (40 seeds) | themeRounds +4; quality.music +4; spent +2287; daysToDeliver +3.55 |
| "Treat As An Adult In This Story" | field | guests.ts canApproach -> hiring.ts makeOffer, casting-calls.ts inviteRefusal | proven | treat-as-adult (40 seeds) | realCast +1.85; castCapability -7.812; performance -6.581; castRates +322.75 |
| "Consider Them For" | field | guests.ts considerFor -> hiring.ts candidatesFor | proven | consider-real (40 seeds) | realCast +1.75; castCapability -3.65; performance -2.831; castRates +562.75 |
| "Title" | field | the calendar, reminders | carried | tests/foundation.test.ts::Advance stops at a reminder | A name or a record, carried to the calendar, reminders: it decides nothing by its nature. |
| "Start Time" | field | state.ts addPlan | proven | plan-over-call (40 seeds) | lateDays +1; quality.direction -0.625; overall -0.175; reception -0.175 |
| "Length In Minutes" | field | production/schedule.ts planShootDays (your commitments) | proven | plan-over-call (40 seeds) | lateDays +1; quality.direction -0.625; overall -0.175; reception -0.175 |
| "Reminder" | field | state.ts addPlan (plan-reminder event) | not a feature |  | When a plan's reminder comes: a notice, as its event is (scheduled:plan-reminder above). A plan you sleep through is marked missed, and nothing reads a missed plan. |
| {`Day Rate For ${c.name}`} | field | hiring.ts resolveOffer | proven | offered-rate (40 seeds) | castRates -210.4; spent -610.25; countersSeen +0.725; money +610.242 |
| "What To Call It" | field | shown as the stage's name: parts.ts partName: the Cast page, call sheets, offers, credits | carried | tests/parts.test.ts::is cast on its own | A name or a record, carried to shown as the stage's name: parts.ts partName: the Cast page, call sheets, offers, credits: it decides nothing by its nature. |
| "Age In These Scenes (Optional)" | field | minors.ts minorFor (an uncast stage) | proven | stage-age-child (40 seeds) | hired +4; spent +6548.25; daysToDeliver +4.913 |
| {`Episode ${e}`} | field | parts.ts stageIn, partScenes; hiring.ts estimateDays | proven | stage-episode (40 seeds) | stageDays +2; mainDays -2 |
| {sceneLabel(p, s)} | field | parts.ts stageIn, castIn; production/shoot.ts; callsheet.ts; finish.ts | proven | add-stage (40 seeds) | stages +2; stageCast +2; performersCast +2; castRates +1578.75 |
| {`Read ${who.name} With`} | field | auditions.ts pairChemistry | proven | chemistry-read (40 seeds) | chemistryRead +3.575; castChemistry +3.125; performance -0.706; overall -0.262 |
| {`Writer For Episode ${e.number}`} | field | finish.ts assessEpisode | proven | episode-writer (40 seeds) | episodesByHire -2.925; writingWorks +0.375; writingCraft +10.85 |
| "Writer" | field | projects.ts assignEpisodeRole; finish.ts computeCredits, assessQuality | proven | film-writer (40 seeds) | writtenByHire -1.925; writingWorks +1.925; writingCraft +47.35 |
| {`Director For Episode ${e.number}`} | field | finish.ts assessEpisode; production/schedule.ts blocks | proven | episode-director (40 seeds) | directedByHire +1.8; quality.direction +3.913; overall +0.813; spent +6272.35 |
| "Director" | field | production/shoot.ts onSetHires; finish.ts computeCredits, assessQuality | proven | film-director (40 seeds) | directedByHire +1.85; quality.direction +7.825; overall +1.575; standing.directing -4.9 |
| "Production Start" | field | production/schedule.ts generatePlan | proven | plan-later (40 seeds) | firstShootDay +70; daysToDeliver +67.35; revenue -22787.375 |
| "Rehearsal Days" | field | production/shoot.ts; hiring.ts (booked days) | proven | rehearsal-days (120 seeds) | performance +5.077; overall +1.442; daysToDeliver +5.588; reception +1.404; revenue +14302.708 |
| "Stop-Motion Stages" | field | production/workday.ts | proven | stopmotion-stages (40 seeds) | daysToDeliver +44.025; spent -7354.65; money -14123.565 |
| "Render Nodes" | field | production/workday.ts | proven | render-nodes (40 seeds) | daysToDeliver +56.65; spent -2130.5; money -12725.975 |
| "Six-Day Weeks" | field | production/schedule.ts isWorkingDay | proven | six-day-weeks (60 seeds) | daysToDeliver -3.608; spent +4574.5 |
| "Shoot Episodes In Blocks" | field | production/schedule.ts | proven | shoot-in-blocks (40 seeds) | shootDays -4.35; spent -9689.15; daysToDeliver -3.212 |
| "Work On Public Holidays" | field | production/schedule.ts isWorkingDay | proven | work-holidays (40 seeds) | daysToDeliver -6.312; spent +4929.75 |
| {`${c.name} Puppet Copies`} | field | production/schedule.ts; production/workday.ts | proven | puppet-copies (40 seeds) | spent +30997; money +63248.392; daysToDeliver +21.85 |
| {`Emphasis For ${sceneLabel(p, s)}`} | field | takes.ts; directing.ts | proven | emphasis-performances (40 seeds) | spent +193031; shootDays +34.25; money -184639.346 |
| {`Camera For ${sceneLabel(p, s)}`} | field | craft.ts craftTime, craftRoles, rigDayCost, takeSpread; takes.ts planTime, recordTakes | proven | camera-moving (40 seeds) | spent +2874; ownIn +2600; overall -0.4 |
| {`Coverage For ${sceneLabel(p, s)}`} | field | takes.ts requiredSetups; production/shoot.ts | proven | full-coverage (40 seeds) | setups +6; shootDays +26.025; spent +87761.25; quality.direction +2.263; overall +1.125 |
| {`Takes For ${sceneLabel(p, s)}`} | field | takes.ts setupTime | proven | full-coverage (40 seeds) | setups +6; shootDays +26.025; spent +87761.25; quality.direction +2.263; overall +1.125 |
| {`Site For ${place}`} | field | locations.ts | proven | stage-sets (40 seeds) | onStage +6; spent -2069.5; lostDays -1.55; daysToDeliver -2.325 |
| {`Backup For ${place}`} | field | locations.ts | proven | site-backup (40 seeds) | lostDays -1.15; shootDays -1.15; money +2946.041 |
| "New Planned Budget (US Dollars)" | field | project-budget.ts setPlannedBudget, readiness | proven | new-planned-budget (40 seeds) | ownIn +5470.5; hired +12.075; delivered +1.75; lostDays -672.175; revenue +118165.125 |
| "Why" | field | PlanViews.tsx Plan Revisions | carried | tests/v8-budget.test.ts::keeps 20,000 and 2,000,000 exactly | A name or a record, carried to PlanViews.tsx Plan Revisions: it decides nothing by its nature. |
| "Change Financing Target" | field | finance.ts financeSummary, decide | proven | finance-target (40 seeds) | backerIn +39787.5; leftInProjects +34385; money -20375.115; revenue -20960.85 |
| {`Ask The ${d.backer} For`} | field | negotiation.ts | proven | better-terms (40 seeds) | asked +1.725; investorShare -0.087; investorPaid -4036.4; overall -0.575 |
| "Spending Ceiling" | field | mandates.ts guideMePlan, runMandate, guideMeRefusal | proven | guide-me-writing (40 seeds) | writersHired +3.975; quality.script +2.325; overall +0.538; spent +2241.5 |
| "Working Title" | field | everywhere a project is named | carried | e2e/title-input.spec.ts::a title typed, edited, cleared, pasted and submitted | A name or a record, carried to everywhere a project is named: it decides nothing by its nature. |
| "Format" | field | projects.ts, production/tasks.ts, awards.ts | proven | format-feature (120 seeds) | revenue -6854.25; money -6607.152 |
| "Medium" | field | production/tasks.ts buildTasks | proven | medium-animation (40 seeds) | shootDays -7.75; daysToDeliver -33.95; spent +285378.75; money -622443.797; revenue -151542.625 |
| {medium === 'hybrid' ? 'Animation Technique For Animated Scenes' : 'Animation Technique'} | field | production/tasks.ts buildTasks | proven | technique-stop-motion (40 seeds) | hired +6; daysToDeliver +35.638; spent +53825 |
| "Animation Finish" | field | production/workday.ts (render hours per frame); estimate.ts | proven | animation-finish (40 seeds) | spent +182831.75; daysToDeliver -232.725; quality.craft -59.55; money -444504.136 |
| "Episodes" | field | projects.ts; production/tasks.ts | proven | episodes-three (40 seeds) | shootDays +5.275; spent +23896.6; daysToDeliver +9.388; revenue -27694.875 |
| {episodic ? 'Target Minutes Per Episode' : 'Target Runtime In Minutes'} | field | awards.ts checkEligibility (running time); estimate.ts | proven | runtime-longer (40 seeds) | quality.script -1; overall -0.225; reception -0.225 |
| ? | field | genres.ts composeGenres; script-effects.ts competesAs; finish.ts subtitlingCost | proven | genre-comedy (120 seeds) | reception -0.35; overall -0.35; gross -1118.333; standing.writing -1; revenue -1876.875; money -1864.522 |
| "Intended Audience" | field | awards-rules.ts; script-explain.ts audienceContentNote | proven | audience-family (40 seeds) | entries +3; entryFees +180 |
| "Tone" | field | cues.ts proposeBrief | proven | tone (40 seeds) | chamber +2; spent +8960.75; cues -2 |
| "Competes As" | field | script-effects.ts competesAs | proven | competes-comedy (40 seeds) | comedyEntries +3; selected +0.15 |
| "Story Era" | field | projects.ts deriveRequirements (period research); production/tasks.ts costumes | proven | story-era (40 seeds) | spent +8227.25; hired +2; ownIn +11325 |
| ? | field | finish.ts subtitlingCost; awards.ts language rules | proven | dialogue-french (40 seeds) | hired +2; spent +16039.45 |
| "Story Setting Place" | field | projects.ts deriveRequirements; production/tasks.ts | proven | setting-abroad (40 seeds) | spent +2208; hired +2; ownIn +3475 |
| "Production Base" | field | production/schedule.ts isWorkingDay; weather.ts | proven | base-los-angeles (40 seeds) | lostDays -1.275; daysToDeliver -2.325; money -11951.166 |
| "Planned Budget (US Dollars)" | field | project-budget.ts setPlannedBudget, budgetPicture, plannedText; finance.ts financeSummary | proven | plan-budget (40 seeds) | target +81525; ownIn +5100; backerIn +76425; revenue -25776.85; money -25843.978 |
| "Plan This Season As The Last" | field | continuation.ts season-decision, canContinue | proven | final-season (100 seeds) | ended +0.93; firstRenewed -0.46; slateRaised -0.21; laterRenewed +0.1 |
| "Years That Pass In The Story" | field | sequel.ts continueProject | proven | story-years (40 seeds) | hired -2.025; daysToDeliver -3.7 |
| {PLAN_ROUTES[r].label} | field | release-plan.ts setReleasePlan, proposalRefusal, selfRefusal; finish.ts festivalHold | proven | self-release-stores (40 seeds) | revenue +39280.5; money +36680.5; spent +2600 |
| "Plan Territories" | field | release-plan.ts buyerValue, proposeLicence, selfCosts, releaseYourself | proven | plan-territories (40 seeds) | revenue +27776; money +27776 |
| "First Public Date" | field | release-plan.ts leadDays, releaseYourself (planRelease date) | proven | first-public-date (40 seeds) | revenue -19743.5; money -19743.5 |
| "Held For Festivals Until" | field | finish.ts festivalHold in planRelease and acceptDistribution | proven | festival-hold (40 seeds) | distributed -1.725; revenue -117055.25; money -109857.25 |
| "Version Abroad" | field | release-plan.ts releaseYourself (finish.ts setReleaseVersion) | proven | version-dubbed (40 seeds) | spent +2765; money +6254.5; revenue +9019.5 |
| "Promotion Budget" | field | release-plan.ts selfCosts; distribution.ts promoLift in reportedGross | proven | promotion-budget (40 seeds) | spent +6000; revenue +11011; money +5011 |
| {`${label}: Buyer`} | field | release-plan.ts proposeLicence, answerProposal | proven | licence-proposal (120 seeds) | licenceDeals +0.808; releaseDelay -14.571; gross +73761.667; revenue -12798.5; money -15087 |
| {`${label}: Your Ask`} | field | release-plan.ts answerProposal | proven | licence-ask (100 seeds) | licenceDeals -0.89; releaseDelay +31.42; licenceFee -16090; revenue +16044.6; money +18294.8 |
| {`${label}: Exclusive`} | field | release-plan.ts buyerValue; distribution.ts heldTerritories | proven | licence-exclusive (100 seeds) | licenceFee +8930; money -11385.5 |
| {`Keep My ${c.label}`} | field | blueprints.ts applyBlueprint | proven | keep-year (40 seeds) | periodFilms +2; spent +59445.95; daysToDeliver +12.675 |
| {`Keep My ${c.label} And Add None`} | field | blueprints.ts applyBlueprint | proven | keep-characters (40 seeds) | parts -10; castRates -8653.75; spent -119115.4 |
| "Save Name" | field | the saved games list | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to the saved games list: it decides nothing by its nature. |
| "Wake Me For Obligations" | field | state.ts runEvents | proven | no-wake-for-obligations (40 seeds) | lateDays +1; quality.direction -0.525; overall -0.237 |
| "The Light It Is Shot In" | field | craft.ts craftTime, gafferNeeded, cameraTestDays, postFactors; takes.ts planTime; hiring.ts neededRoles; production/tasks.ts buildTasks | proven | light-contrast (120 seeds) | spent +3364.333; money -3055.835 |
| "The Score" | field | craft.ts postFactors, scoreSessions; production/tasks.ts buildTasks | proven | score-chamber (40 seeds) | spent +11761.25; ownIn +12550; daysToDeliver +3.175 |
| {SOUNDS[k].label} | field | craft.ts craftTime, craftRoles, postFactors, dialogueHolds; production/tasks.ts buildTasks; production/shoot.ts needsDialogueReplacement | proven | sound-clarity (40 seeds) | hired +2; spent +11103.75; ownIn +10450 |
| "Central Question" | field | script-effects.ts documentsNeeded | proven | question-missing (20 seeds) | grantsAsked -2; grantIn -84000; ownIn +96000 |
| "Central Question" | field | shown in the Story panel; part of the Statement Of Intent for a documentary | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the Story panel; part of the Statement Of Intent for a documentary: it decides nothing by its nature. |
| "Synopsis" | field | shown in the Story panel | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the Story panel: it decides nothing by its nature. |
| "Logline" | field | script-effects.ts documentsNeeded | proven | logline-missing (40 seeds) | backerDeals -1; ownIn +35475; money -83869.518 |
| "Premise" | field | script-effects.ts documentsNeeded | proven | premise-missing (40 seeds) | backerDeals -1; ownIn +36650; money -66863.767 |
| "Stakes" | field | script-effects.ts documentsNeeded | proven | stakes-missing (40 seeds) | grantsAsked -2; grantIn -28225; ownIn +28225 |
| "Central Conflict" | field | script-effects.ts documentsNeeded | proven | conflict-missing (40 seeds) | grantsAsked -2; grantIn -36450; ownIn +36450 |
| "Point Of View" | field | script-effects.ts documentsNeeded | proven | viewpoint-missing (40 seeds) | grantsAsked -2; grantIn -36575; ownIn +36575 |
| "Theme" | field | script-effects.ts documentsNeeded | proven | theme-missing (40 seeds) | grantsAsked -2; grantIn -39825; ownIn +39825 |
| "Intended Ending" | field | script-effects.ts documentsNeeded | proven | ending-missing (40 seeds) | grantsAsked -2; grantIn -31150; ownIn +31150 |
| "Intended Experience" | field | cues.ts proposeBrief | proven | intended-experience (40 seeds) | silent +2; cues -4; spent -5741.5; daysToDeliver -2.45; quality.music -61.1 |
| "Who It Is For" | field | shown in the Story panel | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the Story panel: it decides nothing by its nature. |
| "How It Is Built" | field | shown in the Story panel | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the Story panel: it decides nothing by its nature. |
| "Tone" | field | cues.ts proposeBrief | proven | tone (40 seeds) | chamber +2; spent +8960.75; cues -2 |
| "Competes As" | field | script-effects.ts competesAs | proven | competes-comedy (40 seeds) | comedyEntries +3; selected +0.15 |
| "Source Material" | field | awards-rules.ts (original or adapted screenplay) | proven | source-adapted (40 seeds) | adaptedEntries +9; entries -3 |
| "Adapted From" | field | shown with the project | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the project: it decides nothing by its nature. |
| "When It Is Set" | field | awards-rules.ts requirementProblems | proven | set-in-period (40 seeds) | periodEntries +5.55; decided +2.775; entries +2.775 |
| "Year It Is Set In" | field | looks.ts periodBand, projectBand; projects.ts deriveRequirements; production/tasks.ts buildTasks | proven | story-year (40 seeds) | spent +8684.25; money -8453.79; daysToDeliver +1.863 |
| "The Look It Borrows" | field | the Creative Brief card | carried | tests/looks.test.ts::1986 made in 2026 is a period: research, and half as much costume work again; 2026 is neither; the look it borrows changes no work | A name or a record, carried to the Creative Brief card: it decides nothing by its nature. |
| "Story Setting Place" | field | projects.ts deriveRequirements | proven | setting-abroad (40 seeds) | spent +2208; hired +2; ownIn +3475 |
| "Story Setting" | field | shown in the Story panel | carried | tests/script-effects.test.ts::briefs add no work | A name or a record, carried to shown in the Story panel: it decides nothing by its nature. |
| {x.label} | field | awards-rules.ts PROJECT_SUBJECTS | proven | subject-civil-rights (40 seeds) | entries +3; decided +2 |
| {q.label} | field | shown with the genre questions | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the genre questions: it decides nothing by its nature. |
| "Draft Name" | field | drafts list | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to drafts list: it decides nothing by its nature. |
| "Draft Name" | field | drafts list | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to drafts list: it decides nothing by its nature. |
| {`"${x.title}" In This Scene`} | field | songs.ts songUses; projects.ts deriveRequirements | proven | add-song (40 seeds) | songs +2; songUses +2; released -2; revenue -115136.125 |
| "Interior Or Exterior" | field | production/shoot.ts (weather) | proven | scene-exterior (40 seeds) | lostDays +1.3; shootDays +1.075; money -17538.442 |
| "Place" | field | production/schedule.ts groupShootDays | proven | scenes-one-place (40 seeds) | shootDays -3.65; spent -17370.25; ownIn -1150 |
| "Time Of Day" | field | production/rates.ts dayFees | proven | scene-night (120 seeds) | wagesPaid +1545.417; money -4552.091; overall +0.35 |
| "Estimated Minutes" | field | production/schedule.ts sceneLoad; finish.ts runtime | proven | scene-minutes (40 seeds) | runtime +22; spent +11718.95; daysToDeliver +7.2; offered +78500; guarantees +39000; money -7320.807 |
| "Kind" | field | projects.ts deriveRequirements (interview, archival) | proven | scene-archival (40 seeds) | shootDays -3.2; hired +1.975; spent -4585.45 |
| "Basis" | field | projects.ts scriptIssues (sourced needs a fact) | proven | scene-dramatized (40 seeds) | researchItems -2; spent -649.75 |
| "Technique For This Scene" | field | projects.ts sceneTechnique; production/tasks.ts | proven | scene-technique (40 seeds) | taskKinds +3.975; spent +39735.25; daysToDeliver +52.313 |
| "Act" | field | shown as advice: structure.ts structureNotes | carried | tests/structure.test.ts::group scenes; an empty act is noted | A name or a record, carried to shown as advice: structure.ts structureNotes: it decides nothing by its nature. |
| "Tonal Intention" | field | shown as advice: projects.ts scriptIssues (tonal genres note a missing one) | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown as advice: projects.ts scriptIssues (tonal genres note a missing one): it decides nothing by its nature. |
| "Who Is Recording" | field | shown as advice: projects.ts scriptIssues (found footage) | carried | tests/genres.test.ts::module consumers change the right downstream state | A name or a record, carried to shown as advice: projects.ts scriptIssues (found footage): it decides nothing by its nature. |
| {c.name} | field | projects.ts deriveRequirements; hiring.ts estimateDays | proven | friend-out-of-cafe (40 seeds) | spent -1913.5; ownIn -475 |
| {`${c.name}'s Look In This Scene`} | field | looks.ts stateIn, statesUsed, costumeCopies, changeMinutes, makeupShare | proven | scene-look (40 seeds) | spent +18006.5; ownIn +18750 |
| {c.name} | field | projects.ts deriveRequirements (interviews, consent) | proven | scene-contributor (40 seeds) | interviews +2; blurDays +1.075; spent -4185.2; daysToDeliver -3.562 |
| {e.claim.slice(0, 50)} | field | projects.ts scriptIssues | proven | claim-linked (40 seeds) | researchItems -2; quality.script +1.75; overall +0.525 |
| "Objective" | field | shown as advice: projects.ts scriptIssues (advisory note when empty) | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown as advice: projects.ts scriptIssues (advisory note when empty): it decides nothing by its nature. |
| {nonfiction ? 'What Happens' : 'Action'} | field | shown on the scene | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown on the scene: it decides nothing by its nature. |
| "Turning Point" | field | shown on the scene | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown on the scene: it decides nothing by its nature. |
| "Essential To The Story" | field | finish.ts (cutting it costs the edit); cost-cuts.ts | proven | scene-essential (40 seeds) | quality.editing -8; overall -0.8; reception -0.8; revenue -5715.125 |
| "Props" | field | projects.ts deriveRequirements; production/tasks.ts | proven | scene-props (40 seeds) | spent +11669.75; money -21542.331; daysToDeliver +4.475 |
| "Animals" | field | projects.ts deriveRequirements; production/tasks.ts | proven | scene-animals (40 seeds) | spent +2751.75; money +6034.917; daysToDeliver +1.488 |
| "Vehicles" | field | projects.ts deriveRequirements; production/tasks.ts | proven | scene-vehicles (40 seeds) | spent +3593.5; money +3461.275; daysToDeliver +1.375 |
| "Stunts" | field | projects.ts deriveRequirements; production/tasks.ts | proven | scene-stunts (40 seeds) | spent +69096.25; money -23179.448; daysToDeliver +8.963 |
| "Crowd Size" | field | production/rates.ts (crowd day rate) | proven | scene-crowd (60 seeds) | spent +39716.667; money -32397.217 |
| "Crowd Makeup" | field | looks.ts chairMinutes, makeupDayCost; production/shoot.ts runShootDay | proven | crowd-makeup (40 seeds) | spent +46744.75; ownIn +42550; overall -0.325 |
| "Extend The Crowd In Post" | field | looks.ts physicalCrowd, digitalCrowd; production/tasks.ts buildTasks; production/schedule.ts sceneLoad | proven | crowd-digital (40 seeds) | spent -17010.75; money +13094.191; daysToDeliver +7.038 |
| "Visual Effects" | field | projects.ts deriveRequirements; production/tasks.ts | proven | scene-vfx (40 seeds) | spent +43129.25; daysToDeliver +13.85 |
| "Dance" | field | projects.ts deriveRequirements | proven | scene-dance (40 seeds) | spent +11718.25; daysToDeliver +3.025 |
| "Intimate Scene" | field | projects.ts deriveRequirements | proven | scene-intimacy (40 seeds) | spent +3089.25; hired +2; ownIn +1000 |
| "Water Work" | field | projects.ts deriveRequirements | proven | scene-water (40 seeds) | spent +3955.5; hired +2; ownIn +850 |
| "Intentional Discontinuity" | field | projects.ts scriptIssues | proven | intentional-discontinuity (40 seeds) | friendDays -2; spent -2762.5; ownIn -1075 |
| "Speaker" | field | projects.ts scriptIssues; finish.ts | proven | dialogue-two-speakers (40 seeds) | singles +4; daysToDeliver +2.925 |
| "Line" | field | shown as advice: script-explain.ts spokenMinutes (a guide only) | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown as advice: script-explain.ts spokenMinutes (a guide only): it decides nothing by its nature. |
| {o.label} | field | shown as a preview: season.ts sharedFactImpact | carried | tests/episodes.test.ts::a rule lists the scenes that rely on it | A name or a record, carried to shown as a preview: season.ts sharedFactImpact: it decides nothing by its nature. |
| "Rule" | field | shown in the season plan: season.ts | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown in the season plan: season.ts: it decides nothing by its nature. |
| "Limit Or Cost" | field | shown in the season plan: season.ts | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown in the season plan: season.ts: it decides nothing by its nature. |
| "Rule" | field | shown in the season plan: season.ts | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown in the season plan: season.ts: it decides nothing by its nature. |
| "Limit Or Cost" | field | shown in the season plan: season.ts | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown in the season plan: season.ts: it decides nothing by its nature. |
| "Season Arc" | field | shown in the season plan, and carried into the next season: sequel.ts continueProject (carried into the next season) | carried | tests/episodes.test.ts::carries the same characters, world and open threads | A name or a record, carried to shown in the season plan, and carried into the next season: sequel.ts continueProject (carried into the next season): it decides nothing by its nature. |
| "What An Episode Does" | field | shown in the season plan: season.ts setSeriesPlan | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown in the season plan: season.ts setSeriesPlan: it decides nothing by its nature. |
| "How Its People Change" | field | shown in the season plan: season.ts setSeriesPlan | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown in the season plan: season.ts setSeriesPlan: it decides nothing by its nature. |
| "Places It Returns To" | field | shown in the season plan: season.ts setSeriesPlan | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown in the season plan: season.ts setSeriesPlan: it decides nothing by its nature. |
| "How It Goes On Or Ends" | field | shown in the season plan: season.ts setSeriesPlan | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown in the season plan: season.ts setSeriesPlan: it decides nothing by its nature. |
| {`Title Of Episode ${n}`} | field | shown wherever an episode is named | carried | tests/episodes.test.ts::an episode moves with its scenes | A name or a record, carried to shown wherever an episode is named: it decides nothing by its nature. |
| {`What Episode ${n} Moves`} | field | shown in the season plan | carried | tests/episodes.test.ts::an episode moves with its scenes | A name or a record, carried to shown in the season plan: it decides nothing by its nature. |
| "New Act Or Sequence" | field | shown as advice: structure.ts | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown as advice: structure.ts: it decides nothing by its nature. |
| {o.label} | field | shown as advice: structure.ts structureNotes; threadCutConsequences | carried | tests/structure.test.ts::cutting the resolving scene from the edit warns by name | A name or a record, carried to shown as advice: structure.ts structureNotes; threadCutConsequences: it decides nothing by its nature. |
| {c.name} | field | shown as advice: structure.ts structureNotes | carried | tests/decision-effects.test.ts::raise a structure note when one is in none of its scenes | A name or a record, carried to shown as advice: structure.ts structureNotes: it decides nothing by its nature. |
| {`How ${t.name} Ends`} | field | shown as advice: structure.ts | carried | tests/structure.test.ts::a thread resolves in a named scene or is left open | A name or a record, carried to shown as advice: structure.ts: it decides nothing by its nature. |
| "New Thread" | field | shown as advice: structure.ts | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown as advice: structure.ts: it decides nothing by its nature. |
| "Reference" | field | shown as advice: research.ts | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown as advice: research.ts: it decides nothing by its nature. |
| "Status" | field | shown as advice: research.ts researchNotes | carried | tests/structure.test.ts::note open and uncertain questions on their scenes | A name or a record, carried to shown as advice: research.ts researchNotes: it decides nothing by its nature. |
| {sceneLabel(p, s)} | field | shown as advice: research.ts researchNotes | carried | tests/structure.test.ts::note open and uncertain questions on their scenes | A name or a record, carried to shown as advice: research.ts researchNotes: it decides nothing by its nature. |
| "New Question" | field | shown as advice: research.ts | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown as advice: research.ts: it decides nothing by its nature. |
| "Planted In" | field | script-effects.ts; finish.ts edit consequences | proven | setup-planted (40 seeds) | quality.script +11; overall +3.35; reception +3.35 |
| "Pays Off In" | field | script-effects.ts; finish.ts edit consequences | proven | setup-paid-off (40 seeds) | quality.script +11; overall +3.338; reception +3.338 |
| "What Is Set Up" | field | shown with the setup | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the setup: it decides nothing by its nature. |
| "Kind" | field | projects.ts deriveRequirements (clue props) | proven | setup-clue (40 seeds) | quality.script +1; spent +3437.5; overall -0.262; reception -0.262 |
| "First Character" | field | shown as a preview: season.ts sharedFactImpact | carried | tests/episodes.test.ts::a relationship touches every scene its two characters share | A name or a record, carried to shown as a preview: season.ts sharedFactImpact: it decides nothing by its nature. |
| "Second Character" | field | shown as a preview: season.ts sharedFactImpact | carried | tests/episodes.test.ts::a relationship touches every scene its two characters share | A name or a record, carried to shown as a preview: season.ts sharedFactImpact: it decides nothing by its nature. |
| "Relationship" | field | shown in the season plan | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the season plan: it decides nothing by its nature. |
| "Where It Starts" | field | shown in the season plan | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the season plan: it decides nothing by its nature. |
| "Where It Ends" | field | shown in the season plan | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the season plan: it decides nothing by its nature. |
| "Relationship" | field | shown in the season plan | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the season plan: it decides nothing by its nature. |
| "Where It Starts" | field | shown in the season plan | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the season plan: it decides nothing by its nature. |
| "Where It Ends" | field | shown in the season plan | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the season plan: it decides nothing by its nature. |
| "Claim" | field | projects.ts deriveRequirements (fact-check) | proven | claim-added (40 seeds) | claimsChecked +2; researchItems +2; spent +2288.75 |
| "Status" | field | projects.ts deriveRequirements | proven | claim-dramatized (40 seeds) | claimsChecked -2; spent -705.25; hired -2 |
| "Source Note" | field | shown with the fact | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the fact: it decides nothing by its nature. |
| "Contributor Name" | field | credits, consent | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to credits, consent: it decides nothing by its nature. |
| "Who They Are" | field | shown with the contributor | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the contributor: it decides nothing by its nature. |
| "What It Is About" | field | shown as advice: documentary.ts proposeDocumentaryPlan (the research questions it writes) | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown as advice: documentary.ts proposeDocumentaryPlan (the research questions it writes): it decides nothing by its nature. |
| "Kind Of Subject" | field | shown as advice: documentary.ts proposeDocumentaryPlan (the research questions and who to approach) | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown as advice: documentary.ts proposeDocumentaryPlan (the research questions and who to approach): it decides nothing by its nature. |
| "Note" | field | projects.ts addNote, finish.ts assessQuality | proven | own-notes (40 seeds) | ownNotes +6; quality.script +6; overall +1.8; reception +1.8 |
| "Area" | field | projects.ts addNote | proven | own-notes (40 seeds) | ownNotes +6; quality.script +6; overall +1.8; reception +1.8 |
| "About" | field | projects.ts addNote | proven | own-notes (40 seeds) | ownNotes +6; quality.script +6; overall +1.8; reception +1.8 |
| "Character Name" | field | everywhere a part is named | carried | tests/scenes.test.ts::renaming changes the name everywhere it is shown | A name or a record, carried to everywhere a part is named: it decides nothing by its nature. |
| "Give Their Scenes, Lines And Relationships To" | field | projects.ts archiveCharacter | proven | archive-reassign (40 seeds) | NeighbourDays +4; spent +2594.5; ownIn +1450 |
| "Scene" | field | shown as advice: structure.ts beatsIn | carried | tests/structure.test.ts::a beat goes only in a scene the character is in | A name or a record, carried to shown as advice: structure.ts beatsIn: it decides nothing by its nature. |
| "What Changes" | field | shown as advice: structure.ts | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown as advice: structure.ts: it decides nothing by its nature. |
| "New Character's Name" | field | shown as the new character's name: projects.ts splitCharacter | carried | tests/characters.test.ts::a new character takes the chosen scenes | A name or a record, carried to shown as the new character's name: projects.ts splitCharacter: it decides nothing by its nature. |
| {sceneLabel(p, s)} | field | projects.ts splitCharacter | proven | split-scenes (40 seeds) | OlderDays +2; olderInCut +2; LeadDays -2 |
| "Name" | field | everywhere a part is named | carried | tests/scenes.test.ts::renaming changes the name everywhere it is shown | A name or a record, carried to everywhere a part is named: it decides nothing by its nature. |
| "Role Size" | field | script-effects.ts castPlacement; hiring.ts | proven | lead-role-size (30 seeds) | leadEntries -2.9; actingDecided -2.9 |
| "Entity" | field | projects.ts deriveRequirements; production/shoot.ts | proven | lead-entity (40 seeds) | spent +16866.25; hired +2; ownIn +15800 |
| "Realized As" | field | projects.ts deriveRequirements; production/shoot.ts | proven | lead-puppet (120 seeds) | spent +16519.083; money +21185.034; daysToDeliver +2.421 |
| "Puppet Face" | field | production/tasks.ts (sm:faces, sm:armature, sm:animation); rates.ts FACE_METHODS | proven | puppet-face (40 seeds) | spent +16767; ownIn +18150; daysToDeliver +21.525 |
| "Also Called" | field | shown with the part in casting | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the part in casting: it decides nothing by its nature. |
| "Pronouns" | field | shown in casting: script-explain.ts characterPronouns | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown in casting: script-explain.ts characterPronouns: it decides nothing by its nature. |
| "Speaks" | field | production/language.ts personLanguagesFit | proven | lead-speaks (40 seeds) | spent +2428.5; hired +2 |
| "Awards Placement" | field | script-effects.ts castPlacement | proven | award-placement (30 seeds) | leadEntries -2.867; actingDecided -2.867 |
| "Series Involvement" | field | hiring.ts estimateDays; finish.ts computeCredits | proven | series-regular (40 seeds) | guideDays +6; ownIn +4250 |
| {title(f)} | field | awards-rules.ts isNarrator; hiring.ts estimateDays | proven | lead-narrator (40 seeds) | spent +1489.75; daysToDeliver +1.375; ownIn +1825 |
| {title(m)} | field | hiring.ts; production | proven | method-capture (40 seeds) | hired +2; castRates +1577.75; daysToDeliver -25.187 |
| "What Kind Of Being" | field | shown to design and casting | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown to design and casting: it decides nothing by its nature. |
| "Description" | field | shown as advice: script-explain.ts breakdownComplete | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown as advice: script-explain.ts breakdownComplete: it decides nothing by its nature. |
| "Wants" | field | shown as advice: script-explain.ts breakdownComplete | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown as advice: script-explain.ts breakdownComplete: it decides nothing by its nature. |
| "Fears" | field | shown as advice: script-explain.ts breakdownComplete | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown as advice: script-explain.ts breakdownComplete: it decides nothing by its nature. |
| "Why They Want It" | field | shown with the part | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the part: it decides nothing by its nature. |
| "What Stands In The Way" | field | shown with the part | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the part: it decides nothing by its nature. |
| "What In Them Pulls Against It" | field | shown with the part | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the part: it decides nothing by its nature. |
| "How They Change" | field | shown with the part | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the part: it decides nothing by its nature. |
| "How They Speak" | field | shown with the part | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the part: it decides nothing by its nature. |
| "Makeup" | field | looks.ts makeupShare, makeupDayCost; production/tasks.ts buildTasks; production/schedule.ts groupShootDays; production/shoot.ts runShootDay; callsheet.ts callSheet; hiring.ts neededRoles | proven | lead-makeup (40 seeds) | spent +22020; money -29777.454; daysToDeliver +1.5 |
| "Costume From" | field | looks.ts costumeCopies, wardrobeMismatch; production/tasks.ts buildTasks | proven | lead-costume (40 seeds) | spent +7546.75; daysToDeliver +5.025 |
| "Appearance States" | field | looks.ts statesOf, costumeCopies; production/tasks.ts buildTasks | proven | lead-states (40 seeds) | spent +25930.5; money -35973.591; daysToDeliver +20.088 |
| {`Names Of ${c.name}'s Looks`} | field | looks.ts statesOf, stateNames; brief.ts setLook | proven | looks-named (40 seeds) | spent +18114; ownIn +19150; daysToDeliver +12.775 |
| "Format Family" | field | unscripted.ts unscriptedIssues, decideCompetition; awards-rules.ts requirementProblems | proven | format-competition (40 seeds) | results +6; leftNotes +6 |
| {c.name} | field | unscripted.ts decideCompetition | proven | contestants (40 seeds) | presence +9.03; overall +1.113; reception +1.113 |
| "Leave Each Episode" | field | unscripted.ts decideCompetition | proven | leave-each (40 seeds) | eliminatedEarly +4; leftNotes +6 |
| {`Add Ethnicity For ${who}`} | field | shown in casting: hiring.ts sharedHeritages | carried | tests/heritage.test.ts::a performer from the pool | A name or a record, carried to shown in casting: hiring.ts sharedHeritages: it decides nothing by its nature. |
| {`Add Nationality For ${who}`} | field | shown in casting: hiring.ts | carried | tests/identity.test.ts::a version 6 save | A name or a record, carried to shown in casting: hiring.ts: it decides nothing by its nature. |
| {i.label} | field | script-explain.ts; finish.ts outlet requirements | proven | content-strong (40 seeds) | lateSlots +0.45; viewers -61175 |
| "Age In Story" | field | story-age.ts storyAge; casting-notes.ts fitNotes; minors.ts minorFor | proven | lead-child (40 seeds) | spent +8546.25; money -11360.175; daysToDeliver +8.463 |
| "Up To" | field | story-age.ts storyAge; casting-notes.ts fitNotes | proven | age-range (40 seeds) | hired -2.9; daysToDeliver -4.775; spent -7842 |
| "Advance To" | field | state.ts processUntil | not a feature |  | How far to let the clock run. Time passing is the engine every proof plays a career through; what happens by a date is each system's own row, and Advance stopping for a plan or a call is tested (tests/foundation.test.ts::Advance stops at a reminder). |
| "Date" | field | state.ts processUntil | not a feature |  | How far to let the clock run. Time passing is the engine every proof plays a career through; what happens by a date is each system's own row, and Advance stopping for a plan or a call is tested (tests/foundation.test.ts::Advance stops at a reminder). |
| "Time" | field | state.ts processUntil | not a feature |  | How far to let the clock run. Time passing is the engine every proof plays a career through; what happens by a date is each system's own row, and Advance stopping for a plan or a call is tested (tests/foundation.test.ts::Advance stops at a reminder). |
| "Wake Up" | field | state.ts startSleep | proven | wake-early (40 seeds) | lateDays -1; quality.direction +0.913; overall +0.213 |
| "Set Wake Time" | field | state.ts startSleep | proven | sleep-through-call (40 seeds) | lateDays +1; quality.direction -0.637; overall -0.237; reception -0.237 |
| "Hours Of Sleep" | field | state.ts startSleep | proven | sleep-through-call (40 seeds) | lateDays +1; quality.direction -0.637; overall -0.237; reception -0.237 |
| "Set An Alarm" | field | state.ts snooze | proven | sleep-through-call (40 seeds) | lateDays +1; quality.direction -0.637; overall -0.237; reception -0.237 |
| {`Replacement Place ${i + 1}`} | field | save.ts repairSave | not a feature |  | A repair of a save whose places can't be found: it puts a place where the save had one (tests/migration.test.ts::open after a repair that keeps a backup and changes only the places). Where you live, the decision a place makes, is proven by base-los-angeles. |
| "Song Title" | field | everywhere a song is named | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to everywhere a song is named: it decides nothing by its nature. |
| "Where It Comes From" | field | songs.ts songTasks; awards-rules.ts songProblems | proven | song-commissioned (40 seeds) | hired +2; spent +5371.75 |
| "Lyrics" | field | songs.ts songTasks | proven | song-lyricist (40 seeds) | hired +2; spent +2747.75; daysToDeliver -3.587 |
| "Music By" | field | songs.ts songCredits; awards recipients | not a feature |  | Names typed for a song that existed before the film, carried to its credits (songs.ts songCredits). An award for an original song takes only one written for the project (awards-rules.ts writtenForProject), so these names never decide an entry; who writes a song made for the film is its own row (Where It Comes From, Lyrics). |
| "Lyrics By" | field | songs.ts songCredits; awards recipients | not a feature |  | Names typed for a song that existed before the film, carried to its credits (songs.ts songCredits). An award for an original song takes only one written for the project (awards-rules.ts writtenForProject), so these names never decide an entry; who writes a song made for the film is its own row (Where It Comes From, Lyrics). |
| "Rights Holder" | field | shown with the song | carried | e2e/journey-e.spec.ts::refused with a reason, then recovered | A name or a record, carried to shown with the song: it decides nothing by its nature. |
| {`Scene For ${s.title}`} | field | songs.ts songUses | proven | add-song (40 seeds) | songs +2; songUses +2; released -2; revenue -115136.125 |
| "How It Plays" | field | awards-rules.ts songRuleProblem | proven | song-opening-titles (40 seeds) | licenceFees +4521; spent +3671; money -3671 |
| "Minutes It Plays" | field | awards-rules.ts songRuleProblem | proven | song-minutes (40 seeds) | licenceFees +20100; spent +16950 |
| {`${c.name} Performs ${s.title}`} | field | credits: songs.ts songCredits (Song Performed By), and the casting notes: casting-notes.ts fitNotes | carried | tests/songs.test.ts::played to delivery: writers are whoever wrote | A name or a record, carried to credits: songs.ts songCredits (Song Performed By), and the casting notes: casting-notes.ts fitNotes: it decides nothing by its nature. |
| {`${v.label}: ${sceneLabel(p, sc)}, In Place Of "${song.title}"`} | field | song-actions.ts changeVersionSong | proven | version-song (40 seeds) | songChanges +2; songTasks +4; spent +2031 |
| {`${c.name} On Screen (Minutes)`} | field | screen-time.ts shareCheck | proven | record-screen-time (40 seeds) | screenRecords +12; screenEntries +1; screenDecided +1 |
| {`${c.name} Heard Only (Minutes)`} | field | screen-time.ts screenTotal | proven | heard-only (40 seeds) | screenEntries -1; screenDecided -1 |
| "Title For The New Project" | field | shown as the project's title: opportunities.ts acceptOpportunity | carried | tests/opportunities.test.ts::accepted, starts a project funded by the commission | A name or a record, carried to shown as the project's title: opportunities.ts acceptOpportunity: it decides nothing by its nature. |
| {`What ${name}'s Revision Should Look At`} | field | writing-jobs.ts revisionAims | proven | revision-focus (40 seeds) | passRead +6.9; quality.script +0.75; overall +0.2 |
| {`Your Note To ${name} (Optional)`} | field | WritingWork.tsx JobLine | carried | tests/writing-jobs.test.ts::the brief and the notes are kept as written and change nothing | A name or a record, carried to WritingWork.tsx JobLine: it decides nothing by its nature. |
| {`Ask ${name} For`} | field | writing-jobs.ts writingTerms, acceptedRead | proven | writing-rewrite (40 seeds) | writingDays +1.95; quality.script +1.288; standing.writing +0.45; overall +0.3 |
| {`Episode For ${name}`} | field | writing-jobs.ts writingTerms, acceptedRead | proven | writer-episode (40 seeds) | writingDays +5.575; writerPaid +3387; minutesByHire +33.75 |
| {`Your Brief For ${name} (Optional)`} | field | WritingWork.tsx JobLine | carried | tests/writing-jobs.test.ts::the brief and the notes are kept as written and change nothing | A name or a record, carried to WritingWork.tsx JobLine: it decides nothing by its nature. |
| "Put In From Your Own Money" | field | personal.ts putInOwnMoney, putInRefusal | proven | own-money-or-backer (40 seeds) | ownIn -74025; backerDeals +2; money -14617.441; moneyChange -14617.441; revenue -71334.575 |
| "Banner Name" | field | shown in credits: company.ts setBanner, productionCredit; FinishViews.tsx credits | carried | tests/v8-company.test.ts::credits your work under it | A name or a record, carried to shown in credits: company.ts setBanner, productionCredit; FinishViews.tsx credits: it decides nothing by its nature. |
| id="card-apply-bank" | field | systems/cardlife.ts card.apply | proven | field-card-bank (40 seeds) | cardsAtNatwest +1; interestOut -47.13; worth +47.13 |
| id="card-apply-from" | field | systems/cardlife.ts card.apply; systems/cardoffers.ts transferRefusal | proven | field-card-transfer (40 seeds) | transferred +1219.89; interestOut -281.33; worth +256.79 |
| id={`card-statement-day-${card.id}`} | field | systems/cardlife.ts card.set_statement_day | proven | card-statement-day (40 seeds) | statementDay +28; interestOut +9.84; cardPaid -3.16 |
| id={`card-limit-${card.id}`} | field | systems/cardlife.ts card.request_limit | proven | card-limit-down (40 seeds) | limit -2347; cardPaid -346.28 |
| id={`card-money-transfer-${card.id}`} | field | systems/cardoffers.ts card.money_transfer | proven | card-money-transfer (40 seeds) | transferredIn +1000; bankFees +30; interestOut +1.82; worth -31.82 |
| id={`card-plan-amount-${card.id}`} | field | systems/cardoffers.ts card.plan | proven | card-plan (40 seeds) | interestOut -68.054; cardPaid +223; worth +68.054 |
| id={`card-plan-months-${card.id}`} | field | systems/cardoffers.ts card.plan | proven | field-plan-length (40 seeds) | planMonths +9; cardPaid -500.638; owed +500.638 |
| id="cash-out" | field | systems/cash.ts cash.withdraw, cashQuote | proven | cash-withdrawal (40 seeds) | withdrawn +250; paidInCash +250 |
| id="cash-from" | field | systems/cash.ts cash.withdraw, cashQuote | proven | field-cash-from (40 seeds) | bankFees -12.5; interestOut -4.81; worth +17.31; cardPaid -267.31 |
| id="cash-in" | field | systems/cash.ts cash.deposit | proven | cash-deposit (40 seeds) | cashHeld -500; atFirstBank +500 |
| id="cash-into" | field | systems/cash.ts cash.deposit | proven | field-cash-into (40 seeds) | savingsHeld +509.91; interestIn +9.91 |
| id="cash-at" | field | systems/cash.ts cash.deposit | proven | field-cash-at (40 seeds) | cashHeld +500; interestIn -11.43 |
| id="od-limit" | field | systems/lending.ts bank.arrange_overdraft, overdraftOffer | proven | arrange-overdraft (40 seeds) | gearOwned +0.4; interestOut +5.912; worth -117.424 |
| id="od-per-use" | field | systems/lending.ts bank.arrange_overdraft, chargeForItem | proven | field-od-per-use (80 seeds) | bankFees -53.312; worth +51.93 |
| id={`term-amount${account ? `-${bank.id}` : ''}`} | field | systems/lending.ts bank.open_term | proven | term-deposit (40 seeds) | accounts +1; interestIn +41099.99; worth +41099.99 |
| id="collections-pay" | field | systems/lending.ts bank.pay_collections | proven | pay-collections (40 seeds) | inCollections -119.75; wellsAccounts +0.475 |
| id="loan-repay-from" | field | systems/lending.ts bank.set_loan_repayment, repaymentAccount | proven | loan-repayment (40 seeds) | paidFromNatwest +2683.139; natwestHeld -2683.139; atFirstBank +4087.635 |
| id="loan-amount" | field | systems/lending.ts bank.borrow, loanOffer | proven | bank-loan (60 seeds) | interestOut +1860.279; money +11383.286 |
| id="loan-months" | field | systems/lending.ts bank.borrow, loanOffer | proven | bank-loan (60 seeds) | interestOut +1860.279; money +11383.286 |
| id="loan-purpose" | field | systems/lending.ts loanOffer (notFor) | proven | field-loan-purpose (80 seeds) | loansOwed -2080.118; interestOut -452.319; worth +452.319 |
| id="loan-into" | field | systems/lending.ts bank.borrow | proven | field-loan-into (80 seeds) | natwestHeld +6750; atFirstBank -6750 |
| id="loan-repay" | field | systems/lending.ts bank.borrow, repaymentAccount | proven | field-loan-repay (80 seeds) | paidFromNatwest +3266.226; natwestHeld -3266.226; atFirstBank +4966.756 |
| id="switch-partial" | field | systems/lending.ts bank.switch, completeSwitch | proven | field-switch-partial (40 seeds) | accounts +1; atFirstBank +18564739.475; interestIn -4302.46 |
| id="switch-to" | field | systems/lending.ts bank.switch, completeSwitch | proven | field-switch-to (40 seeds) | natwestHeld +18644011.381; interestIn +3900.98 |
| id="switch-on" | field | systems/lending.ts bank.switch | proven | field-switch-on (40 seeds) | daysSinceSwitch -109; interestIn -3733.88 |
| id={`close-into-${a.id}`} | field | systems/bankmoves.ts bank.close_current | proven | field-close-into (40 seeds) | savingsHeld +5095.63; interestIn +95.63 |
| id={`order-from-${o.id}`} | field | systems/bankmoves.ts bank.set_order_source, orderSource | proven | order-source (40 seeds) | paidFromNatwest +5000; natwestHeld -5000; atFirstBank +4962.21 |
| id={`autopay-from-${c.id}`} | field | systems/bankmoves.ts card.set_autopay_from, autopaySource | proven | autopay-from (40 seeds) | paidFromNatwest +849.995; natwestHeld -849.995; atFirstBank +849.996 |
| id="open-at" | field | systems/bankmoves.ts bank.open_current, openRefusal | proven | field-open-at (40 seeds) | bankFees +17.26; worth -17.26 |
| id="open-from" | field | systems/bankmoves.ts bank.open_current | proven | field-open-from (40 seeds) | savingsHeld -10199.33; interestIn -199.33 |
| id="open-amount" | field | systems/bankmoves.ts bank.open_current | proven | field-open-amount (40 seeds) | natwestHeld +99000; atFirstBank -99000 |
| id="pay-everyday" | field | systems/payments.ts bank.set_payments; systems/spending.ts | proven | credit-card (40 seeds) | accounts +1; onCard +1; cardPaid +846.28 |
| id="so-amount" | field | systems/payments.ts bank.add_standing_order | proven | standing-order (40 seeds) | interestIn +11501.04; money +15293.935 |
| id="so-day" | field | systems/payments.ts bank.add_standing_order | proven | field-so-day (40 seeds) | savingsHeld +105.97; interestIn +105.97 |
| id="so-to" | field | systems/payments.ts bank.add_standing_order | proven | field-so-to (40 seeds) | natwestHeld +1214381.76; interestIn +2880.72 |
| id="sp-from" | field | systems/payments.ts bank.schedule_payment | proven | field-sp-from (40 seeds) | savingsHeld -101907.16; interestIn -1907.16 |
| id="sp-to" | field | systems/payments.ts bank.schedule_payment | proven | field-sp-to (40 seeds) | savingsHeld +101907.16; interestIn +1907.16 |
| id="sp-amount" | field | systems/payments.ts bank.schedule_payment | proven | scheduled-payment (40 seeds) | interestIn +19127.17; money +25435.066 |
| id="sp-date" | field | systems/payments.ts bank.schedule_payment | proven | scheduled-payment (40 seeds) | interestIn +19127.17; money +25435.066 |
| aria-label="Why" | field | systems/security.ts card.report | proven | field-why (40 seeds) | bankFees -5; worth +5 |
| id="alert-low" | field | systems/statements.ts bank.set_alerts; systems/obligations.ts accountAlerts | proven | field-alert-low (40 seeds) | fraudKnownAfter -6.667; fraudCarried +350; worth -350 |
| id="alert-large" | field | systems/statements.ts bank.set_alerts | proven | large-payment-alert (40 seeds) | fraudKnownAfter -9.442; fraudCarried +350; worth -350 |
| aria-label={label} | field | systems/accountlife.ts bank.set_round_ups, roundUpRefusal | proven | field-roundup-multiplier (40 seeds) | savingsHeld +0.07; interestIn +0.07 |
| aria-label="Each Purchase" | field | systems/accountlife.ts bank.set_round_ups | proven | field-roundup-amount (40 seeds) | savingsHeld +20.695; inCurrent -22.045 |
| aria-label="Minimum Balance" | field | systems/accountlife.ts bank.set_round_ups | proven | field-roundup-minimum (40 seeds) | savingsHeld -0.036; inCurrent +0.036 |
| id="move-from" | field | systems/banking.ts bank.transfer | proven | field-move-from (40 seeds) | savingsHeld -101990.54; interestIn -1990.54 |
| id="move-to" | field | systems/banking.ts bank.transfer | proven | field-move-to (40 seeds) | savingsHeld +101990.54; interestIn +1990.54 |
| id="move-amount" | field | systems/banking.ts bank.transfer | proven | bank-savings (40 seeds) | accounts +1; interestIn +19961; money +26543.883 |
| id="lender" | field | systems/lending.ts bank.borrow, loanOffer | proven | field-lender (80 seeds) | natwestHeld -425.522; interestOut +9.009; worth -9.009 |
