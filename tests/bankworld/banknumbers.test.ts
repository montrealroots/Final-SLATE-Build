/**
 * Account numbers hold to the real rules.
 *
 * Every example here is a published one: the IBAN registry's own examples
 * (ISO 13616, SWIFT's IBAN Registry), a French RIB and a Spanish CCC from the
 * same registry, Banxico's CLABE example and the routing number JPMorgan
 * Chase publishes for New York. If a rule in `core/banknumbers.ts` is wrong,
 * one of these fails.
 */

import { describe, expect, it } from 'vitest';
import {
  abaValid, bbanFrom, belgianCheck, clabeCheck, mod9710, withNationalCheck, groupIban, iban, ibanValid, kennitala, kennitalaValid, ribKey, spanishControl,
} from '../../src/engine/bankworld/core/banknumbers';

describe('the IBAN', () => {
  it('gives the registry’s own check digits', () => {
    expect(iban('DE', '370400440532013000')).toBe('DE89370400440532013000');
    expect(iban('GB', 'WEST12345698765432')).toBe('GB82WEST12345698765432');
    expect(iban('IE', 'AIBK93115212345678')).toBe('IE29AIBK93115212345678');
    expect(iban('ES', '21000418450200051332')).toBe('ES9121000418450200051332');
    expect(iban('FR', '20041010050500013M02606')).toBe('FR1420041010050500013M02606');
    expect(iban('IS', '0159260076545510730339')).toBe('IS140159260076545510730339');
  });

  it('checks one, and fails one with a digit changed', () => {
    expect(ibanValid('DE89 3704 0044 0532 0130 00')).toBe(true);
    expect(ibanValid('DE89370400440532013001')).toBe(false);
    expect(groupIban('DE89370400440532013000')).toBe('DE89 3704 0044 0532 0130 00');
  });
});

describe('the national check digits', () => {
  it('works out Spain’s control digits', () => {
    expect(spanishControl('2100', '0418', '0200051332')).toBe('45');
  });

  it('works out a French RIB key, letters and all', () => {
    expect(ribKey('20041', '01005', '0500013M026')).toBe('06');
  });

  it('works out a CLABE’s last digit', () => {
    expect(clabeCheck('03218000011835971')).toBe('9');
  });

  it('writes a kennitala whose check digit holds, and refuses the one that can’t', () => {
    const made = kennitala(14, 6, 2001, '23');
    if (made) {
      expect(kennitalaValid(made)).toBe(true);
      expect(made.startsWith('140601')).toBe(true);
      expect(made.endsWith('0')).toBe(true);
    }
    expect(kennitalaValid('5510730339')).toBe(true);
    expect(kennitalaValid('5510730349')).toBe(false);
    // Of the hundred possible drawn pairs, the ones whose check would be ten
    // are refused, and every other one checks.
    let refused = 0;
    for (let n = 0; n < 100; n += 1) {
      const k = kennitala(1, 1, 1990, String(n).padStart(2, '0'));
      if (k === undefined) refused += 1;
      else expect(kennitalaValid(k)).toBe(true);
    }
    expect(refused).toBeGreaterThan(0);
    expect(refused).toBeLessThan(20);
  });

  it('checks a US routing number', () => {
    expect(abaValid('021000021')).toBe(true);
    expect(abaValid('021000022')).toBe(false);
  });
});

describe('a BBAN built to its country’s structure', () => {
  const draws = () => { let i = 0; return { digit: () => (i++ * 7) % 10, letter: () => 'X' }; };

  it('puts the bank’s code where the registry says, and the kinds of character everywhere else', () => {
    const nl = bbanFrom('4!a10!n', { code: 'INGB', offset: 0 }, draws())!;
    expect(nl).toMatch(/^INGB\d{10}$/);
    expect(ibanValid(iban('NL', nl))).toBe(true);
    const it = bbanFrom('1!a5!n5!n12!c', { code: '03069', offset: 1 }, draws())!;
    expect(it).toMatch(/^X03069\d{17}$/);
  });

  it('works out Belgium’s own check, as the registry’s example has it', () => {
    // BE68 5390 0754 7034: 5390075470 mod 97 is 34.
    expect(belgianCheck('5390075470')).toBe('34');
    expect(iban('BE', '539007547034')).toBe('BE68539007547034');
  });
});

describe('the national checks inside a BBAN', () => {
  it('works out ISO 7064 MOD 97-10 as the registry’s examples have it', () => {
    // PT50 0002 0123 1234 5678 9015 4 and RS35 2600 0560 1001 6113 79.
    expect(mod9710('0002012312345678901')).toBe('54');
    expect(mod9710('2600056010016113')).toBe('79');
  });
});

describe('each national check against the IBAN Registry’s own example', () => {
  // Every example IBAN below is the registry's, and valid; withNationalCheck
  // must leave each unchanged, since its check characters are already right.
  const EXAMPLES: Record<string, string> = {
    FI: 'FI2112345600000785',
    AL: 'AL47212110090000000235698741',
    BA: 'BA391290079401028494',
    XK: 'XK051212012345678906',
    HR: 'HR1210010051863000160',
    CZ: 'CZ6508000000192000145399',
    SK: 'SK3112000000198742637541',
    EE: 'EE382200221020145685',
    HU: 'HU42117730161111101800000000',
    IT: 'IT60X0542811101000000123456',
    SM: 'SM86U0322509800000000270100',
    NO: 'NO9386011117947',
    PL: 'PL61109010140000071219812874',
    BE: 'BE68539007547034',
    PT: 'PT50000201231234567890154',
    RS: 'RS35260005601001611379',
    FR: 'FR1420041010050500013M02606',
    // Since 2026-09-27: Handelsbanken's official example (Bankinfrastruktur), and the registry's for
    // three countries whose keys SLATE infers from their neighbors' (RIB, NIB).
    SE: 'SE5860000000000517182351',
    BI: 'BI4210000100010000332045181',
    DJ: 'DJ2100010000000154000100186',
    ST: 'ST23000200000289355710148',
  };
  for (const [country, example] of Object.entries(EXAMPLES)) {
    it(`keeps ${country}’s example as it is`, () => {
      expect(ibanValid(example)).toBe(true);
      const bban = example.slice(4);
      if (country === 'CZ' || country === 'SK') {
        // A prefix of zeros is what SLATE draws; the example has one, so
        // only the account's check is compared.
        expect(withNationalCheck(country, bban)!.slice(-10)).toBe(bban.slice(-10));
      } else {
        expect(withNationalCheck(country, bban)).toBe(bban);
      }
    });
  }

  // Where each country's check characters sit in its BBAN.
  const CHECKS: Record<string, number[]> = {
    FI: [13], AL: [7], BA: [14, 15], XK: [14, 15], HR: [6, 16], EE: [15], HU: [7, 23], IT: [0], SM: [0],
    NO: [10], PL: [7], BE: [10, 11], PT: [19, 20], RS: [16, 17], FR: [21, 22], CZ: [19], SK: [19],
    SE: [19], BI: [21, 22], DJ: [21, 22], ST: [19, 20],
  };
  for (const [country, positions] of Object.entries(CHECKS)) {
    it(`puts back ${country}’s check characters when they’re wrong`, () => {
      const bban = EXAMPLES[country]!.slice(4);
      for (const at of positions) {
        const was = bban[at]!;
        const wrong = /\d/.test(was) ? String((Number(was) + 1) % 10) : String.fromCharCode(65 + ((was.charCodeAt(0) - 64) % 26));
        const damaged = bban.slice(0, at) + wrong + bban.slice(at + 1);
        expect(withNationalCheck(country, damaged)![at], `${country} at ${at}`).toBe(was);
      }
    });
  }

  it('builds each Swedish bank’s number its own way: Swedbank’s clearing digit and account digit by Luhn, SEB’s and Nordea’s by mod 11 over clearing and account', () => {
    // Swedbank's official example, and SEB's the registry's.
    const swedbank = 'SE5580000832790147258925'.slice(4);
    const seb = 'SE4550000000058398257466'.slice(4);
    for (const bban of [swedbank, seb]) expect(withNationalCheck('SE', bban)).toBe(bban);
    // Swedbank: the clearing number's fifth digit (at 9) and the account's last (at 19).
    for (const at of [9, 19]) {
      const damaged = swedbank.slice(0, at) + String((Number(swedbank[at]) + 1) % 10) + swedbank.slice(at + 1);
      expect(withNationalCheck('SE', damaged)).toBe(swedbank);
    }
    // Nordea's clearing stays within 3000 to 3299, clear of its personal accounts at 3300.
    for (let n = 0; n < 50; n += 1) {
      const out = withNationalCheck('SE', `300${String(n * 7919).padStart(17, '9')}`);
      if (out) expect(Number(out.slice(9, 13))).toBeLessThan(3300);
    }
    // Handelsbanken's accounts whose check would be ten aren't issued: the draw is turned down.
    const outcomes = new Set<string>();
    for (let n = 0; n < 200; n += 1) outcomes.add(withNationalCheck('SE', `600${String(n).padStart(17, '0')}`) === undefined ? 'refused' : 'ok');
    expect([...outcomes].sort()).toEqual(['ok', 'refused']);
    // Every Swedish IBAN SLATE draws is valid.
    for (let n = 0; n < 40; n += 1) {
      for (const bank of ['300', '500', '600', '800']) {
        const out = withNationalCheck('SE', `${bank}${String(n * 104729 + 12345).padStart(17, '0')}`);
        if (out) expect(ibanValid(iban('SE', out))).toBe(true);
      }
    }
  });

  it('turns down a draw whose check would be ten, where the country never issues one', () => {
    // Norway: 8601111796 weighs to a sum where the check comes out as 10.
    const results = new Set<string | undefined>();
    for (let n = 0; n < 200; n += 1) results.add(withNationalCheck('NO', String(8601111000 + n).padEnd(10, '0') + '0') === undefined ? 'refused' : 'ok');
    expect(results.has('refused')).toBe(true);
    expect(results.has('ok')).toBe(true);
  });
});
