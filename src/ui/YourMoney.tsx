// Your own money on screen (engine/personal.ts; the v4 package, 02). The Profile card says what your account holds, kept
// apart by what each part is (a loan is never earnings), and what you owe your family. The project card on Budget is the
// only way money moves between your account and a project: put some in, or take home what a delivered project kept.
import { useState } from 'react';
import { money } from '../engine/budget';
import { PERSONAL_LABELS, personalPostings, SUPPORT_LABELS, loanStanding, personalBalance, personalStatement, putInOwnMoney, putInRefusal, takeHome, takeHomeAvailable } from '../engine/personal';
import type { Project } from '../engine/types';
import { formatMoney } from '../engine/cash/money';
import { formatDateKey } from '../engine/time';
import { NumberField, TextField } from './components';
import { COMPANY_LABELS, FORMATION_FEE, companyBalance, companyInRefusal, companyIntoProject, companyStatement, formCompany, formRefusal, moveCompanyMoney, takeToCompany } from '../engine/company';
import { store, useGame } from './store';

export function YourMoneyCard() {
  const g = useGame();
  const f = g.money?.family;
  const loan = loanStanding(g);
  const shareBack = f?.support === 'investment' ? -personalPostings(g).filter((x) => x.kind === 'participation').reduce((a, x) => a + x.amount, 0) : 0;
  return (
    <section className="card" aria-labelledby="yourmoney-h">
      <h2 id="yourmoney-h">Your Money</h2>
      {!g.money ? (
        <p className="muted">This story began before your own money was part of the game, so your account is empty. Money you take home from a delivered project comes here.</p>
      ) : (
        <>
          <p><strong>{money(personalBalance(g))}</strong> in your own account.</p>
          <ul className="list" aria-label="Your Account, By What It Is">
            {personalStatement(g).map((x) => <li key={x.kind} className="list-item"><span className="grow">{PERSONAL_LABELS[x.kind]}</span><span>{money(x.total)}</span></li>)}
          </ul>
          {g.money.source && <p className="small"><strong>Where It Came From:</strong> Your inheritance of {formatMoney({ currency: g.money.source.currency, minor: g.money.source.amountMinor })}, released on your nineteenth birthday, {formatDateKey(g.money.source.releasedOn)}. Your family&apos;s wealth comes from oil; there is no allowance after it, and nobody to bail you out.</p>}
          {f && f.support !== 'none' && <p className="small"><strong>Your Family:</strong> {f.support === 'equipment' ? `Lends you equipment worth ${money(f.amount)} at listed prices; it's under Your Equipment.` : `${SUPPORT_LABELS[f.support]} of ${money(f.amount)}.`}{loan ? ` ${money(loan.repaid)} repaid, ${money(loan.owed)} still owed at ${money(f.monthly!)} a month.` : ''}{f.support === 'investment' ? ` They take ${Math.round(f.share! * 100)}% of the income you take home, until they have had ${money(f.cap!)} back; ${money(shareBack)} so far.` : ''}</p>}
          <p className="dim small">Money moves between your account and a project only when you move it, on the project's Budget page. Amounts are game calibration.</p>
        </>
      )}
    </section>
  );
}

/** On a project's Budget page: put your own money in, or take home what the delivered project kept. */
export function OwnAccountCard({ p }: { p: Project }) {
  const g = useGame();
  const [amount, setAmount] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const live = () => store.state!.projects.find((x) => x.id === p.id)!;
  const home = takeHomeAvailable(p);
  const have = personalBalance(g);
  if (!p.delivered && have <= 0) return null;
  const no = putInRefusal(g, p, amount);
  return (
    <section className="card" aria-labelledby="ownacc-h">
      <h2 id="ownacc-h">Your Own Account</h2>
      <p className="muted">{money(have)} in your own account.</p>
      {!p.delivered ? (
        <>
          <div className="inline-form">
            <NumberField label="Put In From Your Own Money" value={amount} min={0} max={Math.max(0, have)} onChange={setAmount} />
            <button className="btn" disabled={!!no} onClick={() => { const e = store.act((s) => void putInOwnMoney(s, live(), amount)); setErr(e); if (!e) setAmount(0); }}>Put It In</button>
          </div>
          <p className="dim small">{no && amount > 0 ? no : 'Nobody is repaid from it and nobody takes a share; what the project doesn\'t spend stays yours.'}</p>
        </>
      ) : (
        <>
          <p className="small">It can send home {money(home.earnings)} of income it kept and {money(home.capital)} of your own money it didn't spend.</p>
          <div className="row gap-2 wrap">
            <button className="btn" disabled={home.earnings <= 0} onClick={() => setErr(store.act((s) => takeHome(s, live(), 'earnings', takeHomeAvailable(live()).earnings)))}>Take Home {money(home.earnings)} Of Income</button>
            <button className="btn" disabled={home.capital <= 0} onClick={() => setErr(store.act((s) => takeHome(s, live(), 'capital', takeHomeAvailable(live()).capital)))}>Take Home {money(home.capital)} Of Your Money</button>
          </div>
        </>
      )}
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
    </section>
  );
}

/**
 * Your production company (company.ts, from November 13, 2026): formed with a name and capital from your own account; its
 * own account by what each part is; money moved in and drawn out, each posted on both sides.
 */
export function CompanyCard() {
  const g = useGame();
  const [name, setName] = useState('');
  const [capital, setCapital] = useState(0);
  const [amount, setAmount] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const c = g.company;
  if (!g.money) return null;
  if (!c) {
    const no = formRefusal(g, name, capital);
    return (
      <section className="card" aria-labelledby="company-h">
        <h2 id="company-h">Your Company</h2>
        <p className="muted">A production company of your own, with its own account. It can put money into your projects, which it then produces and is credited for, and take their income back. Forming it costs {money(FORMATION_FEE)} from your own account; what you put in moves from your account to the company's.</p>
        <div className="inline-form">
          <TextField label="Company Name" value={name} maxLength={60} onChange={setName} />
          <NumberField label="Put In When It Is Formed" value={capital} min={0} max={Math.max(0, personalBalance(g))} onChange={setCapital} />
          <button className="btn" disabled={!!no} onClick={() => setErr(store.act((s) => void formCompany(s, name, capital)))}>Form The Company</button>
        </div>
        {no && name.trim().length >= 2 && <p className="dim small">{no}</p>}
        {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      </section>
    );
  }
  return (
    <section className="card" aria-labelledby="company-h">
      <h2 id="company-h">Your Company</h2>
      <p><strong>{c.name}</strong>: {money(companyBalance(g))} in its account.</p>
      <ul className="list" aria-label="Its Account, By What It Is">
        {companyStatement(g).map((x) => <li key={x.kind} className="list-item"><span className="grow">{COMPANY_LABELS[x.kind]}</span><span>{money(x.total)}</span></li>)}
      </ul>
      <div className="inline-form">
        <NumberField label="Move Between You And The Company" value={amount} min={0} max={100_000_000} onChange={setAmount} />
        <button className="btn" disabled={!(amount > 0) || amount > personalBalance(g)} onClick={() => { const e = store.act((s) => moveCompanyMoney(s, 'in', amount)); setErr(e); if (!e) setAmount(0); }}>Put It In</button>
        <button className="btn" disabled={!(amount > 0) || amount > companyBalance(g)} onClick={() => { const e = store.act((s) => moveCompanyMoney(s, 'out', amount)); setErr(e); if (!e) setAmount(0); }}>Draw It Out</button>
      </div>
      <p className="dim small">You have {money(personalBalance(g))} in your own account and the company {money(companyBalance(g))}: Put It In moves only what you hold, Draw It Out only what the company holds. Money moves only when you move it. The game models no tax, payroll or company law; amounts are game calibration.</p>
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
    </section>
  );
}

/** On a project's Budget page: your company's money in, or a delivered project's money back to the company. */
export function CompanyProjectCard({ p }: { p: Project }) {
  const g = useGame();
  const [amount, setAmount] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const c = g.company;
  if (!c) return null;
  const live = () => store.state!.projects.find((x) => x.id === p.id)!;
  const home = takeHomeAvailable(p);
  const no = companyInRefusal(g, p, amount);
  return (
    <section className="card" aria-labelledby="company-p-h">
      <h2 id="company-p-h">{c.name}</h2>
      <p className="muted">{money(companyBalance(g))} in the company's account.{p.producedBy ? ` It produces ${p.title}, and its credits say so.` : ''}</p>
      {!p.delivered ? (
        <>
          <div className="inline-form">
            <NumberField label="Put In From The Company" value={amount} min={0} max={Math.max(0, companyBalance(g))} onChange={setAmount} />
            <button className="btn" disabled={!!no} onClick={() => { const e = store.act((s) => void companyIntoProject(s, live(), amount)); setErr(e); if (!e) setAmount(0); }}>Put It In</button>
          </div>
          <p className="dim small">{no && amount > 0 ? no : `Nobody is repaid from it; what the project doesn't spend is ${c.name}'s again, and ${c.name} produces it.`}</p>
        </>
      ) : (
        <div className="row gap-2 wrap">
          <button className="btn" disabled={home.earnings <= 0} onClick={() => setErr(store.act((s) => takeToCompany(s, live(), 'earnings', takeHomeAvailable(live()).earnings)))}>Move {money(home.earnings)} Of Income To {c.name}</button>
          <button className="btn" disabled={home.capital <= 0} onClick={() => setErr(store.act((s) => takeToCompany(s, live(), 'capital', takeHomeAvailable(live()).capital)))}>Move {money(home.capital)} Unspent To {c.name}</button>
        </div>
      )}
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
    </section>
  );
}
