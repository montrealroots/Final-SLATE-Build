// The music catalog (music-catalog.ts, Wikidata): a real recording licensed into the film, and a real composer
// considered for the score. A licensed recording is released only once its holders license it (music.ts
// releaseLicenceRefusal), so the career here asks and agrees, as license-song does; a composer is considered, then
// offered the job at their rate, the money for their days put in first.
import { readFileSync } from 'node:fs';
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { applyMusicCatalog, considerComposer, licenseRecording } from '../../../src/engine/music-catalog';
import { attachSong } from '../../../src/engine/song-actions';
import { agreeLicence, licenceTotal, requestLicence } from '../../../src/engine/music';
import { approvedScenes } from '../../../src/engine/projects';
import { considerFor } from '../../../src/engine/guests';
import { estimateDays, makeOffer } from '../../../src/engine/hiring';
import { personById } from '../../../src/engine/people';
import { financeSummary, setFinanceTarget } from '../../../src/engine/finance';
import { putInOwnMoney } from '../../../src/engine/personal';
import { dateKey } from '../../../src/engine/time';
import { fund } from './casting';

// The catalog the Music page fetches, read from the file here.
const CATALOG = applyMusicCatalog(JSON.parse(readFileSync('src/data/music.json', 'utf8')));
const RECORDING = CATALOG.recordings[0];

/** Before money is raised: the catalog's first recording licensed into the last scene's background. */
const useRecording = (s: GameState, p: Project) => {
  if (!p.music) return;
  const song = licenseRecording(s, p, CATALOG, RECORDING);
  attachSong(p, song.id, approvedScenes(p).at(-1)!.id, 'background');
};
/**
 * Each day: its holders asked for digital sale in Britain for 3 years (the career's release), and asked again after a
 * refusal; their quote agreed, the money for it put in first. Since November 15, 2026 a famous recording is priced as
 * one (music.ts holderFee): "Gangnam Style" asks about $16,000 of a micro-budget short, more than it has left.
 */
const licensing = (s: GameState) => {
  for (const p of s.projects.filter((x) => !x.delivered && x.music)) {
    const song = (p.songs ?? []).find((x) => x.recording?.id === RECORDING.id);
    if (!song) continue;
    const ls = p.music!.licences.filter((l) => l.songId === song.id);
    if (!ls.some((l) => l.status !== 'refused' && l.status !== 'declined')) { requestLicence(s, p, song.id, { territories: ['GB'], media: ['digital'], years: 3 }); continue; }
    for (const l of ls.filter((x) => x.status === 'quoted' || x.status === 'countered')) {
      const need = licenceTotal(l);
      setFinanceTarget(p, financeSummary(p).target + need); putInOwnMoney(s, p, need);
      agreeLicence(s, p, l.id);
    }
  }
};

/** Composers with recorded film scores, most first. */
const COMPOSERS = CATALOG.people.filter((m) => m.kind === 'person' && m.tmdb && m.scores?.films).sort((a, b) => b.scores!.films - a.scores!.films);
/** Funded, then the most prolific composer who can be approached considered for the score, their days paid in, and offered it. */
const hireComposer = (s: GameState, p: Project) => {
  fund(s, p);
  const today = dateKey(s.now, 'UTC');
  for (const m of COMPOSERS) {
    try {
      const who = considerComposer(s, CATALOG, m);
      considerFor(s, p, { personId: who.id, roleId: 'composer' }, today);
      const rate = personById(s, who.id, 'composer').dayRate;
      const need = rate * estimateDays(p, 'composer', undefined, undefined, s);
      setFinanceTarget(p, financeSummary(p).target + need); putInOwnMoney(s, p, need);
      makeOffer(s, p, { personId: who.id, roleId: 'composer', dayRate: rate });
      return;
    } catch { /* no recorded age, died, busy, or no film score to join: the next */ }
  }
};

const measure = (_s: GameState, projects: Project[]) => ({
  catalogSongs: projects.reduce((a, p) => a + (p.songs ?? []).filter((x) => x.recording).length, 0),
  licensed: projects.reduce((a, p) => a + (p.music?.licences ?? []).filter((l) => l.status === 'agreed').length, 0),
  realComposers: projects.reduce((a, p) => a + p.hires.filter((h) => h.roleId === 'composer' && h.personId.startsWith('tp_') && (h.status === 'accepted' || h.status === 'released')).length, 0),
});

export const PROBES: Probe[] = [
  {
    id: 'license-recording', features: ['action:music-catalog.licenseRecording'], decision: "Use a real recording from the music catalog in the last scene, licensed for the film's release",
    reads: ['src/engine/music-catalog.ts#licenseRecording', 'src/engine/music.ts#holderFee'],
    base: { decide: fund }, variant: { decide: (s, p) => { fund(s, p); useRecording(s, p); }, daily: licensing }, measure,
    bites: ['catalogSongs', 'licensed'], downstream: ['spent', 'money'],
  },
  {
    id: 'consider-composer', features: ['action:music-catalog.considerComposer'], decision: 'Hire the composer with the most recorded film scores who can be approached',
    reads: ['src/engine/music-catalog.ts#considerComposer', 'src/engine/guests.ts#considerPerson', 'src/engine/finish.ts#assessQuality'],
    base: { decide: fund }, variant: { decide: hireComposer }, measure,
    bites: ['realComposers'], downstream: ['spent', 'quality.music', 'money'],
  },
];
