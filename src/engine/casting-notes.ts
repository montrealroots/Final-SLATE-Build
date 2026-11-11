// What casting a performer in a part brings with it, in words for the casting page (November 11, 2026, moved here from
// hiring.ts so it loads with that page, not at startup): the ages they play against the part's, the skills and
// languages the part needs, and for a child, the rules of the place the production is based (minors.ts).
import { songUses } from './songs';
import { ageInDays, bandFor, projectRules, supervisionFor, type Minor } from './minors';
import { playingAgeAt, roleLabel, type Person } from './people';
import { approvedCharacters, approvedScenes } from './projects';
import { currentZone } from './state';
import { storyAge, storyAgeWords } from './story-age';
import { dateKey } from './time';
import type { GameState, Project } from './types';

const YEAR = 365.25;

/** The rules' names and what they call things, in words for the casting and Cast pages (minors.ts has the numbers). */
export const RULE_WORDS: Record<Minor['rules']['id'], { name: string; licence: string; night: string; setAside: string }> = {
  'GB-ENG': { name: "England's child performance regulations", licence: 'a child performance licence from the local authority', night: "the licensing authority's permission for night work", setAside: '' },
  'US-CA': { name: "California's rules for minors in entertainment", licence: 'an Entertainment Work Permit for the minor and a permit to employ minors', night: "the Labor Commissioner's approval for night work", setAside: 'a Coogan trust account (California Family Code §6752)' },
  'US-NY': { name: "New York's child performer regulations", licence: "a Child Performer Permit and the employer's notice of use", night: 'a variance for night work', setAside: 'a child performer trust account (New York Part 186)' },
};

/** In words: "a 10-year-old may work 5 hours a day (7 with no school) under California's rules". */
export function hoursWords(m: Minor): string {
  const work = (h: number) => (h < 1 ? `${Math.round(h * 60)} minutes` : `${h} ${h === 1 ? 'hour' : 'hours'}`);
  const more = m.band.workNoSchool > m.band.work ? ` (${work(m.band.workNoSchool)} on a day without school)` : '';
  return `may work ${work(m.band.work)} a day${more}, and be at work ${m.band.atPlace} hours, under ${RULE_WORDS[m.rules.id].name}`;
}

/** An age in words: "6 months old", "10". */
export function ageWords(ageDays: number): string {
  if (ageDays < 365) return `${Math.max(0, Math.floor(ageDays / 30.44))} months old`;
  return String(Math.floor(ageDays / YEAR));
}

/** Casting fit notes: playing age, needed skills and dialogue language. Never identity-based. */
export function fitNotes(state: GameState, p: Project, person: Person | 'player', characterId: string): string[] {
  const out: string[] = [];
  const c = approvedCharacters(p).find((x) => x.id === characterId);
  if (!c) return out;
  const scenes = approvedScenes(p).filter((s) => s.participants.includes(characterId));
  // A song performed in their scenes, by them or by nobody named yet (songs.ts).
  const needsSinging = songUses(p, scenes).some((x) => x.use.placement === 'performed' && (!x.song.performers.length || x.song.performers.some((c) => c.characterId === characterId)));
  const needsDance = scenes.some((s) => s.dance);
  const langs = c.languages.length ? c.languages : [p.axes.dialogueLanguages[0]];
  if (person === 'player') {
    const known = [state.character.mainLanguage, ...state.character.languages.filter((l) => l.proficiency !== 'Basic').map((l) => l.code)];
    const missing = langs.filter((l) => !known.includes(l));
    if (missing.length) out.push("You'll need language coaching for this role's dialogue.");
    return out;
  }
  // The ages they play today, which move as they age (people.ts); the range fixed at your story's start was read until
  // November 10, 2026. The part's age is an age or a range (story-age.ts); until November 11, 2026 only a leading
  // number was read, so "30s" read as 30.
  const today = dateKey(state.now, currentZone(state));
  const want = storyAge(c.ageInStory);
  const plays = playingAgeAt(person, today);
  if (plays && want && (want.max < plays[0] || want.min > plays[1])) {
    out.push(`Usually plays ages ${plays[0]} to ${plays[1]}; the part is ${storyAgeWords(want)}.`);
  }
  // A child under the shoot's rules (minors.ts): what casting them brings with it.
  const { rules, standIn } = projectRules(p);
  const ageDays = ageInDays(person.born, today);
  const band = bandFor(rules, ageDays);
  if (band) {
    const kid: Minor = { characterId, name: person.name, personId: person.id, ageDays, band, rules };
    const who = supervisionFor([kid], true).map((w) => roleLabel(w.roleId).toLowerCase());
    out.push(`${person.name} is ${ageWords(ageDays)}, a child: they ${hoursWords(kid)}. ${who.length ? `They need ${who.join(' and ')} with them, and` : 'They need'} ${RULE_WORDS[rules.id].licence} before their first day (${rules.licence.leadDays === 1 ? 'a day' : `${rules.licence.leadDays} days`} to arrange).${rules.setAside ? ` ${rules.setAside.percent}% of their pay goes to ${RULE_WORDS[rules.id].setAside}.` : ''}${standIn ? ` ${standIn}` : ''}`);
  } else if (rules.minAgeDays && ageDays < rules.minAgeDays) {
    out.push(`${person.name} is too young to work: ${RULE_WORDS[rules.id].name} allow no one under ${rules.minAgeDays} days old.`);
  }
  if (needsSinging && !person.skills.includes('singing')) out.push('Not trained in singing, which this role needs.');
  if (needsDance && !person.skills.includes('dance')) out.push('Not trained in dance, which this role needs.');
  if (langs.some((l) => !person.languages.includes(l))) out.push('Will need language coaching for this role\'s dialogue.');
  return out;
}
