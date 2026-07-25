import { describe, it, expect } from "vitest";
import {
  bindsStock,
  rangesOverlap,
  sumBookedQuantity,
  availableInRange,
  checkAvailability,
  countsAsSubrentalAddition,
  type DeviceBooking,
} from "@/lib/availability";

describe("bindsStock", () => {
  it("bindende Status reservieren, abgeschlossene/stornierte nicht", () => {
    expect(bindsStock("anfrage")).toBe(true);
    expect(bindsStock("bestaetigt")).toBe(true);
    expect(bindsStock("planung")).toBe(true);
    expect(bindsStock("packen")).toBe(true);
    expect(bindsStock("laeuft")).toBe(true);
    expect(bindsStock("rueckgabe")).toBe(true);
    expect(bindsStock("abgeschlossen")).toBe(false);
    expect(bindsStock("storniert")).toBe(false);
  });
});

describe("rangesOverlap", () => {
  // Jobs sind tagesbasiert: Start = Tagesbeginn, Ende = Tagesende.
  const d = (day: number, end = false) =>
    `2026-07-${String(day).padStart(2, "0")}T${end ? "23:59:59" : "00:00:00"}`;

  it("erkennt echte Überlappung", () => {
    expect(rangesOverlap(d(10), d(12, true), d(11), d(13, true))).toBe(true);
  });

  it("enthaltener Zeitraum überlappt", () => {
    expect(rangesOverlap(d(10), d(20, true), d(12), d(13, true))).toBe(true);
  });

  it("gemeinsamer Randtag zählt als Überlappung", () => {
    // Job A endet am 12., Job B beginnt am 12. → dasselbe Gerät kann nicht beides.
    expect(rangesOverlap(d(10), d(12, true), d(12), d(14, true))).toBe(true);
  });

  it("disjunkte Zeiträume überlappen nicht", () => {
    expect(rangesOverlap(d(10), d(11, true), d(12), d(13, true))).toBe(false);
    expect(rangesOverlap(d(12), d(13, true), d(10), d(11, true))).toBe(false);
  });

  it("eintägige Zeiträume am selben Tag überlappen", () => {
    expect(rangesOverlap(d(10), d(10, true), d(10), d(10, true))).toBe(true);
  });
});

describe("sumBookedQuantity / availableInRange", () => {
  const bookings = [{ quantity: 3 }, { quantity: 2 }];

  it("summiert Buchungsmengen (leer/undefined = 0)", () => {
    expect(sumBookedQuantity(bookings)).toBe(5);
    expect(sumBookedQuantity([])).toBe(0);
    expect(sumBookedQuantity(undefined)).toBe(0);
  });

  it("frei = Bestand − defekt − fremdgebucht, nie negativ", () => {
    expect(availableInRange({ stock_quantity: 10, defective_quantity: 1 }, bookings)).toBe(4);
    expect(availableInRange({ stock_quantity: 4, defective_quantity: 0 }, bookings)).toBe(0);
    expect(availableInRange({ stock_quantity: 3, defective_quantity: 2 }, bookings)).toBe(0);
    expect(availableInRange({ stock_quantity: 5, defective_quantity: 0 }, undefined)).toBe(5);
  });
});

describe("checkAvailability", () => {
  const device = { stock_quantity: 10, defective_quantity: 1 };
  const bookings: DeviceBooking[] = [
    { id: "b", title: "Job B", start_date: "2026-07-11T00:00:00", end_date: "2026-07-13T23:59:59", quantity: 4 },
    { id: "a", title: "Job A", start_date: "2026-07-09T00:00:00", end_date: "2026-07-10T23:59:59", quantity: 2 },
  ];

  it("kein Konflikt, solange die Menge in die freie Kapazität passt", () => {
    const r = checkAvailability(device, 3, bookings); // frei: 10−1−6 = 3
    expect(r.free).toBe(3);
    expect(r.over).toBe(false);
    expect(r.shortfall).toBe(0);
    expect(r.conflicts).toEqual([]);
  });

  it("Konflikt mit Fehlmenge und nach Startdatum sortierten Verursachern", () => {
    const r = checkAvailability(device, 5, bookings);
    expect(r.over).toBe(true);
    expect(r.shortfall).toBe(2);
    expect(r.conflicts.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("ohne fremde Buchungen zählt nur Bestand − defekt", () => {
    const r = checkAvailability(device, 12, undefined);
    expect(r.free).toBe(9);
    expect(r.shortfall).toBe(3);
    expect(r.conflicts).toEqual([]);
  });
});

describe("countsAsSubrentalAddition (E3)", () => {
  it("bestaetigt/uebernommen/zurueckgegeben zählen als Zugang", () => {
    expect(countsAsSubrentalAddition("bestaetigt")).toBe(true);
    expect(countsAsSubrentalAddition("uebernommen")).toBe(true);
    expect(countsAsSubrentalAddition("zurueckgegeben")).toBe(true);
  });

  it("entwurf/angefragt/storniert zählen NICHT (Konservativität)", () => {
    expect(countsAsSubrentalAddition("entwurf")).toBe(false);
    expect(countsAsSubrentalAddition("angefragt")).toBe(false);
    expect(countsAsSubrentalAddition("storniert")).toBe(false);
  });
});

describe("Anmiet-Zugänge in availableInRange/checkAvailability (E3)", () => {
  // Genau das Beweis-Szenario aus PLAN-NEUAUSRICHTUNG.md E3:
  // Bestand 2, Bedarf 5 → 3 fehlen; Anmietung 3 (bestaetigt) → Warnung weg;
  // zurück auf angefragt (zählt nicht) → Warnung wieder da.
  const device = { stock_quantity: 2, defective_quantity: 0 };

  it("ohne Anmiet-Zugang: 2 frei, 3 fehlen bei Bedarf 5", () => {
    const r = checkAvailability(device, 5, undefined);
    expect(r.free).toBe(2);
    expect(r.over).toBe(true);
    expect(r.shortfall).toBe(3);
    expect(r.subrentalAdditions).toBe(0);
  });

  it("mit Anmiet-Zugang 3 (bestätigt): 5 frei, kein Fehlbetrag mehr", () => {
    const r = checkAvailability(device, 5, undefined, 3);
    expect(r.free).toBe(5);
    expect(r.over).toBe(false);
    expect(r.shortfall).toBe(0);
    expect(r.subrentalAdditions).toBe(3);
  });

  it("Anmiet-Zugang gilt symmetrisch für availableInRange", () => {
    expect(availableInRange(device, undefined, 3)).toBe(5);
    expect(availableInRange(device, undefined, 0)).toBe(2);
  });

  it("Anmiet-Zugang stellt echte Kapazität gegen Fremdbuchungen (nicht nur additiv auf gedeckeltes frei)", () => {
    // Bestand 1, defekt 1 → eigener Anteil wäre 0 (gedeckelt); mit Zugang 4 und
    // Fremdbuchung 2 muss dennoch 2 frei bleiben (0 + 4 − 2), nicht 0 + 4.
    const tight = { stock_quantity: 1, defective_quantity: 1 };
    expect(availableInRange(tight, [{ quantity: 2 }], 4)).toBe(2);
  });
});
