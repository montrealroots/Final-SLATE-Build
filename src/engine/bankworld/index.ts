// SLATE's bank, which is 1221's (1221 at d6eba5d; ported November 14, 2026, the owner's command "Complete banking,
// papers and homepage migration"). Everything under src/engine/bankworld/ is 1221's code, copied with its relative layout
// so a diff against 1221 shows only the adapters; docs/v9/PARITY.md lists each deviation. This file is the one place
// SLATE meets it: it builds a 1221 universe for a SLATE life, registers the bank's systems and nothing else of 1221's
// life, and opens, advances and reads it.
//
// The 1221 universe's ledger is the one money journal for the player's own money (postings in `universe.transactions`,
// balances as their sums). SLATE's `GameState.bank` holds the universe; nothing else keeps a balance of the player's.
import { Simulation } from './core/simulation';
import { DEFAULT_LEDGER_CURRENCY, type Money } from './core/money';
import { dateKey, instantFromZoned, MS_DAY, startOfNextDay, type Instant } from './core/time';
import { idAlreadyIssued } from './core/ids';
import { SAVE_SCHEMA_VERSION, type Person, type SaveMeta, type SaveUniverse } from './domain/model';
import { CITIES, COUNTRIES, countryOfPlace, distanceKm } from './content/geography';
import { exchange, setRateDay } from './content/currency';
import { CARDS } from './content/cards';
import { bankById } from './content/banks';
import { isHolidaysLoaded, loadCountryHolidays } from './content/holidays';
import { citizenshipFor } from './domain/citizenship';
import { armBanking, openAt, registerBanking, startingBank } from './systems/banking';
import { registerBankMoves } from './systems/bankmoves';
import { armHomeAccounts, registerAbroad } from './systems/abroad';
import { registerStatements } from './systems/statements';
import { armPayments, freshPayments, registerPayments } from './systems/payments';
import { armCardLife, registerCardLife } from './systems/cardlife';
import { registerCash } from './systems/cash';
import { registerAccountLife } from './systems/accountlife';
import { registerCardOffers } from './systems/cardoffers';
import { registerSecurity } from './systems/security';
import { armCredit, openCredit, registerCredit } from './systems/credit';
import { registerLending } from './systems/lending';
import { registerDocuments, startingDocuments } from './systems/documents';
import { registerPaperVisits } from './systems/papervisits';
import { registerSpending } from './systems/spending';

export type { SaveUniverse, Person } from './domain/model';
export { Simulation } from './core/simulation';

/** 1221's starting money levels, in euro cents, converted to the save's currency (1221's `WEALTH_PROFILE`). */
export type StartingWealth = 'nothing' | 'scraping' | 'modest' | 'comfortable' | 'wealthy' | 'inherited';
const WEALTH_PROFILE: Record<StartingWealth, { checking: Money; savings: Money; cardLimit: Money; cardBalance: Money; creditScore: number }> = {
  nothing: { checking: 40_00, savings: 0, cardLimit: 0, cardBalance: 0, creditScore: 520 },
  scraping: { checking: 1_240_00, savings: 300_00, cardLimit: 1_500_00, cardBalance: -840_00, creditScore: 610 },
  modest: { checking: 4_800_00, savings: 6_500_00, cardLimit: 6_000_00, cardBalance: -420_00, creditScore: 690 },
  comfortable: { checking: 18_000_00, savings: 42_000_00, cardLimit: 20_000_00, cardBalance: 0, creditScore: 748 },
  wealthy: { checking: 85_000_00, savings: 380_000_00, cardLimit: 60_000_00, cardBalance: 0, creditScore: 795 },
  inherited: { checking: 240_000_00, savings: 2_400_000_00, cardLimit: 150_000_00, cardBalance: 0, creditScore: 812 },
};

/** What a bank world is begun from. 1221's `NewSaveConfig`, less what belongs to its life and its school. */
export interface BankWorldConfig {
  firstName: string;
  lastName: string;
  pronouns: string;
  birthYear: number; birthMonth: number; birthDay: number;
  /** Where they were born and where they live, as 1221 city ids (`cityForPlace` finds one for a SLATE place). */
  homeRegionId: string;
  startLocationId: string;
  startYear: number; startMonth: number; startDay: number;
  /** 1221's starting money and card; SLATE's start passes `opening` instead and starts with no card. */
  wealth?: StartingWealth;
  /** An opening deposit in the save's currency, in cents, paid into the current account as `openingMemo` says. */
  opening?: { amount: Money; memo: string; source: string };
  bankId?: string;
  /** More citizenships than birth gives (SLATE lets a life hold several), as ISO alpha-2 codes. */
  citizenships?: string[];
  /** The currency the save reports in. 1221 took the starting country's; SLATE's start reports in dollars. */
  currency?: string;
  livesWhereBorn?: boolean;
  [key: string]: unknown;
}

/** 1221's test default: Mosfellsbær, Monday 5 January 2026, getting by. */
export function defaultConfig(): BankWorldConfig {
  return {
    firstName: 'Alex', lastName: 'Rivera', pronouns: 'they/them',
    birthYear: 2001, birthMonth: 6, birthDay: 14,
    homeRegionId: 'is-39-mosfellsbr', startLocationId: 'is-39-mosfellsbr', livesWhereBorn: true,
    wealth: 'scraping',
    startYear: 2026, startMonth: 1, startDay: 5,
  };
}

/** Every 1221 system that is the bank's or the papers': registered on every simulation, new or loaded. */
/** The exchange rates are read on the bank's own day (content/currency.ts `setRateDay`). */
export const readRatesOn = (sim: Simulation): void => setRateDay(dateKey(sim.now, sim.homeZone));

export function registerBankSystems(sim: Simulation): void {
  // Every command reads the rates on its own day: set before any runs (a guard that refuses nothing).
  sim.guardCommands(() => { readRatesOn(sim); return undefined; });
  // The day turning over, which 1221's life ran (`systems/life.ts` `dailyRollover`): here it tells the bank, and the
  // rates move to the new day before anything of it runs.
  sim.onSchedule('life.day_rollover', () => {
    readRatesOn(sim);
    sim.emit('world.day_rollover', { date: sim.now });
    sim.schedule({ at: startOfNextDay(sim.now, sim.homeZone), kind: 'life.day_rollover', label: 'New Day', category: 'system', priority: 5 });
  });
  registerSpending(sim);
  registerCredit(sim);
  registerBanking(sim);
  registerBankMoves(sim);
  registerAbroad(sim);
  registerStatements(sim);
  registerPayments(sim);
  registerCardLife(sim);
  registerCash(sim);
  registerAccountLife(sim);
  registerCardOffers(sim);
  registerSecurity(sim);
  registerLending(sim);
  registerDocuments(sim);
  registerPaperVisits(sim);
}

function armAll(sim: Simulation): void {
  if (!sim.universe.scheduled.some((i) => i.kind === 'life.day_rollover' && i.status === 'pending')) {
    sim.schedule({ at: startOfNextDay(sim.now, sim.homeZone), kind: 'life.day_rollover', label: 'New Day', category: 'system', priority: 5 });
  }
  armPayments(sim);
  armCardLife(sim);
  armCredit(sim);
  armBanking(sim);
  armHomeAccounts(sim);
}

const isoToCountryId = (iso: string): string | undefined => COUNTRIES.all().find((c) => c.iso2?.toUpperCase() === iso.toUpperCase())?.id;

/** A new bank world: the person, their accounts at a real bank where they live, and the papers they begin with. */
export function createBankWorld(config: Partial<BankWorldConfig> = {}, seed = 'slate-test-seed', slot: 1 | 2 | 3 = 1): Simulation {
  const c = { ...defaultConfig(), ...config } as BankWorldConfig;
  const city = CITIES.require(c.startLocationId);
  const citizenshipId = citizenshipFor(c.homeRegionId);
  if (!citizenshipId) throw new Error(`No country has a place with the id ${c.homeRegionId}.`);
  const zone = city.timeZone;
  const now = instantFromZoned({ year: c.startYear, month: c.startMonth, day: c.startDay, hour: 7, minute: 30 }, zone);
  const playerId = 'person_000001';
  const country = COUNTRIES.get(city.countryId);
  const local = country?.currency?.toUpperCase();
  const meta: SaveMeta = {
    id: `save_${slot}_${seed.slice(0, 8)}`, slot, schemaVersion: SAVE_SCHEMA_VERSION, createdAt: now, playtimeSeconds: 0, seed,
    characterName: `${c.firstName} ${c.lastName}`, careerLabel: '', locationLabel: city.name, worldDateLabel: '', netWorthLabel: '',
    appVersion: 'slate', currency: c.currency ?? (local && exchange(100, DEFAULT_LEDGER_CURRENCY, local) !== undefined ? local : DEFAULT_LEDGER_CURRENCY),
  };
  const universe: SaveUniverse = {
    meta, __idCounter: 0, now, homeZone: zone, currentZone: zone, playerId,
    people: {}, accounts: {}, transactions: [], scheduled: [], decisions: {}, notifications: [],
    preferences: { timeSpeed: 'paused' }, counters: {},
  };
  const birthInstant = instantFromZoned({ year: c.birthYear, month: c.birthMonth, day: c.birthDay, hour: 3 }, zone);
  const others = (c.citizenships ?? []).map(isoToCountryId).filter((id): id is string => !!id && id !== citizenshipId);
  const player: Person = {
    id: playerId, saveId: meta.id, isPlayer: true,
    firstName: c.firstName, lastName: c.lastName, displayName: `${c.firstName} ${c.lastName}`, pronouns: c.pronouns,
    performerTitle: 'actor', birthInstant, raceEthnicity: [], homeRegionId: c.homeRegionId, citizenshipId,
    // Citizenships beyond the one birth gives: held from birth, as SLATE's creation says them (a recorded deviation:
    // 1221 gave further citizenships only by naturalization).
    ...(others.length ? { naturalized: others.map((iso) => ({ iso, at: birthInstant })) } : {}),
    currentLocationId: c.startLocationId,
    personality: { openness: 55, conscientiousness: 55, extraversion: 55, agreeableness: 55, emotionalStability: 55, ambition: 60, riskTolerance: 50 },
    personalityTraits: [], genres: [], background: '',
    wellbeing: { energy: 82, stress: 18, sleepDebt: 0, morale: 62, condition: 88, fitness: 50, nourishment: 75, hygiene: 80 },
    awakeSince: now, lastSleptAt: now, wokeWithDebt: 0, createdAt: now,
  } as Person;
  universe.people[playerId] = player;
  idAlreadyIssued(universe, 'person', 1);

  const sim = new Simulation(universe);
  registerBankSystems(sim);
  readRatesOn(sim);
  const cur = meta.currency!;
  const conv = (eur: Money) => Math.round((exchange(eur, DEFAULT_LEDGER_CURRENCY, cur) ?? eur) / 100) * 100;
  const w = c.wealth && !c.opening ? WEALTH_PROFILE[c.wealth] : { checking: 0, savings: 0, cardLimit: 0, cardBalance: 0, creditScore: 700 };
  const bank = startingBank(c.startLocationId, c.bankId, citizenshipId === 'us');
  if (bank) openAt(sim, player, bank, { checking: conv(w.checking), savings: conv(w.savings) });
  else {
    const checking = sim.openAccount({ id: sim.nextId('account'), kind: 'checking', name: 'Checking Account', ownerId: player.id, openedAt: now, balance: conv(w.checking) });
    player.primaryAccountId = checking.id;
    if (w.savings > 0) sim.openAccount({ id: sim.nextId('account'), kind: 'savings', name: 'Savings Account', ownerId: player.id, openedAt: now, balance: conv(w.savings) });
  }
  if (c.opening && c.opening.amount > 0) {
    // SLATE's start: one sum, paid once into the current account, from its source (an inheritance), never typed in.
    sim.post({ memo: c.opening.memo, category: 'opening', postings: [
      { accountId: player.primaryAccountId!, amount: c.opening.amount },
      { accountId: sim.nominalAccount('equity', c.opening.source).id, amount: -c.opening.amount },
    ] });
  }
  if (w.cardLimit > 0) {
    const product = bank ? CARDS[bank.id] : undefined;
    const card = sim.openAccount({
      id: sim.nextId('account'), kind: 'credit_card',
      name: product && !('none' in product) ? product.name : bank ? bank.name + ' Credit Card' : 'Credit Card',
      ownerId: player.id, institution: bank?.name, ...(bank ? { bankId: bank.id } : {}),
      openedAt: now - 400 * MS_DAY, creditLimit: conv(w.cardLimit), apr: 0.2249, last4: '9931',
    });
    if (w.cardBalance < 0) {
      sim.post({ memo: 'Balance carried from before', category: 'opening', postings: [
        { accountId: card.id, amount: conv(w.cardBalance) },
        { accountId: sim.nominalAccount('expense', 'Prior spending').id, amount: -conv(w.cardBalance) },
      ] });
    }
  }
  player.payments = freshPayments();
  openCredit(sim, player, w.creditScore);
  armAll(sim);
  startingDocuments(sim, player);
  return sim;
}

/** 1221's test entries, under their names, so 1221's tests read as they were written. */
export const quickSave = createBankWorld;
export const createSave = (slot: 1 | 2 | 3, seed: string, config: Partial<BankWorldConfig>) => createBankWorld(config, seed, slot);

/** A stored bank world, opened: the systems registered and everything that should be running armed. */
export function loadSave(universe: SaveUniverse): Simulation {
  const sim = new Simulation(universe);
  registerBankSystems(sim);
  readRatesOn(sim);
  armAll(sim);
  return sim;
}

const open = new WeakMap<SaveUniverse, Simulation>();
/** The simulation over a stored universe, made once per universe object. */
export function bankSim(universe: SaveUniverse): Simulation {
  let sim = open.get(universe);
  if (!sim) { sim = loadSave(universe); open.set(universe, sim); }
  readRatesOn(sim);
  return sim;
}

/** Brings the bank to SLATE's clock: every scheduled bank event up to `to` runs, in order, once. */
export function advanceBankWorld(universe: SaveUniverse, to: Instant): void {
  if (to <= universe.now) return;
  bankSim(universe).advanceTo(to);
}

/** The 1221 city nearest a point in a country (ISO alpha-2): how a SLATE place finds the bank's town. */
export function cityForPlace(iso: string, lat: number, lon: number): string | undefined {
  const id = isoToCountryId(iso);
  if (!id) return undefined;
  let best: { id: string; d: number } | undefined;
  for (const city of CITIES.all()) {
    if (city.countryId !== id && countryOfPlace(city.id) !== id) continue;
    const d = distanceKm({ latitude: lat, longitude: lon }, city);
    if (!best || d < best.d) best = { id: city.id, d };
  }
  return best?.id;
}

/**
 * Loads the holidays of every country the bank world touches, before it is opened (1221's `loadPlacesFor`): where the
 * person lives and was born, and every bank an account is held at, whose own country's days it keeps. SLATE: 1221 loaded
 * a country's full list of towns here too; the port uses the towns bundled with 1221, nearest to a SLATE place
 * (`cityForPlace`), so only holidays are loaded.
 */
export async function loadPlacesFor(universe: SaveUniverse, _load?: unknown, holidays: (countryId: string) => Promise<number> = loadCountryHolidays): Promise<void> {
  const countries = new Set<string>();
  for (const person of Object.values(universe.people ?? {})) {
    for (const cityId of [person.currentLocationId, person.homeRegionId, person.priorResidence?.cityId]) {
      const countryId = cityId?.split('-')[0];
      if (countryId && !isHolidaysLoaded(countryId)) countries.add(countryId);
    }
  }
  for (const account of Object.values(universe.accounts ?? {})) {
    const bank = account.bankId ? bankById(account.bankId) : undefined;
    const countryId = bank ? COUNTRIES.all().find((c) => c.iso2?.toUpperCase() === bank.iso)?.id : undefined;
    if (countryId && !isHolidaysLoaded(countryId)) countries.add(countryId);
  }
  await Promise.all([...countries].map((id) => holidays(id).catch(() => 0)));
}
