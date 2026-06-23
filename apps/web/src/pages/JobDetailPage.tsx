import { useParams, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, Printer } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { useJob, useUpdateJobStatus, useUpdateJob } from "@/hooks/useJobs";
import { JOB_STATUS_OPTIONS, type JobStatus } from "@/types/database";
import { formatDateTime } from "@/lib/format";
import { PacklistSection } from "@/components/jobs/PacklistSection";
import { printPacklist } from "@/lib/printPacklist";
import { JobTasksSection } from "@/components/tasks/JobTasksSection";
import { JobColorPicker } from "@/components/jobs/JobColorPicker";
import { JobMilestonesSection } from "@/components/jobs/JobMilestonesSection";
import { JobStatusBadge } from "@/components/ui/StatusBadge";
import { useSetJobAssignees } from "@/hooks/useJobAssignees";
import { useProfiles, profileLabel } from "@/hooks/useProfiles";
import { useAuth } from "@/auth/AuthProvider";
import type { Job } from "@/types/database";
import { Users } from "lucide-react";
import { cn } from "@/lib/cn";

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { canEdit } = useAuth();
  const mayEdit = canEdit("jobs");
  const { data: job, isLoading, error } = useJob(id);
  const updateStatus = useUpdateJobStatus();
  const updateJob = useUpdateJob();

  if (isLoading) return <LoadingState label="Job wird geladen …" />;
  if (error) return <ErrorState message={error.message} />;
  if (!job) return <ErrorState message="Job nicht gefunden." />;

  const customer = job.customer;
  const customerLabel = customer
    ? customer.company_name || [customer.first_name, customer.last_name].filter(Boolean).join(" ")
    : null;

  return (
    <div>
      <Link to="/jobs" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft size={14} />
        Zurück zu Jobs
      </Link>

      <PageHeader
        title={job.title}
        description={
          <span className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: job.color }}
                aria-hidden
              />
              <Calendar size={13} />
              {formatDateTime(job.start_date)} – {formatDateTime(job.end_date)}
            </span>
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin size={13} />
                {job.location}
              </span>
            )}
            {customerLabel && <span>{customerLabel}</span>}
          </span>
        }
        actions={
          <Button variant="secondary" onClick={() => printPacklist(job)}>
            <Printer size={16} />
            Packliste drucken
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ink">Packliste</h2>
            </CardHeader>
            <CardBody>
              <PacklistSection job={job} canEdit={mayEdit} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ink">Aufgaben</h2>
            </CardHeader>
            <CardBody>
              <JobTasksSection jobId={job.id} jobTitle={job.title} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ink">Zeitplan</h2>
              <p className="mt-0.5 text-xs text-ink-faint">
                Programmablauf des Jobs — z.B. Aufbau, Soundcheck, Eventstart, Abbau. Wird zeitlich sortiert und im Kalender unter dem Job angezeigt.
              </p>
            </CardHeader>
            <CardBody>
              <JobMilestonesSection jobId={job.id} milestones={job.milestones ?? []} defaultAt={job.start_date} />
            </CardBody>
          </Card>

          {job.notes && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-ink">Notizen</h2>
              </CardHeader>
              <CardBody>
                <p className="whitespace-pre-wrap text-sm text-ink-muted">{job.notes}</p>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ink">Status</h2>
            </CardHeader>
            <CardBody className="flex flex-col gap-2">
              {mayEdit ? (
                JOB_STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateStatus.mutate({ id: job.id, status: opt.value as JobStatus })}
                    className={cn(
                      "rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors",
                      job.status === opt.value
                        ? "border-accent bg-accent-soft text-ink"
                        : "border-border text-ink-muted hover:border-accent/40 hover:text-ink",
                    )}
                  >
                    {opt.label}
                  </button>
                ))
              ) : (
                <JobStatusBadge status={job.status} />
              )}
            </CardBody>
          </Card>

          <JobAssigneesCard job={job} canEdit={mayEdit} />

          {mayEdit && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-ink">Farbe</h2>
              </CardHeader>
              <CardBody>
                <JobColorPicker value={job.color} onChange={(color) => updateJob.mutate({ id: job.id, color })} />
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function JobAssigneesCard({ job, canEdit }: { job: Job; canEdit: boolean }) {
  const { data: profiles } = useProfiles();
  const setAssignees = useSetJobAssignees();
  const assignedIds = (job.assignees ?? []).map((a) => a.user_id);

  function toggle(userId: string) {
    const next = assignedIds.includes(userId)
      ? assignedIds.filter((id) => id !== userId)
      : [...assignedIds, userId];
    setAssignees.mutate({ jobId: job.id, userIds: next });
  }

  const assignedProfiles = (profiles ?? []).filter((p) => assignedIds.includes(p.id));

  return (
    <Card>
      <CardHeader>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Users size={14} />
          Zugewiesene Nutzer
        </h2>
      </CardHeader>
      <CardBody>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            {(profiles ?? []).map((p) => {
              const active = assignedIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    active
                      ? "border-accent bg-accent-soft text-ink"
                      : "border-border text-ink-muted hover:border-accent/40 hover:text-ink",
                  )}
                >
                  {profileLabel(p)}
                </button>
              );
            })}
          </div>
        ) : assignedProfiles.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {assignedProfiles.map((p) => (
              <span key={p.id} className="rounded-full bg-bg-raised px-3 py-1 text-xs text-ink-muted">
                {profileLabel(p)}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-faint">Niemand zugewiesen.</p>
        )}
      </CardBody>
    </Card>
  );
}
