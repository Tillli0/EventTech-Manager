import { startOfWeek, addDays, isToday, format, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CalendarEntry, JobMilestone } from "@/types/database";
import { formatTime } from "@/lib/format";

const HOUR_HEIGHT = 64;
const START_HOUR = 6;
const END_HOUR = 23;

type MilestoneWithJob = JobMilestone & { job: { id: string; title: string; color: string } };

interface PositionedEntry {
  entry: CalendarEntry;
  /** Tagesspalte (0-6). */
  col: number;
  top: number;
  height: number;
  lane: number;
  laneCount: number;
  /** true, wenn der Termin schon vor diesem Tag begonnen hat bzw. danach weitergeht. */
  continuesFromPrev: boolean;
  continuesToNext: boolean;
}

function minutesSinceStartOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function clampToDay(date: Date, day: Date, edge: "start" | "end"): Date {
  if (isSameDay(date, day)) return date;
  const clamped = new Date(day);
  if (edge === "start") clamped.setHours(0, 0, 0, 0);
  else clamped.setHours(23, 59, 59, 999);
  return clamped;
}

function startOfDayBound(day: Date): Date {
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDayBound(day: Date): Date {
  const d = new Date(day);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Positioniert alle Termine, die an diesem Tag sichtbar sind, inkl. Lane-Zuweisung bei Überlappung. */
function layoutDay(day: Date, entries: CalendarEntry[]): PositionedEntry[] {
  const dayStartBound = startOfDayBound(day);
  const dayEndBound = endOfDayBound(day);

  const relevant = entries.filter((e) => {
    const start = new Date(e.start_at);
    const end = new Date(e.end_at);
    return start <= dayEndBound && end >= dayStartBound;
  });

  const withRange = relevant.map((entry) => {
    const rawStart = new Date(entry.start_at);
    const rawEnd = new Date(entry.end_at);
    const dayStart = clampToDay(rawStart, day, "start");
    const dayEnd = clampToDay(rawEnd, day, "end");
    return {
      entry,
      startMin: minutesSinceStartOfDay(dayStart),
      endMin: Math.max(minutesSinceStartOfDay(dayEnd), minutesSinceStartOfDay(dayStart) + 30),
      continuesFromPrev: !isSameDay(rawStart, day),
      continuesToNext: !isSameDay(rawEnd, day),
    };
  });

  withRange.sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  // Einfache Lane-Zuweisung für überlappende Termine am selben Tag.
  const lanes: { endMin: number }[] = [];
  const positioned: (PositionedEntry & { startMin: number; endMin: number })[] = [];

  for (const item of withRange) {
    let lane = lanes.findIndex((l) => l.endMin <= item.startMin);
    if (lane === -1) {
      lane = lanes.length;
      lanes.push({ endMin: item.endMin });
    } else {
      lanes[lane].endMin = item.endMin;
    }

    const top = ((item.startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const height = ((item.endMin - item.startMin) / 60) * HOUR_HEIGHT;

    positioned.push({
      entry: item.entry,
      col: 0,
      top,
      height: Math.max(height, 20),
      lane,
      laneCount: 0,
      continuesFromPrev: item.continuesFromPrev,
      continuesToNext: item.continuesToNext,
      startMin: item.startMin,
      endMin: item.endMin,
    });
  }

  const laneCount = Math.max(1, lanes.length);
  return positioned.map((p) => ({ ...p, laneCount }));
}

export function WeekView({
  currentDate,
  entries,
  milestones,
  collidingIds,
  onEntryClick,
  onMilestoneClick,
  onSlotClick,
}: {
  currentDate: Date;
  entries: CalendarEntry[];
  milestones: MilestoneWithJob[];
  collidingIds: Set<string>;
  onEntryClick: (entry: CalendarEntry) => void;
  onMilestoneClick?: (milestone: MilestoneWithJob) => void;
  onSlotClick: (date: Date) => void;
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  function milestonesForDay(d: Date) {
    return milestones.filter((m) => isSameDay(new Date(m.at), d) && !!m.job);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {/* Tagesköpfe */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border bg-bg-surface">
        <div />
        {days.map((d) => (
          <div key={d.toISOString()} className="border-l border-border px-2 py-2.5 text-center">
            <p className="text-xs font-medium text-ink-muted">{format(d, "EEE", { locale: de })}</p>
            <span
              className={cn(
                "mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                isToday(d) ? "bg-accent text-white" : "text-ink",
              )}
            >
              {format(d, "d")}
            </span>
          </div>
        ))}
      </div>

      {/* Milestone-Zeile unter den Tagesköpfen */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border bg-bg-surface/50">
        <div />
        {days.map((d) => {
          const dayMilestones = milestonesForDay(d);
          return (
            <div key={d.toISOString()} className="space-y-1 border-l border-border px-2 py-1.5">
              {dayMilestones.length === 0 ? (
                <div className="h-0" />
              ) : (
                dayMilestones.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onMilestoneClick?.(m)}
                    title={`${m.job.title} · ${m.title} (${formatTime(m.at)})`}
                    className="flex w-full items-center gap-1.5 truncate text-left text-xs text-ink-muted hover:text-ink"
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: m.job.color }} />
                    <span className="truncate">
                      {formatTime(m.at)} {m.title}
                    </span>
                  </button>
                ))
              )}
            </div>
          );
        })}
      </div>

      {/* Stundenraster */}
      <div className="relative max-h-[70vh] overflow-y-auto scrollbar-thin">
        <div className="grid grid-cols-[56px_repeat(7,1fr)]">
          {/* Stundenlabels */}
          <div className="relative">
            {hours.map((h) => (
              <div
                key={h}
                className="border-b border-border px-2 text-right text-xs text-ink-faint"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="relative -top-2">{String(h).padStart(2, "0")}:00</span>
              </div>
            ))}
          </div>

          {/* Tagesspalten */}
          {days.map((d) => {
            const positioned = layoutDay(d, entries);
            return (
              <div key={d.toISOString()} className="relative border-l border-border">
                {hours.map((h) => (
                  <button
                    key={h}
                    onClick={() => {
                      const slot = new Date(d);
                      slot.setHours(h, 0, 0, 0);
                      onSlotClick(slot);
                    }}
                    className="block w-full border-b border-border transition-colors hover:bg-bg-raised"
                    style={{ height: HOUR_HEIGHT }}
                  />
                ))}

                {positioned.map((p) => {
                  const color = p.entry.job?.color || "#3B82F6";
                  const isColliding = collidingIds.has(p.entry.id);
                  const widthPct = 100 / p.laneCount;
                  return (
                    <button
                      key={p.entry.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEntryClick(p.entry);
                      }}
                      className={cn(
                        "absolute overflow-hidden rounded-md px-2 py-1 text-left text-xs text-white shadow-sm transition-opacity hover:opacity-90",
                        isColliding && "ring-2 ring-status-defekt ring-inset",
                      )}
                      style={{
                        top: p.top,
                        height: p.height,
                        left: `${p.lane * widthPct}%`,
                        width: `${widthPct}%`,
                        backgroundColor: color,
                      }}
                      title={p.entry.title}
                    >
                      <p className="truncate font-medium">
                        {p.continuesFromPrev && "« "}
                        {p.entry.title}
                        {p.continuesToNext && " »"}
                      </p>
                      {p.height > 36 && (
                        <p className="truncate opacity-90">
                          {formatTime(p.entry.start_at)} – {formatTime(p.entry.end_at)}
                        </p>
                      )}
                      {p.height > 52 && p.entry.job?.location && (
                        <p className="truncate opacity-80">{p.entry.job.location}</p>
                      )}
                      {p.height > 68 && isColliding && (
                        <p className="flex items-center gap-1 truncate opacity-90">
                          <AlertTriangle size={11} />
                          Überlappung
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function formatWeekLabel(date: Date): string {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  if (sameMonth) {
    return `${format(weekStart, "d.")} – ${format(weekEnd, "d. MMMM yyyy", { locale: de })}`;
  }
  return `${format(weekStart, "d. MMM", { locale: de })} – ${format(weekEnd, "d. MMM yyyy", { locale: de })}`;
}
