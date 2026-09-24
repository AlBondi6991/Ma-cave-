import { describe, expect, it } from "vitest";
import { addWine, emptyState, type WineInput } from "./cellar";
import { parseLabelText, sanitize } from "./labelScan";
import { dishById, dishesForWine, matchDishes, suggestWines } from "./pairing";

describe("lecture d'étiquette (OCR)", () => {
  it("extrait domaine, millésime, appellation, région, couleur et format", () => {
    const text = `GRAND VIN DE BORDEAUX
CHATEAU LYNCH-
BAGES
2016
PAUILLAC
APPELLATION PAUILLAC CONTRÔLÉE
MIS EN BOUTEILLE AU CHÂTEAU  75 cl  13,5% vol`;
    expect(parseLabelText(text, 2026)).toMatchObject({
      producer: "Chateau Lynch-Bages",
      vintage: 2016,
      appellation: "Pauillac",
      region: "Bordeaux",
      country: "France",
      color: "rouge",
      format: "75 cl",
    });
  });

  it("préfère l'appellation la plus précise et repère les effervescents", () => {
    const f = parseLabelText("Domaine Dupont\nCrémant de Bourgogne\nBrut", 2026);
    expect(f.appellation).toBe("Crémant de Bourgogne");
    expect(f.color).toBe("effervescent");
  });

  it("recolle un nom de domaine coupé après une particule", () => {
    expect(parseLabelText("DOMAINE DE LA\nJANASSE\n2019\nCHÂTEAUNEUF-DU-PAPE", 2026).producer).toBe("Domaine De La Janasse");
  });

  it("reconnaît une appellation mal lue par l'OCR", () => {
    const f = parseLabelText("Maison Tramier\nChdteauneuf du Papc\n2020", 2026);
    expect(f.appellation).toBe("Châteauneuf-du-Pape");
    expect(f.region).toBe("Rhône");
    expect(f.producer).toBe("Maison Tramier");
  });

  it("ignore un millésime dans le futur et reconnaît le magnum", () => {
    const f = parseLabelText("Domaine X  Morgon  2031  2019  1,5 L", 2026);
    expect(f.vintage).toBe(2019);
    expect(f.format).toBe("Magnum 1,5 L");
  });

  it("nettoie une réponse de Claude incohérente", () => {
    const f = sanitize({ producer: "  Dom  ", vintage: "2015", color: "violet", format: "2 L", drinkFrom: 2030, drinkUntil: 2025, grapes: ["Syrah", 3, ""] });
    expect(f).toMatchObject({ producer: "Dom", vintage: 2015, grapes: ["Syrah"] });
    expect(f.color).toBeUndefined();
    expect(f.format).toBeUndefined();
    expect(f.drinkFrom).toBeUndefined();
    expect(f.drinkUntil).toBeUndefined();
  });
});

const wine = (over: Partial<WineInput>): WineInput => ({ producer: "D", name: "", color: "rouge", grapes: [], format: "75 cl", quantity: 2, ...over });

describe("accords mets-vins", () => {
  it("reconnaît un plat en saisie libre", () => {
    expect(matchDishes("magret aux cerises")[0].id).toBe("canard");
    expect(matchDishes("des huîtres")[0].id).toBe("fruits-de-mer");
  });

  it("propose les vins adaptés, les plus mûrs d'abord, jamais un rouge sur des huîtres", () => {
    let s = emptyState();
    s = addWine(s, wine({ producer: "Cahors jeune", appellation: "Cahors", region: "Sud-Ouest", grapes: ["Malbec"], drinkFrom: 2032 }), "jeune");
    s = addWine(s, wine({ producer: "Cahors prêt", appellation: "Cahors", region: "Sud-Ouest", grapes: ["Malbec"], drinkFrom: 2020, peak: 2026, drinkUntil: 2035 }), "pret");
    s = addWine(s, wine({ producer: "Chablis", color: "blanc", appellation: "Chablis", region: "Bourgogne", grapes: ["Chardonnay"] }), "chablis");
    s = addWine(s, wine({ producer: "Épuisé", appellation: "Cahors", quantity: 0 }), "vide");

    const canard = suggestWines(s, dishById("canard")!, 6, 2026).map((x) => x.wine.id);
    expect(canard).toEqual(["pret", "jeune"]);

    const huitres = suggestWines(s, dishById("fruits-de-mer")!, 6, 2026).map((x) => x.wine.id);
    expect(huitres).toEqual(["chablis"]);
  });

  it("suggère des plats pour un vin", () => {
    const ids = dishesForWine({ ...wine({ color: "blanc", appellation: "Sancerre", region: "Loire", grapes: ["Sauvignon blanc"] }), id: "x", createdAt: "" }).map((d) => d.id);
    expect(ids).toContain("chevre");
    expect(ids).toContain("fruits-de-mer");
  });
});
