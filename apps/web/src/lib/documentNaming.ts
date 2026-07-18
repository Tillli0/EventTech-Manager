// Namens-Konvention für automatisch archivierte PDFs (D4).
//
// Erzeugte Angebots-/Rechnungs-PDFs werden dauerhaft im Dokumente-System abgelegt
// (siehe PLAN-NEUAUSRICHTUNG.md, Block A / D4). Der Dateiname soll sprechend sein —
// so wie Till ihn in seiner Ablage sehen will: „RE-2026-0043_Stadt-Musterstadt.pdf".
// Reine Funktion (kein I/O) → als Vitest-Unit getestet.

/** Umlaute/ß für Dateinamen transliterieren (ä→ae, ö→oe, ü→ue, ß→ss). */
function transliterate(value: string): string {
  return value
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe")
    .replace(/Ü/g, "Ue")
    .replace(/ß/g, "ss");
}

/**
 * Macht einen frei eingegebenen Namen dateisystem-sicher, aber lesbar:
 * Umlaute transliteriert, alles außer Buchstaben/Ziffern zu „-", Groß-/
 * Kleinschreibung bleibt erhalten. Beispiel: „Müller & Co. GmbH" → „Mueller-Co-GmbH".
 */
export function slugifyName(name: string): string {
  return transliterate(name)
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Dateiname für ein archiviertes Beleg-PDF: „<Nummer>_<Kunde>.pdf".
 * Ohne (leeren) Kundennamen bleibt nur die Nummer: „<Nummer>.pdf".
 *
 * @param number  Beleg-Nummer, z.B. „RE-2026-0001" oder „AN-2026-0001"
 * @param name    Kunden-Anzeigename (Firma oder Vor-/Nachname), darf leer sein
 */
export function archivedDocumentName(number: string, name: string | null | undefined): string {
  const slug = slugifyName((name ?? "").trim());
  return slug ? `${number}_${slug}.pdf` : `${number}.pdf`;
}
