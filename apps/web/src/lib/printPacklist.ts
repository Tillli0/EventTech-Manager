import type { Job } from "@/types/database";
import { formatDateTime } from "@/lib/format";

/**
 * Öffnet eine druckfreundliche A4-Ansicht der Packliste eines Jobs (Lieferschein
 * fürs Lager) in einem neuen Fenster und ruft den Druckdialog auf. Bewusst nach
 * demselben window-print-Muster wie printBarcodeLabels() — kein @react-pdf, da
 * hier nur schnell gedruckt/abgehakt und nicht archiviert wird.
 */
export function printPacklist(job: Job) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const customer = job.customer;
  const customerLabel = customer
    ? customer.company_name || [customer.first_name, customer.last_name].filter(Boolean).join(" ")
    : null;

  const items = job.packlist_items ?? [];

  const rowsHtml = items
    .map((item) => {
      const barcode = item.device?.barcodes?.[0]?.code ?? "";
      return `
        <tr>
          <td class="check"></td>
          <td>${escapeHtml(item.device?.name ?? "—")}</td>
          <td class="mono">${escapeHtml(barcode)}</td>
          <td class="qty">${item.quantity}×</td>
        </tr>
      `;
    })
    .join("");

  const metaParts = [
    `${escapeHtml(formatDateTime(job.start_date))} – ${escapeHtml(formatDateTime(job.end_date))}`,
    customerLabel ? escapeHtml(customerLabel) : null,
    job.location ? escapeHtml(job.location) : null,
  ].filter(Boolean);

  printWindow.document.write(`
    <!doctype html>
    <html lang="de">
      <head>
        <meta charset="utf-8" />
        <title>Packliste — ${escapeHtml(job.title)}</title>
        <style>
          @page { margin: 16mm; }
          * { box-sizing: border-box; }
          body { margin: 0; font-family: Arial, sans-serif; color: #1a1a1a; font-size: 11pt; }
          h1 { font-size: 18pt; margin: 0 0 4px; }
          .meta { color: #555; font-size: 10pt; margin-bottom: 20px; }
          .meta span:not(:last-child)::after { content: " · "; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: left; border-bottom: 2px solid #1a1a1a; padding: 6px 8px; font-size: 9pt; text-transform: uppercase; }
          td { padding: 8px; border-bottom: 1px solid #ccc; }
          tr { page-break-inside: avoid; }
          .check { width: 28px; }
          .check::before { content: ""; display: inline-block; width: 16px; height: 16px; border: 1.5px solid #1a1a1a; border-radius: 3px; }
          .mono { font-family: "Courier New", monospace; color: #555; font-size: 9pt; }
          .qty { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
          .empty { padding: 24px 8px; color: #777; text-align: center; }
          .foot { margin-top: 28px; font-size: 9pt; color: #777; }
        </style>
      </head>
      <body>
        <h1>Packliste — ${escapeHtml(job.title)}</h1>
        <div class="meta">${metaParts.map((p) => `<span>${p}</span>`).join("")}</div>
        <table>
          <thead>
            <tr>
              <th class="check"></th>
              <th>Gerät</th>
              <th>Barcode</th>
              <th class="qty">Menge</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="4" class="empty">Keine Geräte auf der Packliste.</td></tr>`}
          </tbody>
        </table>
        <p class="foot">Gedruckt am ${escapeHtml(formatDateTime(new Date().toISOString()))} · ${items.length} Posten</p>
        <script>
          window.onload = () => setTimeout(() => window.print(), 300);
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}
