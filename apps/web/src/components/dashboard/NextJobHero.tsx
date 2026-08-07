import { Link } from "react-router-dom";
import { MapPin, User, ArrowRight, ClipboardList, CalendarClock } from "lucide-react";
import { JobStatusBadge } from "@/components/ui/StatusBadge";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { formatDate } from "@/lib/format";
import { jobDateProgress } from "@/lib/jobProgress";
import { jobTone } from "@/lib/statusTone";
import { cn } from "@/lib/cn";
import type { Job, JobMilestone } from "@/types/database";

/**
 * "Nächster Einsatz" — das Hauptinstrument der Startseite. Der Ring zeigt den
 * echten Zeit-Fortschritt im Job-Zeitraum (`lib/jobProgress.ts`); sein
 * Mittelpunkt trägt die Nähe-Aussage ("heute", "in 3 Tagen" …), die früher als
 * eigene Kicker-Zeile über dem Titel stand — der Titel trägt jetzt sein
 * eigenes Gewicht.
 */

function tageBis(datum: string): number {
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const ziel = new Date(datum);
  ziel.setHours(0, 0, 0, 0);
  return Math.round((ziel.getTime() - heute.getTime()) / 86_400_000);
}

function zeitraumText(job: Job): string {
  const start = formatDate(job.start_date);
  const ende = formatDate(job.end_date);
  return start === ende ? start : `${start} – ${ende}`;
}

function RingLabel({ job }: { job: Job }) {
  const tage = tageBis(job.start_date);
  if (tage > 0) {
    return (
      <span className="leading-none">
        <span className="block font-mono text-2xl font-semibold tabular-nums text-ink">{tage}</span>
        <span className="block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
          {tage === 1 ? "Tag" : "Tage"}
        </span>
      </span>
    );
  }
  return (
    <span className="text-sm font-semibold text-ink">
      {tage === 0 ? "heute" : "läuft"}
    </span>
  );
}

function Zeitplan({ milestones }: { milestones: JobMilestone[] }) {
  const jetzt = Date.now();
  const sortiert = [...milestones].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
  const naechsterOffen = sortiert.find((m) => new Date(m.at).getTime() >= jetzt);

  return (
    <ul className="space-y-1.5">
      {sortiert.slice(0, 6).map((m) => {
        const zeit = new Date(m.at);
        const vorbei = zeit.getTime() < jetzt;
        const jetztDran = m.id === naechsterOffen?.id;
        return (
          <li key={m.id} className="flex items-center gap-2.5 text-sm">
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full border-2",
                vorbei
                  ? "border-status-verfuegbar bg-status-verfuegbar"
                  : jetztDran
                    ? "border-job-packen bg-job-packen ring-2 ring-job-packen/25"
                    : "border-ink-faint",
              )}
              aria-hidden
            />
            <span className={cn("truncate", vorbei && "text-ink-faint line-through", jetztDran && "font-semibold text-ink")}>
              {m.title}
            </span>
            <span className={cn("ml-auto shrink-0 font-mono text-xs tabular-nums", vorbei ? "text-ink-faint" : "text-ink-muted")}>
              {zeit.toLocaleString("de-DE", { weekday: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function NextJobHero({
  job,
  eigenerEinsatz = false,
  zeigeDokumente = false,
}: {
  job: Job;
  /** Zusatz-Chip für Zugewiesene ("Dein Einsatz") statt einer Kicker-Zeile. */
  eigenerEinsatz?: boolean;
  zeigeDokumente?: boolean;
}) {
  const milestones = job.milestones ?? [];
  const tone = jobTone(job.status);
  const progress = jobDateProgress(job.start_date, job.end_date);
  const kunde = job.customer
    ? job.customer.company_name || [job.customer.first_name, job.customer.last_name].filter(Boolean).join(" ")
    : null;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg-surface">
      <div className="grid gap-0 lg:grid-cols-[1.55fr_1fr]">
        <div className="flex items-start gap-4 p-5 sm:gap-5">
          <ProgressRing progress={progress}>
            <RingLabel job={job} />
          </ProgressRing>

          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold leading-snug text-ink">{job.title}</h2>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock size={14} aria-hidden />
                {zeitraumText(job)}
              </span>
              {kunde && (
                <span className="inline-flex items-center gap-1.5">
                  <User size={14} aria-hidden />
                  {kunde}
                </span>
              )}
              {job.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={14} aria-hidden />
                  {job.location}
                </span>
              )}
              <span className={cn("h-1.5 w-1.5 rounded-full", tone.solid)} aria-hidden />
              <JobStatusBadge status={job.status} />
              {eigenerEinsatz && (
                <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-ink-muted">
                  Dein Einsatz
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to={`/jobs/${job.id}`}
                className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-on transition-colors hover:bg-accent-hover"
              >
                Job öffnen
                <ArrowRight size={15} aria-hidden />
              </Link>
              <Link
                to={`/jobs/${job.id}/packliste`}
                className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-bg-raised"
              >
                <ClipboardList size={15} aria-hidden />
                Packliste
              </Link>
              {zeigeDokumente && (
                <Link
                  to="/dokumente"
                  className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-bg-raised"
                >
                  Dokumente
                </Link>
              )}
            </div>
          </div>
        </div>

        {milestones.length > 0 && (
          <div className="border-t border-border-subtle bg-bg-raised p-5 lg:border-l lg:border-t-0">
            <p className="mb-3 text-xs font-medium text-ink-muted">Zeitplan</p>
            <Zeitplan milestones={milestones} />
          </div>
        )}
      </div>
    </div>
  );
}
