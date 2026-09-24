export type WineColor = "rouge" | "blanc" | "rose" | "effervescent" | "liquoreux" | "autre";

export const COLORS: { value: WineColor; label: string; hex: string }[] = [
  { value: "rouge", label: "Rouge", hex: "#8e1b36" },
  { value: "blanc", label: "Blanc", hex: "#e6cf7a" },
  { value: "rose", label: "Rosé", hex: "#f2a2a8" },
  { value: "effervescent", label: "Effervescent", hex: "#cfd8a3" },
  { value: "liquoreux", label: "Liquoreux", hex: "#d99a2b" },
  { value: "autre", label: "Autre", hex: "#8a8178" },
];

export const FORMATS = ["37,5 cl", "50 cl", "75 cl", "Magnum 1,5 L", "Jéroboam 3 L", "Autre"] as const;

export interface Wine {
  id: string;
  producer: string; // domaine / château
  name: string; // cuvée
  vintage?: number; // millésime, absent pour un non-millésimé
  color: WineColor;
  country?: string;
  region?: string;
  appellation?: string;
  grapes: string[];
  format: string;
  quantity: number; // bouteilles en stock
  purchasePrice?: number; // prix unitaire d'achat
  value?: number; // valeur estimée actuelle par bouteille
  purchaseDate?: string; // ISO date
  supplier?: string;
  drinkFrom?: number; // année
  peak?: number; // année d'apogée
  drinkUntil?: number; // année
  notes?: string;
  createdAt: string;
}

export interface Rack {
  id: string;
  name: string;
  rows: number;
  cols: number;
}

/** Une bouteille rangée dans une case d'un casier. */
export interface Slot {
  rackId: string;
  row: number;
  col: number;
  wineId: string;
}

export type MovementType = "entree" | "sortie";
export type ExitReason = "bu" | "offert" | "vendu" | "casse";

export const EXIT_REASONS: { value: ExitReason; label: string }[] = [
  { value: "bu", label: "Bu" },
  { value: "offert", label: "Offert" },
  { value: "vendu", label: "Vendu" },
  { value: "casse", label: "Cassé / bouchonné" },
];

export interface Movement {
  id: string;
  wineId: string;
  type: MovementType;
  quantity: number;
  date: string; // ISO date
  reason?: ExitReason;
  note?: string;
}

export interface Tasting {
  id: string;
  wineId: string;
  date: string; // ISO date
  rating?: number; // sur 20
  eye?: string;
  nose?: string;
  palate?: string;
  pairing?: string;
  comment?: string;
}

export interface CellarState {
  version: 1;
  wines: Wine[];
  racks: Rack[];
  slots: Slot[];
  movements: Movement[];
  tastings: Tasting[];
}
