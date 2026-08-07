import { describe, expect, it } from "vitest";
import { jobDateProgress } from "./jobProgress";

describe("jobDateProgress", () => {
  it("liefert null vor dem Start", () => {
    expect(jobDateProgress("2026-08-10", "2026-08-12", new Date("2026-08-07T12:00:00"))).toBeNull();
  });

  it("liefert 0 am ersten Tag eines mehrtägigen Jobs", () => {
    expect(jobDateProgress("2026-08-07", "2026-08-11", new Date("2026-08-07T09:00:00"))).toBe(0);
  });

  it("liefert einen linearen Zwischenwert", () => {
    // 2 von 4 Tagen vergangen
    expect(jobDateProgress("2026-08-07", "2026-08-11", new Date("2026-08-09T09:00:00"))).toBe(0.5);
  });

  it("liefert 1 am letzten Tag und danach", () => {
    expect(jobDateProgress("2026-08-07", "2026-08-11", new Date("2026-08-11T09:00:00"))).toBe(1);
    expect(jobDateProgress("2026-08-07", "2026-08-11", new Date("2026-08-15T09:00:00"))).toBe(1);
  });

  it("liefert 1 für einen eintägigen Job am selben Tag", () => {
    expect(jobDateProgress("2026-08-07", "2026-08-07", new Date("2026-08-07T09:00:00"))).toBe(1);
  });
});
