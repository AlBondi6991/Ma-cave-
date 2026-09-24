import { Camera, LoaderCircle, ScanLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { canSendImages, getSample, sampleErrorMessage } from "../lib/claude";
import { NotALabelError, prepareImage, readWithClaude, readWithOcr, type LabelFields } from "../lib/labelScan";
import { plural } from "../lib/format";
import { Card } from "./ui";

type Status = { kind: "idle" } | { kind: "reading"; progress?: number } | { kind: "done"; filled: number } | { kind: "error"; text: string };

export default function LabelScanner({ onRead }: { onRead: (fields: LabelFields) => number }) {
  const [mode, setMode] = useState<"claude" | "ocr">();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [preview, setPreview] = useState<string>();
  const [dragging, setDragging] = useState(false);
  const ctl = useRef<AbortController>(null);
  const reading = status.kind === "reading";
  const scanRef = useRef<(f: Blob) => void>(null);

  useEffect(() => {
    canSendImages().then((ok) => setMode(ok ? "claude" : "ocr"));
    return () => ctl.current?.abort();
  }, []);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  // Coller une photo copiée : seule voie quand la vue (app Claude sur téléphone) n'ouvre pas le sélecteur de fichiers.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = imageFrom(e.clipboardData);
      if (!file) return;
      e.preventDefault();
      scanRef.current?.(file);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  async function scan(file: Blob) {
    if (reading) return;
    setPreview(URL.createObjectURL(file));
    setStatus({ kind: "reading" });
    const useClaude = await canSendImages();
    try {
      const image = await prepareImage(file);
      const sample = useClaude ? await getSample() : null;
      let fields: LabelFields;
      if (sample) {
        ctl.current = new AbortController();
        fields = await readWithClaude(sample, image, ctl.current.signal);
      } else {
        fields = await readWithOcr(image, (p) => setStatus({ kind: "reading", progress: p }));
      }
      const filled = onRead(fields);
      setStatus(filled ? { kind: "done", filled } : { kind: "error", text: "Rien de lisible sur cette photo. Essaie plus près, bien éclairé." });
    } catch (e) {
      if ((e as { code?: string })?.code === "cancelled") return;
      const text =
        e instanceof NotALabelError ? e.message
        : useClaude ? sampleErrorMessage(e)
        : "La lecture a échoué. Réessaie avec une photo plus nette.";
      setStatus({ kind: "error", text });
    }
  }
  scanRef.current = scan;

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) scan(f);
    e.target.value = "";
  };

  return (
    <Card className={`flex gap-3 ${dragging ? "ring-2 ring-wine-500" : ""}`}>
      <div
        className="contents"
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = imageFrom(e.dataTransfer);
          if (f) scan(f);
        }}
      >
        {preview ? (
          <img src={preview} alt="Étiquette photographiée" className="h-24 w-20 shrink-0 rounded-lg object-cover ring-1 ring-stone-200" />
        ) : (
          <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-lg bg-wine-50 text-wine-600 ring-1 ring-wine-100">
            <ScanLine size={30} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-lg font-semibold leading-tight">Scanner l'étiquette</h2>
          <p className="mt-0.5 text-sm text-stone-500">
            {mode === "ocr"
              ? "Lecture du texte sur ton appareil : domaine, millésime, appellation. Vérifie la fiche ensuite."
              : "Claude lit la photo et remplit la fiche, garde estimée comprise. Vérifie avant d'enregistrer."}
          </p>
          {/* Un vrai <input> sous le bouton : un clic déclenché par script est bloqué dans certaines vues intégrées. */}
          <label
            className={`relative mt-2 inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg px-3.5 py-2 text-sm font-medium text-white transition focus-within:ring-2 focus-within:ring-wine-300 ${
              reading ? "pointer-events-none bg-stone-300" : "bg-wine-700 hover:bg-wine-800"
            }`}
          >
            {reading ? <LoaderCircle size={16} className="animate-spin" /> : <Camera size={16} />}
            {reading ? (status.progress ? `Lecture… ${Math.round(status.progress * 100)} %` : "Lecture…") : "Photo de l'étiquette"}
            <input
              type="file"
              accept="image/*"
              disabled={reading}
              onChange={pick}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Photo de l'étiquette"
            />
          </label>
          {/* Zone éditable : sur téléphone, un appui long y fait apparaître « Coller » pour une image. */}
          <div
            contentEditable={!reading}
            suppressContentEditableWarning
            role="textbox"
            aria-label="Coller une photo de l'étiquette"
            data-placeholder="Le bouton ne réagit pas ? Copie la photo depuis ta galerie, puis appui long ici → Coller."
            onInput={(e) => (e.currentTarget.innerHTML = "")}
            className="mt-2 min-h-9 rounded-lg border border-dashed border-stone-300 px-3 py-2 text-xs text-stone-500 caret-transparent outline-none empty:before:content-[attr(data-placeholder)] focus:border-wine-500 focus:bg-wine-50"
          />
          {status.kind === "done" && (
            <p className="mt-2 text-sm text-emerald-700">{plural(status.filled, "champ rempli", "champs remplis")}, à vérifier ci-dessous.</p>
          )}
          {status.kind === "error" && <p className="mt-2 text-sm text-red-700">{status.text}</p>}
        </div>
      </div>
    </Card>
  );
}

function imageFrom(data: DataTransfer | null): File | undefined {
  if (!data) return;
  const direct = [...data.files].find((f) => f.type.startsWith("image/"));
  if (direct) return direct;
  const item = [...data.items].find((i) => i.kind === "file" && i.type.startsWith("image/"));
  return item?.getAsFile() ?? undefined;
}
