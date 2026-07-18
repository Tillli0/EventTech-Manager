import { describe, it, expect } from "vitest";
import { parseCsv } from "@/lib/csv";

// Getestet wird bewusst nur parseCsv: exportToCsv braucht DOM (Blob/Anchor), die
// Vitest-Umgebung läuft aber im Node-Environment. parseCsv ist ohnehin der
// riskantere Teil — ein handgeschriebener Zustandsautomat für RFC4180.

describe("parseCsv — Grundfälle", () => {
  it("liest Kopfzeile und Werte semikolon-getrennt", () => {
    const rows = parseCsv("Name;Ort\r\nMilad;Bad Vilbel\r\nSandra;Karben");
    expect(rows).toEqual([
      { Name: "Milad", Ort: "Bad Vilbel" },
      { Name: "Sandra", Ort: "Karben" },
    ]);
  });

  it("kommt mit reinem \\n statt \\r\\n zurecht", () => {
    expect(parseCsv("A;B\nx;y")).toEqual([{ A: "x", B: "y" }]);
  });

  it("gibt eine leere Liste bei leerem Text", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("gibt eine leere Liste, wenn nur die Kopfzeile da ist", () => {
    expect(parseCsv("Name;Ort")).toEqual([]);
  });
});

describe("parseCsv — Escaping (Gegenstück zu exportToCsv)", () => {
  it("löst Anführungszeichen auf und behält das Trennzeichen im Feld", () => {
    // exportToCsv setzt ein Feld in Anführungszeichen, sobald ; " \r oder \n vorkommt.
    const rows = parseCsv('Titel;Ort\r\n"Bühne, Ton; Licht";Marktplatz');
    expect(rows[0].Titel).toBe("Bühne, Ton; Licht");
    expect(rows[0].Ort).toBe("Marktplatz");
  });

  it("macht aus verdoppelten Anführungszeichen wieder eines", () => {
    const rows = parseCsv('Notiz\r\n"Er sagte ""hallo"" laut"');
    expect(rows[0].Notiz).toBe('Er sagte "hallo" laut');
  });

  it("erlaubt Zeilenumbrüche innerhalb eines Feldes", () => {
    const rows = parseCsv('Notiz;Ort\r\n"Zeile 1\nZeile 2";Halle');
    expect(rows).toHaveLength(1);
    expect(rows[0].Notiz).toBe("Zeile 1\nZeile 2");
    expect(rows[0].Ort).toBe("Halle");
  });
});

describe("parseCsv — Robustheit", () => {
  it("entfernt das UTF-8-BOM aus der ersten Spaltenüberschrift", () => {
    // exportToCsv stellt bewusst ein BOM voran, damit Excel-DE Umlaute erkennt.
    const rows = parseCsv("﻿Name;Ort\r\nMilad;Karben");
    expect(Object.keys(rows[0])).toEqual(["Name", "Ort"]);
    expect(rows[0].Name).toBe("Milad");
  });

  it("überspringt vollständig leere Zeilen", () => {
    const rows = parseCsv("A;B\r\nx;y\r\n;\r\n\r\np;q");
    expect(rows).toEqual([
      { A: "x", B: "y" },
      { A: "p", B: "q" },
    ]);
  });

  it("füllt fehlende Spalten mit leerem String statt undefined", () => {
    const rows = parseCsv("A;B;C\r\nx;y");
    expect(rows[0]).toEqual({ A: "x", B: "y", C: "" });
  });

  it("liest die letzte Zeile auch ohne abschließenden Zeilenumbruch", () => {
    expect(parseCsv("A;B\r\nx;y")).toHaveLength(1);
  });
});
