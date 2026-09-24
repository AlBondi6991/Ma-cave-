import { getApiKey } from "./claudeApiKey";
/**
 * Accès à Claude quand l'app est ouverte comme page claude.ai (capacité « sample »).
 * Hors de claude.ai, `getSample()` renvoie null et l'app se rabat sur ses fonctions locales.
 */
export interface SampleOptions {
  images?: Blob | Blob[];
  modelTier?: "quick" | "default" | "complex";
  signal?: AbortSignal;
  cache?: boolean;
}

export interface Sample {
  json<T = unknown>(input: string, options?: SampleOptions): Promise<T>;
  limits(): Promise<{ images?: { maxCount: number; maxInputBytes: number; mediaTypes: string[] } }>;
}

export interface SampleError {
  code: string;
  message: string;
}

export interface Downloads {
  save(request: { filename: string; data: string | Blob }): Promise<{ status: "saved" | "delivered" }>;
}

declare global {
  interface Window {
    claude?: { use(name: "sample"): Promise<Sample | null>; use(name: "downloads"): Promise<Downloads | null> };
  }
}

/** Enregistre un fichier : via claude.ai quand l'app y est ouverte (les liens de téléchargement y sont bloqués), sinon par un lien. */
export async function saveFile(filename: string, data: string, type: string): Promise<boolean> {
  if (window.claude) {
    const downloads = await window.claude.use("downloads").catch(() => null);
    if (!downloads) return false;
    return downloads.save({ filename, data }).then(() => true, () => false);
  }
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

let pending: Promise<Sample | null> | undefined;

/** Claude via claude.ai quand l'app y est ouverte, sinon via la clé API enregistrée dans les réglages. */
export async function getSample(): Promise<Sample | null> {
  if (window.claude) {
    pending ??= window.claude.use("sample").catch(() => null);
    return pending;
  }
  const key = getApiKey();
  if (!key) return null;
  const { apiSample } = await import("./claudeApi");
  return apiSample(key);
}

export async function canSendImages(): Promise<boolean> {
  const sample = await getSample();
  if (!sample) return false;
  const limits = await sample.limits().catch(() => null);
  return !!limits?.images;
}

export function sampleErrorMessage(e: unknown): string {
  const code = (e as SampleError | undefined)?.code;
  switch (code) {
    case "bad_key":
      return "Ta clé API Claude est refusée. Vérifie-la dans les réglages.";
    case "offline":
      return "Pas de connexion internet : Claude est injoignable.";
    case "bad_request":
      return "Claude a refusé la demande (crédit API épuisé ?).";
    case "not_granted":
      return "Tu n'as pas autorisé la page à interroger Claude.";
    case "rate_limited":
      return "Trop de demandes d'un coup, réessaie dans une minute.";
    case "invalid_json":
    case "empty_completion":
      return "Réponse illisible, réessaie.";
    case "image_rejected":
      return "Cette photo n'a pas pu être envoyée (format ou taille).";
    default:
      return "Claude n'a pas pu répondre, réessaie.";
  }
}

export const isEmbeddedInClaude = () => typeof window !== "undefined" && !!window.claude;
