import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { fetchDunningPreview, useSendDunning, type DunningPreview } from "@/hooks/useInvoices";
import { DUNNING_LEVEL_LABELS, type Invoice } from "@/types/database";
import { formatDate } from "@/lib/format";

/**
 * Mahnung/Zahlungserinnerung versenden — zeigt IMMER erst die serverseitig
 * gebaute Vorschau (Empfänger/Betreff/Text), bevor wirklich gesendet wird.
 * Die fachlichen Prüfungen (überfällig, Stufe, Rechte) macht die Edge Function.
 */
export function DunningDialog({
  invoice,
  open,
  onClose,
}: {
  invoice: Invoice;
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const sendDunning = useSendDunning();

  const [preview, setPreview] = useState<DunningPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPreview(null);
    setPreviewError(null);
    fetchDunningPreview(invoice.id)
      .then(setPreview)
      .catch((err) => setPreviewError(err instanceof Error ? err.message : "Vorschau fehlgeschlagen."));
  }, [open, invoice.id]);

  const history = [...(invoice.dunnings ?? [])].sort((a, b) => a.level - b.level);

  async function handleSend() {
    if (!preview) return;
    const ok = await confirm({
      title: `${preview.level_label} senden?`,
      message: `Die E-Mail geht an ${preview.to}. Jede Mahnstufe kann nur einmal versendet werden.`,
      confirmLabel: "Jetzt senden",
    });
    if (!ok) return;
    try {
      await sendDunning.mutateAsync(invoice.id);
      toast.success(`${preview.level_label} an ${preview.to} versendet.`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Versand fehlgeschlagen.");
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Mahnwesen — ${invoice.invoice_number ?? ""}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {history.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-ink-muted">Bereits versendet</p>
            {history.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="text-ink">{DUNNING_LEVEL_LABELS[d.level] ?? `Stufe ${d.level}`}</span>
                <span className="text-ink-muted">
                  {formatDate(d.sent_at)} · {d.to_email}
                </span>
              </div>
            ))}
          </div>
        )}

        {!preview && !previewError && <LoadingState label="Vorschau wird erstellt …" />}
        {previewError && <ErrorState message={previewError} />}

        {preview && (
          <>
            <div className="space-y-1 rounded-lg border border-border bg-bg-raised px-4 py-3 text-sm">
              <p>
                <span className="text-ink-faint">Nächste Stufe: </span>
                <span className="font-medium text-ink">{preview.level_label}</span>
              </p>
              <p>
                <span className="text-ink-faint">An: </span>
                <span className="text-ink">{preview.to}</span>
              </p>
              <p>
                <span className="text-ink-faint">Betreff: </span>
                <span className="text-ink">{preview.subject}</span>
              </p>
            </div>

            {/* E-Mail-Vorschau: der HTML-Inhalt kommt aus unserer eigenen Edge Function
                (Nutzerdaten dort escaped) und ist hell gehalten wie beim Empfänger. */}
            <div
              className="max-h-72 overflow-y-auto rounded-lg bg-white px-4 py-3 text-sm text-neutral-900"
              dangerouslySetInnerHTML={{ __html: preview.html }}
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={onClose}>
                Abbrechen
              </Button>
              <Button type="button" onClick={handleSend} disabled={sendDunning.isPending}>
                <Mail size={16} />
                {sendDunning.isPending ? "Wird gesendet …" : `${preview.level_label} senden`}
              </Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
