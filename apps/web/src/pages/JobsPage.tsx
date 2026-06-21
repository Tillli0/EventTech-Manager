import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Briefcase, MapPin } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { JobStatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/States";
import { useJobs } from "@/hooks/useJobs";
import { JOB_STATUS_OPTIONS, type JobStatus } from "@/types/database";
import { formatDate } from "@/lib/format";
import { CreateJobDialog } from "@/components/jobs/CreateJobDialog";
import type { Job } from "@/types/database";

export function JobsPage() {
  const { data: jobs, isLoading, error } = useJobs();
  const [statusFilter, setStatusFilter] = useState<JobStatus | "alle">("alle");
  const [createOpen, setCreateOpen] = useState(false);

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];
    if (statusFilter === "alle") return jobs;
    return jobs.filter((j) => j.status === statusFilter);
  }, [jobs, statusFilter]);

  function customerLabel(job: Job) {
    const c = job.customer;
    if (!c) return null;
    return c.company_name || [c.first_name, c.last_name].filter(Boolean).join(" ");
  }

  return (
    <div>
      <PageHeader
        title="Jobs"
        description={jobs ? `${jobs.length} Jobs insgesamt` : undefined}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            Job anlegen
          </Button>
        }
      />

      <div className="mb-4">
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
      </div>

      {isLoading && <LoadingState label="Jobs werden geladen …" />}
      {error && <ErrorState message={error.message} />}

      {!isLoading && !error && filteredJobs.length === 0 && (
        <EmptyState
          icon={Briefcase}
          title="Keine Jobs gefunden"
          description="Lege einen neuen Job an, um eine Packliste zu erstellen."
          action={
            <Button variant="secondary" onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              Ersten Job anlegen
            </Button>
          }
        />
      )}

      <div className="space-y-2">
        {filteredJobs.map((job) => (
          <Link key={job.id} to={`/jobs/${job.id}`}>
            <Card className="px-5 py-4 transition-colors hover:border-accent/40">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-ink">{job.title}</p>
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
        ))}
      </div>

      <CreateJobDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
