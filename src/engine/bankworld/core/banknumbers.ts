/**
 * SLATE — account numbers, the way each country writes them.
 *
 * A bank account is known by a number whose shape is the country's: an IBAN
 * across Europe and Iceland, a routing number and an account number in the
 * United States, a CLABE in Mexico, a BSB in Australia. The check digits are
 * the real ones, worked out by the real rules, so an IBAN here passes the
 * mod-97 check a bank's own form runs:
 *
 * - IBAN: ISO 13616, the two check digits making the whole number 1 mod 97.
 * - Spain: the two control digits of the old CCC, weights 1, 2, 4, 8, 5, 10,
 *   9, 7, 3, 6 mod 11.
 * - France: the RIB key, 97 less (89 × bank + 15 × branch + 3 × account)
 *   mod 97, with letters read as digits the way the RIB reads them.
 * - Mexico: the CLABE's last digit, weights 3, 7, 1 mod 10.
 * - Iceland: the kennitala's ninth digit, weights 3, 2, 7, 6, 5, 4, 3, 2
 *   mod 11, which is also the last ten digits of an Icelandic IBAN.
 *
 * Where a country checks the account part by a rule each bank keeps to
 * itself (a German account number, a British one), the digits are drawn
 * plain and the IBAN around them still checks.
 *
 * The digits themselves are drawn from the save's own stream by the caller
 * (`systems/banking.ts`), so the functions here are pure.
 */

/** A source of digits: each call gives one digit, 0 to 9. */
export type Digits = () => number;

export function digits(next: Digits, count: number): string {
  let out = '';
  for (let i = 0; i < count; i += 1) out += String(next());
  return out;
}

/** A number as a string of digits, read mod 97, any length. */
function mod97(numeric: string): number {
  let rest = 0;
  for (const ch of numeric) rest = (rest * 10 + Number(ch)) % 97;
  return rest;
}

/** Letters as the IBAN reads them: A is 10, Z is 35. */
function ibanDigits(text: string): string {
  return [...text.toUpperCase()].map((ch) => (/[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch)).join('');
}

/** An IBAN from its country and the national number inside it. */
export function iban(country: string, bban: string): string {
  const check = 98 - mod97(ibanDigits(`${bban}${country}00`));
  return `${country}${String(check).padStart(2, '0')}${bban}`;
}

/** Whether an IBAN's check digits hold. */
export function ibanValid(value: string): boolean {
  const plain = value.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(plain)) return false;
  return mod97(ibanDigits(plain.slice(4) + plain.slice(0, 4))) === 1;
}

/** An IBAN in groups of four, the way it is printed. */
export function groupIban(value: string): string {
  return value.replace(/(.{4})/g, '$1 ').trim();
}

/** Spain: the two control digits between the branch and the account. */
export function spanishControl(bank: string, branch: string, account: string): string {
  const weights = [1, 2, 4, 8, 5, 10, 9, 7, 3, 6];
  const one = (text: string) => {
    const sum = [...text].reduce((acc, ch, i) => acc + Number(ch) * weights[i]!, 0);
    const d = 11 - (sum % 11);
    return d === 11 ? 0 : d === 10 ? 1 : d;
  };
  return `${one(`00${bank}${branch}`)}${one(account)}`;
}

/** France: the RIB key after the account number. */
export function ribKey(bank: string, branch: string, account: string): string {
  // Letters in an account number read as digits, the RIB's own way.
  const table: Record<string, string> = {
    A: '1', B: '2', C: '3', D: '4', E: '5', F: '6', G: '7', H: '8', I: '9',
    J: '1', K: '2', L: '3', M: '4', N: '5', O: '6', P: '7', Q: '8', R: '9',
    S: '2', T: '3', U: '4', V: '5', W: '6', X: '7', Y: '8', Z: '9',
  };
  const plain = (text: string) => [...text.toUpperCase()].map((ch) => table[ch] ?? ch).join('');
  const b = Number(plain(bank)); const g = Number(plain(branch));
  const c = plain(account);
  // 3 × an eleven-digit account overflows nothing in a double, but it is
  // taken mod 97 first to keep it exact.
  const key = 97 - ((89 * b + 15 * g + 3 * mod97(c)) % 97);
  return String(key).padStart(2, '0');
}

/** Mexico: the CLABE's check digit, for its first seventeen. */
export function clabeCheck(first17: string): string {
  const weights = [3, 7, 1];
  const sum = [...first17].reduce((acc, ch, i) => acc + ((Number(ch) * weights[i % 3]!) % 10), 0);
  return String((10 - (sum % 10)) % 10);
}

/**
 * Iceland: a kennitala from a birth date and two drawn digits, with its real
 * check digit and the century digit (9 for the 1900s, 0 for the 2000s).
 * Returns undefined for the one draw in eleven whose check would be ten,
 * which the registry never issues; the caller draws again.
 */
export function kennitala(day: number, month: number, year: number, drawn: string): string | undefined {
  const base = `${String(day).padStart(2, '0')}${String(month).padStart(2, '0')}${String(year % 100).padStart(2, '0')}${drawn}`;
  const weights = [3, 2, 7, 6, 5, 4, 3, 2];
  const sum = [...base].reduce((acc, ch, i) => acc + Number(ch) * weights[i]!, 0);
  const rest = sum % 11;
  const check = rest === 0 ? 0 : 11 - rest;
  if (check === 10) return undefined;
  const century = Math.floor(year / 100) === 19 ? '9' : Math.floor(year / 100) === 20 ? '0' : '8';
  return `${base}${check}${century}`;
}

/** Whether a kennitala's check digit holds. */
export function kennitalaValid(value: string): boolean {
  if (!/^\d{10}$/.test(value)) return false;
  const weights = [3, 2, 7, 6, 5, 4, 3, 2];
  const sum = [...value.slice(0, 8)].reduce((acc, ch, i) => acc + Number(ch) * weights[i]!, 0);
  const rest = sum % 11;
  return Number(value[8]) === (rest === 0 ? 0 : 11 - rest);
}

/** Whether a US routing number's checksum holds: 3, 7, 1 weights, mod 10. */
export function abaValid(routing: string): boolean {
  if (!/^\d{9}$/.test(routing)) return false;
  const w = [3, 7, 1, 3, 7, 1, 3, 7, 1];
  return [...routing].reduce((acc, ch, i) => acc + Number(ch) * w[i]!, 0) % 10 === 0;
}

/**
 * A BBAN built to its country's structure in the IBAN Registry's notation
 * ("4!a10!n": four letters, then ten digits): the bank's own code at its
 * place, and every other position drawn as the kind of character the
 * registry says goes there. `letter` and `digit` draw one each.
 */
export function bbanFrom(
  structure: string,
  bank: { code: string; offset: number },
  draw: { digit: () => number; letter: () => string },
): string | undefined {
  const parts = [...structure.matchAll(/(\d+)!?([nac])/g)];
  if (parts.length === 0) return undefined;
  let out = '';
  for (const [, count, kind] of parts) {
    for (let i = 0; i < Number(count); i += 1) out += kind === 'a' ? draw.letter() : String(draw.digit());
  }
  if (bank.code && bank.offset + bank.code.length <= out.length) {
    out = out.slice(0, bank.offset) + bank.code.toUpperCase() + out.slice(bank.offset + bank.code.length);
  }
  return out;
}

/** Belgium's national check: the BBAN's last two digits are its first ten mod 97, and 97 for 0. */
export function belgianCheck(first10: string): string {
  const rest = Number(BigInt(first10) % 97n);
  return String(rest === 0 ? 97 : rest).padStart(2, '0');
}

/**
 * ISO 7064 MOD 97-10 as a national check inside a BBAN (Portugal's NIB,
 * Serbia, Montenegro, North Macedonia, Slovenia, Timor-Leste): the last two
 * digits are 98 less the rest, followed by 00, mod 97.
 */
export function mod9710(base: string): string {
  return String(98 - mod97(`${base}00`)).padStart(2, '0');
}

// ---------------------------------------------------------------------------
// The national checks inside a BBAN, country by country. Each is checked in
// `tests/banknumbers.test.ts` against the IBAN Registry's example for its
// country. `withNationalCheck` rewrites the check characters of a drawn BBAN, or says
// the draw can't carry a valid number (Norway's and the mod-11 countries'
// check can come out as 10, which is never issued), and the caller draws again.
// ---------------------------------------------------------------------------

const digitsOf = (text: string) => [...text].map(Number);
const weighted = (text: string, weights: readonly number[]) =>
  digitsOf(text).reduce((sum, d, i) => sum + d * weights[i % weights.length]!, 0);

/** Luhn, for Finland: weights 2, 1 from the left over the first 13 digits. */
export function luhnFi(first13: string): string {
  const sum = digitsOf(first13).reduce((acc, d, i) => {
    const p = d * (i % 2 === 0 ? 2 : 1);
    return acc + Math.floor(p / 10) + (p % 10);
  }, 0);
  return String((10 - (sum % 10)) % 10);
}

/** ISO 7064 MOD 11,10, for Croatia. */
export function mod1110(digits: string): string {
  let p = 10;
  for (const d of digitsOf(digits)) {
    let s = (p + d) % 10;
    if (s === 0) s = 10;
    p = (2 * s) % 11;
  }
  return String((11 - p) % 10);
}

/** A weighted mod-10 check digit: (10 − sum mod 10) mod 10. */
export function weightedMod10(digits: string, weights: readonly number[]): string {
  return String((10 - (weighted(digits, weights) % 10)) % 10);
}

/** Italy's and San Marino's CIN: the letter over the 22 characters after it. */
export function italianCin(rest: string): string {
  const ODD = [1, 0, 5, 7, 9, 13, 15, 17, 19, 21, 2, 4, 18, 20, 11, 3, 6, 8, 12, 14, 16, 10, 22, 25, 24, 23];
  const value = (ch: string) => (/\d/.test(ch) ? Number(ch) : ch.charCodeAt(0) - 65);
  const sum = [...rest.toUpperCase()].reduce((acc, ch, i) => acc + (i % 2 === 0 ? ODD[value(ch)]! : value(ch)), 0);
  return String.fromCharCode(65 + (sum % 26));
}

/** A mod-11 check digit that makes a weighted sum ≡ 0 (weight 1 last), or undefined where it would be 10. */
function mod11Zero(body: string, weights: readonly number[]): string | undefined {
  const d = (11 - (weighted(body, weights) % 11)) % 11;
  return d === 10 ? undefined : String(d);
}

/**
 * A check digit for a Swedish number: mod 11, weights 1, 2, 3... from the
 * right, the check digit weighing 1; undefined where it would be 10. The
 * weights start again at 1 from the eleventh digit, which no number built
 * here reaches: nine digits before the check at most.
 */
function swedishMod11(body: string): string | undefined {
  const sum = [...body].reverse().reduce((acc, d, i) => acc + Number(d) * (i + 2), 0);
  const d = (11 - (sum % 11)) % 11;
  return d === 10 ? undefined : String(d);
}

/** A Luhn check digit: from the right, the body's digits weigh 2, 1, 2..., a two-digit product less 9. */
function luhn(body: string): string {
  const sum = [...body].reverse().reduce((acc, d, i) => { const p = Number(d) * (i % 2 === 0 ? 2 : 1); return acc + (p > 9 ? p - 9 : p); }, 0);
  return String((10 - (sum % 10)) % 10);
}

/**
 * A Swedish BBAN, bank by bank, as Bankgirot's Bankernas kontonummer
 * (2024-02-22) and Bankinfrastruktur's IBAN rules (v1.5; table of
 * 2026-08-06) set it: SEB (500) and Nordea (300), a 4-digit clearing
 * number and a 7-digit account, mod 11 over the clearing's last three
 * digits and the account; Handelsbanken (600), a 9-digit account, mod 11
 * over it; Swedbank (800), a 5-digit clearing number 8xxx with its Luhn
 * digit and a 10-digit account with its own. Nordea's clearing avoids 3300
 * and 3782, its personal accounts, and 4000 to 4999, weighed another way.
 */
function swedishBban(bban: string): string | undefined {
  const bank = bban.slice(0, 3);
  const d = bban.slice(3);
  if (bank === '500' || bank === '300') {
    // The clearing number: 5xxx for SEB; Nordea's 3000 to 3299.
    // Seventeen digits: six zeros, the clearing number, the account and its check.
    const clearing = bank === '500' ? `5${d.slice(7, 10)}` : `3${String(Number(d[7]) % 3)}${d.slice(8, 10)}`;
    const account = d.slice(10, 16);
    const check = swedishMod11(clearing.slice(1) + account);
    return check === undefined ? undefined : `${bank}000000${clearing}${account}${check}`;
  }
  if (bank === '600') {
    // Eight zeros, then the account and its check.
    const account = d.slice(8, 16);
    const check = swedishMod11(account);
    return check === undefined ? undefined : `600${'0'.repeat(8)}${account}${check}`;
  }
  if (bank === '800') {
    // Two zeros, the clearing number with its digit, the account and its.
    const clearing = `8${d.slice(3, 6)}`;
    const account = d.slice(7, 16);
    return `80000${clearing}${luhn(clearing)}${account}${luhn(account)}`;
  }
  return bban;
}

/**
 * The BBAN with its national check characters worked out, for a country
 * SLATE has the rule for; the BBAN unchanged for one it doesn't; undefined
 * when the draw can't carry a valid number.
 */
export function withNationalCheck(country: string, bban: string): string | undefined {
  switch (country) {
    case 'BE': return bban.slice(0, 10) + belgianCheck(bban.slice(0, 10));
    // Burundi and Djibouti keep the French RIB key: SLATE's inference, as their registry examples check by it.
    case 'FR': case 'MC': case 'MR': case 'BI': case 'DJ': return bban.slice(0, 21) + ribKey(bban.slice(0, 5), bban.slice(5, 10), bban.slice(10, 21));
    // São Tomé keeps Portugal's NIB key: SLATE's inference, as the registry's current example checks by it.
    case 'ME': case 'RS': case 'MK': case 'SI': case 'PT': case 'TL': case 'BA': case 'XK': case 'ST':
      return bban.slice(0, -2) + mod9710(bban.slice(0, -2));
    case 'SE': return swedishBban(bban);
    case 'FI': return bban.slice(0, 13) + luhnFi(bban.slice(0, 13));
    case 'AL': return bban.slice(0, 7) + weightedMod10(bban.slice(0, 7), [9, 7, 3, 1]) + bban.slice(8);
    case 'PL': return bban.slice(0, 7) + weightedMod10(bban.slice(0, 7), [3, 9, 7, 1]) + bban.slice(8);
    case 'HR': return bban.slice(0, 6) + mod1110(bban.slice(0, 6)) + bban.slice(7, 16) + mod1110(bban.slice(7, 16));
    case 'EE': {
      // Weights 7, 3, 1 from the right over digits 3 to 15.
      const body = bban.slice(2, 15);
      const w = [...body].map((_, i) => [7, 3, 1][(body.length - 1 - i) % 3]!);
      const sum = digitsOf(body).reduce((acc, d, i) => acc + d * w[i]!, 0);
      return bban.slice(0, 15) + String((10 - (sum % 10)) % 10);
    }
    case 'HU':
      return bban.slice(0, 7) + weightedMod10(bban.slice(0, 7), [9, 7, 3, 1])
        + bban.slice(8, 23) + weightedMod10(bban.slice(8, 23), [9, 7, 3, 1]);
    case 'IT': case 'SM': return italianCin(bban.slice(1)) + bban.slice(1);
    case 'NO': {
      const d = mod11Zero(bban.slice(0, 10), [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]);
      return d === undefined ? undefined : bban.slice(0, 10) + d;
    }
    case 'CZ': case 'SK': {
      // The prefix is zeros, as most accounts' is; the account number carries the check.
      const account = bban.slice(10, 19);
      const d = mod11Zero(account, [6, 3, 7, 9, 10, 5, 8, 4, 2]);
      return d === undefined ? undefined : `${bban.slice(0, 4)}000000${account}${d}`;
    }
    default: return bban;
  }
}
