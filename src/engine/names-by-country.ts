// Names for the people the game invents on a studio's picture (your-films.ts castPicture), by the studio's country, from
// November 22, 2026. Until then every invented actor, part and crew member took a name from one short, mostly English
// list, so a Toho picture's parts were called Grace and Walter. These are common given names and surnames in each
// language, the game's own lists (not anyone's real name as a credit); a country without a list keeps the old one.

export interface NamePool { women: readonly string[]; men: readonly string[]; last: readonly string[] }

const JAPANESE: NamePool = {
  women: ['Yuki', 'Aiko', 'Haruka', 'Misaki', 'Sakura', 'Yui', 'Nanami', 'Rina', 'Ayaka', 'Mio', 'Emi', 'Kaori'],
  men: ['Kenji', 'Kaito', 'Haruto', 'Ren', 'Sota', 'Takumi', 'Daiki', 'Yuto', 'Hiroshi', 'Shota', 'Ryo', 'Kazuki'],
  last: ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Mori', 'Ishikawa', 'Fujita', 'Saito'],
};
const KOREAN: NamePool = {
  women: ['Seo-yeon', 'Ji-woo', 'Min-ji', 'Ha-eun', 'Soo-ah', 'Ye-jin', 'Da-eun', 'Yu-na', 'Eun-ji', 'Hye-won'],
  men: ['Min-jun', 'Seo-jun', 'Ji-ho', 'Hyun-woo', 'Joon-young', 'Do-yun', 'Jae-won', 'Sung-min', 'Tae-hyun', 'Woo-jin'],
  last: ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim', 'Han', 'Oh', 'Seo', 'Shin', 'Kwon', 'Ahn'],
};
const CHINESE: NamePool = {
  women: ['Mei', 'Xiu Ying', 'Li Na', 'Jing', 'Yan', 'Hui', 'Xin Yi', 'Ling', 'Wen', 'Fang'],
  men: ['Wei', 'Jun', 'Hao', 'Ming', 'Lei', 'Jian', 'Tao', 'Yong', 'Zhi Qiang', 'Chen Long'],
  last: ['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou', 'Xu', 'Sun', 'Ma', 'Zhu', 'Hu', 'Lin'],
};
const INDIAN: NamePool = {
  women: ['Priya', 'Ananya', 'Diya', 'Kavya', 'Meera', 'Pooja', 'Riya', 'Sneha', 'Aisha', 'Lakshmi', 'Nisha', 'Tara'],
  men: ['Arjun', 'Rahul', 'Vikram', 'Rohan', 'Aditya', 'Karan', 'Sanjay', 'Ravi', 'Siddharth', 'Aryan', 'Kabir', 'Naveen'],
  last: ['Sharma', 'Patel', 'Singh', 'Kumar', 'Gupta', 'Reddy', 'Iyer', 'Nair', 'Mehta', 'Rao', 'Das', 'Joshi', 'Kapoor', 'Malhotra', 'Bose', 'Menon'],
};
const SPANISH: NamePool = {
  women: ['Lucía', 'María', 'Carmen', 'Sofía', 'Valeria', 'Paula', 'Elena', 'Isabel', 'Marta', 'Camila', 'Ana', 'Rocío'],
  men: ['Javier', 'Pablo', 'Diego', 'Alejandro', 'Mateo', 'Carlos', 'Miguel', 'Andrés', 'Sergio', 'Daniel', 'Joaquín', 'Raúl'],
  last: ['García', 'Fernández', 'González', 'Rodríguez', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Díaz', 'Torres', 'Ruiz', 'Navarro', 'Morales', 'Ortiz', 'Herrera'],
};
const PORTUGUESE: NamePool = {
  women: ['Ana', 'Beatriz', 'Mariana', 'Juliana', 'Camila', 'Larissa', 'Fernanda', 'Gabriela', 'Inês', 'Rita'],
  men: ['João', 'Pedro', 'Lucas', 'Gabriel', 'Rafael', 'Thiago', 'Bruno', 'Felipe', 'Tiago', 'Rodrigo'],
  last: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Rodrigues', 'Almeida', 'Nascimento', 'Lima', 'Carvalho', 'Ferreira', 'Gomes', 'Martins'],
};
const ITALIAN: NamePool = {
  women: ['Giulia', 'Chiara', 'Francesca', 'Sofia', 'Martina', 'Alessia', 'Elena', 'Valentina', 'Sara', 'Federica'],
  men: ['Marco', 'Luca', 'Alessandro', 'Matteo', 'Lorenzo', 'Andrea', 'Davide', 'Giuseppe', 'Francesco', 'Riccardo'],
  last: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca'],
};
const FRENCH: NamePool = {
  women: ['Camille', 'Léa', 'Manon', 'Chloé', 'Inès', 'Juliette', 'Margaux', 'Sophie', 'Claire', 'Élodie'],
  men: ['Louis', 'Hugo', 'Théo', 'Antoine', 'Julien', 'Mathieu', 'Nicolas', 'Paul', 'Pierre', 'Lucas'],
  last: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel'],
};
const GERMAN: NamePool = {
  women: ['Anna', 'Lena', 'Hannah', 'Lea', 'Laura', 'Julia', 'Sophie', 'Katharina', 'Marie', 'Johanna'],
  men: ['Lukas', 'Jonas', 'Felix', 'Maximilian', 'Paul', 'Jan', 'Tobias', 'Niklas', 'Florian', 'Moritz'],
  last: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Koch', 'Richter', 'Wolf', 'Neumann'],
};
const NIGERIAN: NamePool = {
  women: ['Chioma', 'Ngozi', 'Adaeze', 'Funmilayo', 'Aisha', 'Amaka', 'Kemi', 'Zainab', 'Ifeoma', 'Folake'],
  men: ['Chinedu', 'Emeka', 'Tunde', 'Olumide', 'Ibrahim', 'Chidi', 'Femi', 'Segun', 'Obinna', 'Musa'],
  last: ['Okafor', 'Adeyemi', 'Okonkwo', 'Balogun', 'Eze', 'Bello', 'Nwosu', 'Abubakar', 'Adebayo', 'Okeke', 'Olawale', 'Ibekwe'],
};

const BY_COUNTRY: Record<string, NamePool> = {
  JP: JAPANESE, KR: KOREAN, CN: CHINESE, TW: CHINESE, HK: CHINESE, IN: INDIAN,
  ES: SPANISH, MX: SPANISH, AR: SPANISH, CO: SPANISH, CL: SPANISH, PE: SPANISH,
  BR: PORTUGUESE, PT: PORTUGUESE, IT: ITALIAN, FR: FRENCH, DE: GERMAN, AT: GERMAN, NG: NIGERIAN,
};

/** The names for a studio's country, if the game has a list for it. */
export const namesFor = (country: string | undefined): NamePool | undefined => (country ? BY_COUNTRY[country] : undefined);
