// The housing rules on their own (from November 20, 2026). Until then they were exported by market.ts, so the rent, buy,
// let, build and living engines pulled the market's per-file lists of data addresses into every game's start: in the dev
// server that was about 440 requests a load. The market now loads with the Homes page only. This was done to stop
// e2e/characters.spec.ts crashing with net::ERR_INSUFFICIENT_RESOURCES, and it was believed then that the requests ran
// Chromium out of request capacity. Chromium's network log later showed at most 244 alive, never its 2,700 cap: the
// crash was shared memory on a nearly full /tmp (playwright.config.ts chromiumLaunch). The cut stands for its own sake.
import RULES from '../../data/homes/rules.json';
import type { ScopedRule } from './model';

export const HOME_RULES = RULES as unknown as ScopedRule[];
