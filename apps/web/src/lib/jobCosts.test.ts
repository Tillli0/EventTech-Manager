import { describe, expect, it } from "vitest";
import { jobCostsTotal, suggestCostFromAssignment } from "./jobCosts";

describe("jobCostsTotal", () => {
  it("summiert die Beträge aller Positionen", () => {
    expect(jobCostsTotal([{ amount: 100 }, { amount: 50.5 }, { amount: 0 }])).toBe(150.5);
  });

  it("liefert 0 bei leerer Liste", () => {
    expect(jobCostsTotal([])).toBe(0);
  });
});

describe("suggestCostFromAssignment", () => {
  it("rechnet Stunden aus start_at/end_at und multipliziert mit dem Satz", () => {
    const result = suggestCostFromAssignment(
      { start_at: "2026-09-20T08:00:00Z", end_at: "2026-09-20T18:00:00Z" },
      25,
    );
    expect(result).toEqual({ hours: 10, hourly_rate: 25, amount: 250 });
  });

  it("liefert hours=null ohne Zeiten — kein Betrag", () => {
    const result = suggestCostFromAssignment({ start_at: null, end_at: null }, 25);
    expect(result).toEqual({ hours: null, hourly_rate: 25, amount: 0 });
  });

  it("liefert amount=0 ohne Standard-Stundensatz, auch mit Zeiten", () => {
    const result = suggestCostFromAssignment(
      { start_at: "2026-09-20T08:00:00Z", end_at: "2026-09-20T18:00:00Z" },
      null,
    );
    expect(result).toEqual({ hours: 10, hourly_rate: null, amount: 0 });
  });

  it("rundet auf zwei Nachkommastellen (z.B. 90 Minuten)", () => {
    const result = suggestCostFromAssignment(
      { start_at: "2026-09-20T08:00:00Z", end_at: "2026-09-20T09:30:00Z" },
      20,
    );
    expect(result).toEqual({ hours: 1.5, hourly_rate: 20, amount: 30 });
  });
});
