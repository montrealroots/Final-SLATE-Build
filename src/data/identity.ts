// Identity catalogs used in character creation. Heritage entries are self-identifications,
// never mechanics: nothing in the simulation reads them to change ability or outcomes.
// Players can add any background in their own words when the list misses it.

export const HERITAGES: string[] = [
  'Aboriginal Australian', 'Acadian', 'Afghan', 'African American', 'Afro-Brazilian', 'Afro-Caribbean', 'Afro-Latino', 'Akan', 'Albanian',
  'Algerian', 'Amazigh', 'American', 'Arab', 'Argentine', 'Armenian', 'Ashkenazi Jewish', 'Assyrian', 'Australian', 'Austrian', 'Azerbaijani',
  'Bangladeshi', 'Basque', 'Belarusian', 'Belgian', 'Bengali', 'Beta Israel', 'Bosnian', 'Brazilian', 'British', 'Bulgarian', 'Burmese', 'Cambodian',
  'Cameroonian', 'Canadian', 'Cape Verdean', 'Catalan', 'Chamorro', 'Chechen', 'Cherokee', 'Chilean', 'Chinese', 'Colombian', 'Congolese',
  'Cornish', 'Croatian', 'Cuban', 'Czech', 'Danish', 'Dominican', 'Dutch', 'Ecuadorian', 'Egyptian', 'Emirati', 'English', 'Eritrean',
  'Estonian', 'Ethiopian', 'Fijian', 'Filipino', 'Finnish', 'First Nations', 'French', 'French Canadian', 'Fulani', 'Garifuna', 'Georgian',
  'German', 'Ghanaian', 'Greek', 'Guatemalan', 'Gujarati', 'Haitian', 'Han Chinese', 'Hausa', 'Hawaiian (Kānaka Maoli)', 'Hmong',
  'Honduran', 'Hong Konger', 'Hungarian', 'Icelandic', 'Igbo', 'Indian', 'Indigenous Mexican', 'Indonesian', 'Inuit', 'Iranian', 'Iraqi',
  'Irish', 'Israeli', 'Italian', 'Jamaican', 'Japanese', 'Jordanian', 'Kazakh', 'Kenyan', 'Khmer', 'Kikuyu', 'Korean', 'Kurdish',
  'Lao', 'Latvian', 'Lebanese', 'Liberian', 'Lithuanian', 'Luo', 'Malagasy', 'Malay', 'Malayali', 'Maltese', 'Māori', 'Mapuche',
  'Maya', 'Mestizo', 'Métis', 'Mexican', 'Mizrahi Jewish', 'Mongolian', 'Moroccan', 'Navajo (Diné)', 'Nepali', 'New Zealander',
  'Nicaraguan', 'Nigerian', 'Norwegian', 'Ojibwe', 'Okinawan', 'Pakistani', 'Palestinian', 'Panamanian', 'Pashtun', 'Persian',
  'Peruvian', 'Polish', 'Portuguese', 'Puerto Rican', 'Punjabi', 'Quechua', 'Romani', 'Romanian', 'Russian', 'Rwandan', 'Salvadoran',
  'Sámi', 'Samoan', 'Saudi', 'Scottish', 'Senegalese', 'Sephardic Jewish', 'Serbian', 'Sikh', 'Sindhi', 'Singaporean', 'Slovak', 'Slovenian',
  'Somali', 'South African', 'Spanish', 'Sri Lankan', 'Sudanese', 'Swahili', 'Swedish', 'Swiss', 'Syrian', 'Taiwanese', 'Tamil', 'Tatar',
  'Telugu', 'Thai', 'Tibetan', 'Tongan', 'Trinidadian', 'Tunisian', 'Turkish', 'Ugandan', 'Ukrainian', 'Uyghur', 'Venezuelan',
  'Vietnamese', 'Welsh', 'Wolof', 'Xhosa', 'Yemeni', 'Yoruba', 'Zimbabwean', 'Zulu',
];

/**
 * Ethnicity and nationality, asked apart (November 8, 2026). Until then one list mixed peoples (Yoruba, Han Chinese,
 * Ashkenazi Jewish) with nationalities (Nigerian, American, Mexican). HERITAGES stays the whole vocabulary: performers
 * and script characters are written with it, and holidays and languages are keyed by it.
 *
 * A nationality is a country. Where HERITAGES has that country's word, the nationality brings everything the word
 * brought: its holidays, its languages and a shared background in casting.
 */
export const NATIONAL_LABEL: Readonly<Record<string, string>> = {
  AF: 'Afghan', AL: 'Albanian', DZ: 'Algerian', US: 'American', AR: 'Argentine', AM: 'Armenian', AU: 'Australian', AT: 'Austrian',
  AZ: 'Azerbaijani', BD: 'Bangladeshi', BY: 'Belarusian', BE: 'Belgian', BA: 'Bosnian', BR: 'Brazilian', GB: 'British', BG: 'Bulgarian',
  MM: 'Burmese', KH: 'Cambodian', CM: 'Cameroonian', CA: 'Canadian', CV: 'Cape Verdean', CL: 'Chilean', CN: 'Chinese', CO: 'Colombian',
  CD: 'Congolese', CG: 'Congolese', HR: 'Croatian', CU: 'Cuban', CZ: 'Czech', DK: 'Danish', DO: 'Dominican', NL: 'Dutch', EC: 'Ecuadorian',
  EG: 'Egyptian', AE: 'Emirati', ER: 'Eritrean', EE: 'Estonian', ET: 'Ethiopian', FJ: 'Fijian', PH: 'Filipino', FI: 'Finnish', FR: 'French',
  GE: 'Georgian', DE: 'German', GH: 'Ghanaian', GR: 'Greek', GT: 'Guatemalan', HT: 'Haitian', HN: 'Honduran', HK: 'Hong Konger',
  HU: 'Hungarian', IS: 'Icelandic', IN: 'Indian', ID: 'Indonesian', IR: 'Iranian', IQ: 'Iraqi', IE: 'Irish', IL: 'Israeli', IT: 'Italian',
  JM: 'Jamaican', JP: 'Japanese', JO: 'Jordanian', KZ: 'Kazakh', KE: 'Kenyan', KR: 'Korean', KP: 'Korean', LA: 'Lao', LV: 'Latvian',
  LB: 'Lebanese', LR: 'Liberian', LT: 'Lithuanian', MG: 'Malagasy', MT: 'Maltese', MX: 'Mexican', MN: 'Mongolian', MA: 'Moroccan',
  NP: 'Nepali', NZ: 'New Zealander', NI: 'Nicaraguan', NG: 'Nigerian', NO: 'Norwegian', PK: 'Pakistani', PS: 'Palestinian',
  PA: 'Panamanian', PE: 'Peruvian', PL: 'Polish', PT: 'Portuguese', PR: 'Puerto Rican', RO: 'Romanian', RU: 'Russian', RW: 'Rwandan',
  SV: 'Salvadoran', WS: 'Samoan', SA: 'Saudi', SN: 'Senegalese', RS: 'Serbian', SG: 'Singaporean', SK: 'Slovak', SI: 'Slovenian',
  SO: 'Somali', ZA: 'South African', ES: 'Spanish', LK: 'Sri Lankan', SD: 'Sudanese', SE: 'Swedish', CH: 'Swiss', SY: 'Syrian',
  TW: 'Taiwanese', TH: 'Thai', TO: 'Tongan', TT: 'Trinidadian', TN: 'Tunisian', TR: 'Turkish', UG: 'Ugandan', UA: 'Ukrainian',
  VE: 'Venezuelan', VN: 'Vietnamese', YE: 'Yemeni', ZW: 'Zimbabwean',
};

/**
 * Words in HERITAGES that name a nationality and no people of their own: countries of many peoples, whose peoples the
 * list names (Nigerian: Yoruba, Igbo, Hausa, Fulani), or whose people are named by a broad ethnicity (American, Mexican).
 * They're asked as nationalities. Words that name a people as well as a country (Korean, Irish, Greek) are both.
 */
export const NATIONALITY_ONLY: ReadonlySet<string> = new Set([
  'Afghan', 'Algerian', 'American', 'Argentine', 'Australian', 'Bangladeshi', 'Belgian', 'Brazilian', 'British', 'Cameroonian', 'Canadian',
  'Chilean', 'Colombian', 'Congolese', 'Cuban', 'Dominican', 'Ecuadorian', 'Egyptian', 'Emirati', 'Ghanaian', 'Guatemalan', 'Haitian',
  'Honduran', 'Hong Konger', 'Indian', 'Iranian', 'Iraqi', 'Israeli', 'Jamaican', 'Jordanian', 'Kenyan', 'Lebanese', 'Liberian', 'Mexican',
  'Moroccan', 'New Zealander', 'Nicaraguan', 'Nigerian', 'Pakistani', 'Panamanian', 'Peruvian', 'Puerto Rican', 'Rwandan', 'Salvadoran',
  'Saudi', 'Senegalese', 'Singaporean', 'South African', 'Sudanese', 'Swiss', 'Syrian', 'Trinidadian', 'Tunisian', 'Ugandan',
  'Venezuelan', 'Yemeni', 'Zimbabwean',
]);

/** The broad groups, from 1221's Race Or Ethnicity list: an answer for anyone the peoples below don't name. */
export const BROAD_ETHNICITIES: readonly string[] = [
  'American Indian Or Alaska Native', 'Asian', 'Black Or African', 'Hispanic Or Latino', 'Middle Eastern Or North African',
  'Native Hawaiian Or Pacific Islander', 'White',
];

/** What Ethnicity offers: the broad groups and the peoples together, in alphabetical order (they were apart until the owner asked). */
export const ETHNICITIES: readonly string[] = [...BROAD_ETHNICITIES, ...HERITAGES.filter((h) => !NATIONALITY_ONLY.has(h))]
  .sort((a, b) => fold(a).localeCompare(fold(b), 'en'));

export function searchEthnicities(q: string, limit = 14): string[] {
  const f = fold(q.trim());
  if (!f) return ETHNICITIES.slice(0, limit);
  return ETHNICITIES.filter((h) => fold(h).includes(f)).sort((a, b) => Number(!fold(a).startsWith(f)) - Number(!fold(b).startsWith(f))).slice(0, limit);
}

export interface LanguageInfo {
  code: string;
  name: string;
}

export const LANGUAGES: LanguageInfo[] = [
  ['af', 'Afrikaans'], ['sq', 'Albanian'], ['am', 'Amharic'], ['ar', 'Arabic'], ['hy', 'Armenian'], ['as', 'Assamese'], ['ay', 'Aymara'],
  ['az', 'Azerbaijani'], ['eu', 'Basque'], ['be', 'Belarusian'], ['bn', 'Bengali'], ['bho', 'Bhojpuri'], ['bs', 'Bosnian'], ['br', 'Breton'],
  ['bg', 'Bulgarian'], ['my', 'Burmese'], ['yue', 'Cantonese'], ['ca', 'Catalan'], ['ceb', 'Cebuano'], ['chr', 'Cherokee'], ['ny', 'Chichewa'],
  ['co', 'Corsican'], ['cr', 'Cree'], ['hr', 'Croatian'], ['cs', 'Czech'], ['da', 'Danish'], ['prs', 'Dari'], ['nl', 'Dutch'], ['dz', 'Dzongkha'],
  ['en', 'English'], ['eo', 'Esperanto'], ['et', 'Estonian'], ['ee', 'Ewe'], ['fo', 'Faroese'], ['fil', 'Filipino'], ['fi', 'Finnish'],
  ['fr', 'French'], ['ff', 'Fula'], ['gl', 'Galician'], ['ka', 'Georgian'], ['de', 'German'], ['el', 'Greek'], ['kl', 'Greenlandic'],
  ['gn', 'Guarani'], ['gu', 'Gujarati'], ['ht', 'Haitian Creole'], ['ha', 'Hausa'], ['haw', 'Hawaiian'], ['he', 'Hebrew'], ['hi', 'Hindi'],
  ['hmn', 'Hmong'], ['hu', 'Hungarian'], ['is', 'Icelandic'], ['ig', 'Igbo'], ['ilo', 'Ilocano'], ['id', 'Indonesian'], ['iu', 'Inuktitut'],
  ['ga', 'Irish'], ['it', 'Italian'], ['ja', 'Japanese'], ['jv', 'Javanese'], ['kn', 'Kannada'], ['kk', 'Kazakh'], ['km', 'Khmer'],
  ['rw', 'Kinyarwanda'], ['rn', 'Kirundi'], ['ko', 'Korean'], ['ku', 'Kurdish'], ['ky', 'Kyrgyz'], ['lo', 'Lao'], ['la', 'Latin'],
  ['lv', 'Latvian'], ['ln', 'Lingala'], ['lt', 'Lithuanian'], ['lb', 'Luxembourgish'], ['mk', 'Macedonian'], ['mai', 'Maithili'],
  ['mg', 'Malagasy'], ['ms', 'Malay'], ['ml', 'Malayalam'], ['mt', 'Maltese'], ['zh', 'Mandarin Chinese'], ['mi', 'Māori'], ['mr', 'Marathi'],
  ['mn', 'Mongolian'], ['nv', 'Navajo'], ['ne', 'Nepali'], ['no', 'Norwegian'], ['oc', 'Occitan'], ['oj', 'Ojibwe'], ['or', 'Odia'],
  ['om', 'Oromo'], ['ps', 'Pashto'], ['fa', 'Persian'], ['pl', 'Polish'], ['pt', 'Portuguese'], ['pa', 'Punjabi'], ['qu', 'Quechua'],
  ['ro', 'Romanian'], ['rom', 'Romani'], ['ru', 'Russian'], ['se', 'Northern Sámi'], ['sm', 'Samoan'], ['gd', 'Scottish Gaelic'],
  ['sr', 'Serbian'], ['st', 'Sesotho'], ['sn', 'Shona'], ['sd', 'Sindhi'], ['si', 'Sinhala'], ['sk', 'Slovak'], ['sl', 'Slovenian'],
  ['so', 'Somali'], ['es', 'Spanish'], ['su', 'Sundanese'], ['sw', 'Swahili'], ['sv', 'Swedish'], ['tl', 'Tagalog'], ['tg', 'Tajik'],
  ['ta', 'Tamil'], ['tt', 'Tatar'], ['te', 'Telugu'], ['th', 'Thai'], ['bo', 'Tibetan'], ['ti', 'Tigrinya'], ['to', 'Tongan'],
  ['tn', 'Tswana'], ['tr', 'Turkish'], ['tk', 'Turkmen'], ['tw', 'Twi'], ['uk', 'Ukrainian'], ['ur', 'Urdu'], ['ug', 'Uyghur'],
  ['uz', 'Uzbek'], ['vi', 'Vietnamese'], ['cy', 'Welsh'], ['wo', 'Wolof'], ['xh', 'Xhosa'], ['yi', 'Yiddish'], ['yo', 'Yoruba'],
  ['zu', 'Zulu'], ['ase', 'American Sign Language'], ['bfi', 'British Sign Language'], ['fsl', 'French Sign Language'],
  // Added November 8, 2026, so every country and territory on the map has its own languages (country-languages.ts).
  ['aa', 'Afar'], ['bm', 'Bambara'], ['bem', 'Bemba'], ['bi', 'Bislama'], ['kea', 'Cape Verdean Creole'], ['ch', 'Chamorro'],
  ['zdj', 'Comorian'], ['rar', 'Cook Islands Māori'], ['dv', 'Dhivehi'], ['din', 'Dinka'], ['fj', 'Fijian'], ['fon', 'Fon'],
  ['gcf', 'Antillean Creole'], ['gil', 'Gilbertese'], ['ho', 'Hiri Motu'], ['kab', 'Kabyle'], ['kg', 'Kongo'], ['kri', 'Krio'],
  ['lg', 'Luganda'], ['mnk', 'Mandinka'], ['mh', 'Marshallese'], ['mfe', 'Mauritian Creole'], ['mos', 'Mooré'], ['na', 'Nauruan'],
  ['niu', 'Niuean'], ['nd', 'Northern Ndebele'], ['pau', 'Palauan'], ['pap', 'Papiamento'], ['rm', 'Romansh'], ['sg', 'Sango'],
  ['crs', 'Seychellois Creole'], ['pis', 'Solomon Islands Pijin'], ['nr', 'Southern Ndebele'], ['srn', 'Sranan Tongo'], ['ss', 'Swati'],
  ['ty', 'Tahitian'], ['zgh', 'Tamazight'], ['tet', 'Tetum'], ['tpi', 'Tok Pisin'], ['tkl', 'Tokelauan'], ['ts', 'Tsonga'],
  ['tvl', 'Tuvaluan'], ['ve', 'Venda'], ['wls', 'Wallisian'], ['dje', 'Zarma'],
].map(([code, name]) => ({ code, name }))
  // In alphabetical order (November 8, 2026: a few were out of place, and the sign languages sat at the end).
  .sort((a, b) => fold(a.name).localeCompare(fold(b.name), 'en'));

const langByCode = new Map(LANGUAGES.map((l) => [l.code, l]));

export function languageName(code: string): string {
  return langByCode.get(code)?.name ?? code;
}

function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function searchLanguages(q: string, limit = 12): LanguageInfo[] {
  const f = fold(q.trim());
  if (!f) return LANGUAGES.slice(0, limit);
  return LANGUAGES.filter((l) => fold(l.name).includes(f)).sort((a, b) => Number(!fold(a.name).startsWith(f)) - Number(!fold(b.name).startsWith(f))).slice(0, limit);
}

export function searchHeritages(q: string, limit = 14): string[] {
  const f = fold(q.trim());
  if (!f) return HERITAGES.slice(0, limit);
  return HERITAGES.filter((h) => fold(h).includes(f)).sort((a, b) => Number(!fold(a).startsWith(f)) - Number(!fold(b).startsWith(f))).slice(0, limit);
}

export const PRONOUNS = {
  he: { subject: 'he', object: 'him', possessive: 'his', label: 'He/Him' },
  she: { subject: 'she', object: 'her', possessive: 'her', label: 'She/Her' },
  they: { subject: 'they', object: 'them', possessive: 'their', label: 'They/Them' },
} as const;

/**
 * The title the pronouns settle, as 1221's `settledTitle`: He/Him is billed as Actor and She/Her as Actress, with nothing
 * to pick; They/Them settles nothing, and the player chooses. Award categories split by title read it (`awards.ts`).
 */
export function settledTitle(pronouns: string): 'Actor' | 'Actress' | undefined {
  return pronouns === 'he' ? 'Actor' : pronouns === 'she' ? 'Actress' : undefined;
}

