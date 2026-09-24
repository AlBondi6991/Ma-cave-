import { addRack, addTasting, addWine, emptyState, placeBottle, removeBottles, type WineInput } from "./cellar";
import type { CellarState } from "./types";

const WINES: (WineInput & { key: string })[] = [
  { key: "montrose", producer: "Château Montrose", name: "Grand vin", vintage: 2015, color: "rouge", country: "France", region: "Bordeaux", appellation: "Saint-Estèphe", grapes: ["Cabernet sauvignon", "Merlot"], format: "75 cl", quantity: 6, purchasePrice: 120, value: 160, purchaseDate: "2019-03-12", drinkFrom: 2025, peak: 2032, drinkUntil: 2050 },
  { key: "chave", producer: "Domaine Jean-Louis Chave", name: "Hermitage", vintage: 2012, color: "rouge", country: "France", region: "Rhône", appellation: "Hermitage", grapes: ["Syrah"], format: "75 cl", quantity: 2, purchasePrice: 180, value: 260, drinkFrom: 2020, peak: 2026, drinkUntil: 2040 },
  { key: "jadot", producer: "Louis Jadot", name: "Clos des Ursules", vintage: 2017, color: "rouge", country: "France", region: "Bourgogne", appellation: "Beaune 1er Cru", grapes: ["Pinot noir"], format: "75 cl", quantity: 4, purchasePrice: 55, drinkFrom: 2022, peak: 2026, drinkUntil: 2032 },
  { key: "foillard", producer: "Jean Foillard", name: "Côte du Py", vintage: 2020, color: "rouge", country: "France", region: "Beaujolais", appellation: "Morgon", grapes: ["Gamay"], format: "75 cl", quantity: 5, purchasePrice: 28, drinkFrom: 2023, peak: 2027, drinkUntil: 2035 },
  { key: "gauby", producer: "Domaine Gauby", name: "Vieilles Vignes", vintage: 2019, color: "blanc", country: "France", region: "Roussillon", appellation: "IGP Côtes Catalanes", grapes: ["Grenache blanc", "Macabeu"], format: "75 cl", quantity: 3, purchasePrice: 38, drinkFrom: 2022, drinkUntil: 2030 },
  { key: "huet", producer: "Domaine Huet", name: "Le Mont Sec", vintage: 2018, color: "blanc", country: "France", region: "Loire", appellation: "Vouvray", grapes: ["Chenin"], format: "75 cl", quantity: 3, purchasePrice: 32, drinkFrom: 2021, peak: 2028, drinkUntil: 2040 },
  { key: "raveneau", producer: "Domaine Raveneau", name: "Montée de Tonnerre", vintage: 2014, color: "blanc", country: "France", region: "Bourgogne", appellation: "Chablis 1er Cru", grapes: ["Chardonnay"], format: "75 cl", quantity: 1, purchasePrice: 90, value: 220, drinkFrom: 2019, peak: 2024, drinkUntil: 2027 },
  { key: "ott", producer: "Domaines Ott", name: "Château de Selle", vintage: 2023, color: "rose", country: "France", region: "Provence", appellation: "Côtes de Provence", grapes: ["Grenache", "Cinsault"], format: "75 cl", quantity: 4, purchasePrice: 35, drinkFrom: 2024, drinkUntil: 2026 },
  { key: "egly", producer: "Egly-Ouriet", name: "Brut Tradition Grand Cru", color: "effervescent", country: "France", region: "Champagne", appellation: "Champagne", grapes: ["Pinot noir", "Chardonnay"], format: "75 cl", quantity: 3, purchasePrice: 75, drinkFrom: 2024, drinkUntil: 2030 },
  { key: "yquem", producer: "Château d'Yquem", name: "", vintage: 2009, color: "liquoreux", country: "France", region: "Bordeaux", appellation: "Sauternes", grapes: ["Sémillon", "Sauvignon blanc"], format: "37,5 cl", quantity: 1, purchasePrice: 190, value: 280, drinkFrom: 2020, peak: 2040, drinkUntil: 2070 },
  { key: "vieux", producer: "Château Musar", name: "Rouge", vintage: 2005, color: "rouge", country: "Liban", region: "Bekaa", grapes: ["Cabernet sauvignon", "Cinsault", "Carignan"], format: "75 cl", quantity: 1, purchasePrice: 45, drinkFrom: 2012, drinkUntil: 2024 },
  { key: "barolo", producer: "G.D. Vajra", name: "Albe", vintage: 2019, color: "rouge", country: "Italie", region: "Piémont", appellation: "Barolo", grapes: ["Nebbiolo"], format: "75 cl", quantity: 6, purchasePrice: 42, drinkFrom: 2027, peak: 2032, drinkUntil: 2040 },
];

/** Cave d'exemple pour découvrir l'application. */
export function demoState(now = new Date()): CellarState {
  let s = emptyState();
  const ids: Record<string, string> = {};
  for (const { key, ...wine } of WINES) {
    ids[key] = crypto.randomUUID();
    s = addWine(s, { ...wine, purchaseDate: wine.purchaseDate ?? "2024-11-20" }, ids[key]);
  }

  s = addRack(s, { name: "Cave principale", rows: 6, cols: 8 });
  s = addRack(s, { name: "Armoire à vins", rows: 4, cols: 6 });
  const [main, fridge] = s.racks;
  const fill = (key: string, rackId: string, cells: [number, number][]) => {
    for (const [r, c] of cells) s = placeBottle(s, ids[key], rackId, r, c);
  };
  fill("montrose", main.id, [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5]]);
  fill("barolo", main.id, [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5]]);
  fill("jadot", main.id, [[2, 0], [2, 1], [2, 2], [2, 3]]);
  fill("chave", main.id, [[3, 0], [3, 1]]);
  fill("foillard", main.id, [[4, 0], [4, 1], [4, 2]]);
  fill("egly", fridge.id, [[0, 0], [0, 1], [0, 2]]);
  fill("huet", fridge.id, [[1, 0], [1, 1]]);
  fill("raveneau", fridge.id, [[1, 3]]);
  fill("ott", fridge.id, [[2, 0], [2, 1]]);

  // Quelques sorties et dégustations réparties sur l'année écoulée
  const date = (monthsAgo: number, day: number) =>
    new Date(now.getFullYear(), now.getMonth() - monthsAgo, day, 12).toISOString().slice(0, 10);
  const drink = (key: string, monthsAgo: number, rating: number, nose: string, palate: string, pairing: string) => {
    const d = date(monthsAgo, 8 + monthsAgo);
    s = addBottlesSilently(s, ids[key]);
    s = removeBottles(s, ids[key], 1, { reason: "bu", date: d });
    s = addTasting(s, { wineId: ids[key], date: d, rating, nose, palate, pairing });
  };
  drink("foillard", 10, 16, "Cerise, pivoine, poivre", "Juteux, tanins soyeux", "Saucisson de Lyon");
  drink("jadot", 7, 16.5, "Framboise, sous-bois", "Élégant, finale saline", "Volaille rôtie");
  drink("montrose", 5, 18, "Cassis, cèdre, graphite", "Ample, tanins encore fermes", "Côte de bœuf");
  drink("egly", 3, 17.5, "Brioche, pomme cuite", "Bulles fines, vineux", "Apéritif");
  drink("huet", 1, 17, "Coing, cire d'abeille", "Tendu, belle acidité", "Sandre au beurre blanc");
  drink("ott", 0, 15, "Pêche blanche, agrumes", "Frais, léger", "Salade niçoise");
  return s;
}

/** Ajoute une bouteille sans trace, pour que les sorties d'exemple n'entament pas le stock affiché. */
function addBottlesSilently(s: CellarState, wineId: string): CellarState {
  return { ...s, wines: s.wines.map((w) => (w.id === wineId ? { ...w, quantity: w.quantity + 1 } : w)) };
}
