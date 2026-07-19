import { Link } from "react-router-dom";
import { MapPin, User, ArrowRight, ClipboardList, CalendarClock } from "lucide-react";
import { JobStatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/format";
import { jobTone } from "@/lib/statusTone";
import { cn } from "@/lib/cn";
import type { Job, JobMilestone } from "@/types/database";

/**
 * „Nächster Einsatz" — der Kopf der Startseite (PLAN-UI-NEUSCHNITT.md, Leitidee).
 *
 * Bewusst KEINE Tages-Metapher („Mein Tag"): Till plant Events, keine Tage. Oben
 * steht deshalb der eine Job, der als Nächstes zählt — mit seinem Zeitplan.
 *
 * Rollen-adaptiv über die Beschriftung: Wer den Job nur zugewiesen bekommt, liest
 * „Dein nächster Einsatz"; wer die Firma führt, liest „Nächster Einsatz".
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

/** „heute“ / „morgen“ / „in 3 Tagen“ — kürzer und konkreter als ein Datum. */
function naeheText(job: Job): string {
  const tage = tageBis(job.start_date);
  if (tage < 0) return "läuft";
  if (tage === 0) return "heute";
  if (tage === 1) return "morgen";
  return `in ${tage} Tagen`;
}

function Zeitplan({ milestones }: { milestones: JobMilestone[] }) {
  const jetzt = Date.now();
  const sortiert = [...milestones].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
  // Der nächste noch offene Punkt wird hervorgehoben — er ist das, was ansteht.
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
            <span className={cn("ml-auto shrink-0 text-xs", vorbei ? "text-ink-faint" : "text-ink-muted")}>
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
  /** Beschriftung für Zugewiesene („Dein nächster Einsatz"). */
  eigenerEinsatz?: boolean;
  zeigeDokumente?: boolean;
}) {
  const milestones = job.milestones ?? [];
  const tone = jobTone(job.status);
  const kunde = job.customer
    ? job.customer.company_name || [job.customer.first_name, job.customer.last_name].filter(Boolean).join(" ")
    : null;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg-surface">
      <div className="grid gap-0 lg:grid-cols-[1.55fr_1fr]">
        <div className="p-5">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            <span className={cn("h-1.5 w-1.5 rounded-full", tone.solid)} aria-hidden />
            {eigenerEinsatz ? "Dein nächster Einsatz" : "Nächster Einsatz"} — {naeheText(job)}
          </p>

          <h2 className="mt-2 text-xl font-semibold leading-snug text-ink">{job.title}</h2>

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
            <JobStatusBadge status={job.status} />
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

        {milestones.length > 0 && (
          <div className="border-t border-border-subtle bg-bg-raised p-5 lg:border-l lg:border-t-0">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-ink-muted">Zeitplan</p>
            <Zeitplan milestones={milestones} />
          </div>
        )}
      </div>
    </div>
  );
}
