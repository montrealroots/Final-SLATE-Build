// The languages of every country and territory a nationality can be (November 8, 2026): official and national
// languages first, then the most widely spoken, at most a handful, from the game's language list. Written from general
// knowledge of each country's language laws and censuses; not checked against a source, so a country's order or a
// missing regional language is possible. A nationality suggests these on Background & Languages, and a performer
// based in a country the casting pool has no entry for speaks its first one (people.ts countryLanguage).

export const COUNTRY_LANGUAGES: Readonly<Record<string, readonly string[]>> = {
  AD: ['ca', 'es', 'fr'], AE: ['ar', 'en'], AF: ['prs', 'ps'], AG: ['en'], AI: ['en'], AL: ['sq'], AM: ['hy'], AO: ['pt'], AR: ['es'],
  AS: ['sm', 'en'], AT: ['de'], AU: ['en'], AW: ['pap', 'nl'], AX: ['sv'], AZ: ['az'], BA: ['bs', 'hr', 'sr'], BB: ['en'], BD: ['bn'],
  BE: ['nl', 'fr', 'de'], BF: ['fr', 'mos'], BG: ['bg'], BH: ['ar'], BI: ['rn', 'fr'], BJ: ['fr', 'fon', 'yo'], BL: ['fr'], BM: ['en'],
  BN: ['ms'], BO: ['es', 'qu', 'ay'], BQ: ['nl', 'pap'], BR: ['pt'], BS: ['en'], BT: ['dz'], BW: ['tn', 'en'], BY: ['be', 'ru'],
  BZ: ['en', 'es'], CA: ['en', 'fr'], CC: ['en', 'ms'], CD: ['fr', 'ln', 'sw', 'kg'], CF: ['fr', 'sg'], CG: ['fr', 'ln', 'kg'],
  CH: ['de', 'fr', 'it', 'rm'], CI: ['fr'], CK: ['en', 'rar'], CL: ['es'], CM: ['fr', 'en'], CN: ['zh'], CO: ['es'], CR: ['es'], CU: ['es'],
  CV: ['pt', 'kea'], CW: ['pap', 'nl'], CX: ['en'], CY: ['el', 'tr'], CZ: ['cs'], DE: ['de'], DJ: ['fr', 'ar', 'so', 'aa'], DK: ['da'],
  DM: ['en'], DO: ['es'], DZ: ['ar', 'kab', 'fr'], EC: ['es', 'qu'], EE: ['et'], EG: ['ar'], EH: ['ar', 'es'], ER: ['ti', 'ar', 'en'],
  ES: ['es', 'ca', 'eu', 'gl'], ET: ['am', 'om', 'ti', 'so'], FI: ['fi', 'sv'], FJ: ['en', 'fj', 'hi'], FK: ['en'], FM: ['en'],
  FO: ['fo', 'da'], FR: ['fr'], GA: ['fr'], GB: ['en', 'cy', 'gd'], GD: ['en'], GE: ['ka'], GF: ['fr'], GG: ['en'], GH: ['en', 'tw', 'ee'],
  GI: ['en', 'es'], GL: ['kl', 'da'], GM: ['en', 'mnk', 'wo', 'ff'], GN: ['fr', 'ff'], GP: ['fr', 'gcf'], GQ: ['es', 'fr'], GR: ['el'],
  GT: ['es'], GU: ['en', 'ch'], GW: ['pt'], GY: ['en'], HK: ['yue', 'en', 'zh'], HN: ['es'], HR: ['hr'], HT: ['ht', 'fr'], HU: ['hu'],
  ID: ['id', 'jv', 'su'], IE: ['en', 'ga'], IL: ['he', 'ar'], IM: ['en'],
  IN: ['hi', 'en', 'bn', 'mr', 'te', 'ta', 'gu', 'ur', 'kn', 'ml', 'or', 'pa'], IQ: ['ar', 'ku'], IR: ['fa', 'az', 'ku'], IS: ['is'],
  IT: ['it'], JE: ['en'], JM: ['en'], JO: ['ar'], JP: ['ja'], KE: ['sw', 'en'], KG: ['ky', 'ru'], KH: ['km'], KI: ['en', 'gil'],
  KM: ['zdj', 'ar', 'fr'], KN: ['en'], KP: ['ko'], KR: ['ko'], KW: ['ar'], KY: ['en'], KZ: ['kk', 'ru'], LA: ['lo'], LB: ['ar', 'fr'],
  LC: ['en'], LI: ['de'], LK: ['si', 'ta'], LR: ['en'], LS: ['st', 'en'], LT: ['lt'], LU: ['lb', 'fr', 'de'], LV: ['lv'], LY: ['ar'],
  MA: ['ar', 'zgh', 'fr'], MC: ['fr'], MD: ['ro', 'ru'], ME: ['sr'], MF: ['fr'], MG: ['mg', 'fr'], MH: ['mh', 'en'], MK: ['mk', 'sq'],
  ML: ['fr', 'bm'], MM: ['my'], MN: ['mn'], MO: ['yue', 'pt', 'zh'], MP: ['en', 'ch'], MQ: ['fr', 'gcf'], MR: ['ar', 'ff', 'wo'],
  MS: ['en'], MT: ['mt', 'en'], MU: ['en', 'fr', 'mfe'], MV: ['dv'], MW: ['ny', 'en'], MX: ['es'], MY: ['ms', 'en', 'zh', 'ta'], MZ: ['pt'],
  NA: ['en', 'af'], NC: ['fr'], NE: ['fr', 'ha', 'dje'], NF: ['en'], NG: ['en', 'ha', 'yo', 'ig'], NI: ['es'], NL: ['nl'], NO: ['no'],
  NP: ['ne', 'mai', 'bho'], NR: ['na', 'en'], NU: ['niu', 'en'], NZ: ['en', 'mi'], OM: ['ar'], PA: ['es'], PE: ['es', 'qu', 'ay'],
  PF: ['fr', 'ty'], PG: ['tpi', 'en', 'ho'], PH: ['fil', 'en', 'ceb', 'ilo'], PK: ['ur', 'en', 'pa', 'ps', 'sd'], PL: ['pl'], PM: ['fr'],
  PN: ['en'], PR: ['es', 'en'], PS: ['ar'], PT: ['pt'], PW: ['pau', 'en'], PY: ['es', 'gn'], QA: ['ar'], RE: ['fr'], RO: ['ro'], RS: ['sr'],
  RU: ['ru'], RW: ['rw', 'fr', 'en', 'sw'], SA: ['ar'], SB: ['en', 'pis'], SC: ['crs', 'en', 'fr'], SD: ['ar', 'en'], SE: ['sv'],
  SG: ['en', 'zh', 'ms', 'ta'], SH: ['en'], SI: ['sl'], SJ: ['no'], SK: ['sk'], SL: ['en', 'kri'], SM: ['it'], SN: ['fr', 'wo'],
  SO: ['so', 'ar'], SR: ['nl', 'srn'], SS: ['en', 'din'], ST: ['pt'], SV: ['es'], SX: ['en', 'nl'], SY: ['ar', 'ku'], SZ: ['ss', 'en'],
  TC: ['en'], TD: ['fr', 'ar'], TG: ['fr', 'ee'], TH: ['th'], TJ: ['tg', 'ru'], TK: ['tkl', 'en'], TL: ['tet', 'pt'], TM: ['tk', 'ru'],
  TN: ['ar', 'fr'], TO: ['to', 'en'], TR: ['tr', 'ku'], TT: ['en'], TV: ['tvl', 'en'], TW: ['zh'], TZ: ['sw', 'en'], UA: ['uk', 'ru'],
  UG: ['en', 'sw', 'lg'], US: ['en', 'es'], UY: ['es'], UZ: ['uz', 'ru'], VA: ['it', 'la'], VC: ['en'], VE: ['es'], VG: ['en'], VI: ['en'],
  VN: ['vi'], VU: ['bi', 'en', 'fr'], WF: ['fr', 'wls'], WS: ['sm', 'en'], XK: ['sq', 'sr'], YE: ['ar'], YT: ['fr'],
  ZA: ['zu', 'xh', 'af', 'en', 'st', 'tn', 'ts', 'ss', 've', 'nr'], ZM: ['en', 'bem', 'ny'], ZW: ['en', 'sn', 'nd'],
};

/** The languages your nationalities suggest, in the order given, each once. */
export function countryLanguages(codes: readonly string[]): string[] {
  return [...new Set(codes.flatMap((c) => COUNTRY_LANGUAGES[c] ?? []))];
}
