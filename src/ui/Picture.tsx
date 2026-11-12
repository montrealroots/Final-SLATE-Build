// A picture from the optional picture pack (src/catalog/packs.ts; the Creative Depth package, milestone G): a person's
// profile photo or a title's poster. The box keeps its shape whether or not a picture comes, so nothing moves when one
// arrives. A picture is read from this browser's storage only when its box is near the screen, never for a whole list
// at once. With no pack, no picture for the subject, pictures switched off, or a device asking for less data, the box
// shows a plain placeholder: the game never draws a face for a real person.
import { useEffect, useRef, useState } from 'react';
import { installedPacks, packExpires, pictureUrl, pictures, type PictureRecord } from '../catalog/packs';

const KEY = 'slate.pictures';
/** This device's choice (Settings): 'on' unless switched off. Kept on the device, not in a saved game. */
export function picturesOn(): boolean {
  try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; }
}
export function setPicturesOn(on: boolean): void {
  try { if (on) localStorage.removeItem(KEY); else localStorage.setItem(KEY, 'off'); } catch { /* a device that keeps nothing shows them */ }
  window.dispatchEvent(new Event('slate-pictures'));
}
/** A device that has asked its browser for less data is shown none unless the player turns them on here. */
const savesData = (): boolean => !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;

const SIZE = { thumb: 40, card: 92, page: 154 };

/** Counts each time the installed packs change, so a picture's box asks again. */
function usePacksChanged(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const bump = () => setN((x) => x + 1);
    window.addEventListener('slate-packs', bump);
    return () => window.removeEventListener('slate-packs', bump);
  }, []);
  return n;
}

export function Picture({ subject, name, size = 'card' }: { subject: string; name: string; size?: keyof typeof SIZE }) {
  // Looks again when a pack comes, goes or expires (packs.ts announces it) and when the device's choice changes.
  const packs = usePacksChanged();
  const [url, setUrl] = useState<string | null>(null);
  const [near, setNear] = useState(false);
  const [on, setOn] = useState(() => picturesOn() && !savesData());
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const change = () => setOn(picturesOn() && !savesData());
    window.addEventListener('slate-pictures', change);
    return () => window.removeEventListener('slate-pictures', change);
  }, []);
  useEffect(() => {
    const el = box.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === 'undefined') { setNear(true); return; }
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); } }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  useEffect(() => {
    let live = true;
    if (!on || !near) { setUrl(null); return; }
    void pictureUrl(subject).then((u) => { if (live) setUrl(u); });
    return () => { live = false; };
  }, [subject, on, near, packs]);
  const w = SIZE[size];
  const person = subject.startsWith('person:');
  return (
    <span ref={box} className="picture" data-picture={url ? 'shown' : 'placeholder'} style={{ display: 'inline-block', width: w, aspectRatio: '2 / 3', flex: 'none', borderRadius: 4, overflow: 'hidden', background: 'var(--surface-2, #e6e6e6)', verticalAlign: 'top' }}>
      {url
        ? <img src={url} alt={person ? `${name}, a photo from TMDB` : `The poster of ${name}, from TMDB`} width={w} height={Math.round(w * 1.5)} decoding="async" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <span role="img" aria-label={person ? `No photo of ${name} is shown` : `No poster of ${name} is shown`} style={{ display: 'block', width: '100%', height: '100%' }} />}
    </span>
  );
}

const day = (iso: string | number) => new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** What is known about the picture shown for a subject: where it came from, when, and what isn't claimed about it. */
export function PictureDetails({ subject }: { subject: string }) {
  const packs = usePacksChanged();
  const [about, setAbout] = useState<{ rec: PictureRecord; rights: string; size: string; ends: number | null } | null>(null);
  useEffect(() => {
    let live = true;
    void Promise.all([pictures(), installedPacks()]).then(([index, packs]) => {
      const rec = index?.entries[subject];
      const pack = packs.get('images');
      if (live) setAbout(rec && index && pack ? { rec, rights: index.rights, size: subject.startsWith('person:') ? index.sizes.profile : index.sizes.poster, ends: packExpires(pack) } : null);
    });
    return () => { live = false; };
  }, [subject, packs]);
  if (!about) return null;
  return (
    <details className="small">
      <summary>About This Picture</summary>
      <ul className="dim">
        <li>From TMDB, where it is the picture at {about.rec.p}, fetched {day(`${about.rec.at}T00:00:00Z`)} at TMDB's size {about.size} ({about.rec.w} by {about.rec.h}).</li>
        <li>{about.rec.loc ? `TMDB records its language as ${about.rec.loc}.` : 'No language is recorded for it.'}</li>
        <li>{about.rights}</li>
        {about.ends && <li>It is deleted from this browser with the rest of the picture pack on {day(about.ends)}: TMDB allows its data to be kept six months.</li>}
        <li>A picture is something to look at. Nothing in the game reads it, and it changes no outcome.</li>
      </ul>
    </details>
  );
}
