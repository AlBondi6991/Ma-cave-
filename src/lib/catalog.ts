/** Suggestions de saisie (listes non exhaustives, l'utilisateur peut taper autre chose). */
export const REGIONS = [
  "Alsace",
  "Beaujolais",
  "Bordeaux",
  "Bourgogne",
  "Champagne",
  "Corse",
  "Jura",
  "Languedoc",
  "Loire",
  "Provence",
  "Rhône",
  "Roussillon",
  "Savoie",
  "Sud-Ouest",
];

export const COUNTRIES = ["France", "Italie", "Espagne", "Portugal", "Allemagne", "Autriche", "Suisse", "États-Unis", "Argentine", "Chili", "Afrique du Sud", "Australie", "Nouvelle-Zélande"];

export const GRAPES = [
  "Cabernet franc",
  "Cabernet sauvignon",
  "Carignan",
  "Chardonnay",
  "Chenin",
  "Cinsault",
  "Gamay",
  "Gewurztraminer",
  "Grenache",
  "Malbec",
  "Merlot",
  "Mourvèdre",
  "Muscat",
  "Petit verdot",
  "Pinot gris",
  "Pinot meunier",
  "Pinot noir",
  "Riesling",
  "Sauvignon blanc",
  "Sémillon",
  "Syrah",
  "Viognier",
];

type Col = "rouge" | "blanc" | "rose" | "effervescent" | "liquoreux";

/** Appellations courantes : région et couleur dominante (quand elle est évidente). */
export const APPELLATIONS: { name: string; region: string; color?: Col }[] = [
  // Bordeaux
  ...["Pauillac", "Margaux", "Saint-Julien", "Saint-Estèphe", "Pessac-Léognan", "Saint-Émilion grand cru", "Saint-Émilion", "Pomerol", "Lalande-de-Pomerol", "Fronsac", "Haut-Médoc", "Médoc", "Listrac-Médoc", "Moulis", "Côtes de Bourg", "Castillon Côtes de Bordeaux", "Graves"].map((name) => ({ name, region: "Bordeaux", color: "rouge" as Col })),
  { name: "Sauternes", region: "Bordeaux", color: "liquoreux" },
  { name: "Barsac", region: "Bordeaux", color: "liquoreux" },
  { name: "Entre-deux-Mers", region: "Bordeaux", color: "blanc" },
  { name: "Bordeaux supérieur", region: "Bordeaux", color: "rouge" },
  { name: "Bordeaux", region: "Bordeaux" },
  // Bourgogne
  ...["Gevrey-Chambertin", "Chambolle-Musigny", "Vosne-Romanée", "Nuits-Saint-Georges", "Morey-Saint-Denis", "Clos de Vougeot", "Pommard", "Volnay", "Santenay", "Marsannay", "Fixin", "Mercurey", "Givry", "Savigny-lès-Beaune", "Aloxe-Corton", "Corton"].map((name) => ({ name, region: "Bourgogne", color: "rouge" as Col })),
  ...["Chablis", "Meursault", "Puligny-Montrachet", "Chassagne-Montrachet", "Corton-Charlemagne", "Pouilly-Fuissé", "Saint-Véran", "Mâcon-Villages", "Rully", "Saint-Aubin", "Viré-Clessé"].map((name) => ({ name, region: "Bourgogne", color: "blanc" as Col })),
  { name: "Bourgogne", region: "Bourgogne" },
  { name: "Crémant de Bourgogne", region: "Bourgogne", color: "effervescent" },
  // Beaujolais
  ...["Morgon", "Fleurie", "Moulin-à-Vent", "Brouilly", "Côte de Brouilly", "Juliénas", "Chiroubles", "Saint-Amour", "Chénas", "Régnié", "Beaujolais-Villages", "Beaujolais"].map((name) => ({ name, region: "Beaujolais", color: "rouge" as Col })),
  // Rhône
  ...["Côte-Rôtie", "Hermitage", "Crozes-Hermitage", "Saint-Joseph", "Cornas", "Châteauneuf-du-Pape", "Gigondas", "Vacqueyras", "Rasteau", "Cairanne", "Lirac", "Vinsobres", "Côtes du Rhône Villages", "Côtes du Rhône", "Ventoux"].map((name) => ({ name, region: "Rhône", color: "rouge" as Col })),
  { name: "Condrieu", region: "Rhône", color: "blanc" },
  { name: "Tavel", region: "Rhône", color: "rose" },
  { name: "Muscat de Beaumes-de-Venise", region: "Rhône", color: "liquoreux" },
  // Loire
  ...["Sancerre", "Pouilly-Fumé", "Menetou-Salon", "Quincy", "Reuilly", "Muscadet Sèvre et Maine", "Muscadet", "Savennières", "Vouvray", "Montlouis-sur-Loire", "Touraine"].map((name) => ({ name, region: "Loire", color: "blanc" as Col })),
  ...["Chinon", "Bourgueil", "Saint-Nicolas-de-Bourgueil", "Saumur-Champigny", "Anjou-Villages"].map((name) => ({ name, region: "Loire", color: "rouge" as Col })),
  ...["Coteaux du Layon", "Bonnezeaux", "Quarts de Chaume"].map((name) => ({ name, region: "Loire", color: "liquoreux" as Col })),
  { name: "Crémant de Loire", region: "Loire", color: "effervescent" },
  // Alsace
  { name: "Crémant d'Alsace", region: "Alsace", color: "effervescent" },
  { name: "Alsace grand cru", region: "Alsace", color: "blanc" },
  { name: "Alsace", region: "Alsace", color: "blanc" },
  // Champagne
  { name: "Champagne", region: "Champagne", color: "effervescent" },
  { name: "Coteaux champenois", region: "Champagne" },
  // Jura / Savoie
  { name: "Vin jaune", region: "Jura", color: "blanc" },
  { name: "Château-Chalon", region: "Jura", color: "blanc" },
  { name: "Arbois", region: "Jura" },
  { name: "Côtes du Jura", region: "Jura" },
  { name: "Crémant du Jura", region: "Jura", color: "effervescent" },
  { name: "Savoie", region: "Savoie" },
  // Sud
  ...["Bandol", "Côtes de Provence", "Coteaux d'Aix-en-Provence", "Cassis", "Bellet"].map((name) => ({ name, region: "Provence", color: (name === "Bandol" ? "rouge" : name === "Cassis" ? "blanc" : "rose") as Col })),
  ...["Pic Saint-Loup", "Faugères", "Saint-Chinian", "Minervois", "Corbières", "Terrasses du Larzac", "Languedoc", "Fitou"].map((name) => ({ name, region: "Languedoc", color: "rouge" as Col })),
  { name: "Limoux", region: "Languedoc", color: "effervescent" },
  { name: "Collioure", region: "Roussillon", color: "rouge" },
  { name: "Côtes du Roussillon", region: "Roussillon", color: "rouge" },
  { name: "Banyuls", region: "Roussillon", color: "liquoreux" },
  { name: "Maury", region: "Roussillon", color: "liquoreux" },
  { name: "Rivesaltes", region: "Roussillon", color: "liquoreux" },
  // Sud-Ouest
  ...["Cahors", "Madiran", "Irouléguy", "Marcillac", "Gaillac", "Bergerac", "Fronton"].map((name) => ({ name, region: "Sud-Ouest", color: "rouge" as Col })),
  { name: "Jurançon", region: "Sud-Ouest", color: "liquoreux" },
  { name: "Monbazillac", region: "Sud-Ouest", color: "liquoreux" },
  { name: "Pacherenc du Vic-Bilh", region: "Sud-Ouest", color: "liquoreux" },
  // Corse
  { name: "Patrimonio", region: "Corse" },
  { name: "Ajaccio", region: "Corse" },
];

export const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[-’']/g, " ").replace(/\s+/g, " ").trim();

export function findAppellation(name: string | undefined) {
  if (!name) return undefined;
  const n = normalize(name);
  return APPELLATIONS.find((a) => normalize(a.name) === n);
}
