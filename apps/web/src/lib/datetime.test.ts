import { describe, it, expect } from "vitest";
import { dateToInput, timeToInput, combineDateAndTime, toDate } from "@/lib/datetime";

// Diese Helfer rechnen bewusst LOKAL (kein UTC-Versatz) — der Nutzer denkt in seiner
// Zeitzone. Die Tests konstruieren deshalb ebenfalls lokale Daten (new Date(y, m, d)).

describe("dateToInput", () => {
  it("formatiert als yyyy-MM-dd mit führenden Nullen", () => {
    expect(dateToInput(new Date(2026, 6, 2))).toBe("2026-07-02");
    expect(dateToInput(new Date(2026, 0, 1))).toBe("2026-01-01");
  });

  it("behandelt den 31.12. ohne Jahresversatz", () => {
    // Klassische UTC-Falle: mit toISOString() wäre das je nach Zeitzone 2027-01-01.
    expect(dateToInput(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

describe("timeToInput", () => {
  it("formatiert als HH:mm mit führenden Nullen", () => {
    expect(timeToInput(new Date(2026, 6, 2, 9, 5))).toBe("09:05");
    expect(timeToInput(new Date(2026, 6, 2, 23, 59))).toBe("23:59");
  });

  it("stellt Mitternacht als 00:00 dar", () => {
    expect(timeToInput(new Date(2026, 6, 2, 0, 0))).toBe("00:00");
  });
});

describe("combineDateAndTime", () => {
  it("setzt die Uhrzeit auf den gegebenen Tag", () => {
    const result = combineDateAndTime(new Date(2026, 6, 2), "14:30");
    expect(dateToInput(result)).toBe("2026-07-02");
    expect(timeToInput(result)).toBe("14:30");
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  it("verändert das übergebene Datum nicht (arbeitet auf einer Kopie)", () => {
    const day = new Date(2026, 6, 2, 8, 0);
    combineDateAndTime(day, "20:15");
    expect(timeToInput(day)).toBe("08:00");
  });

  it("fällt bei unbrauchbarer Zeitangabe auf 00:00 zurück statt NaN zu liefern", () => {
    const result = combineDateAndTime(new Date(2026, 6, 2), "quatsch");
    expect(Number.isNaN(result.getTime())).toBe(false);
    expect(timeToInput(result)).toBe("00:00");
  });
});

describe("toDate", () => {
  it("gibt null für leere Werte", () => {
    expect(toDate(null)).toBeNull();
    expect(toDate(undefined)).toBeNull();
    expect(toDate("")).toBeNull();
  });

  it("gibt null für unlesbare Werte statt eines Invalid Date", () => {
    expect(toDate("quatsch")).toBeNull();
  });

  it("reicht ein Date unverändert durch", () => {
    const d = new Date(2026, 6, 2, 10, 0);
    expect(toDate(d)?.getTime()).toBe(d.getTime());
  });

  it("liest ISO-Strings", () => {
    const d = toDate("2026-07-02T10:30:00");
    expect(d).not.toBeNull();
    expect(dateToInput(d as Date)).toBe("2026-07-02");
  });
});
