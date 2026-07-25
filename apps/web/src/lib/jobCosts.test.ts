import { describe, expect, it } from "vitest";
import { jobCostsTotal } from "./jobCosts";

describe("jobCostsTotal", () => {
  it("summiert die Beträge aller Positionen", () => {
    expect(jobCostsTotal([{ amount: 100 }, { amount: 50.5 }, { amount: 0 }])).toBe(150.5);
  });

  it("liefert 0 bei leerer Liste", () => {
    expect(jobCostsTotal([])).toBe(0);
  });
});
