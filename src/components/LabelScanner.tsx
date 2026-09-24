import { Camera, LoaderCircle, ScanLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { canSendImages, getSample, sampleErrorMessage } from "../lib/claude";
import { NotALabelError, ocrText, parseLabelText, prepareForOcr, prepareImage, readWithClaude, structureWithClaude, type LabelFields } from "../lib/labelScan";
import { plural } from "../lib/format";
import { Card } from "./ui";

type Status =
  | { kind: "idle" }
  | { kind: "reading"; label: string; progress?: number }
  | { kind: "done"; filled: number; note?: string; ocr?: string }
  | { kind: "error"; text: string; detail?: string; ocr?: string };

/** photo : Claude voit l'image ; texte : OCR sur l'appareil puis Claude interprète ; local : OCR seul. */
type Mode = "photo" | "texte" | "local";

const DESCRIPTION: Record<Mode, string> = {
  photo: "Claude lit la photo et remplit la fiche, garde estimée comprise. Vérifie avant d'enregistrer.",
  texte: "Ton téléphone lit le texte de l'étiquette, puis Claude remplit la fiche, garde estimée comprise. Vérifie avant d'enregistrer.",
  local:
    "Lecture du texte sur ton appareil : domaine, millésime, appellation. Photographie l'étiquette de près. Pour une lecture complète par Claude, ajoute ta clé dans les réglages.",
};

async function detectMode(): Promise<Mode> {
  const sample = await getSample();
  if (!sample) return "local";
  return (await canSendImages()) ? "photo" : "texte";
}

export default function LabelScanner({ onRead }: { onRead: (fields: LabelFields) => number }) {
  const [mode, setMode] = useState<Mode>();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [preview, setPreview] = useState<string>();
  const [dragging, setDragging] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const ctl = useRef<AbortController>(null);
  const reading = status.kind === "reading";
  const scanRef = useRef<(f: Blob) => void>(null);

  useEffect(() => {
    detectMode().then(setMode);
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
    setStatus({ kind: "reading", label: "Lecture…" });
    const current = await detectMode();
    setMode(current);
    const sample = await getSample();
    ctl.current = new AbortController();
    const signal = ctl.current.signal;
    let step = "préparation de la photo";
    let note: string | undefined;
    let text: string | undefined;
    try {
      let fields: LabelFields;
      if (current === "photo" && sample) {
        const image = await prepareImage(file);
        step = "Claude";
        setStatus({ kind: "reading", label: "Claude lit l'étiquette…" });
        fields = await readWithClaude(sample, image, signal);
      } else {
        step = "lecture du texte";
        text = await ocrText(await prepareForOcr(file), (p) => setStatus({ kind: "reading", label: "Lecture du texte…", progress: p }));
        if (text.replace(/[^\p{L}\d]/gu, "").length < 4)
          throw new NotALabelError("Aucun texte lu sur la photo. Cadre l'étiquette de près, bien à plat et sans reflet.");
        if (sample) {
          step = "Claude";
          setStatus({ kind: "reading", label: "Claude remplit la fiche…" });
          const read = text;
          fields = await structureWithClaude(sample, read, signal).catch((e) => {
            if ((e as { code?: string })?.code === "cancelled" || e instanceof NotALabelError) throw e;
            note = `${sampleErrorMessage(e)} Fiche remplie avec la seule lecture du téléphone.`;
            return parseLabelText(read);
          });
        } else {
          fields = parseLabelText(text);
        }
      }
      const filled = onRead(fields);
      setStatus(
        filled
          ? { kind: "done", filled, note, ocr: text }
          : {
              kind: "error",
              text: "Je n'ai reconnu ni domaine, ni millésime, ni appellation. Reprends la photo plus près de l'étiquette, ou remplis la fiche à la main.",
              ocr: text,
            },
      );
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === "cancelled") return;
      const message =
        e instanceof NotALabelError ? e.message
        : step === "Claude" ? sampleErrorMessage(e)
        : step === "lecture du texte" ? "La lecture du texte n'a pas pu démarrer sur cet appareil."
        : "Cette photo n'a pas pu être ouverte.";
      const detail = code ?? (e instanceof Error ? e.message : String(e));
      setStatus({ kind: "error", text: message, detail: e instanceof NotALabelError ? undefined : detail.slice(0, 160), ocr: text });
    }
  }
  scanRef.current = scan;

  // Quand le sélecteur s'ouvre, la page perd le focus. Sinon, l'app hôte l'a bloqué (app Claude sur Android).
  const watchPicker = () => {
    let opened = false;
    const mark = () => (opened = true);
    window.addEventListener("blur", mark);
    document.addEventListener("visibilitychange", mark);
    setTimeout(() => {
      window.removeEventListener("blur", mark);
      document.removeEventListener("visibilitychange", mark);
      if (!opened) setBlocked(true);
    }, 1500);
  };

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBlocked(false);
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
            {mode ? DESCRIPTION[mode] : "\u00a0"}
          </p>
          {/* Un vrai <input> sous le bouton : un clic déclenché par script est bloqué dans certaines vues intégrées. */}
          <label
            className={`relative mt-2 inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg px-3.5 py-2 text-sm font-medium text-white transition focus-within:ring-2 focus-within:ring-wine-300 ${
              reading ? "pointer-events-none bg-stone-300" : "bg-wine-700 hover:bg-wine-800"
            }`}
          >
            {reading ? <LoaderCircle size={16} className="animate-spin" /> : <Camera size={16} />}
            {reading ? `${status.label}${status.progress ? ` ${Math.round(status.progress * 100)} %` : ""}` : "Photo de l'étiquette"}
            <input
              type="file"
              accept="image/*"
              disabled={reading}
              onChange={pick}
              onClick={watchPicker}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Photo de l'étiquette"
            />
          </label>
          {(status.kind === "done" || status.kind === "error") && status.ocr?.trim() && (
            <details className="mt-2 text-xs text-stone-500">
              <summary className="cursor-pointer">Texte lu sur la photo</summary>
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-stone-50 p-2 font-sans">{status.ocr.trim()}</pre>
            </details>
          )}
          {blocked && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
              L'app Claude empêche cette page d'ouvrir l'appareil photo. Ouvre Ma Cave dans ton navigateur (Chrome, Safari) :
              touche la flèche de partage en haut de l'écran, copie le lien et colle-le dans le navigateur, connecté à ton compte Claude.
            </p>
          )}
          {status.kind === "done" && (
            <p className="mt-2 text-sm text-emerald-700">
              {plural(status.filled, "champ rempli", "champs remplis")}, à vérifier ci-dessous.
              {status.note && <span className="mt-0.5 block text-xs text-stone-500">{status.note}</span>}
            </p>
          )}
          {status.kind === "error" && (
            <p className="mt-2 text-sm text-red-700">
              {status.text}
              {status.detail && <span className="mt-0.5 block text-xs text-stone-400">Détail : {status.detail}</span>}
            </p>
          )}
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
