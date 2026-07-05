import { describe, it, expect } from "vitest";
import { availableYears, filterByYear, groupItems } from "@/lib/listGrouping";

interface Row {
  date: string | null;
  customer: string | null;
  value: number;
}

const accessors = {
  getDate: (r: Row) => r.date,
  getCustomer: (r: Row) => r.customer,
  getValue: (r: Row) => r.value,
};

const rows: Row[] = [
  { date: "2026-06-20", customer: "Beta GmbH", value: 100 },
  { date: "2026-06-05", customer: "Acme", value: 50 },
  { date: "2026-07-01", customer: "Acme", value: 200 },
  { date: "2025-12-31", customer: null, value: 10 },
  { date: null, customer: "Acme", value: 5 },
];

describe("availableYears", () => {
  it("liefert vorhandene Jahre absteigend, ohne Duplikate und ohne Null-Daten", () => {
    expect(availableYears(rows, accessors.getDate)).toEqual([2026, 2025]);
  });

  it("leere Liste ergibt keine Jahre", () => {
    expect(availableYears([], accessors.getDate)).toEqual([]);
  });
});

describe("filterByYear", () => {
  it("filtert auf das Jahr; Einträge ohne Datum fallen raus", () => {
    const result = filterByYear(rows, accessors.getDate, 2026);
    expect(result).toHaveLength(3);
    expect(result.every((r) => r.date?.startsWith("2026"))).toBe(true);
  });

  it("»alle« lässt alles durch (inkl. ohne Datum)", () => {
    expect(filterByYear(rows, accessors.getDate, "alle")).toHaveLength(5);
  });
});

describe("groupItems nach Monat", () => {
  it("gruppiert mit Zwischensumme, neueste Monate zuerst, ohne Datum zuletzt", () => {
    const groups = groupItems(rows, "monat", accessors);
    expect(groups.map((g) => g.label)).toEqual(["Juli 2026", "Juni 2026", "Dezember 2025", "Ohne Datum"]);
    expect(groups[0].sum).toBe(200);
    expect(groups[1].sum).toBe(150);
    expect(groups[1].items).toHaveLength(2);
    expect(groups[3].sum).toBe(5);
  });

  it("behält die Eingabe-Reihenfolge innerhalb der Gruppe", () => {
    const groups = groupItems(rows, "monat", accessors);
    const juni = groups.find((g) => g.label === "Juni 2026");
    expect(juni?.items.map((r) => r.value)).toEqual([100, 50]);
  });
});

describe("groupItems nach Kunde", () => {
  it("gruppiert alphabetisch, »Ohne Kunde« zuletzt, Summen stimmen", () => {
    const groups = groupItems(rows, "kunde", accessors);
    expect(groups.map((g) => g.label)).toEqual(["Acme", "Beta GmbH", "Ohne Kunde"]);
    expect(groups[0].sum).toBe(255);
    expect(groups[0].items).toHaveLength(3);
    expect(groups[2].sum).toBe(10);
  });
});
