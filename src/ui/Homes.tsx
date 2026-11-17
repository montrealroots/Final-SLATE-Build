// Homes & Property (from November 17, 2026; the owner's Homes & Property package, section 2): where you live and what
// you owe for it, finding a home to rent or buy, building on your own land, improving and furnishing, the household's
// costs, and the homes you own and let. Every action is the engine's (engine/homes), refused in words where it can't
// happen yet; money moves only through the bank, and the clock carries everything that takes time.
import { useEffect, useMemo, useRef, useState } from 'react';
import { store, useClock, useGame } from './store';
import { Check, NumberField, PageHead, Panel, SelectField, TextField } from './components';
import { TabBar } from './bankworld/ui/components/TabBar';
import { PLACES, findPlace, getPlace } from '../data/places';
import type { GameState } from '../engine/types';
import { COMPONENT_WORDS, DESIGN_CHOICES, DESIGN_COLORS, FORM_WORDS, ROOM_WORDS, WORK, gardenOf, inBuilding, permissionFor, roomCheck, type Design, type Evidence, type Home, type RoomKind, type WorkKind } from '../engine/homes/model';
import { HOME_RULES, applianceCatalog, marketEvidence, offersIn, type MarketEvidence } from '../engine/homes/market';
import { formatDateKey, homesOf, money, todayAt, type Build, type Tenancy } from '../engine/homes/core';
import { applyRefusal, applyToRent, askPermission, disputeDeductions, giveNotice, leaseTerms, moveIn, moveInRefusal, payArrears, rentQuote, reportRepair, approveRepair, signLease, signRefusal } from '../engine/homes/renting';
import { acceptCounter, acceptSaleOffer, acceptSaleRefusal, declineSaleOffer, listForSale, makeOffer, offerRefusal, purchaseQuote, saleRefusal, valuation, withdrawPurchase, type Plan } from '../engine/homes/buying';
import { GENERIC_FURNITURE, billLines, bookStay, buyInsurance, buyItem, cancelWork, claimRepair, disposeItem, insuranceQuote, installItem, installRefusal, itemCheck, itemPrices, measureForInstall, restoreChange, returnItem, startWork, workQuote, workRefusal, type CatalogItem } from '../engine/homes/living';
import { INVESTIGATIONS, applyForApproval, buildQuote, designProblems, investigate, resumeBuild, saveDesign, signBuild, startDesign, type Investigation } from '../engine/homes/building';
import { advertise, approveLandlordRepair, changeRent, chooseTenant, endLetting, fairRent, letRefusal } from '../engine/homes/letting';
import { arrangeViewing, toggleFavorite } from '../engine/homes';
import { exteriorFor, keepExterior } from '../engine/homes/illustration';
import { mortgageOwed } from '../engine/bank';

type Tab = 'yours' | 'find' | 'build' | 'improve' | 'costs' | 'properties';
const TABS: { id: Tab; label: string }[] = [
  { id: 'yours', label: 'Your Home' },
  { id: 'find', label: 'Find A Home' },
  { id: 'build', label: 'Land And Building' },
  { id: 'improve', label: 'Improvements And Furnishings' },
  { id: 'costs', label: 'Household Costs' },
  { id: 'properties', label: 'Your Properties' },
];
const BASIS: Record<Evidence['basis'], string> = { benchmark: 'Benchmark', 'historical-sales': 'Recorded Sales', model: 'Game Estimate' };
const title = (s: string) => s.replace(/(^|[\s-])\S/g, (c) => c.toUpperCase());
const date = (ms: number, h: Pick<Home, 'placeId'>) => formatDateKey(todayAt({ now: ms } as GameState, h));

/** An error from the engine, said beside the control that caused it. */
function useErr() {
  const [err, setErr] = useState<string | null>(null);
  return { err, act: (fn: (s: GameState) => void) => setErr(store.act(fn)), show: err ? <p className="error" role="alert">{err}</p> : null };
}
/** A button that can't be pressed now says why, under it. */
function Act({ label, why, onClick, primary, aria }: { label: string; why?: string | null; onClick: () => void; primary?: boolean; aria?: string }) {
  return (
    <span className="home-act">
      <button className={`btn btn-sm${primary ? ' btn-primary' : ''}`} disabled={!!why} aria-label={aria} onClick={onClick}>{label}</button>
      {why && <span className="xs dim">{why}</span>}
    </span>
  );
}

export function HomesPage() {
  const g = useGame();
  useClock();
  const route = store.route;
  const [tab, setTab] = useState<Tab>((TABS.some((t) => t.id === route.tab) ? route.tab : 'yours') as Tab);
  if (!g) return null;
  return (
    <>
      <PageHead eyebrow="You" title="Homes And Property" lede="Where you live and what it costs you, homes to rent or buy, land to build on, and the homes you own."
        actions={<button className="btn btn-sm" onClick={() => store.go({ view: 'home' })}>Back To Home</button>} />
      <TabBar tabs={TABS} tab={tab} onTab={setTab} label="Homes And Property" idPrefix="homes" />
      <div id={`homes-pane-${tab}`} role="tabpanel" aria-labelledby={`homes-tab-${tab}`} className="homes-pane">
        {tab === 'yours' && <YourHome g={g} />}
        {tab === 'find' && <FindHome g={g} />}
        {tab === 'build' && <LandAndBuilding g={g} />}
        {tab === 'improve' && <Improvements g={g} />}
        {tab === 'costs' && <Costs g={g} />}
        {tab === 'properties' && <Properties g={g} />}
      </div>
    </>
  );
}

// ---------------- The picture ----------------

/**
 * The exterior picture, from the design record and nothing else. A home in the save keeps its accepted picture until its
 * design changes; an offer's is drawn when shown. A picture that fails its checklist isn't shown at all.
 */
export function HomePicture({ g, home }: { g: GameState; home: Home }) {
  const pinned = homesOf(g).homes[home.id] === home;
  const kept = pinned ? homesOf(g).images[home.id] : undefined;
  const fresh = kept && kept.revision === home.design.revision;
  const tried = useRef('');
  useEffect(() => {
    const key = `${home.id}:${home.design.revision}`;
    if (!pinned || fresh || tried.current === key) return;
    tried.current = key;
    store.act((s) => keepExterior(s, home.id));
  }, [pinned, fresh, home.id, home.design.revision]);
  const shown = useMemo(() => (pinned ? (fresh ? { svg: kept!.svg, label: kept!.label, checklist: kept!.checklist } : exteriorFor(null, home)) : exteriorFor(null, home)), [pinned, fresh, kept, home]);
  const missing = shown.checklist.filter((c) => !c.ok);
  return (
    <figure className="home-picture">
      {shown.svg ? <div className="home-picture-art" role="img" aria-label={`Exterior illustration of ${home.title}, design revision ${home.design.revision}`} dangerouslySetInnerHTML={{ __html: shown.svg }} />
        : <p className="muted small">{'refused' in shown && shown.refused ? shown.refused : 'No picture yet.'}</p>}
      <figcaption className="xs dim">{shown.label} Design revision {home.design.revision}.{missing.length ? ` Didn't match: ${missing.map((m) => m.feature).join('; ')}.` : ' Checked against the design: every feature matches.'}</figcaption>
    </figure>
  );
}

function Facts({ home }: { home: Home }) {
  const d = home.design;
  return (
    <dl className="kv small" aria-label={`About ${home.title}`}>
      <dt>Kind</dt><dd>{FORM_WORDS[home.form]}{home.sourceLabel ? ` (recorded as ${home.sourceLabel})` : ''}</dd>
      <dt>Tenure</dt><dd>{title(home.tenure.replace('-', ' '))}{home.leaseYearsLeft ? `, about ${home.leaseYearsLeft} years of lease left` : ''}</dd>
      {home.form !== 'land' && <><dt>Floor Area</dt><dd>{home.floorAreaM2} m²</dd></>}
      {home.plotAreaM2 !== null && <><dt>Plot</dt><dd>{home.plotAreaM2} m²</dd></>}
      {home.form !== 'land' && <><dt>Bedrooms</dt><dd>{home.bedrooms ?? 'Not recorded'}</dd><dt>Bathrooms</dt><dd>{home.bathrooms ?? 'Not recorded'}</dd></>}
      {home.storeyBand && <><dt>Storeys</dt><dd>Between {home.storeyBand.toLowerCase()}</dd></>}
      {home.form !== 'land' && <><dt>Outside</dt><dd>{title(d.style)}, {d.floors} {d.floors === 1 ? 'floor' : 'floors'}, {d.walls} walls in {d.wallColor}, {d.roof} roof in {d.roofColor} {d.roofMaterial}</dd></>}
      <dt>Its Own</dt><dd>{home.privateAmenities.length ? home.privateAmenities.join(', ') : 'Nothing outside'}</dd>
      <dt>Shared</dt><dd>{home.sharedAmenities.length ? `${home.sharedAmenities.join(', ')} (the building's, shared with other residents)` : 'Nothing shared'}</dd>
      {home.market === 'rent' && <><dt>Furnished</dt><dd>{home.furnished ? 'Yes' : 'No'}</dd><dt>Included</dt><dd>{home.included.length ? home.included.join(', ') : 'Nothing: bills are yours'}</dd></>}
      <dt>Available</dt><dd>From {formatDateKey(home.availableFrom)}; offer stands until {formatDateKey(home.validUntil)}</dd>
    </dl>
  );
}

function EvidenceList({ home }: { home: Home }) {
  return (
    <ul className="list small" aria-label="Where The Price Comes From">
      {home.evidence.map((e, i) => <li key={i} className="list-item list-static"><span className="chip">{BASIS[e.basis]}</span><span className="grow">{e.says}</span></li>)}
    </ul>
  );
}

// ---------------- Your home ----------------

function YourHome({ g }: { g: GameState }) {
  const hs = homesOf(g);
  const res = hs.residence ? hs.homes[hs.residence] : undefined;
  // Every tenancy, newest first: one that has ended still shows its deposit and what was kept.
  const live = hs.tenancies.slice().reverse();
  const buying = hs.purchases.filter((p) => !['completed', 'failed', 'rejected', 'withdrawn'].includes(p.stage));
  const owned = hs.owned.filter((o) => !o.soldAt);
  return (
    <>
      <Panel title="Where You Live">
        {res ? (
          <div className="home-split">
            <div className="grow">
              <p style={{ marginTop: 0 }}><strong>{res.title}</strong>, {getPlace(res.placeId).name}</p>
              <Facts home={res} />
            </div>
            <HomePicture g={g} home={res} />
          </div>
        ) : <p className="muted small" style={{ margin: 0 }}>You haven't made a home your residence in the game yet. Find one to rent or buy under Find A Home.</p>}
      </Panel>
      {live.map((t) => <TenancyPanel key={t.id} g={g} t={t} />)}
      {buying.map((p) => <PurchasePanel key={p.id} g={g} id={p.id} />)}
      {owned.filter((o) => o.homeId !== hs.residence).map((o) => {
        const h = hs.homes[o.homeId];
        if (!h || h.form === 'land') return null;
        return <OwnedMoveIn key={o.homeId} g={g} home={h} />;
      })}
      <Viewings g={g} />
      <History g={g} />
    </>
  );
}

function OwnedMoveIn({ g, home }: { g: GameState; home: Home }) {
  const e = useErr();
  return (
    <Panel title={home.title} subtitle="You own it.">
      <Act label="Move In" primary why={moveInRefusal(g, home.id)} onClick={() => e.act((s) => moveIn(s, home.id))} aria={`Move In: ${home.title}`} />
      {e.show}
    </Panel>
  );
}

const STAGE: Record<Tenancy['stage'], string> = { applied: 'Application being decided', approved: 'Approved: sign to secure it', declined: 'Declined', lapsed: 'Approval lapsed', signed: 'Lease signed', active: 'You live here', notice: 'Notice given', ended: 'Ended' };

function TenancyPanel({ g, t }: { g: GameState; t: Tenancy }) {
  const hs = homesOf(g);
  const home = hs.homes[t.homeId];
  const e = useErr();
  const [component, setComponent] = useState<string>(COMPONENT_WORDS.heating);
  const [work, setWork] = useState<WorkKind>('paint');
  if (!home) return null;
  const cur = home.currency;
  const repairs = hs.repairs.filter((r) => r.homeId === home.id);
  const perms = hs.permissions.filter((p) => p.homeId === home.id);
  return (
    <Panel title={`Renting: ${home.title}`} subtitle={STAGE[t.stage]}>
      <dl className="kv small">
        <dt>Rent</dt><dd>{money(cur, t.rentMinor)} a month, due on day {t.anchorDay}</dd>
        <dt>Deposit</dt><dd>{t.depositMinor ? money(cur, t.depositMinor) : 'None'}. {t.depositSays}</dd>
        <dt>Start</dt><dd>{formatDateKey(t.start)}, {t.termMonths} months; {t.noticeDays} days' notice</dd>
        {t.rentsPaid > 0 && <><dt>Rents Paid</dt><dd>{t.rentsPaid}</dd></>}
        {t.arrearsMinor > 0 && <><dt>Overdue</dt><dd className="negative">{money(cur, t.arrearsMinor)}</dd></>}
        {t.endsOn && <><dt>Ends</dt><dd>{formatDateKey(t.endsOn)}</dd></>}
        {t.decision && <><dt>Decision</dt><dd>{t.decision}</dd></>}
      </dl>
      {t.stage === 'approved' && (
        <>
          <h4>The Lease</h4>
          <ul className="small">{leaseTerms(g, t).map((l, i) => <li key={i}>{l}</li>)}</ul>
          <Act label="Sign The Lease And Pay" primary why={signRefusal(g, t)} onClick={() => e.act((s) => void signLease(s, t.id))} />
        </>
      )}
      {(t.stage === 'signed' || t.stage === 'active') && hs.residence !== home.id && <Act label="Move In" primary why={moveInRefusal(g, home.id)} onClick={() => e.act((s) => moveIn(s, home.id))} aria={`Move In: ${home.title}`} />}
      {t.stage === 'active' && (
        <div className="home-stack">
          <div className="row-wrap">
            <SelectField label="Something Broken" value={component} options={[...Object.values(COMPONENT_WORDS).map((w) => ({ value: w, label: w })), ...home.landlordItems.map((i) => ({ value: i, label: `The Landlord's ${i}` }))]} onChange={setComponent} />
            <button className="btn btn-sm" onClick={() => e.act((s) => void reportRepair(s, home.id, component))}>Report It</button>
          </div>
          <div className="row-wrap">
            <SelectField label="Ask Permission For" value={work} options={(Object.keys(WORK) as WorkKind[]).filter((w) => !WORK[w].exterior || !inBuilding(home.form)).map((w) => ({ value: w, label: WORK[w].label }))} onChange={setWork} />
            <button className="btn btn-sm" onClick={() => e.act((s) => askPermission(s, home.id, work))}>Ask The Landlord</button>
          </div>
          <Act label="Give Notice" onClick={() => e.act((s) => giveNotice(s, t.id))} />
        </div>
      )}
      {/* Owed while you live there, or after you've left: a debt never disappears on its own. */}
      {t.arrearsMinor > 0 && <Act label={`Pay ${money(cur, t.arrearsMinor)} Overdue`} primary onClick={() => e.act((s) => payArrears(s, t.id))} />}
      {t.changes.filter((c) => c.restore && !c.restored).map((c) => (
        <Act key={c.work} label={`Undo: ${WORK[c.work].label}`} onClick={() => e.act((s) => restoreChange(s, t.id, c.work))} />
      ))}
      {t.deductions && (
        <>
          <h4>Deposit Deductions</h4>
          <ul className="small">{t.deductions.map((d, i) => <li key={i}>{d.what}: {d.wear ? 'fair wear, not deducted' : money(cur, d.minor)}</li>)}</ul>
          {t.refundedMinor !== undefined && <p className="small">Returned to you: {money(cur, t.refundedMinor)}. Kept: {money(cur, t.keptMinor ?? 0)}.</p>}
          {t.disputeDecision && <p className="small">{t.disputeDecision}</p>}
          {t.refundedMinor === undefined && !t.disputed && t.deductions.some((d) => !d.wear && d.minor > 0) && <Act label="Dispute The Deductions" onClick={() => e.act((s) => disputeDeductions(s, t.id))} />}
        </>
      )}
      {(repairs.length > 0 || perms.length > 0) && (
        <ul className="list small" aria-label="Repairs And Permissions">
          {repairs.map((r) => (
            <li key={r.id} className="list-item list-static">
              <span className="grow">{r.component}: {r.stage === 'fixed' ? 'repaired' : r.stage === 'declined' ? 'declined' : r.says}</span>
              {r.stage === 'quoted' && r.who === 'you' && <button className="btn btn-sm" onClick={() => e.act((s) => approveRepair(s, r.id))}>Approve {money(cur, r.quoteMinor ?? 0)}</button>}
            </li>
          ))}
          {perms.map((p) => <li key={p.id} className="list-item list-static"><span className="grow">{WORK[p.work].label}: {p.stage === 'asked' ? 'the landlord is deciding' : p.stage}{p.conditions ? `. ${p.conditions}` : ''}</span></li>)}
        </ul>
      )}
      <Payments list={t.payments} cur={cur} />
      {e.show}
    </Panel>
  );
}

function Payments({ list, cur }: { list: { key: string; label: string; minor: number; kind: string; at: number }[]; cur: string }) {
  if (!list.length) return null;
  return (
    <details className="small">
      <summary>Payments ({list.length})</summary>
      <ul className="list">{list.slice(-12).reverse().map((p) => <li key={p.key + p.at} className="list-item list-static"><span className="grow">{p.label}</span><span>{p.kind === 'failed' ? 'Failed' : money(cur, p.minor)}</span></li>)}</ul>
    </details>
  );
}

function PurchasePanel({ g, id }: { g: GameState; id: string }) {
  const hs = homesOf(g);
  const p = hs.purchases.find((x) => x.id === id)!;
  const home = hs.homes[p.homeId];
  const e = useErr();
  if (!home) return null;
  const cur = home.currency;
  const words: Record<string, string> = { offered: 'Offer made: the seller is answering', countered: `The seller countered at ${p.counterMinor ? money(cur, p.counterMinor) : ''}`, accepted: 'Offer accepted', inspecting: 'Being inspected', financing: 'Your lender is deciding', ready: `Completing on ${p.completeOn ? formatDateKey(p.completeOn) : ''}` };
  return (
    <Panel title={`Buying: ${home.title}`} subtitle={words[p.stage] ?? p.stage}>
      <dl className="kv small">
        <dt>Your Offer</dt><dd>{money(cur, p.offerMinor)}</dd>
        <dt>Deposit Paid</dt><dd>{money(cur, p.earnestMinor)}, held toward the price</dd>
        <dt>Finance</dt><dd>{p.finance.kind === 'cash' ? 'Cash' : `Mortgage of ${money(cur, p.finance.loanMinor)} over ${p.finance.years} years, ${money(cur, p.finance.paymentMinor)} a month${p.finance.says ? `. ${p.finance.says}` : ''}`}</dd>
        {p.route && <><dt>Route</dt><dd>{p.route}</dd></>}
        {p.inspection && <><dt>Inspection</dt><dd>{p.inspection.found.join(' ')}</dd></>}
        {p.says && <><dt>Latest</dt><dd>{p.says}</dd></>}
      </dl>
      <div className="row gap-2 wrap">
        {p.stage === 'countered' && <Act label="Accept The Counter-Offer" primary onClick={() => e.act((s) => acceptCounter(s, p.id))} />}
        <Act label="Withdraw" onClick={() => e.act((s) => withdrawPurchase(s, p.id))} />
      </div>
      <Payments list={p.payments} cur={cur} />
      {e.show}
    </Panel>
  );
}

function Viewings({ g }: { g: GameState }) {
  const hs = homesOf(g);
  if (!hs.viewings.length) return null;
  return (
    <Panel title="Viewings">
      <ul className="list small">
        {hs.viewings.slice().reverse().map((v) => {
          const h = hs.homes[v.homeId];
          return <li key={v.id} className="list-item list-static"><span className="grow">{h?.title}: {v.seen ? v.notes?.join(' ') : `booked for ${h ? date(v.at, h) : ''} at 11:00`}</span></li>;
        })}
      </ul>
    </Panel>
  );
}

function History({ g }: { g: GameState }) {
  const hs = homesOf(g);
  if (!hs.history.length && !hs.documents.length) return null;
  return (
    <Panel title="Documents And History">
      {hs.documents.length > 0 && (
        <details className="small"><summary>Documents ({hs.documents.length})</summary>
          {hs.documents.slice().reverse().map((d) => <div key={d.id}><h4>{d.title}</h4><ul>{d.lines.map((l, i) => <li key={i}>{l}</li>)}</ul></div>)}
        </details>
      )}
      <ul className="list small" aria-label="Housing History">{hs.history.slice(-15).reverse().map((h, i) => <li key={i} className="list-item list-static"><span className="grow">{h.text}</span></li>)}</ul>
    </Panel>
  );
}

// ---------------- Finding a home ----------------

type Want = 'rent' | 'sale' | 'land';
type Sort = 'price' | 'area' | 'per-m2';

function FindHome({ g }: { g: GameState }) {
  const hs = homesOf(g);
  const here = g.character.livesIn ?? g.locationId;
  const [placeId, setPlaceId] = useState(here);
  const [want, setWant] = useState<Want>('rent');
  const [maxPrice, setMaxPrice] = useState(0);
  const [minBeds, setMinBeds] = useState(0);
  const [sort, setSort] = useState<Sort>('price');
  const [onlyFav, setOnlyFav] = useState(false);
  const [compare, setCompare] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [ev, setEv] = useState<MarketEvidence | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const day = todayAt(g, { placeId });
  useEffect(() => {
    let live = true;
    setEv(null); setLoadErr(null);
    marketEvidence(placeId, day).then((x) => live && setEv(x), (err: Error) => live && setLoadErr(err.message));
    return () => { live = false; };
  }, [placeId, day]);
  const offers = useMemo(() => (ev ? offersIn(g.seed, ev, day) : []), [ev, g.seed, day]);
  // A home the player acted on is the saved one from then on: its record, not a fresh draw.
  // A saved favourite from an earlier month stays listed with its own dates, though no longer on offer as new.
  const kept = hs.favorites.map((id) => hs.homes[id]).filter((h): h is Home => !!h && h.placeId === placeId && !offers.some((o) => o.id === h.id));
  const shown = [...kept, ...offers.map((o) => hs.homes[o.id] ?? o)]
    .filter((o) => (want === 'land' ? o.form === 'land' : o.market === want && o.form !== 'land'))
    .filter((o) => !maxPrice || o.priceMinor <= maxPrice * 100)
    .filter((o) => !minBeds || (o.bedrooms ?? 0) >= minBeds)
    .filter((o) => !onlyFav || hs.favorites.includes(o.id))
    .sort((a, b) => (sort === 'price' ? a.priceMinor - b.priceMinor : sort === 'area' ? (b.plotAreaM2 ?? b.floorAreaM2) - (a.plotAreaM2 ?? a.floorAreaM2) : a.priceMinor / (a.plotAreaM2 ?? a.floorAreaM2) - b.priceMinor / (b.plotAreaM2 ?? b.floorAreaM2)));
  const places = useMemo(() => {
    const list = [...PLACES].sort((a, b) => a.name.localeCompare(b.name));
    const cur = findPlace(here);
    return cur && !list.some((p) => p.id === cur.id) ? [cur, ...list] : list;
  }, [here]);
  const opened = open ? shown.find((o) => o.id === open) ?? offers.find((o) => o.id === open) ?? kept.find((o) => o.id === open) : undefined;
  const compared = compare.map((id) => offers.find((o) => o.id === id)).filter((x): x is Home => !!x);
  return (
    <>
      <Panel title="Search">
        <div className="grid grid-3 form">
          <SelectField label="Place" value={placeId} options={places.map((p) => ({ value: p.id, label: `${p.name}, ${p.countryName}` }))} onChange={(v) => { setPlaceId(v); setOpen(null); setCompare([]); }} />
          <SelectField label="Looking To" value={want} options={[{ value: 'rent', label: 'Rent' }, { value: 'sale', label: 'Buy A Home' }, { value: 'land', label: 'Buy Land To Build On' }]} onChange={(v) => { setWant(v); setOpen(null); }} />
          <NumberField label={`Most You'll Pay${ev ? ` (${ev.currency})` : ''}`} value={maxPrice} min={0} step={want === 'rent' ? 100 : 10000} onChange={setMaxPrice} hint="0 for any price" />
          {want !== 'land' && <NumberField label="Bedrooms At Least" value={minBeds} min={0} max={6} onChange={setMinBeds} />}
          <SelectField label="Sort By" value={sort} options={[{ value: 'price', label: 'Price, Lowest First' }, { value: 'area', label: 'Size, Largest First' }, { value: 'per-m2', label: 'Price A Square Metre' }]} onChange={setSort} />
          <Check label="Favourites Only" checked={onlyFav} onChange={setOnlyFav} />
        </div>
        {loadErr && <p className="error" role="alert">{loadErr}</p>}
        {!ev && !loadErr && <p className="muted small">Reading the housing records for {getPlace(placeId).name}…</p>}
        {ev && (
          <p className="xs dim" style={{ marginBottom: 0 }}>
            {ev.rent || ev.sale || ev.hdb ? 'Prices here are drawn from the evidence each home lists. ' : `No housing records cover ${getPlace(placeId).name} yet: every price here is the game's placeholder estimate, not a market figure. `}
            These are the game's homes, not real listings, and none is at a real address.
          </p>
        )}
      </Panel>
      {compared.length >= 2 && <Compare g={g} homes={compared} onClear={() => setCompare([])} />}
      <Panel title={`${shown.length} ${want === 'rent' ? 'To Rent' : want === 'land' ? 'Plots For Sale' : 'For Sale'}`}>
        <ul className="list home-offers">
          {shown.map((o) => (
            <li key={o.id} className="list-item list-static">
              <span className="grow">
                <strong>{o.title}</strong>
                <span className="home-sub small">{money(o.currency, o.priceMinor)}{o.market === 'rent' ? ' a month' : ''} · {o.form === 'land' ? `${o.plotAreaM2} m² plot` : `${o.floorAreaM2} m²${o.bedrooms !== null ? ` · ${o.bedrooms} bed` : ''}`} · <span className="chip">{BASIS[o.evidence[0]?.basis ?? 'model']}</span></span>
              </span>
              <span className="row gap-2 wrap">
                <button className="btn btn-sm" aria-pressed={hs.favorites.includes(o.id)} aria-label={`Favourite: ${o.title}`} onClick={() => store.act((s) => void toggleFavorite(s, o))}>{hs.favorites.includes(o.id) ? '★ Saved' : '☆ Save'}</button>
                <label className="small row gap-1"><input type="checkbox" checked={compare.includes(o.id)} disabled={!compare.includes(o.id) && compare.length >= 3} onChange={(x) => setCompare(x.target.checked ? [...compare, o.id] : compare.filter((c) => c !== o.id))} /> Compare</label>
                <button className="btn btn-sm btn-primary" aria-label={`Details: ${o.title}`} onClick={() => setOpen(open === o.id ? null : o.id)}>{open === o.id ? 'Close' : 'Details'}</button>
              </span>
            </li>
          ))}
          {!shown.length && ev && <li className="list-item list-static muted small">Nothing matches. Widen the search.</li>}
        </ul>
      </Panel>
      {opened && ev && <OfferDetail g={g} home={opened} ev={ev} />}
    </>
  );
}

function Compare({ g, homes, onClear }: { g: GameState; homes: Home[]; onClear: () => void }) {
  const rows: [string, (h: Home) => string][] = [
    ['Price', (h) => `${money(h.currency, h.priceMinor)}${h.market === 'rent' ? ' a month' : ''}`],
    ['Kind', (h) => FORM_WORDS[h.form]],
    ['Area', (h) => (h.form === 'land' ? `${h.plotAreaM2} m² plot` : `${h.floorAreaM2} m²`)],
    ['Bedrooms', (h) => String(h.bedrooms ?? 'Not recorded')],
    ['Its Own', (h) => h.privateAmenities.join(', ') || 'Nothing'],
    ['Shared', (h) => h.sharedAmenities.join(', ') || 'Nothing'],
    ['Up Front', (h) => (h.market === 'rent' ? money(h.currency, rentQuote(h).moveInMinor) : money(h.currency, purchaseQuote(g, h, { finance: 'cash', inspect: true }).earnestMinor))],
    ['Price From', (h) => BASIS[h.evidence[0]?.basis ?? 'model']],
  ];
  return (
    <Panel title="Compare" actions={<button className="btn btn-sm" onClick={onClear}>Clear</button>}>
      <div className="table-wrap">
        <table className="data small" aria-label="Compare Homes">
          <thead><tr><th scope="col">What</th>{homes.map((h) => <th key={h.id} scope="col">{h.title}</th>)}</tr></thead>
          <tbody>{rows.map(([label, f]) => <tr key={label}><th scope="row">{label}</th>{homes.map((h) => <td key={h.id}>{f(h)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </Panel>
  );
}

function OfferDetail({ g, home, ev }: { g: GameState; home: Home; ev: MarketEvidence }) {
  const e = useErr();
  const [day, setDay] = useState(todayAt(g, home) < home.availableFrom ? home.availableFrom : todayAt(g, home));
  const [plan, setPlan] = useState<Plan>({ finance: 'mortgage', depositShare: 0.2, years: 25, inspect: true });
  const [offerUnits, setOfferUnits] = useState(Math.round(home.priceMinor / 100));
  const hs = homesOf(g);
  const viewed = hs.viewings.find((v) => v.homeId === home.id);
  const offerMinor = offerUnits * 100;
  return (
    <Panel title={home.title} subtitle={`${getPlace(home.placeId).name}. ${home.market === 'rent' ? `${money(home.currency, home.priceMinor)} a month` : money(home.currency, home.priceMinor)}`} id="home-detail">
      <div className="home-split">
        <div className="grow">
          <Facts home={home} />
          {home.rooms.length > 0 && <p className="small"><strong>Rooms:</strong> {home.rooms.map((r) => `${ROOM_WORDS[r.kind]} ${r.areaM2} m²`).join(', ')}</p>}
          {home.land && <p className="small"><strong>Known Of The Land:</strong> access {home.land.access}, services {home.land.services}, buildable area {home.land.buildableM2 === null ? 'not known until surveyed' : `${home.land.buildableM2} m²`}.</p>}
        </div>
        {home.form !== 'land' && <HomePicture g={g} home={home} />}
      </div>
      <h4>Where The Price Comes From</h4>
      <EvidenceList home={home} />
      {ev.nearby.length > 0 && (
        <details className="small"><summary>Recorded Sales Nearby ({ev.nearby.length})</summary>
          <p className="xs dim">Past sales on record, not homes for sale now.</p>
          <ul>{ev.nearby.map((n, i) => <li key={i}>{n.label}: {n.detail}</li>)}</ul>
        </details>
      )}
      <h4>See It</h4>
      {viewed?.seen ? <p className="small">{viewed.notes?.join(' ')}</p> : viewed ? <p className="small">Viewing booked for {date(viewed.at, home)} at 11:00.</p> : (
        <div className="row-wrap">
          <TextField label="Viewing Day" type="date" value={day} min={todayAt(g, home)} max={home.validUntil} onChange={setDay} />
          <button className="btn btn-sm" onClick={() => e.act((s) => arrangeViewing(s, home, day))}>Arrange A Viewing</button>
        </div>
      )}
      {home.market === 'rent' ? <RentCosts g={g} home={home} act={e.act} /> : (
        <>
          <h4>Buy It</h4>
          <div className="grid grid-3 form">
            <NumberField label={`Your Offer (${home.currency})`} value={offerUnits} min={0} step={1000} onChange={setOfferUnits} />
            <SelectField label="Paying With" value={plan.finance} options={[{ value: 'mortgage', label: 'A Mortgage' }, { value: 'cash', label: 'Cash' }]} onChange={(v) => setPlan({ ...plan, finance: v })} />
            {plan.finance === 'mortgage' && <>
              <NumberField label="Your Deposit (%)" value={Math.round((plan.depositShare ?? 0.2) * 100)} min={20} max={100} onChange={(v) => setPlan({ ...plan, depositShare: v / 100 })} hint="The game's lender lends up to 80%." />
              <SelectField label="Mortgage Term" value={String(plan.years ?? 25)} options={['15', '20', '25', '30'].map((y) => ({ value: y, label: `${y} Years` }))} onChange={(v) => setPlan({ ...plan, years: Number(v) })} />
            </>}
            <Check label="Have It Inspected" checked={plan.inspect} onChange={(v) => setPlan({ ...plan, inspect: v })} hint="An inspection finds what a viewing can't." />
          </div>
          <BuyCosts g={g} home={home} plan={plan} offerMinor={offerMinor} />
          <Act label="Make The Offer" primary why={offerRefusal(g, home, offerMinor, plan)} onClick={() => e.act((s) => void makeOffer(s, home, offerMinor, plan))} aria={`Make The Offer: ${home.title}`} />
        </>
      )}
      {e.show}
    </Panel>
  );
}

function RentCosts({ g, home, act }: { g: GameState; home: Home; act: (fn: (s: GameState) => void) => void }) {
  const q = rentQuote(home);
  return (
    <>
      <h4>What It Costs</h4>
      <ul className="list small" aria-label="Costs To Move In">
        {q.lines.map((l) => <li key={l.what} className="list-item list-static"><span className="grow">{l.what}</span><span>{money(home.currency, l.minor)}</span></li>)}
        <li className="list-item list-static"><span className="grow"><strong>Before You Move In</strong></span><strong>{money(home.currency, q.moveInMinor)}</strong></li>
        <li className="list-item list-static"><span className="grow">Then Each Month</span><span>{money(home.currency, q.monthlyMinor)}</span></li>
      </ul>
      <p className="xs dim">{q.deposit.says}</p>
      <Act label="Apply To Rent It" primary why={applyRefusal(g, home)} onClick={() => act((s) => void applyToRent(s, home))} aria={`Apply To Rent: ${home.title}`} />
    </>
  );
}

function BuyCosts({ g, home, plan, offerMinor }: { g: GameState; home: Home; plan: Plan; offerMinor: number }) {
  const q = purchaseQuote(g, home, plan, offerMinor || home.priceMinor);
  return (
    <>
      <ul className="list small" aria-label="Costs To Buy">
        {q.lines.map((l) => <li key={l.what} className="list-item list-static"><span className="grow">{l.what}</span><span>{money(home.currency, l.minor)}</span></li>)}
        {q.loanMinor > 0 && <li className="list-item list-static"><span className="grow">Then Each Month ({q.months / 12} years at {(q.rate * 100).toFixed(1)}%, the game's rate)</span><span>{money(home.currency, q.paymentMinor)}</span></li>}
      </ul>
      {q.notes.map((n, i) => <p key={i} className="xs dim">{n}</p>)}
    </>
  );
}

// ---------------- Land and building ----------------

function LandAndBuilding({ g }: { g: GameState }) {
  const hs = homesOf(g);
  const plots = hs.owned.filter((o) => !o.soldAt && hs.homes[o.homeId]?.form === 'land').map((o) => hs.homes[o.homeId]);
  const built = hs.builds.filter((b) => b.stage === 'complete');
  if (!plots.length && !built.length) return <Panel title="Land And Building"><p className="muted small" style={{ margin: 0 }}>You don't own a plot. Buy one under Find A Home (Buy Land To Build On), then design a house for it here.</p></Panel>;
  return <>{plots.map((land) => <Plot key={land.id} g={g} land={land} />)}{built.map((b) => <BuildPanel key={b.id} g={g} b={b} />)}</>;
}

function Plot({ g, land }: { g: GameState; land: Home }) {
  const hs = homesOf(g);
  const e = useErr();
  const b = hs.builds.find((x) => x.landId === land.id && x.stage !== 'complete' && x.stage !== 'refused') ?? hs.builds.filter((x) => x.landId === land.id).at(-1);
  return (
    <>
      <Panel title={land.title} subtitle={`Your plot of ${land.plotAreaM2} m²`}>
        <ul className="list small" aria-label="Investigations">
          {(Object.keys(INVESTIGATIONS) as Investigation[]).map((k) => (
            <li key={k} className="list-item list-static">
              <span className="grow">{INVESTIGATIONS[k].label}: {land.land?.investigated.includes(k) ? 'done' : `${INVESTIGATIONS[k].days} days, about $${INVESTIGATIONS[k].usd.toLocaleString('en-US')} (game estimate)`}</span>
              {!land.land?.investigated.includes(k) && <button className="btn btn-sm" onClick={() => e.act((s) => investigate(s, land.id, k))}>Order It</button>}
            </li>
          ))}
        </ul>
        <p className="small">Buildable area: {land.land?.buildableM2 == null ? 'not known until the survey reports' : `${land.land.buildableM2} m²`}. Access {land.land?.access}; services {land.land?.services}.</p>
        {!b || b.stage === 'refused' ? <Act label="Start Designing A House" primary onClick={() => e.act((s) => void startDesign(s, land.id))} /> : null}
        {e.show}
      </Panel>
      {b && <BuildPanel g={g} b={b} />}
    </>
  );
}

function BuildPanel({ g, b }: { g: GameState; b: Build }) {
  const hs = homesOf(g);
  const land = hs.homes[b.landId];
  const e = useErr();
  const [draft, setDraft] = useState<{ design: Design; floorAreaM2: number; rooms: { kind: RoomKind; areaM2: number }[] }>({ design: b.design, floorAreaM2: b.floorAreaM2, rooms: b.rooms });
  useEffect(() => setDraft({ design: b.design, floorAreaM2: b.floorAreaM2, rooms: b.rooms }), [b.design, b.floorAreaM2, b.rooms]);
  if (!land) return null;
  const cur = land.currency;
  const d = draft.design;
  const set = (patch: Partial<Design>) => setDraft({ ...draft, design: { ...d, ...patch } });
  const problems = designProblems(g, { ...draft, landId: b.landId });
  const q = buildQuote(g, { ...draft, landId: b.landId });
  const rc = roomCheck(draft.rooms, draft.floorAreaM2);
  const preview: Home = { ...land, id: `${b.id}:preview`, form: 'detached', design: { ...d, ...(b.stage === 'building' || b.stage === 'paused' ? { stage: b.stages[b.current]?.name } : {}) }, title: `Your design for ${land.title}` };
  const editable = b.stage !== 'complete';
  const changed = JSON.stringify(draft) !== JSON.stringify({ design: b.design, floorAreaM2: b.floorAreaM2, rooms: b.rooms });
  const home = b.homeId ? hs.homes[b.homeId] : undefined;
  const sel = <K extends keyof typeof DESIGN_CHOICES>(k: K, label: string) => (
    <SelectField label={label} value={String(d[k as keyof Design])} options={DESIGN_CHOICES[k].map((v) => ({ value: v, label: title(v) }))} onChange={(v) => set({ [k]: v } as Partial<Design>)} />
  );
  const colour = (k: 'roofColor' | 'wallColor' | 'frameColor' | 'doorColor', label: string) => (
    <SelectField label={label} value={d[k]} options={DESIGN_COLORS.map((c) => ({ value: c, label: title(c) }))} onChange={(v) => set({ [k]: v })} />
  );
  const stageWords: Record<Build['stage'], string> = { designing: 'Designing', 'awaiting-permission': 'Waiting for the building approval', permitted: 'Approved: sign the contract to build', refused: 'Approval refused', building: `Building: ${b.stages[b.current]?.name ?? ''}`, paused: `Paused: ${b.pausedBecause ?? ''}`, complete: 'Built' };
  return (
    <Panel title={home ? home.title : `House Design For ${land.title}`} subtitle={`${stageWords[b.stage]}. Design revision ${b.design.revision}; cost plan ${money(cur, b.quoteMinor)}.`}>
      <div className="home-split">
        <div className="grow">
          {editable && (
            <details open={b.stage === 'designing'}>
              <summary>Edit The Design</summary>
              <div className="grid grid-3 form">
                {sel('style', 'Style')}
                <NumberField label="Floors" value={d.floors} min={1} max={4} onChange={(v) => set({ floors: v })} />
                <NumberField label="Width (m)" value={d.widthM} min={4} max={40} onChange={(v) => set({ widthM: v })} />
                <NumberField label="Depth (m)" value={d.depthM} min={4} max={40} onChange={(v) => set({ depthM: v })} />
                <NumberField label="Floor Area (m²)" value={draft.floorAreaM2} min={30} max={1000} step={5} onChange={(v) => setDraft({ ...draft, floorAreaM2: v })} />
                {sel('roof', 'Roof')}{sel('roofMaterial', 'Roof Material')}{colour('roofColor', 'Roof Colour')}
                {sel('walls', 'Walls')}{colour('wallColor', 'Wall Colour')}
                <NumberField label="Windows Across Each Floor" value={d.windowsPerFloor} min={1} max={8} onChange={(v) => set({ windowsPerFloor: v })} />
                {sel('windowStyle', 'Windows')}{colour('frameColor', 'Window Frames')}
                {sel('door', 'Front Door')}{colour('doorColor', 'Door Colour')}
                <NumberField label="Balconies" value={d.balconies} min={0} max={4} onChange={(v) => set({ balconies: v })} />
                {sel('garage', 'Garage')}{sel('driveway', 'Driveway')}{sel('landscaping', 'Garden')}
              </div>
              <fieldset className="row gap-2 wrap"><legend className="small">Outside</legend>
                {DESIGN_CHOICES.outdoor.map((o) => <Check key={o} label={title(o)} checked={d.outdoor.includes(o)} onChange={(v) => set({ outdoor: v ? [...d.outdoor, o] : d.outdoor.filter((x) => x !== o) })} />)}
              </fieldset>
              <h4>Rooms</h4>
              <ul className="list small" aria-label="Rooms">
                {draft.rooms.map((r, i) => (
                  <li key={i} className="list-item list-static">
                    <span className="grow">{ROOM_WORDS[r.kind]}</span>
                    <NumberField label={`${ROOM_WORDS[r.kind]} ${i + 1} (m²)`} value={r.areaM2} min={2} max={80} onChange={(v) => setDraft({ ...draft, rooms: draft.rooms.map((x, j) => (j === i ? { ...x, areaM2: v } : x)) })} />
                    <button className="btn btn-sm" aria-label={`Remove ${ROOM_WORDS[r.kind]} ${i + 1}`} onClick={() => setDraft({ ...draft, rooms: draft.rooms.filter((_, j) => j !== i) })}>Remove</button>
                  </li>
                ))}
              </ul>
              <AddRoom onAdd={(kind) => setDraft({ ...draft, rooms: [...draft.rooms, { kind, areaM2: kind === 'bedroom' ? 11 : 6 }] })} />
              <p className="xs dim">Rooms take {rc.roomsM2} m², {rc.withCirculation} m² with halls and stairs (the game allows 15%), of {draft.floorAreaM2} m². {rc.bedrooms} bedrooms, {rc.fullBaths} bathrooms, {rc.halfBaths} half baths.</p>
              {problems.length > 0 && <ul className="error small" role="alert">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
              <Act label="Save This Revision" primary why={!changed ? 'Nothing has changed.' : problems[0] ?? null} onClick={() => e.act((s) => void saveDesign(s, b.id, draft))} />
            </details>
          )}
          <h4>Cost Plan</h4>
          <ul className="list small" aria-label="Cost Plan">
            {q.lines.map((l) => <li key={l.what} className="list-item list-static"><span className="grow">{l.what}</span><span>{money(cur, l.minor)}</span></li>)}
            <li className="list-item list-static"><strong className="grow">Total</strong><strong>{money(cur, q.total)}</strong></li>
          </ul>
          <p className="xs dim">{q.basis}</p>
          {b.permitSays && <p className="small">{b.permitSays}</p>}
          <div className="row gap-2 wrap">
            {(b.stage === 'designing' || b.stage === 'refused') && <Act label="Apply For Building Approval" primary why={changed ? 'Save the revision first.' : null} onClick={() => e.act((s) => applyForApproval(s, b.id))} />}
            {b.stage === 'permitted' && <Act label="Sign The Building Contract" primary why={changed ? 'Save the revision first.' : null} onClick={() => e.act((s) => signBuild(s, b.id))} />}
            {b.stage === 'paused' && <Act label="Resume Building" primary onClick={() => e.act((s) => resumeBuild(s, b.id))} />}
          </div>
          {b.stages.length > 0 && (
            <ol className="small" aria-label="Building Stages">
              {b.stages.map((st, i) => <li key={st.name}>{st.name}: {st.done ? `done ${formatDateKey(st.done)}` : i === b.current && st.started ? `under way since ${formatDateKey(st.started)}` : 'to come'} ({money(cur, st.costMinor)}){st.failedInspections ? `, failed inspection ${st.failedInspections}×` : ''}</li>)}
            </ol>
          )}
          {b.defects.length > 0 && <p className="small">Snags to fix{b.defectsUntil ? ` (the builder's, until ${formatDateKey(b.defectsUntil)})` : ''}: {b.defects.join('; ')}.</p>}
          {home && <OwnedMoveIn g={g} home={home} />}
          <Payments list={b.payments} cur={cur} />
          {e.show}
        </div>
        {home ? <HomePicture g={g} home={home} /> : <div><h4>Design Preview</h4><HomePicture g={g} home={preview} /></div>}
      </div>
    </Panel>
  );
}

function AddRoom({ onAdd }: { onAdd: (k: RoomKind) => void }) {
  const [kind, setKind] = useState<RoomKind>('bedroom');
  return (
    <div className="row-wrap">
      <SelectField label="Add A Room" value={kind} options={(Object.keys(ROOM_WORDS) as RoomKind[]).map((k) => ({ value: k, label: ROOM_WORDS[k] }))} onChange={setKind} />
      <button className="btn btn-sm" onClick={() => onAdd(kind)}>Add</button>
    </div>
  );
}

// ---------------- Improvements and furnishings ----------------

/** The homes you can change or furnish: the one you rent and live in, and those you own. */
function yourHomes(g: GameState): { home: Home; interest: 'tenant' | 'owner' }[] {
  const hs = homesOf(g);
  const out: { home: Home; interest: 'tenant' | 'owner' }[] = [];
  for (const o of hs.owned) if (!o.soldAt && hs.homes[o.homeId] && hs.homes[o.homeId].form !== 'land') out.push({ home: hs.homes[o.homeId], interest: 'owner' });
  for (const t of hs.tenancies) if ((t.stage === 'active' || t.stage === 'signed') && hs.homes[t.homeId]) out.push({ home: hs.homes[t.homeId], interest: 'tenant' });
  return out;
}

function Improvements({ g }: { g: GameState }) {
  const mine = yourHomes(g);
  const hs = homesOf(g);
  const [id, setId] = useState(hs.residence && mine.some((m) => m.home.id === hs.residence) ? hs.residence : mine[0]?.home.id ?? '');
  const sel = mine.find((m) => m.home.id === id) ?? mine[0];
  if (!sel) return <Panel title="Improvements And Furnishings"><p className="muted small" style={{ margin: 0 }}>Rent or buy a home first: work and furnishings are for a home that's yours to live in or own.</p></Panel>;
  return (
    <>
      {mine.length > 1 && <Panel title="Which Home"><SelectField label="Home" value={sel.home.id} options={mine.map((m) => ({ value: m.home.id, label: `${m.home.title} (${m.interest === 'owner' ? 'you own it' : 'you rent it'})` }))} onChange={setId} /></Panel>}
      <WorkPanel g={g} home={sel.home} interest={sel.interest} />
      <ItemsPanel g={g} home={sel.home} />
    </>
  );
}

function WorkPanel({ g, home, interest }: { g: GameState; home: Home; interest: 'tenant' | 'owner' }) {
  const hs = homesOf(g);
  const e = useErr();
  const [work, setWork] = useState<WorkKind>('paint');
  const [color, setColor] = useState<string>('sage');
  const [roofMaterial, setRoofMaterial] = useState<string>('slate');
  const check = permissionFor(HOME_RULES, home, interest, work, gardenOf(home));
  const jobs = hs.jobs.filter((j) => j.homeId === home.id);
  const cur = home.currency;
  return (
    <Panel title="Work On The Home" subtitle={interest === 'tenant' ? 'You rent it: most changes need the landlord first.' : 'You own it.'}>
      <div className="row-wrap">
        <SelectField label="Work" value={work} options={(Object.keys(WORK) as WorkKind[]).map((w) => ({ value: w, label: WORK[w].label }))} onChange={setWork} />
        {(work === 'exterior-paint') && <SelectField label="New Colour" value={color} options={DESIGN_COLORS.map((c) => ({ value: c, label: title(c) }))} onChange={setColor} />}
        {work === 'new-roof' && <SelectField label="Roof Material" value={roofMaterial} options={DESIGN_CHOICES.roofMaterial.map((c) => ({ value: c, label: title(c) }))} onChange={setRoofMaterial} />}
      </div>
      <p className="small">About {money(cur, workQuote(g, home, work))} (the game's estimate), {WORK[work].days} days{WORK[work].exterior ? '; changes how the home looks outside' : ''}.</p>
      <h4>Is It Allowed?</h4>
      <ol className="small" aria-label="Permission Steps">
        {check.steps.map((s, i) => <li key={i}><strong>{s.step}:</strong> {s.outcome === 'met' ? 'yes' : s.outcome === 'needs' ? 'needs approval' : s.outcome === 'refused' ? 'no' : 'not known'}. {s.says}</li>)}
      </ol>
      <Act label="Start The Work" primary why={workRefusal(g, home.id, work)} onClick={() => e.act((s) => void startWork(s, home.id, work, work === 'exterior-paint' ? { color } : work === 'new-roof' ? { roofMaterial } : undefined))} />
      {jobs.length > 0 && (
        <ul className="list small" aria-label="Work">
          {jobs.slice().reverse().map((j) => (
            <li key={j.id} className="list-item list-static">
              <span className="grow">{WORK[j.work].label}: {j.stage === 'awaiting-permission' ? `waiting for ${j.needs.join(', ')}` : j.stage === 'scheduled' ? `starts ${formatDateKey(j.startOn)}` : j.stage === 'working' ? `under way, done ${formatDateKey(j.doneOn)}` : j.stage}. Paid {money(cur, j.paidMinor)} of {money(cur, j.quoteMinor)}.</span>
              {(j.stage === 'awaiting-permission' || j.stage === 'scheduled') && <button className="btn btn-sm" onClick={() => e.act((s) => cancelWork(s, j.id))}>Cancel</button>}
            </li>
          ))}
        </ul>
      )}
      {e.show}
    </Panel>
  );
}

const CATEGORIES: { value: CatalogItem['category']; label: string }[] = [
  { value: 'furniture', label: 'Furniture' }, { value: 'refrigerators', label: 'Refrigerators' }, { value: 'washers', label: 'Washing Machines' },
  { value: 'dryers', label: 'Dryers' }, { value: 'dishwashers', label: 'Dishwashers' }, { value: 'room_ac', label: 'Room Air Conditioners' },
];

function ItemsPanel({ g, home }: { g: GameState; home: Home }) {
  const hs = homesOf(g);
  const e = useErr();
  const [cat, setCat] = useState<CatalogItem['category']>('furniture');
  const [q, setQ] = useState('');
  const [found, setFound] = useState<{ total: number; items: CatalogItem[] } | null>(null);
  const [roomId, setRoomId] = useState(home.rooms[0]?.id ?? '');
  useEffect(() => {
    if (cat === 'furniture') { setFound({ total: GENERIC_FURNITURE.length, items: GENERIC_FURNITURE }); return; }
    let live = true;
    setFound(null);
    const t = setTimeout(() => applianceCatalog(cat, q, 25).then((r) => live && setFound(r), () => live && setFound({ total: 0, items: [] })), 200);
    return () => { live = false; clearTimeout(t); };
  }, [cat, q]);
  const items = hs.items.filter((i) => i.homeId === home.id || (i.homeId === null && i.owner === 'you'));
  const cur = home.currency;
  return (
    <Panel title="Furniture And Appliances" subtitle="Appliances are real models from EPA's ENERGY STAR records; their prices are the game's estimates, not a shop's.">
      <div className="grid grid-3 form">
        <SelectField label="Category" value={cat} options={CATEGORIES} onChange={setCat} />
        {cat !== 'furniture' && <TextField label="Brand Or Model" value={q} onChange={setQ} />}
        <SelectField label="For The Room" value={roomId} options={home.rooms.map((r) => ({ value: r.id, label: `${ROOM_WORDS[r.kind]} (${r.widthM} × ${r.depthM} m)` }))} onChange={setRoomId} />
      </div>
      {!found ? <p className="muted small">Reading the records…</p> : (
        <>
          {cat !== 'furniture' && <p className="xs dim">{found.total.toLocaleString('en-US')} records match; the first {found.items.length} shown.</p>}
          <ul className="list small" aria-label="Catalog">
            {found.items.map((c) => {
              const chk = itemCheck(g, home, c, roomId);
              const pr = itemPrices(g, home, c);
              return (
                <li key={c.recordId ?? c.name} className="list-item list-static">
                  <span className="grow">
                    <strong>{c.name}</strong>
                    <span className="home-sub xs dim">{[c.widthIn && `${c.widthIn}" wide`, c.depthIn ? `${c.depthIn}" deep` : c.sourceId ? 'depth not recorded' : null, c.annualKwh && `${c.annualKwh} kWh a year (test)`, c.markets].filter(Boolean).join(' · ')}</span>
                    {chk.install && <span className="home-sub xs">{chk.install}</span>}
                  </span>
                  <Act label={`Buy ${money(cur, pr.price + pr.delivery + pr.install)}`} why={chk.buy} onClick={() => e.act((s) => void buyItem(s, home.id, c, roomId))} aria={`Buy: ${c.name}`} />
                </li>
              );
            })}
          </ul>
        </>
      )}
      {items.length > 0 && (
        <>
          <h4>Your Things Here</h4>
          <ul className="list small" aria-label="Your Things">
            {items.map((it) => (
              <li key={it.id} className="list-item list-static">
                <span className="grow">{it.name}: {it.stage === 'needs-measurements' ? 'the installer needs measurements' : it.stage}{it.says ? `. ${it.says}` : ''}</span>
                <span className="row gap-2 wrap">
                  {it.stage === 'delivered' && <Act label="Install" why={installRefusal(g, it)} onClick={() => e.act((s) => installItem(s, it.id))} aria={`Install: ${it.name}`} />}
                  {it.stage === 'needs-measurements' && <Act label="Measure" onClick={() => e.act((s) => measureForInstall(s, it.id))} />}
                  {(it.stage === 'ordered' || it.stage === 'delivered') && <Act label="Return" onClick={() => e.act((s) => returnItem(s, it.id))} />}
                  {(it.stage === 'installed' || it.stage === 'delivered' || it.stage === 'faulty') && <Act label="Get Rid Of It" onClick={() => e.act((s) => disposeItem(s, it.id))} />}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {e.show}
    </Panel>
  );
}

// ---------------- Household costs ----------------

function Costs({ g }: { g: GameState }) {
  const hs = homesOf(g);
  const e = useErr();
  const res = hs.residence ? hs.homes[hs.residence] : undefined;
  const [nights, setNights] = useState(3);
  const owner = res ? hs.owned.some((o) => o.homeId === res.id && !o.soldAt) : false;
  return (
    <>
      <Panel title="Bills" subtitle={res ? `For ${res.title}` : undefined}>
        {res ? (
          <>
            <ul className="list small" aria-label="Expected Each Month">
              {billLines(g, res).map((l) => <li key={l.what} className="list-item list-static"><span className="grow">{l.what}<span className="home-sub xs dim">{l.basis}</span></span><span>{money(res.currency, l.minor)}</span></li>)}
            </ul>
            {hs.bills.filter((b) => b.homeId === res.id).slice(-6).reverse().map((b) => (
              <p key={b.key} className="small">{b.period}: {money(res.currency, b.totalMinor)} {b.paid ? 'paid' : 'unpaid'}.</p>
            ))}
          </>
        ) : <p className="muted small" style={{ margin: 0 }}>Bills start when you move into a home.</p>}
      </Panel>
      {res && (
        <Panel title="Insurance">
          <div className="row gap-2 wrap">
            {(['contents', ...(owner && !inBuilding(res.form) ? ['buildings'] as const : [])] as const).map((cover) => {
              const quote = insuranceQuote(g, res, cover);
              const has = hs.policies.some((p) => p.homeId === res.id && p.cover === cover && !p.endedAt);
              return <Act key={cover} label={`${title(cover)} Cover, ${money(res.currency, quote.monthlyMinor)} A Month`} why={has ? 'You have this cover.' : quote.refused ?? null} onClick={() => e.act((s) => void buyInsurance(s, res.id, cover))} />;
            })}
          </div>
          <p className="xs dim">The game's insurer and its prices: no real company's.</p>
          {hs.policies.filter((p) => p.homeId === res.id).map((p) => (
            <div key={p.id} className="small">
              <p>{title(p.cover)} cover since {date(p.since, res)}: {money(res.currency, p.monthlyMinor)} a month, {money(res.currency, p.excessMinor)} excess.</p>
              <ul>{p.claims.map((c) => <li key={c.repairId}>{c.says}</li>)}</ul>
            </div>
          ))}
          {hs.repairs.filter((r) => r.homeId === res.id && r.who === 'you' && r.stage === 'fixed' && !r.claimed).map((r) => (
            <Act key={r.id} label={`Claim For The ${r.component} Repair`} onClick={() => e.act((s) => claimRepair(s, r.id))} />
          ))}
        </Panel>
      )}
      <Panel title="Somewhere To Stay" subtitle="While work goes on, or between homes.">
        <div className="row-wrap">
          <NumberField label="Nights" value={nights} min={1} max={60} onChange={setNights} />
          <button className="btn btn-sm" onClick={() => e.act((s) => void bookStay(s, nights, 'Between homes'))}>Book A Stay</button>
        </div>
        {hs.stays.slice(-5).reverse().map((s) => <p key={s.id} className="small">{getPlace(s.placeId).name}, {formatDateKey(s.from)} to {formatDateKey(s.to)}: {money(s.currency, s.paidMinor)}.</p>)}
        {e.show}
      </Panel>
    </>
  );
}

// ---------------- Your properties ----------------

function Properties({ g }: { g: GameState }) {
  const hs = homesOf(g);
  const owned = hs.owned.filter((o) => !o.soldAt && hs.homes[o.homeId]);
  const sold = hs.owned.filter((o) => o.soldAt && hs.homes[o.homeId]);
  if (!owned.length && !sold.length) return <Panel title="Your Properties"><p className="muted small" style={{ margin: 0 }}>You don't own a home yet.</p></Panel>;
  return (
    <>
      {owned.map((o) => <PropertyPanel key={o.homeId} g={g} homeId={o.homeId} />)}
      {sold.map((o) => {
        const h = hs.homes[o.homeId];
        const sale = hs.sales.find((x) => x.homeId === o.homeId && x.stage === 'completed');
        return (
          <Panel key={o.homeId} title={h.title} subtitle={`Sold ${date(o.soldAt!, h)}.`}>
            {sale && <p className="small" style={{ marginTop: 0 }}>Sold for {money(h.currency, sale.offerMinor ?? 0)}; {money(h.currency, sale.proceedsMinor ?? 0)} came to you after the fee{sale.debtRepaidMinor ? ` and ${money(h.currency, sale.debtRepaidMinor)} to repay the mortgage` : ''}.</p>}
            {!sale && h.form === 'land' && <p className="small" style={{ marginTop: 0 }}>The plot is now your house's land.</p>}
            <Payments list={[...o.payments, ...(sale?.payments ?? [])]} cur={h.currency} />
          </Panel>
        );
      })}
    </>
  );
}

function PropertyPanel({ g, homeId }: { g: GameState; homeId: string }) {
  const hs = homesOf(g);
  const home = hs.homes[homeId];
  const o = hs.owned.find((x) => x.homeId === homeId && !x.soldAt)!;
  const e = useErr();
  const worth = valuation(g, home);
  const [asking, setAsking] = useState(Math.round(worth / 100));
  const fair = home.form === 'land' ? 0 : fairRent(g, homeId);
  const [rent, setRent] = useState(Math.round(fair / 100));
  const [manager, setManager] = useState(false);
  const [cap, setCap] = useState(500);
  const [component, setComponent] = useState<string>(COMPONENT_WORDS.roof);
  const cur = home.currency;
  const sale = hs.sales.filter((s) => s.homeId === homeId).at(-1);
  const letting = hs.lettings.filter((l) => l.homeId === homeId).at(-1);
  const owedUsd = o.mortgage ? mortgageOwed(g, o.mortgage.name) : 0;
  const repairs = hs.repairs.filter((r) => r.homeId === homeId);
  const poor = (Object.keys(home.condition) as (keyof typeof COMPONENT_WORDS)[]).filter((k) => home.condition[k] !== 'good');
  return (
    <Panel title={home.title} subtitle={`${FORM_WORDS[home.form]} in ${getPlace(home.placeId).name}${hs.residence === homeId ? '. You live here.' : '.'}`}>
      <div className="home-split">
        <div className="grow">
          <dl className="kv small">
            <dt>Bought</dt><dd>{date(o.since, home)} for {money(cur, o.costMinor)}</dd>
            <dt>Worth Now</dt><dd>About {money(cur, worth)} (the game's valuation)</dd>
            {o.mortgage && <><dt>Mortgage</dt><dd>{money(cur, o.mortgage.paymentMinor)} a month; {o.mortgage.paidMonths} of {o.mortgage.months} paid; about ${owedUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} owed{o.mortgage.arrearsMinor ? `; ${money(cur, o.mortgage.arrearsMinor)} overdue` : ''}</dd></>}
            {home.form !== 'land' && hs.residence !== homeId && <><dt>Costs A Month</dt><dd>{(() => { const lines = billLines(g, home); return lines.length ? `${money(cur, lines.reduce((a, x) => a + x.minor, 0))}: ${lines.map((x) => x.what.toLowerCase()).join(', ')}` : 'Nothing while it is let'; })()}</dd></>}
            {home.form !== 'land' && <><dt>Condition</dt><dd>{poor.length ? poor.map((k) => `${COMPONENT_WORDS[k]} ${home.condition[k]}`).join(', ') : 'Everything good'}</dd></>}
          </dl>
          {home.form !== 'land' && (
            <>
              <h4>Repairs</h4>
              <div className="row-wrap">
                <SelectField label="Something Broken" value={component} options={Object.values(COMPONENT_WORDS).map((w) => ({ value: w, label: w }))} onChange={setComponent} />
                <button className="btn btn-sm" onClick={() => e.act((s) => void reportRepair(s, homeId, component))}>Get A Quote</button>
              </div>
              {repairs.length > 0 && (
                <ul className="list small" aria-label="Repairs">
                  {repairs.map((r) => (
                    <li key={r.id} className="list-item list-static">
                      <span className="grow">{r.component}: {r.stage === 'fixed' ? 'repaired' : r.says}</span>
                      {r.stage === 'quoted' && <button className="btn btn-sm" aria-label={`Approve The Repair: ${r.component}`} onClick={() => e.act((s) => approveRepair(s, r.id))}>Approve {money(cur, r.quoteMinor ?? 0)}</button>}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
        {home.form !== 'land' && <HomePicture g={g} home={home} />}
      </div>
      <h4>Sell It</h4>
      {sale && sale.stage !== 'completed' && sale.stage !== 'withdrawn' ? (
        <div className="small">
          <p>For sale at {money(cur, sale.askingMinor)}. {sale.stage === 'offer' ? `A buyer offers ${money(cur, sale.offerMinor!)}.` : sale.stage === 'agreed' ? `Sold subject to completion on ${formatDateKey(sale.completeOn!)}.` : 'Waiting for a buyer.'}</p>
          {sale.stage === 'offer' && <div className="row gap-2 wrap">
            <Act label="Accept The Offer" primary why={acceptSaleRefusal(g, sale)} onClick={() => e.act((s) => acceptSaleOffer(s, sale.id))} />
            <Act label="Decline It" onClick={() => e.act((s) => declineSaleOffer(s, sale.id))} />
          </div>}
        </div>
      ) : (
        <div className="row-wrap">
          <NumberField label={`Asking Price (${cur})`} value={asking} min={0} step={1000} onChange={setAsking} />
          <Act label="Put It Up For Sale" why={saleRefusal(g, homeId)} onClick={() => e.act((s) => void listForSale(s, homeId, asking * 100))} />
        </div>
      )}
      {home.form !== 'land' && (
        <>
          <h4>Let It</h4>
          {letting && ['advertised', 'applicants', 'let', 'notice'].includes(letting.stage) ? (
            <div className="small">
              <p>{letting.stage === 'advertised' ? `Advertised at ${money(cur, letting.rentMinor)} a month; applicants are coming.` : letting.stage === 'applicants' ? 'Applicants have come forward.' : `Let to ${letting.tenant} at ${money(cur, letting.rentMinor)} a month since ${formatDateKey(letting.start!)}; ${letting.rentsReceived} rents received${letting.arrearsMinor ? `, ${money(cur, letting.arrearsMinor)} late` : ''}${letting.endsOn ? `; ends ${formatDateKey(letting.endsOn)}` : ''}.`}</p>
              {letting.stage === 'applicants' && <ul className="list">{letting.applicants.map((a, i) => (
                <li key={i} className="list-item list-static"><span className="grow">{a.name}: offers {money(cur, a.offerMinor)} a month. {a.checks}</span><button className="btn btn-sm" onClick={() => e.act((s) => chooseTenant(s, letting.id, i))}>Choose</button></li>
              ))}</ul>}
              {(letting.stage === 'advertised' || letting.stage === 'applicants') && <div className="row-wrap"><NumberField label={`New Rent (${cur})`} value={rent} min={0} step={50} onChange={setRent} /><button className="btn btn-sm" onClick={() => e.act((s) => changeRent(s, letting.id, rent * 100))}>Change The Rent</button></div>}
              {letting.repairs.map((r, i) => <p key={i}>{r.what}: {money(cur, r.minor)}, {r.stage === 'awaiting-you' ? <button className="btn btn-sm" onClick={() => e.act((s) => approveLandlordRepair(s, letting.id, i))}>Approve The Repair</button> : r.stage}</p>)}
              {letting.stage !== 'notice' && <Act label={letting.stage === 'let' ? 'Give The Tenant Notice' : 'Stop Advertising'} onClick={() => e.act((s) => endLetting(s, letting.id))} />}
            </div>
          ) : (
            <>
              <div className="grid grid-3 form">
                <NumberField label={`Rent A Month (${cur})`} value={rent} min={0} step={50} onChange={setRent} hint={`The game's fair rent: ${money(cur, fair)}`} />
                <Check label="Have An Agent Manage It" checked={manager} onChange={setManager} hint="10% of the rent; repairs up to your limit without asking." />
                {manager && <NumberField label={`Repair Limit (${cur})`} value={cap} min={0} step={50} onChange={setCap} />}
              </div>
              <Act label="Advertise To Let" why={letRefusal(g, homeId)} onClick={() => e.act((s) => void advertise(s, homeId, rent * 100, manager, cap * 100))} />
            </>
          )}
          {letting && <Payments list={letting.payments} cur={cur} />}
        </>
      )}
      <Payments list={o.payments} cur={cur} />
      {e.show}
    </Panel>
  );
}
