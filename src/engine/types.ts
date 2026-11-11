// The persistent game state. Every screen reads these records; later features extend them
// through save migrations (save.ts) rather than parallel copies.

import type { Place } from '../data/places';

export const SAVE_VERSION = 9;

export type PronounSet = 'he' | 'she' | 'they';
export type ActingTitle = 'Actor' | 'Actress';
export type Proficiency = 'Native' | 'Fluent' | 'Conversational' | 'Basic';

export interface Heritage {
  id: string; // catalog id or custom_<n>
  label: string;
  custom: boolean;
}

export interface LanguageSkill {
  code: string;
  proficiency: Proficiency;
}

export interface CharacterIdentity {
  /** The legal name, first, middle and last as written: what credits carry (identity.ts). */
  name: string;
  /** Its parts (save version 6). Saves from before have them split from `name`. */
  firstName: string;
  middleName?: string;
  lastName: string;
  /** What people call you; blank means your first and last name (identity.ts knownAs). */
  preferredName?: string;
  /** Where you live: the place your story began (save version 6). With your citizenship, your home countries. */
  livesIn: string;
  /** A headshot, 512 by 640, re-encoded as a JPEG data URL (ui/portrait.ts); shown on Profile and beside your credits. */
  portrait?: string;
  pronouns: PronounSet;
  actingTitle: ActingTitle;
  birth: { year: number; month: number; day: number };
  birthplaceId: string;
  /** Your ethnicities (save version 7; until then backgrounds mixed ethnicities and nationalities). */
  heritages: Heritage[];
  /** Your nationalities, as country codes (identity.ts): where you and your family come from. Not your citizenship. */
  nationalities: string[];
  mainLanguage: string;
  languages: LanguageSkill[]; // additional languages
  /** Holidays kept from your backgrounds (observance ids, observances.ts); saves from before have none. */
  observances?: string[];
}

/** Character creation's screens, in order (the registry is CREATION_STEPS in state.ts). */
/** Creation's steps, laid out as 1221's (Identity, then what you come from, then where you start, then Review). */
export type CreationStepId = 'identity' | 'background' | 'starting-point' | 'review';

export interface CreationDraft {
  /** The screen the player is on. Drafts saved before November 2026 stored its position as a number; readDraft converts them. */
  step: CreationStepId;
  /** Set when the player went from Review to edit a screen: that screen then offers to go straight back to Review. */
  returnToReview?: boolean;
  firstName: string;
  middleName: string;
  lastName: string;
  preferredName: string;
  portrait?: string;
  /** One field, before names had parts (November 8, 2026): split into first and last when the parts are empty. */
  name?: string;
  pronouns: PronounSet | '';
  actingTitle: ActingTitle | '';
  birthDate: string; // YYYY-MM-DD
  birthplaceId: string;
  /** Your ethnicities. */
  heritages: Heritage[];
  heritageCustomText: string;
  /** Your nationalities (country codes). A draft from before they were asked takes them from its backgrounds. */
  nationalities: string[];
  mainLanguage: string;
  languages: LanguageSkill[];
  /** Holidays you keep (observance ids). */
  observances: string[];
  startPlaceId: string;
  startDate: string;
  startTime: string; // HH:MM
  updatedAt: number;
  /** World-catalog places chosen during creation (catalog places don't need a record here). */
  places?: Record<string, Place>;
}

export type Attention = 'interrupt' | 'notify' | 'silent';

export interface ScheduledEvent {
  id: string;
  at: number;
  kind: string;
  priority: number; // lower runs first at the same instant
  attention: Attention;
  payload: Record<string, unknown>;
}

export interface LogEntry {
  id: string;
  at: number;
  text: string;
  kind: 'world' | 'personal' | 'project' | 'festival' | 'award' | 'money' | 'warning';
  projectId?: string;
  route?: Route;
}

export interface Route {
  view: string;
  projectId?: string;
  tab?: string;
  editionId?: string;
  placeId?: string;
  /** A screen catalog record: company:<slug>, movie:<tmdb>, tv:<tmdb>[:s:<n>[:e:<n>]], person:<tmdb> or exec:<slug> (catalog/model.ts). */
  ref?: string;
}

export interface Plan {
  id: string;
  title: string;
  start: number;
  durationMin: number;
  remindMin: number | null; // minutes before start; null = no reminder
  placeId: string;
  kind: 'personal' | 'project';
  projectId?: string;
  status: 'upcoming' | 'done' | 'missed' | 'cancelled';
}

// ---------------- Projects ----------------

export type Format =
  | 'short' | 'mid-length' | 'feature' | 'tv-film' | 'series' | 'limited-series' | 'anthology-series'
  | 'documentary-feature' | 'documentary-short' | 'documentary-series' | 'unscripted-series' | 'web-series' | 'music-video';
export type Medium = 'live-action' | 'animation' | 'hybrid';
export type Technique = 'none' | '2d-drawn' | '2d-rigged' | '3d-cg' | 'stop-motion' | 'rotoscope' | 'mixed';

export interface GenrePick {
  id: string;
  emphasis: 'primary' | 'secondary';
}

export type ContentIssue = 'violence' | 'sexual-content' | 'nudity' | 'language' | 'drugs' | 'threat';
export type ContentLevel = 'mild' | 'moderate' | 'strong';

export interface ProjectAxes {
  /** The light the film is shot in, its sound choices and its score (craft.ts). Unset on a project from before November 11, 2026, which is lit, recorded and scored as it always was. */
  light?: 'standard' | 'available' | 'contrast' | 'macro';
  sound?: string[];
  score?: 'unset' | 'synth' | 'chamber' | 'percussive';
  format: Format;
  medium: Medium;
  technique: Technique;
  genres: GenrePick[];
  tone: string;
  audience: string; // e.g. 'General', 'Adult', 'Family', 'Children (6–11)'
  storyEra: string;
  /**
   * The year the story is set in, when it is declared (looks.ts periodBand): how far it is from the year the project is
   * made sets the costume and design work. The look it borrows (styleEra) and the year it is made are separate things.
   */
  storyYear?: number;
  /** A period whose look the work borrows, whatever year it is set in: a reference for the departments, and nothing else reads it. */
  styleEra?: string;
  storySetting: string;
  /** Where the story is set, as a place (optional). A creative and research reference: where you shoot is the base. */
  settingPlaceId?: string;
  /** Where awards that split drama from comedy consider it; unset, its genres decide (script-effects.ts). */
  register?: 'comedy' | 'drama';
  /**
   * What the finished work shows, declared by the producer as for a classification body: each issue at a level. Unset
   * means not declared yet; {} means declared as containing none. Never a rating: only a classification body gives one.
   */
  content?: Partial<Record<ContentIssue, ContentLevel>>;
  dialogueLanguages: string[];
  targetRuntimeMin: number;
  episodeCount: number; // 1 for single works
  animationQuality: 'limited' | 'tv' | 'feature';
  basePlaceId: string; // where production is based (crew, holidays, weather)
}

export type RoleSize = 'lead' | 'co-lead' | 'ensemble-lead' | 'supporting' | 'featured' | 'background' | 'cameo';
export type NarrativeFunction =
  | 'protagonist' | 'antagonist' | 'deuteragonist' | 'ally' | 'mentor' | 'foil' | 'rival' | 'love-interest' | 'narrator' | 'none';
export type Entity =
  | 'human' | 'animal' | 'alien' | 'robot' | 'supernatural' | 'monster' | 'undead' | 'anthropomorphic-object' | 'custom';
export type PerformanceMethod = 'on-camera' | 'voice' | 'motion-capture' | 'suit' | 'puppetry' | 'animation' | 'stunt';
export type Realization = 'performer' | 'prosthetics' | 'suit' | 'animatronic' | 'cg' | 'puppet' | 'drawn';

export interface StoryCharacter {
  id: string;
  name: string;
  roleSize: RoleSize;
  functions: NarrativeFunction[];
  entity: Entity;
  entityNote: string;
  methods: PerformanceMethod[];
  realization: Realization;
  ageInStory: string;
  /** Other names the character goes by (SLATE-05-01.02): a record for the writer, shown with the part in casting. */
  aliases?: string[];
  /** How the character changes, beat by beat, each in a scene (structure.ts, SLATE-05-04.02). Never scored. */
  beats?: { id: string; sceneId: string; change: string }[];
  pronouns: string;
  languages: string[];
  description: string;
  wants: string;
  fears: string;
  seriesInvolvement: 'regular' | 'recurring' | 'guest' | 'single';
  /**
   * Where award entries place the performance, chosen by the producer as entrants do. Unset: by role size. Story functions
   * (antagonist, narrator...) never set it (script-effects.ts castPlacement).
   */
  awardPlacement?: 'lead' | 'supporting' | 'none';
  /** The character's ethnicities as written (labels from ETHNICITIES). Casting shows who shares one; it never scores a performance. */
  heritages?: string[];
  /** The character's nationalities as written (country codes), as the player's are; casting shows who shares one (save version 7). */
  nationalities?: string[];
  /**
   * How the character looks on screen and what makes it so (looks.ts): the makeup method, where the costume comes from,
   * and how many appearance states they go through (clean, bloodied, turned...). Unset fields keep the older rules.
   */
  look?: { makeup?: import('./looks').MakeupId; wardrobe?: import('./looks').WardrobeId; states?: number; /** The states' names, in order (looks.ts): when given, there are as many states as names. */ named?: string[] };
  designVersion: number; // bumping invalidates downstream design-dependent work
}

export type IntExt = 'INT' | 'EXT' | 'INT/EXT';
export type TimeOfDay = 'DAY' | 'NIGHT' | 'DAWN' | 'DUSK';

export interface DialogueLine {
  id: string;
  characterId: string;
  text: string;
  language: string;
}

export interface Scene {
  id: string;
  episode: number; // 1 for single works
  heading: { intExt: IntExt; place: string; time: TimeOfDay };
  storyLocation: string;
  participants: string[]; // character ids
  objective: string;
  action: string;
  dialogue: DialogueLine[];
  turningPoint: string; // the writer's note on what turns here; kept, never read
  /** Declared essential to the story: if it isn't shot, the edit has to bridge a gap the audience notices (finish.ts). */
  essential?: boolean;
  estMinutes: number;
  // Production-relevant elements (structured, never parsed from prose).
  props: string[];
  animals: string[];
  vehicles: string[];
  stunts: string; // empty = none
  crowd: number;
  /** The crowd's makeup, when they are made up as more than themselves (looks.ts). */
  crowdLook?: import('./looks').MakeupId;
  /** Which appearance state each character is in for this scene, by character ID (looks.ts): the first when unset. */
  states?: Record<string, number>;
  /** 'digital': a share of the crowd is on set and the rest is added in post (looks.ts). Unset: everyone is there. */
  crowdMethod?: 'digital';
  intimacy: boolean;
  water: boolean;
  vfx: string[];
  dance: boolean;
  // Documentary / factual
  kind: 'scripted' | 'interview' | 'actuality' | 'archival' | 'narration' | 'reconstruction' | 'segment';
  basis: 'invented' | 'sourced' | 'dramatized';
  contributorIds: string[];
  evidenceIds: string[];
  technique?: Technique; // per-scene override for hybrids / mixed technique
  /** The act or sequence the scene belongs to (structure.ts); none when unset. */
  act?: string;
  tone?: string;
  intentionalDiscontinuity: boolean;
  operator?: string; // found footage: who is recording
}

/** An invitation to read for a part, and what came of it (auditions.ts, SLATE-09-02). */
export interface Audition {
  id: string;
  characterId: string;
  method: PerformanceMethod;
  personId: string;
  /** The session day, local to the production base. */
  date: string;
  status: 'invited' | 'declined' | 'missed' | 'seen';
  reason?: string;
  /** The read: a range in the 0 to 100 capability scale that contains the truth, shown in words only. */
  read?: [number, number];
  shortlisted?: boolean;
  callback?: { date: string; status: 'scheduled' | 'missed' | 'seen'; partnerId?: string; chemistry?: number };
}

/** A research question behind a fiction script (research.ts, SLATE-04-04.02): the writer's record, never verified by the game. */
export interface ResearchNote {
  id: string;
  question: string;
  reference: string;
  status: 'open' | 'reviewed' | 'uncertain';
  sceneIds: string[];
}

/** A story line through scenes and characters (structure.ts, SLATE-04-02.02). Left open on purpose is a valid choice. */
export interface StoryThread {
  id: string;
  name: string;
  characterIds: string[];
  sceneIds: string[];
  resolution: 'resolves' | 'open';
  resolvedIn: string | null;
}

export interface SetupPayoff {
  id: string;
  kind: 'clue' | 'setup' | 'foreshadowing' | 'gag' | 'reveal';
  label: string;
  plantedIn: string | null;
  paidIn: string | null;
}

export interface Evidence {
  id: string;
  claim: string;
  status: 'established' | 'alleged' | 'dramatized' | 'unverified';
  sourceNote: string;
  verified: boolean;
}

export interface Contributor {
  id: string;
  name: string;
  role: string;
  consent: 'not-asked' | 'requested' | 'given' | 'declined' | 'withdrawn';
  /** What they agreed to on condition of (documentary.ts): their face hidden, their name withheld, approval of the cut. */
  restrictions?: ('face' | 'name' | 'approval')[];
  /** For approval of the cut: shown to them, and their answer. */
  cutApproval?: { status: 'shown' | 'approved' | 'refused'; answerAt: number };
}

export interface WorldRule {
  id: string;
  rule: string;
  limit: string;
  /** Scenes that rely on the rule: changing it previews them, by episode (season.ts). */
  sceneIds?: string[];
}

export interface Relationship {
  id: string;
  a: string;
  b: string;
  kind: string;
  start: string;
  end: string;
}

export interface Draft {
  number: number;
  savedAt: number;
  label: string;
  summary: string;
  scenes: Scene[];
  characters: StoryCharacter[];
  approved: boolean;
}

/** What a hired writer is asked to deliver: their own draft of an episode, a rewrite of the approved one, or a polish. */
export type WritingScope = 'draft' | 'rewrite' | 'polish';

/** One delivery asked of a writer: the first pass, or a revision of it after the player's note. */
export interface WritingPass {
  /** What the revision was asked to look at; absent on the first pass. */
  focus?: string;
  /** The player's own note, kept as written. The game never reads it. */
  text?: string;
  days: number;
  done: number;
  askedOn: string;
  deliveredOn?: string;
  /** How the delivered pass stands on the craft scale, drawn around the writer's level when it is delivered. */
  read?: number;
}

export interface WritingJob {
  id: string;
  hireId: string;
  personId: string;
  scope: WritingScope;
  episode: number;
  /** The player's brief for the work, kept as written. The game never reads it. */
  brief?: string;
  status: 'working' | 'delivered' | 'accepted' | 'cancelled';
  /** The first pass, then each revision asked for, in order. The last delivered one is the work as it stands. */
  passes: WritingPass[];
  acceptedOn?: string;
}

export interface RevisionNote {
  id: string;
  text: string;
  area: 'characterization' | 'causality' | 'structure' | 'pacing' | 'dialogue' | 'visual' | 'continuity';
  sceneId: string | null;
  status: 'open' | 'accepted' | 'rejected' | 'addressed';
  source: 'readiness' | 'player';
  /** Came from advice (a prompt that only checks a text field is filled, or a fit suggestion): addressing it earns nothing (finish.ts). */
  advisory?: boolean;
}

export interface Requirement {
  key: string; // stable derived key, e.g. 'prop:revolver'
  kind:
    | 'character-design' | 'performer' | 'location' | 'set' | 'prop' | 'costume' | 'animal' | 'vehicle' | 'stunt' | 'crowd'
    | 'intimacy' | 'water' | 'vfx' | 'song' | 'choreography' | 'creature' | 'archival' | 'interview' | 'language-coach'
    | 'period-research' | 'setting-research' | 'clue-prop' | 'puppet' | 'model' | 'rig' | 'background-art' | 'consent' | 'fact-check' | 'makeup';
  label: string;
  sceneIds: string[];
  qty: number;
  status: 'needed' | 'waived';
  note: string;
}

export interface Hire {
  id: string;
  personId: string;
  roleId: string;
  kind: 'crew' | 'cast';
  characterId?: string;
  method?: PerformanceMethod;
  episodes: number[] | 'all';
  dayRate: number;
  estDays: number;
  status: 'offered' | 'accepted' | 'declined' | 'released' | 'countered';
  counterRate?: number;
  /** When an unanswered counteroffer lapses (hiring.ts COUNTER_OPEN_DAYS); absent on counters from before November 8, 2026. */
  counterUntil?: number;
  offeredAt: number;
  responseAt: number;
  obligationId: string | null;
  daysWorked: number;
  /** A child's pay set aside in trust under the shoot's rules (minors.ts), in total so far. */
  trustSetAside?: number;
}

export interface CastAssignment {
  characterId: string;
  performer: 'player' | string; // person id
  method: PerformanceMethod;
  note: string;
  hireId?: string;
}

export type FinanceDealKind = 'agreed' | 'starting' | 'grant' | 'investor' | 'co-producer' | 'commissioner' | 'earnings' | 'capital';

/** A backer approached for a project, and what was agreed (finance.ts). */
export interface FinanceDeal {
  id: string;
  kind: FinanceDealKind;
  backer: string;
  amount: number; // promised in total
  status: 'considering' | 'offered' | 'declined' | 'refused' | 'accepted' | 'breached' | 'lapsed' | 'withdrawn';
  askedAt: number;
  decideAt?: number;
  /** When an open offer lapses unanswered (negotiation.ts). Offers made before November 8, 2026 have none and stay open. */
  expiresAt?: number;
  /** The one request for better terms an offer allows, and the backer's answer (negotiation.ts). */
  counter?: { term: 'share' | 'recoup' | 'signing' | 'approval'; askedAt: number; answerAt: number; outcome?: 'agreed' | 'held' | 'withdrawn' };
  reason: string; // why they agreed, or why not
  received: number; // paid into the project so far
  repaid: number; // paid back to them from income so far
  /**
   * unspent: who has what the deal paid in and the project didn't spend (finance.ts moneyKept). 'stays': it stays with the
   * project it was raised for; 'yours': it is the player's again once the project is delivered. Deals made before
   * November 10, 2026 have none, and are read as 'stays': a missing term never lets money move.
   */
  terms: { recoup: number; incomeShare: number; approvalRights: string[]; credit: string | null; onDelivery: number; deliverBy: number | null; unspent?: 'stays' | 'yours' };
  /**
   * Your own money moved in from delivered projects (finance.ts moveOwnMoney): one transfer, its id on every budget line it
   * paid out of (ref transfer:<id>:<kind>, settle key transfer:<id>). Deals accepted before November 10, 2026 have none.
   */
  transfer?: { id: string; sources: { projectId: string; amount: number }[] };
  /** The documents sent with the approach (names, as listed when it was made). */
  sent?: string[];
  /**
   * What was sent, word for word, and with which approved draft (SLATE-04-05.02, November 8, 2026): later edits to the
   * Story panel never change it. Approaches made before then have only the names.
   */
  sentCopy?: { draft: number | null; documents: { name: string; fields: { label: string; text: string }[] }[] };
}

export interface ProjectFinance {
  estimate: number;
  target: number;
  deals: FinanceDeal[];
  /** What the estimate was made of when the draft was approved (estimate.ts), to compare spending with; absent before November 8, 2026. */
  estimateAtApproval?: { draft: number; at: number; total: number; byArea: Record<string, number>; shootDays: number };
}

export interface Obligation {
  id: string;
  label: string;
  category: 'cast' | 'crew' | 'materials' | 'locations' | 'equipment' | 'licensing' | 'post' | 'festival' | 'contingency' | 'travel' | 'finance';
  amount: number; // planned or agreed amount
  state: 'reserved' | 'committed' | 'settled' | 'cancelled';
  settled: number; // amount paid so far
  ref?: string;
  postings: { at: number; kind: 'reserve' | 'commit' | 'settle' | 'cancel'; amount: number; key: string }[];
}

export interface Task {
  id: string;
  kind: string;
  label: string;
  dept: string;
  roleId: string; // who performs it
  units: number;
  unitLabel: string;
  done: number;
  dependsOn: string[];
  status: 'waiting' | 'ready' | 'active' | 'done' | 'blocked';
  blockedReason?: string;
  episode: number;
  sceneIds: string[];
  assetRef?: string;
  needsVersion?: number;
  workedDays: number;
  doneAt?: number;
  /** Who worked it ('player' or person ids). Kept for song writing and recording, whose credits follow the work (songs.ts). */
  workers?: string[];
  /** Days each worked it, for song writing (songs.ts): how much of a song each writer wrote. */
  workerDays?: Record<string, number>;
  /** Its materials, when they aren't the flat amount for its kind (looks.ts: a costume by its source, an appliance by its method). */
  material?: number;
}

export interface Asset {
  id: string;
  kind: 'puppet' | 'model' | 'rig' | 'set' | 'miniature-set' | 'costume' | 'creature' | 'background' | 'design' | 'stage';
  label: string;
  characterId?: string;
  copies: number;
  version: number;
  ready: boolean;
  stage: string; // human status
  costumeFitted?: boolean;
}

export interface ShootDay {
  id: string;
  date: string;
  episode: number;
  /** A block day's episodes, when it serves more than one (schedule.ts block scheduling); `episode` is the first. */
  episodes?: number[];
  sceneIds: string[];
  locationLabel: string;
  interior: boolean;
  night: boolean;
  status: 'scheduled' | 'shot' | 'partial' | 'lost' | 'moved' | 'cancelled';
  result?: string;
  playerActing: boolean;
  conflicts: string[];
  late?: boolean;
  weatherAnyway?: boolean;
  /** Directing 2: on a pickup day, what each scene's pickup shoots (directing.ts). */
  pickups?: Record<string, 'take' | 'singles' | 'inserts'>;
}

export type UnscriptedFamily = 'talk' | 'observational' | 'competition' | 'factual' | 'studio-variety';

export interface CompetitionResult {
  episode: number;
  scores: Record<string, number>;
  advancing: string[];
  eliminated: string[];
}

export interface UnscriptedSetup {
  family: UnscriptedFamily;
  competition?: { contestants: string[]; eliminatePerEpisode: number; results: CompetitionResult[] };
  redactions: { contributorId: string; episode: number; sceneIds: string[]; taskId: string }[];
}

export interface MocapTake {
  id: string;
  date: string;
  quality: number; // 0..100
  retake: boolean;
  /** Who performed it (person id or 'player'); takes recorded before November 2026 don't say. */
  performer?: string;
}

/** What a capture session records: the body, the face, or both (full performance capture). */
export type CapturePart = 'body' | 'face';

/** A dated capture-stage session (bookings made before November 2026 have none and run on any working day). */
export interface MocapSession {
  date: string;
  kind: 'calibration' | 'capture';
  status: 'booked' | 'done' | 'missed';
  note?: string;
}

export interface MocapRecord {
  /** The stage booking's budget line; reserved when booked, drawn down by sessions, released (less the fee) on cancellation. */
  bookingId: string | null;
  status: 'unbooked' | 'booked' | 'cancelled';
  takes: MocapTake[];
  approvedTakeId: string | null;
  retakes: number;
  /** Body, face or both; bookings before November 2026 were both. */
  parts?: CapturePart[];
  sessions?: MocapSession[];
}

export interface SceneCapture {
  sceneId: string;
  captured: number; // 0..1 coverage of planned material
  quality: number; // modeled 0..100
  version: number; // script version captured
  weatherCompromised: boolean;
  /** Who performed in it (person ids or 'player'), so a replaced performer whose work remains is still credited. */
  performers?: string[];
  /** Its takes and the one used, with that take's performance side (takes.ts); absent for projects without shot plans. */
  takes?: { perf: number; tech: number; issue?: 'performance' | 'camera' | 'sound' }[];
  chosenTake?: number;
  perf?: number;
  /** Directing 2: the setups filmed, the shoot days the scene took, and what the player accepted missing. */
  setups?: ('master' | 'singles' | 'inserts')[];
  days?: number;
  accepted?: ('master' | 'singles' | 'inserts' | 'continuity' | 'take')[];
}

/** A festival or distribution version: the delivered cut less the scenes it leaves out (versions.ts). */
export interface ProjectVersion {
  id: string;
  label: string;
  leaveOut: string[];
  /** Songs this version takes out of a scene, or replaces with another song, leaving the main cut as it is (songs.ts). */
  songChanges?: { sceneId: string; songId: string; replaceWith: string | null }[];
}

/**
 * A performer's time in one edited scene, as the player recorded it from the cut (screen-time.ts, November 9, 2026). The
 * game has no footage to measure: a scene with no record is unknown, shown as a range from nothing to the whole scene,
 * never as either end of it.
 */
export interface ScreenTime {
  sceneId: string;
  characterId: string;
  /** Minutes seen on screen in the scene. */
  onScreen: number;
  /** Minutes heard but not seen: a voice-over, a call, narration. On-screen and heard-only time together fit in the scene. */
  heardOnly: number;
  /** The scene's length when this was recorded; a record longer than the scene now is stale and counts as unknown. */
  sceneMinutes: number;
  at: number;
}

/**
 * A song as a work of its own (songs.ts, November 9, 2026). Until then a song was a title and a "licensed" flag on a scene,
 * and the original song award went to the score composer of any project with an unlicensed one.
 */
export interface Song {
  id: string;
  title: string;
  /**
   * Why it exists: written for this project by you or by writers commissioned for it, or existing before it. 'unrecorded'
   * marks a song carried over from a save made before songs were works, whose origin the save never held.
   */
  origin: 'written' | 'commissioned' | 'existing' | 'unrecorded';
  /** Who holds the rights: the production, nobody (public domain), or a holder it is licensed from. */
  rights: 'production' | 'public-domain' | 'licensed';
  /** Songwriting credits: music, lyrics or both. A writer outside the game's people has `who` null and a name. */
  writers: SongCredit[];
  /** Recording and performance credits, kept apart from the writing. */
  performers: SongCredit[];
  /** Where it is heard in the cut. Minutes null: not recorded. */
  uses: SongUse[];
  /** A licensed song's rights holder. The fee is the music clearance's, paid when the music supervisor clears it. */
  license?: { holder: string };
  /** Who writes a song made for the project: you, or writers commissioned for it; lyrics with the music, apart, or none. */
  plan?: { music: 'you' | 'commission'; lyrics: 'with-music' | 'you' | 'commission' | 'none' };
  createdAt: number;
}

/** `days`: the working days this writer put into writing the song (songs.ts), for an organizer that asks whose contribution was essential. */
export interface SongCredit { who: 'player' | string | null; name: string; music?: boolean; lyrics?: boolean; characterId?: string; days?: number }

/** `cue`: over the end credits, its place in the order they play (1 first); lower plays earlier. */
export interface SongUse { sceneId: string; placement: 'performed' | 'background' | 'opening-titles' | 'end-credits'; minutes: number | null; cue?: number }

export interface EditState {
  assembly: boolean;
  cutPasses: number;
  pickupsNeeded: string[];
  /** Scenes the producer chose to cut from the edit rather than shoot or pick up (the revised edit plan). */
  cutSceneIds?: string[];
  pictureLocked: boolean;
  lockedAt?: number;
  versions: { number: number; at: number; runtimeMin: number; note: string }[];
  /** Performers' recorded screen time per scene (screen-time.ts). */
  screenTime?: ScreenTime[];
  /** A series locked an episode at a time (episode-delivery.ts): their numbers. The whole picture lock covers them all. */
  lockedEpisodes?: number[];
  /** Cut passes made on one episode alone, by episode number (episode-delivery.ts). Season passes count for each. */
  episodeCutPasses?: Record<number, number>;
}

export interface Credit {
  id: string;
  person: 'player' | string;
  personName: string;
  contribution: string; // e.g. 'Written By', 'Directed By', 'Cast'
  roleId: string;
  characterName?: string;
  episodes: number[] | 'all';
  billing: number;
  /** A songwriting or song performance credit: the song it is for (songs.ts). */
  songId?: string;
}

export interface ReleaseRecord {
  id: string;
  route: 'festival-premiere' | 'theatrical' | 'streaming' | 'broadcast' | 'digital';
  date: string;
  territories: string[];
  distributor: string | null;
  note: string;
  status: 'planned' | 'released' | 'cancelled';
  /** The accepted offer this release fulfils, and its delivery-materials budget line. */
  offerId?: string;
  obligationId?: string;
  /** A series: each episode's own date in this release (episode-releases.ts). The release's date is its first. */
  episodes?: EpisodeRelease[];
  /** How the dates were chosen; 'assumed' when an older save's dates were reconstructed (episode-releases.ts). */
  pattern?: ReleasePattern;
}

export type ReleasePattern = 'all' | 'weekly' | 'premiere-weekly' | 'custom' | 'assumed';

/** One episode in one release: planned until its day comes, then released, and never moved after that. */
export interface EpisodeRelease {
  /** Stable: the release's id and the episode's number. */
  id: string;
  number: number;
  date: string;
  status: 'planned' | 'released';
  /** Reconstructed from an older save's release by the rule it was judged by then, not a date anyone set. */
  assumed?: true;
  /** Its day came before it was delivered, so it didn't come out; it waits for a new date (episode-delivery.ts). */
  held?: true;
}

export interface DistributionOffer {
  id: string;
  distributor: string;
  route: 'theatrical' | 'streaming' | 'broadcast' | 'digital';
  minimumGuarantee: number;
  territories: string[];
  releaseWindowDays: number;
  expiresAt: number;
  status: 'open' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  /**
   * Broadcast only: 'late' when the declared content can't air before the watershed. The guarantee shown is the late
   * slot's; a broadcast edit (an extra deliverable) earns `editedGuarantee` for an earlier slot.
   */
  slot?: 'any' | 'late';
  editedGuarantee?: number;
  /** Accepted with a broadcast edit. */
  broadcastEdit?: boolean;
  /** Exclusive rights in its territories (distribution.ts terms): accepting it ends overlapping offers on any route. */
  exclusive?: boolean;
  /** Offered for a later window, some months after the first release (distribution.ts LATER_WINDOW_DAYS). */
  laterWindow?: true;
  /** Once accepted: the day its exclusivity ends (a dateKey), after which later windows can open there. */
  exclusiveUntil?: string;
  /** What the distributor has reported since release (distribution.ts): gross, after its fee, and overage paid. */
  reported?: { gross: number; net: number; overagePaid: number };
}

export interface Project {
  id: string;
  title: string;
  createdAt: number;
  phase: 'development' | 'pre-production' | 'production' | 'post-production' | 'delivered' | 'released';
  axes: ProjectAxes;
  /**
   * scenarioId is the budget size chosen (it scales day costs); fund is money actually received from backers' deals
   * (finance.ts). extra holds co-production money from saves made before financing existed.
   */
  funding: { scenarioId: string; fund: number; extra: { label: string; amount: number; approvalRights: string[] }[] };
  /** The budget estimate, the financing target and every backer approached (save version 5). */
  finance?: ProjectFinance;
  story: {
    logline: string; premise: string; stakes: string; conflict: string; viewpoint: string; theme: string;
    ending: string; intendedExperience: string; question: string;
  };
  genreNotes: Record<string, string>;
  worldRules: WorldRule[];
  relationships: Relationship[];
  characters: StoryCharacter[];
  scenes: Scene[];
  /**
   * Who writes and directs each episode. Someone replaced after contributing (an approved draft of the episode, a day of it
   * shot) is kept in formerWriters or formerDirectors and stays credited (projects.ts assignEpisodeRole, SLATE-01-04.05).
   */
  episodes: { number: number; title: string; writer: 'player' | string; director: 'player' | string; formerWriters?: string[]; formerDirectors?: string[]; /** What this episode moves in the season arc (season.ts). */ arc?: string }[];
  /** The season's arc, in the writer's words (season.ts). Scores nothing; a continuation starts from it. */
  seasonArc?: string;
  /** Licences and permits for the children in the cast (minors.ts), applied for when the shoot is planned. */
  childLicences?: import('./minors').ChildLicence[];
  /** Designs wait for the producer's approval before they are built (designs.ts); unset on projects started before. */
  designReview?: boolean;
  designApprovals?: Record<string, { version: number; status: 'approved' | 'changes' }>;
  /** Live-action scenes are shot to a plan of coverage and takes (takes.ts); unset on projects started before. */
  takesModel?: boolean;
  shotPlans?: Record<string, { coverage?: 'master' | 'standard' | 'full'; takes?: 'one' | 'few' | 'many'; emphasis?: 'scene' | 'performances' | 'detail' | 'one-shot'; /** How the camera moves for the scene (craft.ts); a tripod when unset. */ rig?: 'sticks' | 'handheld' | 'dolly' | 'moving' | 'pov' }>;
  /** 2: contextual directing (takes.ts, directing.ts), projects from November 8, 2026; absent keeps the earlier take rules. */
  directing?: 2;
  /** Versions conformed from the locked cut besides the main one (versions.ts). */
  versions?: ProjectVersion[];
  /** Sites chosen for each place after scouting, the backup, and those that fell through (locations.ts). */
  locationChoices?: Record<string, { main?: 'real' | 'stage' | 'standin'; backup?: 'real' | 'stage' | 'standin'; lost?: ('real' | 'stage' | 'standin')[] }>;
  /** The proposal this project came from (opportunities.ts). */
  fromOpportunity?: string;
  /** Auditions and callbacks for its parts (auditions.ts). */
  auditions?: Audition[];
  setups: SetupPayoff[];
  /** Acts or sequences, and story threads (structure.ts). Absent in older saves. */
  acts?: { id: string; name: string }[];
  threads?: StoryThread[];
  /** Research questions and references for a fiction script (research.ts). Absent in older saves. */
  research?: ResearchNote[];
  evidence: Evidence[];
  contributors: Contributor[];
  drafts: Draft[];
  approvedDraft: number | null;
  notes: RevisionNote[];
  /**
   * Work commissioned from hired writers (writing-jobs.ts). Present on projects made from November 11, 2026: there a hired
   * writer is paid for days worked on a pass, and credited and counted only for a pass the player accepted. A project
   * without it keeps the rules it was made under.
   */
  writing?: WritingJob[];
  revision: { endsAt: number; noteIds: string[] } | null;
  revisionPasses: number;
  requirements: Requirement[];
  /** Design changes made after work began (production.ts applyDesignChange): the work they sent back to be done again. */
  changeOrders: { id: string; at: number; summary: string; affectedTasks: string[]; decision: 'accepted' | 'kept-old' }[];
  cast: CastAssignment[];
  hires: Hire[];
  obligations: Obligation[];
  schedule: {
    startDate: string | null;
    rehearsalDays: number;
    sixDayWeeks: boolean;
    /** Series: scenes at one place across episodes with the same director share days (SLATE-07-04.02). */
    blockEpisodes?: boolean;
    workHolidays: boolean;
    /** Holidays the producer keeps (copied from the character when the project is made): shoot days skip them too. */
    observances?: string[];
    stages: number;
    renderNodes: number;
    puppetCopies: Record<string, number>;
    days: ShootDay[];
  };
  tasks: Task[];
  assets: Asset[];
  captures: SceneCapture[];
  /** Motion-capture work by character (booking, takes, approved take). Absent in older saves. */
  mocap?: Record<string, MocapRecord>;
  /** Unscripted format family, competition season and redactions. Absent in older saves (treated as observational). */
  unscripted?: UnscriptedSetup;
  edit: EditState;
  delivered: { at: number; runtimeMin: number } | null;
  /** A series delivered an episode at a time, before the whole season (episode-delivery.ts), by episode number. */
  episodeDeliveries?: Record<number, { at: number; runtimeMin: number }>;
  credits: Credit[];
  releases: ReleaseRecord[];
  offers: DistributionOffer[];
  premiere: { kind: 'world' | 'international' | 'national'; date: string; country: string; venue: string; editionId?: string } | null;
  revenue: number;
  quality: Record<string, number> | null; // modeled, locked at delivery
  /**
   * Each episode's own assessment, locked at delivery like `quality` (finish.ts assessQuality with an episode). Projects
   * delivered before November 9, 2026 have none: their episode entries are judged on the season, and say so.
   */
  episodeQuality?: Record<string, Record<string, number>>;
  /** The project's songs (songs.ts). Absent on saves from before version 8 until migrated. */
  songs?: Song[];
  history: { at: number; text: string }[];
  /** Shelved, with its commitments settled (shelve.ts); taken up again by removing it. */
  shelved?: { at: number };
  /**
   * What the screenplay is based on, as the writer declares it (awards that split original from adapted read it).
   * Missing on projects from before November 9, 2026, which count as original. Rights in the source aren't modeled.
   */
  source?: { kind: 'original' | 'adapted'; work?: string };
  /** When the story is set, as declared: costume, makeup and design awards split by it. Missing means contemporary. */
  storyTime?: 'contemporary' | 'period' | 'future';
  /** Subjects the story takes on, as declared (some awards and sections are for work about them); never read from prose. */
  subjects?: string[];
  /** A next season or sequel of another project (continuation.ts), and the people to ask back. */
  continues?: { from: string; number: number; previousArc?: string; returning: { characterId: string; personId: string; method: PerformanceMethod; rate: number }[] };
  continuedBy?: string;
  /** A commissioner's decision on another season (continuation.ts). */
  renewal?: { decidedAt: number; outcome: 'renewed' | 'cancelled'; reason: string };
  /** Real people from the film catalog the player is considering for a part or a job here (guests.ts). */
  considered?: import('./guests').Considered[];
  /** Ideas applied from the picker, by ID and version, and ideas marked to come back to (brief.ts). Never their text. */
  brief?: import('./brief').Brief;
  noticeKeys: string[];
}

// ---------------- Industry ----------------

export interface PersonState {
  bookings: { from: string; to: string; projectId: string }[];
  /** What happened when they worked with you (relationships.ts). */
  history?: { projectId: string; title: string; role: string; kind: 'completed' | 'let-go' | 'counter-declined'; at: number }[];
}

export interface EditionEntry {
  id: string;
  projectId: string;
  categoryId: string;
  /** The version entered, when not the main cut (versions.ts). */
  versionId?: string;
  episode?: number;
  submittedAt: number;
  status: 'submitted' | 'needs-correction' | 'rejected' | 'withdrawn' | 'disqualified' | 'accepted' | 'selected' | 'not-selected' | 'nominated' | 'not-nominated' | 'won' | 'lost' | 'mention';
  reason?: string;
  /** Prizes decided among a section's selected works: recorded from the selection, never entered or paid for. */
  via?: 'selection';
  recipients: string[]; // credit ids
  fee: number;
  /** The song entered, for a song award (songs.ts). */
  songId?: string;
  /** The entry this one replaces, when a withdrawn entry was entered again: a revision, never a silent edit. */
  revises?: string;
  /** What was entered, as it stood when entered (awards-actions.ts); judging reads it. Entries from before have none. */
  snapshot?: EntrySnapshot;
}

/**
 * What an entry was judged on, kept from the moment it was submitted: later edits, recorded screen time or credit changes
 * don't rewrite it. `assessed` says where the score came from, in the player's words.
 */
export interface EntrySnapshot {
  runtimeMin: number;
  score: number;
  assessed: string;
  recipients: { id: string; name: string; contribution: string; characterName?: string }[];
  /** Screen time shown for each performer entered, as the calculation stood. */
  screen?: { creditId: string; text: string }[];
  song?: { id: string; title: string; writers: string[] };
  /** A series: when each episode first came out, or was to, as it stood when entered (episode-releases.ts airings). */
  airing?: { number: number; date: string; status: 'planned' | 'released'; assumed?: true; held?: true }[];
}

/** A competing work from the simulated season, stored once per save and shared by every edition it appears in. */
export interface RivalFilm {
  title: string;
  people: Record<string, string>;
  format: Format;
  medium: Medium;
  runtimeMin: number;
  /** A followed studio's film after the records end (studios.ts): its studio, so results can name it. Its key in
   * GameState.rivalFilms is the film's own ID. */
  studio?: string;
}

/** A competing work selected or nominated in one category of one edition: which film, and its strength there. */
export interface Rival {
  id: string;
  /** Key in GameState.rivalFilms. */
  film: string;
  score: number;
}

export interface Edition {
  id: string;
  institutionId: string;
  year: number;
  label: string;
  start: number; // instant (organizer zone)
  end: number;
  submissionOpens: number;
  deadline: number;
  announce: number;
  eligibility: { from: string; to: string };
  provenance: 'official' | 'simulated';
  entries: EditionEntry[];
  rivals: Rival[];
  results: Record<string, { stage: 'selection' | 'nomination' | 'winner'; projectIds: string[]; rivalIds: string[]; winner?: string; revealed: boolean; /** Area and juried awards: every winner, when more than one (or none). */ winners?: string[]; /** Honorary: given to the player for this body of work. */ honoree?: string }>;
  status: 'upcoming' | 'open' | 'closed' | 'judging' | 'announced' | 'complete';
  screenings?: Screening[];
  /** Official dates whose entry deadline wasn't confirmed: the deadline shown is a planning date. */
  deadlinePlanned?: boolean;
  /** The rulebook this edition is judged by (rulebooks.ts), fixed when the edition is created; 'simulated' when none. */
  rulesId?: string;
  /** With a rulebook: the general deadline for categories that have no deadline of their own (`deadline` is the latest). */
  defaultDeadline?: number;
  /**
   * Set once results are final: `rivals` is emptied (strengths only matter while judging) and each result's rivalIds and
   * winner name films directly (keys of GameState.rivalFilms). Titles, nominees, winners and entries are all kept.
   */
  compact?: true;
}

/** A public screening of a selected project. The invitation to attend is separate from the selection itself. */
export interface Screening {
  projectId: string;
  at: number;
  done: boolean;
  /** Reply by this instant; older saves have none and are treated as not yet answered. */
  rsvpBy?: number;
  rsvp?: 'pending' | 'accepted' | 'declined' | 'expired';
  attended?: boolean;
}

export interface Settings {
  theme: 'dark' | 'light';
  // Larger text and reduced motion were here until November 9, 2026, never read: they are the device's (the browser's
  // stored Larger Text and the system's motion setting), the same for every saved game.
  wakeForObligations: boolean;
}

/** A proposal tied to past work (opportunities.ts, SLATE-18-03). */
export interface Opportunity {
  id: string;
  fromProjectId: string;
  commissioner: string;
  amount: number;
  format: Format;
  medium: Medium;
  technique: Technique;
  expiresAt: number;
  status: 'open' | 'accepted' | 'declined' | 'lapsed';
  reason: string;
  projectId?: string;
}

export interface GameState {
  version: number;
  saveId: string;
  saveName: string;
  createdAtReal: number;
  updatedAtReal: number;
  seed: number;
  idCounter: number;
  now: number;
  startedAt: number;
  character: CharacterIdentity;
  locationId: string;
  ageZone: string;
  events: ScheduledEvent[];
  processedEventIds: string[]; // ring of recent ids (exact-once guard)
  log: LogEntry[];
  plans: Plan[];
  /** Real people from the film catalog brought into this story (guests.ts): a copy of their record, and what the game makes up. */
  real?: import('./guests').RealPeople;
  /** The living world's simulated decisions and seasons (industry.ts), from when the catalog was first present; absent before. */
  industry?: import('./industry').IndustryState;
  sleep: { asleep: boolean; since?: number; wakeAt?: number; alarm: boolean };
  travel?: { to: string; from: string; arriveAt: number } | null;
  projects: Project[];
  people: Record<string, PersonState>;
  /** Proposals tied to past work (opportunities.ts). */
  opportunities?: Opportunity[];
  editions: Edition[];
  /** Competing works of the simulated seasons, by key (see Rival.film). */
  rivalFilms: Record<string, RivalFilm>;
  followed: string[];
  calendarFilters: string[];
  settings: Settings;
  /** Every world-catalog place this save uses, so it opens without loading the catalog. Added in save version 2. */
  places: Record<string, Place>;
}
