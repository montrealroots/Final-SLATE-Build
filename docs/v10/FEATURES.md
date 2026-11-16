# Every Feature, Proven Or Not

Written by `tests/v10-features.test.ts` from the code; don't edit by hand. A feature is proven only by a played-career
Monte Carlo result in `docs/v10/proof/`: the same seeds played twice, one decision changed, a direct measure and a later
measure in another system both moving with their 95% interval clear of zero. A name or a record that only a screen
shows (a title, a description) decides nothing, so it is carried rather than proven: its evidence is the test or
journey that shows it there.

| Kind | proven | carried | does not bite | no downstream effect | stale | not a feature | not yet proven | All |
|---|---|---|---|---|---|---|---|---|
| action | 146 | 0 | 0 | 1 | 0 | 13 | 0 | 160 |
| bank | 54 | 0 | 0 | 0 | 0 | 0 | 0 | 54 |
| scheduled | 56 | 0 | 0 | 0 | 0 | 11 | 0 | 67 |
| field | 248 | 97 | 0 | 0 | 0 | 9 | 0 | 354 |
| all | 504 | 97 | 0 | 1 | 0 | 33 | 0 | 635 |

## Rows

| Feature | Kind | Read by | Status | Proof | What moved, or why |
|---|---|---|---|---|---|
| rsvpScreening | action | src/engine/awards-actions.ts | proven | attend-screening (30 seeds) | accepted +6.8; attended +5.433; offers +6.8; distributed -0.133 |
| submitEntry | action | src/engine/awards-actions.ts | proven | enter-awards (40 seeds) | entries +42.05; selected +5.125 |
| withdrawEntry | action | src/engine/awards-actions.ts | proven | withdraw-entry (40 seeds) | withdrawn +33.45; selected -5.15 |
| execute | action | src/engine/bankworld/core/simulation.ts | not a feature |  | The bank world's dispatcher: every bank command a screen runs goes through it, and each command is its own row. |
| advanceBankWorld | action | src/engine/bankworld/index.ts | not a feature |  | Brings the bank to the game's clock before a bank command runs; time passing is proven through the scheduled rows and the bank commands. |
| bankSim | action | src/engine/bankworld/index.ts | not a feature |  | Reads the bank world for the command that follows; not a decision. |
| setLock | action | src/engine/blueprints.ts | proven | lock-field (40 seeds) | periodFilms +2; spent +62651.25; daysToDeliver +12.313 |
| saveIdea | action | src/engine/brief.ts | not a feature |  | Keeps an idea on the player's shortlist in the idea picker (IdeaPicker.tsx); the idea itself is used through the brief, its own row. |
| callBack | action | src/engine/casting-calls.ts | proven | callback (40 seeds) | callbacksSeen +7.45; castCapability +0.563 |
| inviteToAudition | action | src/engine/casting-calls.ts | proven | audition (40 seeds) | readsSeen +14.875; castCapability +9.113; performance +7.656; overall +2.625; castRates +233.25 |
| setShortlisted | action | src/engine/casting-calls.ts | proven | callback (40 seeds) | callbacksSeen +7.45; castCapability +0.563 |
| shortlistAdvice | action | src/engine/casting-director.ts | proven | shortlist-advice (40 seeds) | callbacksSeen +10.175; castCapability +1.35; performance +1.163 |
| startSearch | action | src/engine/casting-director.ts | proven | casting-search (40 seeds) | searches +3.85; readsSeen +20.65; castCapability +17.475; performance +14.375; castRates +1146.5; spent +11191.75 |
| setBanner | action | src/engine/company.ts | not a feature |  | Names your banner, shown on your credits as "A … Production" (YourMoney.tsx); a name, read only where it is shown. |
| applyBrief | action | src/engine/cues.ts | proven | music-brief (40 seeds) | cues +4; spent +3279.5; daysToDeliver +2.213 |
| approveThemes | action | src/engine/cues.ts | proven | approve-themes (40 seeds) | themesApproved +2; delivered +2; released +2; quality.music +59.725 |
| editCue | action | src/engine/cues.ts | proven | edit-cue (40 seeds) | cues -4; spent -5613.5; daysToDeliver -1.85; quality.music -14.575 |
| giveThemeNotes | action | src/engine/cues.ts | proven | theme-notes (40 seeds) | themeRounds +4; quality.music +4; spent +2520.5; daysToDeliver +3.6 |
| approveDesign | action | src/engine/designs-actions.ts | proven | approve-design (20 seeds) | delivered +2; revenue +83788.5; money +110139.801 |
| askForDesignChanges | action | src/engine/designs-actions.ts | proven | ask-design-changes (20 seeds) | designDays +1.7; spent +671 |
| setFilmedAt | action | src/engine/destinations.ts | proven | filmed-abroad (40 seeds) | filmedAway +6; spent +23025.6; daysToDeliver +10.613 |
| applyFix | action | src/engine/directing.ts | proven | fix-with-pickups (40 seeds) | pickupDays +2.875; spent +6987; quality.editing +1.575 |
| showCut | action | src/engine/documentary-actions.ts | proven | show-cut (120 seeds) | cutApproved +1; runtime +3.525; daysToDeliver +2.971 |
| requestConsent | action | src/engine/documentary.ts | proven | request-consent (20 seeds) | consentGiven +3.1; delivered +1.25; revenue +90207 |
| lockPicture | action | src/engine/edit-actions.ts | proven | lock-picture (40 seeds) | delivered -2; released -2; revenue -143183.625; standing.producing -3.125 |
| requestPickups | action | src/engine/edit-actions.ts | proven | request-pickups (40 seeds) | shootDays +2.125; spent +7605.5; daysToDeliver +4.113; quality.direction +0.8 |
| restoreToEdit | action | src/engine/edit-actions.ts | proven | restore-to-edit (40 seeds) | cutFromEdit -2; overall -0.512 |
| startCutPass | action | src/engine/edit-actions.ts | proven | cut-passes (40 seeds) | quality.editing +8; daysToDeliver +3.188; overall +1.513; reception +1.825; spent +2944.5 |
| unlockPicture | action | src/engine/edit-actions.ts | proven | unlock-picture (40 seeds) | daysToDeliver +2.938; spent +1852.75 |
| deliverEpisode | action | src/engine/episode-delivery.ts | proven | deliver-episode-release (40 seeds) | episodesDeliveredAlone +1.9; firstOut -7.5 |
| lockEpisode | action | src/engine/episode-delivery.ts | proven | deliver-episode-release (40 seeds) | episodesDeliveredAlone +1.9; firstOut -7.5 |
| startEpisodeCutPass | action | src/engine/episode-delivery.ts | proven | episode-cut-pass (40 seeds) | episodeCutPasses +1.675; quality.editing +3.35; spent +932.9 |
| setEpisodeDates | action | src/engine/episode-releases.ts | proven | episode-dates (40 seeds) | episodesMoved +2.675; renewalWait +29.4 |
| addToKit | action | src/engine/equipment.ts | proven | own-kit (40 seeds) | gearOwned +12; kitItems +12; spent -3052.25 |
| buyGear | action | src/engine/equipment.ts | proven | own-kit (40 seeds) | gearOwned +12; kitItems +12; spent -3052.25 |
| removeFromKit | action | src/engine/equipment.ts | proven | remove-from-kit (40 seeds) | kitItems -2; spent +2694.75 |
| sellGear | action | src/engine/equipment.ts | proven | sell-gear (30 seeds) | gearOwned -6; money +1236.212; spent +288.9 |
| serviceGear | action | src/engine/equipment.ts | proven | service-gear (30 seeds) | worn -6; kitPostponed -725; lostDays -724.067; daysToDeliver +2.211; spent +43081.333; money +138692.707 |
| setPackageApproval | action | src/engine/equipment.ts | proven | package-approval (40 seeds) | kitPostponed -729; lostDays -727.425; daysToDeliver +33.638; delivered +2; spent +50703.5 |
| acceptDeal | action | src/engine/finance.ts | proven | own-money-or-backer (40 seeds) | ownIn -70575; backerDeals +2; revenue -56160.525 |
| approachBacker | action | src/engine/finance.ts | proven | own-money-or-backer (40 seeds) | ownIn -70575; backerDeals +2; revenue -56160.525 |
| pitchToStudio | action | src/engine/finance.ts | proven | pitch-to-studio (40 seeds) | pitched +3; studioIn +850000; ownIn -850000 |
| refuseDeal | action | src/engine/finance.ts | proven | refuse-deal (40 seeds) | refused +1.7; investorIn -62650; ownIn +62650; money +24632.476; leftInProjects -12831 |
| setFinanceTarget | action | src/engine/finance.ts | proven | finance-target (40 seeds) | backerIn +38025; leftInProjects +32358.25 |
| submitSeries | action | src/engine/finance.ts | proven | submit-series (40 seeds) | submittedSeries +1.15; commissionedIn +47725; ownIn -47725 |
| acceptDistribution | action | src/engine/finish.ts | proven | distributor-or-self (40 seeds) | distributed -1.675; revenue -128305.125; money -121415.925 |
| cancelRelease | action | src/engine/finish.ts | proven | cancel-release (40 seeds) | cancelledReleases +1.975; released -1.975; revenue -132208.375; money -125032.575 |
| cutFromEdit | action | src/engine/finish.ts | proven | cut-from-edit (40 seeds) | cutFromEdit +2; overall +0.425 |
| declineDistribution | action | src/engine/finish.ts | proven | decline-distribution (40 seeds) | offersDeclined +1.8; distributed -1.75; revenue -158395.25; money -151091.501 |
| deliver | action | src/engine/finish.ts | proven | deliver (40 seeds) | delivered -2; released -2; revenue -136678.75; standing.producing -3.35 |
| planRelease | action | src/engine/finish.ts | proven | release-or-not (40 seeds) | released -2; revenue -134868.5; money -130032.5 |
| setReleaseVersion | action | src/engine/finish.ts | proven | release-dubbed (60 seeds) | dubbed +0.933; spent +4542.333 |
| acceptFirstLook | action | src/engine/first-look.ts | proven | first-look-accept (40 seeds) | firstLookActive +1.125; money +774512.989 |
| askMoreOverhead | action | src/engine/first-look.ts | proven | first-look-overhead (120 seeds) | overheadAsked +1.625; overheadAgreed +0.208; overheadPaid +67083.333; money +73621.837 |
| declineFirstLook | action | src/engine/first-look.ts | proven | first-look-decline (40 seeds) | firstLookDeclined +1.1; firstLookActive -1.25; money -536159.412 |
| drawDevelopment | action | src/engine/first-look.ts | proven | draw-development (40 seeds) | developmentIn +48300; ownIn -48300 |
| endFirstLook | action | src/engine/first-look.ts | proven | first-look-end (40 seeds) | firstLookEnded +1.45; money -278003.744 |
| considerFor | action | src/engine/guests.ts | proven | consider-real (40 seeds) | realCast +1.725; castCapability -3.525; performance -2.662; castRates +556 |
| considerPerson | action | src/engine/guests.ts | proven | consider-real (40 seeds) | realCast +1.725; castCapability -3.525; performance -2.662; castRates +556 |
| stopConsidering | action | src/engine/guests.ts | proven | stop-considering (40 seeds) | realReads -1.45; realCast -1.325; castRates -992455.925; spent -3482278.5 |
| treatAsAdult | action | src/engine/guests.ts | proven | treat-as-adult (40 seeds) | realCast +1.85; castCapability -7.812; performance -6.612; castRates +322.75 |
| acceptCounter | action | src/engine/hiring.ts | proven | counter-offers (40 seeds) | countersDeclined +90.45; spent +10640.5; quality.craft -59.712; overall -58.362; daysToDeliver -34.025 |
| castPlayer | action | src/engine/hiring.ts | proven | cast-yourself (40 seeds) | playerParts +2; castRates -1631.75; spent -5746; standing.acting +4.6 |
| castRoleFor | action | src/engine/hiring.ts | not a feature |  | Names the job a part's casting method is (performer or voice performer) inside an offer; the offer is its own row (hiring.makeOffer). |
| declineCounter | action | src/engine/hiring.ts | proven | counter-offers (40 seeds) | countersDeclined +90.45; spent +10640.5; quality.craft -59.712; overall -58.362; daysToDeliver -34.025 |
| makeOffer | action | src/engine/hiring.ts | proven | offered-rate (40 seeds) | castRates -209.1; spent -1084.475; countersSeen +0.75 |
| releaseHire | action | src/engine/hiring.ts | proven | release-hire (40 seeds) | released +2; offersMade +45.45 |
| sendStaffingOffers | action | src/engine/hiring.ts | proven | send-staffing (40 seeds) | crewRates -3542.25; crewExperience -2.367; spent -16455.25; quality.craft -18.125; overall -4.975 |
| uncastPlayer | action | src/engine/hiring.ts | proven | uncast-yourself (40 seeds) | playerParts -2; castRates +1637; spent +5632; standing.acting -4.65; overall +0.538 |
| withdrawOffer | action | src/engine/hiring.ts | proven | withdraw-offer (40 seeds) | withdrawn +2; offersMade +2; castRates +86 |
| acceptJob | action | src/engine/jobs.ts | proven | outside-work (40 seeds) | jobsDone -0.95; jobPay -5529.8; jobsOffered -0.175 |
| askBetterRate | action | src/engine/jobs.ts | proven | ask-better-rate (60 seeds) | ratesAgreed +7.5; jobPay +5937.867 |
| declineJob | action | src/engine/jobs.ts | proven | decline-job (40 seeds) | jobsDeclined +0.975; jobsDone -0.9; jobPay -5065.3 |
| withdrawJob | action | src/engine/jobs.ts | proven | withdraw-job (40 seeds) | jobsWithdrawn +0.95; jobsDone -1.025; jobPay -5129.65 |
| negotiate | action | src/engine/line-producer.ts | proven | line-producer-negotiates (120 seeds) | counterRates -35.958; spent +391.292 |
| chooseSite | action | src/engine/locations-actions.ts | proven | stage-sets (40 seeds) | onStage +6; lostDays -1.5; daysToDeliver -2.212 |
| approveGuideMe | action | src/engine/mandates.ts | proven | guide-me-writing (40 seeds) | writersHired +3.975; quality.script +2.225; overall +0.388; spent +1797.25 |
| endGuideMe | action | src/engine/mandates.ts | proven | end-guide-me (40 seeds) | writingPasses -3.175; quality.script -2.25; spent -3009.5 |
| approveTake | action | src/engine/mocap.ts | proven | approve-weak-take (20 seeds) | approvedTake -21.25; overall -0.275 |
| bookMocap | action | src/engine/mocap.ts | proven | book-body-only (20 seeds) | spent -4982.5; overall -0.475 |
| cancelMocapBooking | action | src/engine/mocap.ts | proven | cancel-mocap (40 seeds) | cancelled +2; cancellationFees +3000; spent +2174.5 |
| requestRetake | action | src/engine/mocap.ts | proven | mocap-retake (20 seeds) | retakes +2; takes +2; spent +6730.5 |
| considerComposer | action | src/engine/music-catalog.ts | proven | consider-composer (40 seeds) | realComposers +1.9; spent +2859.75; quality.music -3.037 |
| licenseRecording | action | src/engine/music-catalog.ts | proven | license-recording (40 seeds) | catalogSongs +2; licensed +2; spent +29042; money -90244.928 |
| agreeLicence | action | src/engine/music.ts | proven | license-song (40 seeds) | licensed +1.575; released +1.575; revenue +40439.375; spent +526.5 |
| declineQuote | action | src/engine/music.ts | proven | decline-quote (40 seeds) | licensed -1.55; released -1.55; revenue -37452.875; spent -287.5 |
| renewLicence | action | src/engine/music.ts | proven | renew-licence (40 seeds) | renewals +0.65; released +0.65; spent +32.5 |
| replaceWithLibrary | action | src/engine/music.ts | proven | library-track (40 seeds) | libraryTracks +2; released +2; revenue +129416.625; spent +6903.5 |
| requestLicence | action | src/engine/music.ts | proven | license-song (40 seeds) | licensed +1.575; released +1.575; revenue +40439.375; spent +526.5 |
| askForBetterTerms | action | src/engine/negotiation-actions.ts | proven | better-terms (40 seeds) | asked +1.55; investorShare -0.127; investorIn -7925; ownIn +7925 |
| acceptOpportunity | action | src/engine/opportunities.ts | proven | accept-opportunity (30 seeds) | proposalsAccepted +0.667; commissioned +0.667; commissionMoney +54613.333 |
| declineOpportunity | action | src/engine/opportunities.ts | proven | decline-opportunity (30 seeds) | proposalsAccepted -0.567; commissioned -0.567; commissionMoney -40533.333 |
| applyForPermit | action | src/engine/papers.ts | proven | work-permit (100 seeds) | permits +0.96; lateDays -3.42; spent +3968.6; quality.direction +3.385 |
| applyForRecordedPassport | action | src/engine/papers.ts | proven | recorded-passport (40 seeds) | passports +1; papersPaid +36.64 |
| applyForVisa | action | src/engine/papers.ts | proven | visitor-visa (30 seeds) | visas +0.933; attended +0.667; offers +1.067 |
| moveTo | action | src/engine/papers.ts | proven | move-home (40 seeds) | livesInLondon -1; frenchAccounts +2; bankFees +31.19; overall -0.675; quality.direction -1.5; money -682085.976 |
| addStage | action | src/engine/parts.ts | proven | add-stage (40 seeds) | stages +2; stageCast +2; performersCast +2; castRates +1578.75 |
| removeStage | action | src/engine/parts.ts | proven | remove-stage (40 seeds) | stages -2; stageCast -2; performersCast -2; castRates -1590.75 |
| putInOwnMoney | action | src/engine/personal.ts | proven | own-money-or-backer (40 seeds) | ownIn -70575; backerDeals +2; revenue -56160.525 |
| takeHome | action | src/engine/personal.ts | proven | take-money-home (40 seeds) | leftInProjects +142807.75; money -157308.349 |
| takeHomeAvailable | action | src/engine/personal.ts | not a feature |  | Reads how much may come home, inside the Take Home action, which is its own row. |
| applyDesignChange | action | src/engine/production.ts | proven | change-design-redo (20 seeds) | redone +10; daysToDeliver +59.6; spent +44287.5 |
| generatePlan | action | src/engine/production/schedule.ts | proven | plan-later (40 seeds) | firstShootDay +70; daysToDeliver +67.213 |
| keepWeatherPlan | action | src/engine/production/shoot.ts | proven | weather-keep (60 seeds) | lostDays -1.233; overall +0.167; daysToDeliver -1.833; spent -2962.667 |
| moveShootDay | action | src/engine/production/shoot.ts | proven | weather-move (60 seeds) | lostDays -2.083; daysToDeliver -1.625; spent -4526.667 |
| swapWithInteriorDay | action | src/engine/production/shoot.ts | proven | weather-swap (60 seeds) | lostDays -0.717; daysToDeliver -1.008; spent -2086.667 |
| setPlannedBudget | action | src/engine/project-budget.ts | proven | plan-budget (40 seeds) | target +81050; ownIn +11000; backerIn +70050; investorShare -0.03; revenue -19152.925; money -21578.895 |
| addNote | action | src/engine/projects.ts | proven | own-notes (40 seeds) | ownNotes +6; quality.script +6; overall +1.75 |
| approveDraft | action | src/engine/projects.ts | proven | second-project (40 seeds) | projects +2; approvedProjects +2; deliveredAll +1.725; money -45526.705; standing.producing +1.475; jobsDone +0.875 |
| assignEpisodeRole | action | src/engine/projects.ts | proven | episode-director (40 seeds) | directedByHire +1.8; quality.direction +3.85; overall +0.813; spent +6553.95 |
| createProject | action | src/engine/projects.ts | proven | second-project (40 seeds) | projects +2; approvedProjects +2; deliveredAll +1.725; money -45526.705; standing.producing +1.475; jobsDone +0.875 |
| noteFromIssue | action | src/engine/projects.ts | proven | revision-notes (40 seeds) | notesAddressed +6; quality.script +6; overall +1.863; reception +2.3 |
| renameDraft | action | src/engine/projects.ts | not a feature |  | Names a draft; the name is shown in the draft list and nothing else reads it, as a label shouldn't be. |
| setNoteStatus | action | src/engine/projects.ts | proven | revision-notes (40 seeds) | notesAddressed +6; quality.script +6; overall +1.863; reception +2.3 |
| startRevision | action | src/engine/projects.ts | proven | revision-notes (40 seeds) | notesAddressed +6; quality.script +6; overall +1.863; reception +2.3 |
| createFromSource | action | src/engine/proposal.ts | proven | create-from-source (40 seeds) | adapted +2; parts +2; castRates +1626.75; spent +81889.35; overall -0.837 |
| considerRecognised | action | src/engine/recognition-hire.ts | proven | hire-recognised (40 seeds) | recognisedHired +3.85; spent +26120; quality.craft -53.662; overall -52.35 |
| proposeLicence | action | src/engine/release-plan.ts | proven | licence-proposal (120 seeds) | licenceDeals +0.775; releaseDelay -12.933; gross +66845 |
| releaseYourself | action | src/engine/release-plan.ts | proven | self-release-stores (40 seeds) | revenue +39443.25; money +36491.8; spent +2600 |
| setReleasePlan | action | src/engine/release-plan.ts | proven | self-release-stores (40 seeds) | revenue +39443.25; money +36491.8; spent +2600 |
| approachAgent | action | src/engine/representation.ts | proven | agent (40 seeds) | viaAgent +7.1; jobsOffered +7.175; commission +3576.9; jobPay +21930.75 |
| declineMandate | action | src/engine/representation.ts | proven | agent-decline (40 seeds) | viaAgent -6.775; jobsOffered -6.725; jobPay -19432.15 |
| giveNotice | action | src/engine/representation.ts | proven | agent-notice (40 seeds) | viaAgent -5.425; jobsOffered -5.55; jobPay -20774.375; commission -3143 |
| renewMandate | action | src/engine/representation.ts | proven | agent-renew (40 seeds) | renewals +3; represented +1; viaAgent +14.075; jobsOffered +14.025; jobPay +69001.45; money +76658.298 |
| signWith | action | src/engine/representation.ts | proven | agent (40 seeds) | viaAgent +7.1; jobsOffered +7.175; commission +3576.9; jobPay +21930.75 |
| submitThrough | action | src/engine/representation.ts | proven | submit-through-agent (40 seeds) | submitted +1; dealCommission +5587.5 |
| rerecordLines | action | src/engine/revisions.ts | proven | rerecord-lines (20 seeds) | linesRerecorded +2; overall +0.475 |
| reviseAnimatic | action | src/engine/revisions.ts | proven | revise-animatic (20 seeds) | spent +1289.5; money -1289.5 |
| reviseEffects | action | src/engine/revisions.ts | proven | revise-effects (40 seeds) | effectsRevised +2.325; quality.direction +1.313; spent +11773; overall +0.25 |
| clearScreenTime | action | src/engine/screen-time.ts | proven | clear-screen-time (40 seeds) | screenRecords -12; screenEntries -1; screenDecided -1 |
| recordScreenTime | action | src/engine/screen-time.ts | proven | record-screen-time (40 seeds) | screenRecords +12; screenEntries +1; screenDecided +1 |
| moveEpisode | action | src/engine/season.ts | no downstream effect | move-episode (120 seeds) | moved: firstEpisodeDirected +1.833. Measure: the episode a hired director directs and cuts again, put first, both arms airing on the same days (120 careers, November 15, 2026): streaming hours +17,400 (interval -16,200 to +51,000), broadcast viewers -29,500 (interval -83,000 to +24,100). The order changes what each episode keeps of the audience before it (audiences.ts retention). Two things besides the order differ between the arms: a scene moved to another day meets that day's weather (as it would), and, once the arms differ at all, every later scene, hire and offer is numbered differently, and the game's draws are keyed by those numbers, so the second season is drawn afresh (seen career by career). A scene's takes no longer follow the date (takes.ts recordTakes, from November 15, 2026), which made the first season's footage match; the second season's still doesn't. Not a gap in the game; a proof would need draws keyed by something both arms share. |
| continueProject | action | src/engine/sequel.ts | proven | continue-project (40 seeds) | continued +1; buildDays -22; spent -10944; daysToDeliver -13.325 |
| resumeProject | action | src/engine/shelve.ts | proven | shelve-resume (60 seeds) | hiresReleased +16; deliveredDay +318.1; offersDeclined +342.8; castRates +169.333; revenue -100958; money -110849.216 |
| shelveProject | action | src/engine/shelve.ts | proven | shelve-resume (60 seeds) | hiresReleased +16; deliveredDay +318.1; offersDeclined +342.8; castRates +169.333; revenue -100958; money -110849.216 |
| attachSong | action | src/engine/song-actions.ts | proven | add-song (40 seeds) | songs +2; songUses +2; released -2; revenue -108758 |
| changeVersionSong | action | src/engine/song-actions.ts | proven | version-song (40 seeds) | songChanges +2; songTasks +4; spent +2031 |
| createSong | action | src/engine/song-actions.ts | proven | add-song (40 seeds) | songs +2; songUses +2; released -2; revenue -108758 |
| detachSong | action | src/engine/song-actions.ts | proven | detach-song (40 seeds) | songUses -2; released +2; revenue +116073.75 |
| playFirstOverEndCredits | action | src/engine/song-actions.ts | proven | song-first-over-credits (40 seeds) | songEntries +1; songDecided +1 |
| removeSong | action | src/engine/song-actions.ts | proven | remove-song (40 seeds) | songs -2; spent -4883; daysToDeliver -1.475 |
| restoreVersionSong | action | src/engine/song-actions.ts | proven | restore-version-song (40 seeds) | songChanges -2; songTasks -4; spent -2096 |
| setSongPerformers | action | src/engine/song-actions.ts | not a feature |  | Names who sings a song, shown in the credits as "Song Performed By" (songs.ts) and in a casting note; a name, read only where it is shown. |
| syncMusicTasks | action | src/engine/song-actions.ts | not a feature |  | Follows a song change with the work it now needs; the song changes are their own rows. |
| syncSongTasks | action | src/engine/song-actions.ts | not a feature |  | Follows a song change with the work it now needs; the song changes are their own rows. |
| addPlan | action | src/engine/state.ts | proven | plan-over-call (40 seeds) | lateDays +1; quality.direction -0.65; overall -0.262 |
| adoptPlace | action | src/engine/state.ts | not a feature |  | Makes a chosen place known to the world; the place field that chose it is the row. |
| cancelPlan | action | src/engine/state.ts | proven | cancel-plan (40 seeds) | lateDays -1; quality.direction +0.738; overall +0.263 |
| startSleep | action | src/engine/state.ts | proven | sleep-through-call (40 seeds) | lateDays +1; quality.direction -0.862; overall -0.3 |
| travelTo | action | src/engine/state.ts | proven | travel-away (40 seeds) | lateDays +3.9; quality.direction -2.125; overall -0.837 |
| chooseTake | action | src/engine/takes-actions.ts | proven | weakest-takes (40 seeds) | weakTakes +0.925; quality.direction -0.987; overall -0.375; reception -0.462 |
| setShotPlan | action | src/engine/takes-actions.ts | proven | full-coverage (40 seeds) | setups +6; shootDays +25.8; spent +87726; quality.direction +2.288; overall +1.138 |
| formatDateKey | action | src/engine/time.ts | not a feature |  | Formats a date inside a change; not a decision. |
| withdrawRelease | action | src/engine/unscripted.ts | proven | withdraw-release (120 seeds) | redactions +1.667; runtime -3.45 |
| addVersion | action | src/engine/versions.ts | proven | add-version (40 seeds) | versions +2; versionDays +1.875; spent +840 |
| removeVersion | action | src/engine/versions.ts | proven | remove-version (40 seeds) | versions -2; versionDays -1.975; spent -1224 |
| acceptWriting | action | src/engine/writing-jobs.ts | proven | writing-polish (40 seeds) | passesAccepted +1.925; quality.script +1.85; overall +0.375 |
| cancelWriting | action | src/engine/writing-jobs.ts | proven | writing-cancel (40 seeds) | passesAccepted -1.9; passesCancelled +1.925; quality.script -2.075; overall -0.525; spent -890.75 |
| commissionWriting | action | src/engine/writing-jobs.ts | proven | writing-polish (40 seeds) | passesAccepted +1.925; quality.script +1.85; overall +0.375 |
| requestRevision | action | src/engine/writing-jobs.ts | proven | writing-revision (240 seeds) | passesWritten +1.908; spent +951.083 |
| bank.add_standing_order | bank | src/engine/bankworld | proven | standing-order (40 seeds) | interestIn +11501.04; money +15293.934 |
| bank.arrange_overdraft | bank | src/engine/bankworld | proven | arrange-overdraft (40 seeds) | gearOwned +0.375; interestOut +5.542 |
| bank.borrow | bank | src/engine/bankworld | proven | bank-loan (60 seeds) | interestOut +1696.295; money +10061.81 |
| bank.break_term | bank | src/engine/bankworld | proven | break-term (40 seeds) | accounts -1; interestIn -41099.99; worth -41099.99 |
| bank.cancel_new | bank | src/engine/bankworld | proven | cancel-new (40 seeds) | accounts -1; bankFees -10.81; worth +10.81 |
| bank.cancel_scheduled | bank | src/engine/bankworld | proven | cancel-scheduled (40 seeds) | savingsHeld -1019127.17; interestIn -19127.17; worth -19127.17 |
| bank.cancel_standing_order | bank | src/engine/bankworld | proven | cancel-standing-order (40 seeds) | interestIn -8743.03; money -11626.37 |
| bank.cancel_switch | bank | src/engine/bankworld | proven | cancel-switch (40 seeds) | atFirstBank +18650241.343; interestIn -4302.46; worth -4875.18 |
| bank.claim_unclaimed | bank | src/engine/bankworld | proven | claim-unclaimed (40 seeds) | heldByState -10003.07; worth +10003.07 |
| bank.close_current | bank | src/engine/bankworld | proven | close-current (40 seeds) | accounts -1; bankFees -10.81; worth +8.71 |
| bank.close_savings | bank | src/engine/bankworld | proven | close-savings (40 seeds) | accounts -1; interestIn -19961; money -25455.788 |
| bank.debit_overdraft | bank | src/engine/bankworld | proven | debit-overdraft (40 seeds) | gearOwned +1; bankFees +34 |
| bank.new_number | bank | src/engine/bankworld | proven | new-number (40 seeds) | takenByNumber -671.69; fraudCarried -671.69 |
| bank.open_current | bank | src/engine/bankworld | proven | open-current (40 seeds) | accounts +1; bankFees +10.81; worth -10.81 |
| bank.open_savings | bank | src/engine/bankworld | proven | bank-savings (40 seeds) | accounts +1; interestIn +19961; money +26543.882 |
| bank.open_term | bank | src/engine/bankworld | proven | term-deposit (40 seeds) | accounts +1; interestIn +41099.99; worth +41099.99 |
| bank.pay_collections | bank | src/engine/bankworld | proven | pay-collections (40 seeds) | inCollections -119.75; wellsAccounts +0.475 |
| bank.reactivate | bank | src/engine/bankworld | proven | reactivate (40 seeds) | dormantAccounts -1; inSavings -5000 |
| bank.redirect_deposits | bank | src/engine/bankworld | proven | redirect-deposits (40 seeds) | savingsHeld +122167.668; interestIn +656.877; worth +656.877 |
| bank.repay_loan | bank | src/engine/bankworld | proven | repay-loan (40 seeds) | loansOwed -3186.357; interestOut -404.758; worth +362.344 |
| bank.schedule_payment | bank | src/engine/bankworld | proven | scheduled-payment (40 seeds) | interestIn +19127.17; money +25435.064 |
| bank.set_alerts | bank | src/engine/bankworld | proven | large-payment-alert (40 seeds) | fraudKnownAfter -9.442; fraudCarried +350; worth -350 |
| bank.set_loan_repayment | bank | src/engine/bankworld | proven | loan-repayment (40 seeds) | paidFromNatwest +2772.731; natwestHeld -2772.731; atFirstBank +4087.635 |
| bank.set_order_source | bank | src/engine/bankworld | proven | order-source (40 seeds) | paidFromNatwest +5000; natwestHeld -5000; atFirstBank +4962.21 |
| bank.set_payments | bank | src/engine/bankworld | proven | credit-card (40 seeds) | accounts +1; onCard +1; cardPaid +846.28 |
| bank.set_primary | bank | src/engine/bankworld | proven | set-primary (40 seeds) | primaryIsFirst -0.975; paidFromNatwest +4874.601; natwestHeld -4999.601 |
| bank.set_round_ups | bank | src/engine/bankworld | proven | round-ups (40 seeds) | savingsHeld +0.39; inCurrent -0.38; interestIn +0.01 |
| bank.set_term_end | bank | src/engine/bankworld | proven | term-end (30 seeds) | interestIn -58062.09; worth -16962.1 |
| bank.stop_balance_transfer | bank | src/engine/bankworld | proven | stop-balance-transfer (40 seeds) | atFirstBank +18564888.075; interestIn -4302.46; worth -7161.354 |
| bank.switch | bank | src/engine/bankworld | proven | switch-bank (40 seeds) | atFirstBank -2; interestIn +3052.17; worth +3624.89; money +4820.331 |
| bank.take_overrun_loan | bank | src/engine/bankworld | proven | overrun-loan (40 seeds) | loans +1; inCollections -12.12; lclOpen +1; worth -23.47 |
| bank.take_term_interest | bank | src/engine/bankworld | proven | term-interest (40 seeds) | termHeld -617.53; inCurrent +617.53 |
| bank.transfer | bank | src/engine/bankworld | proven | bank-savings (40 seeds) | accounts +1; interestIn +19961; money +26543.882 |
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
| card.set_autopay_from | bank | src/engine/bankworld | proven | autopay-from (40 seeds) | paidFromNatwest +849.995; natwestHeld -849.995; atFirstBank +849.995 |
| card.set_everyday | bank | src/engine/bankworld | proven | card-everyday (40 seeds) | onNatwestCard +1; cardBillsToNatwest +846.28 |
| card.set_over_limit | bank | src/engine/bankworld | proven | card-over-limit (40 seeds) | onCardAmount +50; cardPaid +50 |
| card.set_statement_day | bank | src/engine/bankworld | proven | card-statement-day (40 seeds) | statementDay +28; interestOut +9.84; cardPaid -3.16 |
| cash.deposit | bank | src/engine/bankworld | proven | cash-deposit (40 seeds) | cashHeld -500; atFirstBank +500 |
| cash.withdraw | bank | src/engine/bankworld | proven | cash-withdrawal (40 seeds) | withdrawn +250; paidInCash +250 |
| documents.apply_passport | bank | src/engine/bankworld | proven | bank-passport (40 seeds) | passports +1; worth -46.07; inCurrent -46.07 |
| finance.pay_card | bank | src/engine/bankworld | proven | card-pay-full (40 seeds) | cardPaid +144.64; interestOut -281.33; worth +281.33 |
| finance.set_autopay | bank | src/engine/bankworld | proven | card-autopay-minimum (40 seeds) | cardPaid -145.165; interestOut +282.351; worth -282.351 |
| agent-answer | scheduled | src/engine/representation.ts | proven | agent (40 seeds) | viaAgent +7.1; jobsOffered +7.175; commission +3576.9; jobPay +21930.75 |
| agent-notice-end | scheduled | src/engine/representation.ts | proven | agent-notice (40 seeds) | viaAgent -5.425; jobsOffered -5.55; jobPay -20774.375; commission -3143 |
| agent-offer-lapse | scheduled | src/engine/representation.ts | proven | off-agent-offer-lapse (40 seeds) | represented -1; viaAgent -40.675; jobsOffered -40.925 |
| agent-renewal | scheduled | src/engine/representation.ts | proven | agent-renew (40 seeds) | renewals +3; represented +1; viaAgent +14.075; jobsOffered +14.025; jobPay +69001.45; money +76658.298 |
| agent-term-end | scheduled | src/engine/representation.ts | proven | agent-renew (40 seeds) | renewals +3; represented +1; viaAgent +14.075; jobsOffered +14.025; jobPay +69001.45; money +76658.298 |
| arrive | scheduled | src/engine/state.ts | proven | travel-away (40 seeds) | lateDays +3.9; quality.direction -2.125; overall -0.837 |
| audience-week | scheduled | src/engine/distribution.ts | proven | off-audience-week (40 seeds) | renewalWait +61.575; renewed -0.275 |
| audition | scheduled | src/engine/auditions.ts | proven | audition (40 seeds) | readsSeen +14.875; castCapability +9.113; performance +7.656; overall +2.625; castRates +233.25 |
| birthday | scheduled | src/engine/state.ts | not a feature |  | A notice: it tells the player their age has changed. Age itself is read from the birth date wherever it matters (casting, licences), never from this event; switched off, nothing else changed (docs/v10/proof/off-birthday.json). |
| box-office-week | scheduled | src/engine/distribution.ts | proven | off-box-office-week (40 seeds) | gross +141455; revenue +43572.75; money +43671.3 |
| company-decision | scheduled | src/engine/company.ts | not a feature |  | Withdraws a company registration an older save had pending: companies left the game (v9 step 6), and nothing in a new story schedules it. |
| consent-response | scheduled | src/engine/documentary.ts | proven | off-consent-response (20 seeds) | delivered -1.35; revenue -53878.5; money -552410.78 |
| contributor-cut | scheduled | src/engine/documentary.ts | proven | off-contributor-cut (20 seeds) | delivered -1.1; revenue -44096; money -451364.449 |
| counter-lapse | scheduled | src/engine/hiring.ts | proven | off-counter-lapse (40 seeds) | countersTaken +3.675; castRates -26.75; hired +1.2 |
| distribution-offer | scheduled | src/engine/finish.ts | proven | off-distribution-offer (40 seeds) | distributed -1.8; revenue -121293.25; money -115686.7 |
| distribution-report | scheduled | src/engine/distribution.ts | proven | off-distribution-report (40 seeds) | revenue -83610.375; money -82893.575 |
| edition-announce | scheduled | src/engine/awards.ts | proven | off-edition-announce (40 seeds) | screenings -8.2; offers -7.125 |
| edition-deadline | scheduled | src/engine/awards.ts | proven | off-edition-deadline (40 seeds) | selected -4.525; standing.producing -5.925 |
| edition-deadline-soon | scheduled | src/engine/awards.ts | not a feature |  | A notice: it tells the player an entry deadline is near. The deadline that closes entries is its own system (edition-deadline), proven separately. |
| edition-open | scheduled | src/engine/awards.ts | proven | off-edition-open (40 seeds) | entries -39.475; selected -4.475 |
| edition-results | scheduled | src/engine/awards.ts | proven | off-edition-results (400 seeds) | finalised -8.677; won -0.087; standing.directing +0.275; backerBonus -0.004 |
| edition-start | scheduled | src/engine/awards.ts | proven | off-edition-start (40 seeds) | screenings -7.75; offers -6.825 |
| editions-roll | scheduled | src/engine/awards.ts | proven | off-editions-roll (40 seeds) | editionsOpen -63.725; entries -25.525; selected -2.8 |
| episode-release | scheduled | src/engine/episode-releases.ts | proven | off-episode-release (40 seeds) | episodesOut -0.175; audience -41825 |
| family-repayment | scheduled | src/engine/personal.ts | not a feature |  | Takes a month's repayment of a family loan chosen in an older save's creation: a new story starts with the inheritance and no family terms (personal.ts openPersonalMoney), so nothing in it schedules this. |
| finance-counter | scheduled | src/engine/negotiation.ts | proven | better-terms (40 seeds) | asked +1.55; investorShare -0.127; investorIn -7925; ownIn +7925 |
| finance-deadline | scheduled | src/engine/finance.ts | proven | off-finance-deadline (40 seeds) | breached -1; repaymentDue -60000 |
| finance-decision | scheduled | src/engine/finance.ts | proven | off-finance-decision (40 seeds) | backerIn -32325; ownIn +32325; money +15895.098 |
| finance-offer-lapse | scheduled | src/engine/negotiation.ts | proven | off-finance-offer-lapse (40 seeds) | studioIn -850000; ownIn +850000 |
| first-look-check | scheduled | src/engine/first-look.ts | proven | off-first-look-check (40 seeds) | firstLookOffers -1.1; overheadPaid -546140; money -543806.614 |
| first-look-counter | scheduled | src/engine/first-look.ts | proven | first-look-overhead (120 seeds) | overheadAsked +1.625; overheadAgreed +0.208; overheadPaid +67083.333; money +73621.837 |
| first-look-end | scheduled | src/engine/first-look.ts | proven | off-first-look-end (40 seeds) | firstLookEnded -1.275; overheadPaid -388725; money -398945.725 |
| first-look-lapse | scheduled | src/engine/first-look.ts | proven | off-first-look-lapse (40 seeds) | firstLookActive -0.875; overheadPaid -1209932.5; money -1186224.5 |
| first-look-overhead | scheduled | src/engine/first-look.ts | proven | first-look-accept (40 seeds) | firstLookActive +1.125; money +774512.989 |
| guide-me | scheduled | src/engine/mandates.ts | proven | off-guide-me (40 seeds) | writingPasses -3.325; quality.script -2.537; spent -2995.75 |
| industry-decision | scheduled | src/engine/industry.ts | not a feature |  | Renews or ends the real series the world follows, as the catalog's world pages show them (catalog/world.ts, simseason.ts); nothing in a player's career reads those outcomes. |
| job-counter | scheduled | src/engine/jobs.ts | proven | ask-better-rate (60 seeds) | ratesAgreed +7.5; jobPay +5937.867 |
| job-day | scheduled | src/engine/jobs.ts | proven | off-job-day (40 seeds) | jobsDone -0.875; jobPay -4753.1 |
| job-lapse | scheduled | src/engine/jobs.ts | not a feature |  | Record-keeping: on an unanswered offer's last day it marks the offer lapsed, for your list and the record. The deadline itself is enforced when you answer (jobs.ts acceptRefusal: "That offer has lapsed."), so with this event switched off an offer still can't be taken late; nothing else reads the mark (docs/v10/proof/off-job-lapse.json). |
| job-offer | scheduled | src/engine/jobs.ts | proven | off-job-offer (40 seeds) | jobsOffered -0.925; jobPay -4464.6 |
| licence-answer | scheduled | src/engine/music.ts | proven | license-song (40 seeds) | licensed +1.575; released +1.575; revenue +40439.375; spent +526.5 |
| licence-expiry | scheduled | src/engine/music.ts | proven | renew-licence (40 seeds) | renewals +0.65; released +0.65; spent +32.5 |
| offer-response | scheduled | src/engine/hiring.ts | proven | off-offer-response (40 seeds) | hired -16; delivered -2; revenue -123896.5 |
| opportunity | scheduled | src/engine/opportunities.ts | proven | off-opportunity (40 seeds) | opportunities -0.375; commissioned -0.375; money -3842.125 |
| opportunity-expire | scheduled | src/engine/opportunities.ts | not a feature |  | Record-keeping: on an unanswered proposal's last day it marks it lapsed, for your list. The deadline is enforced when you answer (opportunities.ts acceptOpportunity checks expiresAt), so with this event switched off a proposal still can't be taken late; nothing else reads the mark (docs/v10/proof/off-opportunity-expire.json). |
| papers-decision | scheduled | src/engine/papers.ts | proven | work-permit (100 seeds) | permits +0.96; lateDays -3.42; spent +3968.6; quality.direction +3.385 |
| papers-expiry | scheduled | src/engine/papers.ts | not a feature |  | Marks a visa or permit expired on its date and tells you to apply again. Whether it still lets you in or lets you work is read from its date wherever that matters (papers.ts entryRight, permitIn), so the stage it sets changes only the words. |
| papers-passport | scheduled | src/engine/papers.ts | proven | recorded-passport (40 seeds) | passports +1; papersPaid +36.64 |
| permit-decision | scheduled | src/engine/papers.ts | not a feature |  | Decides a work permit applied for before November 14, 2026, which older saves still hold (papers.ts "what older saves hold"); nothing in a new story schedules it, and permits now go through Your Papers (papers-decision). |
| plan-reminder | scheduled | src/engine/state.ts | not a feature |  | A reminder in the log before a plan starts; the plan itself is proven (plan-over-call, cancel-plan), and the reminder decides nothing. |
| plan-start | scheduled | src/engine/state.ts | proven | plan-over-call (40 seeds) | lateDays +1; quality.direction -0.65; overall -0.262 |
| production-confirm | scheduled | src/engine/productions.ts | proven | off-production-confirm (100 seeds) | productionsChanged -1.44; jobsCancelled -0.06 |
| production-release | scheduled | src/engine/productions.ts | proven | off-production-release (180 seeds) | productionResults -6.456; jobsOffered -0.1 |
| release | scheduled | src/engine/finish.ts | proven | off-release (40 seeds) | released -2; revenue -98227.625; money -97372.025 |
| release-licence-answer | scheduled | src/engine/release-plan.ts | proven | off-release-licence-answer (120 seeds) | licenceDeals -0.75; revenue -110617; money -101834.317 |
| revision-done | scheduled | src/engine/projects.ts | proven | revision-notes (40 seeds) | notesAddressed +6; quality.script +6; overall +1.863; reception +2.3 |
| screening | scheduled | src/engine/awards.ts | proven | attend-screening (30 seeds) | accepted +6.8; attended +5.433; offers +6.8; distributed -0.133 |
| screening-reminder | scheduled | src/engine/awards.ts | not a feature |  | A notice: it tells the player a screening they were invited to is near. Attending is the screening itself and the RSVP, proven separately. |
| season-decision | scheduled | src/engine/continuation.ts | proven | off-season-decision (100 seeds) | renewed -0.5; renewalFunding -19200; ownIn +19200 |
| shoot-call | scheduled | src/engine/production/shoot.ts | proven | off-shoot-call (40 seeds) | lateDays -1; quality.direction +0.55; overall +0.2 |
| shoot-wrap | scheduled | src/engine/production/shoot.ts | proven | off-shoot-wrap (40 seeds) | delivered -2; revenue -134715.75; money -157812.385 |
| stay-limit | scheduled | src/engine/papers.ts | proven | off-stay-limit (20 seeds) | overstays -1; usVisas -1; papersPaid -185; secondTripDays +30 |
| studio-release | scheduled | src/engine/finish.ts | proven | off-studio-release (40 seeds) | released -8.925; gross -1732155 |
| wake | scheduled | src/engine/state.ts | proven | off-wake (40 seeds) | lateDays +6.8; quality.direction -63.562; overall -58.762 |
| weather-check | scheduled | src/engine/production/shoot.ts | proven | off-weather-check (60 seeds) | lostDays +1.417; daysToDeliver +0.85; spent +3383.833 |
| work-day | scheduled | src/engine/production/workday.ts | proven | off-work-day (40 seeds) | delivered -1.975; revenue -128443.25; money -151278.315 |
| writing-day | scheduled | src/engine/writing-jobs.ts | proven | off-writing-day (40 seeds) | passesAccepted -1.875; quality.script -1.312 |
| "Working Title" | field | everywhere a project is named | carried | tests/proposal.test.ts::makes one project | A name or a record, carried to everywhere a project is named: it decides nothing by its nature. |
| "Format" | field | proposal.ts proposeFromSource; projects.ts, production/tasks.ts | proven | adapt-short (40 seeds) | scenes -6; spent -296998.55; daysToDeliver -77.512 |
| "Medium" | field | production/tasks.ts buildTasks | proven | adapt-animated (40 seeds) | shootDays -48.175; hired +8; spent +70158.8; delivered -2 |
| {medium === 'hybrid' ? 'Animation Technique For Animated Scenes' : 'Animation Technique'} | field | production/tasks.ts buildTasks | proven | adapt-animated (40 seeds) | shootDays -48.175; hired +8; spent +70158.8; delivered -2 |
| "Episodes" | field | proposal.ts (the season it proposes); projects.ts | proven | adapt-episodes (40 seeds) | scenes +12; spent +270581.3; shootDays +32.175 |
| {episodic ? 'Target Minutes Per Episode' : 'Target Runtime In Minutes'} | field | proposal.ts (cast and scene count); estimate.ts | proven | adapt-longer (40 seeds) | shootDays +16.525; spent +123093.3; daysToDeliver +30.663 |
| {`Name For ${c.name}`} | field | shown everywhere the brief names them: blueprints.ts named, applyBlueprint | carried | tests/proposal.test.ts::makes one project | A name or a record, carried to shown everywhere the brief names them: blueprints.ts named, applyBlueprint: it decides nothing by its nature. |
| "First Name" | field | shown as your legal name, on credits: identity.ts legalName; with the birth and start dates it seeds the world (state.ts newGame) | carried | tests/identity.test.ts::credits carry the legal name | A name or a record, carried to shown as your legal name, on credits: identity.ts legalName; with the birth and start dates it seeds the world (state.ts newGame): it decides nothing by its nature. |
| "Middle Name (Optional)" | field | shown as your legal name, on credits: identity.ts legalName; with the birth and start dates it seeds the world (state.ts newGame) | carried | tests/identity.test.ts::credits carry the legal name | A name or a record, carried to shown as your legal name, on credits: identity.ts legalName; with the birth and start dates it seeds the world (state.ts newGame): it decides nothing by its nature. |
| "Last Name" | field | shown as your legal name, on credits: identity.ts legalName; with the birth and start dates it seeds the world (state.ts newGame) | carried | tests/identity.test.ts::credits carry the legal name | A name or a record, carried to shown as your legal name, on credits: identity.ts legalName; with the birth and start dates it seeds the world (state.ts newGame): it decides nothing by its nature. |
| "Pronouns" | field | state.ts newGame (settledTitle) | proven | pronouns-she (40 seeds) | actressEntries +12; actorEntries -12 |
| "Month" | field | shown as your age and birthday: state.ts characterAge, observedBirthday; it dates the inheritance (personal.ts inheritanceDay) and seeds the world (state.ts newGame) | carried | tests/dates.test.ts::you are exactly 19 on the starting date | A name or a record, carried to shown as your age and birthday: state.ts characterAge, observedBirthday; it dates the inheritance (personal.ts inheritanceDay) and seeds the world (state.ts newGame): it decides nothing by its nature. |
| "Day" | field | shown as your age and birthday: state.ts characterAge, observedBirthday; it dates the inheritance (personal.ts inheritanceDay) and seeds the world (state.ts newGame) | carried | tests/dates.test.ts::you are exactly 19 on the starting date | A name or a record, carried to shown as your age and birthday: state.ts characterAge, observedBirthday; it dates the inheritance (personal.ts inheritanceDay) and seeds the world (state.ts newGame): it decides nothing by its nature. |
| "Year Of Birth" | field | shown as your age and birthday: state.ts characterAge, observedBirthday; it dates the inheritance (personal.ts inheritanceDay) and seeds the world (state.ts newGame) | carried | tests/dates.test.ts::you are exactly 19 on the starting date | A name or a record, carried to shown as your age and birthday: state.ts characterAge, observedBirthday; it dates the inheritance (personal.ts inheritanceDay) and seeds the world (state.ts newGame): it decides nothing by its nature. |
| "Place Of Birth" | field | identity.ts citizenshipOf -> awards.ts nationality rules | proven | born-in-paris (40 seeds) | efaEntries +2.85; decided +2.925; entries +2.725 |
| "Where You Live" | field | state.ts newGame; projects.ts createProject (base) | proven | base-los-angeles (40 seeds) | lostDays -1.225; daysToDeliver -2.1 |
| "Starting Date" | field | state.ts newGame | proven | start-2040 (40 seeds) | year +14; money +273779.535 |
| "Starting Time" | field | state.ts newGame | proven | start-evening (40 seeds) | daysToDeliver -0.887; breached -1.375; repaymentDue -27500; money +104884.25 |
| "Amount (US Dollars)" | field | personal.ts openInheritance, personalBalance, putInRefusal; cash/money.ts parseAmount | proven | small-inheritance (40 seeds) | ownIn -60675; delivered -2 |
| "Describe Your Ethnicity" | field | shown with your ethnicities: identity.ts splitBackgrounds | carried | e2e/creation.spec.ts::an ethnicity in your own words | A name or a record, carried to shown with your ethnicities: identity.ts splitBackgrounds: it decides nothing by its nature. |
| {o.name} | field | projects.ts createProject -> schedule.observances; schedule.ts isWorkingDay | proven | observances-kept (40 seeds) | daysToDeliver +4.6; breached +0.7; repaymentDue +14000; money -60029.549 |
| {`${languageName(l.code)} Proficiency`} | field | production/language.ts personLanguagesFit; casting-notes.ts fitNotes | proven | french-basic (40 seeds) | hired +2; spent +2126.5 |
| {`Hire The Rental House's Package On A Day The Kit Can't Serve (${money(housePackageFee(p))} A Day)`} | field | production/shoot.ts (a day the kit cannot serve); equipment.ts setPackageApproval | proven | package-approval (40 seeds) | kitPostponed -729; lostDays -727.425; daysToDeliver +33.638; delivered +2; spent +50703.5 |
| "Film It In" | field | destinations.ts dayPlace, awayCosts, permitWork; production/shoot.ts runShootDay; production/schedule.ts scheduleShootDay | proven | filmed-abroad (40 seeds) | filmedAway +6; spent +23025.6; daysToDeliver +10.613 |
| "Kind Of Site" | field | destinations.ts kindFee, permitWork, underCover, noisyDay | proven | site-station (40 seeds) | daysToDeliver +11.5; ownIn +5392.75; spent +10626.2; money -37052.278 |
| "Version" | field | shown where the version is entered: versions.ts addVersion (named and unique) | carried | tests/versions.test.ts::a version is conformed from the locked cut | A name or a record, carried to shown where the version is entered: versions.ts addVersion (named and unique): it decides nothing by its nature. |
| {sceneLabel(p, s)} | field | versions.ts versionScenes | proven | add-version (40 seeds) | versions +2; versionDays +1.875; spent +840 |
| {`${g.label}: ${g.reason}`} | field | edit-actions.ts requestPickups | proven | pickup-scenes (40 seeds) | shootDays +4.925; spent +15131; daysToDeliver +3.475 |
| "Route" | field | finish.ts planRelease; awards.ts qualifying | proven | release-route (40 seeds) | entries +31.025; entryFees +1972.25 |
| "Release Date" | field | finish.ts planRelease; awards.ts qualifying windows | proven | release-date (40 seeds) | releaseDelay +166; entries +1.025; decided +0.95; entryFees +39 |
| "Territory Code" | field | awards.ts; finish.ts | proven | release-in-us (40 seeds) | entries -2.875; entryFees -549.75; selected -0.625 |
| "Which Cut" | field | finish.ts planRelease; music.ts releaseSongs, releaseLicenceRefusal | proven | which-cut (40 seeds) | released +1.4; usEntries +4.95; entries -26.475; decided -21.975 |
| "Episode Schedule" | field | episode-releases.ts presetDates; finish.ts planRelease | proven | schedule-weekly (40 seeds) | emmyYears -1; decided -1; emmyEntries -1 |
| "Episodes On The Premiere" | field | episode-releases.ts presetDates | proven | premiere-count (40 seeds) | emmyYears -1; decided -1.025; emmyEntries -1 |
| {`Episode ${i + 2}`} | field | episode-releases.ts episodeDateProblem; awards-rules.ts airing; awards.ts ruledReleaseFits | proven | episode-date (40 seeds) | emmyYears -1; decided -1.025; emmyEntries -1 |
| {`New Date For Episode ${e.number}`} | field | episode-releases.ts setEpisodeDates; release-schedule.ts scheduleChangeEffects | proven | episode-dates (40 seeds) | episodesMoved +2.675; renewalWait +29.4 |
| "Project" | field | awards.ts checkEligibility | proven | enter-awards (40 seeds) | entries +42.05; selected +5.125 |
| "Episode To Enter" | field | awards-actions.ts submitEntry; finish.ts assessEpisode | proven | episode-entry (40 seeds) | enteredEpisode +4.25; episodeScore +4.878; selected +0.7 |
| "Song To Enter" | field | awards-rules.ts songProblems | proven | song-to-enter (40 seeds) | songEntries +1; songDecided +1 |
| "Version To Enter" | field | awards-actions.ts entrySnapshot | proven | version-entry (40 seeds) | entries +29.7; decided +21.225; entryFees +1136; selected +3.7 |
| {performerLabel(c)} | field | awards-actions.ts submitEntry | proven | performer-entry (30 seeds) | leadRecipients -2.867; leadScore -5.094 |
| {`What To Capture For ${name}`} | field | mocap.ts bookMocap, sessionCost | proven | book-body-only (20 seeds) | spent -4982.5; overall -0.475 |
| {`Version In ${r.territories.map(countryName).join(', ')}`} | field | finish.ts setReleaseVersion, the release handler; distribution.ts territoriesReached, reportedGross | proven | release-dubbed (60 seeds) | dubbed +0.933; spent +4542.333 |
| "Development Money From The Deal" | field | first-look.ts drawDevelopment, developmentRefusal, repayTurnaround | proven | draw-development (40 seeds) | developmentIn +48300; ownIn -48300 |
| {s.label} | field | shown in the idea's words: brief.ts fill | carried | tests/brief.test.ts::writes the player's names where the idea has slots, and its suggestions where they left them blank | A name or a record, carried to shown in the idea's words: brief.ts fill: it decides nothing by its nature. |
| {c.name} | field | brief.ts applyIdea | proven | idea-characters (40 seeds) | ownIn +9650; daysToDeliver +5.863; spent +10056.25 |
| {`Scene ${i + 1} | field | brief.ts applyIdea | proven | idea-scenes (40 seeds) | spent +42510.5; ownIn +19150; daysToDeliver +6.713 |
| {`${b.intExt === 'EXT' ? 'Exterior' : 'Interior'} | field | brief.ts applyIdea; projects.ts addScene | proven | idea-beat (40 seeds) | shootDays +1.325; spent +11228.95; daysToDeliver +3.088 |
| {`Keep My ${o.label}`} | field | brief.ts applyIdea | proven | idea-keep-tone (40 seeds) | chamber +2; spent +10473.5 |
| "When It Starts" | field | shown as the logline it builds: src/ideas/loglines.ts compose; brief.ts applyIdea | carried | tests/ideas.test.ts::refuses parts that don't go together, and parts that aren't there | A name or a record, carried to shown as the logline it builds: src/ideas/loglines.ts compose; brief.ts applyIdea: it decides nothing by its nature. |
| "Who It Happens To" | field | shown as the logline it builds: src/ideas/loglines.ts compose; brief.ts applyIdea | carried | tests/ideas.test.ts::refuses parts that don't go together, and parts that aren't there | A name or a record, carried to shown as the logline it builds: src/ideas/loglines.ts compose; brief.ts applyIdea: it decides nothing by its nature. |
| "What They Must Do" | field | shown as the logline it builds: src/ideas/loglines.ts compose; brief.ts applyIdea | carried | tests/ideas.test.ts::refuses parts that don't go together, and parts that aren't there | A name or a record, carried to shown as the logline it builds: src/ideas/loglines.ts compose; brief.ts applyIdea: it decides nothing by its nature. |
| "What It Costs" | field | shown as the logline it builds: src/ideas/loglines.ts compose; brief.ts applyIdea | carried | tests/ideas.test.ts::refuses parts that don't go together, and parts that aren't there | A name or a record, carried to shown as the logline it builds: src/ideas/loglines.ts compose; brief.ts applyIdea: it decides nothing by its nature. |
| "Find A Composer, Artist Or Recording" | field | music-catalog.ts searchMusic | not a feature |  | A search of the music catalog: it narrows who and what is listed (tests/music-catalog.test.ts::finds people by name and role), as the role filter beside it does. Licensing a recording or considering a composer found is the decision, proven by license-recording and consider-composer. |
| "Their Role" | field | music-catalog.ts searchMusic | not a feature |  | A filter of the music catalog: it narrows who is listed (tests/music-catalog.test.ts::finds people by name and role). Choosing someone listed is the decision, and those are their own rows. |
| "Music Spending Ceiling" | field | mandates.ts guideMePlan, runMandate, guideMeRefusal | proven | music-ceiling (40 seeds) | guideMeHires -2; quality.music -61.812; delivered -2 |
| "Let The Composer's Themes Stand Without My Review" | field | cues.ts onThemesDone, themesGate; production/workday.ts | proven | themes-stand (40 seeds) | themesApproved +2; delivered +2; released +2 |
| "What Music It Has" | field | cues.ts proposeCues, scoreMinutes; production/tasks.ts (post:music, post:score-session) | proven | music-silence (40 seeds) | cues -4; spent -5323.25; daysToDeliver -2.087; quality.music -58.487 |
| "The Score's Sound" | field | craft.ts SCORES, scoreSessions; production/tasks.ts | proven | score-sound-chamber (40 seeds) | chamber +2; spent +11611.5; daysToDeliver +2.238 |
| "How Much Of It Is Scored" | field | cues.ts proposeCues, scoreMinutes; production/tasks.ts post:music | proven | score-density (40 seeds) | scoredSeconds +2574; spent +20726.95; daysToDeliver +16.087 |
| "Let The Composer's Themes Stand Without My Review" | field | cues.ts onThemesDone, themesGate; production/workday.ts | proven | themes-stand (40 seeds) | themesApproved +2; delivered +2; released +2 |
| {`Intensity Of ${c.code}`} | field | cues.ts judgeScore | proven | cue-loud (40 seeds) | highUnderTalk +8; quality.music -8 |
| {LICENCE_MEDIUM_LABELS[m]} | field | music.ts holderFee, releaseLicenceRefusal | proven | licence-media (40 seeds) | licenceFees +4408.5; spent +4535.55; money -111869.807 |
| "The Whole World" | field | music.ts holderFee, licence-answer (refusal odds, counteroffer), releaseLicenceRefusal | proven | licence-world (40 seeds) | licenceFees +4904.5; spent +7834.25 |
| "Countries, By Two-Letter Code" | field | music.ts holderFee, releaseLicenceRefusal | proven | licence-countries (40 seeds) | licenceFees +2600; spent +1550; money -1550 |
| "For How Long" | field | music.ts holderFee, agreeLicence (expiry), licence-expiry | proven | licence-years (40 seeds) | licenceYears +3; released +0.8; spent +30 |
| "Your Notes On The Themes" | field | cues.ts giveThemeNotes, themeTasks; song-actions.ts syncMusicTasks | proven | theme-notes (40 seeds) | themeRounds +4; quality.music +4; spent +2520.5; daysToDeliver +3.6 |
| "Treat As An Adult In This Story" | field | guests.ts canApproach -> hiring.ts makeOffer, casting-calls.ts inviteRefusal | proven | treat-as-adult (40 seeds) | realCast +1.85; castCapability -7.812; performance -6.612; castRates +322.75 |
| "Consider Them For" | field | guests.ts considerFor -> hiring.ts candidatesFor | proven | consider-real (40 seeds) | realCast +1.725; castCapability -3.525; performance -2.662; castRates +556 |
| "Title" | field | the calendar, reminders | carried | tests/foundation.test.ts::Advance stops at a reminder | A name or a record, carried to the calendar, reminders: it decides nothing by its nature. |
| "Start Time" | field | state.ts addPlan | proven | plan-over-call (40 seeds) | lateDays +1; quality.direction -0.65; overall -0.262 |
| "Length In Minutes" | field | production/schedule.ts planShootDays (your commitments) | proven | plan-over-call (40 seeds) | lateDays +1; quality.direction -0.65; overall -0.262 |
| "Reminder" | field | state.ts addPlan (plan-reminder event) | not a feature |  | When a plan's reminder comes: a notice, as its event is (scheduled:plan-reminder above). A plan you sleep through is marked missed, and nothing reads a missed plan. |
| {`Day Rate For ${c.name}`} | field | hiring.ts resolveOffer | proven | offered-rate (40 seeds) | castRates -209.1; spent -1084.475; countersSeen +0.75 |
| "What To Call It" | field | shown as the stage's name: parts.ts partName: the Cast page, call sheets, offers, credits | carried | tests/parts.test.ts::is cast on its own | A name or a record, carried to shown as the stage's name: parts.ts partName: the Cast page, call sheets, offers, credits: it decides nothing by its nature. |
| "Age In These Scenes (Optional)" | field | minors.ts minorFor (an uncast stage) | proven | stage-age-child (40 seeds) | hired +4; spent +4281.75; daysToDeliver +5.638 |
| {`Episode ${e}`} | field | parts.ts stageIn, partScenes; hiring.ts estimateDays | proven | stage-episode (40 seeds) | stageDays +2; mainDays -2 |
| {sceneLabel(p, s)} | field | parts.ts stageIn, castIn; production/shoot.ts; callsheet.ts; finish.ts | proven | add-stage (40 seeds) | stages +2; stageCast +2; performersCast +2; castRates +1578.75 |
| {`Read ${who.name} With`} | field | auditions.ts pairChemistry | proven | chemistry-read (40 seeds) | chemistryRead +3.675; castChemistry +5.85; performance -0.969; overall -0.35 |
| {`Writer For Episode ${e.number}`} | field | finish.ts assessEpisode | proven | episode-writer (40 seeds) | episodesByHire -2.925; writingWorks +0.375; writingCraft +12.025 |
| "Writer" | field | projects.ts assignEpisodeRole; finish.ts computeCredits, assessQuality | proven | film-writer (40 seeds) | writtenByHire -1.9; writingWorks +1.9; writingCraft +46.15 |
| {`Director For Episode ${e.number}`} | field | finish.ts assessEpisode; production/schedule.ts blocks | proven | episode-director (40 seeds) | directedByHire +1.8; quality.direction +3.85; overall +0.813; spent +6553.95 |
| "Director" | field | production/shoot.ts onSetHires; finish.ts computeCredits, assessQuality | proven | film-director (40 seeds) | directedByHire +1.85; quality.direction +7.625; overall +1.513; standing.directing -5.025 |
| "Production Start" | field | production/schedule.ts generatePlan | proven | plan-later (40 seeds) | firstShootDay +70; daysToDeliver +67.213 |
| "Rehearsal Days" | field | production/shoot.ts; hiring.ts (booked days) | proven | rehearsal-days (120 seeds) | performance +5.1; overall +1.313; daysToDeliver +7.45 |
| "Stop-Motion Stages" | field | production/workday.ts | proven | stopmotion-stages (40 seeds) | daysToDeliver +42.638; spent -7357.85; money -19945.916 |
| "Render Nodes" | field | production/workday.ts | proven | render-nodes (40 seeds) | daysToDeliver +56.088; spent -1163; money -13298.524 |
| "Six-Day Weeks" | field | production/schedule.ts isWorkingDay | proven | six-day-weeks (60 seeds) | daysToDeliver -3.608; spent +4788.833 |
| "Shoot Episodes In Blocks" | field | production/schedule.ts | proven | shoot-in-blocks (40 seeds) | shootDays -4.45; spent -10217.05; daysToDeliver -3.462 |
| "Work On Public Holidays" | field | production/schedule.ts isWorkingDay | proven | work-holidays (40 seeds) | daysToDeliver -7.325; spent +4084.75 |
| {`${c.name} Puppet Copies`} | field | production/schedule.ts; production/workday.ts | proven | puppet-copies (40 seeds) | spent +30622.6; money +49969.433; daysToDeliver +21.338 |
| {`Emphasis For ${sceneLabel(p, s)}`} | field | takes.ts; directing.ts | proven | emphasis-performances (40 seeds) | spent +189818.4; shootDays +33.675; money -186928.585 |
| {`Camera For ${sceneLabel(p, s)}`} | field | craft.ts craftTime, craftRoles, rigDayCost, takeSpread; takes.ts planTime, recordTakes | proven | camera-moving (40 seeds) | spent +3133.75; ownIn +1975; overall -0.4 |
| {`Coverage For ${sceneLabel(p, s)}`} | field | takes.ts requiredSetups; production/shoot.ts | proven | full-coverage (40 seeds) | setups +6; shootDays +25.8; spent +87726; quality.direction +2.288; overall +1.138 |
| {`Takes For ${sceneLabel(p, s)}`} | field | takes.ts setupTime | proven | full-coverage (40 seeds) | setups +6; shootDays +25.8; spent +87726; quality.direction +2.288; overall +1.138 |
| {`Site For ${place}`} | field | locations.ts | proven | stage-sets (40 seeds) | onStage +6; lostDays -1.5; daysToDeliver -2.212 |
| {`Backup For ${place}`} | field | locations.ts | proven | site-backup (40 seeds) | lostDays -1.275; shootDays -1.275 |
| "New Planned Budget (US Dollars)" | field | project-budget.ts setPlannedBudget, readiness | proven | new-planned-budget (40 seeds) | ownIn +5945.5; hired +12.075; delivered +1.75; lostDays -672.125; revenue +123966.375 |
| "Why" | field | PlanViews.tsx Plan Revisions | carried | tests/v8-budget.test.ts::keeps 20,000 and 2,000,000 exactly | A name or a record, carried to PlanViews.tsx Plan Revisions: it decides nothing by its nature. |
| "Change Financing Target" | field | finance.ts financeSummary, decide | proven | finance-target (40 seeds) | backerIn +38025; leftInProjects +32358.25 |
| {`Ask The ${d.backer} For`} | field | negotiation.ts | proven | better-terms (40 seeds) | asked +1.55; investorShare -0.127; investorIn -7925; ownIn +7925 |
| "Spending Ceiling" | field | mandates.ts guideMePlan, runMandate, guideMeRefusal | proven | guide-me-writing (40 seeds) | writersHired +3.975; quality.script +2.225; overall +0.388; spent +1797.25 |
| "Working Title" | field | everywhere a project is named | carried | e2e/title-input.spec.ts::a title typed, edited, cleared, pasted and submitted | A name or a record, carried to everywhere a project is named: it decides nothing by its nature. |
| "Format" | field | projects.ts, production/tasks.ts, awards.ts | proven | format-feature (120 seeds) | revenue -4222.292; money -4024.983 |
| "Medium" | field | production/tasks.ts buildTasks | proven | medium-animation (40 seeds) | shootDays -7.75; daysToDeliver -33.862; spent +286681.5; money -602426.901; revenue -130479.375 |
| {medium === 'hybrid' ? 'Animation Technique For Animated Scenes' : 'Animation Technique'} | field | production/tasks.ts buildTasks | proven | technique-stop-motion (40 seeds) | hired +6; daysToDeliver +35.575; spent +54357.55 |
| "Animation Finish" | field | production/workday.ts (render hours per frame); estimate.ts | proven | animation-finish (40 seeds) | spent +182895.5; daysToDeliver -233.175; quality.craft -59.55; money -440367.71 |
| "Episodes" | field | projects.ts; production/tasks.ts | proven | episodes-three (40 seeds) | shootDays +5.15; spent +23045.3; daysToDeliver +9.55 |
| {episodic ? 'Target Minutes Per Episode' : 'Target Runtime In Minutes'} | field | awards.ts checkEligibility (running time); estimate.ts | proven | runtime-longer (40 seeds) | quality.script -1; overall -0.325; reception -0.325; revenue -1459.25 |
| ? | field | genres.ts composeGenres; script-effects.ts competesAs; finish.ts subtitlingCost | proven | genre-comedy (120 seeds) | reception -0.175; overall -0.262; gross -2701.667; standing.writing -1; revenue -1975.458; money -1851.891 |
| "Intended Audience" | field | awards-rules.ts; script-explain.ts audienceContentNote | proven | audience-family (40 seeds) | entries +3.025; entryFees +180 |
| "Tone" | field | cues.ts proposeBrief | proven | tone (40 seeds) | chamber +2; spent +7925.75; cues -2 |
| "Competes As" | field | script-effects.ts competesAs | proven | competes-comedy (40 seeds) | comedyEntries +3; selected +0.175 |
| "Story Era" | field | projects.ts deriveRequirements (period research); production/tasks.ts costumes | proven | story-era (40 seeds) | spent +8449.5; hired +2; ownIn +10775 |
| ? | field | finish.ts subtitlingCost; awards.ts language rules | proven | dialogue-french (40 seeds) | hired +2; spent +16423.35 |
| "Story Setting Place" | field | projects.ts deriveRequirements; production/tasks.ts | proven | setting-abroad (40 seeds) | spent +2279.5; hired +2; ownIn +3175 |
| "Production Base" | field | production/schedule.ts isWorkingDay; weather.ts | proven | base-los-angeles (40 seeds) | lostDays -1.225; daysToDeliver -2.1 |
| "Planned Budget (US Dollars)" | field | project-budget.ts setPlannedBudget, budgetPicture, plannedText; finance.ts financeSummary | proven | plan-budget (40 seeds) | target +81050; ownIn +11000; backerIn +70050; investorShare -0.03; revenue -19152.925; money -21578.895 |
| "Years That Pass In The Story" | field | sequel.ts continueProject | proven | story-years (40 seeds) | hired -2.025; daysToDeliver -3.637 |
| {PLAN_ROUTES[r].label} | field | release-plan.ts setReleasePlan, proposalRefusal, selfRefusal; finish.ts festivalHold | proven | self-release-stores (40 seeds) | revenue +39443.25; money +36491.8; spent +2600 |
| "Plan Territories" | field | release-plan.ts buyerValue, proposeLicence, selfCosts, releaseYourself | proven | plan-territories (40 seeds) | revenue +28824.25; money +28824.25 |
| "First Public Date" | field | release-plan.ts leadDays, releaseYourself (planRelease date) | proven | first-public-date (40 seeds) | revenue -20233.5; money -21422.6 |
| "Held For Festivals Until" | field | finish.ts festivalHold in planRelease and acceptDistribution | proven | festival-hold (40 seeds) | distributed -1.825; revenue -134538.625; money -129101.175 |
| "Version Abroad" | field | release-plan.ts releaseYourself (finish.ts setReleaseVersion) | proven | version-dubbed (40 seeds) | spent +2765; money +4544.049; revenue +6695.5 |
| "Promotion Budget" | field | release-plan.ts selfCosts; distribution.ts promoLift in reportedGross | proven | promotion-budget (40 seeds) | spent +5995; revenue +8526 |
| {`${label}: Buyer`} | field | release-plan.ts proposeLicence, answerProposal | proven | licence-proposal (120 seeds) | licenceDeals +0.775; releaseDelay -12.933; gross +66845 |
| {`${label}: Your Ask`} | field | release-plan.ts answerProposal | proven | licence-ask (100 seeds) | licenceDeals -0.84; releaseDelay +29.705; licenceFee -15020 |
| {`${label}: Exclusive`} | field | release-plan.ts buyerValue; distribution.ts heldTerritories | proven | licence-exclusive (100 seeds) | licenceFee +9750; money -9340.43 |
| {`Keep My ${c.label}`} | field | blueprints.ts applyBlueprint | proven | keep-year (40 seeds) | periodFilms +2; spent +62711.15; daysToDeliver +12.513 |
| {`Keep My ${c.label} And Add None`} | field | blueprints.ts applyBlueprint | proven | keep-characters (40 seeds) | parts -10; castRates -8653; spent -128003.25 |
| "Save Name" | field | the saved games list | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to the saved games list: it decides nothing by its nature. |
| "Wake Me For Obligations" | field | state.ts runEvents | proven | no-wake-for-obligations (40 seeds) | lateDays +1; quality.direction -0.562; overall -0.15 |
| "The Light It Is Shot In" | field | craft.ts craftTime, gafferNeeded, cameraTestDays, postFactors; takes.ts planTime; hiring.ts neededRoles; production/tasks.ts buildTasks | proven | light-contrast (120 seeds) | spent +3348.583; money -2861.516 |
| "The Score" | field | craft.ts postFactors, scoreSessions; production/tasks.ts buildTasks | proven | score-chamber (40 seeds) | spent +11719.25; ownIn +11975; daysToDeliver +3.15 |
| {SOUNDS[k].label} | field | craft.ts craftTime, craftRoles, postFactors, dialogueHolds; production/tasks.ts buildTasks; production/shoot.ts needsDialogueReplacement | proven | sound-clarity (40 seeds) | hired +2; spent +11840.75; ownIn +10275 |
| "Central Question" | field | script-effects.ts documentsNeeded | proven | question-missing (20 seeds) | grantsAsked -2; grantIn -66000; ownIn +90000 |
| "Central Question" | field | shown in the Story panel; part of the Statement Of Intent for a documentary | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the Story panel; part of the Statement Of Intent for a documentary: it decides nothing by its nature. |
| "Synopsis" | field | shown in the Story panel | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the Story panel: it decides nothing by its nature. |
| "Logline" | field | script-effects.ts documentsNeeded | proven | logline-missing (40 seeds) | backerDeals -1; ownIn +38250; money -89641.026 |
| "Premise" | field | script-effects.ts documentsNeeded | proven | premise-missing (40 seeds) | backerDeals -1; ownIn +39400; money -75850.427 |
| "Stakes" | field | script-effects.ts documentsNeeded | proven | stakes-missing (40 seeds) | grantsAsked -2; grantIn -36300; ownIn +36300 |
| "Central Conflict" | field | script-effects.ts documentsNeeded | proven | conflict-missing (40 seeds) | grantsAsked -2; grantIn -27250; ownIn +27250 |
| "Point Of View" | field | script-effects.ts documentsNeeded | proven | viewpoint-missing (40 seeds) | grantsAsked -2; grantIn -33325; ownIn +33325 |
| "Theme" | field | script-effects.ts documentsNeeded | proven | theme-missing (40 seeds) | grantsAsked -2; grantIn -43400; ownIn +43400 |
| "Intended Ending" | field | script-effects.ts documentsNeeded | proven | ending-missing (40 seeds) | grantsAsked -2; grantIn -30250; ownIn +30250 |
| "Intended Experience" | field | cues.ts proposeBrief | proven | intended-experience (40 seeds) | silent +2; cues -4; spent -6082.75; daysToDeliver -2.737; quality.music -61.025 |
| "Who It Is For" | field | shown in the Story panel | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the Story panel: it decides nothing by its nature. |
| "How It Is Built" | field | shown in the Story panel | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the Story panel: it decides nothing by its nature. |
| "Tone" | field | cues.ts proposeBrief | proven | tone (40 seeds) | chamber +2; spent +7925.75; cues -2 |
| "Competes As" | field | script-effects.ts competesAs | proven | competes-comedy (40 seeds) | comedyEntries +3; selected +0.175 |
| "Source Material" | field | awards-rules.ts (original or adapted screenplay) | proven | source-adapted (40 seeds) | adaptedEntries +9; entries -3.125 |
| "Adapted From" | field | shown with the project | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the project: it decides nothing by its nature. |
| "When It Is Set" | field | awards-rules.ts requirementProblems | proven | set-in-period (40 seeds) | periodEntries +5.2; entries +1.75 |
| "Year It Is Set In" | field | looks.ts periodBand, projectBand; projects.ts deriveRequirements; production/tasks.ts buildTasks | proven | story-year (40 seeds) | spent +8404.75; daysToDeliver +1.913 |
| "The Look It Borrows" | field | the Creative Brief card | carried | tests/looks.test.ts::1986 made in 2026 is a period: research, and half as much costume work again; 2026 is neither; the look it borrows changes no work | A name or a record, carried to the Creative Brief card: it decides nothing by its nature. |
| "Story Setting Place" | field | projects.ts deriveRequirements | proven | setting-abroad (40 seeds) | spent +2279.5; hired +2; ownIn +3175 |
| "Story Setting" | field | shown in the Story panel | carried | tests/script-effects.test.ts::briefs add no work | A name or a record, carried to shown in the Story panel: it decides nothing by its nature. |
| {x.label} | field | awards-rules.ts PROJECT_SUBJECTS | proven | subject-civil-rights (40 seeds) | entries +3.1; decided +2.1 |
| {q.label} | field | shown with the genre questions | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the genre questions: it decides nothing by its nature. |
| "Draft Name" | field | drafts list | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to drafts list: it decides nothing by its nature. |
| "Draft Name" | field | drafts list | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to drafts list: it decides nothing by its nature. |
| {`"${x.title}" In This Scene`} | field | songs.ts songUses; projects.ts deriveRequirements | proven | add-song (40 seeds) | songs +2; songUses +2; released -2; revenue -108758 |
| "Interior Or Exterior" | field | production/shoot.ts (weather) | proven | scene-exterior (40 seeds) | lostDays +1.3; shootDays +1.075; money -24686.529 |
| "Place" | field | production/schedule.ts groupShootDays | proven | scenes-one-place (40 seeds) | shootDays -3.625; spent -18975.25; ownIn -800 |
| "Time Of Day" | field | production/rates.ts dayFees | proven | scene-night (120 seeds) | wagesPaid +1545.417; overall +0.321 |
| "Estimated Minutes" | field | production/schedule.ts sceneLoad; finish.ts runtime | proven | scene-minutes (40 seeds) | runtime +22; spent +12275.15; daysToDeliver +7.15; offered +92250; guarantees +42250; money -24397.932 |
| "Kind" | field | projects.ts deriveRequirements (interview, archival) | proven | scene-archival (40 seeds) | shootDays -2.95; hired +2; spent -4396.75 |
| "Basis" | field | projects.ts scriptIssues (sourced needs a fact) | proven | scene-dramatized (40 seeds) | researchItems -2; spent -639 |
| "Technique For This Scene" | field | projects.ts sceneTechnique; production/tasks.ts | proven | scene-technique (40 seeds) | taskKinds +3.975; spent +39979.75; daysToDeliver +52.763 |
| "Act" | field | shown as advice: structure.ts structureNotes | carried | tests/structure.test.ts::group scenes; an empty act is noted | A name or a record, carried to shown as advice: structure.ts structureNotes: it decides nothing by its nature. |
| "Tonal Intention" | field | shown as advice: projects.ts scriptIssues (tonal genres note a missing one) | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown as advice: projects.ts scriptIssues (tonal genres note a missing one): it decides nothing by its nature. |
| "Who Is Recording" | field | shown as advice: projects.ts scriptIssues (found footage) | carried | tests/genres.test.ts::module consumers change the right downstream state | A name or a record, carried to shown as advice: projects.ts scriptIssues (found footage): it decides nothing by its nature. |
| {c.name} | field | projects.ts deriveRequirements; hiring.ts estimateDays | proven | friend-out-of-cafe (40 seeds) | spent -1937.5; ownIn -350 |
| {`${c.name}'s Look In This Scene`} | field | looks.ts stateIn, statesUsed, costumeCopies, changeMinutes, makeupShare | proven | scene-look (40 seeds) | spent +17552.5; ownIn +18825 |
| {c.name} | field | projects.ts deriveRequirements (interviews, consent) | proven | scene-contributor (40 seeds) | interviews +2; blurDays +1.05; spent -3946.7 |
| {e.claim.slice(0, 50)} | field | projects.ts scriptIssues | proven | claim-linked (40 seeds) | researchItems -2; quality.script +1.8; overall +0.538 |
| "Objective" | field | shown as advice: projects.ts scriptIssues (advisory note when empty) | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown as advice: projects.ts scriptIssues (advisory note when empty): it decides nothing by its nature. |
| {nonfiction ? 'What Happens' : 'Action'} | field | shown on the scene | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown on the scene: it decides nothing by its nature. |
| "Turning Point" | field | shown on the scene | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown on the scene: it decides nothing by its nature. |
| "Essential To The Story" | field | finish.ts (cutting it costs the edit); cost-cuts.ts | proven | scene-essential (40 seeds) | quality.editing -8; overall -0.787; reception -0.65 |
| "Props" | field | projects.ts deriveRequirements; production/tasks.ts | proven | scene-props (40 seeds) | spent +11541.5; daysToDeliver +4.575 |
| "Animals" | field | projects.ts deriveRequirements; production/tasks.ts | proven | scene-animals (40 seeds) | spent +3337; daysToDeliver +1.475 |
| "Vehicles" | field | projects.ts deriveRequirements; production/tasks.ts | proven | scene-vehicles (40 seeds) | spent +3041; daysToDeliver +1.263 |
| "Stunts" | field | projects.ts deriveRequirements; production/tasks.ts | proven | scene-stunts (40 seeds) | spent +67808.5; money -38503.131; daysToDeliver +8.663 |
| "Crowd Size" | field | production/rates.ts (crowd day rate) | proven | scene-crowd (60 seeds) | spent +40499.333; money -29330.116 |
| "Crowd Makeup" | field | looks.ts chairMinutes, makeupDayCost; production/shoot.ts runShootDay | proven | crowd-makeup (40 seeds) | spent +42977.25; ownIn +42400 |
| "Extend The Crowd In Post" | field | looks.ts physicalCrowd, digitalCrowd; production/tasks.ts buildTasks; production/schedule.ts sceneLoad | proven | crowd-digital (40 seeds) | spent -16692; daysToDeliver +7.025 |
| "Visual Effects" | field | projects.ts deriveRequirements; production/tasks.ts | proven | scene-vfx (40 seeds) | spent +44389.75; daysToDeliver +13.775 |
| "Dance" | field | projects.ts deriveRequirements | proven | scene-dance (40 seeds) | spent +11169.25; daysToDeliver +2.988 |
| "Intimate Scene" | field | projects.ts deriveRequirements | proven | scene-intimacy (40 seeds) | spent +2120.75; hired +2; ownIn +575 |
| "Water Work" | field | projects.ts deriveRequirements | proven | scene-water (40 seeds) | spent +3256.5; hired +2; ownIn +675 |
| "Intentional Discontinuity" | field | projects.ts scriptIssues | proven | intentional-discontinuity (40 seeds) | friendDays -2; spent -1304; ownIn -825 |
| "Speaker" | field | projects.ts scriptIssues; finish.ts | proven | dialogue-two-speakers (40 seeds) | singles +4; daysToDeliver +2.825 |
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
| "Planted In" | field | script-effects.ts; finish.ts edit consequences | proven | setup-planted (40 seeds) | quality.script +11.013; overall +3.413; reception +3.575 |
| "Pays Off In" | field | script-effects.ts; finish.ts edit consequences | proven | setup-paid-off (40 seeds) | quality.script +11; overall +3.363; reception +3.713 |
| "What Is Set Up" | field | shown with the setup | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the setup: it decides nothing by its nature. |
| "Kind" | field | projects.ts deriveRequirements (clue props) | proven | setup-clue (40 seeds) | quality.script +1; spent +3457.25; overall -0.25 |
| "First Character" | field | shown as a preview: season.ts sharedFactImpact | carried | tests/episodes.test.ts::a relationship touches every scene its two characters share | A name or a record, carried to shown as a preview: season.ts sharedFactImpact: it decides nothing by its nature. |
| "Second Character" | field | shown as a preview: season.ts sharedFactImpact | carried | tests/episodes.test.ts::a relationship touches every scene its two characters share | A name or a record, carried to shown as a preview: season.ts sharedFactImpact: it decides nothing by its nature. |
| "Relationship" | field | shown in the season plan | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the season plan: it decides nothing by its nature. |
| "Where It Starts" | field | shown in the season plan | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the season plan: it decides nothing by its nature. |
| "Where It Ends" | field | shown in the season plan | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the season plan: it decides nothing by its nature. |
| "Relationship" | field | shown in the season plan | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the season plan: it decides nothing by its nature. |
| "Where It Starts" | field | shown in the season plan | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the season plan: it decides nothing by its nature. |
| "Where It Ends" | field | shown in the season plan | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown in the season plan: it decides nothing by its nature. |
| "Claim" | field | projects.ts deriveRequirements (fact-check) | proven | claim-added (40 seeds) | claimsChecked +2; researchItems +2; spent +3623.9 |
| "Status" | field | projects.ts deriveRequirements | proven | claim-dramatized (40 seeds) | claimsChecked -2; hired -2.025 |
| "Source Note" | field | shown with the fact | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the fact: it decides nothing by its nature. |
| "Contributor Name" | field | credits, consent | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to credits, consent: it decides nothing by its nature. |
| "Who They Are" | field | shown with the contributor | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the contributor: it decides nothing by its nature. |
| "What It Is About" | field | shown as advice: documentary.ts proposeDocumentaryPlan (the research questions it writes) | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown as advice: documentary.ts proposeDocumentaryPlan (the research questions it writes): it decides nothing by its nature. |
| "Kind Of Subject" | field | shown as advice: documentary.ts proposeDocumentaryPlan (the research questions and who to approach) | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown as advice: documentary.ts proposeDocumentaryPlan (the research questions and who to approach): it decides nothing by its nature. |
| "Note" | field | projects.ts addNote, finish.ts assessQuality | proven | own-notes (40 seeds) | ownNotes +6; quality.script +6; overall +1.75 |
| "Area" | field | projects.ts addNote | proven | own-notes (40 seeds) | ownNotes +6; quality.script +6; overall +1.75 |
| "About" | field | projects.ts addNote | proven | own-notes (40 seeds) | ownNotes +6; quality.script +6; overall +1.75 |
| "Character Name" | field | everywhere a part is named | carried | tests/scenes.test.ts::renaming changes the name everywhere it is shown | A name or a record, carried to everywhere a part is named: it decides nothing by its nature. |
| "Give Their Scenes, Lines And Relationships To" | field | projects.ts archiveCharacter | proven | archive-reassign (40 seeds) | NeighbourDays +4; spent +1854.5; ownIn +1100 |
| "Scene" | field | shown as advice: structure.ts beatsIn | carried | tests/structure.test.ts::a beat goes only in a scene the character is in | A name or a record, carried to shown as advice: structure.ts beatsIn: it decides nothing by its nature. |
| "What Changes" | field | shown as advice: structure.ts | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown as advice: structure.ts: it decides nothing by its nature. |
| "New Character's Name" | field | shown as the new character's name: projects.ts splitCharacter | carried | tests/characters.test.ts::a new character takes the chosen scenes | A name or a record, carried to shown as the new character's name: projects.ts splitCharacter: it decides nothing by its nature. |
| {sceneLabel(p, s)} | field | projects.ts splitCharacter | proven | split-scenes (40 seeds) | OlderDays +2; olderInCut +2; LeadDays -2 |
| "Name" | field | everywhere a part is named | carried | tests/scenes.test.ts::renaming changes the name everywhere it is shown | A name or a record, carried to everywhere a part is named: it decides nothing by its nature. |
| "Role Size" | field | script-effects.ts castPlacement; hiring.ts | proven | lead-role-size (30 seeds) | leadEntries -3.033; actingDecided -3.033 |
| "Entity" | field | projects.ts deriveRequirements; production/shoot.ts | proven | lead-entity (40 seeds) | spent +17060; hired +2; ownIn +15250 |
| "Realized As" | field | projects.ts deriveRequirements; production/shoot.ts | proven | lead-puppet (120 seeds) | spent +16324.667; money +18906.729; daysToDeliver +1.804 |
| "Puppet Face" | field | production/tasks.ts (sm:faces, sm:armature, sm:animation); rates.ts FACE_METHODS | proven | puppet-face (40 seeds) | spent +16329.7; ownIn +18150; daysToDeliver +20.9 |
| "Also Called" | field | shown with the part in casting | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the part in casting: it decides nothing by its nature. |
| "Pronouns" | field | shown in casting: script-explain.ts characterPronouns | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown in casting: script-explain.ts characterPronouns: it decides nothing by its nature. |
| "Speaks" | field | production/language.ts personLanguagesFit | proven | lead-speaks (40 seeds) | spent +2315.5; hired +2 |
| "Awards Placement" | field | script-effects.ts castPlacement | proven | award-placement (30 seeds) | leadEntries -2.833; actingDecided -2.833 |
| "Series Involvement" | field | hiring.ts estimateDays; finish.ts computeCredits | proven | series-regular (40 seeds) | guideDays +6; ownIn +4225 |
| {title(f)} | field | awards-rules.ts isNarrator; hiring.ts estimateDays | proven | lead-narrator (40 seeds) | spent +1521; daysToDeliver +1.6; ownIn +1350 |
| {title(m)} | field | hiring.ts; production | proven | method-capture (40 seeds) | hired +2; castRates +1577.5; daysToDeliver -25.187 |
| "What Kind Of Being" | field | shown to design and casting | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown to design and casting: it decides nothing by its nature. |
| "Description" | field | shown as advice: script-explain.ts breakdownComplete | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown as advice: script-explain.ts breakdownComplete: it decides nothing by its nature. |
| "Wants" | field | shown as advice: script-explain.ts breakdownComplete | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown as advice: script-explain.ts breakdownComplete: it decides nothing by its nature. |
| "Fears" | field | shown as advice: script-explain.ts breakdownComplete | carried | tests/advice-carried.test.ts::reach the advice they are written for, and are scored by nothing | A name or a record, carried to shown as advice: script-explain.ts breakdownComplete: it decides nothing by its nature. |
| "Why They Want It" | field | shown with the part | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the part: it decides nothing by its nature. |
| "What Stands In The Way" | field | shown with the part | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the part: it decides nothing by its nature. |
| "What In Them Pulls Against It" | field | shown with the part | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the part: it decides nothing by its nature. |
| "How They Change" | field | shown with the part | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the part: it decides nothing by its nature. |
| "How They Speak" | field | shown with the part | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to shown with the part: it decides nothing by its nature. |
| "Makeup" | field | looks.ts makeupShare, makeupDayCost; production/tasks.ts buildTasks; production/schedule.ts groupShootDays; production/shoot.ts runShootDay; callsheet.ts callSheet; hiring.ts neededRoles | proven | lead-makeup (40 seeds) | spent +22427.5; money -39626.942 |
| "Costume From" | field | looks.ts costumeCopies, wardrobeMismatch; production/tasks.ts buildTasks | proven | lead-costume (40 seeds) | spent +8336.25; daysToDeliver +5 |
| "Appearance States" | field | looks.ts statesOf, costumeCopies; production/tasks.ts buildTasks | proven | lead-states (40 seeds) | spent +26653.25; money -46980.689; daysToDeliver +20.038 |
| {`Names Of ${c.name}'s Looks`} | field | looks.ts statesOf, stateNames; brief.ts setLook | proven | looks-named (40 seeds) | spent +18516.5; ownIn +18950; daysToDeliver +12.763 |
| "Format Family" | field | unscripted.ts unscriptedIssues, decideCompetition; awards-rules.ts requirementProblems | proven | format-competition (40 seeds) | results +6; leftNotes +6 |
| {c.name} | field | unscripted.ts decideCompetition | proven | contestants (40 seeds) | presence +8.185; overall +1.038; reception +1.325 |
| "Leave Each Episode" | field | unscripted.ts decideCompetition | proven | leave-each (40 seeds) | eliminatedEarly +4; leftNotes +6 |
| {`Add Ethnicity For ${who}`} | field | shown in casting: hiring.ts sharedHeritages | carried | tests/heritage.test.ts::a performer from the pool | A name or a record, carried to shown in casting: hiring.ts sharedHeritages: it decides nothing by its nature. |
| {`Add Nationality For ${who}`} | field | shown in casting: hiring.ts | carried | tests/identity.test.ts::a version 6 save | A name or a record, carried to shown in casting: hiring.ts: it decides nothing by its nature. |
| {i.label} | field | script-explain.ts; finish.ts outlet requirements | proven | content-strong (40 seeds) | lateSlots +0.475; viewers -79775 |
| "Age In Story" | field | story-age.ts storyAge; casting-notes.ts fitNotes; minors.ts minorFor | proven | lead-child (40 seeds) | spent +8344.25; daysToDeliver +8.25 |
| "Up To" | field | story-age.ts storyAge; casting-notes.ts fitNotes | proven | age-range (40 seeds) | hired -2.9; daysToDeliver -5.05; spent -8225.5 |
| "Advance To" | field | state.ts processUntil | not a feature |  | How far to let the clock run. Time passing is the engine every proof plays a career through; what happens by a date is each system's own row, and Advance stopping for a plan or a call is tested (tests/foundation.test.ts::Advance stops at a reminder). |
| "Date" | field | state.ts processUntil | not a feature |  | How far to let the clock run. Time passing is the engine every proof plays a career through; what happens by a date is each system's own row, and Advance stopping for a plan or a call is tested (tests/foundation.test.ts::Advance stops at a reminder). |
| "Time" | field | state.ts processUntil | not a feature |  | How far to let the clock run. Time passing is the engine every proof plays a career through; what happens by a date is each system's own row, and Advance stopping for a plan or a call is tested (tests/foundation.test.ts::Advance stops at a reminder). |
| "Wake Up" | field | state.ts startSleep | proven | wake-early (40 seeds) | lateDays -1; quality.direction +1.338; overall +0.363 |
| "Set Wake Time" | field | state.ts startSleep | proven | sleep-through-call (40 seeds) | lateDays +1; quality.direction -0.862; overall -0.3 |
| "Hours Of Sleep" | field | state.ts startSleep | proven | sleep-through-call (40 seeds) | lateDays +1; quality.direction -0.862; overall -0.3 |
| "Set An Alarm" | field | state.ts snooze | proven | sleep-through-call (40 seeds) | lateDays +1; quality.direction -0.862; overall -0.3 |
| {`Replacement Place ${i + 1}`} | field | save.ts repairSave | not a feature |  | A repair of a save whose places can't be found: it puts a place where the save had one (tests/migration.test.ts::open after a repair that keeps a backup and changes only the places). Where you live, the decision a place makes, is proven by base-los-angeles. |
| "Song Title" | field | everywhere a song is named | carried | tests/carried-text.test.ts::kept through a save exactly as written | A name or a record, carried to everywhere a song is named: it decides nothing by its nature. |
| "Where It Comes From" | field | songs.ts songTasks; awards-rules.ts songProblems | proven | song-commissioned (40 seeds) | hired +2; spent +5128 |
| "Lyrics" | field | songs.ts songTasks | proven | song-lyricist (40 seeds) | hired +2; spent +2191.75; daysToDeliver -2.237 |
| "Music By" | field | songs.ts songCredits; awards recipients | not a feature |  | Names typed for a song that existed before the film, carried to its credits (songs.ts songCredits). An award for an original song takes only one written for the project (awards-rules.ts writtenForProject), so these names never decide an entry; who writes a song made for the film is its own row (Where It Comes From, Lyrics). |
| "Lyrics By" | field | songs.ts songCredits; awards recipients | not a feature |  | Names typed for a song that existed before the film, carried to its credits (songs.ts songCredits). An award for an original song takes only one written for the project (awards-rules.ts writtenForProject), so these names never decide an entry; who writes a song made for the film is its own row (Where It Comes From, Lyrics). |
| "Rights Holder" | field | shown with the song | carried | e2e/journey-e.spec.ts::refused with a reason, then recovered | A name or a record, carried to shown with the song: it decides nothing by its nature. |
| {`Scene For ${s.title}`} | field | songs.ts songUses | proven | add-song (40 seeds) | songs +2; songUses +2; released -2; revenue -108758 |
| "How It Plays" | field | awards-rules.ts songRuleProblem | proven | song-opening-titles (40 seeds) | licenceFees +4637; spent +3537; money -3537 |
| "Minutes It Plays" | field | awards-rules.ts songRuleProblem | proven | song-minutes (40 seeds) | licenceFees +19050; spent +12750 |
| {`${c.name} Performs ${s.title}`} | field | credits: songs.ts songCredits (Song Performed By), and the casting notes: casting-notes.ts fitNotes | carried | tests/songs.test.ts::played to delivery: writers are whoever wrote | A name or a record, carried to credits: songs.ts songCredits (Song Performed By), and the casting notes: casting-notes.ts fitNotes: it decides nothing by its nature. |
| {`${v.label}: ${sceneLabel(p, sc)}, In Place Of "${song.title}"`} | field | song-actions.ts changeVersionSong | proven | version-song (40 seeds) | songChanges +2; songTasks +4; spent +2031 |
| {`${c.name} On Screen (Minutes)`} | field | screen-time.ts shareCheck | proven | record-screen-time (40 seeds) | screenRecords +12; screenEntries +1; screenDecided +1 |
| {`${c.name} Heard Only (Minutes)`} | field | screen-time.ts screenTotal | proven | heard-only (40 seeds) | screenEntries -1; screenDecided -1 |
| "Title For The New Project" | field | shown as the project's title: opportunities.ts acceptOpportunity | carried | tests/opportunities.test.ts::accepted, starts a project funded by the commission | A name or a record, carried to shown as the project's title: opportunities.ts acceptOpportunity: it decides nothing by its nature. |
| {`What ${name}'s Revision Should Look At`} | field | writing-jobs.ts revisionAims | proven | revision-focus (40 seeds) | passRead +6.925; quality.script +0.7; overall +0.15 |
| {`Your Note To ${name} (Optional)`} | field | WritingWork.tsx JobLine | carried | tests/writing-jobs.test.ts::the brief and the notes are kept as written and change nothing | A name or a record, carried to WritingWork.tsx JobLine: it decides nothing by its nature. |
| {`Ask ${name} For`} | field | writing-jobs.ts writingTerms, acceptedRead | proven | writing-rewrite (40 seeds) | writingDays +1.925; quality.script +1.563; standing.writing +0.575; overall +0.438 |
| {`Episode For ${name}`} | field | writing-jobs.ts writingTerms, acceptedRead | proven | writer-episode (40 seeds) | writingDays +5.675; writerPaid +3448; minutesByHire +34.35 |
| {`Your Brief For ${name} (Optional)`} | field | WritingWork.tsx JobLine | carried | tests/writing-jobs.test.ts::the brief and the notes are kept as written and change nothing | A name or a record, carried to WritingWork.tsx JobLine: it decides nothing by its nature. |
| "Put In From Your Own Money" | field | personal.ts putInOwnMoney, putInRefusal | proven | own-money-or-backer (40 seeds) | ownIn -70575; backerDeals +2; revenue -56160.525 |
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
| id="od-limit" | field | systems/lending.ts bank.arrange_overdraft, overdraftOffer | proven | arrange-overdraft (40 seeds) | gearOwned +0.375; interestOut +5.542 |
| id="od-per-use" | field | systems/lending.ts bank.arrange_overdraft, chargeForItem | proven | field-od-per-use (80 seeds) | bankFees -57.187; worth +56.691 |
| id={`term-amount${account ? `-${bank.id}` : ''}`} | field | systems/lending.ts bank.open_term | proven | term-deposit (40 seeds) | accounts +1; interestIn +41099.99; worth +41099.99 |
| id="collections-pay" | field | systems/lending.ts bank.pay_collections | proven | pay-collections (40 seeds) | inCollections -119.75; wellsAccounts +0.475 |
| id="loan-repay-from" | field | systems/lending.ts bank.set_loan_repayment, repaymentAccount | proven | loan-repayment (40 seeds) | paidFromNatwest +2772.731; natwestHeld -2772.731; atFirstBank +4087.635 |
| id="loan-amount" | field | systems/lending.ts bank.borrow, loanOffer | proven | bank-loan (60 seeds) | interestOut +1696.295; money +10061.81 |
| id="loan-months" | field | systems/lending.ts bank.borrow, loanOffer | proven | bank-loan (60 seeds) | interestOut +1696.295; money +10061.81 |
| id="loan-purpose" | field | systems/lending.ts loanOffer (notFor) | proven | field-loan-purpose (80 seeds) | loansOwed -2283.114; interestOut -474.442; worth +474.442 |
| id="loan-into" | field | systems/lending.ts bank.borrow | proven | field-loan-into (80 seeds) | natwestHeld +6250; atFirstBank -6250 |
| id="loan-repay" | field | systems/lending.ts bank.borrow, repaymentAccount | proven | field-loan-repay (80 seeds) | paidFromNatwest +3010.627; natwestHeld -3010.627; atFirstBank +4535.595 |
| id="switch-partial" | field | systems/lending.ts bank.switch, completeSwitch | proven | field-switch-partial (40 seeds) | accounts +1; atFirstBank +18564925.225; interestIn -4302.46 |
| id="switch-to" | field | systems/lending.ts bank.switch, completeSwitch | proven | field-switch-to (40 seeds) | natwestHeld +18661771.892; interestIn +3900.98 |
| id="switch-on" | field | systems/lending.ts bank.switch | proven | field-switch-on (40 seeds) | daysSinceSwitch -109; interestIn -3733.88 |
| id={`close-into-${a.id}`} | field | systems/bankmoves.ts bank.close_current | proven | field-close-into (40 seeds) | savingsHeld +5095.63; interestIn +95.63 |
| id={`order-from-${o.id}`} | field | systems/bankmoves.ts bank.set_order_source, orderSource | proven | order-source (40 seeds) | paidFromNatwest +5000; natwestHeld -5000; atFirstBank +4962.21 |
| id={`autopay-from-${c.id}`} | field | systems/bankmoves.ts card.set_autopay_from, autopaySource | proven | autopay-from (40 seeds) | paidFromNatwest +849.995; natwestHeld -849.995; atFirstBank +849.995 |
| id="open-at" | field | systems/bankmoves.ts bank.open_current, openRefusal | proven | field-open-at (40 seeds) | bankFees +17.26; worth -17.26 |
| id="open-from" | field | systems/bankmoves.ts bank.open_current | proven | field-open-from (40 seeds) | savingsHeld -10199.33; interestIn -199.33 |
| id="open-amount" | field | systems/bankmoves.ts bank.open_current | proven | field-open-amount (40 seeds) | natwestHeld +99000; atFirstBank -99000 |
| id="pay-everyday" | field | systems/payments.ts bank.set_payments; systems/spending.ts | proven | credit-card (40 seeds) | accounts +1; onCard +1; cardPaid +846.28 |
| id="so-amount" | field | systems/payments.ts bank.add_standing_order | proven | standing-order (40 seeds) | interestIn +11501.04; money +15293.934 |
| id="so-day" | field | systems/payments.ts bank.add_standing_order | proven | field-so-day (40 seeds) | savingsHeld +105.97; interestIn +105.97 |
| id="so-to" | field | systems/payments.ts bank.add_standing_order | proven | field-so-to (40 seeds) | natwestHeld +1214381.76; interestIn +2880.72 |
| id="sp-from" | field | systems/payments.ts bank.schedule_payment | proven | field-sp-from (40 seeds) | savingsHeld -101907.16; interestIn -1907.16 |
| id="sp-to" | field | systems/payments.ts bank.schedule_payment | proven | field-sp-to (40 seeds) | savingsHeld +101907.16; interestIn +1907.16 |
| id="sp-amount" | field | systems/payments.ts bank.schedule_payment | proven | scheduled-payment (40 seeds) | interestIn +19127.17; money +25435.064 |
| id="sp-date" | field | systems/payments.ts bank.schedule_payment | proven | scheduled-payment (40 seeds) | interestIn +19127.17; money +25435.064 |
| aria-label="Why" | field | systems/security.ts card.report | proven | field-why (40 seeds) | bankFees -5; worth +5 |
| id="alert-low" | field | systems/statements.ts bank.set_alerts; systems/obligations.ts accountAlerts | proven | field-alert-low (40 seeds) | fraudKnownAfter -6.767; fraudCarried +350; worth -350 |
| id="alert-large" | field | systems/statements.ts bank.set_alerts | proven | large-payment-alert (40 seeds) | fraudKnownAfter -9.442; fraudCarried +350; worth -350 |
| aria-label={label} | field | systems/accountlife.ts bank.set_round_ups, roundUpRefusal | proven | field-roundup-multiplier (40 seeds) | savingsHeld +0.07; interestIn +0.07 |
| aria-label="Each Purchase" | field | systems/accountlife.ts bank.set_round_ups | proven | field-roundup-amount (40 seeds) | savingsHeld +20.813; inCurrent -20.812 |
| aria-label="Minimum Balance" | field | systems/accountlife.ts bank.set_round_ups | proven | field-roundup-minimum (40 seeds) | savingsHeld -0.04; inCurrent +0.04 |
| id="move-from" | field | systems/banking.ts bank.transfer | proven | field-move-from (40 seeds) | savingsHeld -101990.54; interestIn -1990.54 |
| id="move-to" | field | systems/banking.ts bank.transfer | proven | field-move-to (40 seeds) | savingsHeld +101990.54; interestIn +1990.54 |
| id="move-amount" | field | systems/banking.ts bank.transfer | proven | bank-savings (40 seeds) | accounts +1; interestIn +19961; money +26543.882 |
| id="lender" | field | systems/lending.ts bank.borrow, loanOffer | proven | field-lender (80 seeds) | natwestHeld -382.591; interestOut +8.101; worth -8.1 |
