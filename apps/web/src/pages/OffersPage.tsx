import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, FileText, Download, Trash2, Pencil, Receipt, FileDown } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { OfferStatusBadge } from "@/components/ui/StatusBadge";
import { SummaryStats } from "@/components/ui/SummaryStats";
import { YearFilter } from "@/components/ui/YearFilter";
import { GroupHeaderRow } from "@/components/ui/GroupRow";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/States";
import { useOffers, useDeleteOffer, fetchOfferWithItems } from "@/hooks/useOffers";
import { useInvoices, offerToInvoiceInput, type CreateInvoiceInput } from "@/hooks/useInvoices";
import { offerTotals, OFFER_STATUS_OPTIONS, type Offer, type OfferStatus } from "@/types/database";
import {
  availableYears,
  filterByYear,
  groupItems,
  type GroupMode,
  type YearValue,
} from "@/lib/listGrouping";
import { formatCurrency, formatDate } from "@/lib/format";
import { exportToCsv } from "@/lib/csv";
import { downloadOfferPdf } from "@/lib/offerPdf";
import { CreateOfferDialog } from "@/components/offers/CreateOfferDialog";
import { InvoiceDialog } from "@/components/invoices/InvoiceDialog";
import { useAuth } from "@/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Filter = OfferStatus | "alle";

function customerLabel(offer: Offer): string {
  const c = offer.customer;
  if (!c) return "";
  return c.company_name || [c.first_name, c.last_name].filter(Boolean).join(" ") || "";
}

export function OffersPage() {
  const { canEdit } = useAuth();
  const mayEdit = canEdit("angebote");
  const { data: offers, isLoading, error } = useOffers();
  // Rückwärts-Lookup „Angebot → Rechnung": welche Rechnung entstand aus welchem Angebot?
  const { data: invoices } = useInvoices();
  const deleteOffer = useDeleteOffer();
  const toast = useToast();
  const confirm = useConfirm();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOffer, setEditOffer] = useState<Offer | null>(null);
  const [invoicePreset, setInvoicePreset] = useState<CreateInvoiceInput | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("alle");
  const [year, setYear] = useState<YearValue>(new Date().getFullYear());
  const [groupMode, setGroupMode] = useState<GroupMode>("monat");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const invoiceByOffer = useMemo(() => {
    const map = new Map<string, { id: string; number: string | null }>();
    for (const inv of invoices ?? []) {
      if (inv.offer_id && inv.status !== "storniert") {
        map.set(inv.offer_id, { id: inv.id, number: inv.invoice_number });
      }
    }
    return map;
  }, [invoices]);

  const years = useMemo(() => availableYears(offers ?? [], (o) => o.created_at), [offers]);
  // Wenn das gewählte Jahr (Standard: laufendes) gar nicht vorkommt, alles zeigen.
  const effectiveYear: YearValue = typeof year === "number" && !years.includes(year) ? "alle" : year;

  const yearOffers = useMemo(
    () => filterByYear(offers ?? [], (o) => o.created_at, effectiveYear),
    [offers, effectiveYear],
  );

  const counts = useMemo(() => {
    const c = new Map<OfferStatus, number>();
    for (const o of yearOffers) c.set(o.status, (c.get(o.status) ?? 0) + 1);
    return c;
  }, [yearOffers]);

  const stats = useMemo(() => {
    let sentSum = 0;
    let acceptedSum = 0;
    for (const o of yearOffers) {
      const { gross } = offerTotals(o.items ?? [], o.tax_rate);
      if (o.status === "gesendet") sentSum += gross;
      if (o.status === "angenommen") acceptedSum += gross;
    }
    return { sentSum, acceptedSum };
  }, [yearOffers]);

  const filtered = filter === "alle" ? yearOffers : yearOffers.filter((o) => o.status === filter);

  const groups = useMemo(
    () =>
      groupItems(filtered, groupMode, {
        getDate: (o) => o.created_at,
        getCustomer: customerLabel,
        getValue: (o) => offerTotals(o.items ?? [], o.tax_rate).gross,
      }),
    [filtered, groupMode],
  );

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
      const offer = await fetchOfferWithItems(id);
      await downloadOfferPdf(offer);
    } catch (err) {
      console.error("PDF konnte nicht erzeugt werden:", err);
      toast.error("Das PDF konnte nicht erzeugt werden.");
    } finally {
      setDownloadingId(null);
    }
  }

  function handleExport() {
    exportToCsv(
      `angebote-${effectiveYear === "alle" ? "alle" : effectiveYear}`,
      [
        { label: "Nummer", value: (o: Offer) => o.offer_number },
        { label: "Betreff", value: (o: Offer) => o.title },
        { label: "Kunde", value: (o: Offer) => customerLabel(o) },
        { label: "Datum", value: (o: Offer) => formatDate(o.created_at) },
        {
          label: "Status",
          value: (o: Offer) => OFFER_STATUS_OPTIONS.find((s) => s.value === o.status)?.label ?? o.status,
        },
        {
          label: "Brutto (EUR)",
          value: (o: Offer) => offerTotals(o.items ?? [], o.tax_rate).gross.toFixed(2).replace(".", ","),
        },
        { label: "Rechnung", value: (o: Offer) => invoiceByOffer.get(o.id)?.number ?? "" },
      ],
      filtered,
    );
  }

  const filterOptions: { value: Filter; label: string; count: number }[] = [
    { value: "alle", label: "Alle", count: yearOffers.length },
    ...OFFER_STATUS_OPTIONS.map((o) => ({
      value: o.value as Filter,
      label: o.label,
      count: counts.get(o.value) ?? 0,
    })),
  ];

  return (
    <div>
      <PageHeader
        title="Angebote"
        description={offers && offers.length > 0 ? `${offers.length} Angebote gesamt` : undefined}
        actions={
          mayEdit ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              Angebot erstellen
            </Button>
          ) : undefined
        }
      />

      {isLoading && <LoadingState label="Angebote werden geladen …" />}
      {error && <ErrorState message={error.message} />}

      {!isLoading && !error && (!offers || offers.length === 0) && (
        <EmptyState
          icon={FileText}
          title="Noch keine Angebote"
          description="Erstelle ein Angebot mit Positionen aus dem Inventar — der Preis wird aus dem Tagesmietpreis vorbelegt."
          action={
            mayEdit ? (
              <Button variant="secondary" onClick={() => setCreateOpen(true)}>
                <Plus size={16} />
                Erstes Angebot erstellen
              </Button>
            ) : undefined
          }
        />
      )}

      {offers && offers.length > 0 && (
        <div className="space-y-4">
          <SummaryStats
            stats={[
              {
                label: "Gesendet (wartet auf Antwort)",
                value: formatCurrency(stats.sentSum),
                sub: `${counts.get("gesendet") ?? 0} Angebot${(counts.get("gesendet") ?? 0) === 1 ? "" : "e"}`,
                tone: "amber",
              },
              {
                label: "Angenommen",
                value: formatCurrency(stats.acceptedSum),
                sub: `${counts.get("angenommen") ?? 0} Angebot${(counts.get("angenommen") ?? 0) === 1 ? "" : "e"}`,
                tone: "green",
              },
              {
                label: "Entwürfe",
                value: String(counts.get("entwurf") ?? 0),
                sub: "noch nicht gesendet",
              },
              {
                label: "Abgelehnt",
                value: String(counts.get("abgelehnt") ?? 0),
                sub: effectiveYear === "alle" ? "gesamt" : `in ${effectiveYear}`,
                tone: "red",
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
              Keine Angebote für diese Auswahl.
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-ink-muted">
                    <th className="px-4 py-3 font-medium">Nummer</th>
                    <th className="px-4 py-3 font-medium">Betreff</th>
                    <th className="hidden px-4 py-3 font-medium sm:table-cell">Kunde</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell">Datum</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="hidden px-4 py-3 text-right font-medium lg:table-cell">Brutto</th>
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
                        colSpan={7}
                        collapsed={isCollapsed}
                        onToggle={() => toggleGroup(group.key)}
                      />,
                      ...(isCollapsed
                        ? []
                        : group.items.map((offer) => {
                            const { gross } = offerTotals(offer.items ?? [], offer.tax_rate);
                            const invoice = invoiceByOffer.get(offer.id);
                            return (
                              <tr
                                key={offer.id}
                                className="border-b border-border last:border-0 hover:bg-bg-raised"
                              >
                                <td className="px-4 py-3 font-mono text-xs text-ink">
                                  {offer.offer_number}
                                  {invoice && (
                                    <Link
                                      to={`/rechnungen?open=${invoice.id}`}
                                      className="mt-0.5 block text-accent hover:underline"
                                      title="Aus diesem Angebot entstandene Rechnung öffnen"
                                    >
                                      → {invoice.number ?? "Rechnung (Entwurf)"}
                                    </Link>
                                  )}
                                </td>
                                <td className="px-4 py-3 font-medium text-ink">
                                  {offer.title}
                                  {offer.job_id && (
                                    <Link
                                      to={`/jobs/${offer.job_id}`}
                                      className="mt-0.5 block text-xs font-normal text-ink-faint hover:text-accent"
                                    >
                                      zum Job →
                                    </Link>
                                  )}
                                </td>
                                <td className="hidden px-4 py-3 text-ink-muted sm:table-cell">
                                  {offer.customer_id ? (
                                    <Link to={`/kunden/${offer.customer_id}`} className="hover:text-accent">
                                      {customerLabel(offer) || "—"}
                                    </Link>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td className="hidden px-4 py-3 text-ink-muted md:table-cell">
                                  {formatDate(offer.created_at)}
                                </td>
                                <td className="px-4 py-3">
                                  <OfferStatusBadge status={offer.status} />
                                </td>
                                <td className="hidden px-4 py-3 text-right font-mono text-ink-muted lg:table-cell">
                                  {formatCurrency(gross)}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => handleDownload(offer.id)}
                                      disabled={downloadingId === offer.id}
                                    >
                                      <Download size={14} />
                                      {downloadingId === offer.id ? "…" : "PDF"}
                                    </Button>
                                    {mayEdit && !invoice && (
                                      <button
                                        type="button"
                                        onClick={() => setInvoicePreset(offerToInvoiceInput(offer))}
                                        className="flex h-8 w-8 items-center justify-center rounded text-ink-muted hover:text-accent"
                                        aria-label="Zu Rechnung machen"
                                        title="Zu Rechnung machen (Positionen übernehmen)"
                                      >
                                        <Receipt size={14} />
                                      </button>
                                    )}
                                    {mayEdit && (
                                      <button
                                        type="button"
                                        onClick={() => setEditOffer(offer)}
                                        className="flex h-8 w-8 items-center justify-center rounded text-ink-muted hover:text-accent"
                                        aria-label="Angebot bearbeiten"
                                        title="Bearbeiten"
                                      >
                                        <Pencil size={14} />
                                      </button>
                                    )}
                                    {mayEdit && (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (
                                            await confirm({
                                              title: "Angebot löschen",
                                              message: `Angebot ${offer.offer_number} wirklich löschen?`,
                                              confirmLabel: "Löschen",
                                              danger: true,
                                            })
                                          ) {
                                            deleteOffer.mutate({ id: offer.id, customerId: offer.customer_id });
                                          }
                                        }}
                                        className="flex h-8 w-8 items-center justify-center rounded text-ink-muted hover:text-status-defekt"
                                        aria-label="Angebot löschen"
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

      <CreateOfferDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <CreateOfferDialog
        open={!!editOffer}
        onClose={() => setEditOffer(null)}
        editOffer={editOffer ?? undefined}
      />
      <InvoiceDialog
        open={!!invoicePreset}
        onClose={() => setInvoicePreset(null)}
        preset={invoicePreset ?? undefined}
      />
    </div>
  );
}
