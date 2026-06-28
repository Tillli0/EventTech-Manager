import { useState } from "react";
import { Plus, FileText, Download, Trash2, Pencil } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { OfferStatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/States";
import { useOffers, useDeleteOffer, fetchOfferWithItems } from "@/hooks/useOffers";
import { offerTotals, type Offer } from "@/types/database";
import { formatCurrency, formatDate } from "@/lib/format";
import { downloadOfferPdf } from "@/lib/offerPdf";
import { CreateOfferDialog } from "@/components/offers/CreateOfferDialog";
import { useAuth } from "@/auth/AuthProvider";

export function OffersPage() {
  const { canEdit } = useAuth();
  const mayEdit = canEdit("angebote");
  const { data: offers, isLoading, error } = useOffers();
  const deleteOffer = useDeleteOffer();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOffer, setEditOffer] = useState<Offer | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function handleDownload(id: string) {
    setDownloadingId(id);
    try {
      const offer = await fetchOfferWithItems(id);
      await downloadOfferPdf(offer);
    } catch (err) {
      console.error("PDF konnte nicht erzeugt werden:", err);
      alert("Das PDF konnte nicht erzeugt werden.");
    } finally {
      setDownloadingId(null);
    }
  }

  function customerLabel(offer: NonNullable<typeof offers>[number]) {
    const c = offer.customer;
    if (!c) return "—";
    return c.company_name || [c.first_name, c.last_name].filter(Boolean).join(" ") || "—";
  }

  return (
    <div>
      <PageHeader
        title="Angebote"
        description={offers ? `${offers.length} Angebote` : undefined}
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
              {offers.map((offer) => {
                const { gross } = offerTotals(offer.items ?? [], offer.tax_rate);
                return (
                  <tr key={offer.id} className="border-b border-border last:border-0 hover:bg-bg-raised">
                    <td className="px-4 py-3 font-mono text-xs text-ink">{offer.offer_number}</td>
                    <td className="px-4 py-3 font-medium text-ink">{offer.title}</td>
                    <td className="hidden px-4 py-3 text-ink-muted sm:table-cell">{customerLabel(offer)}</td>
                    <td className="hidden px-4 py-3 text-ink-muted md:table-cell">{formatDate(offer.created_at)}</td>
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
                            onClick={() => {
                              if (confirm(`Angebot ${offer.offer_number} wirklich löschen?`)) {
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
              })}
            </tbody>
          </table>
        </Card>
      )}

      <CreateOfferDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <CreateOfferDialog
        open={!!editOffer}
        onClose={() => setEditOffer(null)}
        editOffer={editOffer ?? undefined}
      />
    </div>
  );
}
