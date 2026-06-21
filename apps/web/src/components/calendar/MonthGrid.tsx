import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isToday,
  format,
} from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/cn";
import type { CalendarEntry, JobMilestone } from "@/types/database";
import { formatTime } from "@/lib/format";

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const ROW_HEIGHT = 22;
const MAX_VISIBLE_LANES = 3;

type MilestoneWithJob = JobMilestone & { job: { id: string; title: string; color: string } };

interface BarSegment {
  entry: CalendarEntry;
  /** Spalte (0-6), in der das Segment in dieser Woche beginnt. */
  startCol: number;
  /** Spalte (0-6), in der das Segment in dieser Woche endet (inklusive). */
  endCol: number;
  /** true, wenn der Termin schon in einer vorherigen Woche begonnen hat. */
  continuesFromPrev: boolean;
  /** true, wenn der Termin in der nächsten Woche weitergeht. */
  continuesToNext: boolean;
  lane: number;
}

function stripTime(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function diffDays(a: Date, b: Date): number {
  return Math.round((stripTime(a).getTime() - stripTime(b).getTime()) / (1000 * 60 * 60 * 24));
}

/** Weist jedem Termin einer Woche eine "Lane" (Zeile) zu, ähnlich wie bei Google Calendar,
 * sodass sich überlappende Termine nicht visuell überdecken. */
function layoutWeek(weekStart: Date, weekEnd: Date, entries: CalendarEntry[]): BarSegment[] {
  const relevant = entries
    .filter((e) => {
      const start = stripTime(new Date(e.start_at));
      const end = stripTime(new Date(e.end_at));
      return start <= weekEnd && end >= weekStart;
    })
    .sort((a, b) => {
      const aStart = new Date(a.start_at).getTime();
      const bStart = new Date(b.start_at).getTime();
      if (aStart !== bStart) return aStart - bStart;
      // Längere Termine zuerst, damit sie eher eine niedrige Lane bekommen.
      return new Date(b.end_at).getTime() - new Date(a.end_at).getTime();
    });

  const segments: BarSegment[] = [];
  const laneEndCol: number[] = []; // letzte belegte Spalte pro Lane

  for (const entry of relevant) {
    const start = stripTime(new Date(entry.start_at));
    const end = stripTime(new Date(entry.end_at));

    const startCol = Math.max(0, diffDays(start, weekStart));
    const endCol = Math.min(6, diffDays(end, weekStart));
    const continuesFromPrev = start < weekStart;
    const continuesToNext = end > weekEnd;

    let lane = laneEndCol.findIndex((endC) => endC < startCol);
    if (lane === -1) {
      lane = laneEndCol.length;
      laneEndCol.push(endCol);
    } else {
      laneEndCol[lane] = endCol;
    }

    segments.push({ entry, startCol, endCol, continuesFromPrev, continuesToNext, lane });
  }

  return segments;
}

export function MonthGrid({
  currentMonth,
  entries,
  milestones,
  collidingIds,
  onDayClick,
  onEntryClick,
  onMilestoneClick,
}: {
  currentMonth: Date;
  entries: CalendarEntry[];
  milestones: MilestoneWithJob[];
  collidingIds: Set<string>;
  onDayClick: (day: Date) => void;
  onEntryClick: (entry: CalendarEntry) => void;
  onMilestoneClick?: (milestone: MilestoneWithJob) => void;
}) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const weeks: Date[][] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(addDays(cursor, i));
    }
    weeks.push(week);
    cursor = addDays(cursor, 7);
  }

  function milestonesForDay(d: Date) {
    return milestones.filter((m) => stripTime(new Date(m.at)).getTime() === stripTime(d).getTime());
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-bg-surface">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-2 py-2 text-center text-xs font-medium text-ink-muted">
            {label}
          </div>
        ))}
      </div>

      {weeks.map((week) => {
        const weekStart = week[0];
        const weekEnd = week[6];
        const segments = layoutWeek(weekStart, weekEnd, entries);
        const visibleSegments = segments.filter((s) => s.lane < MAX_VISIBLE_LANES);
        const hiddenCountPerDay = new Array(7).fill(0);
        for (const s of segments) {
          if (s.lane >= MAX_VISIBLE_LANES) {
            for (let c = s.startCol; c <= s.endCol; c++) hiddenCountPerDay[c]++;
          }
        }
        const laneCount = Math.min(
          MAX_VISIBLE_LANES,
          segments.reduce((max, s) => Math.max(max, s.lane + 1), 0),
        );
        const hasHidden = hiddenCountPerDay.some((n) => n > 0);

        return (
          <div key={weekStart.toISOString()} className="border-b border-border last:border-b-0">
            {/* Tageszahlen-Zeile */}
            <div className="grid grid-cols-7">
              {week.map((d) => {
                const inMonth = isSameMonth(d, currentMonth);
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => onDayClick(d)}
                    className={cn(
                      "flex items-start border-r border-border p-1.5 pb-0 text-left transition-colors last:border-r-0 hover:bg-bg-raised",
                      !inMonth && "bg-bg-surface/50",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
                        isToday(d) ? "bg-accent font-semibold text-white" : inMonth ? "text-ink" : "text-ink-faint",
                      )}
                    >
                      {format(d, "d")}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Durchgezogene Mehrtages-Balken */}
            {laneCount > 0 && (
              <div
                className="relative grid grid-cols-7 px-1.5"
                style={{ height: laneCount * ROW_HEIGHT }}
                onClick={() => onDayClick(weekStart)}
              >
                {visibleSegments.map((seg) => {
                  const color = seg.entry.job?.color || "#3B82F6";
                  const isColliding = collidingIds.has(seg.entry.id);
                  return (
                    <button
                      key={seg.entry.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEntryClick(seg.entry);
                      }}
                      title={`${seg.entry.title} (${formatTime(seg.entry.start_at)})`}
                      className={cn(
                        "flex h-[18px] items-center truncate px-1.5 text-[11px] font-medium text-white transition-opacity hover:opacity-90",
                        seg.continuesFromPrev ? "rounded-l-none" : "rounded-l-[4px] ml-0.5",
                        seg.continuesToNext ? "rounded-r-none" : "rounded-r-[4px] mr-0.5",
                        isColliding && "ring-2 ring-status-defekt ring-inset",
                      )}
                      style={{
                        gridColumn: `${seg.startCol + 1} / ${seg.endCol + 2}`,
                        gridRow: 1,
                        marginTop: seg.lane * ROW_HEIGHT,
                        backgroundColor: color,
                      }}
                    >
                      {seg.continuesFromPrev && "« "}
                      {seg.entry.title}
                      {seg.continuesToNext && " »"}
                    </button>
                  );
                })}
              </div>
            )}

            {hasHidden && (
              <div className="grid grid-cols-7 px-1.5">
                {hiddenCountPerDay.map((count, i) => (
                  <p key={i} className="text-[10px] text-ink-faint">
                    {count > 0 ? `+${count} weitere` : ""}
                  </p>
                ))}
              </div>
            )}

            {/* Milestones (Unterevents) — schlichter Punkt + Label, keine durchgezogene Farbe */}
            <div className="grid grid-cols-7">
              {week.map((d) => {
                const dayMilestones = milestonesForDay(d);
                if (dayMilestones.length === 0) return <div key={d.toISOString()} className="pb-1" />;
                return (
                  <div key={d.toISOString()} className="space-y-0.5 px-1.5 pb-1.5 pt-0.5">
                    {dayMilestones.map((m) => (
                      <button
                        key={m.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onMilestoneClick?.(m);
                        }}
                        title={`${m.job.title} · ${m.title} (${formatTime(m.at)})`}
                        className="flex w-full items-center gap-1 truncate text-left text-[10px] text-ink-muted hover:text-ink"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: m.job.color }} />
                        <span className="truncate">{m.title}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function formatMonthLabel(date: Date): string {
  return format(date, "MMMM yyyy", { locale: de });
}
