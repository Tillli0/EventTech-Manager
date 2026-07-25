import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  fetchSubrentalOrderPreview,
  useSendSubrentalOrder,
  type SubrentalOrderPreview,
} from "@/hooks/useSubrentals";
import { formatDate } from "@/lib/format";
import type { Subrental } from "@/types/database";

/**
 * Bestell-Mail an den Verleih-Partner versenden — zeigt IMMER erst die serverseitig
 * gebaute Vorschau (Empfänger/Betreff/Text), bevor wirklich gesendet wird. Die
 * fachlichen Prüfungen (Bestellnummer vorhanden, Partner-E-Mail vorhanden, Rechte)
 * macht die Edge Function (Muster DunningDialog).
 */
export function SendSubrentalOrderDialog({
  subrental,
  open,
  onClose,
}: {
  subrental: Subrental;
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const sendOrder = useSendSubrentalOrder();

  const [preview, setPreview] = useState<SubrentalOrderPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPreview(null);
    setPreviewError(null);
    fetchSubrentalOrderPreview(subrental.id)
      .then(setPreview)
      .catch((err) => setPreviewError(err instanceof Error ? err.message : "Vorschau fehlgeschlagen."));
  }, [open, subrental.id]);

  const history = [...(subrental.order_emails ?? [])].sort(
    (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime(),
  );

  async function handleSend() {
    if (!preview) return;
    const ok = await confirm({
      title: "Bestell-Mail senden?",
      message: `Die E-Mail geht an ${preview.to}.`,
      confirmLabel: "Jetzt senden",
    });
    if (!ok) return;
    try {
      await sendOrder.mutateAsync(subrental.id);
      toast.success(`Bestell-Mail an ${preview.to} versendet.`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Versand fehlgeschlagen.");
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Bestell-Mail — ${subrental.order_number ?? ""}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {history.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-ink-muted">Bereits versendet</p>
            {history.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="text-ink">{e.subject}</span>
                <span className="text-ink-muted">
                  {formatDate(e.sent_at)} · {e.sent_to}
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
              <Button type="button" onClick={handleSend} disabled={sendOrder.isPending}>
                <Mail size={16} />
                {sendOrder.isPending ? "Wird gesendet …" : "Bestell-Mail senden"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
