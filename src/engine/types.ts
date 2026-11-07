// The persistent game state. Every screen reads these records; later features extend them
// through save migrations (save.ts) rather than parallel copies.

import type { Place } from '../data/places';

export const SAVE_VERSION = 5;

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
  name: string;
  pronouns: PronounSet;
  actingTitle: ActingTitle;
  birth: { year: number; month: number; day: number };
  birthplaceId: string;
  heritages: Heritage[];
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
  name: string;
  pronouns: PronounSet | '';
  actingTitle: ActingTitle | '';
  birthDate: string; // YYYY-MM-DD
  birthplaceId: string;
  heritages: Heritage[];
  heritageCustomText: string;
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
export type NarrativeBasis = 'fiction' | 'nonfiction' | 'dramatized-factual' | 'hybrid';
export type ProductionModel = 'self' | 'co-production' | 'commissioned';

export interface GenrePick {
  id: string;
  emphasis: 'primary' | 'secondary';
}

export interface ProjectAxes {
  format: Format;
  medium: Medium;
  technique: Technique;
  basis: NarrativeBasis;
  genres: GenrePick[];
  tone: string;
  audience: string; // e.g. 'General', 'Adult', 'Family', 'Children (6–11)'
  storyEra: string;
  storySetting: string;
  /** Where the story is set, as a place (optional): shooting away from it adds a scouting trip there (production/tasks.ts). */
  settingPlaceId?: string;
  /** Where awards that split drama from comedy consider it; unset, its genres decide (script-effects.ts). */
  register?: 'comedy' | 'drama';
  dialogueLanguages: string[];
  targetRuntimeMin: number;
  episodeCount: number; // 1 for single works
  distributionIntent: string;
  productionModel: ProductionModel;
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
  pronouns: string;
  languages: string[];
  description: string;
  wants: string;
  fears: string;
  seriesInvolvement: 'regular' | 'recurring' | 'guest' | 'single';
  /** The character's backgrounds as written (labels from HERITAGES). A performer who shares one counts toward the performance (finish.ts). */
  heritages?: string[];
  designVersion: number; // bumping invalidates downstream design-dependent work
  groupSize?: number; // background groups
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
  turningPoint: string;
  estMinutes: number;
  // Production-relevant elements (structured, never parsed from prose).
  props: string[];
  animals: string[];
  vehicles: string[];
  stunts: string; // empty = none
  crowd: number;
  intimacy: boolean;
  water: boolean;
  vfx: string[];
  songs: { title: string; licensed: boolean }[];
  dance: boolean;
  // Documentary / factual
  kind: 'scripted' | 'interview' | 'actuality' | 'archival' | 'narration' | 'reconstruction' | 'segment';
  basis: 'invented' | 'sourced' | 'dramatized';
  contributorIds: string[];
  evidenceIds: string[];
  technique?: Technique; // per-scene override for hybrids / mixed technique
  tone?: string;
  intentionalDiscontinuity: boolean;
  operator?: string; // found footage: who is recording
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
}

export interface WorldRule {
  id: string;
  rule: string;
  limit: string;
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

export interface RevisionNote {
  id: string;
  text: string;
  area: 'characterization' | 'causality' | 'structure' | 'pacing' | 'dialogue' | 'visual' | 'continuity';
  sceneId: string | null;
  status: 'open' | 'accepted' | 'rejected' | 'addressed';
  source: 'readiness' | 'player';
}

export interface Requirement {
  key: string; // stable derived key, e.g. 'prop:revolver'
  kind:
    | 'character-design' | 'performer' | 'location' | 'set' | 'prop' | 'costume' | 'animal' | 'vehicle' | 'stunt' | 'crowd'
    | 'intimacy' | 'water' | 'vfx' | 'song' | 'choreography' | 'creature' | 'archival' | 'interview' | 'language-coach'
    | 'period-research' | 'clue-prop' | 'puppet' | 'model' | 'rig' | 'background-art' | 'consent' | 'fact-check';
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
  offeredAt: number;
  responseAt: number;
  obligationId: string | null;
  daysWorked: number;
}

export interface CastAssignment {
  characterId: string;
  performer: 'player' | string; // person id
  method: PerformanceMethod;
  note: string;
  hireId?: string;
}

export type FinanceDealKind = 'agreed' | 'starting' | 'grant' | 'investor' | 'co-producer' | 'commissioner';

/** A backer approached for a project, and what was agreed (finance.ts). */
export interface FinanceDeal {
  id: string;
  kind: FinanceDealKind;
  backer: string;
  amount: number; // promised in total
  status: 'considering' | 'offered' | 'declined' | 'refused' | 'accepted' | 'breached';
  askedAt: number;
  decideAt?: number;
  reason: string; // why they agreed, or why not
  received: number; // paid into the project so far
  repaid: number; // paid back to them from income so far
  terms: { recoup: number; incomeShare: number; approvalRights: string[]; credit: string | null; onDelivery: number; deliverBy: number | null };
}

export interface ProjectFinance {
  estimate: number;
  target: number;
  deals: FinanceDeal[];
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
  sceneIds: string[];
  locationLabel: string;
  interior: boolean;
  night: boolean;
  status: 'scheduled' | 'shot' | 'partial' | 'lost' | 'moved';
  result?: string;
  playerActing: boolean;
  conflicts: string[];
  late?: boolean;
  weatherAnyway?: boolean;
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
}

export interface EditState {
  assembly: boolean;
  cutPasses: number;
  pickupsNeeded: string[];
  pictureLocked: boolean;
  lockedAt?: number;
  versions: { number: number; at: number; runtimeMin: number; note: string }[];
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
  episodes: { number: number; title: string; writer: 'player' | string; director: 'player' | string }[];
  setups: SetupPayoff[];
  evidence: Evidence[];
  contributors: Contributor[];
  drafts: Draft[];
  approvedDraft: number | null;
  notes: RevisionNote[];
  revision: { endsAt: number; noteIds: string[] } | null;
  revisionPasses: number;
  requirements: Requirement[];
  requirementsVersion: number | null; // draft number the breakdown was derived from
  changeOrders: { id: string; at: number; summary: string; costDelta: number; affectedTasks: string[]; decision: 'pending' | 'accepted' | 'deferred' | 'kept-old' }[];
  playerActing: boolean;
  cast: CastAssignment[];
  hires: Hire[];
  obligations: Obligation[];
  schedule: {
    startDate: string | null;
    rehearsalDays: number;
    sixDayWeeks: boolean;
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
  credits: Credit[];
  releases: ReleaseRecord[];
  offers: DistributionOffer[];
  premiere: { kind: 'world' | 'international' | 'national'; date: string; country: string; venue: string; editionId?: string } | null;
  revenue: number;
  quality: Record<string, number> | null; // modeled, locked at delivery
  history: { at: number; text: string }[];
  workEventScheduled: boolean;
  noticeKeys: string[];
}

// ---------------- Industry ----------------

export interface PersonState {
  bookings: { from: string; to: string; projectId: string }[];
}

export interface EditionEntry {
  id: string;
  projectId: string;
  categoryId: string;
  episode?: number;
  submittedAt: number;
  status: 'submitted' | 'needs-correction' | 'rejected' | 'withdrawn' | 'accepted' | 'selected' | 'not-selected' | 'nominated' | 'not-nominated' | 'won' | 'lost';
  reason?: string;
  recipients: string[]; // credit ids
  fee: number;
}

/** A competing work from the simulated season, stored once per save and shared by every edition it appears in. */
export interface RivalFilm {
  title: string;
  people: Record<string, string>;
  format: Format;
  medium: Medium;
  runtimeMin: number;
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
  results: Record<string, { stage: 'selection' | 'nomination' | 'winner'; projectIds: string[]; rivalIds: string[]; winner?: string; revealed: boolean }>;
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
  reducedMotion: boolean;
  largeText: boolean;
  wakeForObligations: boolean;
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
  sleep: { asleep: boolean; since?: number; wakeAt?: number; alarm: boolean };
  travel?: { to: string; from: string; arriveAt: number } | null;
  projects: Project[];
  people: Record<string, PersonState>;
  editions: Edition[];
  /** Competing works of the simulated seasons, by key (see Rival.film). */
  rivalFilms: Record<string, RivalFilm>;
  followed: string[];
  calendarFilters: string[];
  settings: Settings;
  /** Every world-catalog place this save uses, so it opens without loading the catalog. Added in save version 2. */
  places: Record<string, Place>;
}
