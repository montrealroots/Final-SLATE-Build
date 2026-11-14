// The adapter for 1221's systems/permission.ts `scheduleUsStatus` (ported November 14, 2026). In 1221 it watched a
// student's US status (F-1 and OPT days without work). SLATE has no student status, so it schedules nothing: a
// recorded deviation (docs/v9/PARITY.md).
import type { Simulation } from '../core/simulation';
import type { Person } from '../domain/model';

export function scheduleUsStatus(_sim: Simulation, _person: Person): void {}
