// The housing rules on their own (from November 20, 2026). Until then they were exported by market.ts, so the rent, buy,
// let, build and living engines pulled the market's per-file lists of data addresses into every game's start: in the dev
// server that was about 440 requests a load, which ran Chromium out of request capacity on a loaded machine
// (e2e/characters.spec.ts crashed with net::ERR_INSUFFICIENT_RESOURCES). The market now loads with the Homes page only.
import RULES from '../../data/homes/rules.json';
import type { ScopedRule } from './model';

export const HOME_RULES = RULES as unknown as ScopedRule[];
