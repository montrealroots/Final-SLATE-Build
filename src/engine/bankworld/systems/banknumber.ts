/**
 * SLATE — the number an account is opened under.
 *
 * Drawn once, when the account opens, from the save's own stream, in the
 * shape the bank's country writes it (`content/banks.ts` says which) and
 * with the real check digits (`core/banknumbers.ts`). The bank's own code
 * is the real one where the table has it: a routing number, a sort code, a
 * Bankleitzahl, a BSB, a CLABE's bank code.
 */

import type { Simulation } from '../core/simulation';
import type { Person } from '../domain/model';
import { zonedParts } from '../core/time';
import { bbanFrom, withNationalCheck, clabeCheck, digits, groupIban, iban, kennitala, ribKey, spanishControl } from '../core/banknumbers';
import type { Bank } from '../content/banks';
import { CITIES } from '../content/geography';

/**
 * Australia: a BSB's state digit, by the gazetteer's state, which is
 * numbered the GeoNames way: 01 the ACT, 02 New South Wales, 03 the Northern
 * Territory, 04 Queensland, 05 South Australia, 06 Tasmania, 07 Victoria and
 * 08 Western Australia.
 */
const STATE_DIGIT: Readonly<Record<string, string>> = {
  'au-01': '2', 'au-02': '2', 'au-03': '5', 'au-04': '4', 'au-05': '5', 'au-06': '7', 'au-07': '3', 'au-08': '6',
};

export function accountNumber(sim: Simulation, person: Person, bank: Bank, kind: 'checking' | 'savings', renumbered = 0): string {
  // A renumbering draws again, not the number the account opened with at the same moment.
  const rng = sim.rng('bank.number', person.id, bank.id, kind, String(sim.now), ...(renumbered ? [String(renumbered)] : []));
  const d = () => Math.floor(rng.next() * 10);
  const n = (count: number) => digits(d, count);
  const code = bank.code;
  switch (bank.format) {
    case 'us':
      return `Routing ${code} · Account ${n(10)}`;
    case 'ca':
      return `Transit ${n(5)} · Institution ${code} · Account ${n(7)}`;
    case 'mx': {
      const first = `${code}${n(3)}${n(11)}`;
      return `CLABE ${first}${clabeCheck(first)}`;
    }
    case 'gb':
      return `Sort Code ${code}-${n(2)}-${n(2)} · Account ${n(8)}`;
    case 'au': {
      // The BSB's third digit is the state the branch is in.
      const state = STATE_DIGIT[CITIES.get(person.currentLocationId)?.parentId ?? ''] ?? '2';
      return `BSB ${code}${state}-${n(3)} · Account ${n(8)}`;
    }
    case 'nz':
      // The suffix says what the account is: 00 a checking account, 30 savings.
      return `${code}-${n(4)}-${n(7)}-${kind === 'savings' ? '30' : '00'}`;
    case 'jp':
      return `Bank ${code} · Branch ${n(3)} · Ordinary ${n(7)}`;
    case 'kr':
      // Each bank groups its digits its own way (KB 6-2-6, Shinhan 3-3-6).
      return `Account ${(bank.groups ?? [3, 6, 5]).map((g) => n(g)).join('-')}`;
    case 'is': {
      // An Icelandic IBAN ends in the holder's kennitala.
      const born = zonedParts(person.birthInstant, sim.homeZone);
      let kt: string | undefined;
      while (!kt) kt = kennitala(born.day, born.month, born.year, n(2));
      // 26 is the current account's ledger; a savings ledger is the bank's
      // own (05 at Landsbankinn, 13 at Arion), and where none was found, 26.
      const ledger = kind === 'savings' ? bank.savingsLedger ?? bank.currentLedger ?? '26' : bank.currentLedger ?? '26';
      // The bank's two digits, then the branch's.
      return `IBAN ${groupIban(iban('IS', `${code}${n(4 - code.length)}${ledger}${n(6)}${kt}`))}`;
    }
    case 'de':
      return `IBAN ${groupIban(iban('DE', `${code}${n(10)}`))}`;
    case 'fr': {
      const branch = n(5); const account = n(11);
      return `IBAN ${groupIban(iban('FR', `${code}${branch}${account}${ribKey(code, branch, account)}`))}`;
    }
    case 'es': {
      const branch = n(4); const account = n(10);
      return `IBAN ${groupIban(iban('ES', `${code}${branch}${spanishControl(code, branch, account)}${account}`))}`;
    }
    case 'ie':
      // The BIC's four letters and the sort code's first digits are the bank's.
      return `IBAN ${groupIban(iban('IE', `${code}${n(18 - code.length)}`))}`;
    case 'iban': {
      // Built to the registry's structure, with the bank's code in its place.
      if (bank.bban) {
        const letter = () => String.fromCharCode(65 + Math.floor(rng.next() * 26));
        const country = bank.ibanCountry ?? bank.iso;
        // The national check inside the BBAN, where SLATE has the country's
        // rule; a draw that can't carry a valid number is drawn again.
        for (let tries = 0; tries < 20; tries += 1) {
          const drawn = bbanFrom(bank.bban, { code: code, offset: bank.codeOffset ?? 0 }, { digit: d, letter });
          const bban = drawn && withNationalCheck(country, drawn);
          if (bban) return `IBAN ${groupIban(iban(country, bban))}`;
        }
      }
      // Otherwise its length from the registry, and the rest drawn.
      const length = (bank.ibanLength ?? 22) - 4 - code.length;
      return `IBAN ${groupIban(iban(bank.ibanCountry ?? bank.iso, `${code}${n(Math.max(4, length))}`))}`;
    }
    default:
      return `Account ${n(10)}`;
  }
}
