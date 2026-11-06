import { emptyDraft } from '../src/engine/state';
import type { CreationDraft } from '../src/engine/types';

export function draft(over: Partial<CreationDraft> = {}): CreationDraft {
  return {
    ...emptyDraft(),
    name: 'Ada Okafor-Lindqvist',
    pronouns: 'she',
    actingTitle: 'Actress',
    birthDate: '1996-02-29',
    birthplaceId: 'ng-lagos',
    heritages: [{ id: 'Yoruba', label: 'Yoruba', custom: false }, { id: 'Swedish', label: 'Swedish', custom: false }],
    mainLanguage: 'en',
    languages: [{ code: 'yo', proficiency: 'Conversational' }, { code: 'sv', proficiency: 'Basic' }],
    startPlaceId: 'gb-london',
    startDate: '2026-03-27',
    startTime: '08:00',
    ...over,
  };
}
