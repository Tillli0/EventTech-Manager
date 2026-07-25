import { describe, expect, it } from "vitest";
import { computeJobCosting } from "./jobCosting";

function offerItem(net: number) {
  return { quantity: 1, rental_days: 1, unit_price: net };
}

describe("computeJobCosting", () => {
  it("berechnet den Plan-Beweis: Angebot 1.000 − Anmietung 300 − Personal 200 → DB 500, 50 %", () => {
    const result = computeJobCosting({
      offers: [{ status: "angenommen", items: [offerItem(1000)] as never, tax_rate: 19 }],
      invoices: [],
      subrentals: [
        {
          status: "bestaetigt",
          items: [{ quantity: 1, unit_cost: 300 }] as never,
        },
      ],
      costs: [{ cost_type: "personal", amount: 200 }],
    });

    expect(result.revenueQuoted).toBe(1000);
    expect(result.revenueInvoiced).toBeNull();
    expect(result.costSubrental).toBe(300);
    expect(result.costPersonal).toBe(200);
    expect(result.costOther).toBe(0);
    expect(result.costTotal).toBe(500);
    expect(result.marginQuoted).toBe(500);
    expect(result.marginPctQuoted).toBe(50);
    expect(result.marginInvoiced).toBeNull();
    expect(result.marginPctInvoiced).toBeNull();
  });

  it("füllt die Ist-Spalte, sobald eine Rechnung gestellt ist", () => {
    const result = computeJobCosting({
      offers: [{ status: "angenommen", items: [offerItem(1000)] as never, tax_rate: 19 }],
      invoices: [
        { status: "gestellt", invoice_date: "2026-07-01", items: [offerItem(1000)] as never, tax_rate: 19 },
      ],
      subrentals: [{ status: "bestaetigt", items: [{ quantity: 1, unit_cost: 300 }] as never }],
      costs: [{ cost_type: "personal", amount: 200 }],
    });

    expect(result.revenueInvoiced).toBe(1000);
    expect(result.marginInvoiced).toBe(500);
    expect(result.marginPctInvoiced).toBe(50);
  });

  it("ignoriert stornierte Rechnungen und nicht angenommene Angebote", () => {
    const result = computeJobCosting({
      offers: [{ status: "gesendet", items: [offerItem(1000)] as never, tax_rate: 19 }],
      invoices: [
        { status: "storniert", invoice_date: "2026-07-01", items: [offerItem(1000)] as never, tax_rate: 19 },
      ],
      subrentals: [{ status: "storniert", items: [{ quantity: 1, unit_cost: 300 }] as never }],
      costs: [],
    });

    expect(result.revenueQuoted).toBe(0);
    expect(result.revenueInvoiced).toBeNull();
    expect(result.costSubrental).toBe(0);
    expect(result.marginPctQuoted).toBeNull();
  });
});
