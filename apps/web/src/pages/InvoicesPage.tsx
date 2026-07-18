import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Plus, Receipt, Download, Trash2, Pencil, Send, Ban, Wallet, BellRing, FileDown } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { InvoiceStatusBadge } from "@/components/ui/StatusBadge";
import { SummaryStats } from "@/components/ui/SummaryStats";
import { YearFilter } from "@/components/ui/YearFilter";
import { GroupHeaderRow } from "@/components/ui/GroupRow";
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
  lastDunningLevel,
  DUNNING_LEVEL_LABELS,
  INVOICE_STATUS_OPTIONS,
  type Invoice,
  type InvoiceDerivedStatus,
} from "@/types/database";
import {
  availableYears,
  filterByYear,
  groupItems,
  type GroupMode,
  type YearValue,
} from "@/lib/listGrouping";
import { formatCurrency, formatDate } from "@/lib/format";
import { exportToCsv } from "@/lib/csv";
import { downloadInvoicePdf } from "@/lib/invoicePdf";
import { archiveInvoicePdf } from "@/hooks/useDocuments";
import { InvoiceDialog } from "@/components/invoices/InvoiceDialog";
import { PaymentDialog } from "@/components/invoices/PaymentDialog";
import { DunningDialog } from "@/components/invoices/DunningDialog";
import { InvoiceDrawer } from "@/components/invoices/InvoiceDrawer";
import { useAuth } from "@/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Filter = InvoiceDerivedStatus | "alle";

interface Row {
  invoice: Invoice;
  derived: InvoiceDerivedStatus;
}

function customerLabel(invoice: Invoice): string {
  const c = invoice.customer;
  if (!c) return "";
  return c.company_name || [c.first_name, c.last_name].filter(Boolean).join(" ") || "";
}

/** Dokument-Datum einer Rechnung: Rechnungsdatum, für Entwürfe das Anlagedatum. */
function invoiceDate(invoice: Invoice): string {
  return invoice.invoice_date ?? invoice.created_at;
}

export function InvoicesPage() {
  const { canEdit } = useAuth();
  const mayEdit = canEdit("angebote");
  const { data: invoices, isLoading, error } = useInvoices();
  const issueInvoice = useIssueInvoice();
  const cancelInvoice = useCancelInvoice();
  const deleteInvoice = useDeleteInvoice();
  const toast = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [createOpen, setCreateOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [paymentsFor, setPaymentsFor] = useState<Invoice | null>(null);
  const [dunningFor, setDunningFor] = useState<Invoice | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("alle");
  const [year, setYear] = useState<YearValue>(new Date().getFullYear());
  const [groupMode, setGroupMode] = useState<GroupMode>("monat");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Drawer über ?open=<id> — so sind Rechnungen von außen verlinkbar
  // (z.B. „→ RE-2026-0001" auf der Angebotsseite).
  const openId = searchParams.get("open");
  const drawerInvoice = openId ? (invoices?.find((i) => i.id === openId) ?? null) : null;

  function openDrawer(id: string) {
    const next = new URLSearchParams(searchParams);
    next.set("open", id);
    setSearchParams(next, { replace: true });
  }

  function closeDrawer() {
    const next = new URLSearchParams(searchParams);
    next.delete("open");
    setSearchParams(next, { replace: true });
  }

  // Abgeleiteten Status je Rechnung einmal berechnen (Zahlungen + Fälligkeit).
  const withStatus = useMemo<Row[]>(
    () =>
      (invoices ?? []).map((inv) => ({
        invoice: inv,
        derived: invoiceDerivedStatus(inv, inv.items, inv.payments),
      })),
    [invoices],
  );

  const years = useMemo(() => availableYears(withStatus, (r) => invoiceDate(r.invoice)), [withStatus]);
  const effectiveYear: YearValue = typeof year === "number" && !years.includes(year) ? "alle" : year;

  const yearRows = useMemo(
    () => filterByYear(withStatus, (r) => invoiceDate(r.invoice), effectiveYear),
    [withStatus, effectiveYear],
  );

  const counts = useMemo(() => {
    const c = new Map<InvoiceDerivedStatus, number>();
    for (const { derived } of yearRows) c.set(derived, (c.get(derived) ?? 0) + 1);
    return c;
  }, [yearRows]);

  const filtered = filter === "alle" ? yearRows : yearRows.filter((e) => e.derived === filter);

  const groups = useMemo(
    () =>
      groupItems(filtered, groupMode, {
        getDate: (r) => invoiceDate(r.invoice),
        getCustomer: (r) => customerLabel(r.invoice),
        getValue: (r) => offerTotals(r.invoice.items ?? [], r.invoice.tax_rate).gross,
      }),
    [filtered, groupMode],
  );

  const stats = useMemo(() => {
    let openSum = 0;
    let openCount = 0;
    let overdueSum = 0;
    let overdueCount = 0;
    for (const { invoice, derived } of yearRows) {
      if (derived === "gestellt" || derived === "teilbezahlt" || derived === "ueberfaellig") {
        const { gross } = offerTotals(invoice.items ?? [], invoice.tax_rate);
        const open = Math.max(0, gross - invoicePaidSum(invoice.payments));
        openSum += open;
        openCount += 1;
        if (derived === "ueberfaellig") {
          overdueSum += open;
          overdueCount += 1;
        }
      }
    }

    // Diesen Kalendermonat gestellt (unabhängig vom Jahr-Filter).
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let monthSum = 0;
    let monthCount = 0;
    // Zahlungseingang im gewählten Jahr (nach Zahldatum, über alle Rechnungen).
    let paidSum = 0;
    for (const inv of invoices ?? []) {
      if (inv.status === "gestellt" && inv.invoice_date?.startsWith(monthPrefix)) {
        monthSum += offerTotals(inv.items ?? [], inv.tax_rate).gross;
        monthCount += 1;
      }
      if (inv.status !== "entwurf") {
        for (const p of inv.payments ?? []) {
          if (effectiveYear === "alle" || new Date(p.paid_at).getFullYear() === effectiveYear) {
            paidSum += p.amount;
          }
        }
      }
    }
    return { openSum, openCount, overdueSum, overdueCount, monthSum, monthCount, paidSum };
  }, [yearRows, invoices, effectiveYear]);

  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

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
      // PDF dauerhaft ins Dokumente-Archiv legen (best-effort — die Rechnung ist
      // bereits gültig; ein Fehler hier darf das Stellen nicht entwerten).
      try {
        const full = await fetchInvoiceWithItems(issued.id);
        await archiveInvoicePdf(full);
        queryClient.invalidateQueries({ queryKey: ["documents"] });
      } catch (archiveErr) {
        console.warn("Rechnungs-PDF konnte nicht archiviert werden:", archiveErr);
        toast.error("Rechnung gestellt, aber das PDF konnte nicht automatisch abgelegt werden.");
      }
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

  function handleExport() {
    exportToCsv(
      `rechnungen-${effectiveYear === "alle" ? "alle" : effectiveYear}`,
      [
        { label: "Nummer", value: (r: Row) => r.invoice.invoice_number ?? "Entwurf" },
        { label: "Betreff", value: (r: Row) => r.invoice.title },
        { label: "Kunde", value: (r: Row) => customerLabel(r.invoice) },
        {
          label: "Rechnungsdatum",
          value: (r: Row) => (r.invoice.invoice_date ? formatDate(r.invoice.invoice_date) : ""),
        },
        { label: "Fällig", value: (r: Row) => (r.invoice.due_date ? formatDate(r.invoice.due_date) : "") },
        {
          label: "Status",
          value: (r: Row) => INVOICE_STATUS_OPTIONS.find((s) => s.value === r.derived)?.label ?? r.derived,
        },
        {
          label: "Brutto (EUR)",
          value: (r: Row) =>
            offerTotals(r.invoice.items ?? [], r.invoice.tax_rate).gross.toFixed(2).replace(".", ","),
        },
        {
          label: "Bezahlt (EUR)",
          value: (r: Row) => invoicePaidSum(r.invoice.payments).toFixed(2).replace(".", ","),
        },
        {
          label: "Offen (EUR)",
          value: (r: Row) => {
            if (r.invoice.status === "storniert") return "";
            const { gross } = offerTotals(r.invoice.items ?? [], r.invoice.tax_rate);
            return Math.max(0, gross - invoicePaidSum(r.invoice.payments)).toFixed(2).replace(".", ",");
          },
        },
      ],
      filtered,
    );
  }

  const filterOptions: { value: Filter; label: string; count: number }[] = [
    { value: "alle", label: "Alle", count: yearRows.length },
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
        description={invoices && invoices.length > 0 ? `${invoices.length} Rechnungen gesamt` : undefined}
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
        <div className="space-y-4">
          <SummaryStats
            stats={[
              {
                label: "Offen",
                value: formatCurrency(stats.openSum),
                sub: `${stats.openCount} Rechnung${stats.openCount === 1 ? "" : "en"}`,
                tone: "amber",
              },
              {
                label: "Davon überfällig",
                value: formatCurrency(stats.overdueSum),
                sub:
                  stats.overdueCount > 0
                    ? `${stats.overdueCount} Rechnung${stats.overdueCount === 1 ? "" : "en"}`
                    : "nichts überfällig",
                tone: stats.overdueCount > 0 ? "red" : "green",
              },
              {
                label: "Diesen Monat gestellt",
                value: formatCurrency(stats.monthSum),
                sub: `${stats.monthCount} Rechnung${stats.monthCount === 1 ? "" : "en"}`,
                tone: "accent",
              },
              {
                label: effectiveYear === "alle" ? "Zahlungseingang gesamt" : `Zahlungseingang ${effectiveYear}`,
                value: formatCurrency(stats.paidSum),
                sub: "nach Zahldatum",
                tone: "green",
              },
            ]}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Tabs<Filter> options={filterOptions} value={filter} onChange={setFilter} />
            <div className="ml-auto flex items-center gap-2">
              <YearFilter years={years} value={effectiveYear} onChange={setYear} />
              <Tabs<GroupMode>
                size="sm"
                options={[
                  { value: "monat", label: "Monat" },
                  { value: "kunde", label: "Kunde" },
                ]}
                value={groupMode}
                onChange={setGroupMode}
              />
              <Button size="sm" variant="secondary" onClick={handleExport} title="Gefilterte Liste als CSV exportieren">
                <FileDown size={14} />
                CSV
              </Button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <Card className="px-4 py-8 text-center text-sm text-ink-faint">
              Keine Rechnungen für diese Auswahl.
            </Card>
          ) : (
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
                  {groups.map((group) => {
                    const isCollapsed = collapsed.has(group.key);
                    return [
                      <GroupHeaderRow
                        key={`head-${group.key}`}
                        label={group.label}
                        count={group.items.length}
                        sum={formatCurrency(group.sum)}
                        colSpan={8}
                        collapsed={isCollapsed}
                        onToggle={() => toggleGroup(group.key)}
                      />,
                      ...(isCollapsed
                        ? []
                        : group.items.map(({ invoice, derived }) => {
                            const { gross } = offerTotals(invoice.items ?? [], invoice.tax_rate);
                            const open = Math.max(0, gross - invoicePaidSum(invoice.payments));
                            const isDraft = invoice.status === "entwurf";
                            const dunned = lastDunningLevel(invoice.dunnings);
                            return (
                              <tr
                                key={invoice.id}
                                onClick={() => openDrawer(invoice.id)}
                                className="cursor-pointer border-b border-border last:border-0 hover:bg-bg-raised"
                                title="Details & Verlauf öffnen"
                              >
                                <td className="px-4 py-3 font-mono text-xs text-ink">
                                  {invoice.invoice_number ?? <span className="text-ink-faint">Entwurf</span>}
                                </td>
                                <td className="px-4 py-3 font-medium text-ink">{invoice.title}</td>
                                <td className="hidden px-4 py-3 text-ink-muted sm:table-cell">
                                  {customerLabel(invoice) || "—"}
                                </td>
                                <td className="hidden px-4 py-3 text-ink-muted md:table-cell">
                                  {invoice.due_date ? formatDate(invoice.due_date) : "—"}
                                </td>
                                <td className="px-4 py-3">
                                  <InvoiceStatusBadge status={derived} />
                                  {dunned > 0 && invoice.status === "gestellt" && (
                                    <p className="mt-1 text-[10px] text-ink-faint">
                                      {DUNNING_LEVEL_LABELS[dunned] ?? `Mahnstufe ${dunned}`} versendet
                                    </p>
                                  )}
                                </td>
                                <td className="hidden px-4 py-3 text-right font-mono text-ink-muted lg:table-cell">
                                  {formatCurrency(gross)}
                                </td>
                                <td className="hidden px-4 py-3 text-right font-mono lg:table-cell">
                                  <span className={open > 0 && !isDraft ? "text-ink" : "text-ink-faint"}>
                                    {invoice.status === "storniert" ? "—" : formatCurrency(open)}
                                  </span>
                                </td>
                                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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
                                    {mayEdit && derived === "ueberfaellig" && dunned < 3 && (
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => setDunningFor(invoice)}
                                        title={
                                          dunned === 0
                                            ? "Zahlungserinnerung senden"
                                            : `Nächste Mahnstufe senden (bisher: ${DUNNING_LEVEL_LABELS[dunned]})`
                                        }
                                      >
                                        <BellRing size={14} />
                                        Mahnen
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
                          })),
                    ];
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </div>
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
      {dunningFor && (
        <DunningDialog
          invoice={invoices?.find((i) => i.id === dunningFor.id) ?? dunningFor}
          open
          onClose={() => setDunningFor(null)}
        />
      )}
      {drawerInvoice && (
        <InvoiceDrawer
          invoice={drawerInvoice}
          onClose={closeDrawer}
          onDownloadPdf={handleDownload}
          downloading={downloadingId === drawerInvoice.id}
        />
      )}
    </div>
  );
}
