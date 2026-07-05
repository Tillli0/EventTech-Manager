import { describe, it, expect } from "vitest";
import { invoiceTimeline, type TimelineInvoice } from "@/lib/invoiceTimeline";

function invoice(overrides: Partial<TimelineInvoice>): TimelineInvoice {
  return {
    status: "gestellt",
    invoice_number: "RE-2026-0001",
    invoice_date: "2026-05-01",
    created_at: "2026-04-28T10:00:00",
    updated_at: "2026-05-01T09:00:00",
    tax_rate: 19,
    items: [{ quantity: 1, rental_days: 1, unit_price: 100 }], // 119 brutto
    payments: [],
    dunnings: [],
    ...overrides,
  };
}

describe("invoiceTimeline", () => {
  it("Entwurf hat nur das Erstellt-Ereignis", () => {
    const events = invoiceTimeline(invoice({ status: "entwurf", invoice_number: null, invoice_date: null }));
    expect(events.map((e) => e.kind)).toEqual(["erstellt"]);
  });

  it("gestellt + Teilzahlung + Mahnung erscheinen chronologisch", () => {
    const events = invoiceTimeline(
      invoice({
        payments: [{ amount: 50, paid_at: "2026-05-10", method: "Überweisung" }],
        dunnings: [{ level: 1, sent_at: "2026-06-01T08:00:00", to_email: "kunde@example.de" }],
      }),
    );
    expect(events.map((e) => e.kind)).toEqual(["erstellt", "gestellt", "zahlung", "mahnung"]);
    expect(events[1].detail).toBe("RE-2026-0001");
    expect(events[2].amount).toBe(50);
    expect(events[3].label).toContain("Zahlungserinnerung");
  });

  it("vollständige Zahlung erzeugt den Bezahlt-Meilenstein am letzten Zahldatum", () => {
    const events = invoiceTimeline(
      invoice({
        payments: [
          { amount: 19, paid_at: "2026-05-20", method: null },
          { amount: 100, paid_at: "2026-05-10", method: null },
        ],
      }),
    );
    const paid = events.find((e) => e.kind === "bezahlt");
    expect(paid).toBeDefined();
    expect(paid?.at).toBe("2026-05-20");
    expect(paid?.amount).toBeCloseTo(119, 5);
    expect(events[events.length - 1].kind).toBe("bezahlt");
  });

  it("Teilzahlung erzeugt KEINEN Bezahlt-Meilenstein", () => {
    const events = invoiceTimeline(invoice({ payments: [{ amount: 50, paid_at: "2026-05-10", method: null }] }));
    expect(events.some((e) => e.kind === "bezahlt")).toBe(false);
  });

  it("storniert erscheint als letztes Ereignis", () => {
    const events = invoiceTimeline(invoice({ status: "storniert", updated_at: "2026-06-15T12:00:00" }));
    expect(events[events.length - 1].kind).toBe("storniert");
  });
});
