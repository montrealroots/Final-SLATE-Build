// Runs the probes (npm run proof): PROBES=id,id picks some, SEEDS=n sets the seeds. Each result is written to
// docs/v10/proof/ for tests/v10-features.test.ts; a probe that doesn't prove its feature fails here too.
import { describe, expect, it } from 'vitest';
import { runProbe, writeResult } from './probe';
import { PROBES as CORE } from './probes/career-core';
import { PROBES as PRODUCTION } from './probes/production';
import { PROBES as RELEASE } from './probes/release';
import { PROBES as AWARDS } from './probes/awards';
import { PROBES as BANK } from './probes/bank';
import { PROBES as PAPERS } from './probes/papers';
import { PROBES as SCRIPT } from './probes/script';
import { PROBES as PROJECT } from './probes/project';
import { PROBES as CAREER_WIDE } from './probes/career-wide';
import { PROBES as WEATHER } from './probes/weather';
import { PROBES as EQUIPMENT } from './probes/equipment';
import { PROBES as WRITING } from './probes/writing';
import { PROBES as HIRING } from './probes/hiring';
import { PROBES as DAYS } from './probes/day';
import { PROBES as MUSIC } from './probes/music';
import { PROBES as VERSIONS } from './probes/versions';
import { PROBES as SCORE } from './probes/score';
import { PROBES as EDIT } from './probes/edit';
import { PROBES as NOTES } from './probes/notes';
import { PROBES as SLATE } from './probes/slate';
import { PROBES as BANK_MORE } from './probes/bank-more';
import { PROBES as AGENTS_PROBES } from './probes/agent';
import { PROBES as FESTIVAL } from './probes/festival';
import { PROBES as OPPS } from './probes/opportunities';
import { PROBES as BACKERS_PROBES } from './probes/backers';
import { PROBES as PLACES } from './probes/places';
import { PROBES as PLAN } from './probes/plan';
import { PROBES as LATE } from './probes/late';
import { PROBES as CASTING } from './probes/casting';
import { PROBES as DESIGNS } from './probes/designs';
import { PROBES as PEOPLE } from './probes/people';
import { PROBES as BANK_CARDS } from './probes/bank-cards';
import { PROBES as BANK_MOVES } from './probes/bank-moves';
import { PROBES as BANK_REST } from './probes/bank-rest';
import { PROBES as SERIES_PROBES } from './probes/series';
import { PROBES as REVISIONS } from './probes/revisions';
import { PROBES as HELPERS_PEOPLE } from './probes/helpers-people';
import { PROBES as MOCAP } from './probes/mocap';
import { PROBES as SONGS } from './probes/songs';
import { PROBES as DOCUMENTARY } from './probes/documentary';
import { PROBES as CASTING_DIRECTOR } from './probes/casting-director';
import { PROBES as STAGES } from './probes/stages';
import { PROBES as SCREEN_TIME } from './probes/screen-time';
import { PROBES as VERSION_SONGS } from './probes/version-songs';
import { PROBES as MUSIC_CATALOG } from './probes/music-catalog';
import { PROBES as CONTINUATION } from './probes/continuation';
import { PROBES as STUDIO_PROBES } from './probes/studios';
import { PROBES as BLUEPRINT_LOCK } from './probes/blueprint-lock';
import { PROBES as SOURCE } from './probes/source';
import { PROBES as SCRIPT_FIELDS } from './probes/script-fields';
import { PROBES as PLAN_FIELDS } from './probes/plan-fields';
import { PROBES as STORY_FIELDS } from './probes/story-fields';
import { PROBES as MORE_FIELDS } from './probes/more-fields';
import { PROBES as PROJECT_FIELDS } from './probes/project-fields';
import { PROBES as RELEASE_FIELDS } from './probes/release-fields';
import { PROBES as MUSIC_FIELDS } from './probes/music-fields';
import { PROBES as SCENE_FIELDS } from './probes/scene-fields';
import { PROBES as CREATION_FIELDS } from './probes/creation-fields';
import { PROBES as PLAN_MORE } from './probes/plan-more';
import { PROBES as SONG_FIELDS } from './probes/song-fields';
import { PROBES as FILM_ROLES } from './probes/film-roles';
import { PROBES as IDEA_TARGETS } from './probes/idea-targets';
import { PROBES as SCRIPT_CHECKS } from './probes/script-checks';

const ALL = [...CORE, ...PRODUCTION, ...RELEASE, ...AWARDS, ...BANK, ...PAPERS, ...SCRIPT, ...PROJECT, ...CAREER_WIDE, ...WEATHER, ...EQUIPMENT, ...WRITING, ...HIRING, ...DAYS, ...MUSIC, ...VERSIONS, ...SCORE, ...EDIT, ...NOTES, ...SLATE, ...BANK_MORE, ...AGENTS_PROBES, ...FESTIVAL, ...OPPS, ...BACKERS_PROBES, ...PLACES, ...PLAN, ...LATE, ...CASTING, ...DESIGNS, ...PEOPLE, ...BANK_CARDS, ...BANK_MOVES, ...BANK_REST, ...SERIES_PROBES, ...REVISIONS, ...HELPERS_PEOPLE, ...MOCAP, ...SONGS, ...DOCUMENTARY, ...CASTING_DIRECTOR, ...STAGES, ...SCREEN_TIME, ...VERSION_SONGS, ...MUSIC_CATALOG, ...CONTINUATION, ...STUDIO_PROBES, ...BLUEPRINT_LOCK, ...SOURCE, ...SCRIPT_FIELDS, ...PLAN_FIELDS, ...STORY_FIELDS, ...MORE_FIELDS, ...PROJECT_FIELDS, ...RELEASE_FIELDS, ...MUSIC_FIELDS, ...SCENE_FIELDS, ...CREATION_FIELDS, ...PLAN_MORE, ...SONG_FIELDS, ...FILM_ROLES, ...IDEA_TARGETS, ...SCRIPT_CHECKS];
import { FIELD_PROOFS } from './field-proofs';

const pick = process.env.PROBES?.split(',');
const seeds = process.env.SEEDS ? Number(process.env.SEEDS) : undefined;

describe('feature proofs', () => {
  for (const p of ALL.filter((x) => !pick || pick.includes(x.id))) {
    it(`${p.id}: ${p.decision}`, () => {
      const r = runProbe({ ...p, features: [...p.features, ...(FIELD_PROOFS[p.id] ?? [])] }, p.seeds ?? seeds);
      writeResult(r);
      const why = JSON.stringify({ bites: r.bites, downstream: r.downstream, diff: Object.fromEntries([...p.bites, ...p.downstream].map((m) => [m, r.diff[m]])) });
      expect(r.verdict, why).toBe('proven');
    });
  }
});
