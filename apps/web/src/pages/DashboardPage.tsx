import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, MapPin, Package, ArrowRight, Settings } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AccountDialog } from "@/components/account/AccountDialog";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { JobStatusBadge } from "@/components/ui/StatusBadge";
import { useDashboard } from "@/hooks/useDashboard";
import { useWebsiteLeads } from "@/hooks/useWebsiteLeads";
import { useInvoices } from "@/hooks/useInvoices";
import { useSubrentals } from "@/hooks/useSubrentals";
import { subrentalTotals } from "@/lib/subrentals";
import { useAllDocuments, openDocumentInNewTab } from "@/hooks/useDocuments";
import { CATEGORY_META } from "@/components/documents/categoryMeta";
import { NextJobHero } from "@/components/dashboard/NextJobHero";
import { MetricRail, type Metric } from "@/components/dashboard/MetricRail";
import { ActionList } from "@/components/dashboard/ActionList";
import { buildActionItems, type OffenerPosten } from "@/lib/dashboardActions";
import { useAuth } from "@/auth/AuthProvider";
import { DEVICE_STATUS_OPTIONS, invoiceDerivedStatus, offerTotals, invoicePaidSum } from "@/types/database";
import { formatDate, formatCurrency, formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Customer, Job } from "@/types/database";
import { deviceTone } from "@/lib/statusTone";

/**
 * Startseite — nach dem Neuschnitt in vier Zonen statt einer Kartenwand:
 *
 *   1. Anrede auf dem Seitengrund (ohne Karton)
 *   2. Zahlenband: die Kennzahlen als Leiste, nicht als fünf gleich schwere Kacheln
 *   3. Nächster Einsatz: die einzige Fläche mit echtem Gewicht
 *   4. „Was jetzt zählt": EINE sortierte Handlungsliste statt vier Kästen
 *      (überfällige Aufgaben + offene Rechnungen + Anmietungen + Anfragen)
 *   5. Anstehende Jobs (dicht) und zuletzt abgelegte Dokumente (leise)
 *
 * Bewusst ohne Einblend-Choreografie: Diese Seite wird am Tag viele Male
 * geöffnet, jede Animation beim Laden würde sie mit der Zeit zäh wirken lassen.
 */

function personLabel(c: Customer | null | undefined): string | null {
  if (!c) return null;
  return c.company_name || [c.first_name, c.last_name].filter(Boolean).join(" ") || null;
}

function customerLabel(job: Job): string | null {
  return personLabel(job.customer);
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
  const heute = useMemo(() => new Date(), []);

  const darfGeldSehen = hasArea("angebote");
  const darfAnmietungSehen = hasArea("anmietung");

  const newLeads = useMemo(() => (leads ?? []).filter((l) => l.status === "neu"), [leads]);
  const upcomingCount = todayJobs.length + upcomingJobs.length;
  const openTaskCount = overdueTasks.length + otherOpenTasks.length;

  // Offene Rechnungssumme: gestellt, noch nicht bezahlt, ohne Storno. Der Status
  // wird abgeleitet (nie gespeichert) — deshalb hier über invoiceDerivedStatus.
  const { offenePosten, offeneSumme, ueberfaellig } = useMemo(() => {
    if (!darfGeldSehen) return { offenePosten: [] as OffenerPosten[], offeneSumme: 0, ueberfaellig: 0 };
    const posten: OffenerPosten[] = [];
    let summe = 0;
    let mahnfaellig = 0;
    for (const inv of invoices ?? []) {
      const status = invoiceDerivedStatus(inv, inv.items, inv.payments);
      if (status !== "gestellt" && status !== "teilbezahlt" && status !== "ueberfaellig") continue;
      const { gross } = offerTotals(inv.items ?? [], inv.tax_rate);
      const rest = Math.max(0, gross - invoicePaidSum(inv.payments));
      summe += rest;
      if (status === "ueberfaellig") mahnfaellig += 1;
      posten.push({
        id: inv.id,
        nummer: inv.invoice_number,
        titel: inv.title,
        kunde: personLabel(inv.customer),
        faelligAm: inv.due_date,
        restbetrag: rest,
        ueberfaellig: status === "ueberfaellig",
      });
    }
    return { offenePosten: posten, offeneSumme: summe, ueberfaellig: mahnfaellig };
  }, [invoices, darfGeldSehen]);

  // Handlungsbedarf = noch nicht bestätigt (entwurf/angefragt) — sobald bestätigt,
  // liegt der Ball beim Verleiher, nicht mehr bei uns.
  const offeneAnmietungen = useMemo(() => {
    if (!darfAnmietungSehen) return [];
    return (subrentals ?? [])
      .filter((s) => s.status === "entwurf" || s.status === "angefragt")
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [subrentals, darfAnmietungSehen]);

  const anmietungsSumme = offeneAnmietungen.reduce((sum, s) => sum + subrentalTotals(s.items ?? []).total, 0);

  // Wer die Firma führt, sieht alles Fällige; wer nur zugewiesen bekommt, sieht
  // seine eigenen Aufgaben — sonst wäre die Liste für ihn fremde Post.
  const meineAufgaben = useMemo(
    () => [...overdueTasks, ...otherOpenTasks].filter((t) => t.assigned_user_id === user?.id),
    [overdueTasks, otherOpenTasks, user?.id],
  );

  const actionItems = useMemo(
    () =>
      buildActionItems({
        ueberfaelligeAufgaben: isAdmin ? overdueTasks : meineAufgaben,
        offenePosten,
        anmietungen: offeneAnmietungen,
        neueAnfragen: newLeads,
        heute,
      }),
    [isAdmin, overdueTasks, meineAufgaben, offenePosten, offeneAnmietungen, newLeads, heute],
  );

  if (isLoading) return <LoadingState label="Überblick wird geladen …" />;
  if (error) return <ErrorState message={error.message} />;

  const available = deviceStatusCounts["verfuegbar"] ?? 0;
  const onLoan = deviceStatusCounts["ausgeliehen"] ?? 0;
  const utilization = totalDevices > 0 ? Math.round((onLoan / totalDevices) * 100) : 0;

  const metrics: Metric[] = [
    {
      to: "/jobs",
      label: "Anstehende Jobs",
      value: formatNumber(upcomingCount),
      sub: todayJobs.length > 0 ? `${todayJobs.length} heute aktiv` : "in 14 Tagen",
    },
    darfGeldSehen
      ? {
          to: "/rechnungen",
          label: "Offene Rechnungen",
          value: formatCurrency(offeneSumme),
          sub: ueberfaellig > 0 ? `${ueberfaellig} überfällig` : "nichts überfällig",
          alarm: ueberfaellig > 0,
        }
      : {
          to: "/inventar",
          label: "Geräte verfügbar",
          value: formatNumber(available),
          sub: `von ${totalDevices} gesamt`,
        },
    {
      to: "/kunden",
      label: "Neue Anfragen",
      value: formatNumber(newLeads.length),
      sub: newLeads.length > 0 ? "warten auf Sichtung" : "alles gesichtet",
    },
    {
      to: "/aufgaben",
      label: "Offene Aufgaben",
      value: formatNumber(openTaskCount),
      sub: overdueTasks.length > 0 ? `${overdueTasks.length} überfällig` : "nichts überfällig",
      alarm: overdueTasks.length > 0,
    },
  ];
  if (darfAnmietungSehen) {
    metrics.push({
      to: "/anmietung",
      label: "Offene Anmietungen",
      value: formatNumber(offeneAnmietungen.length),
      sub: offeneAnmietungen.length > 0 ? `${formatCurrency(anmietungsSumme)} EK offen` : "nichts offen",
    });
  }

  const hour = heute.getHours();
  const hello = hour < 11 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
  const firstName = profile?.full_name?.split(" ")[0];
  const greeting = firstName ? `${hello}, ${firstName}` : "Überblick";

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">{greeting}</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            {heute.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
        <Button variant="secondary" onClick={() => setAccountOpen(true)} className="md:hidden">
          <Settings size={16} />
          Konto
        </Button>
      </header>
      <AccountDialog open={accountOpen} onClose={() => setAccountOpen(false)} />

      <MetricRail metrics={metrics} />

      {/* Der eine Job, der als Nächstes zählt (Leitidee U3). Für Nutzer, die Jobs
          nur zugewiesen bekommen, heißt er „Dein nächster Einsatz". */}
      {nextJob && <NextJobHero job={nextJob} eigenerEinsatz={!isAdmin} zeigeDokumente={darfGeldSehen} />}

      <ActionList items={actionItems} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* min-w-0: Gitter-Elemente schrumpfen sonst nicht unter die Breite ihres
            längsten Inhalts — lange Job-Titel und Dateinamen schieben die Seite
            auf dem Handy sonst seitlich raus. */}
        <section className="min-w-0 lg:col-span-2" aria-labelledby="anstehende-jobs">
          <SectionHead id="anstehende-jobs" title="Anstehende Jobs" to="/jobs" linkLabel="Alle Jobs" />
          {upcomingCount > 0 ? (
            <div className="overflow-hidden rounded-lg border border-border bg-bg-surface">
              <ul className="divide-y divide-border-subtle">
                {[...todayJobs, ...upcomingJobs].slice(0, 6).map((job) => (
                  <JobRow key={job.id} job={job} />
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-bg-surface">
              <EmptyState
                icon={CalendarClock}
                title="Keine anstehenden Jobs"
                description="In den nächsten 14 Tagen ist nichts geplant."
              />
            </div>
          )}
        </section>

        <section className="min-w-0" aria-labelledby="zuletzt-abgelegt">
          <SectionHead id="zuletzt-abgelegt" title="Zuletzt abgelegt" to="/dokumente" linkLabel="Alle Dokumente" />
          {!documents || documents.length === 0 ? (
            <p className="border-t border-border py-4 text-sm text-ink-faint">Noch keine Dokumente abgelegt.</p>
          ) : (
            <ul className="divide-y divide-border-subtle border-t border-border">
              {documents.slice(0, 6).map((doc) => {
                const meta = CATEGORY_META[doc.category] ?? CATEGORY_META.sonstiges;
                const Icon = meta.icon;
                return (
                  <li key={doc.id}>
                    <button
                      type="button"
                      onClick={() => void openDocumentInNewTab(doc)}
                      className="flex w-full min-w-0 items-center gap-2.5 py-2.5 pr-2 text-left transition-colors duration-150 ease-out hover:bg-bg-raised"
                    >
                      <Icon size={15} strokeWidth={1.75} aria-hidden className={cn("shrink-0", meta.text)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{doc.title}</p>
                        <p className="truncate text-xs text-ink-faint">
                          {doc.entityLabel} · {formatDate(doc.created_at)}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Rest-Inventar: seit der Neuausrichtung nur noch Randnotiz, keine eigene
          Kachel mehr wert (PLAN-UI-NEUSCHNITT.md, U3). */}
      <Link
        to="/inventar"
        className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border px-1 py-3 text-xs transition-colors duration-150 ease-out hover:bg-bg-raised"
      >
        <span className="flex items-center gap-1.5 font-medium text-ink-muted">
          <Package size={14} aria-hidden />
          Rest-Inventar
        </span>
        <div className="flex flex-wrap items-center gap-4">
          {DEVICE_STATUS_OPTIONS.map((opt) => (
            <span key={opt.value} className="flex items-center gap-1.5 text-ink-muted">
              <span className={cn("h-1.5 w-1.5 rounded-full", deviceTone(opt.value).solid)} aria-hidden />
              {opt.label} <span className="font-mono tabular-nums font-medium text-ink">{deviceStatusCounts[opt.value] ?? 0}</span>
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

function SectionHead({
  id,
  title,
  to,
  linkLabel,
}: {
  id: string;
  title: ReactNode;
  to: string;
  linkLabel: string;
}) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-sm font-semibold text-ink">
        {title}
      </h2>
      <Link
        to={to}
        className="flex shrink-0 items-center gap-1 text-xs text-ink-muted transition-colors duration-150 ease-out hover:text-ink"
      >
        {linkLabel} <ArrowRight size={12} aria-hidden />
      </Link>
    </div>
  );
}

function JobRow({ job }: { job: Job }) {
  return (
    <li>
      <Link
        to={`/jobs/${job.id}`}
        className="flex min-w-0 items-center gap-3 px-4 py-2.5 transition-colors duration-150 ease-out hover:bg-bg-raised"
      >
        <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: job.color }} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{job.title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-muted">
            <span className="font-mono tabular-nums">
              {formatDate(job.start_date)} – {formatDate(job.end_date)}
            </span>
            {customerLabel(job) && <span className="truncate">{customerLabel(job)}</span>}
            {job.location && (
              <span className="flex items-center gap-1 truncate">
                <MapPin size={11} aria-hidden />
                {job.location}
              </span>
            )}
          </div>
        </div>
        <JobStatusBadge status={job.status} />
      </Link>
    </li>
  );
}
