import { Camera, ImageUp, LoaderCircle, ScanLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { canSendImages, getSample, sampleErrorMessage } from "../lib/claude";
import { NotALabelError, prepareImage, readWithClaude, readWithOcr, type LabelFields } from "../lib/labelScan";
import { plural } from "../lib/format";
import { Button, Card } from "./ui";

type Status = { kind: "idle" } | { kind: "reading"; progress?: number } | { kind: "done"; filled: number } | { kind: "error"; text: string };

export default function LabelScanner({ onRead }: { onRead: (fields: LabelFields) => number }) {
  const [mode, setMode] = useState<"claude" | "ocr">();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [preview, setPreview] = useState<string>();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const ctl = useRef<AbortController>(null);

  useEffect(() => {
    canSendImages().then((ok) => setMode(ok ? "claude" : "ocr"));
    return () => ctl.current?.abort();
  }, []);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function scan(file: File) {
    setPreview(URL.createObjectURL(file));
    setStatus({ kind: "reading" });
    try {
      const image = await prepareImage(file);
      const sample = mode === "claude" ? await getSample() : null;
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
        : mode === "claude" ? sampleErrorMessage(e)
        : "La lecture a échoué. Réessaie avec une photo plus nette.";
      setStatus({ kind: "error", text });
    }
  }

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) scan(f);
    e.target.value = "";
  };
  const reading = status.kind === "reading";

  return (
    <Card className="flex gap-3">
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
        <div className="mt-2 flex flex-wrap gap-2">
          <Button onClick={() => cameraRef.current?.click()} disabled={reading || !mode}>
            {reading ? <LoaderCircle size={16} className="animate-spin" /> : <Camera size={16} />}
            {reading ? (status.progress ? `Lecture… ${Math.round(status.progress * 100)} %` : "Lecture…") : "Prendre une photo"}
          </Button>
          <Button variant="secondary" onClick={() => galleryRef.current?.click()} disabled={reading || !mode} aria-label="Choisir une photo">
            <ImageUp size={16} /> <span className="hidden sm:inline">Choisir une photo</span>
          </Button>
        </div>
        {status.kind === "done" && (
          <p className="mt-2 text-sm text-emerald-700">{plural(status.filled, "champ rempli", "champs remplis")}, à vérifier ci-dessous.</p>
        )}
        {status.kind === "error" && <p className="mt-2 text-sm text-red-700">{status.text}</p>}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={pick} />
      </div>
    </Card>
  );
}
