// The record book on the Profile page (engine/box-office.ts): this career's films in cinemas, from their weeks.
import { money, formatDateKey } from '../engine';
import { recordBook } from '../engine/box-office';
import { store, useGame } from './store';
import { plural } from './components';

const place = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;

export function RecordBookCard() {
  const g = useGame();
  const rows = recordBook(g);
  const years: Record<string, number> = {};
  for (const r of rows) for (const [y, v] of Object.entries(r.byYear)) years[y] = (years[y] ?? 0) + v;
  return (
    <section className="card" aria-labelledby="book-h">
      <h2 id="book-h">Record Book</h2>
      {rows.length ? (
        <>
          <p className="dim">Your films in cinemas, by ticket sales. Simulated by the game, and only what happened in this story: no real box office is in this book. Ticket sales are not earnings; each film's Release page shows who kept what. Equal figures share a place.</p>
          <ul className="list">
            {rows.map((r) => (
              <li key={r.projectId}>
                <strong><button className="link" onClick={() => store.go({ view: 'project', projectId: r.projectId, tab: 'release' })}>{r.title}</button></strong> <span className="dim">· opened {formatDateKey(r.opened)}</span>
                <div className="dim">
                  Opening week {money(r.opening)} ({place(r.rank.opening)}). Lifetime {money(r.lifetime)} ({place(r.rank.lifetime)}) from {r.admissions.toLocaleString('en-US')} admissions over {plural(r.weeks, 'week')}{r.runs > 1 ? ` and ${r.runs} runs` : ''}. Best week {money(r.best.gross)}, week {r.best.week}.{r.settled ? '' : ' Some weeks are provisional and can still move.'}
                </div>
              </li>
            ))}
          </ul>
          <p className="dim small">By the year a week ended in: {Object.keys(years).sort().map((y) => `${y}, ${money(years[y])}`).join('; ')}.</p>
        </>
      ) : <p className="muted">A film you release in cinemas is entered here week by week: its opening, its best week and what it took in all. Every figure in it is the game's own simulation.</p>}
    </section>
  );
}
