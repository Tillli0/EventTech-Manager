import { describe, expect, it } from "vitest";
import { hoursDelta, rankSimilarRetrospectives } from "./jobRetrospectives";
import type { RetrospectiveCandidate } from "@/hooks/useJobRetrospectives";

function candidate(overrides: Partial<RetrospectiveCandidate>): RetrospectiveCandidate {
  return {
    jobId: "job-past",
    jobTitle: "Vergangener Job",
    jobStartDate: "2026-06-01",
    retrospective: { planned_hours: 3, actual_hours: 5, notes: "Test" },
    categoryIds: [],
    ...overrides,
  };
}

describe("hoursDelta", () => {
  it("berechnet die Abweichung tatsächlich minus geplant", () => {
    expect(hoursDelta(3, 5)).toBe(2);
    expect(hoursDelta(5, 3)).toBe(-2);
  });

  it("gibt null zurück, wenn eine der beiden Zahlen fehlt", () => {
    expect(hoursDelta(null, 5)).toBeNull();
    expect(hoursDelta(3, null)).toBeNull();
    expect(hoursDelta(null, null)).toBeNull();
  });
});

describe("rankSimilarRetrospektiven", () => {
  it("findet Kandidaten mit gemeinsamen Kategorien", () => {
    const result = rankSimilarRetrospectives(
      ["cat-licht", "cat-ton"],
      "job-current",
      [candidate({ jobId: "job-a", categoryIds: ["cat-licht"] })],
    );
    expect(result).toHaveLength(1);
    expect(result[0].overlap).toBe(1);
  });

  it("ignoriert Kandidaten ohne gemeinsame Kategorie", () => {
    const result = rankSimilarRetrospectives(
      ["cat-licht"],
      "job-current",
      [candidate({ jobId: "job-a", categoryIds: ["cat-kabel"] })],
    );
    expect(result).toHaveLength(0);
  });

  it("schließt den aktuellen Job selbst aus", () => {
    const result = rankSimilarRetrospectives(
      ["cat-licht"],
      "job-current",
      [candidate({ jobId: "job-current", categoryIds: ["cat-licht"] })],
    );
    expect(result).toHaveLength(0);
  });

  it("gibt bei leeren aktuellen Kategorien keine Treffer zurück", () => {
    const result = rankSimilarRetrospectives([], "job-current", [candidate({ jobId: "job-a", categoryIds: ["cat-licht"] })]);
    expect(result).toHaveLength(0);
  });

  it("sortiert nach Überschneidung absteigend", () => {
    const result = rankSimilarRetrospectives(
      ["cat-a", "cat-b", "cat-c"],
      "job-current",
      [
        candidate({ jobId: "job-1", categoryIds: ["cat-a"] }),
        candidate({ jobId: "job-2", categoryIds: ["cat-a", "cat-b", "cat-c"] }),
      ],
    );
    expect(result.map((r) => r.candidate.jobId)).toEqual(["job-2", "job-1"]);
  });

  it("bei Gleichstand gewinnt der jüngere Job", () => {
    const result = rankSimilarRetrospectives(
      ["cat-a"],
      "job-current",
      [
        candidate({ jobId: "job-old", categoryIds: ["cat-a"], jobStartDate: "2026-01-01" }),
        candidate({ jobId: "job-new", categoryIds: ["cat-a"], jobStartDate: "2026-06-01" }),
      ],
    );
    expect(result.map((r) => r.candidate.jobId)).toEqual(["job-new", "job-old"]);
  });

  it("begrenzt auf das limit", () => {
    const result = rankSimilarRetrospectives(
      ["cat-a"],
      "job-current",
      [
        candidate({ jobId: "job-1", categoryIds: ["cat-a"] }),
        candidate({ jobId: "job-2", categoryIds: ["cat-a"] }),
        candidate({ jobId: "job-3", categoryIds: ["cat-a"] }),
        candidate({ jobId: "job-4", categoryIds: ["cat-a"] }),
      ],
      2,
    );
    expect(result).toHaveLength(2);
  });
});
