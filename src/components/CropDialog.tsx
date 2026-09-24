import { Crop } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Modal } from "./ui";

/** Zone en fractions de l'image (0 à 1). */
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Handle = "move" | "nw" | "ne" | "sw" | "se";
const MIN = 0.08;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Découpe la zone choisie à la pleine résolution de la photo. */
export async function cropImage(file: Blob, r: Rect): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const sx = Math.round(r.x * bitmap.width);
  const sy = Math.round(r.y * bitmap.height);
  const sw = Math.max(1, Math.round(r.w * bitmap.width));
  const sh = Math.max(1, Math.round(r.h * bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  canvas.getContext("2d")!.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
  bitmap.close();
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.95));
}

export default function CropDialog({ file, onDone }: { file: Blob; onDone: (area: Blob | null) => void }) {
  const [url] = useState(() => URL.createObjectURL(file));
  const [rect, setRect] = useState<Rect>({ x: 0.15, y: 0.3, w: 0.7, h: 0.4 });
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ handle: Handle; px: number; py: number; start: Rect } | null>(null);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const down = (handle: Handle) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { handle, px: e.clientX, py: e.clientY, start: rect };
  };

  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    const b = box.current?.getBoundingClientRect();
    if (!d || !b) return;
    const dx = (e.clientX - d.px) / b.width;
    const dy = (e.clientY - d.py) / b.height;
    const s = d.start;
    if (d.handle === "move") {
      setRect({ ...s, x: clamp(s.x + dx, 0, 1 - s.w), y: clamp(s.y + dy, 0, 1 - s.h) });
      return;
    }
    let { x, y, w, h } = s;
    if (d.handle.includes("w")) {
      const nx = clamp(s.x + dx, 0, s.x + s.w - MIN);
      w = s.w + (s.x - nx);
      x = nx;
    } else {
      w = clamp(s.w + dx, MIN, 1 - s.x);
    }
    if (d.handle.includes("n")) {
      const ny = clamp(s.y + dy, 0, s.y + s.h - MIN);
      h = s.h + (s.y - ny);
      y = ny;
    } else {
      h = clamp(s.h + dy, MIN, 1 - s.y);
    }
    setRect({ x, y, w, h });
  };

  const up = () => (drag.current = null);
  const pct = (v: number) => `${v * 100}%`;

  return (
    <Modal open onClose={() => onDone(null)} title="Cadre l'étiquette">
      <p className="mb-3 text-sm text-stone-600">Déplace et ajuste le cadre sur l'étiquette : la lecture sera bien plus précise.</p>
      <div
        ref={box}
        className="relative mx-auto w-fit touch-none select-none overflow-hidden rounded-lg"
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <img src={url} alt="Photo à recadrer" className="block max-h-[55vh] max-w-full" draggable={false} />
        <div
          data-testid="crop-area"
          onPointerDown={down("move")}
          className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
          style={{ left: pct(rect.x), top: pct(rect.y), width: pct(rect.w), height: pct(rect.h) }}
        >
          {(["nw", "ne", "sw", "se"] as const).map((h) => (
            <span
              key={h}
              data-testid={`crop-${h}`}
              onPointerDown={down(h)}
              className={`absolute h-7 w-7 rounded-full border-2 border-white bg-wine-700 ${h.includes("n") ? "-top-3.5" : "-bottom-3.5"} ${h.includes("w") ? "-left-3.5" : "-right-3.5"}`}
            />
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => onDone(file)}>Toute la photo</Button>
        <Button onClick={async () => onDone(await cropImage(file, rect))}><Crop size={16} /> Lire cette zone</Button>
      </div>
    </Modal>
  );
}
