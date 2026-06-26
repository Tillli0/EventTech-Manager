import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Briefcase, MapPin, Download, ChevronRight, History } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { JobStatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/States";
import { useJobs } from "@/hooks/useJobs";
import {
  JOB_STATUS_OPTIONS,
  JOB_VIEW_MODE_OPTIONS,
  isJobCompletelyPast,
  type JobStatus,
  type JobViewMode,
} from "@/types/database";
import { formatDate } from "@/lib/format";
import { CreateJobDialog } from "@/components/jobs/CreateJobDialog";
import { useSetJobViewMode } from "@/hooks/useAdminUsers";
import { exportToCsv } from "@/lib/csv";
import type { Job } from "@/types/database";
import { useAuth } from "@/auth/AuthProvider";
import { cn } from "@/lib/cn";

function customerLabel(job: Job): string | null {
  const c = job.customer;
  if (!c) return null;
  return c.company_name || [c.first_name, c.last_name].filter(Boolean).join(" ") || null;
}

export function JobsPage() {
  const { canEdit, isManager, profile, user, refresh } = useAuth();
  const mayEdit = canEdit("jobs");
  const setViewMode = useSetJobViewMode();
  const { data: jobs, isLoading, error } = useJobs();
  const [statusFilter, setStatusFilter] = useState<JobStatus | "alle">("alle");
  const [createOpen, setCreateOpen] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];
    if (statusFilter === "alle") return jobs;
    return jobs.filter((j) => j.status === statusFilter);
  }, [jobs, statusFilter]);

  // Komplett vergangene Jobs (Ende + alle Zeitplan-Termine vorbei) in einen
  // eigenen, einklappbaren „Vergangen"-Ordner trennen.
  const { activeJobs, pastJobs } = useMemo(() => {
    const now = new Date();
    const active: Job[] = [];
    const past: Job[] = [];
    for (const job of filteredJobs) {
      (isJobCompletelyPast(job, now) ? past : active).push(job);
    }
    return { activeJobs: active, pastJobs: past };
  }, [filteredJobs]);

  function handleExport() {
    const statusLabel = (s: JobStatus) => JOB_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
    exportToCsv(
      `jobs-${new Date().toISOString().slice(0, 10)}`,
      [
        { label: "Titel", value: (j: Job) => j.title },
        { label: "Kunde", value: (j: Job) => customerLabel(j) ?? "" },
        { label: "Start", value: (j: Job) => formatDate(j.start_date) },
        { label: "Ende", value: (j: Job) => formatDate(j.end_date) },
        { label: "Ort", value: (j: Job) => j.location },
        { label: "Status", value: (j: Job) => statusLabel(j.status) },
      ],
      filteredJobs,
    );
  }

  return (
    <div>
      <PageHeader
        title="Jobs"
        description={jobs ? `${jobs.length} Jobs insgesamt` : undefined}
        actions={
          <>
            <Button variant="secondary" onClick={handleExport} disabled={filteredJobs.length === 0}>
              <Download size={16} />
              CSV
            </Button>
            {mayEdit && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus size={16} />
                Job anlegen
              </Button>
            )}
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as JobStatus | "alle")}
          className="sm:w-56"
        >
          <option value="alle">Alle Status</option>
          {JOB_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        {isManager && profile && (
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <span className="shrink-0">Sichtmodus:</span>
            <Select
              value={profile.job_view_mode}
              onChange={async (e) => {
                if (!user) return;
                await setViewMode.mutateAsync({ userId: user.id, mode: e.target.value as JobViewMode });
                await refresh();
              }}
              className="sm:w-48"
              title="Welche Jobs du selbst siehst"
            >
              {JOB_VIEW_MODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </label>
        )}
      </div>

      {isLoading && <LoadingState label="Jobs werden geladen …" />}
      {error && <ErrorState message={error.message} />}

      {!isLoading && !error && filteredJobs.length === 0 && (
        <EmptyState
          icon={Briefcase}
          title="Keine Jobs gefunden"
          description="Lege einen neuen Job an, um eine Packliste zu erstellen."
          action={
            mayEdit ? (
              <Button variant="secondary" onClick={() => setCreateOpen(true)}>
                <Plus size={16} />
                Ersten Job anlegen
              </Button>
            ) : undefined
          }
        />
      )}

      <div className="space-y-2">
        {activeJobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>

      {/* Vergangen-Ordner: komplett abgeschlossene Jobs, standardmäßig eingeklappt */}
      {pastJobs.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setPastOpen((v) => !v)}
            className="flex w-full items-center gap-2 rounded-md border border-border bg-bg-surface px-4 py-3 text-left transition-colors hover:border-accent/40"
          >
            <ChevronRight
              size={16}
              className={cn("shrink-0 text-ink-muted transition-transform", pastOpen && "rotate-90")}
            />
            <History size={15} className="shrink-0 text-ink-muted" />
            <span className="text-sm font-medium text-ink">Vergangen</span>
            <span className="text-xs text-ink-faint">
              {pastJobs.length} {pastJobs.length === 1 ? "Job" : "Jobs"}
            </span>
          </button>
          {pastOpen && (
            <div className="mt-2 space-y-2">
              {pastJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </div>
      )}

      <CreateJobDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

/** Eine Job-Karte in der Liste (für aktive wie vergangene Jobs gleich). */
function JobCard({ job }: { job: Job }) {
  return (
    <Link to={`/jobs/${job.id}`}>
      <Card
        className="border-l-4 px-5 py-4 transition-colors hover:border-accent/40"
        style={{ borderLeftColor: job.color }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 font-medium text-ink">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: job.color }}
                aria-hidden
              />
              {job.title}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
              <span>
                {formatDate(job.start_date)} – {formatDate(job.end_date)}
              </span>
              {customerLabel(job) && <span>{customerLabel(job)}</span>}
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {job.location}
                </span>
              )}
            </div>
          </div>
          <JobStatusBadge status={job.status} />
        </div>
      </Card>
    </Link>
  );
}
