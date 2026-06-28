import type { Offer } from "@/types/database";
import { fetchCompanySettings } from "@/hooks/useCompanySettings";

/**
 * Erzeugt das Angebots-PDF und löst den Download aus. Lädt die schwere
 * PDF-Bibliothek (`@react-pdf/renderer`) und das Dokument **dynamisch** nach,
 * damit sie nicht im Initial-Bundle landen, sondern erst beim ersten PDF.
 */
export async function downloadOfferPdf(offer: Offer) {
  const [{ pdf }, { OfferPdfDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/offers/OfferPdfDocument"),
  ]);
  const company = await fetchCompanySettings();
  const blob = await pdf(<OfferPdfDocument offer={offer} company={company} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Angebot-${offer.offer_number}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
