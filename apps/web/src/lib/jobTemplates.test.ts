import { describe, it, expect } from "vitest";
import { applyTemplateOffsets, deriveTemplateItemsFromMilestones } from "./jobTemplates";

describe("applyTemplateOffsets", () => {
  it("verschiebt einen Programmpunkt um den angegebenen Offset", () => {
    const start = new Date("2026-09-01T10:00:00Z");
    const [result] = applyTemplateOffsets(
      [{ title: "Aufbau", offset_minutes: 0, duration_minutes: 120, notes: null }],
      start,
    );
    expect(result.at).toBe(new Date("2026-09-01T10:00:00Z").toISOString());
    expect(result.end_at).toBe(new Date("2026-09-01T12:00:00Z").toISOString());
  });

  it("erlaubt negative Offsets (vor dem Job-Start)", () => {
    const start = new Date("2026-09-01T10:00:00Z");
    const [result] = applyTemplateOffsets(
      [{ title: "Vorbereitung", offset_minutes: -60, duration_minutes: null, notes: null }],
      start,
    );
    expect(result.at).toBe(new Date("2026-09-01T09:00:00Z").toISOString());
    expect(result.end_at).toBeNull();
  });

  it("übernimmt Titel und Notizen unverändert", () => {
    const start = new Date("2026-09-01T10:00:00Z");
    const [result] = applyTemplateOffsets(
      [{ title: "Soundcheck", offset_minutes: 30, duration_minutes: 15, notes: "Bühne 1" }],
      start,
    );
    expect(result.title).toBe("Soundcheck");
    expect(result.notes).toBe("Bühne 1");
  });

  it("bleibt über eine Sommerzeit-Umstellung hinweg korrekt (reine ms-Arithmetik)", () => {
    // 25.10.2026 ist die deutsche DST->Normalzeit-Umstellung. Ein Job, der um
    // 00:00 UTC (25.10.) startet, mit einem Programmpunkt 30h später — die
    // Absolutdauer muss exakt 30h bleiben, unabhängig von der Umstellung.
    const start = new Date("2026-10-25T00:00:00Z");
    const [result] = applyTemplateOffsets(
      [{ title: "Show", offset_minutes: 30 * 60, duration_minutes: 60, notes: null }],
      start,
    );
    const diffMs = new Date(result.at).getTime() - start.getTime();
    expect(diffMs).toBe(30 * 60 * 60_000);
  });
});

describe("deriveTemplateItemsFromMilestones", () => {
  it("berechnet Offset und Dauer relativ zum Job-Start", () => {
    const start = new Date("2026-09-01T10:00:00Z");
    const [result] = deriveTemplateItemsFromMilestones(
      [{ title: "Aufbau", at: "2026-09-01T12:00:00Z", end_at: "2026-09-01T14:00:00Z", notes: "Notiz" }],
      start,
    );
    expect(result.offset_minutes).toBe(120);
    expect(result.duration_minutes).toBe(120);
    expect(result.notes).toBe("Notiz");
  });

  it("liefert duration_minutes null ohne end_at", () => {
    const start = new Date("2026-09-01T10:00:00Z");
    const [result] = deriveTemplateItemsFromMilestones(
      [{ title: "Eventstart", at: "2026-09-01T18:00:00Z", end_at: null, notes: null }],
      start,
    );
    expect(result.duration_minutes).toBeNull();
  });

  it("ist die Umkehrfunktion von applyTemplateOffsets", () => {
    const start = new Date("2026-09-01T10:00:00Z");
    const items = [
      { title: "Aufbau", offset_minutes: 0, duration_minutes: 120, notes: null },
      { title: "Show", offset_minutes: 480, duration_minutes: 180, notes: "Hauptact" },
    ];
    const applied = applyTemplateOffsets(items, start);
    const derived = deriveTemplateItemsFromMilestones(applied, start);
    expect(derived).toEqual(items);
  });
});
