import type { Invoice } from "@/types/database";
import { fetchCompanySettings } from "@/hooks/useCompanySettings";

/**
 * Rendert das Rechnungs-PDF als Blob. Die schwere PDF-Bibliothek wird dynamisch
 * nachgeladen (nicht im Initial-Bundle). Basis für Download UND Auto-Archiv (D4).
 */
export async function renderInvoicePdfBlob(invoice: Invoice): Promise<Blob> {
  const [{ pdf }, { InvoicePdfDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/invoices/InvoicePdfDocument"),
  ]);
  const company = await fetchCompanySettings();
  return pdf(<InvoicePdfDocument invoice={invoice} company={company} />).toBlob();
}

/** Erzeugt das Rechnungs-PDF und löst den Download aus. */
export async function downloadInvoicePdf(invoice: Invoice) {
  const blob = await renderInvoicePdfBlob(invoice);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${invoice.invoice_number ? `Rechnung-${invoice.invoice_number}` : "Rechnungsentwurf"}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
