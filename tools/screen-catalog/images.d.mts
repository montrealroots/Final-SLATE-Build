export const IMAGE_BASE: string;
export const TIERS: Record<'small' | 'medium', { profile: string; poster: string }>;
export const ABOUT_BYTES: Record<string, number>;
export const RIGHTS: string;
export function dimensions(buf: Buffer): { w: number; h: number } | null;
export function plan(o: { companies: string[]; people?: number; manifest: { titles: { key: string; companies: number[] }[] }; read?: (path: string) => { body: unknown } | null }): {
  titles: number; missing: number; posters: Map<string, { path: string; loc: string | null }>; profiles: Map<string, { path: string; loc: string | null }>; withoutPicture: { titles: number; people: number };
};
