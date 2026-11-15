// The inputs a proof varies (docs/input-audit/CONTROLS.csv), named on that proof: a field is proven by the played-career
// result of the decision it is the input of. Each is here only where the proof's decision changes that field: the place
// you live is base-los-angeles's, a plan's start and length plan-over-call's, coverage and takes full-coverage's, and so
// on. A field no proof varies stays unproven until one does (from November 15, 2026).
export const FIELD_PROOFS: Record<string, string[]> = {
  'enter-awards': ['field:FinishViews.tsx#"Project"#2'],
  'stage-sets': ['field:PlanViews.tsx#{`Site For ${place}`}#1'],
  'add-song': ["field:WorkViews.tsx#{`Scene For ${s.title}`}#1", "field:ScriptViews.tsx#{`\"${x.title}\" In This Scene`}#1"],
  'add-stage': ["field:PlanViews.tsx#{sceneLabel(p, s)}#1"],
  'add-version': ["field:FinishViews.tsx#{sceneLabel(p, s)}#1"],
  'base-los-angeles': ["field:Creation.tsx#\"Where You Live\"#1"],
  'better-terms': ["field:PlanViews.tsx#{`Ask The ${d.backer} For`}#1"],
  'book-body-only': ["field:FinishViews.tsx#{`What To Capture For ${name}`}#1"],
  'consider-real': ["field:PersonWork.tsx#\"Consider Them For\"#1"],
  'draw-development': ["field:FirstLook.tsx#\"Development Money From The Deal\"#1"],
  'episode-dates': ["field:FinishViews.tsx#{`New Date For Episode ${e.number}`}#1"],
  'episode-director': ["field:PlanViews.tsx#{`Director For Episode ${e.number}`}#1"],
  'filmed-abroad': ["field:FilmedAt.tsx#\"Film It In\"#1"],
  'full-coverage': ["field:PlanViews.tsx#{`Coverage For ${sceneLabel(p, s)}`}#1", "field:PlanViews.tsx#{`Takes For ${sceneLabel(p, s)}`}#1"],
  'guide-me-writing': ["field:PlanViews.tsx#\"Spending Ceiling\"#1"],
  'offered-rate': ["field:PlanViews.tsx#{`Day Rate For ${c.name}`}#1"],
  'own-money-or-backer': ["field:YourMoney.tsx#\"Put In From Your Own Money\"#1"],
  'package-approval': ["field:Equipment.tsx#{`Hire The Rental House's Package On A Day The Kit Can't Serve (${money(housePackageFee(p))} A Day)`}#1"],
  'plan-budget': ["field:Projects.tsx#\"Planned Budget (US Dollars)\"#1"],
  'plan-later': ["field:PlanViews.tsx#\"Production Start\"#1"],
  'plan-over-call': ["field:Places.tsx#\"Start Time\"#1", "field:Places.tsx#\"Length In Minutes\"#1"],
  'record-screen-time': ["field:WorkViews.tsx#{`${c.name} On Screen (Minutes)`}#1"],
  'sleep-through-call': ["field:Shell.tsx#\"Set Wake Time\"#1", "field:Shell.tsx#\"Set An Alarm\"#1", "field:Shell.tsx#\"Hours Of Sleep\"#1"],
  'themes-stand': ["field:MusicTab.tsx#\"Let The Composer's Themes Stand Without My Review\"#1"],
  'theme-notes': ["field:MusicTab.tsx#\"Your Notes On The Themes\"#1"],
  'treat-as-adult': ["field:PersonWork.tsx#\"Treat As An Adult In This Story\"#1"],
  'version-song': ["field:WorkViews.tsx#{`${v.label}: ${sceneLabel(p, sc)}, In Place Of \"${song.title}\"`}#1"],
};
