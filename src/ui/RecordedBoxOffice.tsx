// Real films' box office as recorded in Wikidata (engine/box-office-recorded.ts), from November 22, 2026: on a film's page
// in Companies, and among your films in Box Office Records. Only what was recorded by your story's date is shown.
import { formatDateKey } from '../engine';
import { recordedFilm, recordedFor, type RecordedFigure } from '../engine/box-office-recorded';
import { countryName } from '../world/gazetteer/gazetteer';
import { Panel } from './components';

/** An amount in its own currency, never converted. */
export const inCurrency = (amount: number, currency: string): string => {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount); } catch { return `${amount.toLocaleString('en-US')} ${currency}`; }
};
export const territoryName = (where: string): string =>
  where === 'WORLD' ? 'Worldwide' : where === 'NA' ? 'North America (the US and Canada)' : where === 'UNSPECIFIED' ? 'Where not recorded' : countryName(where);
/** "As Box Office Mojo reported it, recorded on March 7, 2019", or the date alone when no source is named. */
export const recordedLine = (f: RecordedFigure): string =>
  `${f.source ? `as ${f.source} reported it, ` : ''}recorded on ${formatDateKey(f.known)}${f.through !== f.known ? `, for the takings to ${formatDateKey(f.through)}` : ''}`;

export function RecordedBoxOffice({ tmdb, today }: { tmdb: number; today: string }) {
  const film = recordedFilm(tmdb);
  if (!film) return null;
  const figures = recordedFor(today, film);
  const later = film.figures.filter((f) => f.known > today).length;
  return (
    <Panel title="Box Office As Recorded" subtitle="Real takings, as Wikidata records them.">
      {figures.length ? (
        <dl className="kv" aria-label="Box Office As Recorded">
          {figures.map((f) => (
            <div key={f.where} style={{ display: 'contents' }}>
              <dt>{territoryName(f.where)}</dt>
              <dd>{inCurrency(f.amount, f.currency)} <span className="dim small">({recordedLine(f)})</span></dd>
            </div>
          ))}
        </dl>
      ) : <p className="muted">Nothing had been recorded by this point in your story.</p>}
      {later > 0 && <p className="dim small">{later === 1 ? 'One more figure was' : `${later} more figures were`} recorded later than your story's date, so {later === 1 ? "it isn't" : "they aren't"} shown yet.</p>}
      <p className="dim small">Each figure is a total as it stood when it was recorded, in its own currency, never converted. It's what the film took in cinemas, not what its makers earned.</p>
    </Panel>
  );
}
