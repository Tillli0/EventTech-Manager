import { useMemo } from "react";
import { BarChart3, Receipt, Wallet, AlertTriangle, Package, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { JobStatusBadge } from "@/components/ui/StatusBadge";
import { useInvoices } from "@/hooks/useInvoices";
import { useJobs } from "@/hooks/useJobs";
import { useDevices } from "@/hooks/useDevices";
import {
  lastMonths,
  revenueByMonth,
  paymentsByMonth,
  financeSummary,
  jobsByMonth,
  topDevices,
  topCustomers,
  type MonthBucket,
} from "@/lib/reports";
import { JOB_STATUS_OPTIONS, type JobStatus } from "@/types/database";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Auswertungen — Finanz-, Job- und Geräte-Kennzahlen aus den bestehenden
 * Datenquellen (Rechnungen/Zahlungen, Jobs/Packlisten). Alles wird client-seitig
 * aggregiert (lib/reports.ts, getestet); RLS bestimmt, was der Nutzer sieht.
 */
export function ReportsPage() {
  const { data: invoices, isLoading: invLoading, error: invError } = useInvoices();
  const { data: jobs, isLoading: jobsLoading, error: jobsError } = useJobs();
  const { data: devices } = useDevices();

  const now = useMemo(() => new Date(), []);
  const buckets = useMemo(() => lastMonths(12, now), [now]);

  const finance = useMemo(() => financeSummary(invoices ?? [], now), [invoices, now]);
  const revenueSeries = useMemo(() => revenueByMonth(invoices ?? [], buckets), [invoices, buckets]);
  const paymentSeries = useMemo(() => paymentsByMonth(invoices ?? [], buckets), [invoices, buckets]);
  const jobSeries = useMemo(() => jobsByMonth(jobs ?? [], buckets), [jobs, buckets]);

  const yearStart = useMemo(() => new Date(now.getFullYear(), 0, 1), [now]);
  const twelveMonthsAgo = useMemo(
    () => new Date(now.getFullYear(), now.getMonth() - 11, 1),
    [now],
  );
  const bestDevices = useMemo(() => topDevices(jobs ?? [], twelveMonthsAgo, 8), [jobs, twelveMonthsAgo]);
  const bestCustomers = useMemo(() => topCustomers(invoices ?? [], twelveMonthsAgo, 5), [invoices, twelveMonthsAgo]);

  const jobStatusCounts = useMemo(() => {
    const counts = new Map<JobStatus, number>();
    for (const job of jobs ?? []) {
      if (job.deleted_at) continue;
      if (new Date(job.start_date) < yearStart) continue;
      counts.set(job.status, (counts.get(job.status) ?? 0) + 1);
    }
    return counts;
  }, [jobs, yearStart]);
  const jobsThisYear = [...jobStatusCounts.entries()]
    .filter(([status]) => status !== "storniert")
    .reduce((sum, [, n]) => sum + n, 0);

  const deviceName = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of devices ?? []) map.set(d.id, d.name);
    return map;
  }, [devices]);

  if (invLoading || jobsLoading) return <LoadingState label="Auswertungen werden berechnet …" />;
  if (invError) return <ErrorState message={invError.message} />;
  if (jobsError) return <ErrorState message={jobsError.message} />;

  const hasAnyData = (invoices?.length ?? 0) > 0 || (jobs?.length ?? 0) > 0;

  return (
    <div>
      <PageHeader
        title="Auswertungen"
        description={`Finanz- und Auslastungs-Kennzahlen · Stand ${now.toLocaleDateString("de-DE")}`}
      />

      {!hasAnyData ? (
        <EmptyState
          icon={BarChart3}
          title="Noch keine Daten"
          description="Sobald Rechnungen gestellt und Jobs geplant sind, entstehen hier die Auswertungen."
        />
      ) : (
        <div className="space-y-5">
          {/* Finanz-Kennzahlen */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              icon={Receipt}
              label={`Umsatz ${now.getFullYear()} (gestellt)`}
              value={formatCurrency(finance.issuedGrossYear)}
              sub={`${finance.issuedCountYear} Rechnung${finance.issuedCountYear === 1 ? "" : "en"} · netto ${formatCurrency(finance.issuedNetYear)}`}
              tone="accent"
            />
            <KpiCard
              icon={Wallet}
              label={`Zahlungseingang ${now.getFullYear()}`}
              value={formatCurrency(finance.paidYear)}
              sub="nach Zahldatum"
              tone="green"
            />
            <KpiCard
              icon={Receipt}
              label="Aktuell offen"
              value={formatCurrency(finance.openTotal)}
              sub={`${finance.openCount} offene Rechnung${finance.openCount === 1 ? "" : "en"}`}
              tone="amber"
            />
            <KpiCard
              icon={AlertTriangle}
              label="Davon überfällig"
              value={formatCurrency(finance.overdueTotal)}
              sub={
                finance.overdueCount > 0
                  ? `${finance.overdueCount} Rechnung${finance.overdueCount === 1 ? "" : "en"} mahnen?`
                  : "nichts überfällig"
              }
              tone={finance.overdueCount > 0 ? "red" : "green"}
            />
          </div>

          {/* Umsatz je Monat */}
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Umsatz je Monat (letzte 12 Monate)</h2>
              <div className="flex items-center gap-3 text-xs text-ink-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-accent" /> gestellt
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-status-verfuegbar" /> eingegangen
                </span>
              </div>
            </div>
            <MonthBars
              buckets={buckets}
              series={[
                { values: revenueSeries, barClass: "bg-accent", name: "Gestellt" },
                { values: paymentSeries, barClass: "bg-status-verfuegbar", name: "Eingegangen" },
              ]}
              format={formatCurrency}
            />
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Jobs */}
            <Card className="p-4">
              <h2 className="text-sm font-semibold text-ink">
                Jobs je Monat
                <span className="ml-2 font-normal text-ink-faint">
                  {jobsThisYear} in {now.getFullYear()}
                </span>
              </h2>
              <div className="mt-3">
                <MonthBars
                  buckets={buckets}
                  series={[{ values: jobSeries, barClass: "bg-accent", name: "Jobs" }]}
                  format={(v) => `${v} Job${v === 1 ? "" : "s"}`}
                />
              </div>
              {jobStatusCounts.size > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
                  {JOB_STATUS_OPTIONS.filter((o) => (jobStatusCounts.get(o.value) ?? 0) > 0).map((o) => (
                    <span key={o.value} className="flex items-center gap-1.5 text-xs text-ink-muted">
                      <JobStatusBadge status={o.value} />
                      {jobStatusCounts.get(o.value)}
                    </span>
                  ))}
                </div>
              )}
            </Card>

            {/* Top-Kunden */}
            <Card className="p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Users size={15} className="text-ink-muted" />
                Top-Kunden (12 Monate, gestellter Umsatz)
              </h2>
              {bestCustomers.length === 0 ? (
                <p className="mt-3 text-sm text-ink-faint">Noch keine gestellten Rechnungen im Zeitraum.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {bestCustomers.map((c, i) => (
                    <div key={c.customerId} className="flex items-center gap-3 text-sm">
                      <span className="w-5 text-right font-mono text-xs text-ink-faint">{i + 1}.</span>
                      <span className="min-w-0 flex-1 truncate text-ink">{c.name}</span>
                      <span className="text-xs text-ink-faint">
                        {c.invoiceCount} Re.
                      </span>
                      <span className="font-mono text-ink">{formatCurrency(c.gross)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Top-Geräte */}
          <Card className="p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Package size={15} className="text-ink-muted" />
              Meistgebuchte Geräte (12 Monate, nach Gerätetagen)
            </h2>
            {bestDevices.length === 0 ? (
              <p className="mt-3 text-sm text-ink-faint">Noch keine Packlisten-Buchungen im Zeitraum.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {bestDevices.map((d) => {
                  const maxDays = bestDevices[0].deviceDays || 1;
                  return (
                    <div key={d.deviceId} className="flex items-center gap-3 text-sm">
                      <span className="min-w-0 w-48 truncate text-ink sm:w-64">
                        {deviceName.get(d.deviceId) ?? "Gerät (nicht mehr im Inventar)"}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-raised">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${Math.max(3, Math.round((d.deviceDays / maxDays) * 100))}%` }}
                        />
                      </div>
                      <span className="w-24 text-right font-mono text-xs text-ink-muted">
                        {d.deviceDays} Tag{d.deviceDays === 1 ? "" : "e"}
                      </span>
                      <span className="hidden w-20 text-right text-xs text-ink-faint sm:block">
                        {d.jobCount} Job{d.jobCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

const KPI_TONE = {
  accent: "bg-accent-soft text-accent",
  green: "bg-status-verfuegbar-bg text-status-verfuegbar",
  amber: "bg-status-wartung-bg text-status-wartung",
  red: "bg-status-defekt-bg text-status-defekt",
} as const;

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  tone: keyof typeof KPI_TONE;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-surface p-3.5">
      <div className="flex items-start justify-between">
        <span className="text-xs text-ink-muted">{label}</span>
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", KPI_TONE[tone])}>
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-2 truncate font-mono text-xl font-semibold text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-ink-faint">{sub}</p>
    </div>
  );
}

/** Einfaches Monats-Balkendiagramm (pure CSS, 1–2 Serien nebeneinander). */
function MonthBars({
  buckets,
  series,
  format,
}: {
  buckets: MonthBucket[];
  series: { values: number[]; barClass: string; name: string }[];
  format: (value: number) => string;
}) {
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  return (
    <div>
      <div className="flex h-36 items-end gap-1.5">
        {buckets.map((bucket, i) => (
          <div key={`${bucket.year}-${bucket.month}`} className="flex h-full flex-1 items-end justify-center gap-0.5">
            {series.map((s) => {
              const value = s.values[i] ?? 0;
              const pct = (value / max) * 100;
              return (
                <div
                  key={s.name}
                  title={`${bucket.label}: ${format(value)} (${s.name})`}
                  className={cn("w-full max-w-4 rounded-t-sm", value > 0 ? s.barClass : "bg-bg-raised")}
                  style={{ height: value > 0 ? `${Math.max(3, pct)}%` : "3px" }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {buckets.map((bucket) => (
          <span key={`${bucket.year}-${bucket.month}`} className="flex-1 text-center text-[10px] text-ink-faint">
            {bucket.label}
          </span>
        ))}
      </div>
    </div>
  );
}
