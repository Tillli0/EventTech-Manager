// ============================================================
// Listen-Ordnung: Jahres-Filter + Gruppierung mit Zwischensummen
// (Angebote, Rechnungen, Archive) — pure Logik, getestet in
// listGrouping.test.ts. Die Seiten liefern Accessoren, damit die
// Helfer nichts über Invoice/Offer wissen müssen.
// ============================================================

export type YearValue = number | "alle";

const MONTHS_LONG = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Vorhandene Jahre in den Daten, absteigend (neueste zuerst). */
export function availableYears<T>(items: T[], getDate: (item: T) => string | null | undefined): number[] {
  const years = new Set<number>();
  for (const item of items) {
    const d = parseDate(getDate(item));
    if (d) years.add(d.getFullYear());
  }
  return [...years].sort((a, b) => b - a);
}

/**
 * Auf ein Jahr filtern. `"alle"` lässt alles durch; Einträge ohne (gültiges)
 * Datum erscheinen nur bei `"alle"`.
 */
export function filterByYear<T>(
  items: T[],
  getDate: (item: T) => string | null | undefined,
  year: YearValue,
): T[] {
  if (year === "alle") return items;
  return items.filter((item) => parseDate(getDate(item))?.getFullYear() === year);
}

export type GroupMode = "monat" | "kunde";

export interface ListGroup<T> {
  key: string;
  label: string;
  items: T[];
  /** Zwischensumme über die Gruppe (Wert-Accessor des Aufrufers, z.B. Brutto). */
  sum: number;
}

/**
 * Zeilen zu Gruppen mit Zwischensumme zusammenfassen.
 * - `monat`: neueste Monate zuerst, Einträge ohne Datum zuletzt („Ohne Datum").
 * - `kunde`: alphabetisch (de), Einträge ohne Kunde zuletzt („Ohne Kunde").
 * Die Reihenfolge der Zeilen innerhalb einer Gruppe bleibt die Eingabe-Reihenfolge
 * (Aufrufer sortiert, üblicherweise Datum absteigend).
 */
export function groupItems<T>(
  items: T[],
  mode: GroupMode,
  accessors: {
    getDate: (item: T) => string | null | undefined;
    getCustomer: (item: T) => string | null | undefined;
    getValue: (item: T) => number;
  },
): ListGroup<T>[] {
  const map = new Map<string, ListGroup<T>>();

  for (const item of items) {
    let key: string;
    let label: string;
    if (mode === "monat") {
      const d = parseDate(accessors.getDate(item));
      if (d) {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        label = `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
      } else {
        key = "0000-00";
        label = "Ohne Datum";
      }
    } else {
      const name = accessors.getCustomer(item)?.trim();
      key = name ? `k:${name.toLocaleLowerCase("de-DE")}` : "zzz:ohne";
      label = name || "Ohne Kunde";
    }

    const group = map.get(key) ?? { key, label, items: [], sum: 0 };
    group.items.push(item);
    group.sum += accessors.getValue(item);
    map.set(key, group);
  }

  const groups = [...map.values()];
  if (mode === "monat") {
    // Schlüssel sind "JJJJ-MM" — String-Vergleich reicht; neueste zuerst.
    groups.sort((a, b) => (a.key < b.key ? 1 : -1));
  } else {
    groups.sort((a, b) => {
      // „Ohne Kunde" (zzz:…) ans Ende, sonst alphabetisch nach Anzeigename.
      const aOhne = a.key.startsWith("zzz:");
      const bOhne = b.key.startsWith("zzz:");
      if (aOhne !== bOhne) return aOhne ? 1 : -1;
      return a.label.localeCompare(b.label, "de-DE");
    });
  }
  return groups;
}
