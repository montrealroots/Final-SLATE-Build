// The part of 1221's world/bootstrap.ts the ported tests name (1221 at d6eba5d; ported November 14, 2026). 1221's
// `newLifeConfig` began every life at its drama school in New Haven with a wealthy family; the school is excluded (the
// owner's command keeps Yale-only assumptions out), so here it is a life in New Haven on the school's first day, with the
// same family money, which is what the bank tests read of it.
import { defaultConfig, type BankWorldConfig, type StartingWealth } from '../index';

export type NewSaveConfig = BankWorldConfig;
export type { StartingWealth };

const NEW_HAVEN = 'us-ct-newhaven';

export const withFamily = (config: NewSaveConfig, wealth: StartingWealth): NewSaveConfig => ({ ...config, wealth });

export function newLifeConfig(): NewSaveConfig {
  return withFamily({ ...defaultConfig(), homeRegionId: NEW_HAVEN, startLocationId: NEW_HAVEN, livesWhereBorn: true, birthYear: 2002, startYear: 2026, startMonth: 8, startDay: 24 }, 'wealthy');
}

export function newLifeFrom(draft: Partial<NewSaveConfig>): NewSaveConfig {
  return { ...newLifeConfig(), ...draft } as NewSaveConfig;
}
