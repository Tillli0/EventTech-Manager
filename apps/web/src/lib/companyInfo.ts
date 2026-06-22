/**
 * Absenderdaten für Angebots-PDFs (Briefkopf, Fußzeile).
 *
 * Vorerst fest im Code als Platzhalter hinterlegt. Sobald eine Einstellungsseite
 * existiert, sollte diese Konstante durch die gespeicherten Firmendaten ersetzt
 * werden (gleiche Struktur, damit das PDF-Dokument unverändert bleibt).
 */
export interface CompanyInfo {
  name: string;
  addressLines: string[];
  phone?: string;
  email?: string;
  website?: string;
  taxId?: string;
  /** Bankverbindung o.Ä. für die Fußzeile. */
  bankLine?: string;
  /** Standard-Zahlungsziel/Hinweistext unter dem Angebot. */
  paymentTerms?: string;
}

export const COMPANY_INFO: CompanyInfo = {
  name: "EventTech GmbH",
  addressLines: ["Musterstraße 1", "12345 Musterstadt"],
  phone: "+49 123 456789",
  email: "info@eventtech.example",
  website: "www.eventtech.example",
  taxId: "DE000000000",
  bankLine: "Musterbank · IBAN DE00 0000 0000 0000 0000 00 · BIC XXXXDEXX",
  paymentTerms:
    "Dieses Angebot ist freibleibend. Alle Preise verstehen sich netto zzgl. der gesetzlichen Umsatzsteuer.",
};
