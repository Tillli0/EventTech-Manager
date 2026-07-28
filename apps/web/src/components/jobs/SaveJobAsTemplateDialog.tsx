import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Input";
import { useCreateTemplateFromJob } from "@/hooks/useJobTemplates";
import { useToast } from "@/components/ui/Toast";
import type { Job } from "@/types/database";

/** "Aus diesem Job eine Vorlage machen" (P3) — kein Editor, nur dieser Weg. */
export function SaveJobAsTemplateDialog({ open, onClose, job }: { open: boolean; onClose: () => void; job: Job }) {
  const createFromJob = useCreateTemplateFromJob();
  const toast = useToast();
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(job.title);
      setFormError(null);
    }
  }, [open, job.title]);

  const milestones = job.milestones ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Bitte einen Namen für die Vorlage angeben.");
      return;
    }
    if (milestones.length === 0) {
      setFormError("Dieser Job hat noch keinen Zeitplan — es gäbe nichts zu speichern.");
      return;
    }
    try {
      await createFromJob.mutateAsync({
        name: name.trim(),
        jobStartDate: new Date(job.start_date),
        milestones,
      });
      toast.success(`Vorlage „${name.trim()}" angelegt.`);
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Vorlage konnte nicht gespeichert werden.");
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Als Vorlage speichern" maxWidth="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-ink-muted">
          Übernimmt die {milestones.length} {milestones.length === 1 ? "Programmpunkt" : "Programmpunkte"} dieses
          Jobs als Zeit-Vorlage (relativ zum Job-Start), zum Wiederverwenden bei künftigen Jobs.
        </p>
        <FormField label="Name der Vorlage *">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Hochzeit, klassisch" />
        </FormField>
        {formError && (
          <div className="rounded-md border border-status-defekt/40 bg-status-defekt/10 px-3 py-2 text-sm text-status-defekt">
            {formError}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={createFromJob.isPending}>
            {createFromJob.isPending ? "Wird gespeichert …" : "Speichern"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
