// Where SLATE meets its bank (from November 14, 2026; the owner's command "Complete banking, papers and homepage
// migration"). The bank is 1221's, in engine/bankworld, and its ledger is the one journal of the player's own money:
// every posting SLATE makes to the player's money goes through `postToBank`, and every balance SLATE reads of it is read
// back from that ledger. Until then the player's money was the v8 journal's 'player:cash:USD' (cash/journal.ts); a save
// that held it is brought over once by `migrateV10toV11` (cash/migrate.ts), with a reconciliation record.
//
// The bank keeps SLATE's clock: before any SLATE event runs, and when the clock stops, the bank is brought to the same
// instant (`onClockMove`), so its interest, fees, statements and payments fall on their own days. What it tells the
// player (1221's notifications) goes into SLATE's log, routed to the bank.
import { advanceBankWorld, bankSim, cityForPlace, createBankWorld, type SaveUniverse } from './bankworld';
import { drawFromBank, inTheBank } from './bankworld/systems/spending';
import { overdraftHeadroom } from './bankworld/systems/lending';
import { addLog, onClockMove } from './state';
import { getPlace } from '../data/places';
import type { GameState } from './types';

/** The currency the bank world reports in: the dollar, the inheritance's (a named reporting currency, as asked). */
export const REPORTING_CURRENCY = 'USD';

/** A SLATE life's bank: the person, a current account at a real bank where they live, and the papers they hold. */
export function startBank(state: GameState, opening?: { minor: number; memo: string; source: string }): SaveUniverse {
  const c = state.character;
  const live = getPlace(c.livesIn ?? state.locationId);
  const born = getPlace(c.birthplaceId);
  const startLocationId = cityForPlace(live.country, live.lat, live.lon);
  const homeRegionId = cityForPlace(born.country, born.lat, born.lon) ?? startLocationId;
  if (!startLocationId || !homeRegionId) throw new Error(`The bank has no town in ${live.countryName} to open an account in.`);
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: live.zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(state.now)).split('-').map(Number);
  const sim = createBankWorld({
    firstName: c.firstName || c.name, lastName: c.lastName || '', pronouns: c.pronouns ?? 'they/them',
    birthYear: c.birth.year, birthMonth: c.birth.month, birthDay: c.birth.day,
    homeRegionId, startLocationId, livesWhereBorn: homeRegionId === startLocationId,
    startYear: day[0], startMonth: day[1], startDay: day[2],
    citizenships: c.nationalities ?? [], currency: REPORTING_CURRENCY,
    // No 1221 starting money: SLATE's comes from its own start (the inheritance), posted below with its source.
    wealth: undefined,
    ...(opening ? { opening: { amount: opening.minor, memo: opening.memo, source: opening.source } } : {}),
  }, `slate-${state.seed}`);
  // The bank world starts at 07:30 on the story's first day in its town; SLATE's clock may be earlier or later that day.
  sim.universe.now = Math.min(sim.universe.now, state.now);
  advanceBankWorld(sim.universe, state.now);
  state.bank = sim.universe;
  return sim.universe;
}

const keyed = (u: SaveUniverse, key: string) => u.counters[`slate:${key}`] === 1;

/**
 * Post a movement of the player's own money, in whole dollars: in to the current account, or out of it as the bank
 * pays (current account, then linked savings, then the overdraft where there is one). A key posted twice moves money
 * once. Throws when the bank can't pay it: nothing is posted then.
 */
export function postToBank(state: GameState, kind: string, dollars: number, label: string, key: string, counter = kind): void {
  const u = state.bank;
  if (!u) throw new Error('This story has no bank.');
  if (keyed(u, key)) return;
  advanceBankWorld(u, state.now);
  const sim = bankSim(u);
  const person = sim.player;
  const minor = Math.round(dollars * 100);
  if (minor === 0) return;
  // The kind and the key ride on the category (`slate:<kind>#<key>`), which 1221's statements show by its memo alone.
  const category = `slate:${kind}#${key}`;
  if (minor > 0) {
    sim.post({ memo: label, category, postings: [
      { accountId: person.primaryAccountId!, amount: minor },
      { accountId: sim.nominalAccount('income', counterLabel(counter)).id, amount: -minor },
    ] });
  } else {
    const draw = drawFromBank(sim, person, -minor, true, true);
    if (draw.short > 0) throw new Error(`Your bank can't pay that: ${(-minor / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} is more than your accounts and overdraft hold.`);
    sim.post({ memo: label, category, postings: [
      { accountId: sim.nominalAccount('expense', counterLabel(counter)).id, amount: -minor },
      ...draw.postings,
    ] });
  }
  u.counters[`slate:${key}`] = 1;
}

/** What each SLATE kind of movement is called in the bank's own books (its nominal account). */
function counterLabel(kind: string): string {
  return ({
    inheritance: 'Your Family\'s Estate', savings: 'Your Savings', gift: 'Your Family', loan: 'Your Family', investment: 'Your Family',
    repayment: 'Your Family', participation: 'Your Family', 'to-project': 'Your Projects', 'from-project': 'Your Projects',
    equipment: 'Equipment', 'equipment-sale': 'Equipment', 'paid-work': 'Paid Work', commission: 'Your Agent',
    company: 'Your Company', overhead: 'First-Look Overhead', 'company-transfers': 'Your Company',
  } as Record<string, string>)[kind] ?? kind;
}

/** What the player can spend now from the bank, in whole dollars: the current account and its linked savings. */
export function bankSpendable(state: GameState): number {
  const u = state.bank;
  if (!u) return 0;
  advanceBankWorld(u, state.now);
  const sim = bankSim(u);
  return inTheBank(sim, sim.player) / 100;
}

/** What the bank would pay out now, overdraft included, in whole dollars. */
export function bankReach(state: GameState): number {
  const u = state.bank;
  if (!u) return 0;
  const sim = bankSim(u);
  return bankSpendable(state) + overdraftHeadroom(sim, sim.player) / 100;
}

/** The SLATE movements in the bank's ledger, oldest first, in whole dollars: what the player's own statement lists. */
export function bankPostings(state: GameState): { id: string; key: string; at: number; kind: string; amount: number; label: string }[] {
  const u = state.bank;
  if (!u) return [];
  const mine = new Set(Object.values(u.accounts).filter((a) => a.ownerId === u.playerId && !a.nominal).map((a) => a.id));
  return u.transactions
    .filter((t) => !t.reversedBy && !t.reverses && (t.category.startsWith('slate:') || t.category === 'opening'))
    .map((t) => {
      const [kind, key] = t.category === 'opening' ? ['inheritance', 'opening:inheritance'] : t.category.slice(6).split('#');
      return { id: t.id, key: key ?? t.id, at: t.at, kind, label: t.memo, amount: t.postings.filter((p) => mine.has(p.accountId)).reduce((s, p) => s + p.amount, 0) / 100 };
    })
    .filter((x) => x.amount !== 0);
}

// The bank keeps SLATE's clock, and what it says comes into the log.
onClockMove((state, to) => {
  const u = state.bank;
  if (!u || to <= u.now) return;
  advanceBankWorld(u, to);
  const seen = u.counters['slate:noticed'] ?? 0;
  const fresh = u.notifications.slice(seen);
  u.counters['slate:noticed'] = u.notifications.length;
  for (const n of fresh) addLog(state, `${n.title}: ${n.body}`, 'money', { route: { view: 'bank' } });
});
