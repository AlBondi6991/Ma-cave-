import { drinkStatus, isDrinkable } from "./status";
import { COLORS, type CellarState, type Wine } from "./types";

export function bottleValue(wine: Wine): number | undefined {
  return wine.value ?? wine.purchasePrice;
}

export function totals(state: CellarState, year = new Date().getFullYear()) {
  const inStock = state.wines.filter((w) => w.quantity > 0);
  const bottles = inStock.reduce((n, w) => n + w.quantity, 0);
  const value = inStock.reduce((sum, w) => sum + (bottleValue(w) ?? 0) * w.quantity, 0);
  const purchase = inStock.reduce((sum, w) => sum + (w.purchasePrice ?? 0) * w.quantity, 0);
  const drinkable = inStock.filter((w) => isDrinkable(drinkStatus(w, year))).reduce((n, w) => n + w.quantity, 0);
  const placed = state.slots.length;
  const capacity = state.racks.reduce((n, r) => n + r.rows * r.cols, 0);
  return { references: inStock.length, bottles, value, purchase, drinkable, placed, capacity };
}

function groupBottles(state: CellarState, key: (w: Wine) => string | undefined) {
  const map = new Map<string, number>();
  for (const w of state.wines) {
    if (w.quantity <= 0) continue;
    const k = key(w) || "Non renseigné";
    map.set(k, (map.get(k) ?? 0) + w.quantity);
  }
  return [...map.entries()].map(([name, bottles]) => ({ name, bottles }));
}

export function byColor(state: CellarState) {
  const counts = new Map(groupBottles(state, (w) => w.color).map((g) => [g.name, g.bottles]));
  return COLORS.filter((c) => counts.has(c.value)).map((c) => ({
    name: c.label,
    bottles: counts.get(c.value)!,
    fill: c.hex,
  }));
}

export function byRegion(state: CellarState, limit = 8) {
  return groupBottles(state, (w) => w.region)
    .sort((a, b) => b.bottles - a.bottles)
    .slice(0, limit);
}

export function byVintage(state: CellarState) {
  return groupBottles(state, (w) => (w.vintage ? String(w.vintage) : "NM")).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

/** Bouteilles bues par mois sur les `months` derniers mois (mois courant inclus). */
export function consumptionByMonth(state: CellarState, months = 12, now = new Date()) {
  const buckets: { key: string; name: string; bottles: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      name: d.toLocaleDateString("fr-FR", { month: "short" }),
      bottles: 0,
    });
  }
  for (const m of state.movements) {
    if (m.type !== "sortie" || m.reason !== "bu") continue;
    const bucket = buckets.find((b) => b.key === m.date.slice(0, 7));
    if (bucket) bucket.bottles += m.quantity;
  }
  return buckets.map(({ name, bottles }) => ({ name, bottles }));
}

/** Bouteilles à ouvrir en priorité : dans leur fenêtre, les plus pressées d'abord. */
export function toDrinkNow(state: CellarState, year = new Date().getFullYear()) {
  const rank = { urgent: 0, apogee: 1, pret: 2 } as Record<string, number>;
  return state.wines
    .filter((w) => w.quantity > 0)
    .map((w) => ({ wine: w, status: drinkStatus(w, year) }))
    .filter((x) => isDrinkable(x.status))
    .sort(
      (a, b) =>
        rank[a.status] - rank[b.status] ||
        (a.wine.drinkUntil ?? 9999) - (b.wine.drinkUntil ?? 9999),
    );
}

export function averageRating(state: CellarState, wineId: string): number | undefined {
  const ratings = state.tastings.filter((t) => t.wineId === wineId && t.rating != null).map((t) => t.rating!);
  if (ratings.length === 0) return undefined;
  return ratings.reduce((a, b) => a + b, 0) / ratings.length;
}
