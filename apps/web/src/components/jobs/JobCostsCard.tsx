import { useState } from "react";
import { Euro, Plus, Pencil, Trash2, Users } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { useJobCostsForJob, useDeleteJobCost, useAdoptAssignedAsCosts } from "@/hooks/useJobCosts";
import { useCostSettings } from "@/hooks/useCostSettings";
import { jobCostsTotal } from "@/lib/jobCosts";
import { useSubrentalsForJob } from "@/hooks/useSubrentals";
import { subrentalTotals, isActiveSubrentalStatus } from "@/lib/subrentals";
import { profileLabel } from "@/hooks/useProfiles";
import { CreateJobCostDialog } from "@/components/jobs/CreateJobCostDialog";
import { formatDate, formatCurrency } from "@/lib/format";
import { useAuth } from "@/auth/AuthProvider";
import type { Job, JobCost } from "@/types/database";
import { JOB_COST_TYPE_LABELS } from "@/types/database";

/** Kosten-Positionen am Job — Personal/Transport/Fremdleistung/Sonstiges, plus die read-only-Summe aus Anmiet-Vorgängen. */
export function JobCostsCard({ job }: { job: Pick<Job, "id" | "assignees"> }) {
  const assignedWithProfile = (job.assignees ?? []).filter((a) => a.profile);
  const { hasArea, canEdit } = useAuth();
  const mayView = hasArea("anmietung");
  const mayEdit = canEdit("anmietung");
  const { data: costs } = useJobCostsForJob(job.id);
  const { data: subrentals } = useSubrentalsForJob(job.id);
  const { data: costSettings } = useCostSettings();
  const deleteCost = useDeleteJobCost();
  const adoptAssigned = useAdoptAssignedAsCosts();
  const confirm = useConfirm();
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editCost, setEditCost] = useState<JobCost | undefined>(undefined);

  if (!mayView) return null;

  const subrentalTotal = (subrentals ?? [])
    .filter((s) => isActiveSubrentalStatus(s.status))
    .reduce((sum, s) => sum + subrentalTotals(s.items ?? []).total, 0);

  const ownCosts = costs ?? [];
  const total = jobCostsTotal(ownCosts) + subrentalTotal;

  const hasAssignedCrew = assignedWithProfile.length > 0;

  async function handleDelete(cost: JobCost) {
    const ok = await confirm({
      title: "Kostenposition löschen",
      message: `Kostenposition „${cost.description}" wirklich löschen?`,
      confirmLabel: "Löschen",
      danger: true,
    });
    if (!ok) return;
    await deleteCost.mutateAsync({ id: cost.id, jobId: job.id });
  }

  async function handleAdoptAssigned() {
    const ok = await confirm({
      title: "Zeiten übernehmen",
      message:
        "Für jede zugewiesene Person wird eine Personal-Kostenzeile aus ihren Einsatzzeiten neu berechnet " +
        "(Stunden × Stundensatz). Bereits übernommene Zeilen werden dabei aktualisiert, nicht verdoppelt. " +
        "Handgetippte Kostenzeilen bleiben unberührt.",
      confirmLabel: "Übernehmen",
    });
    if (!ok) return;
    await adoptAssigned.mutateAsync({
      jobId: job.id,
      assignees: assignedWithProfile,
      defaultHourlyRate: costSettings?.default_hourly_rate ?? null,
    });
    toast.success("Zeiten übernommen.");
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Euro size={14} />
          Kosten
        </h2>
        {mayEdit && (
          <div className="flex items-center gap-2">
            {hasAssignedCrew && (
              <Button size="sm" variant="ghost" onClick={handleAdoptAssigned} disabled={adoptAssigned.isPending}>
                <Users size={14} />
                Zeiten übernehmen
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => setCreateOpen(true)}>
              <Plus size={14} />
              Kostenposition hinzufügen
            </Button>
          </div>
        )}
      </CardHeader>
      <CardBody className="space-y-2">
        <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border px-3 py-2.5 text-sm">
          <span className="text-ink-muted">Anmietungen aus Vorgängen</span>
          <span className="font-mono text-ink">{formatCurrency(subrentalTotal)}</span>
        </div>

        {ownCosts.length === 0 ? (
          <p className="flex items-center gap-2 px-1 py-1 text-sm text-ink-faint">
            <Euro size={14} />
            Noch keine weiteren Kostenpositionen.
          </p>
        ) : (
          ownCosts.map((cost) => (
            <div
              key={cost.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {cost.description}
                  <span className="ml-2 rounded bg-bg-raised px-1.5 py-0.5 text-xs font-normal text-ink-faint">
                    {JOB_COST_TYPE_LABELS[cost.cost_type]}
                  </span>
                </p>
                <p className="text-xs text-ink-muted">
                  {cost.profile && profileLabel(cost.profile) !== "—" && `${profileLabel(cost.profile)} · `}
                  {cost.hours != null && cost.hourly_rate != null && `${cost.hours} Std. × ${formatCurrency(cost.hourly_rate)} · `}
                  {cost.cost_date ? formatDate(cost.cost_date) : "kein Datum"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-mono text-xs text-ink-muted">{formatCurrency(cost.amount)}</span>
                {mayEdit && (
                  <>
                    <button
                      onClick={() => setEditCost(cost)}
                      className="rounded p-1.5 text-ink-faint transition-colors hover:text-accent"
                      title="Bearbeiten"
                      aria-label="Bearbeiten"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(cost)}
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
          ))
        )}

        <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-semibold text-ink">
          <span>Kosten gesamt (netto)</span>
          <span className="font-mono">{formatCurrency(total)}</span>
        </div>
      </CardBody>

      <CreateJobCostDialog open={createOpen} onClose={() => setCreateOpen(false)} jobId={job.id} />
      {editCost && (
        <CreateJobCostDialog
          open={!!editCost}
          onClose={() => setEditCost(undefined)}
          jobId={job.id}
          editCost={editCost}
        />
      )}
    </Card>
  );
}
