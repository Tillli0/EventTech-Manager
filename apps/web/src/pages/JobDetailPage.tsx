import { useParams, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { useJob, useUpdateJobStatus } from "@/hooks/useJobs";
import { JOB_STATUS_OPTIONS, type JobStatus } from "@/types/database";
import { formatDateTime } from "@/lib/format";
import { PacklistSection } from "@/components/jobs/PacklistSection";
import { cn } from "@/lib/cn";

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: job, isLoading, error } = useJob(id);
  const updateStatus = useUpdateJobStatus();

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
            <span className="flex items-center gap-1">
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
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ink">Packliste</h2>
            </CardHeader>
            <CardBody>
              <PacklistSection job={job} />
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
              {JOB_STATUS_OPTIONS.map((opt) => (
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
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
