import type { Offer } from "@/types/database";
import { fetchCompanySettings } from "@/hooks/useCompanySettings";

/**
 * Rendert das Angebots-PDF als Blob. Lädt die schwere PDF-Bibliothek
 * (`@react-pdf/renderer`) und das Dokument **dynamisch** nach, damit sie nicht
 * im Initial-Bundle landen. Basis für Download UND Auto-Archiv (D4).
 */
export async function renderOfferPdfBlob(offer: Offer): Promise<Blob> {
  const [{ pdf }, { OfferPdfDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/offers/OfferPdfDocument"),
  ]);
  const company = await fetchCompanySettings();
  return pdf(<OfferPdfDocument offer={offer} company={company} />).toBlob();
}

/** Erzeugt das Angebots-PDF und löst den Download aus. */
export async function downloadOfferPdf(offer: Offer) {
  const blob = await renderOfferPdfBlob(offer);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Angebot-${offer.offer_number}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
