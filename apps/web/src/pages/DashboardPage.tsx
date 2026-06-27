import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, MapPin, Package, ListChecks, ArrowRight, AlertCircle, Settings } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { AccountDialog } from "@/components/account/AccountDialog";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { JobStatusBadge } from "@/components/ui/StatusBadge";
import { TaskPriorityBadge } from "@/components/ui/TaskBadges";
import { useDashboard } from "@/hooks/useDashboard";
import { useAuth } from "@/auth/AuthProvider";
import { DEVICE_STATUS_OPTIONS } from "@/types/database";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Job, JobMilestone } from "@/types/database";

function customerLabel(job: Job): string | null {
  const c = job.customer;
  if (!c) return null;
  return c.company_name || [c.first_name, c.last_name].filter(Boolean).join(" ") || null;
}

export function DashboardPage() {
  const { isLoading, error, nextJob, upcomingJobs, deviceStatusCounts, overdueTasks, otherOpenTasks } =
    useDashboard();
  const { user, profile, isAdmin } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);

  if (isLoading) return <LoadingState label="Überblick wird geladen …" />;
  if (error) return <ErrorState message={error.message} />;

  const myTasks = [...overdueTasks, ...otherOpenTasks].filter((t) => t.assigned_user_id === user?.id);
  const greeting = profile?.full_name ? `Hallo ${profile.full_name.split(" ")[0]}` : "Überblick";

  return (
    <div>
      <PageHeader
        title={greeting}
        description="Was heute und in den nächsten Tagen ansteht."
        actions={
          <Button variant="secondary" onClick={() => setAccountOpen(true)} className="md:hidden">
            <Settings size={16} />
            Konto
          </Button>
        }
      />
      <AccountDialog open={accountOpen} onClose={() => setAccountOpen(false)} />

      {!isAdmin && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-sm font-semibold text-ink">Mir zugewiesen</h2>
          </CardHeader>
          <CardBody>
            {myTasks.length === 0 ? (
              <p className="py-2 text-sm text-ink-faint">Dir sind aktuell keine offenen Aufgaben zugewiesen.</p>
            ) : (
              <div className="space-y-2">
                {myTasks.slice(0, 6).map((task) => (
                  <Link
                    key={task.id}
                    to="/aufgaben"
                    className="flex items-center justify-between rounded-md border border-l-4 border-border bg-bg-raised px-3 py-2 transition-colors hover:border-accent/40"
                    style={{ borderLeftColor: task.job?.color ?? undefined }}
                  >
                    <span className="truncate text-sm font-medium text-ink">{task.title}</span>
                    <span className="ml-3 shrink-0 text-xs text-ink-muted">
                      {task.due_date ? `Fällig: ${formatDate(task.due_date)}` : "Kein Termin"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Gerätestatus */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {DEVICE_STATUS_OPTIONS.map((opt) => (
          <Link key={opt.value} to="/inventar">
            <Card className="px-4 py-3 transition-colors hover:border-accent/40">
              <p className="text-xs text-ink-muted">{opt.label}</p>
              <p className="mt-1 text-2xl font-semibold text-ink">{deviceStatusCounts[opt.value] ?? 0}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Nächster Job */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Nächster Job</h2>
            <Link to="/jobs" className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink">
              Alle Jobs <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <CardBody>
            {!nextJob ? (
              <p className="py-4 text-center text-sm text-ink-faint">Kein kommender Job geplant.</p>
            ) : (
              <div className="space-y-3">
                <JobRow job={nextJob} />
                <NextJobSchedule milestones={nextJob.milestones ?? []} />
              </div>
            )}
          </CardBody>
        </Card>

        {/* Fällige Aufgaben */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Fällige Aufgaben</h2>
            <Link to="/aufgaben" className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink">
              Alle Aufgaben <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <CardBody>
            {overdueTasks.length === 0 && otherOpenTasks.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-faint">Keine offenen Aufgaben.</p>
            ) : (
              <div className="space-y-2">
                {overdueTasks.map((task) => (
                  <Link
                    key={task.id}
                    to="/aufgaben"
                    className="flex items-start gap-2 rounded-md border border-l-4 border-status-defekt/20 bg-status-defekt-bg px-3 py-2 transition-colors hover:opacity-80"
                    style={{ borderLeftColor: task.job?.color ?? undefined }}
                  >
                    <AlertCircle size={14} className="mt-0.5 shrink-0 text-status-defekt" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{task.title}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-status-defekt">
                        <span>Fällig: {formatDate(task.due_date)}</span>
                        <TaskPriorityBadge priority={task.priority} />
                      </div>
                    </div>
                  </Link>
                ))}
                {otherOpenTasks.slice(0, Math.max(0, 5 - overdueTasks.length)).map((task) => (
                  <Link
                    key={task.id}
                    to="/aufgaben"
                    className="flex items-start gap-2 rounded-md border border-l-4 border-border bg-bg-raised px-3 py-2 transition-colors hover:border-accent/40"
                    style={{ borderLeftColor: task.job?.color ?? undefined }}
                  >
                    <ListChecks size={14} className="mt-0.5 shrink-0 text-ink-faint" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{task.title}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-muted">
                        {task.due_date ? <span>Fällig: {formatDate(task.due_date)}</span> : <span>Kein Termin</span>}
                        <TaskPriorityBadge priority={task.priority} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Anstehende Jobs */}
      <Card className="mt-6">
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Anstehend (nächste 14 Tage)</h2>
          <Link to="/jobs" className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink">
            Alle Jobs <ArrowRight size={12} />
          </Link>
        </CardHeader>
        <CardBody>
          {upcomingJobs.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Keine anstehenden Jobs"
              description="In den nächsten 14 Tagen ist nichts geplant."
            />
          ) : (
            <div className="space-y-2">
              {upcomingJobs.map((job) => (
                <JobRow key={job.id} job={job} />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Hinweis auf fehlende Rechnungsübersicht, statt sie vorzutäuschen */}
      <Card className="mt-6 border-dashed">
        <CardBody className="flex items-center gap-3">
          <Package size={18} className="shrink-0 text-ink-faint" />
          <p className="text-sm text-ink-muted">
            Offene Rechnungen werden hier angezeigt, sobald die Rechnungsstellung im System angelegt ist.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

/** Zeitplan-Punkte des nächsten Jobs im Überblick auflisten (zeitlich sortiert). */
function NextJobSchedule({ milestones }: { milestones: JobMilestone[] }) {
  if (milestones.length === 0) return null;
  const sorted = [...milestones].sort((a, b) => a.at.localeCompare(b.at));
  return (
    <div className="rounded-md border border-border bg-bg-raised px-3 py-2.5">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-muted">
        <CalendarClock size={12} /> Zeitplan
      </p>
      <ul className="space-y-1">
        {sorted.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 text-xs">
            <span className="truncate text-ink">{m.title}</span>
            <span className="shrink-0 text-ink-faint">{formatDateTime(m.at)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function JobRow({ job }: { job: Job }) {
  return (
    <Link to={`/jobs/${job.id}`} className="block">
      <div
        className="rounded-md border border-l-4 border-border bg-bg-raised px-3 py-2.5 transition-colors hover:border-accent/40"
        style={{ borderLeftColor: job.color }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 truncate text-sm font-medium text-ink">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: job.color }}
                aria-hidden
              />
              {job.title}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              <span>
                {formatDate(job.start_date)} – {formatDate(job.end_date)}
              </span>
              {customerLabel(job) && <span>{customerLabel(job)}</span>}
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={11} />
                  {job.location}
                </span>
              )}
            </div>
          </div>
          <JobStatusBadge status={job.status} />
        </div>
      </div>
    </Link>
  );
}
