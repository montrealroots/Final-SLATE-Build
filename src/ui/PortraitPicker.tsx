// Your headshot, from 1221's src/ui/creation/PortraitPicker.tsx (November 8, 2026). Any photo a browser can decode is
// drawn into a fixed 4:5 frame and re-encoded as a JPEG, which crops it, strips what the camera wrote into it and keeps
// it small enough for a save. Shown on Profile and beside your credits. Changed from 1221's: a photo that encodes larger
// than a save keeps is re-encoded at lower quality, committing doesn't depend on the parent's callback (a new one each
// render re-encoded and re-saved without end), and the note says where it's shown.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CANNOT_DECODE, CANNOT_ENCODE, CENTRED, MAX_ZOOM, PORTRAIT_HEIGHT, PORTRAIT_WIDTH,
  clampPlacement, dataUrlBytes, describeRejection, drawRect,
  type Placement,
} from './portrait';
import { PORTRAIT_MAX_CHARS } from '../engine/identity';

/** Quality to re-encode at. High enough for a face, small enough for a save. */
const JPEG_QUALITY = 0.86;

/**
 * The picture-with-an-arrow every upload control has.
 *
 * Drawn rather than fetched, so it costs nothing, scales to any screen and
 * takes the frame's color — including the accent it turns while a photo is
 * being dragged over it.
 */
function UploadGlyph() {
  return (
    <svg className="portrait-glyph" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <rect x="5" y="8" width="38" height="32" rx="5" />
      <circle cx="15" cy="18.5" r="3" />
      <path d="M7 36.5 16 27.5l4.5 4" />
      <path d="M31 37V21.5" />
      <path d="M25.5 27 31 21.5 36.5 27" />
    </svg>
  );
}

export function PortraitPicker({
  portrait, name, onChange,
}: {
  portrait: string | undefined;
  name: string;
  onChange: (portrait: string | undefined) => void;
}) {
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [placement, setPlacement] = useState<Placement>(CENTRED);
  const [problem, setProblem] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragFrom = useRef<{ x: number; y: number; placement: Placement } | null>(null);

  /** Draws the current source at the current placement. */
  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !source) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, PORTRAIT_WIDTH, PORTRAIT_HEIGHT);
    const rect = drawRect(source.naturalWidth, source.naturalHeight, placement);
    context.drawImage(source, rect.x, rect.y, rect.width, rect.height);
  }, [source, placement]);

  useEffect(() => { paint(); }, [paint]);

  /** Hands the framed result up, re-encoded. */
  // The latest onChange, read when a photo is committed: committing depends only on the photo and its framing, so a
  // parent that hands a new callback each render (Creation does) doesn't re-run it, which looped until November 8, 2026.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const commit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !source) return;
    try {
      // A busy photo can encode larger than a save keeps (identity.ts PORTRAIT_MAX_CHARS): step the quality down until it fits.
      let url = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      for (const q of [0.72, 0.6, 0.5]) if (url.length > PORTRAIT_MAX_CHARS) url = canvas.toDataURL('image/jpeg', q);
      if (url.length > PORTRAIT_MAX_CHARS) setProblem(CANNOT_ENCODE);
      else onChangeRef.current(url);
    } catch {
      setProblem(CANNOT_ENCODE);
    }
  }, [source]);

  useEffect(() => {
    if (source) commit();
    // Re-encode whenever the framing changes, so what is stored is what is seen.
  }, [source, placement, commit]);

  const accept = useCallback((file: File) => {
    const rejection = describeRejection(file);
    if (rejection) { setProblem(rejection); return; }

    setProblem(undefined);
    setBusy(true);
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      setSource(image);
      setPlacement(CENTRED);
      setBusy(false);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setProblem(CANNOT_DECODE);
      setBusy(false);
    };
    image.src = url;
  }, []);

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) accept(file);
  };

  // Dragging inside the frame moves the photo within it.
  const onPointerDown = (event: React.PointerEvent) => {
    if (!source) return;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    dragFrom.current = { x: event.clientX, y: event.clientY, placement };
  };
  const onPointerMove = (event: React.PointerEvent) => {
    const from = dragFrom.current;
    if (!from || !source) return;
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setPlacement(clampPlacement({
      zoom: from.placement.zoom,
      // A full drag across the frame moves the photo the whole of its slack.
      offsetX: from.placement.offsetX + ((event.clientX - from.x) / Math.max(1, box.width)) * 2,
      offsetY: from.placement.offsetY + ((event.clientY - from.y) / Math.max(1, box.height)) * 2,
    }));
  };
  const endDrag = () => { dragFrom.current = null; };

  const clear = () => {
    setSource(null);
    setPlacement(CENTRED);
    setProblem(undefined);
    onChange(undefined);
    if (inputRef.current) inputRef.current.value = '';
  };

  const storedBytes = portrait ? dataUrlBytes(portrait) : 0;

  return (
    <div className="portrait-picker">
      <div
        className="portrait-frame"
        data-dragging={dragging ? 'true' : undefined}
        data-empty={!source && !portrait ? 'true' : undefined}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        title={source ? 'Drag to reposition' : undefined}
      >
        {/* The canvas is the picture: what is drawn here is exactly what is stored. */}
        <canvas
          ref={canvasRef}
          width={PORTRAIT_WIDTH}
          height={PORTRAIT_HEIGHT}
          hidden={!source}
          aria-label={source ? `Headshot for ${name || 'your character'}` : undefined}
        />
        {!source && portrait && <img src={portrait} alt={`Headshot for ${name || 'your character'}`} />}
        {!source && !portrait && (
          <button
            type="button"
            className="portrait-empty"
            onClick={() => inputRef.current?.click()}
          >
            <UploadGlyph />
            <span className="portrait-empty-title">Upload Custom Photo</span>
            <span className="portrait-empty-note">
              {busy ? 'Opening the photo…' : 'Tap here, or drop one in.'}
            </span>
          </button>
        )}
      </div>

      <div className="portrait-controls">
        <input
          ref={inputRef}
          id="portrait-file"
          type="file"
          accept="image/*"
          className="visually-hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) accept(f); }}
        />
        {/* The frame itself is the upload control now, so this is the plain
            file-picker route rather than a second copy of the same words. */}
        <label htmlFor="portrait-file" className="btn btn-sm">
          {portrait || source ? 'Replace Photo' : 'Choose File'}
        </label>
        {(portrait || source) && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>Remove</button>
        )}

        {source && (
          <div className="field portrait-zoom">
            <label htmlFor="portrait-zoom">Zoom</label>
            <input
              id="portrait-zoom"
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.02}
              value={placement.zoom}
              onChange={(e) => setPlacement((p) => clampPlacement({ ...p, zoom: Number(e.target.value) }))}
            />
          </div>
        )}

        <p className="hint" role={problem ? 'alert' : undefined}>
          {problem
            ? problem
            : source
              ? 'Drag the photo to move it in the frame, and use Zoom to size it.'
              : storedBytes > 0
                ? `Saved at ${PORTRAIT_WIDTH}×${PORTRAIT_HEIGHT}, ${Math.round(storedBytes / 1024)}KB.`
                : 'Any size or shape works. The game crops it to a headshot and keeps a small copy in the save. It’s shown on your Profile and beside your credits; the game never looks at what’s in it.'}
        </p>
      </div>
    </div>
  );
}
