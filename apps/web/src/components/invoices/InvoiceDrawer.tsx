import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  X,
  FilePlus2,
  Send,
  Wallet,
  BellRing,
  CheckCircle2,
  Ban,
  Briefcase,
  User,
  FileText,
  Download,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { InvoiceStatusBadge } from "@/components/ui/StatusBadge";
import { invoiceTimeline, type TimelineKind } from "@/lib/invoiceTimeline";
import {
  offerTotals,
  invoicePaidSum,
  invoiceDerivedStatus,
  type Invoice,
} from "@/types/database";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

const KIND_META: Record<TimelineKind, { icon: LucideIcon; cls: string }> = {
  erstellt: { icon: FilePlus2, cls: "text-ink-muted" },
  gestellt: { icon: Send, cls: "text-accent" },
  zahlung: { icon: Wallet, cls: "text-status-verfuegbar" },
  mahnung: { icon: BellRing, cls: "text-status-wartung" },
  bezahlt: { icon: CheckCircle2, cls: "text-status-verfuegbar" },
  storniert: { icon: Ban, cls: "text-status-defekt" },
};

/**
 * Seitliche Detail-Leiste (Drawer) über der Rechnungsliste: Verlaufs-Zeitstrahl
 * (erstellt → gestellt → Zahlungen/Mahnungen → bezahlt/storniert), Beträge und
 * die Verknüpfungen zu Kunde/Job/Angebot. Die Liste bleibt dahinter sichtbar —
 * schnelles Durchklicken statt Seitenwechsel.
 */
export function InvoiceDrawer({
  invoice,
  onClose,
  onDownloadPdf,
  downloading,
}: {
  invoice: Invoice;
  onClose: () => void;
  onDownloadPdf: (id: string) => void;
  downloading: boolean;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const derived = invoiceDerivedStatus(invoice, invoice.items, invoice.payments);
  const { gross, net } = offerTotals(invoice.items ?? [], invoice.tax_rate);
  const paid = invoicePaidSum(invoice.payments);
  const open = Math.max(0, gross - paid);
  const events = invoiceTimeline(invoice);

  const customer = invoice.customer;
  const customerName = customer
    ? customer.company_name || [customer.first_name, customer.last_name].filter(Boolean).join(" ")
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} role="presentation">
      <aside
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-border bg-bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Rechnung ${invoice.invoice_number ?? "Entwurf"}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="font-mono text-xs text-ink-muted">{invoice.invoice_number ?? "Entwurf"}</p>
            <h2 className="truncate text-base font-semibold text-ink">{invoice.title}</h2>
            <div className="mt-1.5">
              <InvoiceStatusBadge status={derived} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-ink-muted hover:bg-bg-raised hover:text-ink"
            aria-label="Schließen"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* Beträge */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md border border-border px-3 py-2">
              <p className="text-[11px] text-ink-muted">Brutto</p>
              <p className="font-mono text-sm font-semibold text-ink">{formatCurrency(gross)}</p>
              <p className="text-[11px] text-ink-faint">netto {formatCurrency(net)}</p>
            </div>
            <div className="rounded-md border border-border px-3 py-2">
              <p className="text-[11px] text-ink-muted">Bezahlt</p>
              <p className="font-mono text-sm font-semibold text-status-verfuegbar">{formatCurrency(paid)}</p>
            </div>
            <div className="rounded-md border border-border px-3 py-2">
              <p className="text-[11px] text-ink-muted">Offen</p>
              <p
                className={cn(
                  "font-mono text-sm font-semibold",
                  invoice.status === "storniert" ? "text-ink-faint" : open > 0 ? "text-status-wartung" : "text-ink-faint",
                )}
              >
                {invoice.status === "storniert" ? "—" : formatCurrency(open)}
              </p>
            </div>
          </div>

          {/* Verknüpfungen */}
          {(customerName || invoice.job_id || invoice.offer_id) && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-ink-muted">Gehört zu</p>
              {customerName && invoice.customer_id && (
                <Link
                  to={`/kunden/${invoice.customer_id}`}
                  className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-ink hover:border-accent/50"
                >
                  <User size={14} className="text-ink-muted" />
                  <span className="truncate">{customerName}</span>
                </Link>
              )}
              {invoice.job_id && (
                <Link
                  to={`/jobs/${invoice.job_id}`}
                  className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-ink hover:border-accent/50"
                >
                  <Briefcase size={14} className="text-ink-muted" />
                  Zum Job
                </Link>
              )}
              {invoice.offer_id && (
                <Link
                  to="/angebote"
                  className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-ink hover:border-accent/50"
                >
                  <FileText size={14} className="text-ink-muted" />
                  Aus Angebot entstanden
                </Link>
              )}
            </div>
          )}

          {/* Zeitstrahl */}
          <div>
            <p className="mb-2 text-xs font-medium text-ink-muted">Verlauf</p>
            <ol className="space-y-0">
              {events.map((event, i) => {
                const meta = KIND_META[event.kind];
                const Icon = meta.icon;
                const last = i === events.length - 1;
                return (
                  <li key={`${event.kind}-${event.at}-${i}`} className="relative flex gap-3 pb-4">
                    {!last && <span className="absolute left-[9px] top-6 h-full w-px bg-border" aria-hidden />}
                    <span
                      className={cn(
                        "z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg-raised",
                        meta.cls,
                      )}
                    >
                      <Icon size={12} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-ink">
                        {event.label}
                        {event.amount !== undefined && (
                          <span className="ml-1.5 font-mono text-xs text-ink-muted">
                            {formatCurrency(event.amount)}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-ink-faint">
                        {formatDateTime(event.at)}
                        {event.detail ? ` · ${event.detail}` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <div className="border-t border-border px-5 py-3">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => onDownloadPdf(invoice.id)}
            disabled={downloading}
          >
            <Download size={15} />
            {downloading ? "PDF wird erzeugt …" : "PDF herunterladen"}
          </Button>
        </div>
      </aside>
    </div>
  );
}
