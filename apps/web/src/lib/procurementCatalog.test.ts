import { describe, expect, it } from "vitest";
import { buildProcurementCatalog, catalogEntryKey } from "./procurementCatalog";

function subrental(overrides: Record<string, unknown>) {
  return {
    id: "sr-1",
    job_id: "job-1",
    supplier_id: "sup-1",
    status: "bestaetigt",
    start_date: "2026-07-01",
    end_date: "2026-07-01",
    supplier: { id: "sup-1", name: "Verleiher A" },
    job: { id: "job-1", title: "Testjob" },
    items: [],
    ...overrides,
  } as never;
}

function item(overrides: Record<string, unknown>) {
  return {
    id: "item-1",
    subrental_id: "sr-1",
    device_id: null,
    category_id: null,
    description: "LED PAR 64",
    quantity: 1,
    unit_cost: 0,
    sort_order: 0,
    created_at: "2026-07-01",
    ...overrides,
  };
}

describe("catalogEntryKey", () => {
  it("nutzt device_id, wenn gesetzt", () => {
    expect(catalogEntryKey({ device_id: "dev-1", description: "Egal" })).toBe("dev:dev-1");
  });

  it("normalisiert Freitext-Bezeichnungen fürs Zusammenführen", () => {
    expect(catalogEntryKey({ device_id: null, description: "LED PAR 64" })).toBe(
      catalogEntryKey({ device_id: null, description: "LED-Par   64" }),
    );
  });
});

describe("buildProcurementCatalog", () => {
  it("führt zwei Schreibweisen derselben Freitext-Position zusammen", () => {
    const entries = buildProcurementCatalog([
      subrental({
        id: "sr-1",
        start_date: "2026-07-01",
        end_date: "2026-07-01",
        items: [item({ description: "LED PAR 64", unit_cost: 40, quantity: 2 })],
      }),
      subrental({
        id: "sr-2",
        start_date: "2026-06-01",
        end_date: "2026-06-01",
        items: [item({ description: "LED-Par 64", unit_cost: 35, quantity: 1 })],
      }),
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0].timesProcured).toBe(2);
    expect(entries[0].totalQuantity).toBe(3);
  });

  it("device_id schlägt Freitext-Normalisierung — unterschiedliche Geräte bleiben getrennt", () => {
    const entries = buildProcurementCatalog([
      subrental({ items: [item({ device_id: "dev-1", description: "LED PAR 64", unit_cost: 40 })] }),
      subrental({ items: [item({ device_id: "dev-2", description: "LED PAR 64", unit_cost: 40 })] }),
    ]);

    expect(entries).toHaveLength(2);
  });

  it("ignoriert stornierte Vorgänge", () => {
    const entries = buildProcurementCatalog([
      subrental({ status: "storniert", items: [item({ unit_cost: 40 })] }),
    ]);

    expect(entries).toHaveLength(0);
  });

  it("rechnet den Einkaufspreis auf einen Tagespreis um (Zeitraum, nicht Tagespreis wie erfasst)", () => {
    const entries = buildProcurementCatalog([
      subrental({
        start_date: "2026-07-01",
        end_date: "2026-07-03", // 3 Tage
        items: [item({ unit_cost: 90, quantity: 1 })],
      }),
    ]);

    expect(entries[0].lastProcurement.days).toBe(3);
    expect(entries[0].lastProcurement.unitCostPerDay).toBeCloseTo(30);
  });

  it("0-€-Positionen zählen für die Häufigkeit, aber nicht für lastPriced/cheapest", () => {
    const entries = buildProcurementCatalog([
      subrental({
        id: "sr-1",
        start_date: "2026-07-01",
        end_date: "2026-07-01",
        items: [item({ unit_cost: 0, quantity: 3 })], // z.B. "Fehlmenge anmieten"
      }),
    ]);

    expect(entries[0].timesProcured).toBe(1);
    expect(entries[0].totalQuantity).toBe(3);
    expect(entries[0].lastPriced).toBeNull();
    expect(entries[0].cheapest).toBeNull();
  });

  it("findet den günstigsten Partner über den Tagespreis, nicht den Gesamtpreis", () => {
    const entries = buildProcurementCatalog([
      subrental({
        id: "sr-1",
        supplier_id: "sup-teuer",
        supplier: { id: "sup-teuer", name: "Teuer GmbH" },
        start_date: "2026-07-01",
        end_date: "2026-07-01", // 1 Tag
        items: [item({ unit_cost: 40 })], // 40 €/Tag
      }),
      subrental({
        id: "sr-2",
        supplier_id: "sup-guenstig",
        supplier: { id: "sup-guenstig", name: "Günstig GmbH" },
        start_date: "2026-07-05",
        end_date: "2026-07-07", // 3 Tage
        items: [item({ unit_cost: 90 })], // 30 €/Tag — Gesamtpreis höher, Tagespreis niedriger
      }),
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0].cheapest?.supplierName).toBe("Günstig GmbH");
    expect(entries[0].cheapest?.unitCostPerDay).toBeCloseTo(30);
  });

  it("sortiert häufigste zuerst, dann alphabetisch", () => {
    const entries = buildProcurementCatalog([
      subrental({ id: "sr-1", items: [item({ description: "Zebra-Kabel", unit_cost: 10 })] }),
      subrental({ id: "sr-2", items: [item({ description: "Nebelmaschine", unit_cost: 10 })] }),
      subrental({ id: "sr-3", items: [item({ description: "Nebelmaschine", unit_cost: 10 })] }),
    ]);

    expect(entries.map((e) => e.label)).toEqual(["Nebelmaschine", "Zebra-Kabel"]);
  });
});
