import { describe, it, expect } from "vitest";
import { formatDate, formatDateTime, formatCurrency, formatNumber, initials } from "@/lib/format";

describe("formatDate / formatDateTime", () => {
  it("formatiert ISO-Strings deutsch", () => {
    expect(formatDate("2026-07-02T10:30:00")).toBe("02.07.2026");
    expect(formatDateTime("2026-07-02T10:30:00")).toBe("02.07.2026 10:30");
  });

  it("gibt — für leere oder ungültige Werte", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
    expect(formatDate("quatsch")).toBe("—");
  });
});

describe("formatCurrency / formatNumber", () => {
  it("formatiert Beträge als deutsche Währung", () => {
    // Intl setzt ein geschütztes Leerzeichen (U+00A0) vor das Euro-Zeichen.
    expect(formatCurrency(1234.56)).toBe("1.234,56\u00a0€");
    expect(formatCurrency(0)).toBe("0,00\u00a0€");
  });

  it("formatiert Zahlen mit Tausendertrennzeichen", () => {
    expect(formatNumber(1234567)).toBe("1.234.567");
  });

  it("gibt — für null/undefined", () => {
    expect(formatCurrency(null)).toBe("—");
    expect(formatNumber(undefined)).toBe("—");
  });
});

describe("initials", () => {
  it("nimmt die Anfangsbuchstaben der ersten beiden Wörter", () => {
    expect(initials("Max Mustermann")).toBe("MM");
    expect(initials("anna lena maria")).toBe("AL");
  });

  it("kommt mit einem Wort und Extra-Whitespace klar", () => {
    expect(initials("Max")).toBe("M");
    expect(initials("  Max   Mustermann  ")).toBe("MM");
  });
});
