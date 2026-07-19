import { Link } from "react-router-dom";
import { FileText, Receipt, Download, Plus } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OfferStatusBadge, InvoiceStatusBadge } from "@/components/ui/StatusBadge";
import { offerTotals, invoicePaidSum, invoiceDerivedStatus, type Offer, type Invoice } from "@/types/database";
import { formatCurrency } from "@/lib/format";

// Geteilte „verknüpfte Vorgänge"-Karten (PLAN-UI-NEUSCHNITT.md U5, Review-Befund #4/#6):
// Angebote- und Rechnungen-Karte liefen zuvor doppelt in JobDetailPage und
// CustomerDetailPage. Jetzt eine Komponente je Domäne; die Seite lädt die Daten (die
// Hooks unterscheiden sich je Vorgang) und reicht sie herein.

/** Verknüpfte Angebote. `onCreate` optional (nur wo Anlegen erlaubt/sinnvoll ist). */
export function LinkedOffersCard({
  offers,
  onDownload,
  downloadingId,
  onCreate,
  hideWhenEmpty = false,
}: {
  offers: Offer[] | undefined;
  onDownload: (offerId: string) => void;
  downloadingId: string | null;
  onCreate?: () => void;
  /** Karte ganz ausblenden, wenn leer (Job-Detailseite). */
  hideWhenEmpty?: boolean;
}) {
  const isEmpty = !offers || offers.length === 0;
  if (isEmpty && hideWhenEmpty && !onCreate) return null;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <FileText size={14} />
          Angebote
        </h2>
        {onCreate && (
          <Button size="sm" variant="secondary" onClick={onCreate}>
            <Plus size={14} />
            Neues Angebot
          </Button>
        )}
      </CardHeader>
      <CardBody>
        {isEmpty ? (
          <p className="flex items-center gap-2 text-sm text-ink-faint">
            <FileText size={14} />
            Noch keine Angebote.
          </p>
        ) : (
          <div className="space-y-2">
            {offers.map((offer) => {
              const { gross } = offerTotals(offer.items ?? [], offer.tax_rate);
              return (
                <div
                  key={offer.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{offer.title}</p>
                    <p className="font-mono text-xs text-ink-muted">
                      {offer.offer_number} · {formatCurrency(gross)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <OfferStatusBadge status={offer.status} />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onDownload(offer.id)}
                      disabled={downloadingId === offer.id}
                    >
                      <Download size={14} />
                      {downloadingId === offer.id ? "…" : "PDF"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

/** Verknüpfte Rechnungen mit Status und offenem Betrag. */
export function LinkedInvoicesCard({
  invoices,
  hideWhenEmpty = false,
}: {
  invoices: Invoice[] | undefined;
  hideWhenEmpty?: boolean;
}) {
  const isEmpty = !invoices || invoices.length === 0;
  if (isEmpty && hideWhenEmpty) return null;

  const openTotal = (invoices ?? []).reduce((sum, inv) => {
    if (inv.status !== "gestellt") return sum;
    const { gross } = offerTotals(inv.items ?? [], inv.tax_rate);
    return sum + Math.max(0, gross - invoicePaidSum(inv.payments));
  }, 0);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Receipt size={14} />
          Rechnungen
        </h2>
        {openTotal > 0 && <span className="font-mono text-xs text-ink-muted">offen: {formatCurrency(openTotal)}</span>}
      </CardHeader>
      <CardBody>
        {isEmpty ? (
          <p className="flex items-center gap-2 text-sm text-ink-faint">
            <Receipt size={14} />
            Noch keine Rechnungen.
          </p>
        ) : (
          <div className="space-y-2">
            {invoices.map((invoice) => {
              const { gross } = offerTotals(invoice.items ?? [], invoice.tax_rate);
              const derived = invoiceDerivedStatus(invoice, invoice.items, invoice.payments);
              return (
                <Link
                  key={invoice.id}
                  to={`/rechnungen?open=${invoice.id}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 hover:border-accent/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{invoice.title}</p>
                    <p className="font-mono text-xs text-ink-muted">
                      {invoice.invoice_number ?? "Entwurf"} · {formatCurrency(gross)}
                    </p>
                  </div>
                  <InvoiceStatusBadge status={derived} />
                </Link>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
