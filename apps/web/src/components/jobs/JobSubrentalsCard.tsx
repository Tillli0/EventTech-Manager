import { useState } from "react";
import { Truck, Plus, Pencil, Trash2, FileDown, Mail } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SubrentalStatusBadge } from "@/components/ui/StatusBadge";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { useSubrentalsForJob, useDeleteSubrental, useAssignSubrentalOrderNumber } from "@/hooks/useSubrentals";
import { CreateSubrentalDialog } from "@/components/jobs/CreateSubrentalDialog";
import { SendSubrentalOrderDialog } from "@/components/jobs/SendSubrentalOrderDialog";
import { subrentalTotals, SUBRENTAL_LOGISTICS_OPTIONS } from "@/lib/subrentals";
import { downloadSubrentalOrderPdf } from "@/lib/subrentalOrderPdf";
import { formatDate, formatCurrency } from "@/lib/format";
import { useAuth } from "@/auth/AuthProvider";
import type { Subrental } from "@/types/database";

/**
 * E5 (Bestell-Mail an Verleiher) ist lokal fertig, aber die Edge Function
 * `send-subrental-order` bewusst NICHT in der Cloud deployt (nach-außen-wirkend,
 * braucht Tills Freigabe). Bis dahin bleibt der Knopf ausgeblendet statt einen
 * verwirrenden „Funktion nicht gefunden"-Fehler zu zeigen, wenn ihn jemand in der
 * echten App anklickt — Code/Dialog bleiben unverändert für den späteren Schalter.
 */
const SUBRENTAL_ORDER_MAIL_ENABLED = false;

/** Anmiet-Vorgänge, die zu diesem Job gehören — Positionen, Status, EK-Summe je Vorgang. */
export function JobSubrentalsCard({ jobId }: { jobId: string }) {
  const { canEdit } = useAuth();
  const mayEdit = canEdit("anmietung");
  const { data: subrentals } = useSubrentalsForJob(jobId);
  const deleteSubrental = useDeleteSubrental();
  const assignOrderNumber = useAssignSubrentalOrderNumber();
  const confirm = useConfirm();
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editSubrental, setEditSubrental] = useState<Subrental | undefined>(undefined);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [orderMailSubrental, setOrderMailSubrental] = useState<Subrental | undefined>(undefined);

  const isEmpty = !subrentals || subrentals.length === 0;
  // Ohne Bereich 'anmietung' ist die Karte unsichtbar (RLS liefert ohnehin leer,
  // aber ein sichtbarer Leerzustand würde fälschlich "keine Anmietungen" suggerieren).
  if (!mayEdit && isEmpty) return null;

  async function handleDelete(subrental: Subrental) {
    const ok = await confirm({
      title: "Anmiet-Vorgang löschen",
      message: `Anmiet-Vorgang bei „${subrental.supplier?.name ?? "Verleih-Partner"}" wirklich löschen?`,
      confirmLabel: "Löschen",
      danger: true,
    });
    if (!ok) return;
    await deleteSubrental.mutateAsync({ id: subrental.id, jobId });
  }

  async function handleDownloadPdf(subrental: Subrental) {
    setPdfLoadingId(subrental.id);
    try {
      const target = subrental.order_number ? subrental : await assignOrderNumber.mutateAsync(subrental);
      await downloadSubrentalOrderPdf(target);
    } catch (err) {
      console.error("Bestell-PDF konnte nicht erzeugt werden:", err);
      toast.error("Das Bestell-PDF konnte nicht erzeugt werden.");
    } finally {
      setPdfLoadingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Truck size={14} />
          Anmiet-Vorgänge
        </h2>
        {mayEdit && (
          <Button size="sm" variant="secondary" onClick={() => setCreateOpen(true)}>
            <Plus size={14} />
            Neuer Anmiet-Vorgang
          </Button>
        )}
      </CardHeader>
      <CardBody>
        {isEmpty ? (
          <p className="flex items-center gap-2 text-sm text-ink-faint">
            <Truck size={14} />
            Noch keine Anmiet-Vorgänge.
          </p>
        ) : (
          <div className="space-y-2">
            {subrentals.map((subrental) => {
              const { total } = subrentalTotals(subrental.items ?? []);
              const logisticsLabel = SUBRENTAL_LOGISTICS_OPTIONS.find((o) => o.value === subrental.logistics)?.label;
              const itemCount = subrental.items?.length ?? 0;
              return (
                <div
                  key={subrental.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {subrental.supplier?.name ?? "Verleih-Partner"}
                      {subrental.order_number && (
                        <span className="ml-2 font-mono text-xs text-ink-faint">{subrental.order_number}</span>
                      )}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {formatDate(subrental.start_date)} – {formatDate(subrental.end_date)} · {logisticsLabel} ·{" "}
                      {itemCount} {itemCount === 1 ? "Position" : "Positionen"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-xs text-ink-muted">{formatCurrency(total)}</span>
                    <SubrentalStatusBadge status={subrental.status} />
                    {mayEdit && itemCount > 0 && (
                      <button
                        onClick={() => handleDownloadPdf(subrental)}
                        disabled={pdfLoadingId === subrental.id}
                        className="rounded p-1.5 text-ink-faint transition-colors hover:text-accent disabled:opacity-50"
                        title="Bestell-PDF erzeugen"
                        aria-label="Bestell-PDF erzeugen"
                      >
                        <FileDown size={14} />
                      </button>
                    )}
                    {SUBRENTAL_ORDER_MAIL_ENABLED && mayEdit && subrental.order_number && subrental.status !== "storniert" && (
                      <button
                        onClick={() => setOrderMailSubrental(subrental)}
                        className="rounded p-1.5 text-ink-faint transition-colors hover:text-accent"
                        title="Bestell-Mail senden"
                        aria-label="Bestell-Mail senden"
                      >
                        <Mail size={14} />
                      </button>
                    )}
                    {mayEdit && (
                      <>
                        <button
                          onClick={() => setEditSubrental(subrental)}
                          className="rounded p-1.5 text-ink-faint transition-colors hover:text-accent"
                          title="Bearbeiten"
                          aria-label="Bearbeiten"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(subrental)}
                          className="rounded p-1.5 text-ink-faint transition-colors hover:text-status-defekt"
                          title="Löschen"
                          aria-label="Löschen"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardBody>

      <CreateSubrentalDialog open={createOpen} onClose={() => setCreateOpen(false)} jobId={jobId} />
      {editSubrental && (
        <CreateSubrentalDialog
          open={!!editSubrental}
          onClose={() => setEditSubrental(undefined)}
          jobId={jobId}
          editSubrental={editSubrental}
        />
      )}
      {orderMailSubrental && (
        <SendSubrentalOrderDialog
          subrental={orderMailSubrental}
          open={!!orderMailSubrental}
          onClose={() => setOrderMailSubrental(undefined)}
        />
      )}
    </Card>
  );
}
