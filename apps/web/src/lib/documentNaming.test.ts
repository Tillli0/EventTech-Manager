import { describe, it, expect } from "vitest";
import { slugifyName, archivedDocumentName } from "./documentNaming";

describe("slugifyName", () => {
  it("ersetzt Leerzeichen durch Bindestriche, Groß-/Kleinschreibung bleibt", () => {
    expect(slugifyName("Stadt Musterstadt")).toBe("Stadt-Musterstadt");
  });

  it("transliteriert Umlaute und ß", () => {
    expect(slugifyName("Müller Grün Straße")).toBe("Mueller-Gruen-Strasse");
    expect(slugifyName("Öko Über Ähre")).toBe("Oeko-Ueber-Aehre");
  });

  it("wirft Sonderzeichen raus und kollabiert Trenner", () => {
    expect(slugifyName("Müller & Co. GmbH")).toBe("Mueller-Co-GmbH");
    expect(slugifyName("A/B  —  C")).toBe("A-B-C");
  });

  it("trimmt führende/abschließende Trenner", () => {
    expect(slugifyName("  .Firma.  ")).toBe("Firma");
    expect(slugifyName("---x---")).toBe("x");
  });

  it("liefert leeren String, wenn nichts Verwertbares übrig bleibt", () => {
    expect(slugifyName("   ")).toBe("");
    expect(slugifyName("&/.-")).toBe("");
  });
});

describe("archivedDocumentName", () => {
  it("verbindet Nummer und Kundennamen", () => {
    expect(archivedDocumentName("RE-2026-0043", "Stadt Musterstadt")).toBe(
      "RE-2026-0043_Stadt-Musterstadt.pdf",
    );
    expect(archivedDocumentName("AN-2026-0001", "Müller & Co. GmbH")).toBe(
      "AN-2026-0001_Mueller-Co-GmbH.pdf",
    );
  });

  it("nutzt nur die Nummer, wenn kein Kundenname da ist", () => {
    expect(archivedDocumentName("RE-2026-0007", null)).toBe("RE-2026-0007.pdf");
    expect(archivedDocumentName("RE-2026-0007", "")).toBe("RE-2026-0007.pdf");
    expect(archivedDocumentName("RE-2026-0007", "   ")).toBe("RE-2026-0007.pdf");
  });
});
