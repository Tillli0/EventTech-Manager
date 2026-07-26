import { describe, expect, it } from "vitest";
import { buildLogisticsTimeline } from "./subrentalLogistics";
import type { SubrentalLogistics, SubrentalStatus } from "@/types/database";

function subrental(overrides: Record<string, unknown> = {}) {
  return {
    id: "sr-1",
    job_id: "job-1",
    start_date: "2026-07-06", // Montag
    end_date: "2026-07-08", // Mittwoch
    logistics: "abholung" as SubrentalLogistics,
    status: "bestaetigt" as SubrentalStatus,
    supplier: { name: "Beuchel" },
    ...overrides,
  };
}

describe("buildLogisticsTimeline", () => {
  it("erzeugt Abhol- und Rückgabe-Ereignis bei Logistik 'abholung'", () => {
    const events = buildLogisticsTimeline([subrental()]);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ type: "abholen", date: "2026-07-06", label: "Abholen bei Beuchel" });
    expect(events[1]).toMatchObject({ type: "zurueckbringen", date: "2026-07-08", label: "Zurückbringen zu Beuchel" });
  });

  it("kehrt die Beschriftung bei Lieferung um (Verleiher liefert/holt selbst ab)", () => {
    const events = buildLogisticsTimeline([subrental({ logistics: "lieferung_location" })]);
    expect(events[0].label).toBe("Lieferung zur Location von Beuchel");
    expect(events[1].label).toBe("Abholung durch Beuchel");
  });

  it("ignoriert stornierte Vorgänge", () => {
    const events = buildLogisticsTimeline([subrental({ status: "storniert" })]);
    expect(events).toHaveLength(0);
  });

  it("erkennt Wochenend-Termine", () => {
    const events = buildLogisticsTimeline([
      subrental({ start_date: "2026-07-04", end_date: "2026-07-05" }), // Sa/So
    ]);
    expect(events[0].isWeekend).toBe(true);
    expect(events[1].isWeekend).toBe(true);
  });

  it("erkennt Werktage korrekt als kein Wochenende", () => {
    const events = buildLogisticsTimeline([subrental()]);
    expect(events[0].isWeekend).toBe(false);
    expect(events[1].isWeekend).toBe(false);
  });

  it("sortiert mehrere Vorgänge chronologisch gemischt", () => {
    const events = buildLogisticsTimeline([
      subrental({ id: "sr-a", start_date: "2026-07-10", end_date: "2026-07-12" }),
      subrental({ id: "sr-b", start_date: "2026-07-01", end_date: "2026-07-03" }),
    ]);
    expect(events.map((e) => e.date)).toEqual(["2026-07-01", "2026-07-03", "2026-07-10", "2026-07-12"]);
  });

  it("fällt auf 'Verleih-Partner' zurück, wenn kein Partnername geladen ist", () => {
    const events = buildLogisticsTimeline([subrental({ supplier: null })]);
    expect(events[0].label).toBe("Abholen bei Verleih-Partner");
  });
});
