import { format, isToday } from "date-fns";
import { de } from "date-fns/locale";
import { AlertTriangle, MapPin, User, FileText } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CalendarEntry, JobMilestone } from "@/types/database";
import { formatTime } from "@/lib/format";

const HOUR_HEIGHT = 80;
const START_HOUR = 6;
const END_HOUR = 23;

type MilestoneWithJob = JobMilestone & { job: { id: string; title: string; color: string } };

interface PositionedEntry {
  entry: CalendarEntry;
  top: number;
  height: number;
  lane: number;
  laneCount: number;
}

function minutesSinceStartOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function layoutDay(day: Date, entries: CalendarEntry[]) {
  function startOfDay(d: Date) {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
  }
  function endOfDay(d: Date) {
    const c = new Date(d);
    c.setHours(23, 59, 59, 999);
    return c;
  }

  const relevant = entries.filter((e) => {
    const start = new Date(e.start_at);
    const end = new Date(e.end_at);
    return start <= endOfDay(day) && end >= startOfDay(day);
  });

  const withRange = relevant.map((entry) => {
    const rawStart = new Date(entry.start_at);
    const rawEnd = new Date(entry.end_at);
    const clampedStart = rawStart < startOfDay(day) ? startOfDay(day) : rawStart;
    const clampedEnd = rawEnd > endOfDay(day) ? endOfDay(day) : rawEnd;
    const startMin = minutesSinceStartOfDay(clampedStart);
    const endMin = Math.max(minutesSinceStartOfDay(clampedEnd), startMin + 30);
    return { entry, startMin, endMin };
  });

  withRange.sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  const lanes: { endMin: number }[] = [];
  const positioned: PositionedEntry[] = [];
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
    positioned.push({ entry: item.entry, top, height: Math.max(height, 28), lane, laneCount: 0 });
  }
  const laneCount = Math.max(1, lanes.length);
  return positioned.map((p) => ({ ...p, laneCount }));
}

export function DayView({
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
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const positioned = layoutDay(currentDate, entries);
  const dayMilestones = milestones
    .filter((m) => {
      const d = new Date(m.at);
      return d.toDateString() === currentDate.toDateString() && !!m.job;
    })
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between border-b border-border bg-bg-surface px-4 py-3">
        <div>
          <p className="text-sm font-medium text-ink-muted">{format(currentDate, "EEEE", { locale: de })}</p>
          <p className={cn("text-lg font-semibold", isToday(currentDate) ? "text-accent" : "text-ink")}>
            {format(currentDate, "d. MMMM yyyy", { locale: de })}
          </p>
        </div>
        <p className="text-xs text-ink-faint">
          {entries.length === 0 ? "Keine Termine" : `${positioned.length} Termin(e)`}
        </p>
      </div>

      {dayMilestones.length > 0 && (
        <div className="space-y-1.5 border-b border-border bg-bg-surface/50 px-4 py-3">
          <p className="text-xs font-medium text-ink-faint">Unterevents</p>
          {dayMilestones.map((m) => (
            <button
              key={m.id}
              onClick={() => onMilestoneClick?.(m)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm text-ink-muted transition-colors hover:bg-bg-raised hover:text-ink"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: m.job.color }} />
              <span className="font-mono text-xs text-ink-faint">{formatTime(m.at)}</span>
              <span className="truncate">{m.title}</span>
              <span className="truncate text-xs text-ink-faint">· {m.job.title}</span>
            </button>
          ))}
        </div>
      )}

      <div className="relative max-h-[75vh] overflow-y-auto scrollbar-thin">
        <div className="grid grid-cols-[64px_1fr]">
          <div>
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

          <div className="relative border-l border-border">
            {hours.map((h) => (
              <button
                key={h}
                onClick={() => {
                  const slot = new Date(currentDate);
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
              const customer = p.entry.job?.customer;
              const customerLabel = customer
                ? customer.company_name || [customer.first_name, customer.last_name].filter(Boolean).join(" ")
                : null;

              return (
                <button
                  key={p.entry.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEntryClick(p.entry);
                  }}
                  className={cn(
                    "absolute overflow-hidden rounded-md border-l-4 px-3 py-1.5 text-left text-white shadow-sm transition-opacity hover:opacity-90",
                    isColliding && "ring-2 ring-status-defekt ring-inset",
                  )}
                  style={{
                    top: p.top,
                    height: p.height,
                    left: `${p.lane * widthPct}%`,
                    width: `${widthPct}%`,
                    backgroundColor: color,
                    borderLeftColor: "rgba(255,255,255,0.4)",
                  }}
                  title={p.entry.title}
                >
                  <p className="truncate text-sm font-semibold">{p.entry.title}</p>
                  <p className="truncate text-xs opacity-90">
                    {formatTime(p.entry.start_at)} – {formatTime(p.entry.end_at)}
                  </p>
                  {p.height > 56 && customerLabel && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs opacity-90">
                      <User size={11} />
                      {customerLabel}
                    </p>
                  )}
                  {p.height > 72 && p.entry.job?.location && (
                    <p className="flex items-center gap-1 truncate text-xs opacity-90">
                      <MapPin size={11} />
                      {p.entry.job.location}
                    </p>
                  )}
                  {p.height > 88 && p.entry.notes && (
                    <p className="mt-0.5 flex items-start gap-1 truncate text-xs opacity-80">
                      <FileText size={11} className="mt-0.5 shrink-0" />
                      <span className="truncate">{p.entry.notes}</span>
                    </p>
                  )}
                  {isColliding && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs opacity-90">
                      <AlertTriangle size={11} />
                      Überlappung mit anderem Termin
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
