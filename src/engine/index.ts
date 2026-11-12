// Importing the engine registers every event handler exactly once.
export * from './types';
export * from './state';
export * from './time';
export * from './projects';
export * from './genres';
export * from './budget';
export * from './people';
export * from './production';
export * from './hiring';
export * from './finish';
export * from './episode-releases';
export * from './awards';
export * from './rulebooks';
export * from './weather';
export * from './holidays';
export * from './save';
export * from './clock';
export * from './documentary';
export * from './mocap';
export * from './unscripted';
export * from './finance';
export * from './observances';
export * from './script-effects';
// The cost estimate (estimate.ts) is imported where it's shown, with the plan pages, not at startup (November 11, 2026).
export * from './identity';
export * from './structure';
export * from './research';
export * from './continuation';
export * from './negotiation';
export * from './auditions';
export * from './distribution';
export * from './relationships';
export * from './opportunities';
export * from './representation';
// The living world's engine (industry.ts) loads with the film catalog, not at startup: App.tsx imports it when the world
// file arrives, and state.ts holds its decisions until then.
export * from './mandates';
export * from './personal';
export * from './equipment';
export * from './gear-catalog';
