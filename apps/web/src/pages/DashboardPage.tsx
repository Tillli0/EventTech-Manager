import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  MapPin,
  Package,
  Briefcase,
  Globe,
  ListChecks,
  ArrowRight,
  AlertCircle,
  Settings,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AccountDialog } from "@/components/account/AccountDialog";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { JobStatusBadge } from "@/components/ui/StatusBadge";
import { TaskPriorityBadge } from "@/components/ui/TaskBadges";
import { useDashboard } from "@/hooks/useDashboard";
import { useWebsiteLeads } from "@/hooks/useWebsiteLeads";
import { useAuth } from "@/auth/AuthProvider";
import { DEVICE_STATUS_OPTIONS } from "@/types/database";
import { formatDate, formatDateTime, initials } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Job, JobMilestone, Task } from "@/types/database";
import { deviceTone } from "@/lib/statusTone";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function customerLabel(job: Job): string | null {
  const c = job.customer;
  if (!c) return null;
  return c.company_name || [c.first_name, c.last_name].filter(Boolean).join(" ") || null;
}

export function DashboardPage() {
  const { isLoading, error, todayJobs, nextJob, upcomingJobs, deviceStatusCounts, totalDevices, overdueTasks, otherOpenTasks } =
    useDashboard();
  const { data: leads } = useWebsiteLeads();
  const { user, profile, isAdmin } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);

  if (isLoading) return <LoadingState label="Überblick wird geladen …" />;
  if (error) return <ErrorState message={error.message} />;

  const newLeads = (leads ?? []).filter((l) => l.status === "neu");
  const myTasks = [...overdueTasks, ...otherOpenTasks].filter((t) => t.assigned_user_id === user?.id);
  const upcomingCount = todayJobs.length + upcomingJobs.length;
  const openTaskCount = overdueTasks.length + otherOpenTasks.length;
  const available = deviceStatusCounts["verfuegbar"] ?? 0;
  const onLoan = deviceStatusCounts["ausgeliehen"] ?? 0;
  const utilization = totalDevices > 0 ? Math.round((onLoan / totalDevices) * 100) : 0;

  const hour = new Date().getHours();
  const hello = hour < 11 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
  const firstName = profile?.full_name?.split(" ")[0];
  const greeting = firstName ? `${hello}, ${firstName}` : "Überblick";
  const subParts = [
    `${formatDate(new Date().toISOString())}`,
    newLeads.length > 0 ? `${newLeads.length} neue Anfrage${newLeads.length === 1 ? "" : "n"}` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">{greeting}</h1>
          <p className="mt-0.5 text-sm text-ink-muted">{subParts.join(" · ")}</p>
        </div>
        <Button variant="secondary" onClick={() => setAccountOpen(true)} className="md:hidden">
          <Settings size={16} />
          Konto
        </Button>
      </div>
      <AccountDialog open={accountOpen} onClose={() => setAccountOpen(false)} />

      {/* Kennzahlen */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          to="/jobs"
          icon={Briefcase}
          tone="accent"
          label="Anstehende Jobs"
          value={upcomingCount}
          sub={todayJobs.length > 0 ? `${todayJobs.length} heute aktiv` : "in 14 Tagen"}
        />
        <MetricCard
          to="/inventar"
          icon={Package}
          tone="green"
          label="Geräte verfügbar"
          value={available}
          sub={`von ${totalDevices} gesamt`}
        />
        <MetricCard
          to="/kunden"
          icon={Globe}
          tone="accent"
          label="Offene Anfragen"
          value={newLeads.length}
          sub={newLeads.length > 0 ? "warten auf Sichtung" : "alles gesichtet"}
        />
        <MetricCard
          to="/aufgaben"
          icon={ListChecks}
          tone="amber"
          label="Offene Aufgaben"
          value={openTaskCount}
          sub={overdueTasks.length > 0 ? `${overdueTasks.length} überfällig` : "nichts überfällig"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {!isAdmin && myTasks.length > 0 && (
            <SectionCard title="Mir zugewiesen" action={<CardLink to="/aufgaben" label="Alle Aufgaben" />}>
              <div className="space-y-2">
                {myTasks.slice(0, 5).map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            </SectionCard>
          )}

          <SectionCard title="Anstehende Jobs" action={<CardLink to="/jobs" label="Alle Jobs" />}>
            {nextJob || upcomingCount > 0 ? (
              <div className="space-y-2">
                {[...todayJobs, ...upcomingJobs].slice(0, 5).map((job) => (
                  <JobRow key={job.id} job={job} />
                ))}
                {nextJob && (nextJob.milestones?.length ?? 0) > 0 && (
                  <NextJobSchedule milestones={nextJob.milestones ?? []} />
                )}
              </div>
            ) : (
              <EmptyState
                icon={CalendarClock}
                title="Keine anstehenden Jobs"
                description="In den nächsten 14 Tagen ist nichts geplant."
              />
            )}
          </SectionCard>

          <SectionCard title="Gerätestatus" action={<CardLink to="/inventar" label="Inventar" />}>
            <DeviceStatusBars counts={deviceStatusCounts} total={totalDevices} />
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard title="Geräte im Einsatz">
            <div className="flex items-center gap-4">
              <UtilizationRing pct={utilization} />
              <div>
                <p className="text-sm text-ink">{onLoan} ausgeliehen</p>
                <p className="mt-0.5 text-xs text-ink-faint">von {totalDevices} Geräten im Bestand</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title={
              <span className="flex items-center gap-2">
                <Globe size={15} className="text-accent" />
                Neue Anfragen
              </span>
            }
            action={
              newLeads.length > 0 ? (
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-white">
                  {newLeads.length}
                </span>
              ) : undefined
            }
          >
            {newLeads.length === 0 ? (
              <p className="py-3 text-center text-sm text-ink-faint">Keine neuen Website-Anfragen.</p>
            ) : (
              <div className="space-y-3">
                {newLeads.slice(0, 4).map((lead) => (
                  <div key={lead.id} className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-medium text-accent">
                      {initials(lead.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{lead.name}</p>
                      <p className="truncate text-xs text-ink-faint">
                        {[lead.event_type, lead.event_date ? formatDate(lead.event_date) : null]
                          .filter(Boolean)
                          .join(" · ") || "Website-Anfrage"}
                      </p>
                    </div>
                  </div>
                ))}
                <Link
                  to="/kunden"
                  className="flex w-full items-center justify-center gap-1.5 rounded-md bg-accent-soft py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
                >
                  Anfragen bearbeiten
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Fällige Aufgaben" action={<CardLink to="/aufgaben" label="Alle" />}>
            {openTaskCount === 0 ? (
              <p className="py-3 text-center text-sm text-ink-faint">Keine offenen Aufgaben.</p>
            ) : (
              <div className="space-y-2">
                {overdueTasks.slice(0, 4).map((task) => (
                  <TaskRow key={task.id} task={task} overdue />
                ))}
                {otherOpenTasks.slice(0, Math.max(0, 4 - overdueTasks.length)).map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Bausteine
// ============================================================

const TONE: Record<string, string> = {
  accent: "bg-accent/15 text-accent",
  green: "bg-status-verfuegbar/15 text-status-verfuegbar",
  amber: "bg-status-wartung/15 text-status-wartung",
};

function MetricCard({
  to,
  icon: Icon,
  tone,
  label,
  value,
  sub,
}: {
  to: string;
  icon: LucideIcon;
  tone: keyof typeof TONE;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-border bg-bg-surface p-3.5 transition-all hover:-translate-y-0.5 hover:border-accent/40"
    >
      <div className="flex items-start justify-between">
        <span className="text-xs text-ink-muted">{label}</span>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", TONE[tone])}>
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-ink">
        <CountUp value={value} />
      </p>
      <p className="mt-0.5 text-xs text-ink-faint">{sub}</p>
    </Link>
  );
}

function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    if (prefersReducedMotion() || value === 0) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const dur = 700;
    const tick = (t: number) => {
      const p = Math.min((t - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setDisplay(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{display}</>;
}

const RING_R = 34;
const RING_C = 2 * Math.PI * RING_R;

function UtilizationRing({ pct }: { pct: number }) {
  const target = RING_C * (1 - pct / 100);
  const [offset, setOffset] = useState(prefersReducedMotion() ? target : RING_C);
  useEffect(() => {
    if (prefersReducedMotion()) {
      setOffset(target);
      return;
    }
    const id = requestAnimationFrame(() => setOffset(target));
    return () => cancelAnimationFrame(id);
  }, [target]);
  return (
    <div className="relative h-[84px] w-[84px] shrink-0">
      <svg width="84" height="84" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={RING_R} fill="none" stroke="currentColor" strokeWidth="8" className="text-border" />
        <circle
          cx="40"
          cy="40"
          r={RING_R}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
          strokeDasharray={RING_C}
          strokeDashoffset={offset}
          className="text-accent"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-base font-semibold text-ink">{pct}%</span>
    </div>
  );
}

function DeviceStatusBars({ counts, total }: { counts: Record<string, number>; total: number }) {
  const [mounted, setMounted] = useState(prefersReducedMotion());
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  if (total === 0) return <p className="py-2 text-sm text-ink-faint">Noch keine Geräte erfasst.</p>;
  return (
    <div className="space-y-2.5">
      {DEVICE_STATUS_OPTIONS.map((opt) => {
        const count = counts[opt.value] ?? 0;
        const pct = (count / total) * 100;
        return (
          <div key={opt.value} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs text-ink-muted">{opt.label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-raised">
              <div
                className={cn("h-full rounded-full", deviceTone(opt.value).solid)}
                style={{
                  width: mounted ? `${pct}%` : "0%",
                  transition: "width 0.8s cubic-bezier(0.2,0.7,0.3,1)",
                }}
              />
            </div>
            <span className="w-7 shrink-0 text-right text-xs font-medium text-ink">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-bg-surface">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function CardLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-1 text-xs text-ink-muted transition-colors hover:text-ink">
      {label} <ArrowRight size={12} />
    </Link>
  );
}

function NextJobSchedule({ milestones }: { milestones: JobMilestone[] }) {
  const sorted = [...milestones].sort((a, b) => a.at.localeCompare(b.at));
  return (
    <div className="rounded-lg bg-bg-raised px-3 py-2.5">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-muted">
        <CalendarClock size={12} /> Zeitplan nächster Job
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
    <Link
      to={`/jobs/${job.id}`}
      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-bg-raised"
    >
      <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: job.color }} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{job.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-muted">
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
    </Link>
  );
}

function TaskRow({ task, overdue }: { task: Task; overdue?: boolean }) {
  return (
    <Link
      to="/aufgaben"
      className={cn(
        "flex items-start gap-2 rounded-lg px-3 py-2 transition-colors",
        overdue ? "bg-status-defekt-bg hover:opacity-80" : "bg-bg-raised hover:bg-bg-raised/70",
      )}
    >
      {overdue ? (
        <AlertCircle size={14} className="mt-0.5 shrink-0 text-status-defekt" />
      ) : (
        <ListChecks size={14} className="mt-0.5 shrink-0 text-ink-faint" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{task.title}</p>
        <div className={cn("mt-0.5 flex items-center gap-2 text-xs", overdue ? "text-status-defekt" : "text-ink-muted")}>
          {task.due_date ? <span>Fällig: {formatDate(task.due_date)}</span> : <span>Kein Termin</span>}
          <TaskPriorityBadge priority={task.priority} />
        </div>
      </div>
      {overdue && <ArrowUpRight size={13} className="mt-0.5 shrink-0 text-status-defekt/70" />}
    </Link>
  );
}
