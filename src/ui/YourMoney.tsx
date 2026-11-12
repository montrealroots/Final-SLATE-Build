// Your own money on screen (engine/personal.ts; the v4 package, 02). The Profile card says what your account holds, kept
// apart by what each part is (a loan is never earnings), and what you owe your family. The project card on Budget is the
// only way money moves between your account and a project: put some in, or take home what a delivered project kept.
import { useState } from 'react';
import { money } from '../engine/budget';
import { PERSONAL_LABELS, SUPPORT_LABELS, loanStanding, personalBalance, personalStatement, putInOwnMoney, putInRefusal, takeHome, takeHomeAvailable } from '../engine/personal';
import type { Project } from '../engine/types';
import { NumberField } from './components';
import { store, useGame } from './store';

export function YourMoneyCard() {
  const g = useGame();
  const f = g.money?.family;
  const loan = loanStanding(g);
  const shareBack = f?.support === 'investment' ? -(g.money?.postings ?? []).filter((x) => x.kind === 'participation').reduce((a, x) => a + x.amount, 0) : 0;
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
