import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  useRetrospectiveForJob,
  useUpsertJobRetrospective,
  useRetrospectiveCandidates,
} from "@/hooks/useJobRetrospectives";
import { rankSimilarRetrospectives, hoursDelta } from "@/lib/jobRetrospectives";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Job } from "@/types/database";

/**
 * Erfahrungsgedächtnis: „was hat sich beim letzten Mal gezeigt?" — ein
 * Rückblick je Job (geplante/tatsächliche Stunden + Notiz, in ~2 Minuten
 * ausgefüllt) und ein Blick auf frühere Jobs mit ähnlicher Technik (gleiche
 * Gerätekategorien in der Packliste), damit die eigene Erfahrung nicht nur im
 * Kopf steckt.
 */
export function JobRetrospectiveCard({ job, mayEdit }: { job: Job; mayEdit: boolean }) {
  const { data: retro } = useRetrospectiveForJob(job.id);
  const upsert = useUpsertJobRetrospective();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [planned, setPlanned] = useState("");
  const [actual, setActual] = useState("");
  const [notes, setNotes] = useState("");

  function startEdit() {
    setPlanned(retro?.planned_hours != null ? String(retro.planned_hours) : "");
    setActual(retro?.actual_hours != null ? String(retro.actual_hours) : "");
    setNotes(retro?.notes ?? "");
    setEditing(true);
  }

  async function save() {
    const plannedHours = planned.trim() ? parseFloat(planned.replace(",", ".")) : null;
    const actualHours = actual.trim() ? parseFloat(actual.replace(",", ".")) : null;
    const noteText = notes.trim() || null;
    if (plannedHours === null && actualHours === null && noteText === null) {
      toast.error("Bitte mindestens Stunden oder eine Notiz eintragen.");
      return;
    }
    try {
      await upsert.mutateAsync({
        job_id: job.id,
        planned_hours: plannedHours,
        actual_hours: actualHours,
        notes: noteText,
      });
      setEditing(false);
      toast.success("Rückblick gespeichert.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rückblick konnte nicht gespeichert werden.");
    }
  }

  const delta = retro ? hoursDelta(retro.planned_hours, retro.actual_hours) : null;

  const currentCategoryIds = useMemo(
    () => [
      ...new Set(
        (job.packlist_items ?? [])
          .map((item) => item.device?.category_id)
          .filter((id): id is string => !!id),
      ),
    ],
    [job.packlist_items],
  );
  const { data: candidates } = useRetrospectiveCandidates();
  const similar = useMemo(
    () => (candidates ? rankSimilarRetrospectives(currentCategoryIds, job.id, candidates) : []),
    [candidates, currentCategoryIds, job.id],
  );

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Rückblick</h2>
        {mayEdit && !editing && (
          <Button size="sm" variant="ghost" onClick={startEdit}>
            {retro ? "Bearbeiten" : "Festhalten"}
          </Button>
        )}
      </CardHeader>
      <CardBody className="space-y-4">
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Geplante Stunden">
                <Input
                  type="number"
                  min={0}
                  step="0.5"
                  value={planned}
                  onChange={(e) => setPlanned(e.target.value)}
                  placeholder="z.B. 3"
                />
              </FormField>
              <FormField label="Tatsächliche Stunden">
                <Input
                  type="number"
                  min={0}
                  step="0.5"
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                  placeholder="z.B. 5"
                />
              </FormField>
            </div>
            <FormField label="Was ist dir aufgefallen?" hint="z.B. Nebelmaschine unnötig, Verleiher zu spät.">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>
                Abbrechen
              </Button>
              <Button size="sm" onClick={save} disabled={upsert.isPending}>
                {upsert.isPending ? "Wird gespeichert …" : "Speichern"}
              </Button>
            </div>
          </div>
        ) : retro ? (
          <div className="space-y-2 text-sm">
            {(retro.planned_hours != null || retro.actual_hours != null) && (
              <p className="text-ink">
                {retro.planned_hours != null && (
                  <>
                    Geplant: <span className="font-mono">{formatNumber(retro.planned_hours)} Std.</span>
                  </>
                )}
                {retro.planned_hours != null && retro.actual_hours != null && " · "}
                {retro.actual_hours != null && (
                  <>
                    Tatsächlich: <span className="font-mono">{formatNumber(retro.actual_hours)} Std.</span>
                  </>
                )}
                {delta != null && delta !== 0 && (
                  <span
                    className={cn(
                      "ml-1.5 font-medium",
                      delta > 0 ? "text-status-wartung" : "text-status-verfuegbar",
                    )}
                  >
                    ({delta > 0 ? "+" : ""}
                    {formatNumber(delta)} Std.)
                  </span>
                )}
              </p>
            )}
            {retro.notes && <p className="text-ink-muted">{retro.notes}</p>}
          </div>
        ) : (
          <p className="text-sm text-ink-faint">
            Noch kein Rückblick — zwei Minuten nach dem Event festhalten, was gut lief und was nicht.
          </p>
        )}

        {similar.length > 0 && (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
              <Sparkles size={13} />
              Ähnliche frühere Jobs
            </p>
            {similar.map(({ candidate }) => {
              const d = hoursDelta(candidate.retrospective.planned_hours, candidate.retrospective.actual_hours);
              return (
                <div key={candidate.jobId} className="rounded-md border border-border px-3 py-2 text-xs">
                  <Link to={`/jobs/${candidate.jobId}`} className="font-medium text-ink hover:underline">
                    {candidate.jobTitle}
                  </Link>
                  {(candidate.retrospective.planned_hours != null || candidate.retrospective.actual_hours != null) && (
                    <p className="mt-0.5 text-ink-muted">
                      {candidate.retrospective.planned_hours != null &&
                        `${formatNumber(candidate.retrospective.planned_hours)} Std. geplant`}
                      {candidate.retrospective.planned_hours != null &&
                        candidate.retrospective.actual_hours != null &&
                        " → "}
                      {candidate.retrospective.actual_hours != null &&
                        `${formatNumber(candidate.retrospective.actual_hours)} Std. gebraucht`}
                      {d != null && d !== 0 && ` (${d > 0 ? "+" : ""}${formatNumber(d)} Std.)`}
                    </p>
                  )}
                  {candidate.retrospective.notes && (
                    <p className="mt-0.5 text-ink-faint">{candidate.retrospective.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
