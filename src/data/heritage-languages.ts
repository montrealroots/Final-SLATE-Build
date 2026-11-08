// Kept apart from identity.ts so it loads with character creation, not with the start screen.
/**
 * Languages a background suggests, offered first on creation's languages step (codes from LANGUAGES). A suggestion
 * only: what the player chooses is what casting and language coaching read (production/language.ts, hiring.ts).
 */
export const HERITAGE_LANGUAGES: Record<string, string[]> = {
  // English first where it is the language most people of the background speak.
  'African American': ['en'], American: ['en'], Australian: ['en'], British: ['en'], Canadian: ['en', 'fr'], Chamorro: ['en'], Cornish: ['en'],
  English: ['en'], Fijian: ['en'], Jamaican: ['en'], Liberian: ['en'], Luo: ['sw', 'en'], 'New Zealander': ['en'], Singaporean: ['en', 'zh', 'ms', 'ta'],
  Trinidadian: ['en'],
  'Aboriginal Australian': ['en'], Acadian: ['fr'], Afghan: ['prs', 'ps'], 'Afro-Brazilian': ['pt'], 'Afro-Caribbean': ['en'], 'Afro-Latino': ['es'],
  Akan: ['tw'], Albanian: ['sq'], Algerian: ['ar', 'fr'], Amazigh: ['zgh', 'kab', 'ar'], Arab: ['ar'], Argentine: ['es'], Armenian: ['hy'],
  'Ashkenazi Jewish': ['yi', 'he'], Austrian: ['de'], Azerbaijani: ['az'], Bangladeshi: ['bn'], Basque: ['eu', 'es'], Belarusian: ['be', 'ru'],
  Belgian: ['nl', 'fr'], Bengali: ['bn'], 'Beta Israel': ['he', 'am'], Bosnian: ['bs'], Brazilian: ['pt'], Bulgarian: ['bg'], Burmese: ['my'], Cambodian: ['km'],
  Cameroonian: ['fr', 'en'], 'Cape Verdean': ['pt'], Catalan: ['ca', 'es'], Chechen: ['ru'], Cherokee: ['chr'], Chilean: ['es'],
  Chinese: ['zh', 'yue'], Colombian: ['es'], Congolese: ['fr', 'ln'], Croatian: ['hr'], Cuban: ['es'], Czech: ['cs'], Danish: ['da'],
  Dominican: ['es'], Dutch: ['nl'], Ecuadorian: ['es'], Egyptian: ['ar'], Emirati: ['ar'], Eritrean: ['ti'], Estonian: ['et'],
  Ethiopian: ['am', 'om'], Filipino: ['fil', 'tl'], Finnish: ['fi'], 'First Nations': ['cr', 'oj'], French: ['fr'], 'French Canadian': ['fr'],
  Fulani: ['ff'], Garifuna: ['es'], Georgian: ['ka'], German: ['de'], Ghanaian: ['tw', 'ee'], Greek: ['el'], Guatemalan: ['es'],
  Gujarati: ['gu'], Haitian: ['ht', 'fr'], 'Han Chinese': ['zh'], Hausa: ['ha'], 'Hawaiian (Kānaka Maoli)': ['haw'], Hmong: ['hmn'],
  Honduran: ['es'], 'Hong Konger': ['yue'], Hungarian: ['hu'], Icelandic: ['is'], Igbo: ['ig'], Indian: ['hi'], 'Indigenous Mexican': ['es'],
  Indonesian: ['id', 'jv'], Inuit: ['iu'], Iranian: ['fa'], Iraqi: ['ar', 'ku'], Irish: ['en', 'ga'], Israeli: ['he'], Italian: ['it'],
  Japanese: ['ja'], Jordanian: ['ar'], Kazakh: ['kk', 'ru'], Kenyan: ['sw'], Khmer: ['km'], Kikuyu: ['sw'], Korean: ['ko'], Kurdish: ['ku'],
  Lao: ['lo'], Latvian: ['lv'], Lebanese: ['ar', 'fr'], Lithuanian: ['lt'], Malagasy: ['mg'], Malay: ['ms'], Malayali: ['ml'], Maltese: ['mt'],
  Māori: ['mi'], Mapuche: ['es'], Maya: ['es'], Mestizo: ['es'], Métis: ['fr', 'cr'], Mexican: ['es'], 'Mizrahi Jewish': ['he', 'ar'],
  Mongolian: ['mn'], Moroccan: ['ar', 'fr'], 'Navajo (Diné)': ['nv'], Nepali: ['ne'], Nicaraguan: ['es'], Nigerian: ['yo', 'ig', 'ha'],
  Norwegian: ['no'], Ojibwe: ['oj'], Okinawan: ['ja'], Pakistani: ['ur', 'pa'], Palestinian: ['ar'], Panamanian: ['es'], Pashtun: ['ps'],
  Persian: ['fa'], Peruvian: ['es', 'qu'], Polish: ['pl'], Portuguese: ['pt'], 'Puerto Rican': ['es'], Punjabi: ['pa'], Quechua: ['qu'],
  Romani: ['rom'], Romanian: ['ro'], Russian: ['ru'], Rwandan: ['rw'], Salvadoran: ['es'], Sámi: ['se'], Samoan: ['sm'], Saudi: ['ar'],
  Scottish: ['en', 'gd'], Senegalese: ['wo', 'fr'], 'Sephardic Jewish': ['he', 'es'], Serbian: ['sr'], Sikh: ['pa'], Sindhi: ['sd'], Slovak: ['sk'],
  Slovenian: ['sl'], Somali: ['so'], 'South African': ['af', 'zu'], Spanish: ['es'], 'Sri Lankan': ['si', 'ta'], Sudanese: ['ar'],
  Swahili: ['sw'], Swedish: ['sv'], Swiss: ['de', 'fr', 'it'], Syrian: ['ar'], Taiwanese: ['zh'], Tamil: ['ta'], Tatar: ['tt', 'ru'],
  Telugu: ['te'], Thai: ['th'], Tibetan: ['bo'], Tongan: ['to'], Tunisian: ['ar', 'fr'], Turkish: ['tr'], Ugandan: ['sw'], Ukrainian: ['uk'],
  Uyghur: ['ug'], Venezuelan: ['es'], Vietnamese: ['vi'], Welsh: ['en', 'cy'], Wolof: ['wo'], Xhosa: ['xh'], Yemeni: ['ar'], Yoruba: ['yo'],
  Zimbabwean: ['sn'], Zulu: ['zu'],
};

/** Assyrian has none: its language, Neo-Aramaic, isn't one the game lists, and another would be wrong. */

/** The languages a character's backgrounds suggest, without repeats, in background order. */
export function heritageLanguages(labels: readonly string[]): string[] {
  return [...new Set(labels.flatMap((l) => HERITAGE_LANGUAGES[l] ?? []))];
}
