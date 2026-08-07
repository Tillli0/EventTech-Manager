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
  Receipt,
  Files,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AccountDialog } from "@/components/account/AccountDialog";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { JobStatusBadge, SubrentalStatusBadge } from "@/components/ui/StatusBadge";
import { TaskPriorityBadge } from "@/components/ui/TaskBadges";
import { useDashboard } from "@/hooks/useDashboard";
import { useWebsiteLeads } from "@/hooks/useWebsiteLeads";
import { useInvoices } from "@/hooks/useInvoices";
import { useSubrentals } from "@/hooks/useSubrentals";
import { subrentalTotals } from "@/lib/subrentals";
import { useAllDocuments, openDocumentInNewTab } from "@/hooks/useDocuments";
import { CATEGORY_META } from "@/components/documents/categoryMeta";
import { NextJobHero } from "@/components/dashboard/NextJobHero";
import { useAuth } from "@/auth/AuthProvider";
import { DEVICE_STATUS_OPTIONS, invoiceDerivedStatus, offerTotals, invoicePaidSum } from "@/types/database";
import { formatDate, formatCurrency } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Job, Subrental, Task } from "@/types/database";
import { deviceTone, levelTone, type ToneLevel } from "@/lib/statusTone";
import { Avatar } from "@/components/ui/Avatar";

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
  const { data: invoices } = useInvoices();
  const { data: subrentals } = useSubrentals();
  const { data: documents } = useAllDocuments();
  const { user, profile, isAdmin, hasArea } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);

  if (isLoading) return <LoadingState label="Überblick wird geladen …" />;
  if (error) return <ErrorState message={error.message} />;

  const newLeads = (leads ?? []).filter((l) => l.status === "neu");
  const myTasks = [...overdueTasks, ...otherOpenTasks].filter((t) => t.assigned_user_id === user?.id);
  const upcomingCount = todayJobs.length + upcomingJobs.length;
  const openTaskCount = overdueTasks.length + otherOpenTasks.length;
  // Offene Rechnungssumme: gestellt, noch nicht bezahlt, ohne Storno. Der Status
  // wird abgeleitet (nie gespeichert) — deshalb hier über invoiceDerivedStatus.
  const offeneRechnungen = (invoices ?? []).filter((inv) => {
    const status = invoiceDerivedStatus(inv, inv.items, inv.payments);
    return status === "gestellt" || status === "teilbezahlt" || status === "ueberfaellig";
  });
  const offeneSumme = offeneRechnungen.reduce((summe, inv) => {
    const { gross } = offerTotals(inv.items ?? [], inv.tax_rate);
    return summe + Math.max(0, gross - invoicePaidSum(inv.payments));
  }, 0);
  const ueberfaellig = offeneRechnungen.filter(
    (inv) => invoiceDerivedStatus(inv, inv.items, inv.payments) === "ueberfaellig",
  ).length;
  const darfGeldSehen = hasArea("angebote");
  const darfAnmietungSehen = hasArea("anmietung");
  // Handlungsbedarf = noch nicht bestätigt (entwurf/angefragt) — sobald bestätigt,
  // liegt der Ball beim Verleiher, nicht mehr bei uns.
  const subrentalsNeedingAction = (subrentals ?? [])
    .filter((s) => s.status === "entwurf" || s.status === "angefragt")
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
  const subrentalsOpenSum = subrentalsNeedingAction.reduce(
    (sum, s) => sum + subrentalTotals(s.items ?? []).total,
    0,
  );

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

      {/* Hauptinstrument: der eine Job, der als Nächstes zählt (Leitidee U3,
          jetzt mit echtem Zeit-Fortschritts-Ring statt Kicker-Zeile). */}
      {nextJob && (
        <NextJobHero job={nextJob} eigenerEinsatz={!isAdmin} zeigeDokumente={darfGeldSehen} />
      )}

      {/* Kennzahlen als EINE durchgehende Instrumenten-Leiste (Haarlinien-Trenner
          statt fünf einzelner Kacheln) — bewusster Kompromiss: zahlengeführt statt
          Zeiger-Dials, weil die Seite täglich mehrfach auf einen Blick gelesen wird. */}
      <div
        className={cn(
          "grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-lg border border-border sm:divide-y-0",
          darfAnmietungSehen ? "sm:grid-cols-3 lg:grid-cols-5" : "sm:grid-cols-2 lg:grid-cols-4",
        )}
      >
        <MetricReadout
          to="/jobs"
          icon={Briefcase}
          tone="neutral"
          label="Anstehende Jobs"
          value={upcomingCount}
          sub={todayJobs.length > 0 ? `${todayJobs.length} heute aktiv` : "in 14 Tagen"}
        />
        {darfGeldSehen ? (
          <MetricReadout
            to="/rechnungen"
            icon={Receipt}
            tone={ueberfaellig > 0 ? "schlecht" : "gut"}
            label="Offene Rechnungen"
            value={offeneSumme}
            format={(v) => formatCurrency(v)}
            sub={ueberfaellig > 0 ? `${ueberfaellig} überfällig` : "nichts überfällig"}
          />
        ) : (
          <MetricReadout
            to="/inventar"
            icon={Package}
            tone="gut"
            label="Geräte verfügbar"
            value={available}
            sub={`von ${totalDevices} gesamt`}
          />
        )}
        <MetricReadout
          to="/kunden"
          icon={Globe}
          tone="neutral"
          label="Offene Anfragen"
          value={newLeads.length}
          sub={newLeads.length > 0 ? "warten auf Sichtung" : "alles gesichtet"}
        />
        <MetricReadout
          to="/aufgaben"
          icon={ListChecks}
          tone="mittel"
          label="Offene Aufgaben"
          value={openTaskCount}
          sub={overdueTasks.length > 0 ? `${overdueTasks.length} überfällig` : "nichts überfällig"}
        />
        {darfAnmietungSehen && (
          <MetricReadout
            to="/anmietung"
            icon={Truck}
            tone={subrentalsNeedingAction.length > 0 ? "mittel" : "gut"}
            label="Offene Anmietungen"
            value={subrentalsNeedingAction.length}
            sub={subrentalsNeedingAction.length > 0 ? `${formatCurrency(subrentalsOpenSum)} EK offen` : "nichts offen"}
          />
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {!isAdmin && myTasks.length > 0 && (
            <SectionCard title="Mir zugewiesen" action={<CardLink to="/aufgaben" label="Alle Aufgaben" />}>
              <div className="space-y-1">
                {myTasks.slice(0, 5).map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            </SectionCard>
          )}

          <SectionCard title="Anstehende Jobs" action={<CardLink to="/jobs" label="Alle Jobs" />}>
            {nextJob || upcomingCount > 0 ? (
              <div className="space-y-1">
                {[...todayJobs, ...upcomingJobs].slice(0, 5).map((job) => (
                  <JobRow key={job.id} job={job} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CalendarClock}
                title="Keine anstehenden Jobs"
                description="In den nächsten 14 Tagen ist nichts geplant."
              />
            )}
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard
            title={
              <span className="flex items-center gap-2">
                <Globe size={15} className="text-ink-faint" />
                Neue Anfragen
              </span>
            }
            action={
              newLeads.length > 0 ? (
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-on">
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
                    <Avatar label={lead.name} size="md" className="font-medium" />
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
                  className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border py-2 text-sm font-medium text-ink transition-colors hover:bg-bg-raised"
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
              <div className="space-y-1">
                {overdueTasks.slice(0, 4).map((task) => (
                  <TaskRow key={task.id} task={task} overdue />
                ))}
                {otherOpenTasks.slice(0, Math.max(0, 4 - overdueTasks.length)).map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            )}
          </SectionCard>

          {darfAnmietungSehen && (
            <SectionCard title="Anmietungen mit Handlungsbedarf" action={<CardLink to="/anmietung" label="Alle" />}>
              {subrentalsNeedingAction.length === 0 ? (
                <p className="py-3 text-center text-sm text-ink-faint">Nichts offen.</p>
              ) : (
                <div className="space-y-1">
                  {subrentalsNeedingAction.slice(0, 4).map((s) => (
                    <SubrentalRow key={s.id} subrental={s} />
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          <SectionCard
            title={
              <span className="flex items-center gap-2">
                <Files size={15} className="text-ink-faint" />
                Zuletzt abgelegte Dokumente
              </span>
            }
            action={<CardLink to="/dokumente" label="Alle Dokumente" />}
          >
            {!documents || documents.length === 0 ? (
              <p className="py-3 text-center text-sm text-ink-faint">Noch keine Dokumente abgelegt.</p>
            ) : (
              <div className="space-y-1">
                {documents.slice(0, 5).map((doc) => {
                  const meta = CATEGORY_META[doc.category] ?? CATEGORY_META.sonstiges;
                  const Icon = meta.icon;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => void openDocumentInNewTab(doc)}
                      className="flex w-full items-center gap-2.5 rounded-md py-1.5 text-left transition-colors hover:bg-bg-raised"
                    >
                      <Icon size={15} className="shrink-0 text-ink-faint" strokeWidth={1.75} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{doc.title}</p>
                        <p className="truncate text-xs text-ink-faint">
                          {doc.entityLabel} · {formatDate(doc.created_at)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Rest-Inventar: seit der Neuausrichtung nur noch Randnotiz, keine eigene
          Kachel mehr wert (PLAN-UI-NEUSCHNITT.md, U3). */}
      <Link
        to="/inventar"
        className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-bg-surface px-4 py-3 text-xs transition-colors hover:border-ink/30"
      >
        <span className="flex items-center gap-1.5 font-medium text-ink-muted">
          <Package size={14} />
          Rest-Inventar
        </span>
        <div className="flex flex-wrap items-center gap-4">
          {DEVICE_STATUS_OPTIONS.map((opt) => (
            <span key={opt.value} className="flex items-center gap-1.5 text-ink-muted">
              <span className={cn("h-1.5 w-1.5 rounded-full", deviceTone(opt.value).solid)} />
              {opt.label} <span className="font-mono font-medium tabular-nums text-ink">{deviceStatusCounts[opt.value] ?? 0}</span>
            </span>
          ))}
        </div>
        <span className="ml-auto text-ink-faint">
          {utilization}% ausgelastet · {onLoan} von {totalDevices} im Einsatz
        </span>
      </Link>
    </div>
  );
}

// ============================================================
// Bausteine
// ============================================================

/**
 * Ein Segment der Kennzahlen-Instrumentenleiste. Bewusst KEIN eigenes
 * Karten-/Icon-Farbbox-Design (das wäre die Standard-Metrik-Kachel) — die
 * fünf Segmente bilden EIN durchgehendes Instrument mit Haarlinien-Trennern,
 * dazu ein kleiner Ampel-Punkt statt einer Icon-Farbfläche.
 */
function MetricReadout({
  to,
  icon: Icon,
  tone,
  label,
  value,
  sub,
  format,
}: {
  to: string;
  icon: LucideIcon;
  tone: ToneLevel;
  label: string;
  value: number;
  sub: string;
  /** Optionale Aufbereitung, z. B. als Währung. Ohne sie zählt die Zahl hoch. */
  format?: (v: number) => string;
}) {
  return (
    <Link to={to} className="group flex flex-col justify-between gap-3 bg-bg-surface p-3.5 transition-colors hover:bg-bg-raised">
      <span className="flex items-center gap-1.5 text-xs text-ink-muted">
        <Icon size={13} className="shrink-0 text-ink-faint" aria-hidden />
        {label}
        {tone !== "neutral" && <span className={cn("ml-auto h-1.5 w-1.5 rounded-full", levelTone(tone).solid)} aria-hidden />}
      </span>
      <div>
        <p className="font-mono text-2xl font-semibold tabular-nums text-ink">
          {format ? format(value) : <CountUp value={value} />}
        </p>
        <p className="mt-0.5 truncate text-xs text-ink-muted">{sub}</p>
      </div>
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
    <section className="rounded-lg border border-border bg-bg-surface">
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
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

function JobRow({ job }: { job: Job }) {
  return (
    <Link
      to={`/jobs/${job.id}`}
      className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-bg-raised"
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: job.color }} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{job.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-muted">
          <span className="font-mono tabular-nums">
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

function SubrentalRow({ subrental }: { subrental: Subrental }) {
  return (
    <Link
      to={`/jobs/${subrental.job_id}`}
      className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-bg-raised"
    >
      <Truck size={14} className="shrink-0 text-ink-faint" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">
          {subrental.supplier?.name ?? "Verleih-Partner"}
          {subrental.job?.title && <span className="text-ink-faint"> · {subrental.job.title}</span>}
        </p>
        <p className="mt-0.5 font-mono text-xs tabular-nums text-ink-muted">
          {formatDate(subrental.start_date)} – {formatDate(subrental.end_date)}
        </p>
      </div>
      <SubrentalStatusBadge status={subrental.status} />
    </Link>
  );
}

function TaskRow({ task, overdue }: { task: Task; overdue?: boolean }) {
  return (
    <Link
      to="/aufgaben"
      className={cn(
        "flex items-start gap-2.5 rounded-md px-2 py-1.5 transition-colors",
        overdue ? "bg-status-defekt-bg hover:opacity-90" : "hover:bg-bg-raised",
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
          {task.due_date ? <span className="font-mono tabular-nums">Fällig: {formatDate(task.due_date)}</span> : <span>Kein Termin</span>}
          <TaskPriorityBadge priority={task.priority} />
        </div>
      </div>
      {overdue && <ArrowUpRight size={13} className="mt-0.5 shrink-0 text-status-defekt/70" />}
    </Link>
  );
}
