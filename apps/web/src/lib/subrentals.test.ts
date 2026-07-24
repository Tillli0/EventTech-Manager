import { describe, it, expect } from "vitest";
import { subrentalItemTotal, subrentalTotals, isActiveSubrentalStatus } from "@/lib/subrentals";

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
