import { useMemo, useState } from "react";
import { Plus, Receipt, Download, Trash2, Pencil, Send, Ban, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { InvoiceStatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/States";
import {
  useInvoices,
  useIssueInvoice,
  useCancelInvoice,
  useDeleteInvoice,
  fetchInvoiceWithItems,
} from "@/hooks/useInvoices";
import {
  offerTotals,
  invoicePaidSum,
  invoiceDerivedStatus,
  INVOICE_STATUS_OPTIONS,
  type Invoice,
  type InvoiceDerivedStatus,
} from "@/types/database";
import { formatCurrency, formatDate } from "@/lib/format";
import { downloadInvoicePdf } from "@/lib/invoicePdf";
import { InvoiceDialog } from "@/components/invoices/InvoiceDialog";
import { PaymentDialog } from "@/components/invoices/PaymentDialog";
import { useAuth } from "@/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Filter = InvoiceDerivedStatus | "alle";

export function InvoicesPage() {
  const { canEdit } = useAuth();
  const mayEdit = canEdit("angebote");
  const { data: invoices, isLoading, error } = useInvoices();
  const issueInvoice = useIssueInvoice();
  const cancelInvoice = useCancelInvoice();
  const deleteInvoice = useDeleteInvoice();
  const toast = useToast();
  const confirm = useConfirm();

  const [createOpen, setCreateOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [paymentsFor, setPaymentsFor] = useState<Invoice | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("alle");

  // Abgeleiteten Status je Rechnung einmal berechnen (Zahlungen + Fälligkeit).
  const withStatus = useMemo(
    () =>
      (invoices ?? []).map((inv) => ({
        invoice: inv,
        derived: invoiceDerivedStatus(inv, inv.items, inv.payments),
      })),
    [invoices],
  );

  const counts = useMemo(() => {
    const c = new Map<InvoiceDerivedStatus, number>();
    for (const { derived } of withStatus) c.set(derived, (c.get(derived) ?? 0) + 1);
    return c;
  }, [withStatus]);

  const filtered = filter === "alle" ? withStatus : withStatus.filter((e) => e.derived === filter);

  /** Summe der offenen Beträge (gestellt/teilbezahlt/überfällig). */
  const openTotal = useMemo(() => {
    let sum = 0;
    for (const { invoice, derived } of withStatus) {
      if (derived === "gestellt" || derived === "teilbezahlt" || derived === "ueberfaellig") {
        const { gross } = offerTotals(invoice.items ?? [], invoice.tax_rate);
        sum += Math.max(0, gross - invoicePaidSum(invoice.payments));
      }
    }
    return sum;
  }, [withStatus]);

  async function handleDownload(id: string) {
    setDownloadingId(id);
    try {
      const invoice = await fetchInvoiceWithItems(id);
      await downloadInvoicePdf(invoice);
    } catch (err) {
      console.error("PDF konnte nicht erzeugt werden:", err);
      toast.error("Das PDF konnte nicht erzeugt werden.");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleIssue(invoice: Invoice) {
    const ok = await confirm({
      title: "Rechnung stellen?",
      message:
        "Die Rechnung erhält jetzt ihre endgültige, fortlaufende Nummer und kann danach nicht mehr inhaltlich geändert oder gelöscht werden (nur storniert).",
      confirmLabel: "Rechnung stellen",
    });
    if (!ok) return;
    try {
      const issued = await issueInvoice.mutateAsync(invoice);
      toast.success(`Rechnung ${issued.invoice_number} gestellt.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rechnung konnte nicht gestellt werden.");
    }
  }

  async function handleCancel(invoice: Invoice) {
    const ok = await confirm({
      title: "Rechnung stornieren?",
      message: `Rechnung ${invoice.invoice_number ?? ""} wird als storniert markiert (sie bleibt für die Unterlagen erhalten).`,
      confirmLabel: "Stornieren",
      danger: true,
    });
    if (!ok) return;
    try {
      await cancelInvoice.mutateAsync(invoice.id);
      toast.success("Rechnung storniert.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Konnte nicht storniert werden.");
    }
  }

  async function handleDelete(invoice: Invoice) {
    const ok = await confirm({
      title: "Entwurf löschen?",
      message: "Der Rechnungsentwurf wird endgültig gelöscht.",
      confirmLabel: "Löschen",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteInvoice.mutateAsync(invoice.id);
      toast.success("Entwurf gelöscht.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Konnte nicht gelöscht werden.");
    }
  }

  function customerLabel(invoice: Invoice) {
    const c = invoice.customer;
    if (!c) return "—";
    return c.company_name || [c.first_name, c.last_name].filter(Boolean).join(" ") || "—";
  }

  const filterOptions: { value: Filter; label: string; count: number }[] = [
    { value: "alle", label: "Alle", count: withStatus.length },
    ...INVOICE_STATUS_OPTIONS.map((o) => ({
      value: o.value as Filter,
      label: o.label,
      count: counts.get(o.value) ?? 0,
    })),
  ];

  return (
    <div>
      <PageHeader
        title="Rechnungen"
        description={
          invoices && invoices.length > 0
            ? `${invoices.length} Rechnungen · offen: ${formatCurrency(openTotal)}`
            : undefined
        }
        actions={
          mayEdit ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              Rechnung erstellen
            </Button>
          ) : undefined
        }
      />

      {isLoading && <LoadingState label="Rechnungen werden geladen …" />}
      {error && <ErrorState message={error.message} />}

      {!isLoading && !error && (!invoices || invoices.length === 0) && (
        <EmptyState
          icon={Receipt}
          title="Noch keine Rechnungen"
          description="Erstelle eine Rechnung direkt oder übernimm ein Angebot per „Zu Rechnung“ von der Angebotsseite."
          action={
            mayEdit ? (
              <Button variant="secondary" onClick={() => setCreateOpen(true)}>
                <Plus size={16} />
                Erste Rechnung erstellen
              </Button>
            ) : undefined
          }
        />
      )}

      {invoices && invoices.length > 0 && (
        <>
          <Tabs<Filter> className="mb-4" options={filterOptions} value={filter} onChange={setFilter} />

          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-ink-muted">
                  <th className="px-4 py-3 font-medium">Nummer</th>
                  <th className="px-4 py-3 font-medium">Betreff</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Kunde</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Fällig</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">Brutto</th>
                  <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">Offen</th>
                  <th className="px-4 py-3 text-right font-medium">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ invoice, derived }) => {
                  const { gross } = offerTotals(invoice.items ?? [], invoice.tax_rate);
                  const open = Math.max(0, gross - invoicePaidSum(invoice.payments));
                  const isDraft = invoice.status === "entwurf";
                  return (
                    <tr key={invoice.id} className="border-b border-border last:border-0 hover:bg-bg-raised">
                      <td className="px-4 py-3 font-mono text-xs text-ink">
                        {invoice.invoice_number ?? <span className="text-ink-faint">Entwurf</span>}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink">{invoice.title}</td>
                      <td className="hidden px-4 py-3 text-ink-muted sm:table-cell">{customerLabel(invoice)}</td>
                      <td className="hidden px-4 py-3 text-ink-muted md:table-cell">
                        {invoice.due_date ? formatDate(invoice.due_date) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <InvoiceStatusBadge status={derived} />
                      </td>
                      <td className="hidden px-4 py-3 text-right font-mono text-ink-muted lg:table-cell">
                        {formatCurrency(gross)}
                      </td>
                      <td className="hidden px-4 py-3 text-right font-mono lg:table-cell">
                        <span className={open > 0 && !isDraft ? "text-ink" : "text-ink-faint"}>
                          {invoice.status === "storniert" ? "—" : formatCurrency(open)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {mayEdit && isDraft && (
                            <Button
                              size="sm"
                              onClick={() => handleIssue(invoice)}
                              disabled={issueInvoice.isPending}
                              title="Nummer vergeben und Rechnung stellen"
                            >
                              <Send size={14} />
                              Stellen
                            </Button>
                          )}
                          {mayEdit && invoice.status === "gestellt" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setPaymentsFor(invoice)}
                              title="Zahlungen erfassen"
                            >
                              <Wallet size={14} />
                              Zahlung
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDownload(invoice.id)}
                            disabled={downloadingId === invoice.id}
                          >
                            <Download size={14} />
                            {downloadingId === invoice.id ? "…" : "PDF"}
                          </Button>
                          {mayEdit && invoice.status !== "storniert" && (
                            <button
                              type="button"
                              onClick={() => setEditInvoice(invoice)}
                              className="flex h-8 w-8 items-center justify-center rounded text-ink-muted hover:text-accent"
                              aria-label="Rechnung bearbeiten"
                              title={isDraft ? "Bearbeiten" : "Fälligkeit/Notizen bearbeiten"}
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          {mayEdit && invoice.status === "gestellt" && (
                            <button
                              type="button"
                              onClick={() => handleCancel(invoice)}
                              className="flex h-8 w-8 items-center justify-center rounded text-ink-muted hover:text-status-defekt"
                              aria-label="Rechnung stornieren"
                              title="Stornieren"
                            >
                              <Ban size={14} />
                            </button>
                          )}
                          {mayEdit && isDraft && (
                            <button
                              type="button"
                              onClick={() => handleDelete(invoice)}
                              className="flex h-8 w-8 items-center justify-center rounded text-ink-muted hover:text-status-defekt"
                              aria-label="Entwurf löschen"
                              title="Entwurf löschen"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}

      <InvoiceDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <InvoiceDialog open={!!editInvoice} onClose={() => setEditInvoice(null)} editInvoice={editInvoice ?? undefined} />
      {paymentsFor && (
        <PaymentDialog
          invoice={invoices?.find((i) => i.id === paymentsFor.id) ?? paymentsFor}
          open
          onClose={() => setPaymentsFor(null)}
          canEdit={mayEdit}
        />
      )}
    </div>
  );
}
