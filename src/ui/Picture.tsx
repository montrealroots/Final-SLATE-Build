// A picture from the optional picture pack (src/catalog/packs.ts; the Creative Depth package, milestone G): a person's
// profile photo or a title's poster. The box keeps its shape whether or not a picture comes, so nothing moves when one
// arrives. A picture is read from this browser's storage only when its box is near the screen, never for a whole list
// at once. With no pack, no picture for the subject, pictures switched off, or a device asking for less data, the box
// shows a plain placeholder: the game never draws a face for a real person.
import { useEffect, useRef, useState } from 'react';
import { installedPacks, packExpires, pictureUrl, pictures, shardPicture, type PictureKind, type PictureRecord } from '../catalog/packs';

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
/** A wide picture's width, by the same three sizes; its height follows from 16 to 9. */
const WIDE = { thumb: 96, card: 160, page: 300 };
/** What each kind of picture is called where it is shown, and where it isn't. */
const WORDS: Record<PictureKind, [shown: (name: string) => string, none: (name: string) => string]> = {
  profile: [(n) => `${n}, a photo from TMDB`, (n) => `No photo of ${n} is shown`],
  poster: [(n) => `The poster of ${n}, from TMDB`, (n) => `No poster of ${n} is shown`],
  'season-poster': [(n) => `The poster of ${n}, from TMDB`, (n) => `No poster of ${n} is shown`],
  backdrop: [(n) => `A still from ${n}, from TMDB`, (n) => `No still from ${n} is shown`],
  still: [(n) => `A still from ${n}, from TMDB`, (n) => `No still from ${n} is shown`],
  logo: [(n) => `The logo of ${n}, from TMDB`, (n) => `No logo of ${n} is shown`],
};
const isWide = (kind: PictureKind) => kind === 'backdrop' || kind === 'still' || kind === 'logo';

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

export function Picture({ subject, name, size = 'card', kind }: { subject: string; name: string; size?: keyof typeof SIZE; kind?: PictureKind }) {
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
    void pictureUrl(subject, kind).then((u) => { if (live) setUrl(u); });
    return () => { live = false; };
  }, [subject, kind, on, near, packs]);
  const what: PictureKind = kind ?? (subject.startsWith('person:') ? 'profile' : 'poster');
  const wide = isWide(what);
  const w = wide ? WIDE[size] : SIZE[size];
  const [shown, none] = WORDS[what];
  const ratio = wide ? 16 / 9 : 2 / 3;
  // A logo is drawn whole on a mid grey, since some are white on nothing and some are black on nothing.
  const logo = what === 'logo';
  return (
    <span ref={box} className="picture" data-picture={url ? 'shown' : 'placeholder'} data-kind={what} style={{ display: 'inline-block', width: w, maxWidth: '100%', aspectRatio: wide ? '16 / 9' : '2 / 3', flex: 'none', borderRadius: 4, overflow: 'hidden', background: logo && url ? '#b9bdc6' : 'var(--surface-2, #e6e6e6)', verticalAlign: 'top' }}>
      {url
        ? <img src={url} alt={shown(name)} width={w} height={Math.round(w / ratio)} decoding="async" loading="lazy" style={{ width: '100%', height: '100%', objectFit: logo ? 'contain' : 'cover', display: 'block', padding: logo ? 6 : 0, boxSizing: 'border-box' }} />
        : <span role="img" aria-label={none(name)} style={{ display: 'block', width: '100%', height: '100%' }} />}
    </span>
  );
}

const day = (iso: string | number) => new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** What is known about the picture shown for a subject: where it came from, when, and what isn't claimed about it. */
export function PictureDetails({ subject, kind }: { subject: string; kind?: PictureKind }) {
  const packs = usePacksChanged();
  const [about, setAbout] = useState<{ rec: PictureRecord; rights: string; size: string; ends: number | null } | null>(null);
  useEffect(() => {
    let live = true;
    const want: PictureKind = kind ?? (subject.startsWith('person:') ? 'profile' : 'poster');
    void Promise.all([pictures(), installedPacks(), shardPicture(want, subject)]).then(([index, packs, shard]) => {
      // The whole catalog's pictures first, as the picture itself is looked for (packs.ts pictureUrl).
      const part = shard && packs.get(`pictures.${shard.part}`);
      if (shard && part) { if (live) setAbout({ rec: shard.record, rights: shard.rights, size: shard.size, ends: packExpires(part) }); return; }
      const rec = want === 'profile' || want === 'poster' ? index?.entries[subject] : undefined;
      const pack = packs.get('images');
      if (live) setAbout(rec && index && pack ? { rec, rights: index.rights, size: subject.startsWith('person:') ? index.sizes.profile : index.sizes.poster, ends: packExpires(pack) } : null);
    });
    return () => { live = false; };
  }, [subject, kind, packs]);
  if (!about) return null;
  return (
    <details className="small">
      <summary>About This Picture</summary>
      <ul className="dim">
        <li>From TMDB, where it is the picture at {about.rec.p}, fetched {day(`${about.rec.at}T00:00:00Z`)} at TMDB's size {about.size} ({about.rec.w} by {about.rec.h}).</li>
        <li>{about.rec.loc ? `TMDB records its language as ${about.rec.loc}.` : 'No language is recorded for it.'}</li>
        <li>{about.rights}</li>
        {about.ends && <li>It is deleted from this browser with the rest of its pack on {day(about.ends)}: TMDB allows its data to be kept six months.</li>}
        <li>A picture is something to look at. Nothing in the game reads it, and it changes no outcome.</li>
      </ul>
    </details>
  );
}
