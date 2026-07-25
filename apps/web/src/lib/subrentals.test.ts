import { describe, it, expect } from "vitest";
import {
  subrentalItemTotal,
  subrentalTotals,
  isActiveSubrentalStatus,
  groupSubrentalItemsByCategory,
} from "@/lib/subrentals";

describe("subrentalItemTotal", () => {
  it("multipliziert Einkaufspreis je Stück mit der Menge (kein Tage-Faktor)", () => {
    expect(subrentalItemTotal({ quantity: 3, unit_cost: 50 })).toBe(150);
  });

  it("liefert 0 bei Menge oder Preis 0", () => {
    expect(subrentalItemTotal({ quantity: 0, unit_cost: 50 })).toBe(0);
    expect(subrentalItemTotal({ quantity: 3, unit_cost: 0 })).toBe(0);
  });
});

describe("subrentalTotals", () => {
  it("summiert mehrere Positionen", () => {
    const { total } = subrentalTotals([
      { quantity: 2, unit_cost: 100 },
      { quantity: 1, unit_cost: 30 },
    ]);
    expect(total).toBe(230);
  });

  it("liefert 0 bei leerer Positionsliste", () => {
    expect(subrentalTotals([]).total).toBe(0);
  });
});

describe("isActiveSubrentalStatus", () => {
  it("storniert zählt nicht als aktiv", () => {
    expect(isActiveSubrentalStatus("storniert")).toBe(false);
  });

  it("alle anderen Status zählen als aktiv", () => {
    expect(isActiveSubrentalStatus("entwurf")).toBe(true);
    expect(isActiveSubrentalStatus("angefragt")).toBe(true);
    expect(isActiveSubrentalStatus("bestaetigt")).toBe(true);
    expect(isActiveSubrentalStatus("uebernommen")).toBe(true);
    expect(isActiveSubrentalStatus("zurueckgegeben")).toBe(true);
  });
});

describe("groupSubrentalItemsByCategory", () => {
  it("gruppiert nach Kategoriename, alphabetisch (de)", () => {
    const groups = groupSubrentalItemsByCategory([
      { id: "1", category: { name: "Licht" } },
      { id: "2", category: { name: "Beschallung" } },
      { id: "3", category: { name: "Beschallung" } },
    ]);
    expect(groups.map((g) => g.label)).toEqual(["Beschallung", "Licht"]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["2", "3"]);
    expect(groups[1].items.map((i) => i.id)).toEqual(["1"]);
  });

  it("kategorielose Positionen landen in einer Gruppe „Ohne Kategorie“ am Ende", () => {
    const groups = groupSubrentalItemsByCategory([
      { id: "1", category: { name: "Licht" } },
      { id: "2", category: null },
    ]);
    expect(groups.map((g) => g.label)).toEqual(["Licht", "Ohne Kategorie"]);
  });

  it("liefert eine leere Liste bei leerer Eingabe", () => {
    expect(groupSubrentalItemsByCategory([])).toEqual([]);
  });
});
