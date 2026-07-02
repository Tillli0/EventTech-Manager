import type { Invoice } from "@/types/database";
import { fetchCompanySettings } from "@/hooks/useCompanySettings";

/**
 * Erzeugt das Rechnungs-PDF und löst den Download aus. Wie beim Angebot wird
 * die schwere PDF-Bibliothek dynamisch nachgeladen (nicht im Initial-Bundle).
 */
export async function downloadInvoicePdf(invoice: Invoice) {
  const [{ pdf }, { InvoicePdfDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/invoices/InvoicePdfDocument"),
  ]);
  const company = await fetchCompanySettings();
  const blob = await pdf(<InvoicePdfDocument invoice={invoice} company={company} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${invoice.invoice_number ? `Rechnung-${invoice.invoice_number}` : "Rechnungsentwurf"}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
