import type { Wine } from "./types";

export type DrinkStatus = "inconnu" | "garde" | "pret" | "apogee" | "urgent" | "passe";

export const STATUS_INFO: Record<DrinkStatus, { label: string; className: string; order: number }> = {
  passe: { label: "Passé", className: "bg-stone-200 text-stone-700", order: 0 },
  urgent: { label: "À boire vite", className: "bg-orange-100 text-orange-800", order: 1 },
  apogee: { label: "Apogée", className: "bg-emerald-100 text-emerald-800", order: 2 },
  pret: { label: "Prêt à boire", className: "bg-lime-100 text-lime-800", order: 3 },
  garde: { label: "À garder", className: "bg-sky-100 text-sky-800", order: 4 },
  inconnu: { label: "Garde inconnue", className: "bg-stone-100 text-stone-500", order: 5 },
};

/**
 * Situe un vin dans sa fenêtre de dégustation pour l'année donnée.
 * - avant « à boire à partir de » : à garder
 * - après « à boire jusqu'à » : passé
 * - dernière année (ou l'avant-dernière) de la fenêtre : à boire vite
 * - à un an près de l'apogée : apogée
 */
export function drinkStatus(wine: Pick<Wine, "drinkFrom" | "peak" | "drinkUntil">, year = new Date().getFullYear()): DrinkStatus {
  const { drinkFrom, peak, drinkUntil } = wine;
  if (drinkFrom == null && peak == null && drinkUntil == null) return "inconnu";
  if (drinkFrom != null && year < drinkFrom) return "garde";
  if (drinkUntil != null && year > drinkUntil) return "passe";
  if (drinkUntil != null && drinkUntil - year <= 1) return "urgent";
  if (peak != null && Math.abs(peak - year) <= 1) return "apogee";
  if (peak != null && drinkFrom == null && year < peak - 1) return "garde";
  return "pret";
}

/** Vrai quand le vin est dans sa fenêtre et mérite d'être ouvert. */
export function isDrinkable(status: DrinkStatus): boolean {
  return status === "pret" || status === "apogee" || status === "urgent";
}
