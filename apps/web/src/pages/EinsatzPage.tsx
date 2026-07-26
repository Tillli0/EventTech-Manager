import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, Mail, Truck, AlertTriangle } from "lucide-react";
import { LoadingState, ErrorState } from "@/components/ui/States";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { JobStatusBadge } from "@/components/ui/StatusBadge";
import { TaskStatusBadge, TaskPriorityBadge } from "@/components/ui/TaskBadges";
import { useJob } from "@/hooks/useJobs";
import { useSubrentalsForJob } from "@/hooks/useSubrentals";
import { useJobTasks } from "@/hooks/useTasks";
import { useProfiles, profileLabel } from "@/hooks/useProfiles";
import { PacklistProgress } from "@/components/jobs/PacklistProgress";
import { buildLogisticsTimeline } from "@/lib/subrentalLogistics";
import { formatDate, formatDateTime } from "@/lib/format";

/**
 * Einsatztag-Ansicht: eine einzige, kompakte Seite fürs Handy am Eventtag —
 * wo muss ich wann sein, was ist noch abzuholen, wer ist dabei, wen rufe ich an,
 * was ist noch offen. Alles Übrige (Angebote/Rechnungen/Katalog …) bewusst weg.
 * Reine Lesesicht, kein eigenes Datenmodell — bündelt vorhandene Hooks.
 */
export function EinsatzPage() {
  const { id } = useParams<{ id: string }>();
  const { data: job, isLoading, error } = useJob(id);
  const { data: subrentals } = useSubrentalsForJob(id);
  const { data: tasks } = useJobTasks(id);
  const { data: profiles } = useProfiles();

  const logisticsEvents = useMemo(() => buildLogisticsTimeline(subrentals ?? []), [subrentals]);
  const openTasks = useMemo(() => (tasks ?? []).filter((t) => t.status !== "erledigt"), [tasks]);

  const assigneeNames = useMemo(() => {
    if (!job?.assignees || !profiles) return [];
    const ids = new Set(job.assignees.map((a) => a.user_id));
    return profiles.filter((p) => ids.has(p.id));
  }, [job, profiles]);

  if (isLoading) return <LoadingState label="Wird geladen …" />;
  if (error) return <ErrorState message={error.message} />;
  if (!job) return <ErrorState message="Job nicht gefunden." />;

  const customer = job.customer;
  const customerLabel = customer
    ? customer.company_name || [customer.first_name, customer.last_name].filter(Boolean).join(" ")
    : null;

  return (
    <div className="mx-auto max-w-md space-y-4 pb-8">
      <Link to={`/jobs/${job.id}`} className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft size={14} />
        Zurück zum Job
      </Link>

      <div>
        <h1 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-ink">
          {job.title}
          <JobStatusBadge status={job.status} />
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {formatDateTime(job.start_date)} – {formatDateTime(job.end_date)}
        </p>
        {job.location && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.location)}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm text-accent hover:underline"
          >
            <MapPin size={14} />
            {job.location}
          </a>
        )}
      </div>

      {customer && (
        <Card>
          <CardBody className="space-y-1.5">
            <p className="text-sm font-medium text-ink">{customerLabel}</p>
            {customer.phone && (
              <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 text-sm text-accent hover:underline">
                <Phone size={14} />
                {customer.phone}
              </a>
            )}
            {customer.email && (
              <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 text-sm text-accent hover:underline">
                <Mail size={14} />
                {customer.email}
              </a>
            )}
          </CardBody>
        </Card>
      )}

      {assigneeNames.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-ink">Team</h2>
          </CardHeader>
          <CardBody className="flex flex-wrap gap-3">
            {assigneeNames.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <Avatar label={profileLabel(p)} size="sm" />
                <span className="text-sm text-ink">{profileLabel(p)}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {(job.packlist_items?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-ink">Packliste</h2>
          </CardHeader>
          <CardBody>
            <PacklistProgress items={job.packlist_items ?? []} />
          </CardBody>
        </Card>
      )}

      {logisticsEvents.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Truck size={15} />
              Abholen / Zurückbringen
            </h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {logisticsEvents.map((event) => (
              <div key={`${event.subrentalId}-${event.type}`} className="text-sm">
                <p className="text-ink">
                  <span className="font-mono text-xs text-ink-muted">{formatDate(event.date)}</span> {event.label}
                </p>
                {event.isWeekend && (
                  <p className="flex items-center gap-1 text-xs text-status-wartung">
                    <AlertTriangle size={12} />
                    Wochenende — vorher klären.
                  </p>
                )}
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {openTasks.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-ink">Offene Aufgaben</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {openTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-ink">{task.title}</span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <TaskPriorityBadge priority={task.priority} />
                  <TaskStatusBadge status={task.status} />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

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
  );
}
