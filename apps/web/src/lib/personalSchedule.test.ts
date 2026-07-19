import { describe, it, expect } from "vitest";
import {
  resolveRecurringBlock,
  resolvePersonalBlocks,
  isVisibleBlockCategory,
  type PersonalRecurringBlock,
  type PersonalBlock,
} from "./personalSchedule";

function rule(overrides: Partial<PersonalRecurringBlock> = {}): PersonalRecurringBlock {
  return {
    id: "rule-1",
    user_id: "u1",
    category: "schule",
    title: null,
    weekday: 0, // Montag
    start_time: "08:00",
    end_time: "13:30",
    valid_from: "2026-01-01",
    valid_to: null,
    ...overrides,
  };
}

describe("resolveRecurringBlock", () => {
  it("liefert einen Termin je passendem Wochentag im Zeitraum", () => {
    const results = resolveRecurringBlock(rule(), new Date(2026, 6, 1), new Date(2026, 6, 31));
    // Juli 2026: Montage sind der 6., 13., 20., 27.
    expect(results).toHaveLength(4);
    expect(results[0].start.getDate()).toBe(6);
    expect(results[0].start.getHours()).toBe(8);
    expect(results[0].end.getHours()).toBe(13);
    expect(results[0].end.getMinutes()).toBe(30);
  });

  it("respektiert valid_from/valid_to", () => {
    const results = resolveRecurringBlock(
      rule({ valid_from: "2026-07-10", valid_to: "2026-07-20" }),
      new Date(2026, 6, 1),
      new Date(2026, 6, 31),
    );
    // Montage innerhalb der Gültigkeit (10.–20.7., valid_to eingeschlossen): 13. und 20.
    expect(results).toHaveLength(2);
    expect(results[0].start.getDate()).toBe(13);
    expect(results[1].start.getDate()).toBe(20);
  });

  it("bleibt über den Sommerzeit-Wechsel (letzter Sonntag im März 2026 = 29.3.) korrekt", () => {
    const results = resolveRecurringBlock(
      rule({ valid_from: "2026-03-01", valid_to: "2026-04-05" }),
      new Date(2026, 2, 1),
      new Date(2026, 3, 6),
    );
    // Montage im Zeitraum: 2., 9., 16., 23., 30.3. sowie 6.4. (bis 5.4. gültig -> 5 Termine)
    expect(results).toHaveLength(5);
    // Jeder Termin bleibt lokal 08:00–13:30, unabhängig von der Zeitumstellung am 29.3.
    for (const r of results) {
      expect(r.start.getHours()).toBe(8);
      expect(r.end.getHours()).toBe(13);
      expect(r.end.getMinutes()).toBe(30);
    }
  });

  it("liefert nichts außerhalb des angefragten Zeitraums", () => {
    const results = resolveRecurringBlock(rule(), new Date(2025, 0, 1), new Date(2025, 11, 31));
    expect(results).toHaveLength(0);
  });
});

describe("resolvePersonalBlocks", () => {
  it("mischt konkrete Blöcke und aufgelöste Regeln, sortiert nach Start", () => {
    const blocks: PersonalBlock[] = [
      {
        id: "b1",
        user_id: "u1",
        category: "koeln_schicht",
        title: "Schicht",
        start_at: "2026-07-15T09:00:00Z",
        end_at: "2026-07-15T17:00:00Z",
        notes: null,
      },
    ];
    const results = resolvePersonalBlocks(blocks, [rule()], new Date(2026, 6, 1), new Date(2026, 6, 20));
    expect(results.length).toBeGreaterThan(1);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].start.getTime()).toBeGreaterThanOrEqual(results[i - 1].start.getTime());
    }
  });

  it("lässt Blöcke außerhalb des Zeitraums weg", () => {
    const blocks: PersonalBlock[] = [
      {
        id: "b1",
        user_id: "u1",
        category: "urlaub",
        title: null,
        start_at: "2025-01-01T00:00:00Z",
        end_at: "2025-01-05T00:00:00Z",
        notes: null,
      },
    ];
    const results = resolvePersonalBlocks(blocks, [], new Date(2026, 6, 1), new Date(2026, 6, 20));
    expect(results).toHaveLength(0);
  });
});

describe("isVisibleBlockCategory", () => {
  it("nur Köln-Schicht ist Inhalt, alles andere nur Blocker", () => {
    expect(isVisibleBlockCategory("koeln_schicht")).toBe(true);
    expect(isVisibleBlockCategory("schule")).toBe(false);
    expect(isVisibleBlockCategory("klausur")).toBe(false);
    expect(isVisibleBlockCategory("ferien")).toBe(false);
    expect(isVisibleBlockCategory("urlaub")).toBe(false);
    expect(isVisibleBlockCategory("krank")).toBe(false);
    expect(isVisibleBlockCategory("sonstiges")).toBe(false);
  });
});
