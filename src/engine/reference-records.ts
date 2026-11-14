// Reference records from the owner's v7 package that the game reads but doesn't sell or book (CAM01-CAM03, AW11; from
// November 13, 2026). A camera's capture is decided by its recording mode, not its model name: a mode is feasible only
// if the manufacturer lists one that covers it, and the largest frame and the highest rate are never combined into a
// mode the camera doesn't have. A composer credit links a real person to a work, and says nothing about their fee,
// their availability or the rights to any recording. Neither record carries a price, and no price is invented.
import cameras from '../data/camera-reference.json';
import composers from '../data/composer-credits.json';

export interface CameraMode { width: number; height: number; max_fps: number }
export interface CameraRecord { id: string; name: string; sensor: string; modes?: CameraMode[]; max_4k_fps?: number; price: null; source: { url: string; title: string; checked: string } }
export const CAMERAS = (cameras as unknown as { cameras: CameraRecord[] }).cameras;
export interface ComposerCredit { name: string; work: string; credit: string; fee: null; availability: null; source: { url: string; title: string; checked: string } }
export const COMPOSER_CREDITS = (composers as unknown as { credits: ComposerCredit[] }).credits;

/** Whether a camera can capture at this size and rate: yes, no, or unknown where its modes aren't recorded. */
export function captureFeasible(c: CameraRecord, want: CameraMode): 'yes' | 'no' | 'unknown' {
  const modes: CameraMode[] = [...(c.modes ?? []), ...(c.max_4k_fps ? [{ width: 3840, height: 2160, max_fps: c.max_4k_fps }] : [])];
  if (!modes.length) return 'unknown';
  if (modes.some((m) => m.width >= want.width && m.height >= want.height && m.max_fps >= want.max_fps)) return 'yes';
  // A larger frame or a higher rate than any listed mode may still exist in a format not recorded here.
  return modes.some((m) => m.width >= want.width && m.height >= want.height) || modes.some((m) => m.max_fps >= want.max_fps) ? 'unknown' : 'no';
}

/** The works a person is credited with scoring, from the records. */
export const scoredBy = (name: string) => COMPOSER_CREDITS.filter((x) => x.name === name).map((x) => x.work);
