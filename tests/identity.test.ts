// Identity from 1221 (November 8, 2026): a legal name in parts and a preferred name, citizenship from the place of birth,
// and what citizenship decides (src/engine/identity.ts, finance.ts fundClosedTo).
import { describe, expect, it } from 'vitest';
import {
  addressedAs, backerOptions, citizenshipFor, countryInSentence, homeCountries, isPortrait, knownAs, legalName, newGame, splitName,
} from './engine-api';
import { migrate } from '../src/engine/save';
import { registerPlace, getPlace } from '../src/data/places';
import { BROAD_ETHNICITIES, ETHNICITIES, HERITAGES, NATIONAL_LABEL, NATIONALITY_ONLY, searchEthnicities } from '../src/data/identity';
import { heritageLanguages } from '../src/data/heritage-languages';
import { NATIONALITIES, addCharacter, backgroundLabels, createProject, sharedHeritages, suggestedObservances, updateCharacter } from './engine-api';
import { SAVE_VERSION } from '../src/engine/types';
import { draft } from './fixtures';
import { approve, buildProject, startLife } from './helpers';

describe('names', () => {
  it('credits carry the legal name; people call you by your preferred name, or your first and last', () => {
    const s = newGame(draft({ middleName: 'Ifeoma', preferredName: 'Dee' }), 0, 'save-names');
    expect(s.character.name).toBe('Ada Ifeoma Okafor-Lindqvist');
    expect(knownAs(s.character)).toBe('Dee');
    expect(addressedAs(s.character)).toBe('Dee');
    const plain = newGame(draft(), 0, 'save-plain');
    expect(knownAs(plain.character)).toBe('Ada Okafor-Lindqvist');
    expect(addressedAs(plain.character)).toBe('Ada');
  });

  it('a one-field name splits into first and last, and the world it makes is the same', () => {
    expect(splitName('  Nia   Halvorsen-Mbeki ')).toEqual({ firstName: 'Nia', lastName: 'Halvorsen-Mbeki' });
    const parts = newGame(draft(), 0, 'save-seed');
    const { firstName, lastName, ...rest } = draft();
    const oneField = newGame({ ...rest, firstName: '', lastName: '', name: `${firstName} ${lastName}` }, 0, 'save-seed');
    expect(oneField.seed).toBe(parts.seed);
    expect(oneField.character.name).toBe(legalName(parts.character));
  });

  it('a first and a last name are asked for, as in 1221', async () => {
    const { validateDraft } = await import('./engine-api');
    const fields = (d: ReturnType<typeof draft>) => validateDraft(d).map((p) => p.field);
    expect(fields(draft({ firstName: '' }))).toContain('firstName');
    expect(fields(draft({ lastName: ' ' }))).toContain('lastName');
    expect(fields(draft({ preferredName: 'x'.repeat(41) }))).toContain('preferredName');
  });
});

describe('citizenship', () => {
  it('is the country of the place of birth; a territory gives its sovereign state’s', () => {
    expect(citizenshipFor('ng-lagos')).toBe('NG');
    registerPlace({ ...getPlace('gb-london'), id: 'test-san-juan', name: 'San Juan', country: 'PR', countryName: 'Puerto Rico' });
    expect(citizenshipFor('test-san-juan')).toBe('US');
    expect(countryInSentence('GB')).toBe('the United Kingdom');
    expect(countryInSentence('NG')).toBe('Nigeria');
  });

  it('with where you live, makes your home countries', () => {
    const s = startLife('home'); // born in Tokyo, living in London
    expect(homeCountries(s).map((h) => [h.code, h.citizen, h.resident])).toEqual([['JP', true, false], ['GB', false, true]]);
  });

  it("a country's public fund supports its citizens and residents: the grant follows where the project is based", () => {
    const grant = (base: string) => {
      const s = startLife(`fund-${base}`); // a citizen of Japan who lives in the United Kingdom
      const p = buildProject(s, { title: 'Fund', format: 'short', medium: 'live-action', runtime: 6, scenario: 'micro' }, [{ name: 'Lead' }], [{ place: 'Flat', chars: ['Lead'] }]);
      p.axes.basePlaceId = base;
      p.finance!.deals = []; // nothing promised yet, so the fund is there to ask
      approve(s, p);
      return backerOptions(s, p).find((o) => o.kind === 'grant')!;
    };
    expect(grant('gb-london')).toMatchObject({ ready: true, needs: '' }); // where you live
    expect(grant('jp-tokyo')).toMatchObject({ ready: true, needs: '' }); // where you're a citizen
    const abroad = grant('fr-paris');
    expect(abroad.ready).toBe(false);
    expect(abroad.needs).toBe("This project is based in France, and its public fund supports its citizens and the people who live there. You're a citizen of Japan and live in the United Kingdom.");
  });
});

describe('saves from before', () => {
  it('a version 5 save gets its name in parts and where you live, and still reads as valid', () => {
    const s = startLife('migrate');
    const old = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
    const c = old.character as Record<string, unknown>;
    for (const k of ['firstName', 'middleName', 'lastName', 'preferredName', 'livesIn', 'portrait']) delete c[k];
    old.version = 5;
    const moved = migrate(JSON.parse(JSON.stringify(old)));
    expect(moved.version).toBe(SAVE_VERSION);
    expect([moved.character.firstName, moved.character.lastName, moved.character.name]).toEqual(['Rin', 'Sato-Moreau', 'Rin Sato-Moreau']);
    expect(moved.character.livesIn).toBe(s.locationId);
    // Mid-trip, home is where the trip began.
    const travelling = migrate({ ...JSON.parse(JSON.stringify(old)), travel: { from: 'jp-tokyo', to: 'gb-london', arriveAt: 1 } });
    expect(travelling.character.livesIn).toBe('jp-tokyo');
  });

  it('a headshot is kept only as a JPEG small enough for a save', () => {
    expect(isPortrait('data:image/jpeg;base64,/9j/4AAQSkZJRg==')).toBe(true);
    expect(isPortrait('data:image/png;base64,iVBORw0KGgo=')).toBe(false);
    expect(isPortrait(`data:image/jpeg;base64,${'A'.repeat(400_000)}`)).toBe(false);
    expect(isPortrait('data:image/jpeg;base64,<script>')).toBe(false);
  });
});

describe('ethnicity and nationality, asked apart (November 8, 2026)', () => {
  it('Ethnicity offers peoples and the broad groups, never a word that is only a nationality', () => {
    for (const h of NATIONALITY_ONLY) expect(ETHNICITIES, h).not.toContain(h);
    expect(ETHNICITIES.slice(0, BROAD_ETHNICITIES.length)).toEqual(BROAD_ETHNICITIES);
    for (const h of ['Yoruba', 'Ashkenazi Jewish', 'Han Chinese', 'Korean', 'Irish', 'Beta Israel', 'Māori']) expect(ETHNICITIES).toContain(h);
    expect(searchEthnicities('Nigerian')).toEqual([]);
    expect(searchEthnicities('Black')).toEqual(['Black Or African']);
  });

  it('every nationality word has a country, so nothing a background brought is lost', () => {
    const codes = new Set(NATIONALITIES.map((n) => n.code));
    const words = new Set(Object.values(NATIONAL_LABEL));
    for (const h of NATIONALITY_ONLY) expect(words.has(h), h).toBe(true);
    for (const [code, label] of Object.entries(NATIONAL_LABEL)) {
      expect(codes.has(code), code).toBe(true);
      expect(HERITAGES, label).toContain(label);
    }
    // No one's nationality: uninhabited places and countries that no longer exist.
    for (const gone of ['AQ', 'BV', 'AN', 'CS']) expect(codes.has(gone), gone).toBe(false);
  });

  it('a nationality suggests what its word did: holidays, languages and a shared background in casting', () => {
    const korean = backgroundLabels([], ['KR']);
    expect(korean).toEqual(['Korean']);
    expect(suggestedObservances(korean).map((o) => o.id)).toEqual(['seollal', 'chuseok']);
    expect(heritageLanguages(backgroundLabels([], ['KR']))).toEqual(['ko']);
    // A country with no word of its own suggests nothing, and still counts as a nationality.
    expect(backgroundLabels([{ id: 'Yoruba', label: 'Yoruba', custom: false }], ['BF'])).toEqual(['Yoruba']);
    // Casting: a part written as Nigerian is shared with a player whose nationality is Nigeria.
    const s = startLife('nation-share', 'gb-london', { heritages: [{ id: 'Yoruba', label: 'Yoruba', custom: false }], nationalities: ['NG'] });
    const p = createProject(s, { title: 'Harbour', scenarioId: 'micro', axes: { format: 'short', medium: 'live-action', targetRuntimeMin: 10 } });
    const ch = addCharacter(s, p, 'Ines');
    updateCharacter(p, ch.id, { heritages: ['Nigerian', 'Igbo'] });
    expect(sharedHeritages(s, p, ch.id, 'player')).toEqual(['Nigerian']);
  });

  it('a version 6 save: nationality words become countries; with none, the nationality is the citizenship', () => {
    const s = startLife('migrate-nation');
    const old = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
    const c = old.character as Record<string, unknown>;
    delete c.nationalities;
    c.heritages = [{ id: 'Mexican', label: 'Mexican', custom: false }, { id: 'Igbo', label: 'Igbo', custom: false }, { id: 'x', label: 'Mexican', custom: true }];
    old.version = 6;
    const moved = migrate(JSON.parse(JSON.stringify(old)));
    expect(moved.character.nationalities).toEqual(['MX']);
    // A word written in your own words is kept as you wrote it.
    expect(moved.character.heritages.map((h) => h.label)).toEqual(['Igbo', 'Mexican']);
    c.heritages = [{ id: 'Japanese', label: 'Japanese', custom: false }];
    expect(migrate(JSON.parse(JSON.stringify(old))).character.nationalities).toEqual(['JP']); // born in Tokyo
  });
});
