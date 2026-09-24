import { APPELLATIONS, COUNTRIES, GRAPES, REGIONS, normalize } from "./catalog";
import type { Sample } from "./claude";
import { COLORS, FORMATS, type WineColor } from "./types";

/** Ce qu'une étiquette permet de pré-remplir dans la fiche. */
export interface LabelFields {
  producer?: string;
  name?: string;
  vintage?: number;
  color?: WineColor;
  country?: string;
  region?: string;
  appellation?: string;
  grapes?: string[];
  format?: string;
  drinkFrom?: number;
  peak?: number;
  drinkUntil?: number;
  notes?: string;
}

export class NotALabelError extends Error {}

/** Réduit une photo de téléphone (souvent 4000 px) à une taille raisonnable à envoyer ou analyser. */
export async function prepareImage(file: Blob, maxSide = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.85));
}

/** Image pour l'OCR : plus grande, en niveaux de gris et contraste étiré (étiquettes ternes, photos de loin). */
export async function prepareForOcr(file: Blob, maxSide = 2400): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) {
    const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    d[i] = g;
    hist[g]++;
  }
  // bornes aux 1er et 99e centiles pour ignorer reflets et ombres
  const total = d.length / 4;
  let lo = 0, hi = 255, acc = 0;
  for (; lo < 255 && (acc += hist[lo]) < total * 0.01; lo++);
  acc = 0;
  for (; hi > 0 && (acc += hist[hi]) < total * 0.01; hi--);
  const range = Math.max(1, hi - lo);
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.max(0, Math.min(255, ((d[i] - lo) * 255) / range));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.92));
}

const COLOR_VALUES = COLORS.map((c) => c.value);

function prompt(year: number) {
  return `Voici la photo d'une étiquette de vin. Lis-la et remplis la fiche de cave correspondante.

Réponds uniquement par un objet JSON avec ces clés (null quand l'information est absente ou incertaine) :
{
  "isWineLabel": boolean,            // false si la photo ne montre pas une étiquette de vin
  "producer": string|null,           // domaine, château ou maison, tel qu'écrit
  "name": string|null,               // nom de la cuvée, sans répéter le domaine ni l'appellation
  "vintage": number|null,            // millésime (AAAA) ; null pour un non-millésimé
  "color": ${COLOR_VALUES.map((c) => `"${c}"`).join("|")}|null,
  "country": string|null,            // en français, ex. "France", "Italie"
  "region": string|null,             // pour la France, l'une de : ${REGIONS.join(", ")}
  "appellation": string|null,        // ex. "Saint-Estèphe", "Morgon", "Champagne"
  "grapes": string[],                // cépages lus ou typiques de l'appellation s'ils sont évidents
  "format": ${FORMATS.filter((f) => f !== "Autre").map((f) => `"${f}"`).join("|")}|null,
  "drinkFrom": number|null,          // année à partir de laquelle le boire (estimation de garde typique pour ce vin et ce millésime)
  "peak": number|null,               // année d'apogée estimée
  "drinkUntil": number|null,         // dernière année conseillée
  "notes": string|null               // une phrase utile au plus (classement, style), sinon null
}

N'invente pas un producteur illisible. Nous sommes en ${year}.`;
}

export async function readWithClaude(sample: Sample, image: Blob, signal?: AbortSignal): Promise<LabelFields> {
  const raw = await sample.json<Record<string, unknown>>(prompt(new Date().getFullYear()), {
    images: image,
    modelTier: "default",
    signal,
  });
  if (raw && raw.isWineLabel === false) throw new NotALabelError("Je ne vois pas d'étiquette de vin sur cette photo.");
  return sanitize(raw);
}

const cleanText = (v: unknown, max = 120) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
const cleanYear = (v: unknown) => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isInteger(n) && n >= 1800 && n <= 2200 ? n : undefined;
};

/** Ne garde que des valeurs valides : la réponse d'un modèle ou d'un OCR n'est jamais fiable telle quelle. */
export function sanitize(raw: unknown): LabelFields {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const color = COLOR_VALUES.find((c) => c === r.color);
  const format = FORMATS.find((f) => f === r.format && f !== "Autre");
  const grapes = Array.isArray(r.grapes)
    ? r.grapes.map((g) => cleanText(g, 40)).filter((g): g is string => !!g).slice(0, 8)
    : undefined;
  const out: LabelFields = {
    producer: cleanText(r.producer),
    name: cleanText(r.name),
    vintage: cleanYear(r.vintage),
    color,
    country: cleanText(r.country, 40),
    region: cleanText(r.region, 40),
    appellation: cleanText(r.appellation, 80),
    grapes: grapes?.length ? grapes : undefined,
    format,
    drinkFrom: cleanYear(r.drinkFrom),
    peak: cleanYear(r.peak),
    drinkUntil: cleanYear(r.drinkUntil),
    notes: cleanText(r.notes, 300),
  };
  if (out.drinkFrom && out.drinkUntil && out.drinkFrom > out.drinkUntil) out.drinkFrom = out.drinkUntil = out.peak = undefined;
  if (out.peak && ((out.drinkFrom && out.peak < out.drinkFrom) || (out.drinkUntil && out.peak > out.drinkUntil))) out.peak = undefined;
  if (out.vintage && out.drinkFrom && out.drinkFrom < out.vintage) out.drinkFrom = undefined;
  return out;
}

/** Lecture hors-ligne : OCR sur l'appareil puis extraction par règles. Moins précise que Claude. */
/** Lit le texte de la photo sur l'appareil (OCR Tesseract embarqué, français). */
export async function ocrText(image: Blob, onProgress?: (ratio: number) => void): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const base = new URL("ocr/", document.baseURI).href;
  const worker = await createWorker("fra", 1 /* LSTM seul */, {
    workerPath: `${base}worker.min.js`,
    corePath: base,
    // Tesseract demande « <langPath>/fra.traineddata.gz » ; la requête pointe vers un nom de fichier
    // que tout hébergeur sert (claude.ai refuse les .gz), le reste passe en paramètre ignoré.
    langPath: `${base}fra-traineddata.wasm?f=`,
    cacheMethod: "none",
    workerBlobURL: false,
    logger: (m: { status: string; progress: number }) => m.status === "recognizing text" && onProgress?.(m.progress),
  });
  try {
    const { data } = await worker.recognize(image);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

/** Fait interpréter par Claude un texte d'étiquette lu par OCR (bruité, coupé), quand la vue ne permet pas d'envoyer l'image. */
export async function structureWithClaude(sample: Sample, text: string, signal?: AbortSignal): Promise<LabelFields> {
  const raw = await sample.json<Record<string, unknown>>(
    `${prompt(new Date().getFullYear()).replace("Voici la photo d'une étiquette de vin. Lis-la", "Voici le texte lu par OCR sur la photo d'une étiquette de vin (il peut contenir des fautes, des coupures et du bruit). Interprète-le")}

Texte OCR :
"""
${text.slice(0, 4000)}
"""`,
    { modelTier: "default", signal },
  );
  if (raw && raw.isWineLabel === false) throw new NotALabelError("Le texte lu ne ressemble pas à une étiquette de vin. Reprends la photo en cadrant l'étiquette.");
  return sanitize(raw);
}

const PRODUCER = /^(chateau|ch\.|domaine|dom\.|clos|mas|maison|cave|cellier|vignobles?|champagne)\b/;

const titleCase = (s: string) =>
  s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s\-'’])(\p{L})/gu, (_, sep, c) => sep + c.toUpperCase()) : s;

function detectFormat(t: string): string | undefined {
  if (/\b1[.,]5\s*l\b|\b150\s*cl\b|magnum/.test(t)) return "Magnum 1,5 L";
  if (/\b3\s*l\b|\b300\s*cl\b|jeroboam/.test(t)) return "Jéroboam 3 L";
  if (/\b37[.,]5\s*cl\b|\b375\s*ml\b/.test(t)) return "37,5 cl";
  if (/\b50\s*cl\b|\b500\s*ml\b/.test(t)) return "50 cl";
  if (/\b75\s*cl\b|\b750\s*ml\b/.test(t)) return "75 cl";
}

function detectColor(t: string): WineColor | undefined {
  if (/\b(brut|extra brut|methode traditionnelle|cremant|champagne|petillant|mousseux)\b/.test(t)) return "effervescent";
  if (/\b(liquoreux|moelleux|vendanges tardives|selection de grains nobles)\b/.test(t)) return "liquoreux";
  if (/\brose\b/.test(t)) return "rose";
  if (/\b(vin )?blanc\b/.test(t)) return "blanc";
  if (/\b(vin )?rouge\b/.test(t)) return "rouge";
}

/** Extrait ce qu'on peut d'un texte d'étiquette brut (OCR). Fonction pure, testée. */
export function parseLabelText(raw: string, year = new Date().getFullYear()): LabelFields {
  const lines = raw.split(/\n+/).map((l) => l.replace(/[|_~=*]+/g, " ").replace(/\s+/g, " ").trim()).filter((l) => l.length >= 3);
  const text = ` ${normalize(lines.join(" \n "))} `;

  const vintage = [...text.matchAll(/\b(19[4-9]\d|20[0-9]\d)\b/g)].map((m) => Number(m[1])).find((y) => y <= year);

  const appellation =
    APPELLATIONS.filter((a) => text.includes(` ${normalize(a.name)} `)).sort((a, b) => b.name.length - a.name.length)[0] ??
    fuzzyAppellation(text);

  const at = lines.findIndex((l) => PRODUCER.test(normalize(l)) && normalize(l) !== "champagne");
  // Un nom coupé en fin de ligne (« CHÂTEAU LYNCH- » / « BAGES ») se poursuit sur la suivante.
  const cut = at >= 0 && lines[at + 1] && (lines[at].endsWith("-") || /\b(de|du|des|de la|le|la|d')$/.test(normalize(lines[at])) || /\bd['’]$/i.test(lines[at]));
  const producerLine = at < 0 ? undefined : cut ? `${lines[at]}${lines[at].endsWith("-") || /['’]$/.test(lines[at]) ? "" : " "}${lines[at + 1]}` : lines[at];
  const producer = producerLine ? titleCase(producerLine).slice(0, 80) : undefined;

  const grapes = GRAPES.filter((g) => text.includes(` ${normalize(g)} `));
  const region = appellation?.region ?? REGIONS.find((r) => text.includes(` ${normalize(r)} `));
  const country =
    appellation || /produit de france|product of france|vin de france/.test(text)
      ? "France"
      : COUNTRIES.find((c) => text.includes(` ${normalize(c)} `));

  return {
    producer,
    vintage,
    appellation: appellation?.name,
    region,
    country,
    color: detectColor(text) ?? appellation?.color,
    grapes: grapes.length ? grapes : undefined,
    format: detectFormat(text),
  };
}

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

/** Appellation reconnue malgré les fautes d'OCR (« Chateauneuf du Papc », « Chdteauneuf-du-Pape »). */
function fuzzyAppellation(text: string) {
  const tokens = text.split(" ").filter(Boolean);
  let best: { a: (typeof APPELLATIONS)[number]; ratio: number } | undefined;
  for (const a of APPELLATIONS) {
    const name = normalize(a.name);
    if (name.length < 6) continue;
    const k = name.split(" ").length;
    for (let i = 0; i + k <= tokens.length; i++) {
      const candidate = tokens.slice(i, i + k).join(" ");
      if (Math.abs(candidate.length - name.length) > 3) continue;
      const ratio = levenshtein(candidate, name) / name.length;
      if (ratio <= 0.25 && (!best || ratio < best.ratio || (ratio === best.ratio && name.length > normalize(best.a.name).length)))
        best = { a, ratio };
    }
  }
  return best?.a;
}
