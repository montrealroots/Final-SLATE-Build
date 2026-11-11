// Where each place in the script is filmed, on the Schedule page (destinations.ts; the Creative Depth package, milestone
// E). The place is real: any entry of the world registry. The site is a candidate the game makes up, of the kind chosen,
// and the page says so every time it is named. What the choice asks is shown before anything is chosen.
import { useState } from 'react';
import type { Place } from '../data/places';
import { getPlace } from '../data/places';
import { adoptPlace } from '../engine';
import { SITE_KINDS, candidateSite, filmedAt, filmedAtPreview, filmedAtRefusal, isAway, kmFromBase, setFilmedAt, type SiteKind } from '../engine/destinations';
import { approvedScenes, sceneTechnique } from '../engine/projects';
import type { Project } from '../engine/types';
import { Modal, SelectField } from './components';
import { store } from './store';
import { WorldPlacePicker } from './WorldPicker';

const live = (s: { projects: Project[] }, p: Project) => s.projects.find((x) => x.id === p.id)!;

export function FilmedAtCard({ p }: { p: Project }) {
  const [choosing, setChoosing] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const labels = [...new Set(approvedScenes(p).filter((s) => sceneTechnique(p, s) === 'live' && s.kind !== 'archival').map((s) => s.storyLocation || s.heading.place))].filter(Boolean).sort();
  if (!labels.length) return null;
  const base = getPlace(p.axes.basePlaceId);
  return (
    <section className="card" aria-labelledby="filmed-at-h">
      <h2 id="filmed-at-h">Where Each Place Is Filmed</h2>
      <p className="dim">Where the story happens and where it is filmed are separate. Each place in the script is filmed at your base, {base.name}, unless you choose somewhere else: any real place in the world, and a kind of site there. The day then has that place's weather, daylight and public holidays, and you have to be there. The site itself is a candidate the game makes up; it is never a real venue.</p>
      {note && <p role="status" className="callout callout-info">{note}</p>}
      <ul className="list">
        {labels.map((label) => {
          const at = filmedAt(p, label);
          const why = filmedAtRefusal(p, label);
          return (
            <li key={label} className="row-wrap">
              <div className="grow">
                <strong>{label}</strong> {at ? <span className="chip chip-info">{getPlace(at.placeId).name}{isAway(p, label) ? `, ${kmFromBase(p, label).toLocaleString('en-US')} km Away` : ''}</span> : <span className="chip">At The Base</span>}
                <div className="dim">{at ? candidateSite(p, label) : `Filmed in ${base.name}, as everything is until you choose.`}</div>
                {why && <div className="dim">{why}</div>}
              </div>
              {!why && <button className="btn btn-sm" onClick={() => { setNote(null); setChoosing(label); }} aria-label={`Choose Where ${label} Is Filmed`}>Choose Where It Is Filmed</button>}
            </li>
          );
        })}
      </ul>
      {choosing && <Chooser p={p} label={choosing} onClose={() => setChoosing(null)} onDone={(text) => { setNote(text); setChoosing(null); }} />}
    </section>
  );
}

function Chooser({ p, label, onClose, onDone }: { p: Project; label: string; onClose: () => void; onDone: (text: string) => void }) {
  const at = filmedAt(p, label);
  const [place, setPlace] = useState<Place | null>(at ? getPlace(at.placeId) : null);
  const [kind, setKind] = useState<SiteKind>(at?.kind ?? 'street');
  const [err, setErr] = useState<string | null>(null);
  const pre = place ? filmedAtPreview(p, label, place.id, kind) : null;
  const scheduled = p.schedule.days.some((d) => d.status === 'scheduled');
  const after = scheduled ? ' Rebuild the schedule for the days, the permits and the costs to follow it.' : '';
  const apply = () => {
    if (!place) return setErr('Search for a place and choose one.');
    const e = store.act((s) => { adoptPlace(s, place); setFilmedAt(live(s, p), label, { placeId: place.id, kind }); });
    if (e) setErr(e); else onDone(`${label} is filmed in ${place.name}.${after}`);
  };
  const reset = () => { const e = store.act((s) => setFilmedAt(live(s, p), label, null)); if (e) setErr(e); else onDone(`${label} is filmed at the base again.${after}`); };
  return (
    <Modal title={`Where ${label} Is Filmed`} onClose={onClose} footer={<>
      <button className="btn" onClick={onClose}>Keep It As It Is</button>
      {at && <button className="btn" onClick={reset}>Film It At The Base</button>}
      <button className="btn btn-primary" onClick={apply}>Film It There</button>
    </>}>
      <p className="muted">The story can still say {label} is anywhere, or nowhere real: this only decides where the unit goes.</p>
      <WorldPlacePicker label="Film It In" value={place?.id ?? ''} map={false} onChoose={(pl) => { setPlace(pl); setErr(null); }} />
      <SelectField label="Kind Of Site" value={kind} options={(Object.keys(SITE_KINDS) as SiteKind[]).map((k) => ({ value: k, label: SITE_KINDS[k].label }))} onChange={setKind}
        hint="What the game looks for there. It makes up a candidate of that kind; it doesn't claim the place has one, or name any real venue." />
      {pre && place && (
        <div className="callout callout-info" aria-label="What Filming There Asks">
          <p style={{ margin: 0 }}><strong>{place.name}, {place.countryName}</strong></p>
          <ul>{pre.lines.map((l) => <li key={l}>{l}</li>)}</ul>
          <p className="dim small" style={{ margin: 0 }}>The fee, the permit time, the noise and the cost of moving and housing the unit are the game's figures, not quotes, rates or legal guidance.</p>
        </div>
      )}
      {err && <p role="alert" style={{ color: 'var(--negative)' }}>{err}</p>}
    </Modal>
  );
}
