# Every Feature, Proven Or Not

Written by `tests/v10-features.test.ts` from the code; don't edit by hand. A feature is proven only by a played-career
Monte Carlo result in `docs/v10/proof/`: the same seeds played twice, one decision changed, a direct measure and a later
measure in another system both moving with their 95% interval clear of zero. A name or a record that only a screen
shows (a title, a description) decides nothing, so it is carried rather than proven: its evidence is the test or
journey that shows it there.

| Kind | proven | carried | does not bite | no downstream effect | stale | not a feature | not yet proven | All |
|---|---|---|---|---|---|---|---|---|
| action | 144 | 0 | 0 | 3 | 0 | 13 | 0 | 160 |
| bank | 43 | 0 | 0 | 0 | 0 | 0 | 11 | 54 |
| scheduled | 55 | 0 | 0 | 0 | 0 | 11 | 0 | 66 |
| field | 128 | 42 | 0 | 1 | 0 | 8 | 126 | 305 |
| all | 370 | 42 | 0 | 4 | 0 | 32 | 137 | 585 |

## Rows

| Feature | Kind | Read by | Status | Proof | What moved, or why |
|---|---|---|---|---|---|
| rsvpScreening | action | src/engine/awards-actions.ts | proven | attend-screening (30 seeds) | accepted +6.633; attended +5.1; offers +6.633 |
| submitEntry | action | src/engine/awards-actions.ts | proven | enter-awards (40 seeds) | entries +41.7; selected +4.9 |
| withdrawEntry | action | src/engine/awards-actions.ts | proven | withdraw-entry (40 seeds) | withdrawn +33.425; selected -5.35 |
| execute | action | src/engine/bankworld/core/simulation.ts | not a feature |  | The bank world's dispatcher: every bank command a screen runs goes through it, and each command is its own row. |
| advanceBankWorld | action | src/engine/bankworld/index.ts | not a feature |  | Brings the bank to the game's clock before a bank command runs; time passing is proven through the scheduled rows and the bank commands. |
| bankSim | action | src/engine/bankworld/index.ts | not a feature |  | Reads the bank world for the command that follows; not a decision. |
| setLock | action | src/engine/blueprints.ts | proven | lock-field (40 seeds) | periodFilms +2; spent +47132.975; daysToDeliver +12.363 |
| saveIdea | action | src/engine/brief.ts | not a feature |  | Keeps an idea on the player's shortlist in the idea picker (IdeaPicker.tsx); the idea itself is used through the brief, its own row. |
| callBack | action | src/engine/casting-calls.ts | proven | callback (40 seeds) | callbacksSeen +7.425; castCapability +0.525 |
| inviteToAudition | action | src/engine/casting-calls.ts | proven | audition (40 seeds) | readsSeen +14.8; castCapability +9.113; performance +7.469; overall +2.488; castRates +236.75 |
| setShortlisted | action | src/engine/casting-calls.ts | proven | callback (40 seeds) | callbacksSeen +7.425; castCapability +0.525 |
| shortlistAdvice | action | src/engine/casting-director.ts | proven | shortlist-advice (40 seeds) | callbacksSeen +10.125; castCapability +1.281 |
| startSearch | action | src/engine/casting-director.ts | proven | casting-search (40 seeds) | searches +3.85; readsSeen +20.725; castCapability +17.431; performance +14.375; castRates +1150.25; spent +11382.5 |
| setBanner | action | src/engine/company.ts | not a feature |  | Names your banner, shown on your credits as "A … Production" (YourMoney.tsx); a name, read only where it is shown. |
| applyBrief | action | src/engine/cues.ts | proven | music-brief (40 seeds) | cues +4; spent +3873.5; daysToDeliver +2.1 |
| approveThemes | action | src/engine/cues.ts | proven | approve-themes (40 seeds) | themesApproved +2; delivered +2; released +2; quality.music +59.725 |
| editCue | action | src/engine/cues.ts | proven | edit-cue (40 seeds) | cues -4; spent -5280; daysToDeliver -1.712; quality.music -14.575 |
| giveThemeNotes | action | src/engine/cues.ts | proven | theme-notes (40 seeds) | themeRounds +4; quality.music +4; spent +2664; daysToDeliver +3.65 |
| approveDesign | action | src/engine/designs-actions.ts | proven | approve-design (20 seeds) | delivered +2; revenue +83788.5; money +109689.8 |
| askForDesignChanges | action | src/engine/designs-actions.ts | proven | ask-design-changes (20 seeds) | designDays +1.7; spent +671 |
| setFilmedAt | action | src/engine/destinations.ts | proven | filmed-abroad (40 seeds) | filmedAway +6; spent +17781.9; daysToDeliver +10.85 |
| applyFix | action | src/engine/directing.ts | proven | fix-with-pickups (40 seeds) | pickupDays +2.85; spent +6543; quality.editing +1.6 |
| showCut | action | src/engine/documentary-actions.ts | proven | show-cut (120 seeds) | cutApproved +1; runtime +3.525; daysToDeliver +2.971 |
| requestConsent | action | src/engine/documentary.ts | proven | request-consent (20 seeds) | consentGiven +3.1; delivered +1.25; revenue +90207 |
| lockPicture | action | src/engine/edit-actions.ts | proven | lock-picture (40 seeds) | delivered -2; released -2; revenue -142510.875; standing.producing -3.125 |
| requestPickups | action | src/engine/edit-actions.ts | proven | request-pickups (40 seeds) | shootDays +2.675; spent +7527.5; daysToDeliver +6.863 |
| restoreToEdit | action | src/engine/edit-actions.ts | proven | restore-to-edit (40 seeds) | cutFromEdit -2; overall -0.6 |
| startCutPass | action | src/engine/edit-actions.ts | proven | cut-passes (40 seeds) | quality.editing +8; daysToDeliver +3.175; overall +1.725; spent +3049.5 |
| unlockPicture | action | src/engine/edit-actions.ts | proven | unlock-picture (40 seeds) | daysToDeliver +3; spent +2042.75 |
| deliverEpisode | action | src/engine/episode-delivery.ts | no downstream effect | deliver-episode (40 seeds) | moved: episodesDeliveredAlone +1.85. Career not reached: an episode delivered on its own can come out before the season is finished, but only on a release planned before then; these careers sell a season once it is finished, so episode 1 delivered early (1.85 episodes a career, proven to bite) changes no release. To prove with a release planned while the season is in production. |
| lockEpisode | action | src/engine/episode-delivery.ts | no downstream effect | deliver-episode (40 seeds) | moved: episodesDeliveredAlone +1.85. Career not reached: an episode delivered on its own can come out before the season is finished, but only on a release planned before then; these careers sell a season once it is finished, so episode 1 delivered early (1.85 episodes a career, proven to bite) changes no release. To prove with a release planned while the season is in production. |
| startEpisodeCutPass | action | src/engine/episode-delivery.ts | proven | episode-cut-pass (40 seeds) | episodeCutPasses +1.7; quality.editing +3.35; spent +1348.55 |
| setEpisodeDates | action | src/engine/episode-releases.ts | proven | episode-dates (40 seeds) | episodesMoved +2.8; renewalWait +49.35 |
| addToKit | action | src/engine/equipment.ts | proven | own-kit (40 seeds) | gearOwned +12; kitItems +12; spent -2981.5 |
| buyGear | action | src/engine/equipment.ts | proven | own-kit (40 seeds) | gearOwned +12; kitItems +12; spent -2981.5 |
| removeFromKit | action | src/engine/equipment.ts | proven | remove-from-kit (40 seeds) | kitItems -2; spent +2791.875 |
| sellGear | action | src/engine/equipment.ts | proven | sell-gear (30 seeds) | gearOwned -6; spent +478.367 |
| serviceGear | action | src/engine/equipment.ts | proven | service-gear (30 seeds) | worn -6; kitPostponed -725; lostDays -724.033; daysToDeliver +2.1; spent +42581; money +136987.541 |
| setPackageApproval | action | src/engine/equipment.ts | proven | package-approval (40 seeds) | kitPostponed -729; lostDays -727.4; daysToDeliver +33.563; delivered +2; spent +49552.75 |
| acceptDeal | action | src/engine/finance.ts | proven | own-money-or-backer (40 seeds) | ownIn -73300; backerDeals +2; revenue -66630.85 |
| approachBacker | action | src/engine/finance.ts | proven | own-money-or-backer (40 seeds) | ownIn -73300; backerDeals +2; revenue -66630.85 |
| pitchToStudio | action | src/engine/finance.ts | proven | pitch-to-studio (40 seeds) | pitched +3; studioIn +850000; ownIn -850000 |
| refuseDeal | action | src/engine/finance.ts | proven | refuse-deal (40 seeds) | refused +1.675; investorIn -62375; ownIn +62375; money +26519.555; leftInProjects -13112.25 |
| setFinanceTarget | action | src/engine/finance.ts | proven | finance-target (40 seeds) | backerIn +38750; leftInProjects +32709.5; money -7180.28; revenue -9014.2 |
| submitSeries | action | src/engine/finance.ts | proven | submit-series (40 seeds) | submittedSeries +1.15; commissionedIn +47300; ownIn -47300 |
| acceptDistribution | action | src/engine/finish.ts | proven | distributor-or-self (40 seeds) | distributed -1.725; revenue -129892.75; money -122776.35 |
| cancelRelease | action | src/engine/finish.ts | proven | cancel-release (40 seeds) | cancelledReleases +1.975; released -1.975; revenue -128678.875; money -121180.376 |
| cutFromEdit | action | src/engine/finish.ts | proven | cut-from-edit (40 seeds) | cutFromEdit +2; overall +0.5 |
| declineDistribution | action | src/engine/finish.ts | proven | decline-distribution (40 seeds) | offersDeclined +1.825; distributed -1.75; revenue -156975; money -150481.201 |
| deliver | action | src/engine/finish.ts | proven | deliver (40 seeds) | delivered -2; released -2; revenue -138815.625; standing.producing -3.375 |
| planRelease | action | src/engine/finish.ts | proven | release-or-not (40 seeds) | released -2; revenue -136576.375; money -131252.575 |
| setReleaseVersion | action | src/engine/finish.ts | proven | release-dubbed (60 seeds) | dubbed +0.917; spent +4942; revenue +17728.75 |
| acceptFirstLook | action | src/engine/first-look.ts | proven | first-look-accept (40 seeds) | firstLookActive +1.025; money +670839.742 |
| askMoreOverhead | action | src/engine/first-look.ts | proven | first-look-overhead (40 seeds) | overheadAsked +1.825; overheadAgreed +0.2 |
| declineFirstLook | action | src/engine/first-look.ts | proven | first-look-decline (40 seeds) | firstLookDeclined +1.2; firstLookActive -1.325; money -515027.426 |
| drawDevelopment | action | src/engine/first-look.ts | proven | draw-development (40 seeds) | developmentIn +48150; ownIn -48150 |
| endFirstLook | action | src/engine/first-look.ts | proven | first-look-end (40 seeds) | firstLookEnded +1.55; money -352329.992 |
| considerFor | action | src/engine/guests.ts | proven | consider-real (40 seeds) | realCast +1.725; castCapability -3.525; performance -2.744; castRates +556 |
| considerPerson | action | src/engine/guests.ts | proven | consider-real (40 seeds) | realCast +1.725; castCapability -3.525; performance -2.744; castRates +556 |
| stopConsidering | action | src/engine/guests.ts | proven | stop-considering (40 seeds) | realReads -1.45; realCast -1.325; castRates -992452.925; spent -3482348.75 |
| treatAsAdult | action | src/engine/guests.ts | proven | treat-as-adult (40 seeds) | realCast +1.85; castCapability -7.812; performance -6.656; castRates +322.75 |
| acceptCounter | action | src/engine/hiring.ts | proven | counter-offers (40 seeds) | countersDeclined +90.65; spent +10552.75; quality.craft -59.712; overall -58.362; daysToDeliver -33.987 |
| castPlayer | action | src/engine/hiring.ts | proven | cast-yourself (40 seeds) | playerParts +2; castRates -1631.75; spent -5264.75; standing.acting +4.65 |
| castRoleFor | action | src/engine/hiring.ts | not a feature |  | Names the job a part's casting method is (performer or voice performer) inside an offer; the offer is its own row (hiring.makeOffer). |
| declineCounter | action | src/engine/hiring.ts | proven | counter-offers (40 seeds) | countersDeclined +90.65; spent +10552.75; quality.craft -59.712; overall -58.362; daysToDeliver -33.987 |
| makeOffer | action | src/engine/hiring.ts | proven | offered-rate (40 seeds) | castRates -209.1; spent -1157.925; countersSeen +0.75 |
| releaseHire | action | src/engine/hiring.ts | proven | release-hire (40 seeds) | released +2; offersMade +37.625 |
| sendStaffingOffers | action | src/engine/hiring.ts | proven | send-staffing (40 seeds) | crewRates -3542.25; crewExperience -2.367; spent -16557.5; quality.craft -18.125; overall -4.825 |
| uncastPlayer | action | src/engine/hiring.ts | proven | uncast-yourself (40 seeds) | playerParts -2; castRates +1637; spent +5638.5; standing.acting -4.65; overall +0.475 |
| withdrawOffer | action | src/engine/hiring.ts | proven | withdraw-offer (40 seeds) | withdrawn +2; offersMade +2; castRates +86 |
| acceptJob | action | src/engine/jobs.ts | proven | outside-work (40 seeds) | jobsDone -0.9; jobPay -5206.2; jobsOffered -0.175 |
| askBetterRate | action | src/engine/jobs.ts | proven | ask-better-rate (60 seeds) | ratesAgreed +7.5; jobPay +5917.083 |
| declineJob | action | src/engine/jobs.ts | proven | decline-job (40 seeds) | jobsDeclined +0.975; jobsDone -0.875; jobPay -4960.85 |
| withdrawJob | action | src/engine/jobs.ts | proven | withdraw-job (40 seeds) | jobsWithdrawn +0.9; jobsDone -0.975; jobPay -5139.65 |
| negotiate | action | src/engine/line-producer.ts | proven | line-producer-negotiates (120 seeds) | counterRates -38.75; spent +372.458 |
| chooseSite | action | src/engine/locations-actions.ts | proven | stage-sets (40 seeds) | onStage +6; lostDays -1.45; daysToDeliver -1.987 |
| approveGuideMe | action | src/engine/mandates.ts | proven | guide-me-writing (40 seeds) | writersHired +3.975; quality.script +2.163; overall +0.538; spent +2221 |
| endGuideMe | action | src/engine/mandates.ts | proven | end-guide-me (40 seeds) | writingPasses -3.1; quality.script -2.362; spent -2695.75 |
| approveTake | action | src/engine/mocap.ts | proven | approve-weak-take (20 seeds) | approvedTake -21.25; overall -0.275 |
| bookMocap | action | src/engine/mocap.ts | proven | book-body-only (20 seeds) | spent -4982.5; overall -0.475 |
| cancelMocapBooking | action | src/engine/mocap.ts | proven | cancel-mocap (40 seeds) | cancelled +2; cancellationFees +3000; spent +2174.5 |
| requestRetake | action | src/engine/mocap.ts | proven | mocap-retake (20 seeds) | retakes +2; takes +2; spent +6730.5 |
| considerComposer | action | src/engine/music-catalog.ts | proven | consider-composer (40 seeds) | realComposers +1.9; spent +2847.75; quality.music -3.037 |
| licenseRecording | action | src/engine/music-catalog.ts | proven | license-recording (40 seeds) | catalogSongs +2; licensed +1.65; money -68007.999 |
| agreeLicence | action | src/engine/music.ts | proven | license-song (40 seeds) | licensed +1.475; released +1.475; revenue +38436.25; spent +2563.25 |
| declineQuote | action | src/engine/music.ts | proven | decline-quote (40 seeds) | licensed -1.575; released -1.575; revenue -38963.5; spent -2434.25 |
| renewLicence | action | src/engine/music.ts | proven | renew-licence (40 seeds) | renewals +0.65; released +0.65; spent +292.5 |
| replaceWithLibrary | action | src/engine/music.ts | proven | library-track (40 seeds) | libraryTracks +2; released +1.95; revenue +132873; spent +6889 |
| requestLicence | action | src/engine/music.ts | proven | license-song (40 seeds) | licensed +1.475; released +1.475; revenue +38436.25; spent +2563.25 |
| askForBetterTerms | action | src/engine/negotiation-actions.ts | proven | better-terms (40 seeds) | asked +1.525; investorShare -0.14; investorIn -8925; ownIn +8925 |
| acceptOpportunity | action | src/engine/opportunities.ts | proven | accept-opportunity (30 seeds) | proposalsAccepted +0.6; commissioned +0.6; commissionMoney +49600 |
| declineOpportunity | action | src/engine/opportunities.ts | proven | decline-opportunity (30 seeds) | proposalsAccepted -0.567; commissioned -0.567; commissionMoney -44373.333 |
| applyForPermit | action | src/engine/papers.ts | proven | work-permit (100 seeds) | permits +1; lateDays -7.14; shootDays -1.13; daysToDeliver -1.35; spent -1672.28; quality.direction +3.76; overall +1.345 |
| applyForRecordedPassport | action | src/engine/papers.ts | proven | recorded-passport (40 seeds) | passports +1; papersPaid +36.64 |
| applyForVisa | action | src/engine/papers.ts | proven | visitor-visa (30 seeds) | visas +1.033; attended +0.667; offers +1.833 |
| moveTo | action | src/engine/papers.ts | proven | move-home (40 seeds) | livesInLondon -1; frenchAccounts +2; bankFees +31.19; overall -0.625; quality.direction -1.4; money -676193.125 |
| addStage | action | src/engine/parts.ts | proven | add-stage (40 seeds) | stages +2; stageCast +2; performersCast +2; castRates +1578.75 |
| removeStage | action | src/engine/parts.ts | proven | remove-stage (40 seeds) | stages -2; stageCast -2; performersCast -2; castRates -1590.5 |
| putInOwnMoney | action | src/engine/personal.ts | proven | own-money-or-backer (40 seeds) | ownIn -73300; backerDeals +2; revenue -66630.85 |
| takeHome | action | src/engine/personal.ts | proven | take-money-home (40 seeds) | leftInProjects +141512.875; money -160344.375 |
| takeHomeAvailable | action | src/engine/personal.ts | not a feature |  | Reads how much may come home, inside the Take Home action, which is its own row. |
| applyDesignChange | action | src/engine/production.ts | proven | change-design-redo (20 seeds) | redone +10; daysToDeliver +59.475; spent +44075 |
| generatePlan | action | src/engine/production/schedule.ts | proven | plan-later (40 seeds) | firstShootDay +70; daysToDeliver +67.363 |
| keepWeatherPlan | action | src/engine/production/shoot.ts | proven | weather-keep (60 seeds) | lostDays -1.3; overall +0.2; daysToDeliver -1.883; spent -3092.167 |
| moveShootDay | action | src/engine/production/shoot.ts | proven | weather-move (60 seeds) | lostDays -2.067; daysToDeliver -1.475; spent -4243.5 |
| swapWithInteriorDay | action | src/engine/production/shoot.ts | proven | weather-swap (60 seeds) | lostDays -0.7; daysToDeliver -0.942; spent -2191.333 |
| setPlannedBudget | action | src/engine/project-budget.ts | proven | plan-budget (40 seeds) | target +80525; ownIn +10000; backerIn +70525; revenue -17844.95; money -19909.443 |
| addNote | action | src/engine/projects.ts | proven | own-notes (40 seeds) | ownNotes +6; quality.script +6; overall +1.725 |
| approveDraft | action | src/engine/projects.ts | proven | second-project (40 seeds) | projects +2; approvedProjects +2; deliveredAll +1.75; money -55741.884; standing.producing +1.4; jobsDone +0.8 |
| assignEpisodeRole | action | src/engine/projects.ts | proven | episode-director (40 seeds) | directedByHire +1.8; quality.direction +3.763; overall +0.775; spent +6278.95 |
| createProject | action | src/engine/projects.ts | proven | second-project (40 seeds) | projects +2; approvedProjects +2; deliveredAll +1.75; money -55741.884; standing.producing +1.4; jobsDone +0.8 |
| noteFromIssue | action | src/engine/projects.ts | proven | revision-notes (40 seeds) | notesAddressed +6; quality.script +6; overall +1.9 |
| renameDraft | action | src/engine/projects.ts | not a feature |  | Names a draft; the name is shown in the draft list and nothing else reads it, as a label shouldn't be. |
| setNoteStatus | action | src/engine/projects.ts | proven | revision-notes (40 seeds) | notesAddressed +6; quality.script +6; overall +1.9 |
| startRevision | action | src/engine/projects.ts | proven | revision-notes (40 seeds) | notesAddressed +6; quality.script +6; overall +1.9 |
| createFromSource | action | src/engine/proposal.ts | proven | create-from-source (40 seeds) | adapted +2; parts +2; castRates +1626.75; spent +82137.2; overall -0.937 |
| considerRecognised | action | src/engine/recognition-hire.ts | proven | hire-recognised (40 seeds) | recognisedHired +3.85; spent +25974.75; quality.craft -53.662; overall -52.487 |
| proposeLicence | action | src/engine/release-plan.ts | proven | licence-proposal (40 seeds) | licenceDeals +0.875; money -27693.375 |
| releaseYourself | action | src/engine/release-plan.ts | proven | self-release-stores (40 seeds) | revenue +39593.75; money +36625.299; spent +2600 |
| setReleasePlan | action | src/engine/release-plan.ts | proven | self-release-stores (40 seeds) | revenue +39593.75; money +36625.299; spent +2600 |
| approachAgent | action | src/engine/representation.ts | proven | agent (40 seeds) | viaAgent +7.1; jobsOffered +7.15; commission +3627.575; jobPay +22465.025 |
| declineMandate | action | src/engine/representation.ts | proven | agent-decline (40 seeds) | viaAgent -6.775; jobsOffered -6.7; jobPay -19641.85 |
| giveNotice | action | src/engine/representation.ts | proven | agent-notice (40 seeds) | viaAgent -5.425; jobsOffered -5.45; jobPay -20631.425; commission -3154.2 |
| renewMandate | action | src/engine/representation.ts | proven | agent-renew (40 seeds) | renewals +3; represented +1; viaAgent +14.05; jobsOffered +14.025; jobPay +68621.175; money +69897.8 |
| signWith | action | src/engine/representation.ts | proven | agent (40 seeds) | viaAgent +7.1; jobsOffered +7.15; commission +3627.575; jobPay +22465.025 |
| submitThrough | action | src/engine/representation.ts | proven | submit-through-agent (40 seeds) | submitted +1; dealCommission +5711.25 |
| rerecordLines | action | src/engine/revisions.ts | proven | rerecord-lines (20 seeds) | linesRerecorded +2; overall +0.475 |
| reviseAnimatic | action | src/engine/revisions.ts | proven | revise-animatic (20 seeds) | spent +1289.5; money -1289.5 |
| reviseEffects | action | src/engine/revisions.ts | proven | revise-effects (40 seeds) | effectsRevised +2.25; quality.direction +1.363; spent +11443.25; overall +0.25 |
| clearScreenTime | action | src/engine/screen-time.ts | proven | clear-screen-time (40 seeds) | screenRecords -12; screenEntries -1; screenDecided -1 |
| recordScreenTime | action | src/engine/screen-time.ts | proven | record-screen-time (40 seeds) | screenRecords +12; screenEntries +1; screenDecided +1 |
| moveEpisode | action | src/engine/season.ts | no downstream effect | move-episode (40 seeds) | moved: firstEpisodeMinutes +6. Bites, and moves the audience in every career whose season airs (21 of 40), but in both directions: an episode's place matters through its own reception (broadcast viewers kept from the one before, audiences.ts retention) and its own first day (streaming hours), and which of two episodes is received better isn't settled by its length. Not a gap; to prove with a season whose episodes are known to differ in reception. |
| continueProject | action | src/engine/sequel.ts | proven | continue-project (40 seeds) | continued +1; buildDays -22; spent -10944; daysToDeliver -13.325 |
| resumeProject | action | src/engine/shelve.ts | proven | shelve-resume (60 seeds) | hiresReleased +16; deliveredDay +264.783; offersDeclined +318.217; castRates +169.333; revenue -94136.25; money -102728.477 |
| shelveProject | action | src/engine/shelve.ts | proven | shelve-resume (60 seeds) | hiresReleased +16; deliveredDay +264.783; offersDeclined +318.217; castRates +169.333; revenue -94136.25; money -102728.477 |
| attachSong | action | src/engine/song-actions.ts | proven | add-song (40 seeds) | songs +2; songUses +2; released -2; revenue -108215.25 |
| changeVersionSong | action | src/engine/song-actions.ts | proven | version-song (40 seeds) | songChanges +2; songTasks +4; spent +1872 |
| createSong | action | src/engine/song-actions.ts | proven | add-song (40 seeds) | songs +2; songUses +2; released -2; revenue -108215.25 |
| detachSong | action | src/engine/song-actions.ts | proven | detach-song (40 seeds) | songUses -2; released +2; revenue +120740.75 |
| playFirstOverEndCredits | action | src/engine/song-actions.ts | proven | song-first-over-credits (40 seeds) | songEntries +1; songDecided +1 |
| removeSong | action | src/engine/song-actions.ts | proven | remove-song (40 seeds) | songs -2; spent -4131.75; daysToDeliver -1.375 |
| restoreVersionSong | action | src/engine/song-actions.ts | proven | restore-version-song (40 seeds) | songChanges -2; songTasks -4; spent -2096 |
| setSongPerformers | action | src/engine/song-actions.ts | not a feature |  | Names who sings a song, shown in the credits as "Song Performed By" (songs.ts) and in a casting note; a name, read only where it is shown. |
| syncMusicTasks | action | src/engine/song-actions.ts | not a feature |  | Follows a song change with the work it now needs; the song changes are their own rows. |
| syncSongTasks | action | src/engine/song-actions.ts | not a feature |  | Follows a song change with the work it now needs; the song changes are their own rows. |
| addPlan | action | src/engine/state.ts | proven | plan-over-call (40 seeds) | lateDays +1; quality.direction -0.487 |
| adoptPlace | action | src/engine/state.ts | not a feature |  | Makes a chosen place known to the world; the place field that chose it is the row. |
| cancelPlan | action | src/engine/state.ts | proven | cancel-plan (40 seeds) | lateDays -1; quality.direction +0.688 |
| startSleep | action | src/engine/state.ts | proven | sleep-through-call (40 seeds) | lateDays +1; quality.direction -0.775; overall -0.25 |
| travelTo | action | src/engine/state.ts | proven | travel-away (40 seeds) | lateDays +3.8; quality.direction -1.875; overall -0.662 |
| chooseTake | action | src/engine/takes-actions.ts | proven | weakest-takes (40 seeds) | weakTakes +0.975; quality.direction -0.75; overall -0.25; reception -0.25 |
| setShotPlan | action | src/engine/takes-actions.ts | proven | full-coverage (40 seeds) | setups +6; shootDays +25.775; spent +84311.5; quality.direction +2.213; overall +1.063 |
| formatDateKey | action | src/engine/time.ts | not a feature |  | Formats a date inside a change; not a decision. |
| withdrawRelease | action | src/engine/unscripted.ts | proven | withdraw-release (120 seeds) | redactions +1.667; runtime -3.45 |
| addVersion | action | src/engine/versions.ts | proven | add-version (40 seeds) | versions +2; versionDays +1.925; spent +1174.5 |
| removeVersion | action | src/engine/versions.ts | proven | remove-version (40 seeds) | versions -2; versionDays -1.875; spent -1166.5 |
| acceptWriting | action | src/engine/writing-jobs.ts | proven | writing-polish (40 seeds) | passesAccepted +1.925; quality.script +1.85; overall +0.65 |
| cancelWriting | action | src/engine/writing-jobs.ts | proven | writing-cancel (40 seeds) | passesAccepted -1.9; passesCancelled +1.925; quality.script -2.075; overall -0.587; spent -1345.25 |
| commissionWriting | action | src/engine/writing-jobs.ts | proven | writing-polish (40 seeds) | passesAccepted +1.925; quality.script +1.85; overall +0.65 |
| requestRevision | action | src/engine/writing-jobs.ts | proven | writing-revision (80 seeds) | passesWritten +1.9; spent +1432.125 |
| bank.add_standing_order | bank | src/engine/bankworld | proven | standing-order (40 seeds) | interestIn +11501.04; money +15293.933 |
| bank.arrange_overdraft | bank | src/engine/bankworld | not yet proven |  |  |
| bank.borrow | bank | src/engine/bankworld | proven | bank-loan (60 seeds) | interestOut +1721.445; money +10355.682 |
| bank.break_term | bank | src/engine/bankworld | proven | break-term (40 seeds) | accounts -1; interestIn -41099.99; worth -41099.99 |
| bank.cancel_new | bank | src/engine/bankworld | proven | cancel-new (40 seeds) | accounts -1; bankFees -10.81; worth +10.81 |
| bank.cancel_scheduled | bank | src/engine/bankworld | proven | cancel-scheduled (40 seeds) | savingsHeld -1019127.17; interestIn -19127.17; worth -19127.17 |
| bank.cancel_standing_order | bank | src/engine/bankworld | proven | cancel-standing-order (40 seeds) | interestIn -8743.03; money -11626.37 |
| bank.cancel_switch | bank | src/engine/bankworld | proven | cancel-switch (40 seeds) | atFirstBank +18652932.151; interestIn -4302.46; worth -4875.18 |
| bank.claim_unclaimed | bank | src/engine/bankworld | not yet proven |  |  |
| bank.close_current | bank | src/engine/bankworld | proven | close-current (40 seeds) | accounts -1; bankFees -10.81; worth +8.71 |
| bank.close_savings | bank | src/engine/bankworld | proven | close-savings (40 seeds) | accounts -1; interestIn -19961; money -25455.788 |
| bank.debit_overdraft | bank | src/engine/bankworld | not yet proven |  |  |
| bank.new_number | bank | src/engine/bankworld | not yet proven |  |  |
| bank.open_current | bank | src/engine/bankworld | proven | open-current (40 seeds) | accounts +1; bankFees +10.81; worth -10.81 |
| bank.open_savings | bank | src/engine/bankworld | proven | bank-savings (40 seeds) | accounts +1; interestIn +19961; money +26543.882 |
| bank.open_term | bank | src/engine/bankworld | proven | term-deposit (40 seeds) | accounts +1; interestIn +41099.99; worth +41099.99 |
| bank.pay_collections | bank | src/engine/bankworld | not yet proven |  |  |
| bank.reactivate | bank | src/engine/bankworld | not yet proven |  |  |
| bank.redirect_deposits | bank | src/engine/bankworld | proven | redirect-deposits (40 seeds) | savingsHeld +131539.827; interestIn +660.732; worth +660.733 |
| bank.repay_loan | bank | src/engine/bankworld | proven | repay-loan (40 seeds) | loansOwed -3156.004; interestOut -408.002; worth +365.568 |
| bank.schedule_payment | bank | src/engine/bankworld | proven | scheduled-payment (40 seeds) | interestIn +19127.17; money +25435.064 |
| bank.set_alerts | bank | src/engine/bankworld | not yet proven |  |  |
| bank.set_loan_repayment | bank | src/engine/bankworld | proven | loan-repayment (40 seeds) | paidFromNatwest +2795.129; natwestHeld -2795.129; atFirstBank +4098.834 |
| bank.set_order_source | bank | src/engine/bankworld | proven | order-source (40 seeds) | paidFromNatwest +5000; natwestHeld -5000; atFirstBank +4962.21 |
| bank.set_payments | bank | src/engine/bankworld | proven | credit-card (40 seeds) | accounts +1; onCard +1; cardPaid +846.28 |
| bank.set_primary | bank | src/engine/bankworld | proven | set-primary (40 seeds) | primaryIsFirst -0.975; paidFromNatwest +4874.601; natwestHeld -4999.601 |
| bank.set_round_ups | bank | src/engine/bankworld | proven | round-ups (40 seeds) | savingsHeld +0.39; inCurrent -0.38; interestIn +0.01 |
| bank.set_term_end | bank | src/engine/bankworld | proven | term-end (30 seeds) | interestIn -58062.09; worth -16962.1 |
| bank.stop_balance_transfer | bank | src/engine/bankworld | proven | stop-balance-transfer (40 seeds) | atFirstBank +18565036.675; interestIn -4302.46; worth -6981.664 |
| bank.switch | bank | src/engine/bankworld | proven | switch-bank (40 seeds) | atFirstBank -2; interestIn +3052.17; worth +3624.89; money +4820.332 |
| bank.take_overrun_loan | bank | src/engine/bankworld | not yet proven |  |  |
| bank.take_term_interest | bank | src/engine/bankworld | proven | term-interest (40 seeds) | termHeld -617.53; inCurrent +617.53 |
| bank.transfer | bank | src/engine/bankworld | proven | bank-savings (40 seeds) | accounts +1; interestIn +19961; money +26543.882 |
| card.apply | bank | src/engine/bankworld | proven | credit-card (40 seeds) | accounts +1; onCard +1; cardPaid +846.28 |
| card.close | bank | src/engine/bankworld | proven | card-close (40 seeds) | cardsOpen -1; onCard -1; cardPaid -861.08 |
| card.dispute | bank | src/engine/bankworld | not yet proven |  |  |
| card.lock | bank | src/engine/bankworld | proven | card-lock (40 seeds) | onCard -1; cardPaid -853.139 |
| card.money_transfer | bank | src/engine/bankworld | proven | card-money-transfer (40 seeds) | transferredIn +1000; bankFees +30; interestOut +1.82; worth -31.82 |
| card.plan | bank | src/engine/bankworld | proven | card-plan (40 seeds) | interestOut -68.054; cardPaid +223; worth +68.054 |
| card.redeem_rewards | bank | src/engine/bankworld | proven | card-redeem (40 seeds) | rewardsLeft -17.09; worth +17.09; money +17.09 |
| card.refund_credit | bank | src/engine/bankworld | proven | card-refund (40 seeds) | cardCredit -1000; money +1329.785 |
| card.report | bank | src/engine/bankworld | proven | card-report (40 seeds) | onCard -1; cardPaid -846.28 |
| card.request_hardship | bank | src/engine/bankworld | not yet proven |  |  |
| card.request_limit | bank | src/engine/bankworld | proven | card-limit-down (40 seeds) | limit -2347; cardPaid -346.28 |
| card.set_auto_raise | bank | src/engine/bankworld | not yet proven |  |  |
| card.set_autopay_from | bank | src/engine/bankworld | proven | autopay-from (40 seeds) | paidFromNatwest +849.995; natwestHeld -849.995; atFirstBank +849.996 |
| card.set_everyday | bank | src/engine/bankworld | proven | card-everyday (40 seeds) | onNatwestCard +1; cardBillsToNatwest +846.28 |
| card.set_over_limit | bank | src/engine/bankworld | proven | card-over-limit (40 seeds) | onCardAmount +50; cardPaid +50 |
| card.set_statement_day | bank | src/engine/bankworld | proven | card-statement-day (40 seeds) | statementDay +28; interestOut +9.84; cardPaid -3.16 |
| cash.deposit | bank | src/engine/bankworld | proven | cash-deposit (40 seeds) | cashHeld -500; atFirstBank +500 |
| cash.withdraw | bank | src/engine/bankworld | proven | cash-withdrawal (40 seeds) | withdrawn +250; paidInCash +250 |
| documents.apply_passport | bank | src/engine/bankworld | proven | bank-passport (40 seeds) | passports +1; worth -46.07; inCurrent -46.07 |
| finance.pay_card | bank | src/engine/bankworld | proven | card-pay-full (40 seeds) | cardPaid +144.64; interestOut -281.33; worth +281.33 |
| finance.set_autopay | bank | src/engine/bankworld | proven | card-autopay-minimum (40 seeds) | cardPaid -145.165; interestOut +282.351; worth -282.351 |
| agent-answer | scheduled | src/engine/representation.ts | proven | agent (40 seeds) | viaAgent +7.1; jobsOffered +7.15; commission +3627.575; jobPay +22465.025 |
| agent-notice-end | scheduled | src/engine/representation.ts | proven | agent-notice (40 seeds) | viaAgent -5.425; jobsOffered -5.45; jobPay -20631.425; commission -3154.2 |
| agent-offer-lapse | scheduled | src/engine/representation.ts | proven | off-agent-offer-lapse (40 seeds) | represented -1; viaAgent -40.9; jobsOffered -41.125 |
| agent-renewal | scheduled | src/engine/representation.ts | proven | agent-renew (40 seeds) | renewals +3; represented +1; viaAgent +14.05; jobsOffered +14.025; jobPay +68621.175; money +69897.8 |
| agent-term-end | scheduled | src/engine/representation.ts | proven | agent-renew (40 seeds) | renewals +3; represented +1; viaAgent +14.05; jobsOffered +14.025; jobPay +68621.175; money +69897.8 |
| arrive | scheduled | src/engine/state.ts | proven | travel-away (40 seeds) | lateDays +3.8; quality.direction -1.875; overall -0.662 |
| audience-week | scheduled | src/engine/distribution.ts | proven | off-audience-week (40 seeds) | renewalWait +55.275; renewed -0.425 |
| audition | scheduled | src/engine/auditions.ts | proven | audition (40 seeds) | readsSeen +14.8; castCapability +9.113; performance +7.469; overall +2.488; castRates +236.75 |
| birthday | scheduled | src/engine/state.ts | not a feature |  | A notice: it tells the player their age has changed. Age itself is read from the birth date wherever it matters (casting, licences), never from this event; switched off, nothing else changed (docs/v10/proof/off-birthday.json). |
| box-office-week | scheduled | src/engine/distribution.ts | proven | off-box-office-week (40 seeds) | gross +131040; revenue +41822.625; money +41790.925 |
| company-decision | scheduled | src/engine/company.ts | not a feature |  | Withdraws a company registration an older save had pending: companies left the game (v9 step 6), and nothing in a new story schedules it. |
| consent-response | scheduled | src/engine/documentary.ts | proven | off-consent-response (20 seeds) | delivered -1.35; revenue -53878.5; money -554405.78 |
| contributor-cut | scheduled | src/engine/documentary.ts | proven | off-contributor-cut (20 seeds) | delivered -1.1; revenue -44096; money -452654.449 |
| counter-lapse | scheduled | src/engine/hiring.ts | proven | off-counter-lapse (40 seeds) | countersTaken +3.675; castRates -26.75; hired +1.2 |
| distribution-offer | scheduled | src/engine/finish.ts | proven | off-distribution-offer (40 seeds) | distributed -1.8; revenue -119806.375; money -113801.275 |
| distribution-report | scheduled | src/engine/distribution.ts | proven | off-distribution-report (40 seeds) | revenue -88230.125; money -87763.325 |
| edition-announce | scheduled | src/engine/awards.ts | proven | off-edition-announce (40 seeds) | screenings -8.25; offers -7.525 |
| edition-deadline | scheduled | src/engine/awards.ts | proven | off-edition-deadline (40 seeds) | selected -4.7; standing.producing -5.7 |
| edition-deadline-soon | scheduled | src/engine/awards.ts | not a feature |  | A notice: it tells the player an entry deadline is near. The deadline that closes entries is its own system (edition-deadline), proven separately. |
| edition-open | scheduled | src/engine/awards.ts | proven | off-edition-open (40 seeds) | entries -39.175; selected -4.15 |
| edition-results | scheduled | src/engine/awards.ts | proven | off-edition-results (200 seeds) | finalised -8.645; won -0.11; standing.directing +0.34 |
| edition-start | scheduled | src/engine/awards.ts | proven | off-edition-start (40 seeds) | screenings -8.25; offers -7.05 |
| editions-roll | scheduled | src/engine/awards.ts | proven | off-editions-roll (40 seeds) | editionsOpen -63.725; entries -25.225; selected -2.725 |
| episode-release | scheduled | src/engine/episode-releases.ts | proven | off-episode-release (40 seeds) | episodesOut -0.2; audience -46650 |
| family-repayment | scheduled | src/engine/personal.ts | not a feature |  | Takes a month's repayment of a family loan chosen in an older save's creation: a new story starts with the inheritance and no family terms (personal.ts openPersonalMoney), so nothing in it schedules this. |
| finance-counter | scheduled | src/engine/negotiation.ts | proven | better-terms (40 seeds) | asked +1.525; investorShare -0.14; investorIn -8925; ownIn +8925 |
| finance-deadline | scheduled | src/engine/finance.ts | proven | off-finance-deadline (40 seeds) | breached -1; repaymentDue -60000 |
| finance-decision | scheduled | src/engine/finance.ts | proven | off-finance-decision (40 seeds) | backerIn -32250; ownIn +32250; money +16521.1 |
| finance-offer-lapse | scheduled | src/engine/negotiation.ts | proven | off-finance-offer-lapse (40 seeds) | studioIn -850000; ownIn +850000 |
| first-look-check | scheduled | src/engine/first-look.ts | proven | off-first-look-check (40 seeds) | firstLookOffers -1.075; overheadPaid -539890; money -536702.539 |
| first-look-counter | scheduled | src/engine/first-look.ts | proven | first-look-overhead (40 seeds) | overheadAsked +1.825; overheadAgreed +0.2 |
| first-look-end | scheduled | src/engine/first-look.ts | proven | off-first-look-end (40 seeds) | firstLookEnded -1.225; overheadPaid -388300; money -384436.175 |
| first-look-lapse | scheduled | src/engine/first-look.ts | proven | off-first-look-lapse (40 seeds) | firstLookActive -1.025; overheadPaid -1422347.5; money -1385182.2 |
| first-look-overhead | scheduled | src/engine/first-look.ts | proven | first-look-accept (40 seeds) | firstLookActive +1.025; money +670839.742 |
| guide-me | scheduled | src/engine/mandates.ts | proven | off-guide-me (40 seeds) | writingPasses -3.475; quality.script -2.487; spent -3688 |
| industry-decision | scheduled | src/engine/industry.ts | not a feature |  | Renews or ends the real series the world follows, as the catalog's world pages show them (catalog/world.ts, simseason.ts); nothing in a player's career reads those outcomes. |
| job-counter | scheduled | src/engine/jobs.ts | proven | ask-better-rate (60 seeds) | ratesAgreed +7.5; jobPay +5917.083 |
| job-day | scheduled | src/engine/jobs.ts | proven | off-job-day (40 seeds) | jobsDone -0.875; jobPay -4126.25 |
| job-lapse | scheduled | src/engine/jobs.ts | not a feature |  | Record-keeping: on an unanswered offer's last day it marks the offer lapsed, for your list and the record. The deadline itself is enforced when you answer (jobs.ts acceptRefusal: "That offer has lapsed."), so with this event switched off an offer still can't be taken late; nothing else reads the mark (docs/v10/proof/off-job-lapse.json). |
| job-offer | scheduled | src/engine/jobs.ts | proven | off-job-offer (40 seeds) | jobsOffered -0.9; jobPay -4198.4 |
| licence-answer | scheduled | src/engine/music.ts | proven | license-song (40 seeds) | licensed +1.475; released +1.475; revenue +38436.25; spent +2563.25 |
| licence-expiry | scheduled | src/engine/music.ts | proven | renew-licence (40 seeds) | renewals +0.65; released +0.65; spent +292.5 |
| offer-response | scheduled | src/engine/hiring.ts | proven | off-offer-response (40 seeds) | hired -16; delivered -2; revenue -124177.625 |
| opportunity | scheduled | src/engine/opportunities.ts | proven | off-opportunity (40 seeds) | opportunities -0.375; commissioned -0.375 |
| opportunity-expire | scheduled | src/engine/opportunities.ts | not a feature |  | Record-keeping: on an unanswered proposal's last day it marks it lapsed, for your list. The deadline is enforced when you answer (opportunities.ts acceptOpportunity checks expiresAt), so with this event switched off a proposal still can't be taken late; nothing else reads the mark (docs/v10/proof/off-opportunity-expire.json). |
| papers-decision | scheduled | src/engine/papers.ts | proven | work-permit (100 seeds) | permits +1; lateDays -7.14; shootDays -1.13; daysToDeliver -1.35; spent -1672.28; quality.direction +3.76; overall +1.345 |
| papers-expiry | scheduled | src/engine/papers.ts | not a feature |  | Marks a visa or permit expired on its date and tells you to apply again. Whether it still lets you in or lets you work is read from its date wherever that matters (papers.ts entryRight, permitIn), so the stage it sets changes only the words. |
| papers-passport | scheduled | src/engine/papers.ts | proven | recorded-passport (40 seeds) | passports +1; papersPaid +36.64 |
| permit-decision | scheduled | src/engine/papers.ts | not a feature |  | Decides a work permit applied for before November 14, 2026, which older saves still hold (papers.ts "what older saves hold"); nothing in a new story schedules it, and permits now go through Your Papers (papers-decision). |
| plan-reminder | scheduled | src/engine/state.ts | not a feature |  | A reminder in the log before a plan starts; the plan itself is proven (plan-over-call, cancel-plan), and the reminder decides nothing. |
| plan-start | scheduled | src/engine/state.ts | proven | plan-over-call (40 seeds) | lateDays +1; quality.direction -0.487 |
| production-confirm | scheduled | src/engine/productions.ts | proven | off-production-confirm (100 seeds) | productionsChanged -1.37; jobsCancelled -0.06 |
| production-release | scheduled | src/engine/productions.ts | proven | off-production-release (60 seeds) | productionResults -6.25; jobsOffered -0.133 |
| release | scheduled | src/engine/finish.ts | proven | off-release (40 seeds) | released -2; revenue -94019.25; money -93319.4 |
| release-licence-answer | scheduled | src/engine/release-plan.ts | proven | off-release-licence-answer (40 seeds) | licenceDeals -0.725; revenue -110204.25; money -101821.451 |
| revision-done | scheduled | src/engine/projects.ts | proven | revision-notes (40 seeds) | notesAddressed +6; quality.script +6; overall +1.9 |
| screening | scheduled | src/engine/awards.ts | proven | attend-screening (30 seeds) | accepted +6.633; attended +5.1; offers +6.633 |
| screening-reminder | scheduled | src/engine/awards.ts | not a feature |  | A notice: it tells the player a screening they were invited to is near. Attending is the screening itself and the RSVP, proven separately. |
| season-decision | scheduled | src/engine/continuation.ts | proven | off-season-decision (100 seeds) | renewed -0.57; renewalFunding -20800; ownIn +20800 |
| shoot-call | scheduled | src/engine/production/shoot.ts | proven | off-shoot-call (40 seeds) | lateDays -1; quality.direction +0.5 |
| shoot-wrap | scheduled | src/engine/production/shoot.ts | proven | off-shoot-wrap (40 seeds) | delivered -2; revenue -136877; money -160305.616 |
| studio-release | scheduled | src/engine/finish.ts | proven | off-studio-release (40 seeds) | released -8.925; gross -1919910 |
| wake | scheduled | src/engine/state.ts | proven | off-wake (40 seeds) | lateDays +6.75; quality.direction -63.587; overall -58.75 |
| weather-check | scheduled | src/engine/production/shoot.ts | proven | off-weather-check (60 seeds) | lostDays +1.333; spent +2949 |
| work-day | scheduled | src/engine/production/workday.ts | proven | off-work-day (40 seeds) | delivered -1.975; revenue -129840.75; money -152559.996 |
| writing-day | scheduled | src/engine/writing-jobs.ts | proven | off-writing-day (40 seeds) | passesAccepted -1.875; quality.script -1.325 |
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
| "Where You Live" | field | state.ts newGame; projects.ts createProject (base) | proven | base-los-angeles (40 seeds) | lostDays -1.225; daysToDeliver -2.013 |
| "Starting Date" | field | state.ts newGame | proven | start-2040 (40 seeds) | year +14; money +277034.155 |
| "Starting Time" | field | state.ts newGame | not yet proven |  |  |
| "Amount (US Dollars)" | field | personal.ts openInheritance, personalBalance, putInRefusal; cash/money.ts parseAmount | proven | small-inheritance (40 seeds) | ownIn -60450; delivered -2 |
| "Describe Your Ethnicity" | field | identity.ts splitBackgrounds | not yet proven |  |  |
| {o.name} | field | projects.ts createProject -> schedule.observances; schedule.ts isWorkingDay | no downstream effect | observances-kept (40 seeds) | moved: daysToDeliver +4.613. Measure: keeping every listed holiday put the 3D short 4.6 days later (40 careers, interval 3.6 to 5.6); nothing measured after the delivery date moved, in careers with no deadline to meet. A delivery due by a date (a commission's deliverBy) is where a later date would bite next. |
| {`${languageName(l.code)} Proficiency`} | field | production/language.ts personLanguagesFit; casting-notes.ts fitNotes | proven | french-basic (40 seeds) | hired +2; spent +2502.25 |
| {`Hire The Rental House's Package On A Day The Kit Can't Serve (${money(housePackageFee(p))} A Day)`} | field | production/shoot.ts (a day the kit cannot serve); equipment.ts setPackageApproval | proven | package-approval (40 seeds) | kitPostponed -729; lostDays -727.4; daysToDeliver +33.563; delivered +2; spent +49552.75 |
| "Film It In" | field | destinations.ts dayPlace, awayCosts, permitWork; production/shoot.ts runShootDay; production/schedule.ts scheduleShootDay | proven | filmed-abroad (40 seeds) | filmedAway +6; spent +17781.9; daysToDeliver +10.85 |
| "Kind Of Site" | field | destinations.ts kindFee, permitWork, underCover, noisyDay | proven | site-station (40 seeds) | daysToDeliver +12.975; ownIn +5591.5; spent +13157.95 |
| "Version" | field | versions.ts addVersion (named and unique); shown where the version is entered | not yet proven |  |  |
| {sceneLabel(p, s)} | field | versions.ts versionScenes | proven | add-version (40 seeds) | versions +2; versionDays +1.925; spent +1174.5 |
| {`${g.label}: ${g.reason}`} | field | edit-actions.ts requestPickups | not yet proven |  |  |
| "Route" | field | finish.ts planRelease; awards.ts qualifying | not yet proven |  |  |
| "Release Date" | field | finish.ts planRelease; awards.ts qualifying windows | not yet proven |  |  |
| "Territory Code" | field | awards.ts; finish.ts | not yet proven |  |  |
| "Which Cut" | field | finish.ts planRelease; music.ts releaseSongs, releaseLicenceRefusal | not yet proven |  |  |
| "Episode Schedule" | field | episode-releases.ts presetDates; finish.ts planRelease | not yet proven |  |  |
| "Episodes On The Premiere" | field | episode-releases.ts presetDates | not yet proven |  |  |
| {`Episode ${i + 2}`} | field | episode-releases.ts episodeDateProblem; awards-rules.ts airing; awards.ts ruledReleaseFits | not yet proven |  |  |
| {`New Date For Episode ${e.number}`} | field | episode-releases.ts setEpisodeDates; release-schedule.ts scheduleChangeEffects | proven | episode-dates (40 seeds) | episodesMoved +2.8; renewalWait +49.35 |
| "Project" | field | awards.ts checkEligibility | not yet proven |  |  |
| "Episode To Enter" | field | awards-actions.ts submitEntry; finish.ts assessEpisode | not yet proven |  |  |
| "Song To Enter" | field | awards-rules.ts songProblems | not yet proven |  |  |
| "Version To Enter" | field | awards-actions.ts entrySnapshot | not yet proven |  |  |
| {performerLabel(c)} | field | awards-actions.ts submitEntry | not yet proven |  |  |
| {`What To Capture For ${name}`} | field | mocap.ts bookMocap, sessionCost | proven | book-body-only (20 seeds) | spent -4982.5; overall -0.475 |
| {`Version In ${r.territories.map(countryName).join(', ')}`} | field | finish.ts setReleaseVersion, the release handler; distribution.ts territoriesReached, reportedGross | proven | release-dubbed (60 seeds) | dubbed +0.917; spent +4942; revenue +17728.75 |
| "Development Money From The Deal" | field | first-look.ts drawDevelopment, developmentRefusal, repayTurnaround | proven | draw-development (40 seeds) | developmentIn +48150; ownIn -48150 |
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
| "Their Role" | field | music-catalog.ts searchMusic | not a feature |  | A filter of the music catalog: it narrows who is listed (tests/music-catalog.test.ts::finds people by name and role). Choosing someone listed is the decision, and those are their own rows. |
| "Music Spending Ceiling" | field | mandates.ts guideMePlan, runMandate, guideMeRefusal | not yet proven |  |  |
| "Let The Composer's Themes Stand Without My Review" | field | cues.ts onThemesDone, themesGate; production/workday.ts | not yet proven |  |  |
| "What Music It Has" | field | cues.ts proposeCues, scoreMinutes; production/tasks.ts (post:music, post:score-session) | proven | music-silence (40 seeds) | cues -4; spent -5224.5; daysToDeliver -1.937; quality.music -58.487 |
| "The Score's Sound" | field | craft.ts SCORES, scoreSessions; production/tasks.ts | proven | score-sound-chamber (40 seeds) | chamber +2; spent +10581.75; daysToDeliver +2.125 |
| "How Much Of It Is Scored" | field | cues.ts proposeCues, scoreMinutes; production/tasks.ts post:music | proven | score-density (40 seeds) | scoredSeconds +2574; spent +22389.7; daysToDeliver +16 |
| "Let The Composer's Themes Stand Without My Review" | field | cues.ts onThemesDone, themesGate; production/workday.ts | proven | themes-stand (40 seeds) | themesApproved +2; delivered +2; released +2 |
| {`Intensity Of ${c.code}`} | field | cues.ts editCue (kept through a new proposal) | not yet proven |  |  |
| {LICENCE_MEDIUM_LABELS[m]} | field | music.ts holderFee, releaseLicenceRefusal | not yet proven |  |  |
| "The Whole World" | field | music.ts holderFee, licence-answer (refusal odds, counteroffer), releaseLicenceRefusal | not yet proven |  |  |
| "Countries, By Two-Letter Code" | field | music.ts holderFee, releaseLicenceRefusal | not yet proven |  |  |
| "For How Long" | field | music.ts holderFee, agreeLicence (expiry), licence-expiry | proven | licence-years (40 seeds) | licenceYears +3.125; released +0.8 |
| "Your Notes On The Themes" | field | cues.ts giveThemeNotes, themeTasks; song-actions.ts syncMusicTasks | proven | theme-notes (40 seeds) | themeRounds +4; quality.music +4; spent +2664; daysToDeliver +3.65 |
| "Treat As An Adult In This Story" | field | guests.ts canApproach -> hiring.ts makeOffer, casting-calls.ts inviteRefusal | proven | treat-as-adult (40 seeds) | realCast +1.85; castCapability -7.812; performance -6.656; castRates +322.75 |
| "Consider Them For" | field | guests.ts considerFor -> hiring.ts candidatesFor | proven | consider-real (40 seeds) | realCast +1.725; castCapability -3.525; performance -2.744; castRates +556 |
| "Title" | field | the calendar, reminders | carried | tests/foundation.test.ts::Advance stops at a reminder | A name or a record, carried to the calendar, reminders: it decides nothing by its nature. |
| "Start Time" | field | state.ts addPlan | proven | plan-over-call (40 seeds) | lateDays +1; quality.direction -0.487 |
| "Length In Minutes" | field | production/schedule.ts planShootDays (your commitments) | proven | plan-over-call (40 seeds) | lateDays +1; quality.direction -0.487 |
| "Reminder" | field | state.ts addPlan (plan-reminder event) | not a feature |  | When a plan's reminder comes: a notice, as its event is (scheduled:plan-reminder above). A plan you sleep through is marked missed, and nothing reads a missed plan. |
| {`Day Rate For ${c.name}`} | field | hiring.ts resolveOffer | proven | offered-rate (40 seeds) | castRates -209.1; spent -1157.925; countersSeen +0.75 |
| "What To Call It" | field | parts.ts partName: the Cast page, call sheets, offers, credits | not yet proven |  |  |
| "Age In These Scenes (Optional)" | field | minors.ts minorFor (an uncast stage) | proven | stage-age-child (40 seeds) | hired +4; spent +4301.5; daysToDeliver +5.063 |
| {`Episode ${e}`} | field | parts.ts stageIn, partScenes; hiring.ts estimateDays | not yet proven |  |  |
| {sceneLabel(p, s)} | field | parts.ts stageIn, castIn; production/shoot.ts; callsheet.ts; finish.ts | proven | add-stage (40 seeds) | stages +2; stageCast +2; performersCast +2; castRates +1578.75 |
| {`Read ${who.name} With`} | field | auditions.ts pairChemistry | not yet proven |  |  |
| {`Writer For Episode ${e.number}`} | field | finish.ts assessEpisode | not yet proven |  |  |
| "Writer" | field | projects.ts assignEpisodeRole; finish.ts computeCredits, assessQuality | not yet proven |  |  |
| {`Director For Episode ${e.number}`} | field | finish.ts assessEpisode; production/schedule.ts blocks | proven | episode-director (40 seeds) | directedByHire +1.8; quality.direction +3.763; overall +0.775; spent +6278.95 |
| "Director" | field | production/shoot.ts onSetHires; finish.ts computeCredits, assessQuality | not yet proven |  |  |
| "Production Start" | field | production/schedule.ts generatePlan | proven | plan-later (40 seeds) | firstShootDay +70; daysToDeliver +67.363 |
| "Rehearsal Days" | field | production/shoot.ts; hiring.ts (booked days) | proven | rehearsal-days (40 seeds) | performance +5.188; overall +1.338; reception +2.038 |
| "Stop-Motion Stages" | field | production/workday.ts | not yet proven |  |  |
| "Render Nodes" | field | production/workday.ts | proven | render-nodes (40 seeds) | daysToDeliver +56.088; spent -1163; money -13166.901 |
| "Six-Day Weeks" | field | production/schedule.ts isWorkingDay | proven | six-day-weeks (60 seeds) | daysToDeliver -3.608; spent +4676.5 |
| "Shoot Episodes In Blocks" | field | production/schedule.ts | proven | shoot-in-blocks (40 seeds) | shootDays -4.425; spent -9364; daysToDeliver -3.037 |
| "Work On Public Holidays" | field | production/schedule.ts isWorkingDay | proven | work-holidays (40 seeds) | daysToDeliver -7.325; spent +1735.125 |
| {`${c.name} Puppet Copies`} | field | production/schedule.ts; production/workday.ts | proven | puppet-copies (40 seeds) | spent +30622.6; money +48586.309; daysToDeliver +21.338 |
| {`Emphasis For ${sceneLabel(p, s)}`} | field | takes.ts; directing.ts | proven | emphasis-performances (40 seeds) | spent +183566.5; shootDays +34.4; money -188012.459 |
| {`Camera For ${sceneLabel(p, s)}`} | field | craft.ts craftTime, craftRoles, rigDayCost, takeSpread; takes.ts planTime, recordTakes | proven | camera-moving (40 seeds) | spent +3189.5; ownIn +1900; overall -0.412 |
| {`Coverage For ${sceneLabel(p, s)}`} | field | takes.ts requiredSetups; production/shoot.ts | proven | full-coverage (40 seeds) | setups +6; shootDays +25.775; spent +84311.5; quality.direction +2.213; overall +1.063 |
| {`Takes For ${sceneLabel(p, s)}`} | field | takes.ts setupTime | proven | full-coverage (40 seeds) | setups +6; shootDays +25.775; spent +84311.5; quality.direction +2.213; overall +1.063 |
| {`Site For ${place}`} | field | locations.ts | not yet proven |  |  |
| {`Backup For ${place}`} | field | locations.ts | not yet proven |  |  |
| "New Planned Budget (US Dollars)" | field | project-budget.ts setPlannedBudget, readiness | proven | new-planned-budget (40 seeds) | ownIn +6270.5; hired +12.075; delivered +1.85; lostDays -672.15; revenue +126819.875 |
| "Why" | field | PlanViews.tsx Plan Revisions | carried | tests/v8-budget.test.ts::keeps 20,000 and 2,000,000 exactly | A name or a record, carried to PlanViews.tsx Plan Revisions: it decides nothing by its nature. |
| "Change Financing Target" | field | finance.ts financeSummary, decide | proven | finance-target (40 seeds) | backerIn +38750; leftInProjects +32709.5; money -7180.28; revenue -9014.2 |
| {`Ask The ${d.backer} For`} | field | negotiation.ts | proven | better-terms (40 seeds) | asked +1.525; investorShare -0.14; investorIn -8925; ownIn +8925 |
| "Spending Ceiling" | field | mandates.ts guideMePlan, runMandate, guideMeRefusal | proven | guide-me-writing (40 seeds) | writersHired +3.975; quality.script +2.163; overall +0.538; spent +2221 |
| "Working Title" | field | everywhere a project is named | carried | e2e/title-input.spec.ts::a title typed, edited, cleared, pasted and submitted | A name or a record, carried to everywhere a project is named: it decides nothing by its nature. |
| "Format" | field | projects.ts, production/tasks.ts, awards.ts | proven | format-feature (120 seeds) | revenue -6751.333; money -6632.466 |
| "Medium" | field | production/tasks.ts buildTasks | proven | medium-animation (40 seeds) | shootDays -7.775; daysToDeliver -33.987; spent +284298.5; money -598133.265; revenue -128142.625 |
| {medium === 'hybrid' ? 'Animation Technique For Animated Scenes' : 'Animation Technique'} | field | production/tasks.ts buildTasks | proven | technique-stop-motion (40 seeds) | hired +6; daysToDeliver +35.575; spent +54357.55 |
| "Animation Finish" | field | production/workday.ts (render hours per frame); estimate.ts | proven | animation-finish (40 seeds) | spent +182895.5; daysToDeliver -233.175; quality.craft -59.55; money -440523.007 |
| "Episodes" | field | projects.ts; production/tasks.ts | proven | episodes-three (40 seeds) | shootDays +5.125; spent +21918.35; daysToDeliver +9.55 |
| {episodic ? 'Target Minutes Per Episode' : 'Target Runtime In Minutes'} | field | awards.ts checkEligibility (running time); estimate.ts | proven | runtime-longer (40 seeds) | quality.script -1; overall -0.312; revenue -1413.75 |
| ? | field | genres.ts composeGenres; script-effects.ts competesAs; finish.ts subtitlingCost | proven | genre-comedy (120 seeds) | reception -0.412; overall -0.279; gross -753.333; standing.writing -1 |
| "Intended Audience" | field | awards-rules.ts; script-explain.ts audienceContentNote | not yet proven |  |  |
| "Tone" | field | cues.ts proposeBrief | proven | tone (40 seeds) | chamber +2; spent +9183.5; cues -2 |
| "Competes As" | field | script-effects.ts competesAs | not yet proven |  |  |
| "Story Era" | field | projects.ts deriveRequirements (period research); production/tasks.ts costumes | proven | story-era (40 seeds) | spent +8784.75; hired +2; ownIn +10275 |
| ? | field | finish.ts subtitlingCost; awards.ts language rules | proven | dialogue-french (40 seeds) | hired +2; spent +15218.75 |
| "Story Setting Place" | field | projects.ts deriveRequirements; production/tasks.ts | proven | setting-abroad (40 seeds) | spent +2504.25; hired +2; ownIn +2425 |
| "Production Base" | field | production/schedule.ts isWorkingDay; weather.ts | proven | base-los-angeles (40 seeds) | lostDays -1.225; daysToDeliver -2.013 |
| "Planned Budget (US Dollars)" | field | project-budget.ts setPlannedBudget, budgetPicture, plannedText; finance.ts financeSummary | proven | plan-budget (40 seeds) | target +80525; ownIn +10000; backerIn +70525; revenue -17844.95; money -19909.443 |
| "Years That Pass In The Story" | field | sequel.ts continueProject | proven | story-years (40 seeds) | hired -2.025; daysToDeliver -3.6 |
| {PLAN_ROUTES[r].label} | field | release-plan.ts setReleasePlan, proposalRefusal, selfRefusal; finish.ts festivalHold | proven | self-release-stores (40 seeds) | revenue +39593.75; money +36625.299; spent +2600 |
| "Plan Territories" | field | release-plan.ts buyerValue, proposeLicence, selfCosts, releaseYourself | proven | plan-territories (40 seeds) | revenue +28868; money +28868 |
| "First Public Date" | field | release-plan.ts leadDays, releaseYourself (planRelease date) | proven | first-public-date (40 seeds) | revenue -20039.25; money -21667.1 |
| "Held For Festivals Until" | field | finish.ts festivalHold in planRelease and acceptDistribution | proven | festival-hold (40 seeds) | distributed -1.825; revenue -136823.375; money -131255.024 |
| "Version Abroad" | field | release-plan.ts releaseYourself (finish.ts setReleaseVersion) | proven | version-dubbed (40 seeds) | spent +2765; money +4730; revenue +7334.25 |
| "Promotion Budget" | field | release-plan.ts selfCosts; distribution.ts promoLift in reportedGross | proven | promotion-budget (40 seeds) | spent +5995; revenue +8267 |
| {`${label}: Buyer`} | field | release-plan.ts proposeLicence, answerProposal | proven | licence-proposal (40 seeds) | licenceDeals +0.875; money -27693.375 |
| {`${label}: Your Ask`} | field | release-plan.ts answerProposal | proven | licence-ask (100 seeds) | licenceDeals -0.83; releaseDelay +29.235; licenceFee -14800 |
| {`${label}: Exclusive`} | field | release-plan.ts buyerValue; distribution.ts heldTerritories | proven | licence-exclusive (100 seeds) | licenceFee +8880; money -12061.25 |
| {`Keep My ${c.label}`} | field | blueprints.ts applyBlueprint | not yet proven |  |  |
| {`Keep My ${c.label} And Add None`} | field | blueprints.ts applyBlueprint | not yet proven |  |  |
| "Save Name" | field | the saved games list | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to the saved games list: it decides nothing by its nature. |
| "Wake Me For Obligations" | field | state.ts runEvents | proven | no-wake-for-obligations (40 seeds) | lateDays +1; quality.direction -0.6; overall -0.187 |
| "The Light It Is Shot In" | field | craft.ts craftTime, gafferNeeded, cameraTestDays, postFactors; takes.ts planTime; hiring.ts neededRoles; production/tasks.ts buildTasks | proven | light-contrast (120 seeds) | spent +3507.333; money -4596.85; daysToDeliver +0.229 |
| "The Score" | field | craft.ts postFactors, scoreSessions; production/tasks.ts buildTasks | proven | score-chamber (40 seeds) | spent +11613.25; ownIn +11500; daysToDeliver +3.263 |
| {SOUNDS[k].label} | field | craft.ts craftTime, craftRoles, postFactors, dialogueHolds; production/tasks.ts buildTasks; production/shoot.ts needsDialogueReplacement | proven | sound-clarity (40 seeds) | hired +2; spent +11216.25; ownIn +9425 |
| "Central Question" | field | script-effects.ts documentsNeeded | proven | question-missing (20 seeds) | grantsAsked -2; grantIn -66000; ownIn +90000 |
| "Central Question" | field | shown in the Story panel; part of the Statement Of Intent for a documentary | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the Story panel; part of the Statement Of Intent for a documentary: it decides nothing by its nature. |
| "Synopsis" | field | shown in the Story panel | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the Story panel: it decides nothing by its nature. |
| "Logline" | field | script-effects.ts documentsNeeded | proven | logline-missing (40 seeds) | backerDeals -1; ownIn +37125; money -95956.55 |
| "Premise" | field | script-effects.ts documentsNeeded | proven | premise-missing (40 seeds) | backerDeals -1; ownIn +37275; money -79563.126 |
| "Stakes" | field | script-effects.ts documentsNeeded | proven | stakes-missing (40 seeds) | grantsAsked -2; grantIn -35275; ownIn +35275 |
| "Central Conflict" | field | script-effects.ts documentsNeeded | proven | conflict-missing (40 seeds) | grantsAsked -2; grantIn -26150; ownIn +26150 |
| "Point Of View" | field | script-effects.ts documentsNeeded | proven | viewpoint-missing (40 seeds) | grantsAsked -2; grantIn -32200; ownIn +32200 |
| "Theme" | field | script-effects.ts documentsNeeded | proven | theme-missing (40 seeds) | grantsAsked -2; grantIn -43200; ownIn +43200 |
| "Intended Ending" | field | script-effects.ts documentsNeeded | proven | ending-missing (40 seeds) | grantsAsked -2; grantIn -29150; ownIn +29150 |
| "Intended Experience" | field | cues.ts proposeBrief | proven | intended-experience (40 seeds) | silent +2; cues -4; spent -5219; daysToDeliver -2.812; quality.music -61.025 |
| "Who It Is For" | field | shown in the Story panel | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the Story panel: it decides nothing by its nature. |
| "How It Is Built" | field | shown in the Story panel | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the Story panel: it decides nothing by its nature. |
| "Tone" | field | cues.ts proposeBrief | proven | tone (40 seeds) | chamber +2; spent +9183.5; cues -2 |
| "Competes As" | field | script-effects.ts competesAs | not yet proven |  |  |
| "Source Material" | field | awards-rules.ts (original or adapted screenplay) | not yet proven |  |  |
| "Adapted From" | field | shown with the project | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the project: it decides nothing by its nature. |
| "When It Is Set" | field | awards-rules.ts requirementProblems | not yet proven |  |  |
| "Year It Is Set In" | field | looks.ts periodBand, projectBand; projects.ts deriveRequirements; production/tasks.ts buildTasks | proven | story-year (40 seeds) | spent +8786.75; money -26599.279; daysToDeliver +1.688 |
| "The Look It Borrows" | field | the Creative Brief card | carried | tests/looks.test.ts::1986 made in 2026 is a period: research, and half as much costume work again; 2026 is neither; the look it borrows changes no work | A name or a record, carried to the Creative Brief card: it decides nothing by its nature. |
| "Story Setting Place" | field | projects.ts deriveRequirements | proven | setting-abroad (40 seeds) | spent +2504.25; hired +2; ownIn +2425 |
| "Story Setting" | field | shown in the Story panel | carried | tests/script-effects.test.ts::briefs add no work | A name or a record, carried to shown in the Story panel: it decides nothing by its nature. |
| {x.label} | field | awards-rules.ts PROJECT_SUBJECTS | not yet proven |  |  |
| {q.label} | field | shown with the genre questions | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the genre questions: it decides nothing by its nature. |
| "Draft Name" | field | drafts list | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to drafts list: it decides nothing by its nature. |
| "Draft Name" | field | drafts list | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to drafts list: it decides nothing by its nature. |
| {`"${x.title}" In This Scene`} | field | songs.ts songUses; projects.ts deriveRequirements | not yet proven |  |  |
| "Interior Or Exterior" | field | production/shoot.ts (weather) | proven | scene-exterior (40 seeds) | lostDays +1.4; shootDays +1.2; money -24746.941 |
| "Place" | field | production/schedule.ts groupShootDays | proven | scenes-one-place (40 seeds) | shootDays -3.475; spent -17914.5; ownIn -575 |
| "Time Of Day" | field | production/rates.ts dayFees | proven | scene-night (40 seeds) | spent +1438.55; overall +0.438 |
| "Estimated Minutes" | field | production/schedule.ts sceneLoad; finish.ts runtime | proven | scene-minutes (40 seeds) | runtime +22; spent +11793.2; daysToDeliver +7.55; offered +93875; guarantees +42500 |
| "Kind" | field | projects.ts deriveRequirements (interview, archival) | proven | scene-archival (40 seeds) | shootDays -2.95; hired +2 |
| "Basis" | field | projects.ts scriptIssues (sourced needs a fact) | proven | scene-dramatized (40 seeds) | researchItems -2; spent -639 |
| "Technique For This Scene" | field | projects.ts sceneTechnique; production/tasks.ts | not yet proven |  |  |
| "Act" | field | structure.ts structureNotes | not yet proven |  |  |
| "Tonal Intention" | field | projects.ts scriptIssues (tonal genres note a missing one) | not yet proven |  |  |
| "Who Is Recording" | field | projects.ts scriptIssues (found footage) | not yet proven |  |  |
| {c.name} | field | projects.ts deriveRequirements; hiring.ts estimateDays | proven | friend-out-of-cafe (40 seeds) | spent -1641; ownIn -100 |
| {`${c.name}'s Look In This Scene`} | field | looks.ts stateIn, statesUsed, costumeCopies, changeMinutes, makeupShare | proven | scene-look (40 seeds) | spent +17585.5; ownIn +18575 |
| {c.name} | field | projects.ts deriveRequirements (interviews, consent) | not yet proven |  |  |
| {e.claim.slice(0, 50)} | field | projects.ts scriptIssues | not yet proven |  |  |
| "Objective" | field | projects.ts scriptIssues (advisory note when empty) | not yet proven |  |  |
| {nonfiction ? 'What Happens' : 'Action'} | field | shown on the scene | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown on the scene: it decides nothing by its nature. |
| "Turning Point" | field | shown on the scene | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown on the scene: it decides nothing by its nature. |
| "Essential To The Story" | field | finish.ts (cutting it costs the edit); cost-cuts.ts | proven | scene-essential (40 seeds) | quality.editing -8; overall -0.787; reception -0.587 |
| "Props" | field | projects.ts deriveRequirements; production/tasks.ts | proven | scene-props (40 seeds) | spent +11258; daysToDeliver +4.4 |
| "Animals" | field | projects.ts deriveRequirements; production/tasks.ts | proven | scene-animals (40 seeds) | spent +2948.75; daysToDeliver +1.313 |
| "Vehicles" | field | projects.ts deriveRequirements; production/tasks.ts | proven | scene-vehicles (40 seeds) | spent +3020.75; daysToDeliver +1.425 |
| "Stunts" | field | projects.ts deriveRequirements; production/tasks.ts | proven | scene-stunts (40 seeds) | spent +66567; daysToDeliver +9.013 |
| "Crowd Size" | field | production/rates.ts (crowd day rate) | proven | scene-crowd (60 seeds) | spent +51841.833; money -40560.91 |
| "Crowd Makeup" | field | looks.ts chairMinutes, makeupDayCost; production/shoot.ts runShootDay | proven | crowd-makeup (40 seeds) | spent +50493; ownIn +47175; overall -0.475 |
| "Extend The Crowd In Post" | field | looks.ts physicalCrowd, digitalCrowd; production/tasks.ts buildTasks; production/schedule.ts sceneLoad | proven | crowd-digital (40 seeds) | spent -25755.75; money +31680.947; daysToDeliver +7.2 |
| "Visual Effects" | field | projects.ts deriveRequirements; production/tasks.ts | proven | scene-vfx (40 seeds) | spent +43959.25; daysToDeliver +14.338 |
| "Dance" | field | projects.ts deriveRequirements | proven | scene-dance (40 seeds) | spent +11221.25; daysToDeliver +3.113 |
| "Intimate Scene" | field | projects.ts deriveRequirements | proven | scene-intimacy (40 seeds) | spent +2244.5; hired +2; ownIn +675 |
| "Water Work" | field | projects.ts deriveRequirements | proven | scene-water (40 seeds) | spent +3503.5; hired +2; ownIn +500 |
| "Intentional Discontinuity" | field | projects.ts scriptIssues | not yet proven |  |  |
| "Speaker" | field | projects.ts scriptIssues; finish.ts | proven | dialogue-two-speakers (40 seeds) | singles +4; daysToDeliver +2.888 |
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
| "What Is Set Up" | field | shown with the setup | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the setup: it decides nothing by its nature. |
| "Kind" | field | projects.ts deriveRequirements (clue props) | not yet proven |  |  |
| "First Character" | field | season.ts sharedFactImpact | not yet proven |  |  |
| "Second Character" | field | season.ts sharedFactImpact | not yet proven |  |  |
| "Relationship" | field | shown in the season plan | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the season plan: it decides nothing by its nature. |
| "Where It Starts" | field | shown in the season plan | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the season plan: it decides nothing by its nature. |
| "Where It Ends" | field | shown in the season plan | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the season plan: it decides nothing by its nature. |
| "Relationship" | field | shown in the season plan | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the season plan: it decides nothing by its nature. |
| "Where It Starts" | field | shown in the season plan | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the season plan: it decides nothing by its nature. |
| "Where It Ends" | field | shown in the season plan | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the season plan: it decides nothing by its nature. |
| "Claim" | field | projects.ts deriveRequirements (fact-check) | not yet proven |  |  |
| "Status" | field | projects.ts deriveRequirements | not yet proven |  |  |
| "Source Note" | field | shown with the fact | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the fact: it decides nothing by its nature. |
| "Contributor Name" | field | credits, consent | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to credits, consent: it decides nothing by its nature. |
| "Who They Are" | field | shown with the contributor | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the contributor: it decides nothing by its nature. |
| "What It Is About" | field | documentary.ts proposeDocumentaryPlan (the questions it writes) | not yet proven |  |  |
| "Kind Of Subject" | field | documentary.ts proposeDocumentaryPlan | not yet proven |  |  |
| "Note" | field | projects.ts addNote, finish.ts assessQuality | proven | own-notes (40 seeds) | ownNotes +6; quality.script +6; overall +1.725 |
| "Area" | field | projects.ts addNote | proven | own-notes (40 seeds) | ownNotes +6; quality.script +6; overall +1.725 |
| "About" | field | projects.ts addNote | proven | own-notes (40 seeds) | ownNotes +6; quality.script +6; overall +1.725 |
| "Character Name" | field | everywhere a part is named | carried | tests/scenes.test.ts::renaming changes the name everywhere it is shown | A name or a record, carried to everywhere a part is named: it decides nothing by its nature. |
| "Give Their Scenes, Lines And Relationships To" | field | projects.ts archiveCharacter | not yet proven |  |  |
| "Scene" | field | structure.ts beatsIn | not yet proven |  |  |
| "What Changes" | field | structure.ts | not yet proven |  |  |
| "New Character's Name" | field | projects.ts splitCharacter | not yet proven |  |  |
| {sceneLabel(p, s)} | field | projects.ts splitCharacter | not yet proven |  |  |
| "Name" | field | everywhere a part is named | carried | tests/scenes.test.ts::renaming changes the name everywhere it is shown | A name or a record, carried to everywhere a part is named: it decides nothing by its nature. |
| "Role Size" | field | script-effects.ts castPlacement; hiring.ts | proven | lead-role-size (30 seeds) | leadEntries -2.967; actingDecided -2.967 |
| "Entity" | field | projects.ts deriveRequirements; production/shoot.ts | proven | lead-entity (40 seeds) | spent +17308.25; hired +2; ownIn +14725 |
| "Realized As" | field | projects.ts deriveRequirements; production/shoot.ts | proven | lead-puppet (40 seeds) | spent +16263.75; daysToDeliver +2.513 |
| "Puppet Face" | field | production/tasks.ts (sm:faces, sm:armature, sm:animation); rates.ts FACE_METHODS | proven | puppet-face (40 seeds) | spent +16329.7; ownIn +18050; daysToDeliver +20.9 |
| "Also Called" | field | shown with the part in casting | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the part in casting: it decides nothing by its nature. |
| "Pronouns" | field | script-explain.ts characterPronouns | not yet proven |  |  |
| "Speaks" | field | production/language.ts personLanguagesFit | proven | lead-speaks (40 seeds) | spent +2874; hired +2 |
| "Awards Placement" | field | script-effects.ts castPlacement | not yet proven |  |  |
| "Series Involvement" | field | hiring.ts estimateDays; finish.ts computeCredits | proven | series-regular (40 seeds) | guideDays +6; ownIn +4250 |
| {title(f)} | field | awards-rules.ts isNarrator; hiring.ts estimateDays | proven | lead-narrator (40 seeds) | spent +1491.25; daysToDeliver +1.863; ownIn +1100 |
| {title(m)} | field | hiring.ts; production | proven | method-capture (40 seeds) | hired +2; castRates +1577.5; daysToDeliver -25.187 |
| "What Kind Of Being" | field | shown to design and casting | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown to design and casting: it decides nothing by its nature. |
| "Description" | field | script-explain.ts breakdownComplete | not yet proven |  |  |
| "Wants" | field | script-explain.ts breakdownComplete | not yet proven |  |  |
| "Fears" | field | script-explain.ts breakdownComplete | not yet proven |  |  |
| "Why They Want It" | field | shown with the part | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the part: it decides nothing by its nature. |
| "What Stands In The Way" | field | shown with the part | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the part: it decides nothing by its nature. |
| "What In Them Pulls Against It" | field | shown with the part | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the part: it decides nothing by its nature. |
| "How They Change" | field | shown with the part | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the part: it decides nothing by its nature. |
| "How They Speak" | field | shown with the part | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the part: it decides nothing by its nature. |
| "Makeup" | field | looks.ts makeupShare, makeupDayCost; production/tasks.ts buildTasks; production/schedule.ts groupShootDays; production/shoot.ts runShootDay; callsheet.ts callSheet; hiring.ts neededRoles | proven | lead-makeup (40 seeds) | spent +22088.75; money -40690.12; daysToDeliver +1.525 |
| "Costume From" | field | looks.ts costumeCopies, wardrobeMismatch; production/tasks.ts buildTasks | proven | lead-costume (40 seeds) | spent +8563; daysToDeliver +4.525 |
| "Appearance States" | field | looks.ts statesOf, costumeCopies; production/tasks.ts buildTasks | proven | lead-states (40 seeds) | spent +26120; money -53194.614; daysToDeliver +20.213 |
| {`Names Of ${c.name}'s Looks`} | field | looks.ts statesOf, stateNames; brief.ts setLook | not yet proven |  |  |
| "Format Family" | field | unscripted.ts buildTasks | not yet proven |  |  |
| {c.name} | field | unscripted.ts decideCompetition | not yet proven |  |  |
| "Leave Each Episode" | field | unscripted.ts decideCompetition | not yet proven |  |  |
| {`Add Ethnicity For ${who}`} | field | hiring.ts sharedHeritages | not yet proven |  |  |
| {`Add Nationality For ${who}`} | field | hiring.ts | not yet proven |  |  |
| {i.label} | field | script-explain.ts; finish.ts outlet requirements | proven | content-strong (40 seeds) | lateSlots +0.45; viewers -71800 |
| "Age In Story" | field | story-age.ts storyAge; casting-notes.ts fitNotes; minors.ts minorFor | proven | lead-child (40 seeds) | spent +7616; daysToDeliver +8.325 |
| "Up To" | field | story-age.ts storyAge; casting-notes.ts fitNotes | not yet proven |  |  |
| "Advance To" | field | state.ts processUntil | not a feature |  | How far to let the clock run. Time passing is the engine every proof plays a career through; what happens by a date is each system's own row, and Advance stopping for a plan or a call is tested (tests/foundation.test.ts::Advance stops at a reminder). |
| "Date" | field | state.ts processUntil | not a feature |  | How far to let the clock run. Time passing is the engine every proof plays a career through; what happens by a date is each system's own row, and Advance stopping for a plan or a call is tested (tests/foundation.test.ts::Advance stops at a reminder). |
| "Time" | field | state.ts processUntil | not a feature |  | How far to let the clock run. Time passing is the engine every proof plays a career through; what happens by a date is each system's own row, and Advance stopping for a plan or a call is tested (tests/foundation.test.ts::Advance stops at a reminder). |
| "Wake Up" | field | state.ts startSleep | proven | wake-early (40 seeds) | lateDays -1; quality.direction +1.138; overall +0.313 |
| "Set Wake Time" | field | state.ts startSleep | proven | sleep-through-call (40 seeds) | lateDays +1; quality.direction -0.775; overall -0.25 |
| "Hours Of Sleep" | field | state.ts startSleep | not yet proven |  |  |
| "Set An Alarm" | field | state.ts snooze | proven | sleep-through-call (40 seeds) | lateDays +1; quality.direction -0.775; overall -0.25 |
| {`Replacement Place ${i + 1}`} | field | save.ts repairSave | not a feature |  | A repair of a save whose places can't be found: it puts a place where the save had one (tests/migration.test.ts::open after a repair that keeps a backup and changes only the places). Where you live, the decision a place makes, is proven by base-los-angeles. |
| "Song Title" | field | everywhere a song is named | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to everywhere a song is named: it decides nothing by its nature. |
| "Where It Comes From" | field | songs.ts songTasks; awards-rules.ts songProblems | proven | song-commissioned (40 seeds) | hired +2; spent +4575.5 |
| "Lyrics" | field | songs.ts songTasks | proven | song-lyricist (40 seeds) | hired +2; spent +2317.75; daysToDeliver -1.575 |
| "Music By" | field | songs.ts songCredits; awards recipients | not a feature |  | Names typed for a song that existed before the film, carried to its credits (songs.ts songCredits). An award for an original song takes only one written for the project (awards-rules.ts writtenForProject), so these names never decide an entry; who writes a song made for the film is its own row (Where It Comes From, Lyrics). |
| "Lyrics By" | field | songs.ts songCredits; awards recipients | not a feature |  | Names typed for a song that existed before the film, carried to its credits (songs.ts songCredits). An award for an original song takes only one written for the project (awards-rules.ts writtenForProject), so these names never decide an entry; who writes a song made for the film is its own row (Where It Comes From, Lyrics). |
| "Rights Holder" | field | shown with the song | carried | e2e/journey-e.spec.ts::refused with a reason, then recovered | A name or a record, carried to shown with the song: it decides nothing by its nature. |
| {`Scene For ${s.title}`} | field | songs.ts songUses | not yet proven |  |  |
| "How It Plays" | field | awards-rules.ts songRuleProblem | proven | song-opening-titles (40 seeds) | licenceFees +36445.5; spent +27027; money -27027 |
| "Minutes It Plays" | field | awards-rules.ts songRuleProblem | proven | song-minutes (40 seeds) | licenceFees +166461.75; spent +127764 |
| {`${c.name} Performs ${s.title}`} | field | casting-notes.ts fitNotes; songs.ts songCredits | not yet proven |  |  |
| {`${v.label}: ${sceneLabel(p, sc)}, In Place Of "${song.title}"`} | field | song-actions.ts changeVersionSong | proven | version-song (40 seeds) | songChanges +2; songTasks +4; spent +1872 |
| {`${c.name} On Screen (Minutes)`} | field | screen-time.ts shareCheck | proven | record-screen-time (40 seeds) | screenRecords +12; screenEntries +1; screenDecided +1 |
| {`${c.name} Heard Only (Minutes)`} | field | screen-time.ts screenTotal | not yet proven |  |  |
| "Title For The New Project" | field | opportunities.ts acceptOpportunity | not yet proven |  |  |
| {`What ${name}'s Revision Should Look At`} | field | WritingWork.tsx JobLine | not yet proven |  |  |
| {`Your Note To ${name} (Optional)`} | field | WritingWork.tsx JobLine | carried | tests/writing-jobs.test.ts::the brief and the notes are kept as written and change nothing | A name or a record, carried to WritingWork.tsx JobLine: it decides nothing by its nature. |
| {`Ask ${name} For`} | field | writing-jobs.ts writingTerms, acceptedRead | proven | writing-rewrite (40 seeds) | writingDays +1.925; quality.script +1.538; standing.writing +0.55; overall +0.5 |
| {`Episode For ${name}`} | field | writing-jobs.ts writingTerms, acceptedRead | not yet proven |  |  |
| {`Your Brief For ${name} (Optional)`} | field | WritingWork.tsx JobLine | carried | tests/writing-jobs.test.ts::the brief and the notes are kept as written and change nothing | A name or a record, carried to WritingWork.tsx JobLine: it decides nothing by its nature. |
| "Put In From Your Own Money" | field | personal.ts putInOwnMoney, putInRefusal | proven | own-money-or-backer (40 seeds) | ownIn -73300; backerDeals +2; revenue -66630.85 |
| "Banner Name" | field | company.ts setBanner, productionCredit; FinishViews.tsx credits | not yet proven |  |  |
