/**
 * SLATE — one of your papers.
 *
 * The Papers screen lists every passport, visa, travel authorization,
 * license, permit and ID card a life has held, and until 2026-10-02 each was a
 * row of dead text. A document is a thing: a country or an authority issued
 * it, it carries a number, and it was issued on a day and runs out on another.
 * Until 2026-10-09 it let you do something — cross a border, drive, work — or
 * it didn’t any more; crossing a border, driving, and applying for a visa or a
 * travel authorization went in that day’s scope reset. So it opens, and what it
 * says is read from `systems/documents.ts` at the moment you look: whether it
 * is in force, how many of the countries SLATE has entry rules for would let
 * you in on it today, and whether it would let you drive where you stand, each
 * a reading. Until 2026-10-12 a passport’s page still called it the one you
 * travel on, and a visa’s said it let you into its country; from 2026-10-12 the
 * passport is the one in force in your name, which a new bank and the Social
 * Security office ask for, and a visa would let you in.
 *
 * Its ways lead to the country that issued it, the country it is for, the
 * passport a visa is issued on (and back), and the days it was issued and runs
 * out.
 */

import { dateKey, formatDate } from '../../../../engine/bankworld/core/time';
import { CITIES, COUNTRIES, REGIONS } from '../../../../engine/bankworld/content/geography';
import { ENTRY } from '../../../../engine/bankworld/content/entry';
import { LICENSES } from '../../../../engine/bankworld/content/licenses';
import {
  documentsOf, inForce, mayDrive, mayEnter, passportOf, theCountry, type PersonDocument,
} from '../../../../engine/bankworld/systems/documents';
import { VISITS, visitWords } from '../../../../engine/bankworld/systems/papervisits';
import type { Person } from '../../../../engine/bankworld/domain/model';
import type { Simulation } from '../../../../engine/bankworld/index';
import { Stat } from '../components/primitives';
import { defineLook, lookExists, type Way } from './registry';
import { nameable } from './words';
import { at } from './subject';

/** What each sort of document is, in the world’s words. */
const KIND_WORD: Record<PersonDocument['kind'], string> = {
  passport: 'Travel Document',
  authorization: 'Permission To Travel',
  visa: 'Permission To Enter',
  license: 'Permission To Drive',
  idp: 'License Translation',
  permit: 'Permission To Work',
  idcard: 'Proof Of Identity',
};

/** What to call it where its own name won’t do as a name. */
const PLAIN_NAME: Record<PersonDocument['kind'], string> = {
  passport: 'Passport', authorization: 'Travel Authorization', visa: 'Visa', license: 'Driving License', idp: 'International Driving Permit', permit: 'Work Permit', idcard: 'ID Card',
};

/** The country an ISO code names, where the world has it. Britain is "uk" in the atlas and "GB" on a passport. */
const countryOfIso = (iso: string) => COUNTRIES.all().find((c) => c.iso2?.toUpperCase() === iso.toUpperCase());

/** Who issued it, as a place in the world: a country, or for a license the state or country whose authority it is. */
function issuerCountry(doc: PersonDocument) {
  const iso = doc.kind === 'license' || doc.kind === 'idp' || doc.kind === 'idcard' ? doc.issuer.split('-')[0]! : doc.issuer;
  return countryOfIso(iso === 'uk' ? 'gb' : iso);
}

/** The region a license names, for a state or province that issues its own. */
function issuerRegion(doc: PersonDocument) {
  if (!doc.issuer.includes('-')) return undefined;
  return REGIONS.get(doc.issuer) ?? REGIONS.get(doc.issuer.toUpperCase());
}

/** Each word given its capital, as a label is written, without touching a word that opens on a marked letter. */
const capitalised = (text: string): string => text.split(' ').map((w) => w.replace(/^[a-z]/, (c) => c.toUpperCase())).join(' ');

/** Whether a string reads as a name: no identifier shapes, and a plain capital or digit first. */
const passesAsName = nameable;

/** A document’s name, in Title Case, as the world spells it. */
function nameOf(doc: PersonDocument): string {
  const own = capitalised(doc.name.trim());
  if (passesAsName(own)) return own;
  // A name in the issuer’s language that opens on a marked letter, with the English printed beside it in brackets: the English.
  const english = /\(([^)]+)\)\s*$/.exec(own)?.[1];
  if (english && passesAsName(capitalised(english))) return capitalised(english);
  return PLAIN_NAME[doc.kind];
}

/** The last digits of its number, as a clerk reads them back to you. */
const lastOf = (number: string): string => number.replace(/\W/g, '').slice(-4);

interface ThePaper { doc: PersonDocument; person: Person }

/**
 * Where it stands now, in a word a person uses. Approved and starting on a later day is its own (from 2026-10-21, brief
 * 20's papers area): an OPT decided before the program’s end runs from the end (`documents.permission`), and until then
 * this read it as valid, so its page said "It’s in force until …" over the out-of-force words of `whatItDoes`.
 */
function standingOf(doc: PersonDocument, now: number): 'pending' | 'approved' | 'valid' | 'lost' | 'cancelled' | 'expired' {
  if (doc.status === 'valid' && doc.expiresAt !== undefined && doc.expiresAt <= now) return 'expired';
  if (doc.status === 'valid' && doc.issuedAt !== undefined && doc.issuedAt > now) return 'approved';
  return doc.status;
}

/** What it lets you do, read from the rules today. */
function whatItDoes(sim: Simulation, { doc, person }: ThePaper): string {
  const now = sim.now;
  const live = inForce(doc, now);
  // A country as a sentence says it, the United Kingdom, as `mayEnter` says a citizenship (from 2026-10-12: until then
  // “It would let you into United Kingdom”, and a permit’s “It lets you work in United States”).
  const where = (iso?: string) => (iso ? theCountry(countryOfIso(iso)?.name ?? iso) : 'the country it names');
  switch (doc.kind) {
    case 'passport': {
      // Said, not played: nothing crosses a border since the scope reset of 2026-10-09. Until 2026-10-12 this called
      // it "the passport you travel on", and said one out of force "takes you across no border now".
      if (!live) return 'It’s no longer in force, so a bank or an office won’t accept it.';
      const carried = passportOf(person, now)?.id === doc.id;
      const rules = Object.keys(ENTRY);
      const open = carried ? rules.filter((iso) => mayEnter(person, iso, now).ok).length : 0;
      return carried
        ? `It’s the passport in force in your name. Of the ${rules.length} countries the game has entry rules for, ${open} would let you in on it today for a week’s visit. Travel isn’t part of the game, so this is for reference.`
        : 'It’s in force, but another passport is the one in force in your name.';
    }
    case 'visa':
    case 'authorization': {
      if (!live) return `${where(doc.destination).replace(/^./, (c) => c.toUpperCase())} won’t let you in on it now.`;
      const answer = doc.destination ? mayEnter(person, doc.destination, now) : undefined;
      // A reading, as the passport’s is: until 2026-10-12 it said "It lets you into" the country, and "the visit".
      return answer?.ok
        ? `It would let you into ${where(doc.destination)}, and nothing else is missing for a week’s visit there. ${answer.stay ?? ''}`.trim()
        : `It’s in force for ${where(doc.destination)}, but a week’s visit there would still need more: ${answer?.missing[0] ?? 'the rule wasn’t found'}`;
    }
    case 'license': {
      if (!live) return 'It doesn’t let you drive anywhere now that it’s out of force.';
      const here = CITIES.get(person.currentLocationId)?.name ?? 'where you are';
      const may = mayDrive(person, person.currentLocationId, now, now, doc.vehicleClass ?? 'car');
      // Said, not played: nothing is driven since the car went in the scope reset of 2026-10-09.
      return `${may.ok ? `In ${here}, it would let you drive.` : `In ${here}, it wouldn’t let you drive. ${may.why ?? ''}`.trim()} Driving isn’t part of the game, so this is for reference.`;
    }
    case 'idp':
      return live ? 'It goes with your license abroad, where a country asks for a translation of it.' : 'Now that it’s out of force, it no longer counts with your license.';
    case 'permit':
      return live ? `It lets you work in ${where(doc.destination ?? doc.issuer)}${doc.bookingId ? ', for the one job it was issued for' : ''}.` : 'It no longer lets you work anywhere: it’s out of force.';
    case 'idcard':
      return live
        ? 'It proves who you are, anywhere a card is asked for.'
        : 'It no longer proves who you are, because it’s out of force.';
  }
}

defineLook<ThePaper>('document', {
  gone: 'You don’t hold that document any more, so there’s nothing to show.',
  resolve: (sim, id) => {
    const person = sim.universe.people[sim.universe.playerId];
    if (!person) return undefined;
    const doc = documentsOf(person).find((d) => d.id === id);
    return doc ? { doc, person } : undefined;
  },
  seeds: (sim) => {
    const person = sim.universe.people[sim.universe.playerId];
    return person ? documentsOf(person).map((d) => d.id) : [];
  },
  look: (paper, { sim }) => {
    const { doc, person } = paper;
    const zone = sim.zone;
    const state = standingOf(doc, sim.now);
    const country = issuerCountry(doc);
    const region = issuerRegion(doc);
    // A country opens the sentence as one says it, the United Kingdom (from 2026-10-12: until then “United Kingdom issued it”).
    const issuer = (doc.kind === 'license' && LICENSES[doc.issuer] ? LICENSES[doc.issuer]!.authority : region?.name ?? (country ? theCountry(country.name) : doc.issuer.toUpperCase())).replace(/^./, (c) => c.toUpperCase());
    const last = lastOf(doc.number);

    // The interview or biometrics it waits on, from 2026-10-06 (`systems/papervisits.ts`).
    const visit = doc.visit && doc.visit.keptAt === undefined ? `It’s waiting on your ${visitWords(doc.visit.rule)} in ${CITIES.get(doc.visit.cityId)?.name ?? 'town'} on ${formatDate(doc.visit.at, zone)}. Be there, or ${VISITS[doc.visit.rule].again && !doc.visit.missed ? 'it’s booked once more, and if you miss that too, the application' : 'the application'} ends. ` : '';
    // An ID card past every check is being made and mailed, not decided (from 2026-10-17, `idCardOnItsWay`): until then
    // a citizen’s said "it’s being decided" while the toast said it was on its way.
    // SLATE: ID cards (1221's systems/identity.ts) aren't ported, so none is ever on its way.
    const mailed = false;
    const summary = state === 'pending'
      ? mailed ? `You’ve applied and paid, and the card is on its way. It should arrive by ${formatDate(doc.readyAt!, zone)}.` : `${visit}You’ve applied, and it’s being decided. It should be ready ${doc.readyAt ? `by ${formatDate(doc.readyAt, zone)}` : 'soon'}.`
      : state === 'approved' ? `It’s approved, and it starts on ${formatDate(doc.issuedAt!, zone)}.${doc.expiresAt ? ` It runs to ${formatDate(doc.expiresAt, zone)}, and its number ends ${last}.` : ` Its number ends ${last}.`}`
      : state === 'lost' ? `You reported it ${doc.stolen ? 'stolen' : 'lost'}, so the number ending ${last} is canceled.`
        : state === 'cancelled' ? `It’s canceled, so the number ending ${last} is no use to you now.`
          : state === 'expired' ? `It ran out on ${formatDate(doc.expiresAt!, zone)} and no longer counts for anything.`
            : doc.expiresAt ? `It’s in force until ${formatDate(doc.expiresAt, zone)}, and its number ends ${last}.` : `It’s in force with no end date, and its number ends ${last}.`;

    const ways: Way[] = [];
    if (country && lookExists(sim, at('country', country.id))) {
      ways.push({ to: at('country', country.id), label: country.name, detail: doc.kind === 'license' ? 'The country whose roads it was issued for' : 'The country that issued it, and whose citizen it says you are' });
    }
    if (region && lookExists(sim, at('region', region.id))) {
      ways.push({ to: at('region', region.id), label: region.name, detail: 'The state or province whose authority issued it' });
    }
    const dest = doc.destination ? countryOfIso(doc.destination) : undefined;
    if (dest && dest.id !== country?.id && lookExists(sim, at('country', dest.id))) {
      ways.push({ to: at('country', dest.id), label: dest.name, detail: 'The country it would let you into, and what that country is like' });
    }
    const on = doc.passportId ? documentsOf(person).find((d) => d.id === doc.passportId) : undefined;
    if (on) ways.push({ to: at('document', on.id), label: nameOf(on), detail: `The passport it was issued on, ending ${lastOf(on.number)}` });
    for (const child of documentsOf(person).filter((d) => d.passportId === doc.id)) {
      ways.push({ to: at('document', child.id), label: nameOf(child), detail: `Issued on this passport${child.destination ? `, for ${theCountry(countryOfIso(child.destination)?.name ?? child.destination)}` : ''}` });
    }
    if (doc.issuedAt !== undefined) {
      ways.push({ to: at('day', dateKey(doc.issuedAt, sim.homeZone)), label: `Issued ${formatDate(doc.issuedAt, zone)}`, detail: 'Its first day, and what else happened then' });
    }
    if (doc.expiresAt !== undefined) {
      ways.push({ to: at('day', dateKey(doc.expiresAt, sim.homeZone)), label: `${doc.expiresAt > sim.now ? 'Runs Out' : 'Ran Out'} ${formatDate(doc.expiresAt, zone)}`, detail: 'The day it stops counting, and what else is on that day' });
    }
    ways.push({ to: at('person', person.id), label: 'You', detail: 'Who it names, and the rest of your life' });

    return {
      name: nameOf(doc),
      kind: KIND_WORD[doc.kind],
      parent: at('person', person.id),
      summary,
      body: (
        <>
          <p className="small">
            {state === 'approved' ? `${issuer} approved it.` : `${issuer} issued it${doc.issuedAt ? ` on ${formatDate(doc.issuedAt, zone)}` : ''}.`}{' '}
            {state === 'valid' ? whatItDoes(sim, paper) : state === 'pending' ? 'You don’t hold it yet, so it doesn’t let you do anything until it arrives.' : state === 'approved' ? (doc.kind === 'permit' ? 'It doesn’t let you work until then.' : (doc.kind === 'visa' || doc.kind === 'authorization') && doc.destination ? `It doesn’t let you into ${theCountry(countryOfIso(doc.destination)?.name ?? doc.destination)} until then.` : 'It doesn’t let you do anything until then.') : ''}
            {/* A US state card issued non-verified says so, as the card itself does (from 2026-10-16: a non-citizen’s
                Connecticut card was marked REAL ID until then, `documents.apply_idcard`). */}
            {doc.realId ? ' It meets REAL ID.' : doc.kind === 'idcard' && doc.issuer.startsWith('us-') && doc.realId === false ? ' It’s marked Not For Federal Identification: it isn’t REAL ID.' : ''}
          </p>
          <div className="grid grid-3">
            <Stat label="Number Ends" value={<span className="mono">{last}</span>} note="The last digits of its number" />
            {/* Not yet while pending (from 2026-10-17), as the row: a replacement carries the lost card’s date until it comes. */}
            <Stat label="Issued" value={doc.issuedAt && state !== 'pending' && state !== 'approved' ? formatDate(doc.issuedAt, zone) : 'Not Yet'} note={doc.appliedAt ? `Applied for ${formatDate(doc.appliedAt, zone)}` : 'Issued directly, with no application on record'} />
            <Stat
              label={state === 'expired' ? 'Ran Out' : 'Runs Out'}
              value={doc.expiresAt ? formatDate(doc.expiresAt, zone) : 'No End Date'}
              tone={state === 'valid' ? undefined : 'warning'}
              note={state === 'valid' ? 'In force until then' : state === 'approved' ? `In force from ${formatDate(doc.issuedAt!, zone)}` : state === 'pending' ? (mailed ? 'On its way' : 'Being decided') : 'No longer in force'}
            />
          </div>
        </>
      ),
      ways,
      provenance: 'What it lets you do comes from each country’s entry and driving rules, as the game has them today.',
    };
  },
});
