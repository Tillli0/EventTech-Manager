import { useState } from "react";
import { HardHat, Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { JobServiceStatusBadge } from "@/components/ui/StatusBadge";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useJobServicesForJob, useDeleteJobService } from "@/hooks/useJobServices";
import { CreateJobServiceDialog } from "@/components/jobs/CreateJobServiceDialog";
import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/auth/AuthProvider";
import type { JobService } from "@/types/database";

/**
 * Fremdgewerke koordinieren (P5) — wer ist gebucht, welcher Stand (angefragt/
 * zugesagt/abgesagt), wann vor Ort. Bewusst ohne Preis (der lebt in JobCostsCard,
 * Bereich 'anmietung') — hier zählt nur, wer sichtbar für den Bereich 'jobs' ist.
 */
export function JobServicesCard({ jobId }: { jobId: string }) {
  const { canEdit } = useAuth();
  const mayEdit = canEdit("jobs");
  const { data: services } = useJobServicesForJob(jobId);
  const deleteService = useDeleteJobService();
  const confirm = useConfirm();
  const [createOpen, setCreateOpen] = useState(false);
  const [editService, setEditService] = useState<JobService | undefined>(undefined);

  const isEmpty = !services || services.length === 0;
  if (!mayEdit && isEmpty) return null;

  async function handleDelete(service: JobService) {
    const ok = await confirm({
      title: "Fremdgewerk entfernen",
      message: `„${service.supplier?.name ?? "Partner"}" wirklich von diesem Job entfernen?`,
      confirmLabel: "Entfernen",
      danger: true,
    });
    if (!ok) return;
    await deleteService.mutateAsync({ id: service.id, jobId });
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <HardHat size={14} />
          Fremdgewerke
        </h2>
        {mayEdit && (
          <Button size="sm" variant="secondary" onClick={() => setCreateOpen(true)}>
            <Plus size={14} />
            Hinzufügen
          </Button>
        )}
      </CardHeader>
      <CardBody>
        {isEmpty ? (
          <p className="flex items-center gap-2 text-sm text-ink-faint">
            <HardHat size={14} />
            Noch keine Fremdgewerke koordiniert.
          </p>
        ) : (
          <div className="space-y-2">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {service.supplier?.name ?? "Partner"}
                    {service.supplier?.trade && (
                      <span className="ml-2 rounded bg-bg-raised px-1.5 py-0.5 text-xs font-normal text-ink-faint">
                        {service.supplier.trade}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {service.on_site_at ? `Vor Ort: ${formatDateTime(service.on_site_at)}` : "Zeit vor Ort offen"}
                    {service.supplier?.phone && ` · ${service.supplier.phone}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <JobServiceStatusBadge status={service.status} />
                  {mayEdit && (
                    <>
                      <button
                        onClick={() => setEditService(service)}
                        className="rounded p-1.5 text-ink-faint transition-colors hover:text-accent"
                        title="Bearbeiten"
                        aria-label="Bearbeiten"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(service)}
                        className="rounded p-1.5 text-ink-faint transition-colors hover:text-status-defekt"
                        title="Entfernen"
                        aria-label="Entfernen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>

      <CreateJobServiceDialog open={createOpen} onClose={() => setCreateOpen(false)} jobId={jobId} />
      {editService && (
        <CreateJobServiceDialog
          open={!!editService}
          onClose={() => setEditService(undefined)}
          jobId={jobId}
          editService={editService}
        />
      )}
    </Card>
  );
}
