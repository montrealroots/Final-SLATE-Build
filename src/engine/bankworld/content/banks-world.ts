/**
 * SLATE — the banks of every country the thirteen in `banks.ts` don't cover.
 *
 * Generated from research on 2026-09-25 (`probe/gen-world-banks.cjs` turns the
 * table into this file; the table is kept in the handoff's record). For each
 * country and territory: its biggest retail banks by the names customers use,
 * how an account is
 * numbered: an IBAN where the country uses one day to day, and a plain
 * national number otherwise. Each row says where it came from and how sure
 * the research was (H, M or L).
 *
 * What a bank here charges and pays was not researched, so an account at one
 * has no fee and pays no rate, and the bank screen says there is no product
 * sheet for it rather than inventing one.
 */

import type { CountryBanking, NumberFormat } from './banks';

interface Row {
  iso: string;
  banks: readonly string[];
  format: NumberFormat;
  ibanCountry?: string;
  ibanLength?: number;
  confidence: 'H' | 'M' | 'L';
  /** Accounts there are called checking, the American way. */
  checking?: boolean;
  source: string;
}

const ROWS: readonly Row[] = [
  // Added November 14, 2026 (the owner's command of that day: make banking possible everywhere). Nauru and Niue were
  // researched that day. The other five have no bank of their own, so a life there banks where its residents do, with
  // the administering country's banks: said as the game's model, not research (docs/v9/COVERAGE.md).
  { iso: 'NR', banks: ["Commonwealth Bank (Nauru)"], format: 'plain', confidence: 'M', source: "https://pina.com.fj/2025/08/12/bendigo-bank-cease-operations-in-nauru-commonwealth-bank-of-australia-opens-today/ (CommBank replaced Bendigo Bank's agency in August 2025)" }, // Nauru
  { iso: 'NU', banks: ["Kiwibank (Niue Development Bank agency)"], format: 'plain', confidence: 'M', source: "https://gov.nu/media-releases/more-kiwibank-options-coming-to-niue (the Kiwibank agency, run through the Niue Development Bank)" }, // Niue
  { iso: 'IO', banks: ["Barclays","HSBC UK"], format: 'iban', ibanCountry: 'GB', ibanLength: 22, confidence: 'L', source: "No bank operates in the British Indian Ocean Territory: the game banks a life there with the United Kingdom's banks" }, // British Indian Ocean Territory
  { iso: 'TF', banks: ["BNP Paribas","Société Générale"], format: 'iban', ibanCountry: 'FR', ibanLength: 27, confidence: 'L', source: "No bank operates in the French Southern Territories: the game banks a life there with France's banks" }, // French Southern Territories
  { iso: 'GS', banks: ["Barclays","HSBC UK"], format: 'iban', ibanCountry: 'GB', ibanLength: 22, confidence: 'L', source: "No bank operates in South Georgia and the South Sandwich Islands: the game banks a life there with the United Kingdom's banks" }, // South Georgia
  { iso: 'PN', banks: ["ANZ New Zealand","Kiwibank"], format: 'plain', confidence: 'L', source: "No bank operates on Pitcairn: the game banks a life there with New Zealand's banks, whose dollar it uses" }, // Pitcairn
  { iso: 'TK', banks: ["ANZ New Zealand","Kiwibank"], format: 'plain', confidence: 'L', source: "No bank operates in Tokelau: the game banks a life there with New Zealand's banks, whose dollar it uses" }, // Tokelau
  { iso: 'AF', banks: ["Azizi Bank","Afghanistan International Bank","New Kabul Bank"], format: 'plain', confidence: 'M', source: "https://dab.gov.af/Afghan-Deposit-Insurance-Corporation" }, // Afghanistan
  { iso: 'AX', banks: ["Ålandsbanken","Andelsbanken för Åland","Nordea"], format: 'iban', ibanCountry: 'FI', ibanLength: 18, confidence: 'M', source: "https://en.wikipedia.org/wiki/%C3%85landsbanken" }, // Åland Islands
  { iso: 'AL', banks: ["Banka Kombëtare Tregtare (BKT)","Raiffeisen Bank Albania","Credins Bank","Intesa Sanpaolo Bank Albania"], format: 'iban', ibanCountry: 'AL', ibanLength: 28, confidence: 'H', source: "https://asd.gov.al/en/" }, // Albania
  { iso: 'DZ', banks: ["Banque Nationale d'Algérie (BNA)","Crédit Populaire d'Algérie (CPA)","Banque Extérieure d'Algérie (BEA)"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Algeria" }, // Algeria
  { iso: 'AS', banks: ["Territory Bank of American Samoa","ANZ Amerika Samoa Bank"], format: 'plain', confidence: 'L', checking: true, source: "https://en.wikipedia.org/wiki/American_Samoa" }, // American Samoa
  { iso: 'AD', banks: ["Andbank","Crèdit Andorrà","MoraBanc"], format: 'iban', ibanCountry: 'AD', ibanLength: 24, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Andorra" }, // Andorra
  { iso: 'AO', banks: ["Banco Angolano de Investimentos (BAI)","Banco de Fomento Angola (BFA)","Banco BIC","Banco de Poupança e Crédito (BPC)"], format: 'plain', confidence: 'H', source: "https://www.fgd.ao/Perguntas_frequentes.aspx" }, // Angola
  { iso: 'AI', banks: ["National Commercial Bank of Anguilla","Republic Bank (Anguilla)"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/Economy_of_Anguilla" }, // Anguilla
  { iso: 'AG', banks: ["Antigua Commercial Bank","Eastern Caribbean Amalgamated Bank","CIBC Caribbean","RBC Royal Bank"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Antigua_and_Barbuda" }, // Antigua and Barbuda
  { iso: 'AR', banks: ["Banco de la Nación Argentina","Banco Galicia","Banco Santander Argentina","BBVA Argentina"], format: 'plain', confidence: 'H', source: "https://www.bcra.gob.ar/noticias/actualizacion-tope-cobertura-depositos.asp" }, // Argentina
  { iso: 'AM', banks: ["Ameriabank","Ardshinbank","ACBA Bank","Inecobank"], format: 'plain', confidence: 'H', source: "https://banks.am/en/deposit_guarantees/Deposit-Guarantee-Fund-of-Armenia" }, // Armenia
  { iso: 'AW', banks: ["Aruba Bank","RBC Royal Bank (Aruba)","Caribbean Mercantile Bank (CMB)"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/Centrale_Bank_van_Aruba" }, // Aruba
  { iso: 'AT', banks: ["Erste Bank und Sparkassen","Raiffeisen","Bank Austria (UniCredit)","BAWAG"], format: 'iban', ibanCountry: 'AT', ibanLength: 20, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Austria" }, // Austria
  { iso: 'AZ', banks: ["Kapital Bank","PASHA Bank","ABB (International Bank of Azerbaijan)"], format: 'iban', ibanCountry: 'AZ', ibanLength: 28, confidence: 'H', source: "https://en.wikipedia.org/wiki/Azerbaijan_Deposit_Insurance_Foundation" }, // Azerbaijan
  { iso: 'BS', banks: ["RBC Royal Bank","Commonwealth Bank","CIBC Caribbean","Bank of The Bahamas"], format: 'plain', confidence: 'H', source: "https://www.dic.bs/faq.php" }, // Bahamas
  { iso: 'BH', banks: ["National Bank of Bahrain","Bank of Bahrain and Kuwait (BBK)","Kuwait Finance House Bahrain"], format: 'iban', ibanCountry: 'BH', ibanLength: 22, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Bahrain" }, // Bahrain
  { iso: 'BD', banks: ["Sonali Bank","Islami Bank Bangladesh","Dutch-Bangla Bank","BRAC Bank"], format: 'plain', confidence: 'H', source: "https://www.thedailystar.net/business/economy/banks/news/new-law-fully-insure-93-bank-depositors-4007576" }, // Bangladesh
  { iso: 'BB', banks: ["Republic Bank (Barbados)","CIBC Caribbean","RBC Royal Bank","First Citizens"], format: 'plain', confidence: 'H', source: "https://bdic.org.bb/site/index.php/en/about" }, // Barbados
  { iso: 'BY', banks: ["Belarusbank","Belagroprombank","Priorbank","BelVEB"], format: 'iban', ibanCountry: 'BY', ibanLength: 28, confidence: 'M', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Belarus" }, // Belarus
  { iso: 'BE', banks: ["BNP Paribas Fortis","KBC","Belfius","ING Belgium"], format: 'iban', ibanCountry: 'BE', ibanLength: 16, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Belgium" }, // Belgium
  { iso: 'BZ', banks: ["Belize Bank","Heritage Bank","Atlantic Bank","National Bank of Belize"], format: 'plain', confidence: 'L', source: "https://www.centralbank.org.bz/about-the-bank/laws-and-regulations/deposit-insurance-act" }, // Belize
  { iso: 'BJ', banks: ["Ecobank Bénin","Bank of Africa Bénin","Orabank Bénin"], format: 'plain', confidence: 'M', source: "https://fr.allafrica.com/stories/202505160185.html" }, // Benin
  { iso: 'BM', banks: ["Butterfield","HSBC Bermuda","Clarien Bank"], format: 'plain', confidence: 'H', source: "https://bdic.bm/" }, // Bermuda
  { iso: 'BT', banks: ["Bank of Bhutan","Bhutan National Bank","Druk PNB Bank","T Bank"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/Royal_Monetary_Authority_of_Bhutan" }, // Bhutan
  { iso: 'BO', banks: ["Banco Unión","BancoSol","Banco Mercantil Santa Cruz","Banco Nacional de Bolivia (BNB)"], format: 'plain', confidence: 'L', source: "https://www.bcb.gob.bo/?q=content/el-fondo-de-protecci%C3%B3n-del-ahorrista-protege-los-ahorros-del-p%C3%BAblico" }, // Bolivia
  { iso: 'BQ', banks: ["Maduro & Curiel's Bank (MCB) Bonaire","Orco Bank","RBC Royal Bank"], format: 'plain', confidence: 'L', source: "https://en.wikipedia.org/wiki/Caribbean_Netherlands" }, // Caribbean Netherlands
  { iso: 'BA', banks: ["UniCredit Bank","Raiffeisen Bank BiH","Intesa Sanpaolo Banka BiH","NLB Banka"], format: 'iban', ibanCountry: 'BA', ibanLength: 20, confidence: 'H', source: "https://aod.ba/en/deposit-insurance/" }, // Bosnia and Herzegovina
  { iso: 'BW', banks: ["First National Bank Botswana","Absa Bank Botswana","Stanbic Bank Botswana","Standard Chartered Botswana"], format: 'plain', confidence: 'M', source: "https://www.bankofbotswana.bw/content/establishment" }, // Botswana
  { iso: 'BR', banks: ["Itaú Unibanco","Banco do Brasil","Bradesco","Caixa Econômica Federal"], format: 'plain', confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Brazil" }, // Brazil
  { iso: 'VG', banks: ["CIBC Caribbean","Banco Popular","National Bank of the Virgin Islands"], format: 'iban', ibanCountry: 'VG', ibanLength: 24, confidence: 'M', source: "https://en.wikipedia.org/wiki/List_of_banks_in_the_British_Virgin_Islands" }, // British Virgin Islands
  { iso: 'BN', banks: ["Bank Islam Brunei Darussalam (BIBD)","Baiduri Bank","Standard Chartered"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/Bank_Islam_Brunei_Darussalam" }, // Brunei
  { iso: 'BG', banks: ["UniCredit Bulbank","DSK Bank","United Bulgarian Bank (UBB)","Postbank"], format: 'iban', ibanCountry: 'BG', ibanLength: 22, confidence: 'H', source: "https://en.wikipedia.org/wiki/Bulgarian_Deposit_Insurance_Fund" }, // Bulgaria
  { iso: 'BF', banks: ["Coris Bank International","Ecobank Burkina","Bank of Africa Burkina","Société Générale Burkina"], format: 'plain', confidence: 'M', source: "https://fr.allafrica.com/stories/202505160185.html" }, // Burkina Faso
  { iso: 'BI', banks: ["Banque de Crédit de Bujumbura (BCB)","Interbank Burundi","BANCOBU"], format: 'iban', ibanCountry: 'BI', ibanLength: 27, confidence: 'L', source: "https://www.brb.bi/textes_legaux_relatifs_aux_fonds_de_garantie" }, // Burundi
  { iso: 'CV', banks: ["Caixa Económica de Cabo Verde","Banco Comercial do Atlântico (BCA)","Banco Interatlântico"], format: 'plain', confidence: 'L', source: "https://en.wikipedia.org/wiki/Banco_de_Cabo_Verde" }, // Cape Verde
  { iso: 'KH', banks: ["ACLEDA Bank","ABA Bank","Canadia Bank","Wing Bank"], format: 'plain', confidence: 'H', source: "https://amro-asia.org/time-is-ripe-for-a-deposit-protection-scheme-in-cambodia" }, // Cambodia
  { iso: 'CM', banks: ["Afriland First Bank","SCB Cameroun","BICEC","Ecobank Cameroun"], format: 'plain', confidence: 'M', source: "https://www.agenceecofin.com/actualites-finance/2007-140353-cemac-le-fogadac-vise-une-reserve-d-intervention-de-1-7-milliard-dici-2036" }, // Cameroon
  { iso: 'KY', banks: ["Butterfield","Cayman National Bank","RBC Royal Bank","CIBC Caribbean"], format: 'plain', confidence: 'M', source: "https://www.caymancompass.com/2023/04/26/the-issue-explained-why-do-banks-fail-and-could-it-happen-in-cayman/" }, // Cayman Islands
  { iso: 'CF', banks: ["Ecobank Centrafrique","Commercial Bank Centrafrique (CBCA)","BSIC Centrafrique"], format: 'plain', confidence: 'M', source: "https://www.agenceecofin.com/actualites-finance/2007-140353-cemac-le-fogadac-vise-une-reserve-d-intervention-de-1-7-milliard-dici-2036" }, // Central African Republic
  { iso: 'TD', banks: ["Commercial Bank Tchad","Ecobank Tchad","Société Générale Tchad","Orabank Tchad"], format: 'plain', confidence: 'M', source: "https://www.agenceecofin.com/actualites-finance/2007-140353-cemac-le-fogadac-vise-une-reserve-d-intervention-de-1-7-milliard-dici-2036" }, // Chad
  { iso: 'CL', banks: ["BancoEstado","Banco de Chile","Banco Santander Chile","BCI"], format: 'plain', confidence: 'H', source: "https://www.cmfchile.cl/educa/621/w3-article-27460.html" }, // Chile
  { iso: 'CN', banks: ["ICBC","China Construction Bank","Agricultural Bank of China","Bank of China"], format: 'plain', confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_China" }, // China
  { iso: 'CX', banks: ["no confirmed branch)"], format: 'plain', confidence: 'L', source: "https://en.wikipedia.org/wiki/Christmas_Island" }, // Christmas Island
  { iso: 'CC', banks: ["no confirmed branch)"], format: 'plain', confidence: 'L', source: "https://en.wikipedia.org/wiki/Cocos_(Keeling)_Islands" }, // Cocos (Keeling) Islands
  { iso: 'CO', banks: ["Bancolombia","Banco de Bogotá","Davivienda","BBVA Colombia"], format: 'plain', confidence: 'H', source: "https://www.fogafin.gov.co/que-es-el-seguro-de-depositos" }, // Colombia
  { iso: 'KM', banks: ["Banque pour l'Industrie et le Commerce – Comores (BIC-Comores)","Exim Bank Comores","Banque Fédérale de Commerce"], format: 'plain', confidence: 'L', source: "https://en.wikipedia.org/wiki/Central_Bank_of_the_Comoros" }, // Comoros
  { iso: 'CG', banks: ["LCB Bank","BGFIBank Congo","Ecobank Congo","Crédit du Congo"], format: 'plain', confidence: 'M', source: "https://www.agenceecofin.com/actualites-finance/2007-140353-cemac-le-fogadac-vise-une-reserve-d-intervention-de-1-7-milliard-dici-2036" }, // Republic of the Congo
  { iso: 'CD', banks: ["Rawbank","Equity BCDC","Trust Merchant Bank (TMB)","Ecobank RDC"], format: 'plain', confidence: 'L', source: "https://en.wikipedia.org/wiki/List_of_banks_in_the_Democratic_Republic_of_the_Congo" }, // DR Congo
  { iso: 'CK', banks: ["Bank of the Cook Islands","ANZ Cook Islands","BSP Cook Islands"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/Bank_of_the_Cook_Islands" }, // Cook Islands
  { iso: 'CR', banks: ["Banco Nacional de Costa Rica","Banco de Costa Rica","BAC Credomatic","Banco Popular"], format: 'iban', ibanCountry: 'CR', ibanLength: 22, confidence: 'H', source: "https://www.bccr.fi.cr/fondo-garantia-depositos/productos-garantizados" }, // Costa Rica
  { iso: 'CI', banks: ["Société Générale Côte d'Ivoire","Société Ivoirienne de Banque (SIB)","Ecobank Côte d'Ivoire","NSIA Banque"], format: 'plain', confidence: 'M', source: "https://fr.allafrica.com/stories/202505160185.html" }, // Côte d'Ivoire
  { iso: 'HR', banks: ["Zagrebačka banka","Privredna banka Zagreb","Erste&Steiermärkische Bank","OTP banka"], format: 'iban', ibanCountry: 'HR', ibanLength: 21, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Croatia" }, // Croatia
  { iso: 'CU', banks: ["Banco Metropolitano","BANDEC","Banco Popular de Ahorro (BPA)"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Cuba" }, // Cuba
  { iso: 'CW', banks: ["Maduro & Curiel's Bank (MCB)","Banco di Caribe","RBC Royal Bank","Orco Bank"], format: 'plain', confidence: 'L', source: "https://en.wikipedia.org/wiki/Central_Bank_of_Cura%C3%A7ao_and_Sint_Maarten" }, // Curaçao
  { iso: 'CY', banks: ["Bank of Cyprus","Hellenic Bank","Eurobank Cyprus","Alpha Bank Cyprus"], format: 'iban', ibanCountry: 'CY', ibanLength: 28, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Cyprus" }, // Cyprus
  { iso: 'CZ', banks: ["Česká spořitelna","ČSOB","Komerční banka","Moneta Money Bank"], format: 'iban', ibanCountry: 'CZ', ibanLength: 24, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_the_Czech_Republic" }, // Czech Republic
  { iso: 'DK', banks: ["Danske Bank","Nordea","Jyske Bank"], format: 'iban', ibanCountry: 'DK', ibanLength: 18, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Denmark" }, // Denmark
  { iso: 'DJ', banks: ["BCIMR (Banque pour le Commerce et l'Industrie – Mer Rouge)","CAC International Bank","Salaam African Bank","East Africa Bank"], format: 'iban', ibanCountry: 'DJ', ibanLength: 27, confidence: 'M', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Djibouti" }, // Djibouti
  { iso: 'DM', banks: ["National Bank of Dominica","Republic Bank (Dominica)","CIBC Caribbean"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/Economy_of_Dominica" }, // Dominica
  { iso: 'DO', banks: ["Banreservas","Banco Popular Dominicano","Banco BHD"], format: 'iban', ibanCountry: 'DO', ibanLength: 28, confidence: 'M', source: "https://www.bancentral.gov.do/a/d/2544-fondo-de-contingencia" }, // Dominican Republic
  { iso: 'EC', banks: ["Banco Pichincha","Banco Guayaquil","Produbanco","Banco del Pacífico"], format: 'plain', confidence: 'H', source: "https://www.cosede.gob.ec/seguro-de-depositos/" }, // Ecuador
  { iso: 'EG', banks: ["National Bank of Egypt","Banque Misr","Commercial International Bank (CIB)"], format: 'iban', ibanCountry: 'EG', ibanLength: 29, confidence: 'M', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Egypt" }, // Egypt
  { iso: 'SV', banks: ["Banco Agrícola","Banco Cuscatlán","Davivienda El Salvador","BAC"], format: 'iban', ibanCountry: 'SV', ibanLength: 28, confidence: 'H', source: "https://igd.gob.sv/nuestros-servicios/" }, // El Salvador
  { iso: 'GQ', banks: ["BANGE","CCEI Bank GE","Société Générale de Banques en Guinée Équatoriale","Ecobank GE"], format: 'plain', confidence: 'L', source: "https://www.agenceecofin.com/actualites-finance/2007-140353-cemac-le-fogadac-vise-une-reserve-d-intervention-de-1-7-milliard-dici-2036" }, // Equatorial Guinea
  { iso: 'ER', banks: ["Commercial Bank of Eritrea","Housing and Commerce Bank of Eritrea"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/Bank_of_Eritrea" }, // Eritrea
  { iso: 'EE', banks: ["Swedbank","SEB","LHV","Luminor"], format: 'iban', ibanCountry: 'EE', ibanLength: 20, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Estonia" }, // Estonia
  { iso: 'SZ', banks: ["FNB Eswatini","Standard Bank Eswatini","Nedbank Eswatini","Eswatini Bank"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Eswatini" }, // Eswatini
  { iso: 'ET', banks: ["Commercial Bank of Ethiopia","Awash Bank","Dashen Bank","Bank of Abyssinia"], format: 'plain', confidence: 'H', source: "https://edif.gov.et/" }, // Ethiopia
  { iso: 'FK', banks: ["status after 2024 unsure)"], format: 'iban', ibanCountry: 'FK', ibanLength: 18, confidence: 'L', source: "https://en.wikipedia.org/wiki/Falkland_Islands" }, // Falkland Islands
  { iso: 'FO', banks: ["Betri Banki","BankNordik","Suðuroyar Sparikassi"], format: 'iban', ibanCountry: 'FO', ibanLength: 18, confidence: 'M', source: "https://en.wikipedia.org/wiki/BankNordik" }, // Faroe Islands
  { iso: 'FJ', banks: ["BSP Fiji","ANZ Fiji","Westpac Fiji","HFC Bank"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Fiji" }, // Fiji
  { iso: 'FI', banks: ["OP Financial Group","Nordea","Danske Bank","S-Pankki"], format: 'iban', ibanCountry: 'FI', ibanLength: 18, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Finland" }, // Finland
  { iso: 'GF', banks: ["BRED","Crédit Agricole Martinique-Guyane","BNP Paribas","La Banque Postale"], format: 'iban', ibanCountry: 'FR', ibanLength: 27, confidence: 'M', source: "https://en.wikipedia.org/wiki/Fonds_de_Garantie_des_D%C3%A9p%C3%B4ts_et_de_R%C3%A9solution" }, // French Guiana
  { iso: 'PF', banks: ["Banque Socredo","Banque de Tahiti","Banque de Polynésie"], format: 'iban', ibanCountry: 'FR', ibanLength: 27, confidence: 'L', source: "https://en.wikipedia.org/wiki/Banque_Socredo" }, // French Polynesia
  { iso: 'GA', banks: ["BGFIBank Gabon","BICIG","Union Gabonaise de Banque (UGB)","Orabank Gabon"], format: 'plain', confidence: 'M', source: "https://www.gabonreview.com/bhg-le-fogadac-va-indemniser-444-clients/" }, // Gabon
  { iso: 'GM', banks: ["Trust Bank","Guaranty Trust Bank Gambia","Ecobank Gambia","Standard Chartered Gambia"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/List_of_banks_in_the_Gambia" }, // Gambia
  { iso: 'GE', banks: ["TBC Bank","Bank of Georgia","Liberty Bank"], format: 'iban', ibanCountry: 'GE', ibanLength: 22, confidence: 'H', source: "https://bm.ge/en/news/deposit-insurance-limit-in-georgia-to-rise-from-gel-30000-to-gel-50000" }, // Georgia
  { iso: 'GH', banks: ["GCB Bank","Ecobank Ghana","Stanbic Bank Ghana","Absa Bank Ghana"], format: 'plain', confidence: 'M', source: "https://gdpc.gov.gh/site/deposit-insurance/deposit-coverage" }, // Ghana
  { iso: 'GI', banks: ["Gibraltar International Bank","NatWest International","Jyske Bank (Gibraltar)"], format: 'iban', ibanCountry: 'GI', ibanLength: 23, confidence: 'M', source: "https://en.wikipedia.org/wiki/Gibraltar_International_Bank" }, // Gibraltar
  { iso: 'GR', banks: ["National Bank of Greece","Piraeus Bank","Eurobank","Alpha Bank"], format: 'iban', ibanCountry: 'GR', ibanLength: 27, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Greece" }, // Greece
  { iso: 'GL', banks: ["GrønlandsBANKEN","BankNordik"], format: 'iban', ibanCountry: 'GL', ibanLength: 18, confidence: 'M', source: "https://en.wikipedia.org/wiki/Gr%C3%B8nlandsbanken" }, // Greenland
  { iso: 'GD', banks: ["Grenada Co-operative Bank","Republic Bank (Grenada)","CIBC Caribbean","ACB Grenada Bank"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/Economy_of_Grenada" }, // Grenada
  { iso: 'GP', banks: ["BRED","Crédit Agricole Guadeloupe","BNP Paribas","Caisse d'Épargne CEPAC"], format: 'iban', ibanCountry: 'FR', ibanLength: 27, confidence: 'M', source: "https://en.wikipedia.org/wiki/Fonds_de_Garantie_des_D%C3%A9p%C3%B4ts_et_de_R%C3%A9solution" }, // Guadeloupe
  { iso: 'GU', banks: ["Bank of Guam","Bank of Hawaii","BankPacific"], format: 'plain', confidence: 'M', checking: true, source: "https://en.wikipedia.org/wiki/Bank_of_Guam" }, // Guam
  { iso: 'GT', banks: ["Banco Industrial","Banrural","BAM (Banco Agromercantil)","G&T Continental"], format: 'iban', ibanCountry: 'GT', ibanLength: 28, confidence: 'H', source: "https://banguat.gob.gt/page/fondo-para-la-proteccion-del-ahorro-fopa" }, // Guatemala
  { iso: 'GG', banks: ["NatWest International","Lloyds Bank International","HSBC","Butterfield"], format: 'iban', ibanCountry: 'GB', ibanLength: 22, confidence: 'M', source: "https://en.wikipedia.org/wiki/Economy_of_Guernsey" }, // Guernsey
  { iso: 'GN', banks: ["Ecobank Guinée","Orabank Guinée","Vista Bank Guinée","BICIGUI"], format: 'plain', confidence: 'L', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Guinea" }, // Guinea
  { iso: 'GW', banks: ["Banco da África Ocidental (BAO)","Ecobank Guiné-Bissau","Orabank Guiné-Bissau"], format: 'plain', confidence: 'M', source: "https://fr.allafrica.com/stories/202505160185.html" }, // Guinea-Bissau
  { iso: 'GY', banks: ["Republic Bank (Guyana)","Demerara Bank","GBTI","Citizens Bank Guyana"], format: 'plain', confidence: 'H', source: "https://bankofguyana.org.gy/bog/deposit-insurance-corporation" }, // Guyana
  { iso: 'HT', banks: ["Unibank","Sogebank","Banque Nationale de Crédit (BNC)"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Haiti" }, // Haiti
  { iso: 'VA', banks: ["IOR (Istituto per le Opere di Religione)"], format: 'iban', ibanCountry: 'VA', ibanLength: 22, confidence: 'M', source: "https://en.wikipedia.org/wiki/Institute_for_the_Works_of_Religion" }, // Vatican City
  { iso: 'HN', banks: ["Banco Atlántida","Ficohsa","BAC Credomatic","Banpaís","Banco de Occidente"], format: 'iban', ibanCountry: 'HN', ibanLength: 28, confidence: 'H', source: "https://fosede.hn/wp-content/uploads/2025/06/Resolucion-Suma-Maxima-Asugurada-para-el-ano-2025.pdf" }, // Honduras
  { iso: 'HK', banks: ["HSBC","Bank of China (Hong Kong)","Hang Seng Bank","Standard Chartered"], format: 'plain', confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Hong_Kong" }, // Hong Kong
  { iso: 'HU', banks: ["OTP Bank","K&H Bank","MBH Bank","Raiffeisen Bank"], format: 'iban', ibanCountry: 'HU', ibanLength: 28, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Hungary" }, // Hungary
  { iso: 'IN', banks: ["State Bank of India","HDFC Bank","ICICI Bank"], format: 'plain', confidence: 'H', source: "https://www.dicgc.org.in/FAQs" }, // India
  { iso: 'ID', banks: ["Bank Rakyat Indonesia (BRI)","Bank Mandiri","Bank Central Asia (BCA)","Bank Negara Indonesia (BNI)"], format: 'plain', confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Indonesia" }, // Indonesia
  { iso: 'IR', banks: ["Bank Melli Iran","Bank Mellat","Bank Saderat Iran","Bank Tejarat"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Iran" }, // Iran
  { iso: 'IQ', banks: ["Rafidain Bank","Rasheed Bank","Trade Bank of Iraq"], format: 'iban', ibanCountry: 'IQ', ibanLength: 23, confidence: 'M', source: "https://icdi.iq/en/" }, // Iraq
  { iso: 'IM', banks: ["Isle of Man Bank (NatWest)","Barclays","HSBC","Lloyds Bank International"], format: 'iban', ibanCountry: 'GB', ibanLength: 22, confidence: 'M', source: "https://en.wikipedia.org/wiki/Isle_of_Man_Bank" }, // Isle of Man
  { iso: 'IL', banks: ["Bank Leumi","Bank Hapoalim","Israel Discount Bank","Mizrahi-Tefahot"], format: 'iban', ibanCountry: 'IL', ibanLength: 23, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Israel" }, // Israel
  { iso: 'IT', banks: ["Intesa Sanpaolo","UniCredit","Banco BPM"], format: 'iban', ibanCountry: 'IT', ibanLength: 27, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Italy" }, // Italy
  { iso: 'JM', banks: ["National Commercial Bank (NCB)","Scotiabank Jamaica","JN Bank","Sagicor Bank"], format: 'plain', confidence: 'H', source: "https://www.jdic.org/coverage/" }, // Jamaica
  { iso: 'JE', banks: ["NatWest International","HSBC","Lloyds Bank International","Barclays"], format: 'iban', ibanCountry: 'GB', ibanLength: 22, confidence: 'M', source: "https://en.wikipedia.org/wiki/Economy_of_Jersey" }, // Jersey
  { iso: 'JO', banks: ["Arab Bank","Housing Bank for Trade and Finance","Jordan Islamic Bank","Bank al Etihad"], format: 'iban', ibanCountry: 'JO', ibanLength: 30, confidence: 'H', source: "https://www.dic.gov.jo/en/modules/faq" }, // Jordan
  { iso: 'KZ', banks: ["Halyk Bank","Kaspi Bank","Bank CenterCredit","Otbasy Bank"], format: 'iban', ibanCountry: 'KZ', ibanLength: 20, confidence: 'H', source: "https://en.wikipedia.org/wiki/Kazakhstan_Deposit_Insurance_Fund" }, // Kazakhstan
  { iso: 'KE', banks: ["KCB Bank","Equity Bank","Co-operative Bank of Kenya","NCBA"], format: 'plain', confidence: 'H', source: "https://kdic.go.ke/depositors" }, // Kenya
  { iso: 'KI', banks: ["ANZ Bank (Kiribati)","Development Bank of Kiribati"], format: 'plain', confidence: 'L', source: "https://en.wikipedia.org/wiki/Economy_of_Kiribati" }, // Kiribati
  { iso: 'KP', banks: ["Foreign Trade Bank","Central Bank of the DPRK (retail savings)"], format: 'plain', confidence: 'L', source: "https://en.wikipedia.org/wiki/Central_Bank_of_the_Democratic_People%27s_Republic_of_Korea" }, // North Korea
  { iso: 'KW', banks: ["National Bank of Kuwait","Kuwait Finance House","Gulf Bank","Boubyan Bank"], format: 'iban', ibanCountry: 'KW', ibanLength: 30, confidence: 'M', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Kuwait" }, // Kuwait
  { iso: 'KG', banks: ["Mbank","Optima Bank","Demir Bank","KICB","Bakai Bank"], format: 'plain', confidence: 'H', source: "https://deposit.kg/en/home/" }, // Kyrgyzstan
  { iso: 'LA', banks: ["BCEL (Banque pour le Commerce Extérieur Lao)","Lao Development Bank","Agricultural Promotion Bank","JDB Bank"], format: 'plain', confidence: 'L', source: "https://www.bol.gov.la/en/fund" }, // Laos
  { iso: 'LV', banks: ["Swedbank","SEB","Citadele","Luminor"], format: 'iban', ibanCountry: 'LV', ibanLength: 21, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Latvia" }, // Latvia
  { iso: 'LB', banks: ["Bank Audi","BLOM Bank","Byblos Bank","Fransabank"], format: 'iban', ibanCountry: 'LB', ibanLength: 28, confidence: 'M', source: "https://www.bankliquidation.eu/deposit-guarantee-scheme-of-lebanon/" }, // Lebanon
  { iso: 'LS', banks: ["Standard Lesotho Bank","FNB Lesotho","Nedbank Lesotho","Lesotho PostBank"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/Central_Bank_of_Lesotho" }, // Lesotho
  { iso: 'LR', banks: ["Ecobank Liberia","LBDI","International Bank Liberia","Guaranty Trust Bank Liberia"], format: 'plain', confidence: 'L', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Liberia" }, // Liberia
  { iso: 'LY', banks: ["Jumhouria Bank","National Commercial Bank","Sahara Bank","Wahda Bank"], format: 'iban', ibanCountry: 'LY', ibanLength: 25, confidence: 'M', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Libya" }, // Libya
  { iso: 'LI', banks: ["LGT Bank","Liechtensteinische Landesbank (LLB)","VP Bank"], format: 'iban', ibanCountry: 'LI', ibanLength: 21, confidence: 'M', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Liechtenstein" }, // Liechtenstein
  { iso: 'LT', banks: ["Swedbank","SEB","Luminor","Šiaulių bankas"], format: 'iban', ibanCountry: 'LT', ibanLength: 20, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Lithuania" }, // Lithuania
  { iso: 'LU', banks: ["Spuerkeess (BCEE)","BGL BNP Paribas","ING Luxembourg","BIL"], format: 'iban', ibanCountry: 'LU', ibanLength: 20, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Luxembourg" }, // Luxembourg
  { iso: 'MO', banks: ["Bank of China (Macau)","Banco Nacional Ultramarino (BNU)","ICBC (Macau)","Tai Fung Bank"], format: 'plain', confidence: 'M', source: "https://www.macaubusiness.com/monetary-authorities-raise-cap-on-savings-protection/" }, // Macau
  { iso: 'MG', banks: ["BNI Madagascar","BFV-Société Générale","Bank of Africa Madagascar","BMOI"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Madagascar" }, // Madagascar
  { iso: 'MW', banks: ["National Bank of Malawi","Standard Bank Malawi","FDH Bank","NBS Bank"], format: 'plain', confidence: 'M', source: "https://dic.mw/deposit-insurance/" }, // Malawi
  { iso: 'MY', banks: ["Maybank","CIMB Bank","Public Bank","RHB Bank"], format: 'plain', confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Malaysia" }, // Malaysia
  { iso: 'MV', banks: ["Bank of Maldives","Maldives Islamic Bank","State Bank of India (Maldives)"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/Bank_of_Maldives" }, // Maldives
  { iso: 'ML', banks: ["Banque de Développement du Mali (BDM)","Banque Malienne de Solidarité (BMS)","Ecobank Mali","Bank of Africa Mali"], format: 'plain', confidence: 'M', source: "https://fr.allafrica.com/stories/202505160185.html" }, // Mali
  { iso: 'MT', banks: ["Bank of Valletta","HSBC Bank Malta","APS Bank"], format: 'iban', ibanCountry: 'MT', ibanLength: 31, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Malta" }, // Malta
  { iso: 'MH', banks: ["Bank of the Marshall Islands","Bank of Guam"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/Economy_of_the_Marshall_Islands" }, // Marshall Islands
  { iso: 'MQ', banks: ["BRED","Crédit Agricole Martinique-Guyane","BNP Paribas","Caisse d'Épargne CEPAC"], format: 'iban', ibanCountry: 'FR', ibanLength: 27, confidence: 'M', source: "https://en.wikipedia.org/wiki/Fonds_de_Garantie_des_D%C3%A9p%C3%B4ts_et_de_R%C3%A9solution" }, // Martinique
  { iso: 'MR', banks: ["BMCI","Banque Nationale de Mauritanie (BNM)","Société Générale Mauritanie"], format: 'iban', ibanCountry: 'MR', ibanLength: 27, confidence: 'L', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Mauritania" }, // Mauritania
  { iso: 'MU', banks: ["Mauritius Commercial Bank (MCB)","SBM Bank","Absa Bank Mauritius","Bank One"], format: 'iban', ibanCountry: 'MU', ibanLength: 30, confidence: 'H', source: "https://www.bom.mu/mauritius-deposit-insurance-scheme" }, // Mauritius
  { iso: 'YT', banks: ["BRED","La Banque Postale","BFC Océan Indien"], format: 'iban', ibanCountry: 'FR', ibanLength: 27, confidence: 'L', source: "https://en.wikipedia.org/wiki/Fonds_de_Garantie_des_D%C3%A9p%C3%B4ts_et_de_R%C3%A9solution" }, // Mayotte
  { iso: 'FM', banks: ["Bank of the FSM","Bank of Guam"], format: 'plain', confidence: 'M', checking: true, source: "https://en.wikipedia.org/wiki/Economy_of_the_Federated_States_of_Micronesia" }, // Micronesia
  { iso: 'MD', banks: ["maib (Moldova Agroindbank)","Moldindconbank (MICB)","Victoriabank","OTP Bank Moldova"], format: 'iban', ibanCountry: 'MD', ibanLength: 24, confidence: 'H', source: "https://fgdsb.md/en/pentru-deponenti/" }, // Moldova
  { iso: 'MC', banks: ["CFM Indosuez","Compagnie Monégasque de Banque (CMB)","BNP Paribas","Société Générale"], format: 'iban', ibanCountry: 'MC', ibanLength: 27, confidence: 'M', source: "https://en.wikipedia.org/wiki/Economy_of_Monaco" }, // Monaco
  { iso: 'MN', banks: ["Khan Bank","Golomt Bank","Trade and Development Bank (TDB)","XacBank","State Bank"], format: 'iban', ibanCountry: 'MN', ibanLength: 20, confidence: 'M', source: "https://legalinfo.mn/en/edtl/16531507785971" }, // Mongolia
  { iso: 'ME', banks: ["Crnogorska Komercijalna Banka (CKB)","NLB Banka","Erste Bank","Hipotekarna Banka"], format: 'iban', ibanCountry: 'ME', ibanLength: 22, confidence: 'H', source: "https://fzdcg.org/en/information-for-depositors/" }, // Montenegro
  { iso: 'MS', banks: ["Bank of Montserrat","RBC Royal Bank (Montserrat)"], format: 'plain', confidence: 'L', source: "https://en.wikipedia.org/wiki/Economy_of_Montserrat" }, // Montserrat
  { iso: 'MA', banks: ["Attijariwafa bank","Banque Populaire (BCP)","Bank of Africa (BMCE)","CIH Bank"], format: 'plain', confidence: 'M', source: "https://www.sgfg.ma/en/deposit-insurance-system/deposit-insurance-funds" }, // Morocco
  { iso: 'MZ', banks: ["Millennium bim","BCI","Standard Bank Mozambique","Absa Mozambique"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Mozambique" }, // Mozambique
  { iso: 'MM', banks: ["KBZ Bank","AYA Bank","CB Bank","Yoma Bank"], format: 'plain', confidence: 'L', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Myanmar" }, // Myanmar
  { iso: 'NA', banks: ["Bank Windhoek","FNB Namibia","Standard Bank Namibia","Nedbank Namibia"], format: 'plain', confidence: 'H', source: "https://www.namibian.com.na/only-10-of-namibians-have-over-n50-000-as-deposit-guarantee-doubles-to-protect-savers/" }, // Namibia
  { iso: 'NR', banks: [], format: 'plain', confidence: 'L', source: "https://en.wikipedia.org/wiki/Economy_of_Nauru" }, // Nauru
  { iso: 'NP', banks: ["Nabil Bank","Global IME Bank","Nepal Investment Mega Bank","Rastriya Banijya Bank"], format: 'plain', confidence: 'H', source: "https://dcgf.gov.np/faq" }, // Nepal
  { iso: 'NL', banks: ["ING","Rabobank","ABN AMRO"], format: 'iban', ibanCountry: 'NL', ibanLength: 18, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_the_Netherlands" }, // Netherlands
  { iso: 'NC', banks: ["Banque Calédonienne d'Investissement (BCI)","Banque de Nouvelle-Calédonie","Société Générale Calédonienne de Banque","BNP Paribas Nouvelle-Calédonie"], format: 'iban', ibanCountry: 'FR', ibanLength: 27, confidence: 'L', source: "https://en.wikipedia.org/wiki/Banque_Cal%C3%A9donienne_d%27Investissement" }, // New Caledonia
  { iso: 'NI', banks: ["BANPRO","Lafise Bancentro","BAC Nicaragua","Banco Ficohsa Nicaragua"], format: 'iban', ibanCountry: 'NI', ibanLength: 28, confidence: 'M', source: "https://fogade.gob.ni/" }, // Nicaragua
  { iso: 'NE', banks: ["Ecobank Niger","Bank of Africa Niger","Sonibank","BIA-Niger"], format: 'plain', confidence: 'M', source: "https://fr.allafrica.com/stories/202505160185.html" }, // Niger
  { iso: 'NG', banks: ["Access Bank","Zenith Bank","First Bank of Nigeria","GTBank","UBA"], format: 'plain', confidence: 'H', source: "https://ndic.gov.ng/ndic-increases-maximum-deposit-insurance-coverage-for-bank-depositors/" }, // Nigeria
  { iso: 'NU', banks: [], format: 'plain', confidence: 'L', source: "https://en.wikipedia.org/wiki/Economy_of_Niue" }, // Niue
  { iso: 'NF', banks: ["Commonwealth Bank","Bendigo Bank"], format: 'plain', confidence: 'L', source: "https://en.wikipedia.org/wiki/Norfolk_Island" }, // Norfolk Island
  { iso: 'MK', banks: ["Komercijalna Banka","Stopanska Banka","NLB Banka","Halkbank"], format: 'iban', ibanCountry: 'MK', ibanLength: 19, confidence: 'H', source: "https://fodsk.org.mk/en/how-much-insured" }, // North Macedonia
  { iso: 'MP', banks: ["Bank of Guam","BankPacific","Bank of Saipan"], format: 'plain', confidence: 'M', checking: true, source: "https://en.wikipedia.org/wiki/Bank_of_Saipan" }, // Northern Mariana Islands
  { iso: 'NO', banks: ["DNB","SpareBank 1","Nordea","Handelsbanken"], format: 'iban', ibanCountry: 'NO', ibanLength: 15, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Norway" }, // Norway
  { iso: 'OM', banks: ["Bank Muscat","National Bank of Oman","Sohar International","Bank Dhofar"], format: 'iban', ibanCountry: 'OM', ibanLength: 23, confidence: 'M', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Oman" }, // Oman
  { iso: 'PK', banks: ["HBL","National Bank of Pakistan","UBL","MCB Bank","Meezan Bank"], format: 'iban', ibanCountry: 'PK', ibanLength: 24, confidence: 'H', source: "https://arynews.tv/bank-deposit-insurance-limit-increased-in-pakistan" }, // Pakistan
  { iso: 'PW', banks: ["Bank of Guam","BankPacific","Asia Pacific Commercial Bank"], format: 'plain', confidence: 'L', checking: true, source: "https://en.wikipedia.org/wiki/Economy_of_Palau" }, // Palau
  { iso: 'PS', banks: ["Bank of Palestine","Arab Bank","Cairo Amman Bank","Quds Bank"], format: 'iban', ibanCountry: 'PS', ibanLength: 29, confidence: 'M', source: "https://www.pdic.ps/en/deposit-insurance-in-palestine/" }, // Palestine
  { iso: 'PA', banks: ["Banco General","Banistmo","Banco Nacional de Panamá","BAC Panamá"], format: 'plain', confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Panama" }, // Panama
  { iso: 'PG', banks: ["Bank South Pacific (BSP)","Kina Bank","Westpac PNG"], format: 'plain', confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Papua_New_Guinea" }, // Papua New Guinea
  { iso: 'PY', banks: ["Banco Itaú Paraguay","Banco Continental","ueno bank","Banco Nacional de Fomento"], format: 'plain', confidence: 'H', source: "https://www.bcp.gov.py/en/preguntas-frecuentes-fgd" }, // Paraguay
  { iso: 'PE', banks: ["BCP (Banco de Crédito del Perú)","BBVA Perú","Interbank","Scotiabank Perú"], format: 'plain', confidence: 'H', source: "https://fsd.org.pe/cobertura/" }, // Peru
  { iso: 'PH', banks: ["BDO Unibank","BPI","Metrobank","Landbank"], format: 'plain', confidence: 'H', source: "https://www.pdic.gov.ph/MDIC" }, // Philippines
  { iso: 'PN', banks: [], format: 'plain', confidence: 'L', source: "https://en.wikipedia.org/wiki/Pitcairn_Islands" }, // Pitcairn Islands
  { iso: 'PL', banks: ["PKO Bank Polski","Bank Pekao","Santander Bank Polska","mBank"], format: 'iban', ibanCountry: 'PL', ibanLength: 28, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Poland" }, // Poland
  { iso: 'PT', banks: ["Caixa Geral de Depósitos","Millennium bcp","Novo Banco","Santander Totta"], format: 'iban', ibanCountry: 'PT', ibanLength: 25, confidence: 'H', source: "https://www.fgd.pt/en/amounts-guaranteed" }, // Portugal
  { iso: 'PR', banks: ["Banco Popular","FirstBank","Oriental (OFG)"], format: 'plain', confidence: 'H', checking: true, source: "https://en.wikipedia.org/wiki/Banco_Popular_de_Puerto_Rico" }, // Puerto Rico
  { iso: 'QA', banks: ["QNB","Qatar Islamic Bank","Commercial Bank","Masraf Al Rayan"], format: 'iban', ibanCountry: 'QA', ibanLength: 29, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Qatar" }, // Qatar
  { iso: 'RE', banks: ["BRED","Banque de la Réunion","Crédit Agricole de la Réunion","BNP Paribas Réunion"], format: 'iban', ibanCountry: 'FR', ibanLength: 27, confidence: 'M', source: "https://en.wikipedia.org/wiki/Fonds_de_Garantie_des_D%C3%A9p%C3%B4ts_et_de_R%C3%A9solution" }, // Réunion
  { iso: 'RO', banks: ["Banca Transilvania","BCR","BRD","Raiffeisen Bank România"], format: 'iban', ibanCountry: 'RO', ibanLength: 24, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Romania" }, // Romania
  { iso: 'RU', banks: ["Sberbank","VTB","Alfa-Bank","T-Bank","Gazprombank"], format: 'plain', confidence: 'H', source: "https://en.wikipedia.org/wiki/Deposit_Insurance_Agency_of_Russia" }, // Russia
  { iso: 'RW', banks: ["Bank of Kigali","I&M Bank Rwanda","Equity Bank Rwanda","BPR Bank"], format: 'plain', confidence: 'M', source: "https://www.theeastafrican.co.ke/tea/business/uganda-reduces-bank-depositors-exposure-4597096" }, // Rwanda
  { iso: 'BL', banks: ["BRED","BNP Paribas","Crédit Agricole"], format: 'iban', ibanCountry: 'FR', ibanLength: 27, confidence: 'L', source: "https://en.wikipedia.org/wiki/Saint_Barth%C3%A9lemy" }, // Saint Barthélemy
  { iso: 'SH', banks: ["Bank of St Helena"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/Bank_of_St_Helena" }, // Saint Helena
  { iso: 'KN', banks: ["St Kitts-Nevis-Anguilla National Bank","Republic Bank (St Kitts)","CIBC Caribbean","Bank of Nevis"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/St_Kitts-Nevis-Anguilla_National_Bank" }, // Saint Kitts and Nevis
  { iso: 'LC', banks: ["Bank of Saint Lucia","1st National Bank","Republic Bank (St Lucia)","CIBC Caribbean"], format: 'iban', ibanCountry: 'LC', ibanLength: 32, confidence: 'M', source: "https://en.wikipedia.org/wiki/Economy_of_Saint_Lucia" }, // Saint Lucia
  { iso: 'MF', banks: ["BRED","BNP Paribas","Crédit Agricole"], format: 'iban', ibanCountry: 'FR', ibanLength: 27, confidence: 'L', source: "https://en.wikipedia.org/wiki/Collectivity_of_Saint_Martin" }, // Saint Martin (French)
  { iso: 'PM', banks: ["Banque de Saint-Pierre-et-Miquelon","Crédit Saint-Pierrais","La Banque Postale"], format: 'iban', ibanCountry: 'FR', ibanLength: 27, confidence: 'L', source: "https://en.wikipedia.org/wiki/Saint_Pierre_and_Miquelon" }, // Saint Pierre and Miquelon
  { iso: 'VC', banks: ["Bank of St Vincent and the Grenadines","Republic Bank (SVG)","CIBC Caribbean"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/Economy_of_Saint_Vincent_and_the_Grenadines" }, // Saint Vincent and the Grenadines
  { iso: 'WS', banks: ["ANZ Samoa","BSP Samoa","Samoa Commercial Bank","National Bank of Samoa"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/Economy_of_Samoa" }, // Samoa
  { iso: 'SM', banks: ["Banca di San Marino","Banca Agricola Commerciale (BAC)","Cassa di Risparmio della Repubblica di San Marino"], format: 'iban', ibanCountry: 'SM', ibanLength: 27, confidence: 'M', source: "https://en.wikipedia.org/wiki/Economy_of_San_Marino" }, // San Marino
  { iso: 'ST', banks: ["Banco Internacional de São Tomé e Príncipe (BISTP)","Afriland First Bank STP","Ecobank STP"], format: 'iban', ibanCountry: 'ST', ibanLength: 25, confidence: 'L', source: "https://en.wikipedia.org/wiki/Central_Bank_of_S%C3%A3o_Tom%C3%A9_and_Pr%C3%ADncipe" }, // São Tomé and Príncipe
  { iso: 'SA', banks: ["Al Rajhi Bank","Saudi National Bank (SNB)","Riyad Bank","Saudi Awwal Bank (SAB)"], format: 'iban', ibanCountry: 'SA', ibanLength: 24, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Saudi_Arabia" }, // Saudi Arabia
  { iso: 'SN', banks: ["CBAO (Attijariwafa)","Société Générale Sénégal","Ecobank Sénégal","Banque de l'Habitat du Sénégal"], format: 'plain', confidence: 'M', source: "https://fr.allafrica.com/stories/202505160185.html" }, // Senegal
  { iso: 'RS', banks: ["Banca Intesa","UniCredit Bank Srbija","OTP banka Srbija","Raiffeisen banka","AIK Banka"], format: 'iban', ibanCountry: 'RS', ibanLength: 22, confidence: 'H', source: "https://nbs.rs/export/sites/NBS_site/documents-eng/propisi/zakoni/deposit_insurance.pdf" }, // Serbia
  { iso: 'SC', banks: ["Seychelles Commercial Bank","Nouvobanq","Absa Bank Seychelles","MCB Seychelles"], format: 'iban', ibanCountry: 'SC', ibanLength: 31, confidence: 'L', source: "https://en.wikipedia.org/wiki/Central_Bank_of_Seychelles" }, // Seychelles
  { iso: 'SL', banks: ["Sierra Leone Commercial Bank","Rokel Commercial Bank","Ecobank Sierra Leone","Guaranty Trust Bank SL"], format: 'plain', confidence: 'M', source: "https://sierralii.gov.sl/akn/sl/act/2023/1/eng@2023-01-19" }, // Sierra Leone
  { iso: 'SG', banks: ["DBS","OCBC","UOB"], format: 'plain', confidence: 'H', source: "https://www.moneysense.gov.sg/understanding-deposit-insurance/" }, // Singapore
  { iso: 'SX', banks: ["Windward Islands Bank (WIB)","RBC Royal Bank","Republic Bank (Sint Maarten)"], format: 'plain', confidence: 'L', source: "https://en.wikipedia.org/wiki/Economy_of_Sint_Maarten" }, // Sint Maarten
  { iso: 'SK', banks: ["Slovenská sporiteľňa","VÚB","Tatra banka","ČSOB"], format: 'iban', ibanCountry: 'SK', ibanLength: 24, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Slovakia" }, // Slovakia
  { iso: 'SI', banks: ["NLB","OTP banka","Intesa Sanpaolo Bank","UniCredit Banka Slovenija"], format: 'iban', ibanCountry: 'SI', ibanLength: 19, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Slovenia" }, // Slovenia
  { iso: 'SB', banks: ["BSP Solomon Islands","ANZ Solomon Islands","Pan Oceanic Bank"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/Central_Bank_of_Solomon_Islands" }, // Solomon Islands
  { iso: 'SO', banks: ["Premier Bank","Salaam Somali Bank","IBS Bank","Dahabshil Bank","Amal Bank"], format: 'iban', ibanCountry: 'SO', ibanLength: 23, confidence: 'M', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Somalia" }, // Somalia
  { iso: 'ZA', banks: ["Capitec","Standard Bank","FNB","Absa","Nedbank"], format: 'plain', confidence: 'H', source: "https://www.resbank.co.za/en/home/what-we-do/Deposit-insurance" }, // South Africa
  { iso: 'SS', banks: ["KCB South Sudan","Equity Bank South Sudan","Ivory Bank","Co-operative Bank of South Sudan"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/List_of_banks_in_South_Sudan" }, // South Sudan
  { iso: 'LK', banks: ["Bank of Ceylon","People's Bank","Commercial Bank of Ceylon","Hatton National Bank","Sampath Bank"], format: 'plain', confidence: 'H', source: "https://www.cbsl.gov.lk/en/faq/deposit-insurance" }, // Sri Lanka
  { iso: 'SD', banks: ["Bank of Khartoum","Faisal Islamic Bank","Omdurman National Bank"], format: 'iban', ibanCountry: 'SD', ibanLength: 18, confidence: 'L', source: "http://bdsf.sd/English/pdsf_depo.html" }, // Sudan
  { iso: 'SR', banks: ["De Surinaamsche Bank (DSB)","Hakrinbank","Finabank","Republic Bank Suriname"], format: 'plain', confidence: 'L', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Suriname" }, // Suriname
  { iso: 'SJ', banks: ["SpareBank 1 Nord-Norge (Longyearbyen)"], format: 'iban', ibanCountry: 'NO', ibanLength: 15, confidence: 'M', source: "https://en.wikipedia.org/wiki/Longyearbyen" }, // Svalbard and Jan Mayen
  { iso: 'SE', banks: ["Swedbank","Handelsbanken","SEB","Nordea"], format: 'iban', ibanCountry: 'SE', ibanLength: 24, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Sweden" }, // Sweden
  { iso: 'CH', banks: ["UBS","Raiffeisen","PostFinance","Zürcher Kantonalbank"], format: 'iban', ibanCountry: 'CH', ibanLength: 21, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Switzerland" }, // Switzerland
  { iso: 'SY', banks: ["Commercial Bank of Syria","Real Estate Bank","Syria International Islamic Bank","Bank of Syria and Overseas"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Syria" }, // Syria
  { iso: 'TW', banks: ["Bank of Taiwan","CTBC Bank","Cathay United Bank","Chunghwa Post","Land Bank of Taiwan"], format: 'plain', confidence: 'H', source: "https://www.cdic.gov.tw/main_en/faq.aspx" }, // Taiwan
  { iso: 'TJ', banks: ["Amonatbonk","Eskhata Bank","Spitamen Bank","Alif Bank"], format: 'plain', confidence: 'M', source: "https://dif.tj/en/faqs/" }, // Tajikistan
  { iso: 'TZ', banks: ["CRDB Bank","NMB Bank","NBC Bank","Exim Bank Tanzania"], format: 'plain', confidence: 'H', source: "https://www.theeastafrican.co.ke/tea/business-tech/dar-raises-deposits-to-3-000-in-bid-to-infuse-confidence-5199530" }, // Tanzania
  { iso: 'TH', banks: ["Bangkok Bank","Kasikornbank","Siam Commercial Bank","Krungthai Bank"], format: 'plain', confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Thailand" }, // Thailand
  { iso: 'TL', banks: ["BNCTL (Banco Nacional de Comércio de Timor-Leste)","BNU Timor","Bank Mandiri"], format: 'iban', ibanCountry: 'TL', ibanLength: 23, confidence: 'M', source: "https://en.wikipedia.org/wiki/Central_Bank_of_Timor-Leste" }, // Timor-Leste
  { iso: 'TG', banks: ["Ecobank Togo","Orabank Togo","BTCI","Union Togolaise de Banque (UTB)"], format: 'plain', confidence: 'M', source: "https://fr.allafrica.com/stories/202505160185.html" }, // Togo
  { iso: 'TK', banks: [], format: 'plain', confidence: 'L', source: "https://en.wikipedia.org/wiki/Tokelau" }, // Tokelau
  { iso: 'TO', banks: ["BSP Tonga","ANZ Tonga","Tonga Development Bank"], format: 'plain', confidence: 'L', source: "https://en.wikipedia.org/wiki/National_Reserve_Bank_of_Tonga" }, // Tonga
  { iso: 'TT', banks: ["Republic Bank","First Citizens","Scotiabank Trinidad and Tobago","RBC Royal Bank"], format: 'plain', confidence: 'H', source: "https://dictt.org/deposit-insurance/" }, // Trinidad and Tobago
  { iso: 'TN', banks: ["BIAT","Société Tunisienne de Banque (STB)","Banque Nationale Agricole (BNA)","Attijari Bank Tunisie"], format: 'plain', confidence: 'H', source: "https://www.ilboursa.com/marches/fonds-de-garantie-des-depots-bancaires%C2%A0-la-limite-dindemnisation-fixee-a-60000-dinars_11041" }, // Tunisia
  { iso: 'TR', banks: ["Ziraat Bankası","İş Bankası","Garanti BBVA","Akbank","VakıfBank"], format: 'iban', ibanCountry: 'TR', ibanLength: 26, confidence: 'H', source: "https://www.tmsf.org.tr/en/Tmsf/Mevduat/mevduat.kapsam.en" }, // Turkey
  { iso: 'TM', banks: ["Türkmenbaşy Bank","Daýhanbank","Halkbank (Turkmenistan)","Senagat Bank"], format: 'plain', confidence: 'L', source: "https://en.wikipedia.org/wiki/Central_Bank_of_Turkmenistan" }, // Turkmenistan
  { iso: 'TC', banks: ["CIBC Caribbean","RBC Royal Bank","Scotiabank"], format: 'plain', confidence: 'L', source: "https://en.wikipedia.org/wiki/Economy_of_the_Turks_and_Caicos_Islands" }, // Turks and Caicos Islands
  { iso: 'TV', banks: ["National Bank of Tuvalu"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/National_Bank_of_Tuvalu" }, // Tuvalu
  { iso: 'UG', banks: ["Stanbic Bank Uganda","Centenary Bank","Absa Bank Uganda","dfcu Bank"], format: 'plain', confidence: 'H', source: "https://en.wikipedia.org/wiki/Uganda_Deposit_Protection_Fund" }, // Uganda
  { iso: 'UA', banks: ["PrivatBank","Oschadbank","monobank (Universal Bank)","Raiffeisen Bank"], format: 'iban', ibanCountry: 'UA', ibanLength: 29, confidence: 'H', source: "https://www.pib.ua/en/private/depozity/fgvfo/" }, // Ukraine
  { iso: 'AE', banks: ["Emirates NBD","First Abu Dhabi Bank","Abu Dhabi Commercial Bank","Dubai Islamic Bank"], format: 'iban', ibanCountry: 'AE', ibanLength: 23, confidence: 'H', source: "https://en.wikipedia.org/wiki/List_of_banks_in_the_United_Arab_Emirates" }, // United Arab Emirates
  { iso: 'UY', banks: ["BROU (Banco República)","Santander Uruguay","Itaú Uruguay","BBVA Uruguay"], format: 'plain', confidence: 'H', source: "https://www.copab.org.uy/innovaportal/v/1197/1/web/acceso-a-preguntas-frecuentes.html" }, // Uruguay
  { iso: 'UZ', banks: ["National Bank of Uzbekistan (NBU)","Kapitalbank","Hamkorbank","SQB (Uzpromstroybank)","TBC Bank Uzbekistan"], format: 'plain', confidence: 'M', source: "https://asiaplus.news/en/2025/02/20/state-protection-limit-for-bank-deposits-set-in-uzbekistan-is-4-8-times-higher-than-that-set-in-tajikistan/" }, // Uzbekistan
  { iso: 'VU', banks: ["National Bank of Vanuatu","BSP Vanuatu","BRED Bank Vanuatu"], format: 'plain', confidence: 'M', source: "https://en.wikipedia.org/wiki/Reserve_Bank_of_Vanuatu" }, // Vanuatu
  { iso: 'VE', banks: ["Banco de Venezuela","Banesco","Mercantil Banco","BBVA Provincial","Banco Nacional de Crédito (BNC)"], format: 'plain', confidence: 'M', source: "https://www.fogade.gob.ve/inicio/" }, // Venezuela
  { iso: 'VN', banks: ["Vietcombank","BIDV","VietinBank","Agribank","Techcombank"], format: 'plain', confidence: 'H', source: "https://www.div.gov.vn/deposit-insurance-coverage-limit-increased-to-125-million-vnd-en" }, // Vietnam
  { iso: 'VI', banks: ["Banco Popular","FirstBank","Oriental Bank"], format: 'plain', confidence: 'M', checking: true, source: "https://en.wikipedia.org/wiki/Economy_of_the_United_States_Virgin_Islands" }, // US Virgin Islands
  { iso: 'WF', banks: ["Banque de Wallis-et-Futuna (BNP Paribas)"], format: 'iban', ibanCountry: 'FR', ibanLength: 27, confidence: 'L', source: "https://en.wikipedia.org/wiki/Wallis_and_Futuna" }, // Wallis and Futuna
  { iso: 'EH', banks: ["Attijariwafa bank","Banque Populaire","Bank of Africa (Moroccan-administered area)"], format: 'plain', confidence: 'L', source: "https://en.wikipedia.org/wiki/Laayoune" }, // Western Sahara
  { iso: 'YE', banks: ["Tadhamon Bank","Yemen Kuwait Bank","Al-Kuraimi Islamic Microfinance Bank","National Bank of Yemen"], format: 'iban', ibanCountry: 'YE', ibanLength: 30, confidence: 'M', source: "https://en.wikipedia.org/wiki/List_of_banks_in_Yemen" }, // Yemen
  { iso: 'ZM', banks: ["Zanaco","Stanbic Bank Zambia","Absa Bank Zambia","FNB Zambia"], format: 'plain', confidence: 'M', source: "https://www.zambiamonitor.com/what-depositors-will-receive-if-banks-fail-bank-of-zambia/" }, // Zambia
  { iso: 'ZW', banks: ["CBZ Bank","Stanbic Bank Zimbabwe","FBC Bank","CABS","Steward Bank"], format: 'plain', confidence: 'M', source: "https://www.newsday.co.zw/business/article/200057225/dpc-triples-bank-deposit-cover-to-us3000-quadruples-microfinance-protection-to-us2000" }, // Zimbabwe
  { iso: 'XK', banks: ["ProCredit Bank Kosovo","Raiffeisen Bank Kosovo","TEB","NLB Banka Prishtina"], format: 'iban', ibanCountry: 'XK', ibanLength: 20, confidence: 'M', source: "https://fsdk.org/en/difk-publishes-its-strategic-plan-for-period-2025-2029/" }, // Kosovo
];

const slug = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** The rows as the bank tables take them, in each country's own money. */
export function worldBanking(currencyOf: (iso: string) => string): CountryBanking[] {
  return ROWS.filter((row) => row.banks.length > 0).map((row) => {
    const currency = currencyOf(row.iso);
    return {
      iso: row.iso,
      banks: row.banks.map((name) => ({
        id: `${row.iso.toLowerCase()}-${slug(name)}`,
        name,
        iso: row.iso,
        currency,
        format: row.format,
        code: '',
        ibanCountry: row.ibanCountry,
        ibanLength: row.ibanLength,
        current: { name: row.checking ? 'Checking Account' : 'Current Account', source: `no fees or rates were researched for this bank, so the game charges none and pays none; the bank was found at ${row.source}`, asOf: '2026-09-25' },
        savings: { name: 'Savings Account', source: `no fees or rates were researched for this bank, so the game charges none and pays none; the bank was found at ${row.source}`, asOf: '2026-09-25' },
        confidence: row.confidence,
      })),
    };
  });
}
