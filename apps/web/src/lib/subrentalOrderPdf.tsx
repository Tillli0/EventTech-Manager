import type { Subrental } from "@/types/database";
import { fetchCompanySettings } from "@/hooks/useCompanySettings";

/**
 * Rendert das Bestell-PDF (Mietanfrage an den Verleih-Partner) als Blob. Lädt
 * `@react-pdf/renderer` + das Dokument dynamisch nach (Muster `offerPdf.tsx`).
 * Setzt voraus, dass `subrental.order_number` bereits vergeben ist.
 */
export async function renderSubrentalOrderPdfBlob(subrental: Subrental): Promise<Blob> {
  const [{ pdf }, { SubrentalOrderPdfDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/documents/SubrentalOrderPdfDocument"),
  ]);
  const company = await fetchCompanySettings();
  return pdf(<SubrentalOrderPdfDocument subrental={subrental} company={company} />).toBlob();
}

/** Erzeugt das Bestell-PDF und löst den Download aus. */
export async function downloadSubrentalOrderPdf(subrental: Subrental) {
  const blob = await renderSubrentalOrderPdfBlob(subrental);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Mietanfrage-${subrental.order_number}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
