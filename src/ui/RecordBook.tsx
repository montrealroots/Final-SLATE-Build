// Box Office Records on the Profile page (engine/box-office.ts): this career's films in cinemas, from their weeks. Titled
// "Box Office Records" from November 13, 2026 (the owner's v6 package, 02 C; until then "Record Book"), with the records
// as they stood at the end of any year they cover, and calendar-year takings kept apart from a release year's.
import { useState } from 'react';
import { money, formatDateKey } from '../engine';
import { byReleaseYear, recordBook } from '../engine/box-office';
import { dateKey } from '../engine/time';
import { getPlace } from '../data/places';
import { store, useGame } from './store';
import { SelectField, plural } from './components';

const place = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;

export function RecordBookCard() {
  const g = useGame();
  const today = dateKey(g.now, getPlace(g.locationId).zone);
  const [asOf, setAsOf] = useState('today');
  const all = recordBook(g);
  // The end of each year the records cover, before this one.
  const first = all.map((r) => r.opened).sort()[0];
  const ends = first ? Array.from({ length: Number(today.slice(0, 4)) - Number(first.slice(0, 4)) }, (_, k) => `${Number(first.slice(0, 4)) + k}-12-31`) : [];
  const rows = asOf === 'today' ? all : recordBook(g, asOf);
  const years: Record<string, number> = {};
  for (const r of rows) for (const [y, v] of Object.entries(r.byYear)) years[y] = (years[y] ?? 0) + v;
  const opened = byReleaseYear(rows);
  return (
    <section className="card" aria-labelledby="book-h">
      <h2 id="book-h">Box Office Records</h2>
      {ends.length > 0 && <SelectField label="As Of" value={asOf} onChange={setAsOf} options={[{ value: 'today', label: `Today, ${formatDateKey(today)}` }, ...ends.reverse().map((k) => ({ value: k, label: formatDateKey(k) }))]} />}
      {rows.length ? (
        <>
          <p className="dim">Your films in cinemas, by ticket sales{asOf === 'today' ? '' : `, as they stood on ${formatDateKey(asOf)}`}. Simulated by the game, and only what happened in this story: no real box office is in these records. Ticket sales are not earnings: under each film are the film rental, the project's income, what it cost, its profit and what came to you, each kept apart. Equal figures share a place.</p>
          <ul className="list">
            {rows.map((r) => (
              <li key={r.projectId}>
                <strong><button className="link" onClick={() => store.go({ view: 'project', projectId: r.projectId, tab: 'release' })}>{r.title}</button></strong> <span className="dim">· opened {formatDateKey(r.opened)}</span>
                <div className="dim">
                  Opening week {money(r.opening)} ({place(r.rank.opening)}). Lifetime {money(r.lifetime)} ({place(r.rank.lifetime)}) from {r.admissions.toLocaleString('en-US')} admissions over {plural(r.weeks, 'week')}{r.runs > 1 ? ` and ${r.runs} runs` : ''}. Best week {money(r.best.gross)}, week {r.best.week}.{r.settled ? '' : ' Some weeks are provisional and can still move.'}
                </div>
                <dl className="kv small" aria-label={`${r.title}: The Money`}>
                  <dt>Ticket Sales</dt><dd>{money(r.lifetime)}</dd>
                  <dt>Film Rental</dt><dd>{money(r.money.rental)}, what the cinemas passed on</dd>
                  <dt>The Project's Income</dt><dd>{money(r.money.income)}, from every deal</dd>
                  <dt>Spent Making It</dt><dd>{money(r.money.cost)}</dd>
                  <dt>Profit</dt><dd>{money(r.money.profit)}</dd>
                  <dt>Yours</dt><dd>{money(r.money.yours)}, taken home or to your company</dd>
                </dl>
              </li>
            ))}
          </ul>
          <p className="dim small">Taken in each calendar year: {Object.keys(years).sort().map((y) => `${y}, ${money(years[y])}`).join('; ')}.</p>
          <p className="dim small">Lifetime takings of the films that opened each year: {Object.keys(opened).sort().map((y) => `${y}, ${money(opened[y])}`).join('; ')}.</p>
        </>
      ) : <p className="muted">{asOf === 'today' ? 'A film you release in cinemas is entered here week by week: its opening, its best week and what it took in all. Every figure in it is the game\'s own simulation.' : `Nothing had played in cinemas by ${formatDateKey(asOf)}.`}</p>}
    </section>
  );
}
