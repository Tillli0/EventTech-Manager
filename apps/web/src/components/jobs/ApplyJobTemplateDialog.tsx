import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { FormField, Select } from "@/components/ui/Input";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useJobTemplates, useApplyTemplateToJob, useDeleteJobTemplate } from "@/hooks/useJobTemplates";
import { useToast } from "@/components/ui/Toast";
import type { Job } from "@/types/database";

/** "Vorlage anwenden" (P3) — kein Editor, Vorlagen entstehen nur über SaveJobAsTemplateDialog. */
export function ApplyJobTemplateDialog({ open, onClose, job }: { open: boolean; onClose: () => void; job: Job }) {
  const { data: templates } = useJobTemplates();
  const applyTemplate = useApplyTemplateToJob();
  const deleteTemplate = useDeleteJobTemplate();
  const confirm = useConfirm();
  const toast = useToast();
  const [templateId, setTemplateId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTemplateId("");
      setFormError(null);
    }
  }, [open]);

  const selected = templates?.find((t) => t.id === templateId);
  const hasExistingMilestones = (job.milestones ?? []).length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) {
      setFormError("Bitte eine Vorlage wählen.");
      return;
    }
    if (hasExistingMilestones) {
      const ok = await confirm({
        title: "Vorlage anwenden",
        message: `Dieser Job hat bereits einen Zeitplan. Die Vorlage „${selected.name}" fügt ihre Programmpunkte zusätzlich hinzu, ohne bestehende zu ersetzen. Fortfahren?`,
        confirmLabel: "Anwenden",
      });
      if (!ok) return;
    }
    try {
      const added = await applyTemplate.mutateAsync({
        jobId: job.id,
        jobStartDate: new Date(job.start_date),
        items: selected.items ?? [],
      });
      toast.success(`${added} ${added === 1 ? "Programmpunkt" : "Programmpunkte"} übernommen.`);
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Vorlage konnte nicht angewendet werden.");
    }
  }

  async function handleDeleteSelected() {
    if (!selected) return;
    const ok = await confirm({
      title: "Vorlage löschen",
      message: `Vorlage „${selected.name}" wirklich löschen?`,
      confirmLabel: "Löschen",
      danger: true,
    });
    if (!ok) return;
    await deleteTemplate.mutateAsync(selected.id);
    setTemplateId("");
  }

  return (
    <Dialog open={open} onClose={onClose} title="Vorlage anwenden" maxWidth="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Vorlage *">
          <div className="flex items-center gap-2">
            <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="flex-1">
              <option value="">Vorlage wählen …</option>
              {templates?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({(t.items ?? []).length} {(t.items ?? []).length === 1 ? "Punkt" : "Punkte"})
                </option>
              ))}
            </Select>
            {selected && (
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="shrink-0 rounded p-1.5 text-ink-faint transition-colors hover:text-status-defekt"
                title="Vorlage löschen"
                aria-label="Vorlage löschen"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </FormField>
        {templates?.length === 0 && (
          <p className="text-xs text-ink-faint">
            Noch keine Vorlagen vorhanden — an einem bestehenden Job über „Als Vorlage speichern" anlegen.
          </p>
        )}
        {formError && (
          <div className="rounded-md border border-status-defekt/40 bg-status-defekt/10 px-3 py-2 text-sm text-status-defekt">
            {formError}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={applyTemplate.isPending || !templateId}>
            {applyTemplate.isPending ? "Wird angewendet …" : "Anwenden"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
