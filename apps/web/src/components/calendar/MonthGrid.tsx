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
import { PERSONAL_BLOCK_CATEGORY_LABELS, type ResolvedPersonalBlock } from "@/lib/personalSchedule";

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/** Sa/So (getDay 6/0) — für dezente Wochenend-Schattierung. */
function isWeekend(d: Date): boolean {
  const wd = d.getDay();
  return wd === 0 || wd === 6;
}
const ROW_HEIGHT = 22;
const MAX_VISIBLE_LANES = 3;
const MAX_CHIPS_PER_DAY = 3;
const WEEK_MIN_HEIGHT = 116;

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
  personalVisible = [],
  personalBlockers = [],
  onDayClick,
  onEntryClick,
  onMilestoneClick,
}: {
  currentMonth: Date;
  entries: CalendarEntry[];
  milestones: MilestoneWithJob[];
  collidingIds: Set<string>;
  /** Köln-Schichten — sichtbarer Inhalt (PLAN-UI-NEUSCHNITT.md U4). */
  personalVisible?: ResolvedPersonalBlock[];
  /** Schule/Klausur/Ferien/Urlaub/Krank — nur ein gedämpfter Blocker, nie eine Karte. */
  personalBlockers?: ResolvedPersonalBlock[];
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

  // Nur die Zeitplan-Punkte (Milestones) erscheinen als Punkt-Chips; alle echten
  // Termine werden als durchgezogene Balken dargestellt.
  function milestonesForDay(d: Date): MilestoneWithJob[] {
    const key = stripTime(d).getTime();
    return milestones
      .filter((m) => !!m.job && stripTime(new Date(m.at)).getTime() === key)
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }

  function overlapsDay(item: ResolvedPersonalBlock, d: Date): boolean {
    const day = stripTime(d).getTime();
    return stripTime(item.start).getTime() <= day && stripTime(item.end).getTime() >= day;
  }
  function personalVisibleForDay(d: Date): ResolvedPersonalBlock[] {
    return personalVisible.filter((b) => overlapsDay(b, d));
  }
  function personalBlockersForDay(d: Date): ResolvedPersonalBlock[] {
    return personalBlockers.filter((b) => overlapsDay(b, d));
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg">
      <div className="grid grid-cols-7 border-b border-border bg-bg-surface">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={label}
            className={cn(
              "px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wide",
              i >= 5 ? "text-ink-faint" : "text-ink-muted",
            )}
          >
            {label}
          </div>
        ))}
      </div>

      {weeks.map((week) => {
        const weekStart = week[0];
        const weekEnd = week[6];
        const segments = layoutWeek(weekStart, weekEnd, entries);
        const visibleSegments = segments.filter((s) => s.lane < MAX_VISIBLE_LANES);
        const hiddenBarsPerDay = new Array(7).fill(0);
        for (const s of segments) {
          if (s.lane >= MAX_VISIBLE_LANES) {
            for (let c = s.startCol; c <= s.endCol; c++) hiddenBarsPerDay[c]++;
          }
        }
        const laneCount = Math.min(
          MAX_VISIBLE_LANES,
          segments.reduce((max, s) => Math.max(max, s.lane + 1), 0),
        );

        return (
          <div
            key={weekStart.toISOString()}
            className="relative border-b border-border last:border-b-0"
            style={{ minHeight: WEEK_MIN_HEIGHT }}
          >
            {/* Hintergrund-Zellen: liefern volle senkrechte Trennlinien + Wochenend-/Außer-Monat-Tönung */}
            <div className="absolute inset-0 grid grid-cols-7">
              {week.map((d) => {
                const inMonth = isSameMonth(d, currentMonth);
                return (
                  <div
                    key={d.toISOString()}
                    className={cn(
                      "border-r border-border last:border-r-0",
                      !inMonth && "bg-bg-surface/40",
                      inMonth && isWeekend(d) && "bg-bg-surface/30",
                    )}
                  />
                );
              })}
            </div>

            {/* Inhalt über dem Hintergrund */}
            <div className="relative">
              {/* Tageszahlen */}
              <div className="grid grid-cols-7">
                {week.map((d) => {
                  const inMonth = isSameMonth(d, currentMonth);
                  return (
                    <button
                      key={d.toISOString()}
                      onClick={() => onDayClick(d)}
                      className="flex justify-center pt-1 text-center transition-colors hover:bg-bg-raised/40"
                    >
                      <span
                        className={cn(
                          "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs",
                          isToday(d)
                            ? "bg-accent font-semibold text-accent-on"
                            : inMonth
                              ? "text-ink"
                              : "text-ink-faint",
                        )}
                      >
                        {format(d, "d")}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Persönliche Ebene: Köln-Schichten als schmale Chips, alles andere nur
                  als stiller Punkt (nie eine Karte — PLAN-UI-NEUSCHNITT.md U4). */}
              {(personalVisible.length > 0 || personalBlockers.length > 0) && (
                <div className="grid grid-cols-7 px-1">
                  {week.map((d) => {
                    const visible = personalVisibleForDay(d);
                    const blockers = personalBlockersForDay(d);
                    if (visible.length === 0 && blockers.length === 0) return <div key={d.toISOString()} />;
                    return (
                      <div key={d.toISOString()} className="flex flex-col gap-px pb-0.5">
                        {visible.map((b) => (
                          <span
                            key={b.id}
                            title={`Köln-Schicht ${formatTime(b.start.toISOString())}–${formatTime(b.end.toISOString())}`}
                            className="truncate rounded bg-accent-soft px-1 py-[1px] text-[10px] font-medium text-accent"
                          >
                            Köln {formatTime(b.start.toISOString())}
                          </span>
                        ))}
                        {blockers.length > 0 && (
                          <span
                            title={blockers.map((b) => PERSONAL_BLOCK_CATEGORY_LABELS[b.category]).join(", ")}
                            className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-ink-faint"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Durchgezogene Mehrtages-/Ganztags-Balken */}
              {laneCount > 0 && (
                <div className="relative grid grid-cols-7 px-1 pt-0.5" style={{ height: laneCount * ROW_HEIGHT }}>
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
                          seg.continuesFromPrev ? "rounded-l-none" : "ml-0.5 rounded-l-[4px]",
                          seg.continuesToNext ? "rounded-r-none" : "mr-0.5 rounded-r-[4px]",
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

              {/* Zeitplan-Punkte (Milestones) als kleine Punkt-Chips unter den Balken */}
              <div className="grid grid-cols-7">
                {week.map((d, col) => {
                  const dayMilestones = milestonesForDay(d);
                  const visible = dayMilestones.slice(0, MAX_CHIPS_PER_DAY);
                  const hidden = dayMilestones.length - visible.length + hiddenBarsPerDay[col];
                  return (
                    <div key={d.toISOString()} className="space-y-px px-1 pb-1 pt-0.5">
                      {visible.map((m) => (
                        <button
                          key={`m-${m.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onMilestoneClick?.(m);
                          }}
                          title={`${m.job.title} · ${m.title} (${formatTime(m.at)})`}
                          className="flex w-full items-center gap-1 truncate rounded px-1 py-[1px] text-left text-[11px] transition-colors hover:bg-bg-raised"
                        >
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: m.job.color || "#3B82F6" }}
                          />
                          <span className="shrink-0 tabular-nums text-ink-muted">{formatTime(m.at)}</span>
                          <span className="truncate text-ink-muted">{m.title}</span>
                        </button>
                      ))}
                      {hidden > 0 && (
                        <button
                          onClick={() => onDayClick(d)}
                          className="px-1 text-left text-[11px] font-medium text-ink-muted hover:text-ink"
                        >
                          +{hidden} weitere
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
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
