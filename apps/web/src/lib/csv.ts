/**
 * Generischer CSV-Export. Erzeugt aus Spalten-Definition + Zeilen eine CSV-Datei
 * und löst den Download aus (Blob/Anchor-Muster wie lib/ics.ts).
 *
 * Bewusst für deutsches Excel ausgelegt:
 *  - Semikolon als Trennzeichen (Excel-DE erwartet das bei Komma-Dezimalzahlen)
 *  - UTF-8-BOM vorangestellt, damit Umlaute korrekt erkannt werden
 */
export interface CsvColumn<T> {
  label: string;
  value: (row: T) => string | number | null | undefined;
}

export function exportToCsv<T>(filename: string, columns: CsvColumn<T>[], rows: T[]) {
  const header = columns.map((c) => escapeCsv(c.label)).join(";");
  const body = rows
    .map((row) => columns.map((c) => escapeCsv(formatCell(c.value(row)))).join(";"))
    .join("\r\n");

  const content = "﻿" + header + "\r\n" + body;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function escapeCsv(value: string): string {
  // In Anführungszeichen setzen, wenn Trennzeichen, Anführungszeichen oder
  // Zeilenumbruch enthalten sind; enthaltene Anführungszeichen verdoppeln.
  if (/[";\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
