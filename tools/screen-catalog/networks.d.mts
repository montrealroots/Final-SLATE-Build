// Types for networks.mjs, for the tests.
export declare const KINDS: { streaming: string[]; cable: string[] };
export declare function kindOf(classes: string[]): 'cable' | 'streaming' | null;
export declare function site(u: string | null): string | null;
export declare function dated(t: string | null, precision: string | number | null): string | null;
