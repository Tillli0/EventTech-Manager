import { format, isToday } from "date-fns";
import { de } from "date-fns/locale";
import { AlertTriangle, MapPin, User, FileText, Clock } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CalendarEntry, JobMilestone } from "@/types/database";
import { formatTime } from "@/lib/format";
import { NowLine } from "./NowLine";
import { personalItemsForDay, type ResolvedPersonalBlock } from "@/lib/personalSchedule";

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
  function startOfDay(d: Date) { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; }
  function endOfDay(d: Date) { const c = new Date(d); c.setHours(23, 59, 59, 999); return c; }

  const relevant = entries.filter((e) => {
    if (e.all_day) return false;
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
    if (lane === -1) { lane = lanes.length; lanes.push({ endMin: item.endMin }); }
    else lanes[lane].endMin = item.endMin;
    const top = ((item.startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const height = ((item.endMin - item.startMin) / 60) * HOUR_HEIGHT;
    positioned.push({ entry: item.entry, top, height: Math.max(height, 28), lane, laneCount: 0 });
  }
  const laneCount = Math.max(1, lanes.length);
  return positioned.map((p) => ({ ...p, laneCount }));
}

export function DayView({
  currentDate, entries, milestones, collidingIds,
  personalVisible = [], personalBlockers = [],
  onEntryClick, onMilestoneClick, onSlotClick,
}: {
  currentDate: Date;
  entries: CalendarEntry[];
  milestones: MilestoneWithJob[];
  collidingIds: Set<string>;
  personalVisible?: ResolvedPersonalBlock[];
  personalBlockers?: ResolvedPersonalBlock[];
  onEntryClick: (entry: CalendarEntry) => void;
  onMilestoneClick?: (milestone: MilestoneWithJob) => void;
  onSlotClick: (date: Date) => void;
}) {
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const positioned = layoutDay(currentDate, entries);

  // Ganztägige Events für diesen Tag
  const allDayEntries = entries.filter((e) => {
    if (!e.all_day) return false;
    const start = new Date(e.start_at);
    const end = new Date(e.end_at);
    const dayStart = new Date(currentDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(currentDate); dayEnd.setHours(23, 59, 59, 999);
    return start <= dayEnd && end >= dayStart;
  });

  const dayMilestones = milestones
    .filter((m) => {
      const d = new Date(m.at);
      return d.toDateString() === currentDate.toDateString() && !!m.job;
    })
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {/* Kopfzeile */}
      <div className="flex items-center justify-between border-b border-border bg-bg-surface px-4 py-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex h-12 w-12 items-center justify-center rounded-full text-2xl",
              isToday(currentDate) ? "bg-accent font-medium text-accent-on" : "text-ink",
            )}
          >
            {format(currentDate, "d")}
          </span>
          <div>
            <p
              className={cn(
                "text-sm font-medium uppercase tracking-wide",
                isToday(currentDate) ? "text-accent" : "text-ink-muted",
              )}
            >
              {format(currentDate, "EEEE", { locale: de })}
            </p>
            <p className="text-sm text-ink-muted">{format(currentDate, "MMMM yyyy", { locale: de })}</p>
          </div>
        </div>
        <p className="text-xs text-ink-faint">
          {entries.length === 0 ? "Keine Termine" : `${positioned.length + allDayEntries.length} Termin(e)`}
        </p>
      </div>

      {/* Ganztägige Events */}
      {allDayEntries.length > 0 && (
        <div className="border-b border-border bg-bg-surface/60 px-4 py-2 space-y-1">
          <p className="text-xs font-medium text-ink-faint mb-1.5">Ganztägig</p>
          {allDayEntries.map((e) => {
            const color = e.job?.color ?? "#6366f1";
            return (
              <button
                key={e.id}
                onClick={() => onEntryClick(e)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm font-medium text-white transition-opacity hover:opacity-90",
                  collidingIds.has(e.id) && "ring-2 ring-status-defekt ring-inset",
                )}
                style={{ backgroundColor: color }}
              >
                <Clock size={13} className="shrink-0 opacity-80" />
                <span className="truncate">{e.title}</span>
                {e.job?.location && (
                  <span className="ml-auto shrink-0 flex items-center gap-1 text-xs opacity-80">
                    <MapPin size={11} />{e.job.location}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Milestones */}
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

      {/* Persönliche Ebene: Köln-Schicht als Chip, alles andere nur ein Punkt ohne
          Beschriftung (nie eine Karte — PLAN-UI-NEUSCHNITT.md U4). */}
      {(() => {
        const visible = personalItemsForDay(personalVisible, currentDate);
        const blockers = personalItemsForDay(personalBlockers, currentDate);
        if (visible.length === 0 && blockers.length === 0) return null;
        return (
          <div className="space-y-1.5 border-b border-border bg-bg-surface/50 px-4 py-3">
            <p className="text-xs font-medium text-ink-faint">Meine Zeiten</p>
            {visible.map((b) => (
              <div key={b.id} className="flex items-center gap-2 rounded-md bg-accent-soft px-2 py-1 text-sm text-accent">
                <span className="truncate font-medium">Köln-Schicht</span>
                <span className="font-mono text-xs opacity-80">
                  {formatTime(b.start.toISOString())}–{formatTime(b.end.toISOString())}
                </span>
              </div>
            ))}
            {blockers.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-ink-faint">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink-faint" />
                Blockiert
              </div>
            )}
          </div>
        );
      })()}

      {/* Stundenraster */}
      <div className="relative max-h-[75vh] overflow-y-auto scrollbar-thin">
        <div className="grid grid-cols-[64px_1fr]">
          <div>
            {hours.map((h) => (
              <div key={h} className="border-b border-border px-2 text-right text-xs text-ink-faint" style={{ height: HOUR_HEIGHT }}>
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

            {isToday(currentDate) && <NowLine startHour={START_HOUR} endHour={END_HOUR} hourHeight={HOUR_HEIGHT} />}

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
                  onClick={(e) => { e.stopPropagation(); onEntryClick(p.entry); }}
                  className={cn(
                    "absolute overflow-hidden rounded-md border-l-4 px-3 py-1.5 text-left text-white shadow-sm transition-opacity hover:opacity-90",
                    isColliding && "ring-2 ring-status-defekt ring-inset",
                  )}
                  style={{
                    top: p.top, height: p.height,
                    left: `${p.lane * widthPct}%`, width: `${widthPct}%`,
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
                      <User size={11} />{customerLabel}
                    </p>
                  )}
                  {p.height > 72 && p.entry.job?.location && (
                    <p className="flex items-center gap-1 truncate text-xs opacity-90">
                      <MapPin size={11} />{p.entry.job.location}
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
                      <AlertTriangle size={11} />Überlappung mit anderem Termin
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
