// What the store loads when a game is opened, begun, imported or exported, rather than at startup (November 11, 2026,
// docs/PERFORMANCE.md): the whole engine (importing it registers every event handler) and the holiday rules' loader.
// The start screen lists saves with the light storage modules alone (engine/save-store.ts, engine/vault.ts).
export * from '../engine';
export { loadWorldHolidays, worldHolidaysLoaded } from '../world/holidays/holidays';
