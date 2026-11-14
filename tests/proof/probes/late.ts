// Late in a film's life (music.ts, finish.ts): a song licence that runs out before a release and is renewed, how long a
// licence is asked for, and a release abroad opened dubbed rather than subtitled.
import type { Probe } from '../probe';
import { track, useTrack } from './music';
import { agreeLicence, renewLicence, renewalFee, requestLicence } from '../../../src/engine/music';
import { putInOwnMoney } from '../../../src/engine/personal';
import { ledgerTotals } from '../../../src/engine/budget';
import { planRelease, setReleaseVersion, versionRefusal } from '../../../src/engine/finish';
import { addDaysToKey, dateKey } from '../../../src/engine/time';
import type { GameState, Project } from '../../../src/engine/types';

/** Each day: ask the track's holders once for digital sale in Britain for `years`, and agree their quote. */
const licensing = (years: number) => (s: GameState) => {
  for (const p of s.projects.filter((x) => !x.delivered && x.music)) {
    const song = track(p);
    if (!song) continue;
    const ls = p.music!.licences.filter((l) => l.songId === song.id);
    if (!ls.length) { requestLicence(s, p, song.id, { territories: ['GB'], media: ['digital'], years }); continue; }
    for (const l of ls.filter((x) => x.status === 'quoted' || x.status === 'countered')) agreeLicence(s, p, l.id);
  }
};
/** The film held back a year and more: each delivered film not yet released is put out on day 400 of the career. */
const releaseLate = (s: GameState, day: number) => {
  if (day !== 400) return;
  for (const p of s.projects.filter((x) => x.delivered && !x.releases.some((r) => r.status !== 'cancelled'))) {
    try { planRelease(s, p, { route: 'digital', date: addDaysToKey(dateKey(s.now, 'Europe/London'), 14), territories: ['GB'] }); } catch { /* refused: counted */ }
  }
};
/** Renew each of the track's licences that has run out, before the late release, putting the fee into the film first
 *  (the career takes each film's money home at the year's end). */
const renewExpired = (s: GameState) => {
  for (const p of s.projects) for (const l of (p.music?.licences ?? []).filter((x) => x.status === 'expired')) {
    const short = renewalFee(l) - Math.max(0, ledgerTotals(p).available);
    if (short > 0) putInOwnMoney(s, p, short);
    renewLicence(s, p, l.id);
  }
};
const late = (years: number, renew: boolean) => (s: GameState, day: number) => { licensing(years)(s); if (renew) renewExpired(s); releaseLate(s, day); };

/** Each day: open every planned distributor's release dubbed where the version can be chosen. */
const dubAll = (s: GameState) => {
  for (const p of s.projects) for (const r of p.releases.filter((x) => !versionRefusal(p, x) && x.version !== 'dubbed')) setReleaseVersion(s, p, r.id, 'dubbed');
};

const measure = (_s: GameState, projects: Project[]) => ({
  renewals: projects.reduce((a, p) => a + (p.music?.licences ?? []).reduce((b, l) => b + (l.renewals ?? []).length, 0), 0),
  licenceYears: projects.reduce((a, p) => a + (p.music?.licences ?? []).filter((l) => l.status === 'agreed' || l.status === 'expired').reduce((b, l) => b + l.scope.years, 0), 0),
  dubbed: projects.reduce((a, p) => a + p.releases.filter((r) => r.version === 'dubbed').length, 0),
});

export const PROBES: Probe[] = [
  {
    id: 'renew-licence',
    features: ['action:music.renewLicence', 'scheduled:licence-expiry'],
    decision: 'Renew the song\'s one-year licence once it runs out, before releasing the film a year after it was made',
    reads: ['src/engine/music.ts#renewLicence', 'src/engine/music.ts#releaseLicenceRefusal', 'src/engine/music.ts#handler:licence-expiry'],
    base: { release: false, decide: useTrack, daily: late(1, false) },
    variant: { release: false, decide: useTrack, daily: late(1, true) },
    measure,
    bites: ['renewals'],
    downstream: ['released', 'revenue', 'spent'],
  },
  {
    id: 'licence-years',
    features: ['field:MusicTab.tsx#"For How Long"#1'],
    decision: 'Ask for the song\'s licence for three years rather than one, then release the film a year after it was made',
    reads: ['src/engine/music.ts#requestLicence', 'src/engine/music.ts#releaseLicenceRefusal'],
    base: { release: false, decide: useTrack, daily: late(1, false) },
    variant: { release: false, decide: useTrack, daily: late(3, false) },
    measure,
    bites: ['licenceYears'],
    downstream: ['released', 'revenue', 'spent'],
  },
  {
    id: 'release-dubbed',
    features: ['action:finish.setReleaseVersion', 'field:FinishViews.tsx#{`Version In ${r.territories.map(countryName).join(\', \')}`}#1'],
    decision: 'Open each distributor\'s release dubbed where its territories speak another language',
    reads: ['src/engine/finish.ts#setReleaseVersion', 'src/engine/distribution.ts#territoriesReached'],
    seeds: 60,
    base: {},
    variant: { daily: dubAll },
    measure,
    bites: ['dubbed'],
    downstream: ['spent', 'gross', 'revenue'],
  },
];
