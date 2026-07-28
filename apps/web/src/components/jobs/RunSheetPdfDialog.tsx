import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { downloadRunSheetPdf } from "@/lib/runSheetPdf";
import { useToast } from "@/components/ui/Toast";
import type { Job } from "@/types/database";

/**
 * EIN Schalter statt zwei Dokumenten (E-B): "interne Notizen mitdrucken" an =
 * Crew-Blatt (Notizen, Crew, Job-Notiz), aus = Kunden-Blatt.
 */
export function RunSheetPdfDialog({ open, onClose, job }: { open: boolean; onClose: () => void; job: Job }) {
  const [includeInternal, setIncludeInternal] = useState(true);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function handleDownload() {
    setLoading(true);
    try {
      await downloadRunSheetPdf(job, includeInternal);
      onClose();
    } catch (err) {
      console.error("Ablaufplan-PDF konnte nicht erzeugt werden:", err);
      toast.error("Das Ablaufplan-PDF konnte nicht erzeugt werden.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Ablaufplan erzeugen" maxWidth="max-w-sm">
      <div className="space-y-4">
        <label className="flex items-start gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={includeInternal}
            onChange={(e) => setIncludeInternal(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent"
          />
          <span>
            Interne Notizen mitdrucken
            <span className="mt-0.5 block text-xs text-ink-faint">
              Crew je Programmpunkt, interne Notizen und die Job-Notiz. Ohne Häkchen entsteht die reine Kunden-Version.
            </span>
          </span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="button" onClick={handleDownload} disabled={loading}>
            {loading ? "Wird erzeugt …" : "PDF erzeugen"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
