import { describe, expect, it } from "vitest";
import {
  addBottles,
  addRack,
  addWine,
  deleteRack,
  deleteWine,
  emptyState,
  moveBottle,
  placeBottle,
  removeBottles,
  unplacedCount,
  updateRack,
  updateWine,
  type WineInput,
} from "./cellar";
import { drinkStatus } from "./status";
import { consumptionByMonth, totals, toDrinkNow } from "./stats";

const input = (over: Partial<WineInput> = {}): WineInput => ({
  producer: "Domaine Test",
  name: "Cuvée",
  vintage: 2018,
  color: "rouge",
  grapes: [],
  format: "75 cl",
  quantity: 3,
  ...over,
});

function setup() {
  let s = addWine(emptyState(), input(), "w1");
  s = addRack(s, { name: "Casier", rows: 2, cols: 2 });
  return { s, rackId: s.racks[0].id };
}

describe("stock", () => {
  it("enregistre une entrée à la création", () => {
    const { s } = setup();
    expect(s.movements).toMatchObject([{ wineId: "w1", type: "entree", quantity: 3 }]);
  });

  it("ajoute et retire des bouteilles sans descendre sous zéro", () => {
    let { s } = setup();
    s = addBottles(s, "w1", 2);
    expect(s.wines[0].quantity).toBe(5);
    s = removeBottles(s, "w1", 10, { reason: "bu" });
    expect(s.wines[0].quantity).toBe(0);
    expect(s.movements.at(-1)).toMatchObject({ type: "sortie", quantity: 5, reason: "bu" });
  });

  it("ne change pas le stock via la fiche", () => {
    const { s } = setup();
    const next = updateWine(s, { ...s.wines[0], quantity: 99, name: "Autre" });
    expect(next.wines[0]).toMatchObject({ quantity: 3, name: "Autre" });
  });

  it("supprime tout ce qui dépend d'un vin", () => {
    let { s, rackId } = setup();
    s = placeBottle(s, "w1", rackId, 0, 0);
    s = deleteWine(s, "w1");
    expect([s.wines, s.slots, s.movements]).toEqual([[], [], []]);
  });
});

describe("plan de cave", () => {
  it("ne range pas plus de bouteilles qu'il n'y en a", () => {
    let { s, rackId } = setup();
    s = placeBottle(s, "w1", rackId, 0, 0);
    s = placeBottle(s, "w1", rackId, 0, 0); // case occupée
    s = placeBottle(s, "w1", rackId, 0, 1);
    s = placeBottle(s, "w1", rackId, 1, 0);
    s = placeBottle(s, "w1", rackId, 1, 1); // plus de bouteille disponible
    expect(s.slots).toHaveLength(3);
    expect(unplacedCount(s, "w1")).toBe(0);
  });

  it("sort d'abord les bouteilles hors casier", () => {
    let { s, rackId } = setup();
    s = placeBottle(s, "w1", rackId, 0, 0);
    s = removeBottles(s, "w1", 2, { reason: "bu" });
    expect(s.slots).toHaveLength(1);
    s = removeBottles(s, "w1", 1, { reason: "bu" });
    expect(s.slots).toHaveLength(0);
  });

  it("libère la case d'où sort la bouteille", () => {
    let { s, rackId } = setup();
    s = placeBottle(s, "w1", rackId, 0, 0);
    s = placeBottle(s, "w1", rackId, 1, 1);
    s = removeBottles(s, "w1", 1, { reason: "bu", from: { rackId, row: 1, col: 1 } });
    expect(s.slots).toMatchObject([{ row: 0, col: 0 }]);
  });

  it("échange deux bouteilles lors d'un déplacement sur une case occupée", () => {
    let { s, rackId } = setup();
    s = addWine(s, input({ quantity: 1 }), "w2");
    s = placeBottle(s, "w1", rackId, 0, 0);
    s = placeBottle(s, "w2", rackId, 0, 1);
    s = moveBottle(s, { rackId, row: 0, col: 0 }, { rackId, row: 0, col: 1 });
    expect(s.slots.find((x) => x.wineId === "w1")).toMatchObject({ row: 0, col: 1 });
    expect(s.slots.find((x) => x.wineId === "w2")).toMatchObject({ row: 0, col: 0 });
  });

  it("sort les bouteilles hors limites quand un casier rétrécit ou disparaît", () => {
    let { s, rackId } = setup();
    s = placeBottle(s, "w1", rackId, 0, 0);
    s = placeBottle(s, "w1", rackId, 1, 1);
    s = updateRack(s, { ...s.racks[0], rows: 1, cols: 1 });
    expect(s.slots).toHaveLength(1);
    s = deleteRack(s, rackId);
    expect(s.slots).toHaveLength(0);
  });
});

describe("fenêtre de dégustation", () => {
  const w = { drinkFrom: 2024, peak: 2027, drinkUntil: 2032 };
  it.each([
    [2022, "garde"],
    [2024, "pret"],
    [2026, "apogee"],
    [2028, "apogee"],
    [2030, "pret"],
    [2031, "urgent"],
    [2032, "urgent"],
    [2033, "passe"],
  ])("en %i : %s", (year, expected) => {
    expect(drinkStatus(w, year)).toBe(expected);
  });

  it("sans information : inconnu", () => {
    expect(drinkStatus({}, 2026)).toBe("inconnu");
  });
});

describe("statistiques", () => {
  it("valorise le stock et classe les bouteilles à boire", () => {
    let s = addWine(emptyState(), input({ quantity: 2, purchasePrice: 10, value: 15, drinkFrom: 2020, drinkUntil: 2026 }), "a");
    s = addWine(s, input({ quantity: 1, purchasePrice: 20, drinkFrom: 2020, peak: 2026, drinkUntil: 2040 }), "b");
    s = addWine(s, input({ quantity: 4, drinkFrom: 2030 }), "c");
    const t = totals(s, 2026);
    expect(t).toMatchObject({ references: 3, bottles: 7, value: 50, purchase: 40, drinkable: 3 });
    expect(toDrinkNow(s, 2026).map((x) => x.wine.id)).toEqual(["a", "b"]);
  });

  it("compte les bouteilles bues par mois", () => {
    let s = addWine(emptyState(), input({ quantity: 5 }), "a");
    s = removeBottles(s, "a", 2, { reason: "bu", date: "2026-09-02" });
    s = removeBottles(s, "a", 1, { reason: "offert", date: "2026-09-03" });
    const months = consumptionByMonth(s, 2, new Date(2026, 8, 15));
    expect(months.map((m) => m.bottles)).toEqual([0, 2]);
  });
});
