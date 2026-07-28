import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { FormField, Select, Textarea } from "@/components/ui/Input";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useCreateJobService, useUpdateJobService } from "@/hooks/useJobServices";
import { JOB_SERVICE_STATUS_OPTIONS } from "@/types/database";
import type { JobService, JobServiceStatus } from "@/types/database";

export function CreateJobServiceDialog({
  open,
  onClose,
  jobId,
  editService,
}: {
  open: boolean;
  onClose: () => void;
  jobId: string;
  /** Wenn gesetzt: Dialog bearbeitet dieses Fremdgewerk statt eines neuen. */
  editService?: JobService;
}) {
  const { data: suppliers } = useSuppliers();
  const createService = useCreateJobService();
  const updateService = useUpdateJobService();
  const isEdit = !!editService;

  const [supplierId, setSupplierId] = useState("");
  const [status, setStatus] = useState<JobServiceStatus>("angefragt");
  const [onSiteAt, setOnSiteAt] = useState<Date | null>(null);
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSupplierId(editService?.supplier_id ?? "");
    setStatus(editService?.status ?? "angefragt");
    setOnSiteAt(editService?.on_site_at ? new Date(editService.on_site_at) : null);
    setNotes(editService?.notes ?? "");
    setFormError(null);
  }, [open, editService]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!supplierId) {
      setFormError("Bitte einen Partner wählen.");
      return;
    }

    const fields = {
      job_id: jobId,
      supplier_id: supplierId,
      status,
      on_site_at: onSiteAt ? onSiteAt.toISOString() : null,
      notes: notes.trim() || null,
    };

    try {
      if (editService) {
        await updateService.mutateAsync({ id: editService.id, ...fields });
      } else {
        await createService.mutateAsync(fields);
      }
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Fremdgewerk konnte nicht gespeichert werden.");
    }
  }

  const isPending = createService.isPending || updateService.isPending;

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? "Fremdgewerk bearbeiten" : "Fremdgewerk hinzufügen"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Partner *">
          <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">Partner wählen …</option>
            {suppliers?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.trade ? ` — ${s.trade}` : ""}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as JobServiceStatus)}>
            {JOB_SERVICE_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Zeit vor Ort">
          <DateTimeField value={onSiteAt} onChange={setOnSiteAt} />
        </FormField>

        <FormField label="Notizen">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
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
          <Button type="submit" disabled={isPending}>
            {isPending ? "Wird gespeichert …" : isEdit ? "Änderungen speichern" : "Hinzufügen"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
