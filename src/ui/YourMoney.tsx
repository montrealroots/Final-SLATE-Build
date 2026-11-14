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
import { companyBalance, setBanner } from '../engine/company';
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
 * Your banner (company.ts): the name your work is credited under. The company that stood beside it on this card from
 * November 13, 2026 left play on November 14, 2026 (the owner's command: "Remove the company system from active
 * gameplay for now"): no company is formed, funded or drawn on. A save that had one keeps its record (FormerCompanyCard).
 */
export function CompanyCard() {
  const g = useGame();
  const [banner, setBannerText] = useState(g.banner?.name ?? '');
  const [err, setErr] = useState<string | null>(null);
  return (
    <section className="card" aria-labelledby="banner-h">
      <h2 id="banner-h">Your Banner</h2>
      <p className="muted small">A name your work is credited under, &quot;A … Production&quot;. It is you by another name: no company, no account of its own, no protection and no rights moved.</p>
      <div className="inline-form">
        <TextField label="Banner Name" value={banner} maxLength={60} onChange={setBannerText} />
        <button className="btn" onClick={() => setErr(store.act((s) => setBanner(s, banner)))}>{banner.trim() ? 'Use This Banner' : 'Use No Banner'}</button>
      </div>
      {g.banner && <p className="small">Your work is credited as A {g.banner.name} Production.</p>}
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
      <FormerCompany />
    </section>
  );
}

/** A company from before November 14, 2026: its record, kept as it was, with what is still to be decided. */
function FormerCompany() {
  const g = useGame();
  const c = g.company;
  const r = g.reconciliation?.company;
  if (!c) return null;
  return (
    <>
      <h3>{c.name}, From Before</h3>
      <p className="small">Companies left the game on November 14, 2026. {c.name} is kept as it was: {money(companyBalance(g))} is in its own account, and none of it was added to yours.{r?.needsOwnershipDecision ? ' Whose that money and its deals are now is still to be decided, so nothing moves in or out of it.' : ''}</p>
      {r && r.firstLooksPayingIt.length > 0 && <p className="small">{r.firstLooksPayingIt.length === 1 ? 'A first-look deal signed while it held it goes on paying it' : `${r.firstLooksPayingIt.length} first-look deals signed while it held them go on paying it`}, as signed.</p>}
      {r && r.projectsProduced.length > 0 && <p className="small">It is still credited as producer of {r.projectsProduced.length === 1 ? 'one project' : `${r.projectsProduced.length} projects`}.</p>}
    </>
  );
}

