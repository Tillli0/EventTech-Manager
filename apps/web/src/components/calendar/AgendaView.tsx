import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, isToday, isTomorrow } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronRight, CalendarClock } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CalendarEntry, JobMilestone } from "@/types/database";
import { useJob } from "@/hooks/useJobs";
import { formatTime, formatDateTime } from "@/lib/format";

type MilestoneWithJob = JobMilestone & { job: { id: string; title: string; color: string } };

type AgendaItem =
  | { kind: "entry"; at: Date; entry: CalendarEntry }
  | { kind: "milestone"; at: Date; milestone: MilestoneWithJob };

/**
 * Kompakte Listenansicht der kommenden Termine + Job-Zeitplan-Punkte,
 * nach Tag gruppiert. Gut für Mobil und schnellen Überblick.
 */
export function AgendaView({
  fromDate,
  entries,
  milestones,
  onEntryClick,
  onMilestoneClick,
}: {
  fromDate: Date;
  entries: CalendarEntry[];
  milestones: MilestoneWithJob[];
  onEntryClick: (entry: CalendarEntry) => void;
  onMilestoneClick?: (milestone: MilestoneWithJob) => void;
}) {
  const groups = useMemo(() => {
    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);

    const items: AgendaItem[] = [
      ...entries.map((e) => ({ kind: "entry" as const, at: new Date(e.start_at), entry: e })),
      ...milestones
        .filter((m) => !!m.job)
        .map((m) => ({ kind: "milestone" as const, at: new Date(m.at), milestone: m })),
    ]
      .filter((i) => i.at.getTime() >= from.getTime() || i.kind === "entry")
      .sort((a, b) => a.at.getTime() - b.at.getTime());

    // Nach Tag gruppieren (Tagesschlüssel)
    const byDay = new Map<string, { day: Date; items: AgendaItem[] }>();
    for (const item of items) {
      const key = format(item.at, "yyyy-MM-dd");
      if (!byDay.has(key)) byDay.set(key, { day: item.at, items: [] });
      byDay.get(key)!.items.push(item);
    }
    return Array.from(byDay.values());
  }, [entries, milestones, fromDate]);

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-bg-raised p-8 text-center text-sm text-ink-muted">
        Keine Termine in diesem Zeitraum.
      </div>
    );
  }

  function dayLabel(day: Date): string {
    if (isToday(day)) return "Heute";
    if (isTomorrow(day)) return "Morgen";
    return format(day, "EEEE, d. MMMM", { locale: de });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {groups.map((group) => (
        <div key={group.day.toISOString()} className="border-b border-border last:border-b-0">
          <div
            className={cn(
              "flex items-baseline gap-2 bg-bg-surface px-4 py-2",
              isToday(group.day) && "bg-accent-soft",
            )}
          >
            <span className={cn("text-sm font-semibold capitalize", isToday(group.day) ? "text-accent" : "text-ink")}>
              {dayLabel(group.day)}
            </span>
            <span className="text-xs text-ink-faint">{format(group.day, "dd.MM.yyyy")}</span>
          </div>

          <div className="divide-y divide-border">
            {group.items.map((item) =>
              item.kind === "entry" ? (
                <AgendaEntryRow key={`e-${item.entry.id}`} entry={item.entry} onOpen={onEntryClick} />
              ) : (
                <button
                  key={`m-${item.milestone.id}`}
                  onClick={() => onMilestoneClick?.(item.milestone)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-bg-raised"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-inset ring-bg-surface"
                    style={{ backgroundColor: item.milestone.job.color }}
                  />
                  <span className="w-24 shrink-0 text-xs tabular-nums text-ink-muted">
                    {formatTime(item.milestone.at)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">
                    <span className="text-ink-muted">{item.milestone.job.title}:</span> {item.milestone.title}
                  </span>
                  <span className="hidden shrink-0 text-[11px] text-ink-faint sm:block">Zeitplan</span>
                </button>
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Agenda-Zeile für einen Termin. Hängt der Termin an einem Job, lässt sie sich
 * aufklappen und zeigt dessen Zeitplan (Datum · Uhrzeit · Bezeichnung) inline. */
function AgendaEntryRow({ entry, onOpen }: { entry: CalendarEntry; onOpen: (entry: CalendarEntry) => void }) {
  const [open, setOpen] = useState(false);
  const hasJob = !!entry.job_id;
  // Job-Zeitplan erst laden, wenn aufgeklappt.
  const { data: job } = useJob(open && entry.job_id ? entry.job_id : undefined);
  const milestones = job?.milestones ? [...job.milestones].sort((a, b) => a.at.localeCompare(b.at)) : [];

  return (
    <div>
      <div className="flex w-full items-center gap-3 px-4 py-2.5 transition-colors hover:bg-bg-raised">
        {hasJob ? (
          <button
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 text-ink-faint hover:text-ink"
            aria-label={open ? "Zeitplan einklappen" : "Zeitplan aufklappen"}
          >
            <ChevronRight size={15} className={cn("transition-transform", open && "rotate-90")} />
          </button>
        ) : (
          <span className="w-[15px] shrink-0" />
        )}
        <button onClick={() => onOpen(entry)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: entry.job?.color ?? "#6366f1" }}
          />
          <span className="w-24 shrink-0 text-xs tabular-nums text-ink-muted">
            {entry.all_day ? "Ganztägig" : `${formatTime(entry.start_at)} – ${formatTime(entry.end_at)}`}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{entry.title}</span>
          {entry.job?.location && (
            <span className="hidden shrink-0 truncate text-xs text-ink-faint sm:block sm:max-w-[180px]">
              {entry.job.location}
            </span>
          )}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-bg-surface/40 px-4 py-2.5 pl-12">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-muted">
            <CalendarClock size={13} />
            Zeitplan
          </p>
          {milestones.length === 0 ? (
            <p className="text-xs text-ink-faint">
              {job ? "Kein Zeitplan hinterlegt." : "Zeitplan wird geladen …"}
            </p>
          ) : (
            <ul className="space-y-1">
              {milestones.map((m) => (
                <li key={m.id} className="flex items-baseline gap-2 text-sm">
                  <span className="shrink-0 whitespace-nowrap tabular-nums text-ink-muted">{formatDateTime(m.at)}</span>
                  <span className="truncate text-ink">{m.title}</span>
                </li>
              ))}
            </ul>
          )}
          {entry.job_id && (
            <Link
              to={`/jobs/${entry.job_id}`}
              className="mt-2 inline-block text-xs font-medium text-accent hover:underline"
            >
              Zum Job →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
