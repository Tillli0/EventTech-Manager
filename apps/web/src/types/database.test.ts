import { describe, it, expect } from "vitest";
import {
  deviceBreakdown,
  inspectionStatus,
  isStammkunde,
  isJobCompletelyPast,
  quantityStillOut,
  quantityNotYetPickedUp,
  offerItemTotal,
  offerTotals,
  canEditPacklistDevices,
  isPackenStage,
  isRueckgabeStage,
  type Job,
} from "@/types/database";

describe("deviceBreakdown", () => {
  it("rechnet verfügbar = total − defekt − ausgegeben", () => {
    expect(deviceBreakdown({ stock_quantity: 10, defective_quantity: 2 }, 3)).toEqual({
      total: 10,
      defective: 2,
      out: 3,
      available: 5,
    });
  });

  it("klemmt verfügbar bei 0 fest (Überbuchung)", () => {
    expect(deviceBreakdown({ stock_quantity: 5, defective_quantity: 1 }, 10).available).toBe(0);
  });

  it("ignoriert negatives outNow", () => {
    expect(deviceBreakdown({ stock_quantity: 5, defective_quantity: 0 }, -3)).toEqual({
      total: 5,
      defective: 0,
      out: 0,
      available: 5,
    });
  });
});

describe("inspectionStatus", () => {
  function isoInDays(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  it("none ohne Datum oder bei ungültigem Datum", () => {
    expect(inspectionStatus(null)).toBe("none");
    expect(inspectionStatus(undefined)).toBe("none");
    expect(inspectionStatus("kein-datum")).toBe("none");
  });

  it("overdue wenn das Datum in der Vergangenheit liegt", () => {
    expect(inspectionStatus(isoInDays(-1))).toBe("overdue");
  });

  it("soon innerhalb des Fensters, heute eingeschlossen", () => {
    expect(inspectionStatus(isoInDays(0))).toBe("soon");
    expect(inspectionStatus(isoInDays(30))).toBe("soon");
  });

  it("ok außerhalb des Fensters", () => {
    expect(inspectionStatus(isoInDays(31))).toBe("ok");
  });

  it("respektiert ein eigenes Fenster", () => {
    expect(inspectionStatus(isoInDays(10), 5)).toBe("ok");
    expect(inspectionStatus(isoInDays(4), 5)).toBe("soon");
  });
});

describe("isStammkunde", () => {
  it("Override hat Vorrang vor der Job-Anzahl", () => {
    expect(isStammkunde({ is_stammkunde: true }, 0)).toBe(true);
    expect(isStammkunde({ is_stammkunde: false }, 10)).toBe(false);
  });

  it("ohne Override automatisch ab 2 Jobs", () => {
    expect(isStammkunde({ is_stammkunde: null }, 1)).toBe(false);
    expect(isStammkunde({ is_stammkunde: null }, 2)).toBe(true);
  });
});

describe("isJobCompletelyPast", () => {
  const now = new Date("2026-07-02T12:00:00");

  function job(overrides: Partial<Job>): Job {
    return {
      id: "j1",
      title: "Test",
      customer_id: null,
      inquiry_id: null,
      status: "abgeschlossen",
      location: null,
      start_date: "2026-06-01T00:00:00Z",
      end_date: "2026-06-02T23:59:59Z",
      pickup_at: null,
      return_at: null,
      notes: null,
      color: "#6366f1",
      created_by: null,
      deleted_at: null,
      created_at: "",
      updated_at: "",
      ...overrides,
    };
  }

  it("true wenn Ende vor heute liegt", () => {
    expect(isJobCompletelyPast(job({}), now)).toBe(true);
  });

  it("false wenn das Ende heute oder später liegt", () => {
    expect(isJobCompletelyPast(job({ end_date: "2026-07-02T10:00:00" }), now)).toBe(false);
    expect(isJobCompletelyPast(job({ end_date: "2026-07-10T00:00:00" }), now)).toBe(false);
  });

  it("Rückgabetermin nach dem Enddatum hält den Job aktuell", () => {
    expect(isJobCompletelyPast(job({ return_at: "2026-07-03T09:00:00" }), now)).toBe(false);
  });

  it("späte Zeitplan-Termine halten den Job aktuell", () => {
    const j = job({});
    j.milestones = [
      { id: "m1", job_id: "j1", title: "Abbau", at: "2026-07-05T08:00:00", photo_path: null, created_at: "" },
    ];
    expect(isJobCompletelyPast(j, now)).toBe(false);
  });
});

describe("Packlisten-Mengenrechnung", () => {
  it("quantityStillOut = ausgegeben − ok − defekt − fehlend", () => {
    expect(
      quantityStillOut({ quantity_picked_up: 10, quantity_returned_ok: 4, quantity_damaged: 1, quantity_missing: 2 }),
    ).toBe(3);
  });

  it("quantityNotYetPickedUp = gebucht − ausgegeben", () => {
    expect(quantityNotYetPickedUp({ quantity: 8, quantity_picked_up: 5 })).toBe(3);
  });
});

describe("Angebots-Summen", () => {
  it("Positionssumme = Preis · Menge · Tage", () => {
    expect(offerItemTotal({ unit_price: 25, quantity: 4, rental_days: 3 })).toBe(300);
  });

  it("offerTotals summiert netto und rechnet Steuer/brutto", () => {
    const items = [
      { unit_price: 100, quantity: 1, rental_days: 1 },
      { unit_price: 50, quantity: 2, rental_days: 2 },
    ];
    const { net, tax, gross } = offerTotals(items, 19);
    expect(net).toBe(300);
    expect(tax).toBeCloseTo(57);
    expect(gross).toBeCloseTo(357);
  });

  it("leeres Angebot ergibt 0", () => {
    expect(offerTotals([], 19)).toEqual({ net: 0, tax: 0, gross: 0 });
  });
});

describe("Job-Status ↔ Packlisten-Stufen", () => {
  it("Geräte editierbar nur in planung/packen/laeuft", () => {
    expect(canEditPacklistDevices("planung")).toBe(true);
    expect(canEditPacklistDevices("packen")).toBe(true);
    expect(canEditPacklistDevices("laeuft")).toBe(true);
    expect(canEditPacklistDevices("anfrage")).toBe(false);
    expect(canEditPacklistDevices("rueckgabe")).toBe(false);
    expect(canEditPacklistDevices("abgeschlossen")).toBe(false);
  });

  it("Packen-Stufe in packen+laeuft, Rückgabe-Stufe nur in rueckgabe", () => {
    expect(isPackenStage("packen")).toBe(true);
    expect(isPackenStage("laeuft")).toBe(true);
    expect(isPackenStage("rueckgabe")).toBe(false);
    expect(isRueckgabeStage("rueckgabe")).toBe(true);
    expect(isRueckgabeStage("laeuft")).toBe(false);
  });
});
