// Homes & Property: the records (from November 17, 2026; the owner's Homes & Property package, research v2 with the
// foundation-v1 specification). One record drives a home's facts, its eligibility, its costs and its exterior picture.
//
// Kept apart, as the package requires: a place, a home on offer, a home you rent or own, and the evidence each figure
// came from. Every home the game offers is simulated: the package holds no current listing anywhere, so no home here is
// a real one for rent or sale, and none carries a real address. What a home's prices are drawn from is said on it:
// - a researched benchmark (HUD's FY2026 rents in the United States, ONS's private rents in Britain);
// - recorded historical sales (France's 2025 DVF sales by commune, Singapore's HDB resales by town), which are evidence
//   for a price, never a home available now;
// - or, where nothing has been researched, the game's placeholder model, said as one.
// Unknown stays unknown: a bedroom count a source doesn't give is not recorded, never 0.
import type { Place } from '../../data/places';

/** What a figure is drawn from. */
export type Basis = 'benchmark' | 'historical-sales' | 'model';
export interface Evidence {
  basis: Basis;
  /** The source's id in src/data/homes/sources.json, or 'SLATE-MODEL' for the game's own model. */
  sourceId: string;
  /** In plain words, for the player: what the figure is and isn't. */
  says: string;
}

export type Form = 'studio' | 'apartment' | 'condo' | 'townhouse' | 'detached' | 'hdb-flat' | 'land';
export type Tenure = 'rent' | 'freehold' | 'leasehold' | 'strata' | 'hdb-lease' | 'trust' ;
export const FORM_WORDS: Record<Form, string> = {
  studio: 'Studio Apartment', apartment: 'Apartment', condo: 'Condominium Apartment', townhouse: 'Townhouse', detached: 'Detached House', 'hdb-flat': 'HDB Flat', land: 'Building Plot',
};
/** A home in a building others share: its exterior and shared amenities are the building's, not the player's. */
export const inBuilding = (f: Form) => f === 'studio' || f === 'apartment' || f === 'condo' || f === 'hdb-flat';

/** The rooms a home has, each with its size and the services in it (for what an appliance can connect to). */
export type RoomKind = 'living' | 'kitchen' | 'bedroom' | 'bathroom' | 'half-bath' | 'laundry' | 'office' | 'dining' | 'storage' | 'hall';
export type Service = 'power' | 'water' | 'drain' | 'vent' | 'gas' | 'window';
export interface Room { id: string; kind: RoomKind; areaM2: number; widthM: number; depthM: number; services: Service[] }
export const ROOM_WORDS: Record<RoomKind, string> = { living: 'Living Room', kitchen: 'Kitchen', bedroom: 'Bedroom', bathroom: 'Bathroom', 'half-bath': 'Half Bath', laundry: 'Laundry', office: 'Office', dining: 'Dining Room', storage: 'Storage', hall: 'Hall And Stairs' };
const SERVICES_OF: Record<RoomKind, Service[]> = {
  living: ['power', 'window'], kitchen: ['power', 'water', 'drain', 'vent', 'window'], bedroom: ['power', 'window'], bathroom: ['power', 'water', 'drain', 'vent'],
  'half-bath': ['power', 'water', 'drain'], laundry: ['power', 'water', 'drain', 'vent'], office: ['power', 'window'], dining: ['power', 'window'], storage: ['power'], hall: ['power'],
};

/**
 * The exterior and the spatial plan: the one design record gameplay and the exterior picture both read (the package's
 * image contract: "Build prompts from a structured versioned design snapshot"). Every visible feature is a field here,
 * so the picture can be checked against it. A change of revision is the only thing that changes the picture.
 */
export interface Design {
  revision: number;
  style: 'contemporary' | 'traditional' | 'modernist' | 'cottage' | 'tower' | 'terrace';
  floors: number;
  /** The building's footprint on the ground, metres (an apartment's is its building's). */
  widthM: number;
  depthM: number;
  roof: 'gable' | 'hip' | 'flat';
  roofMaterial: 'tile' | 'slate' | 'metal' | 'membrane' | 'shingle';
  roofColor: string;
  walls: 'brick' | 'render' | 'timber' | 'concrete' | 'stone' | 'glass';
  wallColor: string;
  /** Windows across the front on each floor. */
  windowsPerFloor: number;
  windowStyle: 'sash' | 'casement' | 'picture' | 'ribbon';
  frameColor: string;
  door: 'panel' | 'glazed' | 'flush';
  doorColor: string;
  balconies: number;
  garage: 'none' | 'single' | 'double' | 'carport';
  driveway: 'none' | 'gravel' | 'paved';
  landscaping: 'none' | 'lawn' | 'garden' | 'trees';
  /** Visible outdoor features of this home's own land. A building's shared pool is not one: it's a shared amenity. */
  outdoor: ('pool' | 'terrace' | 'porch' | 'fence')[];
  /** Under construction: how far the picture shows it built. Absent once complete. */
  stage?: string;
}

export interface Condition { roof: Grade; structure: Grade; plumbing: Grade; electrical: Grade; heating: Grade; finishes: Grade }
export type Grade = 'good' | 'fair' | 'poor';
export const COMPONENT_WORDS: Record<keyof Condition, string> = { roof: 'Roof', structure: 'Structure', plumbing: 'Plumbing', electrical: 'Electrics', heating: 'Heating', finishes: 'Floors And Walls' };

/** A home: on offer, or pinned in the save once the player acts on it (applied, offered, viewed, owned). */
export interface Home {
  id: string;
  placeId: string;
  country: string;
  /** The rule scope it falls under, most specific first: e.g. ['GB-ENG', 'GB'] or ['SG-HDB', 'SG']. */
  scopes: string[];
  form: Form;
  tenure: Tenure;
  /** What it's offered as. */
  market: 'rent' | 'sale';
  /** A plain description; never a real street address. */
  title: string;
  currency: string;
  /** Monthly rent, or the asking price, in the currency's hundredths. */
  priceMinor: number;
  evidence: Evidence[];
  /** The source's own unit label where it gives one (HDB "4 ROOM"); not a bedroom count. */
  sourceLabel?: string;
  /** Simulated for the game unless the source gives it; null where not recorded. */
  bedrooms: number | null;
  bathrooms: number | null;
  floorAreaM2: number;
  plotAreaM2: number | null;
  /** HDB's storey band ("10 TO 12"): a range, not a floor. */
  storeyBand?: string;
  /** Lease years left at offer, where the tenure is a lease. */
  leaseYearsLeft?: number;
  rooms: Room[];
  /** The home's own: a garden, a private pool. */
  privateAmenities: string[];
  /** The building's, shared with its other residents: the player can't install, remove or sell them. */
  sharedAmenities: string[];
  /** Services the rent includes; never billed again. */
  included: ('water' | 'heating' | 'internet' | 'electricity')[];
  condition: Condition;
  design: Design;
  /** Furnished, for a rental; and what the landlord's appliances are. */
  furnished: boolean;
  landlordItems: string[];
  availableFrom: string;
  /** Until when the offer stands (a stale offer can't be signed). */
  validUntil: string;
  /** Monthly charges an owner pays the building (a condominium's), simulated. */
  buildingChargeMinor?: number;
  /** Land: what's known of it before investigation. */
  land?: { access: 'road' | 'track' | 'unknown'; services: 'connected' | 'nearby' | 'unknown'; buildableM2: number | null; investigated: string[] };
  /** Whether the coast is near enough for Mexico's restricted zone (the place's catalog flag; unknown for world places). */
  coastal?: boolean;
  /** Electricity's price per kWh in hundredths of the currency, and what it is (an average, a placeholder): pinned with the home. */
  electricity?: { minorPerKwh: number; says: string };
}

// ---------------- Scoped rules ----------------

export interface ScopedRule { id: string; geographic_scope: string; source_id: string; effect: string; parameters: Record<string, unknown>; scope_conditions: string[]; verified_on: string }
/** The rule scopes a place falls under, most specific first. Unknown places fall under their country alone. */
export function scopesOf(place: Place, form?: Form): string[] {
  const out: string[] = [];
  if (form === 'hdb-flat') out.push('SG-HDB');
  if (place.country === 'ZA' && /cape town/i.test(place.name)) out.push('ZA-CapeTown');
  if (place.country === 'US' && /^new york$/i.test(place.name)) out.push('US-NY-NYC');
  const region = place.regionCode ?? (place.regionKey ? place.regionKey.replace('.', '-') : undefined);
  if (region) out.push(region);
  // Catalog places name their region in words; the rules' scopes use ISO codes.
  const named: Record<string, string> = { 'GB:England': 'GB-ENG', 'GB:Scotland': 'GB-SCT', 'GB:Wales': 'GB-WLS', 'CA:Ontario': 'CA-ON', 'AU:Queensland': 'AU-QLD' };
  const byName = named[`${place.country}:${place.region}`];
  if (byName && !out.includes(byName)) out.push(byName);
  out.push(place.country);
  return out;
}
export function rulesFor(rules: ScopedRule[], scopes: string[], effect?: string): ScopedRule[] {
  return rules.filter((r) => scopes.includes(r.geographic_scope) && (!effect || r.effect === effect));
}

// ---------------- Deposits ----------------

export interface DepositTerms {
  /** What's held, in hundredths of the home's currency. */
  amountMinor: number;
  /** How it's paid: once, or in instalments (Germany's three). */
  instalmentsMinor: number[];
  /** What it is, by the rule that sets it, or the game's model. */
  kind: 'security' | 'last-rent' | 'bond' | 'none';
  ruleId: string | null;
  says: string;
  /** Days after receipt it must be protected or lodged, where a rule says. */
  protectWithinDays?: number;
  /** Days after agreement a refund is due, where a rule says. */
  refundWithinDays?: number;
}
/**
 * The deposit for a rent, by the rule of the place's scope (01-IMPLEMENTATION-DECISIONS: "Germany's security interest,
 * Ontario's last-rent application, France's base-rent deposit, and Queensland's bond custody are distinct paths. Do not
 * use one generic deposit/refund formula everywhere"). Where no rule is researched, the game's model: one month,
 * said as the game's.
 */
export function depositFor(rules: ScopedRule[], scopes: string[], monthlyMinor: number, furnished: boolean): DepositTerms {
  const has = (id: string) => rulesFor(rules, scopes).find((r) => r.id === id);
  const en = has('en.deposit.cap');
  if (en) {
    // Weekly rent is annual rent over 52 (not monthly over 4); the cap is 5 weeks under £50,000 a year, 6 at or over,
    // rounded down so it never exceeds the exact cap.
    const annual = monthlyMinor * 12;
    const p = en.parameters as { annual_rent_threshold_gbp: number; below_threshold_weeks: number; at_or_above_weeks: number };
    const weeks = annual < p.annual_rent_threshold_gbp * 100 ? p.below_threshold_weeks : p.at_or_above_weeks;
    const cap = Math.floor((annual * weeks) / 52);
    const prot = has('en.deposit.custody')?.parameters as { days_after_receipt: number; agreed_refund_days: number } | undefined;
    return { amountMinor: cap, instalmentsMinor: [cap], kind: 'security', ruleId: en.id, says: `${weeks} weeks' rent, the most a landlord in England may take for a tenancy at this rent. It must be protected in a scheme within ${prot?.days_after_receipt ?? 30} days.`, protectWithinDays: prot?.days_after_receipt, refundWithinDays: prot?.agreed_refund_days };
  }
  const on = has('on.last_rent');
  if (on) return { amountMinor: monthlyMinor, instalmentsMinor: [monthlyMinor], kind: 'last-rent', ruleId: on.id, says: "A rent deposit in Ontario: it pays your last month's rent. It isn't a damage deposit." };
  const qld = has('qld.bond');
  if (qld) {
    const p = qld.parameters as { maximum_weeks: number; lodge_within_days: number };
    const amount = Math.floor((monthlyMinor * 12 * p.maximum_weeks) / 52);
    return { amountMinor: amount, instalmentsMinor: [amount], kind: 'bond', ruleId: qld.id, says: `A bond of up to ${p.maximum_weeks} weeks' rent, lodged with Queensland's Residential Tenancies Authority within ${p.lodge_within_days} days; it comes back through the authority.`, protectWithinDays: p.lodge_within_days };
  }
  const de = has('de.cash_security');
  if (de) {
    const p = de.parameters as { base_rent_months: number; equal_monthly_instalments: number };
    const total = monthlyMinor * p.base_rent_months;
    const each = Math.floor(total / p.equal_monthly_instalments);
    return { amountMinor: total, instalmentsMinor: [each, each, total - 2 * each], kind: 'security', ruleId: de.id, says: `Up to ${p.base_rent_months} months' base rent, which you may pay in ${p.equal_monthly_instalments} equal monthly instalments; the landlord keeps it apart from their own money.` };
  }
  const fr = has(furnished ? 'fr.furnished' : 'fr.unfurnished');
  if (fr) {
    const months = (fr.parameters as { base_rent_months: number }).base_rent_months;
    return { amountMinor: monthlyMinor * months, instalmentsMinor: [monthlyMinor * months], kind: 'security', ruleId: fr.id, says: `${months} month${months > 1 ? 's' : ''}' rent without charges, the most for a ${furnished ? 'furnished' : 'unfurnished'} lease in France.` };
  }
  const br = has('br.cash_security');
  if (br) {
    const amount = monthlyMinor * 3;
    return { amountMinor: amount, instalmentsMinor: [amount], kind: 'security', ruleId: br.id, says: "Up to three months' rent in cash, held in a savings account in Brazil." };
  }
  return { amountMinor: monthlyMinor, instalmentsMinor: [monthlyMinor], kind: 'security', ruleId: null, says: "One month's rent. The deposit rules here haven't been researched: this is the game's own assumption." };
}

// ---------------- Mortgages ----------------

/** The game's mortgage model: a level-payment loan at a fixed rate. Not any lender's product, and said so. */
export const MORTGAGE_MODEL = { ratePerYear: 0.065, maxLoanToValue: 0.8, terms: [15, 20, 25, 30] } as const;
/** The level monthly payment on a loan: principal × r / (1 − (1 + r)^−n). In hundredths, rounded up to a whole cent. */
export function levelPayment(principalMinor: number, annualRate: number, months: number): number {
  const r = annualRate / 12;
  if (r === 0) return Math.ceil(principalMinor / months);
  return Math.ceil((principalMinor * r) / (1 - (1 + r) ** -months));
}

// ---------------- Permissions ----------------

/** Work the player might want done to a home: each has its own permission path, not one "upgrade" rule. */
export type WorkKind = 'plumbed-appliance' | 'paint' | 'vinyl-floor' | 'tile-floor' | 'wall-removal' | 'kitchen-refit' | 'workroom' | 'pool' | 'exterior-paint' | 'new-roof' | 'porch' | 'landscaping' | 'driveway';
export const WORK: Record<WorkKind, { label: string; exterior: boolean; structural: boolean; days: number; reversible: boolean }> = {
  'plumbed-appliance': { label: 'Plumb In An Appliance', exterior: false, structural: false, days: 1, reversible: true },
  paint: { label: 'Repaint The Interior', exterior: false, structural: false, days: 4, reversible: true },
  'vinyl-floor': { label: 'Lay Vinyl Flooring', exterior: false, structural: false, days: 3, reversible: true },
  'tile-floor': { label: 'Replace Floor Tiles', exterior: false, structural: false, days: 7, reversible: false },
  'wall-removal': { label: 'Remove An Interior Wall', exterior: false, structural: true, days: 14, reversible: false },
  'kitchen-refit': { label: 'Refit The Kitchen', exterior: false, structural: false, days: 21, reversible: false },
  workroom: { label: 'Soundproof A Workroom', exterior: false, structural: false, days: 10, reversible: false },
  pool: { label: 'Build A Swimming Pool', exterior: true, structural: false, days: 45, reversible: false },
  'exterior-paint': { label: 'Repaint The Exterior', exterior: true, structural: false, days: 6, reversible: true },
  'new-roof': { label: 'Replace The Roof', exterior: true, structural: false, days: 12, reversible: false },
  porch: { label: 'Add A Porch', exterior: true, structural: false, days: 14, reversible: false },
  landscaping: { label: 'Landscape The Garden', exterior: true, structural: false, days: 8, reversible: true },
  driveway: { label: 'Pave A Driveway', exterior: true, structural: false, days: 6, reversible: false },
};

/** One step of a permission check, in the package's order (01-IMPLEMENTATION-DECISIONS, "Permission evaluation order"). */
export interface PermissionStep { step: string; outcome: 'met' | 'needs' | 'refused' | 'unknown'; says: string; ruleId?: string }
export interface PermissionCheck { allowed: boolean; steps: PermissionStep[]; /** What must happen first: landlord's consent, an approval, a structural review. */ needs: ('landlord' | 'association' | 'authority' | 'structural' | 'registered-contractor')[] }

/**
 * Whether work may be done to a home, and what it needs first. Ownership isn't unlimited permission, and renting isn't
 * a ban: a tenant may ask their landlord; an owner of a flat in a building needs its association for a structural
 * change; land doesn't come with approval to build. A rule the research has, applies only where its scope does;
 * unknown local law isn't approval, so an unresearched place's structural or outdoor work needs an approval the game
 * models and says so.
 */
export function permissionFor(rules: ScopedRule[], home: Pick<Home, 'form' | 'scopes' | 'plotAreaM2' | 'privateAmenities' | 'sharedAmenities' | 'design'>, interest: 'tenant' | 'owner' | 'none', work: WorkKind, gardenM2: number | null): PermissionCheck {
  const w = WORK[work];
  const steps: PermissionStep[] = [];
  const needs: PermissionCheck['needs'] = [];
  const refuse = (step: string, says: string, ruleId?: string): PermissionCheck => ({ allowed: false, steps: [...steps, { step, outcome: 'refused', says, ruleId }], needs });
  // 1–2. Identity and the player's interest.
  if (interest === 'none') return refuse('Your Interest', "You don't rent or own this home, so you can't have work done to it.");
  steps.push({ step: 'Your Interest', outcome: 'met', says: interest === 'tenant' ? 'You rent this home.' : 'You own this home.' });
  // 4 (physical) before 3 where it rules the work out entirely.
  if (work === 'pool') {
    if (inBuilding(home.form)) return refuse('The Space', home.sharedAmenities.some((a) => /pool/i.test(a)) ? "The building's pool is shared: it isn't yours to change, and there's no land of your own to build one on." : "A flat has no land of its own to build a pool on.");
    if (home.design.outdoor.includes('pool')) return refuse('The Space', 'This home already has a pool.');
    if (gardenM2 === null || gardenM2 < 60) return refuse('The Space', gardenM2 === null ? "The garden's usable size isn't recorded, so a pool can't be planned yet." : `There isn't enough usable garden space for a pool: ${gardenM2} m² is free, and a pool and its surround need at least 60 m².`);
    steps.push({ step: 'The Space', outcome: 'met', says: `${gardenM2} m² of garden is free for a pool and its surround.` });
  }
  if ((work === 'driveway' || work === 'porch' || work === 'landscaping') && inBuilding(home.form)) return refuse('The Space', "The building's outside isn't yours alone: work there is the building's to decide.");
  if ((work === 'exterior-paint' || work === 'new-roof') && inBuilding(home.form)) return refuse('The Space', "The building's outside is shared: its owners' association decides it, not one resident.");
  // 3. Private restrictions: the lease, the building's association.
  if (interest === 'tenant') {
    const nz = rulesFor(rules, home.scopes, 'written_permission_request')[0];
    if (w.structural) needs.push('landlord');
    steps.push({ step: 'The Lease', outcome: 'needs', says: nz && !w.structural && w.reversible ? `This change needs your landlord's written permission. In New Zealand a landlord answers a request for a minor change within ${(nz.parameters as { normal_response_days: number }).normal_response_days} days.` : "This change needs your landlord's approval.", ruleId: nz?.id });
    if (!needs.includes('landlord')) needs.push('landlord');
  } else if (inBuilding(home.form) && (w.structural || work === 'tile-floor' || work === 'kitchen-refit')) {
    needs.push('association');
    steps.push({ step: "The Building's Rules", outcome: 'needs', says: home.form === 'hdb-flat' ? "HDB's rules govern this flat's renovation." : "This flat's owners' association has to approve this work: owning the flat doesn't cover the building's structure." });
  } else steps.push({ step: "The Building's Rules", outcome: 'met', says: inBuilding(home.form) ? "Your building's rules don't need to approve this work." : 'No association governs this home.' });
  // 4. Physical: structure.
  if (w.structural) { needs.push('structural'); steps.push({ step: 'The Structure', outcome: 'needs', says: 'An engineer has to review the wall first: whether it carries load decides how, and whether, it can come out.' }); }
  // 5. Local rules the research has, in their scope only.
  const hdbWall = work === 'wall-removal' ? rulesFor(rules, home.scopes).find((r) => r.id === 'sg.hdb.wall') : undefined;
  if (hdbWall) { needs.push('authority', 'registered-contractor'); steps.push({ step: 'Local Rules', outcome: 'needs', says: "HDB's prior written approval, and a contractor on HDB's register, before any wall is hacked.", ruleId: hdbWall.id }); }
  const hdbTile = work === 'tile-floor' ? rulesFor(rules, home.scopes).find((r) => r.id === 'sg.hdb.tile') : undefined;
  if (hdbTile) { needs.push('authority'); steps.push({ step: 'Local Rules', outcome: 'needs', says: `HDB approves replacing tiles, and the finish and screed may be no more than ${(hdbTile.parameters as { total_finish_screed_max_mm: number }).total_finish_screed_max_mm} mm thick.`, ruleId: hdbTile.id }); }
  const hdbVinyl = work === 'vinyl-floor' ? rulesFor(rules, home.scopes).find((r) => r.id === 'sg.hdb.vinyl') : undefined;
  if (hdbVinyl) steps.push({ step: 'Local Rules', outcome: 'met', says: "Laying vinyl over the floor needs no HDB permit; the building's and your lease's terms still apply.", ruleId: hdbVinyl.id });
  const cape = work === 'pool' ? rulesFor(rules, home.scopes).find((r) => r.id === 'cape.pool') : undefined;
  if (cape) { needs.push('authority'); steps.push({ step: 'Local Rules', outcome: 'needs', says: 'The City of Cape Town has to approve building plans for a pool, even on your own land.', ruleId: cape.id }); }
  const nycPaint = (work === 'paint' || work === 'exterior-paint') ? rulesFor(rules, home.scopes).find((r) => r.id === 'nyc.paint') : undefined;
  if (nycPaint) steps.push({ step: 'Local Rules', outcome: 'met', says: "Ordinary painting needs no permit in New York City; your lease and building's rules still apply.", ruleId: nycPaint.id });
  const researched = !!(hdbWall || hdbTile || hdbVinyl || cape || nycPaint);
  if (!researched) {
    if (w.structural || work === 'pool' || work === 'porch') {
      needs.push('authority');
      steps.push({ step: 'Local Rules', outcome: 'unknown', says: "The requirements for this work here haven't been confirmed. The game asks for the local authority's approval before it starts, as its own assumption." });
    } else steps.push({ step: 'Local Rules', outcome: 'unknown', says: "The local requirements for this work haven't been researched here; the game treats it as needing no permit, as its own assumption." });
  }
  return { allowed: true, steps, needs: [...new Set(needs)] };
}

// ---------------- The game's own price models ----------------

/**
 * Where nothing local is researched, the game's placeholder: what a month's rent and a purchase cost per square metre,
 * in dollars, converted at the day's rate. Not local evidence and never called it (07-UNOBTAINED-INFORMATION: no
 * complete global rent or price catalog exists in the package). Coverage says which places have researched evidence.
 */
export const PLACEHOLDER = { rentPerM2Usd: 22, salePerM2Usd: 3800, landPerM2Usd: 260 } as const;
/** Work prices per square metre (or per job), the game's model in dollars; the NAHB benchmark checks a US new build. */
export const WORK_COST_USD: Record<WorkKind, { perM2?: number; fixed?: number }> = {
  'plumbed-appliance': { fixed: 0 },
  paint: { perM2: 28 }, 'vinyl-floor': { perM2: 45 }, 'tile-floor': { perM2: 120 }, 'wall-removal': { fixed: 9500 }, 'kitchen-refit': { fixed: 32000 },
  workroom: { fixed: 14000 }, pool: { fixed: 58000 }, 'exterior-paint': { perM2: 22 }, 'new-roof': { perM2: 140 }, porch: { fixed: 16000 }, landscaping: { fixed: 7500 }, driveway: { fixed: 9000 },
};
/** Monthly running costs where no tariff is researched, the game's model in dollars. */
export const RUNNING_USD = { kwhBasePerM2Year: 32, placeholderKwhPrice: 0.22, waterMonthly: 45, internetMonthly: 55, heatingPerM2Month: 0.6, poolMonthly: 140, insuranceContentsMonthly: 18, insuranceBuildingsPerM2Year: 3.2 } as const;

/** The usable garden of a home with land: plot less the footprint, the drive and what's built on it. Null where unknown. */
export function gardenOf(home: Pick<Home, 'plotAreaM2' | 'design' | 'form'>): number | null {
  if (inBuilding(home.form) || home.plotAreaM2 === null) return null;
  const d = home.design;
  const footprint = d.widthM * d.depthM;
  const garage = d.garage === 'double' ? 36 : d.garage === 'single' ? 18 : d.garage === 'carport' ? 15 : 0;
  const drive = d.driveway === 'none' ? 0 : 30;
  const pool = d.outdoor.includes('pool') ? 60 : 0;
  const porch = d.outdoor.includes('porch') ? 8 : 0;
  // Front and side setbacks and paths, the game's model: a fifth of the plot isn't usable garden.
  return Math.max(0, Math.round(home.plotAreaM2 * 0.8 - footprint - garage - drive - pool - porch));
}

/** Stable short hash of a design, for its picture's identity and continuity between revisions. */
export function designHash(d: Design): string {
  const s = JSON.stringify({ ...d, revision: 0 });
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** A room schedule's sums, and whether it fits the floor area with circulation (stairs, halls, walls: 15%). */
export function roomCheck(rooms: Pick<Room, 'kind' | 'areaM2'>[], floorAreaM2: number): { roomsM2: number; withCirculation: number; fits: boolean; bedrooms: number; fullBaths: number; halfBaths: number } {
  const roomsM2 = rooms.reduce((a, r) => a + r.areaM2, 0);
  const withCirculation = Math.round(roomsM2 * 1.15);
  return { roomsM2, withCirculation, fits: withCirculation <= floorAreaM2, bedrooms: rooms.filter((r) => r.kind === 'bedroom').length, fullBaths: rooms.filter((r) => r.kind === 'bathroom').length, halfBaths: rooms.filter((r) => r.kind === 'half-bath').length };
}
export function roomsFrom(kinds: [RoomKind, number][], prefix: string): Room[] {
  return kinds.map(([kind, areaM2], i) => {
    const widthM = Math.max(1.2, Math.round(Math.sqrt(areaM2 * 1.25) * 10) / 10);
    return { id: `${prefix}r${i + 1}`, kind, areaM2, widthM, depthM: Math.round((areaM2 / widthM) * 10) / 10, services: SERVICES_OF[kind] };
  });
}

/** The choices each visible feature can take: the design editor offers these, and nothing else is saved or drawn. */
export const DESIGN_COLORS = ['white', 'cream', 'grey', 'terracotta', 'sage', 'navy', 'sand', 'charcoal', 'red', 'brown', 'green', 'black', 'oak', 'yellow'] as const;
export const DESIGN_CHOICES = {
  style: ['contemporary', 'traditional', 'modernist', 'cottage', 'tower', 'terrace'],
  roof: ['gable', 'hip', 'flat'],
  roofMaterial: ['tile', 'slate', 'metal', 'membrane', 'shingle'],
  walls: ['brick', 'render', 'timber', 'concrete', 'stone', 'glass'],
  windowStyle: ['sash', 'casement', 'picture', 'ribbon'],
  door: ['panel', 'glazed', 'flush'],
  garage: ['none', 'single', 'double', 'carport'],
  driveway: ['none', 'gravel', 'paved'],
  landscaping: ['none', 'lawn', 'garden', 'trees'],
  outdoor: ['pool', 'terrace', 'porch', 'fence'],
} as const;
const COLOR_FIELDS = ['roofColor', 'wallColor', 'frameColor', 'doorColor'] as const;
/** A value the design can't take (a save edited by hand, a colour off the list), in words; null when all are allowed. */
export function badDesignValue(d: Partial<Design>): string | null {
  for (const k of COLOR_FIELDS) if (d[k] !== undefined && !(DESIGN_COLORS as readonly string[]).includes(d[k]!)) return `${d[k]} isn't one of the colours on offer.`;
  for (const [k, allowed] of Object.entries(DESIGN_CHOICES)) {
    const v = (d as Record<string, unknown>)[k];
    if (v === undefined) continue;
    const vals = Array.isArray(v) ? v : [v];
    if (vals.some((x) => !(allowed as readonly string[]).includes(String(x)))) return `That isn't one of the choices for the ${k === 'roofMaterial' ? 'roof material' : k === 'windowStyle' ? 'windows' : k}.`;
  }
  for (const k of ['floors', 'widthM', 'depthM', 'windowsPerFloor', 'balconies'] as const) if (d[k] !== undefined && !(Number.isFinite(d[k]) && d[k]! >= 0)) return `The ${k === 'widthM' ? 'width' : k === 'depthM' ? 'depth' : k === 'windowsPerFloor' ? 'windows per floor' : k} must be a number.`;
  return null;
}
