// Your equipment on screen (engine/equipment.ts; the v4 package, 02 "Shop, rentals and inventory"). Profile shows what
// you own or are lent, with servicing and selling, and opens the shop. A project's Budget page holds its kit: your own
// items and rentals, what the kit can't do yet with what in the shop would fix it, and what a shoot day costs.
import { useState } from 'react';
import { money } from '../engine/budget';
import { formatDateKey } from '../engine/time';
import { GEAR, GEAR_KIND_LABELS, GEAR_SOURCE, RENT_SHARE, SERVICE_BELOW, gearById, gearFacts, rentDayRate, type GearKind } from '../engine/gear-catalog';
import { addToKit, buyGear, buyRefusal, kitAddRefusal, kitDayRate, kitProblems, ownedGear, removeFromKit, resaleValue, sellGear, sellRefusal, serviceCost, serviceGear, serviceRefusal } from '../engine/equipment';
import { housePackageFee } from '../engine/production/rates';
import { personalBalance } from '../engine/personal';
import type { Project } from '../engine/types';
import { Modal, SelectField } from './components';
import { store, useGame } from './store';

const listed = () => formatDateKey(GEAR_SOURCE.retrieved);

/** Profile: what you own and what your family lends, and the shop. */
export function YourEquipmentCard() {
  const g = useGame();
  const [shop, setShop] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const items = ownedGear(g);
  return (
    <section className="card" aria-labelledby="gear-h">
      <div className="row-between wrap"><h2 id="gear-h">Your Equipment</h2><button className="btn" onClick={() => setShop(true)}>Open The Shop</button></div>
      {!items.length ? <p className="muted">You own no equipment. A project with no kit of its own hires the rental house's package for each shoot day.</p> : (
        <ul className="list" aria-label="What You Have">
          {items.map((it) => {
            const gear = gearById(it.gearId)!;
            const away = it.awayUntil && it.awayUntil > g.now;
            const service = serviceRefusal(g, it.id);
            const sell = sellRefusal(g, it.id);
            return (
              <li key={it.id} className="list-item" style={{ flexWrap: 'wrap', gap: 'var(--s2)' }}>
                <div className="grow" style={{ minWidth: 0 }}>
                  <strong>{gear.name}</strong>
                  <div className="dim small">{it.owner === 'family' ? 'Lent by your family' : `Bought for ${money(it.paid)}`}. Condition {it.condition}%{away ? ', away being serviced' : it.condition < SERVICE_BELOW ? ', needs servicing before it is used again' : ''}.</div>
                  {[service && it.condition < 100 && !away ? service : null, it.owner === 'you' ? sell : null].filter(Boolean).map((r) => <div key={r} className="dim small">{r}</div>)}
                </div>
                <button className="btn btn-sm" disabled={!!service} title={service ?? undefined} aria-label={`Service ${gear.name}`} onClick={() => setErr(store.act((s) => serviceGear(s, it.id)))}>Service{!service ? ` For ${money(serviceCost(it))}` : ''}</button>
                {it.owner === 'you' && <button className="btn btn-sm" disabled={!!sell} title={sell ?? undefined} aria-label={`Sell ${gear.name}`} onClick={() => setErr(store.act((s) => void sellGear(s, it.id)))}>Sell For {money(resaleValue(it))}</button>}
              </li>
            );
          })}
        </ul>
      )}
      <p className="dim small">An item in a project's kit costs that project nothing to use. Each shoot day wears it a little; servicing takes three days. Resale, servicing and wear are game calibration.</p>
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      {shop && <Shop onClose={() => setShop(false)} />}
    </section>
  );
}

/** The shop: compare by kind, read what each item fits and where its price is from, and buy from your own account. */
function Shop({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const [kind, setKind] = useState<GearKind>('camera');
  const [err, setErr] = useState<string | null>(null);
  return (
    <Modal title="The Shop" kind="shop" onClose={onClose} footer={<button className="btn" onClick={onClose}>Close</button>}>
      <p className="small">{money(personalBalance(g))} in your own account. Prices are a US retailer's listings on {listed()}; the game charges whole dollars.</p>
      <SelectField label="Show" value={kind} options={(Object.keys(GEAR_KIND_LABELS) as GearKind[]).map((k) => ({ value: k, label: GEAR_KIND_LABELS[k] }))} onChange={(v) => { setKind(v); setErr(null); }} />
      <ul className="list" aria-label={GEAR_KIND_LABELS[kind]}>
        {GEAR.filter((x) => x.kind === kind).map((x) => {
          const no = buyRefusal(g, x.id);
          return (
            <li key={x.id} className="list-item" style={{ flexWrap: 'wrap', gap: 'var(--s2)' }}>
              <div className="grow" style={{ minWidth: 0 }}>
                <strong>{x.name}</strong>
                <div className="small">{gearFacts(x).join('; ')}.</div>
                {no && x.price !== null && <div className="dim small">{no}</div>}
                <div className="dim small">{x.price === null ? 'No price recorded: not sold.' : `${money(x.price)}, or rented for ${money(rentDayRate(x))} a shoot day.`} <a href={x.specFrom.startsWith('http') ? x.specFrom : undefined} target="_blank" rel="noreferrer">{x.specFrom.startsWith('http') ? 'Specifications' : 'Specifications from its name'}</a>{x.priceFrom && <>, <a href={x.priceFrom} target="_blank" rel="noreferrer">price</a></>}.</div>
              </div>
              <button className="btn btn-sm" disabled={!!no} title={no ?? undefined} aria-label={`Buy ${x.name}`} onClick={() => setErr(store.act((s) => void buyGear(s, x.id)))}>Buy</button>
            </li>
          );
        })}
      </ul>
      <p className="dim small">Rental day rates are {Math.round(RENT_SHARE * 100)}% of the listed price, a game calibration, not a rental house's quote.</p>
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
    </Modal>
  );
}

/** A project's Budget page: its kit, or the rental house's package. */
export function ProjectKitCard({ p }: { p: Project }) {
  const g = useGame();
  const [kind, setKind] = useState<GearKind>('camera');
  const [err, setErr] = useState<string | null>(null);
  if (p.axes.medium === 'animation' || p.delivered) return null;
  const live = () => store.state!.projects.find((x) => x.id === p.id)!;
  const shelf = ownedGear(g).filter((it) => !p.kit?.items.some((k) => k.itemId === it.id));
  const problems = kitProblems(p);
  const fixNames = (ids: string[]) => ids.map((id) => gearById(id)!.name).join(', ');
  return (
    <section className="card" aria-labelledby="kit-h">
      <h2 id="kit-h">Equipment</h2>
      {!p.kit ? (
        <p className="muted">Each shoot day hires the rental house's package, {money(housePackageFee(p))} a day at this budget size. Add something of your own or rent an item, and this project shoots on its own kit instead.</p>
      ) : (
        <>
          <p className="muted">This project shoots on its own kit: {kitDayRate(p) ? `${money(kitDayRate(p))} a shoot day in rentals` : 'nothing a day, all of it yours'}. A day the kit can't serve hires the house package for that day, {money(housePackageFee(p))}.</p>
          <ul className="list" aria-label="The Kit">
            {p.kit.items.map((k) => {
              const gear = gearById(k.gearId)!;
              const lent = k.itemId && g.gear?.items.find((x) => x.id === k.itemId)?.owner === 'family';
              return (
                <li key={k.id} className="list-item" style={{ flexWrap: 'wrap', gap: 'var(--s2)' }}>
                  <span className="grow" style={{ minWidth: 0 }}><strong>{gear.name}</strong> <span className="dim small">{k.how === 'rented' ? `Rented, ${money(k.dayRate)} a shoot day` : lent ? 'Lent by your family' : 'Yours'}</span></span>
                  <button className="btn btn-sm" aria-label={`Take Out ${gear.name}`} onClick={() => store.act((s) => removeFromKit(s.projects.find((x) => x.id === p.id)!, k.id))}>Take Out</button>
                </li>
              );
            })}
          </ul>
          {problems.length ? (
            <div role="region" aria-label="What The Kit Can't Do Yet">
              <h3>What The Kit Can't Do Yet</h3>
              <ul className="small">{problems.map((x) => <li key={x.need}>{x.text}{x.fix.length ? ` In the shop: ${fixNames(x.fix)}.` : ''}</li>)}</ul>
            </div>
          ) : <p className="small">The kit covers every approved scene.</p>}
        </>
      )}
      <h3>Add From Your Equipment</h3>
      {!shelf.length ? <p className="dim small">Nothing on your shelf. Buy equipment on your Profile, or rent it below.</p> : (
        <ul className="list" aria-label="Your Equipment To Add">
          {shelf.map((it) => {
            const name = gearById(it.gearId)!.name;
            const no = kitAddRefusal(g, p, { itemId: it.id });
            return (
              <li key={it.id} className="list-item" style={{ flexWrap: 'wrap', gap: 'var(--s2)' }}>
                <span className="grow" style={{ minWidth: 0 }}>{name}{no && <span className="dim small" style={{ display: 'block' }}>{no}</span>}</span>
                <button className="btn btn-sm" disabled={!!no} aria-label={`Add ${name} To Kit`} onClick={() => setErr(store.act((s) => void addToKit(s, live(), { itemId: it.id })))}>Add To Kit</button>
              </li>
            );
          })}
        </ul>
      )}
      <h3>Rent For This Project</h3>
      <SelectField label="Show" value={kind} options={(Object.keys(GEAR_KIND_LABELS) as GearKind[]).map((k) => ({ value: k, label: GEAR_KIND_LABELS[k] }))} onChange={setKind} />
      <ul className="list" aria-label={`${GEAR_KIND_LABELS[kind]} To Rent`}>
        {GEAR.filter((x) => x.kind === kind && x.price !== null).map((x) => {
          const no = kitAddRefusal(g, p, { gearId: x.id });
          return (
            <li key={x.id} className="list-item" style={{ flexWrap: 'wrap', gap: 'var(--s2)' }}>
              <span className="grow" style={{ minWidth: 0 }}>{x.name} <span className="dim small">{money(rentDayRate(x))} a shoot day</span>{no && <span className="dim small" style={{ display: 'block' }}>{no}</span>}</span>
              <button className="btn btn-sm" disabled={!!no} aria-label={`Rent ${x.name}`} onClick={() => setErr(store.act((s) => void addToKit(s, live(), { gearId: x.id })))}>Rent It</button>
            </li>
          );
        })}
      </ul>
      <p className="dim small">A rental is charged only for shoot days it's used and goes back when you take it out. One item of yours can't be on two shoots on the same day.</p>
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
    </section>
  );
}
