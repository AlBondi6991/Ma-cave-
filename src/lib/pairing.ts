import { normalize } from "./catalog";
import { drinkStatus, type DrinkStatus } from "./status";
import type { CellarState, Wine, WineColor } from "./types";

export interface Dish {
  id: string;
  label: string;
  group: DishGroup;
  /** 3 = accord idéal, 2 = bon, 1 = possible. Une couleur absente ne convient pas. */
  colors: Partial<Record<WineColor, number>>;
  grapes: string[];
  regions: string[];
  appellations?: string[];
  keywords: string[];
}

export const DISH_GROUPS = ["Viandes", "Poissons et mer", "Fromages", "Desserts", "Apéritif et monde"] as const;
export type DishGroup = (typeof DISH_GROUPS)[number];

export const DISHES: Dish[] = [
  { id: "boeuf-grille", label: "Bœuf grillé", group: "Viandes", colors: { rouge: 3 }, grapes: ["Cabernet sauvignon", "Syrah", "Malbec", "Merlot"], regions: ["Bordeaux", "Rhône", "Sud-Ouest"], keywords: ["boeuf", "entrecote", "cote de boeuf", "steak", "burger", "barbecue", "grillade", "bavette"] },
  { id: "boeuf-mijote", label: "Bœuf mijoté", group: "Viandes", colors: { rouge: 3 }, grapes: ["Pinot noir", "Syrah", "Grenache"], regions: ["Bourgogne", "Rhône"], keywords: ["bourguignon", "daube", "pot au feu", "braise", "mijote", "joue", "carbonade"] },
  { id: "agneau", label: "Agneau", group: "Viandes", colors: { rouge: 3 }, grapes: ["Cabernet sauvignon", "Merlot", "Mourvèdre", "Grenache", "Syrah"], regions: ["Bordeaux", "Provence", "Rhône"], appellations: ["Pauillac", "Bandol"], keywords: ["agneau", "gigot", "souris", "carre d agneau", "mechoui", "tajine"] },
  { id: "canard", label: "Canard, magret", group: "Viandes", colors: { rouge: 3 }, grapes: ["Malbec", "Tannat", "Cabernet franc", "Merlot", "Pinot noir"], regions: ["Sud-Ouest", "Bordeaux"], appellations: ["Cahors", "Madiran"], keywords: ["canard", "magret", "confit", "cassoulet", "aiguillettes"] },
  { id: "gibier", label: "Gibier", group: "Viandes", colors: { rouge: 3 }, grapes: ["Syrah", "Pinot noir", "Grenache", "Mourvèdre", "Nebbiolo"], regions: ["Rhône", "Bourgogne"], keywords: ["gibier", "chevreuil", "sanglier", "biche", "lievre", "faisan", "perdreau", "civet"] },
  { id: "volaille", label: "Volaille rôtie", group: "Viandes", colors: { rouge: 2, blanc: 2.5 }, grapes: ["Pinot noir", "Chardonnay", "Gamay"], regions: ["Bourgogne", "Beaujolais", "Jura"], keywords: ["poulet", "volaille", "dinde", "pintade", "chapon", "coquelet"] },
  { id: "volaille-creme", label: "Volaille à la crème", group: "Viandes", colors: { blanc: 3 }, grapes: ["Chardonnay", "Savagnin", "Chenin"], regions: ["Bourgogne", "Jura"], appellations: ["Vin jaune", "Arbois", "Meursault"], keywords: ["creme", "morilles", "blanquette", "vol au vent", "veau", "supreme"] },
  { id: "porc", label: "Porc", group: "Viandes", colors: { rouge: 2, blanc: 2, rose: 1 }, grapes: ["Gamay", "Pinot noir", "Chenin", "Riesling"], regions: ["Beaujolais", "Loire", "Alsace"], keywords: ["porc", "filet mignon", "travers", "echine", "cochon"] },
  { id: "charcuterie", label: "Charcuterie", group: "Viandes", colors: { rouge: 2.5, rose: 1.5 }, grapes: ["Gamay", "Pinot noir", "Cabernet franc"], regions: ["Beaujolais", "Loire"], keywords: ["charcuterie", "saucisson", "jambon", "terrine", "pate en croute", "rillettes", "planche"] },
  { id: "choucroute", label: "Choucroute, tarte flambée", group: "Viandes", colors: { blanc: 3 }, grapes: ["Riesling", "Pinot gris", "Sylvaner"], regions: ["Alsace"], keywords: ["choucroute", "tarte flambee", "flammekueche", "baeckeoffe", "saucisse"] },
  { id: "fruits-de-mer", label: "Huîtres, fruits de mer", group: "Poissons et mer", colors: { blanc: 3, effervescent: 2 }, grapes: ["Melon de Bourgogne", "Sauvignon blanc", "Chardonnay", "Picpoul"], regions: ["Loire"], appellations: ["Chablis", "Muscadet", "Muscadet Sèvre et Maine", "Sancerre", "Entre-deux-Mers"], keywords: ["huitre", "huitres", "fruits de mer", "moules", "coquillages", "plateau", "bulots", "palourdes"] },
  { id: "crustaces", label: "Homard, Saint-Jacques", group: "Poissons et mer", colors: { blanc: 3, effervescent: 2 }, grapes: ["Chardonnay", "Chenin", "Viognier"], regions: ["Bourgogne", "Champagne", "Loire"], appellations: ["Meursault", "Condrieu", "Savennières"], keywords: ["homard", "langouste", "saint jacques", "coquilles", "crevettes", "gambas", "langoustines", "crabe"] },
  { id: "poisson-grille", label: "Poisson grillé", group: "Poissons et mer", colors: { blanc: 3, rose: 1.5 }, grapes: ["Sauvignon blanc", "Chenin", "Vermentino", "Chardonnay"], regions: ["Loire", "Provence", "Corse"], appellations: ["Cassis", "Pouilly-Fumé", "Sancerre"], keywords: ["poisson", "bar", "dorade", "loup", "sardines", "maquereau", "grille", "plancha"] },
  { id: "poisson-sauce", label: "Poisson en sauce", group: "Poissons et mer", colors: { blanc: 3 }, grapes: ["Chardonnay", "Chenin", "Viognier"], regions: ["Bourgogne", "Loire", "Rhône"], keywords: ["beurre blanc", "turbot", "lotte", "sole", "cabillaud", "sauce", "quenelles", "bouillabaisse"] },
  { id: "saumon-thon", label: "Saumon, thon", group: "Poissons et mer", colors: { blanc: 2, rose: 2, rouge: 1.5 }, grapes: ["Pinot noir", "Chardonnay", "Grenache", "Gamay"], regions: ["Bourgogne", "Loire", "Provence"], keywords: ["saumon", "thon", "tataki", "gravlax"] },
  { id: "chevre", label: "Chèvre", group: "Fromages", colors: { blanc: 3 }, grapes: ["Sauvignon blanc", "Chenin"], regions: ["Loire"], appellations: ["Sancerre", "Pouilly-Fumé", "Menetou-Salon"], keywords: ["chevre", "crottin", "selles", "sainte maure", "valencay"] },
  { id: "pate-dure", label: "Comté, pâtes dures", group: "Fromages", colors: { blanc: 3, rouge: 1.5 }, grapes: ["Chardonnay", "Savagnin"], regions: ["Jura", "Bourgogne"], appellations: ["Vin jaune", "Arbois", "Château-Chalon"], keywords: ["comte", "beaufort", "gruyere", "parmesan", "mimolette", "cantal", "tomme", "raclette", "fondue"] },
  { id: "croute-fleurie", label: "Brie, camembert", group: "Fromages", colors: { rouge: 2, effervescent: 2, blanc: 1.5 }, grapes: ["Pinot noir", "Gamay", "Chardonnay"], regions: ["Champagne", "Bourgogne", "Loire"], keywords: ["camembert", "brie", "coulommiers", "chaource"] },
  { id: "croute-lavee", label: "Munster, époisses", group: "Fromages", colors: { blanc: 2.5, liquoreux: 1.5, rouge: 1 }, grapes: ["Gewurztraminer", "Pinot gris", "Chardonnay"], regions: ["Alsace", "Bourgogne"], keywords: ["munster", "epoisses", "maroilles", "livarot", "reblochon", "mont d or", "vacherin"] },
  { id: "bleu", label: "Roquefort, bleus", group: "Fromages", colors: { liquoreux: 3 }, grapes: ["Sémillon", "Muscat", "Grenache"], regions: ["Bordeaux", "Roussillon"], appellations: ["Sauternes", "Barsac", "Banyuls", "Maury"], keywords: ["roquefort", "bleu", "fourme", "gorgonzola", "stilton"] },
  { id: "foie-gras", label: "Foie gras", group: "Apéritif et monde", colors: { liquoreux: 3, effervescent: 1.5, blanc: 1.5 }, grapes: ["Sémillon", "Chenin", "Gewurztraminer", "Petit manseng"], regions: ["Sud-Ouest", "Loire", "Alsace"], appellations: ["Sauternes", "Jurançon", "Monbazillac", "Coteaux du Layon"], keywords: ["foie gras"] },
  { id: "aperitif", label: "Apéritif", group: "Apéritif et monde", colors: { effervescent: 3, blanc: 2, rose: 1.5 }, grapes: ["Chardonnay", "Chenin", "Riesling"], regions: ["Champagne", "Loire", "Alsace"], keywords: ["aperitif", "apero", "amuse bouche", "gougeres", "tapas", "toast"] },
  { id: "mediterraneen", label: "Cuisine d'été, méditerranéenne", group: "Apéritif et monde", colors: { rose: 3, rouge: 1.5, blanc: 1.5 }, grapes: ["Grenache", "Cinsault", "Mourvèdre", "Vermentino"], regions: ["Provence", "Corse", "Languedoc"], keywords: ["ratatouille", "mediterraneen", "provencal", "salade", "pizza", "grillades d ete", "pates", "tomate", "mezze"] },
  { id: "asiatique", label: "Cuisine asiatique, épicée", group: "Apéritif et monde", colors: { blanc: 3, rose: 1.5, effervescent: 1 }, grapes: ["Riesling", "Gewurztraminer", "Pinot gris"], regions: ["Alsace"], keywords: ["asiatique", "thai", "indien", "curry", "epice", "sushi", "chinois", "wok", "japonais", "vietnamien", "pad thai"] },
  { id: "chocolat", label: "Dessert au chocolat", group: "Desserts", colors: { liquoreux: 3, rouge: 1 }, grapes: ["Grenache"], regions: ["Roussillon"], appellations: ["Banyuls", "Maury", "Rivesaltes"], keywords: ["chocolat", "fondant", "brownie", "mousse au chocolat", "foret noire"] },
  { id: "dessert-fruits", label: "Tarte, dessert fruité", group: "Desserts", colors: { liquoreux: 3, effervescent: 2 }, grapes: ["Muscat", "Chenin", "Sémillon"], regions: ["Loire", "Rhône", "Bordeaux"], keywords: ["tarte", "fruits", "pomme", "poire", "abricot", "citron", "dessert", "gateau", "tatin", "crumble", "galette"] },
];

export const dishById = (id: string | null | undefined) => DISHES.find((d) => d.id === id);

/** Plats reconnus dans une saisie libre (« magret aux cerises » → canard). */
export function matchDishes(query: string): Dish[] {
  const q = ` ${normalize(query)} `;
  if (q.trim().length < 3) return [];
  return DISHES.map((d) => ({
    d,
    hits: [d.label, ...d.keywords].filter((k) => {
      const n = normalize(k);
      return q.includes(` ${n} `) || q.includes(` ${n}s `) || (n.length >= 4 && n.startsWith(q.trim()));
    }).length,
  }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .map((x) => x.d);
}

const has = (list: string[] | undefined, value: string | undefined) =>
  !!value && !!list?.some((x) => normalize(x) === normalize(value));

/** Qualité de l'accord seul, sans tenir compte de la maturité de la bouteille. */
function matchScore(dish: Dish, wine: Wine) {
  const color = dish.colors[wine.color] ?? 0;
  const grape = wine.grapes.find((g) => has(dish.grapes, g));
  const appellation = has(dish.appellations, wine.appellation) ? wine.appellation : undefined;
  const region = has(dish.regions, wine.region) ? wine.region : undefined;
  let score = color;
  if (color > 0) score += (grape ? 1.5 : 0) + (appellation ? 1.5 : region ? 1 : 0);
  return { score, color, grape, appellation, region };
}

const MATURITY: Record<DrinkStatus, { bonus: number; label?: string }> = {
  apogee: { bonus: 1, label: "à son apogée" },
  urgent: { bonus: 1.2, label: "à boire vite" },
  pret: { bonus: 0.6, label: "prêt à boire" },
  inconnu: { bonus: 0 },
  passe: { bonus: -0.5, label: "peut-être passé" },
  garde: { bonus: -1.5, label: "encore jeune" },
};

export interface Suggestion {
  wine: Wine;
  score: number;
  status: DrinkStatus;
  reasons: string[];
}

/** Bouteilles de la cave à ouvrir avec ce plat, les meilleurs accords et les plus mûres d'abord. */
export function suggestWines(state: CellarState, dish: Dish, limit = 6, year = new Date().getFullYear()): Suggestion[] {
  return state.wines
    .filter((w) => w.quantity > 0)
    .map((wine) => {
      const m = matchScore(dish, wine);
      const status = drinkStatus(wine, year);
      const reasons = [m.grape, m.appellation ?? m.region, MATURITY[status].label].filter((r): r is string => !!r);
      if (reasons.length === 0 || (reasons.length === 1 && MATURITY[status].label)) reasons.unshift(m.color >= 3 ? "l'accord classique" : "un bon accord");
      return { wine, score: m.color >= 2 || m.score >= 3 ? m.score + MATURITY[status].bonus : 0, status, reasons };
    })
    .filter((s) => s.score >= 2.5)
    .sort((a, b) => b.score - a.score || b.wine.quantity - a.wine.quantity)
    .slice(0, limit);
}

/** Conseil générique quand la cave n'a rien d'adapté : « Rouge — Malbec, Tannat ; Sud-Ouest ». */
export function idealFor(dish: Dish): string {
  const labels: Record<WineColor, string> = { rouge: "rouge", blanc: "blanc", rose: "rosé", effervescent: "effervescent", liquoreux: "liquoreux", autre: "autre" };
  const colors = (Object.entries(dish.colors) as [WineColor, number][])
    .filter(([, w]) => w >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => labels[c]);
  const where = [...(dish.appellations ?? []).slice(0, 3), ...dish.regions.slice(0, 2)];
  return `Un ${colors.join(" ou ")} : ${dish.grapes.slice(0, 3).join(", ")}${where.length ? ` (${where.join(", ")})` : ""}.`;
}

/** Plats qui mettent ce vin en valeur. */
export function dishesForWine(wine: Wine, limit = 5): Dish[] {
  return DISHES.map((d) => ({ d, s: matchScore(d, wine) }))
    .filter((x) => x.s.color >= 2 && x.s.score >= 3)
    .sort((a, b) => b.s.score - a.s.score)
    .slice(0, limit)
    .map((x) => x.d);
}
