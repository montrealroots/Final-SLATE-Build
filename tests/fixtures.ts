import { emptyDraft, latestBirthDate } from '../src/engine/state';
import type { CreationDraft } from '../src/engine/types';

/**
 * A birth date that makes you 19 on this starting date, a few months before it, so a start is never a birthday unless a
 * test says so. You start at exactly 19 from November 14, 2026; before then fixtures were older (1996 here).
 */
export function born19(startDate: string): string {
  const latest = latestBirthDate(startDate)!;
  const [y, m] = latest.split('-').map(Number);
  return m > 3 ? `${y}-${String(m - 3).padStart(2, '0')}-14` : `${y - 1}-${String(m + 9).padStart(2, '0')}-14`;
}

export function draft(over: Partial<CreationDraft> = {}): CreationDraft {
  return {
    ...emptyDraft(),
    birthDate: born19(over.startDate ?? '2026-03-27'),
    firstName: 'Ada',
    lastName: 'Okafor-Lindqvist',
    pronouns: 'she',
    actingTitle: 'Actress',
    birthplaceId: 'ng-lagos',
    heritages: [{ id: 'Yoruba', label: 'Yoruba', custom: false }, { id: 'Swedish', label: 'Swedish', custom: false }],
    // British too, so a London life pays for no work visa (from November 14, 2026); tests about papers say their own.
    nationalities: ['NG', 'SE', 'GB'],
    mainLanguage: 'en',
    languages: [{ code: 'yo', proficiency: 'Conversational' }, { code: 'sv', proficiency: 'Basic' }],
    startPlaceId: 'gb-london',
    startDate: '2026-03-27',
    startTime: '08:00',
    ...over,
  };
}
