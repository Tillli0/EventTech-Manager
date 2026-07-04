import { describe, it, expect } from "vitest";
import {
  lastMonths,
  revenueByMonth,
  paymentsByMonth,
  financeSummary,
  jobsByMonth,
  jobDurationDays,
  topDevices,
  topCustomers,
  type ReportInvoice,
  type ReportJob,
} from "@/lib/reports";

// Fester Bezugspunkt für deterministische Tests: 15. Juli 2026.
const NOW = new Date(2026, 6, 15);

function invoice(overrides: Partial<ReportInvoice>): ReportInvoice {
  return {
    status: "gestellt",
    invoice_date: "2026-07-01",
    due_date: null,
    tax_rate: 19,
    customer_id: null,
    items: [{ quantity: 1, rental_days: 1, unit_price: 100 }], // 119 brutto
    payments: [],
    customer: null,
    ...overrides,
  };
}

function job(overrides: Partial<ReportJob>): ReportJob {
  return {
    status: "bestaetigt",
    start_date: "2026-07-10T00:00:00",
    end_date: "2026-07-12T23:59:59",
    deleted_at: null,
    packlist_items: [],
    ...overrides,
  };
}

describe("lastMonths", () => {
  it("liefert die letzten N Monate inkl. laufendem, älteste zuerst", () => {
    const buckets = lastMonths(12, NOW);
    expect(buckets).toHaveLength(12);
    expect(buckets[0]).toMatchObject({ year: 2025, month: 7 }); // Aug 2025
    expect(buckets[11]).toMatchObject({ year: 2026, month: 6 }); // Jul 2026
  });

  it("hängt am ältesten Eimer und am Jahresanfang die Jahreszahl an", () => {
    const buckets = lastMonths(12, NOW);
    expect(buckets[0].label).toBe("Aug 25");
    expect(buckets[5].label).toBe("Jan 26");
    expect(buckets[11].label).toBe("Jul");
  });
});

describe("jobDurationDays", () => {
  it("zählt beide Randtage mit", () => {
    expect(jobDurationDays("2026-07-01T00:00:00", "2026-07-03T23:59:59")).toBe(3);
  });

  it("eintägiger Job = 1 Tag", () => {
    expect(jobDurationDays("2026-07-01T00:00:00", "2026-07-01T23:59:59")).toBe(1);
  });

  it("ungültige Daten ergeben 0", () => {
    expect(jobDurationDays("kein-datum", "2026-07-01")).toBe(0);
  });
});

describe("revenueByMonth", () => {
  it("summiert gestellten Brutto-Umsatz in den richtigen Monat", () => {
    const buckets = lastMonths(3, NOW); // Mai, Jun, Jul 2026
    const values = revenueByMonth(
      [
        invoice({ invoice_date: "2026-06-10" }),
        invoice({ invoice_date: "2026-06-20" }),
        invoice({ invoice_date: "2026-07-01" }),
      ],
      buckets,
    );
    expect(values[0]).toBe(0);
    expect(values[1]).toBeCloseTo(238, 5);
    expect(values[2]).toBeCloseTo(119, 5);
  });

  it("ignoriert Entwürfe, Stornos und Daten außerhalb des Fensters", () => {
    const buckets = lastMonths(3, NOW);
    const values = revenueByMonth(
      [
        invoice({ status: "entwurf", invoice_date: null }),
        invoice({ status: "storniert", invoice_date: "2026-06-01" }),
        invoice({ invoice_date: "2025-06-01" }),
      ],
      buckets,
    );
    expect(values.every((v) => v === 0)).toBe(true);
  });
});

describe("paymentsByMonth", () => {
  it("bucht Zahlungen nach Zahldatum, unabhängig vom Rechnungsdatum", () => {
    const buckets = lastMonths(3, NOW);
    const values = paymentsByMonth(
      [
        invoice({
          invoice_date: "2026-05-01",
          payments: [
            { amount: 50, paid_at: "2026-06-05" },
            { amount: 25, paid_at: "2026-07-02" },
          ],
        }),
      ],
      buckets,
    );
    expect(values[0]).toBe(0);
    expect(values[1]).toBe(50);
    expect(values[2]).toBe(25);
  });
});

describe("financeSummary", () => {
  it("rechnet Jahresumsatz, Zahlungseingang, offen und überfällig", () => {
    const summary = financeSummary(
      [
        // Dieses Jahr gestellt, voll bezahlt → zählt für Umsatz+Eingang, nicht offen.
        invoice({ invoice_date: "2026-03-01", payments: [{ amount: 119, paid_at: "2026-03-10" }] }),
        // Dieses Jahr gestellt, unbezahlt, überfällig.
        invoice({ invoice_date: "2026-05-01", due_date: "2026-06-01" }),
        // Letztes Jahr gestellt, unbezahlt, nicht fällig → offen, aber kein Jahresumsatz.
        invoice({ invoice_date: "2025-11-01", due_date: "2099-01-01" }),
        // Entwurf → zählt nirgends.
        invoice({ status: "entwurf", invoice_date: null }),
      ],
      NOW,
    );
    expect(summary.issuedCountYear).toBe(2);
    expect(summary.issuedGrossYear).toBeCloseTo(238, 5);
    expect(summary.issuedNetYear).toBeCloseTo(200, 5);
    expect(summary.paidYear).toBe(119);
    expect(summary.openCount).toBe(2);
    expect(summary.openTotal).toBeCloseTo(238, 5);
    expect(summary.overdueCount).toBe(1);
    expect(summary.overdueTotal).toBeCloseTo(119, 5);
  });
});

describe("jobsByMonth", () => {
  it("zählt Jobs nach Startdatum, ohne Storno/Papierkorb", () => {
    const buckets = lastMonths(3, NOW);
    const values = jobsByMonth(
      [
        job({ start_date: "2026-06-01T00:00:00" }),
        job({ start_date: "2026-06-15T00:00:00" }),
        job({ start_date: "2026-06-20T00:00:00", status: "storniert" }),
        job({ start_date: "2026-07-01T00:00:00", deleted_at: "2026-07-02T00:00:00" }),
      ],
      buckets,
    );
    expect(values).toEqual([0, 2, 0]);
  });
});

describe("topDevices", () => {
  it("aggregiert Gerätetage über Jobs und sortiert absteigend", () => {
    const from = new Date(2026, 0, 1);
    const result = topDevices(
      [
        // 3 Tage × 2 Stück Gerät A + 3 Tage × 1 Stück Gerät B
        job({
          packlist_items: [
            { device_id: "a", quantity: 2 },
            { device_id: "b", quantity: 1 },
          ],
        }),
        // 1 Tag × 10 Stück Gerät B
        job({
          start_date: "2026-06-01T00:00:00",
          end_date: "2026-06-01T23:59:59",
          packlist_items: [{ device_id: "b", quantity: 10 }],
        }),
        // Storniert → zählt nicht.
        job({ status: "storniert", packlist_items: [{ device_id: "a", quantity: 99 }] }),
        // Vor dem Zeitfenster → zählt nicht.
        job({
          start_date: "2025-06-01T00:00:00",
          end_date: "2025-06-03T23:59:59",
          packlist_items: [{ device_id: "a", quantity: 99 }],
        }),
      ],
      from,
      10,
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ deviceId: "b", deviceDays: 13, bookedQuantity: 11, jobCount: 2 });
    expect(result[1]).toMatchObject({ deviceId: "a", deviceDays: 6, bookedQuantity: 2, jobCount: 1 });
  });
});

describe("topCustomers", () => {
  it("gruppiert gestellten Umsatz je Kunde und sortiert absteigend", () => {
    const from = new Date(2026, 0, 1);
    const result = topCustomers(
      [
        invoice({ customer_id: "k1", customer: { company_name: "Acme", first_name: null, last_name: null } }),
        invoice({ customer_id: "k1", customer: { company_name: "Acme", first_name: null, last_name: null } }),
        invoice({ customer_id: "k2", customer: { company_name: null, first_name: "Max", last_name: "Muster" } }),
        invoice({ customer_id: "k3", status: "entwurf", invoice_date: null }),
      ],
      from,
      5,
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ customerId: "k1", name: "Acme", invoiceCount: 2 });
    expect(result[0].gross).toBeCloseTo(238, 5);
    expect(result[1]).toMatchObject({ customerId: "k2", name: "Max Muster", invoiceCount: 1 });
  });
});
