import type { CellarState, ExitReason, Rack, Slot, Tasting, Wine } from "./types";

export function newId(): string {
  return crypto.randomUUID();
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export const emptyState = (): CellarState => ({
  version: 1,
  wines: [],
  racks: [],
  slots: [],
  movements: [],
  tastings: [],
});

export function slotsOf(state: CellarState, wineId: string): Slot[] {
  return state.slots.filter((s) => s.wineId === wineId);
}

export function unplacedCount(state: CellarState, wineId: string): number {
  const wine = state.wines.find((w) => w.id === wineId);
  if (!wine) return 0;
  return Math.max(0, wine.quantity - slotsOf(state, wineId).length);
}

export function slotAt(state: CellarState, rackId: string, row: number, col: number): Slot | undefined {
  return state.slots.find((s) => s.rackId === rackId && s.row === row && s.col === col);
}

const sameSlot = (a: Pick<Slot, "rackId" | "row" | "col">, b: Pick<Slot, "rackId" | "row" | "col">) =>
  a.rackId === b.rackId && a.row === b.row && a.col === b.col;

/** Retire les emplacements en trop quand le stock d'un vin est inférieur au nombre de bouteilles rangées. */
function trimSlots(state: CellarState, wineId: string): CellarState {
  const wine = state.wines.find((w) => w.id === wineId);
  const placed = slotsOf(state, wineId);
  const excess = placed.length - (wine?.quantity ?? 0);
  if (excess <= 0) return state;
  const drop = new Set(placed.slice(-excess));
  return { ...state, slots: state.slots.filter((s) => !drop.has(s)) };
}

export type WineInput = Omit<Wine, "id" | "createdAt">;

export function addWine(state: CellarState, input: WineInput, id = newId()): CellarState {
  const wine: Wine = { ...input, id, createdAt: new Date().toISOString() };
  const movements =
    wine.quantity > 0
      ? [
          ...state.movements,
          {
            id: newId(),
            wineId: id,
            type: "entree" as const,
            quantity: wine.quantity,
            date: wine.purchaseDate || today(),
          },
        ]
      : state.movements;
  return { ...state, wines: [...state.wines, wine], movements };
}

/** Met à jour la fiche d'un vin. Le stock ne se modifie pas ici : passer par addBottles / removeBottles. */
export function updateWine(state: CellarState, wine: Wine): CellarState {
  return {
    ...state,
    wines: state.wines.map((w) => (w.id === wine.id ? { ...wine, quantity: w.quantity } : w)),
  };
}

export function deleteWine(state: CellarState, wineId: string): CellarState {
  return {
    ...state,
    wines: state.wines.filter((w) => w.id !== wineId),
    slots: state.slots.filter((s) => s.wineId !== wineId),
    movements: state.movements.filter((m) => m.wineId !== wineId),
    tastings: state.tastings.filter((t) => t.wineId !== wineId),
  };
}

export function addBottles(state: CellarState, wineId: string, quantity: number, date = today()): CellarState {
  if (quantity <= 0) return state;
  return {
    ...state,
    wines: state.wines.map((w) => (w.id === wineId ? { ...w, quantity: w.quantity + quantity } : w)),
    movements: [...state.movements, { id: newId(), wineId, type: "entree", quantity, date }],
  };
}

export interface RemoveOptions {
  reason: ExitReason;
  date?: string;
  note?: string;
  /** Case d'où sort la bouteille, libérée en priorité. */
  from?: Pick<Slot, "rackId" | "row" | "col">;
}

export function removeBottles(
  state: CellarState,
  wineId: string,
  quantity: number,
  { reason, date = today(), note, from }: RemoveOptions,
): CellarState {
  const wine = state.wines.find((w) => w.id === wineId);
  if (!wine || quantity <= 0) return state;
  const qty = Math.min(quantity, wine.quantity);
  if (qty === 0) return state;

  let slots = state.slots;
  // On libère d'abord les bouteilles hors casier, puis la case indiquée, puis les autres cases.
  if (from) slots = slots.filter((s) => !(sameSlot(s, from) && s.wineId === wineId));

  const next: CellarState = {
    ...state,
    slots,
    wines: state.wines.map((w) => (w.id === wineId ? { ...w, quantity: w.quantity - qty } : w)),
    movements: [...state.movements, { id: newId(), wineId, type: "sortie", quantity: qty, date, reason, note }],
  };
  return trimSlots(next, wineId);
}

export function placeBottle(state: CellarState, wineId: string, rackId: string, row: number, col: number): CellarState {
  if (slotAt(state, rackId, row, col)) return state;
  if (unplacedCount(state, wineId) <= 0) return state;
  return { ...state, slots: [...state.slots, { rackId, row, col, wineId }] };
}

export function unplaceBottle(state: CellarState, rackId: string, row: number, col: number): CellarState {
  return { ...state, slots: state.slots.filter((s) => !sameSlot(s, { rackId, row, col })) };
}

/** Déplace une bouteille vers une autre case ; échange les deux bouteilles si la case cible est occupée. */
export function moveBottle(
  state: CellarState,
  from: Pick<Slot, "rackId" | "row" | "col">,
  to: Pick<Slot, "rackId" | "row" | "col">,
): CellarState {
  const source = slotAt(state, from.rackId, from.row, from.col);
  if (!source || sameSlot(from, to)) return state;
  const target = slotAt(state, to.rackId, to.row, to.col);
  return {
    ...state,
    slots: state.slots.map((s) => {
      if (s === source) return { ...s, ...to };
      if (s === target) return { ...s, ...from };
      return s;
    }),
  };
}

export function addRack(state: CellarState, rack: Omit<Rack, "id">): CellarState {
  return { ...state, racks: [...state.racks, { ...rack, id: newId() }] };
}

/** Met à jour un casier ; les bouteilles hors des nouvelles dimensions repassent hors casier. */
export function updateRack(state: CellarState, rack: Rack): CellarState {
  return {
    ...state,
    racks: state.racks.map((r) => (r.id === rack.id ? rack : r)),
    slots: state.slots.filter((s) => s.rackId !== rack.id || (s.row < rack.rows && s.col < rack.cols)),
  };
}

export function deleteRack(state: CellarState, rackId: string): CellarState {
  return {
    ...state,
    racks: state.racks.filter((r) => r.id !== rackId),
    slots: state.slots.filter((s) => s.rackId !== rackId),
  };
}

export function addTasting(state: CellarState, tasting: Omit<Tasting, "id">): CellarState {
  return { ...state, tastings: [...state.tastings, { ...tasting, id: newId() }] };
}

export function deleteTasting(state: CellarState, id: string): CellarState {
  return { ...state, tastings: state.tastings.filter((t) => t.id !== id) };
}

export function wineLabel(wine: Pick<Wine, "producer" | "name" | "vintage">): string {
  const main = [wine.producer, wine.name].filter(Boolean).join(" – ");
  return wine.vintage ? `${main} ${wine.vintage}` : `${main} NM`;
}

/** Valide grossièrement un fichier de sauvegarde avant import. */
export function parseBackup(json: string): CellarState {
  const data = JSON.parse(json);
  if (!data || data.version !== 1 || !Array.isArray(data.wines)) {
    throw new Error("Ce fichier n'est pas une sauvegarde Ma Cave valide.");
  }
  return {
    ...emptyState(),
    ...data,
  };
}
