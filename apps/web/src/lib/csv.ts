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

/**
 * Liest eine CSV-Datei (Gegenstück zu exportToCsv): Semikolon-getrennt, BOM wird
 * entfernt, Anführungszeichen werden entsprechend RFC4180 aufgelöst. Gibt pro Zeile
 * ein Objekt { Spaltenname: Wert } zurück, basierend auf der Kopfzeile.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = parseCsvRows(clean);
  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows
    .slice(1)
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] ?? "";
      });
      return obj;
    });
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ";") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (char === "\r") {
      i += 1;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
